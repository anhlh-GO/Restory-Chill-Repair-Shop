// Shop props shared by the workbench and the counter: pen cup, desk lamp,
// photo frame, coffee mug, service bell, potted plant, plus the wood and
// cutting-mat surfaces. Sizes are in design pixels (scale the group by U);
// every prop stands on y = 0 with its front facing +z.

import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { THREE } from './stage';
import { std, shadowed } from './models';
import { rng } from '../core/draw';

const Y = new THREE.Vector3(0, 1, 0);

/** A cylinder rod from a to b. */
function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material): THREE.Mesh {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 14), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(Y, d.normalize());
  return m;
}

function canvasTex(w: number, h: number, paint: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  paint(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------------- props ----------------

/** Glazed terracotta cup with a handle and a few pens. */
export function makePenCup(): THREE.Group {
  const g = new THREE.Group();
  const glaze = std(0xd9652c, 'plastic', { roughness: 0.25 });
  const inside = std(0x5a2410, 'rubber');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(15, 13.5, 32, 28, 1, true), glaze);
  body.position.y = 16;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(13, 12, 30, 28, 1, true), std(0x7a3418, 'rubber', { side: THREE.BackSide }));
  inner.position.y = 17;
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(13.5, 13.5, 2, 28), inside);
  floor.position.y = 3;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(14, 1.2, 8, 28), glaze);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 32;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(8, 2.4, 10, 20, Math.PI * 1.2), glaze);
  handle.rotation.z = -Math.PI * 0.6;
  handle.position.set(14.5, 16, 0);
  g.add(body, inner, floor, rim, handle);
  const pens: [number, number, number, number][] = [[-5, -3, 0x3fa34d, 0.22], [3, 4, 0xe8424f, -0.18], [6, -4, 0xf5c638, 0.3], [-3, 5, 0x3b7ff0, -0.25]];
  for (const [x, z, col, lean] of pens) {
    const pen = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 46, 10), std(col, 'plastic', { roughness: 0.3 }));
    barrel.position.y = 23;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 9, 10), std(0x2b2b33, 'plastic'));
    cap.position.y = 44;
    pen.add(barrel, cap);
    pen.position.set(x, 4, z);
    pen.rotation.set(lean * 0.6, 0, lean);
    g.add(pen);
  }
  return shadowed(g);
}

/** Articulated desk lamp. The head leans over to the left (−x) and shines down. */
export function makeLamp(color = 0x2c3a5c): THREE.Group {
  const g = new THREE.Group();
  const paint = std(color, 'metal', { metalness: 0.35, roughness: 0.35 });
  const joint = std(0xd24a3a, 'plastic');
  const base = new THREE.Mesh(new THREE.CylinderGeometry(20, 23, 6, 32), paint);
  base.position.y = 3;
  const P0 = new THREE.Vector3(0, 6, 0);
  const P1 = new THREE.Vector3(10, 62, -6);
  const P2 = new THREE.Vector3(-26, 96, 4);
  g.add(base, rod(P0, P1, 2.6, paint), rod(P1, P2, 2.6, paint));
  for (const p of [P0, P1, P2]) {
    const j = new THREE.Mesh(new THREE.SphereGeometry(4.2, 14, 10), joint);
    j.position.copy(p);
    g.add(j);
  }
  // spring along the lower arm
  const spring = rod(P0.clone().add(new THREE.Vector3(5, 6, 0)), P1.clone().add(new THREE.Vector3(5, -8, 0)), 1.1, std(0xb7bcc4, 'metal'));
  g.add(spring);
  // the shade: an open cone with the bulb inside
  const dir = new THREE.Vector3(-0.55, -1, 0.35).normalize();
  const head = new THREE.Group();
  head.position.copy(P2);
  head.quaternion.setFromUnitVectors(Y, dir.clone().negate());
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(6, 21, 26, 28, 1, true), std(color, 'metal', { metalness: 0.35, roughness: 0.35, side: THREE.DoubleSide }));
  shade.position.y = -14;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint);
  cap.position.y = -2;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 12), new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffe7a8, emissiveIntensity: 1.6 }));
  bulb.position.y = -20;
  head.add(shade, cap, bulb);
  g.add(head);
  shadowed(g);
  bulb.castShadow = false;
  return g;
}

/** Wooden photo frame on a little stand, picture on the front. */
export function makeFrame(): THREE.Group {
  const g = new THREE.Group();
  const wood = std(0x6b4a2e, 'plastic', { roughness: 0.55 });
  const frame = new THREE.Group();
  const W = 38, H = 48, T = 4, b = 5;
  frame.add(new THREE.Mesh(new RoundedBoxGeometry(W, H, T, 2, 1.4), wood));
  const photo = canvasTex(128, 160, (c) => {
    const sky = c.createLinearGradient(0, 0, 0, 160);
    sky.addColorStop(0, '#9fd0f0'); sky.addColorStop(1, '#e8f2d8');
    c.fillStyle = sky; c.fillRect(0, 0, 128, 160);
    c.fillStyle = '#7cc06a'; c.fillRect(0, 118, 128, 42);
    c.fillStyle = '#f2c6a0'; c.beginPath(); c.arc(50, 70, 16, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3a2a40'; c.beginPath(); c.arc(50, 64, 17, Math.PI, 0); c.fill();
    c.fillStyle = '#e8665a'; c.fillRect(32, 88, 36, 40);
    c.fillStyle = '#f2c6a0'; c.beginPath(); c.arc(88, 84, 12, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7a4a2a'; c.beginPath(); c.arc(88, 79, 13, Math.PI, 0); c.fill();
    c.fillStyle = '#6fa0d8'; c.fillRect(75, 98, 26, 30);
  });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(W - b * 2, H - b * 2), std(0xffffff, 'glass', { map: photo, roughness: 0.15 }));
  pic.position.z = T / 2 + 0.05;
  frame.add(pic);
  frame.position.set(0, H / 2 * Math.cos(0.18), 0);
  frame.rotation.x = -0.18;
  const leg = new THREE.Mesh(new THREE.BoxGeometry(6, H * 0.8, 2), wood);
  leg.position.set(0, H * 0.38, -10);
  leg.rotation.x = 0.35;
  g.add(frame, leg);
  return shadowed(g);
}

/** Coffee mug, half full. */
export function makeMug(color = 0xf4efe2): THREE.Group {
  const g = new THREE.Group();
  const cer = std(color, 'plastic', { roughness: 0.3 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(13, 12, 28, 28, 1, true), cer);
  body.position.y = 14;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(11.6, 11, 27, 28, 1, true), std(color, 'plastic', { side: THREE.BackSide }));
  inner.position.y = 14.5;
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 2, 28), cer);
  bottom.position.y = 1;
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(11.4, 28), std(0x4a2a16, 'glass', { roughness: 0.1 }));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 22;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(12.3, 1, 8, 28), cer);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 28;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(7, 2.2, 10, 20, Math.PI * 1.1), cer);
  handle.rotation.z = -Math.PI * 0.55;
  handle.position.set(12.5, 14, 0);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(13.05, 12.6, 6, 28, 1, true), std(0xe8665a, 'plastic'));
  band.position.y = 16;
  g.add(body, inner, bottom, coffee, rim, handle, band);
  return shadowed(g);
}

/** Brass service bell on a wooden base. */
export function makeBell(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(17, 18, 5, 32), std(0x4a2e1c, 'plastic', { roughness: 0.5 }));
  base.position.y = 2.5;
  const brass = std(0xe0b04a, 'metal', { metalness: 0.9, roughness: 0.22 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(14, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), brass);
  dome.position.y = 5;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 6, 10), brass);
  stem.position.y = 21;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(3.2, 14, 10), brass);
  knob.position.y = 24;
  g.add(base, dome, stem, knob);
  return shadowed(g);
}

/** Small potted plant: a few broad leaves. */
export function makePlant(): THREE.Group {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(15, 11, 24, 24), std(0xc9d2dc, 'plastic', { roughness: 0.35 }));
  pot.position.y = 12;
  const soil = new THREE.Mesh(new THREE.CircleGeometry(14, 24), std(0x3b2a1e, 'rubber'));
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 23;
  g.add(pot, soil);
  const leaf = new THREE.SphereGeometry(1, 14, 10);
  const r = rng(11);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r() * 0.4;
    const m = new THREE.Mesh(leaf, std(i % 2 ? 0x4f9e4a : 0x3c8a3e, 'plastic', { roughness: 0.45 }));
    m.scale.set(6, 2, 15);
    const tilt = 0.7 + r() * 0.3;
    m.position.set(Math.cos(a) * 10, 34 + r() * 8, Math.sin(a) * 10);
    m.rotation.set(0, -a + Math.PI / 2, 0);
    m.rotateX(-tilt);
    g.add(m);
  }
  return shadowed(g);
}

/** Rubber cleaning pad with a yellow frame, w × d (world units already). */
export function makeCleanPad(w: number, d: number, U: number): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new RoundedBoxGeometry(w, 5 * U, d, 3, 4 * U), std(0xf2b33a, 'plastic', { roughness: 0.4 }));
  frame.position.y = 2.5 * U;
  const b = 9 * U;
  const rubber = new THREE.Mesh(new RoundedBoxGeometry(w - b * 2, 2 * U, d - b * 2, 2, 3 * U), std(0x26282e, 'rubber'));
  rubber.position.y = 5.2 * U;
  g.add(frame, rubber);
  return shadowed(g);
}

// ---------------- surfaces ----------------

/** Planked wood, `planks` boards across. */
export function woodTexture(w: number, h: number, planks: number, base = '#7a4f30', vertical = false): THREE.CanvasTexture {
  return canvasTex(w, h, (c) => {
    const r = rng(23);
    const n = planks;
    const L = vertical ? w : h;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * L, b2 = ((i + 1) / n) * L;
      const k = 0.85 + r() * 0.25;
      c.fillStyle = shadeHex(base, k);
      if (vertical) c.fillRect(a, 0, b2 - a, h); else c.fillRect(0, a, w, b2 - a);
      // grain
      c.strokeStyle = 'rgba(40,20,10,0.16)';
      c.lineWidth = 1;
      for (let j = 0; j < 7; j++) {
        const o = a + (b2 - a) * r();
        c.beginPath();
        if (vertical) { c.moveTo(o, 0); c.bezierCurveTo(o + 4, h * 0.3, o - 4, h * 0.7, o + 2, h); }
        else { c.moveTo(0, o); c.bezierCurveTo(w * 0.3, o + 4, w * 0.7, o - 4, w, o + 2); }
        c.stroke();
      }
      c.fillStyle = 'rgba(0,0,0,0.35)';
      if (vertical) c.fillRect(b2 - 2, 0, 2, h); else c.fillRect(0, b2 - 2, w, 2);
    }
  });
}

function shadeHex(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/**
 * Blue self-healing cutting mat, w × d world units, with a grid every `cell`
 * units, ruler numbers along the far edge and the usual angle guides.
 */
export function makeMat(w: number, d: number, cell: number, color = '#2f5189'): THREE.Mesh {
  const px = 2;
  const tw = Math.min(2048, Math.ceil(w * px)), th = Math.min(4096, Math.ceil(d * px));
  const sx = tw / w, sy = th / d;
  const tex = canvasTex(tw, th, (c) => {
    c.fillStyle = color;
    c.fillRect(0, 0, tw, th);
    c.scale(sx, sy);
    const m = cell * 0.6; // border
    for (let i = 0; m + i * cell / 2 <= w - m + 0.1; i++) {
      const x = m + (i * cell) / 2;
      c.strokeStyle = i % 2 ? 'rgba(255,255,255,0.08)' : i % 10 === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)';
      c.lineWidth = i % 2 ? 0.8 : 1.3;
      c.beginPath(); c.moveTo(x, m); c.lineTo(x, d - m); c.stroke();
    }
    for (let j = 0; m + j * cell / 2 <= d - m + 0.1; j++) {
      const y = m + (j * cell) / 2;
      c.strokeStyle = j % 2 ? 'rgba(255,255,255,0.08)' : j % 10 === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)';
      c.lineWidth = j % 2 ? 0.8 : 1.3;
      c.beginPath(); c.moveTo(m, y); c.lineTo(w - m, y); c.stroke();
    }
    c.strokeStyle = 'rgba(255,255,255,0.12)';
    c.lineWidth = 1.4;
    c.beginPath(); c.arc(m, d - m, w * 0.85, -Math.PI / 2, 0); c.stroke();
    c.beginPath(); c.moveTo(m, d * 0.45); c.lineTo(w - m, d * 0.85); c.stroke();
    c.beginPath(); c.moveTo(w - m, d * 0.3); c.lineTo(m, d * 0.7); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.font = `bold ${cell * 0.32}px sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (let i = 1; m + i * cell * 2 < w - m; i++) c.fillText(String(i * 2), m + i * cell * 2, m * 0.5);
    for (let j = 1; m + j * cell * 2 < d - m; j++) c.fillText(String(j * 2), m * 0.5, m + j * cell * 2);
  });
  const top = std(0xffffff, 'rubber', { map: tex, roughness: 0.8 });
  const edge = std(0x22406e, 'rubber');
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), [edge, edge, top, edge, edge, edge]);
  mesh.position.y = -1.5;
  mesh.receiveShadow = true;
  return mesh;
}
