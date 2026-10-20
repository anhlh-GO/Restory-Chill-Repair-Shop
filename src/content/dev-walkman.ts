// Cassette walkman: teal body, smoked tape door, silver keys. Two faces.

import { type C, slab, shade, rrc, rrPath, ellPath, glossStreak, text } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, vents, boss } from './kit';

const TEAL = '#2b98a6';
const SILVER = '#cfd5db';
const ORANGE = '#ff8a3d';

const BODY = rrPath(0, 0, 210, 290, 22);
const BODY_IN = rrPath(0, 0, 190, 270, 16);

const shell: PartDef = {
  id: 'shell', name: { en: 'Front Shell', vi: 'Vỏ trước' }, side: 'A', z: 0, x: 0, y: 0, w: 210, h: 290, icon: '🟦',
  shape: BODY, needs: ['motor', 'wboard', 'jack', 'tape', 'keys'], tool: 'sponge', thick: 26, cavity: 13, round: 13,
  draw(c, s) {
    slab(c, BODY, TEAL, -145, 145, { depth: 12, shadow: 0 });
    if (s.view === 'F' || !s.inDevice) {
      glossStreak(c, BODY, -105, -145, 210, 140, 0.25);
      // tape well
      c.fillStyle = shade(TEAL, -0.55);
      c.beginPath(); rrc(c, 0, -5, 172, 152, 12); c.fill();
      c.fillStyle = '#1a2328';
      c.beginPath(); c.arc(-40, -5, 12, 0, Math.PI * 2); c.arc(40, -5, 12, 0, Math.PI * 2); c.fill();
      // brand stripe + volume wheel
      c.fillStyle = ORANGE; c.fillRect(-100, 92, 200, 6);
      text(c, 'CHILL·MAN', -40, 118, 16, shade(TEAL, 0.6), { font: 'bold' });
      c.fillStyle = shade(SILVER, -0.2); c.beginPath(); rrc(c, 70, 118, 30, 20, 6); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.3)';
      for (let x = 58; x < 84; x += 3) { c.beginPath(); c.moveTo(x, 110); c.lineTo(x, 126); c.stroke(); }
    } else {
      c.fillStyle = shade(TEAL, -0.32);
      c.fill(BODY_IN);
      c.save(); c.clip(BODY_IN);
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(BODY_IN);
      c.restore();
      c.fillStyle = shade(TEAL, -0.55);
      c.beginPath(); rrc(c, 0, -5, 150, 120, 10); c.fill();
      boss(c, -84, -124, TEAL); boss(c, 84, -124, TEAL); boss(c, -84, 124, TEAL); boss(c, 84, 124, TEAL);
    }
  },
};

const keysPath = rrPath(0, 0, 176, 30, 8);
const keys: PartDef = {
  id: 'keys', name: { en: 'Control Keys', vi: 'Phím điều khiển' }, side: 'F', z: 7, x: 0, y: -130, w: 176, h: 30, icon: '⏯',
  shape: keysPath, tool: 'brush', thick: 4, body: '#9aa1a8',
  bumps: [
    { kind: 'box', x: -66, y: 0, w: 38, h: 24, height: 6, color: SILVER },
    { kind: 'box', x: -22, y: 0, w: 38, h: 24, height: 6, color: ORANGE },
    { kind: 'box', x: 22, y: 0, w: 38, h: 24, height: 6, color: SILVER },
    { kind: 'box', x: 66, y: 0, w: 38, h: 24, height: 6, color: SILVER },
  ],
  draw(c) {
    const labels = ['◀◀', '▶', '■', '▶▶'];
    labels.forEach((l, i) => {
      const x = -66 + i * 44;
      const p = rrPath(x, 0, 40, 26, 6);
      slab(c, p, i === 1 ? ORANGE : SILVER, -13, 13, { depth: 5, shadow: 0 });
      text(c, l, x, 1, 11, '#3a3f45', { font: 'bold' });
    });
  },
};

const doorPath = rrPath(0, 0, 178, 156, 14);
const door: PartDef = {
  id: 'door', name: { en: 'Tape Door', vi: 'Nắp băng' }, side: 'F', z: 7, x: 0, y: -5, w: 178, h: 156, icon: '🚪',
  shape: doorPath, tool: 'brush', thick: 5,
  draw(c) {
    c.fillStyle = 'rgba(10,20,40,0.3)';
    c.save(); c.translate(-3, 5); c.fill(doorPath); c.restore();
    c.fillStyle = shade(TEAL, -0.2);
    c.fill(doorPath);
    c.fillStyle = 'rgba(30,45,55,0.55)';
    c.beginPath(); rrc(c, 0, -6, 150, 110, 10); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath(); c.moveTo(-72, -58); c.lineTo(-20, -58); c.lineTo(-72, 20); c.closePath(); c.fill();
    c.strokeStyle = shade(SILVER, 0.2); c.lineWidth = 2;
    c.beginPath(); rrc(c, 0, -6, 150, 110, 10); c.stroke();
    c.fillStyle = shade(TEAL, 0.2); c.beginPath(); rrc(c, 0, 64, 60, 10, 5); c.fill();
  },
};

function reel(c: C, x: number, y: number, a: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.fillStyle = '#f2efe8'; c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#222';
  for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.fillRect(-1.5, 4, 3, 5); }
  c.restore();
}

const tape: PartDef = {
  id: 'tape', name: { en: 'Cassette Tape', vi: 'Băng cassette' }, side: 'F', z: 6, x: 0, y: -5, w: 156, h: 100, icon: '📼',
  shape: rrPath(0, 0, 156, 100, 8), needs: ['door'], elev: 14, thick: 12, body: '#2d2a33',
  draw(c, s) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -3, 5, 156, 100, 8); c.fill();
    c.fillStyle = '#2d2a33'; c.beginPath(); rrc(c, 0, 0, 156, 100, 8); c.fill();
    c.fillStyle = '#f6d36b'; c.beginPath(); rrc(c, 0, -14, 136, 54, 6); c.fill();
    c.fillStyle = '#ef6f6c'; c.fillRect(-68, -38, 136, 8);
    text(c, 'MIXTAPE ♥', 0, -24, 12, '#5a3a1a', { font: 'bold' });
    c.fillStyle = '#1b1a1f'; c.beginPath(); rrc(c, 0, -2, 96, 26, 12); c.fill();
    const a = s.power > 0 ? s.time * 6 : 0;
    reel(c, -30, -2, a); reel(c, 30, -2, a);
    c.fillStyle = '#4a4650'; c.beginPath(); c.moveTo(-50, 50); c.lineTo(-40, 30); c.lineTo(40, 30); c.lineTo(50, 50); c.closePath(); c.fill();
  },
};

const BACK = rrPath(0, 0, 210, 290, 22);
const backPlate: PartDef = {
  id: 'back', name: { en: 'Back Plate', vi: 'Nắp lưng' }, side: 'B', z: 5, x: 0, y: 0, w: 210, h: 290, icon: '🟦',
  shape: BACK, needs: ['k1', 'k2', 'k3', 'k4', 'clip'], thick: 12, round: 9,
  draw(c) {
    slab(c, BACK, shade(TEAL, -0.05), -145, 145, { depth: 10, shadow: 0 });
    glossStreak(c, BACK, -105, -145, 210, 140, 0.2);
    vents(c, 0, 96, 120, 4, 9, TEAL);
    text(c, '2 × AA', 0, -96, 14, shade(TEAL, 0.5), { font: 'bold' });
  },
};

const clipPath = rrPath(0, 0, 72, 170, 14);
const clip: PartDef = {
  id: 'clip', name: { en: 'Belt Clip', vi: 'Kẹp thắt lưng' }, side: 'B', z: 7, x: 0, y: 10, w: 72, h: 170, icon: '📎',
  shape: clipPath, needs: ['kc'], thick: 5, mat: 'metal', body: '#9aa1a8',
  draw(c) {
    slab(c, clipPath, SILVER, -85, 85, { depth: 6, shadow: 0 });
    c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 2;
    for (let y = 30; y < 70; y += 8) { c.beginPath(); c.moveTo(-24, y); c.lineTo(24, y); c.stroke(); }
  },
};

const motor: PartDef = {
  id: 'motor', name: { en: 'Drive Motor & Belt', vi: 'Mô-tơ & dây curoa' }, side: 'B', z: 3, x: -42, y: 60, w: 100, h: 90, icon: '⚙️',
  shape: ellPath(0, 0, 50, 44), needs: ['back'], thick: 10, mat: 'metal', body: '#6b7178',
  draw(c, s) {
    // belt loop to the flywheel
    c.strokeStyle = '#1b1b1f'; c.lineWidth = 3.5;
    c.beginPath(); c.ellipse(10, 0, 40, 26, 0, 0, Math.PI * 2); c.stroke();
    const g = c.createRadialGradient(-30, -10, 3, -22, 0, 24);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, SILVER); g.addColorStop(1, '#6b7178');
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); c.arc(-25, 5, 24, 0, Math.PI * 2); c.fill();
    c.fillStyle = g; c.beginPath(); c.arc(-22, 0, 24, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c87a2e'; c.beginPath(); c.arc(-22, 0, 6, 0, Math.PI * 2); c.fill();
    // flywheel
    c.save();
    c.translate(32, 0);
    c.rotate(s.power > 0 ? s.time * 5 : 0);
    c.fillStyle = '#8b9299'; c.beginPath(); c.arc(0, 0, 20, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5c636a';
    for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.fillRect(-2, 5, 4, 12); }
    c.restore();
  },
};

const wboard: PartDef = {
  id: 'wboard', name: { en: 'Audio Board', vi: 'Bo âm thanh' }, side: 'B', z: 3, x: 22, y: -40, w: 130, h: 112, icon: '🟩',
  shape: rrPath(0, 0, 130, 112, 8), needs: ['back'], thick: 4, mat: 'pcb', body: '#1d4a5c',
  draw(c) { pcb(c, 130, 112, 47, '#2b6f86'); },
};

const jack: PartDef = {
  id: 'jack', name: { en: 'Headphone Jack', vi: 'Jack tai nghe' }, side: 'B', z: 3, x: -60, y: -112, w: 50, h: 38, icon: '🎧',
  shape: rrPath(0, 0, 50, 38, 6), needs: ['back'], thick: 12, body: '#2a2d33',
  draw(c) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -3, 5, 50, 38, 6); c.fill();
    c.fillStyle = '#2a2d33'; c.beginPath(); rrc(c, 0, 0, 50, 38, 6); c.fill();
    const g = c.createRadialGradient(-4, -4, 1, 0, 0, 10);
    g.addColorStop(0, '#fff'); g.addColorStop(1, '#9aa1a8');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#111'; c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill();
  },
};

export const walkman: DeviceDef = {
  id: 'walkman',
  name: { en: 'Cassette Walkman', vi: 'Máy nghe băng cassette' },
  w: 210, h: 290,
  hasBack: true,
  parts: [
    shell, keys, door, tape, backPlate, clip, motor, wboard, jack,
    screw('kc', 0, -58, 'B'),
    screw('k1', -84, -124, 'B'), screw('k2', 84, -124, 'B'), screw('k3', -84, 124, 'B'), screw('k4', 84, 124, 'B'),
  ],
  working(c, t, k) {
    c.save();
    c.globalAlpha = k * 0.5;
    const g = c.createRadialGradient(0, -5, 10, 0, -5, 150);
    g.addColorStop(0, 'rgba(255,214,110,0.5)'); g.addColorStop(1, 'rgba(255,214,110,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, -5, 150, 0, Math.PI * 2); c.fill();
    c.restore();
    void t;
  },
  workFx: { kind: 'note', x: 0, y: -150, color: '#ffd36b', dir: -Math.PI / 2 },
};

void ellPath;
