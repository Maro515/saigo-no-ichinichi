'use strict';
/* 最期の一日 — 画面の文字（語り、記憶、札、はじめと終わりの画面、過去帳） */
(function (SI) {
  const U = SI.U, el = U.el;

  class UI {
    constructor() {
      this.root = document.documentElement;
      this.advanceWaiters = [];
      this.onRecall = null; this.onQuit = null; this.onStart = null; this.onAgain = null; this.onHome = null; this.onSound = null;
      this.onUse = null; this.onRest = null; this.onPace = null; this.onStick = null;
      this.readSpeed = 1;
      this.auto = U.store.get('si.auto', true);      // 文章を自動で送るか
      this.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      el('btnNext').addEventListener('click', () => this.advance());
      el('btnRecall').addEventListener('click', () => { if (this.onRecall) this.onRecall(); });
      el('btnQuit').addEventListener('click', () => { if (this.onQuit) this.onQuit(); });
      el('btnStart').addEventListener('click', () => { if (this.onStart) this.onStart(); });
      el('btnAgain').addEventListener('click', () => { if (this.onAgain) this.onAgain(); });
      el('btnHome').addEventListener('click', () => { if (this.onHome) this.onHome(); });
      for (const id of ['btnSound', 'btnSound0']) el(id).addEventListener('click', () => { if (this.onSound) this.onSound(); });
      el('btnAuto').addEventListener('click', () => { this.setAuto(!this.auto); });
      el('btnRest').addEventListener('click', () => { if (this.onRest) this.onRest(); });
      /* 一時間を何分で過ごすか。はじめの画面では選び、体験のあいだは押すたびに 1 分ずつ変わる */
      for (const b of document.querySelectorAll('[data-pace]')) b.addEventListener('click', () => { if (this.onPace) this.onPace(parseInt(b.dataset.pace, 10)); });
      el('btnPace').addEventListener('click', () => { if (this.onPace) this.onPace((Math.round(this.paceMin || 2) % 5) + 1); });
      this._bindStick();
      this.setAuto(this.auto);
      for (const id of ['btnLedger', 'btnLedger2']) el(id).addEventListener('click', () => this.openLedger(null));
      el('btnLedgerClose').addEventListener('click', () => el('ledger').close());
      el('btnLedgerClear').addEventListener('click', () => this.clearLedger());
      el('ledger').addEventListener('close', () => { const b = el('btnLedgerClear'); b.textContent = '記録を消す'; delete b.dataset.armed; });
      window.addEventListener('keydown', (e) => {
        if (el('ledger').open) return;
        if (e.code === 'Escape') { if (this.onQuit && !el('hud').hidden) this.onQuit(); return; }
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'BUTTON') return;
        if (e.repeat) return;
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (this.advance()) return; if (this.onUse && this.onUse()) return; if (this.onRecall && !el('btnRecall').hidden) this.onRecall(); }
        else if (e.code === 'KeyE' || e.code === 'KeyF') { if (this.onUse) this.onUse(); }
        else if (e.code === 'KeyC') { if (this.onRest && !el('btnRest').hidden) this.onRest(); }
      });
    }

    /* 画面の左下の円。指を置いた向きへ歩く */
    _bindStick() {
      const base = el('stick'), knob = el('stickKnob');
      let pid = null;
      const set = (e) => {
        const r = base.getBoundingClientRect(), R = r.width / 2;
        let x = (e.clientX - (r.left + R)) / R, y = (e.clientY - (r.top + R)) / R;
        const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
        knob.style.transform = `translate(${x * R * 0.55}px, ${y * R * 0.55}px)`;
        if (this.onStick) this.onStick(Math.abs(x) < 0.15 ? 0 : x, Math.abs(y) < 0.15 ? 0 : -y);
      };
      const end = (e) => { if (e.pointerId !== pid) return; pid = null; knob.style.transform = ''; if (this.onStick) this.onStick(0, 0); };
      base.addEventListener('pointerdown', (e) => { if (pid != null) return; pid = e.pointerId; try { base.setPointerCapture(pid); } catch (err) { /* 古いブラウザ */ } set(e); e.preventDefault(); });
      base.addEventListener('pointermove', (e) => { if (e.pointerId === pid) set(e); });
      base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
    }
    stick(show) { const b = el('stick'); if (b.hidden === !show) return; b.hidden = !show; if (!show) { el('stickKnob').style.transform = ''; if (this.onStick) this.onStick(0, 0); } }

    /* ---- 自由に過ごすあいだの印 ---- */
    /* 目の前の相手や場所にできること（「妻に話しかける」「腰をおろす」） */
    prompt(text, key) {
      const p = el('prompt');
      if (!text) { p.classList.remove('is-on'); return; }
      el('promptText').textContent = text; el('promptKey').textContent = key || '';
      p.hidden = false; requestAnimationFrame(() => p.classList.add('is-on'));
    }
    /* 見つめている思い出の品の名前 */
    spot(text) {
      if ((text || '') === (this._spot || '')) return;
      this._spot = text || '';
      const p = el('spot');
      if (!text) { p.classList.remove('is-on'); return; }
      p.textContent = text; p.hidden = false; requestAnimationFrame(() => p.classList.add('is-on'));
    }
    /* 目を閉じるボタン。null で隠す */
    rest(state) {
      const b = el('btnRest');
      if (state == null) { b.hidden = true; this._actVis(); return; }
      b.hidden = false; b.textContent = state ? '目をあける' : '目を閉じる'; b.setAttribute('aria-pressed', state ? 'true' : 'false');
      this._actVis();
    }
    pace(v) {
      this.paceMin = v;
      const n = Math.round(v), ja = (v >= 1 && v <= 5 && Math.abs(v - n) < 0.01) ? U.kanji(n) + '分' : v + '分';
      el('btnPace').textContent = '一時間 ' + ja;
      for (const b of document.querySelectorAll('[data-pace]')) b.setAttribute('aria-pressed', parseInt(b.dataset.pace, 10) === n ? 'true' : 'false');
      el('paceNote').textContent = '朝から最期までは、ふつう十二時間ほどです。この速さなら、' + U.kanji(Math.max(1, Math.round(12 * v))) + '分前後の体験になります。目を閉じているあいだは、時計が速く進みます。';
    }

    /* ---- 先へ進む合図 ---- */
    advance() {
      if (!this.advanceWaiters.length) return false;
      const w = this.advanceWaiters.slice(); this.advanceWaiters.length = 0;
      for (const f of w) f();
      return true;
    }
    hasWaiter() { return this.advanceWaiters.length > 0; }
    setAuto(v) {
      this.auto = !!v; U.store.set('si.auto', this.auto);
      const b = el('btnAuto'); b.textContent = this.auto ? '自動送り' : '手送り'; b.setAttribute('aria-pressed', this.auto ? 'true' : 'false');
    }

    /* minMs たつまでは進めない。autoMs たつと自動で進む（手送りのときは、押されるまで待つ。force なら必ず自動） */
    waitAdvance(minMs, autoMs, token, force) {
      return new Promise((res, rej) => {
        if (token && token.aborted) return rej(new Error('abort'));
        let done = false, armed = false, stop;
        const btn = el('btnNext');
        let c1 = null, c2 = null;
        const clear = () => { if (c1) c1(); if (c2) c2(); btn.hidden = true; this._actVis(); const i = this.advanceWaiters.indexOf(finish); if (i >= 0) this.advanceWaiters.splice(i, 1); };
        const finish = () => { if (done) return; done = true; clear(); if (token) token.pending.delete(stop); res(); };
        c1 = U.visibleTimer(minMs, () => { armed = true; this.advanceWaiters.push(finish); btn.hidden = false; this._actVis(); });
        if (this.auto || force) c2 = U.visibleTimer(autoMs, finish);
        else c2 = U.visibleTimer(Math.max(autoMs * 12, 240000), finish);      // 手送りでも、置き去りにはしない
        stop = () => { if (done) return; done = true; clear(); rej(new Error('abort')); };
        if (token) token.pending.add(stop);
      });
    }
    readMs(text) { return (1500 + text.length * 105) / this.readSpeed; }
    _actVis() { el('act').hidden = el('btnNext').hidden && el('btnRecall').hidden && el('btnRest').hidden; }

    /* ---- まぶたと幕 ---- */
    lids(state, ms, token) {
      const r = this.root;
      r.style.setProperty('--lid-dur', (ms != null ? ms : 700) + 'ms');
      r.classList.toggle('is-shut', state === 'shut');
      if (state !== 'shut') r.classList.remove('is-half');
      this.lidState = state;
      return ms ? U.sleep(ms, token) : Promise.resolve();
    }
    lidsHalf(on) { if (this.lidState !== 'shut') this.root.classList.toggle('is-half', !!on); }
    wash(tone, opacity, ms) {
      const w = el('wash');
      w.style.setProperty('--wash-dur', (ms || 1200) + 'ms');
      if (tone) w.dataset.tone = tone; else delete w.dataset.tone;
      w.style.opacity = String(opacity);
    }
    washPulse(tone, opacity, inMs, outMs) {
      this.wash(tone, opacity, inMs);
      setTimeout(() => this.wash(tone, 0, outMs), inMs + 60);
    }

    /* ---- 時刻と場所 ---- */
    hud(show, time, place) {
      el('hud').hidden = !show;
      if (time) el('hudTime').textContent = time;
      if (place != null) el('hudPlace').textContent = place;
    }
    setTime(t) { el('hudTime').textContent = t; }
    /* 水の中で、泡が上がっていく */
    bubbles(n, calm) {
      const box = el('soma'); box.hidden = false;
      for (let i = 0; i < n; i++) {
        const b = document.createElement('i'); b.className = 'bubble';
        const sz = 6 + Math.random() * 16;
        b.style.cssText = `left:${8 + Math.random() * 84}%;width:${sz}px;height:${sz}px;animation-duration:${calm ? 400 : 1700 + Math.random() * 1600}ms;animation-delay:${Math.random() * 900}ms`;
        box.appendChild(b);
        setTimeout(() => { if (b.parentNode) b.parentNode.removeChild(b); }, 4600);
      }
    }
    /* 時刻が飛ぶ（気がつくと、時間がたっている） */
    timeJump(t) { const h = el('hudTime'); h.textContent = t; h.classList.remove('is-jump'); void h.offsetWidth; h.classList.add('is-jump'); }

    /* ---- 語り ---- */
    async narrate(text, token, o) {
      o = o || {};
      const box = el('narr'), p = el('narrText');
      box.hidden = false; p.classList.remove('is-snap'); p.textContent = text;
      p.classList.toggle('is-last', !!o.last);
      await U.sleep(30, token);
      p.classList.add('is-on');
      const read = this.readMs(text) * (o.slow ? 1.25 : 1);
      await this.waitAdvance(o.min != null ? o.min : 700, o.auto != null ? o.auto : read + 900, token, !!o.force);
      p.classList.remove('is-on');
      await U.sleep(o.gap != null ? o.gap : 520, token);
    }
    clearNarr() { const p = el('narrText'); p.classList.remove('is-on'); p.classList.remove('is-snap'); el('narr').hidden = true; }
    /* 語りを、送りの合図を待たずに出す。snap なら一瞬で出る */
    narrShow(text, snap) {
      const box = el('narr'), p = el('narrText');
      box.hidden = false; p.classList.remove('is-last'); p.classList.toggle('is-snap', !!snap); p.textContent = text;
      if (snap) p.classList.add('is-on'); else requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('is-on')));
    }
    /* 語りを、途中で断ち切る */
    narrCut() { const p = el('narrText'); p.classList.add('is-snap'); p.classList.remove('is-on'); el('narr').hidden = true; }

    /* ---- 記憶 ---- */
    async memory(label, sentences, token) {
      const box = el('mem'), tx = el('memText');
      el('memLabel').textContent = label; tx.textContent = '';
      box.hidden = false;
      await U.sleep(30, token);
      box.classList.add('is-on');
      await U.sleep(900, token);
      for (const s of sentences) {
        const p = document.createElement('p'); p.textContent = s; tx.appendChild(p);
        await U.sleep(30, token);
        p.classList.add('is-on');
        await this.waitAdvance(600, this.readMs(s) + 700, token);
      }
      await this.waitAdvance(300, 1400, token);
      box.classList.remove('is-on');
      await U.sleep(1300, token);
      box.hidden = true; tx.textContent = '';
    }
    clearMemory() { const b = el('mem'); b.classList.remove('is-on'); b.hidden = true; el('memText').textContent = ''; }

    /* ---- 札（目を閉じているあいだに出る文字） ---- */
    async card(lines, token, o) {
      o = o || {};
      const box = el('card'), tx = el('cardText');
      tx.textContent = ''; box.hidden = false;
      const ps = [];
      for (const l of lines) {
        const p = document.createElement('p'); p.textContent = l.text;
        if (l.sub) p.classList.add('is-sub'); if (l.gap) p.classList.add('is-gap');
        tx.appendChild(p); ps.push(p);
      }
      await U.sleep(60, token);
      let total = 0;
      for (const p of ps) { p.classList.add('is-on'); total += p.textContent.length; await U.sleep(o.step != null ? o.step : 850, token); }
      await this.waitAdvance(o.min != null ? o.min : 500, (o.hold != null ? o.hold : 1500 + total * 90) / this.readSpeed, token, !!o.force);
      for (const p of ps) p.classList.remove('is-on');
      await U.sleep(900, token);
      box.hidden = true; tx.textContent = '';
    }
    clearCard() { el('card').hidden = true; el('cardText').textContent = ''; }

    /* ---- 走馬灯 ---- */
    somaShow(text, xPct, yPct, ms) {
      const box = el('soma'); box.hidden = false;
      const s = document.createElement('span'); s.textContent = text;
      s.style.left = xPct + '%'; s.style.top = yPct + '%';
      box.appendChild(s);
      requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('is-on')));
      setTimeout(() => s.classList.remove('is-on'), ms);
      setTimeout(() => { if (s.parentNode) s.parentNode.removeChild(s); }, ms + 1000);
    }
    clearSoma() { const b = el('soma'); b.textContent = ''; b.hidden = true; }
    /* 視野のはしに浮かぶ、短い文字（体の感じ、まわりの声） */
    float(text, cls, xPct, yPct, ms) {
      const box = el('soma'); box.hidden = false;
      const s = document.createElement('span'); s.textContent = text; s.className = cls;
      if (xPct > 50) s.style.right = (100 - xPct) + '%'; else s.style.left = xPct + '%';
      s.style.top = yPct + '%';
      box.appendChild(s);
      requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('is-on')));
      setTimeout(() => s.classList.remove('is-on'), ms);
      setTimeout(() => { if (s.parentNode) s.parentNode.removeChild(s); }, ms + 1500);
    }

    hint(text, ms) {
      const h = el('hint');
      clearTimeout(this._hintT);
      if (!text) { h.classList.remove('is-on'); return; }
      h.textContent = text; h.hidden = false;
      requestAnimationFrame(() => h.classList.add('is-on'));
      if (ms) this._hintT = setTimeout(() => h.classList.remove('is-on'), ms);
    }
    reticle(show, p) {
      const r = el('reticle'); r.hidden = false;
      r.classList.toggle('is-on', !!show);
      el('reticleProg').style.setProperty('--p', String(p || 0));
    }
    recallButton(show) { el('btnRecall').hidden = !show; this._actVis(); }

    sound(on) {
      for (const id of ['btnSound', 'btnSound0']) { const b = el(id); b.textContent = on ? '音あり' : '音なし'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    }

    /* ---- はじめの画面 ---- */
    showTitle(count) {
      const t = el('title'); t.hidden = false; t.classList.remove('is-leaving');
      el('titleCount').textContent = count ? '収めた最期　' + U.kanji(count) : '';
      const b = el('btnStart'); b.removeAttribute('aria-busy'); b.textContent = 'はじめる'; b.disabled = false;
    }
    async hideTitle(token) {
      const t = el('title'); t.classList.add('is-leaving');
      await U.sleep(this.reduced ? 200 : 1500, token);
      t.hidden = true;
    }
    startBusy() { const b = el('btnStart'); b.setAttribute('aria-busy', 'true'); b.textContent = '支度しています'; }

    /* ---- おわりの画面 ---- */
    async showEpitaph(d) {
      el('epiName').textContent = d.name + '　' + d.ageJa;
      el('epiJob').textContent = d.jobJa;
      el('epiWhen').textContent = '最後の記憶　' + d.dateJa + '　' + d.timeJa;
      el('epiPlace').textContent = d.place + 'にて';
      el('epiCause').textContent = d.cause;
      el('epiNote').textContent = d.note;
      el('epiMem').textContent = d.memCount ? 'たどった記憶は' + U.kanji(d.memCount) + 'つ。' : '';
      const e = el('epi'); e.hidden = false; e.scrollTop = 0;
      await U.wait(60);
      e.classList.add('is-on');
      await U.wait(900);
      el('btnAgain').focus({ preventScroll: true });
    }
    hideEpitaph() { const e = el('epi'); e.classList.remove('is-on'); e.hidden = true; }

    /* ---- 過去帳 ---- */
    ledgerData() { return U.store.get('si.ledger', []); }
    addLedger(row) { const a = this.ledgerData(); a.unshift(row); U.store.set('si.ledger', a.slice(0, 600)); }
    openLedger(rows) {
      const a = Array.isArray(rows) ? rows : this.ledgerData(), list = el('ledgerList');
      list.textContent = '';
      const seen = new Set(a.map(r => r.id));
      el('ledgerSum').textContent = a.length ? `見送った人生 ${a.length}　出会った最期 ${seen.size} / ${this.total || 0}` : '';
      el('ledgerEmpty').hidden = a.length > 0; list.hidden = a.length === 0; el('btnLedgerClear').hidden = a.length === 0;
      for (const r of a) {
        const li = document.createElement('li');
        const d = document.createElement('span'); d.className = 'ledger-date'; d.textContent = r.day || '';
        const w = document.createElement('span'); w.className = 'ledger-who'; w.textContent = `${r.name}　${r.age}歳`;
        const c = document.createElement('span'); c.className = 'ledger-cause'; c.textContent = r.cause;
        const pl = document.createElement('span'); pl.className = 'ledger-place'; pl.textContent = r.place; c.appendChild(pl);
        li.appendChild(d); li.appendChild(w); li.appendChild(c); list.appendChild(li);
      }
      const dlg = el('ledger');
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    }
    clearLedger() {
      const b = el('btnLedgerClear');
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'ほんとうに消す'; return; }
      U.store.set('si.ledger', []); delete b.dataset.armed; b.textContent = '記録を消す';
      el('ledger').close();
    }

    /* 体験の画面をすべて片づける */
    clearPlay() {
      this.clearNarr(); this.clearMemory(); this.clearCard(); this.clearSoma(); this.hint(''); this.reticle(false, 0);
      this.recallButton(false); el('btnNext').hidden = true; this.rest(null); this.prompt(null); this.spot(null); this.stick(false); this._actVis(); this.hud(false);
      this.advanceWaiters.length = 0;
    }
  }

  SI.UI = UI;
})(window.SI);
