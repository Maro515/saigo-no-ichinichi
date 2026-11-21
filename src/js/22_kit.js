'use strict';
/* 最期の一日 — 部品（素材、模様、家具、人、自分の体） */
(function (SI) {
  const T = window.THREE, U = SI.U;
  const K = SI.Kit = {};

  /* 色。落ち着いた、少しあたたかい調子でそろえる */
  const P = K.P = {
    wallWarm: '#e8e0d0', wallCool: '#dde2e0', wallGray: '#cfcfca', plaster: '#d9cfb8', ceil: '#efece4',
    wood: '#9a7552', woodDark: '#5c4531', woodLight: '#c8a67c', woodPale: '#dcc7a2', tatami: '#b9b17e', tatamiEdge: '#3f4a3a',
    paper: '#f4f0e6', sheet: '#eceeed', blanket: '#c5d0d4', blanketWarm: '#d8c7b0', pillow: '#f1f0ea',
    steel: '#aab0b5', steelDark: '#6d7378', white: '#f1f0eb', offwhite: '#e4e2da', black: '#27272b', dark: '#3a3b40',
    skin: '#d8b89a', skinOld: '#cfb39a', hair: '#2e2a28', hairGray: '#b9b6b0',
    grass: '#6c8c4c', grassDry: '#9b9562', grassWinter: '#8d8a68', soil: '#6d5944', sand: '#d6c7a2', moss: '#5f7a47',
    asphalt: '#4a4c51', concrete: '#a8a8a3', concreteDark: '#84847f', line: '#e9e7df',
    leaf: '#4e793c', leafDark: '#34582e', leafLight: '#7fa257', sakura: '#f0c5cf', momiji: '#b8492b', ginkgo: '#d5b139', bare: '#6a5a4e',
    trunk: '#594535', snow: '#eef2f5', water: '#5b8ca6', sea: '#2e6d8d', seaDeep: '#1e4f6c', roof: '#49525f', roofRed: '#8a5645',
    brick: '#8e5a46', tile: '#dfe6e6', tileBlue: '#b9cfd6', cloth: '#b9a98e', navy: '#2f3b55', red: '#a8453a', yellow: '#d9b445',
    green: '#4f7d5a', teal: '#4c7f86', orange: '#d68a3c', beige: '#d9cdb6', gray: '#8d9094', lightGray: '#c6c8c9', glass: '#cfe2ea',
    lampWarm: '#ffd9a0', lampCool: '#eef4ff', screen: '#10161a', gold: '#b99a52'
  };

  const col = (c) => new T.Color(c);
  K.shade = (hex, f) => '#' + col(hex).multiplyScalar(f).getHexString();
  K.mixc = (a, b, t) => '#' + col(a).lerp(col(b), t).getHexString();

  /* ---------- 模様（キャンバスで描く） ---------- */
  const texCache = {};
  function makeTex(key, size, draw) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); draw(g, size);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4;
    t.userData.shared = true;
    texCache[key] = t; return t;
  }
  function rep(tex, rx, ry) { const t = tex.clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return t; }
  function speckle(g, s, r, n, a, light, dark) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = r() < 0.5 ? light : dark; g.globalAlpha = a * r();
      const w = 1 + r() * 2.5; g.fillRect(r() * s, r() * s, w, w);
    }
    g.globalAlpha = 1;
  }
  K.tex = {
    noise(hex, amt) {
      const key = 'noise' + hex + amt;
      return makeTex(key, 256, (g, s) => {
        const r = U.rng(U.hash(key));
        g.fillStyle = hex; g.fillRect(0, 0, s, s);
        speckle(g, s, r, 2600, amt || 0.12, '#ffffff', '#000000');
      });
    },
    wood(hex, planks) {
      const key = 'wood' + hex + (planks || 4);
      return makeTex(key, 512, (g, s) => {
        const r = U.rng(U.hash(key)), n = planks || 4, w = s / n;
        for (let i = 0; i < n; i++) {
          g.fillStyle = K.shade(hex, 0.9 + r() * 0.2); g.fillRect(i * w, 0, w, s);
          g.strokeStyle = 'rgba(0,0,0,0.10)';
          for (let k = 0; k < 16; k++) {
            g.lineWidth = 0.6 + r(); g.beginPath();
            let x = i * w + r() * w; g.moveTo(x, 0);
            for (let y = 0; y <= s; y += 32) { x += (r() - 0.5) * 3; g.lineTo(x, y); }
            g.stroke();
          }
          g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(i * w, 0, 1.5, s);
        }
      });
    },
    tatami() {
      return makeTex('tatami', 512, (g, s) => {
        const r = U.rng(11);
        g.fillStyle = P.tatami; g.fillRect(0, 0, s, s);
        for (let x = 0; x < s; x += 2) { g.fillStyle = `rgba(${r() < 0.5 ? '70,80,40' : '255,255,220'},${0.05 + r() * 0.07})`; g.fillRect(x, 0, 1, s); }
        g.fillStyle = P.tatamiEdge; g.fillRect(0, 0, s, 14); g.fillRect(0, s - 14, s, 14);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 2, s);
      });
    },
    tile(hex, n) {
      const key = 'tile' + hex + n;
      return makeTex(key, 256, (g, s) => {
        const r = U.rng(U.hash(key)), w = s / n;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          g.fillStyle = K.shade(hex, 0.95 + r() * 0.08); g.fillRect(i * w, j * w, w, w);
        }
        g.strokeStyle = 'rgba(90,100,105,0.5)'; g.lineWidth = 2;
        for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * w, 0); g.lineTo(i * w, s); g.moveTo(0, i * w); g.lineTo(s, i * w); g.stroke(); }
      });
    },
    shoji() {
      return makeTex('shoji', 256, (g, s) => {
        g.fillStyle = '#f7f3e8'; g.fillRect(0, 0, s, s);
        g.fillStyle = '#7b6248';
        const nx = 3, ny = 5;
        for (let i = 0; i <= nx; i++) g.fillRect(Math.min(s - 5, i * s / nx - 2.5), 0, 5, s);
        for (let j = 0; j <= ny; j++) g.fillRect(0, Math.min(s - 5, j * s / ny - 2.5), s, 5);
      });
    },
    facade(hex, lit) {
      const key = 'facade' + hex + (lit ? 1 : 0);
      return makeTex(key, 256, (g, s) => {
        const r = U.rng(U.hash(key));
        g.fillStyle = lit ? '#000000' : hex; g.fillRect(0, 0, s, s);
        const nx = 4, ny = 4, w = s / nx, h = s / ny;
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
          if (lit) { g.fillStyle = r() < 0.42 ? (r() < 0.7 ? '#ffd9a0' : '#e8f0ff') : '#000000'; }
          else g.fillStyle = K.shade('#7f8f9c', 0.7 + r() * 0.5);
          g.fillRect(i * w + w * 0.2, j * h + h * 0.22, w * 0.6, h * 0.5);
        }
      });
    },
    stripes(a, b, n) {
      const key = 'stripes' + a + b + n;
      return makeTex(key, 128, (g, s) => {
        for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * s / n, 0, s / n + 1, s); }
      });
    },
    glow() {
      if (texCache.glow) return texCache.glow;
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.userData.shared = true; texCache.glow = t; return t;
    },
    petal() {
      if (texCache.petal) return texCache.petal;
      const c = document.createElement('canvas'); c.width = c.height = 32;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(16, 16, 13, 8, 0.6, 0, 6.3); g.fill();
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.userData.shared = true; texCache.petal = t; return t;
    },
    rep
  };

  /* ---------- 素材 ---------- */
  const matCache = {};
  K.m = function (color, o) {
    o = o || {};
    const cacheable = !o.map && !o.nocache;
    const key = cacheable ? color + JSON.stringify(o) : null;      // 模様つきは文字列にしない（重い）
    if (cacheable && matCache[key]) return matCache[key];
    const m = new T.MeshStandardMaterial({
      color: o.map && !o.tint ? 0xffffff : color, roughness: o.rough != null ? o.rough : 0.92, metalness: o.metal || 0,
      map: o.map || null, flatShading: !!o.flat, side: o.double ? T.DoubleSide : T.FrontSide,
      transparent: !!o.transparent, opacity: o.opacity != null ? o.opacity : 1,
      emissive: o.emissive ? col(o.emissive) : col('#000000'), emissiveIntensity: o.ei != null ? o.ei : (o.emissive ? 1 : 0)
    });
    if (o.transparent) m.depthWrite = false;
    if (cacheable) { m.userData.shared = true; matCache[key] = m; }
    return m;
  };
  K.mTex = (tex, o) => K.m('#ffffff', Object.assign({ map: tex }, o || {}));

  /* ---------- 形 ---------- */
  function finish(mesh, x, y, z, o) {
    mesh.position.set(x || 0, y || 0, z || 0);
    const sh = !(o && o.noShadow);
    mesh.castShadow = sh && !(o && o.noCast); mesh.receiveShadow = sh;
    return mesh;
  }
  /* 箱。y は底の高さ */
  K.box = function (w, h, d, mat, x, y, z, o) {
    const g = new T.BoxGeometry(w, h, d); g.translate(0, h / 2, 0);
    return finish(new T.Mesh(g, mat), x, y, z, o);
  };
  K.cyl = function (r, h, mat, x, y, z, o) {
    o = o || {};
    const g = new T.CylinderGeometry(o.rTop != null ? o.rTop : r, r, h, o.seg || 16, 1, !!o.open); g.translate(0, h / 2, 0);
    return finish(new T.Mesh(g, mat), x, y, z, o);
  };
  K.sph = function (r, mat, x, y, z, o) {
    o = o || {};
    const g = new T.SphereGeometry(r, o.ws || 16, o.hs || 12);
    const m = finish(new T.Mesh(g, mat), x, y, z, o);
    if (o.s) m.scale.set(o.s[0], o.s[1], o.s[2]);
    return m;
  };
  K.cap = function (r, len, mat, x, y, z, o) {
    const g = new T.CapsuleGeometry(r, len, 4, 10);
    return finish(new T.Mesh(g, mat), x, y, z, o);
  };
  /* 上を向いた板。y は面の高さ */
  K.plane = function (w, d, mat, x, y, z, o) {
    const g = new T.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
    const m = finish(new T.Mesh(g, mat), x, y, z, o); m.castShadow = false; return m;
  };
  /* 2 点を結ぶ棒 */
  K.rod = function (a, b, r, mat, o) {
    const va = new T.Vector3().fromArray(a), vb = new T.Vector3().fromArray(b), len = va.distanceTo(vb);
    const g = new T.CylinderGeometry(r, r, len, (o && o.seg) || 8);
    const m = new T.Mesh(g, mat);
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), vb.sub(va).normalize());
    m.castShadow = !(o && o.noCast); m.receiveShadow = true;
    return m;
  };
  K.group = function (x, y, z, ry) { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (ry) g.rotation.y = ry; return g; };
  K.at = function (obj, x, y, z, ry) { obj.position.set(x || 0, y || 0, z || 0); if (ry != null) obj.rotation.y = ry; return obj; };
  K.noAO = function (o) { o.userData.noAO = true; return o; };
  /* 使い終えた形・素材・模様を手放す（使い回すものは残す） */
  K.dispose = function (root) {
    if (!root) return;
    root.traverse(o => {
      if (o.geometry && !(o.geometry.userData && o.geometry.userData.shared)) o.geometry.dispose();
      if (o.isInstancedMesh && o.dispose) o.dispose();
      if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose();
      const ms = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      for (const m of ms) {
        if (m.userData && m.userData.shared) continue;
        for (const k of ['map', 'emissiveMap', 'alphaMap']) { const t = m[k]; if (t && !(t.userData && t.userData.shared)) t.dispose(); }
        m.dispose();
      }
    });
  };

  /* ---------- 部屋 ----------
     中心が原点。x は −w/2〜w/2、z は −d/2〜d/2。南（+Z）が日の入る側。
     openings: [{side:'S|N|E|W', at:壁に沿った位置, w, y, h, kind:'window|open|shoji'}] */
  K.room = function (o) {
    const g = new T.Group();
    const w = o.w, d = o.d, h = o.h, th = 0.14;
    const wall = o.wall || K.m(P.wallWarm), floor = o.floor || K.m(P.wood), ceil = o.ceil || K.m(P.ceil);
    const frameM = o.frame || K.m(P.white);
    const fl = K.plane(w, d, floor, 0, 0, 0); g.add(fl);
    const under = K.box(w + 0.6, 0.2, d + 0.6, K.m(P.concreteDark), 0, -0.21, 0, { noCast: true }); g.add(under);
    const cl = K.box(w + 0.4, 0.16, d + 0.4, ceil, 0, h, 0); g.add(cl);
    const sides = {
      S: { len: w, pos: (a, y, hh, ww) => K.box(ww, hh, th, wall, a, y, d / 2 + th / 2), n: [0, 0, -1] },
      N: { len: w, pos: (a, y, hh, ww) => K.box(ww, hh, th, wall, a, y, -d / 2 - th / 2), n: [0, 0, 1] },
      E: { len: d, pos: (a, y, hh, ww) => K.box(th, hh, ww, wall, w / 2 + th / 2, y, a), n: [-1, 0, 0] },
      W: { len: d, pos: (a, y, hh, ww) => K.box(th, hh, ww, wall, -w / 2 - th / 2, y, a), n: [1, 0, 0] }
    };
    const ops = o.openings || [];
    for (const key of ['S', 'N', 'E', 'W']) {
      if (o.skip && o.skip.includes(key)) continue;
      const S = sides[key], list = ops.filter(p => p.side === key).sort((a, b) => a.at - b.at);
      let cur = -S.len / 2 - th;
      const end = S.len / 2 + th;
      for (const p of list) {
        const a0 = p.at - p.w / 2, a1 = p.at + p.w / 2;
        if (a0 > cur) g.add(S.pos((cur + a0) / 2, 0, h, a0 - cur));
        if (p.y > 0.001) g.add(S.pos(p.at, 0, p.y, p.w));
        if (p.y + p.h < h - 0.001) g.add(S.pos(p.at, p.y + p.h, h - p.y - p.h, p.w));
        cur = a1;
        /* 枠とガラス */
        const horiz = (key === 'S' || key === 'N');
        const zc = key === 'S' ? d / 2 + th / 2 : (key === 'N' ? -d / 2 - th / 2 : p.at);
        const xc = key === 'E' ? w / 2 + th / 2 : (key === 'W' ? -w / 2 - th / 2 : p.at);
        const fr = 0.05, dep = th + 0.04;
        const bar = (len, vertical, off, yy) => {
          if (horiz) return vertical ? K.box(fr, len, dep, frameM, xc + off, yy, zc) : K.box(len, fr, dep, frameM, xc + off, yy, zc);
          return vertical ? K.box(dep, len, fr, frameM, xc, yy, zc + off) : K.box(dep, fr, len, frameM, xc, yy, zc + off);
        };
        if (p.kind !== 'open') {
          g.add(bar(p.h, true, -p.w / 2 + fr / 2, p.y)); g.add(bar(p.h, true, p.w / 2 - fr / 2, p.y));
          g.add(bar(p.w, false, 0, p.y)); g.add(bar(p.w, false, 0, p.y + p.h - fr));
          if (p.kind === 'window') {
            if (p.w > 1.1) g.add(bar(p.h, true, 0, p.y));
            const gm = K.m(P.glass, { transparent: true, opacity: 0.08, rough: 0.1, nocache: false });
            const pane = horiz ? K.box(p.w, p.h, 0.01, gm, xc, p.y, zc) : K.box(0.01, p.h, p.w, gm, xc, p.y, zc);
            pane.castShadow = false; pane.receiveShadow = false; K.noAO(pane); g.add(pane);
            /* 窓台 */
            const sill = horiz ? K.box(p.w + 0.1, 0.03, 0.2, frameM, xc, p.y - 0.03, zc - S.n[2] * -0.0) : K.box(0.2, 0.03, p.w + 0.1, frameM, xc, p.y - 0.03, zc);
            g.add(sill);
          }
        }
      }
      if (cur < end) g.add(S.pos((cur + end) / 2, 0, h, end - cur));
    }
    /* 巾木 */
    if (o.base !== false) {
      const bm = o.base || K.m(P.woodDark), bh = 0.07;
      g.add(K.box(w, bh, 0.015, bm, 0, 0, -d / 2 + 0.008, { noCast: true }));
      g.add(K.box(0.015, bh, d, bm, -w / 2 + 0.008, 0, 0, { noCast: true }));
      g.add(K.box(0.015, bh, d, bm, w / 2 - 0.008, 0, 0, { noCast: true }));
    }
    return g;
  };

  /* 壁に描く扉（開かない） */
  K.door = function (mat, w, h) {
    const g = new T.Group(); w = w || 0.82; h = h || 2.0;
    g.add(K.box(w + 0.1, h + 0.05, 0.03, K.m(P.white), 0, 0, 0));
    g.add(K.box(w, h, 0.04, mat || K.m(P.woodLight), 0, 0, 0.012));
    g.add(K.box(0.03, 0.12, 0.05, K.m(P.steel, { metal: 0.6, rough: 0.4 }), w / 2 - 0.09, 0.95, 0.04));
    return g;
  };

  /* ---------- 家具 ---------- */
  K.table = function (w, d, h, top, leg) {
    const g = new T.Group(); top = top || K.m(P.wood); leg = leg || top;
    g.add(K.box(w, 0.04, d, top, 0, h - 0.04, 0));
    const lx = w / 2 - 0.06, lz = d / 2 - 0.06;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(K.box(0.05, h - 0.04, 0.05, leg, sx * lx, 0, sz * lz));
    return g;
  };
  K.roundTable = function (r, h, top) {
    const g = new T.Group(); top = top || K.m(P.woodDark);
    g.add(K.cyl(r, 0.04, top, 0, h - 0.04, 0, { seg: 28 }));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.78; g.add(K.box(0.05, h - 0.04, 0.05, top, Math.cos(a) * r * 0.6, 0, Math.sin(a) * r * 0.6)); }
    return g;
  };
  K.chair = function (mat, seatMat) {
    const g = new T.Group(); mat = mat || K.m(P.wood);
    g.add(K.box(0.42, 0.04, 0.4, seatMat || mat, 0, 0.42, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(K.box(0.035, sz < 0 ? 0.88 : 0.42, 0.035, mat, sx * 0.19, 0, sz * 0.18));
    g.add(K.box(0.42, 0.14, 0.03, mat, 0, 0.7, -0.18));
    return g;
  };
  K.stool = function (mat, h) {
    const g = new T.Group(); h = h || 0.45; mat = mat || K.m(P.steelDark);
    g.add(K.cyl(0.16, 0.05, K.m(P.dark), 0, h - 0.05, 0, { seg: 20 }));
    g.add(K.cyl(0.02, h - 0.05, mat, 0, 0, 0));
    g.add(K.cyl(0.15, 0.02, mat, 0, 0, 0, { seg: 20 }));
    return g;
  };
  K.zabuton = function (c) { const m = K.box(0.55, 0.06, 0.55, K.m(c || P.navy), 0, 0, 0); return m; };
  K.shelf = function (w, h, d, mat, rows) {
    const g = new T.Group(); mat = mat || K.m(P.wood); rows = rows || 3;
    g.add(K.box(w, h, 0.02, mat, 0, 0, -d / 2 + 0.01));
    g.add(K.box(0.03, h, d, mat, -w / 2 + 0.015, 0, 0)); g.add(K.box(0.03, h, d, mat, w / 2 - 0.015, 0, 0));
    for (let i = 0; i <= rows; i++) g.add(K.box(w, 0.025, d, mat, 0, i * (h - 0.025) / rows, 0));
    return g;
  };
  K.books = function (w, h, seed) {
    const g = new T.Group(), r = U.rng(seed || 3);
    const cols = [P.red, P.navy, P.green, P.beige, P.offwhite, P.teal, P.woodDark, P.gray, P.yellow];
    let x = -w / 2;
    while (x < w / 2 - 0.03) {
      const bw = 0.018 + r() * 0.03, bh = h * (0.7 + r() * 0.3);
      const b = K.box(bw, bh, 0.14 + r() * 0.03, K.m(K.mixc(U.pick(r, cols), P.beige, 0.35)), x + bw / 2, 0, 0, { noCast: true });
      if (r() < 0.12) b.rotation.z = 0.2;
      g.add(b); x += bw + 0.002;
      if (r() < 0.08) x += 0.06;
    }
    return g;
  };
  K.cabinet = function (w, h, d, mat) {
    const g = new T.Group(); mat = mat || K.m(P.wood);
    g.add(K.box(w, h, d, mat, 0, 0, 0));
    const n = Math.max(1, Math.round(w / 0.45));
    for (let i = 0; i < n; i++) {
      g.add(K.box(w / n - 0.02, h - 0.06, 0.012, K.m(K.shade('#' + mat.color.getHexString(), 1.08)), -w / 2 + (i + 0.5) * w / n, 0.03, d / 2 + 0.002, { noCast: true }));
      g.add(K.box(0.015, 0.08, 0.02, K.m(P.steelDark), -w / 2 + (i + 0.5) * w / n + (i % 2 ? -1 : 1) * (w / n / 2 - 0.05), h * 0.55, d / 2 + 0.014, { noCast: true }));
    }
    return g;
  };
  K.tv = function (w) {
    const g = new T.Group(); w = w || 0.9; const h = w * 0.58;
    g.add(K.box(w, h, 0.04, K.m(P.black, { rough: 0.5 }), 0, 0.1, 0));
    const scr = K.box(w - 0.04, h - 0.04, 0.005, K.m(P.screen, { rough: 0.25, emissive: '#6f8aa0', ei: 0, nocache: true }), 0, 0.12, 0.022, { noShadow: true });
    g.add(scr); g.userData.screen = scr;
    g.add(K.box(0.3, 0.1, 0.16, K.m(P.black), 0, 0, 0));
    return g;
  };
  K.fridge = function () {
    const g = new T.Group(), m = K.m(P.offwhite, { rough: 0.5 });
    g.add(K.box(0.62, 1.72, 0.62, m, 0, 0, 0));
    g.add(K.box(0.6, 0.012, 0.01, K.m(P.gray), 0, 1.12, 0.312, { noCast: true }));
    g.add(K.box(0.02, 0.3, 0.02, K.m(P.steel), 0.24, 1.2, 0.32)); g.add(K.box(0.02, 0.3, 0.02, K.m(P.steel), 0.24, 0.72, 0.32));
    return g;
  };
  K.kitchen = function (w) {
    const g = new T.Group(); w = w || 2.2;
    g.add(K.box(w, 0.82, 0.6, K.m(P.offwhite), 0, 0, 0));
    g.add(K.box(w + 0.02, 0.04, 0.62, K.m(P.steel, { metal: 0.5, rough: 0.35 }), 0, 0.82, 0));
    g.add(K.box(0.6, 0.02, 0.4, K.m(P.steelDark, { metal: 0.5, rough: 0.4 }), -w / 4, 0.845, 0, { noCast: true }));
    g.add(K.rod([-w / 4, 0.86, -0.22], [-w / 4, 1.08, -0.22], 0.012, K.m(P.steel, { metal: 0.7, rough: 0.3 })));
    g.add(K.rod([-w / 4, 1.08, -0.22], [-w / 4, 1.06, -0.08], 0.012, K.m(P.steel, { metal: 0.7, rough: 0.3 })));
    g.add(K.box(0.56, 0.03, 0.42, K.m(P.black, { rough: 0.4 }), w / 4, 0.86, 0, { noCast: true }));
    for (const dx of [-0.13, 0.13]) g.add(K.cyl(0.08, 0.02, K.m(P.steelDark), w / 4 + dx, 0.89, 0.02, { seg: 14 }));
    const pot = K.cyl(0.1, 0.11, K.m(P.steel, { metal: 0.6, rough: 0.35 }), w / 4 - 0.13, 0.91, 0.02); g.add(pot);
    const n = Math.round(w / 0.55);
    for (let i = 0; i < n; i++) g.add(K.box(w / n - 0.02, 0.7, 0.01, K.m(P.white), -w / 2 + (i + 0.5) * w / n, 0.06, 0.305, { noCast: true }));
    /* つり戸棚 */
    g.add(K.box(w, 0.5, 0.34, K.m(P.offwhite), 0, 1.55, -0.13));
    return g;
  };
  K.wallClock = function (hour) {
    const g = new T.Group();
    const face = K.cyl(0.15, 0.02, K.m(P.paper), 0, 0, 0, { seg: 28 }); face.rotation.x = Math.PI / 2; g.add(face);
    const rim = new T.Mesh(new T.TorusGeometry(0.15, 0.012, 8, 28), K.m(P.woodDark)); rim.position.z = 0.02; g.add(rim);
    const hh = K.box(0.012, 0.075, 0.004, K.m(P.black)), mh = K.box(0.008, 0.115, 0.004, K.m(P.black));
    hh.position.z = 0.026; mh.position.z = 0.03; g.add(hh); g.add(mh);
    g.userData.setTime = (h) => { hh.rotation.z = -(h % 12) / 12 * Math.PI * 2; mh.rotation.z = -(h % 1) * Math.PI * 2; };
    g.userData.setTime(hour || 0);
    return g;
  };
  K.calendar = function () {
    const g = new T.Group();
    g.add(K.box(0.3, 0.42, 0.008, K.m(P.paper), 0, 0, 0, { noCast: true }));
    g.add(K.box(0.3, 0.16, 0.009, K.m(K.mixc(P.teal, P.paper, 0.4)), 0, 0.26, 0.001, { noCast: true }));
    for (let i = 0; i < 4; i++) g.add(K.box(0.24, 0.006, 0.01, K.m(P.lightGray), 0, 0.04 + i * 0.05, 0.001, { noCast: true }));
    return g;
  };
  K.photo = function (w, h, tint) {
    const g = new T.Group(); w = w || 0.16; h = h || 0.12;
    g.add(K.box(w, h, 0.015, K.m(P.woodDark), 0, 0, 0));
    g.add(K.box(w - 0.03, h - 0.03, 0.004, K.m(tint || '#b9b1a2', { rough: 0.5 }), 0, 0.015, 0.008, { noCast: true }));
    g.add(K.box(w * 0.3, h * 0.35, 0.002, K.m('#6f6a62'), -w * 0.1, 0.03, 0.011, { noCast: true }));
    g.add(K.box(w * 0.22, h * 0.28, 0.002, K.m('#857e74'), w * 0.14, 0.03, 0.011, { noCast: true }));
    return g;
  };
  K.vase = function (flower, n) {
    const g = new T.Group(), r = U.rng(7 + (n || 0));
    g.add(K.cyl(0.035, 0.14, K.m(P.tileBlue, { rough: 0.35 }), 0, 0, 0, { rTop: 0.028, seg: 14 }));
    const k = n || 4;
    for (let i = 0; i < k; i++) {
      const a = r() * 6.28, lean = 0.03 + r() * 0.06, hh = 0.24 + r() * 0.12;
      const top = [Math.cos(a) * lean, hh, Math.sin(a) * lean];
      g.add(K.rod([0, 0.12, 0], top, 0.004, K.m(P.leafDark), { noCast: true }));
      g.add(K.sph(0.028 + r() * 0.012, K.m(flower || P.yellow), top[0], top[1], top[2], { ws: 8, hs: 6 }));
    }
    return g;
  };
  K.cup = function (c, h) { return K.cyl(0.035, h || 0.075, K.m(c || P.offwhite, { rough: 0.5 }), 0, 0, 0, { rTop: 0.04, seg: 14 }); };
  K.teapot = function (c) {
    const g = new T.Group(), m = K.m(c || P.woodDark, { rough: 0.5 });
    g.add(K.sph(0.07, m, 0, 0.06, 0, { s: [1, 0.8, 1] }));
    g.add(K.rod([0.05, 0.06, 0], [0.12, 0.1, 0], 0.01, m));
    g.add(K.sph(0.014, m, 0, 0.12, 0));
    return g;
  };
  K.bowl = function (c) { return K.cyl(0.03, 0.045, K.m(c || P.black, { rough: 0.5 }), 0, 0, 0, { rTop: 0.06, seg: 16 }); };
  K.plate = function (c, r) { return K.cyl(r || 0.09, 0.012, K.m(c || P.white, { rough: 0.5 }), 0, 0, 0, { seg: 20 }); };
  K.book = function (c) { return K.box(0.14, 0.025, 0.2, K.m(c || P.red), 0, 0, 0); };
  K.paperSheet = function (w, d) { return K.box(w || 0.3, 0.004, d || 0.4, K.m(P.paper), 0, 0, 0, { noCast: true }); };
  K.slippers = function (c) {
    const g = new T.Group();
    for (const sx of [-0.06, 0.06]) g.add(K.box(0.09, 0.03, 0.24, K.m(c || P.beige), sx, 0, 0, { noCast: true }));
    return g;
  };
  K.rug = function (w, d, c) { return K.box(w, 0.012, d, K.m(c || P.cloth), 0, 0, 0, { noCast: true }); };
  K.sofa = function (c) {
    const g = new T.Group(), m = K.m(c || P.cloth);
    g.add(K.box(1.7, 0.4, 0.8, m, 0, 0, 0)); g.add(K.box(1.7, 0.42, 0.2, m, 0, 0.4, -0.3));
    g.add(K.box(0.18, 0.56, 0.8, m, -0.85, 0, 0)); g.add(K.box(0.18, 0.56, 0.8, m, 0.85, 0, 0));
    g.add(K.box(0.4, 0.12, 0.4, K.m(K.mixc(c || P.cloth, P.navy, 0.5)), -0.5, 0.42, 0.05));
    return g;
  };

  /* 明かり。lampOn（0〜1）で灯る */
  K.ceilingLamp = function (kind) {
    const g = new T.Group();
    const warm = kind !== 'cool' && kind !== 'panel';
    const m = K.m(warm ? P.lampWarm : P.lampCool, { emissive: warm ? P.lampWarm : P.lampCool, ei: 0, nocache: true });
    let shade;
    if (kind === 'panel') { shade = K.box(1.1, 0.03, 0.3, m, 0, -0.03, 0, { noShadow: true }); }
    else if (kind === 'washi') { g.add(K.box(0.5, 0.02, 0.5, K.m(P.woodDark), 0, -0.02, 0, { noShadow: true })); shade = K.box(0.44, 0.14, 0.44, m, 0, -0.16, 0, { noShadow: true }); }
    else { shade = K.cyl(0.22, 0.06, m, 0, -0.06, 0, { seg: 24, noShadow: true }); }
    g.add(shade);
    const pl = new T.PointLight(warm ? 0xffd2a0 : 0xe8f0ff, 0, 9, 1.6);
    pl.position.y = -0.3; pl.castShadow = false; g.add(pl);
    g.userData.setLamp = (v, power) => { m.emissiveIntensity = v * 1.6; pl.intensity = v * (power || 9); };
    return g;
  };
  K.standLamp = function () {
    const g = new T.Group();
    g.add(K.cyl(0.06, 0.02, K.m(P.dark), 0, 0, 0)); g.add(K.cyl(0.008, 0.26, K.m(P.dark), 0, 0.02, 0));
    const m = K.m(P.lampWarm, { emissive: P.lampWarm, ei: 0, nocache: true });
    g.add(K.cyl(0.09, 0.12, m, 0, 0.26, 0, { rTop: 0.06, seg: 16, noShadow: true }));
    const pl = new T.PointLight(0xffc98a, 0, 4.5, 1.8); pl.position.y = 0.3; g.add(pl);
    g.userData.setLamp = (v, power) => { m.emissiveIntensity = v * 1.3; pl.intensity = v * (power || 3); };
    return g;
  };

  /* 寝台（ふつうのベッド） */
  K.bed = function (o) {
    o = o || {}; const g = new T.Group();
    const w = o.w || 1.0, l = o.l || 2.0, h = o.h || 0.42;
    const fm = o.frame || K.m(P.wood);
    g.add(K.box(w + 0.06, h - 0.16, l + 0.06, fm, 0, 0.06, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(K.box(0.06, 0.1, 0.06, fm, sx * (w / 2 - 0.02), 0, sz * (l / 2 - 0.02)));
    g.add(K.box(w + 0.06, o.head || 0.5, 0.05, fm, 0, h - 0.1, l / 2 + 0.03));
    g.add(K.box(w, 0.16, l, o.sheet || K.m(P.sheet), 0, h - 0.1, 0));
    const pl = K.sph(0.22, o.pillowM || K.m(P.pillow), 0, h + 0.1, l / 2 - 0.28, { s: [1.25, 0.34, 0.8] }); g.add(pl);
    return g;
  };
  /* 病院の寝台。頭側が +Z */
  K.hospitalBed = function (o) {
    o = o || {}; const g = new T.Group(), st = K.m(P.offwhite, { rough: 0.5 }), dk = K.m(P.steelDark, { metal: 0.4, rough: 0.5 });
    const w = 0.95, l = 2.05, h = 0.55;
    g.add(K.box(w, 0.06, l, dk, 0, h - 0.2, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      g.add(K.box(0.04, h - 0.26, 0.04, dk, sx * (w / 2 - 0.05), 0.06, sz * (l / 2 - 0.12)));
      const wh = K.cyl(0.05, 0.03, K.m(P.dark), sx * (w / 2 - 0.05), 0.05, sz * (l / 2 - 0.12), { seg: 12 }); wh.rotation.z = sx * Math.PI / 2; g.add(wh);
    }
    g.add(K.box(w, 0.14, l, K.m(P.sheet), 0, h - 0.14, 0));
    g.add(K.box(w + 0.04, 0.52, 0.04, st, 0, h - 0.18, l / 2 + 0.03));       // 頭の板
    g.add(K.box(w + 0.04, 0.4, 0.04, st, 0, h - 0.18, -l / 2 - 0.03));        // 足の板
    if (o.rails !== false) {
      for (const sx of [-1, 1]) {
        const x = sx * (w / 2 + 0.02);
        g.add(K.rod([x, h + 0.28, 0.75], [x, h + 0.28, -0.1], 0.012, st));
        for (const z of [0.75, 0.33, -0.1]) g.add(K.rod([x, h, z], [x, h + 0.28, z], 0.01, st));
      }
    }
    g.add(K.sph(0.22, K.m(P.pillow), 0, h + 0.07, l / 2 - 0.26, { s: [1.3, 0.34, 0.8] }));
    return g;
  };
  K.futon = function (sheetC) {
    const g = new T.Group();
    g.add(K.box(1.0, 0.09, 2.0, K.m(sheetC || P.sheet), 0, 0, 0));
    g.add(K.sph(0.2, K.m(P.pillow), 0, 0.13, 0.75, { s: [1.2, 0.32, 0.75] }));
    return g;
  };
  K.ivPole = function () {
    const g = new T.Group(), m = K.m(P.steel, { metal: 0.6, rough: 0.35 });
    g.add(K.cyl(0.012, 1.75, m, 0, 0.06, 0));
    for (let i = 0; i < 5; i++) { const a = i * 1.2566; g.add(K.rod([0, 0.07, 0], [Math.cos(a) * 0.26, 0.04, Math.sin(a) * 0.26], 0.012, m)); }
    g.add(K.rod([-0.12, 1.8, 0], [0.12, 1.8, 0], 0.008, m));
    const bag = K.box(0.11, 0.18, 0.03, K.m('#e6eef0', { transparent: true, opacity: 0.75, rough: 0.2 }), 0.1, 1.56, 0); K.noAO(bag); g.add(bag);
    g.add(K.rod([0.1, 1.56, 0], [0.1, 1.42, 0], 0.003, K.m(P.lightGray), { noCast: true }));
    g.add(K.cyl(0.012, 0.05, K.m('#e6eef0', { transparent: true, opacity: 0.6 }), 0.1, 1.37, 0));
    g.add(K.rod([0.1, 1.37, 0], [0.16, 0.9, 0.1], 0.003, K.m(P.lightGray), { noCast: true }));
    return g;
  };
  /* 心電図の画面。動く波形 */
  K.monitor = function () {
    const g = new T.Group();
    g.add(K.box(0.36, 0.28, 0.08, K.m(P.offwhite, { rough: 0.5 }), 0, 0, 0));
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 192;
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
    const scr = new T.Mesh(new T.PlaneGeometry(0.31, 0.22), new T.MeshBasicMaterial({ map: tex, toneMapped: false }));
    scr.position.set(0, 0.14, 0.042); g.add(scr);
    const ctx = cv.getContext('2d'); let x = 0, lastY = 60, phase = 0;
    ctx.fillStyle = '#0b1114'; ctx.fillRect(0, 0, 256, 192);
    g.userData.state = { bpm: 72, flat: 0, spo2: 97 };
    g.userData.tick = (dt) => {
      const s = g.userData.state, step = 90 * dt;
      const n = Math.max(1, Math.round(step));
      for (let i = 0; i < n; i++) {
        phase += (s.bpm / 60) / 90;
        const p = phase % 1; let y = 0;
        if (p > 0.10 && p < 0.16) y = -5 * Math.sin((p - 0.10) / 0.06 * Math.PI);
        else if (p > 0.20 && p < 0.23) y = 6 * (p - 0.20) / 0.03;
        else if (p >= 0.23 && p < 0.26) y = 6 - 46 * (p - 0.23) / 0.03;
        else if (p >= 0.26 && p < 0.30) y = -40 + 52 * (p - 0.26) / 0.04;
        else if (p >= 0.30 && p < 0.33) y = 12 - 12 * (p - 0.30) / 0.03;
        else if (p > 0.42 && p < 0.56) y = -9 * Math.sin((p - 0.42) / 0.14 * Math.PI);
        y *= (1 - s.flat);
        const yy = 62 + y;
        ctx.fillStyle = '#0b1114'; ctx.fillRect(x, 0, 10, 110);
        ctx.strokeStyle = '#59e08a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 1, lastY); ctx.lineTo(x, yy); ctx.stroke();
        lastY = yy; x += 1; if (x >= 256) { x = 0; }
      }
      ctx.fillStyle = '#0b1114'; ctx.fillRect(0, 112, 256, 80);
      ctx.font = '600 44px ui-monospace, Menlo, monospace'; ctx.fillStyle = '#59e08a'; ctx.fillText(String(Math.round(s.bpm * (1 - s.flat))).padStart(3, ' '), 14, 168);
      ctx.fillStyle = '#6fc3e8'; ctx.fillText(String(Math.round(s.spo2)), 150, 168);
      tex.needsUpdate = true;
      return phase;
    };
    return g;
  };
  K.curtain = function (w, h, c) {
    const g = new T.Group(), m = K.m(c || P.beige, { double: true });
    const n = Math.max(3, Math.round(w / 0.12));
    for (let i = 0; i < n; i++) {
      const b = K.box(w / n * 1.05, h, 0.03, m, -w / 2 + (i + 0.5) * w / n, 0, (i % 2 ? 0.025 : -0.025));
      b.rotation.y = (i % 2 ? 0.5 : -0.5); g.add(b);
    }
    return g;
  };
  K.wheelchair = function () {
    const g = new T.Group(), m = K.m(P.steelDark, { metal: 0.5, rough: 0.4 });
    g.add(K.box(0.46, 0.04, 0.42, K.m(P.navy), 0, 0.48, 0)); g.add(K.box(0.46, 0.42, 0.03, K.m(P.navy), 0, 0.52, -0.21));
    for (const sx of [-1, 1]) {
      const wh = new T.Mesh(new T.TorusGeometry(0.29, 0.018, 8, 24), K.m(P.dark)); wh.position.set(sx * 0.28, 0.3, -0.08); wh.rotation.y = Math.PI / 2; wh.castShadow = true; g.add(wh);
      g.add(K.rod([sx * 0.25, 0.5, -0.2], [sx * 0.25, 0.95, -0.26], 0.012, m));
      g.add(K.rod([sx * 0.25, 0.66, -0.2], [sx * 0.25, 0.66, 0.2], 0.012, m));
      g.add(K.rod([sx * 0.2, 0.48, 0.2], [sx * 0.2, 0.12, 0.34], 0.012, m));
    }
    return g;
  };

  /* ---------- 人 ---------- */
  K.figure = function (o) {
    o = o || {};
    const s = (o.h || 1.6) / 1.6, pose = o.pose || 'stand';
    const skin = K.m(o.skin || P.skin, { rough: 0.8 }), top = K.m(o.top || P.beige), bottom = K.m(o.bottom || P.navy);
    const hair = K.m(o.hair || P.hair, { rough: 0.95 });
    const root = new T.Group(), hips = new T.Group(); root.add(hips);
    const spine = new T.Group(); hips.add(spine);
    const child = !!o.child;
    const torso = K.cap(0.125, 0.28, top, 0, 0.27, 0); torso.scale.set(1.05, 1, 0.7); spine.add(torso);
    const shoulders = K.cap(0.058, 0.2, top, 0, 0.44, 0); shoulders.rotation.z = Math.PI / 2; shoulders.scale.set(1, 1, 0.9); spine.add(shoulders);
    const neck = K.cyl(0.04, 0.07, skin, 0, 0.5, 0); spine.add(neck);
    const head = new T.Group(); head.position.set(0, 0.64, 0.01); spine.add(head);
    const hs = child ? 1.18 : 1;
    head.add(K.sph(0.1 * hs, skin, 0, 0, 0, { s: [0.92, 1.08, 1] }));
    const hc = K.sph(0.105 * hs, hair, 0, 0.018, -0.014, { s: [0.96, 1.02, 1.0] }); head.add(hc);
    hc.geometry.dispose(); hc.geometry = new T.SphereGeometry(0.105 * hs, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56);
    if (o.long) head.add(K.sph(0.1 * hs, hair, 0, -0.07, -0.035, { s: [0.95, 1.1, 0.7] }));
    const mkArm = (sx) => {
      const sh = new T.Group(); sh.position.set(sx * 0.175, 0.43, 0); spine.add(sh);
      sh.add(K.cap(0.042, 0.2, top, 0, -0.13, 0));
      const el = new T.Group(); el.position.set(0, -0.27, 0); sh.add(el);
      el.add(K.cap(0.036, 0.19, top, 0, -0.12, 0));
      el.add(K.sph(0.042, skin, 0, -0.26, 0, { s: [0.8, 1.1, 1] }));
      return { sh, el };
    };
    const aL = mkArm(-1), aR = mkArm(1);
    const mkLeg = (sx) => {
      const hp = new T.Group(); hp.position.set(sx * 0.085, 0, 0); hips.add(hp);
      hp.add(K.cap(0.068, 0.3, bottom, 0, -0.21, 0));
      const kn = new T.Group(); kn.position.set(0, -0.42, 0); hp.add(kn);
      kn.add(K.cap(0.052, 0.3, bottom, 0, -0.2, 0));
      kn.add(K.box(0.085, 0.06, 0.2, K.m(o.shoe || P.dark), 0, -0.45, 0.045));
      return { hp, kn };
    };
    const lL = mkLeg(-1), lR = mkLeg(1);
    hips.position.y = 0.9;
    aL.sh.rotation.z = -0.07; aR.sh.rotation.z = 0.07;
    if (o.old) { spine.rotation.x = 0.22; head.rotation.x = -0.12; }
    if (pose === 'sit' || pose === 'lean') {
      hips.position.y = o.seat != null ? o.seat + 0.07 : 0.52;
      for (const L of [lL, lR]) { L.hp.rotation.x = -Math.PI / 2 + 0.06; L.kn.rotation.x = Math.PI / 2 - 0.06; }
      aL.sh.rotation.x = -0.35; aL.el.rotation.x = -0.95; aR.sh.rotation.x = -0.35; aR.el.rotation.x = -0.95;
      spine.rotation.x = (o.old ? 0.26 : 0.08);
      if (pose === 'lean') {
        spine.rotation.x = 0.42; head.rotation.x = -0.1;
        aR.sh.rotation.x = -1.15; aR.el.rotation.x = -0.35; aR.sh.rotation.z = -0.12;
      }
    } else if (pose === 'seiza') {
      hips.position.y = 0.3;
      for (const L of [lL, lR]) { L.hp.rotation.x = -Math.PI / 2 + 0.2; L.kn.rotation.x = Math.PI * 0.86; }
      aL.sh.rotation.x = -0.3; aL.el.rotation.x = -0.8; aR.sh.rotation.x = -0.3; aR.el.rotation.x = -0.8;
      spine.rotation.x = 0.16;
    } else if (pose === 'walk') {
      lL.hp.rotation.x = -0.35; lL.kn.rotation.x = 0.25; lR.hp.rotation.x = 0.3; lR.kn.rotation.x = 0.35;
      aL.sh.rotation.x = 0.35; aR.sh.rotation.x = -0.35; aL.el.rotation.x = -0.3; aR.el.rotation.x = -0.3;
    } else if (pose === 'bow') {
      spine.rotation.x = 0.5; head.rotation.x = 0.2;
    }
    root.scale.setScalar(s * (child ? 0.68 : 1));
    root.userData.parts = { hips, spine, head, aL, aR, lL, lR };
    const ph = Math.random() * 6;
    const base = { sx: spine.rotation.x, hy: head.rotation.y, hx: head.rotation.x, ar: aR.el.rotation.x };
    root.userData.tick = (t) => {
      spine.rotation.x = base.sx + Math.sin(t * 0.9 + ph) * 0.012;
      head.rotation.y = base.hy + Math.sin(t * 0.23 + ph) * 0.1 + (root.userData.lookY || 0);
      head.rotation.x = base.hx + Math.sin(t * 0.31 + ph * 2) * 0.03;
      if (pose === 'lean') aR.el.rotation.x = base.ar + Math.sin(t * 0.7 + ph) * 0.05;
    };
    return root;
  };

  /* ---------- 自分の体（一人称で見える） ----------
     原点は目。前は −Z。 */
  function hand(skinM, side) {
    const g = new T.Group();
    g.add(K.sph(0.046, skinM, 0, 0, 0, { s: [0.95, 0.3, 1.15], ws: 12, hs: 8 }));
    for (let i = 0; i < 4; i++) {
      const x = -0.03 + i * 0.02, spread = (i - 1.5) * 0.07, len = (i === 1 || i === 2) ? 0.044 : 0.037;
      const f = new T.Group(); f.position.set(x, 0.002, -0.045); f.rotation.y = -spread; f.rotation.x = -0.18; g.add(f);
      const p1 = K.cap(0.0088, len, skinM, 0, 0, -len / 2 - 0.006); p1.rotation.x = Math.PI / 2; f.add(p1);
      const k = new T.Group(); k.position.set(0, 0, -len - 0.012); k.rotation.x = -0.35; f.add(k);
      const p2 = K.cap(0.0078, len * 0.75, skinM, 0, 0, -len * 0.4); p2.rotation.x = Math.PI / 2; k.add(p2);
    }
    const t = new T.Group(); t.position.set(side * -0.04, 0, -0.005); t.rotation.y = side * 0.75; g.add(t);
    const th = K.cap(0.0105, 0.04, skinM, 0, 0, -0.03); th.rotation.x = Math.PI / 2; t.add(th);
    return g;
  }
  function arm(skinM, sleeveM, from, to, side) {
    const g = new T.Group();
    const a = new T.Vector3().fromArray(from), b = new T.Vector3().fromArray(to);
    const mid = a.clone().lerp(b, 0.82);
    g.add(K.rod(from, mid.toArray(), 0.043, sleeveM, { seg: 12 }));
    g.add(K.rod(mid.toArray(), to, 0.03, skinM, { seg: 10 }));
    const h = hand(skinM, side);
    h.position.copy(b);
    const dir = b.clone().sub(a).normalize();
    h.rotation.y = Math.atan2(-dir.x, -dir.z);
    g.add(h);
    return g;
  }
  K.body = function (kind, o) {
    o = o || {};
    const g = new T.Group();
    const skinM = K.m(o.skin || P.skin, { rough: 0.8 }), sleeveM = K.m(o.sleeve || P.blanket), legM = K.m(o.legs || P.navy);
    if (kind === 'lie' || kind === 'lieUp') {
      if (kind === 'lieUp') g.position.set(0, -0.2, -0.06);
      const bm = K.m(o.blanket || P.blanket);
      const b1 = K.sph(0.5, bm, 0, -0.34, -1.05, { s: [0.92, 0.36, 1.9], ws: 20, hs: 14 }); g.add(b1);
      const b2 = K.sph(0.2, bm, 0, -0.2, -1.78, { s: [1.5, 0.75, 0.8] }); g.add(b2);      // 足先のふくらみ
      const b3 = K.sph(0.3, bm, 0, -0.26, -0.42, { s: [1.3, 0.5, 0.9] }); g.add(b3);      // 胸
      g.add(arm(skinM, sleeveM, [-0.3, -0.19, -0.28], [-0.13, -0.135, -0.68], -1));
      g.add(arm(skinM, sleeveM, [0.3, -0.19, -0.28], [0.15, -0.135, -0.7], 1));
    } else if (kind === 'sit') {
      for (const sx of [-1, 1]) {
        g.add(K.rod([sx * 0.11, -0.6, 0.02], [sx * 0.13, -0.57, -0.44], 0.078, legM, { seg: 12 }));
        g.add(K.sph(0.08, legM, sx * 0.13, -0.57, -0.44));
        g.add(K.rod([sx * 0.13, -0.6, -0.45], [sx * 0.13, -1.0, -0.5], 0.058, legM, { seg: 10 }));
      }
      if (o.blanket) g.add(K.sph(0.3, K.m(o.blanket), 0, -0.56, -0.25, { s: [1.0, 0.3, 1.0] }));
      g.add(arm(skinM, sleeveM, [-0.26, -0.36, -0.02], [-0.13, o.blanket ? -0.46 : -0.49, -0.32], -1));
      g.add(arm(skinM, sleeveM, [0.26, -0.36, -0.02], [0.13, o.blanket ? -0.46 : -0.49, -0.33], 1));
      g.add(K.sph(0.2, sleeveM, 0, -0.5, 0.08, { s: [1.1, 1.2, 0.7] }));
    } else if (kind === 'bath') {
      for (const sx of [-1, 1]) g.add(K.sph(0.06, skinM, sx * 0.1, -0.4, -0.62, { s: [1, 0.8, 1.4] }));
      g.add(arm(skinM, skinM, [-0.3, -0.36, -0.12], [-0.33, -0.285, -0.6], -1));
      g.add(arm(skinM, skinM, [0.3, -0.36, -0.12], [0.33, -0.285, -0.6], 1));
    } else if (kind === 'car') {
      g.add(arm(skinM, sleeveM, [-0.25, -0.42, -0.02], [-0.15, -0.13, -0.47], -1));
      g.add(arm(skinM, sleeveM, [0.25, -0.42, -0.02], [0.15, -0.13, -0.47], 1));
      for (const sx of [-1, 1]) g.add(K.rod([sx * 0.11, -0.72, 0.02], [sx * 0.13, -0.66, -0.4], 0.075, legM, { seg: 10 }));
    } else if (kind === 'stand') {
      for (const sx of [-1, 1]) g.add(K.box(0.095, 0.07, 0.25, K.m(o.shoe || P.dark), sx * 0.09, -(o.eye || 1.5), -0.08, { noCast: true }));
      g.add(K.cap(0.16, 0.5, sleeveM, 0, -0.62, 0.06));
      g.children[g.children.length - 1].scale.set(1.1, 1, 0.75);
    }
    g.traverse(m => { if (m.isMesh) { m.castShadow = false; } });
    return g;
  };

  /* ---------- 記憶の灯 ---------- */
  K.memoryLight = function () {
    const g = new T.Group();
    const core = new T.Mesh(new T.SphereGeometry(0.03, 12, 10), new T.MeshBasicMaterial({ color: 0xffe2b0, toneMapped: false }));
    g.add(core);
    const sm = new T.SpriteMaterial({ map: K.tex.glow(), color: 0xffc27a, transparent: true, opacity: 0.85, depthWrite: false, depthTest: true, blending: T.AdditiveBlending, fog: false });
    const sp = new T.Sprite(sm); sp.scale.setScalar(0.5); g.add(sp);
    const halo = new T.Sprite(sm.clone()); halo.material.opacity = 0.2; halo.scale.setScalar(1.3); g.add(halo);
    g.traverse(o => { o.userData.noAO = true; });
    g.userData.noAO = true;
    const ph = Math.random() * 6; let gaze = 0, alive = 1, appear = 0;
    g.userData.setGaze = (v) => { gaze = v; };
    g.userData.vanish = () => { alive = 0; };
    g.userData.tick = (t, dt, dist) => {
      appear = Math.min(1, appear + dt * 0.8);
      const a = alive ? appear : Math.max(0, (g.userData.fade != null ? g.userData.fade : 1) - dt * 1.6);
      g.userData.fade = a;
      const sc = U.clamp((dist || 3) / 3, 0.6, 3.2);
      const pulse = 1 + Math.sin(t * 1.6 + ph) * 0.12;
      core.scale.setScalar(sc * (1 + gaze * 1.2) * a);
      sp.scale.setScalar(0.62 * sc * pulse * (1 + gaze * 1.4) * a);
      halo.scale.setScalar(1.7 * sc * (1 + gaze * 2.4) * a);
      sp.material.opacity = 0.85 * a; halo.material.opacity = (0.16 + gaze * 0.3) * a;
      g.position.y = g.userData.baseY + Math.sin(t * 0.7 + ph) * 0.025;
      g.visible = a > 0.01;
    };
    return g;
  };
})(window.SI);
