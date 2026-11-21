'use strict';
/* 最期の一日 — 場所（野外）: 田畑、山、川、海 */
(function (SI) {
  const T = window.THREE, U = SI.U, K = SI.Kit, P = K.P;
  const S = SI.stages;
  const PI = Math.PI;

  let seedlingTex = null;
  function seedlings() {
    if (seedlingTex) return seedlingTex;
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d'); x.clearRect(0, 0, 128, 128); x.fillStyle = '#6f9a4a';
    for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) x.fillRect(i * 32 + 12, k * 32 + 12, 7, 7);
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.userData.shared = true; seedlingTex = t; return t;
  }
  function skyWater(mesh, base) {
    const b = new T.Color(base), tmp = new T.Color();
    return (env) => { mesh.material.color.copy(b).lerp(tmp.copy(env.skyTop), 0.3).multiplyScalar(0.5 + 0.5 * Math.min(1, env.dayLight + 0.1)); };
  }

  /* ================= 田畑・農道 ================= */
  S.field = function (c) {
    const g = new T.Group(), lamps = [], rng = U.rng(c.seed + 41), sp = K.seasonal(c), waters = [];
    const gr = K.ground(320, sp.grass, -0.02, 70); g.add(gr);
    const rd = K.road(3.2, 160, { center: false, wet: c.weather === 'rain' || c.weather === 'storm' }); K.at(rd, 0, 0, 10); g.add(rd);
    /* 用水路 */
    g.add(K.box(0.12, 0.5, 160, K.m(P.concrete), 1.95, -0.4, 10)); g.add(K.box(0.12, 0.5, 160, K.m(P.concrete), 2.75, -0.4, 10));
    const ch = K.water(0.7, 160, '#3f6a78', { segX: 1, segZ: 1, amp: 0, opacity: 0.9 }); ch.position.set(2.35, -0.12, 10); g.add(ch); waters.push(skyWater(ch, '#3f6a78'));
    /* 田 */
    const s = c.season;
    for (let ix = -3; ix <= 2; ix++) for (let iz = -2; iz <= 3; iz++) {
      const w = 26, d = 20, cx = ix < 0 ? -1.8 - 0.6 - w / 2 - (-(ix) - 1) * (w + 0.7) : 3.1 + w / 2 + ix * (w + 0.7), cz = iz * (d + 0.7) - 4;
      if (Math.abs(cx - 22) < 16 && Math.abs(cz - 32) < 12) continue;
      if (sp.snowy) { g.add(K.plane(w, d, K.mTex(K.tex.rep(K.tex.noise(P.snow, 0.04), 6, 5)), cx, 0.06, cz)); continue; }
      if (s === 'spring') {
        const wt = K.water(w, d, '#4f7488', { segX: 1, segZ: 1, amp: 0, opacity: 0.95, rough: 0.1 }); wt.position.set(cx, 0.0, cz); g.add(wt); waters.push(skyWater(wt, '#4f7488'));
        const st = K.tex.rep(seedlings(), w / 1.2, d / 1.2);
        const sm = new T.MeshStandardMaterial({ map: st, transparent: true, alphaTest: 0.4, roughness: 1 });
        const sl = K.plane(w, d, sm, cx, 0.05, cz, { noShadow: true }); g.add(sl);
      } else if (s === 'summer') {
        g.add(K.box(w, 0.5, d, K.mTex(K.tex.rep(K.tex.noise('#5f9148', 0.14), 9, 7), { rough: 1 }), cx, -0.05, cz, { noCast: true }));
      } else if (s === 'autumn') {
        const harvested = (ix + iz) % 3 === 0;
        if (harvested) {
          g.add(K.plane(w, d, K.mTex(K.tex.rep(K.tex.stripes('#8a7a58', '#9a8a64', 8), w / 2.4, 1)), cx, 0.03, cz));
          const rack = K.group(cx, 0, cz); rack.add(K.rod([-8, 1.4, 0], [8, 1.4, 0], 0.03, K.m(P.woodLight)));
          for (let i = 0; i <= 4; i++) { rack.add(K.rod([-8 + i * 4, 0, -0.5], [-8 + i * 4, 1.4, 0], 0.03, K.m(P.woodLight))); rack.add(K.rod([-8 + i * 4, 0, 0.5], [-8 + i * 4, 1.4, 0], 0.03, K.m(P.woodLight))); }
          rack.add(K.box(15.6, 0.9, 0.3, K.m('#c9a94f', { flat: true }), 0, 0.5, 0)); g.add(rack);
        } else g.add(K.box(w, 0.75, d, K.mTex(K.tex.rep(K.tex.noise('#c7a64a', 0.14), 9, 7), { rough: 1 }), cx, -0.05, cz, { noCast: true }));
      } else {
        g.add(K.plane(w, d, K.mTex(K.tex.rep(K.tex.stripes('#7d6c50', '#8a7a5c', 8), w / 2.4, 1)), cx, 0.03, cz));
      }
    }
    /* 電柱、軽トラ、トラクター、かかし */
    for (let i = 0; i < 6; i++) { const p = K.pole(7.5); K.at(p, -2.1, 0, -56 + i * 26); g.add(p); if (i) g.add(K.wires([-2.1, 6.8, -56 + (i - 1) * 26], [-2.1, 6.8, -56 + i * 26], 2, 0.7)); }
    const kt = K.group(0.6, 0, 9.5, 0.04);
    kt.add(K.box(1.4, 0.5, 3.3, K.m('#e9e9e4', { rough: 0.5 }), 0, 0.3, 0)); kt.add(K.box(1.36, 0.85, 1.1, K.m('#e9e9e4', { rough: 0.5 }), 0, 0.8, 1.05)); kt.add(K.box(1.3, 0.45, 0.04, K.m('#2c3840', { rough: 0.2 }), 0, 1.1, 1.61, { noShadow: true }));
    kt.add(K.box(1.4, 0.28, 1.9, K.m('#d9d9d2'), 0, 0.8, -0.65)); for (const zz of [-1.0, 1.05]) for (const sx of [-1, 1]) { const wh = K.cyl(0.27, 0.16, K.m('#1e1e20'), sx * 0.66, 0.27, zz, { seg: 12 }); wh.rotation.z = sx * PI / 2; kt.add(wh); }
    g.add(kt);
    const tr = K.group(-13, 0, 12, 0.9), rd2 = K.m('#b8402f', { rough: 0.5 });
    tr.add(K.box(1.1, 0.8, 2.2, rd2, 0, 0.7, 0.2)); tr.add(K.box(1.0, 1.1, 1.0, K.m('#2c3840', { rough: 0.3 }), 0, 1.5, -0.5)); tr.add(K.box(1.2, 0.06, 1.2, rd2, 0, 2.6, -0.5));
    for (const sx of [-1, 1]) { const w1 = K.cyl(0.72, 0.36, K.m('#1e1e20'), sx * 0.75, 0.72, -0.6, { seg: 14 }); w1.rotation.z = sx * PI / 2; tr.add(w1); const w2 = K.cyl(0.42, 0.26, K.m('#1e1e20'), sx * 0.65, 0.42, 1.1, { seg: 12 }); w2.rotation.z = sx * PI / 2; tr.add(w2); }
    g.add(tr);
    if (!sp.snowy && (s === 'summer' || s === 'autumn')) {
      const sc = K.group(-7, 0, 5.5, 0.7); sc.add(K.cyl(0.03, 1.9, K.m(P.woodLight), 0, 0, 0)); sc.add(K.rod([-0.8, 1.45, 0], [0.8, 1.45, 0], 0.03, K.m(P.woodLight)));
      sc.add(K.box(0.9, 0.6, 0.12, K.m('#8a5a4a'), 0, 0.95, 0)); sc.add(K.sph(0.16, K.m('#e6dfc8'), 0, 1.72, 0)); const hat = new T.Mesh(new T.ConeGeometry(0.32, 0.2, 10), K.m('#c9a94f')); hat.position.y = 1.92; sc.add(hat); g.add(sc);
    }
    /* 農家、納屋、ハウス、鎮守の森 */
    const fh = K.house({ w: 11, d: 8, h: 3.2, rh: 2.4, wall: P.wallWarm, roof: '#3d4248', snow: sp.snowy }); K.at(fh, 22, 0, 32, -0.3); g.add(fh); lamps.push(fh);
    const barn = K.house({ w: 6, d: 5, h: 2.8, rh: 1.4, wall: '#8a7a68', roof: '#5a4a44', snow: sp.snowy }); K.at(barn, 13, 0, 38, 0.4); g.add(barn);
    const kaki = K.tree({ kind: 'broad', season: c.season, weather: c.weather, h: 5, seed: c.seed + 3 }); K.at(kaki, 15.5, 0, 28); g.add(kaki);
    if (s === 'autumn' || s === 'winter') for (let i = 0; i < 9; i++) g.add(K.sph(0.1, K.m('#d9742b'), 15.5 + (rng() - 0.5) * 2.4, 2.8 + rng() * 1.8, 28 + (rng() - 0.5) * 2.4, { ws: 6, hs: 5 }));
    for (let i = 0; i < 2; i++) {
      const gh = new T.Mesh(new T.CylinderGeometry(2.6, 2.6, 18, 12, 1, false, 0, PI), K.m('#e6ecec', { transparent: true, opacity: 0.55, double: true }));
      gh.rotation.z = PI / 2; gh.rotation.y = PI / 2; gh.position.set(-22 - i * 6.5, 0, -8); K.noAO(gh); g.add(gh);
    }
    for (let i = 0; i < 9; i++) { const t = K.tree({ kind: 'conifer', season: c.season, weather: c.weather, h: 10 + rng() * 5, seed: c.seed + 20 + i }); K.at(t, -34 + (i % 3) * 3.5 + rng(), 0, 34 + Math.floor(i / 3) * 3.5); g.add(t); }
    const torii = K.group(-28.5, 0, 31.5, 0.9), vm = K.m('#b8402f');
    torii.add(K.cyl(0.14, 3.2, vm, -1.2, 0, 0)); torii.add(K.cyl(0.14, 3.2, vm, 1.2, 0, 0)); torii.add(K.box(3.4, 0.2, 0.22, vm, 0, 3.15, 0)); torii.add(K.box(2.9, 0.14, 0.16, vm, 0, 2.6, 0)); g.add(torii);
    for (let i = 0; i < 10; i++) { const t = K.tree({ kind: U.pick(rng, ['broad', 'sakura', 'ginkgo']), season: c.season, weather: c.weather, h: 5 + rng() * 3, seed: c.seed + 40 + i }); K.at(t, (rng() < 0.5 ? -1 : 1) * (40 + rng() * 40), 0, -30 + rng() * 90); g.add(t); }
    g.add(K.ridge({ r: 130, hMin: 10, hMax: 30, color: sp.hill, seed: c.seed + 5, n: 36, rough: 0.5 }));
    g.add(K.ridge({ r: 230, hMin: 26, hMax: 64, color: sp.hillFar, seed: c.seed + 6, n: 40 }));
    return {
      group: g, indoor: false, label: '田畑の道', shadow: 30, shadowFollow: true,
      anchors: {
        stand: { p: [0.4, 1.6, 0], look: [-14, 1.3, 18], lim: { yaw: 170, up: 60, down: 55 }, body: 'stand', ground: 0 },
        walk: { path: [[0, 1.6, -28], [0, 1.6, 24]], lim: { yaw: 155, up: 60, down: 55 }, body: 'stand', ground: 0 },
        sit: { p: [-1.75, 0.95, 2.0], look: [-13, 0.7, 14], lim: { yaw: 150, up: 60, down: 60 }, body: 'sit', ground: 0 }
      },
      body: { stand: { sleeve: '#7f8a7a', shoe: '#3a352e' }, sit: { sleeve: '#7f8a7a', legs: '#5c5648' } },
      spots: [[-13, 2.2, 12], [-7, 1.9, 5.5], [0.6, 1.4, 9.5], [16, 3.5, 30], [-28.5, 3.3, 31.5], [-2.1, 5, 22], [2.35, 0.3, 4], [-20, 2.5, -8]],
      /* 2 つめは、かかしの立つ季節（夏・秋）とそれ以外で変わる */
      spotNames: ['トラクター', (!sp.snowy && (s === 'summer' || s === 'autumn')) ? 'かかし' : (sp.snowy ? '雪の田んぼ' : (s === 'spring' ? '水を張った田' : '刈りあとの田')), '軽トラック', '柿の木', '鎮守の鳥居', '電柱', '用水路', 'ビニールハウス'],
      /* 農道と道ばた（東は用水路の手前まで）、西の田のあいだのあぜ 2 本。
         あぜは幅 0.7 m。長方形を両側へ 0.15 広げてあり、体の中心があぜの上（z 6.0〜6.6、−14.6〜−14.0）を動く */
      walk: { y: 0, rects: [[-2.4, -32, 1.9, 30], [-20, 5.85, -2.4, 6.85], [-20, -14.85, -2.4, -13.85]] },
      meet: [{ p: [-1.0, 0, 4.8], ry: 2.9 }, { p: [1.0, 0, -3.5], ry: -0.17 }],
      companion: { stand: { p: [-0.9, 0, 2.2], ry: 2.6, pose: 'stand' }, sit: { p: [-1.5, 0, 3.4], ry: 2.9, pose: 'stand' }, walk: { p: [1.0, 0, -25], ry: 0.3, pose: 'stand' } },
      amb: { nature: 1, river: 0.14 },
      onLight: S.lampSetter(lamps, (env) => { for (const f of waters) f(env); })
    };
  };

  /* ================= 山道・森 ================= */
  S.mountain = function (c) {
    const g = new T.Group(), rng = U.rng(c.seed + 42), sp = K.seasonal(c);
    const trailZ = (x) => 2.2 * Math.sin(x * 0.09);
    const base = (x, z) => 0.17 * z + 2.0 * Math.sin(x * 0.07) * Math.cos(z * 0.06) + 0.8 * Math.sin(x * 0.19 + z * 0.23) + (z < -20 ? (z + 20) * 0.35 : 0);
    const H = (x, z) => { const tz = trailZ(x), d = Math.abs(z - tz); return U.lerp(base(x, tz), base(x, z), U.smooth((d - 0.9) / 2.4)); };
    const geo = new T.PlaneGeometry(180, 180, 80, 80); geo.rotateX(-PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, H(pos.getX(i), pos.getZ(i)));
    geo.computeVertexNormals();
    const gm = K.mTex(K.tex.rep(K.tex.noise(sp.snowy ? P.snow : (c.season === 'autumn' ? '#77703f' : (c.season === 'winter' ? '#746d54' : '#5a7444')), 0.16), 30, 30), { rough: 1 });
    const ground = new T.Mesh(geo, gm); ground.receiveShadow = true; g.add(ground);
    ground.userData.noNav = true;      // 地面そのものは、歩ける範囲の調べから外す（高さは walk.h で渡す。入れると調べに 4 秒かかる）
    /* 踏みあと */
    const tm = K.m(sp.snowy ? '#dfe4e8' : '#8a7458', { rough: 1 });
    for (let x = -44; x < 44; x += 1.6) { const p = K.plane(1.9, 1.1, tm, x, H(x, trailZ(x)) + 0.03, trailZ(x), { noShadow: true }); p.rotation.y = -Math.atan(0.198 * Math.cos(x * 0.09)); p.rotation.z = Math.atan((H(x + 0.8, trailZ(x + 0.8)) - H(x - 0.8, trailZ(x - 0.8))) / 1.6); g.add(p); }
    /* 木、やぶ、岩 */
    let placed = 0, tries = 0;
    while (placed < 78 && tries < 600) {
      tries++;
      const x = -70 + rng() * 140, z = -34 + rng() * 96;
      if (Math.abs(z - trailZ(x)) < 2.6) continue;
      if (z < trailZ(x) && Math.abs(x - 3) < 9 && z > -30) continue;       // 谷側の見晴らし
      const kind = rng() < 0.62 ? 'conifer' : U.pick(rng, ['broad', 'momiji', 'broad', 'ginkgo']);
      const t = K.tree({ kind, season: c.season, weather: c.weather, h: (kind === 'conifer' ? 9 : 6) + rng() * 6, seed: c.seed + placed * 3 });
      K.at(t, x, H(x, z) - 0.2, z, rng() * 6); g.add(t); placed++;
    }
    for (let i = 0; i < 16; i++) { const x = -40 + rng() * 80, z = trailZ(x) + (rng() < 0.5 ? -1 : 1) * (2 + rng() * 5); const r = K.rock(0.4 + rng() * 0.9, sp.snowy ? '#c9ced2' : '#84847c', 70 + i); K.at(r, x, H(x, z) - 0.05, z); g.add(r); }
    for (let i = 0; i < 18; i++) { const x = -40 + rng() * 80, z = trailZ(x) + (rng() < 0.5 ? -1 : 1) * (2.2 + rng() * 7); const b = K.bush(sp.snowy ? K.mixc(P.leafDark, P.snow, 0.6) : (c.season === 'autumn' ? '#8a6a3a' : P.leafDark), 0.5 + rng() * 0.5, 90 + i); K.at(b, x, H(x, z) - 0.05, z); g.add(b); }
    /* 道標、ケルン、腰かける岩 */
    const vx = 3, vz = trailZ(vx), vy = H(vx, vz);
    const sign = K.group(vx + 1.6, vy, vz + 1.3, -0.5); sign.add(K.cyl(0.05, 1.5, K.m(P.woodDark), 0, 0, 0)); sign.add(K.box(0.7, 0.14, 0.03, K.m(P.woodLight), 0.25, 1.25, 0)); sign.add(K.box(0.6, 0.14, 0.03, K.m(P.woodLight), -0.2, 1.05, 0)); g.add(sign);
    const cairn = K.group(vx - 2.2, H(vx - 2.2, vz - 1.6), vz - 1.6); for (let i = 0; i < 5; i++) { const r = K.rock(0.3 - i * 0.045, '#8d8c84', 120 + i); r.position.y = i * 0.2; cairn.add(r); } g.add(cairn);
    const seat = K.rock(0.62, '#7f7f78', 140); seat.scale.set(1.3, 0.75, 1); K.at(seat, vx + 0.4, H(vx + 0.4, vz - 0.9) - 0.1, vz - 0.9); g.add(seat);
    /* 谷を埋める森 */
    const fcol = sp.snowy ? '#b9c4c9' : (c.season === 'autumn' ? '#6f6a3f' : (c.season === 'winter' ? '#5f6650' : '#4a6a42'));
    const vf = K.ground(1200, fcol, -46, 60); g.add(vf);
    const cone = new T.ConeGeometry(2.6, 9, 6); cone.translate(0, 4.5, 0);
    const im = new T.InstancedMesh(cone, K.m(sp.snowy ? '#aab8bd' : '#3f5f3c', { flat: true }), 520);
    const im2 = new T.InstancedMesh(new T.IcosahedronGeometry(3.4, 0), K.m(sp.snowy ? '#c4ccd0' : (c.season === 'autumn' ? '#a8622c' : (c.season === 'winter' ? '#6a5a4e' : '#587a44')), { flat: true }), 260);
    const dm = new T.Object3D(); let n1 = 0, n2 = 0;
    for (let i = 0; i < 780; i++) {
      const x = -260 + rng() * 520, z = -34 - rng() * 230;
      const y = Math.max(-46, base(x, Math.max(z, -90)) + (z < -90 ? (z + 90) * 0.02 : 0)) - 0.5;
      dm.position.set(x, y, z); const sc = 0.7 + rng() * 0.9; dm.scale.set(sc, sc, sc); dm.rotation.y = rng() * 6; dm.updateMatrix();
      if (i % 3 === 0 && n2 < 260) { dm.position.y += 3; dm.updateMatrix(); im2.setMatrixAt(n2++, dm.matrix); } else if (n1 < 520) im.setMatrixAt(n1++, dm.matrix);
    }
    im.count = n1; im2.count = n2; im.userData.noAO = true; im2.userData.noAO = true; g.add(im); g.add(im2);
    /* 遠くの山なみ（谷側） */
    const cols = sp.snowy ? ['#c2ccd4', '#d2dae0', '#e2e8ec'] : [K.shade(sp.hill, 0.9), K.mixc(sp.hill, sp.hillFar, 0.5), sp.hillFar];
    g.add(K.ridge({ r: 200, hMin: -20, hMax: 24, color: cols[0], seed: c.seed + 5, n: 40, from: PI, to: PI * 2, rough: 0.9 }));
    g.add(K.ridge({ r: 270, hMin: 0, hMax: 56, color: cols[1], seed: c.seed + 6, n: 44 }));
    g.add(K.ridge({ r: 360, hMin: 24, hMax: 100, color: cols[2], seed: c.seed + 7, n: 48 }));
    const path = []; for (let x = -34; x <= 34; x += 6.8) path.push([x, H(x, trailZ(x)) + 1.62, trailZ(x)]);
    const sy = H(vx + 0.4, vz - 0.9);
    /* 歩けるのは、踏みあとの両わき 1.4 m と、見晴らしのよい場所のまわり */
    const wr = [[vx - 4, vz - 3.2, vx + 4, vz + 1.6]];
    for (let x = -36; x < 36; x += 2) { const tz = trailZ(x + 1); wr.push([x, tz - 1.4, x + 2, tz + 1.4]); }
    const mx1 = vx + 3.4, mx2 = vx - 3.6;
    return {
      group: g, indoor: false, label: '山道', shadow: 34, shadowFollow: true,
      anchors: {
        walk: { path, lim: { yaw: 155, up: 65, down: 55 }, body: 'stand', ground: path[0][1] - 1.62 },
        stand: { p: [vx, vy + 1.62, vz - 0.3], look: [vx + 6, vy - 1.5, -70], lim: { yaw: 170, up: 60, down: 55 }, body: 'stand', ground: vy },
        sit: { p: [vx + 0.4, sy + 1.1, vz - 1.0], look: [vx + 5, sy - 1.5, -70], lim: { yaw: 150, up: 60, down: 60 }, body: 'sit', ground: sy }
      },
      body: { stand: { sleeve: '#b8563a', shoe: '#4a3f33' }, sit: { sleeve: '#b8563a', legs: '#4f5562' } },
      spots: [[vx + 1.6, vy + 1.3, vz + 1.3], [vx - 2.2, H(vx - 2.2, vz - 1.6) + 1.2, vz - 1.6], [vx + 14, vy + 3, -60], [vx - 8, vy + 2, vz - 9], [vx + 8, vy + 3.5, vz + 4], [vx + 0.4, sy + 0.9, vz - 0.9]],
      spotNames: ['道しるべ', '道ばたの積み石', '谷の向こうの山', '谷の森', '山側の木立', '腰かけ岩'],
      walk: { y: vy, h: H, rects: wr },
      meet: [{ p: [mx1, H(mx1, trailZ(mx1)), trailZ(mx1)], ry: -1.9 }, { p: [mx2, H(mx2, trailZ(mx2)), trailZ(mx2)], ry: 1.46 }],
      companion: { stand: { p: [vx - 1.2, vy, vz - 0.6], ry: 2.8, pose: 'stand' }, sit: { p: [vx - 0.9, vy, vz - 0.8], ry: 3.0, pose: 'stand' }, walk: { p: [-32, H(-32, trailZ(-32)), trailZ(-32) + 0.4], ry: 1.6, pose: 'stand' } },
      petalBox: (c.season === 'autumn') ? [[vx - 12, vy - 2, vz - 10], [vx + 12, vy + 8, vz + 8]] : null,
      amb: { nature: 1, wind: 0.5 }
    };
  };

  /* ================= 川・河原 ================= */
  S.river = function (c) {
    const g = new T.Group(), lamps = [], rng = U.rng(c.seed + 43), sp = K.seasonal(c), waters = [];
    const gr = K.ground(360, sp.grass, -0.6, 80); g.add(gr);
    const grassM = K.mTex(K.tex.rep(K.tex.noise(sp.grass, 0.12), 40, 3), { rough: 1 });
    /* 手前の土手と河原 */
    g.add(K.box(240, 3.6, 8, grassM, 0, -0.6, -16));
    const sl1 = K.box(240, 0.4, 7.2, grassM, 0, 0, 0); sl1.position.set(0, 1.3, -9.2); sl1.rotation.x = 0.44; g.add(sl1);
    g.add(K.plane(240, 2.4, K.m(sp.snowy ? '#e2e6e8' : '#a9a69a', { rough: 1 }), 0, 3.02, -15, { noShadow: true }));
    const gravel = K.mTex(K.tex.rep(K.tex.noise(sp.snowy ? P.snow : '#a8a498', 0.2), 60, 3), { rough: 1 });
    g.add(K.box(240, 0.8, 9.5, gravel, 0, -0.6, -1.2));
    /* 水 */
    const wt = K.water(240, 19, '#356878', { segX: 90, segZ: 10, amp: 0.05, speed: 2.2, opacity: 0.93, flat: true }); wt.position.set(0, 0.0, 12.8); g.add(wt); waters.push(skyWater(wt, '#356878'));
    g.add(K.box(240, 0.3, 19.5, K.m('#3f4f4a'), 0, -0.9, 12.8, { noCast: true }));
    /* 向こう岸 */
    g.add(K.box(240, 0.9, 5, gravel, 0, -0.6, 24.6));
    const sl2 = K.box(240, 0.4, 7.4, grassM, 0, 0, 0); sl2.position.set(0, 1.4, 30.2); sl2.rotation.x = -0.44; g.add(sl2);
    g.add(K.box(240, 3.7, 10, grassM, 0, -0.6, 38.5));
    for (let i = 0; i < 46; i++) { const cn = new T.Mesh(new T.ConeGeometry(0.18 + rng() * 0.2, 1.4 + rng() * 1.2, 5), K.m(sp.snowy ? '#c9c6b0' : (c.season === 'autumn' || c.season === 'winter' ? '#b3a36a' : '#7a9a56'), { flat: true })); cn.position.set(-60 + rng() * 120, 0.9, 22.6 + rng() * 2.4); cn.castShadow = true; g.add(cn); }
    for (let i = 0; i < 30; i++) { const cn = new T.Mesh(new T.ConeGeometry(0.14 + rng() * 0.16, 0.9 + rng() * 0.8, 5), K.m(sp.snowy ? '#c9c6b0' : (c.season === 'autumn' || c.season === 'winter' ? '#b3a36a' : '#7a9a56'), { flat: true })); cn.position.set(-40 + rng() * 80, 0.6, -5.2 + rng() * 1.6); cn.castShadow = true; g.add(cn); }
    for (let i = 0; i < 22; i++) { const r = K.rock(0.25 + rng() * 0.6, sp.snowy ? '#c9ced2' : U.pick(rng, ['#8f8e86', '#a09c90', '#7d7c76']), 30 + i); K.at(r, -24 + rng() * 48, 0.15, -4 + rng() * 6.4); g.add(r); }
    for (let i = 0; i < 6; i++) { const r = K.rock(0.5 + rng() * 0.6, '#7d7c76', 60 + i); K.at(r, -20 + rng() * 40, -0.1, 4.5 + rng() * 8); g.add(r); }
    const seat = K.rock(0.6, '#8a8982', 80); seat.scale.set(1.3, 0.8, 1.1); K.at(seat, -2.0, 0.2, 0.2); g.add(seat);
    /* 橋 */
    const br = K.group(42, 0, 12.5), cm = K.m(P.concrete);
    br.add(K.box(7, 0.8, 64, cm, 0, 5.2, 0)); for (const z of [-9, 9]) br.add(K.box(2.2, 6, 2.6, cm, 0, -0.7, z));
    for (const sx of [-1, 1]) br.add(K.box(0.15, 0.9, 64, K.m('#b9c2c4'), sx * 3.3, 6.0, 0));
    g.add(br);
    const bcar = K.car('#e6e8ea', 'kei'); K.at(bcar, 42.5, 6.0, -20); g.add(bcar); lamps.push(bcar);
    /* 水門、木、家 */
    const gate = K.group(-26, 0, -6.5); gate.add(K.box(3.4, 3.4, 1.4, cm, 0, -0.6, 0)); gate.add(K.box(1.6, 1.6, 0.2, K.m('#4f6f7c'), 0, 0.2, 0.72)); gate.add(K.box(0.2, 2.2, 0.2, K.m(P.steelDark), 0, 2.8, 0)); g.add(gate);
    for (let i = 0; i < 12; i++) { const t = K.tree({ kind: U.pick(rng, ['sakura', 'broad', 'sakura', 'ginkgo']), season: c.season, weather: c.weather, h: 6 + rng() * 3, seed: c.seed + i }); K.at(t, -66 + i * 12 + rng() * 4, 3.0, 40 + rng() * 2); g.add(t); }
    for (let i = 0; i < 7; i++) { const t = K.tree({ kind: 'sakura', season: c.season, weather: c.weather, h: 6.5, seed: c.seed + 50 + i }); K.at(t, -42 + i * 13, 3.0, -18.5); g.add(t); }
    for (let i = 0; i < 8; i++) { const h = K.house({ w: 7 + rng() * 3, d: 6, h: 3 + (rng() < 0.5 ? 2.6 : 0), rh: 1.5, wall: U.pick(rng, [P.wallWarm, P.wallCool, P.offwhite]), roof: U.pick(rng, [P.roof, P.roofRed]), snow: sp.snowy }); K.at(h, -64 + i * 17 + rng() * 5, -0.6, 54 + rng() * 6, rng() * 0.4); g.add(h); lamps.push(h); }
    g.add(K.ridge({ r: 190, hMin: 12, hMax: 40, color: sp.hill, seed: c.seed + 5, n: 40 })); g.add(K.ridge({ r: 280, hMin: 26, hMax: 76, color: sp.hillFar, seed: c.seed + 6, n: 44 }));
    return {
      group: g, indoor: false, label: '川べり', shadow: 32, shadowFollow: true,
      anchors: {
        stand: { p: [0.5, 1.82, 1.6], look: [5, 0.8, 16], lim: { yaw: 170, up: 60, down: 60 }, body: 'stand', ground: 0.2 },
        sit: { p: [-2.0, 1.2, 0.35], look: [3, 0.4, 14], lim: { yaw: 150, up: 60, down: 62 }, body: 'sit', ground: 0.2 },
        walk: { path: [[-34, 4.64, -15], [30, 4.64, -15]], lim: { yaw: 155, up: 60, down: 55 }, body: 'stand', ground: 3.02 }
      },
      body: { stand: { sleeve: '#6f7f8c', shoe: '#3a352e' }, sit: { sleeve: '#6f7f8c', legs: '#4c4f58' } },
      spots: [[5, 0.5, 9], [-8, 0.9, 1.5], [10, 5, 41], [42, 6.5, 6], [-26, 3.2, -6.5], [-4, 2.4, 22.8], [14, 0.6, 3]],
      spotNames: ['川の流れ', '河原の石', '向こう岸の木', '川にかかる橋', '水門', 'あしの茂み', '水ぎわ'],
      /* 土手の上（高さ 3.02）から、斜面をおりて河原（0.2）の水ぎわまで。水門（大きな箱）は自動判定で拾えないので除く */
      walk: { y: 0.2, h: (x, z) => U.clamp(1.662 - 0.4707 * (z + 9.03), 0.2, 3.02), rects: [[-36, -19.5, 34, 3.2]], holes: [[-27.8, -7.3, -24.2, -5.5]], start: [-1.8, 1.4] },
      meet: [{ p: [1.8, 0.2, 2.8], ry: -2.4 }, { p: [-27, 3.02, -15.6], ry: -PI / 2 }],
      companion: { stand: { p: [-1.0, 0.2, 2.3], ry: 2.7, pose: 'stand' }, sit: { p: [-3.2, 0.2, 1.2], ry: 2.4, pose: 'stand' }, walk: { p: [-32.5, 3.02, -14.3], ry: 1.6, pose: 'stand' } },
      petalBox: [[-16, 0, -22], [16, 8, 4]],
      amb: { river: 1, nature: 0.8 },
      onLight: S.lampSetter(lamps, (env) => { for (const f of waters) f(env); }),
      update(dt, env) { wt.userData.tick(env.time); }
    };
  };

  /* ================= 海辺・船の上 ================= */
  S.sea = function (c) { return c.v === 'boat' ? boat(c) : shore(c); };

  function lighthouse() {
    const g = new T.Group();
    g.add(K.cyl(1.3, 9, K.m(P.white, { rough: 0.6 }), 0, 0, 0, { rTop: 0.9, seg: 14 })); g.add(K.cyl(1.2, 0.3, K.m(P.concrete), 0, 9, 0, { seg: 14 }));
    const lm = K.m('#fff6d8', { emissive: '#fff2c0', ei: 0, nocache: true }); g.add(K.cyl(0.6, 1.1, lm, 0, 9.3, 0, { seg: 12, noShadow: true }));
    const top = new T.Mesh(new T.ConeGeometry(0.95, 0.9, 12), K.m('#b03a2e')); top.position.y = 10.85; g.add(top);
    g.userData.setLamp = (v) => { lm.emissiveIntensity = v * 3; };
    return g;
  }

  function shore(c) {
    const g = new T.Group(), lamps = [], rng = U.rng(c.seed + 44), sp = K.seasonal(c);
    const sandM = K.mTex(K.tex.rep(K.tex.noise(sp.snowy ? '#e2e4e2' : P.sand, 0.1), 50, 10), { rough: 1 });
    const beach = K.box(300, 1.0, 34, sandM, 0, 0, 0); beach.position.set(0, -0.72, -9); beach.rotation.x = 0.035; g.add(beach);
    g.add(K.plane(300, 5, K.m(sp.snowy ? '#c9ccca' : '#b5a684', { rough: 0.6 }), 0, 0.06, 4.6, { noShadow: true }));
    const sea = K.water(420, 300, '#2a6a8a', { segX: 84, segZ: 60, amp: 0.16, opacity: 0.96, rough: 0.25, flat: true }); sea.position.set(0, 0.0, 154); g.add(sea);
    g.add(K.box(420, 0.5, 300, K.m(P.seaDeep), 0, -1.6, 154, { noCast: true }));
    const foam = K.plane(300, 0.7, new T.MeshBasicMaterial({ color: 0xf4f6f4, transparent: true, opacity: 0.6, depthWrite: false }), 0, 0.09, 5.2, { noShadow: true }); K.noAO(foam); g.add(foam);
    const tint = skyWater(sea, '#2a6a8a');
    /* 防潮堤、松、家 */
    const cm = K.m(P.concrete);
    g.add(K.box(300, 2.0, 0.8, cm, 0, 0, -22)); for (let i = 0; i < 5; i++) g.add(K.box(2.4, 0.36, 0.5, cm, -8, i * 0.38, -21.4 + i * 0.5));
    for (let i = 0; i < 16; i++) { const t = K.tree({ kind: 'pine', season: c.season, weather: c.weather, h: 6 + rng() * 3, seed: c.seed + i }); K.at(t, -70 + i * 9.5 + rng() * 3, 0.6, -27 - rng() * 3); g.add(t); }
    const gr = K.ground(320, sp.grass, 0.55, 60); gr.position.z = -185; g.add(gr);
    for (let i = 0; i < 9; i++) { const h = K.house({ w: 7 + rng() * 3, d: 6, h: 3 + (rng() < 0.4 ? 2.6 : 0), rh: 1.5, wall: U.pick(rng, [P.wallWarm, P.wallCool, P.offwhite]), roof: U.pick(rng, [P.roof, P.roofRed, '#3d4248']), snow: sp.snowy }); K.at(h, -70 + i * 17 + rng() * 5, 0.55, -40 - rng() * 8, rng() * 0.4); g.add(h); lamps.push(h); }
    /* 突堤、灯台、船、消波ブロック */
    g.add(K.box(5, 2.2, 70, cm, -48, -0.8, 26));
    const lh = lighthouse(); K.at(lh, -48, 1.4, 58); g.add(lh); lamps.push(lh);
    const boats = [];
    for (let i = 0; i < 3; i++) { const b = K.group(-41 + i * 2.2, 0.1, 20 + i * 9, 0.2 + i * 0.3); b.add(K.box(2.2, 0.9, 7, K.m(P.white, { rough: 0.5 }), 0, 0, 0)); b.add(K.box(1.6, 1.5, 1.8, K.m('#e2e6e8'), 0, 0.9, -1.8)); b.add(K.box(2.24, 0.14, 7.04, K.m(U.pick(rng, ['#3d5a8c', '#b03a2e', '#3f6a55'])), 0, 0.72, 0)); g.add(b); boats.push(b); }
    for (let i = 0; i < 26; i++) { const r = K.rock(1.1 + rng() * 0.6, '#9a9a94', 100 + i); r.scale.y = 1.2; K.at(r, 44 + (i % 2) * 2 + rng(), 0.2, 2 + i * 2.2); g.add(r); }
    const up = K.group(9, 0.25, -6, 0.5); up.add(K.box(1.5, 0.6, 4.6, K.m('#d9dcd9', { rough: 0.6 }), 0, 0, 0)); up.add(K.box(1.54, 0.1, 4.64, K.m('#3d5a8c'), 0, 0.5, 0)); up.rotation.z = 0.12; g.add(up);
    const dw = K.rod([-6, 0.22, -4], [-3.6, 0.3, -3.2], 0.09, K.m('#b9ab94')); g.add(dw);
    const net = K.blob(0.6, K.m('#3f5a55', { flat: true }), 12, 0.3, -9, rng, 0.45); g.add(net);
    for (let i = 0; i < 4; i++) g.add(K.sph(0.16, K.m('#d9742b'), 12.5 + (i % 2) * 0.4, 0.42, -9.6 + i * 0.35, { ws: 8, hs: 6 }));
    g.add(K.ridge({ r: 260, hMin: -4, hMax: 46, color: sp.hill, seed: c.seed + 5, n: 30, from: PI * 0.72, to: PI * 1.12, rough: 0.6 }));
    g.add(K.ridge({ r: 340, hMin: 0, hMax: 26, color: sp.hillFar, seed: c.seed + 6, n: 24, from: PI * 0.12, to: PI * 0.42, rough: 0.5 }));
    g.add(K.ridge({ r: 300, hMin: 16, hMax: 60, color: sp.hillFar, seed: c.seed + 7, n: 36, from: PI * 1.05, to: PI * 1.98 }));
    /* 砂の面の高さ。浜は海へ向かってゆるく下がり、波打ちぎわ（z > 2.1）はぬれた砂の板 */
    const sandH = (x, z) => z > 2.1 ? 0.06 : 0.2794 - 0.035 * (z + 8.965);
    return {
      group: g, indoor: false, label: '海辺', shadow: 32, shadowFollow: true,
      anchors: {
        stand: { p: [0, 1.8, -1.0], look: [5, 1.3, 50], lim: { yaw: 170, up: 60, down: 60 }, body: 'stand', ground: 0.22 },
        walk: { path: [[-26, 1.75, 0.8], [26, 1.75, 0.8]], lim: { yaw: 155, up: 60, down: 55 }, body: 'stand', ground: 0.15 },
        sit: { p: [-3, 1.22, -4.5], look: [2, 0.7, 40], lim: { yaw: 150, up: 60, down: 62 }, body: 'sit', ground: 0.3 }
      },
      body: { stand: { sleeve: '#8a9aa8', shoe: '#d8b89a' }, sit: { sleeve: '#8a9aa8', legs: '#5a6272' } },
      spots: [[6, 0.5, 9], [-48, 9.6, 58], [9, 1.2, -6], [-41, 1.6, 20], [12, 0.9, -9], [20, 2.5, 60], [-5, 0.6, -3.6]],
      spotNames: ['寄せる波', '灯台', '浜に上げた小舟', '港の漁船', '網と浮き玉', '水平線', '流木'],
      /* 防潮堤の手前から、波打ちぎわまでの砂浜 */
      walk: { y: 0, h: sandH, rects: [[-34, -21.3, 34, 3.4]] },
      meet: [{ p: [1.2, sandH(1.2, 2.2), 2.2], ry: -2.8 }, { p: [-6.5, sandH(-6.5, -0.6), -0.6], ry: 2.0 }],
      companion: { stand: { p: [-1.3, 0.2, 0.2], ry: 2.8, pose: 'stand' }, sit: { p: [-4.2, 0.3, -3.6], ry: 2.6, pose: 'stand' }, walk: { p: [-24.5, 0.15, 1.6], ry: 1.6, pose: 'stand' } },
      amb: { sea: 1, wind: 0.4 },
      onLight: S.lampSetter(lamps, (env) => { tint(env); foam.material.color.setScalar(0.25 + 0.75 * Math.min(1, env.dayLight + 0.1)); }),
      update(dt, env) {
        sea.userData.tick(env.time);
        const w = Math.sin(env.time * 0.55);
        foam.position.z = 5.0 + w * 1.1; foam.material.opacity = 0.35 + 0.4 * (0.5 - w * 0.5);
        boats.forEach((b, i) => { b.rotation.z = Math.sin(env.time * 0.8 + i) * 0.04; b.position.y = 0.1 + Math.sin(env.time * 0.7 + i * 2) * 0.06; });
      }
    };
  }

  function boat(c) {
    const g = new T.Group(), lamps = [], rng = U.rng(c.seed + 45), sp = K.seasonal(c);
    const sea = K.water(600, 600, '#24607c', { segX: 90, segZ: 90, amp: 0.3, opacity: 0.97, rough: 0.25, flat: true }); sea.position.set(0, 0, 60); g.add(sea);
    const tint = skyWater(sea, '#24607c');
    const bt = new T.Group(); g.add(bt);
    const wm = K.m(P.white, { rough: 0.5 }), dkm = K.mTex(K.tex.rep(K.tex.wood('#b9ab94', 8), 1, 3), { rough: 0.8 });
    bt.add(K.box(2.9, 1.0, 7.6, wm, 0, -0.35, 0)); bt.add(K.plane(2.6, 7.4, dkm, 0, 0.66, 0));
    const bow = K.box(2.05, 1.0, 2.05, wm, 0, -0.35, 4.6); bow.rotation.y = PI / 4; bow.scale.set(1, 1, 1.25); bt.add(bow);
    bt.add(K.box(2.94, 0.16, 7.64, K.m(U.pick(rng, ['#3d5a8c', '#3f6a55', '#b03a2e'])), 0, 0.5, 0));
    for (const sx of [-1, 1]) { bt.add(K.box(0.08, 0.5, 7.6, wm, sx * 1.42, 0.66, 0)); bt.add(K.rod([sx * 1.42, 1.5, -3.5], [sx * 1.42, 1.5, 1.5], 0.02, K.m(P.steel, { metal: 0.5 }))); for (const z of [-3.5, -1, 1.5]) bt.add(K.rod([sx * 1.42, 1.16, z], [sx * 1.42, 1.5, z], 0.02, K.m(P.steel, { metal: 0.5 }))); }
    const wh = K.group(0, 0.66, -2.6); wh.add(K.box(1.9, 1.9, 1.7, K.m('#e6eaea'), 0, 0, 0)); wh.add(K.box(1.7, 0.6, 0.04, K.m('#2c3840', { rough: 0.2 }), 0, 1.05, 0.86, { noShadow: true })); wh.add(K.box(2.1, 0.08, 1.9, K.m('#3d5a8c'), 0, 1.9, 0));
    wh.add(K.cyl(0.04, 2.6, K.m(P.steel, { metal: 0.5 }), 0, 1.9, 0)); const ml = K.m('#fff6d8', { emissive: '#fff2c0', ei: 0, nocache: true }); wh.add(K.sph(0.1, ml, 0, 4.5, 0, { noShadow: true })); bt.add(wh);
    const pl = new T.PointLight(0xffe8c0, 0, 14, 1.5); pl.position.set(0, 4.6, -2.0); bt.add(pl);
    const dr = K.cyl(0.32, 0.9, K.m(P.steelDark, { metal: 0.4 }), 0.6, 0.66, 2.6); dr.rotation.z = PI / 2; dr.position.set(0.45, 1.0, 2.7); bt.add(dr);
    const cc = ['#3d6a9c', '#d9b445', '#3d6a9c', '#c9584a'];
    for (let i = 0; i < 4; i++) bt.add(K.box(0.6, 0.34, 0.42, K.m(cc[i], { rough: 0.5 }), -0.8 + (i % 2) * 0.66, 0.66 + Math.floor(i / 2) * 0.34, 0.2));
    bt.add(K.blob(0.55, K.m('#3f5a55', { flat: true }), 0.9, 0.9, -0.4, rng, 0.45));
    for (let i = 0; i < 5; i++) bt.add(K.sph(0.15, K.m('#d9742b'), 1.0 + (i % 2) * 0.24, 0.82, 0.7 + i * 0.3, { ws: 8, hs: 6 }));
    const rope = new T.Mesh(new T.TorusGeometry(0.26, 0.05, 6, 16), K.m('#c9bfa6')); rope.rotation.x = PI / 2; rope.position.set(-0.9, 0.72, 3.0); bt.add(rope);
    g.add(K.ridge({ r: 420, hMin: 6, hMax: 60, color: sp.hillFar, seed: c.seed + 5, n: 36, from: PI * 1.1, to: PI * 1.9, rough: 0.5 }));
    g.add(K.ridge({ r: 300, hMin: 2, hMax: 24, color: sp.hill, seed: c.seed + 6, n: 14, from: PI * 0.1, to: PI * 0.25, rough: 0.5 }));
    return {
      group: g, indoor: false, label: '船の上', shadow: 16, center: [0, 0, 0], rock: 1.0,
      anchors: {
        stand: { p: [0.35, 2.3, -0.4], look: [-0.6, 1.2, 14], lim: { yaw: 175, up: 60, down: 60 }, body: 'stand', ground: 0.66 },
        sit: { p: [-0.75, 1.68, 0.25], look: [-14, 0.9, 12], lim: { yaw: 160, up: 60, down: 62 }, body: 'sit', ground: 0.66 }
      },
      body: { stand: { sleeve: '#d9a23c', shoe: '#e6e8ea' }, sit: { sleeve: '#d9a23c', legs: '#d9a23c' } },
      spots: [[0.45, 1.2, 2.7], [0, 5.2, -2.6], [0, 1.4, 5.2], [-20, 1, 30], [1.0, 1.1, 1.2], [-0.9, 0.9, 3.0], [18, 2, 60]],
      spotNames: ['巻き上げ機', 'マストの灯', '船のへさき', '沖の波', '浮き玉', '巻いたロープ', '水平線'],
      /* 魚箱と網より前の甲板だけ。操舵室と魚箱のあいだは、網と魚箱にふさがれて前へ抜けられない（閉じこめられる）ので入れない */
      walk: { y: 0.66, rects: [[-1.3, 0.0, 1.3, 3.7]], start: [-0.5, 0.95] },
      companion: { stand: { p: [-0.7, 0.66, 2.0], ry: 0.2, pose: 'stand' }, sit: { p: [0.6, 0.66, 1.6], ry: -1.4, pose: 'stand' } },
      amb: { sea: 0.8, engine: 0.4, wind: 0.5 },
      onLight(env) { tint(env); ml.emissiveIntensity = env.lampOn * 3; pl.intensity = env.lampOn * 16; },
      update(dt, env) { sea.userData.tick(env.time); bt.rotation.z = Math.sin(env.time * 0.85) * 0.03; bt.rotation.x = Math.sin(env.time * 0.5) * 0.012; bt.position.y = Math.sin(env.time * 0.62 + 1) * 0.045; }
    };
  }
})(window.SI);
