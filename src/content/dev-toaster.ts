// Classic diner two-slot toaster seen from above, the way it stands on the
// counter: a brushed stainless body with two chrome-lipped slots, rounded
// pastel-pink enamel end panels, a wind-up browning timer on the top of the
// right end, and the black bakelite carriage lever sticking out of the right
// panel. The crumb tray's tab peeks out at the bottom of the front.

import { type C, shade, rrc, rrPath, ellPath, rng, shapeFrom, roundedPts, rrPts, type Pts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, coil, boss } from './kit';

const PINK = '#eba3b0';
const STEEL = '#c3c8ce';
const BAKELITE = '#1c1a1b';
const CREAM = '#f6ecd8';
const TOAST = '#d9a25e';
const SANS = '"Helvetica Neue", Arial, sans-serif';

// stainless body 236 × 156; the enamel end panels close it at x = ±116…144
const BW = 236, BH = 156;
const SLOT_X = -22, SLOT_W = 168, SLOT_H = 24;
const SLOTS = [-26, 26];
const PANEL_X = 94;
const DIAL = { x: PANEL_X, y: 16 };
const STOP = { x: PANEL_X, y: -44 };
const CAP_X = 130, CAP_W = 28, CAP_H = 168;
const CAP_SCREWS: [number, number][] = [[-CAP_X, -56], [-CAP_X, 56], [CAP_X, -56], [CAP_X, 56]];
// the body's rounded underside (belly) hangs this far under the floor: the end panels reach down to it
const BELLY = 25;
const TOP = 94;

// ---------------- painting helpers ----------------

function font(c: C, size: number, weight = 700, family = SANS): void {
  c.font = `${weight} ${size}px ${family}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
}

/** Brushed stainless: soft lengthwise banding plus fine hairlines along x. */
function brushed(c: C, x: number, y: number, w: number, h: number, seed: number, base = STEEL): void {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(base, 0.45)); g.addColorStop(0.18, shade(base, -0.08)); g.addColorStop(0.42, shade(base, 0.3));
  g.addColorStop(0.7, base); g.addColorStop(0.88, shade(base, -0.15)); g.addColorStop(1, shade(base, 0.35));
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
  const r = rng(seed);
  c.lineWidth = 0.4;
  for (let i = 0; i < h * 2.6; i++) {
    const yy = y + r() * h;
    c.strokeStyle = r() < 0.55 ? `rgba(255,255,255,${0.18 + r() * 0.3})` : `rgba(60,66,76,${0.06 + r() * 0.12})`;
    const x0 = x + r() * w * 0.7;
    c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 + w * (0.15 + r() * 0.5), yy); c.stroke();
  }
}

/** Glossy stove enamel with a faint orange-peel speckle. */
function enamel(c: C, path: Path2D, x: number, y: number, w: number, h: number, seed: number): void {
  const g = c.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, shade(PINK, 0.25)); g.addColorStop(0.5, PINK); g.addColorStop(1, shade(PINK, -0.12));
  c.fillStyle = g;
  c.fill(path);
  c.save(); c.clip(path);
  const r = rng(seed);
  for (let i = 0; i < (w * h) / 7; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(120,40,60,0.05)' : 'rgba(255,255,255,0.08)';
    c.beginPath(); c.arc(x + r() * w, y + r() * h, 0.6 + r() * 0.8, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

/** Heat tint: the straw / blue temper colours stainless takes on round a hot slot. */
function heatTint(c: C, x: number, y: number, w: number, h: number): void {
  const g = c.createRadialGradient(x, y, 2, x, y, w / 2);
  g.addColorStop(0, 'rgba(196,150,70,0.26)'); g.addColorStop(0.55, 'rgba(120,110,170,0.14)'); g.addColorStop(1, 'rgba(120,110,170,0)');
  c.save();
  c.translate(x, y); c.scale(1, h / w); c.translate(-x, -y);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, w / 2, 0, Math.PI * 2); c.fill();
  c.restore();
}

// ---------------- chassis: the stainless tub ----------------

const BOX = rrPath(0, 0, BW, BH, 8);
const BOX_IN = rrPath(0, 0, BW - 10, BH - 10, 5);

const chassis: PartDef = {
  id: 'chassis', name: { en: 'Chassis', vi: 'Khung thân' }, side: 'A', z: 0, x: 0, y: 0, w: BW, h: BH, icon: '🍞',
  shape: BOX, needs: ['tray', 'timer'], thick: 84, cavity: 74, round: 4, wall: 5, mat: 'metal', body: '#959ca5',
  draw(c) {
    c.save(); c.clip(BOX);
    brushed(c, -BW / 2, -BH / 2, BW, BH, 3);
    c.restore();
    // inside: the floor pan, pressed ribs, a mica heat shield and the wiring run to the timer
    c.fillStyle = '#8d939b'; c.fill(BOX_IN);
    c.save(); c.clip(BOX_IN);
    c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(BOX_IN);
    c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 2;
    for (const y of [-40, 0, 40]) { c.beginPath(); c.moveTo(-108, y); c.lineTo(74, y); c.stroke(); }
    c.fillStyle = 'rgba(196,170,120,0.55)'; c.beginPath(); rrc(c, SLOT_X, 0, 176, 120, 6); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 0.6;
    for (let i = 0; i < 14; i++) { c.beginPath(); c.moveTo(-108 + i * 12, -58); c.lineTo(-100 + i * 12, 58); c.stroke(); }
    c.lineCap = 'round';
    for (const [col, dy] of [['#2b2b2e', -4], ['#c33a2c', 4]] as const) {
      c.strokeStyle = col; c.lineWidth = 3;
      c.beginPath(); c.moveTo(70, -50 + dy); c.quadraticCurveTo(80, 0, 76, 50 + dy); c.stroke();
    }
    boss(c, PANEL_X, -58, '#9aa0a8');
  },
};

// ---------------- crumb tray: slides out of the front, its tab peeking out ----------------

const TRAY_C = { x: SLOT_X, y: 4 };
const TRAY = shapeFrom(roundedPts([
  [-90, -60, 5], [90, -60, 5], [90, 62, 5], [26, 62, 2], [26, 92, 6], [-26, 92, 6], [-26, 62, 2], [-90, 62, 5],
]));
const tray: PartDef = {
  id: 'tray', name: { en: 'Crumb Tray', vi: 'Khay vụn bánh' }, side: 'A', z: 2, x: TRAY_C.x, y: TRAY_C.y, w: 180, h: 152, icon: '🥖',
  shape: TRAY, needs: ['element'], tool: 'brush', elev: 10, thick: 3, round: 1.5, mat: 'metal', body: '#9aa0a8',
  draw(c, s) {
    c.save(); c.clip(TRAY);
    brushed(c, -92, -62, 184, 156, 41, '#d0d4d9');
    c.restore();
    // folded-up lip all round the pan
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 1.4; c.beginPath(); rrc(c, 0, 1, 174, 116, 4); c.stroke();
    c.strokeStyle = 'rgba(70,76,86,0.45)'; c.lineWidth = 1.2; c.beginPath(); rrc(c, 0, 0, 170, 112, 4); c.stroke();
    // black bakelite pull tab with a finger groove
    c.fillStyle = BAKELITE; c.beginPath(); rrc(c, 0, 80, 48, 22, 5); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(-20, 71, 40, 1.2);
    c.fillStyle = '#060606'; c.beginPath(); rrc(c, 0, 84, 26, 4, 2); c.fill();
    font(c, 4, 700); c.fillStyle = '#8a8a8a'; c.fillText('CRUMBS', 0, 77);
    // a few crumbs always live here
    const r = rng(7);
    for (let i = 0; i < 14; i++) {
      c.fillStyle = r() < 0.5 ? '#c48a4a' : '#9a6430';
      c.beginPath(); c.ellipse(-80 + r() * 160, -50 + r() * 100, 1 + r() * 1.4, 0.8 + r(), r() * 3, 0, Math.PI * 2); c.fill();
    }
    if (s.broken) {
      // a burnt drift of crumbs and a charred crust packed under the slots
      for (let i = 0; i < 110; i++) {
        const x = -84 + r() * 168, y = -52 + r() * 104;
        c.fillStyle = r() < 0.35 ? '#3a2312' : r() < 0.6 ? '#7a4a22' : '#b8783a';
        c.beginPath(); c.ellipse(x, y, 1.6 + r() * 3, 1.2 + r() * 2, r() * 3, 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = '#4a2c14'; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(20, 24); c.quadraticCurveTo(46, 8, 66, 26); c.stroke();
      c.strokeStyle = '#8a5a2c'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(22, 22); c.quadraticCurveTo(46, 8, 64, 23); c.stroke();
    }
  },
};

// ---------------- the element cage: mica cards wound with nichrome, chrome bread guards ----------------

const ELEM_W = 184, ELEM_H = 120;
const ELEM = rrPath(0, 0, ELEM_W, ELEM_H, 6);
const element: PartDef = {
  id: 'element', name: { en: 'Heating Elements', vi: 'Thanh nhiệt' }, side: 'A', z: 3, x: SLOT_X, y: 0, w: ELEM_W, h: ELEM_H, icon: '🔥',
  shape: ELEM, needs: ['shell'], elev: 13, thick: 62, round: 3, mat: 'metal', body: '#8b9097',
  draw(c, s) {
    // the cage's top frame: zinc-plated steel with rivets
    c.save(); c.clip(ELEM);
    brushed(c, -ELEM_W / 2, -ELEM_H / 2, ELEM_W, ELEM_H, 23, '#b6bbc2');
    c.restore();
    c.fillStyle = '#7d838b';
    for (const x of [-86, 86]) for (const y of [-52, 0, 52]) { c.beginPath(); c.arc(x, y, 2.4, 0, Math.PI * 2); c.fill(); }
    const hot = s.power > 0;
    for (const y of SLOTS) {
      // the dark well of the slot
      c.fillStyle = '#1b1517'; c.beginPath(); rrc(c, 0, y, SLOT_W + 4, SLOT_H + 10, 6); c.fill();
      // mica cards down both walls, wound with flat nichrome ribbon
      for (const side of [-1, 1]) {
        const wy = y + side * 10;
        const mg = c.createLinearGradient(0, wy - 3, 0, wy + 3);
        mg.addColorStop(0, '#d9c49a'); mg.addColorStop(1, '#a88e5e');
        c.fillStyle = mg; c.fillRect(-SLOT_W / 2, wy - 3, SLOT_W, 6);
        c.strokeStyle = hot ? `rgb(255,${130 + 50 * Math.sin(s.time * 5)},60)` : '#d8d0c4';
        c.lineWidth = hot ? 1.6 : 1.2;
        c.beginPath();
        for (let x = -SLOT_W / 2 + 2; x <= SLOT_W / 2 - 2; x += 4) {
          if (s.broken && y > 0 && side > 0 && x > 8 && x < 26) { c.stroke(); c.beginPath(); continue; }
          c.moveTo(x, wy - 3); c.lineTo(x + 2, wy + 3);
        }
        c.stroke();
      }
      if (hot) {
        c.fillStyle = `rgba(255,110,30,${0.35 * s.power})`;
        c.beginPath(); rrc(c, 0, y, SLOT_W, SLOT_H + 6, 6); c.fill();
      }
      // chrome bread-guard wires and the carriage rack at the bottom of the slot
      c.strokeStyle = '#e8ebee'; c.lineWidth = 1.1;
      for (let x = -SLOT_W / 2 + 10; x < SLOT_W / 2; x += 22) {
        c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x, y + 6); c.stroke();
      }
      c.strokeStyle = 'rgba(200,204,210,0.6)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(-SLOT_W / 2 + 4, y); c.lineTo(SLOT_W / 2 - 4, y); c.stroke();
    }
    // terminal posts and the leads to the timer end
    for (const [y, col] of [[-48, '#c33a2c'], [48, '#2b2b2e']] as const) {
      c.fillStyle = '#e8c15a'; c.beginPath(); c.arc(84, y, 4, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#9a7a2a'; c.beginPath(); c.arc(84, y, 1.6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = col; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(86, y); c.lineTo(92, y * 0.8); c.stroke();
    }
    font(c, 4.2, 700); c.fillStyle = '#5d636b'; c.fillText('230V ~ 900W  ·  MICA', -20, 0);
    if (s.broken) {
      // snapped ribbon curling up off the mica, soot round the break
      const sg = c.createRadialGradient(18, 36, 1, 18, 36, 18);
      sg.addColorStop(0, 'rgba(20,12,8,0.85)'); sg.addColorStop(1, 'rgba(20,12,8,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(18, 36, 18, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#d8d0c4'; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(8, 37); c.quadraticCurveTo(12, 46, 18, 42); c.moveTo(28, 37); c.quadraticCurveTo(26, 28, 20, 30); c.stroke();
    }
  },
};

// ---------------- timer board under the dial: clockwork can + hold-down magnet ----------------

const TIMER = { x: PANEL_X, y: 0 };
const timerPath = rrPath(0, 0, 32, 130, 5);
const timer: PartDef = {
  id: 'timer', name: { en: 'Timer Board', vi: 'Bo hẹn giờ' }, side: 'A', z: 3, x: TIMER.x, y: TIMER.y, w: 32, h: 130, icon: '🟩',
  shape: timerPath, needs: ['t5'], elev: 10, thick: 4, mat: 'pcb', body: '#1d5c37',
  bumps: [
    { kind: 'cyl', x: 0, y: DIAL.y, w: 26, height: 14, color: '#c9ced6', metal: true },
    { kind: 'box', x: 0, y: -28, w: 20, h: 22, height: 12, color: '#b8783a' },
  ],
  draw(c, s) {
    pcb(c, 32, 130, 64);
    // clockwork can under the dial, its spindle; the copper hold-down electromagnet
    c.fillStyle = '#c9ced6'; c.beginPath(); c.arc(0, DIAL.y, 13, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7a8088'; c.beginPath(); c.arc(0, DIAL.y, 3, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(0, -28); coil(c, 20, 22); c.restore();
    font(c, 3.5, 700); c.fillStyle = '#e8eef8'; c.fillText('TMR-6', 0, 46);
    if (s.broken) {
      const g = c.createRadialGradient(2, 2, 1, 2, 2, 14);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(2, 2, 14, 0, Math.PI * 2); c.fill();
    }
  },
};

// ---------------- top plate: brushed stainless, two slot holes, the timer panel ----------------

const SHELL_PTS = rrPts(0, 0, BW, BH, 8);
const SHELL = shapeFrom(SHELL_PTS, SLOTS.map((y) => rrPts(SLOT_X, y, SLOT_W, SLOT_H, 9)));
const shell: PartDef = {
  id: 'shell', name: { en: 'Top Plate', vi: 'Nắp trên' }, side: 'A', z: 6, x: 0, y: 0, w: BW, h: BH, icon: '🍞',
  shape: SHELL, needs: ['capL', 'capR', 'knob'], tool: 'sponge', thick: 10, round: 7, mat: 'metal', body: '#aab0b8',
  bumps: [
    { kind: 'cyl', x: STOP.x, y: STOP.y, w: 13, height: 3.5, color: '#d8dce1', metal: true },
    { kind: 'cyl', x: PANEL_X - 16, y: STOP.y + 20, w: 5, height: 1.6, color: '#6fd0b8' },
  ],
  draw(c, s) {
    const outer = shapeFrom(SHELL_PTS);
    c.save(); c.clip(outer);
    brushed(c, -BW / 2, -BH / 2, BW, BH, 5);
    // years on the counter: straw-and-blue heat tint round the slots, a greasy thumbprint by the dial
    for (const y of SLOTS) heatTint(c, SLOT_X, y, SLOT_W + 40, SLOT_H + 40);
    const fp = c.createRadialGradient(60, 40, 1, 60, 40, 10);
    fp.addColorStop(0, 'rgba(120,110,100,0.16)'); fp.addColorStop(1, 'rgba(120,110,100,0)');
    c.fillStyle = fp; c.beginPath(); c.arc(60, 40, 10, 0, Math.PI * 2); c.fill();
    c.restore();
    // rolled chrome lips round the slots
    for (const y of SLOTS) {
      c.lineWidth = 5;
      const lg = c.createLinearGradient(0, y - 18, 0, y + 18);
      lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.45, '#8e949c'); lg.addColorStop(0.55, '#f4f6f8'); lg.addColorStop(1, '#7c828a');
      c.strokeStyle = lg;
      c.beginPath(); rrc(c, SLOT_X, y, SLOT_W + 5, SLOT_H + 5, 11); c.stroke();
      c.strokeStyle = 'rgba(30,32,36,0.5)'; c.lineWidth = 0.8;
      c.beginPath(); rrc(c, SLOT_X, y, SLOT_W + 8.5, SLOT_H + 8.5, 13); c.stroke();
    }
    // stamped maker's mark between the slots
    font(c, 10, 800, 'Georgia, "Times New Roman", serif');
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillText('Chill', SLOT_X - 20, 0.6);
    c.fillStyle = '#4c525a'; c.fillText('Chill', SLOT_X - 20, 0);
    font(c, 4.6, 700); c.fillStyle = '#5d636b'; c.fillText('DINER  2-SLICE', SLOT_X + 24, 0.4);
    // black bakelite control panel: browning scale round the dial, STOP and the bagel lamp
    c.fillStyle = BAKELITE; c.beginPath(); rrc(c, PANEL_X, -6, 34, 136, 8); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 0.8; c.beginPath(); rrc(c, PANEL_X, -6, 31, 133, 7); c.stroke();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * 0.75 + (i / 5) * Math.PI * 1.5;
      font(c, 5, 700); c.fillStyle = CREAM;
      c.fillText(String(i + 1), DIAL.x + Math.cos(a) * 18.5, DIAL.y + Math.sin(a) * 18.5);
    }
    c.strokeStyle = 'rgba(246,236,216,0.55)'; c.lineWidth = 0.7;
    c.beginPath(); c.arc(DIAL.x, DIAL.y, 15, Math.PI * 0.75, Math.PI * 2.25); c.stroke();
    font(c, 3.6, 700); c.fillStyle = '#c9c0ad';
    c.fillText('BROWNING', DIAL.x, DIAL.y + 27);
    c.fillText('STOP', STOP.x, STOP.y - 11);
    c.fillText('BAGEL', PANEL_X + 5, STOP.y + 20);
    c.fillStyle = '#d8dce1'; c.beginPath(); c.arc(STOP.x, STOP.y, 7.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = s.power > 0 ? `rgba(150,255,210,${0.6 + 0.4 * Math.sin(s.time * 5)})` : '#2f5a50';
    c.beginPath(); c.arc(PANEL_X - 16, STOP.y + 20, 2.8, 0, Math.PI * 2); c.fill();
    // the edges where the end panels clamp over the plate
    c.fillStyle = 'rgba(40,44,50,0.35)';
    c.fillRect(-BW / 2, -BH / 2, 3, BH); c.fillRect(BW / 2 - 3, -BH / 2, 3, BH);
  },
};

// ---------------- enamel end panels ----------------

function capPts(sx: number): Pts {
  // the inner edge is nearly square (it butts the body), the outer one generously round
  const i = -sx * CAP_W / 2, o = sx * CAP_W / 2;
  const v: [number, number, number][] = [[i, -CAP_H / 2, 3], [o, -CAP_H / 2, 13], [o, CAP_H / 2, 13], [i, CAP_H / 2, 3]];
  return roundedPts(sx > 0 ? v : v.reverse());
}

function cap(id: string, sx: number, en: string, vi: string): PartDef {
  const path = shapeFrom(capPts(sx));
  const screws = sx < 0 ? ['t1', 't2'] : ['t3', 't4'];
  return {
    id, name: { en, vi }, side: 'A', z: 7, x: sx * CAP_X, y: 0, w: CAP_W, h: CAP_H, icon: '🩷',
    shape: path, needs: sx > 0 ? [...screws, 'lever'] : screws, elev: -BELLY, thick: TOP + BELLY + 3, round: 9, body: shade(PINK, -0.12),
    draw(c) {
      enamel(c, path, -CAP_W / 2, -CAP_H / 2, CAP_W, CAP_H, sx > 0 ? 61 : 62);
      // a long soft highlight down the curve, a chrome trim strip where it meets the body
      const hl = c.createLinearGradient(-sx * 6, 0, sx * 6, 0);
      hl.addColorStop(0, 'rgba(255,255,255,0)'); hl.addColorStop(0.5, 'rgba(255,255,255,0.45)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = hl; c.fillRect(-4 + sx * 2, -CAP_H / 2 + 14, 6, CAP_H - 28);
      const tg = c.createLinearGradient(0, -CAP_H / 2, 0, CAP_H / 2);
      tg.addColorStop(0, '#f8f9fa'); tg.addColorStop(0.5, '#9aa0a8'); tg.addColorStop(1, '#eef0f2');
      c.fillStyle = tg; c.fillRect(-sx * CAP_W / 2 - (sx > 0 ? 0 : 3), -CAP_H / 2 + 2, 3, CAP_H - 4);
      // the little enamel badge on the left, the lever slot on the right
      if (sx < 0) {
        c.save(); c.rotate(-Math.PI / 2);
        font(c, 7, 800, 'Georgia, "Times New Roman", serif');
        c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillText('Chill', 0, 2.5);
        c.fillStyle = '#a8455a'; c.fillText('Chill', 0, 2);
        c.restore();
      } else {
        c.fillStyle = '#3a2a2e'; c.beginPath(); rrc(c, 9, -26, 5, 46, 2.5); c.fill();
      }
      // wear: a chip of enamel at a corner showing the dark steel
      const [cx, cy] = sx < 0 ? [-8, 78] : [7, -79];
      c.fillStyle = '#5d4a50'; c.beginPath(); c.ellipse(cx, cy, 2.4, 1.4, 0.4, 0, Math.PI * 2); c.fill();
    },
  };
}

const capL = cap('capL', -1, 'Left End Panel', 'Ốp đầu trái');
const capR = cap('capR', 1, 'Right End Panel', 'Ốp đầu phải');

// ---------------- browning knob on top, carriage lever out of the right end ----------------

const KNOB_P = ellPath(0, 0, 12, 12);
const knob: PartDef = {
  id: 'knob', name: { en: 'Browning Knob', vi: 'Núm chỉnh độ nướng' }, side: 'A', z: 8, x: DIAL.x, y: DIAL.y, w: 24, h: 24, icon: '🔘',
  shape: KNOB_P, thick: 9, round: 3, mat: 'metal', body: '#9aa0a8',
  bumps: [{ kind: 'box', x: 0, y: 0, w: 4.5, h: 20, height: 5, color: '#e7eaee', metal: true }],
  draw(c, s) {
    // fluted chrome skirt round a domed cap
    const g = c.createRadialGradient(-4, -5, 1, 0, 0, 12);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#c9ced6'); g.addColorStop(1, '#7d838b');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 12, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      c.strokeStyle = i % 2 ? 'rgba(255,255,255,0.6)' : 'rgba(60,66,76,0.5)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(Math.cos(a) * 9.5, Math.sin(a) * 9.5); c.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); c.stroke();
    }
    // the pointer turns back to zero as the timer runs
    c.save();
    c.rotate(s.power > 0 ? 0.4 - (s.time * 0.3) % 1.2 : 0.4);
    c.fillStyle = '#c33a2c'; c.beginPath(); rrc(c, 0, -8, 2.2, 6, 1); c.fill();
    c.restore();
  },
};

const LEVER = { x: 156, y: -8 };
const LEVER_P = shapeFrom(roundedPts([
  [-12, -3.5, 1], [-2, -3.5, 0], [-2, -11, 5], [18, -11, 8], [18, 11, 8], [-2, 11, 5], [-2, 3.5, 0], [-12, 3.5, 1],
]));
const lever: PartDef = {
  id: 'lever', name: { en: 'Carriage Lever', vi: 'Cần gạt' }, side: 'A', z: 8, x: LEVER.x, y: LEVER.y, w: 30, h: 22, icon: '🎚',
  shape: LEVER_P, elev: 46, thick: 20, round: 9, body: '#141314',
  draw(c, s) {
    // chrome stem out of the slot, black bakelite paddle with grip ribs
    const sg = c.createLinearGradient(0, -3.5, 0, 3.5);
    sg.addColorStop(0, '#f4f6f8'); sg.addColorStop(0.5, '#8a9098'); sg.addColorStop(1, '#dfe2e6');
    c.fillStyle = sg; c.fillRect(-13, -3.5, 12, 7);
    const g = c.createLinearGradient(0, -11, 0, 11);
    g.addColorStop(0, '#5a5658'); g.addColorStop(0.35, '#242223'); g.addColorStop(1, '#0c0b0c');
    c.fillStyle = g; c.beginPath(); rrc(c, 8, 0, 21, 22, 8); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 0.8;
    for (let x = 2; x <= 14; x += 3) { c.beginPath(); c.moveTo(x, -7); c.lineTo(x, 7); c.stroke(); }
    if (s.power > 0) {
      // latched down: a warm glint on the bakelite
      c.fillStyle = 'rgba(255,170,80,0.3)'; c.beginPath(); rrc(c, 8, 0, 21, 22, 8); c.fill();
    }
  },
};

export const toaster: DeviceDef = {
  id: 'toaster',
  name: { en: 'Diner Toaster', vi: 'Máy nướng bánh mì' },
  w: 348, h: 196,
  hasBack: false,
  parts: [
    element, chassis, tray, timer, shell, capL, capR, knob, lever,
    ...CAP_SCREWS.map(([x, y], i) => screw(`t${i + 1}`, x, y, 'A')),
    { ...screw('t5', PANEL_X, -58, 'A', 4, ['shell']), elev: 14 },
  ],
  working(c, t, k) {
    c.save();
    const ph = (t * 0.35) % 1;
    for (const y of SLOTS) {
      if (ph < 0.6) {
        // orange glow breathing out of the slots
        c.globalAlpha = k * (0.55 + 0.25 * Math.sin(t * 6));
        const g = c.createRadialGradient(SLOT_X, y, 4, SLOT_X, y, 100);
        g.addColorStop(0, 'rgba(255,150,60,0.9)'); g.addColorStop(1, 'rgba(255,120,40,0)');
        c.fillStyle = g;
        c.beginPath(); c.ellipse(SLOT_X, y, 96, 20, 0, 0, Math.PI * 2); c.fill();
      } else {
        // pop! two golden slices rise out of the slots
        const up = Math.min(1, (ph - 0.6) / 0.12);
        c.globalAlpha = k;
        c.save();
        c.translate(SLOT_X, y - up * 6);
        c.scale(1 + up * 0.05, 1);
        c.fillStyle = shade(TOAST, -0.35); c.beginPath(); rrc(c, 0, 0, SLOT_W - 24, 16, 6); c.fill();
        c.fillStyle = TOAST; c.beginPath(); rrc(c, 0, -1, SLOT_W - 34, 10, 4); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); rrc(c, -20, -3, 90, 2.5, 1.2); c.fill();
        c.restore();
      }
    }
    c.restore();
  },
  workFx: { kind: 'steam', x: SLOT_X, y: 0, color: '#fff3e0', dir: -Math.PI / 2 },
};
