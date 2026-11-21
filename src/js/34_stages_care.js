'use strict';
/* 最期の一日 — 場所（病院と施設）: 病室、集中治療室、緩和ケア病棟、介護施設 */
(function (SI) {
  const T = window.THREE, U = SI.U, K = SI.Kit, P = K.P;
  const S = SI.stages;
  const PI = Math.PI;

  function overbedTable() {
    const g = new T.Group(), st = K.m(P.steel, { metal: 0.5, rough: 0.4 });
    g.add(K.box(0.9, 0.03, 0.4, K.m(P.woodPale, { rough: 0.6 }), 0, 0.8, 0));
    g.add(K.box(0.04, 0.78, 0.04, st, 0.55, 0.02, 0)); g.add(K.box(0.08, 0.03, 0.5, st, 0.55, 0, 0)); g.add(K.box(0.2, 0.03, 0.04, st, 0.47, 0.78, 0));
    return g;
  }
  function tissue() { const g = new T.Group(); g.add(K.box(0.22, 0.07, 0.11, K.m('#c9d6e2'), 0, 0, 0)); g.add(K.box(0.08, 0.04, 0.01, K.m(P.white), 0, 0.07, 0, { noCast: true })); return g; }
  function vitalsTick(mon) { return (dt, env) => { const v = env.vitals; if (v) { mon.userData.state.bpm = v.bpm; mon.userData.state.flat = v.flat; } mon.userData.tick(dt); }; }

  /* ================= 一般病棟の病室 ================= */
  S.hospital = function (c) {
    const g = new T.Group(), lamps = [], fills = [], rng = U.rng(c.seed + 11), ticks = [];
    const W = 3.6, D = 5.0, H = 2.6, zS = D / 2;
    const floor = K.mTex(K.tex.rep(K.tex.noise('#d6d2c6', 0.05), 3, 4), { rough: 0.45 });
    const wall = K.mTex(K.tex.rep(K.tex.noise(P.wallCool, 0.04), 3, 2));
    g.add(K.room({ w: W, d: D, h: H, wall, floor, ceil: K.m(P.white), base: K.m('#b9c2c4'), openings: [{ side: 'S', at: 0.15, w: 2.3, y: 0.85, h: 1.4, kind: 'window' }] }));
    const cu = K.curtain(0.4, 1.55, '#d9dfd6'); K.at(cu, 0.15 - 1.32, 0.8, zS - 0.08); g.add(cu);
    const cu2 = K.curtain(0.4, 1.55, '#d9dfd6'); K.at(cu2, 0.15 + 1.32, 0.8, zS - 0.08); g.add(cu2);
    const bz = -1.1;
    const bed = K.hospitalBed(); K.at(bed, 0, 0, bz, PI); g.add(bed);
    const obt = overbedTable(); K.at(obt, 0.0, 0, bz + 0.85); g.add(obt);
    const cup = K.cup('#dfe6ea', 0.09); K.at(cup, -0.2, 0.83, bz + 0.85); g.add(cup);
    const ts = tissue(); K.at(ts, 0.22, 0.83, bz + 0.9, 0.2); g.add(ts);
    /* 点滴と心電図 */
    const iv = K.ivPole(); K.at(iv, -0.8, 0, bz + 0.05); g.add(iv);
    const ms = K.box(0.4, 1.0, 0.4, K.m(P.offwhite, { rough: 0.5 }), -1.25, 0, bz + 0.75); g.add(ms);
    const mon = K.monitor(); K.at(mon, -1.22, 1.0, bz + 0.75, 2.4); g.add(mon); ticks.push(vitalsTick(mon));
    /* 床頭台、見舞いの椅子 */
    const lk = K.cabinet(0.48, 0.85, 0.45, K.m(P.woodPale)); K.at(lk, 1.0, 0, bz - 0.72); g.add(lk);
    const vs = K.vase(U.pick(rng, [P.yellow, '#e3a7b0', '#f2ede4', '#c9a6d6']), 5); K.at(vs, 0.92, 0.85, bz - 0.68); g.add(vs);
    const ph = K.photo(0.15, 0.11); K.at(ph, 1.1, 0.85, bz - 0.6, -0.5); g.add(ph);
    const stl = K.stool(K.m(P.steelDark), 0.45); K.at(stl, 0.98, 0, bz + 0.8); g.add(stl);
    /* 窓ぎわの長いす、洗面、時計 */
    g.add(K.box(1.7, 0.4, 0.45, K.m('#b8b3a2'), 0.15, 0, zS - 0.27)); g.add(K.box(1.7, 0.06, 0.45, K.m('#8a9a94'), 0.15, 0.4, zS - 0.27));
    g.add(K.box(0.6, 0.8, 0.45, K.m(P.white, { rough: 0.4 }), -W / 2 + 0.33, 0, 1.6)); g.add(K.box(0.5, 0.6, 0.02, K.m('#cfe0e6', { rough: 0.1, metal: 0.5 }), -W / 2 + 0.02, 1.15, 1.6));
    const clock = K.wallClock(c.hour); K.at(clock, -W / 2 + 0.04, 2.05, 0.6, PI / 2); g.add(clock);
    const door = K.door(K.m('#d9c9a8'), 1.0, 2.05); K.at(door, W / 2 - 0.02, 0, -1.7, -PI / 2); g.add(door);
    /* カーテンレールと、たたんだカーテン */
    const rail = K.m(P.steel, { metal: 0.5 });
    g.add(K.rod([1.5, 2.2, bz - 1.2], [1.5, 2.2, bz + 1.4], 0.012, rail)); g.add(K.rod([1.5, 2.2, bz + 1.4], [-1.5, 2.2, bz + 1.4], 0.012, rail));
    const bc = K.curtain(0.5, 1.75, U.pick(rng, ['#cfdcd2', '#d8d4e2', '#e2d6c6'])); K.at(bc, 1.5, 0.45, bz - 0.9, PI / 2); g.add(bc);
    const l1 = K.ceilingLamp('panel'); K.at(l1, 0, H, bz + 0.3, PI / 2); l1.userData.power = 8; g.add(l1); lamps.push(l1);
    const l2 = K.ceilingLamp('panel'); K.at(l2, 0, H, 1.3, PI / 2); l2.userData.power = 6; g.add(l2); lamps.push(l2);
    const rl = K.standLamp(); K.at(rl, 1.12, 0.85, bz - 0.85); g.add(rl);
    S.fill(g, fills, 0.15, 2.2, zS - 0.9, 12, 9);
    S.cityBelow(g, c, zS, -11, lamps, false);
    return {
      group: g, indoor: true, label: '病室', shadow: 9, center: [0, 0, 1],
      anchors: {
        lie: { p: [0, 0.9, bz - 0.62], look: [0.15, 1.3, 2.4], lim: { yaw: 108, up: 62, down: 24 }, body: 'lie' },
        sit: { p: [0, 1.16, bz - 0.42], look: [0.15, 1.2, 2.4], lim: { yaw: 120, up: 58, down: 40 }, body: 'lieUp' }
      },
      body: { lie: { blanket: '#e9ebe8', sleeve: U.pick(rng, ['#b9cfdc', '#d9c2c9', '#c9d6c2']) }, lieUp: { blanket: '#e9ebe8', sleeve: '#b9cfdc' } },
      spots: [[0.9, 1.5, zS - 0.1], [-0.72, 1.6, bz + 0.05], [0.95, 1.1, bz - 0.68], [1.2, 0.9, 0.9], [-0.2, 0.95, bz + 0.85], [-W / 2 + 0.1, 2.05, 0.6], [-0.4, 0.6, zS - 0.3], [1.45, 1.4, bz - 0.9]],
      spotNames: ['窓の外の街', '点滴の袋', '見舞いの花', '窓ぎわのカーテン', '台の上のコップ', '壁の時計', '窓ぎわの長いす', '仕切りのカーテン'],
      staff: { p: [-0.8, 0, bz + 0.68], ry: 2.6 },
      companion: { lie: { p: [0.98, 0, bz + 0.8], ry: -2.5, pose: 'lean', seat: 0.45 }, sit: { p: [0.98, 0, bz + 0.8], ry: -2.5, pose: 'lean', seat: 0.45 } },
      weatherBox: [[-12, -4, zS + 0.5], [12, 10, zS + 14]], dustBox: [[-0.8, 0.5, 0.2], [1.2, 2.0, zS]],
      fills, amb: { beep: 0.35, tick: 0.5 },
      onLight(env) {
        const night = env.hour >= 21 || env.hour < 6;
        for (const l of lamps) if (l.userData.setLamp) l.userData.setLamp(l === l1 || l === l2 ? env.lampOn * (night ? 0.07 : 1) : env.lampOn, l.userData.power);
        rl.userData.setLamp(night ? 0.8 : env.lampOn * 0.4, 2.6); clock.userData.setTime(env.hour);
      },
      update(dt, env) { for (const f of ticks) f(dt, env); }
    };
  };

  /* ================= 救急・集中治療室 ================= */
  S.icu = function (c) {
    const g = new T.Group(), lamps = [], ticks = [], rng = U.rng(c.seed + 12);
    const W = 4.4, D = 4.8, H = 2.7, zS = D / 2;
    const floor = K.mTex(K.tex.rep(K.tex.noise('#c9cfd0', 0.05), 3, 4), { rough: 0.35 });
    const wall = K.m('#e4eaeb');
    g.add(K.room({ w: W, d: D, h: H, wall, floor, ceil: K.m(P.white), base: K.m('#aab4b8'), openings: [{ side: 'S', at: 0, w: 3.0, y: 0.95, h: 1.3, kind: 'window' }] }));
    /* ろうか（外の光を入れない） */
    const cw = K.m('#d2d8d8');
    g.add(K.plane(W + 4, 2.6, floor, 0, 0, zS + 1.45)); g.add(K.box(W + 4, H + 0.3, 0.2, cw, 0, 0, zS + 2.75)); g.add(K.box(W + 4, 0.2, 3.0, cw, 0, H, zS + 1.4));
    g.add(K.box(0.2, H, 2.8, cw, -W / 2 - 2, 0, zS + 1.4)); g.add(K.box(0.2, H, 2.8, cw, W / 2 + 2, 0, zS + 1.4));
    g.add(K.box(2.2, 1.0, 0.6, K.m(P.offwhite), 0.8, 0, zS + 2.2));
    const nm = K.monitor(); K.at(nm, 0.5, 1.0, zS + 2.2, PI); g.add(nm); ticks.push((dt) => nm.userData.tick(dt));
    const nurse = K.figure({ pose: 'stand', top: '#e8eef0', bottom: '#dfe6ea', hair: P.hair, h: 1.58 }); K.at(nurse, 1.3, 0, zS + 1.5, PI - 0.4); g.add(nurse);
    const cl = K.ceilingLamp('panel'); K.at(cl, 0, H, zS + 1.4); cl.userData.power = 4; g.add(cl); lamps.push(cl);
    /* 寝台と機器 */
    const bz = -0.9;
    const bed = K.hospitalBed(); K.at(bed, 0, 0, bz, PI); g.add(bed);
    const stM = K.m(P.steel, { metal: 0.5, rough: 0.4 });
    for (const sx of [-1, 1]) {
      g.add(K.cyl(0.02, 1.3, stM, sx * 1.05, 0, bz + 0.35)); g.add(K.cyl(0.2, 0.03, stM, sx * 1.05, 0, bz + 0.35, { seg: 12 }));
      const m = K.monitor(); K.at(m, sx * 1.05, 1.3, bz + 0.35, PI + sx * 0.75); g.add(m); ticks.push(vitalsTick(m));
    }
    const vent = K.group(-1.5, 0, bz + 0.95, 2.2);
    vent.add(K.box(0.45, 1.05, 0.45, K.m(P.offwhite, { rough: 0.5 }), 0, 0.08, 0)); vent.add(K.box(0.3, 0.22, 0.02, K.m('#0b1114', { emissive: '#3fae8a', ei: 0.6 }), 0, 0.85, 0.235, { noShadow: true }));
    vent.add(K.cyl(0.26, 0.04, stM, 0, 0, 0, { seg: 12 }));
    g.add(vent);
    const tube = K.m('#dfe8ea', { transparent: true, opacity: 0.7 });
    g.add(K.rod([-1.35, 1.0, bz + 0.85], [-0.6, 1.0, bz + 0.1], 0.018, tube)); g.add(K.rod([-0.6, 1.0, bz + 0.1], [-0.2, 0.92, bz - 0.5], 0.018, tube));
    for (let i = 0; i < 2; i++) {
      const iv = K.ivPole(); K.at(iv, 1.25 + i * 0.25, 0, bz + 0.95 + i * 0.6); g.add(iv);
      for (let k = 0; k < 3; k++) { const pm = K.box(0.22, 0.09, 0.12, K.m('#e6ecee'), 1.25 + i * 0.25, 0.85 + k * 0.12, bz + 0.9 + i * 0.6); g.add(pm); g.add(K.box(0.05, 0.02, 0.005, K.m('#0b1114', { emissive: '#59e08a', ei: 1.2 }), 1.2 + i * 0.25, 0.89 + k * 0.12, bz + 0.838 + i * 0.6, { noShadow: true })); }
    }
    const curtC = '#c9dcd4';
    for (const sx of [-1, 1]) { const cu = K.curtain(0.6, 2.0, curtC); K.at(cu, sx * (W / 2 - 0.25), 0.3, 0.9, PI / 2); g.add(cu); }
    g.add(K.box(0.5, 0.85, 0.4, K.m(P.offwhite), -W / 2 + 0.3, 0, 1.7));
    const clock = K.wallClock(c.hour); K.at(clock, -1.85, 2.3, zS - 0.04, PI); g.add(clock);
    /* 天井のアーム */
    g.add(K.box(0.12, 0.5, 0.12, stM, 0.5, H - 0.5, bz - 0.6)); g.add(K.box(0.9, 0.08, 0.1, stM, 0.5, H - 0.55, bz - 0.25));
    const l1 = K.ceilingLamp('panel'); K.at(l1, 0, H, bz + 0.5, PI / 2); l1.userData.power = 9; g.add(l1); lamps.push(l1);
    const l2 = K.ceilingLamp('panel'); K.at(l2, 0, H, 1.3); l2.userData.power = 6; g.add(l2); lamps.push(l2);
    return {
      group: g, indoor: true, label: '集中治療室', shadow: 8, center: [0, 0, 0],
      anchors: { lie: { p: [0, 0.92, bz - 0.6], look: [0, 1.55, 2.2], lim: { yaw: 105, up: 60, down: 30 }, body: 'lie' } },
      body: { lie: { blanket: '#e6eaea', sleeve: '#c8d6dc' } },
      spots: [[-1.0, 1.55, bz + 0.35], [1.0, 1.55, bz + 0.35], [0, 2.55, 0.5], [1.3, 1.5, bz + 0.95], [0, 1.15, bz + 1.2], [-1.85, 2.3, zS - 0.1], [W / 2 - 0.35, 1.3, 0.9], [0.6, 1.45, zS + 1.4]],
      spotNames: ['心電図の画面', '脈拍の数字', '天井の明かり', '点滴の袋', '廊下の窓', '壁の時計', '仕切りのカーテン', '看護師の詰所'],
      folk: [{ f: nurse, role: 'icunurse' }],
      staff: { p: [-0.85, 0, bz + 1.0], ry: 2.6 },          // 看護師がまわってきて立つ場所（人工呼吸器と寝台のあいだ）
      companion: { lie: { p: [0.82, 0, bz + 0.95], ry: -2.6, pose: 'stand' } },
      weatherBox: [[-2, 0, zS + 6], [2, 3, zS + 8]],
      amb: { beep: 1, machine: 0.45 },
      onLight(env) {
        const night = env.hour >= 21.5 || env.hour < 6;
        for (const l of lamps) l.userData.setLamp(night ? 0.4 : 0.95, l.userData.power);
        clock.userData.setTime(env.hour);
      },
      update(dt, env) { for (const f of ticks) f(dt, env); }
    };
  };

  /* ================= 緩和ケア病棟・ホスピス ================= */
  S.hospice = function (c) {
    const g = new T.Group(), lamps = [], fills = [], rng = U.rng(c.seed + 13);
    const W = 4.0, D = 4.8, H = 2.6, zS = D / 2;
    const floor = K.mTex(K.tex.rep(K.tex.wood(P.woodLight, 6), 2.5, 3), { rough: 0.7 });
    const wall = K.mTex(K.tex.rep(K.tex.noise('#ebe2d2', 0.05), 3, 2));
    g.add(K.room({ w: W, d: D, h: H, wall, floor, frame: K.m(P.woodLight), openings: [{ side: 'S', at: 0, w: 2.8, y: 0.6, h: 1.6, kind: 'window' }] }));
    const cc = U.pick(rng, ['#d8cdb8', '#c9d2c0', '#d9c6c0']);
    for (const sx of [-1, 1]) { const cu = K.curtain(0.45, 1.75, cc); K.at(cu, sx * 1.6, 0.55, zS - 0.08); g.add(cu); }
    g.add(K.box(3.8, 0.04, 0.05, K.m(P.wood), 0, 2.28, zS - 0.08));
    const bx = -0.45, bz = -1.0;
    const bed = K.bed({ w: 0.98, l: 2.05, h: 0.52, frame: K.m(P.woodLight), head: 0.6 }); K.at(bed, bx, 0, bz, PI); g.add(bed);
    const bt = K.cabinet(0.5, 0.6, 0.42, K.m(P.woodLight)); K.at(bt, bx - 0.85, 0, bz - 0.72); g.add(bt);
    const ph = K.photo(0.18, 0.14); K.at(ph, bx - 0.8, 0.6, bz - 0.7, 0.5); g.add(ph);
    const cup = K.cup('#e8dcc8'); K.at(cup, bx - 0.95, 0.6, bz - 0.6); g.add(cup);
    const iv = K.ivPole(); K.at(iv, bx - 0.75, 0, bz - 0.1); g.add(iv);
    const chair = K.chair(K.m(P.wood), K.m('#8f9a8a')); K.at(chair, bx + 0.95, 0, bz + 0.78, -2.55); g.add(chair);
    const sofa = K.sofa(U.pick(rng, ['#9aa58f', '#a89a8a', '#8f9aa8'])); K.at(sofa, 0.95, 0, 0.75, -PI / 2); g.add(sofa);
    const rt = K.roundTable(0.32, 0.45, K.m(P.wood)); K.at(rt, 0.1, 0, 1.55); g.add(rt);
    const tp = K.teapot('#e8e2d6'); K.at(tp, 0.05, 0.45, 1.5); g.add(tp);
    const c2 = K.cup('#e8e2d6'); K.at(c2, 0.22, 0.45, 1.62); g.add(c2);
    const vs = K.vase(U.pick(rng, ['#e3a7b0', P.yellow, '#f2ede4', '#b9a6d6']), 6); K.at(vs, -0.9, 0.6, zS - 0.1); g.add(vs);
    const pic = K.photo(0.6, 0.42, U.pick(rng, ['#a9b9a6', '#b9b0a0', '#a6b4c2'])); K.at(pic, W / 2 - 0.03, 1.45, -0.9, -PI / 2); g.add(pic);
    const clock = K.wallClock(c.hour); K.at(clock, -W / 2 + 0.04, 2.0, 0.7, PI / 2); g.add(clock);
    const lamp = K.ceilingLamp('washi'); K.at(lamp, 0, H, 0); lamp.userData.power = 7; g.add(lamp);
    const sl = K.standLamp(); K.at(sl, bx - 0.72, 0.6, bz - 0.85); sl.userData.power = 3.2; g.add(sl);
    const door = K.door(K.m(P.woodLight), 1.0, 2.05); K.at(door, 1.2, 0, -zS + 0.02); g.add(door);
    const rug = K.rug(1.6, 1.2, '#b9a890'); K.at(rug, 0.5, 0, 1.0); g.add(rug);
    S.fill(g, fills, 0, 2.2, zS - 0.9, 13, 9);
    S.gardenView(g, c, zS, -0.3, lamps);
    const quilt = U.pick(rng, ['#c9b9a0', '#b8c4b4', '#c9b0b0', '#b0bcc9']);
    return {
      group: g, indoor: true, label: '緩和ケア病棟の個室', shadow: 10, center: [0, 0, 1.5],
      anchors: {
        lie: { p: [bx, 0.86, bz - 0.6], look: [0.3, 1.2, 2.4], lim: { yaw: 108, up: 62, down: 24 }, body: 'lie' },
        sit: { p: [bx, 1.12, bz - 0.42], look: [0.3, 1.15, 2.4], lim: { yaw: 120, up: 58, down: 40 }, body: 'lieUp' }
      },
      body: { lie: { blanket: quilt, sleeve: '#cfc6d6' }, lieUp: { blanket: quilt, sleeve: '#cfc6d6' } },
      spots: [[1.6, 1.7, zS + 5], [-0.9, 0.95, zS - 0.15], [0.95, 0.65, 0.75], [bx - 0.8, 0.85, bz - 0.7], [0.1, 0.65, 1.55], [W / 2 - 0.08, 1.45, -0.9], [-W / 2 + 0.1, 2.0, 0.7], [0.3, 1.3, zS - 0.1]],
      spotNames: ['庭の木立', '窓辺の花', 'ソファ', '写真立て', 'ポットとカップ', '壁の絵', '壁の時計', '窓の外の庭'],
      staff: { p: [bx - 0.95, 0, bz + 0.55], ry: 2.53 },
      companion: { lie: { p: [bx + 0.95, 0, bz + 0.78], ry: -2.55, pose: 'lean', seat: 0.44 }, sit: { p: [bx + 0.95, 0, bz + 0.78], ry: -2.55, pose: 'lean', seat: 0.44 } },
      weatherBox: [[-12, -0.3, zS + 0.5], [12, 9, zS + 14]], dustBox: [[-0.8, 0.4, 0.3], [1.4, 2.0, zS]], petalBox: [[-6, -0.3, zS + 1], [8, 5, zS + 9]],
      fills, amb: { tick: 1, garden: 1 },
      onLight(env) {
        const night = env.hour >= 21 || env.hour < 6;
        lamp.userData.setLamp(env.lampOn * (night ? 0.06 : 1), 7); sl.userData.setLamp(night ? 0.9 : env.lampOn * 0.6, 3.2); clock.userData.setTime(env.hour);
      }
    };
  };

  /* ================= 介護施設の居室 ================= */
  S.facility = function (c) {
    const g = new T.Group(), lamps = [], fills = [], rng = U.rng(c.seed + 14);
    const W = 3.4, D = 4.2, H = 2.5, zS = D / 2;
    const floor = K.mTex(K.tex.rep(K.tex.wood('#c9b592', 6), 2, 3), { rough: 0.5 });
    const wall = K.mTex(K.tex.rep(K.tex.noise('#ebe6dc', 0.04), 3, 2));
    g.add(K.room({ w: W, d: D, h: H, wall, floor, openings: [{ side: 'S', at: 0.3, w: 1.7, y: 0.8, h: 1.25, kind: 'window' }] }));
    for (const sx of [-1, 1]) { const cu = K.curtain(0.38, 1.5, '#e2d6c0'); K.at(cu, 0.3 + sx * 1.02, 0.7, zS - 0.08); g.add(cu); }
    const bx = -0.6, bz = -0.85;
    const bed = K.hospitalBed(); K.at(bed, bx, 0, bz, PI); g.add(bed);
    g.add(K.rod([-W / 2 + 0.07, 0.8, -0.2], [-W / 2 + 0.07, 0.8, zS - 0.2], 0.018, K.m(P.woodLight)));
    const chest = K.cabinet(0.9, 0.85, 0.42, K.m(P.woodLight)); K.at(chest, W / 2 - 0.24, 0, -0.3, -PI / 2); g.add(chest);
    const tv = K.tv(0.5); K.at(tv, W / 2 - 0.26, 0.85, -0.05, -PI / 2); g.add(tv);
    const ph = K.photo(0.16, 0.12); K.at(ph, W / 2 - 0.26, 0.85, -0.6, -PI / 2 + 0.3); g.add(ph);
    const ph2 = K.photo(0.12, 0.16, '#c2b6a6'); K.at(ph2, W / 2 - 0.3, 0.85, -0.78, -PI / 2 - 0.2); g.add(ph2);
    const cal = K.calendar(); K.at(cal, -W / 2 + 0.02, 1.25, 0.7, PI / 2); g.add(cal);
    /* 壁の折り紙 */
    const oc = ['#d98a8a', '#e6cf7a', '#8ab0d9', '#9ac49a', '#d9a6c9', '#e6b07a'];
    for (let i = 0; i < 9; i++) { const o = K.box(0.012, 0.11, 0.11, K.m(oc[i % 6]), -W / 2 + 0.012, 1.75 + Math.sin(i * 1.7) * 0.07, 0.15 + i * 0.16, { noShadow: true }); o.rotation.x = (i % 2) * 0.78; g.add(o); }
    const wc = K.wheelchair(); K.at(wc, 0.75, 0, 1.15); g.add(wc);
    const stl = K.stool(K.m(P.steelDark), 0.45); K.at(stl, -0.05, 0, 1.3); g.add(stl);
    const clock = K.wallClock(c.hour); K.at(clock, W / 2 - 0.04, 2.0, 0.9, -PI / 2); g.add(clock);
    const lamp = K.ceilingLamp(); K.at(lamp, 0, H, 0); lamp.userData.power = 8; g.add(lamp);
    const door = K.door(K.m('#d9c9a8'), 1.0, 2.0); K.at(door, W / 2 - 0.02, 0, -1.55, -PI / 2); g.add(door);
    const vs = K.vase(U.pick(rng, [P.yellow, '#e3a7b0', '#f2ede4']), 3); K.at(vs, W / 2 - 0.26, 0.85, 0.02); g.add(vs);
    const sl = K.slippers('#b9a6a6'); K.at(sl, 0.1, 0, -0.5, PI / 2); g.add(sl);
    S.fill(g, fills, 0.3, 2.3, zS - 0.9, 7, 8);
    S.neighborhood(g, c, zS, -3.2, lamps);
    const scr = tv.userData.screen.material;
    return {
      group: g, indoor: true, label: '介護施設の居室', shadow: 9, center: [0, 0, 1],
      anchors: {
        lie: { p: [bx, 0.9, bz - 0.62], look: [0.3, 1.25, 2.1], lim: { yaw: 108, up: 62, down: 24 }, body: 'lie' },
        sit: { p: [0.75, 1.12, 1.08], look: [0.6, 0.95, 4], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' }
      },
      body: { lie: { blanket: U.pick(rng, ['#e2d9c9', '#d6dcd0', '#dcd0d6']), sleeve: '#c9bfae' }, sit: { sleeve: '#b0a99c', legs: '#6b6a70', blanket: U.pick(rng, ['#b9a087', '#9aa89a', '#a99ab0']) } },
      spots: [[0.3, 1.5, zS - 0.1], [W / 2 - 0.3, 1.15, -0.5], [-W / 2 + 0.1, 1.45, 0.7], [-W / 2 + 0.1, 1.8, 1.2], [0.75, 0.7, 1.15], [W / 2 - 0.1, 2.0, 0.9], [0.3, 2.35, 0.2]],
      spotNames: ['窓の外の家並み', '家族の写真', '暦', '壁の折り紙', '車いす', '壁の時計', '天井の明かり'],
      staff: { p: [bx - 0.8, 0, bz + 0.42], ry: 2.52 },
      companion: { lie: { p: [bx + 0.95, 0, bz + 0.8], ry: -2.55, pose: 'stand' }, sit: { p: [-0.05, 0, 1.3], ry: 0.5, pose: 'sit', seat: 0.45 } },
      weatherBox: [[-10, -3.2, zS + 0.5], [12, 8, zS + 14]], dustBox: [[-0.5, 0.4, 0.4], [1.2, 1.9, zS]],
      fills, amb: { tick: 1, garden: 0.3, crowd: 0.3 },
      onLight(env) {
        const night = env.hour >= 21 || env.hour < 6;
        lamp.userData.setLamp(env.lampOn * (night ? 0.1 : 1), 8); clock.userData.setTime(env.hour);
        for (const l of lamps) if (l.userData.setLamp) l.userData.setLamp(env.lampOn);
        scr.emissiveIntensity = (env.hour >= 9 && env.hour < 20) ? 0.4 : 0;
      },
      update(dt, env) { if (scr.emissiveIntensity > 0) scr.emissiveIntensity = 0.38 + Math.sin(env.time * 2.7) * 0.08; }
    };
  };
})(window.SI);
