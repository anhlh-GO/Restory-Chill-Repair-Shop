// The collection, three tabs on wooden shelves:
// - Archive: every gadget the shop has repaired. Repaired ones show their 3D
//   model; the rest are dark silhouettes. Tap one to turn it 360° and read whose
//   it was. The shelf itself gets finer with the Display shelf upgrades.
// - Albums: the gadgets grouped in four sets, each with milestone gifts to claim.
// - Keepsakes: little things the regulars left behind, each with an aftermath story.
// Progress is kept on the device; albums and keepsakes are read from it.

import { type C, rrc, text, wrap, setFont, button } from '../core/draw';
import { view } from '../core/view';
import { sfx } from '../core/audio';
import { emit, toast } from '../core/fx';
import { t, tr, lang } from '../core/i18n';
import { LEVELS, type Level } from '../content/story';
import { showcaseThumb, renderShowcase, spinShowcase, THREE } from '../three/showcase3d';
import { ALBUMS, MEMORIES, GIFT_NAMES, albumCount, archived, claim, isClaimed, memoryOpen, restorer, tierOf, type MemoryDef } from '../content/meta';

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
type Tab = 'archive' | 'albums' | 'memories';
const TABS: Tab[] = ['archive', 'albums', 'memories'];
const TAB_KEY = { archive: 'tabArchive', albums: 'tabAlbums', memories: 'tabMemories' } as const;

export class Collection {
  levels: Level[];
  shown = false;
  open = 0;
  tab: Tab = 'archive';
  detail = -1;
  detailOpen = 0;
  memory: MemoryDef | null = null;
  memoryOpenK = 0;
  repaired: Record<number, Repaired> = {};
  thumbs = new Map<number, HTMLCanvasElement | null>();
  /** Full-colour thumbs for the album rows, keyed by shelf index. */
  colour = new Map<number, HTMLCanvasElement | null>();
  thumbSize = 0;
  orient = new THREE.Quaternion();
  spin = { vx: 0.25, vy: 0, held: false, px: 0, py: 0, at: 0, moved: false };
  press = '';
  time = 0;

  /** `levels`: the twenty gadgets on the archive shelves (one level per gadget). */
  constructor(levels: Level[]) {
    this.levels = levels;
  }

  show(focus = -1): void {
    this.repaired = loadCollection();
    this.shown = true;
    this.tab = 'archive';
    this.detail = -1;
    this.detailOpen = 0;
    this.memory = null;
    this.thumbs.clear();
    // a later job on a known gadget focuses that gadget's shelf spot
    const i = focus >= this.levels.length ? this.levels.findIndex((L) => L.device.id === LEVELS[focus]?.device.id) : focus;
    if (i >= 0 && this.isDone(i)) this.openDetail(i);
    sfx.tap();
  }

  close(): void {
    this.shown = false;
    sfx.tap();
  }

  /** A shelf spot lights up once its gadget has been repaired in any chapter. */
  isDone(i: number): boolean {
    if (this.repaired[i]) return true;
    const id = this.levels[i].device.id;
    return LEVELS.some((L, j) => j >= this.levels.length && L.device.id === id && !!this.repaired[j]);
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

  tabRect(i: number) {
    const { W, U } = view;
    const w = (W - 32 * U) / TABS.length;
    return { x: 16 * U + w * (i + 0.5), y: view.top + 86 * U, w: w - 6 * U, h: 32 * U };
  }

  bodyTop(): number { return view.top + 112 * view.U; }

  grid() {
    const { W, H, U } = view;
    const top = this.bodyTop(), bottom = H - 16 * U;
    const rows = Math.ceil(this.levels.length / COLS);
    const cw = (W - 24 * U) / COLS, ch = (bottom - top) / rows;
    return { x0: 12 * U, top, cw, ch, rows };
  }

  cell(i: number) {
    const g = this.grid();
    const col = i % COLS, row = Math.floor(i / COLS);
    return { x: g.x0 + g.cw * (col + 0.5), y: g.top + g.ch * row, w: g.cw, h: g.ch };
  }

  albumRect(i: number) {
    const { W, H, U } = view;
    const top = this.bodyTop(), gap = 8 * U;
    const h = Math.min(170 * U, (H - 14 * U - top - gap * (ALBUMS.length - 1)) / ALBUMS.length);
    return { x: W / 2, y: top + i * (h + gap) + h / 2, w: W - 24 * U, h };
  }

  claimBtn(ai: number, si: number) {
    const U = view.U;
    const r = this.albumRect(ai);
    const w = (r.w - 28 * U) / 2;
    return { x: r.x - r.w / 2 + 14 * U + w * (si + 0.5), y: r.y + r.h / 2 - 24 * U, w: w - 8 * U, h: 30 * U };
  }

  memoryRect(i: number) {
    const { W, H, U } = view;
    const top = this.bodyTop() + 6 * U, cols = 2, gap = 10 * U;
    const rows = Math.ceil(MEMORIES.length / cols);
    const w = (W - 24 * U - gap) / cols, h = (H - 14 * U - top - gap * (rows - 1)) / rows;
    const col = i % cols, row = Math.floor(i / cols);
    return { x: 12 * U + w / 2 + col * (w + gap), y: top + h / 2 + row * (h + gap), w, h };
  }

  // ---------- update ----------

  update(dt: number): void {
    this.time += dt;
    this.open += ((this.shown ? 1 : 0) - this.open) * Math.min(1, dt * 12);
    this.detailOpen += ((this.detail >= 0 ? 1 : 0) - this.detailOpen) * Math.min(1, dt * 12);
    this.memoryOpenK += ((this.memory ? 1 : 0) - this.memoryOpenK) * Math.min(1, dt * 12);
    if (!this.shown) return;
    // render one missing thumbnail per frame so opening never stalls
    const g = this.grid();
    const size = Math.round(Math.min(g.cw, g.ch - 22 * view.U) * 0.92 * Math.min(view.dpr, 2));
    if (size !== this.thumbSize) { this.thumbSize = size; this.thumbs.clear(); this.colour.clear(); }
    for (let i = 0; i < this.levels.length; i++) {
      if (this.thumbs.has(i)) continue;
      const pic = this.colour.has(i) ? this.colour.get(i)! : showcaseThumb(this.levels[i].device, size);
      this.colour.set(i, pic);
      this.thumbs.set(i, pic && !this.isDone(i) ? silhouette(pic) : pic);
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
    const n = this.levels.filter((_, i) => this.isDone(i)).length;
    const sub = t('collected', n, this.levels.length) + (restorer(this.repaired) ? '   ' + t('badgeRestorer') : '');
    text(c, sub, 20 * U, hd.y + 20 * U, 14 * U, '#d9c2a0', { align: 'left', maxW: W - 80 * U });
    closeBtn(c, hd.closeX, hd.y, U);
    // tabs
    TABS.forEach((tb, i) => {
      const r = this.tabRect(i);
      const on = this.tab === tb;
      c.fillStyle = on ? '#d99a3f' : 'rgba(255,255,255,0.1)';
      c.beginPath(); rrc(c, r.x, r.y, r.w, r.h, r.h / 2); c.fill();
      text(c, t(TAB_KEY[tb]), r.x, r.y + 1, 15 * U, on ? '#fff' : '#d9c2a0', { font: 'bold' });
    });
    if (this.tab === 'archive') this.drawArchive(c);
    else if (this.tab === 'albums') this.drawAlbums(c);
    else this.drawMemories(c);
    c.restore();
    if (this.detailOpen > 0.01 && this.detail >= 0) this.drawDetail(c);
    if (this.memoryOpenK > 0.01 && this.memory) this.drawMemory(c);
  }

  drawArchive(c: C): void {
    const { W, U } = view;
    const g = this.grid();
    const tier = tierOf('shelf');
    // museum corner: soft spotlights from above
    if (tier >= 3) {
      for (let i = 0; i < this.levels.length; i++) {
        if (!this.isDone(i)) continue;
        const cl = this.cell(i);
        const beam = c.createLinearGradient(0, cl.y, 0, cl.y + cl.h);
        beam.addColorStop(0, 'rgba(255,240,200,0.18)'); beam.addColorStop(1, 'rgba(255,240,200,0)');
        c.fillStyle = beam;
        c.beginPath(); c.moveTo(cl.x - 6 * U, cl.y); c.lineTo(cl.x + 6 * U, cl.y); c.lineTo(cl.x + cl.w * 0.42, cl.y + cl.h - 20 * U); c.lineTo(cl.x - cl.w * 0.42, cl.y + cl.h - 20 * U); c.closePath(); c.fill();
      }
    }
    // shelves: plain planks, then thicker ones on brackets, then glass and brass
    const plank = tier >= 1 ? ['#d0a06a', '#8d5f3a'] : ['#b98552', '#7d5232'];
    for (let r = 0; r < g.rows; r++) {
      const y = g.top + g.ch * (r + 1) - 22 * U;
      const th = tier >= 1 ? 15 * U : 12 * U;
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(6 * U, y + th - 4 * U, W - 12 * U, 8 * U);
      const sg = c.createLinearGradient(0, y - 4 * U, 0, y + th - 4 * U);
      sg.addColorStop(0, plank[0]); sg.addColorStop(1, plank[1]);
      c.fillStyle = sg;
      c.fillRect(6 * U, y - 4 * U, W - 12 * U, th);
      if (tier >= 1) {
        c.fillStyle = tier >= 3 ? '#c9a24a' : '#5a3a26';
        for (const bx of [24 * U, W / 2, W - 24 * U]) {
          c.beginPath(); c.moveTo(bx - 5 * U, y + th - 4 * U); c.lineTo(bx + 5 * U, y + th - 4 * U); c.lineTo(bx, y + th + 10 * U); c.closePath(); c.fill();
        }
      }
    }
    for (let i = 0; i < this.levels.length; i++) {
      const cl = this.cell(i);
      const done = this.isDone(i);
      const pic = this.thumbs.get(i);
      const s = Math.min(cl.w, cl.h - 22 * U) * 0.92;
      const cy = cl.y + (cl.h - 22 * U) / 2 + 2 * U;
      if (done) {
        // soft spotlight behind a repaired piece
        const glow = c.createRadialGradient(cl.x, cy, 2, cl.x, cy, s * 0.6);
        glow.addColorStop(0, `rgba(255,226,170,${tier >= 2 ? 0.42 : 0.32})`); glow.addColorStop(1, 'rgba(255,226,170,0)');
        c.fillStyle = glow;
        c.beginPath(); c.arc(cl.x, cy, s * 0.6, 0, Math.PI * 2); c.fill();
      }
      if (pic) c.drawImage(pic, cl.x - s / 2, cy - s / 2, s, s);
      else {
        c.fillStyle = 'rgba(255,255,255,0.08)';
        c.beginPath(); rrc(c, cl.x, cy, s * 0.7, s * 0.5, 10 * U); c.fill();
      }
      const plaque = tier >= 3 && done;
      if (plaque) {
        c.fillStyle = '#c9a24a';
        c.beginPath(); rrc(c, cl.x, cl.y + cl.h - 10 * U, cl.w - 8 * U, 15 * U, 3 * U); c.fill();
      }
      const label = done ? tr(this.levels[i].device.name) : '???';
      setFont(c, 10.5 * U, 'bold');
      c.fillStyle = plaque ? '#3b2414' : done ? '#ffe7b8' : '#9a8470';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(fit(c, label, cl.w - 10 * U), cl.x, cl.y + cl.h - 10 * U);
    }
    // glass cabinet: a frame and a sheen over the whole case
    if (tier >= 2) {
      const top = g.top - 6 * U, bottom = g.top + g.ch * g.rows - 4 * U;
      c.strokeStyle = tier >= 3 ? '#c9a24a' : '#8d5f3a';
      c.lineWidth = 5 * U;
      c.strokeRect(5 * U, top, W - 10 * U, bottom - top);
      c.fillStyle = 'rgba(200,230,255,0.05)';
      c.fillRect(5 * U, top, W - 10 * U, bottom - top);
      c.fillStyle = 'rgba(255,255,255,0.07)';
      c.beginPath(); c.moveTo(W * 0.15, bottom); c.lineTo(W * 0.42, top); c.lineTo(W * 0.5, top); c.lineTo(W * 0.23, bottom); c.closePath(); c.fill();
    }
  }

  drawAlbums(c: C): void {
    const U = view.U;
    const idx = new Map(this.levels.map((L, i) => [L.device.id, i]));
    const have = archived(this.repaired);
    ALBUMS.forEach((a, ai) => {
      const r = this.albumRect(ai);
      const n = albumCount(a, this.repaired);
      c.save();
      c.translate(r.x, r.y);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.beginPath(); rrc(c, -2, 5, r.w, r.h, 14 * U); c.fill();
      c.fillStyle = '#d99a3f';
      c.beginPath(); rrc(c, 0, 0, r.w, r.h, 14 * U); c.fill();
      c.fillStyle = '#fbf2dc';
      c.beginPath(); rrc(c, 0, 0, r.w - 10 * U, r.h - 10 * U, 11 * U); c.fill();
      const left = -r.w / 2 + 16 * U, top = -r.h / 2;
      text(c, tr(a.name), left, top + 22 * U, 17 * U, '#3b2a1e', { font: 'bold', align: 'left' });
      text(c, `${n}/${a.devices.length}`, r.w / 2 - 16 * U, top + 22 * U, 16 * U, n >= a.devices.length ? '#2f7a2f' : '#7a5a3a', { font: 'bold', align: 'right' });
      // the gadgets of the set
      const ts = Math.max(12 * U, Math.min(60 * U, r.h - 80 * U, (r.w - 32 * U) / a.devices.length));
      a.devices.forEach((d, j) => {
        const x = left + ts * (j + 0.5), y = top + 38 * U + ts / 2;
        const i = idx.get(d) ?? -1;
        const pic = have.has(d) ? this.colour.get(i) : this.thumbs.get(i);
        if (pic) c.drawImage(pic, x - ts / 2, y - ts / 2, ts, ts);
      });
      c.restore();
      // milestones
      a.steps.forEach((st, si) => {
        const b = this.claimBtn(ai, si);
        const got = isClaimed(a, si), can = !got && n >= st.need;
        const gift = tr(GIFT_NAMES[st.gift]);
        if (can) button(c, b.x, b.y - 3 * U, b.w, b.h, `🎁 ${gift}`, '#7ccf3c', this.press === `claim:${ai}:${si}`, 12 * U);
        else {
          c.fillStyle = got ? 'rgba(124,207,60,0.25)' : 'rgba(0,0,0,0.07)';
          c.beginPath(); rrc(c, b.x, b.y, b.w, b.h, 9 * U); c.fill();
          const label = got ? `✓ ${gift}` : `🔒 ${st.need}/${a.devices.length} · ${gift}`;
          text(c, label, b.x, b.y + 1, 12 * U, got ? '#2f7a2f' : '#7a5a3a', { font: 'bold', maxW: b.w - 10 * U });
        }
      });
    });
  }

  drawMemories(c: C): void {
    const U = view.U;
    MEMORIES.forEach((m, i) => {
      const r = this.memoryRect(i);
      const on = memoryOpen(m, this.repaired);
      c.save();
      c.translate(r.x, r.y);
      c.rotate(((i % 3) - 1) * 0.012);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.beginPath(); rrc(c, -2, 4, r.w, r.h, 10 * U); c.fill();
      c.fillStyle = on ? '#fff6e2' : '#5e4a3e';
      c.beginPath(); rrc(c, 0, 0, r.w, r.h, 10 * U); c.fill();
      if (on) {
        // a strip of tape holds it to the wall
        c.fillStyle = 'rgba(240,220,160,0.75)';
        c.fillRect(-16 * U, -r.h / 2 - 5 * U, 32 * U, 12 * U);
      }
      const top = -r.h / 2;
      text(c, on ? m.icon : '🔒', 0, top + r.h * 0.26, Math.min(28 * U, r.h * 0.28), on ? '#000' : '#a89080');
      text(c, on ? tr(m.name) : '???', 0, top + r.h * 0.55, 13.5 * U, on ? '#3b2a1e' : '#d9c2a0', { font: 'bold', maxW: r.w - 12 * U });
      const how = on ? tr(m.item) : t('memoryHow', [...new Set(m.levels.map((li) => LEVELS[li].name))].join(', '));
      setFont(c, 12 * U, 'hand');
      wrap(c, how, r.w - 16 * U).slice(0, 2).forEach((ln, k) => text(c, ln, 0, top + r.h * 0.75 + k * 13 * U, 12 * U, on ? '#7a5a3a' : '#c9b4a0'));
      c.restore();
    });
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

  memoryCard() {
    const { W, H, U } = view;
    const w = Math.min(W - 40 * U, 340 * U), h = Math.min(H * 0.62, 330 * U);
    return { x: W / 2, y: H / 2, w, h };
  }

  drawMemory(c: C): void {
    const { W, H, U } = view;
    const m = this.memory!;
    const r = this.memoryCard();
    const k = this.memoryOpenK;
    c.save();
    c.fillStyle = `rgba(10,8,14,${0.6 * k})`;
    c.fillRect(0, 0, W, H);
    c.globalAlpha = k;
    c.translate(r.x, r.y);
    c.rotate(-0.02);
    c.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); rrc(c, -3, 6, r.w, r.h, 12 * U); c.fill();
    c.fillStyle = '#fff6e2';
    c.beginPath(); rrc(c, 0, 0, r.w, r.h, 12 * U); c.fill();
    c.fillStyle = 'rgba(240,220,160,0.8)';
    c.fillRect(-26 * U, -r.h / 2 - 7 * U, 52 * U, 16 * U);
    const top = -r.h / 2;
    closeBtn(c, r.w / 2 - 8 * U, top + 8 * U, U);
    text(c, m.icon, 0, top + 58 * U, 44 * U, '#000');
    text(c, tr(m.name), 0, top + 108 * U, 21 * U, '#3b2a1e', { font: 'bold', maxW: r.w - 30 * U });
    text(c, tr(m.item), 0, top + 134 * U, 14 * U, '#b0602a', { font: 'bold', maxW: r.w - 30 * U });
    setFont(c, 16 * U, 'hand');
    let y = top + 168 * U;
    for (const s of m.story) {
      for (const ln of wrap(c, tr(s), r.w - 44 * U)) { text(c, ln, 0, y, 16 * U, '#3b2a1e'); y += 20 * U; }
      y += 8 * U;
    }
    c.restore();
  }

  // ---------- input ----------

  /** Returns true when the screen took the touch. */
  down(x: number, y: number): boolean {
    if (!this.shown) return false;
    const U = view.U;
    if (this.memory) {
      const r = this.memoryCard();
      const lx = x - r.x, ly = y - r.y;
      if (Math.abs(lx) > r.w / 2 || Math.abs(ly) > r.h / 2 || Math.hypot(lx - (r.w / 2 - 8 * U), ly - (-r.h / 2 + 8 * U)) < 22 * U) {
        this.memory = null;
        sfx.tap();
      }
      return true;
    }
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
    for (let i = 0; i < TABS.length; i++) {
      const r = this.tabRect(i);
      if (Math.abs(x - r.x) < r.w / 2 && Math.abs(y - r.y) < r.h / 2 + 4) {
        if (this.tab !== TABS[i]) { this.tab = TABS[i]; sfx.tap(); }
        return true;
      }
    }
    if (this.tab === 'archive') {
      for (let i = 0; i < this.levels.length; i++) {
        const cl = this.cell(i);
        if (Math.abs(x - cl.x) < cl.w / 2 && y > cl.y && y < cl.y + cl.h) {
          if (this.isDone(i)) this.openDetail(i);
          else sfx.error();
          return true;
        }
      }
    } else if (this.tab === 'albums') {
      ALBUMS.forEach((a, ai) => a.steps.forEach((_, si) => {
        const b = this.claimBtn(ai, si);
        if (Math.abs(x - b.x) < b.w / 2 && Math.abs(y - b.y) < b.h / 2 + 4) this.press = `claim:${ai}:${si}`;
      }));
    } else {
      MEMORIES.forEach((m, i) => {
        const r = this.memoryRect(i);
        if (Math.abs(x - r.x) < r.w / 2 && Math.abs(y - r.y) < r.h / 2) {
          if (memoryOpen(m, this.repaired)) { this.memory = m; sfx.lift(); }
          else sfx.error();
        }
      });
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

  up(x = 0, y = 0): boolean {
    if (!this.shown) return false;
    if (this.spin.held) {
      this.spin.held = false;
      if (this.time - this.spin.at > 0.1) { this.spin.vx = 0; this.spin.vy = 0; }
    }
    const p = this.press;
    this.press = '';
    if (p.startsWith('claim:')) {
      const [, ai, si] = p.split(':').map(Number);
      const b = this.claimBtn(ai, si);
      if (Math.abs(x - b.x) < b.w / 2 + 8 && Math.abs(y - b.y) < b.h / 2 + 8 && claim(ALBUMS[ai], si, this.repaired)) {
        sfx.cash();
        sfx.sparkle();
        emit('star', b.x, b.y, 14, { color: ['#ffd23f', '#fff'], speed: 200, size: 7 });
        toast(`🎁 ${tr(GIFT_NAMES[ALBUMS[ai].steps[si].gift])}`, view.W / 2, b.y - 30 * view.U, 15 * view.U);
      }
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

export function closeBtn(c: C, x: number, y: number, U: number): void {
  c.fillStyle = '#e0443a';
  c.beginPath(); rrc(c, x, y, 30 * U, 30 * U, 8 * U); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 3 * U; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x - 7 * U, y - 7 * U); c.lineTo(x + 7 * U, y + 7 * U);
  c.moveTo(x + 7 * U, y - 7 * U); c.lineTo(x - 7 * U, y + 7 * U);
  c.stroke();
}

export function fit(c: C, s: string, w: number): string {
  if (c.measureText(s).width <= w) return s;
  let out = s;
  while (out.length > 2 && c.measureText(out + '…').width > w) out = out.slice(0, -1);
  return out + '…';
}
