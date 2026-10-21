// 2000s TV remote: a long, softly tapered graphite stick in soft-touch plastic,
// a champagne-metal navigation ring, warm grey rubber keys with their legends
// printed on the case, a red power key and a glossy IR lens capping the nose.
// Two faces: behind, a slide-off battery door over two AA cells; inside, the
// board with its carbon key pads and IR LED, and the silicone key mat.

import { type C, shade, rrc, rrPath, rng, shapeFrom, roundedPts, rrPts } from '../core/draw';
import { type DeviceDef, type PartDef, type Bump, screw } from './device';
import { cylH, boss } from './kit';

const GRAPHITE = '#34353a';
const KEY = '#bdb8b0';
const CHAMP = '#cdb68a';
const RED = '#d9412f';
const INK = '#e9e4da';
const SILICONE = '#8f889c';
const SANS = '"Helvetica Neue", Arial, sans-serif';

// a gently tapered stick: a little wider at the top end
function stickPts(inset = 0) {
  return roundedPts([
    [-52 + inset, -150 + inset, 34], [52 - inset, -150 + inset, 34],
    [46 - inset, 150 - inset, 26], [-46 + inset, 150 - inset, 26],
  ]);
}
const BODY = shapeFrom(stickPts());
const BODY_IN = shapeFrom(stickPts(7));

// ---------------- painting helpers ----------------

function label(c: C, s: string, x: number, y: number, size: number, color: string, weight = 700, align: CanvasTextAlign = 'center'): void {
  c.font = `${weight} ${size}px ${SANS}`;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillStyle = color;
  c.fillText(s, x, y);
}

/** Soft-touch plastic: a faint speckle over a soft vertical sheen. */
function softTouch(c: C, path: Path2D, col: string, seed: number, w: number, h: number): void {
  const g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  g.addColorStop(0, shade(col, 0.16)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.12));
  c.fillStyle = g;
  c.fill(path);
  const r = rng(seed);
  c.save(); c.clip(path);
  for (let i = 0; i < (w * h) / 9; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.05)';
    c.fillRect((r() - 0.5) * w, (r() - 0.5) * h, 0.8, 0.8);
  }
  c.restore();
}

// ---------------- front layout ----------------

const RING = { x: 0, y: -56 };
const POWER = { x: 30, y: -124 };
const LED = { x: 0, y: -132 };
const SMALL: [number, number, string][] = [[-30, -124, 'TV/AV'], [-30, -100, 'MENU'], [0, -100, 'INFO'], [30, -100, 'BACK']];
const ROCK: [number, string][] = [[-34, 'VOL'], [34, 'CH']];
const ROCK_Y = -4;
const COLOURS = ['#d9412f', '#3fa65a', '#e8b93a', '#3a78c9'];
const COL_Y = 26;
const NUM: [number, number, string][] = [];
['123', '456', '789', '-0⏎'].forEach((row, j) => [...row].forEach((l, i) => NUM.push([-30 + i * 30, 50 + j * 22, l])));

const KEY_BUMPS: Bump[] = [
  { kind: 'cyl', x: POWER.x, y: POWER.y, w: 17, height: 4.5, color: RED, view: 'F' },
  ...SMALL.map(([x, y]) => ({ kind: 'box' as const, x, y, w: 20, h: 9, height: 3, color: KEY, view: 'F' as const })),
  { kind: 'cyl', x: RING.x, y: RING.y, w: 62, height: 2.6, color: CHAMP, metal: true, view: 'F' },
  ...[[0, -24], [0, 24], [-24, 0], [24, 0]].map(([dx, dy]) => ({ kind: 'box' as const, x: RING.x + dx, y: RING.y + dy, w: 5, h: 5, height: 3.2, color: '#6d5a38', view: 'F' as const })),
  { kind: 'cyl', x: RING.x, y: RING.y, w: 26, height: 4.6, color: KEY, view: 'F' },
  ...ROCK.map(([x]) => ({ kind: 'box' as const, x, y: ROCK_Y, w: 17, h: 38, height: 4.2, color: KEY, view: 'F' as const })),
  ...COLOURS.map((color, i) => ({ kind: 'box' as const, x: -33 + i * 22, y: COL_Y, w: 17, h: 7, height: 2.6, color, view: 'F' as const })),
  ...NUM.map(([x, y]) => ({ kind: 'box' as const, x, y, w: 21, h: 12, height: 3.6, color: KEY, view: 'F' as const })),
];

const SCREWS: [number, number][] = [[-30, -128], [30, -128]];

const top: PartDef = {
  id: 'top', name: { en: 'Front Case', vi: 'Vỏ trước' }, side: 'A', z: 0, x: 0, y: 0, w: 104, h: 300, icon: '📺',
  shape: BODY, needs: ['membrane', 'window'], tool: 'sponge', thick: 18, cavity: 9, round: 12, wall: 7, body: '#2a2b2f',
  bumps: KEY_BUMPS,
  draw(c, s) {
    softTouch(c, BODY, GRAPHITE, 5, 104, 300);
    if (s.view === 'F' || !s.inDevice) {
      // a thin champagne bevel round the face, a satin plate behind the navigation keys
      c.strokeStyle = shade(CHAMP, -0.1); c.lineWidth = 1.2;
      c.stroke(BODY_IN);
      c.fillStyle = '#2a2b30';
      c.beginPath(); rrc(c, 0, -60, 92, 116, 30); c.fill();
      // key wells
      c.fillStyle = '#1d1e22';
      c.beginPath(); c.arc(RING.x, RING.y, 34, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(POWER.x, POWER.y, 10.5, 0, Math.PI * 2); c.fill();
      for (const b of KEY_BUMPS) if (b.kind === 'box' && b.h && b.w > 6) { c.beginPath(); rrc(c, b.x, b.y, b.w + 3, b.h + 3, 3); c.fill(); }
      // champagne ring face (under the ring key) and its arrows
      c.fillStyle = CHAMP; c.beginPath(); c.arc(RING.x, RING.y, 31, 0, Math.PI * 2); c.fill();
      // legends
      label(c, 'POWER', POWER.x, POWER.y + 12, 4.4, INK, 800);
      for (const [x, y, l] of SMALL) label(c, l, x, y - 8.5, 4.4, INK, 800);
      for (const [x, l] of ROCK) {
        label(c, '+', x + (x < 0 ? -14 : 14), ROCK_Y - 13, 7, INK, 800);
        label(c, '−', x + (x < 0 ? -14 : 14), ROCK_Y + 13, 7, INK, 800);
        label(c, l, x + (x < 0 ? 18 : -18), ROCK_Y, 5, INK, 800);
      }
      label(c, 'MUTE', 0, ROCK_Y - 10, 4.2, '#9a968e', 800);
      c.fillStyle = '#9a968e'; c.beginPath(); c.arc(0, ROCK_Y - 2, 1.6, 0, Math.PI * 2); c.fill();
      for (const [x, y, l] of NUM) label(c, l, x, y - 9.5, 5.4, INK, 800);
      // the send LED next to the nose
      const on = s.power > 0 && Math.sin(s.time * 14) > 0;
      if (on) {
        const g = c.createRadialGradient(LED.x, LED.y, 0.5, LED.x, LED.y, 7);
        g.addColorStop(0, 'rgba(255,90,60,0.8)'); g.addColorStop(1, 'rgba(255,90,60,0)');
        c.fillStyle = g; c.beginPath(); c.arc(LED.x, LED.y, 7, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = on ? '#ff5a3a' : '#5a2220'; c.beginPath(); c.arc(LED.x, LED.y, 2, 0, Math.PI * 2); c.fill();
      // brand, and the gloss of thumbs on the soft touch
      c.font = `italic 900 13px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = CHAMP; c.fillText('CHILL', 0, 137);
      label(c, 'RC-CH1', 0, 146, 3.6, '#8a8780', 700);
      const g = c.createRadialGradient(0, 30, 2, 0, 30, 40);
      g.addColorStop(0, 'rgba(255,255,255,0.07)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 30, 40, 0, Math.PI * 2); c.fill();
    } else {
      // inside of the front case, seen from the back: key holes mirrored, ribs, screw posts
      c.fillStyle = '#26272b';
      c.fill(BODY_IN);
      c.save(); c.clip(BODY_IN);
      c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 10; c.translate(3, 5); c.stroke(BODY_IN);
      c.restore();
      c.fillStyle = '#0e0e10';
      for (const b of KEY_BUMPS) {
        if (b.w < 6) continue;
        c.beginPath();
        if (b.kind === 'cyl') c.arc(-b.x, b.y, b.w / 2 + 1, 0, Math.PI * 2);
        else rrc(c, -b.x, b.y, b.w + 2, (b.h ?? b.w) + 2, 3);
        c.fill();
      }
      c.strokeStyle = '#3a3b40'; c.lineWidth = 2.5;
      for (const y of [-82, 12, 40]) { c.beginPath(); c.moveTo(-40, y); c.lineTo(40, y); c.stroke(); }
      for (const [x, y] of SCREWS) boss(c, x, y, GRAPHITE);
      boss(c, 0, 92, GRAPHITE);
    }
  },
};

// the IR lens: a glossy dark-red cap over the nose
const winPath = rrPath(0, 0, 64, 18, 8);
const irWindow: PartDef = {
  id: 'window', name: { en: 'IR Lens', vi: 'Mắt hồng ngoại' }, side: 'F', z: 6, x: 0, y: -150, w: 64, h: 18, icon: '🔴',
  shape: winPath, elev: -20, thick: 34, round: 9, mat: 'glass', body: '#3a0d14',
  draw(c, s) {
    const g = c.createLinearGradient(0, -9, 0, 9);
    g.addColorStop(0, '#7a2230'); g.addColorStop(0.5, '#3e0f17'); g.addColorStop(1, '#22070c');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 64, 18, 8); c.fill();
    // the LED glowing behind the smoked lens when it sends
    if (s.power > 0) {
      c.fillStyle = `rgba(255,90,80,${0.35 + 0.35 * Math.sin(s.time * 14)})`;
      c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2); c.fill();
    } else {
      c.fillStyle = 'rgba(255,120,110,0.18)'; c.beginPath(); c.arc(0, 1, 4, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.beginPath(); rrc(c, -8, -4.5, 40, 2.6, 1.3); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath(); rrc(c, 14, 4, 18, 1.6, 0.8); c.fill();
  },
};

// ---------------- back (as seen from behind: x mirrored) ----------------

const BAY = { x: 0, y: 62, w: 66, h: 110 };
const backPath = shapeFrom(stickPts(), [rrPts(BAY.x, BAY.y, BAY.w, BAY.h, 8)]);
const back: PartDef = {
  id: 'back', name: { en: 'Back Case', vi: 'Vỏ sau' }, side: 'B', z: 5, x: 0, y: 0, w: 104, h: 300, icon: '🟫',
  shape: backPath, needs: ['r1', 'r2', 'r3', 'door'], elev: 17, thick: 12, round: 11, body: '#2a2b2f',
  draw(c) {
    softTouch(c, backPath, shade(GRAPHITE, -0.03), 9, 104, 300);
    // grip ribs under the index finger, the screw counterbores at the top end
    c.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      c.strokeStyle = '#1f2024'; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(-26, -78 + i * 8); c.lineTo(26, -78 + i * 8); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(-26, -76.6 + i * 8); c.lineTo(26, -76.6 + i * 8); c.stroke();
    }
    for (const [x, y] of SCREWS) { c.fillStyle = '#1b1c1f'; c.beginPath(); c.arc(x, y, 8.5, 0, Math.PI * 2); c.fill(); }
    // rating label
    c.fillStyle = '#d9d5cc'; c.beginPath(); rrc(c, 0, -14, 70, 26, 2); c.fill();
    label(c, 'CHILL  RC-CH1', -31, -21, 4.4, '#2a2b2f', 800, 'left');
    label(c, '3V ⎓  (AA × 2)', -31, -14, 3.8, '#2a2b2f', 700, 'left');
    label(c, 'MADE IN CHILL CORNER', -31, -7.5, 3.6, '#2a2b2f', 700, 'left');
    const r = rng(41);
    c.fillStyle = '#222';
    for (let x = 14; x < 32; x += 1.1) if (r() < 0.6) c.fillRect(x, -24, r() < 0.3 ? 0.9 : 0.5, 13);
    // the bay's lip
    c.strokeStyle = '#18191c'; c.lineWidth = 2; c.beginPath(); rrc(c, BAY.x, BAY.y, BAY.w + 2, BAY.h + 2, 9); c.stroke();
  },
};

const doorPath = rrPath(0, 0, BAY.w + 4, BAY.h + 4, 9);
const door: PartDef = {
  id: 'door', name: { en: 'Battery Door', vi: 'Nắp pin' }, side: 'B', z: 7, x: BAY.x, y: BAY.y, w: BAY.w + 4, h: BAY.h + 4, icon: '▭',
  shape: doorPath, tool: 'sponge', elev: 25, thick: 4.5, round: 3, body: '#2a2b2f',
  draw(c) {
    softTouch(c, doorPath, shade(GRAPHITE, 0.03), 13, BAY.w + 4, BAY.h + 4);
    c.strokeStyle = '#17181b'; c.lineWidth = 1; c.stroke(doorPath);
    // ribbed thumb grip and the slide arrow at the latch end
    c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      c.strokeStyle = '#1b1c20'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-14, -44 + i * 5); c.lineTo(14, -44 + i * 5); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(-14, -42.8 + i * 5); c.lineTo(14, -42.8 + i * 5); c.stroke();
    }
    c.fillStyle = '#8a8780';
    c.beginPath(); c.moveTo(0, -12); c.lineTo(-6, -19); c.lineTo(6, -19); c.closePath(); c.fill();
    label(c, 'OPEN', 0, -5, 5, '#8a8780', 800);
    // polarity moulding
    c.strokeStyle = '#4a4b50'; c.lineWidth = 0.8;
    c.beginPath(); rrc(c, -14, 26, 18, 44, 8); c.stroke();
    c.beginPath(); rrc(c, 14, 26, 18, 44, 8); c.stroke();
    label(c, '+', -14, 10, 6, '#6a6b70', 800); label(c, '−', -14, 42, 6, '#6a6b70', 800);
    label(c, '−', 14, 10, 6, '#6a6b70', 800); label(c, '+', 14, 42, 6, '#6a6b70', 800);
  },
};

// inside: the cells lie on the board, the spring bracket at the bottom end
const batPath = rrPath(0, 0, 26, 96, 12);
function aa(id: string, x: number, brand: 'chill' | 'volta', up: boolean): PartDef {
  return {
    id, name: { en: 'AA Battery', vi: 'Pin AA' }, side: 'B', z: 6, x, y: BAY.y - 4, w: 26, h: 96, icon: '🔋',
    shape: batPath, needs: ['door'], elev: 12.5, thick: 13, round: 12, body: brand === 'chill' ? '#1d1f24' : '#5a6878',
    draw(c) {
      c.save();
      c.rotate(up ? -Math.PI / 2 : Math.PI / 2);
      if (brand === 'chill') {
        cylH(c, 94, 26, '#26282e', '#cfd3d8');
        c.fillStyle = '#c9772e'; c.fillRect(14, -13, 28, 26);
        c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(14, -10, 28, 4);
        label(c, 'CHILL', -12, 0.5, 7, '#f2efe8', 900);
      } else {
        cylH(c, 94, 26, '#a9b4c0', '#cfd3d8');
        c.fillStyle = '#2f5fa8'; c.fillRect(-30, -13, 44, 26);
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-30, -10, 44, 4);
        label(c, 'VOLTA', -8, 0.5, 6.5, '#ffffff', 900);
        label(c, 'LR6 1.5V', 30, 0.5, 4, '#2a3340', 800);
      }
      c.fillStyle = '#d6dade'; c.beginPath(); rrc(c, 49, 0, 4, 9, 1.5); c.fill();
      c.restore();
      label(c, '+', 0, up ? -40 : 40, 9, brand === 'chill' ? '#e8e4da' : '#2a2a2a', 900);
    },
  };
}

const SPRING_Y = BAY.y + 52;
const springPath = rrPath(0, 0, 64, 14, 4);
const springs: PartDef = {
  id: 'springs', name: { en: 'Battery Contacts', vi: 'Lò xo tiếp điểm pin' }, side: 'B', z: 4, x: 0, y: SPRING_Y, w: 64, h: 14, icon: '🌀',
  shape: springPath, needs: ['batA', 'batB'], elev: 12.5, thick: 7, round: 2, mat: 'metal', body: '#2a2b2f',
  draw(c, s) {
    // black plastic bracket with a nickel bridge plate and two conical springs
    c.fillStyle = '#222326'; c.fill(springPath);
    const g = c.createLinearGradient(0, -7, 0, 7);
    g.addColorStop(0, s.broken ? '#a99a78' : '#f0f2f5'); g.addColorStop(1, s.broken ? '#6c5f44' : '#9aa1a8');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 2, 56, 6, 2); c.fill();
    for (const x of [-14, 14]) {
      for (let i = 0; i < 4; i++) {
        c.strokeStyle = s.broken ? (i % 2 ? '#8a6a3a' : '#7a8a5a') : i % 2 ? '#c9ced5' : '#f4f6f9';
        c.lineWidth = 1.4;
        c.beginPath(); c.ellipse(x, -1 + i * 1.2, 9 - i * 1.8, 3.4 - i * 0.4, 0, 0, Math.PI * 2); c.stroke();
      }
    }
    // leads up to the board
    c.lineWidth = 1.6; c.lineCap = 'round';
    c.strokeStyle = '#d33a2c'; c.beginPath(); c.moveTo(-30, 0); c.lineTo(-30, -6); c.stroke();
    c.strokeStyle = '#141416'; c.beginPath(); c.moveTo(30, 0); c.lineTo(30, -6); c.stroke();
    if (s.broken) {
      // leaked electrolyte: green-white crust on the springs, a brown rust bloom on the plate
      const r = rng(7);
      for (let i = 0; i < 26; i++) {
        c.fillStyle = r() < 0.5 ? 'rgba(170,215,160,0.9)' : 'rgba(240,245,235,0.9)';
        c.beginPath(); c.arc(14 + (r() - 0.5) * 18, (r() - 0.5) * 9, 0.8 + r() * 1.6, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = 'rgba(120,70,30,0.55)'; c.beginPath(); c.ellipse(-6, 3, 9, 3, 0, 0, Math.PI * 2); c.fill();
    }
  },
};

// the board runs the whole length: IR LED at the nose, carbon pad pairs under every key
const boardPath = shapeFrom(stickPts(9));
const board: PartDef = {
  id: 'board', name: { en: 'Main Board', vi: 'Bo mạch chính' }, side: 'B', z: 3, x: 0, y: 0, w: 86, h: 282, icon: '🟩',
  shape: boardPath, needs: ['back', 'springs'], elev: 10.5, thick: 2, mat: 'pcb', body: '#1d4a3c',
  bumps: [
    { kind: 'cyl', x: 0, y: -136, w: 7, height: 6, color: '#cfd8ea' },
    { kind: 'box', x: 8, y: -104, w: 22, h: 12, height: 2.2, color: '#1b1c20' },
    { kind: 'box', x: -24, y: -104, w: 9, h: 4, height: 3.2, color: '#2c6fd0' },
    { kind: 'cyl', x: -26, y: -78, w: 7, height: 6, color: '#1f2a6a' },
  ],
  draw(c, s) {
    const g = c.createLinearGradient(0, -141, 0, 141);
    g.addColorStop(0, '#2d7a58'); g.addColorStop(1, '#246a4a');
    c.fillStyle = g; c.fill(boardPath);
    c.save(); c.clip(boardPath);
    // traces from every pad back to the chip
    c.strokeStyle = '#3f9a70'; c.lineWidth = 0.8;
    for (const b of KEY_BUMPS) {
      if (b.w < 6) continue;
      c.beginPath(); c.moveTo(-b.x, b.y); c.lineTo(-b.x * 0.5, b.y - 8); c.lineTo(8 + b.x * 0.1, -98); c.stroke();
    }
    // carbon / gold interleaved pads under each key (mirrored)
    for (const b of KEY_BUMPS) {
      if (b.w < 6) continue;
      const x = -b.x, y = b.y, r = Math.min(7, b.w / 2.6);
      c.fillStyle = '#1b1b1d'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#d9b25a'; c.lineWidth = 0.7;
      for (let k = -r + 1.5; k < r; k += 2) { c.beginPath(); c.moveTo(x - r * 0.7, y + k); c.lineTo(x + r * 0.7, y + k); c.stroke(); }
    }
    // the IR LED's legs, the chip, the resonator, a cap
    c.strokeStyle = '#c9ccd2'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-2, -134); c.lineTo(-2, -126); c.moveTo(2, -134); c.lineTo(2, -126); c.stroke();
    c.fillStyle = '#b9bec6';
    for (let k = -9; k <= 9; k += 2.4) { c.fillRect(8 + k, -111, 1, 2); c.fillRect(8 + k, -98, 1, 2); }
    c.fillStyle = '#1b1c20'; c.beginPath(); rrc(c, 8, -104, 22, 12, 1); c.fill();
    label(c, 'CH-IR8', 8, -104, 3.6, '#8a8f99', 800);
    label(c, 'RC-CH1  REV.B', 0, -86, 3.8, '#eef0e6', 800);
    // battery plus tabs at the top end of the bay
    c.fillStyle = '#d9b25a'; c.fillRect(-20, 4, 12, 5); c.fillRect(8, 4, 12, 5);
    if (s.broken) {
      const bg = c.createRadialGradient(0, 112, 1, 0, 112, 18);
      bg.addColorStop(0, 'rgba(120,150,90,0.7)'); bg.addColorStop(1, 'rgba(120,150,90,0)');
      c.fillStyle = bg; c.beginPath(); c.arc(0, 112, 18, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },
};

const memPath = shapeFrom(stickPts(10));
const membrane: PartDef = {
  id: 'membrane', name: { en: 'Silicone Key Mat', vi: 'Màng phím silicon' }, side: 'B', z: 2, x: 0, y: 0, w: 84, h: 280, icon: '🫧',
  shape: memPath, needs: ['board'], elev: 8, thick: 2.5, mat: 'rubber', body: '#8c8698',
  bumps: KEY_BUMPS.filter((b) => b.w >= 6 && b.w < 40).flatMap((b) => [
    { kind: b.kind === 'cyl' ? 'cyl' as const : 'box' as const, x: -b.x, y: b.y, w: b.w - 2, h: b.h ? b.h - 2 : undefined, height: 1.6, color: '#b5afc0' },
    { kind: 'cyl' as const, x: -b.x, y: b.y, w: Math.min(7, b.w / 2.4), height: 2.6, color: '#1b1b1f' },
  ]),
  draw(c) {
    // translucent mauve silicone with a soft sheen
    const g = c.createLinearGradient(-40, -140, 40, 140);
    g.addColorStop(0, shade(SILICONE, 0.2)); g.addColorStop(1, shade(SILICONE, -0.12));
    c.fillStyle = g; c.fill(memPath);
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); rrc(c, -28, 0, 6, 240, 3); c.fill();
    for (const b of KEY_BUMPS) {
      if (b.w < 6 || b.w >= 40) continue;
      c.fillStyle = 'rgba(70,60,90,0.25)';
      c.beginPath(); rrc(c, -b.x, b.y + 1, b.w + 2, (b.h ?? b.w) + 2, 4); c.fill();
    }
    // the nav ring is one web in the mat
    c.strokeStyle = 'rgba(70,60,90,0.35)'; c.lineWidth = 3;
    c.beginPath(); c.arc(-RING.x, RING.y, 27, 0, Math.PI * 2); c.stroke();
  },
};

export const remote: DeviceDef = {
  id: 'remote',
  name: { en: 'TV Remote', vi: 'Điều khiển TV' },
  w: 108, h: 318,
  hasBack: true,
  parts: [
    top, irWindow, back, door, aa('batA', -14, 'chill', true), aa('batB', 14, 'volta', false), springs, board, membrane,
    ...SCREWS.map(([x, y], i) => screw(`r${i + 1}`, x, y, 'B')),
    // the sneaky one hiding between the batteries
    { ...screw('r3', 0, BAY.y + 10, 'B', 6, ['batA', 'batB']), elev: 12.5 },
  ],
  working(c, t, k) {
    c.save();
    // IR pulses fanning out of the nose
    for (let i = 0; i < 3; i++) {
      const p = (t * 1.6 + i / 3) % 1;
      c.globalAlpha = k * (1 - p) * 0.7;
      c.strokeStyle = '#ff6a5a'; c.lineWidth = 3;
      c.beginPath(); c.arc(0, -158, 14 + p * 60, -Math.PI * 0.8, -Math.PI * 0.2); c.stroke();
    }
    c.restore();
  },
  workFx: { kind: 'spark', x: 0, y: -166, color: '#ff8a7a', dir: -Math.PI / 2 },
};
