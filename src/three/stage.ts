// The 3D layer: one WebGL renderer drawn into the 2D canvas between UI layers.
// World units ≈ CSS pixels on the table plane (y = 0), screen-down = +z.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export { THREE };

const FOV = 32;
export const TILT = 0.5; // radians from straight-down: the front faces show, like the reference

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let counterCam: THREE.PerspectiveCamera;
let sun: THREE.DirectionalLight;
let shadowPlane: THREE.Mesh;
export let root: THREE.Group;
let size = { W: 0, H: 0, dpr: 0 };
const ray = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ndc = new THREE.Vector2();
const tmp = new THREE.Vector3();

export function stageReady(): boolean {
  return !!renderer;
}

export function initStage(): boolean {
  if (renderer) return true;
  try {
    const cv = document.createElement('canvas');
    renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  } catch {
    renderer = null;
    return false;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;

  camera = new THREE.PerspectiveCamera(FOV, 1, 10, 20000);
  counterCam = new THREE.PerspectiveCamera(FOV, 1, 10, 20000);

  const hemi = new THREE.HemisphereLight(0xfff6ea, 0x5a6690, 0.85);
  scene.add(hemi);
  // the desk lamp: warm key light from the top-right, shadows fall down-left
  sun = new THREE.DirectionalLight(0xfff0dc, 1.55);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 1.5;
  sun.shadow.radius = 6;
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.75);
  fill.position.set(-400, 600, 500);
  scene.add(fill);

  shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ color: 0x08102a, opacity: 0.45 }));
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  root = new THREE.Group();
  scene.add(root);
  return true;
}

export function resizeStage(W: number, H: number, dpr: number): void {
  if (!renderer) return;
  if (size.W === W && size.H === H && size.dpr === dpr) return;
  size = { W, H, dpr };
  renderer.setPixelRatio(dpr);
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.fov = FOV;
  const D = H / 2 / Math.tan((FOV * Math.PI) / 360);
  camera.position.set(0, D * Math.cos(TILT), D * Math.sin(TILT));
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
  camera.near = D * 0.3;
  camera.far = D * 3;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(); // toWorld() may run before the first render
  const S = Math.max(W, H);
  sun.position.set(S * 0.55, S * 1.4, -S * 0.45);
  sun.target.position.set(0, 0, 0);
  const sc = sun.shadow.camera;
  sc.left = -S; sc.right = S; sc.top = S; sc.bottom = -S;
  sc.near = 10; sc.far = S * 5;
  sc.updateProjectionMatrix();
  shadowPlane.scale.set(S * 3, S * 3, 1);
}

const COUNTER_TILT = 0.24; // radians below the horizon: eye level, a peek at the counter top
let counterKey = '';

/**
 * Eye-level camera for the shop counter. The counter's front top edge
 * (y = 0, z = 0) lands on screen row `yC` at 1 world unit per CSS pixel;
 * x = screen x − W/2, +z comes toward the viewer.
 */
export function setCounterView(yC: number): void {
  const { W, H } = size;
  const key = `${W}x${H}:${yC}`;
  if (key === counterKey) return;
  counterKey = key;
  const D = H / 2 / Math.tan((FOV * Math.PI) / 360);
  counterCam.aspect = W / H;
  counterCam.position.set(0, D * Math.sin(COUNTER_TILT), D * Math.cos(COUNTER_TILT));
  counterCam.up.set(0, 1, 0);
  counterCam.lookAt(0, 0, 0);
  counterCam.near = D * 0.2;
  counterCam.far = D * 4;
  // shift the frustum so the look-at point sits at yC instead of mid-screen
  counterCam.setViewOffset(W, H, 0, H / 2 - yC, W, H);
  counterCam.updateProjectionMatrix();
}

/** World point on the horizontal plane at height h under a screen point. */
export function toWorld(sx: number, sy: number, h = 0, out = new THREE.Vector3()): THREE.Vector3 {
  ndc.set((sx / size.W) * 2 - 1, -((sy / size.H) * 2 - 1));
  ray.setFromCamera(ndc, camera);
  plane.constant = -h;
  if (!ray.ray.intersectPlane(plane, out)) out.set(sx - size.W / 2, h, sy - size.H / 2);
  return out;
}

/** A bench-camera ray through a screen point, for picking. */
export function rayAt(sx: number, sy: number): THREE.Raycaster {
  ndc.set((sx / size.W) * 2 - 1, -((sy / size.H) * 2 - 1));
  ray.setFromCamera(ndc, camera);
  return ray;
}

/** Screen point of a world position. */
export function toScreen(v: THREE.Vector3): { x: number; y: number } {
  tmp.copy(v).project(camera);
  return { x: ((tmp.x + 1) / 2) * size.W, y: ((1 - tmp.y) / 2) * size.H };
}

export interface PassOpts {
  /** Which camera: the workbench (top-down) or the shop counter (eye level). */
  cam?: 'bench' | 'counter';
  /** Draw the invisible shadow-catcher plane at y = 0 (off when a real surface is in the pass). */
  ground?: boolean;
}

/** Render only `objs` (children of root) and composite onto the 2D canvas. */
export function renderPass(ctx: CanvasRenderingContext2D, objs: THREE.Object3D[], W: number, H: number, opts: PassOpts = {}): void {
  if (!renderer) return;
  for (const ch of root.children) ch.visible = false;
  if (!objs.length) return;
  for (const o of objs) {
    if (o.parent !== root) root.add(o);
    o.visible = true;
  }
  const counter = opts.cam === 'counter';
  shadowPlane.visible = opts.ground !== false;
  const S = Math.max(size.W, size.H);
  // on the bench the lamp shines from the top-right; at the counter the light comes from the shop, in front
  if (counter) sun.position.set(S * 0.5, S * 1.3, S * 0.9);
  else sun.position.set(S * 0.55, S * 1.4, -S * 0.45);
  renderer.render(scene, counter ? counterCam : camera);
  ctx.drawImage(renderer.domElement, 0, 0, W, H);
}

export function disposeObject(o: THREE.Object3D): void {
  o.removeFromParent();
  o.traverse((n) => {
    const m = n as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mt of mats) {
      const sm = mt as THREE.MeshStandardMaterial;
      sm.map?.dispose();
      mt.dispose();
    }
  });
}
