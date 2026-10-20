// Retro game pad: lavender shell, charcoal d-pad, candy face buttons. Two faces.

import { type C, slab, shade, rrc, rrPath, glossStreak, text, shapeFrom, roundedPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, cylH, boss, ribbon } from './kit';

const LILAC = '#b3a4f0';
const CREAM = '#f6ead2';
const INK = '#3d3850';
const PINK = '#ff7f9e';
const MINT = '#5fd3a8';
const SKY = '#6cb8ff';
const SUN = '#ffcc4d';
// slab() shades its colour again, so it needs plain hex (not a shade() result)
const LILAC_D = '#a697e6';
const SLATE = '#5f5878';

// Dog-bone silhouette: a wide bar with two round grips hanging down.
function padPts(inset = 0) {
  const sx = 1 - inset / 140, sy = 1 - inset / 80;
  const v: [number, number, number][] = [
    [-104, -72, 44], [104, -72, 44], [140, -20, 50], [136, 58, 40], [96, 86, 36],
    [50, 66, 22], [-50, 66, 22], [-96, 86, 36], [-136, 58, 40], [-140, -20, 50],
  ];
  return roundedPts(v.map(([x, y, r]) => [x * sx, y * sy, Math.max(4, r - inset * 0.6)] as [number, number, number]));
}

const BODY = shapeFrom(padPts());
const BODY_IN = shapeFrom(padPts(11));

// Face buttons in a diamond (front view); the back view mirrors x.
const FACE: [number, number, string, string][] = [[84, -26, MINT, '▲'], [106, -3, PINK, '●'], [84, 20, SKY, '✕'], [62, -3, SUN, '■']];
const DPAD = { x: -84, y: -3 };

function dpad(c: C, x: number, y: number, s: number): void {
  c.save();
  c.translate(x, y);
  const p = new Path2D();
  rrc(p, 0, 0, s * 0.72, s * 2, 3);
  rrc(p, 0, 0, s * 2, s * 0.72, 3);
  // round well the cross sits in
  c.fillStyle = shade(LILAC, -0.25);
  c.beginPath(); c.arc(0, 0, s * 1.25, 0, Math.PI * 2); c.fill();
  c.fillStyle = shade(INK, -0.4);
  c.save(); c.translate(0, 4); c.fill(p); c.restore();
  c.fillStyle = INK;
  c.fill(p);
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.fillRect(-s * 0.3, -s * 0.95, s * 0.6, s * 0.3);
  c.fillStyle = shade(INK, -0.3);
  c.beginPath(); c.arc(0, 0, s * 0.2, 0, Math.PI * 2); c.fill();
  c.restore();
}

function faceBtn(c: C, x: number, y: number, r: number, col: string, glyph: string): void {
  c.fillStyle = shade(col, -0.45);
  c.beginPath(); c.arc(x, y + 3, r, 0, Math.PI * 2); c.fill();
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.4, 1, x, y, r);
  g.addColorStop(0, shade(col, 0.55)); g.addColorStop(1, col);
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  text(c, glyph, x, y + 1, r * 0.9, shade(col, -0.45), { font: 'bold' });
}

const top: PartDef = {
  id: 'top', name: { en: 'Top Shell', vi: 'Vỏ trên' }, side: 'A', z: 0, x: 0, y: 0, w: 280, h: 160, icon: '🎮',
  shape: BODY, needs: ['membrane', 'shoulderL', 'shoulderR'], tool: 'sponge', thick: 30, cavity: 16, round: 18, wall: 11,
  bumps: [
    { kind: 'cross', x: DPAD.x, y: DPAD.y, w: 44, height: 6, color: INK, view: 'F' },
    ...FACE.map(([x, y, col]) => ({ kind: 'cyl' as const, x, y, w: 21, height: 6, color: col, view: 'F' as const })),
    { kind: 'box', x: -18, y: 30, w: 24, h: 8, height: 3, color: shade(INK, 0.2), view: 'F' },
    { kind: 'box', x: 18, y: 30, w: 24, h: 8, height: 3, color: shade(INK, 0.2), view: 'F' },
  ],
  draw(c, s) {
    slab(c, BODY, LILAC, -72, 86, { depth: 12, shadow: 0 });
    if (s.view === 'F' || !s.inDevice) {
      glossStreak(c, BODY, -140, -72, 280, 120, 0.28);
      // cream grip plates + centre label
      c.fillStyle = shade(CREAM, -0.05);
      c.beginPath(); c.arc(DPAD.x, DPAD.y, 42, 0, Math.PI * 2); c.arc(84, -3, 42, 0, Math.PI * 2); c.fill();
      c.fillStyle = shade(LILAC, -0.18);
      c.beginPath(); rrc(c, 0, 4, 64, 64, 20); c.fill();
      dpad(c, DPAD.x, DPAD.y, 22);
      for (const [x, y, col, gl] of FACE) faceBtn(c, x, y, 10.5, col, gl);
      for (const x of [-18, 18]) {
        c.fillStyle = shade(INK, 0.15);
        c.beginPath(); rrc(c, x, 30, 24, 8, 4); c.fill();
      }
      text(c, 'SELECT', -18, 42, 6, shade(LILAC, -0.5), { font: 'bold' });
      text(c, 'START', 18, 42, 6, shade(LILAC, -0.5), { font: 'bold' });
      text(c, 'CHILL·PAD', 0, -16, 11, shade(LILAC, -0.5), { font: 'bold' });
      // power LED
      const on = s.power > 0;
      c.fillStyle = on ? `rgba(120,255,160,${0.6 + 0.4 * Math.sin(s.time * 6)})` : '#5a4f6a';
      c.beginPath(); c.arc(0, -40, 3.5, 0, Math.PI * 2); c.fill();
      if (on) {
        c.fillStyle = 'rgba(120,255,160,0.25)';
        c.beginPath(); c.arc(0, -40, 8, 0, Math.PI * 2); c.fill();
      }
    } else {
      // inside of the top shell, seen from the back: everything mirrored
      c.fillStyle = shade(LILAC, -0.3);
      c.fill(BODY_IN);
      c.save(); c.clip(BODY_IN);
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 12; c.translate(3, 5); c.stroke(BODY_IN);
      c.restore();
      c.fillStyle = shade(LILAC, -0.55);
      c.beginPath(); c.arc(-DPAD.x, DPAD.y, 24, 0, Math.PI * 2); c.fill();
      for (const [x, y] of FACE) { c.beginPath(); c.arc(-x, y, 11, 0, Math.PI * 2); c.fill(); }
      for (const x of [-18, 18]) { c.beginPath(); rrc(c, x, 30, 26, 10, 4); c.fill(); }
      // ribs between the grips
      c.strokeStyle = shade(LILAC, -0.2); c.lineWidth = 3;
      for (const x of [-40, 40]) { c.beginPath(); c.moveTo(x, -60); c.lineTo(x, 56); c.stroke(); }
      boss(c, -110, -46, LILAC); boss(c, 110, -46, LILAC); boss(c, -100, 62, LILAC); boss(c, 100, 62, LILAC);
      boss(c, 0, 0, LILAC);
    }
  },
};

const shoulderPath = rrPath(0, 0, 76, 18, 9);
function shoulder(id: string, x: number, en: string, vi: string, label: string): PartDef {
  return {
    id, name: { en, vi }, side: 'F', z: 6, x, y: -62, w: 76, h: 18, icon: '🔘',
    shape: shoulderPath, elev: 25, thick: 9, round: 5, body: shade(INK, 0.15),
    tool: id === 'shoulderL' ? 'brush' : undefined,
    draw(c) {
      slab(c, shoulderPath, SLATE, -9, 9, { depth: 4, shadow: 0 });
      c.fillStyle = 'rgba(255,255,255,0.22)';
      c.beginPath(); rrc(c, 0, -4, 64, 4, 2); c.fill();
      text(c, label, 0, 1, 10, CREAM, { font: 'bold' });
    },
  };
}

const BACK = shapeFrom(padPts());
const bottom: PartDef = {
  id: 'bottom', name: { en: 'Bottom Shell', vi: 'Vỏ dưới' }, side: 'B', z: 5, x: 0, y: 0, w: 280, h: 160, icon: '🟪',
  shape: BACK, needs: ['g1', 'g2', 'g3', 'g4'], tool: 'sponge', thick: 14, round: 12,
  draw(c) {
    slab(c, BACK, LILAC_D, -72, 86, { depth: 10, shadow: 0 });
    glossStreak(c, BACK, -140, -72, 280, 120, 0.2);
    // grippy ridges on the two handles
    c.strokeStyle = shade(LILAC, -0.3); c.lineWidth = 3; c.lineCap = 'round';
    for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) {
      c.beginPath(); c.moveTo(sx * 92, 24 + i * 10); c.lineTo(sx * 122, 24 + i * 10); c.stroke();
    }
    c.fillStyle = shade(LILAC, -0.2);
    c.beginPath(); rrc(c, 0, -10, 90, 40, 10); c.fill();
    text(c, 'CHILL·PAD', 0, -14, 12, shade(LILAC, -0.55), { font: 'bold' });
    text(c, 'MODEL CP-16', 0, 2, 7, shade(LILAC, -0.45));
  },
};

const memPath = rrPath(0, 0, 236, 66, 26);
const membrane: PartDef = {
  id: 'membrane', name: { en: 'Button Membrane', vi: 'Màng nút cao su' }, side: 'B', z: 2, x: 0, y: -3, w: 236, h: 66, icon: '🫧',
  shape: memPath, needs: ['board'], thick: 4, mat: 'rubber', body: '#9a93a8',
  draw(c, s) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -3, 5, 236, 66, 26); c.fill();
    c.fillStyle = '#c8c2d4'; c.beginPath(); rrc(c, 0, 0, 236, 66, 26); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); rrc(c, 0, -22, 210, 10, 5); c.fill();
    // domes, mirrored: seen from behind the d-pad sits on the right
    const domes: [number, number, number][] = [
      [84, -18, 8], [84, 18, 8], [66, 0, 8], [102, 0, 8],
      ...FACE.map(([x, y]) => [-x, y + 3, 10] as [number, number, number]),
      [-18, 30, 6], [18, 30, 6],
    ];
    domes.forEach(([x, y, r], i) => {
      c.fillStyle = 'rgba(60,50,80,0.3)'; c.beginPath(); c.arc(x - 1, y + 2, r, 0, Math.PI * 2); c.fill();
      const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, 0.5, x, y, r);
      g.addColorStop(0, '#f4f1fa'); g.addColorStop(1, '#a59dba');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2b2733'; c.beginPath(); c.arc(x, y, r * 0.35, 0, Math.PI * 2); c.fill();
      if (s.broken && i % 3 === 1) {
        // squashed dome with a split
        c.strokeStyle = '#5a4f6a'; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(x - r * 0.8, y - r * 0.3); c.lineTo(x - r * 0.1, y + r * 0.2); c.lineTo(x + r * 0.7, y - r * 0.5); c.stroke();
      }
    });
  },
};

const boardPath = rrPath(0, 0, 150, 92, 12);
const board: PartDef = {
  id: 'board', name: { en: 'Main Board', vi: 'Bo mạch chính' }, side: 'B', z: 3, x: 0, y: 0, w: 150, h: 92, icon: '🟩',
  shape: boardPath, needs: ['g5', 'cable', 'rumbleL', 'rumbleR'], thick: 4, mat: 'pcb', body: '#1d5c37',
  draw(c, s) {
    pcb(c, 150, 92, 58);
    ribbon(c, 0, -38, 36, 10);
    c.fillStyle = '#1b1d22';
    c.beginPath(); rrc(c, -30, 10, 34, 34, 3); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(-46, -6, 32, 8);
    text(c, 'CP16', -30, 12, 8, '#8a8f99', { font: 'bold' });
    // rumble wire pads at both ends
    for (const x of [-68, 68]) {
      c.fillStyle = '#e8c15a';
      c.beginPath(); c.arc(x, 24, 3, 0, Math.PI * 2); c.arc(x, 34, 3, 0, Math.PI * 2); c.fill();
    }
    if (s.broken) {
      const g = c.createRadialGradient(28, 8, 1, 28, 8, 22);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(28, 8, 22, 0, Math.PI * 2); c.fill();
    }
  },
};

const rumblePath = rrPath(0, 0, 56, 30, 14);
function rumble(id: string, x: number, en: string, vi: string): PartDef {
  const dir = x < 0 ? -1 : 1;
  return {
    id, name: { en, vi }, side: 'B', z: 4, x, y: 50, w: 56, h: 30, icon: '📳',
    shape: rumblePath, needs: ['bottom'], thick: 16, round: 14, mat: 'metal', body: '#8b9097',
    draw(c, s) {
      c.save();
      c.translate(-dir * 6, 0);
      cylH(c, 42, 26, '#c9ced6', '#d9b25a');
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-8, -13, 3, 26);
      c.restore();
      // eccentric weight on the shaft: a brass half moon
      c.save();
      c.translate(dir * 20, 0);
      c.rotate(s.power > 0 ? s.time * 30 : 0.4);
      c.fillStyle = '#7a5a1c';
      c.beginPath(); c.arc(0, 1.5, 11, Math.PI, 0); c.closePath(); c.fill();
      const g = c.createLinearGradient(0, -11, 0, 0);
      g.addColorStop(0, '#ffe29a'); g.addColorStop(1, '#b8862e');
      c.fillStyle = g;
      c.beginPath(); c.arc(0, 0, 11, Math.PI, 0); c.closePath(); c.fill();
      c.fillStyle = '#555'; c.beginPath(); c.arc(0, 0, 2, 0, Math.PI * 2); c.fill();
      c.restore();
      // red / black leads
      c.lineWidth = 2;
      c.strokeStyle = '#e04a3a'; c.beginPath(); c.moveTo(-dir * 26, -4); c.lineTo(-dir * 28, -12); c.stroke();
      c.strokeStyle = '#222'; c.beginPath(); c.moveTo(-dir * 26, 4); c.lineTo(-dir * 28, 12); c.stroke();
      if (s.broken) {
        c.fillStyle = 'rgba(30,20,15,0.7)';
        c.beginPath(); c.ellipse(-dir * 8, 2, 12, 8, 0.3, 0, Math.PI * 2); c.fill();
      }
    },
  };
}

const cablePath = rrPath(0, 0, 34, 46, 8);
const cable: PartDef = {
  id: 'cable', name: { en: 'Cable & Strain Relief', vi: 'Dây cáp & chốt chống gãy' }, side: 'B', z: 4, x: 0, y: -52, w: 34, h: 46, icon: '🔌',
  shape: cablePath, needs: ['bottom'], thick: 10, round: 6, mat: 'rubber', body: '#2e2b38',
  draw(c, s) {
    // cord running off the top edge
    const g = c.createLinearGradient(-6, 0, 6, 0);
    g.addColorStop(0, '#2e2b38'); g.addColorStop(0.4, '#6a6478'); g.addColorStop(1, '#1d1b24');
    c.fillStyle = g; c.fillRect(-6, -23, 12, 22);
    // ribbed strain relief boot
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -2, 8, 26, 22, 6); c.fill();
    c.fillStyle = '#3a3646'; c.beginPath(); rrc(c, 0, 4, 26, 22, 6); c.fill();
    c.strokeStyle = '#5c566c'; c.lineWidth = 2;
    for (let y = -4; y < 14; y += 5) { c.beginPath(); c.moveTo(-11, y); c.lineTo(11, y); c.stroke(); }
    // four coloured wires to the board
    ['#e04a3a', '#f5f5f5', '#3fbf6a', '#222'].forEach((col, i) => {
      c.strokeStyle = col; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-6 + i * 4, 14); c.lineTo(-6 + i * 4, 22); c.stroke();
    });
    if (s.broken) {
      // frayed: copper strands poking out of a split jacket
      c.strokeStyle = '#e39a4a'; c.lineWidth = 1;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(0, -12); c.lineTo(-8 + i * 4, -20 + (i % 2) * 3); c.stroke(); }
    }
  },
};

export const gamepad: DeviceDef = {
  id: 'gamepad',
  name: { en: 'Retro Game Pad', vi: 'Tay cầm chơi game' },
  w: 280, h: 160,
  hasBack: true,
  parts: [
    top, shoulder('shoulderL', -88, 'Left Shoulder Button', 'Nút vai trái', 'L'), shoulder('shoulderR', 88, 'Right Shoulder Button', 'Nút vai phải', 'R'),
    bottom, membrane, board, rumble('rumbleL', -104, 'Left Rumble Motor', 'Mô-tơ rung trái'), rumble('rumbleR', 104, 'Right Rumble Motor', 'Mô-tơ rung phải'), cable,
    screw('g1', -110, -46, 'B'), screw('g2', 110, -46, 'B'), screw('g3', -100, 62, 'B'), screw('g4', 100, 62, 'B'),
    screw('g5', 0, 0, 'B', 4, ['bottom']),
  ],
  working(c, t, k) {
    c.save();
    // a happy little shake: rumble rings around both grips
    for (const x of [-100, 100]) {
      const r = 30 + ((t * 60) % 40);
      c.globalAlpha = k * (1 - (r - 30) / 40) * 0.6;
      c.strokeStyle = '#ffd36b'; c.lineWidth = 3;
      c.beginPath(); c.arc(x, 40, r, 0, Math.PI * 2); c.stroke();
    }
    c.globalAlpha = k * 0.4;
    const g = c.createRadialGradient(0, -40, 2, 0, -40, 30);
    g.addColorStop(0, 'rgba(120,255,160,0.8)'); g.addColorStop(1, 'rgba(120,255,160,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, -40, 30, 0, Math.PI * 2); c.fill();
    c.restore();
  },
  workFx: { kind: 'spark', x: 0, y: -70, color: '#ffd36b', dir: -Math.PI / 2 },
};
