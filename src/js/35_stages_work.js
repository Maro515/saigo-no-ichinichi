'use strict';
/* 最期の一日 — 場所（働く場所）: 事務室、工事現場・工場 */
(function (SI) {
  const T = window.THREE, U = SI.U, K = SI.Kit, P = K.P;
  const S = SI.stages;
  const PI = Math.PI;

  function desk(withPc, seed) {
    const g = new T.Group(), r = U.rng(seed || 1);
    g.add(K.box(1.2, 0.03, 0.65, K.m('#d9d6cc', { rough: 0.6 }), 0, 0.7, 0));
    g.add(K.box(0.03, 0.7, 0.6, K.m(P.steelDark), -0.57, 0, 0)); g.add(K.box(0.03, 0.7, 0.6, K.m(P.steelDark), 0.57, 0, 0));
    g.add(K.box(0.38, 0.5, 0.55, K.m('#c6c8c9'), 0.36, 0.18, 0));
    if (withPc) {
      g.add(K.box(0.5, 0.31, 0.02, K.m(P.black, { rough: 0.5 }), 0, 0.83, 0.2));
      const scr = K.box(0.47, 0.28, 0.005, K.m('#1a2228', { emissive: '#9fb6c9', ei: 0.55, rough: 0.3, nocache: true }), 0, 0.845, 0.188, { noShadow: true }); g.add(scr);
      g.add(K.box(0.04, 0.1, 0.04, K.m(P.black), 0, 0.73, 0.22)); g.add(K.box(0.18, 0.012, 0.12, K.m(P.black), 0, 0.73, 0.22));
      g.add(K.box(0.36, 0.015, 0.12, K.m('#3a3b40'), 0, 0.73, -0.02)); g.add(K.box(0.06, 0.02, 0.1, K.m('#3a3b40'), 0.28, 0.73, -0.02));
    }
    if (r() < 0.8) { const p = K.paperSheet(0.21, 0.3); K.at(p, -0.38, 0.73, 0.02, r() - 0.5); g.add(p); }
    if (r() < 0.6) { const c = K.cup(U.pick(r, [P.white, '#8fa6b9', '#c9a48f']), 0.09); K.at(c, -0.4 + r() * 0.1, 0.73, -0.2); g.add(c); }
    return g;
  }
  function officeChair(c) {
    const g = new T.Group(), m = K.m(c || '#3f4650'), st = K.m(P.steelDark);
    g.add(K.box(0.46, 0.07, 0.44, m, 0, 0.42, 0)); g.add(K.box(0.44, 0.5, 0.06, m, 0, 0.52, -0.22));
    g.add(K.cyl(0.025, 0.36, st, 0, 0.06, 0)); for (let i = 0; i < 5; i++) { const a = i * 1.2566; g.add(K.rod([0, 0.07, 0], [Math.cos(a) * 0.28, 0.04, Math.sin(a) * 0.28], 0.015, st)); }
    return g;
  }

  /* ================= 職場の事務室 ================= */
  S.office = function (c) {
    const g = new T.Group(), lamps = [], fills = [], rng = U.rng(c.seed + 21), people = [];
    const W = 8.0, D = 7.0, H = 2.7, zS = D / 2;
    const floor = K.mTex(K.tex.rep(K.tex.tile('#9a9d9f', 4), 5, 4), { rough: 0.8 });
    const wall = K.m('#e2e2de');
    g.add(K.room({ w: W, d: D, h: H, wall, floor, ceil: K.m(P.white), base: K.m('#a9abac'),
      openings: [{ side: 'S', at: -2.0, w: 3.2, y: 0.85, h: 1.5, kind: 'window' }, { side: 'S', at: 2.0, w: 3.2, y: 0.85, h: 1.5, kind: 'window' }] }));
    /* 自分の机（窓に向かう）と、まわりの机 */
    const myDesk = desk(true, 1); K.at(myDesk, -0.3, 0, 1.1, 0); g.add(myDesk);
    const spots = [[-1.5, 0], [1.5, 0], [-1.5, -1.6], [0, -1.6], [1.5, -1.6], [-3.0, 0], [3.0, 0]];
    spots.forEach((s, i) => {
      const d = desk(true, 10 + i); K.at(d, s[0], 0, 1.1 + s[1], i < 2 || i > 4 ? PI : 0); g.add(d);
      const ch = officeChair(); K.at(ch, s[0], 0, 1.1 + s[1] + ((i < 2 || i > 4) ? -0.7 : 0.7), (i < 2 || i > 4) ? 0 : PI); g.add(ch);
      if (i === 1 || i === 3 || i === 5) {
        const f = K.figure({ pose: 'sit', seat: 0.46, top: U.pick(rng, ['#e2e4e6', '#c9d2dc', '#dcd6c9', '#b9c2cc']), bottom: U.pick(rng, ['#3d4352', '#4a4640']), hair: P.hair, long: rng() < 0.5, h: 1.6 + rng() * 0.12 });
        K.at(f, s[0], 0, 1.1 + s[1] + ((i < 2 || i > 4) ? -0.62 : 0.62), (i < 2 || i > 4) ? 0 : PI); g.add(f); people.push(f);
      }
    });
    /* 棚、複合機、ホワイトボード、観葉植物 */
    for (let i = 0; i < 3; i++) { const cb = K.cabinet(0.9, 1.1, 0.42, K.m('#c6c8c9')); K.at(cb, -W / 2 + 0.24, 0, -2.6 + i * 0.95, PI / 2); g.add(cb); }
    const pr = K.box(0.6, 1.05, 0.6, K.m('#d9dadb', { rough: 0.5 }), W / 2 - 0.45, 0, -2.6); g.add(pr); g.add(K.box(0.5, 0.03, 0.4, K.m('#3a3b40'), W / 2 - 0.45, 1.05, -2.6));
    g.add(K.box(0.03, 1.1, 2.2, K.m(P.white, { rough: 0.3 }), W / 2 - 0.02, 0.95, 0.2)); g.add(K.box(0.02, 0.4, 0.9, K.m('#c9d6e2'), W / 2 - 0.04, 1.4, -0.2, { noShadow: true }));
    const pot = K.cyl(0.18, 0.36, K.m('#8f8a82'), -W / 2 + 0.4, 0, 2.9, { rTop: 0.22 }); g.add(pot);
    const pl = K.bush(P.leaf, 0.42, 5); K.at(pl, -W / 2 + 0.4, 0.4, 2.9); g.add(pl);
    const clock = K.wallClock(c.hour); K.at(clock, 0, 2.35, zS - 0.04, PI); g.add(clock);
    const door = K.door(K.m('#b9bcc0'), 0.9, 2.05); K.at(door, 2.6, 0, -zS + 0.02); g.add(door);
    for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) { const l = K.ceilingLamp('panel'); K.at(l, -2.4 + k * 2.4, H, -1.4 + i * 2.6); l.userData.power = 6.5; g.add(l); lamps.push(l); }
    S.fill(g, fills, -2, 2.3, zS - 1, 10, 9); S.fill(g, fills, 2, 2.3, zS - 1, 10, 9);
    const outs = []; S.cityBelow(g, c, zS, -19, outs, true);
    return {
      group: g, indoor: true, label: '職場の事務室', shadow: 11, center: [0, 0, 1],
      anchors: {
        sit: { p: [0.02, 1.18, 0.38], look: [0.9, 1.1, zS], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' },
        stand: { p: [-2.4, 1.55, -1.2], look: [0.5, 1.2, zS], lim: { yaw: 160, up: 55, down: 55 }, body: 'stand' }
      },
      body: { sit: { sleeve: '#dfe3e6', legs: '#3d4352' }, stand: { sleeve: '#dfe3e6' } },
      spots: [[-2.0, 1.6, zS - 0.1], [2.0, 1.6, zS - 0.1], [0, 2.35, zS - 0.1], [-0.4, 0.9, 1.3], [W / 2 - 0.1, 1.5, 0.2], [-W / 2 + 0.4, 1.0, 2.9], [1.5, 1.0, 1.1], [-W / 2 + 0.3, 1.3, -1.6]],
      spotNames: ['窓の外のビル街', '大きな窓', '壁の時計', '机のパソコン', 'ホワイトボード', '観葉植物', 'となりの机', '書類の棚'],
      /* 机のあいだが 0.6 m しかないので、ますを細かくして通れるようにする */
      walk: { y: 0, cell: 0.1, rects: [[-W / 2, -zS, W / 2, zS]], start: [0.62, 0.3] },
      folk: people.map(f => ({ f, role: 'coworker' })),
      companion: { sit: { p: [1.05, 0, 0.75], ry: -2.1, pose: 'stand' }, stand: { p: [-1.3, 0, -0.2], ry: -2.4, pose: 'stand' } },
      weatherBox: [[-14, -6, zS + 0.5], [14, 10, zS + 14]], dustBox: [[-3, 0.6, 1.4], [3, 2.2, zS]],
      fills, amb: { machine: 0.25, crowd: 0.35 },
      onLight(env) {
        const late = env.hour >= 22.5 || env.hour < 6.5;
        for (const l of lamps) l.userData.setLamp(late ? 0.25 : Math.max(0.55, env.lampOn), l.userData.power);
        for (const o of outs) if (o.userData.setLamp) o.userData.setLamp(env.lampOn);
        clock.userData.setTime(env.hour);
        for (const p of people) p.visible = !late;
      },
      update(dt, env) { for (const p of people) p.userData.tick(env.time); }
    };
  };

  /* 店（飲食店・商店）は 38_shop_base.js と 39_shop_kinds.js で、種類ごとに作り分ける */

  /* ================= 工事現場・工場 ================= */
  S.worksite = function (c) {
    return c.v === 'factory' ? factory(c) : construction(c);
  };

  function construction(c) {
    const g = new T.Group(), lamps = [], rng = U.rng(c.seed + 23), sp = K.seasonal(c), people = [];
    const gr = K.ground(160, sp.snowy ? P.snow : '#8f8573', 0, 34); g.add(gr);
    const steel = K.m('#7d6a5c', { metal: 0.3, rough: 0.6 }), pipe = K.m('#b9bcbf', { metal: 0.5, rough: 0.45 });
    /* 建てかけの骨組みと足場 */
    const bx = 2, bz = 14, nx = 4, nz = 3, nf = 4, sx = 5, sz = 5, fh = 3.4;
    for (let i = 0; i <= nx; i++) for (let k = 0; k <= nz; k++) g.add(K.box(0.3, nf * fh, 0.3, steel, bx + (i - nx / 2) * sx, 0, bz + k * sz));
    for (let f = 1; f <= nf; f++) {
      for (let k = 0; k <= nz; k++) g.add(K.box(nx * sx, 0.3, 0.2, steel, bx, f * fh - 0.3, bz + k * sz));
      for (let i = 0; i <= nx; i++) g.add(K.box(0.2, 0.3, nz * sz, steel, bx + (i - nx / 2) * sx, f * fh - 0.3, bz + nz * sz / 2));
      if (f < 3) g.add(K.box(nx * sx, 0.12, nz * sz, K.m(P.concrete), bx, f * fh - 0.12, bz + nz * sz / 2));
    }
    const zf = bz - 1.2;
    for (let i = 0; i <= 10; i++) g.add(K.cyl(0.03, nf * fh + 1, pipe, bx - 10 + i * 2, 0, zf, { seg: 6 }));
    for (let i = 0; i <= 10; i++) g.add(K.cyl(0.03, nf * fh + 1, pipe, bx - 10 + i * 2, 0, zf + 0.9, { seg: 6 }));
    for (let f = 1; f <= nf; f++) {
      g.add(K.box(20, 0.05, 0.9, K.m('#a9a48f'), bx, f * 1.8 * 1.9 - 1.6, zf + 0.45));
      g.add(K.rod([bx - 10, f * 1.8 * 1.9 - 0.7, zf], [bx + 10, f * 1.8 * 1.9 - 0.7, zf], 0.025, pipe, { seg: 6 }));
    }
    const net = K.box(20, nf * fh, 0.02, K.m('#8fa6b0', { transparent: true, opacity: 0.22, double: true }), bx, 0.5, zf - 0.08, { noShadow: true }); K.noAO(net); g.add(net);
    /* クレーン */
    const cr = K.group(-16, 0, 26);
    cr.add(K.box(0.9, 30, 0.9, K.m('#d9a23c', { rough: 0.6 }), 0, 0, 0)); cr.add(K.box(1.6, 1.6, 1.6, K.m('#d9a23c'), 0, 30, 0));
    const jib = K.box(26, 0.7, 0.7, K.m('#d9a23c'), 9, 31, 0); cr.add(jib); cr.add(K.box(7, 0.7, 0.7, K.m('#d9a23c'), -4.5, 31, 0)); cr.add(K.box(1.6, 1.4, 1.2, K.m('#8a8a84'), -7, 30.3, 0));
    cr.add(K.rod([14, 31, 0], [14, 19, 0], 0.03, K.m(P.dark), { noCast: true })); cr.add(K.box(1.6, 0.5, 1.0, steel, 14, 18.5, 0));
    cr.rotation.y = -0.5; g.add(cr);
    /* 重機、資材、仮囲い、詰所 */
    const ex = K.group(-6, 0, 8, 0.7), ym = K.m('#d9a23c', { rough: 0.6 });
    ex.add(K.box(2.4, 0.7, 3.2, K.m('#3a3b40'), 0, 0, 0)); ex.add(K.box(2.2, 1.3, 2.4, ym, 0, 0.75, -0.2)); ex.add(K.box(1.0, 1.1, 1.1, K.m('#2c3840', { rough: 0.2 }), -0.5, 2.05, 0.3));
    ex.add(K.rod([0.5, 1.9, 0.8], [0.6, 4.4, 3.2], 0.16, ym)); ex.add(K.rod([0.6, 4.4, 3.2], [0.6, 1.6, 5.0], 0.13, ym)); ex.add(K.box(0.8, 0.7, 0.9, K.m('#3a3b40'), 0.6, 0.95, 5.0));
    g.add(ex);
    for (let i = 0; i < 5; i++) g.add(K.box(2.4, 0.08, 1.2, K.m('#c9b48f'), -2.5, i * 0.085, 4.2));
    for (let i = 0; i < 6; i++) { const p = K.cyl(0.06, 5, pipe, 5.5, 0.06 + (i > 2 ? 0.12 : 0), 5.2 + (i % 3) * 0.13, { seg: 8 }); p.rotation.z = PI / 2; p.position.x = 5.5; g.add(p); }
    for (let i = 0; i < 16; i++) g.add(K.box(1.95, 2.4, 0.06, K.m(i % 2 ? '#e6e8ea' : '#dfe2e4'), -20 + i * 2, 0, -9));
    for (let i = 0; i < 8; i++) g.add(K.box(0.06, 2.4, 1.95, K.m('#e6e8ea'), -21, 0, -8 + i * 2));
    const hut = K.group(11, 0, 2, -0.5); hut.add(K.box(5.4, 2.5, 2.3, K.m('#d9dadb'), 0, 0.15, 0)); hut.add(K.box(1.0, 0.8, 0.04, K.m('#7f909c'), -1.2, 1.2, 1.16)); hut.add(K.box(0.8, 1.9, 0.04, K.m('#b9bcc0'), 1.4, 0.2, 1.16)); g.add(hut);
    for (let i = 0; i < 6; i++) { const cn = K.cone(); K.at(cn, -1 + i * 1.5, 0, 1.2 + Math.sin(i) * 0.3); g.add(cn); }
    const tr = K.car('#e2e4e6', 'truck'); K.at(tr, 8.5, 0, -4, 1.9); g.add(tr);
    for (let i = 0; i < 4; i++) {
      const f = K.figure({ pose: i % 2 ? 'walk' : 'stand', top: U.pick(rng, ['#5a6f8c', '#8c7a5a', '#6a7f6a']), bottom: '#5c5648', hair: '#e6d44a', hairStyle: 'hair_helmet', h: 1.66 });
      K.at(f, [-3.5, 4.2, 0.5, -8][i], 0, [6.5, 9, 11, 12][i], rng() * 6); g.add(f); people.push(f);
    }
    const cols = ['#b9b6ad', '#a9adb2', '#c4bcae'];
    for (let i = 0; i < 9; i++) { const b = K.building(9 + rng() * 6, 10 + rng() * 22, 9, U.pick(rng, cols), c.seed + i); K.at(b, -44 + i * 12, 0, i % 2 ? -26 : 46); g.add(b); lamps.push(b); }
    g.add(K.ridge({ r: 260, hMin: 14, hMax: 40, color: sp.hillFar, seed: c.seed + 2, n: 40 }));
    return {
      group: g, indoor: false, label: '工事現場', shadow: 26, center: [0, 0, 8], shadowFollow: false,
      anchors: {
        stand: { p: [0.5, 1.62, 3.0], look: [2, 6, 16], lim: { yaw: 160, up: 70, down: 55 }, body: 'stand' },
        walk: { path: [[-9, 1.62, -5], [-3, 1.62, 0.5], [1.5, 1.62, 4], [3.5, 1.62, 9.5]], lim: { yaw: 150, up: 65, down: 55 }, body: 'stand', ground: 0 },
        sit: { p: [-2.5, 1.22, 4.2], look: [3, 4, 15], lim: { yaw: 150, up: 65, down: 60 }, body: 'sit', ground: 0 }
      },
      body: { stand: { sleeve: '#5a6f8c', shoe: '#3a352e' }, sit: { sleeve: '#5a6f8c', legs: '#5c5648' } },
      spots: [[2, 7.5, zf], [-6, 2.6, 8], [-2.5, 0.7, 4.2], [11, 1.6, 2], [-10, 12, 22], [5.5, 0.5, 5.2], [0, 1.0, 1.2]],
      spotNames: ['足場', 'ショベルカー', '積んだ合板', 'プレハブの詰所', 'クレーン', '鉄パイプ', 'カラーコーン'],
      /* 仮囲いの内側の、足場の手前まで。詰所（斜めの大きな箱）は自動判定で拾えないので除く */
      walk: { y: 0, rects: [[-16, -8.5, 14, zf - 0.3]], holes: S.slantHoles(11, 2, -0.5, 5.4, 2.3), start: [-2.5, 5.3] },
      folk: people.map(f => ({ f, role: 'worker' })),
      companion: { stand: { p: [-1.0, 0, 5.0], ry: 2.6, pose: 'stand' }, sit: { p: [-1.2, 0, 5.2], ry: 2.9, pose: 'stand' } },
      amb: { machine: 0.6, traffic: 0.3, wind: 0.3 },
      onLight: S.lampSetter(lamps),
      update(dt, env) { cr.rotation.y = -0.5 + Math.sin(env.time * 0.05) * 0.35; for (const p of people) p.userData.tick(env.time); }
    };
  }

  function factory(c) {
    const g = new T.Group(), lamps = [], fills = [], rng = U.rng(c.seed + 24), people = [];
    const W = 16, D = 22, H = 6.5, zS = D / 2;
    const floor = K.mTex(K.tex.rep(K.tex.noise('#7f8a86', 0.08), 6, 8), { rough: 0.55 });
    const wall = K.m('#cfd2cf');
    const ops = [];
    for (let i = 0; i < 4; i++) { ops.push({ side: 'E', at: -7.5 + i * 5, w: 3.4, y: 3.8, h: 1.5, kind: 'window' }); ops.push({ side: 'W', at: -7.5 + i * 5, w: 3.4, y: 3.8, h: 1.5, kind: 'window' }); }
    g.add(K.room({ w: W, d: D, h: H, wall, floor, ceil: K.m('#b9bcba'), base: false, openings: ops }));
    const ym = K.m('#d9b445');
    g.add(K.plane(0.12, D - 2, ym, -1.4, 0.012, 0, { noShadow: true })); g.add(K.plane(0.12, D - 2, ym, 1.4, 0.012, 0, { noShadow: true }));
    const steel = K.m('#6d7378', { metal: 0.4, rough: 0.5 });
    for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) g.add(K.box(0.3, H, 0.3, steel, sx * (W / 2 - 0.3), 0, -9 + i * 4.5));
    for (let i = 0; i < 5; i++) g.add(K.box(W, 0.4, 0.25, steel, 0, H - 0.5, -9 + i * 4.5));
    /* 機械 */
    const mc = ['#5f8a6e', '#6f7f8c', '#8a8f86', '#5f8a6e'];
    for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) {
      const m = K.group(sx * 4.6, 0, -7 + i * 4.6);
      m.add(K.box(2.6, 1.5, 1.8, K.m(mc[i]), 0, 0, 0)); m.add(K.box(1.4, 0.9, 1.4, K.m(K.shade(mc[i], 0.85)), -0.3, 1.5, 0));
      m.add(K.box(0.5, 0.7, 0.08, K.m('#2a2f33'), sx * -1.0, 1.0, 0.95)); m.add(K.box(0.3, 0.2, 0.01, K.m('#0b1114', { emissive: '#59e08a', ei: 0.9 }), sx * -1.0, 1.35, 0.995, { noShadow: true }));
      m.add(K.cyl(0.05, 0.3, K.m('#d9542b', { emissive: '#ff5a2a', ei: 0.5 }), 0.9, 2.4, 0.5));
      g.add(m);
    }
    /* 搬送ライン、棚、フォークリフト */
    g.add(K.box(1.0, 0.75, 14, K.m('#8d9094', { metal: 0.3 }), 6.7, 0, 0)); g.add(K.box(0.9, 0.04, 14, K.m('#3a3b40'), 6.7, 0.75, 0));
    const boxes = [];
    for (let i = 0; i < 7; i++) { const b = K.box(0.5, 0.36, 0.5, K.m('#c2a878'), 6.7, 0.79, -6.5 + i * 2); g.add(b); boxes.push(b); }
    for (let i = 0; i < 3; i++) { const r = K.shelf(3.6, 3.6, 1.0, K.m('#4f6f9c'), 3); K.at(r, -6.2 + i * 0.01, 0, -8.5 + i * 4.2, PI / 2); g.add(r); for (let k = 0; k < 6; k++) g.add(K.box(0.8, 0.7, 0.8, K.m(k % 2 ? '#c2a878' : '#b99a6a'), -6.2, 0.03 + (k % 3) * 1.2, -9.7 + i * 4.2 + Math.floor(k / 3) * 1.4 + 0.5)); }
    const fl = K.group(0.4, 0, 6.5, 2.6);
    fl.add(K.box(1.1, 0.8, 1.8, K.m('#d9a23c'), 0, 0.25, 0)); fl.add(K.box(1.0, 1.1, 0.06, K.m('#3a3b40'), 0, 1.05, -0.6)); fl.add(K.box(1.05, 0.06, 1.2, K.m('#3a3b40'), 0, 2.1, -0.1));
    for (const sx of [-1, 1]) { fl.add(K.box(0.08, 2.4, 0.1, K.m('#3a3b40'), sx * 0.4, 0.1, 0.95)); fl.add(K.box(0.1, 0.05, 1.1, K.m('#6d7378'), sx * 0.3, 0.18, 1.5)); }
    g.add(fl);
    for (let i = 0; i < 3; i++) {
      const f = K.figure({ pose: 'stand', top: '#8fa6b9', bottom: '#5a6272', hair: '#e2e4e6', hairStyle: 'hair_helmet', h: 1.64 }); K.at(f, [3.4, -3.3, 3.5][i], 0, [-6.2, -1.8, 3.0][i], [1.6, -1.6, 1.6][i]); g.add(f); people.push(f);
    }
    for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) { const l = K.ceilingLamp('panel'); K.at(l, sx * 3, H - 0.6, -7.5 + i * 5); l.userData.power = 22; g.add(l); lamps.push(l); }
    g.add(K.box(3.4, 3.6, 0.1, K.m('#a9b0b4'), 0, 0, zS - 0.06));
    const clock = K.wallClock(c.hour); clock.scale.setScalar(2); K.at(clock, 0, 4.6, zS - 0.1, PI); g.add(clock);
    S.fill(g, fills, 5, 4.5, 0, 22, 16); S.fill(g, fills, -5, 4.5, 0, 22, 16);
    const sp = K.seasonal(c); const gr = K.ground(160, sp.grass, -0.3, 30); g.add(gr);
    return {
      group: g, indoor: true, label: '工場', shadow: 16, center: [0, 0, 0],
      anchors: {
        stand: { p: [0.2, 1.6, -4.5], look: [0.5, 1.5, 8], lim: { yaw: 165, up: 65, down: 55 }, body: 'stand' },
        walk: { path: [[0, 1.6, -9.5], [0, 1.6, 7]], lim: { yaw: 150, up: 65, down: 55 }, body: 'stand', ground: 0 },
        sit: { p: [2.0, 1.2, -6.0], look: [-2, 1.4, 4], lim: { yaw: 150, up: 60, down: 60 }, body: 'sit', ground: 0 }
      },
      body: { stand: { sleeve: '#8fa6b9', shoe: '#2f2f33' }, sit: { sleeve: '#8fa6b9', legs: '#5a6272' } },
      spots: [[4.6, 2.6, -2.4], [-4.6, 2.6, 2.2], [6.7, 1.3, 1.5], [0.4, 1.6, 6.5], [0, 4.6, zS - 0.2], [-6.0, 2.2, -4.3], [0, 5.6, 0]],
      spotNames: ['工作機械', '機械の警告灯', '流れてくる箱', 'フォークリフト', '大きな時計', '資材の棚', '天井の梁'],
      walk: { y: 0, rects: [[-W / 2, -zS, W / 2, zS]] },
      folk: people.map(f => ({ f, role: 'worker' })),
      companion: { stand: { p: [1.5, 0, -2.6], ry: 2.9, pose: 'stand' }, sit: { p: [1.2, 0, -4.6], ry: 2.6, pose: 'stand' } },
      weatherBox: [[-2, 0, zS + 6], [2, 3, zS + 8]], dustBox: [[-5, 1, -6], [5, 5.5, 6]],
      fills, amb: { machine: 1 },
      onLight(env) { for (const l of lamps) l.userData.setLamp(0.9, l.userData.power); clock.userData.setTime(env.hour); },
      update(dt, env) { for (const b of boxes) { b.position.z += dt * 0.35; if (b.position.z > 6.9) b.position.z -= 13.8; } for (const p of people) p.userData.tick(env.time); }
    };
  }
})(window.SI);
