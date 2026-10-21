// Workbench props: cutting mat, lamp, pen cup, cardboard box, screw dish,
// screwdriver, brush/sponge, and the HUD (cash + notepad).

import { type C, rr, rrc, shade, text, screwHead, rng, setFont, FONT_BOLD } from '../core/draw';
import { view } from '../core/view';

let bgCache: HTMLCanvasElement | null = null;
let bgKey = '';

/** Blue cutting mat seen slightly from above, lamp light pooling top-right. */
export function drawMat(c: C): void {
  const { W, H, dpr } = view;
  const key = `${W}x${H}@${dpr}`;
  if (!bgCache || bgKey !== key) {
    bgCache = document.createElement('canvas');
    bgCache.width = Math.round(W * dpr);
    bgCache.height = Math.round(H * dpr);
    const g = bgCache.getContext('2d')!;
    g.scale(dpr, dpr);
    paintMat(g, W, H);
    bgKey = key;
  }
  c.drawImage(bgCache, 0, 0, W, H);
}

function paintMat(c: C, W: number, H: number): void {
  const U = view.U;
  const top = view.top;
  // wall + desk back
  c.fillStyle = '#2a1d1a';
  c.fillRect(0, 0, W, H);
  const wood = c.createLinearGradient(0, 0, 0, top + 70 * U);
  wood.addColorStop(0, '#3b2620'); wood.addColorStop(1, '#5a3a2c');
  c.fillStyle = wood;
  c.fillRect(0, 0, W, top + 70 * U);
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  for (let x = 0; x < W; x += 46 * U) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, top + 70 * U); c.stroke(); }

  // mat with mild perspective: top edge inset
  const my = top + 58 * U;
  const inset = 18 * U;
  const mat = new Path2D();
  mat.moveTo(inset, my);
  mat.lineTo(W - inset, my);
  mat.lineTo(W + 10, H + 10);
  mat.lineTo(-10, H + 10);
  mat.closePath();
  const mg = c.createLinearGradient(0, my, 0, H);
  mg.addColorStop(0, '#36588f');
  mg.addColorStop(0.5, '#2d4d82');
  mg.addColorStop(1, '#223c69');
  c.fillStyle = mg;
  c.fill(mat);
  c.save();
  c.clip(mat);
  // grid
  const cols = 12;
  const rows = Math.round((H - my) / (W / cols));
  for (let i = 0; i <= cols * 2; i++) {
    const k = i / (cols * 2);
    const x0 = inset + (W - 2 * inset) * k;
    const x1 = -10 + (W + 20) * k;
    c.strokeStyle = i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.13)';
    c.lineWidth = i % 4 ? 1 : 1.6;
    c.beginPath(); c.moveTo(x0, my); c.lineTo(x1, H); c.stroke();
  }
  for (let j = 0; j <= rows * 2; j++) {
    const k = j / (rows * 2);
    const y = my + (H - my) * Math.pow(k, 0.95);
    c.strokeStyle = j % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.13)';
    c.lineWidth = j % 4 ? 1 : 1.6;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  // diagonal/arc guides like a real mat
  c.strokeStyle = 'rgba(255,255,255,0.1)';
  c.lineWidth = 1.2;
  c.beginPath(); c.arc(W * 0.15, H * 0.98, W * 0.75, -Math.PI / 2.2, -0.05); c.stroke();
  c.beginPath(); c.moveTo(0, H * 0.55); c.lineTo(W, H * 0.9); c.stroke();
  // ruler numbers along the top
  setFont(c, 9 * U, 'bold');
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.textAlign = 'center';
  for (let i = 1; i < 6; i++) c.fillText(String(i * 5), inset + (W - 2 * inset) * (i / 6), my + 10 * U);
  // lamp light pool + vignette
  const lg = c.createRadialGradient(W * 0.7, H * 0.28, 10, W * 0.6, H * 0.4, H * 0.7);
  lg.addColorStop(0, 'rgba(255,240,210,0.16)');
  lg.addColorStop(0.5, 'rgba(255,240,210,0.04)');
  lg.addColorStop(1, 'rgba(0,10,30,0.35)');
  c.fillStyle = lg;
  c.fillRect(0, 0, W, H);
  // soft shadow band of the lamp arm
  c.fillStyle = 'rgba(10,20,50,0.18)';
  c.beginPath();
  c.moveTo(W, H * 0.55); c.lineTo(W * 0.45, H * 0.82); c.lineTo(W * 0.4, H); c.lineTo(W, H);
  c.closePath();
  c.fill();
  c.restore();
  // mat edge
  c.strokeStyle = 'rgba(0,0,0,0.4)';
  c.lineWidth = 3;
  c.stroke(mat);

  // pen cup (top-left)
  const px = 30 * U, py = my + 104 * U;
  c.fillStyle = 'rgba(10,20,40,0.35)';
  c.beginPath(); c.ellipse(px - 8 * U, py + 14 * U, 26 * U, 22 * U, 0, 0, Math.PI * 2); c.fill();
  const cg = c.createRadialGradient(px - 6 * U, py - 6 * U, 2, px, py, 26 * U);
  cg.addColorStop(0, '#f08a4b'); cg.addColorStop(1, '#a8471d');
  c.fillStyle = cg;
  c.beginPath(); c.arc(px, py, 24 * U, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#5a2410';
  c.beginPath(); c.arc(px, py, 19 * U, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#c85a24'; c.lineWidth = 5 * U;
  c.beginPath(); c.arc(px + 25 * U, py + 2 * U, 9 * U, -1.2, 1.2); c.stroke();
  const pens: [number, number, string][] = [[-8, -26, '#3fa34d'], [4, -30, '#e8424f'], [10, -20, '#f5c638'], [-2, -18, '#3b7ff0']];
  for (const [dx, dy, col] of pens) {
    c.strokeStyle = col; c.lineWidth = 4 * U; c.lineCap = 'round';
    c.beginPath(); c.moveTo(px + dx * 0.3 * U, py); c.lineTo(px + dx * U, py + dy * U); c.stroke();
  }
  // photo frame peeking at the very top-left
  c.save();
  c.translate(96 * U, top + 30 * U);
  c.rotate(-0.08);
  c.fillStyle = '#6b4a2e'; c.fillRect(-20 * U, -24 * U, 40 * U, 40 * U);
  c.fillStyle = '#9fc3e0'; c.fillRect(-15 * U, -19 * U, 30 * U, 30 * U);
  c.fillStyle = '#f2c6a0'; c.beginPath(); c.arc(0, -4 * U, 7 * U, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#3a2a40'; c.fillRect(-9 * U, 4 * U, 18 * U, 8 * U);
  c.restore();

  // desk lamp (top-right), seen from above
  const lx = W - 46 * U, ly = my + 30 * U;
  c.fillStyle = 'rgba(10,20,40,0.35)';
  c.beginPath(); c.ellipse(lx - 14 * U, ly + 22 * U, 40 * U, 30 * U, -0.4, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#2c3a5c';
  c.beginPath(); c.ellipse(lx, ly, 36 * U, 30 * U, -0.5, 0, Math.PI * 2); c.fill();
  const lg2 = c.createRadialGradient(lx + 8 * U, ly - 8 * U, 2, lx, ly, 36 * U);
  lg2.addColorStop(0, '#5b6f9c'); lg2.addColorStop(1, '#1f2a45');
  c.fillStyle = lg2;
  c.beginPath(); c.ellipse(lx, ly, 32 * U, 26 * U, -0.5, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#1a2238'; c.lineWidth = 7 * U; c.lineCap = 'round';
  c.beginPath(); c.moveTo(lx + 20 * U, ly + 16 * U); c.lineTo(W + 10, ly + 70 * U); c.stroke();
  c.fillStyle = '#d24a3a';
  c.beginPath(); c.arc(lx + 22 * U, ly + 20 * U, 4 * U, 0, Math.PI * 2); c.fill();
}

// ---------- cardboard box (top-down) ----------

export function drawBox(c: C, x: number, y: number, s: number, open: number, time = 0): void {
  const w = 190 * s, h = 160 * s;
  c.save();
  c.translate(x, y);
  // shadow
  c.fillStyle = 'rgba(10,20,50,0.35)';
  c.beginPath(); rrc(c, -10 * s, 14 * s, w, h, 6 * s); c.fill();
  // side
  c.fillStyle = '#9a6a3c';
  c.beginPath(); rrc(c, 0, 10 * s, w, h, 6 * s); c.fill();
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#dcae78'); g.addColorStop(1, '#c08a52');
  if (open < 0.05) {
    c.fillStyle = g;
    c.beginPath(); rrc(c, 0, 0, w, h, 6 * s); c.fill();
    // flap seam + tape
    c.strokeStyle = 'rgba(90,50,20,0.5)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(w / 2, 0); c.stroke();
    c.fillStyle = 'rgba(240,225,190,0.75)';
    c.fillRect(-w / 2, -12 * s, w, 24 * s);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.fillRect(-w / 2, -12 * s, w, 5 * s);
    // stickers
    c.fillStyle = '#e8665a'; c.fillRect(w * 0.18, -h * 0.42, 16 * s, 16 * s);
    c.fillStyle = '#6fa0d8'; c.fillRect(-w * 0.28, h * 0.18, 16 * s, 16 * s);
    c.fillStyle = '#f4efe2'; c.fillRect(-w * 0.42, -h * 0.4, 40 * s, 24 * s);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    for (let i = 0; i < 3; i++) c.fillRect(-w * 0.42 + 5 * s, -h * 0.4 + 5 * s + i * 6 * s, 28 * s, 2 * s);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 5; i++) c.fillRect(w * 0.1 + i * 6 * s, h * 0.32, 3 * s, 8 * s);
  } else {
    // interior
    c.fillStyle = '#7a4f2a';
    c.beginPath(); rrc(c, 0, 0, w, h, 6 * s); c.fill();
    c.fillStyle = '#b07a46';
    c.beginPath(); rrc(c, 0, 0, w - 10 * s, h - 10 * s, 4 * s); c.fill();
    // packing peanuts
    const r = rng(5);
    for (let i = 0; i < 26; i++) {
      const px = (r() - 0.5) * (w - 30 * s), py = (r() - 0.5) * (h - 30 * s);
      const pr = (14 + r() * 8) * s;
      const pg = c.createRadialGradient(px - pr * 0.3, py - pr * 0.4, 1, px, py, pr);
      pg.addColorStop(0, '#ffffff'); pg.addColorStop(1, '#d9dde3');
      c.fillStyle = pg;
      c.beginPath(); c.arc(px, py + Math.sin(time * 3 + i) * 0.5, pr, 0, Math.PI * 2); c.fill();
    }
    // four flaps folding outward
    const f = open;
    const flap = (pts: number[]) => {
      const p = new Path2D();
      p.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
      p.closePath();
      c.fillStyle = g; c.fill(p);
      c.strokeStyle = 'rgba(90,50,20,0.45)'; c.lineWidth = 1.2; c.stroke(p);
    };
    const fh = 60 * s * f, fw = 76 * s * f;
    flap([-w / 2, -h / 2, w / 2, -h / 2, w / 2 - 6 * s, -h / 2 - fh, -w / 2 + 6 * s, -h / 2 - fh]);
    flap([-w / 2, h / 2, w / 2, h / 2, w / 2 - 6 * s, h / 2 + fh, -w / 2 + 6 * s, h / 2 + fh]);
    flap([-w / 2, -h / 2, -w / 2, h / 2, -w / 2 - fw, h / 2 - 6 * s, -w / 2 - fw, -h / 2 + 6 * s]);
    flap([w / 2, -h / 2, w / 2, h / 2, w / 2 + fw, h / 2 - 6 * s, w / 2 + fw, -h / 2 + 6 * s]);
  }
  c.restore();
}

// ---------- screw dish ----------

export function drawDish(c: C, x: number, y: number, r: number, screws: number, glow = 0): void {
  c.save();
  c.fillStyle = 'rgba(10,20,50,0.4)';
  c.beginPath(); c.arc(x - 5, y + 7, r, 0, Math.PI * 2); c.fill();
  const g = c.createRadialGradient(x - r * 0.4, y - r * 0.5, 2, x, y, r);
  g.addColorStop(0, '#b9bcc2'); g.addColorStop(0.7, '#6f737b'); g.addColorStop(1, '#3f4249');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  const g2 = c.createRadialGradient(x + r * 0.2, y + r * 0.3, 2, x, y, r * 0.8);
  g2.addColorStop(0, '#5a5e66'); g2.addColorStop(1, '#2f3238');
  c.fillStyle = g2;
  c.beginPath(); c.arc(x, y, r * 0.8, 0, Math.PI * 2); c.fill();
  const rn = rng(77);
  for (let i = 0; i < screws; i++) {
    const a = rn() * Math.PI * 2, d = rn() * r * 0.55;
    screwHead(c, x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.16, rn() * 3, '#d9a0c8');
  }
  if (glow > 0) {
    c.strokeStyle = `rgba(255,236,150,${glow})`;
    c.lineWidth = 3;
    c.beginPath(); c.arc(x, y, r + 4, 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}

// ---------- screwdriver ----------

/**
 * Tip at (x, y); `ang` = direction from tip toward the handle; `stand` 0..1
 * turns it upright (seen from above: just the round handle top), `twist` spins it.
 */
export function drawScrewdriver(c: C, x: number, y: number, ang: number, s: number, stand: number, twist: number, prog: number): void {
  c.save();
  c.translate(x, y);
  if (stand < 0.5) {
    const L = 1 - stand * 1.4;
    c.rotate(ang);
    // shadow
    c.fillStyle = 'rgba(10,20,50,0.3)';
    c.beginPath(); rr(c, -4 * s, 4 * s + 10 * s, 120 * s * L, 14 * s, 7 * s); c.fill();
    // shaft
    const sg = c.createLinearGradient(0, -3 * s, 0, 3 * s);
    sg.addColorStop(0, '#7d828b'); sg.addColorStop(0.4, '#f1f3f6'); sg.addColorStop(1, '#5f646c');
    c.fillStyle = sg;
    c.beginPath(); rr(c, 0, -2.6 * s, 54 * s * L, 5.2 * s, 2 * s); c.fill();
    c.fillStyle = '#4b4f57';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(5 * s, -2.6 * s); c.lineTo(5 * s, 2.6 * s); c.closePath(); c.fill();
    // ferrule
    c.fillStyle = '#2b2d33';
    c.beginPath(); rr(c, 52 * s * L, -6 * s, 10 * s, 12 * s, 3 * s); c.fill();
    // handle
    const hx = 60 * s * L;
    const hg = c.createLinearGradient(0, -10 * s, 0, 10 * s);
    hg.addColorStop(0, '#c98a00'); hg.addColorStop(0.35, '#ffd23f'); hg.addColorStop(1, '#a86a00');
    c.fillStyle = hg;
    c.beginPath(); rr(c, hx, -10 * s, 66 * s, 20 * s, 9 * s); c.fill();
    c.fillStyle = '#1e1f24';
    c.beginPath(); rr(c, hx + 10 * s, -10.5 * s, 12 * s, 21 * s, 3 * s); c.fill();
    c.beginPath(); rr(c, hx + 44 * s, -10.5 * s, 10 * s, 21 * s, 3 * s); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.beginPath(); rr(c, hx + 24 * s, -7 * s, 18 * s, 4 * s, 2 * s); c.fill();
  } else {
    // upright: handle top seen from above, over the screw
    const k = (stand - 0.5) * 2;
    const R = 16 * s * (0.7 + 0.3 * k);
    c.fillStyle = 'rgba(10,20,50,0.35)';
    c.beginPath(); c.ellipse(-12 * s, 16 * s, R * 1.1, R * 0.8, -0.5, 0, Math.PI * 2); c.fill();
    c.translate(-4 * s * k, -26 * s * k);
    c.fillStyle = '#1e1f24';
    c.beginPath(); c.arc(0, 4 * s, R, 0, Math.PI * 2); c.fill();
    const hg = c.createRadialGradient(-R * 0.3, -R * 0.4, 1, 0, 0, R);
    hg.addColorStop(0, '#fff2a0'); hg.addColorStop(0.5, '#ffd23f'); hg.addColorStop(1, '#c98a00');
    c.fillStyle = hg;
    c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill();
    c.rotate(twist);
    c.strokeStyle = 'rgba(120,70,0,0.55)';
    c.lineWidth = 2 * s;
    for (let i = 0; i < 6; i++) {
      c.rotate(Math.PI / 3);
      c.beginPath(); c.moveTo(R * 0.45, 0); c.lineTo(R * 0.9, 0); c.stroke();
    }
    c.rotate(-twist);
    if (prog > 0) {
      c.strokeStyle = 'rgba(255,255,255,0.95)';
      c.lineWidth = 3.5 * s;
      c.lineCap = 'round';
      c.beginPath(); c.arc(0, 26 * s * k, 22 * s, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); c.stroke();
    }
  }
  c.restore();
}

// ---------- cleaning tools ----------

export function drawBrush(c: C, x: number, y: number, s: number, ang = 0, scrub = 0): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang + Math.sin(scrub * 30) * 0.06 * Math.min(1, scrub));
  c.fillStyle = 'rgba(10,20,50,0.3)';
  c.beginPath(); rrc(c, -6 * s, 10 * s, 76 * s, 34 * s, 8 * s); c.fill();
  // bristles
  c.fillStyle = '#f4efe6';
  c.beginPath(); rrc(c, 0, 12 * s, 70 * s, 14 * s, 4 * s); c.fill();
  c.strokeStyle = 'rgba(160,150,130,0.6)'; c.lineWidth = 1;
  for (let i = -32; i <= 32; i += 3) { c.beginPath(); c.moveTo(i * s, 6 * s); c.lineTo(i * s, 19 * s); c.stroke(); }
  // wooden back
  const g = c.createLinearGradient(0, -14 * s, 0, 8 * s);
  g.addColorStop(0, '#f2c58a'); g.addColorStop(1, '#c7894c');
  c.fillStyle = '#8a5a2c';
  c.beginPath(); rrc(c, 0, 0, 76 * s, 26 * s, 9 * s); c.fill();
  c.fillStyle = g;
  c.beginPath(); rrc(c, 0, -3 * s, 74 * s, 22 * s, 9 * s); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2 * s;
  c.beginPath(); c.moveTo(-28 * s, -9 * s); c.lineTo(20 * s, -9 * s); c.stroke();
  c.restore();
}

export function drawSponge(c: C, x: number, y: number, s: number, ang = 0, scrub = 0): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang + Math.sin(scrub * 30) * 0.08 * Math.min(1, scrub));
  c.fillStyle = 'rgba(10,20,50,0.3)';
  c.beginPath(); rrc(c, -6 * s, 12 * s, 60 * s, 46 * s, 8 * s); c.fill();
  c.fillStyle = '#e8c04a';
  c.beginPath(); rrc(c, 0, 10 * s, 58 * s, 26 * s, 7 * s); c.fill();
  c.fillStyle = 'rgba(160,120,20,0.4)';
  for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(((i * 17) % 50 - 25) * s, (8 + (i * 7) % 12) * s, 1.6 * s, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#3e9c4a';
  c.beginPath(); rrc(c, 0, -8 * s, 58 * s, 18 * s, 6 * s); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.beginPath(); rrc(c, -6 * s, -13 * s, 36 * s, 4 * s, 2 * s); c.fill();
  c.restore();
}

// ---------- HUD ----------

export function drawCash(c: C, x: number, y: number, amount: number, s: number, pulse = 0): void {
  const w = 108 * s, h = 40 * s;
  c.save();
  c.translate(x + w / 2, y + h / 2);
  c.scale(1 + pulse * 0.12, 1 + pulse * 0.12);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); rrc(c, 0, 4 * s, w, h, 10 * s); c.fill();
  c.fillStyle = '#3e4a52';
  c.beginPath(); rrc(c, 0, 0, w, h, 10 * s); c.fill();
  c.fillStyle = '#5d6a73';
  c.beginPath(); rrc(c, 0, -2 * s, w - 4 * s, h - 6 * s, 8 * s); c.fill();
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#d6f2a8'); g.addColorStop(1, '#a8d870');
  c.fillStyle = g;
  c.beginPath(); rrc(c, -4 * s, 0, w - 18 * s, h - 12 * s, 5 * s); c.fill();
  c.font = `800 ${20 * s}px ${FONT_BOLD}`;
  c.textAlign = 'right';
  c.textBaseline = 'middle';
  c.fillStyle = '#23361a';
  c.fillText(`$${amount}`, w / 2 - 20 * s, 2 * s);
  // plus badge
  c.fillStyle = '#e8743a';
  c.beginPath(); c.arc(w / 2 - 2 * s, -h / 2 + 2 * s, 8 * s, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 2 * s;
  c.beginPath(); c.moveTo(w / 2 - 6 * s, -h / 2 + 2 * s); c.lineTo(w / 2 + 2 * s, -h / 2 + 2 * s);
  c.moveTo(w / 2 - 2 * s, -h / 2 - 2 * s); c.lineTo(w / 2 - 2 * s, -h / 2 + 6 * s); c.stroke();
  c.restore();
}

export function drawGear(c: C, x: number, y: number, s: number): void {
  c.save();
  c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); rrc(c, 0, 3 * s, 34 * s, 34 * s, 8 * s); c.fill();
  c.fillStyle = '#3e4a52';
  c.beginPath(); rrc(c, 0, 0, 34 * s, 34 * s, 8 * s); c.fill();
  c.fillStyle = '#e9e2d0';
  for (let i = 0; i < 8; i++) {
    c.save(); c.rotate((i / 8) * Math.PI * 2);
    c.fillRect(-2.5 * s, -11 * s, 5 * s, 6 * s);
    c.restore();
  }
  c.beginPath(); c.arc(0, 0, 8 * s, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#3e4a52';
  c.beginPath(); c.arc(0, 0, 3.5 * s, 0, Math.PI * 2); c.fill();
  c.restore();
}

/** Spiral notepad card, top-right. */
export function drawNotepad(c: C, x: number, y: number, w: number, s: number, title: string, line: string, prog: number, done: boolean, pulse = 0): number {
  const h = 74 * s;
  c.save();
  c.translate(x + w / 2, y + h / 2);
  c.scale(1 + pulse * 0.05, 1 + pulse * 0.05);
  c.translate(-w / 2, -h / 2);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); rr(c, -3 * s, 6 * s, w, h, 10 * s); c.fill();
  c.fillStyle = '#d99a3f';
  c.beginPath(); rr(c, 0, 0, w, h, 10 * s); c.fill();
  c.fillStyle = '#fbf2dc';
  c.beginPath(); rr(c, 4 * s, 6 * s, w - 8 * s, h - 12 * s, 7 * s); c.fill();
  c.strokeStyle = 'rgba(180,150,100,0.25)'; c.lineWidth = 1;
  for (let ly = 30; ly < 70; ly += 13) { c.beginPath(); c.moveTo(8 * s, ly * s); c.lineTo(w - 8 * s, ly * s); c.stroke(); }
  // spiral rings
  for (let i = 0; i < 6; i++) {
    const rx = 18 * s + i * ((w - 36 * s) / 5);
    c.fillStyle = '#8a5a2a'; c.beginPath(); c.arc(rx, 4 * s, 3 * s, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#c9cdd3'; c.lineWidth = 2.4 * s;
    c.beginPath(); c.arc(rx, 1 * s, 4 * s, Math.PI * 0.9, Math.PI * 2.1); c.stroke();
  }
  text(c, title, 12 * s, 22 * s, 17 * s, '#3b2a1e', { font: 'hand', align: 'left', maxW: w - 24 * s });
  text(c, (done ? '✓ ' : '') + line, 12 * s, 41 * s, 15 * s, done ? '#3f8a2e' : '#b4542a', { align: 'left', maxW: w - 24 * s });
  // progress bar
  c.fillStyle = '#e6d6b2';
  c.beginPath(); rr(c, 12 * s, 52 * s, w - 24 * s, 9 * s, 4.5 * s); c.fill();
  if (prog > 0) {
    const g = c.createLinearGradient(0, 52 * s, 0, 61 * s);
    g.addColorStop(0, '#8fdc5a'); g.addColorStop(1, '#4fa83a');
    c.fillStyle = g;
    c.beginPath(); rr(c, 12 * s, 52 * s, Math.max(9 * s, (w - 24 * s) * Math.min(1, prog)), 9 * s, 4.5 * s); c.fill();
  }
  // pull tab
  c.fillStyle = '#d99a3f';
  c.beginPath(); rrc(c, w / 2, h + 2 * s, 30 * s, 8 * s, 4 * s); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.fillRect(w / 2 - 8 * s, h + 1 * s, 16 * s, 2 * s);
  c.restore();
  return h;
}

/** Red bolt (repair), blue bubbles (dirty), or an orange job badge showing `glyph` (hands-on jobs). */
export function badge(c: C, x: number, y: number, s: number, kind: 'broken' | 'dirty', time: number, glyph?: string): void {
  c.save();
  c.translate(x, y);
  const b = 1 + Math.sin(time * 5) * 0.06;
  c.scale(b, b);
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath(); rrc(c, -1, 2 * s, 24 * s, 24 * s, 6 * s); c.fill();
  c.fillStyle = glyph ? '#f08a24' : kind === 'broken' ? '#e0443a' : '#4aa3d8';
  c.beginPath(); rrc(c, 0, 0, 24 * s, 24 * s, 6 * s); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 2 * s;
  c.beginPath(); rrc(c, 0, 0, 24 * s, 24 * s, 6 * s); c.stroke();
  c.fillStyle = '#fff';
  if (glyph) {
    c.font = `${15 * s}px system-ui, 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(glyph, 0, 1 * s);
  } else if (kind === 'broken') {
    c.beginPath();
    c.moveTo(2 * s, -8 * s); c.lineTo(-5 * s, 2 * s); c.lineTo(0, 2 * s); c.lineTo(-2 * s, 9 * s); c.lineTo(6 * s, -2 * s); c.lineTo(1 * s, -2 * s);
    c.closePath(); c.fill();
  } else {
    for (const [bx, by, br] of [[-3, 2, 5], [4, -3, 3.5], [4, 5, 2.5]] as const) {
      c.beginPath(); c.arc(bx * s, by * s, br * s, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#4aa3d8';
    c.beginPath(); c.arc(-4.5 * s, 0.5 * s, 1.6 * s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

export { shade };

/** Hint button: a warm light bulb in a round badge, with a FREE tag. `glow` 0..1 calls for attention. */
export function drawBulbBtn(c: C, x: number, y: number, s: number, glow = 0, press = 0): void {
  c.save();
  c.translate(x, y + press * 2 * s);
  c.scale(1 - press * 0.06, 1 - press * 0.06);
  if (glow > 0) {
    const g = c.createRadialGradient(0, 0, 10 * s, 0, 0, 34 * s);
    g.addColorStop(0, `rgba(255,226,120,${0.55 * glow})`);
    g.addColorStop(1, 'rgba(255,226,120,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, 34 * s, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.arc(0, 3 * s, 20 * s, 0, Math.PI * 2); c.fill();
  const bg = c.createLinearGradient(0, -20 * s, 0, 20 * s);
  bg.addColorStop(0, '#ffd75a'); bg.addColorStop(1, '#f0a630');
  c.fillStyle = bg;
  c.beginPath(); c.arc(0, 0, 20 * s, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#b8701c'; c.lineWidth = 2 * s; c.stroke();
  // the bulb: glass, neck, screw base
  c.fillStyle = '#fffbe8';
  c.beginPath();
  c.arc(0, -4 * s, 8.5 * s, Math.PI * 0.78, Math.PI * 2.22);
  c.lineTo(3.4 * s, 6 * s); c.lineTo(-3.4 * s, 6 * s); c.closePath();
  c.fill();
  c.strokeStyle = '#7a4a12'; c.lineWidth = 1.6 * s; c.stroke();
  c.strokeStyle = '#f0a630'; c.lineWidth = 1.3 * s;
  c.beginPath(); c.moveTo(-2.4 * s, 4 * s); c.lineTo(-1.2 * s, -3 * s); c.lineTo(0, -1 * s); c.lineTo(1.2 * s, -3 * s); c.lineTo(2.4 * s, 4 * s); c.stroke();
  c.fillStyle = '#6b7480';
  c.beginPath(); rr(c, -3.6 * s, 6.4 * s, 7.2 * s, 2.4 * s, 1 * s); c.fill();
  c.beginPath(); rr(c, -3 * s, 9.2 * s, 6 * s, 2.2 * s, 1 * s); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.beginPath(); c.ellipse(-3.4 * s, -6.6 * s, 1.6 * s, 2.8 * s, -0.5, 0, Math.PI * 2); c.fill();
  // FREE tag
  c.fillStyle = '#5cbf3a';
  c.beginPath(); rrc(c, 0, 21 * s, 30 * s, 12 * s, 6 * s); c.fill();
  c.strokeStyle = '#2f7a1c'; c.lineWidth = 1.2 * s; c.stroke();
  text(c, 'FREE', 0, 21.5 * s, 8.5 * s, '#ffffff', { font: 'bold' });
  c.restore();
}
