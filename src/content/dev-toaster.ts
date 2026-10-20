// Two-slot toaster seen from above: pastel pink shell, chrome trim, side lever, crumb tray. One face.

import { slab, shade, rrc, rrPath, ellPath, glossStreak, text, shapeFrom, roundedPts, rrPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, coil, boss } from './kit';

const PINK = '#f4a3b6';
const PINK_D = '#e38ea3';
const CHROME = '#d9dde3';
const CREAM = '#fbf1dc';
const INK = '#3a3640';
const MINT = '#7fd1c1';
const TOAST = '#e9b46a';

// Box 264 × 168; the slots run along x, left of the control panel on the right end.
const BW = 264, BH = 168;
const SLOT_X = -16, SLOT_W = 176, SLOT_H = 22;
const SLOTS = [-28, 28];
const PANEL_X = 104;
const KNOB = { x: PANEL_X, y: 30 };
const SCREWS: [number, number][] = [[-112, -62], [116, -62], [-112, 62], [116, 62]];

const BOX = rrPath(0, 0, BW, BH, 34);
const BOX_IN = rrPath(0, 0, BW - 20, BH - 20, 26);

const chassis: PartDef = {
  id: 'chassis', name: { en: 'Chassis', vi: 'Khung đáy' }, side: 'A', z: 0, x: 0, y: 0, w: BW, h: BH, icon: '🍞',
  shape: BOX, needs: ['tray', 'timer'], thick: 62, cavity: 54, round: 16, wall: 10, body: PINK_D,
  draw(c) {
    slab(c, BOX, PINK, -BH / 2, BH / 2, { depth: 12, shadow: 0 });
    c.fillStyle = shade(PINK, -0.45);
    c.fill(BOX_IN);
    c.save(); c.clip(BOX_IN);
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 14; c.translate(3, 5); c.stroke(BOX_IN);
    c.restore();
    // reflective heat shield on the floor, wiring channel to the panel
    c.fillStyle = 'rgba(230,234,240,0.35)';
    c.beginPath(); rrc(c, SLOT_X, 0, 200, 112, 10); c.fill();
    c.strokeStyle = shade(PINK, -0.6); c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(86, -40); c.lineTo(86, 40); c.stroke();
    for (const [x, y] of SCREWS) boss(c, x, y, PINK);
  },
};

// ---- crumb tray: slides out of the front, under the element cage ----

const TRAY_C = { x: SLOT_X, y: 4 };
const TRAY = shapeFrom(roundedPts([
  [-104, -56, 8], [104, -56, 8], [104, 56, 8], [34, 56, 3], [34, 92, 8], [-34, 92, 8], [-34, 56, 3], [-104, 56, 8],
]));
const tray: PartDef = {
  id: 'tray', name: { en: 'Crumb Tray', vi: 'Khay vụn bánh' }, side: 'A', z: 2, x: TRAY_C.x, y: TRAY_C.y, w: 208, h: 148, icon: '🥖',
  shape: TRAY, needs: ['element'], tool: 'brush', elev: 8, thick: 4, round: 2, mat: 'metal', body: '#9aa0a8',
  draw(c, s) {
    const g = c.createLinearGradient(-104, -56, 104, 92);
    g.addColorStop(0, '#f4f6f9'); g.addColorStop(0.5, '#c9ced6'); g.addColorStop(1, '#9aa0a8');
    c.fillStyle = g; c.fill(TRAY);
    // pressed rim + the pink pull tab with a finger notch
    c.strokeStyle = 'rgba(80,90,100,0.4)'; c.lineWidth = 2;
    c.beginPath(); rrc(c, 0, 0, 196, 100, 6); c.stroke();
    c.fillStyle = PINK; c.beginPath(); rrc(c, 0, 78, 64, 26, 7); c.fill();
    c.fillStyle = shade(PINK, -0.35); c.beginPath(); rrc(c, 0, 82, 30, 7, 3.5); c.fill();
    // a few crumbs always live here
    c.fillStyle = '#c48a4a';
    for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(-80 + i * 22, -30 + ((i * 29) % 60), 1.6, 0, Math.PI * 2); c.fill(); }
    if (s.broken) {
      // a burnt drift of crumbs and a toast crust, piled into the corners
      for (let i = 0; i < 70; i++) {
        const x = -90 + ((i * 53) % 180), y = -44 + ((i * 31) % 88);
        c.fillStyle = i % 3 ? '#b8783a' : '#5a3418';
        c.beginPath(); c.ellipse(x, y, 2 + (i % 4), 1.4 + (i % 3), i, 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = '#7a4a22'; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(30, 20); c.quadraticCurveTo(52, 6, 70, 22); c.stroke();
    }
  },
};

// ---- the element cage: two slots of mica and nichrome ----

const ELEM = rrPath(0, 0, 196, 112, 10);
const element: PartDef = {
  id: 'element', name: { en: 'Heating Elements', vi: 'Thanh nhiệt' }, side: 'A', z: 3, x: SLOT_X, y: 0, w: 196, h: 112, icon: '🔥',
  shape: ELEM, needs: ['shell'], elev: 12, thick: 44, round: 4, mat: 'metal', body: '#8b9097',
  draw(c, s) {
    const g = c.createLinearGradient(0, -56, 0, 56);
    g.addColorStop(0, '#eef0f3'); g.addColorStop(0.5, '#b9bec6'); g.addColorStop(1, '#8b9097');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 196, 112, 10); c.fill();
    for (const y of SLOTS) {
      // the dark well of the slot, mica walls and a zigzag of wire each side
      c.fillStyle = '#2b2226'; c.beginPath(); rrc(c, 0, y, SLOT_W + 4, SLOT_H + 8, 8); c.fill();
      c.fillStyle = '#b89a6a'; c.fillRect(-SLOT_W / 2, y - 11, SLOT_W, 3); c.fillRect(-SLOT_W / 2, y + 8, SLOT_W, 3);
      const hot = s.power > 0;
      c.strokeStyle = hot ? `rgba(255,${120 + 40 * Math.sin(s.time * 5)},40,1)` : '#c9b9a0';
      c.lineWidth = hot ? 1.8 : 1.3;
      for (const side of [-1, 1]) {
        c.beginPath();
        for (let x = -84; x <= 84; x += 6) {
          if (s.broken && y > 0 && side > 0 && x > 10 && x < 26) { c.stroke(); c.beginPath(); continue; }
          c.lineTo(x, y + side * 6 + ((x / 6) % 2 === 0 ? -2 : 2));
        }
        c.stroke();
      }
      if (hot) {
        c.fillStyle = `rgba(255,120,40,${0.25 * s.power})`;
        c.beginPath(); rrc(c, 0, y, SLOT_W, SLOT_H, 8); c.fill();
      }
    }
    // terminal posts with the leads at the panel end
    for (const [y, col] of [[-46, '#e04a3a'], [46, '#3d7fd8']] as const) {
      c.fillStyle = '#e8c15a'; c.beginPath(); c.arc(90, y, 4, 0, Math.PI * 2); c.fill();
      c.strokeStyle = col; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(90, y); c.lineTo(97, y * 0.7); c.stroke();
    }
    if (s.broken) {
      // snapped wire curling up, soot round the break
      c.strokeStyle = '#c9b9a0'; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(10, 36); c.quadraticCurveTo(16, 46, 22, 40); c.stroke();
      const sg = c.createRadialGradient(18, 34, 1, 18, 34, 18);
      sg.addColorStop(0, 'rgba(20,12,8,0.8)'); sg.addColorStop(1, 'rgba(20,12,8,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(18, 34, 18, 0, Math.PI * 2); c.fill();
    }
  },
};

// ---- timer board under the control panel ----

const TIMER = { x: PANEL_X, y: 0 };
const timerPath = rrPath(0, 0, 32, 124, 6);
const timer: PartDef = {
  id: 'timer', name: { en: 'Timer Board', vi: 'Bo hẹn giờ' }, side: 'A', z: 3, x: TIMER.x, y: TIMER.y, w: 32, h: 124, icon: '🟩',
  shape: timerPath, needs: ['t5'], elev: 8, thick: 4, mat: 'pcb', body: '#1d5c37',
  bumps: [
    { kind: 'cyl', x: 0, y: KNOB.y, w: 24, height: 14, color: '#c9ced6', metal: true },
    { kind: 'box', x: 0, y: -34, w: 20, h: 24, height: 12, color: '#b8783a' },
  ],
  draw(c, s) {
    pcb(c, 32, 124, 64);
    // clockwork can under the knob + the hold-down electromagnet
    c.fillStyle = '#c9ced6'; c.beginPath(); c.arc(0, KNOB.y, 12, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7a8088'; c.beginPath(); c.arc(0, KNOB.y, 3, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(0, -34); coil(c, 20, 24); c.restore();
    if (s.broken) {
      const g = c.createRadialGradient(2, 2, 1, 2, 2, 14);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(2, 2, 14, 0, Math.PI * 2); c.fill();
    }
  },
};

// ---- top shell: two real slot holes, chrome trim, the control panel ----

const SHELL = shapeFrom(rrPts(0, 0, BW - 6, BH - 6, 31), SLOTS.map((y) => rrPts(SLOT_X, y, SLOT_W, SLOT_H, 10)));
const shell: PartDef = {
  id: 'shell', name: { en: 'Top Shell', vi: 'Vỏ máy' }, side: 'A', z: 6, x: 0, y: 0, w: BW - 6, h: BH - 6, icon: '🩷',
  shape: SHELL, needs: ['t1', 't2', 't3', 't4', 'knob', 'lever'], tool: 'sponge', thick: 12, round: 10, body: PINK_D,
  bumps: [
    { kind: 'cyl', x: PANEL_X, y: -16, w: 14, height: 4, color: '#ef5a4c' },
    { kind: 'box', x: PANEL_X - 20, y: -52, w: 10, h: 10, height: 2, color: MINT },
  ],
  draw(c, s) {
    slab(c, SHELL, PINK, -BH / 2, BH / 2, { depth: 10, shadow: 0 });
    glossStreak(c, SHELL, -BW / 2, -BH / 2, BW, BH, 0.3);
    // chrome bezels round the slots
    for (const y of SLOTS) {
      c.strokeStyle = CHROME; c.lineWidth = 7;
      c.beginPath(); rrc(c, SLOT_X, y, SLOT_W + 6, SLOT_H + 6, 13); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5;
      c.beginPath(); rrc(c, SLOT_X, y - 1, SLOT_W + 9, SLOT_H + 9, 14); c.stroke();
    }
    // cream control panel with the browning scale
    c.fillStyle = CREAM; c.beginPath(); rrc(c, PANEL_X, 0, 38, 136, 14); c.fill();
    c.fillStyle = shade(PINK, -0.5);
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * 0.8 + (i / 5) * Math.PI * 1.4;
      c.beginPath(); c.arc(KNOB.x + Math.cos(a) * 21, KNOB.y + Math.sin(a) * 21, 1.2 + i * 0.35, 0, Math.PI * 2); c.fill();
    }
    text(c, 'STOP', PANEL_X, -2, 6, shade(PINK, -0.5), { font: 'bold' });
    text(c, 'BAGEL', PANEL_X - 2, -52, 5, shade(PINK, -0.5), { font: 'bold' });
    // little toast badge
    text(c, 'CHILL·TOAST', SLOT_X, 0, 9, shade(PINK, -0.42), { font: 'bold' });
    // bagel light
    if (s.power > 0) {
      c.fillStyle = `rgba(150,255,210,${0.5 + 0.5 * Math.sin(s.time * 5)})`;
      c.beginPath(); c.arc(PANEL_X - 20, -52, 6, 0, Math.PI * 2); c.fill();
    }
  },
};

// ---- browning knob on the panel, push lever on the side ----

const KNOB_P = ellPath(0, 0, 15, 15);
const knob: PartDef = {
  id: 'knob', name: { en: 'Timer Knob', vi: 'Núm hẹn giờ' }, side: 'A', z: 8, x: KNOB.x, y: KNOB.y, w: 30, h: 30, icon: '🔘',
  shape: KNOB_P, thick: 12, round: 5, body: shade(CREAM, -0.3),
  bumps: [{ kind: 'box', x: 0, y: 0, w: 6, h: 22, height: 4, color: CREAM }],
  draw(c, s) {
    const g = c.createRadialGradient(-5, -6, 1, 0, 0, 15);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, CREAM); g.addColorStop(1, shade(CREAM, -0.25));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 15, 0, Math.PI * 2); c.fill();
    c.strokeStyle = shade(CREAM, -0.3); c.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      c.beginPath(); c.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); c.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); c.stroke();
    }
    // pointer: turns back to zero as the timer runs
    c.save();
    c.rotate(s.power > 0 ? -0.6 + s.time * 0.4 : -0.6);
    c.fillStyle = '#ef5a4c'; c.beginPath(); rrc(c, 0, -8, 3, 9, 1.5); c.fill();
    c.restore();
  },
};

const LEVER_P = rrPath(0, 0, 30, 20, 9);
const lever: PartDef = {
  id: 'lever', name: { en: 'Push Lever', vi: 'Cần gạt' }, side: 'A', z: 7, x: BW / 2 + 10, y: -34, w: 30, h: 20, icon: '🎚',
  shape: LEVER_P, elev: 24, thick: 16, round: 8, body: '#2b2730',
  draw(c, s) {
    const g = c.createLinearGradient(0, -10, 0, 10);
    g.addColorStop(0, '#6a6470'); g.addColorStop(0.4, INK); g.addColorStop(1, '#1d1b22');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 30, 20, 9); c.fill();
    // chrome stem going into the side slot
    c.fillStyle = CHROME; c.beginPath(); rrc(c, -12, 0, 8, 8, 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); rrc(c, 2, -5, 18, 3, 1.5); c.fill();
    if (s.power > 0) {
      // pressed down: a soft glow means it is latched
      c.fillStyle = 'rgba(255,170,80,0.35)'; c.beginPath(); rrc(c, 0, 0, 30, 20, 9); c.fill();
    }
  },
};

export const toaster: DeviceDef = {
  id: 'toaster',
  name: { en: 'Two-Slot Toaster', vi: 'Máy nướng bánh mì' },
  w: 300, h: 200,
  hasBack: false,
  parts: [
    element, chassis, tray, timer, shell, knob, lever,
    ...SCREWS.map(([x, y], i) => screw(`t${i + 1}`, x, y, 'A')),
    { ...screw('t5', TIMER.x, -58, 'A', 4, ['shell']), elev: 12 },
  ],
  working(c, t, k) {
    c.save();
    const ph = (t * 0.35) % 1;
    for (const y of SLOTS) {
      if (ph < 0.6) {
        // orange glow breathing out of the slots
        c.globalAlpha = k * (0.55 + 0.25 * Math.sin(t * 6));
        const g = c.createRadialGradient(SLOT_X, y, 4, SLOT_X, y, 100);
        g.addColorStop(0, 'rgba(255,150,60,0.9)'); g.addColorStop(1, 'rgba(255,120,40,0)');
        c.fillStyle = g;
        c.beginPath(); c.ellipse(SLOT_X, y, 104, 22, 0, 0, Math.PI * 2); c.fill();
      } else {
        // pop! two golden slices rise out of the slots
        const up = Math.min(1, (ph - 0.6) / 0.12);
        c.globalAlpha = k;
        c.save();
        c.translate(SLOT_X, y - up * 6);
        c.scale(1 + up * 0.05, 1);
        c.fillStyle = shade(TOAST, -0.35); c.beginPath(); rrc(c, 0, 0, SLOT_W - 24, 16, 6); c.fill();
        c.fillStyle = TOAST; c.beginPath(); rrc(c, 0, -1, SLOT_W - 34, 10, 4); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); rrc(c, -20, -3, 90, 2.5, 1.2); c.fill();
        c.restore();
      }
    }
    c.restore();
  },
  workFx: { kind: 'steam', x: SLOT_X, y: 0, color: '#fff3e0', dir: -Math.PI / 2 },
};
