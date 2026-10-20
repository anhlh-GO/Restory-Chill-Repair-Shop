// Sturdy retro angle-head flashlight lying on the mat: olive tube, brass trim, the lens looking straight up.

import { slab, shade, rrc, rrPath, ellPath, glossStreak, text, shapeFrom, roundedPts, rrPts, ellPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, cylH, boss } from './kit';

const OLIVE = '#6f7d3c';
const OLIVE_D = '#5d6a31';
const BRASS = '#d9a443';
const RUBBER = '#2e2f2a';

const LENS = { x: 100, y: 0 };

// Long tube (x -130..46) joined to the square head (x 46..150).
function bodyPts(inset = 0) {
  const k = inset;
  return roundedPts([
    [-130 + k, -28 + k, 24 - k * 0.6], [46 + k, -28 + k, 6], [46 + k, -50 + k, 12 - k * 0.5], [150 - k, -50 + k, 20 - k * 0.6],
    [150 - k, 50 - k, 20 - k * 0.6], [46 + k, 50 - k, 12 - k * 0.5], [46 + k, 28 - k, 6], [-130 + k, 28 - k, 24 - k * 0.6],
  ]);
}
const BODY = shapeFrom(bodyPts());
const BODY_IN = shapeFrom(bodyPts(8));

const shell: PartDef = {
  id: 'shell', name: { en: 'Flashlight Body', vi: 'Thân đèn' }, side: 'A', z: 0, x: 0, y: 0, w: 280, h: 100, icon: '🔦',
  shape: BODY, needs: ['batA', 'batB', 'spring', 'led'], thick: 30, cavity: 18, round: 26, wall: 8,
  draw(c) {
    slab(c, BODY, OLIVE_D, -50, 50, { depth: 10, shadow: 0 });
    c.fillStyle = shade(OLIVE_D, -0.35);
    c.fill(BODY_IN);
    c.save(); c.clip(BODY_IN);
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 10; c.translate(3, 5); c.stroke(BODY_IN);
    c.restore();
    // brass contact strip running the length of the tube, from the tail spring to the lamp
    const g = c.createLinearGradient(0, 14, 0, 20);
    g.addColorStop(0, shade(BRASS, 0.4)); g.addColorStop(1, shade(BRASS, -0.3));
    c.fillStyle = g; c.fillRect(-122, 15, 196, 5);
    // lamp socket well in the head
    c.fillStyle = shade(OLIVE_D, -0.55); c.beginPath(); c.arc(LENS.x, LENS.y, 34, 0, Math.PI * 2); c.fill();
    boss(c, 60, -38, OLIVE_D); boss(c, 136, 38, OLIVE_D);
  },
};

const springPath = rrPath(0, 0, 20, 36, 6);
const spring: PartDef = {
  id: 'spring', name: { en: 'Spring & Contact', vi: 'Lò xo' }, side: 'A', z: 3, x: -119, y: 0, w: 20, h: 36, icon: '🌀',
  shape: springPath, needs: ['cap', 'cover'], thick: 26, round: 9, mat: 'metal', body: '#9aa1a8',
  draw(c, s) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -2, 4, 20, 36, 6); c.fill();
    // brass base plate + a fat steel coil seen side-on
    c.fillStyle = shade(BRASS, -0.15); c.fillRect(-10, -17, 4, 34);
    c.lineWidth = 2.4; c.lineCap = 'round';
    const loose = s.broken;
    for (let i = 0; i < 6; i++) {
      const x = -5 + i * (loose ? 3.4 : 2.6);
      c.strokeStyle = 'rgba(0,0,0,0.3)';
      c.beginPath(); c.moveTo(x + 1, -14); c.lineTo(x + 3.5, 15); c.stroke();
      c.strokeStyle = i % 2 ? '#e6e9ee' : '#c4c9d0';
      c.beginPath(); c.moveTo(x, -15); c.lineTo(x + 2.5, 14); c.stroke();
    }
    // brass tab where the long contact strip is riveted on
    c.fillStyle = BRASS; c.fillRect(-4, 14, 14, 5);
    c.fillStyle = shade(BRASS, -0.4); c.beginPath(); c.arc(6, 16.5, 1.5, 0, Math.PI * 2); c.fill();
    if (loose) {
      // rusty, sagging and the tab snapped loose
      c.fillStyle = 'rgba(170,90,40,0.75)';
      for (const [x, y, r] of [[2, -8, 3.5], [8, 4, 3], [-2, 8, 2.5]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = '#2a2a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(3, 13); c.lineTo(7, 20); c.stroke();
    }
  },
};

const batPath = rrPath(0, 0, 82, 40, 18);
function cell(id: string, x: number, color: string): PartDef {
  return {
    id, name: { en: 'D Battery', vi: 'Pin đại' }, side: 'A', z: 3, x, y: 0, w: 82, h: 40, icon: '🔋',
    shape: batPath, needs: id === 'batA' ? ['cover', 'cap'] : ['cover'], thick: 40, round: 20, body: shade(color, -0.3),
    draw(c, s) {
      cylH(c, 78, 38, color, '#c9ccd2');
      // gold top band + label, + nub pointing at the head
      c.fillStyle = '#e8c15a'; c.fillRect(14, -19, 18, 38);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(14, -19, 1.5, 38);
      text(c, 'D', -8, 0, 18, '#ffffff', { font: 'bold' });
      text(c, '1.5V', -8, 13, 7, 'rgba(255,255,255,0.8)', { font: 'bold' });
      c.fillStyle = '#c9ccd2'; c.beginPath(); rrc(c, 41, 0, 5, 12, 2); c.fill();
      if (s.broken) {
        // leaking: white crust round the + end, a brown drip
        c.fillStyle = 'rgba(235,240,232,0.92)';
        for (const [dx, dy, r] of [[36, -10, 5], [38, 6, 6], [32, 14, 3.5], [40, -2, 3]]) { c.beginPath(); c.arc(dx, dy, r, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = 'rgba(120,80,30,0.6)'; c.beginPath(); c.ellipse(24, 16, 6, 3, 0.3, 0, Math.PI * 2); c.fill();
      }
    },
  };
}

const ledPath = ellPath(0, 0, 30, 30);
const led: PartDef = {
  id: 'led', name: { en: 'LED Board', vi: 'Bo đèn LED' }, side: 'A', z: 3, x: LENS.x, y: LENS.y, w: 60, h: 60, icon: '💡',
  shape: ledPath, needs: ['reflector'], elev: 14, thick: 4, mat: 'pcb', body: '#1d5c37',
  draw(c, s) {
    c.save();
    c.beginPath(); c.arc(0, 0, 30, 0, Math.PI * 2); c.clip();
    pcb(c, 64, 64, 515);
    c.restore();
    c.strokeStyle = '#1d5c37'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, 29.5, 0, Math.PI * 2); c.stroke();
    // the big LED: a yellow phosphor square on a white star
    c.fillStyle = '#f2f2ee'; c.beginPath(); rrc(c, 0, 0, 16, 16, 3); c.fill();
    c.fillStyle = s.power > 0 ? '#fffbe0' : '#f2d36a'; c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 2); c.fill();
    // + / − pads for the battery leads
    c.fillStyle = '#e8c15a';
    for (const [x, y] of [[-20, -12], [-20, 12]]) { c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill(); }
    if (s.broken) {
      const g = c.createRadialGradient(14, 10, 1, 14, 10, 13);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(14, 10, 13, 0, Math.PI * 2); c.fill();
    }
  },
};

const reflPath = ellPath(0, 0, 40, 40);
const reflector: PartDef = {
  id: 'reflector', name: { en: 'Reflector', vi: 'Chóa đèn' }, side: 'A', z: 4, x: LENS.x, y: LENS.y, w: 80, h: 80, icon: '🥣',
  shape: reflPath, needs: ['lens'], elev: 20, thick: 20, round: 4, mat: 'metal', body: '#9aa1a8',
  draw(c, s) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); c.arc(-3, 5, 40, 0, Math.PI * 2); c.fill();
    // a polished bowl: bright rings stepping down to the lamp hole
    for (let i = 0; i < 6; i++) {
      const r = 40 - i * 6;
      const g = c.createRadialGradient(-r * 0.4, -r * 0.4, 1, 0, 0, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, i % 2 ? '#d5dae0' : '#b9bfc8'); g.addColorStop(1, '#8b9097');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#3a3d42'; c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.fill();
    c.fillStyle = s.power > 0 ? '#fffbe0' : '#f2d36a'; c.beginPath(); c.arc(0, 0, 4.5, 0, Math.PI * 2); c.fill();
    if (s.power > 0) {
      const g = c.createRadialGradient(0, 0, 2, 0, 0, 40);
      g.addColorStop(0, `rgba(255,250,215,${0.9 * s.power})`); g.addColorStop(1, 'rgba(255,240,190,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); c.fill();
    }
    if (s.broken) {
      // tarnished, blotchy silvering
      c.fillStyle = 'rgba(110,90,60,0.45)';
      for (const [x, y, r] of [[-18, 10, 9], [14, -20, 7], [22, 14, 6], [-8, -24, 5]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
    }
  },
};

const lensPath = ellPath(0, 0, 38, 38);
const lens: PartDef = {
  id: 'lens', name: { en: 'Lens', vi: 'Mặt kính' }, side: 'A', z: 5, x: LENS.x, y: LENS.y, w: 76, h: 76, icon: '🔵',
  shape: lensPath, needs: ['head'], elev: 44, thick: 4, round: 2, mat: 'glass', body: '#b9d6e0',
  draw(c, s) {
    if (s.inDevice) {
      // clear glass: show the reflector bowl underneath
      for (let i = 0; i < 6; i++) {
        const r = 38 - i * 6;
        c.fillStyle = i % 2 ? '#d5dae0' : '#b9bfc8'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = '#3a3d42'; c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f2d36a'; c.beginPath(); c.arc(0, 0, 4.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(190,225,240,0.22)';
    } else c.fillStyle = 'rgba(205,232,245,0.9)';
    c.beginPath(); c.arc(0, 0, 38, 0, Math.PI * 2); c.fill();
    if (s.power > 0) {
      const g = c.createRadialGradient(0, 0, 2, 0, 0, 38);
      g.addColorStop(0, `rgba(255,255,240,${s.power})`); g.addColorStop(0.7, `rgba(255,246,200,${0.75 * s.power})`); g.addColorStop(1, `rgba(255,236,170,${0.4 * s.power})`);
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 38, 0, Math.PI * 2); c.fill();
    }
    // a slightly domed lens: two highlights
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.beginPath(); c.ellipse(-14, -16, 12, 5, -0.7, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.beginPath(); c.arc(16, 15, 4, 0, Math.PI * 2); c.fill();
    if (s.broken) {
      // scratched protective film with a lifted edge
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 0.9;
      for (const [x0, y0, x1, y1] of [[-26, -10, 20, 22], [-10, -30, 28, -4], [-30, 12, -4, 30], [6, -20, 30, 12], [-20, 20, 10, 2]]) {
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
      c.fillStyle = 'rgba(255,255,255,0.65)';
      c.beginPath(); c.moveTo(26, -27); c.lineTo(33, -18); c.lineTo(22, -22); c.closePath(); c.fill();
    }
  },
};

const headPath = shapeFrom(rrPts(0, 0, 104, 100, 20), [ellPts(2, 0, 34, 34, 48)]);
const head: PartDef = {
  id: 'head', name: { en: 'Lamp Head', vi: 'Đầu đèn' }, side: 'A', z: 6, x: 98, y: 0, w: 104, h: 100, icon: '🔦',
  shape: headPath, needs: ['f3', 'f4'], tool: 'brush', elev: 30, thick: 22, round: 14,
  draw(c, s) {
    slab(c, headPath, OLIVE, -50, 50, { depth: 6, shadow: 0 });
    glossStreak(c, headPath, -52, -50, 104, 60, 0.25);
    // brass bezel ring round the lens window
    c.lineWidth = 6; c.strokeStyle = BRASS;
    c.beginPath(); c.arc(2, 0, 37, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1.2; c.strokeStyle = shade(BRASS, 0.45);
    c.beginPath(); c.arc(2, -1, 37, Math.PI * 1.05, Math.PI * 1.8); c.stroke();
    c.strokeStyle = shade(BRASS, -0.4); c.lineWidth = 1;
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      c.beginPath(); c.moveTo(2 + Math.cos(a) * 35, Math.sin(a) * 35); c.lineTo(2 + Math.cos(a) * 39.5, Math.sin(a) * 39.5); c.stroke();
    }
    // stamped rivets + a little hook for the belt clip
    c.fillStyle = shade(OLIVE, 0.25);
    for (const [x, y] of [[-40, 38], [44, -38]]) { c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill(); }
    if (s.broken) {
      c.strokeStyle = 'rgba(40,40,30,0.7)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(42, 20); c.lineTo(48, 30); c.lineTo(44, 40); c.stroke();
    }
  },
};

const coverPath = rrPath(0, 0, 176, 56, 24);
const SWITCH_X = 66;
const cover: PartDef = {
  id: 'cover', name: { en: 'Tube Cover', vi: 'Vỏ ống' }, side: 'A', z: 6, x: -42, y: 0, w: 176, h: 56, icon: '🟩',
  shape: coverPath, needs: ['f1', 'f2'], tool: 'sponge', elev: 30, thick: 28, round: 28,
  bumps: [{ kind: 'cyl', x: SWITCH_X, y: 0, w: 20, height: 6, color: RUBBER }],
  draw(c, s) {
    slab(c, coverPath, OLIVE, -28, 28, { depth: 6, shadow: 0 });
    c.save(); c.clip(coverPath);
    // tube shading: a long highlight along the top
    const g = c.createLinearGradient(0, -28, 0, 28);
    g.addColorStop(0, 'rgba(0,0,0,0.12)'); g.addColorStop(0.35, 'rgba(255,255,255,0.28)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
    c.fillStyle = g; c.fillRect(-88, -28, 176, 56);
    // diamond-knurled grip
    c.strokeStyle = 'rgba(40,50,20,0.45)'; c.lineWidth = 1;
    for (let x = -78; x < -14; x += 5) {
      c.beginPath(); c.moveTo(x, -28); c.lineTo(x + 24, 28); c.stroke();
      c.beginPath(); c.moveTo(x + 24, -28); c.lineTo(x, 28); c.stroke();
    }
    // brass trim bands
    c.fillStyle = BRASS;
    for (const x of [-84, -12, 84]) c.fillRect(x - 2, -28, 4, 56);
    c.restore();
    // rubber switch boot on its little saddle
    c.fillStyle = shade(OLIVE, -0.25); c.beginPath(); rrc(c, SWITCH_X, 0, 30, 30, 8); c.fill();
    const sg = c.createRadialGradient(SWITCH_X - 3, -4, 1, SWITCH_X, 0, 10);
    sg.addColorStop(0, '#5a5c52'); sg.addColorStop(1, RUBBER);
    c.fillStyle = sg; c.beginPath(); c.arc(SWITCH_X, 0, 10, 0, Math.PI * 2); c.fill();
    text(c, 'CHILL·LITE', 30, 0, 9, shade(OLIVE, 0.55), { font: 'bold' });
    if (s.power > 0) {
      c.fillStyle = 'rgba(255,240,180,0.6)'; c.beginPath(); c.arc(SWITCH_X, 0, 4, 0, Math.PI * 2); c.fill();
    }
    if (s.broken) {
      c.strokeStyle = 'rgba(30,35,15,0.8)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(SWITCH_X - 8, -6); c.lineTo(SWITCH_X, 2); c.lineTo(SWITCH_X + 7, -5); c.stroke();
    }
  },
};

const capPath = rrPath(0, 0, 22, 60, 8);
const cap: PartDef = {
  id: 'cap', name: { en: 'End Cap', vi: 'Nắp đuôi' }, side: 'A', z: 7, x: -140, y: 0, w: 22, h: 60, icon: '⚫',
  shape: capPath, elev: 2, thick: 54, round: 10, mat: 'metal', body: shade(BRASS, -0.35),
  draw(c, s) {
    slab(c, capPath, BRASS, -30, 30, { depth: 4, shadow: 0 });
    // knurled ridges
    c.strokeStyle = shade(BRASS, -0.4); c.lineWidth = 1;
    for (let y = -26; y <= 26; y += 3.5) { c.beginPath(); c.moveTo(-9, y); c.lineTo(9, y); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(-9, -26, 3, 52);
    // lanyard ring
    c.strokeStyle = '#9aa1a8'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(-14, 0, 5, Math.PI * 0.5, Math.PI * 1.5); c.stroke();
    if (s.broken) {
      c.fillStyle = 'rgba(80,110,60,0.6)'; c.beginPath(); c.ellipse(3, 10, 6, 9, 0, 0, Math.PI * 2); c.fill();
    }
  },
};

export const flashlight: DeviceDef = {
  id: 'flashlight',
  name: { en: 'Scout Flashlight', vi: 'Đèn pin' },
  w: 304, h: 104,
  hasBack: false,
  parts: [
    shell, spring, cell('batA', -70, '#e05a3a'), cell('batB', 14, '#3a7be0'), led, reflector, lens, head, cover, cap,
    screw('f1', -104, 0, 'A'), screw('f2', -30, 0, 'A'), screw('f3', 60, -38, 'A'), screw('f4', 136, 38, 'A'),
  ],
  working(c, t, k) {
    c.save();
    // the beam comes straight up at us: a warm halo with slowly turning rays
    c.globalAlpha = k;
    const g = c.createRadialGradient(LENS.x, LENS.y, 20, LENS.x, LENS.y, 130);
    g.addColorStop(0, 'rgba(255,250,215,0.85)'); g.addColorStop(0.4, 'rgba(255,236,170,0.35)'); g.addColorStop(1, 'rgba(255,236,170,0)');
    c.fillStyle = g; c.beginPath(); c.arc(LENS.x, LENS.y, 130, 0, Math.PI * 2); c.fill();
    c.translate(LENS.x, LENS.y); c.rotate(t * 0.3);
    c.fillStyle = 'rgba(255,248,210,0.22)';
    for (let i = 0; i < 8; i++) {
      c.rotate(Math.PI / 4);
      c.beginPath(); c.moveTo(-6, 40); c.lineTo(6, 40); c.lineTo(18, 120 + Math.sin(t * 3 + i) * 10); c.lineTo(-18, 120 + Math.sin(t * 3 + i) * 10); c.closePath(); c.fill();
    }
    c.restore();
  },
  workFx: { kind: 'flash', x: LENS.x, y: LENS.y, color: '#fff6d0', dir: -Math.PI / 2 },
};
