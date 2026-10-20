// Chunky retro pocket calculator: cream case, chocolate face, rubber keys, solar strip. Two faces.

import { type C, slab, shade, rrc, rrPath, ellPath, glossStreak, text, shapeFrom, rrPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, boss } from './kit';

const CREAM = '#f0e2c2';
const CREAM_D = '#e6d6b2';
const CHOC = '#4b3f3a';
const KEY = '#ece6da';
const ORANGE = '#f2994a';
const RED = '#e5534b';
const TEAL = '#4fb3a9';
const LCD_OFF = '#a9b59a';
const LCD_ON = '#c8dca0';
const GOLD = '#e8c15a';

const BODY = rrPath(0, 0, 180, 280, 24);
const BODY_IN = rrPath(0, 0, 162, 262, 18);

const LCD_Y = -70;
const SOLAR = { x: 36, y: -118 };
// 4 × 5 key grid (front view); the back view mirrors x.
const KEYS_Y = 60;
const KEYS: [number, number, string, string][] = [];
const LABELS = ['C%√÷', '789×', '456−', '123+', 'O0.='];
LABELS.forEach((row, j) => [...row].forEach((l, i) => {
  const col = l === 'C' || l === 'O' ? RED : l === '=' ? TEAL : i === 3 || l === '%' || l === '√' ? ORANGE : KEY;
  KEYS.push([-60 + i * 40, -60 + j * 30, l === 'O' ? 'ON' : l, col]);
}));
const KEY_W = 32, KEY_H = 22;
// Back side, x mirrored (seen from behind)
const SCREWS: [number, number][] = [[-62, -112], [62, -112], [-62, 112], [62, 112]];
const COIN = { x: -42, y: -64 };

/** Little 7-segment digit, `w` wide, `h` tall, centred on (x, y). */
function seg7(c: C, ch: string, x: number, y: number, w: number, h: number, col: string): void {
  const SEG: Record<string, string> = {
    '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g',
  };
  const on = SEG[ch] ?? '';
  const t = w * 0.2, hx = w / 2, hy = h / 2;
  const bars: Record<string, [number, number, number, number]> = {
    a: [0, -hy, w - t, t], g: [0, 0, w - t, t], d: [0, hy, w - t, t],
    f: [-hx, -hy / 2, t, hy - t * 0.4], b: [hx, -hy / 2, t, hy - t * 0.4],
    e: [-hx, hy / 2, t, hy - t * 0.4], c: [hx, hy / 2, t, hy - t * 0.4],
  };
  c.fillStyle = col;
  for (const k of on) {
    const [bx, by, bw, bh] = bars[k];
    // a gentle italic slant like a real LCD
    c.beginPath(); rrc(c, x + bx - by * 0.12, y + by, bw, bh, t / 2); c.fill();
  }
}

/** The LCD glass: ghost 8s when off, a friendly '0.7734' (hELLO upside down) when on. */
function lcdFace(c: C, w: number, h: number, power: number, t: number): void {
  const on = power > 0;
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, on ? shade(LCD_ON, 0.15) : LCD_OFF);
  g.addColorStop(1, on ? LCD_ON : shade(LCD_OFF, -0.18));
  c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, w, h, 4); c.fill();
  const dw = 11, gap = (w - 20) / 8;
  for (let i = 0; i < 8; i++) seg7(c, '8', -w / 2 + 14 + gap * (i + 0.5), 1, dw, h * 0.56, 'rgba(60,70,50,0.07)');
  if (on) {
    c.globalAlpha = power;
    const s = '0.7734';
    const digits = s.replace('.', '');
    const ink = '#2c3a22';
    digits.split('').forEach((d, k) => {
      const i = 8 - digits.length + k;
      seg7(c, d, -w / 2 + 14 + gap * (i + 0.5), 1, dw, h * 0.56, ink);
      if (k === 0) { c.fillStyle = ink; c.beginPath(); c.arc(-w / 2 + 14 + gap * (i + 1) - 1, h * 0.28, 1.8, 0, Math.PI * 2); c.fill(); }
    });
    // blinking memory marker
    if (Math.sin(t * 4) > 0) text(c, 'M', -w / 2 + 9, -h / 2 + 8, 7, ink, { font: 'bold' });
    c.globalAlpha = 1;
  }
}

const KEY_HOLES = KEYS.map(([x, y]) => rrPts(x, KEYS_Y + y, KEY_W + 4, KEY_H + 4, 6));

const frame: PartDef = {
  id: 'frame', name: { en: 'Inner Frame', vi: 'Khung trong' }, side: 'A', z: 0, x: 0, y: 0, w: 180, h: 280, icon: '🧮',
  shape: BODY, needs: ['board', 'keys', 'lcd', 'solar'], thick: 26, cavity: 14, round: 12, wall: 9,
  draw(c, s) {
    slab(c, BODY, '#6b5a4e', -140, 140, { depth: 12, shadow: 0 });
    c.fillStyle = shade('#6b5a4e', -0.3);
    c.fill(BODY_IN);
    c.save(); c.clip(BODY_IN);
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 10; c.translate(3, 5); c.stroke(BODY_IN);
    c.restore();
    if (s.view === 'F' || !s.inDevice) {
      // the printed contact sheet the rubber keys press on
      c.fillStyle = '#e9e2cf';
      c.beginPath(); rrc(c, 0, KEYS_Y, 166, 152, 10); c.fill();
      c.strokeStyle = 'rgba(120,100,60,0.35)'; c.lineWidth = 1;
      for (const [x, y] of KEYS) { c.beginPath(); c.moveTo(x, KEYS_Y + y); c.lineTo(x, KEYS_Y + y + 16); c.stroke(); }
      for (const [x, y] of KEYS) {
        c.strokeStyle = GOLD; c.lineWidth = 2;
        c.beginPath(); c.arc(x, KEYS_Y + y, 8, 0, Math.PI * 2); c.stroke();
        c.fillStyle = shade(GOLD, -0.15);
        c.beginPath(); c.arc(x, KEYS_Y + y, 3, 0, Math.PI * 2); c.fill();
      }
      // LCD cradle + zebra strip, solar leads
      c.fillStyle = '#2a2523';
      c.beginPath(); rrc(c, 0, LCD_Y, 156, 52, 5); c.fill();
      c.fillStyle = '#c9c2b8'; c.fillRect(-70, LCD_Y + 22, 140, 4);
      c.strokeStyle = '#d9a443'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(SOLAR.x - 30, SOLAR.y + 8); c.lineTo(SOLAR.x - 30, LCD_Y - 28); c.moveTo(SOLAR.x + 30, SOLAR.y + 8); c.lineTo(SOLAR.x + 30, LCD_Y - 28); c.stroke();
    } else {
      // inside, seen from the back: coin cradle, board posts
      c.strokeStyle = shade('#6b5a4e', 0.1); c.lineWidth = 2.5;
      c.beginPath(); c.arc(COIN.x, COIN.y, 22, 0, Math.PI * 2); c.stroke();
      for (const [x, y] of SCREWS) boss(c, x, y, '#6b5a4e');
      boss(c, 30, 40, '#6b5a4e');
    }
  },
};

const casePath = shapeFrom(rrPts(0, 0, 180, 280, 24), [rrPts(0, LCD_Y, 142, 40, 5), rrPts(SOLAR.x, SOLAR.y, 78, 16, 3), ...KEY_HOLES]);
const topCase: PartDef = {
  id: 'case', name: { en: 'Top Case', vi: 'Vỏ máy tính' }, side: 'F', z: 7, x: 0, y: 0, w: 180, h: 280, icon: '🧮',
  shape: casePath, needs: ['s1', 's2', 's3', 's4'], tool: 'sponge', elev: 28, thick: 8, round: 3,
  draw(c, s) {
    slab(c, casePath, CREAM, -140, 140, { depth: 6, shadow: 0 });
    glossStreak(c, casePath, -90, -140, 180, 200, 0.26);
    // chocolate face plate round the screen and solar strip
    const plate = shapeFrom(rrPts(0, -92, 164, 92, 14), [rrPts(0, LCD_Y, 142, 40, 5), rrPts(SOLAR.x, SOLAR.y, 78, 16, 3)]);
    c.fillStyle = CHOC; c.fill(plate);
    c.strokeStyle = shade(CHOC, 0.25); c.lineWidth = 1.5;
    c.beginPath(); rrc(c, 0, LCD_Y, 148, 46, 7); c.stroke();
    text(c, 'CHILL·CALC', -42, SOLAR.y, 11, '#f2c76b', { font: 'bold' });
    text(c, '8 DIGIT · SOLAR', 0, LCD_Y + 30, 6.5, shade(CREAM, -0.15), { font: 'bold' });
    // stripes like a 70s gadget
    for (const [col, y] of [[ORANGE, -40], [RED, -35]] as const) { c.fillStyle = col; c.fillRect(-82, y, 164, 3); }
    // little grip dimples down the sides
    c.fillStyle = shade(CREAM, -0.12);
    for (let i = 0; i < 6; i++) for (const x of [-85, 85]) { c.beginPath(); c.arc(x, 20 + i * 18, 1.8, 0, Math.PI * 2); c.fill(); }
    if (!s.inDevice) {
      // loose case: a clear window in the screen hole
      c.fillStyle = 'rgba(210,230,255,0.25)';
      c.beginPath(); rrc(c, 0, LCD_Y, 142, 40, 5); c.fill();
    }
  },
};

const lcdPath = rrPath(0, 0, 152, 48, 6);
const lcd: PartDef = {
  id: 'lcd', name: { en: 'LCD Window', vi: 'Màn hình' }, side: 'F', z: 5, x: 0, y: LCD_Y, w: 152, h: 48, icon: '🖥',
  shape: lcdPath, needs: ['case'], elev: 22, thick: 6, mat: 'glass', body: '#8b9097',
  draw(c, s) {
    const m = c.createLinearGradient(0, -24, 0, 24);
    m.addColorStop(0, '#d7dade'); m.addColorStop(1, '#8b9097');
    c.fillStyle = m; c.beginPath(); rrc(c, 0, 0, 152, 48, 6); c.fill();
    c.save(); c.translate(0, -1);
    lcdFace(c, 140, 38, s.power, s.time);
    c.restore();
    // the protective film, milky, with a lifted corner tab
    c.fillStyle = 'rgba(255,255,255,0.13)';
    c.beginPath(); rrc(c, 0, -1, 144, 42, 4); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.beginPath(); c.moveTo(72, -22); c.lineTo(72, -13); c.lineTo(63, -22); c.closePath(); c.fill();
    if (s.broken) {
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 0.8;
      for (const [x0, y0, x1, y1] of [[-64, -14, -10, 16], [-40, -18, 30, 8], [6, -16, 60, 14], [-20, 10, 50, -12], [-66, 6, -36, -16]]) {
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
      c.strokeStyle = 'rgba(255,255,255,0.45)';
      for (const [x, y, r] of [[-46, 8, 4], [20, -8, 3], [48, 10, 2.5]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); }
    }
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.beginPath(); c.moveTo(-70, -20); c.lineTo(-30, -20); c.lineTo(-56, 18); c.lineTo(-70, 18); c.closePath(); c.fill();
  },
};

const solarPath = rrPath(0, 0, 84, 20, 4);
const solar: PartDef = {
  id: 'solar', name: { en: 'Solar Cell', vi: 'Pin mặt trời' }, side: 'F', z: 5, x: SOLAR.x, y: SOLAR.y, w: 84, h: 20, icon: '☀️',
  shape: solarPath, needs: ['case'], elev: 22, thick: 5, mat: 'glass', body: '#3a2a30',
  draw(c, s) {
    c.fillStyle = '#c9c2b8'; c.beginPath(); rrc(c, 0, 0, 84, 20, 4); c.fill();
    // four amber-brown amorphous cells with silver fingers
    for (let i = 0; i < 4; i++) {
      const x = -30 + i * 20;
      const g = c.createLinearGradient(0, -8, 0, 8);
      g.addColorStop(0, '#7a4a52'); g.addColorStop(0.5, '#4a2a34'); g.addColorStop(1, '#2e1a22');
      c.fillStyle = g; c.beginPath(); rrc(c, x, 0, 18, 14, 1.5); c.fill();
      c.strokeStyle = 'rgba(220,200,210,0.35)'; c.lineWidth = 0.6;
      for (let k = -4; k <= 4; k += 4) { c.beginPath(); c.moveTo(x - 8, k); c.lineTo(x + 8, k); c.stroke(); }
    }
    if (s.power > 0) {
      // a little sun glint wandering across
      const gx = -36 + ((s.time * 30) % 72);
      c.fillStyle = `rgba(255,240,200,${0.45 * s.power})`;
      c.beginPath(); c.ellipse(gx, -2, 6, 3, -0.4, 0, Math.PI * 2); c.fill();
    }
    if (s.broken) {
      // a starburst crack across one cell
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 0.8;
      c.beginPath();
      for (const [dx, dy] of [[-8, -6], [7, -7], [9, 5], [-6, 7], [1, -8]]) { c.moveTo(10, 0); c.lineTo(10 + dx, dy); }
      c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(-40, -8, 80, 3);
  },
};

// The key tops are the mat's own face: it rises right up under the case so each key fills its hole.
const matPath = rrPath(0, 0, 168, 152, 14);
const keys: PartDef = {
  id: 'keys', name: { en: 'Rubber Key Mat', vi: 'Bàn phím cao su' }, side: 'F', z: 5, x: 0, y: KEYS_Y, w: 168, h: 152, icon: '🔢',
  shape: matPath, needs: ['case'], tool: 'brush', elev: 24, thick: 11, round: 3, mat: 'rubber', body: '#a69f92',
  draw(c, s) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -3, 5, 168, 152, 14); c.fill();
    c.fillStyle = '#c8c0b2'; c.beginPath(); rrc(c, 0, 0, 168, 152, 14); c.fill();
    KEYS.forEach(([x, y, l, col], i) => {
      c.fillStyle = shade(col, -0.35); c.beginPath(); rrc(c, x, y + 2, KEY_W, KEY_H, 7); c.fill();
      const g = c.createLinearGradient(0, y - KEY_H / 2, 0, y + KEY_H / 2);
      g.addColorStop(0, shade(col, 0.25)); g.addColorStop(1, col);
      c.fillStyle = g; c.beginPath(); rrc(c, x, y, KEY_W, KEY_H, 7); c.fill();
      const ink = col === KEY ? '#4a4038' : '#fff8ec';
      text(c, l, x, y + 1, l.length > 1 ? 10 : 14, ink, { font: 'bold' });
      if (s.broken && (i === 5 || i === 10 || i === 13)) {
        // a squashed, split dome
        c.fillStyle = 'rgba(60,40,30,0.25)'; c.beginPath(); rrc(c, x, y + 2, KEY_W - 6, KEY_H - 8, 5); c.fill();
        c.strokeStyle = '#6a5a4a'; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(x - 11, y - 5); c.lineTo(x - 2, y + 3); c.lineTo(x + 10, y - 6); c.stroke();
      }
    });
  },
};

// ---- back side, x mirrored (seen from behind) ----

const back: PartDef = {
  id: 'back', name: { en: 'Back Plate', vi: 'Nắp lưng' }, side: 'B', z: 6, x: 0, y: 0, w: 180, h: 280, icon: '🟫',
  shape: BODY, needs: ['s1', 's2', 's3', 's4'], tool: 'sponge', thick: 9, round: 8,
  bumps: [
    { kind: 'box', x: 0, y: -128, w: 90, h: 8, height: 3, color: '#3a3330' },
    { kind: 'box', x: 0, y: 128, w: 90, h: 8, height: 3, color: '#3a3330' },
  ],
  draw(c) {
    slab(c, BODY, CREAM_D, -140, 140, { depth: 8, shadow: 0 });
    glossStreak(c, BODY, -90, -140, 180, 200, 0.2);
    // rubber feet
    c.fillStyle = '#3a3330';
    for (const y of [-128, 128]) { c.beginPath(); rrc(c, 0, y, 90, 8, 4); c.fill(); }
    // silver sticker with the model + battery info
    c.fillStyle = '#d8d5cf'; c.beginPath(); rrc(c, 0, 10, 116, 70, 8); c.fill();
    c.strokeStyle = '#a9a39a'; c.lineWidth = 1; c.beginPath(); rrc(c, 0, 10, 110, 64, 6); c.stroke();
    text(c, 'CHILL·CALC', 0, -10, 13, CHOC, { font: 'bold' });
    text(c, 'MODEL CC-8', 0, 6, 8, '#6a6058', { font: 'bold' });
    text(c, 'SOLAR + CR2032', 0, 20, 8, '#6a6058', { font: 'bold' });
    text(c, '☀ ♥', 0, 34, 10, ORANGE, { font: 'bold' });
    // little coin-cell window
    c.strokeStyle = shade(CREAM, -0.3); c.lineWidth = 1.5;
    c.beginPath(); c.arc(COIN.x, COIN.y, 18, 0, Math.PI * 2); c.stroke();
    text(c, '+', COIN.x, COIN.y, 12, shade(CREAM, -0.35), { font: 'bold' });
  },
};

const coinPath = ellPath(0, 0, 20, 20);
const coin: PartDef = {
  id: 'coin', name: { en: 'Coin Battery', vi: 'Pin cúc áo' }, side: 'B', z: 5, x: COIN.x, y: COIN.y, w: 40, h: 40, icon: '🪙',
  shape: coinPath, needs: ['back'], thick: 6, round: 2, mat: 'metal', body: '#9aa1a8',
  draw(c, s) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); c.arc(-2, 4, 20, 0, Math.PI * 2); c.fill();
    const g = c.createRadialGradient(-7, -8, 2, 0, 0, 20);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#cfd4da'); g.addColorStop(1, '#8b9097');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 20, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#7d838b'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, 16, 0, Math.PI * 2); c.stroke();
    text(c, '+', 0, -7, 11, '#5a6068', { font: 'bold' });
    text(c, 'CR2032', 0, 5, 7, '#5a6068', { font: 'bold' });
    if (s.broken) {
      // crusty green-white corrosion on the rim
      c.fillStyle = 'rgba(150,200,150,0.85)';
      for (const [x, y, r] of [[12, 10, 5], [16, 2, 3.5], [6, 15, 3], [-14, 11, 3]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
    }
  },
};

const boardPath = rrPath(0, 0, 150, 168, 10);
const board: PartDef = {
  id: 'board', name: { en: 'Main Board', vi: 'Bo mạch' }, side: 'B', z: 4, x: 0, y: -2, w: 150, h: 168, icon: '🟩',
  shape: boardPath, needs: ['s5', 'coin'], thick: 4, mat: 'pcb', body: '#1d5c37',
  draw(c, s) {
    pcb(c, 150, 168, 404);
    // the calculator brain: a black epoxy blob over the chip
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(18, 22, 24, 20, 0, 0, Math.PI * 2); c.fill();
    const g = c.createRadialGradient(10, 10, 2, 16, 18, 24);
    g.addColorStop(0, '#4a4a52'); g.addColorStop(1, '#141418');
    c.fillStyle = g; c.beginPath(); c.ellipse(16, 18, 22, 18, 0, 0, Math.PI * 2); c.fill();
    // coin-cell clip pads + zebra pads at the screen edge
    c.fillStyle = GOLD;
    c.beginPath(); c.arc(COIN.x, COIN.y + 2, 6, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 18; i++) c.fillRect(-64 + i * 7.4, -78, 4, 6);
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
  w: 180, h: 280,
  hasBack: true,
  parts: [
    frame, topCase, lcd, solar, keys, back, coin, board,
    ...SCREWS.map(([x, y], i) => screw(`s${i + 1}`, x, y, 'B')),
    screw('s5', 30, 40, 'B', 5, ['back']),
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
      c.beginPath(); c.arc(SOLAR.x - 30 + i * 30, SOLAR.y - 14 - p * 30, 3 * (1 - p) + 1, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },
  workFx: { kind: 'spark', x: SOLAR.x, y: SOLAR.y - 20, color: '#ffe28a', dir: -Math.PI / 2 },
};
