// The workbench: open the box, take the gadget apart (screwdriver + drag),
// repair the broken part, scrub the dirty ones, rebuild, power on, pack.

import { type C, rrc, text, pill, hand, button, clamp, dist, rng, sparkleShape, rgba } from '../core/draw';
import { view, ctx as mainCtx } from '../core/view';
import { tween, animate, wait, ease, cancelTag } from '../core/tween';
import { sfx, haptic } from '../core/audio';
import { emit, toast } from '../core/fx';
import { t, tr } from '../core/i18n';
import type { Level, PuzzleSpec } from '../content/story';
import type { PartDef, DrawState } from '../content/device';
import { SCREW_R } from '../content/device';
import { drawMat, drawBox, drawDish, drawScrewdriver, drawBrush, drawSponge, drawCash, drawNotepad, drawGear, drawBulbBtn, badge } from './desk';
import { Minigame } from './minigames';
import { Diagnosis, diagBonus, type DiagLevel } from './diagnosis';
import { Bench3D } from '../three/bench3d';

type DragKind = 'part' | 'driver' | 'tool' | 'spin' | 'none';
const JOB_GLYPH: Partial<Record<PuzzleSpec['kind'], string>> = {
  solder: '🔥', wire: '🔌', popit: '🫧', peel: '✨', blow: '💨', slime: '🟢', wind: '📼',
};

type Phase = 'box' | 'apart' | 'repair' | 'clean' | 'rebuild' | 'done' | 'pack';

interface Spot { x: number; y: number; r: number; a: number; col: string }

type Pt = { x: number; y: number };
/** What to do next, and where (see Bench.suggestion). */
interface Hint { at: Pt; grab?: Pt; dest?: Pt; flip?: boolean; from?: Pt; to?: Pt; tap?: Pt; dbl?: boolean; msg: string }

export interface RT {
  def: PartDef;
  state: 'in' | 'out';
  anim: boolean; // drawn from x/y/sc/rot instead of home
  x: number; y: number; sc: number; rot: number; lift: number; alpha: number;
  flipX: number;
  slot: number;
  dirt: Spot[][] | null;
  dirtVer: number;
  side: number; // which dirt side is being cleaned
  broken: boolean;
  fixed: boolean;
  seen: boolean;
  wig: number;
  pop: number;
  /** Where the player put it on the mat (null = its tray slot). */
  spot: { x: number; y: number; rot: number } | null;
  /** Stacking order on the mat: higher lies on top. */
  tz: number;
}

export interface BenchHost {
  money(): number;
  spend(n: number): void;
  /** A bonus paid on the bench (a right first diagnosis). */
  earn(n: number): void;
  tutorial: boolean;
  /** Quick Diagnosis after unboxing (null: straight to taking apart). */
  diagnose: DiagLevel | null;
  onPacked(bought: number): void;
  openSettings(): void;
  cashPulse(): number;
}

interface Drag {
  kind: DragKind;
  /** Tap on a part that cannot come off yet: complain only if the finger did not turn the gadget. */
  blocked?: () => void;
  /** Tap on a tray part: its job (repair / clean / hint) when the finger never moved. */
  tap?: () => void;
  rt?: RT;
  sx: number; sy: number; // pointer start
  ox: number; oy: number; // grab offset
  px: number; py: number; // last pointer
  /** Where the carried part is heading: it glides there, smoothing out uneven touch events. */
  tx?: number; ty?: number;
  moved: boolean;
  from: 'device' | 'tray';
}

export class Bench {
  L: Level;
  host: BenchHost;
  parts: RT[];
  phase: Phase = 'box';
  viewSide: 'F' | 'B' = 'F';
  flipK = 1; // cos of the flip angle (double-tap flip)
  /** Fling speed of the free 3D turn (screen px per frame). */
  spinVx = 0;
  spinVy = 0;
  spinAt = 0; // when the finger last moved
  time = 0;
  idle = 0;
  /** Seconds left of a hint the player asked for with the bulb. */
  hintT = 0;
  bulbPress = 0;
  boxOpen = 0;
  boxY = 0;
  boxAlpha = 1;
  boxScale = 1;
  devAppear = 0;
  /** 0..1 — the gadget held up above the box rim (unboxing / packing). */
  devLift = 0;
  power = 0;
  doneBtn = 0;
  doneBtnDown = false;
  listOpen = 0;
  listShown = false;
  notePulse = 0;
  dishScrews = 0;
  bought = 0;
  mini: Minigame | null = null;
  diag: Diagnosis | null = null;
  focus: RT | null = null;
  toolPos = { x: 0, y: 0, rest: true, scrub: 0 };
  driver = { x: 0, y: 0, ang: 0.95, stand: 0, twist: 0, prog: 0, busy: false, held: false, rest: true };
  drag: Drag = { kind: 'none', sx: 0, sy: 0, ox: 0, oy: 0, px: 0, py: 0, moved: false, from: 'device' };
  lastTap = { t: -1, x: 0, y: 0 };
  flying: { x: number; y: number; sc: number; a: number }[] = [];
  packed = false;
  /** Last stacking order handed out on the mat. */
  topZ = 0;
  shake = 0;

  /** Repair jobs by part id: the main fault plus the level's extra hands-on tasks. */
  jobs = new Map<string, PuzzleSpec>();

  constructor(level: Level, host: BenchHost) {
    this.L = level;
    this.host = host;
    this.jobs.set(level.broken, level.puzzle);
    for (const tk of level.tasks ?? []) this.jobs.set(tk.part, tk.puzzle);
    const r = rng(level.pay * 131 + level.device.id.length);
    this.parts = level.device.parts.map((def) => {
      const rt: RT = {
        def, state: 'in', anim: false, x: 0, y: 0, sc: 1, rot: 0, lift: 0, alpha: 1, flipX: 1,
        slot: -1, dirt: null, dirtVer: 0, side: 0, broken: this.jobs.has(def.id), fixed: false, seen: false, wig: 0, pop: 0, spot: null, tz: 0,
      };
      if (level.dirty.includes(def.id)) rt.dirt = this.twoFaced(def) ? [makeDirt(def, r), makeDirt(def, r)] : [makeDirt(def, r)];
      return rt;
    });
    this.resetDriver();
    this.g3 = new Bench3D(this);
    this.g3.syncDevice();
  }

  // ---------------- layout ----------------

  get k(): number {
    const { W, H, U } = view;
    const d = this.L.device;
    return Math.min((W * 0.84) / d.w, (H * 0.36) / d.h, U * 1.2);
  }
  get center(): { x: number; y: number } {
    const { W, H, U } = view;
    const top = view.top + 132 * U;
    const bottom = H * 0.655;
    return { x: W / 2, y: (top + bottom) / 2 + 6 * U };
  }
  /** Where a removed part lies: scattered below the gadget, a little askew, like the reference. */
  slotPos(i: number): { x: number; y: number; w: number; h: number; rot: number } {
    const { W, H, U } = view;
    const n = this.parts.filter((p) => p.def.kind !== 'screw').length;
    const cols = n > 8 ? 5 : 4;
    const rows = Math.max(2, Math.ceil(n / cols));
    const sw = (W - 20 * U) / cols;
    const y0 = H * 0.665;
    const sh = (H * 0.915 - y0) / rows;
    const row = Math.floor(i / cols), col = i % cols;
    const r = rng(i * 7919 + 13);
    const jx = (r() - 0.5) * sw * 0.22, jy = (r() - 0.5) * sh * 0.18;
    const stagger = row % 2 ? sw * 0.3 : 0;
    let x = 10 * U + sw * (col + 0.5) + stagger + jx;
    if (x > W - sw * 0.45) x -= sw;
    return { x, y: y0 + sh * (row + 0.5) + jy, w: sw, h: sh, rot: (r() - 0.5) * 0.7 };
  }
  traySc(rt: RT): number {
    const s = this.slotPos(0);
    return Math.min((s.w * 0.98) / rt.def.w, (s.h * 1.06) / rt.def.h, this.k * 0.62);
  }
  /** Where a removed part lies now: its own spot if the player moved it, else its slot. */
  trayPos(rt: RT): { x: number; y: number; w: number; h: number; rot: number } {
    const s = this.slotPos(rt.slot);
    return rt.spot ? { ...s, x: rt.spot.x, y: rt.spot.y, rot: rt.spot.rot } : s;
  }
  /** Keep a dropped part on the mat, below the HUD and clear of the screen edges. */
  clampSpot(x: number, y: number): { x: number; y: number } {
    const { W, H, U } = view;
    return { x: clamp(x, 34 * U, W - 34 * U), y: clamp(y, view.top + 150 * U, H - 40 * U) };
  }
  dishPos() { const { H, U } = view; return { x: 44 * U, y: H - 58 * U, r: 30 * U }; }
  driverRest() { const { W, H, U } = view; return { x: W - 196 * U, y: H - 64 * U, ang: 0.3 }; }
  toolRest() { const { W, H } = view; return { x: W / 2, y: H * 0.76 }; }
  focusPos() { const { W, H } = view; return { x: W / 2, y: H * 0.43 }; }
  focusSc(rt: RT): number {
    const { W, H, U } = view;
    return Math.min((W * 0.72) / rt.def.w, (H * 0.34) / rt.def.h, U * 2.4);
  }

  /** How the visible face is turned on the mat (0 without WebGL). */
  get heading(): number { return this.g3?.ok ? this.g3.heading() : 0; }

  home(rt: RT): { x: number; y: number } {
    if (this.g3?.ok) return this.g3.homeScreen(rt);
    const c = this.center;
    return { x: c.x + rt.def.x * this.k * this.flipK, y: c.y + rt.def.y * this.k };
  }

  resetDriver(): void {
    const r = this.driverRest();
    Object.assign(this.driver, { x: r.x, y: r.y, ang: r.ang, stand: 0, twist: 0, prog: 0, busy: false, held: false, rest: true });
  }

  // ---------------- rules ----------------

  byId(id: string): RT { return this.parts.find((p) => p.def.id === id)!; }

  visibleOnSide(rt: RT): boolean {
    return rt.def.side === 'A' || rt.def.side === this.viewSide;
  }
  /** Parts that must be out before rt comes out. */
  blockers(rt: RT): RT[] {
    return (rt.def.needs ?? []).map((id) => this.byId(id)).filter((p) => p.state === 'in');
  }
  canRemove(rt: RT): boolean {
    return rt.state === 'in' && this.blockers(rt).length === 0;
  }
  /** Parts that must be back in before rt goes in. */
  fitBlockers(rt: RT): RT[] {
    return this.parts.filter((q) => q.state === 'out' && (q.def.needs ?? []).includes(rt.def.id));
  }
  canFit(rt: RT): boolean {
    return rt.state === 'out' && this.fitBlockers(rt).length === 0;
  }
  countIn(): number { return this.parts.filter((p) => p.state === 'in').length; }

  // ---------------- update ----------------

  g3!: Bench3D;

  lastPhase: Phase = 'box';

  update(dt: number): void {
    if (this.phase !== this.lastPhase) {
      this.lastPhase = this.phase;
      // the parts that need work come to the top of the pile, never buried
      for (const p of this.parts) {
        if (p.state !== 'out') continue;
        if ((this.phase === 'repair' && p.broken && !p.fixed) || (this.phase === 'clean' && p.dirt)) { p.tz = ++this.topZ; p.wig = 1; }
      }
    }
    for (const p of this.parts) if (p.state === 'in' && !p.seen && this.visibleOnSide(p) && this.blockers(p).length === 0) p.seen = true;
    this.time += dt;
    this.idle += dt;
    this.hintT = Math.max(0, this.hintT - dt);
    const dg = this.drag;
    if (dg.kind === 'part' && dg.rt && dg.tx !== undefined && dg.ty !== undefined) {
      const k = 1 - Math.exp(-dt * 48);
      dg.rt.x += (dg.tx - dg.rt.x) * k;
      dg.rt.y += (dg.ty - dg.rt.y) * k;
    }
    this.bulbPress = Math.max(0, this.bulbPress - dt * 5);
    this.listOpen += ((this.listShown ? 1 : 0) - this.listOpen) * Math.min(1, dt * 14);
    this.notePulse = Math.max(0, this.notePulse - dt * 3);
    this.shake = Math.max(0, this.shake - dt * 4);
    for (const p of this.parts) {
      p.wig = Math.max(0, p.wig - dt * 3);
      p.pop = Math.max(0, p.pop - dt * 3);
    }
    if (this.mini) this.mini.update(dt);
    if (this.diag) this.diag.update(dt);
    if (this.drag.kind !== 'spin' && Math.abs(this.spinVx) + Math.abs(this.spinVy) > 0.05) {
      this.g3.turn(this.spinVx, this.spinVy);
      const f = Math.pow(0.04, dt);
      this.spinVx *= f; this.spinVy *= f;
    }
    if (this.g3.ok && this.phase !== 'box' && this.phase !== 'pack') this.g3.syncDevice();
    if (this.phase === 'done') {
      this.power = Math.min(1, this.power + dt * 1.5);
      // (with WebGL the celebration is 3D and rides on the gadget: three/donefx.ts)
      const fxd = this.L.device.workFx;
      if (fxd && !this.g3.ok && Math.random() < dt * 6) {
        const c = this.center;
        emit(fxd.kind === 'flash' ? 'flash' : fxd.kind, c.x + fxd.x * this.k, c.y + fxd.y * this.k, 1, {
          color: fxd.color, speed: 60, dir: fxd.dir, spread: 0.8, life: 1.2, size: fxd.kind === 'flash' ? 30 : 6,
        });
      }
    }
    // tool follows nothing when resting
    if (this.phase === 'clean' && this.focus && this.toolPos.rest) {
      const r = this.toolRest();
      this.toolPos.x += (r.x - this.toolPos.x) * Math.min(1, dt * 12);
      this.toolPos.y += (r.y - this.toolPos.y) * Math.min(1, dt * 12);
    }
    this.toolPos.scrub = Math.max(0, this.toolPos.scrub - dt * 2);
    for (const f of this.flying) if (Math.random() < dt * 30) emit('spark', f.x, f.y, 1, { color: ['#ffffff', '#e8d8f0'], speed: 20, size: 3, life: 0.3 });
    if (this.driver.rest && !this.driver.busy) {
      const r = this.driverRest();
      this.driver.x += (r.x - this.driver.x) * Math.min(1, dt * 12);
      this.driver.y += (r.y - this.driver.y) * Math.min(1, dt * 12);
      this.driver.ang += (r.ang - this.driver.ang) * Math.min(1, dt * 12);
    }
  }

  // ---------------- phase flow ----------------

  phaseLabel(): { line: string; prog: number; done: boolean } {
    const total = this.parts.length;
    switch (this.phase) {
      case 'box': return { line: t('openBox'), prog: 0, done: false };
      case 'apart': { const out = total - this.countIn(); return { line: `${t('takeApart')} (${out}/${total})`, prog: out / total, done: false }; }
      case 'repair': {
        const b = this.parts.filter((p) => p.broken);
        const ok = b.filter((p) => p.fixed).length;
        return { line: `${t('repair')} (${ok}/${b.length})`, prog: ok / Math.max(1, b.length), done: false };
      }
      case 'clean': {
        const d = this.parts.filter((p) => this.L.dirty.includes(p.def.id));
        const ok = d.filter((p) => !p.dirt).length;
        return { line: `${t('clean')} (${ok}/${d.length})`, prog: ok / Math.max(1, d.length), done: false };
      }
      case 'rebuild': { const n = this.countIn(); return { line: `${t('rebuild')} (${n}/${total})`, prog: n / total, done: false }; }
      default: return { line: t('done'), prog: 1, done: true };
    }
  }

  progress(): number {
    const total = this.parts.length;
    switch (this.phase) {
      case 'box': return 0;
      case 'apart': return 0.4 * (1 - this.countIn() / total);
      case 'repair': return 0.45;
      case 'clean': return 0.55;
      case 'rebuild': return 0.6 + 0.4 * (this.countIn() / total);
      default: return 1;
    }
  }

  advance(): void {
    this.notePulse = 1;
    this.idle = 0;
    if (this.phase === 'apart') {
      this.phase = this.parts.some((p) => p.broken && !p.fixed) ? 'repair' : 'clean';
      sfx.success();
      if (this.phase === 'clean') this.advanceFromClean();
      return;
    }
    if (this.phase === 'repair') {
      if (this.parts.some((p) => p.broken && !p.fixed)) return; // more jobs on the tray
      this.phase = 'clean';
      this.advanceFromClean();
      return;
    }
    if (this.phase === 'clean') {
      this.phase = 'rebuild';
      sfx.success();
      return;
    }
    if (this.phase === 'rebuild') {
      this.phase = 'done';
      if (this.g3.ok) { this.spinVx = this.spinVy = 0; this.g3.resetPose(0.6); }
      else this.viewSide = 'F';
      sfx.fanfare();
      haptic(60);
      const powerSfx: Record<string, () => void> = { dryer: sfx.heat, camera: sfx.shutter, handheld: sfx.sparkle, walkman: sfx.door };
      wait(0.4, () => powerSfx[this.L.device.id]?.());
      const c = this.center;
      if (!this.g3.ok) {
        emit('ring', c.x, c.y, 1, { color: '#fff3c0', size: 60 * view.U, life: 0.8, speed: 0 });
        emit('spark', c.x, c.y, 36, { color: ['#fff', '#ffe28a', '#c8f7ff'], speed: 320, size: 9, life: 1.2 });
        emit('star', c.x, c.y, 14, { color: ['#ffd23f', '#fff'], speed: 260, size: 7, life: 1.1 });
      }
      for (const p of this.parts) if (p.def.kind !== 'screw') p.pop = 1;
      wait(1.0, () => tween(this, { doneBtn: 1 }, 0.4, ease.outBack));
    }
  }

  advanceFromClean(): void {
    if (this.parts.every((p) => !p.dirt)) {
      this.phase = 'rebuild';
      sfx.success();
    }
  }

  // ---------------- drawing ----------------

  draw(c: C, oy = 0): void {
    if (!this.g3.ok) { this.draw2D(c, oy); return; }
    const { W, H, U } = view;
    c.save();
    c.translate(0, oy);
    if (this.shake > 0) c.translate(Math.sin(this.time * 80) * this.shake * 3, 0);
    // 3D: the desk, mat and everything resting on it
    this.g3.renderBack(c);

    // 2D overlays on top of the models
    if (this.phase === 'rebuild' && this.dishScrews > 0 && this.parts.some((p) => p.def.kind === 'screw' && this.canFit(p))) {
      const dp = this.dishPos();
      c.strokeStyle = `rgba(255,236,150,${0.4 + Math.sin(this.time * 5) * 0.3})`;
      c.lineWidth = 3;
      c.beginPath(); c.arc(dp.x, dp.y, dp.r + 5, 0, Math.PI * 2); c.stroke();
    }
    if ((this.phase !== 'box' || this.devAppear > 0) && !(this.phase === 'pack' && this.devAppear === 0)) this.deviceOverlays(c);
    for (const p of this.parts) if (p.state === 'out' && !p.anim && p.def.kind !== 'screw' && p !== this.focus) this.trayOverlays(c, p);
    this.drawGhost(c);

    if (this.focus) {
      c.fillStyle = 'rgba(15,25,45,0.38)';
      c.fillRect(-10, -10, W + 20, H + 20);
    }
    // 3D: what is in the hand / in focus
    this.g3.renderFront(c);

    const d = this.driver;
    if (d.prog > 0 && !this.focus) {
      c.strokeStyle = 'rgba(255,255,255,0.95)';
      c.lineWidth = 3.5 * U;
      c.lineCap = 'round';
      c.beginPath(); c.arc(d.x, d.y, 24 * U, -Math.PI / 2, -Math.PI / 2 + d.prog * Math.PI * 2); c.stroke();
    }
    if (this.focus) this.focusUI(c);
    this.drawUI(c);
    c.restore();
    if (this.diag) this.diag.draw(c);
    if (this.mini) this.mini.draw(c);
    this.drawBulb(c);
  }

  drawUI(c: C): void {
    const { W, H, U } = view;
    if (this.phase === 'box' && this.boxOpen === 0) {
      pill(c, W / 2, this.center.y - this.k * 120, t('openBox'), 15 * U, 0.6 + 0.4 * Math.sin(this.time * 3));
    }
    if (this.phase === 'done' && this.doneBtn > 0) {
      c.save();
      c.translate(W / 2, H * 0.8);
      c.scale(this.doneBtn, this.doneBtn);
      button(c, 0, 0, 150 * U, 52 * U, t('doneBtn'), '#7ccf3c', this.doneBtnDown, 22 * U);
      c.restore();
    }
    if (this.drag.kind === 'part' && this.drag.rt) pill(c, W / 2, H - 34 * U, tr(this.drag.rt.def.name), 15 * U, 1);
    this.drawHUD(c);
    this.drawHints(c);
  }

  drawGhost(c: C): void {
    const dr = this.drag;
    if (this.phase !== 'rebuild' || dr.kind !== 'part' || !dr.rt || dr.from !== 'tray' || !this.canFit(dr.rt)) return;
    const h = this.home(dr.rt);
    c.save();
    c.translate(h.x, h.y);
    c.rotate(-this.heading);
    c.scale(this.k * this.flipK, this.k);
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
    c.fillStyle = `rgba(255,246,200,${0.18 + pulse * 0.12})`;
    c.fill(dr.rt.def.shape);
    c.setLineDash([6, 5]);
    c.lineDashOffset = -this.time * 20;
    c.strokeStyle = `rgba(255,255,255,${0.6 + pulse * 0.4})`;
    c.lineWidth = 2.5 / this.k;
    c.stroke(dr.rt.def.shape);
    c.restore();
  }

  /** Screw-hole glows in screen space over the 3D gadget (the switched-on show is 3D: three/donefx.ts). */
  deviceOverlays(c: C): void {
    const k = this.k;
    if (this.phase === 'rebuild') {
      // empty screw holes, wherever they are on the turned gadget
      for (const p of this.parts) {
        if (p.def.kind !== 'screw' || p.state !== 'out' || p.anim || !this.visibleOnSide(p) || !this.canFit(p)) continue;
        const glow = 0.5 + 0.5 * Math.sin(this.time * 5);
        const h = this.home(p);
        c.save();
        c.translate(h.x, h.y);
        c.scale(k, k);
        c.fillStyle = `rgba(255,236,150,${0.25 + glow * 0.3})`;
        c.beginPath(); c.arc(0, 0, SCREW_R * 1.9, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(0,0,0,0.55)';
        c.beginPath(); c.arc(0, 0, SCREW_R * 0.75, 0, Math.PI * 2); c.fill();
        c.restore();
      }
    }
  }

  trayOverlays(c: C, p: RT): void {
    const s = this.trayPos(p);
    const sc = this.traySc(p);
    const bx = s.x + Math.min(p.def.w * sc * 0.5, s.w * 0.4), by = s.y - Math.min(p.def.h * sc * 0.5, s.h * 0.42) - 8 * view.U;
    if (p.broken && !p.fixed && this.phase !== 'apart') badge(c, bx, by, view.U, 'broken', this.time, this.jobGlyph(p));
    else if (p.dirt && (this.phase === 'clean' || this.phase === 'repair')) badge(c, bx, by, view.U * 0.85, 'dirty', this.time);
    if (this.phase === 'rebuild' && this.canFit(p) && this.drag.rt !== p) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.18 + 0.14 * Math.sin(this.time * 4);
      c.fillStyle = '#fff6c8';
      c.beginPath(); c.ellipse(s.x, s.y, s.w * 0.44, s.h * 0.44, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  }

  focusUI(c: C): void {
    const p = this.focus!;
    if (this.phase !== 'clean' || !p.dirt) return;
    const { W, H, U } = view;
    const tool = p.def.tool ?? 'brush';
    const spots = p.dirt[Math.min(p.side, p.dirt.length - 1)];
    const done = spots.reduce((s, q) => s + (1 - q.a), 0) / spots.length;
    const y = H * 0.84;
    c.fillStyle = 'rgba(28,32,44,0.85)';
    c.beginPath(); rrc(c, W / 2, y, 200 * U, 30 * U, 15 * U); c.fill();
    text(c, p.dirt.length > 1 ? `${tool === 'brush' ? '🖌' : '🧽'} · ${p.side + 1}/${p.dirt.length}` : tool === 'brush' ? '🖌' : '🧽', W / 2 - 62 * U, y + 1, 14 * U, '#f4f1ea');
    c.fillStyle = '#3a404c';
    c.beginPath(); rrc(c, W / 2 + 24 * U, y, 80 * U, 8 * U, 4 * U); c.fill();
    c.fillStyle = '#7ccf3c';
    const w = 80 * U * Math.min(1, done / 0.95);
    if (w > 2) { c.beginPath(); rrc(c, W / 2 + 24 * U - 40 * U + w / 2, y, w, 8 * U, 4 * U); c.fill(); }
    text(c, `${Math.round(Math.min(1, done / 0.95) * 100)}%`, W / 2 + 82 * U, y + 1, 12 * U, '#f4f1ea', { font: 'bold' });
  }

  dispose(): void {
    this.g3.dispose();
  }

  /** The original flat renderer, used when WebGL is unavailable. */
  draw2D(c: C, oy = 0): void {
    const { W, H, U } = view;
    c.save();
    c.translate(0, oy);
    if (this.shake > 0) c.translate(Math.sin(this.time * 80) * this.shake * 3, 0);
    drawMat(c);
    drawDish(c, this.dishPos().x, this.dishPos().y, this.dishPos().r, this.dishScrews,
      this.phase === 'rebuild' && this.dishScrews > 0 && this.parts.some((p) => p.def.kind === 'screw' && this.canFit(p)) ? 0.4 + Math.sin(this.time * 5) * 0.3 : 0);

    // tray parts (behind)
    for (const p of this.parts) if (p.state === 'out' && !p.anim && p.def.kind !== 'screw' && p !== this.focus) this.drawPartTray(c, p);

    // the box (before the gadget appears / when packing it back)
    const cc = this.center;
    if (this.phase === 'box') drawBox(c, cc.x, cc.y + this.boxY, this.k * 1.05 * this.boxScale, this.boxOpen, this.time);
    if (this.phase === 'pack') drawBox(c, cc.x, cc.y + this.boxY, this.k * 1.05, this.boxOpen, this.time);

    // the gadget
    if ((this.phase !== 'box' || this.devAppear > 0) && !(this.phase === 'pack' && this.devAppear === 0)) this.drawDevice(c);

    // ghost of where the held part goes
    const dr = this.drag;
    if (this.phase === 'rebuild' && dr.kind === 'part' && dr.rt && dr.from === 'tray' && this.canFit(dr.rt)) {
      const h = this.home(dr.rt);
      c.save();
      c.translate(h.x, h.y);
      c.scale(this.k * this.flipK, this.k);
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
      c.fillStyle = `rgba(255,246,200,${0.18 + pulse * 0.12})`;
      c.fill(dr.rt.def.shape);
      c.setLineDash([6, 5]);
      c.lineDashOffset = -this.time * 20;
      c.strokeStyle = `rgba(255,255,255,${0.6 + pulse * 0.4})`;
      c.lineWidth = 2.5 / this.k;
      c.stroke(dr.rt.def.shape);
      c.restore();
    }

    // animating / dragged parts (on top)
    for (const p of this.parts) if (p.anim && p !== this.focus) this.drawPartFree(c, p);
    for (const f of this.flying) {
      c.save(); c.globalAlpha = f.a;
      c.translate(f.x, f.y); c.scale(f.sc * this.k, f.sc * this.k);
      this.parts.find((p) => p.def.kind === 'screw')?.def.draw(c, this.ds(null));
      c.restore();
    }

    // clean focus
    if (this.focus) this.drawFocus(c);

    // tools
    if (this.phase === 'apart' || this.phase === 'rebuild' || this.phase === 'repair' || this.phase === 'clean') {
      if (!this.focus) {
        const d = this.driver;
        drawScrewdriver(c, d.x, d.y, d.ang, U * 1.05, d.stand, d.twist, d.prog);
      }
    }

    // box hint
    if (this.phase === 'box' && this.boxOpen === 0) {
      pill(c, W / 2, this.center.y - this.k * 120, t('openBox'), 15 * U, 0.6 + 0.4 * Math.sin(this.time * 3));
    }

    // done button
    if (this.phase === 'done' && this.doneBtn > 0) {
      c.save();
      const by = H * 0.8;
      c.translate(W / 2, by);
      c.scale(this.doneBtn, this.doneBtn);
      button(c, 0, 0, 150 * U, 52 * U, t('doneBtn'), '#7ccf3c', this.doneBtnDown, 22 * U);
      c.restore();
    }

    // name of the part in hand, bottom centre (like the reference)
    if (this.drag.kind === 'part' && this.drag.rt) pill(c, W / 2, H - 34 * U, tr(this.drag.rt.def.name), 15 * U, 1);

    this.drawHUD(c);
    this.drawHints(c);
    c.restore();
    if (this.diag) this.diag.draw(c);
    if (this.mini) this.mini.draw(c);
    this.drawBulb(c);
  }

  ds(rt: RT | null, inDevice = false): DrawState {
    return {
      view: inDevice ? this.viewSide : 'F',
      inDevice,
      time: this.time,
      broken: !!rt && rt.broken && !rt.fixed,
      power: this.power,
    };
  }

  drawDevice(c: C): void {
    const cc = this.center;
    const k = this.k;
    const appear = this.phase === 'box' ? this.devAppear : 1;
    const vis = this.parts
      .filter((p) => p.state === 'in' && !p.anim && this.visibleOnSide(p))
      .sort((a, b) => a.def.z - b.def.z);
    c.save();
    c.translate(cc.x, cc.y);
    const pk = this.phase === 'pack' ? this.boxScale : 1;
    c.scale(this.flipK * appear * pk, appear * pk);
    for (const p of vis) {
      if (this.blockers(p).length === 0) p.seen = true;
      c.save();
      c.translate(p.def.x * k, p.def.y * k);
      const wig = Math.sin(this.time * 50) * p.wig * 0.06;
      c.rotate(wig);
      const s = k * (1 + p.pop * 0.06);
      c.scale(s, s);
      p.def.draw(c, this.ds(p, true));
      this.overlays(c, p);
      c.restore();
    }
    // empty screw holes during rebuild
    if (this.phase === 'rebuild') {
      for (const p of this.parts) {
        if (p.def.kind !== 'screw' || p.state !== 'out' || p.anim || !this.visibleOnSide(p) || !this.canFit(p)) continue;
        const glow = 0.5 + 0.5 * Math.sin(this.time * 5);
        c.save();
        c.translate(p.def.x * k, p.def.y * k);
        c.scale(k, k);
        c.fillStyle = `rgba(255,236,150,${0.25 + glow * 0.3})`;
        c.beginPath(); c.arc(0, 0, SCREW_R * 1.9, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.beginPath(); c.arc(0, 0, SCREW_R * 0.75, 0, Math.PI * 2); c.fill();
        c.restore();
      }
    }
    if (this.power > 0) {
      c.save();
      c.scale(k, k);
      this.L.device.working(c, this.time, this.power);
      c.restore();
    }
    c.restore();
    // halo when done
    if (this.phase === 'done') {
      const r = Math.max(this.L.device.w, this.L.device.h) * k * 0.7;
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(cc.x, cc.y, r * 0.2, cc.x, cc.y, r * 1.1);
      g.addColorStop(0, `rgba(255,240,200,${0.18 * this.power})`);
      g.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(cc.x, cc.y, r * 1.1, 0, Math.PI * 2); c.fill();
      c.restore();
      for (let i = 0; i < 8; i++) {
        const a = this.time * 0.6 + (i / 8) * Math.PI * 2;
        const rr2 = r * (0.85 + 0.1 * Math.sin(this.time * 2 + i));
        sparkleShape(c, cc.x + Math.cos(a) * rr2, cc.y + Math.sin(a) * rr2 * 0.8, (5 + 3 * Math.sin(this.time * 4 + i)) * view.U, 'rgba(255,255,255,0.9)');
      }
    }
  }

  /** A part you can turn over and find a second real face on: the base of a two-faced gadget. */
  twoFaced(def: PartDef): boolean {
    return !!this.L.device.hasBack && def.z === 0;
  }

  /** Dirt, scorch marks and badges drawn in part-local space (already scaled).
   *  `face` 1 paints the back face's canvas, which is mirrored. */
  overlays(c: C, p: RT, face?: number): void {
    const f = face ?? (p.dirt ? Math.min(p.side, p.dirt.length - 1) : 0);
    if (p.dirt && p.dirt[f]) {
      const spots = p.dirt[f];
      c.save();
      if (face === 1) c.scale(-1, 1);
      c.clip(p.def.shape);
      // grime film
      const left = spots.reduce((s, q) => s + q.a, 0) / Math.max(1, spots.length);
      c.fillStyle = `rgba(110,80,40,${0.22 * left})`;
      c.fill(p.def.shape);
      for (const q of spots) {
        if (q.a <= 0.02) continue;
        c.globalAlpha = q.a * 0.75;
        c.fillStyle = q.col;
        c.beginPath();
        c.arc(q.x, q.y, q.r, 0, Math.PI * 2);
        c.arc(q.x + q.r * 0.6, q.y - q.r * 0.3, q.r * 0.6, 0, Math.PI * 2);
        c.arc(q.x - q.r * 0.5, q.y + q.r * 0.4, q.r * 0.5, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
    if (p.broken && !p.fixed && (p.state === 'out' || p.seen)) {
      c.save();
      c.clip(p.def.shape);
      const g = c.createRadialGradient(0, 0, 2, 0, 0, Math.max(p.def.w, p.def.h) * 0.5);
      g.addColorStop(0, 'rgba(20,10,5,0.55)');
      g.addColorStop(1, 'rgba(20,10,5,0)');
      c.fillStyle = g;
      c.fill(p.def.shape);
      c.restore();
    }
  }

  drawPartTray(c: C, p: RT): void {
    const s = this.trayPos(p);
    const sc = this.traySc(p);
    c.save();
    c.translate(s.x, s.y);
    const sc2 = sc * (1 + p.pop * 0.1);
    c.rotate(Math.sin(this.time * 50) * p.wig * 0.06);
    c.scale(sc2 * p.flipX, sc2);
    p.def.draw(c, this.ds(p));
    this.overlays(c, p);
    c.restore();
    // badges
    const bx = s.x + Math.min(p.def.w * sc * 0.5, s.w * 0.4), by = s.y - Math.min(p.def.h * sc * 0.5, s.h * 0.42);
    if (p.broken && !p.fixed && this.phase !== 'apart') badge(c, bx, by, view.U, 'broken', this.time, this.jobGlyph(p));
    else if (p.dirt && (this.phase === 'clean' || this.phase === 'repair')) badge(c, bx, by, view.U * 0.85, 'dirty', this.time);
    // fittable glow in rebuild
    if (this.phase === 'rebuild' && this.canFit(p) && this.drag.rt !== p) {
      c.save();
      c.globalAlpha = 0.25 + 0.2 * Math.sin(this.time * 4);
      c.fillStyle = '#fff6c8';
      c.beginPath(); c.ellipse(s.x, s.y + 4, s.w * 0.42, s.h * 0.4, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  }

  drawPartFree(c: C, p: RT): void {
    c.save();
    c.globalAlpha = p.alpha;
    // lifted shadow
    if (p.lift > 0.01) {
      c.save();
      c.translate(p.x - 10 * p.lift * view.U, p.y + 18 * p.lift * view.U);
      c.rotate(p.rot);
      c.scale(p.sc, p.sc);
      c.fillStyle = `rgba(10,20,50,${0.25 * p.lift})`;
      c.fill(p.def.shape);
      c.restore();
    }
    c.translate(p.x, p.y);
    c.rotate(p.rot + Math.sin(this.time * 50) * p.wig * 0.06);
    c.scale(p.sc * p.flipX, p.sc);
    const inDev = p.state === 'in' && this.drag.rt !== p;
    p.def.draw(c, this.ds(p, inDev));
    this.overlays(c, p);
    c.restore();
  }

  drawFocus(c: C): void {
    const p = this.focus!;
    const { W, H, U } = view;
    // dim the bench
    c.fillStyle = 'rgba(15,25,45,0.35)';
    c.fillRect(0, 0, W, H);
    this.drawPartFree(c, p);
    if (this.phase !== 'clean' || !p.dirt) return;
    // tool
    const tool = p.def.tool ?? 'brush';
    const tp = this.toolPos;
    if (tool === 'brush') drawBrush(c, tp.x, tp.y, U * 1.15, tp.rest ? 0 : -0.15, tp.scrub);
    else drawSponge(c, tp.x, tp.y, U * 1.2, tp.rest ? 0 : -0.1, tp.scrub);
    // progress pill
    const spots = p.dirt[Math.min(p.side, p.dirt.length - 1)];
    const done = spots.reduce((s, q) => s + (1 - q.a), 0) / spots.length;
    const y = H * 0.84;
    c.fillStyle = 'rgba(28,32,44,0.85)';
    c.beginPath(); rrc(c, W / 2, y, 200 * U, 30 * U, 15 * U); c.fill();
    text(c, p.dirt.length > 1 ? `${tool === 'brush' ? '🖌' : '🧽'} · ${p.side + 1}/${p.dirt.length}` : tool === 'brush' ? '🖌' : '🧽', W / 2 - 62 * U, y + 1, 14 * U, '#f4f1ea');
    c.fillStyle = '#3a404c';
    c.beginPath(); rrc(c, W / 2 + 24 * U, y, 80 * U, 8 * U, 4 * U); c.fill();
    c.fillStyle = '#7ccf3c';
    const w = 80 * U * Math.min(1, done / 0.95);
    if (w > 2) { c.beginPath(); rrc(c, W / 2 + 24 * U - 40 * U + w / 2, y, w, 8 * U, 4 * U); c.fill(); }
    text(c, `${Math.round(Math.min(1, done / 0.95) * 100)}%`, W / 2 + 82 * U, y + 1, 12 * U, '#f4f1ea', { font: 'bold' });
  }

  drawHUD(c: C): void {
    const { W, U } = view;
    const top = view.top + 12 * U;
    drawCash(c, 14 * U, top, this.host.money(), U, this.host.cashPulse());
    drawGear(c, 36 * U, top + 66 * U, U);
    const lab = this.phaseLabel();
    const nw = Math.min(196 * U, W * 0.52);
    drawNotepad(c, W - nw - 12 * U, top - 4 * U, nw, U, tr(this.L.device.name), lab.line, lab.prog, lab.done, this.notePulse);
    if (this.listOpen > 0.02) this.drawList(c, W - nw - 12 * U, top + 80 * U, nw);
  }

  drawList(c: C, x: number, y: number, w: number): void {
    const U = view.U;
    const rows = this.parts.filter((p) => p.def.kind !== 'screw');
    const screws = this.parts.filter((p) => p.def.kind === 'screw');
    const rh = 30 * U;
    const head = 96 * U;
    const h = head + (rows.length + 1) * rh + 12 * U;
    c.save();
    c.globalAlpha = this.listOpen;
    c.translate(0, (1 - this.listOpen) * -20 * U);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath(); rrc(c, x + w / 2 - 2, y + h / 2 + 4, w, h, 10 * U); c.fill();
    c.fillStyle = '#fbf2dc';
    c.beginPath(); rrc(c, x + w / 2, y + h / 2, w, h, 10 * U); c.fill();
    const phases: [string, boolean, boolean][] = [
      [t('takeApart'), this.phase !== 'box' && this.phase !== 'apart', this.phase === 'apart'],
      [t('repair'), ['clean', 'rebuild', 'done', 'pack'].includes(this.phase), this.phase === 'repair'],
      [t('clean'), ['rebuild', 'done', 'pack'].includes(this.phase), this.phase === 'clean'],
      [t('rebuild'), ['done', 'pack'].includes(this.phase), this.phase === 'rebuild'],
    ];
    phases.forEach(([s, ok, cur], i) => {
      const yy = y + 16 * U + i * 20 * U;
      if (cur) { c.fillStyle = '#ffe7a0'; c.beginPath(); rrc(c, x + w / 2, yy, w - 16 * U, 19 * U, 5 * U); c.fill(); }
      text(c, (ok ? '✓ ' : '• ') + s, x + 14 * U, yy + 1, 14 * U, ok ? '#3f8a2e' : '#7a5a3a', { align: 'left' });
    });
    rows.forEach((p, i) => {
      const yy = y + head + i * rh;
      const known = p.seen || p.state === 'out';
      c.strokeStyle = 'rgba(180,150,100,0.3)';
      c.beginPath(); c.moveTo(x + 8 * U, yy - rh / 2); c.lineTo(x + w - 8 * U, yy - rh / 2); c.stroke();
      // tiny part icon
      c.save();
      c.translate(x + 22 * U, yy);
      const s = Math.min((22 * U) / p.def.w, (22 * U) / p.def.h);
      c.scale(s, s);
      c.globalAlpha = this.listOpen * (known ? 1 : 0.35);
      p.def.draw(c, this.ds(p));
      c.restore();
      const name = known ? tr(p.def.name) : t('strangePart');
      text(c, name, x + 40 * U, yy - 5 * U, 13 * U, known ? '#3b2a1e' : '#a89a86', { align: 'left', maxW: w - 50 * U });
      let st = '', col = '#3f8a2e';
      if (p.broken && !p.fixed && known) { st = (this.jobGlyph(p) ?? '⚡') + ' ' + t('fixIt'); col = '#d0443a'; }
      else if (p.dirt && known && p.state === 'out') { st = t('dirty'); col = '#3a7fb0'; }
      else if (this.phase === 'rebuild' || this.phase === 'done') st = p.state === 'in' ? '✓ ' + t('fitted') : '';
      else if (p.state === 'out') st = '✓ ' + t('out');
      text(c, st, x + 40 * U, yy + 8 * U, 11 * U, col, { align: 'left' });
    });
    const sy = y + head + rows.length * rh;
    const sOut = screws.filter((p) => p.state === 'out').length;
    text(c, `⚙ ${t('screws')}  ${this.phase === 'rebuild' || this.phase === 'done' ? screws.length - sOut : sOut}/${screws.length}`, x + 14 * U, sy, 13 * U, '#3b2a1e', { align: 'left' });
    c.restore();
  }

  // ---------------- hints ----------------

  /**
   * The very next thing to do to get through the current step, and where:
   * `at` = the spot to act on (the screw to turn, the part to take, the dirt left),
   * `grab` = the tool to pick up for it, `dest` = where a dragged part goes,
   * `flip` = nothing left on this face. `from`/`to`/`tap`/`msg` drive the
   * first-two-customers tutorial hand.
   */
  suggestion(): Hint | null {
    const U = view.U;
    if (this.mini || this.diag || this.phase === 'box' || this.phase === 'done' || this.phase === 'pack') {
      if (this.phase === 'box' && this.boxOpen === 0) return { at: this.center, tap: this.center, msg: t('tapBox') };
      return null;
    }
    const handle = () => { const d = this.driverRest(); return { x: d.x + Math.cos(d.ang) * 70 * U, y: d.y + Math.sin(d.ang) * 70 * U }; };
    if (this.focus) {
      if (this.phase !== 'clean') return null;
      const p = this.focus;
      const tool = p.def.tool ?? 'brush';
      const r = this.toolRest();
      const f = this.focusPos();
      // the dirtiest spot still left on the part being scrubbed
      const left = (p.dirt?.[p.side] ?? []).filter((q) => q.a > 0.15).sort((a, b) => b.a * b.r - a.a * a.r)[0];
      const at = left ? { x: p.x + left.x * p.sc * p.flipX, y: p.y + left.y * p.sc } : f;
      return { at, grab: r, from: r, to: { x: at.x, y: at.y - 14 * U }, msg: t(tool === 'brush' ? 'dragBrush' : 'dragSponge') };
    }
    if (this.phase === 'apart') {
      const vis = this.parts.filter((p) => p.state === 'in' && this.visibleOnSide(p) && this.canRemove(p));
      // a screw the driver can really turn now: nothing on top of it
      const sc = vis.find((p) => p.def.kind === 'screw' && this.isTopAt(p));
      if (sc) { const h = this.home(sc); return { at: h, grab: handle(), from: handle(), to: h, msg: t('dragScrewdriver') }; }
      // a part that is free and on top where the finger would grab it
      const free = vis.filter((p) => p.def.kind !== 'screw').sort((a, b) => b.def.z - a.def.z);
      const part = free.find((p) => { const h = this.home(p); const top = this.hitDevice(h.x, h.y); return !top || top === p; }) ?? free[0];
      if (part) {
        const h = this.home(part);
        const s = this.slotPos(this.nextSlot());
        return { at: h, dest: { x: s.x, y: s.y }, from: h, to: { x: s.x, y: s.y }, msg: t('dragPart') };
      }
      if (this.L.device.hasBack) return { at: this.center, flip: true, tap: this.center, dbl: true, msg: t('doubleTap') };
    }
    if (this.phase === 'repair') {
      const b = this.parts.find((p) => p.broken && !p.fixed);
      if (b) { const s = this.trayPos(b); return { at: s, tap: s, msg: t('tapBroken') }; }
    }
    if (this.phase === 'clean') {
      const b = this.parts.find((p) => p.dirt && p.state === 'out');
      if (b) { const s = this.trayPos(b); return { at: s, tap: s, msg: t('tapDirty') }; }
    }
    if (this.phase === 'rebuild') {
      const fit = this.parts.filter((p) => this.canFit(p));
      const part = fit.find((p) => p.def.kind !== 'screw');
      if (part) { const s = this.trayPos(part); const h = this.home(part); return { at: s, dest: h, from: s, to: h, msg: t('dragBack') }; }
      const sc = fit.find((p) => p.def.kind === 'screw' && this.visibleOnSide(p));
      if (sc) { const h = this.home(sc); return { at: h, grab: handle(), from: handle(), to: h, msg: t('dragScrewdriver') }; }
      if (fit.length && this.L.device.hasBack) return { at: this.center, flip: true, tap: this.center, dbl: true, msg: t('doubleTap') };
    }
    return null;
  }

  drawHints(c: C): void {
    const wait0 = 1.6;
    const auto = this.host.tutorial && this.idle >= wait0;
    if ((!auto && this.hintT <= 0) || this.drag.kind !== 'none' || this.driver.busy || this.listShown) return;
    const s = this.suggestion();
    if (!s) return;
    const a = Math.max(auto ? Math.min(1, (this.idle - wait0) * 3) : 0, Math.min(1, this.hintT * 2));
    c.save();
    c.globalAlpha = a;
    // the first two customers get the teaching hand; after that the bulb only marks the spot
    if (this.host.tutorial) this.drawTutorial(c, s);
    else this.drawTarget(c, s);
    c.restore();
  }

  drawTutorial(c: C, s: Hint): void {
    const U = view.U;
    const ph = (this.time * 0.7) % 1;
    if (s.from && s.to) {
      const k = ease.inOutSine(clamp((ph - 0.15) / 0.65, 0, 1));
      const x = s.from.x + (s.to.x - s.from.x) * k, y = s.from.y + (s.to.y - s.from.y) * k;
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.setLineDash([5 * U, 7 * U]);
      c.lineWidth = 2.5 * U;
      c.beginPath(); c.moveTo(s.from.x, s.from.y); c.lineTo(s.to.x, s.to.y); c.stroke();
      c.setLineDash([]);
      hand(c, x + 4 * U, y + 4 * U, U * 1.15, ph < 0.15 || ph > 0.8 ? 1 : 0);
      pill(c, clamp((s.from.x + s.to.x) / 2, 110 * U, view.W - 110 * U), Math.min(s.from.y, s.to.y) - 36 * U, s.msg, 14 * U, 1);
    } else if (s.tap) {
      const press = s.dbl ? ((ph < 0.1 || (ph > 0.2 && ph < 0.3)) ? 1 : 0) : ph < 0.15 ? 1 : 0;
      hand(c, s.tap.x + 6 * U, s.tap.y + 8 * U, U * 1.15, press);
      if (press) {
        c.strokeStyle = 'rgba(255,255,255,0.7)';
        c.lineWidth = 2.5 * U;
        c.beginPath(); c.arc(s.tap.x, s.tap.y, 18 * U, 0, Math.PI * 2); c.stroke();
      }
      pill(c, clamp(s.tap.x, 110 * U, view.W - 110 * U), s.tap.y - 50 * U, s.msg, 14 * U, 1);
    }
  }

  /** The bulb's hint: a pulsing ring on the spot, a hand tapping it and what to do there. */
  drawTarget(c: C, s: Hint): void {
    const U = view.U;
    const pulse = (this.time * 1.6) % 1;
    const ring = (x: number, y: number, r: number, col: string, dashed = false) => {
      c.save();
      c.strokeStyle = col;
      c.lineWidth = 3 * U;
      if (dashed) { c.setLineDash([5 * U, 5 * U]); c.lineDashOffset = -this.time * 20; }
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
      c.restore();
    };
    // where a dragged thing goes: a dashed ring and a faint path
    if (s.dest) {
      c.save();
      c.globalAlpha *= 0.5;
      c.strokeStyle = 'rgba(255,255,255,0.7)';
      c.lineWidth = 2 * U;
      c.setLineDash([4 * U, 8 * U]);
      c.beginPath(); c.moveTo(s.at.x, s.at.y); c.lineTo(s.dest.x, s.dest.y); c.stroke();
      c.restore();
      ring(s.dest.x, s.dest.y, 20 * U, 'rgba(255,255,255,0.85)', true);
    }
    // the tool to pick up for it
    if (s.grab) ring(s.grab.x, s.grab.y, 24 * U, 'rgba(255,226,120,0.75)', true);
    // the spot itself
    const { x, y } = s.at;
    const r = 18 * U;
    c.save();
    c.globalAlpha *= 1 - pulse;
    ring(x, y, r + pulse * 18 * U, '#ffd23f');
    c.restore();
    ring(x, y, r, '#ffffff');
    c.fillStyle = 'rgba(255,210,63,0.25)';
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    if (s.flip) text(c, '↻', x, y + 1, 20 * U, '#ffffff', { font: 'bold', stroke: 'rgba(0,0,0,0.4)', strokeW: 3 * U });
    // a hand tapping right on it (a double tap for a flip)
    const ph = (this.time * 0.9) % 1;
    const press = s.flip ? (ph < 0.1 || (ph > 0.2 && ph < 0.3) ? 1 : 0) : ph < 0.18 ? 1 : 0;
    hand(c, x + 6 * U, y + 8 * U - (1 - press) * 6 * U, U * 1.15, press);
    // and what to do there, above the spot (below it when the spot is up by the HUD)
    const above = y - r - 34 * U;
    const py = above > view.top + 150 * U ? above : y + r + 86 * U;
    pill(c, clamp(x, 110 * U, view.W - 110 * U), py, s.msg, 14 * U, 1);
  }

  // ---------------- hint bulb ----------------

  bulbPos(): { x: number; y: number } {
    const { W, U } = view;
    return this.mini ? { x: W - 32 * U, y: view.top + 40 * U } : { x: W - 34 * U, y: view.top + 112 * U };
  }

  /** The bulb shows whenever there is a next step to show. */
  bulbOn(): boolean {
    if (this.mini) return this.mini.winT < 0 && !!this.mini.game.hint;
    return !this.listShown && this.suggestion() !== null;
  }

  drawBulb(c: C): void {
    if (!this.bulbOn()) return;
    const p = this.bulbPos();
    const idle = this.mini ? this.mini.idle : this.idle;
    // after a while without progress the bulb glows, inviting a tap
    const glow = this.host.tutorial ? 0 : clamp((idle - 8) / 2, 0, 1) * (0.6 + 0.4 * Math.sin(this.time * 4));
    drawBulbBtn(c, p.x, p.y, view.U, glow, this.bulbPress);
  }

  /** Free hint: show the guide for the step the player is on. */
  useHint(): void {
    sfx.tap();
    haptic(10);
    this.bulbPress = 1;
    if (this.mini) { this.mini.hintT = 4.5; this.mini.idle = 0; return; }
    this.hintT = 4.5;
  }

  // ---------------- input ----------------

  nextSlot(): number {
    const used = new Set(this.parts.filter((p) => p.state === 'out' && p.def.kind !== 'screw').map((p) => p.slot));
    let i = 0;
    while (used.has(i)) i++;
    return i;
  }

  hitDevice(x: number, y: number): RT | null {
    const vis = this.parts
      .filter((p) => p.state === 'in' && !p.anim && this.visibleOnSide(p))
      .sort((a, b) => b.def.z - a.def.z);
    if (this.g3.ok) return this.g3.pick(x, y, vis);
    const g = mainCtx;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    let hit: RT | null = null;
    for (const p of vis) {
      const h = this.home(p);
      const lx = (x - h.x) / (this.k * this.flipK), ly = (y - h.y) / this.k;
      const pad = p.def.kind === 'screw' ? 1 : 0;
      if (pad || g.isPointInPath(p.def.shape, lx, ly)) {
        if (pad && Math.hypot(lx, ly) > SCREW_R + 6) continue;
        hit = p;
        break;
      }
    }
    g.restore();
    return hit;
  }

  hitTray(x: number, y: number): RT | null {
    const cands = this.parts.filter((p) => p.state === 'out' && p.def.kind !== 'screw' && !p.anim && p !== this.focus);
    // the actual model under the finger, nearest to the camera = the one on top
    const hit = this.g3.ok ? this.g3.pickTray(x, y, cands) : null;
    if (hit) return hit;
    // through a hole (a bezel, a ring) or without WebGL: the part's footprint, topmost first
    for (const p of cands.sort((a, b) => b.tz - a.tz)) {
      const s = this.trayPos(p);
      const sc = this.traySc(p);
      const hw = Math.max(18 * view.U, p.def.w * sc * 0.5), hh = Math.max(18 * view.U, p.def.h * sc * 0.5);
      if (Math.abs(x - s.x) < hw && Math.abs(y - s.y) < hh) return p;
    }
    return null;
  }

  inDeviceArea(x: number, y: number): boolean {
    const cc = this.center;
    return Math.abs(x - cc.x) < (this.L.device.w * this.k) / 2 + 20 && Math.abs(y - cc.y) < (this.L.device.h * this.k) / 2 + 20;
  }

  down(x: number, y: number): void {
    this.idle = 0;
    const bp = this.bulbPos();
    if (this.bulbOn() && dist(x, y, bp.x, bp.y) < 26 * view.U) {
      this.drag = { kind: 'none', sx: x, sy: y, ox: 0, oy: 0, px: x, py: y, moved: false, from: 'device' };
      this.useHint();
      return;
    }
    if (this.mini) { this.mini.down(x, y); return; }
    if (this.diag) { this.diag.down(x, y); return; }
    const { W, U } = view;
    const top = view.top + 12 * U;
    // HUD: notepad toggles the list; gear opens settings
    const nw = Math.min(196 * U, W * 0.52);
    if (this.listShown) { this.listShown = false; sfx.tap(); return; }
    if (x > W - nw - 16 * U && y < top + 86 * U && this.phase !== 'box') { this.listShown = true; sfx.tap(); return; }
    if (dist(x, y, 36 * U, top + 66 * U) < 24 * U) { sfx.tap(); this.host.openSettings(); return; }

    this.drag = { kind: 'none', sx: x, sy: y, ox: 0, oy: 0, px: x, py: y, moved: false, from: 'device' };

    switch (this.phase) {
      case 'box': this.tapBox(x, y); return;
      case 'done': {
        if (this.doneBtn > 0.9 && Math.abs(x - W / 2) < 80 * U && Math.abs(y - view.H * 0.8) < 32 * U) { this.doneBtnDown = true; sfx.tap(); }
        else this.startSpin(); // admire the repaired gadget
        return;
      }
      case 'pack': return;
    }

    if (this.focus) {
      if (this.phase === 'clean') {
        const tp = this.toolPos;
        if (dist(x, y, tp.x, tp.y) < 60 * U || this.focusHit(x, y)) {
          this.drag.kind = 'tool';
          tp.rest = false;
          tp.x = x; tp.y = y - 20 * U;
          sfx.lift();
        }
      }
      return;
    }

    // screwdriver?
    const d = this.driver;
    if (!d.busy && dist(x, y, d.x + Math.cos(d.ang) * 70 * U, d.y + Math.sin(d.ang) * 70 * U) < 52 * U) {
      this.drag.kind = 'driver';
      d.rest = false;
      d.held = true;
      d.x = x - 18 * U; d.y = y - 44 * U;
      d.ang = 0.95;
      sfx.lift();
      haptic(8);
      return;
    }
    // double-tap to flip
    const now = this.time;
    const dbl = now - this.lastTap.t < 0.32 && dist(x, y, this.lastTap.x, this.lastTap.y) < 40 * U;
    this.lastTap = { t: now, x, y };
    if (dbl && this.L.device.hasBack && this.inDeviceArea(x, y) && (this.phase === 'apart' || this.phase === 'rebuild')) {
      this.lastTap.t = -1;
      cancelTag('blocked');
      this.flip();
      return;
    }

    // device part
    const hit = this.hitDevice(x, y);
    if (hit && this.phase === 'apart') {
      if (hit.def.kind === 'screw') {
        this.startSpin(() => {
          toast(t('dragScrewdriver'), W / 2, this.center.y - this.L.device.h * this.k * 0.5 - 26 * U, 14 * U);
          hit.wig = 1;
        });
        return;
      }
      if (!this.canRemove(hit)) {
        const b = this.blockers(hit);
        const msg = b.some((q) => q.def.kind === 'screw') ? t('screwsFirst') : t('first', tr(b[0].def.name));
        // wait a beat: this tap may be the first half of a double-tap flip
        const blocked = () => {
          toast(msg, W / 2, this.center.y - this.L.device.h * this.k * 0.5 - 26 * U, 14 * U);
          hit.wig = 1;
          sfx.error();
          haptic(25);
        };
        // a drag on it turns the gadget instead; a plain tap explains what is in the way
        this.startSpin(() => {
          if (this.L.device.hasBack) wait(0.3, () => { if (this.lastTap.t >= 0) blocked(); }, 'blocked');
          else blocked();
        });
        return;
      }
      const h = this.home(hit);
      this.drag.kind = 'part';
      this.drag.rt = hit;
      this.drag.from = 'device';
      this.drag.ox = h.x - x; this.drag.oy = h.y - y;
      hit.anim = true;
      emit('ring', h.x, h.y, 1, { color: 'rgba(255,255,255,0.75)', size: 34 * U, life: 0.3, speed: 0 });
      hit.x = h.x; hit.y = h.y; hit.sc = this.k; hit.rot = -this.heading; hit.flipX = this.g3.ok ? 1 : this.flipK; hit.alpha = 1;
      tween(hit, { lift: 1 }, 0.15);
      sfx.lift();
      haptic(8);
      return;
    }

    // tray part
    const tp = this.hitTray(x, y);
    if (tp) {
      // whatever is touched comes to the top of the pile, and can always be dragged aside
      tp.tz = ++this.topZ;
      let job: (() => void) | undefined;
      if (this.phase === 'apart') job = () => { if (tp.broken || tp.dirt) toast(t('takeAllApart'), W / 2, view.H * 0.64, 14 * U); tp.wig = 1; };
      if (this.phase === 'repair') job = () => { if (tp.broken && !tp.fixed) this.openRepair(tp); else { tp.wig = 1; toast(t('tapBroken'), W / 2, view.H * 0.64, 14 * U); } };
      if (this.phase === 'clean') job = () => { if (tp.dirt) this.openClean(tp); else { tp.wig = 1; toast(t('tapDirty'), W / 2, view.H * 0.64, 14 * U); } };
      const rebuild = this.phase === 'rebuild';
      if (rebuild && tp.def.side !== 'A' && tp.def.side !== this.viewSide && this.canFit(tp)) this.flip();
      const s = this.trayPos(tp);
      this.drag.kind = 'part';
      this.drag.rt = tp;
      this.drag.from = 'tray';
      this.drag.tap = job;
      this.drag.ox = s.x - x; this.drag.oy = s.y - y;
      tp.anim = true;
      tp.x = s.x; tp.y = s.y; tp.sc = this.traySc(tp); tp.rot = s.rot; tp.flipX = 1; tp.alpha = 1;
      // rebuilding: it grows to its fitted size on the way to the gadget; otherwise it just lifts
      tween(tp, rebuild ? { lift: 1, sc: this.k * 0.9, rot: 0 } : { lift: 0.55, sc: this.traySc(tp) * 1.08 }, 0.18, ease.outBack);
      emit('ring', s.x, s.y, 1, { color: 'rgba(255,255,255,0.7)', size: 26 * U, life: 0.3, speed: 0 });
      sfx.lift();
      haptic(8);
      return;
    }

    // empty mat (or the gadget itself): turn it
    this.startSpin();
  }

  /** Begin turning the gadget with the finger; `tapOnly` runs if the finger never moved. */
  startSpin(tapOnly?: () => void): void {
    if (!this.g3.ok) { tapOnly?.(); return; }
    this.drag.kind = 'spin';
    this.drag.blocked = tapOnly;
    this.spinVx = this.spinVy = 0;
  }

  move(x: number, y: number): void {
    if (this.mini) { this.mini.move(x, y); return; }
    if (this.diag) return;
    const U = view.U;
    const dr = this.drag;
    const dx = x - dr.px, dy = y - dr.py;
    dr.px = x; dr.py = y;
    if (dist(x, y, dr.sx, dr.sy) > 6) dr.moved = true;
    if (dr.kind === 'none') return;
    this.idle = 0;
    if (dr.kind === 'part' && dr.rt) {
      dr.tx = x + dr.ox; dr.ty = y + dr.oy;
      return;
    }
    if (dr.kind === 'spin') {
      if (!dr.moved) return;
      // sideways turns it on the mat; up/down tips it to show the sides and the bottom
      this.g3.turn(dx, dy);
      this.spinAt = this.time;
      this.spinVx = this.spinVx * 0.5 + dx * 0.5;
      this.spinVy = this.spinVy * 0.5 + dy * 0.5;
      return;
    }
    if (dr.kind === 'driver') {
      const d = this.driver;
      if (d.busy) return;
      d.x = x - 18 * U; d.y = y - 44 * U;
      this.tryScrew();
      return;
    }
    if (dr.kind === 'tool') {
      const tp = this.toolPos;
      tp.x = x; tp.y = y - 20 * U;
      this.scrub(Math.hypot(dx, dy));
    }
  }

  up(x: number, y: number): void {
    if (this.mini) { this.mini.up(x, y); return; }
    if (this.diag) { this.diag.up(x, y); return; }
    const dr = this.drag;
    if (dr.kind === 'part' && dr.rt && dr.tx !== undefined && dr.ty !== undefined) { dr.rt.x = dr.tx; dr.rt.y = dr.ty; }
    const U = view.U;
    if (this.doneBtnDown) {
      this.doneBtnDown = false;
      if (Math.abs(x - view.W / 2) < 80 * U && Math.abs(y - view.H * 0.8) < 36 * U) this.pack();
      return;
    }
    if (dr.kind === 'part' && dr.rt) {
      const p = dr.rt;
      if (dr.from === 'device') {
        const h = this.home(p);
        if (dist(p.x, p.y, h.x, h.y) > 34 * U) this.removePart(p);
        else this.returnHome(p);
      } else if (!dr.moved && this.phase !== 'rebuild') {
        // a tap: settle back and do the part's job
        const s = this.trayPos(p);
        tween(p, { x: s.x, y: s.y, sc: this.traySc(p), lift: 0 }, 0.12, ease.outCubic, () => { p.anim = false; dr.tap?.(); });
      } else {
        const h = this.home(p);
        const nearGadget = dist(p.x, p.y, h.x, h.y) < 110 * U || this.inDeviceArea(p.x, p.y);
        if (this.phase === 'rebuild' && this.canFit(p) && nearGadget) this.fitPart(p);
        else {
          if (this.phase === 'rebuild' && nearGadget && !this.canFit(p)) {
            const b = this.fitBlockers(p);
            toast(t('first', tr(b[0].def.name)), view.W / 2, this.center.y - this.L.device.h * this.k * 0.5 - 26 * U, 14 * U);
            sfx.error();
            haptic(25);
            this.toSlot(p);
          } else this.dropOnMat(p);
        }
      }
    }
    if (dr.kind === 'driver') {
      this.driver.held = false;
      this.screwNope = null;
      if (!this.driver.busy) this.driver.rest = true;
    }
    if (dr.kind === 'tool') this.toolPos.rest = true;
    if (dr.kind === 'spin') {
      if (!dr.moved) { this.spinVx = this.spinVy = 0; dr.blocked?.(); }
      // a finger that came to rest before lifting does not fling
      else if (this.time - this.spinAt > 0.1) this.spinVx = this.spinVy = 0;
    }
    this.drag = { kind: 'none', sx: 0, sy: 0, ox: 0, oy: 0, px: 0, py: 0, moved: false, from: 'device' };
  }

  // ---------------- actions ----------------

  tapBox(x: number, y: number): void {
    if (this.boxOpen > 0 || !this.inDeviceArea(x, y)) return;
    sfx.box();
    haptic(15);
    this.devAppear = 1;
    this.devLift = 0;
    const cc0 = this.center;
    // the flaps pop and a few peanuts jump out
    wait(0.12, () => emit('dust', cc0.x, cc0.y - 10 * view.U, 14, { color: ['#ffffff', '#eef1f4', '#dfe4ea'], speed: 210, size: 7 * view.U, life: 0.8, dir: -Math.PI / 2, spread: 1.6, g: 420 }));
    tween(this, { boxOpen: 1 }, 0.35, ease.outBack, () => {
      wait(0.35, () => {
        // the gadget rises out of the packing peanuts, the box slides away under it, it lands on the mat
        sfx.pop();
        sfx.sparkle();
        const cc = this.center;
        emit('spark', cc.x, cc.y, 24, { color: ['#fff', '#ffe28a'], speed: 260, size: 8 });
        this.devAppear = 1;
        this.devLift = 0;
        tween(this, { devLift: 1 }, 0.45, ease.outCubic, () => {
          sfx.whoosh();
          tween(this, { boxY: view.H * 0.7, boxScale: 0.8 }, 0.4, ease.inBack, () => {
            tween(this, { devLift: 0 }, 0.22, ease.inQuad, () => {
              sfx.place();
              haptic(15);
              emit('dust', cc.x, cc.y + this.L.device.h * this.k * 0.4, 12, { color: 'rgba(255,255,255,0.7)', speed: 110, size: 5, life: 0.5 });
              this.phase = 'apart';
              this.notePulse = 1;
              const spinHint = () => wait(0.5, () => toast(t('spinHint'), view.W / 2, view.H * 0.64, 14 * view.U, 2.4));
              if (this.host.diagnose) {
                this.diag = new Diagnosis(this.L, this.host.diagnose, (right) => {
                  this.diag = null;
                  this.idle = 0;
                  // the culprit gives a little wiggle: that's the one to get to
                  const p = this.parts.find((q) => q.def.id === this.L.broken);
                  if (p && right) p.wig = 1;
                  if (right) {
                    // the bonus goes straight into the cash pill
                    this.host.earn(diagBonus(this.L));
                    sfx.cash();
                    emit('star', 70 * view.U, view.top + 32 * view.U, 12, { color: ['#ffd23f', '#fff'], speed: 160, size: 6 });
                  }
                  spinHint();
                });
              } else spinHint();
              this.boxOpen = 0;
              this.boxY = 0;
              this.boxScale = 1;
            });
          });
        });
      });
    });
  }

  flip(): void {
    if (!this.L.device.hasBack) return;
    sfx.flip();
    haptic(10);
    if (this.g3.ok) {
      // a real roll in 3D; the face that ends up toward you decides the side
      this.spinVx = this.spinVy = 0;
      this.g3.flip();
      return;
    }
    animate(0.36, (k) => {
      this.flipK = Math.cos(k * Math.PI);
      if (k >= 0.5 && this.flipK <= 0 && !this.flipMid) {
        this.flipMid = true;
        this.viewSide = this.viewSide === 'F' ? 'B' : 'F';
      }
      this.flipK = Math.abs(this.flipK);
    }, ease.inOutSine, () => { this.flipK = 1; this.flipMid = false; });
  }
  flipMid = false;

  returnHome(p: RT): void {
    const h = this.home(p);
    tween(p, { x: h.x, y: h.y, rot: -this.heading, lift: 0 }, 0.18, ease.outCubic, () => { p.anim = false; });
  }

  removePart(p: RT): void {
    p.state = 'out';
    p.slot = this.nextSlot();
    p.spot = null;
    p.seen = true;
    sfx.whoosh();
    haptic(12);
    this.toSlot(p, () => {
      if (this.countIn() === 0) this.advance();
    });
    this.notePulse = 0.6;
  }

  /** Put a carried part down where it is (clamped to the mat), with a little landing. */
  dropOnMat(p: RT): void {
    const c = this.clampSpot(p.x, p.y);
    const rot = clamp(p.rot, -0.6, 0.6);
    p.spot = { x: c.x, y: c.y, rot };
    p.tz = ++this.topZ;
    tween(p, { x: c.x, y: c.y, sc: this.traySc(p), rot, lift: 0, flipX: 1 }, 0.16, ease.inQuad, () => {
      p.anim = false;
      this.land(c.x, c.y, p);
    });
  }

  /** Landing on the mat: bounce, a puff of dust, a soft thud. */
  land(x: number, y: number, p: RT): void {
    const U = view.U;
    p.pop = 1;
    sfx.place();
    haptic(10);
    emit('dust', x, y + 8 * U, 8, { color: 'rgba(255,255,255,0.75)', speed: 70, size: 4 * U, life: 0.45, spread: Math.PI });
    emit('ring', x, y, 1, { color: 'rgba(255,255,255,0.45)', size: 30 * U, life: 0.35, speed: 0 });
  }

  toSlot(p: RT, done?: () => void): void {
    const s = this.trayPos(p);
    p.anim = true;
    p.tz = ++this.topZ;
    tween(p, { x: s.x, y: s.y, sc: this.traySc(p), rot: s.rot, lift: 0, flipX: 1 }, 0.32, ease.outCubic, () => {
      p.anim = false;
      this.land(s.x, s.y, p);
      done?.();
    });
  }

  fitPart(p: RT): void {
    const h = this.home(p);
    tween(p, { x: h.x, y: h.y, sc: this.k, rot: -this.heading, lift: 0 }, 0.16, ease.outCubic, () => {
      p.state = 'in';
      p.anim = false;
      p.pop = 1;
      sfx.place();
      sfx.tick();
      haptic(18);
      emit('dust', h.x, h.y, 10, { color: 'rgba(255,255,255,0.8)', speed: 90, size: 4, life: 0.5 });
      emit('ring', h.x, h.y, 1, { color: 'rgba(255,244,190,0.9)', size: 44 * view.U, life: 0.35, speed: 0 });
      emit('star', h.x, h.y, 5, { color: ['#ffe28a', '#ffffff'], speed: 150, size: 5, life: 0.6 });
      this.notePulse = 0.6;
      if (this.countIn() === this.parts.length) this.advance();
    });
  }

  tryScrew(): void {
    const d = this.driver;
    if (d.busy) return;
    const U = view.U;
    // the nearest screw under the tip, not just the first one in the list
    let near: RT | null = null, nd = 30 * U;
    for (const p of this.parts) {
      if (p.def.kind !== 'screw' || !this.visibleOnSide(p) || p.anim) continue;
      if (this.phase === 'apart' ? p.state !== 'in' : p.state !== 'out') continue;
      const h = this.home(p);
      const dd = dist(d.x, d.y, h.x, h.y);
      if (dd < nd) { nd = dd; near = p; }
    }
    if (!near) { this.screwNope = null; return; }
    if (this.phase === 'apart' && this.canRemove(near) && this.isTopAt(near)) { this.unscrew(near); return; }
    if (this.phase === 'rebuild' && this.canFit(near) && this.dishScrews > 0) { this.screwIn(near); return; }
    // on a screw that can't turn yet: say why, once per screw
    if (this.phase === 'apart' && this.screwNope !== near) {
      this.screwNope = near;
      near.wig = 1;
      const h = this.home(near);
      const first = this.blockers(near)[0] ?? this.hitDevice(h.x, h.y);
      sfx.error();
      haptic(15);
      toast(first && first !== near ? t('first', tr(first.def.name)) : t('takeAllApart'), view.W / 2, this.center.y - this.L.device.h * this.k * 0.5 - 26 * U, 14 * U);
    }
  }
  /** The screw the driver last bumped into without turning it (for one toast, not a stream). */
  screwNope: RT | null = null;

  /** A screw is reachable only if no part with a higher z covers it. */
  isTopAt(p: RT): boolean {
    const h = this.home(p);
    const top = this.hitDevice(h.x, h.y);
    return !top || top === p || top.def.z <= p.def.z;
  }

  unscrew(p: RT): void {
    const d = this.driver;
    const h = this.home(p);
    d.busy = true;
    d.x = h.x; d.y = h.y;
    tween(d, { stand: 1 }, 0.12, ease.outCubic, () => {
      sfx.ratchet(7);
      animate(0.5, (k) => { d.twist = -k * Math.PI * 4; d.prog = k; p.wig = 0.4; }, ease.linear, () => {
        d.prog = 0;
        p.state = 'out';
        p.seen = true;
        sfx.pop();
        haptic(15);
        emit('spark', h.x, h.y - 20 * view.U, 6, { color: '#fff', speed: 100, size: 4 });
        const f = { x: h.x, y: h.y - 26 * view.U, sc: 1.4, a: 1 };
        this.flying.push(f);
        const dp = this.dishPos();
        const sx = f.x, sy = f.y;
        animate(0.42, (k) => {
          f.x = sx + (dp.x - sx) * k;
          f.y = sy + (dp.y - sy) * k - Math.sin(k * Math.PI) * 80 * view.U;
          f.sc = 1.4 - k * 0.7;
        }, ease.inOutSine, () => {
          this.flying.splice(this.flying.indexOf(f), 1);
          this.dishScrews++;
          sfx.clink();
        });
        tween(d, { stand: 0 }, 0.12, ease.outCubic, () => {
          d.busy = false;
          if (!d.held) d.rest = true;
          if (this.countIn() === 0) this.advance();
        });
        this.notePulse = 0.6;
      });
    });
  }

  screwIn(p: RT): void {
    const d = this.driver;
    const h = this.home(p);
    d.busy = true;
    this.dishScrews--;
    const dp = this.dishPos();
    const f = { x: dp.x, y: dp.y, sc: 0.7, a: 1 };
    this.flying.push(f);
    sfx.whoosh();
    animate(0.3, (k) => {
      f.x = dp.x + (h.x - dp.x) * k;
      f.y = dp.y + (h.y - dp.y) * k - Math.sin(k * Math.PI) * 80 * view.U;
      f.sc = 0.7 + k * 0.3;
    }, ease.inOutSine, () => {
      this.flying.splice(this.flying.indexOf(f), 1);
      p.state = 'in';
      p.pop = 1;
      d.x = h.x; d.y = h.y;
      tween(d, { stand: 1 }, 0.1, ease.outCubic, () => {
        sfx.ratchet(6);
        animate(0.42, (k) => { d.twist = k * Math.PI * 4; d.prog = k; }, ease.linear, () => {
          d.prog = 0;
          sfx.clink();
          haptic(15);
          tween(d, { stand: 0 }, 0.1, ease.outCubic, () => {
            d.busy = false;
            if (!d.held) d.rest = true;
            if (this.countIn() === this.parts.length) this.advance();
          });
        });
      });
    });
  }

  /** Badge glyph for a hands-on job (none for the PCB puzzles, they keep the red bolt). */
  jobGlyph(p: RT): string | undefined {
    const k = this.jobs.get(p.def.id)?.kind;
    return k ? JOB_GLYPH[k] : undefined;
  }

  openRepair(p: RT): void {
    const f = this.focusPos();
    p.anim = true;
    const s = this.trayPos(p);
    p.x = s.x; p.y = s.y; p.sc = this.traySc(p); p.rot = s.rot;
    sfx.whoosh();
    tween(p, { x: f.x, y: f.y, sc: this.focusSc(p), rot: 0, lift: 1 }, 0.35, ease.outBack, () => {
      wait(0.15, () => {
        this.mini = new Minigame(this.jobs.get(p.def.id) ?? this.L.puzzle, {
          money: () => this.host.money(),
          price: this.L.partPrice,
          title: t('traceTitle', tr(p.def.name).toLowerCase()),
          tutorial: this.host.tutorial,
          onWin: (bought) => {
            if (bought) { this.host.spend(this.L.partPrice); this.bought++; }
            wait(bought ? 0.1 : 0.05, () => {
              this.mini = null;
              p.fixed = true;
              p.pop = 1;
              sfx.sparkle();
              emit('spark', f.x, f.y, 24, { color: ['#fff', '#c8f7a0', '#ffe28a'], speed: 240, size: 8 });
              toast(t('repaired'), view.W / 2, f.y + p.def.h * this.focusSc(p) * 0.5 + 30 * view.U, 16 * view.U);
              wait(0.8, () => {
                p.lift = 0;
                this.toSlot(p, () => this.advance());
              });
            });
          },
        });
      });
    });
  }

  openClean(p: RT): void {
    const f = this.focusPos();
    const s = this.trayPos(p);
    p.anim = true;
    p.x = s.x; p.y = s.y; p.sc = this.traySc(p); p.rot = s.rot;
    this.focus = p;
    const r = this.toolRest();
    this.toolPos = { x: r.x, y: view.H + 60, rest: true, scrub: 0 };
    sfx.whoosh();
    tween(p, { x: f.x, y: f.y, sc: this.focusSc(p), rot: 0, lift: 0.4 }, 0.35, ease.outBack);
  }

  focusHit(x: number, y: number): boolean {
    const p = this.focus!;
    return Math.abs(x - p.x) < (p.def.w * p.sc) / 2 && Math.abs(y - p.y) < (p.def.h * p.sc) / 2;
  }

  scrub(moved: number): void {
    const p = this.focus;
    if (!p || !p.dirt || p.flipX < 0.99 && p.flipX > -0.99) return;
    const tp = this.toolPos;
    const U = view.U;
    // tool contact point = bristles, a bit below the tool centre
    const cx = tp.x, cy = tp.y + 14 * U;
    const lx = (cx - p.x) / (p.sc * p.flipX), ly = (cy - p.y) / p.sc;
    const R = (38 * U) / p.sc;
    const spots = p.dirt[p.side];
    let hit = false;
    for (const q of spots) {
      if (q.a <= 0) continue;
      const d = Math.hypot(q.x - lx, q.y - ly);
      if (d < R + q.r) {
        q.a = Math.max(0, q.a - moved * 0.012 * (1.4 - d / (R + q.r)));
        hit = true;
        p.dirtVer++;
      }
    }
    if (hit && moved > 2) {
      tp.scrub = 1;
      if (Math.random() < 0.35) {
        if ((p.def.tool ?? 'brush') === 'sponge') { emit('bubble', cx + (Math.random() - 0.5) * 40 * U, cy, 1, { speed: 40, size: 5 * U, life: 0.9 }); if (Math.random() < 0.3) sfx.bubble(); }
        else emit('dust', cx + (Math.random() - 0.5) * 40 * U, cy + 6 * U, 2, { color: 'rgba(150,120,80,0.8)', speed: 70, size: 3 * U, life: 0.5 });
      }
      if (Math.random() < 0.3) sfx.scrub();
    }
    const done = spots.reduce((s, q) => s + (1 - q.a), 0) / spots.length;
    if (done >= 0.95) {
      for (const q of spots) q.a = 0;
      p.dirtVer++;
      sfx.sparkle();
      haptic(20);
      emit('spark', p.x, p.y, 16, { color: ['#fff', '#c8f0ff'], speed: 200, size: 7 });
      if (p.side < p.dirt.length - 1) {
        // turn the part over: its back face comes up, dirty in its own way
        this.toolPos.rest = true;
        this.drag.kind = 'none';
        p.flipX = 0.98;
        tween(p, { lift: 1 }, 0.2, ease.outCubic);
        animate(0.55, (k) => {
          p.flipX = Math.cos(k * Math.PI);
          if (k >= 0.5) p.side = 1;
        }, ease.inOutSine, () => { p.flipX = -1; p.side = 1; tween(p, { lift: 0.4 }, 0.2, ease.inCubic); });
        sfx.flip();
      } else {
        p.dirt = null;
        this.drag.kind = 'none';
        this.toolPos.rest = true;
        toast(t('spotless'), view.W / 2, p.y + (p.def.h * p.sc) / 2 + 30 * U, 16 * U);
        // a part turned over goes back face up before it returns to the mat
        if (p.flipX < 0) wait(0.25, () => animate(0.4, (k) => { p.flipX = -Math.cos(k * Math.PI); }, ease.inOutSine, () => { p.flipX = 1; }));
        wait(p.flipX < 0 ? 0.75 : 0.6, () => {
          this.focus = null;
          tween(this.toolPos, { y: view.H + 80 }, 0.25);
          this.toSlot(p, () => {
            this.notePulse = 1;
            if (this.parts.every((q) => !q.dirt)) this.advance();
          });
        });
      }
    }
  }

  pack(): void {
    this.spinVx = this.spinVy = 0;
    if (this.g3.ok) this.g3.resetPose(0.3);
    this.phase = 'pack';
    sfx.tap();
    this.doneBtn = 0;
    this.packed = true;
    this.boxOpen = 1;
    this.boxScale = 1;
    this.boxY = view.H * 0.6;
    sfx.whoosh();
    this.devAppear = 1;
    // lift the gadget, slide the open box in under it, lower it into the peanuts
    tween(this, { devLift: 1 }, 0.25, ease.outCubic);
    tween(this, { boxY: 0 }, 0.45, ease.outBack, () => {
      sfx.box();
      tween(this, { devLift: 0 }, 0.35, ease.inCubic, () => {
        // device is inside, in the peanuts: fold the flaps over it
        emit('dust', this.center.x, this.center.y, 8, { color: ['#ffffff', '#eef1f4'], speed: 120, size: 6 * view.U, life: 0.5, dir: -Math.PI / 2, spread: 1.4, g: 300 });
        tween(this, { boxOpen: 0 }, 0.3, ease.inCubic, () => {
          sfx.box();
          haptic(20);
          const cc = this.center;
          emit('dust', cc.x, cc.y + this.L.device.h * this.k * 0.35, 16, { color: 'rgba(240,226,200,0.85)', speed: 160, size: 6 * view.U, life: 0.6, spread: Math.PI });
          emit('ring', cc.x, cc.y, 1, { color: 'rgba(255,255,255,0.6)', size: 80 * view.U, life: 0.4, speed: 0 });
          this.power = 0;
          wait(0.35, () => this.host.onPacked(this.bought));
        });
      });
    });
  }
}

function makeDirt(def: PartDef, r: () => number): Spot[] {
  const spots: Spot[] = [];
  const g = mainCtx;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  const n = Math.round(clamp((def.w * def.h) / 160, 18, 110));
  let guard = 0;
  while (spots.length < n && guard++ < n * 20) {
    const x = (r() - 0.5) * def.w, y = (r() - 0.5) * def.h;
    if (!g.isPointInPath(def.shape, x, y)) continue;
    const cols = ['#7a5a38', '#8d6b45', '#5f4a33', '#9a7a50', '#6e5a40'];
    const big = r() < 0.15;
    spots.push({ x, y, r: big ? 4 + r() * 4 : 1.5 + r() * 2.8, a: 1, col: cols[Math.floor(r() * cols.length)] });
  }
  g.restore();
  return spots;
}

void rgba;
