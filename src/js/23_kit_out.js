'use strict';
/* 最期の一日 — 外の部品（地面、山なみ、木、石、家、道、車） */
(function (SI) {
  const T = window.THREE, U = SI.U, K = SI.Kit, P = K.P;

  /* 季節と天気で変わる色 */
  K.seasonal = function (c) {
    const s = c.season, snowy = c.weather === 'snow';
    return {
      snowy,
      grass: snowy ? P.snow : (s === 'winter' ? P.grassWinter : (s === 'autumn' ? K.mixc(P.grass, P.grassDry, 0.55) : (s === 'spring' ? K.mixc(P.grass, P.leafLight, 0.35) : P.grass))),
      soil: snowy ? K.mixc(P.snow, P.soil, 0.12) : P.soil,
      leaf: s === 'spring' ? K.mixc(P.leaf, P.leafLight, 0.6) : (s === 'summer' ? P.leaf : (s === 'autumn' ? K.mixc(P.orange, P.leaf, 0.3) : P.bare)),
      field: snowy ? P.snow : (s === 'spring' ? '#7d9a5a' : (s === 'summer' ? '#5f8f45' : (s === 'autumn' ? '#c2a653' : '#8c7f62'))),
      hill: snowy ? '#c9d2d8' : (s === 'autumn' ? '#7d7a58' : (s === 'winter' ? '#6f7466' : '#5c7a58')),
      hillFar: snowy ? '#dfe6ea' : '#7f93a2',
      roofSnow: snowy
    };
  };

  K.ground = function (size, color, y, repN) {
    const m = K.mTex(K.tex.rep(K.tex.noise(color, 0.1), repN || size / 4, repN || size / 4), { rough: 1 });
    return K.plane(size, size, m, 0, y || 0, 0);
  };

  /* 遠くの山なみ。原点を囲む輪 */
  K.ridge = function (o) {
    const r = o.r || 220, n = o.n || 36, rng = U.rng(o.seed || 5);
    const pos = [], idx = [];
    const a0 = o.from != null ? o.from : 0, a1 = o.to != null ? o.to : Math.PI * 2;
    let h = U.lerp(o.hMin, o.hMax, rng());
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      h = U.clamp(h + (rng() - 0.5) * (o.hMax - o.hMin) * (o.rough || 0.7), o.hMin, o.hMax);
      const rr = r * (0.94 + rng() * 0.12);
      pos.push(Math.cos(a) * rr, -8, Math.sin(a) * rr, Math.cos(a) * rr * 0.97, h, Math.sin(a) * rr * 0.97);
      if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshLambertMaterial({ color: o.color || P.hill || '#5c7a58', side: T.DoubleSide, flatShading: true }));
    m.userData.noAO = true;
    return m;
  };

  function blob(r, mat, x, y, z, rng, sq) {
    const g = new T.IcosahedronGeometry(r, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + (Math.sin(p.getX(i) * 12.3 + p.getY(i) * 7.1 + p.getZ(i) * 9.7 + r * 31) * 0.5) * 0.22;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * (sq || 0.8), p.getZ(i) * k);
    }
    g.computeVertexNormals();
    const m = new T.Mesh(g, mat); m.position.set(x, y, z); m.rotation.y = rng() * 6.28;
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  K.blob = blob;

  /* 木。kind: broad / sakura / momiji / ginkgo / pine / conifer */
  K.tree = function (o) {
    o = o || {};
    const g = new T.Group(), rng = U.rng(o.seed || 1), h = o.h || 5, kind = o.kind || 'broad';
    const season = o.season || 'summer', snowy = o.weather === 'snow';
    const trunkM = K.m(kind === 'sakura' ? '#4a3b33' : P.trunk, { flat: true });
    const evergreen = (kind === 'pine' || kind === 'conifer');
    if (kind === 'conifer') {
      g.add(K.cyl(h * 0.035, h * 0.3, trunkM, 0, 0, 0, { seg: 7, rTop: h * 0.028 }));
      const lm = K.m(snowy ? K.mixc(P.leafDark, P.snow, 0.55) : P.leafDark, { flat: true });
      for (let i = 0; i < 4; i++) {
        const y = h * (0.2 + i * 0.19), rr = h * (0.24 - i * 0.045);
        const c = new T.Mesh(new T.ConeGeometry(rr, h * 0.3, 8), lm); c.position.y = y + h * 0.15; c.castShadow = true; c.receiveShadow = true; g.add(c);
      }
      g.userData.foliage = null;
      return g;
    }
    const lean = (rng() - 0.5) * 0.25;
    const th = h * (kind === 'pine' ? 0.6 : 0.45);
    const top = [lean * th, th, (rng() - 0.5) * 0.2 * th];
    g.add(K.rod([0, 0, 0], top, h * 0.035, trunkM, { seg: 7 }));
    const base = K.cyl(h * 0.05, h * 0.08, trunkM, 0, 0, 0, { seg: 7, rTop: h * 0.036 }); g.add(base);
    let leafC;
    if (evergreen) leafC = '#3f6a3a';
    else if (season === 'spring') leafC = kind === 'sakura' ? P.sakura : K.mixc(P.leaf, P.leafLight, 0.7);
    else if (season === 'summer') leafC = kind === 'sakura' ? P.leaf : (kind === 'momiji' ? K.mixc(P.leaf, P.leafLight, 0.4) : P.leaf);
    else if (season === 'autumn') leafC = kind === 'momiji' ? P.momiji : (kind === 'ginkgo' ? P.ginkgo : (kind === 'sakura' ? '#b0683a' : K.mixc(P.orange, P.leaf, 0.45)));
    else leafC = null;
    if (snowy && leafC) leafC = K.mixc(leafC, P.snow, 0.5);
    const fol = new T.Group(); g.add(fol);
    const nb = kind === 'pine' ? 4 : 5 + Math.floor(rng() * 3);
    for (let i = 0; i < nb; i++) {
      const a = i / nb * 6.28 + rng(), spread = h * (0.16 + rng() * 0.16), up = h * (0.12 + rng() * 0.3);
      const end = [top[0] + Math.cos(a) * spread, top[1] + up, top[2] + Math.sin(a) * spread];
      g.add(K.rod(top, end, h * 0.014, trunkM, { seg: 5 }));
      if (leafC) {
        const lm = K.m(K.shade(leafC, 0.9 + rng() * 0.2), { flat: true });
        const rr = h * (kind === 'pine' ? 0.13 : 0.17 + rng() * 0.07);
        fol.add(blob(rr, lm, end[0], end[1] + rr * 0.3, end[2], rng, kind === 'pine' ? 0.5 : 0.8));
      } else {
        for (let k = 0; k < 3; k++) {
          const e2 = [end[0] + (rng() - 0.5) * h * 0.2, end[1] + rng() * h * 0.16, end[2] + (rng() - 0.5) * h * 0.2];
          g.add(K.rod(end, e2, h * 0.007, trunkM, { seg: 4 }));
          if (snowy) g.add(K.sph(h * 0.022, K.m(P.snow), e2[0], e2[1], e2[2], { ws: 6, hs: 5 }));
        }
      }
    }
    if (leafC) {
      const lm = K.m(leafC, { flat: true });
      fol.add(blob(h * 0.2, lm, top[0], top[1] + h * 0.34, top[2], rng, 0.8));
    }
    g.userData.foliage = fol;
    return g;
  };

  K.bush = function (c, r, seed) {
    const g = new T.Group(), rng = U.rng(seed || 2), m = K.m(c || P.leafDark, { flat: true });
    r = r || 0.5;
    g.add(blob(r, m, 0, r * 0.55, 0, rng, 0.7));
    g.add(blob(r * 0.7, m, r * 0.7, r * 0.4, r * 0.2, rng, 0.7));
    g.add(blob(r * 0.6, m, -r * 0.6, r * 0.35, -r * 0.3, rng, 0.7));
    return g;
  };
  K.rock = function (r, c, seed) {
    const rng = U.rng(seed || 4);
    const m = blob(r, K.m(c || '#8a8a84', { flat: true }), 0, r * 0.35, 0, rng, 0.6);
    return m;
  };
  K.stoneLantern = function () {
    const g = new T.Group(), m = K.m('#9a9a92', { flat: true });
    g.add(K.cyl(0.2, 0.1, m, 0, 0, 0, { seg: 6 }));
    g.add(K.cyl(0.07, 0.55, m, 0, 0.1, 0, { seg: 6 }));
    g.add(K.cyl(0.2, 0.06, m, 0, 0.65, 0, { seg: 6 }));
    const lm = K.m(P.lampWarm, { emissive: P.lampWarm, ei: 0, nocache: true });
    g.add(K.box(0.2, 0.2, 0.2, m, 0, 0.71, 0));
    g.add(K.box(0.12, 0.12, 0.21, lm, 0, 0.75, 0, { noShadow: true })); g.add(K.box(0.21, 0.12, 0.12, lm, 0, 0.75, 0, { noShadow: true }));
    const roof = new T.Mesh(new T.ConeGeometry(0.3, 0.2, 6), m); roof.position.y = 1.01; roof.castShadow = true; g.add(roof);
    g.add(K.sph(0.05, m, 0, 1.14, 0, { ws: 6, hs: 5 }));
    g.userData.setLamp = (v) => { lm.emissiveIntensity = v * 1.2; };
    return g;
  };
  K.fence = function (len, h, c, slats) {
    const g = new T.Group(), m = K.m(c || P.woodDark);
    if (slats) {
      const n = Math.round(len / 0.12);
      for (let i = 0; i < n; i++) g.add(K.box(0.09, h, 0.02, m, -len / 2 + (i + 0.5) * len / n, 0, 0));
      g.add(K.box(len, 0.05, 0.04, m, 0, h * 0.25, 0.02)); g.add(K.box(len, 0.05, 0.04, m, 0, h * 0.8, 0.02));
    } else {
      g.add(K.box(len, h, 0.05, m, 0, 0, 0));
      const n = Math.round(len / 1.8);
      for (let i = 0; i <= n; i++) g.add(K.box(0.09, h + 0.1, 0.09, m, -len / 2 + i * len / n, 0, 0));
    }
    return g;
  };
  K.blockWall = function (len, h) {
    const m = K.mTex(K.tex.rep(K.tex.tile('#b3b1aa', 4), len / 1.6, h / 0.8));
    return K.box(len, h, 0.12, m, 0, 0, 0);
  };

  /* 家（遠景・近景）。切妻屋根 */
  K.house = function (o) {
    o = o || {};
    const g = new T.Group(), w = o.w || 7, d = o.d || 6, h = o.h || 3, rh = o.rh || 1.6;
    const wm = K.m(o.wall || P.wallWarm), rm = K.m(o.snow ? P.snow : (o.roof || P.roof), { flat: true });
    g.add(K.box(w, h, d, wm, 0, 0, 0));
    const shape = new T.Shape(); shape.moveTo(-w / 2 - 0.4, 0); shape.lineTo(w / 2 + 0.4, 0); shape.lineTo(0, rh); shape.closePath();
    const rg = new T.ExtrudeGeometry(shape, { depth: d + 0.6, bevelEnabled: false }); rg.translate(0, h, -d / 2 - 0.3);
    const roof = new T.Mesh(rg, rm); roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
    const winM = K.m('#7f909c', { rough: 0.3, emissive: P.lampWarm, ei: 0, nocache: true });
    const nw = Math.max(1, Math.floor(w / 2.4));
    for (let i = 0; i < nw; i++) {
      g.add(K.box(1.1, 0.9, 0.04, winM, -w / 2 + (i + 0.5) * w / nw, h * 0.42, d / 2 + 0.01, { noShadow: true }));
      g.add(K.box(1.1, 0.9, 0.04, winM, -w / 2 + (i + 0.5) * w / nw, h * 0.42, -d / 2 - 0.01, { noShadow: true }));
    }
    g.userData.setLamp = (v) => { winM.emissiveIntensity = v * 0.9; };
    return g;
  };
  /* 建物（箱）。窓の模様つき */
  K.building = function (w, h, d, c, seed) {
    const g = new T.Group(), rng = U.rng(seed || 9);
    const rx = Math.max(1, Math.round(w / 6)), ry = Math.max(1, Math.round(h / 6)), rz = Math.max(1, Math.round(d / 6));
    const base = K.tex.facade(c || '#b9b6ad', false), lit = K.tex.facade(c || '#b9b6ad', true);
    const mk = (a, b) => {
      const m = new T.MeshStandardMaterial({ map: K.tex.rep(base, a, b), emissiveMap: K.tex.rep(lit, a, b), emissive: new T.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.85 });
      return m;
    };
    const mx = mk(rx, ry), mz = mk(rz, ry), top = K.m(K.shade(c || '#b9b6ad', 0.8));
    const geo = new T.BoxGeometry(w, h, d); geo.translate(0, h / 2, 0);
    const mesh = new T.Mesh(geo, [mz, mz, top, top, mx, mx]); mesh.castShadow = true; mesh.receiveShadow = true;
    g.add(mesh);
    if (rng() < 0.6) g.add(K.box(w * 0.3, 1.2, d * 0.3, top, (rng() - 0.5) * w * 0.4, h, (rng() - 0.5) * d * 0.4));
    g.userData.setLamp = (v) => { mx.emissiveIntensity = v * 0.9; mz.emissiveIntensity = v * 0.9; };
    return g;
  };

  /* 電柱と電線 */
  K.pole = function (h) {
    const g = new T.Group(), m = K.m('#77736b'); h = h || 8;
    g.add(K.cyl(0.13, h, m, 0, 0, 0, { seg: 8, rTop: 0.09 }));
    g.add(K.box(1.6, 0.08, 0.08, m, 0, h - 0.7, 0)); g.add(K.box(1.2, 0.08, 0.08, m, 0, h - 1.4, 0));
    g.add(K.cyl(0.18, 0.5, K.m('#8d8a84'), 0.25, h - 2.3, 0, { seg: 8 }));
    return g;
  };
  K.wires = function (a, b, n, sag) {
    const g = new T.Group(), m = new T.LineBasicMaterial({ color: 0x2a2a2a });
    for (let k = 0; k < (n || 3); k++) {
      const off = (k - ((n || 3) - 1) / 2) * 0.55, pts = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        pts.push(new T.Vector3(U.lerp(a[0], b[0], t) + off * (a[2] === b[2] ? 0 : 1), U.lerp(a[1], b[1], t) - Math.sin(t * Math.PI) * (sag || 0.5), U.lerp(a[2], b[2], t) + off * (a[2] === b[2] ? 1 : 0)));
      }
      const l = new T.Line(new T.BufferGeometry().setFromPoints(pts), m); l.userData.noAO = true; g.add(l);
    }
    return g;
  };
  K.streetLamp = function (h) {
    const g = new T.Group(), m = K.m(P.steelDark, { metal: 0.4, rough: 0.5 }); h = h || 5;
    g.add(K.cyl(0.06, h, m, 0, 0, 0, { seg: 8 }));
    g.add(K.rod([0, h, 0], [0.9, h + 0.1, 0], 0.035, m));
    const lm = K.m(P.lampCool, { emissive: '#fff4dc', ei: 0, nocache: true });
    g.add(K.box(0.4, 0.06, 0.16, lm, 0.9, h + 0.04, 0, { noShadow: true }));
    const pl = new T.PointLight(0xfff0d0, 0, 16, 1.5); pl.position.set(0.9, h - 0.1, 0); g.add(pl);
    g.userData.setLamp = (v) => { lm.emissiveIntensity = v * 2; pl.intensity = v * 26; };
    return g;
  };
  K.bench = function () {
    const g = new T.Group(), w = K.m(P.wood), s = K.m(P.steelDark);
    for (let i = 0; i < 3; i++) g.add(K.box(1.5, 0.03, 0.11, w, 0, 0.42, -0.13 + i * 0.13));
    for (let i = 0; i < 2; i++) g.add(K.box(1.5, 0.1, 0.03, w, 0, 0.56 + i * 0.15, -0.22));
    for (const sx of [-0.62, 0.62]) { g.add(K.box(0.05, 0.42, 0.4, s, sx, 0, -0.02)); g.add(K.box(0.05, 0.4, 0.04, s, sx, 0.42, -0.22)); }
    return g;
  };
  K.guardrail = function (len) {
    const g = new T.Group(), m = K.m(P.white, { rough: 0.6 });
    g.add(K.box(len, 0.28, 0.04, m, 0, 0.5, 0));
    const n = Math.round(len / 2);
    for (let i = 0; i <= n; i++) g.add(K.cyl(0.05, 0.75, m, -len / 2 + i * len / n, 0, -0.04, { seg: 8 }));
    return g;
  };
  K.vending = function (c) {
    const g = new T.Group();
    g.add(K.box(1.0, 1.83, 0.7, K.m(c || P.offwhite, { rough: 0.5 }), 0, 0, 0));
    const lm = K.m('#dfeaf0', { emissive: '#eaf4ff', ei: 0, nocache: true });
    g.add(K.box(0.86, 0.9, 0.02, lm, 0, 0.82, 0.351, { noShadow: true }));
    g.add(K.box(0.86, 0.3, 0.02, K.m(P.dark), 0, 0.2, 0.351, { noShadow: true }));
    g.userData.setLamp = (v) => { lm.emissiveIntensity = 0.25 + v * 1.1; };
    return g;
  };
  K.signal = function () {
    const g = new T.Group(), m = K.m(P.steelDark, { metal: 0.3, rough: 0.6 });
    g.add(K.cyl(0.08, 5.6, m, 0, 0, 0, { seg: 8 }));
    g.add(K.rod([0, 5.4, 0], [3.2, 5.4, 0], 0.05, m));
    g.add(K.box(1.25, 0.45, 0.25, K.m(P.dark), 2.5, 5.2, 0));
    const lights = [];
    const cols = ['#3fd08a', '#f0c040', '#e8483c'];
    for (let i = 0; i < 3; i++) {
      const lm = K.m(K.shade(cols[i], 0.25), { emissive: cols[i], ei: 0, nocache: true });
      const l = K.cyl(0.14, 0.03, lm, 2.1 + i * 0.4, 5.425, 0.13, { seg: 16, noShadow: true }); l.rotation.x = Math.PI / 2; g.add(l); lights.push(lm);
    }
    /* 歩行者用 */
    g.add(K.box(0.32, 0.62, 0.2, K.m(P.dark), 0.3, 2.5, 0));
    const pg = K.m(K.shade('#3fd08a', 0.25), { emissive: '#3fd08a', ei: 0, nocache: true }), pr = K.m(K.shade('#e8483c', 0.25), { emissive: '#e8483c', ei: 0, nocache: true });
    g.add(K.box(0.22, 0.22, 0.02, pr, 0.3, 2.86, 0.101, { noShadow: true })); g.add(K.box(0.22, 0.22, 0.02, pg, 0.3, 2.56, 0.101, { noShadow: true }));
    g.userData.set = (state) => {   // 'green' | 'yellow' | 'red'（車用）。歩行者は逆
      lights[0].emissiveIntensity = state === 'green' ? 2.2 : 0; lights[1].emissiveIntensity = state === 'yellow' ? 2.2 : 0; lights[2].emissiveIntensity = state === 'red' ? 2.2 : 0;
      pg.emissiveIntensity = state === 'red' ? 2 : 0; pr.emissiveIntensity = state === 'red' ? 0 : 2;
    };
    g.userData.set('red');
    return g;
  };

  /* 車 */
  K.car = function (c, kind) {
    const g = new T.Group(), bm = K.m(c || P.white, { rough: 0.35, metal: 0.2 }), gm = K.m('#2c3840', { rough: 0.15, metal: 0.3 }), tm = K.m('#1e1e20');
    let L = 4.2, W = 1.7, H = 1.42;
    if (kind === 'kei') { L = 3.4; W = 1.48; H = 1.6; }
    if (kind === 'truck') { L = 6.4; W = 2.2; H = 2.9; }
    if (kind === 'van') { L = 4.7; W = 1.75; H = 1.9; }
    if (kind === 'bus') { L = 10.5; W = 2.5; H = 3.1; }
    const clear = 0.22;
    if (kind === 'truck') {
      g.add(K.box(W, 1.9, 1.9, bm, 0, clear + 0.25, L / 2 - 0.95));
      g.add(K.box(W - 0.1, 0.8, 0.04, gm, 0, clear + 1.2, L / 2 + 0.005, { noShadow: true }));
      g.add(K.box(W, 2.35, L - 2.1, K.m(P.lightGray), 0, clear + 0.4, -1.05));
      g.add(K.box(W - 0.3, 0.25, L, tm, 0, clear, 0));
    } else if (kind === 'bus' || kind === 'van' || kind === 'kei') {
      g.add(K.box(W, H - clear, L, bm, 0, clear, 0));
      g.add(K.box(W + 0.02, (H - clear) * 0.34, L * 0.9, gm, 0, clear + (H - clear) * 0.5, 0, { noShadow: true }));
    } else {
      g.add(K.box(W, 0.62, L, bm, 0, clear, 0));
      g.add(K.box(W - 0.14, 0.56, L * 0.52, gm, 0, clear + 0.62, -L * 0.04));
      g.add(K.box(W - 0.16, 0.04, L * 0.5, bm, 0, clear + 1.17, -L * 0.04));
    }
    const wr = kind === 'truck' || kind === 'bus' ? 0.46 : 0.31;
    const wz = [L / 2 - 0.8, -L / 2 + 0.8];
    for (const z of wz) for (const sx of [-1, 1]) {
      const wheel = K.cyl(wr, 0.22, tm, sx * (W / 2 - 0.1), wr, z, { seg: 14 }); wheel.rotation.z = sx * Math.PI / 2; wheel.position.x = sx * (W / 2 - 0.02); wheel.position.y = wr; g.add(wheel);
    }
    const hl = K.m('#fffbe8', { emissive: '#fff6d8', ei: 0, nocache: true }), tl = K.m('#7a1a16', { emissive: '#ff3b30', ei: 0, nocache: true });
    for (const sx of [-1, 1]) {
      g.add(K.box(0.3, 0.14, 0.03, hl, sx * (W / 2 - 0.25), clear + 0.38, L / 2 + 0.005, { noShadow: true }));
      g.add(K.box(0.3, 0.12, 0.03, tl, sx * (W / 2 - 0.25), clear + 0.42, -L / 2 - 0.005, { noShadow: true }));
    }
    g.userData.setLamp = (v) => { hl.emissiveIntensity = v * 3; tl.emissiveIntensity = v * 1.6; };
    g.userData.len = L; g.userData.wid = W;
    return g;
  };
  K.bicycle = function () {
    const g = new T.Group(), m = K.m(P.steelDark, { metal: 0.4, rough: 0.5 });
    for (const z of [-0.5, 0.5]) { const w = new T.Mesh(new T.TorusGeometry(0.32, 0.018, 6, 20), K.m(P.dark)); w.position.set(0, 0.34, z); w.rotation.y = Math.PI / 2; w.castShadow = true; g.add(w); }
    g.add(K.rod([0, 0.34, -0.5], [0, 0.7, -0.15], 0.018, m)); g.add(K.rod([0, 0.7, -0.15], [0, 0.72, 0.38], 0.018, m));
    g.add(K.rod([0, 0.34, 0.5], [0, 0.95, 0.38], 0.018, m)); g.add(K.rod([-0.22, 0.95, 0.38], [0.22, 0.95, 0.38], 0.014, m));
    g.add(K.box(0.14, 0.04, 0.24, K.m(P.dark), 0, 0.78, -0.2));
    g.add(K.box(0.3, 0.2, 0.26, K.m(P.steel), 0, 0.72, 0.6));
    return g;
  };

  /* 道路。z 方向に長い。幅 w、長さ len */
  K.road = function (w, len, o) {
    o = o || {};
    const g = new T.Group();
    const am = K.mTex(K.tex.rep(K.tex.noise(o.wet ? '#33353a' : P.asphalt, 0.1), w / 3, len / 3), { rough: o.wet ? 0.35 : 0.95 });
    g.add(K.plane(w, len, am, 0, 0.01, 0));
    const lm = K.m(P.line, { rough: 0.8 });
    if (o.center !== false) {
      const n = Math.floor(len / 6);
      for (let i = 0; i < n; i++) g.add(K.plane(0.14, 3, lm, 0, 0.018, -len / 2 + 3 + i * 6, { noShadow: true }));
    }
    if (o.edge !== false) for (const sx of [-1, 1]) g.add(K.plane(0.14, len, lm, sx * (w / 2 - 0.35), 0.018, 0, { noShadow: true }));
    return g;
  };
  K.crosswalk = function (w, d) {
    const g = new T.Group(), lm = K.m(P.line, { rough: 0.8 });
    const n = Math.floor(w / 0.9);
    for (let i = 0; i < n; i++) g.add(K.plane(0.45, d, lm, -w / 2 + 0.45 + i * 0.9, 0.02, 0, { noShadow: true }));
    return g;
  };
  K.cone = function () {
    const g = new T.Group();
    g.add(K.box(0.36, 0.03, 0.36, K.m(P.dark), 0, 0, 0));
    const c = new T.Mesh(new T.ConeGeometry(0.14, 0.66, 10), K.m('#d9542b')); c.position.y = 0.36; c.castShadow = true; g.add(c);
    const w = K.cyl(0.085, 0.1, K.m(P.white), 0, 0.3, 0, { seg: 10, rTop: 0.066 }); g.add(w);
    return g;
  };

  /* 水面。ゆるく揺れる */
  K.water = function (w, d, c, o) {
    o = o || {};
    const g = new T.PlaneGeometry(w, d, o.segX || 40, o.segZ || 40); g.rotateX(-Math.PI / 2);
    const m = new T.MeshStandardMaterial({ color: c || P.water, roughness: o.rough != null ? o.rough : 0.16, metalness: 0.0, transparent: true, opacity: o.opacity != null ? o.opacity : 0.9, flatShading: !!o.flat });
    const mesh = new T.Mesh(g, m); mesh.receiveShadow = true; mesh.userData.noAO = true;
    const base = g.attributes.position.array.slice();
    const amp = o.amp != null ? o.amp : 0.05, sp = o.speed || 1;
    mesh.userData.tick = (t) => {
      if (amp <= 0) return;
      const p = g.attributes.position, arr = p.array;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3], z = base[i * 3 + 2];
        arr[i * 3 + 1] = Math.sin(x * 0.35 + t * 0.9 * sp) * amp + Math.sin(z * 0.6 + t * 1.3 * sp + x * 0.2) * amp * 0.6 + Math.sin(x * 1.3 - t * 1.7 * sp) * amp * 0.25;
      }
      p.needsUpdate = true; if (!o.flat) g.computeVertexNormals();
    };
    return mesh;
  };
})(window.SI);
