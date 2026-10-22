// The "it works!" celebration, in 3D and attached to the gadget itself: the
// gadget's own working overlay painted on a sheet lying on its face, a halo
// behind it, a burst of sparks, sparkles circling it and the gadget's signature
// particles (steam, notes, sparks, flashes). Everything lives in the gadget's
// local space, so turning the gadget turns the celebration with it.

import { THREE } from './stage';
import type { DeviceDef } from '../content/device';

/** How far (device units) the working overlay may paint past the gadget's edge. */
const MARGIN = 170;

type Kind = 'spark' | 'star' | 'steam' | 'note' | 'flash';

interface Bit { s: THREE.Sprite; vel: THREE.Vector3; age: number; life: number; size: number; kind: Kind; g: number; spin: number }

function tex(size: number, paint: (c: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  paint(cv.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glow(c: CanvasRenderingContext2D, s: number, col: string): void {
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, s, s);
}

function starShape(c: CanvasRenderingContext2D, s: number): void {
  const r = s / 2;
  c.translate(r, r);
  c.fillStyle = '#ffffff';
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.18 : r * 0.95;
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}

export class DoneFx {
  root = new THREE.Group();
  private dev: DeviceDef;
  private sheet: THREE.Mesh;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sheetTex: THREE.CanvasTexture;
  private px: number;
  private halo: THREE.Sprite;
  private orbit: THREE.Sprite[] = [];
  private bits: Bit[] = [];
  private tx: Record<Kind, THREE.Texture>;
  private last = -1;
  private spawn = 0;
  private burst = false;

  constructor(dev: DeviceDef) {
    this.dev = dev;
    const w = dev.w + MARGIN * 2, h = dev.h + MARGIN * 2;
    this.px = Math.min(1, 640 / Math.max(w, h));
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(w * this.px);
    this.canvas.height = Math.round(h * this.px);
    this.ctx = this.canvas.getContext('2d')!;
    this.sheetTex = new THREE.CanvasTexture(this.canvas);
    this.sheetTex.colorSpace = THREE.SRGBColorSpace;
    this.sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: this.sheetTex, transparent: true, depthWrite: false, toneMapped: false }),
    );
    // lying on the face: canvas top = the gadget's top edge (device y up the screen)
    this.sheet.rotation.x = -Math.PI / 2;
    this.sheet.renderOrder = 3;
    this.root.add(this.sheet);

    this.tx = {
      spark: tex(32, (c, s) => glow(c, s, 'rgba(255,255,255,1)')),
      star: tex(64, (c, s) => starShape(c, s)),
      steam: tex(64, (c, s) => glow(c, s, 'rgba(255,255,255,0.85)')),
      note: tex(64, (c, s) => {
        c.fillStyle = '#ffffff';
        c.font = `bold ${s * 0.8}px sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('♪', s / 2, s / 2);
      }),
      flash: tex(64, (c, s) => glow(c, s, 'rgba(255,255,240,1)')),
    };
    const haloTex = tex(128, (c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, s * 0.12, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,240,200,0.9)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, s, s);
    });
    // behind the gadget: the body hides its middle, the glow spills round the edges
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.root.add(this.halo);
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Sprite(this.mat('star', '#ffffff'));
      this.orbit.push(s);
      this.root.add(s);
    }
    this.root.visible = false;
  }

  private mat(kind: Kind, color: string): THREE.SpriteMaterial {
    return new THREE.SpriteMaterial({
      map: this.tx[kind], color: new THREE.Color(color), transparent: true, depthWrite: false, toneMapped: false,
      blending: kind === 'note' ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
  }

  private add(kind: Kind, color: string, pos: THREE.Vector3, vel: THREE.Vector3, life: number, size: number, g = 0): void {
    const s = new THREE.Sprite(this.mat(kind, color));
    s.position.copy(pos);
    s.scale.setScalar(size);
    this.root.add(s);
    this.bits.push({ s, vel, age: 0, life, size, kind, g, spin: (Math.random() - 0.5) * 4 });
  }

  /**
   * One frame. `on`: the gadget is switched on (the done step); `power` 0..1 eases
   * it in; `top`: height of the front face in the gadget's inner space.
   */
  update(on: boolean, power: number, time: number, top: number): void {
    const dt = this.last < 0 ? 0 : Math.min(0.05, Math.max(0, time - this.last));
    this.last = time;
    if (!on || power <= 0) {
      this.root.visible = false;
      if (this.burst) this.clear();
      return;
    }
    this.root.visible = true;
    const d = this.dev;
    const R = Math.max(d.w, d.h);

    // the gadget's own working overlay, repainted at most 30 times a second
    if (time - this.painted >= 1 / 30) this.paint(time, power);
    this.sheet.position.set(0, top + 0.8, 0);

    // a soft glow just above the face, small enough to stay clear of the mat
    this.halo.position.set(0, top + R * 0.12, 0);
    this.halo.scale.setScalar(R * (1.15 + 0.05 * Math.sin(time * 2)));
    (this.halo.material as THREE.SpriteMaterial).opacity = 0.3 * power;

    // sparkles circling the gadget
    this.orbit.forEach((s, i) => {
      const a = time * 0.6 + (i / this.orbit.length) * Math.PI * 2;
      const r = R * (0.62 + 0.05 * Math.sin(time * 2 + i));
      s.position.set(Math.cos(a) * r, top * 0.5 + Math.sin(time * 1.5 + i) * 8, Math.sin(a) * r * 0.8);
      s.scale.setScalar((10 + 6 * Math.sin(time * 4 + i)) * power);
      (s.material as THREE.SpriteMaterial).opacity = 0.9 * power;
    });

    // the moment it comes alive: one burst of sparks out of the face
    if (!this.burst) {
      this.burst = true;
      const cols = ['#ffffff', '#ffe28a', '#c8f7ff', '#ffd23f'];
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2, up = 0.4 + Math.random() * 0.9, sp = 140 + Math.random() * 180;
        const vel = new THREE.Vector3(Math.cos(a) * sp, up * sp, Math.sin(a) * sp);
        this.add(i % 3 ? 'spark' : 'star', cols[i % cols.length], new THREE.Vector3(0, top, 0), vel, 0.9 + Math.random() * 0.6, i % 3 ? 9 : 16, -320);
      }
    }

    // its signature: steam from a kettle, notes from a radio...
    const fx = d.workFx;
    if (fx) {
      this.spawn += dt * (fx.kind === 'flash' ? 1.2 : 6);
      while (this.spawn >= 1) {
        this.spawn -= 1;
        const sp = fx.kind === 'note' ? 26 : fx.kind === 'steam' ? 34 : 50;
        const dir = fx.dir + (Math.random() - 0.5) * 0.8;
        const vel = new THREE.Vector3(Math.cos(dir) * sp, 40 + Math.random() * 40, Math.sin(dir) * sp);
        const kind: Kind = fx.kind;
        const size = kind === 'flash' ? 140 : kind === 'note' ? 26 : kind === 'steam' ? 22 : 10;
        this.add(kind, fx.color, new THREE.Vector3(fx.x, top + 4, fx.y), vel, kind === 'flash' ? 0.35 : 1.3, size, kind === 'spark' ? -60 : 0);
      }
    }

    // move, fade, grow
    for (let i = this.bits.length - 1; i >= 0; i--) {
      const b = this.bits[i];
      b.age += dt;
      const k = b.age / b.life;
      if (k >= 1) {
        b.s.removeFromParent();
        (b.s.material as THREE.SpriteMaterial).dispose();
        this.bits.splice(i, 1);
        continue;
      }
      b.vel.y += b.g * dt;
      b.s.position.addScaledVector(b.vel, dt);
      const m = b.s.material as THREE.SpriteMaterial;
      m.opacity = (b.kind === 'flash' ? 1 - k : Math.min(1, (1 - k) * 1.6)) * power;
      m.rotation += b.spin * dt;
      const grow = b.kind === 'steam' ? 1 + k * 1.8 : b.kind === 'note' ? 1 + Math.sin(k * Math.PI) * 0.2 : 1;
      b.s.scale.setScalar(b.size * grow);
    }
  }

  private painted = -1;

  private paint(time: number, power: number): void {
    this.painted = time;
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(this.px, 0, 0, this.px, this.canvas.width / 2, this.canvas.height / 2);
    this.dev.working(c, time, power);
    this.sheetTex.needsUpdate = true;
  }

  clear(): void {
    for (const b of this.bits) { b.s.removeFromParent(); (b.s.material as THREE.SpriteMaterial).dispose(); }
    this.bits = [];
    this.burst = false;
    this.spawn = 0;
  }

  dispose(): void {
    this.clear();
    for (const t of Object.values(this.tx)) t.dispose();
    this.sheetTex.dispose();
    for (const s of this.orbit) (s.material as THREE.SpriteMaterial).dispose();
    const hm = this.halo.material as THREE.SpriteMaterial;
    hm.map?.dispose();
    hm.dispose();
    (this.sheet.material as THREE.MeshBasicMaterial).dispose();
    this.sheet.geometry.dispose();
    this.root.removeFromParent();
  }
}
