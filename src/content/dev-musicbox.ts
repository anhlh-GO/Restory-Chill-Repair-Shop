// Wooden music box with the lid off: velvet nook with a tiny dancer, brass comb and pinned cylinder under glass.

import { type C, slab, shade, rrc, rrPath, ellPath, glossStreak, rng, shapeFrom, roundedPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';

const WOOD = '#b8794a';
const WOOD_L = '#d9a56f';
const VELVET = '#b8434e';
const BRASS = '#e0b04a';
const STEEL = '#c9ced6';
const PINK = '#ffb3c8';

const BOX = rrPath(0, 0, 240, 176, 14);
const BOX_IN = rrPath(0, 0, 216, 152, 6);
// The two compartments inside the box.
const NOOK = { x: -64, y: 0, w: 88, h: 152 };
const MECH = { x: 50, y: 0, w: 118, h: 152 };
const CYL = { x: 50, y: -34 };
const COMB = { x: 50, y: -2 };
const SPRING = { x: 46, y: 48 };
const STAGE = { x: -64, y: -8 };

// ---- the mechanism, painted on its own parts and again seen through the glass ----

/** Brass pinned cylinder, axis along x: the pins roll past as it turns. */
function paintCylinder(c: C, t: number, power: number): void {
  c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -3, 5, 104, 28, 12); c.fill();
  // steel arbor + a little gear at the right end
  c.fillStyle = '#9aa1a8'; c.fillRect(-54, -2, 108, 4);
  const g = c.createLinearGradient(0, -14, 0, 14);
  g.addColorStop(0, shade(BRASS, -0.35)); g.addColorStop(0.3, shade(BRASS, 0.45)); g.addColorStop(0.6, BRASS); g.addColorStop(1, shade(BRASS, -0.5));
  c.fillStyle = g; c.beginPath(); rrc(c, -4, 0, 88, 28, 6); c.fill();
  c.save(); c.translate(46, 0);
  c.fillStyle = shade(BRASS, -0.2); c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.fill();
  c.strokeStyle = shade(BRASS, -0.45); c.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + (power > 0 ? t * 1.5 : 0);
    c.beginPath(); c.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); c.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); c.stroke();
  }
  c.restore();
  // the pins: tiny steel studs that scroll over the drum's face
  const r = rng(23);
  const spin = power > 0 ? t * 1.2 : 0;
  c.fillStyle = '#f4f6f9';
  for (let i = 0; i < 70; i++) {
    const x = -44 + Math.floor(r() * 18) * 4.9, a = r() * Math.PI * 2 + spin;
    if (Math.cos(a) < 0.1) continue;
    c.beginPath(); c.arc(x, Math.sin(a) * 12, 1.1, 0, Math.PI * 2); c.fill();
  }
}

/** The steel comb: a heavy bar with 18 tuned teeth reaching up to the pins. */
function paintComb(c: C, broken = false): void {
  c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -3, 9, 100, 18, 3); c.fill();
  const g = c.createLinearGradient(0, 2, 0, 18);
  g.addColorStop(0, '#f2f4f7'); g.addColorStop(1, '#8b9097');
  c.fillStyle = g; c.beginPath(); rrc(c, 0, 9, 100, 18, 3); c.fill();
  for (let i = 0; i < 18; i++) {
    if (broken && i === 11) continue;
    const x = -44 + i * 5.2, len = 22 - i * 0.5;
    const tg = c.createLinearGradient(x - 2, 0, x + 2, 0);
    tg.addColorStop(0, '#9aa1a8'); tg.addColorStop(0.5, '#ffffff'); tg.addColorStop(1, '#8b9097');
    c.fillStyle = tg; c.fillRect(x - 1.8, 1 - len, 3.6, len);
  }
  // brass screws at either end of the bar + a lead weight block for the bass
  c.fillStyle = BRASS;
  for (const x of [-42, 42]) { c.beginPath(); c.arc(x, 11, 3, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#6a6e76'; c.fillRect(-46, 3, 14, 4);
  if (broken) {
    // a snapped tooth lying sideways
    c.fillStyle = '#dfe3e8'; c.save(); c.translate(16, 22); c.rotate(1.2); c.fillRect(-1.8, -6, 3.6, 12); c.restore();
  }
}

/** Mainspring barrel (a brass drum with the coiled spring showing) + the little fly governor. */
function paintSpring(c: C, t: number, power: number, broken = false): void {
  c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -3, 5, 84, 40, 18); c.fill();
  // bedplate strip joining the two
  c.fillStyle = '#9aa1a8'; c.beginPath(); rrc(c, 0, 0, 80, 10, 4); c.fill();
  // ratchet drum
  c.save(); c.translate(-20, 0);
  c.fillStyle = shade(BRASS, -0.4);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    c.beginPath(); c.moveTo(Math.cos(a) * 18, Math.sin(a) * 18); c.lineTo(Math.cos(a + 0.18) * 21, Math.sin(a + 0.18) * 21); c.lineTo(Math.cos(a + 0.3) * 18, Math.sin(a + 0.3) * 18); c.fill();
  }
  const g = c.createRadialGradient(-6, -7, 2, 0, 0, 19);
  g.addColorStop(0, shade(BRASS, 0.5)); g.addColorStop(1, shade(BRASS, -0.2));
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, 19, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#3a3330'; c.beginPath(); c.arc(0, 0, 14, 0, Math.PI * 2); c.fill();
  // the blued steel spiral
  c.strokeStyle = '#6a8ab8'; c.lineWidth = 1.3;
  c.beginPath();
  const turns = broken ? 2 : 4.5;
  for (let a = 0; a < Math.PI * 2 * turns; a += 0.15) {
    const rr = 3 + (a / (Math.PI * 2 * turns)) * 10;
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.stroke();
  if (broken) {
    // sprung loose: a loop of spring flopping out of the drum
    c.beginPath(); c.moveTo(12, -6); c.bezierCurveTo(30, -22, 34, 8, 16, 14); c.stroke();
  }
  c.fillStyle = STEEL; c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fill();
  c.restore();
  // fly governor: two little fan blades on a worm
  c.save(); c.translate(24, 0);
  c.fillStyle = '#8b9097'; c.fillRect(-10, -1.5, 22, 3);
  c.strokeStyle = '#6a6e76'; c.lineWidth = 1;
  for (let x = -8; x < 10; x += 2.5) { c.beginPath(); c.moveTo(x, -3); c.lineTo(x + 1.5, 3); c.stroke(); }
  const fa = power > 0 ? t * 30 : 0.4;
  c.fillStyle = 'rgba(230,236,242,0.95)';
  c.save(); c.translate(14, 0); c.scale(1, Math.cos(fa));
  c.beginPath(); rrc(c, 0, 0, 8, 26, 2); c.fill();
  c.restore();
  c.restore();
}

// ---- parts ----

const box: PartDef = {
  id: 'box', name: { en: 'Wooden Box', vi: 'Hộp gỗ' }, side: 'A', z: 0, x: 0, y: 0, w: 240, h: 176, icon: '🎼',
  shape: BOX, needs: ['cylinder', 'comb', 'spring', 'stage'], tool: 'brush', thick: 56, cavity: 36, round: 6, wall: 12,
  draw(c) {
    slab(c, BOX, WOOD, -88, 88, { depth: 12, shadow: 0 });
    glossStreak(c, BOX, -120, -88, 240, 120, 0.22);
    // wood grain on the rim
    c.save(); c.clip(BOX);
    c.strokeStyle = 'rgba(90,45,20,0.25)'; c.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      c.beginPath(); c.moveTo(-120, -86 + i * 22);
      c.bezierCurveTo(-40, -80 + i * 22, 40, -92 + i * 22, 120, -84 + i * 22); c.stroke();
    }
    c.restore();
    // the deep inside
    c.fillStyle = shade(WOOD, -0.35); c.fill(BOX_IN);
    // velvet nook with buttoned tufting
    c.fillStyle = VELVET; c.beginPath(); rrc(c, NOOK.x, NOOK.y, NOOK.w, NOOK.h, 5); c.fill();
    c.fillStyle = shade(VELVET, -0.3);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(NOOK.x - 20 + i * 40 + (j % 2) * 10, -54 + j * 36, 2.5, 0, Math.PI * 2); c.fill(); }
    // light wood floor of the mechanism bay
    c.fillStyle = WOOD_L; c.beginPath(); rrc(c, MECH.x, MECH.y, MECH.w - 4, MECH.h, 4); c.fill();
    c.strokeStyle = 'rgba(140,80,40,0.2)';
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-6, -70 + i * 28); c.lineTo(106, -64 + i * 28); c.stroke(); }
    c.save(); c.clip(BOX_IN);
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(BOX_IN);
    c.restore();
    // divider + brass corner caps + inlaid line
    c.fillStyle = shade(WOOD, -0.1); c.fillRect(-12, -76, 6, 152);
    c.strokeStyle = shade(WOOD_L, 0.2); c.lineWidth = 1.2;
    c.beginPath(); rrc(c, 0, 0, 230, 166, 10); c.stroke();
    c.fillStyle = BRASS;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      c.beginPath(); c.moveTo(sx * 120, sy * 88 - sy * 18); c.lineTo(sx * 120, sy * 88); c.lineTo(sx * 120 - sx * 18, sy * 88); c.closePath(); c.fill();
    }
  },
};

const cylinder: PartDef = {
  id: 'cylinder', name: { en: 'Pinned Cylinder', vi: 'Trục ghim' }, side: 'A', z: 3, x: CYL.x, y: CYL.y, w: 108, h: 30, icon: '🥫',
  shape: rrPath(0, 0, 108, 30, 14), needs: ['glass'], thick: 24, round: 14, mat: 'metal', body: '#a0782a',
  draw(c, s) {
    paintCylinder(c, s.time, s.power);
    if (s.broken) {
      // a few pins bent flat
      c.strokeStyle = '#f4f6f9'; c.lineWidth = 1.2;
      for (const [x, y] of [[-20, -4], [-6, 3], [14, -6]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 4, y + 3); c.stroke(); }
      c.fillStyle = 'rgba(80,50,20,0.35)'; c.beginPath(); c.ellipse(4, 0, 18, 8, 0, 0, Math.PI * 2); c.fill();
    }
  },
};

const comb: PartDef = {
  id: 'comb', name: { en: 'Brass Comb', vi: 'Lược đồng' }, side: 'A', z: 3, x: COMB.x, y: COMB.y, w: 104, h: 40, icon: '🎵',
  shape: rrPath(0, 0, 104, 40, 4), needs: ['glass', 'cylinder'], thick: 6, round: 2, mat: 'metal', body: '#8b9097',
  draw(c, s) {
    c.save(); c.translate(0, 2);
    paintComb(c, s.broken);
    c.restore();
  },
};

const spring: PartDef = {
  id: 'spring', name: { en: 'Clockwork Spring', vi: 'Dây cót' }, side: 'A', z: 3, x: SPRING.x, y: SPRING.y, w: 84, h: 42, icon: '🌀',
  shape: rrPath(0, 0, 84, 42, 18), needs: ['glass', 'key'], thick: 20, round: 8, mat: 'metal', body: '#a0782a',
  draw(c, s) { paintSpring(c, s.time, s.power, s.broken); },
};

const glassPath = rrPath(0, 0, 120, 156, 6);
const glass: PartDef = {
  id: 'glass', name: { en: 'Glass Panel', vi: 'Mặt kính' }, side: 'A', z: 6, x: MECH.x, y: MECH.y, w: 120, h: 156, icon: '🪟',
  shape: glassPath, needs: ['m1', 'm2', 'm3', 'm4'], elev: 48, thick: 3, round: 1, mat: 'glass', body: '#b9d6e0',
  draw(c, s) {
    if (s.inDevice) {
      // the glass is clear: paint the bay and its mechanism seen through it
      c.fillStyle = WOOD_L; c.beginPath(); rrc(c, 0, 0, 120, 156, 6); c.fill();
      c.save(); c.translate(CYL.x - MECH.x, CYL.y - MECH.y); paintCylinder(c, s.time, s.power); c.restore();
      c.save(); c.translate(COMB.x - MECH.x, COMB.y - MECH.y + 2); paintComb(c); c.restore();
      c.save(); c.translate(SPRING.x - MECH.x, SPRING.y - MECH.y); paintSpring(c, s.time, s.power); c.restore();
      c.fillStyle = 'rgba(190,225,240,0.18)';
    } else c.fillStyle = 'rgba(205,232,245,0.85)';
    c.beginPath(); rrc(c, 0, 0, 120, 156, 6); c.fill();
    // reflections
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath(); c.moveTo(-56, -76); c.lineTo(-18, -76); c.lineTo(-56, -10); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-4, -76); c.lineTo(6, -76); c.lineTo(-56, 30); c.lineTo(-56, 13); c.closePath(); c.fill();
    if (s.broken) {
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 0.9;
      for (const [x0, y0, x1, y1] of [[-50, -40, 20, 30], [-30, -60, 40, -10], [0, 20, 50, 60], [-46, 50, -10, 10], [10, -70, 54, -30]]) {
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
    }
    // brass frame round the pane
    c.strokeStyle = BRASS; c.lineWidth = 4;
    c.beginPath(); rrc(c, 0, 0, 116, 152, 5); c.stroke();
    c.strokeStyle = shade(BRASS, 0.4); c.lineWidth = 1;
    c.beginPath(); rrc(c, 0, -1, 116, 152, 5); c.stroke();
  },
};

const stagePath = ellPath(0, 0, 28, 28);
const stage: PartDef = {
  id: 'stage', name: { en: 'Turntable Stage', vi: 'Bệ xoay' }, side: 'A', z: 5, x: STAGE.x, y: STAGE.y, w: 56, h: 56, icon: '🪞',
  shape: stagePath, needs: ['dancer'], elev: 20, thick: 30, round: 3, body: shade(BRASS, -0.25),
  draw(c, s) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); c.arc(-3, 5, 28, 0, Math.PI * 2); c.fill();
    // brass rim, mirror top that glints as it turns
    c.fillStyle = BRASS; c.beginPath(); c.arc(0, 0, 28, 0, Math.PI * 2); c.fill();
    const g = c.createRadialGradient(-8, -10, 2, 0, 0, 23);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#cfe3ee'); g.addColorStop(1, '#8aa3b4');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 23, 0, Math.PI * 2); c.fill();
    const a = s.power > 0 ? s.time * 3 : 0.8;
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.beginPath(); c.ellipse(Math.cos(a) * 12, Math.sin(a) * 12, 7, 2.5, a + Math.PI / 2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = shade(BRASS, -0.3); c.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
      const b = (i / 24) * Math.PI * 2;
      c.beginPath(); c.moveTo(Math.cos(b) * 24, Math.sin(b) * 24); c.lineTo(Math.cos(b) * 27.5, Math.sin(b) * 27.5); c.stroke();
    }
    if (s.broken) {
      c.strokeStyle = 'rgba(60,70,80,0.7)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-16, -10); c.lineTo(-2, 2); c.lineTo(-6, 16); c.moveTo(-2, 2); c.lineTo(14, -4); c.stroke();
    }
  },
};

// The dancer seen from above: a frilly tutu, arms raised in a hoop over her bun.
const TUTU = shapeFrom(roundedPts(Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2, r = i % 2 ? 19 : 23;
  return [Math.cos(a) * r, Math.sin(a) * r, 6] as [number, number, number];
})));
const dancer: PartDef = {
  id: 'dancer', name: { en: 'Little Dancer', vi: 'Vũ công' }, side: 'A', z: 7, x: STAGE.x, y: STAGE.y, w: 46, h: 46, icon: '🩰',
  shape: TUTU, tool: 'sponge', thick: 10, round: 8, body: shade(PINK, -0.2),
  bumps: [{ kind: 'cyl', x: 0, y: 0, w: 11, height: 16, color: '#5a3424' }],
  draw(c, s) {
    c.save();
    c.rotate(s.power > 0 ? s.time * 3 : 0.3);
    // scalloped tulle, two layers
    c.fillStyle = shade(PINK, -0.15); c.fill(TUTU);
    c.save(); c.scale(0.78, 0.78); c.fillStyle = PINK; c.fill(TUTU); c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.beginPath(); c.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); c.lineTo(Math.cos(a) * 18, Math.sin(a) * 18); c.stroke();
    }
    // bodice
    c.fillStyle = '#ff7fa3'; c.beginPath(); c.ellipse(0, 0, 9, 7, 0, 0, Math.PI * 2); c.fill();
    // arms in a hoop overhead (one snapped off when broken)
    c.strokeStyle = '#f3d2bd'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.arc(0, -2, 10, Math.PI * 0.95, s.broken ? Math.PI * 1.5 : Math.PI * 2.05); c.stroke();
    // head + bun + pink bow
    c.fillStyle = '#f3d2bd'; c.beginPath(); c.arc(0, -1, 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5a3424'; c.beginPath(); c.arc(0, -1, 3.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ff5f8a'; c.beginPath(); c.ellipse(-3, -4, 2.2, 1.2, 0.5, 0, Math.PI * 2); c.ellipse(3, -4, 2.2, 1.2, -0.5, 0, Math.PI * 2); c.fill();
    if (s.broken) {
      c.fillStyle = 'rgba(240,230,200,0.85)'; c.beginPath(); c.arc(9, -3, 2.5, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },
};

// Butterfly winding key poking out of the box's right side.
const KEY = shapeFrom(roundedPts([
  [-16, -4, 1], [0, -4, 2], [6, -16, 6], [16, -14, 5], [16, 14, 5], [6, 16, 6], [0, 4, 2], [-16, 4, 1],
]));
const key: PartDef = {
  id: 'key', name: { en: 'Winding Key', vi: 'Chìa lên dây' }, side: 'A', z: 7, x: 136, y: 40, w: 32, h: 34, icon: '🗝',
  shape: KEY, elev: 22, thick: 6, round: 2, mat: 'metal', body: shade(BRASS, -0.3),
  draw(c, s) {
    slab(c, KEY, BRASS, -16, 16, { depth: 3, shadow: 0 });
    c.fillStyle = shade(BRASS, -0.35);
    c.beginPath(); c.arc(9, -7, 2.4, 0, Math.PI * 2); c.arc(9, 7, 2.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(-14, -2.5, 12, 1.5);
    if (s.broken) {
      c.strokeStyle = '#6a4a1c'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(-6, -4); c.lineTo(-4, 0); c.lineTo(-7, 4); c.stroke();
    }
  },
};

export const musicbox: DeviceDef = {
  id: 'musicbox',
  name: { en: 'Music Box', vi: 'Hộp nhạc' },
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
