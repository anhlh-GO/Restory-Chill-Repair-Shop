// Early-80s stereo boombox lying on its back: black textured cabinet, a
// brushed-aluminium front plate, two big woofers behind chrome-ringed
// perforated grilles, the tuning window with its amber scale, stepped silver
// knobs, a row of piano keys over the cassette deck, and a chrome carry handle
// across the top. Two faces: behind, a ribbed back cover with the battery bay,
// the AC socket and the telescopic aerial; inside, the main board, the woofers'
// magnets and a six-cell C battery holder.

import { type C, shade, rrc, rrPath, ellPath, shapeFrom, roundedPts, rrPts, rng } from '../core/draw';
import { type DeviceDef, type PartDef, type Bump, screw } from './device';
import { pcb, boss, cylH, coil } from './kit';

const CAB = '#1e1e21';
const ALU = '#c9cdd2';
const CHROME = '#d6dadf';
const AMBER = '#ffc864';
const RED = '#d23b2c';
const INK = '#26272b';
const SANS = '"Helvetica Neue", Arial, sans-serif';

// Body x -150..150, y -80..90; the carry handle arches above it (to y -120), moulded in.
const SHELL = shapeFrom(roundedPts([
  [-150, -80, 16], [-118, -80, 3], [-118, -120, 10], [118, -120, 10], [118, -80, 3], [150, -80, 16], [150, 90, 16], [-150, 90, 16],
]), [rrPts(0, -97, 212, 26, 6)]);
const FACE = rrPath(0, 5, 284, 154, 10);
const FACE_IN = rrPath(0, 5, 268, 140, 8);

const SPK_X = 94, SPK_Y = 26, SPK_R = 44;
// [x, y, r, label]
const KNOBS: [number, number, number, string][] = [[-122, -56, 13, 'VOLUME'], [-88, -56, 10, 'TONE'], [88, -56, 10, 'BAND'], [122, -56, 13, 'TUNING']];
const KEYS: [number, string, string][] = [[-40, 'REC', RED], [-24, 'PLAY', ALU], [-8, 'REW', ALU], [8, 'F.FWD', ALU], [24, 'STOP/EJ', ALU], [40, 'PAUSE', ALU]];
const KEY_Y = -16;
const DECK = { x: 0, y: 36, w: 96, h: 64 };

function font(c: C, size: number, weight = 700): void {
  c.font = `${weight} ${size}px ${SANS}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
}

/** Black textured ABS: fine pebble over the colour. */
function textured(c: C, path: Path2D, col: string, seed: number, x: number, y: number, w: number, h: number): void {
  c.save();
  c.clip(path);
  c.fillStyle = col; c.fillRect(x, y, w, h);
  const r = rng(seed);
  for (let i = 0; i < (w * h) / 5; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.05)';
    c.fillRect(x + r() * w, y + r() * h, 0.9, 0.9);
  }
  c.restore();
}

/** Brushed aluminium: fine horizontal hairlines over a soft vertical sheen. */
function brushed(c: C, path: Path2D, x: number, y: number, w: number, h: number, seed: number): void {
  c.save();
  c.clip(path);
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#e6e9ec'); g.addColorStop(0.4, ALU); g.addColorStop(0.7, '#b3b8bf'); g.addColorStop(1, '#d4d8dc');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  const r = rng(seed);
  c.lineWidth = 0.35;
  for (let i = 0; i < h * 3; i++) {
    const yy = y + r() * h;
    c.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.2 + r() * 0.3})` : `rgba(80,86,96,${0.06 + r() * 0.12})`;
    const x0 = x + r() * w * 0.6;
    c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 + w * (0.2 + r() * 0.5), yy); c.stroke();
  }
  c.restore();
}

/** Polished chrome ring between radii r0 and r1, light from the top left. */
function chromeRing(c: C, r0: number, r1: number): void {
  const g = c.createLinearGradient(-r1, -r1, r1, r1);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#9aa0a8'); g.addColorStop(0.55, '#f2f4f6'); g.addColorStop(0.8, '#7d838c'); g.addColorStop(1, '#e2e5e9');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, r1, 0, Math.PI * 2); c.arc(0, 0, r0, 0, Math.PI * 2, true); c.fill('evenodd');
  c.strokeStyle = 'rgba(40,44,50,0.5)'; c.lineWidth = 0.6;
  c.beginPath(); c.arc(0, 0, r1 - 0.3, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(0, 0, r0 + 0.3, 0, Math.PI * 2); c.stroke();
}

/** Paper woofer cone seen from the front: corrugated surround, ribbed cone, dust cap. */
function cone(c: C, r: number, beat = 1): void {
  c.fillStyle = '#121214'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 1.4;
  for (const k of [0.94, 0.88]) { c.beginPath(); c.arc(0, 0, r * k, 0, Math.PI * 2); c.stroke(); }
  const g = c.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.1, 0, 0, r * 0.84);
  g.addColorStop(0, '#4a4642'); g.addColorStop(0.6, '#2a2725'); g.addColorStop(1, '#1a1817');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 0.84, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,240,220,0.07)'; c.lineWidth = 1;
  for (let k = 0.4; k < 0.84; k += 0.08) { c.beginPath(); c.arc(0, 0, r * k, 0, Math.PI * 2); c.stroke(); }
  const dg = c.createRadialGradient(-r * 0.08, -r * 0.1, 1, 0, 0, r * 0.26 * beat);
  dg.addColorStop(0, '#6a645e'); dg.addColorStop(1, '#2a2725');
  c.fillStyle = dg; c.beginPath(); c.arc(0, 0, r * 0.26 * beat, 0, Math.PI * 2); c.fill();
}

// ---------------- the cabinet (front shell, two faces) ----------------

// each knob: a black knurled skirt with a polished silver cap on it
const knobBumps: Bump[] = KNOBS.flatMap(([x, y, r]) => [
  { kind: 'cyl' as const, x, y, w: r * 2, height: 5, color: '#2e2f33', view: 'F' as const },
  { kind: 'cyl' as const, x, y, w: r * 1.55, height: 9, color: CHROME, metal: true, view: 'F' as const },
]);
const keyBumps: Bump[] = KEYS.map(([x, , col]) => ({ kind: 'box' as const, x, y: KEY_Y, w: 14, h: 11, height: 5, color: col === RED ? RED : '#dfe2e6', metal: col !== RED, view: 'F' as const }));

const shell: PartDef = {
  id: 'shell', name: { en: 'Cabinet', vi: 'Thân đài' }, side: 'A', z: 0, x: 0, y: 0, w: 300, h: 210, icon: '📻',
  shape: SHELL, needs: ['board', 'spkL', 'spkR', 'batt', 'grilleL', 'grilleR', 'tape', 'dial'], tool: 'sponge', thick: 30, cavity: 14, round: 10, wall: 10, body: '#18181a',
  bumps: [...knobBumps, ...keyBumps],
  draw(c, s) {
    textured(c, SHELL, CAB, 3, -152, -122, 304, 214);
    // the carry handle: a chrome tube with a black rubber grip in the middle
    c.save();
    c.beginPath(); c.rect(-118, -122, 236, 15); c.clip();
    const hg = c.createLinearGradient(0, -120, 0, -107);
    hg.addColorStop(0, '#7d838c'); hg.addColorStop(0.3, '#ffffff'); hg.addColorStop(0.55, CHROME); hg.addColorStop(1, '#6f757d');
    c.fillStyle = hg; c.fillRect(-104, -122, 208, 16);
    const rg = c.createLinearGradient(0, -120, 0, -107);
    rg.addColorStop(0, '#111'); rg.addColorStop(0.35, '#3a3a3e'); rg.addColorStop(1, '#0d0d0f');
    c.fillStyle = rg; c.fillRect(-60, -122, 120, 16);
    c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 0.8;
    for (let x = -56; x <= 56; x += 4) { c.beginPath(); c.moveTo(x, -120); c.lineTo(x, -107); c.stroke(); }
    c.restore();
    if (s.view === 'F' || !s.inDevice) {
      // the brushed front plate, its bevelled edge
      brushed(c, FACE, -142, -72, 284, 154, 5);
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1; c.beginPath(); rrc(c, 0, 4.4, 282, 152, 10); c.stroke();
      c.strokeStyle = 'rgba(40,44,50,0.55)'; c.lineWidth = 0.8; c.stroke(FACE);
      // a black band across the top for the dial and knobs
      c.fillStyle = '#26272a'; c.beginPath(); rrc(c, 0, -52, 276, 36, 6); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 0.8; c.beginPath(); rrc(c, 0, -52, 276, 36, 6); c.stroke();
      // the speaker wells (the grilles sit in them), the dial window's frame, the deck recess
      for (const x of [-SPK_X, SPK_X]) {
        c.save(); c.translate(x, SPK_Y);
        c.fillStyle = '#0c0c0d'; c.beginPath(); c.arc(0, 0, SPK_R + 4, 0, Math.PI * 2); c.fill();
        cone(c, SPK_R, 1);
        c.restore();
      }
      c.fillStyle = '#0f0f11'; c.beginPath(); rrc(c, 0, -52, 106, 34, 4); c.fill();
      c.fillStyle = '#1a1a1d'; c.beginPath(); rrc(c, DECK.x, DECK.y, DECK.w + 8, DECK.h + 8, 6); c.fill();
      c.fillStyle = '#121214'; c.beginPath(); rrc(c, 0, KEY_Y, 100, 15, 3); c.fill();
      // knob skirts with their scales, and labels
      for (const [x, y, r, l] of KNOBS) {
        c.strokeStyle = '#9aa0a8'; c.lineWidth = 0.7;
        for (let i = 0; i <= 10; i++) {
          const a = Math.PI * (0.75 + (i / 10) * 1.5);
          c.beginPath(); c.moveTo(x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2)); c.lineTo(x + Math.cos(a) * (r + 4.5), y + Math.sin(a) * (r + 4.5)); c.stroke();
        }
        c.fillStyle = shade(CHROME, -0.2); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
        font(c, 3.6, 700); c.fillStyle = '#d9dce0'; c.fillText(l, x, y + r + 6.5);
      }
      // key labels under the piano keys
      font(c, 3.2, 700);
      for (const [x, l, col] of KEYS) { c.fillStyle = col === RED ? RED : '#d9dce0'; c.fillText(l, x, KEY_Y + 10.5); }
      // stereo LED, the badges
      const on = s.power > 0;
      c.fillStyle = on ? '#ff3b2f' : '#5a2228'; c.beginPath(); c.arc(-56, -18, 2.2, 0, Math.PI * 2); c.fill();
      if (on) {
        const lg = c.createRadialGradient(-56, -18, 0.5, -56, -18, 8);
        lg.addColorStop(0, `rgba(255,80,60,${0.7 * s.power})`); lg.addColorStop(1, 'rgba(255,80,60,0)');
        c.fillStyle = lg; c.beginPath(); c.arc(-56, -18, 8, 0, Math.PI * 2); c.fill();
      }
      font(c, 3.4, 700); c.fillStyle = INK; c.fillText('STEREO', -56, -11);
      font(c, 7.5, 900); c.fillStyle = INK; c.fillText('CHILL·BOX', 0, 76.5);
      font(c, 3.6, 600); c.fillStyle = '#4a4e57'; c.fillText('STEREO RADIO CASSETTE RECORDER  CB-74', 0, 87);
      c.fillStyle = RED; c.fillRect(-140, 76, 30, 2); c.fillRect(110, 76, 30, 2);
      // well-loved: scuffs on the aluminium near the handle ends
      c.strokeStyle = 'rgba(90,96,104,0.35)'; c.lineWidth = 0.5;
      for (const [x, y] of [[-128, -70], [124, -72], [-60, 70]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 7, y + 2); c.stroke(); }
    } else {
      // inside of the cabinet, seen from the back (mirrored)
      c.fillStyle = '#121214'; c.fill(FACE_IN);
      c.save(); c.clip(FACE_IN);
      c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(FACE_IN);
      c.restore();
      for (const x of [-SPK_X, SPK_X]) {
        c.fillStyle = '#2a2a2e'; c.beginPath(); c.arc(x, SPK_Y, SPK_R + 2, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#0a0a0b'; c.beginPath(); c.arc(x, SPK_Y, SPK_R - 4, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = '#2a2a2e'; c.beginPath(); rrc(c, 0, DECK.y, DECK.w + 4, DECK.h + 4, 5); c.fill();
      c.fillStyle = '#7d838c'; c.beginPath(); rrc(c, 0, DECK.y - 4, 30, 8, 2); c.fill();
      for (const x of [-18, 18]) { c.fillStyle = '#c9ccd2'; c.beginPath(); c.arc(x, DECK.y - 4, 3, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = '#2c2c30'; c.lineWidth = 3;
      for (const x of [-46, 46]) { c.beginPath(); c.moveTo(x, -66); c.lineTo(x, 76); c.stroke(); }
      for (const [x, y] of BACK_SCREWS) boss(c, x, y, '#3a3a3e');
    }
  },
};

// ---------------- front parts ----------------

const grilleShape = ellPath(0, 0, SPK_R, SPK_R);
function grille(id: string, name: { en: string; vi: string }, x: number): PartDef {
  return {
    id, name, side: 'F', z: 8, x, y: SPK_Y, w: SPK_R * 2, h: SPK_R * 2, icon: '🔊',
    shape: grilleShape, tool: 'brush', thick: 5, round: 3.5, mat: 'metal', body: '#8e949c',
    draw(c, s) {
      // perforated aluminium mesh: the woofer shows dimly through the holes
      const beat = s.power > 0 ? 1 + 0.1 * Math.abs(Math.sin(s.time * 8)) : 1;
      const mg = c.createLinearGradient(-SPK_R, -SPK_R, SPK_R, SPK_R);
      mg.addColorStop(0, '#e6e9ec'); mg.addColorStop(0.5, '#b6bbc2'); mg.addColorStop(1, '#d8dbe0');
      c.fillStyle = mg; c.beginPath(); c.arc(0, 0, SPK_R, 0, Math.PI * 2); c.fill();
      c.save();
      c.beginPath(); c.arc(0, 0, 37, 0, Math.PI * 2); c.clip();
      for (let j = -36; j <= 36; j += 3.4) for (let i = -36; i <= 36; i += 3.4) {
        const ox = Math.round(j / 3.4) % 2 ? 1.7 : 0;
        const px = i + ox, py = j;
        const d = Math.hypot(px, py);
        if (d > 36) continue;
        // the dust cap and cone behind the mesh: darker through the middle
        const dark = d < 10 * beat ? 0.15 : 0.32;
        c.fillStyle = `rgba(${Math.round(20 + dark * 40)},${Math.round(20 + dark * 40)},${Math.round(24 + dark * 40)},1)`;
        c.beginPath(); c.arc(px, py, 1.15, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      chromeRing(c, 37, SPK_R);
      // the little badge at the bottom of the ring
      c.fillStyle = '#26272b'; c.beginPath(); rrc(c, 0, 33, 20, 6, 2); c.fill();
      font(c, 3.2, 800); c.fillStyle = '#e8eaed'; c.fillText('2-WAY', 0, 33.2);
      if (s.broken) {
        c.strokeStyle = '#6a6e76'; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(-30, 10); c.quadraticCurveTo(-10, 4, 6, 22); c.stroke();
      }
    },
  };
}
const grilleL = grille('grilleL', { en: 'Left Speaker Grille', vi: 'Lưới loa trái' }, -SPK_X);
const grilleR = grille('grilleR', { en: 'Right Speaker Grille', vi: 'Lưới loa phải' }, SPK_X);

const DIAL = rrPath(0, 0, 100, 28, 3);
const dial: PartDef = {
  id: 'dial', name: { en: 'Tuning Window', vi: 'Mặt dò sóng' }, side: 'F', z: 8, x: 0, y: -52, w: 100, h: 28, icon: '📶',
  shape: DIAL, thick: 3.5, round: 1.2, mat: 'glass', body: '#3a2a1a',
  draw(c, s) {
    const on = s.power > 0;
    const g = c.createLinearGradient(0, -14, 0, 14);
    g.addColorStop(0, on ? '#3a2a10' : '#1e1a14'); g.addColorStop(1, on ? '#2a1c08' : '#141210');
    c.fillStyle = g; c.fill(DIAL);
    if (on) {
      const bg = c.createRadialGradient(0, 0, 4, 0, 0, 52);
      bg.addColorStop(0, `rgba(255,190,90,${0.45 * s.power})`); bg.addColorStop(1, 'rgba(255,190,90,0.08)');
      c.fillStyle = bg; c.fill(DIAL);
    }
    // two scales: FM on top, AM below
    const ink = on ? AMBER : '#c9a868';
    c.strokeStyle = ink; c.lineWidth = 0.6;
    for (let i = 0; i <= 40; i++) {
      const x = -42 + i * 2.1;
      c.beginPath(); c.moveTo(x, -3); c.lineTo(x, i % 5 ? -5 : -7); c.stroke();
      c.beginPath(); c.moveTo(x, 4); c.lineTo(x, i % 5 ? 6 : 8); c.stroke();
    }
    font(c, 4, 700); c.fillStyle = ink;
    ['88', '92', '96', '100', '104', '108'].forEach((l, i) => c.fillText(l, -42 + i * 16.8, -10.5));
    ['53', '60', '70', '90', '120', '160'].forEach((l, i) => c.fillText(l, -42 + i * 16.8, 11.5));
    font(c, 3.4, 800); c.fillStyle = RED; c.fillText('FM', -47, -10.5); c.fillText('AM', -47, 11.5);
    // the needle
    const nx = on ? 8 + Math.sin(s.time * 0.8) * 3 : -12;
    c.fillStyle = RED; c.fillRect(nx - 0.8, -13, 1.6, 26);
    // glass: a soft diagonal reflection
    c.fillStyle = 'rgba(255,255,255,0.14)';
    c.beginPath(); c.moveTo(-50, -14); c.lineTo(-22, -14); c.lineTo(-36, 14); c.lineTo(-50, 14); c.closePath(); c.fill();
  },
};

/** A compact cassette, front view: smoky shell, paper label, window with the tape packs and hubs. */
function cassette(c: C, t: number, power: number, broken: boolean): void {
  c.fillStyle = '#2b2a30'; c.beginPath(); rrc(c, 0, 0, 86, 56, 4); c.fill();
  // the five shell screws
  c.fillStyle = '#8b9097';
  for (const [x, y] of [[-39, -24], [39, -24], [-39, 24], [39, 24], [0, 25]]) { c.beginPath(); c.arc(x, y, 1.3, 0, Math.PI * 2); c.fill(); }
  // paper label with a hand-written title
  c.fillStyle = '#f1ead8'; c.beginPath(); rrc(c, 0, -6, 74, 34, 2); c.fill();
  c.fillStyle = '#e46a4a'; c.fillRect(-37, -23, 74, 4);
  c.fillStyle = '#4c9fb0'; c.fillRect(-37, -19, 74, 1.4);
  c.strokeStyle = 'rgba(80,90,120,0.35)'; c.lineWidth = 0.4;
  for (const y of [-14, -9]) { c.beginPath(); c.moveTo(-33, y); c.lineTo(33, y); c.stroke(); }
  c.font = `italic 600 7px "Patrick Hand", "Comic Sans MS", cursive`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#2a3d8a'; c.fillText('Summer Mix ’86', -2, -12);
  font(c, 3.4, 800); c.fillStyle = '#2b2a30'; c.fillText('A', -32, -12);
  // the window: tape packs on both hubs, sprockets turning
  c.fillStyle = '#5a5560'; c.beginPath(); rrc(c, 0, 4, 52, 15, 3); c.fill();
  const a = power > 0 ? t * 6 : 0;
  for (const [x, pack] of [[-15, 9.5], [15, 6.5]]) {
    c.fillStyle = '#5b3418'; c.beginPath(); c.arc(x, 4, pack, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(x, 4); c.rotate(a);
    c.fillStyle = '#f2efe8'; c.beginPath(); c.arc(0, 0, 4.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2b2a30';
    for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.fillRect(-0.7, 1.6, 1.4, 2.2); }
    c.restore();
  }
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(-26, -3, 52, 2);
  // the bottom ridge with the head openings
  c.fillStyle = '#3a3840'; c.beginPath(); c.moveTo(-26, 28); c.lineTo(-21, 17); c.lineTo(21, 17); c.lineTo(26, 28); c.closePath(); c.fill();
  c.fillStyle = '#141316';
  for (const x of [-14, 0, 14]) c.fillRect(x - 2.5, 22, 5, 4);
  c.fillStyle = '#5b3418'; c.fillRect(-18, 26.5, 36, 1.2);
  if (broken) {
    // the deck chewed it: loose brown tape spilling out of the bottom
    c.strokeStyle = '#6b3d1e'; c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(-14, 27);
    c.bezierCurveTo(-30, 36, -38, 8, -20, 12);
    c.bezierCurveTo(0, 16, 10, 34, 28, 22);
    c.bezierCurveTo(40, 14, 32, 2, 16, 14);
    c.stroke();
    c.strokeStyle = 'rgba(160,100,60,0.6)'; c.lineWidth = 0.6; c.stroke();
  }
}

const TAPE = rrPath(0, 0, 86, 56, 4);
const tape: PartDef = {
  id: 'tape', name: { en: 'Cassette Tape', vi: 'Băng cassette' }, side: 'F', z: 7, x: DECK.x, y: DECK.y, w: 86, h: 56, icon: '📼',
  shape: TAPE, needs: ['door'], thick: 8, round: 2.5, body: '#2d2a33',
  draw(c, s) { cassette(c, s.time, s.power, s.broken); },
};

const DOOR = rrPath(0, 0, DECK.w, DECK.h, 5);
const door: PartDef = {
  id: 'door', name: { en: 'Cassette Door', vi: 'Cửa băng' }, side: 'F', z: 8, x: DECK.x, y: DECK.y, w: DECK.w, h: DECK.h, icon: '🚪',
  shape: DOOR, tool: 'brush', thick: 4, round: 1.8, body: '#2a2b2f',
  draw(c, s) {
    brushed(c, DOOR, -48, -32, 96, 64, 17);
    c.strokeStyle = 'rgba(40,44,50,0.5)'; c.lineWidth = 0.8; c.stroke(DOOR);
    // the smoked window: the cassette shows through it
    c.save();
    c.beginPath(); rrc(c, 0, -2, 84, 46, 3); c.clip();
    if (s.inDevice) { c.save(); c.translate(0, 0); cassette(c, s.time, s.power, false); c.restore(); }
    c.fillStyle = s.inDevice ? 'rgba(25,20,30,0.55)' : 'rgba(40,34,44,0.92)';
    c.fillRect(-42, -25, 84, 46);
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath(); c.moveTo(-42, -25); c.lineTo(-18, -25); c.lineTo(-34, 21); c.lineTo(-42, 21); c.closePath(); c.fill();
    c.restore();
    c.strokeStyle = '#0d0d0f'; c.lineWidth = 1; c.beginPath(); rrc(c, 0, -2, 84, 46, 3); c.stroke();
    font(c, 3.4, 700); c.fillStyle = INK;
    c.fillText('AUTO STOP  ·  CrO₂ / NORMAL', -10, 26.5);
    c.fillStyle = RED; c.beginPath(); c.moveTo(34, 24.5); c.lineTo(38, 24.5); c.lineTo(36, 22); c.closePath(); c.fill();
    c.fillRect(34, 25.5, 4, 1);
  },
};

// ---------------- the back: cover, aerial, then the insides (positions as seen from behind) ----------------

const BACK_SCREWS: [number, number][] = [[-134, -66], [134, -66], [-134, 78], [134, 78]];
const BACK = rrPath(0, 5, 296, 166, 14);
const BAY = { x: 0, y: 46, w: 100, h: 46 };
const back: PartDef = {
  id: 'back', name: { en: 'Back Cover', vi: 'Nắp lưng' }, side: 'B', z: 5, x: 0, y: 0, w: 296, h: 166, icon: '⬛',
  shape: BACK, needs: ['b1', 'b2', 'b3', 'b4', 'ant'], thick: 10, round: 7, body: '#151517',
  bumps: [
    // rubber feet on the bottom edge, and the AC socket's shroud
    { kind: 'box', x: -110, y: 80, w: 22, h: 6, height: 3, color: '#0c0c0d', view: 'B' },
    { kind: 'box', x: 110, y: 80, w: 22, h: 6, height: 3, color: '#0c0c0d', view: 'B' },
    { kind: 'box', x: 112, y: 4, w: 18, h: 12, height: 3.5, color: '#2a2b2f', view: 'B' },
  ],
  draw(c) {
    textured(c, BACK, '#222225', 7, -150, -80, 300, 170);
    // vent slots behind each woofer
    for (const x of [-SPK_X, SPK_X]) for (let i = 0; i < 7; i++) {
      const y = SPK_Y - 24 + i * 8;
      const hw = Math.sqrt(Math.max(0, 34 * 34 - (y - SPK_Y) ** 2)) * 0.9;
      c.fillStyle = '#060607'; c.beginPath(); rrc(c, x, y, hw * 2, 3.2, 1.6); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(x - hw, y + 1.8, hw * 2, 0.6);
    }
    // battery door with its grip ribs and the cell diagram
    c.strokeStyle = '#0a0a0b'; c.lineWidth = 1.2; c.beginPath(); rrc(c, BAY.x, BAY.y, BAY.w, BAY.h, 5); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = 0.6; c.beginPath(); rrc(c, BAY.x, BAY.y + 1, BAY.w, BAY.h, 5); c.stroke();
    for (let i = 0; i < 5; i++) { c.fillStyle = '#121214'; c.fillRect(-14, BAY.y - 18 + i * 3, 28, 1.2); }
    font(c, 5, 800); c.fillStyle = '#8b8f96'; c.fillText('6 × C  (UM-2)', 0, BAY.y + 2);
    font(c, 3.6, 700); c.fillText('▼ OPEN', 0, BAY.y + 12);
    // AC socket and its label
    c.fillStyle = '#0a0a0b'; c.beginPath(); rrc(c, 112, 4, 14, 8, 2); c.fill();
    font(c, 3.6, 700); c.fillStyle = '#8b8f96'; c.fillText('AC ~ 220V 50Hz', 112, -8);
    // the rating sticker
    c.fillStyle = '#e9e5da'; c.beginPath(); rrc(c, -2, -14, 72, 26, 2); c.fill();
    c.fillStyle = INK; c.fillRect(-38, -27, 72, 6);
    font(c, 4, 900); c.fillStyle = '#e9e5da'; c.fillText('CHILL·BOX  CB-74', -2, -24);
    font(c, 3.2, 700); c.fillStyle = '#3a3a40';
    c.fillText('AC 220V ~ 50Hz 12W   DC 9V', -2, -16);
    c.fillText('FM 88–108MHz   AM 530–1605kHz', -2, -10);
    c.fillText('S/N 860715   MADE IN CHILL CORNER', -2, -4);
  },
};

const ANT = shapeFrom(roundedPts([[-124, -5, 2], [116, -3.5, 3], [128, -6, 3], [140, -6, 3], [140, 6, 3], [128, 6, 3], [116, 3.5, 3], [-124, 5, 2]]));
const ant: PartDef = {
  id: 'ant', name: { en: 'Telescopic Aerial', vi: 'Ăng-ten' }, side: 'B', z: 7, x: 0, y: -54, w: 264, h: 12, icon: '📡',
  shape: ANT, thick: 7, round: 3.5, mat: 'metal', body: '#9aa0a8',
  bumps: [{ kind: 'cyl', x: 132, y: 0, w: 14, height: 5, color: '#26272b', view: 'B' }],
  draw(c, s) {
    // sections, thinner towards the ball tip, each with a collar
    const secs: [number, number, number][] = [[-124, -66, 6], [-66, -6, 7.4], [-6, 56, 8.8], [56, 120, 10]];
    for (const [x0, x1, h] of secs) {
      const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, '#7a8088'); g.addColorStop(0.35, '#ffffff'); g.addColorStop(0.6, '#c9cdd3'); g.addColorStop(1, '#6a7078');
      c.fillStyle = g; c.beginPath(); rrc(c, (x0 + x1) / 2, 0, x1 - x0, h, h / 2); c.fill();
      c.fillStyle = '#8a9098'; c.fillRect(x1 - 3, -h / 2, 3, h);
    }
    c.fillStyle = '#d8dce1'; c.beginPath(); c.arc(-124, 0, 3.4, 0, Math.PI * 2); c.fill();
    // the black swivel at the root
    c.fillStyle = '#26272b'; c.beginPath(); rrc(c, 132, 0, 18, 12, 4); c.fill();
    if (s.broken) {
      c.strokeStyle = '#4a4e57'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-10, -4); c.lineTo(-4, 4); c.stroke();
    }
  },
};

const BOARD = { x: 0, y: -38, w: 128, h: 58 };
const board: PartDef = {
  id: 'board', name: { en: 'Main Board', vi: 'Bo mạch' }, side: 'B', z: 3, x: BOARD.x, y: BOARD.y, w: BOARD.w, h: BOARD.h, icon: '🟩',
  shape: rrPath(0, 0, BOARD.w, BOARD.h, 4), needs: ['back'], thick: 3, mat: 'pcb', body: '#5a4a24',
  bumps: [
    { kind: 'box', x: -36, y: 4, w: 30, h: 24, height: 11, color: '#c9ccd3', metal: true, view: 'B' },
    { kind: 'box', x: 4, y: 12, w: 8, h: 8, height: 7, color: '#d6dade', metal: true, view: 'B' },
    { kind: 'box', x: 16, y: 12, w: 8, h: 8, height: 7, color: '#d6dade', metal: true, view: 'B' },
    { kind: 'cyl', x: 40, y: 10, w: 9, height: 13, color: '#2a3f7a', view: 'B' },
    { kind: 'cyl', x: 52, y: 14, w: 7, height: 10, color: '#2a3f7a', view: 'B' },
    { kind: 'cyl', x: 30, y: 18, w: 6, height: 8, color: '#6a2a2a', view: 'B' },
  ],
  draw(c, s) {
    // phenolic brown board, like the real thing
    pcb(c, BOARD.w, BOARD.h, 88, '#8a6a34');
    // the tuning gang (silver box), two IF cans, the electrolytics, the ferrite bar aerial along the top
    c.fillStyle = '#c9ccd3'; c.beginPath(); rrc(c, -36, 4, 30, 24, 2); c.fill();
    c.fillStyle = '#d6dade'; c.fillRect(0, 8, 8, 8); c.fillRect(12, 8, 8, 8);
    c.fillStyle = '#2a3f7a'; c.beginPath(); c.arc(40, 10, 4.5, 0, Math.PI * 2); c.arc(52, 14, 3.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6a2a2a'; c.beginPath(); c.arc(30, 18, 3, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3a3c40'; c.fillRect(-56, -24, 110, 6);
    c.save(); c.translate(-10, -21); coil(c, 34, 8); c.restore();
    // the volume pot and the leads off to the woofers
    c.fillStyle = '#1e1f22'; c.beginPath(); c.arc(-52, 18, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#9aa0a8'; c.beginPath(); c.arc(-52, 18, 2.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff'; font(c, 3.4, 700); c.fillText('CB-74 MAIN', 30, -8);
    if (s.broken) {
      const g = c.createRadialGradient(22, 18, 1, 22, 18, 12);
      g.addColorStop(0, 'rgba(20,10,5,0.9)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(22, 18, 12, 0, Math.PI * 2); c.fill();
    }
  },
};

function speaker(id: string, name: { en: string; vi: string }, x: number): PartDef {
  return {
    id, name, side: 'B', z: 3, x, y: SPK_Y, w: SPK_R * 2, h: SPK_R * 2, icon: '🔈',
    shape: ellPath(0, 0, SPK_R, SPK_R), needs: ['back'], thick: 8, round: 6, mat: 'metal', body: '#4a4e56',
    bumps: [
      { kind: 'cyl', x: 0, y: 0, w: 38, height: 7, color: '#2c2e33', metal: true, view: 'B' },
      { kind: 'cyl', x: 0, y: 0, w: 22, height: 8.5, color: '#b9bec6', metal: true, view: 'B' },
    ],
    draw(c, s) {
      // stamped steel basket round the cone's back, four spokes, the magnet in the middle
      const g = c.createLinearGradient(-SPK_R, -SPK_R, SPK_R, SPK_R);
      g.addColorStop(0, '#a9aeb6'); g.addColorStop(1, '#5d626a');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, SPK_R, 0, Math.PI * 2); c.fill();
      const pg = c.createRadialGradient(0, 0, 8, 0, 0, 40);
      pg.addColorStop(0, '#2a2420'); pg.addColorStop(1, '#5a4a3c');
      c.fillStyle = pg; c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,230,200,0.08)'; c.lineWidth = 1;
      for (let k = 22; k < 40; k += 4) { c.beginPath(); c.arc(0, 0, k, 0, Math.PI * 2); c.stroke(); }
      c.strokeStyle = '#9aa0a8'; c.lineWidth = 5;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        c.beginPath(); c.moveTo(Math.cos(a) * 18, Math.sin(a) * 18); c.lineTo(Math.cos(a) * 42, Math.sin(a) * 42); c.stroke();
      }
      c.fillStyle = '#2c2e33'; c.beginPath(); c.arc(0, 0, 19, 0, Math.PI * 2); c.fill();
      // a label on the magnet, terminals with their red / black leads
      font(c, 3.2, 700); c.fillStyle = '#d6dade'; c.fillText('8Ω 5W', 0, 14.5);
      for (const [ty, col] of [[-8, '#e8574a'], [8, '#1b1b1f']] as const) {
        c.fillStyle = '#e8c15a'; c.beginPath(); rrc(c, 34, ty, 8, 5, 1); c.fill();
        c.strokeStyle = col; c.lineWidth = 2.2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(34, ty); c.quadraticCurveTo(26, ty * 2.6, 22, ty * 3.6); c.stroke();
      }
      if (s.broken) {
        c.strokeStyle = '#1b1b1f'; c.lineWidth = 2.2;
        c.beginPath(); c.moveTo(22, 30); c.quadraticCurveTo(12, 40, 2, 36); c.stroke();
      }
    },
  };
}
// as seen from the back: the front-left speaker is on the right
const spkL = speaker('spkL', { en: 'Left Woofer', vi: 'Loa trái' }, SPK_X);
const spkR = speaker('spkR', { en: 'Right Woofer', vi: 'Loa phải' }, -SPK_X);

const batt: PartDef = {
  id: 'batt', name: { en: 'C-Cell Holder', vi: 'Hộp pin' }, side: 'B', z: 3, x: BAY.x, y: BAY.y, w: 96, h: 40, icon: '🔋',
  shape: rrPath(0, 0, 96, 40, 4), needs: ['back'], thick: 13, round: 3, body: '#1a1a1c',
  draw(c) {
    c.fillStyle = '#1c1c1f'; c.beginPath(); rrc(c, 0, 0, 96, 40, 4); c.fill();
    // six C cells, three per row, alternating direction, on spring contacts
    for (let row = 0; row < 2; row++) for (let i = 0; i < 3; i++) {
      const x = -30 + i * 30, y = -9.5 + row * 19;
      c.save(); c.translate(x, y);
      if ((i + row) % 2) c.rotate(Math.PI);
      cylH(c, 27, 16, '#c2402f', '#d9dde3');
      c.fillStyle = '#e8e2d6'; c.fillRect(-6, -8, 10, 16);
      font(c, 4, 900); c.fillStyle = '#c2402f'; c.fillText('C', -1, 0);
      c.restore();
    }
    c.fillStyle = '#c9ccd2';
    for (const x of [-46, 46]) for (const y of [-9.5, 9.5]) { c.beginPath(); rrc(c, x, y, 2.4, 9, 1); c.fill(); }
  },
};

export const radio: DeviceDef = {
  id: 'radio',
  name: { en: 'Stereo Boombox', vi: 'Đài cassette' },
  w: 300, h: 210,
  hasBack: true,
  parts: [
    shell, grilleL, grilleR, dial, tape, door, back, ant, board, spkL, spkR, batt,
    ...BACK_SCREWS.map(([x, y], i) => screw(`b${i + 1}`, x, y, 'B')),
  ],
  working(c, t, k) {
    c.save();
    // warm dial glow
    c.globalAlpha = k * (0.6 + Math.sin(t * 3) * 0.1);
    const g = c.createRadialGradient(0, -52, 6, 0, -52, 90);
    g.addColorStop(0, 'rgba(255,200,100,0.7)'); g.addColorStop(1, 'rgba(255,200,100,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, -52, 90, 0, Math.PI * 2); c.fill();
    // sound rings from both woofers
    c.lineWidth = 3;
    for (const x of [-SPK_X, SPK_X]) for (let i = 0; i < 2; i++) {
      const ph = (t * 1.4 + i * 0.5) % 1;
      c.globalAlpha = k * (1 - ph) * 0.8;
      c.strokeStyle = '#fff4d6';
      c.beginPath(); c.arc(x, SPK_Y, SPK_R + 2 + ph * 30, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  },
  workFx: { kind: 'note', x: 0, y: -100, color: '#ffcf6b', dir: -Math.PI / 2 },
};
