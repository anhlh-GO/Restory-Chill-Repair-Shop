// Keeps the 3D models of one workbench in sync with the game state and
// renders them in two passes (behind / in front of the 2D overlays).

import { THREE, TILT, initStage, resizeStage, toWorld, toScreen, rayAt, renderPass, disposeObject } from './stage';
import { animate, ease } from '../core/tween';
import { PartModel, computeStacks, makeScrewdriver, makeDish, makeScrewMesh, BoxModel, makeBrush, makeSponge, type Stack } from './models';
import { makeMat, makeLamp, makePenCup, makeFrame, makeMug, makeCleanPad, woodTexture } from './props';
import { view } from '../core/view';
import { rng } from '../core/draw';
import type { Bench, RT } from '../scenes/bench';
import { SCREW_R } from '../content/device';
import { tierOf } from '../content/meta';

/** Workbench upgrades: cutting mat, lamp, desk wood (index = tier). */
const MAT_COLORS = ['#2f5189', '#2f7a5e', '#2f7a5e', '#2a6a5a'];
const LAMP_COLORS = [0x2c3a5c, 0x2c3a5c, 0xb8893a, 0xb8893a];
const WOOD_COLORS = ['#6e4630', '#6e4630', '#6e4630', '#4a2c1e'];

const v = new THREE.Vector3();
const X = new THREE.Vector3(1, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
// the bench camera looks down TILT from vertical: its screen-up and toward-viewer directions in the world
const SCREEN_UP = new THREE.Vector3(0, Math.sin(TILT), -Math.cos(TILT));
const TO_CAMERA = new THREE.Vector3(0, Math.cos(TILT), Math.sin(TILT));
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion();
const m4 = new THREE.Matrix4();
const box3 = new THREE.Box3();

/** How deep the rounded underside of a one-faced gadget is. */
function bellyOf(round: number | undefined, thick: number): number {
  return Math.max(thick * 0.3, Math.min(thick, round ?? thick * 0.5));
}

export class Bench3D {
  ok: boolean;
  b: Bench;
  models = new Map<RT, PartModel>();
  stacks: Map<string, Stack>;
  driver!: THREE.Group;
  dish!: THREE.Group;
  dishScrews: THREE.Group[] = [];
  flyScrews: THREE.Group[] = [];
  box!: BoxModel;
  brush!: THREE.Group;
  sponge!: THREE.Group;
  y3 = new WeakMap<RT, number>();
  tilt = new WeakMap<RT, { x: number; y: number; rx: number; rz: number }>();
  devTop = 0;
  desk = new THREE.Group();
  /** The assembled gadget: devRoot carries the pose, devInner holds the parts in device units. */
  devRoot = new THREE.Group();
  devInner = new THREE.Group();
  owner = new Map<THREE.Object3D, RT>();
  deskKey = '';

  constructor(b: Bench) {
    this.b = b;
    this.ok = initStage();
    this.stacks = computeStacks(b.L.device);
    if (!this.ok) return;
    for (const p of b.parts) {
      const st = this.stacks.get(p.def.id)!;
      const base = p.def.z === 0;
      const two = b.L.device.hasBack;
      const m = new PartModel(p.def, st.thick, two && base, !two && base ? bellyOf(p.def.round, st.thick) : 0);
      this.models.set(p, m);
      this.owner.set(m.group, p);
    }
    this.devRoot.add(this.devInner);
    this.layoutStacks();
    this.driver = makeScrewdriver();
    this.dish = makeDish();
    this.box = new BoxModel();
    this.brush = makeBrush();
    this.sponge = makeSponge();
    for (let i = 0; i < 16; i++) this.dishScrews.push(makeScrewMesh());
    for (let i = 0; i < 4; i++) this.flyScrews.push(makeScrewMesh());
  }

  stack(p: RT): Stack { return this.stacks.get(p.def.id)!; }

  // ---------------- placement ----------------

  /** Put a model so its top face centre lands under screen (sx, sy). */
  place(o: THREE.Object3D, sx: number, sy: number, baseY: number, topH: number): void {
    toWorld(sx, sy, baseY + topH, v);
    o.position.set(v.x, baseY, v.z);
  }

  smoothY(p: RT, target: number): number {
    const cur = this.y3.get(p);
    const y = cur === undefined ? target : cur + (target - cur) * 0.3;
    this.y3.set(p, y);
    return y;
  }

  // ---------------- the gadget: one rigid, two-faced body you can turn any way ----------------

  /** Free orientation of the gadget (trackball), identity = front up, as it came out of the box. */
  orient = new THREE.Quaternion();
  /** Height of the front stack above the base bottom, and of the back stack below it. */
  fTop = 0;
  bTop = 0;

  /** Back-side parts of a two-faced gadget hang under the base, turned over. */
  mirrored(p: RT): boolean {
    return this.b.L.device.hasBack && p.def.side === 'B';
  }

  /** Lay out the stacks: front parts on top of the base, back parts under it. */
  layoutStacks(): void {
    const two = this.b.L.device.hasBack;
    let f = 0, bk = 0;
    for (const p of this.b.parts) {
      const st = this.stack(p);
      if (this.mirrored(p)) bk = Math.max(bk, st.top);
      else f = Math.max(f, st.top);
      if (two && p.def.z === 0) bk = Math.max(bk, st.thick);
      if (!two && p.def.z === 0) bk = Math.max(bk, bellyOf(p.def.round, st.thick));
    }
    this.fTop = f;
    this.bTop = bk;
    this.devTop = f;
  }

  /** Turn by a finger drag (screen pixels): sideways spins about the screen's vertical, up/down rolls it over. */
  turn(dx: number, dy: number): void {
    const k = 0.011;
    qa.setFromAxisAngle(SCREEN_UP, dx * k);
    qb.setFromAxisAngle(X, dy * k);
    this.orient.premultiply(qb).premultiply(qa).normalize();
  }

  /** Double-tap: roll it over onto its other face. */
  flip(done?: () => void): void {
    const from = this.orient.clone();
    // roll about the gadget's own long axis as it lies now (its local z)
    const to = from.clone().multiply(qc.setFromAxisAngle(Z, Math.PI));
    animate(0.45, (k) => { this.orient.slerpQuaternions(from, to, k); }, ease.inOutSine, done, 'pose');
  }

  /** Ease back to front-up, squared to the mat. */
  resetPose(dur: number): void {
    const from = this.orient.clone();
    const to = new THREE.Quaternion();
    animate(dur, (k) => { this.orient.slerpQuaternions(from, to, k); }, ease.inOutCubic, undefined, 'pose');
  }

  /** Heading on the mat (radians, screen-clockwise negative) of the given face's x axis. */
  heading(view: 'F' | 'B' = this.b.viewSide): number {
    v.set(view === 'B' ? -1 : 1, 0, 0).applyQuaternion(this.orient);
    return Math.atan2(-v.z, v.x);
  }

  /**
   * Pose the assembled gadget and decide which face the player is looking at.
   * The pivot is the middle of the whole body, kept high enough that no
   * corner sinks into the mat.
   */
  syncDevice(): void {
    if (!this.ok) return;
    const b = this.b;
    const { W, H, dpr } = view;
    resizeStage(W, H, dpr);
    const appear = Math.max(0.001, b.phase === 'box' ? b.devAppear : 1);
    const d = b.L.device;
    let s = b.k * appear;
    if (b.phase === 'box' || b.phase === 'pack') {
      // inside: footprint within the walls, top below the peanuts; out over the rim: full size
      const B = this.box;
      const fit = Math.min(1, ((B.W - 16) * 1.05) / d.w, ((B.D - 16) * 1.05) / d.h, (B.Hh * 1.05 * 0.8) / (this.fTop + this.bTop));
      const u = Math.min(1, b.devLift * 1.6);
      s *= fit + (1 - fit) * u * u * (3 - 2 * u);
    }
    // which face points at the camera?
    if (d.hasBack) {
      v.set(0, 1, 0).applyQuaternion(this.orient);
      const side = v.dot(TO_CAMERA) >= 0 ? 'F' : 'B';
      if (side !== b.viewSide) b.viewSide = side;
    }
    const half = (this.fTop + this.bTop) / 2;
    this.devInner.position.set(0, -(this.fTop - this.bTop) / 2, 0);
    qa.setFromAxisAngle(X, Math.sin(b.devLift * Math.PI) * 0.06);
    this.devRoot.quaternion.copy(qa).multiply(this.orient);
    this.devRoot.scale.setScalar(s);
    // lowest corner of the turned body → keep it on the mat
    m4.makeRotationFromQuaternion(this.devRoot.quaternion);
    const e = m4.elements;
    const ext = Math.abs(e[1]) * d.w / 2 + Math.abs(e[5]) * half + Math.abs(e[9]) * d.h / 2;
    const lift = b.devLift * (this.box.Hh * b.k * 1.05 + 14 * view.U);
    const cc = b.center;
    toWorld(cc.x, cc.y, (ext + half) * s, v);
    this.devRoot.position.set(v.x, ext * s + lift, v.z);
    this.devRoot.updateMatrixWorld(true);
  }

  /** The middle of a part's outer face, in device-inner coordinates. */
  localTop(p: RT, out: THREE.Vector3): THREE.Vector3 {
    const st = this.stack(p);
    const backOfBase = this.b.L.device.hasBack && p.def.z === 0 && this.b.viewSide === 'B';
    if (this.mirrored(p) || backOfBase) return out.set(-p.def.x, -st.top, p.def.y);
    return out.set(p.def.x, st.top, p.def.y);
  }

  /** Screen point over the middle of a part's outer face, as the gadget is posed now. */
  homeScreen(p: RT): { x: number; y: number } {
    this.devInner.localToWorld(this.localTop(p, v));
    return toScreen(v);
  }

  /** World height of a part's outer face (for the screwdriver tip). */
  topWorldY(p: RT): number {
    return this.devInner.localToWorld(this.localTop(p, v)).y;
  }

/** The removed part under a screen point, by a 3D ray: the nearest hit is the one on top. */
  pickTray(x: number, y: number, cands: RT[]): RT | null {
    const objs = cands.map((p) => this.models.get(p)!.group).filter((g) => g.parent);
    for (const h of rayAt(x, y).intersectObjects(objs, true)) {
      let o: THREE.Object3D | null = h.object;
      while (o && !this.owner.has(o)) o = o.parent;
      if (o && cands.includes(this.owner.get(o)!)) return this.owner.get(o)!;
    }
    return null;
  }

  /** The part under a screen point: screws by distance, the rest by a real 3D ray. */
  pick(x: number, y: number, cands: RT[]): RT | null {
    const objs: THREE.Object3D[] = [];
    for (const p of cands) if (p.def.kind !== 'screw') objs.push(this.models.get(p)!.group);
    const hits = rayAt(x, y).intersectObjects(objs, true);
    let part: RT | null = null;
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !this.owner.has(o)) o = o.parent;
      if (o) { part = this.owner.get(o)!; break; }
    }
    // a screw wins if it is not buried under the part that was hit
    let screw: RT | null = null;
    const R = (SCREW_R + 6) * this.b.k;
    for (const p of cands) {
      if (p.def.kind !== 'screw' || (part && part.def.z > p.def.z)) continue;
      const h = this.homeScreen(p);
      if (Math.hypot(h.x - x, h.y - y) < R && (!screw || p.def.z > screw.def.z)) screw = p;
    }
    return screw ?? part;
  }

  partInDevice(p: RT): PartModel {
    const b = this.b;
    const m = this.models.get(p)!;
    const st = this.stack(p);
    if (m.group.parent !== this.devInner) this.devInner.add(m.group);
    m.group.visible = true;
    m.group.scale.setScalar(1 + p.pop * 0.06);
    const wig = Math.sin(b.time * 50) * p.wig * 0.06;
    if (this.mirrored(p)) {
      // turned over under the base: its own top faces the back
      m.group.position.set(-p.def.x, -st.elev, p.def.y);
      m.group.rotation.set(0, -wig, Math.PI);
    } else {
      m.group.position.set(p.def.x, st.elev, p.def.y);
      m.group.rotation.set(0, wig, 0);
    }
    this.paint(p, m, true);
    // the cord would poke through the box walls
    if (m.cordIn && (b.phase === 'box' || b.phase === 'pack')) m.cordIn.visible = false;
    return m;
  }

  partFree(p: RT, lift: number): PartModel {
    const m = this.models.get(p)!;
    const st = this.stack(p);
    const fromDevice = p.state === 'in';
    const fx = Math.max(-1, Math.min(1, p.flipX));
    // a two-faced base turned over rests on its front body: lift it by that body's height
    const over = m.dual && !fromDevice ? st.thick * p.sc * (1 - fx) / 2 : 0;
    const y = this.smoothY(p, (fromDevice ? st.elev * p.sc : 0) + lift * 46 + over);
    m.group.scale.setScalar(p.sc * (1 + p.pop * 0.1));
    this.place(m.group, p.x, p.y, y, st.thick * p.sc);
    // carried parts swing with the drag: the leading side dips
    const t = this.tilt.get(p) ?? { x: p.x, y: p.y, rx: 0, rz: 0 };
    const vx = p.x - t.x, vy = p.y - t.y;
    t.x = p.x; t.y = p.y;
    t.rz += (Math.max(-0.45, Math.min(0.45, -vx * 0.025)) - t.rz) * 0.2;
    t.rx += (Math.max(-0.45, Math.min(0.45, vy * 0.025)) - t.rx) * 0.2;
    this.tilt.set(p, t);
    const sway = Math.min(1, lift);
    m.group.rotation.set(t.rx * sway, -p.rot + Math.sin(this.b.time * 50) * p.wig * 0.06, Math.acos(fx) + t.rz * sway);
    this.paint(p, m, fromDevice && this.b.drag.rt !== p);
    return m;
  }

  partTray(p: RT): PartModel {
    const b = this.b;
    const m = this.models.get(p)!;
    const st = this.stack(p);
    const s = b.trayPos(p);
    const sc = b.traySc(p);
    // what was put down later lies on top where the pile overlaps
    const rank = b.parts.filter((q) => q.state === 'out' && q !== p && q.tz < p.tz).length;
    const y = this.smoothY(p, rank * 1.6 * view.U);
    // landing: a quick squash and spring back
    const sq = Math.sin(p.pop * Math.PI) * 0.12;
    m.group.scale.set(sc * (1 + sq), sc * (1 - sq * 1.4), sc * (1 + sq));
    this.place(m.group, s.x, s.y, y, st.thick * sc);
    m.group.rotation.set(0, -s.rot + Math.sin(b.time * 50) * p.wig * 0.06, 0);
    this.paint(p, m, false);
    return m;
  }

  paint(p: RT, m: PartModel, inDevice: boolean): void {
    const b = this.b;
    const ds = b.ds(p, inDevice);
    // a base turned over for cleaning shows its real back face
    m.showBack = !inDevice && m.dual && p.flipX < 0.99;
    if (m.showBack) m.paint({ ...ds, view: 'B', inDevice: true }, `B|out|${ds.broken}|${p.fixed}|${p.dirtVer}|${p.side}`, (c) => b.overlays(c, p, 1));
    if (inDevice && b.L.device.hasBack) {
      // every face is real geometry: paint each part as its own side, both faces of the base
      if (m.dual) {
        const dsB = { ...ds, view: 'B' as const };
        const animB = b.power > 0 ? Math.floor(b.time * 12) : 0;
        m.paint(dsB, `B|${ds.broken}|${p.fixed}|${p.dirtVer}|${p.side}|${p.seen}|${p.state}|${animB}`, (c) => b.overlays(c, p, 1));
      }
      ds.view = p.def.side === 'B' ? 'B' : 'F';
    }
    const animBucket = b.power > 0 ? Math.floor(b.time * 12) : 0;
    const key = `${ds.view}|${inDevice}|${ds.broken}|${p.fixed}|${p.dirtVer}|${p.side}|${p.seen}|${p.state}|${animBucket}`;
    m.paint(ds, key, (c) => b.overlays(c, p, 0));
  }

  // ---------------- the desk ----------------

  /** Wood desk, cutting mat and the props around it, laid out from screen anchors. */
  layoutDesk(): void {
    const { W, H, U, top } = view;
    const tier = tierOf('workbench');
    const key = `${W}x${H}:${top}:${tier}`;
    if (key === this.deskKey) return;
    this.deskKey = key;
    for (const ch of [...this.desk.children]) disposeObject(ch);
    const g = this.desk;
    const S = Math.max(W, H);
    const tex = woodTexture(512, 512, 6, WOOD_COLORS[tier]);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set((S * 4) / (140 * U), (S * 4) / (140 * U));
    const wood = new THREE.Mesh(new THREE.PlaneGeometry(S * 4, S * 4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
    wood.rotation.x = -Math.PI / 2;
    wood.position.y = -3;
    wood.receiveShadow = true;
    g.add(wood);
    // the mat: its far edge under screen row `my`, running past the bottom of the screen
    const my = top + 58 * U;
    const far = toWorld(18 * U, my, 0, new THREE.Vector3());
    const near = toWorld(W / 2, H + 40 * U, 0, new THREE.Vector3());
    const mw = Math.abs(far.x) * 2, md = near.z - far.z;
    const mat = makeMat(mw, md, 32 * U, MAT_COLORS[tier]);
    mat.position.set(0, mat.position.y, far.z + md / 2);
    g.add(mat);
    const put = (o: THREE.Object3D, sx: number, sy: number, sc: number, ry = 0) => {
      toWorld(sx, sy, 0, v);
      o.position.set(v.x, 0, v.z);
      o.scale.setScalar(sc);
      o.rotation.y = ry;
      g.add(o);
    };
    put(makePenCup(), 30 * U, my + 100 * U, U * 1.25, 0.6);
    put(makeFrame(), W / 2 - 40 * U, top + 40 * U, U * 1.1, -0.15);
    put(makeLamp(LAMP_COLORS[tier]), W - 26 * U, my + 78 * U, U * 1.3, -0.55);
    put(makeMug(), W - 36 * U, H - 58 * U, U * 1.2, 2.2);
  }

  // ---------------- passes ----------------

  /** Everything resting on the mat: dish, driver, box, device, tray. */
  renderBack(c: CanvasRenderingContext2D): void {
    if (!this.ok) return;
    const b = this.b;
    const { W, H, U, dpr } = view;
    resizeStage(W, H, dpr);
    this.layoutDesk();
    const objs: THREE.Object3D[] = [this.desk];

    // dish + its screws
    const dp = b.dishPos();
    this.dish.scale.setScalar(U);
    this.place(this.dish, dp.x, dp.y, 0, 8 * U);
    objs.push(this.dish);
    const r = rng(77);
    for (let i = 0; i < Math.min(this.dishScrews.length, b.dishScrews); i++) {
      const s = this.dishScrews[i];
      const a = r() * Math.PI * 2, d = r() * 15;
      s.scale.setScalar(U * 0.75);
      s.rotation.set(r() * 0.5 - 0.25, r() * 6, r() * 0.5 - 0.25);
      this.place(s, dp.x + Math.cos(a) * d * U, dp.y + Math.sin(a) * d * U, 4 * U, 3 * U);
      objs.push(s);
    }

    // the box
    if (b.phase === 'box' || b.phase === 'pack') {
      const cc = b.center;
      const sc = b.k * 1.05 * (b.phase === 'box' ? b.boxScale : 1);
      this.box.group.scale.setScalar(sc);
      this.box.setOpen(b.boxOpen);
      this.place(this.box.group, cc.x, cc.y + b.boxY, 0, this.box.Hh * sc);
      objs.push(this.box.group);
    }

    // the gadget
    const showDev = (b.phase !== 'box' || b.devAppear > 0) && !(b.phase === 'pack' && b.devAppear === 0);
    if (showDev) {
      this.syncDevice();
      for (const ch of this.devInner.children) ch.visible = false;
      for (const p of b.parts) {
        // both faces are real: whatever is turned away is simply behind the body
        if (p.state !== 'in' || p.anim) continue;
        this.partInDevice(p);
      }
      objs.push(this.devRoot);
    }
    // tray
    for (const p of b.parts) {
      if (p.state === 'out' && !p.anim && p.def.kind !== 'screw' && p !== b.focus) objs.push(this.partTray(p).group);
    }
    // screwdriver
    if (!b.focus && ['apart', 'rebuild', 'repair', 'clean'].includes(b.phase)) objs.push(this.placeDriver());
    renderPass(c, objs, W, H, { ground: false });
  }

  /** Things in the hand / in focus, drawn above the dimmer and overlays. */
  renderFront(c: CanvasRenderingContext2D): void {
    if (!this.ok) return;
    const b = this.b;
    const { W, H, U } = view;
    const objs: THREE.Object3D[] = [];
    for (const p of b.parts) if (p.anim && p !== b.focus && p.def.kind !== 'screw') objs.push(this.partFree(p, p.lift).group);
    for (const p of b.parts) if (p.anim && p.def.kind === 'screw') objs.push(this.partFree(p, p.lift).group);
    b.flying.forEach((f, i) => {
      const s = this.flyScrews[i % this.flyScrews.length];
      s.scale.setScalar(b.k * f.sc);
      s.rotation.set(b.time * 6, b.time * 4, 0);
      this.place(s, f.x, f.y, 24 * U, 3 * U);
      objs.push(s);
    });
    if (b.focus) {
      const p = b.focus;
      if (b.phase === 'clean') objs.push(this.placePad(p));
      const m = this.partFree(p, p.lift);
      objs.push(m.group);
      if (b.phase === 'clean' && p.dirt) {
        const tool = (p.def.tool ?? 'brush') === 'brush' ? this.brush : this.sponge;
        const tp = b.toolPos;
        const s = U * 1.15;
        const top = tp.rest ? 0 : (this.y3.get(p) ?? 0) + this.stack(p).thick * p.sc + 2;
        tool.scale.setScalar(s);
        tool.rotation.set(0, tp.rest ? 0 : 0.15 + Math.sin(tp.scrub * 30) * 0.08 * Math.min(1, tp.scrub), 0);
        this.place(tool, tp.x, tp.y, top, 22 * s);
        objs.push(tool);
      }
    }
    renderPass(c, objs, W, H, { shadows: false });
  }

  /** The cleaning pad under the part being scrubbed, sized to it once it has arrived. */
  placePad(p: RT): THREE.Group {
    const b = this.b;
    const { U } = view;
    const sc = b.focusSc(p);
    const key = `${p.def.id}:${sc}`;
    if (!this.pad || this.padKey !== key) {
      if (this.pad) disposeObject(this.pad);
      this.pad = makeCleanPad(p.def.w * sc + 44 * U, p.def.h * sc + 44 * U, U);
      this.padKey = key;
    }
    const f = b.focusPos();
    toWorld(f.x, f.y, 0, v);
    this.pad.position.set(v.x, 0, v.z);
    return this.pad;
  }
  pad: THREE.Group | null = null;
  padKey = '';
  /** Height of the carried screwdriver's tip, eased frame to frame. */
  heldTip = 0;

  placeDriver(): THREE.Group {
    const b = this.b;
    const d = b.driver;
    const g = this.driver;
    const s = view.U * 1.05;
    g.scale.setScalar(s);
    // where is the tip resting? on the screw it works on, else on the mat / above the gadget
    let tipY = 3 * s;
    if (d.stand > 0.02 || d.busy) {
      let best: RT | null = null, bd = 1e9;
      for (const p of b.parts) {
        if (p.def.kind !== 'screw') continue;
        const h = b.home(p);
        const dd = Math.hypot(h.x - d.x, h.y - d.y);
        if (dd < bd) { bd = dd; best = p; }
      }
      if (best) tipY = this.topWorldY(best);
    } else if (d.held) {
      // carried over the gadget it hovers just above its highest point, so it never
      // dips into the body; over the mat it comes down. Eased, so it glides between.
      const over = rayAt(d.x, d.y).intersectObject(this.devRoot, true).length > 0;
      const want = over ? box3.setFromObject(this.devRoot).max.y + 6 * s : 3 * s;
      this.heldTip += (want - this.heldTip) * 0.3;
      tipY = this.heldTip;
    }
    if (!d.held && d.stand <= 0.02 && !d.busy) this.heldTip = tipY;
    const dir = new THREE.Vector3(Math.cos(d.ang), 0.08, Math.sin(d.ang)).normalize();
    dir.lerp(UP, d.stand).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(X, dir);
    const tw = new THREE.Quaternion().setFromAxisAngle(dir, d.twist);
    g.quaternion.copy(tw.multiply(q));
    toWorld(d.x, d.y, tipY, v);
    g.position.set(v.x, tipY, v.z);
    return g;
  }

  dispose(): void {
    if (!this.ok) return;
    for (const m of this.models.values()) { disposeObject(m.group); m.dispose(); }
    if (this.pad) disposeObject(this.pad);
    for (const o of [this.desk, this.driver, this.dish, this.box.group, this.brush, this.sponge, ...this.dishScrews, ...this.flyScrews]) disposeObject(o);
    this.models.clear();
  }
}
