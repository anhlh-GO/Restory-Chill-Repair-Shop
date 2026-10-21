// 1970s compact rangefinder lying on its back, front face up: black pebbled
// leatherette between brushed-chrome top and bottom plates, a tall stepped lens
// barrel, and the top-plate controls (speed dial, hot shoe, rewind crank)
// sticking out past the top edge. Vy's mother's camera: the chrome is worn to
// brass at the corners.

import { type C, shade, rrc, rrPath, ellPath, rng, shapeFrom, roundedPts, rrPts, ellPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, coil, boss, cylH } from './kit';

const CHROME = '#c8ccd2';
const LEATHER = '#1e1d1c';
const BLACK = '#131315';
const BRASS = '#c99a4a';
const SANS = '"Helvetica Neue", Arial, sans-serif';

// lens axis, the band split of the front (top plate | leatherette | bottom plate)
const LX = 14, LY = 6;
const TOP_B = -54, BOT_B = 64;
// top plate front: viewfinder, meter cell, rangefinder spot, flash window
const VF = { x: -98, y: -70 }, CELL = { x: -52, y: -70 }, RF = { x: 64, y: -70 }, FW = { x: 102, y: -70 };

// ---------------- painting helpers ----------------

function font(c: C, size: number, weight = 700): void {
  c.font = `${weight} ${size}px ${SANS}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
}

/** Letters set round a circle, centred on angle `mid`; `under` reads along the bottom. */
function arcText(c: C, s: string, r: number, mid: number, size: number, color: string, under = false): void {
  font(c, size);
  c.fillStyle = color;
  const ws = [...s].map((ch) => c.measureText(ch).width * 1.08);
  const total = ws.reduce((a, b) => a + b, 0) / r;
  let a = under ? mid + total / 2 : mid - total / 2;
  for (let i = 0; i < ws.length; i++) {
    const da = ws[i] / r;
    a += under ? -da / 2 : da / 2;
    c.save();
    c.translate(Math.cos(a) * r, Math.sin(a) * r);
    c.rotate(under ? a - Math.PI / 2 : a + Math.PI / 2);
    c.fillText(s[i], 0, 0);
    c.restore();
    a += under ? -da / 2 : da / 2;
  }
}

/** Black pebble-grain leatherette inside a rect (clip first). */
function leatherette(c: C, x: number, y: number, w: number, h: number, seed: number): void {
  c.fillStyle = LEATHER;
  c.fillRect(x, y, w, h);
  const r = rng(seed);
  for (let i = 0; i < (w * h) / 4.5; i++) {
    const px = x + r() * w, py = y + r() * h, s = 0.55 + r() * 0.75;
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.beginPath(); c.arc(px + 0.25, py + 0.3, s, 0, Math.PI * 2); c.fill();
    c.fillStyle = `rgba(255,248,235,${0.05 + r() * 0.07})`;
    c.beginPath(); c.arc(px - 0.2, py - 0.25, s * 0.7, 0, Math.PI * 2); c.fill();
  }
}

/** Brushed chrome band: a polished bevel at both edges and fine horizontal hairlines. */
function chrome(c: C, x: number, y: number, w: number, h: number, seed: number): void {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#f4f6f8'); g.addColorStop(0.12, '#9ea3ab'); g.addColorStop(0.3, '#dfe2e6');
  g.addColorStop(0.75, CHROME); g.addColorStop(0.9, '#a6abb3'); g.addColorStop(1, '#eef0f2');
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
  const r = rng(seed);
  c.lineWidth = 0.35;
  for (let i = 0; i < h * 3; i++) {
    const yy = y + r() * h;
    c.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.2 + r() * 0.3})` : `rgba(70,76,86,${0.08 + r() * 0.14})`;
    const x0 = x + r() * w * 0.6;
    c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 + w * (0.2 + r() * 0.5), yy); c.stroke();
  }
}

/** A side-on knurled metal cylinder (axis up the screen): shading across, ridges along. */
function knurlSide(c: C, x: number, y: number, w: number, h: number, color: string, pitch = 2.2): void {
  const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, shade(color, -0.5)); g.addColorStop(0.3, shade(color, 0.45)); g.addColorStop(0.45, shade(color, 0.2));
  g.addColorStop(0.8, shade(color, -0.25)); g.addColorStop(1, shade(color, -0.55));
  c.fillStyle = g;
  c.fillRect(x - w / 2, y - h / 2, w, h);
  c.lineWidth = 0.7;
  for (let k = -w / 2 + pitch / 2; k < w / 2; k += pitch) {
    c.strokeStyle = 'rgba(20,22,28,0.45)';
    c.beginPath(); c.moveTo(x + k, y - h / 2); c.lineTo(x + k, y + h / 2); c.stroke();
  }
}

/** Radial teeth at a ring's rim: they paint the part's side wall as vertical knurling. */
function teeth(c: C, r0: number, r1: number, n: number, dark: string, light: string): void {
  c.fillStyle = dark;
  c.beginPath(); c.arc(0, 0, r1, 0, Math.PI * 2); c.arc(0, 0, r0, 0, Math.PI * 2, true); c.fill();
  c.fillStyle = light;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, b = ((i + 0.45) / n) * Math.PI * 2;
    c.beginPath(); c.arc(0, 0, r1, a, b); c.arc(0, 0, r0, b, a, true); c.closePath(); c.fill();
  }
}

/** Deep multicoated glass: black baffle, dark elements, purple/green coating glints, a window highlight. */
function deepGlass(c: C, r: number, power: number): void {
  c.fillStyle = '#060709';
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  // the retaining ring's fine threads
  c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 0.5;
  for (let k = r * 0.86; k < r; k += 1.1) { c.beginPath(); c.arc(0, 0, k, 0, Math.PI * 2); c.stroke(); }
  const gr = r * 0.84;
  const g = c.createRadialGradient(-gr * 0.2, -gr * 0.25, gr * 0.05, 0, 0, gr);
  g.addColorStop(0, '#2a2f45'); g.addColorStop(0.55, '#121626'); g.addColorStop(1, '#040507');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, gr, 0, Math.PI * 2); c.fill();
  c.save();
  c.beginPath(); c.arc(0, 0, gr, 0, Math.PI * 2); c.clip();
  // the inner elements and the stopped-down iris deep inside
  c.strokeStyle = 'rgba(150,170,255,0.12)'; c.lineWidth = 0.8;
  for (const k of [0.72, 0.5]) { c.beginPath(); c.arc(gr * 0.04, gr * 0.05, gr * k, 0, Math.PI * 2); c.stroke(); }
  c.fillStyle = 'rgba(0,0,0,0.55)';
  c.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    c.lineTo(gr * 0.06 + Math.cos(a) * gr * 0.3, gr * 0.06 + Math.sin(a) * gr * 0.3);
  }
  c.closePath(); c.fill();
  // coating reflections: a purple crescent, a green one, a small amber ghost
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(170,90,255,0.55)'; c.lineWidth = gr * 0.16;
  c.beginPath(); c.arc(0, 0, gr * 0.7, Math.PI * 0.95, Math.PI * 1.45); c.stroke();
  c.strokeStyle = 'rgba(90,235,150,0.45)'; c.lineWidth = gr * 0.1;
  c.beginPath(); c.arc(0, 0, gr * 0.48, Math.PI * 0.1, Math.PI * 0.55); c.stroke();
  c.strokeStyle = 'rgba(120,200,255,0.3)'; c.lineWidth = gr * 0.06;
  c.beginPath(); c.arc(0, 0, gr * 0.86, Math.PI * 1.6, Math.PI * 1.85); c.stroke();
  c.fillStyle = 'rgba(255,190,90,0.45)';
  c.beginPath(); c.arc(gr * 0.22, gr * 0.3, gr * 0.06, 0, Math.PI * 2); c.fill();
  // the studio window caught in the front element
  c.save();
  c.translate(-gr * 0.36, -gr * 0.4); c.rotate(-0.55);
  c.fillStyle = 'rgba(255,255,255,0.88)';
  c.beginPath(); rrc(c, 0, 0, gr * 0.36, gr * 0.15, gr * 0.05); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.beginPath(); rrc(c, gr * 0.06, gr * 0.17, gr * 0.3, gr * 0.06, gr * 0.03); c.fill();
  c.restore();
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.beginPath(); c.arc(gr * 0.42, gr * 0.36, gr * 0.045, 0, Math.PI * 2); c.fill();
  if (power > 0) {
    c.fillStyle = `rgba(255,252,235,${0.25 * power})`;
    c.fillRect(-gr, -gr, gr * 2, gr * 2);
  }
  c.restore();
}

/** Recessed window in the top plate: chrome bezel, tinted glass, a diagonal reflection. */
function windowGlass(c: C, x: number, y: number, w: number, h: number, tint: string): void {
  c.fillStyle = '#7d828b';
  c.beginPath(); rrc(c, x, y, w + 5, h + 5, 4); c.fill();
  c.fillStyle = '#f3f5f7';
  c.beginPath(); rrc(c, x - 0.6, y - 0.6, w + 3, h + 3, 3.5); c.fill();
  const g = c.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
  g.addColorStop(0, shade(tint, 0.35)); g.addColorStop(0.5, tint); g.addColorStop(1, shade(tint, -0.55));
  c.fillStyle = g;
  c.beginPath(); rrc(c, x, y, w, h, 2.5); c.fill();
  c.save();
  c.beginPath(); rrc(c, x, y, w, h, 2.5); c.clip();
  c.fillStyle = 'rgba(255,255,255,0.32)';
  c.beginPath();
  c.moveTo(x - w * 0.25, y - h / 2); c.lineTo(x + w * 0.05, y - h / 2); c.lineTo(x - w * 0.2, y + h / 2); c.lineTo(x - w * 0.5, y + h / 2);
  c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.15)';
  c.beginPath();
  c.moveTo(x + w * 0.12, y - h / 2); c.lineTo(x + w * 0.2, y - h / 2); c.lineTo(x - w * 0.05, y + h / 2); c.lineTo(x - w * 0.13, y + h / 2);
  c.closePath(); c.fill();
  c.restore();
}

// ---------------- body: the hollow die-cast shell ----------------

// rounded ends with a strap-lug tab on each
const BODY = shapeFrom(roundedPts([
  [-145, -88, 24], [145, -88, 24], [145, -60, 0], [151, -60, 3], [151, -46, 3], [145, -46, 0], [145, 88, 24],
  [-145, 88, 24], [-145, -46, 0], [-151, -46, 3], [-151, -60, 3], [-145, -60, 0],
]));
const BODY_OUT = rrPath(0, 0, 290, 176, 24);
const BODY_IN = rrPath(0, 0, 278, 164, 18);
const SCREWS: [number, number][] = [[-132, -71], [132, -71], [-132, 75], [132, 75]];

const body: PartDef = {
  id: 'body', name: { en: 'Body Shell', vi: 'Thân máy' }, side: 'A', z: 0, x: 0, y: 0, w: 302, h: 176, icon: '📷',
  shape: BODY, needs: ['shutter', 'flash', 'cboard'], tool: 'sponge', thick: 36, cavity: 20, round: 10, wall: 9, body: '#2a2a2c',
  draw(c) {
    // outside: chrome top and bottom plates wrap round the ends, leatherette between
    c.save(); c.clip(BODY);
    leatherette(c, -152, TOP_B, 304, BOT_B - TOP_B, 11);
    chrome(c, -152, -88, 304, TOP_B + 88, 12);
    chrome(c, -152, BOT_B, 304, 88 - BOT_B, 13);
    c.restore();
    // strap lugs: chrome eyelets with the split rings' holes
    for (const sx of [-1, 1]) {
      c.fillStyle = '#e4e7ea'; c.beginPath(); rrc(c, sx * 148, -53, 8, 14, 2.5); c.fill();
      c.fillStyle = '#26272b'; c.beginPath(); c.arc(sx * 148.5, -53, 2.2, 0, Math.PI * 2); c.fill();
    }
    // inside: dark die-cast floor with an inner shadow
    c.fillStyle = '#2b2c30';
    c.fill(BODY_IN);
    c.save(); c.clip(BODY_IN);
    c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(BODY_IN);
    c.restore();
    // the film gate behind the shutter, a frame of film across it
    c.fillStyle = '#1b1c20'; c.beginPath(); rrc(c, LX, LY, 96, 70, 4); c.fill();
    const fg = c.createLinearGradient(0, LY - 30, 0, LY + 30);
    fg.addColorStop(0, '#5a3418'); fg.addColorStop(0.5, '#8a5326'); fg.addColorStop(1, '#4e2c14');
    c.fillStyle = fg; c.fillRect(-112, LY - 30, 226, 60);
    c.fillStyle = '#e8dccb';
    for (let x = -108; x < 112; x += 6) { c.beginPath(); rrc(c, x, LY - 25, 3, 4, 0.8); c.fill(); c.beginPath(); rrc(c, x, LY + 25, 3, 4, 0.8); c.fill(); }
    c.fillStyle = 'rgba(255,180,90,0.25)'; c.fillRect(LX - 36, LY - 21, 72, 42);
    c.strokeStyle = '#9da2aa'; c.lineWidth = 2; c.beginPath(); rrc(c, LX, LY, 76, 50, 2); c.stroke();
    // film cassette (left) and the take-up spool (right)
    c.save(); c.translate(-118, LY); c.rotate(Math.PI / 2); cylH(c, 74, 26, '#e8b830', '#c9ccd2'); c.restore();
    c.fillStyle = '#c4362c'; c.fillRect(-129, LY - 14, 22, 28);
    c.save(); c.translate(-118, LY); c.rotate(-Math.PI / 2); font(c, 6); c.fillStyle = '#fff3cf'; c.fillText('CHILL 400', 0, 0); c.restore();
    c.save(); c.translate(118, LY); c.rotate(Math.PI / 2); cylH(c, 70, 24, '#5b5e66', '#9aa0a8'); c.restore();
    c.fillStyle = '#c9ccd2';
    for (let y = -26; y <= 26; y += 6.5) { c.beginPath(); rrc(c, 105, LY + y, 5, 3, 1); c.fill(); }
    for (const [x, y] of SCREWS) boss(c, x, y, '#5d6068');
  },
};

// ---------------- inner parts ----------------

/** Iris of curved blades: each blade is the disc beyond a line tangent to the opening. */
function blades(c: C, R: number, open: number, n: number, jam: boolean): void {
  const ro = 2 + open * (R - 6);
  for (let i = 0; i < n; i++) {
    let th = (i / n) * Math.PI * 2 - Math.PI / 2;
    let r0 = ro;
    if (jam && i === 1) { th += 0.5; r0 = ro * 0.2; }
    const ux = Math.cos(th), uy = Math.sin(th), dx = -uy, dy = ux;
    c.save();
    c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.clip();
    const L = R * 2.2;
    const tx = ux * r0, ty = uy * r0;
    const g = c.createLinearGradient(tx, ty, ux * R, uy * R);
    g.addColorStop(0, jam && i === 1 ? '#5c5f66' : '#3a3d44'); g.addColorStop(1, '#1d1f24');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(tx - dx * L, ty - dy * L);
    c.quadraticCurveTo(tx - ux * r0 * 0.35, ty - uy * r0 * 0.35, tx + dx * L, ty + dy * L);
    c.lineTo(tx + dx * L + ux * L, ty + dy * L + uy * L);
    c.lineTo(tx - dx * L + ux * L, ty - dy * L + uy * L);
    c.closePath(); c.fill();
    // the blade's bright leading edge
    c.strokeStyle = 'rgba(220,226,236,0.55)'; c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(tx - dx * L, ty - dy * L);
    c.quadraticCurveTo(tx - ux * r0 * 0.35, ty - uy * r0 * 0.35, tx + dx * L, ty + dy * L);
    c.stroke();
    c.restore();
  }
}

const shutterShape = ellPath(0, 0, 46, 46);
const shutter: PartDef = {
  id: 'shutter', name: { en: 'Leaf Shutter', vi: 'Lá màn trập' }, side: 'A', z: 3, x: LX, y: LY, w: 92, h: 92, icon: '✳',
  shape: shutterShape, needs: ['plate'], thick: 10, round: 2, mat: 'metal', body: '#3d4048',
  draw(c, s) {
    // housing: black anodised ring with a chrome lip and three mounting screws
    c.fillStyle = '#222428'; c.beginPath(); c.arc(0, 0, 46, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#b8bdc5'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, 44.5, 0, Math.PI * 2); c.stroke();
    font(c, 4.2);
    c.fillStyle = '#d9dce1';
    const speeds = ['B', '1', '2', '4', '8', '15', '30', '60', '125', '250', '500'];
    speeds.forEach((v, i) => {
      const a = Math.PI * (0.62 + (i / (speeds.length - 1)) * 0.76) + Math.PI;
      c.save(); c.translate(Math.cos(a) * 39.5, Math.sin(a) * 39.5); c.rotate(a + Math.PI / 2); c.fillText(v, 0, 0); c.restore();
    });
    arcText(c, 'CHILL-SV  SEIKO TYPE', 39.5, Math.PI / 2, 3.8, '#9aa0a8', true);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      c.fillStyle = '#c9ccd2'; c.beginPath(); c.arc(Math.cos(a) * 41, Math.sin(a) * 41, 2, 0, Math.PI * 2); c.fill();
    }
    // the blade chamber
    c.fillStyle = '#0d0e10'; c.beginPath(); c.arc(0, 0, 35, 0, Math.PI * 2); c.fill();
    const open = s.power > 0 ? Math.max(0, Math.sin(s.time * 9)) : s.broken ? 0.32 : 0;
    blades(c, 34, open, 5, s.broken);
    c.strokeStyle = '#6a6e76'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 34.5, 0, Math.PI * 2); c.stroke();
    if (s.broken) {
      // oil on the blades: the classic sticky leaf shutter, one blade jumped its pin
      const g = c.createRadialGradient(-8, 6, 1, -8, 6, 16);
      g.addColorStop(0, 'rgba(255,200,90,0.35)'); g.addColorStop(0.5, 'rgba(150,90,220,0.25)'); g.addColorStop(1, 'rgba(90,200,160,0)');
      c.fillStyle = g; c.beginPath(); c.arc(-8, 6, 16, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(240,240,240,0.7)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(10, -22); c.lineTo(22, -8); c.moveTo(14, -24); c.lineTo(24, -13); c.stroke();
      c.fillStyle = '#e04a3a'; c.beginPath(); c.arc(25, -25, 2.5, 0, Math.PI * 2); c.fill();
    }
  },
};

const flashShape = rrPath(0, 0, 52, 100, 6);
const flash: PartDef = {
  id: 'flash', name: { en: 'Flash Unit', vi: 'Bộ đèn flash' }, side: 'A', z: 3, x: FW.x, y: -22, w: 52, h: 100, icon: '⚡',
  shape: flashShape, needs: ['plate'], thick: 6, round: 2, mat: 'pcb', body: '#1d4a3c',
  bumps: [{ kind: 'cyl', x: 0, y: 24, w: 22, height: 12, color: '#2d4f92' }],
  draw(c, s) {
    c.save(); c.translate(0, 18); pcb(c, 52, 64, 71, '#2f7a5c'); c.restore();
    // reflector trough with the xenon tube, right behind the flash window
    const g = c.createLinearGradient(0, -50, 0, -26);
    g.addColorStop(0, '#f4f6f8'); g.addColorStop(0.5, '#9aa0a8'); g.addColorStop(1, '#e8ebee');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, -38, 48, 24, 4); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 0.6;
    for (let y = -48; y < -28; y += 2.5) { c.beginPath(); c.moveTo(-22, y); c.lineTo(22, y); c.stroke(); }
    c.fillStyle = s.power > 0 ? `rgba(255,255,235,${0.6 + 0.4 * Math.sin(s.time * 8)})` : 'rgba(225,240,250,0.85)';
    c.beginPath(); rrc(c, 0, -38, 40, 6, 3); c.fill();
    c.fillStyle = '#c9ccd2'; c.fillRect(-23, -40, 4, 4); c.fillRect(19, -40, 4, 4);
    // trigger coil, the capacitor's sleeve (seen from above: the bump), its leads
    c.save(); c.translate(-14, -12); coil(c, 16, 12); c.restore();
    c.fillStyle = '#2d4f92'; c.beginPath(); c.arc(0, 24, 11, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#d33'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(8, -26); c.quadraticCurveTo(18, -6, 6, 14); c.stroke();
    c.strokeStyle = '#222'; c.beginPath(); c.moveTo(-8, -26); c.quadraticCurveTo(-2, -16, -4, 14); c.stroke();
    font(c, 4.5); c.fillStyle = '#e8eef8'; c.fillText('330V', 0, 24);
  },
};

const cboardShape = rrPath(0, 0, 76, 112, 5);
const cboard: PartDef = {
  id: 'cboard', name: { en: 'Meter Board', vi: 'Bo mạch đo sáng' }, side: 'A', z: 3, x: -96, y: 4, w: 76, h: 112, icon: '🟩',
  shape: cboardShape, needs: ['plate'], thick: 4, mat: 'pcb', body: '#1d5c4a',
  bumps: [{ kind: 'cyl', x: 16, y: -34, w: 15, height: 3, color: '#d7dbe0', metal: true }],
  draw(c) {
    pcb(c, 76, 112, 33, '#2c7a6a');
    // the mercury cell for the light meter, and the meter needle's movement
    c.fillStyle = '#d7dbe0'; c.beginPath(); c.arc(16, -34, 7.5, 0, Math.PI * 2); c.fill();
    font(c, 3.5); c.fillStyle = '#5a5e66'; c.fillText('PX625', 16, -34);
    c.fillStyle = '#18191c'; c.beginPath(); c.arc(-14, 26, 13, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f2efe6'; c.beginPath(); c.arc(-14, 26, 10, Math.PI, Math.PI * 2); c.fill();
    c.strokeStyle = '#d23a2a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-14, 26); c.lineTo(-19, 18); c.stroke();
    // flex ribbon off to the shutter
    c.fillStyle = '#e0a640'; c.fillRect(30, -6, 10, 22);
  },
};

// ---------------- front plate ----------------

const PLATE_OUT = rrPath(0, 0, 286, 172, 22);
const PLATE = shapeFrom(rrPts(0, 0, 286, 172, 22), [ellPts(LX, LY, 46, 46, 48)]);

const plate: PartDef = {
  id: 'plate', name: { en: 'Front Plate', vi: 'Mặt trước' }, side: 'A', z: 5, x: 0, y: 0, w: 286, h: 172, icon: '⬛',
  shape: PLATE, needs: ['f1', 'f2', 'f3', 'f4', 'lens', 'dial', 'shoe', 'crank'], tool: 'brush', thick: 6, round: 3, mat: 'rubber', body: '#2a2a2c',
  bumps: [
    { kind: 'box', x: -96, y: 12, w: 7, h: 30, height: 4, color: '#d5d9de', metal: true },
    { kind: 'cyl', x: 112, y: 36, w: 8, height: 4, color: '#c9ccd2', metal: true },
  ],
  draw(c, s) {
    // everything but the lens opening, so the shutter shows through it
    c.save();
    const face = new Path2D();
    rrc(face, 0, 0, 286, 172, 22);
    face.arc(LX, LY, 46, 0, Math.PI * 2);
    c.clip(face, 'evenodd');
    c.save();
    c.clip(PLATE_OUT);
    leatherette(c, -143, TOP_B, 286, BOT_B - TOP_B, 21);
    chrome(c, -143, -86, 286, TOP_B + 86, 22);
    chrome(c, -143, BOT_B, 286, 86 - BOT_B, 23);
    // the step where the leatherette tucks under each plate
    for (const [y, d] of [[TOP_B, 1], [BOT_B, -1]]) {
      c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(-143, y - (d > 0 ? 0 : 1.6), 286, 1.6);
      c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(-143, y - (d > 0 ? 1.4 : -1.6), 286, 0.8);
    }
    // well-loved: chrome worn through to brass at the corners, leatherette rubbed at the grip
    for (const [x, y, r] of [[-136, -80, 12], [136, -80, 10], [-138, 80, 9], [138, 82, 8]]) {
      const g = c.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(201,154,74,0.75)'); g.addColorStop(1, 'rgba(201,154,74,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    const wg = c.createRadialGradient(-122, 8, 2, -122, 8, 28);
    wg.addColorStop(0, 'rgba(120,100,80,0.22)'); wg.addColorStop(1, 'rgba(120,100,80,0)');
    c.fillStyle = wg; c.fillRect(-150, -30, 60, 80);
    c.restore();
    c.strokeStyle = '#0c0c0d'; c.lineWidth = 1; c.stroke(PLATE_OUT);

    // top plate front: bright-frame viewfinder, meter cell, nameplate, rangefinder spot, flash
    windowGlass(c, VF.x, VF.y, 44, 19, '#33495c');
    c.strokeStyle = 'rgba(255,250,220,0.55)'; c.lineWidth = 0.7; c.strokeRect(VF.x - 13, VF.y - 6, 26, 12);
    c.fillStyle = '#7d828b'; c.beginPath(); c.arc(CELL.x, CELL.y, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#eef0f2'; c.beginPath(); c.arc(CELL.x - 0.4, CELL.y - 0.4, 9, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3a3346'; c.beginPath(); c.arc(CELL.x, CELL.y, 7.2, 0, Math.PI * 2); c.fill();
    c.save(); c.beginPath(); c.arc(CELL.x, CELL.y, 7.2, 0, Math.PI * 2); c.clip();
    c.fillStyle = 'rgba(200,190,240,0.35)';
    for (let j = -8; j <= 8; j += 2.4) for (let i = -8; i <= 8; i += 2.4) {
      c.beginPath(); c.arc(CELL.x + i + ((j / 2.4) % 2 ? 1.2 : 0), CELL.y + j, 0.8, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.ellipse(CELL.x - 2.5, CELL.y - 3, 3, 1.5, -0.6, 0, Math.PI * 2); c.fill();
    c.restore();
    windowGlass(c, RF.x, RF.y, 16, 13, '#8a7434');
    // flash window: frosted, ribbed diffuser
    c.fillStyle = '#7d828b'; c.beginPath(); rrc(c, FW.x, FW.y, 37, 23, 4); c.fill();
    const fg = c.createLinearGradient(0, FW.y - 10, 0, FW.y + 10);
    fg.addColorStop(0, '#fbfcfd'); fg.addColorStop(1, '#c7ccd3');
    c.fillStyle = s.power > 0 ? `rgba(255,253,232,1)` : fg; c.beginPath(); rrc(c, FW.x, FW.y, 32, 18, 2.5); c.fill();
    c.strokeStyle = 'rgba(90,100,115,0.35)'; c.lineWidth = 0.7;
    for (let x = FW.x - 14; x <= FW.x + 14; x += 2.4) { c.beginPath(); c.moveTo(x, FW.y - 8.5); c.lineTo(x, FW.y + 8.5); c.stroke(); }
    // nameplate engraved in the chrome
    font(c, 15, 800);
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillText('CHILL', LX - 6, -69.4);
    c.fillStyle = '#17181b'; c.fillText('CHILL', LX - 6, -70);
    font(c, 9, 700);
    c.fillStyle = '#c4362c'; c.fillText('35', LX + 29, -68.5);
    font(c, 3.6, 600); c.fillStyle = '#4a4e57'; c.fillText('RANGEFINDER  ·  SE', LX + 2, -59);

    // chrome lens collar the barrel screws into
    c.save(); c.translate(LX, LY);
    const cg = c.createLinearGradient(-60, -60, 60, 60);
    cg.addColorStop(0, '#fbfcfd'); cg.addColorStop(0.5, '#9ca1a9'); cg.addColorStop(1, '#e6e9ec');
    c.fillStyle = cg; c.beginPath(); c.arc(0, 0, 61, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#6f747c'; c.lineWidth = 0.8; c.beginPath(); c.arc(0, 0, 61, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#c4362c'; c.beginPath(); c.moveTo(0, -57); c.lineTo(-2.2, -60.5); c.lineTo(2.2, -60.5); c.closePath(); c.fill();
    c.strokeStyle = '#2a2b2f'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 47.5, 0, Math.PI * 2); c.stroke();
    c.restore();

    // self-timer lever's pivot, PC flash-sync socket, serial and a little engraving
    c.fillStyle = '#b4b9c0'; c.beginPath(); c.arc(-96, -6, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5d6068'; c.beginPath(); c.arc(-96, -6, 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8ebee'; c.beginPath(); c.arc(112, 36, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffd34a'; font(c, 4, 700); c.fillText('X', 112, 46);
    font(c, 4.4, 600); c.fillStyle = '#5a5e66';
    c.fillText('No. 741021', -68, 75);
    c.fillText('MADE IN SAIGON', 66, 75);
    c.strokeStyle = 'rgba(70,74,82,0.6)'; c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(102, 72); c.bezierCurveTo(100, 68, 96, 71, 102, 76); c.bezierCurveTo(108, 71, 104, 68, 102, 72); c.stroke();
    c.restore();
  },
};

// ---------------- lens barrel: focus barrel + front ring, a real stepped cylinder ----------------

const lensShape = ellPath(0, 0, 56, 56);
const lens: PartDef = {
  id: 'lens', name: { en: 'Lens Barrel', vi: 'Ống kính' }, side: 'A', z: 7, x: LX, y: LY, w: 112, h: 112, icon: '🔵',
  shape: lensShape, needs: ['ring'], tool: 'brush', elev: 42, thick: 15, round: 1.5, mat: 'metal', body: '#202124',
  draw(c, s) {
    // knurled rubber focus grip (its rim teeth become the barrel's ribbed side)
    c.fillStyle = BLACK; c.beginPath(); c.arc(0, 0, 56, 0, Math.PI * 2); c.fill();
    teeth(c, 50.5, 56, 104, '#0e0e10', '#3e3f44');
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 0.6; c.beginPath(); c.arc(0, 0, 53, 0, Math.PI * 2); c.stroke();
    // chrome distance-scale ring
    const g = c.createLinearGradient(-50, -50, 50, 50);
    g.addColorStop(0, '#fbfcfd'); g.addColorStop(0.45, '#aeb3ba'); g.addColorStop(1, '#eceef1');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 50.5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#6f747c'; c.lineWidth = 0.6; c.beginPath(); c.arc(0, 0, 44.2, 0, Math.PI * 2); c.stroke();
    const feet = ['∞', '30', '15', '10', '7', '5', '4', '3.5'];
    feet.forEach((v, i) => {
      const a = -Math.PI * 0.86 + (i / (feet.length - 1)) * Math.PI * 0.72;
      c.save(); c.translate(Math.cos(a) * 47.4, Math.sin(a) * 47.4); c.rotate(a + Math.PI / 2);
      font(c, v === '∞' ? 5.6 : 4.4, 700); c.fillStyle = '#17181b'; c.fillText(v, 0, 0);
      c.restore();
    });
    arcText(c, 'ft', 47.4, -Math.PI * 0.08, 4, '#17181b');
    arcText(c, '1  1.2  1.5  2  3  5  10  ∞  m', 47.4, Math.PI / 2, 4, '#d0661e', true);
    // under the front ring: filter thread, then the glass
    c.fillStyle = '#0c0c0e'; c.beginPath(); c.arc(0, 0, 44, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.09)'; c.lineWidth = 0.5;
    for (let k = 31; k < 44; k += 1.2) { c.beginPath(); c.arc(0, 0, k, 0, Math.PI * 2); c.stroke(); }
    deepGlass(c, 30, s.power);
  },
};

const RING_OUT = 44, RING_IN = 30;
const ringShape = shapeFrom(ellPts(0, 0, RING_OUT, RING_OUT, 64), [ellPts(0, 0, RING_IN, RING_IN, 48)]);
const ring: PartDef = {
  id: 'ring', name: { en: 'Aperture Ring', vi: 'Vòng khẩu độ' }, side: 'A', z: 8, x: LX, y: LY, w: 88, h: 88, icon: '⭕',
  shape: ringShape, elev: 57, thick: 12, round: 1.5, mat: 'metal', body: '#18191b',
  draw(c) {
    c.save();
    const ann = new Path2D();
    ann.arc(0, 0, RING_OUT, 0, Math.PI * 2);
    ann.arc(0, 0, RING_IN, 0, Math.PI * 2, true);
    c.clip(ann, 'evenodd');
    // aperture ring: black with white f-stops; its rim ribs make the ring's side grippy
    c.fillStyle = '#1a1b1e'; c.beginPath(); c.arc(0, 0, RING_OUT, 0, Math.PI * 2); c.fill();
    teeth(c, 42.6, RING_OUT, 84, '#0f1012', '#4a4c52');
    const stops = ['2.8', '4', '5.6', '8', '11', '16', '22'];
    stops.forEach((v, i) => {
      const a = -Math.PI * 0.8 + (i / (stops.length - 1)) * Math.PI * 0.6;
      c.save(); c.translate(Math.cos(a) * 39.6, Math.sin(a) * 39.6); c.rotate(a + Math.PI / 2);
      font(c, 4.1, 700); c.fillStyle = v === '8' ? '#ffb347' : '#f2f2f0'; c.fillText(v, 0, 0);
      c.restore();
    });
    c.fillStyle = '#2bb36a'; c.beginPath(); c.arc(Math.cos(-Math.PI * 0.12) * 39.6, Math.sin(-Math.PI * 0.12) * 39.6, 1.3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#6a6d74'; c.lineWidth = 0.7; c.beginPath(); c.arc(0, 0, 37, 0, Math.PI * 2); c.stroke();
    // satin black name ring
    const g = c.createRadialGradient(-10, -12, 4, 0, 0, 37);
    g.addColorStop(0, '#2b2c30'); g.addColorStop(1, '#0d0d0f');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 36.6, 0, Math.PI * 2); c.fill();
    arcText(c, 'CHILL LENS  40mm  1:2.8', 33.4, -Math.PI / 2, 3.9, '#f1f1ee');
    arcText(c, 'No. 74219', 33.4, Math.PI / 2, 3.4, '#9a9ca2', true);
    c.fillStyle = '#d23a2a'; c.beginPath(); c.arc(Math.cos(Math.PI * 0.1) * 33.4, Math.sin(Math.PI * 0.1) * 33.4, 1.1, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#000'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, RING_IN + 0.4, 0, Math.PI * 2); c.stroke();
    c.restore();
  },
};

// ---------------- top-plate controls, sticking out past the top edge ----------------

// speed dial with the shutter button on it, the advance lever's tip poking out to the left
const DIAL = { x: -98, y: -96 };
const dialShape = shapeFrom(roundedPts([
  [-38, 9, 2], [-38, 3, 2], [-19, 3, 0], [-19, -5, 2], [-6, -5, 1], [-6, -12, 3], [6, -12, 3], [6, -5, 1], [19, -5, 2], [19, 9, 2],
]));
const dial: PartDef = {
  id: 'dial', name: { en: 'Speed Dial', vi: 'Núm tốc độ' }, side: 'A', z: 6, x: DIAL.x, y: DIAL.y, w: 76, h: 22, icon: '🔘',
  shape: dialShape, elev: 6, thick: 26, round: 11, mat: 'metal', body: '#9aa0a8',
  draw(c) {
    // advance lever: chrome arm with a black plastic tip
    c.fillStyle = '#c9ccd2'; c.fillRect(-38, 3, 24, 6);
    c.fillStyle = BLACK; c.beginPath(); rrc(c, -33, 6, 10, 6, 2); c.fill();
    knurlSide(c, 0, 2, 38, 14, CHROME, 2.2);
    c.fillStyle = '#4a4e57'; c.fillRect(-19, 6.5, 38, 1);
    font(c, 3.4); c.fillStyle = '#17181b'; c.fillText('125', 0, 4);
    // the release button with its cable-release thread
    knurlSide(c, 0, -8.5, 12, 7, '#dfe2e6', 1.6);
    c.fillStyle = '#2a2b2f'; c.fillRect(-1, -12, 2, 2.5);
  },
};

const shoeShape = rrPath(0, 0, 34, 9, 2);
const shoe: PartDef = {
  id: 'shoe', name: { en: 'Hot Shoe', vi: 'Đế gắn đèn' }, side: 'A', z: 6, x: LX, y: -92, w: 34, h: 9, icon: '⚡',
  shape: shoeShape, elev: 10, thick: 22, round: 3, mat: 'metal', body: '#9aa0a8',
  draw(c) {
    // the U-channel's front edge: two chrome rails, a dark slot, the gold centre contact
    knurlSide(c, 0, 0, 34, 9, CHROME, 40);
    c.fillStyle = '#26272b'; c.fillRect(-13, -2.2, 26, 3.4);
    c.fillStyle = '#e2b24a'; c.beginPath(); c.arc(0, -0.5, 1.6, 0, Math.PI * 2); c.fill();
  },
};

const CRANK = { x: 104, y: -95 };
const crankShape = shapeFrom(roundedPts([
  [-15, 8, 2], [-15, -2, 2], [-12, -2, 0], [-12, -8, 2], [14, -8, 2], [14, -2, 0], [15, -2, 2], [15, 8, 2],
]));
const crank: PartDef = {
  id: 'crank', name: { en: 'Rewind Crank', vi: 'Tay quay lên phim' }, side: 'A', z: 6, x: CRANK.x, y: CRANK.y, w: 30, h: 16, icon: '🌀',
  shape: crankShape, elev: 6, thick: 24, round: 10, mat: 'metal', body: '#8a9098',
  draw(c) {
    knurlSide(c, 0, 3, 30, 10, CHROME, 2);
    // folding crank handle with its little knob
    c.fillStyle = BLACK; c.beginPath(); rrc(c, 1, -5, 26, 5, 2); c.fill();
    c.fillStyle = '#3a3b40'; c.beginPath(); rrc(c, 10, -5.5, 6, 4, 1.5); c.fill();
    c.fillStyle = '#d7dbe0'; c.beginPath(); c.arc(-10, -5, 1.4, 0, Math.PI * 2); c.fill();
  },
};

export const camera: DeviceDef = {
  id: 'camera',
  name: { en: 'Rangefinder Camera', vi: 'Máy ảnh rangefinder' },
  w: 306, h: 216,
  hasBack: false,
  parts: [
    body, shutter, flash, cboard, plate, dial, shoe, crank, lens, ring,
    ...SCREWS.map(([x, y], i) => screw(`f${i + 1}`, x, y, 'A')),
  ],
  working(c, t, k) {
    // the flash pops every so often, a bloom from the flash window
    const ph = (t * 0.8) % 1;
    c.save();
    c.globalAlpha = k * Math.max(0, 1 - ph * 3);
    const g = c.createRadialGradient(FW.x, FW.y, 5, FW.x, FW.y, 160);
    g.addColorStop(0, 'rgba(255,255,240,0.95)'); g.addColorStop(1, 'rgba(255,255,240,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(FW.x, FW.y, 160, 0, Math.PI * 2); c.fill();
    c.restore();
    // a glint circling the front element
    c.save();
    c.globalAlpha = k;
    c.fillStyle = 'rgba(255,255,255,0.8)';
    const a = t * 2;
    c.beginPath(); c.ellipse(LX + Math.cos(a) * 18, LY + Math.sin(a) * 18, 6, 3, a, 0, Math.PI * 2); c.fill();
    c.restore();
  },
  workFx: { kind: 'flash', x: FW.x, y: FW.y, color: '#fffbe0', dir: -Math.PI / 2 },
};
