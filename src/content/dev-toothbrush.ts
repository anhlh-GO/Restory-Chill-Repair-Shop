// Electric toothbrush lying on the mat: a pearly white tube, mint grip, snap-on brush head.

import { slab, shade, rrc, rrPath, ellPath, glossStreak, text, shapeFrom, roundedPts } from '../core/draw';
import { type DeviceDef, type PartDef, type Bump, screw } from './device';
import { pcb, cylH, coil, boss } from './kit';

const PEARL = '#f3f5f8';
const PEARL_D = '#e2e7ee';
const MINT = '#5fd3b4';
const CHROME = '#c9ced6';
const BRISTLE = '#eaf6ff';
const TIP = '#7fd0f0';

// The handle: a fat rounded tail tapering a little towards the neck (x -150..78).
function handlePts(inset = 0) {
  return roundedPts([
    [-150 + inset, -30 + inset, 28 - inset * 0.6], [78 - inset, -24 + inset, 22 - inset * 0.6],
    [78 - inset, 24 - inset, 22 - inset * 0.6], [-150 + inset, 30 - inset, 28 - inset * 0.6],
  ]);
}
const HANDLE = shapeFrom(handlePts());
const HANDLE_IN = shapeFrom(handlePts(7));

const BTN = { x: 14, y: 0 };
const SCREWS: [number, number][] = [[-122, -13], [-122, 13], [50, -11], [50, 11]];

const shell: PartDef = {
  id: 'shell', name: { en: 'Lower Handle Shell', vi: 'Vỏ dưới tay cầm' }, side: 'A', z: 0, x: 0, y: 0, w: 228, h: 60, icon: '🪥',
  shape: HANDLE, needs: ['coil', 'board'], thick: 26, cavity: 16, round: 24, wall: 7,
  draw(c) {
    slab(c, HANDLE, PEARL_D, -30, 30, { depth: 8, shadow: 0 });
    c.fillStyle = shade(PEARL_D, -0.22);
    c.fill(HANDLE_IN);
    c.save(); c.clip(HANDLE_IN);
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 8; c.translate(2, 4); c.stroke(HANDLE_IN);
    c.restore();
    // ribs that cradle the battery + bosses
    c.strokeStyle = shade(PEARL_D, -0.08); c.lineWidth = 2.5;
    for (const x of [-112, -40, 26]) { c.beginPath(); c.moveTo(x, -20); c.lineTo(x, 20); c.stroke(); }
    for (const [x, y] of SCREWS) boss(c, x, y, PEARL_D);
    // the shaft hole at the neck end
    c.fillStyle = '#9aa1a8'; c.beginPath(); c.arc(74, 0, 5, 0, Math.PI * 2); c.fill();
  },
};

const coilPath = rrPath(0, 0, 26, 40, 8);
const chargeCoil: PartDef = {
  id: 'coil', name: { en: 'Charging Coil', vi: 'Cuộn sạc' }, side: 'A', z: 3, x: -128, y: 0, w: 26, h: 40, icon: '🌀',
  shape: coilPath, needs: ['sleeve'], thick: 22, round: 11, body: '#8a4a1c',
  draw(c, s) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -2, 4, 26, 40, 8); c.fill();
    // grey ferrite bobbin, copper wound round its middle
    c.fillStyle = '#5a5e66'; c.beginPath(); rrc(c, 0, 0, 26, 40, 8); c.fill();
    c.save(); c.rotate(Math.PI / 2); coil(c, 30, 20); c.restore();
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); rrc(c, -4, -2, 4, 28, 2); c.fill();
    // two enamelled leads to the board
    c.strokeStyle = '#d9822e'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(12, -6); c.lineTo(16, -10); c.moveTo(12, 6); c.lineTo(16, 10); c.stroke();
    if (s.broken) {
      // a snapped winding springing loose
      c.strokeStyle = '#f0a35a'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(4, -12); c.bezierCurveTo(14, -24, -8, -26, 2, -34); c.stroke();
      c.fillStyle = 'rgba(30,20,15,0.6)'; c.beginPath(); c.ellipse(-2, 6, 7, 5, 0, 0, Math.PI * 2); c.fill();
    }
  },
};

const batPath = rrPath(0, 0, 70, 34, 15);
const battery: PartDef = {
  id: 'battery', name: { en: 'Rechargeable Battery', vi: 'Pin sạc' }, side: 'A', z: 3, x: -77, y: 0, w: 70, h: 34, icon: '🔋',
  shape: batPath, needs: ['sleeve'], thick: 30, round: 15, body: '#2f8a7a',
  draw(c, s) {
    cylH(c, 66, 32, '#3fb39a', '#c9ccd2');
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); rrc(c, -6, 0, 30, 18, 3); c.fill();
    text(c, 'Ni-MH', -6, 0, 8, '#2f6a5c', { font: 'bold' });
    text(c, '+', 22, 0, 12, '#fff', { font: 'bold' });
    // nickel tabs welded on each end
    c.fillStyle = '#d6dade'; c.fillRect(31, -4, 6, 8); c.fillRect(-37, -4, 6, 8);
    if (s.broken) {
      // puffed up, a little crust at the + end
      c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(-4, 0, 26, 15, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(230,240,245,0.9)';
      for (const [x, y, r] of [[30, -8, 4], [33, 6, 3.5], [27, 10, 2.5]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
    }
  },
};

const boardPath = rrPath(0, 0, 62, 30, 5);
const board: PartDef = {
  id: 'board', name: { en: 'Control Board', vi: 'Bo mạch' }, side: 'A', z: 2, x: -7, y: 0, w: 62, h: 30, icon: '🟩',
  shape: boardPath, needs: ['battery', 'motor'], thick: 4, mat: 'pcb', body: '#1d4a5c',
  draw(c, s) {
    pcb(c, 62, 30, 717, '#2b6f86');
    // the tactile switch the button presses + a ring of tiny LEDs round it
    c.fillStyle = '#d6dade'; c.beginPath(); rrc(c, BTN.x + 7, 0, 10, 10, 1.5); c.fill();
    c.fillStyle = '#2b2d33'; c.beginPath(); c.arc(BTN.x + 7, 0, 3, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      c.fillStyle = s.power > 0 ? '#a8ffe4' : '#e8f4f0';
      c.fillRect(BTN.x + 7 + Math.cos(a) * 10 - 1.5, Math.sin(a) * 10 - 1, 3, 2);
    }
    if (s.broken) {
      const g = c.createRadialGradient(-14, 4, 1, -14, 4, 13);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(-14, 4, 13, 0, Math.PI * 2); c.fill();
    }
  },
};

const motorPath = rrPath(0, 0, 46, 28, 13);
const motor: PartDef = {
  id: 'motor', name: { en: 'Vibration Motor', vi: 'Mô-tơ rung' }, side: 'A', z: 3, x: 50, y: 0, w: 46, h: 28, icon: '📳',
  shape: motorPath, needs: ['sleeve', 'head'], thick: 22, round: 12, mat: 'metal', body: '#8b9097',
  draw(c, s) {
    c.save(); c.translate(-5, 0);
    cylH(c, 32, 24, CHROME, '#d9b25a');
    c.restore();
    // shaft + the eccentric weight that makes the buzz
    c.fillStyle = '#9aa1a8'; c.fillRect(11, -1.5, 8, 3);
    c.save(); c.translate(18, 0); c.rotate(s.power > 0 ? s.time * 40 : 0.6);
    const g = c.createLinearGradient(0, -9, 0, 0);
    g.addColorStop(0, '#ffe29a'); g.addColorStop(1, '#b8862e');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 9, Math.PI, 0); c.closePath(); c.fill();
    c.fillStyle = '#555'; c.beginPath(); c.arc(0, 0, 1.6, 0, Math.PI * 2); c.fill();
    c.restore();
    // red / black leads back to the board
    c.lineWidth = 2; c.lineCap = 'round';
    c.strokeStyle = '#e04a3a'; c.beginPath(); c.moveTo(-21, -4); c.quadraticCurveTo(-26, -6, -28, -11); c.stroke();
    c.strokeStyle = '#222'; c.beginPath(); c.moveTo(-21, 4); c.quadraticCurveTo(-26, 6, -28, 11); c.stroke();
    if (s.broken) {
      // one lead snapped off its tag
      c.strokeStyle = '#e39a4a'; c.lineWidth = 1;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-28, -11); c.lineTo(-31 - i, -15 + i * 1.5); c.stroke(); }
      c.fillStyle = 'rgba(30,20,15,0.6)'; c.beginPath(); c.ellipse(-6, 2, 9, 6, 0, 0, Math.PI * 2); c.fill();
    }
  },
};

const sleeve: PartDef = {
  id: 'sleeve', name: { en: 'Handle Shell', vi: 'Thân bàn chải' }, side: 'A', z: 6, x: 0, y: 0, w: 228, h: 60, icon: '🪥',
  shape: HANDLE, needs: ['t1', 't2', 't3', 't4', 'button'], tool: 'sponge', elev: 26, thick: 26, round: 27,
  draw(c, s) {
    slab(c, HANDLE, PEARL, -30, 30, { depth: 6, shadow: 0 });
    glossStreak(c, HANDLE, -150, -30, 228, 40, 0.4);
    c.save(); c.clip(HANDLE);
    // tube shading: lit along the top, soft shadow underneath
    const g = c.createLinearGradient(0, -30, 0, 30);
    g.addColorStop(0, 'rgba(0,0,0,0.06)'); g.addColorStop(0.32, 'rgba(255,255,255,0.35)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(40,60,80,0.18)');
    c.fillStyle = g; c.fillRect(-150, -30, 228, 60);
    // mint soft-touch grip panel round the button
    c.fillStyle = MINT; c.beginPath(); rrc(c, 6, 0, 76, 30, 15); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); rrc(c, 6, -8, 62, 5, 2.5); c.fill();
    // chrome collar at the neck
    const m = c.createLinearGradient(0, -26, 0, 26);
    m.addColorStop(0, '#8d9199'); m.addColorStop(0.35, '#f4f6f9'); m.addColorStop(1, '#6a6e76');
    c.fillStyle = m; c.fillRect(64, -26, 8, 52);
    c.restore();
    // LED ring round the button
    const on = s.power > 0;
    c.strokeStyle = on ? `rgba(120,255,210,${0.7 + 0.3 * Math.sin(s.time * 5)})` : '#c8d3d0'; c.lineWidth = 3;
    c.beginPath(); c.arc(BTN.x, BTN.y, 15, 0, Math.PI * 2); c.stroke();
    // three charge dots + a brand line towards the tail
    for (let i = 0; i < 3; i++) {
      c.fillStyle = on ? '#7dffc9' : '#cfd6dc';
      c.beginPath(); c.arc(-36 + i * 9, 0, 2.4, 0, Math.PI * 2); c.fill();
    }
    text(c, 'CHILL·BRUSH', -86, 0, 10, '#9fb3c4', { font: 'bold' });
    if (s.broken) {
      c.strokeStyle = 'rgba(90,100,110,0.8)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-100, -26); c.lineTo(-94, -14); c.lineTo(-99, -4); c.lineTo(-92, 8); c.stroke();
    }
  },
};

const btnPath = ellPath(0, 0, 11, 11);
const button: PartDef = {
  id: 'button', name: { en: 'Power Button', vi: 'Nút nguồn' }, side: 'A', z: 7, x: BTN.x, y: BTN.y, w: 22, h: 22, icon: '⏻',
  shape: btnPath, tool: 'brush', thick: 6, round: 5, mat: 'rubber', body: shade(MINT, -0.3),
  draw(c, s) {
    const g = c.createRadialGradient(-3, -4, 1, 0, 0, 11);
    g.addColorStop(0, shade(MINT, 0.5)); g.addColorStop(1, shade(MINT, -0.08));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.fill();
    // power glyph
    c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 1, 5, -Math.PI * 0.32, Math.PI * 1.32); c.stroke();
    c.beginPath(); c.moveTo(0, -5); c.lineTo(0, 0); c.stroke();
    if (s.broken) {
      c.strokeStyle = '#3a8a74'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-8, -3); c.lineTo(-1, 3); c.lineTo(7, -5); c.stroke();
    }
  },
};

// Snap-on brush head: collar, slim neck, oval bristle pad (head-local, x -40..40).
const HEAD = shapeFrom(roundedPts([
  [-40, -14, 5], [-26, -14, 4], [-20, -8, 4], [8, -8, 5], [14, -15, 10], [40, -15, 14],
  [40, 15, 14], [14, 15, 10], [8, 8, 5], [-20, 8, 4], [-26, 14, 4], [-40, 14, 5],
]));
const TUFTS: [number, number][] = [];
for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) TUFTS.push([18 + i * 6.5, -8 + j * 8]);
const head: PartDef = {
  id: 'head', name: { en: 'Brush Head', vi: 'Đầu bàn chải' }, side: 'A', z: 7, x: 112, y: 0, w: 80, h: 30, icon: '🪥',
  shape: HEAD, tool: 'sponge', elev: 16, thick: 16, round: 7, body: '#d6dde6',
  bumps: TUFTS.map(([x, y], i) => ({ kind: 'cyl', x, y, w: 6, height: 9, color: i % 3 === 1 ? TIP : BRISTLE }) as Bump),
  draw(c, s) {
    slab(c, HEAD, PEARL, -15, 15, { depth: 5, shadow: 0 });
    glossStreak(c, HEAD, -40, -15, 80, 20, 0.35);
    // mint ring on the collar
    c.fillStyle = MINT; c.fillRect(-36, -13, 5, 26);
    // bristle tufts: white with a blue wear-indicator row
    const jig = s.power > 0 ? Math.sin(s.time * 90) * 1.2 : 0;
    for (const [i, [x, y]] of TUFTS.entries()) {
      const col = i % 3 === 1 ? TIP : BRISTLE;
      c.fillStyle = shade(col, -0.3); c.beginPath(); c.arc(x + jig, y + 1, 3.2, 0, Math.PI * 2); c.fill();
      c.fillStyle = col; c.beginPath(); c.arc(x + jig, y, 3, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(x + jig - 1, y - 1, 1, 0, Math.PI * 2); c.fill();
    }
    if (s.broken) {
      // splayed, gunky bristles crusted with old toothpaste
      c.fillStyle = 'rgba(200,190,120,0.75)';
      for (const [x, y, r] of [[20, -6, 5], [30, 4, 6], [36, -8, 4], [24, 9, 3.5]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = BRISTLE; c.lineWidth = 1.2;
      for (const [x, y, dx, dy] of [[16, -12, -4, -6], [38, -12, 4, -5], [38, 12, 5, 4], [16, 12, -4, 6]]) {
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y + dy); c.stroke();
      }
    }
  },
};

export const toothbrush: DeviceDef = {
  id: 'toothbrush',
  name: { en: 'Electric Toothbrush', vi: 'Bàn chải điện' },
  w: 304, h: 64,
  hasBack: false,
  parts: [
    shell, chargeCoil, battery, board, motor, sleeve, button, head,
    ...SCREWS.map(([x, y], i) => screw(`t${i + 1}`, x, y, 'A')),
  ],
  working(c, t, k) {
    c.save();
    // buzz lines either side of the head
    c.strokeStyle = '#7fd0f0'; c.lineWidth = 2.5; c.lineCap = 'round';
    for (const sy of [-1, 1]) for (let i = 0; i < 3; i++) {
      const w = Math.sin(t * 40 + i) * 2;
      c.globalAlpha = k * (0.5 + 0.3 * Math.sin(t * 20 + i));
      c.beginPath(); c.moveTo(118 + i * 12, sy * (24 + w)); c.lineTo(124 + i * 12, sy * (30 + w)); c.stroke();
    }
    // foamy bubbles drifting up off the bristles
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.7 + i / 6) % 1;
      const x = 126 + Math.sin(i * 2.3 + t * 3) * 14;
      c.globalAlpha = k * (1 - p) * 0.9;
      c.strokeStyle = '#bfefff'; c.lineWidth = 1.5;
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.beginPath(); c.arc(x, -10 - p * 50, 3 + (i % 3) * 1.5, 0, Math.PI * 2); c.fill(); c.stroke();
    }
    c.restore();
  },
  workFx: { kind: 'steam', x: 126, y: -14, color: '#d9f6ff', dir: -Math.PI / 2 },
};
