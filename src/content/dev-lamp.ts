// Balanced-arm desk lamp folded flat on the mat: a heavy stepped base in ochre
// enamel, twin chrome rods with their tension springs and a bakelite knob at
// the elbow, and the enamel dome shade lying mouth-down with the bulb inside.
// One face. Inside the base: the cast-iron weight, the toggle switch, the
// dimmer board and the cloth-braided lead.

import { type C, type Pts, shade, rrc, rng, ellPath, shapeFrom, roundedPts, rrPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, boss } from './kit';

const ENAMEL = '#d29a2e';
const CREAM = '#f3e7cc';
const BRASS = '#c99a4a';
const BAKELITE = '#2a2220';
const SANS = '"Helvetica Neue", Arial, sans-serif';

// The base disc sits at B; the arm hinges at P0 by its rim, bends at the elbow P1 and holds the shade at P2.
const B = { x: -88, y: 32 };
const BR = 56;
const P0 = { x: B.x + 60 * Math.cos(-0.84), y: B.y + 60 * Math.sin(-0.84) };
const P1 = { x: 16, y: -82 };
const P2 = { x: 84, y: -40 };
// the shade's axis leaves the neck at A_SHADE, down the mat
const A_SHADE = (80 * Math.PI) / 180;
const DIR = { x: Math.cos(A_SHADE), y: Math.sin(A_SHADE) };
const at = (u: number) => ({ x: P2.x + DIR.x * u, y: P2.y + DIR.y * u });
const SR = 42;
const SC = at(46);

/** Points laid out along a part's own axis (u along, v across), turned by a. */
function turn(pts: Pts, a: number): Pts {
  const co = Math.cos(a), si = Math.sin(a);
  return pts.map(([u, v]) => [u * co - v * si, u * si + v * co] as [number, number]);
}

function label(c: C, s: string, x: number, y: number, size: number, color: string, weight = 700): void {
  c.font = `${weight} ${size}px ${SANS}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = color;
  c.fillText(s, x, y);
}

/** Glossy stove enamel: a warm sheen, a window highlight and a few chips. */
function enamel(c: C, path: Path2D, r: number, seed: number, chips = 3): void {
  const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r * 1.05);
  g.addColorStop(0, shade(ENAMEL, 0.42)); g.addColorStop(0.35, shade(ENAMEL, 0.08)); g.addColorStop(0.8, ENAMEL); g.addColorStop(1, shade(ENAMEL, -0.25));
  c.fillStyle = g;
  c.fill(path);
  c.save(); c.clip(path);
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.beginPath(); c.ellipse(-r * 0.42, -r * 0.5, r * 0.22, r * 0.07, -0.6, 0, Math.PI * 2); c.fill();
  const rr = rng(seed);
  for (let i = 0; i < chips; i++) {
    const a = rr() * Math.PI * 2, d = r * (0.8 + rr() * 0.15);
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    c.fillStyle = '#3a3533'; c.beginPath(); c.ellipse(x, y, 1.6 + rr() * 2, 1 + rr(), a, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.arc(x - 0.6, y - 0.6, 0.6, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

/** Chrome rod, axis along x from x0 to x1 at y, radius r. */
function rod(c: C, x0: number, x1: number, y: number, r: number): void {
  const g = c.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, '#6f757e'); g.addColorStop(0.3, '#ffffff'); g.addColorStop(0.5, '#c9cdd3'); g.addColorStop(0.8, '#7d838c'); g.addColorStop(1, '#a9aeb5');
  c.fillStyle = g; c.fillRect(x0, y - r, x1 - x0, r * 2);
}

// Screws: three round the base plate, one on the arm hinge, one clamping the shade neck.
const SCREWS: [number, number][] = [140, 250, 20].map((d) => {
  const a = (d * Math.PI) / 180;
  return [B.x + Math.cos(a) * 38, B.y + Math.sin(a) * 38];
});
const SCREWS_LOCAL = SCREWS.map(([x, y]) => [x - B.x, y - B.y] as [number, number]);

// ---------------- base: the heavy stepped disc ----------------

const BASE = ellPath(0, 0, BR, BR);
const BASE_IN = ellPath(0, 0, BR - 8, BR - 8);
const GROMMET = { x: 32, y: 40 };

const base: PartDef = {
  id: 'base', name: { en: 'Lamp Base', vi: 'Đế đèn' }, side: 'A', z: 0, x: B.x, y: B.y, w: BR * 2, h: BR * 2, icon: '🟡',
  shape: BASE, needs: ['switch', 'board', 'lead'], tool: 'sponge', thick: 22, cavity: 12, round: 7, wall: 8, body: '#a8771f',
  draw(c) {
    enamel(c, BASE, BR, 3, 5);
    // a turned bead round the rim
    c.strokeStyle = 'rgba(255,240,200,0.55)'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, BR - 3, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(90,55,10,0.45)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, BR - 5, 0, Math.PI * 2); c.stroke();
    // inside: grey primer, the cast-iron weight, screw posts, the lead's grommet
    c.fillStyle = '#6d6a64';
    c.fill(BASE_IN);
    c.save(); c.clip(BASE_IN);
    c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(BASE_IN);
    c.restore();
    const r = rng(9);
    c.fillStyle = '#3b3a3d';
    c.beginPath(); c.arc(0, 0, 44, Math.PI * 0.5, Math.PI * 1.2); c.arc(0, 0, 30, Math.PI * 1.2, Math.PI * 0.5, true); c.closePath(); c.fill();
    for (let i = 0; i < 90; i++) {
      const a = Math.PI * (0.52 + r() * 0.66), d = 31 + r() * 12;
      c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.25)';
      c.fillRect(Math.cos(a) * d, Math.sin(a) * d, 1, 1);
    }
    label(c, 'CAST IRON  1.2kg', -32, 6, 3.6, '#9a978f', 800);
    for (const [x, y] of SCREWS_LOCAL) boss(c, x, y, '#8a8680');
    c.fillStyle = '#1e1b1a'; c.beginPath(); c.arc(GROMMET.x, GROMMET.y, 6, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#4a4542'; c.lineWidth = 2; c.beginPath(); c.arc(GROMMET.x, GROMMET.y, 6, 0, Math.PI * 2); c.stroke();
  },
};

// the top plate: the second step, with the toggle switch, the hinge bracket and the badge
const CR = BR - 4;
const PLATE = ellPath(0, 0, CR, CR);
const TOGGLE = { x: -22, y: -6 };
const YOKE = { x: (P0.x - B.x) * 0.8, y: (P0.y - B.y) * 0.8 };
const PILOT = { x: 18, y: 14 };

const cover: PartDef = {
  id: 'cover', name: { en: 'Base Plate', vi: 'Nắp đế' }, side: 'A', z: 5, x: B.x, y: B.y, w: CR * 2, h: CR * 2, icon: '⚪',
  shape: PLATE, needs: ['l1', 'l2', 'l3', 'armLow'], thick: 7, round: 6, body: '#a8771f',
  bumps: [
    { kind: 'cyl', x: TOGGLE.x, y: TOGGLE.y, w: 16, height: 3, color: '#dfe2e6', metal: true },
    { kind: 'box', x: TOGGLE.x, y: TOGGLE.y - 3, w: 4.5, h: 9, height: 9, color: '#eef0f2', metal: true },
    { kind: 'box', x: YOKE.x, y: YOKE.y, w: 14, h: 18, height: 10, color: BRASS, metal: true },
    { kind: 'cyl', x: PILOT.x, y: PILOT.y, w: 8, height: 2.5, color: '#b8282a' },
  ],
  draw(c, s) {
    enamel(c, PLATE, CR, 5, 2);
    c.strokeStyle = 'rgba(90,55,10,0.4)'; c.lineWidth = 0.8; c.beginPath(); c.arc(0, 0, CR - 7, 0, Math.PI * 2); c.stroke();
    // toggle switch escutcheon with ON / OFF
    const g = c.createLinearGradient(TOGGLE.x - 10, TOGGLE.y - 16, TOGGLE.x + 10, TOGGLE.y + 16);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#b9bec5'); g.addColorStop(1, '#eef0f2');
    c.fillStyle = g; c.beginPath(); rrc(c, TOGGLE.x, TOGGLE.y, 20, 32, 6); c.fill();
    c.strokeStyle = '#7d838b'; c.lineWidth = 0.6; c.beginPath(); rrc(c, TOGGLE.x, TOGGLE.y, 20, 32, 6); c.stroke();
    for (const y of [-12, 12]) { c.fillStyle = '#8a9098'; c.beginPath(); c.arc(TOGGLE.x, TOGGLE.y + y, 1.6, 0, Math.PI * 2); c.fill(); }
    label(c, 'ON', TOGGLE.x, TOGGLE.y - 21, 5, '#5a3a10', 800);
    label(c, 'OFF', TOGGLE.x, TOGGLE.y + 21, 5, '#5a3a10', 800);
    // brass badge
    c.fillStyle = shade(BRASS, -0.3); c.beginPath(); rrc(c, 14, -20, 40, 12, 3); c.fill();
    c.fillStyle = shade(BRASS, 0.25); c.beginPath(); rrc(c, 14, -20.5, 38, 10, 2.5); c.fill();
    label(c, 'CHILL·LITE', 14, -20.5, 5.4, '#3a2a10', 900);
    label(c, 'MODEL 1227', 14, -11, 3.6, '#6a4a14', 800);
    // pilot lamp (its red jewel is a bump); glow when on
    if (s.power > 0) {
      const lg = c.createRadialGradient(PILOT.x, PILOT.y, 1, PILOT.x, PILOT.y, 12);
      lg.addColorStop(0, `rgba(255,120,80,${0.6 * s.power})`); lg.addColorStop(1, 'rgba(255,120,80,0)');
      c.fillStyle = lg; c.beginPath(); c.arc(PILOT.x, PILOT.y, 12, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#d9dde2'; c.beginPath(); c.arc(PILOT.x, PILOT.y, 5.5, 0, Math.PI * 2); c.fill();
    label(c, '220V ~ 40W MAX', 4, 32, 3.8, '#7a5216', 800);
  },
};

// ---------------- inside the base ----------------

const SW = { x: -106, y: 20 };
const swPath = rrPath0(34, 24, 4);
function rrPath0(w: number, h: number, r: number) { return shapeFrom(rrPts(0, 0, w, h, r)); }

const toggleSwitch: PartDef = {
  id: 'switch', name: { en: 'Toggle Switch', vi: 'Công tắc' }, side: 'A', z: 3, x: SW.x, y: SW.y, w: 34, h: 24, icon: '🎚',
  shape: swPath, needs: ['cover'], thick: 11, round: 3, body: '#2a2220',
  bumps: [{ kind: 'cyl', x: 0, y: -2, w: 9, height: 4, color: '#b9bec5', metal: true }],
  draw(c, s) {
    // brown bakelite body with moulded lettering, two brass screw terminals
    const g = c.createLinearGradient(0, -12, 0, 12);
    g.addColorStop(0, '#5a4038'); g.addColorStop(1, '#2a1c18');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 34, 24, 4); c.fill();
    label(c, '6A 250V~', 0, 8, 3.4, '#8a6a5a', 800);
    for (const [x, col] of [[-12, '#8a5a2b'], [12, '#3d7fd8']] as const) {
      const bg = c.createRadialGradient(x - 1, 3, 0.5, x, 4, 4);
      bg.addColorStop(0, '#fff0c0'); bg.addColorStop(1, shade(BRASS, -0.2));
      c.fillStyle = bg; c.beginPath(); c.arc(x, 4, 3.6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = shade(BRASS, -0.5); c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(x - 2.4, 4); c.lineTo(x + 2.4, 4); c.stroke();
      c.lineCap = 'round';
      c.strokeStyle = col; c.lineWidth = 3;
      if (s.broken && x > 0) {
        // the blue lead has worked loose from under its screw: frayed copper, a scorch
        c.beginPath(); c.moveTo(x, 13); c.lineTo(x + 4, 9); c.stroke();
        c.strokeStyle = '#e39a4a'; c.lineWidth = 0.9;
        for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x + 4, 9); c.lineTo(x + 2 + i * 1.6, 3.5 - (i % 2)); c.stroke(); }
      } else {
        c.beginPath(); c.moveTo(x, 13); c.lineTo(x, 6); c.stroke();
        c.strokeStyle = '#e39a4a'; c.lineWidth = 0.9; c.beginPath(); c.arc(x, 4, 2.4, 0.3, Math.PI * 1.6); c.stroke();
      }
    }
    if (s.broken) {
      const g2 = c.createRadialGradient(10, -3, 1, 10, -3, 10);
      g2.addColorStop(0, 'rgba(15,10,8,0.9)'); g2.addColorStop(1, 'rgba(15,10,8,0)');
      c.fillStyle = g2; c.beginPath(); c.arc(10, -3, 10, 0, Math.PI * 2); c.fill();
    }
  },
};

const BD = { x: -70, y: 58 };
const bdPath = rrPath0(42, 28, 3);
const board: PartDef = {
  id: 'board', name: { en: 'Dimmer Board', vi: 'Bo chỉnh độ sáng' }, side: 'A', z: 3, x: BD.x, y: BD.y, w: 42, h: 28, icon: '🟩',
  shape: bdPath, needs: ['cover'], thick: 3, mat: 'pcb', body: '#1d4a3c',
  bumps: [
    { kind: 'box', x: -10, y: -5, w: 12, h: 9, height: 4, color: '#1b1c20' },
    { kind: 'box', x: -10, y: -10.5, w: 12, h: 3, height: 1.6, color: '#c9ced5', metal: true },
    { kind: 'box', x: 10, y: 0, w: 13, h: 13, height: 6, color: '#2f5fb0' },
    { kind: 'cyl', x: 10, y: 0, w: 5, height: 9, color: '#e0c070', metal: true },
    { kind: 'cyl', x: -12, y: 8, w: 8, height: 7, color: '#2b2b30' },
  ],
  draw(c, s) {
    pcb(c, 42, 28, 27, '#2a7a5a');
    label(c, 'TRIAC', -10, 5, 3, '#eef0e6', 800);
    if (s.broken) {
      const g = c.createRadialGradient(-6, 2, 1, -6, 2, 10);
      g.addColorStop(0, 'rgba(20,12,8,0.9)'); g.addColorStop(1, 'rgba(20,12,8,0)');
      c.fillStyle = g; c.beginPath(); c.arc(-6, 2, 10, 0, Math.PI * 2); c.fill();
    }
  },
};

// ---------------- power lead: braided cloth cord with a moulded plug ----------------

/** Outline of a strip along [x, y, half width] points, as a closed polygon. */
function strip(pts: [number, number, number][]): Pts {
  const L: Pts = [], R: Pts = [];
  pts.forEach(([x, y, hw], i) => {
    const [ax, ay] = pts[Math.max(0, i - 1)], [bx, by] = pts[Math.min(pts.length - 1, i + 1)];
    const d = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / d, ny = (bx - ax) / d;
    L.push([x + nx * hw, y + ny * hw]);
    R.push([x - nx * hw, y - ny * hw]);
  });
  return [...L, ...R.reverse()];
}

const LEAD_PTS: [number, number][] = [[-56, 72], [-40, 88], [-14, 96], [12, 94]];
const PLUG: [number, number][] = [[22, 92], [46, 88]];
const LEAD_C = { x: 0, y: 84 };
const LEAD_SHAPE = shapeFrom(roundedPts(strip([
  ...LEAD_PTS.map(([x, y]) => [x - LEAD_C.x, y - LEAD_C.y, 4.2] as [number, number, number]),
  ...PLUG.map(([x, y]) => [x - LEAD_C.x, y - LEAD_C.y, 8.5] as [number, number, number]),
]).map(([x, y]) => [x, y, 3] as [number, number, number]), 3));
const PLUG_A = Math.atan2(PLUG[1][1] - PLUG[0][1], PLUG[1][0] - PLUG[0][0]);

const lead: PartDef = {
  id: 'lead', name: { en: 'Power Lead', vi: 'Dây nguồn' }, side: 'A', z: 2, x: LEAD_C.x, y: LEAD_C.y, w: 110, h: 40, icon: '🔌',
  shape: LEAD_SHAPE, needs: ['switch'], elev: -7, thick: 8, round: 4.2, mat: 'rubber', body: '#b7a582',
  bumps: [-3.5, 3.5].map((o) => ({
    kind: 'box' as const, x: PLUG[1][0] - LEAD_C.x + 6 * Math.cos(PLUG_A) - o * Math.sin(PLUG_A), y: PLUG[1][1] - LEAD_C.y + 6 * Math.sin(PLUG_A) + o * Math.cos(PLUG_A),
    w: 12, h: 2.4, height: 2.4, color: '#d9b25a', metal: true,
  })),
  draw(c, s) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    const p = new Path2D();
    LEAD_PTS.forEach(([x, y], i) => (i ? p.lineTo(x - LEAD_C.x, y - LEAD_C.y) : p.moveTo(x - LEAD_C.x, y - LEAD_C.y)));
    p.lineTo(PLUG[0][0] - LEAD_C.x, PLUG[0][1] - LEAD_C.y);
    c.strokeStyle = '#d6c4a2'; c.lineWidth = 9; c.stroke(p);
    // braid: a herringbone of short dashes in two shades
    c.save();
    c.setLineDash([1.6, 2.2]);
    c.strokeStyle = '#a08a62'; c.lineWidth = 8; c.stroke(p);
    c.lineDashOffset = 1.9; c.strokeStyle = '#efe2c4'; c.lineWidth = 3; c.stroke(p);
    c.restore();
    // the plug: cream moulded body with grip ribs
    c.save();
    c.translate((PLUG[0][0] + PLUG[1][0]) / 2 - LEAD_C.x, (PLUG[0][1] + PLUG[1][1]) / 2 - LEAD_C.y);
    c.rotate(PLUG_A);
    const g = c.createLinearGradient(0, -9, 0, 9);
    g.addColorStop(0, '#fffaf0'); g.addColorStop(0.5, CREAM); g.addColorStop(1, '#c9b894');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 26, 17, 5); c.fill();
    c.strokeStyle = 'rgba(120,90,50,0.35)'; c.lineWidth = 0.9;
    for (let x = -10; x <= -2; x += 2.6) { c.beginPath(); c.moveTo(x, -6.5); c.lineTo(x, 6.5); c.stroke(); }
    label(c, '6A', 6, 0, 4, '#8a7450', 800);
    c.restore();
    if (s.broken) {
      const [x, y] = [LEAD_PTS[1][0] - LEAD_C.x, LEAD_PTS[1][1] - LEAD_C.y];
      c.fillStyle = '#5a4a3a'; c.beginPath(); c.ellipse(x, y, 5, 3.5, 0.6, 0, Math.PI * 2); c.fill();
    }
  },
};

// ---------------- the two arms: twin chrome rods, a spring along each ----------------

function arm(id: string, from: { x: number; y: number }, to: { x: number; y: number }, z: number, needs: string[], en: string, vi: string, knob: boolean): PartDef {
  const L = Math.hypot(to.x - from.x, to.y - from.y);
  const a = Math.atan2(to.y - from.y, to.x - from.x);
  const W = 24;
  const shape = shapeFrom(turn(rrPts(0, 0, L + W, W, W / 2), a), [turn(rrPts(0, 0, L - 24, 7, 3.5), a)]);
  const kx = (from.x - to.x) / 2, ky = (from.y - to.y) / 2;
  return {
    id, name: { en, vi }, side: 'A', z, x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, w: L + W, h: W, icon: '🦾',
    shape, needs, elev: -6, thick: 9, round: 4.6, mat: 'metal', body: '#9aa0a8',
    bumps: knob
      ? [{ kind: 'cyl', x: kx, y: ky, w: 22, height: 6, color: BAKELITE }, { kind: 'cyl', x: kx, y: ky, w: 8, height: 7.5, color: '#d9dde2', metal: true }]
      : [{ kind: 'cyl', x: kx, y: ky, w: 10, height: 3, color: '#d9dde2', metal: true }],
    draw(c, s) {
      c.save();
      c.clip(shape);
      c.rotate(a);
      for (const v of [-8.25, 8.25]) rod(c, -L / 2 - W / 2, L / 2 + W / 2, v, 3.9);
      // knuckle plates at both ends, with their pivot bolts
      for (const u of [-L / 2, L / 2]) {
        const g = c.createRadialGradient(u - 4, -4, 1, u, 0, 12);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#c3c8ce'); g.addColorStop(1, '#7d838c');
        c.fillStyle = g; c.beginPath(); c.arc(u, 0, 12, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#5a5f68'; c.beginPath(); c.arc(u, 0, 3.5, 0, Math.PI * 2); c.fill();
      }
      // the tension spring rides along the lower rod; a sprung one sags off it
      const u0 = -L * 0.34, u1 = L * 0.2, n = Math.max(8, Math.round((u1 - u0) / 3.2));
      for (let i = 0; i <= n; i++) {
        const u = u0 + ((u1 - u0) * i) / n;
        const sag = s.broken && i > n / 2 ? 2.5 : 0;
        c.strokeStyle = 'rgba(40,44,52,0.5)'; c.lineWidth = 1.8;
        c.beginPath(); c.ellipse(u + 0.5, 8.25 + sag + 0.6, 1.4, 5.2, 0.3, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = s.broken ? '#9a7a4a' : '#f2f4f7'; c.lineWidth = 1.2;
        c.beginPath(); c.ellipse(u, 8.25 + sag, 1.4, 5.2, 0.3, 0, Math.PI * 2); c.stroke();
      }
      // spring hooks
      c.strokeStyle = '#d9dde2'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(u0 - 1, 8.25); c.lineTo(u0 - 8, 3); c.moveTo(u1 + 1, 8.25); c.lineTo(u1 + 7, 3); c.stroke();
      c.restore();
      if (knob) {
        // black bakelite tension knob at the elbow, knurled rim
        c.fillStyle = BAKELITE; c.beginPath(); c.arc(kx, ky, 11, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#4a3e3a'; c.lineWidth = 0.8;
        for (let i = 0; i < 24; i++) {
          const t = (i / 24) * Math.PI * 2;
          c.beginPath(); c.moveTo(kx + Math.cos(t) * 9, ky + Math.sin(t) * 9); c.lineTo(kx + Math.cos(t) * 11, ky + Math.sin(t) * 11); c.stroke();
        }
      }
    },
  };
}

// ---------------- the dome shade, lying mouth-down ----------------

// a hemisphere with the neck stub pointing back to the arm
const NECK_A = A_SHADE + Math.PI;
function shadePts(): Pts {
  const hw = 11, len = SR + 12;
  const d = Math.asin(hw / SR);
  const out: Pts = [];
  const n = 56;
  for (let i = 0; i <= n; i++) {
    const t = NECK_A + d + (i / n) * (Math.PI * 2 - 2 * d);
    out.push([Math.cos(t) * SR, Math.sin(t) * SR]);
  }
  const ux = Math.cos(NECK_A), uy = Math.sin(NECK_A), vx = -uy, vy = ux;
  out.push([ux * len - vx * hw, uy * len - vy * hw], [ux * len + vx * hw, uy * len + vy * hw]);
  return out;
}
const SHADE = shapeFrom(shadePts());

const lampShade: PartDef = {
  id: 'shade', name: { en: 'Lamp Shade', vi: 'Chao đèn' }, side: 'A', z: 8, x: SC.x, y: SC.y, w: SR * 2 + 12, h: SR * 2 + 12, icon: '🛎',
  shape: SHADE, needs: ['l4'], tool: 'brush', elev: -7, thick: 40, round: SR, body: '#a8771f',
  draw(c, s) {
    enamel(c, SHADE, SR, 11, 4);
    // the rolled rim where the dome meets the mat (it shows on the steep sides)
    c.strokeStyle = shade(ENAMEL, -0.35); c.lineWidth = 3; c.beginPath(); c.arc(0, 0, SR - 1.5, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(255,235,190,0.6)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, SR - 3.6, 0, Math.PI * 2); c.stroke();
    // ring of vent holes round the crown, the chrome neck collar
    c.save();
    c.rotate(NECK_A);
    // a stamped step round the crown, then fine radial slots
    c.strokeStyle = 'rgba(90,55,10,0.45)'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, 25, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(255,240,200,0.5)'; c.lineWidth = 0.8; c.beginPath(); c.arc(0, 0, 26.2, 0, Math.PI * 2); c.stroke();
    c.lineCap = 'round';
    for (let i = 0; i < 18; i++) {
      const t = (i / 18) * Math.PI * 2;
      c.strokeStyle = s.power > 0 ? `rgba(255,226,150,${0.6 + 0.4 * s.power})` : '#4a3010'; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(Math.cos(t) * 17, Math.sin(t) * 17); c.lineTo(Math.cos(t) * 21.5, Math.sin(t) * 21.5); c.stroke();
    }
    const cg = c.createLinearGradient(0, -11, 0, 11);
    cg.addColorStop(0, '#7d838c'); cg.addColorStop(0.35, '#ffffff'); cg.addColorStop(1, '#8d939b');
    c.fillStyle = cg; c.fillRect(SR - 8, -11, 20, 22);
    c.fillStyle = 'rgba(40,44,52,0.35)'; c.fillRect(SR - 8, -11, 1.2, 22); c.fillRect(SR + 2, -11, 1, 22);
    c.restore();
    // the maker's foil sticker on the crown
    c.fillStyle = shade(BRASS, 0.2); c.beginPath(); c.arc(-6, 6, 7, 0, Math.PI * 2); c.fill();
    label(c, 'CL', -6, 6, 5, '#5a3a10', 900);
  },
};

// Bulb: an opal pear globe lying on its side under the dome, brass screw cap to the socket
const bulbAxis: Pts = [];
const BULB_R = 19;
for (let i = 0; i <= 22; i++) {
  const t = -2.45 + (i / 22) * 4.9;
  bulbAxis.push([44 + Math.cos(t) * BULB_R, Math.sin(t) * BULB_R]);
}
bulbAxis.push([26, 8.5], [10, 8.5], [8, 5], [8, -5], [10, -8.5], [26, -8.5]);
const BULB_C = at(36);
const BULB = shapeFrom(turn(bulbAxis.map(([u, v]) => [u - 36, v] as [number, number]), A_SHADE));

const bulb: PartDef = {
  id: 'bulb', name: { en: 'Light Bulb', vi: 'Bóng đèn' }, side: 'A', z: 7, x: BULB_C.x, y: BULB_C.y, w: 60, h: 40, icon: '💡',
  shape: BULB, needs: ['shade'], elev: -7, thick: 30, round: 15, mat: 'glass', body: '#e9e2d0',
  draw(c, s) {
    c.save();
    c.rotate(A_SHADE);
    c.translate(-36, 0);
    // brass Edison cap with its thread and the black glass insulator
    const bg = c.createLinearGradient(0, -9, 0, 9);
    bg.addColorStop(0, shade(BRASS, -0.35)); bg.addColorStop(0.35, shade(BRASS, 0.5)); bg.addColorStop(1, shade(BRASS, -0.4));
    c.fillStyle = bg; c.beginPath(); rrc(c, 17, 0, 18, 17, 3); c.fill();
    c.strokeStyle = shade(BRASS, -0.5); c.lineWidth = 1;
    for (let u = 11; u < 26; u += 3) { c.beginPath(); c.moveTo(u, -8.5); c.lineTo(u + 1.6, 8.5); c.stroke(); }
    c.fillStyle = '#1a1a1c'; c.beginPath(); rrc(c, 9, 0, 3, 10, 1); c.fill();
    c.fillStyle = '#c9ccd2'; c.beginPath(); c.arc(8, 0, 2, 0, Math.PI * 2); c.fill();
    // opal glass globe
    const on = s.power;
    const g = c.createRadialGradient(38, -7, 2, 44, 0, BULB_R + 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.6, on > 0 ? '#fff0c0' : '#f7f2e6');
    g.addColorStop(1, on > 0 ? '#ffc864' : '#d9d0bc');
    c.fillStyle = g; c.beginPath(); c.arc(44, 0, BULB_R, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(26, -8.5); c.lineTo(32, -12); c.lineTo(32, 12); c.lineTo(26, 8.5); c.closePath(); c.fill();
    // the stamp on the glass
    c.save(); c.translate(48, 0); c.rotate(-Math.PI / 2);
    label(c, 'CHILL 40W', 0, -3, 3.8, 'rgba(120,100,70,0.55)', 800);
    label(c, '220-240V', 0, 2, 3.2, 'rgba(120,100,70,0.5)', 800);
    c.restore();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath(); c.ellipse(38, -10, 6, 2.5, -0.4, 0, Math.PI * 2); c.fill();
    c.restore();
  },
};

const NECK = { x: SC.x + Math.cos(NECK_A) * (SR + 5), y: SC.y + Math.sin(NECK_A) * (SR + 5) };

export const lamp: DeviceDef = {
  id: 'lamp',
  name: { en: 'Balanced-Arm Desk Lamp', vi: 'Đèn bàn tay gấp' },
  w: 300, h: 200,
  hasBack: false,
  parts: [
    toggleSwitch, base, cover, board, lead,
    arm('armLow', P0, P1, 6, ['armUp', 'l5'], 'Lower Arm', 'Cần đèn dưới', false),
    arm('armUp', P1, P2, 7, ['shade', 'bulb'], 'Upper Arm', 'Cần đèn trên', true),
    lampShade, bulb,
    ...SCREWS.map(([x, y], i) => screw(`l${i + 1}`, x, y, 'A')),
    screw('l4', NECK.x, NECK.y, 'A', 10),
    screw('l5', P0.x, P0.y, 'A'),
  ],
  working(c, t, k) {
    // warm light spilling out from under the rim onto the mat, breathing a little
    c.save();
    c.globalAlpha = k * (0.85 + 0.15 * Math.sin(t * 3));
    const g = c.createRadialGradient(SC.x, SC.y + 6, SR * 0.8, SC.x, SC.y + 6, SR * 2.4);
    g.addColorStop(0, 'rgba(255,226,150,0.85)'); g.addColorStop(0.4, 'rgba(255,214,130,0.35)'); g.addColorStop(1, 'rgba(255,200,110,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(SC.x, SC.y + 6, SR * 2.4, 0, Math.PI * 2); c.fill();
    // motes drifting in the glow
    c.fillStyle = 'rgba(255,250,220,0.9)';
    for (let i = 0; i < 7; i++) {
      const ph = (t * 0.22 + i / 7) % 1;
      c.globalAlpha = k * Math.sin(ph * Math.PI);
      const a = i * 0.9 + t * 0.2;
      c.beginPath(); c.arc(SC.x + Math.cos(a) * (SR + 10 + ph * 30), SC.y + Math.sin(a) * (SR + 10 + ph * 30), 1.6, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },
  workFx: { kind: 'spark', x: SC.x, y: SC.y + SR + 4, color: '#ffe08a', dir: A_SHADE },
};

