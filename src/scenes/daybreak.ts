// Between two days: the shop front seen from the street. Dusk, the shutter
// rolls down and the lamps come on; night; dawn: the calendar flips to the new
// day; morning, the shutter rolls up on the lit workshop. The shop is the 3D storefront
// as renovated so far (three/storefront3d.ts), dimmed for the night; without
// WebGL the old flat drawing stands in. `t` runs 0..1 over the whole sequence.

import { type C, rr, rrc, text, shade, rng } from '../core/draw';
import { drawStreet, type Sky } from './city';
import { t as tx } from '../core/i18n';
import { storefront } from '../three/storefront3d';
import { visualsDone } from '../content/renovation';

const smooth = (a: number, b: number, x: number) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

/** How much each sky shows at time t: dusk → night → morning. */
function skies(t: number): [Sky, number][] {
  const toNight = smooth(0.12, 0.34, t), toMorning = smooth(0.5, 0.72, t);
  return [['sunset', 1 - toNight], ['night', toNight * (1 - toMorning)], ['morning', toMorning]];
}

export function drawDaybreak(c: C, t: number, day: number, W: number, H: number, U: number, dpr: number, top: number): void {
  const night = smooth(0.12, 0.34, t) * (1 - smooth(0.52, 0.7, t));
  const sf = storefront();
  if (sf) {
    // the sky over the 3D street: sunset, night, morning, cross-fading
    const SKY: Partial<Record<Sky, [string, string]>> = { sunset: ['#f39a7a', '#f7d9a6'], night: ['#151c46', '#3b3f74'], morning: ['#7fc4f0', '#d6eef9'] };
    for (const [sky, a] of skies(t)) {
      const col = SKY[sky];
      if (a < 0.01 || !col) continue;
      const g = c.createLinearGradient(0, 0, 0, H * 0.6);
      g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
      c.save(); c.globalAlpha = a; c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
    }
    // the shop as renovated so far, the whole screen tall
    sf.focus(null);
    sf.look = { ...sf.want };
    // the shutter rolls down at dusk and up again in the morning
    const down = smooth(0.02, 0.2, t) * (1 - smooth(0.74, 0.9, t));
    sf.pose(visualsDone(), null, { open: 1 - down, night });
    c.drawImage(sf.render(W, H, dpr, 1 / 60), 0, 0, W, H);
    // the night falls over it
    if (night > 0.01) {
      c.fillStyle = `rgba(14,18,48,${0.5 * night})`;
      c.fillRect(0, 0, W, H);
    }
  } else drawFlatFront(c, t, day, W, H, U, night, dpr);

  // the calendar and the day title over it all
  drawCalendar(c, t, day, W, H, U, top);
}

/** The shop front without WebGL. */
function drawFlatFront(c: C, t: number, day: number, W: number, H: number, U: number, night: number, dpr: number): void {
  // the street behind, skies cross-fading
  const streetH = H * 0.7;
  for (const [sky, a] of skies(t)) {
    if (a < 0.01) continue;
    c.save();
    c.globalAlpha = a;
    drawStreet(c, 0, 0, W, streetH, sky, dpr, U);
    c.restore();
  }
  const sw = c.createLinearGradient(0, streetH, 0, H);
  sw.addColorStop(0, shade('#8a7f8c', -night * 0.55)); sw.addColorStop(1, shade('#5a5060', -night * 0.6));
  c.fillStyle = sw;
  c.fillRect(0, streetH, W, H - streetH);
  const fx0 = W * 0.12, fx1 = W * 0.88, fy0 = H * 0.3, fy1 = H * 0.84;
  const fw = fx1 - fx0;
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.fillRect(fx0 + 6 * U, fy0 + 8 * U, fw, fy1 - fy0);
  const wall = c.createLinearGradient(fx0, 0, fx1, 0);
  wall.addColorStop(0, shade('#a8603e', -night * 0.5)); wall.addColorStop(1, shade('#7d4430', -night * 0.5));
  c.fillStyle = wall;
  c.fillRect(fx0, fy0, fw, fy1 - fy0);
  c.strokeStyle = `rgba(0,0,0,${0.18 + night * 0.1})`;
  c.lineWidth = 1;
  for (let y = fy0 + 14 * U; y < fy1; y += 14 * U) {
    c.beginPath(); c.moveTo(fx0, y); c.lineTo(fx1, y); c.stroke();
    for (let x = fx0 + (((y - fy0) / (14 * U)) % 2) * 20 * U; x < fx1; x += 40 * U) { c.beginPath(); c.moveTo(x, y - 14 * U); c.lineTo(x, y); c.stroke(); }
  }

  // shop window: warm inside, a glimpse of shelves and gadgets
  const wx0 = fx0 + fw * 0.07, wx1 = fx0 + fw * 0.66, wy0 = H * 0.45, wy1 = H * 0.77;
  const inside = c.createLinearGradient(0, wy0, 0, wy1);
  inside.addColorStop(0, shade('#f7dfaa', -night * 0.75)); inside.addColorStop(1, shade('#d9a86a', -night * 0.8));
  c.fillStyle = inside;
  c.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  c.fillStyle = shade('#7a5232', -night * 0.6);
  for (const k of [0.35, 0.68]) c.fillRect(wx0 + 6 * U, wy0 + (wy1 - wy0) * k, wx1 - wx0 - 12 * U, 5 * U);
  const r = rng(day * 13 + 7);
  const cols = ['#e8665a', '#9a4fd8', '#4fbf9f', '#f4c430', '#3f9ad6'];
  for (const k of [0.35, 0.68]) {
    for (let x = wx0 + 14 * U; x < wx1 - 20 * U; x += 26 * U + r() * 10 * U) {
      const h = 12 * U + r() * 14 * U;
      c.fillStyle = shade(cols[Math.floor(r() * cols.length)], -night * 0.6);
      c.beginPath(); rrc(c, x, wy0 + (wy1 - wy0) * k - h / 2, 16 * U + r() * 6 * U, h, 3 * U); c.fill();
    }
  }
  // the rolling shutter: down at night, up in the morning
  const down = smooth(0.02, 0.2, t) * (1 - smooth(0.74, 0.9, t));
  if (down > 0.001) {
    const sh = (wy1 - wy0) * down;
    const sg = c.createLinearGradient(0, wy0, 0, wy0 + sh);
    sg.addColorStop(0, shade('#a9b0ba', -night * 0.55)); sg.addColorStop(1, shade('#7f8792', -night * 0.55));
    c.fillStyle = sg;
    c.fillRect(wx0, wy0, wx1 - wx0, sh);
    c.strokeStyle = `rgba(0,0,0,${0.25 + night * 0.15})`;
    c.lineWidth = 1.5;
    for (let y = wy0 + 6 * U; y < wy0 + sh; y += 7 * U) { c.beginPath(); c.moveTo(wx0, y); c.lineTo(wx1, y); c.stroke(); }
    c.fillStyle = shade('#5a5f68', -night * 0.4);
    c.fillRect(wx0, wy0 + sh - 5 * U, wx1 - wx0, 5 * U);
  }
  c.strokeStyle = '#3a2418'; c.lineWidth = 6 * U;
  c.strokeRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  c.fillStyle = shade('#3a2418', 0.1);
  c.fillRect(wx0 - 6 * U, wy1, wx1 - wx0 + 12 * U, 8 * U);

  // the door with its hanging sign
  const dx0 = fx0 + fw * 0.72, dx1 = fx0 + fw * 0.93, dy0 = H * 0.5;
  c.fillStyle = shade('#4a7a6a', -night * 0.55);
  c.fillRect(dx0, dy0, dx1 - dx0, fy1 - dy0);
  c.fillStyle = shade('#f7dfaa', -night * 0.8);
  c.fillRect(dx0 + 6 * U, dy0 + 8 * U, dx1 - dx0 - 12 * U, (fy1 - dy0) * 0.42);
  c.strokeStyle = '#2a3a34'; c.lineWidth = 3 * U;
  c.strokeRect(dx0, dy0, dx1 - dx0, fy1 - dy0);
  c.fillStyle = '#e8c15a';
  c.beginPath(); c.arc(dx0 + 8 * U, dy0 + (fy1 - dy0) * 0.6, 3 * U, 0, Math.PI * 2); c.fill();
  const open = t > 0.86 || t < 0.04;
  const sx = (dx0 + dx1) / 2, sy = dy0 + 30 * U;
  const swing = Math.sin(t * 40) * 0.05 * (open ? 1 : 0.4);
  c.save();
  c.translate(sx, sy - 16 * U);
  c.rotate(swing);
  c.strokeStyle = '#2a1b15'; c.lineWidth = 1.2 * U;
  c.beginPath(); c.moveTo(-12 * U, 10 * U); c.lineTo(0, 0); c.lineTo(12 * U, 10 * U); c.stroke();
  c.fillStyle = open ? '#7ccf3c' : '#e0443a';
  c.beginPath(); rrc(c, 0, 18 * U, 44 * U, 18 * U, 4 * U); c.fill();
  text(c, open ? 'OPEN' : 'CLOSED', 0, 19 * U, 9.5 * U, '#fff', { font: 'bold' });
  c.restore();

  // striped awning with a scalloped edge
  const ay0 = fy0 - 4 * U, ay1 = fy0 + 46 * U;
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x0 = fx0 - 8 * U + ((fw + 16 * U) / n) * i;
    const x1 = x0 + (fw + 16 * U) / n;
    c.fillStyle = shade(i % 2 ? '#f4efe2' : '#e8665a', -night * 0.5);
    c.beginPath();
    c.moveTo(x0 + 6 * U, ay0); c.lineTo(x1 + 6 * U, ay0); c.lineTo(x1, ay1); c.quadraticCurveTo((x0 + x1) / 2, ay1 + 12 * U, x0, ay1); c.closePath();
    c.fill();
  }
  c.fillStyle = `rgba(0,0,0,${0.18 + night * 0.1})`;
  c.fillRect(fx0, ay1 + 6 * U, fw, 10 * U);

  // the sign board: neon at night
  const by = fy0 - 34 * U;
  c.fillStyle = shade('#3a2418', -night * 0.3);
  c.beginPath(); rrc(c, W / 2, by, fw * 0.92, 40 * U, 8 * U); c.fill();
  const neon = night > 0.05 ? night * (0.85 + Math.sin(t * 90) * 0.08 + (t > 0.13 && t < 0.15 ? -0.6 : 0)) : 0;
  c.save();
  if (neon > 0) { c.shadowColor = '#ff7ab6'; c.shadowBlur = 16 * U * neon; }
  text(c, tx('shopName'), W / 2, by + 1, 17 * U, neon > 0.1 ? `rgba(255,${180 + 60 * (1 - neon)},${220},1)` : '#ffe7b8', { font: 'bold' });
  c.restore();

  // a sleepy "z z" in the night
  if (night > 0.3) {
    c.save();
    c.globalAlpha = (night - 0.3) * 1.4;
    for (let i = 0; i < 3; i++) {
      const k = (t * 3 + i * 0.33) % 1;
      text(c, 'z', wx1 - 30 * U + k * 26 * U, wy0 - 10 * U - k * 50 * U, (12 + i * 4) * U, '#fff6d8', { font: 'bold' });
    }
    c.restore();
  }
}

function drawCalendar(c: C, t: number, day: number, W: number, H: number, U: number, top: number): void {
  // the calendar: the page tears off at dawn
  const cx = W / 2, cy = top + 92 * U, cw = 116 * U, chh = 120 * U;
  const flip = smooth(0.56, 0.72, t);
  const prev = Math.max(1, day - 1);
  const card = (n: number, y: number, sy2: number, alpha: number) => {
    c.save();
    c.globalAlpha = alpha;
    c.translate(cx, y);
    c.scale(1, sy2);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath(); rr(c, -cw / 2 + 4 * U, -chh / 2 + 6 * U, cw, chh, 10 * U); c.fill();
    c.fillStyle = '#fbf6ea';
    c.beginPath(); rr(c, -cw / 2, -chh / 2, cw, chh, 10 * U); c.fill();
    c.fillStyle = '#e0443a';
    c.beginPath(); rr(c, -cw / 2, -chh / 2, cw, 30 * U, 10 * U); c.fill();
    c.fillRect(-cw / 2, -chh / 2 + 18 * U, cw, 12 * U);
    text(c, tx('day').toUpperCase(), 0, -chh / 2 + 16 * U, 14 * U, '#fff', { font: 'bold' });
    text(c, String(n), 0, 16 * U, 58 * U, '#2b2b33', { font: 'bold' });
    for (const rx of [-cw * 0.3, cw * 0.3]) { c.fillStyle = '#8a8f99'; c.beginPath(); c.arc(rx, -chh / 2, 5 * U, 0, Math.PI * 2); c.fill(); }
    c.restore();
  };
  card(day, cy, 1, 1);
  if (day > 1 && flip < 1) {
    // yesterday's page lifts from the top edge and flies off
    const k = flip;
    card(prev, cy - k * 60 * U, Math.max(0.02, 1 - k * 1.1), 1 - k);
  }

  // the new day's title
  const title = smooth(0.78, 0.9, t);
  if (title > 0) {
    c.save();
    c.globalAlpha = title;
    c.translate(W / 2, H * 0.9);
    const s = 0.7 + 0.3 * title + Math.sin(title * Math.PI) * 0.08;
    c.scale(s, s);
    text(c, `${tx('day')} ${day}`, 0, 0, 44 * U, '#ffe7a0', { font: 'bold', stroke: '#5a3a1a', strokeW: 7 * U });
    c.restore();
  }
}
