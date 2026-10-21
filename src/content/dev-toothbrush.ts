// Sonic electric toothbrush lying on its back, front face up: a slim glossy
// white handle with a waist and a soft-touch sage grip down both sides, a
// raised power button, a mode key and a three-bar charge gauge, a brushed
// chrome ring at the shoulder, and the snap-on brush head (collar, long neck,
// oval pad with tufted bristles). Inside: an inductive charging coil, a long
// Li-ion cell, a slim control board and the resonant sonic drive.

import { type C, type Pts, shade, rrc, rrPath, shapeFrom, rng } from '../core/draw';
import { type DeviceDef, type PartDef, type Bump, screw } from './device';
import { pcb, coil, boss } from './kit';

const WHITE = '#f5f6f8';
const SAGE = '#7fb8a8';
const SAGE_D = '#4f8a7b';
const CHROME = '#d4d8de';
const BRISTLE = '#f3f7fb';
const TIP = '#62b8e6';
const SANS = '"Helvetica Neue", Arial, sans-serif';

// ---------------- the handle outline: a waisted tube with a rounded base and a domed shoulder ----------------

const X0 = -150, X1 = 64;
/** Half width of the handle along its length (smooth through the knots). */
const KNOTS: [number, number][] = [[-150, 22.5], [-112, 22.5], [-62, 19.8], [-8, 21.8], [30, 21.6], [52, 18.5], [64, 15]];
function hw(x: number): number {
  for (let i = 1; i < KNOTS.length; i++) {
    const [xa, ya] = KNOTS[i - 1], [xb, yb] = KNOTS[i];
    if (x <= xb) {
      const t = Math.max(0, (x - xa) / (xb - xa));
      const e = t * t * (3 - 2 * t);
      return ya + (yb - ya) * e;
    }
  }
  return KNOTS[KNOTS.length - 1][1];
}
function handlePts(k = 0): Pts {
  const a = X0 + k, b = X1 - k;
  const RB = 9, RT = 13;
  const top: Pts = [];
  const n = 90;
  for (let i = 0; i <= n; i++) {
    // denser at the ends, where the caps bend
    const u = i / n;
    const x = a + (b - a) * (0.5 - 0.5 * Math.cos(u * Math.PI));
    let f = 1;
    if (x < a + RB) f = Math.sqrt(Math.max(0, 1 - ((a + RB - x) / RB) ** 2));
    if (x > b - RT) f = Math.sqrt(Math.max(0, 1 - ((x - (b - RT)) / RT) ** 2));
    const y = Math.max(0, hw(x) - k) * Math.max(0.0, f);
    top.push([x, -y]);
  }
  const bot: Pts = top.slice(1, -1).map(([x, y]) => [x, -y] as [number, number]).reverse();
  return [...top, ...bot];
}
const HANDLE = shapeFrom(handlePts());
const HANDLE_IN = shapeFrom(handlePts(6));

const BTN = { x: 20, y: 0 };
const MODE = { x: -12, y: 0 };
const GAUGE_X = -38;
const SCREWS: [number, number][] = [[-136, -9], [-136, 9], [50, -8], [50, 8]];

function font(c: C, size: number, weight = 700): void {
  c.font = `${weight} ${size}px ${SANS}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
}

/** Soft-touch rubber: a fine stipple over the colour. */
function softTouch(c: C, path: Path2D, color: string, seed: number, x: number, y: number, w: number, h: number): void {
  c.save();
  c.clip(path);
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
  const r = rng(seed);
  for (let i = 0; i < (w * h) / 6; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
    c.fillRect(x + r() * w, y + r() * h, 0.8, 0.8);
  }
  c.restore();
}

/** Brushed chrome band across the handle (x0..x1). */
function chromeBand(c: C, x0: number, x1: number, h: number): void {
  const g = c.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, '#8d929a'); g.addColorStop(0.25, '#f6f8fa'); g.addColorStop(0.55, CHROME); g.addColorStop(1, '#7c8189');
  c.fillStyle = g;
  c.fillRect(x0, -h, x1 - x0, h * 2);
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.3;
  for (let y = -h; y < h; y += 1.1) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
}

// ---------------- lower half: the hollow handle tub ----------------

const shell: PartDef = {
  id: 'shell', name: { en: 'Inner Chassis', vi: 'Khung trong' }, side: 'A', z: 0, x: 0, y: 0, w: 214, h: 46, icon: '🪥',
  shape: HANDLE, needs: ['coil', 'board'], thick: 6, cavity: 4, round: 6, wall: 4, body: '#dfe3e8',
  draw(c) {
    // the outside: white with the sage grips down both flanks
    c.fillStyle = WHITE; c.fill(HANDLE);
    c.save(); c.clip(HANDLE);
    for (const sy of [-1, 1]) { c.fillStyle = SAGE; c.fillRect(-104, sy > 0 ? 14 : -25, 150, 11); }
    c.fillStyle = '#d9dde3'; c.fillRect(X0, -30, 16, 60);
    c.restore();
    // the inside: a pale grey moulding with ribs and screw posts
    c.fillStyle = '#c7ccd3'; c.fill(HANDLE_IN);
    c.save(); c.clip(HANDLE_IN);
    c.strokeStyle = 'rgba(40,50,60,0.3)'; c.lineWidth = 7; c.translate(2, 3); c.stroke(HANDLE_IN);
    c.restore();
    c.strokeStyle = '#b4bac2'; c.lineWidth = 2.5;
    for (const x of [-116, -30, 12]) { c.beginPath(); c.moveTo(x, -15); c.lineTo(x, 15); c.stroke(); }
    // the battery cradle: two curved saddles
    c.strokeStyle = '#aab0b8'; c.lineWidth = 2;
    for (const x of [-92, -40]) { c.beginPath(); c.moveTo(x - 3, -14); c.quadraticCurveTo(x + 4, 0, x - 3, 14); c.stroke(); }
    for (const [x, y] of SCREWS) boss(c, x, y, '#cdd2d8');
    // the drive shaft's bearing at the shoulder
    c.fillStyle = '#7d838c'; c.beginPath(); c.arc(60, 0, 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e6e9ed'; c.beginPath(); c.arc(60, 0, 2.2, 0, Math.PI * 2); c.fill();
  },
};

// ---------------- insides ----------------

const coilPath = rrPath(0, 0, 22, 32, 6);
const chargeCoil: PartDef = {
  id: 'coil', name: { en: 'Charging Coil', vi: 'Cuộn sạc' }, side: 'A', z: 3, x: -130, y: 0, w: 22, h: 32, icon: '🌀',
  shape: coilPath, needs: ['sleeve'], thick: 14, round: 7, body: '#8a4a1c',
  draw(c, s) {
    // grey ferrite pot core, copper wound round the middle, a white bobbin flange each side
    c.fillStyle = '#4c5058'; c.beginPath(); rrc(c, 0, 0, 22, 32, 6); c.fill();
    c.fillStyle = '#eceae4'; c.fillRect(-11, -14, 22, 3); c.fillRect(-11, 11, 22, 3);
    c.save(); c.rotate(Math.PI / 2); coil(c, 22, 20); c.restore();
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-9, -10, 3, 20);
    c.strokeStyle = '#d9822e'; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(11, -6); c.lineTo(14, -9); c.moveTo(11, 6); c.lineTo(14, 9); c.stroke();
    if (s.broken) {
      c.strokeStyle = '#f0a35a'; c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(4, -9); c.bezierCurveTo(12, -20, -8, -22, 2, -30); c.stroke();
    }
  },
};

const batPath = rrPath(0, 0, 76, 26, 12);
const battery: PartDef = {
  id: 'battery', name: { en: 'Li-ion Cell', vi: 'Pin Li-ion' }, side: 'A', z: 3, x: -72, y: 0, w: 76, h: 26, icon: '🔋',
  shape: batPath, needs: ['sleeve'], thick: 22, round: 11, body: '#2a5d8a',
  draw(c, s) {
    // blue shrink wrap round a steel can, the + button towards the head
    c.fillStyle = '#d5d9de'; c.beginPath(); rrc(c, 0, 0, 76, 26, 12); c.fill();
    c.fillStyle = '#2f6fa8'; c.fillRect(-34, -13, 66, 26);
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(-34, -8, 66, 3);
    c.fillStyle = '#f2f4f6'; c.fillRect(-20, -13, 26, 26);
    font(c, 5.5, 800); c.fillStyle = '#1e3f63'; c.fillText('Li-ion', -7, -4);
    font(c, 3.6, 700); c.fillText('3.7V 800mAh', -7, 3);
    font(c, 7, 800); c.fillStyle = '#ffffff'; c.fillText('+', 24, 0);
    // nickel tabs welded on each end
    c.fillStyle = '#c7ccd2'; c.fillRect(34, -5, 4, 10); c.fillRect(-38, -5, 4, 10);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-34, -13, 1, 26); c.fillRect(31, -13, 1, 26);
    if (s.broken) {
      c.fillStyle = 'rgba(235,240,232,0.9)';
      for (const [x, y, r] of [[30, -7, 3.5], [33, 6, 3]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
    }
  },
};

const boardPath = rrPath(0, 0, 124, 26, 4);
const board: PartDef = {
  id: 'board', name: { en: 'Control Board', vi: 'Bo mạch' }, side: 'A', z: 2, x: -38, y: 0, w: 124, h: 26, icon: '🟩',
  shape: boardPath, needs: ['battery', 'motor'], thick: 3, mat: 'pcb', body: '#16424e',
  bumps: [
    { kind: 'box', x: BTN.x + 38, y: 0, w: 7, h: 7, height: 2.5, color: '#d6dade', metal: true },
    { kind: 'box', x: 12, y: 5, w: 9, h: 6, height: 1.5, color: '#202228' },
  ],
  draw(c, s) {
    pcb(c, 124, 26, 717, '#1f6474');
    // the tactile switch under the power button, the mode switch, the gauge LEDs
    c.fillStyle = '#d6dade'; c.beginPath(); rrc(c, BTN.x + 38, 0, 8, 8, 1.2); c.fill();
    c.fillStyle = '#2b2d33'; c.beginPath(); c.arc(BTN.x + 38, 0, 2.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#d6dade'; c.beginPath(); rrc(c, MODE.x + 38, 0, 6, 6, 1); c.fill();
    for (let i = 0; i < 3; i++) {
      c.fillStyle = s.power > 0 ? '#9dffd9' : '#f2f2ea';
      c.fillRect(GAUGE_X + 38 - 6 + i * 5 - 1.2, -1, 2.4, 2);
    }
    // the microcontroller, a silkscreened part number
    c.fillStyle = '#202228'; c.beginPath(); rrc(c, 12, 5, 9, 6, 0.8); c.fill();
    font(c, 2.6, 700); c.fillStyle = '#e8f0ee'; c.fillText('CS-HX6', -38, 9);
    if (s.broken) {
      const g = c.createRadialGradient(-20, 4, 1, -20, 4, 11);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(-20, 4, 11, 0, Math.PI * 2); c.fill();
    }
  },
};

const motorPath = rrPath(0, 0, 44, 26, 9);
const motor: PartDef = {
  id: 'motor', name: { en: 'Sonic Drive', vi: 'Bộ rung sonic' }, side: 'A', z: 3, x: 36, y: 0, w: 44, h: 26, icon: '📳',
  shape: motorPath, needs: ['sleeve', 'head'], thick: 20, round: 10, mat: 'metal', body: '#8b9097',
  draw(c, s) {
    // steel can with a stamped end, the drive coil showing through a window, the shaft to the head
    const g = c.createLinearGradient(0, -13, 0, 13);
    g.addColorStop(0, '#6f747c'); g.addColorStop(0.3, '#eef1f4'); g.addColorStop(0.6, '#b9bec6'); g.addColorStop(1, '#5d626a');
    c.fillStyle = g; c.beginPath(); rrc(c, -2, 0, 40, 26, 8); c.fill();
    c.save(); c.translate(-4, 0); coil(c, 16, 12); c.restore();
    c.strokeStyle = 'rgba(40,44,50,0.5)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(-20, -11); c.lineTo(-20, 11); c.moveTo(14, -11); c.lineTo(14, 11); c.stroke();
    c.fillStyle = '#9aa1a8'; c.fillRect(18, -1.8, 4, 3.6);
    const jig = s.power > 0 ? Math.sin(s.time * 80) * 0.8 : 0;
    c.fillStyle = '#e8ebef'; c.fillRect(18 + jig, -1.4, 4, 2.8);
    c.lineWidth = 1.6; c.lineCap = 'round';
    c.strokeStyle = '#e04a3a'; c.beginPath(); c.moveTo(-20, -5); c.quadraticCurveTo(-24, -7, -25, -11); c.stroke();
    c.strokeStyle = '#222'; c.beginPath(); c.moveTo(-20, 5); c.quadraticCurveTo(-24, 7, -25, 11); c.stroke();
  },
};

// ---------------- the handle shell ----------------

const sleeve: PartDef = {
  id: 'sleeve', name: { en: 'Handle Shell', vi: 'Thân bàn chải' }, side: 'A', z: 6, x: 0, y: 0, w: 214, h: 46, icon: '🪥',
  shape: HANDLE, needs: ['t1', 't2', 't3', 't4', 'button'], tool: 'sponge', elev: 6, thick: 34, round: 22, body: '#e3e7ec',
  bumps: [
    { kind: 'box', x: MODE.x, y: MODE.y, w: 9, h: 6.5, height: 2.2, color: '#eef0f2' },
  ],
  draw(c, s) {
    // glossy white body; a faint cool tint where it curves away
    c.fillStyle = WHITE; c.fill(HANDLE);
    c.save(); c.clip(HANDLE);
    const g = c.createLinearGradient(0, -23, 0, 23);
    g.addColorStop(0, 'rgba(150,165,185,0.22)'); g.addColorStop(0.3, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(150,165,185,0.28)');
    c.fillStyle = g; c.fillRect(X0, -24, X1 - X0, 48);
    // sage soft-touch grip down both flanks (it reads as the sides of the tube), tapering in at each end
    const grip = new Path2D();
    for (const sy of [-1, 1]) {
      grip.moveTo(-108, sy * 30);
      grip.bezierCurveTo(-96, sy * 15.5, -60, sy * 14.5, -20, sy * 15.8);
      grip.bezierCurveTo(10, sy * 16.5, 30, sy * 16.5, 46, sy * 30);
      grip.closePath();
    }
    softTouch(c, grip, SAGE, 31, -110, -30, 160, 60);
    c.strokeStyle = shade(SAGE, -0.3); c.lineWidth = 0.6; c.stroke(grip);
    // the grey base cap and its seam (the charging foot)
    c.fillStyle = '#e1e4e9'; c.fillRect(X0, -24, 18, 48);
    c.strokeStyle = 'rgba(80,90,100,0.45)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(X0 + 18, -24); c.lineTo(X0 + 18, 24); c.stroke();
    // brushed chrome ring at the shoulder
    chromeBand(c, 55, 61, 24);
    c.restore();
    // the button's recessed collar, the mode key well, the charge gauge
    c.fillStyle = '#dfe3e8'; c.beginPath(); rrc(c, BTN.x, BTN.y, 34, 21, 10.5); c.fill();
    c.strokeStyle = 'rgba(90,100,112,0.45)'; c.lineWidth = 0.8; c.beginPath(); rrc(c, BTN.x, BTN.y, 34, 21, 10.5); c.stroke();
    c.fillStyle = '#d4d9df'; c.beginPath(); rrc(c, MODE.x, MODE.y, 12, 9, 3); c.fill();
    const on = s.power;
    for (let i = 0; i < 3; i++) {
      const x = GAUGE_X - 6 + i * 5;
      c.fillStyle = on > 0 ? `rgba(110,240,190,${0.6 + 0.4 * on})` : '#d3d8de';
      c.beginPath(); rrc(c, x, 0, 3, 8, 1.2); c.fill();
      if (on > 0) {
        const lg = c.createRadialGradient(x, 0, 0.5, x, 0, 7);
        lg.addColorStop(0, `rgba(120,255,200,${0.45 * on})`); lg.addColorStop(1, 'rgba(120,255,200,0)');
        c.fillStyle = lg; c.beginPath(); c.arc(x, 0, 7, 0, Math.PI * 2); c.fill();
      }
    }
    // little printed marks: mode icons, the brand along the barrel, the model at the foot
    font(c, 3.6, 700); c.fillStyle = '#9aa4ae';
    c.fillText('CLEAN · WHITE · GUM', -12, -9);
    font(c, 8.5, 300); c.fillStyle = '#8e99a4';
    c.save(); c.translate(-80, 0);
    c.fillText('chill', -13, 0.4);
    font(c, 8.5, 800); c.fillStyle = '#5c6b78'; c.fillText('sonic', 11, 0.4);
    c.restore();
    font(c, 3, 600); c.fillStyle = '#a3abb4'; c.fillText('HX-2040', X0 + 9, 0);
    if (s.broken) {
      c.strokeStyle = 'rgba(90,100,110,0.8)'; c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(-100, -18); c.lineTo(-95, -9); c.lineTo(-99, -2); c.lineTo(-93, 7); c.stroke();
    }
  },
};

const btnPath = rrPath(0, 0, 28, 15, 7.5);
const button: PartDef = {
  id: 'button', name: { en: 'Power Button', vi: 'Nút nguồn' }, side: 'A', z: 7, x: BTN.x, y: BTN.y, w: 28, h: 15, icon: '⏻',
  shape: btnPath, tool: 'brush', thick: 4, round: 3, mat: 'rubber', body: SAGE_D,
  draw(c, s) {
    softTouch(c, btnPath, SAGE, 77, -14, -8, 28, 16);
    // a ring of light round the power glyph
    const on = s.power > 0;
    c.strokeStyle = on ? `rgba(220,255,240,${0.75 + 0.25 * Math.sin(s.time * 5)})` : 'rgba(255,255,255,0.75)';
    c.lineWidth = 1.4; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 0.4, 3.6, -Math.PI * 0.3, Math.PI * 1.3); c.stroke();
    c.beginPath(); c.moveTo(0, -4.2); c.lineTo(0, -0.4); c.stroke();
    if (s.broken) {
      c.strokeStyle = SAGE_D; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(-10, -3); c.lineTo(-4, 3); c.lineTo(3, -4); c.stroke();
    }
  },
};

// ---------------- the brush head: collar, long tapered neck, oval tufted pad ----------------

const HX = 118;
function headPts(): Pts {
  // local x: collar -56..-34, neck -34..18, pad 18..56
  const prof: [number, number][] = [
    [-56, 14.5], [-50, 14], [-38, 12], [-32, 8], [-20, 6.3], [10, 5.4], [16, 6.5], [21, 10.5], [28, 12.2], [44, 12], [52, 9.5], [56, 0],
  ];
  const top: Pts = [];
  const steps = 64;
  const x0 = prof[0][0], x1 = prof[prof.length - 1][0];
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    let y = 0;
    for (let k = 1; k < prof.length; k++) {
      const [xa, ya] = prof[k - 1], [xb, yb] = prof[k];
      if (x <= xb) {
        const t = (x - xa) / (xb - xa);
        const e = t * t * (3 - 2 * t);
        y = ya + (yb - ya) * e;
        break;
      }
    }
    // round the pad's tip into an oval
    if (x > 44) y = 12 * Math.sqrt(Math.max(0, 1 - ((x - 44) / 12) ** 2));
    top.push([x, -y]);
  }
  const bot: Pts = top.slice(1, -1).map(([x, y]) => [x, -y] as [number, number]).reverse();
  // flat back of the collar
  return [[-56, 0], ...top.slice(1), ...bot];
}
const HEAD = shapeFrom(headPts());
const TUFTS: [number, number][] = [];
for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
  const x = 26 + i * 6, y = -7 + j * 7;
  TUFTS.push([x, y]);
}
TUFTS.push([52, 0]);
const isTip = (i: number) => i % 3 === 1 && i < 15;

const head: PartDef = {
  id: 'head', name: { en: 'Brush Head', vi: 'Đầu bàn chải' }, side: 'A', z: 7, x: HX, y: 0, w: 112, h: 29, icon: '🪥',
  shape: HEAD, tool: 'sponge', elev: 6, thick: 13, round: 6, body: '#d8dde4',
  bumps: TUFTS.map(([x, y], i) => ({ kind: 'cyl', x, y, w: 5.2, height: 9, color: isTip(i) ? TIP : BRISTLE }) as Bump),
  draw(c, s) {
    c.fillStyle = WHITE; c.fill(HEAD);
    c.save(); c.clip(HEAD);
    const g = c.createLinearGradient(0, -14, 0, 14);
    g.addColorStop(0, 'rgba(150,165,185,0.25)'); g.addColorStop(0.35, 'rgba(255,255,255,0)'); g.addColorStop(0.65, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(150,165,185,0.3)');
    c.fillStyle = g; c.fillRect(-56, -15, 112, 30);
    // the sage colour ring that tells whose head it is, and the collar's grip lines
    c.fillStyle = SAGE; c.fillRect(-47, -15, 5, 30);
    c.strokeStyle = 'rgba(120,132,145,0.45)'; c.lineWidth = 0.6;
    for (let x = -54; x < -48; x += 1.6) { c.beginPath(); c.moveTo(x, -15); c.lineTo(x, 15); c.stroke(); }
    c.restore();
    // the bristle bed: a pale pad the tufts are stapled into
    c.fillStyle = '#e3e8ee'; c.beginPath(); c.ellipse(39, 0, 15.5, 10.5, 0, 0, Math.PI * 2); c.fill();
    const jig = s.power > 0 ? Math.sin(s.time * 90) * 1 : 0;
    for (const [i, [x, y]] of TUFTS.entries()) {
      const col = isTip(i) ? TIP : BRISTLE;
      c.fillStyle = shade(col, -0.25); c.beginPath(); c.arc(x + jig, y + 0.6, 2.8, 0, Math.PI * 2); c.fill();
      c.fillStyle = col; c.beginPath(); c.arc(x + jig, y, 2.5, 0, Math.PI * 2); c.fill();
      // the fibre ends
      c.fillStyle = 'rgba(255,255,255,0.7)';
      for (let k = 0; k < 4; k++) { const a = k * 1.6 + i; c.fillRect(x + jig + Math.cos(a) * 1.2 - 0.3, y + Math.sin(a) * 1.2 - 0.3, 0.6, 0.6); }
    }
    font(c, 3.2, 700); c.fillStyle = '#a4adb7'; c.fillText('ProClean', -12, 0);
    if (s.broken) {
      // splayed, gunky bristles crusted with old toothpaste
      c.fillStyle = 'rgba(205,195,125,0.8)';
      for (const [x, y, r] of [[30, -5, 4.5], [40, 4, 5.5], [48, -6, 3.5], [34, 8, 3]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = BRISTLE; c.lineWidth = 1.1;
      for (const [x, y, dx, dy] of [[25, -10, -4, -5], [50, -10, 4, -5], [50, 10, 5, 4], [25, 10, -4, 5], [55, 0, 5, 1]]) {
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y + dy); c.stroke();
      }
      c.fillStyle = 'rgba(120,150,90,0.35)'; c.beginPath(); c.ellipse(-30, 3, 8, 3, 0, 0, Math.PI * 2); c.fill();
    }
  },
};

export const toothbrush: DeviceDef = {
  id: 'toothbrush',
  name: { en: 'Electric Toothbrush', vi: 'Bàn chải điện' },
  w: 330, h: 50,
  hasBack: false,
  parts: [
    shell, chargeCoil, battery, board, motor, sleeve, button, head,
    ...SCREWS.map(([x, y], i) => screw(`t${i + 1}`, x, y, 'A')),
  ],
  working(c, t, k) {
    c.save();
    // buzz lines either side of the head
    c.strokeStyle = '#7fd0f0'; c.lineWidth = 2.2; c.lineCap = 'round';
    for (const sy of [-1, 1]) for (let i = 0; i < 3; i++) {
      const w = Math.sin(t * 40 + i) * 2;
      c.globalAlpha = k * (0.5 + 0.3 * Math.sin(t * 20 + i));
      c.beginPath(); c.moveTo(HX + 22 + i * 12, sy * (18 + w)); c.lineTo(HX + 28 + i * 12, sy * (25 + w)); c.stroke();
    }
    // foamy bubbles drifting up off the bristles
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.7 + i / 6) % 1;
      const x = HX + 38 + Math.sin(i * 2.3 + t * 3) * 12;
      c.globalAlpha = k * (1 - p) * 0.9;
      c.strokeStyle = '#bfefff'; c.lineWidth = 1.4;
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.beginPath(); c.arc(x, -8 - p * 46, 2.6 + (i % 3) * 1.3, 0, Math.PI * 2); c.fill(); c.stroke();
    }
    c.restore();
  },
  workFx: { kind: 'steam', x: HX + 38, y: -10, color: '#d9f6ff', dir: -Math.PI / 2 },
};
