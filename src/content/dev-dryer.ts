// Salon hair dryer lying on its side, seen from above: a glossy red tapered barrel
// (nozzle to the right, mesh intake at the back) and a slim handle raked back.

import { type C, type Pts, slab, shade, rrc, rrPath, ellPath, glossStreak, text, shapeFrom, roundedPts, rrPts, ellPts } from '../core/draw';
import { type DeviceDef, type PartDef, type Bump, screw } from './device';
import { pcb, coil, boss } from './kit';

const RED = '#d8313d';
const GOLD = '#e8b54a';
const CHROME = '#d9dde3';
const CHAR = '#34292e'; // dark soft-touch plastic: nozzle, grip, strain relief
const MICA = '#c89a52';

// Barrel axis; the handle hangs off it raked back HA (~18°) from vertical.
const BY = -72;
const HA = 0.31;
const CA = Math.cos(HA), SA = Math.sin(HA);
const HX = -24, HY = BY + 30;
const HL = 148;

/** Handle frame → device: v runs down the handle, u across it (+ towards the nozzle). */
function hp(v: number, u: number): [number, number] {
  return [HX + u * CA - v * SA, HY + u * SA + v * CA];
}
/** Paint in the handle frame (x = u, y = v). */
function inHandle(c: C, f: () => void): void {
  c.save(); c.translate(HX, HY); c.rotate(HA); f(); c.restore();
}
/** How far down the handle edge u reaches the line y. */
const tAt = (u: number, y: number) => (y - HY - u * SA) / CA;

// One outline for both shell halves: tapered barrel + raked handle, `k` units in.
// The lower half also carries the hang loop at the butt.
function shellPts(k = 0, loop = false): Pts {
  const v: [number, number, number][] = [
    [-100 + k, BY - 41 + k, 18 - k * 0.5], [80 - k, BY - 35 + k, 10 - k * 0.5], [80 - k, BY + 35 - k, 10 - k * 0.5],
    [...hp(tAt(25 - k, BY + 37 - k), 25 - k), 30],
    [...hp(HL - k, 21 - k), 14 - k * 0.5],
  ];
  if (loop) v.push([...hp(HL, -2), 3], [...hp(HL + 25, -4), 9], [...hp(HL + 25, -23), 10]);
  else v.push([...hp(HL - k, -21 + k), 14 - k * 0.5]);
  v.push([...hp(tAt(-25 + k, BY + 40 - k), -25 + k), 22], [-100 + k, BY + 41 - k, 18 - k * 0.5]);
  return roundedPts(v);
}

const LOOP_HOLE = hp(HL + 14, -13);
const SHELL = shapeFrom(shellPts(0, true), [ellPts(LOOP_HOLE[0], LOOP_HOLE[1], 5.5, 5.5, 20)]);
const SHELL_IN = shapeFrom(shellPts(13));
const UPPER = shapeFrom(shellPts(8));

const SCREWS: [number, number][] = [[-70, BY + 8], [48, BY + 8], hp(74, -4), hp(124, -3)];
// switch row down the handle side: cool shot, then the speed + heat sliders (knob at the top of its track)
const SW_U = 6;
const COOL_V = 15, SPEED_V = 35, HEAT_V = 56;
const COOL = hp(COOL_V, SW_U);
const SPEED = hp(SPEED_V - 4, SW_U);
const HEAT = hp(HEAT_V - 4, SW_U);

const lowerShell: PartDef = {
  id: 'lower', name: { en: 'Lower Shell', vi: 'Vỏ dưới' }, side: 'A', z: 0, x: 0, y: 0, w: 230, h: 240, icon: '🟥',
  shape: SHELL, needs: ['heater', 'motor', 'board', 'cord'], tool: 'brush', thick: 22, cavity: 14, round: 22, wall: 13, body: shade(RED, -0.22),
  draw(c) {
    slab(c, SHELL, shade(RED, -0.08), BY - 41, 130, { depth: 9, shadow: 0 });
    // the loop moulded in dark rubber at the butt
    c.save(); c.clip(SHELL);
    inHandle(c, () => { c.fillStyle = CHAR; c.fillRect(-30, HL + 1, 34, 30); });
    c.restore();
    c.fillStyle = shade(RED, -0.5);
    c.fill(SHELL_IN);
    c.save();
    c.clip(SHELL_IN);
    // brushed-foil heat liner round the heater, the rest bare plastic
    const f = c.createLinearGradient(0, BY - 30, 0, BY + 30);
    f.addColorStop(0, '#8d9199'); f.addColorStop(0.4, '#e9ecf0'); f.addColorStop(1, '#7a7e86');
    c.fillStyle = f; c.fillRect(-32, BY - 32, 108, 64);
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.8;
    for (let x = -28; x < 76; x += 7) { c.beginPath(); c.moveTo(x, BY - 32); c.lineTo(x + 3, BY + 32); c.stroke(); }
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.lineWidth = 12;
    c.translate(3, 5);
    c.stroke(SHELL_IN);
    c.restore();
    // ribs that cradle the motor + the bosses the screws bite into
    c.strokeStyle = shade(RED, -0.3);
    c.lineWidth = 3;
    for (const x of [-92, -36]) { c.beginPath(); c.moveTo(x, BY - 26); c.lineTo(x, BY + 26); c.stroke(); }
    for (const [x, y] of SCREWS) boss(c, x, y, RED);
    // wiring harness on the floor: board in the handle → motor and heater, cord leads up from the butt
    c.save();
    c.clip(SHELL_IN);
    c.lineCap = 'round';
    const wire = (col: string, pts: number[]) => {
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(pts[0] - 1, pts[1] + 2);
      for (let i = 2; i < pts.length; i += 4) c.quadraticCurveTo(pts[i] - 1, pts[i + 1] + 2, pts[i + 2] - 1, pts[i + 3] + 2);
      c.stroke();
      c.strokeStyle = col; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 4) c.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
      c.stroke();
    };
    const [bx, by] = hp(22, -4);
    wire('#e04a3a', [bx - 2, by, -36, BY + 22, -50, BY + 16]);
    wire('#2b2b33', [bx - 5, by, -42, BY + 24, -56, BY + 18]);
    wire('#f2f2f2', [bx + 2, by - 2, -6, BY + 22, 4, BY + 16]);
    wire('#3d7fd8', [bx + 5, by, 4, BY + 24, 14, BY + 18]);
    const [cx0, cy0] = hp(HL - 18, 3), [cx1, cy1] = hp(78, 1);
    wire('#8a5a2a', [cx0, cy0, cx1 - 4, (cy0 + cy1) / 2, cx1, cy1]);
    wire('#3d7fd8', [cx0 + 3, cy0, cx1 + 1, (cy0 + cy1) / 2, cx1 + 3, cy1]);
    c.restore();
  },
};

// Heating element: a mica cross board wound with nichrome coil, brass end rings.
const HEATER = { x: 24, y: BY, w: 104, h: 52 };
const heater: PartDef = {
  id: 'heater', name: { en: 'Heating Element', vi: 'Thanh nhiệt' }, side: 'A', z: 2, x: HEATER.x, y: HEATER.y, w: HEATER.w, h: HEATER.h, icon: '🔥',
  shape: rrPath(0, 0, HEATER.w, HEATER.h, 10), needs: ['upper'], thick: 24, round: 12, body: '#8a6a3a',
  draw(c, s) {
    const hw = HEATER.w / 2, hh = HEATER.h / 2;
    c.fillStyle = 'rgba(10,20,40,0.35)';
    c.beginPath(); rrc(c, -3, 5, HEATER.w, HEATER.h, 10); c.fill();
    // amber mica plates (the cross seen side-on: one face + the edge of the other)
    const g = c.createLinearGradient(0, -hh, 0, hh);
    g.addColorStop(0, shade(MICA, -0.35)); g.addColorStop(0.3, shade(MICA, 0.35)); g.addColorStop(0.55, MICA); g.addColorStop(1, shade(MICA, -0.45));
    c.fillStyle = g;
    c.beginPath(); rrc(c, 0, 0, HEATER.w - 8, HEATER.h - 6, 6); c.fill();
    c.fillStyle = 'rgba(90,60,25,0.45)'; c.fillRect(-hw + 8, -2, HEATER.w - 16, 4);
    // mica flake sparkle
    c.fillStyle = 'rgba(255,245,220,0.7)';
    for (let i = 0; i < 26; i++) c.fillRect(((i * 37) % 88) - 44, ((i * 23) % 40) - 20, 1.6, 1.2);
    // nichrome coil: springs along both edges and one down the middle
    const hot = s.power > 0;
    const wireCol = hot ? `rgb(255,${150 - s.power * 70},${60 - s.power * 30})` : '#c3c6cc';
    const gap = s.broken ? [6, 22] : null;
    for (const [y, ry] of [[-hh + 9, 7], [0, 5], [hh - 9, 7]] as const) {
      for (let x = -hw + 14; x <= hw - 14; x += 4.2) {
        if (gap && y < 0 && ry === 7 && x > gap[0] && x < gap[1]) continue;
        c.strokeStyle = 'rgba(40,25,10,0.45)'; c.lineWidth = 1.6;
        c.beginPath(); c.ellipse(x + 0.8, y + 1.2, 2.4, ry, 0.25, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = wireCol; c.lineWidth = 1.3;
        c.beginPath(); c.ellipse(x, y, 2.4, ry, 0.25, 0, Math.PI * 2); c.stroke();
      }
    }
    if (hot) {
      const glow = c.createRadialGradient(0, 0, 4, 0, 0, hw);
      glow.addColorStop(0, `rgba(255,140,40,${0.45 * s.power})`); glow.addColorStop(1, 'rgba(255,90,20,0)');
      c.fillStyle = glow; c.beginPath(); rrc(c, 0, 0, HEATER.w, HEATER.h, 10); c.fill();
    }
    // bimetal thermostat clipped to the board
    c.fillStyle = '#b7bcc4'; c.beginPath(); rrc(c, -30, 0, 14, 9, 2); c.fill();
    c.fillStyle = '#eef0f3'; c.fillRect(-36, -2.5, 12, 2);
    // brass end rings holding the plates
    for (const x of [-hw + 5, hw - 5]) {
      const cg = c.createLinearGradient(0, -hh, 0, hh);
      cg.addColorStop(0, shade(GOLD, -0.35)); cg.addColorStop(0.3, shade(GOLD, 0.5)); cg.addColorStop(1, shade(GOLD, -0.45));
      c.fillStyle = cg;
      c.beginPath(); rrc(c, x, 0, 9, HEATER.h, 3); c.fill();
      c.fillStyle = shade(GOLD, -0.5);
      for (const y of [-14, 14]) { c.beginPath(); c.arc(x, y, 1.6, 0, Math.PI * 2); c.fill(); }
    }
    if (s.broken) {
      // a snapped coil: scorched mica, two loose curly ends
      const b = c.createRadialGradient(14, -hh + 12, 1, 14, -hh + 12, 24);
      b.addColorStop(0, 'rgba(20,10,4,1)'); b.addColorStop(0.45, 'rgba(50,25,8,0.85)'); b.addColorStop(1, 'rgba(70,35,10,0)');
      c.fillStyle = b; c.beginPath(); c.arc(14, -hh + 12, 24, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(20,12,6,0.7)';
      for (const [x, y, r] of [[-4, -4, 2.5], [30, 2, 2], [22, -2, 3]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = '#d6d9de'; c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(5, -hh + 9); c.bezierCurveTo(9, -hh - 2, 2, -hh - 6, 8, -hh - 9); c.stroke();
      c.beginPath(); c.moveTo(23, -hh + 9); c.bezierCurveTo(20, -hh + 18, 28, -hh + 20, 24, -hh + 26); c.stroke();
      c.fillStyle = '#e0e4ea'; c.beginPath(); c.arc(14, -hh + 12, 1.8, 0, Math.PI * 2); c.fill();
    }
  },
};

// Motor + fan: a chrome can with copper windings, the impeller facing the intake.
const motor: PartDef = {
  id: 'motor', name: { en: 'Motor & Fan', vi: 'Động cơ & quạt' }, side: 'A', z: 2, x: -64, y: BY, w: 56, h: 50, icon: '⚙️',
  shape: rrPath(0, 0, 56, 50, 14), needs: ['upper'], thick: 28, round: 18, mat: 'metal', body: '#8a8f99',
  draw(c, s) {
    c.fillStyle = 'rgba(10,20,40,0.35)';
    c.beginPath(); rrc(c, -3, 5, 56, 50, 14); c.fill();
    // the can
    const g = c.createLinearGradient(0, -22, 0, 22);
    g.addColorStop(0, '#6b6f78'); g.addColorStop(0.3, '#eef0f3'); g.addColorStop(0.6, CHROME); g.addColorStop(1, '#4a4e57');
    c.fillStyle = g;
    c.beginPath(); rrc(c, 8, 0, 36, 42, 9); c.fill();
    // copper windings through the window
    c.save(); c.translate(8, 0); coil(c, 22, 26); c.restore();
    c.fillStyle = '#4a4e57'; c.fillRect(-11, -18, 3, 36); c.fillRect(25, -18, 3, 36);
    // shaft to the impeller
    c.fillStyle = '#c9ccd3'; c.fillRect(-16, -2, 8, 4);
    // impeller drum seen side-on: blades sweeping past
    const fg = c.createLinearGradient(0, -25, 0, 25);
    fg.addColorStop(0, '#2a2d33'); fg.addColorStop(0.35, '#5a5f69'); fg.addColorStop(1, '#1e2025');
    c.fillStyle = fg;
    c.beginPath(); rrc(c, -21, 0, 14, 50, 5); c.fill();
    c.save();
    c.beginPath(); rrc(c, -21, 0, 14, 50, 5); c.clip();
    const sp = s.power > 0 ? (s.time * 60) % 6 : 0;
    c.strokeStyle = 'rgba(220,226,235,0.75)'; c.lineWidth = 1.4;
    for (let y = -30 + sp; y < 30; y += 6) { c.beginPath(); c.moveTo(-28, y); c.lineTo(-14, y + 5); c.stroke(); }
    c.restore();
    // leads off the brush end
    c.lineCap = 'round';
    for (const [y, col] of [[-6, '#e04a3a'], [6, '#2b2b33']] as const) {
      c.strokeStyle = col; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(26, y); c.lineTo(30, y * 1.6); c.stroke();
    }
  },
};

// Control board up in the handle, carrying the two slide switches + the cool-shot microswitch.
const BOARD = { v: 36, w: 22, h: 50 };
const BOARD_AT = hp(BOARD.v, 0);
const boardLocal = (v: number, u: number): [number, number] => { const [x, y] = hp(v, u); return [x - BOARD_AT[0], y - BOARD_AT[1]]; };
const board: PartDef = {
  id: 'board', name: { en: 'Control Board', vi: 'Bo mạch' }, side: 'A', z: 2, x: BOARD_AT[0], y: BOARD_AT[1], w: 32, h: 54, icon: '🟩',
  shape: shapeFrom(rrPts(0, 0, BOARD.w, BOARD.h, 4).map(([u, v]) => [u * CA - v * SA, u * SA + v * CA])), needs: ['upper'], thick: 4, mat: 'pcb', body: '#1d5c37',
  bumps: [boardLocal(SPEED_V, SW_U), boardLocal(HEAT_V, SW_U)].map(([x, y]) => ({ kind: 'box', x, y, w: 8, h: 12, height: 6, color: '#ece6da' }) as Bump),
  draw(c, s) {
    c.save();
    c.rotate(HA);
    pcb(c, BOARD.w, BOARD.h, 11);
    for (const v of [SPEED_V - BOARD.v, HEAT_V - BOARD.v]) {
      c.fillStyle = '#2a2d33'; c.beginPath(); rrc(c, SW_U, v, 9, 15, 1.5); c.fill();
    }
    c.fillStyle = '#d6dade'; c.beginPath(); rrc(c, SW_U, COOL_V - BOARD.v, 10, 6, 1.5); c.fill();
    c.fillStyle = s.power > 0 ? '#ff6a50' : '#7a2a24';
    c.beginPath(); c.arc(-6, 18, 2, 0, Math.PI * 2); c.fill();
    c.restore();
  },
};

// Cord: the strain relief pokes out of the butt; the 3D layer hangs a tube cable off its tip (0, 14).
const RELIEF: Pts = [[-8, -16], [8, -16], [6.5, 6], [5, 14], [-5, 14], [-6.5, 6]];
const reliefPts = (): Pts => RELIEF.map(([u, v]) => [u * CA - (v - 14) * SA, u * SA + (v - 14) * CA + 14]);
const CORD_TIP = hp(HL + 10, 5);
const CORD_AT = [CORD_TIP[0], CORD_TIP[1] - 14];
const cord: PartDef = {
  id: 'cord', name: { en: 'Cord & Strain Relief', vi: 'Dây điện' }, side: 'A', z: 2, x: CORD_AT[0], y: CORD_AT[1], w: 70, h: 70, icon: '〰',
  shape: shapeFrom(reliefPts()), needs: ['upper'], elev: 2, thick: 12, round: 6, mat: 'rubber', body: '#2a2226',
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
      p.moveTo(0, 14);
      p.bezierCurveTo(0, 60, 60, 80, 110, 60);
      p.bezierCurveTo(140, 48, 150, 30, 140, 20);
    } else {
      p.ellipse(4, 14, 26, 16, 0, Math.PI * 0.6, Math.PI * 2.5);
    }
    cable(p);
    // ribbed rubber sleeve, tapering out of the handle
    c.save();
    c.translate(0, 14); c.rotate(HA); c.translate(0, -14);
    const g = c.createLinearGradient(-8, 0, 8, 0);
    g.addColorStop(0, shade(CHAR, -0.3)); g.addColorStop(0.4, shade(CHAR, 0.45)); g.addColorStop(1, shade(CHAR, -0.4));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(-8, -16); c.lineTo(8, -16); c.lineTo(6.5, 6); c.lineTo(5, 14); c.lineTo(-5, 14); c.lineTo(-6.5, 6); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 1;
    for (let v = -4; v <= 12; v += 3.5) { c.beginPath(); c.moveTo(-6.5, v); c.lineTo(6.5, v); c.stroke(); }
    c.restore();
  },
};

const upper: PartDef = {
  id: 'upper', name: { en: 'Upper Shell', vi: 'Vỏ trên' }, side: 'A', z: 5, x: 0, y: 0, w: 230, h: 240, icon: '🟥',
  shape: UPPER, needs: ['s1', 's2', 's3', 's4', 'nozzle', 'rear'], tool: 'brush', elev: 18, thick: 36, round: 34, body: shade(RED, -0.18),
  bumps: [
    { kind: 'cyl', x: COOL[0], y: COOL[1], w: 10, height: 3.5, color: '#9fdcf7' },
    { kind: 'box', x: SPEED[0], y: SPEED[1], w: 7, h: 8, height: 3.5, color: GOLD, metal: true },
    { kind: 'box', x: HEAT[0], y: HEAT[1], w: 7, h: 8, height: 3.5, color: GOLD, metal: true },
  ],
  draw(c, s) {
    slab(c, UPPER, RED, BY - 33, 120, { depth: 10, shadow: 0 });
    c.save();
    c.clip(UPPER);
    // barrel: lit tube with a long gloss highlight
    const g = c.createLinearGradient(0, BY - 33, 0, BY + 33);
    g.addColorStop(0, 'rgba(60,0,10,0.4)'); g.addColorStop(0.26, 'rgba(255,255,255,0.22)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,0,10,0.45)');
    c.fillStyle = g;
    c.fillRect(-100, BY - 34, 182, 68);
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.beginPath(); c.ellipse(-10, BY - 15, 70, 4, -0.02, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.beginPath(); c.ellipse(-30, BY - 16, 26, 1.6, -0.02, 0, Math.PI * 2); c.fill();
    // handle: tube shading across it, then the soft-touch grip
    inHandle(c, () => {
      const h = c.createLinearGradient(-20, 0, 20, 0);
      h.addColorStop(0, 'rgba(60,0,10,0.3)'); h.addColorStop(0.35, 'rgba(255,255,255,0.14)'); h.addColorStop(0.6, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(60,0,10,0.25)');
      c.fillStyle = h; c.fillRect(-22, 20, 44, HL);
      c.fillStyle = CHAR;
      c.beginPath(); c.moveTo(-30, 82); c.quadraticCurveTo(0, 70, 30, 82); c.lineTo(30, HL + 10); c.lineTo(-30, HL + 10); c.closePath(); c.fill();
      const gg = c.createLinearGradient(-16, 0, 16, 0);
      gg.addColorStop(0, 'rgba(0,0,0,0.3)'); gg.addColorStop(0.4, 'rgba(255,255,255,0.12)'); gg.addColorStop(1, 'rgba(0,0,0,0.35)');
      c.fillStyle = gg; c.fillRect(-20, 70, 40, HL - 60);
      // fine grip texture
      c.fillStyle = 'rgba(255,255,255,0.1)';
      for (let v = 88; v < HL - 4; v += 4) for (let u = -14 + (v % 8 ? 2 : 0); u <= 14; u += 4) c.fillRect(u, v, 1.2, 1.2);
      // gold trim line where red meets grip
      c.strokeStyle = GOLD; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(-30, 80); c.quadraticCurveTo(0, 68, 30, 80); c.stroke();
      // switch tracks + their little icons
      for (const v of [SPEED_V, HEAT_V]) {
        c.fillStyle = '#231b1f'; c.beginPath(); rrc(c, SW_U, v, 9, 18, 4.5); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.75)';
        for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(SW_U - 8, v - 6 + i * 6, 1.1, 0, Math.PI * 2); c.fill(); }
      }
      // fan + heat icons beside the tracks
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.1;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        c.beginPath(); c.ellipse(-6 + Math.cos(a) * 2.2, SPEED_V + Math.sin(a) * 2.2, 2.2, 1.1, a, 0, Math.PI * 2); c.stroke();
      }
      c.beginPath();
      for (let i = 0; i < 3; i++) { const u = -8 + i * 2.4; c.moveTo(u, HEAT_V + 4); c.bezierCurveTo(u - 2, HEAT_V + 1, u + 2, HEAT_V - 1, u, HEAT_V - 4); }
      c.stroke();
      // cool-shot ring with a snowflake tick
      c.strokeStyle = '#9fdcf7'; c.lineWidth = 1.4;
      c.beginPath(); c.arc(SW_U, COOL_V, 7.5, 0, Math.PI * 2); c.stroke();
      if (s.power > 0) {
        c.fillStyle = `rgba(255,120,80,${s.power})`;
        c.beginPath(); c.arc(-7, COOL_V + 1, 2.2, 0, Math.PI * 2); c.fill();
      }
    });
    // gold collar at the front, chrome-ish band at the back
    for (const [x, col] of [[74, GOLD], [-90, GOLD]] as const) {
      const cg = c.createLinearGradient(0, BY - 40, 0, BY + 40);
      cg.addColorStop(0, shade(col, -0.4)); cg.addColorStop(0.3, shade(col, 0.5)); cg.addColorStop(0.6, col); cg.addColorStop(1, shade(col, -0.45));
      c.fillStyle = cg; c.fillRect(x - 2.5, BY - 40, 5, 80);
    }
    c.restore();
    // seam + brand
    c.strokeStyle = shade(RED, -0.35); c.lineWidth = 1;
    c.beginPath(); c.moveTo(-84, BY + 22); c.lineTo(68, BY + 20); c.stroke();
    text(c, 'CHILL PRO', -6, BY + 12, 11, shade(GOLD, 0.2), { font: 'bold' });
    for (const [x, y] of SCREWS) {
      c.fillStyle = 'rgba(70,0,10,0.45)'; c.beginPath(); c.arc(x, y + 0.5, 9.5, 0, Math.PI * 2); c.fill();
    }
    glossStreak(c, UPPER, -90, BY - 34, 160, 40, 0.3);
  },
};

// Concentrator nozzle: a dark cone flattening into a narrow slot (part-local, base at x -26).
const NOZZLE = shapeFrom(roundedPts([[-26, -34, 6], [20, -17, 6], [28, -14, 3], [28, 14, 3], [20, 17, 6], [-26, 34, 6]]));
const nozzle: PartDef = {
  id: 'nozzle', name: { en: 'Concentrator Nozzle', vi: 'Đầu thổi' }, side: 'A', z: 6, x: 104, y: BY, w: 54, h: 68, icon: '🔺',
  shape: NOZZLE, elev: -14, thick: 60, round: 30, body: shade(CHAR, -0.2),
  draw(c) {
    slab(c, NOZZLE, CHAR, -34, 34, { depth: 8, shadow: 0 });
    c.save();
    c.clip(NOZZLE);
    // cone shading: lit band along the top, falling off to the edges
    const g = c.createLinearGradient(0, -34, 0, 34);
    g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.3, 'rgba(255,255,255,0.22)'); g.addColorStop(0.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.4)');
    c.fillStyle = g; c.fillRect(-26, -34, 54, 68);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath(); c.moveTo(-22, -15); c.lineTo(18, -9); c.lineTo(18, -7); c.lineTo(-22, -11); c.closePath(); c.fill();
    // the slot lip at the tip
    c.fillStyle = '#120d0f'; c.fillRect(23, -15, 5, 30);
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(21, -15, 1.5, 30);
    // snap collar at the base
    const cg = c.createLinearGradient(0, -34, 0, 34);
    cg.addColorStop(0, shade(GOLD, -0.4)); cg.addColorStop(0.3, shade(GOLD, 0.5)); cg.addColorStop(1, shade(GOLD, -0.45));
    c.fillStyle = cg; c.fillRect(-26, -34, 6, 68);
    c.restore();
  },
};

// Rear cap: a chrome twist-lock ring the intake filter sits in.
const REAR = rrPath(0, 0, 14, 86, 7);
const rear: PartDef = {
  id: 'rear', name: { en: 'Rear Cap', vi: 'Nắp sau' }, side: 'A', z: 6, x: -100, y: BY, w: 14, h: 90, icon: '⭕',
  shape: REAR, needs: ['filter'], elev: -11, thick: 54, round: 7, mat: 'metal', body: '#9aa0a8',
  draw(c) {
    const g = c.createLinearGradient(0, -45, 0, 45);
    g.addColorStop(0, '#6a6e76'); g.addColorStop(0.28, '#ffffff'); g.addColorStop(0.5, CHROME); g.addColorStop(1, '#5a5e66');
    c.fillStyle = g; c.fill(REAR);
    c.fillStyle = shade(GOLD, 0.1); c.fillRect(3, -42, 2, 84);
    // grip notches for twisting it off
    c.fillStyle = 'rgba(40,44,50,0.45)';
    for (let y = -36; y <= 36; y += 6) c.fillRect(-6, y, 7, 1.6);
  },
};

// Intake filter: a fine mesh dome bulging out of the ring.
const FILTER = ellPath(0, 0, 16, 34);
const filter: PartDef = {
  id: 'filter', name: { en: 'Intake Filter', vi: 'Lưới lọc gió' }, side: 'A', z: 7, x: -112, y: BY, w: 32, h: 68, icon: '⚪',
  shape: FILTER, tool: 'brush', elev: -7, thick: 46, round: 16, mat: 'metal', body: '#4a4e57',
  draw(c) {
    c.fillStyle = '#26282e'; c.fill(FILTER);
    c.save();
    c.clip(FILTER);
    // woven mesh, shaded like a dome
    c.strokeStyle = 'rgba(205,210,218,0.75)'; c.lineWidth = 0.7;
    for (let k = -40; k <= 40; k += 2.6) {
      c.beginPath(); c.moveTo(-20, k); c.lineTo(20, k); c.stroke();
      c.beginPath(); c.moveTo(k * 0.5, -40); c.lineTo(k * 0.5, 40); c.stroke();
    }
    const g = c.createRadialGradient(-4, -10, 2, 0, 0, 36);
    g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
    c.fillStyle = g; c.fill(FILTER);
    c.restore();
    // chrome rim + centre hub
    c.strokeStyle = CHROME; c.lineWidth = 2.5; c.stroke(FILTER);
    c.fillStyle = '#9aa0a8'; c.beginPath(); c.ellipse(0, 0, 4, 7, 0, 0, Math.PI * 2); c.fill();
  },
};

// The air overlay is painted on the gadget's top plane; the slot sits lower down, so aim a bit below the axis.
const TIP = { x: 134, y: BY + 34 };

export const dryer: DeviceDef = {
  id: 'dryer',
  name: { en: 'Hair Dryer', vi: 'Máy sấy tóc' },
  w: 280, h: 250,
  hasBack: false,
  parts: [
    lowerShell, heater, motor, board, cord, upper, nozzle, rear, filter,
    ...SCREWS.map(([x, y], i) => screw(`s${i + 1}`, x, y, 'A')),
  ],
  working(c, t, k) {
    // warm glow at the slot + rippling air lines
    c.save();
    c.globalAlpha = k;
    const g = c.createRadialGradient(TIP.x, TIP.y, 4, TIP.x, TIP.y, 60);
    g.addColorStop(0, 'rgba(255,170,60,0.75)'); g.addColorStop(1, 'rgba(255,120,40,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(TIP.x, TIP.y, 60, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = 2.5; c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const ph = (t * 1.6 + i * 0.25) % 1;
      const y = TIP.y - 20 + i * 13;
      c.globalAlpha = k * (1 - ph);
      c.beginPath();
      c.moveTo(TIP.x + ph * 60, y);
      c.quadraticCurveTo(TIP.x + 15 + ph * 60, y - 5, TIP.x + 30 + ph * 60, y);
      c.stroke();
    }
    c.restore();
  },
  workFx: { kind: 'steam', x: TIP.x, y: TIP.y, color: '#ffd9a0', dir: 0 },
};
