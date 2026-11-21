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
    SI.debugTicks = ticks;
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
    const fail = [], modes = {}; let ok = 0, floats = 0;
    const realFloat = app.ui.float.bind(app.ui); app.ui.float = (...a) => { floats++; realFloat(a[0], a[1], a[2], a[3], 30); };
    const t0 = performance.now();
    for (let i = from; i < Math.min(all.length, from + n); i++) {
      const c = all[i], tk = app.token = new U.Token();
      try {
        app.cause = c; app.r = U.rng(U.hash(c.id)); app.life = L.make(c, app.r);
        app.seenMems = app.data.memories.slice(0, 3); app.sceneSeed = U.hash(c.id) % 100000;
        app.fx.reset(); app.clearObjs(); app.ui.clearPlay();
        const d = new SI.Dying(app, c, app.life, tk);
        modes[d.mode] = (modes[d.mode] || 0) + 1;
        await app.enterScene(d.scene(), tk, false, c.place);
        app.update(0.05); app.rig.update(0.05); app.env.update(0.05, app.rig.root.position);
        await d.run('ためしの一言。');
        app.update(0.05); app.rig.update(0.05); app.env.update(0.05, app.rig.root.position);
        ok++;
      } catch (e) { fail.push(c.id + ' ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); if (window.console) console.error('selftest ' + c.id, e); }
      if (i % 10 === 0) { out.textContent = `最期の場面の通し試験 ${i - from + 1} / ${Math.min(n, all.length - from)} …`; await U.wait(0); }
    }
    out.textContent = `最期の場面の通し試験 完了\n件数 ${ok + fail.length}（成功 ${ok} / 失敗 ${fail.length}）\n運び方 ${JSON.stringify(modes)}\n出した短い言葉 ${floats}\n時間 ${((performance.now() - t0) / 1000).toFixed(1)} 秒\n\n` + fail.join('\n');
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
