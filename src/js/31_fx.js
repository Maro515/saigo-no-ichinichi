'use strict';
/* 最期の一日 — 最期の場面の効果（画面、視点、音をまとめて動かす） */
(function (SI) {
  const U = SI.U;

  class FX {
    constructor(env, rig, audio, ui) { this.env = env; this.rig = rig; this.audio = audio; this.ui = ui; this.tags = []; this.lv = 0; this.shakeHold = 0; this._timers = []; this.manualBreath = false; }

    reset() {
      this.tags = []; this.lv = 0; this.shakeHold = 0; this.manualBreath = false;
      for (const t of this._timers) clearTimeout(t);
      this._timers = [];
      this.audio.setLayer('rumble', 0);
      this.env.fxReset(true); this.env.fxRate = 2.2;
      const r = this.rig; r.shakeT = 0; r.shake = 0; r.dizzyT = 0; r.dizzy = 0; r.trembleT = 0; r.tremble = 0; r.fallT = 0; r.fallAmt = 0; r.sway = 1; r.calm(true);
      this.audio.restore(); this.audio.muffle(0); this.audio.tinnitus(0);
    }

    /* 異変が始まる瞬間 */
    onset(tags) {
      this.tags = tags;
      const e = this.env, r = this.rig, a = this.audio;
      if (tags.includes('impact')) {
        e.fx.flash = r.reduced ? 0.3 : 1.4; e.fxT.flash = 0; r.shake = 1.6; r.shakeT = 0.1; a.impact(); a.muffle(0.85); a.tinnitus(0.9);
        if (r.reduced) this.ui.wash('dark', 0.5, 600); else this.ui.washPulse('dark', 0.92, 140, 900);
        if (r.reduced) this._timers.push(setTimeout(() => this.ui.wash('dark', 0, 1200), 900));
      }
      if (tags.includes('shake')) { r.shakeT = 1; this.shakeHold = 1; a.setLayer('rumble', 1); a.thud(0.8); }
      if (tags.includes('fall')) this._timers.push(setTimeout(() => { r.fall(); a.thud(1); }, tags.includes('impact') ? 250 : 900));
      if (tags.includes('chest')) { a.thud(0.5); e.fx.vig = Math.max(e.fx.vig, 0.3); }
      if (tags.includes('head')) { e.fx.flash = 0.5; e.fxT.flash = 0; }
    }

    /* 0〜1 で深まっていく */
    level(tags, x) {
      this.tags = tags; this.lv = x;
      const e = this.env, f = e.fxT, r = this.rig, a = this.audio, has = (t) => tags.includes(t);
      let vig = 0, sat = 1, bright = 1, blur = 0, tunnel = 0, tintAmt = 0, tint = '#ffffff', aberr = 0, dbl = 0, wave = 0, heat = 0;
      let bpm = 72, hg = 0.1 + x * 0.25, irr = 0, br = 14, bg = 0, muf = 0, tin = 0, tremble = 0, dizzy = 0;
      if (x <= 0) { const ts = e.timeScaleT; e.fxReset(false); e.timeScaleT = ts; a.heart(72, 0.08, 0); a.breath(14, 0); return; }
      if (has('chest')) { vig += 0.2 + 0.35 * x; bpm = 96 + 40 * x; irr = 0.5 * x; hg += 0.45; br = 22; bg += 0.35 + 0.3 * x; tremble += 0.3; sat -= 0.15 * x; }
      if (has('breath')) { vig += 0.15 + 0.3 * x; br = 26 + 10 * x; bg += 0.5 + 0.4 * x; bpm = Math.max(bpm, 104); hg += 0.2; sat -= 0.25 * x; blur += 1.2 * x; }
      if (has('head')) { dizzy += 0.4 + 0.6 * x; aberr += 0.8 + 1.4 * x; dbl += 0.3 + 0.7 * x; tin += 0.5; vig += 0.2 * x; }
      if (has('impact')) { blur += 1.5 + 2.5 * x; sat -= 0.35; muf += 0.8; tin += 0.5 * (1 - x) + 0.2; vig += 0.25 + 0.3 * x; bpm = 110 - 50 * x; hg += 0.3; }
      if (has('water')) { tint = '#2f6f9a'; tintAmt += 0.3 + 0.4 * x; wave += 0.6 + 0.4 * x; muf += 0.92; blur += 1 + 1.5 * x; bright -= 0.3 * x; hg += 0.4; bpm = 100 - 40 * x; }
      if (has('smoke')) { tint = '#8f8c86'; tintAmt += 0.3 + 0.45 * x; blur += 1 + 2 * x; sat -= 0.5 * x; bg += 0.5; br = 24; bright -= 0.15 * x; }
      if (has('cold')) { tint = '#bcd2e8'; tintAmt += 0.2 + 0.3 * x; sat -= 0.4 * x; tremble += Math.sin(Math.min(1, x * 1.4) * Math.PI) * 1.2; bpm = 64 - 26 * x; br = 12 - 5 * x; bg += 0.15; bright += 0.1 * x; }
      if (has('heat')) { heat += 0.6 + 0.4 * x; bright += 0.25 * x; tint = '#fff0dc'; tintAmt += 0.15 + 0.2 * x; sat -= 0.25 * x; bpm = 120 + 20 * x; hg += 0.3; dizzy += 0.2 * x; }
      if (has('shake')) { r.shakeT = this.shakeHold ? 0.9 : 0; }
      if (has('sleep')) { vig += 0.15 + 0.3 * x; bpm = 60 - 24 * x; hg = 0.08 + 0.1 * x; br = 12 - 6 * x; bg += 0.22; blur += 0.8 * x; sat -= 0.15 * x; }
      if (has('fade')) { vig += 0.15 + 0.4 * x; sat -= 0.35 * x; blur += 2.2 * x; muf += 0.6 * x; tunnel += 0.35 * x * x; bpm = Math.min(bpm, 80 - 30 * x); }
      if (has('fall')) { blur += 0.6 * x; }
      f.vig = U.clamp(vig, 0, 0.9); f.sat = U.clamp(sat, 0.15, 1); f.bright = U.clamp(bright, 0.45, 1.5); f.blur = U.clamp(blur, 0, 7);
      f.tunnel = U.clamp(tunnel, 0, 0.8); f.tintAmt = U.clamp(tintAmt, 0, 0.8); e.fxTintT.set(tint); const calm = r.reduced ? 0.3 : 1;
      f.aberr = aberr * calm; f.double = dbl * calm; f.wave = wave * calm; f.heat = heat * calm;
      r.trembleT = tremble; r.dizzyT = dizzy; r.sway = 1 + bg * 2;
      a.heart(bpm, U.clamp(hg, 0, 1), irr); a.breath(br, this.manualBreath ? 0 : U.clamp(bg, 0, 1)); a.muffle(U.clamp(muf, 0, 1)); a.tinnitus(tin);
      this.ui.lidsHalf(has('sleep') && x > 0.55);
    }

    /* 一日を通して、体の重さがじわりと増していく（もう長くないと分かっている人だけ）。k は 0〜3 */
    weary(k) {
      const f = this.env.fxT;
      if (!k) return;
      f.vig = 0.07 * k; f.sat = 1 - 0.05 * k; f.bright = 1 - 0.025 * k;
      this.audio.breath(13.5 - k * 0.5, 0.05 + 0.05 * k);
      this.rig.sway = 1 + 0.25 * k;
    }

    /* 視野が閉じていく。どんな色で終わるかは効果による */
    fade(tags, ms) {
      const e = this.env, has = (t) => tags.includes(t);
      e.fxRate = 0.5;
      e.fxT.tunnel = 0.95; e.fxT.blur = 8; e.fxT.sat = 0.1; e.fxT.vig = 0.9;
      this.rig.shakeT = 0; this.rig.trembleT = 0; this.rig.dizzyT *= 0.3; this.shakeHold = 0;
      this.audio.setLayer('rumble', 0);
      let tone = null;
      if (has('heat') || has('cold')) tone = 'white'; else if (has('water')) tone = 'blue'; else if (has('smoke')) tone = 'gray';
      if (tone) { e.fxT.tunnel = 0.3; e.fxT.bright = tone === 'white' ? 1.6 : 0.6; this.ui.wash(tone, 0.94, ms * 0.8); }
      this.audio.muffle(0.9); this.audio.ambLevel(0.3, ms / 3000);
    }
  }

  SI.FX = FX;
})(window.SI);
