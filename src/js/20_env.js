'use strict';
/* 最期の一日 — 3D の土台（描画、空、光、時刻、天気、画面効果） */
(function (SI) {
  const T = window.THREE, U = SI.U;

  /* 時刻ごとの空と光。h は「春秋の晴れた日」の時刻 */
  const NIGHT = { top: '#060a16', hor: '#121a2e', gnd: '#080b12', sun: '#93a8d8', si: 0.16, hs: '#33406a', hg: '#0d1018', hi: 0.42, fog: '#0c1120', stars: 1 };
  const KEYS = [
    Object.assign({ h: 0 }, NIGHT),
    Object.assign({ h: 4.6 }, NIGHT),
    { h: 5.6, top: '#2b3c6c', hor: '#e8a07c', gnd: '#3a3440', sun: '#ffb38c', si: 0.7, hs: '#7888b0', hg: '#40384a', hi: 0.62, fog: '#b9938f', stars: 0.15 },
    { h: 7.0, top: '#5b8fd2', hor: '#f3dcc4', gnd: '#8f8a80', sun: '#ffe3c0', si: 2.3, hs: '#bfd5ee', hg: '#80786a', hi: 0.9, fog: '#dde2e4', stars: 0 },
    { h: 10.0, top: '#4b8de0', hor: '#d2e4f2', gnd: '#96938a', sun: '#fff3e0', si: 3.0, hs: '#d0e2f6', hg: '#8c8474', hi: 1.0, fog: '#dbe6ee', stars: 0 },
    { h: 13.0, top: '#4889e0', hor: '#d0e3f3', gnd: '#96938a', sun: '#fff6ea', si: 3.2, hs: '#d2e4f8', hg: '#8c8474', hi: 1.02, fog: '#dbe6ee', stars: 0 },
    { h: 16.0, top: '#588dd2', hor: '#eedec6', gnd: '#948c80', sun: '#ffe7c2', si: 2.6, hs: '#cbd9ea', hg: '#857a6a', hi: 0.92, fog: '#e2e2da', stars: 0 },
    { h: 17.5, top: '#4f659e', hor: '#f7b47c', gnd: '#6e5a50', sun: '#ffb272', si: 1.9, hs: '#bbaab6', hg: '#6c5b50', hi: 0.76, fog: '#e3b79c', stars: 0 },
    { h: 18.4, top: '#2c3766', hor: '#db846c', gnd: '#3e3440', sun: '#ff8c5e', si: 0.75, hs: '#807c9c', hg: '#3c3440', hi: 0.56, fog: '#9c8088', stars: 0.15 },
    { h: 19.3, top: '#131b3a', hor: '#3a4670', gnd: '#12162a', sun: '#93a8d8', si: 0.18, hs: '#3c4a78', hg: '#12152a', hi: 0.44, fog: '#232c4a', stars: 0.7 },
    Object.assign({ h: 20.5 }, NIGHT),
    Object.assign({ h: 24 }, NIGHT)
  ];
  const cA = new T.Color(), cB = new T.Color();
  function mixHex(a, b, t, out) { cA.set(a); cB.set(b); return out.copy(cA).lerp(cB, t); }

  const SKY_VERT = `
    varying vec3 vDir;
    void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const SKY_FRAG = `
    uniform vec3 uTop, uHor, uGnd, uSunDir, uSunCol;
    uniform float uSunAmt, uStars, uCloud, uCloudShade, uTime, uGain;
    varying vec3 vDir;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1.,0.)), f.x), mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), f.x), f.y); }
    float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<5;i++){ s += a*noise(p); p = p*2.03 + 7.1; a *= 0.5; } return s; }
    void main(){
      vec3 d = normalize(vDir);
      float y = d.y;
      vec3 col = mix(uHor, uTop, pow(clamp(y, 0.0, 1.0), 0.5));
      col = mix(col, uGnd, smoothstep(0.0, -0.22, y));
      float sd = max(dot(d, normalize(uSunDir)), 0.0);
      col += uSunCol * (pow(sd, 1100.0) * 7.0 + pow(sd, 28.0) * 0.4 + pow(sd, 4.0) * 0.12) * uSunAmt;
      if (uStars > 0.01 && y > 0.0) {
        vec2 sp = d.xz / (y + 0.45) * 70.0; vec2 ip = floor(sp); float h = hash(ip);
        float star = step(0.986, h) * smoothstep(0.32, 0.0, length(fract(sp) - 0.5));
        col += vec3(0.9, 0.95, 1.0) * star * uStars * (0.55 + 0.45 * sin(uTime * 1.7 + h * 50.0));
      }
      if (uCloud > 0.01 && y > -0.02) {
        vec2 cp = d.xz / (max(y, 0.0) + 0.24) * 1.25 + vec2(uTime * 0.0035, uTime * 0.0012);
        float c = fbm(cp);
        float cov = smoothstep(1.02 - uCloud, 1.34 - uCloud, c + 0.28);
        vec3 lit = mix(uHor, vec3(1.0), 0.55) * uCloudShade + uSunCol * 0.10 * uSunAmt;
        vec3 shade = lit * 0.62;
        vec3 ccol = mix(lit, shade, smoothstep(0.45, 0.9, c));
        col = mix(col, ccol, cov * smoothstep(-0.02, 0.12, y) * 0.94);
      }
      gl_FragColor = vec4(col * uGain, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;

  const FINAL_SHADER = {
    uniforms: {
      tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0 }, uSat: { value: 1 }, uTint: { value: new T.Color('#ffffff') },
      uTintAmt: { value: 0 }, uBright: { value: 1 }, uAberr: { value: 0 }, uGrain: { value: 0.03 }, uWave: { value: 0 },
      uHeat: { value: 0 }, uTunnel: { value: 0 }, uFlash: { value: 0 }, uDouble: { value: 0 }
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec3 uTint;
      uniform float uTime, uVig, uSat, uTintAmt, uBright, uAberr, uGrain, uWave, uHeat, uTunnel, uFlash, uDouble;
      varying vec2 vUv;
      void main(){
        vec2 uv = vUv; vec2 c = uv - 0.5;
        uv.x += sin(uv.y * 18.0 + uTime * 1.7) * 0.006 * uWave + sin(uv.y * 64.0 + uTime * 5.0) * 0.0022 * uHeat;
        uv.y += cos(uv.x * 14.0 + uTime * 1.3) * 0.006 * uWave;
        float ab = uAberr * length(c) * 0.06;
        vec3 col = vec3(texture2D(tDiffuse, uv + c * ab).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - c * ab).b);
        if (uDouble > 0.001) { col = mix(col, texture2D(tDiffuse, uv + vec2(0.035, 0.008) * uDouble).rgb, 0.45); }
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(l), col, uSat);
        col = mix(col, uTint * (l * 1.15 + 0.04), uTintAmt);
        col *= uBright;
        float r = length(c * vec2(1.0, 0.86));
        float v = 1.0 - smoothstep(mix(0.55, 0.04, uVig), mix(1.0, 0.42, uVig), r);
        col *= v;
        if (uTunnel > 0.001) { float tr = mix(0.95, -0.2, uTunnel); col *= 1.0 - smoothstep(tr, tr + 0.22, r); }
        col += uFlash;
        float g = fract(sin(dot(uv * vec2(1731.0, 977.0) + fract(uTime) * 61.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
        col += g * uGrain * (0.4 + l);
        gl_FragColor = vec4(max(col, 0.0), 1.0);
      }`
  };

  class Env {
    constructor(canvas) {
      this.canvas = canvas;
      const r = this.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      this.maxDpr = 1.6;
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxDpr));
      r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
      r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
      r.outputColorSpace = T.SRGBColorSpace;

      this.scene = new T.Scene();
      this.scene.fog = new T.Fog(0xdbe6ee, 30, 260);
      this.camera = new T.PerspectiveCamera(64, 1, 0.04, 900);

      this.hemi = new T.HemisphereLight(0xffffff, 0x888888, 1);
      this.scene.add(this.hemi);
      const s = this.sun = new T.DirectionalLight(0xffffff, 3);
      s.castShadow = true; s.shadow.mapSize.set(2048, 2048);
      s.shadow.bias = -0.0008; s.shadow.normalBias = 0.05;
      this.scene.add(s); this.scene.add(s.target);
      this.sunDir = new T.Vector3(0.4, 0.8, 0.4);

      this.skyU = {
        uTop: { value: new T.Color() }, uHor: { value: new T.Color() }, uGnd: { value: new T.Color() },
        uSunDir: { value: new T.Vector3(0, 1, 0) }, uSunCol: { value: new T.Color() }, uSunAmt: { value: 1 },
        uStars: { value: 0 }, uCloud: { value: 0.3 }, uCloudShade: { value: 1 }, uTime: { value: 0 }, uGain: { value: 1 }
      };
      this.sky = new T.Mesh(new T.SphereGeometry(600, 40, 24),
        new T.ShaderMaterial({ uniforms: this.skyU, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: T.BackSide, depthWrite: false, fog: false }));
      this.sky.renderOrder = -10; this.sky.frustumCulled = false; this.sky.userData.noAO = true;
      this.scene.add(this.sky);

      this.hour = 9; this.season = 'spring'; this.weather = 'clear'; this.indoor = false;
      this.time = 0; this.stage = null; this.lampOn = 0;
      this.shadowCenter = new T.Vector3(); this.shadowFollow = false; this.baseExpo = 1; this.rainAmt = 0;
      this.fogColor = new T.Color(); this.skyHor = new T.Color(); this.skyTop = new T.Color();
      this.dayLight = 1;      // 0 夜 〜 1 昼
      this.wind = 0.2;

      /* 画面効果の値。target に向かってなめらかに動く */
      this.fx = { vig: 0, sat: 1, tintAmt: 0, bright: 1, aberr: 0, grain: 0.03, wave: 0, heat: 0, tunnel: 0, flash: 0, double: 0, blur: 0, expo: 1 };
      this.fxT = Object.assign({}, this.fx);
      this.fxTint = new T.Color('#ffffff'); this.fxTintT = new T.Color('#ffffff');
      this.fxRate = 2.2;
      this.timeScale = 1; this.timeScaleT = 1;     // まわりの世界の時間の速さ（1 がふつう）

      this.particles = {};
      this._buildParticles();
      this._buildComposer();
      this.quality = 'high';
      this._frameAvg = 16; this._slowCount = 0;
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    _buildComposer() {
      const r = this.renderer;
      try {
        const size = r.getSize(new T.Vector2());
        this.composer = new T.EffectComposer(r);
        this.renderPass = new T.RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);
        try {
          const g = this.gtao = new T.GTAOPass(this.scene, this.camera, size.x, size.y);
          g.blendIntensity = 0.9;
          if (g.updateGtaoMaterial) g.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.4, thickness: 1.2, scale: 1.15, samples: 12, screenSpaceRadius: false });
          const orig = g.render.bind(g), scene = this.scene;
          g.render = function () {
            const hidden = [];
            scene.traverse(o => { if (o.userData && o.userData.noAO && o.visible) { o.visible = false; hidden.push(o); } });
            try { orig.apply(null, arguments); } finally { for (const o of hidden) o.visible = true; }
          };
          this.composer.addPass(g);
        } catch (e) { this.gtao = null; }
        this.bloom = new T.UnrealBloomPass(new T.Vector2(size.x, size.y), 0.1, 0.45, 1.05);
        this.composer.addPass(this.bloom);
        this.finalPass = new T.ShaderPass(FINAL_SHADER);
        this.composer.addPass(this.finalPass);
        this.composer.addPass(new T.OutputPass());
      } catch (e) {
        this.composer = null; this.finalPass = null;
      }
    }

    setQuality(q) {
      this.quality = q;
      if (this.gtao) this.gtao.enabled = (q === 'high');
      if (this.bloom) this.bloom.enabled = (q !== 'low');
      this.maxDpr = q === 'high' ? 1.6 : (q === 'mid' ? 1.3 : 1.0);
      this.renderer.shadowMap.enabled = true;
      this.resize();
    }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      if (w < 1 || h < 1) return;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxDpr));
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      /* 縦長の画面では視野を広げて、横の見え方を保つ */
      this.baseFov = w / h < 1 ? U.clamp(64 + (1 - w / h) * 34, 64, 86) : 64;
      this.camera.fov = this.baseFov;
      this.camera.updateProjectionMatrix();
      if (this.composer) { this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(w, h); }
    }

    /* 季節で日の出・日の入りをずらした「光の時刻」 */
    lightHour() {
      const shift = this.season === 'summer' ? 0.9 : (this.season === 'winter' ? -0.9 : 0);
      const h = this.hour;
      if (h < 12) return U.clamp(h + shift, 0, 12);
      return U.clamp(h - shift, 12, 24);
    }

    setConditions(o) {
      if (o.hour != null) this.hour = o.hour;
      if (o.season) this.season = o.season;
      if (o.weather) this.weather = o.weather;
      if (o.indoor != null) this.indoor = o.indoor;
      this.applyLight();
    }

    applyLight() {
      const lh = this.lightHour();
      let i = 0;
      while (i < KEYS.length - 2 && KEYS[i + 1].h <= lh) i++;
      const a = KEYS[i], b = KEYS[i + 1];
      const t = U.clamp((lh - a.h) / Math.max(0.001, b.h - a.h), 0, 1);
      const top = mixHex(a.top, b.top, t, new T.Color()), hor = mixHex(a.hor, b.hor, t, new T.Color());
      const gnd = mixHex(a.gnd, b.gnd, t, new T.Color()), sunC = mixHex(a.sun, b.sun, t, new T.Color());
      const hs = mixHex(a.hs, b.hs, t, new T.Color()), hg = mixHex(a.hg, b.hg, t, new T.Color());
      const fog = mixHex(a.fog, b.fog, t, new T.Color());
      let si = U.lerp(a.si, b.si, t), hi = U.lerp(a.hi, b.hi, t), stars = U.lerp(a.stars, b.stars, t);

      /* 太陽の向き。東（+X）から南（+Z）を通って西（-X）へ */
      const rise = 5.6, set = 18.6;
      const dayT = (lh - rise) / (set - rise);
      const isDay = dayT > 0 && dayT < 1;
      const maxEl = this.season === 'summer' ? 72 : (this.season === 'winter' ? 33 : 54);
      if (isDay) {
        const el = U.deg(Math.max(4, Math.sin(Math.PI * dayT) * maxEl));
        const az = Math.PI * dayT;
        this.sunDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el) * 0.9 + 0.12).normalize();
      } else {
        this.sunDir.set(-0.35, 0.78, 0.5).normalize();   // 月
      }
      this.dayLight = U.clamp(si / 2.2, 0, 1);

      /* 天気 */
      const w = this.weather;
      let cloud = 0.34, cloudShade = 1, fogNear = 60, fogFar = 420, sunAmt = 1;
      const grayOf = (c, amt, dark) => { const l = (c.r * 0.3 + c.g * 0.55 + c.b * 0.15); const g = new T.Color(l * 0.92, l * 0.96, l * 1.02).multiplyScalar(dark); return c.lerp(g, amt); };
      if (w === 'cloudy') { cloud = 0.86; cloudShade = 0.8; si *= 0.22; hi *= 0.95; sunAmt = 0.15; grayOf(top, 0.75, 0.9); grayOf(hor, 0.7, 0.92); grayOf(fog, 0.6, 0.92); fogNear = 40; fogFar = 300; }
      else if (w === 'rain') { cloud = 1.0; cloudShade = 0.55; si *= 0.1; hi *= 0.78; sunAmt = 0; grayOf(top, 0.9, 0.6); grayOf(hor, 0.9, 0.68); grayOf(fog, 0.85, 0.7); fogNear = 14; fogFar = 130; stars = 0; }
      else if (w === 'storm') { cloud = 1.0; cloudShade = 0.4; si *= 0.06; hi *= 0.62; sunAmt = 0; grayOf(top, 0.95, 0.42); grayOf(hor, 0.95, 0.5); grayOf(fog, 0.9, 0.52); fogNear = 8; fogFar = 85; stars = 0; }
      else if (w === 'snow') { cloud = 1.0; cloudShade = 0.92; si *= 0.2; hi *= 1.05; sunAmt = 0; grayOf(top, 0.9, 1.0); grayOf(hor, 0.9, 1.08); grayOf(fog, 0.9, 1.1); fogNear = 10; fogFar = 110; stars = 0; }
      else if (w === 'fog') { cloud = 0.9; cloudShade = 0.95; si *= 0.25; hi *= 0.95; sunAmt = 0.1; grayOf(top, 0.85, 1.0); grayOf(hor, 0.9, 1.02); grayOf(fog, 0.9, 1.04); fogNear = 3; fogFar = 42; stars = 0; }
      if (this.season === 'winter' && w === 'clear') { cloud = 0.2; }
      if (this.season === 'summer' && w === 'clear') { cloud = 0.42; }
      this.wind = w === 'storm' ? 1 : (w === 'rain' ? 0.5 : (w === 'snow' ? 0.3 : 0.2));

      const u = this.skyU;
      u.uTop.value.copy(top); u.uHor.value.copy(hor); u.uGnd.value.copy(gnd);
      u.uSunDir.value.copy(this.sunDir); u.uSunCol.value.copy(sunC); u.uSunAmt.value = (isDay ? 1 : 0.5) * sunAmt;
      u.uStars.value = stars; u.uCloud.value = cloud; u.uCloudShade.value = cloudShade * (0.25 + 0.75 * this.dayLight);
      this.skyTop.copy(top); this.skyHor.copy(hor); this.fogColor.copy(fog);

      this.sun.color.copy(sunC); this.sun.intensity = si * 1.3;
      this.hemi.color.copy(hs); this.hemi.groundColor.copy(hg);
      this.hemi.intensity = hi * (this.indoor ? 1.45 : 2.3);
      u.uGain.value = this.indoor ? 1.0 + 0.12 * this.dayLight : 1.0;
      this.baseExpo = this.indoor ? 1.0 : 1.0;
      /* 窓から入る空の明るさ */
      const wf = { clear: 1, cloudy: 0.72, rain: 0.45, storm: 0.3, snow: 0.85, fog: 0.6 }[w] || 1;
      this.skyFill = U.clamp(hi, 0, 1.1) * wf * (0.12 + 0.88 * this.dayLight);
      if (this.stage && this.stage.fills) for (const l of this.stage.fills) { l.intensity = (l.userData.power || 10) * this.skyFill * 0.62; l.color.copy(hor).lerp(cB.set('#ffffff'), 0.45); }
      this.scene.fog.color.copy(fog);
      if (this.indoor) { this.scene.fog.near = Math.max(18, fogNear); this.scene.fog.far = Math.max(120, fogFar); }
      else { this.scene.fog.near = fogNear; this.scene.fog.far = fogFar; }
      this.renderer.setClearColor(fog);

      /* 明かり。暗くなったら灯る */
      const dark = 1 - U.clamp((si - 0.25) / 1.2, 0, 1);
      this.lampOn = this.indoor ? U.clamp(dark * 1.25, 0, 1) : U.clamp((dark - 0.35) * 1.6, 0, 1);
      if (this.stage && this.stage.onLight) this.stage.onLight(this);

      this.particles.petals.visible = !!this.petalBox && (w === 'clear' || w === 'cloudy') && (this.season === 'spring' || this.season === 'autumn');
      this.particles.petals.material.color.set(this.season === 'autumn' ? 0xc9843c : 0xf6cdd6);
      this.particles.rain.visible = (w === 'rain' || w === 'storm');
      this.particles.snow.visible = (w === 'snow');
      this.rainAmt = w === 'storm' ? 1 : (w === 'rain' ? 0.6 : 0);
    }

    _buildParticles() {
      /* 雨 */
      const RN = 1500, rp = new Float32Array(RN * 6);
      const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(rp, 3));
      const rain = new T.LineSegments(rg, new T.LineBasicMaterial({ color: 0xc8d2dc, transparent: true, opacity: 0.32, depthWrite: false }));
      rain.frustumCulled = false; rain.userData.noAO = true; rain.visible = false;
      rain.userData.seed = Array.from({ length: RN }, () => [Math.random(), Math.random(), Math.random()]);
      this.scene.add(rain); this.particles.rain = rain;
      /* 雪 */
      const SN = 1100, sp = new Float32Array(SN * 3);
      const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3));
      const snow = new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true }));
      snow.frustumCulled = false; snow.userData.noAO = true; snow.visible = false;
      snow.userData.seed = Array.from({ length: SN }, () => [Math.random(), Math.random(), Math.random(), Math.random()]);
      this.scene.add(snow); this.particles.snow = snow;
      /* 花びら・落ち葉 */
      const PN = 140, pp = new Float32Array(PN * 3);
      const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pp, 3));
      const petals = new T.Points(pg, new T.PointsMaterial({ color: 0xf6cdd6, size: 0.075, transparent: true, opacity: 0.95, depthWrite: false, alphaTest: 0.3 }));
      petals.frustumCulled = false; petals.userData.noAO = true; petals.visible = false;
      petals.userData.seed = Array.from({ length: PN }, () => [Math.random(), Math.random(), Math.random(), Math.random()]);
      this.scene.add(petals); this.particles.petals = petals;
      /* 光の中のほこり */
      const DN = 60, dp = new Float32Array(DN * 3);
      const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(dp, 3));
      const dust = new T.Points(dg, new T.PointsMaterial({ color: 0xfff2d8, size: 0.02, map: SI.Kit ? SI.Kit.tex.glow() : null, transparent: true, opacity: 0.3, depthWrite: false, blending: T.AdditiveBlending }));
      dust.frustumCulled = false; dust.userData.noAO = true; dust.visible = false;
      dust.userData.seed = Array.from({ length: DN }, () => [Math.random(), Math.random(), Math.random(), Math.random()]);
      this.scene.add(dust); this.particles.dust = dust;
      this.weatherBox = { min: new T.Vector3(-14, 0, -14), max: new T.Vector3(14, 12, 14), follow: true };
      this.dustBox = null; this.petalBox = null;
    }

    /* 場所を入れ替える */
    setStage(stage) {
      if (this.stage) {
        this.scene.remove(this.stage.group);
        SI.Kit.dispose(this.stage.group);
        if (this.stage.dispose) this.stage.dispose();
      }
      this.stage = stage;
      if (!stage) return;
      this.scene.add(stage.group);
      this.indoor = !!stage.indoor;
      const sh = stage.shadow || 16;
      const c = this.sun.shadow.camera;
      c.left = -sh; c.right = sh; c.top = sh; c.bottom = -sh; c.near = 1; c.far = 120; c.updateProjectionMatrix();
      this.sun.shadow.mapSize.set(2048, 2048);
      this.shadowCenter = stage.center ? new T.Vector3().fromArray(stage.center) : new T.Vector3();
      this.shadowFollow = !!stage.shadowFollow;
      if (stage.weatherBox) { this.weatherBox = { min: new T.Vector3().fromArray(stage.weatherBox[0]), max: new T.Vector3().fromArray(stage.weatherBox[1]), follow: false }; }
      else { this.weatherBox = { min: new T.Vector3(-14, 0, -14), max: new T.Vector3(14, 12, 14), follow: true }; }
      this.dustBox = stage.dustBox ? { min: new T.Vector3().fromArray(stage.dustBox[0]), max: new T.Vector3().fromArray(stage.dustBox[1]) } : null;
      this.petalBox = stage.petalBox ? { min: new T.Vector3().fromArray(stage.petalBox[0]), max: new T.Vector3().fromArray(stage.petalBox[1]) } : null;
      this.particles.dust.visible = !!this.dustBox;
      this.particles.petals.visible = !!this.petalBox && (this.weather === 'clear' || this.weather === 'cloudy') && (this.season === 'spring' || this.season === 'autumn');
      this.particles.petals.material.color.set(this.season === 'autumn' ? 0xc9843c : 0xf6cdd6);
      if (!this.particles.petals.material.map && SI.Kit) { this.particles.petals.material.map = SI.Kit.tex.petal(); this.particles.petals.material.needsUpdate = true; }
      this.applyLight();
    }

    update(dt, camPos) {
      this.timeScale += (this.timeScaleT - this.timeScale) * (1 - Math.exp(-1.6 * dt));
      const wdt = dt * this.timeScale;
      this.time += wdt;
      this.skyU.uTime.value = this.time;
      this.sky.position.copy(camPos);
      /* 影の中心 */
      const sc = this.shadowFollow ? camPos : this.shadowCenter;
      this.sun.target.position.copy(sc);
      this.sun.position.copy(sc).addScaledVector(this.sunDir, 60);

      const wb = this.weatherBox, ox = wb.follow ? camPos.x : 0, oz = wb.follow ? camPos.z : 0;
      const sx = wb.max.x - wb.min.x, sy = wb.max.y - wb.min.y, sz = wb.max.z - wb.min.z;
      if (this.particles.rain.visible) {
        const pos = this.particles.rain.geometry.attributes.position, seed = this.particles.rain.userData.seed, arr = pos.array;
        const sp = 15 + this.rainAmt * 6, slant = this.wind * 2.4, n = Math.floor(seed.length * (0.45 + 0.55 * this.rainAmt));
        for (let i = 0; i < seed.length; i++) {
          const s = seed[i];
          if (i >= n) { arr[i * 6 + 1] = -99; arr[i * 6 + 4] = -99; continue; }
          const y = wb.min.y + sy * (1 - ((s[1] + this.time * sp / sy) % 1));
          const x = ox + wb.min.x + sx * ((s[0] + (sy - (y - wb.min.y)) * slant * 0.02) % 1), z = oz + wb.min.z + sz * s[2];
          arr[i * 6] = x; arr[i * 6 + 1] = y; arr[i * 6 + 2] = z;
          arr[i * 6 + 3] = x + slant * 0.03; arr[i * 6 + 4] = y + 0.34; arr[i * 6 + 5] = z;
        }
        pos.needsUpdate = true;
      }
      if (this.particles.snow.visible) {
        const pos = this.particles.snow.geometry.attributes.position, seed = this.particles.snow.userData.seed, arr = pos.array;
        for (let i = 0; i < seed.length; i++) {
          const s = seed[i];
          const y = wb.min.y + sy * (1 - ((s[1] + this.time * (0.9 + s[3] * 0.7) / sy) % 1));
          arr[i * 3] = ox + wb.min.x + sx * ((s[0] + Math.sin(this.time * 0.6 + s[3] * 20) * 0.012 + this.time * 0.01 * this.wind) % 1);
          arr[i * 3 + 1] = y; arr[i * 3 + 2] = oz + wb.min.z + sz * s[2];
        }
        pos.needsUpdate = true;
      }
      if (this.particles.petals.visible && this.petalBox) {
        this.particles.petals.material.opacity = 0.22 + 0.73 * this.dayLight;
        const b = this.petalBox, pos = this.particles.petals.geometry.attributes.position, seed = this.particles.petals.userData.seed, arr = pos.array;
        const bx = b.max.x - b.min.x, by = b.max.y - b.min.y, bz = b.max.z - b.min.z;
        for (let i = 0; i < seed.length; i++) {
          const s = seed[i], ph = this.time * (0.25 + s[3] * 0.25);
          arr[i * 3] = b.min.x + bx * ((s[0] + ph * 0.06 + Math.sin(ph * 2 + s[3] * 30) * 0.03 + 10) % 1);
          arr[i * 3 + 1] = b.min.y + by * (1 - ((s[1] + ph * 0.16) % 1));
          arr[i * 3 + 2] = b.min.z + bz * ((s[2] + Math.cos(ph * 1.6 + s[3] * 20) * 0.03 + 10) % 1);
        }
        pos.needsUpdate = true;
      }
      if (this.particles.dust.visible && this.dustBox) {
        const b = this.dustBox, pos = this.particles.dust.geometry.attributes.position, seed = this.particles.dust.userData.seed, arr = pos.array;
        const bx = b.max.x - b.min.x, by = b.max.y - b.min.y, bz = b.max.z - b.min.z;
        for (let i = 0; i < seed.length; i++) {
          const s = seed[i], ph = this.time * 0.03 + s[3];
          arr[i * 3] = b.min.x + bx * ((s[0] + Math.sin(ph * 6.3) * 0.05 + 10) % 1);
          arr[i * 3 + 1] = b.min.y + by * ((s[1] + ph * 0.25) % 1);
          arr[i * 3 + 2] = b.min.z + bz * ((s[2] + Math.cos(ph * 5.1) * 0.05 + 10) % 1);
        }
        pos.needsUpdate = true;
        this.particles.dust.material.opacity = 0.34 * this.dayLight * (this.weather === 'clear' ? 1 : 0.25);
        if (!this.particles.dust.material.map && SI.Kit) { this.particles.dust.material.map = SI.Kit.tex.glow(); this.particles.dust.material.needsUpdate = true; }
      }

      /* 画面効果 */
      const f = this.fx, ft = this.fxT, k = 1 - Math.exp(-this.fxRate * dt);
      for (const key in f) f[key] += (ft[key] - f[key]) * (key === 'flash' ? Math.min(1, k * 4) : k);
      this.fxTint.lerp(this.fxTintT, k);
      if (this.finalPass) {
        const u = this.finalPass.uniforms;
        u.uTime.value = this.time; u.uVig.value = f.vig; u.uSat.value = f.sat; u.uTintAmt.value = f.tintAmt; u.uTint.value.copy(this.fxTint);
        u.uBright.value = f.bright; u.uAberr.value = f.aberr; u.uGrain.value = f.grain; u.uWave.value = f.wave; u.uHeat.value = f.heat;
        u.uTunnel.value = f.tunnel; u.uFlash.value = f.flash; u.uDouble.value = f.double;
      }
      this.renderer.toneMappingExposure = f.expo * this.baseExpo;
      const blur = f.blur < 0.05 ? 0 : Math.round(f.blur * 10) / 10;
      if (blur !== this._blur) { this._blur = blur; this.canvas.style.filter = blur ? `blur(${blur.toFixed(1)}px)` : ''; }

      if (this.stage && this.stage.update) this.stage.update(wdt, this);
    }

    render(dt) {
      if (this.composer && this.quality !== 'off') this.composer.render(dt);
      else this.renderer.render(this.scene, this.camera);
      /* 重い機械では、自動で軽くする */
      if (dt > 0 && dt < 0.5) {
        this._frameAvg = this._frameAvg * 0.95 + dt * 1000 * 0.05;
        if (this.time > 4 && this._frameAvg > 30) {
          this._slowCount++;
          if (this._slowCount > 90) {
            this._slowCount = 0; this._frameAvg = 16;
            if (this.quality === 'high') this.setQuality('mid'); else if (this.quality === 'mid') this.setQuality('low');
          }
        } else this._slowCount = 0;
      }
    }

    /* 鼓動に合わせて、視野を一瞬だけ暗くする */
    pulse(v) { this.fx.bright *= (1 - v); this.fx.vig = Math.min(0.98, this.fx.vig + v * 0.6); }

    fxReset(instant) {
      this.timeScaleT = 1; if (instant) this.timeScale = 1;
      Object.assign(this.fxT, { vig: 0, sat: 1, tintAmt: 0, bright: 1, aberr: 0, grain: 0.03, wave: 0, heat: 0, tunnel: 0, flash: 0, double: 0, blur: 0, expo: 1 });
      this.fxTintT.set('#ffffff');
      if (instant) { Object.assign(this.fx, this.fxT); this.fxTint.copy(this.fxTintT); }
    }
  }

  SI.Env = Env;
})(window.SI);
