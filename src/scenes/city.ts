// The street seen through the shop window. Painted once per size + sky.

import { type C, rr, shade, rng, setFont } from '../core/draw';

export type Sky = 'morning' | 'noon' | 'sunset' | 'night';

export function skyFor(h: number, m: number): Sky {
  const t = h + m / 60;
  if (t < 10.5) return 'morning';
  if (t < 16) return 'noon';
  if (t < 18.4) return 'sunset';
  return 'night';
}

const SKIES: Record<Sky, [string, string, string]> = {
  morning: ['#9fd0f0', '#f7e2c8', '#f9c9a8'],
  noon: ['#7fb8ec', '#bfe0f5', '#e8f2f8'],
  sunset: ['#6a4f9c', '#e48aa8', '#f7b98a'],
  night: ['#1b1838', '#3a2c63', '#5a3f7a'],
};

const cache = new Map<string, HTMLCanvasElement>();

export function drawStreet(c: C, x: number, y: number, w: number, h: number, sky: Sky, dpr: number, U: number): void {
  const key = `${Math.round(w)}x${Math.round(h)}@${dpr}:${sky}`;
  let cv = cache.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const g = cv.getContext('2d')!;
    g.scale(dpr, dpr);
    paint(g, w, h, sky, U);
    if (cache.size > 6) cache.clear();
    cache.set(key, cv);
  }
  c.drawImage(cv, x, y, w, h);
}

function paint(c: C, w: number, h: number, sky: Sky, U: number): void {
  const [s0, s1, s2] = SKIES[sky];
  const night = sky === 'night';
  const g = c.createLinearGradient(0, 0, 0, h * 0.75);
  g.addColorStop(0, s0); g.addColorStop(0.6, s1); g.addColorStop(1, s2);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const r = rng(sky.length * 97 + 3);
  // sun / moon
  if (sky === 'sunset') {
    const sg = c.createRadialGradient(w * 0.7, h * 0.55, 4, w * 0.7, h * 0.55, w * 0.4);
    sg.addColorStop(0, 'rgba(255,220,170,0.9)'); sg.addColorStop(1, 'rgba(255,200,150,0)');
    c.fillStyle = sg; c.fillRect(0, 0, w, h);
  }
  if (night) {
    c.fillStyle = 'rgba(255,255,240,0.9)';
    for (let i = 0; i < 30; i++) c.fillRect(r() * w, r() * h * 0.4, 1.4, 1.4);
    c.fillStyle = '#fdf6d8';
    c.beginPath(); c.arc(w * 0.78, h * 0.14, 14 * U, 0, Math.PI * 2); c.fill();
  }
  // clouds
  c.fillStyle = night ? 'rgba(120,100,170,0.25)' : 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 4; i++) {
    const cx = r() * w, cy = h * (0.08 + r() * 0.2);
    for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(cx + k * 16 * U, cy + Math.sin(k) * 4, 22 * U, 9 * U, 0, 0, Math.PI * 2); c.fill(); }
  }
  // far skyline (hazy)
  const far = night ? '#3b2f5e' : sky === 'sunset' ? '#9a7bb0' : '#9fb4cc';
  c.fillStyle = far;
  let x = -10;
  while (x < w) {
    const bw = (18 + r() * 34) * U, bh = h * (0.25 + r() * 0.35);
    c.fillRect(x, h * 0.72 - bh, bw, bh + h);
    if (r() < 0.3) c.fillRect(x + bw * 0.4, h * 0.72 - bh - 14 * U, 3 * U, 14 * U);
    x += bw + 2;
  }
  // near buildings with colourful facades + signs
  const facades = night
    ? ['#5b3f6e', '#6d4a5a', '#4f4a6e', '#7a4a4a', '#4a5a6e']
    : sky === 'sunset' ? ['#c97a7a', '#d9a06a', '#9a6aa0', '#c98aa0', '#8a7ab0'] : ['#e8b48a', '#d98a7a', '#a8c0d8', '#e8d2a0', '#b8a0c8'];
  const signs = ['TEL', 'PAGES', 'RAMEN', 'SUGAR', 'CAFÉ', '24H', 'BOOKS', 'GAME'];
  x = -6 * U;
  let si = 0;
  while (x < w) {
    const bw = (60 + r() * 50) * U, bh = h * (0.35 + r() * 0.3);
    const col = facades[Math.floor(r() * facades.length)];
    const top = h * 0.86 - bh;
    c.fillStyle = shade(col, -0.25);
    c.fillRect(x + 4 * U, top + 4 * U, bw, bh + h);
    c.fillStyle = col;
    c.fillRect(x, top, bw, bh + h);
    c.fillStyle = shade(col, -0.18);
    c.fillRect(x, top, bw, 6 * U);
    // windows
    for (let wy = top + 14 * U; wy < h * 0.74; wy += 22 * U) {
      for (let wx = x + 8 * U; wx < x + bw - 16 * U; wx += 20 * U) {
        const lit = night ? r() < 0.55 : r() < 0.1;
        c.fillStyle = lit ? (night ? '#ffd88a' : '#fff1c8') : shade(col, -0.45);
        c.fillRect(wx, wy, 11 * U, 14 * U);
      }
    }
    // vertical sign
    if (r() < 0.55) {
      const s = signs[si++ % signs.length];
      const sc = ['#e0443a', '#3b7ff0', '#f5c638', '#3fc46a', '#e86fb0'][Math.floor(r() * 5)];
      const sx = x + bw - 18 * U, sy = top + 16 * U;
      c.fillStyle = sc;
      c.beginPath(); rr(c, sx, sy, 16 * U, s.length * 13 * U + 8 * U, 3 * U); c.fill();
      setFont(c, 11 * U, 'bold');
      c.fillStyle = night ? '#fffbe0' : '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      [...s].forEach((ch, i) => c.fillText(ch, sx + 8 * U, sy + 10 * U + i * 13 * U));
      if (night) {
        c.fillStyle = sc;
        c.globalAlpha = 0.25;
        c.beginPath(); c.arc(sx + 8 * U, sy + s.length * 7 * U, 26 * U, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
      }
    }
    // awning
    if (r() < 0.5) {
      const ac = ['#e0443a', '#3fa34d', '#3b7ff0'][Math.floor(r() * 3)];
      for (let i = 0; i < bw / (12 * U); i++) {
        c.fillStyle = i % 2 ? '#fff' : ac;
        c.fillRect(x + i * 12 * U, h * 0.78, 12 * U, 10 * U);
      }
    }
    x += bw + 6 * U;
  }
  // trees
  for (let i = 0; i < 3; i++) {
    const tx = w * (0.15 + i * 0.35) + r() * 20;
    c.fillStyle = '#5a3a28'; c.fillRect(tx - 2 * U, h * 0.78, 4 * U, h * 0.14);
    c.fillStyle = night ? '#2f4a3a' : sky === 'sunset' ? '#5a7a4a' : '#5f9a52';
    for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(tx + (k - 1.5) * 9 * U, h * 0.74 - (k % 2) * 8 * U, 13 * U, 0, Math.PI * 2); c.fill(); }
  }
  // street
  c.fillStyle = night ? '#2a2638' : '#9a9aa4';
  c.fillRect(0, h * 0.9, w, h * 0.1);
  if (sky === 'sunset' || night) {
    c.fillStyle = night ? 'rgba(30,20,60,0.25)' : 'rgba(120,60,120,0.12)';
    c.fillRect(0, 0, w, h);
  }
}
