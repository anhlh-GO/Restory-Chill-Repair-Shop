// Retro compact camera: cream body, salmon leather plate, gold lens.

import { type C, slab, shade, rrc, rrPath, ellPath, glossStreak, text, shapeFrom, ellPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, knurlRing, glass, boss, cylH } from './kit';

const CREAM = '#f4e4c8';
const LEATHER = '#ea9f8e';
const GOLD = '#d9a443';

const BODY = rrPath(0, 0, 280, 176, 26);
const BODY_IN = rrPath(0, 0, 258, 154, 20);

const body: PartDef = {
  id: 'body', name: { en: 'Body Shell', vi: 'Thân máy' }, side: 'A', z: 0, x: 0, y: 0, w: 280, h: 176, icon: '📷',
  shape: BODY, needs: ['shutter', 'flash', 'cboard'], tool: 'sponge', thick: 34, cavity: 14, round: 18,
  draw(c, s) {
    slab(c, BODY, CREAM, -88, 88, { depth: 14, shadow: 0 });
    glossStreak(c, BODY, -140, -88, 280, 90, 0.3);
    if (s.inDevice) {
      c.fillStyle = shade(CREAM, -0.32);
      c.fill(BODY_IN);
      c.save(); c.clip(BODY_IN);
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(BODY_IN);
      c.restore();
      boss(c, -112, -60, CREAM); boss(c, 112, -60, CREAM); boss(c, -112, 60, CREAM); boss(c, 112, 60, CREAM);
    } else {
      // back of the camera when loose: viewfinder + tiny screen
      c.fillStyle = '#2b2b30'; c.beginPath(); rrc(c, -80, -40, 50, 34, 8); c.fill();
      c.fillStyle = '#3d4a58'; c.beginPath(); rrc(c, 40, 10, 110, 80, 8); c.fill();
    }
    // strap lug
    c.fillStyle = '#c9c9cc';
    c.beginPath(); rrc(c, 146, -40, 12, 22, 4); c.fill();
  },
};

const plateShape = rrPath(0, 0, 262, 156, 20);

const plate: PartDef = {
  id: 'plate', name: { en: 'Front Plate', vi: 'Mặt trước' }, side: 'A', z: 5, x: 0, y: 0, w: 262, h: 156, icon: '🟧',
  shape: plateShape, needs: ['f1', 'f2', 'f3', 'f4', 'lens', 'dial'], tool: 'brush', thick: 6, round: 3, mat: 'rubber',
  draw(c) {
    slab(c, plateShape, LEATHER, -78, 78, { depth: 6, shadow: 0 });
    // pebbled leather texture
    c.save();
    c.clip(plateShape);
    c.fillStyle = 'rgba(120,40,30,0.18)';
    for (let i = 0; i < 160; i++) {
      c.beginPath(); c.arc(((i * 61) % 256) - 128, ((i * 37) % 150) - 75, 1.4, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    // cream top band like the reference
    c.fillStyle = shade(CREAM, 0.1);
    c.beginPath(); rrc(c, 0, -62, 250, 26, 12); c.fill();
    // lens mount: a silver collar around the opening
    c.fillStyle = '#b9bdc4';
    c.beginPath(); c.arc(45, 5, 62, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2a2b30';
    c.beginPath(); c.arc(45, 5, 54, 0, Math.PI * 2); c.fill();
    text(c, 'CHILL-35', -70, 50, 13, shade(LEATHER, -0.5), { font: 'bold' });
  },
};

const ringShape = shapeFrom(ellPts(0, 0, 58, 58, 64), [ellPts(0, 0, 44, 44, 64)]);
const ring: PartDef = {
  id: 'ring', name: { en: 'Lens Ring', vi: 'Vòng ống kính' }, side: 'A', z: 8, x: 45, y: 5, w: 116, h: 116, icon: '⭕',
  shape: ringShape, elev: 40, thick: 16, mat: 'metal', body: '#b8862e',
  draw(c) {
    // annulus: clip away the centre so the lens below stays visible
    c.save();
    const ann = new Path2D();
    ann.arc(0, 0, 64, 0, Math.PI * 2);
    ann.arc(0, 0, 44, 0, Math.PI * 2, true);
    c.clip(ann, 'evenodd');
    knurlRing(c, 58, 44, GOLD);
    c.restore();
  },
};

const lens: PartDef = {
  id: 'lens', name: { en: 'Lens Assembly', vi: 'Cụm ống kính' }, side: 'A', z: 7, x: 45, y: 5, w: 96, h: 96, icon: '🔵',
  shape: ellPath(0, 0, 46, 46), needs: ['ring'], tool: 'brush', thick: 18, round: 6, body: '#26262b',
  draw(c) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); c.arc(-3, 5, 46, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#26262b'; c.beginPath(); c.arc(0, 0, 46, 0, Math.PI * 2); c.fill();
    glass(c, 38, '#1f4a5e');
  },
};

const dial: PartDef = {
  id: 'dial', name: { en: 'Mode Dial', vi: 'Núm chỉnh' }, side: 'A', z: 8, x: -62, y: -60, w: 40, h: 40, icon: '🔘',
  shape: ellPath(0, 0, 20, 20), thick: 12, mat: 'metal', body: '#9aa0a8',
  draw(c) {
    knurlRing(c, 20, 10, '#c9ccd2');
    c.fillStyle = '#e04a3a'; c.beginPath(); c.arc(0, -12, 2.5, 0, Math.PI * 2); c.fill();
  },
};

const shutter: PartDef = {
  id: 'shutter', name: { en: 'Shutter Blades', vi: 'Lá màn trập' }, side: 'A', z: 3, x: 45, y: 5, w: 100, h: 100, icon: '✳',
  shape: ellPath(0, 0, 50, 50), needs: ['plate'], thick: 8, mat: 'metal', body: '#3d4048',
  draw(c, s) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); c.arc(-3, 5, 50, 0, Math.PI * 2); c.fill();
    const g = c.createRadialGradient(-15, -15, 4, 0, 0, 50);
    g.addColorStop(0, '#9aa0aa'); g.addColorStop(1, '#3d4048');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 50, 0, Math.PI * 2); c.fill();
    const open = s.power > 0 ? 0.5 + 0.5 * Math.sin(s.time * 6) : s.broken ? 0.15 : 0.35;
    for (let i = 0; i < 6; i++) {
      c.save();
      c.rotate((i / 6) * Math.PI * 2 + open);
      c.fillStyle = i % 2 ? '#2a2c31' : '#34373e';
      c.beginPath(); c.moveTo(0, -42); c.quadraticCurveTo(30, -30, 38, 0); c.lineTo(12 * (1 - open), 0); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.15)'; c.stroke();
      c.restore();
    }
    c.strokeStyle = '#b8bcc4'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 47, 0, Math.PI * 2); c.stroke();
  },
};

const flash: PartDef = {
  id: 'flash', name: { en: 'Flash Unit', vi: 'Bộ đèn flash' }, side: 'A', z: 3, x: -70, y: -24, w: 82, h: 40, icon: '⚡',
  shape: rrPath(0, 0, 82, 40, 6), needs: ['plate'], thick: 12, mat: 'metal', body: '#9aa0a8',
  draw(c, s) {
    c.save();
    c.translate(-14, 0);
    cylH(c, 40, 20, '#3a6d8f', '#c9ccd2');
    c.restore();
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, 19, 5, 40, 34, 4); c.fill();
    const g = c.createLinearGradient(0, -17, 0, 17);
    g.addColorStop(0, '#f2f4f7'); g.addColorStop(0.5, '#b9bec6'); g.addColorStop(1, '#eef0f3');
    c.fillStyle = g; c.beginPath(); rrc(c, 22, 0, 40, 34, 4); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.2)';
    for (let x = 6; x < 40; x += 5) { c.beginPath(); c.moveTo(x, -15); c.lineTo(x, 15); c.stroke(); }
    if (s.power > 0) {
      c.fillStyle = `rgba(255,255,230,${s.power * (0.5 + 0.5 * Math.sin(s.time * 8))})`;
      c.beginPath(); rrc(c, 22, 0, 40, 34, 4); c.fill();
    }
  },
};

const cboard: PartDef = {
  id: 'cboard', name: { en: 'Control Board', vi: 'Bo mạch' }, side: 'A', z: 3, x: -72, y: 34, w: 96, h: 58, icon: '🟩',
  shape: rrPath(0, 0, 96, 58, 5), needs: ['plate'], thick: 4, mat: 'pcb', body: '#1d5c4a',
  draw(c) { pcb(c, 96, 58, 33, '#2c7a6a'); },
};

export const camera: DeviceDef = {
  id: 'camera',
  name: { en: 'Retro Compact Camera', vi: 'Máy ảnh compact' },
  w: 290, h: 190,
  hasBack: false,
  parts: [
    body, shutter, flash, cboard, plate, lens, ring, dial,
    screw('f1', -116, -64, 'A'), screw('f2', 116, -64, 'A'), screw('f3', -116, 64, 'A'), screw('f4', 116, 64, 'A'),
  ],
  working(c, t, k) {
    const ph = (t * 0.8) % 1;
    c.save();
    c.globalAlpha = k * Math.max(0, 1 - ph * 3);
    const g = c.createRadialGradient(-70, -24, 5, -70, -24, 160);
    g.addColorStop(0, 'rgba(255,255,240,0.95)'); g.addColorStop(1, 'rgba(255,255,240,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(-70, -24, 160, 0, Math.PI * 2); c.fill();
    c.restore();
    // lens glint
    c.save();
    c.globalAlpha = k;
    c.fillStyle = 'rgba(255,255,255,0.8)';
    const a = t * 2;
    c.beginPath(); c.ellipse(45 + Math.cos(a) * 18, 5 + Math.sin(a) * 18, 6, 3, a, 0, Math.PI * 2); c.fill();
    c.restore();
  },
  workFx: { kind: 'flash', x: -50, y: -24, color: '#fffbe0', dir: -Math.PI / 2 },
};
