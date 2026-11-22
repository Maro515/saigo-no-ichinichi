'use strict';
/* 最期の一日 — 進行（はじめの画面 → 一日の場面と記憶 → 最期 → おわりの画面） */
(function (SI) {
  const T = window.THREE, U = SI.U, K = SI.Kit, L = SI.Life;
  const v1 = new T.Vector3(), v2 = new T.Vector3();

  /* 姿勢に合う視点をえらぶ。その場所にない姿勢は、近いもので代える */
  SI.pickAnchor = function (st, pos) {
    const A = st.anchors;
    const order = { lie: ['lie', 'sit', 'stand', 'walk'], sit: ['sit', 'stand', 'walk', 'lie'], stand: ['stand', 'walk', 'sit', 'lie'], walk: ['walk', 'stand', 'sit', 'lie'] }[pos] || ['stand', 'sit', 'lie', 'walk'];
    for (const k of order) {
      const a = A[k];
      if (!a) continue;
      if (k === pos) return a;
      const p = a.path ? a.path[0] : a.p, look = a.path ? a.path[1] : a.look;
      const eye = a.path ? 1.5 : (k === 'sit' ? 0.75 : (k === 'lie' ? 0.35 : 1.5));
      const ground = a.ground != null ? a.ground : p[1] - eye;
      if (pos === 'lie') return { p: [p[0], ground + 0.3, p[2]], look: [look[0], ground + 1.3, look[2]], lim: { yaw: 110, up: 75, down: 15 }, body: 'none', ground };
      if (a.path) return { p: [p[0], pos === 'sit' ? ground + 0.95 : p[1], p[2]], look: [look[0], p[1] - 0.25, look[2]], lim: a.lim, body: pos === 'sit' ? 'sit' : 'stand', ground };
      return a;
    }
    return A[Object.keys(A)[0]];
  };

  function ambFor(st, hour, season, weather) {
    const o = {}, a = st.amb || {};
    const day = hour >= 5.5 && hour < 18.5;
    const rain = weather === 'rain' ? 0.7 : (weather === 'storm' ? 1 : 0);
    if (st.indoor) { o.room = 0.6; o.rainIn = rain; if (rain) o.rain = rain * 0.22; if (weather === 'storm') o.wind = 0.35; }
    else { o.wind = weather === 'storm' ? 1 : (weather === 'snow' ? 0.35 : 0.22); o.rain = rain; }
    if (a.tick) o.tick = 0.8;
    const k = (a.nature ? 1 : (a.garden ? 0.45 : 0)) * (weather === 'snow' ? 0 : 1);
    if (k && !rain) {
      if (season === 'summer' && hour >= 7 && hour < 18) o.cicada = k;
      if ((season === 'summer' || season === 'autumn') && (hour >= 18.5 || hour < 4.5)) o.cricket = k;
      if (season !== 'winter') { if (hour >= 5 && hour < 9) o.birds = k; else if (day) o.birds = k * 0.35; }
      if (hour >= 16.3 && hour < 18.6) o.crow = k * 0.6;
    }
    if (a.traffic) { o.traffic = a.traffic * (day ? 1 : 0.5); o.pass = a.traffic * (day ? 1 : 0.5); }
    for (const key of ['sea', 'river', 'water', 'drip', 'beep', 'engine', 'crowd', 'machine', 'fire']) if (a[key]) o[key] = a[key];
    if (a.train) { o.train = 1; o.clack = 1; }
    if (a.wind) o.wind = Math.max(o.wind || 0, a.wind);
    if (weather === 'snow') for (const key in o) if (key !== 'tick' && key !== 'beep') o[key] *= 0.6;
    return o;
  }

  SI.ambFor = ambFor;

  class App {
    constructor(env, rig, data, q) {
      this.env = env; this.rig = rig; this.data = data; this.q = q;
      this.ui = new SI.UI(); this.audio = new SI.Audio(); this.fx = new SI.FX(env, rig, this.audio, this.ui);
      this.ui.total = data.causes.length;
      this.ui.sound(this.audio.enabled);
      this.state = 'title'; this.token = null; this.starting = false;
      this.active = null; this.fading = []; this.ticks = []; this.objs = [];
      this.stage = null; this.stageKey = null; this.life = null; this.cause = null; this.seenMems = [];
      this.titleT = 0; this.hintT = 0;
      this.fast = q.get('fast') ? parseFloat(q.get('fast')) : 0;
      if (this.fast) this.ui.readSpeed = this.fast;
      /* 一時間を、何分で過ごすか（1〜5）。確認用に ?hour=0.05 のような小さな値も受ける */
      this.hourMin = q.get('hour') ? Math.max(0.005, parseFloat(q.get('hour'))) : U.clamp(U.store.get('si.hour', 2), 1, 5);
      this.day = null; this.drama = null; this.anchor = null;
      this.ui.pace(this.hourMin);
      /* 見かた。ドラマで見る（drama）か、自分で過ごす（free）か。確認用に ?mode=free も受ける */
      this.mode = q.get('mode') === 'free' || q.get('mode') === 'drama' ? q.get('mode') : (U.store.get('si.mode', 'drama') === 'free' ? 'free' : 'drama');
      this.ui.mode(this.mode);
      rig.reduced = this.ui.reduced;
      rig.onTap = (x, y) => this.onTap(x, y);
      rig.onStep = () => this.audio.step(!!(this.stage && !this.stage.indoor));
      const ui = this.ui;
      ui.onStart = () => this.start(); ui.onAgain = () => this.start(); ui.onHome = () => this.toTitle(); ui.onQuit = () => this.toTitle();
      ui.onRecall = () => this.recall();
      ui.onUse = () => !!(this.day && this.day.use());
      ui.onRest = () => { if (this.day) this.day.toggleDoze(); };
      ui.onPace = (v) => { this.hourMin = v; U.store.set('si.hour', v); ui.pace(v); };
      ui.onMode = (v) => { this.mode = v === 'free' ? 'free' : 'drama'; U.store.set('si.mode', this.mode); ui.mode(this.mode); };
      ui.onStick = (x, y) => { rig.stick.x = x; rig.stick.y = y; };
      ui.onSound = () => { this.audio.init(); this.audio.setEnabled(!this.audio.enabled); ui.sound(this.audio.enabled); };
      this.toTitle();
      if (q.get('auto')) setTimeout(() => this.start(), 300);
    }

    /* ---- はじめの画面 ---- */
    toTitle() {
      if (this.token) this.token.cancel();
      if (this.day) { this.day.stop(); this.day = null; }
      if (this.drama) { this.drama.stop(); this.drama = null; }
      this.ui.cinema(false);
      this.rig.wasdMove = false;
      this.token = null; this.starting = false; this.state = 'title';
      const ui = this.ui, env = this.env;
      ui.clearPlay(); ui.hideEpitaph(); this.clearObjs();
      this.audio.cut();
      this.fx.reset(); this.audio.ambience({ room: 0.4, birds: 0.5 });
      const m = new Date().getMonth() + 1;
      const season = m >= 3 && m <= 5 ? 'spring' : (m >= 6 && m <= 8 ? 'summer' : (m >= 9 && m <= 11 ? 'autumn' : 'winter'));
      this.setStage('washitsu', null, { season, weather: 'clear', hour: season === 'summer' ? 5.3 : (season === 'winter' ? 7.2 : 6.2), seed: 7 });
      const a = SI.pickAnchor(this.stage, 'stand');
      this.rig.setAnchor(a); this.rig.setBody(null); this.rig.enabled = true; this.rig.rock = 0;
      env.fxT.vig = 0.42; env.fxT.bright = 0.7; env.fx.vig = 0.42; env.fx.bright = 0.7;
      ui.wash(null, 0, 600); ui.lids('open', 1200);
      ui.showTitle(this.data.causes.length);
    }

    setStage(id, v, cond) {
      const key = id + '|' + (v || '') + '|' + cond.season + cond.weather + cond.seed + '|' + (cond.snow || 0);
      const hour = cond.hour;
      if (key !== this.stageKey) {
        const fn = SI.stages[id] || SI.stages.washitsu;
        SI.snowNow = cond.snow || 0;                                                // 雪の深さ（23b_snow.js）。組み立てのあいだ、地面・道・家・木が見る
        const st = fn({ season: cond.season, weather: cond.weather, hour, seed: cond.seed, v: v || null, env: this.env, life: this.life, cause: this.cause });
        if (SI.snowNow > 0.01 && SI.Snow) SI.Snow.apply(st, SI.snowNow);
        this.env.setConditions({ hour, season: cond.season, weather: cond.weather, indoor: !!st.indoor });
        this.env.setStage(st);
        this.stage = st; this.stageKey = key;
      } else {
        this.env.setConditions({ hour });
      }
      return this.stage;
    }

    clearObjs() {
      for (const o of this.objs) { if (o.parent) o.parent.remove(o); K.dispose(o); }
      this.objs = []; this.ticks = []; this.companion = null;
      if (this.active) { this.env.scene.remove(this.active.light); K.dispose(this.active.light); this.active = null; }
      for (const l of this.fading) { this.env.scene.remove(l); K.dispose(l); }
      this.fading = [];
    }

    pickCause() {
      const list = this.data.causes, id = this.q.get('id');
      if (id && !this._forced) { this._forced = true; const c = list.find(x => x.id === id); if (c) return c; }
      const recent = U.store.get('si.recent', []);
      const fresh = list.filter(c => !recent.includes(c.id));
      const pool = fresh.length ? fresh : list;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    start() {
      if (this.starting || !this.data.causes.length) return;
      this.starting = true;
      this.audio.init();
      this.ui.startBusy();
      if (this.token) this.token.cancel();
      const tk = this.token = new U.Token();
      const cause = this.pickCause();
      this.run(cause, tk).catch((e) => {
        if (e && e.message === 'abort') return;
        if (window.console) console.error(e);
        this.toTitle();
      }).finally(() => { if (this.token === tk) this.starting = false; });
    }

    async run(cause, tk) {
      const ui = this.ui, rig = this.rig, audio = this.audio;
      const seed = this.q.get('seed') ? parseInt(this.q.get('seed'), 10) : ((Date.now() ^ U.hash(cause.id)) >>> 0);
      const r = this.r = U.rng(seed);
      const life = this.life = L.make(cause, r); this.cause = cause;
      this.snowDepth = SI.snowDepth ? SI.snowDepth(cause, life) : 0;          // 雪が積もっている日なら、その深さ
      const recentM = U.store.get('si.recentMem', []);
      const mems = L.pickMemories(life, this.data.memories, r, recentM);
      U.store.set('si.recentMem', recentM.concat(mems.map(m => m.id)).slice(-150));
      const last = L.pickLast(life, this.data.last, r);
      this.seenMems = []; this.sceneSeed = U.hash(cause.id) % 100000; this.compLook = null;

      if (!U.el('title').hidden) await ui.hideTitle(tk);
      ui.hideEpitaph();
      await ui.lids('shut', this.state === 'title' ? 900 : 60, tk);
      this.state = 'play';
      ui.wash(null, 0, 200);
      this.fx.reset(); this.clearObjs(); ui.clearPlay();
      audio.ambience({});
      await U.sleep(500, tk);
      await ui.card([
        { text: life.name + '　' + life.ageJa },
        { text: life.jobJa, sub: true },
        { text: life.dateJa + '　' + L.WEATHER_JA[life.weather], sub: true },
        { text: cause.aware ? '今日が最期の一日になる。それはもう、分かっている。' : '今日が最期の一日になることを、まだ知らない。', gap: true }
      ], tk, { hold: 5200 });

      const skip = !!this.q.get('end');                  // 確認用: 最期の場面から始める
      this.weary = 0;
      if (this.day) this.day.stop();
      if (this.drama) { this.drama.stop(); this.drama = null; }
      const dying = new SI.Dying(this, cause, life, tk);
      if (skip) {
        this.day = null; this.seenMems = mems.slice(0, 4);
        await this.enterScene(dying.scene(), tk, false, cause.place);
      } else if (this.mode === 'drama') {
        /* ドラマで見る。最期の日を、流れる場面のつながりで見せる */
        const dr = this.drama = new SI.Drama(this, cause, life, mems, dying, tk);
        try { await dr.run(); } catch (e) { dr.stop(); this.drama = null; throw e; }
      } else {
        /* 朝から最期の時刻まで、時計は止まらずに進む。そのあいだは自由に過ごせる */
        const day = this.day = new SI.Day(this, cause, life, mems, dying, tk);
        try { await day.run(); } finally { if (this.token !== tk || tk.aborted) day.stop(); }
      }
      this.weary = 0;
      try { await dying.run(last); } finally { if (this.day) { this.day.stop(); this.day = null; } if (this.drama) { this.drama.stop(); this.drama = null; } this.rig.wasdMove = false; }
      await this.epitaph(cause, life, tk);
    }

    /* 場面に入る。まぶたは閉じた状態で呼ぶ */
    async enterScene(b, tk, first, place, o) {
      o = o || {};
      const life = this.life, ui = this.ui, rig = this.rig;
      this.clearObjs(); this.usedSpots = [];
      const st = this.setStage(b.stage, b.v, { season: life.season, weather: life.weather, hour: U.timeToHour(b.t), seed: this.sceneSeed, snow: this.snowDepth || 0 });
      if (st.onScene) st.onScene(b);                                              // 場面ごとの直し（店のスリッパの数、シャッターなど）
      if (st.walk && !st.nav && SI.Nav) st.nav = new SI.Nav(st);                 // 歩ける範囲（人を置く前に調べる）
      const a = (place && b.pos === 'walk' && st.anchors.walkEnd) ? st.anchors.walkEnd : SI.pickAnchor(st, b.pos);
      rig.setAnchor(a); this.anchor = a;
      rig.setBody(this.makeBody(st, a));
      rig.enabled = true; rig.rock = st.rock || 0;
      this.syncCompanion(b);
      this.audio.ambience(ambFor(st, U.timeToHour(b.t), life.season, life.weather));
      this.audio.heart(70, 0, 0); this.audio.breath(14, 0);
      const label = place || st.label;
      if (o.before) o.before();                          // 目を開ける前に、視線を決めておく（ドラマ）
      if (!o.noCard) await ui.card([{ text: U.timeJa(b.t) }, { text: label, sub: true }], tk, { hold: 1500, step: 450, min: 300, force: true });
      ui.hud(true, b.t, label);
      await ui.lids('open', first ? 2800 : 1400, tk);
    }

    /* その視点に合う、自分の体 */
    makeBody(st, a) {
      const kind = a.body || 'stand';
      if (kind === 'none') return null;
      const opt = Object.assign({}, (st.body && st.body[kind]) || {});
      if (/^lie/.test(kind) && SI.bedDepth && a.p && a.look) { const bd = SI.bedDepth(st, a, this.env); if (bd != null) opt.bed = bd; }
      return K.body(kind, opt);
    }
    /* 人物を場面に出す・片づける（動きの更新も、いっしょに足し引きする） */
    addFigure(f, group) {
      const fn = (t, dt) => f.userData.tick(t, dt);
      f.userData.tickFn = fn; group.add(f); this.objs.push(f); this.ticks.push(fn);
    }
    removeFigure(f) {
      if (f.parent) f.parent.remove(f);
      let i = this.objs.indexOf(f); if (i >= 0) this.objs.splice(i, 1);
      i = this.ticks.indexOf(f.userData.tickFn); if (i >= 0) this.ticks.splice(i, 1);
      K.dispose(f);
    }
    /* そばにいる人を、その場面に合わせて置く（いなくなる場面では、片づける） */
    syncCompanion(b) {
      const st = this.stage, old = this.companion;
      if (old) { this.removeFigure(old); this.companion = null; }
      if (!b.with || !st.companion) return;
      if (!this.compLook) this.compLook = L.companionLook(this.life, this.r);   // 一日を通して、同じ人
      const cp = st.companion[b.pos] || st.companion[Object.keys(st.companion)[0]], look = this.compLook;
      const pose = look.child && cp.pose === 'seiza' ? 'stand' : cp.pose;
      const f = K.figure(Object.assign({ pose, seat: cp.seat }, look));
      K.at(f, cp.p[0], cp.p[1], cp.p[2], cp.ry);
      this.addFigure(f, st.group); this.companion = f;
    }
    /* 自由に歩いていた人を、その場に止める（最期の異変が来た瞬間） */
    seize() {
      const rig = this.rig;
      rig.wasdMove = false; rig.stick.x = rig.stick.y = 0; this.ui.stick(false);
      if (!rig.free) return;
      const p = rig.pos, yaw = rig.viewYaw(), pitch = U.clamp(rig.basePitch + rig.uPitch, -1.2, 1.2), c = Math.cos(pitch);
      rig.setAnchor({ p: [p.x, p.y, p.z], look: [p.x - Math.sin(yaw) * c, p.y + Math.sin(pitch), p.z - Math.cos(yaw) * c], lim: { yaw: 150, up: 60, down: 55 }, body: 'stand', ground: rig.groundY });
    }

    /* 灯をひとつ置き、見つめられるのを待って、記憶を語る */
    async memoryPhase(mem, tk, isFirst) {
      const ui = this.ui, env = this.env;
      const act = this._newLight(), light = act.light;
      ui.reticle(true, 0); ui.recallButton(true);
      if (isFirst) ui.hint('見まわすと、灯がひとつ、ともっている。見つめると、思い出す。', 9000);
      await new Promise((res, rej) => {
        act.resolve = res;
        const stop = () => rej(new Error('abort'));
        tk.pending.add(stop); act.unhook = () => tk.pending.delete(stop);
        if (this.fast && !this.q.get('manual')) setTimeout(() => this.trigger(), 700);
      });
      if (act.unhook) act.unhook();
      ui.reticle(false, 0); ui.recallButton(false); ui.hint('');
      light.userData.setGaze(1.2);
      this.audio.chime(2); this.audio.memoryMode(true);
      env.fxRate = 1.4;
      Object.assign(env.fxT, { blur: 6, sat: 0.32, tintAmt: 0.24, bright: 0.78, vig: 0.35 }); env.fxTintT.set('#ffd6a4');
      await U.sleep(500, tk);
      light.userData.vanish(); this.fading.push(light); this.active = null;
      await ui.memory(mem.label, U.sentences(mem.text), tk);
      this.audio.memoryMode(false);
      env.fxReset(false); env.fxRate = 2.2;
      this.fx.weary(this.weary || 0);
      this.seenMems.push(mem);
      await U.sleep(this.fast ? 100 : 800, tk);
    }

    /* 最期の場面で、いつものように灯をともす。見つめきる前に（または maxMs たつと）消える。思い出は語られない */
    async decoyLight(delayMs, maxMs, tk) {
      await U.sleep(delayMs, tk);
      const act = this._newLight(), ui = this.ui;
      ui.reticle(true, 0); ui.recallButton(true);
      await new Promise((res, rej) => {
        const t0 = performance.now();
        const iv = setInterval(() => { if (act.done || act.gaze > 0.55 || performance.now() - t0 > maxMs) { clearInterval(iv); tk.pending.delete(stop); res(); } }, 50);
        const stop = () => { clearInterval(iv); rej(new Error('abort')); };
        tk.pending.add(stop);
      });
      act.done = true;
      ui.reticle(false, 0); ui.recallButton(false);
      if (this.active === act) this.active = null;
      this.env.scene.remove(act.light); K.dispose(act.light);
    }

    /* 灯をひとつ、見える場所に置く */
    _newLight() {
      const st = this.stage, rig = this.rig, env = this.env;
      const light = K.memoryLight();
      let follow = null;
      if (rig.path || st.moving) {
        const side = this.r() < 0.5 ? -1 : 1;
        follow = new T.Vector3(side * (1.4 + this.r() * 1.2), -0.3 + this.r() * 0.9, -(3.6 + this.r() * 1.6));
        if (st.lightOffsets) follow.fromArray(U.pick(this.r, st.lightOffsets));
      } else {
        const fwd = rig.cam.getWorldDirection(v2).clone();
        const cands = (st.spots || []).map((s, i) => { const p = new T.Vector3().fromArray(s); p.idx = i; return p; }).filter(p => rig.canSee(p, -0.1) && p.distanceTo(rig.pos) > 0.7 && !(this.usedSpots || []).some(u => u.distanceTo(p) < 0.4));
        let pick = null;
        if (cands.length) {
          const scored = cands.map(p => { const ang = fwd.angleTo(v1.copy(p).sub(rig.pos)); return { p, s: Math.abs(ang - 0.7) + this.r() * 0.5 + (rig.free ? p.distanceTo(rig.pos) * 0.04 : 0) }; }).sort((x, y) => x.s - y.s);
          pick = scored[0].p;
          if (st.spotNames) light.userData.name = st.spotNames[pick.idx] || null;
        } else {
          const side = this.r() < 0.5 ? -1 : 1;
          const right = new T.Vector3(Math.cos(rig.baseYaw), 0, -Math.sin(rig.baseYaw));
          const f2 = new T.Vector3(-Math.sin(rig.baseYaw), 0, -Math.cos(rig.baseYaw));
          pick = rig.pos.clone().addScaledVector(f2, 2.2).addScaledVector(right, side * 1.3); pick.y += 0.1;
        }
        (this.usedSpots = this.usedSpots || []).push(pick);
        light.position.copy(pick);
      }
      light.userData.baseY = light.position.y;
      env.scene.add(light);
      const act = this.active = { light, follow, gaze: 0, done: false, resolve: null, t: 0, name: light.userData.name || null };
      this.updateFollow();
      return act;
    }
    trigger() { const a = this.active; if (a && !a.done) { a.done = true; if (a.resolve) a.resolve(); } }
    recall() { const a = this.active; if (a && !a.done) this.rig.lookToward(a.light.position); }
    updateFollow() {
      const a = this.active;
      if (!a || !a.follow) return;
      const rig = this.rig, y = rig.baseYaw, c = Math.cos(y), s = Math.sin(y), o = a.follow;
      a.light.position.set(rig.pos.x + o.x * c + o.z * s, rig.pos.y + o.y, rig.pos.z - o.x * s + o.z * c);
      a.light.userData.baseY = rig.pos.y + o.y;
    }

    onTap(x, y) {
      const a = this.active;
      if (a && !a.done) {
        v1.copy(a.light.position).project(this.env.camera);
        if (v1.z < 1 && Math.hypot(v1.x - x, (v1.y - y) * (window.innerHeight / window.innerWidth)) < 0.17) { this.trigger(); return; }
      }
      if (this.ui.advance()) return;
      if (this.day) this.day.use();
    }

    async soma(tk, speed) {
      const mems = this.seenMems;
      if (!mems.length) return;
      let gap = 1250 * (speed || 1);
      for (let i = 0; i < mems.length; i++) {
        let s = U.sentences(mems[i].text)[0].replace(/[、。]$/, '');
        if (s.length > 14) { const cut = s.lastIndexOf('、', 14); s = s.slice(0, cut > 5 ? cut : 13) + '…'; }
        this.ui.somaShow(s, 14 + ((i * 41 + 9) % 68), 7 + ((i * 17 + 3) % 26), gap + 1000);
        this.audio.chime(1);
        await U.sleep(gap, tk); gap = Math.max(480 * Math.min(1, speed || 1), gap * 0.82);
      }
      await U.sleep(1700, tk);
    }

    async epitaph(cause, life, tk) {
      const ui = this.ui, d = new Date();
      ui.addLedger({ id: cause.id, cat: cause.cat, name: life.name, age: life.age, cause: cause.name, place: cause.place, day: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}` });
      const recent = U.store.get('si.recent', []); recent.push(cause.id);
      U.store.set('si.recent', recent.slice(-Math.min(300, Math.floor(this.data.causes.length * 0.6))));
      if (tk && this.token !== tk) return;       // その間にやめていたら、何もしない
      this.state = 'epitaph'; this.starting = false;
      ui.clearPlay(); ui.cinema(false); this.clearObjs();
      this.audio.ambience({});
      await ui.showEpitaph({ name: life.name, ageJa: life.ageJa, jobJa: life.jobJa, dateJa: life.dateJa, timeJa: U.timeJa(cause.end.t), place: cause.place, cause: cause.name, note: cause.note, memCount: this.seenMems.length, twist: cause.twist });
    }

    /* 画面の確認用（?show=epi / ledger / mem / narr） */
    debugShow(kind) {
      const ui = this.ui, c = this.data.causes.find(x => x.id === this.q.get('id')) || this.data.causes[0];
      const life = L.make(c, U.rng(5));
      U.el('title').hidden = true;
      if (kind === 'epi') ui.showEpitaph({ name: life.name, ageJa: life.ageJa, jobJa: life.jobJa, dateJa: life.dateJa, timeJa: U.timeJa(c.end.t), place: c.place, cause: c.name, note: c.note, memCount: 6, twist: c.twist });
      else if (kind === 'ledger') {
        const rows = this.data.causes.slice(0, 9).map((x, i) => ({ id: x.id, name: ['和子', '茂', '陽菜', '健一', '節子', '蓮', '美穂', '正', '由美子'][i], age: [78, 91, 17, 66, 84, 12, 49, 97, 71][i], cause: x.name, place: x.place, day: '2026.11.' + String(20 - i).padStart(2, '0') }));
        ui.openLedger(rows);
      } else {
        ui.hud(true, c.beats[1].t, this.stage.label);
        if (kind === 'mem') {
          const m = this.data.memories.find(x => x.stage === 'child');
          Object.assign(this.env.fxT, { blur: 6, sat: 0.32, tintAmt: 0.24, bright: 0.78, vig: 0.35 }); this.env.fxTintT.set('#ffd6a4');
          const box = U.el('mem'), tx = U.el('memText'); U.el('memLabel').textContent = L.STAGE_LABEL.child; box.hidden = false; box.classList.add('is-on');
          for (const s of U.sentences(m.text)) { const p = document.createElement('p'); p.textContent = s; p.classList.add('is-on'); tx.appendChild(p); }
          U.el('btnNext').hidden = false; ui._actVis();
        } else {
          const p = U.el('narrText'); U.el('narr').hidden = false; p.textContent = U.sentences(L.resolve(c.beats[1].text, life))[0]; p.classList.add('is-on');
          ui.reticle(true, 0.6); ui.recallButton(true); U.el('btnNext').hidden = false; ui._actVis(); ui.hint('見まわすと、灯がひとつ、ともっている。見つめると、思い出す。');
        }
      }
    }

    update(dt) {
      const env = this.env, rig = this.rig, t = env.time;
      this.audio.update(dt);
      for (const f of this.ticks) f(t, dt);
      if (this.day) this.day.update(dt);
      if (this.drama && this.drama.update) this.drama.update(dt);      // ドラマの歩き・腰をおろす動き
      env.walker = rig.pos;                       // 場所の側が、本人の位置を見られるように（通りの車は、人の手前で止まる）
      if (this.state === 'title') { this.titleT += dt; rig.drift = Math.sin(this.titleT * 0.08) * 0.2; } else rig.drift = 0;
      const a = this.active;
      if (a) {
        this.updateFollow();
        a.light.userData.tick(t, dt, a.light.position.distanceTo(rig.pos));
        if (!a.done) {
          a.t += dt;
          const ang = rig.angleTo(a.light.position);
          a.gaze = U.clamp(a.gaze + (ang < 0.14 ? dt / 1.25 : -dt * 1.6), 0, 1);
          a.light.userData.setGaze(a.gaze);
          this.ui.reticle(true, a.gaze);
          if (a.gaze >= 1) this.trigger();
          if (a.t > 16 && !a.hinted && !this.day) { a.hinted = true; this.ui.hint('見つからないときは「灯を見る」を押す。', 7000); }
        }
      }
      for (let i = this.fading.length - 1; i >= 0; i--) {
        const l = this.fading[i];
        l.userData.tick(t, dt, l.position.distanceTo(rig.pos));
        if (!l.visible) { env.scene.remove(l); K.dispose(l); this.fading.splice(i, 1); }
      }
      env.vitals = { bpm: this.audio.heartBpm, flat: this.audio.heartStopped ? 1 : 0 };
    }
  }

  SI.App = App;
})(window.SI);
