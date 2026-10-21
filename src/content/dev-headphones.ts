// Studio over-ear headphones lying flat, cushions up: oval soft-touch teal cups
// held in brushed-aluminium yoke forks, steel sliders running up into a padded
// oat leatherette headband, plush memory-foam ear pads. Turned over: the outer
// cup caps with their brushed plates and copper trim, buttons on the right cup.
// A DJ's lucky pair: the pads are worn shiny, the aluminium is scuffed.

import { type C, type Pts, shade, rrc, rng, shapeFrom, ellPts, rrPath } from '../core/draw';
import { type DeviceDef, type PartDef, type Bump, screw } from './device';
import { pcb } from './kit';

const HOUSING = '#3f7471'; // matte soft-touch teal
const OAT = '#e6dac5'; // protein leather
const ALU = '#c9cdd2';
const COPPER = '#c98b5a';
const INK = '#1f2226';
const GOLD = '#e8c15a';
const SANS = '"Helvetica Neue", Arial, sans-serif';

// cups: ovals, taller than wide
const CUP_X = 100, CUP_Y = 50, CRX = 44, CRY = 56;
// yoke fork round the top half of each cup
const YG = 4, YW = 10; // gap to the cup, arm width
const YM = YG + YW / 2; // offset of the arm's centre line
// the arch the headband follows (centre line), its ends drop straight into the sliders
const A_Y = -34, A_RY = 84;
const YOKE_TOP = CUP_Y - CRY - YG - YW; // top of the fork's crown

function font(c: C, size: number, weight = 700): void {
  c.font = `${weight} ${size}px ${SANS}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
}

// ---------------- outline of the frame: a union of shapes, traced by marching squares ----------------

type SD = (x: number, y: number) => number;
const ellSD = (cx: number, cy: number, rx: number, ry: number): SD => (x, y) =>
  (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);
const boxSD = (x0: number, y0: number, x1: number, y1: number): SD => (x, y) => {
  const dx = Math.max(x0 - x, x - x1), dy = Math.max(y0 - y, y - y1);
  return dx > 0 || dy > 0 ? Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) : Math.max(dx, dy);
};
const circSD = (cx: number, cy: number, r: number): SD => (x, y) => Math.hypot(x - cx, y - cy) - r;
/** A band of half-width hw along an ellipse, only where y < cut. */
const ellBand = (cx: number, cy: number, rx: number, ry: number, hw: number, cut: number): SD => (x, y) =>
  Math.max(Math.abs(Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry) - hw, y - cut);

/** Trace the zero contour of a signed distance: the largest loop is the outline, the rest are holes. */
function trace(sd: SD, x0: number, y0: number, x1: number, y1: number, step = 1): { pts: Pts; holes: Pts[] } {
  const nx = Math.ceil((x1 - x0) / step) + 1, ny = Math.ceil((y1 - y0) / step) + 1;
  const v = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = sd(x0 + i * step, y0 + j * step);
  const V = (i: number, j: number) => v[j * nx + i];
  const pt = new Map<string, [number, number]>();
  const adj = new Map<string, string[]>();
  const edge = (h: boolean, i: number, j: number): string => {
    const k = `${h ? 'h' : 'v'}${i}_${j}`;
    if (!pt.has(k)) {
      const a = V(i, j), b = h ? V(i + 1, j) : V(i, j + 1);
      const t = a / (a - b);
      pt.set(k, h ? [x0 + (i + t) * step, y0 + j * step] : [x0 + i * step, y0 + (j + t) * step]);
    }
    return k;
  };
  const link = (a: string, b: string) => {
    (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
    (adj.get(b) ?? adj.set(b, []).get(b)!).push(a);
  };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = V(i, j) < 0, b = V(i + 1, j) < 0, c = V(i + 1, j + 1) < 0, d = V(i, j + 1) < 0;
    const n = (a ? 1 : 0) + (b ? 1 : 0) + (c ? 1 : 0) + (d ? 1 : 0);
    if (n === 0 || n === 4) continue;
    const T = () => edge(true, i, j), B = () => edge(true, i, j + 1), L = () => edge(false, i, j), R = () => edge(false, i + 1, j);
    if (a === c && b === d && a !== b) {
      // saddle: decide by the centre
      const mid = (V(i, j) + V(i + 1, j) + V(i + 1, j + 1) + V(i, j + 1)) / 4 < 0;
      if (mid === a) { link(T(), R()); link(B(), L()); } else { link(L(), T()); link(R(), B()); }
      continue;
    }
    const es: string[] = [];
    if (a !== b) es.push(T());
    if (b !== c) es.push(R());
    if (c !== d) es.push(B());
    if (d !== a) es.push(L());
    link(es[0], es[1]);
  }
  const seen = new Set<string>();
  const loops: Pts[] = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop: Pts = [];
    let prev = '', cur = start;
    while (!seen.has(cur)) {
      seen.add(cur);
      loop.push(pt.get(cur)!);
      const nb = adj.get(cur)!;
      const next = nb[0] !== prev ? nb[0] : nb[1];
      prev = cur; cur = next;
    }
    // thin the loop to ~1.6 unit spacing
    const thin: Pts = [loop[0]];
    for (const p of loop) { const q = thin[thin.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= 1.6) thin.push(p); }
    let area = 0;
    for (let k = 0; k < thin.length; k++) { const [ax, ay] = thin[k], [bx, by] = thin[(k + 1) % thin.length]; area += ax * by - bx * ay; }
    if (area < 0) thin.reverse();
    if (thin.length > 6) loops.push(thin);
  }
  const size = (p: Pts) => { let a = 0; for (let k = 0; k < p.length; k++) { const [ax, ay] = p[k], [bx, by] = p[(k + 1) % p.length]; a += ax * by - bx * ay; } return Math.abs(a); };
  loops.sort((p, q) => size(q) - size(p));
  return { pts: loops[0], holes: loops.slice(1) };
}

const FRAME_SD: SD = (() => {
  const parts: SD[] = [];
  for (const sx of [-1, 1]) {
    const cx = sx * CUP_X;
    parts.push(ellSD(cx, CUP_Y, CRX, CRY));
    parts.push(ellBand(cx, CUP_Y, CRX + YM, CRY + YM, YW / 2, CUP_Y));
    for (const s of [-1, 1]) parts.push(circSD(cx + s * (CRX + YM), CUP_Y, 9.5));
    parts.push(boxSD(cx - 4.5, A_Y - 4, cx + 4.5, YOKE_TOP + 2));
  }
  // the thin spring-steel band that runs inside the headband
  parts.push(ellBand(0, A_Y, CUP_X, A_RY, 2.5, A_Y));
  return (x, y) => { let m = Infinity; for (const f of parts) m = Math.min(m, f(x, y)); return m; };
})();
const FRAME_O = trace(FRAME_SD, -170, -130, 170, 120);
const FRAME = shapeFrom(FRAME_O.pts, FRAME_O.holes);
const cupPath = (cx: number, inset: number) => shapeFrom(ellPts(cx, CUP_Y, CRX - inset, CRY - inset, 64));

/** Brushed aluminium inside the current clip, brushed along the yoke. */
function brushed(c: C, x: number, y: number, w: number, h: number, seed: number): void {
  const g = c.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#c4c8ce'); g.addColorStop(0.35, '#80868e'); g.addColorStop(0.6, '#b3b8bf'); g.addColorStop(1, '#6c727a');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  const r = rng(seed);
  c.lineWidth = 0.35;
  for (let i = 0; i < (w * h) / 30; i++) {
    const px = x + r() * w, py = y + r() * h;
    c.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(60,66,76,0.18)';
    c.beginPath(); c.moveTo(px, py); c.lineTo(px + 4 + r() * 8, py + (r() - 0.5) * 1.2); c.stroke();
  }
}

/** Soft-touch plastic: matte colour with the faintest grain. */
function softTouch(c: C, path: Path2D, color: string, seed: number): void {
  const g = c.createLinearGradient(-60, -60, 60, 60);
  g.addColorStop(0, shade(color, 0.12)); g.addColorStop(1, shade(color, -0.12));
  c.fillStyle = g; c.fill(path);
  c.save(); c.clip(path);
  const r = rng(seed);
  for (let i = 0; i < 900; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    c.fillRect(-170 + r() * 340, -130 + r() * 250, 0.8, 0.8);
  }
  c.restore();
}

// right-cup buttons (front coords): vol−, play, vol+ along the lower right edge
const BTN = [0.32, 0.55, 0.78].map((a) => [CUP_X + Math.cos(a) * (CRX - 1.2), CUP_Y + Math.sin(a) * (CRY - 1.2)] as [number, number]);
const BUMPS: Bump[] = [
  ...BTN.map(([x, y], i) => ({ kind: 'cyl', x, y, w: i === 1 ? 8 : 6, height: 5, color: i === 1 ? COPPER : '#2d3a3a', metal: i === 1 }) as Bump),
  ...BTN.map(([x, y], i) => ({ kind: 'cyl', x: -x, y, w: i === 1 ? 8 : 6, height: 5, color: i === 1 ? COPPER : '#2d3a3a', metal: i === 1, view: 'B' }) as Bump),
];

const frame: PartDef = {
  id: 'frame', name: { en: 'Cups & Yoke Frame', vi: 'Khung tai nghe' }, side: 'A', z: 0, x: 0, y: 0, w: 316, h: 240, icon: '🎧',
  shape: FRAME, needs: ['driverL', 'driverR', 'board', 'battery', 'headband'], thick: 18, cavity: 8, round: 18, wall: 11, body: shade(HOUSING, -0.2),
  bumps: BUMPS,
  draw(c, s) {
    const back = s.view === 'B' && s.inDevice;
    c.save(); c.clip(FRAME);
    // aluminium everywhere first (yokes, pivots, sliders), then the cups over it
    brushed(c, -170, -130, 340, 250, 5);
    c.restore();
    // the steel band + slider stems: polished, with size notches on the sliders
    for (const sx of [-1, 1]) {
      const cx = sx * CUP_X;
      const g = c.createLinearGradient(cx - 4.5, 0, cx + 4.5, 0);
      g.addColorStop(0, '#7d838c'); g.addColorStop(0.35, '#ffffff'); g.addColorStop(0.7, '#c9ced6'); g.addColorStop(1, '#6a7079');
      c.fillStyle = g; c.fillRect(cx - 4.5, A_Y - 4, 9, YOKE_TOP - A_Y + 4);
      c.fillStyle = 'rgba(40,44,50,0.55)';
      for (let y = A_Y; y < YOKE_TOP - 2; y += 3.2) c.fillRect(cx - 3, y, 6, 0.8);
      // pivot hubs: chrome cap with a tiny torx
      for (const s2 of [-1, 1]) {
        const px = cx + s2 * (CRX + YM);
        const hg = c.createRadialGradient(px - 2, CUP_Y - 2, 0.5, px, CUP_Y, 6);
        hg.addColorStop(0, '#ffffff'); hg.addColorStop(0.6, '#b9bec6'); hg.addColorStop(1, '#6a7079');
        c.fillStyle = hg; c.beginPath(); c.arc(px, CUP_Y, 5.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#3a3f46'; c.beginPath(); c.arc(px, CUP_Y, 1.6, 0, Math.PI * 2); c.fill();
      }
    }
    // the cups: soft-touch housing, rim, inside
    for (const sx of [-1, 1]) {
      const cx = sx * CUP_X;
      const cup = cupPath(cx, 0);
      softTouch(c, cup, HOUSING, 3 + sx);
      // a fine chamfer ring where the cushion / cap seats
      c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 0.8; c.stroke(cupPath(cx, 6));
      const inner = cupPath(cx, 12);
      c.fillStyle = shade(HOUSING, -0.55); c.fill(inner);
      c.save(); c.clip(inner);
      c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 10; c.translate(2, 3); c.stroke(inner);
      c.restore();
      // which cup is which, as seen now (the back view is mirrored: the left cup sits on the right)
      const isLeft = back ? sx > 0 : sx < 0;
      if (!back) {
        // front baffle: black plastic, bass ports round the driver seat, the lead pads
        c.fillStyle = INK; c.beginPath(); c.ellipse(cx, CUP_Y, CRX - 15, CRY - 15, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#0b0c0e';
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          c.beginPath(); c.arc(cx + Math.cos(a) * 26, CUP_Y + Math.sin(a) * 36, 1.4, 0, Math.PI * 2); c.fill();
        }
        c.strokeStyle = '#3a3f48'; c.lineWidth = 2; c.beginPath(); c.arc(cx, CUP_Y, 23, 0, Math.PI * 2); c.stroke();
        c.fillStyle = GOLD;
        for (const dy of [-5, 5]) { c.beginPath(); c.arc(cx - sx * 26, CUP_Y + dy, 2.2, 0, Math.PI * 2); c.fill(); }
        font(c, 9, 800); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillText(isLeft ? 'L' : 'R', cx, CUP_Y - 36);
      } else {
        // back: the bays under the caps, screw posts top and bottom
        c.fillStyle = '#2a2d31'; c.beginPath(); c.ellipse(cx, CUP_Y, CRX - 15, CRY - 15, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 1.5;
        for (const k of [-14, 0, 14]) { c.beginPath(); c.moveTo(cx - 24, CUP_Y + k); c.lineTo(cx + 24, CUP_Y + k); c.stroke(); }
        for (const dy of [-40, 40]) {
          c.fillStyle = shade(HOUSING, -0.15); c.beginPath(); c.arc(cx, CUP_Y + dy, 6.5, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#15171a'; c.beginPath(); c.arc(cx, CUP_Y + dy, 2.6, 0, Math.PI * 2); c.fill();
        }
        if (isLeft) {
          // 3.5 mm jack at the bottom of the left cup
          c.fillStyle = '#9aa0a8'; c.beginPath(); c.arc(cx, CUP_Y + CRY - 6, 4, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#0d0e10'; c.beginPath(); c.arc(cx, CUP_Y + CRY - 6, 2.2, 0, Math.PI * 2); c.fill();
        }
      }
      // printed button legends beside the right cup's keys
      if ((!back && sx > 0) || (back && sx < 0)) {
        font(c, 4.6); c.fillStyle = 'rgba(255,255,255,0.75)';
        ['−', '▶', '+'].forEach((t, i) => {
          const a = [0.32, 0.55, 0.78][i];
          c.fillText(t, cx + (back ? -1 : 1) * Math.cos(a) * (CRX - 9), CUP_Y + Math.sin(a) * (CRY - 9));
        });
      }
    }
  },
};

// ---------------- headband: padded leatherette, straddling the frame's steel band ----------------

/** A point on the arch at angle a (−π..0 is the top), pushed `off` along its normal. */
function arch(a: number, off: number): [number, number] {
  const nx = Math.cos(a) / CUP_X, ny = Math.sin(a) / A_RY, l = Math.hypot(nx, ny);
  return [CUP_X * Math.cos(a) + (nx / l) * off, A_Y + A_RY * Math.sin(a) + (ny / l) * off];
}
function archRun(off: number, a0: number, a1: number, n = 56): Pts {
  const out: Pts = [];
  for (let i = 0; i <= n; i++) out.push(arch(a0 + ((a1 - a0) * i) / n, off));
  return out;
}
const PAD_HW = 15, PAD_END = 0.1;
const HEADBAND = shapeFrom([...archRun(PAD_HW, -Math.PI + PAD_END, -PAD_END), ...archRun(-PAD_HW, -PAD_END, -Math.PI + PAD_END)]);

const headband: PartDef = {
  id: 'headband', name: { en: 'Headband', vi: 'Quai đeo' }, side: 'F', z: 6, x: 0, y: 0, w: 230, h: 120, icon: '🌈',
  shape: HEADBAND, tool: 'sponge', elev: -11, thick: 22, round: 11, mat: 'rubber', body: shade(OAT, -0.18),
  draw(c, s) {
    const g = c.createLinearGradient(0, -130, 0, 0);
    g.addColorStop(0, shade(OAT, 0.12)); g.addColorStop(1, shade(OAT, -0.1));
    c.fillStyle = g; c.fill(HEADBAND);
    c.save(); c.clip(HEADBAND);
    // leather grain
    const r = rng(17);
    for (let i = 0; i < 1600; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(90,70,40,0.08)';
      c.fillRect(-120 + r() * 240, -130 + r() * 110, 0.9, 0.9);
    }
    // quilted baffles: soft creases across the pad, each puff lit on top
    for (let i = 1; i < 14; i++) {
      const a = -Math.PI + PAD_END + ((Math.PI - 2 * PAD_END) * i) / 14;
      const [x0, y0] = arch(a, -PAD_HW + 2), [x1, y1] = arch(a, PAD_HW - 2);
      c.strokeStyle = 'rgba(110,85,50,0.3)'; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(x0 + 1.2, y0 - 0.8); c.lineTo(x1 + 1.2, y1 - 0.8); c.stroke();
    }
    c.restore();
    // twin top-stitching along both edges
    c.strokeStyle = 'rgba(140,110,70,0.45)'; c.lineWidth = 0.7; c.setLineDash([2.6, 2]);
    for (const off of [PAD_HW - 3, -PAD_HW + 3]) {
      c.beginPath();
      for (const [x, y] of archRun(off, -Math.PI + PAD_END + 0.02, -PAD_END - 0.02, 80)) c.lineTo(x, y);
      c.stroke();
    }
    c.setLineDash([]);
    // chrome end caps where the sliders enter
    for (const a of [-Math.PI + PAD_END + 0.015, -PAD_END - 0.015]) {
      const [x0, y0] = arch(a, -PAD_HW), [x1, y1] = arch(a, PAD_HW);
      c.strokeStyle = '#d9dde3'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    }
    // debossed maker mark
    const [lx, ly] = arch(-Math.PI / 2, 0);
    font(c, 8, 800);
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillText('CHILL', lx, ly + 0.6);
    c.fillStyle = shade(OAT, -0.32); c.fillText('CHILL', lx, ly);
    if (s.broken) {
      c.fillStyle = 'rgba(120,90,60,0.55)';
      for (const a of [-2.4, -1.2, -0.7]) { const [x, y] = arch(a, 4); c.beginPath(); c.ellipse(x, y, 7, 4, a, 0, Math.PI * 2); c.fill(); }
    }
  },
};

// ---------------- ear cushions ----------------

const CUSH = shapeFrom(ellPts(0, 0, CRX - 1, CRY - 1, 64), [ellPts(0, 0, 21, 30, 48)]);
function cushion(id: string, sx: number, en: string, vi: string): PartDef {
  return {
    id, name: { en, vi }, side: 'F', z: 6, x: sx * CUP_X, y: CUP_Y, w: CRX * 2, h: CRY * 2, icon: '⭕',
    shape: CUSH, tool: 'sponge', elev: 15, thick: 18, round: 10, mat: 'rubber', body: shade(OAT, -0.22),
    draw(c, s) {
      const g = c.createRadialGradient(-14, -18, 6, 0, 0, CRY);
      g.addColorStop(0, '#fbf5ea'); g.addColorStop(0.6, OAT); g.addColorStop(1, shade(OAT, -0.18));
      c.fillStyle = g; c.fill(CUSH);
      c.save(); c.clip(CUSH);
      // soft wrinkles gathered toward the opening
      const r = rng(sx > 0 ? 31 : 29);
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2 + r() * 0.1;
        const k0 = 0.62 + r() * 0.06, k1 = 0.8 + r() * 0.1;
        c.strokeStyle = 'rgba(120,95,60,0.22)'; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(Math.cos(a) * (CRX - 1) * k0, Math.sin(a) * (CRY - 1) * k0); c.lineTo(Math.cos(a) * (CRX - 1) * k1, Math.sin(a) * (CRY - 1) * k1); c.stroke();
      }
      // worn-shiny patch where it sits on the ear
      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.beginPath(); c.ellipse(-18, -26, 10, 4, -0.9, 0, Math.PI * 2); c.fill();
      c.restore();
      // the seam that joins the face to the sidewall, and the inner lip
      c.strokeStyle = shade(OAT, -0.35); c.lineWidth = 0.9; c.setLineDash([2.4, 2]);
      c.beginPath(); c.ellipse(0, 0, CRX - 6, CRY - 6, 0, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
      c.strokeStyle = shade(OAT, -0.28); c.lineWidth = 1.4;
      c.beginPath(); c.ellipse(0, 0, 22.5, 31.5, 0, 0, Math.PI * 2); c.stroke();
      if (s.broken) {
        c.fillStyle = 'rgba(110,80,50,0.6)';
        for (const [x, y, rr] of [[30, 26, 6], [-34, 18, 4], [8, 44, 5], [36, -10, 3.5]]) {
          c.beginPath(); c.ellipse(x, y, rr, rr * 0.6, x * 0.05, 0, Math.PI * 2); c.fill();
        }
      }
    },
  };
}

// ---------------- 40 mm drivers ----------------

const DR = 23;
function driver(id: string, sx: number, en: string, vi: string): PartDef {
  return {
    id, name: { en, vi }, side: 'F', z: 4, x: sx * CUP_X, y: CUP_Y, w: DR * 2 + 8, h: DR * 2, icon: '🔊',
    shape: shapeFrom(ellPts(0, 0, DR, DR, 48)), needs: [sx < 0 ? 'cushionL' : 'cushionR'], elev: 10, thick: 7, round: 4, body: '#2a2d33',
    draw(c, s) {
      // black ABS basket with its vent slots and three mounting ears
      c.fillStyle = '#23262c'; c.beginPath(); c.arc(0, 0, DR, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#0e0f12';
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; c.beginPath(); c.arc(Math.cos(a) * 20.5, Math.sin(a) * 20.5, 1.2, 0, Math.PI * 2); c.fill(); }
      // PET surround: glossy, with pressed ridges
      const sg = c.createRadialGradient(-5, -6, 2, 0, 0, 18);
      sg.addColorStop(0, '#5a606b'); sg.addColorStop(0.7, '#2c3038'); sg.addColorStop(1, '#16181c');
      c.fillStyle = sg; c.beginPath(); c.arc(0, 0, 18, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 0.8;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        c.beginPath(); c.moveTo(Math.cos(a) * 11, Math.sin(a) * 11); c.quadraticCurveTo(Math.cos(a + 0.25) * 15, Math.sin(a + 0.25) * 15, Math.cos(a + 0.15) * 17.5, Math.sin(a + 0.15) * 17.5); c.stroke();
      }
      // titanium-coated dome, pulsing with the music
      const pulse = s.power > 0 ? 1 + 0.05 * Math.sin(s.time * 30) : 1;
      const dg = c.createRadialGradient(-3, -4, 0.5, 0, 0, 10 * pulse);
      dg.addColorStop(0, '#ffffff'); dg.addColorStop(0.4, '#c9ced8'); dg.addColorStop(1, '#6d7480');
      c.fillStyle = dg; c.beginPath(); c.arc(0, 0, 10 * pulse, 0, Math.PI * 2); c.fill();
      // printed rating on the basket, side letter
      font(c, 3.2); c.fillStyle = '#c9ced6';
      c.fillText('32Ω  Ø40', 0, 20.6);
      font(c, 5, 800); c.fillStyle = COPPER; c.fillText(sx < 0 ? 'L' : 'R', 0, -20.5);
      // lead tabs on the outer edge with the red / black leads
      const tx = -sx * (DR + 1);
      c.fillStyle = GOLD;
      for (const dy of [-5, 5]) c.fillRect(tx - 2, dy - 2, 4, 4);
      c.lineCap = 'round'; c.lineWidth = 1.8;
      c.strokeStyle = '#e04a3a'; c.beginPath(); c.moveTo(tx, -5); c.quadraticCurveTo(tx - sx * 2, -10, tx + sx * 3, -14); c.stroke();
      if (!s.broken) { c.strokeStyle = '#1b1b1f'; c.beginPath(); c.moveTo(tx, 5); c.quadraticCurveTo(tx - sx * 2, 10, tx + sx * 3, 14); c.stroke(); }
      else {
        // snapped black lead dangling loose, frayed copper at the end
        c.strokeStyle = '#1b1b1f';
        c.beginPath(); c.moveTo(tx + sx * 3, 14); c.quadraticCurveTo(tx + sx * 8, 20, tx + sx * 4, 24); c.stroke();
        c.strokeStyle = '#e39a4a'; c.lineWidth = 0.7;
        for (const d of [-1.5, 0, 1.5]) { c.beginPath(); c.moveTo(tx + sx * 4, 24); c.lineTo(tx + sx * 5 + d, 27); c.stroke(); }
        c.fillStyle = 'rgba(200,200,200,0.8)'; c.beginPath(); c.arc(tx, 5, 1.6, 0, Math.PI * 2); c.fill();
      }
    },
  };
}

// ---------------- outer cup caps (back) ----------------

const CAP = shapeFrom(ellPts(0, 0, CRX - 2, CRY - 2, 64));
const PLATE = shapeFrom(ellPts(0, 0, CRX - 11, CRY - 13, 56));
function cover(id: string, x: number, en: string, vi: string, needs: string[]): PartDef {
  return {
    id, name: { en, vi }, side: 'B', z: 8, x, y: CUP_Y, w: CRX * 2 - 4, h: CRY * 2 - 4, icon: '🎵',
    shape: CAP, needs, elev: 12, thick: 10, round: 10, body: shade(HOUSING, -0.2),
    draw(c) {
      softTouch(c, CAP, HOUSING, x > 0 ? 41 : 43);
      // brushed aluminium plate with circular brushing + a copper trim ring
      c.save(); c.clip(PLATE);
      const g = c.createLinearGradient(-30, -40, 30, 40);
      g.addColorStop(0, '#f1f3f5'); g.addColorStop(0.45, '#aab0b8'); g.addColorStop(0.7, '#e4e7ea'); g.addColorStop(1, '#8d939b');
      c.fillStyle = g; c.fillRect(-40, -50, 80, 100);
      c.lineWidth = 0.4;
      const r = rng(x > 0 ? 3 : 4);
      for (let k = 2; k < 44; k += 0.9) {
        c.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.3)' : 'rgba(70,76,86,0.14)';
        c.beginPath(); c.ellipse(0, 0, k * 0.75, k, 0, 0, Math.PI * 2); c.stroke();
      }
      c.restore();
      c.strokeStyle = COPPER; c.lineWidth = 1.6;
      c.beginPath(); c.ellipse(0, 0, CRX - 11, CRY - 13, 0, 0, Math.PI * 2); c.stroke();
      // engraved logo + the NFC / mic pinholes
      font(c, 7.5, 800);
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillText('CHILL', 0, 0.5);
      c.fillStyle = '#4a5058'; c.fillText('CHILL', 0, 0);
      font(c, 3.2, 600); c.fillStyle = '#5d636b'; c.fillText('STUDIO  MONITOR', 0, 7);
      c.fillStyle = '#1a1c20';
      for (const dx of [-2.5, 0, 2.5]) { c.beginPath(); c.arc(dx, 24, 0.8, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,0.45)';
      c.beginPath(); c.ellipse(-16, -26, 9, 3.5, -0.8, 0, Math.PI * 2); c.fill();
    },
  };
}

// ---------------- electronics behind the caps ----------------

const board: PartDef = {
  id: 'board', name: { en: 'Bluetooth Board', vi: 'Mạch Bluetooth' }, side: 'B', z: 5, x: -CUP_X, y: CUP_Y, w: 52, h: 66, icon: '📶',
  shape: rrPath(0, 0, 52, 66, 16), needs: ['coverR'], thick: 4, mat: 'pcb', body: '#1d4a5c',
  bumps: [{ kind: 'box', x: 0, y: 30, w: 12, h: 5, height: 4, color: '#c9ced6', metal: true }],
  draw(c, s) {
    pcb(c, 52, 66, 91, '#2b6f86');
    // RF shield over the BT SoC, the chip antenna, button tact switches, the USB-C port
    c.fillStyle = '#c9ced6'; c.beginPath(); rrc(c, -4, -8, 26, 22, 2); c.fill();
    c.strokeStyle = '#8b9097'; c.lineWidth = 0.8; c.beginPath(); rrc(c, -4, -8, 26, 22, 2); c.stroke();
    font(c, 4.2); c.fillStyle = '#5d6670'; c.fillText('BT 5.3', -4, -8);
    c.fillStyle = '#2b2b30'; c.fillRect(14, -26, 6, 14);
    c.strokeStyle = GOLD; c.lineWidth = 1.2; c.beginPath();
    for (let i = 0; i <= 6; i++) c.lineTo(10 + i * 2.2, -30 + (i % 2) * 4);
    c.stroke();
    for (const y of [4, 12, 20]) { c.fillStyle = '#d9dde3'; c.fillRect(14, y - 3, 7, 6); c.fillStyle = '#2b2b30'; c.beginPath(); c.arc(17.5, y, 1.8, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = s.power > 0 && Math.sin(s.time * 6) > 0 ? '#5aa7ff' : '#2a3a5a';
    c.beginPath(); c.arc(-16, 18, 2.4, 0, Math.PI * 2); c.fill();
    if (s.broken) {
      const g = c.createRadialGradient(4, 10, 1, 4, 10, 14);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(4, 10, 14, 0, Math.PI * 2); c.fill();
    }
  },
};

const battery: PartDef = {
  id: 'battery', name: { en: 'Battery Cell', vi: 'Pin sạc' }, side: 'B', z: 5, x: CUP_X, y: CUP_Y - 4, w: 46, h: 58, icon: '🔋',
  shape: rrPath(0, 0, 46, 58, 8), needs: ['coverL'], thick: 6, round: 3, mat: 'metal', body: '#9aa1aa',
  draw(c, s) {
    // silver pouch cell with a blue wrap label and the protection board at the top
    const g = c.createLinearGradient(-23, -29, 23, 29);
    g.addColorStop(0, '#f2f4f7'); g.addColorStop(0.5, '#c3c9d1'); g.addColorStop(1, '#8f969f');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 46, 58, 8); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1; c.beginPath(); rrc(c, 0, 0, 42, 54, 6); c.stroke();
    c.fillStyle = '#2f6fb3'; c.beginPath(); rrc(c, 0, 6, 40, 30, 3); c.fill();
    font(c, 5.5, 800); c.fillStyle = '#ffffff'; c.fillText('Li-ion', 0, 0);
    font(c, 4, 600); c.fillText('3.7V  800mAh', 0, 8); c.fillText('2.96Wh', 0, 14);
    c.save(); c.translate(0, -21); pcb(c, 30, 9, 7, '#2a6a4a'); c.restore();
    c.lineCap = 'round'; c.lineWidth = 1.8;
    c.strokeStyle = '#e04a3a'; c.beginPath(); c.moveTo(-8, -26); c.quadraticCurveTo(-14, -34, -20, -30); c.stroke();
    c.strokeStyle = '#1b1b1f'; c.beginPath(); c.moveTo(-3, -26); c.quadraticCurveTo(-9, -36, -16, -34); c.stroke();
    if (s.broken) {
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(0, 4, 18, 22, 0, 0, Math.PI * 2); c.fill();
    }
  },
};

// Detachable audio cable plugged into the bottom of the left cup (seen from the back: on the right).
const cablePath = rrPath(0, 0, 14, 58, 7);
const cable: PartDef = {
  id: 'cable', name: { en: 'Audio Cable', vi: 'Dây cáp âm thanh' }, side: 'B', z: 7, x: CUP_X, y: CUP_Y + CRY + 20, w: 14, h: 58, icon: '🔌',
  shape: cablePath, elev: -5, thick: 10, round: 5, mat: 'rubber', body: '#26262c',
  draw(c, s) {
    // gold plug tip tucked in the cup, an aluminium barrel, a braided cord
    const m = c.createLinearGradient(-4, 0, 4, 0);
    m.addColorStop(0, '#a8842c'); m.addColorStop(0.45, '#ffe9a0'); m.addColorStop(1, '#9a7a26');
    c.fillStyle = m; c.beginPath(); rrc(c, 0, -24, 6, 10, 2); c.fill();
    const b = c.createLinearGradient(-7, 0, 7, 0);
    b.addColorStop(0, '#7d838c'); b.addColorStop(0.4, '#ffffff'); b.addColorStop(1, '#6a7079');
    c.fillStyle = b; c.beginPath(); rrc(c, 0, -10, 13, 18, 4); c.fill();
    c.fillStyle = COPPER; c.fillRect(-6.5, -3, 13, 1.6);
    c.fillStyle = '#26262c'; c.fillRect(-4, 0, 8, 29);
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 0.6;
    for (let y = 1; y < 29; y += 2) { c.beginPath(); c.moveTo(-4, y); c.lineTo(4, y + 1.5); c.stroke(); }
    if (s.broken) {
      c.fillStyle = '#e39a4a'; c.fillRect(-3, 14, 6, 6);
    }
  },
};

const SCR = 40; // screws sit above and below the plate on each cap

export const headphones: DeviceDef = {
  id: 'headphones',
  name: { en: 'Over-Ear Headphones', vi: 'Tai nghe chụp tai' },
  w: 330, h: 250,
  hasBack: true,
  parts: [
    frame, headband,
    cushion('cushionL', -1, 'Left Ear Pad', 'Đệm tai trái'), cushion('cushionR', 1, 'Right Ear Pad', 'Đệm tai phải'),
    driver('driverL', -1, 'Left Driver', 'Loa trái'), driver('driverR', 1, 'Right Driver', 'Loa phải'),
    // back view: the left cup sits on the right
    cover('coverL', CUP_X, 'Left Cup Cap', 'Vòm tai trái', ['h1', 'h2', 'cable']),
    cover('coverR', -CUP_X, 'Right Cup Cap', 'Vòm tai phải', ['h3', 'h4']),
    board, battery, cable,
    screw('h1', CUP_X, CUP_Y - SCR, 'B'), screw('h2', CUP_X, CUP_Y + SCR, 'B'),
    screw('h3', -CUP_X, CUP_Y - SCR, 'B'), screw('h4', -CUP_X, CUP_Y + SCR, 'B'),
  ],
  working(c, t, k) {
    c.save();
    for (const sx of [-1, 1]) {
      const cx = sx * CUP_X;
      // the cups pulse with the beat
      const r = CRY + 4 + ((t * 70) % 30);
      c.globalAlpha = k * (1 - (r - CRY - 4) / 30) * 0.55;
      c.strokeStyle = '#7ee0d6'; c.lineWidth = 3;
      c.beginPath(); c.ellipse(cx, CUP_Y, r * (CRX / CRY) + 6, r, 0, 0, Math.PI * 2); c.stroke();
      for (let j = 0; j < 3; j++) {
        const ph = (t * 0.6 + j / 3 + (sx > 0 ? 0.15 : 0)) % 1;
        c.globalAlpha = k * Math.sin(ph * Math.PI);
        c.font = `800 ${18 + j * 3}px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 3; c.strokeStyle = '#ffffff';
        const tx = cx + sx * (24 + ph * 40) + Math.sin(ph * 9) * 6, ty = CUP_Y - 50 - ph * 70;
        c.strokeText(j % 2 ? '♫' : '♪', tx, ty);
        c.fillStyle = j === 1 ? '#ff8fa3' : '#ffd36b'; c.fillText(j % 2 ? '♫' : '♪', tx, ty);
      }
    }
    c.restore();
  },
  workFx: { kind: 'note', x: 0, y: -90, color: '#7ee0d6', dir: -Math.PI / 2 },
};
