'use strict';
/* 最期の一日 — ドラマで見る。
   その人の最期の日を、映画のように流れる場面のつながりで見せる。操作はいらない（見まわすことはできる）。
   - はじめに、最期の時刻と場所を先に見せる（「この日の午後7時40分、自宅の浴室」→「12時間前」）。
   - 場面ごとに、左上へ時刻・場所・「最期まで、あと何時間」を出す。上下には黒い帯。
   - 場面のなかでは、カメラがゆっくり振れて、少しずつ寄っていく。そばの人とのやり取り、まわりの音、思い出がはさまる。
   - 同じ場所のまま時間がたつときは早回し（日ざしと時計が動く）、場所が変わるときは暗転でつなぐ。
   - 最期の前は音楽を落とし、鼓動だけが残る。そのあとは 41_dying.js の最期の場面。 */
(function (SI) {
  const T = window.THREE, U = SI.U, L = SI.Life;
  const v1 = new T.Vector3();
  const REL = { '夫': 'spouse', '妻': 'spouse', '娘': 'child', '息子': 'child', '孫': 'grandchild', '母': 'parent', '父': 'parent', '祖母': 'parent', '妹': 'sibling', '弟': 'sibling', '姪': 'niece', '甥': 'niece', '友人': 'friend' };
  const CARE = { hospital: 1, icu: 1, hospice: 1, facility: 1 }, HOME = { living: 1, washitsu: 1, bedroom: 1 };

  class Drama {
    constructor(app, cause, life, mems, dying, tk) {
      this.app = app; this.cause = cause; this.life = life; this.mems = mems.slice(); this.dying = dying; this.tk = tk;
      this.ui = app.ui; this.rig = app.rig; this.env = app.env; this.audio = app.audio; this.r = app.r || Math.random;
      this.dd = app.data.day || {}; this.talk = app.data.talk || {};
      this.endB = dying.scene();
      this.T = this.timeline();                        // beats 3 つと最期の時刻（分。日付をまたぐと 1440 を超える）
      this.camGen = 0; this.used = new Set(); this.zoomK = 1; this.running = false;
      this.stat = { scene: 0, talk: 0, amb: 0, mem: 0, lapse: 0, cut: 0, walkIn: 0, sit: 0, rise: 0, walk: 0, act: 0, blow: 0, out: 0, come: 0, hold: 0, put: 0, crouch: 0 };
    }
    timeline() {
      const bs = this.cause.beats, out = []; let prev = -1, add = 0;
      for (const t of [bs[0].t, bs[1].t, bs[2].t, this.endB.t]) { let m = U.timeToMin(t) + add; if (m < prev) { add += 1440; m += 1440; } out.push(m); prev = m; }
      return out;
    }
    /* 最期までの時間を、ことばで */
    leftJa(min) {
      min = Math.max(0, Math.round(min));
      const h = Math.floor(min / 60), m = min % 60;
      if (!h && !m) return '';
      return '最期まで、あと' + (h ? h + '時間' : '') + (m ? m + '分' : '');
    }
    ago(min) { const h = Math.round(min / 60); return h >= 1 ? h + '時間前' : Math.max(1, Math.round(min)) + '分前'; }

    async run() {
      const ui = this.ui;
      this.running = true; this.rig.wasdMove = false; this.rig.autoWalk = true;     // 歩くのはドラマが決める（キーでは歩かない）
      this.prevAuto = ui.auto; ui.auto = true;          // 流れるように進める（手送りの設定は、終わったら戻す）
      ui.cinema(true);
      const q = this.app.q, from = this.from = q ? U.clamp(+(q.get('scene') || 0) || 0, 0, 3) : 0;     // 確認用: ?scene=1〜3 で途中の場面から（3 は最期の場所へ移るところ）
      if (!q || !q.has('scene')) await this.coldOpen();      // ?scene=0 なら、冒頭を飛ばして最初の場面から
      for (let i = from; i < 3; i++) await this.scene(i);
      await this.toEnd();
    }
    stop() {
      this.abortMotion(); this.rig.autoWalk = false;
      this.running = false; this.camGen++;
      this.audio.score(false);
      if (this.prevAuto != null) { this.ui.auto = this.prevAuto; this.prevAuto = null; }
      this.setZoom(1);
    }

    /* ---------- はじめ: 最期の時刻と場所を、先に見せる ---------- */
    async coldOpen() {
      const ui = this.ui, tk = this.tk, a = this.audio;
      a.ambience({});
      a.beat(0.7); await U.sleep(900, this.tk); a.beat(0.5);
      await ui.card([{ text: 'この日の' + U.timeJa(this.endB.t) }, { text: this.cause.place, sub: true }], tk, { hold: 2600, step: 700, min: 300, force: true });
      await ui.card([{ text: this.ago(this.T[3] - this.T[0]) }], tk, { hold: 1300, step: 300, min: 200, force: true });
    }

    /* ---------- 場面 ---------- */
    async scene(i) {
      const app = this.app, ui = this.ui, tk = this.tk, bs = this.cause.beats, b = bs[i], prev = i > (this.from || 0) ? bs[i - 1] : null;
      this.stat.scene++;
      const same = prev && prev.stage === b.stage && (prev.v || '') === (b.v || '');
      if (same) {
        this.abortMotion(); this.clearPlaced();                         // 時がたつので、前の場面の動きと置いた物は片づける
        await this.lapse(this.T[i - 1], this.T[i], prev);
        await this.reframe(b);
      } else {
        if (ui.lidState !== 'shut') await ui.lids('shut', 900, tk);
        this.camGen++; this.abortMotion(); this.placed = []; this.setZoom(1); this.stat.cut++;
        /* 目を開ける前に、どこから入るかを決める（歩いて入れる場面は、離れた所に立っている） */
        await app.enterScene(b, tk, i === 0, null, { noCard: true, before: () => { if (!this.blockIn(b) && b.pos !== 'lie') this.establish(); } });
      }
      if (i === 0) this.audio.score(true);
      ui.telop(U.timeJa(b.t), app.stage.label, this.leftJa(this.T[3] - this.T[i]), 5200);
      this.zoomTo(0.92, 26000);                         // ゆっくり寄っていく
      let move = null;
      if (this.entry) move = this.walkIn();             // 歩いて行って、座る・持ち場に立つ
      else if (b.pos === 'lie' && !same) move = this.wakeUp();
      else if (same && !this.rig.free) this.establish(true);
      if (move) await U.sleep(900, tk);                 // 歩きはじめてから、語りが出る
      for (const sn of U.sentences(L.resolve(b.text, this.life))) {
        if ((move || this.mv || this.gl) && this.needsStill(sn)) {           // 人が来る・手に持つ などは、席に着いてから
          if (move) { await move; move = null; }
          await this.settle(6000);
        }
        this.actFor(sn); await ui.narrate(sn, tk, { force: true });
        if (this.fw) await this.settleFolk(9000);
      }
      ui.clearNarr();
      if (move) await move;
      if (this.mv) await new Promise(res => { const iv = setInterval(() => { if (!this.mv || !this.running) { clearInterval(iv); res(); } }, 100); });
      if (b.with && app.companion) await this.dialogue(b, i);
      else await this.folkLine(b, i);
      await this.ambient(b, this.T[i]);
      if (i < 2 && this.mems.length) await this.flashback();
      /* 次が別の場所なら、立ち上がって出口へ歩きだし、その途中で暗転する */
      const nx = i < 2 ? bs[i + 1] : this.endB;
      if (!(nx.stage === b.stage && (nx.v || '') === (b.v || ''))) await this.walkOut(b);
    }
    /* 同じ場所で、姿勢が変わる（座っていたのが、立っている、など）。まばたきのあいだに */
    async reframe(b) {
      const app = this.app, st = app.stage, rig = this.rig, ui = this.ui, nav = st.nav;
      const a = SI.pickAnchor(st, b.pos);
      /* 歩ける場所では、立ち上がって歩く・歩いて行って座る、を見せる */
      if (nav && nav.ok && a && !a.path && (b.pos === 'sit' || b.pos === 'stand')) {
        if (b.pos === 'sit' && app.anchor !== a) { if (!rig.free) await this.standUp(); await this.sitAt(a, true); }
        else if (b.pos === 'stand') {
          if (!rig.free) await this.standUp();
          const ap = nav.nearest(a.p[0], a.p[2], 1.4);
          if (ap && Math.hypot(ap.x - rig.pos.x, ap.z - rig.pos.z) > 0.5) await this.walkTo(ap.x, ap.z, 10);
          await this.face(v1.fromArray(a.look).clone(), 1200);
        }
        if (!!b.with !== !!app.companion) { await ui.lids('shut', 160, this.tk); app.syncCompanion(b); await ui.lids('open', 300, this.tk); }
        return;
      }
      if (app.anchor !== a) {
        await ui.lids('shut', 280, this.tk);
        this.camGen++;
        rig.setAnchor(a); rig.setBody(app.makeBody(st, a)); app.anchor = a;
        app.syncCompanion(b);
        await U.sleep(120, this.tk);
        await ui.lids('open', 600, this.tk);
      } else if (!!b.with !== !!app.companion) { await ui.lids('shut', 160, this.tk); app.syncCompanion(b); await ui.lids('open', 300, this.tk); }
    }
    /* 同じ場所のまま、時間が流れる（早回し）。日ざしが動き、テロップの時計が回る。途中の決まった出来事（チャイムなど）も鳴る */
    async lapse(from, to, b) {
      const ui = this.ui, env = this.env, tk = this.tk;
      ui.clearNarr(); this.stat.lapse++;
      this.zoomTo(1, 2200);
      this.look(null, 2600);
      const dur = Math.max(1, 3600 / U.speed), t0 = performance.now(), fired = new Set();
      ui.telop(U.minToTime(Math.floor(from % 1440)), this.app.stage.label, '', 0);
      for (;;) {
        const k = Math.min(1, (performance.now() - t0) / dur), m = from + (to - from) * U.smooth(k);
        env.setConditions({ hour: (m / 60) % 24 });
        ui.telopTime(U.timeJa(U.minToTime(Math.floor(m % 1440))));      // 早回しのあいだも、同じ書き方で
        for (let j = 0; j < (this.dd.world || []).length; j++) {
          const w = this.dd.world[j]; let wm = U.timeToMin(w.t); while (wm < from) wm += 1440;
          if (wm <= m && wm > from && !fired.has(j) && w.in.includes(b.stage) && w.snd && this.audio[w.snd]) { fired.add(j); this.audio[w.snd](w.arg); }
        }
        if (k >= 1) break;
        await U.sleep(40, tk);
      }
      ui.telop(null);
      await U.sleep(400, tk);
    }

    /* ---------- カメラ ---------- */
    /* 目を開ける前に、その場所の何か（窓、写真、時計）を見ている。目を開けると、ゆっくり正面へ戻っていく */
    establish(now) {
      const st = this.app.stage, rig = this.rig, spots = (st.spots || []).slice();
      for (let n = 0; n < 6 && spots.length; n++) {
        const s = spots.splice(Math.floor(this.r() * spots.length), 1)[0];
        v1.fromArray(s);
        if (!rig.canSee || rig.canSee(v1, -0.15)) {      // 首を回して見える範囲の、少し内側
          if (now) { this.look(v1.clone(), 2400).then(ok => { if (ok) this.look(null, 9000); }); return; }
          const g = ++this.camGen;                                                // 前の動きは、ここで打ち切る
          rig.lookToward(v1); rig.uYaw = rig.tYaw; rig.uPitch = rig.tPitch;      // まだ目を閉じているので、すぐに向ける
          setTimeout(() => { if (this.camGen === g && this.running) this.look(null, 9000); }, 600 / U.speed);
          return;
        }
      }
    }
    /* point のほうへ、ms かけて向く。null なら正面へ戻る。前の動きは打ち切る */
    look(point, ms) {
      const gen = ++this.camGen, rig = this.rig, y0 = rig.tYaw, p0 = rig.tPitch, b0 = rig.baseYaw;
      let y1 = 0, p1 = 0;
      if (point) { rig.lookToward(point); y1 = rig.tYaw; p1 = rig.tPitch; rig.tYaw = y0; rig.tPitch = p0; }
      const dur = Math.max(1, ms / U.speed), t0 = performance.now();
      return (async () => {
        for (;;) {
          if (gen !== this.camGen || this.tk.aborted || !this.running) return false;      // 打ち切られた
          const k = Math.min(1, (performance.now() - t0) / dur), e = U.smooth(k);
          rig.tYaw = y0 + (y1 - y0) * e - (rig.baseYaw - b0); rig.tPitch = p0 + (p1 - p0) * e;     // 歩いているとき、体が向きを追ってくる分（21_rig.js の fold）を差し引く
          if (k >= 1) return true;
          try { await U.sleep(33, this.tk); } catch (err) { return false; }
        }
      })();
    }
    /* 画角を少しずつ狭めて、寄っていく（1 でもとの画角） */
    setZoom(k) { const cam = this.env.camera; this.zoomK = k; cam.fov = this.env.baseFov * k; cam.updateProjectionMatrix(); this._zg = (this._zg || 0) + 1; }
    zoomTo(k, ms) {
      const g = this._zg = (this._zg || 0) + 1, k0 = this.zoomK, dur = Math.max(1, ms / U.speed), t0 = performance.now();
      (async () => {
        for (;;) {
          if (g !== this._zg || this.tk.aborted || !this.running) return;
          const e = U.smooth(Math.min(1, (performance.now() - t0) / dur)), cam = this.env.camera;
          this.zoomK = k0 + (k - k0) * e; cam.fov = this.env.baseFov * this.zoomK; cam.updateProjectionMatrix();
          if (e >= 1) return;
          try { await U.sleep(50, this.tk); } catch (err) { return; }
        }
      })();
    }

    /* ---------- そばの人とのやり取り ---------- */
    cond(s, b, m) {
      if (!s) return true;
      const h = (m / 60) % 24, life = this.life, w = life.weather === 'storm' ? 'rain' : (life.weather === 'fog' ? 'cloudy' : life.weather);
      return s.split(',').every(k => {
        k = k.trim();
        if (k === 'morning') return h >= 5 && h < 10;
        if (k === 'noon') return h >= 10 && h < 15;
        if (k === 'evening') return h >= 15 && h < 19;
        if (k === 'night') return h >= 19 || h < 5;
        if (k === 'day') return h >= 10 && h < 18;
        if (k === 'late') return h >= 21 || h < 5;
        if (k === 'kid') return life.age <= 15;
        if (k === 'grown') return life.age >= 19;
        if (k === 'old') return life.age >= 75;
        if (k === 'spring' || k === 'summer' || k === 'autumn' || k === 'winter') return life.season === k;
        if (k === 'clear' || k === 'cloudy' || k === 'rain' || k === 'snow') return w === k;
        if (k === 'dry') return w === 'clear' || w === 'cloudy';
        if (k === 'mild') return (w === 'clear' || w === 'cloudy') && life.season !== 'winter' && h >= 9 && h < 17;
        if (k === 'home') return !!HOME[b.stage];
        if (k === 'ward') return !!CARE[b.stage];
        if (k === 'out') return !this.app.stage.indoor;
        if (k === 'up') return b.pos !== 'lie';
        if (k === 'abed' || k === 'inbed') return b.pos === 'lie';
        if (k === 'with') return !!b.with;
        if (k === 'alone') return !b.with;
        if (k === 'weekday') return (life.date.d % 7) < 5;
        if (k === 'meal') return (h >= 8 && h < 9) || (h >= 12.3 && h < 13.3) || (h >= 18.3 && h < 19.3);
        return false;                                   // このほかの語（寝ついている、など）がつく台詞は、ドラマでは使わない
      });
    }
    headPos(f, out) { const h = f.userData.parts && f.userData.parts.head; if (h && h.getWorldPosition) return h.getWorldPosition(out); f.getWorldPosition(out); out.y += 1.35; return out; }
    async dialogue(b, i) {
      const app = this.app, ui = this.ui, tk = this.tk, f = app.companion, life = this.life, c = life.close;
      const sick = !!CARE[b.stage];
      const all = ((((this.talk.close || {})[REL[c.rel] || 'friend']) || {})[sick ? 'care' : 'daily'] || []).filter(x => !this.used.has(x) && this.cond(x.if, b, this.T[i]));
      const withMe = all.filter(x => x.me), pool = withMe.length && this.r() < 0.65 ? withMe : all;      // こちらから話しかけるか、向こうから話しかけてくるか
      if (!pool.length) return;
      const x = U.pick(this.r, pool); this.used.add(x); this.stat.talk++;
      await this.exchange(f, x.me, L.resolve(x.re, life), c.age < 13 ? 290 : (c.sex === 'f' ? 215 : 128));
    }
    /* そばに人がいない場面では、その場の人（同僚、店の主人、乗り合わせた人）が、向こうから声をかけてくる */
    async folkLine(b, i) {
      const st = this.app.stage, folk = (st.folk || []).filter(x => x && x.f && x.f.parent && ((this.talk.folk || {})[x.role] || []).length);
      if (!folk.length || (b.stage === 'shop' && this.cause.job === 'shop') || this.r() < 0.35) return;
      const p = U.pick(this.r, folk), pool = this.talk.folk[p.role].filter(x => !x.me && !this.used.has(x) && this.cond(x.if, b, this.T[i]));
      if (!pool.length) return;
      const x = U.pick(this.r, pool); this.used.add(x); this.stat.talk++;
      await this.exchange(p.f, null, L.resolve(x.re.replace(/\{名\}/g, this.life.name), this.life), (U.hash(p.role) % 2) ? 210 : 126);
    }
    /* 相手のほうを見て、（こちらのひとこと、）相手の返事 */
    async exchange(f, me, re, pitch) {
      const ui = this.ui, tk = this.tk, life = this.life;
      const head = this.headPos(f, new T.Vector3());
      if (f.userData.react) f.userData.react({ hy: 0, att: 1, hp: 0.03 });
      await this.look(head, 1400);
      if (this.tk.aborted) throw new Error('abort');
      if (me) {
        const t = '「' + me + '」';
        ui.narrShow(t); this.audio.murmur(Math.max(2, Math.round(me.length * 0.5)), 0.5, life.age < 13 ? 280 : (life.sex === 'f' ? 205 : 122));
        await U.sleep(Math.max(1500, ui.readMs(t) * 0.8), tk);
        ui.clearNarr();
      }
      const ms = Math.max(2800, ui.readMs(re) * 1.15);
      this.headPos(f, v1).project(this.env.camera);
      ui.voice(re, (v1.x * 0.5 + 0.5) * 100, (-v1.y * 0.5 + 0.5) * 100, ms);      // 顔にかからない所へ
      this.audio.murmur(Math.max(2, Math.round(re.length * 0.55)), 1, pitch);
      await U.sleep(ms + 300, tk);
      if (f.userData.react) f.userData.react({ hy: 0, att: 0, hp: 0 });
      this.look(null, 3200);
    }

    /* ---------- まわりの音や気配を、ひとつ ---------- */
    async ambient(b, m) {
      const list = (this.dd.ambient || []).filter(a => a.in.includes(b.stage) && !this.used.has(a) && this.cond(a.if, b, m));
      if (!list.length) return;
      const a = U.pick(this.r, list); this.used.add(a); this.stat.amb++;
      if (a.snd && this.audio[a.snd]) this.audio[a.snd](a.arg);
      await this.ui.narrate(a.text, this.tk, { force: true });
      this.ui.clearNarr();
    }

    /* ---------- 思い出（場面と場面のあいだに、ひとつ） ---------- */
    async flashback() {
      const app = this.app, ui = this.ui, env = this.env, tk = this.tk, mem = this.mems.shift();
      if (!mem) return;
      this.stat.mem++;
      try {
        this.audio.chime(2); this.audio.memoryMode(true);
        env.fxRate = 1.4;
        Object.assign(env.fxT, { blur: 6, sat: 0.32, tintAmt: 0.24, bright: 0.78, vig: 0.35 }); env.fxTintT.set('#ffd6a4');
        await U.sleep(600, tk);
        await ui.memory(mem.label, U.sentences(mem.text), tk);
        app.seenMems.push(mem);
      } finally {
        this.audio.memoryMode(false); ui.clearMemory();
        env.fxReset(false); env.fxRate = 2.2; app.fx.weary(app.weary || 0);
      }
      await U.sleep(500, tk);
    }

    /* ---------- 最期の時刻へ ---------- */
    async toEnd() {
      const app = this.app, ui = this.ui, rig = this.rig, tk = this.tk, e = this.endB, c = this.cause, last = this.cause.beats[2];
      const same = this.from !== 3 && last.stage === e.stage && (last.v || '') === (e.v || '');
      let move = null;
      this.audio.score(false);                          // 音楽を落とす。鼓動だけが残る
      if (same) {
        this.abortMotion(); this.clearPlaced();
        await this.lapse(this.T[2], this.T[3], last);
        const st = app.stage, a = (e.pos === 'walk' && st.anchors.walkEnd) ? st.anchors.walkEnd : SI.pickAnchor(st, e.pos);
        if (st.nav && st.nav.ok && !a.path && (e.pos === 'sit' || e.pos === 'stand')) await this.reframe(e);
        else if (app.anchor !== a || !!e.with !== !!app.companion) {
          await ui.lids('shut', 300, tk);
          rig.setAnchor(a); rig.setBody(app.makeBody(st, a)); app.anchor = a; app.syncCompanion(e);
          await U.sleep(120, tk); await ui.lids('open', 600, tk);
        }
        this.env.setConditions({ hour: U.timeToHour(e.t) });
      } else {
        if (ui.lidState !== 'shut') await ui.lids('shut', 900, tk);
        this.camGen++; this.abortMotion(); this.placed = []; this.setZoom(1);
        await app.enterScene(e, tk, false, c.place, { noCard: true, before: () => this.blockIn(e) });
        if (this.entry) move = this.walkIn();            // 最期の場所へ、歩いて入る（テロップと同時に）
      }
      ui.hud(true, e.t, c.place);
      ui.telop(U.timeJa(e.t), c.place, '', 4200);
      this.audio.heart(74, 0.16, 0); this.audio.breath(14, 0);
      this.zoomTo(0.86, 9000);
      if (move) await move;
      if (!rig.free) await this.look(null, 1500);
      this.endYaw = rig.viewYaw();                      // 迫ってくるものの右・左は、この向きから決める
      await U.sleep(1800, tk);
      this._zg = (this._zg || 0) + 1;                 // 寄るのはここまで。このあと、異変の前の行では、まだ視点が動く（47_blocking.js の endCue。異変が来たら endHit で止める）
    }
  }

  SI.Drama = Drama;
})(window.SI);
