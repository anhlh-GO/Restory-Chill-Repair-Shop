// Early-80s cassette walkman lying on its back, door up: blue anodised
// aluminium body, a brushed-silver door with a smoked window onto the tape,
// piano keys standing out of the top edge and a knurled volume wheel out of
// the right side. Two faces: a belt clip and the label behind; inside, the
// drive motor, the belt and brass flywheel, the head-amp board and two AA cells.

import { type C, shade, rrc, rrPath, rng, shapeFrom, roundedPts, FONT_HAND } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, boss, cylH, ribbon } from './kit';

const BLUE = '#2f5f93';
const ALU = '#cdd1d6';
const ORANGE = '#f0782e';
const SANS = '"Helvetica Neue", Arial, sans-serif';

const BW = 200, BH = 280;
const BODY = rrPath(0, 0, BW, BH, 20);
const BODY_IN = rrPath(0, 0, 182, 262, 13);

// the tape sits in the upper half of the front well, the door's window over it
const TAPE = { x: 0, y: -46 };
const REEL = 31;

// ---------------- painting helpers ----------------

function font(c: C, size: number, weight = 700, italic = false): void {
  c.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${SANS}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
}

function label(c: C, s: string, x: number, y: number, size: number, color: string, weight = 700, align: CanvasTextAlign = 'center'): void {
  font(c, size, weight);
  c.textAlign = align;
  c.fillStyle = color;
  c.fillText(s, x, y);
}

/** Brushed metal in a rect: a soft sheen across and fine hairlines along x. */
function brushed(c: C, x: number, y: number, w: number, h: number, col: string, seed: number, k = 1): void {
  const g = c.createLinearGradient(x, y, x + w * 0.35, y + h);
  g.addColorStop(0, shade(col, 0.28)); g.addColorStop(0.35, col); g.addColorStop(0.6, shade(col, 0.12)); g.addColorStop(1, shade(col, -0.18));
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
  const r = rng(seed);
  c.lineWidth = 0.35;
  for (let i = 0; i < h * 2.6 * k; i++) {
    const yy = y + r() * h;
    c.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.12 + r() * 0.22})` : `rgba(20,30,50,${0.06 + r() * 0.12})`;
    const x0 = x + r() * w * 0.7;
    c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 + w * (0.15 + r() * 0.5), yy); c.stroke();
  }
}

/** Polished chamfer round a path: a bright inner line and a dark outer one. */
function chamfer(c: C, path: Path2D, lw = 1.6): void {
  c.save();
  c.clip(path);
  c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = lw * 2;
  c.stroke(path);
  c.restore();
  c.strokeStyle = 'rgba(10,20,35,0.6)'; c.lineWidth = 0.8;
  c.stroke(path);
}

/** Bare aluminium where the anodising has worn off a corner. */
function wear(c: C, pts: [number, number, number][]): void {
  for (const [x, y, r] of pts) {
    const g = c.createRadialGradient(x, y, 0.5, x, y, r);
    g.addColorStop(0, 'rgba(225,230,236,0.85)'); g.addColorStop(0.5, 'rgba(200,208,218,0.35)'); g.addColorStop(1, 'rgba(200,208,218,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
}

/** A white plastic hub with its six drive teeth. */
function hub(c: C, x: number, y: number, r: number, a: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  const g = c.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cfcac0');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#1a1a1d'; c.beginPath(); c.arc(0, 0, r * 0.62, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#e8e4da';
  for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.fillRect(-r * 0.12, r * 0.36, r * 0.24, r * 0.3); }
  c.restore();
}

/** The compact cassette itself, centred, 156 × 100. `glass` paints it seen through the door. */
function cassette(c: C, power: number, time: number): void {
  const W = 156, H = 100;
  // smoke shell
  const g = c.createLinearGradient(0, -H / 2, 0, H / 2);
  g.addColorStop(0, '#3a3a40'); g.addColorStop(1, '#222226');
  c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, W, H, 6); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1; c.beginPath(); rrc(c, 0, 0, W - 3, H - 3, 5); c.stroke();
  // tape packs (seen through the label window): a full one and a thin one
  const a = power > 0 ? time * 5 : 0;
  c.save();
  c.beginPath(); rrc(c, 0, -6, 76, 24, 4); c.clip();
  c.fillStyle = '#1b1612'; c.fillRect(-40, -20, 80, 30);
  for (const [x, r] of [[-REEL, 30], [REEL, 19]] as const) {
    const tg = c.createRadialGradient(x, -6, 6, x, -6, r);
    tg.addColorStop(0, '#5a3a22'); tg.addColorStop(0.8, '#7a4f2c'); tg.addColorStop(1, '#4a2e18');
    c.fillStyle = tg; c.beginPath(); c.arc(x, -6, r, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(-38, -18, 76, 4);
  c.restore();
  // paper label with the window and the two hub holes cut out
  const lab = new Path2D();
  rrc(lab, 0, -10, 140, 64, 4);
  rrc(lab, 0, -6, 76, 24, 4);
  lab.arc(-REEL, -6, 12.5, 0, Math.PI * 2);
  lab.arc(REEL, -6, 12.5, 0, Math.PI * 2);
  c.save();
  c.fillStyle = '#f3ead6'; c.fill(lab, 'evenodd');
  c.clip(lab, 'evenodd');
  c.fillStyle = '#e2493b'; c.fillRect(-70, -42, 140, 9);
  c.fillStyle = '#2e6db0'; c.fillRect(-70, -33, 140, 2);
  c.strokeStyle = 'rgba(80,110,160,0.35)'; c.lineWidth = 0.5;
  for (const y of [-23, 12, 18]) { c.beginPath(); c.moveTo(-64, y); c.lineTo(64, y); c.stroke(); }
  c.font = `700 9px ${FONT_HAND}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#22306a';
  c.fillText('Mai hát  ♥  1983', -62, -25);
  c.font = `700 7px ${FONT_HAND}`; c.fillText('ru con · lý cây bông', -62, 15);
  label(c, 'A', 62, -25, 9, '#e2493b', 800);
  label(c, 'C-60', 58, 15, 5, '#22306a', 800);
  c.restore();
  c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 0.8; c.beginPath(); rrc(c, 0, -6, 76, 24, 4); c.stroke();
  hub(c, -REEL, -6, 11, a); hub(c, REEL, -6, 11, a * 1.6);
  // the lower lip: head openings with the shiny tape across them and the felt pad
  c.fillStyle = '#2b2b30';
  c.beginPath(); c.moveTo(-54, H / 2); c.lineTo(-46, 28); c.lineTo(46, 28); c.lineTo(54, H / 2); c.closePath(); c.fill();
  c.fillStyle = '#7a4f2c'; c.fillRect(-56, 44, 112, 2.4);
  c.fillStyle = '#0d0d10';
  for (const [x, w] of [[-38, 9], [-19, 9], [0, 15], [19, 9], [38, 9]] as const) { c.beginPath(); rrc(c, x, 45.5, w, 7, 1.5); c.fill(); }
  c.fillStyle = '#d8cfb6'; c.fillRect(-5, 46, 10, 3);
  c.fillStyle = '#7a4f2c'; c.fillRect(-56, 44, 112, 1.6);
  // little shell screws
  for (const [x, y] of [[-72, -44], [72, -44], [-72, 44], [72, 44], [0, 36]] as const) {
    c.fillStyle = '#8f9399'; c.beginPath(); c.arc(x, y, 2.3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#3a3c40'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x - 1.4, y); c.lineTo(x + 1.4, y); c.moveTo(x, y - 1.4); c.lineTo(x, y + 1.4); c.stroke();
  }
  label(c, 'TYPE I · NORMAL', -44, 34, 3.6, '#9a9aa2', 700);
  label(c, 'CHILL  60', 46, 34, 3.6, '#9a9aa2', 700);
}

// ---------------- the body: a double tub (deck in front, drive behind) ----------------

const SCREWS: [number, number][] = [[-78, -116], [78, -116], [-78, 116], [78, 116]];

const shell: PartDef = {
  id: 'shell', name: { en: 'Body Shell', vi: 'Thân máy' }, side: 'A', z: 0, x: 0, y: 0, w: BW, h: BH, icon: '🟦',
  shape: BODY, needs: ['keys', 'wheel', 'door', 'tape', 'motor', 'wboard', 'jack', 'cellA', 'cellB'], tool: 'sponge',
  thick: 32, cavity: 22, round: 12, wall: 9, body: '#24486f',
  bumps: [
    // deck: reel spindles, the head, capstan and pinch roller (they show when the tape is out)
    { kind: 'cyl', x: TAPE.x - REEL, y: TAPE.y - 6, w: 11, height: 5, color: '#ece8de', view: 'F' },
    { kind: 'cyl', x: TAPE.x + REEL, y: TAPE.y - 6, w: 11, height: 5, color: '#ece8de', view: 'F' },
    { kind: 'box', x: 0, y: 11, w: 16, h: 9, height: 9, color: '#d6dade', metal: true, view: 'F' },
    { kind: 'cyl', x: 40, y: 11, w: 11, height: 9, color: '#1d1d20', view: 'F' },
    { kind: 'cyl', x: 28, y: 11, w: 3.5, height: 11, color: '#e6e9ec', metal: true, view: 'F' },
  ],
  draw(c, s) {
    // anodised blue all over the outside, brushed, worn to bare metal at the corners
    c.save(); c.clip(BODY);
    brushed(c, -BW / 2, -BH / 2, BW, BH, BLUE, 3, 0.8);
    wear(c, [[-94, -134, 9], [95, -133, 7], [-95, 134, 7], [94, 135, 10], [100, 20, 5]]);
    c.restore();
    chamfer(c, BODY, 1.4);
    const back = s.view === 'B' && s.inDevice;
    // inside the tub
    c.fillStyle = '#2b2d32';
    c.fill(BODY_IN);
    c.save(); c.clip(BODY_IN);
    c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(BODY_IN);
    c.restore();
    if (!back) {
      // front: the cassette deck. A stamped steel chassis, spindles, head, capstan, pinch roller
      c.save(); c.clip(BODY_IN);
      const g = c.createLinearGradient(0, -130, 0, 130);
      g.addColorStop(0, '#5d6168'); g.addColorStop(1, '#3e4148');
      c.fillStyle = g; c.beginPath(); rrc(c, 0, -20, 172, 196, 8); c.fill();
      c.fillStyle = '#26282d';
      for (const [x, y, w, h] of [[-60, -100, 22, 10], [60, -100, 22, 10], [0, -80, 40, 8], [-56, 52, 30, 14], [56, 52, 30, 14]] as const) { c.beginPath(); rrc(c, x, y, w, h, 4); c.fill(); }
      // spindle collars
      for (const x of [-REEL, REEL]) {
        c.fillStyle = '#8b9097'; c.beginPath(); c.arc(x, TAPE.y - 6, 10, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ece8de'; c.beginPath(); c.arc(x, TAPE.y - 6, 5.5, 0, Math.PI * 2); c.fill();
      }
      // the head on its sled, capstan, pinch roller arm, tape guides
      c.fillStyle = '#7d828a'; c.beginPath(); rrc(c, 0, 18, 44, 12, 3); c.fill();
      c.fillStyle = '#d6dade'; c.beginPath(); rrc(c, 0, 11, 16, 9, 2); c.fill();
      c.fillStyle = '#9aa0a8'; c.beginPath(); rrc(c, 36, 16, 28, 8, 4); c.fill();
      c.fillStyle = '#1d1d20'; c.beginPath(); c.arc(40, 11, 5.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#e6e9ec'; c.beginPath(); c.arc(28, 11, 1.8, 0, Math.PI * 2); c.fill();
      label(c, 'CHILL MECHA  CM-2', 0, 34, 4.6, '#c3c7cd', 700);
      // lower half: the flex to the keys and the auto-stop leaf
      ribbon(c, -52, 90, 22, 40);
      c.fillStyle = '#b8bcc2'; c.beginPath(); rrc(c, 46, 92, 30, 6, 3); c.fill();
      label(c, '⚠ DO NOT TOUCH HEAD', 30, 112, 4.4, '#e0b04a', 700);
      c.restore();
    } else {
      // back: the underside of the deck plate, wiring harness and the screw posts
      c.save(); c.clip(BODY_IN);
      c.fillStyle = '#4a4d54'; c.beginPath(); rrc(c, 0, 0, 170, 250, 8); c.fill();
      c.strokeStyle = '#33363c'; c.lineWidth = 3;
      for (const y of [-20, 40]) { c.beginPath(); c.moveTo(-84, y); c.lineTo(84, y); c.stroke(); }
      c.lineCap = 'round'; c.lineWidth = 2;
      for (const [col, o] of [['#d33a2c', 0], ['#1e1e22', 3], ['#e8e2d0', 6]] as const) {
        c.strokeStyle = col;
        c.beginPath(); c.moveTo(-60 + o, -100); c.bezierCurveTo(-40 + o, -20, 30 + o, -10, 40 + o, 90); c.stroke();
      }
      label(c, 'CM-2  ROHS  03', -30, 112, 4.6, '#9aa0a8', 700);
      c.restore();
      for (const [x, y] of SCREWS) boss(c, x, y, '#5d6068');
    }
  },
};

// ---------------- front ----------------

// Piano keys standing out of the top edge, joined by their rocker bar inside the body
const KEY_X = [-66, -22, 22, 66];
const KEY_SYM = ['◀◀', '▶', '■', '▶▶'];
const KY = -145;
function keysPts() {
  const v: [number, number, number][] = [[-84, 12, 1]];
  KEY_X.forEach((x, i) => {
    v.push([x - 18, -8, 3], [x + 18, -8, 3]);
    if (i < KEY_X.length - 1) v.push([x + 18, 6, 0.5], [KEY_X[i + 1] - 18, 6, 0.5]);
  });
  v.push([84, 12, 1]);
  return roundedPts(v);
}
const keysShape = shapeFrom(keysPts());

const keys: PartDef = {
  id: 'keys', name: { en: 'Piano Keys', vi: 'Phím bấm' }, side: 'F', z: 7, x: 0, y: KY, w: 168, h: 20, icon: '⏯',
  shape: keysShape, tool: 'brush', elev: -16, thick: 40, round: 5, mat: 'plastic', body: '#a7adb5',
  draw(c, s) {
    c.save(); c.clip(keysShape);
    brushed(c, -86, -10, 172, 24, ALU, 7);
    c.restore();
    KEY_X.forEach((x, i) => {
      const p = new Path2D(); rrc(p, x, -1, 34, 15, 3);
      c.fillStyle = 'rgba(20,25,35,0.35)'; c.fill(p);
      c.save(); c.clip(p);
      brushed(c, x - 18, -9, 36, 17, i === 1 ? '#d9dce0' : ALU, 20 + i);
      c.restore();
      chamfer(c, p, 1);
      // engraved symbol; PLAY in orange, lit when it plays
      font(c, 7.5, 800);
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillText(KEY_SYM[i], x, -0.4);
      c.fillStyle = i === 1 ? (s.power > 0 ? '#ff9a4a' : ORANGE) : '#3a3f47'; c.fillText(KEY_SYM[i], x, -1);
    });
  },
};

// knurled volume wheel out of the right side
const WHEEL = { x: 104, y: -36 };
const wheelShape = rrPath(0, 0, 14, 46, 6);
const wheel: PartDef = {
  id: 'wheel', name: { en: 'Volume Wheel', vi: 'Núm âm lượng' }, side: 'F', z: 7, x: WHEEL.x, y: WHEEL.y, w: 14, h: 46, icon: '🔊',
  shape: wheelShape, elev: -10, thick: 32, round: 7, mat: 'metal', body: '#7d838b',
  draw(c) {
    const g = c.createLinearGradient(-7, 0, 7, 0);
    g.addColorStop(0, '#6f757d'); g.addColorStop(0.4, '#f2f4f6'); g.addColorStop(1, '#7d838b');
    c.fillStyle = g; c.fillRect(-7, -23, 14, 46);
    c.strokeStyle = 'rgba(30,34,40,0.55)'; c.lineWidth = 0.8;
    for (let y = -21; y <= 21; y += 2.2) { c.beginPath(); c.moveTo(-7, y); c.lineTo(7, y); c.stroke(); }
    c.fillStyle = ORANGE; c.fillRect(-7, -1, 14, 2);
  },
};

// the door: brushed aluminium, a smoked window onto the tape, the logo and the small switches
const DOOR_W = 180, DOOR_H = 258;
const doorPath = rrPath(0, 0, DOOR_W, DOOR_H, 12);
const WIN = { x: 0, y: TAPE.y, w: 162, h: 106 };
const HOTLINE = { x: -58, y: 92 };
const SEL = { x: 6, y: 92 };
const LED = { x: 66, y: 118 };

const door: PartDef = {
  id: 'door', name: { en: 'Cassette Door', vi: 'Nắp băng' }, side: 'F', z: 7, x: 0, y: 0, w: DOOR_W, h: DOOR_H, icon: '🚪',
  shape: doorPath, tool: 'brush', elev: 25, thick: 7, round: 3, body: '#9ea4ab',
  bumps: [
    { kind: 'cyl', x: HOTLINE.x, y: HOTLINE.y, w: 15, height: 3.5, color: ORANGE },
    { kind: 'box', x: SEL.x - 12, y: SEL.y, w: 9, h: 7, height: 3, color: '#2b2d33' },
    { kind: 'box', x: -60, y: 120, w: 14, h: 6, height: 2.5, color: '#2b2d33' },
  ],
  draw(c, s) {
    c.save(); c.clip(doorPath);
    brushed(c, -DOOR_W / 2, -DOOR_H / 2, DOOR_W, DOOR_H, ALU, 9);
    c.restore();
    chamfer(c, doorPath, 1.2);
    // key legends along the top
    KEY_SYM.forEach((l, i) => label(c, ['REW', 'PLAY', 'STOP', 'FF'][i], KEY_X[i], -121, 4.6, '#3a3f47', 800));
    // the window: dark bezel, the cassette behind smoked glass (clear plastic once the door is off)
    c.fillStyle = '#1b1c20'; c.beginPath(); rrc(c, WIN.x, WIN.y, WIN.w + 6, WIN.h + 6, 8); c.fill();
    c.save();
    c.beginPath(); rrc(c, WIN.x, WIN.y, WIN.w, WIN.h, 6); c.clip();
    if (s.inDevice) {
      c.save(); c.translate(TAPE.x, TAPE.y); cassette(c, s.power, s.time); c.restore();
      c.fillStyle = 'rgba(25,35,50,0.38)'; c.fillRect(-90, WIN.y - 60, 180, 120);
    } else {
      c.fillStyle = 'rgba(70,80,95,0.85)'; c.fillRect(-90, WIN.y - 60, 180, 120);
    }
    // glass reflections
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.beginPath(); c.moveTo(-81, WIN.y - 53); c.lineTo(-30, WIN.y - 53); c.lineTo(-81, WIN.y + 20); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.beginPath(); c.moveTo(-20, WIN.y - 53); c.lineTo(-8, WIN.y - 53); c.lineTo(-70, WIN.y + 53); c.lineTo(-82, WIN.y + 53); c.closePath(); c.fill();
    c.restore();
    c.strokeStyle = '#eef0f2'; c.lineWidth = 1; c.beginPath(); rrc(c, WIN.x, WIN.y, WIN.w + 7, WIN.h + 7, 8.5); c.stroke();
    // the logo and the model line
    font(c, 21, 900, true);
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillText('CHILL·MAN', 0, 31);
    c.fillStyle = '#1d3f6a'; c.fillText('CHILL·MAN', 0, 30);
    label(c, 'STEREO CASSETTE PLAYER  WM-CH2', 0, 48, 5, '#4a5058', 700);
    c.strokeStyle = 'rgba(40,46,56,0.5)'; c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(-80, 60); c.lineTo(80, 60); c.stroke();
    // hotline button well, tape selector, Dolby badge
    c.fillStyle = '#7d828a'; c.beginPath(); c.arc(HOTLINE.x, HOTLINE.y, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = ORANGE; c.beginPath(); c.arc(HOTLINE.x, HOTLINE.y, 7.5, 0, Math.PI * 2); c.fill();
    label(c, 'HOTLINE', HOTLINE.x, HOTLINE.y + 15, 4.4, '#3a3f47', 800);
    c.fillStyle = '#2b2d33'; c.beginPath(); rrc(c, SEL.x, SEL.y, 38, 9, 4.5); c.fill();
    c.fillStyle = '#5b5f66'; c.beginPath(); rrc(c, SEL.x, SEL.y, 34, 3, 1.5); c.fill();
    label(c, 'NORM', SEL.x - 13, SEL.y - 9, 3.8, '#3a3f47', 800);
    label(c, 'CrO₂', SEL.x, SEL.y - 9, 3.8, '#3a3f47', 800);
    label(c, 'METAL', SEL.x + 14, SEL.y - 9, 3.8, '#3a3f47', 800);
    label(c, 'TAPE', SEL.x, SEL.y + 10, 3.8, '#3a3f47', 800);
    c.strokeStyle = '#3a3f47'; c.lineWidth = 0.8; c.beginPath(); rrc(c, 60, 88, 30, 14, 2); c.stroke();
    label(c, 'DOLBY', 60, 85, 4.4, '#3a3f47', 900);
    label(c, 'B · NR', 60, 92, 4, '#3a3f47', 700);
    // hold slide, the eject arrow, the play lamp
    c.fillStyle = '#5b5f66'; c.beginPath(); rrc(c, -54, 120, 30, 7, 3.5); c.fill();
    label(c, 'HOLD', -32, 120, 4.2, '#3a3f47', 800, 'left');
    label(c, '▲ OPEN', 6, 120, 5, '#3a3f47', 800);
    const on = s.power > 0;
    if (on) {
      const lg = c.createRadialGradient(LED.x, LED.y, 0.5, LED.x, LED.y, 8);
      lg.addColorStop(0, 'rgba(255,90,60,0.8)'); lg.addColorStop(1, 'rgba(255,90,60,0)');
      c.fillStyle = lg; c.beginPath(); c.arc(LED.x, LED.y, 8, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = on ? '#ff4a2e' : '#6a2a24'; c.beginPath(); c.arc(LED.x, LED.y, 2.4, 0, Math.PI * 2); c.fill();
    label(c, 'BATT', LED.x - 12, LED.y, 4, '#3a3f47', 800);
  },
};

const tapeShape = rrPath(0, 0, 156, 100, 6);
const tape: PartDef = {
  id: 'tape', name: { en: 'Cassette Tape', vi: 'Băng cassette' }, side: 'F', z: 6, x: TAPE.x, y: TAPE.y, w: 156, h: 100, icon: '📼',
  shape: tapeShape, needs: ['door'], elev: 10, thick: 14, round: 3, body: '#2a2a2f',
  draw(c, s) {
    cassette(c, s.power, s.time);
  },
};

// ---------------- back (as seen from behind: x mirrored) ----------------

const BACK_W = 180, BACK_H = 258;
const backPath = rrPath(0, 0, BACK_W, BACK_H, 12);
const backPlate: PartDef = {
  id: 'back', name: { en: 'Back Cover', vi: 'Nắp lưng' }, side: 'B', z: 5, x: 0, y: 0, w: BACK_W, h: BACK_H, icon: '🟦',
  shape: backPath, needs: ['k1', 'k2', 'k3', 'k4', 'clip'], elev: 25, thick: 7, round: 3, body: '#24486f',
  draw(c) {
    c.save(); c.clip(backPath);
    brushed(c, -BACK_W / 2, -BACK_H / 2, BACK_W, BACK_H, shade(BLUE, -0.04), 31, 0.8);
    c.restore();
    chamfer(c, backPath, 1.2);
    // the screw counterbores
    for (const [x, y] of SCREWS) {
      c.fillStyle = '#1e3b5c'; c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill();
    }
    // silver rating label
    c.fillStyle = 'rgba(10,20,40,0.25)'; c.beginPath(); rrc(c, 1, 99, 140, 34, 3); c.fill();
    c.save(); c.beginPath(); rrc(c, 0, 98, 140, 34, 3); c.clip();
    brushed(c, -70, 81, 140, 34, '#d8dbdf', 33);
    c.restore();
    label(c, 'CHILL·MAN  MODEL WM-CH2', -64, 88, 5, '#23262c', 800, 'left');
    label(c, 'DC 3V  ⎓  (1.5V × 2, AA)', -64, 96, 4.4, '#23262c', 700, 'left');
    label(c, 'SERIAL No. 830417', -64, 103, 4.4, '#23262c', 700, 'left');
    label(c, 'MADE IN CHILL CORNER', -64, 110, 4.4, '#23262c', 700, 'left');
    c.strokeStyle = '#23262c'; c.lineWidth = 0.8;
    c.beginPath(); c.arc(54, 98, 7, 0, Math.PI * 2); c.stroke();
    label(c, 'CE', 54, 98, 5, '#23262c', 800);
    // DC-in hole near the top and the stamped grip lines either side of the clip
    c.fillStyle = '#15171b'; c.beginPath(); c.arc(-60, -112, 4.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#9aa0a8'; c.beginPath(); c.arc(-60, -112, 1.6, 0, Math.PI * 2); c.fill();
    label(c, 'DC IN 3V', -60, -101, 4, '#cfd8e4', 800);
    c.strokeStyle = 'rgba(10,20,35,0.4)'; c.lineWidth = 1.2;
    for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(sx * 56, -40 + i * 8); c.lineTo(sx * 74, -40 + i * 8); c.stroke(); }
  },
};

const CLIP = { x: 0, y: -14 };
const clipPath = rrPath(0, 0, 58, 150, 12);
const clip: PartDef = {
  id: 'clip', name: { en: 'Belt Clip', vi: 'Kẹp thắt lưng' }, side: 'B', z: 7, x: CLIP.x, y: CLIP.y, w: 58, h: 150, icon: '📎',
  shape: clipPath, needs: ['kc'], thick: 5, round: 2.5, mat: 'metal', body: '#8d939b',
  draw(c) {
    const g = c.createLinearGradient(-29, 0, 29, 0);
    g.addColorStop(0, '#8d939b'); g.addColorStop(0.3, '#f4f6f8'); g.addColorStop(0.55, '#c3c8ce'); g.addColorStop(1, '#8d939b');
    c.fillStyle = g; c.fill(clipPath);
    c.strokeStyle = '#5d636b'; c.lineWidth = 0.8; c.stroke(clipPath);
    // the stamped stiffening rib and the lip at the bottom
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.2;
    c.beginPath(); rrc(c, 0, 12, 22, 110, 9); c.stroke();
    c.strokeStyle = 'rgba(40,46,56,0.35)';
    c.beginPath(); rrc(c, 0.8, 13, 22, 110, 9); c.stroke();
    c.fillStyle = 'rgba(40,46,56,0.25)'; c.fillRect(-29, 66, 58, 3);
    label(c, 'CHILL', 0, 40, 6, '#5d636b', 900);
  },
};

// inside, behind: drive bracket (motor + belt + flywheel), head-amp board, jack, cells

const MOTOR = { x: 44, y: 58 };
const FLY = { x: 0, y: 22 };
const MOT = { x: 0, y: -36 };
const motorShape = rrPath(0, -4, 72, 124, 32);
const motor: PartDef = {
  id: 'motor', name: { en: 'Drive Motor & Belt', vi: 'Mô-tơ & dây curoa' }, side: 'B', z: 3, x: MOTOR.x, y: MOTOR.y, w: 72, h: 124, icon: '⚙️',
  shape: motorShape, needs: ['back'], thick: 4, round: 1.5, mat: 'metal', body: '#6b7178',
  bumps: [
    { kind: 'cyl', x: MOT.x, y: MOT.y, w: 32, height: 10, color: '#c3c7cc', metal: true },
    { kind: 'cyl', x: MOT.x, y: MOT.y, w: 7, height: 13, color: '#b8893a', metal: true },
    { kind: 'cyl', x: FLY.x, y: FLY.y, w: 8, height: 7, color: '#d6dade', metal: true },
  ],
  draw(c, s) {
    // stamped steel bracket
    const g = c.createLinearGradient(-36, -66, 36, 60);
    g.addColorStop(0, '#a9aeb5'); g.addColorStop(1, '#6b7178');
    c.fillStyle = g; c.fill(motorShape);
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1; c.beginPath(); rrc(c, 0, -4, 66, 118, 29); c.stroke();
    // brass flywheel with its spokes turning when it plays
    c.save();
    c.translate(FLY.x, FLY.y);
    const fg = c.createRadialGradient(-8, -10, 3, 0, 0, 30);
    fg.addColorStop(0, '#f6dc96'); fg.addColorStop(0.6, '#c99a4a'); fg.addColorStop(1, '#8a6428');
    c.fillStyle = fg; c.beginPath(); c.arc(0, 0, 30, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(90,60,20,0.5)'; c.lineWidth = 0.5;
    for (let r = 8; r < 29; r += 2.5) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
    c.rotate(s.power > 0 ? s.time * 4 : 0.3);
    c.fillStyle = '#6b4a1c';
    for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.arc(0, 16, 5, 0, Math.PI * 2); c.fill(); }
    c.restore();
    // the motor can's flange and its leads
    c.fillStyle = '#4a4f57'; c.beginPath(); c.arc(MOT.x, MOT.y, 19, 0, Math.PI * 2); c.fill();
    c.lineWidth = 1.6; c.lineCap = 'round';
    c.strokeStyle = '#d33a2c'; c.beginPath(); c.moveTo(-14, -48); c.quadraticCurveTo(-30, -60, -26, -64); c.stroke();
    c.strokeStyle = '#1e1e22'; c.beginPath(); c.moveTo(14, -48); c.quadraticCurveTo(28, -58, 24, -64); c.stroke();
    // the belt: taut round pulley and flywheel rim, or stretched and slipping when broken
    c.strokeStyle = '#141416'; c.lineWidth = 2.6;
    if (s.broken) {
      c.beginPath();
      c.moveTo(MOT.x - 4, MOT.y); c.bezierCurveTo(-34, -6, -40, 36, -26, 50);
      c.bezierCurveTo(-8, 62, 30, 58, 34, 30);
      c.bezierCurveTo(38, 4, 12, -24, MOT.x + 4, MOT.y);
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(-30, 10); c.bezierCurveTo(-36, 30, -30, 44, -24, 48); c.stroke();
      // glossy, glazed spot where it slipped
      c.fillStyle = 'rgba(30,25,20,0.55)'; c.beginPath(); c.ellipse(28, 44, 8, 4, -0.8, 0, Math.PI * 2); c.fill();
    } else {
      c.beginPath();
      c.moveTo(MOT.x - 4, MOT.y); c.lineTo(FLY.x - 30, FLY.y);
      c.arc(FLY.x, FLY.y, 30, Math.PI, 0, true);
      c.lineTo(MOT.x + 4, MOT.y);
      c.stroke();
    }
    label(c, 'DC 3V', 22, -54, 4, '#2a2d33', 800);
  },
};

const WBOARD = { x: 0, y: -50 };
const wboard: PartDef = {
  id: 'wboard', name: { en: 'Head-Amp Board', vi: 'Bo khuếch đại' }, side: 'B', z: 3, x: WBOARD.x, y: WBOARD.y, w: 160, h: 76, icon: '🟩',
  shape: rrPath(0, 0, 160, 76, 5), needs: ['back'], thick: 4, mat: 'pcb', body: '#1d4a3c',
  bumps: [
    { kind: 'cyl', x: 50, y: -14, w: 12, height: 10, color: '#1f3f8f' },
    { kind: 'cyl', x: 66, y: 8, w: 10, height: 8, color: '#1f1f24' },
    { kind: 'box', x: -16, y: -4, w: 34, h: 12, height: 3, color: '#1b1c20' },
    { kind: 'box', x: 18, y: 18, w: 22, h: 9, height: 2.5, color: '#1b1c20' },
    { kind: 'box', x: -62, y: 20, w: 14, h: 18, height: 8, color: '#d9dde2', metal: true },
  ],
  draw(c) {
    pcb(c, 160, 76, 47, '#2a7a5a');
    font(c, 4.6, 800); c.fillStyle = '#eef0e6';
    c.fillText('IC1  CXA-CH', -16, -14);
    c.fillText('HEAD AMP · DOLBY B', 10, 32);
    // the volume pot's can behind the wheel, the head flex, a few caps
    c.fillStyle = '#d9dde2'; c.beginPath(); rrc(c, -62, 20, 14, 18, 2); c.fill();
    ribbon(c, -40, -28, 30, 10);
    for (const [x, y] of [[40, 22], [0, 20], [-50, -12]] as const) {
      c.fillStyle = '#c99a3a'; c.beginPath(); rrc(c, x, y, 6, 3.4, 0.8); c.fill();
    }
  },
};

const jack: PartDef = {
  id: 'jack', name: { en: 'Headphone Jack', vi: 'Jack tai nghe' }, side: 'B', z: 3, x: 48, y: -112, w: 40, h: 26, icon: '🎧',
  shape: rrPath(0, 0, 40, 26, 4), needs: ['back'], thick: 12, round: 3, body: '#1c1d21',
  bumps: [{ kind: 'cyl', x: 0, y: -13, w: 10, height: 2, color: '#d6dade', metal: true }],
  draw(c) {
    c.fillStyle = '#26272c'; c.beginPath(); rrc(c, 0, 0, 40, 26, 4); c.fill();
    // chrome nut round the socket (it faces the top edge) and the solder tags
    const g = c.createRadialGradient(-2, -10, 1, 0, -8, 8);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#8b9097');
    c.fillStyle = g; c.beginPath(); c.arc(0, -6, 7, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0d0d10'; c.beginPath(); c.arc(0, -6, 3, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#d9b25a';
    for (const x of [-12, 0, 12]) c.fillRect(x - 2, 8, 4, 5);
    label(c, 'PHONES', 0, 3, 4, '#9aa0a8', 800);
  },
};

const cellPath = rrPath(0, 0, 26, 98, 12);
function cell(id: string, x: number, up: boolean): PartDef {
  return {
    id, name: { en: 'AA Battery', vi: 'Pin AA' }, side: 'B', z: 3, x, y: 60, w: 26, h: 98, icon: '🔋',
    shape: cellPath, needs: ['back'], thick: 16, round: 12, body: '#1d1f24',
    draw(c) {
      c.save();
      c.rotate(up ? -Math.PI / 2 : Math.PI / 2);
      cylH(c, 94, 26, '#26282e', '#cfd3d8');
      // wrapper: copper top band, the brand
      c.fillStyle = '#c9772e'; c.fillRect(14, -13, 28, 26);
      c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(14, -10, 28, 4);
      font(c, 7, 900); c.fillStyle = '#f2efe8'; c.fillText('CHILL', -12, 0.5);
      c.fillStyle = '#d6dade'; c.beginPath(); rrc(c, 49, 0, 4, 9, 1.5); c.fill();
      c.restore();
      font(c, 9, 900); c.fillStyle = '#2a2a2a'; c.fillText('+', 0, up ? -40 : 40);
    },
  };
}

export const walkman: DeviceDef = {
  id: 'walkman',
  name: { en: 'Cassette Walkman', vi: 'Máy nghe băng cassette' },
  w: 214, h: 300,
  hasBack: true,
  parts: [
    shell, keys, wheel, door, tape, backPlate, clip, motor, wboard, jack, cell('cellA', -60, true), cell('cellB', -32, false),
    screw('kc', CLIP.x, CLIP.y - 58, 'B'),
    ...SCREWS.map(([x, y], i) => screw(`k${i + 1}`, x, y, 'B')),
  ],
  working(c, t, k) {
    // the play lamp and a soft warm halo over the window
    c.save();
    c.globalAlpha = k * (0.45 + Math.sin(t * 3) * 0.08);
    const g = c.createRadialGradient(TAPE.x, TAPE.y, 10, TAPE.x, TAPE.y, 130);
    g.addColorStop(0, 'rgba(255,214,140,0.45)'); g.addColorStop(1, 'rgba(255,214,140,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(TAPE.x, TAPE.y, 130, 0, Math.PI * 2); c.fill();
    c.restore();
  },
  workFx: { kind: 'note', x: 0, y: -160, color: '#ffd36b', dir: -Math.PI / 2 },
};
