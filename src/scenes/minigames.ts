// Repair mini-games on a green PCB: one-stroke trace (soldering), colour flow,
// rotate-the-tiles. Full-screen overlay, like the reference.

import { type C, rrc, rr, text, button, shade, rng, dist, pill, hand, clamp } from '../core/draw';
import { view } from '../core/view';
import { sfx, haptic } from '../core/audio';
import { emit } from '../core/fx';
import { t } from '../core/i18n';
import type { PuzzleSpec } from '../content/story';
import { makeAsmrGame } from './asmr';

export interface MiniHost {
  money: () => number;
  price: number;
  title: string;
  tutorial: boolean;
  onWin: (bought: boolean) => void;
}

export interface Board { x: number; y: number; w: number; h: number }

export interface Game {
  sub: string;
  /** Overlay title, replacing the default "Fix the …". */
  title?: string;
  /** Board look: the green PCB (default), or a neutral work mat for hands-on jobs. */
  skin?: 'pcb' | 'mat';
  /** Called every frame (timers, physics, particles). */
  update?(dt: number, b: Board): void;
  progress(): number;
  draw(c: C, b: Board, time: number): void;
  down(x: number, y: number, b: Board): void;
  move(x: number, y: number, b: Board): void;
  up(x: number, y: number, b: Board): void;
  solved(): boolean;
  hint?(c: C, b: Board, time: number): void;
}

// ---------------- trace (one stroke) ----------------

const TRACE_LAYOUTS: { n: number[][]; e: number[][] }[] = [
  { n: [[0.22, 0.3], [0.78, 0.3], [0.78, 0.62], [0.22, 0.62]], e: [[0, 1], [1, 2], [2, 3], [3, 0]] },
  { n: [[0.2, 0.24], [0.8, 0.24], [0.5, 0.46], [0.2, 0.68], [0.8, 0.68]], e: [[0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4]] },
  { n: [[0.2, 0.72], [0.8, 0.72], [0.8, 0.42], [0.2, 0.42], [0.5, 0.16]], e: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3], [3, 4], [4, 2]] },
  {
    n: [[0.5, 0.14], [0.82, 0.3], [0.82, 0.62], [0.5, 0.78], [0.18, 0.62], [0.18, 0.3], [0.5, 0.46]],
    e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6], [6, 3]],
  },
];

function traceGame(layout: number, tutorial: boolean): Game {
  const L = TRACE_LAYOUTS[layout % TRACE_LAYOUTS.length];
  const used = new Set<number>();
  let cur = -1;
  let fx = 0, fy = 0;
  let down = false;
  let steps = 0;
  const deg = L.n.map((_, i) => L.e.filter((e) => e[0] === i || e[1] === i).length);
  const odd = deg.map((d, i) => (d % 2 ? i : -1)).filter((i) => i >= 0);
  const starts = odd.length ? odd : L.n.map((_, i) => i);
  let iron = { x: 0, y: 0, on: false };

  const pos = (i: number, b: Board) => ({ x: b.x + b.w * (0.1 + L.n[i][0] * 0.8), y: b.y + b.h * (0.06 + L.n[i][1] * 0.88) });
  const near = (x: number, y: number, b: Board) => {
    for (let i = 0; i < L.n.length; i++) { const p = pos(i, b); if (dist(x, y, p.x, p.y) < 30 * view.U) return i; }
    return -1;
  };
  const reset = () => { used.clear(); cur = -1; steps = 0; };

  return {
    get sub() { return t('traceSub'); },
    progress: () => used.size / L.e.length,
    solved: () => used.size === L.e.length,
    down(x, y, b) {
      if (used.size === L.e.length) return;
      const i = near(x, y, b);
      fx = x; fy = y; down = true;
      iron = { x, y, on: true };
      if (i < 0) return;
      if (!starts.includes(i)) { sfx.error(); haptic(30); return; }
      reset();
      cur = i;
      sfx.zap();
      emit('spark', pos(i, b).x, pos(i, b).y, 8, { color: ['#ffe28a', '#fff'], speed: 120, size: 5 });
    },
    move(x, y, b) {
      fx = x; fy = y;
      iron.x = x; iron.y = y;
      if (!down || cur < 0) return;
      const i = near(x, y, b);
      if (i < 0 || i === cur) return;
      const ei = L.e.findIndex((e, k) => !used.has(k) && ((e[0] === cur && e[1] === i) || (e[1] === cur && e[0] === i)));
      if (ei < 0) return;
      used.add(ei);
      cur = i;
      steps++;
      sfx.connect(steps * 2);
      haptic(10);
      const p = pos(i, b);
      emit('spark', p.x, p.y, 10, { color: ['#ffe28a', '#ffffff', '#ffb347'], speed: 140, size: 5 });
    },
    up() {
      down = false;
      iron.on = false;
      if (cur >= 0 && used.size < L.e.length) { sfx.error(); reset(); }
    },
    draw(c, b, time) {
      // edges
      L.e.forEach((e, k) => {
        const a = pos(e[0], b), z = pos(e[1], b);
        c.lineCap = 'round';
        if (used.has(k)) {
          c.strokeStyle = 'rgba(160,220,255,0.35)';
          c.lineWidth = 14 * view.U;
          c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(z.x, z.y); c.stroke();
          c.strokeStyle = '#f4f8ff';
          c.lineWidth = 6 * view.U;
          c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(z.x, z.y); c.stroke();
        } else {
          c.strokeStyle = '#c8873a';
          c.lineWidth = 4 * view.U;
          c.setLineDash([3 * view.U, 7 * view.U]);
          c.lineDashOffset = -time * 12;
          c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(z.x, z.y); c.stroke();
          c.setLineDash([]);
        }
      });
      // live wire to the finger
      if (down && cur >= 0) {
        const p = pos(cur, b);
        c.strokeStyle = 'rgba(255,255,255,0.5)';
        c.lineWidth = 3 * view.U;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(fx, fy); c.stroke();
      }
      // joints
      L.n.forEach((_, i) => {
        const p = pos(i, b);
        const r = 11 * view.U;
        const lit = i === cur || L.e.some((e, k) => used.has(k) && (e[0] === i || e[1] === i));
        c.fillStyle = lit ? '#dfe9f5' : '#b8682b';
        c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill();
        c.fillStyle = lit ? '#ffffff' : '#e7a564';
        c.beginPath(); c.arc(p.x, p.y, r * 0.65, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#5a2d10';
        c.beginPath(); c.arc(p.x, p.y, r * 0.28, 0, Math.PI * 2); c.fill();
        if (cur < 0 && starts.includes(i) && (tutorial || starts.length < L.n.length)) {
          const pulse = 0.5 + 0.5 * Math.sin(time * 5);
          c.strokeStyle = `rgba(255,230,120,${0.5 + pulse * 0.5})`;
          c.lineWidth = 2.5 * view.U;
          c.beginPath(); c.arc(p.x, p.y, r * (1.8 + pulse * 0.4), 0, Math.PI * 2); c.stroke();
        }
      });
      if (cur < 0 && tutorial) {
        const p = pos(starts[0], b);
        text(c, t('startHere'), p.x, p.y - 34 * view.U, 14 * view.U, '#ffe9a8', { font: 'bold' });
      }
      // soldering iron
      const ix = iron.on ? iron.x : b.x + b.w * 0.3, iy = iron.on ? iron.y : b.y + b.h - 18 * view.U;
      drawIron(c, ix, iy, iron.on ? -0.5 : -1.45, b);
    },
    hint(c, b, time) {
      if (cur >= 0) return;
      const p = pos(starts[0], b);
      hand(c, p.x + 4, p.y + 6 + Math.sin(time * 6) * 4, view.U * 1.1, 0);
    },
  };
}

function drawIron(c: C, x: number, y: number, ang: number, b: Board): void {
  const U = view.U;
  // cable
  c.strokeStyle = '#1e1f24';
  c.lineWidth = 4 * U;
  c.beginPath();
  const th = ang + Math.PI / 2;
  const ex = x - 146 * U * Math.sin(th), ey = y + 146 * U * Math.cos(th);
  c.moveTo(ex, ey);
  c.bezierCurveTo(ex + 40 * U, ey + 80 * U, b.x + b.w + 10, b.y + b.h - 40, b.x + b.w + 30, b.y + b.h + 30);
  c.stroke();
  c.save();
  c.translate(x, y);
  c.rotate(ang + Math.PI / 2);
  // tip
  c.fillStyle = '#c9ccd2';
  c.beginPath(); c.moveTo(0, 0); c.lineTo(-3 * U, 26 * U); c.lineTo(3 * U, 26 * U); c.closePath(); c.fill();
  c.fillStyle = '#8e939c';
  c.fillRect(-4 * U, 26 * U, 8 * U, 30 * U);
  // handle
  const g = c.createLinearGradient(-9 * U, 0, 9 * U, 0);
  g.addColorStop(0, '#a83f12'); g.addColorStop(0.4, '#ff7a33'); g.addColorStop(1, '#8a300a');
  c.fillStyle = g;
  c.beginPath(); rr(c, -9 * U, 56 * U, 18 * U, 90 * U, 8 * U); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 5; i++) c.fillRect(-9 * U, (66 + i * 8) * U, 18 * U, 2.5 * U);
  c.restore();
  // hot tip glow
  c.fillStyle = 'rgba(255,200,120,0.5)';
  c.beginPath(); c.arc(x, y, 6 * U, 0, Math.PI * 2); c.fill();
}

// ---------------- flow ----------------

const FLOW_GRIDS = [
  ['..Y.', 'RRY.', 'BRYB', 'BBBB'],
  ['RRRG', 'B.RG', 'BYYG', 'BB.G'],
  ['RRRRG', 'B..RG', 'BYY.G', 'B.YOG', 'BB.OO'],
  ['YYYRR', 'YB..R', '.BGGR', 'PB.G.', 'PPP..'],
];
const FLOW_COL: Record<string, string> = { R: '#e8424f', Y: '#f5c638', B: '#3b7ff0', G: '#3fc46a', O: '#ff8a2a', P: '#b45be8' };

function flowGame(gi: number): Game {
  const rows = FLOW_GRIDS[gi % FLOW_GRIDS.length];
  const n = rows.length;
  const ends: Record<string, [number, number][]> = {};
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < n && y < n ? rows[y][x] : '.');
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const ch = rows[y][x];
    if (ch === '.') continue;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => at(x + dx, y + dy) === ch).length;
    if (nb === 1) (ends[ch] ??= []).push([x, y]);
  }
  const colors = Object.keys(ends);
  const paths: Record<string, [number, number][]> = {};
  colors.forEach((k) => (paths[k] = []));
  let active: string | null = null;
  let flashT = 0;

  const isEnd = (x: number, y: number) => colors.find((k) => ends[k].some(([a, b]) => a === x && b === y)) ?? null;
  const complete = (k: string) => {
    const p = paths[k];
    if (p.length < 2) return false;
    const [a, z] = [p[0], p[p.length - 1]];
    const e = ends[k];
    const isE = (q: [number, number]) => e.some(([x, y]) => x === q[0] && y === q[1]);
    return isE(a) && isE(z) && (a[0] !== z[0] || a[1] !== z[1]);
  };
  const cellAt = (px: number, py: number, b: Board): [number, number] | null => {
    const g = grid(b);
    const x = Math.floor((px - g.x) / g.s), y = Math.floor((py - g.y) / g.s);
    return x >= 0 && y >= 0 && x < n && y < n ? [x, y] : null;
  };
  const grid = (b: Board) => {
    const s = Math.min((b.w - 30 * view.U) / n, (b.h - 30 * view.U) / n);
    return { s, x: b.x + (b.w - s * n) / 2, y: b.y + (b.h - s * n) / 2 };
  };
  const owner = (x: number, y: number) => colors.find((k) => paths[k].some(([a, b]) => a === x && b === y)) ?? null;

  return {
    get sub() { return t('flowSub'); },
    progress: () => colors.filter(complete).length / colors.length,
    solved: () => colors.every(complete),
    down(px, py, b) {
      const cell = cellAt(px, py, b);
      if (!cell) return;
      const [x, y] = cell;
      const e = isEnd(x, y);
      if (e) {
        active = e;
        paths[e] = [[x, y]];
        sfx.tap();
        return;
      }
      const o = owner(x, y);
      if (o) {
        const i = paths[o].findIndex(([a, b2]) => a === x && b2 === y);
        paths[o] = paths[o].slice(0, i + 1);
        active = o;
      }
    },
    move(px, py, b) {
      if (!active) return;
      const cell = cellAt(px, py, b);
      if (!cell) return;
      const [x, y] = cell;
      const p = paths[active];
      const last = p[p.length - 1];
      if (last[0] === x && last[1] === y) return;
      if (Math.abs(last[0] - x) + Math.abs(last[1] - y) !== 1) return;
      const inPath = p.findIndex(([a, b2]) => a === x && b2 === y);
      if (inPath >= 0) { paths[active] = p.slice(0, inPath + 1); return; }
      if (complete(active)) return;
      const e = isEnd(x, y);
      if (e && e !== active) return;
      const o = owner(x, y);
      if (o && o !== active) {
        const i = paths[o].findIndex(([a, b2]) => a === x && b2 === y);
        paths[o] = paths[o].slice(0, i);
      }
      p.push([x, y]);
      if (complete(active)) {
        sfx.connect(colors.filter(complete).length * 3 + 4);
        haptic(18);
        const g = grid(b);
        emit('spark', g.x + (x + 0.5) * g.s, g.y + (y + 0.5) * g.s, 12, { color: [FLOW_COL[active], '#fff'], speed: 150, size: 6 });
        flashT = 0.3;
      } else sfx.connect(p.length);
    },
    up() { active = null; },
    draw(c, b, time) {
      const g = grid(b);
      flashT = Math.max(0, flashT - 1 / 60);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        c.fillStyle = 'rgba(0,30,15,0.35)';
        c.beginPath(); rrc(c, g.x + (x + 0.5) * g.s, g.y + (y + 0.5) * g.s, g.s - 6, g.s - 6, 6); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.08)';
        c.beginPath(); c.arc(g.x + (x + 0.5) * g.s, g.y + (y + 0.5) * g.s, 1.5, 0, Math.PI * 2); c.fill();
      }
      for (const k of colors) {
        const p = paths[k];
        if (p.length < 2) continue;
        const col = FLOW_COL[k];
        const done = complete(k);
        c.lineCap = 'round'; c.lineJoin = 'round';
        const trace = () => {
          c.beginPath();
          p.forEach(([x, y], i) => {
            const cx = g.x + (x + 0.5) * g.s, cy = g.y + (y + 0.5) * g.s;
            if (i === 0) c.moveTo(cx, cy); else c.lineTo(cx, cy);
          });
        };
        if (done) {
          c.fillStyle = `${col}33`;
          p.forEach(([x, y]) => { c.beginPath(); rrc(c, g.x + (x + 0.5) * g.s, g.y + (y + 0.5) * g.s, g.s - 6, g.s - 6, 6); c.fill(); });
        }
        c.strokeStyle = col; c.globalAlpha = 0.35; c.lineWidth = g.s * 0.42; trace(); c.stroke();
        c.globalAlpha = 1; c.lineWidth = g.s * 0.24; trace(); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = g.s * 0.06;
        c.setLineDash([g.s * 0.12, g.s * 0.16]); c.lineDashOffset = -time * 30; trace(); c.stroke(); c.setLineDash([]);
      }
      for (const k of colors) for (const [x, y] of ends[k]) {
        const cx = g.x + (x + 0.5) * g.s, cy = g.y + (y + 0.5) * g.s, r = g.s * 0.3;
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.arc(cx - 1, cy + 3, r, 0, Math.PI * 2); c.fill();
        c.fillStyle = shade(FLOW_COL[k], -0.3); c.beginPath(); c.arc(cx, cy + 2, r, 0, Math.PI * 2); c.fill();
        const gg = c.createRadialGradient(cx - r * 0.3, cy - r * 0.4, 1, cx, cy, r);
        gg.addColorStop(0, shade(FLOW_COL[k], 0.45)); gg.addColorStop(1, FLOW_COL[k]);
        c.fillStyle = gg; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#f3e0a0'; c.lineWidth = 2; c.stroke();
      }
    },
    hint(c, b, time) {
      if (colors.some((k) => paths[k].length > 1)) return;
      const g = grid(b);
      const k = colors[0];
      const [a, z] = ends[k];
      const k2 = (time * 0.6) % 1;
      const x = g.x + (a[0] + 0.5 + (z[0] - a[0]) * k2) * g.s, y = g.y + (a[1] + 0.5 + (z[1] - a[1]) * k2) * g.s;
      hand(c, x, y, view.U * 1.1, 0);
    },
  };
}

// ---------------- rotate tiles ----------------

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N E S W -> bits 1 2 4 8

function rotateGame(size: number, seed: number): Game {
  const r = rng(seed * 7919 + size);
  const n = size;
  const sr = Math.floor(r() * n), tr = Math.floor(r() * n);
  // self-avoiding walk from (0,sr) to (n-1,tr)
  const seen = new Set<string>();
  const path: [number, number][] = [];
  const dfs = (x: number, y: number): boolean => {
    seen.add(`${x},${y}`);
    path.push([x, y]);
    if (x === n - 1 && y === tr) return true;
    const order = [0, 1, 2, 3].sort(() => r() - 0.5);
    for (const d of order) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (nx < 0 || ny < 0 || nx >= n || ny >= n || seen.has(`${nx},${ny}`)) continue;
      if (dfs(nx, ny)) return true;
    }
    path.pop();
    return false;
  };
  dfs(0, sr);
  const base: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const dirTo = (a: [number, number], b: [number, number]) => DIRS.findIndex(([dx, dy]) => a[0] + dx === b[0] && a[1] + dy === b[1]);
  path.forEach((p, i) => {
    let m = 0;
    if (i === 0) m |= 8; else m |= 1 << dirTo(p, path[i - 1]);
    if (i === path.length - 1) m |= 2; else m |= 1 << dirTo(p, path[i + 1]);
    base[p[1]][p[0]] = m;
  });
  const shapes = [5, 3, 7, 1]; // straight, corner, tee, end
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!base[y][x]) base[y][x] = shapes[Math.floor(r() * 3)];
  const rot: number[][] = base.map((row) => row.map(() => Math.floor(r() * 4)));
  const anim: number[][] = rot.map((row) => row.map((v) => v));
  // make sure it does not start solved
  rot[path[0][1]][path[0][0]] = (rot[path[0][1]][path[0][0]] + 1) % 4 || 1;
  anim[path[0][1]][path[0][0]] = rot[path[0][1]][path[0][0]];

  const mask = (x: number, y: number) => {
    const m = base[y][x], k = rot[y][x] % 4;
    return ((m << k) | (m >> (4 - k))) & 15;
  };
  let powered = new Set<string>();
  const flood = () => {
    powered = new Set();
    if (!(mask(0, sr) & 8)) return;
    const q: [number, number][] = [[0, sr]];
    powered.add(`0,${sr}`);
    while (q.length) {
      const [x, y] = q.shift()!;
      const m = mask(x, y);
      for (let d = 0; d < 4; d++) {
        if (!(m & (1 << d))) continue;
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
        if (!(mask(nx, ny) & (1 << ((d + 2) % 4)))) continue;
        const key = `${nx},${ny}`;
        if (!powered.has(key)) { powered.add(key); q.push([nx, ny]); }
      }
    }
  };
  flood();
  const lit = () => powered.has(`${n - 1},${tr}`) && !!(mask(n - 1, tr) & 2);
  const grid = (b: Board) => {
    const s = Math.min((b.w - 70 * view.U) / n, (b.h - 30 * view.U) / n);
    return { s, x: b.x + (b.w - s * n) / 2, y: b.y + (b.h - s * n) / 2 };
  };

  return {
    get sub() { return t('rotSub'); },
    progress: () => {
      let k = 0;
      for (const p of path) if (powered.has(`${p[0]},${p[1]}`)) k++;
      return lit() ? 1 : Math.min(0.95, k / path.length);
    },
    solved: lit,
    down(px, py, b) {
      if (lit()) return;
      const g = grid(b);
      const x = Math.floor((px - g.x) / g.s), y = Math.floor((py - g.y) / g.s);
      if (x < 0 || y < 0 || x >= n || y >= n) return;
      rot[y][x] = rot[y][x] + 1;
      sfx.rotate();
      haptic(8);
      const before = powered.size;
      flood();
      if (powered.size > before) sfx.connect(powered.size);
      if (lit()) {
        sfx.zap();
        const e = grid(b);
        emit('spark', e.x + n * e.s + 18 * view.U, e.y + (tr + 0.5) * e.s, 20, { color: ['#fff6a8', '#ffd84a', '#fff'], speed: 200, size: 7 });
      }
    },
    move() { /* tap only */ },
    up() { /* tap only */ },
    draw(c, b, time) {
      const g = grid(b);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        anim[y][x] += (rot[y][x] - anim[y][x]) * 0.3;
        const cx = g.x + (x + 0.5) * g.s, cy = g.y + (y + 0.5) * g.s;
        const on = powered.has(`${x},${y}`);
        c.fillStyle = 'rgba(0,30,15,0.4)';
        c.beginPath(); rrc(c, cx, cy, g.s - 5, g.s - 5, 7); c.fill();
        c.save();
        c.translate(cx, cy);
        c.rotate(anim[y][x] * Math.PI / 2);
        const m = base[y][x];
        c.lineCap = 'round';
        for (let d = 0; d < 4; d++) {
          if (!(m & (1 << d))) continue;
          const ex = DIRS[d][0] * g.s / 2, ey = DIRS[d][1] * g.s / 2;
          if (on) {
            c.strokeStyle = 'rgba(255,230,120,0.4)'; c.lineWidth = g.s * 0.3;
            c.beginPath(); c.moveTo(0, 0); c.lineTo(ex, ey); c.stroke();
          }
          c.strokeStyle = on ? '#ffe680' : '#c8873a';
          c.lineWidth = g.s * 0.14;
          c.beginPath(); c.moveTo(0, 0); c.lineTo(ex, ey); c.stroke();
        }
        c.fillStyle = on ? '#fff3b0' : '#e7a564';
        c.beginPath(); c.arc(0, 0, g.s * 0.12, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      // battery (source) on the left
      const by = g.y + (sr + 0.5) * g.s;
      c.fillStyle = '#2b2d33';
      c.beginPath(); rrc(c, g.x - 22 * view.U, by, 26 * view.U, 40 * view.U, 5); c.fill();
      c.fillStyle = '#ffb33a';
      c.beginPath(); rrc(c, g.x - 22 * view.U, by + 6 * view.U, 20 * view.U, 22 * view.U, 3); c.fill();
      text(c, '+', g.x - 22 * view.U, by - 12 * view.U, 14 * view.U, '#fff', { font: 'bold' });
      // bulb on the right
      const lx = g.x + n * g.s + 22 * view.U, ly = g.y + (tr + 0.5) * g.s;
      const on = lit();
      if (on) {
        const gg = c.createRadialGradient(lx, ly, 2, lx, ly, 46 * view.U);
        gg.addColorStop(0, 'rgba(255,240,160,0.9)'); gg.addColorStop(1, 'rgba(255,240,160,0)');
        c.fillStyle = gg; c.beginPath(); c.arc(lx, ly, 46 * view.U, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = on ? '#fff6b0' : 'rgba(220,230,240,0.35)';
      c.beginPath(); c.arc(lx, ly - 4 * view.U, 14 * view.U, 0, Math.PI * 2); c.fill();
      c.strokeStyle = on ? '#ffd84a' : '#9aa1a8'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#9aa1a8';
      c.fillRect(lx - 7 * view.U, ly + 9 * view.U, 14 * view.U, 9 * view.U);
      void time;
    },
    hint(c, b, time) {
      const g = grid(b);
      // point at the first path tile that is not powered
      const p = path.find((q) => !powered.has(`${q[0]},${q[1]}`));
      if (!p) return;
      hand(c, g.x + (p[0] + 0.55) * g.s, g.y + (p[1] + 0.6) * g.s, view.U * 1.0, (time * 2) % 1 < 0.2 ? 1 : 0);
    },
  };
}

// ---------------- host ----------------

export class Minigame {
  game: Game;
  host: MiniHost;
  time = 0;
  idle = 0;
  open = 0;
  winT = -1;
  closing = false;
  btnDown = false;

  constructor(spec: PuzzleSpec, host: MiniHost) {
    this.host = host;
    this.game = spec.kind === 'trace' ? traceGame(spec.layout, host.tutorial)
      : spec.kind === 'flow' ? flowGame(spec.grid)
      : spec.kind === 'rotate' ? rotateGame(spec.size, spec.seed)
      : makeAsmrGame(spec, host.tutorial);
  }

  board(): Board {
    const { W, H, U } = view;
    const w = Math.min(W - 32 * U, 380 * U);
    const h = Math.min(H * 0.56, w * 1.3);
    return { x: (W - w) / 2, y: Math.max(view.top + 110 * U, H * 0.5 - h / 2 - 20 * U), w, h };
  }

  btn() {
    const { W, H, U } = view;
    const b = this.board();
    return { x: W / 2, y: Math.min(H - 70 * U, b.y + b.h + 56 * U), w: 230 * U, h: 50 * U };
  }

  update(dt: number): void {
    this.time += dt;
    this.idle += dt;
    this.open = Math.min(1, this.open + dt * 4);
    this.game.update?.(dt, this.board());
    if (this.winT < 0 && this.game.solved()) {
      this.winT = 0;
      sfx.success();
      haptic(40);
      const b = this.board();
      for (let i = 0; i < 4; i++) emit('spark', b.x + b.w * (0.2 + i * 0.2), b.y + b.h * 0.5, 8, { color: ['#fff', '#c8f7a0', '#ffe28a'], speed: 220, size: 7 });
    }
    if (this.winT >= 0) {
      this.winT += dt;
      if (this.winT > 0.9 && !this.closing) { this.closing = true; this.host.onWin(false); }
    }
  }

  draw(c: C): void {
    const { W, H, U } = view;
    const a = this.open;
    c.save();
    c.globalAlpha = a;
    c.fillStyle = '#121518';
    c.fillRect(0, 0, W, H);
    const top = view.top + 36 * U;
    text(c, this.game.title ?? this.host.title, 18 * U, top, 20 * U, '#f4f1ea', { font: 'bold', align: 'left' });
    text(c, this.game.sub, W / 2, top + 30 * U, 15 * U, '#c9c4b8');
    // progress bar
    const pw = W * 0.6;
    c.fillStyle = '#2a2e33';
    c.beginPath(); rrc(c, W / 2, top + 52 * U, pw, 7 * U, 4 * U); c.fill();
    c.fillStyle = '#e5a34a';
    const pk = clamp(this.game.progress(), 0, 1);
    if (pk > 0) { c.beginPath(); rr(c, W / 2 - pw / 2, top + 52 * U - 3.5 * U, pw * pk, 7 * U, 4 * U); c.fill(); }

    const b = this.board();
    c.save();
    c.translate(0, (1 - a) * 40 * U);
    // board frame
    c.fillStyle = '#9aa3ad';
    c.beginPath(); rrc(c, b.x + b.w / 2, b.y + b.h / 2, b.w + 12 * U, b.h + 12 * U, 18 * U); c.fill();
    if (this.game.skin === 'mat') {
      // hands-on jobs sit on a dark rubber work mat with a faint grid
      const g = c.createLinearGradient(0, b.y, 0, b.y + b.h);
      g.addColorStop(0, '#3a4250'); g.addColorStop(1, '#2a303b');
      c.fillStyle = g;
      c.beginPath(); rrc(c, b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, 14 * U); c.fill();
      c.save();
      c.beginPath(); rrc(c, b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, 14 * U); c.clip();
      c.strokeStyle = 'rgba(255,255,255,0.05)';
      c.lineWidth = 1;
      for (let x = b.x + 16 * U; x < b.x + b.w; x += 24 * U) { c.beginPath(); c.moveTo(x, b.y); c.lineTo(x, b.y + b.h); c.stroke(); }
      for (let y = b.y + 16 * U; y < b.y + b.h; y += 24 * U) { c.beginPath(); c.moveTo(b.x, y); c.lineTo(b.x + b.w, y); c.stroke(); }
      c.restore();
    } else {
      const g = c.createLinearGradient(0, b.y, 0, b.y + b.h);
      g.addColorStop(0, '#2c7b4c'); g.addColorStop(1, '#1d5c37');
      c.fillStyle = g;
      c.beginPath(); rrc(c, b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, 14 * U); c.fill();
      // silk-screen decoration
      c.strokeStyle = 'rgba(200,255,200,0.12)';
      c.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        c.beginPath();
        c.moveTo(b.x + 10, b.y + 20 + i * b.h / 8);
        c.lineTo(b.x + 30 + (i % 3) * 10, b.y + 20 + i * b.h / 8);
        c.lineTo(b.x + 30 + (i % 3) * 10, b.y + 40 + i * b.h / 8);
        c.stroke();
      }
      for (const [x, y] of [[b.x + 12, b.y + 12], [b.x + b.w - 12, b.y + 12], [b.x + 12, b.y + b.h - 12], [b.x + b.w - 12, b.y + b.h - 12]]) {
        c.fillStyle = '#d9b15a'; c.beginPath(); c.arc(x, y, 5 * U, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#1d3a28'; c.beginPath(); c.arc(x, y, 2.4 * U, 0, Math.PI * 2); c.fill();
      }
      text(c, 'REV 1.3', b.x + b.w - 34 * U, b.y + b.h - 14 * U, 9 * U, 'rgba(220,255,220,0.3)', { font: 'bold' });
    }
    this.game.draw(c, b, this.time);
    if (this.winT >= 0) {
      c.fillStyle = `rgba(255,255,255,${Math.max(0, 0.35 - this.winT * 0.5)})`;
      c.beginPath(); rrc(c, b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, 14 * U); c.fill();
      pill(c, W / 2, b.y + b.h / 2, t('repaired'), 18 * U, Math.min(1, this.winT * 4));
    } else if (this.idle > (this.host.tutorial ? 1.2 : 5)) {
      this.game.hint?.(c, b, this.time);
    }
    c.restore();

    if (this.winT < 0) {
      const bt = this.btn();
      const can = this.host.money() >= this.host.price;
      button(c, bt.x, bt.y, bt.w, bt.h, t('buyPart', this.host.price), '#7ccf3c', this.btnDown, 17 * U, !can);
      text(c, t('youHave', this.host.money()), W / 2, bt.y + bt.h / 2 + 18 * U, 13 * U, '#d8d4ca', { font: 'bold' });
    }
    c.restore();
    void H;
  }

  down(x: number, y: number): void {
    this.idle = 0;
    if (this.winT >= 0) return;
    const bt = this.btn();
    if (Math.abs(x - bt.x) < bt.w / 2 && Math.abs(y - bt.y) < bt.h / 2 + 4) {
      if (this.host.money() >= this.host.price) { this.btnDown = true; sfx.tap(); }
      else sfx.error();
      return;
    }
    this.game.down(x, y, this.board());
  }

  move(x: number, y: number): void {
    if (this.winT >= 0) return;
    this.idle = 0;
    this.game.move(x, y, this.board());
  }

  up(x: number, y: number): void {
    if (this.btnDown) {
      this.btnDown = false;
      const bt = this.btn();
      if (Math.abs(x - bt.x) < bt.w / 2 && Math.abs(y - bt.y) < bt.h / 2 + 8 && !this.closing) {
        this.closing = true;
        sfx.cash();
        this.host.onWin(true);
      }
      return;
    }
    if (this.winT >= 0) return;
    this.game.up(x, y, this.board());
  }
}
