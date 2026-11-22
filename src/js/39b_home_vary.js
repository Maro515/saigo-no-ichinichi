'use strict';
/* 最期の一日 — 自宅の作り分け。人物（年齢・家族・仕事）と語りの言葉から家の種類を決め、
   居間・和室・寝室・浴室を、家ごとに違う間取り・色・小物にする。
   種類: modern（一戸建て）/ old（古い家の茶の間）/ mansion（マンション）/ danchi（団地）/ oneroom（ワンルーム）/ farm（農家） */
(function (SI) {
  const T = window.THREE, U = SI.U, K = SI.Kit, P = K.P, S = SI.stages;
  const PI = Math.PI;
  const orig = { living: S.living, bedroom: S.bedroom, washitsu: S.washitsu, bath: S.bath };
  const HOME = { living: 1, washitsu: 1, bedroom: 1, bath: 1 };
  const Hs = () => SI.Shop;

  /* ================= 家の種類 ================= */
  function homeText(cause) {
    if (!cause) return '';
    const out = [cause.place || ''];
    for (const b of (cause.beats || [])) if (HOME[b.stage]) out.push(b.text || '');
    if (cause.end && HOME[cause.end.stage]) out.push((cause.end.lines || []).join(''));
    return out.join('。');
  }
  const cache = {};
  SI.homeProfile = function (c) {
    const cause = c.cause, life = c.life || { age: 50, fam: { partner: 'with', kids: 1, grandkids: 0 }, job: { cat: 'office' } };
    const key = [cause ? cause.id : 'x', life.age, life.fam ? life.fam.partner + life.fam.kids + '/' + life.fam.grandkids : '', life.job ? life.job.cat : '', life.date ? life.date.m : '', c.seed || 0, c.season, c.homeKind || ''].join('|');   // 判定に使うものはすべて鍵に入れる
    if (cache[key]) return cache[key];
    const t = homeText(cause), r = U.rng(((c.seed || 1) * 131 + 7) >>> 0), age = life.age || 50, fam = life.fam || {};
    let kind;
    if (c.homeKind) kind = c.homeKind;                // 確認用（?stage=living&home=old）
    else if (/ワンルーム|ロフト|一人暮らしの部屋/.test(t)) kind = 'oneroom';
    else if (/団地/.test(t)) kind = 'danchi';
    else if (/マンション|階の部屋|ベランダ/.test(t)) kind = 'mansion';
    else if (/アパート/.test(t)) kind = age <= 40 ? 'oneroom' : 'danchi';
    else if ((life.job && life.job.cat === 'farm') || /田んぼ|畑から|農家|牛舎|納屋|土間|囲炉裏/.test(t)) kind = 'farm';
    else if (/古い家|実家|築|縁側|井戸|仏壇|障子/.test(t) && age >= 45) kind = 'old';
    else if (age <= 30 && fam.partner === 'never') kind = r() < 0.7 ? 'oneroom' : 'mansion';
    else kind = U.weighted(r, [['modern', 4], ['old', age >= 70 ? 4 : (age >= 55 ? 2 : 0.4)], ['mansion', age < 70 ? 2.5 : 1], ['danchi', age >= 55 ? 1.6 : 0.8], ['farm', age >= 60 ? 0.6 : 0.15]]);
    const winter = c.season === 'winter', summer = c.season === 'summer';
    const pal = {
      wall: U.pick(r, { modern: ['#e8e0d0', '#e4e6e0', '#ece6dc', '#dfe2e6', '#e9dfd2'], old: ['#d9cfb8', '#d2c6a8', '#ddd2bb'], mansion: ['#f0eeea', '#ecebe6', '#eeeae2'], danchi: ['#e6e0d2', '#ded8c8'], oneroom: ['#f2f0ec', '#ecece8', '#efe9e0'], farm: ['#d2c6a8', '#cdbf9e'] }[kind]),
      floor: U.pick(r, { modern: ['#c8a67c', '#b9925f', '#d8bf98', '#a87e55'], old: ['#9a7552'], mansion: ['#d8c4a0', '#c8b08a', '#e2d6c0', '#8a6a4e'], danchi: ['#b98f62', '#a8845a'], oneroom: ['#d0b48a', '#c4a882', '#b8b4ac'], farm: ['#7a5a3a'] }[kind]),
      wood: U.pick(r, ['#9a7552', '#7a5a3e', '#b08a62', '#5c4531']),
      curtain: U.pick(r, ['#d9cdb6', '#c9d2c4', '#d5c7c7', '#b9c4cc', '#c8b49a', '#9fb0a0', '#e0d0b0']),
      sofa: U.pick(r, ['#b9a98e', '#8f9a8a', '#9a8f9c', '#7f8c99', '#a87a6a', '#6a7a6a', '#c8b8a0']),
      rug: U.pick(r, ['#b5a58c', '#a8b0a8', '#b49a92', '#9aa0b0', '#c4b08a']),
      blanket: U.pick(r, [P.blanket, P.blanketWarm, '#b8c4b4', '#c9b9c4', '#d8c8a8', '#a8b8c8']),
      plaster: U.pick(r, ['#d9cfb8', '#cfc4a8', '#ddd4c0', '#c9bfa6']),
      tile: U.pick(r, ['#dfe6e6', '#b9cfd6', '#e6dccb', '#c8d8c8', '#e8e2d8'])
    };
    const has = (re) => re.test(t);
    const pf = {
      kind, age, fam, pal, text: t, rng: r, mirror: r() < 0.5 ? -1 : 1,
      floorN: kind === 'mansion' ? 3 + Math.floor(r() * 9) : (kind === 'danchi' ? 2 + Math.floor(r() * 4) : (kind === 'oneroom' ? 1 + Math.floor(r() * 2) : 0)),
      kotatsu: has(/こたつ|炬燵/) || (winter && (kind === 'old' || kind === 'farm' || kind === 'danchi' || r() < 0.4)),
      heater: has(/石油ストーブ|ストーブ/) ? 'kerosene' : (has(/ファンヒーター/) ? 'fanheater' : (winter ? (kind === 'old' || kind === 'farm' ? 'kerosene' : (kind === 'mansion' || kind === 'oneroom' ? null : 'fanheater')) : null)),
      fan: has(/扇風機/) || (summer && (kind === 'old' || kind === 'farm' || kind === 'danchi' || r() < 0.3)),
      chime: has(/風鈴/) || (summer && (kind === 'old' || kind === 'farm') && r() < 0.7),
      cat: has(/猫/), dog: has(/犬/), fish: has(/金魚/), piano: has(/ピアノ/), sewing: has(/ミシン/),
      butsudan: has(/仏壇/) || (age >= 65 && (kind === 'old' || kind === 'farm' || kind === 'danchi') && r() < 0.8),
      kids: (fam.kids > 0 && age < 48) || age <= 15, grandkids: fam.grandkids > 0, elder: age >= 75,
      mikan: has(/みかん/) || (winter && r() < 0.6), nabe: has(/鍋/), phone: has(/電話/), radio: has(/ラジオ/), pills: has(/薬/) || age >= 75,
      month: (c.life && c.life.date && c.life.date.m) || 0
    };
    cache[key] = pf; return pf;
  };

  /* ================= 小物 ================= */
  function kotatsu(quilt) {
    const g = new T.Group(); quilt = quilt || '#a8453a';
    g.add(K.box(0.8, 0.36, 0.8, K.m(P.woodDark), 0, 0, 0));
    const q = K.box(1.25, 0.34, 1.25, K.m(quilt, { rough: 0.95 }), 0, 0.0, 0); q.scale.set(1, 1, 1); g.add(q);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(K.sph(0.14, K.m(quilt, { rough: 0.95 }), sx * 0.55, 0.06, sz * 0.55, { s: [1, 0.5, 1] }));
    g.add(K.box(0.92, 0.03, 0.92, K.m('#7a5a3e', { rough: 0.4 }), 0, 0.36, 0));
    return g;
  }
  function fan() {
    const g = new T.Group(), m = K.m('#e8eaec', { rough: 0.4 }), b = K.m('#9ab8d8', { transparent: true, opacity: 0.6 });
    g.add(K.cyl(0.14, 0.04, m, 0, 0, 0, { seg: 18 })); g.add(K.cyl(0.015, 0.8, m, 0, 0.04, 0));
    const head = new T.Group(); head.position.set(0, 0.88, 0); head.add(K.cyl(0.18, 0.04, b, 0, 0, 0, { seg: 20 })); head.children[0].rotation.x = PI / 2; head.add(K.sph(0.05, m, 0, 0, -0.04)); g.add(head);
    g.userData.head = head; return g;
  }
  function chime() {
    const g = new T.Group(); g.add(K.rod([0, 0, 0], [0, -0.06, 0], 0.002, K.m(P.dark)));
    g.add(K.sph(0.035, K.m('#cfe2ea', { transparent: true, opacity: 0.7, rough: 0.1 }), 0, -0.09, 0, { s: [1, 0.9, 1] }));
    const tag = Hs().vplane(0.05, 0.16, K.m('#f2e6c8', { double: true }), 0, -0.22, 0); tag.material.side = T.DoubleSide; g.add(tag); g.userData.tag = tag; return g;
  }
  function cat(c) {
    const g = new T.Group(), m = K.m(c || U.pick(U.rng(5), ['#3a3029', '#c98a4b', '#e8e2d6']), { rough: 0.95 });
    g.add(K.sph(0.13, m, 0, 0.09, 0, { s: [1.3, 0.7, 0.9] })); g.add(K.sph(0.07, m, 0.13, 0.12, 0.02));
    for (const sz of [-1, 1]) { const ear = K.cyl(0.002, 0.04, m, 0.15, 0.17, sz * 0.03 + 0.02, { rTop: 0.02, seg: 4 }); ear.rotation.x = -sz * 0.2; g.add(ear); }
    const tail = K.cap(0.018, 0.16, m, -0.14, 0.05, 0.08); tail.rotation.set(0, 0.6, PI / 2.3); g.add(tail); return g;
  }
  function dogBed() { const g = new T.Group(); g.add(K.cyl(0.32, 0.12, K.m('#8a6a4e', { rough: 0.95 }), 0, 0, 0, { seg: 20 })); g.add(K.cyl(0.26, 0.05, K.m('#c8b49a', { rough: 0.95 }), 0, 0.06, 0, { seg: 20 })); g.add(K.cyl(0.07, 0.05, K.m(P.steel, { metal: 0.6 }), 0.42, 0, 0.1, { seg: 14 })); return g; }
  function fishBowl() { const g = new T.Group(); g.add(K.sph(0.13, K.m('#cfe2ea', { transparent: true, opacity: 0.35, rough: 0.05 }), 0, 0.12, 0, { s: [1, 0.9, 1] })); g.add(K.sph(0.11, K.m('#8ab8c8', { transparent: true, opacity: 0.5 }), 0, 0.1, 0, { s: [1, 0.7, 1] })); for (let i = 0; i < 2; i++) g.add(K.sph(0.018, K.m('#e85a2a'), -0.03 + i * 0.06, 0.12, i * 0.03, { s: [1.6, 0.8, 0.6] })); return g; }
  function piano() { const g = new T.Group(), m = K.m('#1a1614', { rough: 0.25, metal: 0.1 }); g.add(K.box(1.45, 1.22, 0.6, m, 0, 0, 0)); g.add(K.box(1.4, 0.04, 0.18, K.m('#f2f0ea'), 0, 0.72, 0.36)); for (let i = 0; i < 20; i++) g.add(K.box(0.03, 0.02, 0.1, m, -0.62 + i * 0.066, 0.75, 0.33)); g.add(K.box(1.45, 0.08, 0.32, m, 0, 0.66, 0.22)); return g; }
  function sewing() { const g = new T.Group(); g.add(K.box(0.4, 0.14, 0.18, K.m('#f2f0ea', { rough: 0.4 }), 0, 0, 0)); g.add(K.box(0.08, 0.18, 0.16, K.m('#f2f0ea'), 0.14, 0.14, 0)); g.add(K.box(0.3, 0.06, 0.16, K.m('#f2f0ea'), 0.02, 0.28, 0)); return g; }
  function mikanBowl() { const g = new T.Group(); g.add(K.cyl(0.11, 0.05, K.m('#c9a46e', { rough: 0.8 }), 0, 0, 0, { rTop: 0.14, seg: 16 })); for (let i = 0; i < 6; i++) g.add(K.sph(0.035, K.m('#e8862a', { rough: 0.7 }), Math.cos(i) * 0.06, 0.06 + (i > 3 ? 0.04 : 0), Math.sin(i) * 0.06, { ws: 8, hs: 6 })); return g; }
  function pillCase() { const g = new T.Group(); g.add(K.box(0.2, 0.03, 0.08, K.m('#e8e4da'), 0, 0, 0)); for (let i = 0; i < 7; i++) g.add(K.box(0.022, 0.012, 0.06, K.m(['#f2c8d8', '#c8e0f2', '#f6e3a8'][i % 3]), -0.08 + i * 0.027, 0.03, 0)); return g; }
  function phone() { const g = new T.Group(); g.add(K.box(0.2, 0.07, 0.2, K.m('#e8e4da', { rough: 0.4 }), 0, 0, 0)); g.add(K.box(0.2, 0.04, 0.06, K.m('#e8e4da'), 0, 0.07, -0.05)); return g; }
  function butsudanSmall() {
    const g = new T.Group(), w = K.m('#3a2a20', { rough: 0.4 }), gold = K.m(P.gold, { metal: 0.6, rough: 0.45 });
    g.add(K.box(0.5, 0.7, 0.36, w, 0, 0, 0)); g.add(K.box(0.42, 0.5, 0.02, gold, 0, 0.12, 0.17)); g.add(K.box(0.06, 0.12, 0.03, gold, 0, 0.2, 0.2)); g.add(K.cyl(0.005, 0.08, K.m(P.offwhite), 0.12, 0.12, 0.2));
    for (const sx of [-1, 1]) { const dr = K.box(0.24, 0.62, 0.02, w, sx * 0.36, 0.04, 0.22); dr.rotation.y = sx * -0.6; g.add(dr); } return g;
  }
  function kamidana() { const g = new T.Group(), w = K.m(P.woodPale, { rough: 0.6 }); g.add(K.box(0.9, 0.03, 0.3, w, 0, 0, 0)); g.add(K.box(0.36, 0.3, 0.2, w, 0, 0.03, 0)); g.add(K.box(0.44, 0.04, 0.26, w, 0, 0.33, 0)); g.add(K.rod([-0.45, 0.42, 0.14], [0.45, 0.42, 0.14], 0.01, K.m('#e8d9a0'))); return g; }
  function seasonDeco(pf) {
    const m = pf.month;
    if (m === 1) { const g = new T.Group(); g.add(K.box(0.18, 0.04, 0.18, K.m(P.woodPale), 0, 0, 0)); g.add(K.sph(0.08, K.m('#f6f4ec'), 0, 0.08, 0, { s: [1, 0.6, 1] })); g.add(K.sph(0.06, K.m('#f6f4ec'), 0, 0.15, 0, { s: [1, 0.6, 1] })); g.add(K.sph(0.03, K.m('#e8862a'), 0, 0.2, 0)); return { obj: g, name: '鏡もち' }; }
    if (m === 3) { const g = new T.Group(); g.add(K.box(0.4, 0.06, 0.22, K.m('#c8392b'), 0, 0, 0)); for (const sx of [-1, 1]) { g.add(K.cyl(0.04, 0.12, K.m(sx < 0 ? '#2f3b55' : '#c8392b'), sx * 0.08, 0.06, 0, { rTop: 0.03 })); g.add(K.sph(0.025, K.m('#f6f4ec'), sx * 0.08, 0.2, 0)); } return { obj: g, name: 'ひな人形' }; }
    if (m === 12) { const g = new T.Group(); g.add(K.cyl(0.06, 0.08, K.m('#a8453a'), 0, 0, 0)); g.add(K.cyl(0.004, 0.18, K.m('#3a6a3a'), 0, 0.08, 0, { rTop: 0.12, seg: 10 })); g.add(K.cyl(0.004, 0.14, K.m('#3a6a3a'), 0, 0.2, 0, { rTop: 0.09, seg: 10 })); return { obj: g, name: '小さなツリー' }; }
    return null;
  }
  /* 話ごと・季節ごとの小物を、決まった置き場に置く。slots: floorA/floorB 床、table 卓の上、shelf 棚の上、window 窓の上、out 外の庭 */
  function furnish(st, root, pf, slots, sx) {
    const used = new Map(), SHIFT = [[0, 0], [0, -0.24], [0.26, 0], [-0.26, 0]];   // 同じ置き場の 2 つ目からは、少しずらして重ならないように
    const add = (obj, p0, ry, name, spotY) => { if (!p0) return null; const n = used.get(p0) || 0; used.set(p0, n + 1); const d = SHIFT[Math.min(n, 3)], p = [p0[0] + d[0], p0[1], p0[2] + d[1], p0[3]]; K.at(obj, sx * p[0], p[1], p[2], (ry != null ? ry : (p[3] || 0)) * sx); root.add(obj); if (name) { st.spots.push([sx * p[0], p[1] + (spotY || 0.4), p[2]]); st.spotNames.push(name); } return obj; };
    const ticks = st._ticks = st._ticks || [];
    let fa = slots.floorA, fb = slots.floorB;
    if (pf.heater && fa) { const H = Hs(); const o = pf.heater === 'kerosene' ? H.stove() : (() => { const g = new T.Group(); g.add(K.box(0.42, 0.42, 0.26, K.m('#e8e6e0', { rough: 0.5 }), 0, 0, 0)); g.add(K.box(0.3, 0.08, 0.02, K.m('#3a2a20', { emissive: '#ff7a3a', ei: 0.35 }), 0, 0.06, 0.131)); return g; })(); add(o, fa, 0, pf.heater === 'kerosene' ? 'ストーブ' : 'ファンヒーター', 0.4); fa = fb; fb = null; }
    if (pf.fan && fa) { const f = fan(); add(f, fa, PI, '扇風機', 0.8); ticks.push(t => { f.userData.head.rotation.y = Math.sin(t * 0.5) * 0.7; }); fa = fb; fb = null; }
    if (pf.chime && slots.window) { const ch = chime(); add(ch, slots.window, 0, '風鈴', -0.1); ticks.push(t => { ch.rotation.z = Math.sin(t * 2.3) * 0.12; ch.userData.tag.rotation.y = Math.sin(t * 1.7) * 0.5; }); }
    if (pf.cat && fa) add(cat(), [fa[0], 0, fa[2]], 0.8, '猫', 0.1);
    if (pf.dog && fb) add(dogBed(), fb, 0, '犬の寝床', 0.1);
    if (pf.fish && slots.shelf) add(fishBowl(), slots.shelf, 0, '金魚鉢', 0.15);
    else if (pf.radio && slots.shelf) add(Hs().radio(), slots.shelf, 0, 'ラジオ', 0.1);
    if (pf.phone && slots.shelf2) add(phone(), slots.shelf2, 0, '電話', 0.1);
    if (pf.piano && slots.wallFloor) add(piano(), slots.wallFloor, null, 'ピアノ', 1.0);
    else if (pf.sewing && slots.table2) add(sewing(), slots.table2, 0, 'ミシン', 0.2);
    if (pf.nabe && slots.table) { const nb = Hs().pot(0.14, 0.12); add(nb, slots.table, 0, '鍋', 0.2); const s = Hs().steam({ n: 12, h: 0.5, alpha: 0.18 }); K.at(s, nb.position.x, nb.position.y + 0.13, nb.position.z); root.add(s); ticks.push(t => s.userData.tick(t)); }
    if (pf.mikan && slots.table) add(mikanBowl(), slots.table, 0, 'みかん', 0.1);
    if (pf.pills && slots.table2) add(pillCase(), slots.table2, 0.3, '薬の入れ物', 0.1);
    const deco = seasonDeco(pf); if (deco && slots.shelf2) add(deco.obj, slots.shelf2, 0, deco.name, 0.2);
    if (pf.kids && slots.floorKid) { const g = new T.Group(); g.add(K.box(0.3, 0.36, 0.2, K.m(U.pick(pf.rng, ['#c8392b', '#2a2a2a', '#7a4a6a']), { rough: 0.4 }), 0, 0, 0)); for (let i = 0; i < 4; i++) g.add(K.box(0.08, 0.08, 0.08, K.m(['#e8452f', '#f6d13c', '#2f6fd6', '#3aa86b'][i]), 0.35 + (i % 2) * 0.1, Math.floor(i / 2) * 0.08, 0.1)); add(g, slots.floorKid, 0.4, 'ランドセル', 0.3); }
    if (pf.grandkids && slots.wall) { const ph = K.photo(0.3, 0.22, '#c8b8a0'); add(ph, slots.wall, null, '孫の写真', 0); }
  }
  /* 左右を入れかえる（鏡うつし）。文字のない部屋だけに使う */
  function mirrorStage(st) {
    const neg = (p) => p && [-p[0], p[1], p[2]];
    const A = st.anchors; for (const k in A) { const a = A[k]; if (!a) continue; if (a.p) a.p = neg(a.p); if (a.look) a.look = neg(a.look); if (a.path) a.path = a.path.map(neg); }
    if (st.spots) st.spots = st.spots.map(neg);
    const mp = (o) => o && Object.assign({}, o, { p: neg(o.p), ry: o.ry != null ? -o.ry : o.ry });
    if (st.companion) for (const k in st.companion) st.companion[k] = mp(st.companion[k]);
    if (st.visit) st.visit = st.visit.map(mp); if (st.meet) st.meet = st.meet.map(mp); if (st.staff) st.staff = mp(st.staff);
    if (st.center) st.center = neg(st.center);
    const box = (b) => b && [[-b[1][0], b[0][1], b[0][2]], [-b[0][0], b[1][1], b[1][2]]];
    st.weatherBox = box(st.weatherBox); st.dustBox = box(st.dustBox); st.petalBox = box(st.petalBox);
    if (st.walk) { const w = Object.assign({}, st.walk); w.rects = w.rects.map(r => r.length > 4 ? [-r[2], r[1], -r[0], r[3], r[4]] : [-r[2], r[1], -r[0], r[3]]); if (w.holes) w.holes = w.holes.map(r => [-r[2], r[1], -r[0], r[3]]); if (w.places) w.places = w.places.map(r => [-r[2], r[1], -r[0], r[3], r[4]]); if (w.start) w.start = [-w.start[0], w.start[1]]; st.walk = w; }
    const inner = st.group, root = new T.Group(); inner.scale.x = -1; root.add(inner); st.group = root;
    return st;
  }
  /* 毎フレームの小物の動きを、元の update に足す */
  function withTicks(st) {
    const ticks = st._ticks; if (!ticks || !ticks.length) return st;
    const up0 = st.update; st.update = function (dt, env) { if (up0) up0.call(this, dt, env); for (const f of ticks) f(env.time, dt); };
    return st;
  }

  /* ================= 新しい居間（種類ごと） ================= */
  function ctx(c, pf) { return { c, pf, g: new T.Group(), lamps: [], fills: [], spots: [], names: [], ticks: [], r: pf.rng }; }
  function sp_(x, name, p) { x.spots.push(p); x.names.push(name); }
  function wallMat(c, n) { return K.mTex(K.tex.rep(K.tex.noise(c, 0.05), n || 4, 2)); }
  function woodFloor(c, a, b) { return K.mTex(K.tex.rep(K.tex.wood(c, 6), a || 3, b || 3), { rough: 0.7 }); }
  function tatamiFloor(a, b) { return K.mTex(K.tex.rep(K.tex.tatami(), a || 3, b || 3), { rough: 0.95 }); }
  /* マンション・団地・ワンルームの、ベランダと外 */
  function balcony(x, W, zS, y0, kind) {
    const g = x.g, c = x.c;
    g.add(K.box(W + 0.2, 0.12, 1.3, K.m(P.concrete), 0, -0.12, zS + 0.72));
    g.add(K.box(W + 0.2, 1.0, 0.08, K.m(kind === 'danchi' ? '#d9d4c6' : '#b9bec2', { rough: 0.6 }), 0, 0, zS + 1.36));
    if (kind !== 'danchi') g.add(K.box(W + 0.2, 0.9, 0.02, K.m('#9ab0b8', { transparent: true, opacity: 0.25 }), 0, 0.05, zS + 1.32));
    if (c.weather === 'clear' || c.weather === 'cloudy') { g.add(K.rod([-W / 2 + 0.3, 1.8, zS + 0.9], [W / 2 - 0.3, 1.8, zS + 0.9], 0.02, K.m(P.steel, { metal: 0.5 }))); for (let i = 0; i < 4; i++) { const cl = K.box(0.36, 0.5, 0.02, K.m(U.pick(x.r, [P.white, '#c9d6e2', P.beige, '#e2c9c9']), { double: true }), -W / 2 + 0.8 + i * 0.6, 1.25, zS + 0.9); x.g.add(cl); x.ticks.push((t, dt, env) => { cl.rotation.x = Math.sin(t * 1.1 + i) * 0.06; }); } }
    if (kind === 'danchi') {
      const rng = U.rng(c.seed + 9);
      for (let i = 0; i < 4; i++) { const b = K.building(34, 15, 10, U.pick(rng, ['#d9cdb6', '#e2d8c4', '#cfc6b4']), c.seed + i); K.at(b, -30 + (i % 2) * 40, y0, zS + 18 + Math.floor(i / 2) * 22); g.add(b); x.lamps.push(b); }
      const gr = K.ground(200, K.seasonal(c).grass, y0, 30); gr.position.z = zS + 60; g.add(gr);
      for (let i = 0; i < 8; i++) { const tr = K.tree({ kind: 'broad', season: c.season, weather: c.weather, h: 6 + rng() * 3, seed: c.seed + 40 + i }); K.at(tr, -28 + i * 8, y0, zS + 9 + rng() * 3); g.add(tr); }
      g.add(K.ridge({ r: 260, hMin: 12, hMax: 30, color: K.seasonal(c).hillFar, seed: c.seed + 4, n: 40 }));
    } else if (kind === 'oneroom' && x.pf.floorN <= 2) S.neighborhood(g, c, zS + 1.4, y0, x.lamps);
    else S.cityBelow(g, c, zS + 1.4, y0, x.lamps, kind === 'mansion');
  }
  function finishHome(x, o) {
    const lamps = x.lamps, ticks = x.ticks;
    return Object.assign({
      group: x.g, indoor: true, shadow: 10, center: [0, 0, 1], spots: x.spots, spotNames: x.names, fills: x.fills,
      onLight: (env) => { for (const l of lamps) if (l.userData.setLamp) l.userData.setLamp(env.lampOn, l.userData.power); if (x.clock) x.clock.userData.setTime(env.hour); if (x.tvScr) x.tvScr.emissiveIntensity = (env.hour >= 18.5 || env.hour < 0.5) ? 0.5 : 0; },
      update(dt, env) { for (const f of ticks) f(env.time, dt, env); if (x.tvScr && x.tvScr.emissiveIntensity > 0) x.tvScr.emissiveIntensity = 0.42 + Math.sin(env.time * 3.1) * 0.1; }
    }, o);
  }

  /* 古い家の茶の間（畳、ちゃぶ台かこたつ、茶だんす、ふすまの奥に台所） */
  function oldLiving(c, pf, farm) {
    const x = ctx(c, pf), g = x.g, r = x.r;
    const W = farm ? 6.4 : 4.6, D = farm ? 5.0 : 4.0, Hh = farm ? 2.7 : 2.4, zS = D / 2, zN = -zS;
    g.add(K.room({ w: W, d: D, h: Hh, wall: wallMat(pf.pal.wall), floor: tatamiFloor(Math.round(W / 0.9), Math.round(D / 1.8)), ceil: K.mTex(K.tex.rep(K.tex.wood(P.woodLight, 6), 2, 1)), frame: K.m(P.woodDark), base: false,
      openings: [{ side: 'S', at: 0, w: W - 0.6, y: 0, h: 1.8, kind: farm ? 'open' : 'window' }, { side: 'N', at: W / 2 - 1.0, w: 0.9, y: 0, h: 1.8, kind: 'open' }] }));
    const wood = K.m(P.woodDark);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(K.box(0.11, Hh, 0.11, wood, sx * (W / 2 - 0.05), 0, sz * (D / 2 - 0.05)));
    g.add(K.box(W, 0.09, 0.03, wood, 0, 1.8, zN + 0.015));
    if (farm) for (let i = 0; i < 3; i++) g.add(K.box(0.18, 0.22, D, K.m('#3a2a1e', { rough: 0.7 }), -W / 2 + 1.6 + i * 1.6, Hh - 0.25, 0));
    /* ふすま（奥）と、その奥の台所 */
    const fusT = Hs().textTex([' '], { w: 64, h: 128, bg: U.pick(r, ['#e8dcc0', '#dcd4c0', '#e2d8b8']), fg: '#e8dcc0' });
    for (let i = 0; i < 2; i++) { const f = K.box(0.88, 1.78, 0.03, Hs().texMat(fusT), -W / 2 + 0.5 + i * 0.9, 0.02, zN + 0.03); g.add(f); g.add(K.box(0.04, 0.12, 0.035, K.m('#3a2a1e'), -W / 2 + 0.85 + i * 0.9, 0.85, zN + 0.05)); }
    const kit = new T.Group(); kit.add(K.box(2.4, 0.02, 1.8, K.mTex(K.tex.rep(K.tex.tile('#b9b0a0', 4), 3, 2)), 0, 0, 0)); const kk = K.kitchen(1.8); K.at(kk, 0, 0, -0.6); kit.add(kk); kit.add(K.box(2.4, Hh, 0.1, wallMat('#d9d0bc'), 0, 0, -0.95)); for (const s2 of [-1, 1]) kit.add(K.box(0.1, Hh, 1.9, wallMat('#d9d0bc'), s2 * 1.2, 0, 0)); kit.add(K.box(2.5, 0.1, 2.0, K.m('#e6dfd0'), 0, Hh, 0));
    K.at(kit, W / 2 - 1.0, 0, zN - 0.95); g.add(kit); const kl = K.ceilingLamp('cool'); K.at(kl, W / 2 - 1.0, Hh, zN - 0.9); kl.userData.power = 4; g.add(kl); x.lamps.push(kl); sp_(x, '奥の台所', [W / 2 - 1.0, 1.1, zN - 1.0]);
    /* ちゃぶ台かこたつ */
    const tx = farm ? -0.6 : -0.2, tz = 0.1;
    if (pf.kotatsu) { const kt = kotatsu(U.pick(r, ['#a8453a', '#4a5a7a', '#7a5a3a', '#6a4a5a'])); K.at(kt, tx, 0, tz); g.add(kt); sp_(x, 'こたつ', [tx, 0.45, tz]); }
    else { const tb = K.roundTable(0.48, 0.34, K.m('#6a4a32', { rough: 0.45 })); K.at(tb, tx, 0, tz); g.add(tb); sp_(x, 'ちゃぶ台', [tx, 0.4, tz]); }
    const topY = pf.kotatsu ? 0.39 : 0.34;
    const tp = K.teapot(P.woodDark); K.at(tp, tx + 0.15, topY, tz - 0.12); g.add(tp); const cu = K.cup(P.offwhite, 0.07); K.at(cu, tx - 0.18, topY, tz + 0.08); g.add(cu); sp_(x, '湯のみ', [tx - 0.18, topY + 0.1, tz + 0.08]);
    for (const [dx, dz, ry] of [[0, -0.85, 0], [0, 0.85, PI], [-0.85, 0, PI / 2], [0.85, 0, -PI / 2]]) { const zb = K.zabuton(U.pick(r, [P.navy, '#7a2f2a', '#5a4a2a', '#3f5a48'])); K.at(zb, tx + dx, 0, tz + dz, ry); g.add(zb); }
    /* テレビ・茶だんす・仏壇・時計・暦・神棚 */
    const tvs = K.cabinet(0.9, 0.42, 0.42, K.m(P.woodDark)); K.at(tvs, W / 2 - 0.26, 0, 0.6, -PI / 2); g.add(tvs);
    const tv = K.tv(pf.age >= 80 ? 0.6 : 0.8); K.at(tv, W / 2 - 0.28, 0.42, 0.6, -PI / 2); g.add(tv); x.tvScr = tv.userData.screen.material; sp_(x, 'テレビ', [W / 2 - 0.3, 0.75, 0.6]);
    const cha = new T.Group(); cha.add(K.cabinet(1.0, 0.8, 0.4, K.m(P.wood))); cha.add(K.box(1.0, 0.8, 0.36, K.m(P.glass, { transparent: true, opacity: 0.18 }), 0, 0.8, 0)); cha.add(K.box(1.02, 0.03, 0.42, K.m(P.wood), 0, 1.6, 0)); for (let i = 0; i < 6; i++) cha.add(K.cup(U.pick(r, [P.offwhite, '#c9d6dc', '#d9c49a']), 0.07).translateX(-0.35 + i * 0.14).translateY(0.83).translateZ(0.02));
    K.at(cha, W / 2 - 0.24, 0, -1.2, -PI / 2); g.add(cha); sp_(x, '茶だんす', [W / 2 - 0.3, 1.2, -1.2]);
    if (pf.butsudan) { const bd = butsudanSmall(); K.at(bd, -W / 2 + 0.22, 0, -0.6, PI / 2); g.add(bd); sp_(x, '仏壇', [-W / 2 + 0.3, 0.6, -0.6]); }
    if (farm || r() < 0.5) { const kd = kamidana(); K.at(kd, -W / 2 + 0.17, 1.95, 0.6, PI / 2); g.add(kd); sp_(x, '神棚', [-W / 2 + 0.2, 2.1, 0.6]); }
    const pc = Hs().pendulumClock(c.hour); K.at(pc, 0.6, 1.35, zN + 0.08); g.add(pc); x.ticks.push(t => pc.userData.swing(t)); x.clock = pc.userData.face; sp_(x, '柱時計', [0.6, 1.8, zN + 0.1]);
    const cal = K.calendar(); K.at(cal, 1.4, 1.25, zN + 0.02); g.add(cal);
    for (let i = 0; i < (pf.fam && pf.fam.kids ? 3 : 1); i++) { const ph = K.photo(0.24, 0.18, U.pick(r, ['#b9b1a2', '#a8a090', '#c4b8a4'])); K.at(ph, -0.6 + i * 0.32, 1.95, zN + 0.02, 0); ph.rotation.x = 0.15; g.add(ph); }
    sp_(x, '鴨居の写真', [-0.3, 2.0, zN + 0.1]);
    const lamp = K.ceilingLamp('washi'); K.at(lamp, tx, Hh, tz); lamp.userData.power = 8; g.add(lamp); x.lamps.push(lamp);
    S.fill(g, x.fills, 0, 1.6, zS - 0.6, farm ? 9 : 7, 8);
    /* 外: 古い家は庭、農家は縁側と田畑 */
    const y0 = -0.45;
    g.add(K.box(W + 0.4, 0.06, 0.9, K.mTex(K.tex.rep(K.tex.wood(P.wood, 8), 1, 3)), 0, -0.06, zS + 0.5)); g.add(K.box(W + 0.4, 0.39, 0.08, wood, 0, y0, zS + 0.95));
    g.add(K.box(W + 1.2, 0.12, 1.6, K.m(P.roof), 0, Hh + 0.03, zS + 0.75));
    if (farm) fieldView(x, zS + 1.0, y0); else S.gardenView(g, c, zS + 1.0, y0, x.lamps);
    const slots = { floorA: [W / 2 - 0.6, 0, zS - 0.5], floorB: [-W / 2 + 0.7, 0, zS - 0.6], table: [tx + 0.05, topY, tz + 0.15], table2: [tx - 0.2, topY, tz - 0.15], shelf: [W / 2 - 0.3, 1.63, -1.0], shelf2: [W / 2 - 0.3, 1.63, -1.5], window: [0.6, 1.78, zS - 0.05], floorKid: [-1.0, 0, -1.2], wall: [-1.2, 1.5, zN + 0.02] };
    const st = finishHome(x, {
      label: farm ? '自宅の座敷' : '自宅の茶の間', shadow: farm ? 12 : 10, center: [0, 0, 1.2],
      anchors: {
        sit: { p: [tx, 0.82, tz - 0.78], look: [tx + 0.2, 0.6, zS + 3], lim: { yaw: 140, up: 60, down: 62 }, body: 'sit', ground: 0 },
        stand: { p: [-0.9, 1.52, -1.2], look: [0.4, 1.0, zS + 3], lim: { yaw: 150, up: 55, down: 55 }, body: 'stand' },
        lie: { p: [W / 2 - 1.1, 0.26, -0.6], look: [0, 1.2, zS + 2], lim: { yaw: 110, up: 75, down: 12 }, body: 'none', ground: 0 }
      },
      body: { sit: { sleeve: '#8d8a84', legs: '#4c4f58' }, stand: { sleeve: '#8d8a84' } },
      walk: { y: 0, rects: [[-W / 2, zN, W / 2, zS], [-W / 2 - 0.2, zS, W / 2 + 0.2, zS + 0.95]], start: [-0.9, -1.2] },
      meet: [{ p: [W / 2 - 1.0, 0, zN + 0.4], ry: 0 }],
      visit: [{ p: [tx, 0, tz + 0.82], ry: PI, pose: 'seiza' }, { p: [W / 2 - 1.0, 0, zN + 0.4], ry: 0 }],
      companion: { sit: { p: [tx, 0, tz + 0.82], ry: PI, pose: 'seiza' }, stand: { p: [tx + 0.82, 0, tz], ry: -PI / 2, pose: 'seiza' }, lie: { p: [W / 2 - 1.6, 0, 0.1], ry: 2.2, pose: 'seiza' } },
      weatherBox: [[-10, y0, zS + 1.0], [10, 9, zS + 14]], dustBox: [[-1.5, 0.1, -1], [1.5, 1.7, zS]], petalBox: [[-3, y0, zS + 1.0], [4, 4.5, zS + 7]],
      amb: { tick: 1, garden: 1 }
    });
    st._ticks = []; furnish(st, g, pf, slots, 1); return st;   // x.ticks は finishHome の update が回すので、ここでは家具の分だけ
  }
  /* 田畑の見える外（農家） */
  function fieldView(x, z0, y0) {
    const g = x.g, c = x.c, sp = K.seasonal(c), rng = U.rng(c.seed + 61);
    const yard = K.ground(14, sp.snowy ? P.snow : '#a89a80', y0 + 0.002, 6); yard.position.z = z0 + 5; g.add(yard);
    for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) { const f = K.plane(9.6, 7.6, K.mTex(K.tex.rep(K.tex.noise(sp.field, 0.12), 6, 5)), -24 + i * 10, y0 - 0.1, z0 + 14 + k * 8); g.add(f); }
    for (let i = 0; i < 7; i++) g.add(K.box(0.3, 0.18, 26, K.m(sp.snowy ? P.snow : '#7a6a4a'), -29 + i * 10, y0 - 0.12, z0 + 22));
    const shed = K.group(-6, y0, z0 + 6, 0.2); shed.add(K.box(4, 2.6, 3, K.m('#7a6a5a'), 0, 0, 0)); shed.add(K.box(4.4, 0.12, 3.4, K.m(sp.snowy ? P.snow : '#5a5f66'), 0, 2.6, 0)); g.add(shed); sp_(x, '納屋', [-6, 1.3, z0 + 6]);
    const tr = K.tree({ kind: 'broad', season: c.season, weather: c.weather, h: 6, seed: c.seed + 3 }); K.at(tr, 5, y0, z0 + 5); g.add(tr);
    g.add(K.ridge({ r: 160, hMin: 18, hMax: 50, color: sp.hill, seed: c.seed + 11, n: 40 })); g.add(K.ridge({ r: 230, hMin: 30, hMax: 70, color: sp.hillFar, seed: c.seed + 12, n: 40 }));
    sp_(x, '田んぼ', [0, 0.5, z0 + 20]);
  }
  /* マンションの居間（対面の台所、ソファ、大きな窓とベランダ） / 団地（狭い台所と畳の間） */
  function apartLiving(c, pf) {
    const x = ctx(c, pf), g = x.g, r = x.r, danchi = pf.kind === 'danchi';
    const W = danchi ? 4.8 : 6.0, D = danchi ? 4.2 : 5.0, Hh = danchi ? 2.35 : 2.45, zS = D / 2, zN = -zS;
    const floorM = danchi ? woodFloor(pf.pal.floor, 3, 3) : woodFloor(pf.pal.floor, 4, 4);
    g.add(K.room({ w: W, d: D, h: Hh, wall: wallMat(pf.pal.wall), floor: floorM, ceil: K.m('#f4f2ee'), base: K.m(danchi ? P.woodDark : '#f2f0ea'),
      openings: danchi ? [{ side: 'S', at: -W / 2 + 1.15, w: 1.5, y: 0, h: 2.05, kind: 'window' }, { side: 'S', at: W / 2 - 1.35, w: 2.0, y: 0, h: 2.05, kind: 'window' }]   // 団地は洋間と和室で窓が分かれ、あいだは壁（間仕切りがそこに当たる）
        : [{ side: 'S', at: 0, w: W - 0.8, y: 0, h: 2.05, kind: 'window' }] }));
    if (danchi) { const pf2 = tatamiFloor(3, 2); g.add(K.plane(2.7, 2.6, pf2, W / 2 - 1.35, 0.004, zS - 1.3)); g.add(K.box(0.05, 0.02, 2.6, K.m(P.woodDark), W / 2 - 2.7, 0, zS - 1.3)); g.add(K.box(0.06, 0.08, 2.6, K.m(P.woodDark), W / 2 - 2.7, 1.8, zS - 1.3)); const xL = W / 2 - 2.7, zB = zS - 2.6, wm = wallMat(pf.pal.wall), wd = K.m(P.woodDark); g.add(K.box(0.08, Hh - 1.88, 2.6, wm, xL, 1.88, zS - 1.3)); g.add(K.box(2.7, 0.08, 0.06, wd, W / 2 - 1.35, 1.8, zB)); g.add(K.box(2.7, Hh - 1.88, 0.08, wm, W / 2 - 1.35, 1.88, zB)); g.add(K.box(2.7, 0.02, 0.05, wd, W / 2 - 1.35, 0, zB)); g.add(K.box(0.09, Hh, 0.09, wd, xL, 0, zB)); }   // 続き間の和室: 鴨居の上の小壁と、角の柱       // 敷居と鴨居だけ（あいだは開いている）
    for (const cx0 of danchi ? [-W / 2 + 0.6, -0.65, 0.2, W / 2 - 0.55] : [-(W / 2 - 0.6), W / 2 - 0.6]) { const cu = K.curtain(danchi ? 0.36 : 0.5, 2.1, pf.pal.curtain); K.at(cu, cx0, 0.0, zS - 0.09); g.add(cu); }
    /* 台所 */
    let tx, tz;
    if (danchi) { const kk = K.kitchen(2.0); K.at(kk, -W / 2 + 1.1, 0, zN + 0.31); g.add(kk); const fr = K.fridge(); K.at(fr, -W / 2 + 2.5, 0, zN + 0.33); g.add(fr); tx = -1.2; tz = -0.4; }
    else {
      const kk = K.kitchen(2.4); K.at(kk, -W / 2 + 1.4, 0, zN + 0.31); g.add(kk); const fr = K.fridge(); K.at(fr, -W / 2 + 2.95, 0, zN + 0.33); g.add(fr);
      g.add(K.box(2.4, 0.95, 0.6, K.m('#e6e2da'), -W / 2 + 1.4, 0, zN + 1.4)); g.add(K.box(2.5, 0.04, 0.7, K.m('#f2f0ea', { rough: 0.3 }), -W / 2 + 1.4, 0.95, zN + 1.4)); sp_(x, '台所のカウンター', [-W / 2 + 1.4, 1.1, zN + 1.4]);
      for (let i = 0; i < 2; i++) { const st = K.stool(K.m(P.steelDark), 0.65); K.at(st, -W / 2 + 0.9 + i * 0.8, 0, zN + 1.95); g.add(st); }
      tx = -W / 2 + 1.5; tz = 0.6;
    }
    sp_(x, 'やかん', [danchi ? -W / 2 + 1.5 : -W / 2 + 1.8, 1.0, zN + 0.32]);
    const tbl = K.table(1.2, 0.8, 0.7, K.mTex(K.tex.rep(K.tex.wood(pf.pal.wood, 4), 1, 1))); K.at(tbl, tx, 0, tz); g.add(tbl);
    for (const [dx, dz, ry] of [[-0.28, -0.66, 0], [0.28, -0.66, 0], [-0.28, 0.66, PI], [0.28, 0.66, PI]]) { const ch = K.chair(K.m(danchi ? P.wood : '#3a3b40')); K.at(ch, tx + dx, 0, tz + dz, ry); g.add(ch); }
    const cup = K.cup(P.offwhite); K.at(cup, tx - 0.1, 0.7, tz - 0.2); g.add(cup); sp_(x, '食卓の湯のみ', [tx - 0.1, 0.85, tz - 0.2]);
    /* テレビとソファ（団地は畳の上に座卓） */
    if (danchi) {
      const lt = pf.kotatsu ? kotatsu(U.pick(r, ['#a8453a', '#4a5a7a'])) : K.table(0.9, 0.6, 0.34, K.m(P.woodDark)); K.at(lt, W / 2 - 1.3, 0, zS - 1.4); g.add(lt); sp_(x, pf.kotatsu ? 'こたつ' : '座卓', [W / 2 - 1.3, 0.45, zS - 1.4]);
      const tv = K.tv(0.7); K.at(tv, W / 2 - 0.25, 0.4, zS - 1.4, -PI / 2); g.add(tv); g.add(K.cabinet(0.9, 0.4, 0.4, K.m(P.woodDark)).translateX(W / 2 - 0.22).translateZ(zS - 1.4).rotateY(-PI / 2)); x.tvScr = tv.userData.screen.material; sp_(x, 'テレビ', [W / 2 - 0.3, 0.7, zS - 1.4]); g.add(K.cabinet(0.7, 0.42, 0.36, K.m(pf.pal.wood)).translateX(W / 2 - 0.2).translateZ(zS - 2.2).rotateY(-PI / 2)); sp_(x, '茶だんす', [W / 2 - 0.25, 0.6, zS - 2.2]);
    } else {
      const tvb = K.cabinet(1.8, 0.42, 0.42, K.m(U.pick(r, ['#3a3b40', P.woodDark, '#e6e2da']))); K.at(tvb, W / 2 - 0.24, 0, -0.4, -PI / 2); g.add(tvb);
      const tv = K.tv(1.2); K.at(tv, W / 2 - 0.26, 0.42, -0.4, -PI / 2); g.add(tv); x.tvScr = tv.userData.screen.material; sp_(x, 'テレビ', [W / 2 - 0.3, 0.9, -0.4]);
      const sofa = K.sofa(pf.pal.sofa); K.at(sofa, 0.5, 0, -0.4, PI / 2); g.add(sofa); sp_(x, 'ソファ', [0.5, 0.6, -0.4]);
      const rug = K.rug(1.8, 2.0, pf.pal.rug); K.at(rug, 1.6, 0, -0.4); g.add(rug);
      const lt = pf.kotatsu ? kotatsu(U.pick(r, ['#8a6a5a', '#5a6a7a'])) : K.table(1.0, 0.5, 0.36, K.m(P.woodDark)); K.at(lt, 1.6, 0, -0.4, PI / 2); g.add(lt);
      const ac = K.box(0.85, 0.28, 0.24, K.m('#f2f2ee', { rough: 0.4 }), 0.6, Hh - 0.4, zN + 0.14); g.add(ac); sp_(x, 'エアコン', [0.6, Hh - 0.3, zN + 0.2]);
      const pl = Hs().plant(1.3, '#e6e2da', P.leaf); K.at(pl, W / 2 - 0.4, 0, zS - 0.5); g.add(pl);
    }
    const ck = K.wallClock(c.hour); K.at(ck, 0.4, 1.95, zN + 0.04, 0); g.add(ck); x.clock = ck; sp_(x, '壁の時計', [0.4, 1.95, zN + 0.1]);
    const cal = K.calendar(); K.at(cal, 1.3, 1.25, zN + 0.02); g.add(cal);
    const door = K.door(); K.at(door, W / 2 - 0.7, 0, zN + 0.02); g.add(door);
    const ph = K.photo(0.2, 0.15); K.at(ph, W / 2 - 0.3, 0.75, danchi ? zS - 2.0 : -1.3, -PI / 2 + 0.3); g.add(ph); sp_(x, '写真立て', [W / 2 - 0.3, 0.85, danchi ? zS - 2.0 : -1.3]);
    for (let i = 0; i < 2; i++) { const l = danchi ? K.ceilingLamp('cool') : K.ceilingLamp(); K.at(l, i ? 1.4 : tx, Hh, i ? -0.4 : tz); l.userData.power = i ? 7 : 8; g.add(l); x.lamps.push(l); }
    S.fill(g, x.fills, 0, 2.1, zS - 0.9, 12, 9);
    const y0 = -3 * pf.floorN - 0.2;
    balcony(x, W, zS, y0, pf.kind);
    sp_(x, 'ベランダ', [0, 1.2, zS + 0.9]); sp_(x, '窓の外の町', [0, 1.4, zS + 8]);
    const slots = { floorA: [W / 2 - 0.5, 0, zS - 0.45], floorB: [danchi ? -1.3 : -0.3, 0, zS - 0.5], table: [tx + 0.15, 0.7, tz + 0.1], table2: [tx - 0.3, 0.7, tz + 0.15], shelf: [W / 2 - 0.25, 0.42, danchi ? zS - 2.2 : -1.15], shelf2: [-W / 2 + 0.6, 0.95, zN + 0.35], window: [0.4, 2.0, zS - 0.08], floorKid: [0.3, 0, zN + 1.1], wall: [-0.4, 1.5, zN + 0.02], wallFloor: [W / 2 - 0.4, 0, zS - 1.6, -PI / 2] };
    const st = finishHome(x, {
      label: danchi ? '団地の部屋' : 'マンションの部屋', center: [0, 0, 1.2],
      anchors: {
        sit: { p: [tx - 0.28, 1.17, tz - 0.62], look: [tx + 0.6, 0.95, zS + 3], lim: { yaw: 140, up: 55, down: 60 }, body: 'sit' },
        stand: { p: [0, 1.52, zN + 1.0], look: [0.4, 1.0, zS + 3], lim: { yaw: 150, up: 55, down: 55 }, body: 'stand' },
        lie: { p: [0.4, 0.26, 1.2], look: [0.6, 1.2, zS + 3], lim: { yaw: 110, up: 75, down: 12 }, body: 'none', ground: 0 }
      },
      body: { sit: { sleeve: '#8d8a84', legs: '#4c4f58' }, stand: { sleeve: '#8d8a84' } },
      walk: { y: 0, rects: [[-W / 2, zN, W / 2, zS]], start: [0, zN + 1.0] },
      meet: [{ p: [W / 2 - 0.7, 0, zN + 0.5], ry: 0 }],
      visit: [{ p: [tx + 0.28, 0, tz + 0.66], ry: PI, pose: 'sit', seat: 0.44 }, { p: [W / 2 - 0.7, 0, zN + 0.5], ry: 0 }],
      companion: { sit: { p: [tx - 0.28, 0, tz + 0.66], ry: PI, pose: 'sit', seat: 0.44 }, stand: { p: [tx + 0.28, 0, tz - 0.66], ry: 0.5, pose: 'sit', seat: 0.44 }, lie: { p: [1.0, 0, 0.6], ry: 1.1, pose: 'seiza' } },
      weatherBox: [[-12, y0, zS + 1.4], [12, 10, zS + 16]], dustBox: [[-1.5, 0.2, -1], [1.5, 2.0, zS]], amb: { tick: 1, traffic: danchi ? 0.15 : 0.3 }
    });
    st._ticks = []; furnish(st, g, pf, slots, 1); return st;   // x.ticks は finishHome の update が回すので、ここでは家具の分だけ
  }
  /* ワンルーム（ベッド・座卓・小さな台所。ロフトがあることも） */
  function oneRoom(c, pf, bedFirst) {
    const x = ctx(c, pf), g = x.g, r = x.r, loft = /ロフト/.test(pf.text);
    const W = 3.4, D = 4.8, Hh = loft ? 3.6 : 2.45, zS = D / 2, zN = -zS;
    g.add(K.room({ w: W, d: D, h: Hh, wall: wallMat(pf.pal.wall), floor: woodFloor(pf.pal.floor, 2, 3), ceil: K.m('#f4f2ee'), base: K.m('#f2f0ea'), openings: [{ side: 'S', at: 0, w: 1.8, y: 0, h: 2.0, kind: 'window' }] }));
    for (const sx of [-1, 1]) { const cu = K.curtain(0.42, 2.0, pf.pal.curtain); K.at(cu, sx * 1.05, 0.02, zS - 0.09); g.add(cu); }
    const bed = K.bed({ w: 0.95, l: 1.95, h: 0.42, sheet: K.m(P.sheet) }); K.at(bed, -W / 2 + 0.5, 0, zS - 1.3, PI); g.add(bed); sp_(x, 'ベッド', [-W / 2 + 0.5, 0.6, zS - 1.3]);   // 枕は奥（戸口側）、足は窓に向ける
    const lt = pf.kotatsu ? kotatsu(U.pick(r, ['#5a6a7a', '#8a6a5a', '#3a3b40'])) : K.table(0.75, 0.55, 0.34, K.m(U.pick(r, ['#e6e2da', P.woodLight, '#3a3b40']))); K.at(lt, 0.55, 0, 0.2); g.add(lt); sp_(x, pf.kotatsu ? 'こたつ' : 'ローテーブル', [0.55, 0.45, 0.2]); { const ty = pf.kotatsu ? 0.39 : 0.34; g.add(K.cyl(0.04, 0.09, K.m(U.pick(r, ['#c8392b', '#2f4a6a', '#e8e2d0', '#3a3b40']), { rough: 0.4 }), 0.8, ty, 0.3, { seg: 16 })); const rm = K.box(0.05, 0.02, 0.17, K.m('#2a2a2a', { rough: 0.5 }), 0.35, ty, 0.12); rm.rotation.y = 0.4; g.add(rm); g.add(K.box(0.075, 0.008, 0.15, K.m('#1e1e20', { rough: 0.3 }), 0.55, ty, 0.42)); }   // マグカップ、リモコン、スマホ
    const rug = K.rug(1.4, 1.4, pf.pal.rug); K.at(rug, 0.55, 0, 0.2); g.add(rug);
    const tvr = K.cabinet(0.8, 0.4, 0.35, K.m(U.pick(r, ['#3a3b40', '#e6e2da', P.woodLight]))); K.at(tvr, W / 2 - 0.2, 0, 0.2, -PI / 2); g.add(tvr);
    const tv = K.tv(0.6); K.at(tv, W / 2 - 0.22, 0.4, 0.2, -PI / 2); g.add(tv); x.tvScr = tv.userData.screen.material; sp_(x, 'テレビ', [W / 2 - 0.25, 0.7, 0.2]);
    /* 戸口わきの小さな台所と冷蔵庫 */
    const kk = new T.Group(); kk.add(K.box(1.4, 0.85, 0.55, K.m('#e6e2da'), 0, 0, 0)); kk.add(K.box(1.42, 0.03, 0.57, K.m(P.steel, { metal: 0.5, rough: 0.35 }), 0, 0.85, 0)); kk.add(K.box(0.4, 0.02, 0.3, K.m('#1e1e20'), 0.35, 0.88, 0)); kk.add(K.box(0.4, 0.02, 0.32, K.m(P.steelDark, { metal: 0.5 }), -0.3, 0.87, 0)); K.at(kk, W / 2 - 0.75, 0, zN + 0.3); g.add(kk);
    const fr = new T.Group(); fr.add(K.box(0.5, 0.9, 0.5, K.m(U.pick(r, ['#e8e6e0', '#3a3b40'])), 0, 0, 0)); K.at(fr, -W / 2 + 0.3, 0, zN + 0.3); g.add(fr); sp_(x, '小さな冷蔵庫', [-W / 2 + 0.3, 0.7, zN + 0.3]);
    const door = K.door(K.m('#9aa0a4', { metal: 0.3 }), 0.8, 2.0); K.at(door, 0.4 - 0.4, 0, zN + 0.02); door.position.x = -0.5; g.add(door); sp_(x, 'ドア', [-0.5, 1.2, zN + 0.1]);
    if (loft) { const lf = K.box(W, 0.12, 1.8, K.m(pf.pal.floor), 0, 2.3, zN + 0.9); g.add(lf); g.add(K.box(W, 0.6, 0.04, K.m('#f2f0ea'), 0, 2.42, zN + 1.8)); const lad = new T.Group(); for (const s2 of [-1, 1]) lad.add(K.rod([s2 * 0.2, 0, 0.2], [s2 * 0.2, 2.42, -0.05], 0.02, K.m(P.woodLight))); for (let i = 1; i < 7; i++) lad.add(K.box(0.42, 0.03, 0.05, K.m(P.woodLight), 0, i * 0.34, 0.2 - i * 0.035)); K.at(lad, W / 2 - 0.45, 0, zN + 1.95); g.add(lad); g.add(K.futon ? K.futon().translateY(2.42).translateZ(zN + 0.9) : new T.Group()); sp_(x, 'ロフト', [0, 2.6, zN + 0.9]); }
    const ac = K.box(0.75, 0.26, 0.22, K.m('#f2f2ee', { rough: 0.4 }), 0.6, Math.min(Hh, 2.45) - 0.35, zN + 0.12); g.add(ac); sp_(x, 'エアコン', [0.6, 2.2, zN + 0.2]);
    const ck = K.wallClock(c.hour); K.at(ck, W / 2 - 0.04, 1.9, -1.0, -PI / 2); g.add(ck); x.clock = ck;
    const lamp = K.ceilingLamp('cool'); K.at(lamp, 0.2, Math.min(Hh, 2.45), 0.2); lamp.userData.power = 7; g.add(lamp); x.lamps.push(lamp);
    S.fill(g, x.fills, 0, 2.0, zS - 0.8, 9, 7);
    const y0 = -3 * pf.floorN - 0.2; balcony(x, W, zS, y0, 'oneroom');
    sp_(x, '窓の外', [0, 1.4, zS + 6]);
    const slots = { floorA: [W / 2 - 0.4, 0, zS - 0.5], floorB: [0.4, 0, -1.2], table: [0.6, pf.kotatsu ? 0.39 : 0.34, 0.25], table2: [0.4, pf.kotatsu ? 0.39 : 0.34, 0.1], shelf: [W / 2 - 0.2, 0.4, 0.55], shelf2: [-W / 2 + 0.3, 0.9, zN + 0.3], window: [0.0, 1.98, zS - 0.08] };
    const sit = { p: [0.55, 0.82, -0.45], look: [0.6, 0.6, zS + 3], lim: { yaw: 140, up: 60, down: 62 }, body: 'sit', ground: 0 };
    const st = finishHome(x, {
      label: '自宅の部屋', shadow: 7, center: [0, 0, 0.6],
      anchors: { sit, stand: { p: [0.3, 1.52, zN + 0.9], look: [0.2, 1.0, zS + 3], lim: { yaw: 150, up: 55, down: 55 }, body: 'stand' }, lie: bedFirst ? { p: [-W / 2 + 0.5, 0.72, zS - 1.3 - 0.57], look: [0.3, 1.15, zS + 2], lim: { yaw: 105, up: 62, down: 22 }, body: 'lie' } : { p: [0.6, 0.26, -0.9], look: [0.4, 1.2, zS + 2], lim: { yaw: 110, up: 75, down: 12 }, body: 'none', ground: 0 } },
      body: { lie: { blanket: pf.pal.blanket, sleeve: '#a9b4c2' }, sit: { sleeve: '#8d8a84', legs: '#4c4f58' }, stand: { sleeve: '#8d8a84' } },
      walk: { y: 0, cell: 0.1, rects: [[-W / 2, zN, W / 2, zS]], start: [0.3, zN + 0.9] },
      meet: [{ p: [-0.5, 0, zN + 0.5], ry: 0 }], visit: [{ p: [0.55, 0, 0.82], ry: PI, pose: 'seiza' }, { p: [-0.5, 0, zN + 0.5], ry: 0 }],
      companion: { sit: { p: [0.55, 0, 0.82], ry: PI, pose: 'seiza' }, stand: { p: [1.1, 0, 0.2], ry: -PI / 2, pose: 'seiza' }, lie: { p: [0.4, 0, 0.0], ry: -2.4, pose: 'seiza' } },
      weatherBox: [[-10, y0, zS + 1.4], [10, 9, zS + 14]], dustBox: [[-1, 0.2, -1], [1, 2.0, zS]], amb: { tick: 0.8, traffic: 0.3 }
    });
    st._ticks = []; furnish(st, g, pf, slots, 1); return st;   // x.ticks は finishHome の update が回すので、ここでは家具の分だけ
  }
  /* 布団を敷いた和室の寝室（古い家・農家） */
  function futonRoom(c, pf, apt) {
    const x = ctx(c, pf), g = x.g, r = x.r, y0 = apt ? -3 * pf.floorN - 0.2 : -0.45;   // apt: 集合住宅の和室（窓の外は居間と同じ階の高さ）
    const W = 3.64, D = 3.64, Hh = 2.4, zS = D / 2, zN = -zS;
    g.add(K.room({ w: W, d: D, h: Hh, wall: wallMat(pf.pal.plaster, 3), floor: tatamiFloor(2, 4), ceil: K.mTex(K.tex.rep(K.tex.wood(P.woodLight, 6), 2, 1)), frame: K.m(P.woodDark), base: false, openings: [{ side: 'S', at: 0.3, w: 1.8, y: 0.8, h: 1.0, kind: 'shoji' }] }));
    const shT = K.tex.rep(K.tex.shoji(), 1, 1), shM = new T.MeshStandardMaterial({ map: shT, emissiveMap: shT, emissive: new T.Color('#fff3dc'), emissiveIntensity: 0.25, roughness: 0.9, side: T.DoubleSide });
    for (const s2 of [-1, 1]) g.add(K.box(0.9, 1.0, 0.025, shM, 0.3 + s2 * 0.45, 0.8, zS - 0.02));
    const fut = K.futon(pf.pal.blanket); K.at(fut, -0.5, 0, -0.2, PI); g.add(fut); sp_(x, '布団', [-0.5, 0.2, -0.2]);
    const fus = Hs().textTex([' '], { w: 64, h: 128, bg: '#e2d8c0', fg: '#e2d8c0' }); for (let i = 0; i < 2; i++) g.add(K.box(0.88, 1.75, 0.03, Hs().texMat(fus), -W / 2 + 0.5 + i * 0.9, 0.02, zN + 0.03)); sp_(x, '押し入れのふすま', [-W / 2 + 0.95, 1.0, zN + 0.1]);
    const ts = K.cabinet(0.9, 1.0, 0.42, K.m(P.wood)); K.at(ts, W / 2 - 0.24, 0, -0.6, -PI / 2); g.add(ts); sp_(x, 'たんす', [W / 2 - 0.3, 1.0, -0.6]);
    const lampS = Hs().pendant({ kind: 'washi', power: 5, len: 0.3 }); K.at(lampS, 0, Hh, 0); g.add(lampS); x.lamps.push(lampS);
    const ck = K.wallClock(c.hour); K.at(ck, W / 2 - 0.04, 1.95, 0.6, -PI / 2); g.add(ck); x.clock = ck; sp_(x, '壁の時計', [W / 2 - 0.1, 1.95, 0.6]);
    const sp2 = K.cyl(0.1, 0.06, K.m(P.offwhite), 0.6, 0, -1.2); g.add(sp2); const gl = K.cup(P.glass, 0.1); K.at(gl, 0.65, 0.06, -1.2); g.add(gl); sp_(x, '枕もとの水差し', [0.6, 0.15, -1.2]);
    S.fill(g, x.fills, 0.3, 1.5, zS - 0.5, 6, 6);
    if (apt) balcony(x, W, zS, y0, pf.kind); else S.neighborhood(g, c, zS, -0.45, x.lamps);
    const slots = { floorA: [W / 2 - 0.5, 0, zS - 0.5], floorB: [0.9, 0, 0.9], table2: [0.6, 0.06, -1.0], shelf: [W / 2 - 0.3, 1.0, -0.4], shelf2: [W / 2 - 0.3, 1.0, -0.85], window: [0.3, 1.78, zS - 0.06] };
    const st = finishHome(x, {
      label: '自宅の寝室', shadow: 8, center: [0, 0, 0.6],
      anchors: { lie: { p: [-0.5, 0.36, -0.95], look: [0.2, 1.0, zS + 2], lim: { yaw: 105, up: 62, down: 24 }, body: 'lie' }, sit: { p: [0.5, 0.82, 0.5], look: [-1.0, 0.55, -1.2], lim: { yaw: 140, up: 60, down: 62 }, body: 'sit', ground: 0 }, stand: { p: [0.8, 1.5, 0.9], look: [-0.5, 0.6, -0.4], lim: { yaw: 150, up: 55, down: 60 }, body: 'stand' } },
      body: { lie: { blanket: pf.pal.blanket, sleeve: '#a9b4c2' }, sit: { sleeve: '#a9b4c2', legs: '#8b96a6' }, stand: { sleeve: '#a9b4c2' } },
      walk: { y: 0, rects: [[-W / 2, zN, W / 2, zS]], start: [0.8, 0.9] },
      visit: [{ p: [0.35, 0, -0.5], ry: -2.2, pose: 'seiza' }, { p: [-0.5, 0, 1.0], ry: PI, pose: 'seiza' }],
      companion: { lie: { p: [0.4, 0, -0.4], ry: -2.0, pose: 'seiza' }, sit: { p: [-0.4, 0, 0.9], ry: PI, pose: 'seiza' }, stand: { p: [0.4, 0, -0.4], ry: -2.0, pose: 'seiza' } },
      weatherBox: [[-10, y0, zS + (apt ? 1.4 : 0.5)], [10, 9, zS + 14]], dustBox: [[-1, 0.2, -1], [1, 1.8, zS]], amb: apt ? { tick: 1, traffic: 0.3 } : { tick: 1, garden: 0.5 }
    });
    st._ticks = []; furnish(st, g, pf, slots, 1); return st;   // x.ticks は finishHome の update が回すので、ここでは家具の分だけ
  }
  /* マンション・団地・ワンルームの和室（窓の外は町） */
  function apartWashitsu(c, pf) {
    const st = futonRoom(c, pf, true);
    st.label = '自宅の和室';
    return st;
  }

  /* ================= 入口 ================= */
  function safe(fn, fallback, c) { try { return fn(); } catch (e) { if (window.console) console.error('家の作り分けに失敗', e); return fallback(c); } }
  S.living = function (c) {
    const pf = SI.homeProfile(c);
    if (pf.kind === 'old') return withTicks(safe(() => oldLiving(c, pf, false), orig.living, c));
    if (pf.kind === 'farm') return withTicks(safe(() => oldLiving(c, pf, true), orig.living, c));
    if (pf.kind === 'mansion' || pf.kind === 'danchi') return withTicks(safe(() => apartLiving(c, pf), orig.living, c));
    if (pf.kind === 'oneroom') return withTicks(safe(() => oneRoom(c, pf, false), orig.living, c));
    /* 一戸建て: 元の居間を、家ごとの色・左右・小物で変える */
    return withTicks(safe(() => {
      const st = orig.living(Object.assign({}, c, { pal: pf.pal, noLowTable: !!pf.kotatsu }));
      const W = 5.4, D = 4.6, zS = D / 2, inner = st.group;
      st._ticks = [];
      if (pf.kotatsu) { const kt = kotatsu(U.pick(pf.rng, ['#a8453a', '#4a5a7a', '#7a5a3a'])); K.at(kt, 1.55, 0, 0.85); inner.add(kt); inner.add(K.box(0.05, 0.02, 0.16, K.m(P.black), 1.45, 0.39, 0.62)); st.spots.push([1.55, 0.45, 0.85]); st.spotNames.push('こたつ'); }
      furnish(st, inner, pf, { floorA: [W / 2 - 0.5, 0, zS - 0.45], floorB: [-0.2, 0, zS - 0.6], table: [-0.75, 0.7, -0.1], table2: [-1.15, 0.7, -0.05], shelf: [-W / 2 + 0.17, 1.5, 1.5], shelf2: [-W / 2 + 0.17, 1.13, 1.05], window: [0.9, 2.02, zS - 0.12], floorKid: [-0.1, 0, 1.6], wall: [-W / 2 + 0.03, 1.6, 0.2, PI / 2], wallFloor: [-W / 2 + 0.35, 0, -0.05, PI / 2] }, 1);
      return pf.mirror < 0 ? mirrorStage(st) : st;
    }, orig.living, c));
  };
  S.bedroom = function (c) {
    const pf = SI.homeProfile(c);
    if (pf.kind === 'oneroom') return withTicks(safe(() => { const st = oneRoom(c, pf, true); st.label = '自宅の部屋'; return st; }, orig.bedroom, c));
    if ((pf.kind === 'old' || pf.kind === 'farm') && pf.age >= 40) return withTicks(safe(() => futonRoom(c, pf), orig.bedroom, c));
    return withTicks(safe(() => {
      const st = orig.bedroom(Object.assign({}, c, { pal: pf.pal })), inner = st.group, W = 3.6, D = 4.0, zS = D / 2;
      st._ticks = [];
      if (pf.age <= 18) {
        /* 子ども部屋: 机の明かり、ランドセルやかばん、壁の貼り紙、本棚 */
        const H = Hs();
        for (let i = 0; i < 3; i++) { const pp = H.vplane(0.42, 0.56, K.m(U.pick(pf.rng, ['#e8452f', '#2f6fd6', '#3aa86b', '#f6d13c', '#8a5ad0']), { rough: 0.8 }), -W / 2 + 0.02, 1.6, -0.6 + i * 0.55, PI / 2); inner.add(pp); }
        const bk = K.shelf(0.8, 1.2, 0.28, K.m('#e6e2da'), 4); K.at(bk, W / 2 - 0.2, 0, 1.6, -PI / 2); inner.add(bk); inner.add(H.vplane(0.75, 1.1, H.texMat(H.goodsTex('books', (c.seed || 1) + 4)), W / 2 - 0.22, 0.6, 1.6, -PI / 2));
        const dl = new T.Group(); dl.add(K.cyl(0.07, 0.02, K.m('#3a3b40'), 0, 0, 0)); dl.add(K.rod([0, 0.02, 0], [0.05, 0.32, 0], 0.008, K.m('#3a3b40'))); dl.add(K.rod([0.05, 0.32, 0], [0.18, 0.36, 0], 0.008, K.m('#3a3b40'))); const sh2 = K.cyl(0.04, 0.08, K.m('#f2f0ea', { emissive: '#fff2d8', ei: 0.3 }), 0.2, 0.28, 0, { rTop: 0.02 }); dl.add(sh2); K.at(dl, -W / 2 + 0.2, 0.7, 1.45, 0.4); inner.add(dl);
        const bag = K.box(0.3, 0.36, 0.2, K.m(U.pick(pf.rng, ['#c8392b', '#2a2a2a', '#2f3b55']), { rough: 0.4 }), -W / 2 + 0.85, 0, 0.7); inner.add(bag);
        st.spots.push([-W / 2 + 0.05, 1.6, -0.05], [W / 2 - 0.25, 0.8, 1.6]); st.spotNames.push('壁の貼り紙', '本棚');
      }
      furnish(st, inner, pf, { floorA: [W / 2 - 0.45, 0, zS - 0.45], floorB: [-0.2, 0, 1.6], table2: [0.42, 0.5, -1.72], shelf: [-W / 2 + 0.3, 0.72, 1.35], shelf2: [0.25, 0.5, -1.62], window: [0.35, 2.02, zS - 0.12] }, 1);
      return pf.mirror < 0 ? mirrorStage(st) : st;
    }, orig.bedroom, c));
  };
  S.washitsu = function (c) {
    const pf = SI.homeProfile(c);
    if (pf.kind === 'mansion' || pf.kind === 'danchi' || pf.kind === 'oneroom') return withTicks(safe(() => apartWashitsu(c, pf), orig.washitsu, c));
    return withTicks(safe(() => {
      const st = orig.washitsu(Object.assign({}, c, { pal: pf.pal })), inner = st.group, W = 3.64, zS = 1.82;
      st._ticks = [];
      furnish(st, inner, pf, { floorA: [1.1, 0, zS - 0.4], floorB: [-1.4, 0, -0.2], table: [-1.15, 0.32, 1.1], table2: [-1.3, 0.32, 0.95], shelf: [W / 2 - 0.3, 1.05, -1.0], shelf2: [W / 2 - 0.3, 1.05, -1.45], window: [0.6, 1.76, zS + 0.05] }, 1);
      return st;
    }, orig.washitsu, c));
  };
  S.bath = function (c) {
    const pf = SI.homeProfile(c), old = /ふろがま|風呂釜|バランス釜|古い/.test(pf.text) || pf.kind === 'old' || pf.kind === 'farm', unit = !old && (pf.kind === 'mansion' || pf.kind === 'oneroom');
    return withTicks(safe(() => {
      const pal = Object.assign({}, pf.pal, { tile: old ? U.pick(pf.rng, ['#7fa8b8', '#9ab8a8', '#b9cfd6']) : (unit ? '#ece6da' : pf.pal.tile) });
      const st = orig.bath(Object.assign({}, c, { pal })), inner = st.group;
      st._ticks = [];
      if (old) {
        /* 古いふろがま（浴槽のわきの箱と、外へ出る筒） */
        const gm = new T.Group(); gm.add(K.box(0.42, 0.7, 0.36, K.m('#d9d6cc', { rough: 0.5 }), 0, 0, 0)); gm.add(K.box(0.1, 0.06, 0.02, K.m('#3a2a20', { emissive: '#ff8a3a', ei: 0.3 }), 0, 0.34, 0.181)); gm.add(K.cyl(0.04, 0.03, K.m(P.dark), 0.12, 0.5, 0.18)); gm.add(K.cyl(0.06, 1.3, K.m('#b9bcbf', { metal: 0.4 }), 0, 0.7, -0.05));
        K.at(gm, -0.1, 0, 0.75); inner.add(gm); st.spots.push([-0.1, 0.6, 0.75]); st.spotNames.push('ふろがま');
        if (/注意書き/.test(pf.text)) { const H = Hs(); const lb = H.vplane(0.28, 0.2, H.texMat(H.textTex(['使用中は', '換気扇を回さ'], { w: 256, h: 180, bg: '#efe6c8', fg: '#5a4a3a', font: 'gothic' })), -0.1, 1.0, 0.94); lb.rotation.y = 0; inner.add(lb); st.spots.push([-0.1, 1.0, 0.95]); st.spotNames.push('注意書き'); }
        const lid = K.box(0.6, 0.03, 0.5, K.m('#c9a46e', { rough: 0.7 }), -0.6, 0.58, -0.9); inner.add(lid);
      } else if (unit) {
        inner.traverse(o => { if (o.isMesh && o.material && o.material.map && o.material.map.image && o.geometry && o.geometry.type === 'BoxGeometry') { /* ユニットバスは継ぎ目の少ない壁 */ } });
      }
      return st;
    }, orig.bath, c));
  };
})(window.SI);
