// The repair shop seen from the street: one base building, built once, whose
// pieces switch as Renovation upgrades are bought. Stylised 3D cartoon after
// the reference art: rounded, bevelled blocks, cream / blue / gold, warm daylight,
// soft shadows, a fixed 3/4 camera. The rolling shutter and the main sign never
// move; upgrades only swap what they wear or add pieces around them.
// Its own small renderer (like the collection showcase), so the bench is untouched.

import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { THREE } from './stage';
import type { VisualId, AnimKind } from '../content/renovation';

// ---------- palette (from the reference) ----------

const COL = {
  cream: '#f3e6c8', creamDark: '#d9c9a4', oldWall: '#b9ad97', oldWallDark: '#8f8573',
  blue: '#2a6fd6', blueDark: '#1f4fa3', navy: '#1d2f5c', gold: '#f2b632', goldDark: '#c98a1a',
  white: '#fbfaf5', rust: '#8a5a3a', rustDark: '#5e3c26', silver: '#b7bec8', silverDark: '#8d96a3',
  steel: '#5f7486', wood: '#a8743a', woodDark: '#6e4a28', green: '#4f9a4a', greenDark: '#2f6e34',
  pot: '#c86a3a', asphalt: '#6c7078', pavement: '#d8d2c4', curb: '#b9b3a6', sky: '#9fd3f2',
};

// ---------- helpers ----------

const mats = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, o: { rough?: number; metal?: number; emissive?: string; ei?: number } = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${o.rough ?? 0.62}|${o.metal ?? 0}|${o.emissive ?? ''}|${o.ei ?? 0}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.62, metalness: o.metal ?? 0 });
    if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.ei ?? 1; }
    mats.set(key, m);
  }
  return m;
}

function texMat(tex: THREE.Texture, o: { rough?: number; emissive?: boolean; transparent?: boolean } = {}): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: o.rough ?? 0.6, transparent: o.transparent ?? false });
  if (o.emissive) { m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = tex; m.emissiveIntensity = 0.35; }
  return m;
}

/** A bevelled box: the cartoon look of the reference (radius in metres). */
function rbox(w: number, h: number, d: number, m: THREE.Material, r = 0.06): THREE.Mesh {
  const rr = Math.max(0.005, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rr), m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cyl(rt: number, rb: number, h: number, m: THREE.Material, seg = 20): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function sphere(r: number, m: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), m);
  mesh.castShadow = true;
  return mesh;
}

function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number, ry = 0): T {
  o.position.set(x, y, z);
  o.rotation.y = ry;
  return o;
}

function canvasTex(w: number, h: number, paint: (c: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  paint(cv.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A flat textured card standing on the wall (z-facing). */
function card(w: number, h: number, tex: THREE.Texture, o: { emissive?: boolean; transparent?: boolean } = {}): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), texMat(tex, { transparent: o.transparent ?? true, emissive: o.emissive }));
  m.receiveShadow = true;
  return m;
}

const FONT = '"Baloo 2", "Arial Rounded MT Bold", sans-serif';

function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

// ---------- textures ----------

function wallTex(old: boolean, cracks: boolean): THREE.CanvasTexture {
  return canvasTex(512, 384, (c, w, h) => {
    c.fillStyle = old ? COL.oldWall : COL.cream;
    c.fillRect(0, 0, w, h);
    // plaster grain
    for (let i = 0; i < 900; i++) {
      c.fillStyle = `rgba(${old ? '60,50,40' : '120,100,70'},${Math.random() * (old ? 0.08 : 0.04)})`;
      c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }
    if (old) {
      // water stains and grime running down
      for (let i = 0; i < 9; i++) {
        const x = Math.random() * w, g = c.createLinearGradient(x, 0, x, h);
        g.addColorStop(0, 'rgba(70,60,45,0.25)'); g.addColorStop(1, 'rgba(70,60,45,0)');
        c.fillStyle = g;
        c.fillRect(x, 0, 14 + Math.random() * 30, h * (0.4 + Math.random() * 0.5));
      }
    }
    if (cracks) {
      // peeling patches showing brick, and cracks
      for (let i = 0; i < 5; i++) {
        const x = 30 + Math.random() * (w - 120), y = 30 + Math.random() * (h - 100), pw = 50 + Math.random() * 60, ph = 30 + Math.random() * 40;
        c.fillStyle = '#9a5a3c';
        c.beginPath(); c.ellipse(x, y, pw / 2, ph / 2, Math.random(), 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(255,240,220,0.35)'; c.lineWidth = 2;
        for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x - pw / 3, y - ph / 4 + k * 8); c.lineTo(x + pw / 3, y - ph / 4 + k * 8); c.stroke(); }
      }
      c.strokeStyle = 'rgba(50,40,30,0.7)'; c.lineWidth = 2.5;
      for (let i = 0; i < 6; i++) {
        let x = Math.random() * w, y = Math.random() * h * 0.5;
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 30; y += 12 + Math.random() * 14; c.lineTo(x, y); }
        c.stroke();
      }
    }
  });
}

function shutterTex(kind: 'rust' | 'silver' | 'premium'): THREE.CanvasTexture {
  return canvasTex(256, 256, (c, w, h) => {
    const base = kind === 'rust' ? '#8d7a68' : kind === 'silver' ? '#c3cad3' : '#6f8296';
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 12) {
      const g = c.createLinearGradient(0, y, 0, y + 12);
      g.addColorStop(0, 'rgba(255,255,255,0.28)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.28)');
      c.fillStyle = g;
      c.fillRect(0, y, w, 12);
    }
    if (kind === 'rust') {
      for (let i = 0; i < 70; i++) {
        c.fillStyle = `rgba(${130 + Math.random() * 40},${60 + Math.random() * 30},30,${0.25 + Math.random() * 0.4})`;
        c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 4 + Math.random() * 16, 2 + Math.random() * 8, 0, 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = 'rgba(30,20,10,0.5)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(40, 120); c.quadraticCurveTo(70, 130, 110, 124); c.stroke();
    }
    if (kind === 'premium') {
      // the small logo in the middle
      c.fillStyle = '#f2b632';
      c.beginPath(); c.arc(w / 2, h / 2, 26, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2a6fd6';
      c.beginPath(); c.arc(w / 2, h / 2, 20, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(w / 2 - 9, h / 2 + 9); c.lineTo(w / 2 + 9, h / 2 - 9); c.stroke();
    }
  });
}

function signTex(kind: 'old' | 'basic' | 'pro' | 'premium'): THREE.CanvasTexture {
  const W = 1024, H = kind === 'old' || kind === 'basic' ? 256 : 320;
  return canvasTex(W, H, (c, w, h) => {
    if (kind === 'old') {
      c.fillStyle = '#c9b48e';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 14; i++) { c.fillStyle = `rgba(110,80,50,${0.1 + Math.random() * 0.15})`; c.fillRect(0, i * (h / 14), w, 2); }
      c.font = `900 170px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(150,70,40,0.55)';
      c.fillText('REPAIR', w / 2, h / 2 + 10);
      for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(201,180,142,0.8)'; c.fillRect(Math.random() * w, Math.random() * h, 10 + Math.random() * 40, 4 + Math.random() * 8); }
      return;
    }
    // blue panel
    const r = kind === 'basic' ? 40 : 60;
    rrect(c, 6, 6, w - 12, h - 12, r);
    c.fillStyle = kind === 'basic' ? COL.blue : COL.blueDark;
    c.fill();
    if (kind !== 'basic') { c.lineWidth = 14; c.strokeStyle = COL.gold; c.stroke(); }
    // the basic sign carries a small wrench on a gold dot; the 3D ones get a separate gear badge
    if (kind === 'basic') {
      const ix = 150, iy = h / 2, ir = 70;
      c.fillStyle = COL.gold;
      c.beginPath(); c.arc(ix, iy, ir, 0, Math.PI * 2); c.fill();
      c.save(); c.translate(ix, iy); c.rotate(-Math.PI / 4);
      c.fillStyle = '#ffffff';
      c.fillRect(-ir * 0.12, -ir * 0.5, ir * 0.24, ir * 1.05);
      c.beginPath(); c.arc(0, -ir * 0.52, ir * 0.26, 0, Math.PI * 2); c.fill();
      c.fillStyle = COL.gold;
      c.fillRect(-ir * 0.08, -ir * 0.85, ir * 0.16, ir * 0.3);
      c.restore();
    }
    // the words
    c.textAlign = 'left'; c.textBaseline = 'middle';
    if (kind === 'basic') {
      c.font = `900 150px ${FONT}`;
      c.lineWidth = 14; c.strokeStyle = COL.navy; c.strokeText('REPAIR', 260, h / 2 + 8);
      c.fillStyle = '#ffffff'; c.fillText('REPAIR', 260, h / 2 + 8);
    } else {
      c.font = `900 150px ${FONT}`;
      c.lineWidth = 16; c.strokeStyle = COL.navy; c.strokeText('REPAIR', 250, h * 0.36);
      c.fillStyle = '#ffffff'; c.fillText('REPAIR', 250, h * 0.36);
      c.font = `900 118px ${FONT}`;
      c.strokeText('SHOP', 350, h * 0.74);
      c.fillStyle = COL.gold; c.fillText('SHOP', 350, h * 0.74);
    }
  });
}

/** The brand badge: a gold-rimmed blue disc with a white gear and wrench. */
function gearTex(): THREE.CanvasTexture {
  return canvasTex(256, 256, (c, w, h) => {
    const cx = w / 2, cy = h / 2;
    c.fillStyle = COL.gold; c.beginPath(); c.arc(cx, cy, 126, 0, Math.PI * 2); c.fill();
    c.fillStyle = COL.blue; c.beginPath(); c.arc(cx, cy, 108, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) { c.save(); c.translate(cx, cy); c.rotate((i / 8) * Math.PI * 2); c.fillRect(-13, -92, 26, 28); c.restore(); }
    c.beginPath(); c.arc(cx, cy, 72, 0, Math.PI * 2); c.fill();
    c.fillStyle = COL.blue; c.beginPath(); c.arc(cx, cy, 52, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(cx, cy); c.rotate(-Math.PI / 4);
    c.fillStyle = '#ffffff';
    c.fillRect(-11, -40, 22, 86);
    c.beginPath(); c.arc(0, -44, 24, 0, Math.PI * 2); c.fill();
    c.fillStyle = COL.blue; c.fillRect(-8, -72, 16, 28);
    c.restore();
  });
}

function stripesTex(): THREE.CanvasTexture {
  return canvasTex(512, 64, (c, w, h) => {
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? COL.white : COL.blue; c.fillRect((i * w) / 8, 0, w / 8, h); }
  });
}

type IconKind = 'phone' | 'pad' | 'camera' | 'laptop';
function iconTex(k: IconKind): THREE.CanvasTexture {
  return canvasTex(128, 128, (c, w, h) => {
    rrect(c, 6, 6, w - 12, h - 12, 22);
    c.fillStyle = COL.blue; c.fill();
    c.lineWidth = 5; c.strokeStyle = '#ffffff'; c.stroke();
    c.fillStyle = '#ffffff'; c.strokeStyle = '#ffffff'; c.lineWidth = 7; c.lineJoin = 'round';
    const cx = w / 2, cy = h / 2;
    if (k === 'phone') { rrect(c, cx - 18, cy - 30, 36, 60, 7); c.stroke(); c.fillRect(cx - 6, cy + 20, 12, 4); }
    if (k === 'pad') {
      rrect(c, cx - 34, cy - 16, 68, 34, 16); c.fill();
      c.fillStyle = COL.blue; c.fillRect(cx - 24, cy - 3, 16, 5); c.fillRect(cx - 18.5, cy - 9, 5, 17);
      c.beginPath(); c.arc(cx + 15, cy - 3, 4, 0, Math.PI * 2); c.arc(cx + 23, cy + 4, 4, 0, Math.PI * 2); c.fill();
    }
    if (k === 'camera') { rrect(c, cx - 32, cy - 18, 64, 40, 8); c.fill(); c.fillRect(cx - 12, cy - 26, 24, 10); c.fillStyle = COL.blue; c.beginPath(); c.arc(cx, cy + 2, 12, 0, Math.PI * 2); c.fill(); }
    if (k === 'laptop') { rrect(c, cx - 26, cy - 24, 52, 34, 4); c.stroke(); c.fillRect(cx - 36, cy + 14, 72, 8); }
  });
}

function boardTex(): THREE.CanvasTexture {
  return canvasTex(256, 360, (c, w, h) => {
    rrect(c, 4, 4, w - 8, h - 8, 18);
    c.fillStyle = '#23324f'; c.fill();
    c.lineWidth = 10; c.strokeStyle = COL.wood; c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffffff';
    c.font = `900 56px ${FONT}`;
    ['FIX', 'CLEAN', 'RESTORE'].forEach((s, i) => c.fillText(s, w / 2, 70 + i * 74));
    c.strokeStyle = '#ffffff'; c.lineWidth = 8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w / 2 - 26, 296); c.lineTo(w / 2 + 26, 330); c.moveTo(w / 2 + 26, 296); c.lineTo(w / 2 - 26, 330); c.stroke();
  });
}

function screenTex(): THREE.CanvasTexture {
  return canvasTex(256, 160, (c, w, h) => {
    c.fillStyle = '#0d2a3a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#7cf5b0'; c.lineWidth = 5;
    c.beginPath();
    for (let x = 0; x <= w; x += 8) { const y = h / 2 + Math.sin(x / 18) * 26 * (x % 64 < 24 ? 1 : 0.3); if (x) c.lineTo(x, y); else c.moveTo(x, y); }
    c.stroke();
    c.fillStyle = '#7cf5b0'; c.font = `bold 22px ${FONT}`; c.fillText('OK ✓', 14, 30);
  });
}

/** Behind the shutter: the warm workshop, shelves of gadgets, an OPEN sign. */
function interiorTex(): THREE.CanvasTexture {
  return canvasTex(512, 420, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f7dfaa'); g.addColorStop(1, '#d9a86a');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // shelves with gadgets
    const cols = ['#e8665a', '#3a7bd5', '#4fbf9f', '#f4c430', '#9a4fd8', '#2b2f36'];
    for (const y of [120, 230]) {
      c.fillStyle = '#7a5232'; c.fillRect(20, y, w - 40, 12);
      for (let x = 34, i = 0; x < w - 60; x += 46 + (i * 17) % 20, i++) {
        const bh = 34 + (i * 13) % 26;
        c.fillStyle = cols[(i + y) % cols.length];
        rrect(c, x, y - bh, 34 + (i * 7) % 12, bh, 6); c.fill();
      }
    }
    // the workbench with a lamp glow
    c.fillStyle = '#6e4a28'; c.fillRect(30, h - 110, w - 60, 22);
    const lg = c.createRadialGradient(w * 0.7, h - 160, 10, w * 0.7, h - 160, 160);
    lg.addColorStop(0, 'rgba(255,240,190,0.7)'); lg.addColorStop(1, 'rgba(255,240,190,0)');
    c.fillStyle = lg; c.fillRect(0, 0, w, h);
    // a neon OPEN sign
    rrect(c, w * 0.08, 20, 150, 60, 14);
    c.fillStyle = '#23324f'; c.fill();
    c.font = `900 44px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = '#7cf5b0'; c.shadowBlur = 14;
    c.fillStyle = '#9dffc8'; c.fillText('OPEN', w * 0.08 + 75, 52);
  });
}

function openSignTex(): THREE.CanvasTexture {
  return canvasTex(256, 384, (c, w, h) => {
    rrect(c, 4, 4, w - 8, h - 8, 22);
    c.fillStyle = COL.blueDark; c.fill();
    c.lineWidth = 10; c.strokeStyle = COL.gold; c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffffff';
    c.font = `900 50px ${FONT}`;
    ['FIX', 'CLEAN', 'RESTORE', 'RECYCLE'].forEach((s, i) => c.fillText(s, w / 2, 70 + i * 62));
    c.font = `900 60px ${FONT}`; c.fillText('♻', w / 2, 330);
  });
}

// ---------- the model ----------

/** A piece that animates in/out: `k` 0 = gone, 1 = in place. */
interface Piece { obj: THREE.Object3D; base: THREE.Vector3; scale: THREE.Vector3; delay: number }

/** Where an upgrade's visual sits, for the camera and for taps. */
export type Area = 'sign' | 'wall' | 'shutter' | 'front' | 'side' | 'annex' | 'lamp';
export const AREA: Record<VisualId, Area> = {
  yard: 'front', wall: 'wall', lamp: 'lamp', paint: 'wall', shutter: 'shutter', sign1: 'sign', awning: 'shutter',
  icons: 'side', board: 'front', deco: 'front', sign2: 'sign', led: 'sign', tools: 'wall', panel: 'side',
  annex: 'annex', showcase: 'annex', station: 'front', trim: 'wall', sign3: 'sign', shutter2: 'shutter', finish: 'front', grand: 'sign',
};
const FOCUS: Record<Area, [number, number, number, number]> = {
  // look-at x, y, z and zoom (1 = the whole shop)
  sign: [-0.4, 3.0, 2.0, 1.2], wall: [0.4, 1.8, 2.0, 1.2], shutter: [-0.4, 1.5, 2.0, 1.35], front: [0.0, 0.9, 3.0, 1.15],
  side: [3.0, 2.0, 0.3, 1.35], annex: [-3.6, 1.6, 1.4, 1.2], lamp: [1.6, 2.5, 2.1, 1.6],
};

const BW = 6, BD = 4, BH = 3.6; // building width, depth, height (m)
const FZ = BD / 2; // the front face

export class Storefront {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  /** Every switchable piece, by visual id: 'before' pieces go away, 'after' ones come in. */
  before = new Map<VisualId, Piece[]>();
  after = new Map<VisualId, Piece[]>();
  pickables: { obj: THREE.Object3D; area: Area }[] = [];
  wallMesh!: THREE.Mesh;
  wallTexOld = wallTex(true, true);
  wallTexPatched = wallTex(true, false);
  wallTexNew = wallTex(false, false);
  shutterMesh!: THREE.Mesh;
  shutterTexs = { rust: shutterTex('rust'), silver: shutterTex('silver'), premium: shutterTex('premium') };
  lampLight!: THREE.PointLight;
  lampBulb!: THREE.Mesh;
  showcaseSlots: THREE.Mesh[] = [];
  confetti: THREE.Mesh[] = [];
  broom!: THREE.Group;
  roller!: THREE.Group;
  /** Camera framing: eased toward `want`. */
  look = { x: -0.3, y: 1.7, z: 1.2, zoom: 1 };
  want = { x: -0.3, y: 1.7, z: 1.2, zoom: 1 };
  time = 0;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    this.scene.background = null;
    // warm, bright daylight from the front-left
    this.scene.add(new THREE.HemisphereLight(0xfff6e6, 0x8fa4c8, 0.9));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.1);
    sun.position.set(-8, 14, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 40;
    sun.shadow.bias = -0.0006;
    sun.shadow.radius = 4;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xdbe6ff, 0.6);
    fill.position.set(9, 6, 6);
    this.scene.add(fill);
    this.build();
  }

  // ---------- building ----------

  private add(o: THREE.Object3D): THREE.Object3D { this.scene.add(o); return o; }

  private piece(map: Map<VisualId, Piece[]>, v: VisualId, obj: THREE.Object3D, delay = 0): THREE.Object3D {
    this.scene.add(obj);
    const list = map.get(v) ?? [];
    list.push({ obj, base: obj.position.clone(), scale: obj.scale.clone(), delay });
    map.set(v, list);
    return obj;
  }

  private pick(obj: THREE.Object3D, area: Area): void { this.pickables.push({ obj, area }); }

  private build(): void {
    // ground: street, curb, pavement
    const street = new THREE.Mesh(new THREE.PlaneGeometry(60, 12), mat(COL.asphalt, { rough: 0.9 }));
    street.rotation.x = -Math.PI / 2; street.position.set(0, -0.02, 9);
    street.receiveShadow = true;
    this.add(street);
    for (let i = -6; i <= 6; i++) this.add(at(rbox(1.6, 0.02, 0.18, mat('#f4f1ea', { rough: 0.8 }), 0.01), i * 3.4, 0, 8.5));
    this.add(at(rbox(40, 0.22, 0.4, mat(COL.curb), 0.04), 0, 0.05, 5.4));
    const pave = rbox(40, 0.16, 9, mat(COL.pavement, { rough: 0.85 }), 0.03);
    this.add(at(pave, 0, 0, 1));
    for (let x = -18; x <= 18; x += 1.2) this.add(at(rbox(0.04, 0.012, 9, mat('#c6bfb0'), 0.005), x, 0.085, 1));

    // the backdrop: trees and neighbouring buildings, soft and simple
    const back = [[-10, 7, '#e8b49a'], [-6.5, 9, '#f0c8a8'], [9, 8, '#c9b6e0'], [12, 6, '#e8b49a'], [-14, 6, '#bfd3e8']] as const;
    for (const [x, h, col] of back) {
      const b = rbox(4, h, 4, mat(col), 0.12);
      this.add(at(b, x, h / 2, -6));
      for (let wy = 1.2; wy < h - 0.6; wy += 1.3) for (const wx of [-1, 0, 1]) this.add(at(rbox(0.6, 0.7, 0.05, mat('#7aa6cf', { rough: 0.3 }), 0.05), x + wx * 1.1, wy, -3.97));
    }
    for (const [x, z, s] of [[-7.5, -1.5, 1.4], [7.2, -1.2, 1.3], [-11, 2, 1.1], [10.5, 2.5, 1.2]] as const) this.tree(x, z, s);

    // utility pole with sagging wires (stage-1 street feel, kept as scenery)
    const pole = cyl(0.12, 0.15, 7, mat(COL.woodDark));
    this.add(at(pole, -6.2, 3.5, 3.6));

    // ---------- the building ----------
    // walls: a slightly bevelled block; its front wears the wall texture states
    const body = rbox(BW, BH, BD, mat(COL.cream), 0.08);
    this.add(at(body, 0, BH / 2 + 0.08, 0));
    this.pick(body, 'wall');
    this.wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.1, BH - 0.1), texMat(this.wallTexOld));
    this.wallMesh.position.set(0, BH / 2 + 0.08, FZ + 0.002);
    this.wallMesh.receiveShadow = true;
    this.add(this.wallMesh);
    this.pick(this.wallMesh, 'wall');
    // side wall wears the same look
    const side = new THREE.Mesh(new THREE.PlaneGeometry(BD - 0.1, BH - 0.1), texMat(this.wallTexOld));
    side.rotation.y = Math.PI / 2; side.position.set(BW / 2 + 0.002, BH / 2 + 0.08, 0);
    side.receiveShadow = true;
    this.add(side);
    this.pick(side, 'side');
    (side.userData as { wall: boolean }).wall = true;
    this.sideMesh = side;
    // roof slab + parapet
    this.add(at(rbox(BW + 0.3, 0.3, BD + 0.3, mat(COL.creamDark), 0.1), 0, BH + 0.2, 0));
    // the a/c unit and a crate on the roof (from the reference)
    this.add(at(rbox(0.9, 0.6, 0.6, mat('#e8e8e8'), 0.08), 2.0, BH + 0.65, -0.6));
    this.add(at(cyl(0.22, 0.22, 0.05, mat('#9aa3ad')), 2.0, BH + 0.65, -0.29)).rotation.x = Math.PI / 2;

    // the rolling shutter: always here, always this size
    const SW = 3.0, SH = 2.5, SX = -0.5;
    this.add(at(rbox(SW + 0.3, 0.32, 0.36, mat(COL.steel, { metal: 0.3 }), 0.08), SX, SH + 0.32, FZ + 0.12));
    // the shop inside, seen when the shutter is up (between the wall and the shutter)
    const inside = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), texMat(interiorTex(), { transparent: false, emissive: true }));
    inside.position.set(SX, SH / 2 + 0.08, FZ + 0.015);
    this.add(inside);
    this.shutterMesh = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), texMat(this.shutterTexs.rust, { rough: 0.45 }));
    this.shutterMesh.position.set(SX, SH / 2 + 0.08, FZ + 0.03);
    this.shutterMesh.receiveShadow = true;
    this.add(this.shutterMesh);
    this.pick(this.shutterMesh, 'shutter');
    for (const dx of [-SW / 2 - 0.06, SW / 2 + 0.06]) this.add(at(rbox(0.12, SH, 0.12, mat(COL.steel, { metal: 0.3 }), 0.03), SX + dx, SH / 2 + 0.08, FZ + 0.05));

    // ---------- stage 1: junk, cracks, the old lamp ----------
    // U01: junk in the yard (goes away)
    const junk: [number, number, number, number][] = [[-2.6, 0.35, 2.8, 0.6], [-2.1, 0.22, 3.3, 0.45], [2.4, 0.3, 3.0, 0.55], [2.0, 0.6, 2.9, 0.4], [-0.6, 0.12, 3.6, 0.25]];
    junk.forEach(([x, y, z, s], i) => {
      const box = rbox(s * 1.2, s, s, mat(i % 2 ? '#b98552' : '#a07040'), 0.04);
      box.rotation.y = i * 0.7;
      this.piece(this.before, 'yard', at(box, x, y, z), i * 0.06);
    });
    const bag = sphere(0.32, mat('#3a3f48', { rough: 0.4 }));
    bag.scale.set(1, 0.85, 1);
    this.piece(this.before, 'yard', at(bag, 1.3, 0.3, 3.4));
    const cable = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.025, 8, 24), mat('#222'));
    cable.rotation.x = Math.PI / 2;
    this.piece(this.before, 'yard', at(cable, 0.6, 0.1, 3.2));
    const cone = new THREE.Group();
    cone.add(at(cyl(0.02, 0.22, 0.6, mat('#f07a1f')), 0, 0.38, 0));
    cone.add(at(rbox(0.5, 0.06, 0.5, mat('#f07a1f'), 0.02), 0, 0.1, 0));
    cone.add(at(cyl(0.12, 0.15, 0.1, mat('#ffffff')), 0, 0.42, 0));
    this.piece(this.before, 'yard', at(cone, 3.1, 0, 3.6));
    // a small old work table that stays (it is a repair shop)
    this.add(at(rbox(1.1, 0.08, 0.6, mat(COL.wood), 0.03), -2.6, 0.75, 2.6));
    for (const dx of [-0.45, 0.45]) for (const dz of [-0.22, 0.22]) this.add(at(rbox(0.06, 0.72, 0.06, mat(COL.woodDark), 0.02), -2.6 + dx, 0.38, 2.6 + dz));
    this.pick(this.scene.children[this.scene.children.length - 1], 'front');

    // U03: the wall lamp, right of the shutter
    const lamp = new THREE.Group();
    lamp.add(at(rbox(0.08, 0.5, 0.08, mat('#2b2f36', { metal: 0.4 }), 0.02), 0, 0.2, 0));
    lamp.add(at(rbox(0.08, 0.08, 0.4, mat('#2b2f36', { metal: 0.4 }), 0.02), 0, 0.42, 0.2));
    const shade = cyl(0.08, 0.22, 0.22, mat('#2b2f36', { metal: 0.4 }));
    lamp.add(at(shade, 0, 0.32, 0.38));
    this.lampBulb = sphere(0.09, mat('#fff3c0', { emissive: '#ffcf6b', ei: 0.3 }));
    lamp.add(at(this.lampBulb, 0, 0.2, 0.38));
    this.add(at(lamp, 1.6, 2.35, FZ));
    this.pick(lamp, 'lamp');
    this.lampLight = new THREE.PointLight(0xffc870, 0, 5, 1.6);
    this.lampLight.position.set(1.6, 2.4, FZ + 0.6);
    this.add(this.lampLight);

    // ---------- stage 2: signs ----------
    // the sign sits high on the facade, over the roof edge like the reference
    const SIGN_Y = BH - 0.12;
    const oldSign = rbox(3.2, 0.8, 0.12, mat('#b9a37d'), 0.04);
    this.piece(this.before, 'sign1', at(oldSign, SX, SIGN_Y, FZ + 0.1));
    const oldFace = card(3.1, 0.72, signTex('old'), { transparent: false });
    this.piece(this.before, 'sign1', at(oldFace, SX, SIGN_Y, FZ + 0.17));
    this.pick(oldSign, 'sign');
    const s1 = new THREE.Group();
    s1.add(rbox(3.4, 0.86, 0.16, mat(COL.blueDark), 0.08));
    s1.add(at(card(3.3, 0.78, signTex('basic'), { emissive: true }), 0, 0, 0.085));
    this.piece(this.after, 'sign1', at(s1, SX, SIGN_Y, FZ + 0.12));
    this.pick(s1, 'sign');
    // U11: the raised 3D REPAIR SHOP sign with a gold rim
    const s2 = new THREE.Group();
    s2.add(rbox(3.9, 1.22, 0.3, mat(COL.gold, { metal: 0.2, rough: 0.4 }), 0.18));
    s2.add(at(rbox(3.72, 1.06, 0.3, mat(COL.blueDark), 0.14), 0, 0, 0.04));
    s2.add(at(card(3.6, 1.0, signTex('pro'), { emissive: true }), 0, 0, 0.2));
    const gear = cyl(0.55, 0.55, 0.16, mat(COL.gold, { metal: 0.25, rough: 0.35 }), 32);
    gear.rotation.x = Math.PI / 2;
    s2.add(at(gear, -1.95, 0, 0.18));
    s2.add(at(card(1.08, 1.08, gearTex(), { emissive: true }), -1.95, 0, 0.265));
    this.piece(this.after, 'sign2', at(s2, SX, SIGN_Y + 0.05, FZ + 0.16));
    this.pick(s2, 'sign');
    // U19: bigger, lit, a brand badge on the corner
    const s3 = new THREE.Group();
    s3.add(rbox(4.4, 1.4, 0.36, mat(COL.gold, { metal: 0.25, rough: 0.35, emissive: '#ffcf6b', ei: 0.25 }), 0.2));
    s3.add(at(rbox(4.2, 1.22, 0.36, mat(COL.blue), 0.16), 0, 0, 0.04));
    s3.add(at(card(4.05, 1.15, signTex('premium'), { emissive: true }), 0, 0, 0.23));
    const badge = cyl(0.7, 0.7, 0.24, mat(COL.gold, { metal: 0.3, rough: 0.3 }), 32);
    badge.rotation.x = Math.PI / 2;
    s3.add(at(badge, -2.25, 0.05, 0.2));
    s3.add(at(card(1.36, 1.36, gearTex(), { emissive: true }), -2.25, 0.05, 0.325));
    this.piece(this.after, 'sign3', at(s3, SX, SIGN_Y + 0.1, FZ + 0.2));
    this.pick(s3, 'sign');

    // ---------- stage 3 ----------
    // U07: striped awning over the shutter
    const aw = new THREE.Group();
    const awTex = stripesTex();
    awTex.wrapS = THREE.RepeatWrapping;
    awTex.repeat.set(2, 1);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.0), texMat(awTex));
    top.rotation.x = -Math.PI / 2 + 0.55; top.position.set(0, 0, 0.42);
    top.castShadow = true;
    aw.add(top);
    for (let i = 0; i < 8; i++) {
      const scal = new THREE.Mesh(new THREE.CircleGeometry(0.23, 16, Math.PI, Math.PI), mat(i % 2 ? COL.white : COL.blue));
      scal.position.set(-1.57 + i * 0.45, -0.43, 0.86);
      aw.add(scal);
    }
    aw.add(at(rbox(3.7, 0.08, 0.08, mat(COL.steel, { metal: 0.4 }), 0.03), 0, 0.42, 0));
    this.piece(this.after, 'awning', at(aw, SX, SH + 0.26, FZ + 0.05));
    this.pick(aw, 'shutter');
    // U08: device icons on the side wall
    (['phone', 'pad', 'camera', 'laptop'] as IconKind[]).forEach((k, i) => {
      const tile = new THREE.Group();
      tile.add(rbox(0.62, 0.62, 0.08, mat(COL.white), 0.08));
      tile.add(at(card(0.58, 0.58, iconTex(k), { emissive: true }), 0, 0, 0.045));
      tile.rotation.y = Math.PI / 2;
      this.piece(this.after, 'icons', at(tile, BW / 2 + 0.08, 2.6 - (i % 2) * 0.82, i < 2 ? 0.55 : -0.35), i * 0.12);
      this.pick(tile, 'side');
    });
    // U09: FIX / CLEAN / RESTORE standing board
    const board = new THREE.Group();
    const bf = card(0.7, 0.98, boardTex(), { transparent: false });
    bf.position.set(0, 0.62, 0.02); bf.rotation.x = -0.12;
    board.add(bf);
    for (const dx of [-0.32, 0.32]) board.add(at(rbox(0.05, 1.2, 0.05, mat(COL.wood), 0.02), dx, 0.6, 0));
    board.rotation.y = -0.35;
    this.piece(this.after, 'board', at(board, 2.35, 0.08, 3.35));
    this.pick(board, 'front');
    // U10: plants, a tidy toolbox, a small display shelf
    this.piece(this.after, 'deco', at(this.plant(0.9), -3.4, 0.08, 2.6), 0);
    this.piece(this.after, 'deco', at(this.plant(0.75), 1.3, 0.08, 2.75), 0.12);
    const tb = new THREE.Group();
    tb.add(rbox(0.7, 0.36, 0.38, mat('#d83a2e'), 0.06));
    tb.add(at(rbox(0.4, 0.06, 0.06, mat('#2b2f36'), 0.02), 0, 0.24, 0));
    this.piece(this.after, 'deco', at(tb, -2.6, 0.97, 2.6), 0.24);
    const shelf = new THREE.Group();
    for (const y of [0.35, 0.8]) shelf.add(at(rbox(1.0, 0.06, 0.4, mat(COL.wood), 0.02), 0, y, 0));
    for (const dx of [-0.48, 0.48]) shelf.add(at(rbox(0.05, 1.0, 0.4, mat(COL.woodDark), 0.02), dx, 0.5, 0));
    shelf.add(at(rbox(0.3, 0.22, 0.22, mat('#3a7bd5'), 0.05), -0.2, 0.5, 0));
    shelf.add(at(rbox(0.26, 0.18, 0.2, mat('#f4c430'), 0.05), 0.22, 0.95, 0));
    shelf.add(at(rbox(0.22, 0.16, 0.2, mat('#e0569b'), 0.05), -0.18, 0.95, 0));
    this.piece(this.after, 'deco', at(shelf, 2.4, 0.08, 2.4, -0.2), 0.36);

    // ---------- stage 4 ----------
    // U12: LED trim on the sign and roof washers (lit pieces)
    const led = new THREE.Group();
    led.add(at(rbox(4.6, 0.06, 0.06, mat('#fff3c0', { emissive: '#ffd36b', ei: 1.4 }), 0.03), 0, 0.78, 0));
    led.add(at(rbox(4.6, 0.06, 0.06, mat('#fff3c0', { emissive: '#ffd36b', ei: 1.4 }), 0.03), 0, -0.78, 0));
    for (let i = 0; i < 5; i++) led.add(at(rbox(0.22, 0.1, 0.22, mat('#2b2f36', { emissive: '#ffd36b', ei: 0.6 }), 0.04), -2.4 + i * 1.2 + 1.5, 1.05, -0.05));
    this.piece(this.after, 'led', at(led, SX, BH - 0.3, FZ + 0.32));
    // U13: tool wall right of the shutter, a tester and part bins
    const tools = new THREE.Group();
    tools.add(rbox(1.0, 1.1, 0.06, mat('#c9a46a'), 0.04));
    const toolCols = ['#d83a2e', '#3a7bd5', '#9aa0a8', '#f2b632', '#2f8f4f'];
    toolCols.forEach((col, i) => tools.add(at(rbox(0.07, 0.42, 0.05, mat(col, { metal: col === '#9aa0a8' ? 0.6 : 0 }), 0.02), -0.36 + i * 0.18, 0.12, 0.05)));
    tools.add(at(rbox(0.5, 0.3, 0.28, mat('#2b2f36'), 0.05), 0, -0.68, 0.2));
    tools.add(at(card(0.32, 0.18, screenTex(), { emissive: true }), 0, -0.66, 0.345));
    this.piece(this.after, 'tools', at(tools, 2.15, 1.45, FZ + 0.04), 0);
    for (let i = 0; i < 3; i++) {
      const bin = rbox(0.34, 0.24, 0.3, mat(['#3a7bd5', '#f2b632', '#2f8f4f'][i]), 0.05);
      this.piece(this.after, 'tools', at(bin, 1.7 + i * 0.4, 0.2, FZ + 0.3), 0.1 + i * 0.08);
    }
    // U14: blue panels on the side wall, gold edges
    const panel = new THREE.Group();
    panel.add(rbox(0.08, 2.0, 2.4, mat(COL.blue), 0.04));
    panel.add(at(rbox(0.1, 0.08, 2.5, mat(COL.gold, { metal: 0.3 }), 0.03), 0, 1.02, 0));
    panel.add(at(rbox(0.1, 0.08, 2.5, mat(COL.gold, { metal: 0.3 }), 0.03), 0, -1.02, 0));
    this.piece(this.after, 'panel', at(panel, BW / 2 + 0.03, 2.2, 0.1));
    this.pick(panel, 'side');

    // ---------- stage 5 ----------
    // U15: the side bay on the left: drop-off window, same style
    const annex = new THREE.Group();
    annex.add(at(rbox(2.6, 3.0, 3.4, mat(COL.cream), 0.08), 0, 1.5, 0));
    annex.add(at(rbox(2.8, 0.26, 3.6, mat(COL.creamDark), 0.08), 0, 3.1, 0));
    annex.add(at(rbox(2.7, 0.5, 0.14, mat(COL.blue), 0.06), 0, 2.6, 1.72));
    annex.add(at(card(2.4, 0.36, canvasTex(512, 80, (c, w, h) => { c.fillStyle = COL.blue; c.fillRect(0, 0, w, h); c.font = `900 54px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText('DROP-OFF', w / 2, h / 2 + 3); }), { emissive: true }), 0, 2.6, 1.8));
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), new THREE.MeshStandardMaterial({ color: '#9fd3f2', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.35 }));
    glass.position.set(0, 1.4, 1.72);
    annex.add(glass);
    annex.add(at(rbox(2.2, 0.1, 0.5, mat(COL.wood), 0.03), 0, 0.62, 1.8));
    this.piece(this.after, 'annex', at(annex, -BW / 2 - 1.3, 0.08, -0.3));
    this.pick(annex, 'annex');
    // U16: showcase shelves in the window (the gadgets come from the collection)
    const sc = new THREE.Group();
    for (const y of [0.95, 1.55]) sc.add(at(rbox(1.9, 0.05, 0.4, mat(COL.white), 0.02), 0, y, 1.45));
    for (let i = 0; i < 6; i++) {
      const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      slot.position.set(-0.62 + (i % 3) * 0.62, 1.22 + Math.floor(i / 3) * 0.6, 1.5);
      sc.add(slot);
      this.showcaseSlots.push(slot);
    }
    const spot = new THREE.PointLight(0xfff0c8, 0.8, 3, 2);
    spot.position.set(0, 2.1, 1.3);
    sc.add(spot);
    this.piece(this.after, 'showcase', at(sc, -BW / 2 - 1.3, 0.08, -0.3));
    // U17: modern test station out front
    const st = new THREE.Group();
    st.add(at(rbox(1.3, 0.1, 0.62, mat('#e9eef4'), 0.04), 0, 0.82, 0));
    st.add(at(rbox(1.24, 0.76, 0.56, mat(COL.blue), 0.06), 0, 0.4, 0));
    st.add(at(rbox(0.7, 0.46, 0.06, mat('#2b2f36'), 0.04), 0, 1.18, -0.18));
    st.add(at(card(0.62, 0.38, screenTex(), { emissive: true }), 0, 1.18, -0.145));
    st.add(at(rbox(0.3, 0.12, 0.2, mat('#f2b632'), 0.03), 0.38, 0.93, 0.08));
    this.piece(this.after, 'station', at(st, 2.0, 0.08, 3.6, -0.3));
    this.pick(st, 'front');
    // U04 also lays a blue base along the bottom of the walls
    this.piece(this.after, 'paint', at(rbox(BW + 0.06, 0.5, 0.05, mat(COL.blue), 0.02), 0, 0.33, FZ + 0.02));
    const sideBase = rbox(0.05, 0.5, BD + 0.06, mat(COL.blue), 0.02);
    this.piece(this.after, 'paint', at(sideBase, BW / 2 + 0.02, 0.33, 0));
    // U18: blue/gold trim along the roof edge and corners
    const trim = new THREE.Group();
    trim.add(at(rbox(BW + 0.4, 0.14, 0.14, mat(COL.blue), 0.04), 0, BH + 0.02, FZ + 0.18));
    trim.add(at(rbox(BW + 0.4, 0.06, 0.16, mat(COL.gold, { metal: 0.3 }), 0.02), 0, BH - 0.1, FZ + 0.18));
    trim.add(at(rbox(0.16, 0.14, BD + 0.4, mat(COL.blue), 0.04), BW / 2 + 0.18, BH + 0.02, 0));
    for (const x of [-BW / 2 - 0.02, BW / 2 + 0.02]) trim.add(at(rbox(0.14, BH, 0.14, mat(COL.blue), 0.04), x, BH / 2, FZ + 0.02));
    this.piece(this.after, 'trim', trim);

    // ---------- stage 6 ----------
    // U20: shutter material only (see refresh)
    // U21: standing sign, waiting bench, yard lights
    const os = new THREE.Group();
    os.add(at(rbox(0.9, 1.4, 0.14, mat(COL.blueDark), 0.06), 0, 0.9, 0));
    os.add(at(card(0.84, 1.3, openSignTex(), { emissive: true }), 0, 0.9, 0.075));
    os.add(at(rbox(0.6, 0.12, 0.4, mat(COL.steel), 0.03), 0, 0.1, 0));
    this.piece(this.after, 'finish', at(os, 3.4, 0.08, 3.0, -0.4), 0);
    const bench = new THREE.Group();
    bench.add(at(rbox(1.5, 0.08, 0.45, mat(COL.gold), 0.03), 0, 0.46, 0));
    bench.add(at(rbox(1.5, 0.36, 0.06, mat(COL.gold), 0.03), 0, 0.72, -0.2));
    for (const dx of [-0.65, 0.65]) bench.add(at(rbox(0.06, 0.46, 0.4, mat('#2b2f36'), 0.02), dx, 0.23, 0));
    this.piece(this.after, 'finish', at(bench, -1.0, 0.08, 3.9), 0.14);
    for (const x of [-4.2, 4.2]) {
      const post = new THREE.Group();
      post.add(at(cyl(0.05, 0.06, 2.0, mat('#2b2f36', { metal: 0.4 })), 0, 1.0, 0));
      post.add(at(sphere(0.16, mat('#fff3c0', { emissive: '#ffcf6b', ei: 1.2 })), 0, 2.05, 0));
      this.piece(this.after, 'finish', at(post, x, 0.08, 4.4), 0.26);
    }
    // U22: bunting across the front and balloons
    const bunt = new THREE.Group();
    const cols = [COL.blue, COL.gold, '#e0569b', '#4fbf9f', COL.white];
    for (let i = 0; i < 14; i++) {
      const tri = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 3), mat(cols[i % cols.length]));
      tri.rotation.x = Math.PI;
      tri.position.set(-3.4 + i * 0.52, BH + 0.55 - Math.sin((i / 13) * Math.PI) * 0.3, FZ + 0.45);
      bunt.add(tri);
    }
    for (const [x, col] of [[-3.6, '#e0569b'], [-3.3, COL.gold], [3.5, COL.blue], [3.8, '#4fbf9f']] as const) {
      const b = sphere(0.24, mat(col, { rough: 0.25 }));
      b.scale.set(1, 1.2, 1);
      bunt.add(at(b, x, 2.6 + (x > 0 ? 0.2 : 0), 3.2));
    }
    this.piece(this.after, 'grand', bunt);

    // tools that act during the animations
    this.broom = new THREE.Group();
    this.broom.add(at(cyl(0.03, 0.03, 1.4, mat(COL.wood)), 0, 0.7, 0));
    this.broom.add(at(rbox(0.5, 0.18, 0.12, mat('#f2b632'), 0.03), 0, 0.05, 0));
    this.broom.visible = false;
    this.add(this.broom);
    this.roller = new THREE.Group();
    this.roller.add(at(cyl(0.12, 0.12, 0.7, mat('#ffffff')), 0, 0, 0)).rotation.z = Math.PI / 2;
    this.roller.add(at(cyl(0.025, 0.025, 1.2, mat('#2b2f36')), 0.0, -0.65, 0.08));
    this.roller.visible = false;
    this.add(this.roller);
    // confetti for the grand opening
    for (let i = 0; i < 70; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.16), new THREE.MeshBasicMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide }));
      p.visible = false;
      this.confetti.push(p);
      this.add(p);
    }
  }

  sideMesh!: THREE.Mesh;

  private tree(x: number, z: number, s: number): void {
    const g = new THREE.Group();
    g.add(at(cyl(0.16 * s, 0.22 * s, 2.2 * s, mat(COL.woodDark)), 0, 1.1 * s, 0));
    for (const [dx, dy, r] of [[0, 2.6, 1.0], [-0.6, 2.2, 0.75], [0.6, 2.25, 0.7], [0.1, 3.2, 0.7]] as const) g.add(at(sphere(r * s, mat(dy > 2.5 ? COL.green : COL.greenDark, { rough: 0.8 })), dx * s, dy * s, 0));
    this.add(at(g, x, 0.08, z));
  }

  private plant(s: number): THREE.Group {
    const g = new THREE.Group();
    g.add(at(cyl(0.22 * s, 0.17 * s, 0.4 * s, mat(COL.pot)), 0, 0.2 * s, 0));
    for (const [dx, dy, r] of [[0, 0.62, 0.3], [-0.16, 0.52, 0.22], [0.17, 0.5, 0.22], [0.02, 0.82, 0.2]] as const) g.add(at(sphere(r * s, mat(COL.green, { rough: 0.75 })), dx * s, dy * s, 0));
    return g;
  }

  // ---------- state ----------

  /**
   * Show the shop with the upgrades in `have`. An upgrade in progress is given by
   * `anim`: its pieces are drawn at `t` (0 = before, 1 = after) in its own way.
   */
  pose(have: ReadonlySet<VisualId>, anim: { v: VisualId; kind: AnimKind; t: number } | null, scene: { open?: number; night?: number } = {}): void {
    const k = (v: VisualId) => (anim && anim.v === v ? anim.t : have.has(v) ? 1 : 0);
    const ease = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };
    const back = (x: number) => { const c = Math.min(1, Math.max(0, x)); const s = 1.7; return 1 + (s + 1) * Math.pow(c - 1, 3) + s * Math.pow(c - 1, 2); };
    // what goes away
    for (const [v, list] of this.before) {
      const t = k(v);
      list.forEach((p) => {
        const kind = anim?.v === v ? anim.kind : 'pop';
        const q = ease((t - p.delay) * 1.6);
        if (kind === 'sign') {
          // the old sign drops off and fades
          p.obj.visible = t < 0.45;
          p.obj.position.set(p.base.x, p.base.y - ease(t / 0.4) * 3, p.base.z + ease(t / 0.4) * 0.6);
          p.obj.rotation.z = ease(t / 0.4) * 0.5;
        } else {
          p.obj.visible = q < 0.999;
          p.obj.scale.copy(p.scale).multiplyScalar(Math.max(0.001, 1 - q));
        }
      });
    }
    // what comes in
    for (const [v, list] of this.after) {
      const t = k(v);
      const kind = anim?.v === v ? anim.kind : 'pop';
      list.forEach((p) => {
        let s = 1, dy = 0;
        if (kind === 'sign') {
          const q = (t - 0.45) / 0.45;
          dy = (1 - ease(q)) * 2.5;
          s = q <= 0 ? 0 : 1;
        } else if (kind === 'awning') {
          const q = ease(t);
          p.obj.rotation.x = -(1 - q) * 1.3;
          s = q <= 0 ? 0 : 1;
        } else if (kind === 'lamp' || kind === 'plaster') {
          s = t <= 0 ? 0 : 1;
          if (kind === 'plaster') p.obj.scale.set(p.scale.x * Math.max(0.001, ease(t)), p.scale.y, p.scale.z);
        } else {
          const q = (t - p.delay) / 0.5;
          s = q <= 0 ? 0 : back(q);
        }
        p.obj.visible = s > 0.001;
        if (kind !== 'plaster') p.obj.scale.copy(p.scale).multiplyScalar(Math.max(0.001, s));
        p.obj.position.set(p.base.x, p.base.y + dy, p.base.z);
      });
    }
    // the wall wears its state: cracked → patched → painted
    const wallT = k('paint') >= 0.5 || (anim?.v === 'paint') ? 'new' : k('wall') >= 0.5 ? 'patched' : 'old';
    const paintT = anim?.v === 'paint' ? anim.t : k('paint');
    const wm = this.wallMesh.material as THREE.MeshStandardMaterial;
    const sm = this.sideMesh.material as THREE.MeshStandardMaterial;
    const wantMap = wallT === 'new' ? this.wallTexNew : wallT === 'patched' ? this.wallTexPatched : this.wallTexOld;
    if (anim?.v === 'paint') {
      // the new colour follows the roller across the wall
      wm.map = this.wallTexNew; sm.map = paintT > 0.9 ? this.wallTexNew : this.wallTexPatched;
      this.wallMesh.scale.x = Math.max(0.001, paintT);
      this.wallMesh.position.x = -(BW - 0.1) / 2 * (1 - paintT);
      this.wallUnder.visible = true;
    } else {
      wm.map = wantMap; sm.map = wantMap;
      this.wallMesh.scale.x = 1; this.wallMesh.position.x = 0;
      this.wallUnder.visible = false;
    }
    if (anim?.v === 'wall') {
      // cracks fade under the trowel
      wm.map = anim.t < 0.5 ? this.wallTexOld : this.wallTexPatched;
      sm.map = wm.map;
    }
    wm.needsUpdate = true; sm.needsUpdate = true;
    this.wallUnderMat.map = this.wallTexPatched;
    // the shutter's material
    const sh = this.shutterMesh.material as THREE.MeshStandardMaterial;
    const shState = k('shutter2') >= 0.5 ? 'premium' : k('shutter') >= 0.5 ? 'silver' : 'rust';
    sh.map = this.shutterTexs[shState]; sh.needsUpdate = true;
    const shAnim = anim && (anim.v === 'shutter' || anim.v === 'shutter2') ? anim.t : -1;
    // the shutter rolls up, changes, rolls down
    const lift = shAnim < 0 ? (scene.open ?? 0) : shAnim < 0.4 ? ease(shAnim / 0.4) : shAnim < 0.6 ? 1 : 1 - ease((shAnim - 0.6) / 0.4);
    this.shutterMesh.scale.y = Math.max(0.02, 1 - lift * 0.92);
    this.shutterMesh.position.y = 0.08 + (2.5 / 2) * (1 - lift * 0.92) + lift * 0.92 * 2.5;
    // the lamp: dim and flickering until fixed, flickers back to life during U03
    const lampOn = anim?.v === 'lamp' ? (anim.t > 0.6 ? 1 : Math.sin(anim.t * 60) > 0.3 ? 0.8 : 0.05) : have.has('lamp') ? 1 : (Math.sin(this.time * 23) > 0.85 ? 0.05 : 0.22);
    // at night a working lamp shines brighter and further
    const nightK = scene.night ?? 0;
    (this.lampBulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + lampOn * (2.2 + nightK * 2);
    this.lampLight.intensity = lampOn * (3.5 + nightK * 6);
    // the tools at work
    this.broom.visible = anim?.v === 'yard' && anim.t < 0.85;
    if (this.broom.visible) {
      const t = anim!.t;
      this.broom.position.set(-2.6 + t * 6.2, 0.08, 3.1 + Math.sin(t * 30) * 0.25);
      this.broom.rotation.z = Math.sin(t * 30) * 0.35;
    }
    this.roller.visible = anim?.v === 'paint' && anim.t < 0.98;
    if (this.roller.visible) {
      const t = anim!.t;
      this.roller.position.set(-BW / 2 + t * BW, 1.0 + Math.abs(Math.sin(t * Math.PI * 4)) * 2.0, FZ + 0.18);
    }
    // grand opening confetti
    const g = anim?.v === 'grand' ? anim.t : -1;
    this.confetti.forEach((p, i) => {
      p.visible = g > 0.25;
      if (!p.visible) return;
      const q = (g - 0.25) / 0.75;
      const a = i * 2.39996;
      p.position.set(Math.cos(a) * (1 + (i % 7) * 0.55), 6 - q * (5 + (i % 5)), 2.5 + Math.sin(a) * 1.5);
      p.rotation.set(q * 12 + i, q * 9, i);
    });
  }

  private wallUnderMat = new THREE.MeshStandardMaterial({ roughness: 0.62 });
  /** The patched wall under the fresh paint while the roller is still going. */
  private wallUnder = (() => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.1, BH - 0.1), this.wallUnderMat);
    m.position.set(0, BH / 2 + 0.08, FZ + 0.001);
    m.visible = false;
    this.scene.add(m);
    return m;
  })();

  /** Put the repaired gadgets (their thumbnails) on the showcase shelves. */
  setShowcase(pics: (HTMLCanvasElement | null)[]): void {
    this.showcaseSlots.forEach((slot, i) => {
      const pic = pics[i];
      const m = slot.material as THREE.MeshBasicMaterial;
      if (m.map) { m.map.dispose(); m.map = null; }
      if (pic) {
        const t = new THREE.CanvasTexture(pic);
        t.colorSpace = THREE.SRGBColorSpace;
        m.map = t;
        m.opacity = 1;
      } else m.opacity = 0;
      m.needsUpdate = true;
    });
  }

  // ---------- camera ----------

  focus(area: Area | null): void {
    if (!area) { this.want = { x: -0.3, y: 1.7, z: 1.2, zoom: 1 }; return; }
    const [x, y, z, zoom] = FOCUS[area];
    this.want = { x, y, z, zoom };
  }

  /** Pull the camera back over the whole street (the grand opening). */
  wide(): void { this.want = { x: -1.0, y: 1.9, z: 0.8, zoom: 0.72 }; }

  private place(w: number, h: number): void {
    const f = 0.12;
    for (const key of ['x', 'y', 'z', 'zoom'] as const) this.look[key] += (this.want[key] - this.look[key]) * f;
    this.camera.aspect = w / h;
    // a portrait screen needs to stand further back to fit the shop's width
    const fit = Math.max(1, 0.95 / (w / h));
    const dist = (22 * fit) / (this.look.zoom * 1.55);
    const dir = new THREE.Vector3(0.42, 0.3, 1).normalize();
    this.camera.position.set(this.look.x + dir.x * dist, this.look.y + dir.y * dist, this.look.z + dir.z * dist);
    this.camera.lookAt(this.look.x, this.look.y, this.look.z);
    this.camera.updateProjectionMatrix();
  }

  render(w: number, h: number, dpr: number, dt: number): HTMLCanvasElement {
    this.time += dt;
    const px = Math.min(dpr, 2);
    const cw = Math.round(w * px), ch = Math.round(h * px);
    if (this.renderer.domElement.width !== cw || this.renderer.domElement.height !== ch) this.renderer.setSize(cw, ch, false);
    this.place(w, h);
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement;
  }

  /** Which area of the shop is under a point of the view (0..1 in both axes). */
  areaAt(nx: number, ny: number): Area | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(nx * 2 - 1, -(ny * 2 - 1)), this.camera);
    const objs = this.pickables.filter((p) => p.obj.visible).map((p) => p.obj);
    for (const hit of ray.intersectObjects(objs, true)) {
      let o: THREE.Object3D | null = hit.object;
      while (o) {
        const p = this.pickables.find((q) => q.obj === o);
        if (p) return p.area;
        o = o.parent;
      }
    }
    return null;
  }

  /** Screen position (0..1) of an area's focus point, for the pins. */
  areaScreen(area: Area): { x: number; y: number } {
    const [x, y, z] = FOCUS[area];
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
  }
}

let shared: Storefront | null = null;
let failed = false;

/** The one storefront (built on first use); null without WebGL. */
export function storefront(): Storefront | null {
  if (shared) return shared;
  if (failed) return null;
  try {
    shared = new Storefront();
  } catch {
    failed = true;
    return null;
  }
  return shared;
}
