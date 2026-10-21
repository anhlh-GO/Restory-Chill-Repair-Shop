// Classic twin-bell wind-up alarm clock lying on its back: a deep drum case in
// glossy tomato enamel, a pressed chrome bezel round a domed crystal, two
// nickel bells on their posts with the hammer between them, and splayed legs
// ending in chrome balls. Two faces: behind, a spun-steel back cover with the
// butterfly winding key, the alarm key and the set knobs; inside, a brass
// movement with an open mainspring.

import { type C, shade, rrc, rrPath, ellPath, rng, shapeFrom, roundedPts, ellPts, type Pts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, boss } from './kit';

const TOMATO = '#d9493a';
const CREAM = '#f7efdc';
const INK = '#26222a';
const CHROME = '#d7dde4';
const BRASS = '#d9a845';
const SANS = '"Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

// Case centre: the bells and the legs hang off a round drum a little below the device centre.
const CY = 10;
const R = 96;
const IN_R = 80;
const FACE_R = 80;
const BELLS: [number, number][] = [[-78, -70], [78, -70]];
const FEET = [Math.PI / 2 - 0.66, Math.PI / 2 + 0.66];
const THICK = 36, CAV = 12;
const FLOOR = THICK - CAV;

function font(c: C, size: number, weight = 700, family = SANS): void {
  c.font = `${weight} ${size}px ${family}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
}

// Round drum with two splayed legs and the stub the hammer post stands on.
function casePts(): Pts {
  const bump = (a: number, at: number, amp: number, wid: number) => {
    let d = Math.abs(a - at) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return amp * Math.exp(-((d / wid) ** 2));
  };
  const out: Pts = [];
  for (let i = 0; i < 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    const r = R + bump(a, -Math.PI / 2, 8, 0.07);
    out.push([Math.cos(a) * r, CY + Math.sin(a) * r]);
  }
  return out;
}

const BODY = shapeFrom(casePts());
const BODY_IN = ellPath(0, CY, IN_R, IN_R);
// Back screws, x mirrored (seen from behind) — the case is symmetric, so they match the front.
const SCREWS: [number, number][] = [[-60, CY - 60], [60, CY - 60], [-60, CY + 60], [60, CY + 60]];

/** Glossy stove enamel: a soft gradient, orange-peel speckle. */
function enamel(c: C, path: Path2D, seed: number): void {
  const g = c.createRadialGradient(-40, CY - 50, 10, 0, CY, 130);
  g.addColorStop(0, shade(TOMATO, 0.18)); g.addColorStop(0.6, TOMATO); g.addColorStop(1, shade(TOMATO, -0.2));
  c.fillStyle = g; c.fill(path);
  // the speckle stays off the rounded rim, where the face texture stretches down the drum's side
  c.save(); c.clip(ellPath(0, CY, R - 13, R - 13));
  const r = rng(seed);
  for (let i = 0; i < 1400; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(90,20,10,0.06)' : 'rgba(255,230,220,0.07)';
    c.beginPath(); c.arc((r() - 0.5) * 240, CY + (r() - 0.5) * 240, 0.6 + r() * 0.9, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

/** Lathe-spun metal: fine concentric rings with a bright and a dark sector. */
function spun(c: C, r0: number, r1: number, base: string, seed: number): void {
  const g = c.createConicGradient ? c.createConicGradient(-0.6, 0, 0) : null;
  if (g) {
    g.addColorStop(0, shade(base, 0.5)); g.addColorStop(0.15, base); g.addColorStop(0.35, shade(base, -0.25));
    g.addColorStop(0.55, shade(base, 0.35)); g.addColorStop(0.75, shade(base, -0.15)); g.addColorStop(1, shade(base, 0.5));
    c.fillStyle = g;
  } else c.fillStyle = base;
  c.beginPath(); c.arc(0, 0, r1, 0, Math.PI * 2); c.arc(0, 0, r0, 0, Math.PI * 2, true); c.fill();
  const r = rng(seed);
  c.lineWidth = 0.4;
  for (let k = r0 + 0.6; k < r1; k += 0.9) {
    c.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.08 + r() * 0.16})` : `rgba(40,44,52,${0.05 + r() * 0.1})`;
    c.beginPath(); c.arc(0, 0, k, 0, Math.PI * 2); c.stroke();
  }
}

// ---------------- dial + hands ----------------

// Hands at a tidy 10:10, as the clock face sits in the shop window.
const H_HOUR = -0.96, H_MIN = 1.05;

function hand(c: C, a: number, len: number, w: number, col: string): void {
  c.save();
  c.rotate(a);
  c.fillStyle = 'rgba(30,20,30,0.22)';
  c.beginPath(); c.moveTo(-w / 2 + 1.5, 2); c.lineTo(1.5, -len + 2); c.lineTo(w / 2 + 1.5, 2); c.closePath(); c.fill();
  // blued-steel spade hand with a lume-filled window
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(-w / 2, 6); c.lineTo(-w / 2, -len * 0.62); c.lineTo(0, -len); c.lineTo(w / 2, -len * 0.62); c.lineTo(w / 2, 6);
  c.closePath(); c.fill();
  c.fillStyle = '#eef0c8';
  c.beginPath(); c.moveTo(-w / 4, -len * 0.25); c.lineTo(-w / 4, -len * 0.6); c.lineTo(0, -len * 0.82); c.lineTo(w / 4, -len * 0.6); c.lineTo(w / 4, -len * 0.25); c.closePath(); c.fill();
  c.restore();
}

/** Hour + minute hands and the brass hub; `t` < 0 keeps them at 10:10. */
function hands(c: C, t: number, seconds: boolean): void {
  const run = t >= 0;
  hand(c, run ? H_HOUR + t * 0.02 : H_HOUR, 44, 8, '#1c2333');
  hand(c, run ? H_MIN + t * 0.24 : H_MIN, 66, 6, '#1c2333');
  if (seconds) {
    c.save();
    c.rotate(run ? t * 2.2 : 2.6);
    c.strokeStyle = '#d23a2a'; c.lineWidth = 1.3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 14); c.lineTo(0, -70); c.stroke();
    c.fillStyle = '#d23a2a'; c.beginPath(); c.arc(0, 10, 2.6, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  c.fillStyle = shade(BRASS, -0.3); c.beginPath(); c.arc(0.5, 1, 5, 0, Math.PI * 2); c.fill();
  c.fillStyle = BRASS; c.beginPath(); c.arc(0, 0, 4.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff6d0'; c.beginPath(); c.arc(-1.2, -1.4, 1.4, 0, Math.PI * 2); c.fill();
}

/** Cream enamel dial: railway minute track, serif numerals, lume dots and the red alarm hand. */
function dialFace(c: C, r: number, glow: number): void {
  const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#fffbf2'); g.addColorStop(0.75, CREAM); g.addColorStop(1, shade(CREAM, -0.1));
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  // age: a faint yellowing toward the bottom
  const ag = c.createLinearGradient(0, -r, 0, r);
  ag.addColorStop(0, 'rgba(200,170,90,0)'); ag.addColorStop(1, 'rgba(200,170,90,0.12)');
  c.fillStyle = ag; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  if (glow > 0) {
    const n = c.createRadialGradient(0, 0, 4, 0, 0, r);
    n.addColorStop(0, `rgba(255,214,120,${0.4 * glow})`); n.addColorStop(1, `rgba(255,214,120,${0.1 * glow})`);
    c.fillStyle = n; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  }
  c.strokeStyle = INK; c.lineWidth = 0.8;
  for (const k of [r - 6, r - 12]) { c.beginPath(); c.arc(0, 0, k, 0, Math.PI * 2); c.stroke(); }
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, big = i % 5 === 0;
    c.strokeStyle = INK; c.lineWidth = big ? 2.4 : 0.8;
    c.beginPath();
    c.moveTo(Math.sin(a) * (r - 6), -Math.cos(a) * (r - 6));
    c.lineTo(Math.sin(a) * (r - (big ? 15 : 12)), -Math.cos(a) * (r - (big ? 15 : 12)));
    c.stroke();
    if (big) {
      c.fillStyle = '#e9eabf';
      c.beginPath(); c.arc(Math.sin(a) * (r - 18.5), -Math.cos(a) * (r - 18.5), 1.6, 0, Math.PI * 2); c.fill();
    }
  }
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    font(c, i % 3 === 0 ? 15 : 12, 700, SERIF); c.fillStyle = INK;
    c.fillText(String(i), Math.sin(a) * (r - 28), -Math.cos(a) * (r - 28) + 1);
  }
  font(c, 9, 800, SERIF); c.fillStyle = '#b83228'; c.fillText('Chill', 0, -26);
  font(c, 4.4, 700); c.fillStyle = '#5a5258'; c.fillText('TWIN BELL  ·  SHOCK RESISTING', 0, -17);
  font(c, 4.2, 700); c.fillStyle = '#7a7278'; c.fillText('MADE IN SAIGON', 0, 34);
  // red alarm hand set for 7 o'clock, on its own little disc
  c.save();
  c.rotate((7 / 12) * Math.PI * 2);
  c.strokeStyle = '#d23a2a'; c.lineWidth = 2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -38); c.stroke();
  c.fillStyle = '#d23a2a';
  c.beginPath(); c.moveTo(-3.5, -35); c.lineTo(0, -44); c.lineTo(3.5, -35); c.closePath(); c.fill();
  c.restore();
  c.fillStyle = '#d23a2a'; c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2); c.fill();
}

// ---------------- the drum case (base) ----------------

const caseDef: PartDef = {
  id: 'case', name: { en: 'Clock Case', vi: 'Vỏ đồng hồ' }, side: 'A', z: 0, x: 0, y: 0, w: 222, h: 250, icon: '⏰',
  shape: BODY, needs: ['dial', 'movement', 'aboard', 'legL', 'legR'], tool: 'sponge', thick: THICK, cavity: CAV, round: 14, wall: R - IN_R, body: '#b53a2e',
  bumps: [
    // the hammer: a brass arm out of the post with a nickel striker ball between the bells
    { kind: 'box', x: 0, y: CY - 100, w: 4, h: 18, height: 6, color: BRASS, view: 'F', metal: true },
    { kind: 'cyl', x: 0, y: CY - 110, w: 11, height: 10, color: '#cfd5dc', view: 'F', metal: true },
    // the alarm on/off slide on the top edge
    { kind: 'box', x: 30, y: CY - 93, w: 12, h: 5, height: 4, color: '#2a2628', view: 'F' },
  ],
  draw(c, s) {
    enamel(c, BODY, s.view === 'F' ? 3 : 4);
    // the inside: lacquered dark red with a soft inner shadow
    c.fillStyle = shade(TOMATO, -0.45);
    c.fill(BODY_IN);
    c.save(); c.clip(BODY_IN);
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(BODY_IN);
    c.restore();
    if (s.view === 'F' || !s.inDevice) {
      // dial seat: three tabs and the centre arbor bushing
      c.fillStyle = shade(TOMATO, -0.6);
      for (const a of [0.6, 2.5, 4.4]) { c.beginPath(); c.arc(Math.cos(a) * 66, CY + Math.sin(a) * 66, 3, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#9aa1a8'; c.beginPath(); c.arc(0, CY, 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#4a4f57'; c.beginPath(); c.arc(0, CY, 3, 0, Math.PI * 2); c.fill();
      // the alarm slide's slot
      c.fillStyle = '#2a1612'; c.beginPath(); rrc(c, 30, CY - 93, 20, 4, 2); c.fill();
      font(c, 3.6, 700); c.fillStyle = '#ffd9cc'; c.fillText('ALARM', 30, CY - 86);
    } else {
      // seen from the back: the movement bay with its screw bosses
      c.strokeStyle = shade(TOMATO, -0.25); c.lineWidth = 3;
      c.beginPath(); c.arc(0, CY, 62, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#4a4f57'; c.beginPath(); c.arc(0, CY, 4, 0, Math.PI * 2); c.fill();
      for (const [x, y] of SCREWS) boss(c, x, y, TOMATO);
    }
  },
};

// ---------------- bells ----------------

const bellPath = ellPath(0, 0, 34, 34);
function bell(id: string, x: number, y: number, en: string, vi: string): PartDef {
  return {
    id, name: { en, vi }, side: 'F', z: 5, x, y, w: 68, h: 68, icon: '🔔',
    shape: bellPath, tool: 'brush', elev: -4, thick: 50, round: 34, mat: 'metal', body: '#3d434b',
    // the domed nut that holds the bell on its post
    bumps: [{ kind: 'cyl', x: 0, y: 0, w: 10, height: 5, color: '#dfe4ea', metal: true }],
    draw(c, s) {
      // polished nickel dome: lathe rings, a window highlight, the rolled lip
      spun(c, 0, 34, '#c7ced6', x < 0 ? 31 : 32);
      const g = c.createRadialGradient(-12, -14, 2, -4, -4, 36);
      g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(0.3, 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(40,50,60,0.25)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 34, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#7d8590'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 32.5, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 31, Math.PI * 1.0, Math.PI * 1.6); c.stroke();
      c.save(); c.translate(-12, -15); c.rotate(-0.7);
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); rrc(c, 0, 0, 13, 5, 2); c.fill();
      c.restore();
      // the warm room reflected low on the dome
      c.fillStyle = 'rgba(217,73,58,0.18)'; c.beginPath(); c.ellipse(8, 20, 18, 7, -0.3, 0, Math.PI * 2); c.fill();
      // where the hammer has struck for years: a tiny dull spot on the inner side
      c.fillStyle = 'rgba(120,110,90,0.3)'; c.beginPath(); c.arc(x < 0 ? 22 : -22, -14, 3, 0, Math.PI * 2); c.fill();
      if (s.power > 0) {
        c.fillStyle = `rgba(255,236,170,${0.35 * s.power * (0.5 + 0.5 * Math.sin(s.time * 40))})`;
        c.beginPath(); c.arc(0, 0, 34, 0, Math.PI * 2); c.fill();
      }
    },
  };
}

// ---------------- splayed legs: chrome stems ending in balls ----------------

function legPts(a: number): Pts {
  // leg-local: u outward along the leg, v across; a stem from inside the rim to a ball
  const loc: Pts = [[-16, -4]];
  const u0 = 12 - Math.sqrt(64 - 16);
  const a0 = Math.atan2(-4, u0 - 12);
  for (let i = 0; i <= 20; i++) {
    const t = a0 - (i / 20) * 2 * a0;
    loc.push([12 + Math.cos(t) * 8, Math.sin(t) * 8]);
  }
  loc.push([-16, 4]);
  const ca = Math.cos(a), sa = Math.sin(a);
  return loc.map(([u, v]) => [u * ca - v * sa, u * sa + v * ca] as [number, number]);
}

function leg(id: string, a: number, en: string, vi: string): PartDef {
  const path = shapeFrom(legPts(a));
  const bx = Math.cos(a) * 12, by = Math.sin(a) * 12;
  return {
    id, name: { en, vi }, side: 'F', z: 4, x: Math.cos(a) * (R + 6), y: CY + Math.sin(a) * (R + 6), w: 30, h: 30, icon: '🦵',
    shape: path, elev: -6, thick: 16, round: 8, mat: 'metal', body: '#8a929c',
    draw(c) {
      c.fillStyle = '#b9c0c8'; c.fill(path);
      const g = c.createRadialGradient(bx - 3, by - 3, 1, bx, by, 9);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, CHROME); g.addColorStop(1, '#6d7580');
      c.fillStyle = g; c.beginPath(); c.arc(bx, by, 8, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-Math.cos(a) * 14, -Math.sin(a) * 14); c.lineTo(Math.cos(a) * 4, Math.sin(a) * 4); c.stroke();
    },
  };
}

// ---------------- pressed chrome bezel ----------------

const BEZ_O = 92, BEZ_I = 74;
const bezelPath = shapeFrom(ellPts(0, 0, BEZ_O, BEZ_O, 72), [ellPts(0, 0, BEZ_I, BEZ_I, 64)]);
const bezelDef: PartDef = {
  id: 'bezel', name: { en: 'Chrome Bezel', vi: 'Viền mạ crôm' }, side: 'F', z: 9, x: 0, y: CY, w: BEZ_O * 2, h: BEZ_O * 2, icon: '⭕',
  shape: bezelPath, elev: 31, thick: 8, round: 6, mat: 'metal', body: '#9aa2ac',
  draw(c) {
    c.save();
    const ann = new Path2D();
    ann.arc(0, 0, BEZ_O, 0, Math.PI * 2); ann.arc(0, 0, BEZ_I, 0, Math.PI * 2, true);
    c.clip(ann, 'evenodd');
    spun(c, BEZ_I, BEZ_O, CHROME, 51);
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, BEZ_O - 7, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(40,46,56,0.5)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, BEZ_I + 1, 0, Math.PI * 2); c.stroke();
    // the case's red caught in the polished ring
    c.strokeStyle = 'rgba(217,73,58,0.3)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, BEZ_O - 2, Math.PI * 0.2, Math.PI * 0.8); c.stroke();
    c.restore();
  },
};

// ---------------- domed crystal ----------------

const GLASS = ellPath(0, 0, FACE_R, FACE_R);
const glassDef: PartDef = {
  id: 'glass', name: { en: 'Domed Crystal', vi: 'Mặt kính vòm' }, side: 'F', z: 8, x: 0, y: CY, w: FACE_R * 2, h: FACE_R * 2, icon: '🔍',
  shape: GLASS, needs: ['bezel'], elev: 29, thick: 13, round: FACE_R, mat: 'glass', body: '#c8dbe6',
  draw(c, s) {
    if (s.inDevice) {
      // the dial and hands seen through the crystal
      dialFace(c, FACE_R - 2, s.power);
      hands(c, s.power > 0 ? s.time : -1, true);
      c.fillStyle = 'rgba(190,225,245,0.1)';
    } else {
      c.fillStyle = 'rgba(200,228,245,0.55)';
    }
    c.beginPath(); c.arc(0, 0, FACE_R, 0, Math.PI * 2); c.fill();
    if (s.broken) {
      // scratched-up yellowed protective film with a lifted edge
      c.fillStyle = 'rgba(255,248,225,0.32)';
      c.beginPath(); c.arc(0, 0, FACE_R - 4, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.2;
      for (const [x0, y0, x1, y1] of [[-50, -30, 20, 40], [-30, -55, 46, 10], [-58, 10, -8, 50], [10, -50, 54, 22], [-20, -10, 30, -40], [-40, 30, 30, 30]]) {
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
      c.strokeStyle = 'rgba(255,255,255,0.5)';
      for (const [x, y, r] of [[-30, 24, 6], [34, -20, 4], [16, 44, 3]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.beginPath(); c.moveTo(50, 54); c.lineTo(60, 38); c.lineTo(40, 48); c.closePath(); c.fill();
    }
    // the shop window caught on the dome, a smaller ghost opposite
    c.save(); c.translate(-30, -36); c.rotate(-0.75);
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); rrc(c, 0, 0, 44, 13, 6); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); rrc(c, 2, 12, 34, 4, 2); c.fill();
    c.restore();
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath(); c.ellipse(40, 44, 10, 4, -0.75, 0, Math.PI * 2); c.fill();
  },
};

// Hands at 10:10 as one star-shaped outline round the hub.
function handPts(): Pts {
  const pts: [number, number, number][] = [];
  const add = (a: number, len: number, w: number) => {
    const dx = Math.sin(a), dy = -Math.cos(a), px = Math.cos(a), py = Math.sin(a);
    for (const [d, o] of [[4, -w / 2], [len * 0.62, -w / 2], [len, 0], [len * 0.62, w / 2], [4, w / 2]]) {
      const x = dx * d + px * o, y = dy * d + py * o;
      pts.push([x, y, Math.atan2(y, x)]);
    }
  };
  add(H_HOUR, 44, 9);
  add(H_MIN, 66, 7);
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
  id: 'hands', name: { en: 'Clock Hands', vi: 'Kim đồng hồ' }, side: 'F', z: 7, x: 0, y: CY, w: 116, h: 74, icon: '🕙',
  shape: handsPath, needs: ['glass'], elev: FLOOR + 3, thick: 2.5, round: 1, mat: 'metal', body: '#1c2333',
  draw(c) { hands(c, -1, false); },
};

const dialDef: PartDef = {
  id: 'dial', name: { en: 'Clock Dial', vi: 'Mặt số' }, side: 'F', z: 6, x: 0, y: CY, w: 156, h: 156, icon: '🕰',
  shape: ellPath(0, 0, 78, 78), needs: ['hands'], elev: FLOOR, thick: 3, round: 1.5, body: shade(CREAM, -0.2),
  draw(c, s) { dialFace(c, 78, s.power); },
};

// ---------------- back cover ----------------

const BACK_R = 88;
const BACK = ellPath(0, 0, BACK_R, BACK_R);
const KEY_AT = { x: -34, y: -22 };
const ALARM_AT = { x: 34, y: -22 };
const backDef: PartDef = {
  id: 'back', name: { en: 'Back Cover', vi: 'Nắp lưng' }, side: 'B', z: 8, x: 0, y: CY, w: BACK_R * 2, h: BACK_R * 2, icon: '⚪',
  shape: BACK, needs: ['b1', 'b2', 'b3', 'b4', 'key'], elev: THICK, thick: 6, round: 5, mat: 'metal', body: '#9aa1aa',
  bumps: [
    // the alarm key (a flat brass T), the time-set and alarm-set knobs
    { kind: 'box', x: ALARM_AT.x, y: ALARM_AT.y, w: 26, h: 6, height: 9, color: BRASS, metal: true },
    { kind: 'cyl', x: ALARM_AT.x, y: ALARM_AT.y, w: 8, height: 4, color: shade(BRASS, -0.2), metal: true },
    { kind: 'cyl', x: -22, y: 50, w: 16, height: 7, color: '#c9ced6', metal: true },
    { kind: 'cyl', x: 22, y: 50, w: 13, height: 6, color: '#c9ced6', metal: true },
  ],
  draw(c) {
    spun(c, 0, BACK_R, '#c4cad2', 71);
    // pressed stiffening rings, embossed directions
    c.strokeStyle = 'rgba(70,80,90,0.45)'; c.lineWidth = 1.6;
    for (const r of [82, 74]) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 0.8;
    for (const r of [81, 73]) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
    font(c, 6.5, 800); c.fillStyle = '#4d5560';
    c.fillText('TIME', KEY_AT.x, KEY_AT.y + 24);
    c.fillText('ALARM', ALARM_AT.x, ALARM_AT.y + 24);
    font(c, 5, 700);
    c.fillText('SET', -22, 64); c.fillText('ALARM SET', 22, 64);
    font(c, 7, 800, SERIF); c.fillStyle = '#5d6670'; c.fillText('Chill Clock Co.', 0, -58);
    font(c, 4.2, 700); c.fillStyle = '#6d7680'; c.fillText('1 JEWEL  ·  UNADJUSTED', 0, -48);
    // curved arrows: which way to wind
    c.strokeStyle = '#6d7580'; c.lineWidth = 1.6;
    for (const p of [KEY_AT, ALARM_AT]) {
      c.beginPath(); c.arc(p.x, p.y, 18, -2.6, -0.5); c.stroke();
      c.beginPath(); c.moveTo(p.x + 15, p.y - 13); c.lineTo(p.x + 16, p.y - 6); c.lineTo(p.x + 10, p.y - 8); c.stroke();
    }
    for (const [x, r] of [[-22, 11], [22, 9]] as const) {
      c.fillStyle = '#8a929c'; c.beginPath(); c.arc(x, 50, r, 0, Math.PI * 2); c.fill();
    }
    // a little patina: rust bloom near the bottom, finger marks
    const rg = c.createRadialGradient(40, 66, 1, 40, 66, 10);
    rg.addColorStop(0, 'rgba(150,80,30,0.35)'); rg.addColorStop(1, 'rgba(150,80,30,0)');
    c.fillStyle = rg; c.beginPath(); c.arc(40, 66, 10, 0, Math.PI * 2); c.fill();
  },
};

// Butterfly winding key: two big brass wings on a stem.
const keyPath = shapeFrom(roundedPts([[-28, -13, 11], [-6, -6, 4], [6, -6, 4], [28, -13, 11], [28, 13, 11], [6, 6, 4], [-6, 6, 4], [-28, 13, 11]]));
const keyDef: PartDef = {
  id: 'key', name: { en: 'Winding Key', vi: 'Chìa lên dây' }, side: 'B', z: 10, x: KEY_AT.x, y: CY + KEY_AT.y, w: 56, h: 26, icon: '🗝',
  shape: keyPath, thick: 7, round: 3, mat: 'metal', body: '#a8802e',
  draw(c) {
    const g = c.createLinearGradient(0, -13, 0, 13);
    g.addColorStop(0, '#fff0b8'); g.addColorStop(0.4, BRASS); g.addColorStop(1, '#a8802e');
    c.fillStyle = g; c.fill(keyPath);
    c.strokeStyle = '#8a6420'; c.lineWidth = 1; c.stroke(keyPath);
    // pierced holes in the wings, the worn shine where fingers turn it
    c.fillStyle = 'rgba(70,45,15,0.6)';
    for (const x of [-18, 18]) { c.beginPath(); c.ellipse(x, 0, 5, 3.5, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgba(255,250,220,0.5)';
    for (const x of [-22, 22]) { c.beginPath(); c.ellipse(x, -7, 4, 1.4, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#8a6420'; c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill();
  },
};

// ---------------- the brass movement ----------------

const MOVE = { x: 0, y: CY - 12, w: 112, h: 92 };
const movePath = shapeFrom(roundedPts([
  [-56, -46, 20], [56, -46, 20], [56, 30, 14], [20, 46, 10], [-20, 46, 10], [-56, 30, 14],
]));
// movement-local positions of what shows through the back: the time and alarm arbors
const TA = { x: KEY_AT.x - MOVE.x, y: CY + KEY_AT.y - MOVE.y };
const AA = { x: ALARM_AT.x - MOVE.x, y: CY + ALARM_AT.y - MOVE.y };

function gear(c: C, x: number, y: number, r: number, n: number, a: number, col: string): void {
  c.save(); c.translate(x, y); c.rotate(a);
  c.fillStyle = shade(col, -0.35);
  for (let i = 0; i < n; i++) { c.save(); c.rotate((i / n) * Math.PI * 2); c.fillRect(-1.2, -r - 2, 2.4, 3.2); c.restore(); }
  c.fillStyle = col; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = shade(col, -0.45);
  for (let i = 0; i < 4; i++) { c.save(); c.rotate((i / 4) * Math.PI * 2 + 0.4); c.beginPath(); c.ellipse(0, -r * 0.55, r * 0.2, r * 0.3, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
  c.fillStyle = '#c9ced6'; c.beginPath(); c.arc(0, 0, 2.2, 0, Math.PI * 2); c.fill();
  c.restore();
}

/** An open mainspring: blued steel coils round an arbor; sprung, the outer coils fly loose. */
function mainspring(c: C, x: number, y: number, rMax: number, spin: number, loose: boolean): void {
  c.strokeStyle = loose ? '#6e7888' : '#4b5a78'; c.lineWidth = 1.5;
  c.beginPath();
  const turns = loose ? 3.2 : 7;
  for (let a = 0; a < Math.PI * 2 * turns; a += 0.15) {
    const r = 4 + (a / (Math.PI * 2 * turns)) * (rMax - 4);
    c.lineTo(x + Math.cos(a + spin) * r, y + Math.sin(a + spin) * r);
  }
  c.stroke();
  c.strokeStyle = 'rgba(200,215,240,0.45)'; c.lineWidth = 0.5; c.stroke();
}

const movementDef: PartDef = {
  id: 'movement', name: { en: 'Clockwork Movement', vi: 'Bộ máy dây cót' }, side: 'B', z: 5, x: MOVE.x, y: MOVE.y, w: MOVE.w, h: MOVE.h, icon: '⚙️',
  shape: movePath, needs: ['back'], elev: FLOOR, thick: 11, round: 2.5, mat: 'metal', body: '#9a7a32',
  bumps: [
    // the square winding arbors the keys fit on, the balance cock
    { kind: 'box', x: TA.x, y: TA.y, w: 5, h: 5, height: 7, color: '#b9c0c8', metal: true },
    { kind: 'box', x: AA.x, y: AA.y, w: 5, h: 5, height: 7, color: '#b9c0c8', metal: true },
    { kind: 'box', x: 0, y: 30, w: 26, h: 7, height: 3, color: '#d2b062', metal: true },
  ],
  draw(c, s) {
    const p = c.createLinearGradient(-56, -46, 56, 46);
    p.addColorStop(0, '#f1d58c'); p.addColorStop(0.5, '#c9a24c'); p.addColorStop(1, '#a8842e');
    c.fillStyle = p; c.fill(movePath);
    // a faint brushed grain on the plate
    c.save(); c.clip(movePath);
    const r = rng(81);
    c.lineWidth = 0.4;
    for (let i = 0; i < 260; i++) {
      const y = -46 + r() * 92;
      c.strokeStyle = r() < 0.5 ? 'rgba(255,245,200,0.25)' : 'rgba(110,80,20,0.12)';
      c.beginPath(); c.moveTo(-56 + r() * 60, y); c.lineTo(-56 + r() * 112, y); c.stroke();
    }
    c.restore();
    const spin = s.power > 0 ? s.time : 0;
    // gear train down the middle
    gear(c, 0, -8, 17, 48, spin * 0.5, '#e6c46a');
    gear(c, 20, 12, 11, 36, -spin * 1.4, '#e6c46a');
    gear(c, -18, 14, 9, 30, spin * 2, '#d8cfb8');
    // both mainsprings coiled round their arbors; the time one is the broken one
    mainspring(c, TA.x, TA.y, 20, spin, s.broken);
    mainspring(c, AA.x, AA.y, 18, -spin * 0.5, false);
    if (s.broken) {
      // sprung: the outer end jumped its post and flew out across the plate
      c.strokeStyle = '#6e7888'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(TA.x + 14, TA.y + 10); c.bezierCurveTo(TA.x + 34, TA.y + 34, TA.x - 6, TA.y + 52, TA.x - 18, TA.y + 34); c.bezierCurveTo(TA.x - 30, TA.y + 18, TA.x - 4, TA.y - 4, TA.x + 2, TA.y + 22); c.stroke();
      c.fillStyle = '#d23a2a'; c.beginPath(); c.arc(TA.x + 18, TA.y - 18, 2.5, 0, Math.PI * 2); c.fill();
    }
    // balance wheel ticking back and forth under its cock, with the hairspring
    c.save(); c.translate(0, 30); c.rotate(Math.sin(spin * 12) * 0.8);
    c.strokeStyle = '#b08a30'; c.lineWidth = 2.2;
    c.beginPath(); c.arc(0, 0, 10, 0, Math.PI * 2); c.moveTo(-10, 0); c.lineTo(10, 0); c.stroke();
    c.strokeStyle = 'rgba(70,90,130,0.8)'; c.lineWidth = 0.5;
    c.beginPath(); for (let a = 0; a < 14; a += 0.3) c.lineTo(Math.cos(a) * (1 + a * 0.45), Math.sin(a) * (1 + a * 0.45)); c.stroke();
    c.restore();
    c.fillStyle = '#c4362c'; c.beginPath(); c.arc(0, 30, 1.6, 0, Math.PI * 2); c.fill();
    // pillars holding the plates, the stamped maker's mark
    for (const [x, y] of [[-46, -36], [46, -36], [-44, 26], [44, 26]]) {
      c.fillStyle = '#8a7a50'; c.beginPath(); c.arc(x, y, 3.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#e8d8a0'; c.beginPath(); c.arc(x - 0.8, y - 0.8, 1.6, 0, Math.PI * 2); c.fill();
    }
    font(c, 4, 700); c.fillStyle = '#7a5a1a'; c.fillText('CHILL  ·  1 JEWEL', 0, -38);
  },
};

// ---------------- night-light board ----------------

const aboardDef: PartDef = {
  id: 'aboard', name: { en: 'Night-Light Board', vi: 'Mạch đèn ngủ' }, side: 'B', z: 5, x: 0, y: CY + 58, w: 46, h: 22, icon: '💡',
  shape: rrPath(0, 0, 46, 22, 5), needs: ['back'], elev: FLOOR, thick: 3, mat: 'pcb', body: '#1d5c37',
  bumps: [{ kind: 'cyl', x: -12, y: 0, w: 9, height: 7, color: '#f6ead0' }],
  draw(c, s) {
    pcb(c, 46, 22, 17);
    // grain-of-wheat bulb in its socket, the push button, the wire pads
    c.fillStyle = s.power > 0 ? '#fff2b0' : '#f2e6c0';
    c.beginPath(); c.arc(-12, 0, 4.5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#c9a24a'; c.lineWidth = 1; c.beginPath(); c.arc(-12, 0, 5.5, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#2a2a2e'; c.beginPath(); rrc(c, 6, 0, 8, 8, 1.5); c.fill();
    c.fillStyle = '#e04a3a'; c.beginPath(); c.arc(6, 0, 2.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8c15a';
    for (const y of [-6, 6]) { c.beginPath(); c.arc(17, y, 2, 0, Math.PI * 2); c.fill(); }
    if (s.broken) {
      const g = c.createRadialGradient(10, 2, 1, 10, 2, 12);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(10, 2, 12, 0, Math.PI * 2); c.fill();
    }
  },
};

export const clock: DeviceDef = {
  id: 'clock',
  name: { en: 'Twin-Bell Alarm Clock', vi: 'Đồng hồ báo thức chuông đôi' },
  w: 226, h: 252,
  hasBack: true,
  parts: [
    caseDef, bell('bellL', BELLS[0][0], BELLS[0][1], 'Left Bell', 'Chuông trái'), bell('bellR', BELLS[1][0], BELLS[1][1], 'Right Bell', 'Chuông phải'),
    leg('legL', FEET[1], 'Left Leg', 'Chân trái'), leg('legR', FEET[0], 'Right Leg', 'Chân phải'),
    dialDef, handsDef, glassDef, bezelDef,
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
        c.beginPath(); c.arc(x + jig, y, 40 + ph * 34, dir > 0 ? -1.3 : Math.PI + 0.1, dir > 0 ? -0.1 : Math.PI + 1.3); c.stroke();
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
