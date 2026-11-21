'use strict';
/* 最期の一日 — 場所（自宅）: 和室、居間、寝室、浴室 */
(function (SI) {
  const T = window.THREE, U = SI.U, K = SI.Kit, P = K.P;
  const S = SI.stages = SI.stages || {};
  const PI = Math.PI;

  /* 明かりをまとめて灯す */
  S.lampSetter = function (list, extra) {
    return function (env) {
      for (const l of list) if (l.userData.setLamp) l.userData.setLamp(env.lampOn, l.userData.power);
      if (extra) extra(env);
    };
  };

  /* 窓の外の、ふつうの住宅地。南（+Z）側に置く */
  S.neighborhood = function (g, c, z0, y0, lamps) {
    const sp = K.seasonal(c), rng = U.rng(c.seed + 77);
    const gr = K.ground(140, sp.grass, y0, 30); gr.position.z = z0 + 40; g.add(gr);
    const houses = [[-11, 19, 0.3], [6.5, 22, -0.2], [21, 18, 0.5], [-25, 24, 0.1], [0, 36, 0.0], [14, 38, 0.4], [-14, 40, -0.3]];
    for (const hpos of houses) {
      const h = K.house({ w: 6 + rng() * 3, d: 5.5 + rng() * 2, h: 2.9 + (rng() < 0.5 ? 2.5 : 0), rh: 1.5, wall: U.pick(rng, [P.wallWarm, P.wallCool, P.offwhite, P.beige]), roof: U.pick(rng, [P.roof, P.roofRed, '#3d4248']), snow: sp.snowy });
      K.at(h, hpos[0], y0, z0 + hpos[1], hpos[2]); g.add(h); lamps.push(h);
    }
    for (let i = 0; i < 7; i++) {
      const t = K.tree({ kind: U.pick(rng, ['broad', 'broad', 'conifer', 'ginkgo']), season: c.season, weather: c.weather, h: 4 + rng() * 3, seed: c.seed + i * 13 });
      K.at(t, -24 + i * 8 + rng() * 3, y0, z0 + 10 + rng() * 9); g.add(t);
    }
    const p1 = K.pole(8); K.at(p1, -6, y0, z0 + 9.5); g.add(p1);
    const p2 = K.pole(8); K.at(p2, 16, y0, z0 + 9.5); g.add(p2);
    g.add(K.wires([-6, y0 + 7.3, z0 + 9.5], [16, y0 + 7.3, z0 + 9.5], 3, 0.6));
    g.add(K.ridge({ r: 230, hMin: 8, hMax: 26, color: sp.hillFar, seed: c.seed + 3, n: 40 }));
  };

  /* ================= 和室 ================= */
  S.washitsu = function (c) {
    const g = new T.Group(), sp = K.seasonal(c), lamps = [];
    const W = 3.64, D = 3.64, H = 2.4, zS = D / 2;
    const wood = K.m(P.woodDark), woodL = K.mTex(K.tex.rep(K.tex.wood(P.woodLight, 6), 2, 1));
    const tat = K.mTex(K.tex.rep(K.tex.tatami(), 2, 4), { rough: 0.95 });
    const wall = K.mTex(K.tex.rep(K.tex.noise(P.plaster, 0.07), 3, 2));
    g.add(K.room({
      w: W, d: D, h: H, wall, floor: tat, ceil: woodL, frame: wood, base: false,
      openings: [{ side: 'S', at: 0, w: 3.3, y: 0, h: 1.8, kind: 'open' }, { side: 'W', at: 0.55, w: 0.9, y: 0.8, h: 0.95, kind: 'frame' }]
    }));
    /* 柱となげし */
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(K.box(0.105, H, 0.105, wood, sx * (W / 2 - 0.05), 0, sz * (D / 2 - 0.05)));
    g.add(K.box(W, 0.09, 0.03, wood, 0, 1.8, -D / 2 + 0.015)); g.add(K.box(0.03, 0.09, D, wood, W / 2 - 0.015, 1.8, 0)); g.add(K.box(0.03, 0.09, D, wood, -W / 2 + 0.015, 1.8, 0));
    g.add(K.box(3.5, 0.09, 0.18, wood, 0, 1.775, zS + 0.07)); g.add(K.box(3.3, 0.02, 0.16, wood, 0, 0, zS + 0.07, { noCast: true }));
    /* 障子（両わきに寄せてある） */
    const shT = K.tex.rep(K.tex.shoji(), 1, 1);
    const shM = new T.MeshStandardMaterial({ map: shT, emissiveMap: shT, emissive: new T.Color('#fff3dc'), emissiveIntensity: 0.3, roughness: 0.9, side: T.DoubleSide });
    for (const sx of [-1, 1]) { const p = K.box(0.8, 1.76, 0.025, shM, sx * 1.26, 0.02, zS + 0.05); g.add(p); }
    const wsh = K.box(0.025, 0.93, 0.88, shM, -W / 2 - 0.05, 0.81, 0.55); g.add(wsh);
    /* 縁側とひさし */
    const deck = K.mTex(K.tex.rep(K.tex.wood(P.wood, 8), 1, 3));
    g.add(K.box(W + 0.5, 0.06, 0.98, deck, 0, -0.06, zS + 0.14 + 0.49));
    g.add(K.box(W + 0.5, 0.39, 0.08, wood, 0, -0.45, zS + 1.06));
    g.add(K.box(W + 1.4, 0.12, 1.75, K.m(P.roof), 0, H + 0.03, zS + 0.85));
    for (const sx of [-1, 1]) g.add(K.box(0.1, H + 0.45, 0.1, wood, sx * (W / 2 + 0.15), -0.45, zS + 1.05));
    g.add(K.box(W + 0.4, 0.1, 0.1, wood, 0, H - 0.1, zS + 1.05));

    /* 室内 */
    const futon = K.futon(); K.at(futon, 0, 0, 0.1, PI); g.add(futon);
    const tbl = K.roundTable(0.36, 0.32); K.at(tbl, -1.2, 0, 1.05); g.add(tbl);
    const tp = K.teapot(P.woodDark); K.at(tp, -1.25, 0.32, 1.0); g.add(tp);
    const cup = K.cup(P.offwhite, 0.07); K.at(cup, -1.05, 0.32, 1.16); g.add(cup);
    const zb = K.zabuton(P.navy); K.at(zb, -1.2, 0, 0.35, 0.2); g.add(zb);
    /* 仏壇 */
    const bd = K.group(-W / 2 + 0.26, 0, -0.95, PI / 2);
    bd.add(K.box(0.62, 0.5, 0.44, wood, 0, 0, 0));
    bd.add(K.box(0.62, 0.86, 0.04, wood, 0, 0.5, -0.2)); bd.add(K.box(0.04, 0.86, 0.44, wood, -0.29, 0.5, 0)); bd.add(K.box(0.04, 0.86, 0.44, wood, 0.29, 0.5, 0));
    bd.add(K.box(0.62, 0.04, 0.44, wood, 0, 1.36, 0));
    bd.add(K.box(0.54, 0.8, 0.02, K.m(P.gold, { metal: 0.6, rough: 0.45 }), 0, 0.52, -0.17, { noCast: true }));
    bd.add(K.box(0.5, 0.16, 0.2, K.m('#3a2a20'), 0, 0.5, -0.06));
    bd.add(K.box(0.05, 0.16, 0.03, K.m(P.gold, { metal: 0.6, rough: 0.4 }), 0, 0.68, -0.08));
    bd.add(K.cyl(0.03, 0.05, K.m(P.gold, { metal: 0.6, rough: 0.4 }), -0.14, 0.5, 0.1)); bd.add(K.cyl(0.006, 0.09, K.m(P.offwhite), 0.14, 0.5, 0.1));
    for (const sx of [-1, 1]) { const dr = K.box(0.3, 0.84, 0.02, wood, sx * 0.44, 0.51, 0.27); dr.rotation.y = sx * -0.5; bd.add(dr); }
    g.add(bd);
    /* たんす、写真、時計、暦 */
    const tansu = K.cabinet(0.92, 1.05, 0.42, K.m(P.wood)); K.at(tansu, W / 2 - 0.24, 0, -1.15, -PI / 2); g.add(tansu);
    const ph = K.photo(0.17, 0.13); K.at(ph, W / 2 - 0.3, 1.05, -1.3, -PI / 2 + 0.3); g.add(ph);
    const vs = K.vase(c.season === 'autumn' ? '#c9a13a' : (c.season === 'winter' ? '#b4433a' : '#e9d8e6'), 3); K.at(vs, W / 2 - 0.3, 1.05, -0.9); g.add(vs);
    const clock = K.wallClock(c.hour); K.at(clock, W / 2 - 0.04, 1.98, 0.5, -PI / 2); g.add(clock);
    const cal = K.calendar(); K.at(cal, W / 2 - 0.035, 1.18, 1.2, -PI / 2); g.add(cal);
    /* 掛け軸 */
    g.add(K.box(0.42, 1.2, 0.01, K.m(P.paper), 1.05, 0.55, -D / 2 + 0.02, { noCast: true }));
    g.add(K.box(0.3, 0.6, 0.012, K.m('#d9d2c0'), 1.05, 0.85, -D / 2 + 0.022, { noCast: true }));
    const lamp = K.ceilingLamp('washi'); K.at(lamp, 0, H, 0.1); lamp.userData.power = 7; g.add(lamp); lamps.push(lamp);
    const fills = [];
    { const fl = new T.PointLight(0xffffff, 0, 8, 1.4); fl.position.set(0, 1.5, zS - 0.4); fl.userData.power = 6; g.add(fl); fills.push(fl); }
    const zb2 = K.zabuton('#8a5a4a'); K.at(zb2, 0.5, 0, zS + 0.62); g.add(zb2);

    /* 庭 */
    const y0 = -0.45;
    const moss = K.ground(26, sp.snowy ? P.snow : K.mixc(P.moss, sp.grass, 0.5), y0 + 0.005, 8); moss.position.z = zS + 8; g.add(moss);
    const st = K.rock(0.55, '#8d8c86', 3); st.scale.set(1.3, 0.5, 0.8); K.at(st, 0.4, y0 - 0.02, zS + 1.5); g.add(st);
    for (let i = 0; i < 4; i++) { const s2 = K.rock(0.3, '#93928b', 10 + i); s2.scale.set(1, 0.25, 1); K.at(s2, 0.5 + Math.sin(i * 1.3) * 0.3, y0 - 0.03, zS + 2.3 + i * 0.75); g.add(s2); }
    const kind = c.season === 'autumn' ? 'momiji' : (c.season === 'summer' ? 'broad' : 'sakura');
    const tree = K.tree({ kind, season: c.season, weather: c.weather, h: 4.6, seed: c.seed + 1 }); K.at(tree, 1.9, y0, zS + 3.9); g.add(tree);
    const pine = K.tree({ kind: 'pine', season: c.season, weather: c.weather, h: 3.2, seed: c.seed + 5 }); K.at(pine, -3.2, y0, zS + 4.6); g.add(pine);
    const lan = K.stoneLantern(); K.at(lan, -1.45, y0, zS + 3.1, 0.3); g.add(lan); lamps.push(lan);
    for (let i = 0; i < 5; i++) { const b = K.bush(sp.snowy ? K.mixc(P.leafDark, P.snow, 0.5) : P.leafDark, 0.5 + (i % 2) * 0.15, 20 + i); K.at(b, -5 + i * 2.4, y0, zS + 5.9); g.add(b); }
    const r1 = K.rock(0.45, '#85847e', 31); K.at(r1, -2.3, y0, zS + 2.6); g.add(r1);
    const fence = K.fence(16, 1.5, '#5a4a3a', true); K.at(fence, 0, y0, zS + 6.8); g.add(fence);
    S.neighborhood(g, c, zS, y0, lamps);

    return {
      group: g, indoor: true, label: '自宅の和室', shadow: 9, center: [0, 0, 1.5],
      anchors: {
        lie: { p: [0, 0.37, -0.57], look: [0, 0.9, 3.2], lim: { yaw: 100, up: 62, down: 24 }, body: 'lie' },
        sit: { p: [0.5, 0.74, zS + 0.9], look: [0.9, 0.3, zS + 5], lim: { yaw: 125, up: 60, down: 62 }, body: 'sit' },
        stand: { p: [-0.9, 1.5, 0.7], look: [0.7, 0.9, zS + 4], lim: { yaw: 140, up: 55, down: 55 }, body: 'stand' }
      },
      body: { lie: { blanket: P.blanketWarm, sleeve: '#9aa7b5' }, sit: { sleeve: '#7d8794', legs: '#4a4f5c' }, stand: { sleeve: '#7d8794' } },
      spots: [[1.9, 1.3, zS + 3.6], [-1.45, 0.5, zS + 3.1], [0.5, 0.3, zS + 0.62], [-1.2, 0.55, 1.05], [-W / 2 + 0.45, 1.0, -0.95], [W / 2 - 0.3, 1.3, -1.3], [W / 2 - 0.1, 1.98, 0.5]],
      companion: {
        lie: { p: [0.98, 0, 0.75], ry: -2.5, pose: 'seiza' },
        sit: { p: [-0.35, 0, zS + 0.6], ry: 0.25, pose: 'seiza' },
        stand: { p: [0.5, 0, 1.2], ry: PI + 0.5, pose: 'stand' }
      },
      weatherBox: [[-10, y0, zS + 1.3], [10, 9, zS + 14]],
      dustBox: [[-1.3, 0.1, 0.2], [1.3, 1.7, zS]],
      petalBox: [[-3, y0, zS + 1.3], [4.5, 4.6, zS + 7]],
      fills: fills,
      amb: { tick: 1, garden: 1 },
      onLight: S.lampSetter(lamps, (env) => { shM.emissiveIntensity = 0.04 + env.skyFill * 0.26; clock.userData.setTime(env.hour); }),
      update(dt, env) { if (tree.userData.foliage) tree.userData.foliage.rotation.z = Math.sin(env.time * 0.6) * 0.012 * (1 + env.wind * 3); }
    };
  };
})(window.SI);
