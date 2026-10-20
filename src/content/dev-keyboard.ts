// Compact mechanical keyboard: lavender case, pastel keycaps, seen from above. One face.

import { type C, slab, shade, rrc, rrPath, glossStreak, text } from '../core/draw';
import { type DeviceDef, type PartDef, type Bump, screw } from './device';
import { pcb, knurlRing, boss } from './kit';

const LAV = '#a98be0';
const CREAM = '#fbf1dc';
const SKY = '#a8d4f7';
const PINK = '#ffb3c7';
const BUTTER = '#ffd97a';
const CORAL = '#ff8a7a';
const MINT = '#9fe3c8';
const STEM = '#ff6f9c';

// Key unit and the 60%-ish layout: [width in units, colour] per key, 12.5u a row.
const U = 21;
const X0 = -131.25;
type Row = [number, string][];
const NUM: Row = [[1, CORAL], ...Array.from({ length: 10 }, (): [number, string] => [1, CREAM]), [1.5, SKY]];
const TOP: Row = [[1.5, SKY], ...Array.from({ length: 10 }, (): [number, string] => [1, CREAM]), [1, SKY]];
const HOME: Row = [[1.75, SKY], ...Array.from({ length: 9 }, (): [number, string] => [1, CREAM]), [1.75, MINT]];
const SHIFT: Row = [[2.25, SKY], ...Array.from({ length: 8 }, (): [number, string] => [1, CREAM]), [2.25, SKY]];
const MODS: Row = [[1.25, PINK], [1.25, PINK], [1.25, PINK]];
const SPACE: Row = [[6.25, BUTTER]];

interface Key { x: number; y: number; w: number; col: string }

/** Keys of one row in device units, starting at the left edge (in units). */
function keysOf(row: Row, y: number, from = 0): Key[] {
  let u = from;
  return row.map(([w, col]) => {
    const k = { x: X0 + (u + w / 2) * U, y, w: w * U, col };
    u += w;
    return k;
  });
}

const ROW_Y = [-42, -21, 0, 21, 42];
const K_NUM = keysOf(NUM, ROW_Y[0]);
const K_TOP = [...keysOf(TOP, ROW_Y[1]), ...keysOf(HOME, ROW_Y[2])];
const K_SHIFT = keysOf(SHIFT, ROW_Y[3]);
const K_MODS = keysOf(MODS, ROW_Y[4]);
const K_SPACE = keysOf(SPACE, ROW_Y[4], 3.75);
const ALL = [...K_NUM, ...K_TOP, ...K_SHIFT, ...K_MODS, ...K_SPACE];
const KNOB = { x: 108, y: 42 };

/** Chunky sculpted keycap: a wide skirt plus a taller, lighter dish on top. */
function capBumps(keys: Key[], cx: number, cy: number): Bump[] {
  const out: Bump[] = [];
  for (const k of keys) {
    out.push({ kind: 'box', x: k.x - cx, y: k.y - cy, w: k.w - 3.5, h: 17.5, height: 7, color: shade(k.col, -0.08) });
    out.push({ kind: 'box', x: k.x - cx, y: k.y - cy - 1, w: k.w - 8, h: 12, height: 10, color: shade(k.col, 0.06) });
  }
  return out;
}

/** The row strip under the keycaps: dark gaps, coloured skirts. */
function capRow(c: C, keys: Key[], cx: number, cy: number, w: number, h: number): void {
  c.fillStyle = '#4a4458';
  c.beginPath(); rrc(c, 0, 0, w, h, 4); c.fill();
  for (const k of keys) {
    const g = c.createLinearGradient(0, k.y - cy - 9, 0, k.y - cy + 9);
    g.addColorStop(0, shade(k.col, 0.15)); g.addColorStop(1, shade(k.col, -0.2));
    c.fillStyle = g;
    c.beginPath(); rrc(c, k.x - cx, k.y - cy, k.w - 3.5, 17.5, 4); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath(); rrc(c, k.x - cx, k.y - cy - 1, k.w - 9, 11, 3); c.fill();
  }
}

/** A switch housing with its cross stem (seen through the plate, or bare on the PCB). */
function switchTop(c: C, x: number, y: number, bare: boolean): void {
  c.fillStyle = bare ? '#2f2a38' : '#1f1b26';
  c.beginPath(); rrc(c, x, y, 14, 14, 2); c.fill();
  c.fillStyle = bare ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)';
  c.fillRect(x - 6, y - 6, 12, 3);
  c.fillStyle = STEM;
  c.fillRect(x - 1.2, y - 4, 2.4, 8);
  c.fillRect(x - 4, y - 1.2, 8, 2.4);
}

function keyStrip(id: string, name: { en: string; vi: string }, keys: Key[], x: number, y: number, w: number, h: number, extra: Partial<PartDef> = {}): PartDef {
  const shape = rrPath(0, 0, w, h, 5);
  return {
    id, name, side: 'A', z: 8, x, y, w, h, icon: '⌨', shape, thick: 3, round: 2, body: '#4a4458',
    bumps: capBumps(keys, x, y),
    draw(c) { capRow(c, keys, x, y, w, h); },
    ...extra,
  };
}

const CASE = rrPath(0, 0, 300, 124, 18);
const CASE_IN = rrPath(0, 0, 280, 104, 10);

const kcase: PartDef = {
  id: 'case', name: { en: 'Keyboard Case', vi: 'Vỏ đáy' }, side: 'A', z: 0, x: 0, y: 0, w: 300, h: 124, icon: '🟪',
  shape: CASE, needs: ['pcb', 'usb'], tool: 'sponge', thick: 26, cavity: 14, round: 10, wall: 10,
  draw(c) {
    slab(c, CASE, LAV, -62, 62, { depth: 10, shadow: 0 });
    glossStreak(c, CASE, -150, -62, 300, 60, 0.25);
    // the hollow tub: gasket foam strips, ribs and the screw posts
    c.fillStyle = shade(LAV, -0.4);
    c.fill(CASE_IN);
    c.save(); c.clip(CASE_IN);
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(CASE_IN);
    c.restore();
    c.strokeStyle = shade(LAV, -0.25); c.lineWidth = 3;
    for (const x of [-70, 0, 70]) { c.beginPath(); c.moveTo(x, -46); c.lineTo(x, 46); c.stroke(); }
    c.fillStyle = '#f2e3c4';
    for (const y of [-48, 48]) { c.beginPath(); rrc(c, -40, y, 150, 5, 2.5); c.fill(); }
    boss(c, -60, -31.5, LAV); boss(c, 60, -31.5, LAV); boss(c, -60, 31.5, LAV); boss(c, 60, 31.5, LAV);
    // USB-C notch in the back wall
    c.fillStyle = '#2a2433';
    c.beginPath(); rrc(c, 100, -58, 22, 7, 3.5); c.fill();
  },
};

const usb: PartDef = {
  id: 'usb', name: { en: 'USB Daughterboard', vi: 'Bo mạch cổng USB' }, side: 'A', z: 1, x: 100, y: -36, w: 56, h: 30, icon: '🔌',
  shape: rrPath(0, 0, 56, 30, 5), needs: ['pcb'], thick: 4, mat: 'pcb', body: '#3d2a6e',
  bumps: [
    { kind: 'box', x: 0, y: -10, w: 18, h: 8, height: 6, color: '#c9ccd3', metal: true },
    { kind: 'box', x: -16, y: 6, w: 14, h: 10, height: 5, color: '#f2efe8' },
  ],
  draw(c, s) {
    pcb(c, 56, 30, 71, '#6b4fb8');
    // JST plug and its little rainbow cable
    const cols = ['#e8574a', '#f1c232', '#3fae6a', '#3d7fd8'];
    cols.forEach((col, i) => {
      c.strokeStyle = col; c.lineWidth = 1.8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-20 + i * 3, 10); c.quadraticCurveTo(0, 16 - i, 22, 6 + i * 2); c.stroke();
    });
    if (s.broken) {
      c.fillStyle = 'rgba(30,20,10,0.7)';
      c.beginPath(); c.arc(8, -2, 6, 0, Math.PI * 2); c.fill();
    }
  },
};

const PCB_W = 280, PCB_H = 112;
const board: PartDef = {
  id: 'pcb', name: { en: 'Switch PCB', vi: 'Bo mạch phím' }, side: 'A', z: 2, x: 0, y: 0, w: PCB_W, h: PCB_H, icon: '🟩',
  shape: rrPath(0, 0, PCB_W, PCB_H, 10), needs: ['plate'], thick: 4, mat: 'pcb', body: '#3d2a6e',
  draw(c, s) {
    pcb(c, PCB_W, PCB_H, 58, '#6b4fb8');
    // hot-swap switches still seated on the board
    for (const k of ALL) {
      c.fillStyle = '#e8c15a';
      c.beginPath(); c.arc(k.x - 4, k.y + 7, 1.6, 0, Math.PI * 2); c.arc(k.x + 3, k.y + 7.5, 1.6, 0, Math.PI * 2); c.fill();
      switchTop(c, k.x, k.y, true);
    }
    c.fillStyle = '#23262d';
    c.beginPath(); rrc(c, 108, 40, 18, 12, 2); c.fill();
    if (s.broken) {
      // scorched pad and a tilted switch
      const g = c.createRadialGradient(-26, 0, 1, -26, 0, 16);
      g.addColorStop(0, 'rgba(20,10,5,0.9)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(-26, 0, 16, 0, Math.PI * 2); c.fill();
      c.save(); c.translate(-26, 0); c.rotate(0.5); switchTop(c, 0, 0, true); c.restore();
    }
  },
};

const PLATE = rrPath(0, 0, 284, 116, 12);
const plate: PartDef = {
  id: 'plate', name: { en: 'Top Plate', vi: 'Tấm kê phím' }, side: 'A', z: 4, x: 0, y: 0, w: 284, h: 116, icon: '▦',
  shape: PLATE, needs: ['p1', 'p2', 'p3', 'p4', 'stabs'], tool: 'brush', thick: 4, round: 2, mat: 'metal', body: '#9a9fae',
  bumps: [{ kind: 'cyl', x: KNOB.x, y: KNOB.y, w: 20, height: 11, color: '#e8b54a', metal: true }],
  draw(c, s) {
    slab(c, PLATE, '#d9dbe6', -58, 58, { depth: 4, shadow: 0 });
    glossStreak(c, PLATE, -142, -58, 284, 60, 0.3);
    // brushed metal lines
    c.save(); c.clip(PLATE);
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 0.8;
    for (let y = -56; y < 58; y += 3) { c.beginPath(); c.moveTo(-142, y); c.lineTo(142, y); c.stroke(); }
    c.restore();
    for (const k of ALL) switchTop(c, k.x, k.y, false);
    // stabilizer slots either side of the spacebar
    c.fillStyle = '#1f1b26';
    for (const dx of [-50, 50]) { c.beginPath(); rrc(c, K_SPACE[0].x + dx, 42, 7, 14, 2); c.fill(); }
    // the volume knob
    c.save(); c.translate(KNOB.x, KNOB.y); knurlRing(c, 11, 6, '#e8b54a'); c.restore();
    text(c, 'chill·60', -112, 53, 7, shade(LAV, -0.2), { font: 'bold' });
    if (s.power > 0) {
      c.fillStyle = `rgba(160,255,200,${s.power})`;
      c.beginPath(); c.arc(126, -52, 2.5, 0, Math.PI * 2); c.fill();
    }
  },
};

const stabs: PartDef = {
  id: 'stabs', name: { en: 'Stabilizers', vi: 'Thanh cân bằng' }, side: 'A', z: 6, x: K_SPACE[0].x, y: 42, w: 120, h: 16, icon: '〰',
  shape: rrPath(0, 0, 120, 16, 6), needs: ['space'], thick: 4, round: 2, mat: 'metal', body: '#8a8f99',
  draw(c, s) {
    // steel wire between two housings
    c.strokeStyle = '#b9bec6'; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath();
    if (s.broken) { c.moveTo(-50, 4); c.quadraticCurveTo(0, -8, 50, 4); } else { c.moveTo(-50, 5); c.lineTo(50, 5); }
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(-48, 4); c.lineTo(48, 4); c.stroke();
    for (const x of [-50, 50]) {
      c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, x - 2, 2, 12, 15, 3); c.fill();
      c.fillStyle = '#f4f1ea'; c.beginPath(); rrc(c, x, 0, 12, 15, 3); c.fill();
      c.fillStyle = STEM; c.fillRect(x - 1.2, -4, 2.4, 6);
    }
  },
};

const keysNum = keyStrip('keysNum', { en: 'Number Row', vi: 'Hàng phím số' }, K_NUM, 0, ROW_Y[0], 264, 20, { tool: 'brush' });
const keysTop = keyStrip('keysTop', { en: 'Letter Keys', vi: 'Hàng phím chữ' }, K_TOP, 0, -10.5, 264, 41, { tool: 'brush' });
const keysShift = keyStrip('keysShift', { en: 'Shift Row', vi: 'Hàng phím Shift' }, K_SHIFT, 0, ROW_Y[3], 264, 20);
const mods = keyStrip('mods', { en: 'Accent Keys', vi: 'Phím màu' }, K_MODS, K_MODS[1].x, ROW_Y[4], 80, 20, { icon: '🌸' });
const space = keyStrip('space', { en: 'Spacebar', vi: 'Phím cách' }, K_SPACE, K_SPACE[0].x, ROW_Y[4], 133, 20, { icon: '▬', tool: 'sponge' });

export const keyboard: DeviceDef = {
  id: 'keyboard',
  name: { en: 'Mechanical Keyboard', vi: 'Bàn phím cơ' },
  w: 300, h: 124,
  hasBack: false,
  parts: [
    kcase, usb, board, plate, stabs, keysNum, keysTop, keysShift, mods, space,
    screw('p1', -60, -31.5, 'A', 6, ['keysNum', 'keysTop']), screw('p2', 60, -31.5, 'A', 6, ['keysNum', 'keysTop']),
    screw('p3', -60, 31.5, 'A', 6, ['keysShift', 'mods']), screw('p4', 60, 31.5, 'A', 6, ['keysShift', 'space']),
  ],
  working(c, t, k) {
    // RGB underglow: a rainbow wave rolling across, a halo round the case
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.lineWidth = 10;
    c.globalAlpha = k * 0.55;
    c.filter = 'blur(6px)';
    const g = c.createLinearGradient(-150, 0, 150, 0);
    for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${(i * 60 + t * 120) % 360},90%,65%)`);
    c.strokeStyle = g;
    c.beginPath(); rrc(c, 0, 0, 306, 130, 20); c.stroke();
    c.filter = 'none';
    c.globalAlpha = k * 0.22;
    for (let x = -140; x < 140; x += 10) {
      c.fillStyle = `hsl(${(x * 1.2 + t * 160) % 360},90%,60%)`;
      c.fillRect(x, -54, 10, 108);
    }
    c.restore();
  },
  workFx: { kind: 'spark', x: 108, y: 42, color: '#ffd97a', dir: -Math.PI / 2 },
};
