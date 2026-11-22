'use strict';
/* 最期の一日 — 場所（自宅のつづき）: 居間、寝室、浴室 */
(function (SI) {
  const T = window.THREE, U = SI.U, K = SI.Kit, P = K.P;
  const S = SI.stages;
  const PI = Math.PI;

  /* 窓からの空の明るさ */
  S.fill = function (g, fills, x, y, z, power, dist) {
    const fl = new T.PointLight(0xffffff, 0, dist || 8, 1.4);
    fl.position.set(x, y, z); fl.userData.power = power; g.add(fl); fills.push(fl); return fl;
  };
  /* 上の階から見おろす街 */
  S.cityBelow = function (g, c, z0, y0, lamps, dense) {
    const sp = K.seasonal(c), rng = U.rng(c.seed + 55);
    const gr = K.ground(260, sp.snowy ? P.snow : '#8b8f86', y0, 40); gr.position.z = z0 + 90; g.add(gr);
    const cols = ['#b9b6ad', '#a9adb2', '#c4bcae', '#9fa3a0', '#bdb3a6', '#aab2b8'];
    const n = dense ? 26 : 16;
    for (let i = 0; i < n; i++) {
      const w = 8 + rng() * 10, d = 8 + rng() * 10, h = (dense ? 14 : 6) + rng() * (dense ? 34 : 14);
      const b = K.building(w, h, d, U.pick(rng, cols), c.seed + i * 7);
      K.at(b, -70 + rng() * 140, y0, z0 + 16 + rng() * 110, rng() < 0.5 ? 0 : 0.2); g.add(b); lamps.push(b);
    }
    for (let i = 0; i < 9; i++) {
      const t = K.tree({ kind: U.pick(rng, ['broad', 'ginkgo', 'sakura']), season: c.season, weather: c.weather, h: 6 + rng() * 3, seed: c.seed + 200 + i });
      K.at(t, -30 + i * 8 + rng() * 4, y0, z0 + 7 + rng() * 6); g.add(t);
    }
    g.add(K.ridge({ r: 300, hMin: y0 + 12, hMax: y0 + 42, color: sp.hillFar, seed: c.seed + 4, n: 44 }));
  };
  /* 窓の外の、木の多い庭 */
  S.gardenView = function (g, c, z0, y0, lamps) {
    const sp = K.seasonal(c), rng = U.rng(c.seed + 91);
    const gr = K.ground(120, sp.grass, y0, 26); gr.position.z = z0 + 40; g.add(gr);
    const kinds = ['sakura', 'broad', 'momiji', 'ginkgo', 'broad', 'conifer', 'pine'];
    for (let i = 0; i < 9; i++) {
      const t = K.tree({ kind: kinds[i % kinds.length], season: c.season, weather: c.weather, h: 4 + rng() * 3.5, seed: c.seed + 300 + i });
      K.at(t, -16 + i * 4 + rng() * 2, y0, z0 + 5 + (i % 3) * 3.5 + rng() * 2); g.add(t);
    }
    for (let i = 0; i < 7; i++) { const b = K.bush(sp.snowy ? K.mixc(P.leafDark, P.snow, 0.5) : (i % 3 ? P.leafDark : P.leaf), 0.5 + rng() * 0.3, 40 + i); K.at(b, -9 + i * 3 + rng(), y0, z0 + 3 + rng() * 1.5); g.add(b); }
    const bn = K.bench(); K.at(bn, 2.2, y0, z0 + 4.2, PI + 0.3); g.add(bn);
    g.add(K.ridge({ r: 200, hMin: y0 + 10, hMax: y0 + 30, color: sp.hill, seed: c.seed + 6, n: 40 }));
    g.add(K.ridge({ r: 260, hMin: y0 + 18, hMax: y0 + 48, color: sp.hillFar, seed: c.seed + 8, n: 40 }));
  };

  /* ================= 居間と台所 ================= */
  S.living = function (c) {
    const g = new T.Group(), lamps = [], fills = [], rng = U.rng(c.seed + 2), pal = c.pal || {};          // pal: 家ごとの色（39b_home_vary.js）
    const W = 5.4, D = 4.6, H = 2.4, zS = D / 2;
    const floor = K.mTex(K.tex.rep(K.tex.wood(pal.floor || P.woodLight, 6), 3, 3), { rough: 0.7 });
    const wall = K.mTex(K.tex.rep(K.tex.noise(pal.wall || P.wallWarm, 0.05), 4, 2));
    g.add(K.room({ w: W, d: D, h: H, wall, floor, openings: [{ side: 'S', at: 0.9, w: 2.6, y: 0, h: 2.0, kind: 'window' }, { side: 'W', at: -1.0, w: 0.9, y: 1.0, h: 0.8, kind: 'window' }] }));
    const curC = pal.curtain || U.pick(rng, [P.beige, '#c9d2c4', '#d5c7c7']); for (const sx of [-1, 1]) { const cu = K.curtain(0.45, 2.05, curC); K.at(cu, 0.9 + sx * 1.5, 0.02, zS - 0.09); g.add(cu); }
    g.add(K.box(3.4, 0.04, 0.05, K.m(P.woodDark), 0.9, 2.1, zS - 0.09));
    /* 台所 */
    const kit = K.kitchen(2.3); K.at(kit, -1.3, 0, -zS + 0.31); g.add(kit);
    const fr = K.fridge(); K.at(fr, 0.45, 0, -zS + 0.33); g.add(fr);
    const rice = K.sph(0.13, K.m(P.offwhite, { rough: 0.4 }), -0.45, 0.94, -zS + 0.3, { s: [1, 0.85, 1] }); g.add(rice);
    const kettle = K.cyl(0.08, 0.16, K.m(P.steel, { metal: 0.6, rough: 0.35 }), -0.75, 0.86, -zS + 0.32, { rTop: 0.06 }); g.add(kettle);
    /* 食卓 */
    const tx = -0.9, tz = -0.25;
    const tbl = K.table(1.3, 0.8, 0.7, K.mTex(K.tex.rep(K.tex.wood(pal.wood || P.wood, 4), 1, 1))); K.at(tbl, tx, 0, tz); g.add(tbl);
    const chairs = [[tx - 0.25, tz - 0.68, 0], [tx + 0.3, tz - 0.68, 0], [tx - 0.25, tz + 0.68, PI], [tx + 0.3, tz + 0.68, PI]];
    for (const ch of chairs) { const x = K.chair(K.m(P.wood)); K.at(x, ch[0], 0, ch[1], ch[2]); g.add(x); }
    const cup = K.cup(P.offwhite); K.at(cup, tx - 0.1, 0.7, tz - 0.2); g.add(cup);
    const cup2 = K.cup('#c9d6dc'); K.at(cup2, tx + 0.25, 0.7, tz + 0.18); g.add(cup2);
    const bowl = K.bowl(P.black); K.at(bowl, tx - 0.34, 0.7, tz - 0.21); g.add(bowl);      // 皿と重ならないように
    const plate = K.plate(P.white); K.at(plate, tx - 0.3, 0.7, tz + 0.02); g.add(plate);
    const news = K.paperSheet(0.3, 0.4); K.at(news, tx + 0.35, 0.7, tz - 0.15, 0.2); g.add(news);
    g.add(K.rod([tx - 0.45, 0.705, tz - 0.3], [tx - 0.22, 0.705, tz - 0.3], 0.004, K.m(P.woodDark), { noCast: true }));
    /* テレビとソファ */
    const tvb = K.cabinet(1.3, 0.42, 0.4, K.m(P.woodDark)); K.at(tvb, W / 2 - 0.24, 0, 0.8, -PI / 2); g.add(tvb);
    const tv = K.tv(0.95); K.at(tv, W / 2 - 0.26, 0.42, 0.8, -PI / 2); g.add(tv);
    const sofa = K.sofa(pal.sofa || U.pick(rng, [P.cloth, '#8f9a8a', '#9a8f9c', '#7f8c99'])); K.at(sofa, 0.55, 0, 0.9, PI / 2); g.add(sofa);
    const rug = K.rug(1.6, 1.9, pal.rug || U.pick(rng, ['#b5a58c', '#a8b0a8', '#b49a92'])); K.at(rug, 1.55, 0, 0.85); g.add(rug);
    if (!c.noLowTable) {                                                   // こたつを置く家（39b_home_vary.js）では出さない
      const lt = K.table(0.9, 0.5, 0.36, K.m(P.woodDark)); K.at(lt, 1.55, 0, 0.85, PI / 2); g.add(lt);
      const remote = K.box(0.05, 0.02, 0.16, K.m(P.black), 1.5, 0.36, 0.7); g.add(remote);
    }
    /* 棚、写真、時計、暦 */
    const sh = K.shelf(0.9, 1.5, 0.3, K.m(P.wood), 4); K.at(sh, -W / 2 + 0.17, 0, 1.25, PI / 2); g.add(sh);
    const bk = K.books(0.75, 0.24, c.seed); K.at(bk, -W / 2 + 0.17, 0.4, 1.25, PI / 2); g.add(bk);
    const bk2 = K.books(0.5, 0.22, c.seed + 9); K.at(bk2, -W / 2 + 0.17, 0.77, 1.1, PI / 2); g.add(bk2);
    const ph = K.photo(0.18, 0.14); K.at(ph, -W / 2 + 0.2, 1.14, 1.5, PI / 2); g.add(ph);
    const vs = K.vase(U.pick(rng, [P.yellow, '#d98a8a', '#e9e2f0']), 4); K.at(vs, -W / 2 + 0.2, 1.5, 1.05); g.add(vs);
    const clock = K.wallClock(c.hour); K.at(clock, W / 2 - 0.04, 1.95, -0.7, -PI / 2); g.add(clock);
    const cal = K.calendar(); K.at(cal, 1.4, 1.25, -zS + 0.02, 0); g.add(cal);
    const door = K.door(); K.at(door, 2.1, 0, -zS + 0.02); g.add(door);
    const lamp = K.ceilingLamp(); K.at(lamp, tx, H, tz); lamp.userData.power = 9; g.add(lamp); lamps.push(lamp);
    const lamp2 = K.ceilingLamp(); K.at(lamp2, 1.5, H, 0.9); lamp2.userData.power = 7; g.add(lamp2); lamps.push(lamp2);
    const sl = K.slippers(); K.at(sl, 0.2, 0, -1.2, 0.4); g.add(sl);
    S.fill(g, fills, 0.9, 2.2, zS - 0.9, 12, 9); S.fill(g, fills, -W / 2 + 0.6, 1.4, -1.0, 4, 5);
    /* 物干しと外 */
    const y0 = -0.25;
    g.add(K.box(3.2, 0.25, 1.4, K.m(P.concrete), 0.9, y0, zS + 0.84));
    for (const sx of [-1.3, 1.3]) g.add(K.cyl(0.025, 1.9, K.m(P.steel, { metal: 0.5 }), 0.9 + sx, 0, zS + 1.2));
    g.add(K.rod([-0.4, 1.85, zS + 1.2], [2.2, 1.85, zS + 1.2], 0.015, K.m(P.steel, { metal: 0.5 })));
    if (c.weather === 'clear' || c.weather === 'cloudy') {
      const cols = [P.white, '#c9d6e2', P.beige, '#e2c9c9', P.white];
      for (let i = 0; i < 5; i++) { const cl = K.box(0.34 + rng() * 0.12, 0.42 + rng() * 0.2, 0.02, K.m(cols[i], { double: true }), -0.1 + i * 0.5, 1.83 - 0.45 - rng() * 0.12, zS + 1.2); cl.userData.sw = rng() * 6; g.add(cl); (g.userData.cloth = g.userData.cloth || []).push(cl); }
    }
    S.neighborhood(g, c, zS, y0, lamps);
    const scr = tv.userData.screen.material;
    return {
      group: g, indoor: true, label: '自宅の居間', shadow: 10, center: [0.5, 0, 1.5],
      anchors: {
        sit: { p: [tx - 0.25, 1.17, tz - 0.62], look: [0.5, 0.95, 2.2], lim: { yaw: 130, up: 55, down: 60 }, body: 'sit' },
        stand: { p: [-0.1, 1.52, -1.5], look: [0.9, 1.0, 2.2], lim: { yaw: 150, up: 55, down: 55 }, body: 'stand' },
        lie: { p: [1.6, 0.26, -0.55], look: [1.5, 1.2, 2.2], lim: { yaw: 110, up: 75, down: 12 }, body: 'none', ground: 0 }
      },
      body: { sit: { sleeve: '#8d8a84', legs: '#4c4f58' }, stand: { sleeve: '#8d8a84' } },
      spots: [[1.0, 1.35, zS + 1.2], [W / 2 - 0.3, 0.9, 0.8], [W / 2 - 0.1, 1.95, -0.7], [-W / 2 + 0.3, 1.2, 1.4], [tx + 0.25, 0.85, tz + 0.2], [-0.75, 1.1, -zS + 0.35], [0.6, 0.65, 0.9], [1.4, 1.3, -zS + 0.1]],
      spotNames: ['干した洗濯物', 'テレビ', '壁の時計', '写真立て', '食卓の湯のみ', 'やかん', 'ソファ', '暦'],
      walk: { y: 0, rects: [[-W / 2, -zS, W / 2, zS]], start: [0.2, -1.1] },
      meet: [{ p: [2.1, 0, -zS + 0.6], ry: -0.6 }],
      visit: [{ p: [tx + 0.3, 0, tz + 0.66], ry: PI, pose: 'sit', seat: 0.44 }, { p: [2.1, 0, -zS + 0.6], ry: -0.6 }],     // 食卓の向かいのいすと、戸口
      companion: {
        sit: { p: [tx - 0.25, 0, tz + 0.66], ry: PI, pose: 'sit', seat: 0.44 },
        stand: { p: [tx + 0.3, 0, tz - 0.66], ry: 0.5, pose: 'sit', seat: 0.44 },
        lie: { p: [0.75, 0, 0.1], ry: 1.1, pose: 'seiza' }
      },
      weatherBox: [[-10, y0, zS + 0.6], [12, 9, zS + 14]], dustBox: [[0, 0.1, 0.4], [2.2, 1.9, zS]],
      fills, amb: { tick: 1, garden: 0.6 },
      onLight: S.lampSetter(lamps, (env) => { clock.userData.setTime(env.hour); scr.emissiveIntensity = (env.hour >= 18.5 || env.hour < 0.5) ? 0.55 : 0; }),
      update(dt, env) {
        if (scr.emissiveIntensity > 0) scr.emissiveIntensity = 0.45 + Math.sin(env.time * 3.1) * 0.1 + Math.sin(env.time * 7.7) * 0.06;
        const cl = g.userData.cloth; if (cl) for (const m of cl) m.rotation.x = Math.sin(env.time * 1.1 + m.userData.sw) * 0.06 * (1 + env.wind * 3);
      }
    };
  };

  /* ================= 寝室 ================= */
  S.bedroom = function (c) {
    const g = new T.Group(), lamps = [], fills = [], rng = U.rng(c.seed + 3), pal = c.pal || {};
    const W = 3.6, D = 4.0, H = 2.4, zS = D / 2;
    const floor = K.mTex(K.tex.rep(K.tex.wood(pal.floor || P.wood, 6), 2, 3), { rough: 0.75 });
    const wall = K.mTex(K.tex.rep(K.tex.noise(pal.wall || U.pick(rng, [P.wallWarm, P.wallCool, '#e6ddd4']), 0.05), 3, 2));
    g.add(K.room({ w: W, d: D, h: H, wall, floor, openings: [{ side: 'S', at: 0.35, w: 1.7, y: 0.85, h: 1.15, kind: 'window' }] }));
    const cc = pal.curtain || U.pick(rng, ['#c9c1b0', '#aebbc4', '#c4b3b3', '#b5c0ae']);
    for (const sx of [-1, 1]) { const cu = K.curtain(0.42, 1.5, cc); K.at(cu, 0.35 + sx * 1.02, 0.62, zS - 0.09); g.add(cu); }
    g.add(K.box(2.5, 0.04, 0.05, K.m(P.woodDark), 0.35, 2.12, zS - 0.09));
    const bx = -0.65, bz = -0.9;
    const bed = K.bed({ w: 1.0, l: 2.0, h: 0.44, sheet: K.m(P.sheet) }); K.at(bed, bx, 0, bz, PI); g.add(bed);
    const bt = K.cabinet(0.45, 0.5, 0.4, K.m(P.wood)); K.at(bt, 0.3, 0, -1.72); g.add(bt);
    const sl = K.standLamp(); K.at(sl, 0.38, 0.5, -1.78); sl.userData.power = 3.2; g.add(sl); lamps.push(sl);
    g.add(K.box(0.1, 0.07, 0.05, K.m(P.dark), 0.2, 0.5, -1.62));
    const cup = K.cup(P.offwhite, 0.09); K.at(cup, 0.42, 0.5, -1.6); g.add(cup);
    const wd = K.cabinet(1.1, 1.85, 0.55, K.m(P.woodLight)); K.at(wd, W / 2 - 0.3, 0, 0.55, -PI / 2); g.add(wd);
    const desk = K.table(0.95, 0.5, 0.7, K.m(P.wood)); K.at(desk, -W / 2 + 0.28, 0, 1.2, PI / 2); g.add(desk);
    const ch = K.chair(K.m(P.wood)); K.at(ch, -W / 2 + 0.85, 0, 1.2, -PI / 2); g.add(ch);
    const bk = K.book(P.navy); K.at(bk, -W / 2 + 0.3, 0.7, 1.1, 0.3); g.add(bk);
    const ph = K.photo(0.16, 0.12); K.at(ph, -W / 2 + 0.2, 0.7, 1.45, PI / 2 - 0.3); g.add(ph);
    const rug = K.rug(1.5, 1.1, U.pick(rng, ['#b5a58c', '#9aa8b0', '#b49a92'])); K.at(rug, 0.5, 0, 0.2); g.add(rug);
    const pic = K.photo(0.5, 0.36, '#aab7b0'); K.at(pic, W / 2 - 0.03, 1.45, -1.1, -PI / 2); g.add(pic);
    const clock = K.wallClock(c.hour); K.at(clock, -W / 2 + 0.04, 1.9, 0.2, PI / 2); g.add(clock);
    const lamp = K.ceilingLamp(); K.at(lamp, 0, H, 0); lamp.userData.power = 8; g.add(lamp); lamps.push(lamp);
    const door = K.door(); K.at(door, 1.2, 0, -zS + 0.02); g.add(door);
    const ch2 = K.chair(K.m(P.woodDark)); K.at(ch2, 0.45, 0, 0.08, -2.54); g.add(ch2);
    const slp = K.slippers('#b9b3a6'); K.at(slp, 0.0, 0, -0.4, PI / 2); g.add(slp);
    S.fill(g, fills, 0.35, 2.2, zS - 0.9, 8, 8);
    S.neighborhood(g, c, zS, -3.0, lamps);
    const blanket = pal.blanket || U.pick(rng, [P.blanket, P.blanketWarm, '#b8c4b4', '#c9b9c4']);
    return {
      group: g, indoor: true, label: '自宅の寝室', shadow: 9, center: [0, 0, 1],
      anchors: {
        lie: { p: [bx, 0.72, bz - 0.57], look: [0.1, 1.15, 2.2], lim: { yaw: 105, up: 62, down: 22 }, body: 'lie' },
        sit: { p: [bx + 0.52, 1.02, bz + 0.25], look: [0.9, 1.0, 2.1], lim: { yaw: 130, up: 55, down: 60 }, body: 'sit' },
        stand: { p: [0.75, 1.52, -0.5], look: [0.3, 1.15, 2.1], lim: { yaw: 150, up: 55, down: 55 }, body: 'stand' }
      },
      body: { lie: { blanket, sleeve: '#a9b4c2' }, sit: { sleeve: '#a9b4c2', legs: '#8b96a6' }, stand: { sleeve: '#a9b4c2' } },
      spots: [[0.35, 1.5, zS - 0.1], [0.38, 0.85, -1.75], [W / 2 - 0.35, 1.3, 0.55], [-W / 2 + 0.3, 0.95, 1.3], [W / 2 - 0.08, 1.45, -1.1], [-W / 2 + 0.1, 1.9, 0.2], [0.5, 0.25, 0.3]],
      spotNames: ['窓の外の町', '枕もとの明かり', '洋服だんす', '机の写真立て', '壁の絵', '壁の時計', '木のいす'],
      /* 枕もとの側から窓の側へは、いすと洋服だんすのあいだ（0.5 m）を通るしかないので、ますを細かくする */
      walk: { y: 0, cell: 0.1, rects: [[-W / 2, -zS, W / 2, zS]], start: [0.25, -0.65] },
      visit: [{ p: [-1.46, 0, -0.35], ry: 2.51 }, { p: [bx + 0.05, 0, bz + 1.5], ry: -3.1 }],      // ベッドと壁のあいだと、ベッドの足もと
      companion: {
        lie: { p: [0.45, 0, 0.1], ry: -2.54, pose: 'lean', seat: 0.44 },
        sit: { p: [1.0, 0, 0.6], ry: -2.2, pose: 'stand' },
        stand: { p: [0.45, 0, 0.1], ry: -0.4, pose: 'sit', seat: 0.44 }
      },
      weatherBox: [[-10, -3, zS + 0.5], [12, 8, zS + 14]], dustBox: [[-0.4, 0.3, 0.3], [1.3, 1.9, zS]],
      fills, amb: { tick: 1, garden: 0.35 },
      onLight: S.lampSetter(lamps, (env) => { clock.userData.setTime(env.hour); })
    };
  };

  /* ================= 浴室 ================= */
  S.bath = function (c) {
    const g = new T.Group(), lamps = [], fills = [], pal = c.pal || {};
    const W = 1.9, D = 2.5, H = 2.2, zS = D / 2;
    const tile = K.mTex(K.tex.rep(K.tex.tile(pal.tile || P.tile, 4), 3, 3), { rough: 0.35 });
    const ftile = K.mTex(K.tex.rep(K.tex.tile('#c9d2d2', 4), 2.5, 3), { rough: 0.5 });
    g.add(K.room({ w: W, d: D, h: H, wall: tile, floor: ftile, ceil: K.m(P.white, { rough: 0.5 }), base: false, openings: [] }));
    /* 浴槽（−X 側） */
    const tm = K.m('#f1f3f2', { rough: 0.3 });
    const tx0 = -W / 2, tx1 = -0.15, tz0 = -zS + 0.05, tz1 = 0.5, th = 0.56;
    const tw = tx1 - tx0, tl = tz1 - tz0, cx = (tx0 + tx1) / 2, cz = (tz0 + tz1) / 2;
    g.add(K.box(tw, 0.08, tl, tm, cx, 0, cz));
    g.add(K.box(0.07, th, tl, tm, tx1 - 0.035, 0, cz)); g.add(K.box(0.05, th, tl, tm, tx0 + 0.025, 0, cz));
    g.add(K.box(tw, th, 0.07, tm, cx, 0, tz1 - 0.035)); g.add(K.box(tw, th, 0.07, tm, cx, 0, tz0 + 0.035));
    const water = K.water(tw - 0.12, tl - 0.12, '#cfe9ea', { segX: 6, segZ: 10, amp: 0.004, opacity: 0.8, rough: 0.06, speed: 1.6 });
    water.position.set(cx, 0.47, cz); g.add(water);
    /* 蛇口、窓 */
    const st = K.m(P.steel, { metal: 0.7, rough: 0.3 });
    g.add(K.box(0.2, 0.08, 0.06, st, cx, 0.78, zS - 0.04)); g.add(K.rod([cx, 0.8, zS - 0.05], [cx, 0.74, zS - 0.22], 0.016, st));
    const wm = K.m('#9fb0b8', { emissive: '#f4f8ff', ei: 0.4, nocache: true, rough: 0.4 });
    g.add(K.box(0.7, 0.5, 0.02, wm, cx, 1.42, zS - 0.012, { noShadow: true }));
    g.add(K.box(0.78, 0.04, 0.04, K.m(P.white), cx, 1.4, zS - 0.02)); g.add(K.box(0.78, 0.04, 0.04, K.m(P.white), cx, 1.92, zS - 0.02));
    /* 洗い場 */
    const stool = K.cyl(0.15, 0.22, K.m('#e9e4d6', { rough: 0.4 }), 0.42, 0, 0.1, { seg: 18 }); g.add(stool);
    const basin = K.cyl(0.13, 0.11, K.m('#e6cf7a', { rough: 0.4 }), 0.55, 0, 0.62, { rTop: 0.17, seg: 18 }); g.add(basin);
    g.add(K.box(0.02, 0.7, 0.5, K.m('#cfe0e6', { rough: 0.08, metal: 0.6 }), W / 2 - 0.012, 1.0, 0.1, { noShadow: true }));
    g.add(K.box(0.1, 0.03, 0.6, K.m(P.white), W / 2 - 0.06, 0.9, 0.1));
    for (let i = 0; i < 3; i++) g.add(K.cyl(0.03, 0.16, K.m(['#d98a8a', '#8ab0d9', '#e8e8e2'][i], { rough: 0.4 }), W / 2 - 0.07, 0.93, -0.05 + i * 0.12, { seg: 10 }));
    g.add(K.rod([W / 2 - 0.03, 1.0, 0.55], [W / 2 - 0.03, 1.85, 0.55], 0.012, st));
    g.add(K.box(0.06, 0.05, 0.12, st, W / 2 - 0.07, 1.82, 0.55));
    g.add(K.cyl(0.04, 0.012, K.m(P.steelDark), 0.35, 0.001, -0.5, { seg: 12 }));
    /* 戸（北） */
    const dm = K.m('#dfe8ea', { rough: 0.3, emissive: '#fff0d8', ei: 0.05, nocache: true });
    g.add(K.box(0.72, 1.9, 0.03, dm, 0.42, 0.02, -zS + 0.02)); g.add(K.box(0.8, 1.98, 0.02, K.m(P.white), 0.42, 0, -zS + 0.012));
    const towel = K.box(0.4, 0.5, 0.03, K.m('#d8c4b0'), 0.42, 1.0, -zS + 0.06); g.add(towel);
    const lamp = K.ceilingLamp(); K.at(lamp, 0.15, H, 0); lamp.userData.power = 6; g.add(lamp);
    S.fill(g, fills, cx, 1.5, zS - 0.4, 2.2, 4);
    return {
      group: g, indoor: true, label: '自宅の浴室', shadow: 6, center: [0, 0, 0],
      anchors: {
        sit: { p: [cx, 0.86, tz0 + 0.3], look: [cx + 0.3, 0.8, zS], lim: { yaw: 110, up: 65, down: 50 }, body: 'bath' },
        stand: { p: [0.4, 1.5, -0.75], look: [0.05, 1.0, 1.1], lim: { yaw: 150, up: 55, down: 60 }, body: 'stand' }
      },
      body: { stand: { sleeve: P.skin, shoe: P.skin } },
      spots: [[cx, 0.95, zS - 0.2], [cx, 1.66, zS - 0.1], [0.55, 0.25, 0.62], [W / 2 - 0.1, 1.35, 0.1], [0.2, 2.05, 0.2], [0.42, 1.2, -zS + 0.1]],
      spotNames: ['蛇口', 'くもりガラス', '湯おけ', '鏡', '天井の明かり', '掛けたタオル'],
      /* 洗い場だけ。浴槽の中には入らない */
      walk: { y: 0, rects: [[tx1, -zS, W / 2, zS], [-W / 2, tz1, tx1, zS]], start: [0.25, -0.8] },
      companion: { sit: { p: [0.5, 0, 0.0], ry: -2.2, pose: 'stand' }, stand: { p: [0.5, 0, 0.5], ry: PI + 0.4, pose: 'stand' } },
      weatherBox: [[-2, 0, zS + 0.5], [2, 3, zS + 2]], dustBox: [[-0.9, 0.5, -1.0], [0.9, 2.0, 1.1]],
      fills, amb: { water: 0.8, drip: 1 },
      onLight(env) { lamp.userData.setLamp(Math.max(env.lampOn, 0.6), 6); wm.emissiveIntensity = 0.05 + env.skyFill * 0.8; },
      update(dt, env) { water.userData.tick(env.time); }
    };
  };
})(window.SI);
