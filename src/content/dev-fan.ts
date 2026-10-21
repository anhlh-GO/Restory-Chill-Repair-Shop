// 1950s chrome-cage desk fan lying on its back: seafoam enamel body on a
// pedestal base with a piano-key switch plate, a polished wire cage with a red
// enamel badge, four swept brass blades on a riveted spider, a steel motor bell
// behind them. Twenty years in a boxing gym: the enamel is worn to primer where hands lift it.

import { type C, type Pts, shade, rrc, rrPath, ellPath, rng, shapeFrom, roundedPts, ellPts, FONT_BOLD } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { coil, boss, cylH } from './kit';

const ENAMEL = '#7fbfac';
const ENAMEL_IN = '#3e5f57';
const CHROME = '#d3d7dd';
const BRASS = '#d4a24a';
const RED = '#c4352c';
const IVORY = '#f1e7d0';
const SANS = '"Helvetica Neue", Arial, sans-serif';

// The cage circle sits at (0, CY); neck and pedestal base hang below it.
const CY = -24;
const R0 = 110;
const BASE = { y: 122, w: 196, h: 52 };
const SW = { x: 0, y: 106, w: 184, h: 72 };
const KY = 122 - SW.y; // key row, in the cover's own coordinates

// ---------------- painting helpers ----------------

function font(c: C, size: number, weight = 700, family = SANS, style = ''): void {
  c.font = `${style} ${weight} ${size}px ${family}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
}

/** Glossy baked enamel: a soft vertical sheen plus faint orange-peel speckle. */
function enamel(c: C, path: Path2D, y0: number, y1: number, seed: number): void {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, shade(ENAMEL, 0.18)); g.addColorStop(0.5, ENAMEL); g.addColorStop(1, shade(ENAMEL, -0.14));
  c.fillStyle = g;
  c.fill(path);
  c.save();
  c.clip(path);
  const r = rng(seed);
  for (let i = 0; i < 700; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(20,50,40,0.06)' : 'rgba(255,255,255,0.08)';
    c.fillRect(-112 + r() * 224, y0 + r() * (y1 - y0), 1.2, 1.2);
  }
  c.restore();
}

/** Polished chrome along a band: bright and dark streaks like a reflection of the room. */
function chromeBand(c: C, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#f7f8fa'); g.addColorStop(0.18, '#9da3ac'); g.addColorStop(0.32, '#eef0f3');
  g.addColorStop(0.55, CHROME); g.addColorStop(0.72, '#7f858f'); g.addColorStop(0.86, '#e9ecef'); g.addColorStop(1, '#b4b9c1');
  return g;
}

/** Concentric chrome wires lit by a conic sheen, so each wire looks round. */
function wireSheen(c: C, r: number): CanvasGradient | string {
  const cc = c as C & { createConicGradient?: (a: number, x: number, y: number) => CanvasGradient };
  if (!cc.createConicGradient) return CHROME;
  const g = cc.createConicGradient(-0.6, 0, 0);
  const stops: [number, string][] = [[0, '#ffffff'], [0.12, '#b8bec6'], [0.25, '#7d838c'], [0.38, '#dfe2e6'], [0.5, '#ffffff'], [0.62, '#a9afb7'], [0.75, '#737a83'], [0.88, '#d6dade'], [1, '#ffffff']];
  for (const [k, col] of stops) g.addColorStop(k, col);
  void r;
  return g;
}

// ---------------- housing: enamel body, neck and pedestal base ----------------

function housingPts(inset = 0): Pts {
  const out: Pts = [];
  const r = R0 - inset;
  const nx = 36 - inset;
  // the disc, from the right side of the neck round over the top to its left side
  const a0 = Math.asin(nx / r);
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 - a0 - (i / n) * (Math.PI * 2 - a0 * 2);
    out.push([Math.cos(a) * r, CY + Math.sin(a) * r]);
  }
  // neck down into the pedestal, then round the base
  const by0 = BASE.y - BASE.h / 2 + inset, by1 = BASE.y + BASE.h / 2 - inset, bx = BASE.w / 2 - inset;
  const tail = roundedPts([
    [-nx, CY + Math.cos(a0) * r + 6, 0], [-nx, by0, 12], [-bx, by0, 18], [-bx, by1, 16], [bx, by1, 16], [bx, by0, 18], [nx, by0, 12],
    [nx, CY + Math.cos(a0) * r + 6, 0],
  ]);
  return [...out, ...tail];
}

const HOUSING = shapeFrom(housingPts());
const HOUSING_IN = shapeFrom(housingPts(10));
const HW = 196, HTOP = CY - R0, HBOT = BASE.y + BASE.h / 2;

const housing: PartDef = {
  id: 'housing', name: { en: 'Enamel Body', vi: 'Thân quạt sơn men' }, side: 'A', z: 0, x: 0, y: 0, w: 220, h: HBOT - HTOP, icon: '🟢',
  shape: HOUSING, needs: ['motor', 'plug', 'cap'], tool: 'sponge', thick: 40, cavity: 28, round: 20, wall: 10, body: shade(ENAMEL, -0.2),
  draw(c) {
    enamel(c, HOUSING, HTOP, HBOT, 3);
    // a polished chrome bead along the base's front, just under the top edge of the wall
    c.save(); c.clip(HOUSING);
    c.fillStyle = chromeBand(c, -HW / 2, 0, HW / 2, 0);
    c.fillRect(-HW / 2, HBOT - 6.5, HW, 1.6);
    c.restore();
    c.strokeStyle = shade(ENAMEL, -0.3); c.lineWidth = 1;
    c.beginPath(); c.arc(0, CY, R0 - 4, Math.PI * 0.62, Math.PI * 2.38); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 0.8;
    c.beginPath(); c.arc(0, CY, R0 - 3, Math.PI * 0.62, Math.PI * 2.38); c.stroke();
    // the inside: dark enamel tub with an inner shadow
    c.fillStyle = ENAMEL_IN;
    c.fill(HOUSING_IN);
    c.save(); c.clip(HOUSING_IN);
    c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 16; c.translate(3, 5); c.stroke(HOUSING_IN);
    c.restore();
    // rear air slots radiating round the motor mount, pressed into the steel
    c.lineCap = 'round';
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      c.strokeStyle = '#121a18'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(Math.cos(a) * 46, CY + Math.sin(a) * 46); c.lineTo(Math.cos(a) * 90, CY + Math.sin(a) * 90); c.stroke();
      c.strokeStyle = 'rgba(160,210,195,0.25)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(Math.cos(a) * 46 + 1.5, CY + Math.sin(a) * 46 + 2.5); c.lineTo(Math.cos(a) * 90 + 1.5, CY + Math.sin(a) * 90 + 2.5); c.stroke();
    }
    // motor cradle with its three rubber grommets
    c.fillStyle = shade(ENAMEL_IN, -0.25); c.beginPath(); c.arc(0, CY, 40, 0, Math.PI * 2); c.fill();
    c.strokeStyle = shade(ENAMEL_IN, 0.25); c.lineWidth = 2; c.beginPath(); c.arc(0, CY, 40, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      c.fillStyle = '#1d1d1f'; c.beginPath(); c.arc(Math.cos(a) * 34, CY + Math.sin(a) * 34, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#9aa0a8'; c.beginPath(); c.arc(Math.cos(a) * 34, CY + Math.sin(a) * 34, 1.8, 0, Math.PI * 2); c.fill();
    }
    // cloth-wrapped harness from the motor down the neck to the switch plate
    for (const [dx, col] of [[-6, '#7a2e22'], [-2, '#2b2b2f'], [2, '#d6c38a'], [6, '#3a5a8a']] as const) {
      c.strokeStyle = col; c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(dx, CY + 36); c.bezierCurveTo(dx * 1.4, 70, dx, 90, dx * 4, 112); c.stroke();
    }
    c.fillStyle = '#e8dcc0'; c.beginPath(); rrc(c, 0, 82, 22, 6, 2); c.fill();
    for (const [x, y] of [[-82, 112], [82, 112]] as const) boss(c, x, y, '#5a6a64');
  },
};

// ---------------- base internals ----------------

const plugShape = rrPath(0, 0, 70, 30, 10);
const plug: PartDef = {
  id: 'plug', name: { en: 'Power Cord', vi: 'Dây nguồn' }, side: 'A', z: 2, x: -48, y: BASE.y, w: 70, h: 30, icon: '🔌',
  shape: plugShape, needs: ['switch'], thick: 9, round: 4.5, mat: 'rubber', body: '#5a4632',
  bumps: [
    { kind: 'box', x: 30, y: -4, w: 9, h: 2, height: 2, color: '#d7b25a', metal: true },
    { kind: 'box', x: 30, y: 4, w: 9, h: 2, height: 2, color: '#d7b25a', metal: true },
  ],
  draw(c, s) {
    // a hank of brown cloth-braided cord, tied with a twist, ending in a bakelite plug
    c.fillStyle = '#4a3a2a'; c.beginPath(); rrc(c, 0, 0, 70, 30, 10); c.fill();
    c.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      const p = new Path2D();
      p.ellipse(-8, 0, 24 - k * 1.5, 10 - k * 0.8, 0.05 * k, 0, Math.PI * 2);
      c.strokeStyle = '#6b4f33'; c.lineWidth = 5; c.stroke(p);
      c.strokeStyle = 'rgba(255,225,170,0.35)'; c.lineWidth = 1; c.setLineDash([1.4, 1.6]); c.stroke(p); c.setLineDash([]);
    }
    c.fillStyle = '#c9c3b2'; c.beginPath(); rrc(c, -8, -9, 6, 4, 1); c.fill();
    // the plug body: dark brown bakelite with a moulded grip
    const g = c.createLinearGradient(0, -12, 0, 12);
    g.addColorStop(0, '#5a3a22'); g.addColorStop(0.35, '#7a5234'); g.addColorStop(1, '#2e1d10');
    c.fillStyle = g; c.beginPath(); rrc(c, 22, 0, 16, 22, 4); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.8;
    for (let y = -8; y <= 8; y += 3) { c.beginPath(); c.moveTo(16, y); c.lineTo(28, y); c.stroke(); }
    // bare leads into the switch plate's terminals
    for (const [y, col] of [[-6, '#b5462f'], [6, '#2b2b2f']] as const) {
      c.strokeStyle = col; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(-30, y); c.lineTo(-35, y * 1.4); c.stroke();
      c.strokeStyle = '#d9894a'; c.lineWidth = 1; c.beginPath(); c.moveTo(-34, y * 1.35); c.lineTo(-36, y * 1.5); c.stroke();
    }
    if (s.broken) {
      c.strokeStyle = '#c87a2e'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-14, -6); c.lineTo(-10, -12); c.moveTo(-12, -5); c.lineTo(-6, -11); c.stroke();
    }
  },
};

const capShape = rrPath(0, 0, 58, 24, 10);
const cap: PartDef = {
  id: 'cap', name: { en: 'Run Capacitor', vi: 'Tụ điện' }, side: 'A', z: 2, x: 50, y: BASE.y, w: 58, h: 24, icon: '🔋',
  shape: capShape, needs: ['switch'], thick: 20, round: 11, mat: 'metal', body: '#6d7480',
  draw(c) {
    // oval steel can lying down, paper label, two solder tags
    cylH(c, 50, 22, '#a7aeb8', '#c9ccd2');
    c.fillStyle = '#e9dfc4'; c.fillRect(-14, -11, 28, 22);
    c.fillStyle = '#2b3a6a'; c.fillRect(-14, -11, 28, 5);
    font(c, 3.4, 800); c.fillStyle = '#f1e7d0'; c.fillText('CHILLCO', 0, -8.5);
    font(c, 3.6, 700); c.fillStyle = '#2b2b2f'; c.fillText('2 µF', 0, -1.5); c.fillText('250 VAC', 0, 4);
    c.fillStyle = '#d9b25a'; c.fillRect(-29, -4, 4, 2.4); c.fillRect(-29, 2, 4, 2.4);
  },
};

// ---------------- piano-key switch plate on the base ----------------

// The enamel cover over the neck and the base, with the chrome key bezel set into it.
const SWITCH = shapeFrom(roundedPts([
  [-30, -SW.h / 2, 8], [30, -SW.h / 2, 8], [30, KY - 18, 10], [92, KY - 18, 14], [92, SW.h / 2, 12],
  [-92, SW.h / 2, 12], [-92, KY - 18, 14], [-30, KY - 18, 10],
]));
const KEYS = [{ x: -27, l: 'OFF' }, { x: -9, l: 'LO' }, { x: 9, l: 'MED' }, { x: 27, l: 'HI' }];
const speed: PartDef = {
  id: 'switch', name: { en: 'Switch Cover', vi: 'Nắp phím tốc độ' }, side: 'A', z: 5, x: SW.x, y: SW.y, w: 184, h: SW.h, icon: '🎹',
  shape: SWITCH, needs: ['k5', 'k6'], elev: 34, thick: 6, round: 4, body: shade(ENAMEL, -0.2),
  bumps: KEYS.map((k, i) => ({ kind: 'box' as const, x: k.x, y: KY - 1, w: 15, h: 24, height: i === 0 ? 3.5 : 7, color: i === 0 ? RED : IVORY })),
  draw(c, s) {
    enamel(c, SWITCH, -SW.h / 2, SW.h / 2, 5);
    c.strokeStyle = shade(ENAMEL, -0.35); c.lineWidth = 0.8; c.stroke(SWITCH);
    // a pressed rib down the neck, the oscillation knob's slot
    c.fillStyle = shade(ENAMEL, -0.12); c.beginPath(); rrc(c, 0, -14, 30, 30, 8); c.fill();
    c.fillStyle = '#1d2b27'; c.beginPath(); rrc(c, 0, -14, 4, 18, 2); c.fill();
    font(c, 3, 700); c.fillStyle = shade(ENAMEL, -0.5); c.fillText('OSC', 0, -27);
    // brushed chrome key bezel with the black well
    c.save(); c.translate(0, KY);
    const bez = rrPath(0, 0, 160, 32, 7);
    c.fillStyle = chromeBand(c, 0, -16, 0, 16);
    c.fill(bez);
    c.save(); c.clip(bez);
    const r = rng(9);
    c.lineWidth = 0.35;
    for (let i = 0; i < 160; i++) {
      const y = -16 + r() * 32, x = -80 + r() * 110;
      c.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(60,66,76,0.18)';
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 20 + r() * 40, y); c.stroke();
    }
    c.restore();
    c.strokeStyle = '#6f757e'; c.lineWidth = 0.8; c.stroke(bez);
    c.fillStyle = '#17181b'; c.beginPath(); rrc(c, 0, -1, 74, 28, 3); c.fill();
    KEYS.forEach((k, i) => {
      c.fillStyle = i === 0 ? RED : IVORY;
      c.beginPath(); rrc(c, k.x, -1, 15, 24, 2); c.fill();
      font(c, 3.4, 800); c.fillStyle = '#3a3a3e'; c.fillText(k.l, k.x, 14);
    });
    // nameplate: red enamel script on a chrome lozenge, and the amber pilot light
    c.fillStyle = RED; c.beginPath(); rrc(c, -54, -2, 26, 12, 6); c.fill();
    font(c, 6.5, 800, FONT_BOLD, 'italic'); c.fillStyle = '#fff3dc'; c.fillText('Chill', -54, -1.5);
    font(c, 3.2, 700); c.fillStyle = '#3a3e46'; c.fillText('3 SPEED', -54, 9.5);
    const on = s.power > 0;
    if (on) {
      const g = c.createRadialGradient(54, -2, 0.5, 54, -2, 9);
      g.addColorStop(0, `rgba(255,190,90,${0.8 * s.power})`); g.addColorStop(1, 'rgba(255,190,90,0)');
      c.fillStyle = g; c.beginPath(); c.arc(54, -2, 9, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#7d828b'; c.beginPath(); c.arc(54, -2, 5.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = on ? '#ffc25a' : '#7a3a1c'; c.beginPath(); c.arc(54, -2, 4, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(52.8, -3.4, 1.2, 0, Math.PI * 2); c.fill();
    font(c, 3.2, 700); c.fillStyle = '#3a3e46'; c.fillText('110V AC', 54, 9.5);
    c.restore();
    // the enamel worn to grey primer where hands lift it
    for (const [x, y] of [[-84, KY + 14], [86, KY + 12]] as const) {
      c.fillStyle = 'rgba(185,178,162,0.8)'; c.beginPath(); c.ellipse(x, y, 4, 2.4, 0.3, 0, Math.PI * 2); c.fill();
    }
  },
};

// ---------------- motor ----------------

const motor: PartDef = {
  id: 'motor', name: { en: 'Motor', vi: 'Mô-tơ' }, side: 'A', z: 3, x: 0, y: CY, w: 72, h: 72, icon: '⚙️',
  shape: ellPath(0, 0, 36, 36), needs: ['rear'], elev: 12, thick: 18, round: 16, mat: 'metal', body: '#6e747d',
  bumps: [
    { kind: 'cyl', x: 0, y: 0, w: 7, height: 6, color: '#e9ecef', metal: true },
    { kind: 'cyl', x: 18, y: -18, w: 8, height: 3, color: '#c9a24a', metal: true },
  ],
  draw(c, s) {
    // stamped steel end bell, satin grey, four through-bolts, the windings through the vents
    const g = c.createRadialGradient(-12, -14, 2, 0, 0, 36);
    g.addColorStop(0, '#f2f4f6'); g.addColorStop(0.5, '#a9afb8'); g.addColorStop(1, '#5c626b');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, 36, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#4a4f57'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 33, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 4; i++) {
      c.save();
      c.rotate((i / 4) * Math.PI * 2 + Math.PI / 4);
      c.fillStyle = '#1d1e22'; c.beginPath(); rrc(c, 0, -21, 18, 10, 4); c.fill();
      c.translate(0, -21);
      coil(c, 15, 7.5);
      c.restore();
      const a = (i / 4) * Math.PI * 2;
      c.fillStyle = '#d7dbe0'; c.beginPath(); c.arc(Math.cos(a) * 28, Math.sin(a) * 28, 2.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#5a5e66'; c.fillRect(Math.cos(a) * 28 - 1.6, Math.sin(a) * 28 - 0.4, 3.2, 0.8);
    }
    // bearing boss and the shaft
    c.fillStyle = '#6a7079'; c.beginPath(); c.arc(0, 0, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c9ced5'; c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill();
    // brass oil cup
    c.fillStyle = '#9a7430'; c.beginPath(); c.arc(18, -18, 4.5, 0, Math.PI * 2); c.fill();
    font(c, 2.8, 800); c.fillStyle = '#2b2b2f'; c.fillText('OIL', 18, -11);
    // the four colour-coded leads to the switch, at the bottom of the bell
    const leads = ['#b5462f', '#2b2b2f', '#d6c38a', '#3a5a8a'];
    leads.forEach((col, i) => {
      const x = -12 + i * 8;
      c.fillStyle = '#2a2a2e'; c.beginPath(); rrc(c, x, 27, 6, 6, 1.5); c.fill();
      c.fillStyle = col; c.beginPath(); rrc(c, x, 32, 4, 8, 1.5); c.fill();
      c.fillStyle = '#e8c15a'; c.beginPath(); c.arc(x, 26, 1.6, 0, Math.PI * 2); c.fill();
    });
    font(c, 3.2, 700); c.fillStyle = '#33363c'; c.fillText('1/40 HP · 1550 RPM', 0, -27);
    if (s.broken) {
      c.strokeStyle = '#3a2a1a'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-12, 27); c.lineTo(-18, 14); c.stroke();
      c.fillStyle = 'rgba(30,20,10,0.6)'; c.beginPath(); c.arc(14, 14, 7, 0, Math.PI * 2); c.fill();
    }
  },
};

// ---------------- wire grilles ----------------

/** A wire grille: radial spokes + rings are solid, the gaps between are holes. */
function grillePts(R: number, hub: number, bands: [number, number, number][], wire = 1.3): { outer: Pts; holes: Pts[] } {
  const holes: Pts[] = [];
  if (hub < 0) holes.push(ellPts(0, 0, -hub, -hub, 32));
  for (const [r0, r1, n] of bands) {
    const off = Math.PI / n;
    for (let i = 0; i < n; i++) {
      const a0 = off + (i / n) * Math.PI * 2, a1 = off + ((i + 1) / n) * Math.PI * 2;
      const p: Pts = [];
      const da0 = wire / r0, da1 = wire / r1;
      const k1 = Math.max(3, Math.ceil(((a1 - a0) * r1) / 5));
      const k0 = Math.max(2, Math.ceil(((a1 - a0) * r0) / 5));
      for (let k = 0; k <= k1; k++) { const a = a0 + da1 + ((a1 - a0 - da1 * 2) * k) / k1; p.push([Math.cos(a) * r1, Math.sin(a) * r1]); }
      for (let k = k0; k >= 0; k--) { const a = a0 + da0 + ((a1 - a0 - da0 * 2) * k) / k0; p.push([Math.cos(a) * r0, Math.sin(a) * r0]); }
      holes.push(p);
    }
  }
  return { outer: ellPts(0, 0, R, R, 96), holes };
}

const REAR_P = grillePts(100, -38, [[41, 70, 16], [73, 96, 32]]);
const REAR = shapeFrom(REAR_P.outer, REAR_P.holes);
const rear: PartDef = {
  id: 'rear', name: { en: 'Rear Guard', vi: 'Lồng quạt sau' }, side: 'A', z: 4, x: 0, y: CY, w: 200, h: 200, icon: '◎',
  shape: REAR, needs: ['rotor'], tool: 'brush', elev: 22, thick: 3, round: 1.5, mat: 'metal', body: '#9aa0a8',
  draw(c) {
    c.save();
    c.clip(REAR);
    c.fillStyle = wireSheen(c, 100);
    c.fillRect(-100, -100, 200, 200);
    // mounting ring round the motor, rim ring
    c.strokeStyle = 'rgba(40,44,50,0.35)'; c.lineWidth = 1;
    for (const r of [39.5, 71.5, 97]) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
    c.restore();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      c.fillStyle = '#e9ecef'; c.beginPath(); c.arc(Math.cos(a) * 39.5, Math.sin(a) * 39.5, 2.2, 0, Math.PI * 2); c.fill();
    }
  },
};

// Front guard: wire rings and spokes, a solid badge disc in the middle, a rolled rim.
const CAGE_P = grillePts(110, 0, [[30, 62, 18], [66, 101, 36]]);
const CAGE = shapeFrom(CAGE_P.outer, CAGE_P.holes);

const cage: PartDef = {
  id: 'cage', name: { en: 'Front Guard', vi: 'Lồng quạt trước' }, side: 'A', z: 8, x: 0, y: CY, w: 220, h: 220, icon: '◎',
  shape: CAGE, needs: ['c1', 'c2', 'c3', 'c4'], tool: 'brush', elev: 40, thick: 5, round: 4, mat: 'metal', body: '#a3a9b1',
  draw(c, s) {
    c.save();
    c.clip(CAGE);
    c.fillStyle = wireSheen(c, 110);
    c.fillRect(-110, -110, 220, 220);
    // rolled rim: a polished tube, bright on top-left, shadowed bottom-right
    const rim = c.createLinearGradient(-110, -110, 110, 110);
    rim.addColorStop(0, '#ffffff'); rim.addColorStop(0.3, '#cfd3d9'); rim.addColorStop(0.55, '#8a9099'); rim.addColorStop(0.8, '#dfe2e6'); rim.addColorStop(1, '#7b818a');
    c.strokeStyle = rim; c.lineWidth = 9;
    c.beginPath(); c.arc(0, 0, 105.5, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 1;
    c.beginPath(); c.arc(0, 0, 107, Math.PI * 1.05, Math.PI * 1.45); c.stroke();
    c.restore();
    // the badge: chrome bezel, red enamel, the brand in script
    const bz = c.createLinearGradient(-30, -30, 30, 30);
    bz.addColorStop(0, '#ffffff'); bz.addColorStop(0.5, '#9ca2ab'); bz.addColorStop(1, '#eef0f2');
    c.fillStyle = bz; c.beginPath(); c.arc(0, 0, 29, 0, Math.PI * 2); c.fill();
    const g = c.createRadialGradient(-8, -10, 2, 0, 0, 24);
    g.addColorStop(0, shade(RED, 0.35)); g.addColorStop(0.7, RED); g.addColorStop(1, shade(RED, -0.35));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 24, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#e8c87a'; c.lineWidth = 0.8; c.beginPath(); c.arc(0, 0, 21.5, 0, Math.PI * 2); c.stroke();
    font(c, 12, 800, FONT_BOLD, 'italic');
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillText('Chill', 0.6, -2.2);
    c.fillStyle = '#fff4dc'; c.fillText('Chill', 0, -3);
    font(c, 4.6, 800); c.fillStyle = '#f0d9a0'; c.fillText('— AIRE —', 0, 7.5);
    font(c, 2.8, 700); c.fillStyle = '#f0d9a0'; c.fillText('12 IN · OSCILLATING', 0, 13.5);
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.ellipse(-9, -14, 9, 3.5, -0.5, 0, Math.PI * 2); c.fill();
    if (s.power > 0) {
      c.fillStyle = `rgba(255,240,200,${0.15 * s.power})`; c.beginPath(); c.arc(0, 0, 24, 0, Math.PI * 2); c.fill();
    }
  },
};

// ---------------- blades ----------------

// Four broad swept blades as one outline: a hub disc plus a lopsided petal per blade
// (straighter leading edge, fuller trailing edge, a squared-off tip).
const BLADES = 4;
const HUB = 22;
const BLADE_R = 94;
function rotorPts(): Pts {
  const out: Pts = [];
  const n = 220;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let r = HUB;
    for (let b = 0; b < BLADES; b++) {
      let u = a - (b / BLADES) * Math.PI * 2;
      u = Math.atan2(Math.sin(u), Math.cos(u));
      const hw = u < 0 ? 0.5 : 0.78;
      if (Math.abs(u) < hw) {
        const k = Math.abs(u) / hw;
        r = Math.max(r, HUB + (BLADE_R - HUB) * Math.pow(1 - Math.pow(k, u < 0 ? 2.4 : 1.7), u < 0 ? 0.32 : 0.5));
      }
    }
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
}
const ROTOR = shapeFrom(rotorPts());

const rotor: PartDef = {
  id: 'rotor', name: { en: 'Brass Blades', vi: 'Cánh quạt đồng' }, side: 'A', z: 6, x: 0, y: CY, w: 188, h: 188, icon: '✤',
  shape: ROTOR, needs: ['spinner'], tool: 'brush', elev: 29, thick: 5, round: 2.5, mat: 'metal', body: '#8a6424',
  draw(c, s) {
    c.save();
    c.clip(ROTOR);
    const g = c.createRadialGradient(0, 0, HUB, 0, 0, BLADE_R);
    g.addColorStop(0, shade(BRASS, -0.2)); g.addColorStop(0.55, BRASS); g.addColorStop(1, shade(BRASS, 0.2));
    c.fillStyle = g;
    c.fillRect(-BLADE_R, -BLADE_R, BLADE_R * 2, BLADE_R * 2);
    // spun-polish rings
    c.lineWidth = 0.5;
    for (let r = HUB + 3; r < BLADE_R; r += 2.2) {
      c.strokeStyle = (r * 7) % 3 < 1.5 ? 'rgba(255,240,200,0.18)' : 'rgba(110,70,20,0.12)';
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
    }
    // the pitch of each blade: the leading half falls away into shadow, the trailing half catches light
    for (let b = 0; b < BLADES; b++) {
      c.save();
      c.rotate((b / BLADES) * Math.PI * 2);
      const sh = c.createLinearGradient(0, -40, 0, 50);
      sh.addColorStop(0, 'rgba(90,50,10,0.45)'); sh.addColorStop(0.45, 'rgba(90,50,10,0)'); sh.addColorStop(0.7, 'rgba(255,245,210,0.35)'); sh.addColorStop(1, 'rgba(255,245,210,0)');
      c.fillStyle = sh;
      c.fillRect(HUB, -BLADE_R, BLADE_R, BLADE_R * 2);
      // the crease where the blade is pressed onto its spider arm
      c.strokeStyle = 'rgba(90,55,15,0.5)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(HUB + 2, 2); c.quadraticCurveTo(50, 8, 70, 18); c.stroke();
      c.strokeStyle = 'rgba(255,240,200,0.6)';
      c.beginPath(); c.moveTo(HUB + 2, 3.2); c.quadraticCurveTo(50, 9.2, 70, 19.2); c.stroke();
      // the steel spider arm and its two rivets
      c.fillStyle = '#7d838c'; c.beginPath(); rrc(c, HUB + 10, 6, 22, 10, 4); c.fill();
      for (const x of [HUB + 4, HUB + 16]) {
        c.fillStyle = '#e4e7ea'; c.beginPath(); c.arc(x, 6, 2.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.arc(x + 0.5, 6.6, 1, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
    if (s.power > 0) {
      c.fillStyle = `rgba(230,190,120,${0.55 * s.power})`;
      c.beginPath(); c.arc(0, 0, BLADE_R, 0, Math.PI * 2); c.fill();
    }
    if (s.broken) {
      // one blade knocked by a glove: bent at the tip, a dark crease and a dull dent
      c.save(); c.rotate(Math.PI / 2);
      c.strokeStyle = '#5a3a10'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(66, -16); c.lineTo(58, 2); c.lineTo(70, 22); c.stroke();
      c.fillStyle = 'rgba(70,40,10,0.35)';
      c.beginPath(); c.moveTo(66, -16); c.lineTo(58, 2); c.lineTo(70, 22); c.lineTo(94, 10); c.lineTo(92, -18); c.closePath(); c.fill();
      c.restore();
    }
    c.restore();
    // pressed steel hub with the set-screw boss
    const hg = c.createRadialGradient(-6, -7, 1, 0, 0, HUB);
    hg.addColorStop(0, '#eef0f2'); hg.addColorStop(0.6, '#9aa0a8'); hg.addColorStop(1, '#5c626b');
    c.fillStyle = hg; c.beginPath(); c.arc(0, 0, HUB, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#4a4f57'; c.lineWidth = 0.8; c.beginPath(); c.arc(0, 0, HUB - 4, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#3a3e46'; c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill();
  },
};

const spinner: PartDef = {
  id: 'spinner', name: { en: 'Blade Spinner', vi: 'Núm khóa cánh' }, side: 'A', z: 7, x: 0, y: CY, w: 36, h: 36, icon: '🔘',
  shape: ellPath(0, 0, 18, 18), needs: ['cage'], elev: 33, thick: 10, round: 9, mat: 'metal', body: '#7d838c',
  draw(c, s) {
    // chrome acorn spinner: knurled skirt, polished dome, the turn-to-loosen arrow
    c.fillStyle = '#5f656e'; c.beginPath(); c.arc(0, 0, 18, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c9ced5';
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      c.beginPath(); c.arc(Math.cos(a) * 16.5, Math.sin(a) * 16.5, 1, 0, Math.PI * 2); c.fill();
    }
    const g = c.createRadialGradient(-5, -6, 1, 0, 0, 14);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, CHROME); g.addColorStop(1, '#6a7079');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 14, 0, Math.PI * 2); c.fill();
    c.save();
    c.rotate(s.power > 0 ? s.time * 9 : 0);
    c.strokeStyle = '#4a4f57'; c.lineWidth = 1;
    c.beginPath(); c.arc(0, 0, 9, -2.4, 0.6); c.stroke();
    c.fillStyle = '#4a4f57'; c.beginPath(); c.moveTo(Math.cos(0.6) * 9 + 2, Math.sin(0.6) * 9 - 2); c.lineTo(Math.cos(0.6) * 9 - 2.5, Math.sin(0.6) * 9 - 0.5); c.lineTo(Math.cos(0.6) * 9 + 0.5, Math.sin(0.6) * 9 + 3); c.closePath(); c.fill();
    c.restore();
  },
};

const A45 = Math.SQRT1_2 * 105;

export const fan: DeviceDef = {
  id: 'fan',
  name: { en: 'Chrome Desk Fan', vi: 'Quạt bàn lồng crôm' },
  w: 224, h: HBOT - HTOP,
  hasBack: false,
  parts: [
    housing, plug, cap, motor, rear, speed, rotor, spinner, cage,
    screw('c1', -A45, CY - A45, 'A'), screw('c2', A45, CY - A45, 'A'), screw('c3', -A45, CY + A45, 'A'), screw('c4', A45, CY + A45, 'A'),
    screw('k5', -74, SW.y + KY, 'A'), screw('k6', 74, SW.y + KY, 'A'),
  ],
  working(c, t, k) {
    c.save();
    c.translate(0, CY);
    // spinning blur of the brass under the cage
    c.globalAlpha = k * 0.5;
    for (let i = 0; i < BLADES; i++) {
      const a = t * 14 + (i / BLADES) * Math.PI * 2;
      c.fillStyle = 'rgba(240,200,120,0.4)';
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
