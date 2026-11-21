'use strict';
/* 最期の一日 — 歩ける範囲。
   場所ごとの walk（床の長方形）をマス目に切り、家具や壁のあるマスを、上からの光線で調べて除く。
     walk: { y: 床の高さ, h(x, z): 地面の高さ（起伏のある場所だけ）, rects: [[x0, z0, x1, z1(, y)]...], holes: [[x0, z0, x1, z1]...], start: [x, z], cell: マスの大きさ,
             gate(x, z): そこへいま入れるか（赤信号の横断歩道は false）,
             places: [[x0, z0, x1, z1, 名前]...] そこにいるあいだの場所の名前 } */
(function (SI) {
  const T = window.THREE;
  const RADIUS = 0.15;         // 体の半径（せまい所は、体を横にして通るくらいの幅）
  const LOW = 0.3;             // これより低いものは、またげる
  const HEAD = 1.55;

  function isFigure(o) { return !!(o.userData && (o.userData.react || o.userData.pose !== undefined || o.userData.parts || o.userData.isFigure)); }

  class Nav {
    constructor(st) {
      const w = st.walk;
      this.ok = false; this.dyn = [];
      if (!w || !w.rects || !w.rects.length) return;
      let area = 0; for (const r of w.rects) area += (r[2] - r[0]) * (r[3] - r[1]);
      this.w = w; this.cell = w.cell || (st.indoor ? 0.1 : (area > 700 ? 0.25 : 0.2));     // 室内は細かく切る（家具のあいだの、せまい通り道のため）
      let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
      for (const r of w.rects) { x0 = Math.min(x0, r[0]); z0 = Math.min(z0, r[1]); x1 = Math.max(x1, r[2]); z1 = Math.max(z1, r[3]); }
      this.x0 = x0; this.z0 = z0;
      this.nx = Math.max(1, Math.ceil((x1 - x0) / this.cell)); this.nz = Math.max(1, Math.ceil((z1 - z0) / this.cell));
      this.grid = new Uint8Array(this.nx * this.nz);
      this.build(st);
      this.ok = true;
    }

    baseY(x, z) {
      const w = this.w;
      if (w.h) return w.h(x, z);
      for (const r of w.rects) if (r.length > 4 && x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) return r[4];
      return w.y || 0;
    }

    build(st) {
      const w = this.w, c = this.cell, nx = this.nx, nz = this.nz, grid = this.grid;
      st.group.updateMatrixWorld(true);
      /* 当たりを調べる相手。人物は除く（人は別に、円でよける） */
      const solids = [], box = new T.Box3();
      const visit = (o) => {
        if (!o.visible || isFigure(o) || (o.userData && (o.userData.noAO || o.userData.noNav))) return;
        if (o.isMesh && !o.isSkinnedMesh && o.geometry && o.geometry.attributes.position && o.geometry.attributes.position.count) {
          box.setFromObject(o);
          if (!box.isEmpty()) solids.push({ o, x0: box.min.x, x1: box.max.x, z0: box.min.z, z1: box.max.z, y0: box.min.y, y1: box.max.y });
        }
        for (const ch of o.children) visit(ch);
      };
      visit(st.group);
      /* 足もとから頭の上へ光線を上げる。物の内側から始まっても当たるように、調べるあいだだけ面を両面にする */
      const ray = new T.Raycaster(), from = new T.Vector3(), up = new T.Vector3(0, 1, 0), list = [];
      ray.far = HEAD - LOW;
      const mats = new Map();
      for (const s of solids) for (const m of (Array.isArray(s.o.material) ? s.o.material : [s.o.material])) if (m && !mats.has(m)) { mats.set(m, m.side); m.side = T.DoubleSide; }
      const hc = c / 2, OFF = [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
      const inRect = (x, z, rs) => { for (const r of rs) if (x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) return true; return false; };
      for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
        const x = this.x0 + (ix + 0.5) * c, z = this.z0 + (iz + 0.5) * c;
        if (!inRect(x, z, w.rects) || (w.holes && inRect(x, z, w.holes))) continue;
        const y = this.baseY(x, z);
        list.length = 0;
        let hit = false;
        for (const s of solids) {
          if (!(x >= s.x0 - hc && x <= s.x1 + hc && z >= s.z0 - hc && z <= s.z1 + hc && s.y1 > y + LOW && s.y0 < y + HEAD)) continue;
          /* 柱や壁、背の高い家具。足もとから頭の上まで続いている、幅のせまいもの */
          if (s.y0 <= y + LOW + 0.15 && s.y1 >= y + HEAD && Math.min(s.x1 - s.x0, s.z1 - s.z0) <= 1.2) { hit = true; break; }
          list.push(s.o);
        }
        /* マスのまん中と四すみで調べる（マスとマスのあいだにある、薄い物を見落とさないように） */
        if (!hit && list.length) for (const o of OFF) { from.set(x + o[0] * hc * 0.7, y + LOW, z + o[1] * hc * 0.7); ray.set(from, up); if (ray.intersectObjects(list, false).length > 0) { hit = true; break; } }
        grid[iz * nx + ix] = hit ? 0 : 1;
      }
      for (const [m, side] of mats) m.side = side;
    }

    cellOk(x, z) {
      const ix = Math.floor((x - this.x0) / this.cell), iz = Math.floor((z - this.z0) / this.cell);
      return ix >= 0 && iz >= 0 && ix < this.nx && iz < this.nz && this.grid[iz * this.nx + ix] === 1;
    }
    /* 体の幅をとって、そこに立てるか（家具と壁だけを見る） */
    clear(x, z) {
      const r = RADIUS, d = r * 0.7071;
      return this.cellOk(x, z) && this.cellOk(x + r, z) && this.cellOk(x - r, z) && this.cellOk(x, z + r) && this.cellOk(x, z - r)
        && this.cellOk(x + d, z + d) && this.cellOk(x - d, z + d) && this.cellOk(x + d, z - d) && this.cellOk(x - d, z - d);
    }
    /* 人も含めて、そこに立てるか */
    free(x, z) {
      if (!this.clear(x, z)) return false;
      for (const p of this.dyn) { const dx = x - p.x, dz = z - p.z, rr = p.r + RADIUS; if (dx * dx + dz * dz < rr * rr) return false; }
      return true;
    }
    /* いまの場所から、そこへ一歩出られるか。人と重なっているときは、離れる向きにだけ動ける（人が来て、はさまれないように） */
    step(x, z, nx, nz) {
      if (!this.clear(nx, nz)) return false;
      const gate = this.w.gate;
      if (gate && !gate(nx, nz) && gate(x, z)) return false;         // いまは入れない所（赤信号の横断歩道）。もう中にいるなら、渡りきれる
      for (const p of this.dyn) {
        const rr = p.r + RADIUS, dn = (nx - p.x) * (nx - p.x) + (nz - p.z) * (nz - p.z);
        if (dn < rr * rr && dn <= (x - p.x) * (x - p.x) + (z - p.z) * (z - p.z)) return false;
      }
      return true;
    }
    /* 動かしてみる。壁に当たったら、壁ぞいにすべる。out に結果の x, z を入れる */
    move(x, z, dx, dz, out) {
      const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.05));     // 一度に大きく動くときは、細かく刻む（物を飛び越えないように）
      dx /= n; dz /= n;
      let moved = false;
      for (let i = 0; i < n; i++) {
        if (this.step(x, z, x + dx, z + dz)) { x += dx; z += dz; moved = true; }
        else if (dx && this.step(x, z, x + dx, z)) { x += dx; moved = true; }
        else if (dz && this.step(x, z, x, z + dz)) { z += dz; moved = true; }
        else break;
      }
      out.x = x; out.z = z; return moved;
    }
    /* いちばん近い、立てる場所 */
    nearest(x, z, maxR) {
      if (this.free(x, z)) return { x, z };
      const c = this.cell, n = Math.ceil((maxR || 6) / c);
      for (let k = 1; k <= n; k++) {
        let best = null, bd = Infinity;
        for (let a = 0; a < 16 + k * 4; a++) {
          const th = a / (16 + k * 4) * Math.PI * 2, px = x + Math.cos(th) * k * c, pz = z + Math.sin(th) * k * c;
          if (this.free(px, pz)) { const d = (px - x) * (px - x) + (pz - z) * (pz - z); if (d < bd) { bd = d; best = { x: px, z: pz }; } }
        }
        if (best) return best;
      }
      return null;
    }
    /* 立ち上がったときに立つ場所 */
    startNear(x, z) {
      const s = this.w.start;
      if (s) { const p = this.nearest(s[0], s[1], 2); if (p) return p; }
      return this.nearest(x, z, 8);
    }
    count() { let n = 0; for (let i = 0; i < this.grid.length; i++) n += this.grid[i]; return n; }
  }

  SI.Nav = Nav;
  SI.Nav.isFigure = isFigure;
})(window.SI);
