// Drawing helpers: the "chunky toy 3D" look of the reference — a lit top face,
// a darker extruded side, a soft shadow thrown down-left by the desk lamp.

export type C = CanvasRenderingContext2D;

export const FONT_HAND = '"Patrick Hand", "Comic Sans MS", "Chalkboard SE", cursive';
export const FONT_BOLD = '"Baloo 2", "Patrick Hand", "Arial Rounded MT Bold", sans-serif';

// ---------- colour ----------

function parse(hex: string): [number, number, number] {
  // shade()/mix() results come back in as rgb(...): accept those too
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(hex);
  if (m) return [+m[1], +m[2], +m[3]];
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** amt > 0 lightens toward white, < 0 darkens toward black. */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = parse(hex);
  const f = (v: number) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = parse(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function mix(a: string, b: string, k: number): string {
  const A = parse(a), B = parse(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * k)},${Math.round(A[1] + (B[1] - A[1]) * k)},${Math.round(A[2] + (B[2] - A[2]) * k)})`;
}

// ---------- rng ----------

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- paths ----------

export function rr(c: C | Path2D, x: number, y: number, w: number, h: number, r: number): void {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** Rounded rect centred on (cx, cy). */
export function rrc(c: C | Path2D, cx: number, cy: number, w: number, h: number, r: number): void {
  rr(c, cx - w / 2, cy - h / 2, w, h, r);
}

// Shapes carry their outline as points too, so the 3D layer can extrude them.

export type Pts = [number, number][];
export interface Outline { pts: Pts; holes?: Pts[] }
export type ShapePath = Path2D & { outline?: Outline };

export function outlineOf(p: Path2D): Outline | undefined {
  return (p as ShapePath).outline;
}

function ptsToPath(o: Outline): ShapePath {
  const p = new Path2D() as ShapePath;
  const add = (pts: Pts, rev: boolean) => {
    const list = rev ? [...pts].reverse() : pts;
    p.moveTo(list[0][0], list[0][1]);
    for (let i = 1; i < list.length; i++) p.lineTo(list[i][0], list[i][1]);
    p.closePath();
  };
  add(o.pts, false);
  // holes wound the other way so nonzero fill / hit tests leave them empty
  for (const h of o.holes ?? []) add(h, true);
  p.outline = o;
  return p;
}

/** Polygon with a corner radius per vertex: [x, y, r][] (screen-style y down). */
export function roundedPts(v: [number, number, number][], seg = 6): Pts {
  const out: Pts = [];
  const n = v.length;
  for (let i = 0; i < n; i++) {
    const [px, py] = v[(i - 1 + n) % n];
    const [x, y, r] = v[i];
    const [nx, ny] = v[(i + 1) % n];
    if (r <= 0) { out.push([x, y]); continue; }
    const d1 = Math.hypot(px - x, py - y), d2 = Math.hypot(nx - x, ny - y);
    const t = Math.min(r, d1 / 2, d2 / 2);
    const ax = x + ((px - x) / d1) * t, ay = y + ((py - y) / d1) * t;
    const bx = x + ((nx - x) / d2) * t, by = y + ((ny - y) / d2) * t;
    for (let k = 0; k <= seg; k++) {
      const u = k / seg;
      out.push([
        (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * x + u * u * bx,
        (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * y + u * u * by,
      ]);
    }
  }
  return out;
}

export function rrPts(cx: number, cy: number, w: number, h: number, r: number): Pts {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  r = Math.min(r, w / 2, h / 2);
  const out: Pts = [];
  const corner = (ox: number, oy: number, a0: number) => {
    for (let k = 0; k <= 6; k++) {
      const a = a0 + (k / 6) * (Math.PI / 2);
      out.push([ox + Math.cos(a) * r, oy + Math.sin(a) * r]);
    }
  };
  corner(x1 - r, y0 + r, -Math.PI / 2);
  corner(x1 - r, y1 - r, 0);
  corner(x0 + r, y1 - r, Math.PI / 2);
  corner(x0 + r, y0 + r, Math.PI);
  return out;
}

export function ellPts(cx: number, cy: number, rx: number, ry: number, n = 40): Pts {
  const out: Pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

export function shapeFrom(pts: Pts, holes?: Pts[]): ShapePath {
  return ptsToPath({ pts, holes });
}

export function rrPath(cx: number, cy: number, w: number, h: number, r: number): ShapePath {
  return ptsToPath({ pts: rrPts(cx, cy, w, h, r) });
}

export function ellPath(cx: number, cy: number, rx: number, ry: number): ShapePath {
  return ptsToPath({ pts: ellPts(cx, cy, rx, ry) });
}

export function polyPath(pts: number[], r = 0): ShapePath {
  const v: [number, number, number][] = [];
  for (let i = 0; i < pts.length; i += 2) v.push([pts[i], pts[i + 1], r]);
  return ptsToPath({ pts: r > 0 ? roundedPts(v) : v.map(([x, y]) => [x, y] as [number, number]) });
}

/** When true, helpers paint flat albedo for 3D textures (no fake side/shadow/gloss). */
export const paintMode = { flat: false };

// ---------- the chunky slab ----------

export interface SlabOpts {
  depth?: number;
  shadow?: number; // 0..1 lift
  gloss?: boolean;
  outline?: string | null;
  top?: string; // explicit top colour override
}

/**
 * A toy-like 3D block: drop shadow, extruded side (darker), lit top face with
 * vertical gradient, a thin rim highlight. `bounds` = [top y, bottom y] of the
 * shape for the gradient.
 */
export function slab(c: C, path: Path2D, color: string, y0: number, y1: number, o: SlabOpts = {}): void {
  if (paintMode.flat) {
    // the 3D mesh supplies thickness, shadow and lighting: paint only the face
    const g = c.createLinearGradient(0, y0, 0, y1);
    const top = o.top ?? color;
    g.addColorStop(0, shade(top, 0.16));
    g.addColorStop(1, shade(top, -0.16));
    c.fillStyle = g;
    c.fill(path);
    if (o.outline !== null) {
      c.strokeStyle = o.outline ?? shade(color, -0.35);
      c.lineWidth = 1;
      c.stroke(path);
    }
    return;
  }
  const depth = o.depth ?? 6;
  const lift = o.shadow ?? 0;
  // shadow
  if (o.shadow !== undefined && o.shadow >= 0) {
    c.save();
    c.translate(-6 - lift * 14, 8 + lift * 18);
    c.fillStyle = `rgba(10,20,50,${0.28 - lift * 0.08})`;
    c.filter = lift > 0.05 ? `blur(${3 + lift * 6}px)` : 'none';
    c.fill(path);
    c.restore();
  }
  // side
  c.save();
  c.translate(0, depth);
  c.fillStyle = shade(color, -0.42);
  c.fill(path);
  c.restore();
  // top face
  const g = c.createLinearGradient(0, y0, 0, y1);
  const top = o.top ?? color;
  g.addColorStop(0, shade(top, 0.22));
  g.addColorStop(0.45, top);
  g.addColorStop(1, shade(top, -0.18));
  c.fillStyle = g;
  c.fill(path);
  if (o.gloss !== false) {
    c.save();
    c.clip(path);
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 3;
    c.translate(0, 1.5);
    c.stroke(path);
    c.restore();
  }
  if (o.outline !== null) {
    c.strokeStyle = o.outline ?? shade(color, -0.5);
    c.lineWidth = 1.2;
    c.stroke(path);
  }
}

/** A gloss streak across the top-left of a shape (clip to path first). */
export function glossStreak(c: C, path: Path2D, x: number, y: number, w: number, h: number, a = 0.28): void {
  if (paintMode.flat) a *= 0.5;
  c.save();
  c.clip(path);
  const g = c.createLinearGradient(x, y, x + w * 0.4, y + h);
  g.addColorStop(0, `rgba(255,255,255,${a})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(x + w * 0.3, y + h * 0.25, w * 0.45, h * 0.22, -0.2, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

// ---------- small things ----------

export function screwHead(c: C, x: number, y: number, r: number, ang = 0.6, color = '#c9ccd3'): void {
  c.save();
  c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath();
  c.arc(-1, 1.5, r * 1.05, 0, Math.PI * 2);
  c.fill();
  const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, color);
  g.addColorStop(1, shade(color, -0.45));
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = shade(color, -0.55);
  c.lineWidth = 0.8;
  c.stroke();
  c.rotate(ang);
  c.strokeStyle = shade(color, -0.6);
  c.lineWidth = Math.max(1, r * 0.28);
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-r * 0.55, 0); c.lineTo(r * 0.55, 0);
  c.moveTo(0, -r * 0.55); c.lineTo(0, r * 0.55);
  c.stroke();
  c.restore();
}

export function screwHole(c: C, x: number, y: number, r: number, glow = 0): void {
  c.save();
  if (glow > 0) {
    c.fillStyle = `rgba(255,236,150,${0.35 * glow})`;
    c.beginPath();
    c.arc(x, y, r * 2.1, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.beginPath();
  c.arc(x, y, r * 0.8, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.lineWidth = 1;
  c.beginPath();
  c.arc(x, y + 0.6, r * 0.85, 0.2, Math.PI - 0.2);
  c.stroke();
  c.restore();
}

export interface TextOpts {
  font?: 'hand' | 'bold';
  weight?: number;
  align?: CanvasTextAlign;
  base?: CanvasTextBaseline;
  stroke?: string;
  strokeW?: number;
  maxW?: number;
  shadow?: boolean;
}

export function text(c: C, s: string, x: number, y: number, size: number, color: string, o: TextOpts = {}): void {
  c.font = `${o.weight ?? (o.font === 'bold' ? 800 : 400)} ${size}px ${o.font === 'bold' ? FONT_BOLD : FONT_HAND}`;
  c.textAlign = o.align ?? 'center';
  c.textBaseline = o.base ?? 'middle';
  if (o.shadow) {
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillText(s, x, y + size * 0.08, o.maxW);
  }
  if (o.stroke) {
    c.strokeStyle = o.stroke;
    c.lineWidth = o.strokeW ?? size * 0.18;
    c.lineJoin = 'round';
    c.strokeText(s, x, y, o.maxW);
  }
  c.fillStyle = color;
  c.fillText(s, x, y, o.maxW);
}

export function setFont(c: C, size: number, kind: 'hand' | 'bold' = 'hand', weight?: number): void {
  c.font = `${weight ?? (kind === 'bold' ? 800 : 400)} ${size}px ${kind === 'bold' ? FONT_BOLD : FONT_HAND}`;
}

/** Word-wrap `s` to `maxW` with the current font. */
export function wrap(c: C, s: string, maxW: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (c.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Dark hint pill. "KEY|rest" draws KEY in orange. */
export function pill(c: C, cx: number, cy: number, s: string, size: number, alpha = 1, icon?: string): void {
  if (alpha <= 0) return;
  c.save();
  c.globalAlpha = alpha;
  const [key, rest] = s.includes('|') ? s.split('|') : ['', s];
  setFont(c, size, 'hand');
  const kw = key ? (c.font = `800 ${size}px ${FONT_BOLD}`, c.measureText(key + ' ').width) : 0;
  setFont(c, size, 'hand');
  const rw = c.measureText(rest).width;
  const iw = icon ? size * 1.2 : 0;
  const w = kw + rw + iw + size * 1.4;
  const h = size * 1.9;
  c.fillStyle = 'rgba(28,32,44,0.82)';
  c.beginPath();
  rrc(c, cx, cy, w, h, h / 2);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.12)';
  c.lineWidth = 1;
  c.stroke();
  let x = cx - w / 2 + size * 0.7;
  if (icon) {
    text(c, icon, x + size * 0.45, cy + 1, size * 0.95, '#fff');
    x += iw;
  }
  if (key) {
    text(c, key, x, cy + 1, size, '#ffb347', { font: 'bold', align: 'left' });
    x += kw;
  }
  text(c, rest, x, cy + 1, size, '#f4f1ea', { align: 'left' });
  c.restore();
}

/** Chunky 3D button. Returns nothing; hit-test with the same rect. */
export function button(c: C, cx: number, cy: number, w: number, h: number, label: string, color = '#7ccf3c', pressed = false, size?: number, disabled = false): void {
  c.save();
  const d = pressed ? 2 : 5;
  const col = disabled ? '#9aa0a6' : color;
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath();
  rrc(c, cx, cy + 7, w, h, h * 0.28);
  c.fill();
  c.fillStyle = shade(col, -0.35);
  c.beginPath();
  rrc(c, cx, cy + 5, w, h, h * 0.28);
  c.fill();
  const y = cy + (5 - d);
  const g = c.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  g.addColorStop(0, shade(col, 0.3));
  g.addColorStop(1, col);
  c.fillStyle = g;
  c.beginPath();
  rrc(c, cx, y, w, h, h * 0.28);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.lineWidth = 2;
  c.beginPath();
  rrc(c, cx, y - 1, w - 6, h - 6, h * 0.24);
  c.stroke();
  text(c, label, cx, y + 1, size ?? h * 0.42, '#fff', { font: 'bold', stroke: shade(col, -0.45), strokeW: (size ?? h * 0.42) * 0.22 });
  c.restore();
}

/** Cartoon pointing hand (tutorial). Tip of the finger at (x, y). */
export function hand(c: C, x: number, y: number, s: number, press = 0): void {
  c.save();
  c.translate(x, y);
  c.scale(s * (1 - press * 0.08), s * (1 - press * 0.08));
  c.rotate(-0.25);
  c.lineJoin = 'round';
  c.fillStyle = '#ffd23f';
  c.strokeStyle = '#7a4a00';
  c.lineWidth = 2.2;
  const p = new Path2D();
  // finger
  p.moveTo(-5, 0);
  p.quadraticCurveTo(-6, -4, 0, -4);
  p.quadraticCurveTo(6, -4, 5, 2);
  p.lineTo(5, 20);
  // knuckles
  p.quadraticCurveTo(9, 15, 13, 19);
  p.quadraticCurveTo(17, 16, 20, 21);
  p.quadraticCurveTo(24, 19, 26, 24);
  p.lineTo(26, 38);
  p.quadraticCurveTo(25, 50, 12, 52);
  p.lineTo(2, 52);
  p.quadraticCurveTo(-10, 50, -14, 38);
  p.lineTo(-18, 28);
  p.quadraticCurveTo(-19, 23, -13, 23);
  p.lineTo(-5, 30);
  p.closePath();
  c.fill(p);
  c.stroke(p);
  c.beginPath();
  c.moveTo(13, 20); c.lineTo(13, 28);
  c.moveTo(20, 22); c.lineTo(20, 29);
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.beginPath();
  c.ellipse(-1, 6, 2, 5, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export function sparkleShape(c: C, x: number, y: number, r: number, color = '#fff'): void {
  c.save();
  c.translate(x, y);
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, -r);
  c.quadraticCurveTo(r * 0.15, -r * 0.15, r, 0);
  c.quadraticCurveTo(r * 0.15, r * 0.15, 0, r);
  c.quadraticCurveTo(-r * 0.15, r * 0.15, -r, 0);
  c.quadraticCurveTo(-r * 0.15, -r * 0.15, 0, -r);
  c.fill();
  c.restore();
}

export function star5(c: C, x: number, y: number, r: number): void {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  c.closePath();
}

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
