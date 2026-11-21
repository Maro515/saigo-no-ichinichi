'use strict';
/* 最期の一日 — 一日が流れる。
   はじめの場面から最期の時刻まで、時計は止まらずに進む（一時間を何分で過ごすかは、設定で決める）。
   決まった時刻に出来事（場面の語り、場所の移り、人の出入り、最期）が来る。それまでは、歩く・見まわす・人に話しかける・
   思い出の品を見つめる・腰をおろす・目を閉じる、を自由にできる。
   時刻の単位は分（日付をまたぐと 1440 を超える）。 */
(function (SI) {
  const T = window.THREE, U = SI.U, K = SI.Kit, L = SI.Life;
  const v1 = new T.Vector3(), v2 = new T.Vector3(), v3 = new T.Vector3();
  const INF = 1e9;
  const HOME = { living: 1, washitsu: 1, bedroom: 1 }, CARE = { hospital: 1, icu: 1, hospice: 1, facility: 1 }, TRANSIT = { street: 1, train: 1, car: 1 };
  /* その場所に居つづけられる長さ（分）と、次の語りの前に着いていられる長さ（分） */
  const STAY = { living: INF, washitsu: INF, bedroom: INF, hospital: INF, icu: INF, hospice: INF, facility: INF, office: INF, worksite: INF, field: 300, mountain: 300, river: 240, sea: 240, park: 120, shop: 75, street: 40, train: 50, car: 90, bath: 30 };
  const EARLY = { living: INF, washitsu: INF, bedroom: INF, hospital: INF, icu: INF, hospice: INF, facility: INF, office: 240, worksite: 240, field: 180, mountain: 120, river: 120, sea: 120, park: 60, shop: 30, street: 20, train: 20, car: 45, bath: 15 };
  const DOZE = 10;             // 目を閉じているあいだ、1 秒に進む分
  const REL = { '夫': 'spouse', '妻': 'spouse', '娘': 'child', '息子': 'child', '孫': 'grandchild', '母': 'parent', '父': 'parent', '祖母': 'parent', '妹': 'sibling', '弟': 'sibling', '姪': 'niece', '甥': 'niece', '友人': 'friend' };
  const FOLK = { neighbor: '近所の人', passerby: '通りがかりの人', cook: '店の主人', customer: 'となりの客', coworker: '同僚', worker: '仕事仲間', nurse: '看護師', icunurse: '看護師', carer: '職員', hospicenurse: '看護師', passenger: '乗り合わせた人', child: '子ども', parkgoer: '居合わせた人' };
  /* 看護師や職員が、ベッドのそばへ来る時刻（分）。病棟は朝・午前・午後・夜・消灯のころ。集中治療室は 2 時間おき */
  const ROUNDS = {
    hospital: { role: 'nurse', at: [390, 600, 870, 1140, 1260] }, hospice: { role: 'hospicenurse', at: [420, 630, 900, 1200] },
    facility: { role: 'carer', at: [570, 760, 900, 1170] }, icu: { role: 'icunurse', at: [60, 180, 300, 420, 540, 660, 780, 900, 1020, 1140, 1260, 1380] }
  };
  /* 急な発症や救急の呼び出しが語られている場面。このあとは、すぐに運ばれる */
  const RUSH = /救急車|電話に向かって|痛みが来る|痛みが走る|動けなくなる|立っていられない|息もつけない|板のように硬|締めつけられ|はさまれて動かない/;

  class Day {
    constructor(app, cause, life, mems, dying, tk) {
      this.app = app; this.cause = cause; this.life = life; this.dying = dying; this.tk = tk;
      this.ui = app.ui; this.rig = app.rig; this.env = app.env; this.audio = app.audio; this.r = app.r || Math.random;
      this.mems = mems.slice();
      this.talk = app.data.talk || { close: {}, folk: {} };
      this.world = (app.data.day && app.data.day.world) || [];
      this.notes = (app.data.day && app.data.day.notes) || {};
      this.endB = dying.scene(); this.rush = new Set();
      this.steps = this.plan();
      this.m = this.steps[0].t; this.t0 = this.m; this.tEnd = this.steps[this.steps.length - 1].t; this.limit = this.m;
      this.running = false; this.hold = true; this.dozing = false; this.autoDoze = 0; this.busy = false; this.sub = null; this.cuttable = false;
      this.post = { anchor: null }; this.canWalk = false; this.scene = null; this.next = null;
      this.people = []; this.seats = []; this.focus = null; this.pending = null; this.usedLines = {}; this.guests = [];
      this.real = 0; this.lastInput = 0; this.wakeAt = -99; this.riseT = 0; this.weary = -1;
      const total = (this.tEnd - this.t0) * app.hourMin;                         // 一日の、実際の秒数
      this.memGap = U.clamp(total / (this.mems.length + 1) * 0.55, 12, 70); this.nextMem = 10;
      this.worldAt = this.m; this.fired = {};
      this.visitAt = 570 + Math.floor(this.r() * 400);                           // 近所の人が立ち寄る時刻（9 時半〜16 時すぎ）
      const a = life.age, sickly = !!cause.aware || cause.cat === 'old';
      this.eyeH = a < 13 ? 1.3 : (a < 16 ? 1.42 : 1.5);
      this.selfPitch = a < 13 ? 280 : (life.sex === 'f' ? 205 : 122);
      /* 息の上がりやすさ。もう長くないと分かっている人と老衰の人、それに高齢の人だけ（思いもよらない最期の人には、前ぶれを足さない） */
      this.frail = sickly ? (a >= 80 ? 1 : 0.7) : (a >= 85 ? 0.4 : (a >= 75 ? 0.2 : 0));
      this.windT = sickly ? 14 : 30;
      this.touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      this.stat = { talk: 0, mem: 0, rise: 0, sit: 0, guest: 0, skip: 0, enter: 0, beat: 0, walk: 0, bed: 0, note: 0 };
    }

    /* 歩く速さ（m/秒）。年齢と体の具合で変わる */
    speed() {
      const a = this.life.age, c = this.cause;
      let v = a < 13 ? 1.15 : (a < 60 ? 1.3 : (a < 75 ? 1.15 : (a < 85 ? 1.0 : 0.9)));
      if (c.aware) v *= 0.65; else if (c.cat === 'old') v *= 0.7;
      return v;
    }
    /* その場面で、歩きまわれるか */
    mobile(b) {
      const c = this.cause;
      if (CARE[b.stage] || b.stage === 'car') return false;
      if (c.bound || b.bound || this.rush.has(b)) return false;                // 車椅子・寝たきり・はさまれている・急な発症のあと
      if (b.pos === 'lie' && (c.aware || c.cat === 'old')) return false;      // 寝ついている
      return true;
    }
    /* 声を出して話せないか（その印がある人と、集中治療室） */
    mute() { return !!this.cause.mute || (this.scene && this.scene.stage === 'icu'); }

    /* ---------- 一日の予定 ---------- */
    plan() {
      const c = this.cause, bs = c.beats, seq = [bs[0], bs[1], bs[2], this.endB], ts = [], job = this.life.job;
      let prev = -1, add = 0;
      for (const b of seq) { let m = U.timeToMin(b.t) + add; if (m < prev) { add += 1440; m += 1440; } ts.push(m); prev = m; }
      const ownShop = (b) => b.stage === 'shop' && c.job === 'shop';                 // 自分の店で働いている件
      const stay = (b) => ownShop(b) ? INF : (STAY[b.stage] != null ? STAY[b.stage] : 120);
      const early = (A, B, G) => {
        if (HOME[B.stage] && TRANSIT[A.stage] && job.status !== 'retired' && job.status !== 'home' && G > 360) return 90;   // 勤めや学校にいるあいだは、たどらない
        return ownShop(B) ? 240 : (EARLY[B.stage] != null ? EARLY[B.stage] : 30);
      };
      const steps = [{ t: ts[0], kind: 'enter', b: bs[0], narr: true, first: true }];
      for (let i = 0; i < 3; i++) {
        const A = seq[i], B = seq[i + 1], tA = ts[i], tB = ts[i + 1], last = i === 2, G = tB - tA;
        const at = { t: tB, kind: last ? 'end' : 'beat', b: B };
        if (A.stage === B.stage && (A.v || '') === (B.v || '')) { steps.push(at); continue; }
        let sA = stay(A), eB = early(A, B, G);
        /* 家や出先から病院へ運ばれるとき。発症から搬送、処置までの時間は、たどらない */
        if (!CARE[A.stage] && (B.stage === 'icu' || B.stage === 'hospital')) {
          const rush = RUSH.test(A.text || '');
          if (rush) this.rush.add(A);
          sA = Math.min(sA, rush ? 12 : 45); eB = Math.min(eB, 30);
        }
        if (sA >= G) { steps.push(last ? { t: tB, kind: 'end', b: B, enter: true } : { t: tB, kind: 'enter', b: B, narr: true }); continue; }
        if (sA + eB < G) steps.push({ t: tA + sA, kind: 'skip', to: tB - eB });
        steps.push({ t: Math.max(tA + sA, tB - eB), kind: 'enter', b: B, narr: false, last });
        steps.push(at);
      }
      return steps;
    }

    async run() {
      const app = this.app;
      this.running = true; this.rig.wasdMove = true;
      for (let i = 0; i < this.steps.length; i++) {
        const s = this.steps[i];
        this.next = s; this.limit = s.t;
        if (i > 0) await this.roamUntil(s.t);
        if (s.kind === 'enter') await this.enter(s);
        else if (s.kind === 'beat') await this.beat(s);
        else if (s.kind === 'skip') await this.skip(s);
        else { await this.end(s); return; }
      }
    }
    stop() {
      this.running = false; this.rig.wasdMove = false; this.rig.stick.x = this.rig.stick.y = 0;
      if (this.sub) this.sub.cancel();
      this.ui.prompt(null); this.ui.rest(null); this.ui.stick(false);
      if (this.dozing) { this.dozing = false; this.audio.ambLevel(1, 0.6); }
    }

    /* ---------- 時計 ---------- */
    hour() { return (this.m / 60) % 24; }
    tickLight(force) {
      const app = this.app, hour = this.hour();
      if (force || this.real - (this._lt || 0) > 0.25) { this._lt = this.real; this.env.setConditions({ hour }); }
      const mi = Math.floor(this.m);
      if (mi !== this._mi) { this._mi = mi; this.ui.setTime(U.minToTime(mi)); }
      const a10 = Math.floor(this.m / 10);
      if (a10 !== this._a10 && app.stage) { this._a10 = a10; this.audio.ambience(SI.ambFor(app.stage, hour, this.life.season, this.life.weather)); }
      /* もう長くないと分かっている人は、一日のうちに体が重くなっていく */
      const w = this.cause.aware ? Math.min(3, 1 + Math.floor(2.999 * U.clamp((this.m - this.t0) / Math.max(1, this.tEnd - this.t0), 0, 1))) : 0;
      if (w !== this.weary) { this.weary = w; app.weary = w; if (!this.busy) app.fx.weary(w); }
    }

    update(dt) {
      if (!this.running) return;
      const rig = this.rig, ui = this.ui, fr = rig.free;
      this.real += dt;
      /* 立ち上がる・腰をおろすときの、視点の移り */
      const g = this.glide;
      if (g) {
        g.t += dt * U.speed;
        const k = U.smooth(Math.min(1, g.t / g.dur));
        rig.pos.lerpVectors(g.from, g.to, k);
        if (g.yaw != null) { rig.baseYaw = g.yaw0 + g.dyaw * k; rig.uYaw = rig.tYaw = g.u0 * (1 - k); rig.uPitch = rig.tPitch = g.p0 + (g.p1 - g.p0) * k; }
        rig.headT.p = -0.3 * Math.sin(Math.PI * Math.min(1, g.t / g.dur));          // 上体が、いちど前へかがむ
        if (g.t >= g.dur) { this.glide = null; if (fr) fr.glide = false; rig.headT.p = 0; g.done(); }
      }
      if (!this.hold) {
        const base = 1 / this.app.hourMin;
        this.m = Math.min(this.limit, this.m + dt * (this.dozing ? Math.max(DOZE, base) : base));
      }
      this.tickLight(false);
      /* 手を動かしているか */
      const sig = rig.tYaw + rig.tPitch * 1.7, move = rig.intent();
      if (sig !== this._sig || move > 0.1) { this._sig = sig; this.lastInput = this.real; if (this.dozing && this.autoDoze) this.setDoze(false); }
      if (this.dozing && this.m >= this.limit - 0.01) this.setDoze(false);
      if (this.dozing && this.autoDoze && this.autoDoze < INF && this.m >= this.autoDoze) this.setDoze(false);
      /* 最期の時刻が来たら、話や思い出の途中でも、そこで断ち切る */
      if (this.sub && this.cuttable && this.next && this.next.kind === 'end' && this.m >= this.next.t - 0.01) this.sub.cancel();

      const idle = !this.hold && !this.busy && !this.dozing && !this.glide;
      /* 座っているとき、歩こうとしたら立ち上がる */
      if (idle && !fr && this.canWalk && move > 0.5) { this.riseT += dt; if (this.riseT > 0.22 && !this.pending) this.pending = { type: 'rise' }; } else this.riseT = 0;
      /* 目の前の相手や、腰をおろせる場所 */
      let f = null;
      if (idle) f = this.scan();
      const key = f ? f.type + (f.p ? f.p.id : (f.s ? f.s.kind : '')) : '';
      if (key !== this._fkey) {
        this._fkey = key; this.focus = f;
        ui.prompt(f ? (f.type === 'talk' ? f.p.label + (this.mute() ? 'に目を向ける' : 'に話しかける') : f.s.label) : null, f ? (this.touch ? '画面を押す' : 'E') : '');
      }
      const a = this.app.active;
      ui.spot(idle && !f && a && !a.done && a.gaze > 0.06 && a.name ? a.name : null);
      /* 視線の印は、動けるあいだ出しておく（相手や品にねらいをつけるため） */
      const dot = idle && !(a && !a.done);
      if (dot !== this._dot) { this._dot = dot; if (dot || !a) ui.reticle(dot, 0); }
      /* 歩きつづけると、息が上がる（年配の人、病気の人）。立ち止まると、おさまっていく */
      if (this.frail) {
        const prev = this.exert || 0;
        this.exert = U.clamp(prev + (rig.walkAmt > 0.5 ? dt / this.windT : -dt / 9), 0, 1);
        if (Math.abs(this.exert - (this._ex || 0)) > 0.04 && !this.busy) {
          const k = this.weary, base = k ? 0.05 + 0.05 * k : 0;       // 歩いていないときの息は、体の重さの段のまま
          this._ex = this.exert; this.audio.breath((k ? 13.5 - k * 0.5 : 14) + 8 * this.exert, Math.max(base, 0.3 * this.frail * this.exert)); rig.sway = 1 + 0.25 * k + 1.2 * this.exert * this.frail;
        }
      }
      /* いる場所の名前（縁側、庭）を、画面の左上に出す */
      const pl = this.app.stage && this.app.stage.walk && this.app.stage.walk.places;
      if (pl && this.placeBase && !this.hold && this.real - (this._plT || 0) > 0.4) {
        this._plT = this.real;
        let name = this.placeBase;
        for (const r of pl) if (rig.pos.x >= r[0] && rig.pos.x <= r[2] && rig.pos.z >= r[1] && rig.pos.z <= r[3]) name = r[4];
        if (name !== this._pl) { this._pl = name; ui.hud(true, null, name); }
      }
      /* そばの人は、こちらに気づく。立ち寄った人は、体ごとこちらへ向きなおる */
      for (const p of this.people) {
        const near = p.dist < 2.3 || p.talking;
        if (near !== p.near || (near && this.real - (p.lookT || 0) > 0.3)) { p.near = near; p.lookT = this.real; this.face(p, near); }
        if (p.guest && near) {
          p.f.getWorldPosition(v3);
          let d = Math.atan2(rig.pos.x - v3.x, rig.pos.z - v3.z) - p.f.rotation.y;
          while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
          if (Math.abs(d) > 0.5) p.f.rotation.y += d * (1 - Math.exp(-2.2 * dt));
        }
      }
    }

    /* 相手の顔を、こちらへ向ける */
    face(p, on) {
      const f = p.f;
      if (!f.userData.react || p.fixed) return;
      if (!on) { f.userData.react({ hy: 0, att: 0, hp: 0 }); return; }
      f.getWorldPosition(v3);
      let yaw = Math.atan2(this.rig.pos.x - v3.x, this.rig.pos.z - v3.z) - f.rotation.y - (f.parent && f.parent !== this.app.stage.group ? f.parent.rotation.y : 0);
      while (yaw > Math.PI) yaw -= Math.PI * 2; while (yaw < -Math.PI) yaw += Math.PI * 2;
      if (Math.abs(yaw) > 2.0) { f.userData.react({ hy: 0, att: 0.3 }); return; }                  // 真後ろへは、首が回らない
      f.userData.react({ hy: U.clamp(yaw, -1.15, 1.15) * 0.85, att: 1, hp: 0.03 });
    }
    headPos(p, out) {
      const h = p.f.userData.parts && p.f.userData.parts.head;
      if (h && h.getWorldPosition) return h.getWorldPosition(out);
      p.f.getWorldPosition(out); out.y += 1.35; return out;
    }
    scan() {
      const rig = this.rig, cam = this.env.camera, free = !!rig.free;
      cam.getWorldPosition(v1); cam.getWorldDirection(v2);
      let best = null, bs = 9;
      for (const p of this.people) {
        if (!p.f.visible || !p.f.parent) { p.dist = 99; continue; }
        this.headPos(p, v3);
        const dist = Math.hypot(v3.x - v1.x, v3.z - v1.z);
        p.dist = dist;
        if (dist > (free ? 2.9 : 4.8)) continue;
        const ang = v2.angleTo(v3.sub(v1));
        if (ang < 0.24 + 0.14 / Math.max(0.7, dist) && ang < bs) { bs = ang; best = { type: 'talk', p }; }
      }
      if (free && !rig.free.locked) for (const s of this.seats) {
        const dist = Math.hypot(s.a.p[0] - rig.pos.x, s.a.p[2] - rig.pos.z);
        if (dist > 1.7) continue;
        v3.set(s.a.p[0], s.a.p[1] - 0.3, s.a.p[2]);
        const ang = v2.angleTo(v3.sub(v1));
        if (ang < 0.62 && ang + 0.4 < bs) { bs = ang + 0.4; best = { type: 'seat', s }; }
      }
      return best;
    }

    /* 押した・E を押した。何かしたら true */
    use() {
      if (!this.running) return false;
      if (this.dozing) { this.setDoze(false); return true; }
      if (this.hold || this.busy || !this.focus) return false;
      if (!this.pending) this.pending = this.focus;                 // 先に決まっていること（灯を見つめきった、など）は、押しのけない
      return true;
    }
    toggleDoze() { if (this.running && !this.hold && !this.busy) { this.autoDoze = 0; this.setDoze(!this.dozing); } }
    setDoze(on, quiet) {
      on = !!on;
      if (this.dozing === on) return;
      this.dozing = on;
      const ui = this.ui, fr = this.rig.free;
      if (on) { ui.lids('shut', 1100); this.audio.ambLevel(0.5, 1.2); if (fr) fr.locked = true; ui.prompt(null); ui.stick(false); this._fkey = ''; this.focus = null; }
      else { if (!quiet) ui.lids('open', 1300); this.audio.ambLevel(1, 1.0); if (fr && !this.glide && !this.busy) fr.locked = false; this.wakeAt = this.real; this.autoDoze = 0; this.lastInput = this.real; if (!quiet) ui.stick(this.touch && this.canWalk); }
      ui.rest(on);
    }
    async blink(fn) {
      if (this.ui.lidState === 'shut') { fn(); return; }
      await this.ui.lids('shut', 130, this.tk); fn(); await U.sleep(60, this.tk);
      if (!this.dozing) await this.ui.lids('open', 230, this.tk);
    }
    /* 語りの欄に、ひとこと出す（進行は止めない） */
    note(text, ms, force) {
      if ((this.busy && !force) || this.hold || this.dozing) return;
      const ui = this.ui; ui.narrShow(text); this.stat.note++;
      const id = this._note = (this._note || 0) + 1;
      setTimeout(() => { if (this._note === id && !this.busy && !this.hold && this.running) ui.clearNarr(); }, (ms || 1800 + ui.readMs(text)) / U.speed);
    }

    /* ---------- 自由な時間 ---------- */
    async roamUntil(t) {
      let n = 0;
      while (this.m < t - 0.001) {
        if (this.pending) { const a = this.pending; this.pending = null; await this.act(a); continue; }
        this.auto();
        if (U.speed > 1000) {                                   // 試験のとき。時計を手で進め、ひととおりのことをやってみる
          this.m = Math.min(t, this.m + 7 + this.r() * 30); this.tickLight(true); this.real += 12; this.probe();
          if (++n % 12 === 0) await U.wait(0);
        } else await U.sleep(90, this.tk);
      }
      if (this.pending && this.pending.type !== 'mem') this.pending = null;
    }
    /* 試験用: 手あたりしだいに、できることをする */
    probe() {
      if (this.pending) return;
      const x = this.r(), a = this.app.active;
      if (a && !a.done && x < 0.5) { this.app.trigger(); return; }
      if (x < 0.65 && this.people.length) { const p = U.pick(this.r, this.people); if (p.f.visible && p.f.parent) this.pending = { type: 'talk', p }; return; }
      if (!this.rig.free && this.canWalk && x < 0.8) { this.pending = { type: 'rise' }; return; }
      if (this.rig.free && this.seats.length && x < 0.9) { this.pending = { type: 'seat', s: U.pick(this.r, this.seats) }; return; }
      if (x > 0.96) this.setDoze(!this.dozing);
    }

    /* ひとりでに起きること: 灯がともる、人が来る、町の音、うとうとする */
    auto() {
      const app = this.app, st = app.stage;
      if (this.hold || this.busy) return;
      /* 思い出の灯 */
      if (!app.active && this.mems.length && this.real >= this.nextMem && !this.dozing) this.spawnLight();
      /* 町や病棟の、時刻ごとの出来事 */
      const from = this.worldAt, to = this.m; this.worldAt = to;
      if (to > from) {
        for (let i = 0; i < this.world.length; i++) {
          const w = this.world[i];
          let wm = U.timeToMin(w.t); while (wm < from) wm += 1440;
          if (wm > to || this.fired[i + ':' + Math.floor(wm / 1440)]) continue;
          this.fired[i + ':' + Math.floor(wm / 1440)] = 1;
          if (w.in && !w.in.includes(this.scene.stage)) continue;
          if (w.if && !this.cond(w.if)) continue;
          if (w.snd && this.audio[w.snd]) this.audio[w.snd](w.arg);
          if (w.text) this.note(w.text);
        }
        /* 看護師や職員が、まわってくる */
        const rd = ROUNDS[this.scene.stage];
        if (rd && st.staff && !this.guests.length && !this.coming) for (const at of rd.at) { let wm = at; while (wm < from) wm += 1440; if (wm <= to) { this.coming = { role: rd.role, at: st.staff, mins: 16 + this.r() * 10 }; break; } }
        /* 近所の人が、立ち寄る */
        if (st.meet && st.meet.length && !this.guests.length && !this.coming && !this.visited && !this.cause.aware) {
          let wm = this.visitAt; while (wm < from) wm += 1440;
          if (wm <= to) { this.visited = true; this.coming = { role: 'neighbor', at: st.meet[0], mins: 35 + this.r() * 25 }; }
        }
      }
      if (!this.pending && !this.dozing) {
        const cm = this.coming, gone = this.guests.find(gs => this.m >= gs.until);
        /* 来る人は、こちらがその場所をふさいでいないときに現れる */
        if (cm && Math.hypot(cm.at.p[0] - this.rig.pos.x, cm.at.p[2] - this.rig.pos.z) > 0.8) { this.coming = null; this.pending = { type: 'come', g: cm }; }
        else if (gone) this.pending = { type: 'go', gs: gone };
      }
      /* 寝ついている人は、うとうとする。夜、横になっていれば眠る */
      if (!this.dozing && !this.rig.free && this.post.anchor && /^lie/.test(this.post.anchor.body || '')) {
        const h = this.hour(), night = h >= 22 || h < 5;
        const sick = !!this.cause.aware || this.cause.cat === 'old';
        if ((sick || night) && this.real - this.lastInput > (night ? 16 : 24) && this.real - this.wakeAt > 30 && !app.active) {
          this.setDoze(true); this.autoDoze = (night && !sick) ? INF : this.m + 25 + this.r() * 70;
        }
      }
    }

    cond(s) {
      if (!s) return true;
      const h = this.hour(), life = this.life, w = life.weather === 'storm' ? 'rain' : (life.weather === 'fog' ? 'cloudy' : life.weather);
      return s.split(',').every(k => {
        k = k.trim();
        if (k === 'morning') return h >= 5 && h < 10;
        if (k === 'noon') return h >= 10 && h < 15;
        if (k === 'evening') return h >= 15 && h < 19;
        if (k === 'night') return h >= 19 || h < 5;
        if (k === 'day') return h >= 10 && h < 18;
        if (k === 'kid') return life.age <= 15;
        if (k === 'grown') return life.age >= 19;
        if (k === 'old') return life.age >= 75;
        if (k === 'spring' || k === 'summer' || k === 'autumn' || k === 'winter') return life.season === k;
        if (k === 'clear' || k === 'cloudy' || k === 'rain' || k === 'snow') return w === k;
        if (k === 'out') return !this.app.stage.indoor;
        if (k === 'home') return !!HOME[this.scene.stage];
        if (k === 'ward') return !!CARE[this.scene.stage];
        if (k === 'mild') return (w === 'clear' || w === 'cloudy') && life.season !== 'winter' && h >= 9 && h < 17;
        if (k === 'meal') return (h >= 8 && h < 9) || (h >= 12.3 && h < 13.3) || (h >= 18.3 && h < 19.3);       // 食事のすぐあと
        if (k === 'late') return h >= 21 || h < 5;
        if (k === 'up') return this.scene.pos !== 'lie';
        if (k === 'abed') return this.scene.pos === 'lie';
        if (k === 'dry') return w === 'clear' || w === 'cloudy';
        return true;
      });
    }

    /* ---------- 人 ---------- */
    person(f, role) {
      const life = this.life, c = life.close, close = role === 'close';
      /* 病室や施設にいる人と、寝ついている人のそばでは、世話の言葉になる。急な発症のさなかは、話どころではない */
      const cz = this.cause, sick = !!CARE[this.scene.stage] || !!cz.mute || ((cz.aware || cz.cat === 'old' || cz.bound || this.scene.bound) && !this.mobile(this.scene));
      const pool = this.rush.has(this.scene) ? [] : (close ? (((this.talk.close || {})[REL[c.rel] || 'friend'] || {})[sick ? 'care' : 'daily'] || []) : ((this.talk.folk || {})[role] || []));
      const key = close ? 'close' : role;
      const id = (this._pid = (this._pid || 0) + 1);
      const pitch = close ? (c.age < 13 ? 290 : (c.sex === 'f' ? 215 : 128)) : (role === 'child' ? 300 : ((U.hash(role + id) % 2) ? 208 + (id % 3) * 9 : 124 + (id % 3) * 8));
      return { f, role, id, label: close ? c.rel : (FOLK[role] || '人'), pool, used: (this.usedLines[key] = this.usedLines[key] || new Set()), pitch, dist: 99, near: false, talking: false };
    }
    refreshPeople() {
      const app = this.app, st = app.stage, list = [];
      if (app.companion) list.push(this.person(app.companion, 'close'));
      const own = this.scene.stage === 'shop' && this.cause.job === 'shop';       // 自分の店では、店の人や客に、客として話しかけることはない
      if (!own) for (const x of (st.folk || [])) if (x && x.f) list.push(this.person(x.f, x.role));
      for (const gs of this.guests) list.push(gs.p);
      this.people = list;
      this.seats = [];
      if (st.nav && st.nav.ok) {
        for (const k of ['sit', 'lie']) { const a = st.anchors[k]; if (a && a.p && (k === 'sit' ? a.body === 'sit' : /^lie/.test(a.body || ''))) this.seats.push({ kind: k, a, label: k === 'sit' ? '腰をおろす' : '横になる' }); }
        st.nav.dyn = list.filter(p => p.f.parent).map(p => { p.f.getWorldPosition(v3); return { x: v3.x, z: v3.z, r: 0.22 }; });
      }
      this._fkey = null;
    }
    /* 人が来る。まばたきのあいだに、そこに立っている */
    async guest(role, at, mins) {
      const app = this.app, st = app.stage, r = this.r, old = this.life.age >= 62;
      const look = role === 'neighbor'
        ? { top: U.pick(r, ['#8c6f5e', '#6f7f8c', '#9a8f7a', '#7a6a7a', '#5f7a6a']), bottom: U.pick(r, ['#3d4352', '#4a4640', '#5a5a62']), hair: old ? '#b9b6b0' : '#2e2a28', hairStyle: r() < 0.5 ? (old ? 'hair_bun' : 'hair_short') : (old ? 'hair_thin' : 'hair_short'), h: 1.52 + r() * 0.14 }
        : (role === 'carer' ? { top: '#c9dccf', bottom: '#4a4f5c', hair: '#2e2a28', hairStyle: 'hair_short', h: 1.6 } : { top: '#e8eef0', bottom: '#dfe6ea', hair: '#2e2a28', hairStyle: r() < 0.6 ? 'hair_bun' : 'hair_short', h: 1.58 });
      const f = K.figure(Object.assign({ pose: 'stand' }, look));
      K.at(f, at.p[0], at.p[1], at.p[2], at.ry || 0);
      const gs = { f, role, until: this.m + mins, p: null }; this.stat.guest++;
      const text = (this.notes[role] || {})[HOME[this.scene.stage] ? 'home' : (CARE[this.scene.stage] ? 'care' : 'out')];
      await this.blink(() => { app.addFigure(f, st.group); gs.p = this.person(f, role); gs.p.guest = true; this.guests.push(gs); this.refreshPeople(); });
      if (text) this.note(text, 0, true);
      if (role !== 'neighbor') this.greet(gs.p);
    }
    async leave(gs) {
      const app = this.app, i = this.guests.indexOf(gs);
      if (i < 0) return;
      this.guests.splice(i, 1);
      const text = (this.notes[gs.role] || {}).leave;
      await this.blink(() => { app.removeFigure(gs.f); this.refreshPeople(); });
      if (text) this.note(text, 0, true);
    }
    pickLine(p, solo) {
      const quiet = solo || this.mute();                              // 声が出ない人は、こちらからは言葉をかけない
      const pool = p.pool.filter(x => !p.used.has(x) && this.cond(x.if) && (!quiet || !x.me));
      return pool.length ? U.pick(this.r, pool) : null;
    }
    say(p, text, ms) {
      const cam = this.env.camera;
      this.headPos(p, v3).project(cam);
      const sx = (v3.x * 0.5 + 0.5) * 100, sy = (-v3.y * 0.5 + 0.5) * 100, behind = v3.z > 1;
      const narrow = window.innerWidth < 600;                       // せまい画面では、言葉の箱が画面の外へ出ないように寄せる
      const x = behind ? (sx < 50 ? 94 : 6) : (sx < 50 ? U.clamp(sx + 7, 6, narrow ? 34 : 48) : U.clamp(sx - 7, narrow ? 66 : 52, 94));
      this.ui.float('「' + text + '」', 'is-voice', x, U.clamp(sy - 7, 14, 60), ms);
      this.audio.murmur(Math.max(2, Math.round(text.length * 0.55)), 1, p.pitch);
    }
    line(p, x) { return L.resolve(x.re.replace(/\{名\}/g, this.life.name), this.life); }
    /* 向こうから、ひとこと */
    greet(p) {
      const x = p && this.pickLine(p, true);
      if (!x || this.dozing) return;
      p.used.add(x);
      const t = this.line(p, x);
      this.say(p, t, Math.max(2600, this.ui.readMs(t) * 1.1));
    }
    async doTalk(p, tk) {
      const ui = this.ui, x = this.pickLine(p);
      p.talking = true; this.face(p, true);
      try {
        if (!x) { ui.narrShow(p.label + 'と、目が合う。'); await U.sleep(2400, tk); return; }
        p.used.add(x);
        const me = x.me ? '「' + x.me + '」' : p.label + (this.mute() ? 'に、目を向ける。' : 'に、声をかける。');
        ui.narrShow(me);
        if (x.me) this.audio.murmur(Math.max(2, Math.round(x.me.length * 0.5)), this.weary >= 2 ? 0.3 : 0.5, this.selfPitch);
        await U.sleep(Math.max(1200, ui.readMs(me) * 0.6), tk);
        const re = this.line(p, x), ms = Math.max(2800, ui.readMs(re) * 1.15);
        this.say(p, re, ms); this.stat.talk++;
        await U.sleep(ms + 200, tk);
      } finally { p.talking = false; ui.clearNarr(); }
    }

    /* ---------- 思い出の品 ---------- */
    spawnLight() {
      const act = this.app._newLight();
      act.resolve = () => { this.pending = { type: 'mem', act }; };
      this.ui.reticle(true, 0); this.ui.recallButton(true);
      if (!this.lightHint) { this.lightHint = true; this.ui.hint('見まわすと、灯がひとつ、ともっている。思い出の品だ。見つめると、思い出す。', 9000); }
    }
    dropLight() {
      const app = this.app, a = app.active;
      if (!a) return;
      if (this.pending && this.pending.type === 'mem') this.pending = null;
      a.done = true; app.active = null;
      a.light.userData.vanish(); app.fading.push(a.light);
      this.ui.reticle(false, 0); this.ui.recallButton(false); this.ui.spot(null);
    }
    async doMem(act, tk) {
      const app = this.app, ui = this.ui, env = this.env, light = act.light, mem = this.mems[0];
      ui.reticle(false, 0); ui.recallButton(false); ui.hint(''); ui.spot(null);
      if (!mem) { light.userData.vanish(); app.fading.push(light); app.active = null; return; }
      try {
        light.userData.setGaze(1.2);
        this.audio.chime(2); this.audio.memoryMode(true);
        env.fxRate = 1.4;
        Object.assign(env.fxT, { blur: 6, sat: 0.32, tintAmt: 0.24, bright: 0.78, vig: 0.35 }); env.fxTintT.set('#ffd6a4');
        await U.sleep(500, tk);
        light.userData.vanish(); app.fading.push(light); app.active = null;
        await ui.memory(act.name ? act.name + '　' + mem.label : mem.label, U.sentences(mem.text), tk);
        this.mems.shift(); app.seenMems.push(mem); this.stat.mem++;
      } finally {
        if (app.active === act) { app.active = null; light.userData.vanish(); app.fading.push(light); }
        this.audio.memoryMode(false); ui.clearMemory();
        env.fxReset(false); env.fxRate = 2.2; app.fx.weary(this.weary);
        this.nextMem = this.real + this.memGap;
      }
    }

    /* ---------- 立つ・座る ---------- */
    glideTo(to, dur, yaw, pitch, tk) {
      const rig = this.rig; tk = tk || this.tk;
      return new Promise((res, rej) => {
        if (tk.aborted) return rej(new Error('abort'));
        const stop = () => rej(new Error('abort'));
        tk.pending.add(stop);
        const g = this.glide = { from: rig.pos.clone(), to, t: 0, dur, done: () => { tk.pending.delete(stop); res(); } };
        if (yaw != null) {
          let d = yaw - rig.baseYaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
          g.yaw = yaw; g.yaw0 = rig.baseYaw; g.dyaw = d; g.u0 = rig.uYaw; g.p0 = rig.uPitch; g.p1 = pitch || 0;
        }
        if (rig.free) rig.free.glide = true;
      });
    }
    /* いまの場所から、歩ける状態になる。rise なら、立ち上がって一歩出る */
    async goFree(rise, tk) {
      const app = this.app, rig = this.rig, st = app.stage, nav = st.nav;
      if (!nav || !nav.ok) return false;
      const p = rise ? nav.startNear(rig.pos.x, rig.pos.z) : nav.nearest(rig.pos.x, rig.pos.z, 8);
      if (!p) return false;
      const body = rig.bodyHolder.children[0];
      if (!body || body.userData.kind !== 'stand') rig.setBody(K.body('stand', Object.assign({}, (st.body && st.body.stand) || {})));
      rig.setFree(nav, { speed: this.speed(), eye: this.eyeH, locked: true });
      rig.bodyHolder.visible = true;
      const to = new T.Vector3(p.x, nav.baseY(p.x, p.z) + this.eyeH, p.z), d = to.distanceTo(rig.pos);
      this.post = { anchor: null };
      if (d > 0.03) await this.glideTo(to, rise ? 1.25 : U.clamp(d * 0.6, 0.15, 0.6), null, 0, tk);
      if (rise) this.stat.rise++;
      if (rig.free) rig.free.locked = this.dozing || this.busy;
      return true;
    }
    async sitDown(s, tk) {
      const app = this.app, rig = this.rig, st = app.stage, a = s.a;
      if (!rig.free) return;
      rig.free.locked = true;
      const d = v1.fromArray(a.look).sub(v2.fromArray(a.p));
      await this.glideTo(new T.Vector3().fromArray(a.p), 1.1, Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), tk);
      rig.setAnchor(a); rig.setBody(app.makeBody(st, a));
      this.post = { anchor: a }; this.stat.sit++;
    }

    async act(a) {
      const rig = this.rig, sub = this.sub = new U.Token(), link = () => sub.cancel();
      this.tk.pending.add(link);
      const passing = a.type === 'come' || a.type === 'go';             // 人の出入り。こちらの歩みは止めない
      this.busy = true; this.cuttable = a.type === 'talk' || a.type === 'mem';
      this.ui.prompt(null); this._fkey = null; this.focus = null;
      if (rig.free && !passing) rig.free.locked = true;
      try {
        if (a.type === 'talk') await this.doTalk(a.p, sub);
        else if (a.type === 'mem') await this.doMem(a.act, sub);
        else if (a.type === 'seat') await this.sitDown(a.s, sub);
        else if (a.type === 'rise') { if (!rig.free && this.canWalk) await this.goFree(true, sub); }
        else if (a.type === 'come') await this.guest(a.g.role, a.g.at, a.g.mins);
        else if (a.type === 'go') await this.leave(a.gs);
      } catch (e) {
        if (this.tk.aborted || !e || e.message !== 'abort') throw e;        // 体験そのものをやめたとき
      } finally {
        this.tk.pending.delete(link); this.sub = null; this.busy = false; this.cuttable = false;
        if (this.glide) { this.glide = null; if (rig.free) rig.free.glide = false; rig.headT.p = 0; }      // 立つ・座るの途中でやめたとき
        if (rig.free) rig.free.locked = this.dozing;
      }
    }

    /* ---------- 出来事 ---------- */
    /* 場所が移る。まぶたを閉じ、次の場所で目をあける */
    async enter(s) {
      const app = this.app, ui = this.ui, isEnd = s.b === this.endB;
      this.hold = true; this.setDoze(false, true); this.dropLight(); this.guests = []; this.coming = null;
      ui.prompt(null); ui.stick(false); ui.clearNarr();
      if (!s.first && ui.lidState !== 'shut') await ui.lids('shut', 800, this.tk);
      this.m = s.t; this.scene = s.b; this.worldAt = this.m;
      await app.enterScene(Object.assign({}, s.b, { t: U.minToTime(s.t) }), this.tk, !!s.first, isEnd ? this.cause.place : null);
      this.post = { anchor: app.anchor };
      this.placeBase = isEnd ? null : app.stage.label; this._pl = this.placeBase;       // 最期の場所の名前は、そのまま出しておく
      this._a10 = null; this.tickLight(true);
      this.refreshPeople();
      if (s.narr) await this.narrate(s.b);
      await this.release(s.b);
      this.hold = false; this.lastInput = this.real; this.nextMem = Math.max(this.nextMem, this.real + 6);
      if (s.first) { this.help(); this.nextMem = this.real + 14; if (app.q.get('do')) this.script(app.q.get('do')).catch(() => { }); }
    }
    /* 確認用（?do=w3,face,use,t4）: 操作を順に流す。
       w3 a1 s1 d1 その秒数だけ歩く / yaw90 向きを変える / face いちばん近い人を見る / seat 腰をおろせる場所を見る / light 灯を見る /
       use 押す / doze 目を閉じる・あける / visit 近所の人を呼ぶ / round 看護師や職員を呼ぶ / at10:30 時計をその時刻へ進める / t2 待つ */
    async script(str) {
      const rig = this.rig, wait = (sec) => U.sleep(sec * 1000, this.tk);
      const look = (v) => { if (v) rig.lookToward(v); };
      for (const cmd of str.split(',')) {
        const m = /^([a-z]+)([-\d.:]*)$/.exec(cmd.trim()); if (!m) continue;
        const k = m[1], n = parseFloat(m[2]) || 0;
        if (k === 'w' || k === 'a' || k === 's' || k === 'd') { const code = 'Key' + k.toUpperCase(); rig.keys[code] = true; await wait(n || 1); rig.keys[code] = false; }
        else if (k === 'yaw') rig.tYaw += U.deg(n);
        else if (k === 'face') { let b = null; for (const p of this.people) if (p.f.parent && p.f.visible) { this.headPos(p, v3); const dd = v3.distanceTo(rig.pos); if (!b || dd < b.d) b = { d: dd, v: v3.clone() }; } look(b && b.v); }
        else if (k === 'seat') { const st = this.seats[0]; look(st && new T.Vector3(st.a.p[0], st.a.p[1] - 0.3, st.a.p[2])); }
        else if (k === 'light') { const a = this.app.active; look(a && a.light.position); }
        else if (k === 'use') this.use();
        else if (k === 'doze') this.toggleDoze();
        else if (k === 'visit') { this.visited = false; this.visitAt = this.m + 0.5; }
        else if (k === 'round') { const rd = ROUNDS[this.scene.stage], st = this.app.stage; if (rd && st.staff) this.coming = { role: rd.role, at: st.staff, mins: 20 }; }
        else if (k === 'at') { const tm = U.timeToMin(m[2]); let x = tm; while (x < this.m) x += 1440; this.m = Math.min(this.limit, x); }
        else if (k === 't') await wait(n || 1);
        await wait(0.05);
      }
    }
    async narrate(b) {
      this.busy = true;
      try { for (const sn of U.sentences(L.resolve(b.text, this.life))) await this.ui.narrate(sn, this.tk); this.ui.clearNarr(); }
      finally { this.busy = false; }
    }
    /* 語りのあと、動けるようになる */
    async release(b) {
      const st = this.app.stage, a = this.post.anchor;
      this.canWalk = !!(st.nav && st.nav.ok) && this.mobile(b);
      this.stat[this.canWalk ? 'walk' : 'bed']++;
      this.ui.stick(this.touch && this.canWalk);
      if (this.canWalk && a && (a.path || (a.body || 'stand') === 'stand')) await this.goFree(false);
    }
    help() {
      const walk = this.canWalk, t = this.touch;
      const text = t
        ? (walk ? '左下の円で歩く。画面をなぞって見まわす。人を見て画面を押すと、話しかける。' : (this.mute() ? '画面をなぞって見まわす。人を見て画面を押すと、目を向ける。' : '画面をなぞって見まわす。人を見て画面を押すと、話しかける。'))
        : (walk ? '歩く W A S D　　見まわす ドラッグ　　話しかける・腰をおろす E　　目を閉じる C' : '見まわす ドラッグ　　' + (this.mute() ? '人に目を向ける' : '話しかける') + ' E　　目を閉じる C');
      this.ui.hint(text, 11000);
      this.ui.rest(false);
    }
    /* その場で、次の場面の語りが来る */
    async beat(s) {
      const app = this.app, ui = this.ui, rig = this.rig, st = app.stage, b = s.b;
      this.hold = true;
      if (this.dozing) { this.setDoze(false); await U.sleep(1100, this.tk); }
      this.m = s.t; this.scene = b; ui.prompt(null); ui.clearNarr();
      const a = SI.pickAnchor(st, b.pos), upright = !!a.path || (a.body || 'stand') === 'stand';
      const here = rig.free ? upright : this.post.anchor === a;
      if (!here) {
        await ui.lids('shut', 280, this.tk);
        this.dropLight();
        rig.setAnchor(a); rig.setBody(app.makeBody(st, a)); this.post = { anchor: a };
        app.syncCompanion(b);
        await U.sleep(140, this.tk);
        await ui.lids('open', 560, this.tk);
      } else if (!!b.with !== !!app.companion) await this.blink(() => app.syncCompanion(b));
      this.refreshPeople();
      await this.narrate(b);
      await this.release(b);
      this.hold = false; this.lastInput = this.real;
    }
    /* たどれない時間（勤め先、学校、移動）は、目を閉じているうちに過ぎる */
    async skip(s) {
      const ui = this.ui;
      this.hold = true; this.setDoze(false, true); this.dropLight(); ui.prompt(null); ui.stick(false); ui.clearNarr(); this.stat.skip++;
      if (ui.lidState !== 'shut') await ui.lids('shut', 1400, this.tk);
      this.audio.ambLevel(0.2, 0.8);
      const from = this.m, t0 = performance.now(), dur = 2400 / U.speed;
      for (;;) {
        const k = Math.min(1, (performance.now() - t0) / Math.max(1, dur));
        this.m = from + (s.to - from) * U.smooth(k); ui.setTime(U.minToTime(this.m));
        if (k >= 1) break;
        await U.sleep(40, this.tk);
      }
      this.m = s.to; this.audio.ambLevel(1, 0.8);
    }
    /* 最期の時刻。場所が同じなら、いまいる所で、そのまま始まる */
    async end(s) {
      const app = this.app, ui = this.ui, rig = this.rig, b = s.b, c = this.cause;
      this.hold = true;
      if (this.dozing) { this.setDoze(false); await U.sleep(1300, this.tk); }
      this.dropLight(); ui.prompt(null); ui.rest(null); ui.hint(''); ui.clearNarr();
      this.m = s.t;
      if (s.enter) {
        ui.stick(false);
        if (ui.lidState !== 'shut') await ui.lids('shut', 800, this.tk);
        await app.enterScene(b, this.tk, false, c.place);
      } else {
        const st = app.stage;
        const a = (b.pos === 'walk' && st.anchors.walkEnd) ? st.anchors.walkEnd : SI.pickAnchor(st, b.pos);
        const upright = !!a.path || (a.body || 'stand') === 'stand';
        const here = rig.free ? upright : this.post.anchor === a;
        if (!here) {
          await ui.lids('shut', 280, this.tk);
          rig.setAnchor(a); rig.setBody(app.makeBody(st, a)); ui.stick(false);
          app.syncCompanion(b);
          await U.sleep(140, this.tk);
          await ui.lids('open', 560, this.tk);
        } else if (!!b.with !== !!app.companion) await this.blink(() => app.syncCompanion(b));
        this.env.setConditions({ hour: U.timeToHour(b.t) });
        ui.hud(true, b.t, c.place);
        this.audio.heart(70, 0, 0); this.audio.breath(14, 0);
      }
      this.running = false; this.rig.wasdMove = !!rig.free;
    }
  }

  SI.Day = Day;
})(window.SI);
