// Over-ear headphones lying flat: teal cups, oat cushions, a tall headband arch. Two faces.

import { type C, slab, shade, rrc, rrPath, ellPath, glossStreak, text, shapeFrom, ellPts, type Pts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, boss } from './kit';

const TEAL = '#4fb3b0';
const OAT = '#ece2d0';
const STEEL = '#c9ced6';
const INK = '#2c2f36';
const GOLD = '#e8c15a';

// Cups sit low and wide; the headband is the top half of a tall ellipse through their centres.
const CUP_X = 104, CUP_Y = 30, CUP_R = 54;
const ARCH_RY = 132;
const BAND_HW = 9;
const PAD_HW = 17;

/** A point on the arch at angle `a` (−π..0 is the top half), pushed `off` along its normal. */
function arch(a: number, off: number): [number, number] {
  const nx = Math.cos(a) / CUP_X, ny = Math.sin(a) / ARCH_RY, l = Math.hypot(nx, ny);
  return [CUP_X * Math.cos(a) + (nx / l) * off, CUP_Y + ARCH_RY * Math.sin(a) + (ny / l) * off];
}

/** Arch angle (right half) where the offset curve first comes within `r` of the right cup centre. */
function meet(off: number, r: number): number {
  for (let a = -Math.PI / 2; a < 0; a += 0.002) {
    const [x, y] = arch(a, off);
    if (Math.hypot(x - CUP_X, y - CUP_Y) < r) return a;
  }
  return 0;
}

function archRun(off: number, a0: number, a1: number, n = 48): Pts {
  const out: Pts = [];
  for (let i = 0; i <= n; i++) out.push(arch(a0 + ((a1 - a0) * i) / n, off));
  return out;
}

function cupArc(cx: number, from: [number, number], to: [number, number]): Pts {
  let a0 = Math.atan2(from[1] - CUP_Y, from[0] - cx), a1 = Math.atan2(to[1] - CUP_Y, to[0] - cx);
  while (a1 <= a0) a1 += Math.PI * 2;
  const out: Pts = [];
  for (let i = 1; i < 40; i++) {
    const a = a0 + ((a1 - a0) * i) / 40;
    out.push([cx + Math.cos(a) * CUP_R, CUP_Y + Math.sin(a) * CUP_R]);
  }
  return out;
}

// The frame: both cup housings joined by the steel band, as one outline.
function framePts(): Pts {
  const ao = meet(BAND_HW, CUP_R), ai = meet(-BAND_HW, CUP_R);
  const outer = archRun(BAND_HW, -Math.PI - ao, ao);
  const inner = archRun(-BAND_HW, ai, -Math.PI - ai);
  return [
    ...outer, ...cupArc(CUP_X, outer[outer.length - 1], inner[0]),
    ...inner, ...cupArc(-CUP_X, inner[inner.length - 1], outer[0]),
  ];
}

const BODY = shapeFrom(framePts());
const CUP_IN = 42;

// The padded headband stops just short of the cups.
const PAD_END = meet(0, CUP_R + 6);
const padPath = shapeFrom([...archRun(PAD_HW, -Math.PI - PAD_END, PAD_END), ...archRun(-PAD_HW, PAD_END, -Math.PI - PAD_END)]);

/** Little silver slider marks where the band meets each cup. */
function sliders(c: C): void {
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const a = sx > 0 ? PAD_END + 0.03 + i * 0.05 : -Math.PI - PAD_END - 0.03 - i * 0.05;
      const [x0, y0] = arch(a, -BAND_HW + 2), [x1, y1] = arch(a, BAND_HW - 2);
      c.strokeStyle = 'rgba(60,70,80,0.45)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    }
  }
}

const frame: PartDef = {
  id: 'frame', name: { en: 'Headphone Frame', vi: 'Khung tai nghe' }, side: 'A', z: 0, x: 0, y: 0, w: 316, h: 190, icon: '🎧',
  shape: BODY, needs: ['driverL', 'driverR', 'board', 'headband'], thick: 24, cavity: 12, round: 10, wall: 12,
  draw(c, s) {
    slab(c, BODY, TEAL, -110, CUP_Y + CUP_R, { depth: 10, shadow: 0 });
    // the steel band down the middle of the arch
    c.save();
    c.clip(BODY);
    const band = shapeFrom([...archRun(BAND_HW - 1, -Math.PI, 0), ...archRun(-BAND_HW + 1, 0, -Math.PI)]);
    const g = c.createLinearGradient(0, -110, 0, 40);
    g.addColorStop(0, '#f4f6f9'); g.addColorStop(1, '#9aa1aa');
    c.fillStyle = g; c.fill(band);
    c.restore();
    sliders(c);
    for (const sx of [-1, 1]) {
      const cx = sx * CUP_X;
      // cup housing: rim + the hollow inside
      c.fillStyle = shade(TEAL, -0.08);
      c.beginPath(); c.arc(cx, CUP_Y, CUP_R, 0, Math.PI * 2); c.fill();
      c.save();
      c.beginPath(); c.arc(cx, CUP_Y, CUP_R, 0, Math.PI * 2); c.clip();
      glossStreak(c, BODY, cx - CUP_R, CUP_Y - CUP_R, CUP_R * 2, CUP_R * 2, 0.3);
      c.restore();
      c.fillStyle = shade(TEAL, -0.42);
      c.beginPath(); c.arc(cx, CUP_Y, CUP_IN, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 8;
      c.beginPath(); c.arc(cx + 2, CUP_Y + 3, CUP_IN - 4, 0, Math.PI * 2); c.stroke();
      if (s.view === 'F' || !s.inDevice) {
        // driver seat: foam ring + the lead pads the speaker wires solder to
        c.strokeStyle = '#3a3f48'; c.lineWidth = 3;
        c.beginPath(); c.arc(cx, CUP_Y, 30, 0, Math.PI * 2); c.stroke();
        c.fillStyle = GOLD;
        for (const dy of [-6, 6]) { c.beginPath(); c.arc(cx + sx * 34, CUP_Y + dy, 2.6, 0, Math.PI * 2); c.fill(); }
        text(c, sx < 0 ? 'L' : 'R', cx, CUP_Y, 18, shade(TEAL, -0.6), { font: 'bold' });
      } else if (sx > 0) {
        // back view, left cup (mirrored to the right): the battery pouch + jack socket
        c.fillStyle = '#b9bec6'; c.beginPath(); rrc(c, cx, CUP_Y - 4, 50, 34, 6); c.fill();
        c.fillStyle = '#e6e9ee'; c.beginPath(); rrc(c, cx, CUP_Y - 6, 44, 26, 5); c.fill();
        text(c, '3.7V', cx, CUP_Y - 6, 9, '#5d6670', { font: 'bold' });
        c.fillStyle = '#23252b'; c.beginPath(); c.arc(cx, CUP_Y + 32, 5, 0, Math.PI * 2); c.fill();
        boss(c, cx, CUP_Y - 36, TEAL); boss(c, cx, CUP_Y + 36, TEAL);
      } else {
        // right cup: the board bay
        c.strokeStyle = shade(TEAL, -0.2); c.lineWidth = 2;
        c.beginPath(); rrc(c, cx, CUP_Y, 64, 48, 10); c.stroke();
        boss(c, cx, CUP_Y - 36, TEAL); boss(c, cx, CUP_Y + 36, TEAL);
      }
    }
  },
};

const headband: PartDef = {
  id: 'headband', name: { en: 'Headband Pad', vi: 'Quai đeo' }, side: 'F', z: 6, x: 0, y: 0, w: 260, h: 150, icon: '🌈',
  shape: padPath, tool: 'sponge', elev: 16, thick: 14, round: 12, mat: 'rubber', body: shade(OAT, -0.25),
  draw(c, s) {
    const g = c.createLinearGradient(0, -120, 0, 40);
    g.addColorStop(0, shade(OAT, 0.2)); g.addColorStop(1, shade(OAT, -0.12));
    c.fillStyle = g; c.fill(padPath);
    // stitched seam along the middle of the pad
    c.strokeStyle = shade(OAT, -0.3); c.lineWidth = 1.2; c.setLineDash([4, 3]);
    c.beginPath();
    for (const [x, y] of archRun(0, -Math.PI - PAD_END, PAD_END, 60)) c.lineTo(x, y);
    c.stroke();
    c.setLineDash([]);
    // quilted puffs
    c.strokeStyle = shade(OAT, -0.18); c.lineWidth = 1.5;
    for (let i = 1; i < 10; i++) {
      const a = -Math.PI - PAD_END + ((Math.PI + 2 * PAD_END) * i) / 10;
      const [x0, y0] = arch(a, -PAD_HW + 3), [x1, y1] = arch(a, PAD_HW - 3);
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    }
    const [lx, ly] = arch(-Math.PI / 2, 0);
    c.fillStyle = TEAL; c.beginPath(); rrc(c, lx, ly, 34, 14, 7); c.fill();
    text(c, 'CHILL', lx, ly + 1, 9, '#ffffff', { font: 'bold' });
    if (s.broken) {
      // flaking pleather
      c.fillStyle = 'rgba(120,90,60,0.55)';
      for (const a of [-2.4, -1.2, -0.7]) { const [x, y] = arch(a, 4); c.beginPath(); c.ellipse(x, y, 7, 4, a, 0, Math.PI * 2); c.fill(); }
    }
  },
};

const cushPath = shapeFrom(ellPts(0, 0, CUP_R, CUP_R, 56), [ellPts(0, 0, 26, 26, 40)]);
function cushion(id: string, sx: number, en: string, vi: string): PartDef {
  return {
    id, name: { en, vi }, side: 'F', z: 6, x: sx * CUP_X, y: CUP_Y, w: 108, h: 108, icon: '⭕',
    shape: cushPath, tool: 'sponge', elev: 20, thick: 18, round: 13, mat: 'rubber', body: shade(OAT, -0.25),
    draw(c, s) {
      const g = c.createRadialGradient(-18, -20, 6, 0, 0, CUP_R);
      g.addColorStop(0, '#fffaf0'); g.addColorStop(0.6, OAT); g.addColorStop(1, shade(OAT, -0.22));
      c.fillStyle = g; c.fill(cushPath);
      // soft creases + a stitched seam round the ring
      c.strokeStyle = shade(OAT, -0.15); c.lineWidth = 1.4;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        c.beginPath(); c.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); c.lineTo(Math.cos(a) * 38, Math.sin(a) * 38); c.stroke();
      }
      c.strokeStyle = shade(OAT, -0.32); c.setLineDash([3, 3]);
      c.beginPath(); c.arc(0, 0, 47, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.beginPath(); c.ellipse(-24, -30, 12, 4, -0.7, 0, Math.PI * 2); c.fill();
      if (s.broken) {
        // sweaty, cracked pleather peeling off in flakes
        c.fillStyle = 'rgba(170,140,90,0.35)';
        c.beginPath(); c.arc(0, 0, 50, 0.3, 2.4); c.arc(0, 0, 28, 2.4, 0.3, true); c.closePath(); c.fill();
        c.fillStyle = 'rgba(110,80,50,0.6)';
        for (const [x, y, r] of [[30, 26, 6], [-36, 18, 4], [8, 42, 5], [40, -8, 3.5], [-20, 38, 3]]) {
          c.beginPath(); c.ellipse(x, y, r, r * 0.6, x * 0.05, 0, Math.PI * 2); c.fill();
        }
      }
    },
  };
}

function driver(id: string, sx: number, en: string, vi: string): PartDef {
  return {
    id, name: { en, vi }, side: 'F', z: 4, x: sx * CUP_X, y: CUP_Y, w: 80, h: 80, icon: '🔊',
    shape: ellPath(0, 0, 40, 40), needs: [sx < 0 ? 'cushionL' : 'cushionR'], thick: 6, round: 3, body: '#3a3f48',
    draw(c, s) {
      c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); c.arc(-3, 4, 40, 0, Math.PI * 2); c.fill();
      // steel basket rim with its mounting tabs
      c.fillStyle = '#9aa1aa'; c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); c.fill();
      c.fillStyle = INK; c.beginPath(); c.arc(0, 0, 35, 0, Math.PI * 2); c.fill();
      // the cone: ridged rings toward the dust cap
      const g = c.createRadialGradient(-8, -8, 2, 0, 0, 34);
      g.addColorStop(0, '#5a606b'); g.addColorStop(1, '#23262d');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 33, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = 1.2;
      for (const r of [29, 24, 19]) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
      const pulse = s.power > 0 ? 1 + 0.06 * Math.sin(s.time * 30) : 1;
      // felt dust cap with the side letter
      c.fillStyle = TEAL; c.beginPath(); c.arc(0, 0, 14 * pulse, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.arc(-4, -4, 5, 0, Math.PI * 2); c.fill();
      text(c, sx < 0 ? 'L' : 'R', 0, 1, 13, '#ffffff', { font: 'bold' });
      // red / black leads to the solder tabs on the outer edge
      const ex = -sx * 0;
      c.lineWidth = 2.2; c.lineCap = 'round';
      c.strokeStyle = '#e04a3a'; c.beginPath(); c.moveTo(sx * 34 + ex, -6); c.lineTo(sx * 26, -12); c.stroke();
      if (!s.broken) { c.strokeStyle = '#222'; c.beginPath(); c.moveTo(sx * 34, 6); c.lineTo(sx * 26, 12); c.stroke(); }
      c.fillStyle = GOLD;
      for (const dy of [-6, 6]) { c.beginPath(); c.arc(sx * 35, dy, 2.6, 0, Math.PI * 2); c.fill(); }
      if (s.broken) {
        // snapped black lead dangling loose
        c.strokeStyle = '#222'; c.lineWidth = 2.2;
        c.beginPath(); c.moveTo(sx * 26, 12); c.quadraticCurveTo(sx * 20, 22, sx * 28, 26); c.stroke();
        c.strokeStyle = '#e39a4a'; c.lineWidth = 0.8;
        for (const d of [-2, 0, 2]) { c.beginPath(); c.moveTo(sx * 28, 26); c.lineTo(sx * 31 + d, 29); c.stroke(); }
      }
    },
  };
}

const COVER = ellPath(0, 0, CUP_R, CUP_R);
function cover(id: string, x: number, en: string, vi: string, needs: string[]): PartDef {
  return {
    id, name: { en, vi }, side: 'B', z: 8, x, y: CUP_Y, w: 108, h: 108, icon: '🎵',
    shape: COVER, needs, elev: 20, thick: 14, round: 34, body: shade(TEAL, -0.3),
    draw(c) {
      slab(c, COVER, TEAL, -CUP_R, CUP_R, { depth: 6, shadow: 0 });
      glossStreak(c, COVER, -CUP_R, -CUP_R, CUP_R * 2, CUP_R * 2, 0.4);
      c.strokeStyle = shade(TEAL, -0.25); c.lineWidth = 2;
      c.beginPath(); c.arc(0, 0, 46, 0, Math.PI * 2); c.stroke();
      // cream badge with a note
      c.fillStyle = shade(OAT, -0.15); c.beginPath(); c.arc(0.5, 1.5, 19, 0, Math.PI * 2); c.fill();
      c.fillStyle = OAT; c.beginPath(); c.arc(0, 0, 18, 0, Math.PI * 2); c.fill();
      text(c, '♪', 0, 1, 22, TEAL, { font: 'bold' });
      c.fillStyle = 'rgba(255,255,255,0.65)';
      c.beginPath(); c.ellipse(-22, -28, 11, 4, -0.7, 0, Math.PI * 2); c.fill();
    },
  };
}

const board: PartDef = {
  id: 'board', name: { en: 'Bluetooth Board', vi: 'Mạch Bluetooth' }, side: 'B', z: 5, x: -CUP_X, y: CUP_Y, w: 62, h: 46, icon: '📶',
  shape: rrPath(0, 0, 62, 46, 10), needs: ['coverR'], thick: 4, mat: 'pcb', body: '#1d4a5c',
  draw(c, s) {
    pcb(c, 62, 46, 91, '#2b6f86');
    // the BT chip under its little shield + a zig-zag antenna trace
    c.fillStyle = STEEL; c.beginPath(); rrc(c, -8, -2, 24, 20, 2); c.fill();
    text(c, 'BT', -8, -1, 8, '#5d6670', { font: 'bold' });
    c.strokeStyle = GOLD; c.lineWidth = 1.6;
    c.beginPath();
    for (let i = 0; i <= 6; i++) c.lineTo(10 + i * 2.6, -14 + (i % 2) * 6);
    c.stroke();
    // status LED
    c.fillStyle = s.power > 0 && Math.sin(s.time * 6) > 0 ? '#5aa7ff' : '#2a3a5a';
    c.beginPath(); c.arc(20, 12, 3, 0, Math.PI * 2); c.fill();
    if (s.broken) {
      const g = c.createRadialGradient(4, 10, 1, 4, 10, 14);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(4, 10, 14, 0, Math.PI * 2); c.fill();
    }
  },
};

// Detachable audio cable plugged into the bottom of the left cup (seen from the back: on the right).
const cablePath = rrPath(0, 0, 18, 58, 9);
const cable: PartDef = {
  id: 'cable', name: { en: 'Audio Cable', vi: 'Dây cáp âm thanh' }, side: 'B', z: 7, x: CUP_X, y: CUP_Y + CUP_R + 18, w: 18, h: 58, icon: '🔌',
  shape: cablePath, elev: -5, thick: 10, round: 5, mat: 'rubber', body: '#2e2b38',
  draw(c, s) {
    // metal plug tip tucked in the cup
    const m = c.createLinearGradient(-5, 0, 5, 0);
    m.addColorStop(0, '#8a8f99'); m.addColorStop(0.45, '#ffffff'); m.addColorStop(1, '#8a8f99');
    c.fillStyle = m; c.beginPath(); rrc(c, 0, -22, 9, 14, 3); c.fill();
    // moulded plug body, then the cord
    c.fillStyle = TEAL; c.beginPath(); rrc(c, 0, -6, 16, 20, 5); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(-5, -14, 3, 14);
    const g = c.createLinearGradient(-5, 0, 5, 0);
    g.addColorStop(0, '#2e2b38'); g.addColorStop(0.4, '#6a6478'); g.addColorStop(1, '#1d1b24');
    c.fillStyle = g; c.fillRect(-4.5, 4, 9, 25);
    if (s.broken) {
      // split jacket with copper showing
      c.fillStyle = '#e39a4a'; c.fillRect(-3, 14, 6, 6);
      c.strokeStyle = '#e39a4a'; c.lineWidth = 0.8;
      for (const d of [-4, 0, 4]) { c.beginPath(); c.moveTo(0, 17); c.lineTo(d * 1.6, 12); c.stroke(); }
    }
  },
};

export const headphones: DeviceDef = {
  id: 'headphones',
  name: { en: 'Over-Ear Headphones', vi: 'Tai nghe chụp tai' },
  w: 316, h: 220,
  hasBack: true,
  parts: [
    frame, headband,
    cushion('cushionL', -1, 'Left Ear Cushion', 'Đệm tai trái'), cushion('cushionR', 1, 'Right Ear Cushion', 'Đệm tai phải'),
    driver('driverL', -1, 'Left Speaker', 'Loa trái'), driver('driverR', 1, 'Right Speaker', 'Loa phải'),
    // back view: the left cup sits on the right
    cover('coverL', CUP_X, 'Left Cup Cover', 'Vòm tai trái', ['h1', 'h2', 'cable']),
    cover('coverR', -CUP_X, 'Right Cup Cover', 'Vòm tai phải', ['h3', 'h4']),
    board, cable,
    screw('h1', CUP_X, CUP_Y - 36, 'B'), screw('h2', CUP_X, CUP_Y + 36, 'B'),
    screw('h3', -CUP_X, CUP_Y - 36, 'B'), screw('h4', -CUP_X, CUP_Y + 36, 'B'),
  ],
  working(c, t, k) {
    c.save();
    for (const sx of [-1, 1]) {
      const cx = sx * CUP_X;
      // the cups pulse with the beat
      const r = CUP_R + 4 + ((t * 70) % 36);
      c.globalAlpha = k * (1 - (r - CUP_R - 4) / 36) * 0.6;
      c.strokeStyle = '#7ee0d6'; c.lineWidth = 3;
      c.beginPath(); c.arc(cx, CUP_Y, r, 0, Math.PI * 2); c.stroke();
      // little notes drifting up and out
      for (let j = 0; j < 3; j++) {
        const ph = (t * 0.6 + j / 3 + (sx > 0 ? 0.15 : 0)) % 1;
        c.globalAlpha = k * Math.sin(ph * Math.PI);
        text(c, j % 2 ? '♫' : '♪', cx + sx * (20 + ph * 40) + Math.sin(ph * 9) * 6, CUP_Y - 40 - ph * 70, 18 + j * 3, j === 1 ? '#ff8fa3' : '#ffd36b', { font: 'bold', stroke: '#ffffff', strokeW: 3 });
      }
    }
    c.restore();
  },
  workFx: { kind: 'note', x: 0, y: -90, color: '#7ee0d6', dir: -Math.PI / 2 },
};
