// A 60% mechanical keyboard in an oiled walnut case: thick cream PBT keycaps with
// printed legends, warm grey modifiers and dusty-rose accents, every cap a real
// sculpted keycap. Under them a brass plate full of cream switches, a black PCB
// with hot-swap sockets, and a little USB-C daughterboard. One face.

import { type C, type Pts, shade, rrc, rrPath, rng, shapeFrom } from '../core/draw';
import { type DeviceDef, type PartDef, type Bump, screw } from './device';
import { pcb, boss } from './kit';

const WALNUT = '#6b4128';
const CREAM = '#eee4cf';
const GREY = '#8f8981';
const ROSE = '#d98d86';
const BRASS = '#c9a25a';
const SW_TOP = '#e7dcc4';
const STEM = '#e8b98a';
const SANS = '"Helvetica Neue", Arial, sans-serif';

// ---------------- the layout: a real ANSI 60%, 15 units a row ----------------

const U = 18.6;
const X0 = -U * 7.5;
const CAP = U - 2.4; // keycap footprint
interface Key { x: number; y: number; w: number; col: string; l: string; s?: number }
type Row = [number, string, string, number?][];

const alpha = (s: string): Row => [...s].map((ch): [number, string, string] => [1, CREAM, ch]);
const ROWS: Row[] = [
  [[1, ROSE, 'Esc', 3.8], ...alpha('1234567890-='), [2, GREY, '⌫', 6]],
  [[1.5, GREY, 'Tab', 3.6], ...alpha('QWERTYUIOP[]'), [1.5, CREAM, '\\']],
  [[1.75, GREY, 'Caps', 3.6], ...alpha("ASDFGHJKL;'"), [2.25, ROSE, 'Enter', 3.8]],
  [[2.25, GREY, 'Shift', 3.6], ...alpha('ZXCVBNM,./'), [2.75, GREY, 'Shift', 3.6]],
];
const ROW_Y = [-2 * U, -U, 0, U, 2 * U];

function keysOf(row: Row, y: number, from = 0): Key[] {
  let u = from;
  return row.map(([w, col, l, s]) => {
    const k = { x: X0 + (u + w / 2) * U, y, w: w * U - 2.4, col, l, s };
    u += w;
    return k;
  });
}

const K_NUM = keysOf(ROWS[0], ROW_Y[0]);
const K_TOP = keysOf(ROWS[1], ROW_Y[1]);
const K_HOME = keysOf(ROWS[2], ROW_Y[2]);
const K_SHIFT = keysOf(ROWS[3], ROW_Y[3]);
const K_MODS = keysOf([[1.25, ROSE, 'Ctrl', 3.4], [1.25, ROSE, '◆', 5], [1.25, ROSE, 'Alt', 3.4]], ROW_Y[4]);
const K_SPACE = keysOf([[6.25, CREAM, '']], ROW_Y[4], 3.75);
const K_MODSR = keysOf([[1.25, GREY, 'Alt', 3.4], [1.25, GREY, 'Fn', 3.4], [1.25, GREY, '☰', 4.6], [1.25, GREY, 'Ctrl', 3.4]], ROW_Y[4], 10);
const ALL = [...K_NUM, ...K_TOP, ...K_HOME, ...K_SHIFT, ...K_MODS, ...K_SPACE, ...K_MODSR];
const SPACE_X = K_SPACE[0].x;
const STAB_DX = 48.8; // a 6.25u spacebar's stabilizers sit 100 mm apart

function font(c: C, size: number, weight = 700): void {
  c.font = `${weight} ${size}px ${SANS}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
}

// ---------------- keycaps: one row of real sculpted caps joined by low sprue bridges ----------------

/** Outline of a row of caps: each cap a rounded square, a thin bridge across every gap. */
function rowPts(keys: Key[], cx: number, cy: number): Pts {
  const r = 3.2, bw = 4.5;
  const top: Pts = [], bot: Pts = [];
  const h = CAP / 2;
  const arc = (out: Pts, ox: number, oy: number, a0: number, a1: number) => {
    for (let k = 0; k <= 4; k++) { const a = a0 + ((a1 - a0) * k) / 4; out.push([ox + Math.cos(a) * r, oy + Math.sin(a) * r]); }
  };
  keys.forEach((k, i) => {
    const x0 = k.x - cx - k.w / 2, x1 = k.x - cx + k.w / 2, y = k.y - cy;
    // top edge, left to right
    if (i > 0) top.push([x0, y - bw / 2]);
    arc(top, x0 + r, y - h + r, Math.PI, Math.PI * 1.5);
    arc(top, x1 - r, y - h + r, Math.PI * 1.5, Math.PI * 2);
    if (i < keys.length - 1) top.push([x1, y - bw / 2]);
    // bottom edge, collected right to left later
    const b: Pts = [];
    if (i < keys.length - 1) b.push([x1, y + bw / 2]);
    arc(b, x1 - r, y + h - r, 0, Math.PI * 0.5);
    arc(b, x0 + r, y + h - r, Math.PI * 0.5, Math.PI);
    if (i > 0) b.push([x0, y + bw / 2]);
    bot.unshift(...b);
  });
  return [...top, ...bot];
}

/** Paint one sculpted cap: darker skirt, lighter dished top, the printed legend. */
function keycap(c: C, k: Key, cx: number, cy: number): void {
  const x = k.x - cx, y = k.y - cy;
  const sk = c.createLinearGradient(0, y - CAP / 2, 0, y + CAP / 2);
  sk.addColorStop(0, shade(k.col, -0.05)); sk.addColorStop(1, shade(k.col, -0.3));
  c.fillStyle = sk;
  c.beginPath(); rrc(c, x, y, k.w, CAP, 3.2); c.fill();
  // the top: a touch narrower at the back, as on a cylindrical-profile cap
  const tw = k.w - 7.5, th = CAP - 8;
  const tg = c.createLinearGradient(0, y - th / 2 - 1, 0, y + th / 2);
  tg.addColorStop(0, shade(k.col, 0.1)); tg.addColorStop(0.5, shade(k.col, 0.02)); tg.addColorStop(1, shade(k.col, 0.12));
  c.fillStyle = tg;
  c.beginPath(); rrc(c, x, y - 1, tw, th, 2.4); c.fill();
  // the dish catches a soft shadow along its back edge
  c.fillStyle = 'rgba(80,60,40,0.12)';
  c.beginPath(); rrc(c, x, y - 1 - th / 2 + 1.2, tw - 2, 2, 1); c.fill();
  if (k.l) {
    font(c, k.s ? k.s * 1.15 : 7.8, 700);
    c.fillStyle = k.col === CREAM ? '#2e2a26' : '#fffaf0';
    if (k.s) { c.textAlign = 'left'; c.fillText(k.l, x - tw / 2 + 1.2, y - 3); }
    else c.fillText(k.l, x, y - 1.2);
  }
}

function keyRow(id: string, name: { en: string; vi: string }, keys: Key[], extra: Partial<PartDef> = {}): PartDef {
  const x0 = keys[0].x - keys[0].w / 2, x1 = keys[keys.length - 1].x + keys[keys.length - 1].w / 2;
  const cx = (x0 + x1) / 2, cy = keys[0].y;
  const shape = shapeFrom(rowPts(keys, cx, cy));
  return {
    id, name, side: 'A', z: 8, x: cx, y: cy, w: x1 - x0, h: CAP, icon: '⌨', shape,
    elev: 27, thick: 9, round: 4, mat: 'rubber', body: shade(keys[0].col, -0.3),
    draw(c, s) {
      // the sprue between caps, dark and low
      c.fillStyle = '#2b2520';
      c.fillRect(-(x1 - x0) / 2, -CAP / 2, x1 - x0, CAP);
      for (const k of keys) keycap(c, k, cx, cy);
      if (s.broken) {
        // dried milk tea glazed over the caps, the reason they stick
        const r = rng(keys.length * 7);
        for (const k of keys) {
          const g = c.createRadialGradient(k.x - cx + 2, k.y - cy + 2, 1, k.x - cx, k.y - cy, k.w * 0.6);
          g.addColorStop(0, 'rgba(150,95,45,0.55)'); g.addColorStop(1, 'rgba(150,95,45,0)');
          c.fillStyle = g; c.beginPath(); rrc(c, k.x - cx, k.y - cy, k.w, CAP, 3); c.fill();
          c.fillStyle = 'rgba(255,245,220,0.5)'; c.beginPath(); c.ellipse(k.x - cx - 3 + r() * 4, k.y - cy - 3, 3, 1.2, 0.3, 0, Math.PI * 2); c.fill();
        }
      }
    },
    ...extra,
  };
}

// ---------------- case: oiled walnut tub ----------------

const CW = 306, CH = 126;
const CASE = rrPath(0, 0, CW, CH, 12);
const CASE_IN = rrPath(0, 0, CW - 24, CH - 24, 5);
const USB_X = 96;

function walnut(c: C, x: number, y: number, w: number, h: number, seed: number, base = WALNUT): void {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(base, 0.12)); g.addColorStop(0.5, base); g.addColorStop(1, shade(base, -0.12));
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
  const r = rng(seed);
  // long flowing grain lines with the odd cathedral swirl
  for (let i = 0; i < h * 1.4; i++) {
    const yy = y + r() * h, amp = 0.6 + r() * 2.4, f = 0.01 + r() * 0.03, ph = r() * 6;
    c.strokeStyle = r() < 0.6 ? `rgba(40,20,10,${0.12 + r() * 0.2})` : `rgba(230,170,110,${0.06 + r() * 0.1})`;
    c.lineWidth = 0.4 + r() * 0.9;
    c.beginPath();
    for (let xx = x; xx <= x + w; xx += 6) {
      const v = yy + Math.sin(xx * f + ph) * amp;
      if (xx === x) c.moveTo(xx, v); else c.lineTo(xx, v);
    }
    c.stroke();
  }
  // open pores
  for (let i = 0; i < (w * h) / 30; i++) {
    c.fillStyle = 'rgba(25,12,5,0.25)';
    c.fillRect(x + r() * w, y + r() * h, 1.6 + r() * 1.5, 0.5);
  }
}

const kcase: PartDef = {
  id: 'case', name: { en: 'Walnut Case', vi: 'Vỏ gỗ óc chó' }, side: 'A', z: 0, x: 0, y: 0, w: CW, h: CH, icon: '🟫',
  shape: CASE, needs: ['pcb', 'usb'], tool: 'sponge', thick: 24, cavity: 12, round: 10, wall: 12, body: shade(WALNUT, -0.2),
  draw(c, s) {
    c.save(); c.clip(CASE);
    walnut(c, -CW / 2, -CH / 2, CW, CH, 4);
    // oiled sheen along the front edge
    const sh = c.createLinearGradient(0, -CH / 2, 0, CH / 2);
    sh.addColorStop(0, 'rgba(255,230,190,0.18)'); sh.addColorStop(0.2, 'rgba(255,230,190,0)'); sh.addColorStop(0.9, 'rgba(255,230,190,0)'); sh.addColorStop(1, 'rgba(255,230,190,0.12)');
    c.fillStyle = sh; c.fillRect(-CW / 2, -CH / 2, CW, CH);
    c.restore();
    // routed-out pocket: lighter fresh-cut wood, darker in the corners
    c.save(); c.clip(CASE_IN);
    walnut(c, -CW / 2, -CH / 2, CW, CH, 5, '#8a5a3a');
    c.strokeStyle = 'rgba(30,15,5,0.45)'; c.lineWidth = 12; c.translate(2, 4); c.stroke(CASE_IN);
    c.restore();
    // the four brass inserts the plate screws into
    for (const [x, y] of PLATE_SCREWS) boss(c, x, y, '#b68e45');
    // the USB-C notch in the back wall and the brass badge in the front bezel
    c.fillStyle = '#1b1410'; c.beginPath(); rrc(c, USB_X, -CH / 2 + 4, 18, 8, 3); c.fill();
    c.fillStyle = '#8a6a30'; c.beginPath(); rrc(c, 0, CH / 2 - 5.6, 34, 6, 1.5); c.fill();
    const bg = c.createLinearGradient(-17, 0, 17, 0);
    bg.addColorStop(0, '#f2d58f'); bg.addColorStop(0.5, BRASS); bg.addColorStop(1, '#e8c87a');
    c.fillStyle = bg; c.beginPath(); rrc(c, 0, CH / 2 - 6, 32, 5, 1.2); c.fill();
    font(c, 3.4, 800); c.fillStyle = '#4a3410'; c.fillText('CHILL · 60', 0, CH / 2 - 6);
    // lock indicators on the top bezel
    const on = s.power > 0;
    [['CAPS', 112], ['FN', 128]].forEach(([l, x], i) => {
      const lit = on && (i === 0 || Math.sin(s.time * 3) > 0);
      c.fillStyle = lit ? '#9cf2c0' : '#2a1f18';
      c.beginPath(); c.arc(x as number, -CH / 2 + 6, 1.6, 0, Math.PI * 2); c.fill();
      font(c, 2.4, 700); c.fillStyle = '#d9b48a'; c.fillText(l as string, (x as number) - 7, -CH / 2 + 6);
    });
    if (s.broken) {
      // the spilled bubble tea: a dried milk-tea pool, sugar crust and stray tapioca pearls
      c.save(); c.clip(CASE_IN);
      const g = c.createRadialGradient(-30, 10, 4, -30, 10, 70);
      g.addColorStop(0, 'rgba(170,110,60,0.85)'); g.addColorStop(0.7, 'rgba(150,95,50,0.6)'); g.addColorStop(1, 'rgba(150,95,50,0)');
      c.fillStyle = g;
      c.beginPath(); c.ellipse(-30, 10, 80, 34, 0.1, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(90,50,20,0.6)'; c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(-30, 10, 74, 30, 0.1, 0, Math.PI * 2); c.stroke();
      c.fillStyle = 'rgba(255,240,210,0.35)';
      c.beginPath(); c.ellipse(-50, 0, 18, 5, 0.2, 0, Math.PI * 2); c.fill();
      const r = rng(31);
      for (let i = 0; i < 9; i++) {
        const x = -90 + r() * 120, y = -14 + r() * 44;
        c.fillStyle = '#1e140f'; c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.arc(x - 1, y - 1.1, 1, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
  },
};

// ---------------- USB daughterboard ----------------

const usb: PartDef = {
  id: 'usb', name: { en: 'USB-C Daughterboard', vi: 'Bo mạch cổng USB-C' }, side: 'A', z: 1, x: USB_X, y: -38, w: 44, h: 30, icon: '🔌',
  shape: rrPath(0, 0, 44, 30, 3), needs: ['pcb'], elev: 12, thick: 2, mat: 'pcb', body: '#1d1f24',
  bumps: [
    { kind: 'box', x: 0, y: -10, w: 13, h: 9, height: 4.5, color: '#c9ccd3', metal: true },
    { kind: 'box', x: -12, y: 7, w: 12, h: 7, height: 4, color: '#f2efe8' },
  ],
  draw(c, s) {
    pcb(c, 44, 30, 71, '#2b2e35');
    // ESD chip, the JST socket and its rainbow cable to the main board
    c.fillStyle = '#16171a'; c.beginPath(); rrc(c, 10, 4, 8, 6, 1); c.fill();
    const cols = ['#d84a3a', '#f1c232', '#3fae6a', '#3d7fd8'];
    cols.forEach((col, i) => {
      c.strokeStyle = col; c.lineWidth = 1.4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-15 + i * 2.2, 9); c.quadraticCurveTo(-8, 18 - i, 2 + i * 3, 14); c.stroke();
    });
    font(c, 3, 700); c.fillStyle = '#e8e2d0'; c.fillText('CHILL USB-C', 8, -3);
    if (s.broken) { c.fillStyle = 'rgba(30,20,10,0.7)'; c.beginPath(); c.arc(8, -2, 6, 0, Math.PI * 2); c.fill(); }
  },
};

// ---------------- PCB ----------------

const PCB_W = 280, PCB_H = 98;
const PCB_P = rrPath(0, 0, PCB_W, PCB_H, 4);

/** Matte black solder mask: the row and column matrix traces, vias and mounting holes. */
function matte(c: C): void {
  const g = c.createLinearGradient(0, -PCB_H / 2, 0, PCB_H / 2);
  g.addColorStop(0, '#2c2f35'); g.addColorStop(1, '#1d1f24');
  c.fillStyle = g; c.fill(PCB_P);
  c.save(); c.clip(PCB_P);
  c.strokeStyle = 'rgba(120,130,145,0.35)'; c.lineWidth = 0.7;
  for (const y of ROW_Y) { c.beginPath(); c.moveTo(-PCB_W / 2, y + 6.5); c.lineTo(PCB_W / 2, y + 6.5); c.stroke(); }
  for (const k of [...K_NUM, ...K_TOP]) { c.beginPath(); c.moveTo(k.x + 4, -PCB_H / 2); c.lineTo(k.x + 4, PCB_H / 2); c.stroke(); }
  c.strokeStyle = 'rgba(120,130,145,0.25)';
  for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(-6 + i * 4, -46); c.lineTo(-6 + i * 4, -40); c.lineTo(4 + i * 1.6, -36); c.stroke(); }
  c.fillStyle = '#c9a24a';
  for (const k of ALL) { c.beginPath(); c.arc(k.x + 4, k.y + 6.5, 0.9, 0, Math.PI * 2); c.fill(); }
  c.restore();
  for (const [x, y] of PLATE_SCREWS) {
    c.fillStyle = '#d4af5a'; c.beginPath(); c.arc(x, y, 4.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#121214'; c.beginPath(); c.arc(x, y, 2.6, 0, Math.PI * 2); c.fill();
  }
}
const board: PartDef = {
  id: 'pcb', name: { en: 'Main PCB', vi: 'Bo mạch phím' }, side: 'A', z: 2, x: 0, y: 0, w: PCB_W, h: PCB_H, icon: '🟩',
  shape: rrPath(0, 0, PCB_W, PCB_H, 4), needs: ['plate'], elev: 15, thick: 2, mat: 'pcb', body: '#1d1f24',
  bumps: [
    { kind: 'box', x: 10, y: -38, w: 12, h: 12, height: 1.6, color: '#17181b' },
    { kind: 'box', x: USB_X, y: -42, w: 10, h: 6, height: 3, color: '#f2efe8' },
  ],
  draw(c, s) {
    matte(c);
    for (const k of ALL) {
      // a hot-swap socket (two black lobes), its two gold pads, the diode beside it
      c.fillStyle = '#e8c15a';
      c.beginPath(); c.arc(k.x - 3.8, k.y - 2.5, 1.7, 0, Math.PI * 2); c.arc(k.x + 2.5, k.y - 5, 1.7, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#121214';
      c.beginPath(); rrc(c, k.x - 1, k.y + 3.5, 10, 4.6, 1.5); rrc(c, k.x + 3.5, k.y + 1.5, 5, 4, 1); c.fill();
      c.fillStyle = '#d9dde2'; c.beginPath(); c.arc(k.x, k.y, 1.8, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#121214'; c.fillRect(k.x + 6.4, k.y - 6, 1.8, 3.4);
      c.fillStyle = '#f2f2f0'; c.fillRect(k.x + 6.4, k.y - 6, 1.8, 0.6);
    }
    // the MCU, its crystal, the reset button
    c.fillStyle = '#9aa0a8';
    for (let i = -4; i <= 4; i++) { c.fillRect(10 + i * 1.2 - 0.3, -45, 0.6, 1.4); c.fillRect(10 + i * 1.2 - 0.3, -31.4, 0.6, 1.4); }
    font(c, 2.4, 700); c.fillStyle = '#eee8d8'; c.fillText('RP2040', 10, -28);
    c.fillStyle = '#c9ccd3'; c.beginPath(); rrc(c, 28, -40, 7, 3.6, 1); c.fill();
    font(c, 3.6, 800); c.fillStyle = '#e8e2d0'; c.fillText('CHILL60 · HOTSWAP · REV 2', -60, 45);
    if (s.broken) {
      // tea seeped through: a sticky tide mark and dull, cracked joints under the W and its row
      const g = c.createRadialGradient(-80, -16, 2, -80, -16, 34);
      g.addColorStop(0, 'rgba(160,105,55,0.55)'); g.addColorStop(1, 'rgba(160,105,55,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(-80, -16, 44, 22, 0.2, 0, Math.PI * 2); c.fill();
      for (const k of K_TOP.slice(1, 5)) {
        c.fillStyle = '#7d7466'; c.beginPath(); c.arc(k.x - 3.8, k.y - 2.5, 2, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#2b2520'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(k.x - 5.4, k.y - 3.4); c.lineTo(k.x - 2.4, k.y - 1.6); c.stroke();
      }
    }
  },
};

// ---------------- brass plate full of switches ----------------

const PLATE_SCREWS: [number, number][] = [
  [K_SHIFT[0].x + 15, ROW_Y[3]], [K_SHIFT[K_SHIFT.length - 1].x - 16, ROW_Y[3]],
  [SPACE_X - 26, ROW_Y[4]], [SPACE_X + 26, ROW_Y[4]],
];
const PLATE = rrPath(0, 0, 280, 98, 4);

/** Switches seated in the plate: cream housings with a cross stem standing proud. */
const switchBumps: Bump[] = ALL.flatMap((k) => [
  { kind: 'box' as const, x: k.x, y: k.y, w: 13.4, h: 13.4, height: 5, color: SW_TOP },
  { kind: 'cross' as const, x: k.x, y: k.y, w: 5, height: 7.4, color: STEM },
]);

const plate: PartDef = {
  id: 'plate', name: { en: 'Brass Plate & Switches', vi: 'Tấm đồng & công tắc' }, side: 'A', z: 4, x: 0, y: 0, w: 280, h: 98, icon: '▦',
  shape: PLATE, needs: ['p1', 'p2', 'p3', 'p4', 'stabs', 'keysNum', 'keysTop', 'keysHome', 'mods', 'modsR'], tool: 'brush',
  elev: 21, thick: 1.6, round: 0.8, mat: 'metal', body: '#9a7a3a',
  bumps: [
    ...switchBumps,
    // the spacebar's stabilizer housings
    ...[-1, 1].map((d) => ({ kind: 'box' as const, x: SPACE_X + d * STAB_DX, y: ROW_Y[4], w: 7, h: 13, height: 5, color: '#2a2a2e' })),
  ],
  draw(c) {
    // satin brass with brushed lines and the odd fingerprint of patina
    const g = c.createLinearGradient(-140, -49, 140, 49);
    g.addColorStop(0, '#e9cd8a'); g.addColorStop(0.4, BRASS); g.addColorStop(0.7, '#b38a44'); g.addColorStop(1, '#dcbc74');
    c.fillStyle = g; c.fill(PLATE);
    c.save(); c.clip(PLATE);
    const r = rng(12);
    c.lineWidth = 0.4;
    for (let i = 0; i < 260; i++) {
      const y = -49 + r() * 98, x = -140 + r() * 200;
      c.strokeStyle = r() < 0.5 ? 'rgba(255,245,210,0.3)' : 'rgba(90,60,20,0.15)';
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30 + r() * 60, y); c.stroke();
    }
    c.restore();
    // switch cut-outs (the housings sit in them), their clip notches
    for (const k of ALL) {
      c.fillStyle = '#17120c'; c.fillRect(k.x - 7, k.y - 7, 14, 14);
      c.fillStyle = '#e7dcc4'; c.fillRect(k.x - 6.7, k.y - 6.7, 13.4, 13.4);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(k.x - 6.7, k.y + 4.5, 13.4, 2.2);
      c.fillStyle = '#f6c97a'; c.beginPath(); c.arc(k.x, k.y - 4.6, 1, 0, Math.PI * 2); c.fill();
    }
    for (const d of [-1, 1]) { c.fillStyle = '#17120c'; c.fillRect(SPACE_X + d * STAB_DX - 4, ROW_Y[4] - 7, 8, 14); }
  },
};

const stabs: PartDef = {
  id: 'stabs', name: { en: 'Spacebar Stabilizer', vi: 'Thanh cân bằng phím cách' }, side: 'A', z: 6, x: SPACE_X, y: ROW_Y[4] + 7.5, w: 112, h: 8, icon: '〰',
  shape: rrPath(0, 0, 112, 8, 3), needs: ['space'], elev: 22.6, thick: 2.5, round: 1.2, mat: 'metal', body: '#8a8f99',
  draw(c, s) {
    c.fillStyle = '#2a2a2e'; c.fillRect(-56, -4, 112, 8);
    // the lubed steel wire, bent down at each end into the housings
    c.strokeStyle = '#b9bec6'; c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath();
    if (s.broken) { c.moveTo(-STAB_DX, -1); c.quadraticCurveTo(0, -6, STAB_DX, 1); } else { c.moveTo(-STAB_DX, 0); c.lineTo(STAB_DX, 0); }
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(-STAB_DX + 2, -0.6); c.lineTo(STAB_DX - 2, -0.6); c.stroke();
    for (const d of [-1, 1]) {
      c.fillStyle = 'rgba(255,240,180,0.5)'; c.beginPath(); c.arc(d * STAB_DX, 0, 2.6, 0, Math.PI * 2); c.fill();
    }
  },
};

const keysNum = keyRow('keysNum', { en: 'Number Row', vi: 'Hàng phím số' }, K_NUM);
const keysTop = keyRow('keysTop', { en: 'QWERTY Row', vi: 'Hàng phím QWERTY' }, K_TOP, { tool: 'brush' });
const keysHome = keyRow('keysHome', { en: 'Home Row', vi: 'Hàng phím ASDF' }, K_HOME);
const keysShift = keyRow('keysShift', { en: 'Shift Row', vi: 'Hàng phím Shift' }, K_SHIFT);
const mods = keyRow('mods', { en: 'Rose Modifiers', vi: 'Phím chức năng hồng' }, K_MODS, { icon: '🌸' });
const space = keyRow('space', { en: 'Spacebar', vi: 'Phím cách' }, K_SPACE, { icon: '▬', tool: 'sponge' });
const modsR = keyRow('modsR', { en: 'Right Modifiers', vi: 'Phím chức năng phải' }, K_MODSR);

export const keyboard: DeviceDef = {
  id: 'keyboard',
  name: { en: 'Walnut Mechanical Keyboard', vi: 'Bàn phím cơ vỏ gỗ' },
  w: CW, h: CH,
  hasBack: false,
  parts: [
    kcase, usb, board, plate, stabs, keysNum, keysTop, keysHome, keysShift, mods, space, modsR,
    screw('p1', PLATE_SCREWS[0][0], PLATE_SCREWS[0][1], 'A', 6, ['keysShift']), screw('p2', PLATE_SCREWS[1][0], PLATE_SCREWS[1][1], 'A', 6, ['keysShift']),
    screw('p3', PLATE_SCREWS[2][0], PLATE_SCREWS[2][1], 'A', 6, ['space']), screw('p4', PLATE_SCREWS[3][0], PLATE_SCREWS[3][1], 'A', 6, ['space']),
  ],
  working(c, t, k) {
    // warm white backlight leaking round every cap, a slow rainbow underglow round the case
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.lineWidth = 10;
    c.globalAlpha = k * 0.5;
    c.filter = 'blur(6px)';
    const g = c.createLinearGradient(-150, 0, 150, 0);
    for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${(i * 60 + t * 90) % 360},85%,65%)`);
    c.strokeStyle = g;
    c.beginPath(); rrc(c, 0, 0, CW + 6, CH + 6, 14); c.stroke();
    c.filter = 'none';
    c.globalAlpha = k * 0.35;
    c.fillStyle = 'rgba(255,214,150,0.6)';
    for (const key of ALL) {
      const a = 0.5 + 0.5 * Math.sin(t * 3 - key.x * 0.03);
      c.globalAlpha = k * 0.3 * a;
      c.beginPath(); rrc(c, key.x, key.y, key.w + 2.4, CAP + 2.4, 3.5); c.fill();
    }
    c.restore();
  },
  workFx: { kind: 'spark', x: 112, y: -CH / 2 + 6, color: '#ffd97a', dir: -Math.PI / 2 },
};
