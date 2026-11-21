'use strict';
/* 最期の一日 — Blender で作ったモデル（人物・木）を読み込み、部品を差し替える。
   読み込めなかったときは、22_kit.js / 23_kit_out.js の手組みの形のまま動く。 */
(function (SI) {
  const T = window.THREE, U = SI.U, K = SI.Kit, P = K.P;
  const A = SI.Assets = { ready: false, human: null, trees: {} };

  A.load = function () {
    return new Promise((resolve) => {
      const el = document.getElementById('si-assets');
      const b64 = el ? el.textContent.trim() : '';
      if (!b64 || !T.GLTFLoader || !T.SkeletonUtils) return resolve(false);
      try {
        const bin = atob(b64), buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        new T.GLTFLoader().parse(buf.buffer, '', (gltf) => {
          try { setup(gltf.scene); A.ready = !!A.human && checkHuman(); } catch (e) { A.ready = false; }
          resolve(A.ready);
        }, () => resolve(false));
      } catch (e) { resolve(false); }
    });
  };

  function setup(scene) {
    scene.updateMatrixWorld(true);
    scene.traverse(o => { if (o.geometry) o.geometry.userData.shared = true; });
    /* 人物: 骨（rig）と、その骨で動くメッシュ */
    let rig = null;
    scene.traverse(o => { if (!rig && o.isBone && o.name === 'hips') rig = o; });
    if (rig) {
      let top = rig;
      while (top.parent && top.parent !== scene) top = top.parent;
      A.human = top;
    }
    /* 木: tree_種類_番号 */
    for (const o of scene.children.slice()) {
      const m = /^tree_([a-z]+)_(\d)$/.exec(o.name);
      if (m) (A.trees[m[1]] = A.trees[m[1]] || []).push(o);
    }
    if (A.human) { A.human.parent.remove(A.human); }
  }

  /* 人物に、必要な骨がそろっているかを確かめる（欠けていたら、手組みの形を使う） */
  const DIGITS = ['index', 'middle', 'ring', 'little', 'thumb'];
  const NEED = ['hips', 'spine', 'chest', 'neck', 'head'].concat(...['L', 'R'].map(s => ['upperarm', 'forearm', 'hand', 'thigh', 'shin', 'foot'].concat(...DIGITS.map(d => [d + '1', d + '2', d + '3'])).map(n => n + s)));
  function checkHuman() {
    const have = {}; let skinned = 0;
    A.human.traverse(o => { if (o.isBone) have[o.name] = true; if (o.isSkinnedMesh) skinned++; });
    return skinned > 0 && NEED.every(n => have[n]);
  }

  /* 骨を、休めの姿勢からの回転で動かすための取っ手。rotation.x などに代入できる */
  function joint(bone) {
    const rest = bone.quaternion.clone(), e = new T.Euler(), q = new T.Quaternion();
    const j = { bone, rotation: {} };
    const apply = () => { q.setFromEuler(e); bone.quaternion.copy(rest).multiply(q); };
    for (const ax of ['x', 'y', 'z']) Object.defineProperty(j.rotation, ax, { get: () => e[ax], set: (val) => { e[ax] = val; apply(); } });
    j.rotation.set = (x, y, z) => { e.set(x, y, z); apply(); };
    return j;
  }

  /* ---------- 人物 ---------- */
  const procFigure = K.figure;
  K.figure = function (o) {
    if (!A.ready) return procFigure(o);
    try { return modelFigure(o || {}); }
    catch (e) { A.ready = false; return procFigure(o); }        // 途中でつまずいたら、以後は手組みの形にする
  };
  function modelFigure(o) {
    const s = (o.h || 1.6) / 1.6, pose = o.pose || 'stand', child = !!o.child;
    const root = new T.Group();
    const model = T.SkeletonUtils.clone(A.human);
    root.add(model);
    const cols = { skin: o.skin || P.skin, top: o.top || P.beige, bottom: o.bottom || P.navy, shoe: o.shoe || P.dark, hair: o.hair || P.hair };
    cols.nail = K.mixc(cols.skin, '#f7e6de', 0.5);
    const style = o.hairStyle || (o.long ? 'hair_long' : 'hair_short');
    const bones = {}, hairs = [], drop = [];
    model.traverse(m => {
      if (m.isBone) bones[m.name] = m;
      if (m.isMesh) {
        const n = m.material && m.material.name;
        m.material = K.m(cols[n] || P.beige, { rough: n === 'skin' ? 0.8 : (n === 'nail' ? 0.45 : (n === 'hair' ? 0.95 : 0.92)) });
        m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
        let hn = null, q = m;
        while (q && q !== model) { if (/^hair_/.test(q.name)) { hn = q.name; break; } q = q.parent; }
        if (hn) { if ((hn.replace(/_\d+$/, '') === style) && !o.noHair) hairs.push(m); else drop.push(m); }
      }
    });
    for (const m of drop) m.parent.remove(m);                      // 使わない髪型は外す
    /* 同じ骨組みを使うメッシュは、骨の計算を 1 つにまとめる（複製すると、メッシュごとに別々になる） */
    let sk0 = null;
    model.traverse(m => {
      if (!m.isSkinnedMesh) return;
      if (!sk0) { sk0 = m.skeleton; return; }
      const sk = m.skeleton;
      if (sk !== sk0 && sk.bones.length === sk0.bones.length && sk.bones.every((b, i) => b === sk0.bones[i]) && sk.boneInverses.every((mt, i) => mt.equals(sk0.boneInverses[i]))) m.skeleton = sk0;
    });
    const J = (n) => joint(bones[n]);
    const hips = bones.hips, hipRest = hips.position.clone();
    const spine = J('spine'), chest = J('chest'), neck = J('neck'), head = J('head');
    /* 旧来の名前: aL・lL は −X 側（Blender の R）、aR・lR は +X 側 */
    /* 指は 1 本ずつ、つけ根・第二関節・第一関節の 3 つの骨で曲がる（X の負の回転が「握る」） */
    const digits = (S) => ({ f: DIGITS.slice(0, 4).map(d => [1, 2, 3].map(k => J(d + k + S))), t: [1, 2, 3].map(k => J('thumb' + k + S)) });
    const aL = { sh: J('upperarmR'), el: J('forearmR'), hand: J('handR'), fin: digits('R') }, aR = { sh: J('upperarmL'), el: J('forearmL'), hand: J('handL'), fin: digits('L') };
    /* 指を手のひらの側へ曲げる。0 でまっすぐ、0.3 で力を抜いた手、1.2 で握る。小指ほど深く曲がる */
    const FM = [0.84, 1.0, 1.1, 1.22], FS = [0.07, 0.0, -0.045, -0.1];
    const curl = (arm, v) => {
      const open = Math.max(0, 1 - v * 0.9), sg = arm === aR ? -1 : 1;     // ひらいた手では、指のあいだが少しあく
      arm.fin.f.forEach((js, i) => {
        const m = FM[i];
        js[0].rotation.x = -Math.min(1.5, v * 0.85 * m); js[1].rotation.x = -Math.min(1.75, v * 1.15 * m); js[2].rotation.x = -Math.min(1.2, v * 0.7 * m);
        js[0].rotation.z = sg * FS[i] * open;
      });
      arm.fin.t[0].rotation.x = -0.14 * v; arm.fin.t[1].rotation.x = -Math.min(0.9, 0.5 * v); arm.fin.t[2].rotation.x = -Math.min(1.0, 0.5 * v);
    };
    curl(aL, 0.32); curl(aR, 0.32);
    const lL = { hp: J('thighR'), kn: J('shinR'), ft: J('footR') }, lR = { hp: J('thighL'), kn: J('shinL'), ft: J('footL') };
    const hipY = (y) => { hips.position.copy(hipRest); hips.position.y += (y - 0.9); };
    /* 腕を体に寄せる（+ で内へ）。左右で向きが逆になる */
    const adduct = (arm, v) => { arm.sh.rotation.z = (arm === aL ? -v : v); };
    adduct(aL, 0.1); adduct(aR, 0.1);
    aL.el.rotation.x = -0.12; aR.el.rotation.x = -0.12;
    if (o.old) { spine.rotation.x = 0.2; head.rotation.x = -0.14; }
    if (pose === 'sit' || pose === 'lean') {
      hipY(o.seat != null ? o.seat + 0.085 : 0.53);
      for (const L of [lL, lR]) { L.hp.rotation.x = -Math.PI / 2 + 0.06; L.kn.rotation.x = Math.PI / 2 - 0.02; }
      for (const a of [aL, aR]) { a.sh.rotation.x = -0.3; a.el.rotation.x = -1.05; adduct(a, 0.14); a.el.rotation.y = (a === aL ? 1 : -1) * 0.8; a.hand.rotation.y = (a === aL ? 1 : -1) * 0.35; a.hand.rotation.x = 0.12; }   // 手のひらを下にして、ももの上に
      spine.rotation.x = o.old ? 0.26 : 0.08;
      if (pose === 'lean') {
        spine.rotation.x = 0.4; head.rotation.x = -0.12;
        aR.sh.rotation.x = -1.15; aR.el.rotation.x = -0.32; adduct(aR, 0.2); aR.hand.rotation.set(0, 0, 0);
      }
    } else if (pose === 'seiza') {
      hipY(0.27);
      for (const L of [lL, lR]) { L.hp.rotation.x = -Math.PI / 2 + 0.12; L.kn.rotation.x = Math.PI * 0.84; L.ft.rotation.x = 0.7; }
      for (const a of [aL, aR]) { a.sh.rotation.x = -0.3; a.el.rotation.x = -0.92; adduct(a, 0.14); a.el.rotation.y = (a === aL ? 1 : -1) * 0.8; a.hand.rotation.y = (a === aL ? 1 : -1) * 0.35; a.hand.rotation.x = 0.12; }
      spine.rotation.x = 0.14;
    } else if (pose === 'walk') {
      lL.hp.rotation.x = -0.35; lL.kn.rotation.x = 0.25; lR.hp.rotation.x = 0.3; lR.kn.rotation.x = 0.35;
      aL.sh.rotation.x = 0.35; aR.sh.rotation.x = -0.35; aL.el.rotation.x = -0.3; aR.el.rotation.x = -0.3;
    } else if (pose === 'bow') {
      spine.rotation.x = 0.4; head.rotation.x = 0.08;
    }
    if (child) bones.head.scale.setScalar(1.2);
    root.scale.setScalar(s * (child ? 0.66 : 1));
    root.userData.parts = { hips, hipY, spine, chest, neck, head, aL, aR, lL, lR, adduct, curl, bones, hairs, model };
    const ph = Math.random() * 6;
    const base = { sx: spine.rotation.x, hx: head.rotation.x, ar: aR.el.rotation.x };
    /* そばの人の反応。lean 身を乗り出す / hy・hp 顔を向ける / att こちらを見つめる / sob 肩がふるえる / reach 手をのばす */
    const R = { lean: 0, leanT: 0, hy: 0, hyT: 0, hp: 0, hpT: 0, att: 0, attT: 0, sob: 0, sobT: 0, reach: null, move: null };
    root.userData.react = (r) => {
      for (const k of ['lean', 'hy', 'hp', 'att', 'sob']) if (r[k] != null) R[k + 'T'] = r[k];
      if ('reach' in r) R.reach = r.reach;
      if (r.move) R.move = r.move.clone();                          // そばへ寄る（床の上の位置）
    };
    root.userData.pose = pose;
    const down = new T.Vector3(), rdir = new T.Vector3(), sp = new T.Vector3();
    root.userData.tick = (t, dt) => {
      dt = dt == null ? 0.016 : Math.min(0.1, dt);
      for (const k of ['lean', 'hp', 'att', 'sob']) R[k] = U.damp(R[k], R[k + 'T'], 1.3, dt);
      R.hy = U.damp(R.hy, R.hyT, 2.4, dt);
      if (R.move) { root.position.x = U.damp(root.position.x, R.move.x, 1.5, dt); root.position.z = U.damp(root.position.z, R.move.z, 1.5, dt); }
      const idle = 1 - R.att;
      spine.rotation.x = base.sx + R.lean + Math.sin(t * 0.9 + ph) * 0.012 + Math.sin(t * 8.5 + ph) * 0.012 * R.sob;
      head.rotation.set(base.hx + R.hp + Math.sin(t * 0.31 + ph * 2) * 0.03 * idle, Math.sin(t * 0.23 + ph) * 0.1 * idle + (root.userData.lookY || 0) + R.hy, 0);
      if (pose === 'lean' && !R.reach) aR.el.rotation.x = base.ar + Math.sin(t * 0.7 + ph) * 0.05;
      if (R.reach) {
        const tg = typeof R.reach.target === 'function' ? R.reach.target() : R.reach.target;
        if (tg) {
          const side = R.reach.side || 'L';
          sp.setFromMatrixPosition(bones['upperarm' + side].matrixWorld);
          rdir.copy(tg).sub(sp); rdir.y *= 0.3; rdir.normalize();
          down.set(side === 'L' ? 0.3 : -0.3, -1, 0).applyQuaternion(root.quaternion);
          armIK(root, root.userData.parts, side, tg, down, { dir: rdir, palm: new T.Vector3(0, -1, 0) });
          curl(side === 'L' ? aR : aL, 0.5);
        }
      }
    };
    return root;
  }

  /* ---------- 自分の体（一人称）。原点は目。前は −Z ---------- */
  const V3 = () => new T.Vector3();
  const wpos = (b) => V3().setFromMatrixPosition(b.matrixWorld);

  /* 手首を目標の位置へ運ぶ（肩とひじの 2 つの関節で解く）。pole はひじを出す向き */
  function armIK(fig, pr, side, target, pole, hand) {
    const B = pr.bones, up = B['upperarm' + side], fo = B['forearm' + side], ha = B['hand' + side];
    fig.updateMatrixWorld(true);
    const S = wpos(up), L1 = S.distanceTo(wpos(fo)), L2 = wpos(fo).distanceTo(wpos(ha));
    const to = target.clone().sub(S), d = U.clamp(to.length(), Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.004), dir = to.normalize();
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const perp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
    const E = S.clone().addScaledVector(dir, a).addScaledVector(perp, h), W = S.clone().addScaledVector(dir, d);
    const Yu = E.clone().sub(S).normalize(), Yf = W.clone().sub(E).normalize();
    const Zu = Yf.clone().addScaledVector(Yu, -Yf.dot(Yu)).normalize().negate(), Xu = V3().crossVectors(Yu, Zu);
    const Qu = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(Xu, Yu, Zu));
    const Qf = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(Xu, Yf, V3().crossVectors(Xu, Yf).normalize()));
    const pq = new T.Quaternion(); up.parent.getWorldQuaternion(pq);
    up.quaternion.copy(pq.invert().multiply(Qu));
    fo.quaternion.copy(Qu.clone().invert().multiply(Qf));
    if (hand && hand.dir) {
      /* 手の向き: 指先の向き dir と、手のひらの向く先 palm を決めて、その通りに置く */
      const Yh = hand.dir.clone().normalize();
      const Np = hand.palm.clone().addScaledVector(Yh, -hand.palm.dot(Yh)).normalize();
      const Xh = Np.multiplyScalar(side === 'L' ? -1 : 1), Zh = V3().crossVectors(Xh, Yh).normalize();
      const Qh = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(Xh, Yh, Zh));
      /* 手首だけをひねると不自然なので、ひねりの 7 割は前腕が受け持つ（前腕の 2 本の骨が交わる動き） */
      const xp = Xh.clone().addScaledVector(Yf, -Xh.dot(Yf));
      if (xp.lengthSq() > 1e-6) {
        xp.normalize();
        const tw = Math.atan2(V3().crossVectors(Xu, xp).dot(Yf), Xu.dot(xp));
        Qf.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), tw * 0.7));
        fo.quaternion.copy(Qu.clone().invert().multiply(Qf));
      }
      ha.quaternion.copy(Qf.clone().invert().multiply(Qh));
    }
    return E;
  }

  /* 体にかかる掛けもの。体の高さをなぞり、布の張りぐあいをならして形にする */
  function drape(color, segs, z0, z1, y0) {
    const w = 1.16, nx = 28, nz = 44, len = z0 - z1, dx = w / nx, dz = len / nz;
    const N = (nx + 1) * (nz + 1), H = new Float32Array(N), id = (i, k) => k * (nx + 1) + i;
    const topAt = (x, z) => {
      let top = y0;
      for (const sg of segs) {
        const A = sg[0], Bp = sg[1], r = sg[2], sx = sg[3] || 1;
        const ux = Bp.x - A.x, uz = Bp.z - A.z, t = U.clamp(((x - A.x) * ux + (z - A.z) * uz) / Math.max(1e-6, ux * ux + uz * uz), 0, 1);
        const ex = (x - (A.x + ux * t)) * sx, ez = z - (A.z + uz * t), d2 = ex * ex + ez * ez;
        if (d2 < r * r) top = Math.max(top, A.y + (Bp.y - A.y) * t + Math.sqrt(r * r - d2));
      }
      return top;
    };
    for (let k = 0; k <= nz; k++) for (let i = 0; i <= nx; i++) H[id(i, k)] = topAt(-w / 2 + i * dx, z0 - k * dz);
    const sag = 0.0032;
    for (let it = 0; it < 140; it++) {
      for (let kk = 0; kk <= nz; kk++) for (let ii = 1; ii < nx; ii++) {
        const k = (it & 1) ? nz - kk : kk, i = (it & 1) ? nx - ii : ii;
        if (k === nz) continue;                                     // 足もとの端は寝床につく
        const up = H[id(i, k === 0 ? 1 : k - 1)], dn = H[id(i, k + 1)];
        const v = (H[id(i - 1, k)] + H[id(i + 1, k)] + up + dn) / 4 - sag;
        if (v > H[id(i, k)]) H[id(i, k)] = v;
      }
    }
    const mat = K.m(color, { rough: 0.95, double: true });
    const g = new T.PlaneGeometry(w, len, nx, nz);
    const p = g.attributes.position;
    for (let k = 0; k <= nz; k++) for (let i = 0; i <= nx; i++) {
      const x = -w / 2 + i * dx, z = z0 - k * dz, n = id(i, k);
      const lift = Math.min(1, (H[n] - y0) / 0.05);
      const wr = (Math.sin(x * 31 + z * 7) + Math.sin(z * 23 - x * 11)) * 0.002 * lift;
      p.setXYZ(n, x, H[n] + 0.014 + wr, z);
    }
    g.computeVertexNormals();
    const grp = new T.Group(), m = new T.Mesh(g, mat);
    m.receiveShadow = true; grp.add(m);
    /* 胸もとの折り返し。ふちを丸く返し、体をつらぬいて寝床まで下ろす（布の下が見えないようにふさぐ） */
    const rows = [[0, 0.014], [0.02, 0.012], [0.034, -0.004], [0.04, -0.03], [0.05, -0.4]], fg = new T.PlaneGeometry(w, 1, nx, rows.length - 1), fp = fg.attributes.position;
    rows.forEach((rw, r) => {
      for (let i = 0; i <= nx; i++) {
        const x = -w / 2 + i * dx, h = H[id(i, 0)];
        fp.setXYZ(r * (nx + 1) + i, x, Math.max(y0 - 0.03, r === rows.length - 1 ? y0 - 0.03 : h + rw[1]), z0 + rw[0]);
      }
    });
    fg.computeVertexNormals();
    const fm = new T.Mesh(fg, mat); fm.receiveShadow = true; grp.add(fm);
    return grp;
  }

  /* 目から寝床の面までの深さを、場面の形から測る（足もとの側へ少し進んだ所で、真下を調べる） */
  SI.bedDepth = function (st, a, env) {
    try {
      const p = new T.Vector3().fromArray(a.p), l = new T.Vector3().fromArray(a.look).sub(p); l.y = 0; l.normalize();
      st.group.updateMatrixWorld(true);
      const rc = new T.Raycaster(p.clone().addScaledVector(l, 0.9).add(new T.Vector3(0, 0.25, 0)), new T.Vector3(0, -1, 0), 0, 1.6);
      if (env) rc.camera = env.camera;
      const hit = rc.intersectObject(st.group, true).find(h => h.object.isMesh && h.object.visible && !h.object.isSkinnedMesh);
      return hit ? hit.distance - 0.25 : null;
    } catch (e) { return null; }
  };

  const procBody = K.body;
  K.body = function (kind, o) {
    if (!A.ready) return procBody(kind, o);
    try { return modelBody(kind, o || {}); }
    catch (e) { return procBody(kind, o); }
  };
  function modelBody(kind, o) {
    const g = new T.Group();
    const bare = kind === 'bath', fallen = kind === 'fallen';
    const skin = o.skin || P.skin;
    const lying = (kind === 'lie' || kind === 'lieUp');
    const fig = K.figure({ pose: 'stand', skin, top: bare ? skin : (o.sleeve || P.blanket), bottom: bare ? skin : (o.legs || P.navy), shoe: (bare || lying) ? skin : (o.shoe || P.dark), noHair: true });
    const pr = fig.userData.parts, B = pr.bones;
    g.add(fig);
    const eyeUp = 0.105, eyeFwd = 0.1;
    const bed = o.bed != null ? U.clamp(o.bed, 0.2, 0.75) : (kind === 'lieUp' ? 0.5 : 0.34);   // 目から寝床の面まで
    if (lying) {
      /* あおむけ: 体の上（+Y）を奥（+Z）へ、正面（+Z）を上（+Y）へ */
      fig.quaternion.set(0, Math.SQRT1_2, Math.SQRT1_2, 0);
      if (kind === 'lieUp') {
        /* 背を起こした寝姿。腰が寝床につくように、起こす角度を目の高さから決める */
        const up = Math.asin(U.clamp((bed - 0.19) / 0.645, 0.2, 0.75));
        fig.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -up));
        for (const L of [pr.lL, pr.lR]) L.hp.rotation.x = -up;
      }
      for (const L of [pr.lL, pr.lR]) L.ft.rotation.x = 0.6;        // つま先は寝かせる
    } else if (fallen) {
      /* 倒れて、左を下にして横たわる。頭のてっぺんは −X、顔は −Z、体は +X のほうへのびる */
      fig.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0, -1, 0), new T.Vector3(-1, 0, 0), new T.Vector3(0, 0, -1)));
      pr.lL.hp.rotation.x = -0.75; pr.lL.kn.rotation.x = 0.9; pr.lR.hp.rotation.x = -0.25; pr.lR.kn.rotation.x = 0.4;
      pr.spine.rotation.x = 0.12;
    } else {
      fig.rotation.y = Math.PI;                                     // 人物の正面は +Z。自分の体は −Z を向く
      if (kind === 'car') {
        for (const L of [pr.lL, pr.lR]) { L.hp.rotation.x = -1.25; L.kn.rotation.x = 0.75; }
      } else if (bare) {
        for (const L of [pr.lL, pr.lR]) { L.hp.rotation.x = -Math.PI / 2 - 0.45; L.kn.rotation.x = 1.9; }
      } else if (kind === 'sit') {
        for (const L of [pr.lL, pr.lR]) { L.hp.rotation.x = -Math.PI / 2 + 0.04; L.kn.rotation.x = Math.PI / 2 - 0.1; }
        pr.spine.rotation.x = 0.06;
      } else {
        for (const a of [pr.aL, pr.aR]) a.el.rotation.x = -0.2;
        fig.scale.multiplyScalar((o.eye || 1.5) / 1.575);           // 目の高さを、立ち位置の決まりに合わせる
      }
    }
    /* 目の位置に合わせる（頭の骨の少し上・少し前が目） */
    fig.updateMatrixWorld(true);
    const hp0 = new T.Vector3(), hq0 = new T.Quaternion(), hs0 = new T.Vector3();
    B.head.matrixWorld.decompose(hp0, hq0, hs0);
    fig.position.sub(new T.Vector3(0, eyeUp, eyeFwd).multiplyScalar(fig.scale.x).applyQuaternion(hq0).add(hp0));
    if (lying) {
      /* 腰が寝床にのる高さへ下ろす（枕のぶん、目は体より高い） */
      fig.updateMatrixWorld(true);
      const want = -Math.max(bed, kind === 'lieUp' ? 0.3 : 0.41) + 0.106;
      if (kind === 'lie') fig.position.y += want - wpos(B.hips).y;
      else fig.position.y += Math.min(0, want - wpos(B.hips).y);
      fig.position.z -= 0.03;
    }
    fig.updateMatrixWorld(true);

    /* ---- 手の置き方。sp = {t 手首の位置, pole ひじを出す向き, dir 指先の向き, palm 手のひらの向く先, curl 指の曲げ}（どれも g の座標） ---- */
    const spec = (t, pole, dir, palm, curl) => ({ t, pole, dir, palm, curl: curl == null ? 0.3 : curl });
    const gq = new T.Quaternion(), tw = V3(), pw = V3(), dw = V3(), nw = V3();
    const solve = (side, sp) => {
      g.getWorldQuaternion(gq);                                      // g が視点に付いたあとは、世界の座標へ直してから解く
      tw.copy(sp.t).applyMatrix4(g.matrixWorld); pw.copy(sp.pole).applyQuaternion(gq); dw.copy(sp.dir).applyQuaternion(gq); nw.copy(sp.palm).applyQuaternion(gq);
      const E = armIK(fig, pr, side, tw, pw, { dir: dw, palm: nw });
      pr.curl(side === 'L' ? pr.aR : pr.aL, sp.curl);
      return E;
    };
    /* いまの腕の形を、そのまま置き方として写しとる */
    const capture = (side) => {
      fig.updateMatrixWorld(true);
      const S = wpos(B['upperarm' + side]), E = wpos(B['forearm' + side]), W = wpos(B['hand' + side]), q = new T.Quaternion();
      B['hand' + side].getWorldQuaternion(q);
      const pole = E.clone().sub(S.clone().lerp(W, 0.5));
      if (pole.length() < 0.02) pole.set(side === 'L' ? -1 : 1, 0, 1);
      return spec(W, pole.normalize(), V3().set(0, 1, 0).applyQuaternion(q), V3().set(side === 'L' ? -1 : 1, 0, 0).applyQuaternion(q), 0.32);
    };
    const base = { L: null, R: null };
    /* 左右対称に置く。dir・palm・pole は右側（+X）の手の向きで書き、反対の手は鏡うつし。over は上に重ねる手のずらし */
    const hands = (lx, y, z, pole, dir, palm, over, floor, curl) => {
      const ov = over || [0, 0];
      const mk = (sx, py, dy, dz) => spec(new T.Vector3(sx * lx, y + dy, z - dz), new T.Vector3(sx * pole[0], py, pole[2]), new T.Vector3(sx * dir[0], dir[1], dir[2]), new T.Vector3(sx * palm[0], palm[1], palm[2]), curl);
      /* ひじが寝床にもぐるときは、ひじを少しずつ上へ逃がす */
      for (const py of [pole[1], -0.35, 0, 0.35, 0.8, 1.6]) {
        if (py < pole[1]) continue;
        base.L = mk(-1, py, 0, 0); base.R = mk(1, py, ov[0], ov[1]);
        const e1 = solve('L', base.L), e2 = solve('R', base.R);
        if (floor == null || Math.min(e1.y, e2.y) >= floor) break;
      }
    };
    let drapeG = null, y0 = -1;
    if (lying) {
      const hp = wpos(B.hips), ch = wpos(B.chest), nk = wpos(B.neck);
      y0 = Math.max(-bed + 0.004, hp.y - 0.118);                    // 寝床の面
      const belly = hp.clone().lerp(ch, kind === 'lieUp' ? 0.25 : 0.56);
      const up = new T.Vector3(0, 1, 0).applyQuaternion(fig.quaternion.clone().multiply(new T.Quaternion(0, Math.SQRT1_2, Math.SQRT1_2, 0).invert()));
      const flat = kind === 'lie';
      const hy = belly.clone().addScaledVector(up, flat ? 0.176 : 0.142);   // おなかの上に手を置く（平らに寝るときは掛けものの上）
      hands(0.134, hy.y, hy.z, [1, -0.7, 0.1], [-1, 0.02, -0.3], [0, -1, 0], [0.034, 0.064], y0 + 0.05, 0.22);     // 片手をもう片方の上に、少しずらして重ねる
      const segs = [[hp, nk, 0.128, 0.74]];
      for (const sd of ['L', 'R']) {
        const th = wpos(B['thigh' + sd]), sh = wpos(B['shin' + sd]), ft = wpos(B['foot' + sd]);
        const toe = new T.Vector3(0, 0.13, 0).applyMatrix4(B['foot' + sd].matrixWorld);
        segs.push([th, sh, 0.098], [sh, ft, 0.074], [ft, toe, 0.058]);
      }
      const ft = wpos(B.footL);
      drapeG = drape(o.blanket || P.blanket, segs, belly.z + (flat ? 0.085 : -0.125), ft.z - 0.34, y0);
      g.add(drapeG);
    } else if (kind === 'sit') {
      const kn = wpos(B.shinL), hp = wpos(B.hips);
      hands(0.115, hp.y + 0.09 + (o.blanket ? 0.035 : 0), U.lerp(hp.z, kn.z, 0.5), [1, -0.5, 0.5], [-0.18, -0.06, -1], [0, -1, 0]);
      if (o.blanket) g.add(K.sph(0.3, K.m(o.blanket), 0, (kn.y + hp.y) / 2 + 0.02, (kn.z + hp.z) / 2 - 0.04, { s: [1.0, 0.36, 1.05] }));
    } else if (kind === 'car') {
      hands(0.155, -0.105, -0.395, [0.35, -1, 0.3], [-0.12, -0.2, -1], [0, -1, 0.1], null, null, 1.25);   // ハンドルの上に手をかける（ひじは体の近くに下げる）
    } else if (bare) {
      hands(0.33, -0.262, -0.46, [1, -0.3, 0.6], [0, -0.04, -1], [0, -1, 0]);
    } else if (fallen) {
      /* 下になった腕は前へ投げ出し、上の腕は胸の前で地面につく */
      const gy = -(o.ground != null ? o.ground : 0.2);
      base.L = spec(new T.Vector3(0.08, gy + 0.028, -0.36), new T.Vector3(0.6, -0.3, 0.2), new T.Vector3(-0.2, 0, -1), new T.Vector3(0, -1, 0), 0.42);
      base.R = spec(new T.Vector3(0.3, gy + 0.045, -0.24), new T.Vector3(0.3, 1, 0.1), new T.Vector3(-0.5, 0, -1), new T.Vector3(0, -1, 0), 0.55);
      solve('L', base.L); solve('R', base.R);
    } else {
      base.L = capture('L'); base.R = capture('R');
    }

    /* ---- しぐさ（最期の場面で、手が動く）。体の向きを基準に場所を決める ---- */
    const fq = fig.quaternion, Xf = V3().set(1, 0, 0).applyQuaternion(fq), Yf = V3().set(0, 1, 0).applyQuaternion(fq), Zf = V3().set(0, 0, 1).applyQuaternion(fq);
    const P0 = { chest: wpos(B.chest), neck: wpos(B.neck), head: wpos(B.head), hips: wpos(B.hips), eye: V3() };
    const at = (p, x, y, z) => p.clone().addScaledVector(Xf, x).addScaledVector(Yf, y).addScaledVector(Zf, z);
    const dv = (x, y, z) => V3().addScaledVector(Xf, x).addScaledVector(Yf, y).addScaledVector(Zf, z).normalize();
    const G = {
      /* 胸を押さえる */
      clutch: (sx) => spec(at(P0.chest, sx * 0.07, sx > 0 ? 0.07 : 0.115, 0.137), dv(sx, -0.75, 0.25), dv(-sx, 0.3, 0.1), dv(0, 0, -1), 0.95),
      /* のどもとへ手をやる */
      throat: (sx) => spec(at(P0.neck, sx * 0.05, -0.08, 0.125), dv(sx, -0.8, 0.3), dv(-sx * 0.5, 1, 0.05), dv(0, 0, -1), 0.7),
      /* 額に手をやる（目の前に、自分の手がかぶさる） */
      temple: (sx) => spec(at(P0.eye, sx * 0.115, -0.1, 0.175), dv(sx, -1, 0.2), dv(-sx * 0.45, 1, 0.05), dv(0, 0, -1), 0.4),
      /* 手をのばす（寝ているときは、上へ） */
      reach: (sx) => (lying
        ? spec(at(P0.eye, sx * 0.1, -0.3, 0.36), dv(sx * 0.7, -0.2, -1), dv(0, -0.5, 1), dv(0, -1, 0.2), 0.08)
        : spec(at(P0.eye, sx * 0.12, -0.1, 0.5), dv(sx * 0.7, -1, 0), dv(0, 0.15, 1), dv(0, -1, 0), 0.08)),
      /* 力が抜けて、落ちる */
      limp: (sx) => {
        if (lying) { const t = at(P0.hips, sx * 0.3, 0.05, 0); t.y = y0 + 0.048; return spec(t, dv(sx, 0.15, 0.4), dv(sx * 0.15, -1, 0), dv(0, 0, -1), 0.5); }
        if (kind === 'sit') return spec(at(P0.hips, sx * 0.26, -0.04, 0.1), dv(sx * 0.5, -0.2, -1), dv(0, -1, 0.25), dv(-sx, 0, 0), 0.5);
        if (kind === 'car') return spec(at(P0.hips, sx * 0.13, 0.21, 0.3), dv(sx, -0.6, -0.3), dv(-sx * 0.2, -0.1, 1), dv(0, -1, 0), 0.45);
        if (bare) return spec(at(P0.hips, sx * 0.2, 0.14, 0.22), dv(sx, -0.4, -0.3), dv(-sx * 0.2, -0.3, 1), dv(0, -1, 0), 0.45);
        const b = base[sx > 0 ? 'L' : 'R']; return spec(b.t.clone(), b.pole.clone(), b.dir.clone(), b.palm.clone(), 0.5);
      }
    };
    B.neck.scale.setScalar(0.001);                                  // 自分の首と頭は見えない
    g.traverse(m => { if (m.isMesh) m.castShadow = false; });

    const cur = { L: null, R: null }, goal = { L: null, R: null }, rate = { L: 3, R: 3 }, shake = { L: 0, R: 0 }, live = { L: null, R: null }, still = { L: 0, R: 0 };
    let breathV = 0, breathLast = 0;
    const cp = (sp) => spec(sp.t.clone(), sp.pole.clone(), sp.dir.clone(), sp.palm.clone(), sp.curl);
    const inv = new T.Matrix4();
    /* しぐさを始める。name: rest / clutch / throat / temple / reach / limp / held。side: 'L' 'R' 'both'（体の左右） */
    g.userData.gesture = (name, op) => {
      op = op || {};
      const sides = op.side === 'L' || op.side === 'R' ? [op.side] : ['L', 'R'];
      for (const sd of sides) {
        if (!base[sd]) continue;
        if (!cur[sd]) cur[sd] = cp(base[sd]);
        live[sd] = null;
        if (name === 'rest') goal[sd] = cp(base[sd]);
        else if (name === 'held') { goal[sd] = cp(cur[sd]); live[sd] = op.target || null; if (op.dir) goal[sd].dir.copy(op.dir); goal[sd].palm.set(0, -1, 0); goal[sd].curl = 0.35; }
        else if (G[name]) goal[sd] = G[name](sd === 'L' ? 1 : -1);
        rate[sd] = op.rate || (name === 'clutch' || name === 'temple' || name === 'throat' ? 6 : (name === 'limp' ? 1.8 : 2.6));
        shake[sd] = op.shake || 0; still[sd] = 0;
      }
    };
    g.userData.breath = (v) => { breathV = v; };
    /* 手首のいまの位置（世界の座標）。そばの人が手を重ねるのに使う */
    g.userData.wrist = (sd) => { fig.updateMatrixWorld(true); return wpos(B['hand' + sd]); };
    g.userData.kind = kind;
    const tmp = spec(V3(), V3(), V3(), V3(), 0);
    g.userData.update = (dt, t) => {
      const bChanged = lying && Math.abs(breathV - breathLast) > 0.004;
      if (bChanged) { breathLast = breathV; if (drapeG) drapeG.position.y = breathV * 0.007; }
      for (const sd of ['L', 'R']) {
        const gl = goal[sd];
        if (!gl) { if (bChanged && base[sd] && lying) { tmp.t.copy(base[sd].t); tmp.t.y += breathV * 0.008; tmp.pole.copy(base[sd].pole); tmp.dir.copy(base[sd].dir); tmp.palm.copy(base[sd].palm); tmp.curl = base[sd].curl; solve(sd, tmp); } continue; }
        const c = cur[sd], k = 1 - Math.exp(-rate[sd] * dt);
        if (live[sd]) { const w = typeof live[sd] === 'function' ? live[sd]() : live[sd]; if (w) { g.updateWorldMatrix(true, false); gl.t.copy(w).applyMatrix4(inv.copy(g.matrixWorld).invert()); } }
        const far = c.t.distanceTo(gl.t);
        c.t.lerp(gl.t, k); c.pole.lerp(gl.pole, k); c.dir.lerp(gl.dir, k).normalize(); c.palm.lerp(gl.palm, k).normalize(); c.curl += (gl.curl - c.curl) * k;
        if (far < 0.002 && !shake[sd] && !live[sd]) { if (++still[sd] > 3 && !bChanged) continue; } else still[sd] = 0;
        tmp.t.copy(c.t); tmp.pole.copy(c.pole); tmp.dir.copy(c.dir); tmp.palm.copy(c.palm); tmp.curl = c.curl;
        if (shake[sd]) { const a = shake[sd] * 0.004; tmp.t.x += Math.sin(t * 43 + (sd === 'L' ? 0 : 2)) * a; tmp.t.y += Math.sin(t * 37 + 1) * a; }
        if (lying && gl === goal[sd] && breathV) tmp.t.y += breathV * 0.006;
        solve(sd, tmp);
      }
    };
    return g;
  }

  /* ---------- 木 ---------- */
  const procTree = K.tree;
  K.tree = function (o) {
    o = o || {};
    const kind = o.kind || 'broad', list = A.ready ? A.trees[kind] : null;
    if (!list || !list.length) return procTree(o);
    const rng = U.rng((o.seed || 1) * 7 + 3), h = o.h || 5;
    const season = o.season || 'summer', snowy = o.weather === 'snow';
    const evergreen = (kind === 'pine' || kind === 'conifer');
    let leafC;
    if (evergreen) leafC = kind === 'pine' ? '#44683c' : P.leafDark;
    else if (season === 'spring') leafC = kind === 'sakura' ? P.sakura : K.mixc(P.leaf, P.leafLight, 0.7);
    else if (season === 'summer') leafC = kind === 'momiji' ? K.mixc(P.leaf, P.leafLight, 0.4) : P.leaf;
    else if (season === 'autumn') leafC = kind === 'momiji' ? P.momiji : (kind === 'ginkgo' ? P.ginkgo : (kind === 'sakura' ? '#b0683a' : K.mixc(P.orange, P.leaf, 0.45)));
    else leafC = null;
    if (snowy && leafC) leafC = K.mixc(leafC, P.snow, 0.5);
    const g = new T.Group();
    const node = list[Math.floor(rng() * list.length) % list.length].clone(true);
    const barkM = K.m(kind === 'sakura' ? '#5a4a42' : (kind === 'pine' ? '#55402f' : K.shade(P.trunk, 1.2)), { rough: 0.95 });
    let leafMesh = null;
    node.traverse(m => {
      if (!m.isMesh) return;
      m.castShadow = true; m.receiveShadow = true;
      if (/_leaf$/.test(m.name)) {
        leafMesh = m;
        if (leafC) m.material = K.m(K.shade(leafC, 0.92 + rng() * 0.16), { flat: true }); else m.visible = false;
      } else if (/_twig$/.test(m.name)) {
        m.material = snowy ? K.m(K.mixc(P.trunk, P.snow, 0.55), { flat: true }) : barkM; m.visible = !leafC; m.castShadow = false;
      } else m.material = barkM;
    });
    node.scale.setScalar(h * (kind === 'conifer' ? 1 : 1.04));
    node.rotation.y = rng() * Math.PI * 2;
    node.position.set(0, 0, 0);
    g.add(node);
    g.userData.foliage = (leafMesh && leafMesh.visible) ? leafMesh : null;
    return g;
  };
})(window.SI);
