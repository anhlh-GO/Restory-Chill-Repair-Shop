// Improve the shop: four upgrade tracks, three tiers each, paid with the cash
// customers leave. Upgrades only change how the shop looks; no job ever needs
// one. Opened from the wall sign at the counter or from the end-of-day card.

import { type C, rrc, text, button, setFont, wrap, shade } from '../core/draw';
import { view } from '../core/view';
import { sfx, haptic } from '../core/audio';
import { emit, toast } from '../core/fx';
import { t, tr } from '../core/i18n';
import { drawCash } from './desk';
import { closeBtn, fit } from './collection';
import { SHOP, TRACKS, type Track, tierOf, canBuy, buy, served } from '../content/meta';

export interface ShopHost {
  money(): number;
  /** Take the money; returns the refund for when saving fails. */
  pay(n: number): () => void;
  cashPulse(): number;
  /** The repair record (which customers have been served). */
  done(): Record<number, unknown>;
  onBought(track: Track): void;
}

export class Shop {
  host: ShopHost;
  shown = false;
  open = 0;
  press: Track | null = null;
  flash: Partial<Record<Track, number>> = {};
  time = 0;

  constructor(host: ShopHost) {
    this.host = host;
  }

  show(): void {
    this.shown = true;
    this.press = null;
    sfx.tap();
  }

  close(): void {
    this.shown = false;
    sfx.tap();
  }

  update(dt: number): void {
    this.time += dt;
    this.open += ((this.shown ? 1 : 0) - this.open) * Math.min(1, dt * 12);
    for (const k of TRACKS) if (this.flash[k]) this.flash[k] = Math.max(0, this.flash[k]! - dt * 1.5);
  }

  // ---------- layout ----------

  header() {
    const { W, U } = view;
    return { y: view.top + 40 * U, closeX: W - 34 * U };
  }

  card(i: number) {
    const { W, H, U } = view;
    const top = view.top + 132 * U, bottom = H - 14 * U;
    const gap = 10 * U;
    const h = Math.min(150 * U, (bottom - top - gap * 3) / 4);
    return { x: W / 2, y: top + i * (h + gap) + h / 2, w: W - 24 * U, h };
  }

  buyBtn(i: number) {
    const U = view.U;
    const r = this.card(i);
    return { x: r.x + r.w / 2 - 62 * U, y: r.y - r.h / 2 + 30 * U, w: 104 * U, h: 36 * U };
  }

  // ---------- drawing ----------

  draw(c: C): void {
    if (this.open < 0.01) return;
    const { W, H, U } = view;
    c.save();
    c.globalAlpha = Math.min(1, this.open * 1.4);
    c.translate(0, (1 - this.open) * 40 * U);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#36465e'); bg.addColorStop(1, '#1f2838');
    c.fillStyle = bg;
    c.fillRect(0, -50 * U, W, H + 100 * U);
    // pegboard dots
    c.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = 18 * U; y < H; y += 26 * U) for (let x = 13 * U; x < W; x += 26 * U) { c.beginPath(); c.arc(x, y, 2.4 * U, 0, Math.PI * 2); c.fill(); }
    const hd = this.header();
    text(c, t('shopTitle'), 20 * U, hd.y - 6 * U, 26 * U, '#ffe7b8', { font: 'bold', align: 'left' });
    drawCash(c, 20 * U, hd.y + 10 * U, this.host.money(), U, this.host.cashPulse());
    closeBtn(c, hd.closeX, hd.y, U);
    setFont(c, 13 * U, 'hand');
    wrap(c, t('shopSub'), W - 40 * U).slice(0, 2).forEach((ln, i) => text(c, ln, 20 * U, view.top + 100 * U + i * 15 * U, 13 * U, '#c9d3e6', { align: 'left' }));
    const done = this.host.done();
    TRACKS.forEach((k, i) => this.drawCard(c, k, i, done));
    c.restore();
  }

  drawCard(c: C, k: Track, i: number, done: Record<number, unknown>): void {
    const U = view.U;
    const def = SHOP[k];
    const r = this.card(i);
    const tier = tierOf(k);
    const locked = served(done) < def.after;
    const fl = this.flash[k] ?? 0;
    c.save();
    c.translate(r.x, r.y);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath(); rrc(c, -2, 5, r.w, r.h, 14 * U); c.fill();
    c.fillStyle = locked ? '#8a7a68' : '#d99a3f';
    c.beginPath(); rrc(c, 0, 0, r.w, r.h, 14 * U); c.fill();
    c.fillStyle = locked ? '#d8d0c4' : '#fbf2dc';
    c.beginPath(); rrc(c, 0, 0, r.w - 10 * U, r.h - 10 * U, 11 * U); c.fill();
    if (fl > 0) {
      c.fillStyle = `rgba(255,236,150,${fl * 0.6})`;
      c.beginPath(); rrc(c, 0, 0, r.w - 10 * U, r.h - 10 * U, 11 * U); c.fill();
    }
    const left = -r.w / 2 + 18 * U, top = -r.h / 2;
    text(c, def.icon, left + 14 * U, top + 30 * U, 24 * U, '#000');
    text(c, tr(def.name), left + 36 * U, top + 24 * U, 18 * U, '#3b2a1e', { font: 'bold', align: 'left' });
    setFont(c, 13 * U, 'hand');
    c.fillStyle = '#7a5a3a';
    c.textAlign = 'left';
    c.fillText(fit(c, tr(def.perk), r.w - 170 * U), left + 36 * U, top + 44 * U);
    // tier chips
    const n = def.tiers.length;
    const cw = (r.w - 36 * U) / n, cy = top + r.h * 0.5 + 26 * U;
    const ch = Math.min(44 * U, r.h - 82 * U);
    def.tiers.forEach((tt, j) => {
      const cx = left + cw * (j + 0.5);
      const own = j < tier;
      c.fillStyle = own ? '#7ccf3c' : j === tier && !locked ? '#f2e2bf' : 'rgba(0,0,0,0.08)';
      c.beginPath(); rrc(c, cx, cy, cw - 8 * U, ch, 9 * U); c.fill();
      if (j === tier && !locked) {
        c.strokeStyle = '#d99a3f'; c.lineWidth = 2 * U;
        c.beginPath(); rrc(c, cx, cy, cw - 8 * U, ch, 9 * U); c.stroke();
      }
      const col = own ? '#fff' : '#3b2a1e';
      setFont(c, 12 * U, 'bold');
      c.fillStyle = col;
      c.textAlign = 'center';
      c.fillText(fit(c, tr(tt.name), cw - 16 * U), cx, cy - ch * 0.18);
      text(c, own ? '✓' : `$${tt.price}`, cx, cy + ch * 0.24, 12 * U, own ? '#fff' : '#2f7a2f', { font: 'bold' });
    });
    c.restore();
    // the buy button / state, in screen space so hit tests match
    const b = this.buyBtn(i);
    if (locked) {
      text(c, '🔒 ' + t('unlockAfter', def.after), b.x + b.w / 2 + 2 * U, b.y, 12 * U, '#5a4a3a', { font: 'bold', align: 'right', maxW: 160 * U });
    } else if (tier >= n) {
      text(c, t('owned'), b.x, b.y, 14 * U, '#2f7a2f', { font: 'bold' });
    } else {
      const ok = canBuy(k, tier + 1, this.host.money(), done) === 'ok';
      button(c, b.x, b.y, b.w, b.h, t('buy', def.tiers[tier].price), ok ? '#7ccf3c' : shade('#7ccf3c', -0.1), this.press === k, 14 * U, !ok);
    }
  }

  // ---------- input ----------

  down(x: number, y: number): boolean {
    if (!this.shown) return false;
    const U = view.U;
    const hd = this.header();
    if (Math.hypot(x - hd.closeX, y - hd.y) < 24 * U) { this.close(); return true; }
    this.press = null;
    TRACKS.forEach((k, i) => {
      const b = this.buyBtn(i);
      if (Math.abs(x - b.x) < b.w / 2 + 4 && Math.abs(y - b.y) < b.h / 2 + 6) this.press = k;
    });
    if (this.press) sfx.tap();
    return true;
  }

  up(x: number, y: number): boolean {
    if (!this.shown) return false;
    const k = this.press;
    this.press = null;
    if (!k) return true;
    const b = this.buyBtn(TRACKS.indexOf(k));
    if (Math.abs(x - b.x) > b.w / 2 + 10 || Math.abs(y - b.y) > b.h / 2 + 10) return true;
    this.tryBuy(k);
    return true;
  }

  tryBuy(k: Track): void {
    const { W, U } = view;
    const done = this.host.done();
    const next = tierOf(k) + 1;
    const why = canBuy(k, next, this.host.money(), done);
    const r = this.card(TRACKS.indexOf(k));
    if (why !== 'ok') {
      sfx.error();
      toast(t(why === 'cash' ? 'notEnough' : why === 'prev' ? 'needPrev' : 'locked'), W / 2, r.y, 15 * U);
      return;
    }
    if (!buy(k, next, this.host.money(), done, (n) => this.host.pay(n))) { sfx.error(); return; }
    sfx.cash();
    sfx.sparkle();
    haptic(30);
    this.flash[k] = 1;
    emit('star', W / 2, r.y, 14, { color: ['#ffd23f', '#fff'], speed: 220, size: 7 });
    toast(t('bought'), W / 2, r.y - r.h / 2 - 4 * U, 16 * U);
    this.host.onBought(k);
  }
}
