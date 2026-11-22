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
  const FOLK = {
    neighbor: '近所の人', passerby: '通りがかりの人', cook: '店の主人', customer: 'となりの客', coworker: '同僚', worker: '仕事仲間', nurse: '看護師', icunurse: '看護師', carer: '職員', hospicenurse: '看護師', passenger: '乗り合わせた人', child: '子ども', parkgoer: '居合わせた人',
    doctor: '医師', aide: '看護助手', therapist: '理学療法士', cleaner: '清掃の人', homenurse: '訪問看護師', homedoc: '医師', helper: 'ヘルパー', volunteer: 'ボランティアの人',
    walker: '犬を連れた人', angler: '釣りをしている人', hiker: '山歩きの人', farmer: '畑の人', jogger: '走っている人', boss: '上司', guest: '客', conductor: '車掌',
    master: '店の主人', clerk: '店の人', shopkeeper: '店の人', barber: '店の人'
  };
  /* 仕事で来る人（ベッドのそばの、決まった立ち位置に来る） */
  const STAFF = { nurse: 1, icunurse: 1, hospicenurse: 1, carer: 1, doctor: 1, aide: 1, therapist: 1, cleaner: 1, homenurse: 1, homedoc: 1, helper: 1, volunteer: 1 };
  /* 来る人の身なり */
  const LOOK = {
    nurse: { top: '#e8eef0', bottom: '#dfe6ea', h: 1.58 }, icunurse: { top: '#dbe6ee', bottom: '#dbe6ee', h: 1.6 }, hospicenurse: { top: '#ece8ef', bottom: '#dfe2ea', h: 1.58 },
    carer: { top: '#c9dccf', bottom: '#4a4f5c', h: 1.6 }, doctor: { top: '#f3f5f6', bottom: '#4a4f5c', h: 1.7 }, aide: { top: '#ead6da', bottom: '#ead6da', h: 1.56 },
    therapist: { top: '#3d5a80', bottom: '#2f3540', h: 1.68 }, cleaner: { top: '#8aa39a', bottom: '#5a5a62', h: 1.6 }, homenurse: { top: '#7fa8c9', bottom: '#3d4352', h: 1.58 },
    homedoc: { top: '#f3f5f6', bottom: '#4a4640', h: 1.7 }, helper: { top: '#e3b98f', bottom: '#4a4f5c', h: 1.56 }, volunteer: { top: '#b9c99a', bottom: '#5a5a62', h: 1.56 },
    boss: { top: '#dfe3e6', bottom: '#2f3540', h: 1.7 }, coworker: { top: '#e6e9ee', bottom: '#3d4352', h: 1.64 }, conductor: { top: '#2f3a52', bottom: '#2f3a52', h: 1.68 },
    jogger: { top: '#c96a5a', bottom: '#2f3540', h: 1.66 }, hiker: { top: '#6f8f5a', bottom: '#4a4640', h: 1.64 }, angler: { top: '#7a7a5a', bottom: '#4a4f5c', h: 1.66 }, farmer: { top: '#8c8a6a', bottom: '#5a5040', h: 1.58 }
  };
  const HAIR = ['#2e2a28', '#3d332c', '#4a3c30'];

  /* 散歩の犬（柴犬くらいの大きさ）。前は +Z。しっぽを振る */
  function dog(r) {
    const g = new T.Group(), coat = K.m(U.pick(r, ['#c98a4b', '#b9773e', '#3a3029', '#e8dccb']), { rough: 0.9 }), pale = K.m('#efe6d8', { rough: 0.9 }), dark = K.m('#1c1816');
    g.add(K.box(0.2, 0.18, 0.46, coat, 0, 0.2, 0));                         // 胴
    g.add(K.box(0.16, 0.1, 0.3, pale, 0, 0.19, 0.06));                      // 胸から腹の白
    for (const [x, z] of [[-0.065, 0.17], [0.065, 0.17], [-0.065, -0.17], [0.065, -0.17]]) g.add(K.cyl(0.028, 0.22, coat, x, 0, z, { seg: 8 }));
    const head = new T.Group(); head.position.set(0, 0.36, 0.25); g.add(head);
    head.add(K.box(0.16, 0.14, 0.15, coat, 0, 0, 0));
    head.add(K.box(0.09, 0.07, 0.09, pale, 0, 0.0, 0.1));                   // 鼻づら
    head.add(K.box(0.03, 0.025, 0.02, dark, 0, 0.045, 0.145));              // 鼻
    for (const x of [-0.05, 0.05]) { const ear = K.cyl(0.035, 0.07, coat, x, 0.13, -0.01, { rTop: 0.002, seg: 4 }); head.add(ear); }
    const tail = new T.Group(); tail.position.set(0, 0.36, -0.22); g.add(tail);
    const tm = K.box(0.05, 0.16, 0.05, coat, 0, 0, 0); tm.rotation.x = -0.5; tail.add(tm);
    g.userData.wag = (t) => { tail.rotation.z = Math.sin(t * 9) * 0.5; head.rotation.y = Math.sin(t * 0.7) * 0.3; };
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  /* 急な発症や救急の呼び出しが語られている場面。このあとは、すぐに運ばれる */
  const RUSH = /救急車|電話に向かって|痛みが来る|痛みが走る|動けなくなる|立っていられない|息もつけない|板のように硬|締めつけられ|はさまれて動かない/;

  class Day {
    constructor(app, cause, life, mems, dying, tk) {
      this.app = app; this.cause = cause; this.life = life; this.dying = dying; this.tk = tk;
      this.ui = app.ui; this.rig = app.rig; this.env = app.env; this.audio = app.audio; this.r = app.r || Math.random;
      this.mems = mems.slice();
      this.talk = app.data.talk || { close: {}, folk: {} };
      this.dd = app.data.day || {};
      this.world = this.dd.world || [];
      this.notes = this.dd.notes || {};
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
      /* 来る人の予定、合間の出来事 */
      this.agenda = []; this.lastEv = 0; this.gap = 16; this.usedAmb = {}; this.turned = 0; this.lastTurn = 0;
      this.compAway = null; this.phoneN = 0; this.kin = null; this.gifted = false; this.compAct = null;
      const a = life.age, sickly = !!cause.aware || cause.cat === 'old';
      this.eyeH = a < 13 ? 1.3 : (a < 16 ? 1.42 : 1.5);
      this.selfPitch = a < 13 ? 280 : (life.sex === 'f' ? 205 : 122);
      /* 息の上がりやすさ。もう長くないと分かっている人と老衰の人、それに高齢の人だけ（思いもよらない最期の人には、前ぶれを足さない） */
      this.frail = sickly ? (a >= 80 ? 1 : 0.7) : (a >= 85 ? 0.4 : (a >= 75 ? 0.2 : 0));
      this.windT = sickly ? 14 : 30;
      this.touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      this.evlog = app.q && app.q.get('evlog') ? [] : null;      // 確認用（?evlog=1）: 起きたことを、実際の秒数とともに画面の隅に出す
      this.stat = { talk: 0, mem: 0, rise: 0, sit: 0, guest: 0, skip: 0, enter: 0, beat: 0, walk: 0, bed: 0, note: 0, kin: 0, care: 0, aside: 0, amb: 0, away: 0, phone: 0, fill: 0, world: 0, hours: 0, bedHours: 0, bedEv: 0 };
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
    /* 自分では寝返りが打てないくらい、寝ついているか（体の向きを変えてもらう人） */
    inBed() { const a = this.post.anchor; return !this.rig.free && !!a && /^lie/.test(a.body || ''); }     // ベッドや布団の上（背を起こしていても）
    bedfast() {
      const c = this.cause, b = this.scene;
      if (!b || !this.inBed() || this.canWalk) return false;
      return b.stage === 'icu' || !!(c.aware || c.cat === 'old' || c.bound || b.bound || c.mute);
    }
    /* 人工呼吸器につながっているか */
    vent() { const s = (this.cause.end && this.cause.end.state) || []; return (Array.isArray(s) ? s : [s]).includes('vent') || (!!this.cause.mute && this.scene && this.scene.stage === 'icu'); }
    /* そばの人の言葉が、世話の言葉になるか */
    sick() {
      const cz = this.cause;
      return !!CARE[this.scene.stage] || !!cz.mute || ((cz.aware || cz.cat === 'old' || cz.bound || this.scene.bound) && !this.mobile(this.scene));
    }

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
        if (s.kind === 'enter') {
          /* この場所にいられるのは、次に場所が移るまで */
          let until = this.tEnd;
          for (let j = i + 1; j < this.steps.length; j++) { const n = this.steps[j]; if (n.kind === 'enter' || n.kind === 'skip' || (n.kind === 'end' && n.enter)) { until = n.t; break; } }
          this.stayUntil = until;
          await this.enter(s);
        }
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
        if (p.guest && near && p.f.userData.pose !== 'sit' && p.f.userData.pose !== 'lean') {      // 腰かけている人は、いすの向きのまま
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
      const ui = this.ui; ui.narrShow(text); this.stat.note++; this.mark(); this.ev('語り', text);
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
          const m0 = this.m;
          this.m = Math.min(t, this.m + 7 + this.r() * 30); this.tickLight(true); this.real += 12; this.probe();
          const dh = (this.m - m0) / 60; this.stat.hours += dh; if (!this.canWalk) this.stat.bedHours += dh;
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
          if (w.text) { this.note(w.text); this.stat.world++; if (!this.canWalk) this.stat.bedEv++; }
        }
      }
      /* 人が来る・帰る。来る時刻になったら、うたた寝していても目がさめる */
      if (!this.pending) {
        const gone = !this.dozing && this.guests.find(gs => this.m >= gs.until);
        if (gone) this.pending = { type: 'go', gs: gone };
        else for (let i = 0; i < this.agenda.length && this.agenda[i].at <= this.m; i++) {
          const due = this.agenda[i];
          if (this.m - due.at > 75) { this.agenda.splice(i--, 1); continue; }     // 立ち位置がふさがったまま、ずいぶん過ぎた
          if (due.cond && !this.cond(due.cond)) { this.agenda.splice(i--, 1); continue; }     // 予定を組んだときと、体の具合や姿勢が変わった
          /* 夜の見回り（sleep の印）は、眠っていれば起こさずに、そっと済ませていく */
          if (this.dozing && due.sleep) {
            this.agenda.splice(i--, 1); this.stat.care++;
            if (due.does && due.does.includes('turn')) this.turnBody(null);
            continue;
          }
          /* 同じ役の人が、もう来ている。その人が、続けてやっていく（体温をはかったついでに、体の向きも変える） */
          const same = STAFF[due.role] && this.guests.find(g => g.role === due.role && g.p);
          if (same) {
            this.agenda.splice(i, 1);
            same.until = Math.max(same.until, this.m + U.lerp(due.mins[0], due.mins[1], this.r()));
            if (due.does) { if (this.dozing) this.setDoze(false); this.pending = { type: 'care', gs: same, does: due.does }; }
            break;
          }
          const sp = this.spotFor(due);
          if (!sp) continue;                                                    // ふさがっていれば、あとの人を先に通す
          if (this.dozing) { if (this.autoDoze === INF && !STAFF[due.role] && !due.kin) { this.agenda.splice(i, 1); break; } this.setDoze(false); }
          this.agenda.splice(i, 1); this.pending = { type: 'come', g: Object.assign({}, due, { spot: sp }) };
          break;
        }
      }
      /* そばの人が、席を外していて、戻ってくる */
      if (this.compAway && this.m >= this.compAway.back && !this.pending && !this.dozing) this.comeBack(false);
      if (this.compAct && this.real >= this.compAct.until) this.compRest();
      /* しばらく何も起きていなければ、小さな出来事をひとつ */
      if (!this.dozing && !this.pending && this.real - this.lastEv > this.gap && this.real - this.wakeAt > 4) this.filler();
      /* 寝ついている人は、うとうとする。夜、横になっていれば眠る（見舞いの人がいるあいだは、起きている） */
      if (!this.dozing && !this.rig.free && this.post.anchor && /^lie/.test(this.post.anchor.body || '') && !this.guests.some(g => g.kin)) {
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
        /* 来る人の予定と、合間の出来事のための語 */
        if (k === 'bedfast') return this.bedfast();
        if (k === 'notbedfast') return !this.bedfast();
        if (k === 'inbed') return this.inBed();
        if (k === 'turned') return this.turned !== 0;                 // 少し横向きにしてもらっている
        if (k === 'flat') return this.turned === 0;
        if (k === 'walk') return this.canWalk;
        if (k === 'bed') return !this.canWalk;
        if (k === 'aware') return !!this.cause.aware;
        if (k === 'unaware') return !this.cause.aware;
        if (k === 'speak') return !this.mute();
        if (k === 'vent') return this.vent();
        if (k === 'notvent') return !this.vent();
        if (k.startsWith('shop=')) return !!this.app.stage && k.slice(5).split('|').includes(this.app.stage.shopKind);    // 店の種類（38_shop_base.js）
        if (k.startsWith('fam=')) return !!this.app.stage && k.slice(4).split('|').includes(this.app.stage.shopFam);
        if (k === 'with') return !!(this.app.companion && this.app.companion.visible);
        if (k === 'alone') return !(this.app.companion && this.app.companion.visible);
        if (k === 'young') return life.age < 19;
        if (k === 'adult') return life.age >= 19;
        if (k === 'working') return life.job.status === 'working';
        if (k === 'weekday') return (life.date.d % 7) < 5;
        return true;
      });
    }

    /* ---------- 人 ---------- */
    person(f, role) {
      const life = this.life, c = life.close, close = role === 'close';
      /* 病室や施設にいる人と、寝ついている人のそばでは、世話の言葉になる。急な発症のさなかは、話どころではない */
      const sick = this.sick();
      const pool = this.rush.has(this.scene) ? [] : (close ? (((this.talk.close || {})[REL[c.rel] || 'friend'] || {})[sick ? 'care' : 'daily'] || []) : ((this.talk.folk || {})[role] || []));
      const key = close ? 'close' : role;
      const id = (this._pid = (this._pid || 0) + 1);
      const pitch = close ? (c.age < 13 ? 290 : (c.sex === 'f' ? 215 : 128)) : (role === 'child' ? 300 : ((U.hash(role + id) % 2) ? 208 + (id % 3) * 9 : 124 + (id % 3) * 8));
      return { f, role, id, label: close ? c.rel : (FOLK[role] || '人'), pool, used: (this.usedLines[key] = this.usedLines[key] || new Set()), pitch, dist: 99, near: false, talking: false };
    }
    refreshPeople() {
      const app = this.app, st = app.stage, list = [];
      if (app.companion && app.companion.visible) list.push(this.person(app.companion, 'close'));       // 席を外しているあいだは、いない
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
    /* ---------- 来る人の予定 ---------- */
    /* この場所にいるあいだに来る人を、時刻順に並べる。day.json の visits（仕事で来る人、通りがかる人）と、見舞いの家族・友人 */
    plotVisits(from, to) {
      const r = this.r, list = [], st = this.scene.stage;
      const win = (a, b) => { const x = U.timeToMin(a); let y = U.timeToMin(b); if (y <= x) y += 1440; return [x, y]; };
      const place = (t, v) => { for (let d = Math.floor(from / 1440) * 1440 - 1440; d <= to; d += 1440) { const at = t + d; if (at >= from + 4 && at < to - 8) list.push(Object.assign({ at }, v)); } };
      for (const v of (this.dd.visits || [])) {
        if (!v.in.includes(st) || (v.if && !this.cond(v.if)) || (v.p != null && r() >= v.p)) continue;
        const item = { role: v.role, mins: v.mins || [6, 10], does: v.does || null, quiet: !!v.quiet, where: v.spot || null, sleep: !!v.sleep, cond: v.if || null };
        if (v.times) for (const t of v.times) place(U.timeToMin(t) + Math.floor(r() * 14), item);
        else {
          const [a, b] = win(v.at[0], v.at[1]);
          if (v.every) for (let t = a + r() * Math.min(40, v.every * 0.4); t < b; t += v.every * (0.85 + r() * 0.3)) place(Math.floor(t), item);
          else place(Math.floor(a + r() * (b - a)), item);
        }
      }
      this.plotKin(list, place, win);
      list.sort((x, y) => x.at - y.at);
      this.agenda = list;
    }
    /* 見舞いの家族や友人。来る時間帯と人数は、場所ごとに決まっている（day.json の kinWin） */
    plotKin(list, place, win) {
      const st = this.scene.stage, W = this.dd.kinWin || {};
      const w = HOME[st] ? W[this.mobile(this.scene) ? 'home' : 'homebed'] : W[st];
      if (!w) return;
      if (!this.kin) this.kin = this.kinList();
      /* 家には、いっしょに暮らしている人（夫・妻、若い人の親）や先生は「見舞い」には来ない */
      const pool = this.kin.filter(k => !k.came && !(HOME[st] && (k.kind === 'spouse' || k.kind === 'teacher' || (k.kind === 'parent' && this.life.age < 30))));
      /* 病院の面会は、家族に限るところが多い。集中治療室は近い家族だけで、子どもは入れない（一般病棟には、担任の先生が手紙を預かって来る） */
      const FAM = { spouse: 1, child: 1, parent: 1, sibling: 1, grandchild: 1 };
      for (let i = pool.length - 1; i >= 0; i--) {
        const k = pool[i];
        if ((st === 'icu' && !(FAM[k.kind] && k.age >= 13)) || (st === 'hospital' && !FAM[k.kind] && k.kind !== 'teacher')) pool.splice(i, 1);
      }
      const n = Math.min(pool.length, U.irange(this.r, w.n[0], w.n[1]));
      if (!n) return;
      const [a, b] = win(w.at[0], w.at[1]), span = (b - a) / n;
      for (let i = 0; i < n; i++) {
        const k = pool.splice(Math.floor(this.r() * pool.length), 1)[0];
        place(Math.floor(a + span * (i + 0.15 + this.r() * 0.7)), { role: 'kin', kin: k, mins: w.mins });
      }
    }
    /* 見舞いに来うる人。いちばん身近な人（そばにいる人）とは別の人 */
    kinList() {
      const life = this.life, fam = life.fam, c = life.close, a = life.age, sex = life.sex, r = this.r, name = life.name, out = [];
      const add = (rel, kind, ks, ka, call) => {
        if (rel === c.rel || out.some(k => k.rel === rel)) return;
        const k = { rel, kind, sex: ks, age: U.clamp(Math.round(ka), 6, 100), call };
        k.look = L.companionLook({ close: k }, r);
        out.push(k);
      };
      const pc = sex === 'f' ? 'お母さん' : 'お父さん';
      if (fam.partner === 'with') { if (sex === 'f') add('夫', 'spouse', 'm', a + 2, name); else add('妻', 'spouse', 'f', a - 2, 'あなた'); }
      if (fam.kids > 0 && a >= 46) for (let i = 0; i < Math.min(2, fam.kids); i++) { const d = r() < 0.5; add(d ? '娘' : '息子', 'child', d ? 'f' : 'm', a - 27 - i * 3 - r() * 4, pc); }
      if (fam.grandkids > 0 && a >= 66) add('孫', 'grandchild', r() < 0.5 ? 'f' : 'm', a - 54 + r() * 12, sex === 'f' ? 'おばあちゃん' : 'おじいちゃん');
      if (a >= 50 && r() < 0.65) { const s = r() < 0.5; add(s ? '妹' : '弟', 'sibling', s ? 'f' : 'm', a - 3 - r() * 6, sex === 'f' ? '姉さん' : '兄さん'); }
      if (a < 19) {
        if (c.rel === '母') add('父', 'parent', 'm', a + 31, name); else if (c.rel === '父') add('母', 'parent', 'f', a + 29, name); else add('母', 'parent', 'f', a + 29, name);
        if (a >= 7) add('友だち', 'classmate', sex, a, name);
        if (a >= 7) add('担任の先生', 'teacher', r() < 0.5 ? 'f' : 'm', 32 + r() * 22, name + (sex === 'f' ? 'さん' : 'くん'));
      } else if (a < 50 && c.rel !== '母' && c.rel !== '父') add('母', 'parent', 'f', a + 29, name);
      if (a >= 22 && a < 66 && life.job.status === 'working') add('同僚', 'coworker', r() < 0.5 ? 'f' : 'm', a - 6 + r() * 10, name + 'さん');
      if (a >= 19 && a < 88) add('友人', 'friend', sex, a - 2 + r() * 4, a < 35 ? name : name + 'さん');
      return out;
    }
    /* 来る人が立つ場所。仕事の人はベッドのそば（staff）、見舞いの人は visit、外で通りがかる人は meet */
    spotFor(g) {
      const st = this.app.stage, rig = this.rig, vis = st.visit || [], meet = st.meet || [];
      const near = (sp, d) => Math.hypot(sp.p[0] - rig.pos.x, sp.p[2] - rig.pos.z) < d;
      /* もう誰かがいる所（来ている人、そばの人）と、こちらの立っている所には、現れない */
      const cf = this.app.companion && this.app.companion.visible ? this.app.companion.position : null;
      const taken = (sp) => this.guests.some(x => x.spot === sp || Math.hypot(x.spot.p[0] - sp.p[0], x.spot.p[2] - sp.p[2]) < 0.6) || (cf && Math.hypot(cf.x - sp.p[0], cf.z - sp.p[2]) < 0.6);
      const clear = (sp) => !taken(sp) && !near(sp, meet.includes(sp) ? 1.6 : 0.9);
      /* 歩いているときは、見ている向きに近い場所から（通りかかった人が、背中のほうに現れないように） */
      const yaw = rig.viewYaw(), fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      const front = (sp) => { const dx = sp.p[0] - rig.pos.x, dz = sp.p[2] - rig.pos.z; return (dx * fx + dz * fz) / (Math.hypot(dx, dz) || 1); };
      const ahead = (list) => rig.free ? list.slice().sort((a, b) => front(b) - front(a)) : list;
      let cands;
      if (g.where === 'meet') {
        const best = ahead(meet).find(clear);
        if (best && front(best) > 0.86) return best;
        return this.aheadSpot() || best || null;                    // 決まった場所が見えない向きなら、目の前の歩ける所に
      }
      else if (STAFF[g.role]) cands = st.staff ? [st.staff] : vis.slice(0, 1);
      else if (!this.canWalk && vis.length) cands = st.staff ? vis : vis.slice(1).concat(vis.slice(0, 1));     // 家では、ベッドのそばの 1 か所を、仕事で来る人のためにあけておく
      else if (g.kin) cands = meet.length ? ahead(meet) : vis;
      else cands = ahead(meet);                                     // 歩きまわれる日の近所の人は、庭先や戸口までしか来ない
      for (const sp of cands) if (sp && clear(sp)) return sp;
      return null;
    }
    /* 見ている向きの、少し先の歩ける所（外で通りかかる人の立ち位置）。こちらを向いて立つ */
    aheadSpot() {
      const nav = this.app.stage.nav, rig = this.rig;
      if (!nav || !nav.ok) return null;
      const yaw = rig.viewYaw();
      for (const d of [3.4, 4.2, 2.8, 5]) for (const da of [0, 0.3, -0.3, 0.6, -0.6]) {
        const a = yaw + da, x = rig.pos.x - Math.sin(a) * d, z = rig.pos.z - Math.cos(a) * d;
        if (!nav.free(x, z) || this.guests.some(g => Math.hypot(g.spot.p[0] - x, g.spot.p[2] - z) < 1.2)) continue;
        return { p: [x, nav.baseY(x, z), z], ry: Math.atan2(rig.pos.x - x, rig.pos.z - z) };
      }
      return null;
    }
    lookFor(role) {
      const r = this.r, base = LOOK[role];
      if (!base) {                                                  // 近所の人、通りがかりの人
        const elder = role === 'neighbor' ? (this.life.age >= 62 || r() < 0.3) : r() < 0.25;
        return {
          top: U.pick(r, ['#8c6f5e', '#6f7f8c', '#9a8f7a', '#7a6a7a', '#5f7a6a', '#a08a8a', '#70788f']), bottom: U.pick(r, ['#3d4352', '#4a4640', '#5a5a62']),
          hair: elder ? '#b9b6b0' : U.pick(r, HAIR), hairStyle: elder ? (r() < 0.5 ? 'hair_bun' : 'hair_thin') : (r() < 0.5 ? 'hair_short' : 'hair_long'), h: 1.52 + r() * 0.18, old: elder && r() < 0.4
        };
      }
      const fem = r() < (role === 'doctor' || role === 'homedoc' || role === 'therapist' || role === 'boss' || role === 'conductor' ? 0.35 : 0.8);
      return Object.assign({ hair: U.pick(r, HAIR), hairStyle: fem ? (r() < 0.6 ? 'hair_bun' : 'hair_short') : 'hair_short' }, base, { h: base.h + (fem ? -0.05 : 0.05) + r() * 0.04 });
    }
    kinPerson(f, k) {
      const pool = ((this.talk.visit || {})[k.kind] || {})[this.sick() ? 'care' : 'daily'] || [], key = 'kin:' + k.kind;
      const id = (this._pid = (this._pid || 0) + 1);
      return { f, role: 'kin', id, label: k.rel, call: k.call, pool, used: (this.usedLines[key] = this.usedLines[key] || new Set()), pitch: k.age < 13 ? 290 : (k.sex === 'f' ? 212 : 126), dist: 99, near: false, talking: false };
    }
    /* 見舞いの人の 1 行（{続柄} をその人に、{大切な人} をそばにいる人に） */
    kinLine(k, kind, where) {
      const n = (this.dd.kinNotes || {})[kind];
      const list = Array.isArray(n) ? n : (n && n[where]) || [];
      return list.length ? L.resolve(U.pick(this.r, list).replace(/\{続柄\}/g, k.rel), this.life) : null;
    }
    /* 人が来る。まばたきのあいだに、そこにいる */
    async guest(g, tk) {
      const app = this.app, st = app.stage, sp = g.spot, kin = g.kin, role = g.role, care = !!CARE[this.scene.stage];
      const look = kin ? kin.look : this.lookFor(role);
      const f = K.figure(Object.assign({ pose: sp.pose || 'stand', seat: sp.seat }, look));
      K.at(f, sp.p[0], sp.p[1], sp.p[2], sp.ry || 0);
      let dg = null;
      if (role === 'walker') {                                      // 犬を連れている。人の右前あたりに
        const a = sp.ry || 0, ox = -0.45, oz = 0.3;
        dg = dog(this.r); dg.position.set(sp.p[0] + ox * Math.cos(a) + oz * Math.sin(a), sp.p[1], sp.p[2] - ox * Math.sin(a) + oz * Math.cos(a)); dg.rotation.y = a - 0.5;
        dg.userData.tick = (t) => dg.userData.wag(t);
      }
      const gs = { f, role, kin, spot: sp, dog: dg, until: this.m + U.lerp(g.mins[0], g.mins[1], this.r()), p: null };
      const where = HOME[this.scene.stage] ? 'home' : (care ? 'care' : 'out');
      const text = kin ? this.kinLine(kin, 'come', where) : (this.notes[role] || {})[where];
      if (care && st.indoor) { this.audio.knock(); await U.sleep(500, tk); }
      await this.blink(() => {
        app.addFigure(f, st.group); if (dg) app.addFigure(dg, st.group);
        gs.p = kin ? this.kinPerson(f, kin) : this.person(f, role); gs.p.guest = true; this.guests.push(gs); this.refreshPeople();
        this.stat.guest++; if (!this.canWalk) this.stat.bedEv++; if (kin) { this.stat.kin++; kin.came = true; }      // 来たことにするのは、ここに現れてから
      });
      if (text) this.note(text, 0, true);
      this.mark();
      if (kin || STAFF[role]) this.ui.hint('');                   // 上の案内の箱が、来た人の顔にかからないように
      if (this.evlog) this.ev('立ち位置', role + ' (' + sp.p.map(n => n.toFixed(1)).join(', ') + ') こちら (' + [this.rig.pos.x, this.rig.pos.z].map(n => n.toFixed(1)).join(', ') + ') 向き ' + this.rig.viewYaw().toFixed(2) + (this.rig.free ? ' 歩ける' : ''));
      /* 寝ている人は、来た人のほうへ顔を向ける（画面の外にいて見えないとき。せまい画面では、ベッドの横はたいてい外になる） */
      if (!this.rig.free && gs.p && gs.p.f.parent) {
        const hp = this.headPos(gs.p, new T.Vector3()), pr = hp.clone().project(this.env.camera);
        if (Math.abs(pr.x) > 0.85 || pr.z > 1) this.rig.lookToward(hp);
      }
      if (g.does) for (const key of g.does) { await U.sleep(900, tk); await this.doCare(gs, key, tk); }
      else if (!g.quiet) this.greet(gs.p);                         // 世話をした人は、世話の終わりにひとこと言う（care の say）
      /* 見舞いの人の話から、昔のことを思い出す（一日に一度） */
      if (kin && !this.gifted && this.mems.length > 1 && this.r() < 0.55) { this.gifted = true; this.gift = { gs, at: this.real + 10 + this.r() * 14 }; }
    }
    async leave(gs) {
      const app = this.app, i = this.guests.indexOf(gs);
      if (i < 0) return;
      this.guests.splice(i, 1);
      if (this.gift && this.gift.gs === gs) this.gift = null;
      const text = gs.kin ? this.kinLine(gs.kin, 'leave') : (this.notes[gs.role] || {}).leave;
      await this.blink(() => { app.removeFigure(gs.f); if (gs.dog) app.removeFigure(gs.dog); this.refreshPeople(); });
      if (text) this.note(text, 0, true);
    }

    /* ---------- 世話 ---------- */
    /* 来た人が、体温をはかる・体の向きを変える・体をふく、など（day.json の care）。そのあいだ、こちらは手を出せない */
    async doCare(gs, key, tk) {
      const vs = ((this.dd.care || {})[key] || []).filter(v => this.cond(v.if));
      if (!vs.length || this.guests.indexOf(gs) < 0) return;
      const v = U.pick(this.r, vs), f = gs.f, ui = this.ui, react = f.userData.react;
      this.stat.care++; this.ev('世話', key + ' ' + (typeof v.steps[0] === 'string' ? v.steps[0] : v.steps[0].t));
      if (react) {
        let reach = null;
        if (v.reach) { const tg = () => this.reachPoint(gs, v.reach); tg(); f.updateMatrixWorld(true); const lp = f.worldToLocal(v1.copy(gs.tgt)); reach = { target: tg, side: lp.x > 0 ? 'L' : 'R' }; }
        react({ lean: 0.22, att: 1, hp: 0.12, reach });
        gs.p.fixed = true;
      }
      try {
        for (const s of v.steps) {
          const t = typeof s === 'string' ? s : s.t;
          if (s.snd && this.audio[s.snd]) this.audio[s.snd](s.arg);
          ui.narrShow(t);
          await U.sleep(Math.max(1900, ui.readMs(t) * 1.05), tk);
        }
        if (v.turn) this.turnBody(gs);
        if (v.say && gs.p) { const t = v.say; this.say(gs.p, t, Math.max(2400, ui.readMs(t) * 1.1)); this.ev(gs.p.label, t); }      // 声が出ない人にも、向こうは声をかける
      } finally {
        if (react) react({ lean: 0, hp: 0, reach: null });
        gs.p.fixed = false; ui.clearNarr(); this.mark();
      }
    }
    /* 手をのばす先（こちらの体の、腕・胸・額・足もと） */
    reachPoint(gs, kind) {
      const rig = this.rig, p = rig.pos, fx = -Math.sin(rig.baseYaw), fz = -Math.cos(rig.baseYaw);
      gs.f.getWorldPosition(v3);
      let sx = v3.x - p.x, sz = v3.z - p.z; const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;
      const dot = sx * fx + sz * fz; let lx = sx - dot * fx, lz = sz - dot * fz; const ll = Math.hypot(lx, lz) || 1; lx /= ll; lz /= ll;
      const o = { arm: [0.45, 0.24, -0.22], chest: [0.3, 0.05, -0.14], head: [0.02, 0.1, 0.04], feet: [1.15, 0.12, -0.2], hand: [0.55, 0.22, -0.2] }[kind] || [0.45, 0.2, -0.2];
      return (gs.tgt = gs.tgt || new T.Vector3()).set(p.x + fx * o[0] + lx * o[1], p.y + o[2], p.z + fz * o[0] + lz * o[1]);
    }
    /* 体の向きを変えてもらう（あおむけ → 少し横向き → あおむけ → 反対へ少し横向き）。背中にクッションを入れた、30 度くらいの横向き */
    turnBody(gs) {
      const rig = this.rig;
      if (rig.free) return;
      /* はじめは、世話をしている人のほうへ向く。あとは左右をかわるがわる */
      if (!this.lastTurn && gs) { gs.f.getWorldPosition(v3); const y = rig.baseYaw, right = (v3.x - rig.pos.x) * Math.cos(y) - (v3.z - rig.pos.z) * Math.sin(y); this.lastTurn = right > 0 ? 1 : -1; }
      const next = this.turned ? 0 : (this.lastTurn > 0 ? -1 : 1);
      if (next) this.lastTurn = next;
      this.turned = next;
      rig.headT.r = next * 0.28;
      rig.tYaw = U.clamp(next * 0.5, -U.deg(rig.lim.yaw), U.deg(rig.lim.yaw));
    }
    untwist() { if (this.turned) { this.turned = 0; this.rig.headT.r = 0; } }

    /* ---------- 合間の出来事 ---------- */
    mark() { this.lastEv = this.real; this.gap = 14 + this.r() * 16; }
    ev(kind, text) {
      if (!this.evlog) return;
      this.evlog.push(this.real.toFixed(0) + '秒 ' + U.minToTime(Math.floor(this.m)) + ' ' + kind + ' ' + (text || ''));
      if (U.speed > 1000) return;
      let el = document.getElementById('evlog');
      if (!el) { el = document.createElement('pre'); el.id = 'evlog'; el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:98;margin:0;padding:8px;max-width:46vw;background:rgba(0,0,0,.72);color:#e8e2d6;font:12px/1.5 monospace;white-space:pre-wrap;pointer-events:none'; document.body.appendChild(el); }
      el.textContent = this.evlog.slice(-22).join('\n');
    }
    compPerson() { return this.people.find(p => p.role === 'close' && p.f.visible && p.f.parent) || null; }
    /* 床の上での、こちらとその人の距離 */
    distTo(p) { p.f.getWorldPosition(v3); return Math.hypot(v3.x - this.rig.pos.x, v3.z - this.rig.pos.z); }
    /* しばらく何も起きていないとき: まわりの音、そばの人のしぐさや言葉、見舞いの人の話、電話、席を外す */
    filler() {
      this.mark(); this.stat.fill++;
      if (this.gift && this.real >= this.gift.at && !this.app.active) { const gs = this.gift.gs; this.gift = null; if (this.guests.indexOf(gs) >= 0) { this.pending = { type: 'gift', gs }; return; } }
      const opts = [], comp = this.compPerson(), kin = this.guests.filter(g => g.kin && g.p);
      const amb = this.ambPick(); if (amb != null) opts.push([() => this.playAmb(amb), 3]);
      if (comp && this.distTo(comp) < 7 && !comp.talking && !this.compAct) {
        const as = this.asidePick(); if (as != null) opts.push([() => this.playAside(as, comp), 2.4]);
        if (this.pickLine(comp, true)) opts.push([() => this.greet(comp), 2]);
        if (this.canAway()) opts.push([() => { this.pending = { type: 'away' }; }, 0.8]);
      }
      for (const k of kin) if (this.pickLine(k.p, true)) opts.push([() => this.greet(k.p), 3]);
      /* その場にいる人（同僚、店の主人、乗り合わせた人）が、向こうから話しかけてくる */
      const folk = this.people.filter(p => p.role !== 'close' && p.role !== 'kin' && !(p.guest && STAFF[p.role]) && p.f.visible && p.f.parent && !p.talking && this.distTo(p) < 5 && this.pickLine(p, true));
      if (folk.length) opts.push([() => this.greet(U.pick(this.r, folk)), 1.4]);
      if (kin.length && comp) { const t = this.kinLine(kin[0].kin, 'chat'); if (t) opts.push([() => this.note(t), 0.7]); }
      if (HOME[this.scene.stage] && this.phoneN < 2) { const h = this.hour(); if (h >= 9 && h < 21) opts.push([() => this.phoneCall(), 0.5]); }
      if (opts.length) U.weighted(this.r, opts)();
    }
    ambPick() {
      const st = this.scene.stage, list = this.dd.ambient || [], ok = [];
      for (let i = 0; i < list.length; i++) {
        const a = list[i], u = this.usedAmb[i];
        if (!a.in.includes(st) || (a.if && !this.cond(a.if))) continue;
        if (u != null && !(a.rep && this.m - u > 150)) continue;      // 同じことは、まず起きない（rep の印があるものだけ、間をおいてまた起きる）
        ok.push(i);
      }
      return ok.length ? U.pick(this.r, ok) : null;
    }
    playAmb(i) {
      const a = this.dd.ambient[i];
      this.usedAmb[i] = this.m; this.stat.amb++;
      if (a.snd && this.audio[a.snd]) this.audio[a.snd](a.arg);
      this.note(a.text);
    }
    /* そばの人のしぐさ（day.json の asides）。act があれば、体もそのように動く */
    asidePick() {
      const list = this.dd.asides || [], st = this.scene.stage, ok = [];
      this.usedAside = this.usedAside || {};
      for (let i = 0; i < list.length; i++) { const a = list[i]; if (this.usedAside[i] || (a.in && !a.in.includes(st)) || (a.if && !this.cond(a.if))) continue; ok.push(i); }
      return ok.length ? U.pick(this.r, ok) : null;
    }
    playAside(i, p) {
      const a = this.dd.asides[i], react = p.f.userData.react;
      this.usedAside[i] = 1; this.stat.aside++;
      this.note(L.resolve(a.t, this.life));
      if (!react || !a.act) return;
      p.fixed = true;
      if (a.act === 'doze') { react({ hp: 0.45, att: 0, hy: 0 }); this.compAct = { p, until: this.real + 22 + this.r() * 18 }; }
      else if (a.act === 'look') { react({ hy: (this.r() < 0.5 ? -1 : 1) * 0.9, att: 0, hp: -0.05 }); this.compAct = { p, until: this.real + 9 }; }
      else if (a.act === 'lean') { this.face(p, true); p.fixed = true; react({ lean: 0.3 }); this.compAct = { p, until: this.real + 7 }; }
      else if (a.act === 'reach') {
        const tg = { f: p.f, tgt: null }, fn = () => this.reachPoint(tg, 'hand'); fn(); p.f.updateMatrixWorld(true);
        const lp = p.f.worldToLocal(v1.copy(tg.tgt));
        react({ lean: 0.25, reach: { target: fn, side: lp.x > 0 ? 'L' : 'R' } }); this.compAct = { p, until: this.real + 5 };
      } else p.fixed = false;
    }
    compRest() {
      const a = this.compAct; this.compAct = null;
      if (!a) return;
      a.p.fixed = false;
      if (a.p.f.userData.react) a.p.f.userData.react({ hp: 0, lean: 0, reach: null, att: 0, hy: 0 });
      a.p.near = !a.p.near;                                         // 次の見まわりで、顔の向きを決めなおす
    }
    /* そばの人が、しばらく席を外す（day.json の away）。次の出来事の前には戻る */
    awayGroup() { const s = this.scene.stage; return s === 'icu' ? 'icu' : (CARE[s] ? 'ward' : (HOME[s] ? 'home' : null)); }
    canAway() {
      if (this.compAway || this.compAct || (this.awayN || 0) >= 2 || !this.awayGroup()) return false;
      const h = this.hour();
      if (h < 8 || h >= 21 || !this.next || this.next.t - this.m < 60) return false;
      return !this.guests.some(x => x.kin);
    }
    async goAway() {
      const list = ((this.dd.away || {})[this.awayGroup()] || []).filter(a => this.cond(a.if)), f = this.app.companion;
      if (!list.length || !f || !f.visible) return;
      const a = U.pick(this.r, list);
      this.awayN = (this.awayN || 0) + 1; this.stat.away++;
      this.compAway = { back: this.m + U.lerp(a.mins[0], a.mins[1], this.r()), a };
      if (a.snd && this.audio[a.snd]) this.audio[a.snd]();
      this.note(L.resolve(a.go, this.life), 0, true);
      await U.sleep(1500, this.tk);
      await this.blink(() => { f.visible = false; this.refreshPeople(); });
    }
    /* 戻ってくる。quiet なら、場面の変わり目なので、ただそこにいるようにする */
    comeBack(quiet) {
      const ca = this.compAway, f = this.app.companion;
      if (quiet) {                                                  // 戻る途中でも、まだ予約のままでも、ここで必ず姿を戻す
        this.compAway = null;
        if (this.pending && this.pending.type === 'back') this.pending = null;
        if (f && !f.visible) f.visible = true;
        return;
      }
      if (!ca || ca.returning) return;
      ca.returning = true;                                          // 戻りきるまで、席を外している扱いのまま
      this.pending = { type: 'back', a: ca.a };
    }
    async back(a) {
      const f = this.app.companion;
      this.compAway = null;
      if (!f) return;
      await this.blink(() => { f.visible = true; this.refreshPeople(); });
      if (a.back) this.note(L.resolve(a.back, this.life), 0, true);
    }
    /* 家の電話が鳴る。そばの人が出る。ひとりのときは、留守番電話が受ける */
    phoneCall() {
      const P = this.dd.phone || {}, comp = this.compPerson();
      this.phoneN++; this.stat.phone++;
      this.audio.phone();
      if (comp && P.with && P.with.length) {
        const x = U.pick(this.r, P.with), re = L.resolve(x.re, this.life), sc = this.scene;
        this.note(L.resolve(x.t, this.life), 4400);
        /* 受話器を置いてから、ひとこと。そのあいだに場面が進んだり、語りが始まったりしたら言わない */
        setTimeout(() => { if (this.running && this.scene === sc && !this.hold && !this.dozing && !this.busy && comp.f.visible && comp.f.parent && this.people.includes(comp)) this.say(comp, re, Math.max(2800, this.ui.readMs(re) * 1.1)); }, 4800 / U.speed);
      } else if (P.alone && P.alone.length) this.note(U.pick(this.r, P.alone), 5600);
    }
    /* 見舞いの人の話から、昔のことを思い出す */
    async giftMem(gs, tk) {
      const app = this.app, ui = this.ui, env = this.env, mem = this.mems[0];
      if (!mem || !gs.p || this.guests.indexOf(gs) < 0) return;
      const lead = this.kinLine(gs.kin, 'gift');
      try {
        if (lead) { this.face(gs.p, true); ui.narrShow(lead); await U.sleep(Math.max(2000, ui.readMs(lead)), tk); }
        this.audio.chime(2); this.audio.memoryMode(true);
        env.fxRate = 1.4;
        Object.assign(env.fxT, { blur: 6, sat: 0.32, tintAmt: 0.24, bright: 0.78, vig: 0.35 }); env.fxTintT.set('#ffd6a4');
        await U.sleep(500, tk);
        await ui.memory(mem.label, U.sentences(mem.text), tk);
        this.mems.shift(); app.seenMems.push(mem); this.stat.mem++;
      } finally {
        this.audio.memoryMode(false); ui.clearMemory(); ui.clearNarr();
        env.fxReset(false); env.fxRate = 2.2; app.fx.weary(this.weary);
        this.nextMem = this.real + this.memGap; this.mark();
      }
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
      if (behind) this.ui.float('「' + text + '」', 'is-voice', sx < 50 ? 94 : 6, 40, ms);      // うしろにいる人の言葉は、画面の端に
      else this.ui.voice(text, sx, sy, ms);                           // 顔にかからない所へ
      this.audio.murmur(Math.max(2, Math.round(text.length * 0.55)), 1, p.pitch);
    }
    line(p, x) { return L.resolve(x.re.replace(/\{名\}/g, this.life.name).replace(/\{呼\}/g, p.call || this.life.name), this.life); }
    /* 向こうから、ひとこと */
    greet(p) {
      const x = p && this.pickLine(p, true);
      if (!x || this.dozing) return;
      p.used.add(x);
      const t = this.line(p, x);
      this.say(p, t, Math.max(2600, this.ui.readMs(t) * 1.1)); this.mark(); this.ev(p.label, t);
    }
    async doTalk(p, tk) {
      const ui = this.ui, x = this.pickLine(p);
      if (this.compAct && this.compAct.p === p) this.compRest();      // うたた寝していた人も、声をかければ顔を上げる
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
      } finally { p.talking = false; ui.clearNarr(); this.mark(); }
    }

    /* ---------- 思い出の品 ---------- */
    spawnLight() {
      const act = this.app._newLight();
      act.resolve = () => { this.pending = { type: 'mem', act }; };
      this.ui.reticle(true, 0); this.ui.recallButton(true);
      if (!this.lightHint && !this.guests.length) { this.lightHint = true; this.ui.hint('見まわすと、灯がひとつ、ともっている。思い出の品だ。見つめると、思い出す。', 9000); }     // 人が来ているあいだは、案内の箱がその人の顔にかかるので、次の灯まで待つ
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
        this.nextMem = this.real + this.memGap; this.mark();
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
      const passing = a.type === 'come' || a.type === 'go' || a.type === 'away' || a.type === 'back';     // 人の出入り。こちらの歩みは止めない
      this.busy = true; this.cuttable = a.type === 'talk' || a.type === 'mem' || a.type === 'come' || a.type === 'gift' || a.type === 'care';
      this.ui.prompt(null); this._fkey = null; this.focus = null;
      if (rig.free && !passing) rig.free.locked = true;
      try {
        if (a.type === 'talk') await this.doTalk(a.p, sub);
        else if (a.type === 'mem') await this.doMem(a.act, sub);
        else if (a.type === 'seat') await this.sitDown(a.s, sub);
        else if (a.type === 'rise') { if (!rig.free && this.canWalk) await this.goFree(true, sub); }
        else if (a.type === 'come') await this.guest(a.g, sub);
        else if (a.type === 'go') await this.leave(a.gs);
        else if (a.type === 'gift') await this.giftMem(a.gs, sub);
        else if (a.type === 'care') { for (const key of a.does) await this.doCare(a.gs, key, sub); }
        else if (a.type === 'away') await this.goAway();
        else if (a.type === 'back') await this.back(a.a);
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
      this.hold = true; this.setDoze(false, true); this.dropLight(); this.guests = []; this.agenda = []; this.gift = null;
      this.compAway = null; this.compAct = null; this.untwist();
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
      this.plotVisits(this.m, this.stayUntil || this.tEnd);
      this.hold = false; this.lastInput = this.real; this.nextMem = Math.max(this.nextMem, this.real + 6); this.mark();
      if (s.first) { this.help(); this.nextMem = this.real + 14; if (app.q.get('do')) this.script(app.q.get('do')).catch(() => { }); }
    }
    /* 確認用（?do=w3,face,use,t4）: 操作を順に流す。
       w3 a1 s1 d1 その秒数だけ歩く / yaw90 向きを変える / face いちばん近い人を見る / seat 腰をおろせる場所を見る / light 灯を見る /
       use 押す / doze 目を閉じる・あける / visit 近所の人を呼ぶ / round 看護師や職員を呼ぶ / at10:30 時計をその時刻へ進める / t2 待つ /
       come.doctor その役の人を呼ぶ（いまの場所の予定にある、世話もいっしょに） / care.turn 来ている人に、その世話をしてもらう / kin 見舞いの人を呼ぶ / fill 合間の出来事をひとつ / away そばの人が席を外す */
    async script(str) {
      const rig = this.rig, wait = (sec) => U.sleep(sec * 1000, this.tk);
      const look = (v) => { if (v) rig.lookToward(v); };
      const call = (role) => {
        const v = (this.dd.visits || []).find(x => x.role === role && x.in.includes(this.scene.stage)) || { role, mins: [20, 20] };
        this.agenda.unshift({ at: this.m, role, mins: [20, 24], does: v.does || null, quiet: !!v.quiet, where: v.spot || null });
      };
      for (const cmd of str.split(',')) {
        const m = /^([a-z]+)(?:\.([a-z]+))?([-\d.:]*)$/.exec(cmd.trim()); if (!m) continue;
        const k = m[1], n = parseFloat(m[3]) || 0;
        m[2] = m[2] || m[3];
        if (k === 'w' || k === 'a' || k === 's' || k === 'd') { const code = 'Key' + k.toUpperCase(); rig.keys[code] = true; await wait(n || 1); rig.keys[code] = false; }
        else if (k === 'yaw') rig.tYaw += U.deg(n);
        else if (k === 'face') { let b = null; for (const p of this.people) if (p.f.parent && p.f.visible) { this.headPos(p, v3); const dd = v3.distanceTo(rig.pos); if (!b || dd < b.d) b = { d: dd, v: v3.clone() }; } look(b && b.v); }
        else if (k === 'seat') { const st = this.seats[0]; look(st && new T.Vector3(st.a.p[0], st.a.p[1] - 0.3, st.a.p[2])); }
        else if (k === 'light') { const a = this.app.active; look(a && a.light.position); }
        else if (k === 'use') this.use();
        else if (k === 'doze') this.toggleDoze();
        else if (k === 'visit') call('neighbor');
        else if (k === 'round') { const v = (this.dd.visits || []).find(x => STAFF[x.role] && x.in.includes(this.scene.stage)); if (v) call(v.role); }
        else if (k === 'come' && m[2]) call(m[2]);
        else if (k === 'kin') { if (!this.kin) this.kin = this.kinList(); const kk = this.kin.find(x => !x.came) || this.kin[0]; if (kk) { kk.came = false; this.agenda.unshift({ at: this.m, role: 'kin', kin: kk, mins: [40, 50] }); } }
        else if (k === 'fill') this.lastEv = -1e9;
        else if (k === 'care' && m[2]) { const gs = this.guests.find(g => STAFF[g.role] && g.p); if (gs) { gs.until = Math.max(gs.until, this.m + 10); this.pending = { type: 'care', gs, does: [m[2]] }; } }
        else if (k === 'away') { if (this.app.companion) this.pending = { type: 'away' }; }
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
      this.comeBack(true); this.compRest();
      const a = SI.pickAnchor(st, b.pos), upright = !!a.path || (a.body || 'stand') === 'stand';
      const here = rig.free ? upright : this.post.anchor === a;
      if (!here) {
        await ui.lids('shut', 280, this.tk);
        this.dropLight(); this.untwist();
        rig.setAnchor(a); rig.setBody(app.makeBody(st, a)); this.post = { anchor: a };
        app.syncCompanion(b);
        await U.sleep(140, this.tk);
        await ui.lids('open', 560, this.tk);
      } else if (!!b.with !== !!app.companion) await this.blink(() => app.syncCompanion(b));
      this.refreshPeople();
      await this.narrate(b);
      await this.release(b);
      if (!here) this.plotVisits(this.m, this.stayUntil || this.tEnd);      // 寝ていた人が起き上がった、など。来る人の予定を組みなおす
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
      this.comeBack(true); this.compRest(); this.untwist(); this.agenda = []; this.gift = null;
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
