'use strict';
/* 最期の一日 — 視点（頭の向き、歩行、倒れる、揺れ） */
(function (SI) {
  const T = window.THREE, U = SI.U;
  const v1 = new T.Vector3(), v2 = new T.Vector3();

  class Rig {
    constructor(env, dom) {
      this.env = env; this.cam = env.camera;
      this.root = new T.Group(); this.yawO = new T.Group(); this.pitchO = new T.Group();
      this.root.add(this.yawO); this.yawO.add(this.pitchO); this.pitchO.add(this.cam);
      this.bodyHolder = new T.Group(); this.root.add(this.bodyHolder);
      env.scene.add(this.root);

      this.pos = new T.Vector3(0, 1.5, 0);
      this.baseYaw = 0; this.basePitch = 0;
      this.uYaw = 0; this.uPitch = 0; this.tYaw = 0; this.tPitch = 0;
      this.lim = { yaw: 110, up: 60, down: 55 };
      this.path = null; this.seg = 0; this.segT = 0; this.walking = false; this.speed = 0.85; this.walkAmt = 0;
      this.sway = 1; this.shake = 0; this.shakeT = 0; this.dizzy = 0; this.dizzyT = 0; this.tremble = 0; this.trembleT = 0;
      this.fallAmt = 0; this.fallT = 0; this.fallMode = 'stand'; this.groundY = 0;
      this.head = { p: 0, r: 0, y: 0 }; this.headT = { p: 0, r: 0, y: 0 };   // 力が抜けて、頭が傾いていく
      this.sink = 0; this.sinkT = 0; this.keepBody = false;
      this.enabled = true; this.reduced = false; this.drift = 0; this.rock = 0;
      this.t = 0; this.stepPhase = 0;
      this.onTap = null; this.onStep = null;
      this.keys = {};
      /* 自由に歩くとき（free があるあいだ）。nav 歩ける範囲 / speed 歩く速さ / eye 目の高さ / locked 足を止めておく */
      this.free = null; this.stick = { x: 0, y: 0 }; this.vx = 0; this.vz = 0; this._mv = { x: 0, z: 0 };
      this._bindInput(dom);
    }

    _bindInput(dom) {
      let down = false, lx = 0, ly = 0, moved = 0, sx = 0, sy = 0, pid = null;
      const sens = () => 0.0042 * (this.cam.fov / 64);
      dom.addEventListener('pointerdown', (e) => {
        if (e.button != null && e.button > 0) return;
        if (down) return;                         // 2 本目の指は無視する
        down = true; pid = e.pointerId; lx = sx = e.clientX; ly = sy = e.clientY; moved = 0;
        try { dom.setPointerCapture(e.pointerId); } catch (err) { /* 古いブラウザ */ }
      });
      dom.addEventListener('pointermove', (e) => {
        if (!down || e.pointerId !== pid) return;
        const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
        moved += Math.abs(dx) + Math.abs(dy);
        if (!this.enabled) return;
        this.tYaw += dx * sens(); this.tPitch += dy * sens();
        this._clamp();
      });
      const up = (e) => {
        if (!down || e.pointerId !== pid) return;
        down = false;
        const dist = Math.hypot(e.clientX - sx, e.clientY - sy);
        if (dist < (e.pointerType === 'touch' ? 14 : 7) && moved < 60 && this.onTap) {
          const r = dom.getBoundingClientRect();
          this.onTap((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1));
        }
      };
      dom.addEventListener('pointerup', up);
      dom.addEventListener('pointercancel', (e) => { if (e.pointerId === pid) down = false; });
      window.addEventListener('keydown', (e) => { if (e.metaKey || e.ctrlKey || e.altKey) { this.keys = {}; return; } this.keys[e.code] = true; });
      window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
      window.addEventListener('blur', () => { this.keys = {}; });
    }

    _clamp() {
      this.tYaw = U.clamp(this.tYaw, -U.deg(this.lim.yaw), U.deg(this.lim.yaw));
      this.tPitch = U.clamp(this.tPitch, -U.deg(this.lim.down) - this.basePitch, U.deg(this.lim.up) - this.basePitch);
    }

    /* 視点の置き場所。a = {p:[x,y,z], look:[x,y,z], lim:{yaw,up,down}, path:[[x,y,z]...], ground:y} */
    setAnchor(a) {
      this.pos.fromArray(a.p || a.path[0]);
      const d = v1.fromArray(a.look || a.path[1]).sub(this.pos);
      this.baseYaw = Math.atan2(-d.x, -d.z);
      this.basePitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
      this.lim = Object.assign({ yaw: 110, up: 60, down: 55 }, a.lim || {});
      this.uYaw = this.tYaw = 0; this.uPitch = this.tPitch = 0;
      this.path = a.path ? a.path.map(p => new T.Vector3().fromArray(p)) : null;
      this.seg = 0; this.segT = 0; this.walking = !!a.path; this.walkAmt = 0;
      if (this.path) {
        this.pos.copy(this.path[0]);
        const dd = v1.copy(this.path[1]).sub(this.path[0]);
        this.baseYaw = Math.atan2(-dd.x, -dd.z); this.basePitch = 0;
      }
      this.groundY = a.ground != null ? a.ground : 0;
      this.free = null; this.vx = 0; this.vz = 0;
      this.fallAmt = 0; this.fallT = 0; this.fallMode = a.body || 'stand';
      this.calm(true);
      this.eyeY = this.pos.y;
      this.apply(0);
    }

    /* 自由に歩きはじめる。いまの向きを保ったまま、首の回る範囲の限りをはずす */
    setFree(nav, o) {
      this.baseYaw += this.uYaw; this.uYaw = this.tYaw = 0;
      const pitch = this.basePitch + this.uPitch; this.basePitch = 0; this.uPitch = this.tPitch = U.clamp(pitch, -1.2, 1.2);
      this.lim = { yaw: 1e7, up: 72, down: 72 };
      this.path = null; this.walking = false;
      this.free = Object.assign({ nav, speed: 1.2, eye: 1.5, locked: false }, o || {});
      this.fallMode = 'stand'; this.vx = 0; this.vz = 0;
    }
    /* 歩こうとしている強さ（0〜1）。座っているときに、立ち上がる合図にも使う */
    intent() {
      const k = this.keys;
      let x = this.stick.x + (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0), y = this.stick.y + (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
      return Math.min(1, Math.hypot(x, y));
    }
    /* いま見ている向き（水平）と、目の位置 */
    viewYaw() { return this.baseYaw + this.uYaw; }

    setBody(group) {
      while (this.bodyHolder.children.length) { const old = this.bodyHolder.children[0]; this.bodyHolder.remove(old); SI.Kit.dispose(old); }
      if (group) this.bodyHolder.add(group);
    }

    /* 指した点のほうへ、ゆっくり顔を向ける */
    lookToward(point) {
      this.root.updateMatrixWorld(true);
      const p = this.cam.getWorldPosition(v1);              // 倒れているときは、目の高さが変わっている
      const d = v2.copy(point).sub(p);
      const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
      let dy = yaw - this.baseYaw;
      while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      this.tYaw = dy; this.tPitch = pitch - this.basePitch;
      this._clamp();
    }

    /* 視線と、その点の向きとの角度（ラジアン） */
    angleTo(point) {
      this.cam.getWorldPosition(v1);
      const f = this.cam.getWorldDirection(v2);
      return f.angleTo(v1.sub(point).negate());
    }
    canSee(point, margin) {
      const p = v1.copy(this.pos), d = v2.copy(point).sub(p);
      const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
      let dy = yaw - this.baseYaw;
      while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      const m = margin || 0;
      return Math.abs(dy) <= U.deg(this.lim.yaw) + m && pitch <= U.deg(this.lim.up) + m && pitch >= -U.deg(this.lim.down) - m;
    }

    fall(mode) { this.fallT = 1; if (mode) this.fallMode = mode; this.walking = false; }
    jolt(v) { this.shake = Math.max(this.shake, v); }
    /* 最期の場面でかけた傾きや沈みを、もとに戻す */
    calm(instant) {
      this.headT = { p: 0, r: 0, y: 0 }; this.sinkT = 0; this.keepBody = false;
      if (instant) { this.head = { p: 0, r: 0, y: 0 }; this.sink = 0; }
    }
    stopWalk() { this.walking = false; }

    update(dt) {
      this.t += dt;
      if (this.enabled) {
        const k = this.keys, ks = 1.3 * dt, wasd = !this.wasdMove;       // 歩ける一日のあいだは、W A S D は歩くのに使う
        const l = k.ArrowLeft || (wasd && k.KeyA), r = k.ArrowRight || (wasd && k.KeyD), u = k.ArrowUp || (wasd && k.KeyW), d = k.ArrowDown || (wasd && k.KeyS);
        if (l) this.tYaw += ks;
        if (r) this.tYaw -= ks;
        if (u) this.tPitch += ks * 0.8;
        if (d) this.tPitch -= ks * 0.8;
        if (l || r || u || d) this._clamp();
      }
      this.uYaw = U.damp(this.uYaw, this.tYaw, 9, dt);
      this.uPitch = U.damp(this.uPitch, this.tPitch, 9, dt);
      this.shake = U.damp(this.shake, this.shakeT, 3, dt);
      this.dizzy = U.damp(this.dizzy, this.dizzyT, 1.5, dt);
      this.tremble = U.damp(this.tremble, this.trembleT, 2, dt);
      this.fallAmt = this.fallT > this.fallAmt ? Math.min(this.fallT, this.fallAmt + dt * 1.35) : U.damp(this.fallAmt, this.fallT, 3, dt);
      for (const k of ['p', 'r', 'y']) this.head[k] = U.damp(this.head[k], this.headT[k], 0.9, dt);
      this.sink = U.damp(this.sink, this.sinkT, 1.1, dt);

      /* 自由に歩く */
      const fr = this.free;
      if (fr) {
        let ix = 0, iy = 0;
        if (this.enabled && !fr.locked) {
          const k = this.keys;
          ix = this.stick.x + (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0); iy = this.stick.y + (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
          const len = Math.hypot(ix, iy); if (len > 1) { ix /= len; iy /= len; }
        }
        const yaw = this.baseYaw + this.uYaw, sp = fr.speed * (iy < 0 ? 0.6 : 1);
        const tx = (-Math.sin(yaw) * iy + Math.cos(yaw) * ix) * sp, tz = (-Math.cos(yaw) * iy - Math.sin(yaw) * ix) * sp;
        this.vx = U.damp(this.vx, tx, 7, dt); this.vz = U.damp(this.vz, tz, 7, dt);
        let dist = 0;
        if (dt > 0 && (Math.abs(this.vx) > 0.004 || Math.abs(this.vz) > 0.004)) {
          const o = this._mv;
          fr.nav.move(this.pos.x, this.pos.z, this.vx * dt, this.vz * dt, o);
          dist = Math.hypot(o.x - this.pos.x, o.z - this.pos.z);
          this.pos.x = o.x; this.pos.z = o.z;
        }
        const gy = fr.nav.baseY(this.pos.x, this.pos.z);
        this.groundY = gy;
        if (!fr.glide) this.pos.y = U.damp(this.pos.y, gy + fr.eye, 9, dt);
        const amt = dt > 0 ? U.clamp(dist / dt / Math.max(0.2, fr.speed), 0, 1) : 0;
        this.walkAmt = U.damp(this.walkAmt, amt, 6, dt);
        const prev = this.stepPhase;
        this.stepPhase += dist / 0.66;
        if (Math.floor(prev) !== Math.floor(this.stepPhase) && this.onStep) this.onStep();
        /* 体は、見ているほうへ遅れてついてくる */
        const fold = (amt > 0.15 || Math.abs(this.uYaw) > 0.9) ? this.uYaw * (1 - Math.exp(-3.2 * dt)) : 0;
        if (fold) { this.baseYaw += fold; this.uYaw -= fold; this.tYaw -= fold; }
      }
      /* 歩く */
      if (!fr) this.walkAmt = U.damp(this.walkAmt, this.walking ? 1 : 0, 2.5, dt);
      if (!fr && this.path && this.walkAmt > 0.01) {
        let step = this.speed * this.walkAmt * dt;
        while (step > 0 && this.seg < this.path.length - 1) {
          const a = this.path[this.seg], b = this.path[this.seg + 1], len = a.distanceTo(b);
          const remain = len * (1 - this.segT);
          if (step < remain) { this.segT += step / len; step = 0; }
          else { step -= remain; this.seg++; this.segT = 0; }
        }
        if (this.seg >= this.path.length - 1) { this.seg = this.path.length - 2; this.segT = 1; this.walking = false; }
        const a = this.path[this.seg], b = this.path[this.seg + 1];
        this.pos.lerpVectors(a, b, this.segT);
        const d = v1.copy(b).sub(a);
        let ty = Math.atan2(-d.x, -d.z), cur = this.baseYaw, dy = ty - cur;
        while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        this.baseYaw = cur + dy * (1 - Math.exp(-2 * dt));
        if (this.walking) {
          const prev = this.stepPhase;
          this.stepPhase += dt * 1.75 * this.walkAmt;
          if (Math.floor(prev) !== Math.floor(this.stepPhase) && this.onStep) this.onStep();
        }
      }
      this.apply(dt);
      const body = this.bodyHolder.children[0];
      if (body && body.userData.update && this.bodyHolder.visible) body.userData.update(dt, this.t);
    }

    apply() {
      const t = this.t, red = this.reduced ? 0.25 : 1;
      const fe = U.smooth(this.fallAmt);
      let y = this.pos.y, roll = 0, pitchAdd = 0, yawAdd = this.drift, x = 0, z = 0;
      /* 呼吸 */
      y += Math.sin(t * 0.95) * 0.006 * this.sway * red;
      pitchAdd += Math.sin(t * 0.95 + 0.6) * 0.004 * this.sway * red;
      /* 歩行の上下 */
      if (this.walkAmt > 0.01) {
        const ph = this.stepPhase * Math.PI * 2;
        y += Math.abs(Math.sin(ph * 0.5)) * 0.032 * this.walkAmt * red;
        roll += Math.sin(ph * 0.5) * 0.008 * this.walkAmt * red;
      }
      /* 船や乗り物のゆれ */
      if (this.rock > 0.001) { roll += Math.sin(t * 0.85) * 0.03 * this.rock * red; y += Math.sin(t * 0.62 + 1) * 0.045 * this.rock * red; pitchAdd += Math.sin(t * 0.5) * 0.012 * this.rock * red; }
      /* 揺れ（地震、衝撃） */
      if (this.shake > 0.001) {
        const s = this.shake * red;
        x += (Math.sin(t * 31.0) + Math.sin(t * 17.3 + 1.3)) * 0.035 * s;
        y += (Math.sin(t * 27.0 + 0.7) + Math.sin(t * 13.1)) * 0.03 * s;
        roll += Math.sin(t * 23.0 + 2.0) * 0.03 * s;
        pitchAdd += Math.sin(t * 19.0) * 0.02 * s;
      }
      /* ふるえ（寒さ） */
      if (this.tremble > 0.001) {
        const s = this.tremble * red;
        x += Math.sin(t * 47.0) * 0.004 * s; pitchAdd += Math.sin(t * 53.0 + 1.0) * 0.004 * s;
      }
      /* めまい */
      if (this.dizzy > 0.001) {
        const s = this.dizzy * red;
        roll += Math.sin(t * 0.8) * 0.16 * s; yawAdd += Math.sin(t * 0.55 + 1.0) * 0.12 * s; pitchAdd += Math.cos(t * 0.7) * 0.05 * s;
      }
      /* 力が抜ける */
      pitchAdd += this.head.p; roll += this.head.r; yawAdd += this.head.y; y -= this.sink;
      /* 倒れる */
      if (fe > 0.0001) {
        if (this.fallMode === 'lie') { roll += 0.12 * fe; pitchAdd += -0.05 * fe; }
        else if (this.fallMode === 'sit' || this.fallMode === 'bath' || this.fallMode === 'car') { y -= 0.32 * fe; roll += 0.5 * fe; pitchAdd += -0.2 * fe; z += 0.1 * fe; }
        else {
          const drop = Math.max(0, (this.pos.y - this.groundY) - (this.keepBody ? 0.11 : 0.2));     // 横たわる体を出すときは、頬が地面につく高さまで
          y -= drop * fe; roll += 1.32 * fe * (this.reduced ? 0.3 : 1); pitchAdd += 0.08 * fe; x += 0.35 * fe;
        }
      }
      this.root.position.set(this.pos.x, y, this.pos.z);
      this.yawO.rotation.y = this.baseYaw + this.uYaw + yawAdd;
      this.yawO.position.set(x, 0, z);
      this.pitchO.rotation.x = U.clamp(this.basePitch + this.uPitch + pitchAdd, -1.45, 1.45);
      this.cam.rotation.z = roll;
      this.bodyHolder.rotation.y = this.baseYaw;
      this.bodyHolder.position.y = -(y - this.pos.y) * 0;   // 体は頭の上下に付いてこない
      this.bodyHolder.position.x = this.keepBody ? x : 0; this.bodyHolder.position.z = this.keepBody ? z : 0;
      this.bodyHolder.visible = fe < 0.5 || this.keepBody;
    }
  }

  SI.Rig = Rig;
})(window.SI);
