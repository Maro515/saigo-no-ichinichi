'use strict';
/* 最期の一日 — 雪。積もった雪を、厚み・丸み・吹きだまり・轍で見せる。
   積もるかどうかと深さは、話の語りと天気で決める（SI.snowDepth）。場所を組み立てるあいだは SI.snowNow に深さ（m）が入る。
   - K.ground: 雪の質感と、遠くほど大きいゆるい起伏
   - K.road: 踏み固めた雪とタイヤの轍、両わきの除雪の山
   - K.house: 屋根の厚い雪と軒のつらら
   - SI.Snow.apply(st): 外にある物の上面に、厚みのある雪をのせ、壁ぎわに吹きだまりを作る（1 つの形にまとめて軽くする） */
(function (SI) {
  const T = window.THREE, U = SI.U, K = SI.Kit, P = K.P;
  const PI = Math.PI;
  SI.snowNow = 0;

  /* ---------- 積もるか、どれくらいか ---------- */
  SI.snowDepth = function (cause, life) {
    if (!cause) return 0;
    const t = [cause.place, cause.name].concat((cause.beats || []).map(b => b.text || ''), cause.end ? (cause.end.lines || []) : []).join('。');
    const season = life ? life.season : cause.season, weather = life ? life.weather : cause.weather;
    if (season === 'summer' && weather !== 'snow') return 0;
    let d = weather === 'snow' ? 0.22 : 0;
    if (weather === 'rain' || weather === 'storm') { if (!/大雪|雪に埋|雪の重み|雪下ろし|豪雪|吹雪/.test(t)) return 0; }       // 雨の日は、はっきり雪の話のときだけ
    if (/大雪|三日続きの雪|雪[^。]{0,8}腰まで|腰までの雪|深い雪|雪に埋|雪の重み|雪下ろし|雪[^。]{0,8}一メートル|豪雪/.test(t)) d = Math.max(d, 0.45);
    else if (/雪かき|雪[がの]?積も|積もった雪|雪が[^。]{0,6}積も|雪道|除雪|根雪|雪国|吹雪|雪原|雪山|ゲレンデ|スキー|新雪|雪が深|雪の上|雪の朝|雪の校庭|雪の峠|雪にはま|チェーン規制|雪の積もった/.test(t)) d = Math.max(d, season === 'winter' || weather === 'snow' ? 0.26 : 0.18);
    else if (/雪が残|残雪|雪どけ|うっすら雪/.test(t)) d = Math.max(d, 0.06);
    return d;
  };

  /* ---------- 雪の質感 ---------- */
  K.tex.snow = function () {
    return K.tex._snow || (K.tex._snow = (() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 512;
      const g = cv.getContext('2d'), r = U.rng(4242);
      g.fillStyle = '#f5f8fb'; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 70; i++) { const x = r() * 512, y = r() * 512, rr = 30 + r() * 90, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(206,218,232,0.28)'); gr.addColorStop(1, 'rgba(206,218,232,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
      for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.55)' : 'rgba(190,204,220,0.22)'; g.fillRect(r() * 512, r() * 512, 1 + r() * 1.5, 1 + r() * 1.5); }
      const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; t.userData.shared = true; return t;
    })());
  };
  K.tex.snowBump = function () {
    return K.tex._snowB || (K.tex._snowB = (() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 256;
      const g = cv.getContext('2d'), r = U.rng(99);
      g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 6000; i++) { const v = Math.floor(100 + r() * 120); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2); }
      const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.userData.shared = true; return t;
    })());
  };
  const snowMats = {};
  K.mSnow = function (rep, o) {
    o = o || {}; const key = (rep || 1) + '|' + (o.double ? 1 : 0);
    if (snowMats[key]) return snowMats[key];
    const map = K.tex.snow().clone(), bump = K.tex.snowBump().clone(); map.repeat.set(rep || 1, rep || 1); bump.repeat.set((rep || 1) * 3, (rep || 1) * 3); map.needsUpdate = bump.needsUpdate = true;
    map.userData.shared = bump.userData.shared = true;
    const m = new T.MeshStandardMaterial({ color: 0xffffff, map, bumpMap: bump, bumpScale: 0.9, roughness: 0.82, metalness: 0, side: o.double ? T.DoubleSide : T.FrontSide });
    m.userData.shared = true; snowMats[key] = m; return m;
  };
  /* 上を向いた面だけ白くする（木の葉や枝の上に積もった雪） */
  K.snowTint = function (mesh, base, thr) {
    if (!mesh || !mesh.geometry || !mesh.geometry.attributes.normal) return;
    const geo = mesh.geometry.clone(), n = geo.attributes.normal, cnt = n.count, col = new Float32Array(cnt * 3);
    const b = new T.Color(base), w = new T.Color('#f2f6fa'), tmp = new T.Color(), r = U.rng(cnt);
    const q = new T.Quaternion(); mesh.updateWorldMatrix(true, false); mesh.getWorldQuaternion(q);
    const v = new T.Vector3();
    for (let i = 0; i < cnt; i++) {
      v.set(n.getX(i), n.getY(i), n.getZ(i)).applyQuaternion(q);
      const k = U.clamp((v.y - (thr != null ? thr : 0.25) + (r() - 0.5) * 0.25) * 2.6, 0, 1);
      tmp.copy(b).lerp(w, k); col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    mesh.geometry = geo;
    const m = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.9, flatShading: !!(mesh.material && mesh.material.flatShading) });
    mesh.material = m;
  };

  /* ---------- 岩と植えこみ（上側に雪） ---------- */
  const rock0 = K.rock, bush0 = K.bush;
  K.rock = function (r, c, seed) { const m = rock0(r, c, seed); if (SI.snowNow > 0.03) { m.updateMatrixWorld(true); K.snowTint(m, c || '#8a8a84', 0.35); } return m; };
  K.bush = function (c, r, seed) { const g = bush0(c, r, seed); if (SI.snowNow > 0.03) g.children.forEach(ch => { if (ch.isMesh) K.snowTint(ch, c || P.leafDark, 0.2); }); return g; };

  /* ---------- 地面（雪のときは起伏をつける） ---------- */
  const ground0 = K.ground;
  K.ground = function (size, color, y, repN) {
    if (!(color === P.snow && SI.snowNow > 0.03)) return ground0(size, color, y, repN);
    const segs = Math.min(90, Math.max(20, Math.round(size / 2))), geo = new T.PlaneGeometry(size, size, segs, segs); geo.rotateX(-PI / 2);
    const pos = geo.attributes.position, amp = 0.05 + SI.snowNow * 0.9, ph = Math.random() * 10;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x, z);
      const far = U.clamp((d - size * 0.08) / (size * 0.25), 0, 1);
      const h = (Math.sin(x * 0.13 + ph) * Math.cos(z * 0.11 - ph) * 0.6 + Math.sin(x * 0.37 + z * 0.29) * 0.25 + Math.sin(x * 0.9 - z * 0.7) * 0.08) * amp * (0.25 + far);
      pos.setY(i, Math.max(-amp * 0.2, d < 14 ? Math.min(h, 0.03) : h));   // まん中（建物の床のあたり）は低く抑えて、床を突き抜けないように
    }
    geo.computeVertexNormals();
    const m = new T.Mesh(geo, K.mSnow(Math.max(2, size / 10))); m.position.y = y || 0; m.receiveShadow = true; m.userData.noSnow = true; m.userData.snowGround = true; m.userData.noNav = true;
    return m;
  };
  /* ---------- 道（踏み固めた雪と轍、両わきの雪の山） ---------- */
  const road0 = K.road;
  const rutTex = {};
  function rutTexture(lanes) {
    if (rutTex[lanes]) return rutTex[lanes];
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512;
    const g = cv.getContext('2d'), r = U.rng(lanes * 13);
    g.fillStyle = '#d9dee2'; g.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 4000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(120,124,130,0.12)'; g.fillRect(r() * 256, r() * 512, 2, 2); }
    const lw = 256 / lanes;
    for (let l = 0; l < lanes; l++) for (const off of [0.27, 0.73]) {
      const cx = l * lw + lw * off;
      for (let y = 0; y < 512; y += 4) { const wob = Math.sin(y * 0.02 + l) * 2; g.fillStyle = 'rgba(86,88,94,0.7)'; g.fillRect(cx - 7 + wob, y, 14, 4); g.fillStyle = 'rgba(200,204,208,0.25)'; g.fillRect(cx - 2 + wob, y, 3, 4); g.fillStyle = 'rgba(110,104,96,0.35)'; g.fillRect(cx - 11 + wob, y, 3, 4); g.fillRect(cx + 8 + wob, y, 3, 4); }
    }
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; t.userData.shared = true; rutTex[lanes] = t; return t;
  }
  K.road = function (w, len, o) {
    if (!(SI.snowNow > 0.03)) return road0(w, len, o);
    o = o || {};
    const g = new T.Group(), lanes = w >= 6 ? 2 : 1, tex = rutTexture(lanes).clone(); tex.repeat.set(1, len / 8); tex.needsUpdate = true; tex.userData.shared = false;
    g.add(K.plane(w, len, K.m('#ffffff', { map: tex, rough: 0.55, nocache: true }), 0, 0.012, 0));
    /* 除雪した雪の山（ところどころ切れる） */
    const r = U.rng(Math.round(w * 100 + len)), hgt = 0.25 + SI.snowNow * 1.6, mat = K.mSnow(2), banks = [], half = new T.SphereGeometry(1, 14, 8, 0, PI * 2, 0, PI / 2).toNonIndexed(), bm = new T.Matrix4();
    for (const sx of [-1, 1]) {
      let z = -len / 2;
      const gaps = o.gaps || [];                     // 交差点や横断歩道の前は、雪の山を切る（[z0, z1] の並び）
      while (z < len / 2) {
        const g0 = gaps.find(q => z >= q[0] - 0.5 && z < q[1]); if (g0) { z = g0[1]; continue; }
        let L = 2.5 + r() * 5; const gap = r() < 0.18 ? 1.2 + r() * 2 : 0.1;
        const nx = gaps.find(q => q[0] > z && q[0] < z + L); if (nx) L = Math.max(0.6, nx[0] - z - 0.3);
        const sxs = 0.45 + r() * 0.35, sys = hgt * (0.6 + r() * 0.6), px = sx * (w / 2 + 0.25 + r() * 0.2);
        bm.makeScale(sxs, sys, L / 2).setPosition(px, 0, z + L / 2); banks.push(half.clone().applyMatrix4(bm));
        z += L + gap;
      }
    }
    half.dispose();
    if (banks.length) { const m = new T.Mesh(merge(banks), mat); m.receiveShadow = true; m.castShadow = true; m.userData.noSnow = true; m.userData.noNav = true; g.add(m); }   // 1 つの形にまとめる。歩ける範囲の判定には入れない（横断歩道や歩道をふさがない）
    return g;
  };
  /* ---------- 家（屋根の厚い雪とつらら） ---------- */
  const house0 = K.house;
  K.house = function (o) {
    o = o || {};
    if (!(o.snow || SI.snowNow > 0.03)) return house0(o);
    const g = house0(Object.assign({}, o, { snow: false }));
    const w = o.w || 7, d = o.d || 6, h = o.h || 3, rh = o.rh || 1.6, t = 0.12 + Math.max(SI.snowNow, 0.15) * 0.8;
    const shape = new T.Shape(); shape.moveTo(-w / 2 - 0.48, -0.02); shape.lineTo(w / 2 + 0.48, -0.02); shape.lineTo(0, rh + t); shape.closePath();
    const hole = new T.Path(); hole.moveTo(-w / 2 - 0.3, 0.02); hole.lineTo(w / 2 + 0.3, 0.02); hole.lineTo(0, rh - 0.02); hole.closePath(); shape.holes.push(hole);
    const sg = new T.ExtrudeGeometry(shape, { depth: d + 0.7, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 4 }); sg.translate(0, h + 0.04, -d / 2 - 0.35);
    const sm = new T.Mesh(sg, K.mSnow(1)); sm.castShadow = true; sm.receiveShadow = true; sm.userData.noSnow = true; g.add(sm);
    const ice = K.m('#dfeaf2', { rough: 0.15, transparent: true, opacity: 0.85 }), r = U.rng(Math.round(w * 37 + d));
    for (const sx of [-1, 1]) for (let z = -d / 2; z < d / 2; z += 0.35 + r() * 0.4) {
      if (r() < 0.4) continue;
      const L = 0.08 + r() * (0.15 + SI.snowNow * 0.6), c = new T.Mesh(new T.ConeGeometry(0.018 + r() * 0.012, L, 5), ice); c.rotation.x = PI; c.position.set(sx * (w / 2 + 0.44), h + 0.02 - L / 2, z); c.userData.noSnow = true; g.add(c);
    }
    g.userData.noSnowCap = true;
    return g;
  };

  /* ---------- 外の物の上に積もる雪（まとめて 1 つの形に） ---------- */
  function isFigure(o) { return !!(o.userData && (o.userData.react || o.userData.pose !== undefined || o.userData.parts || o.userData.isFigure)); }
  const up = new T.Vector3(), q = new T.Quaternion(), sc = new T.Vector3(), pv = new T.Vector3(), mtx = new T.Matrix4(), inv = new T.Matrix4(), bb = new T.Box3();
  function capGeo(w, d, t, top, bev) {
    const geo = new T.BoxGeometry(w, t, d, 1, 1, 1); geo.translate(0, top + t / 2 - 0.004, 0);
    const p = geo.attributes.position, hw = w / 2, hd = d / 2;
    const kx = Math.max(0.3, (hw - bev) / hw), kz = Math.max(0.3, (hd - bev) / hd);
    for (let i = 0; i < p.count; i++) if (p.getY(i) > top + t * 0.6) { p.setX(i, p.getX(i) * kx); p.setZ(i, p.getZ(i) * kz); }
    geo.computeVertexNormals(); return geo.index ? geo.toNonIndexed() : geo;
  }
  function domeGeo(r, t, top) { const geo = new T.SphereGeometry(r, 10, 5, 0, PI * 2, 0, PI / 2); geo.scale(1, t / r, 1); geo.translate(0, top - 0.003, 0); return geo.index ? geo.toNonIndexed() : geo; }
  function moundGeo(L, wdt, hgt) { const geo = new T.SphereGeometry(1, 12, 6, 0, PI * 2, 0, PI / 2); geo.scale(L / 2, hgt, wdt / 2); return geo.index ? geo.toNonIndexed() : geo; }
  function merge(list) {
    let n = 0; for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const g of list) {
      const p = g.attributes.position, nn = g.attributes.normal, u = g.attributes.uv;
      pos.set(p.array, o * 3); nor.set(nn.array, o * 3);
      if (u) uv.set(u.array, o * 2); else for (let i = 0; i < p.count; i++) { uv[(o + i) * 2] = p.getX(i) * 0.5; uv[(o + i) * 2 + 1] = p.getZ(i) * 0.5; }
      o += p.count; g.dispose();
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    return geo;
  }
  SI.Snow = {
    apply(st, depth) {
      if (!st || !st.group || !(depth > 0.01)) return;
      const root = st.group; root.updateMatrixWorld(true); inv.copy(root.matrixWorld).invert();
      const wb = (st.indoor || st.shopKind) && st.weatherBox ? st.weatherBox : null;   // 屋内と、表が開いた店（屋根の下）は、外の範囲にだけ積もらせる
      const caps = [], mounds = [], rng = U.rng(77), owned = new Map();   // owned: 動く物（車・ブランコ・舟）ごとの雪。その物の子にして一緒に動かす
      const oInv = new T.Matrix4();
      let owner = null;
      const inOut = (x, y, z) => !wb || (x >= wb[0][0] - 0.3 && x <= wb[1][0] + 0.3 && z >= wb[0][2] - 0.4 && z <= wb[1][2] + 0.3 && y <= wb[1][1] + 1);
      const walk = (o) => {
        if (o.userData && (o.userData.noSnow || o.userData.noSnowCap) && o !== root) { if (o.userData.noSnowCap) return; }
        if (isFigure(o) || o.isLight || o.isPoints || o.isSprite) return;
        const prev = owner; if (o !== root && o.userData && o.userData.dyn && !owner) owner = o;
        if (o.isMesh && !(o.userData && o.userData.noSnow)) tryCap(o);
        for (const ch of o.children) walk(ch);
        owner = prev;
      };
      const tryCap = (m) => {
        const geo = m.geometry, mat = m.material;
        if (!geo || !geo.parameters || (mat && (mat.transparent || (mat.emissiveIntensity > 0.2 && mat.emissive && mat.emissive.r > 0.2)))) return;
        mtx.multiplyMatrices(inv, m.matrixWorld);
        up.set(0, 1, 0).transformDirection(mtx); if (up.y < 0.985) return;            // まっすぐ立っている物だけ
        if (owner) { oInv.copy(owner.matrixWorld).invert(); mtx.multiplyMatrices(oInv, m.matrixWorld); }   // 動く物の雪は、その物から見た位置で作る
        mtx.decompose(pv, q, sc);
        const out = owner ? (owned.get(owner) || (owned.set(owner, []), owned.get(owner))) : caps;
        bb.setFromObject(m); const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
        if (!inOut(cx, bb.max.y, cz)) return;
        if (bb.max.y > 60 || bb.max.y < -2) return;
        const type = geo.type;
        if (!geo.boundingBox) geo.computeBoundingBox();
        const top = geo.boundingBox.max.y, bot = geo.boundingBox.min.y;
        if (type === 'BoxGeometry') {
          const p = geo.parameters, w = p.width * Math.abs(sc.x), d = p.depth * Math.abs(sc.z), hh = p.height * Math.abs(sc.y);
          if (w < 0.03 || d < 0.03 || hh < 0.004) return;
          const area = w * d, big = area > 4;
          let t = Math.min(depth * (0.75 + rng() * 0.4), Math.min(w, d) * 0.6, big ? 0.12 : 0.6); t = Math.max(0.012, t);
          const ov = big ? 0.0 : Math.min(0.03, t * 0.4), bev = Math.min(t * 0.7, Math.min(w, d) * 0.2);
          const g = capGeo(p.width + ov / Math.abs(sc.x || 1), p.depth + ov / Math.abs(sc.z || 1), t / Math.abs(sc.y || 1), top, bev / Math.max(Math.abs(sc.x), 0.001));
          g.applyMatrix4(mtx); out.push(g);
          /* 壁や塀のきわの吹きだまり（背の高い、長い物の下に。動く物には作らない） */
          if (!owner && hh > 0.7 && Math.max(w, d) > 1.2 && bb.min.y < 0.5 && mounds.length < 260) {
            const long = w >= d, L = Math.max(w, d) * 0.92, hm = Math.min(0.12 + depth * 1.4, hh * 0.45);
            for (const s2 of [-1, 1]) {
              if (rng() < 0.25) continue;
              const mg = moundGeo(L * (0.7 + rng() * 0.3), 0.35 + depth * 1.4, hm * (0.6 + rng() * 0.5));
              const off = (long ? d : w) / 2 + 0.05;
              const lm = new T.Matrix4().compose(new T.Vector3(long ? 0 : s2 * off / Math.abs(sc.x || 1), bot, long ? s2 * off / Math.abs(sc.z || 1) : 0), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), long ? 0 : PI / 2), new T.Vector3(1 / Math.abs(sc.x || 1), 1 / Math.abs(sc.y || 1), 1 / Math.abs(sc.z || 1)));
              mg.applyMatrix4(lm); mg.applyMatrix4(mtx); mounds.push(mg);
            }
          }
        } else if (type === 'CylinderGeometry') {
          const p = geo.parameters, rTop = p.radiusTop * Math.abs(sc.x);
          if (rTop < 0.02 || rTop > 1.6) return;
          const t = Math.max(0.015, Math.min(depth * 0.8, rTop * 1.2));
          const g = domeGeo(p.radiusTop + 0.008, t / Math.abs(sc.y || 1), top); g.applyMatrix4(mtx); out.push(g);
        }
      };
      walk(root);
      const mat = K.mSnow(1, { double: true });
      const make = (list) => { const m = new T.Mesh(merge(list), mat); m.castShadow = true; m.receiveShadow = true; m.userData.noSnow = true; m.userData.snowCaps = true; m.userData.noNav = true; return m; };
      for (const [o, list] of owned) if (list.length) o.add(make(list));
      const all = caps.concat(mounds);
      if (!all.length) return;
      const mesh = make(all);
      root.add(mesh);
      st.snowCaps = mesh;
    }
  };
})(window.SI);
