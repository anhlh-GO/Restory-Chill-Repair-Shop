// An early-80s solar pocket calculator, the kind a dad kept from university:
// a chocolate soft-touch case, a brushed champagne-aluminium face plate round a
// grey-green LCD and a strip of amber solar cells, and a 4 × 5 rubber key mat
// whose domed keys stand proud of the case. Two faces: the back has rubber
// feet, the spec label and the coin-cell hatch; the board lives behind it.

import { type C, shade, rrc, rrPath, ellPath, rng, shapeFrom, rrPts, type Pts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, boss } from './kit';

const CASE = '#3a2e28';
const ALU = '#cdb995';
const KEY_NUM = '#eee6d4';
const KEY_OP = '#5a4a3f';
const KEY_RED = '#d6573a';
const KEY_EQ = '#e3a03c';
const LCD_BG = '#b4bca4';
const GOLD = '#e8c15a';
const SANS = '"Helvetica Neue", Arial, sans-serif';

const BW = 176, BH = 280;
const BODY = rrPath(0, 0, BW, BH, 16);
const BODY_IN = rrPath(0, 0, BW - 16, BH - 16, 10);

const LCD_Y = -80;
const LCD_W = 136, LCD_H = 40;
const SOLAR = { x: 34, y: -119, w: 70, h: 16 };

// 4 × 5 key grid, key centres relative to the mat (front view; the back mirrors x)
const KEYS_Y = 56;
const PX = 38, PY = 28, KEY_W = 31, KEY_H = 21;
const LABELS = [['C', '%', '√', '÷'], ['7', '8', '9', '×'], ['4', '5', '6', '−'], ['1', '2', '3', '+'], ['ON', '0', '.', '=']];
const KEYS: [number, number, string, string][] = [];
LABELS.forEach((row, j) => row.forEach((l, i) => {
  const col = l === 'C' || l === 'ON' ? KEY_RED : l === '=' ? KEY_EQ : i === 3 || j === 0 ? KEY_OP : KEY_NUM;
  KEYS.push([-PX * 1.5 + i * PX, -PY * 2 + j * PY, l, col]);
}));
// above-key printed functions, as on the real thing
const SHIFT = ['MRC', 'M−', 'M+', '→'];

const SCREWS: [number, number][] = [[-66, -118], [66, -118], [-66, 118], [66, 118]];
const COIN = { x: -40, y: -60 };

function font(c: C, size: number, weight = 700): void {
  c.font = `${weight} ${size}px ${SANS}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
}

/** Fine matte speckle of soft-touch plastic. */
function softTouch(c: C, path: Path2D, base: string, seed: number): void {
  c.fillStyle = base;
  c.fill(path);
  c.save(); c.clip(path);
  const g = c.createLinearGradient(-BW / 2, -BH / 2, BW / 2, BH / 2);
  g.addColorStop(0, 'rgba(255,240,220,0.08)'); g.addColorStop(0.5, 'rgba(255,240,220,0)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
  c.fillStyle = g; c.fillRect(-BW / 2, -BH / 2, BW, BH);
  const r = rng(seed);
  for (let i = 0; i < 1600; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,235,210,0.06)';
    c.fillRect((r() - 0.5) * BW, (r() - 0.5) * BH, 0.8 + r(), 0.8 + r());
  }
  c.restore();
}

/** Brushed champagne aluminium with a bright edge bevel. */
function aluminium(c: C, path: Path2D, x: number, y: number, w: number, h: number, seed: number): void {
  c.save(); c.clip(path);
  const g = c.createLinearGradient(x, y, x + w * 0.4, y + h);
  g.addColorStop(0, shade(ALU, 0.35)); g.addColorStop(0.35, ALU); g.addColorStop(0.6, shade(ALU, 0.18)); g.addColorStop(1, shade(ALU, -0.12));
  c.fillStyle = g; c.fillRect(x, y, w, h);
  const r = rng(seed);
  c.lineWidth = 0.35;
  for (let i = 0; i < h * 3; i++) {
    const yy = y + r() * h;
    c.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.15 + r() * 0.3})` : `rgba(90,70,40,${0.06 + r() * 0.1})`;
    const x0 = x + r() * w * 0.6;
    c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 + w * (0.2 + r() * 0.5), yy); c.stroke();
  }
  c.restore();
}

/** Little 7-segment digit, `w` wide, `h` tall, centred on (x, y). */
function seg7(c: C, ch: string, x: number, y: number, w: number, h: number, col: string): void {
  const SEG: Record<string, string> = {
    '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g',
  };
  const on = SEG[ch] ?? '';
  const t = w * 0.18, hx = w / 2, hy = h / 2;
  const bars: Record<string, [number, number, number, number]> = {
    a: [0, -hy, w - t, t], g: [0, 0, w - t, t], d: [0, hy, w - t, t],
    f: [-hx, -hy / 2, t, hy - t * 0.4], b: [hx, -hy / 2, t, hy - t * 0.4],
    e: [-hx, hy / 2, t, hy - t * 0.4], c: [hx, hy / 2, t, hy - t * 0.4],
  };
  c.fillStyle = col;
  for (const k of on) {
    const [bx, by, bw, bh] = bars[k];
    // the gentle italic slant of a real LCD
    c.beginPath(); rrc(c, x + bx - by * 0.12, y + by, bw, bh, t / 2); c.fill();
  }
}

/** The LCD glass: a faint ghost of every segment when off, '0.7734' (hELLO upside down) when on. */
function lcdFace(c: C, w: number, h: number, power: number, t: number): void {
  const on = power > 0;
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, shade(LCD_BG, on ? 0.2 : 0.06)); g.addColorStop(1, shade(LCD_BG, on ? 0 : -0.14));
  c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, w, h, 2); c.fill();
  // the polariser's soft inner shadow
  c.strokeStyle = 'rgba(40,50,30,0.25)'; c.lineWidth = 3; c.beginPath(); rrc(c, 0, 0, w - 3, h - 3, 2); c.stroke();
  const dw = 10, gap = (w - 22) / 8;
  for (let i = 0; i < 8; i++) seg7(c, '8', -w / 2 + 16 + gap * (i + 0.5), 1, dw, h * 0.58, 'rgba(50,60,40,0.06)');
  if (on) {
    c.globalAlpha = power;
    const digits = '07734';
    const ink = '#1f2a1a';
    [...digits].forEach((d, k) => {
      const i = 8 - digits.length + k;
      seg7(c, d, -w / 2 + 16 + gap * (i + 0.5), 1, dw, h * 0.58, ink);
      if (k === 0) { c.fillStyle = ink; c.beginPath(); c.arc(-w / 2 + 16 + gap * (i + 1) - 1, h * 0.29, 1.5, 0, Math.PI * 2); c.fill(); }
    });
    font(c, 5, 800); c.fillStyle = ink;
    if (Math.sin(t * 4) > 0) c.fillText('M', -w / 2 + 7, -h / 2 + 7);
    c.globalAlpha = 1;
  }
}

// ---------------- the frame (base): two tubs back to back ----------------

const frame: PartDef = {
  id: 'frame', name: { en: 'Inner Frame', vi: 'Khung trong' }, side: 'A', z: 0, x: 0, y: 0, w: BW, h: BH, icon: '🧮',
  shape: BODY, needs: ['board', 'keys', 'lcd', 'solar'], thick: 14, cavity: 10, round: 3, wall: 8, body: '#30261f',
  draw(c, s) {
    softTouch(c, BODY, '#33281f', 4);
    c.fillStyle = '#1f1914'; c.fill(BODY_IN);
    c.save(); c.clip(BODY_IN);
    c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 10; c.translate(3, 5); c.stroke(BODY_IN);
    c.restore();
    if (s.view === 'F' || !s.inDevice) {
      // the contact sheet the rubber keys press on: carbon pads ringed by gold combs
      c.fillStyle = '#2d6a46'; c.beginPath(); rrc(c, 0, KEYS_Y, 156, 144, 6); c.fill();
      c.strokeStyle = 'rgba(120,200,140,0.35)'; c.lineWidth = 0.8;
      for (const [x, y] of KEYS) { c.beginPath(); c.moveTo(x, KEYS_Y + y + 8); c.lineTo(x + 14, KEYS_Y + y + 14); c.stroke(); }
      for (const [x, y] of KEYS) {
        c.fillStyle = GOLD; c.beginPath(); c.arc(x, KEYS_Y + y, 8, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#2d6a46'; c.lineWidth = 1;
        for (let k = -6; k <= 6; k += 3) { c.beginPath(); c.moveTo(x - 7, KEYS_Y + y + k); c.lineTo(x + 7, KEYS_Y + y + k); c.stroke(); }
      }
      // LCD cradle with its zebra strip, the solar leads
      c.fillStyle = '#141110'; c.beginPath(); rrc(c, 0, LCD_Y, 150, 50, 4); c.fill();
      c.fillStyle = '#d8d2c8'; c.fillRect(-66, LCD_Y + 21, 132, 3);
      c.fillStyle = 'rgba(0,0,0,0.5)';
      for (let x = -66; x < 66; x += 1.6) c.fillRect(x, LCD_Y + 21, 0.7, 3);
      c.strokeStyle = '#d9a443'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(SOLAR.x - 30, SOLAR.y + 8); c.lineTo(SOLAR.x - 30, LCD_Y - 26); c.moveTo(SOLAR.x + 30, SOLAR.y + 8); c.lineTo(SOLAR.x + 30, LCD_Y - 26); c.stroke();
    } else {
      // inside, seen from the back: coin-cell well, screw bosses, stiffening ribs
      c.strokeStyle = '#3a2f27'; c.lineWidth = 2.5;
      for (const y of [-30, 40]) { c.beginPath(); c.moveTo(-74, y); c.lineTo(74, y); c.stroke(); }
      c.strokeStyle = '#4a3c31'; c.lineWidth = 2;
      c.beginPath(); c.arc(COIN.x, COIN.y, 20, 0, Math.PI * 2); c.stroke();
      for (const [x, y] of SCREWS) boss(c, x, y, '#4a3c31');
      boss(c, 32, 40, '#4a3c31');
    }
  },
};

// ---------------- front case: soft-touch shell, aluminium face plate ----------------

const KEY_HOLES = KEYS.map(([x, y]) => rrPts(x, KEYS_Y + y, KEY_W + 5, KEY_H + 5, 5));
const LCD_HOLE = rrPts(0, LCD_Y, LCD_W, LCD_H, 4);
const SOLAR_HOLE = rrPts(SOLAR.x, SOLAR.y, SOLAR.w, SOLAR.h, 2);
const casePath = shapeFrom(rrPts(0, 0, BW, BH, 16), [LCD_HOLE, SOLAR_HOLE, ...KEY_HOLES]);
const PLATE = shapeFrom(rrPts(0, -94, BW - 16, 90, 8), [LCD_HOLE, SOLAR_HOLE]);

const topCase: PartDef = {
  id: 'case', name: { en: 'Front Case', vi: 'Vỏ mặt trước' }, side: 'F', z: 7, x: 0, y: 0, w: BW, h: BH, icon: '🧮',
  shape: casePath, needs: ['s1', 's2', 's3', 's4'], tool: 'sponge', elev: 14, thick: 6, round: 3, body: '#2e241e',
  draw(c, s) {
    softTouch(c, casePath, CASE, 9);
    // brushed face plate with a bright chamfer, the window bezels sunk into it
    aluminium(c, PLATE, -BW / 2, -140, BW, 96, 17);
    c.strokeStyle = 'rgba(255,250,235,0.85)'; c.lineWidth = 1; c.beginPath(); rrc(c, 0, -94, BW - 17, 89, 8); c.stroke();
    c.strokeStyle = 'rgba(60,45,30,0.5)'; c.lineWidth = 0.8; c.beginPath(); rrc(c, 0, -94, BW - 15, 91, 9); c.stroke();
    c.fillStyle = '#211a16';
    c.beginPath(); rrc(c, 0, LCD_Y, LCD_W + 8, LCD_H + 8, 6); c.fill();
    c.beginPath(); rrc(c, SOLAR.x, SOLAR.y, SOLAR.w + 6, SOLAR.h + 6, 3); c.fill();
    // engraved maker's marks
    font(c, 12, 800); c.textAlign = 'left';
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillText('CHILL', -76, -118.5);
    c.fillStyle = '#3b2c20'; c.fillText('CHILL', -76, -119);
    font(c, 4.2, 700); c.textAlign = 'left'; c.fillStyle = '#5a4630';
    c.fillText('ELECTRONIC CALCULATOR', -76, -108);
    font(c, 4.6, 700); c.fillStyle = '#5a4630'; c.fillText('CC-8  ·  TWO WAY POWER', 0, LCD_Y + 28);
    c.fillStyle = '#c4362c'; c.fillRect(-58, LCD_Y + 33, 116, 1.2);
    // printed shift legends over the top row, the column of ink-dots by the keys
    SHIFT.forEach((l, i) => { font(c, 4.6, 700); c.fillStyle = '#e8a23a'; c.fillText(l, KEYS[i][0], KEYS_Y + KEYS[i][1] - 15.5); });
    // shadowed lips round the key holes
    for (const [x, y] of KEYS) {
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.6; c.beginPath(); rrc(c, x, KEYS_Y + y, KEY_W + 7, KEY_H + 7, 6); c.stroke();
    }
    // well-loved: the soft-touch rubbed shiny where the thumb rests, a scuff on a corner
    const wg = c.createRadialGradient(-60, 128, 2, -60, 128, 30);
    wg.addColorStop(0, 'rgba(255,230,200,0.12)'); wg.addColorStop(1, 'rgba(255,230,200,0)');
    c.fillStyle = wg; c.beginPath(); c.arc(-60, 128, 30, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(200,180,160,0.3)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(78, 120); c.lineTo(84, 128); c.moveTo(80, 118); c.lineTo(85, 124); c.stroke();
    font(c, 4, 700); c.fillStyle = '#8a7a6a'; c.fillText('JAPAN', 0, 134);
    if (!s.inDevice) {
      // loose case: the clear screen window still in it
      c.fillStyle = 'rgba(210,230,255,0.22)';
      c.beginPath(); rrc(c, 0, LCD_Y, LCD_W, LCD_H, 4); c.fill();
    }
  },
};

// ---------------- LCD module ----------------

const lcdPath = rrPath(0, 0, 148, 48, 4);
const lcd: PartDef = {
  id: 'lcd', name: { en: 'LCD Panel', vi: 'Màn hình LCD' }, side: 'F', z: 5, x: 0, y: LCD_Y, w: 148, h: 48, icon: '🖥',
  shape: lcdPath, needs: ['case'], elev: 8, thick: 8, round: 1.5, mat: 'glass', body: '#7c8288',
  draw(c, s) {
    // stamped steel frame with its tabs, then the glass sandwich
    const m = c.createLinearGradient(0, -24, 0, 24);
    m.addColorStop(0, '#e2e5e9'); m.addColorStop(0.5, '#a3a9b0'); m.addColorStop(1, '#cfd3d8');
    c.fillStyle = m; c.beginPath(); rrc(c, 0, 0, 148, 48, 4); c.fill();
    c.fillStyle = '#80868d';
    for (const x of [-60, 60]) { c.fillRect(x - 5, -24, 10, 3); c.fillRect(x - 5, 21, 10, 3); }
    c.fillStyle = '#3a3d3a'; c.beginPath(); rrc(c, 0, 0, 140, 42, 2); c.fill();
    lcdFace(c, 136, 38, s.power, s.time);
    if (s.broken) {
      // fogged: moisture got under the polariser, a scratched film and a bloom of dark liquid crystal
      c.fillStyle = 'rgba(245,248,240,0.42)'; c.beginPath(); rrc(c, 0, 0, 136, 38, 2); c.fill();
      const b = c.createRadialGradient(-38, 6, 1, -38, 6, 18);
      b.addColorStop(0, 'rgba(30,26,40,0.6)'); b.addColorStop(1, 'rgba(30,26,40,0)');
      c.fillStyle = b; c.beginPath(); c.arc(-38, 6, 18, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 0.7;
      for (const [x0, y0, x1, y1] of [[-62, -14, -14, 14], [-36, -17, 30, 6], [8, -15, 60, 12], [-20, 10, 46, -12]]) {
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
    }
    // the glass's own reflection
    c.fillStyle = 'rgba(255,255,255,0.16)';
    c.beginPath(); c.moveTo(-66, -18); c.lineTo(-30, -18); c.lineTo(-50, 18); c.lineTo(-66, 18); c.closePath(); c.fill();
  },
};

// ---------------- solar cell ----------------

const solarPath = rrPath(0, 0, 76, 20, 2);
const solar: PartDef = {
  id: 'solar', name: { en: 'Solar Cell', vi: 'Pin mặt trời' }, side: 'F', z: 5, x: SOLAR.x, y: SOLAR.y, w: 76, h: 20, icon: '☀️',
  shape: solarPath, needs: ['case'], elev: 8, thick: 9, round: 1, mat: 'glass', body: '#2a1c20',
  draw(c, s) {
    c.fillStyle = '#c9c2b8'; c.beginPath(); rrc(c, 0, 0, 76, 20, 2); c.fill();
    // four amorphous-silicon cells: plum-brown with a faint rainbow sheen and silver bus lines
    for (let i = 0; i < 4; i++) {
      const x = -25.5 + i * 17;
      const g = c.createLinearGradient(x - 8, -7, x + 8, 7);
      g.addColorStop(0, '#6e3e48'); g.addColorStop(0.45, '#3e2430'); g.addColorStop(0.7, '#4a3050'); g.addColorStop(1, '#2a1820');
      c.fillStyle = g; c.fillRect(x - 8, -7, 16, 14);
      c.strokeStyle = 'rgba(220,200,215,0.35)'; c.lineWidth = 0.5;
      for (let k = -5; k <= 5; k += 2.5) { c.beginPath(); c.moveTo(x - 8, k); c.lineTo(x + 8, k); c.stroke(); }
    }
    c.fillStyle = '#d8d2c8'; c.fillRect(-34, -8, 2, 16); c.fillRect(32, -8, 2, 16);
    if (s.power > 0) {
      const gx = -30 + ((s.time * 30) % 60);
      c.fillStyle = `rgba(255,240,200,${0.45 * s.power})`;
      c.beginPath(); c.ellipse(gx, -2, 6, 3, -0.4, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(-34, -8, 68, 2.5);
  },
};

// ---------------- rubber key mat: domed keys on a thin web ----------------
// Slots cut between the keys leave each key its own island joined at the corners, so the
// volume swells every key into a pillow that rises through its hole in the case.

const MAT_W = 160, MAT_H = 146;
const matHoles: Pts[] = [];
for (let j = 0; j < 5; j++) for (let k = 0; k <= 4; k++) matHoles.push(rrPts(-PX * 2 + k * PX, -PY * 2 + j * PY, 4, KEY_H, 2));
for (let j = 0; j <= 5; j++) for (let i = 0; i < 4; i++) matHoles.push(rrPts(-PX * 1.5 + i * PX, -PY * 2.5 + j * PY, KEY_W, 4, 2));
const matPath = shapeFrom(rrPts(0, 0, MAT_W, MAT_H, 8), matHoles);

const keys: PartDef = {
  id: 'keys', name: { en: 'Rubber Key Mat', vi: 'Bàn phím cao su' }, side: 'F', z: 5, x: 0, y: KEYS_Y, w: MAT_W, h: MAT_H, icon: '🔢',
  shape: matPath, needs: ['case'], tool: 'brush', elev: 6, thick: 18, round: 8, mat: 'rubber', body: '#6a5a4c',
  draw(c, s) {
    c.fillStyle = '#7a6a5c'; c.fill(matPath);
    KEYS.forEach(([x, y, l, col], i) => {
      // a slightly darker skirt, then the key's soft, satin top
      c.fillStyle = shade(col, -0.3); c.beginPath(); rrc(c, x, y, KEY_W + 3, KEY_H + 3, 6); c.fill();
      const g = c.createRadialGradient(x - 6, y - 6, 2, x, y, KEY_W * 0.7);
      g.addColorStop(0, shade(col, 0.2)); g.addColorStop(1, col);
      c.fillStyle = g; c.beginPath(); rrc(c, x, y, KEY_W - 3, KEY_H - 3, 5); c.fill();
      // the thumb-polish on the most-used keys
      if ('0123456789=+'.includes(l)) {
        c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.ellipse(x - 2, y - 2, 8, 4, -0.2, 0, Math.PI * 2); c.fill();
      }
      const ink = col === KEY_NUM ? '#3a2e26' : '#fbf3e4';
      const big = l.length === 1 && '0123456789.'.includes(l);
      font(c, l.length > 1 ? 7.5 : big ? 11 : 12, 700); c.fillStyle = ink; c.fillText(l, x, y + 0.5);
      if (s.broken && i === 4) {
        // the 7: its dome squashed flat and split, a grimy ring round it
        c.fillStyle = 'rgba(60,40,30,0.35)'; c.beginPath(); rrc(c, x, y + 1, KEY_W - 8, KEY_H - 8, 5); c.fill();
        c.strokeStyle = '#5a4a3a'; c.lineWidth = 1.3;
        c.beginPath(); c.moveTo(x - 12, y - 4); c.lineTo(x - 3, y + 3); c.lineTo(x + 2, y - 2); c.lineTo(x + 11, y + 5); c.stroke();
      }
      if (s.broken && (i === 9 || i === 14)) {
        c.fillStyle = 'rgba(70,50,30,0.25)'; c.beginPath(); c.ellipse(x + 4, y + 3, 9, 5, 0.3, 0, Math.PI * 2); c.fill();
      }
    });
  },
};

// ---------------- back side, x mirrored (seen from behind) ----------------

const back: PartDef = {
  id: 'back', name: { en: 'Back Case', vi: 'Vỏ lưng' }, side: 'B', z: 6, x: 0, y: 0, w: BW, h: BH, icon: '🟫',
  shape: BODY, needs: ['s1', 's2', 's3', 's4'], tool: 'sponge', elev: 14, thick: 6, round: 3, body: '#2e241e',
  bumps: [
    { kind: 'box', x: 0, y: -126, w: 84, h: 8, height: 2.5, color: '#1a1614' },
    { kind: 'box', x: 0, y: 126, w: 84, h: 8, height: 2.5, color: '#1a1614' },
  ],
  draw(c) {
    softTouch(c, BODY, CASE, 21);
    // moulded feet channels, the screw counterbores
    c.fillStyle = '#211a16';
    for (const y of [-126, 126]) { c.beginPath(); rrc(c, 0, y, 88, 11, 5); c.fill(); }
    for (const [x, y] of SCREWS) { c.fillStyle = '#1e1814'; c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill(); }
    // silver spec label
    c.fillStyle = '#d6d2ca'; c.beginPath(); rrc(c, 18, 30, 104, 64, 4); c.fill();
    c.strokeStyle = '#9a948a'; c.lineWidth = 0.8; c.beginPath(); rrc(c, 18, 30, 98, 58, 3); c.stroke();
    font(c, 10, 800); c.fillStyle = CASE; c.fillText('CHILL', 18, 12);
    font(c, 4.6, 700); c.fillStyle = '#5a5048';
    c.fillText('ELECTRONIC CALCULATOR  CC-8', 18, 24);
    c.fillText('SOLAR CELL + CR2032 × 1', 18, 33);
    c.fillText('No. 8104217', 18, 42);
    c.fillStyle = '#c4362c'; c.fillRect(-26, 50, 88, 1.2);
    font(c, 4, 700); c.fillStyle = '#7a7068'; c.fillText('MADE IN JAPAN', 18, 55);
    // coin-cell hatch with its OPEN arrow
    c.strokeStyle = '#1a1512'; c.lineWidth = 1.4; c.beginPath(); c.arc(COIN.x, COIN.y, 21, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(255,235,210,0.12)'; c.lineWidth = 0.8; c.beginPath(); c.arc(COIN.x, COIN.y, 22.5, 0, Math.PI * 2); c.stroke();
    font(c, 4.4, 700); c.fillStyle = '#9a8a7a'; c.fillText('OPEN ▸', COIN.x, COIN.y + 1);
  },
};

const coinPath = ellPath(0, 0, 18, 18);
const coin: PartDef = {
  id: 'coin', name: { en: 'Coin Battery', vi: 'Pin cúc áo' }, side: 'B', z: 5, x: COIN.x, y: COIN.y, w: 36, h: 36, icon: '🪙',
  shape: coinPath, needs: ['back'], elev: 8, thick: 4, round: 1.5, mat: 'metal', body: '#9aa1a8',
  draw(c, s) {
    const g = c.createRadialGradient(-6, -7, 2, 0, 0, 18);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#cfd4da'); g.addColorStop(1, '#8b9097');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 18, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#7d838b'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 15, 0, Math.PI * 2); c.stroke();
    font(c, 9, 800); c.fillStyle = '#5a6068'; c.fillText('+', 0, -7);
    font(c, 5, 700); c.fillText('CR2032', 0, 3);
    font(c, 3.4, 600); c.fillText('3V  LITHIUM', 0, 9);
    if (s.broken) {
      c.fillStyle = 'rgba(150,200,150,0.85)';
      for (const [x, y, r] of [[11, 9, 4], [14, 2, 3], [5, 13, 2.5]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
    }
  },
};

const boardPath = rrPath(0, 0, 150, 176, 6);
const board: PartDef = {
  id: 'board', name: { en: 'Main Board', vi: 'Bo mạch' }, side: 'B', z: 4, x: 0, y: -4, w: 150, h: 176, icon: '🟩',
  shape: boardPath, needs: ['s5', 'coin'], elev: 5, thick: 3, mat: 'pcb', body: '#1d5c37',
  bumps: [{ kind: 'cyl', x: 16, y: 22, w: 34, height: 2.5, color: '#151518' }],
  draw(c, s) {
    pcb(c, 150, 176, 404);
    // the calculator brain: a chip-on-board under a black epoxy blob
    const g = c.createRadialGradient(10, 14, 2, 16, 22, 20);
    g.addColorStop(0, '#4a4a52'); g.addColorStop(1, '#141418');
    c.fillStyle = g; c.beginPath(); c.arc(16, 22, 18, 0, Math.PI * 2); c.fill();
    // coin-cell clip, zebra pads at the screen edge, a crystal
    c.fillStyle = '#c9ced6'; c.beginPath(); rrc(c, COIN.x, COIN.y + 4, 44, 10, 3); c.fill();
    c.fillStyle = GOLD; c.beginPath(); c.arc(COIN.x, COIN.y + 4, 9, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 18; i++) c.fillRect(-64 + i * 7.4, -84, 4, 6);
    c.fillStyle = '#b8bcc4'; c.beginPath(); rrc(c, 50, 40, 8, 18, 4); c.fill();
    font(c, 4, 700); c.fillStyle = '#e8eef8'; c.fillText('CC-8  REV.B', -30, 70);
    if (s.broken) {
      const b = c.createRadialGradient(-30, 40, 1, -30, 40, 20);
      b.addColorStop(0, 'rgba(20,12,8,0.95)'); b.addColorStop(0.6, 'rgba(60,30,10,0.6)'); b.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = b; c.beginPath(); c.arc(-30, 40, 20, 0, Math.PI * 2); c.fill();
    }
  },
};

export const calculator: DeviceDef = {
  id: 'calculator',
  name: { en: 'Pocket Calculator', vi: 'Máy tính bỏ túi' },
  w: BW, h: BH,
  hasBack: true,
  parts: [
    frame, topCase, lcd, solar, keys, back, coin, board,
    ...SCREWS.map(([x, y], i) => screw(`s${i + 1}`, x, y, 'B')),
    { ...screw('s5', 32, 40, 'B', 5, ['back']), elev: 8 },
  ],
  working(c, t, k) {
    c.save();
    // the screen glows softly, a few happy sparkles over the solar strip
    c.globalAlpha = k * (0.5 + Math.sin(t * 4) * 0.12);
    const g = c.createRadialGradient(0, LCD_Y, 6, 0, LCD_Y, 100);
    g.addColorStop(0, 'rgba(210,240,160,0.6)'); g.addColorStop(1, 'rgba(210,240,160,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, LCD_Y, 100, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.9 + i / 3) % 1;
      c.globalAlpha = k * (1 - p);
      c.fillStyle = '#ffe28a';
      c.beginPath(); c.arc(SOLAR.x - 26 + i * 26, SOLAR.y - 14 - p * 30, 3 * (1 - p) + 1, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },
  workFx: { kind: 'spark', x: SOLAR.x, y: SOLAR.y - 20, color: '#ffe28a', dir: -Math.PI / 2 },
};
