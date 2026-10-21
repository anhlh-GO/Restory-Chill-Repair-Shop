// The card after a customer leaves, when no studio layer runs the flow:
// "Fixed it!" with the gadget, or the end-of-day tally, the end of chapter 1,
// or the finale. Buttons: carry on (next customer / next day / day 16 / play
// again), improve the shop (end of a day, once it has opened) and the collection.

import { type C, rrc, text, button } from '../core/draw';
import { view } from '../core/view';
import { sfx } from '../core/audio';
import { emit } from '../core/fx';
import { t, tr } from '../core/i18n';
import type { Level } from '../content/story';
import { showcaseThumb } from '../three/showcase3d';
import type { MemoryDef } from '../content/meta';

export type ResultKind = 'next' | 'day' | 'chapter' | 'end';

export interface ResultHost {
  onContinue(): void;
  onCollection(): void;
  onShop(): void;
}

export class Results {
  host: ResultHost;
  shown = false;
  open = 0;
  kind: ResultKind = 'next';
  L!: Level;
  earned = 0;
  today: { L: Level; earned: number }[] = [];
  /** Offer the shop button (end of a day, once the shop has opened). */
  shop = false;
  memories: MemoryDef[] = [];
  pic: HTMLCanvasElement | null = null;
  press = -1;
  time = 0;

  constructor(host: ResultHost) {
    this.host = host;
  }

  show(L: Level, earned: number, kind: ResultKind, today: { L: Level; earned: number }[], shop = false, memories: MemoryDef[] = []): void {
    this.L = L;
    this.shop = shop && kind !== 'next' && kind !== 'end';
    this.memories = memories;
    this.earned = earned;
    this.kind = kind;
    this.today = today;
    this.shown = true;
    this.open = 0;
    this.press = -1;
    const size = Math.round(150 * view.U * Math.min(view.dpr, 2));
    this.pic = showcaseThumb(L.device, size);
    sfx.success();
    emit('star', view.W / 2, view.H * 0.36, 16, { color: ['#ffd23f', '#fff'], speed: 220, size: 7 });
  }

  hide(): void {
    this.shown = false;
    this.open = 0;
  }

  update(dt: number): void {
    this.time += dt;
    this.open += ((this.shown ? 1 : 0) - this.open) * Math.min(1, dt * 10);
  }

  rect() {
    const { W, H, U } = view;
    const w = Math.min(W - 36 * U, 330 * U);
    const extra = (this.shop ? 52 * U : 0) + this.memories.length * 22 * U;
    const h = (this.kind === 'day' || this.kind === 'chapter' ? Math.min(H - 80 * U, (this.kind === 'chapter' ? 500 : 470) * U + Math.max(0, this.today.length - 2) * 22 * U) : 420 * U) + extra;
    return { x: W / 2, y: H * 0.47, w, h: Math.min(h, H - 40 * U) };
  }

  buttons() {
    const { U } = view;
    const r = this.rect();
    const out = [
      { x: r.x, y: r.y + r.h / 2 - 96 * U, w: 220 * U, h: 50 * U, id: 'go' },
      { x: r.x, y: r.y + r.h / 2 - 38 * U, w: 200 * U, h: 40 * U, id: 'collection' },
    ];
    if (this.shop) {
      out[0].y -= 52 * U;
      out.splice(1, 0, { x: r.x, y: r.y + r.h / 2 - 90 * U, w: 200 * U, h: 40 * U, id: 'shop' });
    }
    return out;
  }

  draw(c: C): void {
    if (this.open < 0.01) return;
    const { W, H, U } = view;
    const r = this.rect();
    const k = this.open;
    c.save();
    c.fillStyle = `rgba(14,10,22,${0.55 * k})`;
    c.fillRect(0, 0, W, H);
    c.globalAlpha = Math.min(1, k * 1.3);
    c.translate(r.x, r.y);
    const s = 0.85 + 0.15 * k;
    c.scale(s, s);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); rrc(c, -3, 7, r.w, r.h, 18 * U); c.fill();
    c.fillStyle = '#d99a3f';
    c.beginPath(); rrc(c, 0, 0, r.w, r.h, 18 * U); c.fill();
    c.fillStyle = '#fbf2dc';
    c.beginPath(); rrc(c, 0, 0, r.w - 12 * U, r.h - 12 * U, 14 * U); c.fill();
    const top = -r.h / 2;
    const title = this.kind === 'day' ? t('dayOver', this.L.day) : this.kind === 'end' ? t('allDone') : this.kind === 'chapter' ? t('chapterDone') : t('fixedIt');
    const big = this.kind === 'end' || this.kind === 'chapter';
    text(c, title, 0, top + 38 * U, big ? 21 * U : 26 * U, '#3b2a1e', { font: 'bold' });
    let y = top + 64 * U;
    if (big) {
      text(c, t(this.kind === 'end' ? 'allDoneSub' : 'chapterDoneSub'), 0, y, 14 * U, '#7a5a3a', { maxW: r.w - 30 * U });
      y += 10 * U;
    }
    // the gadget on a little spotlight
    const ps = 150 * U;
    const py = y + ps / 2 + 4 * U;
    const glow = c.createRadialGradient(0, py, 4, 0, py, ps * 0.6);
    glow.addColorStop(0, 'rgba(255,214,140,0.55)'); glow.addColorStop(1, 'rgba(255,214,140,0)');
    c.fillStyle = glow;
    c.beginPath(); c.arc(0, py, ps * 0.6, 0, Math.PI * 2); c.fill();
    if (this.pic) {
      const bob = Math.sin(this.time * 2) * 3 * U;
      c.drawImage(this.pic, -ps / 2, py - ps / 2 + bob, ps, ps);
    }
    y = py + ps / 2 + 10 * U;
    text(c, tr(this.L.device.name), 0, y, 16 * U, '#3b2a1e', { font: 'bold' });
    y += 26 * U;
    if (this.kind === 'day' || this.kind === 'chapter') {
      text(c, t('todayFixed'), 0, y, 14 * U, '#7a5a3a', { font: 'bold' });
      y += 22 * U;
      let sum = 0;
      for (const d of this.today) {
        sum += d.earned;
        text(c, tr(d.L.device.name), -r.w / 2 + 34 * U, y, 15 * U, '#3b2a1e', { align: 'left' });
        text(c, `$${d.earned}`, r.w / 2 - 34 * U, y, 15 * U, '#2f7a2f', { align: 'right', font: 'bold' });
        y += 22 * U;
      }
      c.strokeStyle = 'rgba(120,90,60,0.4)'; c.lineWidth = 1.5;
      c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(-r.w / 2 + 30 * U, y - 8 * U); c.lineTo(r.w / 2 - 30 * U, y - 8 * U); c.stroke();
      c.setLineDash([]);
      text(c, t('todayEarned'), -r.w / 2 + 34 * U, y + 8 * U, 16 * U, '#3b2a1e', { align: 'left', font: 'bold' });
      text(c, `$${sum}`, r.w / 2 - 34 * U, y + 8 * U, 18 * U, '#2f7a2f', { align: 'right', font: 'bold' });
      y += 18 * U;
    } else {
      // the coin pill
      const pulse = 1 + Math.sin(this.time * 4) * 0.03;
      c.save();
      c.translate(0, y);
      c.scale(pulse, pulse);
      c.fillStyle = '#7ccf3c';
      c.beginPath(); rrc(c, 0, 0, 120 * U, 34 * U, 17 * U); c.fill();
      text(c, `+ ${this.earned}`, 0, 1, 19 * U, '#fff', { font: 'bold' });
      c.restore();
      y += 10 * U;
    }
    // keepsakes this customer unlocked
    for (const m of this.memories) {
      y += 22 * U;
      text(c, `${m.icon} ${t('newMemory', tr(m.name))}`, 0, y, 14 * U, '#b0602a', { font: 'bold', maxW: r.w - 30 * U });
    }
    c.restore();
    // buttons (screen space, so hit-tests match)
    c.save();
    c.globalAlpha = Math.min(1, k * 1.3);
    const main = this.kind === 'day' ? t('nextDayBtn') : this.kind === 'end' ? t('playAgain') : this.kind === 'chapter' ? t('chapterNext') : t('nextCustomerBtn');
    this.buttons().forEach((b, i) => {
      if (b.id === 'go') button(c, b.x, b.y, b.w, b.h, main, this.kind === 'end' ? '#4a90e2' : '#7ccf3c', this.press === i, 19 * U);
      else if (b.id === 'shop') button(c, b.x, b.y, b.w, b.h, t('improveShop'), '#4a90e2', this.press === i, 16 * U);
      else button(c, b.x, b.y, b.w, b.h, t('collectionBtn'), '#d99a3f', this.press === i, 16 * U);
    });
    c.restore();
  }

  /** Returns true when the card took the touch. */
  down(x: number, y: number): boolean {
    if (!this.shown || this.open < 0.6) return this.shown;
    this.press = this.buttons().findIndex((b) => Math.abs(x - b.x) < b.w / 2 && Math.abs(y - b.y) < b.h / 2 + 4);
    if (this.press >= 0) sfx.tap();
    return true;
  }

  up(x: number, y: number): boolean {
    if (!this.shown) return false;
    const i = this.press;
    this.press = -1;
    if (i < 0) return true;
    const b = this.buttons()[i];
    if (Math.abs(x - b.x) > b.w / 2 + 8 || Math.abs(y - b.y) > b.h / 2 + 8) return true;
    if (b.id === 'go') this.host.onContinue();
    else if (b.id === 'shop') this.host.onShop();
    else this.host.onCollection();
    return true;
  }
}
