'use strict';
/* 最期の一日 — ドラマの「動き」（46_drama.js の Drama に足す）。
   語りの文にある行動を、視点の動きにする。
   - 場面に入るとき: 座る場面は、部屋の離れた所から歩いて行って腰をおろす。立つ場面は、歩いて持ち場へ。寝ている場面は、天井を見上げてから窓へ。
   - 文ごとに: 出てくる物（時計、窓、信号…）や人のほうを見る。歩く・向かう・渡る なら歩く。座る・立ち上がる、振り向く、見上げる・うつむく、手を… も。
   - 最期の直前: 異変の前の行でも動く。異変の瞬間には、迫る車のライトや、目の前に現れる人影を見せる（むごい映像にはしない）。
   歩くときは、自由歩行（21_rig.js の free）の上を、歩ける範囲（25_nav.js）のマス目で道を探して進む。 */
(function (SI) {
  const T = window.THREE, U = SI.U, K = SI.Kit, D = SI.Drama.prototype;
  const v1 = new T.Vector3(), v2 = new T.Vector3();

  const MOVE = /(歩く|歩いて|歩き出|歩きだ|向かう|向かって|へ出る|へ出て|に出る|に出て|を出る|を出て|近づく|近づいて|戻る|戻って|渡る|渡って|渡り|進む|進んで|下りる|へ入る|に入る|へ入って|に入って|に寄る|に寄って|へ寄る)/;
  const SIT = /(座る|座って|腰をおろ|腰かけ)/;
  const STANDUP = /(立ち上が|起き上が)/;
  const TURN = /(振り向|振り返|うしろを見)/;
  const UP = /(見上げ|空を|空が|天井)/;
  const DOWN = /(うつむ|足もと|見下ろ)/;
  const HAND = /(手の甲|手のひら|手を|指で|指先|握る|握って|持つ|持って|取る|取って|置く|置いて|のせる|押しこむ|渡す|ふたを|拾う|なでる|洗う|書く|貼る|しまう|結ぶ)/;
  const EAT = /(食べる|食べて|食べた|すする|すすって|飲む|飲んで|飲みほ|かじる|かじって|ほおば|口に運|はがす|はがれ)/;
  /* 本人の動きでない文（「痛みが走る」「湯気が立ち上がる」「目に入る」）では動かない。動詞のすぐ前に「が」があれば、主語は物かほかの人 */
  const NOTME = /(目に入|耳に入|気に入|手に入|声をかけ|年を取|手を振る人|手を振っている|こちらを振)/;
  const mine = (re, sn) => { const m = re.exec(sn); if (!m || NOTME.test(sn)) return false; return !/が/.test(sn.slice(Math.max(0, m.index - 3), m.index)); };
  const NOUNS = ['時計', 'テレビ', '窓', 'カーテン', '写真', '花', '湯のみ', 'やかん', '冷蔵庫', '流し', '台所', '食卓', 'ソファ', '棚', '本棚', '机', 'パソコン', 'ドア', '扉', '玄関', '庭', '信号', '横断歩道', 'バス', '電車', '線路', '海', '波', '川', '畑', '鏡', 'ベッド', '布団', '枕', '仏壇', '障子', '縁側', '暦', 'カレンダー', '電話', '掲示板', '看板', 'のれん', '品書き', 'レジ', 'カウンター', '景色', '道', 'つり革', '広告', 'ミラー', 'ダッシュボード', '灯籠', '洗濯物', 'ビル', 'ホワイトボード', '書類', '植物', '座布団', '急須'];
  const FOLKWORD = /(主人|同僚|客|子ども|学生|乗客|仕事仲間|運転手|看護師|店員|男|女|人が|人の)/;
  /* ほかの人の動き。主語がその人のとき（「店の主人が、そば湯を置いていく」） */
  const COME = /(置いて|置く|置いた|並べ|渡す|渡して|渡され|差し出|手渡|持ってく|持って来|運んで|運んでく|やって来|近づいてく|寄ってく|声をかけ|話しかけ|のぞきこ|来る。|来た。|来て、)/;
  const GIVE = /(渡す|渡して|渡され|差し出|手渡)/;
  const PUT = /(置いて|置く|置いた|並べ|運んで|運んでく)/;
  const NOD = /(笑う|笑って|笑った|ほほえ|うなず|手を振|会釈|頭を下げ|おじぎ)/;
  const CROUCH = /(しゃがむ|しゃがんで|しゃがみ|身をかがめ|かがんで|かがみこ|ひざをつ|膝をつ)/;
  const EXITS = ['ドア', '玄関', '戸口', 'のれん', '扉', '出口', '改札', '門'];
  /* 手に持つ・卓に置かれる物 */
  const PROPS = [
    [/(湯のみ|お茶|茶を|麦茶|そば湯|コーヒー|カップ|紅茶|白湯|ほうじ茶|緑茶)/, 'cup'],
    [/(茶わん|どんぶり|ラーメン|うどん|そばを|ざるそば|みそ汁|ごはん|雑炊|おかゆ|カレー)/, 'bowl'],
    [/(皿|トースト|ケーキ|菓子|まんじゅう|草もち|せんべい|ようかん)/, 'plate'],
    [/(スマートフォン|スマホ|携帯)/, 'phone'],
    [/(新聞|手紙|書類|メモ|はがき|年賀状|伝票|レシート|領収書|付箋|資料|チラシ|紙)/, 'paper'],
    [/(本を|文庫|手帳|ノート|背表紙|雑誌|アルバム|絵本)/, 'book'],
    [/(缶|ビール|水筒|ペットボトル|ジュース|牛乳|瓶)/, 'can'],
    [/(弁当)/, 'bento'],
    [/(おにぎり|にぎりめし|あんパン|パン|りんご|みかん)/, 'food'],
    [/(鍵を|かぎを)/, 'key']
  ];
  const norm = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  const fast = () => U.speed > 1000;                // 試験のときは、動きを一瞬で済ませる

  /* ---------- 毎フレーム（50_director.js の update から） ---------- */
  D.update = function (dt) {
    this.dbgShow(dt);
    if (this.tk.aborted) { if (this.mv || this.gl || this.fw) this.abortMotion(); return; }
    if (!this.running) return;
    const rig = this.rig, g = this.gl;
    this.folkStep(dt);
    if (g) {
      g.t += dt;
      const k = U.smooth(Math.min(1, g.t / g.dur));
      rig.pos.lerpVectors(g.from, g.to, k);
      if (g.yaw != null) { rig.baseYaw = g.yaw0 + g.dyaw * k; rig.uYaw = rig.tYaw = 0; rig.uPitch = rig.tPitch = g.p0 + (g.p1 - g.p0) * k; }
      rig.headT.p = -0.28 * Math.sin(Math.PI * k);                 // 腰をおろす・立ち上がるとき、上体が一度前へかがむ
      if (k >= 1) { this.gl = null; rig.headT.p = 0; g.done(true); }
    }
    const m = this.mv;
    if (m && rig.free) {
      m.t += dt;
      const last = m.i === m.pts.length - 1, p = m.pts[m.i];
      const dx = p.x - rig.pos.x, dz = p.z - rig.pos.z, d = Math.hypot(dx, dz);
      if (d < (last ? 0.16 : 0.38)) {
        m.i++;
        if (m.i >= m.pts.length) { this.stopWalk(true); return; }
      } else {
        const diff = norm(Math.atan2(-dx, -dz) - (rig.baseYaw + rig.uYaw));
        rig.tYaw += diff * Math.min(1, dt * 4.5);                    // 行く先へ顔を向けながら
        rig.tPitch += (-0.12 - rig.tPitch) * Math.min(1, dt * 3);     // 少し足もとを見て歩く
        rig.stick.x = 0; rig.stick.y = Math.abs(diff) > 1.1 ? 0.15 : (last && d < 0.9 ? 0.5 : 1);
      }
      if (m.t - m.ct > 1.3) {                                         // 何かにつかえて進めない
        if (Math.hypot(rig.pos.x - m.cx, rig.pos.z - m.cz) < 0.08) { this.stopWalk(false); return; }
        m.ct = m.t; m.cx = rig.pos.x; m.cz = rig.pos.z;
      }
      if (m.t > m.max) this.stopWalk(false);
    }
  };
  /* 確認用（?dbg=1）: 視点の向きと動きの状態を、左上に出す */
  D.dbgShow = function (dt) {
    const q = this.app.q; if (!q || !q.get('dbg')) return;
    this._dbgT = (this._dbgT || 0) + dt; if (this._dbgT < 0.25) return; this._dbgT = 0;
    let el = document.getElementById('dramaDbg');
    if (!el) { el = document.createElement('pre'); el.id = 'dramaDbg'; el.style.cssText = 'position:fixed;left:8px;top:120px;z-index:99;color:#9f9;font:12px monospace;background:rgba(0,0,0,.6);padding:4px;pointer-events:none;margin:0'; document.body.appendChild(el); }
    const r = this.rig, d = (x) => (x * 180 / Math.PI).toFixed(0);
    el.textContent = 'run ' + this.running + ' free ' + !!r.free + ' path ' + !!r.path + ' walk ' + !!this.mv + ' gl ' + !!this.gl + '\nview ' + d(r.viewYaw()) + ' base ' + d(r.baseYaw) + ' u ' + d(r.uYaw) + ' t ' + d(r.tYaw) + ' p ' + d(r.uPitch) + '\nendYaw ' + (this.endYaw != null ? d(this.endYaw) : '-') + ' gen ' + this.camGen + ' lim ' + (r.lim ? r.lim.yaw : '-') + ' act ' + (this.stat.act || 0) + '\nfw ' + (this.fw ? this.fw.phase + ' i' + this.fw.i + ' put ' + this.fw.put + ' give ' + this.fw.give + ' spot ' + (this.fw.spot ? this.fw.spot.y.toFixed(2) : '-') + ' t ' + this.fw.t.toFixed(1) : '-') + ' come ' + this.stat.come + ' put ' + this.stat.put + ' hold ' + this.stat.hold + ' out ' + this.stat.out + (this._sdbg ? '\n' + this._sdbg : '');
  };
  D.stopWalk = function (ok) {
    const m = this.mv, rig = this.rig;
    this.mv = null; rig.stick.x = rig.stick.y = 0;
    if (m) m.done(ok);
  };
  /* 動きをまとめて打ち切る（場面が変わる、最期の異変が来る、やめる）。待っている処理には「打ち切り」で返す */
  D.abortMotion = function () {
    const rig = this.rig;
    this.mgen = (this.mgen || 0) + 1;
    if (this.mv) this.stopWalk(false);
    if (this.gl) { const g = this.gl; this.gl = null; g.done(false); }
    if (rig.free) { rig.free.glide = false; rig.free.locked = false; rig.free.eye = this.eyeFor(); }
    rig.headT.p = 0; rig.stick.x = rig.stick.y = 0;
    this.dropHeld(true);
    if (this.crouched) { this.crouched = false; rig.bodyHolder.visible = true; }        // しゃがんで隠した体を戻す
    if (this.fw) {                                                    // 来ていた人は、もとの場所へ戻しておく
      const w = this.fw, f = w.f; this.fw = null; dropG(w);
      if (f.userData.react) {
        if (w.home) { f.position.x = w.home.x; f.position.z = w.home.z; f.rotation.y = w.home.yaw; }
        f.userData.react({ move: f.position.clone(), walk: false, face: null, reach: null, att: 0, lean: 0, hp: 0 });
      }
    }
  };
  /* 置いた物（と湯気）を片づける。場面の区切りで呼ぶ */
  D.clearPlaced = function () {
    for (const m of (this.placed || [])) { if (m.userData.steam) this.app.removeFigure(m.userData.steam); if (m.parent) { m.parent.remove(m); K.dispose(m); } }
    this.placed = [];
  };
  /* ms 後に fn。そのあいだに動きが打ち切られていたら、しない */
  D.later = function (fn, ms) { const g = this.mgen; setTimeout(() => { if (g === this.mgen && this.running) fn(); }, ms / U.speed); };

  /* ---------- 道を探す（歩ける範囲のマス目を、8 方向にたどる） ---------- */
  D.route = function (nav, x0, z0, x1, z1) {
    const c = nav.cell, nx = nav.nx, nz = nav.nz;
    if (!nav._pass) { nav._pass = new Uint8Array(nx * nz); for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) nav._pass[iz * nx + ix] = nav.clear(nav.x0 + (ix + 0.5) * c, nav.z0 + (iz + 0.5) * c) ? 1 : 0; }
    const pass = nav._pass, idx = (x, z) => { const ix = Math.floor((x - nav.x0) / c), iz = Math.floor((z - nav.z0) / c); return ix >= 0 && iz >= 0 && ix < nx && iz < nz ? iz * nx + ix : -1; };
    const s = idx(x0, z0); let gI = idx(x1, z1);
    if (s < 0 || gI < 0) return null;
    if (!pass[gI]) {
      /* 行き先のマスの中心が通れない（いすの脇など）ときは、近くの通れるマスを目指して、最後だけ行き先へ寄る */
      const gx = gI % nx, gz = (gI - gx) / nx; let best = -1, bd = 1e9;
      for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) {
        const x = gx + dx, z = gz + dz; if (x < 0 || z < 0 || x >= nx || z >= nz || !pass[z * nx + x]) continue;
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = z * nx + x; }
      }
      if (best < 0) return null;
      gI = best;
      if (!nav.clear(x1, z1)) { x1 = nav.x0 + ((best % nx) + 0.5) * c; z1 = nav.z0 + (Math.floor(best / nx) + 0.5) * c; }
    }
    const prev = new Int32Array(nx * nz).fill(-1), q = new Int32Array(nx * nz); let h = 0, t = 0;
    q[t++] = s; prev[s] = s;
    const DIR = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (h < t) {
      const cur = q[h++]; if (cur === gI) break;
      const cx = cur % nx, cz = (cur - cx) / nx;
      for (const [ax, az] of DIR) {
        const x = cx + ax, z = cz + az; if (x < 0 || z < 0 || x >= nx || z >= nz) continue;
        const n = z * nx + x; if (prev[n] >= 0 || (!pass[n] && n !== gI)) continue;
        if (ax && az && (!pass[cz * nx + x] || !pass[z * nx + cx])) continue;      // 角を斜めにすり抜けない
        prev[n] = cur; q[t++] = n;
      }
    }
    if (prev[gI] < 0) return null;
    const cells = []; for (let n = gI; n !== s; n = prev[n]) cells.push(n); cells.reverse();
    const pts = cells.map(n => ({ x: nav.x0 + ((n % nx) + 0.5) * c, z: nav.z0 + (Math.floor(n / nx) + 0.5) * c }));
    /* 見通せるところは、まっすぐ進む */
    const seen = (a, b) => { const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(L / 0.1); for (let i = 1; i < n; i++) { const k = i / n; if (!nav.clear(a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k)) return false; } return true; };
    /* 行き先そのものへは、最後のマスの中心から見通せるときだけ寄る（見通せなければ、マスの中心で止まる） */
    const lastC = pts.length ? pts[pts.length - 1] : { x: x0, z: z0 };
    if (Math.hypot(x1 - lastC.x, z1 - lastC.z) > 0.02 && seen(lastC, { x: x1, z: z1 })) pts.push({ x: x1, z: z1 });
    if (!pts.length) return null;
    const out = []; let a = { x: x0, z: z0 }, i = 0;
    while (i < pts.length) { let j = pts.length - 1; while (j > i && !seen(a, pts[j])) j--; out.push(pts[j]); a = pts[j]; i = j + 1; }
    return out;
  };

  /* ---------- 動きの部品 ---------- */
  D.speedFor = function () { const a = this.life.age; return a < 13 ? 1.05 : (a < 60 ? 1.15 : (a < 75 ? 1.0 : 0.85)); };
  D.eyeFor = function () { const a = this.life.age; return a < 13 ? 1.3 : (a < 16 ? 1.42 : 1.5); };
  D.standBody = function () { const st = this.app.stage; return K.body('stand', Object.assign({}, (st.body && st.body.stand) || {})); };
  /* 自由歩行にする（立った視点）。x, z と、向く先を与えれば、そこに立たせる */
  D.goFree = function (x, z, face) {
    const st = this.app.stage, nav = st.nav, rig = this.rig;
    if (!nav || !nav.ok) return false;
    rig.setBody(this.standBody());
    rig.setFree(nav, { speed: this.speedFor(), eye: this.eyeFor(), locked: false });
    rig.bodyHolder.visible = true;
    if (x != null) {
      rig.pos.set(x, nav.baseY(x, z) + this.eyeFor(), z);
      if (face) { rig.baseYaw = Math.atan2(-(face.x - x), -(face.z - z)); rig.uYaw = rig.tYaw = 0; rig.uPitch = rig.tPitch = -0.06; }
    }
    this.app.anchor = null;
    return true;
  };
  D.walkTo = function (x, z, max) {
    const nav = this.app.stage.nav, rig = this.rig;
    if (!rig.free || !nav) return Promise.resolve(false);
    const pts = this.route(nav, rig.pos.x, rig.pos.z, x, z);
    if (!pts || !pts.length) return Promise.resolve(false);
    this.stat.walk++;
    if (fast()) { const p = pts[pts.length - 1]; rig.pos.x = p.x; rig.pos.z = p.z; return Promise.resolve(true); }
    if (this.mv) this.stopWalk(false);
    this.camGen++;                                                   // 首を振る動きは、歩きに任せる
    rig.free.locked = false; rig.free.glide = false;
    return new Promise(res => { this.mv = { pts, i: 0, t: 0, ct: 0, cx: rig.pos.x, cz: rig.pos.z, max: max || 12, done: res }; });
  };
  /* to へ、dur 秒かけて視点を運ぶ（腰をおろす・立ち上がる） */
  D.glideTo = function (to, dur, yaw, pitch) {
    const rig = this.rig;
    if (fast()) { rig.pos.copy(to); if (yaw != null) { rig.baseYaw = yaw; rig.uYaw = rig.tYaw = 0; rig.uPitch = rig.tPitch = pitch || 0; } return Promise.resolve(true); }
    if (this.gl) { const o = this.gl; this.gl = null; o.done(false); }
    return new Promise(res => {
      const g = this.gl = { from: rig.pos.clone(), to, t: 0, dur, done: res };
      if (yaw != null) { g.yaw = yaw; g.yaw0 = rig.baseYaw; g.dyaw = norm(yaw - rig.baseYaw); g.p0 = rig.uPitch; g.p1 = pitch || 0; }
    });
  };
  /* 歩いて行って、腰をおろす。歩けなかったときは、force なら一度まばたきして座らせる。座れたら true */
  D.sitAt = async function (a, force) {
    const app = this.app, st = app.stage, rig = this.rig, nav = st.nav, gen = this.mgen;
    if (!rig.free || !a || !a.p || !nav) return false;
    try {
      const ap = nav.nearest(a.p[0], a.p[2], 1.4);
      let ok = !!ap;
      if (ap && Math.hypot(ap.x - rig.pos.x, ap.z - rig.pos.z) > 0.3) ok = await this.walkTo(ap.x, ap.z, 10);
      if (gen !== this.mgen || !this.running || !rig.free) return false;
      if (!ok) {
        if (!force) return false;
        await this.ui.lids('shut', 220, this.tk);
        if (gen !== this.mgen || !this.running) return false;
        rig.setAnchor(a); rig.setBody(app.makeBody(st, a)); app.anchor = a; this.stat.sit++;
        await this.ui.lids('open', 420, this.tk);
        return true;
      }
      rig.free.locked = true; rig.free.glide = true; rig.stick.y = 0; this.stat.sit++;
      const d = v1.fromArray(a.look).sub(v2.fromArray(a.p));
      const done = await this.glideTo(new T.Vector3().fromArray(a.p), 1.25, Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)));
      if (!done || gen !== this.mgen || !this.running) return false;
      rig.setAnchor(a); rig.setBody(app.makeBody(st, a)); app.anchor = a;
      return true;
    } catch (e) { return false; }                                  // やめたときは、ここで終わる
  };
  /* 座っているところから、立ち上がる。立てたら true */
  D.standUp = async function () {
    const st = this.app.stage, nav = st.nav, rig = this.rig, gen = this.mgen;
    if (rig.free || rig.path || !nav || !nav.ok) return false;
    const p = nav.nearest(rig.pos.x, rig.pos.z, 1.2) || nav.startNear(rig.pos.x, rig.pos.z);
    if (!p) return false;
    const yaw = rig.viewYaw();
    this.goFree(); this.stat.rise++;
    rig.baseYaw = yaw; rig.uYaw = rig.tYaw = 0;
    rig.free.locked = true; rig.free.glide = true;
    const done = await this.glideTo(new T.Vector3(p.x, nav.baseY(p.x, p.z) + this.eyeFor(), p.z), 1.25, null, 0);
    if (rig.free) { rig.free.glide = false; rig.free.locked = false; }
    return !!done && gen === this.mgen;
  };
  /* その方向へ向きなおる（歩いたあと、持ち場の向きへ） */
  D.face = function (point, ms) { return this.look(point, ms || 1400); };

  /* ---------- 場面に入るときの動き ---------- */
  /* 目を開ける前に、立つ場所を決めておく。歩いて入れるなら true */
  D.blockIn = function (b) {
    const app = this.app, st = app.stage, nav = st.nav, a = app.anchor;
    this.entry = null;
    if (!nav || !nav.ok || !a || a.path || (b.pos !== 'sit' && b.pos !== 'stand')) return false;
    const fx = a.p[0], fz = a.p[2], lx = a.look[0] - fx, lz = a.look[2] - fz, ll = Math.hypot(lx, lz) || 1;
    const ap = nav.nearest(fx, fz, 1.4);
    if (!ap) return false;
    const cands = [];
    for (const r of [3.2, 2.6, 3.8, 2.1, 4.5]) for (let k = 0; k < 16; k++) {
      const an = k / 16 * Math.PI * 2, x = fx + Math.cos(an) * r, z = fz + Math.sin(an) * r;
      if (!nav.free(x, z)) continue;
      /* まわり 45 cm が空いていること（目を開けたとき、すぐ横の壁が画面をふさがない） */
      let roomy = true; for (let k2 = 0; k2 < 8 && roomy; k2++) { const a2 = k2 / 8 * Math.PI * 2; if (!nav.clear(x + Math.cos(a2) * 0.45, z + Math.sin(a2) * 0.45)) roomy = false; }
      if (!roomy) continue;
      /* 座る所まで見通せると、目を開けたときに行く先が見える */
      let seen = true; for (let k2 = 1; k2 < 12 && seen; k2++) { const t2 = k2 / 12; if (!nav.clear(x + (ap.x - x) * t2, z + (ap.z - z) * t2)) seen = false; }
      const behind = -((x - fx) * lx + (z - fz) * lz) / (r * ll);   // 見る向きのうしろ側から入ると、歩きながら場面が見えてくる
      cands.push({ x, z, sc: behind + (seen ? 0.7 : 0) + (r === 3.2 ? 0.25 : 0) + this.r() * 0.3 });
    }
    cands.sort((p, q) => q.sc - p.sc);
    let best = null;
    for (const c of cands.slice(0, 10)) if (this.route(nav, c.x, c.z, ap.x, ap.z)) { best = c; break; }
    if (!best) return false;
    this.goFree(best.x, best.z, { x: fx, z: fz });
    this.entry = { a, pos: b.pos, ap };
    return true;
  };
  /* 目を開けたあと、歩いて行って、座る・持ち場に立つ */
  D.walkIn = async function () {
    const e = this.entry; this.entry = null;
    if (!e || !this.rig.free) return;
    this.stat.walkIn++;
    const gen = this.mgen, comp = this.app.companion, cr = comp && comp.userData.react;
    if (cr) { cr({ att: 1 }); this.later(() => cr({ att: 0.25 }), 5200); }          // そばの人が、入ってくるこちらを見る
    if (e.pos === 'sit') await this.sitAt(e.a, true);
    else { await this.walkTo(e.ap.x, e.ap.z, 10); if (this.running && gen === this.mgen) await this.face(v1.fromArray(e.a.look).clone(), 1200); }
  };
  /* 寝ている場面: 天井を見上げて、窓のほうへ顔を向ける */
  D.wakeUp = async function () {
    const rig = this.rig, st = this.app.stage;
    const gen = ++this.camGen;
    rig.tPitch = U.deg(rig.lim.up) * 0.75;
    await U.sleep(2600, this.tk);
    if (gen !== this.camGen) return;
    const w = this.spotFor('窓') || this.spotFor('カーテン');
    if (w) await this.look(w, 2400); else await this.look(null, 2400);
  };

  /* ---------- 文と動き ---------- */
  D.spotFor = function (word) {
    const st = this.app.stage, names = st.spotNames || [], spots = st.spots || [];
    for (let i = 0; i < names.length; i++) if (names[i] && names[i].indexOf(word) >= 0 && spots[i]) return new T.Vector3().fromArray(spots[i]);
    return null;
  };
  D.objectIn = function (sn) {
    let best = null, bl = 0;
    for (const w of NOUNS) if (w.length > bl && sn.indexOf(w) >= 0) { const p = this.spotFor(w); if (p) { best = p; bl = w.length; } }
    return best;
  };
  /* 文に出てくる人（そばの人、またはその場の人）。{ f 人物, other その人が主語か } */
  D.personIn = function (sn) {
    const app = this.app, c = this.life.close, rig = this.rig;
    const subj = (w) => { const k = sn.indexOf(w); return k >= 0 && /^(さん|ちゃん|くん)?[がは]/.test(sn.slice(k + w.length, k + w.length + 4)); };
    if (app.companion && app.companion.visible && c) {
      if (c.rel && sn.indexOf(c.rel) >= 0) return { f: app.companion, other: subj(c.rel) };      // {大切な人} は続柄（妻、母…）で語られる
    }
    const m = FOLKWORD.exec(sn);
    if (!m) return null;
    const other = /[がは]$/.test(m[1]) || subj(m[1]);                // 「人が」は、それだけで主語
    let best = null, bd = 1e9;
    for (const x of (app.stage.folk || [])) {
      if (!x || !x.f || !x.f.parent || !x.f.visible) continue;
      const d = this.headPos(x.f, v1).distanceTo(rig.pos);
      if (d < bd && d < 14) { bd = d; best = x.f; }
    }
    return best ? { f: best, other } : null;
  };
  /* 文ひとつぶんの動き。語りと同時に走らせる（待たない） */
  D.actFor = function (sn) {
    const rig = this.rig, st = this.app.stage, nav = st.nav;
    if (!this.running || this.mv || this.gl) return;                 // 歩いている・座っている途中なら、それを優先
    const obj = this.objectIn(sn), who = this.personIn(sn), free = !!rig.free, pathWalk = !free && !!rig.path;
    this.stat.act = (this.stat.act || 0) + 1;
    if (who && who.other) {                                           // ほかの人が主語の文は、その人が動く
      if (COME.test(sn)) { this.folkCome(who.f, sn); return; }
      if (NOD.test(sn)) { this.folkNod(who.f, sn); return; }
    }
    if (mine(SIT, sn) && free && st.anchors.sit) { this.sitAt(st.anchors.sit); return; }
    if (mine(STANDUP, sn) && !free && !rig.path && nav && nav.ok) { this.standUp(); return; }
    if (mine(MOVE, sn) && free && nav && nav.ok) {
      let tx, tz;
      if (obj) { const dx = obj.x - rig.pos.x, dz = obj.z - rig.pos.z, d = Math.hypot(dx, dz) || 1; const k = Math.max(0, d - 1.1) / d; tx = rig.pos.x + dx * k; tz = rig.pos.z + dz * k; }
      else { const y = rig.viewYaw(); tx = rig.pos.x - Math.sin(y) * 2.6; tz = rig.pos.z - Math.cos(y) * 2.6; }
      const p = nav.nearest(tx, tz, 1.6);
      if (p && Math.hypot(p.x - rig.pos.x, p.z - rig.pos.z) > 0.6) { this.walkTo(p.x, p.z, 8); return; }
    }
    if (mine(CROUCH, sn) && free) { this.crouch(); return; }
    if (mine(TURN, sn)) { this.turnBack(); return; }
    if (who) { this.follow(who.f, 1600); return; }
    if ((mine(HAND, sn) || mine(EAT, sn)) && !pathWalk) {
      const k = this.propKind(sn);
      if (k && this.holdProp(k, /両手/.test(sn))) { this.lookRel(0, -0.34, 1000); return; }   // 手に持った物が、目の前に来る
    }
    if (obj) { this.look(obj, 1500); return; }
    if (UP.test(sn)) { this.lookRel(0, 0.42, 1400); return; }
    if (DOWN.test(sn)) { this.lookRel(0, -0.5, 1200); return; }
    if (mine(HAND, sn) && !pathWalk) { this.lookRel(0, -0.42, 1000); this.handGesture(); return; }
  };
  /* 止まってからでないと見せられない動きの文か（人が来る、手に持つ、座る・立つ、振り向く、しゃがむ） */
  D.needsStill = function (sn) {
    const who = this.personIn(sn);
    if (who && who.other && (COME.test(sn) || NOD.test(sn))) return true;
    if ((mine(HAND, sn) || mine(EAT, sn)) && this.propKind(sn)) return true;
    return mine(SIT, sn) || mine(STANDUP, sn) || mine(TURN, sn) || mine(CROUCH, sn);
  };
  /* 歩き・腰をおろす動きが終わるまで待つ（長くても ms まで） */
  D.settle = async function (ms) {
    const t0 = performance.now();
    while ((this.mv || this.gl) && this.running && performance.now() - t0 < ms / U.speed) await U.sleep(100, this.tk);
  };
  /* 人が来て物を置く・渡すまで、次の文を待たせる（帰っていくところからは待たない） */
  D.settleFolk = async function (ms) {
    const t0 = performance.now();
    while (this.fw && this.fw.phase !== 'back' && this.running && performance.now() - t0 < ms / U.speed) await U.sleep(100, this.tk);
  };
  /* いまの向きから、yaw・pitch だけずらして見る */
  D.lookRel = function (dy, dp, ms) {
    const rig = this.rig, cam = this.env.camera;
    cam.getWorldPosition(v1);
    const yaw = rig.viewYaw() + dy, pitch = U.clamp(rig.basePitch + rig.uPitch + dp, -1.1, 1.1);
    const c = Math.cos(pitch), p = new T.Vector3(v1.x - Math.sin(yaw) * c * 3, v1.y + Math.sin(pitch) * 3, v1.z - Math.cos(yaw) * c * 3);
    return this.look(p, ms);
  };
  D.turnBack = function () {
    const rig = this.rig;
    if (rig.free) return this.lookRel(2.6, 0, 1100);
    const lim = U.deg(rig.lim.yaw) * 0.95;
    return this.lookRel((rig.uYaw >= 0 ? 1 : -1) * Math.max(0.6, lim - Math.abs(rig.uYaw)), 0, 1000);
  };
  D.handGesture = function (side) {
    const b = this.rig.bodyHolder.children[0];
    if (b && b.userData.gesture && this.rig.bodyHolder.visible) { b.userData.gesture('reach', { side: side || (this.r() < 0.5 ? 'R' : 'L') }); this.later(() => { if (b.userData.gesture && !(this.held && this.held.b === b)) b.userData.gesture('rest', {}); }, 1800); }
  };

  /* ---------- 人を目で追う ---------- */
  D.follow = function (f, ms) {
    const gen = ++this.camGen, rig = this.rig, t0 = performance.now(), dur = Math.max(1, ms / U.speed), h = new T.Vector3();
    (async () => {
      for (;;) {
        if (gen !== this.camGen || !this.running || this.tk.aborted || !f.parent) return;
        this.headPos(f, h); h.y -= 0.1; rig.lookToward(h);
        const el = performance.now() - t0;
        if (el > dur && !(this.fw && this.fw.f === f && this.fw.phase !== 'back')) return;
        if (el > dur * 4) return;
        try { await U.sleep(50, this.tk); } catch (e) { return; }
      }
    })();
  };

  /* ---------- ほかの人が動く ---------- */
  const isFig = (o) => { for (let q = o; q; q = q.parent) if (q.userData && q.userData.react) return true; return false; };
  /* 運んでくる人の手にある物を片づける */
  const dropG = (w) => { if (w && w.gprop) { if (w.gprop.parent) w.gprop.parent.remove(w.gprop); K.dispose(w.gprop); w.gprop = null; } };
  /* その場の人が、こちらへ歩いて来て、物を置く・渡す・声をかける。walk できない人（座っている人）は、その場から手をのばす */
  D.folkCome = function (f, sn) {
    const app = this.app, st = app.stage, nav = st.nav, rig = this.rig, react = f.userData.react;
    if (!react || this.fw) { this.follow(f, 1600); return; }
    const kind = this.propKind(sn), give = GIVE.test(sn), put = PUT.test(sn) && !give;
    if (fast()) {                                                    // 試験のときは、置く・受け取るを一度に済ませる
      this.stat.come++;
      if (put && kind) { const p = this.spotNearMe(); if (p) this.placeProp(kind, p, false); }
      else if (give && kind) this.holdProp(kind);
      return;
    }
    const me = rig.pos, fp = f.position, dist = Math.hypot(fp.x - me.x, fp.z - me.z);
    let pts = null, spot = null;
    const canWalk = !fast() && f.userData.pose === 'stand' && f.userData.walking && nav && nav.ok && dist > 1.25;
    if (put && kind) spot = this.spotNearMe();
    if (canWalk && spot) {
      /* 卓の向こう側（自分から見て、置く所の先）に立つ */
      const a0 = Math.atan2(spot.x - me.x, spot.z - me.z);
      outerS: for (const r of [0.5, 0.62, 0.42, 0.75]) for (const da of [0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5]) {
        const x = spot.x + Math.sin(a0 + da) * r, z = spot.z + Math.cos(a0 + da) * r;
        if (Math.hypot(x - me.x, z - me.z) < 0.7 || !nav.clear(x, z)) continue;
        const pp = this.route(nav, fp.x, fp.z, x, z);
        if (pp) { let L = 0, q = { x: fp.x, z: fp.z }; for (const w of pp) { L += Math.hypot(w.x - q.x, w.z - q.z); q = w; } if (L < 9) { pts = pp; break outerS; } }
      }
    }
    if (canWalk && !pts) {
      const a0 = Math.atan2(fp.x - me.x, fp.z - me.z);
      outer: for (const r of [1.15, 1.3, 1.0, 1.5]) for (const da of [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35]) {
        const x = me.x + Math.sin(a0 + da) * r, z = me.z + Math.cos(a0 + da) * r;
        if (!nav.clear(x, z)) continue;
        const pp = this.route(nav, fp.x, fp.z, x, z);
        if (!pp) continue;
        let L = 0, q = { x: fp.x, z: fp.z }; for (const w of pp) { L += Math.hypot(w.x - q.x, w.z - q.z); q = w; }
        if (L < 9) { pts = pp; break outer; }
      }
    }
    let pickup = false, g2 = give, p2 = put;
    if (!pts) {
      if (give && dist > 1.5) { if (kind && dist < 2.8) { g2 = false; p2 = true; pickup = true; } else { this.folkNod(f, sn); return; } }   // 手が届かなければ、卓に置いてもらって、自分で取る
      else if (!give && dist > 2.8) { this.folkNod(f, sn); return; }
    }
    const w = this.fw = { f, pts, i: 0, home: { x: fp.x, z: fp.z, yaw: f.rotation.y }, phase: pts ? 'go' : 'wait', t: 0, kind, give: g2, put: p2, pickup, steam: /(湯気|熱い|温か|あたたか)/.test(sn), pre: spot };
    this.stat.come++;
    if (kind && (g2 || p2)) {                                         // 置く物・渡す物を、体の前に持って運んでくる
      w.gprop = this.makeProp(kind); app.stage.group.add(w.gprop);
      const cp = new T.Vector3();
      react({ reach: { side: 'L', palm: new T.Vector3(0, 1, 0), target: () => { const y = f.rotation.y, sc = f.scale.x; return cp.set(f.position.x + Math.sin(y) * 0.38 * sc - Math.cos(y) * 0.06, f.position.y + 1.08 * sc, f.position.z + Math.cos(y) * 0.38 * sc + Math.sin(y) * 0.06); } } });     // 手のひらを上にして、胸の下の高さで
    }
    this.follow(f, pts ? 2500 : 900);                                 // まず顔を見て、
    if (pts) react({ move: new T.Vector3(pts[0].x, 0, pts[0].z), walk: true, speed: 0.95, face: null });
    else this.later(() => { if (this.fw === w) this.startGive(w); }, 700);   // 少しして、手がのびる
  };
  D.startGive = function (w) {
    const f = w.f, rig = this.rig, me = rig.pos;
    w.phase = 'give'; w.t = 0;
    const yaw = Math.atan2(me.x - f.position.x, me.z - f.position.z);
    let target = null;
    if (w.give) target = new T.Vector3(me.x, me.y - 0.45, me.z);
    else if (w.put && w.pre && Math.hypot(w.pre.x - f.position.x, w.pre.z - f.position.z) < 0.95) { target = w.pre; w.spot = w.pre; }
    else if (w.put) {
      const fx = f.position.x, fz = f.position.z;
      /* 自分とその人のあいだの卓の上で、物がのっていない平らな所（その人の手が届くあたり） */
      const L = Math.max(0.6, Math.hypot(fx - me.x, fz - me.z)), ux = (fx - me.x) / L, uz = (fz - me.z) / L;
      const ks = L > 1.3 ? [L - 0.62, L - 0.72, L - 0.55, L - 0.85].map(k => Math.max(0.36, k)) : [0.5, 0.42, 0.6, 0.36, 0.7];
      outer: for (const k of ks) for (const sd of [0, 0.14, -0.14, 0.26, -0.26]) {
        const x = me.x + ux * k - uz * sd, z = me.z + uz * k + ux * sd, p = this.surfaceFlat(x, z);
        if (p) { target = p; w.spot = p; break outer; }
      }
      if (this.app.q && this.app.q.get('dbg')) this._sdbg = 'me ' + me.x.toFixed(2) + ',' + me.z.toFixed(2) + ' f ' + fx.toFixed(2) + ',' + fz.toFixed(2) + ' hit ' + (this.surfaceAt(me.x + ux * 0.5, me.z + uz * 0.5) ? 'y' : 'n');
      if (!target) {                                                  // あいだに卓がなければ、自分の前の卓の上
        const y = rig.free ? rig.viewYaw() : rig.baseYaw, vx = -Math.sin(y), vz = -Math.cos(y);     // 座っているときは、席の正面
        if (this.app.q && this.app.q.get('dbg')) this._sdbg += ' | ' + [0.36, 0.45, 0.55, 0.65, 0.8].map(k => { const x = me.x + vx * k, z = me.z + vz * k, p = this.surfaceAt(x, z); return k + ':' + (p ? p.y.toFixed(2) : 'n') + (this.surfaceFlat(x, z) ? 'F' : ''); }).join(' ') + ' gy ' + (this.app.stage.nav ? this.app.stage.nav.baseY(me.x, me.z).toFixed(2) : '-') + ' yaw ' + (y * 57.3).toFixed(0);
        outer2: for (const k of [0.45, 0.55, 0.36, 0.65]) for (const da of [0, 0.35, -0.35, 0.7, -0.7]) {
          const c = Math.cos(da), sn2 = Math.sin(da), dx = vx * c - vz * sn2, dz = vx * sn2 + vz * c;
          const p = this.surfaceFlat(me.x + dx * k, me.z + dz * k);
          if (p) { target = p; w.spot = p; break outer2; }
        }
      }
    }
    const lying = /^lie/.test(((rig.bodyHolder.children[0] || {}).userData || {}).kind || '');
    if (w.give && lying) { w.give = false; w.put = true; target = null; }        // 寝ている人には、手渡さずに枕もとへ置く
    if (w.put && !target && lying) { const p = this.spotNearMe(); if (p) { target = p; w.spot = p; } }
    if (w.put && !target && w.kind && !lying && Math.hypot(me.x - f.position.x, me.z - f.position.z) < 1.6) { w.put = false; w.give = true; target = new T.Vector3(me.x, me.y - 0.45, me.z); }   // 置ける所がなければ、手渡し
    f.userData.react(Object.assign({ face: w.pts ? yaw : null, att: 1, lean: target ? 0.22 : 0.12 }, target ? { reach: Object.assign({ target: target.clone().setY(target.y + 0.06), side: 'L' }, w.gprop ? { palm: new T.Vector3(0, 1, 0) } : {}) } : {}));
    /* 置くなら、置かれるところへ目を落とす。渡されるなら、手もとへ */
    if (w.spot) this.look(w.spot.clone(), 800);
    else if (w.give) this.lookRel(0, -0.32, 800);
  };
  /* 毎フレーム: 歩いて来る人の運び */
  D.folkStep = function (dt) {
    const w = this.fw; if (!w) return;
    const f = w.f, react = f.userData.react;
    if (!f.parent) { dropG(w); this.fw = null; return; }
    w.t += dt;
    if (w.gprop) {                                                    // 手の中の物は、手についていく
      const hb = f.userData.parts && f.userData.parts.bones && f.userData.parts.bones.handL;
      if (hb) {
        hb.getWorldPosition(v2); hb.getWorldQuaternion(this._hq || (this._hq = new T.Quaternion()));
        v1.set(0, 1, 0).applyQuaternion(this._hq); v2.addScaledVector(v1, 0.07);     // 手首から指先のほうへ（手のひらの中）
        const gp = w.gprop; gp.position.set(v2.x, v2.y + 0.012, v2.z);           // 手のひらの上に載せる（物の原点は底）
        if (gp.userData.flat) gp.rotation.set(-Math.PI / 2, 0, f.rotation.y); else gp.rotation.set(0, f.rotation.y, 0);
      }
    }
    if (w.phase === 'go' || w.phase === 'back') {
      if (!f.userData.walking()) {
        w.i++;
        if (w.i < w.pts.length) react({ move: new T.Vector3(w.pts[w.i].x, 0, w.pts[w.i].z), walk: true });
        else if (w.phase === 'go') this.startGive(w);
        else { react({ face: w.home.yaw, att: 0, lean: 0 }); dropG(w); this.fw = null; }
      } else if (w.t > 14) {                                        // つかえて進めない。もとの場所へ戻しておく
        f.position.x = w.home.x; f.position.z = w.home.z; f.rotation.y = w.home.yaw;
        react({ move: f.position.clone(), walk: false, reach: null, att: 0, lean: 0 }); dropG(w); this.fw = null;
      }
      return;
    }
    if (w.phase === 'give') {
      if (!w.done && w.t > 1.0) {
        w.done = true;
        if (w.put && w.kind && w.spot) {
          dropG(w);                                                   // 手の中の物が、卓の上に移る
          const pm = this.placeProp(w.kind, w.spot, w.steam);
          if (w.pickup && !/^lie/.test(((this.rig.bodyHolder.children[0] || {}).userData || {}).kind || '')) this.later(() => {      // 置いてもらった物へ手をのばして、取る
            this.handGesture('R'); this.look(w.spot.clone(), 600);
            this.later(() => {
              if (!this.holdProp(w.kind)) return;                         // 持てたときだけ、卓の上から消す（湯気も）
              if (pm) { if (pm.userData.steam) this.app.removeFigure(pm.userData.steam); if (pm.parent) { pm.parent.remove(pm); K.dispose(pm); } this.placed = (this.placed || []).filter(x => x !== pm); }
              this.lookRel(0, 0.1, 700);
            }, 900);
          }, 1500);
        }
        if (w.give && w.kind) this.later(() => { dropG(w); if (this.holdProp(w.kind)) this.lookRel(0, -0.42, 600); }, 350);   // 受け取って、手もとを見る
      }
      if (w.t > (w.give ? 3.0 : 2.4)) {
        react({ reach: null, att: 0.6, lean: 0 });
        if (w.spot || w.give) this.follow(f, 1400);                  // 置いた人の顔へ、目を戻す
        if (w.pts) {
          const back = w.pts.slice(0, -1).reverse(); back.push({ x: w.home.x, z: w.home.z });
          w.pts = back; w.i = 0; w.phase = 'back'; w.t = 0;
          react({ move: new T.Vector3(back[0].x, 0, back[0].z), walk: true });
        } else { dropG(w); this.fw = null; this.later(() => react({ att: 0 }), 1500); }
      }
    }
  };
  /* その人が、こちらを見て笑う・うなずく・頭を下げる */
  D.folkNod = function (f, sn) {
    const react = f.userData.react;
    this.follow(f, 1800);
    if (!react) return;
    const bow = /(頭を下げ|会釈|おじぎ)/.test(sn);
    react({ att: 1, lean: bow ? 0.38 : 0.1, hp: /うなず/.test(sn) ? 0.18 : 0 });
    this.later(() => react({ lean: 0, hp: 0 }), bow ? 1400 : 1100);
    this.later(() => react({ att: 0 }), 3200);
  };

  /* ---------- 小道具 ---------- */
  D.propKind = function (sn) { for (const [re, k] of PROPS) if (re.test(sn)) return k; return null; };
  /* 物をひとつ作る。原点は底の中心。userData.h 高さ、userData.flat 平たい物（持つときは目に向ける） */
  D.makeProp = function (kind) {
    const g = new T.Group(), r = this.r, pick = (a) => a[Math.floor(r() * a.length) % a.length], o = { noShadow: true };
    let h = 0.08, flat = false;
    if (kind === 'cup') { g.add(K.cyl(0.033, 0.074, K.m(pick(['#c9b79a', '#7b8a7a', '#efe9df', '#5a4a3c']), { rough: 0.45 }), 0, 0, 0, Object.assign({ rTop: 0.038 }, o))); g.add(K.cyl(0.035, 0.003, K.m('#8a6a3a', { rough: 0.15 }), 0, 0.066, 0, o)); h = 0.075; }
    else if (kind === 'bowl') { g.add(K.cyl(0.04, 0.06, K.m(pick(['#2a2622', '#d8d2c4', '#8a3a2a']), { rough: 0.4 }), 0, 0, 0, Object.assign({ rTop: 0.072 }, o))); g.add(K.cyl(0.066, 0.004, K.m(pick(['#d8c9a0', '#efe8d8', '#9a6a3a']), { rough: 0.6 }), 0, 0.05, 0, o)); h = 0.06; }
    else if (kind === 'plate') { g.add(K.cyl(0.1, 0.014, K.m('#f1ede4', { rough: 0.35 }), 0, 0, 0, o)); g.add(K.box(0.07, 0.03, 0.05, K.m(pick(['#c99a5a', '#7a9a5a', '#e8d8b8']), { rough: 0.8 }), 0, 0.014, 0, o)); h = 0.045; }
    else if (kind === 'phone') { g.add(K.box(0.07, 0.145, 0.008, K.m('#1a1b1e', { rough: 0.3 }), 0, 0, 0, o)); g.add(K.box(0.062, 0.13, 0.002, K.m('#8fb2d6', { emissive: '#6f93b8', ei: 0.8, rough: 0.2 }), 0, 0.007, 0.0045, o)); h = 0.145; flat = true; }
    else if (kind === 'paper') { g.add(K.box(0.18, 0.25, 0.003, K.m('#f3f0e8', { rough: 0.95 }), 0, 0, 0, o)); for (let k = 0; k < 6; k++) g.add(K.box(0.13, 0.006, 0.001, K.m('#9a968c'), 0, 0.2 - k * 0.025, 0.002, o)); h = 0.25; flat = true; }
    else if (kind === 'book') { g.add(K.box(0.15, 0.21, 0.026, K.m(pick(['#6a2a2a', '#2a4a6a', '#4a5a3a', '#c9b48a']), { rough: 0.7 }), 0, 0, 0, o)); h = 0.21; flat = true; }
    else if (kind === 'can') { g.add(K.cyl(0.033, 0.12, K.m(pick(['#b8bcc2', '#c84a3a', '#3a6a9a', '#e8e2d2']), { rough: 0.3, metal: 0.4 }), 0, 0, 0, o)); h = 0.12; }
    else if (kind === 'bento') { const cl = K.m(pick(['#3a5a8a', '#8a3a4a', '#4a6a4a', '#c9a24a']), { rough: 0.9 }); g.add(K.box(0.17, 0.06, 0.11, cl, 0, 0, 0, o)); g.add(K.box(0.05, 0.018, 0.115, cl, 0, 0.06, 0, o)); g.add(K.box(0.07, 0.022, 0.03, cl, 0, 0.066, 0, o)); h = 0.085; }      // 包みの結び目
    else if (kind === 'food') { g.add(K.sph(0.045, K.m(pick(['#f2efe6', '#c8873a', '#c8402a', '#e8902a']), { rough: 0.8 }), 0, 0.035, 0, Object.assign({ s: [1, 0.8, 0.8] }, o))); h = 0.07; }
    else { g.add(K.box(0.022, 0.055, 0.005, K.m('#c9b26a', { rough: 0.3, metal: 0.6 }), 0, 0, 0, o)); h = 0.055; }
    g.userData.h = h; g.userData.flat = flat;
    g.userData.grip = (kind === 'cup' || kind === 'can') ? { f: 0.05, n: 0.05, y: 0.042 } : (kind === 'bowl' ? { f: 0.06, n: 0.062, y: 0.02 } : (flat || kind === 'bento' || kind === 'plate' ? { f: 0.06, n: 0.02, y: -0.02 } : { f: 0.05, n: 0.035, y: 0 }));
    return g;
  };
  /* 卓などの上の平らな面（真上から探す）。人や自分の体は数えない */
  D.surfaceAt = function (x, z) {
    const st = this.app.stage, rig = this.rig, nav = st.nav, gy = nav && nav.ok ? nav.baseY(x, z) : (rig.groundY || 0);
    const ray = this._ray || (this._ray = new T.Raycaster());
    ray.set(v2.set(x, gy + 1.7, z), new T.Vector3(0, -1, 0)); ray.far = 1.65;
    const hits = ray.intersectObject(st.group, true);
    for (const h of hits) {
      if (!h.face || isFig(h.object) || !h.object.visible) continue;
      const ny = h.face.normal.clone().transformDirection(h.object.matrixWorld).y, y = h.point.y - gy;
      if (y > 1.2) continue;
      return ny > 0.8 && y > 0.4 ? h.point.clone() : null;
    }
    return null;
  };
  /* 自分の手の届く卓の上で、物がのっていない所。正面に近いほど先に選ぶ（真うしろは見えないので選ばない） */
  D.spotNearMe = function () {
    const rig = this.rig, me = rig.pos, y = rig.free ? rig.viewYaw() : rig.baseYaw, vx = -Math.sin(y), vz = -Math.cos(y);
    for (const da of [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.45, -1.45, 1.8, -1.8]) for (const k of [0.45, 0.58, 0.36, 0.7]) {
      const c = Math.cos(da), sn = Math.sin(da), dx = vx * c - vz * sn, dz = vx * sn + vz * c;
      const p = this.surfaceFlat(me.x + dx * k, me.z + dz * k);
      if (p) return p;
    }
    return null;
  };
  /* 平らで、まわり 7 cm に物がのっていない所だけ */
  D.surfaceFlat = function (x, z) {
    const p = this.surfaceAt(x, z); if (!p) return null;
    for (const [dx, dz] of [[0.07, 0], [-0.07, 0], [0, 0.07], [0, -0.07]]) { const q = this.surfaceAt(x + dx, z + dz); if (!q || Math.abs(q.y - p.y) > 0.006) return null; }
    return p;
  };
  D.placeProp = function (kind, at, steam) {
    const app = this.app, m = this.makeProp(kind);
    if (m.userData.flat) { m.rotation.x = -Math.PI / 2; m.position.set(at.x, at.y + 0.003, at.z); }
    else m.position.set(at.x, at.y + 0.002, at.z);
    m.rotation.y = this.r() * 6;
    app.stage.group.add(m); this.stat.put++;
    (this.placed || (this.placed = [])).push(m);
    if (steam && !m.userData.flat) {
      /* 湯気: 小さな白いもやが、ゆらぎながら上って消える */
      const g = new T.Group(), mat = [], N = 10;
      for (let k = 0; k < N; k++) { const mt = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }); mat.push(mt); g.add(new T.Mesh(new T.SphereGeometry(0.013, 8, 6), mt)); }
      g.position.set(at.x, at.y + m.userData.h, at.z);
      const ph = this.r() * 6;
      g.userData.tick = (t) => {
        g.children.forEach((s, k) => {
          const u = ((t * 0.32 + k / N + ph) % 1);
          s.position.set(Math.sin(t * 1.3 + k * 2.1) * 0.012 * (1 + u * 2), u * 0.22, Math.cos(t * 1.1 + k) * 0.01 * (1 + u * 2));
          s.scale.setScalar(0.5 + u * 1.5); mat[k].opacity = 0.1 * Math.sin(Math.PI * u);
        });
      };
      app.addFigure(g, app.stage.group); m.userData.steam = g;
    }
    return m;
  };
  /* 右手に持って、胸の前へ上げる。5 秒ほどで下ろす */
  D.holdProp = function (kind, both) {
    const rig = this.rig, b = rig.bodyHolder.children[0];
    if (!b || !b.userData.hold || !b.userData.gesture || !rig.bodyHolder.visible || !this.running || /^lie/.test(b.userData.kind || '')) return false;   // 寝ているときは持たない
    const inner = this.makeProp(kind), m = new T.Group();
    inner.position.y = -inner.userData.h * 0.5; m.add(inner); m.userData.flat = inner.userData.flat; m.userData.grip = inner.userData.grip;
    b.userData.hold('R', m);
    if (both) b.userData.gesture('hold2', { rate: 3.2 }); else b.userData.gesture('hold', { side: 'R', rate: 3.2 });     // 「両手で」なら両手で包む
    this.held = { b, m, both: !!both }; this.stat.hold++;
    const my = this.held;
    this.later(() => { if (this.held === my) this.dropHeld(); }, 5200);
    return true;
  };
  D.dropHeld = function (now) {
    const d = this.dropping;                                          // 下ろしている途中の物は、すぐに外す
    if (d && now) { clearTimeout(d.timer); this.dropping = null; if (!this.held || this.held.b !== d.b) d.b.userData.hold('R', null); }
    const h = this.held; if (!h) return;
    this.held = null;
    if (h.b.userData.gesture) h.b.userData.gesture('rest', h.both ? {} : { side: 'R' });
    if (now) { h.b.userData.hold('R', null); return; }
    const dd = this.dropping = { b: h.b, timer: setTimeout(() => { if (this.dropping === dd) this.dropping = null; if (!this.held || this.held.b !== h.b) h.b.userData.hold('R', null); }, 650 / U.speed) };
  };
  /* しゃがむ: 目の高さが下がる（体は見せない） */
  D.crouch = function () {
    const rig = this.rig, fr = rig.free; if (!fr) return;
    if (!this.crouched) { this.crouched = rig.bodyHolder.visible; rig.bodyHolder.visible = false; }
    fr.eye = this.eyeFor() * 0.56; this.stat.crouch++;
    this.lookRel(0, -0.3, 900);
    this.later(() => { if (rig.free) rig.free.eye = this.eyeFor(); if (this.crouched) { this.crouched = false; rig.bodyHolder.visible = true; } }, 3400);
  };

  /* ---------- 場面の終わり: 立ち上がって、出口へ歩きだす。その途中で目を閉じる ---------- */
  D.walkOut = async function (b) {
    const st = this.app.stage, nav = st.nav, rig = this.rig, ui = this.ui, tk = this.tk;
    if (!nav || !nav.ok || b.pos === 'lie' || rig.path || st.moving || !this.running) return false;
    const gen = this.mgen;
    if (!rig.free && !(await this.standUp())) return false;
    if (gen !== this.mgen || !rig.free || !this.running) return false;
    let goal = null;
    for (const w of EXITS) {
      const p = this.spotFor(w); if (!p) continue;
      const q = nav.nearest(p.x, p.z, 1.6);
      if (q && Math.hypot(q.x - rig.pos.x, q.z - rig.pos.z) > 1.4 && this.route(nav, rig.pos.x, rig.pos.z, q.x, q.z)) { goal = q; break; }
    }
    if (!goal) {
      const y = rig.viewYaw(), fx = -Math.sin(y), fz = -Math.cos(y), cands = [];
      for (const r of [3.6, 2.8, 4.5, 2.2]) for (let k = 0; k < 12; k++) {
        const an = k / 12 * Math.PI * 2, x = rig.pos.x + Math.cos(an) * r, z = rig.pos.z + Math.sin(an) * r;
        if (!nav.free(x, z)) continue;
        cands.push({ x, z, sc: -((x - rig.pos.x) * fx + (z - rig.pos.z) * fz) / r + r * 0.1 + this.r() * 0.4 });    // 見ていた所に背を向けて、出ていく
      }
      cands.sort((p, q) => q.sc - p.sc);
      for (const c of cands.slice(0, 8)) if (this.route(nav, rig.pos.x, rig.pos.z, c.x, c.z)) { goal = c; break; }
    }
    if (!goal) return false;
    this.stat.out++;
    this.walkTo(goal.x, goal.z, 8);
    await U.sleep(1700, tk);
    if (gen === this.mgen && this.running) await ui.lids('shut', 1000, tk);
    return true;
  };

  /* ---------- 最期の直前（41_dying.js から） ---------- */
  /* 異変の前の行: 振り向く、右を見る、など */
  D.endCue = function (line, i, dying) {
    if (!this.running) return;
    const r = /右から/.test(line) ? -1.1 : (/左から/.test(line) ? 1.1 : 0);
    if (r) { this.lookRel(r, 0, 700); return; }
    if (/(上から|頭上|上で|落ちて|降って)/.test(line)) { this.lookRel(0, 0.5, 700); return; }
    this.actFor(line);
  };
  /* 異変が来た。ここから先は、最期の場面がカメラを動かす */
  D.endHit = function () {
    this.abortMotion(); this.camGen++; this.running = false;
  };
  /* 断ち切られる一瞬に、迫ってくるもの（車のライト、人影）を見せる。何を見せるかは件ごとの end.see（data/SPEC.md） */
  D.endBlow = async function (dying) {
    const app = this.app, st = app.stage, rig = this.rig, cam = this.env.camera, see = (this.cause.end || {}).see;
    if (!see) return;
    cam.getWorldPosition(v1);
    const gy = rig.groundY || 0;
    this.camGen++;                                                   // ほかの首の動きは止める
    if (see.indexOf('car') === 0) {
      /* 最期の場面に入ったときの前を基準に、右・左・正面から、二つのライトが迫ってくる */
      const yaw = this.endYaw != null ? this.endYaw : rig.viewYaw();
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const side = see === 'car-F' ? 0 : (see === 'car-L' ? -1 : (see === 'car-R' ? 1 : (this.r() < 0.5 ? 1 : -1)));
      const from = new T.Vector3(), to = new T.Vector3();
      if (!side) { from.set(v1.x + fx * 24, gy, v1.z + fz * 24); to.set(v1.x + fx * 2.9, gy, v1.z + fz * 2.9); }
      else { from.set(v1.x + rx * side * 17 + fx * 2.4, gy, v1.z + rz * side * 17 + fz * 2.4); to.set(v1.x + rx * side * 1.5 + fx * 2.3, gy, v1.z + rz * side * 1.5 + fz * 2.3); }
      /* 光源は足さない（足すと描画の準備がやり直しになり、この一瞬に画面が止まる）。光る玉と、にじみで見せる */
      const g = new T.Group(), lamp = K.m('#fff6e0', { emissive: '#fff2cc', ei: 3 }), body = K.m('#3a3d45', { rough: 0.45, metal: 0.3 });
      const halo = new T.MeshBasicMaterial({ color: 0xfff1cc, transparent: true, opacity: 0.2, depthWrite: false, blending: T.AdditiveBlending });
      g.add(K.box(1.7, 1.0, 3.6, body, 0, 0.3, 0));
      g.add(K.box(1.5, 0.5, 1.8, body, 0, 1.3, -0.3));
      for (const x of [-0.6, 0.6]) { g.add(K.sph(0.13, lamp, x, 0.75, 1.86)); g.add(K.sph(0.3, halo, x, 0.75, 2.14, { noShadow: true })); }      // にじみは車体の前に出す（車体にかかると欠けて見える）
      g.position.copy(from); g.lookAt(v1.x, from.y, v1.z);             // こちらを向いて
      g.userData.tick = () => { };
      app.addFigure(g, st.group); this.stat.blow++;
      const kill = () => { if (!g.userData.gone) { g.userData.gone = true; app.removeFigure(g); } };
      setTimeout(kill, 2900 / U.speed);                                // 途中でやめても、必ず片づける
      const dur = Math.max(1, 700 / U.speed), t0 = performance.now(), aim = new T.Vector3(), gen = this.camGen;
      try {
        for (;;) {
          if (this.tk.aborted || gen !== this.camGen) break;
          const k = Math.min(1, (performance.now() - t0) / dur);
          g.position.lerpVectors(from, to, k * k);
          rig.lookToward(aim.copy(g.position).setY(gy + 0.8));           // ライトを、目で追ってしまう
          if (k >= 1) break;
          await U.sleep(16, this.tk);
        }
      } catch (e) { kill(); throw e; }
      return;
    }
    if (see === 'man') {
      /* 振り向いた目の前に、人影。顔も凶器も見せない。語りが「振り向く」なら、うしろの空いている向きへ先に振り向く */
      const nav = st.nav, turn = /(振り向|振り返)/.test(dying.lines.join('')), yaw0 = rig.viewYaw();
      const lim = rig.free ? Math.PI : Math.min(Math.PI, U.deg(rig.lim.yaw) * 0.95 + 0.25);
      const das = turn ? [Math.PI, 2.7, -2.7, 2.3, -2.3, 1.9, -1.9, 1.5, -1.5, 1.0, -1.0] : [0, 0.35, -0.35, 0.7, -0.7];
      let best = null;
      outerM: for (const da of das) {
        if (Math.abs(da) > lim + 1e-6) continue;
        const y = yaw0 + da, dx = -Math.sin(y), dz = -Math.cos(y);
        for (const d of [0.85, 1.05, 1.3, 1.6]) {
          const x = v1.x + dx * d, z = v1.z + dz * d;
          if (nav && nav.ok) { let ok = true; for (let k = 1; k <= 6; k++) if (!nav.clear(v1.x + dx * d * k / 6, v1.z + dz * d * k / 6)) { ok = false; break; } if (!ok) break; }
          best = { da, x, z, y: nav && nav.ok ? nav.baseY(x, z) : gy }; break outerM;
        }
      }
      if (!best) return;
      if (best.da) {
        const ok = await this.lookRel(norm(best.da), 0, 650);
        if (!ok || this.tk.aborted || !this.running) return;          // 振り向くあいだに止められたら、出さない
        this.camGen++; cam.getWorldPosition(v1);
      }
      const p = new T.Vector3(best.x, best.y, best.z);
      const f = K.figure({ pose: 'stand', skin: '#141418', top: '#15161a', bottom: '#15161a', shoe: '#0c0c0e', hair: '#0e0e10', hairStyle: 'hair_short', h: 1.74 });   // 顔も手も影のように黒く
      K.at(f, p.x, p.y, p.z, Math.atan2(v1.x - p.x, v1.z - p.z));
      app.addFigure(f, st.group); this.stat.blow++;
      const kill = () => { if (!f.userData.gone) { f.userData.gone = true; app.removeFigure(f); } };
      setTimeout(kill, 2100 / U.speed);                                // 途中でやめても、必ず片づける
      if (f.userData.react) f.userData.react({ lean: 0.35, att: 1, reach: { target: new T.Vector3(v1.x, v1.y - 0.5, v1.z), side: 'L' } });
      rig.lookToward(v2.set(p.x, p.y + 1.45, p.z));
      try { await U.sleep(480, this.tk); } catch (e) { kill(); throw e; }
    }
  };
})(window.SI);
