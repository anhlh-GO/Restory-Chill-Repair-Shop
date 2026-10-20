// Twin-bell alarm clock lying face-up: tomato case, chrome bells, domed glass. Two faces.

import { type C, slab, shade, rrPath, ellPath, glossStreak, text, shapeFrom, roundedPts, type Pts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, boss } from './kit';

const TOMATO = '#ee6a59';
const CREAM = '#fbf1dc';
const INK = '#3b3340';
const CHROME = '#d7dde4';
const BRASS = '#e2b04a';

// Case centre: the bells and the feet hang off a round body a little below the device centre.
const CY = 10;
const R = 96;
const FACE_R = 76;
const BELLS: [number, number][] = [[-68, -84], [68, -84]];
const FEET = [Math.PI / 2 - 0.72, Math.PI / 2 + 0.72];

// Round case with two little feet and the post the bell hammer sits on.
function casePts(): Pts {
  const bump = (a: number, at: number, amp: number, wid: number) => {
    let d = Math.abs(a - at) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return amp * Math.exp(-((d / wid) ** 2));
  };
  const out: Pts = [];
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const r = R + FEET.reduce((s, f) => s + bump(a, f, 17, 0.12), 0) + bump(a, -Math.PI / 2, 14, 0.1);
    out.push([Math.cos(a) * r, CY + Math.sin(a) * r]);
  }
  return out;
}

const BODY = shapeFrom(casePts());
const BODY_IN = ellPath(0, CY, 78, 78);
// Back screws, x mirrored (seen from behind) — the case is symmetric, so they match the front.
const SCREWS: [number, number][] = [[-54, CY - 54], [54, CY - 54], [-54, CY + 54], [54, CY + 54]];

// Hands at a tidy 10:10, as the clock face sits in the shop window.
const H_HOUR = -0.96, H_MIN = 1.05;

function hand(c: C, a: number, len: number, w: number, col: string, lume: boolean): void {
  c.save();
  c.rotate(a);
  c.fillStyle = 'rgba(30,20,30,0.25)';
  c.beginPath(); c.moveTo(-w / 2 + 1.5, 2); c.lineTo(1.5, -len + 2); c.lineTo(w / 2 + 1.5, 2); c.closePath(); c.fill();
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(-w / 2, 4); c.lineTo(-w / 2, -len * 0.7); c.lineTo(0, -len); c.lineTo(w / 2, -len * 0.7); c.lineTo(w / 2, 4);
  c.closePath(); c.fill();
  if (lume) {
    c.fillStyle = '#f6efc8';
    c.beginPath(); c.moveTo(-w / 4, -len * 0.3); c.lineTo(-w / 4, -len * 0.68); c.lineTo(0, -len * 0.85); c.lineTo(w / 4, -len * 0.68); c.lineTo(w / 4, -len * 0.3); c.closePath(); c.fill();
  }
  c.restore();
}

/** Hour + minute hands and the brass hub; `t` < 0 keeps them at 10:10. */
function hands(c: C, t: number, seconds: boolean): void {
  const run = t >= 0;
  const hA = run ? H_HOUR + t * 0.02 : H_HOUR;
  const mA = run ? H_MIN + t * 0.24 : H_MIN;
  hand(c, hA, 42, 8, INK, true);
  hand(c, mA, 62, 6, INK, true);
  if (seconds) {
    // thin red sweep hand with a little tail
    c.save();
    c.rotate(run ? t * 2.2 : 2.6);
    c.strokeStyle = '#e04a3a'; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 12); c.lineTo(0, -66); c.stroke();
    c.restore();
  }
  c.fillStyle = shade(BRASS, -0.3); c.beginPath(); c.arc(0.5, 1, 5.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = BRASS; c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff6d0'; c.beginPath(); c.arc(-1.4, -1.6, 1.6, 0, Math.PI * 2); c.fill();
}

/** Cream dial with minute ticks, big numbers and the red alarm pointer. */
function dialFace(c: C, r: number, glow: number): void {
  const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#fffaf0'); g.addColorStop(0.75, CREAM); g.addColorStop(1, shade(CREAM, -0.12));
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  if (glow > 0) {
    // warm night-light glow on the dial
    const n = c.createRadialGradient(0, 0, 4, 0, 0, r);
    n.addColorStop(0, `rgba(255,214,120,${0.45 * glow})`); n.addColorStop(1, `rgba(255,214,120,${0.12 * glow})`);
    c.fillStyle = n;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  }
  c.strokeStyle = shade(CREAM, -0.3); c.lineWidth = 1.2;
  c.beginPath(); c.arc(0, 0, r - 4, 0, Math.PI * 2); c.stroke();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, big = i % 5 === 0;
    c.strokeStyle = big ? INK : shade(CREAM, -0.4); c.lineWidth = big ? 2.2 : 1;
    c.beginPath();
    c.moveTo(Math.sin(a) * (r - 6), -Math.cos(a) * (r - 6));
    c.lineTo(Math.sin(a) * (r - (big ? 13 : 9)), -Math.cos(a) * (r - (big ? 13 : 9)));
    c.stroke();
  }
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    text(c, String(i), Math.sin(a) * (r - 24), -Math.cos(a) * (r - 24) + 1, i % 3 === 0 ? 15 : 11, INK, { font: 'bold' });
  }
  text(c, 'CHILL', 0, -22, 9, TOMATO, { font: 'bold' });
  text(c, 'wind-up', 0, 26, 7, shade(CREAM, -0.45));
  // red alarm pointer set for 7 o'clock
  c.save();
  c.rotate((7 / 12) * Math.PI * 2);
  c.strokeStyle = '#e04a3a'; c.lineWidth = 2.4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -34); c.stroke();
  c.fillStyle = '#e04a3a';
  c.beginPath(); c.moveTo(-4, -32); c.lineTo(0, -40); c.lineTo(4, -32); c.closePath(); c.fill();
  c.restore();
}

const caseDef: PartDef = {
  id: 'case', name: { en: 'Clock Case', vi: 'Vỏ đồng hồ' }, side: 'A', z: 0, x: 0, y: 0, w: 210, h: 244, icon: '⏰',
  shape: BODY, needs: ['dial', 'movement', 'aboard'], tool: 'sponge', thick: 30, cavity: 12, round: 14, wall: 18,
  bumps: [
    // the bell hammer on its brass post, between the bells
    { kind: 'box', x: 0, y: CY - 98, w: 5, h: 18, height: 8, color: BRASS, view: 'F', metal: true },
    { kind: 'cyl', x: 0, y: CY - 106, w: 13, height: 12, color: BRASS, view: 'F', metal: true },
  ],
  draw(c, s) {
    slab(c, BODY, TOMATO, -110, 122, { depth: 12, shadow: 0 });
    // chrome ball feet
    for (const a of FEET) {
      const x = Math.cos(a) * (R + 9), y = CY + Math.sin(a) * (R + 9);
      const g = c.createRadialGradient(x - 3, y - 3, 1, x, y, 10);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, CHROME); g.addColorStop(1, '#7d8590');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 9.5, 0, Math.PI * 2); c.fill();
    }
    if (s.view === 'F' || !s.inDevice) {
      glossStreak(c, BODY, -96, CY - 96, 192, 150, 0.3);
      // chrome bezel round the glass
      const b = c.createLinearGradient(0, CY - 88, 0, CY + 88);
      b.addColorStop(0, '#ffffff'); b.addColorStop(0.5, CHROME); b.addColorStop(1, '#8a929c');
      c.strokeStyle = b; c.lineWidth = 9;
      c.beginPath(); c.arc(0, CY, 83, 0, Math.PI * 2); c.stroke();
      // the dial seat: what shows once the dial is off
      c.fillStyle = shade(TOMATO, -0.35);
      c.fill(BODY_IN);
      c.save(); c.clip(BODY_IN);
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(BODY_IN);
      c.restore();
      c.fillStyle = shade(TOMATO, -0.55);
      for (const a of [0.6, 2.5, 4.4]) { c.beginPath(); c.arc(Math.cos(a) * 62, CY + Math.sin(a) * 62, 3, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#9aa1a8'; c.beginPath(); c.arc(0, CY, 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#4a4f57'; c.beginPath(); c.arc(0, CY, 3, 0, Math.PI * 2); c.fill();
      // hammer arm on the post
      c.strokeStyle = shade(BRASS, -0.3); c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, CY - 90); c.lineTo(0, CY - 106); c.stroke();
    } else {
      // inside of the case, seen from the back: the movement bay
      c.fillStyle = shade(TOMATO, -0.32);
      c.fill(BODY_IN);
      c.save(); c.clip(BODY_IN);
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(BODY_IN);
      c.restore();
      c.strokeStyle = shade(TOMATO, -0.15); c.lineWidth = 3;
      c.beginPath(); c.arc(0, CY, 58, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#4a4f57'; c.beginPath(); c.arc(0, CY, 4, 0, Math.PI * 2); c.fill();
      for (const [x, y] of SCREWS) boss(c, x, y, TOMATO);
    }
  },
};

const bellPath = ellPath(0, 0, 36, 36);
function bell(id: string, x: number, y: number, en: string, vi: string): PartDef {
  return {
    id, name: { en, vi }, side: 'F', z: 5, x, y, w: 72, h: 72, icon: '🔔',
    shape: bellPath, tool: 'brush', elev: 0, thick: 36, round: 36, mat: 'metal', body: '#c4cad2',
    // the nut that holds the bell on its post
    bumps: [{ kind: 'cyl', x: 0, y: 0, w: 10, height: 5, color: '#b9c0c9', metal: true }],
    draw(c, s) {
      const g = c.createRadialGradient(-12, -14, 2, 0, 0, 36);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, CHROME); g.addColorStop(0.85, '#9aa3ad'); g.addColorStop(1, '#6d7580');
      c.fillStyle = g;
      c.beginPath(); c.arc(0, 0, 36, 0, Math.PI * 2); c.fill();
      // rolled rim + a soft ring of reflection
      c.strokeStyle = '#7d8590'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(0, 0, 34, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 2;
      c.beginPath(); c.arc(0, 0, 22, Math.PI * 0.9, Math.PI * 1.6); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath(); c.ellipse(-13, -15, 7, 3.5, -0.7, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8a929c'; c.beginPath(); c.arc(0, 0, 5.5, 0, Math.PI * 2); c.fill();
      if (s.power > 0) {
        // ringing: a bright pulse on the dome
        c.fillStyle = `rgba(255,236,170,${0.35 * s.power * (0.5 + 0.5 * Math.sin(s.time * 40))})`;
        c.beginPath(); c.arc(0, 0, 36, 0, Math.PI * 2); c.fill();
      }
    },
  };
}

const GLASS = ellPath(0, 0, FACE_R, FACE_R);
const glassDef: PartDef = {
  id: 'glass', name: { en: 'Domed Glass', vi: 'Mặt kính' }, side: 'F', z: 8, x: 0, y: CY, w: 152, h: 152, icon: '🔍',
  shape: GLASS, elev: 24, thick: 16, round: FACE_R, mat: 'glass', body: '#c8dbe6',
  draw(c, s) {
    if (s.inDevice) {
      // the dial and hands seen through the crystal
      dialFace(c, FACE_R, s.power);
      hands(c, s.power > 0 ? s.time : -1, true);
      c.fillStyle = 'rgba(190,225,245,0.12)';
    } else {
      c.fillStyle = 'rgba(200,228,245,0.55)';
    }
    c.beginPath(); c.arc(0, 0, FACE_R, 0, Math.PI * 2); c.fill();
    if (s.broken) {
      // scratched-up protective film with a lifted edge
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.beginPath(); c.arc(0, 0, FACE_R - 3, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.4;
      for (const [x0, y0, x1, y1] of [[-50, -30, 20, 40], [-30, -55, 46, 10], [-58, 10, -8, 50], [10, -50, 54, 22], [-20, -10, 30, -40], [-40, 30, 30, 30]]) {
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
      c.strokeStyle = 'rgba(255,255,255,0.5)';
      for (const [x, y, r] of [[-30, 24, 6], [34, -20, 4], [16, 44, 3]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.beginPath(); c.moveTo(48, 52); c.lineTo(58, 36); c.lineTo(38, 46); c.closePath(); c.fill();
    }
    // curved highlights on the dome
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.beginPath(); c.ellipse(-30, -34, 26, 9, -0.75, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath(); c.ellipse(38, 42, 10, 4, -0.75, 0, Math.PI * 2); c.fill();
  },
};

// Hands at 10:10 as one star-shaped outline round the hub.
function handPts(): Pts {
  const pts: [number, number, number][] = [];
  const add = (a: number, len: number, w: number) => {
    const dx = Math.sin(a), dy = -Math.cos(a), px = Math.cos(a), py = Math.sin(a);
    for (const [d, o] of [[4, -w / 2], [len * 0.7, -w / 2], [len, 0], [len * 0.7, w / 2], [4, w / 2]]) {
      const x = dx * d + px * o, y = dy * d + py * o;
      pts.push([x, y, Math.atan2(y, x)]);
    }
  };
  add(H_HOUR, 42, 9);
  add(H_MIN, 62, 7);
  // round hub everywhere the hands are not
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI;
    const near = [H_HOUR, H_MIN].some((h) => {
      let d = Math.abs(a - (h - Math.PI / 2)) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      return d < 0.9;
    });
    if (!near) pts.push([Math.cos(a) * 7, Math.sin(a) * 7, a]);
  }
  return pts.sort((p, q) => p[2] - q[2]).map(([x, y]) => [x, y] as [number, number]);
}

const handsPath = shapeFrom(handPts());
const handsDef: PartDef = {
  id: 'hands', name: { en: 'Clock Hands', vi: 'Kim đồng hồ' }, side: 'F', z: 7, x: 0, y: CY, w: 110, h: 70, icon: '🕙',
  shape: handsPath, needs: ['glass'], thick: 2.5, round: 1, mat: 'metal', body: '#2a2430',
  draw(c) { hands(c, -1, false); },
};

const dialDef: PartDef = {
  id: 'dial', name: { en: 'Clock Dial', vi: 'Mặt số' }, side: 'F', z: 6, x: 0, y: CY, w: 148, h: 148, icon: '🕰',
  shape: ellPath(0, 0, 74, 74), needs: ['hands'], thick: 3, round: 1.5, body: shade(CREAM, -0.2),
  draw(c, s) { dialFace(c, 74, s.power); },
};

const BACK = ellPath(0, 0, 90, 90);
const backDef: PartDef = {
  id: 'back', name: { en: 'Back Plate', vi: 'Nắp lưng' }, side: 'B', z: 8, x: 0, y: CY, w: 180, h: 180, icon: '⚪',
  shape: BACK, needs: ['b1', 'b2', 'b3', 'b4', 'key'], thick: 6, round: 5, mat: 'metal', body: '#9aa1aa',
  bumps: [
    // alarm-spring key (a little T) and the time-set knob
    { kind: 'box', x: 34, y: -24, w: 30, h: 7, height: 10, color: BRASS, metal: true },
    { kind: 'cyl', x: 34, y: -24, w: 9, height: 4, color: shade(BRASS, -0.2), metal: true },
    { kind: 'cyl', x: 0, y: 46, w: 20, height: 7, color: '#c9ced6', metal: true },
  ],
  draw(c) {
    slab(c, BACK, '#c4cad2', -90, 90, { depth: 6, shadow: 0 });
    glossStreak(c, BACK, -90, -90, 180, 140, 0.35);
    // stamped rings + labels
    c.strokeStyle = 'rgba(80,90,100,0.35)'; c.lineWidth = 2;
    for (const r of [80, 70]) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
    text(c, 'WIND', -34, 8, 9, '#5d6670', { font: 'bold' });
    text(c, 'ALARM', 34, -8, 8, '#5d6670', { font: 'bold' });
    text(c, 'SET', 0, 64, 7, '#5d6670', { font: 'bold' });
    text(c, 'CHILL CLOCK CO.', 0, -60, 8, '#6d7680', { font: 'bold' });
    // little curved arrows: which way to wind
    c.strokeStyle = '#7d8590'; c.lineWidth = 2;
    for (const x of [-34, 34]) {
      c.beginPath(); c.arc(x, -24, 22, -2.6, -0.5); c.stroke();
      c.beginPath(); c.moveTo(x + 19, -35); c.lineTo(x + 20, -28); c.lineTo(x + 14, -30); c.stroke();
    }
    c.fillStyle = '#9aa1aa'; c.beginPath(); c.arc(0, 46, 12, 0, Math.PI * 2); c.fill();
  },
};

// Butterfly winding key: two big brass wings on a stem.
const keyPath = shapeFrom(roundedPts([[-28, -13, 11], [-6, -6, 4], [6, -6, 4], [28, -13, 11], [28, 13, 11], [6, 6, 4], [-6, 6, 4], [-28, 13, 11]]));
const keyDef: PartDef = {
  id: 'key', name: { en: 'Winding Key', vi: 'Chìa lên dây' }, side: 'B', z: 10, x: -34, y: CY - 24, w: 56, h: 26, icon: '🗝',
  shape: keyPath, thick: 6, round: 3, mat: 'metal', body: '#a8802e',
  draw(c) {
    const g = c.createLinearGradient(0, -13, 0, 13);
    g.addColorStop(0, '#fff0b8'); g.addColorStop(0.4, BRASS); g.addColorStop(1, '#a8802e');
    c.fillStyle = g; c.fill(keyPath);
    c.strokeStyle = '#8a6420'; c.lineWidth = 1.2; c.stroke(keyPath);
    // pierced holes in the wings
    c.fillStyle = 'rgba(90,60,20,0.55)';
    for (const x of [-18, 18]) { c.beginPath(); c.ellipse(x, 0, 5, 3.5, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#8a6420'; c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill();
  },
};

const MOVE_R = 50;
const movementDef: PartDef = {
  id: 'movement', name: { en: 'Clockwork Movement', vi: 'Bộ máy dây cót' }, side: 'B', z: 5, x: 18, y: CY - 16, w: 100, h: 100, icon: '⚙️',
  shape: ellPath(0, 0, MOVE_R, MOVE_R), needs: ['back'], thick: 10, round: 4, mat: 'metal', body: '#b8913a',
  draw(c, s) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); c.arc(-3, 5, MOVE_R, 0, Math.PI * 2); c.fill();
    const p = c.createRadialGradient(-16, -18, 4, 0, 0, MOVE_R);
    p.addColorStop(0, '#f6dc94'); p.addColorStop(1, '#b8913a');
    c.fillStyle = p; c.beginPath(); c.arc(0, 0, MOVE_R, 0, Math.PI * 2); c.fill();
    const spin = s.power > 0 ? s.time : 0;
    // gear train
    const gear = (x: number, y: number, r: number, n: number, a: number, col: string) => {
      c.save(); c.translate(x, y); c.rotate(a);
      c.fillStyle = shade(col, -0.35);
      for (let i = 0; i < n; i++) {
        c.save(); c.rotate((i / n) * Math.PI * 2); c.fillRect(-1.6, -r - 2.4, 3.2, 4); c.restore();
      }
      c.fillStyle = col; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = shade(col, -0.25);
      for (let i = 0; i < 4; i++) { c.save(); c.rotate((i / 4) * Math.PI * 2 + 0.4); c.beginPath(); c.ellipse(0, -r * 0.55, r * 0.22, r * 0.3, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
      c.fillStyle = '#6d7580'; c.beginPath(); c.arc(0, 0, 2.4, 0, Math.PI * 2); c.fill();
      c.restore();
    };
    gear(20, 22, 16, 22, spin * 0.8, '#e8c56a');
    gear(-4, 34, 9, 14, -spin * 1.6, '#d9d2c0');
    gear(30, -12, 11, 16, -spin * 1.2, '#e8c56a');
    // balance wheel ticking back and forth
    c.save(); c.translate(-30, 26); c.rotate(Math.sin((s.power > 0 ? s.time : 0) * 12) * 0.8);
    c.strokeStyle = '#7d8590'; c.lineWidth = 2.2;
    c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.moveTo(-9, 0); c.lineTo(9, 0); c.stroke();
    c.restore();
    // the mainspring barrel: a steel coil in a brass drum
    c.fillStyle = shade(BRASS, -0.35); c.beginPath(); c.arc(-12, -12, 25, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3d3a3a'; c.beginPath(); c.arc(-12, -12, 22, 0, Math.PI * 2); c.fill();
    c.strokeStyle = s.broken ? '#8a8f99' : '#c9ced6'; c.lineWidth = 1.6;
    c.beginPath();
    const loose = s.broken ? 1 : 0;
    for (let a = 0; a < Math.PI * 2 * 5; a += 0.2) {
      const r = 4 + a * (loose ? 0.62 : 0.5);
      c.lineTo(-12 + Math.cos(a + spin) * Math.min(r, 21), -12 + Math.sin(a + spin) * Math.min(r, 21));
    }
    c.stroke();
    c.fillStyle = '#9aa1a8'; c.beginPath(); c.arc(-12, -12, 4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#4a4f57'; c.fillRect(-14, -14, 4, 4);
    if (s.broken) {
      // sprung: the end of the spring jumped out of the barrel
      c.strokeStyle = '#c9ced6'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(4, -28); c.bezierCurveTo(18, -44, 30, -30, 22, -20); c.bezierCurveTo(14, -10, 26, -2, 36, -6); c.stroke();
    }
    // pillars holding the plates
    for (const [x, y] of [[-38, -26], [36, 30], [-24, 42], [40, -30]]) {
      c.fillStyle = '#9aa1a8'; c.beginPath(); c.arc(x, y, 3.4, 0, Math.PI * 2); c.fill();
    }
  },
};

const aboardDef: PartDef = {
  id: 'aboard', name: { en: 'Night-Light Board', vi: 'Mạch đèn báo thức' }, side: 'B', z: 5, x: -44, y: CY + 34, w: 38, h: 28, icon: '💡',
  shape: rrPath(0, 0, 38, 28, 7), needs: ['back'], thick: 4, mat: 'pcb', body: '#1d5c37',
  draw(c, s) {
    pcb(c, 38, 28, 17);
    // little warm bulb + its wire pads
    c.fillStyle = s.power > 0 ? '#fff2b0' : '#f2e6c0';
    c.beginPath(); c.arc(-8, 0, 6, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#c9a24a'; c.lineWidth = 1; c.beginPath(); c.arc(-8, 0, 6, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#e8c15a';
    for (const y of [-6, 6]) { c.beginPath(); c.arc(11, y, 2.4, 0, Math.PI * 2); c.fill(); }
    if (s.broken) {
      const g = c.createRadialGradient(6, 2, 1, 6, 2, 12);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(6, 2, 12, 0, Math.PI * 2); c.fill();
    }
  },
};

export const clock: DeviceDef = {
  id: 'clock',
  name: { en: 'Twin-Bell Alarm Clock', vi: 'Đồng hồ báo thức chuông đôi' },
  w: 210, h: 244,
  hasBack: true,
  parts: [
    caseDef, bell('bellL', BELLS[0][0], BELLS[0][1], 'Left Bell', 'Chuông trái'), bell('bellR', BELLS[1][0], BELLS[1][1], 'Right Bell', 'Chuông phải'),
    dialDef, handsDef, glassDef,
    backDef, keyDef, movementDef, aboardDef,
    ...SCREWS.map(([x, y], i) => screw(`b${i + 1}`, x, y, 'B', 9)),
  ],
  working(c, t, k) {
    c.save();
    // the bells ring: shaky arcs fanning out from each dome
    BELLS.forEach(([x, y], i) => {
      const dir = i ? 1 : -1;
      const jig = Math.sin(t * 50) * 1.5;
      for (let j = 0; j < 3; j++) {
        const ph = (t * 2.4 + j / 3) % 1;
        c.globalAlpha = k * (1 - ph) * 0.8;
        c.strokeStyle = '#ffd36b'; c.lineWidth = 3; c.lineCap = 'round';
        c.beginPath(); c.arc(x + jig, y, 42 + ph * 34, dir > 0 ? -1.3 : Math.PI + 0.1, dir > 0 ? -0.1 : Math.PI + 1.3); c.stroke();
      }
    });
    // a warm glow over the face
    c.globalAlpha = k * (0.35 + Math.sin(t * 6) * 0.1);
    const g = c.createRadialGradient(0, CY, 10, 0, CY, 110);
    g.addColorStop(0, 'rgba(255,220,130,0.6)'); g.addColorStop(1, 'rgba(255,220,130,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, CY, 110, 0, Math.PI * 2); c.fill();
    c.restore();
  },
  workFx: { kind: 'note', x: 0, y: -110, color: '#ffd36b', dir: -Math.PI / 2 },
};
