'use strict';
/* 最期の一日 — 最期の場面の運び。
   死因の性質で 4 つの運び方に分ける。
     rupture  断ち切られる（衝突、落下、落下物）。いつもの流れの途中で、予告なく来る
     collapse 体の中で起きる（胸、頭）。語りの途中で来て、そこから崩れていく
     struggle まわりに呑まれる（水、煙）。もがき、やがて静かになる
     ebb      引いていく（眠るように、病気の終わり、老衰）。息と息のあいだが、のびていく
   終わり方の順は 2 つ。ふつうは、視界が先に暗くなり、息が止まり、鼓動がそのあとに止まる。
   心臓が先に止まる最期（データの state に arrest / weak / brady がある件）では、鼓動が先に消え、あえぐ息はそのあとに出る。
   どちらも、音がいちばん最後に遠のく。 */
(function (SI) {
  const T = window.THREE, U = SI.U, L = SI.Life, K = SI.Kit;
  const PUBLIC = { street: 1, park: 1, shop: 1, train: 1, office: 1, worksite: 1 };
  const CARE = { hospital: 1, icu: 1, hospice: 1, facility: 1 };
  const OUT = { street: 1, park: 1, field: 1, mountain: 1, river: 1, sea: 1, worksite: 1 };
  const SIREN = { street: 1, park: 1, shop: 1, office: 1, worksite: 1 };
  const toMin = (t) => { const p = t.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); };
  const fromMin = (x) => { x = ((Math.round(x) % 1440) + 1440) % 1440; return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); };

  class Dying {
    constructor(app, cause, life, tk) {
      this.app = app; this.cause = cause; this.life = life; this.tk = tk;
      this.ui = app.ui; this.fx = app.fx; this.audio = app.audio; this.env = app.env; this.rig = app.rig;
      this.end = cause.end; this.tags = cause.end.fx;
      this.lines = cause.end.lines.map(l => L.resolve(l, life));
      this.txt = app.data.ending || { sense: {}, voice: {}, after: {} };
      this.pace = app.pace != null ? app.pace : (app.fast ? 1 / Math.min(app.fast, 10) : 1);
      this.r = app.r || Math.random;
      this.hour = U.timeToHour(this.end.t);
      /* 体の状態。vent 人工呼吸器がついている / still 体を動かせない / choke 気道がふさがっている / quiet 意識のないまま水や煙に呑まれる */
      const state = cause.end.state || [];
      this.vent = state.includes('vent'); this.still = state.includes('still'); this.choke = state.includes('choke');
      this.quiet = state.includes('quiet') || ((this.has('water') || this.has('smoke')) && (this.has('sleep') || this.has('head') || this.has('shake') || this.end.stage === 'bath'));
      /* 心臓が息より先に止まる最期と、その止まり方（件ごとにデータで決める）。fib こまかく乱れて消える / weak 速いまま弱くなって消える / brady 遅くなって止まる */
      this.heartEnd = state.includes('arrest') ? 'fib' : (state.includes('weak') ? 'weak' : (state.includes('brady') ? 'brady' : null));
      this.allText = cause.beats.map(b => b.text).concat(cause.end.lines).join('');
      this.mode = this.classify();

      this.slow = this.mode === 'ebb' && (this.has('sleep') || cause.cat === 'old' || !!cause.aware) && this.heartEnd !== 'fib';     // 鼓動が乱れて止まる最期は、数分のうちに終わる
      this.used = {}; this.held = null; this.bp = null; this.breathDone = null;
      this.times = this.timePlan(); this.t0 = performance.now();
    }

    has(t) { return this.tags.includes(t); }
    /* 効果を深める。鼓動の速さは、心臓の止まり方の印があればそれに合わせる（異変が始まってから） */
    level(x) {
      this.fx.level(this.tags, x);
      if (x <= 0) return;
      const a = this.audio, he = this.heartEnd;
      if (he === 'weak') a.heart(126 + 12 * x, U.clamp(0.62 - 0.3 * x, 0.2, 1), 0.06);          // 速いまま、弱くなっていく
      else if (he === 'brady') a.heart(Math.max(24, 46 - 14 * x), 0.55, 0.04);                   // ゆっくり、間があく
    }
    /* 確認用（?dbg=1）: いまどの段かを、画面の上に出す */
    mark(name) { if (!this.app.q.get('dbg')) return; const h = document.getElementById('hint'); h.hidden = false; h.classList.add('is-on'); const b = this.body; h.textContent = this.mode + ' / ' + name + ' / ' + ((performance.now() - this.t0) / 1000).toFixed(1) + ' / body ' + (b ? b.userData.kind : 'none') + (this.rig.keepBody ? ' keep' : '') + (this.rig.bodyHolder.visible ? ' vis' : ' hid') + ' / ' + this.rig.fallMode; }
    wait(ms) { return U.sleep(ms * this.pace, this.tk); }
    say(line, o) { return this.ui.narrate(line, this.tk, Object.assign({ slow: true, gap: 760 }, o || {})); }
    /* ドラマで見るとき: 異変の前の行では、まだ視点が動く（振り向く、右を見る…）。異変が来たら止める */
    cue(i) { const d = this.app.drama; if (d && d.endCue) d.endCue(this.lines[i], i, this); }
    hitNow() { const d = this.app.drama; if (d && d.endHit) d.endHit(); }
    get body() { return this.rig.bodyHolder.children[0] || null; }
    gesture(name, o) { const b = this.body; if (!this.still && b && b.userData.gesture && this.rig.bodyHolder.visible) b.userData.gesture(name, o); }

    classify() {
      const c = this.cause, sudden = !c.aware && (c.cat === 'acc' || c.cat === 'dis' || c.cat === 'crm');      // 事件も、事故と同じく突然に来る
      const none = (...ts) => !ts.some(t => this.has(t));
      if (this.vent) return 'ebb';                                           // 機械が息を送っている。本人はもがかない
      if (this.choke) return 'struggle';
      if (this.has('impact') && !CARE[this.end.stage]) return 'rupture';     // 病室が最期の場所なら、けがは引いていく最期として運ぶ
      if (sudden && !CARE[this.end.stage] && this.end.hit > 0 && this.has('fall') && none('water', 'smoke', 'cold', 'heat', 'breath', 'sleep', 'chest', 'head')) return 'rupture';
      if (this.has('water') || this.has('smoke')) return 'struggle';
      if ((this.has('chest') || this.has('head')) && !c.aware && !this.has('sleep')) return 'collapse';
      if ((this.heartEnd === 'fib' || this.heartEnd === 'weak') && !this.has('sleep') && !CARE[this.end.stage]) return 'collapse';   // 急に倒れる（心室細動、大出血など）。病気を知っていても、その瞬間は急に来る
      return 'ebb';
    }
    /* いちばん強く出ている体の感じ */
    primary() { for (const t of ['water', 'smoke', 'chest', 'head', 'breath', 'cold', 'heat', 'sleep', 'fade']) if (this.has(t)) return t; return 'fade'; }

    /* 引いていく最期では、場面を少し前の時刻から始めて、気がつくたびに時間が進んでいる */
    timePlan() {
      const n = this.lines.length, endM = toMin(this.end.t);
      if (!this.slow || n < 2) return null;
      const gap = (endM - toMin(this.cause.beats[2].t) + 1440) % 1440;
      const span = Math.min(gap * 0.6, 24 + this.r() * 22);
      if (span < 6) return null;
      const out = [];
      for (let i = 0; i < n; i++) out.push(fromMin(endM - span * (1 - i / (n - 1))));
      return out;
    }
    /* 場面に入るときの設定（始まりの時刻だけが違う） */
    scene() { return this.times ? Object.assign({}, this.end, { t: this.times[0] }) : this.end; }

    /* ---------- 短い言葉 ---------- */
    fits(x, late) {
      if (x.late && !late) return false;
      if (!x.if) return true;
      const c = this.cause, st = this.end.stage, h = this.hour, w = this.life.weather;
      return x.if.split(',').every(k => {
        if (k === 'out') return !!OUT[st];
        if (k === 'in') return !OUT[st] && st !== 'car' && st !== 'train';
        if (k === 'fall') return !!this.fell;
        if (k === 'env') return c.cat === 'acc' || c.cat === 'dis' || c.cat === 'crm';
        if (k === 'ill') return c.cat === 'ill' || c.cat === 'old';
        if (k === 'day') return h >= 6.5 && h < 17.5;
        if (k === 'dawn') return h >= 3.5 && h < 6.6;
        if (k === 'clear') return w === 'clear';
        if (k === 'sudden') return this.mode === 'rupture' || this.mode === 'collapse';
        if (k === 'awake') return !this.quiet;
        if (k === 'self') return !this.vent && !this.choke;
        if (k === 'exposed') return (c.cat === 'acc' || c.cat === 'dis' || c.cat === 'crm') && !this.has('impact') && !this.has('chest') && !this.has('fall') && (this.has('water') || !!OUT[st] || /低体温|凍/.test(c.name));   // 寒さにさらされている
        if (k.slice(0, 2) === 'v:') return k.slice(2).split('|').includes(this.end.v || 'city');
        return true;
      });
    }
    /* 体の感じを、視野のはしに浮かべる */
    sense(tag, late) {
      if (this.vent && tag !== 'sleep') tag = 'fade';              // 機械が息を送り、薬で眠っている人には、体の感じを言い立てない
      const pool = (this.txt.sense[tag] || []).filter(x => this.fits(x, late) && !this.used[x.t] && !(x.k || []).some(k => this.allText.includes(k)));      // その日の語りに同じ語があれば、重ねて言わない
      if (!pool.length) return false;
      const x = U.pick(this.r, pool); this.used[x.t] = 1;
      /* 声が出ているあいだは、その反対側に出す（重ならないように） */
      const now = performance.now(), lv = this.lastVoice;
      const left = (lv && now - lv.t < 4200) ? lv.side !== 'L' : this.r() < 0.5;
      this.lastSense = { side: left ? 'L' : 'R', t: now };
      this.ui.float(x.t, 'is-sense', left ? 6 + this.r() * 6 : 88 + this.r() * 6, 12 + this.r() * 12, Math.max(900, 3600 * this.pace));
      return true;
    }
    /* 声。言葉は小さく出て、音はつぶやきとして鳴る */
    voice(kind, o) {
      o = o || {};
      const pool = (this.txt.voice[kind] || []).filter(t => !this.used[kind + t]);
      if (!pool.length) return false;
      const raw = o.first ? pool[0] : U.pick(this.r, pool); this.used[kind + raw] = 1;
      const text = L.resolve(raw.replace(/\{名\}/g, this.life.name), this.life);
      const now = performance.now(), ls = (this.lastSense && now - this.lastSense.t < 4200) ? this.lastSense : null;
      const side = o.side || (ls ? (ls.side === 'L' ? 'R' : 'L') : (this.r() < 0.5 ? 'L' : 'R'));
      this.lastVoice = { side, t: now };
      /* 同じ側に体の感じの言葉が出ているときは、その下へ逃がす */
      const y = (ls && ls.side === side) ? 66 + this.r() * 4 : 40 + this.r() * 12;
      this.ui.float('「' + text + '」', 'is-voice' + (o.far ? ' is-far' : ''), side === 'L' ? 6 : 94, y, Math.max(800, 2800 * this.pace));
      this.audio.murmur(Math.max(2, Math.round(text.length * 0.55)), o.far ? 0.55 : 1, o.pitch);
      return true;
    }

    /* ---------- そばにいる人 ---------- */
    comp() { const f = this.app.companion; return (f && f.userData.react) ? f : null; }
    compSide() {
      const f = this.app.companion; if (!f) return null;
      const p = new T.Vector3(); f.getWorldPosition(p); p.sub(this.rig.pos);
      return (p.x * Math.cos(this.rig.baseYaw) - p.z * Math.sin(this.rig.baseYaw)) > 0 ? 'R' : 'L';
    }
    compPitch() { const c = this.life.close; return c.age < 13 ? 290 : (c.sex === 'f' ? 215 : 128); }
    /* level: 0 気づいて顔を向ける / 1 身を乗り出す / 2 手を取る / 3 うつむいて、肩をふるわせる */
    attend(level) {
      const f = this.comp(); if (!f) return;
      const p = new T.Vector3(); f.getWorldPosition(p);
      const d = this.rig.pos.clone().sub(p);
      let yaw = Math.atan2(d.x, d.z) - f.rotation.y;
      while (yaw > Math.PI) yaw -= Math.PI * 2; while (yaw < -Math.PI) yaw += Math.PI * 2;
      const r = { hy: U.clamp(yaw, -1.15, 1.15) * 0.85, att: 1, hp: level >= 1 ? 0.14 : 0.04 };
      if (level >= 1) r.lean = 0.26;
      if (level >= 2) { const ln = this.hold(f, p); if (ln != null) r.lean = ln; }
      if (level >= 3) { r.hp = 0.5; r.sob = 1; if (!this.held) r.lean = 0.42; }
      f.userData.react(r);
    }
    /* 手を取る。こちらの手を少し寄せ、相手はその上に手を重ねる。届く分だけ身を乗り出す */
    hold(f, p) {
      const b = this.body;
      if (!b || !b.userData.wrist || !this.rig.bodyHolder.visible || !/^lie|^sit$/.test(b.userData.kind || '')) return null;
      if (this.held) return this.held.lean;
      const wl = b.userData.wrist('L'), wr = b.userData.wrist('R');
      const mine = wl.distanceTo(p) < wr.distanceTo(p) ? 'L' : 'R', my = mine === 'L' ? wl : wr;
      const d = p.clone().sub(my); d.y = 0; const dist = d.length();
      if (dist > 1.3 || dist < 0.2) return null;
      const meet = my.clone().addScaledVector(d.normalize(), Math.min(0.2, dist * 0.32));
      b.userData.gesture('held', { side: mine, target: meet, rate: 1.4 });
      const bones = f.userData.parts.bones, sl = new T.Vector3().setFromMatrixPosition(bones.upperarmL.matrixWorld), sr = new T.Vector3().setFromMatrixPosition(bones.upperarmR.matrixWorld);
      const side = sl.distanceTo(meet) < sr.distanceTo(meet) ? 'L' : 'R';
      let far = (side === 'L' ? sl : sr).distanceTo(meet);
      /* 遠ければ、そばへ寄る（椅子に掛けているときは、浅く掛け直すくらいまで） */
      const room = f.userData.pose === 'sit' || f.userData.pose === 'lean' ? 0.22 : 0.65, need = Math.min(room, Math.max(0, far - 0.6));
      if (need > 0.02) {
        const step = meet.clone().sub(p); step.y = 0; step.normalize().multiplyScalar(need);
        const to = f.position.clone(); to.x += step.x; to.z += step.z;         // 場面の座標は、世界の座標と同じ向き
        f.userData.react({ move: to });
        far -= need;
      }
      const lean = U.clamp((far - 0.42 * f.scale.x) / 0.42, 0.18, 0.9);
      f.userData.react({ reach: { side, target: () => { const w = b.userData.wrist(mine); w.y += 0.042; return w; } } });
      this.held = { mine, lean };
      return lean;
    }

    /* ---------- 息 ---------- */
    setBreath(v) { const b = this.body; if (b && b.userData.breath) b.userData.breath(v); }
    async tween(sec, fn) {
      const t0 = performance.now(), ms = sec * 1000 * this.pace;
      for (;;) {
        const x = Math.min(1, (performance.now() - t0) / Math.max(1, ms));
        fn(U.smooth(x));
        if (x >= 1) break;
        await U.sleep(34, this.tk);
      }
    }
    /* 自分の息を、ひと息ずつ鳴らす。間は bp で決まり、少しずつのびていく */
    startBreath() {
      this.fx.manualBreath = true; this.audio.breath(12, 0);
      if (this.vent) { this.ventOn = true; this.ventLoop().catch(() => { }); return; }
      this.bp = { period: 4.0, pause: 0.3, gain: 0.45, rattle: 0, gasp: false, on: true };
      this.breathDone = this.breathLoop().catch(() => { });
    }
    /* 人工呼吸器の息。間は変わらず、最後まで同じ調子で続く */
    async ventLoop() {
      while (this.ventOn) {
        this.audio.vent(1.1 * this.pace, 1);
        await this.tween(1.1, v => this.setBreath(v));
        await this.tween(1.5, v => this.setBreath(1 - v));
        await this.wait(1400);
      }
    }
    async breathLoop() {
      const a = this.audio;
      while (this.bp.on) {
        const b = this.bp, inD = b.gasp ? 0.75 : b.period * 0.4, outD = b.period * 0.6;
        a.breathIn(inD * this.pace, b.gain, b.gasp); await this.tween(inD, v => this.setBreath(v));
        a.breathOut(outD * this.pace, b.gain, b.rattle); await this.tween(outD, v => this.setBreath(1 - v));
        const t0 = performance.now();
        while (this.bp.on && performance.now() - t0 < b.pause * 1000 * this.pace) await U.sleep(60, this.tk);
      }
    }
    breathStage(u, onset) {
      const b = this.bp; if (!b) return;
      const fast = onset && !this.slow && this.has('breath');        // 急な息苦しさは、異変が始まってから、浅く速い息になる
      b.period = fast ? U.lerp(2.1, 3.6, u * u) : U.lerp(4.0, 5.0, u);
      b.pause = fast ? 0.05 + 4.5 * u * u * u : 0.3 + 5.2 * u * u;
      b.gain = U.lerp(fast ? 0.6 : 0.45, 0.62, u);
      b.gasp = u > 0.78;
    }
    async stopBreath() { if (this.bp) { this.bp.on = false; await this.breathDone; } }

    /* ---------- 意識がとぎれる ---------- */
    async dip(ms, half) {
      await this.ui.lids('shut', 380 * this.pace, this.tk);
      await this.wait(ms);
      await this.ui.lids('open', 900 * this.pace, this.tk);
      if (half) this.ui.lidsHalf(true);
    }
    /* 長いまばたき。目をあけると、時間が進んでいる */
    async skip(i) {
      const ui = this.ui, t = this.times[i];
      await ui.lids('shut', 1500 * this.pace, this.tk);
      this.env.setConditions({ hour: U.timeToHour(t) });
      ui.timeJump(t);
      this.attend(i === 1 ? 1 : 2);
      await ui.card([{ text: U.timeJa(t), sub: true }], this.tk, { hold: 900, step: 250, min: 250, force: true });
      await ui.lids('open', 2600 * this.pace, this.tk);
      if (i >= 2) ui.lidsHalf(true);
    }

    /* ---------- 倒れる ---------- */
    /* 立っていて倒れたときは、地面に横たわる体に取りかえる（目の前に、自分の手が見える） */
    swapFallen() {
      const rig = this.rig;
      this.fell = true;
      if (rig.fallMode !== 'stand' || !(SI.Assets && SI.Assets.ready)) return;
      const st = this.app.stage, opt = Object.assign({}, (st.body && st.body.stand) || {}, { ground: 0.11 });
      rig.setBody(K.body('fallen', opt)); rig.keepBody = true;
      /* 目は、地面に投げ出された自分の手のほうへ向く */
      const b = this.body;
      if (b && b.userData.wrist) {
        rig.update(0); rig.root.updateMatrixWorld(true);
        const cam = new T.Vector3(); rig.cam.getWorldPosition(cam);
        const fwd = new T.Vector3(-Math.sin(rig.baseYaw), 0, -Math.cos(rig.baseYaw));
        const hand = b.userData.wrist('L').addScaledVector(fwd, 0.09);
        rig.lookToward(cam.clone().addScaledVector(fwd, 2).lerp(hand, 0.62));
      }
    }
    async drop() {
      const rig = this.rig;
      rig.fall(); this.audio.thud(1); rig.jolt(rig.reduced ? 0.3 : 0.9);
      await this.wait(620);
      if (rig.fallMode === 'stand') { await this.ui.lids('shut', 260 * this.pace, this.tk); this.swapFallen(); await this.wait(420); await this.ui.lids('open', 1300 * this.pace, this.tk); }
      else this.fell = true;
      this.sense('fall');
    }

    /* ---------- まわりの人 ---------- */
    others(k) {
      if (this.app.companion) {
        if (k === 0) { this.attend(1); this.voice('alarm', { side: this.compSide(), pitch: this.compPitch(), first: true }); }
        else if (k === 1) { this.attend(2); this.voice('alarm', { side: this.compSide(), pitch: this.compPitch(), far: true }); }
        return;
      }
      const st = this.end.stage;
      if (CARE[st] && k === 1) { this.voice(st === 'icu' ? 'icu' : 'staff', { far: true, first: true }); return; }
      if (PUBLIC[st] && this.hour >= 6 && this.hour < 22.5 && (k === 0 || this.r() < 0.7)) this.voice(this.mode === 'rupture' ? 'bystander' : 'rescue', { far: k > 0 });
    }
    sirenFar() {
      const st = this.end.stage;
      if (SIREN[st] || (st === 'car' && this.end.v !== 'mountain')) this.audio.siren(42 * this.pace + 8, 0.9);
    }

    /* ========== 断ち切られる ========== */
    async rupture() {
      const { ui, fx, audio: a, env: e, rig, lines, tags } = this, n = lines.length, hit = this.end.hit, red = rig.reduced;
      const blow = Math.min(n - 1, hit + ((this.has('shake') && hit + 1 < n - 1) ? 1 : 0));
      for (let i = 0; i < blow; i++) {
        if (i === hit) { fx.onset(['shake']); fx.level(['shake'], 0.4); }       // 先に、揺れが来る
        this.cue(i);
        await this.say(lines[i], i === hit ? { force: true, min: 400 } : null);
      }
      ui.clearNarr();
      /* いつものように、灯がともる。見つめているうちに、それは来る */
      if (this.app.drama) await this.wait(((blow === 0 ? 1800 : 700) + this.r() * 700) * this.pace);      // ドラマでは、灯を見つめるのを待たない（見つめる人がいない）
      else if (!this.has('shake')) await this.app.decoyLight((blow === 0 ? 2400 : 900) * this.pace, (4800 + this.r() * 3600) * this.pace, this.tk);
      else await this.wait(700);
      this.mark('snap');
      /* その一瞬。何が起きたかは、読みきれない */
      const st = this.end.stage, trf = /^trf/.test(this.cause.id);
      if (st === 'car') a.screech(0.7, 0.8);
      else if (st === 'street' && trf) { a.screech(0.6, 0.6); if (this.r() < 0.5) a.horn(0.5, 0.8); }
      const dr = this.app.drama;
      if (dr && dr.endBlow) { try { await dr.endBlow(this); } catch (e) { if (this.tk.aborted) throw e; } }      // 迫ってくるもの（ドラマで見るとき）
      this.hitNow();
      ui.narrShow(lines[blow], true);
      await this.wait(U.clamp(ui.readMs(lines[blow]) * 0.34, 600, 1250));
      this.mark('blow');
      this.app.seize();
      /* 断ち切られる。光、暗闇、無音 */
      ui.hud(false); ui.narrCut(); ui.hint('');
      a.blow({ glass: st === 'car' || this.cause.cat === 'dis', metal: st === 'car' || st === 'worksite' || trf });
      a.dead(true); a.muffle(0.95);
      e.fx.flash = red ? 0.25 : 1.5; e.fxT.flash = 0;
      rig.jolt(red ? 0.5 : 2.4);
      e.timeScale = 0.08; e.timeScaleT = 0.08;                    // まわりの時間が、ほとんど止まる
      await U.sleep(red ? 20 : 70, this.tk);
      ui.wash('dark', 1, red ? 260 : 40);
      if (this.has('fall') || this.end.pos === 'walk' || this.end.pos === 'stand') rig.fall();
      await this.wait(560);
      a.tinnitus(1.1, 0.25);                                      // 何も見えないなかで、耳鳴りだけが立ち上がる
      await this.wait(950);
      this.swapFallen();
      this.mark('return');
      /* 戻ってくる。にじんだ光が先に、音はあとから、こもって */
      this.level(0.3);
      e.fx.blur = 7; e.fxT.blur = 3; e.fxT.sat = 0.5; e.fxT.double = red ? 0.2 : 0.9;
      ui.wash('dark', 0.16, 2800 * this.pace);
      e.fxT.expo = 1.5;                                           // 目が慣れない。白っぽく、にじむ
      a.dead(false, 1.4); a.ambLevel(0.42, 1.2); a.muffle(0.93);
      a.heart(126, 0.85, 0.5); a.breath(30, 0.7);
      await this.wait(1700);
      e.timeScaleT = 0.28;
      await this.say(lines[blow]);                                // 何が起きたのかが、遅れて分かる
      const rest = lines.slice(blow + 1);
      for (let k = 0; k < rest.length; k++) {
        const x = (k + 1) / rest.length;
        this.level(0.4 + 0.5 * x);
        e.fxT.double = (red ? 0.15 : 0.7) * (1 - x * 0.6); e.timeScaleT = U.lerp(0.3, 0.75, x);
        e.fxT.blur = Math.min(e.fxT.blur, 1.6 + 2.2 * x); e.fxT.vig = Math.min(e.fxT.vig, 0.38 + 0.3 * x); e.fxT.sat = Math.max(e.fxT.sat, 0.5 - 0.3 * x);   // 目の前の自分の手は、見えている
        ui.wash('dark', U.lerp(0.14, 0.34, x), 2200 * this.pace); e.fxT.expo = U.lerp(1.5, 1.15, x);
        this.mark('rest ' + k);
        this.sense('impact', x > 0.55);
        this.others(k);
        if (k === 1 || rest.length === 1) this.sirenFar();
        await this.say(rest[k]);
        if (k < rest.length - 1) await this.dip(240 + 220 * k, k >= 1);
      }
    }

    /* ========== 体の中で起きる ========== */
    async collapse() {
      const { ui, fx, audio: a, env: e, rig, lines, tags } = this, n = lines.length, hit = this.end.hit, red = rig.reduced;
      const chest = this.has('chest'), head = this.has('head');
      for (let i = 0; i < hit; i++) {
        this.cue(i);
        if (i < hit - 1) await this.say(lines[i]);
        else { ui.narrShow(lines[i]); await this.wait(ui.readMs(lines[i]) * 0.72 + 500 + this.r() * 1500); }   // この行を読んでいる途中で、それは来る
      }
      if (hit === 0) await this.wait(1700 + this.r() * 1500);
      this.mark('strike');
      this.hitNow();
      this.app.seize();
      /* 発作 */
      ui.narrCut();
      const arrest = !chest && !head;                              // 痛みもなく、ただ崩れる
      if (head && !chest) {
        /* 頭の中で起きたとき: 光と、音の切れ */
        e.fx.flash = red ? 0.15 : 0.7; e.fxT.flash = 0; rig.jolt(red ? 0.2 : 0.5);
        a.dead(true); a.tinnitus(0.9, 0.15);
        this.gesture('temple', { side: 'R' });
        rig.headT = { p: -0.1, r: 0.14, y: 0.05 };
        if (this.app.companion) this.attend(0);
        await this.wait(800);
        a.dead(false, 0.9);
      } else if (this.heartEnd === 'weak') {
        /* 大出血、肺の血管の詰まりなど: 脈は速いまま弱くなり、目の前が暗くなる */
        a.heart(134, 0.6, 0.1); e.pulse(0.4); rig.jolt(red ? 0.15 : 0.3);
        if (chest) { this.gesture('clutch', { shake: 1 }); if (!this.still) rig.headT = { p: this.end.pos === 'lie' ? -0.25 : -0.7, r: 0.04, y: 0 }; }
        else rig.headT = { p: -0.25, r: 0.06, y: 0 };
        if (this.app.companion) this.attend(0);
        await this.wait(1200);
      } else {
        /* 胸で起きたとき: 打つはずの鼓動が、ひとつ来ない */
        a.manualHeart(true, 60); a.beat(1.5); e.pulse(0.45); rig.jolt(red ? 0.2 : 0.55);
        a.breathIn(0.35, 1.3, true);
        if (!arrest) { this.gesture('clutch', { shake: 1 }); if (!this.still) rig.headT = { p: this.end.pos === 'lie' ? -0.3 : -0.85, r: 0.04, y: 0 }; }   // 体が、前に折れる
        if (this.app.companion) this.attend(0);
        await this.wait(1150);
        a.beat(1.2); e.pulse(0.3); await this.wait(230); a.beat(1.0); e.pulse(0.24);
        a.manualHeart(false);
        if (!arrest && !this.still) rig.headT = { p: this.end.pos === 'lie' ? -0.2 : -0.55, r: 0.05, y: 0 };
      }
      fx.onset(tags.filter(t => t !== 'fall' && t !== 'head'));
      for (let i = hit; i < n; i++) {
        const k = i - hit, x = (k + 1) / (n - hit);
        this.level(0.3 + 0.6 * x); this.mark('line ' + k);
        if (k === ((arrest && this.heartEnd === 'fib') ? 0 : 1) && this.has('fall')) await this.drop();     // 心臓が急に止まるときは、すぐに崩れる
        if (k > 0) { this.sense(chest ? 'chest' : (head ? 'head' : 'fade'), x > 0.6) || this.sense('fade', true); }
        this.others(k);
        if (k === 2) this.sirenFar();
        await this.say(lines[i], k === 0 ? { min: 500 } : null);
        if (i < n - 1 && k > 0) await this.dip(220 + 200 * k, x > 0.5);
      }
    }

    /* ========== まわりに呑まれる ========== */
    async struggle() {
      const { ui, fx, audio: a, rig, lines, tags } = this, n = lines.length, hit = this.end.hit, red = rig.reduced;
      const water = this.has('water'), choke = this.choke, quiet = this.quiet;
      for (let i = 0; i < n; i++) {
        const k = i - hit, x = k < 0 ? 0 : (k + 1) / (n - hit);
        if (k < 0) this.cue(i);
        if (k === 0) {
          this.hitNow();
          this.app.seize();
          fx.onset(tags);
          if (choke) {                                              // のどがふさがる。息の音は、出ない
            fx.manualBreath = true; a.breath(0, 0);
            this.gesture('throat', { shake: 1 }); if (!this.still) rig.headT = { p: -0.3, r: 0, y: 0 };
          } else if (water) {
            if (!quiet) { a.splash(1); rig.jolt(red ? 0.2 : 0.7); }
            a.bubbles(quiet ? 4 : 9, 1); rig.sinkT = 0.12;
          } else if (!quiet) { a.cough(1); this.gesture('throat', { side: 'R' }); }
        }
        this.level(k < 0 ? 0 : 0.25 + 0.6 * x); this.mark('line ' + k);
        if (k >= 0 && choke) this.others(k);
        if (k > 0) {
          this.sense(choke ? 'choke' : (water ? 'water' : 'smoke'), x > 0.6) || this.sense('fade', x > 0.6);
          if (choke) { if (!this.still) rig.jolt(red ? 0.1 : 0.34 * (1 - x) + 0.06); }
          else if (water) {
            a.bubbles(4 + Math.round(4 * (1 - x)), 0.8); rig.sinkT = 0.12 + 0.3 * x;
            ui.wash('blue', 0.28 + 0.34 * x, 1600 * this.pace); ui.bubbles(Math.round(10 * (1 - x)) + 4, red);      // 水の中の色。泡が上がっていく
            if (!quiet) {
              rig.jolt(red ? 0.1 : 0.32 * (1 - x) + 0.08);
              rig.headT = { p: 0.1 + 0.25 * x, r: 0.1 * (k % 2 ? 1 : -1), y: 0 };                                     // 明るいほうを、見上げる
              if (k === 1) this.gesture('reach', { rate: 1.8 });
            }
          } else {
            if (!quiet) a.cough(1 - x * 0.5);
            rig.sinkT = quiet ? 0 : 0.18 * k;
            if (k === 1 && this.has('fall')) await this.drop();
          }
          if (x > 0.7) this.gesture('limp', { rate: 0.9 });
        }
        await this.say(lines[i]);
        if (k > 0 && i < n - 1) await this.dip(200 + 180 * k, x > 0.5);
      }
    }

    /* ========== 引いていく ========== */
    async ebb() {
      const { fx, lines, tags } = this, n = lines.length, hit = this.end.hit;
      this.app.seize();
      this.startBreath();
      for (let i = 0; i < n; i++) {
        const x = i < hit ? 0 : 0.25 + 0.6 * (i - hit + 1) / (n - hit), u = n > 1 ? i / (n - 1) : 1;
        if (i > 0) { if (this.times) await this.skip(i); else if (i > hit) await this.dip(260 + 180 * i, x > 0.6); }
        if (i < hit) this.cue(i); else if (i === hit) this.hitNow();
        if (!this.slow && i === hit) fx.onset(tags.filter(t => t !== 'fall'));
        if (!this.slow && this.has('fall') && i === Math.min(n - 1, hit + 1)) await this.drop();
        this.level(x); this.mark('line ' + i);
        this.breathStage(this.slow ? 0.15 + 0.6 * u : 0.75 * (x / 0.85), i >= hit);
        if (i >= Math.max(1, hit)) this.sense(this.primary(), u > 0.6) || this.sense('fade', u > 0.6);
        if (i >= 1) this.vigil(i, n);
        await this.say(lines[i]);
      }
    }
    /* そばの人、または看ている人の声 */
    vigil(i, n) {
      if (!this.slow) { const k = i - Math.max(1, this.end.hit); if (k >= 0) this.others(k); return; }     // 急な最期では、あわてた声になる
      if (this.app.companion) {
        if (!this.times) this.attend(i === 1 ? 1 : 2);
        if (i === 1 || i === n - 1) this.voice('vigil', { side: this.compSide(), pitch: this.compPitch(), far: i > 1, first: i === 1 });
      } else if (CARE[this.end.stage] && i === n - 1) this.voice(this.end.stage === 'icu' ? 'icu' : 'staff', { far: true, first: true });
    }

    /* ========== 終わり方。ふつうは息が先、心臓の件では鼓動が先に止まる ========== */
    async finale(last) {
      const { ui, fx, audio: a, env: e, rig, tags, app } = this, ebb = this.mode === 'ebb';
      ui.clearNarr(); this.mark('finale');
      this.app.seize();
      this.level(1);
      rig.enabled = false;
      /* 首の力が抜ける */
      const side = this.compSide(), pos = this.end.pos;
      if (pos === 'lie') rig.headT = { p: -0.03, r: 0.09 * (side === 'L' ? 1 : -1), y: side ? (side === 'L' ? 0.22 : -0.22) : 0.06 };
      else if (!this.fell) rig.headT = { p: -0.42, r: 0.12, y: 0.04 };
      if (!ebb && !this.fell && !this.quiet && !this.choke && this.r() < 0.7) { this.gesture('reach', { side: 'R', rate: 1.5 }); await this.wait(1900); }
      await app.soma(this.tk, this.mode === 'rupture' ? 0.6 : (ebb ? 1.1 : 0.85));
      /* 手から、力が抜ける */
      if (this.held) this.gesture('limp', { side: this.held.mine === 'L' ? 'R' : 'L', rate: 1.2 });
      else if (!this.fell) this.gesture('limp', { rate: 1.2 });
      if (last) { await ui.narrate(last, this.tk, { last: true, min: 1800, auto: 4400 / (app.fast || 1), gap: 1000, force: true }); ui.clearNarr(); }
      ui.hud(false);
      fx.fade(tags, ebb ? 9000 * this.pace : 6000 * this.pace);
      /* 視界が、先に暗くなる */
      const he = this.heartEnd;
      ui.lids('shut', (he === 'brady' ? 6000 : (he ? 3200 : (ebb ? 7200 : 4800))) * this.pace);
      if (he) {
        /* 心臓が先に止まる。あえぐような息は、そのあとに出る */
        await this.stopBreath();
        this.mark('heart ' + he);
        if (he === 'fib') await this.heartStops(); else if (he === 'weak') await this.heartFades(); else await this.lastBeats(true);
        await this.monitorEnd(he === 'fib');
        await this.lastGasps();
        if (ebb) await this.farewell();
      } else {
        if (ebb) { if (!this.vent) await this.lastBreaths(); else await this.farewell(); } else await this.lastGasps();
        this.mark('last beats');
        await this.lastBeats();                                     // 息のあとも、鼓動はしばらく続く
        await this.monitorEnd();
      }
      this.mark('hush');
      this.ventOn = false;
      /* 音が、いちばん最後に遠のく */
      a.stopSiren();
      a.hush(2.8);
      ui.wash('dark', 1, 2400 * this.pace);
      await this.wait(3200);
    }
    /* 眠るような最期の、終わりの数回の息 */
    async lastBreaths() {
      const a = this.audio;
      await this.stopBreath();
      const comp = !!this.app.companion && this.slow;
      /* のどの奥のごろごろという音は、意識が遠のいた終わりぎわにだけ出ることがある（息苦しさとは別のもの） */
      const rattle = (this.slow && this.r() < 0.4) ? 0.5 : 0;
      for (const [out, gap, g] of [[2.6, 4200, 0.55], [3.3, 6200, 0.4]]) {
        a.breathIn(0.75 * this.pace, g + 0.1, true); await this.tween(0.75, v => this.setBreath(v));
        a.breathOut(out * this.pace, g, rattle); await this.tween(out, v => this.setBreath(1 - v));
        if (gap < 5000) { if (comp) this.voice('vigil', { side: this.compSide(), pitch: this.compPitch(), far: true }); else this.sense('sleep', true); }
        await this.wait(gap);                                       // 次の息を、待つ。来ない
      }
      await this.farewell();
    }
    /* そばの人の、別れぎわ。看取りのときだけ声が出る */
    async farewell() {
      if (!this.app.companion) return;
      this.attend(3);
      if (this.slow) { this.voice('farewell', { side: this.compSide(), pitch: this.compPitch(), far: true }); await this.wait(2200); }
    }
    /* 急な最期の、あえぐような息 */
    async lastGasps() {
      const a = this.audio;
      a.breath(8, 0);
      if (this.has('water')) { a.bubbles(5, 0.6); await this.wait(2600); return; }
      if (this.choke || this.vent) { await this.wait(2600); return; }          // のどがふさがっていれば、息の音は出ない
      a.breathIn(0.5 * this.pace, 0.9, true); await this.wait(1900);
      a.breathIn(0.45 * this.pace, 0.6, true); await this.wait(2500);
      if (this.app.companion) this.attend(3);
    }
    /* 終わりの鼓動。ひとつ打つたびに、暗がりが脈打つ。間がのびて、次が来なくなる */
    async lastBeats(slowing) {
      const a = this.audio, e = this.env, ebb = this.mode === 'ebb';
      const ivs = (ebb || slowing) ? [1.25, 1.45, 1.7, 2.1, 2.7, 3.5, 4.6] : [0.62, 0.7, 0.66, 0.95, 0.8, 1.3, 1.8, 2.6, 3.6];
      a.manualHeart(true);
      for (let i = 0; i < ivs.length; i++) {
        const u = i / (ivs.length - 1);
        a.heartBpm = 60 / ivs[i];
        a.beat(U.lerp(0.9, 0.32, u)); e.pulse(U.lerp(0.3, 0.12, u));
        if (i === 2) a.muffle(1);
        await this.wait(ivs[i] * 1000);
      }
      a.stopHeart();
      await this.wait(1700);                                        // 次は、来ない
    }
    /* 心臓が先に止まるとき。鼓動は遅くならず、こまかく乱れて、ふっと消える */
    async heartStops() {
      const a = this.audio, e = this.env;
      const ivs = [0.3, 0.24, 0.34, 0.2, 0.28, 0.22, 0.4, 0.26, 0.5];
      a.manualHeart(true, 200);
      for (let i = 0; i < ivs.length; i++) {
        const u = i / (ivs.length - 1);
        a.beat(U.lerp(0.8, 0.14, u)); e.pulse(U.lerp(0.2, 0.04, u));
        await this.wait(ivs[i] * 1000);
      }
      a.stopHeart(); a.muffle(1);
      await this.wait(1500);
    }
    /* 速いまま弱くなって消える（大出血、心臓のまわりに血がたまる、など） */
    async heartFades() {
      const a = this.audio, e = this.env, n = 11;
      a.manualHeart(true, 136);
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        a.beat(U.lerp(0.75, 0.06, u)); e.pulse(U.lerp(0.18, 0.02, u));
        await this.wait(440);
      }
      a.stopHeart(); a.muffle(1);
      await this.wait(1500);
    }
    /* 集中治療室のモニター。心室細動ならすぐに警報が鳴る。それ以外は、脈が触れなくなったあとも拍の音がまばらに出てから鳴る */
    async monitorEnd(alarmFirst) {
      if (this.end.stage !== 'icu') return;
      const a = this.audio;
      if (!alarmFirst) for (const iv of [1.9, 2.8]) { a.blip(); await this.wait(iv * 1000); }
      a.alarm(2); await this.wait(3600);
    }

    /* ========== そのあとも、世界は続く ========== */
    async coda() {
      const st = this.end.stage, out = [];
      for (const x of (this.txt.after[st] || [])) if (this.fits(x, true) && out.length < 2) out.push(x.t);
      if (this.held && (this.txt.after.held || []).length) { if (out.length > 1) out.pop(); out.push(L.resolve(this.txt.after.held[0].t, this.life)); }
      if (!out.length) return;
      await this.wait(700);
      await this.ui.card([{ text: U.timeJa(this.end.t), sub: true }].concat(out.map(t => ({ text: t }))), this.tk, { hold: 3000 + out.join('').length * 120, step: 1400, min: 900, force: true });
      await this.wait(500);
    }

    async run(last) {
      this.audio.heart(72, 0.07, 0);
      try {
        if (this.mode === 'rupture') await this.rupture();
        else if (this.mode === 'collapse') await this.collapse();
        else if (this.mode === 'struggle') await this.struggle();
        else await this.ebb();
        await this.finale(last);
        await this.coda();
      } finally { if (this.bp) this.bp.on = false; this.fx.manualBreath = false; }
    }
  }

  SI.Dying = Dying;
})(window.SI);
