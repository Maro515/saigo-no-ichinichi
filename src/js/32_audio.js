'use strict';
/* 最期の一日 — 音（すべてその場で合成する。音声ファイルは使わない） */
(function (SI) {
  const U = SI.U;

  const LAYERS = {
    room:    { src: 'brown', f: [['lowpass', 180, 0.7]], max: 0.05 },
    wind:    { src: 'white', f: [['bandpass', 420, 0.6]], max: 0.075, lfo: [0.13, 0.5] },
    rain:    { src: 'white', f: [['highpass', 1300, 0.7], ['lowpass', 7200, 0.7]], max: 0.1 },
    rainIn:  { src: 'white', f: [['bandpass', 900, 0.5]], max: 0.05 },
    sea:     { src: 'brown', f: [['lowpass', 760, 0.7]], max: 0.2, lfo: [0.12, 0.75] },
    cicada:  { src: 'white', f: [['bandpass', 5300, 10]], max: 0.03, am: 92, lfo: [0.07, 0.45] },
    traffic: { src: 'brown', f: [['lowpass', 320, 0.7]], max: 0.085 },
    engine:  { src: 'brown', f: [['lowpass', 140, 1.2]], max: 0.16, osc: 52 },
    train:   { src: 'brown', f: [['lowpass', 260, 0.8]], max: 0.14 },
    water:   { src: 'white', f: [['bandpass', 1700, 0.5]], max: 0.035, lfo: [0.21, 0.5] },
    river:   { src: 'white', f: [['bandpass', 1100, 0.4]], max: 0.075, lfo: [0.3, 0.25] },
    crowd:   { src: 'brown', f: [['bandpass', 520, 0.6]], max: 0.05, lfo: [0.19, 0.3] },
    machine: { src: 'brown', f: [['bandpass', 210, 2]], max: 0.1, osc: 98 },
    rumble:  { src: 'brown', f: [['lowpass', 70, 0.7]], max: 0.75 },
    fire:    { src: 'white', f: [['bandpass', 650, 0.4]], max: 0.1, lfo: [3.1, 0.5] }
  };
  const PENTA = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25];

  class Audio {
    constructor() {
      this.ctx = null; this.enabled = U.store.get('si.sound', true);
      this.layers = {}; this.targets = {};
      this.ev = { tick: 0, birds: 0, cricket: 0, beep: 0, pass: 0, clack: 0, drip: 0, crow: 0 };
      this.evT = { tick: 0, birds: 0, cricket: 0, beep: 0, pass: 0, clack: 0, drip: 0, crow: 0 };
      this.heartBpm = 70; this.heartGain = 0; this.heartIrr = 0; this.heartNext = 0; this.heartStopped = false;
      this.breathRate = 14; this.breathGain = 0; this.breathNext = 0;
      this.heartManual = false; this._siren = null;
      this.t = 0;
    }

    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => { }); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = this.ctx = new AC();
      if (c.state === 'suspended') c.resume().catch(() => { });
      /* 大きな音（衝突など）で音が割れないように、出口でおさえる */
      this.limit = c.createDynamicsCompressor();
      this.limit.threshold.value = -9; this.limit.knee.value = 8; this.limit.ratio.value = 14; this.limit.attack.value = 0.002; this.limit.release.value = 0.22;
      this.limit.connect(c.destination);
      this.master = c.createGain(); this.master.gain.value = this.enabled ? 0.9 : 0; this.master.connect(this.limit);
      this.ambFilter = c.createBiquadFilter(); this.ambFilter.type = 'lowpass'; this.ambFilter.frequency.value = 18000; this.ambFilter.connect(this.master);
      this.amb = c.createGain(); this.amb.gain.value = 1; this.amb.connect(this.ambFilter);
      this.body = c.createGain(); this.body.gain.value = 1; this.body.connect(this.master);
      this.mem = c.createGain(); this.mem.gain.value = 1; this.mem.connect(this.master);
      const mk = (brown) => {
        const len = c.sampleRate * 3, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
        }
        return b;
      };
      this.buf = { white: mk(false), brown: mk(true) };
      /* 記憶のあいだの低い持続音と、耳鳴り */
      this.drone = this._tone([110, 164.81, 220.5], 0);
      this.tin = this._tone([6180, 6243], 0);
      /* 別のタブに移っているあいだは音を止める */
      document.addEventListener('visibilitychange', () => { if (!this.ctx) return; if (document.hidden) this.ctx.suspend().catch(() => { }); else this.ctx.resume().catch(() => { }); });
    }

    _tone(freqs, gain) {
      const c = this.ctx, g = c.createGain(); g.gain.value = gain; g.connect(this.mem);
      for (const f of freqs) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; const og = c.createGain(); og.gain.value = 1 / freqs.length; o.connect(og); og.connect(g); o.start(); }
      return g;
    }

    setEnabled(v) {
      this.enabled = v; U.store.set('si.sound', v);
      if (this.ctx) this.master.gain.setTargetAtTime(v ? 0.9 : 0, this.ctx.currentTime, 0.1);
    }

    _layer(name) {
      if (this.layers[name]) return this.layers[name];
      const c = this.ctx, def = LAYERS[name];
      const src = c.createBufferSource(); src.buffer = this.buf[def.src]; src.loop = true; src.playbackRate.value = 0.9 + Math.random() * 0.2;
      let node = src;
      for (const [type, freq, q] of def.f) { const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; node.connect(f); node = f; }
      const g = c.createGain(); g.gain.value = 0;
      if (def.am) {
        const am = c.createGain(); am.gain.value = 0.5; const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = def.am;
        const og = c.createGain(); og.gain.value = 0.5; o.connect(og); og.connect(am.gain); o.start(); node.connect(am); node = am;
      }
      node.connect(g);
      if (def.osc) {
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = def.osc;
        const lf = c.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = def.osc * 3; const og = c.createGain(); og.gain.value = 0.35;
        o.connect(lf); lf.connect(og); og.connect(g); o.start();
      }
      g.connect(this.amb); src.start();
      return (this.layers[name] = { g, def, cur: 0 });
    }

    /* まわりの音。o = {room: 0〜1, rain: 0〜1, ... , tick/birds/cricket/beep/pass/clack/drip: 0〜1} */
    ambience(o) {
      this.targets = {};
      for (const k in LAYERS) this.targets[k] = o[k] || 0;
      for (const k in this.evT) this.evT[k] = o[k] || 0;
    }
    setLayer(name, v) { if (name in LAYERS) this.targets[name] = v; else this.evT[name] = v; }

    heart(bpm, gain, irregular) { this.heartBpm = bpm; this.heartGain = gain; this.heartIrr = irregular || 0; this.heartStopped = false; }
    stopHeart() { this.heartStopped = true; }
    breath(rate, gain) { this.breathRate = rate; this.breathGain = gain; }
    muffle(x) { if (this.ctx) this.ambFilter.frequency.setTargetAtTime(U.lerp(18000, 260, Math.pow(U.clamp(x, 0, 1), 0.6)), this.ctx.currentTime, 0.4); }
    ambLevel(x, tc) { if (this.ctx) this.amb.gain.setTargetAtTime(x, this.ctx.currentTime, tc || 0.8); }
    tinnitus(g, tc) { if (this.ctx) this.tin.gain.setTargetAtTime(g * 0.02, this.ctx.currentTime, tc || 0.5); }
    memoryMode(on) { if (this.ctx) { this.drone.gain.setTargetAtTime(on ? 0.035 : 0, this.ctx.currentTime, on ? 1.2 : 0.8); this.amb.gain.setTargetAtTime(on ? 0.3 : 1, this.ctx.currentTime, 0.8); } }

    _env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
    _noise(t, dur, type, freq, q, peak, bus) {
      const c = this.ctx, s = c.createBufferSource(); s.buffer = this.buf.white; s.loop = true;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); this._env(g, t, Math.min(0.02, dur * 0.3), peak, dur);
      s.connect(f); f.connect(g); g.connect(bus || this.amb); s.start(t, Math.random() * 2); s.stop(t + dur + 0.1);
    }
    _sine(t, f0, f1, dur, peak, bus, type) {
      const c = this.ctx, o = c.createOscillator(); o.type = type || 'sine';
      o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = c.createGain(); this._env(g, t, 0.008, peak, dur);
      o.connect(g); g.connect(bus || this.amb); o.start(t); o.stop(t + dur + 0.1);
    }

    ok() { return !!this.ctx && this.ctx.state === 'running' && this.enabled; }
    chime(n) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime + 0.05, base = Math.floor(Math.random() * 3);
      const notes = n === 3 ? [base, base + 2, base + 4] : (n === 1 ? [base + 2] : [base + 1, base + 3]);
      notes.forEach((k, i) => {
        const f = PENTA[k % PENTA.length], tt = t + i * 0.42;
        const c = this.ctx, g = c.createGain(); g.connect(this.mem);
        g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.085, tt + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, tt + 3.6);
        for (const [m, a] of [[1, 1], [2, 0.22], [3.01, 0.07]]) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * m; const og = c.createGain(); og.gain.value = a; o.connect(og); og.connect(g); o.start(tt); o.stop(tt + 3.8); }
      });
    }
    impact() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      this._noise(t, 0.5, 'lowpass', 500, 0.7, 0.75, this.body);
      this._sine(t, 95, 28, 0.7, 0.8, this.body);
    }
    thud(v) { if (this.ok()) { const t = this.ctx.currentTime; this._noise(t, 0.2, 'lowpass', 260, 0.7, 0.35 * (v || 1), this.body); this._sine(t, 70, 40, 0.25, 0.4 * (v || 1), this.body); } }
    /* 足音。外では、砂や舗装をふむ、かわいた音がまじる */
    step(out) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      this._noise(t, 0.09, 'lowpass', 340, 0.7, 0.045);
      if (out) this._noise(t + 0.01, 0.07, 'bandpass', 1500 + Math.random() * 700, 1.1, 0.016);
    }
    blink() { }

    /* ---------- 最期の場面のための音 ---------- */
    /* 鼓動をひとつ、いま打つ（間をこちらで決めたいとき） */
    beat(g) {
      if (!this.ok()) return;
      const now = this.ctx.currentTime;
      this._sine(now, 62, 38, 0.11, 0.5 * g, this.body); this._sine(now + 0.16, 54, 34, 0.09, 0.32 * g, this.body);
      if (this.evT.beep > 0) this._sine(now, 880, 880, 0.07, 0.022 * this.evT.beep);
      if (this.onBeat) this.onBeat();
    }
    manualHeart(on, bpm) { this.heartManual = !!on; if (on) this.heartGain = 0; if (bpm) this.heartBpm = bpm; }

    /* 息の音を 1 回ぶん */
    _air(t, dur, f0, f1, peak, o) {
      const c = this.ctx, src = c.createBufferSource(); src.buffer = this.buf.white; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8;
      f.frequency.setValueAtTime(f0, t); f.frequency.linearRampToValueAtTime(f1, t + dur);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + dur * ((o && o.att) || 0.4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); let node = f;
      if (o && o.rattle) {                         // のどの奥で、ごろごろと鳴る
        const am = c.createGain(); am.gain.value = 0.55;
        const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 21 + Math.random() * 9;
        const lg = c.createGain(); lg.gain.value = 0.45 * o.rattle; lfo.connect(lg); lg.connect(am.gain); lfo.start(t); lfo.stop(t + dur + 0.1);
        f.connect(am); node = am;
      }
      node.connect(g); g.connect(this.body); src.start(t, Math.random() * 2); src.stop(t + dur + 0.1);
    }
    breathIn(dur, g, sharp) { if (this.ok()) this._air(this.ctx.currentTime, dur, sharp ? 900 : 650, sharp ? 1700 : 1150, 0.075 * g, { att: sharp ? 0.25 : 0.55 }); }
    breathOut(dur, g, rattle) { if (this.ok()) this._air(this.ctx.currentTime, dur, 900, 460, 0.055 * g, { att: 0.2, rattle: rattle || 0 }); }
    cough(g) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) this._noise(t + i * 0.22, 0.13, 'bandpass', 780 + Math.random() * 200, 0.9, 0.2 * (g || 1), this.body);
    }

    /* まわりの音を、一瞬で断つ／戻す */
    dead(on, tc) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this.amb.gain.cancelScheduledValues(now); this.amb.gain.setTargetAtTime(on ? 0 : 1, now, tc || (on ? 0.012 : 0.6));
      if (on) { this.heartGain = 0; this.breathGain = 0; }
    }

    /* ぶつかる音。glass: ガラスが散る、metal: 金物が鳴る */
    blow(o) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      this._noise(t, 0.7, 'lowpass', 700, 0.7, 0.75, this.body); this._sine(t, 120, 24, 0.9, 0.75, this.body); this._sine(t, 46, 30, 1.3, 0.45, this.body);
      if (o && o.glass) this.glass(1, 0.05);
      if (o && o.metal) for (const f of [410, 617, 933]) this._sine(t + 0.01, f, f * 0.985, 0.5, 0.11, this.body, 'triangle');
    }
    glass(g, delay) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime + (delay || 0);
      this._noise(t, 0.25, 'highpass', 4200, 0.7, 0.22 * g, this.body);
      for (let i = 0; i < 7; i++) this._sine(t + 0.03 + Math.random() * 0.5, 2800 + Math.random() * 3600, 2600 + Math.random() * 3000, 0.05 + Math.random() * 0.07, 0.035 * g, this.body);
    }
    /* タイヤが鳴る */
    screech(dur, g) {
      if (!this.ok()) return;
      const c = this.ctx, t = c.currentTime, src = c.createBufferSource(); src.buffer = this.buf.white; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 11; f.frequency.setValueAtTime(2700, t); f.frequency.linearRampToValueAtTime(1900, t + dur);
      const gg = c.createGain(); gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.5 * g, t + 0.05);
      gg.gain.setValueAtTime(0.5 * g, t + Math.max(0.06, dur - 0.04)); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(gg); gg.connect(this.amb); src.start(t); src.stop(t + dur + 0.1);
    }
    horn(dur, g) {
      if (!this.ok()) return;
      const c = this.ctx, t = c.currentTime, lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900;
      const gg = c.createGain(); gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.09 * g, t + 0.03);
      gg.gain.setValueAtTime(0.09 * g, t + Math.max(0.05, dur - 0.05)); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      for (const fq of [415, 494]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fq; o.connect(lp); o.start(t); o.stop(t + dur + 0.1); }
      lp.connect(gg); gg.connect(this.amb);
    }
    /* 町に流れる、遠いチャイム。スピーカーの音が、こだまして届く（evening は「家路」のふし、noon は時計台の鐘のふし） */
    tune(name) {
      if (!this.ok()) return;
      const c = this.ctx, t0 = c.currentTime + 0.1;
      const N = { G3: 196.0, C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0 };
      const seq = name === 'evening'
        ? [['E4', 1.5], ['G4', 0.5], ['G4', 2], ['E4', 1.5], ['D4', 0.5], ['C4', 2], ['D4', 1.5], ['E4', 0.5], ['G4', 1.5], ['E4', 0.5], ['D4', 3]]
        : [['E4', 1], ['C4', 1], ['D4', 1], ['G3', 2], ['G3', 1], ['D4', 1], ['E4', 1], ['C4', 2]];
      const beat = name === 'evening' ? 0.82 : 0.7;
      const out = c.createGain(), bp = c.createBiquadFilter(), dl = c.createDelay(1.0), fb = c.createGain();
      bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 0.7; dl.delayTime.value = 0.31; fb.gain.value = 0.42;
      out.connect(bp); bp.connect(this.amb); bp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(this.amb);
      let t = t0;
      for (const [n, d] of seq) {
        const f = N[n] * 2, dur = d * beat, g = c.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.02, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.9);
        for (const [m, a] of [[1, 1], [2, 0.35], [3, 0.12]]) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * m; const og = c.createGain(); og.gain.value = a; o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 1); }
        g.connect(out); t += dur;
      }
      setTimeout(() => { try { out.disconnect(); bp.disconnect(); dl.disconnect(); fb.disconnect(); } catch (e) { /* もう切れている */ } }, (t - t0 + 6) * 1000);
    }
    /* 廊下を行く配膳車。車輪のがたつきと、食器のふれ合う音 */
    cart() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < 22; i++) {
        const g = Math.sin(Math.PI * i / 21) * 0.03 + 0.004, tt = t + i * 0.24 + Math.random() * 0.05;
        this._noise(tt, 0.07, 'bandpass', 1500 + Math.random() * 1400, 3, g);
        if (i % 5 === 2) this._sine(tt, 2400 + Math.random() * 900, 2300, 0.18, g * 0.5);
      }
    }
    /* ---------- 一日のあいだの、小さな音 ---------- */
    /* 引き戸を、軽く 2 回たたく音 */
    knock() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      for (const d of [0, 0.19]) { this._noise(t + d, 0.06, 'bandpass', 820, 2.2, 0.05); this._sine(t + d, 190, 120, 0.07, 0.03); }
    }
    /* 引き戸が、レールの上をすべる音 */
    door() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      this._noise(t, 0.55, 'lowpass', 420, 0.8, 0.03);
      this._noise(t + 0.5, 0.05, 'bandpass', 1100, 3, 0.02);
    }
    /* 電子体温計（ピピッ、を 3 回） */
    thermo() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime + 0.05;
      for (let k = 0; k < 3; k++) for (const d of [0, 0.12]) this._sine(t + k * 0.62 + d, 3150, 3150, 0.07, 0.016);
    }
    /* 血圧計。空気を送る音と、抜ける音 */
    cuff() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < 9; i++) this._noise(t + i * 0.33, 0.16, 'lowpass', 520, 0.8, 0.026);
      this._noise(t + 3.4, 2.2, 'highpass', 1700, 0.6, 0.012);
    }
    /* 家の電話の呼び出し（電子音のさえずり）を 2 回 */
    phone() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime + 0.05;
      for (let k = 0; k < 2; k++) for (let i = 0; i < 16; i++) this._sine(t + k * 3 + i * 0.06, i % 2 ? 1520 : 1240, i % 2 ? 1520 : 1240, 0.05, 0.016);
    }
    /* 玄関のチャイム（ピンポーン） */
    intercom() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime + 0.05;
      for (const [f, d, len] of [[659, 0, 0.9], [523, 0.55, 1.6]]) for (const [m, a] of [[1, 1], [2, 0.18]]) this._sine(t + d, f * m, f * m, len, 0.03 * a);
    }
    /* 館内放送の前の、のぼっていく 4 つの音と、くぐもった声 */
    pa() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime + 0.05;
      [523, 659, 784, 1047].forEach((f, i) => this._sine(t + i * 0.32, f, f, 0.9, 0.014));
      setTimeout(() => this.murmur(14, 0.35, 190), 1700);
    }
    /* 遠くの寺の鐘 */
    bell() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime + 0.05;
      for (const [f, a, d] of [[128, 1, 7], [256.8, 0.45, 5], [347, 0.3, 4], [512, 0.12, 3]]) this._sine(t, f, f * 0.995, d, 0.022 * a);
    }
    /* 遠くを通る電車や飛行機の、ふくらんで消えていく低い音 */
    rumble(sec) {
      if (!this.ok()) return;
      const c = this.ctx, t = c.currentTime, dur = sec || 8, s = c.createBufferSource(); s.buffer = this.buf.white; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 230;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.amb); s.start(t); s.stop(t + dur + 0.1);
    }
    /* 表をバイクが通りすぎる */
    bike() {
      if (!this.ok()) return;
      const c = this.ctx, t = c.currentTime, o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(118, t); o.frequency.linearRampToValueAtTime(124, t + 1.4); o.frequency.exponentialRampToValueAtTime(82, t + 3.2);
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 1.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
      o.connect(f); f.connect(g); g.connect(this.amb); o.start(t); o.stop(t + 3.5);
    }
    /* 遠ざかっていく救急車 */
    sirenFar() { this.siren(9, 0.5); }
    /* たんの吸引。管が空気と水を吸う音 */
    suction() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      this._noise(t, 2.6, 'bandpass', 1900, 1.2, 0.02);
      for (let i = 0; i < 7; i++) this._noise(t + 0.3 + i * 0.3 + Math.random() * 0.1, 0.08, 'bandpass', 600 + Math.random() * 500, 4, 0.03);
    }
    /* 廊下を行く足音 */
    steps(n) { if (!this.ok()) return; for (let i = 0; i < (n || 7); i++) setTimeout(() => this.step(false), i * 520); }
    /* 給湯器の、湯がわいたことを知らせるふし */
    bath() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime + 0.05;
      [784, 659, 523, 659, 784, 1047].forEach((f, i) => this._sine(t + i * 0.24, f, f, 0.32, 0.016));
    }
    /* 電車のドアが開くときの、ふたつの音 */
    doors() {
      if (!this.ok()) return;
      const t = this.ctx.currentTime + 0.05;
      for (let k = 0; k < 2; k++) for (const [f, d] of [[880, 0], [698, 0.32]]) this._sine(t + k * 0.8 + d, f, f, 0.4, 0.02);
      this._noise(t + 1.7, 0.9, 'lowpass', 600, 0.8, 0.03);
    }
    /* ドラマで見るときの、静かな伴奏。ピアノに近い音で、四つの和音をゆっくりくり返す。off で止める（最期の前は、音楽を落とす） */
    score(on) {
      if (this._score) { clearInterval(this._score); this._score = null; }
      if (!on || !this.ok()) return;
      const chords = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66], [164.81, 207.65, 246.94]];     // Am F G E
      let i = 0;
      const play = () => {
        if (!this.ok()) return;
        const c = this.ctx, t = c.currentTime + 0.05, ch = chords[i++ % chords.length];
        ch.forEach((f, k) => {
          const tt = t + k * 0.22, g = c.createGain();
          g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.011, tt + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, tt + 3.9);
          for (const [m, a] of [[1, 1], [2, 0.22], [3, 0.05]]) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * m; const og = c.createGain(); og.gain.value = a; o.connect(og); og.connect(g); o.start(tt); o.stop(tt + 4); }
          g.connect(this.mem);
        });
        this._sine(t, ch[0] / 2, ch[0] / 2, 4.2, 0.008, this.mem);
      };
      play(); this._score = setInterval(play, 4400);
    }
    /* 部屋の外の話し声や、テレビの声 */
    voices() { if (!this.ok()) return; this.murmur(9, 0.35, 160 + Math.random() * 60); setTimeout(() => this.murmur(6, 0.3, 210 + Math.random() * 40), 1600); }
    /* 遠くの子どもたちの声 */
    kids() { if (!this.ok()) return; for (let i = 0; i < 4; i++) setTimeout(() => this.murmur(3 + Math.floor(Math.random() * 3), 0.3, 300 + Math.random() * 90), i * 900 + Math.random() * 400); }
    /* 人の声らしい、言葉にならないつぶやき（まわりの音として鳴るので、こもり方も一緒に変わる） */
    murmur(n, g, pitch) {
      if (!this.ok()) return;
      const c = this.ctx; let t = c.currentTime + 0.02; const f0 = pitch || (150 + Math.random() * 90);
      for (let i = 0; i < n; i++) {
        const d = 0.11 + Math.random() * 0.1, o = c.createOscillator(); o.type = 'sawtooth';
        const pch = f0 * (0.92 + Math.random() * 0.2); o.frequency.setValueAtTime(pch, t); o.frequency.linearRampToValueAtTime(pch * (0.9 + Math.random() * 0.18), t + d);
        const gg = c.createGain(); this._env(gg, t, 0.03, 0.05 * g, d);
        for (const [fq, q, a] of [[520 + Math.random() * 380, 5, 1], [1150 + Math.random() * 700, 7, 0.5]]) {
          const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fq; b.Q.value = q;
          const bg = c.createGain(); bg.gain.value = a; o.connect(b); b.connect(bg); bg.connect(gg);
        }
        gg.connect(this.amb); o.start(t); o.stop(t + d + 0.15);
        t += d + (Math.random() < 0.22 ? 0.16 : 0.03);
      }
    }
    /* 遠くの救急車（高い音と低い音が、かわるがわる鳴る）。だんだん近づく */
    siren(sec, g) {
      if (!this.ok() || this._siren) return;
      const c = this.ctx, t = c.currentTime, o = c.createOscillator(); o.type = 'triangle';
      for (let k = 0, tt = t; tt < t + sec; k++, tt += 0.65) o.frequency.setValueAtTime(k % 2 ? 770 : 960, tt);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      const gg = c.createGain(); gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.02 * g), t + sec * 0.8);
      o.connect(lp); lp.connect(gg); gg.connect(this.amb); o.start(t); o.stop(t + sec);
      const h = this._siren = { o, gg }; o.onended = () => { if (this._siren === h) this._siren = null; };
    }
    stopSiren() {
      const h = this._siren; this._siren = null;
      if (h && this.ctx) { try { const now = this.ctx.currentTime; h.gg.gain.cancelScheduledValues(now); h.gg.gain.setTargetAtTime(0, now, 0.3); h.o.stop(now + 1.2); } catch (e) { /* もう止まっている */ } }
    }
    /* 人工呼吸器が、一定の間で空気を送る音 */
    vent(dur, g) {
      if (!this.ok()) return;
      const c = this.ctx, t = c.currentTime, src = c.createBufferSource(); src.buffer = this.buf.white; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 0.7;
      const gg = c.createGain(); gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.03 * g, t + 0.12);
      gg.gain.setValueAtTime(0.03 * g, t + Math.max(0.14, dur - 0.06)); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(gg); gg.connect(this.amb); src.start(t); src.stop(t + dur + 0.1);
      this._sine(t + dur, 300, 210, 0.04, 0.012 * g);
    }
    /* 心電図のモニターの、拍ごとの音をひとつ */
    blip() { if (this.ok()) this._sine(this.ctx.currentTime, 880, 880, 0.07, 0.022); }
    /* モニターの警報（短い音が 3 つ、2 つ）を n 回 */
    alarm(n) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      for (let k = 0; k < n; k++) for (const d of [0, 0.16, 0.32, 0.6, 0.76]) this._sine(t + k * 1.7 + d, 988, 988, 0.1, 0.03);
    }
    splash(g) {
      if (!this.ok()) return;
      const c = this.ctx, t = c.currentTime, src = c.createBufferSource(); src.buffer = this.buf.white; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(260, t + 1.1);
      const gg = c.createGain(); this._env(gg, t, 0.02, 0.5 * g, 1.2);
      src.connect(f); f.connect(gg); gg.connect(this.body); src.start(t); src.stop(t + 1.4);
    }
    bubbles(n, g) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < n; i++) { const f = 260 + Math.random() * 500; this._sine(t + Math.random() * 1.1, f, f * (1.5 + Math.random()), 0.06 + Math.random() * 0.05, 0.05 * g, this.body); }
    }

    update(dt) {
      if (!this.ok()) return;                    // 止まっているあいだに音を予約すると、再開時にまとめて鳴る
      this.t += dt;
      const c = this.ctx, now = c.currentTime;
      for (const k in this.targets) {
        const tv = this.targets[k];
        if (tv <= 0 && !this.layers[k]) continue;
        const L = this._layer(k);
        let v = tv * L.def.max;
        if (L.def.lfo) v *= (1 - L.def.lfo[1]) + L.def.lfo[1] * (0.5 + 0.5 * Math.sin(this.t * L.def.lfo[0] * 6.283 + k.length));
        L.cur = U.damp(L.cur, v, 1.4, dt);
        L.g.gain.setTargetAtTime(L.cur, now, 0.08);
      }
      const e = this.ev, a = this.evT;
      if (a.tick > 0) { e.tick -= dt; if (e.tick <= 0) { e.tick += 1; this._noise(now, 0.018, 'bandpass', 2600, 4, 0.05 * a.tick); } }
      if (a.birds > 0) {
        e.birds -= dt;
        if (e.birds <= 0) {
          e.birds = 1.5 + Math.random() * 5 / a.birds;
          const n = 2 + Math.floor(Math.random() * 4), f = 2300 + Math.random() * 1500;
          for (let i = 0; i < n; i++) this._sine(now + i * (0.09 + Math.random() * 0.05), f * (0.9 + Math.random() * 0.2), f * (1.15 + Math.random() * 0.3), 0.07, 0.022 * a.birds);
        }
      }
      if (a.cricket > 0) {
        e.cricket -= dt;
        if (e.cricket <= 0) { e.cricket = 0.9 + Math.random() * 0.5; for (let i = 0; i < 3; i++) this._sine(now + i * 0.075, 4300, 4300, 0.045, 0.014 * a.cricket); }
      }
      if (a.crow > 0) {
        e.crow -= dt;
        if (e.crow <= 0) { e.crow = 9 + Math.random() * 14; for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) this._sine(now + i * 0.42, 720, 520, 0.24, 0.018 * a.crow, this.amb, 'sawtooth'); }
      }
      if (a.pass > 0) {
        e.pass -= dt;
        if (e.pass <= 0) {
          e.pass = 4 + Math.random() * 9 / a.pass;
          const s = c.createBufferSource(); s.buffer = this.buf.brown; s.loop = true;
          const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(300, now); f.frequency.linearRampToValueAtTime(900, now + 1.4); f.frequency.linearRampToValueAtTime(260, now + 3); f.Q.value = 0.7;
          const g = c.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.16 * a.pass, now + 1.4); g.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
          s.connect(f); f.connect(g); g.connect(this.amb); s.start(now); s.stop(now + 3.4);
        }
      }
      if (a.clack > 0) { e.clack -= dt; if (e.clack <= 0) { e.clack = 1.55; for (const d of [0, 0.19]) this._noise(now + d, 0.07, 'lowpass', 420, 1, 0.1 * a.clack); } }
      if (a.drip > 0) { e.drip -= dt; if (e.drip <= 0) { e.drip = 2 + Math.random() * 5; this._sine(now, 1500, 900, 0.07, 0.03 * a.drip); } }

      /* 鼓動 */
      if (this.heartGain > 0.005 && !this.heartStopped) {
        this.heartNext -= dt;
        if (this.heartNext <= 0) {
          const iv = 60 / Math.max(18, this.heartBpm);
          this.heartNext = iv * (1 + (Math.random() - 0.5) * this.heartIrr);
          const g = this.heartGain;
          this._sine(now, 62, 38, 0.11, 0.5 * g, this.body); this._sine(now + Math.min(0.17, iv * 0.3), 54, 34, 0.09, 0.32 * g, this.body);
          if (a.beep > 0) this._sine(now, 880, 880, 0.07, 0.022 * a.beep);
          if (this.onBeat) this.onBeat();
        }
      } else if (a.beep > 0 && !this.heartStopped && !this.heartManual) {
        e.beep -= dt; if (e.beep <= 0) { e.beep = 60 / Math.max(18, this.heartBpm); this._sine(now, 880, 880, 0.07, 0.022 * a.beep); if (this.onBeat) this.onBeat(); }
      }
      /* 呼吸 */
      if (this.breathGain > 0.005) {
        this.breathNext -= dt;
        if (this.breathNext <= 0) {
          const iv = 60 / Math.max(3, this.breathRate); this.breathNext = iv;
          const g = this.breathGain, s = c.createBufferSource(); s.buffer = this.buf.white; s.loop = true;
          const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8;
          f.frequency.setValueAtTime(700, now); f.frequency.linearRampToValueAtTime(1150, now + iv * 0.38); f.frequency.linearRampToValueAtTime(520, now + iv * 0.85);
          const gg = c.createGain();
          gg.gain.setValueAtTime(0.0001, now); gg.gain.exponentialRampToValueAtTime(0.07 * g, now + iv * 0.32); gg.gain.exponentialRampToValueAtTime(0.004, now + iv * 0.42);
          gg.gain.exponentialRampToValueAtTime(0.05 * g, now + iv * 0.55); gg.gain.exponentialRampToValueAtTime(0.0001, now + iv * 0.9);
          s.connect(f); f.connect(gg); gg.connect(this.body); s.start(now, Math.random() * 2); s.stop(now + iv);
        }
      }
    }

    /* すべてを静かにする */
    hush(sec) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime, tc = (sec || 3) / 3;
      this.amb.gain.setTargetAtTime(0, now, tc); this.tin.gain.setTargetAtTime(0, now, tc); this.drone.gain.setTargetAtTime(0, now, tc);
      this.heartGain = 0; this.breathGain = 0;
      this.stopSiren();
    }
    /* 鳴っている途中の音（呼吸、鐘）をすぐに切る */
    cut() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      for (const g of [this.body, this.mem]) { g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(0, now, 0.04); g.gain.setTargetAtTime(1, now + 0.7, 0.05); }
      this.stopSiren();
    }
    restore() {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this.amb.gain.setTargetAtTime(1, now, 0.6); this.ambFilter.frequency.setTargetAtTime(18000, now, 0.3);
      this.tin.gain.setTargetAtTime(0, now, 0.2); this.drone.gain.setTargetAtTime(0, now, 0.3);
      this.heartGain = 0; this.breathGain = 0; this.heartStopped = false; this.heartManual = false;
      this.stopSiren();
    }
  }

  SI.Audio = Audio;
})(window.SI);
