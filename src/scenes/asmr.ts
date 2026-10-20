// Hands-on repair mechanics: ASMR, wiring, antistress. Each one is a Game for
// the Minigame overlay (see minigames.ts), chosen by the level's PuzzleSpec.
// Everything is laid out relative to the board rect and scaled by view.U.

import type { AsmrSpec } from '../content/story';
import type { Game, Board } from './minigames';
import { type C, rrc, rr, text, shade, rgba, mix, rng, dist, clamp, hand, pill, sparkleShape } from '../core/draw';
import { view } from '../core/view';
import { sfx, haptic } from '../core/audio';
import { emit } from '../core/fx';
import { lang } from '../core/i18n';

const TAU = Math.PI * 2;
const tx = (en: string, vi: string): string => (lang === 'vi' ? vi : en);
const easeOut = (k: number): number => 1 - (1 - k) * (1 - k);
const wrapAng = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
/** `col` (#rrggbb) darkened by k, still as hex so rgba() can take it. */
const darker = (col: string, k: number): string => {
  const h = col.length === 4 ? col.slice(1).replace(/./g, '$&$&') : col.slice(1);
  const n = parseInt(h, 16);
  const f = (v: number) => Math.round(v * (1 - k)).toString(16).padStart(2, '0');
  return `#${f((n >> 16) & 255)}${f((n >> 8) & 255)}${f(n & 255)}`;
};
const hex = (s: string, fb: string): string => (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(s) ? s : fb);

function shuffle<T>(a: T[], r: () => number): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** An offscreen layer painted once and repainted only when its key (usually the board size) changes. */
function layer(): (key: string, w: number, h: number, paint: (c: C) => void) => HTMLCanvasElement {
  let cv: HTMLCanvasElement | null = null;
  let k = '';
  return (key, w, h, paint) => {
    key += `@${view.dpr}`;
    if (cv && k === key) return cv;
    cv ??= document.createElement('canvas');
    const d = view.dpr;
    cv.width = Math.max(1, Math.ceil(w * d));
    cv.height = Math.max(1, Math.ceil(h * d));
    const c = cv.getContext('2d')!;
    c.setTransform(d, 0, 0, d, 0, 0);
    paint(c);
    k = key;
    return cv;
  };
}

export function makeAsmrGame(spec: AsmrSpec, tutorial: boolean): Game {
  switch (spec.kind) {
    case 'solder': return solderGame(spec.pads, spec.seed, tutorial);
    case 'wire': return wireGame(spec.wires, spec.seed, tutorial);
    case 'popit': return popitGame(spec.cols, spec.rows, spec.color);
    case 'peel': return peelGame(spec.shape, spec.color, tutorial);
    case 'blow': return blowGame(spec.dust, spec.seed, spec.look ?? 'fan');
    case 'slime': return slimeGame(spec.crumbs, spec.seed, spec.color);
    case 'wind': return windGame(spec.turns, spec.look ?? 'tape', tutorial);
  }
}

// ---------------- solder ----------------

interface Pad { u: number; v: number; fill: number; done: boolean; shine: number; leg: number; square: boolean }

function solderGame(pads: number, seed: number, tutorial: boolean): Game {
  const r = rng(seed * 131 + pads);
  const n = clamp(Math.round(pads), 1, 12);
  // a jittered 3x4 grid keeps the pads apart
  const cells = shuffle(Array.from({ length: 12 }, (_, i) => i), r).slice(0, n).sort((a, z) => a - z);
  const P: Pad[] = cells.map((i, k) => ({
    u: 0.2 + (i % 3) * 0.3 + (r() - 0.5) * 0.1,
    v: 0.14 + Math.floor(i / 3) * 0.2 + (r() - 0.5) * 0.06,
    fill: 0, done: false, shine: 0, leg: r() * TAU, square: k % 3 === 0,
  }));
  // copper traces between neighbours, components drawn on the silk-screen
  const traces: [number, number][] = [];
  for (let i = 0; i + 1 < n; i++) if (r() < 0.75) traces.push([i, i + 1]);
  const parts = traces.filter(([a, z]) => Math.abs(P[a].v - P[z].v) < 0.08).map(([a, z], k) => ({ a, z, label: `${k % 2 ? 'C' : 'R'}${k + 1}` }));

  let held = false;
  let tipX = 0, tipY = 0;
  let active = -1;
  let sizT = 0, smokeT = 0, buzz = 0;

  const pos = (p: Pad, b: Board) => ({ x: b.x + b.w * p.u, y: b.y + b.h * p.v });
  const R = () => 15 * view.U;
  const padAt = (x: number, y: number, b: Board) => {
    let best = -1, bd = 22 * view.U;
    P.forEach((p, i) => {
      if (p.done) return;
      const q = pos(p, b), d = dist(x, y, q.x, q.y);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  };
  const aim = (x: number, y: number) => { tipX = x - 26 * view.U; tipY = y - 58 * view.U; };
  const filled = () => P.reduce((s, p) => s + p.fill, 0);

  return {
    get title() { return tx('Solder the joints', 'Hàn mối hàn'); },
    get sub() { return tx('Hold the iron on each pad until it fills', 'Giữ mỏ hàn trên từng chân cho đến khi đầy thiếc'); },
    skin: 'pcb',
    progress: () => filled() / n,
    solved: () => P.every((p) => p.done),
    update(dt, b) {
      dt = Math.min(dt, 0.05);
      for (const p of P) p.shine = Math.max(0, p.shine - dt * 1.2);
      sizT -= dt; smokeT -= dt;
      active = held ? padAt(tipX, tipY, b) : -1;
      if (active < 0) return;
      const p = P[active];
      const q = pos(p, b);
      p.fill = Math.min(1, p.fill + dt / 0.75);
      if (sizT <= 0) {
        sizT = 0.1;
        sfx.sizzle();
        if (++buzz % 2) haptic(5);
      }
      if (smokeT <= 0) {
        smokeT = 0.07;
        emit('steam', q.x + (Math.random() - 0.5) * 6, q.y - 6 * view.U, 1, { color: '#f4f1ea', speed: 34, spread: 0.8, size: 5 * view.U, life: 1.2, g: -30 });
      }
      if (Math.random() < dt * 6) emit('spark', q.x, q.y, 1, { color: ['#ffe28a', '#fff'], speed: 90, size: 3, life: 0.3 });
      if (p.fill >= 1) {
        p.done = true;
        p.shine = 1;
        sfx.clink();
        haptic(16);
        emit('spark', q.x, q.y - 4, 8, { color: ['#ffffff', '#e8f1ff', '#fff3c4'], speed: 110, size: 5 });
        emit('ring', q.x, q.y, 1, { color: '#ffffff', size: R(), speed: 0, life: 0.45 });
      }
    },
    down(x, y) { held = true; aim(x, y); },
    move(x, y) { if (held) aim(x, y); },
    up() { held = false; },
    draw(c, b, time) {
      const U = view.U, Rp = R();
      c.save();
      c.lineCap = 'round'; c.lineJoin = 'round';
      // traces under the solder mask
      for (const [a, z] of traces) {
        const p = pos(P[a], b), q = pos(P[z], b);
        c.strokeStyle = 'rgba(140,230,150,0.28)';
        c.lineWidth = 6 * U;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, p.y); c.lineTo(q.x, q.y); c.stroke();
      }
      // silk-screen outlines
      c.strokeStyle = 'rgba(235,255,235,0.55)';
      c.lineWidth = 1.5 * U;
      for (const pt of parts) {
        const p = pos(P[pt.a], b), q = pos(P[pt.z], b);
        const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
        c.beginPath(); rrc(c, mx, my, Math.abs(q.x - p.x) - Rp * 3, 16 * U, 4 * U); c.stroke();
        text(c, pt.label, mx, my - 18 * U, 10 * U, 'rgba(235,255,235,0.6)', { font: 'bold' });
      }
      c.restore();

      P.forEach((p, i) => {
        const { x, y } = pos(p, b);
        // gold pad
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.beginPath(); c.arc(x + 1, y + 2, Rp, 0, TAU); c.fill();
        const g = c.createRadialGradient(x - Rp * 0.4, y - Rp * 0.5, 1, x, y, Rp);
        g.addColorStop(0, '#fff1b8'); g.addColorStop(0.5, '#e2b24c'); g.addColorStop(1, '#a8761e');
        c.fillStyle = g;
        c.beginPath();
        if (p.square) rrc(c, x, y, Rp * 2, Rp * 2, 3 * U); else c.arc(x, y, Rp, 0, TAU);
        c.fill();
        // through-hole and the clipped component leg
        c.fillStyle = '#2a1a08';
        c.beginPath(); c.arc(x, y, Rp * 0.42, 0, TAU); c.fill();
        const lx = x + Math.cos(p.leg) * 6 * U, ly = y + Math.sin(p.leg) * 3 * U - 5 * U;
        c.strokeStyle = '#7d848e'; c.lineWidth = 3.4 * U; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x, y); c.lineTo(lx, ly); c.stroke();
        c.strokeStyle = '#e4e9ef'; c.lineWidth = 1.4 * U;
        c.beginPath(); c.moveTo(x - 0.6 * U, y - 0.6 * U); c.lineTo(lx - 0.6 * U, ly - 0.6 * U); c.stroke();
        // solder: a molten bead that grows, then a glossy cone
        if (p.fill > 0) {
          const hot = i === active;
          const wob = hot ? Math.sin(time * 40) * 0.04 : 0;
          const br = Rp * (0.4 + 0.62 * easeOut(p.fill)) * (1 + wob);
          c.fillStyle = 'rgba(0,0,0,0.28)';
          c.beginPath(); c.arc(x + 1, y + 2.5 * U, br, 0, TAU); c.fill();
          const sg = c.createRadialGradient(x - br * 0.35, y - br * 0.45, br * 0.05, x, y, br);
          sg.addColorStop(0, '#ffffff');
          sg.addColorStop(0.25, p.done ? '#e6ebf0' : '#f1e6d8');
          sg.addColorStop(0.8, p.done ? '#8d96a1' : '#a7a19a');
          sg.addColorStop(1, '#5d646e');
          c.fillStyle = sg;
          c.beginPath(); c.arc(x, y, br, 0, TAU); c.fill();
          if (p.done) {
            // the cone: a soft slope ring and the leg poking out of the top
            c.strokeStyle = 'rgba(70,78,90,0.35)'; c.lineWidth = br * 0.22;
            c.beginPath(); c.arc(x + br * 0.06, y + br * 0.08, br * 0.55, 0, TAU); c.stroke();
            c.fillStyle = '#b9c0c8';
            c.beginPath(); c.arc(x, y, br * 0.24, 0, TAU); c.fill();
            c.fillStyle = '#ffffff';
            c.beginPath(); c.arc(x - br * 0.06, y - br * 0.08, br * 0.1, 0, TAU); c.fill();
          }
          c.fillStyle = 'rgba(255,255,255,0.85)';
          c.beginPath(); c.ellipse(x - br * 0.38, y - br * 0.42, br * 0.26, br * 0.13, -0.6, 0, TAU); c.fill();
          if (hot) {
            c.fillStyle = `rgba(255,170,60,${0.18 + 0.08 * Math.sin(time * 30)})`;
            c.beginPath(); c.arc(x, y, br * 1.05, 0, TAU); c.fill();
          }
          if (p.shine > 0) {
            const k = p.shine;
            c.save();
            c.globalAlpha = Math.min(1, k * 2);
            sparkleShape(c, x - br * 0.4, y - br * 0.5, (4 + 9 * Math.sin(k * Math.PI)) * U, '#ffffff');
            c.restore();
          }
        }
      });
      // where to go next (first time)
      const next = P.find((p) => !p.done);
      if (tutorial && next && active < 0) {
        const q = pos(next, b);
        const k = 0.5 + 0.5 * Math.sin(time * 5);
        c.strokeStyle = `rgba(255,236,150,${0.45 + k * 0.5})`;
        c.lineWidth = 2.5 * U;
        c.beginPath(); c.arc(q.x, q.y, Rp * (1.7 + k * 0.35), 0, TAU); c.stroke();
      }
      if (held) drawSolderIron(c, tipX, tipY, 1.1, active >= 0, b, time);
      else drawSolderIron(c, b.x + b.w * 0.56, b.y + b.h * 0.93, 0.12, false, b, time);
    },
    hint(c, b, time) {
      const p = P.find((q) => !q.done);
      if (!p || held) return;
      const q = pos(p, b);
      const press = (time * 1.2) % 1 < 0.6 ? 1 : 0;
      hand(c, q.x + 26 * view.U, q.y + 58 * view.U, view.U * 1.1, press);
      pill(c, q.x, q.y - 36 * view.U, tx('Hold', 'Giữ'), 13 * view.U, 0.9);
    },
  };
}

/** Pen-style iron: tip at (x, y), the handle running off along `ang`. */
function drawSolderIron(c: C, x: number, y: number, ang: number, hot: boolean, b: Board, time: number): void {
  const U = view.U;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const ex = x + dx * 150 * U, ey = y + dy * 150 * U;
  c.save();
  // cable
  c.strokeStyle = '#1e1f24';
  c.lineWidth = 4.5 * U;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(ex, ey);
  c.bezierCurveTo(ex + dx * 50 * U, ey + dy * 50 * U, b.x + b.w + 10 * U, b.y + b.h - 20 * U, b.x + b.w + 40 * U, b.y + b.h + 40 * U);
  c.stroke();
  // soft shadow on the board
  c.strokeStyle = 'rgba(0,0,0,0.22)';
  c.lineWidth = 14 * U;
  c.beginPath(); c.moveTo(x + 10 * U, y + 14 * U); c.lineTo(ex + 10 * U, ey + 14 * U); c.stroke();
  c.translate(x, y);
  c.rotate(ang - Math.PI / 2);
  // tip and shaft
  c.fillStyle = hot ? '#e7c9a0' : '#c9ccd2';
  c.beginPath(); c.moveTo(0, 0); c.lineTo(-3.2 * U, 24 * U); c.lineTo(3.2 * U, 24 * U); c.closePath(); c.fill();
  const sg = c.createLinearGradient(-4 * U, 0, 4 * U, 0);
  sg.addColorStop(0, '#6f747c'); sg.addColorStop(0.45, '#e5e8ec'); sg.addColorStop(1, '#7c818a');
  c.fillStyle = sg;
  c.fillRect(-4 * U, 24 * U, 8 * U, 34 * U);
  // grip
  const g = c.createLinearGradient(-10 * U, 0, 10 * U, 0);
  g.addColorStop(0, '#a83f12'); g.addColorStop(0.4, '#ff7a33'); g.addColorStop(1, '#8a300a');
  c.fillStyle = g;
  c.beginPath(); rr(c, -10 * U, 56 * U, 20 * U, 94 * U, 9 * U); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.22)';
  for (let i = 0; i < 6; i++) c.fillRect(-10 * U, (66 + i * 8) * U, 20 * U, 2.5 * U);
  c.fillStyle = 'rgba(255,255,255,0.3)';
  c.fillRect(-5 * U, 60 * U, 2.5 * U, 84 * U);
  c.restore();
  // hot tip glow
  const k = hot ? 0.75 + 0.25 * Math.sin(time * 25) : 0.45;
  const gg = c.createRadialGradient(x, y, 0, x, y, 9 * U);
  gg.addColorStop(0, `rgba(255,210,130,${k})`); gg.addColorStop(1, 'rgba(255,160,60,0)');
  c.fillStyle = gg;
  c.beginPath(); c.arc(x, y, 9 * U, 0, TAU); c.fill();
}

// ---------------- wire ----------------

const WIRE_COLS = [
  { c: '#e8424f' },
  { c: '#34353c' },
  { c: '#3b7ff0' },
  { c: '#3fae4a', stripe: '#f5c638' }, // earth: green / yellow
];

interface Wire { ex: number; ey: number; vx: number; vy: number; seated: boolean; turns: number; ang: number; angT: number; led: number }

function wireGame(wires: number, seed: number, tutorial: boolean): Game {
  const r = rng(seed * 977 + wires);
  const n = clamp(Math.round(wires), 1, WIRE_COLS.length);
  const TURNS = 3;
  // slot[i] = which terminal wire i belongs to; never in the trivial top-to-bottom order
  const slot = shuffle(Array.from({ length: n }, (_, i) => i), r);
  if (n > 1 && slot.every((s, i) => s === i)) slot.push(slot.shift()!);
  const W: Wire[] = Array.from({ length: n }, () => ({ ex: NaN, ey: 0, vx: 0, vy: 0, seated: false, turns: 0, ang: 0.4, angT: 0.4, led: 0 }));
  const shake = new Array<number>(n).fill(0);
  let grab = -1, offX = 0, offY = 0;
  let over = -1;
  let clock = 0;

  const rowY = (i: number, b: Board) => b.y + b.h * (0.2 + (i + 0.5) * 0.62 / n);
  const anchor = (i: number, b: Board) => ({ x: b.x + 26 * view.U, y: rowY(i, b) });
  const rest = (i: number, b: Board) => ({ x: b.x + b.w * 0.34, y: rowY(i, b) + b.h * 0.05 + Math.sin(clock * 1.4 + i * 1.7) * 2 * view.U });
  const block = (b: Board) => {
    const x0 = b.x + b.w * 0.64, x1 = b.x + b.w * 0.92;
    const cell = Math.min(74 * view.U, b.h * 0.62 / n);
    return { x0, x1, cell, y0: rowY(0, b) - cell / 2, y1: rowY(n - 1, b) + cell / 2 };
  };
  const term = (j: number, b: Board) => {
    const k = block(b);
    const sx = shake[j] > 0 ? Math.sin(clock * 70) * 5 * view.U * shake[j] : 0;
    const y = rowY(j, b);
    return { y, entry: k.x0 + 10 * view.U + sx, screw: (k.x0 + k.x1) / 2 + sx - 4 * view.U, led: k.x1 - 13 * view.U + sx };
  };
  const termAt = (x: number, y: number, b: Board) => {
    const k = block(b);
    if (x < k.x0 - 40 * view.U || x > k.x1 + 10 * view.U) return -1;
    for (let j = 0; j < n; j++) if (Math.abs(y - rowY(j, b)) < k.cell / 2) return j;
    return -1;
  };
  const owner = (j: number) => W.findIndex((w, i) => w.seated && slot[i] === j);

  return {
    get title() { return tx('Wire it up', 'Đấu dây điện'); },
    get sub() { return tx('Drag each wire to its colour, then tap to tighten', 'Kéo dây vào đúng cọc cùng màu, rồi chạm để siết'); },
    skin: 'mat',
    progress: () => W.reduce((s, w) => s + (w.seated ? 0.4 : 0) + 0.6 * w.turns / TURNS, 0) / n,
    solved: () => W.every((w) => w.seated && w.turns >= TURNS),
    update(dt, b) {
      dt = Math.min(dt, 0.05);
      clock += dt;
      W.forEach((w, i) => {
        if (Number.isNaN(w.ex)) { const p = rest(i, b); w.ex = p.x; w.ey = p.y; }
        w.ang += (w.angT - w.ang) * Math.min(1, dt * 16);
        if (w.turns >= TURNS) w.led = Math.min(1, w.led + dt * 4);
        if (i === grab) return;
        // springy return to the rest point (or into the terminal)
        const tg = w.seated ? { x: term(slot[i], b).entry, y: term(slot[i], b).y } : rest(i, b);
        const k = w.seated ? 600 : 160, damp = w.seated ? 40 : 11;
        // small fixed steps keep the spring stable on slow frames
        for (let h = dt; h > 1e-4; h -= 1 / 120) {
          const s = Math.min(h, 1 / 120);
          w.vx += ((tg.x - w.ex) * k - w.vx * damp) * s;
          w.vy += ((tg.y - w.ey) * k - w.vy * damp) * s;
          w.ex += w.vx * s; w.ey += w.vy * s;
        }
      });
      for (let j = 0; j < n; j++) shake[j] = Math.max(0, shake[j] - dt * 2.5);
    },
    down(x, y, b) {
      // grab the nearest free copper end
      let best = -1, bd = 36 * view.U;
      W.forEach((w, i) => {
        if (w.seated) return;
        const d = dist(x, y, w.ex, w.ey);
        if (d < bd) { bd = d; best = i; }
      });
      if (best >= 0) {
        grab = best;
        offX = W[best].ex - x; offY = W[best].ey - y;
        sfx.lift();
        haptic(6);
        return;
      }
      // or tap a seated terminal to turn its screw
      const j = termAt(x, y, b);
      const i = j >= 0 ? owner(j) : -1;
      if (i < 0) return;
      const w = W[i];
      if (w.turns >= TURNS) return;
      w.turns++;
      w.angT += Math.PI / 2;
      const t = term(j, b);
      if (w.turns < TURNS) {
        sfx.tick();
        haptic(8);
        emit('spark', t.screw, t.y, 2, { color: ['#ffffff', '#dfe6ee'], speed: 60, size: 3 });
      } else {
        sfx.zap();
        sfx.connect(W.filter((q) => q.turns >= TURNS).length * 3 + 2);
        haptic(22);
        emit('spark', t.entry, t.y, 12, { color: ['#fff6a8', '#ffd84a', '#ffffff', '#8fd8ff'], speed: 170, size: 5 });
        emit('flash', t.led, t.y, 1, { color: 'rgba(120,255,150,0.8)', size: 10 * view.U, speed: 0, life: 0.4 });
      }
    },
    move(x, y, b) {
      if (grab < 0) return;
      const w = W[grab];
      const nx = clamp(x + offX, b.x + 40 * view.U, b.x + b.w - 8 * view.U), ny = clamp(y + offY, b.y + 8 * view.U, b.y + b.h - 8 * view.U);
      w.vx = (nx - w.ex) * 30; w.vy = (ny - w.ey) * 30;
      w.ex = nx; w.ey = ny;
      over = termAt(w.ex, w.ey, b);
    },
    up(x, y, b) {
      if (grab < 0) return;
      const i = grab, w = W[i];
      grab = -1;
      over = -1;
      const j = termAt(w.ex, w.ey, b);
      if (j < 0) { w.vx *= 0.3; w.vy *= 0.3; return; }
      if (j === slot[i] && owner(j) < 0) {
        w.seated = true;
        w.vx = 0; w.vy = 0;
        sfx.snap();
        haptic(14);
        const t = term(j, b);
        emit('spark', t.entry, t.y, 5, { color: ['#ffd9a0', '#ffffff'], speed: 80, size: 4 });
      } else {
        shake[j] = 1;
        sfx.error();
        haptic(30);
        w.vx = -500 * view.U; w.vy = -120 * view.U;
      }
      void x; void y;
    },
    draw(c, b, time) {
      const U = view.U;
      const k = block(b);
      // cable jacket the wires come out of
      const top = rowY(0, b) - 16 * U, bot = rowY(n - 1, b) + 16 * U;
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.beginPath(); rr(c, b.x - 4 * U, top + 4 * U, 36 * U, bot - top, 10 * U); c.fill();
      const jg = c.createLinearGradient(b.x, 0, b.x + 32 * U, 0);
      jg.addColorStop(0, '#5f646d'); jg.addColorStop(0.5, '#a9afb8'); jg.addColorStop(1, '#6b7079');
      c.fillStyle = jg;
      c.beginPath(); rr(c, b.x - 8 * U, top, 36 * U, bot - top, 10 * U); c.fill();

      // terminal block
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.beginPath(); rr(c, k.x0 + 4 * U, k.y0 + 8 * U, k.x1 - k.x0, k.y1 - k.y0, 10 * U); c.fill();
      const bg = c.createLinearGradient(0, k.y0, 0, k.y1);
      bg.addColorStop(0, '#f0ece2'); bg.addColorStop(1, '#c9c2b2');
      c.fillStyle = bg;
      c.beginPath(); rr(c, k.x0, k.y0, k.x1 - k.x0, k.y1 - k.y0, 10 * U); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5;
      c.beginPath(); rr(c, k.x0 + 2, k.y0 + 2, k.x1 - k.x0 - 4, k.y1 - k.y0 - 4, 8 * U); c.stroke();
      for (let j = 0; j < n; j++) {
        const t = term(j, b);
        const tc = WIRE_COLS[slot.indexOf(j)];
        const col = tc.c;
        if (j > 0) {
          c.strokeStyle = 'rgba(90,80,60,0.35)'; c.lineWidth = 2 * U;
          c.beginPath(); c.moveTo(k.x0 + 4 * U, t.y - k.cell / 2); c.lineTo(k.x1 - 4 * U, t.y - k.cell / 2); c.stroke();
        }
        // wire entry
        c.fillStyle = '#2b2620';
        c.beginPath(); rrc(c, t.entry - 4 * U, t.y, 14 * U, 13 * U, 3 * U); c.fill();
        // coloured collar + slotted screw
        const sr = Math.min(15 * U, k.cell * 0.26);
        const hi = over === j || (tutorial && grab >= 0 && slot[grab] === j);
        if (hi) {
          c.fillStyle = `rgba(255,236,150,${0.35 + 0.25 * Math.sin(time * 8)})`;
          c.beginPath(); c.arc(t.screw, t.y, sr * 1.9, 0, TAU); c.fill();
        }
        c.fillStyle = shade(col, -0.35);
        c.beginPath(); c.arc(t.screw, t.y + 2 * U, sr * 1.42, 0, TAU); c.fill();
        c.fillStyle = col;
        c.beginPath(); c.arc(t.screw, t.y, sr * 1.42, 0, TAU); c.fill();
        if (tc.stripe) {
          c.strokeStyle = tc.stripe; c.lineWidth = sr * 0.3;
          c.beginPath(); c.arc(t.screw, t.y, sr * 1.24, -0.6, 0.6); c.arc(t.screw, t.y, sr * 1.24, Math.PI - 0.6, Math.PI + 0.6); c.stroke();
        }
        const i = owner(j);
        slotScrew(c, t.screw, t.y, sr, i >= 0 ? W[i].ang : 0.4);
        // tighten hint: little ticks for the turns still to go
        if (i >= 0 && W[i].turns < TURNS) {
          for (let q = 0; q < TURNS; q++) {
            c.fillStyle = q < W[i].turns ? '#ffd84a' : 'rgba(60,50,40,0.35)';
            c.beginPath(); c.arc(t.screw - 8 * U + q * 8 * U, t.y + sr * 1.42 + 7 * U, 2.6 * U, 0, TAU); c.fill();
          }
          const pk = 0.5 + 0.5 * Math.sin(time * 6);
          c.strokeStyle = `rgba(255,236,150,${0.4 + 0.5 * pk})`; c.lineWidth = 2 * U;
          c.beginPath(); c.arc(t.screw, t.y, sr * (1.7 + pk * 0.2), 0, TAU); c.stroke();
        }
        // LED
        const on = i >= 0 ? W[i].led : 0;
        if (on > 0) {
          const lg = c.createRadialGradient(t.led, t.y, 0, t.led, t.y, 16 * U);
          lg.addColorStop(0, `rgba(110,255,140,${0.6 * on})`); lg.addColorStop(1, 'rgba(110,255,140,0)');
          c.fillStyle = lg;
          c.beginPath(); c.arc(t.led, t.y, 16 * U, 0, TAU); c.fill();
        }
        c.fillStyle = mix('#2f3a31', '#6dff8c', on);
        c.beginPath(); c.arc(t.led, t.y, 5 * U, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.6)';
        c.beginPath(); c.arc(t.led - 1.6 * U, t.y - 1.6 * U, 1.6 * U, 0, TAU); c.fill();
      }

      // wires (the grabbed one on top)
      const order = W.map((_, i) => i).filter((i) => i !== grab);
      if (grab >= 0) order.push(grab);
      for (const i of order) {
        const w = W[i];
        if (Number.isNaN(w.ex)) continue;
        const a = anchor(i, b);
        drawWire(c, a.x, a.y, w.ex, w.ey, WIRE_COLS[i].c, WIRE_COLS[i].stripe, i === grab);
      }
    },
    hint(c, b, time) {
      if (grab >= 0) return;
      const i = W.findIndex((w) => !w.seated);
      if (i >= 0) {
        const w = W[i], t = term(slot[i], b);
        const k = easeOut(Math.min(1, ((time * 0.6) % 1) * 1.3));
        hand(c, w.ex + (t.entry - w.ex) * k, w.ey + (t.y - w.ey) * k, view.U * 1.05, k < 0.05 ? 1 : 0);
        return;
      }
      const j = W.findIndex((w) => w.turns < TURNS);
      if (j < 0) return;
      const t = term(slot[j], b);
      hand(c, t.screw + 2, t.y + 6, view.U * 1.05, (time * 2) % 1 < 0.3 ? 1 : 0);
    },
  };
}

function slotScrew(c: C, x: number, y: number, r: number, ang: number): void {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#cfd3da'); g.addColorStop(1, '#7c838d');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.strokeStyle = '#5c626b'; c.lineWidth = 1; c.stroke();
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.strokeStyle = '#464b53'; c.lineCap = 'round'; c.lineWidth = Math.max(1.5, r * 0.3);
  c.beginPath(); c.moveTo(-r * 0.7, 0); c.lineTo(r * 0.7, 0); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(-r * 0.6, r * 0.2); c.lineTo(r * 0.6, r * 0.2); c.stroke();
  c.restore();
}

/** A hanging insulated wire from (ax, ay) to a stripped copper end at (ex, ey). */
function drawWire(c: C, ax: number, ay: number, ex: number, ey: number, col: string, stripe: string | undefined, held: boolean): void {
  const U = view.U;
  const sag = 22 * U + Math.abs(ex - ax) * 0.16 + (held ? 0 : 10 * U);
  // the copper sticks out to the right, slightly tilted by the sag
  let ux = 44 * U, uy = -sag * 0.25;
  const ul = Math.hypot(ux, uy); ux /= ul; uy /= ul;
  const qx = ex - ux * 13 * U, qy = ey - uy * 13 * U;
  const path = () => {
    c.beginPath();
    c.moveTo(ax, ay);
    c.bezierCurveTo(ax + (qx - ax) * 0.35, ay + sag, qx - ux * 46 * U, qy - uy * 46 * U + sag * 0.5, qx, qy);
  };
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 10 * U;
  c.save(); c.translate(3 * U, 6 * U); path(); c.stroke(); c.restore();
  // copper strands
  c.strokeStyle = '#a8612a'; c.lineWidth = 5 * U;
  c.beginPath(); c.moveTo(qx, qy); c.lineTo(ex, ey); c.stroke();
  c.strokeStyle = '#ffc178'; c.lineWidth = 1.6 * U;
  c.beginPath(); c.moveTo(qx, qy - 1 * U); c.lineTo(ex, ey - 1 * U); c.stroke();
  // insulation
  c.strokeStyle = shade(col, -0.45); c.lineWidth = 11 * U; path(); c.stroke();
  c.strokeStyle = col; c.lineWidth = 8 * U; path(); c.stroke();
  if (stripe) {
    c.strokeStyle = stripe; c.lineWidth = 8 * U; c.lineCap = 'butt';
    c.setLineDash([9 * U, 9 * U]); path(); c.stroke(); c.setLineDash([]);
    c.lineCap = 'round';
  }
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2 * U;
  c.save(); c.translate(-1 * U, -2.2 * U); path(); c.stroke(); c.restore();
  // cut end of the sleeve
  c.fillStyle = shade(col, -0.3);
  c.beginPath(); c.ellipse(qx, qy, 2.4 * U, 4.6 * U, Math.atan2(uy, ux), 0, TAU); c.fill();
  c.restore();
}

// ---------------- pop-it ----------------

function popitGame(cols: number, rows: number, color: string): Game {
  const nC = clamp(Math.round(cols), 2, 8), nR = clamp(Math.round(rows), 2, 8);
  const col = hex(color, '#7fc8ff');
  const D = Array.from({ length: nC * nR }, () => ({ popped: false, t: 9 }));
  const upL = layer(), downL = layer(), sheetL = layer();
  const queue: number[] = [];
  let soundT = 0;
  let lastX = 0, lastY = 0, pressed = false;

  const layout = (b: Board) => {
    const s = Math.min((b.w * 0.86) / nC, (b.h * 0.82) / nR);
    const w = s * nC, h = s * nR;
    return { s, rad: s * 0.38, x: b.x + (b.w - w) / 2, y: b.y + (b.h - h) / 2, w, h };
  };
  const center = (i: number, L: ReturnType<typeof layout>) => ({ x: L.x + (i % nC + 0.5) * L.s, y: L.y + (Math.floor(i / nC) + 0.5) * L.s });
  const pop = (i: number, L: ReturnType<typeof layout>) => {
    const d = D[i];
    if (d.popped) return;
    d.popped = true;
    d.t = 0;
    const cx = i % nC, cy = Math.floor(i / nC);
    queue.push(0.78 + (1 - cy / Math.max(1, nR - 1)) * 0.45 + (cx / Math.max(1, nC - 1)) * 0.15);
    const p = center(i, L);
    emit('ring', p.x, p.y, 1, { color: 'rgba(255,255,255,0.7)', size: L.rad * 0.5, speed: 0, life: 0.3 });
  };
  const popAt = (x: number, y: number, L: ReturnType<typeof layout>) => {
    for (let i = 0; i < D.length; i++) {
      const p = center(i, L);
      if (dist(x, y, p.x, p.y) < L.rad * 1.05) pop(i, L);
    }
  };

  // one sprite per dome state, drawn once
  const sprite = (popped: boolean, rad: number) => {
    const S = rad * 2.6;
    return (popped ? downL : upL)(`${rad.toFixed(2)}`, S, S, (c) => {
      const x = S / 2, y = S / 2, r = rad;
      // groove around the dome
      c.fillStyle = shade(col, -0.22);
      c.beginPath(); c.arc(x, y, r * 1.1, 0, TAU); c.fill();
      c.fillStyle = shade(col, 0.25);
      c.beginPath(); c.arc(x, y + r * 0.04, r * 1.04, 0, Math.PI); c.fill();
      if (!popped) {
        c.fillStyle = 'rgba(0,0,0,0.22)';
        c.beginPath(); c.arc(x + r * 0.08, y + r * 0.14, r, 0, TAU); c.fill();
        const g = c.createRadialGradient(x - r * 0.35, y - r * 0.42, r * 0.08, x, y, r);
        g.addColorStop(0, shade(col, 0.6)); g.addColorStop(0.45, col); g.addColorStop(1, shade(col, -0.25));
        c.fillStyle = g;
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.6)';
        c.beginPath(); c.ellipse(x - r * 0.36, y - r * 0.42, r * 0.3, r * 0.16, -0.65, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.beginPath(); c.arc(x + r * 0.42, y + r * 0.3, r * 0.08, 0, TAU); c.fill();
      } else {
        // pushed through: a dish lit from the far rim, with an inner shadow
        const g = c.createLinearGradient(x - r, y - r, x + r, y + r);
        g.addColorStop(0, shade(col, -0.42)); g.addColorStop(0.55, shade(col, -0.12)); g.addColorStop(1, shade(col, 0.3));
        c.fillStyle = g;
        c.beginPath(); c.arc(x, y, r * 0.96, 0, TAU); c.fill();
        const ig = c.createRadialGradient(x + r * 0.1, y + r * 0.12, r * 0.2, x, y, r * 0.96);
        ig.addColorStop(0, 'rgba(0,0,0,0)'); ig.addColorStop(1, 'rgba(0,0,0,0.28)');
        c.fillStyle = ig;
        c.beginPath(); c.arc(x, y, r * 0.96, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = r * 0.1; c.lineCap = 'round';
        c.beginPath(); c.arc(x, y, r * 0.84, 0.1, 1.5); c.stroke();
        c.strokeStyle = 'rgba(0,0,0,0.25)';
        c.beginPath(); c.arc(x, y, r * 0.84, Math.PI + 0.2, Math.PI * 1.45); c.stroke();
      }
    });
  };

  return {
    get title() { return tx('Press the rubber keys', 'Bấm nút cao su'); },
    get sub() { return tx('Tap or swipe to pop every key', 'Chạm hoặc vuốt để bấm hết các nút'); },
    skin: 'mat',
    progress: () => D.filter((d) => d.popped).length / D.length,
    solved: () => D.every((d) => d.popped),
    update(dt) {
      for (const d of D) d.t += dt;
      // pace the pops so a fast swipe ripples instead of machine-gunning
      soundT -= dt;
      if (queue.length && soundT <= 0) {
        sfx.popit(queue.shift()!);
        haptic(8);
        soundT = 0.035;
      }
    },
    down(x, y, b) { pressed = true; lastX = x; lastY = y; popAt(x, y, layout(b)); },
    move(x, y, b) {
      if (!pressed) return;
      const L = layout(b);
      const steps = Math.max(1, Math.ceil(dist(x, y, lastX, lastY) / (L.rad * 0.5)));
      for (let k = 1; k <= steps; k++) popAt(lastX + (x - lastX) * k / steps, lastY + (y - lastY) * k / steps, L);
      lastX = x; lastY = y;
    },
    up() { pressed = false; },
    draw(c, b) {
      const L = layout(b);
      const pad = L.s * 0.28;
      // silicone sheet (static, cached)
      const sw = L.w + pad * 2, sh = L.h + pad * 2, m = 14 * view.U;
      const sheet = sheetL(`${Math.round(sw)}x${Math.round(sh)}`, sw + m * 2, sh + m * 2, (s) => {
        const x = m, y = m;
        s.fillStyle = 'rgba(0,0,0,0.35)';
        s.beginPath(); rr(s, x + 3, y + 8, sw, sh, L.s * 0.4); s.fill();
        s.fillStyle = shade(col, -0.3);
        s.beginPath(); rr(s, x, y + 4, sw, sh, L.s * 0.4); s.fill();
        const g = s.createLinearGradient(0, y, 0, y + sh);
        g.addColorStop(0, shade(col, 0.22)); g.addColorStop(1, shade(col, -0.08));
        s.fillStyle = g;
        s.beginPath(); rr(s, x, y, sw, sh, L.s * 0.4); s.fill();
        s.strokeStyle = 'rgba(255,255,255,0.45)'; s.lineWidth = 2;
        s.beginPath(); rr(s, x + 3, y + 3, sw - 6, sh - 6, L.s * 0.36); s.stroke();
      });
      c.drawImage(sheet, L.x - pad - m, L.y - pad - m, sw + m * 2, sh + m * 2);
      const up = sprite(false, L.rad), dn = sprite(true, L.rad);
      const S = L.rad * 2.6;
      D.forEach((d, i) => {
        const p = center(i, L);
        // squash on the pop, then a tiny jelly bounce
        const e = d.popped ? Math.exp(-d.t * 12) : 0;
        const sx = 1 + 0.1 * e * Math.cos(d.t * 38), sy = 1 - 0.16 * e * Math.cos(d.t * 38);
        const img = d.popped ? dn : up;
        c.drawImage(img, p.x - S * sx / 2, p.y - S * sy / 2, S * sx, S * sy);
      });
    },
    hint(c, b, time) {
      const L = layout(b);
      const i = D.findIndex((d) => !d.popped);
      if (i < 0 || pressed) return;
      const row = Math.floor(i / nC);
      const a = center(row * nC, L), z = center(row * nC + nC - 1, L);
      const k = (time * 0.7) % 1;
      hand(c, a.x + (z.x - a.x) * k, a.y + 4, view.U * 1.05, k < 0.1 ? 1 : 0);
    },
  };
}

// ---------------- peel ----------------

interface Glass { cx: number; cy: number; w: number; h: number; rad: number; round: boolean; nx: number; ny: number; p0x: number; p0y: number; D: number }

function peelGame(shape: 'screen' | 'round' | 'wide', color: string, tutorial: boolean): Game {
  const body = hex(color, '#5d6a7a');
  const F = 0.45; // foreshortening of the folded-back flap
  const filmL = layer(), faceL = layer();
  const seed = shape.length * 97 + body.length;
  let s = 0; // fold distance from the tab corner, px along the diagonal
  let grabbed = false, sStart = 0, projStart = 0, sound = 0;
  let fly = -1;
  let span = 400 * view.U; // the glass diagonal, refreshed every frame

  const geo = (b: Board): Glass => {
    const U = view.U;
    const cx = b.x + b.w / 2, cy = b.y + b.h * 0.47;
    let w: number, h: number, rad: number;
    const round = shape === 'round';
    if (round) { w = h = Math.min(b.w * 0.66, b.h * 0.5); rad = w / 2; }
    else if (shape === 'wide') { w = b.w * 0.78; h = Math.min(b.h * 0.32, w * 0.46); rad = 12 * U; }
    else { w = Math.min(b.w * 0.56, b.h * 0.42); h = Math.min(b.h * 0.7, w * 1.85); rad = 16 * U; }
    let nx = round ? 1 : w, ny = round ? 1 : h;
    const l = Math.hypot(nx, ny); nx /= l; ny /= l;
    const ext = round ? rad : Math.abs(nx) * (w / 2 - rad) + Math.abs(ny) * (h / 2 - rad) + rad;
    return { cx, cy, w, h, rad, round, nx, ny, p0x: cx - nx * ext, p0y: cy - ny * ext, D: ext * 2 };
  };
  const glassPath = (g: Glass, ox = 0, oy = 0) => {
    const p = new Path2D();
    if (g.round) p.arc(g.cx + ox, g.cy + oy, g.rad, 0, TAU);
    else rrc(p, g.cx + ox, g.cy + oy, g.w, g.h, g.rad);
    return p;
  };
  /** The part of the plane on one side of the fold (sign 1 = still stuck down). */
  const half = (g: Glass, at: number, sign: number) => {
    const qx = g.p0x + g.nx * at, qy = g.p0y + g.ny * at;
    const B = 3000, px = -g.ny, py = g.nx;
    const p = new Path2D();
    p.moveTo(qx + px * B, qy + py * B);
    p.lineTo(qx - px * B, qy - py * B);
    p.lineTo(qx - px * B + g.nx * B * sign, qy - py * B + g.ny * B * sign);
    p.lineTo(qx + px * B + g.nx * B * sign, qy + py * B + g.ny * B * sign);
    p.closePath();
    return p;
  };
  const proj = (g: Glass, x: number, y: number) => (x - g.p0x) * g.nx + (y - g.p0y) * g.ny;
  const s0 = () => 20 * view.U;
  const goal = (g: Glass) => g.D * 0.85;

  // the scuffed, dusty film, painted once
  const film = (g: Glass) => filmL(`${Math.round(g.w)}x${Math.round(g.h)}`, g.w, g.h, (c) => {
    const r = rng(seed);
    c.save();
    const clip = new Path2D();
    if (g.round) clip.arc(g.w / 2, g.h / 2, g.rad, 0, TAU); else rrc(clip, g.w / 2, g.h / 2, g.w, g.h, g.rad);
    c.clip(clip);
    const mg = c.createLinearGradient(0, 0, g.w, g.h);
    mg.addColorStop(0, 'rgba(226,232,240,0.62)'); mg.addColorStop(1, 'rgba(200,208,220,0.55)');
    c.fillStyle = mg;
    c.fillRect(0, 0, g.w, g.h);
    c.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const x = r() * g.w, y = r() * g.h, a = r() * Math.PI, l = (10 + r() * 50) * view.U;
      c.strokeStyle = r() < 0.7 ? `rgba(255,255,255,${0.3 + r() * 0.4})` : 'rgba(80,90,100,0.18)';
      c.lineWidth = (0.6 + r() * 1.1) * view.U;
      c.beginPath(); c.moveTo(x, y);
      c.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 8, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      c.stroke();
    }
    for (let i = 0; i < 90; i++) {
      c.fillStyle = r() < 0.6 ? 'rgba(120,110,95,0.35)' : 'rgba(255,255,255,0.55)';
      c.beginPath(); c.arc(r() * g.w, r() * g.h, (0.5 + r() * 1.4) * view.U, 0, TAU); c.fill();
    }
    // trapped air bubbles
    for (let i = 0; i < 6; i++) {
      const x = r() * g.w, y = r() * g.h, br = (3 + r() * 6) * view.U;
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1;
      c.beginPath(); c.arc(x, y, br, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fill();
    }
    c.restore();
  });

  // what's under the glass: wallpaper, watch dial or radio dial
  const face = (g: Glass) => faceL(`${Math.round(g.w)}x${Math.round(g.h)}`, g.w, g.h, (c) => {
    const U = view.U, w = g.w, h = g.h, cx = w / 2, cy = h / 2;
    c.save();
    const clip = new Path2D();
    if (g.round) clip.arc(cx, cy, g.rad, 0, TAU); else rrc(clip, cx, cy, w, h, g.rad);
    c.clip(clip);
    if (shape === 'screen') {
      const bg = c.createLinearGradient(0, 0, w * 0.4, h);
      bg.addColorStop(0, '#5b7cf0'); bg.addColorStop(0.55, '#9a7fe6'); bg.addColorStop(1, '#f2a3c4');
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.beginPath(); c.arc(w * 0.85, h * 0.75, w * 0.5, 0, TAU); c.fill();
      text(c, '9:41', cx, h * 0.2, w * 0.24, '#ffffff', { font: 'bold' });
      const s2 = w * 0.17;
      for (let i = 0; i < 8; i++) {
        const x = w * (0.2 + (i % 4) * 0.2), y = h * 0.42 + Math.floor(i / 4) * s2 * 1.45;
        c.fillStyle = ['#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#ffffff', '#ff9f1c', '#8ac926', '#c77dff'][i];
        c.globalAlpha = 0.9;
        c.beginPath(); rrc(c, x, y, s2, s2, s2 * 0.28); c.fill();
      }
      c.globalAlpha = 1;
    } else if (shape === 'round') {
      const dg = c.createRadialGradient(cx - w * 0.15, cy - h * 0.2, 2, cx, cy, g.rad);
      dg.addColorStop(0, '#fffaf0'); dg.addColorStop(1, '#e5dccb');
      c.fillStyle = dg; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * TAU, big = i % 5 === 0;
        const r0 = g.rad * (big ? 0.78 : 0.84), r1 = g.rad * 0.9;
        c.strokeStyle = big ? '#3a3530' : '#8a8075'; c.lineWidth = (big ? 2.4 : 1) * U;
        c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke();
      }
      text(c, 'CHILL', cx, cy - g.rad * 0.38, g.rad * 0.14, '#7a6a5a', { font: 'bold' });
      c.lineCap = 'round';
      const handA = (a: number, l: number, wd: number, cl: string) => {
        c.strokeStyle = cl; c.lineWidth = wd;
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); c.stroke();
      };
      handA(-Math.PI / 2 - TAU * 2 / 12, g.rad * 0.5, 5 * U, '#2d2a26');
      handA(-Math.PI / 2 + TAU * 2 / 12, g.rad * 0.72, 3.5 * U, '#2d2a26');
      handA(-Math.PI / 2 + TAU * 7 / 12, g.rad * 0.78, 1.5 * U, '#e8424f');
      c.fillStyle = '#2d2a26'; c.beginPath(); c.arc(cx, cy, 5 * U, 0, TAU); c.fill();
    } else {
      const dg = c.createLinearGradient(0, 0, 0, h);
      dg.addColorStop(0, '#2d2a24'); dg.addColorStop(1, '#16140f');
      c.fillStyle = dg; c.fillRect(0, 0, w, h);
      const glow = c.createRadialGradient(cx, cy, 2, cx, cy, w * 0.6);
      glow.addColorStop(0, 'rgba(255,190,90,0.35)'); glow.addColorStop(1, 'rgba(255,190,90,0)');
      c.fillStyle = glow; c.fillRect(0, 0, w, h);
      for (let i = 0; i <= 40; i++) {
        const x = w * (0.08 + 0.84 * i / 40), big = i % 8 === 0;
        c.strokeStyle = big ? '#ffd9a0' : 'rgba(255,217,160,0.6)'; c.lineWidth = (big ? 2 : 1) * U;
        c.beginPath(); c.moveTo(x, h * 0.62); c.lineTo(x, h * (big ? 0.42 : 0.52)); c.stroke();
        if (big) text(c, `${88 + (i / 8) * 4}`, x, h * 0.3, h * 0.14, '#ffd9a0', { font: 'bold' });
      }
      text(c, 'FM', w * 0.06, h * 0.82, h * 0.12, '#ffb347', { font: 'bold', align: 'left' });
      c.fillStyle = '#ff5a3c'; c.fillRect(w * 0.58, h * 0.14, 3 * U, h * 0.74);
    }
    c.restore();
  });

  const drawBody = (c: C, g: Glass) => {
    const U = view.U;
    c.save();
    if (g.round) {
      // strap, case and crown
      c.fillStyle = shade(body, -0.35);
      c.beginPath(); rrc(c, g.cx, g.cy, g.w * 0.62, g.h * 1.9, 16 * U); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = -3; i <= 3; i++) if (Math.abs(i) > 1) { c.beginPath(); rrc(c, g.cx, g.cy + i * g.h * 0.24, g.w * 0.5, 3 * U, 2 * U); c.fill(); }
      c.fillStyle = shade(body, -0.2);
      c.beginPath(); rrc(c, g.cx + g.rad + 16 * U, g.cy, 14 * U, 22 * U, 4 * U); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.beginPath(); c.arc(g.cx + 3 * U, g.cy + 8 * U, g.rad + 18 * U, 0, TAU); c.fill();
      const bg = c.createRadialGradient(g.cx - g.rad * 0.4, g.cy - g.rad * 0.5, 4, g.cx, g.cy, g.rad + 18 * U);
      bg.addColorStop(0, shade(body, 0.45)); bg.addColorStop(1, shade(body, -0.2));
      c.fillStyle = bg;
      c.beginPath(); c.arc(g.cx, g.cy, g.rad + 16 * U, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
      c.beginPath(); c.arc(g.cx, g.cy, g.rad + 13 * U, Math.PI * 1.05, Math.PI * 1.6); c.stroke();
    } else {
      const bw = g.w + (shape === 'wide' ? 34 : 22) * U, bh = g.h + (shape === 'wide' ? 34 : 60) * U;
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.beginPath(); rrc(c, g.cx + 4 * U, g.cy + 10 * U, bw, bh, g.rad + 10 * U); c.fill();
      c.fillStyle = shade(body, -0.3);
      c.beginPath(); rrc(c, g.cx, g.cy + 4 * U, bw, bh, g.rad + 10 * U); c.fill();
      const bg = c.createLinearGradient(g.cx - bw / 2, g.cy - bh / 2, g.cx + bw / 2, g.cy + bh / 2);
      bg.addColorStop(0, shade(body, 0.35)); bg.addColorStop(1, shade(body, -0.12));
      c.fillStyle = bg;
      c.beginPath(); rrc(c, g.cx, g.cy, bw, bh, g.rad + 10 * U); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 2;
      c.beginPath(); rrc(c, g.cx, g.cy, bw - 5 * U, bh - 5 * U, g.rad + 8 * U); c.stroke();
      if (shape === 'screen') {
        c.fillStyle = '#1b1d22';
        c.beginPath(); c.arc(g.cx, g.cy - g.h / 2 - 14 * U, 4 * U, 0, TAU); c.fill();
        c.fillStyle = shade(body, -0.25);
        c.beginPath(); rrc(c, g.cx, g.cy + g.h / 2 + 16 * U, 34 * U, 6 * U, 3 * U); c.fill();
      }
    }
    // dark glass rim
    c.fillStyle = '#121418';
    if (g.round) { c.beginPath(); c.arc(g.cx, g.cy, g.rad + 3 * U, 0, TAU); c.fill(); }
    else { c.beginPath(); rrc(c, g.cx, g.cy, g.w + 6 * U, g.h + 6 * U, g.rad + 3 * U); c.fill(); }
    c.restore();
  };

  return {
    get title() { return tx('Peel the film', 'Bóc màng bảo vệ'); },
    get sub() { return tx('Drag from the corner tab to peel it off', 'Kéo từ góc để bóc lớp màng'); },
    skin: 'mat',
    progress: () => (fly >= 0 ? 1 : clamp((s - s0()) / Math.max(1, span * 0.85 - s0()), 0, 1)),
    solved: () => fly > 0.6,
    update(dt, b) {
      const g = geo(b);
      span = g.D;
      if (s === 0) s = s0();
      if (fly >= 0) {
        fly += dt;
        s = Math.min(g.D, s + dt * g.D * 3);
      }
    },
    down(x, y, b) {
      if (fly >= 0) return;
      const g = geo(b);
      const cx = g.p0x + g.nx * s * (1 + F), cy = g.p0y + g.ny * s * (1 + F);
      const p = proj(g, x, y);
      const near = dist(x, y, cx, cy) < 56 * view.U || (s > s0() * 1.5 && p > s - 40 * view.U && p < s * (1 + F) + 40 * view.U);
      if (!near) return;
      grabbed = true;
      sStart = s; projStart = p;
      sfx.peel();
      haptic(6);
    },
    move(x, y, b) {
      if (!grabbed || fly >= 0) return;
      const g = geo(b);
      const ns = clamp(sStart + (proj(g, x, y) - projStart) * 0.85, s0(), g.D);
      if (ns <= s) return;
      sound += ns - s;
      s = ns;
      while (sound > 5 * view.U) {
        sound -= 5 * view.U;
        sfx.peel();
        if (Math.random() < 0.3) haptic(3);
      }
      if (s >= goal(g)) {
        // let go of the last bit: the film whips off
        fly = 0;
        grabbed = false;
        sfx.whoosh();
        haptic(20);
        for (let i = 0; i < 5; i++) emit('spark', g.cx + (Math.random() - 0.5) * g.w * 0.8, g.cy + (Math.random() - 0.5) * g.h * 0.8, 2, { color: ['#ffffff', '#e8f6ff'], speed: 60, size: 7 });
      }
    },
    up() { grabbed = false; },
    draw(c, b, time) {
      const U = view.U;
      const g = geo(b);
      drawBody(c, g);
      const gp = glassPath(g);
      const x0 = g.cx - g.w / 2, y0 = g.cy - g.h / 2;
      c.drawImage(face(g), x0, y0, g.w, g.h);
      // the clean glass: a crisp diagonal reflection
      c.save();
      c.clip(gp);
      const k = clamp((s - s0()) / g.D, 0, 1);
      const rg = c.createLinearGradient(x0, y0, x0 + g.w, y0 + g.h);
      const sh = 0.3 + 0.08 * Math.sin(time * 1.5);
      rg.addColorStop(Math.max(0, sh - 0.12), 'rgba(255,255,255,0)');
      rg.addColorStop(sh, `rgba(255,255,255,${0.12 + 0.2 * k})`);
      rg.addColorStop(sh + 0.04, 'rgba(255,255,255,0)');
      rg.addColorStop(sh + 0.1, `rgba(255,255,255,${0.06 + 0.12 * k})`);
      rg.addColorStop(Math.min(1, sh + 0.16), 'rgba(255,255,255,0)');
      c.fillStyle = rg;
      c.fill(gp);
      c.restore();

      const pulse = !grabbed && fly < 0 ? (0.5 + 0.5 * Math.sin(time * 5)) * 4 * U : 0;
      const sv = s + pulse;
      if (fly < 0) {
        // film still stuck down
        c.save();
        c.clip(gp);
        c.clip(half(g, sv, 1));
        c.drawImage(film(g), x0, y0, g.w, g.h);
        // the flap's soft shadow along the fold
        const qx = g.p0x + g.nx * sv, qy = g.p0y + g.ny * sv;
        const sg = c.createLinearGradient(qx, qy, qx + g.nx * 16 * U, qy + g.ny * 16 * U);
        sg.addColorStop(0, 'rgba(0,0,0,0.3)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = sg;
        c.fill(gp);
        c.restore();
      }
      // the peeled part, folded back over itself
      const fk = fly >= 0 ? Math.max(0, fly - 0.12) : 0;
      c.save();
      if (fk > 0) {
        c.globalAlpha = Math.max(0, 1 - fk * 2);
        c.translate((g.nx * 380 * fk + 60 * fk) * U, (g.ny * 200 * fk - 320 * fk) * U);
        c.translate(g.cx, g.cy); c.rotate(fk * 1.4); c.translate(-g.cx, -g.cy);
      }
      const qx = g.p0x + g.nx * sv, qy = g.p0y + g.ny * sv;
      const m = 1 + F;
      c.translate(qx, qy);
      c.transform(1 - m * g.nx * g.nx, -m * g.nx * g.ny, -m * g.nx * g.ny, 1 - m * g.ny * g.ny, 0, 0);
      c.translate(-qx, -qy);
      c.save();
      c.clip(gp);
      c.clip(half(g, sv, -1));
      c.fillStyle = 'rgba(244,247,251,0.86)';
      c.fill(gp);
      c.globalAlpha *= 0.45;
      c.drawImage(film(g), x0, y0, g.w, g.h);
      c.globalAlpha /= 0.45;
      const cg = c.createLinearGradient(qx - g.nx * 30 * U, qy - g.ny * 30 * U, qx, qy);
      cg.addColorStop(0, 'rgba(255,255,255,0)'); cg.addColorStop(0.8, 'rgba(255,255,255,0.55)'); cg.addColorStop(1, 'rgba(160,170,185,0.45)');
      c.fillStyle = cg;
      c.fill(gp);
      c.restore();
      c.save();
      c.clip(half(g, sv, -1));
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1.6 * U;
      c.stroke(gp);
      c.restore();
      c.restore();
      // crease
      if (fly < 0) {
        c.save();
        c.clip(gp);
        const px = -g.ny, py = g.nx, B = 2000;
        c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 2 * U;
        c.beginPath(); c.moveTo(qx + px * B, qy + py * B); c.lineTo(qx - px * B, qy - py * B); c.stroke();
        c.strokeStyle = 'rgba(90,100,115,0.35)'; c.lineWidth = 1 * U;
        c.beginPath(); c.moveTo(qx + px * B + g.nx * 2 * U, qy + py * B + g.ny * 2 * U); c.lineTo(qx - px * B + g.nx * 2 * U, qy - py * B + g.ny * 2 * U); c.stroke();
        c.restore();
        // tab arrow (first time, before anything is peeled)
        if (tutorial && s < s0() * 1.5) {
          const tx0 = g.p0x + g.nx * s * m, ty0 = g.p0y + g.ny * s * m;
          const a = Math.atan2(g.ny, g.nx), k2 = (time * 1.2) % 1;
          c.save();
          c.translate(tx0 + g.nx * (14 + k2 * 26) * U, ty0 + g.ny * (14 + k2 * 26) * U);
          c.rotate(a);
          c.globalAlpha = 1 - k2;
          c.fillStyle = '#ffe28a';
          c.beginPath(); c.moveTo(10 * U, 0); c.lineTo(-4 * U, -8 * U); c.lineTo(-4 * U, 8 * U); c.closePath(); c.fill();
          c.restore();
        }
      }
    },
    hint(c, b, time) {
      if (grabbed || fly >= 0) return;
      const g = geo(b);
      const m = 1 + F;
      const k = (time * 0.6) % 1;
      const x = g.p0x + g.nx * (s * m + k * 90 * view.U), y = g.p0y + g.ny * (s * m + k * 90 * view.U);
      hand(c, x, y, view.U * 1.05, k < 0.12 ? 1 : 0);
    },
  };
}

// ---------------- blow ----------------

interface Dust { x: number; y: number; r: number; hp: number; vx: number; vy: number; a: number; off: boolean; rot: number; vr: number; blobs: number[]; tone: string; wig: number }

type BlowLook = 'fan' | 'shade' | 'grille' | 'tray' | 'comb' | 'reflector';

const CRUMBS = ['#c98a4a', '#b27536', '#e0b27a', '#8a5a2a'];

function blowGame(dust: number, seed: number, look: BlowLook): Game {
  const r = rng(seed * 613 + dust);
  const n = clamp(Math.round(dust), 4, 80);
  const fanL = layer();
  // dust in units of the fan radius, centred on the fan
  const D: Dust[] = Array.from({ length: n }, () => {
    const a = r() * TAU, d = Math.sqrt(r()) * 1.08;
    const blobs: number[] = [];
    const k = 3 + Math.floor(r() * 3);
    for (let i = 0; i < k; i++) blobs.push((r() - 0.5) * 1.1, (r() - 0.5) * 0.9, 0.45 + r() * 0.45);
    return {
      x: Math.cos(a) * d, y: Math.sin(a) * d, r: 0.06 + r() * 0.06, hp: 0.8 + r() * 0.9,
      vx: 0, vy: 0, a: 1, off: false, rot: r() * TAU, vr: 0, blobs,
      tone: (look === 'tray' ? CRUMBS : ['#b9b3a7', '#a9a397', '#c8c2b6', '#9b968c'])[Math.floor(r() * 4)], wig: 0,
    };
  });
  const DIR = { x: -0.52, y: -0.85 };
  let held = false, fx = 0, fy = 0;
  let puffT = 0, squash = 0;
  let removed = 0;

  const fan = (b: Board) => {
    const R = Math.min(b.w * 0.36, b.h * 0.3);
    return { x: b.x + b.w / 2, y: b.y + b.h * 0.42, R };
  };
  const tipOf = (x: number, y: number) => ({ x: x + DIR.x * 96 * view.U, y: y + DIR.y * 96 * view.U });
  const restPos = (b: Board) => ({ x: b.x + b.w * 0.8, y: b.y + b.h * 0.92 });

  const knock = (d: Dust, sp: number, dx: number, dy: number) => {
    d.off = true;
    removed++;
    d.vx = dx * sp; d.vy = dy * sp;
    d.vr = (Math.random() - 0.5) * 8;
  };
  const puff = (b: Board) => {
    const f = fan(b), U = view.U;
    const t = tipOf(fx, fy);
    sfx.blow();
    haptic(10);
    squash = 1;
    emit('steam', t.x, t.y, 5, { color: '#ffffff', dir: Math.atan2(DIR.y, DIR.x), spread: 0.45, speed: 260, size: 5 * U, life: 0.45 });
    const reach = 190 * U;
    for (const d of D) {
      if (d.off) continue;
      const sx = f.x + d.x * f.R, sy = f.y + d.y * f.R;
      const vx = sx - t.x, vy = sy - t.y;
      const along = vx * DIR.x + vy * DIR.y;
      const perp = Math.abs(vx * DIR.y - vy * DIR.x);
      if (along < -12 * U || along > reach || perp > 28 * U + along * 0.6) continue;
      const k = Math.max(0.3, 1 - along / reach) * (1 - perp / (28 * U + along * 0.6) * 0.5);
      d.hp -= 0.55 + k * 1.1;
      d.wig = 1;
      const l = Math.hypot(vx, vy) || 1;
      const ox = (DIR.x * 0.6 + vx / l * 0.7), oy = (DIR.y * 0.6 + vy / l * 0.7);
      if (d.hp <= 0) {
        knock(d, (1.6 + k * 2.4) * (0.8 + Math.random() * 0.4), ox, oy);
        emit('dust', sx, sy, 3, { color: [d.tone, '#d8d2c6'], speed: 70, size: 4 * U, dir: Math.atan2(oy, ox), spread: 1.2 });
      } else {
        d.x += ox * 0.02; d.y += oy * 0.02;
      }
    }
    if (removed >= Math.ceil(n * 0.95)) {
      // the last wisps let go on their own
      for (const d of D) if (!d.off) { const l = Math.hypot(d.x, d.y) || 1; knock(d, 1.2, d.x / l, d.y / l); }
    }
  };

  return {
    get title() { return tx('Blow off the dust', 'Thổi bụi'); },
    get sub() { return tx('Hold to puff the dust away', 'Giữ để thổi sạch bụi'); },
    skin: 'mat',
    progress: () => removed / n,
    solved: () => removed >= n,
    update(dt, b) {
      dt = Math.min(dt, 0.05);
      squash = Math.max(0, squash - dt * 5);
      if (held) {
        puffT -= dt;
        if (puffT <= 0) { puffT = 0.33; puff(b); }
      }
      for (const d of D) {
        d.wig = Math.max(0, d.wig - dt * 4);
        if (!d.off || d.a <= 0) continue;
        d.x += d.vx * dt; d.y += d.vy * dt;
        d.vx *= 1 - dt * 1.5; d.vy = d.vy * (1 - dt * 1.5) - dt * 0.2;
        d.rot += d.vr * dt;
        d.a -= dt * 1.3;
      }
    },
    down(x, y, b) { held = true; fx = x; fy = y; puffT = 0; void b; },
    move(x, y) { if (held) { fx = x; fy = y; } },
    up() { held = false; },
    draw(c, b, time) {
      const U = view.U;
      const f = fan(b);
      const S = f.R * 2.5;
      const img = fanL(`${look}:${Math.round(f.R)}`, S, S, (s) => PAINT_BLOW[look](s, S / 2, S / 2, f.R));
      c.drawImage(img, f.x - S / 2, f.y - S / 2, S, S);
      for (const d of D) {
        if (d.a <= 0) continue;
        const wx = d.wig * Math.sin(time * 60) * 1.5 * U;
        drawDust(c, f.x + d.x * f.R + wx, f.y + d.y * f.R, d.r * f.R * (d.off ? 1 + (1 - d.a) * 0.5 : 1), d, Math.max(0, d.a));
      }
      const p = held ? { x: fx, y: fy } : restPos(b);
      drawBulb(c, p.x, p.y, squash, !held);
      if (held && squash > 0.6) {
        const t = tipOf(fx, fy);
        c.strokeStyle = `rgba(255,255,255,${(squash - 0.6) * 0.8})`;
        c.lineWidth = 2 * U;
        for (let i = -1; i <= 1; i++) {
          const a = Math.atan2(DIR.y, DIR.x) + i * 0.25, l0 = (14 + (1 - squash) * 60) * U;
          c.beginPath(); c.moveTo(t.x + Math.cos(a) * l0, t.y + Math.sin(a) * l0); c.lineTo(t.x + Math.cos(a) * (l0 + 16 * U), t.y + Math.sin(a) * (l0 + 16 * U)); c.stroke();
        }
      }
    },
    hint(c, b, time) {
      if (held) return;
      const f = fan(b);
      const d = D.find((q) => !q.off);
      if (!d) return;
      const x = f.x + d.x * f.R - DIR.x * 130 * view.U, y = f.y + d.y * f.R - DIR.y * 130 * view.U;
      hand(c, x, y, view.U * 1.05, (time * 1.5) % 1 < 0.5 ? 1 : 0);
      pill(c, x, y + 72 * view.U, tx('Hold', 'Giữ'), 13 * view.U, 0.9);
    },
  };
}

/** What the dust sits on, centred at (x, y), about R across the dusty disc. */
const PAINT_BLOW: Record<BlowLook, (c: C, x: number, y: number, R: number) => void> = {
  fan: paintFan, shade: paintShade, grille: paintGrille, tray: paintTray, comb: paintComb, reflector: paintReflector,
};

/** Looking into a lamp shade: enamel rim, white inside, the bulb at the bottom. */
function paintShade(c: C, x: number, y: number, R: number): void {
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.arc(x + 5 * view.U, y + 9 * view.U, R * 1.18, 0, TAU); c.fill();
  const rim = c.createLinearGradient(x - R, y - R, x + R, y + R);
  rim.addColorStop(0, '#4a5f8f'); rim.addColorStop(1, '#22304f');
  c.fillStyle = rim;
  c.beginPath(); c.arc(x, y, R * 1.18, 0, TAU); c.fill();
  const inner = c.createRadialGradient(x, y, R * 0.1, x, y, R * 1.06);
  inner.addColorStop(0, '#fffaf0'); inner.addColorStop(0.7, '#efe8da'); inner.addColorStop(1, '#c9c0ae');
  c.fillStyle = inner;
  c.beginPath(); c.arc(x, y, R * 1.06, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(120,105,80,0.18)'; c.lineWidth = 1.5;
  for (let k = 1; k <= 4; k++) { c.beginPath(); c.arc(x, y, R * (0.3 + k * 0.17), 0, TAU); c.stroke(); }
  const bulb = c.createRadialGradient(x - R * 0.08, y - R * 0.08, 1, x, y, R * 0.3);
  bulb.addColorStop(0, '#ffffff'); bulb.addColorStop(1, '#f2e2b8');
  c.fillStyle = bulb;
  c.beginPath(); c.arc(x, y, R * 0.28, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(160,130,60,0.5)'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(x - R * 0.1, y); c.lineTo(x - R * 0.03, y - R * 0.08); c.lineTo(x + R * 0.03, y + R * 0.06); c.lineTo(x + R * 0.1, y); c.stroke();
}

/** Round speaker grille: chrome ring, perforated metal, a badge. */
function paintGrille(c: C, x: number, y: number, R: number): void {
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.arc(x + 5 * view.U, y + 9 * view.U, R * 1.16, 0, TAU); c.fill();
  const ring = c.createLinearGradient(x - R, y - R, x + R, y + R);
  ring.addColorStop(0, '#f1f3f6'); ring.addColorStop(0.5, '#a9b0ba'); ring.addColorStop(1, '#e2e6eb');
  c.fillStyle = ring;
  c.beginPath(); c.arc(x, y, R * 1.16, 0, TAU); c.fill();
  c.fillStyle = '#3a3f48';
  c.beginPath(); c.arc(x, y, R * 1.04, 0, TAU); c.fill();
  const step = R * 0.11;
  c.fillStyle = '#16191e';
  for (let j = -10; j <= 10; j++) for (let i = -10; i <= 10; i++) {
    const px = x + (i + (j % 2 ? 0.5 : 0)) * step, py = y + j * step * 0.87;
    if (Math.hypot(px - x, py - y) > R * 0.98) continue;
    c.beginPath(); c.arc(px, py, step * 0.3, 0, TAU); c.fill();
  }
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
  c.beginPath(); c.arc(x, y, R * 1.1, Math.PI * 1.05, Math.PI * 1.5); c.stroke();
  c.fillStyle = '#e8665a';
  c.beginPath(); rrc(c, x, y + R * 0.72, R * 0.5, R * 0.16, R * 0.05); c.fill();
  text(c, 'HI-FI', x, y + R * 0.73, R * 0.1, '#fff', { font: 'bold' });
}

/** Toaster crumb tray, pulled out: brushed metal with ridges. */
function paintTray(c: C, x: number, y: number, R: number): void {
  const w = R * 2.5, h = R * 2.2;
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); rrc(c, x + 5 * view.U, y + 9 * view.U, w, h, R * 0.14); c.fill();
  const g = c.createLinearGradient(x - w / 2, y, x + w / 2, y);
  g.addColorStop(0, '#9aa1ab'); g.addColorStop(0.5, '#e4e7eb'); g.addColorStop(1, '#a4abb4');
  c.fillStyle = g;
  c.beginPath(); rrc(c, x, y, w, h, R * 0.14); c.fill();
  c.fillStyle = '#c4c9d0';
  c.beginPath(); rrc(c, x, y, w - R * 0.16, h - R * 0.16, R * 0.1); c.fill();
  c.strokeStyle = 'rgba(80,88,100,0.35)'; c.lineWidth = 2;
  for (let i = -5; i <= 5; i++) { c.beginPath(); c.moveTo(x - w * 0.42, y + i * h * 0.075); c.lineTo(x + w * 0.42, y + i * h * 0.075); c.stroke(); }
  c.fillStyle = '#e8665a';
  c.beginPath(); rrc(c, x, y + h / 2 - R * 0.06, R * 0.7, R * 0.16, R * 0.06); c.fill();
}

/** Music box mechanism: pinned brass cylinder and the steel comb over it. */
function paintComb(c: C, x: number, y: number, R: number): void {
  const w = R * 2.4;
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); rrc(c, x + 5 * view.U, y + 9 * view.U, w, R * 2.2, R * 0.12); c.fill();
  // wooden bed
  const wood = c.createLinearGradient(x, y - R, x, y + R);
  wood.addColorStop(0, '#9a6a42'); wood.addColorStop(1, '#6e4630');
  c.fillStyle = wood;
  c.beginPath(); rrc(c, x, y, w, R * 2.2, R * 0.12); c.fill();
  // cylinder with pins
  const cy = y + R * 0.45;
  const cyl = c.createLinearGradient(x, cy - R * 0.32, x, cy + R * 0.32);
  cyl.addColorStop(0, '#8a6a2a'); cyl.addColorStop(0.35, '#f2d27a'); cyl.addColorStop(1, '#7a5a22');
  c.fillStyle = cyl;
  c.beginPath(); rrc(c, x, cy, w * 0.86, R * 0.64, R * 0.3); c.fill();
  c.fillStyle = '#fff3c8';
  const r = rng(91);
  for (let i = 0; i < 60; i++) { c.beginPath(); c.arc(x + (r() - 0.5) * w * 0.8, cy + (r() - 0.5) * R * 0.5, R * 0.02, 0, TAU); c.fill(); }
  // comb: a steel bar with teeth reaching down to the pins
  const top = y - R * 0.75;
  c.fillStyle = '#c9ced6';
  c.beginPath(); rrc(c, x, top, w * 0.82, R * 0.36, R * 0.06); c.fill();
  const n = 18, tw = (w * 0.78) / n;
  for (let i = 0; i < n; i++) {
    const tx0 = x - w * 0.39 + i * tw + tw * 0.15;
    const len = R * (0.95 - Math.abs(i - n / 2) * 0.02);
    const tg = c.createLinearGradient(tx0, 0, tx0 + tw * 0.7, 0);
    tg.addColorStop(0, '#e9edf2'); tg.addColorStop(1, '#9aa1ab');
    c.fillStyle = tg;
    c.fillRect(tx0, top + R * 0.16, tw * 0.7, len);
  }
  c.fillStyle = '#5a5f68';
  for (const sx of [-0.3, 0, 0.3]) { c.beginPath(); c.arc(x + sx * w, top, R * 0.06, 0, TAU); c.fill(); }
}

/** Flashlight reflector: chrome parabola rings around the LED. */
function paintReflector(c: C, x: number, y: number, R: number): void {
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.arc(x + 5 * view.U, y + 9 * view.U, R * 1.16, 0, TAU); c.fill();
  c.fillStyle = '#2b3038';
  c.beginPath(); c.arc(x, y, R * 1.16, 0, TAU); c.fill();
  for (let k = 10; k >= 1; k--) {
    const rr2 = R * (0.12 + k * 0.095);
    const g = c.createLinearGradient(x - rr2, y - rr2, x + rr2, y + rr2);
    g.addColorStop(0, k % 2 ? '#ffffff' : '#d8dde4'); g.addColorStop(0.5, '#8d949e'); g.addColorStop(1, k % 2 ? '#eef1f5' : '#c4c9d0');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, rr2, 0, TAU); c.fill();
  }
  c.fillStyle = '#f4d35e';
  c.beginPath(); rrc(c, x, y, R * 0.22, R * 0.22, R * 0.04); c.fill();
  c.fillStyle = '#fff8dc';
  c.beginPath(); c.arc(x, y, R * 0.07, 0, TAU); c.fill();
}

function paintFan(c: C, x: number, y: number, R: number): void {
  const U = view.U;
  // square housing with corner screws
  const H = R * 2.3;
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); rrc(c, x + 4 * U, y + 8 * U, H, H, R * 0.28); c.fill();
  const hg = c.createLinearGradient(x - H / 2, y - H / 2, x + H / 2, y + H / 2);
  hg.addColorStop(0, '#4a505b'); hg.addColorStop(1, '#2b3038');
  c.fillStyle = hg;
  c.beginPath(); rrc(c, x, y, H, H, R * 0.28); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 2;
  c.beginPath(); rrc(c, x, y, H - 4, H - 4, R * 0.26); c.stroke();
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const px = x + sx * H * 0.4, py = y + sy * H * 0.4;
    c.fillStyle = '#1d2026'; c.beginPath(); c.arc(px, py, R * 0.09, 0, TAU); c.fill();
    c.fillStyle = '#9aa1ab'; c.beginPath(); c.arc(px, py, R * 0.055, 0, TAU); c.fill();
  }
  // well and blades
  c.fillStyle = '#15181d';
  c.beginPath(); c.arc(x, y, R * 1.02, 0, TAU); c.fill();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    c.save();
    c.translate(x, y);
    c.rotate(a);
    const bg = c.createLinearGradient(0, -R * 0.2, R, R * 0.2);
    bg.addColorStop(0, '#d7dbe1'); bg.addColorStop(1, '#8f96a0');
    c.fillStyle = bg;
    c.beginPath();
    c.moveTo(R * 0.25, -R * 0.08);
    c.quadraticCurveTo(R * 0.7, -R * 0.42, R * 0.96, -R * 0.2);
    c.quadraticCurveTo(R * 0.8, R * 0.18, R * 0.25, R * 0.12);
    c.closePath();
    c.fill();
    c.restore();
  }
  const hub = c.createRadialGradient(x - R * 0.1, y - R * 0.1, 1, x, y, R * 0.3);
  hub.addColorStop(0, '#5a606b'); hub.addColorStop(1, '#2a2e35');
  c.fillStyle = hub;
  c.beginPath(); c.arc(x, y, R * 0.3, 0, TAU); c.fill();
  c.fillStyle = '#ffb347';
  c.beginPath(); c.arc(x, y, R * 0.2, 0, TAU); c.fill();
  text(c, '12V', x, y + 1, R * 0.12, '#5a3200', { font: 'bold' });
  // chrome grille on top
  c.strokeStyle = '#c3c8cf'; c.lineWidth = Math.max(1.5, R * 0.025);
  for (let k = 1; k <= 4; k++) { c.beginPath(); c.arc(x, y, R * (0.25 + k * 0.19), 0, TAU); c.stroke(); }
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8;
    c.beginPath(); c.moveTo(x + Math.cos(a) * R * 1.02, y + Math.sin(a) * R * 1.02); c.lineTo(x - Math.cos(a) * R * 1.02, y - Math.sin(a) * R * 1.02); c.stroke();
  }
  c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 1;
  for (let k = 1; k <= 4; k++) { c.beginPath(); c.arc(x, y, R * (0.25 + k * 0.19), Math.PI * 1.05, Math.PI * 1.45); c.stroke(); }
}

function drawDust(c: C, x: number, y: number, r: number, d: Dust, a: number): void {
  c.save();
  c.globalAlpha = a;
  c.translate(x, y);
  c.rotate(d.rot);
  c.fillStyle = 'rgba(0,0,0,0.18)';
  c.beginPath(); c.ellipse(r * 0.15, r * 0.35, r * 1.1, r * 0.75, 0, 0, TAU); c.fill();
  for (let i = 0; i < d.blobs.length; i += 3) {
    c.fillStyle = d.tone;
    c.beginPath(); c.arc(d.blobs[i] * r, d.blobs[i + 1] * r, d.blobs[i + 2] * r, 0, TAU); c.fill();
  }
  for (let i = 0; i < d.blobs.length; i += 3) {
    c.fillStyle = 'rgba(255,255,255,0.28)';
    c.beginPath(); c.arc(d.blobs[i] * r - r * 0.12, d.blobs[i + 1] * r - r * 0.15, d.blobs[i + 2] * r * 0.55, 0, TAU); c.fill();
  }
  // a stray hair or two
  c.strokeStyle = 'rgba(90,85,78,0.5)'; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(-r, r * 0.2); c.quadraticCurveTo(0, -r * 0.9, r * 1.2, -r * 0.1); c.stroke();
  c.restore();
}

/** Rubber bulb blower: bulb at (x, y), nozzle up-left. */
function drawBulb(c: C, x: number, y: number, squash: number, resting: boolean): void {
  const U = view.U;
  c.save();
  c.translate(x, y);
  c.rotate(Math.atan2(-0.85, -0.52) + Math.PI / 2);
  // shadow
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(10 * U, 14 * U, 26 * U, 34 * U, 0, 0, TAU); c.fill();
  // nozzle: a tapered tube from the bulb to the tip (local -y)
  const ng = c.createLinearGradient(-6 * U, 0, 6 * U, 0);
  ng.addColorStop(0, '#2b2d33'); ng.addColorStop(0.45, '#6b6f78'); ng.addColorStop(1, '#2b2d33');
  c.fillStyle = ng;
  c.beginPath();
  c.moveTo(-7 * U, -24 * U); c.lineTo(-2.5 * U, -96 * U); c.lineTo(2.5 * U, -96 * U); c.lineTo(7 * U, -24 * U);
  c.closePath(); c.fill();
  c.fillStyle = '#1b1c20';
  c.beginPath(); c.ellipse(0, -96 * U, 2.6 * U, 1.2 * U, 0, 0, TAU); c.fill();
  // collar
  c.fillStyle = '#3a3c43';
  c.beginPath(); rrc(c, 0, -26 * U, 18 * U, 8 * U, 3 * U); c.fill();
  // bulb, squashed on each puff
  const sx = 1 + squash * 0.18, sy = 1 - squash * 0.22;
  c.save();
  c.translate(0, 8 * U);
  c.scale(sx, sy);
  const bg = c.createRadialGradient(-9 * U, -10 * U, 2 * U, 0, 0, 30 * U);
  bg.addColorStop(0, '#ff8a7a'); bg.addColorStop(0.5, '#e0453a'); bg.addColorStop(1, '#8e1f1a');
  c.fillStyle = bg;
  c.beginPath(); c.ellipse(0, 0, 24 * U, 30 * U, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.45)';
  c.beginPath(); c.ellipse(-9 * U, -12 * U, 6 * U, 10 * U, 0.4, 0, TAU); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(0, 27 * U, 12 * U, 4 * U, 0, 0, TAU); c.fill();
  c.restore();
  void resting;
  c.restore();
}

// ---------------- slime ----------------

interface Crumb { u: number; v: number; kind: number; size: number; rot: number; tone: string; got: boolean; ox: number; oy: number; seed: number }

function slimeGame(crumbs: number, seed: number, color: string): Game {
  const r = rng(seed * 389 + crumbs);
  const n = clamp(Math.round(crumbs), 3, 60);
  const col = hex(color, '#8be0c8');
  const NC = 5, NR = 4;
  const kbL = layer();
  const kb = (b: Board) => {
    const w = b.w * 0.88, k = Math.min(w / NC, (b.h * 0.6) / NR);
    const gw = k * NC, gh = k * NR;
    return { k, x: b.x + (b.w - gw) / 2, y: b.y + b.h * 0.07, w: gw, h: gh };
  };
  // crumbs sit in the gaps between keys (plate units 0..1)
  const C: Crumb[] = Array.from({ length: n }, () => {
    const vert = r() < 0.5;
    const u = vert ? Math.floor(1 + r() * (NC - 1)) / NC : 0.04 + r() * 0.92;
    const v = vert ? 0.04 + r() * 0.92 : Math.floor(1 + r() * (NR - 1)) / NR;
    return {
      u: u + (r() - 0.5) * 0.012, v: v + (r() - 0.5) * 0.012, kind: Math.floor(r() * 4), size: 0.95 + r() * 0.6, rot: r() * TAU,
      tone: ['#c99a5b', '#e3c18c', '#7a5a3a', '#3b332c', '#f2e6cf'][Math.floor(r() * 5)], got: false, ox: 0, oy: 0, seed: r(),
    };
  });
  let gx = NaN, gy = NaN, tgx = 0, tgy = 0, vx = 0, vy = 0;
  let held = false, offX = 0, offY = 0;
  let pk = 0, pv = 0; // press spring (jelly wobble)
  let travel = 0, gotT = 0, clock = 0;
  let got = 0;

  const R0 = (b: Board) => b.w * 0.11;
  const crumbPos = (q: Crumb, b: Board) => { const k = kb(b); return { x: k.x + q.u * k.w, y: k.y + q.v * k.h }; };

  return {
    get title() { return tx('Clean with gel', 'Lau bằng gel'); },
    get sub() { return tx('Press the gel into the gaps to lift the crumbs', 'Ấn gel vào khe để hút sạch vụn'); },
    skin: 'mat',
    progress: () => got / n,
    solved: () => got >= n,
    update(dt, b) {
      dt = Math.min(dt, 0.05);
      clock += dt;
      if (Number.isNaN(gx)) { gx = tgx = b.x + b.w * 0.5; gy = tgy = b.y + b.h * 0.86; }
      const px = gx, py = gy;
      const f = 1 - Math.exp(-dt * 22);
      gx += (tgx - gx) * f; gy += (tgy - gy) * f;
      const ivx = (gx - px) / Math.max(dt, 1e-3), ivy = (gy - py) / Math.max(dt, 1e-3);
      vx += (ivx - vx) * 0.3; vy += (ivy - vy) * 0.3;
      pv += ((held ? 1 : 0) - pk) * 140 * dt - pv * 10 * dt;
      pk += pv * dt;
      gotT -= dt;
      if (!held || pk < 0.45) return;
      const R = R0(b) * (1 + 0.32 * pk);
      for (const q of C) {
        if (q.got) continue;
        const p = crumbPos(q, b);
        const d = dist(p.x, p.y, gx, gy);
        if (d > R * 0.85) continue;
        q.got = true;
        got++;
        q.ox = (p.x - gx) / R * 0.85; q.oy = (p.y - gy) / R * 0.85;
        if (gotT <= 0) { gotT = 0.06; sfx.bubble(); haptic(6); }
      }
    },
    down(x, y, b) {
      const R = R0(b);
      held = true;
      if (dist(x, y, gx, gy) < R * 1.5) { offX = gx - x; offY = gy - y; }
      else { offX = 0; offY = 0; }
      tgx = x + offX; tgy = y + offY;
      sfx.squish();
      haptic(10);
      travel = 0;
    },
    move(x, y, b) {
      if (!held) return;
      const nx = clamp(x + offX, b.x + 20 * view.U, b.x + b.w - 20 * view.U), ny = clamp(y + offY, b.y + 20 * view.U, b.y + b.h - 20 * view.U);
      travel += dist(nx, ny, tgx, tgy);
      tgx = nx; tgy = ny;
      if (travel > 130 * view.U) { travel = 0; sfx.squish(); }
    },
    up() {
      if (!held) return;
      held = false;
      sfx.squish();
      haptic(6);
    },
    draw(c, b, time) {
      const U = view.U;
      const k = kb(b);
      const m = 10 * U;
      const img = kbL(`${Math.round(k.w)}x${Math.round(k.h)}`, k.w + m * 2, k.h + m * 2, (s) => paintKeys(s, m, m, k.k, NC, NR));
      c.drawImage(img, k.x - m, k.y - m, k.w + m * 2, k.h + m * 2);
      for (const q of C) {
        if (q.got) continue;
        const p = crumbPos(q, b);
        drawCrumb(c, p.x, p.y, q, 1);
      }
      if (Number.isNaN(gx)) return;
      // the gel: a wobbly, stretchy, see-through blob
      const R = R0(b) * (1 + 0.32 * pk);
      const sp = Math.hypot(vx, vy);
      const st = clamp(sp / (1600 * U), 0, 0.28);
      const va = Math.atan2(vy, vx);
      const N = 20;
      const pts: number[] = [];
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU;
        const rr2 = R * (1 + 0.045 * Math.sin(3 * a + time * 2.3) + 0.03 * Math.sin(5 * a - time * 3.1) + st * Math.cos(2 * (a - va)) - st * 0.4);
        pts.push(gx + Math.cos(a) * rr2, gy + Math.sin(a) * rr2);
      }
      const blob = new Path2D();
      for (let i = 0; i <= N; i++) {
        const j = (i % N) * 2, nj = ((i + 1) % N) * 2;
        const mx = (pts[j] + pts[nj]) / 2, my = (pts[j + 1] + pts[nj + 1]) / 2;
        if (i === 0) blob.moveTo(mx, my); else blob.quadraticCurveTo(pts[j], pts[j + 1], mx, my);
      }
      blob.closePath();
      c.save();
      c.translate(3 * U, 7 * U * (1 - pk * 0.6));
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fill(blob);
      c.restore();
      const g = c.createRadialGradient(gx - R * 0.3, gy - R * 0.35, R * 0.1, gx, gy, R * 1.1);
      g.addColorStop(0, rgba(col, 0.55)); g.addColorStop(0.7, rgba(col, 0.72)); g.addColorStop(1, rgba(darker(col, 0.3), 0.9));
      c.fillStyle = g;
      c.fill(blob);
      // crumbs caught inside
      c.save();
      c.clip(blob);
      for (const q of C) {
        if (!q.got) continue;
        const w = 1 + 0.04 * Math.sin(time * 3 + q.seed * 10);
        drawCrumb(c, gx + q.ox * R * w, gy + q.oy * R * w, q, 0.75);
      }
      c.fillStyle = rgba(col, 0.25);
      c.fill(blob);
      c.restore();
      c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2 * U;
      c.stroke(blob);
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.beginPath(); c.ellipse(gx - R * 0.38, gy - R * 0.42, R * 0.3, R * 0.15, -0.6, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.beginPath(); c.arc(gx + R * 0.35, gy - R * 0.2, R * 0.06, 0, TAU); c.fill();
      c.beginPath(); c.arc(gx - R * 0.1, gy + R * 0.45, R * 0.035, 0, TAU); c.fill();
      void clock;
    },
    hint(c, b, time) {
      if (held || Number.isNaN(gx)) return;
      let best: Crumb | null = null, bd = Infinity;
      for (const q of C) {
        if (q.got) continue;
        const p = crumbPos(q, b), d = dist(p.x, p.y, gx, gy);
        if (d < bd) { bd = d; best = q; }
      }
      if (!best) return;
      const p = crumbPos(best, b);
      const k = easeOut(Math.min(1, ((time * 0.6) % 1) * 1.3));
      hand(c, gx + (p.x - gx) * k, gy + (p.y - gy) * k, view.U * 1.05, k < 0.05 ? 1 : 0);
    },
  };
}

const KEYS = 'QWERTASDFGZXCVB12345';

function paintKeys(c: C, x: number, y: number, k: number, nc: number, nr: number): void {
  const U = view.U;
  const w = k * nc, h = k * nr;
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); rr(c, x + 3 * U, y + 7 * U, w, h, 12 * U); c.fill();
  c.fillStyle = '#1b1d22';
  c.beginPath(); rr(c, x, y, w, h, 12 * U); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = 2;
  c.beginPath(); rr(c, x + 1, y + 1, w - 2, h - 2, 11 * U); c.stroke();
  const pad = k * 0.09;
  for (let j = 0; j < nr; j++) for (let i = 0; i < nc; i++) {
    const cx = x + (i + 0.5) * k, cy = y + (j + 0.5) * k, s = k - pad * 2;
    c.fillStyle = '#9a978f';
    c.beginPath(); rrc(c, cx, cy + 3 * U, s, s, k * 0.16); c.fill();
    const g = c.createLinearGradient(0, cy - s / 2, 0, cy + s / 2);
    g.addColorStop(0, '#fbfaf6'); g.addColorStop(1, '#dedbd2');
    c.fillStyle = g;
    c.beginPath(); rrc(c, cx, cy, s, s - 3 * U, k * 0.16); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.05)';
    c.beginPath(); rrc(c, cx, cy + 1 * U, s * 0.74, s * 0.66, k * 0.14); c.fill();
    text(c, KEYS[(j * nc + i) % KEYS.length], cx - s * 0.22, cy - s * 0.2, k * 0.2, '#6d6a63', { font: 'bold' });
  }
}

function drawCrumb(c: C, x: number, y: number, q: Crumb, a: number): void {
  const U = view.U, s = q.size * U;
  c.save();
  c.globalAlpha = a;
  c.translate(x, y);
  c.rotate(q.rot);
  if (q.kind === 0) {
    // bread / biscuit crumb
    c.fillStyle = shade(q.tone, -0.3);
    c.beginPath(); c.moveTo(-4 * s, -2 * s); c.lineTo(3 * s, -3.5 * s); c.lineTo(4.5 * s, 1.5 * s); c.lineTo(-1 * s, 3.5 * s); c.lineTo(-4.5 * s, 1 * s); c.closePath(); c.fill();
    c.fillStyle = q.tone;
    c.beginPath(); c.moveTo(-3.4 * s, -2 * s); c.lineTo(2.6 * s, -3 * s); c.lineTo(3.6 * s, 0.8 * s); c.lineTo(-1 * s, 2.4 * s); c.closePath(); c.fill();
  } else if (q.kind === 1) {
    // hair
    c.strokeStyle = '#3b2f28'; c.lineWidth = 1.1 * U; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-9 * s, 0); c.bezierCurveTo(-4 * s, -6 * s, 3 * s, 5 * s, 10 * s, -2 * s); c.stroke();
  } else if (q.kind === 2) {
    // specks of grit
    c.fillStyle = '#4a4038';
    c.beginPath(); c.arc(0, 0, 1.8 * s, 0, TAU); c.arc(3 * s, 1.5 * s, 1.1 * s, 0, TAU); c.arc(-2 * s, 2.2 * s, 0.9 * s, 0, TAU); c.fill();
  } else {
    // fluff
    c.fillStyle = 'rgba(220,214,204,0.9)';
    c.beginPath(); c.arc(-2 * s, 0, 2.6 * s, 0, TAU); c.arc(1.5 * s, -1 * s, 2.3 * s, 0, TAU); c.arc(1 * s, 1.8 * s, 2 * s, 0, TAU); c.fill();
  }
  c.restore();
}

// ---------------- wind (cassette tape / clockwork spring) ----------------

function windGame(turns: number, look: 'tape' | 'spring', tutorial: boolean): Game {
  const total = clamp(turns, 1, 12) * TAU;
  const shellL = layer(), plateL = layer();
  let wound = 0, rot = 0;
  let last = NaN;
  let tickAcc = 0, halfAcc = 0, turnN = 0;
  let loop = 1, done = false, doneT = 0;
  let held = false;

  const geo = (b: Board) => {
    const w = b.w * 0.9, h = w * 0.64;
    const cx = b.x + b.w / 2, cy = b.y + b.h * 0.34;
    return { w, h, cx, cy, lx: cx - w * 0.25, rx: cx + w * 0.25, ry: cy - h * 0.06, hr: w * 0.06 };
  };
  const spring = (b: Board) => {
    const R = Math.min(b.w * 0.3, b.h * 0.25);
    return { x: b.x + b.w / 2, y: b.y + b.h * 0.47, R };
  };
  /** What the finger circles: the pencilled reel, or the winding key. */
  const pivot = (b: Board) => {
    if (look === 'spring') { const s = spring(b); return { x: s.x, y: s.y, ar: s.R * 1.05 }; }
    const g = geo(b);
    return { x: g.lx, y: g.ry, ar: g.hr * 3.4 };
  };

  const drawCassette = (c: C, b: Board, k: number, time: number) => {
    const U = view.U;
    const g = geo(b);
    const x0 = g.cx - g.w / 2, y0 = g.cy - g.h / 2;
    const m = 12 * U;
    const img = shellL(`${Math.round(g.w)}`, g.w + m * 2, g.h + m * 2, (s) => paintCassette(s, m, m, g.w, g.h, g.lx - x0 + m, g.rx - x0 + m, g.ry - y0 + m, g.hr));
    // loose tape loop hanging out the bottom
    const by = y0 + g.h - 8 * U;
    const ax = g.cx - g.w * 0.21, zx = g.cx + g.w * 0.21;
    const L = loop * Math.min(b.h * 0.42, b.y + b.h - by - 20 * U);
    const sway = Math.sin(time * 1.6) * 8 * U * loop;
    c.save();
    c.lineCap = 'round';
    const tape = () => {
      c.beginPath();
      c.moveTo(ax, by);
      if (L < 2 * U) { c.lineTo(zx, by); return; }
      c.bezierCurveTo(ax - 30 * U * loop, by + L * 0.5, g.cx - g.w * 0.3 + sway, by + L, g.cx + sway * 0.5, by + L * 0.92);
      c.bezierCurveTo(g.cx + g.w * 0.28 + sway, by + L * 0.84, zx + 20 * U * loop, by + L * 0.62, g.cx + 10 * U, by + L * 0.38);
      c.bezierCurveTo(g.cx - 18 * U, by + L * 0.2, zx - 10 * U, by + L * 0.15, zx, by);
    };
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 7 * U;
    c.save(); c.translate(3 * U, 6 * U); tape(); c.stroke(); c.restore();
    c.strokeStyle = '#4a2c18'; c.lineWidth = 6 * U; tape(); c.stroke();
    c.strokeStyle = 'rgba(255,214,170,0.35)'; c.lineWidth = 1.5 * U;
    c.save(); c.translate(-1 * U, -1.5 * U); tape(); c.stroke(); c.restore();
    c.restore();
    c.drawImage(img, x0 - m, y0 - m, g.w + m * 2, g.h + m * 2);

    // tape packs through the window, then the hubs
    c.save();
    c.beginPath(); rrc(c, g.cx, g.ry, g.w * 0.66, g.hr * 4.4, g.hr * 0.8); c.clip();
    const pack = (x: number, pr: number) => {
      c.fillStyle = '#3d2414';
      c.beginPath(); c.arc(x, g.ry, pr, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,200,150,0.12)'; c.lineWidth = 1;
      for (let q = g.hr * 1.3; q < pr; q += 3 * U) { c.beginPath(); c.arc(x, g.ry, q, 0, TAU); c.stroke(); }
    };
    pack(g.lx, g.hr * (1.6 + 1.5 * k));
    pack(g.rx, g.hr * 2.6);
    c.fillStyle = 'rgba(255,255,255,0.1)';
    c.fillRect(g.cx - g.w * 0.33, g.ry - g.hr * 2.2, g.w * 0.66, g.hr * 0.8);
    c.restore();
    drawHub(c, g.rx, g.ry, g.hr, rot * 0.7);
    drawHub(c, g.lx, g.ry, g.hr, rot);
    drawPencil(c, g.lx, g.ry, g.hr, rot);
  };

  const drawSpring = (c: C, b: Board, k: number, time: number) => {
    const U = view.U;
    const s = spring(b);
    const R = s.R;
    // brass movement plate with jewels and screws (static)
    const pw = b.w * 0.9, ph = Math.min(b.h * 0.8, R * 3.6), m = 12 * U;
    const py = s.y - ph / 2 + R * 0.1;
    const img = plateL(`${Math.round(pw)}x${Math.round(ph)}`, pw + m * 2, ph + m * 2, (p) => paintPlate(p, m, m, pw, ph));
    c.drawImage(img, s.x - pw / 2 - m, py - m, pw + m * 2, ph + m * 2);
    // the train: gears turn off the barrel, faster as they get smaller
    const gears: [number, number, number, number, string][] = [
      [s.x + R * 1.0, s.y - R * 1.0, R * 0.42, 14, '#e8c66a'],
      [s.x + R * 0.5, s.y - R * 1.46, R * 0.2, 8, '#cfd5dc'],
      [s.x - R * 0.98, s.y + R * 1.08, R * 0.36, 12, '#cfd5dc'],
      [s.x + R * 1.04, s.y + R * 0.98, R * 0.28, 10, '#e8c66a'],
    ];
    gears.forEach(([x, y, r, n, col], i) => drawGear(c, x, y, r, n, -rot * (R / r) * 0.25 * (i % 2 ? -1 : 1), col));
    // barrel: a toothed drum with the mainspring visible inside
    drawGear(c, s.x, s.y, R * 0.98, 36, rot * 0.25, '#d9b04f');
    c.fillStyle = '#2b2a2e';
    c.beginPath(); c.arc(s.x, s.y, R * 0.8, 0, TAU); c.fill();
    const ig = c.createRadialGradient(s.x, s.y, R * 0.2, s.x, s.y, R * 0.8);
    ig.addColorStop(0, 'rgba(80,90,110,0.4)'); ig.addColorStop(1, 'rgba(0,0,0,0.4)');
    c.fillStyle = ig;
    c.beginPath(); c.arc(s.x, s.y, R * 0.8, 0, TAU); c.fill();
    // mainspring: loose wide coils that pull in tight round the arbor as it winds
    const coils = 3.5 + k * 5;
    const r0 = R * 0.2, r1 = R * (0.74 - 0.34 * k);
    const sp = (w: number, col: string, dy: number) => {
      c.strokeStyle = col; c.lineWidth = w;
      c.beginPath();
      const N = 220;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const a = t * coils * TAU + rot;
        const rr2 = r0 + (r1 - r0) * t;
        const x = s.x + Math.cos(a) * rr2, y = s.y + Math.sin(a) * rr2 + dy;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      // the outer end hooks to the barrel wall
      const ea = coils * TAU + rot;
      c.lineTo(s.x + Math.cos(ea + 0.25) * R * 0.78, s.y + Math.sin(ea + 0.25) * R * 0.78 + dy);
      c.stroke();
    };
    c.lineCap = 'round'; c.lineJoin = 'round';
    sp(3.6 * U, '#121316', 1.5 * U);
    sp(2.6 * U, '#7d93ad', 0);
    sp(0.9 * U, 'rgba(230,240,255,0.7)', -0.8 * U);
    // arbor
    c.fillStyle = '#b8bec6';
    c.beginPath(); c.arc(s.x, s.y, R * 0.2, 0, TAU); c.fill();
    // butterfly key, turning with the finger
    drawKey(c, s.x, s.y, R * 0.62, rot);
    if (done) {
      const g = Math.max(0, 1 - doneT * 2);
      c.fillStyle = `rgba(255,236,150,${0.35 * g})`;
      c.beginPath(); c.arc(s.x, s.y, R * (1 + doneT), 0, TAU); c.fill();
    }
    void time;
  };

  return {
    get title() { return look === 'spring' ? tx('Wind the spring', 'Lên dây cót') : tx('Wind the tape back', 'Quấn lại băng'); },
    get sub() { return look === 'spring' ? tx('Turn the key in circles', 'Xoay vòng quanh chìa để lên dây') : tx('Circle around the reel to wind the tape in', 'Xoay vòng quanh trục để quấn băng'); },
    skin: 'mat',
    progress: () => Math.min(1, wound / total),
    solved: () => done && doneT > 0.25,
    update(dt) {
      const k = Math.min(1, wound / total);
      loop += (1 - k - loop) * Math.min(1, dt * 10);
      if (done) doneT += dt;
    },
    down(x, y, b) {
      if (done) return;
      held = true;
      const p = pivot(b);
      last = dist(x, y, p.x, p.y) > 14 * view.U ? Math.atan2(y - p.y, x - p.x) : NaN;
    },
    move(x, y, b) {
      if (!held || done) return;
      const p = pivot(b);
      if (dist(x, y, p.x, p.y) < 14 * view.U) { last = NaN; return; }
      const a = Math.atan2(y - p.y, x - p.x);
      if (Number.isNaN(last)) { last = a; return; }
      const da = clamp(wrapAng(a - last), -1.2, 1.2);
      last = a;
      // either direction winds; the reel shows which way it turned
      wound += Math.abs(da);
      rot += da;
      tickAcc += Math.abs(da);
      halfAcc += Math.abs(da);
      while (tickAcc >= Math.PI / 6) { tickAcc -= Math.PI / 6; sfx.tick(); }
      while (halfAcc >= Math.PI) {
        halfAcc -= Math.PI;
        haptic(10);
        if (look === 'spring') sfx.place(); // the click wheel drops into its next tooth
      }
      if (Math.floor(wound / TAU) > turnN && wound < total) { turnN = Math.floor(wound / TAU); sfx.connect(turnN * 2); }
      if (wound >= total) {
        done = true;
        haptic(24);
        if (look === 'spring') {
          sfx.bell();
          emit('spark', p.x, p.y, 16, { color: ['#ffe28a', '#ffffff', '#ffd06a'], speed: 170, size: 7 });
          emit('ring', p.x, p.y, 1, { color: '#ffe28a', size: p.ar * 0.4, speed: 0, life: 0.6 });
        } else {
          const g = geo(b);
          sfx.snap();
          emit('spark', g.cx, g.cy + g.h / 2, 12, { color: ['#ffe28a', '#ffffff'], speed: 140, size: 6 });
        }
      }
    },
    up() { held = false; last = NaN; },
    draw(c, b, time) {
      const U = view.U;
      const k = Math.min(1, wound / total);
      if (look === 'spring') drawSpring(c, b, k, time); else drawCassette(c, b, k, time);
      if (done) return;
      // circular arrow around the pivot
      const p = pivot(b);
      const a0 = time * 0.8;
      const alpha = (tutorial ? 0.85 : 0.55) * (held ? 0.5 : 1);
      c.save();
      c.strokeStyle = `rgba(255,226,138,${alpha})`;
      c.lineWidth = 3.5 * U; c.lineCap = 'round';
      c.setLineDash([10 * U, 8 * U]);
      c.beginPath(); c.arc(p.x, p.y, p.ar, a0, a0 + Math.PI * 1.6); c.stroke();
      c.setLineDash([]);
      const ea = a0 + Math.PI * 1.6;
      c.translate(p.x + Math.cos(ea) * p.ar, p.y + Math.sin(ea) * p.ar); c.rotate(ea + Math.PI / 2);
      c.fillStyle = `rgba(255,226,138,${alpha})`;
      c.beginPath(); c.moveTo(9 * U, 0); c.lineTo(-6 * U, -8 * U); c.lineTo(-6 * U, 8 * U); c.closePath(); c.fill();
      c.restore();
      // turns counter
      const left = Math.max(0, Math.ceil((total - wound) / TAU - 1e-6));
      const ty = look === 'spring' ? spring(b).y + spring(b).R * 1.75 : p.y + p.ar + 18 * U;
      text(c, `${left} ↻`, p.x, ty, 15 * U, '#f4f1ea', { font: 'bold', shadow: true });
    },
    hint(c, b, time) {
      if (held || done) return;
      const p = pivot(b);
      const a = time * 3.2;
      hand(c, p.x + Math.cos(a) * p.ar, p.y + Math.sin(a) * p.ar, view.U * 1.05, 0);
    },
  };
}

function paintPlate(c: C, x: number, y: number, w: number, h: number): void {
  const U = view.U;
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); rr(c, x + 4 * U, y + 9 * U, w, h, 26 * U); c.fill();
  c.fillStyle = '#8a6a26';
  c.beginPath(); rr(c, x, y + 4 * U, w, h, 26 * U); c.fill();
  const g = c.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#f3d98c'); g.addColorStop(0.5, '#d8b257'); g.addColorStop(1, '#b88d33');
  c.fillStyle = g;
  c.beginPath(); rr(c, x, y, w, h, 26 * U); c.fill();
  // Geneva stripes
  c.save();
  c.beginPath(); rr(c, x, y, w, h, 26 * U); c.clip();
  for (let i = -6; i < 14; i++) {
    c.fillStyle = i % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(120,80,20,0.06)';
    c.save();
    c.translate(x + w / 2, y + h / 2); c.rotate(-0.5);
    c.fillRect(-w, i * 16 * U - h / 2, w * 2, 16 * U);
    c.restore();
  }
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2;
  c.beginPath(); rr(c, x + 3, y + 3, w - 6, h - 6, 24 * U); c.stroke();
  // jewels and screws
  for (const [jx, jy] of [[0.14, 0.12], [0.86, 0.5], [0.16, 0.6], [0.5, 0.94]]) {
    const px = x + w * jx, py = y + h * jy;
    c.fillStyle = '#c9a54a'; c.beginPath(); c.arc(px, py, 7 * U, 0, TAU); c.fill();
    const jg = c.createRadialGradient(px - 1.5 * U, py - 1.5 * U, 0.5, px, py, 4 * U);
    jg.addColorStop(0, '#ff9aa8'); jg.addColorStop(1, '#a3122a');
    c.fillStyle = jg; c.beginPath(); c.arc(px, py, 4 * U, 0, TAU); c.fill();
  }
  for (const [sx, sy] of [[0.07, 0.06], [0.93, 0.06], [0.07, 0.94], [0.93, 0.94]]) {
    const px = x + w * sx, py = y + h * sy;
    const sg = c.createRadialGradient(px - 2 * U, py - 2 * U, 0.5, px, py, 6 * U);
    sg.addColorStop(0, '#9fc0ff'); sg.addColorStop(1, '#2a4ea8');
    c.fillStyle = sg; c.beginPath(); c.arc(px, py, 6 * U, 0, TAU); c.fill();
    c.strokeStyle = '#1b2f66'; c.lineWidth = 1.6 * U;
    c.beginPath(); c.moveTo(px - 4 * U, py - 1.5 * U); c.lineTo(px + 4 * U, py + 1.5 * U); c.stroke();
  }
}

function drawGear(c: C, x: number, y: number, r: number, n: number, ang: number, col: string): void {
  c.save();
  c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath(); c.arc(2, 4, r, 0, TAU); c.fill();
  c.rotate(ang);
  const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, shade(col, 0.5)); g.addColorStop(1, shade(col, -0.25));
  c.fillStyle = g;
  c.beginPath();
  const t = r * 0.13;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, w = TAU / n;
    c.lineTo(Math.cos(a) * (r - t), Math.sin(a) * (r - t));
    c.lineTo(Math.cos(a + w * 0.15) * r, Math.sin(a + w * 0.15) * r);
    c.lineTo(Math.cos(a + w * 0.45) * r, Math.sin(a + w * 0.45) * r);
    c.lineTo(Math.cos(a + w * 0.6) * (r - t), Math.sin(a + w * 0.6) * (r - t));
  }
  c.closePath(); c.fill();
  c.strokeStyle = shade(col, -0.4); c.lineWidth = 1; c.stroke();
  // spokes cut out of the wheel
  if (r > 20 * view.U) {
    c.fillStyle = 'rgba(40,30,15,0.55)';
    for (let i = 0; i < 4; i++) {
      c.rotate(TAU / 4);
      c.beginPath(); c.arc(r * 0.5, 0, r * 0.22, 0, TAU); c.fill();
    }
  }
  c.fillStyle = shade(col, -0.3);
  c.beginPath(); c.arc(0, 0, r * 0.18, 0, TAU); c.fill();
  c.fillStyle = '#ffffff';
  c.beginPath(); c.arc(-r * 0.05, -r * 0.05, r * 0.06, 0, TAU); c.fill();
  c.restore();
}

/** Big brass butterfly key, seen from above, its wings spanning `r` each side. */
function drawKey(c: C, x: number, y: number, r: number, ang: number): void {
  const U = view.U;
  c.save();
  c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.save(); c.translate(4 * U, 8 * U); c.rotate(ang); keyPath(c, r); c.fill(); c.restore();
  c.rotate(ang);
  const g = c.createLinearGradient(-r, -r * 0.5, r, r * 0.5);
  g.addColorStop(0, '#fbe7a6'); g.addColorStop(0.5, '#e0b54c'); g.addColorStop(1, '#a87a22');
  c.fillStyle = g;
  keyPath(c, r);
  c.fill();
  c.strokeStyle = '#7d5a17'; c.lineWidth = 1.5 * U; c.stroke();
  // holes in the wings and a gloss line
  c.fillStyle = 'rgba(60,40,10,0.75)';
  c.beginPath(); c.ellipse(-r * 0.62, 0, r * 0.16, r * 0.2, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(r * 0.62, 0, r * 0.16, r * 0.2, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2 * U; c.lineCap = 'round';
  c.beginPath(); c.arc(-r * 0.62, 0, r * 0.3, Math.PI * 1.1, Math.PI * 1.5); c.stroke();
  c.beginPath(); c.arc(r * 0.62, 0, r * 0.3, Math.PI * 1.1, Math.PI * 1.5); c.stroke();
  // central boss
  const bg = c.createRadialGradient(-r * 0.06, -r * 0.06, 1, 0, 0, r * 0.2);
  bg.addColorStop(0, '#fff3c4'); bg.addColorStop(1, '#b88d33');
  c.fillStyle = bg;
  c.beginPath(); c.arc(0, 0, r * 0.2, 0, TAU); c.fill();
  c.restore();
}

function keyPath(c: C, r: number): void {
  c.beginPath();
  c.moveTo(-r * 0.12, -r * 0.12);
  c.bezierCurveTo(-r * 0.4, -r * 0.62, -r * 1.05, -r * 0.5, -r * 1.0, 0);
  c.bezierCurveTo(-r * 1.05, r * 0.5, -r * 0.4, r * 0.62, -r * 0.12, r * 0.12);
  c.lineTo(r * 0.12, r * 0.12);
  c.bezierCurveTo(r * 0.4, r * 0.62, r * 1.05, r * 0.5, r * 1.0, 0);
  c.bezierCurveTo(r * 1.05, -r * 0.5, r * 0.4, -r * 0.62, r * 0.12, -r * 0.12);
  c.closePath();
}

function paintCassette(c: C, x: number, y: number, w: number, h: number, lx: number, rx: number, ry: number, hr: number): void {
  const U = view.U;
  // shell
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); rr(c, x + 4 * U, y + 9 * U, w, h, 14 * U); c.fill();
  c.fillStyle = '#2b2e35';
  c.beginPath(); rr(c, x, y + 4 * U, w, h, 14 * U); c.fill();
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#585d68'); g.addColorStop(1, '#3a3e47');
  c.fillStyle = g;
  c.beginPath(); rr(c, x, y, w, h, 14 * U); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 2;
  c.beginPath(); rr(c, x + 3, y + 3, w - 6, h - 6, 12 * U); c.stroke();
  // label
  const cx = x + w / 2;
  const lg = c.createLinearGradient(0, y + h * 0.08, 0, y + h * 0.66);
  lg.addColorStop(0, '#fff3d6'); lg.addColorStop(1, '#f3dfb4');
  c.fillStyle = lg;
  c.beginPath(); rr(c, x + w * 0.06, y + h * 0.07, w * 0.88, h * 0.6, 8 * U); c.fill();
  c.fillStyle = '#ff8a5c';
  c.fillRect(x + w * 0.06, y + h * 0.5, w * 0.88, h * 0.05);
  c.fillStyle = '#5ec2c8';
  c.fillRect(x + w * 0.06, y + h * 0.56, w * 0.88, h * 0.03);
  text(c, 'MIXTAPE ♪', x + w * 0.1, y + h * 0.15, h * 0.09, '#6a4a36', { align: 'left' });
  text(c, 'A', x + w * 0.88, y + h * 0.15, h * 0.11, '#e8424f', { font: 'bold' });
  c.strokeStyle = 'rgba(106,74,54,0.3)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x + w * 0.36, y + h * 0.17); c.lineTo(x + w * 0.8, y + h * 0.17); c.stroke();
  // window
  c.fillStyle = '#1a1c21';
  c.beginPath(); rrc(c, cx, ry, w * 0.66, hr * 4.4, hr * 0.8); c.fill();
  // hub holes
  for (const hx of [lx, rx]) {
    c.fillStyle = '#e9e4d8';
    c.beginPath(); c.arc(hx, ry, hr * 1.55, 0, TAU); c.fill();
  }
  // head area with its holes
  c.fillStyle = '#30343c';
  c.beginPath();
  c.moveTo(x + w * 0.2, y + h); c.lineTo(x + w * 0.26, y + h * 0.78); c.lineTo(x + w * 0.74, y + h * 0.78); c.lineTo(x + w * 0.8, y + h);
  c.closePath(); c.fill();
  for (const k of [0.33, 0.43, 0.57, 0.67]) {
    c.fillStyle = '#16181c';
    c.beginPath(); rrc(c, x + w * k, y + h * 0.88, w * 0.035, h * 0.07, 2 * U); c.fill();
  }
  c.fillStyle = '#16181c';
  c.beginPath(); rrc(c, cx, y + h * 0.9, w * 0.07, h * 0.08, 2 * U); c.fill();
  // screws
  for (const [sx, sy] of [[0.04, 0.06], [0.96, 0.06], [0.04, 0.94], [0.96, 0.94], [0.5, 0.74]]) {
    const px = x + w * sx, py = y + h * sy;
    c.fillStyle = '#1a1c21'; c.beginPath(); c.arc(px, py, 4 * U, 0, TAU); c.fill();
    c.fillStyle = '#a7adb6'; c.beginPath(); c.arc(px, py, 2.8 * U, 0, TAU); c.fill();
    c.strokeStyle = '#555b64'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(px - 2 * U, py); c.lineTo(px + 2 * U, py); c.moveTo(px, py - 2 * U); c.lineTo(px, py + 2 * U); c.stroke();
  }
}

function drawHub(c: C, x: number, y: number, hr: number, ang: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.fillStyle = '#f6f2e8';
  c.beginPath(); c.arc(0, 0, hr * 1.25, 0, TAU); c.fill();
  c.strokeStyle = '#b9b3a4'; c.lineWidth = 1;
  c.stroke();
  c.fillStyle = '#23262c';
  c.beginPath(); c.arc(0, 0, hr * 0.9, 0, TAU); c.fill();
  // the six teeth that grip the spindle
  c.fillStyle = '#f6f2e8';
  for (let i = 0; i < 6; i++) {
    c.save();
    c.rotate((i / 6) * TAU);
    c.beginPath(); rr(c, hr * 0.5, -hr * 0.12, hr * 0.42, hr * 0.24, hr * 0.06); c.fill();
    c.restore();
  }
  c.restore();
}

/** A pencil pushed into the hub, leaning toward the viewer: its eraser end turns with the reel. */
function drawPencil(c: C, x: number, y: number, hr: number, ang: number): void {
  const U = view.U;
  const ex = x + hr * 0.9, ey = y + hr * 1.6;
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = hr * 1.3;
  c.beginPath(); c.moveTo(x + 4 * U, y + 6 * U); c.lineTo(ex + 6 * U, ey + 8 * U); c.stroke();
  c.strokeStyle = '#c99a1f'; c.lineWidth = hr * 1.25;
  c.beginPath(); c.moveTo(x, y); c.lineTo(ex, ey); c.stroke();
  c.strokeStyle = '#f5c638'; c.lineWidth = hr * 0.8;
  c.beginPath(); c.moveTo(x, y); c.lineTo(ex, ey); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = hr * 0.18;
  c.beginPath(); c.moveTo(x - hr * 0.2, y + hr * 0.1); c.lineTo(ex - hr * 0.2, ey + hr * 0.1); c.stroke();
  // end-on: hexagon, ferrule, eraser
  c.translate(ex, ey);
  c.rotate(ang);
  c.fillStyle = '#e8b62a';
  c.beginPath();
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; c.lineTo(Math.cos(a) * hr * 0.72, Math.sin(a) * hr * 0.72); }
  c.closePath(); c.fill();
  c.strokeStyle = '#b8871a'; c.lineWidth = 1; c.stroke();
  c.fillStyle = '#c3c8cf';
  c.beginPath(); c.arc(0, 0, hr * 0.58, 0, TAU); c.fill();
  c.fillStyle = '#f08ea0';
  c.beginPath(); c.arc(0, 0, hr * 0.46, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.beginPath(); c.arc(-hr * 0.15, -hr * 0.15, hr * 0.14, 0, TAU); c.fill();
  c.restore();
}
