// Back at the counter, the customer picks the repaired gadget up and tries it
// for a couple of seconds, each in its own way: a dryer blows warm air, a camera
// flashes, a radio sings, a gamepad rumbles. Drawn in 2D around the gadget's
// rendered picture, held in two hands above the counter.

import { type C, text } from '../core/draw';
import { sfx } from '../core/audio';
import { wait } from '../core/tween';

/** How long the try-out lasts, seconds. */
export const TRY_DURATION = 2.4;

const smooth = (a: number, b: number, x: number) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

/** Sounds of the try-out, played as it starts. */
export function tryOutSounds(id: string): void {
  const tune = (notes: number[], gap = 0.22) => notes.forEach((n, i) => wait(0.15 + i * gap, () => sfx.connect(n)));
  switch (id) {
    case 'dryer': sfx.heat(); wait(0.8, () => sfx.heat()); break;
    case 'camera': wait(0.6, () => sfx.shutter()); wait(1.6, () => sfx.shutter()); break;
    case 'handheld': tune([0, 4, 7, 12, 7, 12], 0.18); break;
    case 'walkman': case 'radio': tune([0, 2, 4, 7, 4, 9, 7]); break;
    case 'musicbox': tune([12, 11, 9, 7, 9, 11, 12], 0.26); break;
    case 'headphones': tune([0, 7, 0, 7, 5, 7], 0.2); break;
    case 'phone': sfx.bell(); wait(0.7, () => sfx.bell()); break;
    case 'clock': wait(0.3, () => sfx.bell()); wait(0.6, () => sfx.bell()); wait(0.9, () => sfx.bell()); break;
    case 'remote': for (let i = 0; i < 4; i++) wait(0.3 + i * 0.35, () => sfx.tick()); break;
    case 'keyboard': for (let i = 0; i < 8; i++) wait(0.2 + i * 0.2, () => sfx.snap()); break;
    case 'calculator': for (let i = 0; i < 4; i++) wait(0.25 + i * 0.25, () => sfx.blip(1.4)); break;
    case 'lamp': case 'flashlight': wait(0.3, () => sfx.snap()); break;
    case 'kettle': for (let i = 0; i < 6; i++) wait(0.3 + i * 0.25, () => sfx.bubble()); break;
    case 'watch': for (let i = 0; i < 3; i++) wait(0.4 + i * 0.5, () => sfx.blip(1.6)); break;
    case 'fan': sfx.blow(); wait(0.9, () => sfx.blow()); break;
    case 'gamepad': for (let i = 0; i < 5; i++) wait(0.3 + i * 0.12, () => sfx.squish()); break;
    case 'toaster': wait(0.7, () => sfx.pop()); break;
    case 'toothbrush': for (let i = 0; i < 6; i++) wait(0.3 + i * 0.2, () => sfx.zap()); break;
    default: sfx.sparkle();
  }
}

/** How the held gadget moves while it is tried: [dx, dy, tilt] in units of its size. */
export function tryOutMotion(id: string, t: number, time: number): [number, number, number] {
  const on = smooth(0, 0.15, t) * (1 - smooth(0.85, 1, t));
  const buzz = (amp: number, f: number) => Math.sin(time * f) * amp * on;
  switch (id) {
    case 'gamepad': return [buzz(0.03, 70), buzz(0.02, 53), buzz(0.04, 61)];
    case 'toothbrush': return [buzz(0.015, 90), 0, buzz(0.02, 80)];
    case 'phone': return [buzz(0.02, 60) * (Math.sin(time * 6) > 0 ? 1 : 0), 0, 0];
    case 'clock': return [buzz(0.02, 75), 0, buzz(0.05, 40)];
    case 'dryer': return [0, 0, -0.12 * on];
    case 'flashlight': return [0, 0, -0.08 * on];
    case 'camera': return [0, -0.05 * on, 0];
    default: return [0, Math.sin(time * 3) * 0.02 * on, Math.sin(time * 2) * 0.03 * on];
  }
}

/** The try-out effect around the gadget (x, y centre, s its size), t: 0..1 through it. */
export function drawTryOut(c: C, id: string, x: number, y: number, s: number, t: number, time: number, U: number): void {
  const on = smooth(0, 0.12, t) * (1 - smooth(0.88, 1, t));
  if (on <= 0) return;
  c.save();
  c.globalAlpha = on;
  switch (id) {
    case 'dryer': warmAir(c, x + s * 0.45, y - s * 0.08, s, time); break;
    case 'fan': wind(c, x, y, s, time); break;
    case 'camera': flashes(c, x - s * 0.22, y - s * 0.22, s, t, [0.25, 0.67]); break;
    case 'handheld': screenGlow(c, x, y - s * 0.15, s * 0.32, s * 0.24, '#c9f27a', time); notes(c, x, y, s, time, '#c9f27a'); break;
    case 'walkman': case 'radio': case 'headphones': notes(c, x, y, s, time, '#ffd36b'); break;
    case 'musicbox': notes(c, x, y, s, time, '#ffb3c8'); sparkles(c, x, y - s * 0.2, s * 0.5, time); break;
    case 'phone': ringArcs(c, x, y, s, time, '#b8e07a'); break;
    case 'clock': ringArcs(c, x, y - s * 0.1, s, time, '#ffd36b'); popText(c, 'RRRING!', x, y - s * 0.62, 16 * U, '#ffd36b', time); break;
    case 'remote': irPulses(c, x, y - s * 0.45, s, time); break;
    case 'lamp': lightPool(c, x, y, s, '#fff1b8'); break;
    case 'flashlight': beam(c, x + s * 0.42, y - s * 0.05, s, '#fff6d0'); break;
    case 'kettle': steam(c, x - s * 0.1, y - s * 0.45, s, time); break;
    case 'toaster': toast(c, x, y - s * 0.3, s, t); steam(c, x, y - s * 0.5, s * 0.6, time); break;
    case 'watch': popText(c, '♥ 72', x, y - s * 0.6, 18 * U, '#ff6f8a', time); screenGlow(c, x, y, s * 0.3, s * 0.3, '#7cf5b0', time); break;
    case 'calculator': popText(c, '77', x, y - s * 0.62, 26 * U, '#3a3f4a', time, '#c9d6b0'); break;
    case 'keyboard': thocks(c, x, y, s, time, U); break;
    case 'gamepad': popText(c, 'Brrr!', x + s * 0.4, y - s * 0.5, 16 * U, '#b9a4e8', time); break;
    case 'toothbrush': bubbles(c, x + s * 0.3, y - s * 0.3, s, time); break;
    default: sparkles(c, x, y, s * 0.6, time);
  }
  c.restore();
}

// ---------- pieces ----------

function warmAir(c: C, x: number, y: number, s: number, time: number): void {
  const g = c.createRadialGradient(x, y, 2, x, y, s * 0.4);
  g.addColorStop(0, 'rgba(255,170,60,0.55)'); g.addColorStop(1, 'rgba(255,120,40,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, s * 0.4, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,240,220,0.9)'; c.lineWidth = s * 0.018; c.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const ph = (time * 1.6 + i * 0.25) % 1;
    const yy = y - s * 0.12 + i * s * 0.08;
    const a = c.globalAlpha;
    c.globalAlpha = a * (1 - ph);
    c.beginPath();
    c.moveTo(x + ph * s * 0.6, yy);
    c.quadraticCurveTo(x + s * 0.12 + ph * s * 0.6, yy - s * 0.04, x + s * 0.24 + ph * s * 0.6, yy);
    c.stroke();
    c.globalAlpha = a;
  }
}

function wind(c: C, x: number, y: number, s: number, time: number): void {
  c.strokeStyle = 'rgba(220,240,255,0.85)'; c.lineWidth = s * 0.015; c.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const ph = (time * 1.3 + i / 6) % 1;
    const yy = y - s * 0.35 + (i / 5) * s * 0.7;
    const xx = x - s * 0.6 + ph * s * 1.2;
    const a = c.globalAlpha;
    c.globalAlpha = a * Math.sin(ph * Math.PI);
    c.beginPath(); c.moveTo(xx, yy); c.quadraticCurveTo(xx + s * 0.1, yy - s * 0.04, xx + s * 0.22, yy); c.stroke();
    c.globalAlpha = a;
  }
}

function flashes(c: C, x: number, y: number, s: number, t: number, at: number[]): void {
  for (const a of at) {
    const k = (t - a) / 0.1;
    if (k < 0 || k > 2.5) continue;
    const i = k < 1 ? k : 1 - (k - 1) / 1.5;
    const g = c.createRadialGradient(x, y, 2, x, y, s * 0.9);
    g.addColorStop(0, `rgba(255,255,240,${0.95 * i})`); g.addColorStop(1, 'rgba(255,255,240,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, s * 0.9, 0, Math.PI * 2); c.fill();
  }
}

function screenGlow(c: C, x: number, y: number, w: number, h: number, col: string, time: number): void {
  const a = c.globalAlpha;
  c.globalAlpha = a * (0.5 + 0.2 * Math.sin(time * 9));
  const g = c.createRadialGradient(x, y, 2, x, y, Math.max(w, h));
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, Math.max(w, h), 0, Math.PI * 2); c.fill();
  c.globalAlpha = a;
}

function notes(c: C, x: number, y: number, s: number, time: number, col: string): void {
  for (let i = 0; i < 5; i++) {
    const ph = (time * 0.55 + i / 5) % 1;
    const side = i % 2 ? 1 : -1;
    const nx = x + side * (s * 0.35 + ph * s * 0.2) + Math.sin(ph * 8 + i) * s * 0.05;
    const ny = y - s * 0.2 - ph * s * 0.6;
    const a = c.globalAlpha;
    c.globalAlpha = a * Math.sin(ph * Math.PI);
    text(c, i % 3 ? '♪' : '♫', nx, ny, s * 0.16, col, { font: 'bold', stroke: 'rgba(40,30,20,0.5)', strokeW: s * 0.02 });
    c.globalAlpha = a;
  }
}

function sparkles(c: C, x: number, y: number, r: number, time: number): void {
  c.fillStyle = '#fff';
  for (let i = 0; i < 6; i++) {
    const a = time * 0.8 + (i / 6) * Math.PI * 2;
    const sz = r * (0.05 + 0.03 * Math.sin(time * 5 + i));
    const sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * 0.6;
    c.beginPath(); c.moveTo(sx, sy - sz * 2); c.lineTo(sx + sz * 0.5, sy); c.lineTo(sx, sy + sz * 2); c.lineTo(sx - sz * 0.5, sy); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(sx - sz * 2, sy); c.lineTo(sx, sy + sz * 0.5); c.lineTo(sx + sz * 2, sy); c.lineTo(sx, sy - sz * 0.5); c.closePath(); c.fill();
  }
}

function ringArcs(c: C, x: number, y: number, s: number, time: number, col: string): void {
  c.strokeStyle = col; c.lineWidth = s * 0.022; c.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const ph = (time * 1.8 + i / 3) % 1;
    const r = s * (0.45 + ph * 0.3);
    const a = c.globalAlpha;
    c.globalAlpha = a * (1 - ph);
    for (const side of [-1, 1]) {
      c.beginPath(); c.arc(x, y, r, side < 0 ? Math.PI * 0.8 : -Math.PI * 0.2, side < 0 ? Math.PI * 1.2 : Math.PI * 0.2); c.stroke();
    }
    c.globalAlpha = a;
  }
}

function irPulses(c: C, x: number, y: number, s: number, time: number): void {
  c.strokeStyle = '#ff6b5a'; c.lineWidth = s * 0.02; c.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const ph = (time * 2.2 + i / 3) % 1;
    const r = s * (0.05 + ph * 0.35);
    const a = c.globalAlpha;
    c.globalAlpha = a * (1 - ph);
    c.beginPath(); c.arc(x, y, r, -Math.PI * 0.8, -Math.PI * 0.2); c.stroke();
    c.globalAlpha = a;
  }
  c.fillStyle = '#ff3b2a';
  c.beginPath(); c.arc(x, y, s * 0.025, 0, Math.PI * 2); c.fill();
}

function lightPool(c: C, x: number, y: number, s: number, col: string): void {
  const g = c.createRadialGradient(x, y, s * 0.1, x, y, s * 0.85);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,240,180,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, s * 0.85, 0, Math.PI * 2); c.fill();
}

function beam(c: C, x: number, y: number, s: number, col: string): void {
  const g = c.createLinearGradient(x, y, x + s * 1.1, y);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,246,208,0)');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(x, y - s * 0.06); c.lineTo(x + s * 1.1, y - s * 0.35); c.lineTo(x + s * 1.1, y + s * 0.3); c.lineTo(x, y + s * 0.06); c.closePath(); c.fill();
}

function steam(c: C, x: number, y: number, s: number, time: number): void {
  for (let i = 0; i < 5; i++) {
    const ph = (time * 0.7 + i / 5) % 1;
    const a = c.globalAlpha;
    c.globalAlpha = a * (1 - ph) * 0.8;
    const r = s * (0.05 + ph * 0.1);
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(x + Math.sin(ph * 6 + i) * s * 0.06, y - ph * s * 0.5, r, 0, Math.PI * 2); c.fill();
    c.globalAlpha = a;
  }
}

function toast(c: C, x: number, y: number, s: number, t: number): void {
  const up = smooth(0.25, 0.4, t) * s * 0.28;
  for (const dx of [-0.1, 0.1]) {
    c.fillStyle = '#c98a3a';
    c.beginPath(); c.ellipse(x + dx * s, y - up, s * 0.08, s * 0.1, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8b56a';
    c.fillRect(x + dx * s - s * 0.07, y - up - s * 0.02, s * 0.14, s * 0.14);
  }
}

function popText(c: C, s: string, x: number, y: number, size: number, col: string, time: number, bubble?: string): void {
  const b = 1 + Math.sin(time * 8) * 0.06;
  c.save();
  c.translate(x, y);
  c.scale(b, b);
  if (bubble) {
    c.fillStyle = bubble;
    c.beginPath(); c.ellipse(0, 0, size * 1.3, size * 0.75, 0, 0, Math.PI * 2); c.fill();
  }
  text(c, s, 0, 0, size, col, { font: 'bold', stroke: bubble ? undefined : 'rgba(40,30,20,0.6)', strokeW: size * 0.15 });
  c.restore();
}

function thocks(c: C, x: number, y: number, s: number, time: number, U: number): void {
  for (let i = 0; i < 4; i++) {
    const ph = (time * 1.2 + i / 4) % 1;
    const a = c.globalAlpha;
    c.globalAlpha = a * Math.sin(ph * Math.PI);
    const tx = x + (((i * 37) % 7) / 7 - 0.5) * s * 0.9;
    text(c, 'thock', tx, y - s * 0.3 - ph * s * 0.3, 12 * U, '#ffe7b8', { font: 'bold', stroke: 'rgba(40,30,20,0.6)', strokeW: 2 * U });
    c.globalAlpha = a;
  }
}

function bubbles(c: C, x: number, y: number, s: number, time: number): void {
  c.strokeStyle = 'rgba(200,240,255,0.9)'; c.lineWidth = s * 0.01;
  for (let i = 0; i < 7; i++) {
    const ph = (time * 0.9 + i / 7) % 1;
    const r = s * (0.02 + (i % 3) * 0.012);
    const a = c.globalAlpha;
    c.globalAlpha = a * (1 - ph);
    c.beginPath(); c.arc(x + Math.sin(ph * 7 + i) * s * 0.12, y - ph * s * 0.45, r, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = a;
  }
}
