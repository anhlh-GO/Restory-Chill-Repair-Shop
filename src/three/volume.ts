// Volumetric part bodies. Instead of a flat extruded slab, the top surface is
// a height field over the part's outline: its height follows the distance to
// the nearest edge through a quarter circle of radius `round`, so a wide
// `round` turns a strip into a half tube (the dryer barrel), a T into two
// joined tubes, and a box into a soft pillow. Base shells with a `cavity` get
// a real tub: a rounded rim `wall` wide, then a drop to the floor.
//
// Coordinates: device units, x right, device y → world +z, height → world +y.
// The cap keeps planar top-down UVs, so the part's painted face still fits.

import Delaunator from 'delaunator';
import { THREE } from './stage';
import { outlineOf, type Pts } from '../core/draw';
import type { PartDef } from '../content/device';

export interface Surface {
  /** Height of the top surface above the part's bottom, 0 outside the outline. */
  heightAt(x: number, y: number): number;
  thick: number;
}

interface BB { x0: number; x1: number; y0: number; y1: number }

const EDGE = 1.2; // the little vertical lip at the very edge

function polysOf(def: PartDef, bb: BB): Pts[] {
  const o = outlineOf(def.shape);
  if (!o) return [[[bb.x0, bb.y0], [bb.x1, bb.y0], [bb.x1, bb.y1], [bb.x0, bb.y1]]];
  return [o.pts, ...(o.holes ?? [])];
}

function inPoly(x: number, y: number, p: Pts): boolean {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}

const cache = new WeakMap<PartDef, Map<number, Surface>>();

/** Shape of the top surface for a part at a given thickness (cached). */
export function surfaceOf(def: PartDef, thick: number, bb: BB): Surface {
  let m = cache.get(def);
  if (!m) cache.set(def, (m = new Map()));
  const hit = m.get(thick);
  if (hit) return hit;
  const polys = polysOf(def, bb);
  const hollow = def.cavity !== undefined && def.z === 0;
  const wall = def.wall ?? 8;
  const R = Math.max(0.5, def.round ?? (hollow ? thick * 0.5 : Math.min(thick * 0.45, 8)));
  const floor = hollow ? Math.max(1.5, thick - (def.cavity ?? 10)) : 0;
  const outer = (d: number) => {
    const t = Math.min(1, d / R);
    return EDGE + (thick - EDGE) * Math.sqrt(1 - (1 - t) * (1 - t));
  };
  const dist = (x: number, y: number) => {
    let best = Infinity;
    for (const p of polys) for (let i = 0, j = p.length - 1; i < p.length; j = i++) best = Math.min(best, segDist(x, y, p[j][0], p[j][1], p[i][0], p[i][1]));
    return best;
  };
  const inside = (x: number, y: number) => inPoly(x, y, polys[0]) && !polys.slice(1).some((h) => inPoly(x, y, h));
  const s: Surface & { dist: typeof dist; inside: typeof inside; hollow: boolean; wall: number; R: number } = {
    thick, dist, inside, hollow, wall, R,
    heightAt(x, y) {
      if (!inside(x, y)) return 0;
      const d = dist(x, y);
      if (!hollow || d <= wall) return outer(d);
      // inner wall falls to the floor over a few units
      const k = Math.min(1, (d - wall) / 3);
      const e = k * k * (3 - 2 * k);
      return outer(wall) * (1 - e) + floor * e;
    },
  };
  m.set(thick, s);
  return s;
}

function densify(p: Pts, step: number): Pts {
  const out: Pts = [];
  for (let i = 0; i < p.length; i++) {
    const [ax, ay] = p[i], [bx, by] = p[(i + 1) % p.length];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return out;
}

/**
 * Body geometry: group 0 = the painted top, group 1 = bottom + edge lip.
 */
export function buildVolume(def: PartDef, thick: number, bb: BB): { geo: THREE.BufferGeometry; surface: Surface } {
  const surf = surfaceOf(def, thick, bb) as Surface & { dist(x: number, y: number): number; inside(x: number, y: number): boolean; hollow: boolean; wall: number; R: number };
  const polys = polysOf(def, bb);
  const w = bb.x1 - bb.x0, h = bb.y1 - bb.y0;
  const step = Math.max(1.6, Math.min(6, Math.max(w, h) / 64));

  // sample points: the outline (d = 0) plus an interior grid, denser where the surface bends
  const rings = polys.map((p) => densify(p, step * 0.8));
  const xs: number[] = [];
  for (const r of rings) for (const [x, y] of r) xs.push(x, y);
  const nB = xs.length / 2;
  const R = surf.R;
  for (let y = bb.y0 + step / 2; y < bb.y1; y += step / 2) {
    for (let x = bb.x0 + step / 2; x < bb.x1; x += step / 2) {
      const half = (Math.round((x - bb.x0) / (step / 2)) % 2) + (Math.round((y - bb.y0) / (step / 2)) % 2);
      if (!surf.inside(x, y)) continue;
      const d = surf.dist(x, y);
      if (d < step * 0.4) continue;
      // full density on the bends (edge fillet, the tub's inner wall), every other point on the flats
      const bend = d < Math.min(R, thick) + step || (surf.hollow && Math.abs(d - surf.wall - 1.5) < 4);
      if (!bend && half !== 0) continue;
      xs.push(x, y);
    }
  }
  const tri = new Delaunator(xs).triangles;

  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const nV = xs.length / 2;
  const U = (x: number) => (x - bb.x0) / w, V = (y: number) => (bb.y1 - y) / h;
  for (let i = 0; i < nV; i++) {
    const x = xs[i * 2], y = xs[i * 2 + 1];
    pos.push(x, i < nB ? EDGE : surf.heightAt(x, y), y);
    uv.push(U(x), V(y));
  }
  const keep: [number, number, number][] = [];
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t], b = tri[t + 1], c = tri[t + 2];
    const ax = xs[a * 2], ay = xs[a * 2 + 1], bx = xs[b * 2], by = xs[b * 2 + 1], cx = xs[c * 2], cy = xs[c * 2 + 1];
    // drop triangles that bridge across a notch or a hole
    if (!surf.inside((ax + bx + cx) / 3, (ay + by + cy) / 3)) continue;
    if (!surf.inside((ax + bx) / 2, (ay + by) / 2) && Math.hypot(ax - bx, ay - by) > step) continue;
    if (!surf.inside((bx + cx) / 2, (by + cy) / 2) && Math.hypot(bx - cx, by - cy) > step) continue;
    if (!surf.inside((cx + ax) / 2, (cy + ay) / 2) && Math.hypot(cx - ax, cy - ay) > step) continue;
    // face up (+y): in (x, z) the winding must be clockwise seen from above
    const cr = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    keep.push(cr < 0 ? [a, b, c] : [a, c, b]);
  }
  for (const [a, b, c] of keep) idx.push(a, b, c);
  const capCount = idx.length;

  // bottom: the same triangles flat at y = 0, facing down
  const off = nV;
  for (let i = 0; i < nV; i++) { pos.push(xs[i * 2], 0, xs[i * 2 + 1]); uv.push(U(xs[i * 2]), V(xs[i * 2 + 1])); }
  for (const [a, b, c] of keep) idx.push(off + a, off + c, off + b);
  // the lip around every ring
  for (const r of rings) {
    const n = r.length;
    const base = pos.length / 3;
    for (const [x, y] of r) { pos.push(x, 0, y, x, EDGE, y); uv.push(U(x), V(y), U(x), V(y)); }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      idx.push(base + i * 2, base + j * 2, base + i * 2 + 1, base + j * 2, base + j * 2 + 1, base + i * 2 + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.addGroup(0, capCount, 0);
  geo.addGroup(capCount, idx.length - capCount, 1);
  geo.computeVertexNormals();
  return { geo, surface: surf };
}
