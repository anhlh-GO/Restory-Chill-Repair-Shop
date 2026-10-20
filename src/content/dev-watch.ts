// Chunky round smartwatch with its coral strap laid out straight. Two faces.

import { type C, slab, shade, rrc, rrPath, ellPath, glossStreak, text, shapeFrom, type Pts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, boss } from './kit';

const CASE = '#3b3f58';
const STEEL = '#c9ced6';
const STRAP = '#ff8fa3';
const OLED = '#101418';
const GOLD = '#e8c15a';
const MINT = '#5fd3a8';
const SKY = '#6cb8ff';

// The case sits a touch above the device centre so the longer tail strap fits.
const CY = -8;
const R = 56;
const SCR_R = 47;
const LUGS = [Math.PI / 2 - 0.4, Math.PI / 2 + 0.4, -Math.PI / 2 - 0.4, -Math.PI / 2 + 0.4];

// Round case with four lugs the strap pins go through.
function casePts(): Pts {
  const out: Pts = [];
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    let r = R;
    for (const l of LUGS) {
      let d = Math.abs(a - l) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      r += 13 * Math.exp(-((d / 0.13) ** 2));
    }
    out.push([Math.cos(a) * r, CY + Math.sin(a) * r]);
  }
  return out;
}

const BODY = shapeFrom(casePts());
const BODY_IN = ellPath(0, CY, 45, 45);
// Back plate screws, x mirrored (seen from behind) — symmetric anyway.
const SCREWS: [number, number][] = [[-32, CY - 32], [32, CY - 32], [-32, CY + 32], [32, CY + 32]];

/** The round display: off = glossy black; on = time, activity rings and a beating heart line. */
function face(c: C, r: number, t: number, power: number): void {
  c.fillStyle = OLED;
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  if (power <= 0) {
    c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 1;
    c.beginPath(); c.arc(0, 0, r * 0.7, 0, Math.PI * 2); c.stroke();
    return;
  }
  c.save();
  c.globalAlpha = power;
  // activity rings
  ([[STRAP, r - 6, 0.78], [MINT, r - 12, 0.6], [SKY, r - 18, 0.9]] as [string, number, number][]).forEach(([col, rr, k], i) => {
    c.lineCap = 'round'; c.lineWidth = 4.5;
    c.strokeStyle = shade(col, -0.6);
    c.beginPath(); c.arc(0, 0, rr, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = col;
    const fill = Math.min(k, ((t * 0.3 + i * 0.1) % 1.2));
    c.beginPath(); c.arc(0, 0, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill); c.stroke();
  });
  text(c, '10:10', 0, -6, 13, '#ffffff', { font: 'bold' });
  // heart-rate trace
  c.strokeStyle = '#ff5a6e'; c.lineWidth = 1.6; c.lineJoin = 'round';
  c.beginPath();
  for (let i = 0; i <= 24; i++) {
    const x = -15 + i * 1.25;
    const ph = (i / 24 + t * 0.8) % 1;
    const y = 9 + (ph > 0.45 && ph < 0.5 ? -6 : ph >= 0.5 && ph < 0.55 ? 4 : 0);
    c.lineTo(x, y);
  }
  c.stroke();
  const beat = 1 + 0.18 * Math.max(0, Math.sin(t * 8));
  text(c, '♥', -2, 18, 6 * beat, '#ff5a6e', { font: 'bold' });
  text(c, '72', 5, 18, 5, '#ffffff', { font: 'bold' });
  c.restore();
}

const caseDef: PartDef = {
  id: 'case', name: { en: 'Watch Case', vi: 'Vỏ đồng hồ' }, side: 'A', z: 0, x: 0, y: 0, w: 138, h: 138, icon: '⌚',
  shape: BODY, needs: ['screen', 'board'], tool: 'brush', thick: 26, cavity: 10, round: 12, wall: 11,
  bumps: [
    // the little side pusher under the crown
    { kind: 'box', x: 56, y: CY + 24, w: 6, h: 12, height: 4, color: STEEL, view: 'F', metal: true },
  ],
  draw(c, s) {
    slab(c, BODY, CASE, CY - 69, CY + 69, { depth: 10, shadow: 0 });
    glossStreak(c, BODY, -66, CY - 66, 132, 110, 0.3);
    // strap pins showing between the lugs
    c.fillStyle = STEEL;
    for (const y of [CY - 63, CY + 63]) c.fillRect(-20, y - 1.5, 40, 3);
    if (s.view === 'F' || !s.inDevice) {
      // brushed steel bezel with minute marks
      const b = c.createLinearGradient(0, CY - 56, 0, CY + 56);
      b.addColorStop(0, '#f4f6f9'); b.addColorStop(0.5, STEEL); b.addColorStop(1, '#7d8590');
      c.strokeStyle = b; c.lineWidth = 9;
      c.beginPath(); c.arc(0, CY, 51, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#4a4f5a'; c.lineWidth = 1.2;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        c.beginPath(); c.moveTo(Math.cos(a) * 48, CY + Math.sin(a) * 48); c.lineTo(Math.cos(a) * 54, CY + Math.sin(a) * 54); c.stroke();
      }
      // under the screen: the display bay with its flex connector
      c.fillStyle = shade(CASE, -0.4);
      c.fill(BODY_IN);
      c.fillStyle = '#e0a640'; c.beginPath(); rrc(c, 0, CY + 30, 18, 8, 2); c.fill();
      c.strokeStyle = shade(CASE, -0.1); c.lineWidth = 2;
      c.beginPath(); c.arc(0, CY, 34, 0, Math.PI * 2); c.stroke();
    } else {
      // inside, seen from the back: the board bay and screw posts
      c.fillStyle = shade(CASE, -0.35);
      c.fill(BODY_IN);
      c.save(); c.clip(BODY_IN);
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 8; c.translate(2, 4); c.stroke(BODY_IN);
      c.restore();
      for (const [x, y] of SCREWS) boss(c, x, y, CASE);
      // crown shaft hole (crown is on the left when seen from the back)
      c.fillStyle = '#15161c'; c.beginPath(); rrc(c, -43, CY - 8, 8, 6, 2); c.fill();
    }
  },
};

const GLASS = ellPath(0, 0, SCR_R, SCR_R);
const glassDef: PartDef = {
  id: 'glass', name: { en: 'Watch Glass', vi: 'Mặt kính' }, side: 'F', z: 8, x: 0, y: CY, w: 94, h: 94, icon: '🔍',
  shape: GLASS, elev: 21, thick: 8, round: SCR_R, mat: 'glass', body: '#3a4250',
  draw(c, s) {
    if (s.inDevice) face(c, SCR_R, s.time, s.power);
    else {
      c.fillStyle = 'rgba(200,228,245,0.5)';
      c.beginPath(); c.arc(0, 0, SCR_R, 0, Math.PI * 2); c.fill();
    }
    if (s.broken) {
      // scuffed protective film with a lifted edge
      c.fillStyle = 'rgba(255,255,255,0.2)';
      c.beginPath(); c.arc(0, 0, SCR_R - 2, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 1;
      for (const [x0, y0, x1, y1] of [[-30, -18, 12, 26], [-16, -34, 30, 6], [-34, 8, -2, 30], [6, -30, 32, 16], [-22, 20, 22, 18]]) {
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
      c.strokeStyle = 'rgba(255,255,255,0.55)';
      for (const [x, y, r] of [[-16, 12, 4], [18, -10, 3]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath(); c.moveTo(26, 30); c.lineTo(34, 18); c.lineTo(18, 26); c.closePath(); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath(); c.ellipse(-16, -20, 16, 5, -0.75, 0, Math.PI * 2); c.fill();
  },
};

const screenDef: PartDef = {
  id: 'screen', name: { en: 'Display', vi: 'Màn hình' }, side: 'F', z: 6, x: 0, y: CY, w: 90, h: 90, icon: '🖥',
  shape: ellPath(0, 0, 45, 45), needs: ['glass'], thick: 4, round: 2, body: '#23252b',
  draw(c, s) {
    c.fillStyle = '#2a2d33'; c.beginPath(); c.arc(0, 0, 45, 0, Math.PI * 2); c.fill();
    face(c, 42, s.time, s.power);
    // flex tail folding under
    c.fillStyle = '#e0a640'; c.beginPath(); rrc(c, 0, 41, 16, 6, 2); c.fill();
  },
};

const crownPath = rrPath(0, 0, 12, 18, 4);
const crown: PartDef = {
  id: 'crown', name: { en: 'Crown Button', vi: 'Núm xoay' }, side: 'F', z: 7, x: 62, y: CY - 8, w: 12, h: 18, icon: '🔘',
  shape: crownPath, elev: -7, thick: 14, round: 6, mat: 'metal', body: '#8a929c',
  draw(c, s) {
    const g = c.createLinearGradient(-6, 0, 6, 0);
    g.addColorStop(0, '#8a929c'); g.addColorStop(0.45, '#ffffff'); g.addColorStop(1, '#7d8590');
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 12, 18, 4); c.fill();
    // knurled grip
    c.strokeStyle = 'rgba(60,66,76,0.55)'; c.lineWidth = 1;
    for (let y = -7; y <= 7; y += 2.5) { c.beginPath(); c.moveTo(-5, y); c.lineTo(5, y); c.stroke(); }
    c.fillStyle = STRAP; c.beginPath(); c.arc(4, 0, 1.6, 0, Math.PI * 2); c.fill();
    if (s.broken) {
      // jammed: grime packed into the gap
      c.fillStyle = 'rgba(70,50,30,0.7)'; c.fillRect(-6, -3, 3, 8);
    }
  },
};

// Straps: the buckle half above the case, the tail with holes below.
const topPath = rrPath(0, 0, 44, 68, 12);
const tailPath = rrPath(0, 0, 44, 86, 22);
function strap(id: string, y: number, h: number, path: Path2D, tail: boolean): PartDef {
  return {
    id, name: tail ? { en: 'Strap (Tail)', vi: 'Dây đeo (đuôi)' } : { en: 'Strap (Buckle)', vi: 'Dây đeo (khóa)' },
    side: 'F', z: 2, x: 0, y, w: 44, h, icon: '➰',
    shape: path, tool: 'sponge', elev: -4, thick: 8, round: 4, mat: 'rubber', body: shade(STRAP, -0.25),
    bumps: tail ? undefined : [
      // buckle bar + its tongue
      { kind: 'box', x: 0, y: -h / 2 + 4, w: 50, h: 5, height: 4, color: STEEL, metal: true },
      { kind: 'box', x: 0, y: -h / 2 + 16, w: 4, h: 14, height: 3, color: STEEL, metal: true },
    ],
    draw(c, s) {
      const g = c.createLinearGradient(-22, 0, 22, 0);
      g.addColorStop(0, shade(STRAP, -0.15)); g.addColorStop(0.35, shade(STRAP, 0.18)); g.addColorStop(1, shade(STRAP, -0.2));
      c.fillStyle = g; c.fill(path);
      // soft ribbing near the case
      c.strokeStyle = shade(STRAP, -0.2); c.lineWidth = 1.4;
      const near = tail ? -h / 2 + 8 : h / 2 - 22;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-15, near + i * 4); c.lineTo(15, near + i * 4); c.stroke(); }
      if (tail) {
        // adjustment holes
        for (let i = 0; i < 5; i++) {
          c.fillStyle = shade(STRAP, -0.5); c.beginPath(); c.arc(0, -16 + i * 11, 3, 0, Math.PI * 2); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(0, -15 + i * 11, 3, 0.2, Math.PI - 0.2); c.fill();
        }
      } else {
        // steel buckle frame + the keeper loop
        c.strokeStyle = '#9aa1aa'; c.lineWidth = 3.5;
        c.beginPath(); rrc(c, 0, -h / 2 + 12, 48, 20, 6); c.stroke();
        c.fillStyle = STEEL; c.fillRect(-2, -h / 2 + 8, 4, 16);
        c.fillStyle = shade(STRAP, -0.12); c.beginPath(); rrc(c, 0, -h / 2 + 32, 48, 9, 3); c.fill();
      }
      if (s.broken) {
        c.strokeStyle = shade(STRAP, -0.45); c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(-20, 6); c.lineTo(-6, 10); c.stroke();
      }
    },
  };
}

const BACK = ellPath(0, 0, 52, 52);
const backDef: PartDef = {
  id: 'back', name: { en: 'Sensor Back', vi: 'Nắp cảm biến' }, side: 'B', z: 8, x: 0, y: CY, w: 104, h: 104, icon: '💚',
  shape: BACK, needs: ['w1', 'w2', 'w3', 'w4'], thick: 8, round: 22, body: '#2a2d3a',
  draw(c, s) {
    slab(c, BACK, '#4a4f66', -52, 52, { depth: 5, shadow: 0 });
    glossStreak(c, BACK, -52, -52, 104, 80, 0.3);
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(0, 0, 38, 0, Math.PI * 2); c.stroke();
    // dark sensor window with green LEDs + photodiodes
    c.fillStyle = '#14161c'; c.beginPath(); c.arc(0, 0, 22, 0, Math.PI * 2); c.fill();
    const on = s.power > 0 ? 0.6 + 0.4 * Math.sin(s.time * 9) : 0.25;
    for (const [x, y] of [[-6, -5], [6, -5], [-6, 5], [6, 5]]) {
      c.fillStyle = `rgba(90,255,140,${on})`; c.beginPath(); rrc(c, x, y, 6, 5, 1.5); c.fill();
    }
    c.fillStyle = '#3a4250';
    for (const a of [0, 1.57, 3.14, 4.71]) { c.beginPath(); c.arc(Math.cos(a) * 15, Math.sin(a) * 15, 2.6, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.ellipse(-8, -12, 8, 3, -0.6, 0, Math.PI * 2); c.fill();
    text(c, 'CHILL FIT', 0, -31, 6, '#b9bec6', { font: 'bold' });
    text(c, 'WR 50M', 0, 32, 5, '#9aa1aa', { font: 'bold' });
  },
};

const battery: PartDef = {
  id: 'battery', name: { en: 'Battery', vi: 'Pin' }, side: 'B', z: 5, x: 0, y: CY, w: 60, h: 60, icon: '🔋',
  shape: ellPath(0, 0, 30, 30), needs: ['back'], thick: 6, round: 4, mat: 'metal', body: '#9aa1aa',
  draw(c, s) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); c.arc(-2, 3, 30, 0, Math.PI * 2); c.fill();
    const g = c.createRadialGradient(-10, -10, 2, 0, 0, 30);
    g.addColorStop(0, '#f4f6f9'); g.addColorStop(1, '#a9b0b9');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 30, 0, Math.PI * 2); c.fill();
    c.fillStyle = SKY; c.beginPath(); rrc(c, 0, -6, 40, 9, 3); c.fill();
    text(c, 'Li-Po', 0, -6, 7, '#ffffff', { font: 'bold' });
    text(c, '300 mAh', 0, 8, 7, '#5d6670', { font: 'bold' });
    // contact tabs with red / black leads
    c.fillStyle = GOLD;
    for (const x of [-7, 7]) c.fillRect(x - 3, 22, 6, 7);
    c.lineWidth = 2;
    c.strokeStyle = '#e04a3a'; c.beginPath(); c.moveTo(-7, 28); c.lineTo(-7, 31); c.stroke();
    c.strokeStyle = '#222'; c.beginPath(); c.moveTo(7, 28); c.lineTo(7, 31); c.stroke();
    if (s.broken) {
      // puffy cell with a green-crusted contact
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.beginPath(); c.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(80,160,90,0.75)';
      c.beginPath(); c.ellipse(7, 25, 6, 4, 0, 0, Math.PI * 2); c.fill();
    }
  },
};

const board: PartDef = {
  id: 'board', name: { en: 'Main Board', vi: 'Bo mạch chính' }, side: 'B', z: 4, x: 0, y: CY, w: 80, h: 70, icon: '🟩',
  shape: rrPath(0, 0, 80, 70, 24), needs: ['battery', 'crown'], thick: 3, mat: 'pcb', body: '#1d5c37',
  draw(c, s) {
    pcb(c, 80, 70, 44);
    // shield over the main chip + the crown contact springs on the left (seen from the back)
    c.fillStyle = STEEL; c.beginPath(); rrc(c, 6, -6, 28, 24, 3); c.fill();
    c.strokeStyle = '#8b9097'; c.lineWidth = 1; c.beginPath(); rrc(c, 6, -6, 28, 24, 3); c.stroke();
    c.fillStyle = GOLD;
    for (const y of [-12, -4]) c.fillRect(-38, y, 6, 4);
    for (const x of [-7, 7]) { c.beginPath(); c.arc(x, 26, 2.6, 0, Math.PI * 2); c.fill(); }
    if (s.broken) {
      const g = c.createRadialGradient(-12, 10, 1, -12, 10, 14);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(-12, 10, 14, 0, Math.PI * 2); c.fill();
    }
  },
};

export const watch: DeviceDef = {
  id: 'watch',
  name: { en: 'Smartwatch', vi: 'Đồng hồ thông minh' },
  w: 140, h: 290,
  hasBack: true,
  parts: [
    caseDef,
    strap('strapT', CY - 66 - 34, 68, topPath, false), strap('strapB', CY + 66 + 43, 86, tailPath, true),
    glassDef, screenDef, crown,
    backDef, battery, board,
    ...SCREWS.map(([x, y], i) => screw(`w${i + 1}`, x, y, 'B', 9)),
  ],
  working(c, t, k) {
    c.save();
    // soft green pulse round the face, in time with the heart line
    const beat = Math.max(0, Math.sin(t * 8));
    c.globalAlpha = k * (0.25 + beat * 0.35);
    const g = c.createRadialGradient(0, CY, 30, 0, CY, 90);
    g.addColorStop(0, 'rgba(120,255,180,0.7)'); g.addColorStop(1, 'rgba(120,255,180,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, CY, 90, 0, Math.PI * 2); c.fill();
    // little hearts floating off the side
    for (let j = 0; j < 3; j++) {
      const ph = (t * 0.5 + j / 3) % 1;
      c.globalAlpha = k * Math.sin(ph * Math.PI);
      text(c, '♥', 70 + Math.sin(ph * 8 + j) * 8, CY - 10 - ph * 70, 14 + j * 2, '#ff5a6e', { font: 'bold', stroke: '#ffffff', strokeW: 3 });
    }
    c.restore();
  },
  workFx: { kind: 'spark', x: 0, y: CY - 60, color: '#7cf5b0', dir: -Math.PI / 2 },
};
