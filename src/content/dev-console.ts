// Retro handheld console: the classic grey brick. Warm grey ABS, dark glass
// screen surround, black d-pad, maroon A/B, rubber SELECT/START, speaker slots
// in the big rounded corner. Two faces: a cartridge and AA battery door behind.

import { type C, slab, shade, rrc, rrPath, glossStreak, text, shapeFrom, roundedPts, rng, FONT_BOLD } from '../core/draw';
import { type DeviceDef, type PartDef, type Bump, screw } from './device';
import { cylH, boss, ribbon } from './kit';

const GREY = '#c9c7c1';
// slab() shades its colour again, so it needs plain hex (not a shade() result)
const GREY_B = '#c2c0b9';
const CART = '#b9b6ae';
const GLASS = '#5b5d6d';
const NAVY = '#2c3274';
const MAROON = '#a3204f';
const INK = '#26262b';
const RUBBER = '#8d8a86';
const MAGENTA = '#a2306a';

// 9 × 15 brick, small radii everywhere but the bottom-right corner.
function bodyPts(mirror = false) {
  const m = mirror ? -1 : 1;
  const v: [number, number, number][] = [
    [-90 * m, -150, 10], [90 * m, -150, 10], [90 * m, 150, 56], [-90 * m, 150, 12],
  ];
  // mirrored, the winding flips: walk it backwards
  return roundedPts(mirror ? v.reverse() : v);
}

const BODY = shapeFrom(bodyPts());
// inside of the shell: both bottom corners round, so it fits whichever way the shell is turned
const BODY_IN = shapeFrom(roundedPts([[-80, -140, 6], [80, -140, 6], [80, 140, 44], [-80, 140, 44]]));

// Front layout (device units). The back view mirrors x.
const DPAD = { x: -50, y: 50 };
const BTN_A = { x: 56, y: 38 };
const BTN_B = { x: 22, y: 56 };
const PILLS: [number, number, string][] = [[-22, 106, 'SELECT'], [10, 106, 'START']];
const PILL_ANG = -0.45;
const SCREEN = { x: 0, y: -78 };
const LCD = { x: 8, y: 4, w: 94, h: 82 };
const LED = { x: -63, y: -14 };

function logo(c: C, s: string, x: number, y: number, size: number, col: string, align: CanvasTextAlign = 'center'): void {
  c.font = `italic 800 ${size}px ${FONT_BOLD}`;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillStyle = col;
  c.fillText(s, x, y);
}

/** Fine speckle of moulded ABS. */
function grain(c: C, path: Path2D, seed: number, n: number, w: number, h: number): void {
  const r = rng(seed);
  c.save();
  c.clip(path);
  for (let i = 0; i < n; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(60,50,40,0.07)' : 'rgba(255,255,255,0.09)';
    c.fillRect((r() - 0.5) * w, (r() - 0.5) * h, 1 + r() * 1.2, 1 + r() * 1.2);
  }
  c.restore();
}

/** A moulded groove: dark cut with a lit lower lip. */
function groove(c: C, x0: number, y0: number, x1: number, y1: number, col = GREY): void {
  c.lineCap = 'round';
  c.strokeStyle = shade(col, -0.38); c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(x0, y0 + 1.3); c.lineTo(x1, y1 + 1.3); c.stroke();
}

/** Rounded pill turned by `a` (SELECT / START, speaker slots). */
function pillAt(c: C, x: number, y: number, w: number, h: number, a: number, fill: string): void {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.fillStyle = fill;
  c.beginPath(); rrc(c, 0, 0, w, h, h / 2); c.fill();
  c.restore();
}

// ---------- the LCD: pea-green reflective glass, a little game when on ----------

const HERO = ['001100', '011110', '011010', '111111', '011110', '010010'];

function lcdFace(c: C, w: number, h: number, power: number, t: number): void {
  const g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  g.addColorStop(0, power > 0 ? '#b4c63a' : '#a7ad74');
  g.addColorStop(1, power > 0 ? '#8fae2a' : '#868d55');
  c.fillStyle = g;
  c.beginPath(); rrc(c, 0, 0, w, h, 2); c.fill();
  c.save();
  c.beginPath(); rrc(c, 0, 0, w, h, 2); c.clip();
  // the faint dot matrix
  c.fillStyle = 'rgba(40,60,20,0.07)';
  for (let x = -w / 2; x < w / 2; x += 3) c.fillRect(x, -h / 2, 0.6, h);
  for (let y = -h / 2; y < h / 2; y += 3) c.fillRect(-w / 2, y, w, 0.6);
  if (power > 0) {
    c.globalAlpha = power;
    const ink = '#1f3a12', mid = '#4f7a1e';
    const cyc = t % 9;
    if (cyc < 3.2) {
      // boot: the logo drops in from the top, then a chime
      const k = Math.min(1, cyc / 1.6);
      const y = -h / 2 - 8 + (h / 2 + 2) * k;
      logo(c, 'CHILL·BOY', 0, y, 13, ink);
      if (cyc > 1.7) text(c, '♪', 26, y + 14, 9, mid, { font: 'bold' });
    } else {
      // a tiny runner: scrolling bricks, a pipe, a hopping hero
      const px = 3, s = (cyc - 3.2) * 20;
      c.fillStyle = mid;
      for (let x = -w / 2 - (s % 12); x < w / 2; x += 12) { c.fillRect(x, h / 2 - 12, 11, 5); c.fillRect(x + 6, h / 2 - 6, 11, 5); }
      const pipe = w / 2 + 10 - (s * 1.2) % (w + 30);
      c.fillStyle = ink;
      c.fillRect(pipe, h / 2 - 28, 10, 16);
      c.fillRect(pipe - 2, h / 2 - 31, 14, 5);
      const jump = Math.abs(Math.sin(cyc * 2.6)) * 18;
      HERO.forEach((row, j) => [...row].forEach((b, i) => {
        if (b === '1') c.fillRect(-28 + i * px, h / 2 - 12 - 18 - jump + j * px, px - 0.4, px - 0.4);
      }));
      c.fillStyle = mid;
      for (const [cx, cy] of [[20, -18], [-6, -26]] as const) {
        const x = ((cx - s * 0.4) % (w + 30) + w + 30) % (w + 30) - w / 2 - 15;
        c.beginPath(); rrc(c, x, cy, 16, 5, 2.5); c.fill();
      }
      text(c, 'SCORE ' + String(Math.floor(cyc * 37) * 10).padStart(4, '0'), -w / 2 + 4, -h / 2 + 7, 7, ink, { font: 'bold', align: 'left' });
      text(c, 'HI 4200', w / 2 - 4, -h / 2 + 7, 7, ink, { font: 'bold', align: 'right' });
    }
    c.globalAlpha = 1;
  }
  // glass sheen and the inner shadow along the top-left of the frame
  c.fillStyle = 'rgba(255,255,255,0.13)';
  c.beginPath(); c.moveTo(-w / 2, -h / 2); c.lineTo(-w / 2 + w * 0.45, -h / 2); c.lineTo(-w / 2, h * 0.15); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(30,40,20,0.35)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-w / 2, h / 2); c.lineTo(-w / 2, -h / 2); c.lineTo(w / 2, -h / 2); c.stroke();
  c.restore();
}

/** Dark glass surround: the two thin lines, the label, the battery LED and the LCD. */
function glassFace(c: C, path: Path2D, power: number, t: number, lens: boolean): void {
  slab(c, path, GLASS, -56, 56, { depth: 3, shadow: 0, outline: '#2e2f3a' });
  const lineY = -45;
  c.lineWidth = 1.3;
  for (const [x0, x1] of [[-72, -40], [40, 72]]) {
    c.strokeStyle = MAGENTA; c.beginPath(); c.moveTo(x0, lineY - 1.6); c.lineTo(x1, lineY - 1.6); c.stroke();
    c.strokeStyle = '#3a4aa8'; c.beginPath(); c.moveTo(x0, lineY + 1.6); c.lineTo(x1, lineY + 1.6); c.stroke();
  }
  text(c, 'DOT MATRIX · CHILL SOUND', 0, lineY + 0.4, 4.6, '#d4d6e2', { font: 'bold' });
  // battery LED
  const on = power > 0;
  if (on) {
    const gl = c.createRadialGradient(LED.x, LED.y, 0.5, LED.x, LED.y, 9);
    gl.addColorStop(0, `rgba(255,80,60,${0.7 * power})`); gl.addColorStop(1, 'rgba(255,80,60,0)');
    c.fillStyle = gl; c.beginPath(); c.arc(LED.x, LED.y, 9, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = on ? '#ff3b2f' : '#5a2228';
  c.beginPath(); c.arc(LED.x, LED.y, 3, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.45)';
  c.beginPath(); c.arc(LED.x - 0.9, LED.y - 1, 0.9, 0, Math.PI * 2); c.fill();
  text(c, 'BATTERY', LED.x, LED.y + 9, 4.6, '#c3c5d2', { font: 'bold' });
  // the window: the LCD behind the lens, or just clear glass when the lens is off on the mat
  c.fillStyle = '#2a2b33';
  c.beginPath(); rrc(c, LCD.x, LCD.y, LCD.w + 4, LCD.h + 4, 3); c.fill();
  c.save();
  c.translate(LCD.x, LCD.y);
  if (lens) {
    c.fillStyle = 'rgba(150,160,180,0.35)';
    c.beginPath(); rrc(c, 0, 0, LCD.w, LCD.h, 2); c.fill();
  } else lcdFace(c, LCD.w, LCD.h, power, t);
  c.restore();
  // lens gloss
  c.save();
  c.clip(path);
  c.fillStyle = 'rgba(255,255,255,0.08)';
  c.beginPath(); c.moveTo(-78, -56); c.lineTo(-10, -56); c.lineTo(-78, 30); c.closePath(); c.fill();
  c.restore();
}

// ---------- front shell ----------

const pillBumps = (mirror: number, view?: 'F' | 'B'): Bump[] => PILLS.flatMap(([x, y]) => [-5, 0, 5].map((d) => ({
  kind: 'cyl' as const, x: (x + Math.cos(PILL_ANG) * d) * mirror, y: y + Math.sin(PILL_ANG) * d * mirror,
  w: 7, height: 3, color: RUBBER, view,
})));

const frontCase: PartDef = {
  id: 'front', name: { en: 'Front Case', vi: 'Vỏ trước' }, side: 'A', z: 0, x: 0, y: 0, w: 180, h: 300, icon: '🎮',
  shape: BODY, needs: ['lcd', 'buttons', 'bezel'], tool: 'sponge', thick: 16, cavity: 3, round: 10, wall: 9, body: '#a6a49e',
  bumps: [
    { kind: 'cross', x: DPAD.x, y: DPAD.y, w: 44, height: 5, color: INK, view: 'F' },
    { kind: 'cyl', x: DPAD.x, y: DPAD.y, w: 8, height: 5.5, color: '#131316', view: 'F' },
    { kind: 'cyl', x: BTN_A.x, y: BTN_A.y, w: 24, height: 5, color: MAROON, view: 'F' },
    { kind: 'cyl', x: BTN_B.x, y: BTN_B.y, w: 24, height: 5, color: MAROON, view: 'F' },
    ...pillBumps(1, 'F'),
    // power slider on the top ridge, the contrast and volume wheels on the side edges
    { kind: 'box', x: -70, y: -144, w: 12, h: 5, height: 3, color: '#86827a', view: 'F' },
    { kind: 'box', x: -88, y: -62, w: 5, h: 20, height: 4, color: '#8f8b83', view: 'F' },
    { kind: 'box', x: 88, y: 30, w: 5, h: 20, height: 4, color: '#8f8b83', view: 'F' },
  ],
  draw(c, s) {
    slab(c, BODY, GREY, -150, 150, { depth: 12, shadow: 0 });
    if (s.view === 'F' || !s.inDevice) {
      grain(c, BODY, 11, 900, 180, 300);
      glossStreak(c, BODY, -90, -150, 180, 150, 0.2);
      // the ridge along the top edge with its OFF/ON moulding
      groove(c, -90, -136, 90, -136);
      groove(c, -82, -150, -82, -136);
      groove(c, 82, -150, 82, -136);
      text(c, '◀OFF·ON▶', -50, -143, 6, shade(GREY, -0.42), { font: 'bold' });
      c.fillStyle = shade(GREY, -0.45);
      c.beginPath(); rrc(c, -70, -144, 22, 6, 3); c.fill();
      // screen recess (the lens sits in it) with the LCD behind the window
      c.save();
      c.translate(SCREEN.x, SCREEN.y);
      c.fillStyle = shade(GREY, -0.3);
      c.fill(lensPath);
      c.fillStyle = '#1c1d22';
      c.beginPath(); rrc(c, LCD.x, LCD.y, LCD.w + 6, LCD.h + 6, 3); c.fill();
      c.translate(LCD.x, LCD.y);
      lcdFace(c, LCD.w, LCD.h, s.power, s.time);
      c.restore();
      // brand
      text(c, 'Chillco', -78, -8, 9, NAVY, { font: 'bold', align: 'left' });
      logo(c, 'CHILL·BOY', -40, -8, 14, NAVY, 'left');
      text(c, '™', 40, -12, 5, NAVY);
      // d-pad well
      c.fillStyle = shade(GREY, -0.28);
      c.beginPath(); rrc(c, DPAD.x, DPAD.y, 50, 18, 4); rrc(c, DPAD.x, DPAD.y, 18, 50, 4); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.beginPath(); c.arc(DPAD.x, DPAD.y, 30, 0, Math.PI * 2); c.fill();
      c.fillStyle = shade(INK, 0.1);
      c.beginPath(); rrc(c, DPAD.x, DPAD.y, 44, 15, 3); rrc(c, DPAD.x, DPAD.y, 15, 44, 3); c.fill();
      for (const [dx, dy, a] of [[0, -16, 0], [0, 16, Math.PI], [-16, 0, -Math.PI / 2], [16, 0, Math.PI / 2]] as const) {
        c.save(); c.translate(DPAD.x + dx, DPAD.y + dy); c.rotate(a);
        c.fillStyle = '#4a4a52';
        c.beginPath(); c.moveTo(0, -3); c.lineTo(3, 1.5); c.lineTo(-3, 1.5); c.closePath(); c.fill();
        c.restore();
      }
      // A / B wells and labels
      for (const [b, l] of [[BTN_A, 'A'], [BTN_B, 'B']] as const) {
        c.fillStyle = shade(GREY, -0.3);
        c.beginPath(); c.arc(b.x, b.y, 15, 0, Math.PI * 2); c.fill();
        c.fillStyle = MAROON;
        c.beginPath(); c.arc(b.x, b.y, 12, 0, Math.PI * 2); c.fill();
        text(c, l, b.x, b.y + 21, 9, NAVY, { font: 'bold' });
      }
      // SELECT / START: angled rubber pills
      for (const [x, y, l] of PILLS) {
        pillAt(c, x, y, 24, 10, PILL_ANG, shade(GREY, -0.32));
        pillAt(c, x, y, 18, 6.5, PILL_ANG, RUBBER);
        c.save(); c.translate(x - 1, y + 11); c.rotate(PILL_ANG);
        text(c, l, 0, 0, 5.4, NAVY, { font: 'bold' });
        c.restore();
      }
      // speaker slots in the big round corner
      for (let i = 0; i < 6; i++) {
        const k = i - 2.5;
        const x = 50 + k * 7.2, y = 112 + k * 3.6;
        pillAt(c, x, y, 34 - Math.abs(k) * 3, 4.2, -1.1, '#5e5a52');
        pillAt(c, x + 0.6, y + 0.8, 30 - Math.abs(k) * 3, 1.3, -1.1, 'rgba(255,255,255,0.35)');
      }
      text(c, '◀PHONES', 0, 144, 5, shade(GREY, -0.42), { font: 'bold' });
      // the wheels' openings on the side edges
      for (const [x, y] of [[-88, -62], [88, 30]] as const) {
        c.fillStyle = '#3a3833';
        c.fillRect(x - 2.5, y - 12, 5, 24);
        c.strokeStyle = '#9b978f'; c.lineWidth = 1;
        for (let k = -10; k <= 10; k += 3) { c.beginPath(); c.moveTo(x - 2, y + k); c.lineTo(x + 2, y + k); c.stroke(); }
      }
      text(c, 'CONTRAST', -80, -62, 4, shade(GREY, -0.45), { font: 'bold' });
      text(c, 'VOL', 80, 30, 4, shade(GREY, -0.45), { font: 'bold' });
    } else {
      // inside of the front shell, seen from the back: everything mirrored
      c.fillStyle = shade(GREY, -0.3);
      c.fill(BODY_IN);
      c.save(); c.clip(BODY_IN);
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(BODY_IN);
      c.restore();
      grain(c, BODY_IN, 12, 500, 170, 290);
      // screen window, button holes, speaker
      c.fillStyle = '#17181c';
      c.beginPath(); rrc(c, -(SCREEN.x + LCD.x), SCREEN.y + LCD.y, LCD.w + 6, LCD.h + 6, 3); c.fill();
      c.fillStyle = shade(GREY, -0.6);
      c.beginPath(); rrc(c, -DPAD.x, DPAD.y, 46, 17, 3); rrc(c, -DPAD.x, DPAD.y, 17, 46, 3); c.fill();
      for (const b of [BTN_A, BTN_B]) { c.beginPath(); c.arc(-b.x, b.y, 12.5, 0, Math.PI * 2); c.fill(); }
      for (const [x, y] of PILLS) pillAt(c, -x, y, 20, 8, -PILL_ANG, shade(GREY, -0.6));
      c.fillStyle = '#2b2a28';
      c.beginPath(); c.arc(-50, 112, 19, 0, Math.PI * 2); c.fill();
      const sg = c.createRadialGradient(-53, 108, 1, -50, 112, 15);
      sg.addColorStop(0, '#d8d4c8'); sg.addColorStop(1, '#6d6a62');
      c.fillStyle = sg;
      c.beginPath(); c.arc(-50, 112, 15, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3c3a36';
      c.beginPath(); c.arc(-50, 112, 6, 0, Math.PI * 2); c.fill();
      // ribs
      c.strokeStyle = shade(GREY, -0.15); c.lineWidth = 3;
      for (const y of [-14, 82]) { c.beginPath(); c.moveTo(-74, y); c.lineTo(74, y); c.stroke(); }
      for (const [x, y] of SCREWS) boss(c, x, y, GREY);
    }
  },
};

// ---------- screen lens ----------

const lensPts = () => roundedPts([[-78, -56, 6], [78, -56, 6], [78, 56, 24], [-78, 56, 6]]);
const lensPath = shapeFrom(lensPts());
const bezel: PartDef = {
  id: 'bezel', name: { en: 'Screen Lens', vi: 'Kính màn hình' }, side: 'F', z: 6, x: SCREEN.x, y: SCREEN.y, w: 156, h: 112, icon: '🖥',
  shape: lensPath, tool: 'brush', thick: 3, round: 1.5, mat: 'glass', body: '#3c3d48',
  draw(c, s) {
    glassFace(c, lensPath, s.power, s.time, !s.inDevice);
  },
};

// ---------- back ----------

// back coordinates: as seen from behind, so the big corner is bottom-left
const BACK = shapeFrom(bodyPts(true));
const SCREWS: [number, number][] = [[-76, -134], [76, -134], [-78, 24], [78, 24]];
const DOOR = { x: 0, y: 90, w: 116, h: 88 };
const CART_Y = -98;

const backCase: PartDef = {
  id: 'back', name: { en: 'Back Case', vi: 'Vỏ sau' }, side: 'B', z: 5, x: 0, y: 0, w: 180, h: 300, icon: '🎮',
  shape: BACK, needs: ['c1', 'c2', 'c3', 'c4', 'battery', 'cart'], elev: 16, thick: 14, round: 10, body: '#a09e97',
  draw(c) {
    slab(c, BACK, GREY_B, -150, 150, { depth: 10, shadow: 0 });
    grain(c, BACK, 13, 900, 180, 300);
    glossStreak(c, BACK, -90, -150, 180, 150, 0.16);
    // cartridge bay: the slot along the top edge with the connector inside
    c.fillStyle = shade(GREY, -0.22);
    c.beginPath(); rrc(c, 0, CART_Y - 4, 122, 124, 6); c.fill();
    c.fillStyle = '#25241f';
    c.beginPath(); rrc(c, 0, -147, 116, 8, 2); c.fill();
    c.fillStyle = '#d9b25a';
    for (let x = -50; x <= 50; x += 3.3) c.fillRect(x - 0.7, -149, 1.4, 4);
    c.fillStyle = shade(GREY, -0.35);
    text(c, '▼ CART', 0, -128, 7, shade(GREY, -0.5), { font: 'bold' });
    groove(c, -61, -38, 61, -38, GREY_B);
    // the grip lines down both sides
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) groove(c, sx * 84, -20 + i * 7, sx * 70, -20 + i * 7, GREY_B);
    // label sticker
    c.fillStyle = 'rgba(40,30,20,0.18)';
    c.beginPath(); rrc(c, 1, 5, 104, 44, 3); c.fill();
    c.fillStyle = '#ebe6d6';
    c.beginPath(); rrc(c, 0, 3, 104, 44, 3); c.fill();
    c.fillStyle = NAVY;
    c.fillRect(-52, -19, 104, 9);
    logo(c, 'CHILL·BOY', 0, -14.5, 7, '#ebe6d6');
    text(c, 'MODEL No. CB-01', -48, -3, 5.5, '#3a3a40', { font: 'bold', align: 'left' });
    text(c, 'DC 6V ⎓ 0.7W', -48, 5, 5, '#3a3a40', { font: 'bold', align: 'left' });
    text(c, 'MADE IN CHILL CORNER', -48, 13, 4.6, '#3a3a40', { font: 'bold', align: 'left' });
    const r = rng(77);
    c.fillStyle = '#222';
    for (let x = 18; x < 48; x += 1.4) if (r() < 0.6) c.fillRect(x, -6, r() < 0.3 ? 1.1 : 0.6, 14);
    text(c, '4 902370 501', 33, 13, 3.6, '#3a3a40');
    text(c, 'S/N G10893412', 0, 21, 4, '#6a6a70', { font: 'bold' });
    // battery bay the door sits in
    c.fillStyle = shade(GREY, -0.3);
    c.beginPath(); rrc(c, DOOR.x, DOOR.y, DOOR.w + 6, DOOR.h + 6, 9); c.fill();
    text(c, 'BATTERY  1.5V × 4  (AA)', 0, 141, 5, shade(GREY, -0.5), { font: 'bold' });
  },
};

const cartPath = shapeFrom(roundedPts([[-56, -60, 4], [42, -60, 3], [56, -46, 3], [56, 60, 4], [-56, 60, 4]]));
const cart: PartDef = {
  id: 'cart', name: { en: 'Game Cartridge', vi: 'Băng game' }, side: 'B', z: 7, x: 0, y: CART_Y, w: 112, h: 120, icon: '💾',
  shape: cartPath, thick: 7, round: 2.5, body: '#8e8b84',
  draw(c) {
    slab(c, cartPath, CART, -60, 60, { depth: 4, shadow: 0 });
    grain(c, cartPath, 14, 300, 112, 120);
    // moulded top band with the arrow, then the label recess, then grip ribs
    groove(c, -56, -40, 56, -40, CART);
    logo(c, 'CHILL·BOY', -6, -51, 9, shade(CART, -0.38));
    text(c, '▼', 40, -50, 7, shade(CART, -0.38));
    c.fillStyle = shade(CART, -0.2);
    c.beginPath(); rrc(c, 0, 4, 92, 70, 3); c.fill();
    const g = c.createLinearGradient(0, -28, 0, 36);
    g.addColorStop(0, '#7fd3f2'); g.addColorStop(0.62, '#bfe9f7'); g.addColorStop(0.63, '#6cc24a'); g.addColorStop(1, '#4e9a34');
    c.fillStyle = g;
    c.beginPath(); rrc(c, 0, 4, 86, 64, 2); c.fill();
    // label art: a pixel hero over the hills
    c.fillStyle = '#ffffff';
    c.beginPath(); rrc(c, -22, -12, 22, 7, 3.5); rrc(c, 24, -18, 16, 6, 3); c.fill();
    const px = 3;
    HERO.forEach((row, j) => [...row].forEach((b, i) => {
      if (b === '1') { c.fillStyle = j < 2 ? '#e0402f' : '#2a3a8a'; c.fillRect(-8 + i * px, 2 + j * px, px, px); }
    }));
    c.fillStyle = NAVY;
    c.fillRect(-43, -28, 86, 12);
    text(c, 'PIXEL PICNIC', 0, -22, 8, '#ffd84a', { font: 'bold' });
    text(c, 'CB-PXL', 30, 32, 4.5, '#ffffff', { font: 'bold' });
    c.strokeStyle = shade(CART, -0.25); c.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-34, 44 + i * 4); c.lineTo(34, 44 + i * 4); c.stroke(); }
  },
};

const doorPath = rrPath(0, 0, DOOR.w, DOOR.h, 8);
const door: PartDef = {
  id: 'door', name: { en: 'Battery Cover', vi: 'Nắp pin' }, side: 'B', z: 7, x: DOOR.x, y: DOOR.y, w: DOOR.w, h: DOOR.h, icon: '▭',
  shape: doorPath, needs: ['sd'], elev: 29, thick: 4, round: 2.5, body: '#a09e97',
  draw(c) {
    slab(c, doorPath, GREY_B, -44, 44, { depth: 4, shadow: 0 });
    grain(c, doorPath, 15, 260, DOOR.w, DOOR.h);
    // ribbed thumb grip and the slide arrow
    c.fillStyle = shade(GREY, -0.12);
    c.beginPath(); rrc(c, 0, -26, 54, 26, 5); c.fill();
    for (let i = 0; i < 7; i++) groove(c, -22, -36 + i * 3.4, 22, -36 + i * 3.4, GREY_B);
    c.fillStyle = shade(GREY, -0.42);
    c.beginPath(); c.moveTo(-9, -4); c.lineTo(9, -4); c.lineTo(0, 7); c.closePath(); c.fill();
    text(c, 'OPEN', 0, 15, 7, shade(GREY, -0.45), { font: 'bold' });
    text(c, '+ AA  −   − AA  +', 0, 28, 4.6, shade(GREY, -0.38), { font: 'bold' });
  },
};

const batPath = rrPath(0, 0, 104, 80, 5);
const battery: PartDef = {
  id: 'battery', name: { en: 'AA Batteries ×4', vi: 'Bốn viên pin AA' }, side: 'B', z: 6, x: DOOR.x, y: DOOR.y, w: 104, h: 80, icon: '🔋',
  shape: batPath, needs: ['door'], elev: 22, thick: 8, round: 4, body: '#2c2e33',
  draw(c) {
    // the bay floor with its springs and tabs
    c.fillStyle = '#5c5952';
    c.beginPath(); rrc(c, 0, 0, 104, 80, 5); c.fill();
    for (let i = 0; i < 4; i++) {
      const y = -30 + i * 20, dir = i % 2 ? -1 : 1;
      c.save();
      c.translate(0, y);
      cylH(c, 92, 18, '#24262c', '#cfd3d8');
      // copper top + wrapper print
      c.fillStyle = '#c9772e';
      c.fillRect(dir * 26 - 12, -9, 24, 18);
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(dir * 26 - 12, -7, 24, 3);
      text(c, 'CHILL CELL', -dir * 10, 0.5, 6, '#f2f2f2', { font: 'bold' });
      text(c, dir > 0 ? '+' : '−', dir * 40, 0.5, 8, '#2a2a2a', { font: 'bold' });
      // the spring on the minus end
      c.strokeStyle = '#d6dade'; c.lineWidth = 1;
      for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(-dir * 48 - dir * k * 1.2, 0, 1.6, 6, 0, 0, Math.PI * 2); c.stroke(); }
      c.restore();
    }
  },
};

// ---------- inside ----------

const boardPath = shapeFrom(roundedPts([[-82, -134, 8], [82, -134, 8], [82, 130, 10], [-82, 130, 44]]));
const board: PartDef = {
  id: 'board', name: { en: 'Main Board', vi: 'Bo mạch chủ' }, side: 'B', z: 3, x: 0, y: 0, w: 164, h: 264, icon: '🟩',
  shape: boardPath, needs: ['b1', 'b2'], elev: 13, thick: 4, mat: 'pcb', body: '#1d5c37',
  bumps: [
    { kind: 'box', x: 0, y: -122, w: 112, h: 11, height: 7, color: '#2a2a2e' },
    { kind: 'box', x: -16, y: -40, w: 38, h: 38, height: 3, color: '#1c1d22' },
    { kind: 'box', x: 40, y: -60, w: 30, h: 15, height: 2.5, color: '#1c1d22' },
    { kind: 'box', x: 40, y: -26, w: 30, h: 15, height: 2.5, color: '#1c1d22' },
    { kind: 'box', x: -54, y: -2, w: 14, h: 6, height: 3, color: '#c9ced6', metal: true },
    { kind: 'cyl', x: 52, y: 20, w: 11, height: 10, color: '#2d3f8f' },
    { kind: 'cyl', x: 66, y: 34, w: 9, height: 8, color: '#2a2a2e' },
    { kind: 'cyl', x: -30, y: 30, w: 8, height: 7, color: '#2d3f8f' },
    { kind: 'box', x: -40, y: 92, w: 36, h: 28, height: 5, color: '#c3c8cf', metal: true },
  ],
  draw(c, s) {
    const g = c.createLinearGradient(0, -134, 0, 130);
    g.addColorStop(0, '#2f8050'); g.addColorStop(1, '#24683f');
    c.fillStyle = g;
    c.fill(boardPath);
    c.save();
    c.clip(boardPath);
    // traces: the cartridge bus fanning into the CPU, the RAM buses, a few stray runs
    c.strokeStyle = '#48a066'; c.lineWidth = 0.9;
    for (let i = 0; i < 16; i++) {
      const xc = -48 + i * 6.4, xu = -32 + i * 2;
      c.beginPath(); c.moveTo(xc, -112); c.lineTo(xc, -96); c.lineTo(xu, -74); c.lineTo(xu, -60); c.stroke();
    }
    for (let i = 0; i < 6; i++) {
      c.beginPath(); c.moveTo(4, -54 + i * 5); c.lineTo(16, -54 + i * 5); c.lineTo(22, -64 + i * 2); c.stroke();
      c.beginPath(); c.moveTo(4, -32 + i * 3); c.lineTo(22, -30 + i * 2); c.stroke();
    }
    const r = rng(21);
    for (let i = 0; i < 26; i++) {
      let x = (r() - 0.5) * 150, y = -10 + r() * 130;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 3; k++) { if (r() < 0.5) x += (r() - 0.5) * 60; else y += (r() - 0.5) * 50; c.lineTo(x, y); }
      c.stroke();
      c.fillStyle = '#d9b25a';
      c.beginPath(); c.arc(x, y, 1.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#24683f';
      c.beginPath(); c.arc(x, y, 0.7, 0, Math.PI * 2); c.fill();
    }
    // the cartridge edge connector footprint along the top
    c.fillStyle = '#e8c15a';
    for (let x = -54; x <= 54; x += 3.4) c.fillRect(x - 0.8, -114, 1.6, 6);
    // silkscreen outlines and the shielded power module
    c.strokeStyle = 'rgba(240,240,230,0.7)'; c.lineWidth = 0.7;
    for (const [x, y, w, h] of [[-16, -40, 48, 48], [40, -60, 36, 20], [40, -26, 36, 20], [-40, 92, 40, 32]] as const) c.strokeRect(x - w / 2, y - h / 2, w, h);
    text(c, 'U1', -44, -62, 5, '#eef0e6', { font: 'bold' });
    text(c, 'U2', 62, -60, 5, '#eef0e6', { font: 'bold' });
    text(c, 'U3', 62, -26, 5, '#eef0e6', { font: 'bold' });
    text(c, 'X1', -54, 7, 5, '#eef0e6', { font: 'bold' });
    for (const [x, y] of [[-20, 20], [10, 30], [24, 50], [-60, 40], [66, 70]] as const) {
      c.fillStyle = r() < 0.5 ? '#c99a3a' : '#8d6a46';
      c.beginPath(); rrc(c, x, y, 6, 3.4, 0.8); c.fill();
      c.fillStyle = '#d9dde2'; c.fillRect(x - 3, y - 1.7, 1.2, 3.4); c.fillRect(x + 1.8, y - 1.7, 1.2, 3.4);
    }
    // CPU (QFP, legs all round), two RAM chips, the crystal
    const quad = (x: number, y: number, w: number, h: number, label: string) => {
      c.fillStyle = '#b9bec6';
      for (let k = -w / 2 + 3; k < w / 2 - 1; k += 2.6) { c.fillRect(x + k, y - h / 2 - 3, 1.2, 3); c.fillRect(x + k, y + h / 2, 1.2, 3); }
      for (let k = -h / 2 + 3; k < h / 2 - 1; k += 2.6) { c.fillRect(x - w / 2 - 3, y + k, 3, 1.2); c.fillRect(x + w / 2, y + k, 3, 1.2); }
      c.fillStyle = '#1c1d22'; c.beginPath(); rrc(c, x, y, w, h, 1.5); c.fill();
      text(c, label, x, y, 6, '#8a8f99', { font: 'bold' });
    };
    quad(-16, -40, 38, 38, 'CB-CPU');
    quad(40, -60, 30, 15, 'SRAM');
    quad(40, -26, 30, 15, 'VRAM');
    // the button board link and the battery contacts
    ribbon(c, 10, 66, 50, 12);
    c.fillStyle = '#e8c15a';
    for (const [x, y] of [[40, 112], [50, 112], [60, 112], [70, 112]] as const) { c.beginPath(); c.arc(x, y, 2.6, 0, Math.PI * 2); c.fill(); }
    text(c, 'CB-01 MAIN  © CHILLCO', 24, 96, 5.5, '#eef0e6', { font: 'bold' });
    if (s.broken) {
      // a scorched trace next to the CPU: the A button never reaches it
      const g = c.createRadialGradient(18, -6, 1, 18, -6, 22);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(18, -6, 22, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#e8c15a'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(4, 4); c.lineTo(12, -2); c.moveTo(20, -8); c.lineTo(30, -16); c.stroke();
    }
    c.restore();
  },
};

const lcdPath = rrPath(0, 0, 124, 104, 4);
const lcd: PartDef = {
  id: 'lcd', name: { en: 'LCD Module', vi: 'Mô-đun màn hình LCD' }, side: 'B', z: 2, x: -(SCREEN.x + LCD.x), y: SCREEN.y + LCD.y, w: 124, h: 104, icon: '🖥',
  shape: lcdPath, needs: ['board'], elev: 10, thick: 5, mat: 'metal', body: '#8b9097',
  draw(c) {
    // the back of the panel: a steel frame with tabs, the silver reflector and the driver flex
    const g = c.createLinearGradient(0, -52, 0, 52);
    g.addColorStop(0, '#dfe2e6'); g.addColorStop(1, '#8b9097');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 124, 104, 4); c.fill();
    for (const [x, y] of [[-56, -40], [56, -40], [-56, 40], [56, 40]] as const) {
      c.fillStyle = '#9aa0a8'; c.beginPath(); rrc(c, x, y, 8, 12, 2); c.fill();
    }
    const r = c.createLinearGradient(-50, -40, 50, 40);
    r.addColorStop(0, '#f2f3f5'); r.addColorStop(0.5, '#b3b8be'); r.addColorStop(1, '#e4e6ea');
    c.fillStyle = r; c.beginPath(); rrc(c, 0, -6, 100, 74, 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.beginPath(); c.moveTo(-50, -43); c.lineTo(-10, -43); c.lineTo(-50, 10); c.closePath(); c.fill();
    text(c, 'LCD CB-LM1', 0, -6, 7, '#6a7078', { font: 'bold' });
    // flex with the driver chip, down to the board
    ribbon(c, 0, 42, 64, 16);
    c.fillStyle = '#1c1d22'; c.beginPath(); rrc(c, 0, 42, 24, 7, 1); c.fill();
  },
};

// rubber membrane seen from behind: the d-pad on the right, carbon pads on every key
const memPath = shapeFrom(roundedPts([[-82, -58, 12], [82, -58, 12], [82, 58, 10], [-82, 58, 40]]));
const MEM_Y = 76;
const memPads: [number, number, number][] = [
  [-DPAD.x, DPAD.y - 15, 5], [-DPAD.x, DPAD.y + 15, 5], [-DPAD.x - 15, DPAD.y, 5], [-DPAD.x + 15, DPAD.y, 5],
  [-BTN_A.x, BTN_A.y, 8], [-BTN_B.x, BTN_B.y, 8],
];
const buttons: PartDef = {
  id: 'buttons', name: { en: 'Rubber Membrane', vi: 'Màng nút cao su' }, side: 'B', z: 2, x: 0, y: MEM_Y, w: 164, h: 116, icon: '🫧',
  shape: memPath, needs: ['board'], elev: 11, thick: 4, mat: 'rubber', body: '#55565c',
  bumps: [
    // rubber domes, each with its carbon pill on top
    ...[BTN_A, BTN_B].map((b) => ({ kind: 'cyl' as const, x: -b.x, y: b.y - MEM_Y, w: 26, height: 1.4, color: '#6f7078' })),
    ...memPads.map(([x, y, r]) => ({ kind: 'cyl' as const, x, y: y - MEM_Y, w: r * 2, height: r > 6 ? 1.9 : 1.4, color: '#151517' })),
    ...PILLS.map(([x, y]) => ({ kind: 'cyl' as const, x: -x, y: y - MEM_Y, w: 6, height: 1.4, color: '#151517' })),
  ],
  draw(c) {
    c.fillStyle = '#6a6b72';
    c.fill(memPath);
    c.fillStyle = 'rgba(255,255,255,0.1)';
    c.beginPath(); rrc(c, 0, -46, 150, 10, 5); c.fill();
    c.save();
    c.translate(0, -MEM_Y);
    // d-pad rocker back, round A/B domes, the two pill domes
    c.fillStyle = '#7d7e86';
    c.beginPath(); rrc(c, -DPAD.x, DPAD.y, 46, 17, 4); rrc(c, -DPAD.x, DPAD.y, 17, 46, 4); c.fill();
    for (const b of [BTN_A, BTN_B]) {
      const g = c.createRadialGradient(-b.x - 4, b.y - 4, 1, -b.x, b.y, 13);
      g.addColorStop(0, '#9a9ba3'); g.addColorStop(1, '#5c5d64');
      c.fillStyle = g; c.beginPath(); c.arc(-b.x, b.y, 13, 0, Math.PI * 2); c.fill();
    }
    for (const [x, y] of PILLS) pillAt(c, -x, y, 22, 9, -PILL_ANG, '#7d7e86');
    for (const [x, y, r] of memPads) {
      c.fillStyle = '#151517'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },
};

export const handheld: DeviceDef = {
  id: 'handheld',
  name: { en: 'Retro Handheld Console', vi: 'Máy chơi game cầm tay' },
  w: 180, h: 300,
  hasBack: true,
  parts: [
    frontCase, bezel, backCase, cart, door, battery, board, lcd, buttons,
    screw('sd', 0, 124, 'B', 9),
    ...SCREWS.map(([x, y], i) => screw(`c${i + 1}`, x, y, 'B')),
    screw('b1', -70, -100, 'B', 4, ['back']), screw('b2', 70, 104, 'B', 4, ['back']),
  ],
  working(c, t, k) {
    // the boot logo and the little game are painted on the LCD itself; this is its backlit glow
    c.save();
    const x = SCREEN.x + LCD.x, y = SCREEN.y + LCD.y;
    c.globalAlpha = k * (0.4 + Math.sin(t * 5) * 0.08);
    const g = c.createRadialGradient(x, y, 10, x, y, 80);
    g.addColorStop(0, 'rgba(190,240,110,0.45)'); g.addColorStop(1, 'rgba(190,240,110,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, 80, 0, Math.PI * 2); c.fill();
    c.restore();
  },
  workFx: { kind: 'note', x: 52, y: 110, color: '#c9f27a', dir: -Math.PI / 2 },
};
