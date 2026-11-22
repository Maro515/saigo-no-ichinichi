'use strict';
/* 最期の一日 — 起動 */
(function (SI) {
  const U = SI.U, K = SI.Kit;

  /* 場所だけを見るための確認用（?stage=washitsu&pos=lie&t=07:30&season=spring&weather=clear） */
  function debugStage(env, rig, q) {
    for (const id of ['title']) U.el(id).hidden = true;
    const c = {
      season: q.get('season') || 'spring', weather: q.get('weather') || 'clear', hour: U.timeToHour(q.get('t') || '10:00'),
      seed: parseInt(q.get('seed') || '1', 10), v: q.get('v') || null, env, cause: q.get('pas') ? { name: '助手席', place: '' } : null
    };
    const st = SI.stages[q.get('stage')](c);
    env.setConditions({ hour: c.hour, season: c.season, weather: c.weather, indoor: !!st.indoor });
    env.setStage(st);
    const pos = q.get('pos') || Object.keys(st.anchors)[0];
    const a = SI.pickAnchor ? SI.pickAnchor(st, pos) : (st.anchors[pos] || st.anchors[Object.keys(st.anchors)[0]]);
    rig.setAnchor(a);
    const bodyOpt = Object.assign({}, (st.body && st.body[a.body]) || {});
    if (/^lie/.test(a.body || '') && SI.bedDepth && a.p && a.look) { const bd = SI.bedDepth(st, a, env); if (bd != null) bodyOpt.bed = bd; SI.debugBed = bd; }
    const myBody = a.body === 'none' ? null : K.body(q.get('body') || a.body, bodyOpt);
    rig.setBody(myBody);
    if (q.get('body') === 'fallen') { rig.fall(); rig.keepBody = true; }
    if (q.get('gest') && myBody && myBody.userData.gesture) setTimeout(() => myBody.userData.gesture(q.get('gest'), { side: q.get('side') || 'both', shake: parseFloat(q.get('shake') || '0') }), 600);   // しぐさの確認用
    rig.rock = st.rock || 0;
    if (q.get('yaw')) rig.tYaw = rig.uYaw = U.deg(parseFloat(q.get('yaw')));
    if (q.get('pitch')) rig.tPitch = rig.uPitch = U.deg(parseFloat(q.get('pitch')));
    const ticks = [];
    if (q.get('with') && st.companion) {
      const cp = st.companion[pos] || st.companion[Object.keys(st.companion)[0]];
      const f = K.figure({ pose: cp.pose, top: '#8c6f5e', bottom: '#3d4352', hair: K.P.hairGray, seat: cp.seat });
      K.at(f, cp.p[0], cp.p[1], cp.p[2], cp.ry); st.group.add(f); ticks.push((t) => f.userData.tick(t));
    }
    if (q.get('visit')) {
      /* 来る人の立ち位置を、まとめて見る（?visit=1）。白は仕事の人（staff）、色つきは見舞いの人（visit） */
      const put = (sp, top) => { if (!sp) return; const f = K.figure({ pose: sp.pose || 'stand', seat: sp.seat, top, bottom: '#4a4f5c', hair: '#2e2a28', hairStyle: 'hair_bun' }); K.at(f, sp.p[0], sp.p[1], sp.p[2], sp.ry || 0); st.group.add(f); ticks.push((t) => f.userData.tick(t)); };
      put(st.staff, '#e8eef0');
      (st.visit || []).forEach((sp, i) => put(sp, ['#a0605a', '#5a7a9a'][i % 2]));
    }
    if (q.get('spots')) {
      for (const s of st.spots) { const l = K.memoryLight(); l.position.fromArray(s); l.userData.baseY = s[1]; st.group.add(l); ticks.push((t, dt) => l.userData.tick(t, dt, l.position.distanceTo(rig.pos))); }
    }
    if (q.get('figs')) {
      /* 人物を目の前に並べて見る（?figs=stand / sit、&dist=2.6） */
      const T = window.THREE, P = K.P, kind = q.get('figs'), dist = parseFloat(q.get('dist') || '2.6');
      const set = kind === 'sit'
        ? [['sit', {}], ['lean', { hairStyle: 'hair_thin', hair: P.hairGray }], ['seiza', { long: 1, top: '#b56a5a', h: 1.56 }], ['sit', { old: 1, hair: P.hairGray, hairStyle: 'hair_bun', h: 1.5 }], ['seiza', {}], ['sit', { child: 1, top: '#d9b44a' }]]
        : [['stand', {}], ['walk', { hairStyle: 'hair_thin', hair: P.hairGray }], ['bow', {}], ['stand', { old: 1, hair: P.hairGray, hairStyle: 'hair_bun', h: 1.5 }], ['stand', { long: 1, top: '#b56a5a', h: 1.56 }], ['stand', { child: 1, top: '#d9b44a' }], ['walk', { hairStyle: 'hair_helmet', hair: '#e6d44a' }]];
      const cp = new T.Vector3(), d = new T.Vector3();
      rig.update(0); env.camera.updateMatrixWorld(true);
      env.camera.getWorldPosition(cp); env.camera.getWorldDirection(d); d.y = 0; d.normalize();
      const r = new T.Vector3(-d.z, 0, d.x), y0 = q.get('gy') ? parseFloat(q.get('gy')) : (a.ground != null ? a.ground : cp.y - 1.5);
      set.forEach((ps, i) => {
        const seat = /sit|lean/.test(ps[0]) ? 0.42 : null;
        const f = K.figure(Object.assign({ pose: ps[0], top: '#8c6f5e', bottom: '#3d4352', seat }, ps[1]));
        const x = (i - (set.length - 1) / 2) * 0.72;
        f.position.copy(cp).addScaledVector(d, dist).addScaledVector(r, x); f.position.y = y0;
        f.lookAt(cp.x + r.x * x * 0.7, y0, cp.z + r.z * x * 0.7);
        if (q.get('turn')) f.rotation.y += U.deg(parseFloat(q.get('turn')));
        st.group.add(f); ticks.push((t) => f.userData.tick(t));
        if (seat) { const b = K.box(0.4, seat, 0.4, K.m('#8a8478'), 0, 0, 0); b.position.copy(f.position); b.rotation.copy(f.rotation); st.group.add(b); }
      });
    }
    if (q.get('bodies')) {
      /* 自分の体（一人称用）を、外から並べて見る */
      const T = window.THREE, cp = new T.Vector3(), d = new T.Vector3();
      rig.update(0); env.camera.updateMatrixWorld(true);
      env.camera.getWorldPosition(cp); env.camera.getWorldDirection(d); d.y = 0; d.normalize();
      const r = new T.Vector3(-d.z, 0, d.x), kinds = q.get('bodies').split(',');
      kinds.forEach((k, i) => {
        const b = K.body(k, { blanket: '#c9c2d6' }), h = new T.Group(); h.add(b);
        if (q.get('gest') && b.userData.gesture) { b.userData.gesture(q.get('gest'), { side: q.get('side') || 'both' }); ticks.push((t, dt) => b.userData.update(dt, t)); }
        const x = (i - (kinds.length - 1) / 2) * 1.5;
        h.position.copy(cp).addScaledVector(d, parseFloat(q.get('dist') || '3')).addScaledVector(r, x); h.position.y = cp.y - 0.4;
        h.rotation.y = Math.atan2(d.x, d.z) + U.deg(parseFloat(q.get('turn') || '90'));
        b.add(K.sph(0.02, K.m('#e8483c'), 0, 0, 0));                // 目の位置
        st.group.add(h);
      });
    }
    if (q.get('fx')) { SI.debugFx = q.get('fx'); }
    if (q.get('top')) topView(env, st, q);
    SI.debugTicks = ticks;
  }

  /* 場所を真上から見て、歩ける範囲を重ねる（?stage=living&top=1、&span=12 &cx=0 &cz=0 &cut=2.05） */
  function topView(env, st, q) {
    const T = window.THREE, w = st.walk || null;
    const nav = SI.Nav ? new SI.Nav(st) : null;
    let bx0 = -5, bz0 = -5, bx1 = 5, bz1 = 5;
    if (w && w.rects && w.rects.length) { bx0 = bz0 = Infinity; bx1 = bz1 = -Infinity; for (const r of w.rects) { bx0 = Math.min(bx0, r[0]); bz0 = Math.min(bz0, r[1]); bx1 = Math.max(bx1, r[2]); bz1 = Math.max(bz1, r[3]); } }
    else { const ps = Object.values(st.anchors).map(a => a.p || a.path[0]); bx0 = Math.min(...ps.map(p => p[0])) - 4; bx1 = Math.max(...ps.map(p => p[0])) + 4; bz0 = Math.min(...ps.map(p => p[2])) - 4; bz1 = Math.max(...ps.map(p => p[2])) + 4; }
    const num = (k, d) => q.get(k) != null ? parseFloat(q.get(k)) : d;
    const cx = num('cx', (bx0 + bx1) / 2), cz = num('cz', (bz0 + bz1) / 2);
    const W = window.innerWidth, H = window.innerHeight, asp = W / H;
    const spanX = num('span', Math.max((bx1 - bx0) + 2, ((bz1 - bz0) + 2) * asp)), spanZ = spanX / asp;
    const y0 = w ? (w.y || 0) : 0;
    const cam = new T.OrthographicCamera(-spanX / 2, spanX / 2, spanZ / 2, -spanZ / 2, 0.01, 300);
    cam.position.set(cx, y0 + num('cut', st.indoor ? 2.05 : 60), cz); cam.rotation.set(-Math.PI / 2, 0, 0); cam.updateProjectionMatrix();
    env.scene.fog.near = 9000; env.scene.fog.far = 9999;
    env.render = () => { env.sky.visible = false; env.renderer.render(env.scene, cam); };
    for (const id of ['hud', 'reticle', 'wash', 'lidTop', 'lidBot']) { const e = U.el(id); if (e) e.style.display = 'none'; }
    const cv = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:50;pointer-events:none';
    document.body.appendChild(cv);
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const X = (x) => (x - cx) / spanX * W + W / 2, Z = (z) => (z - cz) / spanZ * H + H / 2;
    /* マス目（1 m）と目盛り */
    g.font = '11px monospace'; g.textBaseline = 'top';
    for (let x = Math.ceil(cx - spanX / 2); x <= cx + spanX / 2; x++) { g.strokeStyle = x === 0 ? 'rgba(255,80,80,0.9)' : (x % 5 === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.16)'); g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), H); g.stroke(); if (spanX < 26 || x % 5 === 0) { g.fillStyle = '#ffd'; g.fillText(String(x), X(x) + 2, 2); } }
    for (let z = Math.ceil(cz - spanZ / 2); z <= cz + spanZ / 2; z++) { g.strokeStyle = z === 0 ? 'rgba(80,140,255,0.9)' : (z % 5 === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.16)'); g.beginPath(); g.moveTo(0, Z(z)); g.lineTo(W, Z(z)); g.stroke(); if (spanX < 26 || z % 5 === 0) { g.fillStyle = '#ffd'; g.fillText('z' + z, 2, Z(z) + 2); } }
    /* 歩けるマス */
    if (nav && nav.ok) {
      const c = nav.cell, pw = Math.max(1.5, c / spanX * W * 0.55);
      g.fillStyle = 'rgba(70,255,120,0.75)';
      for (let iz = 0; iz < nav.nz; iz++) for (let ix = 0; ix < nav.nx; ix++) if (nav.grid[iz * nav.nx + ix]) g.fillRect(X(nav.x0 + (ix + 0.5) * c) - pw / 2, Z(nav.z0 + (iz + 0.5) * c) - pw / 2, pw, pw);
      g.strokeStyle = 'rgba(70,255,120,0.9)'; g.lineWidth = 1.5;
      for (const r of w.rects) g.strokeRect(X(r[0]), Z(r[1]), X(r[2]) - X(r[0]), Z(r[3]) - Z(r[1]));
      g.strokeStyle = 'rgba(255,90,90,0.9)';
      for (const r of (w.holes || [])) g.strokeRect(X(r[0]), Z(r[1]), X(r[2]) - X(r[0]), Z(r[3]) - Z(r[1]));
    }
    const mark = (x, z, col, label) => { g.fillStyle = col; g.beginPath(); g.arc(X(x), Z(z), 5, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke(); g.font = '12px sans-serif'; g.lineWidth = 3; g.strokeText(label, X(x) + 7, Z(z) - 7); g.fillStyle = '#fff'; g.fillText(label, X(x) + 7, Z(z) - 7); };
    for (const k in st.anchors) { const a = st.anchors[k], p = a.p || a.path[0], l = a.look || a.path[1]; mark(p[0], p[2], '#4af', '視点:' + k); g.strokeStyle = '#4af'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(p[0]), Z(p[2])); const d = Math.hypot(l[0] - p[0], l[2] - p[2]) || 1; g.lineTo(X(p[0] + (l[0] - p[0]) / d * 0.6), Z(p[2] + (l[2] - p[2]) / d * 0.6)); g.stroke(); }
    (st.spots || []).forEach((s, i) => mark(s[0], s[2], '#fc3', (i + 1) + ((st.spotNames || [])[i] ? ' ' + st.spotNames[i] : '')));
    for (const k in (st.companion || {})) { const c = st.companion[k]; mark(c.p[0], c.p[2], '#f6a', '連れ:' + k); }
    (st.folk || []).forEach((f) => { const p = new T.Vector3(); f.f.getWorldPosition(p); mark(p.x, p.z, '#f55', '人:' + f.role); });
    (st.meet || []).forEach((m, i) => mark(m.p[0], m.p[2], '#c7f', '来る人' + (i + 1)));
    if (st.staff) mark(st.staff.p[0], st.staff.p[2], '#c7f', '職員');
    if (w && w.start) mark(w.start[0], w.start[1], '#fff', '立つ');
    document.title = 'top ' + (nav && nav.ok ? nav.count() : 0);
  }

  /* 試験用（?selftest=ends&from=0&n=540）: 最期の場面を、待ち時間なしで端から通す。つまずいた件を画面とコンソールに出す */
  async function selfTest(app, q) {
    const L = SI.Life, all = app.data.causes, from = parseInt(q.get('from') || '0', 10), n = parseInt(q.get('n') || String(all.length), 10);
    const out = document.createElement('pre');
    out.id = 'selftest'; out.style.cssText = 'position:fixed;inset:0;z-index:99;margin:0;padding:24px;overflow:auto;background:#111;color:#ddd;font:14px/1.6 monospace;white-space:pre-wrap';
    document.body.appendChild(out);
    U.speed = 100000; app.pace = 0.00001; app.fast = 1000; app.ui.readSpeed = 1000; app.ui.setAuto(true);
    if (app.token) app.token.cancel();
    U.el('title').hidden = true; app.state = 'play';
    const fail = [], modes = {}, logs = []; let ok = 0, floats = 0;
    const drama = q.get('selftest') === 'drama', dstat = { scene: 0, talk: 0, amb: 0, mem: 0, lapse: 0, cut: 0, walkIn: 0, sit: 0, rise: 0, walk: 0, act: 0, blow: 0, out: 0, come: 0, hold: 0, put: 0, crouch: 0 };
    const whole = q.get('selftest') === 'day', stat = { talk: 0, mem: 0, rise: 0, sit: 0, guest: 0, skip: 0, enter: 0, beat: 0, walk: 0, bed: 0, note: 0, kin: 0, care: 0, aside: 0, amb: 0, away: 0, phone: 0, fill: 0, world: 0, hours: 0, bedHours: 0, bedEv: 0 };
    const realFloat = app.ui.float.bind(app.ui); app.ui.float = (...a) => { floats++; realFloat(a[0], a[1], a[2], a[3], 30); };
    const t0 = performance.now();
    for (let i = from; i < Math.min(all.length, from + n); i++) {
      const c = all[i], tk = app.token = new U.Token();
      try {
        app.cause = c; app.r = U.rng(U.hash(c.id)); app.life = L.make(c, app.r);
        app.seenMems = app.data.memories.slice(0, 3); app.sceneSeed = U.hash(c.id) % 100000;
        app.fx.reset(); app.clearObjs(); app.ui.clearPlay();
        app.compLook = null;
        const d = new SI.Dying(app, c, app.life, tk);
        modes[d.mode] = (modes[d.mode] || 0) + 1;
        if (whole) {
          /* 朝から最期の時刻までを、時計を早回しにして通す。そのあいだ、話す・思い出す・立つ・座るを手あたりしだいに試す */
          app.seenMems = [];
          const mems = L.pickMemories(app.life, app.data.memories, app.r, []);
          const day = app.day = new SI.Day(app, c, app.life, mems, d, tk);
          day.stat = stat;
          await day.run();
          if (day.m < day.tEnd - 0.5) throw new Error('時刻が最期まで進んでいない ' + day.m + ' / ' + day.tEnd);
        } else if (drama) {
          /* ドラマで見る運びを、待ち時間なしで通す */
          app.seenMems = [];
          const mems = L.pickMemories(app.life, app.data.memories, app.r, []);
          const dr = app.drama = new SI.Drama(app, c, app.life, mems, d, tk);
          await dr.run();
        } else await app.enterScene(d.scene(), tk, false, c.place);
        app.update(0.05); app.rig.update(0.05); app.env.update(0.05, app.rig.root.position);
        await d.run('ためしの一言。');
        app.update(0.05); app.rig.update(0.05); app.env.update(0.05, app.rig.root.position);
        if (app.day && app.day.evlog) logs.push(c.id, ...app.day.evlog);
        if (app.drama) for (const k in dstat) dstat[k] += app.drama.stat[k] || 0;      // 最期の場面のぶん（迫るもの）も数える
        if (app.drama) { app.drama.stop(); app.drama = null; app.ui.cinema(false); }
        if (app.day) { app.day.stop(); app.day = null; }
        if (app.rig.free) throw new Error('最期のあとも、歩ける状態のまま');
        ok++;
      } catch (e) { fail.push(c.id + ' ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); if (window.console) console.error('selftest ' + c.id, e); if (app.day) { app.day.stop(); app.day = null; } if (app.drama) { app.drama.stop(); app.drama = null; app.ui.cinema(false); } }
      if (i % 10 === 0) { out.textContent = `${whole ? '一日の通し試験' : (drama ? 'ドラマの通し試験' : '最期の場面の通し試験')} ${i - from + 1} / ${Math.min(n, all.length - from)} …`; await U.wait(0); }
    }
    out.textContent = `${whole ? '一日の通し試験' : (drama ? 'ドラマの通し試験' : '最期の場面の通し試験')} 完了\n件数 ${ok + fail.length}（成功 ${ok} / 失敗 ${fail.length}）\n運び方 ${JSON.stringify(modes)}\n出した短い言葉 ${floats}\n${whole ? '一日のあいだにしたこと ' + JSON.stringify(stat, (k, v) => typeof v === 'number' ? Math.round(v * 10) / 10 : v).replace(/,/g, ', ') + '\n寝たきりの時間の出来事（1 時間あたり、合間の出来事を除く） ' + (stat.bedEv / Math.max(1, stat.bedHours)).toFixed(2) + '\n' : ''}${drama ? 'ドラマの中身 ' + JSON.stringify(dstat).replace(/,/g, ', ') + '\n' : ''}時間 ${((performance.now() - t0) / 1000).toFixed(1)} 秒\n\n` + fail.join('\n') + (logs.length ? '\n' + logs.join('\n') : '');
    document.title = `selftest ${ok}/${ok + fail.length}`;
  }

  function boot() {
    const q = new URLSearchParams(location.search);
    let data = { causes: [], memories: [], last: [] };
    try { data = JSON.parse(U.el('si-data').textContent); } catch (e) { /* データなしでも画面は出す */ }
    SI.data = data;
    const canvas = U.el('gl');
    let env;
    try { env = new SI.Env(canvas); }
    catch (e) {
      const er = U.el('titleError');
      er.textContent = 'この端末では 3D を表示できませんでした。別のブラウザで開いてください。'; er.hidden = false;
      U.el('btnStart').disabled = true;
      return;
    }
    const rig = new SI.Rig(env, canvas);
    SI.env = env; SI.rig = rig;
    if (q.get('q')) env.setQuality(q.get('q'));

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
      if (SI.app) SI.app.update(dt);
      rig.update(dt);
      if (SI.debugTicks) for (const f of SI.debugTicks) f(env.time, dt);
      env.update(dt, rig.root.position);
      if (!(SI.app && SI.app.state === 'epitaph')) env.render(dt);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    /* 人物と木のモデルを読み終えてから始める（読めなくても、手組みの形で動く） */
    const go = () => {
      if (q.get('stage') && SI.stages[q.get('stage')]) debugStage(env, rig, q);
      else if (SI.App) {
        SI.app = new SI.App(env, rig, data, q);
        if (q.get('show')) setTimeout(() => SI.app.debugShow(q.get('show')), 500);
        if (q.get('selftest')) setTimeout(() => selfTest(SI.app, q), 800);
      }
    };
    if (SI.Assets && !q.get('noassets')) SI.Assets.load().then(go, go); else go();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.SI);
