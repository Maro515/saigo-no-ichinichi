'use strict';
/* 最期の一日 — 共通の小道具 */
window.SI = window.SI || {};
(function (SI) {
  const U = SI.U = {};

  U.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smooth = (t) => { t = U.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  U.easeOut = (t) => 1 - Math.pow(1 - U.clamp(t, 0, 1), 3);
  U.easeIn = (t) => Math.pow(U.clamp(t, 0, 1), 3);
  U.deg = (d) => d * Math.PI / 180;
  U.damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

  /* 種つきの乱数（mulberry32） */
  U.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.hash = function (str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  U.pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  U.range = (r, a, b) => a + (b - a) * r();
  U.irange = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  U.shuffle = (r, arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };
  U.weighted = (r, pairs) => {
    let sum = 0; for (const p of pairs) sum += p[1];
    let x = r() * sum;
    for (const p of pairs) { x -= p[1]; if (x <= 0) return p[0]; }
    return pairs[pairs.length - 1][0];
  };

  /* 漢数字（0〜9999） */
  const KD = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  U.kanji = function (n) {
    n = Math.round(n);
    if (n === 0) return '零';
    let s = '';
    const th = Math.floor(n / 1000), h = Math.floor(n % 1000 / 100), t = Math.floor(n % 100 / 10), o = n % 10;
    if (th) s += (th > 1 ? KD[th] : '') + '千';
    if (h) s += (h > 1 ? KD[h] : '') + '百';
    if (t) s += (t > 1 ? KD[t] : '') + '十';
    if (o) s += KD[o];
    return s;
  };
  U.timeToMin = (t) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3), 10);
  U.timeToHour = (t) => U.timeToMin(t) / 60;
  U.timeJa = function (t) {
    const m = U.timeToMin(t), h = Math.floor(m / 60), mm = m % 60;
    const ap = h < 12 ? '午前' : '午後';
    const h12 = h % 12;
    return ap + h12 + '時' + (mm ? mm + '分' : '');                  // 時刻は算用数字で（2026-11-22 ユーザーの指示）
  };
  /* 縦書きの中の数字を、縦中横にする（2 けたまでを 1 文字ぶんに立てる）。HTML として返す */
  U.tcy = function (text) {
    const esc = String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    return esc.replace(/\d+/g, (d) => d.length <= 2 ? '<span class="tcy">' + d + '</span>' : d);
  };
  U.minToTime = (m) => {
    m = ((Math.round(m) % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  };

  /* 文を「。」で分ける。かぎかっこの中の「。」では切らない */
  U.sentences = function (text) {
    const out = [];
    let cur = '', depth = 0;
    for (const ch of text) {
      cur += ch;
      if (ch === '「' || ch === '（') depth++;
      else if (ch === '」' || ch === '）') depth = Math.max(0, depth - 1);
      if ((ch === '。' || ch === '？' || ch === '！') && depth === 0) { out.push(cur); cur = ''; }
    }
    if (cur.trim()) out.push(cur);
    return out.map(s => s.trim()).filter(Boolean);
  };

  U.wait = (ms) => new Promise(res => setTimeout(res, ms));

  /* 途中でやめられる待ち。token.cancel() で、待っているものがすべて止まる */
  class Token {
    constructor() { this.aborted = false; this.pending = new Set(); }
    cancel() { this.aborted = true; for (const p of this.pending) p(); this.pending.clear(); }
    check() { if (this.aborted) throw new Error('abort'); }
  }
  U.Token = Token;
  /* 画面が見えているあいだだけ進む時計。別のタブに移っているあいだは止まる */
  U.speed = 1;                                   // 試験のときだけ上げる（待ち時間を縮める）
  U.visibleTimer = function (ms, done) {
    ms /= U.speed;
    if (ms < 1 && U.speed > 1) { let dead = false; Promise.resolve().then(() => { if (!dead) done(); }); return () => { dead = true; }; }
    let left = ms, last = performance.now();
    const iv = setInterval(() => {
      const now = performance.now();
      if (!document.hidden) left -= Math.min(now - last, 250);
      last = now;
      if (left <= 0) { clearInterval(iv); done(); }
    }, ms < 120 ? 10 : 40);
    return () => clearInterval(iv);
  };
  U.sleep = (ms, token) => new Promise((res, rej) => {
    if (token && token.aborted) return rej(new Error('abort'));
    let stop;
    const cancel = U.visibleTimer(ms, () => { if (token) token.pending.delete(stop); res(); });
    stop = () => { cancel(); rej(new Error('abort')); };
    if (token) token.pending.add(stop);
  });
  U.el = (id) => document.getElementById(id);
  U.store = {
    get(key, def) { try { const v = localStorage.getItem(key); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 保存できなくても動かす */ } }
  };
})(window.SI);
