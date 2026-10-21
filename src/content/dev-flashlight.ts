// Olive-drab angle-head scout flashlight lying on its back, the lens looking
// straight up: a matte moulded tube with a stencilled name and grip rings, a
// slide switch between two guard ridges, a rounded head with a black knurled
// bezel ring over the clear lens and a polished reflector, and a ribbed tail cap
// with a brass lanyard ring sticking out of the end. Inside: two D cells, the
// tail spring on its contact strip, and an LED board behind the reflector.

import { type C, shade, rrc, rrPath, ellPath, shapeFrom, roundedPts, rrPts, ellPts, rng } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, cylH, boss } from './kit';

const OD = '#5f6b3b';
const OD_D = '#4b5530';
const BLACK = '#1d1e1b';
const BRASS = '#cf9f45';
const STENCIL = '#e6dcb4';
const SANS = '"Helvetica Neue", Arial, sans-serif';
const STAMP = '"Arial Black", "Helvetica Neue", Arial, sans-serif';

const LENS = { x: 98, y: 0 };
const TUBE_Y = 27; // half width of the body tube
const HEAD_X0 = 52, HEAD_X1 = 144, HEAD_H = 44;
const SWITCH_X = 22;

function font(c: C, size: number, weight = 700, face = SANS): void {
  c.font = `${weight} ${size}px ${face}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
}

/** Matte moulded plastic: the colour with a faint mottle and fine speckle. */
function matte(c: C, path: Path2D, col: string, seed: number, x: number, y: number, w: number, h: number): void {
  c.save();
  c.clip(path);
  c.fillStyle = col; c.fillRect(x, y, w, h);
  const r = rng(seed);
  for (let i = 0; i < 10; i++) {
    const cx = x + r() * w, cy = y + r() * h, rr = 10 + r() * 24;
    const g = c.createRadialGradient(cx, cy, 1, cx, cy, rr);
    const a = 0.05 + r() * 0.06;
    g.addColorStop(0, r() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,250,220,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  }
  for (let i = 0; i < (w * h) / 8; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,230,0.08)';
    c.fillRect(x + r() * w, y + r() * h, 0.8, 0.8);
  }
  c.restore();
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

/** A polished parabolic reflector: bright rim, the bulb's image in rings, the lamp hole. */
function reflectorFace(c: C, r: number, power: number, tarnish: boolean): void {
  const g = c.createRadialGradient(-r * 0.25, -r * 0.3, 1, 0, 0, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, '#e9edf2'); g.addColorStop(0.55, '#9ea5ae'); g.addColorStop(0.8, '#e6eaef'); g.addColorStop(1, '#7c838c');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  // the faceted rings of a stamped reflector
  for (let k = 0.3; k < 1; k += 0.1) {
    c.strokeStyle = `rgba(255,255,255,${0.25 + (1 - k) * 0.25})`; c.lineWidth = 0.6;
    c.beginPath(); c.arc(0, 0, r * k, Math.PI * 0.9, Math.PI * 1.7); c.stroke();
    c.strokeStyle = 'rgba(60,66,74,0.25)';
    c.beginPath(); c.arc(0, 0, r * k + 0.8, Math.PI * 0.05, Math.PI * 0.6); c.stroke();
  }
  // the studio window caught in the bowl
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.save(); c.translate(-r * 0.45, -r * 0.42); c.rotate(-0.7); c.beginPath(); rrc(c, 0, 0, r * 0.32, r * 0.1, r * 0.04); c.fill(); c.restore();
  // the lamp hole with the LED's dome
  c.fillStyle = '#2c2f33'; c.beginPath(); c.arc(0, 0, r * 0.2, 0, Math.PI * 2); c.fill();
  c.fillStyle = power > 0 ? '#fffbe8' : '#f2e2a0'; c.beginPath(); c.arc(0, 0, r * 0.11, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(-r * 0.04, -r * 0.04, r * 0.035, 0, Math.PI * 2); c.fill();
  if (power > 0) {
    const pg = c.createRadialGradient(0, 0, 2, 0, 0, r);
    pg.addColorStop(0, `rgba(255,250,215,${0.95 * power})`); pg.addColorStop(1, `rgba(255,240,190,${0.25 * power})`);
    c.fillStyle = pg; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  }
  if (tarnish) {
    c.fillStyle = 'rgba(110,90,60,0.45)';
    for (const [x, y, rr] of [[-0.45, 0.25, 0.22], [0.35, -0.5, 0.18], [0.55, 0.35, 0.15], [-0.2, -0.6, 0.12]]) { c.beginPath(); c.arc(x * r, y * r, rr * r, 0, Math.PI * 2); c.fill(); }
  }
}

// ---------------- body: the hollow moulded shell (tube + head) ----------------

function bodyPts(k = 0): [number, number][] {
  return roundedPts([
    [-132 + k, -TUBE_Y + k, 12], [HEAD_X0 + k, -TUBE_Y + k, 6], [HEAD_X0 + k, -HEAD_H + k, 26 - k], [HEAD_X1 - k, -HEAD_H + k, 30 - k],
    [HEAD_X1 - k, HEAD_H - k, 30 - k], [HEAD_X0 + k, HEAD_H - k, 26 - k], [HEAD_X0 + k, TUBE_Y - k, 6], [-132 + k, TUBE_Y - k, 12],
  ], 8);
}
const BODY = shapeFrom(bodyPts());
const BODY_IN = shapeFrom(bodyPts(6));

const shell: PartDef = {
  id: 'shell', name: { en: 'Body Shell', vi: 'Thân đèn' }, side: 'A', z: 0, x: 0, y: 0, w: 276, h: 88, icon: '🔦',
  shape: BODY, needs: ['batA', 'batB', 'spring', 'led'], thick: 7, cavity: 5, round: 7, wall: 5, body: OD_D,
  draw(c) {
    matte(c, BODY, OD_D, 3, -134, -46, 280, 92);
    c.fillStyle = shade(OD_D, -0.4); c.fill(BODY_IN);
    c.save(); c.clip(BODY_IN);
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 9; c.translate(2, 4); c.stroke(BODY_IN);
    c.restore();
    // brass contact strip running the length of the tube, from the tail spring to the lamp
    const g = c.createLinearGradient(0, 15, 0, 20);
    g.addColorStop(0, shade(BRASS, 0.4)); g.addColorStop(1, shade(BRASS, -0.3));
    c.fillStyle = g; c.fillRect(-124, 15, 186, 4.5);
    c.fillStyle = shade(BRASS, -0.45);
    for (const x of [-118, -40, 56]) { c.beginPath(); c.arc(x, 17.2, 1.2, 0, Math.PI * 2); c.fill(); }
    // the lamp well in the head
    c.fillStyle = shade(OD_D, -0.6); c.beginPath(); c.arc(LENS.x, LENS.y, 34, 0, Math.PI * 2); c.fill();
    boss(c, 62, -34, OD_D); boss(c, 134, 34, OD_D);
  },
};

// ---------------- insides ----------------

const springPath = rrPath(0, 0, 20, 40, 5);
const spring: PartDef = {
  id: 'spring', name: { en: 'Tail Spring & Contact', vi: 'Lò xo đuôi' }, side: 'A', z: 3, x: -119, y: 0, w: 20, h: 40, icon: '🌀',
  shape: springPath, needs: ['cap', 'cover'], thick: 24, round: 8, mat: 'metal', body: '#9aa1a8',
  draw(c, s) {
    // brass base plate + a conical steel coil seen side-on
    c.fillStyle = shade(BRASS, -0.15); c.fillRect(-10, -19, 3.5, 38);
    c.lineWidth = 2; c.lineCap = 'round';
    const loose = s.broken;
    for (let i = 0; i < 6; i++) {
      const x = -5 + i * (loose ? 3.2 : 2.5), h = 16 - i * 1.4;
      c.strokeStyle = 'rgba(0,0,0,0.3)';
      c.beginPath(); c.moveTo(x + 1, -h + 1); c.lineTo(x + 3, h + 1); c.stroke();
      c.strokeStyle = loose ? (i % 2 ? '#b98a60' : '#9a6a44') : i % 2 ? '#eef1f4' : '#c4c9d0';
      c.beginPath(); c.moveTo(x, -h); c.lineTo(x + 2, h); c.stroke();
    }
    c.fillStyle = '#d6dade'; c.beginPath(); c.arc(9, 0, 3, 0, Math.PI * 2); c.fill();
    // brass tab where the long contact strip is riveted on
    c.fillStyle = BRASS; c.fillRect(-6, 14, 16, 4.5);
    c.fillStyle = shade(BRASS, -0.4); c.beginPath(); c.arc(6, 16.2, 1.4, 0, Math.PI * 2); c.fill();
    if (loose) {
      // rusty, sagging, and the tab snapped off its rivet
      c.fillStyle = 'rgba(170,90,40,0.75)';
      for (const [x, y, r] of [[2, -8, 3.5], [6, 4, 3], [-2, 8, 2.5]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = '#2a2a2a'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(3, 13); c.lineTo(8, 21); c.stroke();
    }
  },
};

const batPath = rrPath(0, 0, 80, 34, 16);
function cell(id: string, x: number): PartDef {
  return {
    id, name: { en: 'D Cell', vi: 'Pin đại' }, side: 'A', z: 3, x, y: 0, w: 80, h: 34, icon: '🔋',
    shape: batPath, needs: id === 'batA' ? ['cover', 'cap'] : ['cover'], thick: 32, round: 16, body: '#2a2622',
    draw(c, s) {
      cylH(c, 76, 33, '#26221f', '#c9ccd2');
      // copper-gold top band, a printed label, the + nub pointing at the head
      const g = c.createLinearGradient(0, -16, 0, 16);
      g.addColorStop(0, '#7a4a1e'); g.addColorStop(0.3, '#e8a95a'); g.addColorStop(0.6, '#c27a34'); g.addColorStop(1, '#5e3614');
      c.fillStyle = g; c.fillRect(12, -16.5, 22, 33);
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(12, -16.5, 1, 33);
      font(c, 8.5, 900, STAMP); c.fillStyle = '#e8a95a'; c.fillText('CHILL', -12, -3);
      font(c, 4.2, 700); c.fillStyle = '#d8d2c8'; c.fillText('ALKALINE · D · 1.5V', -12, 6);
      c.fillStyle = '#c9ccd2'; c.beginPath(); rrc(c, 40, 0, 4, 11, 1.5); c.fill();
      if (s.broken) {
        c.fillStyle = 'rgba(235,240,232,0.92)';
        for (const [dx, dy, r] of [[34, -9, 4.5], [36, 6, 5], [31, 12, 3]]) { c.beginPath(); c.arc(dx, dy, r, 0, Math.PI * 2); c.fill(); }
      }
    },
  };
}

const ledPath = ellPath(0, 0, 30, 30);
const led: PartDef = {
  id: 'led', name: { en: 'LED Board', vi: 'Bo đèn LED' }, side: 'A', z: 3, x: LENS.x, y: LENS.y, w: 60, h: 60, icon: '💡',
  shape: ledPath, needs: ['reflector'], elev: 4, thick: 3, mat: 'pcb', body: '#1d5c37',
  bumps: [{ kind: 'box', x: 0, y: 0, w: 10, h: 10, height: 2.5, color: '#f2f2ee' }, { kind: 'cyl', x: 0, y: 0, w: 6, height: 4.5, color: '#f2e2a0' }],
  draw(c, s) {
    c.save();
    c.beginPath(); c.arc(0, 0, 30, 0, Math.PI * 2); c.clip();
    pcb(c, 64, 64, 515, '#2c6d4a');
    c.restore();
    c.strokeStyle = '#1d5c37'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, 29.5, 0, Math.PI * 2); c.stroke();
    // the star LED: a white ceramic square, the yellow phosphor dome
    c.fillStyle = '#f2f2ee'; c.beginPath(); rrc(c, 0, 0, 12, 12, 2); c.fill();
    c.fillStyle = s.power > 0 ? '#fffbe0' : '#f2d36a'; c.beginPath(); c.arc(0, 0, 3.6, 0, Math.PI * 2); c.fill();
    // a current resistor, + / − pads for the battery leads
    c.fillStyle = '#26282d'; c.fillRect(10, -14, 8, 4);
    c.fillStyle = '#e8c15a';
    for (const [x, y] of [[-20, -12], [-20, 12]]) { c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill(); }
    font(c, 3.4, 700); c.fillStyle = '#e6f2ea'; c.fillText('+', -20, -18); c.fillText('−', -20, 18);
    if (s.broken) {
      const g = c.createRadialGradient(14, 10, 1, 14, 10, 12);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(14, 10, 12, 0, Math.PI * 2); c.fill();
    }
  },
};

const REFL_R = 34;
const reflector: PartDef = {
  id: 'reflector', name: { en: 'Reflector', vi: 'Chóa đèn' }, side: 'A', z: 4, x: LENS.x, y: LENS.y, w: 68, h: 68, icon: '🥣',
  shape: ellPath(0, 0, REFL_R, REFL_R), needs: ['lens'], elev: 8, thick: 22, round: 3, mat: 'metal', body: '#9aa1a8',
  draw(c, s) { reflectorFace(c, REFL_R, s.power, s.broken); },
};

const LENS_R = 33;
const lens: PartDef = {
  id: 'lens', name: { en: 'Lens', vi: 'Mặt kính' }, side: 'A', z: 5, x: LENS.x, y: LENS.y, w: 66, h: 66, icon: '🔵',
  shape: ellPath(0, 0, LENS_R, LENS_R), needs: ['head'], elev: 40, thick: 4, round: 2, mat: 'glass', body: '#b9d6e0',
  draw(c, s) {
    if (s.inDevice) {
      // clear glass: the reflector bowl underneath shows through
      reflectorFace(c, LENS_R, s.power, false);
      c.fillStyle = 'rgba(190,225,240,0.14)';
    } else c.fillStyle = 'rgba(208,234,246,0.9)';
    c.beginPath(); c.arc(0, 0, LENS_R, 0, Math.PI * 2); c.fill();
    // a slightly domed lens: two highlights and a thin edge
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath(); c.ellipse(-12, -14, 11, 4, -0.7, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.beginPath(); c.arc(14, 13, 3.5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, LENS_R - 1, 0, Math.PI * 2); c.stroke();
    if (s.broken) {
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 0.9;
      for (const [x0, y0, x1, y1] of [[-24, -10, 18, 20], [-10, -28, 26, -4], [-28, 12, -4, 28], [6, -20, 28, 12]]) {
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
    }
  },
};

// ---------------- the head ----------------

const HEAD_CX = (HEAD_X0 + HEAD_X1) / 2; // 98
const HOLE_R = 34;
const headPath = shapeFrom(roundedPts([
  [-46, -44, 26], [46, -44, 30], [46, 44, 30], [-46, 44, 26],
], 8), [ellPts(LENS.x - HEAD_CX, 0, HOLE_R, HOLE_R, 48)]);
const head: PartDef = {
  id: 'head', name: { en: 'Lamp Head', vi: 'Đầu đèn' }, side: 'A', z: 6, x: HEAD_CX, y: 0, w: 92, h: 88, icon: '🔦',
  shape: headPath, needs: ['f3', 'f4', 'bezel'], tool: 'brush', elev: 7, thick: 39, round: 16, body: OD_D,
  draw(c, s) {
    matte(c, headPath, OD, 21, -48, -46, 96, 92);
    // the moulded seat the bezel screws onto, a parting line, two rivets
    c.strokeStyle = shade(OD, -0.3); c.lineWidth = 2; c.beginPath(); c.arc(0, 0, HOLE_R + 9, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(255,255,230,0.18)'; c.lineWidth = 0.8; c.beginPath(); c.arc(0, 0.8, HOLE_R + 10.5, Math.PI * 1.05, Math.PI * 1.9); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-46, 0); c.lineTo(-44, 0); c.moveTo(44, 0); c.lineTo(46, 0); c.stroke();
    for (const [x, y] of [[-38, 36], [38, -36]]) {
      c.fillStyle = shade(OD, 0.2); c.beginPath(); c.arc(x, y, 2.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = shade(OD, -0.35); c.beginPath(); c.arc(x + 0.6, y + 0.6, 1.2, 0, Math.PI * 2); c.fill();
    }
    // the inside of the lens hole: a dark step down to the glass
    c.strokeStyle = '#1f2414'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, HOLE_R - 0.5, 0, Math.PI * 2); c.stroke();
    font(c, 3.6, 700); c.fillStyle = shade(OD, -0.35);
    c.fillText('▲ LENS UP', 0, -40);
    if (s.broken) {
      c.strokeStyle = 'rgba(40,40,30,0.7)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(40, 20); c.lineTo(44, 30); c.lineTo(41, 38); c.stroke();
    }
  },
};

// the black screw-on bezel ring that holds the lens: knurled all round
const BEZ_OUT = 42, BEZ_IN = 31;
const bezelShape = shapeFrom(ellPts(0, 0, BEZ_OUT, BEZ_OUT, 64), [ellPts(0, 0, BEZ_IN, BEZ_IN, 48)]);
const bezel: PartDef = {
  id: 'bezel', name: { en: 'Bezel Ring', vi: 'Vòng ren kính' }, side: 'A', z: 8, x: LENS.x, y: LENS.y, w: 84, h: 84, icon: '⭕',
  shape: bezelShape, elev: 44, thick: 7, round: 2, body: '#121311',
  draw(c, s) {
    c.save();
    const ann = new Path2D();
    ann.arc(0, 0, BEZ_OUT, 0, Math.PI * 2); ann.arc(0, 0, BEZ_IN, 0, Math.PI * 2, true);
    c.clip(ann, 'evenodd');
    c.fillStyle = BLACK; c.beginPath(); c.arc(0, 0, BEZ_OUT, 0, Math.PI * 2); c.fill();
    teeth(c, 39.5, BEZ_OUT, 72, '#0f100e', '#3d3f3a');
    const g = c.createLinearGradient(-36, -36, 36, 36);
    g.addColorStop(0, '#4a4c47'); g.addColorStop(0.5, '#1f201d'); g.addColorStop(1, '#383a35');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 39.3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 0.8; c.beginPath(); c.arc(0, 0, 37, Math.PI * 1.0, Math.PI * 1.7); c.stroke();
    c.strokeStyle = '#000'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, BEZ_IN + 0.6, 0, Math.PI * 2); c.stroke();
    font(c, 3.2, 700); c.fillStyle = '#8c8f86';
    c.fillText('◀ OPEN', 0, -35);
    if (s.power > 0) {
      c.strokeStyle = `rgba(255,245,200,${0.5 * s.power})`; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, BEZ_IN + 1.5, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  },
};

// ---------------- the tube cover with the switch ----------------

const TUBE_X0 = -120, TUBE_X1 = 56;
const COVER_X = (TUBE_X0 + TUBE_X1) / 2; // -30
const coverPath = rrPath(0, 0, TUBE_X1 - TUBE_X0, TUBE_Y * 2, 14);
const sw = SWITCH_X - COVER_X;
const cover: PartDef = {
  id: 'cover', name: { en: 'Tube Cover', vi: 'Vỏ ống' }, side: 'A', z: 6, x: COVER_X, y: 0, w: TUBE_X1 - TUBE_X0, h: TUBE_Y * 2, icon: '🟩',
  shape: coverPath, needs: ['f1', 'f2'], tool: 'sponge', elev: 7, thick: 35, round: 26, body: OD_D,
  bumps: [
    // the two guard ridges either side of the slide switch, and the slide knob between them
    { kind: 'box', x: sw, y: -10, w: 30, h: 4, height: 5, color: OD },
    { kind: 'box', x: sw, y: 10, w: 30, h: 4, height: 5, color: OD },
    { kind: 'box', x: sw - 5, y: 0, w: 10, h: 9, height: 4, color: '#2a2c26' },
  ],
  draw(c, s) {
    const P = coverPath;
    matte(c, P, OD, 11, -86, -27, 172, 54);
    c.save(); c.clip(P);
    // moulded grip rings near the tail
    for (let i = 0; i < 7; i++) {
      const x = -78 + i * 5;
      c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(x, -27, 1.4, 54);
      c.fillStyle = 'rgba(255,255,230,0.14)'; c.fillRect(x + 1.4, -27, 1, 54);
    }
    // the switch plate and its ON / OFF marks
    c.fillStyle = shade(OD, -0.22); c.beginPath(); rrc(c, sw, 0, 34, 16, 3); c.fill();
    c.fillStyle = '#26281f'; c.beginPath(); rrc(c, sw, 0, 22, 4, 2); c.fill();
    c.restore();
    font(c, 4, 800); c.fillStyle = STENCIL;
    c.fillText('OFF', sw - 9, -16.5); c.fillText('ON', sw + 9, -16.5);
    // the stencilled name, a little worn
    c.save();
    font(c, 9.5, 900, STAMP);
    c.fillStyle = STENCIL;
    c.globalAlpha = 0.85;
    c.fillText('CHILL SCOUT', -30, -1);
    font(c, 4.4, 700);
    c.fillText('FLASHLIGHT  MX-74  ·  2 × D', -30, 9);
    c.globalAlpha = 1;
    const r = rng(5);
    c.fillStyle = OD;
    for (let i = 0; i < 40; i++) c.fillRect(-62 + r() * 64, -6 + r() * 18, 0.6 + r() * 1.4, 0.6 + r());
    c.restore();
    if (s.power > 0) {
      c.fillStyle = 'rgba(255,240,180,0.45)'; c.beginPath(); c.arc(sw + 5, 0, 4, 0, Math.PI * 2); c.fill();
    }
    if (s.broken) {
      c.strokeStyle = 'rgba(30,35,15,0.8)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(sw - 8, -6); c.lineTo(sw, 2); c.lineTo(sw + 7, -5); c.stroke();
    }
  },
};

// ---------------- the ribbed tail cap with its lanyard ring ----------------

const capPath = shapeFrom(roundedPts([[-14, -29, 6], [10, -29, 2], [10, 29, 2], [-14, 29, 6]]));
const cap: PartDef = {
  id: 'cap', name: { en: 'Tail Cap', vi: 'Nắp đuôi' }, side: 'A', z: 7, x: -128, y: 0, w: 24, h: 58, icon: '⚫',
  shape: capPath, needs: ['lanyard'], elev: 0, thick: 42, round: 12, body: OD_D,
  bumps: [{ kind: 'box', x: -11, y: 0, w: 5, h: 12, height: 3, color: BRASS, metal: true }],
  draw(c, s) {
    matte(c, capPath, shade(OD, -0.08), 31, -16, -30, 28, 60);
    c.save(); c.clip(capPath);
    // deep grip ribs round the cap (they run across, so the modelled sides show them as flutes)
    for (let y = -27; y <= 27; y += 4) {
      c.fillStyle = 'rgba(0,0,0,0.32)'; c.fillRect(-16, y, 28, 1.6);
      c.fillStyle = 'rgba(255,255,230,0.12)'; c.fillRect(-16, y + 1.6, 28, 0.8);
    }
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(8, -30, 2, 60);
    c.restore();
    // the brass lanyard ring's mount
    c.fillStyle = BRASS; c.beginPath(); rrc(c, -11, 0, 5, 12, 1.5); c.fill();
    if (s.broken) {
      c.fillStyle = 'rgba(80,110,60,0.6)'; c.beginPath(); c.ellipse(-2, 10, 6, 9, 0, 0, Math.PI * 2); c.fill();
    }
  },
};

// the lanyard ring hanging off the tail
const RING = shapeFrom(ellPts(0, 0, 9, 9, 32), [ellPts(0, 0, 6, 6, 24)]);
const lanyard: PartDef = {
  id: 'lanyard', name: { en: 'Lanyard Ring', vi: 'Khoen dây đeo' }, side: 'A', z: 8, x: -148, y: 0, w: 18, h: 18, icon: '⭕',
  shape: RING, elev: 19, thick: 3, round: 1.5, mat: 'metal', body: shade(BRASS, -0.3),
  draw(c) {
    const g = c.createLinearGradient(-9, -9, 9, 9);
    g.addColorStop(0, shade(BRASS, 0.5)); g.addColorStop(0.5, BRASS); g.addColorStop(1, shade(BRASS, -0.35));
    c.fillStyle = g; c.fill(RING);
  },
};

export const flashlight: DeviceDef = {
  id: 'flashlight',
  name: { en: 'Scout Flashlight', vi: 'Đèn pin' },
  w: 304, h: 96,
  hasBack: false,
  parts: [
    shell, spring, cell('batA', -66), cell('batB', 16), led, reflector, lens, head, bezel, cover, cap, lanyard,
    screw('f1', -100, 0, 'A'), screw('f2', -4, 0, 'A'), screw('f3', 62, -34, 'A'), screw('f4', 134, 34, 'A'),
  ],
  working(c, t, k) {
    c.save();
    // the beam comes straight up at us: a warm halo with slowly turning rays
    c.globalAlpha = k;
    const g = c.createRadialGradient(LENS.x, LENS.y, 20, LENS.x, LENS.y, 130);
    g.addColorStop(0, 'rgba(255,250,215,0.85)'); g.addColorStop(0.4, 'rgba(255,236,170,0.35)'); g.addColorStop(1, 'rgba(255,236,170,0)');
    c.fillStyle = g; c.beginPath(); c.arc(LENS.x, LENS.y, 130, 0, Math.PI * 2); c.fill();
    c.translate(LENS.x, LENS.y); c.rotate(t * 0.3);
    c.fillStyle = 'rgba(255,248,210,0.22)';
    for (let i = 0; i < 8; i++) {
      c.rotate(Math.PI / 4);
      c.beginPath(); c.moveTo(-6, 40); c.lineTo(6, 40); c.lineTo(18, 120 + Math.sin(t * 3 + i) * 10); c.lineTo(-18, 120 + Math.sin(t * 3 + i) * 10); c.closePath(); c.fill();
    }
    c.restore();
  },
  workFx: { kind: 'flash', x: LENS.x, y: LENS.y, color: '#fff6d0', dir: -Math.PI / 2 },
};
