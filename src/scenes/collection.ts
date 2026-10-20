// The collection: every gadget the shop has repaired, on wooden shelves.
// Repaired ones show their 3D model; the rest are dark silhouettes. Tap one to
// turn it 360° and read whose it was. Progress is kept on the device.

import { type C, rrc, text, wrap, setFont } from '../core/draw';
import { view } from '../core/view';
import { sfx } from '../core/audio';
import { t, tr, lang } from '../core/i18n';
import type { Level } from '../content/story';
import { showcaseThumb, renderShowcase, spinShowcase, THREE } from '../three/showcase3d';

// ---------- progress ----------

export interface Repaired { earned: number }
const KEY = 'chillfix_collection';

export function loadCollection(): Record<number, Repaired> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch { return {}; }
}

export function markRepaired(level: number, earned: number): void {
  const all = loadCollection();
  all[level] = { earned: Math.max(earned, all[level]?.earned ?? 0) };
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage blocked */ }
}

// ---------- the screen ----------

const COLS = 4;

export class Collection {
  levels: Level[];
  shown = false;
  open = 0;
  detail = -1;
  detailOpen = 0;
  repaired: Record<number, Repaired> = {};
  thumbs = new Map<number, HTMLCanvasElement | null>();
  thumbSize = 0;
  orient = new THREE.Quaternion();
  spin = { vx: 0.25, vy: 0, held: false, px: 0, py: 0, at: 0, moved: false };
  time = 0;

  constructor(levels: Level[]) {
    this.levels = levels;
  }

  show(focus = -1): void {
    this.repaired = loadCollection();
    this.shown = true;
    this.detail = -1;
    this.detailOpen = 0;
    if (focus >= 0 && this.repaired[focus]) this.openDetail(focus);
    sfx.tap();
  }

  close(): void {
    this.shown = false;
    sfx.tap();
  }

  openDetail(i: number): void {
    this.detail = i;
    this.orient.setFromEuler(new THREE.Euler(0.1, -0.55, 0));
    this.spin.vx = 0.25; this.spin.vy = 0;
    sfx.lift();
  }

  // ---------- layout ----------

  header() {
    const { W, U } = view;
    return { y: view.top + 40 * U, closeX: W - 34 * U };
  }

  grid() {
    const { W, H, U } = view;
    const top = view.top + 84 * U, bottom = H - 16 * U;
    const rows = Math.ceil(this.levels.length / COLS);
    const cw = (W - 24 * U) / COLS, ch = (bottom - top) / rows;
    return { x0: 12 * U, top, cw, ch, rows };
  }

  cell(i: number) {
    const g = this.grid();
    const col = i % COLS, row = Math.floor(i / COLS);
    return { x: g.x0 + g.cw * (col + 0.5), y: g.top + g.ch * row, w: g.cw, h: g.ch };
  }

  // ---------- update ----------

  update(dt: number): void {
    this.time += dt;
    this.open += ((this.shown ? 1 : 0) - this.open) * Math.min(1, dt * 12);
    this.detailOpen += ((this.detail >= 0 ? 1 : 0) - this.detailOpen) * Math.min(1, dt * 12);
    if (!this.shown) return;
    // render one missing thumbnail per frame so opening never stalls
    const g = this.grid();
    const size = Math.round(Math.min(g.cw, g.ch - 22 * view.U) * 0.92 * Math.min(view.dpr, 2));
    if (size !== this.thumbSize) { this.thumbSize = size; this.thumbs.clear(); }
    for (let i = 0; i < this.levels.length; i++) {
      if (this.thumbs.has(i)) continue;
      const pic = showcaseThumb(this.levels[i].device, size);
      this.thumbs.set(i, pic && !this.repaired[i] ? silhouette(pic) : pic);
      break;
    }
    if (this.detail >= 0 && !this.spin.held) {
      spinShowcase(this.orient, this.spin.vx, this.spin.vy);
      // fling slows down to a gentle turntable
      this.spin.vx += (0.25 - this.spin.vx) * Math.min(1, dt * 1.5);
      this.spin.vy *= Math.pow(0.05, dt);
    }
  }

  // ---------- drawing ----------

  draw(c: C): void {
    if (this.open < 0.01) return;
    const { W, H, U } = view;
    c.save();
    c.globalAlpha = Math.min(1, this.open * 1.4);
    c.translate(0, (1 - this.open) * 40 * U);
    // warm wooden wall
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#4d3428'); bg.addColorStop(1, '#2c1d17');
    c.fillStyle = bg;
    c.fillRect(0, -50 * U, W, H + 100 * U);
    c.strokeStyle = 'rgba(0,0,0,0.18)';
    c.lineWidth = 1;
    for (let x = 0; x < W; x += 46 * U) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    const hd = this.header();
    text(c, t('collection'), 20 * U, hd.y - 6 * U, 26 * U, '#ffe7b8', { font: 'bold', align: 'left' });
    const n = Object.keys(this.repaired).length;
    text(c, t('collected', n, this.levels.length), 20 * U, hd.y + 20 * U, 14 * U, '#d9c2a0', { align: 'left' });
    closeBtn(c, hd.closeX, hd.y, U);
    // shelves
    const g = this.grid();
    for (let r = 0; r < g.rows; r++) {
      const y = g.top + g.ch * (r + 1) - 22 * U;
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(6 * U, y + 8 * U, W - 12 * U, 8 * U);
      const sg = c.createLinearGradient(0, y - 4 * U, 0, y + 8 * U);
      sg.addColorStop(0, '#b98552'); sg.addColorStop(1, '#7d5232');
      c.fillStyle = sg;
      c.fillRect(6 * U, y - 4 * U, W - 12 * U, 12 * U);
    }
    for (let i = 0; i < this.levels.length; i++) {
      const cl = this.cell(i);
      const done = !!this.repaired[i];
      const pic = this.thumbs.get(i);
      const s = Math.min(cl.w, cl.h - 22 * U) * 0.92;
      const cy = cl.y + (cl.h - 22 * U) / 2 + 2 * U;
      if (done) {
        // soft spotlight behind a repaired piece
        const glow = c.createRadialGradient(cl.x, cy, 2, cl.x, cy, s * 0.6);
        glow.addColorStop(0, 'rgba(255,226,170,0.32)'); glow.addColorStop(1, 'rgba(255,226,170,0)');
        c.fillStyle = glow;
        c.beginPath(); c.arc(cl.x, cy, s * 0.6, 0, Math.PI * 2); c.fill();
      }
      if (pic) c.drawImage(pic, cl.x - s / 2, cy - s / 2, s, s);
      else {
        c.fillStyle = 'rgba(255,255,255,0.08)';
        c.beginPath(); rrc(c, cl.x, cy, s * 0.7, s * 0.5, 10 * U); c.fill();
      }
      const label = done ? tr(this.levels[i].device.name) : '???';
      setFont(c, 10.5 * U, 'bold');
      c.fillStyle = done ? '#ffe7b8' : '#9a8470';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(fit(c, label, cl.w - 6 * U), cl.x, cl.y + cl.h - 10 * U);
    }
    c.restore();
    if (this.detailOpen > 0.01 && this.detail >= 0) this.drawDetail(c);
  }

  detailRect() {
    const { W, H, U } = view;
    const w = Math.min(W - 28 * U, 380 * U), h = Math.min(H - view.top - 40 * U, 640 * U);
    return { x: W / 2, y: view.top + 20 * U + h / 2, w, h };
  }

  drawDetail(c: C): void {
    const { W, H, U } = view;
    const L = this.levels[this.detail];
    const rec = this.repaired[this.detail];
    const r = this.detailRect();
    const k = this.detailOpen;
    c.save();
    c.fillStyle = `rgba(10,8,14,${0.6 * k})`;
    c.fillRect(0, 0, W, H);
    c.globalAlpha = k;
    c.translate(r.x, r.y);
    c.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); rrc(c, -3, 6, r.w, r.h, 18 * U); c.fill();
    c.fillStyle = '#d99a3f';
    c.beginPath(); rrc(c, 0, 0, r.w, r.h, 18 * U); c.fill();
    c.fillStyle = '#fbf2dc';
    c.beginPath(); rrc(c, 0, 0, r.w - 12 * U, r.h - 12 * U, 14 * U); c.fill();
    const top = -r.h / 2;
    text(c, tr(L.device.name), 0, top + 34 * U, 22 * U, '#3b2a1e', { font: 'bold' });
    closeBtn(c, r.w / 2 - 8 * U, top + 8 * U, U);
    // the turntable
    const vs = Math.min(r.w - 40 * U, r.h * 0.5);
    const vy = top + 60 * U + vs / 2;
    const stage = c.createRadialGradient(0, vy, 4, 0, vy, vs * 0.62);
    stage.addColorStop(0, '#3d66a8'); stage.addColorStop(1, '#1f3866');
    c.fillStyle = stage;
    c.beginPath(); rrc(c, 0, vy, vs, vs, 16 * U); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath(); c.ellipse(0, vy + vs * 0.3, vs * 0.36, vs * 0.07, 0, 0, Math.PI * 2); c.fill();
    const px = Math.round(vs * Math.min(view.dpr, 2));
    const img = renderShowcase(L.device, this.orient, px);
    if (img) c.drawImage(img, -vs / 2, vy - vs / 2, vs, vs);
    text(c, '↻ ' + t('dragToSpin'), 0, vy + vs / 2 - 14 * U, 12 * U, 'rgba(255,255,255,0.75)', { font: 'bold' });
    // whose it was
    let y = vy + vs / 2 + 26 * U;
    c.fillStyle = L.tag;
    c.beginPath(); rrc(c, 0, y, Math.min(r.w - 40 * U, 220 * U), 30 * U, 15 * U); c.fill();
    text(c, t('ownerOf', L.name), 0, y + 1, 15 * U, '#fff', { font: 'bold' });
    y += 34 * U;
    text(c, `${t('dayN', L.day)}  ·  ${t('earned')}: $${rec?.earned ?? L.pay}`, 0, y, 14 * U, '#7a5a3a', { font: 'bold' });
    // their thank-you line
    const quote = L.leave[0];
    if (quote) {
      setFont(c, 15 * U, 'hand');
      const lines = wrap(c, `“${lang === 'vi' ? quote.vi : quote.en}”`, r.w - 56 * U).slice(0, 3);
      lines.forEach((ln, i) => text(c, ln, 0, y + 28 * U + i * 19 * U, 15 * U, '#3b2a1e'));
    }
    c.restore();
  }

  // ---------- input ----------

  /** Returns true when the screen took the touch. */
  down(x: number, y: number): boolean {
    if (!this.shown) return false;
    const U = view.U;
    if (this.detail >= 0) {
      const r = this.detailRect();
      const lx = x - r.x, ly = y - r.y;
      if (Math.abs(lx) > r.w / 2 || Math.abs(ly) > r.h / 2 || Math.hypot(lx - (r.w / 2 - 8 * U), ly - (-r.h / 2 + 8 * U)) < 22 * U) {
        this.detail = -1;
        sfx.tap();
        return true;
      }
      this.spin.held = true;
      this.spin.px = x; this.spin.py = y; this.spin.moved = false;
      this.spin.vx = 0; this.spin.vy = 0;
      return true;
    }
    const hd = this.header();
    if (Math.hypot(x - hd.closeX, y - hd.y) < 24 * U) { this.close(); return true; }
    for (let i = 0; i < this.levels.length; i++) {
      const cl = this.cell(i);
      if (Math.abs(x - cl.x) < cl.w / 2 && y > cl.y && y < cl.y + cl.h) {
        if (this.repaired[i]) this.openDetail(i);
        else sfx.error();
        return true;
      }
    }
    return true;
  }

  move(x: number, y: number): boolean {
    if (!this.shown) return false;
    if (this.detail >= 0 && this.spin.held) {
      const dx = x - this.spin.px, dy = y - this.spin.py;
      this.spin.px = x; this.spin.py = y;
      spinShowcase(this.orient, dx, dy);
      this.spin.vx = this.spin.vx * 0.5 + dx * 0.5;
      this.spin.vy = this.spin.vy * 0.5 + dy * 0.5;
      this.spin.at = this.time;
    }
    return true;
  }

  up(): boolean {
    if (!this.shown) return false;
    if (this.spin.held) {
      this.spin.held = false;
      if (this.time - this.spin.at > 0.1) { this.spin.vx = 0; this.spin.vy = 0; }
    }
    return true;
  }
}

/** The gadget's shape filled dark: a mystery on the shelf. */
function silhouette(pic: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = pic.width; out.height = pic.height;
  const g = out.getContext('2d')!;
  g.drawImage(pic, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(24,14,12,0.92)';
  g.fillRect(0, 0, out.width, out.height);
  return out;
}

function closeBtn(c: C, x: number, y: number, U: number): void {
  c.fillStyle = '#e0443a';
  c.beginPath(); rrc(c, x, y, 30 * U, 30 * U, 8 * U); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 3 * U; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x - 7 * U, y - 7 * U); c.lineTo(x + 7 * U, y + 7 * U);
  c.moveTo(x + 7 * U, y - 7 * U); c.lineTo(x - 7 * U, y + 7 * U);
  c.stroke();
}

function fit(c: C, s: string, w: number): string {
  if (c.measureText(s).width <= w) return s;
  let out = s;
  while (out.length > 2 && c.measureText(out + '…').width > w) out = out.slice(0, -1);
  return out + '…';
}
