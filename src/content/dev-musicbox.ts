// Walnut ballerina music box with the lid off: mitred walnut sides with a
// boxwood inlay line, brass hinge leaves and lock plate on the rim, a crushed
// velvet nook where the little dancer turns on her mirror stage, and an
// 18-note movement under a framed glass: gilt bedplate, pinned brass
// cylinder, tuned steel comb, spring barrel with its air-brake governor. The
// butterfly key sticks out of the right side.

import { type C, shade, rrc, rrPath, ellPath, rng, shapeFrom, roundedPts } from '../core/draw';
import { type DeviceDef, type PartDef, type Bump, screw } from './device';

const WALNUT = '#6e4128';
const WALNUT_L = '#93603c';
const BOXWOOD = '#e8cf98';
const VELVET = '#7e1f33';
const BRASS = '#d4a64a';
const GILT = '#c9a454';
const STEEL = '#c9ced6';
const PINK = '#f7b8c8';
const SKIN = '#f4d8c4';
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '"Helvetica Neue", Arial, sans-serif';

const BOX = rrPath(0, 0, 240, 176, 8);
const IN_W = 216, IN_H = 152;
const BOX_IN = rrPath(0, 0, IN_W, IN_H, 3);
// The two compartments inside the box.
const NOOK = { x: -62, y: 0, w: 92, h: 152 };
const MECH = { x: 50, y: 0, w: 116, h: 152 };
const DIV_X = -12;
const CYL = { x: 50, y: -38 };
const COMB = { x: 50, y: 0 };
const SPRING = { x: 46, y: 48 };
const STAGE = { x: -62, y: -6 };

// ---------------- painting helpers ----------------

function font(c: C, size: number, weight = 700, face = SANS): void {
  c.font = `${weight} ${size}px ${face}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
}

/** Figured walnut: a warm base, long wavy grain lines and the odd darker flame, running along `dir`. */
function walnut(c: C, x: number, y: number, w: number, h: number, seed: number, vertical = false): void {
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  const g = vertical ? c.createLinearGradient(x, 0, x + w, 0) : c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(WALNUT, 0.08)); g.addColorStop(0.5, WALNUT_L); g.addColorStop(1, shade(WALNUT, -0.05));
  c.fillStyle = g; c.fillRect(x, y, w, h);
  const r = rng(seed);
  const L = vertical ? h : w, S = vertical ? w : h;
  for (let i = 0; i < S * 1.6; i++) {
    const o = r() * S, amp = 0.6 + r() * 2.2, ph = r() * 6, f = 0.02 + r() * 0.04;
    c.strokeStyle = r() < 0.65 ? `rgba(45,22,10,${0.12 + r() * 0.22})` : `rgba(240,190,130,${0.06 + r() * 0.1})`;
    c.lineWidth = 0.3 + r() * 0.8;
    c.beginPath();
    for (let t = 0; t <= L; t += 4) {
      const d = o + Math.sin(t * f + ph) * amp + Math.sin(t * f * 3.1 + ph) * amp * 0.3;
      if (vertical) c.lineTo(x + d, y + t); else c.lineTo(x + t, y + d);
    }
    c.stroke();
  }
  // a couple of dark flame figures
  for (let i = 0; i < 2; i++) {
    const cx = x + r() * w, cy = y + r() * h;
    const fg = c.createRadialGradient(cx, cy, 1, cx, cy, 14);
    fg.addColorStop(0, 'rgba(40,18,8,0.28)'); fg.addColorStop(1, 'rgba(40,18,8,0)');
    c.fillStyle = fg; c.fillRect(cx - 14, cy - 14, 28, 28);
  }
  c.restore();
}

/** Crushed velvet: deep colour with a soft sheen and a fine pile. */
function velvet(c: C, x: number, y: number, w: number, h: number, seed: number): void {
  const g = c.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, shade(VELVET, 0.18)); g.addColorStop(0.45, VELVET); g.addColorStop(1, shade(VELVET, -0.3));
  c.fillStyle = g; c.fillRect(x, y, w, h);
  const r = rng(seed);
  for (let i = 0; i < 8; i++) {
    const cx = x + r() * w, cy = y + r() * h, rr = 8 + r() * 18;
    const sg = c.createRadialGradient(cx, cy, 1, cx, cy, rr);
    sg.addColorStop(0, 'rgba(255,170,190,0.16)'); sg.addColorStop(1, 'rgba(255,170,190,0)');
    c.fillStyle = sg; c.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  }
  for (let i = 0; i < (w * h) / 5; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,200,210,0.07)';
    c.fillRect(x + r() * w, y + r() * h, 0.8, 0.8);
  }
}

/** Polished brass/gilt fill across a rect (light from the top left). */
function brassFill(c: C, x0: number, y0: number, x1: number, y1: number, col = BRASS): CanvasGradient {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, shade(col, 0.45)); g.addColorStop(0.35, col); g.addColorStop(0.7, shade(col, -0.2)); g.addColorStop(1, shade(col, 0.15));
  return g;
}

// ---- the movement, painted on its own parts and again seen through the glass ----

/** The movement's gilt die-cast bedplate with its two cylinder brackets. */
function paintBedplate(c: C): void {
  c.fillStyle = 'rgba(20,8,4,0.35)'; c.beginPath(); rrc(c, 2, 4, 112, 146, 5); c.fill();
  c.fillStyle = brassFill(c, -56, -73, 56, 73, GILT); c.beginPath(); rrc(c, 0, 0, 110, 144, 5); c.fill();
  c.strokeStyle = shade(GILT, -0.35); c.lineWidth = 0.8; c.beginPath(); rrc(c, 0, 0, 110, 144, 5); c.stroke();
  // cast stipple, the maker's mark and the mounting screws
  const r = rng(91);
  for (let i = 0; i < 500; i++) { c.fillStyle = r() < 0.5 ? 'rgba(90,60,20,0.12)' : 'rgba(255,240,200,0.12)'; c.fillRect(-55 + r() * 110, -72 + r() * 144, 0.7, 0.7); }
  font(c, 4, 700, SERIF); c.fillStyle = shade(GILT, -0.45);
  c.fillText('CHILL ORGEL  ·  18 NOTE', 0, 22);
  c.fillText('MADE IN JAPAN', 0, 27);
  for (const [x, y] of [[-49, -66], [49, -66], [-49, 66], [49, 66]]) {
    c.fillStyle = shade(GILT, -0.3); c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = shade(GILT, -0.6); c.lineWidth = 0.8; c.beginPath(); c.moveTo(x - 2, y); c.lineTo(x + 2, y); c.stroke();
  }
}

/** Brass pinned cylinder, axis along x: the pins roll past as it turns. */
function paintCylinder(c: C, t: number, power: number): void {
  // brackets and the steel arbor
  c.fillStyle = shade(GILT, -0.15);
  for (const x of [-52, 52]) { c.beginPath(); rrc(c, x, 0, 6, 26, 1.5); c.fill(); }
  c.fillStyle = '#9aa1a8'; c.fillRect(-55, -1.6, 110, 3.2);
  // the drum
  const g = c.createLinearGradient(0, -12, 0, 12);
  g.addColorStop(0, shade(BRASS, -0.45)); g.addColorStop(0.22, shade(BRASS, 0.5)); g.addColorStop(0.42, shade(BRASS, 0.15)); g.addColorStop(0.75, shade(BRASS, -0.15)); g.addColorStop(1, shade(BRASS, -0.55));
  c.fillStyle = g; c.beginPath(); rrc(c, -4, 0, 88, 24, 2); c.fill();
  // the star wheel the governor's worm meshes with
  c.save(); c.translate(44, 0);
  c.fillStyle = shade(BRASS, -0.15); c.beginPath(); rrc(c, 0, 0, 5, 26, 1); c.fill();
  c.strokeStyle = shade(BRASS, -0.5); c.lineWidth = 0.7;
  const off = power > 0 ? (t * 8) % 2.2 : 0;
  for (let y = -12 + off; y < 13; y += 2.2) { c.beginPath(); c.moveTo(-2.5, y); c.lineTo(2.5, y); c.stroke(); }
  c.restore();
  // the pins: steel studs set in spirals, rolling over the drum's face
  const r = rng(23);
  const spin = power > 0 ? t * 1.2 : 0;
  for (let i = 0; i < 110; i++) {
    const x = -46 + Math.floor(r() * 18) * 4.8, a = r() * Math.PI * 2 + spin;
    const cz = Math.cos(a);
    if (cz < 0.05) continue;
    const y = Math.sin(a) * 11;
    c.fillStyle = `rgba(250,252,255,${0.5 + cz * 0.5})`;
    c.beginPath(); c.arc(x, y, 0.75 + cz * 0.35, 0, Math.PI * 2); c.fill();
  }
}

/** The steel comb: a heavy bar with 18 tuned teeth reaching up to the pins, lead weights under the bass. */
function paintComb(c: C, broken = false): void {
  // the bar
  const g = c.createLinearGradient(0, 6, 0, 18);
  g.addColorStop(0, '#f4f6f8'); g.addColorStop(0.4, '#c2c7ce'); g.addColorStop(1, '#7e848c');
  c.fillStyle = g; c.beginPath(); rrc(c, 0, 12, 104, 13, 1.5); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.3;
  for (let y = 6.5; y < 18; y += 0.9) { c.beginPath(); c.moveTo(-51, y); c.lineTo(51, y); c.stroke(); }
  // teeth: long bass on the left, short treble on the right, each with a polished centre
  for (let i = 0; i < 18; i++) {
    if (broken && i === 11) continue;
    const x = -44 + i * 5.15, len = 24 - i * 0.62;
    if (i < 5) {
      // the brass-coloured lead tuning weights soldered under the bass teeth
      c.fillStyle = '#7a7466'; c.beginPath(); rrc(c, x, 6 - len + 4, 3.8, 6, 1); c.fill();
    }
    const tg = c.createLinearGradient(x - 2, 0, x + 2, 0);
    tg.addColorStop(0, '#8b9097'); tg.addColorStop(0.45, '#ffffff'); tg.addColorStop(1, '#868b93');
    c.fillStyle = tg; c.fillRect(x - 1.7, 6 - len, 3.4, len);
    c.fillStyle = '#6e737b'; c.fillRect(x - 1.7, 6 - len, 3.4, 0.8);
  }
  // two blued screws hold it down, and the tuning stamp
  for (const x of [-46, 46]) {
    c.fillStyle = '#3e4f7a'; c.beginPath(); c.arc(x, 12, 3.2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#1d2440'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x - 2.2, 12); c.lineTo(x + 2.2, 12); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.arc(x - 1, 11, 1, 0, Math.PI * 2); c.fill();
  }
  font(c, 3.4, 700); c.fillStyle = '#5a5f67'; c.fillText('C  D  E  F  G  A  B  C', 0, 15);
  if (broken) {
    // a snapped tooth lying across the bar
    c.fillStyle = '#e4e7eb'; c.save(); c.translate(14, 16); c.rotate(1.25); c.fillRect(-1.7, -7, 3.4, 14); c.restore();
  }
}

/** Mainspring barrel (a brass drum with the coiled spring showing) + the worm and air-brake governor. */
function paintSpring(c: C, t: number, power: number, broken = false): void {
  // a brass bridge strip joining the two
  c.fillStyle = shade(GILT, -0.1); c.beginPath(); rrc(c, 4, 0, 78, 9, 3); c.fill();
  // ratchet drum
  c.save(); c.translate(-20, 0);
  c.fillStyle = shade(BRASS, -0.35);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    c.beginPath(); c.moveTo(Math.cos(a) * 18, Math.sin(a) * 18); c.lineTo(Math.cos(a + 0.16) * 20.5, Math.sin(a + 0.16) * 20.5); c.lineTo(Math.cos(a + 0.26) * 18, Math.sin(a + 0.26) * 18); c.fill();
  }
  const g = c.createRadialGradient(-6, -7, 2, 0, 0, 19);
  g.addColorStop(0, shade(BRASS, 0.55)); g.addColorStop(0.6, BRASS); g.addColorStop(1, shade(BRASS, -0.3));
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, 18.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#231a16'; c.beginPath(); c.arc(0, 0, 14.5, 0, Math.PI * 2); c.fill();
  // the blued steel spiral
  c.strokeStyle = '#5f7fb4'; c.lineWidth = 1.15;
  c.beginPath();
  const turns = broken ? 2 : 5;
  for (let a = 0; a < Math.PI * 2 * turns; a += 0.12) {
    const rr = 3.5 + (a / (Math.PI * 2 * turns)) * 10.5;
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.stroke();
  c.strokeStyle = 'rgba(200,220,255,0.35)'; c.lineWidth = 0.4; c.stroke();
  if (broken) {
    // sprung loose: loops of spring flopping out of the drum
    c.strokeStyle = '#5f7fb4'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(12, -6); c.bezierCurveTo(32, -24, 36, 10, 16, 15); c.bezierCurveTo(6, 18, 2, 26, 14, 26); c.stroke();
  }
  // arbor square + the click spring
  c.fillStyle = STEEL; c.fillRect(-2.6, -2.6, 5.2, 5.2);
  c.strokeStyle = '#9aa1a8'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, 21.5, -0.9, -0.2); c.stroke();
  c.restore();
  // the worm shaft and the air-brake fly
  c.save(); c.translate(24, 0);
  c.fillStyle = '#8b9097'; c.fillRect(-12, -1.5, 30, 3);
  c.strokeStyle = '#5f646c'; c.lineWidth = 0.9;
  for (let x = -10; x < 6; x += 2.2) { c.beginPath(); c.moveTo(x, -3); c.lineTo(x + 1.4, 3); c.stroke(); }
  const fa = power > 0 ? t * 30 : 0.5;
  c.save(); c.translate(14, 0); c.scale(1, Math.cos(fa));
  const fg = c.createLinearGradient(-5, 0, 5, 0);
  fg.addColorStop(0, '#9aa1a8'); fg.addColorStop(0.5, '#f4f6f8'); fg.addColorStop(1, '#8b9097');
  c.fillStyle = fg; c.beginPath(); rrc(c, 0, 0, 9, 28, 1.5); c.fill();
  c.restore();
  c.restore();
}

/** The whole bay (bedplate + movement), drawn in bay-local coordinates. */
function paintBay(c: C, t: number, power: number): void {
  paintBedplate(c);
  c.save(); c.translate(CYL.x - MECH.x, CYL.y - MECH.y); paintCylinder(c, t, power); c.restore();
  c.save(); c.translate(COMB.x - MECH.x, COMB.y - MECH.y); paintComb(c); c.restore();
  c.save(); c.translate(SPRING.x - MECH.x, SPRING.y - MECH.y); paintSpring(c, t, power); c.restore();
}

// ---------------- the box ----------------

const box: PartDef = {
  id: 'box', name: { en: 'Walnut Box', vi: 'Hộp gỗ óc chó' }, side: 'A', z: 0, x: 0, y: 0, w: 240, h: 176, icon: '🎼',
  shape: BOX, needs: ['cylinder', 'comb', 'spring', 'stage'], tool: 'brush', thick: 56, cavity: 36, round: 4, wall: 12, body: '#5a3320',
  bumps: [
    // the divider between nook and movement, standing up off the floor
    { kind: 'box', x: DIV_X, y: 0, w: 6, h: IN_H - 4, height: 30, color: '#7a4a2c' },
    // brass hinge leaves left on the back rim (the lid is off)
    { kind: 'box', x: -64, y: -82, w: 26, h: 7, height: 2.2, color: BRASS, metal: true },
    { kind: 'box', x: 64, y: -82, w: 26, h: 7, height: 2.2, color: BRASS, metal: true },
    // the lock's keeper plate on the front rim
    { kind: 'box', x: 0, y: 82, w: 14, h: 4, height: 1.2, color: BRASS, metal: true },
  ],
  draw(c) {
    // the outside and rim: four mitred walnut rails (grain runs along each rail)
    c.save(); c.clip(BOX);
    walnut(c, -122, -90, 244, 180, 3);
    const rail = (pts: number[], seed: number, vertical: boolean) => {
      c.save();
      c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.clip();
      walnut(c, -122, -90, 244, 180, seed, vertical);
      c.restore();
    };
    rail([-122, -90, 122, -90, 108, -76, -108, -76], 5, false);
    rail([-122, 90, 122, 90, 108, 76, -108, 76], 6, false);
    rail([-122, -90, -108, -76, -108, 76, -122, 90], 7, true);
    rail([122, -90, 108, -76, 108, 76, 122, 90], 8, true);
    // the outer 4 units are the box's sides once modelled: straight grain running round them
    for (let i = 0; i < 16; i++) {
      const k = (i * 7919) % 13 / 13;
      c.strokeStyle = k < 0.6 ? `rgba(50,24,10,${0.15 + k * 0.3})` : `rgba(235,185,125,${0.08 + (k - 0.6) * 0.3})`;
      c.lineWidth = 0.5 + k * 0.6;
      c.beginPath(); rrc(c, 0, 0, 240 - i * 0.55, 176 - i * 0.55, 8 - i * 0.2); c.stroke();
    }
    // the mitre joints
    c.strokeStyle = 'rgba(40,18,8,0.55)'; c.lineWidth = 0.6;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.beginPath(); c.moveTo(sx * 120, sy * 88); c.lineTo(sx * 108, sy * 76); c.stroke(); }
    // boxwood stringing inlaid round the rim, with a thin dark line either side
    c.strokeStyle = '#3a1d0e'; c.lineWidth = 2.6; c.beginPath(); rrc(c, 0, 0, 230, 166, 5); c.stroke();
    c.strokeStyle = BOXWOOD; c.lineWidth = 1.4; c.beginPath(); rrc(c, 0, 0, 230, 166, 5); c.stroke();
    // wear: the rim rubbed lighter at the corners, a small ding on the front
    for (const [x, y] of [[-116, -84], [116, -84], [-116, 84], [116, 84]]) {
      const wg = c.createRadialGradient(x, y, 1, x, y, 12);
      wg.addColorStop(0, 'rgba(220,170,110,0.35)'); wg.addColorStop(1, 'rgba(220,170,110,0)');
      c.fillStyle = wg; c.fillRect(x - 12, y - 12, 24, 24);
    }
    c.fillStyle = 'rgba(30,14,6,0.5)'; c.beginPath(); c.ellipse(-70, 84, 2.2, 0.8, 0.2, 0, Math.PI * 2); c.fill();
    c.restore();
    // hinge leaves and lock plate (their bumps rise off these)
    for (const x of [-64, 64]) {
      c.fillStyle = brassFill(c, x - 13, -86, x + 13, -78); c.beginPath(); rrc(c, x, -82, 26, 7, 1); c.fill();
      c.fillStyle = shade(BRASS, -0.45);
      for (const dx of [-8, 0, 8]) { c.beginPath(); c.arc(x + dx, -82, 1, 0, Math.PI * 2); c.fill(); }
    }
    c.fillStyle = brassFill(c, -7, 80, 7, 84); c.beginPath(); rrc(c, 0, 82, 14, 4, 1); c.fill();
    // the inside: velvet nook (left), bedplate bay (right)
    c.save(); c.clip(BOX_IN);
    velvet(c, -110, -78, 98, 156, 41);
    // buttoned tufting in the nook
    for (let j = 0; j < 5; j++) for (let i = 0; i < 2; i++) {
      const x = NOOK.x - 22 + i * 44 + (j % 2) * 0, y = -62 + j * 31;
      if (Math.hypot(x - STAGE.x, y - STAGE.y) < 34) continue;
      const bg = c.createRadialGradient(x, y, 0.5, x, y, 9);
      bg.addColorStop(0, 'rgba(0,0,0,0.35)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = bg; c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill();
      c.fillStyle = shade(VELVET, -0.2); c.beginPath(); c.arc(x, y, 2.2, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,190,200,0.3)'; c.beginPath(); c.arc(x - 0.6, y - 0.6, 0.9, 0, Math.PI * 2); c.fill();
    }
    // the hole the dancer's spindle comes up through
    c.fillStyle = '#1a0a0e'; c.beginPath(); c.arc(STAGE.x, STAGE.y, 6, 0, Math.PI * 2); c.fill();
    velvet(c, -9, -78, 120, 156, 42);
    c.save(); c.translate(MECH.x, MECH.y); paintBedplate(c); c.restore();
    // the divider's top, and an inner shadow round the walls
    walnut(c, DIV_X - 3, -76, 6, 152, 9, true);
    c.strokeStyle = 'rgba(0,0,0,0.38)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(BOX_IN);
    c.restore();
  },
};

// ---------------- the movement ----------------

const cylinder: PartDef = {
  id: 'cylinder', name: { en: 'Pinned Cylinder', vi: 'Trục ghim' }, side: 'A', z: 3, x: CYL.x, y: CYL.y, w: 112, h: 26, icon: '🥫',
  shape: rrPath(0, 0, 112, 26, 11), needs: ['glass'], thick: 22, round: 11, mat: 'metal', body: '#a0782a',
  draw(c, s) {
    paintCylinder(c, s.time, s.power);
    if (s.broken) {
      c.strokeStyle = '#f4f6f9'; c.lineWidth = 1.1;
      for (const [x, y] of [[-20, -4], [-6, 3], [14, -6]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 4, y + 3); c.stroke(); }
    }
  },
};

// the bar plus the envelope of the teeth (long bass on the left, short treble on the right)
const COMB_SHAPE = shapeFrom(roundedPts([[-53, 21, 1.5], [-53, 8, 1], [-46.5, 8, 0], [-46.5, -16.5, 1], [46.5, -5.5, 1], [46.5, 8, 0], [53, 8, 1], [53, 21, 1.5]]));
const comb: PartDef = {
  id: 'comb', name: { en: 'Tuned Steel Comb', vi: 'Lược thép' }, side: 'A', z: 3, x: COMB.x, y: COMB.y, w: 106, h: 40, icon: '🎵',
  shape: COMB_SHAPE, needs: ['glass', 'cylinder'], thick: 6, round: 1.5, mat: 'metal', body: '#8b9097',
  bumps: [
    { kind: 'box', x: 0, y: 12, w: 104, h: 13, height: 3, color: '#b9bec6', metal: true },
    { kind: 'cyl', x: -46, y: 12, w: 6.4, height: 4.4, color: '#3e4f7a', metal: true },
    { kind: 'cyl', x: 46, y: 12, w: 6.4, height: 4.4, color: '#3e4f7a', metal: true },
  ],
  draw(c, s) {
    // the gaps between the teeth: shadow on the bedplate far below
    c.fillStyle = '#4b4232'; c.fill(COMB_SHAPE);
    c.save(); c.translate(0, 2); paintComb(c, s.broken); c.restore();
  },
};

const spring: PartDef = {
  id: 'spring', name: { en: 'Spring Barrel', vi: 'Dây cót' }, side: 'A', z: 3, x: SPRING.x, y: SPRING.y, w: 86, h: 44, icon: '🌀',
  shape: shapeFrom(roundedPts([[-42, -21, 20], [-2, -21, 6], [44, -15, 6], [44, 15, 6], [-2, 21, 6], [-42, 21, 20]])), needs: ['glass', 'key'], thick: 16, round: 5, mat: 'metal', body: '#a0782a',
  bumps: [{ kind: 'cyl', x: -20, y: 0, w: 8, height: 4, color: '#c9ced6', metal: true }],
  draw(c, s) {
    c.fillStyle = shade(GILT, -0.2);
    c.beginPath(); rrc(c, 18, 0, 52, 30, 6); c.fill();
    paintSpring(c, s.time, s.power, s.broken);
  },
};

const glassPath = rrPath(0, 0, 118, 154, 4);
const glass: PartDef = {
  id: 'glass', name: { en: 'Glass Cover', vi: 'Mặt kính' }, side: 'A', z: 6, x: MECH.x, y: MECH.y, w: 118, h: 154, icon: '🪟',
  shape: glassPath, needs: ['m1', 'm2', 'm3', 'm4'], elev: 48, thick: 3.5, round: 1.2, mat: 'glass', body: '#5a3320',
  draw(c, s) {
    // a slim walnut frame round a clear pane
    walnut(c, -59, -77, 118, 154, 13, true);
    c.save();
    c.beginPath(); rrc(c, 0, 0, 104, 140, 2); c.clip();
    if (s.inDevice) {
      // the glass is clear: the bay and its movement seen through it
      velvet(c, -59, -77, 118, 154, 42);
      paintBay(c, s.time, s.power);
      c.fillStyle = 'rgba(200,230,245,0.12)';
    } else c.fillStyle = 'rgba(214,236,246,0.88)';
    c.fillRect(-59, -77, 118, 154);
    // reflections
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.beginPath(); c.moveTo(-52, -70); c.lineTo(-16, -70); c.lineTo(-52, -6); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath(); c.moveTo(-4, -70); c.lineTo(6, -70); c.lineTo(-52, 34); c.lineTo(-52, 16); c.closePath(); c.fill();
    if (s.broken) {
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 0.9;
      for (const [x0, y0, x1, y1] of [[-50, -40, 20, 30], [-30, -60, 40, -10], [0, 20, 50, 60]]) {
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
    }
    c.restore();
    // the frame's inner bevel and a little brass oval plaque
    c.strokeStyle = 'rgba(30,14,6,0.6)'; c.lineWidth = 1; c.beginPath(); rrc(c, 0, 0, 104, 140, 2); c.stroke();
    c.strokeStyle = 'rgba(255,220,170,0.25)'; c.lineWidth = 0.6; c.beginPath(); rrc(c, 0, 0, 116, 152, 3); c.stroke();
  },
};

// ---------------- the dancer's nook ----------------

const stagePath = ellPath(0, 0, 28, 28);
const stage: PartDef = {
  id: 'stage', name: { en: 'Mirror Stage', vi: 'Bệ gương xoay' }, side: 'A', z: 5, x: STAGE.x, y: STAGE.y, w: 56, h: 56, icon: '🪞',
  shape: stagePath, needs: ['dancer'], elev: 20, thick: 16, round: 2.5, mat: 'metal', body: shade(BRASS, -0.25),
  draw(c, s) {
    // a reeded brass rim round a bevelled mirror that glints as it turns
    c.fillStyle = brassFill(c, -28, -28, 28, 28); c.beginPath(); c.arc(0, 0, 28, 0, Math.PI * 2); c.fill();
    c.strokeStyle = shade(BRASS, -0.4); c.lineWidth = 0.8;
    for (let i = 0; i < 60; i++) {
      const b = (i / 60) * Math.PI * 2;
      c.beginPath(); c.moveTo(Math.cos(b) * 24.5, Math.sin(b) * 24.5); c.lineTo(Math.cos(b) * 27.6, Math.sin(b) * 27.6); c.stroke();
    }
    const g = c.createRadialGradient(-8, -10, 2, 0, 0, 23);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#d6e6ef'); g.addColorStop(1, '#7f97a8');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 23, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, 21.5, 0, Math.PI * 2); c.stroke();
    // the velvet nook reflected in the mirror
    c.fillStyle = 'rgba(126,31,51,0.25)'; c.beginPath(); c.arc(0, 0, 23, Math.PI * 0.1, Math.PI * 0.9); c.fill();
    const a = s.power > 0 ? s.time * 3 : 0.8;
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.beginPath(); c.ellipse(Math.cos(a) * 13, Math.sin(a) * 13, 7, 2.2, a + Math.PI / 2, 0, Math.PI * 2); c.fill();
    if (s.broken) {
      c.strokeStyle = 'rgba(60,70,80,0.7)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-16, -10); c.lineTo(-2, 2); c.lineTo(-6, 16); c.moveTo(-2, 2); c.lineTo(14, -4); c.stroke();
    }
  },
};

// The dancer seen from above: a layered tulle tutu, arms raised in a hoop over her bun.
const TUTU = shapeFrom(roundedPts(Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2, r = i % 2 ? 19.5 : 22.5;
  return [Math.cos(a) * r, Math.sin(a) * r, 5] as [number, number, number];
})));
const dancer: PartDef = {
  id: 'dancer', name: { en: 'Little Ballerina', vi: 'Vũ công ba-lê' }, side: 'A', z: 7, x: STAGE.x, y: STAGE.y, w: 46, h: 46, icon: '🩰',
  shape: TUTU, tool: 'sponge', thick: 8, round: 6, body: shade(PINK, -0.15),
  bumps: [
    // torso, head, the bun on top: coaxial, so tipped over she reads as a little figure
    { kind: 'cyl', x: 0, y: 0, w: 7.5, height: 11, color: '#f08aa6' } as Bump,
    { kind: 'cyl', x: 0, y: -0.5, w: 5.8, height: 17, color: SKIN } as Bump,
    { kind: 'cyl', x: 0, y: -0.5, w: 3.6, height: 19.5, color: '#5a3424' } as Bump,
  ],
  draw(c, s) {
    c.save();
    c.rotate(s.power > 0 ? s.time * 3 : 0.3);
    // three layers of tulle, each scalloped, with a few sequins
    c.fillStyle = shade(PINK, -0.12); c.fill(TUTU);
    for (const [k, col] of [[0.86, shade(PINK, 0.05)], [0.68, shade(PINK, 0.2)]] as const) {
      c.save(); c.scale(k, k); c.rotate(0.2); c.fillStyle = col; c.fill(TUTU); c.restore();
    }
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 0.6;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      c.beginPath(); c.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); c.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); c.stroke();
    }
    c.fillStyle = 'rgba(255,240,200,0.9)';
    for (let i = 0; i < 10; i++) { const a = i * 2.39; c.beginPath(); c.arc(Math.cos(a) * (9 + (i % 3) * 3.5), Math.sin(a) * (9 + (i % 3) * 3.5), 0.6, 0, Math.PI * 2); c.fill(); }
    // bodice, arms in a hoop overhead (one snapped off when broken), head, bun, pink bow
    c.fillStyle = '#f08aa6'; c.beginPath(); c.ellipse(0, 0, 6, 5, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = SKIN; c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath(); c.arc(0, -1, 9, Math.PI * 0.95, s.broken ? Math.PI * 1.5 : Math.PI * 2.05); c.stroke();
    c.fillStyle = SKIN; c.beginPath(); c.arc(0, -0.5, 4.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5a3424'; c.beginPath(); c.arc(0, -0.5, 3.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ff6f96'; c.beginPath(); c.ellipse(-2.4, -3.4, 1.8, 1, 0.5, 0, Math.PI * 2); c.ellipse(2.4, -3.4, 1.8, 1, -0.5, 0, Math.PI * 2); c.fill();
    if (s.broken) {
      c.fillStyle = 'rgba(240,230,200,0.85)'; c.beginPath(); c.arc(9, -3, 2.2, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },
};

// ---------------- the butterfly key, through the right side ----------------

const KEY = shapeFrom(roundedPts([
  [-18, -2.6, 1], [2, -2.6, 1], [4, -4.5, 1], [8, -15, 6], [20, -13, 5], [20, 13, 5], [8, 15, 6], [4, 4.5, 1], [2, 2.6, 1], [-18, 2.6, 1],
]));
const key: PartDef = {
  id: 'key', name: { en: 'Winding Key', vi: 'Chìa lên dây' }, side: 'A', z: 7, x: 136, y: 40, w: 38, h: 30, icon: '🗝',
  shape: KEY, elev: 24, thick: 7, round: 3, mat: 'metal', body: shade(BRASS, -0.3),
  draw(c, s) {
    c.fillStyle = brassFill(c, -18, -15, 20, 15); c.fill(KEY);
    // the wings' pierced hearts, the shaft's turned rings
    c.fillStyle = shade(BRASS, -0.5);
    c.beginPath(); c.ellipse(13, -7, 2.6, 3.4, 0.3, 0, Math.PI * 2); c.ellipse(13, 7, 2.6, 3.4, -0.3, 0, Math.PI * 2); c.fill();
    c.fillStyle = shade(BRASS, -0.3);
    for (const x of [-6, 0]) c.fillRect(x, -2.6, 1.2, 5.2);
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(-16, -1.6, 16, 1);
    // the escutcheon washer where it enters the box
    c.fillStyle = brassFill(c, -18, -5, -14, 5); c.beginPath(); rrc(c, -16.5, 0, 3, 10, 1); c.fill();
    if (s.broken) {
      c.strokeStyle = '#6a4a1c'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-6, -2.6); c.lineTo(-4, 0); c.lineTo(-7, 2.6); c.stroke();
    }
  },
};

export const musicbox: DeviceDef = {
  id: 'musicbox',
  name: { en: 'Ballerina Music Box', vi: 'Hộp nhạc ba-lê' },
  w: 304, h: 176,
  hasBack: false,
  parts: [
    box, cylinder, comb, spring, glass, stage, dancer, key,
    screw('m1', -2, -70, 'A'), screw('m2', 102, -70, 'A'), screw('m3', -2, 70, 'A'), screw('m4', 102, 70, 'A'),
  ],
  working(c, t, k) {
    c.save();
    // a warm glow over the little stage + notes floating off the comb
    c.globalAlpha = k * 0.45;
    const g = c.createRadialGradient(STAGE.x, STAGE.y, 4, STAGE.x, STAGE.y, 70);
    g.addColorStop(0, 'rgba(255,214,230,0.9)'); g.addColorStop(1, 'rgba(255,214,230,0)');
    c.fillStyle = g; c.beginPath(); c.arc(STAGE.x, STAGE.y, 70, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 4; i++) {
      const p = (t * 0.45 + i / 4) % 1;
      const x = COMB.x - 30 + i * 22 + Math.sin(t * 2 + i) * 8, y = COMB.y - 20 - p * 90;
      c.globalAlpha = k * Math.sin(p * Math.PI);
      c.fillStyle = i % 2 ? '#ff8fb1' : '#ffd36b';
      c.beginPath(); c.ellipse(x, y, 5, 3.8, -0.4, 0, Math.PI * 2); c.fill();
      c.fillRect(x + 3.6, y - 16, 1.8, 16);
      c.beginPath(); c.moveTo(x + 5.4, y - 16); c.quadraticCurveTo(x + 12, y - 12, x + 9, y - 6); c.lineTo(x + 5.4, y - 11); c.fill();
    }
    c.restore();
  },
  workFx: { kind: 'note', x: COMB.x, y: COMB.y - 30, color: '#ffb3c8', dir: -Math.PI / 2 },
};
