// Candy-bar phone from the early 2000s: cobalt covers, rubber keypad, green LCD. Two faces.

import { slab, shade, rrc, rrPath, glossStreak, text, shapeFrom, rrPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';
import { pcb, cylH, boss, ribbon } from './kit';

const COBALT = '#4a7be0';
const CHASSIS = '#4a4f5a';
const KEY = '#e4ebf7';
const LCD_OFF = '#8f9f7a';
const LCD_ON = '#b8e07a';
const GOLD = '#e8c15a';

const BODY = rrPath(0, 0, 124, 290, 34);
const BODY_IN = rrPath(0, 0, 108, 274, 28);

// Keypad grid (keypad-local): row 0 = call / nav / end, then 1-9, *, 0, #.
const KEYS: [number, number, string][] = [];
const ROWS = ['', '123', '456', '789', '*0#'];
ROWS.forEach((r, j) => [...(r || '   ')].forEach((l, i) => KEYS.push([-30 + i * 30, -44 + j * 23, l])));
const KEYPAD_Y = 70;
const LCD_Y = -56;
// Back side, x mirrored (seen from behind)
const SCREWS: [number, number][] = [[-40, -84], [40, -84], [-46, 122], [46, 122]];

const chassis: PartDef = {
  id: 'chassis', name: { en: 'Inner Chassis', vi: 'Khung máy' }, side: 'A', z: 0, x: 0, y: 0, w: 124, h: 290, icon: '📱',
  shape: BODY, needs: ['board', 'keypad', 'lcd', 'antenna'], thick: 28, cavity: 16, round: 16, wall: 8,
  draw(c, s) {
    slab(c, BODY, CHASSIS, -145, 145, { depth: 12, shadow: 0 });
    c.fillStyle = shade(CHASSIS, -0.3);
    c.fill(BODY_IN);
    c.save(); c.clip(BODY_IN);
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 10; c.translate(3, 5); c.stroke(BODY_IN);
    c.restore();
    if (s.view === 'F' || !s.inDevice) {
      // keypad contacts: gold rings the rubber keys press on
      for (const [x, y] of KEYS) {
        c.strokeStyle = GOLD; c.lineWidth = 2;
        c.beginPath(); c.arc(x, KEYPAD_Y + y, 6, 0, Math.PI * 2); c.stroke();
        c.fillStyle = shade(GOLD, -0.2);
        c.beginPath(); c.arc(x, KEYPAD_Y + y, 2.4, 0, Math.PI * 2); c.fill();
      }
      // LCD frame + earpiece
      c.fillStyle = '#2a2d33';
      c.beginPath(); rrc(c, 0, LCD_Y, 94, 74, 6); c.fill();
      ribbon(c, 0, LCD_Y + 42, 40, 8);
      c.fillStyle = '#23252b';
      c.beginPath(); c.arc(0, -122, 10, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#5a5f6a';
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(i * 3.5, -122, 1, 0, Math.PI * 2); c.fill(); }
    } else {
      // inside, seen from the back: battery well + screw posts
      c.fillStyle = shade(CHASSIS, -0.5);
      c.beginPath(); rrc(c, 0, 36, 100, 124, 8); c.fill();
      c.strokeStyle = shade(CHASSIS, 0.1); c.lineWidth = 2;
      c.beginPath(); c.moveTo(-50, -100); c.lineTo(50, -100); c.stroke();
      for (const [x, y] of SCREWS) boss(c, x, y, CHASSIS);
    }
  },
};

const coverPath = shapeFrom(rrPts(0, 0, 124, 290, 34), [rrPts(0, LCD_Y, 82, 62, 8), rrPts(0, KEYPAD_Y, 98, 120, 16)]);
const cover: PartDef = {
  id: 'cover', name: { en: 'Front Cover', vi: 'Vỏ mặt trước' }, side: 'F', z: 7, x: 0, y: 0, w: 124, h: 290, icon: '🟦',
  shape: coverPath, tool: 'sponge', thick: 9, round: 8,
  draw(c, s) {
    slab(c, coverPath, COBALT, -145, 145, { depth: 6, shadow: 0 });
    glossStreak(c, coverPath, -62, -145, 124, 200, 0.3);
    // silver trim around the screen window
    c.strokeStyle = '#d5dbe4'; c.lineWidth = 3;
    c.beginPath(); rrc(c, 0, LCD_Y, 88, 68, 10); c.stroke();
    // earpiece slot
    c.fillStyle = shade(COBALT, -0.55);
    c.beginPath(); rrc(c, 0, -122, 34, 6, 3); c.fill();
    text(c, 'NOKKA', 0, -102, 11, shade(COBALT, 0.6), { font: 'bold' });
    if (!s.inDevice) {
      // loose cover: the window is a clear plastic lens
      c.fillStyle = 'rgba(200,225,255,0.25)';
      c.beginPath(); rrc(c, 0, LCD_Y, 82, 62, 8); c.fill();
    }
  },
};

const keypad: PartDef = {
  id: 'keypad', name: { en: 'Rubber Keypad', vi: 'Bàn phím số' }, side: 'F', z: 5, x: 0, y: KEYPAD_Y, w: 96, h: 118, icon: '🔢',
  shape: rrPath(0, 0, 96, 118, 14), needs: ['cover'], tool: 'brush', elev: 23, thick: 4, mat: 'rubber', body: '#9aa6bb',
  bumps: KEYS.map(([x, y], i) => i === 1
    ? { kind: 'cyl' as const, x, y, w: 24, height: 6, color: '#c9d3e6' }
    : { kind: 'box' as const, x, y, w: 25, h: 17, height: 6, color: i === 0 ? '#7fd38f' : i === 2 ? '#ff8a80' : KEY }),
  draw(c, s) {
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -3, 5, 96, 118, 14); c.fill();
    c.fillStyle = '#b9c3d6'; c.beginPath(); rrc(c, 0, 0, 96, 118, 14); c.fill();
    // green backlight bleeding round the keys when it powers on
    if (s.power > 0) {
      c.fillStyle = `rgba(160,255,140,${0.45 * s.power})`;
      for (const [x, y] of KEYS) { c.beginPath(); rrc(c, x, y, 30, 21, 8); c.fill(); }
    }
    for (const [x, y, l] of KEYS) {
      c.fillStyle = KEY; c.beginPath(); rrc(c, x, y, 25, 17, 7); c.fill();
      if (l.trim()) text(c, l, x, y + 1, 11, '#3a4560', { font: 'bold' });
    }
    if (s.broken) {
      // worn-through keys: shiny flattened tops with a split
      c.strokeStyle = '#6a7690'; c.lineWidth = 1.4;
      for (const [x, y] of [KEYS[4], KEYS[8], KEYS[10]]) {
        c.beginPath(); c.moveTo(x - 9, y - 4); c.lineTo(x - 1, y + 2); c.lineTo(x + 8, y - 5); c.stroke();
      }
    }
  },
};

const lcdPath = rrPath(0, 0, 92, 72, 6);
const lcd: PartDef = {
  id: 'lcd', name: { en: 'LCD Screen', vi: 'Màn hình LCD' }, side: 'F', z: 5, x: 0, y: LCD_Y, w: 92, h: 72, icon: '🖥',
  shape: lcdPath, needs: ['cover'], elev: 22, thick: 5, mat: 'glass', body: '#8b9097',
  draw(c, s) {
    const m = c.createLinearGradient(0, -36, 0, 36);
    m.addColorStop(0, '#d7dade'); m.addColorStop(1, '#8b9097');
    c.fillStyle = m; c.beginPath(); rrc(c, 0, 0, 92, 72, 6); c.fill();
    const on = s.power > 0;
    const g = c.createLinearGradient(0, -30, 0, 30);
    g.addColorStop(0, on ? shade(LCD_ON, 0.2) : LCD_OFF);
    g.addColorStop(1, on ? LCD_ON : shade(LCD_OFF, -0.2));
    c.fillStyle = g; c.beginPath(); rrc(c, 0, -2, 80, 58, 3); c.fill();
    if (on) {
      c.globalAlpha = s.power;
      // signal + battery bars, a little snake, the clock
      c.fillStyle = '#2f4a1c';
      for (let i = 0; i < 4; i++) c.fillRect(-36, 18 - i * 7, 3 + i * 1.5, 4);
      for (let i = 0; i < 4; i++) c.fillRect(33 - i * 1.5, 18 - i * 7, 3 + i * 1.5, 4);
      text(c, 'NOKKA', 0, -16, 13, '#2f4a1c', { font: 'bold' });
      const hd = Math.floor(s.time * 4) % 10;
      for (let i = 0; i < 6; i++) c.fillRect(-16 + ((hd + i) % 10) * 3, 6, 3, 3);
      c.globalAlpha = 1;
    }
    // protective film: a slightly milky sheet with a lifted corner tab
    c.fillStyle = 'rgba(255,255,255,0.14)';
    c.beginPath(); rrc(c, 0, -2, 84, 62, 4); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath(); c.moveTo(42, -33); c.lineTo(42, -23); c.lineTo(32, -33); c.closePath(); c.fill();
    if (s.broken) {
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 0.8;
      for (const [x0, y0, x1, y1] of [[-36, -20, 10, 14], [-20, -28, 30, 6], [-38, 4, -6, 24], [6, -24, 36, 18], [-10, -6, 20, -26]]) {
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
      // air bubbles under the scuffed film
      c.strokeStyle = 'rgba(255,255,255,0.45)';
      for (const [x, y, r] of [[-24, 14, 4], [22, -12, 3], [12, 20, 2.5]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); }
    }
    c.fillStyle = 'rgba(255,255,255,0.16)';
    c.beginPath(); c.moveTo(-40, -31); c.lineTo(-12, -31); c.lineTo(-40, 6); c.closePath(); c.fill();
  },
};


const backCover: PartDef = {
  id: 'bcover', name: { en: 'Back Cover', vi: 'Nắp lưng' }, side: 'B', z: 8, x: 0, y: 0, w: 124, h: 290, icon: '🟦',
  shape: BODY, tool: 'sponge', thick: 10, round: 9,
  draw(c) {
    slab(c, BODY, COBALT, -145, 145, { depth: 8, shadow: 0 });
    glossStreak(c, BODY, -62, -145, 124, 200, 0.24);
    // release catch at the top
    c.fillStyle = shade(COBALT, -0.35);
    c.beginPath(); rrc(c, 0, -126, 40, 12, 6); c.fill();
    c.fillStyle = shade(COBALT, 0.25);
    c.beginPath(); rrc(c, 0, -127, 30, 5, 2.5); c.fill();
    text(c, 'NOKKA', 0, -20, 15, shade(COBALT, 0.45), { font: 'bold' });
    // loudspeaker holes
    c.fillStyle = shade(COBALT, -0.55);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
      c.beginPath(); c.arc(-10.5 + j * 7, 96 + i * 7, 1.8, 0, Math.PI * 2); c.fill();
    }
  },
};

const batPath = rrPath(0, 0, 96, 118, 8);
const battery: PartDef = {
  id: 'battery', name: { en: 'Battery', vi: 'Pin' }, side: 'B', z: 6, x: 0, y: 36, w: 96, h: 118, icon: '🔋',
  shape: batPath, needs: ['bcover'], thick: 9, round: 4, body: '#2c3038',
  draw(c, s) {
    slab(c, batPath, '#3a3f4a', -59, 59, { depth: 5, shadow: 0 });
    c.fillStyle = '#f2f2f2'; c.beginPath(); rrc(c, 0, 8, 80, 74, 6); c.fill();
    c.fillStyle = '#4a7be0'; c.fillRect(-40, -14, 80, 10);
    text(c, 'Li-ion 3.7V', 0, 14, 9, '#3a3f4a', { font: 'bold' });
    text(c, '900 mAh', 0, 28, 8, '#6a6f7a');
    // gold contacts on the top end
    for (const x of [-18, -6, 6, 18]) {
      const g = c.createLinearGradient(0, -56, 0, -46);
      g.addColorStop(0, shade(GOLD, -0.3)); g.addColorStop(0.4, shade(GOLD, 0.5)); g.addColorStop(1, shade(GOLD, -0.3));
      c.fillStyle = g; c.beginPath(); rrc(c, x, -50, 7, 10, 1.5); c.fill();
    }
    if (s.broken) {
      // puffy, leaking cell
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.beginPath(); c.ellipse(0, 6, 34, 26, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(210,190,90,0.7)';
      c.beginPath(); c.ellipse(30, 48, 8, 5, 0.3, 0, Math.PI * 2); c.fill();
    }
  },
};

const sim: PartDef = {
  id: 'sim', name: { en: 'SIM Tray', vi: 'Khay SIM' }, side: 'B', z: 5, x: 0, y: 22, w: 48, h: 36, icon: '💳',
  shape: rrPath(0, 0, 48, 36, 4), needs: ['battery'], thick: 3, mat: 'metal', body: '#9aa1a8',
  draw(c) {
    const g = c.createLinearGradient(0, -18, 0, 18);
    g.addColorStop(0, '#e6e9ee'); g.addColorStop(1, '#9aa1a8');
    c.fillStyle = 'rgba(10,20,40,0.3)'; c.beginPath(); rrc(c, -2, 3, 48, 36, 4); c.fill();
    c.fillStyle = g; c.beginPath(); rrc(c, 0, 0, 48, 36, 4); c.fill();
    // the SIM card itself: orange with a gold chip and a clipped corner
    c.fillStyle = '#ff9a4a';
    c.beginPath(); c.moveTo(-18, -12); c.lineTo(12, -12); c.lineTo(18, -6); c.lineTo(18, 12); c.lineTo(-18, 12); c.closePath(); c.fill();
    c.fillStyle = GOLD; c.beginPath(); rrc(c, -6, 0, 14, 12, 2); c.fill();
    c.strokeStyle = shade(GOLD, -0.35); c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(-13, 0); c.lineTo(1, 0); c.moveTo(-6, -6); c.lineTo(-6, 6); c.stroke();
  },
};

const board: PartDef = {
  id: 'board', name: { en: 'Main Board', vi: 'Bo mạch chính' }, side: 'B', z: 4, x: 0, y: 0, w: 96, h: 176, icon: '🟩',
  shape: rrPath(0, 0, 96, 176, 10), needs: ['s1', 's2', 's3', 's4', 'sim', 'vibra'], thick: 4, mat: 'pcb', body: '#1d4a5c',
  draw(c, s) {
    pcb(c, 96, 176, 77, '#2b6f86');
    // shield can over the radio
    c.fillStyle = '#c9ced6'; c.beginPath(); rrc(c, 0, -50, 60, 36, 3); c.fill();
    c.strokeStyle = '#8b9097'; c.lineWidth = 1; c.beginPath(); rrc(c, 0, -50, 60, 36, 3); c.stroke();
    // battery spring fingers
    for (const x of [-18, -6, 6, 18]) { c.fillStyle = GOLD; c.fillRect(x - 3, -28, 6, 8); }
    if (s.broken) {
      const g = c.createRadialGradient(-20, 40, 1, -20, 40, 22);
      g.addColorStop(0, 'rgba(20,12,8,0.95)'); g.addColorStop(0.6, 'rgba(60,30,10,0.6)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = g; c.beginPath(); c.arc(-20, 40, 22, 0, Math.PI * 2); c.fill();
    }
  },
};

const antPath = rrPath(0, 0, 92, 30, 10);
const antenna: PartDef = {
  id: 'antenna', name: { en: 'Antenna', vi: 'Ăng-ten' }, side: 'B', z: 5, x: 0, y: -118, w: 92, h: 30, icon: '📶',
  shape: antPath, needs: ['bcover'], thick: 8, round: 4, body: '#23252b',
  draw(c, s) {
    slab(c, antPath, '#2e3138', -15, 15, { depth: 4, shadow: 0 });
    // gold meander strip
    c.strokeStyle = s.broken ? '#8a7440' : GOLD; c.lineWidth = 2.5;
    c.beginPath();
    for (let i = 0; i <= 8; i++) { const x = -36 + i * 9; c.lineTo(x, i % 2 ? -7 : 7); }
    c.stroke();
    if (s.broken) {
      // snapped trace
      c.strokeStyle = '#2e3138'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(4, -9); c.lineTo(10, 9); c.stroke();
    }
    c.fillStyle = GOLD;
    c.beginPath(); c.arc(-40, 0, 3, 0, Math.PI * 2); c.arc(40, 0, 3, 0, Math.PI * 2); c.fill();
  },
};

const vibra: PartDef = {
  id: 'vibra', name: { en: 'Vibration Motor', vi: 'Mô-tơ rung' }, side: 'B', z: 5, x: 26, y: -62, w: 34, h: 18, icon: '📳',
  shape: rrPath(0, 0, 34, 18, 8), needs: ['bcover'], thick: 10, round: 8, mat: 'metal', body: '#8b9097',
  draw(c, s) {
    c.save(); c.translate(-3, 0);
    cylH(c, 24, 16, '#c9ced6', '#d9b25a');
    c.restore();
    // tiny eccentric weight
    c.save(); c.translate(12, 0); c.rotate(s.power > 0 ? s.time * 30 : 0.5);
    c.fillStyle = '#c99a3a'; c.beginPath(); c.arc(0, 0, 6, Math.PI, 0); c.closePath(); c.fill();
    c.restore();
    if (s.broken) { c.fillStyle = 'rgba(30,20,15,0.7)'; c.beginPath(); c.ellipse(-4, 1, 8, 6, 0, 0, Math.PI * 2); c.fill(); }
  },
};

export const phone: DeviceDef = {
  id: 'phone',
  name: { en: 'Candy-Bar Phone', vi: 'Điện thoại cục gạch' },
  w: 124, h: 290,
  hasBack: true,
  parts: [
    chassis, cover, keypad, lcd, backCover, battery, sim, board, antenna, vibra,
    ...SCREWS.map(([x, y], i) => screw(`s${i + 1}`, x, y, 'B', 7, ['bcover'])),
  ],
  working(c, t, k) {
    c.save();
    c.globalAlpha = k * (0.5 + Math.sin(t * 5) * 0.15);
    const g = c.createRadialGradient(0, LCD_Y, 8, 0, LCD_Y, 90);
    g.addColorStop(0, 'rgba(190,255,130,0.55)'); g.addColorStop(1, 'rgba(190,255,130,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, LCD_Y, 90, 0, Math.PI * 2); c.fill();
    c.restore();
  },
  workFx: { kind: 'note', x: 0, y: -130, color: '#b8e07a', dir: -Math.PI / 2 },
};

