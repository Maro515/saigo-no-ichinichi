'use strict';
/* 最期の一日 — 場所（店）: 店の種類ごとに作り分ける。
   v（例 eat.soba、front.sakana!）で系統と種類を決め、話ごとの言葉から看板・品書き・小物を足す。
   座標は、表（通り）が +Z。zS は表の壁の位置 */
(function (SI) {
  const T = window.THREE, U = SI.U, K = SI.Kit, P = K.P, S = SI.stages, H = SI.Shop;
  const PI = Math.PI;

  /* ================= 共通 ================= */
  function ctxOf(c) {
    const pv = H.parseV(c.v), text = c.text || H.textsFor(c.cause, c.v) || '';
    const rng = U.rng(((c.seed || 1) * 7919 + U.hash(c.v || 'shop')) >>> 0);
    return { c, pv, fam: pv.fam, sub: pv.sub, staff: pv.staff, text, rng, g: new T.Group(), lamps: [], out: [], fills: [], people: [], folk: [], ticks: [], spots: [], names: [], scene: [], customers: [] };
  }
  function spot(x, name, p) { x.spots.push(p); x.names.push(name); }
  function person(x, role, o, px, pz, ry, py) {
    const f = K.figure(Object.assign({ pose: 'stand', top: '#8c7a6a', bottom: '#3d4352', hair: U.pick(x.rng, [P.hair, P.hair, P.hairGray]), h: 1.56 + x.rng() * 0.14 }, o));
    K.at(f, px, py || 0, pz, ry); x.g.add(f); x.people.push(f); if (role) x.folk.push({ f, role }); if (role === 'customer' || (!role && o && /sit|seiza/.test(o.pose || ''))) x.customers.push(f); return f;
  }
  function customerLook(x) { return { top: U.pick(x.rng, ['#8c6f5e', '#6f7f8c', '#9a8f7a', '#5a6a7a', '#a87a6a', '#6a7a5a']), bottom: U.pick(x.rng, ['#4a4640', '#3d4352', '#5a5248']), long: x.rng() < 0.45 }; }
  /* 部屋の箱。前（表）の開口は front で決める */
  function shell(x, o) {
    const W = o.w, D = o.d, Hh = o.h || 2.5, zS = D / 2;
    const wall = o.wallTex ? K.mTex(o.wallTex) : K.m(o.wall || P.wallWarm);
    const floor = o.floorTex ? K.mTex(o.floorTex, { rough: o.floorRough || 0.8 }) : K.m(o.floor || '#8f867a', { rough: o.floorRough || 0.8 });
    x.g.add(K.room({ w: W, d: D, h: Hh, wall, floor, ceil: K.m(o.ceil || '#e6dfd0'), frame: K.m(o.frame || P.woodDark), base: o.base === false ? false : K.m(o.base || P.woodDark), openings: o.openings || [], skip: o.skip }));
    x.W = W; x.D = D; x.H = Hh; x.zS = zS;
    return { W, D, Hh, zS };
  }
  function tile(c, n, rx, ry) { return K.tex.rep(K.tex.tile(c, n || 4), rx || 3, ry || 4); }
  function wood(c, rx, ry) { return K.tex.rep(K.tex.wood(c, 4), rx || 2, ry || 1); }
  function noise(c, rx, ry) { return K.tex.rep(K.tex.noise(c, 0.06), rx || 3, ry || 2); }
  function lamp(x, obj, px, py, pz) { K.at(obj, px, py, pz); x.g.add(obj); x.lamps.push(obj); return obj; }
  function steamAt(x, px, py, pz, o) { const s = H.steam(o); K.at(s, px, py, pz); x.g.add(s); x.ticks.push(t => s.userData.tick(t)); return s; }
  function tvAt(x, px, py, pz, ry, w) {
    const tv = K.tv(w || 0.6); K.at(tv, px, py, pz, ry); x.g.add(tv);
    const m = tv.userData.screen.material, sport = /野球|競馬|中継/.test(x.text);
    m.emissive = new T.Color(sport ? '#5f9a5a' : '#7f9ab0');
    x.ticks.push(t => { m.emissiveIntensity = 0.32 + Math.sin(t * 2.9) * 0.07 + Math.sin(t * 7.3) * 0.03; });
    return tv;
  }
  function clockAt(x, px, py, pz, ry) { const ck = K.wallClock(x.c.hour); K.at(ck, px, py, pz, ry); x.g.add(ck); x.clock = ck; return ck; }
  /* 表の看板（外の壁）と、のれん */
  function frontSign(x, name, o) {
    o = o || {};
    const s = H.sign(name, o.w || Math.min(2.6, 0.32 * name.length + 0.5), o.h || 0.42, { bg: o.bg || '#f4f0e6', fg: o.fg || '#2a2622', font: o.font || 'mincho', frame: o.frame, lit: o.lit });
    K.at(s, o.x || 0, o.y || x.H - 0.5, x.zS + 0.16); x.g.add(s); if (o.lit) x.out.push(s); return s;
  }
  function norenAt(x, chars, color, px, w) { const n = H.noren(chars, color, w || 1.1, 0.5); K.at(n, px, 2.02, x.zS + 0.2); x.g.add(n); x.ticks.push(t => n.userData.sway(t)); x.noren = n; return n; }
  /* 話ごとの小物。語りの言葉に出てくる物を、その店のあいた場所に置く */
  function details(x, slot) {
    const t = x.text, g = x.g, r = x.rng, c = x.c, winter = c.season === 'winter';
    const put = (obj, p, ry) => { if (!p) return null; K.at(obj, p[0], p[1], p[2], ry != null ? ry : (p[3] || 0)); g.add(obj); return obj; };
    const special = H.special(t), dishes = H.dishes(t);
    if (slot.board && (/黒板/.test(t) || special)) { put(H.chalkboard(special ? ['本日の日替わり', special] : ['本日のおすすめ', dishes[0] || '焼き魚定食']), slot.board); spot(x, '黒板', [slot.board[0], 0.7, slot.board[2]]); }
    if (slot.floor && (/ストーブ/.test(t) || (winter && x.stoveOK))) { put(H.stove(), slot.floor); spot(x, 'ストーブ', [slot.floor[0], 0.5, slot.floor[2]]); }
    if (slot.door && (/傘立て|傘の先|傘を/.test(t) || c.weather === 'rain' || c.weather === 'storm')) { const m = /傘が([一二三四五])本/.exec(t); put(H.umbrellaStand(m ? '一二三四五'.indexOf(m[1]) + 1 : (c.weather === 'rain' ? 3 : 1)), slot.door); spot(x, '傘立て', [slot.door[0], 0.6, slot.door[2]]); }
    if (slot.out && /鉢植え|すずらん/.test(t)) { for (let i = 0; i < 3; i++) put(H.plant(0.7 + r() * 0.3, U.pick(r, ['#8f6a4f', '#5a6a7a', '#a8453a']), /すずらん/.test(t) ? '#5f8a4a' : P.leaf), [slot.out[0] + i * 0.4, 0, slot.out[2]]); if (/すずらん/.test(t)) for (let i = 0; i < 6; i++) g.add(K.sph(0.018, K.m('#f6f6f0'), slot.out[0] + r() * 0.8, 0.4 + r() * 0.1, slot.out[2] + (r() - 0.5) * 0.2, { ws: 6, hs: 5 })); spot(x, '鉢植え', [slot.out[0] + 0.4, 0.4, slot.out[2]]); }
    if (slot.counter && /募金箱/.test(t)) { put(H.donationBox(), slot.counter); spot(x, '募金箱', [slot.counter[0], slot.counter[1] + 0.06, slot.counter[2]]); }
    if (slot.shelf && /ラジオ/.test(t)) { put(H.radio(), slot.shelf); spot(x, 'ラジオ', [slot.shelf[0], slot.shelf[1] + 0.08, slot.shelf[2]]); }
    if (slot.wall && /テレビ|中継|ニュース/.test(t) && !x.tv) { x.tv = tvAt(x, slot.wall[0], slot.wall[1], slot.wall[2], slot.wall[3] || 0); spot(x, 'テレビ', [slot.wall[0], slot.wall[1] + 0.2, slot.wall[2]]); }
    if (slot.counter2 && /鍵の木札/.test(t)) put(H.keyTag(), slot.counter2);
    if (slot.counter && /コイントレー/.test(t)) put(H.coinTray(), slot.counter);
    if (slot.counter && /菓子缶/.test(t)) { put(K.cyl(0.11, 0.1, K.m('#b9483a', { metal: 0.4, rough: 0.4 }), 0, 0, 0, { seg: 18 }), slot.counter); spot(x, '菓子缶', [slot.counter[0], slot.counter[1] + 0.05, slot.counter[2]]); }
    if (slot.table && /すし桶/.test(t)) { const o = new T.Group(); o.add(K.cyl(0.24, 0.07, K.m('#7a2a1e', { rough: 0.4 }), 0, 0, 0, { seg: 24 })); o.add(K.plane(0.4, 0.4, H.texMat(H.goodsTex('neta', 3)), 0, 0.072, 0)); put(o, slot.table); spot(x, 'すし桶', [slot.table[0], slot.table[1] + 0.1, slot.table[2]]); }
    if (slot.table && /ケーキの皿|皿とフォーク/.test(t)) { const o = new T.Group(); o.add(K.plate(P.white, 0.08)); o.add(K.box(0.004, 0.004, 0.14, K.m(P.steel, { metal: 0.7 }), 0.05, 0.014, 0)); put(o, slot.table2 || slot.table); spot(x, 'ケーキの皿', [(slot.table2 || slot.table)[0], (slot.table2 || slot.table)[1] + 0.05, (slot.table2 || slot.table)[2]]); }
    if (slot.table && /図録|文庫本|本を開/.test(t)) put(K.book(U.pick(r, [P.navy, P.red, '#c9b48f'])), slot.table);
    if (slot.out2 && /のぼり/.test(t)) { const n = H.nobori(U.pick(r, ['焼きたて', 'パン', '営業中']), U.pick(r, ['#c8392b', '#2f6db5', '#d9a23c'])); put(n, slot.out2); x.ticks.push(tt => { n.userData.flag.rotation.y = Math.sin(tt * 3.1) * 0.35; }); }
    if (slot.wall2 && /カレンダー|暦/.test(t)) put(K.calendar(), slot.wall2);
    if (slot.counter && x.maneki) put(H.maneki(), slot.counter2 || slot.counter);
    return { special, dishes };
  }
  /* 場面ごとの直し（スリッパの数、シャッター、灯り、のれん） */
  function onSceneFor(x) {
    const KAN = '一二三四五六七八';
    return (b) => {
      const s = (b && (b.text || (b.lines || []).join(''))) || '';
      if (x.slippers) { const m = /スリッパ[をがは、]*([一二三四五六])足/.exec(s); if (m) x.slippers.userData.setCount(KAN.indexOf(m[1]) + 1); }
      if (x.shutter) x.shutter.userData.setDown(/シャッターを半分/.test(s) ? 0.5 : (/シャッターを(下ろ|閉め)/.test(s) ? 1 : 0));
      if (x.noren) x.noren.visible = !/のれん(を|は)[^。]*(下ろ|しま|まだ奥)/.test(s);
      x.dim = /灯りが半分|明かりが半分|灯りを半分/.test(s) ? 0.45 : 1;
      /* 閉店のあと・開店の前・客の来ない時間は、ほかの客を出さない */
      const h = b && b.t ? U.timeToHour(b.t) : 12;
      const quiet = /閉店|最後の客|客の来ない|客が引|帰っていく|のれんを(しま|下ろ)|鍵をかけ|開店前|店を開ける前|開店まで|まだ客|仕込み|棚卸し|表の札/.test(s) || (x.staff && (h >= 22.5 || h < 7));
      for (const f of x.customers) f.visible = !quiet;
    };
  }
  function finish(x, o) {
    const c = x.c, lamps = x.lamps, out = x.out, people = x.people, ticks = x.ticks;
    x.dim = 1;
    const st = Object.assign({
      group: x.g, indoor: true, shadow: 11, center: [0, 0, 0],
      spots: x.spots, spotNames: x.names, folk: x.folk, fills: x.fills,
      weatherBox: [[-12, -0.1, x.zS + 0.4], [12, 9, x.zS + 13]], dustBox: [[-1.5, 0.4, -1], [1.5, 2.0, x.zS - 0.5]],
      amb: { crowd: 0.4, traffic: 0.3, tick: 0.3 },
      shopFam: x.fam, shopKind: x.sub, shopStaff: x.staff,
      onScene: onSceneFor(x),
      onLight(env) {
        const base = Math.max(0.62, env.lampOn) * x.dim;          // 店の中にいる場面は、明かりがついている
        for (const l of lamps) if (l.userData.setLamp) l.userData.setLamp(base, l.userData.power);
        for (const l of out) if (l.userData.setLamp) l.userData.setLamp(env.lampOn, l.userData.power);
        if (x.clock) x.clock.userData.setTime(env.hour);
      },
      update(dt, env) { for (const f of ticks) f(env.time, dt); for (const p of people) if (p.userData.tick) p.userData.tick(env.time); if (x.clock) x.clock.userData.setTime(env.hour); }
    }, o);
    return st;
  }
  const PAL = {
    wallWarm: ['#e6dccb', '#e2e2d6', '#efe4cf', '#dfe6dc', '#e8dcc4'],
    tableTop: ['#c8b490', '#9fb4a8', '#d9cdb6', '#b9a07a', '#c9c2b0'],
    noren: ['#2f3b55', '#7a2f2a', '#3f5a48', '#5c4531', '#2a3a4a']
  };

  /* ================= 食べる店 ================= */
  function eat(x) {
    const c = x.c, r = x.rng, sub = x.sub, t = x.text;
    const look = customerLook;
    let A = {}, comp = {}, label = '店の中', amb = { crowd: 0.45, traffic: 0.3, tick: 0.35 }, outKind = 'town', bodyC = { sit: { sleeve: '#7d8794', legs: '#4a4f5c' }, stand: { sleeve: '#7d8794' } };
    const slot = {};
    if (/港/.test(t)) outKind = 'harbor'; else if (/国道|峠|ふもと|ドライブイン/.test(t)) outKind = 'road';
    if (sub === 'shokudo' || sub === 'chuka' || sub === 'curry' || sub === 'burger') {
      /* ---- 町の食堂・中華・カレー・ハンバーガー ---- */
      const chuka = sub === 'chuka', curry = sub === 'curry', indian = curry && /ナン/.test(t), burger = sub === 'burger', counterOnly = curry && !indian;
      const W = counterOnly ? 3.8 : 5.6, D = counterOnly ? 5.8 : 6.6;
      const wallC = indian ? '#e2a560' : (burger ? '#f2efe8' : (chuka ? '#efe6d6' : U.pick(r, PAL.wallWarm)));
      const fl = chuka ? tile('#8a5a4a', 6, 4, 5) : (burger ? tile('#e8e4dc', 4, 4, 5) : tile(U.pick(r, ['#8f867a', '#7f8a86', '#9a8a76']), 4, 3, 4));
      const ops = [{ side: 'S', at: -W / 2 + 1.0, w: 1.2, y: 0, h: 2.0, kind: 'window' }, { side: 'S', at: W / 2 - 1.3, w: counterOnly ? 1.0 : 1.8, y: 0.85, h: 1.05, kind: 'window' }];
      shell(x, { w: W, d: D, h: 2.5, wallTex: noise(wallC), floorTex: fl, openings: ops, ceil: burger ? '#f6f4ee' : '#e6dfd0', frame: burger ? '#c8392b' : P.woodDark });
      const zS = x.zS, accent = chuka ? '#c8392b' : (indian ? '#8a3a2a' : (burger ? '#d9a23c' : U.pick(r, PAL.tableTop)));
      const name = H.name(chuka ? 'chuka' : (curry ? (indian ? 'curryN' : 'curry') : (burger ? 'burger' : (outKind === 'harbor' ? 'harbor' : (outKind === 'road' ? 'road' : 'shokudo')))), r);
      frontSign(x, name, { bg: chuka ? '#c8392b' : (burger ? '#d9a23c' : '#f4f0e6'), fg: chuka || burger ? '#ffffff' : '#2a2622', font: chuka || burger ? 'gothic' : 'mincho', lit: true });
      if (!burger) norenAt(x, chuka ? ['中', '華'] : (curry ? ['カ', 'レ', 'ー'] : ['め', 'し']), chuka ? '#c8392b' : U.pick(r, PAL.noren), -W / 2 + 1.0, 1.0);
      const cx = counterOnly ? -W / 2 + 1.1 : -W / 2 + 1.25;
      /* カウンターと厨房（西の壁ぎわ） */
      const ctop = K.m(chuka ? '#c8392b' : (burger ? '#d9dad6' : P.woodLight), { rough: 0.5 });
      x.g.add(K.box(0.5, 1.0, counterOnly ? 4.2 : 3.6, K.mTex(wood(chuka ? '#7a2a22' : P.wood)), cx, 0, -0.9)); x.g.add(K.box(0.62, 0.05, counterOnly ? 4.3 : 3.7, ctop, cx + 0.03, 1.0, -0.9));
      const nSt = counterOnly ? 6 : 4;
      for (let i = 0; i < nSt; i++) { const st = K.stool(K.m(chuka ? '#c8392b' : P.steelDark), 0.62); K.at(st, cx + 0.62, 0, -2.4 + i * (counterOnly ? 0.68 : 0.85)); x.g.add(st); }
      x.g.add(K.box(0.5, 0.86, 3.4, H.mat.steel(), -W / 2 + 0.3, 0, -0.9));
      const sh = K.shelf(3.0, 0.9, 0.24, K.m(P.woodDark), 2); K.at(sh, -W / 2 + 0.14, 1.35, -0.9, PI / 2); x.g.add(sh);
      const shelfTex = H.goodsTex(indian ? 'souvenir' : (chuka ? 'bottles' : 'packs'), 11), sp = H.vplane(2.9, 0.8, H.texMat(shelfTex), -W / 2 + 0.2, 1.8, -0.9, PI / 2); x.g.add(sp);
      const pot = H.pot(0.17, 0.26); K.at(pot, -W / 2 + 0.32, 0.86, -1.6); x.g.add(pot); steamAt(x, -W / 2 + 0.32, 1.14, -1.6);
      if (indian) { const tn = K.cyl(0.3, 0.8, K.m('#8a5a3a', { rough: 0.9 }), -W / 2 + 0.4, 0, 0.9, { rTop: 0.22 }); x.g.add(tn); x.g.add(K.cyl(0.2, 0.02, K.m('#ff6a2a', { emissive: '#ff5a1a', ei: 0.7 }), -W / 2 + 0.4, 0.8, 0.9)); }
      const cook = person(x, x.staff ? 'coworker' : 'cook', { top: burger ? '#c8392b' : '#eceae4', bottom: '#3d4352', hair: P.hairGray, h: 1.62 }, -W / 2 + 0.72, -0.5, 1.3);
      /* 卓 */
      const tables = counterOnly ? [] : (U.pick(r, [0, 1]) ? [[1.3, -1.8], [1.3, 0.2], [1.3, 2.0]] : [[1.0, -1.9], [1.9, -0.2], [1.0, 1.7]]);
      const tm = chuka ? K.m('#c8392b', { rough: 0.5 }) : K.m(accent, { rough: 0.5 });
      tables.forEach((tb, i) => {
        const tt = burger ? K.roundTable(0.42, 0.72, tm) : K.table(0.75, 0.75, 0.7, tm); K.at(tt, tb[0], 0, tb[1]); x.g.add(tt);
        for (const sz of [-1, 1]) { const ch = burger ? K.stool(K.m('#c8392b'), 0.45) : K.chair(K.m(chuka ? '#c8392b' : P.wood), K.m(chuka ? '#c8392b' : (indian ? '#8a3a2a' : '#7a5a3a'))); K.at(ch, tb[0], 0, tb[1] + sz * 0.62, sz > 0 ? PI : 0); x.g.add(ch); }
        x.g.add(K.box(0.1, 0.12, 0.06, K.m(P.woodDark), tb[0] + 0.25, 0.7, tb[1] - 0.25));
        if (i === 2) person(x, 'customer', Object.assign({ pose: 'sit', seat: 0.44 }, look(x)), tb[0], tb[1] + 0.6, PI);
      });
      /* 壁の品書き・テレビ・時計 */
      const menu = (H.dishes(t).map(d => d.replace(/の(塩焼き|味噌煮|みそ煮)$/, '$1')).concat(H.MENU[chuka ? 'chuka' : (curry ? 'curry' : (burger ? 'burger' : 'shokudo'))])).slice(0, 8);
      if (burger) { const mb = H.menuBoard('メニュー', menu, 2.2, 0.6, { lit: true, bg: '#2a2a26' }); K.at(mb, cx + 0.05, 1.75, -1.9, PI / 2); x.g.add(mb); }
      else { const mt = H.menuTags(menu, { bg: chuka ? '#f6e9a8' : (indian ? '#f4e2c0' : '#f4efe2'), fg: chuka ? '#c8291c' : '#2a2622' }); K.at(mt, W / 2 - 0.012, 1.55, -2.6, -PI / 2); x.g.add(mt); }
      if (!counterOnly) { x.tv = tvAt(x, W / 2 - 0.3, 1.75, -x.zS + 0.3, -0.7); spot(x, 'テレビ', [W / 2 - 0.3, 1.95, -x.zS + 0.4]); }
      clockAt(x, 0.6, 2.1, -x.zS + 0.04, 0); const cal = K.calendar(); K.at(cal, W / 2 - 0.02, 1.2, 1.3, -PI / 2); x.g.add(cal);
      if (indian) { const tp = H.vplane(1.6, 1.0, H.texMat(H.stripeTex('#c8392b', '#d9a23c', 14)), 0.4, 1.5, -x.zS + 0.02); x.g.add(tp); }
      if (chuka) { const mg = K.shelf(0.9, 1.2, 0.26, K.m(P.woodDark), 4); K.at(mg, W / 2 - 0.2, 0, 2.6, -PI / 2); x.g.add(mg); x.g.add(H.vplane(0.8, 1.1, H.texMat(H.goodsTex('books', 4)), W / 2 - 0.22, 0.6, 2.6, -PI / 2)); }
      for (const p of [[cx + 0.4, -1.8], [cx + 0.4, 0.1], ...tables.slice(0, 3)]) lamp(x, H.pendant({ kind: burger ? 'glass' : (chuka || indian ? 'cone' : 'cone'), power: 2.6, len: 0.35 }), p[0], 2.5, p[1]);
      S.fill(x.g, x.fills, -0.9, 2.2, x.zS - 0.9, 9, 8); S.fill(x.g, x.fills, 1.4, 2.2, x.zS - 0.9, 5, 6);
      x.stoveOK = !burger && !indian; x.maneki = !burger && r() < 0.6;
      Object.assign(slot, { board: [-W / 2 + 0.3, 0, x.zS + 0.7, PI], floor: [W / 2 - 0.5, 0, 0.9], door: [-W / 2 + 0.4, 0, x.zS - 0.4], counter: [cx + 0.1, 1.05, 0.6], counter2: [cx + 0.1, 1.05, 0.75], shelf: [-W / 2 + 0.2, 1.37, -0.2], wall: [W / 2 - 0.3, 1.75, -x.zS + 0.3, -0.7], wall2: [W / 2 - 0.02, 1.2, 1.3, -PI / 2], out2: [W / 2 - 0.6, 0, x.zS + 1.6], table: tables[1] ? [tables[1][0] - 0.1, 0.7, tables[1][1] + 0.05] : [cx + 0.12, 1.05, -0.6] });
      const myT = tables[0] || null;
      if (x.staff) {
        A = { stand: { p: [cx - 0.35, 1.52, -0.6], look: [1.5, 1.1, 1.5], lim: { yaw: 160, up: 55, down: 60 }, body: 'stand' }, sit: { p: myT ? [myT[0], 1.15, myT[1] - 0.62] : [cx + 0.62, 1.35, -0.7], look: [-0.6, 1.0, x.zS], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' } };
        cook.position.set(-W / 2 + 0.6, 0, -2.0);
      } else if (counterOnly || /カウンター/.test(t)) {
        A = { sit: { p: [cx + 0.62, 1.35, -0.7], look: [-W / 2, 1.2, -0.7], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' }, stand: { p: [0.2, 1.52, x.zS - 0.9], look: [-0.9, 1.1, -1.8], lim: { yaw: 160, up: 55, down: 55 }, body: 'stand' } };
        comp = { sit: { p: [cx + 0.62, 0, -0.7 + (counterOnly ? 0.68 : 0.85)], ry: -PI / 2, pose: 'sit', seat: 0.62 } };
      } else {
        A = { sit: { p: [myT[0], 1.15, myT[1] - 0.62 + 0.0], look: [-0.6, 1.0, x.zS], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' }, stand: { p: [0.2, 1.52, x.zS - 0.9], look: [-0.9, 1.1, -1.8], lim: { yaw: 160, up: 55, down: 55 }, body: 'stand' } };
        A.sit.p[2] = myT[1] - 0.62 + 0.0; A.sit.look = [myT[0] - 0.4, 1.0, x.zS];
        comp = { sit: { p: [myT[0], 0, myT[1] + 0.62], ry: PI, pose: 'sit', seat: 0.44 } };
      }
      comp.stand = { p: [-0.3, 0, 1.3], ry: 0.6, pose: 'stand' };
      spot(x, 'のれん', [-W / 2 + 1.0, 1.4, x.zS + 0.2]); spot(x, '窓の外の通り', [W / 2 - 1.3, 1.4, x.zS - 0.1]); spot(x, 'カウンター', [cx + 0.1, 1.2, -0.3]); spot(x, '棚に並んだ瓶', [-W / 2 + 0.2, 1.6, -1.2]);
      spot(x, '壁の品書き', [W / 2 - 0.1, 1.5, -2.0]); spot(x, '壁の時計', [0.6, 2.1, -x.zS + 0.1]); spot(x, '厨房の鍋', [-W / 2 + 0.32, 1.1, -1.6]);
      label = chuka ? '中華料理の店' : (curry ? 'カレーの店' : (burger ? 'ハンバーガーの店' : '食堂'));
    } else if (sub === 'soba' || sub === 'udon' || sub === 'ramen' || sub === 'tachigui') {
      /* ---- そば・うどん・ラーメン・立ち食い ---- */
      const ramen = sub === 'ramen', tachi = sub === 'tachigui', udon = sub === 'udon';
      const W = tachi ? 3.4 : 4.8, D = tachi ? 4.6 : 6.2;
      const wallC = ramen ? '#ece6da' : (tachi ? '#e8eae6' : '#e8dcc4');
      shell(x, { w: W, d: D, h: tachi ? 2.4 : 2.45, wallTex: noise(wallC), floorTex: tile(ramen ? '#3a3a3a' : (tachi ? '#9aa0a2' : '#6a6458'), 4, 3, 4), openings: [{ side: 'S', at: -W / 2 + 0.9, w: 1.1, y: 0, h: 2.0, kind: 'window' }, { side: 'S', at: W / 2 - 1.1, w: 1.4, y: 0.9, h: 0.95, kind: 'window' }], ceil: tachi ? '#f2f2ee' : '#d9cdb6' });
      if (!ramen && !tachi) x.g.add(K.box(W - 0.02, 0.9, 0.02, K.mTex(wood(P.woodLight, 3, 1)), 0, 0, -x.zS + 0.012));
      const zN = -x.zS, cz = zN + 1.05, ctr = K.m(ramen ? '#a8302a' : (tachi ? '#c6c8c9' : P.woodPale), { rough: 0.45 });
      const name = H.name(ramen ? 'ramen' : (tachi ? 'tachigui' : (udon ? 'udon' : 'soba')), r);
      frontSign(x, name, { x: 0.6, w: Math.min(2.4, 0.3 * name.length + 0.4), bg: ramen ? '#1e1e1e' : '#f4f0e6', fg: ramen ? '#f6d13c' : '#2a2622', font: ramen ? 'gothic' : 'mincho', lit: true });
      norenAt(x, ramen ? ['ら', 'ー', 'め', 'ん'] : (tachi ? ['立', 'ち', 'そ', 'ば'] : (udon ? ['う', 'ど', 'ん'] : ['そ', 'ば'])), ramen ? '#c8392b' : (tachi ? '#2f3b55' : U.pick(r, ['#2a3a5a', '#4a3a2a', '#3a4a3a'])), -W / 2 + 0.9, 1.0);
      /* 奥のカウンターと厨房 */
      const cw = W - 0.8;
      x.g.add(K.box(cw, tachi ? 1.0 : 0.95, 0.45, K.mTex(wood(ramen ? '#5a2a22' : P.wood)), 0.2, 0, cz)); x.g.add(K.box(cw + 0.06, 0.05, 0.6, ctr, 0.2, tachi ? 1.0 : 0.95, cz + 0.05));
      x.g.add(K.box(cw, 0.86, 0.55, H.mat.steel(), 0.2, 0, zN + 0.35));
      const kama = H.pot(0.24, 0.3); K.at(kama, -0.6, 0.86, zN + 0.35); x.g.add(kama); steamAt(x, -0.6, 1.16, zN + 0.35, { n: 16, spread: 0.08, h: 0.8, alpha: 0.12 });
      const pot2 = H.pot(0.16, 0.24); K.at(pot2, 0.4, 0.86, zN + 0.35); x.g.add(pot2); steamAt(x, 0.4, 1.1, zN + 0.35);
      const sh = K.shelf(cw, 0.5, 0.22, K.m(P.woodDark), 1); K.at(sh, 0.2, 1.25, zN + 0.12); x.g.add(sh);
      for (let i = 0; i < 10; i++) x.g.add(K.bowl(U.pick(r, ['#2a2a2a', '#7a2a22', '#e8e4da'])).translateX(-1.4 + i * 0.32).translateY(1.28).translateZ(zN + 0.14));
      if (!ramen) { const bt = H.menuTags(H.dishes(t).concat(H.MENU[tachi ? 'tachigui' : (udon ? 'udon' : 'soba')]).slice(0, 10), { bg: '#c9a46e', fg: '#2a1e14', w: 0.12, h: 0.36 }); K.at(bt, -1.6, 2.0, zN + 0.012); x.g.add(bt); spot(x, '奥の品書き', [-0.6, 2.0, zN + 0.1]); }
      person(x, 'cook', { top: ramen ? '#1e1e1e' : '#eceae4', bottom: '#3d4352', hair: P.hair, h: 1.64 }, 1.05, zN + 0.72, -0.35);
      const nSt = tachi ? 0 : 5;
      for (let i = 0; i < nSt; i++) { const st = K.stool(K.m(ramen ? '#c8392b' : P.woodDark), 0.62); K.at(st, -1.5 + i * 0.7, 0, cz + 0.62); x.g.add(st); }
      if (tachi) { x.g.add(K.box(0.4, 1.02, 2.6, ctr, -W / 2 + 0.2, 0, 0.4)); }
      else if (!ramen) {
        for (const tz of [0.6, 2.0]) { const tb = K.table(0.7, 0.7, 0.7, K.m(P.woodLight)); K.at(tb, W / 2 - 0.7, 0, tz); x.g.add(tb); for (const sz of [-1, 1]) { const ch = K.chair(K.m(P.wood)); K.at(ch, W / 2 - 0.7, 0, tz + sz * 0.6, sz > 0 ? PI : 0); x.g.add(ch); } }
        const bam = H.plant(1.1, '#5a4a3a', '#5f8a4a'); K.at(bam, -W / 2 + 0.35, 0, x.zS - 0.5); x.g.add(bam);
      } else { const tm = H.ticketMachine(); K.at(tm, -W / 2 + 0.4, 0, x.zS - 1.4, PI / 2); x.g.add(tm); spot(x, '券売機', [-W / 2 + 0.5, 1.2, x.zS - 1.4]); }
      if (tachi) { const tm = H.ticketMachine(); K.at(tm, W / 2 - 0.4, 0, x.zS - 0.6, -PI / 2); x.g.add(tm); spot(x, '券売機', [W / 2 - 0.5, 1.2, x.zS - 0.6]); }
      const menu = H.dishes(t).concat(H.MENU[ramen ? 'ramen' : (tachi ? 'tachigui' : (udon ? 'udon' : 'soba'))]).slice(0, 8);
      if (ramen) { const mb = H.menuBoard('品書き', menu, 2.4, 0.5, { lit: true, bg: '#1e1e1e', fg: '#f6d13c' }); K.at(mb, 0.2, 2.0, zN + 0.02); x.g.add(mb); }
      else { const mt = H.menuTags(menu, { bg: tachi ? '#f8f6f0' : '#d9c49a', fg: '#2a1e14' }); K.at(mt, -W / 2 + 0.012, 1.55, -0.6, PI / 2); x.g.add(mt); }
      clockAt(x, W / 2 - 0.04, 2.0, -0.4, -PI / 2);
      if (ramen) x.tv = tvAt(x, W / 2 - 0.3, 1.8, x.zS - 1.6, -PI / 2 - 0.3);
      for (let i = 0; i < 3; i++) lamp(x, tachi ? H.panel(1.0, 0.3) : H.pendant({ kind: ramen ? 'cone' : 'washi', power: i < 2 ? 2.4 : 0, len: 0.4 }), -1.0 + i * 1.1, tachi ? 2.4 : 2.45, cz + 0.4);
      if (tachi) { lamp(x, H.panel(1.0, 0.3), 0, 2.4, 1.0); S.fill(x.g, x.fills, 0, 2.1, 0, 10, 7); }
      S.fill(x.g, x.fills, 0, 2.1, x.zS - 1.2, 7, 7);
      x.stoveOK = !tachi; x.maneki = !tachi && r() < 0.5;
      Object.assign(slot, { floor: [W / 2 - 0.4, 0, x.zS - 0.7], door: [-W / 2 + 0.35, 0, x.zS - 0.3], counter: [1.3, 0.97, cz + 0.12], counter2: [1.6, 0.97, cz + 0.12], wall: [W / 2 - 0.3, 1.8, x.zS - 1.6, -PI / 2 - 0.3], table: [0.2, 0.97, cz + 0.15] });
      if (tachi) A = { stand: { p: [-0.1, 1.52, cz + 0.62], look: [-0.1, 1.2, zN], lim: { yaw: 160, up: 55, down: 60 }, body: 'stand' }, sit: { p: [-0.1, 1.52, cz + 0.62], look: [-0.1, 1.2, zN], lim: { yaw: 160, up: 55, down: 60 }, body: 'stand' } };
      else A = { sit: { p: [-0.1, 1.33, cz + 0.62], look: [-0.1, 1.2, zN], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' }, stand: { p: [0.2, 1.52, x.zS - 0.9], look: [0, 1.1, zN], lim: { yaw: 160, up: 55, down: 55 }, body: 'stand' } };
      comp = { sit: { p: [0.6, 0, cz + 0.62], ry: PI, pose: tachi ? 'stand' : 'sit', seat: 0.62 }, stand: { p: [0.8, 0, x.zS - 1.2], ry: PI, pose: 'stand' } };
      for (let i = 0; i < (tachi ? 1 : 2); i++) person(x, 'customer', Object.assign({ pose: tachi ? 'stand' : 'sit', seat: 0.62 }, look(x)), tachi ? -W / 2 + 0.75 : 1.3 - i * 2.1, tachi ? 0.6 : cz + 0.62, tachi ? -PI / 2 : PI);
      spot(x, 'のれん', [-W / 2 + 0.9, 1.4, x.zS + 0.2]); spot(x, 'カウンター', [0.2, 1.05, cz]); spot(x, '湯気の立つ釜', [-0.6, 1.3, zN + 0.35]); spot(x, '壁の品書き', [-W / 2 + 0.1, 1.5, -0.3]); spot(x, '窓の外の通り', [W / 2 - 1.1, 1.4, x.zS - 0.1]); spot(x, '棚のどんぶり', [0.2, 1.55, zN + 0.14]);
      label = ramen ? 'ラーメン屋' : (tachi ? '立ち食いそばの店' : (udon ? 'うどん屋' : 'そば屋'));
      bodyC = { sit: { sleeve: '#6f7a86', legs: '#4a4f5c' }, stand: { sleeve: '#6f7a86' } };
    } else if (sub === 'izakaya' || sub === 'yakitori' || sub === 'enkai') {
      /* ---- 居酒屋・焼き鳥・宴会の座敷 ---- */
      const yaki = sub === 'yakitori', enkai = sub === 'enkai';
      const W = enkai ? 6.6 : 6.2, D = enkai ? 7.4 : 7.2;
      shell(x, { w: W, d: D, h: 2.45, wallTex: noise(enkai ? '#e8e0cc' : '#d9cbb0'), floorTex: tile('#5a524a', 4, 3, 4), openings: enkai ? [{ side: 'E', at: -1.0, w: 2.4, y: 0.9, h: 1.0, kind: 'shoji' }] : [{ side: 'S', at: -W / 2 + 1.0, w: 1.1, y: 0, h: 2.0, kind: 'window' }], ceil: '#7a5a3a', frame: P.woodDark });
      x.g.add(K.box(W - 0.02, 0.95, 0.02, K.mTex(wood('#5c4531', 3, 1)), 0, 0, -x.zS + 0.012));
      const zN = -x.zS, name = H.name(enkai ? 'enkai' : (yaki ? 'yakitori' : 'izakaya'), r);
      frontSign(x, name, { bg: '#2a2420', fg: '#f4f0e6', font: 'mincho', lit: true });
      norenAt(x, enkai ? ['御', '座', '敷'] : ['酒'], '#2a2a3a', -W / 2 + 1.0, 1.0);
      const lt = H.lantern(yaki ? '焼鳥' : '酒処'); K.at(lt, -W / 2 + 1.75, 2.2, x.zS + 0.3); x.g.add(lt); x.out.push(lt); spot(x, '赤ちょうちん', [-W / 2 + 1.75, 1.9, x.zS + 0.3]);
      let mySeat;
      if (enkai) {
        /* 宴会の座敷: 土間の上がり口から奥が畳 */
        const ph = 0.3, pz0 = zN, pz1 = x.zS - 1.1;
        const pf = H.platform(W - 0.1, pz1 - pz0, ph); K.at(pf, 0, 0, (pz0 + pz1) / 2); x.g.add(pf);
        const rows = [-1.3, 0.7], nT = 2;
        const party = [];
        rows.forEach((zr, ri) => {
          for (let k = 0; k < nT; k++) { const lt2 = H.lowTable(1.6, 0.8); K.at(lt2, -1.5 + k * 2.2, ph, zr); x.g.add(lt2);
            for (let q = 0; q < 6; q++) x.g.add(K.plate(P.white, 0.07).translateX(-2.1 + k * 2.2 + q * 0.24).translateY(ph + 0.345).translateZ(zr + (q % 2 ? 0.2 : -0.2)));
            for (let q = 0; q < 2; q++) x.g.add(K.cyl(0.028, 0.22, K.m('#5a3a1e', { rough: 0.3 }), -2.0 + k * 2.2 + q * 1.1, ph + 0.34, zr + 0.06, { seg: 10 }));
            for (const sz of [-1, 1]) for (let q = 0; q < 3; q++) { const zb = K.zabuton(U.pick(r, ['#7a2f2a', '#2f3b55'])); K.at(zb, -2.05 + k * 2.2 + q * 0.55, ph, zr + sz * 0.7); x.g.add(zb); party.push([-2.05 + k * 2.2 + q * 0.55, zr + sz * 0.7, sz > 0 ? PI : 0]); }
          }
        });
        if (/鍋/.test(t)) { const nb = H.pot(0.16, 0.12); K.at(nb, -1.5, ph + 0.34, rows[0]); x.g.add(nb); steamAt(x, -1.5, ph + 0.46, rows[0], { n: 14, h: 0.6 }); }
        mySeat = party[1];
        const role = c.cause && c.cause.job === 'office' ? 'coworker' : 'customer';
        party.forEach((s, i) => { if (i === 1 || i === 2 || r() < 0.35) return; person(x, i % 3 ? role : null, Object.assign({ pose: 'seiza' }, look(x)), s[0], s[1], s[2], ph); });
        const shoji = H.vplane(2.3, 1.0, K.mTex(K.tex.shoji()), W / 2 - 0.01, 1.4, -1.0, -PI / 2); x.g.add(shoji);
        for (let i = 0; i < 4; i++) lamp(x, H.pendant({ kind: 'washi', power: i % 2 ? 0 : 3.2, len: 0.35 }), -1.6 + (i % 2) * 2.2, 2.45, rows[Math.floor(i / 2)]);
        S.fill(x.g, x.fills, 0, 2.1, 0, 8, 9);
        A = { sit: { p: [mySeat[0], ph + 0.74, mySeat[1]], look: [mySeat[0], ph + 0.6, mySeat[1] + (mySeat[2] ? -2 : 2)], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit', ground: ph }, stand: { p: [0, 1.52, x.zS - 0.6], look: [0, 1.0, 0], lim: { yaw: 160, up: 55, down: 55 }, body: 'stand' } };
        comp = { sit: { p: [mySeat[0] + 0.55, ph, mySeat[1]], ry: mySeat[2], pose: 'seiza' }, stand: { p: [1.2, 0, x.zS - 0.7], ry: PI, pose: 'stand' } };
        Object.assign(slot, { table: [-1.5 + 0.1, ph + 0.34, rows[0]], door: [W / 2 - 0.4, 0, x.zS - 0.4], wall: [W / 2 - 0.25, 1.75, x.zS - 1.6, -PI / 2] });
        label = '宴会の座敷';
        spot(x, '座布団', [mySeat[0] + 0.55, ph + 0.1, mySeat[1]]); spot(x, '障子', [W / 2 - 0.05, 1.4, -1.0]);
      } else {
        const cx = -W / 2 + 1.3;
        x.g.add(K.box(0.5, 1.0, 4.0, K.mTex(wood('#5c4531')), cx, 0, -0.8)); x.g.add(K.box(0.66, 0.06, 4.1, K.m('#8a6a4a', { rough: 0.4 }), cx + 0.04, 1.0, -0.8));
        for (let i = 0; i < 5; i++) { const st = K.stool(K.m('#3a2a22'), 0.62); K.at(st, cx + 0.62, 0, -2.4 + i * 0.75); x.g.add(st); }
        x.g.add(K.box(0.5, 0.86, 3.6, H.mat.steel(), -W / 2 + 0.3, 0, -0.8));
        const sk = H.wallShelf(3.6, 0.9, 'sake', 5, { rows: 2, depth: 0.26, board: P.woodDark, back: '#3a2a22' }); K.at(sk, -W / 2 + 0.16, 1.3, -0.8, PI / 2); x.g.add(sk);
        if (yaki) { x.g.add(K.box(0.4, 0.12, 1.4, K.m('#1a1a1a', { metal: 0.3 }), -W / 2 + 0.3, 0.86, -0.4)); x.g.add(K.box(0.3, 0.02, 1.3, K.m('#ff5a2a', { emissive: '#ff4a1a', ei: 0.8 }), -W / 2 + 0.3, 0.98, -0.4, { noShadow: true })); for (let i = 0; i < 4; i++) steamAt(x, -W / 2 + 0.3, 1.0, -0.9 + i * 0.32, { color: 0xa8a29a, alpha: 0.16, h: 0.9, n: 8, size: 0.22 }); spot(x, '焼き台', [-W / 2 + 0.3, 1.1, -0.4]); }
        person(x, x.staff ? 'coworker' : 'cook', { top: '#2a2a3a', bottom: '#2a2a2a', hair: P.hair, h: 1.66 }, -W / 2 + 0.75, -1.4, PI / 2);
        /* 小上がり（東） */
        const ph = 0.36, px0 = 0.6, px1 = W / 2, pz0 = -1.8, pz1 = 1.7;
        const pf = H.platform(px1 - px0, pz1 - pz0, ph); K.at(pf, (px0 + px1) / 2, 0, (pz0 + pz1) / 2); x.g.add(pf);
        const tbs = [[1.9, -0.9], [1.9, 0.9]];
        tbs.forEach((tb, i) => { const lt2 = H.lowTable(0.9, 0.7); K.at(lt2, tb[0], ph, tb[1]); x.g.add(lt2); for (const sx of [-1, 1]) { const zb = K.zabuton(U.pick(r, ['#7a2f2a', '#2f3b55', '#5a4a2a'])); K.at(zb, tb[0] + sx * 0.6, ph, tb[1]); x.g.add(zb); } if (i === 1 && !/小上がり/.test(t)) person(x, 'customer', Object.assign({ pose: 'seiza' }, look(x)), tb[0] + 0.6, tb[1], -PI / 2, ph); });
        /* 奥の板の間とトイレの戸（スリッパを並べる所） */
        x.g.add(K.box(1.6, 0.04, 0.7, K.mTex(wood(P.woodLight, 2, 1)), 1.9, 0, zN + 0.35));
        const td = K.door(K.m('#8a6a4a'), 0.75, 1.95); K.at(td, 1.9, 0, zN + 0.02); x.g.add(td); spot(x, 'トイレの戸', [1.9, 1.1, zN + 0.1]);
        if (/スリッパ/.test(t) || r() < 0.5) { x.slippers = H.slippers(/スリッパ/.test(t) ? 4 : 2); K.at(x.slippers, 1.5, 0.04, zN + 0.45); x.g.add(x.slippers); spot(x, 'スリッパ', [1.9, 0.1, zN + 0.45]); }
        const menu = H.dishes(t).concat(H.MENU[yaki ? 'yakitori' : 'izakaya']).slice(0, 12);
        const mt = H.menuTags(menu, { bg: '#e8d9b0', fg: '#2a1e14', w: 0.1, h: 0.38 }); K.at(mt, -2.0, 1.75, zN + 0.012); x.g.add(mt);
        const inl = H.lantern(yaki ? '焼鳥' : '居酒屋'); inl.userData.noLight(); K.at(inl, cx + 0.3, 2.4, 1.6); x.g.add(inl); x.lamps.push(inl);
        for (const p of [[cx + 0.4, -2.0], [cx + 0.4, 0.2], [1.9, -0.9], [1.9, 0.9]]) lamp(x, H.pendant({ kind: 'cone', power: 2.4, len: 0.4, shadeColor: '#5a3a1e' }), p[0], 2.45, p[1]);
        S.fill(x.g, x.fills, 0, 2.1, x.zS - 1.2, 6, 7);
        clockAt(x, W / 2 - 0.04, 2.0, 2.4, -PI / 2);
        if (/帳場/.test(t)) { x.g.add(K.box(0.7, 0.9, 0.45, K.m(P.woodDark), cx + 0.2, 0, 2.0)); const rg = H.register(); K.at(rg, cx + 0.2, 0.9, 2.0); x.g.add(rg); spot(x, '帳場', [cx + 0.2, 1.0, 2.0]); }
        Object.assign(slot, { door: [-W / 2 + 0.35, 0, x.zS - 0.35], counter: [cx + 0.1, 1.06, 0.8], counter2: [cx + 0.1, 1.06, 1.0], wall: [W / 2 - 0.25, 1.75, x.zS - 0.6, -PI / 2], table: [1.9, ph + 0.34, 0.9], floor: [W / 2 - 0.5, 0, x.zS - 0.8] });
        if (x.staff) A = { stand: { p: [cx - 0.35, 1.52, 0.2], look: [1.5, 1.0, 0.4], lim: { yaw: 160, up: 55, down: 60 }, body: 'stand' }, sit: { p: [cx + 0.62, 1.33, 1.2], look: [W / 2, 1.0, 0], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' } };
        else if (/小上がり|座敷/.test(t)) A = { sit: { p: [1.3, ph + 0.74, 0.9], look: [2.6, ph + 0.6, 0.9], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit', ground: ph }, stand: { p: [-0.2, 1.52, x.zS - 0.9], look: [1.0, 1.0, -1.0], lim: { yaw: 160, up: 55, down: 55 }, body: 'stand' } };
        else A = { sit: { p: [cx + 0.62, 1.33, -0.9], look: [-W / 2, 1.3, -0.9], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' }, stand: { p: [-0.2, 1.52, x.zS - 0.9], look: [-1.5, 1.1, -1.5], lim: { yaw: 160, up: 55, down: 55 }, body: 'stand' } };
        comp = /小上がり|座敷/.test(t) && !x.staff ? { sit: { p: [2.5, ph, 0.9], ry: -PI / 2, pose: 'seiza' } } : { sit: { p: [cx + 0.62, 0, -0.15], ry: -PI / 2, pose: 'sit', seat: 0.62 } };
        comp.stand = { p: [0, 0, 1.2], ry: 0.6, pose: 'stand' };
        for (let i = 0; i < 2; i++) person(x, 'customer', Object.assign({ pose: 'sit', seat: 0.62 }, look(x)), cx + 0.62, -2.4 + i * 3.0, -PI / 2);
        spot(x, 'カウンター', [cx + 0.1, 1.2, -0.3]); spot(x, '棚に並んだ瓶', [-W / 2 + 0.2, 1.6, -1.2]); spot(x, '壁の品書き', [-1.4, 1.6, zN + 0.1]); spot(x, '小上がり', [1.9, 0.6, 0]); spot(x, 'のれん', [-W / 2 + 1.0, 1.4, x.zS + 0.2]);
        label = yaki ? '焼き鳥屋' : '居酒屋';
      }
      amb = { crowd: 0.65, traffic: 0.15, tick: 0.2 };
      x.stoveOK = false;
    } else if (sub === 'yakiniku') {
      /* ---- 焼き肉 ---- */
      const W = 6.0, D = 7.0;
      shell(x, { w: W, d: D, h: 2.55, wallTex: noise('#3a2e28'), floorTex: tile('#2a2420', 4, 3, 4), openings: [{ side: 'S', at: -W / 2 + 1.0, w: 1.1, y: 0, h: 2.0, kind: 'window' }], ceil: '#2a2420' });
      frontSign(x, H.name('yakiniku', r), { bg: '#1a1210', fg: '#e8c86a', font: 'mincho', lit: true });
      const tbs = [[-1.3, -1.6], [1.3, -1.6], [-1.3, 0.8], [1.3, 0.8]];
      tbs.forEach((tb, i) => {
        const gt = H.grillTable(2.55); K.at(gt, tb[0], 0, tb[1]); x.g.add(gt); steamAt(x, tb[0], 0.75, tb[1], { color: 0xb8b0a6, alpha: 0.16, h: 0.45, n: 12, spread: 0.07, size: 0.22 });
        for (const sz of [-1, 1]) { const bn = H.booth(1.0, '#4a2a22'); K.at(bn, tb[0], 0, tb[1] + sz * 0.7, sz > 0 ? PI : 0); x.g.add(bn); }
        if (i === 3) for (const sz of [-1, 1]) person(x, 'customer', Object.assign({ pose: 'sit', seat: 0.46 }, look(x)), tb[0] + 0.1, tb[1] + sz * 0.58, sz > 0 ? PI : 0);
      });
      person(x, 'cook', { top: '#1e1e1e', bottom: '#1e1e1e', hair: P.hair, h: 1.66 }, 0, -0.4, PI);
      const mb = H.menuBoard('品書き', H.MENU.yakiniku, 1.6, 0.8, { bg: '#1a1210', fg: '#e8c86a' }); K.at(mb, 0, 1.4, -x.zS + 0.02); x.g.add(mb);
      for (const tb of tbs) lamp(x, H.pendant({ kind: 'cone', power: 3.2, len: 0.2, shadeColor: '#1a1a1a' }), tb[0] + 0.5, 2.55, tb[1]);
      S.fill(x.g, x.fills, 0, 2.1, 0, 5, 8);
      clockAt(x, W / 2 - 0.04, 2.0, -1.0, -PI / 2);
      A = { sit: { p: [-1.3, 1.17, -2.25], look: [-1.3, 0.8, -1.0], lim: { yaw: 150, up: 55, down: 65 }, body: 'sit' }, stand: { p: [0, 1.52, x.zS - 0.9], look: [0, 1.0, -1.0], lim: { yaw: 160, up: 55, down: 55 }, body: 'stand' } };
      comp = { sit: { p: [-1.3, 0, -1.0], ry: PI, pose: 'sit', seat: 0.46 }, stand: { p: [0.6, 0, x.zS - 1.2], ry: PI, pose: 'stand' } };
      Object.assign(slot, { door: [-W / 2 + 0.35, 0, x.zS - 0.35], table: [-1.1, 0.72, -1.4], wall: [W / 2 - 0.25, 1.75, 2.4, -PI / 2] });
      spot(x, 'ロースター', [-1.3, 0.8, -1.6]); spot(x, '排気の筒', [-1.3, 1.6, -1.6]); spot(x, '壁の品書き', [0, 1.8, -x.zS + 0.1]);
      label = '焼き肉店'; amb = { crowd: 0.6, traffic: 0.15, tick: 0.2 };
    } else if (sub === 'sushi') {
      /* ---- すし ---- */
      const W = 5.6, D = 6.8, zz = /座敷/.test(t);
      shell(x, { w: W, d: D, h: 2.5, wallTex: noise('#ece4d0'), floorTex: tile('#5a5650', 4, 3, 4), openings: [{ side: 'S', at: -W / 2 + 1.0, w: 1.1, y: 0, h: 2.0, kind: 'window' }], ceil: '#d9c9a8' });
      frontSign(x, H.name('sushi', r), { bg: '#f4f0e6', fg: '#1a1a1a', font: 'mincho', lit: true }); norenAt(x, ['す', 'し'], '#1e2a3a', -W / 2 + 1.0, 1.0);
      const zN = -x.zS, cz = zN + 1.15, hin = K.m(P.woodPale, { rough: 0.4 });
      x.g.add(K.box(3.6, 0.95, 0.5, K.mTex(wood(P.woodLight)), -0.8, 0, cz)); x.g.add(K.box(3.7, 0.06, 0.62, hin, -0.8, 0.95, cz + 0.06));
      const nc = H.showcase(3.0, 0.36, 'neta', 3, { depth: 0.32, base: P.woodPale, tilt: 0.25, topH: 0.012, topM: K.m(P.woodPale, { rough: 0.5 }), posts: true }); K.at(nc, -0.8, 1.0, cz - 0.12); x.g.add(nc); spot(x, 'ネタのケース', [-0.8, 1.2, cz - 0.1]);
      /* 客の前の付け台: すし下駄と握り、がり、湯のみ、しょうゆ皿 */
      for (let k = 0; k < 2; k++) {
        const ox = -0.8 + (k ? 0.75 : 0), ge = new T.Group();
        ge.add(K.box(0.36, 0.025, 0.15, K.m('#c9a46e', { rough: 0.6 }), 0, 0.012, 0)); for (const sx of [-1, 1]) ge.add(K.box(0.03, 0.012, 0.15, K.m('#a8844e'), sx * 0.13, 0, 0));
        const NETA = ['#d9443a', '#f0a070', '#f2d25c', '#e8e4dc', '#c83a3a'];
        const rice = K.m('#f6f3ec', { rough: 0.9, emissive: '#f6f3ec', ei: 0.18, nocache: true });
        for (let i = 0; i < (k ? 0 : 3); i++) { ge.add(K.sph(0.034, rice, -0.09 + i * 0.09, 0.044, 0, { s: [1.15, 0.6, 0.62] })); const nt = K.box(0.084, 0.009, 0.044, K.m(U.pick(r, NETA), { rough: 0.35 }), -0.09 + i * 0.09, 0.058, 0); nt.rotation.z = (i - 1) * 0.06; ge.add(nt); }
        if (!k) ge.add(K.sph(0.025, K.m('#f2c4b8', { rough: 0.7 }), 0.15, 0.04, 0.03, { s: [1.2, 0.5, 1] }));
        K.at(ge, ox, 1.01, cz + 0.1); x.g.add(ge);
        const yu = K.cyl(0.031, 0.085, K.m(U.pick(r, ['#8a9a82', '#a8846a', '#7a8494', '#d9d2c2']), { rough: 0.5 }), ox + 0.3, 1.01, cz + 0.08, { seg: 16, rTop: 0.034 }); x.g.add(yu);
        x.g.add(K.cyl(0.035, 0.008, K.m('#f2efe6'), ox - 0.28, 1.01, cz + 0.14, { seg: 16 })); x.g.add(K.cyl(0.025, 0.003, K.m('#2a1810'), ox - 0.28, 1.019, cz + 0.14, { seg: 16 }));
      }
      spot(x, 'すし下駄', [-0.8, 1.06, cz + 0.1]); spot(x, '湯のみ', [-0.5, 1.1, cz + 0.14]);
      for (let i = 0; i < 5; i++) { const st = K.stool(K.m(P.woodDark), 0.66); K.at(st, -2.3 + i * 0.75, 0, cz + 0.62); x.g.add(st); }
      person(x, 'cook', { top: '#f4f2ee', bottom: '#f4f2ee', hair: P.hair, h: 1.66 }, -0.8, zN + 0.55, 0);
      const ph = 0.34, pf = H.platform(1.9, 3.0, ph); K.at(pf, W / 2 - 0.95, 0, 0.6); x.g.add(pf); const lt2 = H.lowTable(1.1, 0.8); K.at(lt2, W / 2 - 0.95, ph, 0.6); x.g.add(lt2);
      for (const sz of [-1, 1]) { const zb = K.zabuton('#7a2f2a'); K.at(zb, W / 2 - 0.95, ph, 0.6 + sz * 0.65); x.g.add(zb); }
      const tags = H.menuTags(H.MENU.sushi, { bg: '#e8d9b0', fg: '#1a1a1a' }); K.at(tags, -2.3, 1.7, zN + 0.012); x.g.add(tags);
      for (let i = 0; i < 3; i++) lamp(x, H.pendant({ kind: 'washi', power: 2.4, len: 0.4 }), -2.0 + i * 1.2, 2.5, cz + 0.2);
      lamp(x, H.pendant({ kind: 'washi', power: 2.2, len: 0.4 }), W / 2 - 0.95, 2.5, 0.6);
      S.fill(x.g, x.fills, 0, 2.1, 0, 6, 8); clockAt(x, -W / 2 + 0.04, 2.0, 0.6, PI / 2);
      if (zz) { A = { sit: { p: [W / 2 - 0.95, ph + 0.74, 0.0], look: [W / 2 - 0.95, ph + 0.5, 1.4], lim: { yaw: 150, up: 55, down: 62 }, body: 'sit', ground: ph }, stand: { p: [0, 1.52, x.zS - 0.9], look: [-0.8, 1.0, zN], lim: { yaw: 160, up: 55, down: 55 }, body: 'stand' } }; comp = { sit: { p: [W / 2 - 0.95, ph, 1.25], ry: PI, pose: 'seiza' } }; }
      else { A = { sit: { p: [-0.8, 1.38, cz + 0.62], look: [-0.8, 1.1, zN], lim: { yaw: 150, up: 55, down: 62 }, body: 'sit' }, stand: { p: [0, 1.52, x.zS - 0.9], look: [-0.8, 1.0, zN], lim: { yaw: 160, up: 55, down: 55 }, body: 'stand' } }; comp = { sit: { p: [-0.05, 0, cz + 0.62], ry: PI, pose: 'sit', seat: 0.66 } }; }
      comp.stand = { p: [0.6, 0, x.zS - 1.2], ry: PI, pose: 'stand' };
      Object.assign(slot, { table: [W / 2 - 0.95, ph + 0.34, 0.6], door: [-W / 2 + 0.35, 0, x.zS - 0.35] });
      spot(x, 'カウンター', [-0.8, 1.05, cz]); spot(x, '座敷', [W / 2 - 0.95, 0.6, 0.6]); spot(x, 'のれん', [-W / 2 + 1.0, 1.4, x.zS + 0.2]); spot(x, '壁の品書き', [-1.9, 1.6, zN + 0.1]);
      label = 'すし屋'; amb = { crowd: 0.35, traffic: 0.15, tick: 0.3 };
    } else if (sub === 'kissa' || sub === 'chika' || sub === 'museum' || sub === 'bakecafe' || sub === 'kanmi' || sub === 'chaya' || sub === 'kiosk') {
      return cafe(x);
    } else {
      return bigHall(x);
    }
    details(x, slot);
    if (!x.outsideDone) H.outside(x.g, c, x.zS, r, x.out, outKind);
    return finish(x, { label, anchors: A, body: bodyC, companion: comp, amb, walk: { y: 0, rects: [[-x.W / 2, -x.zS, x.W / 2, x.zS]] } });
  }

  /* ---- 喫茶店・甘味処・茶屋・売店 ---- */
  function cafe(x) {
    const c = x.c, r = x.rng, sub = x.sub, t = x.text, look = customerLook, slot = {};
    let A, comp, label, outKind = 'town', amb = { crowd: 0.3, traffic: 0.25, tick: 0.5 };
    if (sub === 'chaya' || sub === 'kiosk') {
      /* 峠の茶屋・湖の売店: 表が開いた小屋。外の縁台から景色を見る */
      const W = 4.6, D = 3.6;
      shell(x, { w: W, d: D, h: 2.4, wallTex: wood(sub === 'kiosk' ? '#b9a07a' : '#8a6a4a', 3, 1), floorTex: tile('#8a8478', 4, 3, 3), openings: [{ side: 'S', at: 0, w: W - 0.5, y: 0, h: 2.1, kind: 'open' }], ceil: '#6a5034' });
      const zS = x.zS;
      frontSign(x, H.name(sub, r), { bg: '#f4f0e6', fg: '#2a2622', font: 'mincho' });
      x.g.add(K.box(W - 0.6, 0.9, 0.5, K.mTex(wood(P.wood)), 0, 0, -zS + 0.5)); x.g.add(K.box(W - 0.5, 0.05, 0.6, K.m(P.woodLight), 0, 0.9, -zS + 0.52));
      if (sub === 'kiosk') { x.g.add(K.box(1.0, 0.8, 0.6, K.m('#e8eaec'), 1.4, 0, -zS + 1.3)); const fl = H.nobori('氷', '#2f6db5'); K.at(fl, -1.9, 0, zS + 3.2, PI); x.g.add(fl); x.ticks.push(tt => { fl.userData.flag.rotation.y = Math.sin(tt * 2.6) * 0.3; }); const cl = H.cooler(1.2, 1.6, 'drinks', 4); K.at(cl, -1.4, 0, -zS + 0.36); x.g.add(cl); }
      else { const kt = H.stove(); K.at(kt, 1.6, 0, -zS + 1.1); x.g.add(kt); const mt = H.menuTags(H.MENU.kanmi, { bg: '#e8d9b0' }); K.at(mt, -1.6, 1.55, -zS + 0.012); x.g.add(mt); }
      person(x, sub === 'kiosk' ? 'shopkeeper' : 'cook', { top: '#e8e4da', bottom: '#3d4352', hair: P.hairGray, old: r() < 0.5, h: 1.54 }, 0.2, -zS + 0.2, 0);
      /* 外の縁台と、野点傘 */
      for (let i = 0; i < 2; i++) { const bx = -1.0 + i * 2.2; x.g.add(K.box(1.4, 0.42, 0.5, K.m(P.woodDark), bx, 0, zS + 1.4)); x.g.add(K.box(1.4, 0.02, 0.5, K.m('#c8392b', { rough: 0.9 }), bx, 0.42, zS + 1.4)); }
      if (sub === 'chaya') { const um = new T.Group(); um.add(K.cyl(0.02, 2.3, K.m(P.woodDark), 0, 0, 0)); um.add(K.cyl(1.2, 0.3, K.m('#c8392b', { rough: 0.8, double: true }), 0, 2.0, 0, { rTop: 0.02, seg: 24, open: true })); K.at(um, 0.1, 0, zS + 2.0); x.g.add(um); }
      if (/トラック|角材/.test(t)) { const tr = K.car('#e2e4e6', 'truck'); K.at(tr, 4.5, 0, zS + 7, 0.3); x.g.add(tr); for (let i = 0; i < 6; i++) x.g.add(K.box(2.6, 0.12, 0.12, K.m('#c9a46e'), 4.5, 1.25 + (i % 3) * 0.13, zS + 7.2 + Math.floor(i / 3) * 0.14 - 0.4)); spot(x, '角材を積んだトラック', [4.5, 1.4, zS + 7]); }
      x.outsideDone = true;
      if (sub === 'kiosk') { const sp = K.seasonal(c); const gr = K.ground(160, sp.grass, -0.05, 30); x.g.add(gr); const lake = K.water(60, 26, P.water); K.at(lake, 0, -0.02, zS + 22); x.g.add(lake); g2ridge(x, sp); for (let i = 0; i < 6; i++) { const tr = K.tree ? K.tree({ seed: c.seed + i, h: 6 + r() * 3, season: c.season, weather: c.weather }) : null; if (tr) { const sd = i % 2 ? 1 : -1; if (i < 4) K.at(tr, sd * (9 + r() * 6), 0, zS + 3 + i * 1.5); else K.at(tr, -20 + (i - 4) * 40 + r() * 6, 0, zS + 38 + r() * 4); x.g.add(tr); } } }   // 湖は地面の上に。木は手前の両わきと向こう岸に
      else H.outside(x.g, c, zS, r, x.out, 'rural');
      lamp(x, H.pendant({ kind: 'bulb', power: 2.0, len: 0.4 }), 0, 2.4, -0.3);
      S.fill(x.g, x.fills, 0, 2.0, 0, 4, 6);
      A = { sit: { p: [-1.0, 1.15, zS + 1.4], look: [-1.0, 1.0, zS + 10], lim: { yaw: 160, up: 60, down: 60 }, body: 'sit' }, stand: { p: [0.2, 1.52, zS + 0.5], look: [0, 1.0, -zS], lim: { yaw: 160, up: 55, down: 55 }, body: 'stand' } };
      comp = { sit: { p: [-0.4, 0, zS + 1.4], ry: 0, pose: 'sit', seat: 0.44 }, stand: { p: [1.0, 0, zS + 1.2], ry: PI, pose: 'stand' } };
      spot(x, sub === 'kiosk' ? '湖' : '山の景色', [0, 2.0, zS + 14]); spot(x, '縁台', [-1.0, 0.5, zS + 1.4]); spot(x, '品書き', [-1.4, 1.6, -zS + 0.1]);
      label = sub === 'kiosk' ? '湖のほとりの売店' : '峠の茶屋';
      return finish(x, { label, anchors: A, body: { sit: { sleeve: '#7d8794', legs: '#4a4f5c' }, stand: { sleeve: '#7d8794' } }, companion: comp, amb: { crowd: 0.1, traffic: 0.25, nature: 1 }, indoor: false, walk: { y: 0, rects: [[-x.W / 2, -zS, x.W / 2, zS + 3]] }, weatherBox: [[-12, -0.1, zS + 0.4], [12, 9, zS + 14]] });
    }
    const chika = sub === 'chika', museum = sub === 'museum', bake = sub === 'bakecafe', kanmi = sub === 'kanmi';
    const W = museum ? 7.0 : 5.6, D = museum ? 7.0 : (chika ? 6.0 : 7.0), Hh = chika ? 2.35 : 2.55;
    const pal = U.pick(r, [{ wall: '#5c4531', booth: '#7a2a2a', floor: '#4a3a2e' }, { wall: '#6a5034', booth: '#3f5a48', floor: '#3a3a36' }, { wall: '#c8b490', booth: '#b8642e', floor: '#7a6a5a' }]);
    const wallTex = museum ? noise('#f2f2ee') : (kanmi ? noise('#e8dcc4') : (bake ? noise('#efe6d6') : wood(pal.wall, 4, 1)));
    const ops = chika ? [{ side: 'S', at: -W / 2 + 0.9, w: 1.2, y: 0, h: 2.1, kind: 'open' }]
      : (museum ? [{ side: 'E', at: 0, w: 5.0, y: 0.1, h: 2.2, kind: 'window' }, { side: 'S', at: 0, w: 4.0, y: 0.1, h: 2.2, kind: 'window' }]
        : [{ side: 'S', at: -W / 2 + 1.0, w: 1.0, y: 0, h: 2.0, kind: 'window' }, { side: 'E', at: -0.6, w: 4.2, y: 0.8, h: 1.2, kind: 'window' }]);
    shell(x, { w: W, d: D, h: Hh, wallTex, floorTex: museum ? noise('#b9b6ad', 3, 3) : (bake ? wood(P.woodLight, 3, 3) : tile(pal.floor, 4, 3, 4)), openings: ops, ceil: museum ? '#f6f6f2' : (kanmi ? '#6a5034' : '#e6dfd0'), frame: museum ? '#d9dad6' : P.woodDark });
    const zS = x.zS, zN = -zS;
    const name = H.name(chika ? 'chika' : (museum ? 'museum' : (bake ? 'bakecafe' : (kanmi ? 'kanmi' : 'kissa'))), r);
    if (!chika && !bake) frontSign(x, name, { bg: kanmi ? '#f4f0e6' : '#2a241e', fg: kanmi ? '#2a2622' : '#e8d9a0', font: kanmi ? 'mincho' : 'mincho', lit: !kanmi });
    if (kanmi) norenAt(x, ['甘', '味'], '#7a2f2a', -W / 2 + 1.0, 1.0);
    /* カウンター（西）と、サイフォン・カップの棚 */
    const cx = -W / 2 + 0.9;
    x.g.add(K.box(0.5, 1.0, 2.6, K.mTex(wood(museum ? '#d9d4c6' : P.woodDark)), cx, 0, -1.2)); x.g.add(K.box(0.62, 0.05, 2.7, K.m(museum ? '#f2f2ee' : P.wood, { rough: 0.35 }), cx + 0.03, 1.0, -1.2));
    const cup = H.wallShelf(2.4, 0.8, kanmi ? 'gifts' : 'boxes', 8, { rows: 2, depth: 0.26, board: P.woodDark, back: museum ? '#e6e6e2' : '#3a2a22' }); K.at(cup, -W / 2 + 0.15, 1.3, -1.2, PI / 2); x.g.add(cup);
    if (!kanmi) for (let i = 0; i < 3; i++) { const sp = new T.Group(); sp.add(K.sph(0.07, K.m(P.glass, { transparent: true, opacity: 0.35, rough: 0.05 }), 0, 0.22, 0)); sp.add(K.cyl(0.05, 0.16, K.m(P.glass, { transparent: true, opacity: 0.3 }), 0, 0.02, 0)); sp.add(K.cyl(0.03, 0.02, K.m('#2a1a10'), 0, 0.02, 0)); K.at(sp, cx + 0.05, 1.05, -2.2 + i * 0.3); x.g.add(sp); }
    if (/ケーキ/.test(t) || bake) { const cs = H.showcase(1.0, 1.1, 'bread', 6, { depth: 0.5, tilt: 0 }); K.at(cs, cx + 0.05, 0, 0.6, PI / 2); x.g.add(cs); spot(x, 'ケーキのケース', [cx + 0.05, 1.0, 0.6]); }
    person(x, x.staff ? 'customer' : 'master', { top: museum ? '#2a2a2a' : '#f2efe6', bottom: '#2a2a2a', hair: U.pick(r, [P.hair, P.hairGray]), h: 1.64 }, -W / 2 + 0.45, -1.0, PI / 2);
    /* 席 */
    const seats = [];
    if (museum) {
      for (let i = 0; i < 4; i++) { const tx = 0.4 + (i % 2) * 1.8, tz = -1.6 + Math.floor(i / 2) * 2.2; const tb = K.roundTable(0.36, 0.72, K.m('#f2f2ee', { rough: 0.4 })); K.at(tb, tx, 0, tz); x.g.add(tb); for (const sx of [-1, 1]) { const ch = K.chair(K.m('#e6e6e2'), K.m('#e6e6e2')); K.at(ch, tx + sx * 0.55, 0, tz, sx > 0 ? -PI / 2 : PI / 2); x.g.add(ch); } seats.push([tx, tz]); }
      const sp = K.seasonal(c); const gr = K.ground(80, sp.grass, -0.02, 20); K.at(gr, W / 2 + 40, -0.02, 0); x.g.add(gr);
      for (let i = 0; i < 10; i++) { const ss = K.bush(c.season === 'autumn' ? '#c9b48f' : P.leafLight, 0.35, i); K.at(ss, W / 2 + 1.5 + r() * 6, 0, -3 + r() * 6); x.g.add(ss); }
      x.outsideDone = true; g2ridge(x, K.seasonal(c));
    } else if (kanmi) {
      for (let i = 0; i < 3; i++) { const tz = -1.8 + i * 1.5, tb = K.table(0.8, 0.6, 0.66, K.m('#5c3a26', { rough: 0.45 })); K.at(tb, 1.4, 0, tz); x.g.add(tb); for (const sx of [-1, 1]) { x.g.add(K.box(0.35, 0.42, 0.7, K.m(P.woodDark), 1.4 + sx * 0.62, 0, tz)); x.g.add(K.box(0.36, 0.02, 0.7, K.m('#c8392b', { rough: 0.9 }), 1.4 + sx * 0.62, 0.42, tz)); } seats.push([1.4, tz]); }
      const kk = H.vplane(0.5, 1.2, H.texMat(H.textTex(['一期一会'], { w: 128, h: 320, bg: '#f2ead6', fg: '#2a2622', font: 'mincho', vertical: true })), W / 2 - 0.02, 1.5, 1.6, -PI / 2); x.g.add(kk);
    } else {
      const nB = chika ? 2 : 3;
      for (let i = 0; i < nB; i++) { const tz = -2.2 + i * 1.7, bx = W / 2 - 0.75; for (const sz of [-1, 1]) { const bn = H.booth(1.1, pal.booth); K.at(bn, bx, 0, tz + sz * 0.58, sz > 0 ? PI : 0); bn.rotation.y = sz > 0 ? PI : 0; x.g.add(bn); } const tb = K.table(1.0, 0.6, 0.7, K.m('#3a2a22', { rough: 0.35 })); K.at(tb, bx, 0, tz); x.g.add(tb); seats.push([bx, tz]); }
      const pc = H.pendulumClock(c.hour); K.at(pc, 0.4, 1.2, zN + 0.08); x.g.add(pc); x.ticks.push(tt => pc.userData.swing(tt)); x.clock = pc.userData.face; spot(x, '振り子の時計', [0.4, 1.7, zN + 0.1]);
      const pl = H.plant(1.2, '#c8c4b8', P.leaf); K.at(pl, W / 2 - 0.35, 0, zS - 0.5); x.g.add(pl);
      const mg = K.shelf(0.6, 1.0, 0.25, K.m(P.woodDark), 3); K.at(mg, -W / 2 + 0.35, 0, zS - 1.2, PI / 2); x.g.add(mg); x.g.add(H.vplane(0.55, 0.9, H.texMat(H.goodsTex('books', 9)), -W / 2 + 0.38, 0.5, zS - 1.2, PI / 2));
    }
    if (chika) {
      /* 地下: 表は階段。上から外の光 */
      const st2 = H.stairsUp(1.2, 14, 0.19, 0.27); K.at(st2, -W / 2 + 0.9, 0, zS + 0.1); x.g.add(st2);
      for (const sx of [-1, 1]) x.g.add(K.box(0.1, 3.0, 3.9, K.m('#8d8a82'), -W / 2 + 0.9 + sx * 0.65, 0, zS + 2.0));
      x.g.add(K.box(1.4, 0.1, 3.9, K.m('#8d8a82'), -W / 2 + 0.9, 3.0, zS + 2.0));
      const sky = new T.PointLight(0xdfe8f0, 2.0, 8, 1.6); sky.position.set(-W / 2 + 0.9, 2.8, zS + 3.6); x.g.add(sky);
      spot(x, '階段', [-W / 2 + 0.9, 1.6, zS + 1.4]); x.outsideDone = true;
      Object.assign(slot, { door: [-W / 2 + 1.7, 0, zS - 0.3] });
    }
    if (bake) { S.cityBelow(x.g, c, zS, -3.6, x.out, false); x.outsideDone = true; const nb = H.nobori('焼きたて', '#c8392b'); K.at(nb, 1.2, -3.6, zS + 1.6); x.g.add(nb); x.ticks.push(tt => { nb.userData.flag.rotation.y = Math.sin(tt * 4.1) * 0.5; }); spot(x, 'のぼり旗', [1.2, -1.2, zS + 1.6]); }
    /* 明かり */
    seats.forEach((s, i) => lamp(x, H.pendant({ kind: museum ? 'cone' : 'glass', power: i < 3 ? 2.2 : 0, len: 0.45, shadeColor: museum ? '#f2f2ee' : '#e8c890' }), s[0], Hh, s[1]));
    lamp(x, H.pendant({ kind: 'glass', power: 1.8, len: 0.45 }), cx + 0.3, Hh, -1.4);
    S.fill(x.g, x.fills, 0, Hh - 0.4, 0, museum ? 10 : 6, 8);
    if (!x.clock) clockAt(x, 0.4, 2.0, zN + 0.04, 0);
    const my = seats[0], tw = museum ? 0.55 : 0.58;
    if (x.staff) A = { stand: { p: [cx - 0.3, 1.52, -0.8], look: [W / 2, 1.0, 0.6], lim: { yaw: 160, up: 55, down: 60 }, body: 'stand' }, sit: { p: [cx + 0.6, 1.15, 0.6], look: [W / 2, 1.0, 0], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' } };
    else if (museum) A = { sit: { p: [my[0] - 0.55, 1.15, my[1]], look: [W / 2 + 5, 1.0, my[1]], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' }, stand: { p: [0, 1.52, zS - 0.9], look: [W / 2, 1.0, 0], lim: { yaw: 160, up: 55, down: 55 }, body: 'stand' } };
    else if (kanmi) A = { sit: { p: [my[0] - 0.62, 1.12, my[1]], look: [W / 2, 1.0, my[1] + 1.5], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' }, stand: { p: [0, 1.52, zS - 0.9], look: [-1.0, 1.0, -1.5], lim: { yaw: 160, up: 55, down: 55 }, body: 'stand' } };
    else A = { sit: { p: [my[0], 1.12, my[1] - tw], look: [cx, 1.15, my[1] + 0.6], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' }, stand: { p: [0, 1.52, zS - 0.9], look: [-1.0, 1.0, -1.5], lim: { yaw: 160, up: 55, down: 55 }, body: 'stand' } };
    comp = museum ? { sit: { p: [my[0] + 0.55, 0, my[1]], ry: -PI / 2, pose: 'sit', seat: 0.44 } } : (kanmi ? { sit: { p: [my[0] + 0.62, 0, my[1]], ry: -PI / 2, pose: 'sit', seat: 0.44 } } : { sit: { p: [my[0], 0, my[1] + tw], ry: PI, pose: 'sit', seat: 0.46 } });
    comp.stand = { p: [0.5, 0, zS - 1.2], ry: PI, pose: 'stand' };
    if (seats[2]) person(x, 'customer', Object.assign({ pose: 'sit', seat: 0.46 }, look(x)), seats[2][0] + (museum || kanmi ? 0.55 : 0), seats[2][1] + (museum || kanmi ? 0 : 0.58), museum || kanmi ? -PI / 2 : PI);
    Object.assign(slot, { table: [my[0] + 0.1, 0.71, my[1]], table2: seats[1] ? [seats[1][0] + 0.15, 0.71, seats[1][1]] : null, door: slot.door || [-W / 2 + 0.35, 0, zS - 0.35], floor: [0.3, 0, zS - 0.8], counter: [cx + 0.1, 1.05, -0.2], shelf: [cx + 0.1, 1.05, -0.4] });
    if (/ドアベル/.test(t)) { const bell = K.sph(0.03, K.m('#b99a52', { metal: 0.8, rough: 0.3 }), -W / 2 + 1.0, 2.05, zS - 0.08); x.g.add(bell); spot(x, 'ドアベル', [-W / 2 + 1.0, 2.0, zS - 0.1]); }
    spot(x, 'カウンター', [cx + 0.1, 1.2, -0.8]); spot(x, '窓', [W / 2, 1.4, -0.6]); spot(x, 'カップの棚', [-W / 2 + 0.2, 1.6, -1.2]);
    label = chika ? '地下の喫茶店' : (museum ? '美術館の喫茶室' : (bake ? 'パン屋の二階' : (kanmi ? '甘味処' : '喫茶店')));
    details(x, slot);
    if (!x.outsideDone) H.outside(x.g, c, zS, r, x.out, outKind);
    return finish(x, { label, anchors: A, body: { sit: { sleeve: '#7d8794', legs: '#4a4f5c' }, stand: { sleeve: '#7d8794' } }, companion: comp, amb, walk: { y: 0, rects: [[-W / 2, -zS, W / 2, zS]] } });
  }
  function g2ridge(x, sp) { x.g.add(K.ridge({ r: 200, hMin: 14, hMax: 40, color: sp.hillFar, seed: (x.c.seed || 1) + 4, n: 36 })); }

  /* ---- 大きな食堂（学食・ゲレンデ・クラブハウス・サービスエリア）と、宿の食事の座敷 ---- */
  function bigHall(x) {
    const c = x.c, r = x.rng, sub = x.sub, t = x.text, look = customerLook, slot = {};
    const zashiki = sub === 'minshuku' || sub === 'ryokan';
    if (zashiki) {
      const W = 6.0, D = 6.0;
      shell(x, { w: W, d: D, h: 2.4, wallTex: noise('#e8dcc4'), floorTex: K.tex.rep(K.tex.tatami(), 4, 3), openings: [{ side: 'S', at: 0, w: 3.6, y: 0.4, h: 1.6, kind: sub === 'ryokan' ? 'shoji' : 'window' }], ceil: '#c9b48f' });
      const zS = x.zS;
      const rows = [-1.4, 0.4];
      const seats = [];
      rows.forEach(zr => { const lt = H.lowTable(3.4, 0.7); K.at(lt, 0, 0, zr); x.g.add(lt); for (const sz of [-1, 1]) for (let q = 0; q < 4; q++) { const zb = K.zabuton(sub === 'ryokan' ? '#7a2f2a' : '#3f5a48'); K.at(zb, -1.25 + q * 0.83, 0, zr + sz * 0.62); x.g.add(zb); seats.push([-1.25 + q * 0.83, zr + sz * 0.62, sz > 0 ? PI : 0]); } for (let q = 0; q < 5; q++) { x.g.add(K.bowl(P.black).translateX(-1.4 + q * 0.7).translateY(0.34).translateZ(zr - 0.15)); x.g.add(K.plate('#e8e4da', 0.08).translateX(-1.2 + q * 0.7).translateY(0.34).translateZ(zr + 0.15)); } });
      seats.forEach((s, i) => { if (i === 4 || i === 5 || r() < 0.55) return; person(x, null, Object.assign({ pose: 'seiza' }, look(x)), s[0], s[1], s[2]); });
      if (sub === 'ryokan') { const tk = H.vplane(0.5, 1.2, H.texMat(H.textTex(['山紫水明'], { w: 128, h: 320, bg: '#f2ead6', fg: '#2a2622', font: 'mincho', vertical: true })), 0, 1.4, -zS + 0.02); x.g.add(tk); x.g.add(K.box(1.4, 0.15, 0.5, K.m(P.woodDark), 0, 0, -zS + 0.3)); }
      else { x.tv = tvAt(x, W / 2 - 0.3, 0.6, -zS + 0.4, -0.8); }
      person(x, 'cook', { top: '#5a4a6a', bottom: '#3a3a4a', hair: P.hair, long: true, h: 1.56 }, -W / 2 + 0.6, 1.8, PI / 2);
      for (let i = 0; i < 2; i++) lamp(x, H.pendant({ kind: 'washi', power: 3.2, len: 0.35 }), 0, 2.4, rows[i]);
      S.fill(x.g, x.fills, 0, 2.0, 0, 6, 8);
      clockAt(x, W / 2 - 0.04, 2.0, 1.4, -PI / 2);
      H.outside(x.g, c, zS, r, x.out, /海|港|岬|島/.test(t + (c.cause ? c.cause.place : '')) || sub === 'minshuku' ? 'harbor' : 'rural');
      const my = seats[4];
      details(x, Object.assign(slot, { table: [my[0] + 0.1, 0.34, my[1] - 0.6] }));
      spot(x, '窓の外の海', [0, 1.4, zS + 6]); spot(x, '座卓', [0, 0.4, rows[1]]); spot(x, '座布団', [my[0], 0.1, my[1]]);
      return finish(x, { label: sub === 'ryokan' ? '宿の食事どころ' : '民宿の食堂', anchors: { sit: { p: [my[0], 0.74, my[1]], look: [my[0], 0.6, my[1] + (my[2] ? -2 : 2)], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit', ground: 0 }, stand: { p: [0, 1.52, zS - 0.7], look: [0, 1.0, 0], lim: { yaw: 160, up: 55, down: 55 }, body: 'stand' } },
        body: { sit: { sleeve: '#7d8794', legs: '#4a4f5c' }, stand: { sleeve: '#7d8794' } }, companion: { sit: { p: [my[0] + 0.83, 0, my[1]], ry: my[2], pose: 'seiza' }, stand: { p: [1.0, 0, zS - 0.9], ry: PI, pose: 'stand' } },
        amb: { crowd: 0.35, traffic: 0, tick: 0.3 }, walk: { y: 0, rects: [[-W / 2, -zS, W / 2, zS]] } });
    }
    const ski = sub === 'ski', club = sub === 'club', road = sub === 'road', gaku = sub === 'gakushoku';
    const W = 10, D = 9, Hh = 3.0;
    shell(x, { w: W, d: D, h: Hh, wallTex: ski ? wood('#a8845a', 5, 1) : noise(club ? '#e8e2d6' : '#e6e6e0'), floorTex: club ? noise('#6a4a3a', 4, 4) : tile(ski ? '#7a6a5a' : '#c6c4bc', 6, 5, 5), openings: [{ side: 'S', at: -1.5, w: 6.0, y: 0.6, h: 1.9, kind: 'window' }, { side: 'E', at: 0, w: 5.0, y: 0.6, h: 1.9, kind: 'window' }], ceil: ski ? '#8a6a4a' : '#f2f2ee' });
    const zS = x.zS, zN = -zS;
    /* 料理を受けとるカウンターと、品書きの板 */
    x.g.add(K.box(5.0, 0.95, 0.6, K.m('#d9dad6'), -2.0, 0, zN + 0.7)); x.g.add(K.box(5.0, 0.04, 0.3, H.mat.steel(), -2.0, 0.95, zN + 1.05));
    const mb = H.menuBoard(gaku ? '本日の定食' : (ski ? 'メニュー' : 'お品書き'), H.dishes(t).concat(H.MENU.big), 3.2, 0.9, { lit: true, bg: '#2a2a26' }); K.at(mb, -2.0, 1.6, zN + 0.02); x.g.add(mb);
    for (let i = 0; i < 2; i++) person(x, 'cook', { top: '#f4f2ee', bottom: '#3d4352', hair: P.hair, h: 1.6 }, -3.4 + i * 2.4, zN + 0.3, 0);
    if (gaku || road) { const tm = H.ticketMachine(); K.at(tm, -W / 2 + 0.4, 0, zS - 1.4, PI / 2); x.g.add(tm); spot(x, '券売機', [-W / 2 + 0.5, 1.2, zS - 1.4]); }
    const seats = [];
    for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) {
      const tx = -2.4 + i * 3.6, tz = -1.6 + k * 1.9, tb = K.table(2.4, 0.8, 0.72, K.m(gaku ? '#e8e4da' : (ski ? '#8a6a4a' : '#c8b490'), { rough: 0.5 })); K.at(tb, tx, 0, tz); x.g.add(tb);
      for (const sz of [-1, 1]) for (let q = 0; q < 3; q++) { const ch = K.chair(K.m(ski ? P.woodDark : '#6a7a8a')); K.at(ch, tx - 0.8 + q * 0.8, 0, tz + sz * 0.62, sz > 0 ? PI : 0); x.g.add(ch); seats.push([tx - 0.8 + q * 0.8, tz + sz * 0.62, sz > 0 ? PI : 0, tz]); }
    }
    seats.forEach((s, i) => { if (i === 6 || i === 7 || r() < 0.62) return; person(x, 'customer', Object.assign({ pose: 'sit', seat: 0.44 }, look(x)), s[0], s[1] + (s[2] ? -0.04 : 0.04), s[2]); });
    if (ski) { const sv = H.stove(); sv.scale.setScalar(1.3); K.at(sv, 3.6, 0, zN + 1.0); x.g.add(sv); for (let i = 0; i < 5; i++) x.g.add(K.box(0.12, 0.2, 0.03, K.m(U.pick(r, ['#c8392b', '#2f3b55', '#2a2a2a', '#d9a23c'])), 3.3 + i * 0.15, 1.2, zN + 0.62)); x.g.add(K.rod([3.2, 1.42, zN + 0.62], [4.1, 1.42, zN + 0.62], 0.006, K.m(P.dark))); spot(x, '干した手袋', [3.6, 1.3, zN + 0.62]); }
    if (club) { const sp = K.seasonal(c); const gr = K.ground(200, sp.grass, -0.05, 40); x.g.add(gr); const pond = K.water(14, 8, P.water); K.at(pond, 10, -0.03, 8); x.g.add(pond); g2ridge(x, sp); }
    else if (ski) { const gr = K.ground(200, P.snow, -0.05, 40); x.g.add(gr); x.g.add(K.ridge({ r: 120, hMin: 30, hMax: 70, color: '#e8eef2', seed: c.seed + 6, n: 30 })); }
    else if (gaku) { const sp = K.seasonal(c); const gr = K.ground(200, sp.grass, -0.05, 40); x.g.add(gr); for (let i = 0; i < 6; i++) { const tr = K.tree ? K.tree({ seed: c.seed + i, h: 7, season: c.season, weather: c.weather }) : null; if (tr) { K.at(tr, -14 + i * 6, 0, zS + 8 + (i % 2) * 3); x.g.add(tr); } } const bd = K.building(14, 12, 10, '#c4bcae', c.seed); K.at(bd, 18, 0, -4); x.g.add(bd); }
    else H.outside(x.g, c, zS, r, x.out, 'road');
    for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) lamp(x, H.panel(1.2, 0.35, !ski), -3 + i * 3, Hh, -1.5 + k * 3);
    S.fill(x.g, x.fills, -2, Hh - 0.4, -1, 12, 10); S.fill(x.g, x.fills, 2.5, Hh - 0.4, 1.5, 10, 10);
    clockAt(x, W / 2 - 0.04, 2.3, -2.6, -PI / 2);
    const my = seats[6];
    details(x, Object.assign(slot, { table: [my[0] + 0.1, 0.72, my[3]], floor: [-W / 2 + 0.6, 0, 1.5], door: [-W / 2 + 0.4, 0, zS - 0.4] }));
    spot(x, '窓の外', [W / 2, 1.6, 0]); spot(x, '品書きの板', [-2.0, 2.0, zN + 0.1]); spot(x, '料理のカウンター', [-2.0, 1.1, zN + 0.8]);
    return finish(x, { label: gaku ? '学生食堂' : (ski ? 'ゲレンデの食堂' : (club ? 'クラブハウスの食堂' : 'サービスエリアの食堂')), shadow: 14,
      anchors: { sit: { p: [my[0], 1.15, my[1]], look: [my[0], 1.0, my[3] + (my[2] ? -3 : 3)], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' }, stand: { p: [0, 1.55, zS - 1.0], look: [-2, 1.2, zN], lim: { yaw: 160, up: 55, down: 55 }, body: 'stand' } },
      body: { sit: { sleeve: ski ? '#c8392b' : '#7d8794', legs: '#4a4f5c' }, stand: { sleeve: ski ? '#c8392b' : '#7d8794' } },
      companion: { sit: { p: [my[0] + 0.8, 0, my[1]], ry: my[2], pose: 'sit', seat: 0.44 }, stand: { p: [1.0, 0, zS - 1.2], ry: PI, pose: 'stand' } },
      amb: { crowd: 0.7, traffic: road ? 0.4 : 0.05, tick: 0.2 }, walk: { y: 0, rects: [[-W / 2, -zS, W / 2, zS]] }, weatherBox: [[-14, -0.1, zS + 0.4], [16, 10, zS + 14]] });
  }

  /* ================= 通路の店（スーパー・コンビニ・ドラッグストア・ホームセンター・直売所・冷凍庫） ================= */
  function aisle(x) {
    const c = x.c, r = x.rng, sub = x.sub, t = x.text, look = customerLook, slot = {};
    if (sub === 'freezer') {
      const W = 3.0, D = 4.2, Hh = 2.4;
      shell(x, { w: W, d: D, h: Hh, wall: '#e8eef2', floorTex: tile('#a9b0b4', 6, 2, 3), ceil: '#e8eef2', base: false, openings: [] });
      const zS = x.zS;
      for (const sx of [-1, 1]) { const ws = H.wallShelf(D - 1.0, 1.9, 'icecream', 3 + (sx > 0 ? 1 : 0), { rows: 4, depth: 0.5, board: '#b9bec2', back: '#d9e2e6' }); K.at(ws, sx * (W / 2 - 0.27), 0, -0.4, sx > 0 ? -PI / 2 : PI / 2); x.g.add(ws); }
      const ws2 = H.wallShelf(W - 1.2, 1.9, 'icecream', 6, { rows: 4, depth: 0.5, board: '#b9bec2', back: '#d9e2e6' }); K.at(ws2, 0, 0, -zS + 0.27); x.g.add(ws2);
      const door = new T.Group(); door.add(K.box(1.0, 2.0, 0.08, K.m('#c6ccd0', { metal: 0.3, rough: 0.4 }), 0, 0, 0)); door.add(K.box(0.7, 0.05, 0.08, K.m('#c8392b'), 0, 1.0, -0.08)); K.at(door, 0, 0, zS - 0.04); x.g.add(door); spot(x, '扉の押し棒', [0, 1.0, zS - 0.15]);
      for (let i = 0; i < 2; i++) lamp(x, H.panel(0.6, 0.2), 0, Hh, -1 + i * 1.6);
      const cold = new T.PointLight(0xcfe4ff, 3.2, 7, 1.5); cold.position.set(0, 2.1, 0); x.g.add(cold);
      for (let i = 0; i < 4; i++) steamAt(x, -0.8 + i * 0.5, 0.05, -1.2 + (i % 2) * 1.4, { n: 10, spread: 0.25, h: 0.4, alpha: 0.12, size: 0.6, speed: 0.06 });
      for (let i = 0; i < 6; i++) x.g.add(H.cardboard(0.4, 0.3, 0.3).translateX(-0.9 + (i % 3) * 0.4).translateY(Math.floor(i / 3) * 0.3).translateZ(-1.6));
      spot(x, '奥の棚', [0, 1.2, -zS + 0.3]); spot(x, '積んだ箱', [-0.5, 0.5, -1.6]);
      details(x, slot); x.outsideDone = true;
      return finish(x, { label: '冷凍庫の中', shadow: 6, amb: { machine: 0.9 }, anchors: { stand: { p: [0, 1.52, 0.6], look: [0, 1.2, -zS], lim: { yaw: 170, up: 55, down: 55 }, body: 'stand' } },
        body: { stand: { sleeve: '#3a4a6a' } }, companion: { stand: { p: [0.6, 0, 0], ry: PI, pose: 'stand' } }, walk: { y: 0, rects: [[-W / 2, -zS, W / 2, zS]] }, weatherBox: [[-1, 0, zS + 8], [1, 1, zS + 9]], dustBox: [[-1, 0.2, -1.5], [1, 2, 1.5]] });
    }
    const konbini = sub === 'konbini', drug = sub === 'drug', home = sub === 'home', michi = sub === 'michi', sup = sub === 'super';
    const W = konbini ? 8 : (home ? 16 : (michi ? 10 : (drug ? 10 : 14))), D = konbini ? 7.5 : (home ? 14 : (michi ? 8 : (drug ? 10 : 12))), Hh = home ? 4.8 : (michi ? 3.0 : 3.1);
    const floorTex = home ? noise('#8f8f8a', 6, 6) : (michi ? wood('#9a7552', 6, 4) : tile(drug || konbini ? '#f0efe9' : '#dcd9cf', 8, 6, 6));
    shell(x, { w: W, d: D, h: Hh, wallTex: michi ? wood('#c8a67c', 6, 1) : noise('#efede6'), floorTex, floorRough: 0.55, ceil: '#f2f2ee', base: false,
      openings: [{ side: 'S', at: -W / 4, w: W / 2 - 0.6, y: 0, h: 2.3, kind: 'window' }, { side: 'S', at: W / 4 + 0.3, w: W / 2 - 1.4, y: 0.7, h: 1.6, kind: 'window' }] });
    const zS = x.zS, zN = -zS;
    const name = H.name(sub, r);
    frontSign(x, name, { w: Math.min(W - 1, 4), h: 0.6, y: Hh - 0.75, bg: konbini ? '#ffffff' : (drug ? '#2f6db5' : (home ? '#3f7a3a' : (michi ? '#f4f0e6' : '#c8392b'))), fg: konbini ? '#2f6db5' : (michi ? '#2a2622' : '#ffffff'), font: michi ? 'mincho' : 'gothic', lit: true });
    if (konbini) { const st = H.vplane(W, 0.18, H.texMat(H.stripeTex('#2f9a5a', '#2f6db5', 2)), 0, Hh - 0.2, zS + 0.09); x.g.add(st); }
    /* 棚の列 */
    const gType = drug ? 'boxes' : (home ? 'hardware' : (michi ? 'souvenir' : (konbini ? 'snack' : 'packs')));
    const gH = home ? 2.6 : (konbini ? 1.5 : 1.6), gLen = konbini ? 3.2 : (home ? 8 : (michi ? 3.6 : (drug ? 5 : 6))), gz = konbini ? -0.6 : (drug ? -0.3 : -0.8);
    const lanes = konbini ? [-1.2, 0.6] : (home ? [-5, -2, 1, 4] : (michi ? [-1.5, 1.5] : [-3, 0, 3]));
    lanes.forEach((lx, i) => { const go = H.gondola(gLen, gH, home ? 1.0 : 0.9, gType, (c.seed || 1) + i, { header: sup || drug || home ? U.pick(r, sup ? ['調味料', '日用品', 'お菓子', '乾物'] : (drug ? ['かぜ薬', '洗剤', '化粧品', 'くすり'] : ['電材', '園芸', '工具', '塗料'])) : null, headerBg: drug ? '#2f6db5' : (home ? '#3f7a3a' : '#c8392b') }); K.at(go, lx, 0, gz, PI / 2); x.g.add(go); });
    if (home) for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) x.g.add(H.cardboard(0.7, 0.5, 0.6).translateX(lanes[i]).translateY(gH + 0.1).translateZ(-3 + k * 2.2));
    /* 奥の壁の冷蔵ケース */
    if (!home) { const cl = H.cooler(konbini ? W - 1.4 : (drug ? 4 : W - 3), 1.9, 'drinks', c.seed || 2); K.at(cl, konbini ? 0.4 : (drug ? -2 : 0), 0, zN + 0.36); x.g.add(cl); spot(x, '冷蔵ケース', [drug ? -2 : 0, 1.2, zN + 0.6]); }
    else { const ws = H.wallShelf(W - 2, 2.8, 'tools', 3, { rows: 4, depth: 0.5, board: '#d9a23c', back: '#c9a77a' }); K.at(ws, 0, 0, zN + 0.3); x.g.add(ws); spot(x, '工具の棚', [0, 1.4, zN + 0.4]); }
    /* 魚・肉の平台（スーパー）、野菜の台（スーパー・直売所） */
    if (sup) { const fc = H.coldCase(5.0, 'fish', 5); K.at(fc, -W / 2 + 0.55, 0, -0.5, PI / 2); x.g.add(fc); const mc = H.coldCase(3.0, 'meat', 7); K.at(mc, -W / 2 + 0.55, 0, 3.7, PI / 2); x.g.add(mc); spot(x, '魚の売り場', [-W / 2 + 0.6, 1.0, -0.5]); const sg = H.sign('鮮魚', 1.0, 0.36, { bg: '#2f6db5', fg: '#ffffff' }); K.at(sg, -W / 2 + 0.6, 2.2, -0.5, PI / 2); x.g.add(sg); const sg2 = H.sign('精肉', 1.0, 0.36, { bg: '#c8392b', fg: '#ffffff' }); K.at(sg2, -W / 2 + 0.6, 2.2, 3.2, PI / 2); x.g.add(sg2); }
    if (sup || michi) { const vd = H.stepDisplay(michi ? 3.2 : 3.6, 'veg', (c.seed || 1) + 3, 3); K.at(vd, michi ? 0 : 3.6, 0, zS - 1.6); x.g.add(vd); spot(x, '野菜の台', [michi ? 0 : 3.6, 1.0, zS - 1.9]); if (michi) { const vd2 = H.stepDisplay(2.4, 'veg', (c.seed || 1) + 9, 2); K.at(vd2, -W / 2 + 0.8, 0, 0.5, PI / 2); x.g.add(vd2); for (let i = 0; i < 6; i++) { const pc = H.priceCard(U.pick(r, ['百円', '百五十円', '二百円', '朝どれ'])); K.at(pc, -0.8 + i * 0.32, 0.95, zS - 1.6); x.g.add(pc); } } }
    if (home) { for (let i = 0; i < 14; i++) { const pl = H.plant(0.5 + r() * 0.3, '#3a3a3a', U.pick(r, [P.leaf, P.leafLight, '#6a8f3a'])); K.at(pl, 3 + (i % 7) * 0.6, 0, zS - 1.5 - Math.floor(i / 7) * 0.7); x.g.add(pl); } x.g.add(K.box(0.6, 2.2, 5, K.m('#c9a46e'), -W / 2 + 0.4, 0, 1.5)); if (/照明/.test(t)) { for (let i = 0; i < 6; i++) lamp(x, H.pendant({ kind: i % 2 ? 'glass' : 'cone', power: i < 2 ? 1.8 : 0, len: 0.6 }), -W / 2 + 1.6 + i * 0.7, 2.6, zN + 1.4); spot(x, '照明の売り場', [-W / 2 + 3.0, 1.9, zN + 1.4]); } }
    if (drug) { x.g.add(K.box(3.0, 1.0, 0.6, K.m('#f2f2ee'), W / 2 - 2.2, 0, zN + 0.9)); const sg = H.sign('調剤', 1.2, 0.36, { bg: '#2f9a5a', fg: '#ffffff' }); K.at(sg, W / 2 - 2.2, 2.2, zN + 0.1); x.g.add(sg); person(x, 'clerk', { top: '#f2f2ee', bottom: '#3d4352', long: true }, W / 2 - 2.2, zN + 0.4, 0); spot(x, '調剤の窓口', [W / 2 - 2.2, 1.2, zN + 0.9]); }
    /* レジ */
    const regX = konbini ? W / 2 - 1.2 : -W / 2 + 2.2, regs = konbini ? 1 : (michi ? 1 : 3);
    for (let i = 0; i < regs; i++) {
      const rx = konbini ? regX : regX + i * 1.6, rz = konbini ? zS - 2.4 : zS - 2.0;
      if (konbini) { x.g.add(K.box(0.6, 0.95, 2.4, K.m('#e6e6e2'), rx, 0, rz)); const rg = H.register('#3a3b40'); K.at(rg, rx, 0.95, rz - 0.6, -PI / 2); x.g.add(rg); const hc = H.showcase(0.6, 0.5, 'fried', 8, { depth: 0.4, tilt: 0 }); K.at(hc, rx, 0.95, rz + 0.5, PI / 2); x.g.add(hc); spot(x, 'レジ', [rx, 1.1, rz - 0.6]); }
      else { x.g.add(K.box(1.0, 0.85, 0.55, K.m('#e6e6e2'), rx, 0, rz)); const rg = H.register('#3a3b40'); K.at(rg, rx, 0.85, rz - 0.1); x.g.add(rg); x.g.add(K.box(0.6, 0.12, 0.4, K.m('#c8392b'), rx + 0.62, 0.7, rz)); if (i === 0) spot(x, 'レジ', [rx, 1.1, rz]); }
      person(x, 'clerk', { top: konbini ? '#2f6db5' : (drug ? '#f2f2ee' : (home ? '#3f7a3a' : (michi ? '#e8e4da' : '#c8392b'))), bottom: '#2a2a2a', hair: P.hair, h: 1.6 }, konbini ? rx + 0.55 : rx, konbini ? rz : rz - 0.55, konbini ? -PI / 2 : 0);
    }
    if (konbini) { const mr = H.wallShelf(4.0, 1.0, 'snack', 12, { rows: 2, depth: 0.3, board: '#d9dad6', back: '#e6e6e2' }); K.at(mr, -W / 4, 0, zS - 0.3, PI); x.g.add(mr); spot(x, '雑誌の棚', [-W / 4, 0.8, zS - 0.3]); }
    if (!konbini) for (let i = 0; i < 3; i++) x.g.add(K.box(0.42, 0.22, 0.32, K.m('#c8392b', { rough: 0.5 }), -W / 2 + 0.6, i * 0.2, zS - 0.6));
    /* ほかの客 */
    for (let i = 0; i < (konbini ? 1 : 3); i++) person(x, 'customer', look(x), lanes[i % lanes.length] + 0.9, -1.2 + i * 1.3, r() * 6);
    /* 天井の明かり */
    for (let i = 0; i < Math.round(W / 3); i++) for (let k = 0; k < Math.round(D / 3); k++) lamp(x, H.panel(1.4, 0.3, !michi), -W / 2 + 1.5 + i * 3, Hh, -D / 2 + 1.5 + k * 3);
    S.fill(x.g, x.fills, -W / 4, Hh - 0.4, -D / 4, 14, W * 0.8); S.fill(x.g, x.fills, W / 4, Hh - 0.4, D / 4, 14, W * 0.8);
    clockAt(x, W / 2 - 0.04, 2.4, 0, -PI / 2);
    /* 自分の立つ所: レジの列、魚の売り場、野菜の台、棚のあいだ */
    let A;
    const regLine = konbini ? [regX - 0.7, zS - 2.8] : [regX, zS - 1.2];
    if (x.staff) A = { stand: { p: [lanes[0] + 0.95, 1.52, 0.4], look: [lanes[0] + 0.5, 1.0, -0.4], lim: { yaw: 170, up: 60, down: 60 }, body: 'stand' } };
    else if (/レジ/.test(t) && konbini) A = { stand: { p: [regX - 0.85, 1.52, zS - 3.0], look: [regX, 1.1, zS - 3.0], lim: { yaw: 170, up: 55, down: 55 }, body: 'stand' } };
    else if (/レジ/.test(t)) { A = { stand: { p: [regLine[0], 1.52, regLine[1] + 0.9], look: [regLine[0], 1.2, regLine[1] - 1.5], lim: { yaw: 170, up: 55, down: 55 }, body: 'stand' } }; person(x, 'customer', look(x), regLine[0], regLine[1], PI); }
    else if (sup && /鮮魚|えび|刺身|魚/.test(t)) A = { stand: { p: [-W / 2 + 1.7, 1.52, -0.5], look: [-W / 2, 0.9, -0.5], lim: { yaw: 170, up: 55, down: 60 }, body: 'stand' } };
    else if (michi && /冷え|ドリンク|ジュース|缶の/.test(t)) A = { stand: { p: [0.3, 1.52, zN + 1.5], look: [0.3, 1.1, zN], lim: { yaw: 170, up: 55, down: 60 }, body: 'stand' } };
    else if (michi || (sup && /桃|枝豆|野菜|なす|わらび|苗|豆腐|ねぎ|キャベツ/.test(t))) A = { stand: { p: [michi ? 0 : 3.6, 1.52, zS - 0.5], look: [michi ? 0 : 3.6, 0.8, zS - 2.2], lim: { yaw: 170, up: 55, down: 60 }, body: 'stand' } };
    else A = { stand: { p: [lanes[0] + 0.95, 1.52, 0.6], look: [lanes[0] + 0.5, 1.0, -1.2], lim: { yaw: 170, up: 55, down: 60 }, body: 'stand' } };
    A.walk = null; delete A.walk;
    if (x.staff && /脚立/.test(t)) { const ld = new T.Group(); for (const sx of [-1, 1]) ld.add(K.rod([sx * 0.22, 0, 0.3], [sx * 0.18, 1.6, 0], 0.02, K.m(P.steel, { metal: 0.6 }))); for (let i = 1; i < 5; i++) ld.add(K.box(0.4, 0.03, 0.12, K.m(P.steel, { metal: 0.6 }), 0, i * 0.32, 0.3 - i * 0.07)); K.at(ld, lanes[0] + 0.6, 0, 1.2); x.g.add(ld); spot(x, '脚立', [lanes[0] + 0.6, 1.0, 1.2]); }
    if (/掲示板/.test(t)) { const lines = /チェーン/.test(t) ? ['お知らせ', '峠の先は', 'チェーン規制'] : ['お知らせ', '朝市は日曜', '午前七時から']; const bb = H.sign(lines, 0.9, 0.7, { bg: '#f4f0e6', fg: '#2a2622', frame: '#5c4531' }); K.at(bb, W / 2 - 0.02, 1.2, zS - 1.6, -PI / 2); x.g.add(bb); spot(x, '掲示板', [W / 2 - 0.05, 1.55, zS - 1.6]); }
    if (/新米の袋/.test(t)) for (let i = 0; i < 6; i++) x.g.add(K.box(0.4, 0.12, 0.6, K.m('#f2efe2'), lanes[0] + 1.3, i * 0.12, 0.2 + (i % 2) * 0.05));
    Object.assign(slot, { door: [-W / 4 + 1.2, 0, zS - 0.5], floor: null, counter: [regX + 0.2, 0.9, zS - 2.0] });
    details(x, slot);
    H.outside(x.g, c, zS, r, x.out, michi ? 'road' : (/海/.test(t) ? 'harbor' : 'town'));
    spot(x, '棚', [lanes[0], 1.2, 0]); spot(x, '窓の外', [-W / 4, 1.4, zS]);
    return finish(x, { label: konbini ? 'コンビニ' : (drug ? 'ドラッグストア' : (home ? 'ホームセンター' : (michi ? (/農協/.test(t) ? '農協の売店' : (/道の駅/.test(t) ? '道の駅' : '直売所')) : 'スーパー'))), shadow: home ? 16 : 12, anchors: A,
      body: { stand: { sleeve: x.staff ? (sup ? '#c8392b' : '#5a6a7a') : '#7d8794' }, sit: { sleeve: '#7d8794', legs: '#4a4f5c' } }, companion: { stand: { p: [A.stand.p[0] + 0.6, 0, A.stand.p[2] + 0.4], ry: PI, pose: 'stand' } },
      amb: { crowd: konbini ? 0.2 : 0.5, machine: 0.4, traffic: 0.15 }, walk: { y: 0, rects: [[-W / 2, -zS, W / 2, zS]] }, center: [0, 0, 0], weatherBox: [[-16, -0.1, zS + 0.4], [16, 10, zS + 14]], dustBox: [[-3, 0.5, -2], [3, 2.5, 2]] });
  }

  /* ================= 表が開いた店（魚屋・八百屋・肉屋・惣菜・豆腐・和菓子・パン・酒・花・茶・金物・釣具・古い商店・荒物） ================= */
  function front(x) {
    const c = x.c, r = x.rng, sub = x.sub, t = x.text, look = customerLook, slot = {};
    const glassFront = sub === 'pan' || sub === 'wagashi' || sub === 'furui' || sub === 'cha';
    const W = 5.2, D = sub === 'pan' ? 5.4 : 4.6, Hh = 2.6;
    const floorTex = sub === 'pan' ? wood(P.woodLight, 3, 3) : noise(sub === 'sakana' || sub === 'hana' || sub === 'tofu' ? '#7f8480' : '#8f8a80', 3, 3);
    const wallC = { sakana: '#e6eaea', yaoya: '#e2dccb', niku: '#f0eeea', sozai: '#efe9dc', tofu: '#e8e6dc', wagashi: '#e8dcc4', pan: '#efe4cf', saka: '#d9cbb0', hana: '#eef0ea', cha: '#e2d6bc', kanamono: '#cfcac0', tsurigu: '#d9d6cc', furui: '#c9b896', zakka: '#d9d0bc' }[sub] || '#e2dccb';
    const ops = glassFront ? [{ side: 'S', at: -0.6, w: 1.8, y: 0, h: 2.1, kind: 'window' }, { side: 'S', at: 1.5, w: 1.6, y: 0, h: 2.1, kind: 'window' }] : [{ side: 'S', at: 0, w: W - 0.4, y: 0, h: 2.3, kind: 'open' }];
    shell(x, { w: W, d: D, h: Hh, wallTex: noise(wallC), floorTex, floorRough: sub === 'sakana' || sub === 'hana' ? 0.35 : 0.8, ceil: '#d9d4c6', openings: ops, frame: sub === 'furui' || sub === 'wagashi' || sub === 'cha' ? P.woodDark : '#8a8f94' });
    const zS = x.zS, zN = -zS, name = H.name(sub, r);
    const awn = { sakana: ['#2f6db5', '#ffffff'], yaoya: ['#3f7a3a', '#ffffff'], niku: ['#c8392b', '#ffffff'], sozai: ['#d9a23c', '#ffffff'], saka: ['#5c4531', '#e8d9b0'], hana: ['#3f7a5a', '#ffffff'], kanamono: ['#5a5f66', '#e8e8e2'], tsurigu: ['#2f5a8a', '#ffffff'], zakka: ['#7a5a3a', '#e8d9b0'], tofu: ['#2f3b55', '#f4f0e6'] }[sub];
    if (!glassFront) { x.shutter = H.shutter(W - 0.4, 2.3); K.at(x.shutter, 0, 0, zS + 0.05); x.g.add(x.shutter); }
    if (awn) { const aw = H.awning(W, 1.0, awn[0], awn[1], name); K.at(aw, 0, 2.62, zS + 0.18); x.g.add(aw); spot(x, '日よけの看板', [0, 2.5, zS + 0.8]); }
    else frontSign(x, name, { bg: '#f4f0e6', fg: '#2a2622', font: 'mincho', y: 2.15 });
    if (sub === 'wagashi' || sub === 'tofu' || sub === 'cha') norenAt(x, sub === 'wagashi' ? ['御', '菓', '子'] : (sub === 'tofu' ? ['と', 'う', 'ふ'] : ['お', '茶']), sub === 'tofu' ? '#f4f0e6' : '#2f3b55', -0.6, 1.2);
    /* 品物 */
    let showZ = zS - 0.6, staffZ = zS - 1.6, showName = '店先の台', backName = '奥の棚', ctr = [0.8, 0.95, zN + 0.8];
    /* 小さな帳場の台とレジ（台のない店に） */
    const regStand = (px, pz) => { x.g.add(K.box(0.7, 0.9, 0.45, K.m(P.woodDark), px, 0, pz)); const rg = H.register(); K.at(rg, px - 0.1, 0.9, pz); x.g.add(rg); spot(x, 'レジ', [px, 1.05, pz]); ctr = [px + 0.22, 0.9, pz]; };
    const bulbs = () => { for (let i = 0; i < 3; i++) lamp(x, H.pendant({ kind: 'bulb', power: i === 1 ? 2.6 : 1.4, len: 0.5 }), -1.6 + i * 1.6, Hh, zS - 1.0); };
    const backShelf = (type, rows) => { const ws = H.wallShelf(W - 1.6, 1.8, type, (c.seed || 1) + 2, { rows: rows || 4, depth: 0.4 }); K.at(ws, 0.4, 0, zN + 0.22); x.g.add(ws); };
    const backDoor = () => { const nr = H.noren(['　', '　'], U.pick(r, PAL.noren), 0.8, 0.6); K.at(nr, -W / 2 + 0.7, 1.95, zN + 0.1); x.g.add(nr); x.g.add(K.box(0.84, 2.0, 0.02, K.m('#2a2622'), -W / 2 + 0.7, 0, zN + 0.01)); spot(x, '奥へののれん', [-W / 2 + 0.7, 1.4, zN + 0.1]); };
    const owner = (o) => person(x, x.staff ? null : 'shopkeeper', Object.assign({ top: '#e8e4da', bottom: '#3d4352', hair: U.pick(r, [P.hair, P.hairGray]), h: 1.6 }, o || {}), x.staff ? -W / 2 + 0.9 : 0.6, staffZ - 0.2, 0);
    if (sub === 'sakana') {
      const fd = H.fishDisplay(W - 1.2, (c.seed || 1) + 8); K.at(fd, 0, 0, showZ); x.g.add(fd); showName = '氷の上の魚';
      x.g.add(K.box(1.8, 0.88, 0.6, H.mat.steel(), 1.2, 0, zN + 0.4)); x.g.add(K.box(0.6, 0.03, 0.4, K.m('#e8e0cc'), 0.9, 0.88, zN + 0.4)); x.g.add(K.box(0.3, 0.2, 0.25, K.m(P.white), 1.9, 0.88, zN + 0.4)); spot(x, 'まな板', [0.9, 1.0, zN + 0.4]);
      for (let i = 0; i < 5; i++) { const pc = H.priceCard(U.pick(r, ['さば', 'あじ', 'いわし', 'さんま', 'ぶり', 'たい'])); K.at(pc, -1.6 + i * 0.8, 0.95, showZ + 0.3); x.g.add(pc); }
      owner({ top: '#f2f2ee', bottom: '#2f3b55' }); bulbs(); backDoor(); ctr = [1.45, 0.88, zN + 0.4];
      const pb = H.menuBoard('本日の魚', H.dishes(t).concat(['さば', 'あじ', 'いわし', 'かれい', 'ぶり']).slice(0, 5), 1.0, 0.8, { bg: '#f4f0e6', fg: '#2a2622', frame: '#5a5f66' }); K.at(pb, 1.2, 1.35, zN + 0.02); x.g.add(pb); spot(x, '魚の名前の板', [1.2, 1.7, zN + 0.1]);
      for (let i = 0; i < 6; i++) x.g.add(K.box(0.5, 0.22, 0.34, K.m('#f4f6f6'), -0.7 + (i % 2) * 0.52, Math.floor(i / 2) * 0.22, zN + 0.3));
      const ice = new T.Group(); ice.add(K.box(0.7, 1.1, 0.6, K.m('#d9dde0', { metal: 0.3, rough: 0.4 }), 0, 0, 0)); ice.add(K.box(0.4, 0.2, 0.02, K.m('#3a4a5a'), 0, 0.75, 0.31)); K.at(ice, W / 2 - 0.45, 0, -0.4, -PI / 2); x.g.add(ice);
      for (const sx of [-1, 1]) x.g.add(K.box(0.11, 0.38, 0.26, K.m('#1e2228', { rough: 0.4 }), -W / 2 + 0.9 + sx * 0.07, 0, zN + 0.5));
      const hose = new T.Mesh(new T.TorusGeometry(0.16, 0.015, 6, 20), K.m('#3a7a4a')); hose.position.set(-W / 2 + 0.05, 1.2, 0.2); hose.rotation.y = PI / 2; x.g.add(hose);
    } else if (sub === 'yaoya') {
      const vd = H.stepDisplay(W - 1.2, 'veg', (c.seed || 1) + 6, 3); K.at(vd, 0, 0, showZ + 0.1); x.g.add(vd); showName = '野菜の台';
      for (let i = 0; i < 6; i++) x.g.add(H.cardboard(0.5, 0.32, 0.4).translateX(0.1 + (i % 3) * 0.55).translateY(Math.floor(i / 3) * 0.32).translateZ(zN + 0.5));
      regStand(W / 2 - 0.7, zN + 0.9);
      const zr = K.cyl(0.13, 0.06, K.m('#c9a46e'), 0.4, 1.6, zS - 1.6, { seg: 14, open: true }); x.g.add(zr); x.g.add(K.rod([0.4, 1.66, zS - 1.6], [0.4, Hh, zS - 1.6], 0.004, K.m(P.dark))); spot(x, 'つり銭のざる', [0.4, 1.6, zS - 1.6]);
      for (let i = 0; i < 6; i++) { const pc = H.priceCard(U.pick(r, ['百円', '三本百円', '二百円', '一盛'])); K.at(pc, -1.8 + i * 0.7, 0.75, showZ + 0.25); x.g.add(pc); }
      owner({ top: '#3f5a48', bottom: '#3d4352' }); bulbs(); backDoor();
    } else if (sub === 'niku' || sub === 'sozai') {
      const sc = H.showcase(W - 2.4, 1.1, sub === 'niku' ? 'meat' : 'fried', (c.seed || 1) + 4, { depth: 0.65, cold: sub === 'niku' }); K.at(sc, -0.7, 0, showZ); x.g.add(sc);
      const hc = H.showcase(1.4, 1.1, 'fried', (c.seed || 1) + 5, { depth: 0.65 }); K.at(hc, W / 2 - 0.9, 0, showZ); x.g.add(hc); showName = sub === 'niku' ? '肉のケース' : 'おかずのケース';
      x.g.add(K.box(1.2, 0.9, 0.6, H.mat.steel(), 1.2, 0, zN + 0.4)); const fr = K.box(0.5, 0.06, 0.4, K.m('#c99a3a', { rough: 0.2 }), 1.2, 0.9, zN + 0.4); x.g.add(fr); steamAt(x, 1.2, 0.96, zN + 0.4, { alpha: 0.07, h: 0.5 }); spot(x, '揚げ物の鍋', [1.2, 1.0, zN + 0.4]);
      const menu = H.dishes(t).concat(sub === 'niku' ? ['コロッケ', 'メンチカツ', 'とんかつ', '牛こま', '豚ばら'] : ['コロッケ', '白身フライ', 'からあげ', '煮物', 'ポテトサラダ', 'のり弁']).slice(0, 6);
      const mb = H.menuBoard('おしながき', menu, 1.6, 0.9, { bg: '#f4f0e6', fg: '#c8291c', frame: P.woodDark }); K.at(mb, -0.8, 1.35, zN + 0.02); x.g.add(mb);
      owner({ top: '#f4f2ee', bottom: '#f4f2ee' }); ctr = [0.75, 0.9, zN + 0.4];
      for (let i = 0; i < 3; i++) lamp(x, H.panel(1.0, 0.25), -1.6 + i * 1.6, Hh, zS - 1.2);
    } else if (sub === 'tofu') {
      const tank = new T.Group(), stm2 = H.mat.steel(); tank.add(K.box(2.0, 0.1, 0.7, stm2, 0, 0, 0)); for (const sz of [-1, 1]) tank.add(K.box(2.0, 0.8, 0.04, stm2, 0, 0, sz * 0.33)); for (const sx of [-1, 1]) tank.add(K.box(0.04, 0.8, 0.7, stm2, sx * 0.98, 0, 0)); tank.add(K.box(1.92, 0.6, 0.62, K.m('#9ab8c0', { rough: 0.3 }), 0, 0.1, 0)); const wt = K.plane(1.9, 0.6, K.m('#c8e0e6', { transparent: true, opacity: 0.3, rough: 0.2 }), 0, 0.78, 0); K.noAO(wt); tank.add(wt); for (let i = 0; i < 8; i++) tank.add(K.box(0.2, 0.08, 0.14, K.m('#f6f4ec', { rough: 0.6 }), -0.75 + (i % 4) * 0.5, 0.71, -0.15 + Math.floor(i / 4) * 0.3)); K.at(tank, 0.4, 0, showZ); x.g.add(tank); showName = '豆腐の水槽';
      const stm = new T.Group(); stm.add(K.box(0.6, 0.9, 0.5, K.m(P.woodDark), 0, 0, 0)); stm.add(K.box(0.56, 0.2, 0.46, K.m(P.woodLight), 0, 0.9, 0)); K.at(stm, -1.6, 0, zS - 0.3); x.g.add(stm); steamAt(x, -1.6, 1.12, zS - 0.3, { n: 16, spread: 0.1, h: 0.9, alpha: 0.12 }); spot(x, '蒸し器', [-1.6, 1.2, zS - 0.3]);
      owner({ top: '#f4f2ee', bottom: '#2f3b55' }); bulbs(); backDoor(); regStand(W / 2 - 0.7, zN + 0.9);
    } else if (sub === 'wagashi') {
      const sc = H.showcase(W - 1.8, 0.9, 'sweets', (c.seed || 1) + 3, { depth: 0.6, base: '#5c4531', tilt: 0.1 }); K.at(sc, 0.2, 0, zS - 1.6); x.g.add(sc); showName = '菓子のケース'; staffZ = zS - 2.4;
      backShelf('gifts', 3); const kd = K.box(0.5, 0.3, 0.3, K.m(P.woodLight), 0, 2.15, zN + 0.2); x.g.add(kd);
      owner({ top: '#f2efe6', bottom: '#2a2a3a' }); for (let i = 0; i < 2; i++) lamp(x, H.pendant({ kind: 'washi', power: 2.4, len: 0.4 }), -0.8 + i * 1.8, Hh, -0.2);
      if (/菓子折り|のし/.test(t)) { for (let i = 0; i < 3; i++) x.g.add(K.box(0.36, 0.1, 0.26, K.m('#f4f0e6'), -1.2 + i * 0.4, 0.92, zS - 1.6)); spot(x, '菓子折り', [-0.8, 1.0, zS - 1.6]); }
      ctr = [1.3, 0.92, zS - 1.6];
    } else if (sub === 'pan') {
      for (const sx of [-1, 1]) {
        const ws = H.wallShelf(D - 2.2, 1.7, 'bread', (c.seed || 1) + (sx > 0 ? 3 : 1), { rows: 3, depth: 0.45, board: P.woodLight, goods: false }); K.at(ws, sx * (W / 2 - 0.25), 0, -0.4, sx > 0 ? -PI / 2 : PI / 2); x.g.add(ws);
        for (let lv = 1; lv <= 2; lv++) for (let k = 0; k < 5; k++) {
          const zz = -0.4 - (D - 2.2) / 2 + 0.35 + k * ((D - 2.2 - 0.7) / 4), yy = lv * (1.7 - 0.03) / 3 + 0.03, xx = sx * (W / 2 - 0.25);
          x.g.add(K.box(0.36, 0.015, 0.5, K.m('#c9a46e', { rough: 0.8 }), xx, yy, zz));
          const bc = U.pick(r, ['#b8762e', '#c98a3e', '#d9a35a', '#a8622a']), shape = r();
          for (let q = 0; q < 4; q++) x.g.add(K.sph(0.05, K.m(bc, { rough: 0.7 }), xx + (q % 2 ? 0.08 : -0.08), yy + 0.04, zz + (q < 2 ? -0.1 : 0.1), { s: shape < 0.4 ? [1.6, 0.6, 0.8] : (shape < 0.7 ? [1, 0.7, 1] : [1.2, 0.5, 1.2]) }));
          if (r() < 0.5) { const pc = H.priceCard(U.pick(r, ['百八十円', '二百円', '百五十円', '二百二十円'])); pc.scale.setScalar(0.8); K.at(pc, xx - sx * 0.15, yy, zz + 0.2, sx > 0 ? -PI / 2 : PI / 2); x.g.add(pc); }
        }
      }
      const tb = K.table(1.4, 0.8, 0.8, K.m(P.woodLight)); K.at(tb, 0, 0, 0.2); x.g.add(tb);
      for (let i = 0; i < 12; i++) x.g.add(K.sph(0.06, K.m(U.pick(r, ['#b8762e', '#c98a3e', '#d9a35a']), { rough: 0.7 }), -0.55 + (i % 6) * 0.22, 0.83, 0.0 + Math.floor(i / 6) * 0.35, { s: [1, 0.6, 1.2] }));
      x.g.add(K.box(0.5, 0.95, 0.4, K.m(P.woodDark), -1.2, 0, zS - 0.6)); for (let i = 0; i < 6; i++) x.g.add(K.box(0.36, 0.01, 0.28, K.m('#c9a46e'), -1.2, 0.95 + i * 0.012, zS - 0.6)); spot(x, 'トレイとトング', [-1.2, 1.0, zS - 0.6]);
      x.g.add(K.box(1.4, 0.95, 0.55, K.m(P.woodDark), 1.3, 0, zN + 0.9)); const rg = H.register(); K.at(rg, 1.3, 0.95, zN + 0.9); x.g.add(rg); spot(x, 'レジ', [1.3, 1.1, zN + 0.9]);
      showName = 'パンの棚'; staffZ = zN + 0.5; showZ = -0.4;
      if (/値札/.test(t)) for (let i = 0; i < 6; i++) { const pc = H.priceCard(U.pick(r, ['百八十円', '二百円', '百五十円', '二百二十円'])); K.at(pc, -W / 2 + 0.4, 0.55 + (i % 3) * 0.55, -1.5 + Math.floor(i / 3) * 1.2); x.g.add(pc); }
      owner({ top: '#e8d9b0', bottom: '#5c4531' }); ctr = [0.85, 0.95, zN + 0.9]; for (let i = 0; i < 3; i++) lamp(x, H.pendant({ kind: 'glass', power: 2.2, len: 0.45 }), -1.0 + i * 1.0, Hh, -0.2 + (i % 2) * 0.8);
    } else if (sub === 'saka') {
      for (let i = 0; i < 8; i++) { const cr = H.crate(U.pick(r, ['#d9b445', '#c8392b', '#2f5a8a'])); K.at(cr, -2.0 + (i % 4) * 0.5, Math.floor(i / 4) * 0.3, zS - 0.5); x.g.add(cr); } showName = 'ビールのケース';
      const cl = H.cooler(1.6, 1.9, 'drinks', 5); K.at(cl, W / 2 - 1.0, 0, zN + 0.36); x.g.add(cl);
      const ws = H.wallShelf(2.6, 1.9, 'sake', 4, { rows: 3, depth: 0.32, board: P.woodDark }); K.at(ws, -0.9, 0, zN + 0.2); x.g.add(ws); spot(x, '一升瓶の棚', [-0.9, 1.2, zN + 0.3]);
      x.g.add(K.box(0.4, 0.7, 0.03, K.m('#2f3b55', { rough: 0.9 }), W / 2 - 0.02, 0.9, 0.2)); owner({ top: '#2f3b55', bottom: '#2f3b55' }); bulbs(); regStand(W / 2 - 0.9, zN + 1.4);
    } else if (sub === 'hana') {
      const fs = H.flowerStand(10, (c.seed || 1) + 9, /白いガーベラ/.test(t)); K.at(fs, 0, 0, zS - 0.4); x.g.add(fs); showName = '花のバケツ';
      const cl = H.cooler(1.6, 1.9, 'thread', 7); K.at(cl, W / 2 - 1.0, 0, zN + 0.36); x.g.add(cl); spot(x, '花の冷蔵ケース', [W / 2 - 1.0, 1.2, zN + 0.6]);
      x.g.add(K.box(1.6, 0.85, 0.7, K.m(P.woodLight), -1.0, 0, zN + 0.8)); const roll = K.cyl(0.05, 1.0, K.m('#e8e4f0', { rough: 0.6 }), -1.4, 1.2, zN + 0.3); roll.rotation.z = PI / 2; roll.position.x = -1.0; x.g.add(roll);
      for (let i = 0; i < 4; i++) x.g.add(K.cyl(0.05, 0.05, K.m(U.pick(r, ['#c8392b', '#f6d13c', '#e85a7a', '#ffffff'])), -1.6 + i * 0.15, 0.85, zN + 0.9, { seg: 12 }));
      { const bq = new T.Group(), fr2 = U.rng((c.seed || 1) + 41); bq.add(K.cyl(0.02, 0.32, K.m(P.leafDark), 0, 0, 0, { rTop: 0.06 })); bq.children[0].rotation.z = PI / 2; bq.add(K.cyl(0.13, 0.3, K.m('#e8eef6', { transparent: true, opacity: 0.45, rough: 0.1 }), -0.2, 0, 0, { rTop: 0.03, seg: 14, open: true })); bq.children[1].rotation.z = -PI / 2;
        for (let k = 0; k < 9; k++) bq.add(K.sph(0.032, K.m(U.pick(fr2, /白いガーベラ/.test(t) ? ['#f6f6f2', '#f6f6f2', '#f2c8d8'] : ['#e85a7a', '#f6d13c', '#f6f6f2', '#f08a3a', '#c83a4a'])), -0.32 - fr2() * 0.08, 0.02 + (fr2() - 0.5) * 0.12, (fr2() - 0.5) * 0.14, { ws: 8, hs: 6 }));
        K.at(bq, -0.7, 0.9, zN + 0.75, 0.3); x.g.add(bq); spot(x, '作りかけの花束', [-0.95, 0.95, zN + 0.75]); }
      for (let i = 0; i < 6; i++) { const st2 = K.rod([-1.5 + i * 0.12, 0.86, zN + 0.65], [-1.25 + i * 0.12, 0.88, zN + 0.95], 0.004, K.m(P.leafDark), { noCast: true }); x.g.add(st2); }
      const sc2 = new T.Group(); sc2.add(K.box(0.14, 0.01, 0.02, K.m(P.steel, { metal: 0.8 }), 0, 0, 0)); sc2.add(K.box(0.07, 0.012, 0.04, K.m('#c8392b'), -0.09, 0, 0)); K.at(sc2, -0.3, 0.86, zN + 1.0, 0.4); x.g.add(sc2);
      const ws2 = H.wallShelf(1.6, 0.7, 'gifts', 4, { rows: 2, depth: 0.26, board: P.woodLight, back: '#e6e2d6' }); K.at(ws2, -1.0, 1.35, zN + 0.15); x.g.add(ws2);
      for (let i = 0; i < 4; i++) { const vs = K.vase(U.pick(r, ['#e85a7a', '#f6d13c', '#f6f6f2']), 3 + i); K.at(vs, -1.6 + i * 0.4, 1.38, zN + 0.18); x.g.add(vs); }
      spot(x, '作業台', [-1.0, 1.0, zN + 0.8]); staffZ = zN + 1.5; ctr = [-0.55, 0.85, zN + 0.75];
      owner({ top: '#4f7d5a', bottom: '#3d4352' }); for (let i = 0; i < 3; i++) lamp(x, H.panel(1.0, 0.25), -1.6 + i * 1.6, Hh, zS - 1.2);
    } else if (sub === 'cha') {
      backShelf('tins', 3); for (let i = 0; i < 3; i++) x.g.add(K.cyl(0.18, 0.5, K.m(U.pick(r, ['#5a4a3a', '#2f3b2a', '#7a5a3a']), { rough: 0.4 }), -1.6 + i * 0.5, 0, zN + 0.8, { rTop: 0.14, seg: 16 }));
      x.g.add(K.box(2.0, 0.9, 0.55, K.m(P.woodDark), 0.6, 0, zS - 1.8)); const sc = new T.Group(); sc.add(K.box(0.24, 0.06, 0.2, K.m(P.white), 0, 0, 0)); sc.add(K.cyl(0.09, 0.01, K.m(P.steel, { metal: 0.6 }), 0, 0.06, 0)); K.at(sc, 0.2, 0.9, zS - 1.8); x.g.add(sc); spot(x, '量り', [0.2, 1.0, zS - 1.8]);
      x.g.add(K.box(1.0, 0.42, 0.45, K.m(P.woodDark), -1.8, 0, 0.4)); x.g.add(K.box(1.0, 0.02, 0.45, K.m('#c8392b', { rough: 0.9 }), -1.8, 0.42, 0.4));
      showName = '茶の缶'; staffZ = zS - 2.4; ctr = [1.25, 0.9, zS - 1.8]; owner({ top: '#3f5a48', bottom: '#2a2a2a' }); for (let i = 0; i < 2; i++) lamp(x, H.pendant({ kind: 'washi', power: 2.4, len: 0.4 }), -0.8 + i * 1.8, Hh, -0.2);
      const hs = new T.Group(); hs.add(K.rod([0, 0, 0], [0.6, 0, 0], 0.012, K.m(P.dark))); const hb = H.sign(name, 0.7, 0.3, { font: 'mincho' }); K.at(hb, 0.35, -0.45, 0); hs.add(hb); K.at(hs, W / 2 - 0.7, 2.3, zS + 0.2, -PI / 2); x.g.add(hs); x.ticks.push(tt => { hb.rotation.x = Math.sin(tt * 1.7) * 0.06; }); spot(x, '看板の金具', [W / 2 - 0.4, 2.2, zS + 0.4]);
    } else if (sub === 'kanamono' || sub === 'tsurigu' || sub === 'zakka') {
      const tool = sub === 'tsurigu' ? 'lure' : (sub === 'zakka' ? 'packs' : 'tools');
      for (const sx of [-1, 1]) { const pb = H.vplane(D - 1.6, 1.8, H.texMat(H.goodsTex(tool, (c.seed || 1) + (sx > 0 ? 2 : 1))), sx * (W / 2 - 0.02), 1.1, -0.2, sx > 0 ? -PI / 2 : PI / 2); x.g.add(pb); }
      if (sub === 'tsurigu') { const rr = H.rodsRack(9, c.seed); K.at(rr, 0.4, 0, zN + 0.3); x.g.add(rr); const bf = H.cooler(1.0, 1.0, 'drinks', 9); K.at(bf, 1.8, 0, zN + 0.36); x.g.add(bf); spot(x, '釣りざおの棚', [0.4, 1.3, zN + 0.3]); spot(x, 'えさの冷蔵庫', [1.8, 0.8, zN + 0.5]); x.stoveOK = true; }
      else { for (let i = 0; i < 4; i++) x.g.add(K.cyl(0.14, 0.3, K.m(U.pick(r, ['#9aa2a6', '#3a6a9a', '#c8392b', '#e8e4da']), { metal: 0.3 }), -1.8 + i * 0.4, 0, zS - 0.5, { rTop: 0.17, seg: 14 })); for (let i = 0; i < 3; i++) { const br = new T.Group(); br.add(K.rod([0, 0, 0], [0, 1.3, 0], 0.012, K.m(P.woodLight))); br.add(K.cyl(0.02, 0.3, K.m('#c9a46e'), 0, 0, 0, { rTop: 0.1 })); K.at(br, 1.2 + i * 0.25, 0, zS - 0.3); br.rotation.z = 0.12; x.g.add(br); } for (let i = 0; i < 2; i++) { const sh = new T.Group(); sh.add(K.rod([0, 0.3, 0], [0, 1.25, 0], 0.014, K.m(P.woodLight))); sh.add(K.box(0.22, 0.3, 0.02, K.m('#7a7f86', { metal: 0.5 }), 0, 0, 0)); K.at(sh, 2.0 + i * 0.25, 0, zS - 0.6); sh.rotation.z = -0.1; x.g.add(sh); } showName = '店先の道具'; }
      x.g.add(K.box(1.6, 0.9, 0.55, K.m(P.woodDark), -0.8, 0, zN + 0.8)); const rg = H.register(); K.at(rg, -0.8, 0.9, zN + 0.8); x.g.add(rg); ctr = [-0.35, 0.9, zN + 0.8];
      if (sub !== 'tsurigu') { for (let i = 0; i < 5; i++) x.g.add(H.cardboard(0.5, 0.35, 0.4).translateX(1.4 + (i % 2) * 0.55).translateY(Math.floor(i / 2) * 0.35).translateZ(zN + 0.4)); }
      owner({ top: sub === 'tsurigu' ? '#5a6a7a' : '#7a6a5a', bottom: '#3d4352', old: r() < 0.5 }); bulbs();
      if (sub === 'tsurigu') { const tide = H.vplane(0.5, 0.7, H.texMat(H.textTex(['潮見表', '満潮', '干潮'], { w: 256, h: 340, bg: '#f4f0e6', fg: '#2f3b55', font: 'gothic' })), -1.6, 1.5, zN + 0.02); x.g.add(tide); spot(x, '潮見表', [-1.6, 1.6, zN + 0.1]); }
    } else {
      /* 古い商店（雪国・駄菓子） */
      for (let i = 0; i < 6; i++) { const jar = new T.Group(); jar.add(K.cyl(0.11, 0.24, K.m(P.glass, { transparent: true, opacity: 0.35, rough: 0.05 }), 0, 0, 0, { seg: 14 })); jar.add(K.cyl(0.09, 0.14, K.m(U.pick(r, ['#e85a7a', '#f6d13c', '#f08a3a', '#8ad0e8']), { rough: 0.6 }), 0, 0.01, 0, { seg: 12 })); jar.add(K.cyl(0.11, 0.04, K.m('#c8392b'), 0, 0.24, 0, { seg: 14 })); K.at(jar, -1.4 + (i % 3) * 0.3, 0.7, 0.5 + Math.floor(i / 3) * 0.3); x.g.add(jar); }
      x.g.add(K.box(1.2, 0.7, 0.8, K.m(P.woodDark), -1.1, 0, 0.65)); showName = '菓子のびん';
      backShelf('packs', 3); const ph = 0.4, pf = H.platform(1.8, 1.2, ph); K.at(pf, W / 2 - 1.0, 0, zN + 0.7); x.g.add(pf); x.g.add(K.box(0.7, 0.3, 0.45, K.m('#5c3a26'), W / 2 - 1.0, ph, zN + 0.7)); spot(x, '帳場', [W / 2 - 1.0, ph + 0.4, zN + 0.7]); ctr = [W / 2 - 0.85, ph + 0.3, zN + 0.7];
      staffZ = zN + 0.7; x.stoveOK = true; owner({ top: '#6a5a4a', bottom: '#3d3a36', old: true, hair: P.hairGray }); for (let i = 0; i < 2; i++) lamp(x, H.pendant({ kind: 'bulb', power: 2.0, len: 0.5 }), -0.8 + i * 1.8, Hh, -0.2);
      const cal = K.calendar(); K.at(cal, -W / 2 + 0.02, 1.4, -0.6, PI / 2); x.g.add(cal);
      staffZ = zN + 0.7;
    }
    S.fill(x.g, x.fills, 0, 2.2, 0, 6, 7);
    clockAt(x, W / 2 - 0.04, 2.05, -0.8, -PI / 2);
    if (x.stoveOK == null) x.stoveOK = c.season === 'winter';
    /* 自分の立つ所: 客は店先（表の歩道）、働く人は台のうしろ */
    let A, walkR;
    if (x.staff && sub === 'hana') A = { stand: { p: [-1.0, 1.52, zN + 1.45], look: [-1.0, 0.85, zN + 0.8], lim: { yaw: 170, up: 55, down: 62 }, body: 'stand' }, sit: { p: [W / 2 - 0.6, 1.17, zN + 0.9], look: [0, 1.0, zS + 2], lim: { yaw: 160, up: 55, down: 60 }, body: 'sit' } };
    else if (x.staff) A = { stand: { p: [glassFront ? 0.4 : -0.4, 1.52, staffZ], look: [0, 1.0, zS + 3], lim: { yaw: 170, up: 55, down: 60 }, body: 'stand' }, sit: { p: [W / 2 - 0.6, 1.17, zN + 0.9], look: [0, 1.0, zS + 2], lim: { yaw: 160, up: 55, down: 60 }, body: 'sit' } };
    else if (glassFront) A = { stand: { p: [0.2, 1.52, zS - 0.45], look: sub === 'wagashi' ? [0.2, 0.75, zS - 1.8] : [0.2, 1.1, zN], lim: { yaw: 170, up: 55, down: 60 }, body: 'stand' } };
    else A = { stand: { p: [0.3, 1.52, zS + 0.9], look: [0.0, 0.9, showZ - 0.5], lim: { yaw: 170, up: 55, down: 60 }, body: 'stand' } };
    walkR = [[-W / 2, -zS, W / 2, zS], [-W / 2 - 3, zS, W / 2 + 3, zS + 2.2]];
    if (x.staff && A.sit) { const sch = K.stool(K.m(P.woodDark), 0.45); K.at(sch, W / 2 - 0.6, 0, zN + 0.9); x.g.add(sch); }
    /* ほかの客 */
    if (x.staff || r() < 0.6) person(x, 'customer', look(x), x.staff ? 0.9 : -1.3, zS + 0.8, PI);
    Object.assign(slot, { door: [-W / 2 + 0.4, 0, zS - 0.3], out: [W / 2 - 1.2, 0, zS + 0.5], floor: [W / 2 - 0.5, 0, 0.2], counter: ctr, counter2: [ctr[0] + 0.18, ctr[1], ctr[2] + 0.05], shelf: [ctr[0] - 0.2, ctr[1], ctr[2] - 0.05], wall2: [-W / 2 + 0.02, 1.4, 0.6, PI / 2] });
    details(x, slot);
    H.outside(x.g, c, zS, r, x.out, sub === 'furui' ? (c.season === 'winter' ? 'snow' : 'town') : (sub === 'tsurigu' ? 'harbor' : 'town'));
    spot(x, showName, [0, 1.0, showZ]); spot(x, backName, [0.4, 1.3, zN + 0.3]); spot(x, '表の通り', [0, 1.4, zS + 4]);
    const LABEL = { sakana: '魚屋', yaoya: '八百屋', niku: '肉屋', sozai: '惣菜屋', tofu: '豆腐屋', wagashi: '和菓子屋', pan: 'パン屋', saka: '酒屋', hana: '花屋', cha: 'お茶の店', kanamono: '金物屋', tsurigu: '釣具屋', furui: '古い商店', zakka: '荒物屋' };
    return finish(x, { label: LABEL[sub] || '商店', anchors: A, indoor: glassFront,
      body: { stand: { sleeve: x.staff ? '#5a6a5a' : '#7d8794' }, sit: { sleeve: '#5a6a5a', legs: '#4a4f5c' } },
      companion: { stand: { p: [A.stand.p[0] + 0.7, 0, A.stand.p[2] + (x.staff ? -0.3 : 0.3)], ry: PI, pose: 'stand' }, sit: { p: [W / 2 - 1.2, 0, zN + 1.2], ry: PI, pose: 'stand' } },
      amb: { crowd: 0.35, traffic: 0.5, tick: 0.15 }, walk: { y: 0, rects: walkR }, weatherBox: [[-12, -0.1, zS + 0.6], [12, 9, zS + 13]] });
  }

  /* ================= 棚の店（本屋・古本屋・手芸・時計・眼鏡・金券） ================= */
  function shelf(x) {
    const c = x.c, r = x.rng, sub = x.sub, t = x.text, look = customerLook, slot = {};
    if (sub === 'kinken') {
      const W = 2.8, D = 3.4, Hh = 2.4;
      shell(x, { w: W, d: D, h: Hh, wallTex: noise('#e8e6e0'), floorTex: tile('#9a9a94', 4, 2, 3), openings: [{ side: 'S', at: 0, w: W - 0.4, y: 0, h: 2.1, kind: 'open' }], ceil: '#efede6' });
      const zS = x.zS, zN = -zS;
      x.shutter = H.shutter(W - 0.4, 2.1); K.at(x.shutter, 0, 0, zS + 0.05); x.g.add(x.shutter);
      frontSign(x, H.name('kinken', r), { bg: '#d9a23c', fg: '#ffffff', font: 'gothic', y: 2.0, lit: true });
      const gc = H.showcase(W - 0.3, 1.0, 'tickets', 3, { depth: 0.55, tilt: 0 }); K.at(gc, 0, 0, -0.1); x.g.add(gc); spot(x, 'ガラスのカウンター', [0, 1.0, -0.1]);
      const st = K.stool(K.m(P.dark), 0.55); K.at(st, 0, 0, zN + 0.6); x.g.add(st);
      const ws = H.wallShelf(W - 0.4, 1.0, 'tickets', 4, { rows: 2, depth: 0.25 }); K.at(ws, 0, 1.2, zN + 0.15); x.g.add(ws);
      lamp(x, H.panel(1.2, 0.3), 0, Hh, 0); S.fill(x.g, x.fills, 0, 2.0, 0, 5, 5);
      clockAt(x, W / 2 - 0.04, 1.9, -0.8, -PI / 2);
      details(x, Object.assign(slot, { counter: [0.4, 1.0, -0.1] }));
      if (!x.staff) person(x, 'clerk', { pose: 'sit', seat: 0.55, top: '#e8e4da', bottom: '#2a2a2a' }, 0, zN + 0.6, 0);
      H.outside(x.g, c, zS, r, x.out, 'town');
      return finish(x, { label: '金券の店', shadow: 6, anchors: x.staff ? { sit: { p: [0, 1.28, zN + 0.62], look: [0, 1.0, zS + 2], lim: { yaw: 160, up: 55, down: 60 }, body: 'sit' }, stand: { p: [0, 1.52, zN + 0.8], look: [0, 1.0, zS + 2], lim: { yaw: 170, up: 55, down: 55 }, body: 'stand' } } : { stand: { p: [0, 1.52, zS - 0.3], look: [0, 1.0, zN], lim: { yaw: 170, up: 55, down: 55 }, body: 'stand' } },
        body: { sit: { sleeve: '#e8e4da', legs: '#2a2a2a' }, stand: { sleeve: '#e8e4da' } }, companion: { stand: { p: [0.6, 0, zS + 0.6], ry: PI, pose: 'stand' } },
        amb: { traffic: 0.5, crowd: 0.2, tick: 0.5 }, walk: { y: 0, rects: [[-W / 2, -zS, W / 2, zS], [-W / 2 - 2, zS, W / 2 + 2, zS + 1.8]] } });
    }
    const W = 5.4, D = 7.2, Hh = 2.6;
    const old = sub === 'furuhon' || sub === 'tokei';
    shell(x, { w: W, d: D, h: Hh, wallTex: noise(old ? '#cfc4ae' : '#ecebe6'), floorTex: old ? wood('#6a5034', 3, 4) : tile('#d9d6cc', 6, 4, 5), openings: [{ side: 'S', at: -0.7, w: 1.6, y: 0, h: 2.1, kind: 'window' }, { side: 'S', at: 1.5, w: 1.6, y: 0.5, h: 1.6, kind: 'window' }], ceil: old ? '#c9b896' : '#f2f2ee' });
    const zS = x.zS, zN = -zS;
    frontSign(x, H.name(sub, r), { bg: old ? '#2a241e' : '#f4f0e6', fg: old ? '#e8d9a0' : '#2a2622', font: old ? 'mincho' : 'gothic', lit: !old });
    const type = { hon: 'books', furuhon: 'oldbooks', shugei: 'thread', tokei: 'watches', megane: 'frames' }[sub] || 'books';
    for (const sx of [-1, 1]) { const ws = H.wallShelf(D - 1.8, sub === 'furuhon' ? 2.3 : 1.9, type, (c.seed || 1) + (sx > 0 ? 5 : 3), { rows: sub === 'furuhon' ? 6 : 4, depth: 0.36, board: old ? P.woodDark : '#d9d4c6', back: old ? '#3a2a1e' : '#e6e2d6' }); K.at(ws, sx * (W / 2 - 0.2), 0, -0.6, sx > 0 ? -PI / 2 : PI / 2); x.g.add(ws); }
    x.g.add(K.box(1.8, 0.95, 0.6, K.m(old ? P.woodDark : '#d9d4c6'), 0.6, 0, zN + 0.9)); const rg = H.register(); K.at(rg, 0.9, 0.95, zN + 0.9); x.g.add(rg); spot(x, 'レジ', [0.9, 1.1, zN + 0.9]);
    let centerName = '平台';
    if (sub === 'hon') { for (let i = 0; i < 2; i++) { const tb = K.table(1.4, 0.8, 0.8, K.m('#d9d4c6')); K.at(tb, 0, 0, -1.4 + i * 1.8); x.g.add(tb); x.g.add(K.plane(1.36, 0.76, H.texMat(H.goodsTex('magazine' === 'x' ? 'packs' : 'snack', 4 + i)), 0, 0.81, -1.4 + i * 1.8)); for (let k = 0; k < 6; k++) x.g.add(K.box(0.18, 0.08 + r() * 0.08, 0.26, K.m(U.pick(r, ['#c8392b', '#2f6db5', '#f6d13c', '#ffffff', '#3aa86b'])), -0.5 + (k % 3) * 0.5, 0.8, -1.6 + i * 1.8 + Math.floor(k / 3) * 0.4)); } }
    else if (sub === 'furuhon') { for (let i = 0; i < 8; i++) { const h = 0.2 + r() * 0.5; x.g.add(K.box(0.24, h, 0.32, K.m(U.pick(r, ['#7a5a3a', '#5a4a3a', '#8a7a5a'])), -1.0 + (i % 4) * 0.6, 0, -1.6 + Math.floor(i / 4) * 1.4)); } const cart = new T.Group(); cart.add(K.box(1.2, 0.8, 0.5, K.m(P.woodDark), 0, 0, 0)); cart.add(H.vplane(1.1, 0.5, H.texMat(H.goodsTex('oldbooks', 8)), 0, 0.55, 0.26)); K.at(cart, 1.4, 0, zS + 0.8); x.g.add(cart); spot(x, '均一棚', [1.4, 0.9, zS + 0.8]); centerName = '積んだ本'; }
    else if (sub === 'shugei') { const tb = K.table(1.6, 0.9, 0.85, K.m(P.woodLight)); K.at(tb, 0, 0, -0.6); x.g.add(tb); for (let i = 0; i < 6; i++) { const bolt = K.cyl(0.07, 0.8, K.m(U.pick(r, ['#c8392b', '#2f6db5', '#e8d9b0', '#3f5a48', '#e85a7a', '#d9a23c']), { rough: 0.9 }), -0.6 + i * 0.24, 0.92, -0.6); bolt.rotation.x = PI / 2; bolt.position.z = -0.6; x.g.add(bolt); } centerName = '布の台'; }
    else if (sub === 'tokei') { for (let i = 0; i < 2; i++) { const sc = H.showcase(1.6, 1.0, 'watches', 5 + i, { depth: 0.55, base: P.woodDark, tilt: 0.1 }); K.at(sc, -0.3 + i * 0.0, 0, -1.6 + i * 1.6); x.g.add(sc); } for (let i = 0; i < 3; i++) { const pc = H.pendulumClock(c.hour + i * 0.3); K.at(pc, -1.2 + i * 0.9, 1.0, zN + 0.08); x.g.add(pc); x.ticks.push(tt => pc.userData.swing(tt + i * 0.37)); } for (let i = 0; i < 5; i++) { const ck = K.wallClock(c.hour + i * 0.7); ck.scale.setScalar(0.6 + r() * 0.5); K.at(ck, -W / 2 + 0.03, 2.1, -2.0 + i * 0.6, PI / 2); x.g.add(ck); } spot(x, '振り子の時計', [-0.3, 1.6, zN + 0.1]); centerName = '時計のケース'; }
    else if (sub === 'megane') { const gc = H.showcase(1.8, 1.0, 'frames', 4, { depth: 0.55, tilt: 0.05 }); K.at(gc, 0, 0, -1.2); x.g.add(gc); const mr = H.mirror(0.4, 0.5); K.at(mr, 0, 1.3, -1.2); x.g.add(mr); for (let i = 0; i < 2; i++) { const ch = K.chair(K.m(P.dark), K.m('#5a6a7a')); K.at(ch, -0.4 + i * 0.8, 0, -0.55, PI); x.g.add(ch); } centerName = '眼鏡のケース'; }
    person(x, x.staff ? 'customer' : (sub === 'hon' || sub === 'megane' ? 'clerk' : 'shopkeeper'), { top: old ? '#6a5a4a' : '#e8e4da', bottom: '#3d4352', old: old && r() < 0.6, hair: old ? P.hairGray : P.hair, h: 1.6 }, x.staff ? -1.0 : 0.6, x.staff ? 0.4 : zN + 0.4, x.staff ? r() * 6 : 0);
    for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) lamp(x, old ? H.pendant({ kind: 'bulb', power: k === 0 ? 2.2 : 0, len: 0.4 }) : H.panel(1.2, 0.3), -0.9 + i * 1.8, Hh, -1.6 + k * 2.4);
    S.fill(x.g, x.fills, 0, 2.2, 0, old ? 5 : 9, 8);
    if (!x.clock) clockAt(x, W / 2 - 0.04, 2.1, 1.6, -PI / 2);
    let A;
    if (x.staff) A = /奥|おにぎり/.test(t) ? { sit: { p: [0.6, 1.17, zN + 0.35], look: [0, 1.0, zS], lim: { yaw: 160, up: 55, down: 60 }, body: 'sit' }, stand: { p: [0.4, 1.52, -0.4], look: [0, 0.9, -1.4], lim: { yaw: 170, up: 55, down: 60 }, body: 'stand' } } : { stand: { p: [0.4, 1.52, -0.4], look: [0, 0.9, -1.4], lim: { yaw: 170, up: 55, down: 60 }, body: 'stand' }, sit: { p: [0.6, 1.17, zN + 0.35], look: [0, 1.0, zS], lim: { yaw: 160, up: 55, down: 60 }, body: 'sit' } };
    else if (sub === 'megane') A = { sit: { p: [-0.4, 1.15, -0.55], look: [0, 1.3, -1.2], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' }, stand: { p: [0, 1.52, zS - 0.8], look: [0, 1.0, -1.2], lim: { yaw: 170, up: 55, down: 55 }, body: 'stand' } };
    else if (sub === 'tokei' || sub === 'shugei') A = { stand: { p: [0.4, 1.52, zN + 1.8], look: [0.6, 1.1, zN + 0.6], lim: { yaw: 170, up: 55, down: 60 }, body: 'stand' } };
    else A = { stand: { p: [-W / 2 + 1.2, 1.52, -0.4], look: [-W / 2, 1.2, -0.4], lim: { yaw: 170, up: 55, down: 60 }, body: 'stand' } };
    if (x.staff && A.sit) { const st = K.stool(K.m(P.woodDark), 0.45); K.at(st, 0.6, 0, zN + 0.35); x.g.add(st); }
    details(x, Object.assign(slot, { door: [-0.7 - 0.6, 0, zS - 0.3], counter: [0.2, 0.96, zN + 0.9], shelf: [0.0, 0.96, zN + 0.9], floor: [W / 2 - 0.6, 0, zS - 0.8] }));
    if (sub === 'tokei') { /* 主人がねじを巻いて耳に当てる時計（imc-009）: カウンターの上に一つ */ const w = new T.Group(); w.add(K.cyl(0.02, 0.008, K.m('#d8b860', { metal: 0.7, rough: 0.3 }), 0, 0, 0, { seg: 16 })); K.at(w, 0.4, 0.96, zN + 0.85); x.g.add(w); }
    H.outside(x.g, c, zS, r, x.out, 'town');
    spot(x, '棚', [-W / 2 + 0.3, 1.2, -0.4]); spot(x, centerName, [0, 0.9, -1.2]); spot(x, '窓の外の通り', [0, 1.4, zS]);
    const LABEL = { hon: '本屋', furuhon: '古本屋', shugei: '手芸の店', tokei: '時計屋', megane: '眼鏡屋' };
    return finish(x, { label: LABEL[sub] || '店の中', anchors: A, body: { stand: { sleeve: '#7d8794' }, sit: { sleeve: '#7d8794', legs: '#4a4f5c' } },
      companion: { stand: { p: [A.stand.p[0] + 0.7, 0, A.stand.p[2] + 0.4], ry: PI, pose: 'stand' }, sit: { p: [0.4, 0, -0.55], ry: PI, pose: 'stand' } },
      amb: { crowd: 0.15, traffic: 0.25, tick: sub === 'tokei' ? 1 : 0.4 }, walk: { y: 0, rects: [[-W / 2, -zS, W / 2, zS]] } });
  }

  /* ================= 理髪店・美容院 ================= */
  function salon(x) {
    const c = x.c, r = x.rng, beauty = x.sub === 'beauty', t = x.text, look = customerLook, slot = {};
    const W = 5.4, D = 6.6, Hh = 2.6;
    shell(x, { w: W, d: D, h: Hh, wallTex: noise(beauty ? '#f2efe8' : '#e6ece8'), floorTex: beauty ? wood(P.woodPale, 3, 4) : tile('#3a3a3a', 6, 4, 5), openings: [{ side: 'S', at: -1.0, w: 1.2, y: 0, h: 2.1, kind: 'window' }, { side: 'S', at: 1.2, w: 2.0, y: 0.6, h: 1.5, kind: 'window' }], ceil: '#f2f2ee' });
    const zS = x.zS, zN = -zS;
    frontSign(x, H.name(beauty ? 'beauty' : 'barber', r), { bg: beauty ? '#f4f0e6' : '#2f6db5', fg: beauty ? '#2a2622' : '#ffffff', font: 'gothic', lit: true });
    if (!beauty) { const bp = H.barberPole(); K.at(bp, W / 2 - 0.3, 1.0, zS + 0.3); x.g.add(bp); x.ticks.push(tt => bp.userData.spin(tt)); spot(x, '回る看板', [W / 2 - 0.3, 1.4, zS + 0.3]); }
    const chairs = beauty ? 3 : 2, seats = [];
    for (let i = 0; i < chairs; i++) {
      const cz = -1.9 + i * 1.6; const ch = H.barberChair(beauty ? '#e8e4da' : U.pick(r, ['#7a2a2a', '#2a2a2a', '#3a4a6a'])); K.at(ch, -W / 2 + 1.2, 0, cz, -PI / 2); x.g.add(ch);
      const mr = H.mirror(0.9, 1.0); K.at(mr, -W / 2 + 0.03, 1.03, cz, PI / 2); x.g.add(mr); x.g.add(K.box(0.36, 0.05, 1.0, K.m(beauty ? '#f2f2ee' : '#d9d6cc'), -W / 2 + 0.2, 0.95, cz));
      /* 鏡の前の棚: 整髪料のびん、くしを浸けた消毒液、はさみ */
      const sx0 = -W / 2 + 0.2;
      for (let k = 0; k < 3; k++) x.g.add(K.cyl(0.028, 0.12 + k * 0.03, K.m(U.pick(r, ['#2a5a8a', '#c8392b', '#e8e2d0', '#3a6a3a', '#d9a23c']), { rough: 0.3 }), sx0 + 0.05, 1.0, cz - 0.42 + k * 0.08, { seg: 12 }));
      x.g.add(K.cyl(0.05, 0.2, K.m('#3a8ab8', { transparent: true, opacity: 0.55, rough: 0.1 }), sx0 + 0.06, 1.0, cz + 0.36, { seg: 16 }));
      for (let k = 0; k < 3; k++) x.g.add(K.box(0.008, 0.16, 0.05, K.m(['#2a2a2a', '#c8c4b8', '#6a4a3a'][k]), sx0 + 0.05 + (k - 1) * 0.012, 1.08, cz + 0.36));
      const sc = new T.Group(); for (const a2 of [-0.25, 0.25]) { const bl = K.box(0.012, 0.004, 0.16, K.m(P.steel, { metal: 0.8, rough: 0.25 }), 0, 0, 0); bl.rotation.y = a2; sc.add(bl); } K.at(sc, sx0 + 0.08, 1.002, cz + 0.12); x.g.add(sc);
      seats.push(cz);
    }
    for (let i = 0; i < 2; i++) { const sk = new T.Group(); sk.add(K.box(0.6, 0.9, 0.5, K.m('#e6e6e2'), 0, 0, 0)); sk.add(K.box(0.5, 0.18, 0.4, K.m(P.white, { rough: 0.2 }), 0, 0.9, 0)); K.at(sk, 0.4 + i * 1.0, 0, zN + 0.35); x.g.add(sk); } spot(x, '洗面台', [0.9, 1.0, zN + 0.35]);
    x.g.add(K.box(1.8, 0.42, 0.45, K.m(beauty ? '#c9b48f' : '#5a6a7a'), W / 2 - 1.1, 0, zS - 0.6)); const mg = K.shelf(0.5, 0.8, 0.24, K.m(P.woodDark), 3); K.at(mg, W / 2 - 0.3, 0, zS - 1.6, -PI / 2); x.g.add(mg); x.g.add(H.vplane(0.46, 0.7, H.texMat(H.goodsTex('snack', 3)), W / 2 - 0.32, 0.4, zS - 1.6, -PI / 2));
    x.tv = tvAt(x, W / 2 - 0.3, 1.75, -1.0, -PI / 2); spot(x, 'テレビ', [W / 2 - 0.3, 1.95, -1.0]);
    if (/蒸しタオル/.test(t) || !beauty) { const tw = new T.Group(); tw.add(K.box(0.4, 0.36, 0.32, K.m('#e8e8e2', { rough: 0.4 }), 0, 0, 0)); K.at(tw, 1.6, 0.9, zN + 0.3); x.g.add(tw); x.g.add(K.box(0.5, 0.9, 0.4, K.m('#d9d6cc'), 1.6, 0, zN + 0.3)); steamAt(x, 1.6, 1.28, zN + 0.3, { n: 6, alpha: 0.05 }); }
    if (beauty) for (let i = 0; i < 2; i++) { const pl = H.plant(1.0); K.at(pl, W / 2 - 0.4, 0, -2.6 + i * 1.4); x.g.add(pl); }
    const me = 0;
    person(x, 'barber', { top: beauty ? '#2a2a2a' : '#f2f2ee', bottom: '#2a2a2a', hair: P.hair, h: 1.64 }, -W / 2 + 1.95, seats[me] + 0.2, -PI / 2 - 0.4);
    if (chairs > 1) { person(x, 'customer', Object.assign({ pose: 'sit', seat: 0.52 }, look(x)), -W / 2 + 1.2, seats[1], -PI / 2); person(x, 'barber', { top: beauty ? '#2a2a2a' : '#f2f2ee', bottom: '#2a2a2a', hair: P.hairGray, h: 1.6 }, -W / 2 + 1.85, seats[1] - 0.3, -PI / 2 + 0.3); }
    for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) lamp(x, H.panel(1.2, 0.3), -1.0 + i * 2.0, Hh, -1.5 + k * 2.4);
    S.fill(x.g, x.fills, -1, 2.2, -0.6, 9, 8); clockAt(x, 0.5, 2.15, zN + 0.04, 0);
    details(x, Object.assign(slot, { door: [-1.6, 0, zS - 0.3], wall2: [W / 2 - 0.02, 1.3, 1.6, -PI / 2] }));
    H.outside(x.g, c, zS, r, x.out, 'town');
    spot(x, '鏡', [-W / 2 + 0.05, 1.5, seats[me]]); spot(x, '窓の外の通り', [1.2, 1.4, zS]);
    return finish(x, { label: beauty ? '美容院' : '理髪店', anchors: { sit: { p: [-W / 2 + 1.22, 1.2, seats[me]], look: [-W / 2 + 0.2, 1.15, seats[me] + 1.5], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' }, stand: { p: [0.4, 1.52, zS - 0.9], look: [-W / 2, 1.2, -1.0], lim: { yaw: 170, up: 55, down: 55 }, body: 'stand' } },
      body: { sit: { sleeve: '#f2f2ee', legs: '#4a4f5c' }, stand: { sleeve: '#7d8794' } }, companion: { sit: { p: [W / 2 - 1.1, 0, zS - 0.62], ry: PI, pose: 'sit', seat: 0.42 }, stand: { p: [0.8, 0, zS - 1.2], ry: PI, pose: 'stand' } },
      amb: { crowd: 0.15, traffic: 0.25, tick: 0.5 }, walk: { y: 0, rects: [[-W / 2, -zS, W / 2, zS]] } });
  }

  /* ================= 厨房（定食屋・パン屋）と料理教室 ================= */
  function kitchen(x) {
    const c = x.c, r = x.rng, sub = x.sub, t = x.text, look = customerLook, slot = {};
    if (sub === 'class') {
      const W = 7, D = 7, Hh = 2.6;
      shell(x, { w: W, d: D, h: Hh, wallTex: noise('#f2f2ee'), floorTex: tile('#d9d6cc', 6, 5, 5), openings: [{ side: 'E', at: 0, w: 4, y: 0.8, h: 1.4, kind: 'window' }], ceil: '#f6f6f2' });
      const zS = x.zS, zN = -zS;
      const isl = [[-1.6, -1.2], [1.6, -1.2], [0, 1.4]];
      isl.forEach((p, i) => { x.g.add(K.box(2.2, 0.88, 1.0, K.m('#e6e6e2'), p[0], 0, p[1])); x.g.add(K.box(2.24, 0.04, 1.04, K.m('#f2f2ee', { rough: 0.3 }), p[0], 0.88, p[1])); x.g.add(K.box(0.5, 0.02, 0.4, K.m('#1e1e20'), p[0] + 0.6, 0.92, p[1])); x.g.add(K.box(0.4, 0.02, 0.36, H.mat.steel(), p[0] - 0.6, 0.91, p[1])); if (i) for (let k = 0; k < 2; k++) person(x, null, Object.assign({ top: '#e8e4da' }, look(x)), p[0] - 0.5 + k * 1.0, p[1] + (i === 2 ? 0.75 : -0.75), i === 2 ? PI : 0); });
      const wb = K.box(2.4, 1.0, 0.03, K.m(P.white, { rough: 0.3 }), 0, 1.0, zN + 0.03); x.g.add(wb); spot(x, 'ホワイトボード', [0, 1.5, zN + 0.1]);
      person(x, null, { top: '#f2f2ee', bottom: '#3d4352', long: true, h: 1.6 }, 0, zN + 0.6, 0);
      for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) lamp(x, H.panel(1.2, 0.3), -2 + i * 2, Hh, -1.5 + k * 3);
      S.fill(x.g, x.fills, 0, 2.2, 0, 12, 9); clockAt(x, W / 2 - 0.04, 2.1, -2.0, -PI / 2);
      details(x, slot); H.outside(x.g, c, zS, r, x.out, 'town');
      spot(x, '調理台', [-1.6, 1.0, -1.2]); spot(x, '窓', [W / 2, 1.4, 0]);
      return finish(x, { label: '料理教室', anchors: { stand: { p: [-1.6, 1.52, -0.45], look: [-1.6, 0.9, -1.2], lim: { yaw: 170, up: 55, down: 62 }, body: 'stand' } }, body: { stand: { sleeve: '#e8e4da' } },
        companion: { stand: { p: [-0.9, 0, -0.45], ry: -PI / 2, pose: 'stand' } }, amb: { crowd: 0.35, tick: 0.3 }, walk: { y: 0, rects: [[-W / 2, -zS, W / 2, zS]] } });
    }
    const bake = sub === 'bake';
    const W = bake ? 5.0 : 4.4, D = bake ? 4.6 : 4.0, Hh = 2.45;
    shell(x, { w: W, d: D, h: Hh, wallTex: tile('#efece4', 8, 4, 2), floorTex: tile('#8f9490', 6, 4, 4), floorRough: 0.5, ceil: '#ecebe6', base: false,
      openings: bake ? [{ side: 'E', at: -0.6, w: 1.0, y: 1.0, h: 0.8, kind: 'window' }] : [{ side: 'S', at: 0.6, w: 1.4, y: 0.95, h: 0.75, kind: 'open' }] });
    const zS = x.zS, zN = -zS;
    if (bake) {
      const ov = H.oven(1.8); K.at(ov, -0.4, 0, zN + 0.46); x.g.add(ov); spot(x, 'オーブン', [-0.4, 1.0, zN + 0.5]);
      const ovl = new T.PointLight(0xff9a5a, 1.4, 4, 2); ovl.position.set(-0.4, 0.9, zN + 1.1); x.g.add(ovl);
      x.g.add(K.box(1.8, 0.88, 0.9, K.mTex(wood(P.woodLight, 2, 1)), 0.2, 0, 0.3)); x.g.add(K.plane(1.6, 0.7, K.m('#f6f4ec', { rough: 0.95 }), 0.2, 0.885, 0.3)); for (let i = 0; i < 8; i++) x.g.add(K.sph(0.06, K.m('#e8d9b0', { rough: 0.8 }), -0.4 + (i % 4) * 0.35, 0.92, 0.1 + Math.floor(i / 4) * 0.35, { s: [1, 0.55, 1] })); spot(x, '生地の台', [0.2, 1.0, 0.3]);
      const rk = new T.Group(); for (let i = 0; i < 6; i++) { rk.add(K.box(0.6, 0.01, 0.42, K.m('#9aa0a4', { metal: 0.5 }), 0, 0.2 + i * 0.28, 0)); rk.add(K.plane(0.58, 0.4, H.texMat(H.goodsTex('bread', 2 + i)), 0, 0.212 + i * 0.28, 0)); } for (const sx of [-1, 1]) for (const sz of [-1, 1]) rk.add(K.box(0.02, 1.8, 0.02, K.m(P.steel, { metal: 0.6 }), sx * 0.3, 0, sz * 0.21)); K.at(rk, W / 2 - 0.5, 0, 1.2); x.g.add(rk); spot(x, 'パンの台車', [W / 2 - 0.5, 1.0, 1.2]);
      const fr = new T.Group(); fr.add(K.box(0.9, 1.9, 0.7, K.m('#cfd5d8', { metal: 0.85, rough: 0.12 }), 0, 0, 0)); fr.add(K.box(0.02, 0.6, 0.04, K.m(P.steelDark), 0.36, 0.9, 0.36)); K.at(fr, W / 2 - 0.5, 0, zN + 0.4); x.g.add(fr); spot(x, 'ステンレスの冷蔵庫', [W / 2 - 0.5, 1.4, zN + 0.8]);
      /* 裏口と、横のフック（エプロン） */
      const bd = K.door(K.m('#9aa0a4', { metal: 0.3 }), 0.85, 2.0); K.at(bd, -W / 2 + 0.02, 0, 1.0, PI / 2); x.g.add(bd); spot(x, '裏口', [-W / 2 + 0.1, 1.2, 1.0]);
      if (/裏口[^。]*開け|少し開け/.test(t)) { bd.children[1].rotation.y = -0.5; }
      if (/フック|エプロン/.test(t)) { x.hook = H.apronHook('#1e1e22'); K.at(x.hook, -W / 2 + 0.03, 1.75, 0.3, PI / 2); x.g.add(x.hook); spot(x, '裏口の横のフック', [-W / 2 + 0.05, 1.5, 0.3]); }
      for (let i = 0; i < 2; i++) lamp(x, H.panel(1.2, 0.3), -0.6 + i * 1.4, Hh, 0); S.fill(x.g, x.fills, 0, 2.0, 0, 8, 6);
    } else {
      x.g.add(K.box(W - 0.4, 0.86, 0.6, H.mat.steel(), 0.2, 0, zN + 0.35)); const rgN = H.range(1.6); K.at(rgN, -0.6, 0, zN + 0.38); x.g.add(rgN);
      const big = H.pot(0.24, 0.42); K.at(big, -1.0, 0.85, zN + 0.42); x.g.add(big); steamAt(x, -1.0, 1.28, zN + 0.42, { n: 18, h: 0.9, alpha: 0.12, spread: 0.08 }); spot(x, '大鍋', [-1.0, 1.2, zN + 0.42]);
      const pt = H.pot(0.14, 0.2); K.at(pt, -0.2, 0.85, zN + 0.38); x.g.add(pt);
      const hood = K.box(2.0, 0.4, 0.7, H.mat.steel(), -0.6, 1.9, zN + 0.38); x.g.add(hood);
      const fan = new T.Group(); fan.add(K.box(0.4, 0.4, 0.06, K.m('#d9dad6'), 0, 0, 0)); fan.add(K.cyl(0.15, 0.02, K.m('#9aa0a4'), 0, 0.2, 0.04)); fan.children[1].rotation.x = PI / 2; K.at(fan, 1.2, 1.9, zN + 0.04); x.g.add(fan); spot(x, '換気扇', [1.2, 2.1, zN + 0.1]);
      const fr = new T.Group(); fr.add(K.box(0.8, 1.85, 0.7, K.m('#cfd5d8', { metal: 0.8, rough: 0.15 }), 0, 0, 0)); K.at(fr, W / 2 - 0.45, 0, 0.2, -PI / 2); x.g.add(fr); spot(x, '冷蔵庫', [W / 2 - 0.5, 1.3, 0.2]);
      const sh = K.shelf(1.6, 0.6, 0.24, H.mat.steel(), 2); K.at(sh, 0.6, 1.5, zN + 0.12); x.g.add(sh); for (let i = 0; i < 8; i++) x.g.add(K.bowl(U.pick(r, ['#2a2a2a', '#e8e4da'])).translateX(0 + i * 0.18).translateY(1.53).translateZ(zN + 0.14));
      /* 配膳口（表の客席へ）とのれん、裏の小部屋の戸 */
      const nr = H.noren(['　', '　', '　'], '#2f3b55', 1.4, 0.35); K.at(nr, 0.6, 1.7, zS + 0.02); x.g.add(nr);
      x.g.add(K.box(1.4, 0.04, 0.4, K.m(P.steel, { metal: 0.5 }), 0.6, 0.93, zS - 0.1));
      const rd = K.door(K.m(P.woodLight), 0.75, 1.95); K.at(rd, -W / 2 + 0.02, 0, 0.6, PI / 2); x.g.add(rd); spot(x, '裏の小部屋の戸', [-W / 2 + 0.1, 1.2, 0.6]);
      const dr = new T.Group(); dr.add(K.box(4, 0.02, 2.2, K.m('#8f867a'), 0, 0, 0)); for (let i = 0; i < 2; i++) { const tb = K.table(0.75, 0.75, 0.7, K.m(U.pick(r, PAL.tableTop))); K.at(tb, -0.8 + i * 1.6, 0, 0.2); dr.add(tb); }
      dr.add(K.box(4, 2.45, 0.1, K.mTex(noise('#e6dccb')), 0, 0, 1.15)); dr.add(K.box(4, 0.1, 2.3, K.m('#e6dfd0'), 0, 2.45, 0)); const mt = H.menuTags(H.MENU.shokudo, {}); K.at(mt, -1.2, 1.55, 1.09, PI); dr.add(mt);
      K.at(dr, 0.6, 0, zS + 1.15); x.g.add(dr); lamp(x, H.pendant({ kind: 'cone', power: 2.0, len: 0.4 }), 0.6, 2.45, zS + 1.2);
      for (let i = 0; i < 2; i++) lamp(x, H.panel(1.0, 0.3), -0.6 + i * 1.4, Hh, 0); S.fill(x.g, x.fills, 0, 2.0, 0, 7, 6);
      x.outsideDone = true;
    }
    clockAt(x, W / 2 - 0.04, 2.0, -0.6, -PI / 2);
    details(x, slot);
    if (bake) { const sp = K.seasonal(c); x.g.add(K.ground(80, sp.snowy ? P.snow : '#5a5a56', -0.05, 20)); }
    const A = bake ? { stand: { p: [0.2, 1.52, 1.05], look: [0.2, 0.9, 0.2], lim: { yaw: 170, up: 55, down: 62 }, body: 'stand' } } : { stand: { p: [-0.5, 1.52, zN + 1.2], look: [-0.8, 1.1, zN], lim: { yaw: 170, up: 55, down: 62 }, body: 'stand' } };
    return finish(x, { label: bake ? 'パン屋の厨房' : '定食屋の厨房', shadow: 6, anchors: A, body: { stand: { sleeve: bake ? '#f2efe6' : '#eceae4' } },
      companion: { stand: { p: [A.stand.p[0] + 0.8, 0, A.stand.p[2]], ry: -PI / 2, pose: 'stand' } }, amb: { machine: 0.45, tick: 0.3 }, walk: { y: 0, rects: [[-W / 2, -zS, W / 2, zS]] },
      weatherBox: [[-2, 0, zS + 6], [2, 3, zS + 8]], dustBox: [[-1.2, 0.6, -1], [1.2, 2.0, 1]] });
  }

  /* ================= そのほか（カラオケ・眼科・ホテル・ダイビングの店・新聞の販売店） ================= */
  function misc(x) {
    const c = x.c, r = x.rng, sub = x.sub, t = x.text, look = customerLook, slot = {};
    if (sub === 'karaoke') {
      const W = 3.0, D = 3.6, Hh = 2.4;
      shell(x, { w: W, d: D, h: Hh, wall: '#3a3448', floorTex: noise('#2a2430', 3, 3), ceil: '#2a2430', base: false, openings: [] });
      const zS = x.zS, zN = -zS, sofa = '#6a3a4a';
      x.g.add(K.box(0.6, 0.42, D - 0.6, K.m(sofa, { rough: 0.8 }), -W / 2 + 0.3, 0, -0.3)); x.g.add(K.box(0.15, 0.5, D - 0.6, K.m(sofa), -W / 2 + 0.08, 0.42, -0.3));
      x.g.add(K.box(W - 0.6, 0.42, 0.6, K.m(sofa), 0.3, 0, zN + 0.3)); x.g.add(K.box(W - 0.6, 0.5, 0.15, K.m(sofa), 0.3, 0.42, zN + 0.08));
      const tb = K.table(1.0, 0.6, 0.45, K.m('#1e1e22', { rough: 0.2 })); K.at(tb, 0, 0, -0.5); x.g.add(tb); for (let i = 0; i < 5; i++) x.g.add(K.cyl(0.035, 0.12, K.m(U.pick(r, ['#d9b445', '#f2f2ee', '#8a5a3a']), { rough: 0.2, transparent: true, opacity: 0.75 }), -0.35 + i * 0.17, 0.45, -0.5 + (i % 2) * 0.15));
      const scr = K.box(1.4, 0.8, 0.04, K.m('#101418', { emissive: '#6a8aff', ei: 0.6, nocache: true }), W / 2 - 0.03, 1.1, -0.4); scr.rotation.y = -PI / 2; x.g.add(scr); spot(x, '画面', [W / 2 - 0.05, 1.5, -0.4]);
      const sm = scr.material; x.ticks.push(tt => { sm.emissive.setHSL((tt * 0.05) % 1, 0.5, 0.45); sm.emissiveIntensity = 0.5 + Math.sin(tt * 3) * 0.12; });
      const dl = new T.PointLight(0xb08aff, 1.8, 5, 1.6); dl.position.set(0, 2.1, 0); x.g.add(dl); x.ticks.push(tt => { dl.color.setHSL((tt * 0.08) % 1, 0.45, 0.6); });
      const door = K.door(K.m('#5a4a5a'), 0.8, 2.0); K.at(door, 0.6, 0, zS - 0.02, PI); x.g.add(door); spot(x, 'ドア', [0.6, 1.2, zS - 0.1]);
      for (let i = 0; i < 2; i++) person(x, null, Object.assign({ pose: 'sit', seat: 0.42 }, look(x)), -0.4 + i * 0.7, zN + 0.38, 0);
      x.outsideDone = true; details(x, slot);
      return finish(x, { label: 'カラオケの部屋', shadow: 5, anchors: { lie: { p: [-W / 2 + 0.32, 0.72, 0.3], look: [W / 2, 1.1, -0.2], lim: { yaw: 120, up: 70, down: 20 }, body: 'none', ground: 0.42 }, sit: { p: [-W / 2 + 0.35, 1.13, 0.2], look: [W / 2, 1.1, -0.4], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' } },
        body: { sit: { sleeve: '#5a6a7a', legs: '#3a3a3a' } }, companion: { sit: { p: [-W / 2 + 0.35, 0, -0.6], ry: PI / 2, pose: 'sit', seat: 0.42 }, lie: { p: [0.6, 0, 0.4], ry: PI, pose: 'stand' } },
        amb: { crowd: 0.3, machine: 0.2 }, walk: { y: 0, rects: [[-W / 2, -zS, W / 2, zS]] }, weatherBox: [[-1, 0, zS + 8], [1, 1, zS + 9]], dustBox: [[-1, 0.4, -1.2], [1, 2.0, 1.2]] });
    }
    const W = sub === 'hotel' ? 6 : (sub === 'paper' ? 6 : 7), D = sub === 'paper' ? 5 : (sub === 'dive' ? 6 : 6.4), Hh = 2.6;
    shell(x, { w: W, d: D, h: Hh, wallTex: noise(sub === 'clinic' ? '#eef0ee' : (sub === 'hotel' ? '#e8e2d6' : (sub === 'dive' ? '#e6eef0' : '#ddd8cc'))), floorTex: sub === 'hotel' ? noise('#7a5a4a', 3, 3) : tile(sub === 'paper' ? '#8f8a80' : '#d9d6cc', 6, 4, 4), ceil: '#f2f2ee',
      openings: [{ side: 'S', at: -1.2, w: 1.4, y: 0, h: 2.1, kind: 'window' }, { side: 'S', at: 1.4, w: 2.0, y: 0.7, h: 1.4, kind: 'window' }] });
    const zS = x.zS, zN = -zS;
    let A, label, out = 'town', comp;
    if (sub === 'clinic') {
      x.g.add(K.box(2.4, 1.05, 0.6, K.m('#e6e2d6'), 0, 0, zN + 0.9)); person(x, 'clerk', { top: '#f2f2ee', bottom: '#5a6a7a', long: true, h: 1.58, pose: 'sit', seat: 0.5 }, 0, zN + 0.4, 0);
      const sg = H.sign('受付', 0.8, 0.3, { bg: '#2f6db5', fg: '#ffffff' }); K.at(sg, 0, 2.0, zN + 0.05); x.g.add(sg);
      for (let k = 0; k < 2; k++) { x.g.add(K.box(2.4, 0.42, 0.45, K.m('#5a7a9a', { rough: 0.7 }), 0.4, 0, 0.2 + k * 1.3)); x.g.add(K.box(2.4, 0.45, 0.08, K.m('#5a7a9a'), 0.4, 0.42, 0.42 + k * 1.3)); }
      const ec = H.eyeChart(); K.at(ec, W / 2 - 0.03, 1.0, -0.8, -PI / 2); x.g.add(ec); spot(x, '視力表', [W / 2 - 0.05, 1.6, -0.8]);
      x.tv = tvAt(x, -W / 2 + 0.3, 1.8, 0.4, PI / 2);
      person(x, 'customer', Object.assign({ pose: 'sit', seat: 0.42 }, look(x)), 1.2, 1.5 + 0.05, PI);
      A = { sit: { p: [-0.2, 1.13, 0.22], look: [0, 1.1, zN], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' }, stand: { p: [0, 1.52, zN + 1.6], look: [0, 1.1, zN], lim: { yaw: 170, up: 55, down: 55 }, body: 'stand' } };
      comp = { sit: { p: [0.4, 0, 0.22], ry: PI, pose: 'sit', seat: 0.42 } }; label = '眼科の待合室';
      spot(x, '受付', [0, 1.2, zN + 0.9]);
    } else if (sub === 'hotel') {
      x.g.add(K.box(2.6, 1.08, 0.6, K.m('#5c3a26', { rough: 0.4 }), 0, 0, zN + 1.0)); const kb = H.wallShelf(1.6, 0.9, 'boxes', 3, { rows: 4, depth: 0.2, board: P.woodDark, back: '#3a2a1e' }); K.at(kb, 0, 1.1, zN + 0.12); x.g.add(kb); spot(x, 'フロント', [0, 1.2, zN + 1.0]);
      person(x, 'clerk', { top: '#2a2a3a', bottom: '#2a2a3a', h: 1.64 }, 0, zN + 0.5, 0);
      const ev = new T.Group(); ev.add(K.box(1.0, 2.1, 0.06, K.m('#9aa0a4', { metal: 0.6, rough: 0.3 }), 0, 0, 0)); ev.add(K.box(0.01, 2.05, 0.07, K.m('#5a5f66'), 0, 0.02, 0)); K.at(ev, W / 2 - 0.04, 0, -0.8, -PI / 2); x.g.add(ev); spot(x, 'エレベーター', [W / 2 - 0.05, 1.3, -0.8]);
      if (/無人/.test(t)) { const nt = H.vplane(0.42, 0.3, H.texMat(H.textTex(['二十三時以降は', '無人になります'], { w: 256, h: 180, bg: '#f4f0e6', fg: '#2a2622' })), 0.9, 1.25, zN + 1.31); x.g.add(nt); spot(x, 'カウンターの貼り紙', [0.9, 1.25, zN + 1.35]); }
      const sf = K.sofa('#6a5a4a'); K.at(sf, -W / 2 + 1.2, 0, 1.0, PI / 2); x.g.add(sf); const pl = H.plant(1.2); K.at(pl, -W / 2 + 0.4, 0, zN + 0.5); x.g.add(pl);
      person(x, 'customer', look(x), 0.3, zN + 2.4, PI);
      A = { stand: { p: [0.2, 1.52, zN + 1.65], look: [0, 1.2, zN], lim: { yaw: 170, up: 55, down: 55 }, body: 'stand' } }; comp = { stand: { p: [0.9, 0, zN + 1.7], ry: PI, pose: 'stand' } }; label = 'ホテルのフロント';
    } else if (sub === 'dive') {
      const tb = K.table(1.6, 0.9, 0.72, K.m(P.woodLight)); K.at(tb, 0, 0, 0.2); x.g.add(tb); for (let i = 0; i < 3; i++) { const p = K.paperSheet(0.21, 0.3); K.at(p, -0.5 + i * 0.5, 0.72, 0.2, r() - 0.5); x.g.add(p); }
      for (const sz of [-1, 1]) { const ch = K.chair(K.m(P.wood)); K.at(ch, 0, 0, 0.2 + sz * 0.6, sz > 0 ? PI : 0); x.g.add(ch); }
      for (let i = 0; i < 5; i++) x.g.add(K.cap(0.12, 0.8, K.m('#1e2228', { rough: 0.6 }), -W / 2 + 0.4 + i * 0.32, 1.2, zN + 0.3)); x.g.add(K.rod([-W / 2 + 0.3, 1.8, zN + 0.3], [-W / 2 + 1.9, 1.8, zN + 0.3], 0.01, K.m(P.steel)));
      for (let i = 0; i < 4; i++) x.g.add(K.cyl(0.09, 0.7, K.m(U.pick(r, ['#e8c83a', '#9aa0a4', '#2f6db5']), { metal: 0.3, rough: 0.4 }), W / 2 - 0.4, 0, -1.6 + i * 0.25));
      const ph = H.vplane(2.2, 1.1, H.texMat(H.goodsTex('photos', 5)), 1.2, 1.55, zN + 0.02); x.g.add(ph); spot(x, '壁の写真', [1.2, 1.6, zN + 0.1]);
      person(x, 'shopkeeper', { top: '#2f6db5', bottom: '#3d4352', h: 1.7 }, 0.9, -0.4, -2.4);
      A = { sit: { p: [0, 1.15, -0.4], look: [0, 0.8, 0.4], lim: { yaw: 150, up: 55, down: 62 }, body: 'sit' }, stand: { p: [0, 1.52, zS - 0.8], look: [1.2, 1.4, zN], lim: { yaw: 170, up: 55, down: 55 }, body: 'stand' } };
      comp = { sit: { p: [0, 0, 0.8], ry: PI, pose: 'sit', seat: 0.44 } }; label = 'ダイビングの店'; out = 'harbor';
    } else {
      for (let i = 0; i < 2; i++) { const tb = K.table(2.2, 0.9, 0.85, K.m('#c9b48f')); K.at(tb, -1.2 + i * 2.6, 0, -0.4); x.g.add(tb); for (let k = 0; k < 4; k++) x.g.add(K.box(0.4, 0.2 + r() * 0.2, 0.3, K.m('#e8e6e0'), -1.9 + i * 2.6 + k * 0.48, 0.85, -0.5)); }
      for (let i = 0; i < 6; i++) x.g.add(K.box(0.42, 0.3, 0.32, K.m('#e8e6e0'), -W / 2 + 0.6 + (i % 3) * 0.45, Math.floor(i / 3) * 0.3, zN + 0.4));
      const sv = H.stove(); K.at(sv, W / 2 - 0.8, 0, zN + 0.8); x.g.add(sv); spot(x, 'ストーブのやかん', [W / 2 - 0.8, 0.7, zN + 0.8]);
      for (let i = 0; i < 3; i++) { const bc = K.bicycle(); K.at(bc, -1.6 + i * 1.2, -0.08, zS + 1.0, 0.1); x.g.add(bc); }
      for (let i = 0; i < 2; i++) person(x, 'coworker', look(x), -0.6 + i * 2.4, 0.3, PI);
      A = { stand: { p: [-1.2, 1.52, 0.3], look: [-1.2, 0.85, -0.4], lim: { yaw: 170, up: 55, down: 62 }, body: 'stand' } }; comp = { stand: { p: [-0.4, 0, 0.5], ry: PI, pose: 'stand' } }; label = '新聞の販売店';
      x.stoveOK = false;
    }
    for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) lamp(x, H.panel(1.2, 0.3), -1.2 + i * 2.4, Hh, -1.2 + k * 2.2);
    S.fill(x.g, x.fills, 0, 2.2, 0, 9, 8); clockAt(x, -W / 2 + 0.04, 2.1, -0.8, PI / 2);
    details(x, Object.assign(slot, { door: [-1.8, 0, zS - 0.3], wall2: [-W / 2 + 0.02, 1.3, 1.2, PI / 2], floor: [W / 2 - 0.6, 0, zS - 0.8] }));
    H.outside(x.g, c, zS, r, x.out, out);
    spot(x, '窓の外', [1.4, 1.4, zS]);
    comp = comp || {}; if (!comp.stand) comp.stand = { p: [0.8, 0, zS - 1.2], ry: PI, pose: 'stand' };
    return finish(x, { label, anchors: A, body: { stand: { sleeve: '#7d8794' }, sit: { sleeve: '#7d8794', legs: '#4a4f5c' } }, companion: comp, amb: { crowd: 0.2, traffic: 0.3, tick: 0.4 }, walk: { y: 0, rects: [[-W / 2, -zS, W / 2, zS]] } });
  }

  /* ================= 入口 ================= */
  S.shop = function (c) {
    const x = ctxOf(c);
    const fn = { eat, aisle, front, shelf, salon, kitchen, misc }[x.fam] || eat;
    let st;
    try { st = fn(x); }
    catch (e) { if (window.console) console.error('店の組み立てに失敗', c.v, e); const y = ctxOf(Object.assign({}, c, { v: 'eat.shokudo' })); st = eat(y); }
    return st;
  };
})(window.SI);
