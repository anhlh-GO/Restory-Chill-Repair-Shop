// What the shop has become, drawn around the counter: the sign and counter
// upgrades, the decor tiers, album gifts and the keepsakes regulars left.
// Window pieces sit on the glass behind the customer; counter pieces on top.

import { type C, rr, rrc, text, shade, setFont } from '../core/draw';
import { t } from '../core/i18n';
import type { CounterLook } from './counter';

// ---------- on the window ----------

export function drawWindowDecor(c: C, look: CounterLook, W: number, U: number, y0: number, y1: number, time: number): void {
  const g = look.gifts;
  if (g.has('stringLights')) stringLights(c, W, U, y0 + 34 * U, time);
  if (g.has('lantern')) lantern(c, W - 40 * U, y0 + 30 * U, U, time);
  // the left pane: photos; the right pane: posters
  const left = [g.has('hoangPhoto') && hoangPhoto, g.has('streetPhoto') && streetPhoto, g.has('retroPoster') && retroPoster].filter(Boolean) as Piece[];
  const right = [g.has('photoFrame') && photoFrame, g.has('kenPoster') && kenPoster, g.has('arcadePoster') && arcadePoster, g.has('kidsPostcard') && kidsPostcard].filter(Boolean) as Piece[];
  const top = y0 + (g.has('lantern') || g.has('stringLights') ? 92 : 70) * U;
  // the left column stops above the pegboard, the right one above the desk lamp
  const stepL = Math.min(70 * U, (y1 - top - 110 * U) / 2);
  const stepR = Math.min(70 * U, (y1 - top - 110 * U) / 3);
  left.forEach((p, i) => p(c, 38 * U, top + i * stepL, U, ((i % 2) - 0.5) * 0.12));
  right.forEach((p, i) => p(c, W - 38 * U, top + i * stepR, U, ((i % 2) - 0.5) * -0.12));
  if (g.has('medal')) sticker(c, W * 0.24, y0 + 62 * U, 13 * U, '#f2b632', '🏅');
  if (g.has('sticker')) sticker(c, W * 0.76, y0 + 62 * U, 13 * U, '#7ccf3c', '★');
  if (g.has('pegboard')) pegboard(c, 12 * U, y1 - 78 * U, U);
}

type Piece = (c: C, x: number, y: number, U: number, rot: number) => void;

/** A piece taped to the glass. */
function taped(c: C, x: number, y: number, w: number, h: number, rot: number, U: number, body: () => void): void {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = 'rgba(0,0,0,0.28)';
  c.fillRect(-w / 2 + 2 * U, -h / 2 + 3 * U, w, h);
  body();
  c.fillStyle = 'rgba(240,226,180,0.8)';
  c.fillRect(-8 * U, -h / 2 - 4 * U, 16 * U, 8 * U);
  c.restore();
}

const hoangPhoto: Piece = (c, x, y, U, rot) => taped(c, x, y, 40 * U, 48 * U, rot, U, () => {
  c.fillStyle = '#6b4a2e'; c.fillRect(-20 * U, -24 * U, 40 * U, 48 * U);
  c.fillStyle = '#e8dcc0'; c.fillRect(-16 * U, -20 * U, 32 * U, 34 * U);
  // two heads, sepia
  c.fillStyle = '#b08a64';
  c.beginPath(); c.arc(-6 * U, -8 * U, 5 * U, 0, Math.PI * 2); c.arc(7 * U, -7 * U, 5 * U, 0, Math.PI * 2); c.fill();
  c.fillRect(-12 * U, -2 * U, 12 * U, 14 * U); c.fillRect(2 * U, -1 * U, 11 * U, 15 * U);
  text(c, "'89", 0, 19 * U, 8 * U, '#e8dcc0', { font: 'bold' });
});

const streetPhoto: Piece = (c, x, y, U, rot) => taped(c, x, y, 56 * U, 42 * U, rot, U, () => {
  c.fillStyle = '#fbf6ea'; c.fillRect(-28 * U, -21 * U, 56 * U, 42 * U);
  c.fillStyle = '#8fc3e8'; c.fillRect(-24 * U, -17 * U, 48 * U, 28 * U);
  // a row of little people
  const cols = ['#e0569b', '#4fbf9f', '#f4c430', '#7d8fd6', '#e07b39', '#c45a8a'];
  cols.forEach((col, i) => {
    const px = -20 * U + i * 8 * U;
    c.fillStyle = col; c.fillRect(px - 3 * U, 0, 6 * U, 10 * U);
    c.fillStyle = '#f2c6a0'; c.beginPath(); c.arc(px, -3 * U, 3 * U, 0, Math.PI * 2); c.fill();
  });
});

const retroPoster: Piece = (c, x, y, U, rot) => taped(c, x, y, 42 * U, 56 * U, rot, U, () => {
  const g = c.createLinearGradient(0, -28 * U, 0, 28 * U);
  g.addColorStop(0, '#f2a03a'); g.addColorStop(1, '#d9483b');
  c.fillStyle = g; c.fillRect(-21 * U, -28 * U, 42 * U, 56 * U);
  c.fillStyle = '#fff3c8';
  c.beginPath(); c.arc(0, -4 * U, 11 * U, Math.PI, 0); c.fill();
  for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#d9483b' : '#2c2340'; c.fillRect(-21 * U, 6 * U + i * 4 * U, 42 * U, 2 * U); }
  text(c, 'RETRO', 0, 22 * U, 8 * U, '#fff', { font: 'bold' });
});

const kenPoster: Piece = (c, x, y, U, rot) => taped(c, x, y, 44 * U, 58 * U, rot, U, () => {
  c.fillStyle = '#2a1f45'; c.fillRect(-22 * U, -29 * U, 44 * U, 58 * U);
  c.strokeStyle = '#9a5be0'; c.lineWidth = 2 * U;
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, -6 * U, (5 + i * 5) * U, 0, Math.PI * 2); c.stroke(); }
  c.fillStyle = '#e94f64'; c.beginPath(); c.arc(0, -6 * U, 3 * U, 0, Math.PI * 2); c.fill();
  text(c, 'DJ KEN', 0, 16 * U, 9 * U, '#ffe28a', { font: 'bold' });
  text(c, 'LIVE', 0, 24 * U, 7 * U, '#c9a8ff', { font: 'bold' });
});

const arcadePoster: Piece = (c, x, y, U, rot) => taped(c, x, y, 44 * U, 56 * U, rot, U, () => {
  c.fillStyle = '#1f3866'; c.fillRect(-22 * U, -28 * U, 44 * U, 56 * U);
  // a pixel invader
  const px = 3 * U;
  const art = ['0010000100', '0001001000', '0011111100', '0110110110', '1111111111', '1011111101', '1010000101', '0001101100'];
  c.fillStyle = '#7ccf3c';
  art.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') c.fillRect(-15 * U + i * px, -22 * U + j * px, px, px); }));
  text(c, 'ARCADE', 0, 14 * U, 8 * U, '#ffd23f', { font: 'bold' });
  text(c, 'BIN × ÔNG', 0, 22 * U, 6.5 * U, '#fff', { font: 'bold' });
});

const kidsPostcard: Piece = (c, x, y, U, rot) => taped(c, x, y, 52 * U, 38 * U, rot, U, () => {
  c.fillStyle = '#fffaf0'; c.fillRect(-26 * U, -19 * U, 52 * U, 38 * U);
  // crayon sun, ball and a banh mi
  c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(-15 * U, -8 * U, 6 * U, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#3fa34d'; c.lineWidth = 2 * U; c.beginPath(); c.moveTo(-24 * U, 12 * U); c.lineTo(24 * U, 12 * U); c.stroke();
  c.fillStyle = '#fff'; c.strokeStyle = '#2b2b33'; c.lineWidth = 1.2 * U;
  c.beginPath(); c.arc(4 * U, 6 * U, 5 * U, 0, Math.PI * 2); c.fill(); c.stroke();
  c.fillStyle = '#d9a46a'; c.beginPath(); c.ellipse(16 * U, -6 * U, 8 * U, 3.5 * U, -0.3, 0, Math.PI * 2); c.fill();
});

function stringLights(c: C, W: number, U: number, y: number, time: number): void {
  const x0 = 14 * U, x1 = W - 14 * U, sags = 3, sag = 12 * U;
  const at = (k: number) => {
    const seg = (k * sags) % 1;
    return { x: x0 + (x1 - x0) * k, y: y + Math.sin(seg * Math.PI) * sag };
  };
  c.strokeStyle = '#2a2a2a'; c.lineWidth = 1.2 * U;
  c.beginPath();
  for (let i = 0; i <= 90; i++) { const p = at(i / 90); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); }
  c.stroke();
  const cols = ['#ffd23f', '#ff8a5b', '#7ce0c3', '#ff6fa0'];
  const n = Math.floor((x1 - x0) / (24 * U));
  for (let i = 1; i < n; i++) {
    const p = at(i / n);
    const tw = 0.7 + 0.3 * Math.sin(time * 3 + i * 1.7);
    const col = cols[i % cols.length];
    const glow = c.createRadialGradient(p.x, p.y + 4 * U, 0, p.x, p.y + 4 * U, 10 * U);
    glow.addColorStop(0, col + '88'); glow.addColorStop(1, col + '00');
    c.globalAlpha = tw;
    c.fillStyle = glow; c.beginPath(); c.arc(p.x, p.y + 4 * U, 10 * U, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
    c.fillStyle = col; c.beginPath(); c.ellipse(p.x, p.y + 4 * U, 2.6 * U, 3.6 * U, 0, 0, Math.PI * 2); c.fill();
  }
}

function lantern(c: C, x: number, y: number, U: number, time: number): void {
  const sway = Math.sin(time * 1.3) * 0.06;
  c.save();
  c.translate(x, y);
  c.rotate(sway);
  c.strokeStyle = '#2a1b15'; c.lineWidth = 1.2 * U;
  c.beginPath(); c.moveTo(0, -16 * U); c.lineTo(0, 10 * U); c.stroke();
  const glow = c.createRadialGradient(0, 26 * U, 2, 0, 26 * U, 30 * U);
  glow.addColorStop(0, 'rgba(255,140,80,0.35)'); glow.addColorStop(1, 'rgba(255,140,80,0)');
  c.fillStyle = glow; c.beginPath(); c.arc(0, 26 * U, 30 * U, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d93a2b'; c.beginPath(); c.ellipse(0, 26 * U, 14 * U, 16 * U, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(120,20,10,0.5)';
  for (const k of [-0.5, 0, 0.5]) { c.beginPath(); c.ellipse(0, 26 * U, 14 * U * Math.abs(k) + 1, 16 * U, 0, 0, Math.PI * 2); c.stroke(); }
  c.fillStyle = '#e9b44c'; c.fillRect(-7 * U, 9 * U, 14 * U, 3 * U); c.fillRect(-7 * U, 40 * U, 14 * U, 3 * U);
  c.strokeStyle = '#e9b44c'; c.lineWidth = 1.5 * U;
  for (const dx of [-3, 0, 3]) { c.beginPath(); c.moveTo(dx * U, 43 * U); c.lineTo(dx * U, 52 * U); c.stroke(); }
  c.restore();
}

function sticker(c: C, x: number, y: number, r: number, col: string, glyph: string): void {
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.arc(x + 1, y + 2, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = col; c.beginPath(); c.arc(x, y, r * 0.82, 0, Math.PI * 2); c.fill();
  text(c, glyph, x, y + 1, r * 1.05, '#fff', { font: 'bold' });
}

function pegboard(c: C, x: number, y: number, U: number): void {
  const w = 54 * U, h = 70 * U;
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x + 2 * U, y + 3 * U, w, h);
  c.fillStyle = '#c9a46a'; c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(0,0,0,0.25)';
  for (let j = 0; j < 6; j++) for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x + 7 * U + i * 10 * U, y + 7 * U + j * 11 * U, 1.3 * U, 0, Math.PI * 2); c.fill(); }
  // hanging tools: pliers, screwdriver, spanner
  c.lineCap = 'round';
  c.strokeStyle = '#e8424f'; c.lineWidth = 4 * U;
  c.beginPath(); c.moveTo(x + 12 * U, y + 14 * U); c.lineTo(x + 12 * U, y + 34 * U); c.stroke();
  c.strokeStyle = '#9aa0a8'; c.lineWidth = 2 * U;
  c.beginPath(); c.moveTo(x + 12 * U, y + 34 * U); c.lineTo(x + 12 * U, y + 52 * U); c.stroke();
  c.strokeStyle = '#3b7ff0'; c.lineWidth = 3.5 * U;
  c.beginPath(); c.moveTo(x + 26 * U, y + 14 * U); c.lineTo(x + 22 * U, y + 34 * U); c.moveTo(x + 30 * U, y + 14 * U); c.lineTo(x + 34 * U, y + 34 * U); c.stroke();
  c.strokeStyle = '#9aa0a8'; c.lineWidth = 3 * U;
  c.beginPath(); c.moveTo(x + 44 * U, y + 14 * U); c.lineTo(x + 44 * U, y + 56 * U); c.stroke();
  c.beginPath(); c.arc(x + 44 * U, y + 14 * U, 4 * U, 0, Math.PI * 2); c.stroke();
}

// ---------- on the counter ----------

export function drawCounterDecor(c: C, look: CounterLook, W: number, U: number, yC: number, time: number): void {
  const g = look.gifts;
  const top = yC - 4 * U;
  // between the customer's box (left) and the desk lamp (right)
  if (g.has('tablecloth')) tablecloth(c, W * 0.75, top, 64 * U, U);
  if (look.decor >= 3) nostalgia(c, W * 0.525, top, U);
  if (g.has('radio')) radio(c, W * 0.62, top, U, time);
  if (look.decor >= 2) tea(c, W * 0.765, top, U, time);
  if (look.decor >= 1) plant(c, W * 0.93, top, U, time);
}

function tablecloth(c: C, x: number, y: number, w: number, U: number): void {
  const h = 18 * U;
  c.save();
  c.beginPath(); c.moveTo(x - w / 2, y - 2 * U); c.lineTo(x + w / 2, y - 2 * U); c.lineTo(x + w / 2 + 4 * U, y + h); c.lineTo(x - w / 2 - 4 * U, y + h); c.closePath();
  c.fillStyle = '#fbf2dc'; c.fill();
  c.clip();
  c.fillStyle = 'rgba(208,52,44,0.75)';
  for (let i = -6; i < 8; i++) c.fillRect(x - w / 2 + i * 10 * U, y - 2 * U, 5 * U, h + 4 * U);
  c.fillStyle = 'rgba(208,52,44,0.4)';
  for (let j = 0; j < 3; j++) c.fillRect(x - w / 2 - 6 * U, y + j * 7 * U, w + 12 * U, 3.5 * U);
  c.restore();
}

function tea(c: C, x: number, y: number, U: number, time: number): void {
  // teapot
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(x, y + 1 * U, 22 * U, 4 * U, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#e8f1f2';
  c.beginPath(); c.ellipse(x, y - 13 * U, 15 * U, 13 * U, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#e8f1f2'; c.lineWidth = 3.5 * U; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x + 13 * U, y - 12 * U); c.quadraticCurveTo(x + 24 * U, y - 16 * U, x + 24 * U, y - 24 * U); c.stroke();
  c.beginPath(); c.arc(x - 16 * U, y - 13 * U, 6 * U, Math.PI * 0.5, Math.PI * 1.5); c.stroke();
  c.fillStyle = '#3f8f8a'; c.fillRect(x - 15 * U, y - 15 * U, 30 * U, 4 * U);
  c.fillStyle = '#c9d6d8'; c.beginPath(); c.ellipse(x, y - 26 * U, 7 * U, 3 * U, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#3f8f8a'; c.beginPath(); c.arc(x, y - 29 * U, 2.5 * U, 0, Math.PI * 2); c.fill();
  // steam
  c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2 * U;
  for (let i = 0; i < 2; i++) {
    const k = (time * 0.6 + i * 0.5) % 1;
    c.globalAlpha = 1 - k;
    c.beginPath(); c.moveTo(x + 24 * U, y - 26 * U - k * 18 * U); c.quadraticCurveTo(x + 28 * U, y - 32 * U - k * 18 * U, x + 23 * U, y - 38 * U - k * 18 * U); c.stroke();
  }
  c.globalAlpha = 1;
  // two cups
  for (const dx of [-24]) {
    const cx = x + dx * U;
    c.fillStyle = '#e8f1f2';
    c.beginPath(); c.moveTo(cx - 7 * U, y - 11 * U); c.lineTo(cx + 7 * U, y - 11 * U); c.lineTo(cx + 5 * U, y - 1 * U); c.lineTo(cx - 5 * U, y - 1 * U); c.closePath(); c.fill();
    c.fillStyle = '#b5762c'; c.beginPath(); c.ellipse(cx, y - 11 * U, 6 * U, 1.8 * U, 0, 0, Math.PI * 2); c.fill();
  }
}

function plant(c: C, x: number, y: number, U: number, time: number): void {
  const sway = Math.sin(time * 1.1) * 0.04;
  c.save();
  c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(0, 1 * U, 16 * U, 3.5 * U, 0, 0, Math.PI * 2); c.fill();
  c.save();
  c.rotate(sway);
  const leaves: [number, number][] = [[-0.9, 30], [-0.4, 38], [0.1, 42], [0.6, 36], [1.0, 28]];
  leaves.forEach(([a, len], i) => {
    c.save();
    c.translate(0, -18 * U);
    c.rotate(a);
    c.fillStyle = i % 2 ? '#3f8f4f' : '#56a85e';
    c.beginPath(); c.ellipse(0, -len * U / 2, 7 * U, len * U / 2, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 1 * U;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -len * U * 0.9); c.stroke();
    c.restore();
  });
  c.restore();
  c.fillStyle = '#c86a3a';
  c.beginPath(); c.moveTo(-13 * U, -20 * U); c.lineTo(13 * U, -20 * U); c.lineTo(10 * U, 0); c.lineTo(-10 * U, 0); c.closePath(); c.fill();
  c.fillStyle = shade('#c86a3a', 0.15); c.fillRect(-14 * U, -22 * U, 28 * U, 5 * U);
  c.restore();
}

const photoFrame: Piece = (c, x, y, U, rot) => taped(c, x, y, 34 * U, 42 * U, rot, U, () => {
  c.fillStyle = '#c9a24a'; c.fillRect(-17 * U, -21 * U, 34 * U, 42 * U);
  c.fillStyle = '#fbe9c8'; c.fillRect(-13 * U, -17 * U, 26 * U, 34 * U);
  c.fillStyle = '#e8a0b4'; c.beginPath(); c.arc(0, -5 * U, 6 * U, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#6a8fd0'; c.fillRect(-8 * U, 2 * U, 16 * U, 12 * U);
});

function radio(c: C, x: number, y: number, U: number, time: number): void {
  const w = 40 * U, h = 26 * U;
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x, y + 1 * U, w * 0.55, 3.5 * U, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#2a2a2a'; c.lineWidth = 1.5 * U;
  c.beginPath(); c.moveTo(x + 12 * U, y - h); c.lineTo(x + 24 * U, y - h - 20 * U); c.stroke();
  c.fillStyle = '#8a5a3b'; c.beginPath(); rr(c, x - w / 2, y - h, w, h, 5 * U); c.fill();
  c.fillStyle = '#e9dcc2'; c.beginPath(); rr(c, x - w / 2 + 4 * U, y - h + 4 * U, 20 * U, h - 8 * U, 3 * U); c.fill();
  c.strokeStyle = 'rgba(80,50,30,0.5)'; c.lineWidth = 1 * U;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - w / 2 + 6 * U, y - h + 8 * U + i * 4 * U); c.lineTo(x - w / 2 + 22 * U, y - h + 8 * U + i * 4 * U); c.stroke(); }
  c.fillStyle = '#d9b26a'; c.beginPath(); c.arc(x + 11 * U, y - h / 2, 5 * U, 0, Math.PI * 2); c.fill();
  // a note floats up now and then
  const k = (time * 0.35) % 1;
  c.globalAlpha = Math.sin(k * Math.PI) * 0.8;
  text(c, '♪', x - 4 * U + Math.sin(k * 6) * 4 * U, y - h - 6 * U - k * 26 * U, 12 * U, '#ffe7b8', { font: 'bold' });
  c.globalAlpha = 1;
}

function nostalgia(c: C, x: number, y: number, U: number): void {
  // a stack of old books with a tiny brass clock on top
  const books: [number, string][] = [[34, '#7a3b2e'], [30, '#2f5a4a'], [32, '#a8743a']];
  let by = y;
  books.forEach(([w, col], i) => {
    const h = 6 * U;
    c.fillStyle = col; c.fillRect(x - w * U / 2 + i * 2 * U, by - h, w * U, h);
    c.fillStyle = 'rgba(255,240,200,0.6)'; c.fillRect(x - w * U / 2 + i * 2 * U + 3 * U, by - h + 2 * U, w * U - 6 * U, 1 * U);
    by -= h;
  });
  c.fillStyle = '#c9a24a'; c.beginPath(); c.arc(x + 2 * U, by - 9 * U, 9 * U, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fbf2dc'; c.beginPath(); c.arc(x + 2 * U, by - 9 * U, 6.5 * U, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#2b2b33'; c.lineWidth = 1.2 * U;
  c.beginPath(); c.moveTo(x + 2 * U, by - 9 * U); c.lineTo(x + 2 * U, by - 13 * U); c.moveTo(x + 2 * U, by - 9 * U); c.lineTo(x + 5 * U, by - 8 * U); c.stroke();
}

// ---------- the counter front ----------

export function drawShopSign(c: C, look: CounterLook, W: number, U: number, yC: number, time: number): void {
  const y = yC + 24 * U;
  if (look.counter >= 2) {
    // brass rail along the front edge
    c.strokeStyle = '#c9a24a'; c.lineWidth = 3 * U;
    c.beginPath(); c.moveTo(0, yC + 6 * U); c.lineTo(W, yC + 6 * U); c.stroke();
    c.strokeStyle = 'rgba(255,240,190,0.6)'; c.lineWidth = 1 * U;
    c.beginPath(); c.moveTo(0, yC + 5 * U); c.lineTo(W, yC + 5 * U); c.stroke();
    c.fillStyle = '#a8822e';
    for (let x = 30 * U; x < W; x += 80 * U) c.fillRect(x - 2 * U, yC + 6 * U, 4 * U, 8 * U);
  }
  if (look.gifts.has('namePlate')) {
    c.fillStyle = '#c9a24a'; c.beginPath(); rrc(c, W * 0.15, y, 58 * U, 18 * U, 4 * U); c.fill();
    text(c, 'EST. 2026', W * 0.15, y + 1, 9 * U, '#3b2414', { font: 'bold' });
  }
  if (look.counter >= 3) {
    // LED board: amber dots, the name scrolling
    const w = 170 * U, h = 30 * U;
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); rrc(c, W / 2 + 2, y + 3, w, h, 5 * U); c.fill();
    c.fillStyle = '#16120f'; c.beginPath(); rrc(c, W / 2, y, w, h, 5 * U); c.fill();
    c.save();
    c.beginPath(); c.rect(W / 2 - w / 2 + 6 * U, y - h / 2, w - 12 * U, h); c.clip();
    const label = `✦ ${t('shopName')} ✦ ${t('shopName')} `;
    setFont(c, 16 * U, 'bold');
    const lw = c.measureText(label).width / 2;
    const off = (time * 40 * U) % lw;
    c.shadowColor = '#ff9a2e'; c.shadowBlur = 8 * U;
    text(c, label, W / 2 - w / 2 + 8 * U - off, y + 1, 16 * U, '#ffb347', { font: 'bold', align: 'left' });
    c.restore();
  } else if (look.counter >= 1) {
    const w = 150 * U, h = 28 * U;
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); rrc(c, W / 2 + 2, y + 3, w, h, 6 * U); c.fill();
    c.fillStyle = '#b98552'; c.beginPath(); rrc(c, W / 2, y, w, h, 6 * U); c.fill();
    c.strokeStyle = '#6e4630'; c.lineWidth = 2 * U; c.beginPath(); rrc(c, W / 2, y, w - 5 * U, h - 5 * U, 5 * U); c.stroke();
    text(c, t('shopName'), W / 2, y + 1, 14 * U, '#3b2414', { font: 'bold', maxW: w - 16 * U });
  }
}
