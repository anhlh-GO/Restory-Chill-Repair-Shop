// Hair dryer: a glossy red T seen from above, nozzle to the right.

import { slab, shade, rrc, rrPath, ellPath, polyPath, glossStreak, rr, shapeFrom, roundedPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { coil, pcb, vents, boss } from './kit';

const RED = '#d0242c';
const GOLD = '#e8b54a';

// Barrel spans x -115..115, y -97..-13 ; handle x -35..15, y -13..100.
function tPath(inset = 0): Path2D {
  const bx0 = -115 + inset, bx1 = 115 - inset, by0 = -97 + inset, by1 = -13 - inset;
  const hx0 = -35 + inset, hx1 = 15 - inset, hy1 = 100 - inset;
  const r = 16 - inset * 0.5;
  return shapeFrom(roundedPts([
    [bx0, by0, r], [bx1, by0, r], [bx1, by1, r], [hx1, by1, 10],
    [hx1, hy1, 12], [hx0, hy1, 12], [hx0, by1, 10], [bx0, by1, r],
  ]));
}

// Base sits at device (0,0); its local shape is the T itself.
const T = tPath();
const T_IN = tPath(9);

const lowerShell: PartDef = {
  id: 'lower', name: { en: 'Lower Shell', vi: 'Vỏ dưới' }, side: 'A', z: 0, x: 0, y: 0, w: 230, h: 200, icon: '🟥',
  shape: T, needs: ['heater', 'motor', 'board', 'cord'], tool: 'brush', thick: 36, cavity: 22, round: 30, wall: 9,
  draw(c) {
    slab(c, T, shade(RED, -0.08), -97, 100, { depth: 9, shadow: 0 });
    c.fillStyle = shade(RED, -0.45);
    c.fill(T_IN);
    c.save();
    c.clip(T_IN);
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.lineWidth = 12;
    c.translate(3, 5);
    c.stroke(T_IN);
    c.restore();
    // ribs + bosses
    c.strokeStyle = shade(RED, -0.25);
    c.lineWidth = 3;
    for (const x of [-20, 0, 80]) { c.beginPath(); c.moveTo(x, -88); c.lineTo(x, -22); c.stroke(); }
    boss(c, -85, -55, RED); boss(c, 85, -55, RED); boss(c, -10, 20, RED); boss(c, -10, 70, RED);
  },
};

const heater: PartDef = {
  id: 'heater', name: { en: 'Heating Element', vi: 'Thanh nhiệt' }, side: 'A', z: 2, x: 40, y: -55, w: 96, h: 62, icon: '🔥',
  shape: rrPath(0, 0, 96, 62, 8), needs: ['upper'], thick: 20, round: 24, body: '#4a2a72',
  draw(c, s) {
    c.fillStyle = 'rgba(10,20,40,0.35)';
    c.beginPath(); rrc(c, -3, 5, 96, 62, 8); c.fill();
    const g = c.createLinearGradient(0, -31, 0, 31);
    g.addColorStop(0, '#3a1f5c');
    g.addColorStop(0.3, '#7b4fb8');
    g.addColorStop(0.6, '#5a2f8e');
    g.addColorStop(1, '#22123a');
    c.fillStyle = g;
    c.beginPath(); rrc(c, 0, 0, 96, 62, 8); c.fill();
    // sparkly mica speckles
    c.fillStyle = 'rgba(255,220,255,0.6)';
    for (let i = 0; i < 18; i++) c.fillRect(((i * 37) % 84) - 42, ((i * 23) % 50) - 25, 1.5, 1.5);
    // nichrome zigzag
    c.strokeStyle = s.power > 0 ? `rgba(255,${140 - s.power * 60},40,1)` : '#c9b9a0';
    c.lineWidth = 1.6;
    c.beginPath();
    for (let x = -40; x <= 40; x += 6) c.lineTo(x, (x / 6) % 2 === 0 ? -18 : 18);
    c.stroke();
    // gold end caps
    for (const x of [-46, 46]) {
      const cg = c.createLinearGradient(0, -33, 0, 33);
      cg.addColorStop(0, shade(GOLD, -0.3)); cg.addColorStop(0.3, shade(GOLD, 0.5)); cg.addColorStop(1, shade(GOLD, -0.4));
      c.fillStyle = cg;
      c.beginPath(); rrc(c, x, 0, 8, 66, 3); c.fill();
    }
  },
};

const motor: PartDef = {
  id: 'motor', name: { en: 'Digital Motor', vi: 'Động cơ' }, side: 'A', z: 2, x: -60, y: -55, w: 66, h: 60, icon: '⚙️',
  shape: rrPath(0, 0, 66, 60, 10), needs: ['upper'], thick: 20, round: 16, mat: 'metal', body: '#8a8f99',
  draw(c) {
    c.fillStyle = 'rgba(10,20,40,0.35)';
    c.beginPath(); rrc(c, -3, 5, 66, 60, 10); c.fill();
    const g = c.createLinearGradient(0, -30, 0, 30);
    g.addColorStop(0, '#6b6f78'); g.addColorStop(0.3, '#d6dae0'); g.addColorStop(1, '#4a4e57');
    c.fillStyle = g;
    c.beginPath(); rrc(c, 0, 0, 66, 60, 10); c.fill();
    c.save(); c.translate(-6, 0); coil(c, 34, 46); c.restore();
    // fan
    c.fillStyle = '#2c2f36';
    c.beginPath(); rrc(c, 25, 0, 10, 56, 4); c.fill();
    c.strokeStyle = '#8a8f99'; c.lineWidth = 1.5;
    for (let y = -22; y <= 22; y += 7) { c.beginPath(); c.moveTo(21, y); c.lineTo(29, y + 3); c.stroke(); }
  },
};

const board: PartDef = {
  id: 'board', name: { en: 'Control Board', vi: 'Bo mạch' }, side: 'A', z: 2, x: -10, y: 30, w: 38, h: 66, icon: '🟩',
  shape: rrPath(0, 0, 38, 66, 4), needs: ['upper'], thick: 4, mat: 'pcb', body: '#1d5c37',
  draw(c) { pcb(c, 38, 66, 11); },
};

const cord: PartDef = {
  id: 'cord', name: { en: 'Cord & Strain Relief', vi: 'Dây điện' }, side: 'A', z: 2, x: -10, y: 92, w: 70, h: 70, icon: '〰',
  shape: rrPath(0, 0, 30, 30, 8), needs: ['upper'], thick: 12, mat: 'rubber', body: '#3a2756',
  draw(c, s) {
    c.lineCap = 'round';
    const cable = (p: Path2D) => {
      c.strokeStyle = 'rgba(10,20,40,0.3)'; c.lineWidth = 9;
      c.save(); c.translate(-3, 5); c.stroke(p); c.restore();
      c.strokeStyle = '#d9c7a8'; c.lineWidth = 8; c.stroke(p);
      c.strokeStyle = '#f7ecd6'; c.lineWidth = 3; c.save(); c.translate(-1, -1.5); c.stroke(p); c.restore();
    };
    const p = new Path2D();
    if (s.inDevice) {
      p.moveTo(0, 12);
      p.bezierCurveTo(0, 60, 60, 80, 110, 60);
      p.bezierCurveTo(140, 48, 150, 30, 140, 20);
    } else {
      p.ellipse(4, 14, 26, 16, 0, Math.PI * 0.6, Math.PI * 2.5);
    }
    cable(p);
    // strain relief
    const g = c.createLinearGradient(-12, 0, 12, 0);
    g.addColorStop(0, '#2b1d3d'); g.addColorStop(0.4, '#6d4a99'); g.addColorStop(1, '#1d1229');
    c.fillStyle = g;
    c.beginPath(); rrc(c, 0, -2, 22, 26, 6); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1;
    for (let y = -10; y <= 8; y += 4) { c.beginPath(); c.moveTo(-10, y); c.lineTo(10, y); c.stroke(); }
  },
};

const upper: PartDef = {
  id: 'upper', name: { en: 'Upper Shell', vi: 'Vỏ trên' }, side: 'A', z: 5, x: 0, y: 0, w: 230, h: 200, icon: '🟥',
  shape: T, needs: ['s1', 's2', 's3', 's4', 'nozzle', 'rear'], tool: 'brush', thick: 38, round: 42,
  bumps: [
    { kind: 'cyl', x: -10, y: -2, w: 10, height: 3, color: GOLD, metal: true },
    { kind: 'cyl', x: -10, y: 10, w: 10, height: 3, color: GOLD, metal: true },
    { kind: 'cyl', x: -10, y: 44, w: 12, height: 4, color: GOLD, metal: true },
  ],
  draw(c) {
    slab(c, T, RED, -97, 100, { depth: 10, shadow: 0 });
    glossStreak(c, T, -110, -97, 220, 50, 0.32);
    // barrel shading band (cylinder look)
    c.save();
    c.clip(T);
    const g = c.createLinearGradient(0, -97, 0, -13);
    g.addColorStop(0, 'rgba(0,0,0,0.15)'); g.addColorStop(0.3, 'rgba(255,255,255,0.12)'); g.addColorStop(0.75, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
    c.fillStyle = g;
    c.fillRect(-115, -97, 230, 84);
    c.restore();
    // seam + gold trim
    c.strokeStyle = shade(RED, -0.4); c.lineWidth = 1;
    c.beginPath(); c.moveTo(-108, -55); c.lineTo(108, -55); c.stroke();
    c.strokeStyle = GOLD; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-36, -14); c.lineTo(16, -14); c.stroke();
    // buttons on the handle
    for (const [y, r] of [[-2, 5], [10, 5], [44, 6]] as const) {
      c.fillStyle = shade(GOLD, -0.4); c.beginPath(); c.arc(-10, y + 1.5, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = GOLD; c.beginPath(); c.arc(-10, y, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(-11.5, y - 1.5, r * 0.35, 0, Math.PI * 2); c.fill();
    }
    // silver grip ring at the handle bottom
    const sg = c.createLinearGradient(-35, 0, 15, 0);
    sg.addColorStop(0, '#8d9199'); sg.addColorStop(0.4, '#eef0f3'); sg.addColorStop(1, '#6a6e76');
    c.fillStyle = sg;
    c.beginPath(); rrc(c, -10, 84, 48, 18, 4); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1;
    for (let x = -32; x < 14; x += 4) { c.beginPath(); c.moveTo(x, 76); c.lineTo(x, 92); c.stroke(); }
  },
};

const nozzlePath = polyPath([-17, -40, 15, -32, 15, 32, -17, 40], 4);
const nozzle: PartDef = {
  id: 'nozzle', name: { en: 'Front Nozzle', vi: 'Đầu thổi' }, side: 'A', z: 6, x: 130, y: -55, w: 34, h: 82, icon: '🔺',
  shape: nozzlePath, elev: 4, thick: 60, round: 17,
  draw(c) {
    slab(c, nozzlePath, shade(RED, -0.1), -40, 40, { depth: 8, shadow: 0 });
    c.fillStyle = '#3a0d10';
    c.beginPath(); rrc(c, 13, 0, 4, 56, 2); c.fill();
    c.strokeStyle = GOLD; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-16, -38); c.lineTo(-16, 38); c.stroke();
  },
};

const rearPath = rrPath(0, 0, 22, 88, 8);
const rear: PartDef = {
  id: 'rear', name: { en: 'Rear Cap', vi: 'Nắp sau' }, side: 'A', z: 6, x: -122, y: -55, w: 22, h: 88, icon: '⬛',
  shape: rearPath, needs: ['filter'], elev: 3, thick: 62, round: 11,
  draw(c) {
    slab(c, rearPath, shade(RED, -0.18), -44, 44, { depth: 8, shadow: 0 });
    c.strokeStyle = GOLD; c.lineWidth = 2;
    c.beginPath(); c.moveTo(10, -40); c.lineTo(10, 40); c.stroke();
  },
};

const filterShape = ellPath(0, 0, 12, 34);
const filter: PartDef = {
  id: 'filter', name: { en: 'Intake Filter', vi: 'Lưới lọc gió' }, side: 'A', z: 7, x: -128, y: -55, w: 50, h: 50, icon: '⚪',
  shape: filterShape, tool: 'brush', elev: 8, thick: 56, round: 12, body: '#c9ae88',
  draw(c, s) {
    const rx = s.inDevice ? 12 : 26, ry = s.inDevice ? 34 : 26;
    c.fillStyle = 'rgba(10,20,40,0.3)';
    c.beginPath(); c.ellipse(-3, 5, rx, ry, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#b89b78';
    c.beginPath(); c.ellipse(0, 3, rx, ry, 0, 0, Math.PI * 2); c.fill();
    const g = c.createRadialGradient(-rx * 0.3, -ry * 0.3, 1, 0, 0, Math.max(rx, ry));
    g.addColorStop(0, '#fff3e0'); g.addColorStop(1, '#e2c9a6');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill();
    c.save();
    c.beginPath(); c.ellipse(0, 0, rx * 0.8, ry * 0.8, 0, 0, Math.PI * 2); c.clip();
    c.strokeStyle = 'rgba(120,90,60,0.45)'; c.lineWidth = 0.8;
    for (let k = -30; k <= 30; k += 4) {
      c.beginPath(); c.moveTo(k, -40); c.lineTo(k, 40); c.stroke();
      c.beginPath(); c.moveTo(-40, k); c.lineTo(40, k); c.stroke();
    }
    c.restore();
  },
};

export const dryer: DeviceDef = {
  id: 'dryer',
  name: { en: 'Hair Dryer', vi: 'Máy sấy tóc' },
  w: 280, h: 240,
  hasBack: false,
  parts: [
    lowerShell, heater, motor, board, cord, upper, nozzle, rear, filter,
    screw('s1', -85, -55, 'A'), screw('s2', 85, -55, 'A'), screw('s3', -10, 20, 'A'), screw('s4', -10, 62, 'A'),
  ],
  working(c, t, k) {
    // warm glow at the nozzle + air lines
    c.save();
    c.globalAlpha = k;
    const g = c.createRadialGradient(150, -55, 4, 150, -55, 60);
    g.addColorStop(0, 'rgba(255,170,60,0.75)'); g.addColorStop(1, 'rgba(255,120,40,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(150, -55, 60, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = 2.5; c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const ph = (t * 1.6 + i * 0.25) % 1;
      const y = -75 + i * 13;
      c.globalAlpha = k * (1 - ph);
      c.beginPath();
      c.moveTo(150 + ph * 60, y);
      c.quadraticCurveTo(165 + ph * 60, y - 5, 180 + ph * 60, y);
      c.stroke();
    }
    c.restore();
  },
  workFx: { kind: 'steam', x: 150, y: -55, color: '#ffd9a0', dir: 0 },
};

void vents; void rr;
