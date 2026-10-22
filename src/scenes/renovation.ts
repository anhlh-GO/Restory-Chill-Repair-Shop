// Shop Renovation: the storefront in 3D on top, the selected upgrade's card
// below. Tap the sign, the wall, the shutter or the yard to pick what to work on;
// only what can be bought now gets a pin. Upgrade → the camera flies to the spot,
// the before state turns into the after state with its own animation (tap to skip),
// and finishing a stage hands out an interior reward. Replaces the old Shop screen.

import FalconSDK from '@falcongames/game-client-sdk';
import { type C, rrc, text, button, setFont, wrap, shade } from '../core/draw';
import { view } from '../core/view';
import { sfx, haptic } from '../core/audio';
import { emit, toast } from '../core/fx';
import { t, tr } from '../core/i18n';
import { drawCash } from './desk';
import { closeBtn } from './collection';
import { SHOP, completeReno, renoDone, setReno, type Track } from '../content/meta';
import { UPGRADES, STAGES, byId, statusOf, lockReason, currentDay, currentStage, rewardsFor, stageDone, type UpgradeDef, type VisualId } from '../content/renovation';
import { LEVELS } from '../content/story';
import { storefront, AREA, type Area } from '../three/storefront3d';
import { showcaseThumb } from '../three/showcase3d';

export interface RenovationHost {
  money(): number;
  /** Take the money; returns the refund for when saving fails. */
  pay(n: number): () => void;
  /** Debug only: hand out cash. */
  give(n: number): void;
  cashPulse(): number;
  done(): Record<number, unknown>;
  /** An upgrade landed: the counter and bench wear the new look. */
  onChanged(): void;
}

const DUR: Record<string, number> = { sweep: 1.8, plaster: 1.6, lamp: 1.4, paint: 2.2, shutter: 2.0, sign: 2.0, awning: 1.4, pop: 1.6, grand: 3.2 };

const DEBUG = import.meta.env.DEV && new URLSearchParams(location.search).get('reno') === 'debug';

export function track(name: string, d: UpgradeDef | null, extra: Record<string, unknown> = {}): void {
  try {
    FalconSDK.analytics?.logAction(name, { where: 'renovation', params: { upgrade_id: d?.id, stage_id: d?.stage, upgrade_price: d?.price, ...extra } });
  } catch { /* analytics never breaks play */ }
}

export class Renovation {
  host: RenovationHost;
  shown = false;
  open = 0;
  time = 0;
  sel: UpgradeDef = UPGRADES[0];
  /** Renovating now: the upgrade, 0..1 through its animation. */
  anim: { d: UpgradeDef; t: number } | null = null;
  /** Previewing the after state: seconds left. */
  preview = 0;
  /** The stage-complete banner: the stage, seconds left. */
  banner: { stage: number; left: number } | null = null;
  press = '';
  lastBuy = 0;

  constructor(host: RenovationHost) {
    this.host = host;
  }

  /** Analytics for the result card's nudge (the card lives in game.ts). */
  track = track;

  get day(): number { return currentDay(this.host.done()); }

  /** Open, optionally on a given upgrade (the result card's suggestion). */
  show(focus?: string): void {
    this.shown = true;
    this.anim = null;
    this.preview = 0;
    this.banner = null;
    this.sel = (focus && byId(focus)) || this.defaultPick();
    const sf = storefront();
    if (sf) {
      sf.focus(renoDone().has(this.sel.id) ? null : AREA[this.sel.visual]);
      sf.look = { ...sf.want, zoom: 1 };
      // the showcase holds the gadgets the shop has repaired
      const done = this.host.done();
      const seen = new Set<string>();
      const pics: (HTMLCanvasElement | null)[] = [];
      LEVELS.forEach((L, i) => {
        if (pics.length >= 6 || !done[i] || seen.has(L.device.id)) return;
        seen.add(L.device.id);
        pics.push(showcaseThumb(L.device, 160));
      });
      sf.setShowcase(pics);
    }
    track('shop_upgrade_view', this.sel, { player_day: this.day, cash_before: this.host.money() });
    sfx.tap();
  }

  close(): void {
    if (this.anim) return;
    this.shown = false;
    sfx.tap();
  }

  /** The cheapest upgrade buyable now, else the next one not done. */
  defaultPick(): UpgradeDef {
    const have = renoDone();
    const avail = UPGRADES.filter((d) => statusOf(d, this.day, have) === 'available');
    return avail.find((d) => d.price <= this.host.money()) ?? avail[0] ?? UPGRADES.find((d) => !have.has(d.id)) ?? UPGRADES[UPGRADES.length - 1];
  }

  /** Visual ids already in place (what the model shows). */
  visuals(extra?: VisualId): Set<VisualId> {
    const s = new Set<VisualId>();
    for (const id of renoDone()) { const d = byId(id); if (d) s.add(d.visual); }
    if (extra) s.add(extra);
    return s;
  }

  // ---------- layout ----------

  viewRect() {
    const { W, H, U } = view;
    const top = view.top + 92 * U;
    return { x: 0, y: top, w: W, h: Math.max(200 * U, H - top - 248 * U) };
  }

  cardRect() {
    const { W, H, U } = view;
    const v = this.viewRect();
    return { x: W / 2, y: v.y + v.h + (H - v.y - v.h) / 2 - 4 * U, w: W - 24 * U, h: H - v.y - v.h - 20 * U };
  }

  buttons() {
    const { U } = view;
    const r = this.cardRect();
    const by = r.y + r.h / 2 - 40 * U;
    return {
      buy: { x: r.x + r.w * 0.18, y: by, w: r.w * 0.52, h: 50 * U },
      preview: { x: r.x - r.w * 0.3, y: by, w: r.w * 0.3, h: 44 * U },
      prev: { x: r.x - r.w / 2 + 22 * U, y: r.y - r.h / 2 + 30 * U, w: 36 * U, h: 36 * U },
      next: { x: r.x + r.w / 2 - 22 * U, y: r.y - r.h / 2 + 30 * U, w: 36 * U, h: 36 * U },
    };
  }

  // ---------- update ----------

  update(dt: number): void {
    this.time += dt;
    this.open += ((this.shown ? 1 : 0) - this.open) * Math.min(1, dt * 12);
    if (this.preview > 0) {
      this.preview = Math.max(0, this.preview - dt);
    }
    if (this.banner) {
      this.banner.left -= dt;
      if (this.banner.left <= 0) this.banner = null;
    }
    if (this.anim) {
      const a = this.anim;
      const before = a.t;
      a.t = Math.min(1, a.t + dt / (DUR[a.d.anim] ?? 1.6));
      this.animSounds(a.d, before, a.t);
      if (a.t >= 1) this.finishAnim();
    }
  }

  animSounds(d: UpgradeDef, a: number, b: number): void {
    const cross = (x: number) => a < x && b >= x;
    if (d.anim === 'sweep' && Math.floor(a * 8) !== Math.floor(b * 8)) sfx.scrub();
    if (d.anim === 'paint' && Math.floor(a * 6) !== Math.floor(b * 6)) sfx.squish();
    if (d.anim === 'shutter' && (cross(0.05) || cross(0.62))) sfx.ratchet(10);
    if (d.anim === 'shutter' && cross(0.5)) sfx.clink();
    if (d.anim === 'sign' && cross(0.1)) sfx.whoosh();
    if (d.anim === 'sign' && cross(0.8)) { sfx.place(); sfx.clink(); }
    if (d.anim === 'lamp' && Math.floor(a * 10) !== Math.floor(b * 10) && b < 0.6) sfx.zap();
    if (d.anim === 'lamp' && cross(0.62)) sfx.snap();
    if (d.anim === 'awning' && cross(0.2)) sfx.whoosh();
    if (d.anim === 'pop' && Math.floor(a * 5) !== Math.floor(b * 5)) sfx.pop();
    if (d.anim === 'plaster' && Math.floor(a * 5) !== Math.floor(b * 5)) sfx.scrub();
    if (d.anim === 'grand' && cross(0.25)) sfx.fanfare();
  }

  // ---------- buying ----------

  tryBuy(): void {
    const d = this.sel;
    const day = this.day;
    if (this.anim || renoDone().has(d.id)) return;
    // a double tap must not pay twice
    if (this.time - this.lastBuy < 0.5) return;
    if (lockReason(d, day)) { sfx.error(); toast(this.lockLine(d), view.W / 2, this.cardRect().y - this.cardRect().h / 2 - 20 * view.U, 14 * view.U); return; }
    const cash = this.host.money();
    if (cash < d.price) {
      sfx.error();
      toast(t('notEnough'), view.W / 2, this.cardRect().y - this.cardRect().h / 2 - 20 * view.U, 15 * view.U);
      track('shop_upgrade_insufficient_cash', d, { player_day: day, cash_before: cash });
      return;
    }
    const rewards = rewardsFor(d);
    if (!completeReno(d.id, d.price, rewards, (n) => this.host.pay(n))) { sfx.error(); return; }
    this.lastBuy = this.time;
    track('shop_upgrade_start', d, { player_day: day, cash_before: cash, cash_after: this.host.money() });
    sfx.cash();
    haptic(25);
    this.preview = 0;
    this.anim = { d, t: 0 };
    const sf = storefront();
    if (sf) { if (d.anim === 'grand') sf.wide(); else sf.focus(AREA[d.visual]); }
    if (!sf) this.anim.t = 1;
  }

  finishAnim(): void {
    const a = this.anim!;
    this.anim = null;
    const d = a.d;
    track('shop_upgrade_complete', d, { player_day: this.day, cash_after: this.host.money() });
    sfx.sparkle();
    emit('star', view.W / 2, this.viewRect().y + this.viewRect().h * 0.45, 18, { color: ['#ffd23f', '#fff'], speed: 220, size: 7 });
    toast(`✨ ${tr(d.name)}`, view.W / 2, this.viewRect().y + 40 * view.U, 16 * view.U, 1.8);
    // a whole stage done: the interior gets its reward too
    const rewards = STAGES[d.stage - 1].reward;
    if (stageDone(d.stage) && !this.bannered.has(d.stage)) {
      this.bannered.add(d.stage);
      this.banner = { stage: d.stage, left: 2.8 };
      sfx.fanfare();
      track('shop_stage_complete', d, { player_day: this.day, rewards: rewards.map((r) => `${r.track}:${r.tier}`) });
    }
    this.host.onChanged();
    this.sel = this.defaultPick();
    const sf = storefront();
    if (sf) sf.focus(d.anim === 'grand' ? null : AREA[this.sel.visual]);
  }
  bannered = new Set<number>();

  lockLine(d: UpgradeDef): string {
    const why = lockReason(d, this.day);
    if (!why) return '';
    if (why.kind === 'day') return t('renoLockDay', why.day);
    if (why.kind === 'needs') return t('renoLockNeeds', tr(byId(why.id)!.name));
    return t('renoLockStage', why.stage);
  }

  // ---------- drawing ----------

  draw(c: C): void {
    if (this.open < 0.01) return;
    const { W, H, U } = view;
    c.save();
    c.globalAlpha = Math.min(1, this.open * 1.4);
    // daylight sky behind the 3D street
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#7fc4f0'); sky.addColorStop(0.55, '#cfe9f7'); sky.addColorStop(1, '#f3e6c8');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, H);
    for (const [x, y, s] of [[0.15, 0.16, 1], [0.7, 0.12, 1.3], [0.92, 0.26, 0.8]] as const) this.cloud(c, W * x, H * y, s * U);
    const v = this.viewRect();
    const sf = storefront();
    const have = this.visuals(this.preview > 0 ? this.sel.visual : undefined);
    if (sf) {
      const a = this.anim;
      sf.pose(have, a ? { v: a.d.visual, kind: a.d.anim, t: a.t } : null);
      const img = sf.render(v.w, v.h, view.dpr, 1 / 60);
      c.drawImage(img, v.x, v.y, v.w, v.h);
      if (!a) this.drawPins(c, sf);
    } else {
      text(c, '🏪', W / 2, v.y + v.h / 2, 80 * U, '#000');
    }
    this.drawTop(c);
    this.drawCard(c);
    if (this.anim) pillHint(c, t('tapToSkip'), W / 2, v.y + v.h - 22 * U, U);
    if (this.preview > 0) pillHint(c, t('renoPreviewing'), W / 2, v.y + v.h - 22 * U, U);
    if (this.banner) this.drawBanner(c);
    if (DEBUG) this.drawDebug(c);
    c.restore();
  }

  cloud(c: C, x: number, y: number, s: number): void {
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [dx, dy, r] of [[0, 0, 22], [24, -8, 26], [50, 0, 20], [24, 8, 22]] as const) { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); c.fill(); }
  }

  drawTop(c: C): void {
    const { W, U } = view;
    const top = view.top;
    const st = Math.min(6, currentStage());
    const S = STAGES[st - 1];
    // the stage title in a blue tab, like the reference boards
    c.fillStyle = 'rgba(20,40,90,0.88)';
    c.beginPath(); rrc(c, W / 2 - 34 * U, top + 34 * U, W - 92 * U, 52 * U, 12 * U); c.fill();
    text(c, currentStage() > 6 ? t('renoAllDone') : tr(S.name), 20 * U, top + 24 * U, 17 * U, '#ffd23f', { font: 'bold', align: 'left', maxW: W - 110 * U });
    text(c, tr(S.sub), 20 * U, top + 45 * U, 13 * U, '#e8f0ff', { align: 'left', maxW: W - 110 * U });
    closeBtn(c, W - 30 * U, top + 34 * U, U);
    // shop level + progress
    const n = renoDone().size;
    const bx = 20 * U, by = top + 72 * U, bw = W - 250 * U;
    const label = t('renoLevel', n, UPGRADES.length);
    setFont(c, 12 * U, 'bold');
    const lw = c.measureText(label).width + 10 * U;
    text(c, label, bx, by, 12 * U, '#1f3866', { font: 'bold', align: 'left' });
    c.fillStyle = 'rgba(31,56,102,0.25)';
    c.beginPath(); rrc(c, bx + lw + bw / 2, by, bw, 10 * U, 5 * U); c.fill();
    c.fillStyle = '#ffd23f';
    const fw = Math.max(10 * U, bw * (n / UPGRADES.length));
    c.beginPath(); rrc(c, bx + lw + fw / 2, by, fw, 10 * U, 5 * U); c.fill();
    drawCash(c, W - 132 * U, top + 60 * U, this.host.money(), U * 0.8, this.host.cashPulse());
  }

  drawPins(c: C, sf: NonNullable<ReturnType<typeof storefront>>): void {
    const { U } = view;
    const v = this.viewRect();
    const have = renoDone();
    const day = this.day;
    const cash = this.host.money();
    const areas = new Map<Area, UpgradeDef>();
    for (const d of UPGRADES) {
      if (statusOf(d, day, have) !== 'available') continue;
      const a = AREA[d.visual];
      if (!areas.has(a)) areas.set(a, d);
    }
    for (const [a, d] of areas) {
      const p = sf.areaScreen(a);
      const x = v.x + p.x * v.w, y = v.y + p.y * v.h;
      if (y < v.y + 10 * U || y > v.y + v.h - 10 * U) continue;
      const ok = d.price <= cash;
      const sel = this.sel.id === d.id;
      const bob = Math.sin(this.time * 4 + x) * 3 * U;
      c.save();
      c.translate(x, y + bob);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.beginPath(); c.arc(1, 3, 17 * U, 0, Math.PI * 2); c.fill();
      c.fillStyle = ok ? '#ffd23f' : '#c9cdd6';
      c.beginPath(); c.arc(0, 0, 17 * U, 0, Math.PI * 2); c.fill();
      c.lineWidth = 3 * U; c.strokeStyle = sel ? '#2a6fd6' : '#ffffff'; c.stroke();
      text(c, ok ? '🔨' : '🔒', 0, 1, 15 * U, '#000');
      c.restore();
    }
  }

  drawCard(c: C): void {
    const { U } = view;
    const r = this.cardRect();
    const d = this.sel;
    const day = this.day;
    const st = statusOf(d, day);
    c.save();
    c.translate(r.x, r.y);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath(); rrc(c, -2, 6, r.w, r.h, 18 * U); c.fill();
    c.fillStyle = '#2a6fd6';
    c.beginPath(); rrc(c, 0, 0, r.w, r.h, 18 * U); c.fill();
    c.fillStyle = '#fbf6ea';
    c.beginPath(); rrc(c, 0, 0, r.w - 10 * U, r.h - 10 * U, 14 * U); c.fill();
    const top = -r.h / 2;
    text(c, `${d.id} · ${t('renoStageN', d.stage)}`, 0, top + 22 * U, 12 * U, '#5a6a8a', { font: 'bold' });
    text(c, tr(d.name), 0, top + 46 * U, 20 * U, '#1f3866', { font: 'bold', maxW: r.w - 100 * U });
    setFont(c, 15 * U, 'hand');
    wrap(c, tr(d.desc), r.w - 48 * U).slice(0, 2).forEach((ln, i) => text(c, ln, 0, top + 74 * U + i * 18 * U, 15 * U, '#3b2a1e'));
    const line = this.anim ? t('renoWorking') : st === 'done' ? t('renoDoneTag') : st === 'locked' ? '🔒 ' + this.lockLine(d) : d.price === 0 ? t('renoFree') : '';
    if (line) text(c, line, 0, top + 116 * U, 14 * U, st === 'done' ? '#2f7a2f' : '#b0602a', { font: 'bold', maxW: r.w - 30 * U });
    c.restore();
    const b = this.buttons();
    // ‹ › to walk through the upgrades
    for (const k of ['prev', 'next'] as const) {
      const q = b[k];
      c.fillStyle = this.press === k ? '#1f4fa3' : '#2a6fd6';
      c.beginPath(); c.arc(q.x, q.y, 16 * U, 0, Math.PI * 2); c.fill();
      text(c, k === 'prev' ? '‹' : '›', q.x, q.y - 1 * U, 24 * U, '#fff', { font: 'bold' });
    }
    if (st !== 'done' && !this.anim) {
      const can = st === 'available' && this.host.money() >= d.price;
      button(c, b.buy.x, b.buy.y, b.buy.w, b.buy.h, d.price === 0 ? t('renoOpenBtn') : t('buy', d.price), can ? '#7ccf3c' : shade('#7ccf3c', -0.1), this.press === 'buy', 17 * U, !can);
      button(c, b.preview.x, b.preview.y, b.preview.w, b.preview.h, t('renoPreview'), '#4a90e2', this.press === 'preview', 14 * U);
    }
  }

  drawBanner(c: C): void {
    const { W, U } = view;
    const b = this.banner!;
    const S = STAGES[b.stage - 1];
    const k = Math.min(1, (2.8 - b.left) * 4) * Math.min(1, b.left * 3);
    const v = this.viewRect();
    c.save();
    c.globalAlpha *= k;
    const y = v.y + v.h * 0.32;
    c.fillStyle = 'rgba(20,40,90,0.92)';
    c.beginPath(); rrc(c, W / 2, y, W - 40 * U, 96 * U, 16 * U); c.fill();
    c.strokeStyle = '#ffd23f'; c.lineWidth = 3 * U; c.stroke();
    text(c, t('renoStageDone', tr(S.name)), W / 2, y - 22 * U, 16 * U, '#ffd23f', { font: 'bold', maxW: W - 60 * U });
    const names = S.reward.map((r) => tr(SHOP[r.track as Track].tiers[r.tier - 1].name)).join(', ');
    text(c, t('renoReward', names), W / 2, y + 8 * U, 13 * U, '#ffffff', { maxW: W - 60 * U });
    text(c, '🎉', W / 2, y + 32 * U, 18 * U, '#000');
    c.restore();
  }

  // ---------- debug (dev builds, ?reno=debug) ----------

  debugBtns() {
    const { W, U } = view;
    const y = view.top + 112 * U;
    return ['+$100', 'all', 'reset', 'skip'].map((id, i) => ({ id, x: 40 * U + i * 74 * U, y, w: 68 * U, h: 24 * U })).filter((b) => b.x < W);
  }

  drawDebug(c: C): void {
    for (const b of this.debugBtns()) {
      c.fillStyle = 'rgba(200,30,60,0.85)';
      c.beginPath(); rrc(c, b.x, b.y, b.w, b.h, 6); c.fill();
      text(c, b.id, b.x, b.y + 1, 12 * view.U, '#fff', { font: 'bold' });
    }
  }

  debugTap(id: string): void {
    if (id === '+$100') this.host.give(100);
    if (id === 'all') setReno(UPGRADES.map((d) => d.id), { workbench: 3, counter: 3, shelf: 3, decor: 3 });
    if (id === 'reset') setReno([], { workbench: 0, counter: 0, shelf: 0, decor: 0 });
    if (id === 'skip') { const d = this.sel; if (!renoDone().has(d.id)) setReno([...renoDone(), d.id]); }
    this.bannered.clear();
    this.host.onChanged();
    this.sel = this.defaultPick();
  }

  // ---------- input ----------

  down(x: number, y: number): boolean {
    if (!this.shown) return false;
    const { W, U } = view;
    if (this.anim) { this.anim.t = Math.max(this.anim.t, 0.97); return true; }
    if (this.preview > 0) { this.preview = 0; return true; }
    if (this.banner) { this.banner.left = Math.min(this.banner.left, 0.3); return true; }
    if (Math.hypot(x - (W - 30 * U), y - (view.top + 34 * U)) < 22 * U) { this.close(); return true; }
    if (DEBUG) for (const b of this.debugBtns()) if (Math.abs(x - b.x) < b.w / 2 && Math.abs(y - b.y) < b.h / 2) { this.debugTap(b.id); return true; }
    const bs = this.buttons();
    this.press = '';
    for (const [k, b] of Object.entries(bs)) if (Math.abs(x - b.x) < b.w / 2 + 4 && Math.abs(y - b.y) < b.h / 2 + 4) this.press = k;
    if (this.press) { sfx.tap(); return true; }
    // a tap on the shop: the pin there, or the next upgrade of that part of the building
    const v = this.viewRect();
    const sf = storefront();
    if (sf && y > v.y && y < v.y + v.h) {
      const have = renoDone();
      const day = this.day;
      // pins first (they float above the model)
      for (const d of UPGRADES) {
        if (statusOf(d, day, have) !== 'available') continue;
        const p = sf.areaScreen(AREA[d.visual]);
        if (Math.hypot(x - (v.x + p.x * v.w), y - (v.y + p.y * v.h)) < 24 * U) { this.select(d); return true; }
      }
      const area = sf.areaAt((x - v.x) / v.w, (y - v.y) / v.h);
      if (area) {
        const list = UPGRADES.filter((d) => AREA[d.visual] === area && !have.has(d.id));
        const pick = list.find((d) => statusOf(d, day, have) === 'available') ?? list[0];
        if (pick) this.select(pick);
        else sfx.error();
      }
    }
    return true;
  }

  select(d: UpgradeDef): void {
    this.sel = d;
    storefront()?.focus(AREA[d.visual]);
    sfx.tap();
  }

  up(x: number, y: number): boolean {
    if (!this.shown) return false;
    const k = this.press;
    this.press = '';
    if (!k) return true;
    const b = this.buttons()[k as keyof ReturnType<Renovation['buttons']>];
    if (Math.abs(x - b.x) > b.w / 2 + 10 || Math.abs(y - b.y) > b.h / 2 + 10) return true;
    const i = UPGRADES.indexOf(this.sel);
    if (k === 'prev') this.select(UPGRADES[(i + UPGRADES.length - 1) % UPGRADES.length]);
    if (k === 'next') this.select(UPGRADES[(i + 1) % UPGRADES.length]);
    if (k === 'buy') this.tryBuy();
    if (k === 'preview' && !renoDone().has(this.sel.id)) {
      this.preview = 2.4;
      storefront()?.focus(AREA[this.sel.visual]);
      track('shop_upgrade_preview', this.sel, { player_day: this.day });
    }
    return true;
  }
}

function pillHint(c: C, s: string, x: number, y: number, U: number): void {
  setFont(c, 13 * U, 'bold');
  const w = c.measureText(s).width + 28 * U;
  c.fillStyle = 'rgba(20,30,60,0.75)';
  c.beginPath(); rrc(c, x, y, w, 26 * U, 13 * U); c.fill();
  text(c, s, x, y + 1, 13 * U, '#fff', { font: 'bold' });
}
