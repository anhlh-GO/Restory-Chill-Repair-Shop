// The collection's showcase: a small separate renderer that builds a repaired
// gadget fully assembled (both faces, rounded underside, screen lit) and
// renders it on a turntable — for shelf thumbnails and the 360° viewer.

import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { THREE } from './stage';
import { PartModel, computeStacks } from './models';
import type { DeviceDef, DrawState } from '../content/device';

let renderer: THREE.WebGLRenderer | null = null;
let failed = false;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
const models = new Map<string, THREE.Group>();

function init(): boolean {
  if (renderer) return true;
  if (failed) return false;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    failed = true;
    return false;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0x5a6690, 0.9));
  const key = new THREE.DirectionalLight(0xfff0dc, 1.6);
  key.position.set(-2, 3, 2.5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.6);
  fill.position.set(2.5, 1, 1.5);
  scene.add(fill);
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  // a little above the front, so the top face and the near side both show
  camera.position.set(0, 2.05, 3.35);
  camera.lookAt(0, 0, 0);
  return true;
}

/** The repaired gadget assembled, centred on the origin and scaled to fit a unit sphere. */
function build(dev: DeviceDef): THREE.Group {
  const hit = models.get(dev.id);
  if (hit) return hit;
  const stacks = computeStacks(dev);
  const inner = new THREE.Group();
  const two = dev.hasBack;
  for (const def of dev.parts) {
    const st = stacks.get(def.id)!;
    const base = def.z === 0;
    const belly = !two && base ? Math.max(st.thick * 0.3, Math.min(st.thick, def.round ?? st.thick * 0.5)) : 0;
    const m = new PartModel(def, st.thick, two && base, belly);
    const state = (view: 'F' | 'B'): DrawState => ({ view, inDevice: true, time: 0, broken: false, power: 1 });
    if (two && base) m.paint(state('B'), 'B', () => { /* clean */ });
    m.paint(state(two && def.side === 'B' ? 'B' : 'F'), 'F', () => { /* clean */ });
    if (two && def.side === 'B') {
      m.group.position.set(-def.x, -st.elev, def.y);
      m.group.rotation.z = Math.PI;
    } else m.group.position.set(def.x, st.elev, def.y);
    inner.add(m.group);
  }
  const box = new THREE.Box3().setFromObject(inner);
  const c = box.getCenter(new THREE.Vector3());
  const r = box.getBoundingSphere(new THREE.Sphere()).radius || 1;
  inner.position.sub(c);
  const g = new THREE.Group();
  g.add(inner);
  g.scale.setScalar(1 / r);
  models.set(dev.id, g);
  return g;
}

/**
 * Render `dev` turned by `orient` into a size×size canvas (device pixels).
 * Returns the renderer's canvas — copy it if you need to keep the picture.
 */
export function renderShowcase(dev: DeviceDef, orient: THREE.Quaternion, size: number): HTMLCanvasElement | null {
  if (!init()) return null;
  const r = renderer!;
  const g = build(dev);
  if (r.domElement.width !== size || r.domElement.height !== size) r.setSize(size, size, false);
  for (const ch of [...scene.children]) if (ch.userData.showcase) scene.remove(ch);
  g.userData.showcase = true;
  g.quaternion.copy(orient);
  scene.add(g);
  r.render(scene, camera);
  return r.domElement;
}

/** A still picture of the gadget, three-quarter turned, for the shelf. */
export function showcaseThumb(dev: DeviceDef, size: number): HTMLCanvasElement | null {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, -0.55, 0));
  const src = renderShowcase(dev, q, size);
  if (!src) return null;
  const out = document.createElement('canvas');
  out.width = out.height = size;
  out.getContext('2d')!.drawImage(src, 0, 0);
  return out;
}

/** Turn a showcase orientation by a finger drag (screen px): sideways spins, up/down rolls it over. */
export function spinShowcase(q: THREE.Quaternion, dx: number, dy: number): void {
  const k = 0.012;
  const a = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * k);
  const b = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * k);
  q.premultiply(b).premultiply(a).normalize();
}

export { THREE };
