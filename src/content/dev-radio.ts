// Retro boombox: coral body, cream front, chrome grilles and a cassette deck. Two faces.

import { type C, slab, shade, rrc, rrPath, ellPath, glossStreak, text, shapeFrom, roundedPts, rrPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, vents, boss, knurlRing, cylH, coil } from './kit';

const CORAL = '#e8674f';
const CREAM = '#f6ead2';
const CHROME = '#cfd5db';
const AMBER = '#ffcf6b';
const TEAL = '#2b98a6';

// Body x -150..150, y -80..90; the carry handle arches above it (to y -120), moulded in.
const SHELL = shapeFrom(roundedPts([
  [-150, -80, 22], [-112, -80, 4], [-112, -120, 10], [112, -120, 10], [112, -80, 4], [150, -80, 22], [150, 90, 22], [-150, 90, 22],
]), [rrPts(0, -95, 200, 22, 8)]);
const FACE = rrPath(0, 5, 280, 150, 14);

const SPK_X = 94, SPK_Y = 24;
const KNOBS: [number, number, number][] = [[-112, -56, 16], [-72, -56, 11], [72, -56, 11], [112, -56, 16]];
const KEYS_X = [-36, -18, 0, 18, 36];

/** Paper speaker cone seen from the front: rings and a dust cap. */
function cone(c: C, r: number): void {
  const g = c.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
  g.addColorStop(0, '#5a4a40'); g.addColorStop(0.7, '#2f2624'); g.addColorStop(1, '#1d1718');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,240,220,0.12)'; c.lineWidth = 1.5;
  for (const k of [0.45, 0.65, 0.85]) { c.beginPath(); c.arc(0, 0, r * k, 0, Math.PI * 2); c.stroke(); }
  c.fillStyle = '#6a5a50';
  c.beginPath(); c.arc(0, 0, r * 0.22, 0, Math.PI * 2); c.fill();
}

const shell: PartDef = {
  id: 'shell', name: { en: 'Radio Body', vi: 'Thân đài' }, side: 'A', z: 0, x: 0, y: 0, w: 300, h: 210, icon: '📻',
  shape: SHELL, needs: ['board', 'spkL', 'spkR', 'batt', 'grilleL', 'grilleR', 'tape', 'dial'], tool: 'sponge', thick: 30, cavity: 14, round: 12, wall: 10,
  bumps: [
    ...KNOBS.map(([x, y, r]) => ({ kind: 'cyl' as const, x, y, w: r * 2, height: r > 12 ? 10 : 8, color: r > 12 ? '#e8b54a' : CHROME, metal: true, view: 'F' as const })),
    ...KEYS_X.map((x, i) => ({ kind: 'box' as const, x, y: -14, w: 15, h: 11, height: 5, color: i === 1 ? CORAL : CHROME, view: 'F' as const })),
  ],
  draw(c, s) {
    slab(c, SHELL, CORAL, -120, 90, { depth: 12, shadow: 0 });
    // rubber grip on the handle bar
    c.fillStyle = shade(CORAL, -0.35);
    c.beginPath(); rrc(c, 0, -114, 150, 8, 4); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 1;
    for (let x = -70; x <= 70; x += 6) { c.beginPath(); c.moveTo(x, -118); c.lineTo(x, -110); c.stroke(); }
    if (s.view === 'F' || !s.inDevice) {
      glossStreak(c, SHELL, -150, -120, 300, 120, 0.25);
      // the cream front panel in the recess
      const g = c.createLinearGradient(0, -70, 0, 80);
      g.addColorStop(0, shade(CREAM, 0.1)); g.addColorStop(1, shade(CREAM, -0.08));
      c.fillStyle = g;
      c.fill(FACE);
      c.fillStyle = CORAL; c.fillRect(-140, -32, 280, 4);
      // speaker wells, dial slot, deck well
      for (const x of [-SPK_X, SPK_X]) {
        c.save(); c.translate(x, SPK_Y); cone(c, 46); c.restore();
      }
      c.fillStyle = '#3a2a22'; c.beginPath(); rrc(c, 0, -56, 104, 34, 7); c.fill();
      c.fillStyle = shade(CREAM, -0.45); c.beginPath(); rrc(c, 0, 34, 98, 68, 9); c.fill();
      c.fillStyle = shade(CREAM, -0.3); c.beginPath(); rrc(c, 0, -14, 96, 15, 4); c.fill();
      // knob collars + labels
      for (const [x, y, r] of KNOBS) {
        c.fillStyle = shade(CREAM, -0.35); c.beginPath(); c.arc(x, y, r + 3, 0, Math.PI * 2); c.fill();
        c.save(); c.translate(x, y); knurlRing(c, r, r * 0.5, r > 12 ? '#e8b54a' : CHROME); c.restore();
      }
      text(c, 'VOL', -112, -34, 7, shade(CORAL, -0.3), { font: 'bold' });
      text(c, 'TUNE', 112, -34, 7, shade(CORAL, -0.3), { font: 'bold' });
      text(c, 'CHILL·BOX', 0, 78, 10, CORAL, { font: 'bold' });
      if (s.power > 0) {
        c.fillStyle = `rgba(255,90,70,${s.power})`;
        c.beginPath(); c.arc(128, -20, 3, 0, Math.PI * 2); c.fill();
      }
    } else {
      // inside of the shell, seen from the back (mirrored)
      c.fillStyle = shade(CORAL, -0.35);
      c.fill(FACE);
      c.save(); c.clip(FACE);
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(FACE);
      c.restore();
      for (const x of [-SPK_X, SPK_X]) {
        c.fillStyle = '#2a2224'; c.beginPath(); c.arc(x, SPK_Y, 40, 0, Math.PI * 2); c.fill();
        c.strokeStyle = shade(CORAL, -0.2); c.lineWidth = 3; c.beginPath(); c.arc(x, SPK_Y, 46, 0, Math.PI * 2); c.stroke();
      }
      c.fillStyle = shade(CORAL, -0.55); c.beginPath(); rrc(c, 0, 34, 92, 62, 8); c.fill();
      boss(c, -128, -64, CORAL); boss(c, 128, -64, CORAL); boss(c, -128, 76, CORAL); boss(c, 128, 76, CORAL);
      boss(c, -52, -38, CORAL); boss(c, 52, -38, CORAL);
    }
  },
};

const grilleShape = ellPath(0, 0, 44, 44);
function grille(id: string, name: { en: string; vi: string }, x: number): PartDef {
  return {
    id, name, side: 'F', z: 8, x, y: SPK_Y, w: 88, h: 88, icon: '🔊',
    shape: grilleShape, tool: 'brush', thick: 6, round: 4, mat: 'metal', body: '#8e949c',
    draw(c, s) {
      const g = c.createRadialGradient(-14, -16, 4, 0, 0, 44);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, CHROME); g.addColorStop(1, '#8e949c');
      c.fillStyle = g;
      c.beginPath(); c.arc(0, 0, 44, 0, Math.PI * 2); c.fill();
      // perforations
      c.fillStyle = '#4a4e57';
      for (let j = -36; j <= 36; j += 6) for (let i = -36; i <= 36; i += 6) {
        const ox = (j / 6) % 2 ? 3 : 0;
        if (Math.hypot(i + ox, j) < 35) { c.beginPath(); c.arc(i + ox, j, 1.6, 0, Math.PI * 2); c.fill(); }
      }
      c.strokeStyle = shade(CHROME, -0.3); c.lineWidth = 3;
      c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); c.stroke();
      // centre cap; it thumps with the beat
      const beat = s.power > 0 ? 1 + 0.12 * Math.abs(Math.sin(s.time * 8)) : 1;
      c.fillStyle = CORAL; c.beginPath(); c.arc(0, 0, 8 * beat, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(-2.5, -2.5, 2.5, 0, Math.PI * 2); c.fill();
      if (s.broken) {
        c.strokeStyle = '#5a5e66'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(-30, 10); c.quadraticCurveTo(-10, 4, 6, 22); c.stroke();
      }
    },
  };
}
const grilleL = grille('grilleL', { en: 'Left Speaker Grille', vi: 'Lưới loa trái' }, -SPK_X);
const grilleR = grille('grilleR', { en: 'Right Speaker Grille', vi: 'Lưới loa phải' }, SPK_X);

const DIAL = rrPath(0, 0, 100, 30, 6);
const dial: PartDef = {
  id: 'dial', name: { en: 'Tuning Dial', vi: 'Mặt dò sóng' }, side: 'F', z: 8, x: 0, y: -56, w: 100, h: 30, icon: '📶',
  shape: DIAL, thick: 4, round: 2, mat: 'glass', body: '#6a4a2a',
  draw(c, s) {
    const on = s.power > 0;
    const g = c.createLinearGradient(0, -15, 0, 15);
    g.addColorStop(0, on ? '#fff0b0' : '#f2dca0'); g.addColorStop(1, on ? AMBER : '#d9b878');
    c.fillStyle = g;
    c.fill(DIAL);
    // frequency scale
    c.strokeStyle = '#6a4a2a'; c.lineWidth = 1;
    for (let i = 0; i <= 20; i++) {
      const x = -44 + i * 4.4;
      c.beginPath(); c.moveTo(x, -4); c.lineTo(x, i % 5 ? -1 : 2); c.stroke();
    }
    ['88', '96', '104'].forEach((l, i) => text(c, l, -44 + i * 44, -10, 7, '#6a4a2a', { font: 'bold' }));
    text(c, 'FM', 40, 9, 6, '#b0442f', { font: 'bold' });
    // needle
    const nx = s.broken ? -46 : on ? 8 + Math.sin(s.time * 0.8) * 3 : -12;
    c.fillStyle = '#d6332a';
    c.fillRect(nx - 1, -14, 2, 28);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath(); c.moveTo(-50, -15); c.lineTo(-20, -15); c.lineTo(-36, 15); c.lineTo(-50, 15); c.closePath(); c.fill();
  },
};

function reel(c: C, x: number, y: number, a: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.fillStyle = '#f2efe8'; c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#222';
  for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.fillRect(-1, 2.5, 2, 3.5); }
  c.restore();
}

const TAPE = rrPath(0, 0, 86, 56, 6);
const tape: PartDef = {
  id: 'tape', name: { en: 'Cassette Tape', vi: 'Băng cassette' }, side: 'F', z: 7, x: 0, y: 34, w: 86, h: 56, icon: '📼',
  shape: TAPE, needs: ['door'], thick: 8, round: 3, body: '#2d2a33',
  draw(c, s) {
    c.fillStyle = '#2d2a33'; c.fill(TAPE);
    c.fillStyle = '#9fe3c8'; c.beginPath(); rrc(c, 0, -8, 74, 30, 4); c.fill();
    c.fillStyle = '#ef6f6c'; c.fillRect(-37, -22, 74, 5);
    text(c, 'SUMMER ♪', 0, -14, 7, '#2a4a3a', { font: 'bold' });
    c.fillStyle = '#1b1a1f'; c.beginPath(); rrc(c, 0, -1, 54, 15, 7); c.fill();
    const a = s.power > 0 ? s.time * 6 : 0;
    reel(c, -17, -1, a); reel(c, 17, -1, a);
    c.fillStyle = '#4a4650'; c.beginPath(); c.moveTo(-28, 28); c.lineTo(-22, 17); c.lineTo(22, 17); c.lineTo(28, 28); c.closePath(); c.fill();
    if (s.broken) {
      // loose brown tape spilling out of the bottom
      c.strokeStyle = '#6b3d1e'; c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(-14, 22);
      c.bezierCurveTo(-30, 30, -36, 6, -18, 10);
      c.bezierCurveTo(0, 14, 10, 30, 26, 20);
      c.bezierCurveTo(38, 12, 30, 2, 16, 12);
      c.stroke();
    }
  },
};

const DOOR = rrPath(0, 0, 94, 64, 8);
const door: PartDef = {
  id: 'door', name: { en: 'Cassette Door', vi: 'Cửa băng' }, side: 'F', z: 8, x: 0, y: 34, w: 94, h: 64, icon: '🚪',
  shape: DOOR, tool: 'brush', thick: 4, round: 2, body: shade(CORAL, -0.3),
  draw(c) {
    c.fillStyle = shade(CORAL, -0.05);
    c.fill(DOOR);
    // smoky window: the cassette shows through
    c.fillStyle = 'rgba(30,25,35,0.85)';
    c.beginPath(); rrc(c, 0, -4, 76, 42, 6); c.fill();
    c.fillStyle = 'rgba(159,227,200,0.35)'; c.beginPath(); rrc(c, 0, -12, 60, 16, 3); c.fill();
    c.fillStyle = 'rgba(240,240,240,0.35)';
    c.beginPath(); c.arc(-17, -1, 6, 0, Math.PI * 2); c.arc(17, -1, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.beginPath(); c.moveTo(-36, -24); c.lineTo(-12, -24); c.lineTo(-30, 16); c.lineTo(-36, 16); c.closePath(); c.fill();
    c.fillStyle = shade(CORAL, 0.25); c.beginPath(); rrc(c, 0, 25, 34, 6, 3); c.fill();
    text(c, '⏏', 32, 25, 7, CREAM, { font: 'bold' });
  },
};

// ---- the back: cover, antenna, then the insides (positions as seen from behind) ----

const BACK = rrPath(0, 0, 296, 166, 20);
const back: PartDef = {
  id: 'back', name: { en: 'Back Cover', vi: 'Nắp lưng' }, side: 'B', z: 5, x: 0, y: 5, w: 296, h: 166, icon: '🟥',
  shape: BACK, needs: ['b1', 'b2', 'b3', 'b4', 'ant'], thick: 10, round: 8,
  draw(c) {
    slab(c, BACK, shade(CORAL, -0.08), -83, 83, { depth: 8, shadow: 0 });
    glossStreak(c, BACK, -148, -83, 296, 90, 0.2);
    // speaker vents behind each cone, a battery door, a rating sticker
    for (const x of [-SPK_X, SPK_X]) vents(c, x, 0, 60, 5, 9, CORAL);
    c.strokeStyle = shade(CORAL, -0.4); c.lineWidth = 2;
    c.beginPath(); rrc(c, 0, 46, 92, 46, 8); c.stroke();
    text(c, '6 × C', 0, 46, 11, shade(CORAL, 0.45), { font: 'bold' });
    c.fillStyle = '#f2efe8'; c.beginPath(); rrc(c, 0, -12, 54, 22, 3); c.fill();
    text(c, 'CHILL·BOX  AC/DC', 0, -15, 5.5, '#555', { font: 'bold' });
    text(c, 'FM · AM · TAPE', 0, -7, 5, '#888', { font: 'bold' });
  },
};

const ANT = rrPath(0, 0, 196, 12, 6);
const ant: PartDef = {
  id: 'ant', name: { en: 'Antenna', vi: 'Ăng-ten' }, side: 'B', z: 7, x: -6, y: -62, w: 196, h: 12, icon: '📡',
  shape: ANT, thick: 8, round: 6, mat: 'metal', body: '#9aa0a8',
  bumps: [{ kind: 'cyl', x: 88, y: 0, w: 18, height: 6, color: '#3a3f45', view: 'B' }],
  draw(c, s) {
    // telescopic sections, thinner towards the tip
    for (let i = 0; i < 4; i++) {
      const x0 = -98 + i * 46, h = 10 - i * 1.6;
      const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, '#7a8088'); g.addColorStop(0.35, '#ffffff'); g.addColorStop(1, '#6a7078');
      c.fillStyle = g;
      c.beginPath(); rrc(c, x0 + 26 + 23, 0, 52, h, h / 2); c.fill();
      c.fillStyle = '#8a9098'; c.fillRect(x0 + 50, -h / 2, 3, h);
    }
    c.fillStyle = '#3a3f45'; c.beginPath(); c.arc(-94, 0, 5, 0, Math.PI * 2); c.fill();
    if (s.broken) {
      c.strokeStyle = '#4a4e57'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-10, -6); c.lineTo(-4, 6); c.stroke();
    }
  },
};

const board: PartDef = {
  id: 'board', name: { en: 'Main Board', vi: 'Bo mạch' }, side: 'B', z: 3, x: 0, y: -40, w: 120, h: 56, icon: '🟩',
  shape: rrPath(0, 0, 120, 56, 6), needs: ['back'], thick: 4, mat: 'pcb', body: '#1d5c37',
  bumps: [{ kind: 'box', x: -30, y: 0, w: 30, h: 26, height: 10, color: '#c9ccd3', metal: true, view: 'B' }],
  draw(c, s) {
    pcb(c, 120, 56, 88);
    // tuning capacitor (silver box) and the ferrite aerial coil
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -33, 3, 30, 26, 3); c.fill();
    c.fillStyle = '#c9ccd3'; c.beginPath(); rrc(c, -30, 0, 30, 26, 3); c.fill();
    c.save(); c.translate(24, -16); coil(c, 46, 8); c.restore();
    if (s.broken) {
      const g = c.createRadialGradient(22, 10, 1, 22, 10, 12);
      g.addColorStop(0, 'rgba(20,10,5,0.9)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(22, 10, 12, 0, Math.PI * 2); c.fill();
    }
  },
};

function speaker(id: string, name: { en: string; vi: string }, x: number): PartDef {
  return {
    id, name, side: 'B', z: 3, x, y: SPK_Y, w: 88, h: 88, icon: '🔈',
    shape: ellPath(0, 0, 44, 44), needs: ['back'], thick: 12, round: 10, mat: 'metal', body: '#5a5e66',
    bumps: [{ kind: 'cyl', x: 0, y: 0, w: 36, height: 8, color: '#3a3d44', metal: true, view: 'B' }],
    draw(c, s) {
      // basket frame round the paper cone, magnet in the middle
      c.fillStyle = '#8e949c'; c.beginPath(); c.arc(0, 0, 44, 0, Math.PI * 2); c.fill();
      const g = c.createRadialGradient(0, 0, 8, 0, 0, 40);
      g.addColorStop(0, '#2a2224'); g.addColorStop(1, '#5a4a40');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#b9bec6'; c.lineWidth = 4;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        c.beginPath(); c.moveTo(Math.cos(a) * 18, Math.sin(a) * 18); c.lineTo(Math.cos(a) * 42, Math.sin(a) * 42); c.stroke();
      }
      c.fillStyle = '#3a3d44'; c.beginPath(); c.arc(0, 0, 19, 0, Math.PI * 2); c.fill();
      // terminals with their red/black leads
      for (const [ty, col] of [[-8, '#e8574a'], [8, '#2b2b33']] as const) {
        c.fillStyle = '#e8c15a'; c.beginPath(); rrc(c, 32, ty, 8, 5, 1); c.fill();
        c.strokeStyle = col; c.lineWidth = 2.4; c.lineCap = 'round';
        c.beginPath(); c.moveTo(34, ty); c.quadraticCurveTo(26, ty * 2.6, 22, ty * 3.6); c.stroke();
      }
      if (s.broken) {
        c.strokeStyle = '#2b2b33'; c.lineWidth = 2.4;
        c.beginPath(); c.moveTo(22, 30); c.quadraticCurveTo(12, 40, 2, 36); c.stroke();
      }
    },
  };
}
// as seen from the back: the front-left speaker is on the right
const spkL = speaker('spkL', { en: 'Left Speaker', vi: 'Loa trái' }, SPK_X);
const spkR = speaker('spkR', { en: 'Right Speaker', vi: 'Loa phải' }, -SPK_X);

const batt: PartDef = {
  id: 'batt', name: { en: 'Battery Pack', vi: 'Hộp pin' }, side: 'B', z: 3, x: 0, y: 50, w: 84, h: 40, icon: '🔋',
  shape: rrPath(0, 0, 84, 40, 6), needs: ['back'], thick: 12, round: 6, body: '#2f6a74',
  draw(c) {
    for (const y of [-10, 10]) {
      c.save();
      c.translate(0, y);
      cylH(c, 78, 18, TEAL, '#d9dde3');
      c.fillStyle = '#f2f2f2'; c.fillRect(-12, -9, 22, 18);
      text(c, '+', 30, 0, 9, '#fff', { font: 'bold' });
      c.restore();
    }
  },
};

export const radio: DeviceDef = {
  id: 'radio',
  name: { en: 'Retro Boombox', vi: 'Đài cassette' },
  w: 300, h: 210,
  hasBack: true,
  parts: [
    shell, grilleL, grilleR, dial, tape, door, back, ant, board, spkL, spkR, batt,
    screw('b1', -128, -64, 'B'), screw('b2', 128, -64, 'B'), screw('b3', -128, 76, 'B'), screw('b4', 128, 76, 'B'),
  ],
  working(c, t, k) {
    c.save();
    // warm dial glow
    c.globalAlpha = k * (0.6 + Math.sin(t * 3) * 0.1);
    const g = c.createRadialGradient(0, -56, 6, 0, -56, 90);
    g.addColorStop(0, 'rgba(255,214,110,0.75)'); g.addColorStop(1, 'rgba(255,214,110,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, -56, 90, 0, Math.PI * 2); c.fill();
    // sound rings from both speakers
    c.lineWidth = 3;
    for (const x of [-SPK_X, SPK_X]) for (let i = 0; i < 2; i++) {
      const ph = (t * 1.4 + i * 0.5) % 1;
      c.globalAlpha = k * (1 - ph) * 0.8;
      c.strokeStyle = '#fff4d6';
      c.beginPath(); c.arc(x, SPK_Y, 46 + ph * 30, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  },
  workFx: { kind: 'note', x: 0, y: -100, color: '#ffcf6b', dir: -Math.PI / 2 },
};
