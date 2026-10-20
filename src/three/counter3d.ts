// The shop counter in 3D, seen at eye level: a wooden counter top with the
// customer's box, pen cup, plant, photo, service bell and lamp on it.
// One shared instance — the props are the same for every customer.

import { THREE, initStage, resizeStage, setCounterView, renderOnly, disposeObject } from './stage';
import { BoxModel, std } from './models';
import { makeLamp, makePenCup, makeFrame, makeBell, makePlant, woodTexture } from './props';
import { view } from '../core/view';

export interface CounterPose {
  yC: number;
  /** 0 = sitting on the counter, 1 = slid off toward the bench below. */
  boxY: number;
  boxOn: boolean;
  /** Bell bounce 0..1. */
  ding: number;
}

class Counter3D {
  ok: boolean;
  top = new THREE.Group();
  props = new THREE.Group();
  box!: BoxModel;
  bell!: THREE.Group;
  key = '';
  /** The counter is mostly still: its last picture is reused until something on it moves. */
  shot = document.createElement('canvas');
  shotKey = '';

  constructor() {
    this.ok = initStage();
    if (!this.ok) return;
    this.box = new BoxModel();
    this.box.setOpen(0);
  }

  layout(W: number, H: number, U: number): void {
    const key = `${W}x${H}`;
    if (key === this.key) return;
    this.key = key;
    for (const ch of [...this.top.children, ...this.props.children]) disposeObject(ch);

    // counter: top surface at y = 0, front face at z = 0
    const depth = 84 * U, height = 70 * U, len = W * 2.6;
    const topTex = woodTexture(1024, 256, 4, '#9a6a42');
    topTex.wrapS = THREE.RepeatWrapping;
    topTex.repeat.set(len / (300 * U), 1);
    const frontTex = woodTexture(512, 256, 8, '#6a4229', true);
    frontTex.wrapS = THREE.RepeatWrapping;
    frontTex.repeat.set(len / (260 * U), 1);
    const topMat = std(0xffffff, 'plastic', { map: topTex, roughness: 0.4 });
    const frontMat = std(0xffffff, 'plastic', { map: frontTex, roughness: 0.6 });
    const sideMat = std(0x4a2e1c, 'plastic');
    const slab = new THREE.Mesh(new THREE.BoxGeometry(len, height, depth), [sideMat, sideMat, topMat, sideMat, frontMat, sideMat]);
    slab.position.set(0, -height / 2, -depth / 2);
    slab.receiveShadow = true;
    // rounded lip along the front edge
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(3.2 * U, 3.2 * U, len, 12), std(0xb07c4e, 'plastic', { roughness: 0.35 }));
    lip.rotation.z = Math.PI / 2;
    lip.position.set(0, -3.2 * U, 0);
    lip.receiveShadow = true;
    // kick plate shadow line under the top
    const band = new THREE.Mesh(new THREE.BoxGeometry(len, 6 * U, 2), std(0x2a1a10, 'rubber'));
    band.position.set(0, -10 * U, 1);
    this.top.add(slab, lip, band);

    const put = <T extends THREE.Object3D>(o: T, fx: number, z: number, sc: number, ry = 0) => {
      o.position.set(W * fx - W / 2, 0, z * U);
      o.scale.setScalar(sc * U);
      o.rotation.y = ry;
      this.props.add(o);
      return o;
    };
    put(makePlant(), 0.05, -56, 1.05, 0.4);
    put(makePenCup(), 0.13, -22, 0.95, -0.5);
    put(makeFrame(), 0.24, -48, 0.95, 0.28);
    this.bell = put(makeBell(), 0.66, -18, 0.85);
    put(makeLamp(), 0.9, -40, 0.85, 0.15);
  }

  render(c: CanvasRenderingContext2D, pose: CounterPose): void {
    const { W, H, U, dpr } = view;
    const still = `${W}x${H}@${dpr}:${pose.yC}:${pose.boxOn}:${pose.boxY.toFixed(3)}:${pose.ding.toFixed(2)}`;
    if (still === this.shotKey) { c.drawImage(this.shot, 0, 0, W, H); return; }
    resizeStage(W, H, dpr);
    setCounterView(pose.yC);
    this.layout(W, H, U);
    const objs: THREE.Object3D[] = [this.top, this.props];
    this.bell.scale.set(0.85 * U, 0.85 * U * (1 - pose.ding * 0.12), 0.85 * U);
    if (pose.boxOn) {
      // slides toward the viewer, off the front edge and down to the bench
      const k = pose.boxY;
      const g = this.box.group;
      g.scale.set(0.5 * U, 0.82 * U, 0.42 * U);
      g.position.set(W * 0.36 - W / 2, -Math.max(0, k - 0.35) * H * 0.9, (-40 + k * 150) * U);
      g.rotation.set(Math.max(0, k - 0.35) * 0.8, 0.06, 0);
      objs.push(g);
    }
    const cv = renderOnly(objs, { cam: 'counter', ground: false });
    if (!cv) return;
    if (this.shot.width !== cv.width || this.shot.height !== cv.height) { this.shot.width = cv.width; this.shot.height = cv.height; }
    const g = this.shot.getContext('2d')!;
    g.clearRect(0, 0, this.shot.width, this.shot.height);
    g.drawImage(cv, 0, 0);
    this.shotKey = still;
    c.drawImage(this.shot, 0, 0, W, H);
  }
}

let inst: Counter3D | null = null;

/** The shared 3D counter, or null when WebGL is unavailable. */
export function counter3D(): Counter3D | null {
  if (!inst) inst = new Counter3D();
  return inst.ok ? inst : null;
}
