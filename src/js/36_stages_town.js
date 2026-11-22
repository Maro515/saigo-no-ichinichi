'use strict';
/* 最期の一日 — 場所（街と乗り物）: 通り、広場、電車、車 */
(function (SI) {
  const T = window.THREE, U = SI.U, K = SI.Kit, P = K.P;
  const S = SI.stages;
  const PI = Math.PI;
  const BCOL = ['#b9b6ad', '#a9adb2', '#c4bcae', '#9fa3a0', '#bdb3a6', '#aab2b8', '#c9c2b4'];

  function walker(rng, o) {
    o = o || {};
    return K.figure(Object.assign({
      pose: 'walk', top: U.pick(rng, ['#8c6f5e', '#6f7f8c', '#9a8f7a', '#7a6a7a', '#5f7a6a', '#a08a8a', '#d9d6cc', '#3d4352']),
      bottom: U.pick(rng, ['#3d4352', '#4a4640', '#5a5a62', '#6b6a70']), hair: U.pick(rng, [P.hair, '#3d332c', P.hairGray]), long: rng() < 0.35, h: 1.5 + rng() * 0.25
    }, o));
  }

  /* ================= 街の通り・交差点 ================= */
  S.street = function (c) {
    const g = new T.Group(), lamps = [], rng = U.rng(c.seed + 31), sp = K.seasonal(c);
    const wet = c.weather === 'rain' || c.weather === 'storm';
    const gr = K.ground(260, sp.snowy ? P.snow : '#8d8d88', -0.03, 50); gr.position.z = 10; g.add(gr);
    const main = K.road(7, 130, { wet, gaps: [[2.5, 17.5]] }); K.at(main, 0, 0, 10); g.add(main);
    const cross = K.road(7, 130, { wet, gaps: [[-7.5, 7.5]] }); cross.rotation.y = PI / 2; K.at(cross, 0, 0.004, 20); g.add(cross);
    g.add(K.plane(7.2, 7.2, K.mTex(K.tex.rep(K.tex.noise(wet ? '#33353a' : (sp.snowy ? '#c9ced2' : P.asphalt), 0.1), 2, 2), { rough: wet ? 0.35 : (sp.snowy ? 0.6 : 0.95) }), 0, 0.024, 20, { noShadow: true }));
    const cw1 = K.crosswalk(7, 2.4); cw1.rotation.y = PI / 2; K.at(cw1, -4.75, 0.012, 20); g.add(cw1);
    const cw2 = K.crosswalk(7, 2.4); K.at(cw2, 0, 0.012, 15.0); g.add(cw2);
    const cw3 = K.crosswalk(7, 2.4); cw3.rotation.y = PI / 2; K.at(cw3, 4.75, 0.012, 20); g.add(cw3);
    /* 歩道 */
    const swM = K.mTex(K.tex.rep(K.tex.tile(sp.snowy ? '#dfe3e6' : '#b3b1aa', 4), 2, 40), { rough: 0.9 });
    for (const sx of [-1, 1]) {
      g.add(K.box(2.5, 0.12, 66.5, swM, sx * 4.75, 0, -16.75)); g.add(K.box(2.5, 0.12, 51.5, swM, sx * 4.75, 0, 49.25));
      g.add(K.box(60, 0.12, 2.5, swM, sx * 36, 0, 15.25)); g.add(K.box(60, 0.12, 2.5, swM, sx * 36, 0, 24.75));
    }
    /* 建物。blds は足もとの範囲（歩ける範囲から除くために控える） */
    const blds = [];
    const mkRow = (x, z0, z1, ry) => {
      let z = z0;
      while (z < z1 - 6) {
        const w = 8 + rng() * 6, h = 6 + rng() * (rng() < 0.3 ? 26 : 10);
        const b = K.building(w, h, 9, U.pick(rng, BCOL), c.seed + Math.floor(z * 3 + x)); K.at(b, x, 0, z + w / 2, ry); g.add(b); lamps.push(b);
        blds.push([x - 4.6, z, x + 4.6, z + w]);
        const aw = K.box(0.9, 0.1, w * 0.7, K.m(U.pick(rng, ['#7a2f2a', '#2f4a3f', '#3d4a6a', '#c9a13a', '#e2dfd6'])), x - Math.sign(x) * 4.9, 2.7, z + w / 2); g.add(aw);
        const gl = K.box(0.06, 2.2, w * 0.7, K.m('#5a6a72', { rough: 0.2, emissive: '#ffe2b0', ei: 0, nocache: true }), x - Math.sign(x) * 4.52, 0.3, z + w / 2, { noShadow: true }); g.add(gl);
        gl.userData.setLamp = (v) => { gl.material.emissiveIntensity = v * 0.8; }; lamps.push(gl);
        z += w + 0.4;
      }
    };
    mkRow(-10.6, -52, 14, PI / 2); mkRow(10.6, -52, 14, PI / 2); mkRow(-10.6, 26, 76, PI / 2); mkRow(10.6, 26, 76, PI / 2);
    for (let i = 0; i < 5; i++) for (const sz of [-1, 1]) { const b = K.building(10, 8 + rng() * 14, 9, U.pick(rng, BCOL), c.seed + 90 + i); K.at(b, (i < 2 ? -1 : 1) * (22 + (i % 3) * 13), 0, 20 + sz * 10.6); g.add(b); lamps.push(b); }
    for (let i = 0; i < 5; i++) for (const sz of [-1, 1]) { const bx = (i < 2 ? -1 : 1) * (22 + (i % 3) * 13), bz = 20 + sz * 10.6; blds.push([bx - 5.1, bz - 4.6, bx + 5.1, bz + 4.6]); }
    /* 電柱、街灯、街路樹、ガードレール、自販機、ポスト、自転車 */
    for (let i = 0; i < 5; i++) { const p = K.pole(8.5); K.at(p, -6.0, 0, -44 + i * 14); g.add(p); if (i) g.add(K.wires([-6.0, 7.8, -44 + (i - 1) * 14], [-6.0, 7.8, -44 + i * 14], 3, 0.5)); }
    for (let i = 0; i < 6; i++) { const l = K.streetLamp(5.5); K.at(l, 3.8, 0, -40 + i * 20 + (i > 2 ? 12 : 0), PI); g.add(l); lamps.push(l); }
    for (let i = 0; i < 6; i++) { const t = K.tree({ kind: 'ginkgo', season: c.season, weather: c.weather, h: 5.5, seed: c.seed + i }); K.at(t, -3.85, 0.1, -42 + i * 10.5); g.add(t); }
    for (let i = 0; i < 4; i++) { const gr2 = K.guardrail(6); gr2.rotation.y = PI / 2; K.at(gr2, -3.62, 0.1, -37 + i * 10.5); g.add(gr2); }
    const vm = K.vending('#e6e8e6'); K.at(vm, -5.75, 0.12, 4.5, PI / 2); g.add(vm); lamps.push(vm);
    const post = K.group(-5.6, 0.12, 10.5); post.add(K.cyl(0.07, 0.75, K.m('#b03a2e'), 0, 0, 0)); post.add(K.box(0.42, 0.5, 0.36, K.m('#b03a2e'), 0, 0.75, 0)); g.add(post);
    const bike = K.bicycle(); K.at(bike, -5.7, 0.12, -6, 0.2); g.add(bike);
    /* 信号 */
    const sigA = K.signal(); K.at(sigA, -3.75, 0.1, 24.0, PI); g.add(sigA);         // こちらへ向いた歩行者用（横断の向こう岸）
    const sigB = K.signal(); K.at(sigB, 3.75, 0.1, 16.0, 0); g.add(sigB);
    const sigC = K.signal(); K.at(sigC, -3.75, 0.1, 16.0, -PI / 2); g.add(sigC);     // 横の通りの車用
    /* 車。信号で止まる */
    const cars = [];
    const ccol = ['#e6e8ea', '#2f3b55', '#8f9498', '#b03a2e', '#3a3b40', '#d9d2c0', '#5f7a8c'];
    const addCar = (axis, dir, lat, pos, kind) => {
      const m = K.car(U.pick(rng, ccol), kind); g.add(m); lamps.push(m);
      m.userData.noNav = true;                      // 走っている車は、歩ける範囲の調べから外す
      const o = { m, axis, dir, lat, pos, v: 8, kind, max: 7.5 + rng() * 3 };
      cars.push(o); return o;
    };
    addCar('z', 1, 1.75, -45); addCar('z', 1, 1.75, -12, 'kei'); addCar('z', 1, 1.75, 44, 'van');
    addCar('z', -1, -1.75, 60); addCar('z', -1, -1.75, 38, 'kei'); addCar('z', -1, -1.75, -20);
    addCar('x', 1, 18.25, -50, 'truck'); addCar('x', 1, 18.25, -22); addCar('x', -1, 21.75, 46); addCar('x', -1, 21.75, 24, 'kei');
    const stopAt = { 'z1': 12.6, 'z-1': 27.4, 'x1': -7.6, 'x-1': 7.6 };
    /* 歩く人 */
    const peds = [];
    for (let i = 0; i < 6; i++) {
      const f = walker(rng); const side = i % 2 ? 4.9 : -5.3, dir = i % 3 ? 1 : -1;
      f.userData.ped = { x: side + (rng() - 0.5) * 0.6, z: -40 + rng() * 50, dir, sp: 0.9 + rng() * 0.4 };
      f.rotation.y = dir > 0 ? 0 : PI; g.add(f); peds.push(f);
    }
    for (let i = 0; i < 2; i++) { const f = walker(rng, { pose: 'stand' }); K.at(f, -5.4 + i * 0.7, 0.12, 14.6 - i * 0.5, 0.1); g.add(f); peds.push(f); }
    g.add(K.ridge({ r: 300, hMin: 14, hMax: 42, color: sp.hillFar, seed: c.seed + 3, n: 44 }));
    let phase = 0;
    return {
      group: g, indoor: false, label: '街の通り', shadow: 30, shadowFollow: true,
      anchors: {
        walk: { path: [[-4.75, 1.67, -26], [-4.75, 1.67, 14.4]], lim: { yaw: 150, up: 60, down: 55 }, body: 'stand', ground: 0.12 },
        stand: { p: [-4.75, 1.67, 14.7], look: [-4.4, 1.5, 30], lim: { yaw: 165, up: 60, down: 55 }, body: 'stand', ground: 0.12 },
        walkEnd: { path: [[-4.75, 1.67, 15.4], [-4.75, 1.58, 17.0], [-4.75, 1.58, 23.4]], lim: { yaw: 150, up: 60, down: 55 }, body: 'stand', ground: 0.03 }
      },
      body: { stand: { sleeve: '#5f6672', shoe: '#2f2f33' }, sit: { sleeve: '#5f6672', legs: '#3d4352' } },
      spots: [[-3.9, 2.7, 23.9], [-5.6, 1.3, 10.5], [-3.85, 3.6, 10.6], [-9.5, 3.0, 8], [3.8, 5.3, 12], [0, 6, 46], [-5.7, 1.2, 4.5]],
      spotNames: ['歩行者の信号', '赤いポスト', 'いちょう並木', '店先の日よけ', '向かいのビル', '通りの先の山なみ', '自動販売機'],
      /* 歩道と横断歩道だけ。車道には出ない。建物（大きな箱）は自動判定で拾えないので、足もとを除く */
      walk: {
        y: 0.12,
        rects: [
          [-6.0, -34, -3.5, 16.5], [-6.0, 23.5, -3.5, 40], [3.5, -34, 6.0, 16.5], [3.5, 23.5, 6.0, 40],
          [-24, 14, -6.0, 16.5], [-24, 23.5, -6.0, 26], [6.0, 14, 24, 16.5], [6.0, 23.5, 24, 26],
          [-5.95, 16.5, -3.55, 23.5, 0.03], [3.55, 16.5, 5.95, 23.5, 0.03], [-3.5, 13.8, 3.5, 16.2, 0.03]
        ],
        holes: blds,
        /* 歩行者の信号が赤のあいだは、横断歩道へ踏み出せない（車は信号どおりに走っている） */
        gate(x, z) {
          const mainGo = phase < 11, crossGo = phase >= 13 && phase < 22;
          if (z > 16.5 && z < 23.5 && Math.abs(Math.abs(x) - 4.75) < 1.25) return mainGo;       // 交わる道を渡る
          if (Math.abs(x) < 3.5 && z > 13.8 && z < 16.2) return crossGo;                        // 本通りを渡る
          return true;
        }
      },
      folk: peds.filter(f => !f.userData.ped).map(f => ({ f, role: 'passerby' })),      // 角で信号を待っている 2 人
      meet: [{ p: [-5.2, 0.12, 24.7], ry: PI }, { p: [-5.4, 0.12, 12.4], ry: 2.2 }],
      companion: { stand: { p: [-5.55, 0.12, 15.3], ry: 0.3, pose: 'stand' }, walk: { p: [-5.5, 0.12, 13.5], ry: 0, pose: 'stand' } },
      amb: { traffic: 1, crowd: 0.4 },
      onLight: S.lampSetter(lamps),
      update(dt, env) {
        phase = (env.time % 24);
        const mainGo = phase < 11, crossGo = phase >= 13 && phase < 22;
        const yel = (phase >= 11 && phase < 13) ? 'main' : (phase >= 22 ? 'cross' : null);
        sigB.userData.set(mainGo ? 'green' : (yel === 'main' ? 'yellow' : 'red'));
        sigC.userData.set(crossGo ? 'green' : (yel === 'cross' ? 'yellow' : 'red'));
        sigA.userData.set(mainGo ? 'red' : 'green');     // 歩行者の灯は車用の逆。こちらの横断は、本通りが青のとき渡れる
        for (const o of cars) {
          const go = o.axis === 'z' ? mainGo : crossGo, s = stopAt[o.axis + o.dir];
          let target = o.max;
          const dist = (s - o.pos) * o.dir;
          if (!go && dist > 0 && dist < 22) target = Math.min(target, Math.max(0, (dist - 1.2) * 1.1));
          for (const q of cars) if (q !== o && q.axis === o.axis && q.dir === o.dir) { const dd = (q.pos - o.pos) * o.dir; if (dd > 0 && dd < 16) target = Math.min(target, Math.max(0, (dd - 7.5) * 1.0)); }
          /* 歩いている本人が、行く手の横断歩道にいれば、手前で止まる */
          const wk = env.walker;
          if (wk) {
            const dd = ((o.axis === 'z' ? wk.z : wk.x) - o.pos) * o.dir;
            if (Math.abs((o.axis === 'z' ? wk.x : wk.z) - o.lat) < 2.3 && dd > 0 && dd < 18) target = Math.min(target, Math.max(0, (dd - 5.5) * 1.0));
          }
          o.v = U.damp(o.v, target, target < o.v ? 3 : 0.9, dt);
          o.pos += o.v * o.dir * dt;
          if (o.pos * o.dir > 66) o.pos = -66 * o.dir;
          if (o.axis === 'z') { o.m.position.set(o.lat, 0, o.pos); o.m.rotation.y = o.dir > 0 ? 0 : PI; }
          else { o.m.position.set(o.pos, 0, o.lat); o.m.rotation.y = o.dir > 0 ? PI / 2 : -PI / 2; }
        }
        const late = env.hour >= 23 || env.hour < 5;
        peds.forEach((f, i) => {
          f.visible = !(late && i > 1);
          const p = f.userData.ped;
          if (p) {
            p.z += p.dir * p.sp * dt; if (p.z > 14) p.z = -48; if (p.z < -48) p.z = 14;
            f.position.set(p.x, 0.12 + Math.abs(Math.sin(env.time * 5.2 * p.sp + i)) * 0.03, p.z);
            const pr = f.userData.parts, sw = Math.sin(env.time * 5.2 * p.sp + i) * 0.45;
            pr.lL.hp.rotation.x = -sw; pr.lR.hp.rotation.x = sw; pr.aL.sh.rotation.x = sw * 0.8; pr.aR.sh.rotation.x = -sw * 0.8;
          } else f.userData.tick(env.time);
        });
      }
    };
  };

  /* ================= 公園・校庭・運動場 ================= */
  S.park = function (c) {
    const g = new T.Group(), lamps = [], rng = U.rng(c.seed + 32), sp = K.seasonal(c), people = [];
    const gr = K.ground(200, sp.grass, 0, 44); g.add(gr);
    const sand = K.mTex(K.tex.rep(K.tex.noise(sp.snowy ? '#e6eaec' : '#c9b99a', 0.07), 12, 9), { rough: 1 });
    g.add(K.plane(44, 30, sand, 3, 0.012, 14));
    const lm = K.m(P.line);
    for (const z of [3, 25]) g.add(K.plane(30, 0.1, lm, 3, 0.02, z, { noShadow: true }));
    for (const x of [-12, 18]) g.add(K.plane(0.1, 22, lm, x, 0.02, 14, { noShadow: true }));
    /* 木 */
    const kinds = ['sakura', 'sakura', 'broad', 'ginkgo', 'broad', 'sakura', 'momiji', 'pine'];
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * 6.28, r = 30 + (i % 3) * 5, h = 5.5 + rng() * 3;
      const tx = Math.cos(a) * r * 1.2 + 3, tz = Math.sin(a) * r * 0.8 + 12;
      if (tx > -26 && tx < 34 && tz > 31.5 && tz < 48) continue;          // 校舎と重なる場所には植えない（枝が壁から出てしまう）
      const t = K.tree({ kind: kinds[i % kinds.length], season: c.season, weather: c.weather, h, seed: c.seed + i });
      K.at(t, tx, 0, tz); g.add(t);
    }
    for (let i = 0; i < 6; i++) { const t = K.tree({ kind: 'sakura', season: c.season, weather: c.weather, h: 6 + rng() * 2, seed: c.seed + 50 + i }); K.at(t, -17 + i * 6.2, 0, -11.5 + (i % 2) * 1.5); g.add(t); }
    /* 遊具 */
    const st = K.m('#6f8fae', { metal: 0.3, rough: 0.5 }), rd = K.m('#c9584a', { rough: 0.5 });
    const sw = K.group(-15, 0, 6, 0.4);
    for (const sx of [-1.6, 1.6]) { sw.add(K.rod([sx, 0, -0.9], [sx, 2.4, 0], 0.045, st)); sw.add(K.rod([sx, 0, 0.9], [sx, 2.4, 0], 0.045, st)); }
    sw.add(K.rod([-1.6, 2.4, 0], [1.6, 2.4, 0], 0.045, st));
    const seats = [];
    for (const sx of [-0.8, 0.8]) { const sg = K.group(sx, 2.4, 0); sg.add(K.rod([-0.2, 0, 0], [-0.2, -1.9, 0], 0.008, K.m(P.steelDark), { noCast: true })); sg.add(K.rod([0.2, 0, 0], [0.2, -1.9, 0], 0.008, K.m(P.steelDark), { noCast: true })); sg.add(K.box(0.5, 0.04, 0.2, K.m(P.wood), 0, -1.94, 0)); sg.userData.dyn = true; sw.add(sg); seats.push(sg); }
    g.add(sw);
    const sl = K.group(-17, 0, 14, -0.6);
    sl.add(K.box(1.0, 0.08, 1.0, st, 0, 1.7, 0)); for (const sx of [-0.45, 0.45]) for (const sz of [-0.45, 0.45]) sl.add(K.cyl(0.04, 1.7, st, sx, 0, sz, { seg: 6 }));
    const ramp = K.box(0.7, 0.05, 3.2, rd, 0, 0.85, 1.9); ramp.rotation.x = 0.56; sl.add(ramp);
    for (let i = 0; i < 6; i++) sl.add(K.box(0.6, 0.04, 0.2, st, 0, 0.26 + i * 0.26, -0.7 - (5 - i) * 0.17));
    g.add(sl);
    const jg = K.group(-14, 0, 21);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) jg.add(K.cyl(0.025, 2.2, K.m('#d9b445', { metal: 0.3 }), i * 0.7, 0, k * 0.7, { seg: 6 }));
    for (let h = 1; h <= 3; h++) for (let i = 0; i < 4; i++) { jg.add(K.rod([0, h * 0.7, i * 0.7], [2.1, h * 0.7, i * 0.7], 0.022, K.m('#d9b445', { metal: 0.3 }), { seg: 6 })); jg.add(K.rod([i * 0.7, h * 0.7, 0], [i * 0.7, h * 0.7, 2.1], 0.022, K.m('#d9b445', { metal: 0.3 }), { seg: 6 })); }
    g.add(jg);
    /* 校舎、時計、バックネット、ゴール、水のみ場、ベンチ、灯 */
    const sch = K.building(52, 11, 9, '#d9d2c2', c.seed + 5); K.at(sch, 4, 0, 40); g.add(sch); lamps.push(sch);
    const clock = K.wallClock(c.hour); clock.scale.setScalar(5); K.at(clock, 4, 9.2, 35.45, PI); g.add(clock);
    const net = K.group(22, 0, 3, -0.8);
    for (let i = 0; i < 5; i++) net.add(K.cyl(0.05, 6, st, -4 + i * 2, 0, 0, { seg: 6 }));
    const nm = K.box(8, 6, 0.02, K.m('#5f7a6a', { transparent: true, opacity: 0.25, double: true }), 0, 0, 0, { noShadow: true }); K.noAO(nm); net.add(nm); g.add(net);
    const goal = K.group(3, 0, 24.6); const wm = K.m(P.white);
    goal.add(K.rod([-3.6, 0, 0], [-3.6, 2.4, 0], 0.06, wm)); goal.add(K.rod([3.6, 0, 0], [3.6, 2.4, 0], 0.06, wm)); goal.add(K.rod([-3.6, 2.4, 0], [3.6, 2.4, 0], 0.06, wm)); g.add(goal);
    const fz = K.group(-9, 0, -6); fz.add(K.box(0.7, 0.8, 0.5, K.m(P.concrete), 0, 0, 0)); fz.add(K.rod([0, 0.8, 0], [0, 0.95, 0], 0.015, K.m(P.steel, { metal: 0.6 }))); g.add(fz);
    const benches = [[-5, -3.6, 0.15], [4.5, -4.2, -0.1], [-12, -1.5, 0.6]];
    for (const b of benches) { const bn = K.bench(); K.at(bn, b[0], 0, b[1], b[2]); g.add(bn); }
    for (let i = 0; i < 4; i++) { const l = K.streetLamp(4.5); K.at(l, -16 + i * 11, 0, -7.5, PI / 2); g.add(l); lamps.push(l); }
    for (let i = 0; i < 7; i++) { const b = K.bush(sp.snowy ? K.mixc(P.leafDark, P.snow, 0.5) : P.leafDark, 0.6, 30 + i); K.at(b, -20 + i * 6.5, 0, -9.5); g.add(b); }
    const fence = K.fence(70, 1.1, '#8a8f8a', false); K.at(fence, 3, 0, -13); g.add(fence);
    /* 人 */
    for (let i = 0; i < 5; i++) {
      const f = K.figure({ pose: i % 2 ? 'walk' : 'stand', child: i < 4, top: U.pick(rng, ['#d98a8a', '#8ab0d9', '#e6cf7a', '#9ac49a', '#e2e4e6']), bottom: '#3d4352', hair: P.hair, h: 1.6 });
      K.at(f, [-13, -10, 2, 8, -6][i], 0, [9, 16, 12, 17, 3][i], rng() * 6); g.add(f); people.push(f);
    }
    const houses = [[-40, -24, 0.2], [-22, -26, -0.1], [-4, -25, 0.1], [16, -26, 0], [34, -24, -0.2]];
    for (const h of houses) { const hs = K.house({ w: 8, d: 7, h: 5.4, rh: 1.6, wall: U.pick(rng, [P.wallWarm, P.wallCool, P.offwhite]), roof: U.pick(rng, [P.roof, P.roofRed]), snow: sp.snowy }); K.at(hs, h[0], 0, h[1], h[2]); g.add(hs); lamps.push(hs); }
    g.add(K.ridge({ r: 240, hMin: 12, hMax: 36, color: sp.hill, seed: c.seed + 3, n: 40 })); g.add(K.ridge({ r: 300, hMin: 22, hMax: 56, color: sp.hillFar, seed: c.seed + 4, n: 40 }));
    return {
      group: g, indoor: false, label: '広場', shadow: 30, shadowFollow: true,
      anchors: {
        sit: { p: [-5, 1.17, -3.75], look: [1, 0.9, 12], lim: { yaw: 150, up: 60, down: 60 }, body: 'sit', ground: 0 },
        stand: { p: [1.5, 1.6, -1.0], look: [3, 1.3, 16], lim: { yaw: 165, up: 60, down: 55 }, body: 'stand', ground: 0 },
        walk: { path: [[-18, 1.6, -5.5], [-4, 1.6, -6.2], [10, 1.6, -5.2], [20, 1.6, 2]], lim: { yaw: 150, up: 60, down: 55 }, body: 'stand', ground: 0 }
      },
      body: { sit: { sleeve: '#7f8a7a', legs: '#4c4f58' }, stand: { sleeve: '#7f8a7a', shoe: '#e6e8ea' } },
      spots: [[-15, 1.2, 6], [4, 9.2, 35], [3, 1.4, 24.6], [-9, 1.1, -6], [-17, 2.1, 14], [8, 4.5, -11], [4.5, 0.7, -4.2], [-11, 4.2, -11]],
      spotNames: ['ぶらんこ', '校舎の時計', 'サッカーゴール', '水のみ場', 'すべり台', '桜並木', 'ベンチ', '桜の枝'],
      /* 植えこみの内側から、校舎の手前まで。細い柱だけの遊具とバックネットは自動判定で拾えないので除く */
      walk: {
        y: 0, rects: [[-21, -8.4, 24, 28]],
        holes: [[-14.1, 20.9, -11.8, 23.2]].concat(S.slantHoles(-15, 6, 0.4, 3.3, 1.9), S.slantHoles(-17.49, 14.72, -0.6, 1.0, 5.05), S.slantHoles(22, 3, -0.8, 8.2, 0.3))
      },
      folk: people.map((f, i) => ({ f, role: i < 4 ? 'child' : 'parkgoer' })),
      meet: [{ p: [-2.0, 0, 0.5], ry: 3.0 }, { p: [5.0, 0, 1.5], ry: -2.6 }],
      companion: { sit: { p: [-4.35, 0, -3.62], ry: 0.15, pose: 'sit', seat: 0.42 }, stand: { p: [0.3, 0, 0.6], ry: 0.6, pose: 'stand' }, walk: { p: [-17, 0, -4.6], ry: 1.5, pose: 'stand' } },
      petalBox: [[-22, 0, -14], [22, 7, 6]],
      amb: { nature: 1, crowd: 0.25 },
      onLight: S.lampSetter(lamps, (env) => { clock.userData.setTime(env.hour); const day = env.hour >= 8.5 && env.hour < 17.5 && (env.weather === 'clear' || env.weather === 'cloudy'); for (const p of people) p.visible = day; }),
      update(dt, env) { seats.forEach((s, i) => { s.rotation.x = Math.sin(env.time * 1.5 + i * 2) * 0.12 * (0.4 + env.wind); }); for (const p of people) if (p.visible) p.userData.tick(env.time); }
    };
  };

  /* 流れていく外の景色。speed（m/秒）で −Z へ動く */
  function treadmill(g, items, span) {
    return function (dt, speed) {
      for (const it of items) {
        it.position.z -= (speed + (it.userData.rel || 0)) * dt;
        if (it.position.z < -span * 0.2) it.position.z += span;
        else if (it.position.z > span * 0.8 + 1) it.position.z -= span;
      }
    };
  }

  /* ================= 電車の車内 ================= */
  S.train = function (c) {
    const g = new T.Group(), lamps = [], rng = U.rng(c.seed + 33), sp = K.seasonal(c), people = [];
    const car = new T.Group(); g.add(car); car.userData.noSnowCap = true;           // 車内には積もらせない
    const Wd = 2.8, L = 18, H = 2.25, hx = Wd / 2;
    const wallM = K.m('#dcdcd6', { rough: 0.6 }), seatM = K.m(U.pick(rng, ['#4f7a5c', '#3f5a8c', '#7a3f4a', '#5c6a8c'])), stl = K.m(P.steel, { metal: 0.6, rough: 0.35 });
    car.add(K.plane(Wd, L, K.mTex(K.tex.rep(K.tex.noise('#9a9c98', 0.06), 2, 12), { rough: 0.7 }), 0, 0, 0));
    car.add(K.box(Wd + 0.2, 0.12, L, K.m('#e9e9e4'), 0, H, 0)); car.add(K.box(Wd + 0.2, 0.3, L, K.m('#6d7378'), 0, -0.31, 0, { noCast: true }));
    const doors = [-4.5, 4.5], glassM = K.m(P.glass, { transparent: true, opacity: 0.1, rough: 0.1 });
    for (const sx of [-1, 1]) {
      const x = sx * (hx + 0.04);
      car.add(K.box(0.08, 0.9, L, wallM, x, 0, 0)); car.add(K.box(0.08, 0.4, L, wallM, x, 1.85, 0));
      for (let z = -9; z <= 9; z += 2.25) { const isDoor = doors.some(d => Math.abs(z - d) < 1.0); car.add(K.box(0.08, 0.95, isDoor ? 0.12 : 0.3, wallM, x, 0.9, z)); }
      for (const d of doors) { for (const k of [-0.36, 0.36]) car.add(K.box(0.05, 0.92, 0.66, K.m('#c9ccc9', { rough: 0.4, metal: 0.3 }), x - sx * 0.02, 0, d + k)); car.add(K.box(0.09, 1.86, 0.06, K.m('#3a3b40'), x - sx * 0.01, 0, d)); }
      const gl = K.box(0.01, 0.95, L, glassM, x, 0.9, 0, { noShadow: true }); K.noAO(gl); car.add(gl);
      /* 座席 */
      for (const seg of [[-8.6, -5.6], [-3.4, 3.4], [5.6, 8.6]]) {
        const len = seg[1] - seg[0], zc = (seg[0] + seg[1]) / 2;
        car.add(K.box(0.46, 0.12, len, seatM, sx * (hx - 0.25), 0.33, zc)); car.add(K.box(0.1, 0.42, len, seatM, sx * (hx - 0.05), 0.45, zc)); car.add(K.box(0.44, 0.33, len, K.m('#b9bcb9'), sx * (hx - 0.24), 0, zc));
        for (const e of seg) car.add(K.box(0.5, 0.75, 0.03, K.m('#c9ccc9'), sx * (hx - 0.25), 0.33, e));
      }
      /* 手すりとつり革 */
      car.add(K.rod([sx * 0.78, 1.93, -8.6], [sx * 0.78, 1.93, 8.6], 0.016, stl));
      for (let z = -8; z <= 8; z += 0.62) if (!doors.some(d => Math.abs(z - d) < 0.8)) {
        car.add(K.rod([sx * 0.78, 1.93, z], [sx * 0.78, 1.72, z], 0.006, K.m('#e6e6e0'), { noCast: true }));
        const ring = new T.Mesh(new T.TorusGeometry(0.05, 0.009, 6, 14), K.m('#e9e9e4')); ring.position.set(sx * 0.78, 1.67, z); ring.rotation.y = PI / 2; car.add(ring);
      }
      for (const d of doors) for (const k of [-0.8, 0.8]) car.add(K.rod([sx * (hx - 0.5), 0, d + k], [sx * (hx - 0.5), 1.93, d + k], 0.016, stl));
      for (let i = 0; i < 7; i++) car.add(K.box(0.01, 0.2, 0.75, K.m(U.pick(rng, ['#c9d6e2', '#e2c9c9', '#e6dfc0', '#c9e2d0', '#e9e9e4'])), sx * (hx - 0.01), 1.98, -7.5 + i * 2.4, { noShadow: true }));
    }
    for (let z = -6.5; z <= 6.5; z += 2.6) car.add(K.box(0.72, 0.4, 0.008, K.m(U.pick(rng, ['#e6dfc0', '#c9d6e2', '#e2c9c9', '#f1f0eb']), { double: true }), 0, 1.78, z));
    for (const sz of [-1, 1]) { car.add(K.box(Wd, H, 0.08, wallM, 0, 0, sz * (L / 2))); car.add(K.box(0.8, 1.85, 0.1, K.m('#b9bcb9'), 0, 0, sz * (L / 2 - 0.01))); car.add(K.box(0.5, 0.7, 0.11, K.m('#5a6a72', { rough: 0.2 }), 0, 1.0, sz * (L / 2 - 0.012))); }
    const lm = K.m(P.lampCool, { emissive: P.lampCool, ei: 1.2, nocache: true });
    for (let z = -7.5; z <= 7.5; z += 3) { car.add(K.box(0.18, 0.03, 1.4, lm, 0, H - 0.03, z, { noShadow: true })); const pl = new T.PointLight(0xeef2ff, 2.2, 5, 1.6); pl.position.set(0, H - 0.25, z); car.add(pl); lamps.push(pl); }
    /* 乗客 */
    const seatsZ = [-7.6, -6.6, -2.6, -1.4, 0.4, 2.8, 6.2, 7.4];
    seatsZ.forEach((z, i) => {
      const sx = i % 2 ? 1 : -1;
      if (sx < 0 && Math.abs(z - 1.2) < 1.3) return;
      const f = K.figure({ pose: 'sit', seat: 0.4, top: U.pick(rng, ['#8c6f5e', '#6f7f8c', '#9a8f7a', '#3d4352', '#d9d6cc', '#7a6a7a']), bottom: U.pick(rng, ['#3d4352', '#4a4640', '#5a5a62']), hair: U.pick(rng, [P.hair, P.hairGray, '#3d332c']), long: rng() < 0.4, h: 1.55 + rng() * 0.15 });
      K.at(f, sx * (hx - 0.32), 0, z, sx > 0 ? -PI / 2 : PI / 2); car.add(f); people.push(f);
    });
    for (const p of [[0.35, -5.2, 2.0], [-0.4, 5.4, -1.2]]) { const f = walker(rng, { pose: 'stand' }); K.at(f, p[0], 0, p[1], p[2]); car.add(f); people.push(f); }
    /* 外 */
    const out = new T.Group(); g.add(out); out.userData.noSnowCap = true;          // 流れる景色（雪は木や家がそれぞれ持つ）
    const gr = K.ground(500, sp.snowy ? P.snow : sp.grass, -1.2, 70); g.add(gr);
    g.add(K.box(6, 0.5, 400, K.m('#77726a'), 0, -1.25, 0, { noCast: true }));
    const items = [], SPAN = 260;
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1, z = i * 10 + rng() * 6, kind = rng();
      let o;
      if (kind < 0.45) o = K.house({ w: 7 + rng() * 3, d: 6, h: 3 + (rng() < 0.5 ? 2.6 : 0), rh: 1.5, wall: U.pick(rng, [P.wallWarm, P.wallCool, P.offwhite, P.beige]), roof: U.pick(rng, [P.roof, P.roofRed]), snow: sp.snowy });
      else if (kind < 0.7) o = K.building(9 + rng() * 5, 8 + rng() * 14, 9, U.pick(rng, BCOL), c.seed + i);
      else o = K.tree({ kind: U.pick(rng, ['broad', 'sakura', 'conifer', 'ginkgo']), season: c.season, weather: c.weather, h: 5 + rng() * 3, seed: c.seed + i });
      K.at(o, side * (11 + rng() * 22), -1.2, z, rng() < 0.5 ? PI / 2 : 0); out.add(o); items.push(o); if (o.userData.setLamp) lamps.push(o);
    }
    for (let i = 0; i < 6; i++) { const p = K.pole(7.5); K.at(p, 3.6, -1.2, i * 43); out.add(p); items.push(p); }
    const tick = treadmill(out, items, SPAN);
    g.add(K.ridge({ r: 320, hMin: 12, hMax: 44, color: sp.hillFar, seed: c.seed + 3, n: 44 }));
    return {
      group: g, indoor: true, label: '電車の中', shadow: 14, center: [0, 0, 0], rock: 0.22,
      anchors: {
        sit: { p: [-hx + 0.42, 1.2, 1.2], look: [hx, 1.12, 1.9], lim: { yaw: 150, up: 55, down: 60 }, body: 'sit' },
        stand: { p: [0.2, 1.58, -3.2], look: [hx, 1.35, -1.6], lim: { yaw: 165, up: 55, down: 55 }, body: 'stand' }
      },
      body: { sit: { sleeve: '#5f6672', legs: '#3d4352' }, stand: { sleeve: '#5f6672' } },
      spots: [[hx - 0.05, 1.45, 1.6], [0, 1.78, 1.3], [hx - 0.3, 0.75, 4.2], [0, 1.25, L / 2 - 0.2], [hx - 0.05, 1.3, -4.5], [-0.78, 1.67, 3.4], [hx - 0.05, 1.98, 2.4]],
      spotNames: ['流れる景色', '中づり広告', '乗り降りのドア', '隣の車両への扉', 'ドアの窓', 'つり革', '窓の上の広告'],
      walk: { y: 0, rects: [[-hx, -L / 2 + 0.06, hx, L / 2 - 0.06]], start: [-0.45, 1.2] },
      folk: people.map(f => ({ f, role: 'passenger' })),
      companion: { sit: { p: [-hx + 0.32, 0, 0.5], ry: PI / 2, pose: 'sit', seat: 0.4 }, stand: { p: [0.75, 0, -2.5], ry: -2.4, pose: 'stand' } },
      weatherBox: [[hx + 0.4, -1, -12], [hx + 10, 6, 12]],
      amb: { train: 1 },
      onLight(env) { for (const l of lamps) { if (l.isPointLight) l.intensity = 1.0 + env.lampOn * 1.6; else if (l.userData.setLamp) l.userData.setLamp(env.lampOn); } const late = env.hour >= 22.5 || env.hour < 5.5; people.forEach((p, i) => { p.visible = !(late && i % 3); }); },
      update(dt, env) { tick(dt, 17); car.position.x = Math.sin(env.time * 1.7) * 0.006; car.rotation.z = Math.sin(env.time * 0.9) * 0.004; for (const p of people) if (p.visible) p.userData.tick(env.time); }
    };
  };

  /* ================= 車の運転席 ================= */
  S.car = function (c) {
    const g = new T.Group(), lamps = [], rng = U.rng(c.seed + 34), sp = K.seasonal(c);
    const v = c.v || 'country';
    const txt = c.cause ? (c.cause.name + c.cause.place) : '';
    const passenger = /助手席|後部座席|乗客|の客|バス/.test(txt);
    const wet = c.weather === 'rain' || c.weather === 'storm';
    const speed = v === 'highway' ? 26 : (v === 'mountain' ? 10.5 : (v === 'city' ? 9 : 12.5));
    /* ---- 車内 ---- */
    const car = new T.Group(); g.add(car);
    const dk = K.m('#3a3b40', { rough: 0.8 }), dk2 = K.m('#55565c', { rough: 0.7 }), body = K.m(U.pick(rng, ['#e6e8ea', '#8f9498', '#2f3b55', '#b9b6ad', '#5a6a72']), { rough: 0.35, metal: 0.2 });
    const dx = -0.36;
    car.add(K.box(1.5, 0.3, 0.55, dk, 0, 0.72, 1.0)); car.add(K.box(1.5, 0.06, 0.34, dk2, 0, 1.0, 1.1));
    car.add(K.box(0.46, 0.14, 0.22, dk, dx, 0.98, 0.84));
    const instr = K.box(0.2, 0.05, 0.01, K.m('#0b1114', { emissive: '#9fd0e8', ei: 0.2, nocache: true }), dx, 1.01, 0.728, { noShadow: true }); instr.rotation.x = -0.3; car.add(instr);
    const wheel = new T.Group(); wheel.position.set(dx, 0.97, 0.5); wheel.rotation.x = -1.15;
    const rim = new T.Mesh(new T.TorusGeometry(0.185, 0.017, 10, 28), dk2); rim.castShadow = true; wheel.add(rim);
    for (const a of [0, 2.2, -2.2]) { const s = K.box(0.03, 0.18, 0.02, dk2, 0, 0, 0); s.geometry.translate(0, 0, 0); s.rotation.z = a; s.position.set(Math.sin(-a) * 0.0, 0, 0); wheel.add(s); }
    wheel.add(K.cyl(0.05, 0.03, dk, 0, -0.015, 0)); car.add(wheel);
    car.add(K.rod([dx, 0.95, 0.52], [dx, 0.82, 0.85], 0.03, dk));
    for (const sx of [-1, 1]) {
      car.add(K.rod([sx * 0.74, 1.02, 1.28], [sx * 0.62, 1.52, 0.55], 0.035, dk2));
      car.add(K.box(0.07, 0.62, 1.9, dk, sx * 0.76, 0.42, 0.3)); car.add(K.box(0.05, 0.5, 0.07, dk2, sx * 0.74, 1.02, -0.32));
      car.add(K.box(0.14, 0.1, 0.05, dk, sx * 0.9, 1.06, 0.98));
      car.add(K.rod([sx * 0.62, 1.52, 0.55], [sx * 0.64, 1.52, -1.2], 0.03, dk2));
    }
    car.add(K.box(1.32, 0.05, 1.9, dk2, 0, 1.52, -0.35)); car.add(K.box(1.3, 0.06, 0.12, dk2, 0, 1.5, 0.55));
    car.add(K.box(0.22, 0.065, 0.03, dk, 0, 1.43, 0.6)); car.add(K.rod([0, 1.5, 0.6], [0, 1.46, 0.6], 0.008, dk));
    const charm = K.group(0, 1.4, 0.6); charm.add(K.rod([0, 0, 0], [0, -0.1, 0], 0.002, K.m(P.white), { noCast: true })); charm.add(K.box(0.035, 0.055, 0.008, K.m(U.pick(rng, ['#b03a2e', '#3d5a8c', '#c9a13a', '#5f8a6e'])), 0, -0.155, 0)); car.add(charm);
    car.add(K.box(1.5, 0.1, 1.35, body, 0, 0.93, 1.95)); car.add(K.box(1.5, 0.5, 0.1, body, 0, 0.5, 2.6));
    car.add(K.box(0.24, 0.3, 0.9, dk, 0, 0.45, 0.1));
    for (const sx of [-1, 1]) { car.add(K.box(0.5, 0.14, 0.5, dk2, sx * 0.36, 0.3, -0.12)); car.add(K.box(0.5, 0.75, 0.12, dk2, sx * 0.36, 0.4, -0.42)); car.add(K.box(0.24, 0.2, 0.1, dk2, sx * 0.36, 1.15, -0.44)); }
    car.add(K.box(1.5, 0.3, 2.6, dk, 0, 0.05, 0.1));
    const wipers = [];
    for (const sx of [-0.4, 0.3]) { const w = new T.Group(); w.position.set(sx, 1.04, 1.26); const r = K.rod([0, 0, 0], [0.42, 0.2, -0.3], 0.007, dk, { noCast: true }); w.add(r); car.add(w); wipers.push(w); }
    const hl = new T.SpotLight(0xfff2d8, 0, 60, 0.5, 0.6, 1.2); hl.position.set(0, 0.8, 2.6); hl.target.position.set(0, 0, 30); car.add(hl); car.add(hl.target);
    /* 運転する自分の腕、または運転手 */
    let driver = null;
    if (passenger) {
      driver = K.figure({ pose: 'sit', seat: 0.33, top: '#5f6672', bottom: '#3d4352', hair: P.hair, h: 1.66 }); K.at(driver, dx, 0.02, -0.14, 0);
      const pr = driver.userData.parts; pr.aL.sh.rotation.x = -1.0; pr.aR.sh.rotation.x = -1.0; pr.aL.el.rotation.x = -0.5; pr.aR.el.rotation.x = -0.5; driver.userData.tick = () => { };
      car.add(driver);
    }
    /* ---- 外 ---- */
    const out = new T.Group(); g.add(out); out.userData.noSnowCap = true;          // 流れる景色（雪は木や家がそれぞれ持つ）
    const SPAN = 300, items = [];
    const roadW = v === 'highway' ? 17 : 7, rcx = v === 'highway' ? -6.2 : -1.75;
    const gr = K.ground(700, sp.snowy ? P.snow : (v === 'city' ? '#8d8d88' : sp.field), -0.06, 80); gr.position.z = 200; g.add(gr);
    const am = K.mTex(K.tex.rep(K.tex.noise(wet ? '#303236' : (sp.snowy ? '#8d9196' : P.asphalt), 0.1), roadW / 3, 120), { rough: wet ? 0.3 : 0.95 });
    if (sp.snowy) { const rd = K.road(roadW, 520, {}); K.at(rd, rcx, -0.002, 200); g.add(rd); } else g.add(K.plane(roadW, 520, am, rcx, 0, 200));
    const lm = K.m(P.line, { rough: 0.8 });
    const dashes = new T.Group(); g.add(dashes);
    const dashX = v === 'highway' ? [-1.75, -10.6] : [-1.75];
    for (const x of dashX) for (let i = 0; i < 44; i++) dashes.add(K.plane(0.14, v === 'highway' ? 8 : 3, lm, x, 0.012, -20 + i * 12, { noShadow: true }));
    for (const x of v === 'highway' ? [1.6, -5.1, -7.3, -14.0] : [1.55, -5.05]) g.add(K.plane(0.14, 520, lm, x, 0.012, 200, { noShadow: true }));
    const add = (o, x, z, ry, rel) => { K.at(o, x, 0, z, ry || 0); if (rel) o.userData.rel = rel; out.add(o); items.push(o); if (o.userData.setLamp) lamps.push(o); return o; };
    if (v === 'city') {
      g.add(K.box(2.4, 0.12, 520, K.m('#b3b1aa'), 3.0, 0, 200)); g.add(K.box(2.4, 0.12, 520, K.m('#b3b1aa'), -6.5, 0, 200));
      for (let i = 0; i < 24; i++) { const sx = i % 2 ? 1 : -1; add(K.building(9 + rng() * 5, 6 + rng() * (rng() < 0.3 ? 24 : 10), 9, U.pick(rng, BCOL), c.seed + i), sx > 0 ? 9.2 : -12.6, i * 12.5, PI / 2); }
      for (let i = 0; i < 8; i++) add(K.pole(8.5), 4.4, i * 37.5);
      for (let i = 0; i < 8; i++) add(K.streetLamp(5.5), -7.6, i * 37.5 + 18, 0);
      for (let i = 0; i < 3; i++) { const s = K.signal(); s.userData.set('green'); add(s, 2.2, i * 100 + 60, -PI / 2); }
      for (let i = 0; i < 6; i++) add(K.tree({ kind: 'ginkgo', season: c.season, weather: c.weather, h: 5.5, seed: c.seed + i }), 2.3, i * 50 + 20);
      for (let i = 0; i < 5; i++) { const f = walker(rng, { pose: i % 2 ? 'walk' : 'stand' }); f.position.y = 0.12; add(f, 3.3 + rng() * 0.8, i * 60 + 30, rng() < 0.5 ? 0 : PI); }
    } else if (v === 'highway') {
      for (let i = 0; i < 50; i++) { const gr2 = K.guardrail(6); add(gr2, 2.6, i * 6, PI / 2); }
      for (let i = 0; i < 50; i++) add(K.box(0.25, 0.9, 6, K.m('#c9ccc9')), -6.2, i * 6);
      for (let i = 0; i < 3; i++) { const gan = new T.Group(); gan.add(K.cyl(0.12, 7, K.m(P.steelDark), 3.2, 0, 0)); gan.add(K.cyl(0.12, 7, K.m(P.steelDark), -5.6, 0, 0)); gan.add(K.box(9.2, 0.25, 0.25, K.m(P.steelDark), -1.2, 6.8, 0)); gan.add(K.box(3.6, 1.7, 0.1, K.m('#2f6a4f'), -0.3, 5.0, -0.1)); gan.add(K.box(2.6, 0.12, 0.02, K.m(P.white), -0.3, 6.0, -0.16, { noShadow: true })); gan.add(K.box(1.8, 0.12, 0.02, K.m(P.white), -0.6, 5.5, -0.16, { noShadow: true })); add(gan, 0, i * 100 + 40); }
      for (let i = 0; i < 10; i++) add(K.streetLamp(9), -6.2, i * 30 + 10, 0);
      for (let i = 0; i < 16; i++) { const sx = i % 2 ? 1 : -1; add(rng() < 0.5 ? K.tree({ kind: 'conifer', season: c.season, weather: c.weather, h: 7 + rng() * 4, seed: c.seed + i }) : K.house({ w: 8, d: 7, h: 3, rh: 1.6, snow: sp.snowy, wall: P.wallWarm }), sx > 0 ? 12 + rng() * 22 : -22 - rng() * 26, i * 18.5, rng()); }
    } else if (v === 'mountain') {
      for (let i = 0; i < 50; i++) add(K.guardrail(6), 2.2, i * 6, PI / 2);
      for (let i = 0; i < 46; i++) { const sx = i % 3 ? -1 : 1; add(K.tree({ kind: rng() < 0.6 ? 'conifer' : 'broad', season: c.season, weather: c.weather, h: 7 + rng() * 6, seed: c.seed + i }), sx > 0 ? 6 + rng() * 14 : -7 - rng() * 12, i * 6.5 + rng() * 3); }
      for (let i = 0; i < 12; i++) { const rk = K.rock(2.4 + rng() * 2, '#7d7d76', 50 + i); rk.scale.y = 1.6; add(rk, -7.5 - rng() * 2, i * 25 + rng() * 8); }
      g.add(K.ridge({ r: 150, hMin: 20, hMax: 55, color: sp.hill, seed: c.seed + 7, n: 30 }));
    } else {
      for (let i = 0; i < 8; i++) add(K.pole(8), 3.2, i * 37.5);
      for (let i = 0; i < 14; i++) { const sx = i % 2 ? 1 : -1; add(K.house({ w: 7 + rng() * 3, d: 6, h: 3 + (rng() < 0.4 ? 2.6 : 0), rh: 1.5, wall: U.pick(rng, [P.wallWarm, P.wallCool, P.offwhite]), roof: U.pick(rng, [P.roof, P.roofRed]), snow: sp.snowy }), sx > 0 ? 12 + rng() * 16 : -16 - rng() * 18, i * 21 + rng() * 6, rng() < 0.5 ? PI / 2 : 0); }
      for (let i = 0; i < 18; i++) { const sx = i % 2 ? 1 : -1; add(K.tree({ kind: U.pick(rng, ['broad', 'sakura', 'conifer', 'ginkgo']), season: c.season, weather: c.weather, h: 4.5 + rng() * 4, seed: c.seed + 60 + i }), sx > 0 ? 6 + rng() * 20 : -9 - rng() * 22, i * 16.5 + rng() * 5); }
      for (let i = 0; i < 6; i++) add(K.guardrail(6), 2.3, i * 50, PI / 2);
    }
    /* ほかの車 */
    const ccol = ['#e6e8ea', '#2f3b55', '#8f9498', '#b03a2e', '#3a3b40', '#d9d2c0'];
    const onc = v === 'highway' ? -12.3 : -3.5, nOn = v === 'mountain' ? 1 : (v === 'highway' ? 4 : 3);
    for (let i = 0; i < nOn; i++) add(K.car(U.pick(rng, ccol), U.pick(rng, [null, 'kei', 'van', 'truck'])), onc - (v === 'highway' && i % 2 ? -3.5 : 0), 60 + i * 95, PI, speed * (v === 'highway' ? 0.95 : 0.8));
    if (v === 'highway' || v === 'city') { add(K.car(U.pick(rng, ccol), v === 'highway' ? 'truck' : null), 0, 34, 0, -speed * 0.985); add(K.car(U.pick(rng, ccol), 'van'), v === 'highway' ? -3.5 : 0, v === 'highway' ? 62 : 70, 0, -speed * 0.94); }
    const tick = treadmill(out, items, SPAN);
    g.add(K.ridge({ r: 330, hMin: 16, hMax: 60, color: sp.hillFar, seed: c.seed + 3, n: 44 }));
    const eyeX = passenger ? 0.36 : dx;
    return {
      group: g, indoor: false, label: passenger ? '車の中' : '車の運転席', shadow: 26, center: [0, 0, 8], rock: 0.1,
      anchors: { sit: { p: [eyeX, 1.2, -0.08], look: [eyeX * 0.6, 1.12, 30], lim: { yaw: 130, up: 40, down: 45 }, body: passenger ? 'sit' : 'car' } },
      body: { car: { sleeve: '#5f6672' }, sit: { sleeve: '#5f6672', legs: '#3d4352' } },
      spots: [[0, 1.3, 0.62], [passenger ? -0.2 : 0.4, 1.05, 1.05], [passenger ? dx : 0.36, 0.75, 0.05], [-1.0, 1.4, 26], [2.6, 1.6, 14], [0.9, 1.1, 0.98]],
      spotNames: ['ミラーのお守り', 'ダッシュボード', passenger ? '運転席' : '助手席', '行く手の道', '道ばたの景色', 'サイドミラー'],
      companion: passenger ? { sit: { p: [dx, 0.02, -0.5], ry: 0, pose: 'sit', seat: 0.33 } } : { sit: { p: [0.36, 0.02, -0.14], ry: 0, pose: 'sit', seat: 0.33 } },
      amb: { engine: v === 'highway' ? 1 : 0.75, pass: v === 'city' ? 0.5 : 0.15 },
      onLight(env) { for (const l of lamps) if (l.userData.setLamp) l.userData.setLamp(Math.max(env.lampOn, wet ? 0.6 : 0)); hl.intensity = env.lampOn * 260; instr.material.emissiveIntensity = 0.12 + env.lampOn * 0.7; },
      update(dt, env) {
        tick(dt, speed);
        dashes.position.z = -((env.time * speed) % 12);
        if (v === 'mountain') { out.rotation.y = Math.sin(env.time * 0.16) * 0.1; out.position.x = Math.sin(env.time * 0.16) * -1.2; wheel.rotation.z = Math.sin(env.time * 0.16) * 0.5; }
        else wheel.rotation.z = Math.sin(env.time * 0.4) * 0.03;
        charm.rotation.z = Math.sin(env.time * 2.1) * 0.12; charm.rotation.x = Math.sin(env.time * 1.3) * 0.08;
        car.position.y = Math.sin(env.time * 9.0) * 0.0015 + Math.sin(env.time * 2.3) * 0.002;
        const wp = wet ? (Math.sin(env.time * (c.weather === 'storm' ? 6 : 3.6)) * 0.5 + 0.5) : 0;
        for (const w of wipers) w.rotation.z = wp * 1.25;
      }
    };
  };
})(window.SI);
