// Electric jug kettle seen from above: powder blue body, chrome lid, cream handle, white power base. One face.

import { type Pts, slab, shade, rrc, ellPath, glossStreak, text, shapeFrom, roundedPts, rrPts, ellPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { boss } from './kit';

const BLUE = '#86c3e3';
const BLUE_D = '#6eaed0';
const CREAM = '#f7eedc';
const CHROME = '#d9dde3';
const STEEL = '#b9c0c9';
const WHITE = '#f4f2ee';
const LED = '#5ab8ff';

// Body: a round jug (radius R) with the pouring lip running out to the right.
const R = 74;
function bodyPts(inset = 0): Pts {
  const r = R - inset;
  const v: [number, number, number][] = [];
  const a0 = 0.3, n = 44;
  for (let i = 0; i <= n; i++) {
    const a = a0 + (i / n) * (Math.PI * 2 - a0 * 2);
    v.push([Math.cos(a) * r, Math.sin(a) * r, i === 0 || i === n ? 12 : 0]);
  }
  v.push([R + 34 - inset * 1.2, -11 + inset * 0.6, 8], [R + 44 - inset * 1.4, -4 + inset * 0.4, 5], [R + 44 - inset * 1.4, 4 - inset * 0.4, 5], [R + 34 - inset * 1.2, 11 - inset * 0.6, 8]);
  return roundedPts(v);
}
const BODY = shapeFrom(bodyPts());
const BODY_IN = shapeFrom(bodyPts(9));
const MAT = -24; // the mat under the rounded belly

// Two screws hold the heating plate down inside; one is the lid hinge pin; two close the handle grip.
const PLATE_SCREWS: [number, number][] = [[-34, 20], [34, 20]];

const body: PartDef = {
  id: 'body', name: { en: 'Kettle Body', vi: 'Thân ấm' }, side: 'A', z: 0, x: 0, y: 0, w: 192, h: 148, icon: '🫖',
  shape: BODY, needs: ['plate', 'handle', 'base'], tool: 'sponge', thick: 58, cavity: 40, round: 24, wall: 9, body: BLUE_D,
  draw(c) {
    slab(c, BODY, BLUE, -R, R, { depth: 12, shadow: 0 });
    glossStreak(c, BODY, -R, -R, R * 2, R * 1.5, 0.32);
    // chrome rim on top of the wall
    c.strokeStyle = CHROME; c.lineWidth = 5;
    c.save(); c.clip(BODY); c.stroke(BODY_IN); c.restore();
    // brushed steel inside, a touch darker towards the walls
    const g = c.createRadialGradient(-10, -14, 8, 0, 0, R);
    g.addColorStop(0, shade(STEEL, 0.2)); g.addColorStop(0.75, STEEL); g.addColorStop(1, shade(STEEL, -0.35));
    c.fillStyle = g;
    c.fill(BODY_IN);
    c.save(); c.clip(BODY_IN);
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(BODY_IN);
    c.restore();
    // water gauge ticks on the inner wall + MAX
    c.strokeStyle = shade(STEEL, -0.45); c.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * 0.62 + i * 0.07;
      c.beginPath(); c.moveTo(Math.cos(a) * 56, Math.sin(a) * 56); c.lineTo(Math.cos(a) * (i % 2 ? 60 : 63), Math.sin(a) * (i % 2 ? 60 : 63)); c.stroke();
    }
    text(c, 'MAX 1.7L', -18, 46, 7, shade(STEEL, -0.5), { font: 'bold' });
    for (const [x, y] of PLATE_SCREWS) boss(c, x, y, STEEL);
  },
};

// ---- heating plate on the floor of the jug ----

const PLATE = ellPath(0, 0, 58, 58);
const plate: PartDef = {
  id: 'plate', name: { en: 'Heating Plate', vi: 'Mâm nhiệt' }, side: 'A', z: 2, x: 0, y: 0, w: 116, h: 116, icon: '🔥',
  shape: PLATE, needs: ['k2', 'k3'], elev: 18, thick: 4, round: 2, mat: 'metal', body: '#8b9097',
  draw(c, s) {
    const g = c.createRadialGradient(-16, -20, 6, 0, 0, 58);
    g.addColorStop(0, '#f4f6f9'); g.addColorStop(0.6, '#c9ced6'); g.addColorStop(1, '#8b9097');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 58, 0, Math.PI * 2); c.fill();
    // pressed grooves + the element ring showing through as a warm band
    c.strokeStyle = 'rgba(80,90,100,0.35)'; c.lineWidth = 1.5;
    for (const r of [18, 32, 46, 54]) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
    c.strokeStyle = s.power > 0 ? `rgba(255,${150 - s.power * 50},60,${0.5 + 0.3 * Math.sin(s.time * 3)})` : 'rgba(170,120,80,0.35)';
    c.lineWidth = 6;
    c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); c.stroke();
    // centre stamp
    c.fillStyle = '#a7adb6'; c.beginPath(); c.arc(0, 0, 12, 0, Math.PI * 2); c.fill();
    text(c, 'CHILL', 0, 0, 6, '#5a606a', { font: 'bold' });
    if (s.broken) {
      // limescale: chalky crust caked into the grooves, flaky patches
      c.fillStyle = 'rgba(244,240,226,0.92)';
      for (let i = 0; i < 26; i++) {
        const a = i * 2.39, r = 16 + ((i * 37) % 38);
        c.beginPath(); c.ellipse(Math.cos(a) * r, Math.sin(a) * r, 5 + (i % 4) * 2, 3 + (i % 3) * 1.5, a, 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = 'rgba(232,226,204,0.95)'; c.lineWidth = 3.5;
      for (const [r, a0, a1] of [[32, 0.4, 2.2], [46, 2.8, 4.6], [18, 4, 6], [54, 5.2, 6.6]]) { c.beginPath(); c.arc(0, 0, r, a0, a1); c.stroke(); }
      c.fillStyle = 'rgba(190,170,130,0.5)';
      for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(Math.cos(i * 1.7) * (12 + i * 3), Math.sin(i * 1.7) * (12 + i * 3), 1.6, 0, Math.PI * 2); c.fill(); }
    }
  },
};

// ---- lid ----

const LID_R = 60;
const HINGE = { x: -54, y: 0 };
const lidPts = roundedPts([
  ...ellPts(0, 0, LID_R, LID_R, 48).filter(([x]) => x > -50).map(([x, y]) => [x, y, 0] as [number, number, number]),
]);
const LID = shapeFrom([...lidPts, ...rrPts(-56, 0, 22, 34, 8).filter(([x]) => x < -50)].sort((p, q) => Math.atan2(p[1], p[0]) - Math.atan2(q[1], q[0])));

const lid: PartDef = {
  id: 'lid', name: { en: 'Lid', vi: 'Nắp ấm' }, side: 'A', z: 6, x: 0, y: 0, w: 134, h: 120, icon: '⚪',
  shape: LID, needs: ['k1'], tool: 'sponge', thick: 8, round: 6, body: shade(BLUE, -0.25),
  bumps: [
    { kind: 'cyl', x: 6, y: 0, w: 30, height: 4, color: CHROME, metal: true },
    { kind: 'box', x: 6, y: 0, w: 13, h: 26, height: 11, color: CREAM },
  ],
  draw(c, s) {
    slab(c, LID, BLUE, -LID_R, LID_R, { depth: 6, shadow: 0 });
    glossStreak(c, LID, -LID_R, -LID_R, LID_R * 2, LID_R * 1.3, 0.35);
    // chrome ring + the hinge tab
    c.strokeStyle = CHROME; c.lineWidth = 6;
    c.beginPath(); c.arc(0, 0, LID_R - 4, 0, Math.PI * 2); c.stroke();
    c.fillStyle = shade(CHROME, -0.1);
    c.beginPath(); rrc(c, -56, 0, 20, 30, 8); c.fill();
    // steam vent slots
    c.fillStyle = shade(BLUE, -0.5);
    for (let i = 0; i < 5; i++) { c.beginPath(); rrc(c, 34, -14 + i * 7, 12, 3.5, 1.75); c.fill(); }
    // knob plate
    c.fillStyle = shade(CREAM, -0.08); c.beginPath(); rrc(c, 6, 0, 17, 32, 8); c.fill();
    text(c, 'CHILL', -26, 2, 9, shade(BLUE, -0.45), { font: 'bold' });
    if (s.power > 0) {
      // condensation beads on the warm lid
      c.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(Math.cos(i * 2.2) * (20 + (i % 4) * 8), Math.sin(i * 2.2) * (20 + (i % 4) * 8), 1.6, 0, Math.PI * 2); c.fill(); }
    }
  },
};

// ---- handle: a cream loop on the left, thermostat under the grip ----

const HC = { x: -102, y: 0 };
const HANDLE = shapeFrom(
  roundedPts([[-36, -44, 16], [40, -44, 6], [40, 44, 6], [-36, 44, 16]]),
  [roundedPts([[-16, -28, 9], [26, -28, 8], [26, 28, 8], [-16, 28, 9]])],
);
const GRIP_X = -26; // handle-local x of the outer bar

const handle: PartDef = {
  id: 'handle', name: { en: 'Handle', vi: 'Tay cầm' }, side: 'A', z: 3, x: HC.x, y: HC.y, w: 76, h: 88, icon: '🫳',
  shape: HANDLE, needs: ['thermo'], elev: -12, thick: 64, round: 8, body: shade(CREAM, -0.2),
  draw(c) {
    slab(c, HANDLE, CREAM, -44, 44, { depth: 8, shadow: 0 });
    // the channel the thermostat sits in, along the outer bar
    c.fillStyle = shade(CREAM, -0.4);
    c.beginPath(); rrc(c, GRIP_X, 0, 12, 70, 6); c.fill();
    c.strokeStyle = shade(CREAM, -0.2); c.lineWidth = 2;
    for (const y of [-36, 36]) { c.beginPath(); c.moveTo(-8, y); c.lineTo(32, y); c.stroke(); }
  },
};

const THERMO = shapeFrom(rrPts(0, 0, 14, 64, 6));
const thermo: PartDef = {
  id: 'thermo', name: { en: 'Thermostat', vi: 'Rơ-le nhiệt' }, side: 'A', z: 4, x: HC.x + GRIP_X, y: 4, w: 14, h: 64, icon: '🌡',
  shape: THERMO, needs: ['grip'], elev: 47, thick: 9, round: 3, mat: 'metal', body: '#7a6a58',
  draw(c, s) {
    // bimetal disc in a brown bakelite body, leads running up the bar
    const g = c.createLinearGradient(-8, 0, 8, 0);
    g.addColorStop(0, '#5a4636'); g.addColorStop(0.45, '#9a7a5c'); g.addColorStop(1, '#4a382a');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 18, 16, 30, 5); c.fill();
    const m = c.createRadialGradient(-2, 16, 1, 0, 18, 7);
    m.addColorStop(0, '#ffffff'); m.addColorStop(1, '#9aa0a8');
    c.fillStyle = m; c.beginPath(); c.arc(0, 18, 6, 0, Math.PI * 2); c.fill();
    // red / blue leads to the switch at the top
    c.lineCap = 'round'; c.lineWidth = 2.6;
    for (const [x, col] of [[-3.5, '#e04a3a'], [3.5, '#3d7fd8']] as const) {
      c.strokeStyle = col;
      c.beginPath(); c.moveTo(x, 3);
      if (s.broken && x > 0) c.lineTo(x + 2, -14);
      else c.lineTo(x, -30);
      c.stroke();
      c.fillStyle = '#e8c15a'; c.beginPath(); c.arc(x, -31, 2, 0, Math.PI * 2); c.fill();
    }
    if (s.broken) {
      // the blue lead popped off its spade: bare strands + a scorch on the bakelite
      c.strokeStyle = '#e39a4a'; c.lineWidth = 0.9;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(5.5, -14); c.lineTo(4 + i * 2, -19); c.stroke(); }
      c.fillStyle = 'rgba(30,18,10,0.6)'; c.beginPath(); c.arc(3, 26, 5, 0, Math.PI * 2); c.fill();
    }
  },
};

const GRIP = shapeFrom(rrPts(0, 0, 20, 84, 9));
const grip: PartDef = {
  id: 'grip', name: { en: 'Grip Cover', vi: 'Ốp tay cầm' }, side: 'A', z: 5, x: HC.x + GRIP_X, y: 0, w: 20, h: 84, icon: '▮',
  shape: GRIP, needs: ['k4', 'k5'], elev: 53, thick: 8, round: 5, body: shade(CREAM, -0.25),
  bumps: [
    { kind: 'box', x: 0, y: 24, w: 12, h: 16, height: 6, color: '#3a3640' },
    { kind: 'cyl', x: 0, y: 8, w: 6, height: 2, color: LED },
  ],
  draw(c, s) {
    slab(c, GRIP, CREAM, -42, 42, { depth: 5, shadow: 0 });
    // soft-touch ribs
    c.strokeStyle = shade(CREAM, -0.18); c.lineWidth = 2; c.lineCap = 'round';
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-5, -30 + i * 6); c.lineTo(5, -30 + i * 6); c.stroke(); }
    // rocker switch + power LED
    c.fillStyle = '#3a3640'; c.beginPath(); rrc(c, 0, 24, 12, 16, 4); c.fill();
    text(c, 'I', 0, 20, 7, '#fff', { font: 'bold' });
    const on = s.power > 0;
    c.fillStyle = on ? `rgba(90,184,255,${0.7 + 0.3 * Math.sin(s.time * 4)})` : '#8aa0b0';
    c.beginPath(); c.arc(0, 8, 3, 0, Math.PI * 2); c.fill();
  },
};

// ---- power base: the round stand under the jug, cord out the back ----

const BASE_R = R + 16;
const BASE = ellPath(0, 0, BASE_R, BASE_R);
const powerBase: PartDef = {
  id: 'base', name: { en: 'Power Base', vi: 'Đế nguồn' }, side: 'A', z: 1, x: 0, y: 0, w: BASE_R * 2, h: BASE_R * 2, icon: '🔌',
  shape: BASE, elev: MAT, thick: 12, round: 5, body: shade(WHITE, -0.25),
  draw(c, s) {
    slab(c, BASE, WHITE, -BASE_R, BASE_R, { depth: 6, shadow: 0 });
    // LED ring round the rim, lit blue when it boils
    c.strokeStyle = s.power > 0 ? `rgba(90,184,255,${0.65 + 0.35 * Math.sin(s.time * 4)})` : '#c9d3dc';
    c.lineWidth = 4;
    c.beginPath(); c.arc(0, 0, BASE_R - 7, 0, Math.PI * 2); c.stroke();
    // the 360° connector: chrome rings round a black post
    c.fillStyle = '#d6dae0'; c.beginPath(); c.arc(0, 0, 25, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#8b9097'; c.lineWidth = 2;
    for (const r of [10, 15, 20]) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = '#2b2730'; c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2); c.fill();
    // cord tidy groove
    c.strokeStyle = shade(WHITE, -0.25); c.lineWidth = 6;
    c.beginPath(); c.arc(0, 0, 52, 0.2, 1.2); c.stroke();
    text(c, '220V ~ 2200W', 0, -42, 7, shade(WHITE, -0.45), { font: 'bold' });
    if (s.broken) {
      // a pin of the connector arced: black soot, melted ring
      const g = c.createRadialGradient(10, -6, 1, 10, -6, 20);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.55)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(10, -6, 20, 0, Math.PI * 2); c.fill();
    }
  },
};

export const kettle: DeviceDef = {
  id: 'kettle',
  name: { en: 'Electric Kettle', vi: 'Ấm siêu tốc' },
  w: 270, h: 190,
  hasBack: false,
  parts: [
    plate, body, powerBase, lid, handle, thermo, grip,
    screw('k1', HINGE.x, HINGE.y, 'A', 9),
    { ...screw('k2', PLATE_SCREWS[0][0], PLATE_SCREWS[0][1], 'A', 4, ['lid']), elev: 22 },
    { ...screw('k3', PLATE_SCREWS[1][0], PLATE_SCREWS[1][1], 'A', 4, ['lid']), elev: 22 },
    { ...screw('k4', HC.x + GRIP_X, -34, 'A', 9), elev: 61 },
    { ...screw('k5', HC.x + GRIP_X, 36, 'A', 9), elev: 61 },
  ],
  working(c, t, k) {
    c.save();
    // steam curling out of the spout and the lid vents
    for (const [x, y, n] of [[R + 44, 0, 5], [40, 0, 3]] as const) {
      for (let i = 0; i < n; i++) {
        const ph = (t * 0.7 + i / n) % 1;
        c.globalAlpha = k * (1 - ph) * 0.75;
        c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(x + Math.sin(ph * 6 + i) * 8, y - ph * 70, 8 + ph * 14, 0, Math.PI * 2); c.fill();
      }
    }
    // blue glow round the base
    c.globalAlpha = k * (0.5 + 0.2 * Math.sin(t * 4));
    c.strokeStyle = LED; c.lineWidth = 8;
    c.beginPath(); c.arc(0, 0, BASE_R + 2, 0, Math.PI * 2); c.stroke();
    c.restore();
  },
  workFx: { kind: 'steam', x: R + 44, y: 0, color: '#ffffff', dir: -Math.PI / 2 },
};
