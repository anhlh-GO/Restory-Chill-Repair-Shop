// Retro desk lamp folded flat on the mat: mustard base and shade, chrome arms with springs. One face.

import { type Pts, slab, shade, rrc, ellPath, glossStreak, text, shapeFrom, roundedPts, rrPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, boss } from './kit';

const SUN = '#f2b134';
const SUN_D = '#e2a224';
const CREAM = '#f8eedb';
const CHROME = '#d9dde3';
const RED = '#e0473c';
const BRASS = '#d9a443';

// The base disc sits at B; the arm hinges at P0 on its rim, bends at the elbow P1 and holds the shade at P2.
const B = { x: -88, y: 32 };
const BR = 58;
const P0 = { x: B.x + 61 * 0.669, y: B.y - 61 * 0.743 };
const P1 = { x: 16, y: -82 };
const P2 = { x: 84, y: -40 };
// The shade points down the mat: its axis leaves P2 at A_SHADE.
const A_SHADE = (80 * Math.PI) / 180;
const SHADE_LEN = 84;
const DIR = { x: Math.cos(A_SHADE), y: Math.sin(A_SHADE) };
const at = (u: number) => ({ x: P2.x + DIR.x * u, y: P2.y + DIR.y * u });

/** Points laid out along a part's own axis (u along, v across), turned by a. */
function turn(pts: Pts, a: number): Pts {
  const co = Math.cos(a), si = Math.sin(a);
  return pts.map(([u, v]) => [u * co - v * si, u * si + v * co] as [number, number]);
}

// Screws: three round the base plate, one on the arm hinge, one clamping the shade neck.
const SCREWS: [number, number][] = [140, 250, 20].map((d) => {
  const a = (d * Math.PI) / 180;
  return [B.x + Math.cos(a) * 40, B.y + Math.sin(a) * 40];
});
const SCREWS_LOCAL = SCREWS.map(([x, y]) => [x - B.x, y - B.y] as [number, number]);

// ---- base ----

const BASE = ellPath(0, 0, BR, BR);
const BASE_IN = ellPath(0, 0, BR - 9, BR - 9);

const base: PartDef = {
  id: 'base', name: { en: 'Lamp Base', vi: 'Đế đèn' }, side: 'A', z: 0, x: B.x, y: B.y, w: BR * 2, h: BR * 2, icon: '🟡',
  shape: BASE, needs: ['switch', 'board', 'lead'], tool: 'sponge', thick: 30, cavity: 14, round: 16, wall: 9,
  draw(c) {
    slab(c, BASE, SUN, -BR, BR, { depth: 10, shadow: 0 });
    glossStreak(c, BASE, -BR, -BR, BR * 2, BR * 1.4, 0.3);
    c.fillStyle = shade(SUN, -0.42);
    c.fill(BASE_IN);
    c.save(); c.clip(BASE_IN);
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(BASE_IN);
    c.restore();
    // cast iron weight: the crescent that keeps the lamp from tipping over
    c.fillStyle = '#4a4650';
    c.beginPath(); c.arc(0, 0, 44, Math.PI * 0.55, Math.PI * 1.15); c.arc(0, 0, 32, Math.PI * 1.15, Math.PI * 0.55, true); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.beginPath(); c.arc(0, 0, 43, Math.PI * 0.75, Math.PI * 1.05); c.arc(0, 0, 40, Math.PI * 1.05, Math.PI * 0.75, true); c.closePath(); c.fill();
    for (const [x, y] of SCREWS_LOCAL) boss(c, x, y, SUN);
    // grommet where the lead comes in
    c.fillStyle = '#2b2730';
    c.beginPath(); c.arc(30, 40, 6, 0, Math.PI * 2); c.fill();
  },
};

const PLATE = ellPath(0, 0, BR - 6, BR - 6);
const TOGGLE = { x: -24, y: -8 };
const YOKE = { x: (P0.x - B.x) * 0.78, y: (P0.y - B.y) * 0.78 };

const cover: PartDef = {
  id: 'cover', name: { en: 'Base Plate', vi: 'Nắp đế' }, side: 'A', z: 5, x: B.x, y: B.y, w: (BR - 6) * 2, h: (BR - 6) * 2, icon: '⚪',
  shape: PLATE, needs: ['l1', 'l2', 'l3', 'armLow'], thick: 6, round: 4, body: shade(CREAM, -0.25),
  bumps: [
    { kind: 'cyl', x: TOGGLE.x, y: TOGGLE.y, w: 18, height: 4, color: CHROME, metal: true },
    { kind: 'box', x: TOGGLE.x, y: TOGGLE.y, w: 6, h: 6, height: 15, color: RED },
    { kind: 'box', x: YOKE.x, y: YOKE.y, w: 16, h: 16, height: 8, color: CHROME, metal: true },
  ],
  draw(c, s) {
    const r = BR - 6;
    slab(c, PLATE, CREAM, -r, r, { depth: 5, shadow: 0 });
    // mustard pinstripe + the little badge
    c.strokeStyle = SUN; c.lineWidth = 3;
    c.beginPath(); c.arc(0, 0, r - 6, 0, Math.PI * 2); c.stroke();
    text(c, 'CHILL·LITE', 16, 30, 9, shade(SUN, -0.35), { font: 'bold' });
    // toggle switch escutcheon with ON / OFF
    c.fillStyle = shade(CHROME, -0.15);
    c.beginPath(); rrc(c, TOGGLE.x, TOGGLE.y, 22, 34, 7); c.fill();
    c.fillStyle = '#3a3640';
    c.beginPath(); rrc(c, TOGGLE.x, TOGGLE.y, 6, 16, 3); c.fill();
    text(c, 'ON', TOGGLE.x, TOGGLE.y - 23, 7, shade(SUN, -0.45), { font: 'bold' });
    text(c, 'OFF', TOGGLE.x, TOGGLE.y + 23, 7, shade(SUN, -0.45), { font: 'bold' });
    // pilot light
    const on = s.power > 0;
    c.fillStyle = on ? `rgba(255,200,90,${0.7 + 0.3 * Math.sin(s.time * 5)})` : '#b8a88a';
    c.beginPath(); c.arc(20, 2, 3.5, 0, Math.PI * 2); c.fill();
    if (on) {
      c.fillStyle = 'rgba(255,200,90,0.3)';
      c.beginPath(); c.arc(20, 2, 8, 0, Math.PI * 2); c.fill();
    }
    // hinge yoke towards the arm
    c.fillStyle = shade(CHROME, -0.25);
    c.beginPath(); c.arc(YOKE.x, YOKE.y, 11, 0, Math.PI * 2); c.fill();
  },
};

// ---- inside the base ----

const SW = { x: -108, y: 22 };
const swPath = shapeFrom(rrPts(0, 0, 36, 26, 5));
const toggleSwitch: PartDef = {
  id: 'switch', name: { en: 'Toggle Switch', vi: 'Công tắc' }, side: 'A', z: 3, x: SW.x, y: SW.y, w: 36, h: 26, icon: '🎚',
  shape: swPath, needs: ['cover'], thick: 10, round: 3, body: '#2b2730',
  draw(c, s) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -2, 4, 36, 26, 5); c.fill();
    // bakelite body + the lever's pivot
    const g = c.createLinearGradient(0, -13, 0, 13);
    g.addColorStop(0, '#5a5560'); g.addColorStop(1, '#25222a');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 36, 26, 5); c.fill();
    c.fillStyle = '#9aa0a8'; c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = RED; c.beginPath(); rrc(c, 0, -2, 4, 10, 2); c.fill();
    // brass screw terminals with a brown and a blue lead
    for (const [x, col] of [[-13, '#8a5a2b'], [13, '#3d7fd8']] as const) {
      c.fillStyle = BRASS; c.beginPath(); c.arc(x, 5, 4, 0, Math.PI * 2); c.fill();
      c.strokeStyle = shade(BRASS, -0.4); c.lineWidth = 1;
      c.beginPath(); c.moveTo(x - 2.5, 5); c.lineTo(x + 2.5, 5); c.stroke();
      c.strokeStyle = col; c.lineWidth = 3; c.lineCap = 'round';
      if (s.broken && x > 0) {
        // the blue lead has wriggled loose: bare copper, not under its screw
        c.beginPath(); c.moveTo(x, 13); c.lineTo(x + 3, 8); c.stroke();
        c.strokeStyle = '#e39a4a'; c.lineWidth = 1;
        for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x + 3, 8); c.lineTo(x + 1 + i * 2, 3); c.stroke(); }
      } else {
        c.beginPath(); c.moveTo(x, 13); c.lineTo(x, 7); c.stroke();
      }
    }
    if (s.broken) {
      const g2 = c.createRadialGradient(10, -4, 1, 10, -4, 10);
      g2.addColorStop(0, 'rgba(20,12,8,0.85)'); g2.addColorStop(1, 'rgba(20,12,8,0)');
      c.fillStyle = g2; c.beginPath(); c.arc(10, -4, 10, 0, Math.PI * 2); c.fill();
    }
  },
};

const BD = { x: -72, y: 58 };
const bdPath = shapeFrom(rrPts(0, 0, 40, 28, 4));
const board: PartDef = {
  id: 'board', name: { en: 'Dimmer Board', vi: 'Bo chỉnh độ sáng' }, side: 'A', z: 3, x: BD.x, y: BD.y, w: 40, h: 28, icon: '🟩',
  shape: bdPath, needs: ['cover'], thick: 4, mat: 'pcb', body: '#1d5c37',
  draw(c, s) {
    pcb(c, 40, 28, 27);
    // the dimmer pot: a blue square with a brass shaft
    c.fillStyle = '#3d6fd0'; c.beginPath(); rrc(c, 9, 0, 14, 14, 2); c.fill();
    c.fillStyle = BRASS; c.beginPath(); c.arc(9, 0, 3.5, 0, Math.PI * 2); c.fill();
    if (s.broken) {
      const g = c.createRadialGradient(-8, 2, 1, -8, 2, 11);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(-8, 2, 11, 0, Math.PI * 2); c.fill();
    }
  },
};

// ---- power lead: a braided cream cord lying on the mat with a little plug ----

/** Outline of a strip along [x, y, half width] points (device coords), as a closed polygon. */
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

const LEAD_PTS: [number, number][] = [[-52, 64], [-34, 84], [-6, 94], [20, 92]];
const PLUG: [number, number][] = [[30, 90], [52, 87]];
const LEAD_C = { x: 0, y: 84 };
const LEAD_SHAPE = shapeFrom(roundedPts(strip([
  ...LEAD_PTS.map(([x, y]) => [x - LEAD_C.x, y - LEAD_C.y, 4.5] as [number, number, number]),
  ...PLUG.map(([x, y]) => [x - LEAD_C.x, y - LEAD_C.y, 9] as [number, number, number]),
]).map(([x, y]) => [x, y, 3] as [number, number, number]), 3));
const PLUG_A = Math.atan2(PLUG[1][1] - PLUG[0][1], PLUG[1][0] - PLUG[0][0]);

const lead: PartDef = {
  id: 'lead', name: { en: 'Power Lead', vi: 'Dây nguồn' }, side: 'A', z: 2, x: LEAD_C.x, y: LEAD_C.y, w: 110, h: 40, icon: '🔌',
  shape: LEAD_SHAPE, needs: ['switch'], elev: -15, thick: 9, round: 4, mat: 'rubber', body: '#bfae8e',
  bumps: [-4, 4].map((o) => ({
    kind: 'box' as const, x: PLUG[1][0] - LEAD_C.x + 6, y: PLUG[1][1] - LEAD_C.y + o, w: 12, h: 2.5, height: 2.5, color: BRASS, metal: true,
  })),
  draw(c, s) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    const p = new Path2D();
    LEAD_PTS.forEach(([x, y], i) => (i ? p.lineTo(x - LEAD_C.x, y - LEAD_C.y) : p.moveTo(x - LEAD_C.x, y - LEAD_C.y)));
    p.lineTo(PLUG[0][0] - LEAD_C.x, PLUG[0][1] - LEAD_C.y);
    c.strokeStyle = '#d9c7a8'; c.lineWidth = 9; c.stroke(p);
    // braid: little diagonal ticks along the cord
    c.save(); c.setLineDash([2, 3]);
    c.strokeStyle = '#a8946e'; c.lineWidth = 7; c.stroke(p);
    c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2;
    c.save(); c.translate(-0.5, -1.5); c.stroke(p); c.restore();
    // the plug body
    c.save();
    c.translate((PLUG[0][0] + PLUG[1][0]) / 2 - LEAD_C.x, (PLUG[0][1] + PLUG[1][1]) / 2 - LEAD_C.y);
    c.rotate(PLUG_A);
    const g = c.createLinearGradient(0, -9, 0, 9);
    g.addColorStop(0, '#fff7e8'); g.addColorStop(0.5, CREAM); g.addColorStop(1, '#cdbb98');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 26, 18, 6); c.fill();
    c.strokeStyle = 'rgba(120,90,50,0.35)'; c.lineWidth = 1;
    for (let x = -8; x <= 0; x += 3) { c.beginPath(); c.moveTo(x, -6); c.lineTo(x, 6); c.stroke(); }
    c.restore();
    if (s.broken) {
      // frayed near the base: the jacket split, copper poking out
      const [x, y] = [LEAD_PTS[1][0] - LEAD_C.x, LEAD_PTS[1][1] - LEAD_C.y];
      c.fillStyle = '#5a4a3a'; c.beginPath(); c.ellipse(x, y, 6, 4, 0.6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#e39a4a'; c.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x, y); c.lineTo(x - 5 + i * 3.5, y - 7 + (i % 2) * 2); c.stroke(); }
    }
  },
};

// ---- the two chrome arms: twin rods (a real slot between them) with a spring ----

function arm(id: string, from: { x: number; y: number }, to: { x: number; y: number }, z: number, needs: string[], en: string, vi: string, knob: boolean): PartDef {
  const L = Math.hypot(to.x - from.x, to.y - from.y);
  const a = Math.atan2(to.y - from.y, to.x - from.x);
  const W = 26;
  const shape = shapeFrom(turn(rrPts(0, 0, L + W, W, W / 2), a), [turn(rrPts(0, 0, L - 26, 8, 4), a)]);
  const kx = (from.x - to.x) / 2, ky = (from.y - to.y) / 2;
  return {
    id, name: { en, vi }, side: 'A', z, x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, w: L + W, h: W, icon: '🦾',
    shape, needs, elev: 4, thick: 12, round: 5, mat: 'metal', body: '#9aa0a8',
    bumps: knob ? [{ kind: 'cyl', x: kx, y: ky, w: 22, height: 5, color: RED }] : undefined,
    draw(c, s) {
      c.save();
      c.clip(shape);
      c.rotate(a);
      // rods
      for (const v of [-8.5, 8.5]) {
        const g = c.createLinearGradient(0, v - 4.5, 0, v + 4.5);
        g.addColorStop(0, '#8d939b'); g.addColorStop(0.35, '#ffffff'); g.addColorStop(1, '#7a8088');
        c.fillStyle = g; c.fillRect(-L / 2 - W / 2, v - 4.5, L + W, 9);
      }
      // knuckles at both ends
      for (const u of [-L / 2, L / 2]) {
        const g = c.createRadialGradient(u - 3, -4, 1, u, 0, 13);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#8d939b');
        c.fillStyle = g; c.beginPath(); c.arc(u, 0, 13, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#5a5f68'; c.beginPath(); c.arc(u, 0, 4, 0, Math.PI * 2); c.fill();
      }
      // the spring rides the lower rod; a broken one has sprung loose and sags
      c.strokeStyle = s.broken ? '#9a7a4a' : '#f4f6f9'; c.lineWidth = 1.6;
      const u0 = -L * 0.32, u1 = L * 0.22, n = Math.max(6, Math.round((u1 - u0) / 4));
      for (let i = 0; i <= n; i++) {
        const u = u0 + ((u1 - u0) * i) / n;
        c.beginPath(); c.ellipse(u, 8.5 + (s.broken && i > n / 2 ? 2 : 0), 1.6, 5, 0.35, 0, Math.PI * 2); c.stroke();
      }
      c.restore();
      if (knob) {
        // red wing nut on the elbow
        c.fillStyle = shade(RED, -0.35); c.beginPath(); c.arc(kx, ky + 1.5, 11, 0, Math.PI * 2); c.fill();
        c.fillStyle = RED; c.beginPath(); c.arc(kx, ky, 11, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.arc(kx - 3, ky - 3, 3.5, 0, Math.PI * 2); c.fill();
      }
    },
  };
}

// ---- shade + bulb (laid along the shade axis, then turned) ----

const SHADE_C = at(SHADE_LEN / 2);
const shadeAxis: [number, number, number][] = [
  [-6, -14, 7], [12, -17, 6], [SHADE_LEN, -45, 7], [SHADE_LEN + 4, -40, 3], [SHADE_LEN + 4, 40, 3], [SHADE_LEN, 45, 7], [12, 17, 6], [-6, 14, 7],
];
const SHADE = shapeFrom(turn(roundedPts(shadeAxis.map(([u, v, r]) => [u - SHADE_LEN / 2, v, r] as [number, number, number])), A_SHADE));

const lampShade: PartDef = {
  id: 'shade', name: { en: 'Lamp Shade', vi: 'Chao đèn' }, side: 'A', z: 8, x: SHADE_C.x, y: SHADE_C.y, w: 96, h: 92, icon: '🛎',
  shape: SHADE, needs: ['bulb', 'l4'], tool: 'brush', elev: -15, thick: 48, round: 22, body: SUN_D,
  draw(c, s) {
    c.save();
    c.rotate(A_SHADE);
    c.translate(-SHADE_LEN / 2, 0);
    const local = shapeFrom(roundedPts(shadeAxis));
    slab(c, local, SUN, -45, 45, { depth: 6, shadow: 0 });
    // cone shading across the axis: a highlight down the near side
    c.save(); c.clip(local);
    const g = c.createLinearGradient(0, -45, 0, 45);
    g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(0.3, 'rgba(255,255,255,0)'); g.addColorStop(0.75, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(90,50,0,0.3)');
    c.fillStyle = g; c.fillRect(-10, -50, SHADE_LEN + 20, 100);
    // rolled rim round the mouth, chrome collar at the neck
    c.fillStyle = shade(SUN, -0.3); c.fillRect(SHADE_LEN - 7, -50, 12, 100);
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(SHADE_LEN - 5, -50, 2.5, 100);
    c.fillStyle = shade(CHROME, -0.1); c.fillRect(-8, -20, 16, 40);
    // vent holes behind the collar
    c.fillStyle = shade(SUN, -0.5);
    for (const v of [-9, 0, 9]) { c.beginPath(); c.ellipse(18, v, 2.2, 3, 0, 0, Math.PI * 2); c.fill(); }
    if (s.broken) {
      // dust bunnies and a cobweb by the mouth
      c.fillStyle = 'rgba(150,140,130,0.85)';
      for (const [u, v, r] of [[70, -22, 7], [76, 10, 9], [62, 26, 5], [80, -6, 5], [54, -4, 4]]) { c.beginPath(); c.arc(u, v, r, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = 'rgba(240,240,240,0.7)'; c.lineWidth = 0.8;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(SHADE_LEN, -38 + i * 4); c.quadraticCurveTo(SHADE_LEN - 14, -30 + i * 3, SHADE_LEN - 4, -20 + i * 5); c.stroke(); }
    }
    if (s.power > 0) {
      const w = c.createRadialGradient(SHADE_LEN, 0, 4, SHADE_LEN, 0, 50);
      w.addColorStop(0, `rgba(255,236,170,${0.7 * s.power})`); w.addColorStop(1, 'rgba(255,236,170,0)');
      c.fillStyle = w; c.fillRect(SHADE_LEN - 50, -50, 60, 100);
    }
    c.restore();
    c.restore();
  },
};

// Bulb: a pear globe at the mouth with its brass screw base tucked into the shade.
const BULB_C = at(SHADE_LEN + 2);
const BULB_R = 21;
const bulbAxis: Pts = [];
for (let i = 0; i <= 20; i++) {
  const a = -2.45 + (i / 20) * 4.9;
  bulbAxis.push([8 + Math.cos(a) * BULB_R, Math.sin(a) * BULB_R]);
}
bulbAxis.push([-12, 10], [-30, 10], [-34, 6], [-34, -6], [-30, -10], [-12, -10]);
const BULB = shapeFrom(turn(bulbAxis, A_SHADE));

const bulb: PartDef = {
  id: 'bulb', name: { en: 'Light Bulb', vi: 'Bóng đèn' }, side: 'A', z: 9, x: BULB_C.x, y: BULB_C.y, w: 64, h: 44, icon: '💡',
  shape: BULB, elev: -9, thick: 36, round: 17, mat: 'glass', body: '#efe4c8',
  draw(c, s) {
    c.save();
    c.rotate(A_SHADE);
    // brass screw base
    const bg = c.createLinearGradient(0, -10, 0, 10);
    bg.addColorStop(0, shade(BRASS, -0.3)); bg.addColorStop(0.35, shade(BRASS, 0.5)); bg.addColorStop(1, shade(BRASS, -0.4));
    c.fillStyle = bg; c.beginPath(); rrc(c, -22, 0, 24, 20, 4); c.fill();
    c.strokeStyle = shade(BRASS, -0.45); c.lineWidth = 1.2;
    for (let u = -30; u < -12; u += 4) { c.beginPath(); c.moveTo(u, -10); c.lineTo(u + 2, 10); c.stroke(); }
    // glass globe
    const on = s.power;
    const g = c.createRadialGradient(4, -7, 2, 8, 0, BULB_R);
    g.addColorStop(0, on > 0 ? '#ffffff' : '#fffdf6');
    g.addColorStop(0.6, on > 0 ? '#ffe9a8' : '#f3ecdc');
    g.addColorStop(1, on > 0 ? '#ffc35a' : '#d8cdb6');
    c.fillStyle = g; c.beginPath(); c.arc(8, 0, BULB_R, 0, Math.PI * 2); c.fill();
    // filament on two posts
    c.strokeStyle = '#9a9488'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-8, -4); c.lineTo(8, -6); c.moveTo(-8, 4); c.lineTo(8, 6); c.stroke();
    c.strokeStyle = on > 0 ? '#fff4c0' : s.broken ? '#6a5a48' : '#c47a2e'; c.lineWidth = on > 0 ? 2.2 : 1.4;
    c.beginPath();
    if (s.broken) {
      // snapped filament dangling off one post, glass gone smoky
      c.moveTo(8, -6); c.lineTo(10, -2); c.lineTo(8, 1);
      c.moveTo(8, 6); c.lineTo(10, 4);
    } else {
      c.moveTo(8, -6);
      for (let k = 0; k <= 6; k++) c.lineTo(8 + (k % 2 ? 3 : -1), -6 + k * 2);
    }
    c.stroke();
    if (s.broken) {
      c.fillStyle = 'rgba(70,60,55,0.35)';
      c.beginPath(); c.arc(14, 2, 12, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath(); c.ellipse(2, -10, 6, 3, -0.5, 0, Math.PI * 2); c.fill();
    c.restore();
  },
};

const NECK = at(4);

export const lamp: DeviceDef = {
  id: 'lamp',
  name: { en: 'Retro Desk Lamp', vi: 'Đèn bàn cổ' },
  w: 300, h: 200,
  hasBack: false,
  parts: [
    toggleSwitch, base, cover, board, lead,
    arm('armLow', P0, P1, 6, ['armUp', 'l5'], 'Lower Arm', 'Cần đèn dưới', false),
    arm('armUp', P1, P2, 7, ['shade'], 'Upper Arm', 'Cần đèn trên', true),
    lampShade, bulb,
    ...SCREWS.map(([x, y], i) => screw(`l${i + 1}`, x, y, 'A')),
    screw('l4', NECK.x, NECK.y, 'A', 10),
    screw('l5', P0.x, P0.y, 'A'),
  ],
  working(c, t, k) {
    c.save();
    // a warm pool of light spilling out of the shade's mouth
    const m = at(SHADE_LEN + 10);
    c.translate(m.x, m.y);
    c.rotate(A_SHADE);
    c.globalAlpha = k * (0.85 + 0.15 * Math.sin(t * 3));
    const g = c.createRadialGradient(0, 0, 6, 40, 0, 110);
    g.addColorStop(0, 'rgba(255,230,150,0.75)'); g.addColorStop(0.5, 'rgba(255,210,120,0.3)'); g.addColorStop(1, 'rgba(255,200,110,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(-6, -36); c.lineTo(110, -90); c.lineTo(110, 90); c.lineTo(-6, 36); c.closePath(); c.fill();
    // little motes drifting in the beam
    c.fillStyle = 'rgba(255,250,220,0.9)';
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.25 + i / 6) % 1;
      c.globalAlpha = k * Math.sin(ph * Math.PI);
      c.beginPath(); c.arc(10 + ph * 80, Math.sin(i * 2.1 + t) * 30 * ph, 1.6, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },
  workFx: { kind: 'spark', x: at(SHADE_LEN + 14).x, y: at(SHADE_LEN + 14).y, color: '#ffe08a', dir: A_SHADE },
};
