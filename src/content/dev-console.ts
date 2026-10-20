// Retro handheld console: purple body, cream bezel, orange d-pad. Two faces.

import { type C, slab, shade, rrc, rrPath, glossStreak, text, shapeFrom, rrPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, vents, boss, ribbon } from './kit';

const PURPLE = '#9a4fd8';
const CREAM = '#f7e3bf';
const ORANGE = '#ffb33a';

const BODY = rrPath(0, 0, 200, 300, 30);
const BODY_IN = rrPath(0, 0, 182, 282, 24);

function dpad(c: C, x: number, y: number, s: number): void {
  c.save();
  c.translate(x, y);
  const p = new Path2D();
  p.rect(-s * 0.35, -s, s * 0.7, s * 2);
  p.rect(-s, -s * 0.35, s * 2, s * 0.7);
  c.fillStyle = shade(ORANGE, -0.45);
  c.save(); c.translate(0, 4); c.fill(p); c.restore();
  c.fillStyle = ORANGE;
  c.fill(p);
  c.fillStyle = 'rgba(255,255,255,0.45)';
  c.fillRect(-s * 0.3, -s * 0.95, s * 0.6, s * 0.25);
  c.restore();
}

function roundBtn(c: C, x: number, y: number, r: number, col: string): void {
  c.fillStyle = shade(col, -0.45);
  c.beginPath(); c.arc(x, y + 3, r, 0, Math.PI * 2); c.fill();
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.4, 1, x, y, r);
  g.addColorStop(0, shade(col, 0.5)); g.addColorStop(1, col);
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}

function screen(c: C, power: number, t: number): void {
  // LCD seen through the bezel window
  const on = power > 0;
  const g = c.createLinearGradient(0, -110, 0, -10);
  g.addColorStop(0, on ? '#c9f27a' : '#2c3036');
  g.addColorStop(1, on ? '#86c94a' : '#1b1e23');
  c.fillStyle = g;
  c.beginPath(); rrc(c, 0, -60, 124, 94, 8); c.fill();
  if (on) {
    c.globalAlpha = power;
    // pixel heart + "OK!"
    const px = 5;
    const heart = ['01100110', '11111111', '11111111', '01111110', '00111100', '00011000'];
    heart.forEach((row, j) => [...row].forEach((b, i) => {
      if (b === '1') { c.fillStyle = '#2f5d1c'; c.fillRect(-20 + i * px, -92 + j * px + Math.sin(t * 4) * 2, px - 1, px - 1); }
    }));
    text(c, 'OK!', 0, -40, 18, '#2f5d1c', { font: 'bold' });
    c.globalAlpha = 1;
  }
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.beginPath(); c.moveTo(-62, -107); c.lineTo(-20, -107); c.lineTo(-62, -40); c.closePath(); c.fill();
}

const frontCase: PartDef = {
  id: 'front', name: { en: 'Front Case', vi: 'Vỏ trước' }, side: 'A', z: 0, x: 0, y: 0, w: 200, h: 300, icon: '🟪',
  shape: BODY, needs: ['lcd', 'buttons', 'bezel'], tool: 'sponge', thick: 28, cavity: 16, round: 16, wall: 10,
  bumps: [
    { kind: 'cross', x: -52, y: 62, w: 44, height: 5, color: ORANGE, view: 'F' },
    { kind: 'cyl', x: 56, y: 48, w: 28, height: 5, color: CREAM, view: 'F' },
    { kind: 'cyl', x: 26, y: 78, w: 28, height: 5, color: CREAM, view: 'F' },
    { kind: 'box', x: -22, y: 118, w: 26, h: 8, height: 3, color: '#5a2a80', view: 'F' },
    { kind: 'box', x: 18, y: 118, w: 26, h: 8, height: 3, color: '#5a2a80', view: 'F' },
  ],
  draw(c, s) {
    slab(c, BODY, PURPLE, -150, 150, { depth: 12, shadow: 0 });
    if (s.view === 'F' || !s.inDevice) {
      glossStreak(c, BODY, -100, -150, 200, 150, 0.25);
      screen(c, s.power, s.time);
      dpad(c, -52, 62, 22);
      roundBtn(c, 56, 48, 14, CREAM);
      roundBtn(c, 26, 78, 14, CREAM);
      text(c, 'A', 56, 49, 12, shade(PURPLE, -0.3), { font: 'bold' });
      text(c, 'B', 26, 79, 12, shade(PURPLE, -0.3), { font: 'bold' });
      for (const x of [-22, 18]) {
        c.fillStyle = shade(PURPLE, -0.35);
        c.beginPath(); rrc(c, x, 118, 26, 8, 4); c.fill();
      }
      c.fillStyle = shade(PURPLE, -0.4);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
        c.beginPath(); c.arc(56 + i * 8, 110 + j * 8, 2, 0, Math.PI * 2); c.fill();
      }
    } else {
      // inside of the front shell
      c.fillStyle = shade(PURPLE, -0.3);
      c.fill(BODY_IN);
      c.fillStyle = '#15121c';
      c.beginPath(); rrc(c, 0, -60, 128, 98, 8); c.fill();
      for (const [x, y, r] of [[52, 62, 20], [-56, 48, 14], [-26, 78, 14]] as const) {
        c.fillStyle = shade(PURPLE, -0.55);
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      }
      boss(c, -80, -128, PURPLE); boss(c, 80, -128, PURPLE); boss(c, -80, 128, PURPLE); boss(c, 80, 128, PURPLE);
    }
  },
};

const bezelPath = shapeFrom(rrPts(0, 0, 156, 128, 18), [rrPts(0, 0, 128, 96, 6)]);
const bezel: PartDef = {
  id: 'bezel', name: { en: 'Screen Bezel', vi: 'Viền màn hình' }, side: 'F', z: 6, x: 0, y: -60, w: 156, h: 128, icon: '⬜',
  shape: bezelPath, tool: 'brush', thick: 6, round: 3,
  draw(c, s) {
    c.save();
    const hole = new Path2D();
    hole.addPath(bezelPath);
    hole.rect(64, -48, -128, 96); // counter-wound hole
    c.fillStyle = 'rgba(10,20,40,0.3)';
    c.save(); c.translate(-3, 5); c.fill(hole, 'evenodd'); c.restore();
    c.fillStyle = shade(CREAM, -0.3);
    c.save(); c.translate(0, 5); c.fill(hole, 'evenodd'); c.restore();
    const g = c.createLinearGradient(0, -64, 0, 64);
    g.addColorStop(0, shade(CREAM, 0.4)); g.addColorStop(1, shade(CREAM, -0.1));
    c.fillStyle = g;
    c.fill(hole, 'evenodd');
    c.strokeStyle = ORANGE; c.lineWidth = 3;
    c.beginPath(); rrc(c, 0, 0, 136, 106, 10); c.stroke();
    if (!s.inDevice) {
      // loose bezel shows the glass
      c.fillStyle = 'rgba(40,40,60,0.6)';
      c.fillRect(-64, -48, 128, 96);
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.beginPath(); c.moveTo(-60, -44); c.lineTo(-10, -44); c.lineTo(-60, 30); c.closePath(); c.fill();
    }
    c.restore();
  },
};

const BACK = rrPath(0, 0, 200, 300, 30);
const backCase: PartDef = {
  id: 'back', name: { en: 'Back Case', vi: 'Vỏ sau' }, side: 'B', z: 5, x: 0, y: 0, w: 200, h: 300, icon: '🟪',
  shape: BACK, needs: ['c1', 'c2', 'c3', 'c4', 'battery'], thick: 14, round: 12,
  draw(c) {
    slab(c, BACK, shade(PURPLE, 0.05), -150, 150, { depth: 10, shadow: 0 });
    glossStreak(c, BACK, -100, -150, 200, 150, 0.22);
    // speckled plastic texture like the reference
    c.fillStyle = 'rgba(80,20,110,0.25)';
    for (let i = 0; i < 40; i++) {
      c.beginPath(); c.arc(((i * 53) % 180) - 90, ((i * 97) % 280) - 140, 1.5, 0, Math.PI * 2); c.fill();
    }
    vents(c, 0, -110, 70, 4, 9, PURPLE);
    // battery bay recess
    c.fillStyle = shade(PURPLE, -0.4);
    c.beginPath(); rrc(c, 0, 92, 128, 72, 12); c.fill();
  },
};

const doorPath = rrPath(0, 0, 120, 64, 10);
const door: PartDef = {
  id: 'door', name: { en: 'Battery Door', vi: 'Nắp pin' }, side: 'B', z: 7, x: 0, y: 92, w: 120, h: 64, icon: '▭',
  shape: doorPath, needs: ['sd'], elev: 48, thick: 4,
  draw(c) {
    slab(c, doorPath, shade(PURPLE, -0.12), -32, 32, { depth: 5, shadow: 0 });
    c.fillStyle = shade(PURPLE, -0.35);
    c.beginPath(); rrc(c, 0, 6, 54, 28, 6); c.fill();
    c.strokeStyle = shade(PURPLE, -0.55); c.lineWidth = 2;
    for (const x of [-8, 0, 8]) { c.beginPath(); c.moveTo(x, -2); c.lineTo(x, 14); c.stroke(); }
  },
};

const batPath = rrPath(0, 0, 104, 50, 6);
const battery: PartDef = {
  id: 'battery', name: { en: 'Battery Pack', vi: 'Pin' }, side: 'B', z: 6, x: 0, y: 92, w: 104, h: 50, icon: '🔋',
  shape: batPath, needs: ['door'], elev: 41, thick: 8, round: 4, body: '#c46a1c',
  draw(c) {
    for (const y of [-12, 12]) {
      c.save();
      c.translate(0, y);
      const g = c.createLinearGradient(0, -11, 0, 11);
      g.addColorStop(0, '#9a4f12'); g.addColorStop(0.3, '#ffa54a'); g.addColorStop(1, '#7a3c0c');
      c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -3, 4, 100, 22, 8); c.fill();
      c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 100, 22, 8); c.fill();
      c.fillStyle = '#f2f2f2'; c.fillRect(-20, -11, 30, 22);
      c.fillStyle = '#2b2b33'; c.fillRect(-14, -3, 18, 6);
      const m = c.createLinearGradient(0, -8, 0, 8);
      m.addColorStop(0, '#888'); m.addColorStop(0.4, '#fff'); m.addColorStop(1, '#777');
      c.fillStyle = m; c.fillRect(46, -6, 6, 12);
      c.restore();
    }
  },
};

const board: PartDef = {
  id: 'board', name: { en: 'Main Board', vi: 'Bo mạch chủ' }, side: 'B', z: 3, x: 0, y: -10, w: 176, h: 250, icon: '🟩',
  shape: rrPath(0, 0, 176, 250, 14), needs: ['b1', 'b2'], thick: 4, mat: 'pcb', body: '#1d5c37',
  draw(c) {
    pcb(c, 176, 250, 21);
    ribbon(c, 0, -112, 50, 14);
    c.fillStyle = '#1b1d22';
    c.beginPath(); rrc(c, 0, 10, 46, 46, 3); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(-21, -11, 42, 10);
  },
};

const lcd: PartDef = {
  id: 'lcd', name: { en: 'Main LCD', vi: 'Màn hình LCD' }, side: 'B', z: 2, x: 0, y: -60, w: 140, h: 110, icon: '🖥',
  shape: rrPath(0, 0, 140, 110, 8), needs: ['board'], thick: 6, mat: 'metal', body: '#8b9097',
  draw(c) {
    const g = c.createLinearGradient(0, -55, 0, 55);
    g.addColorStop(0, '#d7dade'); g.addColorStop(1, '#8b9097');
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -3, 5, 140, 110, 8); c.fill();
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 140, 110, 8); c.fill();
    c.fillStyle = '#20242b'; c.beginPath(); rrc(c, 0, -4, 124, 90, 4); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.14)';
    c.beginPath(); c.moveTo(-60, -48); c.lineTo(-20, -48); c.lineTo(-60, 10); c.closePath(); c.fill();
    ribbon(c, 0, 50, 40, 10);
  },
};

const buttons: PartDef = {
  id: 'buttons', name: { en: 'Buttons & Membrane', vi: 'Nút & màng cao su' }, side: 'B', z: 2, x: 0, y: 70, w: 170, h: 96, icon: '🎮',
  shape: rrPath(0, 0, 170, 96, 16), needs: ['board'], thick: 5, mat: 'rubber', body: '#8c8698',
  draw(c) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -3, 5, 170, 96, 16); c.fill();
    c.fillStyle = '#b9b3c4'; c.beginPath(); rrc(c, 0, 0, 170, 96, 16); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); rrc(c, 0, -30, 150, 18, 8); c.fill();
    // mirrored, we see them from behind
    dpad(c, 52, -8, 20);
    roundBtn(c, -56, -22, 13, CREAM);
    roundBtn(c, -26, 8, 13, CREAM);
    for (const x of [-20, 20]) { c.fillStyle = '#8c8698'; c.beginPath(); rrc(c, x, 36, 24, 8, 4); c.fill(); }
  },
};

export const handheld: DeviceDef = {
  id: 'handheld',
  name: { en: 'Retro Handheld Console', vi: 'Máy chơi game cầm tay' },
  w: 200, h: 300,
  hasBack: true,
  parts: [
    frontCase, bezel, backCase, door, battery, board, lcd, buttons,
    screw('sd', 0, 66, 'B', 9),
    screw('c1', -80, -128, 'B'), screw('c2', 80, -128, 'B'), screw('c3', -80, 128, 'B'), screw('c4', 80, 128, 'B'),
    screw('b1', -72, -112, 'B', 4, ['back']), screw('b2', 72, 100, 'B', 4, ['back']),
  ],
  working(c, t, k) {
    c.save();
    c.globalAlpha = k * (0.5 + Math.sin(t * 5) * 0.15);
    const g = c.createRadialGradient(0, -60, 10, 0, -60, 120);
    g.addColorStop(0, 'rgba(200,255,140,0.55)'); g.addColorStop(1, 'rgba(200,255,140,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, -60, 120, 0, Math.PI * 2); c.fill();
    c.restore();
  },
  workFx: { kind: 'note', x: 0, y: -110, color: '#c9f27a', dir: -Math.PI / 2 },
};
