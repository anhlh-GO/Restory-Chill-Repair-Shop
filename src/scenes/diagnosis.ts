// Quick Diagnosis: right after the box opens, the customer's symptom and a few
// suspect parts. One guess: the right part earns a small bonus; a wrong one is
// no loss, the card just says let's find the cause together. Skip is always there.

import { type C, rrc, text, setFont, wrap, shade, rng } from '../core/draw';
import { view } from '../core/view';
import { sfx, haptic } from '../core/audio';
import { emit } from '../core/fx';
import { t, tr, lang } from '../core/i18n';
import { wait } from '../core/tween';
import type { Level } from '../content/story';
import type { PartDef } from '../content/device';

export type DiagLevel = 'easy' | 'normal' | 'advanced';

/** No card for the first three customers; more suspects as the game goes on. */
export function diagLevelFor(index: number): DiagLevel | null {
  if (index < 3) return null;
  if (index < 8) return 'easy';
  if (index < 20) return 'normal';
  return 'advanced';
}

const CHOICES: Record<DiagLevel, number> = { easy: 2, normal: 3, advanced: 4 };

/** The bonus for naming the cause first time: about a tenth of the repair fee. */
export const diagBonus = (L: Level): number => Math.max(2, Math.round(L.pay * 0.1));

interface Opt { part: PartDef; right: boolean; shake: number; x: number; y: number; w: number; h: number }

export class Diagnosis {
  L: Level;
  lvl: DiagLevel;
  opts: Opt[];
  /** The guess: -1 while the card waits for one. */
  picked = -1;
  result: 'right' | 'wrong' | 'skip' | null = null;
  /** 1 while showing, eases to 0 when it leaves. */
  open = 0;
  leaving = false;
  time = 0;
  press = -1;
  onDone: (right: boolean) => void;

  constructor(L: Level, lvl: DiagLevel, onDone: (right: boolean) => void) {
    this.L = L;
    this.lvl = lvl;
    this.onDone = onDone;
    const jobs = new Set([L.broken, ...(L.tasks ?? []).map((tk) => tk.part)]);
    const right = L.device.parts.find((p) => p.id === L.broken)!;
    // one suspect per name: two "AA Battery" buttons would only confuse
    const names = new Set([right.name.en]);
    const pool = L.device.parts.filter((p) => {
      if (p.kind === 'screw' || jobs.has(p.id) || names.has(p.name.en)) return false;
      names.add(p.name.en);
      return true;
    });
    const r = rng(L.pay * 37 + L.day * 11);
    pool.sort(() => r() - 0.5);
    const list: Opt[] = [right, ...pool.slice(0, CHOICES[lvl] - 1)].map((part) => ({ part, right: part === right, shake: 0, x: 0, y: 0, w: 0, h: 0 }));
    list.sort(() => r() - 0.5);
    this.opts = list;
    sfx.whoosh();
  }

  rect() {
    const { W, H, U } = view;
    const w = Math.min(W - 24 * U, 380 * U);
    const rows = Math.ceil(this.opts.length / 2);
    const h = 150 * U + rows * 54 * U;
    return { x: W / 2, y: H - 14 * U - h / 2, w, h };
  }

  skipBtn() {
    const U = view.U;
    const r = this.rect();
    return { x: r.x + r.w / 2 - 50 * U, y: r.y - r.h / 2 + 26 * U, w: 76 * U, h: 30 * U };
  }

  layout(): void {
    const U = view.U;
    const r = this.rect();
    const cols = 2, gap = 10 * U;
    const ow = (r.w - 32 * U - gap) / cols, oh = 46 * U;
    const y0 = r.y + r.h / 2 - 16 * U - Math.ceil(this.opts.length / cols) * (oh + gap) + gap + oh / 2;
    this.opts.forEach((o, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const lastAlone = i === this.opts.length - 1 && this.opts.length % 2 === 1;
      o.w = ow; o.h = oh;
      o.x = lastAlone ? r.x : r.x - r.w / 2 + 16 * U + ow / 2 + col * (ow + gap);
      o.y = y0 + row * (oh + gap);
    });
  }

  update(dt: number): void {
    this.time += dt;
    this.open += ((this.leaving ? 0 : 1) - this.open) * Math.min(1, dt * 10);
    for (const o of this.opts) o.shake = Math.max(0, o.shake - dt * 3);
  }

  draw(c: C): void {
    if (this.open < 0.01) return;
    const { U } = view;
    this.layout();
    const r = this.rect();
    const k = this.open;
    c.save();
    c.globalAlpha = Math.min(1, k * 1.3);
    c.translate(0, (1 - k) * 60 * U);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); rrc(c, r.x - 2, r.y + 6, r.w, r.h, 18 * U); c.fill();
    c.fillStyle = '#4a90e2';
    c.beginPath(); rrc(c, r.x, r.y, r.w, r.h, 18 * U); c.fill();
    c.fillStyle = '#f4f8ff';
    c.beginPath(); rrc(c, r.x, r.y, r.w - 10 * U, r.h - 10 * U, 14 * U); c.fill();
    const left = r.x - r.w / 2 + 20 * U, top = r.y - r.h / 2;
    text(c, '🔍 ' + t('diagTitle'), left, top + 28 * U, 19 * U, '#1f3866', { font: 'bold', align: 'left' });
    if (!this.result) {
      const sb = this.skipBtn();
      c.fillStyle = 'rgba(31,56,102,0.1)';
      c.beginPath(); rrc(c, sb.x, sb.y, sb.w, sb.h, sb.h / 2); c.fill();
      text(c, t('diagSkip') + ' ›', sb.x, sb.y + 1, 13 * U, '#1f3866', { font: 'bold' });
    }
    // the customer's words
    c.fillStyle = this.L.tag;
    c.beginPath(); rrc(c, left + 4 * U, top + 62 * U, 8 * U, 8 * U, 4 * U); c.fill();
    setFont(c, 17 * U, 'hand');
    const say = `${this.L.name}: “${lang === 'vi' ? this.L.symptom.vi : this.L.symptom.en}”`;
    wrap(c, say, r.w - 50 * U).slice(0, 2).forEach((ln, i) => text(c, ln, left + 14 * U, top + 62 * U + i * 21 * U, 17 * U, '#2b2b33', { align: 'left' }));
    // the ask, then the verdict in its place
    const line = this.result === 'right' ? t('diagRight', diagBonus(this.L)) : this.result === 'wrong' ? t('diagWrong') : t('diagAsk');
    const col = this.result === 'right' ? '#2f7a2f' : this.result === 'wrong' ? '#b0602a' : '#5a6a8a';
    text(c, line, r.x, top + 112 * U, this.result ? 15 * U : 13 * U, col, { font: 'bold', maxW: r.w - 30 * U });
    // suspects
    this.opts.forEach((o, i) => {
      const sx = Math.sin(this.time * 60) * o.shake * 6 * U;
      const mine = this.picked === i;
      const fill = mine && o.right ? '#7ccf3c' : mine ? '#f2c9b8' : this.press === i ? '#dbe7fb' : '#ffffff';
      c.save();
      c.translate(o.x + sx, o.y);
      // after the guess, the other suspects step back
      if (this.result && !mine) c.globalAlpha *= 0.45;
      c.fillStyle = shade('#4a90e2', -0.25);
      c.beginPath(); rrc(c, 0, 3 * U, o.w, o.h, 11 * U); c.fill();
      c.fillStyle = fill;
      c.beginPath(); rrc(c, 0, 0, o.w, o.h, 11 * U); c.fill();
      c.strokeStyle = 'rgba(74,144,226,0.6)'; c.lineWidth = 1.5 * U;
      c.beginPath(); rrc(c, 0, 0, o.w, o.h, 11 * U); c.stroke();
      text(c, o.part.icon ?? '⚙', -o.w / 2 + 20 * U, 1, 18 * U, '#000');
      text(c, tr(o.part.name), -o.w / 2 + 38 * U, 1, 14.5 * U, mine && o.right ? '#fff' : '#1f3866', { font: 'bold', align: 'left', maxW: o.w - 46 * U });
      c.restore();
    });
    c.restore();
  }

  down(x: number, y: number): void {
    if (this.result) return;
    const sb = this.skipBtn();
    if (Math.abs(x - sb.x) < sb.w / 2 + 6 && Math.abs(y - sb.y) < sb.h / 2 + 6) { this.finish('skip'); sfx.tap(); return; }
    this.layout();
    this.press = this.opts.findIndex((o) => Math.abs(x - o.x) < o.w / 2 && Math.abs(y - o.y) < o.h / 2 + 3);
    if (this.press >= 0) sfx.tap();
  }

  up(x: number, y: number): void {
    const i = this.press;
    this.press = -1;
    if (i < 0 || this.result) return;
    const o = this.opts[i];
    if (Math.abs(x - o.x) > o.w / 2 + 10 || Math.abs(y - o.y) > o.h / 2 + 10) return;
    this.picked = i;
    if (o.right) {
      sfx.success();
      haptic(25);
      emit('spark', o.x, o.y, 16, { color: ['#fff', '#c8f7a0', '#ffe28a'], speed: 200, size: 7 });
      this.finish('right');
    } else {
      o.shake = 1;
      sfx.error();
      haptic(15);
      this.finish('wrong');
    }
  }

  /** One guess only: show the verdict for a moment, then let the bench carry on. */
  finish(res: 'right' | 'wrong' | 'skip'): void {
    this.result = res;
    wait(res === 'skip' ? 0.05 : 1.5, () => {
      this.leaving = true;
      wait(0.25, () => this.onDone(res === 'right'));
    });
  }
}
