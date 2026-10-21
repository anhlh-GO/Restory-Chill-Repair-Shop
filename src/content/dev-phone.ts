// Turn-of-the-century candy-bar phone: an oxblood wrap-around front cover with a
// keyhole for every key, a recessed grey-green LCD behind it, the rubber keymat
// poking through, and a matching back cover over the battery. Two faces.
// Inside: the shielded main board, the SIM latch, the antenna flex, the pager motor.

import { type C, shade, rrc, rrPath, rng, shapeFrom, roundedPts, rrPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, cylH, boss, ribbon } from './kit';

const WINE = '#8a2432';
const CHASSIS = '#3d4048';
const KEY = '#c9cdd6';
const LCD_OFF = '#9aa588';
const LCD_ON = '#b6e07c';
const GOLD = '#e2b54e';
const SANS = '"Helvetica Neue", Arial, sans-serif';

// a soft, gently waisted bar
function bodyPts(grow = 0) {
  return roundedPts([
    [-58 - grow, -145 - grow, 42], [58 + grow, -145 - grow, 42], [62 + grow, 10, 70],
    [60 + grow, 145 + grow, 36], [-60 - grow, 145 + grow, 36], [-62 - grow, 10, 70],
  ]);
}
const BODY = shapeFrom(bodyPts());
const BODY_IN = shapeFrom(bodyPts(-7));

const LCD = { x: 0, y: -60, w: 82, h: 60 };
const EAR = { x: 0, y: -124 };
// keymat grid (device coords): row 0 = C / Navi / rocker, then 1-9, *, 0, #
interface Key { x: number; y: number; w: number; h: number; l: string; sub: string }
const KEYS: Key[] = [];
const KP_Y = 66;
const SUBS = ['', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz', '+', '␣', '⇧'];
['C N^', '123', '456', '789', '*0#'].forEach((row, j) => {
  [...row.replace(' ', '')].forEach((l, i) => {
    const nav = j === 0 && i === 1;
    KEYS.push({ x: -30 + i * 30, y: KP_Y - 46 + j * 23, w: nav ? 26 : 22, h: j === 0 ? 14 : 15, l, sub: j > 0 ? SUBS[(j - 1) * 3 + i] : '' });
  });
});
const SCREWS: [number, number][] = [[-40, -84], [40, -84], [-46, 122], [46, 122]];

function label(c: C, s: string, x: number, y: number, size: number, color: string, weight = 700, align: CanvasTextAlign = 'center'): void {
  c.font = `${weight} ${size}px ${SANS}`;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillStyle = color;
  c.fillText(s, x, y);
}

/** Pearl-finish paint: a soft diagonal sheen and a faint metallic flake. */
function pearl(c: C, path: Path2D, col: string, seed: number): void {
  const g = c.createLinearGradient(-60, -145, 60, 145);
  g.addColorStop(0, shade(col, 0.3)); g.addColorStop(0.4, col); g.addColorStop(0.7, shade(col, 0.1)); g.addColorStop(1, shade(col, -0.2));
  c.fillStyle = g;
  c.fill(path);
  const r = rng(seed);
  c.save(); c.clip(path);
  for (let i = 0; i < 1400; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,20,0.12)';
    c.fillRect((r() - 0.5) * 128, (r() - 0.5) * 296, 0.7, 0.7);
  }
  c.restore();
}

// ---------------- chassis: the grey inner frame, both faces ----------------

const chassis: PartDef = {
  id: 'chassis', name: { en: 'Inner Chassis', vi: 'Khung máy' }, side: 'A', z: 0, x: 0, y: 0, w: 124, h: 290, icon: '📱',
  shape: BODY, needs: ['board', 'keypad', 'lcd', 'antenna'], thick: 12, cavity: 4, round: 6, wall: 6, body: '#2e3036',
  draw(c, s) {
    const g = c.createLinearGradient(0, -145, 0, 145);
    g.addColorStop(0, '#4a4e57'); g.addColorStop(1, '#33363d');
    c.fillStyle = g; c.fill(BODY);
    c.fillStyle = '#2e3036'; c.fill(BODY_IN);
    if (s.view === 'F' || !s.inDevice) {
      // the keypad side of the UI board: gold dome contacts under every key
      c.fillStyle = '#2b6f86'; c.beginPath(); rrc(c, 0, KP_Y, 106, 126, 10); c.fill();
      for (const k of KEYS) {
        c.strokeStyle = GOLD; c.lineWidth = 1.6;
        c.beginPath(); c.arc(k.x, k.y, 6, 0, Math.PI * 2); c.stroke();
        c.fillStyle = shade(GOLD, -0.15); c.beginPath(); c.arc(k.x, k.y, 2.4, 0, Math.PI * 2); c.fill();
      }
      // the LCD's elastomer connector strip and frame clips, the earpiece speaker
      c.fillStyle = '#23252a'; c.beginPath(); rrc(c, LCD.x, LCD.y, 92, 72, 5); c.fill();
      c.fillStyle = '#d8d3c2'; c.fillRect(-36, LCD.y + 34, 72, 4);
      c.fillStyle = '#9aa0a8'; for (const x of [-46, 46]) c.fillRect(x - 2, LCD.y - 20, 4, 14);
      const sg = c.createRadialGradient(EAR.x - 3, EAR.y - 3, 1, EAR.x, EAR.y, 10);
      sg.addColorStop(0, '#d9dde2'); sg.addColorStop(1, '#6b7178');
      c.fillStyle = sg; c.beginPath(); c.arc(EAR.x, EAR.y, 10, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1b1c20'; c.beginPath(); c.arc(EAR.x, EAR.y, 4, 0, Math.PI * 2); c.fill();
      // microphone at the bottom
      c.fillStyle = '#1b1c20'; c.beginPath(); c.arc(0, 134, 3.5, 0, Math.PI * 2); c.fill();
    } else {
      // the back: the battery well with its contact fingers, the screw posts
      c.fillStyle = '#25272c'; c.beginPath(); rrc(c, 0, 36, 100, 124, 8); c.fill();
      c.strokeStyle = '#4a4e57'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-50, -100); c.lineTo(50, -100); c.stroke();
      for (const [x, y] of SCREWS) boss(c, x, y, CHASSIS);
      label(c, 'CH-3 FRAME  MG', 0, -110, 4.4, '#7a7f88', 800);
    }
  },
};

// ---------------- front ----------------

const COVER_PATH = shapeFrom(bodyPts(1), [
  rrPts(LCD.x, LCD.y, LCD.w, LCD.h, 6),
  ...KEYS.map((k) => rrPts(k.x, k.y, k.w, k.h, k.h / 2 - 1)),
]);
const cover: PartDef = {
  id: 'cover', name: { en: 'Front Cover', vi: 'Vỏ mặt trước' }, side: 'F', z: 7, x: 0, y: 0, w: 126, h: 292, icon: '🟦',
  shape: COVER_PATH, tool: 'sponge', elev: 0, thick: 20, round: 6, body: '#5c1520',
  draw(c, s) {
    pearl(c, COVER_PATH, WINE, 3);
    // silver-grey screen surround, the earpiece slots, the brand
    c.fillStyle = '#9ba2ad'; c.beginPath(); rrc(c, LCD.x, LCD.y + 2, LCD.w + 18, LCD.h + 26, 12); c.fill();
    const sg = c.createLinearGradient(0, LCD.y - 45, 0, LCD.y + 45);
    sg.addColorStop(0, '#d9dde3'); sg.addColorStop(1, '#8d939d');
    c.fillStyle = sg; c.beginPath(); rrc(c, LCD.x, LCD.y + 2, LCD.w + 16, LCD.h + 24, 11); c.fill();
    c.fillStyle = '#1c2233'; c.beginPath(); rrc(c, LCD.x, LCD.y, LCD.w + 4, LCD.h + 4, 7); c.fill();
    label(c, 'CHILL', 0, LCD.y + 38, 7.5, '#2a3350', 900);
    c.fillStyle = '#33090f';
    for (let i = -2; i <= 2; i++) { c.beginPath(); rrc(c, EAR.x + i * 6, EAR.y, 3, 9, 1.5); c.fill(); }
    // the keys' wells: a dark gap round every hole
    c.fillStyle = '#33090f';
    for (const k of KEYS) { c.beginPath(); rrc(c, k.x, k.y, k.w + 2.4, k.h + 2.4, k.h / 2); c.fill(); }
    c.fillStyle = '#33090f'; c.beginPath(); c.arc(0, 134, 1.8, 0, Math.PI * 2); c.fill();
    // a little wear on the high spots
    c.fillStyle = 'rgba(255,255,255,0.12)';
    for (const [x, y, r] of [[-50, -128, 6], [52, 128, 7], [-56, 40, 5]] as const) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
    if (!s.inDevice) {
      // loose: the window's clear lens
      c.fillStyle = 'rgba(200,225,255,0.25)';
      c.beginPath(); rrc(c, LCD.x, LCD.y, LCD.w, LCD.h, 6); c.fill();
    }
  },
};

const KP = { w: 104, h: 124 };
const keypadPath = rrPath(0, 0, KP.w, KP.h, 14);
const keypad: PartDef = {
  id: 'keypad', name: { en: 'Rubber Keymat', vi: 'Bàn phím cao su' }, side: 'F', z: 5, x: 0, y: KP_Y, w: KP.w, h: KP.h, icon: '🔢',
  shape: keypadPath, needs: ['cover'], tool: 'brush', elev: 8, thick: 10.7, round: 1.5, mat: 'rubber', body: '#8f97a8',
  draw(c, s) {
    // translucent silicone web, the keys moulded on it with their printed legends
    c.fillStyle = '#9aa2b3'; c.fill(keypadPath);
    if (s.power > 0) {
      c.fillStyle = `rgba(150,255,140,${0.4 * s.power})`;
      for (const k of KEYS) { c.beginPath(); rrc(c, k.x, k.y - KP_Y, k.w + 6, k.h + 6, 8); c.fill(); }
    }
    KEYS.forEach((k, i) => {
      const y = k.y - KP_Y;
      const g = c.createLinearGradient(0, y - k.h / 2, 0, y + k.h / 2);
      const col = i === 1 ? '#b7c3dc' : KEY;
      g.addColorStop(0, shade(col, 0.35)); g.addColorStop(0.6, col); g.addColorStop(1, shade(col, -0.15));
      c.fillStyle = g; c.beginPath(); rrc(c, k.x, y, k.w + 1, k.h + 1, k.h / 2); c.fill();
      if (i === 0) label(c, 'C', k.x, y + 0.5, 7.5, '#2a3350', 900);
      else if (i === 1) {
        // the Navi key: one wide oval with a bar
        c.fillStyle = '#2a3350'; c.beginPath(); rrc(c, k.x, y, 12, 2.4, 1.2); c.fill();
      } else if (i === 2) {
        label(c, '▲', k.x, y - 3.2, 4.4, '#2a3350', 900);
        label(c, '▼', k.x, y + 3.6, 4.4, '#2a3350', 900);
      } else {
        label(c, k.l, k.x - (k.sub ? 4 : 0), y + 0.6, 8.5, '#1e2540', 900);
        if (k.sub) label(c, k.sub, k.x + 6, y + 1, 3.6, '#4a5470', 800);
      }
    });
    if (s.broken) {
      // worn-through keys: shiny flattened tops with a split
      c.strokeStyle = '#6a7690'; c.lineWidth = 1.2;
      for (const k of [KEYS[4], KEYS[8], KEYS[10]]) {
        const y = k.y - KP_Y;
        c.beginPath(); c.moveTo(k.x - 8, y - 3); c.lineTo(k.x - 1, y + 2); c.lineTo(k.x + 7, y - 4); c.stroke();
      }
    }
  },
};

const lcdPath = rrPath(0, 0, 92, 70, 5);
/** The display itself: reflective grey-green, the snake when it powers on. */
function lcdFace(c: C, w: number, h: number, power: number, t: number): void {
  const on = power > 0;
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, on ? shade(LCD_ON, 0.18) : shade(LCD_OFF, 0.1));
  g.addColorStop(1, on ? LCD_ON : shade(LCD_OFF, -0.18));
  c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, w, h, 2); c.fill();
  c.save(); c.beginPath(); rrc(c, 0, 0, w, h, 2); c.clip();
  c.fillStyle = 'rgba(40,60,30,0.06)';
  for (let x = -w / 2; x < w / 2; x += 2) c.fillRect(x, -h / 2, 0.5, h);
  for (let y = -h / 2; y < h / 2; y += 2) c.fillRect(-w / 2, y, w, 0.5);
  if (on) {
    c.globalAlpha = power;
    const ink = '#22381a';
    c.fillStyle = ink;
    for (let i = 0; i < 4; i++) c.fillRect(-w / 2 + 3, h / 2 - 6 - i * 6, 2 + i * 1.3, 3.5);
    for (let i = 0; i < 4; i++) c.fillRect(w / 2 - 5 - i * 1.3, h / 2 - 6 - i * 6, 2 + i * 1.3, 3.5);
    label(c, 'CHILL', 0, -h / 2 + 10, 9, ink, 900);
    const hh = Math.floor(t) % 60;
    label(c, `12:${String(hh).padStart(2, '0')}`, w / 2 - 4, -h / 2 + 6, 5, ink, 800, 'right');
    // the snake chasing a dot
    const hd = Math.floor(t * 5) % 24;
    for (let i = 0; i < 7; i++) c.fillRect(-24 + ((hd + i) % 24) * 2.2, 6, 2.2, 2.2);
    c.fillRect(14, 2, 2, 2);
    label(c, 'Menu', 0, h / 2 - 5, 5, ink, 800);
    c.globalAlpha = 1;
  }
  c.restore();
}

const lcd: PartDef = {
  id: 'lcd', name: { en: 'LCD Screen', vi: 'Màn hình LCD' }, side: 'F', z: 5, x: LCD.x, y: LCD.y, w: 92, h: 70, icon: '🖥',
  shape: lcdPath, needs: ['cover'], elev: 8, thick: 8, round: 1.5, mat: 'glass', body: '#8b9097',
  draw(c, s) {
    // steel frame with its clips, the glass, the display
    const m = c.createLinearGradient(0, -35, 0, 35);
    m.addColorStop(0, '#e2e5ea'); m.addColorStop(1, '#8b9097');
    c.fillStyle = m; c.fill(lcdPath);
    c.fillStyle = '#7d838b';
    for (const x of [-44, 44]) { c.beginPath(); rrc(c, x, -10, 4, 14, 1); c.fill(); }
    c.save(); c.translate(0, -1); lcdFace(c, 80, 58, s.power, s.time); c.restore();
    // the protective film with its blue pull-tab
    c.fillStyle = 'rgba(255,255,255,0.1)'; c.beginPath(); rrc(c, 0, -1, 84, 62, 3); c.fill();
    c.fillStyle = s.broken ? 'rgba(44,79,168,0.9)' : 'rgba(44,79,168,0.0)';
    c.beginPath(); c.moveTo(42, -32); c.lineTo(42, -22); c.lineTo(32, -32); c.closePath(); c.fill();
    if (s.broken) {
      // the scuffed old film: a milky haze, a web of scratches, trapped bubbles
      c.fillStyle = 'rgba(235,240,245,0.32)'; c.beginPath(); rrc(c, 0, -1, 84, 62, 3); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 0.7;
      const r = rng(19);
      for (let i = 0; i < 16; i++) {
        const x0 = (r() - 0.5) * 76, y0 = (r() - 0.5) * 54, a = r() * Math.PI, L = 8 + r() * 30;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(Math.max(-40, Math.min(40, x0 + Math.cos(a) * L)), Math.max(-29, Math.min(27, y0 + Math.sin(a) * L))); c.stroke();
      }
      c.strokeStyle = 'rgba(255,255,255,0.5)';
      for (const [x, y, rr] of [[-24, 14, 4], [22, -12, 3], [12, 18, 2.5], [-30, -18, 2]]) { c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.stroke(); }
    }
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath(); c.moveTo(-40, -30); c.lineTo(-12, -30); c.lineTo(-40, 6); c.closePath(); c.fill();
  },
};

// ---------------- back (as seen from behind: x mirrored) ----------------

const BCOVER = shapeFrom(bodyPts(1));
const backCover: PartDef = {
  id: 'bcover', name: { en: 'Back Cover', vi: 'Nắp lưng' }, side: 'B', z: 8, x: 0, y: 0, w: 126, h: 292, icon: '🟦',
  shape: BCOVER, tool: 'sponge', elev: 0, thick: 24, round: 10, body: '#5c1520',
  bumps: [{ kind: 'box', x: 0, y: 136, w: 30, h: 8, height: 1.6, color: '#4a1019' }],
  draw(c) {
    pearl(c, BCOVER, shade(WINE, -0.04), 7);
    // the battery door's seam, the loudspeaker grille, the release catch at the bottom
    c.strokeStyle = 'rgba(10,15,35,0.6)'; c.lineWidth = 1;
    c.beginPath(); rrc(c, 0, 40, 104, 196, 18); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.12)';
    c.beginPath(); rrc(c, 0, 40.8, 104, 196, 18); c.stroke();
    c.fillStyle = '#33090f';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) {
      c.beginPath(); c.arc(-14 + j * 7, -116 + i * 6, 1.5, 0, Math.PI * 2); c.fill();
    }
    label(c, 'CHILL', 0, -20, 15, 'rgba(255,255,255,0.22)', 900);
    c.font = `italic 700 5px ${SANS}`; c.fillStyle = 'rgba(255,255,255,0.25)'; c.textAlign = 'center';
    c.fillText('Connecting People, Chilly', 0, -8);
    c.fillStyle = '#4a1019'; c.beginPath(); rrc(c, 0, 136, 32, 9, 4.5); c.fill();
    c.strokeStyle = '#2a060b'; c.lineWidth = 0.8;
    for (let x = -12; x <= 12; x += 3) { c.beginPath(); c.moveTo(x, 133); c.lineTo(x, 139); c.stroke(); }
  },
};

const batPath = rrPath(0, 0, 96, 118, 8);
const battery: PartDef = {
  id: 'battery', name: { en: 'Battery', vi: 'Pin' }, side: 'B', z: 6, x: 0, y: 40, w: 96, h: 118, icon: '🔋',
  shape: batPath, needs: ['bcover'], elev: 10, thick: 9, round: 3, body: '#2c3038',
  draw(c, s) {
    const g = c.createLinearGradient(0, -59, 0, 59);
    g.addColorStop(0, '#4a4f5a'); g.addColorStop(1, '#2c3038');
    c.fillStyle = g; c.fill(batPath);
    // silver label with the ratings, a hologram, the recycling marks
    c.fillStyle = '#d9dce1'; c.beginPath(); rrc(c, 0, 6, 84, 92, 4); c.fill();
    c.fillStyle = WINE; c.fillRect(-42, -40, 84, 12);
    label(c, 'CHILL  BLC-2', 0, -34, 7, '#ffffff', 900);
    label(c, 'Li-ion  3.6V', -36, -16, 7, '#23262c', 900, 'left');
    label(c, '1000 mAh', -36, -6, 6, '#23262c', 800, 'left');
    label(c, 'Use only with approved charger.', -36, 6, 3.8, '#4a4e57', 700, 'left');
    label(c, 'Do not short-circuit or dispose', -36, 12, 3.8, '#4a4e57', 700, 'left');
    label(c, 'of in fire. Made in Chill Corner.', -36, 18, 3.8, '#4a4e57', 700, 'left');
    const hg = c.createLinearGradient(16, 30, 36, 46);
    hg.addColorStop(0, '#c9e8ff'); hg.addColorStop(0.3, '#ffd2f0'); hg.addColorStop(0.6, '#d9ffcf'); hg.addColorStop(1, '#bfc9ff');
    c.fillStyle = hg; c.beginPath(); rrc(c, 26, 38, 20, 14, 2); c.fill();
    c.strokeStyle = '#4a4e57'; c.lineWidth = 0.8;
    c.beginPath(); c.arc(-28, 40, 5, 0, Math.PI * 2); c.stroke();
    label(c, 'Li', -28, 40, 4, '#4a4e57', 800);
    // gold contacts on the top end
    for (const x of [-12, 0, 12]) {
      const cg = c.createLinearGradient(0, -58, 0, -50);
      cg.addColorStop(0, shade(GOLD, -0.3)); cg.addColorStop(0.4, shade(GOLD, 0.5)); cg.addColorStop(1, shade(GOLD, -0.3));
      c.fillStyle = cg; c.beginPath(); rrc(c, x, -53, 7, 8, 1.5); c.fill();
    }
    if (s.broken) {
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.beginPath(); c.ellipse(0, 6, 34, 26, 0, 0, Math.PI * 2); c.fill();
    }
  },
};

const sim: PartDef = {
  id: 'sim', name: { en: 'SIM Holder', vi: 'Khay SIM' }, side: 'B', z: 5, x: 0, y: 30, w: 50, h: 38, icon: '💳',
  shape: rrPath(0, 0, 50, 38, 4), needs: ['battery'], elev: 10, thick: 3, round: 1, mat: 'metal', body: '#9aa1a8',
  draw(c) {
    // stainless latch frame, the SIM card with its clipped corner and gold contacts
    const g = c.createLinearGradient(0, -19, 0, 19);
    g.addColorStop(0, '#eef0f3'); g.addColorStop(1, '#9aa1a8');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 50, 38, 4); c.fill();
    c.fillStyle = '#f2f2ee';
    c.beginPath(); c.moveTo(-20, -13); c.lineTo(14, -13); c.lineTo(20, -7); c.lineTo(20, 13); c.lineTo(-20, 13); c.closePath(); c.fill();
    c.fillStyle = '#e2493b'; c.fillRect(-20, -13, 8, 26);
    label(c, 'CHILLTEL', 4, -7, 4, '#e2493b', 900);
    c.fillStyle = GOLD; c.beginPath(); rrc(c, 2, 4, 14, 11, 2); c.fill();
    c.strokeStyle = shade(GOLD, -0.35); c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(-5, 4); c.lineTo(9, 4); c.moveTo(2, -1.5); c.lineTo(2, 9.5); c.stroke();
    c.fillStyle = '#7d838b';
    for (const y of [-17, 17]) c.fillRect(-22, y - 1, 44, 2);
    label(c, 'OPEN ▸', 14, 16.6, 3, '#4a4e57', 800);
  },
};

const board: PartDef = {
  id: 'board', name: { en: 'Main Board', vi: 'Bo mạch chính' }, side: 'B', z: 4, x: 0, y: 0, w: 100, h: 230, icon: '🟩',
  shape: rrPath(0, 0, 100, 230, 12), needs: ['s1', 's2', 's3', 's4', 'sim', 'vibra'], elev: 8, thick: 2, mat: 'pcb', body: '#1d4a5c',
  bumps: [
    { kind: 'box', x: 0, y: -66, w: 64, h: 40, height: 3, color: '#cfd4db', metal: true },
    { kind: 'box', x: -28, y: 92, w: 18, h: 9, height: 4, color: '#1b1c20' },
    { kind: 'cyl', x: 30, y: 96, w: 8, height: 5, color: '#1f2a6a' },
  ],
  draw(c, s) {
    pcb(c, 100, 230, 77, '#2b6f86');
    // RF shield can over the radio, the battery fingers, the charger socket
    c.fillStyle = '#cfd4db'; c.beginPath(); rrc(c, 0, -66, 64, 40, 3); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { c.beginPath(); c.arc(-24 + i * 12, -76 + j * 10, 1.4, 0, Math.PI * 2); c.fill(); }
    label(c, 'RF  900/1800', 0, -48, 4.4, '#2a2d33', 800);
    for (const x of [-12, 0, 12]) { c.fillStyle = GOLD; c.fillRect(x - 3, -22, 6, 8); }
    c.fillStyle = '#1b1c20'; c.beginPath(); rrc(c, -28, 92, 18, 9, 1.5); c.fill();
    label(c, 'CHILL  CH-3  MAIN', 0, 74, 4.4, '#eef0e6', 800);
    ribbon(c, 0, 108, 30, 10);
    if (s.broken) {
      const g = c.createRadialGradient(-20, 40, 1, -20, 40, 22);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(-20, 40, 22, 0, Math.PI * 2); c.fill();
    }
  },
};

const antPath = rrPath(0, 0, 96, 32, 10);
const antenna: PartDef = {
  id: 'antenna', name: { en: 'Antenna', vi: 'Ăng-ten' }, side: 'B', z: 5, x: 0, y: -116, w: 96, h: 32, icon: '📶',
  shape: antPath, needs: ['bcover'], elev: 10, thick: 7, round: 3, body: '#23252b',
  draw(c, s) {
    // black carrier with the copper flex radiator and its two spring pins
    c.fillStyle = '#2b2d33'; c.fill(antPath);
    c.strokeStyle = s.broken ? '#8a7440' : '#d9894a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-40, 8);
    for (let i = 0; i <= 8; i++) { const x = -36 + i * 9; c.lineTo(x, i % 2 ? -8 : 8); }
    c.lineTo(40, -8); c.stroke();
    c.strokeStyle = 'rgba(255,230,190,0.5)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(-40, 7);
    for (let i = 0; i <= 8; i++) { const x = -36 + i * 9; c.lineTo(x, i % 2 ? -9 : 7); }
    c.stroke();
    for (const x of [-42, 42]) {
      c.fillStyle = GOLD; c.beginPath(); c.arc(x, 0, 3.4, 0, Math.PI * 2); c.fill();
      c.fillStyle = shade(GOLD, -0.4); c.beginPath(); c.arc(x, 0, 1.4, 0, Math.PI * 2); c.fill();
    }
  },
};

const vibra: PartDef = {
  id: 'vibra', name: { en: 'Vibration Motor', vi: 'Mô-tơ rung' }, side: 'B', z: 5, x: 30, y: -24, w: 34, h: 16, icon: '📳',
  shape: rrPath(0, 0, 34, 16, 7.5), needs: ['bcover'], elev: 10, thick: 9, round: 7.5, mat: 'metal', body: '#8b9097',
  draw(c, s) {
    c.save(); c.translate(-3, 0);
    cylH(c, 24, 15, '#c9ced6', '#d9b25a');
    c.restore();
    // brass eccentric weight on the shaft
    c.save(); c.translate(12, 0); c.rotate(s.power > 0 ? s.time * 30 : 0.5);
    c.fillStyle = '#c99a3a'; c.beginPath(); c.arc(0, 0, 6, Math.PI, 0); c.closePath(); c.fill();
    c.restore();
  },
};

export const phone: DeviceDef = {
  id: 'phone',
  name: { en: 'Candy-Bar Phone', vi: 'Điện thoại cục gạch' },
  w: 128, h: 294,
  hasBack: true,
  parts: [
    chassis, cover, keypad, lcd, backCover, battery, sim, board, antenna, vibra,
    ...SCREWS.map(([x, y], i) => screw(`s${i + 1}`, x, y, 'B', 7, ['bcover'])),
  ],
  working(c, t, k) {
    c.save();
    c.globalAlpha = k * (0.5 + Math.sin(t * 5) * 0.15);
    const g = c.createRadialGradient(LCD.x, LCD.y, 8, LCD.x, LCD.y, 90);
    g.addColorStop(0, 'rgba(190,255,130,0.55)'); g.addColorStop(1, 'rgba(190,255,130,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(LCD.x, LCD.y, 90, 0, Math.PI * 2); c.fill();
    c.restore();
  },
  workFx: { kind: 'note', x: 0, y: -136, color: '#b8e07a', dir: -Math.PI / 2 },
};
