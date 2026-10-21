// GPS running watch laid flat with its coral silicone strap out straight: a round
// fibre-reinforced case with five steel pushers sticking out the sides (the START
// key ringed in red), a printed bezel naming them, a domed glass over a sunlight-
// readable display. Turned over: the optical heart-rate sensor and the charge pins.
// A first-marathon watch: the strap is chalky with sweat, the glass scuffed.

import { type C, type Pts, shade, rrc, rrPath, ellPath, rng, shapeFrom, roundedPts, ellPts } from '../core/draw';
import { type DeviceDef, type PartDef, type Bump, screw } from './device';
import { pcb, coil } from './kit';

const CASE = '#2c2f36'; // charcoal polymer
const BEZEL = '#3a3e47';
const STEEL = '#c9ced6';
const STRAP = '#ee7d72'; // coral silicone
const GOLD = '#e8c15a';
const START = '#e8483a';
const MINT = '#5fd3a8';
const SANS = '"Helvetica Neue", Arial, sans-serif';

const CY = -6;
const R = 54;
const TH = 15; // each face of the case
const SCR_R = 42;
const LUGS = [Math.PI / 2 - 0.42, Math.PI / 2 + 0.42, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42];

function font(c: C, size: number, weight = 700): void {
  c.font = `${weight} ${size}px ${SANS}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
}

/** Letters set round a circle, centred on angle `mid`; `under` reads along the bottom. */
function arcText(c: C, s: string, r: number, mid: number, size: number, color: string, under = false): void {
  font(c, size);
  c.fillStyle = color;
  const ws = [...s].map((ch) => c.measureText(ch).width * 1.1);
  const total = ws.reduce((a, b) => a + b, 0) / r;
  let a = under ? mid + total / 2 : mid - total / 2;
  for (let i = 0; i < ws.length; i++) {
    const da = ws[i] / r;
    a += under ? -da / 2 : da / 2;
    c.save();
    c.translate(Math.cos(a) * r, Math.sin(a) * r);
    c.rotate(under ? a - Math.PI / 2 : a + Math.PI / 2);
    c.fillText(s[i], 0, 0);
    c.restore();
    a += under ? -da / 2 : da / 2;
  }
}

// Round case with four short lugs the strap pins run through.
function casePts(): Pts {
  const out: Pts = [];
  for (let i = 0; i < 144; i++) {
    const a = (i / 144) * Math.PI * 2;
    let r = R;
    for (const l of LUGS) {
      let d = Math.abs(a - l) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      r += 12 * Math.exp(-((d / 0.15) ** 4));
    }
    out.push([Math.cos(a) * r, CY + Math.sin(a) * r]);
  }
  return out;
}
const BODY = shapeFrom(casePts());

// The five keys (front view angles): LIGHT / UP / DOWN on the left, START / BACK on the right.
const KEYS = [
  { id: 'LIGHT', a: -2.5 }, { id: 'UP', a: Math.PI }, { id: 'DOWN', a: 2.5 },
  { id: 'START', a: -0.62 }, { id: 'BACK', a: 0.62 },
];
const keyAt = (a: number, r: number): [number, number] => [Math.cos(a) * r, CY + Math.sin(a) * r];
// the four plain steel pushers are moulded-in bumps, top and bottom half; START is its own part
const PUSHERS: Bump[] = KEYS.filter((k) => k.id !== 'START').flatMap((k) => {
  const [x, y] = keyAt(k.a, R - 1.5);
  const horiz = Math.abs(Math.cos(k.a)) > 0.7;
  const w = horiz ? 10 : 9, h = horiz ? 8 : 9;
  return [
    { kind: 'box', x, y, w, h, height: 6, color: STEEL, metal: true },
    { kind: 'box', x: -x, y, w, h, height: 6, color: STEEL, metal: true, view: 'B' },
  ] as Bump[];
});

// Display content: off = dead grey glass; on = time, date, heart rate, a step ring.
function face(c: C, r: number, t: number, power: number): void {
  const g = c.createRadialGradient(-r * 0.3, -r * 0.4, 2, 0, 0, r);
  g.addColorStop(0, '#2a2e33'); g.addColorStop(1, '#0d0f12');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  if (power <= 0) return;
  c.save();
  c.globalAlpha = power;
  // step goal ring
  c.lineCap = 'round'; c.lineWidth = 3;
  c.strokeStyle = '#1e3a30'; c.beginPath(); c.arc(0, 0, r - 4, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = MINT;
  const fill = Math.min(0.82, (t * 0.25) % 1.1);
  c.beginPath(); c.arc(0, 0, r - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill); c.stroke();
  font(c, 5.5, 700); c.fillStyle = '#9aa3ad'; c.fillText('SAT 21', 0, -18);
  font(c, 17, 800); c.fillStyle = '#ffffff'; c.fillText('10:10', 0, -3);
  // heart rate: a heart that beats + bpm, and a tiny battery
  const beat = 1 + 0.2 * Math.max(0, Math.sin(t * 8));
  font(c, 7 * beat, 800); c.fillStyle = '#ff5a6e'; c.fillText('♥', -9, 13);
  font(c, 7, 800); c.fillStyle = '#ffffff'; c.fillText('72', 4, 13.5);
  c.strokeStyle = '#9aa3ad'; c.lineWidth = 0.8; c.strokeRect(-6, 22, 11, 5);
  c.fillStyle = MINT; c.fillRect(-5.2, 22.8, 7.5, 3.4);
  c.restore();
}

const caseDef: PartDef = {
  id: 'case', name: { en: 'Watch Case', vi: 'Vỏ đồng hồ' }, side: 'A', z: 0, x: 0, y: 0, w: 120, h: 132, icon: '⌚',
  shape: BODY, needs: ['screen', 'board', 'strapT', 'strapB'], tool: 'brush', thick: TH, cavity: 7, round: 12, wall: 12, body: shade(CASE, -0.15),
  bumps: PUSHERS,
  draw(c, s) {
    const back = s.view === 'B' && s.inDevice;
    // fibre-reinforced polymer: a satin charcoal with fine grain, lit top-left
    const g = c.createRadialGradient(-26, CY - 30, 8, 0, CY, 70);
    g.addColorStop(0, shade(CASE, 0.25)); g.addColorStop(0.7, CASE); g.addColorStop(1, shade(CASE, -0.25));
    c.fillStyle = g; c.fill(BODY);
    c.save(); c.clip(BODY);
    const r = rng(back ? 5 : 6);
    for (let i = 0; i < 1400; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)';
      c.fillRect(-70 + r() * 140, CY - 70 + r() * 140, 0.8, 0.8);
    }
    c.restore();
    // the steel spring bars showing between the lugs
    c.fillStyle = STEEL;
    for (const y of [CY - 58, CY + 58]) c.fillRect(-18, y - 1.2, 36, 2.4);
    c.save(); c.translate(0, CY);
    if (!back) {
      // bezel: a raised ring with the key names printed by each pusher, minute ticks
      const b = c.createLinearGradient(0, -R, 0, R);
      b.addColorStop(0, shade(BEZEL, 0.35)); b.addColorStop(0.5, BEZEL); b.addColorStop(1, shade(BEZEL, -0.3));
      c.fillStyle = b;
      c.beginPath(); c.arc(0, 0, 51, 0, Math.PI * 2); c.arc(0, 0, 42.5, 0, Math.PI * 2, true); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 0.6;
      c.beginPath(); c.arc(0, 0, 50.6, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 0.8;
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        if (KEYS.some((k) => Math.abs(Math.atan2(Math.sin(a - k.a), Math.cos(a - k.a))) < 0.32)) continue;
        const r0 = i % 5 ? 48.5 : 46.5;
        c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * 50, Math.sin(a) * 50); c.stroke();
      }
      for (const k of KEYS) {
        const under = Math.sin(k.a) > 0.3;
        arcText(c, k.id, 46.6, k.a, 4.2, k.id === 'START' ? '#ff7a6a' : '#e8ebef', under);
      }
      // red ring round the START key, the display bay inside with its flex socket
      c.strokeStyle = START; c.lineWidth = 1.6;
      c.beginPath(); c.arc(0, 0, 50.6, KEYS[3].a - 0.18, KEYS[3].a + 0.18); c.stroke();
      c.fillStyle = '#16181c'; c.beginPath(); c.arc(0, 0, 42.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 6; c.beginPath(); c.arc(1.5, 2.5, 40, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#e0a640'; c.beginPath(); rrc(c, 0, 33, 16, 6, 1.5); c.fill();
      c.fillStyle = '#c9ced6';
      for (let i = 0; i < 6; i++) c.fillRect(-6 + i * 2.2, 31.4, 1.2, 3.2);
      font(c, 4, 800); c.fillStyle = '#4a4f5a'; c.fillText('GPS', 0, -36);
    } else {
      // inside, seen from the back: the board bay, screw posts, the key contact pockets
      c.fillStyle = '#1b1d22'; c.beginPath(); c.arc(0, 0, 42.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 7; c.beginPath(); c.arc(1.5, 2.5, 40, 0, Math.PI * 2); c.stroke();
      for (const [x, y] of SCREWS) {
        c.fillStyle = shade(CASE, 0.1); c.beginPath(); c.arc(x, y - CY, 6, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#0f1013'; c.beginPath(); c.arc(x, y - CY, 2.3, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = '#0c0d10';
      for (const k of KEYS) { const a = Math.PI - k.a; c.beginPath(); rrc(c, Math.cos(a) * 41, Math.sin(a) * 41, 6, 6, 1.5); c.fill(); }
      font(c, 3.4, 600); c.fillStyle = '#5d636b'; c.fillText('MADE IN SAIGON', 0, 36);
    }
    c.restore();
  },
};

// ---------------- front: glass, display, START key ----------------

const GLASS = ellPath(0, 0, SCR_R + 1, SCR_R + 1);
const glassDef: PartDef = {
  id: 'glass', name: { en: 'Watch Glass', vi: 'Mặt kính' }, side: 'F', z: 8, x: 0, y: CY, w: 86, h: 86, icon: '🔍',
  shape: GLASS, elev: TH - 5, thick: 5, round: 6, mat: 'glass', body: '#3a4250',
  draw(c, s) {
    if (s.inDevice) face(c, SCR_R + 1, s.time, s.power);
    else {
      const g = c.createRadialGradient(-12, -14, 2, 0, 0, SCR_R);
      g.addColorStop(0, 'rgba(230,242,250,0.8)'); g.addColorStop(1, 'rgba(160,190,210,0.55)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, SCR_R + 1, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, SCR_R - 0.5, 0, Math.PI * 2); c.stroke();
    }
    if (s.broken) {
      // a scuffed protective film with a lifted, milky edge
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.beginPath(); c.arc(0, 0, SCR_R - 1, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 0.8;
      for (const [x0, y0, x1, y1] of [[-30, -18, 12, 26], [-16, -34, 30, 6], [-34, 8, -2, 30], [6, -30, 32, 16], [-22, 20, 22, 18], [-8, -10, 20, -28]]) {
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath(); c.moveTo(24, 28); c.lineTo(33, 16); c.lineTo(16, 26); c.closePath(); c.fill();
    }
    // the dome's window reflection
    c.fillStyle = 'rgba(255,255,255,0.32)';
    c.beginPath(); c.ellipse(-14, -20, 15, 4.5, -0.7, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath(); c.ellipse(18, 24, 8, 2, -0.7, 0, Math.PI * 2); c.fill();
  },
};

const screenDef: PartDef = {
  id: 'screen', name: { en: 'Display Module', vi: 'Màn hình' }, side: 'F', z: 6, x: 0, y: CY, w: 84, h: 90, icon: '🖥',
  shape: shapeFrom(([...ellPts(0, 0, SCR_R, SCR_R, 64).filter(([x, y]) => !(y > 36 && Math.abs(x) < 9)), [7, 40], [7, 45], [-7, 45], [-7, 40]] as Pts).sort((p, q) => Math.atan2(p[1], p[0]) - Math.atan2(q[1], q[0]))),
  needs: ['glass'], elev: TH - 7, thick: 2, round: 1, body: '#23252b',
  draw(c, s) {
    // the panel: a silver frame round the active area, the orange flex tail
    c.fillStyle = '#9aa1aa'; c.beginPath(); c.arc(0, 0, SCR_R, 0, Math.PI * 2); c.fill();
    face(c, SCR_R - 2, s.time, s.power);
    c.fillStyle = '#e0a640'; c.beginPath(); rrc(c, 0, 41, 14, 8, 1.5); c.fill();
    c.fillStyle = 'rgba(120,70,0,0.5)';
    for (let i = 0; i < 5; i++) c.fillRect(-5 + i * 2.4, 42, 1, 3);
    if (s.power <= 0) {
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.beginPath(); c.ellipse(-12, -16, 14, 4, -0.7, 0, Math.PI * 2); c.fill();
    }
  },
};

// START key: a steel pusher with a red collar, on the upper right.
const ST = keyAt(KEYS[3].a, R + 1);
const crownPath = rrPath(0, 0, 13, 11, 4);
const crown: PartDef = {
  id: 'crown', name: { en: 'Start Button', vi: 'Nút Start' }, side: 'F', z: 7, x: ST[0], y: ST[1], w: 13, h: 11, icon: '🔴',
  shape: crownPath, elev: -6, thick: 12, round: 5, mat: 'metal', body: '#8a929c',
  draw(c, s) {
    const g = c.createLinearGradient(0, -6, 0, 6);
    g.addColorStop(0, '#8a929c'); g.addColorStop(0.4, '#ffffff'); g.addColorStop(1, '#6d747e');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 13, 11, 4); c.fill();
    // red collar where it meets the case, grip grooves on the cap
    c.fillStyle = START; c.fillRect(-6.5, -5.5, 3, 11);
    c.strokeStyle = 'rgba(60,66,76,0.5)'; c.lineWidth = 0.6;
    for (let y = -3.5; y <= 3.5; y += 1.75) { c.beginPath(); c.moveTo(-1, y); c.lineTo(5.5, y); c.stroke(); }
    if (s.broken) { c.fillStyle = 'rgba(70,50,30,0.7)'; c.fillRect(-4, -3, 3, 6); }
  },
};

// ---------------- strap: buckle half above, holed tail below ----------------

const SW = 36; // strap width between the lugs
const TOP_LEN = 84, TAIL_LEN = 108;
const topPath = shapeFrom(roundedPts([[-SW / 2, -TOP_LEN / 2, 6], [SW / 2, -TOP_LEN / 2, 6], [SW / 2, TOP_LEN / 2, 2], [-SW / 2, TOP_LEN / 2, 2]]));
const tailPath = shapeFrom(roundedPts([[-SW / 2, -TAIL_LEN / 2, 2], [SW / 2, -TAIL_LEN / 2, 2], [SW / 2 - 1, TAIL_LEN / 2, 16], [-SW / 2 + 1, TAIL_LEN / 2, 16]]));
const STRAP_IN = 50; // how far under the case each strap end tucks (from the case centre)

/** Silicone: a soft roll across the width, fine matte grain, sweat bloom. */
function silicone(c: C, path: Path2D, h: number, seed: number): void {
  const g = c.createLinearGradient(-SW / 2, 0, SW / 2, 0);
  g.addColorStop(0, shade(STRAP, -0.18)); g.addColorStop(0.35, shade(STRAP, 0.14)); g.addColorStop(0.6, STRAP); g.addColorStop(1, shade(STRAP, -0.22));
  c.fillStyle = g; c.fill(path);
  c.save(); c.clip(path);
  const r = rng(seed);
  for (let i = 0; i < SW * h / 6; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(90,20,20,0.06)';
    c.fillRect(-SW / 2 + r() * SW, -h / 2 + r() * h, 0.8, 0.8);
  }
  c.restore();
}

function strap(id: string, tail: boolean): PartDef {
  const h = tail ? TAIL_LEN : TOP_LEN;
  const y = tail ? CY + STRAP_IN + h / 2 : CY - STRAP_IN - h / 2;
  const path = tail ? tailPath : topPath;
  const end = -h / 2; // the far end of the top strap (buckle)
  return {
    id, name: tail ? { en: 'Strap (Tail)', vi: 'Dây đeo (đuôi)' } : { en: 'Strap (Buckle)', vi: 'Dây đeo (khóa)' },
    side: 'F', z: 2, x: 0, y, w: SW + 8, h, icon: '➰',
    shape: path, tool: 'sponge', elev: -4, thick: 8, round: 4, mat: 'rubber', body: shade(STRAP, -0.25),
    bumps: tail ? [
      // the floating keeper loop
      { kind: 'box', x: 0, y: -h / 2 + 30, w: SW + 4, h: 7, height: 3, color: shade(STRAP, -0.05) },
    ] : [
      // steel buckle: the frame's far bar and two sides, the tongue lying across the strap
      { kind: 'box', x: 0, y: end - 1, w: SW + 8, h: 4, height: 4, color: STEEL, metal: true },
      { kind: 'box', x: -(SW / 2 + 2), y: end + 8, w: 4, h: 18, height: 4, color: STEEL, metal: true },
      { kind: 'box', x: SW / 2 + 2, y: end + 8, w: 4, h: 18, height: 4, color: STEEL, metal: true },
      { kind: 'box', x: 0, y: end + 9, w: 3, h: 18, height: 2.5, color: '#e3e6ea', metal: true },
    ],
    draw(c, s) {
      silicone(c, path, h, tail ? 11 : 12);
      // moulded ribs where it leaves the lugs, tucked end darker
      const near = tail ? -h / 2 : h / 2;
      const dir = tail ? 1 : -1;
      c.fillStyle = 'rgba(40,10,10,0.35)'; c.fillRect(-SW / 2, near + (tail ? 0 : -6), SW, 6);
      c.strokeStyle = 'rgba(80,20,20,0.3)'; c.lineWidth = 1;
      for (let i = 0; i < 4; i++) { const yy = near + dir * (9 + i * 3.4); c.beginPath(); c.moveTo(-SW / 2 + 4, yy); c.lineTo(SW / 2 - 4, yy); c.stroke(); }
      if (tail) {
        // adjustment holes with a lit lower lip
        for (let i = 0; i < 7; i++) {
          const hy = -h / 2 + 42 + i * 8.5;
          c.fillStyle = shade(STRAP, -0.55); c.beginPath(); c.arc(0, hy, 2.4, 0, Math.PI * 2); c.fill();
          c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.7; c.beginPath(); c.arc(0, hy + 0.4, 2.6, 0.3, Math.PI - 0.3); c.stroke();
        }
        // keeper band shading under its bump
        c.fillStyle = 'rgba(40,10,10,0.25)'; c.fillRect(-SW / 2, -h / 2 + 26, SW, 8);
      } else {
        // the buckle's shadow and the strap folding round its pin
        c.fillStyle = 'rgba(40,10,10,0.28)'; c.fillRect(-SW / 2, end, SW, 18);
        c.fillStyle = '#a7aeb7'; c.fillRect(-SW / 2, end + 16, SW, 2.4);
        font(c, 4, 800); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillText('CHILL', 0, 18);
        font(c, 3, 600); c.fillText('22MM', 0, 24);
      }
      if (s.broken) {
        c.strokeStyle = shade(STRAP, -0.45); c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(-14, 6); c.lineTo(-4, 9); c.stroke();
      }
    },
  };
}

// ---------------- back: optical sensor plate, battery, main board ----------------

const SCREWS: [number, number][] = [[-29, CY - 29], [29, CY - 29], [-29, CY + 29], [29, CY + 29]];
const BACK = ellPath(0, 0, 46, 46);
const backDef: PartDef = {
  id: 'back', name: { en: 'Sensor Back', vi: 'Nắp cảm biến' }, side: 'B', z: 8, x: 0, y: CY, w: 92, h: 92, icon: '💚',
  shape: BACK, needs: ['w1', 'w2', 'w3', 'w4'], elev: 8, thick: 9, round: 12, body: '#202227',
  draw(c, s) {
    // matte black polymer, a domed sensor island of dark glass in the middle
    const g = c.createRadialGradient(-14, -16, 4, 0, 0, 46);
    g.addColorStop(0, '#3e424b'); g.addColorStop(1, '#17191d');
    c.fillStyle = g; c.fill(BACK);
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); c.stroke();
    font(c, 3.4, 700); c.fillStyle = '#9aa1aa';
    arcText(c, 'CHILL RUN 265  ·  GPS', 36, -Math.PI / 2, 3.4, '#9aa1aa');
    arcText(c, 'WATER RATING 5 ATM  ·  SN 4A81C2', 36, Math.PI / 2, 3, '#7d838c', true);
    const sg = c.createRadialGradient(-5, -6, 1, 0, 0, 20);
    sg.addColorStop(0, '#3a4250'); sg.addColorStop(1, '#0a0b0d');
    c.fillStyle = sg; c.beginPath(); c.arc(0, -2, 20, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#5d636b'; c.lineWidth = 1; c.beginPath(); c.arc(0, -2, 20, 0, Math.PI * 2); c.stroke();
    // green LEDs, a red one, photodiodes round them
    const on = s.power > 0 ? 0.6 + 0.4 * Math.sin(s.time * 9) : 0.3;
    for (const [x, y] of [[-6, -2], [6, -2], [0, -9]]) {
      c.fillStyle = `rgba(90,255,140,${on})`; c.beginPath(); rrc(c, x, y, 4.5, 4, 1); c.fill();
    }
    c.fillStyle = `rgba(255,80,80,${on * 0.8})`; c.beginPath(); rrc(c, 0, 5, 4, 3.5, 1); c.fill();
    c.fillStyle = '#26303c';
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.5; c.beginPath(); rrc(c, Math.cos(a) * 14, -2 + Math.sin(a) * 14, 4, 4, 0.8); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-7, -12, 7, 2.5, -0.6, 0, Math.PI * 2); c.fill();
    // gold charge pins
    c.fillStyle = '#121316'; c.beginPath(); rrc(c, 0, 26, 18, 6, 3); c.fill();
    c.fillStyle = GOLD;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-5.4 + i * 3.6, 26, 1.2, 0, Math.PI * 2); c.fill(); }
    // screw seats
    for (const [x, y] of SCREWS) { c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.arc(x, y - CY + 0.5, 8.5, 0, Math.PI * 2); c.fill(); }
  },
};

const battery: PartDef = {
  id: 'battery', name: { en: 'Battery', vi: 'Pin' }, side: 'B', z: 5, x: 0, y: CY, w: 54, h: 40, icon: '🔋',
  shape: rrPath(0, 0, 54, 40, 10), needs: ['back'], elev: 6, thick: 4, round: 3, mat: 'metal', body: '#9aa1aa',
  draw(c, s) {
    // silver Li-Po pouch, label, the protection flex with its leads
    const g = c.createLinearGradient(-27, -20, 27, 20);
    g.addColorStop(0, '#f4f6f9'); g.addColorStop(0.5, '#c3c9d1'); g.addColorStop(1, '#939aa3');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 54, 40, 10); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 0.8; c.beginPath(); rrc(c, 0, 0, 50, 36, 8); c.stroke();
    c.fillStyle = '#25272c'; c.beginPath(); rrc(c, -3, 2, 38, 22, 2); c.fill();
    font(c, 5, 800); c.fillStyle = '#ffffff'; c.fillText('Li-Po', -3, -3);
    font(c, 3.4, 600); c.fillStyle = '#c9ced6'; c.fillText('3.85V  410mAh', -3, 4); c.fillText('1.58Wh', -3, 9);
    c.fillStyle = '#e0a640'; c.beginPath(); rrc(c, 22, 0, 8, 20, 1.5); c.fill();
    c.fillStyle = 'rgba(120,70,0,0.5)'; for (let i = 0; i < 4; i++) c.fillRect(19, -6 + i * 4, 6, 1);
    if (s.broken) {
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-3, 0, 20, 12, 0, 0, Math.PI * 2); c.fill();
    }
  },
};

const BOARD = shapeFrom(ellPts(0, 0, 40, 40, 56));
const board: PartDef = {
  id: 'board', name: { en: 'Main Board', vi: 'Bo mạch chính' }, side: 'B', z: 4, x: 0, y: CY, w: 80, h: 80, icon: '🟩',
  shape: BOARD, needs: ['battery', 'crown'], elev: 3, thick: 3, mat: 'pcb', body: '#1d5c37',
  bumps: [
    { kind: 'cyl', x: 22, y: -16, w: 10, height: 3, color: '#b9bec6', metal: true },
    { kind: 'box', x: -18, y: 14, w: 14, h: 14, height: 3, color: '#d8c49a' },
  ],
  draw(c, s) {
    c.save(); c.clip(BOARD);
    c.save(); c.translate(0, 0); pcb(c, 80, 80, 44, '#2d7d4c'); c.restore();
    c.restore();
    c.strokeStyle = '#1d4a2c'; c.lineWidth = 1; c.stroke(BOARD);
    // shield over the SoC, the GPS ceramic patch antenna, the vibration motor, ZIF sockets
    c.fillStyle = STEEL; c.beginPath(); rrc(c, 4, 4, 30, 24, 2.5); c.fill();
    c.strokeStyle = '#8b9097'; c.lineWidth = 0.8; c.beginPath(); rrc(c, 4, 4, 30, 24, 2.5); c.stroke();
    font(c, 3.6); c.fillStyle = '#5d6670'; c.fillText('CHILL M4', 4, 4);
    c.fillStyle = '#d8c49a'; c.beginPath(); rrc(c, -18, 14, 14, 14, 1.5); c.fill();
    c.fillStyle = '#b9a07a'; c.beginPath(); rrc(c, -18, 14, 8, 8, 1); c.fill();
    c.fillStyle = '#e8eaee'; c.beginPath(); c.arc(-18, 14, 1.4, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(22, -16); c.fillStyle = '#b9bec6'; c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 2); c.fill(); c.restore();
    c.save(); c.translate(-14, -20); coil(c, 10, 6); c.restore();
    c.fillStyle = '#1b1c20';
    for (const [x, y, w, h] of [[0, 30, 16, 5], [26, 12, 5, 12]] as const) { c.beginPath(); rrc(c, x, y, w, h, 1); c.fill(); }
    c.fillStyle = GOLD;
    for (let i = 0; i < 6; i++) c.fillRect(-6 + i * 2.2, 29, 1, 2);
    // gold key contact springs round the edge (seen from the back: mirrored)
    for (const k of KEYS) {
      const a = Math.PI - k.a;
      c.fillStyle = GOLD; c.beginPath(); rrc(c, Math.cos(a) * 35, Math.sin(a) * 35, 4.5, 4.5, 1); c.fill();
    }
    c.fillStyle = s.power > 0 ? '#5aff9a' : '#245a3a'; c.beginPath(); c.arc(-28, 4, 1.8, 0, Math.PI * 2); c.fill();
    if (s.broken) {
      const g = c.createRadialGradient(-12, 10, 1, -12, 10, 14);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(-12, 10, 14, 0, Math.PI * 2); c.fill();
    }
  },
};

export const watch: DeviceDef = {
  id: 'watch',
  name: { en: 'GPS Running Watch', vi: 'Đồng hồ chạy bộ GPS' },
  w: 140, h: 290,
  hasBack: true,
  parts: [
    caseDef,
    strap('strapT', false), strap('strapB', true),
    glassDef, screenDef, crown,
    backDef, battery, board,
    ...SCREWS.map(([x, y], i) => ({ ...screw(`w${i + 1}`, x, y, 'B', 9), elev: 15 })),
  ],
  working(c, t, k) {
    c.save();
    // soft green pulse round the face, in time with the heart line
    const beat = Math.max(0, Math.sin(t * 8));
    c.globalAlpha = k * (0.2 + beat * 0.3);
    const g = c.createRadialGradient(0, CY, 34, 0, CY, 80);
    g.addColorStop(0, 'rgba(120,255,180,0.6)'); g.addColorStop(1, 'rgba(120,255,180,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, CY, 80, 0, Math.PI * 2); c.fill();
    // little hearts floating off the side
    for (let j = 0; j < 3; j++) {
      const ph = (t * 0.5 + j / 3) % 1;
      c.globalAlpha = k * Math.sin(ph * Math.PI);
      c.font = `800 ${14 + j * 2}px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const x = 66 + Math.sin(ph * 8 + j) * 8, y = CY - 10 - ph * 70;
      c.lineWidth = 3; c.strokeStyle = '#ffffff'; c.strokeText('♥', x, y);
      c.fillStyle = '#ff5a6e'; c.fillText('♥', x, y);
    }
    c.restore();
  },
  workFx: { kind: 'spark', x: 0, y: CY - 60, color: '#7cf5b0', dir: -Math.PI / 2 },
};
