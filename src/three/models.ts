// 3D models. Parts are extruded from their real outlines with bevelled edges;
// the face is a live canvas texture painted by the part's own draw function
// (so PCB traces, labels and dirt stay), plus raised details as real geometry.

import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { THREE } from './stage';
import { outlineOf, shapeFrom, paintMode, screwHead, rng, type Pts } from '../core/draw';
import type { PartDef, DrawState, DeviceDef, Bump } from '../content/device';
import { SCREW_R } from '../content/device';
import { buildVolume, surfaceOf, type Surface } from './volume';

const MATS: Record<string, { rough: number; metal: number }> = {
  plastic: { rough: 0.3, metal: 0.0 },
  metal: { rough: 0.32, metal: 0.65 },
  rubber: { rough: 0.85, metal: 0.0 },
  glass: { rough: 0.08, metal: 0.1 },
  pcb: { rough: 0.6, metal: 0.05 },
};

export function std(color: THREE.ColorRepresentation, kind = 'plastic', extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  const m = MATS[kind] ?? MATS.plastic;
  return new THREE.MeshStandardMaterial({ color, roughness: m.rough, metalness: m.metal, ...extra });
}

export function shadowed<T extends THREE.Object3D>(o: T): T {
  o.traverse((n) => { if ((n as THREE.Mesh).isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  return o;
}

// ---------------- layout: thickness + stacking height ----------------

export interface Stack { elev: number; thick: number; top: number }

function bbox(def: PartDef) {
  const o = outlineOf(def.shape);
  if (!o) return { x0: -def.w / 2, x1: def.w / 2, y0: -def.h / 2, y1: def.h / 2 };
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of o.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, x1, y0, y1 };
}

/** Thickness + the height each part rests at when the gadget is assembled. */
export function computeStacks(dev: DeviceDef): Map<string, Stack> {
  const out = new Map<string, Stack>();
  const base = dev.parts.find((p) => p.z === 0)!;
  const baseB = bbox(base);
  const baseArea = (baseB.x1 - baseB.x0) * (baseB.y1 - baseB.y0);
  const area = (d: PartDef) => { const b = bbox(d); return (b.x1 - b.x0) * (b.y1 - b.y0); };
  const sorted = [...dev.parts].sort((a, b) => a.z - b.z);
  for (const p of sorted) {
    const big = area(p) >= baseArea * 0.5;
    const thick = p.thick ?? (p.z === 0 ? 18 : p.kind === 'screw' ? 3 : big ? 10 : 8);
    let elev = p.elev ?? 0;
    if (p.elev === undefined && p.z > 0) {
      for (const q of sorted) {
        if (q.z >= p.z || q === p) continue;
        if (!(q.side === 'A' || p.side === 'A' || q.side === p.side)) continue;
        const b = bbox(q);
        if (p.x < q.x + b.x0 || p.x > q.x + b.x1 || p.y < q.y + b.y0 || p.y > q.y + b.y1) continue;
        const s = out.get(q.id)!;
        let top: number;
        if (q.z === 0 && !big && p.kind !== 'screw') top = s.top - (q.cavity ?? 10); // inside the tub, on its floor
        else if (big && p.kind !== 'screw') top = s.top;
        else {
          // small things rest on the curved surface right under them
          const h = q.kind === 'screw' ? s.thick : surfaceOf(q, s.thick, b).heightAt(p.x - q.x, p.y - q.y);
          if (h <= 0) continue;
          top = s.elev + h;
        }
        elev = Math.max(elev, top);
      }
    }
    out.set(p.id, { elev, thick, top: elev + thick });
  }
  return out;
}

// ---------------- parts ----------------

export class PartModel {
  group = new THREE.Group();
  def: PartDef;
  thick: number;
  canvas = document.createElement('canvas');
  tex: THREE.CanvasTexture;
  cap: THREE.MeshStandardMaterial;
  side: THREE.MeshStandardMaterial;
  key = '';
  res = 3;
  bb: { x0: number; x1: number; y0: number; y1: number };
  bumps: { mesh: THREE.Object3D; view?: 'F' | 'B' }[] = [];
  cordIn?: THREE.Mesh;
  cordOut?: THREE.Mesh;
  sampled = false;
  surface?: Surface;
  /** Two-faced base shell: a second body hangs mirrored underneath, painted with the back view. */
  dual = false;
  bellyMesh?: THREE.Mesh;
  back?: { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; cap: THREE.MeshStandardMaterial; mesh: THREE.Mesh; key: string; bb: { x0: number; x1: number; y0: number; y1: number } };

  /** Rounded underside of a one-faced gadget's base (its height), so it is round all over. */
  belly = 0;

  constructor(def: PartDef, thick: number, dual = false, belly = 0) {
    this.dual = dual;
    this.belly = belly;
    this.def = def;
    this.thick = thick;
    this.bb = bbox(def);
    const w = this.bb.x1 - this.bb.x0, h = this.bb.y1 - this.bb.y0;
    this.res = Math.min(3.2, 640 / Math.max(w, h));
    this.canvas.width = Math.max(8, Math.ceil(w * this.res));
    this.canvas.height = Math.max(8, Math.ceil(h * this.res));
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    const kind = def.mat ?? 'plastic';
    this.cap = std(0xffffff, kind, { map: this.tex, metalness: kind === 'metal' ? 0.35 : MATS[kind]?.metal ?? 0 });
    this.side = std(def.body ?? 0x888888, kind, { side: THREE.DoubleSide });
    if (def.kind === 'screw') this.buildScrew();
    else {
      // a real volume: rounded / domed top over the outline, hollow tub for base shells
      const { geo, surface } = buildVolume(def, thick, this.bb);
      this.surface = surface;
      this.group.add(new THREE.Mesh(geo, [this.cap, this.side]));
      if (dual) {
        const canvas = document.createElement('canvas');
        canvas.width = this.canvas.width; canvas.height = this.canvas.height;
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        const cap = std(0xffffff, kind, { map: tex });
        // the back body: the outline mirrored (as the back view sees it), then turned over about the
        // device's long axis, so it lies exactly under the front one even for lopsided outlines
        const o = outlineOf(def.shape);
        const flip = (pts: Pts): Pts => pts.map(([x, y]) => [-x, y] as [number, number]).reverse();
        const mirDef: PartDef = o ? { ...def, shape: shapeFrom(flip(o.pts), (o.holes ?? []).map(flip)), bumps: undefined } : def;
        const mbb = { x0: -this.bb.x1, x1: -this.bb.x0, y0: this.bb.y0, y1: this.bb.y1 };
        const mesh = new THREE.Mesh(o ? buildVolume(mirDef, thick, mbb).geo : geo, [cap, this.side]);
        mesh.rotation.z = Math.PI;
        this.group.add(mesh);
        this.back = { canvas, tex, cap, mesh, key: '', bb: mbb };
      }
      if (belly > 0) {
        // the outside of the shell, mirrored under it: a solid rounded body in the shell's colour
        const { geo: bg } = buildVolume({ ...def, cavity: undefined, bumps: undefined }, belly, this.bb);
        const mesh = new THREE.Mesh(bg, [this.side, this.side]);
        mesh.scale.y = -1;
        this.group.add(mesh);
        this.bellyMesh = mesh;
      }
    }
    for (const b of def.bumps ?? []) {
      const m = bumpMesh(b);
      const top = this.surface ? this.surface.heightAt(b.x, b.y) : thick;
      const y = (top || thick) + b.height / 2 - 0.6;
      if (dual && b.view === 'B') { m.position.set(-b.x, -y, b.y); m.rotation.z = Math.PI; }
      else m.position.set(b.x, y, b.y);
      this.group.add(m);
      this.bumps.push({ mesh: m, view: b.view });
    }
    if (def.id === 'cord') this.buildCord();
    shadowed(this.group);
  }

  buildScrew(): void {
    // replace the slab with a proper domed screw head
    this.group.clear();
    const head = new THREE.CylinderGeometry(SCREW_R, SCREW_R * 1.05, 3.2, 28);
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const c = cv.getContext('2d')!;
    c.translate(32, 32);
    c.scale(64 / (SCREW_R * 2.2), 64 / (SCREW_R * 2.2));
    screwHead(c, 0, 0, SCREW_R, 0.6, '#d5d8de');
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    const side = std(0xb7bcc4, 'metal');
    const top = std(0xffffff, 'metal', { map: t, metalness: 0.5, roughness: 0.3 });
    const m = new THREE.Mesh(head, [side, top, side]);
    m.position.y = 1.6;
    this.group.add(m);
    this.tex.dispose();
  }

  buildCord(): void {
    const mat = std(0xe8dcc4, 'rubber');
    const inPts = [[0, 14], [0, 40], [20, 64], [60, 74], [100, 64], [130, 46], [140, 24]].map(([x, z]) => new THREE.Vector3(x, 4, z));
    this.cordIn = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(inPts), 48, 4, 10), mat);
    const coil: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * Math.PI * 4;
      coil.push(new THREE.Vector3(4 + Math.cos(a) * (24 - i * 0.12), 4 + i * 0.05, 14 + Math.sin(a) * (16 - i * 0.08)));
    }
    this.cordOut = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 120, 3.6, 10), mat);
    this.group.add(this.cordIn, this.cordOut);
  }

  /** Repaint the face when anything that shows on it changed. */
  paint(state: DrawState, key: string, overlays: (c: CanvasRenderingContext2D) => void): void {
    if (this.dual) {
      // both faces are real geometry: the back body only exists while assembled
      if (this.back) this.back.mesh.visible = state.inDevice;
      for (const b of this.bumps) b.mesh.visible = b.view !== 'B' || state.inDevice;
    } else for (const b of this.bumps) b.mesh.visible = !b.view || b.view === state.view || !state.inDevice && b.view === 'F';
    if (this.cordIn && this.cordOut) { this.cordIn.visible = state.inDevice; this.cordOut.visible = !state.inDevice; }
    if (this.bellyMesh) this.bellyMesh.visible = state.inDevice;
    if (this.def.kind === 'screw') return;
    const onBack = this.dual && this.back && state.inDevice && state.view === 'B';
    if (onBack) { if (key === this.back!.key) return; this.back!.key = key; }
    else { if (key === this.key) return; this.key = key; }
    const canvas = onBack ? this.back!.canvas : this.canvas;
    const c = canvas.getContext('2d')!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = typeof this.side.color === 'object' ? `#${this.side.color.getHexString()}` : '#888';
    c.fillRect(0, 0, canvas.width, canvas.height);
    const bb = onBack ? this.back!.bb : this.bb;
    c.setTransform(this.res, 0, 0, this.res, -bb.x0 * this.res, -bb.y0 * this.res);
    paintMode.flat = true;
    try {
      this.def.draw(c, state);
      overlays(c);
    } finally {
      paintMode.flat = false;
    }
    if (onBack) { this.back!.tex.needsUpdate = true; return; }
    if (!this.sampled && !this.def.body) {
      // side walls take the face's own colour, a touch darker
      this.sampled = true;
      const d = c.getImageData(Math.floor(this.canvas.width / 2), Math.floor(this.canvas.height * 0.2), 1, 1).data;
      this.side.color.setRGB(d[0] / 255 * 0.78, d[1] / 255 * 0.78, d[2] / 255 * 0.78, THREE.SRGBColorSpace);
      this.key = '';
      this.paint(state, key, overlays);
      return;
    }
    this.tex.needsUpdate = true;
  }

  dispose(): void {
    this.tex.dispose();
    this.back?.tex.dispose();
  }
}

function bumpMesh(b: Bump): THREE.Object3D {
  const mat = std(b.color, b.metal ? 'metal' : 'plastic', b.metal ? { metalness: 0.6, roughness: 0.28 } : {});
  if (b.kind === 'cyl') {
    const g = new THREE.CylinderGeometry(b.w / 2, b.w / 2 * 1.04, b.height, 28);
    return new THREE.Mesh(g, mat);
  }
  if (b.kind === 'box') {
    const h = b.h ?? b.w;
    return new THREE.Mesh(new RoundedBoxGeometry(b.w, b.height, h, 3, Math.min(b.height, h, b.w) * 0.3), mat);
  }
  const g = new THREE.Group();
  const arm = b.w * 0.34;
  g.add(new THREE.Mesh(new RoundedBoxGeometry(b.w, b.height, arm, 3, arm * 0.25), mat));
  g.add(new THREE.Mesh(new RoundedBoxGeometry(arm, b.height, b.w, 3, arm * 0.25), mat));
  return g;
}

// ---------------- tools & props ----------------

/** Screwdriver along +X from the tip at the origin. */
export function makeScrewdriver(): THREE.Group {
  const g = new THREE.Group();
  const steel = std(0xd9dde3, 'metal', { roughness: 0.22, metalness: 0.85 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 54, 16), steel);
  shaft.rotation.z = -Math.PI / 2;
  shaft.position.x = 29;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(2.4, 6, 4), steel);
  tip.rotation.z = Math.PI / 2;
  tip.position.x = 1;
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 10, 20), std(0x22242a, 'rubber'));
  ferrule.rotation.z = -Math.PI / 2;
  ferrule.position.x = 60;
  const prof: THREE.Vector2[] = [];
  const L = 66;
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    prof.push(new THREE.Vector2(7 + Math.sin(t * Math.PI) * 3.5 + (t > 0.9 ? -(t - 0.9) * 30 : 0), t * L));
  }
  const handle = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), std(0xffc62e, 'plastic', { roughness: 0.35 }));
  handle.rotation.z = -Math.PI / 2;
  handle.position.x = 64;
  g.add(shaft, tip, ferrule, handle);
  for (const [x, w] of [[74, 11], [108, 9]]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(10.4, 10.4, w, 24), std(0x1e1f24, 'rubber'));
    band.rotation.z = -Math.PI / 2;
    band.position.x = x + w / 2;
    g.add(band);
  }
  return shadowed(g);
}

export function makeDish(): THREE.Group {
  const g = new THREE.Group();
  const prof = [
    new THREE.Vector2(0, 0.5), new THREE.Vector2(20, 0.5), new THREE.Vector2(27, 2), new THREE.Vector2(30, 7),
    new THREE.Vector2(29, 8), new THREE.Vector2(26, 3.5), new THREE.Vector2(20, 2.2), new THREE.Vector2(0, 2.2),
  ];
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), std(0x7d838c, 'metal', { side: THREE.DoubleSide, roughness: 0.35 }));
  g.add(bowl);
  return shadowed(g);
}

export function makeScrewMesh(): THREE.Group {
  const g = new THREE.Group();
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d')!;
  c.translate(32, 32);
  c.scale(64 / (SCREW_R * 2.2), 64 / (SCREW_R * 2.2));
  screwHead(c, 0, 0, SCREW_R, 0.6, '#d9a0c8');
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  const side = std(0xc9a0bc, 'metal');
  const head = new THREE.Mesh(new THREE.CylinderGeometry(SCREW_R, SCREW_R, 3, 20), [side, std(0xffffff, 'metal', { map: t, metalness: 0.4 }), side]);
  head.position.y = 1.5;
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 1.6, 12, 10), side);
  thread.position.y = -6;
  g.add(head, thread);
  return shadowed(g);
}

/** Cardboard box with four hinged flaps; call setOpen(0..1). */
export class BoxModel {
  group = new THREE.Group();
  flaps: { pivot: THREE.Group; axis: 'x' | 'z'; sign: number }[] = [];
  peanuts = new THREE.Group();
  W = 190; D = 160; Hh = 64;

  constructor() {
    const card = std(0xd2a06a, 'rubber', { roughness: 0.9 });
    const inner = std(0xa8743f, 'rubber', { roughness: 0.95 });
    const { W, D, Hh } = this;
    const t = 3;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W, t, D), inner);
    floor.position.y = t / 2;
    const wall = (w: number, d: number, x: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, Hh, d), [card, card, inner, card, card, card]);
      m.position.set(x, Hh / 2, z);
      return m;
    };
    this.group.add(floor, wall(W, t, 0, -D / 2), wall(W, t, 0, D / 2), wall(t, D, -W / 2, 0), wall(t, D, W / 2, 0));
    // flaps (closed = lying flat over the opening)
    const flapTex = boxTopTexture();
    const flapMat = std(0xffffff, 'rubber', { map: flapTex, roughness: 0.9 });
    const mk = (w: number, d: number, px: number, pz: number, ox: number, oz: number, axis: 'x' | 'z', sign: number, uv: [number, number, number, number]) => {
      const pivot = new THREE.Group();
      pivot.position.set(px, axis === 'z' ? Hh - 2.2 : Hh, pz);
      const geo = new THREE.BoxGeometry(w, 2, d);
      // map the closed-top texture onto the flap's own quarter
      const a = geo.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1]));
      const m = new THREE.Mesh(geo, [card, card, flapMat, inner, card, card]);
      m.position.set(ox, 1, oz);
      pivot.add(m);
      this.group.add(pivot);
      this.flaps.push({ pivot, axis, sign });
    };
    mk(W, D / 2, 0, -D / 2, 0, D / 4, 'x', 1, [0, 0.5, 1, 1]);
    mk(W, D / 2, 0, D / 2, 0, -D / 4, 'x', -1, [0, 0, 1, 0.5]);
    mk(W / 2 - 4, D - 6, -W / 2, 0, W / 4, 0, 'z', 1, [0, 0, 0.5, 1]);
    mk(W / 2 - 4, D - 6, W / 2, 0, -W / 4, 0, 'z', -1, [0.5, 0, 1, 1]);
    // packing peanuts
    const r = rng(5);
    const pm = std(0xf4f6f8, 'plastic', { roughness: 0.7 });
    const sg = new THREE.SphereGeometry(1, 12, 8);
    for (let i = 0; i < 30; i++) {
      const s = new THREE.Mesh(sg, pm);
      s.scale.set(12 + r() * 6, 7 + r() * 4, 9 + r() * 5);
      s.rotation.y = r() * 3;
      s.position.set((r() - 0.5) * (W - 34), Hh - 14 + r() * 8, (r() - 0.5) * (D - 34));
      this.peanuts.add(s);
    }
    this.group.add(this.peanuts);
    shadowed(this.group);
  }

  setOpen(k: number): void {
    // side flaps go first, then the long ones; open = folded out and down
    for (const f of this.flaps) {
      const a = Math.min(Math.PI * 1.15, k * Math.PI * 1.15);
      if (f.axis === 'x') { f.pivot.rotation.x = -f.sign * a; f.pivot.rotation.z = 0; }
      else { f.pivot.rotation.z = f.sign * a; f.pivot.rotation.x = 0; }
    }
    this.peanuts.visible = k > 0.05;
  }
}

function boxTopTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 380; cv.height = 320;
  const c = cv.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, '#ddb07a'); g.addColorStop(1, '#c69458');
  c.fillStyle = g; c.fillRect(0, 0, 380, 320);
  c.fillStyle = 'rgba(245,232,200,0.85)'; c.fillRect(0, 136, 380, 48);
  c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(0, 136, 380, 8);
  c.fillStyle = '#e8665a'; c.fillRect(260, 30, 32, 32);
  c.fillStyle = '#6fa0d8'; c.fillRect(90, 230, 32, 32);
  c.fillStyle = '#f4efe2'; c.fillRect(30, 30, 90, 52);
  c.fillStyle = 'rgba(0,0,0,0.3)';
  for (let i = 0; i < 3; i++) c.fillRect(40, 42 + i * 12, 64, 4);
  for (let i = 0; i < 6; i++) c.fillRect(220 + i * 10, 260, 5, 18);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeBrush(): THREE.Group {
  // wooden block with tufts underneath and a handle sticking out to the right
  const g = new THREE.Group();
  const woodMat = std(0xd9a565, 'plastic', { roughness: 0.6 });
  const block = new THREE.Mesh(new RoundedBoxGeometry(60, 9, 26, 3, 4), woodMat);
  block.position.y = 14;
  const handle = new THREE.Mesh(new RoundedBoxGeometry(46, 8, 13, 3, 4), woodMat);
  handle.position.set(50, 17, 0);
  handle.rotation.z = 0.12;
  const grip = new THREE.Mesh(new RoundedBoxGeometry(24, 8.6, 13.6, 3, 4), std(0x2e8b7a, 'rubber'));
  grip.position.set(60, 18.2, 0);
  grip.rotation.z = 0.12;
  g.add(block, handle, grip);
  const tuft = new THREE.CylinderGeometry(2.6, 2.2, 10, 8);
  const hair = std(0xf2ece0, 'rubber');
  for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) {
    const t = new THREE.Mesh(tuft, hair);
    t.position.set(-24 + i * 6, 5, -7 + j * 7);
    g.add(t);
  }
  return shadowed(g);
}

export function makeSponge(): THREE.Group {
  const g = new THREE.Group();
  const soft = new THREE.Mesh(new RoundedBoxGeometry(58, 14, 40, 3, 5), std(0xf0c94e, 'rubber'));
  soft.position.y = 7;
  const scour = new THREE.Mesh(new RoundedBoxGeometry(58, 6, 40, 3, 2.5), std(0x3e9c4a, 'rubber'));
  scour.position.y = 17;
  g.add(soft, scour);
  return shadowed(g);
}
