// A 16-bit era game pad: the dog-bone shell in warm light grey ABS, a charcoal
// cross pad in a dished well, convex purple A/B and concave lavender X/Y in their
// grooved lozenge, rubber SELECT/START pills, curved L/R bumpers wrapping the top
// of each grip, the cord leaving through a ribbed boot. Two faces: the back shell
// carries the label sticker; inside, a long board over the rubber membranes and a
// rumble motor in each grip.

import { type C, type Pts, shade, rrc, rrPath, rng, shapeFrom, roundedPts, FONT_BOLD } from '../core/draw';
import { type DeviceDef, type PartDef, type Bump, screw } from './device';
import { cylH, boss, ribbon } from './kit';

const SHELL = '#b3afbd';
// slab-free painting: these are plain hex so shade() works on them
const SHELL_B = '#aca8b6';
const CHAR = '#3a3840';
const PURPLE = '#5a3f8e';
const LAV = '#b8a8e6';
const GROOVE = '#9e93bf';
const RUBBER = '#8e8a94';
const SANS = '"Helvetica Neue", Arial, sans-serif';

// ---------------- the dog-bone outline ----------------

const LOBE_X = 78, LOBE_R = 62;
const JA = (125 * Math.PI) / 180;

/** Two round grips joined by a straight top edge and a soft waist underneath, `inset` units in. */
function padPts(inset = 0, mirror = false): Pts {
  const r = LOBE_R - inset;
  const out: Pts = [];
  const n = 36;
  // right grip: from the top, clockwise round to the waist
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + ((JA + Math.PI / 2) * i) / n;
    out.push([LOBE_X + Math.cos(a) * r, Math.sin(a) * r]);
  }
  // the waist: a gentle curve across to the left grip
  const jx = LOBE_X + Math.cos(JA) * r, jy = Math.sin(JA) * r;
  const cy = 30 + inset * 0.6;
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    out.push([jx * (1 - t) * (1 - t) + 0 - jx * t * t, jy * (1 - t) * (1 - t) + 2 * (1 - t) * t * cy + jy * t * t]);
  }
  // left grip: from the waist round to the top
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - JA + ((Math.PI * 1.5 - (Math.PI - JA)) * i) / n;
    out.push([-LOBE_X + Math.cos(a) * r, Math.sin(a) * r]);
  }
  return mirror ? out.map(([x, y]) => [-x, y] as [number, number]).reverse() : out;
}

const BODY = shapeFrom(padPts());
const BODY_IN = shapeFrom(padPts(9));
const BACK = shapeFrom(padPts(0, true));
const W = 280, H = 124;

// Front layout (device units). The back view mirrors x.
const DPAD = { x: -LOBE_X, y: 2 };
const FACE = { x: LOBE_X, y: 2 };
const BTN: { k: string; x: number; y: number; col: string; dish: boolean }[] = [
  { k: 'X', x: FACE.x, y: FACE.y - 21, col: LAV, dish: true },
  { k: 'A', x: FACE.x + 21, y: FACE.y, col: PURPLE, dish: false },
  { k: 'B', x: FACE.x, y: FACE.y + 21, col: PURPLE, dish: false },
  { k: 'Y', x: FACE.x - 21, y: FACE.y, col: LAV, dish: true },
];
const PILLS: [number, number, string][] = [[-17, 22, 'SELECT'], [17, 22, 'START']];
const PILL_ANG = -0.5;
const LEDS = { x: 0, y: -46 };
const BOARD_SCREW: [number, number] = [44, -10];
const SCREWS: [number, number][] = [[-98, -26], [98, -26], [-72, 40], [72, 40]];

function font(c: C, size: number, weight = 700, family = SANS, style = ''): void {
  c.font = `${style} ${weight} ${size}px ${family}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
}

/** Fine speckle of moulded ABS. */
function grain(c: C, path: Path2D, seed: number, n: number): void {
  const r = rng(seed);
  c.save();
  c.clip(path);
  for (let i = 0; i < n; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(50,40,60,0.04)' : 'rgba(255,255,255,0.07)';
    c.fillRect((r() - 0.5) * W, (r() - 0.5) * H, 1 + r() * 1.2, 1 + r() * 1.2);
  }
  c.restore();
}

/** Rounded pill turned by `a`. */
function pillAt(c: C, x: number, y: number, w: number, h: number, a: number, fill: string | CanvasGradient): void {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.fillStyle = fill;
  c.beginPath(); rrc(c, 0, 0, w, h, h / 2); c.fill();
  c.restore();
}

/** Body colour with a soft top light, speckle and the shell's moulded parting line. */
function shellFace(c: C, path: Path2D, col: string, seed: number): void {
  const g = c.createLinearGradient(0, -H / 2, 0, H / 2);
  g.addColorStop(0, shade(col, 0.1)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.1));
  c.fillStyle = g;
  c.fill(path);
  grain(c, path, seed, 700);
}

// ---------------- top shell (the base, two-faced) ----------------

const pillBumps = (): Bump[] => PILLS.flatMap(([x, y]) => [-5, 0, 5].map((d) => ({
  kind: 'cyl' as const, x: x + Math.cos(PILL_ANG) * d, y: y + Math.sin(PILL_ANG) * d, w: 7, height: 3, color: RUBBER, view: 'F' as const,
})));

const top: PartDef = {
  id: 'top', name: { en: 'Top Shell', vi: 'Vỏ trên' }, side: 'A', z: 0, x: 0, y: 0, w: W, h: H, icon: '🎮',
  shape: BODY, needs: ['membrane', 'shoulderL', 'shoulderR'], tool: 'sponge', thick: 15, cavity: 10, round: 13, wall: 9, body: shade(SHELL, -0.18),
  bumps: [
    { kind: 'cross', x: DPAD.x, y: DPAD.y, w: 40, height: 5, color: CHAR, view: 'F' },
    { kind: 'cyl', x: DPAD.x, y: DPAD.y, w: 7, height: 5.4, color: '#2a282f', view: 'F' },
    ...BTN.map((b) => ({ kind: 'cyl' as const, x: b.x, y: b.y, w: 18, height: b.dish ? 3.6 : 5, color: b.col, view: 'F' as const })),
    ...pillBumps(),
  ],
  draw(c, s) {
    if (s.view === 'F' || !s.inDevice) {
      shellFace(c, BODY, SHELL, 11);
      // the lighter top face and the parting line just inside the edge
      c.save(); c.clip(BODY);
      c.strokeStyle = shade(SHELL, -0.22); c.lineWidth = 0.8;
      c.stroke(shapeFrom(padPts(5)));
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 0.6;
      c.save(); c.translate(0, 0.9); c.stroke(shapeFrom(padPts(5))); c.restore();
      c.restore();
      // d-pad well: a dished circle, darker at the rim, the cross's arrows moulded in
      const dg = c.createRadialGradient(DPAD.x + 4, DPAD.y + 5, 6, DPAD.x, DPAD.y, 28);
      dg.addColorStop(0, shade(SHELL, -0.04)); dg.addColorStop(0.8, shade(SHELL, -0.16)); dg.addColorStop(1, shade(SHELL, -0.26));
      c.fillStyle = dg; c.beginPath(); c.arc(DPAD.x, DPAD.y, 28, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 0.8;
      c.beginPath(); c.arc(DPAD.x, DPAD.y, 28.4, 0.2, Math.PI - 0.2); c.stroke();
      c.fillStyle = CHAR;
      c.beginPath(); rrc(c, DPAD.x, DPAD.y, 40, 13.6, 2.5); rrc(c, DPAD.x, DPAD.y, 13.6, 40, 2.5); c.fill();
      // the face-button lozenge with its two lavender grooves
      c.save(); c.translate(FACE.x, FACE.y); c.rotate(-Math.PI / 4);
      c.fillStyle = shade(SHELL, -0.08);
      c.beginPath(); rrc(c, 0, 0, 72, 72, 30); c.fill();
      for (const d of [-15, 15]) {
        const gg = c.createLinearGradient(0, d - 12, 0, d + 12);
        gg.addColorStop(0, shade(GROOVE, -0.25)); gg.addColorStop(0.5, GROOVE); gg.addColorStop(1, shade(GROOVE, 0.2));
        c.fillStyle = gg; c.beginPath(); rrc(c, 0, d, 66, 24, 12); c.fill();
      }
      c.restore();
      for (const b of BTN) {
        c.fillStyle = 'rgba(40,30,60,0.35)'; c.beginPath(); c.arc(b.x, b.y, 10.4, 0, Math.PI * 2); c.fill();
        c.fillStyle = b.col; c.beginPath(); c.arc(b.x, b.y, 9, 0, Math.PI * 2); c.fill();
      }
      // letters printed beside each button, in purple
      font(c, 5.5, 800); c.fillStyle = PURPLE;
      for (const b of BTN) c.fillText(b.k, b.x + 9.5, b.y + 9.5);
      // SELECT / START: angled rubber pills in their recesses
      for (const [x, y, l] of PILLS) {
        pillAt(c, x, y, 25, 10, PILL_ANG, shade(SHELL, -0.22));
        pillAt(c, x, y, 19, 6.5, PILL_ANG, RUBBER);
        c.save(); c.translate(x + 5, y + 11); c.rotate(PILL_ANG);
        font(c, 5, 800); c.fillStyle = PURPLE; c.fillText(l, 0, 0);
        c.restore();
      }
      // the brand: four-colour dots and the wordmark
      ['#d24a3c', '#e8b030', '#3a8ad4', '#3fae6a'].forEach((col, i) => {
        c.fillStyle = col; c.beginPath(); c.arc(-9 + (i % 2) * 6, -27 + Math.floor(i / 2) * 6, 2.6, 0, Math.PI * 2); c.fill();
      });
      font(c, 9, 800, FONT_BOLD, 'italic'); c.fillStyle = '#5a5866'; c.textAlign = 'left';
      c.fillText('CHILL', -2, -24.5);
      font(c, 4.6, 800); c.fillStyle = '#6a6876'; c.fillText('ENTERTAINMENT SYSTEM', 0, -12);
      // four player lamps under the cord; the first one lights when the pad is on
      const on = s.power > 0;
      for (let i = 0; i < 4; i++) {
        const x = LEDS.x - 13.5 + i * 9;
        const lit = on && i === 0;
        if (lit) {
          const gl = c.createRadialGradient(x, LEDS.y, 0.5, x, LEDS.y, 7);
          gl.addColorStop(0, `rgba(120,255,170,${0.7 * s.power})`); gl.addColorStop(1, 'rgba(120,255,170,0)');
          c.fillStyle = gl; c.beginPath(); c.arc(x, LEDS.y, 7, 0, Math.PI * 2); c.fill();
        }
        c.fillStyle = lit ? `rgba(150,255,190,${0.6 + 0.4 * Math.sin(s.time * 5)})` : '#7c7a86';
        c.beginPath(); rrc(c, x, LEDS.y, 5, 2.6, 1.2); c.fill();
        font(c, 3.2, 700); c.fillStyle = '#6a6876'; c.fillText(String(i + 1), x, LEDS.y + 4.6);
      }
      // the grips' worn shine where palms rest
      for (const sx of [-1, 1]) {
        const wg = c.createRadialGradient(sx * 96, 40, 2, sx * 96, 40, 24);
        wg.addColorStop(0, 'rgba(255,255,255,0.18)'); wg.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = wg; c.beginPath(); c.arc(sx * 96, 40, 24, 0, Math.PI * 2); c.fill();
      }
    } else {
      // inside of the top shell, seen from the back: everything mirrored
      shellFace(c, BACK, SHELL, 12);
      c.fillStyle = shade(SHELL, -0.32);
      c.fill(BODY_IN);
      c.save(); c.clip(BODY_IN);
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(BODY_IN);
      c.restore();
      grain(c, BODY_IN, 13, 500);
      // button holes, d-pad cross hole, pill slots
      c.fillStyle = shade(SHELL, -0.62);
      c.beginPath(); rrc(c, -DPAD.x, DPAD.y, 42, 15, 2.5); rrc(c, -DPAD.x, DPAD.y, 15, 42, 2.5); c.fill();
      for (const b of BTN) { c.beginPath(); c.arc(-b.x, b.y, 9.6, 0, Math.PI * 2); c.fill(); }
      for (const [x, y] of PILLS) pillAt(c, -x, y, 21, 8, -PILL_ANG, shade(SHELL, -0.62));
      // ribs and screw posts
      c.strokeStyle = shade(SHELL, -0.15); c.lineWidth = 3;
      for (const x of [-34, 34]) { c.beginPath(); c.moveTo(x, -52); c.lineTo(x, 30); c.stroke(); }
      for (const [x, y] of SCREWS) boss(c, x, y, SHELL);
      boss(c, BOARD_SCREW[0], BOARD_SCREW[1], SHELL);
      font(c, 4, 700); c.fillStyle = shade(SHELL, -0.55); c.fillText('CP-16  ABS  >PC<', 0, 34);
    }
  },
};

// ---------------- L / R bumpers wrapping the top of each grip ----------------

function bumperPts(sx: number): { pts: Pts; cx: number; cy: number } {
  const lobe = sx * LOBE_X;
  const a0 = sx < 0 ? (196 * Math.PI) / 180 : (-16 * Math.PI) / 180 - Math.PI * 0.53;
  const a1 = a0 + Math.PI * 0.53;
  const r0 = LOBE_R - 5, r1 = LOBE_R + 9;
  const raw: Pts = [];
  const n = 24;
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; raw.push([lobe + Math.cos(a) * r1, Math.sin(a) * r1]); }
  // rounded end cap, then back along the inside
  for (let i = 1; i < 6; i++) { const a = a1 + (Math.PI * i) / 6; const m: [number, number] = [lobe + Math.cos(a1) * (r0 + r1) / 2, Math.sin(a1) * (r0 + r1) / 2]; raw.push([m[0] + Math.cos(a1) * Math.cos(a - a1) * (r1 - r0) / 2 - Math.sin(a1) * Math.sin(a - a1) * (r1 - r0) / 2, m[1] + Math.sin(a1) * Math.cos(a - a1) * (r1 - r0) / 2 + Math.cos(a1) * Math.sin(a - a1) * (r1 - r0) / 2]); }
  for (let i = n; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / n; raw.push([lobe + Math.cos(a) * r0, Math.sin(a) * r0]); }
  for (let i = 1; i < 6; i++) { const a = a0 + Math.PI + (Math.PI * i) / 6; const m: [number, number] = [lobe + Math.cos(a0) * (r0 + r1) / 2, Math.sin(a0) * (r0 + r1) / 2]; raw.push([m[0] + Math.cos(a0) * Math.cos(a - a0) * (r1 - r0) / 2 - Math.sin(a0) * Math.sin(a - a0) * (r1 - r0) / 2, m[1] + Math.sin(a0) * Math.cos(a - a0) * (r1 - r0) / 2 + Math.cos(a0) * Math.sin(a - a0) * (r1 - r0) / 2]); }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of raw) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return { pts: raw.map(([x, y]) => [x - cx, y - cy] as [number, number]), cx, cy };
}

function shoulder(id: string, sx: number, en: string, vi: string, label: string): PartDef {
  const { pts, cx, cy } = bumperPts(sx);
  const shape = shapeFrom(pts);
  let w = 0, h = 0;
  for (const [x, y] of pts) { w = Math.max(w, Math.abs(x) * 2); h = Math.max(h, Math.abs(y) * 2); }
  const lobe = sx * LOBE_X - cx;
  return {
    id, name: { en, vi }, side: 'F', z: 6, x: cx, y: cy, w, h, icon: '🔘',
    shape, elev: 1, thick: 14, round: 7, body: shade(SHELL_B, -0.3),
    tool: id === 'shoulderL' ? 'brush' : undefined,
    draw(c) {
      const g = c.createRadialGradient(lobe, -cy, LOBE_R - 8, lobe, -cy, LOBE_R + 6);
      g.addColorStop(0, shade(SHELL_B, -0.2)); g.addColorStop(0.5, shade(SHELL_B, 0.05)); g.addColorStop(1, shade(SHELL_B, -0.15));
      c.fillStyle = g; c.fill(shape);
      // grip ribs across the bumper
      c.save(); c.clip(shape);
      c.strokeStyle = 'rgba(70,64,80,0.3)'; c.lineWidth = 0.8;
      for (let i = 0; i < 26; i++) {
        const a = (sx < 0 ? Math.PI * 1.15 : -Math.PI * 0.6) + i * 0.035 * Math.PI;
        c.beginPath(); c.moveTo(lobe + Math.cos(a) * (LOBE_R - 2), -cy + Math.sin(a) * (LOBE_R - 2)); c.lineTo(lobe + Math.cos(a) * (LOBE_R + 4), -cy + Math.sin(a) * (LOBE_R + 4)); c.stroke();
      }
      c.restore();
      c.strokeStyle = shade(SHELL_B, -0.4); c.lineWidth = 0.8; c.stroke(shape);
      // the moulded letter on the bumper's top
      const a = sx < 0 ? Math.PI * 1.32 : -Math.PI * 0.32;
      c.save(); c.translate(lobe + Math.cos(a) * (LOBE_R - 1), -cy + Math.sin(a) * (LOBE_R - 1)); c.rotate(a + Math.PI / 2);
      font(c, 6.5, 800); c.fillStyle = shade(SHELL_B, -0.45); c.fillText(label, 0, 0);
      c.restore();
    },
  };
}

// ---------------- back shell ----------------

const bottom: PartDef = {
  id: 'bottom', name: { en: 'Back Shell', vi: 'Vỏ dưới' }, side: 'B', z: 5, x: 0, y: 0, w: W, h: H, icon: '🎮',
  shape: BACK, needs: ['g1', 'g2', 'g3', 'g4'], tool: 'sponge', elev: 15, thick: 12, round: 11, body: shade(SHELL_B, -0.2),
  draw(c) {
    shellFace(c, BACK, SHELL_B, 14);
    // finger ridges under each grip
    c.lineCap = 'round';
    for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) {
      const y = 12 + i * 6.5, half = 20 - Math.abs(i - 2.5) * 2;
      c.strokeStyle = shade(SHELL_B, -0.25); c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(sx * 84 - half, y); c.lineTo(sx * 84 + half, y); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(sx * 84 - half, y + 1.4); c.lineTo(sx * 84 + half, y + 1.4); c.stroke();
    }
    // silver label sticker in the middle
    c.fillStyle = 'rgba(40,30,50,0.2)'; c.beginPath(); rrc(c, 1, -9, 92, 46, 4); c.fill();
    const lg = c.createLinearGradient(-46, -32, 46, 14);
    lg.addColorStop(0, '#eef0f3'); lg.addColorStop(0.5, '#c4c8ce'); lg.addColorStop(1, '#e4e7ea');
    c.fillStyle = lg; c.beginPath(); rrc(c, 0, -10, 92, 46, 4); c.fill();
    font(c, 7.5, 800, FONT_BOLD, 'italic'); c.fillStyle = '#3a3846'; c.fillText('CHILL', 0, -26);
    font(c, 4, 700); c.fillStyle = '#3a3846';
    c.fillText('CONTROLLER  MODEL No. CP-16', 0, -17);
    c.fillText('5V ⎓ 10mA   ·   MADE IN VIETNAM', 0, -11);
    const r = rng(77);
    c.fillStyle = '#222';
    for (let x = -30; x < 30; x += 1.3) if (r() < 0.6) c.fillRect(x, -6, r() < 0.3 ? 1.1 : 0.6, 10);
    font(c, 3.4, 700); c.fillStyle = '#4a4856'; c.fillText('8 93 4410 2201 6', 0, 8);
    // the cord's exit notch at the top edge
    c.fillStyle = shade(SHELL_B, -0.4); c.beginPath(); rrc(c, 0, -59, 20, 8, 3); c.fill();
    for (const [x, y] of SCREWS) {
      c.fillStyle = shade(SHELL_B, -0.3); c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill();
    }
  },
};

// ---------------- inside (back side, x as seen from behind) ----------------

const MEM = shapeFrom(roundedPts([
  [-112, -30, 22], [-50, -30, 6], [50, -30, 6], [112, -30, 22], [112, 32, 22], [44, 32, 8], [44, 14, 6], [-44, 14, 6], [-44, 32, 8], [-112, 32, 22],
]));
const domes: [number, number, number][] = [
  [-DPAD.x, DPAD.y - 13, 6], [-DPAD.x, DPAD.y + 13, 6], [-DPAD.x - 13, DPAD.y, 6], [-DPAD.x + 13, DPAD.y, 6],
  ...BTN.map((b) => [-b.x, b.y, 8] as [number, number, number]),
];
const membrane: PartDef = {
  id: 'membrane', name: { en: 'Rubber Membranes', vi: 'Màng nút cao su' }, side: 'B', z: 2, x: 0, y: 0, w: 224, h: 62, icon: '🫧',
  shape: MEM, needs: ['board'], elev: 5, thick: 2.5, round: 1.2, mat: 'rubber', body: '#5a5862',
  bumps: domes.flatMap(([x, y, r]) => [
    { kind: 'cyl' as const, x, y, w: r * 2 + 4, height: 2.6, color: '#6c6a74' },
    { kind: 'cyl' as const, x, y, w: r * 1.2, height: 3.6, color: '#161618' },
  ]),
  draw(c, s) {
    c.fillStyle = '#62606a'; c.fill(MEM);
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.beginPath(); rrc(c, 0, -24, 200, 6, 3); c.fill();
    // each dome with its black carbon pill
    domes.forEach(([x, y, r], i) => {
      const g = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 0.5, x, y, r + 2);
      g.addColorStop(0, '#8d8b95'); g.addColorStop(1, '#4e4c55');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r + 2, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#141416'; c.beginPath(); c.arc(x, y, r * 0.6, 0, Math.PI * 2); c.fill();
      if (s.broken && (i === 1 || i === 5 || i === 6)) {
        // torn dome: a split through the rubber, the carbon pill worn grey
        c.fillStyle = '#7a7882'; c.beginPath(); c.arc(x, y, r * 0.6, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#1a191d'; c.lineWidth = 1.3;
        c.beginPath(); c.moveTo(x - r - 9, y + 4); c.lineTo(x - r - 2, y - 2); c.lineTo(x - 1, y + 1.5); c.lineTo(x + r + 1, y - 3); c.lineTo(x + r + 8, y + 3); c.stroke();
        c.fillStyle = 'rgba(20,18,24,0.6)'; c.beginPath(); c.ellipse(x + r + 4, y + 1, 3.5, 1.4, 0.5, 0, Math.PI * 2); c.fill();
      }
    });
    // the select/start strip
    for (const [x, y] of PILLS) pillAt(c, -x, y - 4, 16, 6, -PILL_ANG, '#141416');
    font(c, 3.6, 700); c.fillStyle = '#9a98a2'; c.fillText('CP16-MB  L', 70, 26); c.fillText('R', -70, 26);
  },
};

const BOARD = rrPath(0, 0, 196, 44, 6);
const board: PartDef = {
  id: 'board', name: { en: 'Controller Board', vi: 'Bo mạch tay cầm' }, side: 'B', z: 3, x: 0, y: -8, w: 196, h: 44, icon: '🟩',
  shape: BOARD, needs: ['g5', 'cable', 'rumbleL', 'rumbleR'], elev: 7.5, thick: 2, mat: 'pcb', body: '#1d5c37',
  bumps: [
    { kind: 'box', x: -2, y: 2, w: 26, h: 10, height: 3, color: '#1b1c20' },
    { kind: 'cyl', x: 28, y: 8, w: 8, height: 7, color: '#2d3f8f' },
    { kind: 'box', x: 0, y: -18, w: 22, h: 6, height: 4, color: '#f2efe8' },
  ],
  draw(c, s) {
    const g = c.createLinearGradient(0, -22, 0, 22);
    g.addColorStop(0, '#2f8050'); g.addColorStop(1, '#24683f');
    c.fillStyle = g; c.fill(BOARD);
    c.save(); c.clip(BOARD);
    // traces from every button's contact to the shift-register chip
    c.strokeStyle = '#48a066'; c.lineWidth = 0.9;
    for (let i = 0; i < 12; i++) {
      const sx = i < 6 ? -1 : 1, k = i % 6;
      c.beginPath(); c.moveTo(sx * (92 - k * 4), -14 + k * 5); c.lineTo(sx * (40 - k * 2), -14 + k * 5); c.lineTo(sx * 13, -4 + k * 2); c.stroke();
    }
    c.fillStyle = '#d9b25a';
    for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(-90 + i * 1.5, -14 + i * 5, 1.4, 0, Math.PI * 2); c.arc(90 - i * 1.5, -14 + i * 5, 1.4, 0, Math.PI * 2); c.fill(); }
    // the DIP shift register, its pins, the decoupling cap
    c.fillStyle = '#c9ccd3';
    for (let k = -11; k <= 11; k += 3) { c.fillRect(-2 + k - 0.6, -4.5, 1.2, 2); c.fillRect(-2 + k - 0.6, 7, 1.2, 2); }
    c.fillStyle = '#1b1c20'; c.beginPath(); rrc(c, -2, 2, 26, 10, 1); c.fill();
    font(c, 3.4, 700); c.fillStyle = '#9aa0a8'; c.fillText('CD4021', -2, 2);
    // the cord connector and the rumble motor pads
    ribbon(c, 0, -18, 24, 6);
    for (const x of [-88, 88]) {
      c.fillStyle = '#e8c15a';
      c.beginPath(); c.arc(x, 12, 2.4, 0, Math.PI * 2); c.arc(x, 18, 2.4, 0, Math.PI * 2); c.fill();
    }
    font(c, 3.6, 800); c.fillStyle = '#eef0e6'; c.fillText('CP-16 MAIN  REV.B', 50, 16);
    c.restore();
    if (s.broken) {
      const bg = c.createRadialGradient(28, 8, 1, 28, 8, 18);
      bg.addColorStop(0, 'rgba(20,12,8,0.9)'); bg.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = bg; c.beginPath(); c.arc(28, 8, 18, 0, Math.PI * 2); c.fill();
    }
  },
};

const rumbleShape = rrPath(0, 0, 50, 22, 10);
function rumble(id: string, x: number, en: string, vi: string): PartDef {
  const dir = x < 0 ? -1 : 1;
  return {
    id, name: { en, vi }, side: 'B', z: 4, x, y: 30, w: 50, h: 22, icon: '📳',
    shape: rumbleShape, needs: ['bottom'], elev: 5, thick: 11, round: 10, mat: 'metal', body: '#6d7480',
    draw(c, s) {
      // the can held in a black rubber boot, the half-moon weight on its shaft
      c.fillStyle = '#1e1e22'; c.beginPath(); rrc(c, -dir * 4, 0, 34, 22, 9); c.fill();
      c.save(); c.translate(-dir * 4, 0); cylH(c, 30, 16, '#c9ced6', '#9aa0a8'); c.restore();
      font(c, 3.2, 700); c.fillStyle = '#4a4e57'; c.fillText('3V', -dir * 4, 0);
      c.fillStyle = '#9aa0a8'; c.fillRect(dir * 12, -1, 5, 2);
      c.save();
      c.translate(dir * 18, 0);
      c.rotate(s.power > 0 ? s.time * 30 : 0.4);
      c.fillStyle = '#7a5a1c';
      c.beginPath(); c.arc(0, 1, 8, Math.PI, 0); c.closePath(); c.fill();
      const g = c.createLinearGradient(0, -8, 0, 0);
      g.addColorStop(0, '#ffe29a'); g.addColorStop(1, '#b8862e');
      c.fillStyle = g;
      c.beginPath(); c.arc(0, 0, 8, Math.PI, 0); c.closePath(); c.fill();
      c.fillStyle = '#555'; c.beginPath(); c.arc(0, 0, 1.5, 0, Math.PI * 2); c.fill();
      c.restore();
      // red / black leads back to the board
      c.lineWidth = 1.8; c.lineCap = 'round';
      if (s.broken) {
        // the red lead snapped off its tab, copper strands showing
        c.strokeStyle = '#e04a3a'; c.beginPath(); c.moveTo(-dir * 21, -4); c.lineTo(-dir * 24, -9); c.stroke();
        c.strokeStyle = '#e39a4a'; c.lineWidth = 0.8;
        for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-dir * 24, -9); c.lineTo(-dir * (25 + i), -11 + i * 0.8); c.stroke(); }
      } else {
        c.strokeStyle = '#e04a3a'; c.beginPath(); c.moveTo(-dir * 21, -4); c.lineTo(-dir * 25, -10); c.stroke();
      }
      c.strokeStyle = '#222'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-dir * 21, 4); c.lineTo(-dir * 25, 10); c.stroke();
    },
  };
}

// The cord and its ribbed boot: it leaves through the top edge, sticking out past it.
const CABLE = shapeFrom(roundedPts([[-11, -34, 4], [-7, -34, 0], [-7, -14, 0], [-11, -12, 5], [-11, 18, 4], [11, 18, 4], [11, -12, 5], [7, -14, 0], [7, -34, 0], [11, -34, 4], [11, -44, 4], [-11, -44, 4]]));
const cable: PartDef = {
  id: 'cable', name: { en: 'Cord & Strain Relief', vi: 'Dây cáp & chốt chống gãy' }, side: 'B', z: 4, x: 0, y: -40, w: 22, h: 62, icon: '🔌',
  shape: CABLE, needs: ['bottom'], elev: 3, thick: 11, round: 5.5, mat: 'rubber', body: '#5d5a66',
  draw(c, s) {
    // the cord stub off the top, the ribbed boot, the anchor block and four coloured wires
    c.fillStyle = '#6a6774'; c.fill(CABLE);
    const g = c.createLinearGradient(-11, 0, 11, 0);
    g.addColorStop(0, '#4a4854'); g.addColorStop(0.4, '#9a97a6'); g.addColorStop(1, '#3e3c46');
    c.fillStyle = g; c.fillRect(-11, -44, 22, 10);
    c.fillStyle = '#7a7784'; c.fillRect(-7, -34, 14, 20);
    c.strokeStyle = '#4a4854'; c.lineWidth = 1.4;
    for (let y = -32; y < -14; y += 3) { c.beginPath(); c.moveTo(-7, y); c.lineTo(7, y); c.stroke(); }
    c.fillStyle = '#4e4c58'; c.beginPath(); rrc(c, 0, 2, 22, 30, 4); c.fill();
    ['#e04a3a', '#f5f5f5', '#3fbf6a', '#222', '#e8b030'].forEach((col, i) => {
      c.strokeStyle = col; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(-6 + i * 3, 6); c.lineTo(-6 + i * 3, 17); c.stroke();
    });
    if (s.broken) {
      c.strokeStyle = '#e39a4a'; c.lineWidth = 1;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(0, -30); c.lineTo(-8 + i * 4, -38 + (i % 2) * 3); c.stroke(); }
    }
  },
};

export const gamepad: DeviceDef = {
  id: 'gamepad',
  name: { en: '16-bit Game Pad', vi: 'Tay cầm chơi game 16-bit' },
  w: W, h: H + 12,
  hasBack: true,
  parts: [
    top, shoulder('shoulderL', -1, 'Left Bumper', 'Nút vai trái', 'L'), shoulder('shoulderR', 1, 'Right Bumper', 'Nút vai phải', 'R'),
    bottom, membrane, board, rumble('rumbleL', 86, 'Left Rumble Motor', 'Mô-tơ rung trái'), rumble('rumbleR', -86, 'Right Rumble Motor', 'Mô-tơ rung phải'), cable,
    ...SCREWS.map(([x, y], i) => screw(`g${i + 1}`, x, y, 'B')),
    screw('g5', BOARD_SCREW[0], BOARD_SCREW[1], 'B', 4, ['bottom']),
  ],
  working(c, t, k) {
    c.save();
    // a happy little shake: rumble rings round both grips
    for (const x of [-LOBE_X, LOBE_X]) {
      const r = 30 + ((t * 60) % 40);
      c.globalAlpha = k * (1 - (r - 30) / 40) * 0.6;
      c.strokeStyle = '#ffd36b'; c.lineWidth = 3;
      c.beginPath(); c.arc(x, 20, r, 0, Math.PI * 2); c.stroke();
    }
    c.globalAlpha = k * 0.4;
    const g = c.createRadialGradient(LEDS.x - 13.5, LEDS.y, 2, LEDS.x - 13.5, LEDS.y, 22);
    g.addColorStop(0, 'rgba(120,255,160,0.8)'); g.addColorStop(1, 'rgba(120,255,160,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(LEDS.x - 13.5, LEDS.y, 22, 0, Math.PI * 2); c.fill();
    c.restore();
  },
  workFx: { kind: 'spark', x: 0, y: -66, color: '#ffd36b', dir: -Math.PI / 2 },
};
