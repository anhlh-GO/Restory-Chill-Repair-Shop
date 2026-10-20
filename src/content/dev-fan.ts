// Retro desk fan lying on its back: mint housing, chrome cage, peach blades. One face.

import { type C, type Pts, slab, shade, rrc, rrPath, ellPath, glossStreak, text, shapeFrom, roundedPts, ellPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { coil, boss } from './kit';

const MINT = '#7fd1c1';
const CHROME = '#d9dde3';
const PEACH = '#ffa47e';
const CREAM = '#fbf1dc';
const RED = '#e0473c';

// The cage circle sits at (0, CY); the pedestal foot hangs below it.
const CY = -18;
const R0 = 112;

/** Housing outline: a big disc plus a flared foot, `inset` units in. */
function housingPts(inset = 0): Pts {
  const v: [number, number, number][] = [];
  const r = R0 - inset;
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 + 0.5 + (i / n) * (Math.PI * 2 - 1);
    v.push([Math.cos(a) * r, CY + Math.sin(a) * r, i === 0 || i === n ? 10 : 0]);
  }
  v.push([78 - inset, 132 - inset, 14], [-78 + inset, 132 - inset, 14]);
  return roundedPts(v);
}

const HOUSING = shapeFrom(housingPts());
const HOUSING_IN = shapeFrom(housingPts(10));

const housing: PartDef = {
  id: 'housing', name: { en: 'Fan Housing', vi: 'Vỏ đế quạt' }, side: 'A', z: 0, x: 0, y: 0, w: 224, h: 262, icon: '🟢',
  shape: HOUSING, needs: ['motor', 'plug'], tool: 'sponge', thick: 40, cavity: 28, round: 14, wall: 10,
  draw(c) {
    slab(c, HOUSING, MINT, -130, 132, { depth: 12, shadow: 0 });
    glossStreak(c, HOUSING, -112, -130, 224, 140, 0.28);
    c.fillStyle = shade(MINT, -0.42);
    c.fill(HOUSING_IN);
    c.save(); c.clip(HOUSING_IN);
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 14; c.translate(3, 5); c.stroke(HOUSING_IN);
    c.restore();
    // rear vents radiating round the motor mount
    c.strokeStyle = shade(MINT, -0.62); c.lineWidth = 5; c.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      c.beginPath();
      c.moveTo(Math.cos(a) * 48, CY + Math.sin(a) * 48);
      c.lineTo(Math.cos(a) * 88, CY + Math.sin(a) * 88);
      c.stroke();
    }
    c.fillStyle = shade(MINT, -0.25);
    c.beginPath(); c.arc(0, CY, 38, 0, Math.PI * 2); c.fill();
    boss(c, 0, CY - 26, MINT); boss(c, 0, CY + 26, MINT);
    // cord channel down the foot
    c.fillStyle = shade(MINT, -0.55);
    c.beginPath(); rrc(c, 0, 108, 70, 26, 10); c.fill();
  },
};

const plug: PartDef = {
  id: 'plug', name: { en: 'Power Cord', vi: 'Dây nguồn' }, side: 'A', z: 2, x: 0, y: 112, w: 60, h: 24, icon: '🔌',
  shape: rrPath(0, 0, 60, 24, 10), needs: ['switch'], thick: 8, round: 4, mat: 'rubber', body: '#5a4a3a',
  draw(c, s) {
    // a little coil of cream cord with a grommet and two bare leads
    c.lineCap = 'round';
    const p = new Path2D();
    p.moveTo(-26, 2);
    for (let x = -26; x <= 10; x += 6) p.quadraticCurveTo(x + 3, -9, x + 6, 2);
    c.strokeStyle = 'rgba(10,20,40,0.3)'; c.lineWidth = 7;
    c.save(); c.translate(-2, 3); c.stroke(p); c.restore();
    c.strokeStyle = '#d9c7a8'; c.lineWidth = 6; c.stroke(p);
    c.strokeStyle = '#f7ecd6'; c.lineWidth = 2; c.stroke(p);
    c.fillStyle = '#3a2f28';
    c.beginPath(); rrc(c, 18, 0, 14, 18, 5); c.fill();
    for (const [y, col] of [[-4, '#c0392b'], [4, '#2b2b33']] as const) {
      c.strokeStyle = col; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(24, y); c.lineTo(28, y); c.stroke();
    }
    if (s.broken) {
      c.strokeStyle = '#c87a2e'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-4, -4); c.lineTo(0, -10); c.moveTo(-2, -3); c.lineTo(4, -9); c.stroke();
    }
  },
};

const motor: PartDef = {
  id: 'motor', name: { en: 'Motor', vi: 'Mô-tơ' }, side: 'A', z: 3, x: 0, y: CY, w: 64, h: 64, icon: '⚙️',
  shape: ellPath(0, 0, 32, 32), needs: ['rear'], elev: 12, thick: 18, round: 16, mat: 'metal', body: '#8a8f99',
  draw(c, s) {
    const g = c.createRadialGradient(-10, -12, 2, 0, 0, 32);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, CHROME); g.addColorStop(1, '#6b7078');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, 32, 0, Math.PI * 2); c.fill();
    // copper windings peeking through the slots
    for (let i = 0; i < 4; i++) {
      c.save();
      c.rotate((i / 4) * Math.PI * 2 + Math.PI / 4);
      c.translate(0, -19);
      coil(c, 14, 8);
      c.restore();
    }
    // shaft + bearing
    c.fillStyle = '#4a4e57'; c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#eef0f3'; c.beginPath(); c.arc(0, 0, 3.5, 0, Math.PI * 2); c.fill();
    // lead terminals at the rim
    const leads = ['#e8574a', '#3d7fd8', '#f1c232', '#2b2b33'];
    leads.forEach((col, i) => {
      const x = -12 + i * 8;
      c.fillStyle = col; c.beginPath(); rrc(c, x, 25, 5, 9, 2); c.fill();
      c.fillStyle = '#e8c15a'; c.beginPath(); c.arc(x, 21, 1.8, 0, Math.PI * 2); c.fill();
    });
    if (s.broken) {
      c.strokeStyle = '#3a2a1a'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-12, 25); c.lineTo(-18, 14); c.stroke();
      c.fillStyle = 'rgba(30,20,10,0.6)'; c.beginPath(); c.arc(14, -14, 7, 0, Math.PI * 2); c.fill();
    }
  },
};

const REAR = shapeFrom(ellPts(0, 0, 100, 100, 64), [ellPts(0, 0, 36, 36, 40)]);
const rear: PartDef = {
  id: 'rear', name: { en: 'Rear Cage', vi: 'Lồng quạt sau' }, side: 'A', z: 4, x: 0, y: CY, w: 200, h: 200, icon: '◎',
  shape: REAR, needs: ['rotor'], elev: 22, thick: 4, round: 2, mat: 'metal', body: '#9aa0a8',
  draw(c) {
    c.save();
    c.clip(REAR);
    c.fillStyle = '#a9afb8';
    c.fillRect(-100, -100, 200, 200);
    c.strokeStyle = '#6f757e'; c.lineWidth = 2.5;
    for (const r of [48, 64, 80, 94]) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
    c.strokeStyle = '#eef0f3'; c.lineWidth = 2;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      c.beginPath(); c.moveTo(Math.cos(a) * 38, Math.sin(a) * 38); c.lineTo(Math.cos(a) * 98, Math.sin(a) * 98); c.stroke();
    }
    c.restore();
  },
};

// Four rounded petal blades as one outline (polar: hub radius + a lobe per blade).
const BLADES = 4;
const HUB = 20;
const BLADE_R = 90;
function rotorPts(): Pts {
  const out: Pts = [];
  const n = 160, hw = 0.62;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let r = HUB;
    for (let b = 0; b < BLADES; b++) {
      let u = a - (b / BLADES) * Math.PI * 2;
      u = Math.atan2(Math.sin(u), Math.cos(u));
      if (Math.abs(u) < hw) r = Math.max(r, HUB + (BLADE_R - HUB) * Math.pow(1 - (u / hw) * (u / hw), 0.45));
    }
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
}
const ROTOR = shapeFrom(rotorPts());

const rotor: PartDef = {
  id: 'rotor', name: { en: 'Fan Blades', vi: 'Cánh quạt' }, side: 'A', z: 6, x: 0, y: CY, w: 180, h: 180, icon: '✤',
  shape: ROTOR, needs: ['spinner'], tool: 'brush', elev: 29, thick: 4, round: 2, body: shade(PEACH, -0.3),
  draw(c, s) {
    c.save();
    c.clip(ROTOR);
    const g = c.createRadialGradient(0, 0, HUB, 0, 0, BLADE_R);
    g.addColorStop(0, shade(PEACH, -0.15)); g.addColorStop(0.6, PEACH); g.addColorStop(1, shade(PEACH, 0.25));
    c.fillStyle = g;
    c.fillRect(-BLADE_R, -BLADE_R, BLADE_R * 2, BLADE_R * 2);
    // a soft twist on each blade: shaded leading edge, glossy trailing edge
    for (let b = 0; b < BLADES; b++) {
      c.save();
      c.rotate((b / BLADES) * Math.PI * 2);
      c.fillStyle = 'rgba(160,60,30,0.22)';
      c.beginPath(); c.moveTo(HUB, 0); c.quadraticCurveTo(BLADE_R * 0.6, -BLADE_R * 0.55, BLADE_R, -10); c.lineTo(BLADE_R, -60); c.lineTo(HUB, -30); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.beginPath(); c.ellipse(BLADE_R * 0.62, 12, 22, 7, 0.2, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    if (s.power > 0) {
      // motion blur: smear the blades round
      c.fillStyle = `rgba(255,190,150,${0.6 * s.power})`;
      c.beginPath(); c.arc(0, 0, BLADE_R, 0, Math.PI * 2); c.fill();
    }
    if (s.broken) {
      // a chipped blade tip
      c.strokeStyle = '#7a3a1a'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(70, -14); c.lineTo(60, -2); c.lineTo(72, 8); c.stroke();
    }
    c.restore();
    c.fillStyle = '#4a4e57'; c.beginPath(); c.arc(0, 0, HUB, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6b7078'; c.beginPath(); c.arc(0, 0, HUB - 5, 0, Math.PI * 2); c.fill();
  },
};

const spinner: PartDef = {
  id: 'spinner', name: { en: 'Spinner Badge', vi: 'Nút chặn cánh' }, side: 'A', z: 7, x: 0, y: CY, w: 34, h: 34, icon: '🔴',
  shape: ellPath(0, 0, 17, 17), needs: ['cage'], elev: 33, thick: 10, round: 9, body: shade(RED, -0.35),
  draw(c, s) {
    const g = c.createRadialGradient(-5, -6, 1, 0, 0, 17);
    g.addColorStop(0, shade(RED, 0.5)); g.addColorStop(0.6, RED); g.addColorStop(1, shade(RED, -0.3));
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, 17, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#e8b54a'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(0, 0, 14, 0, Math.PI * 2); c.stroke();
    c.save();
    c.rotate(s.power > 0 ? s.time * 9 : 0);
    text(c, '❀', 0, 1, 14, CREAM, { font: 'bold' });
    c.restore();
  },
};

// Front cage: a real wire grille (spokes + rings are the solid part, the gaps are holes).
function cagePts(): { outer: Pts; holes: Pts[] } {
  const holes: Pts[] = [ellPts(0, 0, 20, 20, 32)];
  const band = (r0: number, r1: number, n: number, off: number) => {
    for (let i = 0; i < n; i++) {
      const a0 = off + (i / n) * Math.PI * 2, a1 = off + ((i + 1) / n) * Math.PI * 2;
      const p: Pts = [];
      const da0 = 2 / r0, da1 = 2 / r1;
      for (let k = 0; k <= 4; k++) { const a = a0 + da1 + ((a1 - a0 - da1 * 2) * k) / 4; p.push([Math.cos(a) * r1, Math.sin(a) * r1]); }
      for (let k = 4; k >= 0; k--) { const a = a0 + da0 + ((a1 - a0 - da0 * 2) * k) / 4; p.push([Math.cos(a) * r0, Math.sin(a) * r0]); }
      holes.push(p);
    }
  };
  band(27, 59, 12, 0);
  band(64, 98, 24, Math.PI / 24);
  return { outer: ellPts(0, 0, 110, 110, 72), holes };
}
const CAGE_P = cagePts();
const CAGE = shapeFrom(CAGE_P.outer, CAGE_P.holes);

const cage: PartDef = {
  id: 'cage', name: { en: 'Front Cage', vi: 'Lồng quạt trước' }, side: 'A', z: 8, x: 0, y: CY, w: 220, h: 220, icon: '◎',
  shape: CAGE, needs: ['c1', 'c2', 'c3', 'c4'], tool: 'brush', elev: 40, thick: 4, round: 1.5, mat: 'metal', body: '#a3a9b1',
  draw(c) {
    c.save();
    c.clip(CAGE);
    const g = c.createLinearGradient(-110, -110, 110, 110);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, CHROME); g.addColorStop(1, '#8d939b');
    c.fillStyle = g;
    c.fillRect(-110, -110, 220, 220);
    // the rim ring a touch darker with a cream trim
    c.strokeStyle = shade(CHROME, -0.2); c.lineWidth = 10;
    c.beginPath(); c.arc(0, 0, 105, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = CREAM; c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, 105, 0, Math.PI * 2); c.stroke();
    c.restore();
  },
};

const SWITCH = rrPath(0, 0, 100, 30, 10);
const keyX = [-24, -8, 8, 24];
const speed: PartDef = {
  id: 'switch', name: { en: 'Speed Switch', vi: 'Công tắc tốc độ' }, side: 'A', z: 5, x: 0, y: 110, w: 100, h: 30, icon: '🎚',
  shape: SWITCH, needs: ['k5', 'k6'], elev: 30, thick: 12, round: 6, body: shade(CREAM, -0.3),
  bumps: keyX.map((x, i) => ({ kind: 'box' as const, x, y: 0, w: 13, h: 20, height: 7, color: i === 0 ? RED : CREAM })),
  draw(c, s) {
    slab(c, SWITCH, CREAM, -15, 15, { depth: 4, shadow: 0 });
    c.fillStyle = shade(MINT, -0.5);
    c.beginPath(); rrc(c, 0, 0, 64, 24, 5); c.fill();
    keyX.forEach((x, i) => {
      c.fillStyle = i === 0 ? RED : shade(CREAM, -0.05);
      c.beginPath(); rrc(c, x, 0, 13, 20, 3); c.fill();
      text(c, i === 0 ? '0' : String(i), x, 0, 9, i === 0 ? CREAM : '#6a5a48', { font: 'bold' });
    });
    if (s.power > 0) {
      c.fillStyle = `rgba(255,220,120,${s.power})`;
      c.beginPath(); c.arc(-40, 0, 3, 0, Math.PI * 2); c.fill();
    }
    if (s.broken) {
      c.strokeStyle = '#5a4a3a'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(4, -10); c.lineTo(10, -2); c.lineTo(6, 6); c.stroke();
    }
  },
};

const A45 = Math.SQRT1_2 * 105;

export const fan: DeviceDef = {
  id: 'fan',
  name: { en: 'Retro Desk Fan', vi: 'Quạt bàn cổ' },
  w: 224, h: 262,
  hasBack: false,
  parts: [
    housing, plug, motor, rear, speed, rotor, spinner, cage,
    screw('c1', -A45, CY - A45, 'A'), screw('c2', A45, CY - A45, 'A'), screw('c3', -A45, CY + A45, 'A'), screw('c4', A45, CY + A45, 'A'),
    screw('k5', -42, 110, 'A'), screw('k6', 42, 110, 'A'),
  ],
  working(c, t, k) {
    c.save();
    c.translate(0, CY);
    // spinning blur of the blades under the cage
    c.globalAlpha = k * 0.5;
    for (let i = 0; i < BLADES; i++) {
      const a = t * 14 + (i / BLADES) * Math.PI * 2;
      c.fillStyle = 'rgba(255,200,170,0.45)';
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, BLADE_R, a, a + 0.9); c.closePath(); c.fill();
    }
    // breeze curls drifting out of the cage
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3; c.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.9 + i / 6) % 1;
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const r = 40 + ph * 90;
      c.globalAlpha = k * (1 - ph) * 0.9;
      c.beginPath();
      c.arc(Math.cos(a) * r, Math.sin(a) * r, 10 + ph * 8, a - 0.4, a + 1.6);
      c.stroke();
    }
    c.restore();
  },
};
