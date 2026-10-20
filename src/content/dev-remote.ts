// TV remote: long slate-blue stick, cream rubber keys, red power, 2 × AA in the back. Two faces.

import { type C, slab, shade, rrc, rrPath, glossStreak, text, shapeFrom, roundedPts, rrPts } from '../core/draw';
import { type DeviceDef, type PartDef, type Bump, screw } from './device';
import { pcb, cylH, boss } from './kit';

const SLATE = '#5d6f9e';
const SLATE_D = '#52638f';
const CREAM = '#f3ead8';
const RED = '#ef5a4c';
const RUBBER = '#c9c4d2';

// A gently tapered stick: a little wider at the top end.
function stickPts(inset = 0) {
  return roundedPts([
    [-54 + inset, -150 + inset, 40], [54 - inset, -150 + inset, 40],
    [48 - inset, 150 - inset, 30], [-48 + inset, 150 - inset, 30],
  ]);
}
const BODY = shapeFrom(stickPts());
const BODY_IN = shapeFrom(stickPts(8));

// Front-view key layout; the back view mirrors x.
const NUM: [number, number][] = [];
for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) NUM.push([-26 + i * 26, 48 + j * 24]);
const COLOURS = ['#ef5a4c', '#5fc46a', '#ffcc4d', '#5aa7f0'];
const RING = { x: 0, y: -66 };

const KEY_BUMPS: Bump[] = [
  { kind: 'cyl', x: -28, y: -118, w: 18, height: 6, color: RED, view: 'F' },
  { kind: 'cyl', x: 28, y: -118, w: 16, height: 4, color: RUBBER, view: 'F' },
  { kind: 'cyl', x: RING.x, y: RING.y, w: 64, height: 4, color: CREAM, view: 'F' },
  { kind: 'cyl', x: RING.x, y: RING.y, w: 26, height: 8, color: '#ffb33a', view: 'F' },
  { kind: 'box', x: -38, y: -14, w: 16, h: 36, height: 5, color: CREAM, view: 'F' },
  { kind: 'box', x: 38, y: -14, w: 16, h: 36, height: 5, color: CREAM, view: 'F' },
  { kind: 'cyl', x: 0, y: -14, w: 16, height: 4, color: RUBBER, view: 'F' },
  ...COLOURS.map((color, i) => ({ kind: 'box' as const, x: -33 + i * 22, y: 20, w: 18, h: 9, height: 3, color, view: 'F' as const })),
  ...NUM.map(([x, y]) => ({ kind: 'cyl' as const, x, y, w: 19, height: 5, color: CREAM, view: 'F' as const })),
];

const top: PartDef = {
  id: 'top', name: { en: 'Top Case', vi: 'Vỏ trên' }, side: 'A', z: 0, x: 0, y: 0, w: 108, h: 300, icon: '📺',
  shape: BODY, needs: ['membrane', 'window'], tool: 'sponge', thick: 28, cavity: 16, round: 14, wall: 8,
  bumps: KEY_BUMPS,
  draw(c, s) {
    slab(c, BODY, SLATE, -150, 150, { depth: 12, shadow: 0 });
    if (s.view === 'F' || !s.inDevice) {
      glossStreak(c, BODY, -54, -150, 108, 220, 0.26);
      // dark wells the keys sit in
      c.fillStyle = shade(SLATE, -0.35);
      c.beginPath(); c.arc(RING.x, RING.y, 36, 0, Math.PI * 2); c.fill();
      c.beginPath(); rrc(c, 0, 84, 92, 104, 14); c.fill();
      c.beginPath(); rrc(c, 0, -14, 98, 44, 12); c.fill();
      // arrows on the ring
      c.fillStyle = shade(SLATE, -0.6);
      for (let i = 0; i < 4; i++) {
        c.save(); c.translate(RING.x, RING.y); c.rotate((i * Math.PI) / 2);
        c.beginPath(); c.moveTo(0, -29); c.lineTo(-4, -24); c.lineTo(4, -24); c.closePath(); c.fill();
        c.restore();
      }
      text(c, 'VOL', -21, 2, 7, shade(SLATE, 0.55), { font: 'bold' });
      text(c, 'CH', 21, 2, 7, shade(SLATE, 0.55), { font: 'bold' });
      text(c, 'CHILL·TV', 0, 140, 9, shade(SLATE, 0.5), { font: 'bold' });
      // little red send light
      const on = s.power > 0 && Math.sin(s.time * 14) > 0;
      c.fillStyle = on ? '#ff4a3a' : shade(RED, -0.5);
      c.beginPath(); c.arc(0, -126, 2.6, 0, Math.PI * 2); c.fill();
    } else {
      // inside of the top case, seen from the back: key holes mirrored
      c.fillStyle = shade(SLATE, -0.32);
      c.fill(BODY_IN);
      c.save(); c.clip(BODY_IN);
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 10; c.translate(3, 5); c.stroke(BODY_IN);
      c.restore();
      c.fillStyle = shade(SLATE, -0.6);
      for (const b of KEY_BUMPS) {
        c.beginPath();
        if (b.kind === 'cyl') c.arc(-b.x, b.y, b.w / 2 + 1, 0, Math.PI * 2);
        else rrc(c, -b.x, b.y, b.w + 2, (b.h ?? b.w) + 2, 3);
        c.fill();
      }
      boss(c, -36, -130, SLATE); boss(c, 36, -130, SLATE); boss(c, 0, 70, SLATE);
    }
  },
};

const winPath = rrPath(0, 0, 56, 16, 8);
const irWindow: PartDef = {
  id: 'window', name: { en: 'IR Window', vi: 'Mắt hồng ngoại' }, side: 'F', z: 6, x: 0, y: -141, w: 56, h: 16, icon: '🔴',
  shape: winPath, elev: 21, thick: 7, round: 4, mat: 'glass', body: '#5a1a22',
  draw(c, s) {
    const g = c.createLinearGradient(0, -8, 0, 8);
    g.addColorStop(0, '#9a3040'); g.addColorStop(0.5, '#5a1a22'); g.addColorStop(1, '#3a0f16');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 56, 16, 8); c.fill();
    if (s.power > 0) {
      c.fillStyle = `rgba(255,90,80,${0.4 + 0.4 * Math.sin(s.time * 14)})`;
      c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath(); rrc(c, -6, -4, 36, 3, 1.5); c.fill();
  },
};

// ---- back side, x mirrored (seen from behind) ----

const BAY_Y = 72;
const backPath = shapeFrom(stickPts(), [rrPts(0, BAY_Y, 80, 124, 10)]);
const back: PartDef = {
  id: 'back', name: { en: 'Back Case', vi: 'Vỏ sau' }, side: 'B', z: 5, x: 0, y: 0, w: 108, h: 300, icon: '🟦',
  shape: backPath, needs: ['r1', 'r2', 'r3', 'door'], thick: 9, round: 8,
  draw(c) {
    slab(c, backPath, SLATE_D, -150, 150, { depth: 8, shadow: 0 });
    glossStreak(c, backPath, -54, -150, 108, 200, 0.2);
    // grip ridges + label
    c.strokeStyle = shade(SLATE, -0.3); c.lineWidth = 2.5; c.lineCap = 'round';
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-26, -70 + i * 9); c.lineTo(26, -70 + i * 9); c.stroke(); }
    text(c, 'CHILL·TV', 0, -98, 11, shade(SLATE, 0.45), { font: 'bold' });
  },
};

const doorPath = rrPath(0, 0, 78, 122, 10);
const door: PartDef = {
  id: 'door', name: { en: 'Battery Cover', vi: 'Nắp pin' }, side: 'B', z: 7, x: 0, y: BAY_Y, w: 78, h: 122, icon: '▭',
  shape: doorPath, tool: 'sponge', elev: 33, thick: 4, round: 3,
  draw(c) {
    slab(c, doorPath, '#6677a6', -61, 61, { depth: 4, shadow: 0 });
    // thumb grip + arrow
    c.strokeStyle = shade(SLATE, -0.35); c.lineWidth = 2;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-14, -48 + i * 5); c.lineTo(14, -48 + i * 5); c.stroke(); }
    c.fillStyle = shade(SLATE, -0.35);
    c.beginPath(); c.moveTo(0, -16); c.lineTo(-7, -24); c.lineTo(7, -24); c.closePath(); c.fill();
    text(c, '2 × AA', 0, 18, 12, shade(SLATE, 0.5), { font: 'bold' });
    text(c, '+  −', 0, 38, 10, shade(SLATE, 0.4), { font: 'bold' });
  },
};

const batPath = rrPath(0, 0, 28, 100, 13);
function aa(id: string, x: number, color: string, flip: boolean): PartDef {
  return {
    id, name: { en: 'AA Battery', vi: 'Pin AA' }, side: 'B', z: 6, x, y: BAY_Y, w: 28, h: 100, icon: '🔋',
    shape: batPath, needs: ['door'], thick: 18, round: 13, body: shade(color, -0.3),
    draw(c, s) {
      c.save();
      c.rotate(flip ? Math.PI / 2 : -Math.PI / 2);
      cylH(c, 96, 26, color, '#c9ccd2');
      // label band + plus nub at the + end
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(-14, -13, 26, 26);
      c.fillStyle = '#c9ccd2'; c.beginPath(); rrc(c, 50, 0, 6, 10, 2); c.fill();
      c.restore();
      text(c, 'AA', 0, -2, 10, shade(color, -0.4), { font: 'bold' });
      text(c, flip ? '−' : '+', 0, 30, 14, '#fff', { font: 'bold' });
      if (s.broken) {
        // leaky end crusted with white-blue fluff
        c.fillStyle = 'rgba(230,240,245,0.9)';
        for (const [dx, dy, r] of [[-6, -44, 6], [4, -46, 5], [0, -40, 4], [8, -40, 3]]) { c.beginPath(); c.arc(dx, dy, r, 0, Math.PI * 2); c.fill(); }
      }
    },
  };
}

const springPath = rrPath(0, 0, 76, 16, 5);
const springs: PartDef = {
  id: 'springs', name: { en: 'Battery Springs', vi: 'Lò xo pin' }, side: 'B', z: 4, x: 0, y: 128, w: 76, h: 16, icon: '🌀',
  shape: springPath, needs: ['batA', 'batB'], thick: 8, mat: 'metal', body: '#9aa1a8',
  draw(c, s) {
    const m = c.createLinearGradient(0, -8, 0, 8);
    m.addColorStop(0, '#e6e9ee'); m.addColorStop(1, '#8b9097');
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -2, 3, 76, 16, 5); c.fill();
    c.fillStyle = m; c.beginPath(); rrc(c, 0, 0, 76, 16, 5); c.fill();
    // two coils, one per cell
    for (const x of [-18, 18]) {
      c.strokeStyle = s.broken && x > 0 ? '#9a7a4a' : '#f2f4f7'; c.lineWidth = 2;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(x, -2 + i * 1.5, 9 - i * 1.5, 3, 0, 0, Math.PI * 2); c.stroke(); }
    }
    // red / black leads up to the board
    c.lineWidth = 2;
    c.strokeStyle = '#e04a3a'; c.beginPath(); c.moveTo(-34, 0); c.lineTo(-40, -8); c.stroke();
    c.strokeStyle = '#222'; c.beginPath(); c.moveTo(34, 0); c.lineTo(40, -8); c.stroke();
    if (s.broken) {
      c.fillStyle = 'rgba(90,140,60,0.75)';
      c.beginPath(); c.ellipse(18, 2, 10, 5, 0, 0, Math.PI * 2); c.fill();
    }
  },
};

const board: PartDef = {
  id: 'board', name: { en: 'Main Board', vi: 'Bo mạch chính' }, side: 'B', z: 3, x: 0, y: -50, w: 84, h: 170, icon: '🟩',
  shape: rrPath(0, 0, 84, 170, 10), needs: ['back', 'springs'], thick: 4, mat: 'pcb', body: '#1d5c37',
  draw(c, s) {
    pcb(c, 84, 170, 91);
    irLed(c, 0, -80, s.power, s.time);
    // + / − tabs for the battery bay
    c.fillStyle = '#e8c15a';
    c.fillRect(-26, 76, 16, 7); c.fillRect(10, 76, 16, 7);
    if (s.broken) {
      const g = c.createRadialGradient(14, 10, 1, 14, 10, 20);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(14, 10, 20, 0, Math.PI * 2); c.fill();
    }
  },
};

/** The IR LED: a clear dome on two legs at the top of the board. */
function irLed(c: C, x: number, y: number, power: number, t: number): void {
  c.strokeStyle = '#c9ccd2'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(x - 3, y + 2); c.lineTo(x - 3, y + 10); c.moveTo(x + 3, y + 2); c.lineTo(x + 3, y + 10); c.stroke();
  const g = c.createRadialGradient(x - 2, y - 2, 0.5, x, y, 6);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, power > 0 ? `rgba(255,90,80,${0.6 + 0.4 * Math.sin(t * 14)})` : '#9fb3d6');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill();
}

const memPath = rrPath(0, 0, 92, 276, 22);
const membrane: PartDef = {
  id: 'membrane', name: { en: 'Rubber Key Mat', vi: 'Màng nút cao su' }, side: 'B', z: 2, x: 0, y: 2, w: 92, h: 276, icon: '🫧',
  shape: memPath, needs: ['board'], elev: 12, thick: 4, mat: 'rubber', body: '#9a93a8',
  draw(c, s) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -3, 5, 92, 276, 22); c.fill();
    c.fillStyle = RUBBER; c.beginPath(); rrc(c, 0, 0, 92, 276, 22); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); rrc(c, -30, 0, 8, 250, 4); c.fill();
    // the domes, mirrored and in mat-local y
    KEY_BUMPS.forEach((b, i) => {
      if (i === 2) return; // the ring is part of the mat, its OK key is the dome
      const x = -b.x, y = b.y - 2, r = b.kind === 'cyl' ? Math.min(b.w / 2, 11) : Math.min(b.w, b.h ?? b.w) / 2 + 1;
      c.fillStyle = 'rgba(60,50,80,0.3)'; c.beginPath(); c.arc(x - 1, y + 2, r, 0, Math.PI * 2); c.fill();
      const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, 0.5, x, y, r);
      g.addColorStop(0, '#f6f3fa'); g.addColorStop(1, '#a59dba');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2b2733'; c.beginPath(); c.arc(x, y, r * 0.35, 0, Math.PI * 2); c.fill();
      if (s.broken && i % 4 === 1) {
        c.strokeStyle = '#5a4f6a'; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(x - r * 0.8, y - r * 0.2); c.lineTo(x, y + r * 0.3); c.lineTo(x + r * 0.7, y - r * 0.4); c.stroke();
      }
    });
  },
};

export const remote: DeviceDef = {
  id: 'remote',
  name: { en: 'TV Remote', vi: 'Điều khiển TV' },
  w: 108, h: 300,
  hasBack: true,
  parts: [
    top, irWindow, back, door, aa('batA', -16, '#5fc46a', false), aa('batB', 16, '#ff8fa3', true), springs, board, membrane,
    screw('r1', -36, -130, 'B'), screw('r2', 36, -130, 'B'),
    // the sneaky one hiding between the batteries
    screw('r3', 0, 70, 'B', 6, ['batA', 'batB']),
  ],
  working(c, t, k) {
    c.save();
    // IR pulses fanning out of the nose
    for (let i = 0; i < 3; i++) {
      const p = (t * 1.6 + i / 3) % 1;
      c.globalAlpha = k * (1 - p) * 0.7;
      c.strokeStyle = '#ff6a5a'; c.lineWidth = 3;
      c.beginPath(); c.arc(0, -150, 14 + p * 60, -Math.PI * 0.8, -Math.PI * 0.2); c.stroke();
    }
    c.restore();
  },
  workFx: { kind: 'spark', x: 0, y: -160, color: '#ff8a7a', dir: -Math.PI / 2 },
};
