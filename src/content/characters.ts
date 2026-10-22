// Customers: stylized semi-realistic Western-comic busts standing behind the
// counter, seen three-quarter. Thin dark ink (outer contour heavier than inner
// detail), painterly shading: soft-edged cel shadows tinted plum, soft
// gradients on the skin, and a warm rim light from the street behind them.
// Each pose/expression is rendered once into a cached sprite.

import { type C, shade, mix } from '../core/draw';
import { view } from '../core/view';

export type HairStyle = 'spiky' | 'short' | 'bob' | 'long' | 'bun' | 'pony' | 'curly' | 'buzz' | 'bald' | 'braids';
export type Outfit = 'hoodie' | 'tee' | 'shirt' | 'dress' | 'jacket' | 'cardigan' | 'apron';
export type Pose = 'idle' | 'cheer' | 'peace' | 'think' | 'cross' | 'wave' | 'shy' | 'laugh' | 'rock' | 'hold';
export type Expr = 'neutral' | 'happy' | 'sad' | 'surprised' | 'wink' | 'grin' | 'annoyed';

export interface Look {
  skin: string;
  hair: string;
  hair2?: string; // dyed tips / streak
  style: HairStyle;
  outfit: Outfit;
  top: string;
  inner?: string;
  eyes?: string;
  age: 'kid' | 'teen' | 'adult' | 'old';
  /** Squarer jaw, heavier brows, broader shoulders. */
  masc?: boolean;
  glasses?: boolean;
  beard?: boolean;
  choker?: boolean;
  earrings?: boolean;
  lipstick?: string;
  /** Eyeshadow colour (smoky lids). */
  makeup?: string;
  /** Hair bows / ties colour. */
  bow?: string;
  /** Nail polish colour. */
  nails?: string;
  necklace?: 'cross' | 'chain' | 'whistle';
  hat?: string;
  hatKind?: 'cap' | 'chef' | 'bucket';
  freckles?: boolean;
}

export interface CharState {
  pose: Pose;
  expr: Expr;
  time: number;
  /** 0..1 squash bounce when a new line starts. */
  bounce: number;
}

// ---------- ink & paint ----------

const INK = '#2e1b2a';
const W_OUT = 2.4, W_IN = 1.35, W_FINE = 0.9;
const SHADOW_TINT = '#5a2a5e';
const RIM = '#ffb98e';
/** Three-quarter turn of every head: + = facing the viewer's left. */
const TURN = 0.22;

let px = 1; // device pixels per character unit while painting a sprite

function dark(col: string, k = 1): string {
  return mix(shade(col, -0.2 * k), SHADOW_TINT, 0.2 * k);
}
function light(col: string, k = 1): string {
  return mix(shade(col, 0.14 * k), '#fff1e2', 0.1 * k);
}

function ink(c: C, w: number, col = INK): void {
  c.strokeStyle = col;
  c.lineWidth = w;
  c.lineJoin = 'round';
  c.lineCap = 'round';
}

/** Fill `shape` with a slightly feathered edge (painterly cel shadow). */
function soft(c: C, shape: Path2D, col: string, feather = 1.2): void {
  c.save();
  c.filter = `blur(${(feather * px).toFixed(2)}px)`;
  c.fillStyle = col;
  c.fill(shape);
  c.restore();
}

/** Warm light grazing the left edge of a shape (street behind, sun to the left). */
function rim(c: C, p: Path2D, k = 1): void {
  c.save();
  c.clip(p);
  c.translate(2.2, 0.6);
  c.globalAlpha = 0.55 * k;
  ink(c, 3.2, RIM);
  c.stroke(p);
  c.restore();
}

/** Fill, shade (feathered), light, rim, ink. */
function paint(c: C, p: Path2D, base: string, o: { shadow?: Path2D; lit?: Path2D; w?: number; shadowCol?: string; rim?: number; feather?: number } = {}): void {
  c.fillStyle = base;
  c.fill(p);
  if (o.shadow || o.lit) {
    c.save();
    c.clip(p);
    if (o.shadow) soft(c, o.shadow, o.shadowCol ?? dark(base), o.feather ?? 1.2);
    if (o.lit) soft(c, o.lit, light(base), 2);
    c.restore();
  }
  if (o.rim !== 0) rim(c, p, o.rim ?? 1);
  ink(c, o.w ?? W_OUT);
  c.stroke(p);
}

function poly(pts: number[], close = true): Path2D {
  const p = new Path2D();
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  if (close) p.closePath();
  return p;
}

// ---------- proportions ----------

interface Build {
  sw: number;     // half shoulder width
  neckW: number;  // half neck width
  shoulderY: number;
  headY: number;  // eye line
  headS: number;
  jaw: number;    // 0 soft .. 1 square
  round: number;  // 0 adult .. 1 child-round face
  fem: boolean;
}

function build(L: Look): Build {
  const kid = L.age === 'kid', teen = L.age === 'teen', old = L.age === 'old';
  const m = !!L.masc;
  return {
    sw: kid ? 52 : m ? (old ? 72 : 78) : 62,
    neckW: kid ? 9.5 : m ? 14.5 : 10.5,
    shoulderY: kid ? -150 : -168,
    headY: kid ? -214 : -240,
    headS: kid ? 1.05 : 1,
    jaw: kid ? 0.1 : m ? (teen ? 0.6 : 0.95) : teen ? 0.1 : 0.2,
    round: kid ? 1 : teen ? 0.3 : 0,
    fem: !m,
  };
}

/** Three-quarter mapping of head-local x: the far (left) half narrows, everything shifts left. */
const CX = -TURN * 9;
function X(x: number): number {
  return CX + (x < 0 ? x * (1 - TURN * 0.38) : x * (1 + TURN * 0.06));
}

// ---------- head ----------

function facePath(B: Build): Path2D {
  const j = B.jaw, r = B.round, f = B.fem ? 1 : 0;
  const cheek = 33 + j * 2 - r * 0.5 - f * 1.5;
  const jawX = 22 + j * 8 + r * 5 - f * 2, jawY = 30 - j * 2 - r * 4;
  const chinX = 5 + j * 7 + r * 4 - f * 1.5, chinY = 49 - r * 4;
  const p = new Path2D();
  p.moveTo(X(-32), -28);
  p.bezierCurveTo(X(-30), -60, X(30), -60, X(32), -28);
  p.bezierCurveTo(X(cheek + 1), -12, X(cheek), 6, X(jawX + 4), jawY - 6);
  p.bezierCurveTo(X(jawX), jawY + 5, X(chinX + 6), chinY - 2, X(chinX), chinY);
  p.quadraticCurveTo(X(0), chinY + 2.5, X(-chinX), chinY);
  p.bezierCurveTo(X(-chinX - 6), chinY - 2, X(-jawX), jawY + 5, X(-jawX - 4), jawY - 6);
  p.bezierCurveTo(X(-cheek), 6, X(-cheek - 1), -12, X(-32), -28);
  p.closePath();
  return p;
}

/** Shadow plane of the turned face: the near cheek away from the light, and under the jaw. */
function faceShadow(B: Build): Path2D {
  const jawX = 22 + B.jaw * 8 + B.round * 5;
  const p = new Path2D();
  p.moveTo(X(46), -64);
  p.lineTo(X(24), -64);
  p.bezierCurveTo(X(28), -40, X(27), -20, X(22), -8);
  p.bezierCurveTo(X(18), 4, X(23), 18, X(jawX - 5), 30);
  p.bezierCurveTo(X(16), 42, X(6), 48, X(-4), 52);
  p.lineTo(X(46), 64);
  p.closePath();
  return p;
}

function ear(c: C, L: Look, B: Build): void {
  // only the near ear shows at three-quarter
  const x = X(32 + B.jaw);
  const p = new Path2D();
  p.moveTo(x - 1, -10);
  p.bezierCurveTo(x + 9, -17, x + 11, 4, x + 4, 14);
  p.quadraticCurveTo(x + 1, 16, x - 1, 12);
  p.closePath();
  paint(c, p, L.skin, { shadow: poly([x + 2, -20, x + 14, -20, x + 14, 20, x + 2, 20]), w: W_IN + 0.5, rim: 0 });
  ink(c, W_FINE);
  c.beginPath(); c.moveTo(x + 3, -6); c.quadraticCurveTo(x + 7, 0, x + 3, 8); c.stroke();
  if (L.earrings) {
    c.fillStyle = '#e4e2ee';
    ink(c, W_FINE);
    c.beginPath(); c.arc(x + 3, 16, 2.2, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x + 3, 18); c.lineTo(x + 3, 23); c.stroke();
    const d = poly([x + 3, 23, x + 6, 28, x + 3, 33, x, 28]);
    c.fill(d); c.stroke(d);
  }
}

function eye(c: C, L: Look, B: Build, side: number, e: Expr, blink: boolean): void {
  const iris = L.eyes ?? '#3a2a24';
  const m = !!L.masc;
  const old = L.age === 'old';
  const far = side < 0;
  const k = far ? 1 - TURN * 0.38 : 1 + TURN * 0.04;
  const ex = X(side * 15), ey = 0;
  const w = (m ? 9.6 : 10.6) * (old ? 0.94 : 1) + B.round * 0.6;
  let up = (m ? 5.6 : 7) + B.round * 1.2;
  let lo = 3.4 + B.round * 0.6;
  if (e === 'surprised') { up += 2.4; lo += 1.4; }
  if (e === 'annoyed') up -= 2.8;
  if (e === 'happy') lo -= 2.2;
  const closed = blink || e === 'grin' || (e === 'wink' && side === 1);
  c.save();
  c.translate(ex, ey);
  c.scale(side * k, 1); // +x = outer corner
  // eyeshadow: a soft smoky wash over the lid (also the natural lid shadow for everyone)
  const shadowCol = L.makeup ?? dark(L.skin, 1.1);
  c.save();
  c.filter = `blur(${(2.6 * px).toFixed(2)}px)`;
  c.globalAlpha = (L.makeup ? 0.5 : 0.28) * (closed ? 0.6 : 1);
  c.fillStyle = shadowCol;
  c.beginPath(); c.ellipse(2, -up * 0.7 - 1, w * 0.95, up * 0.62 + 1, 0.12, 0, Math.PI * 2); c.fill();
  if (L.makeup && !closed) { c.globalAlpha = 0.18; c.beginPath(); c.ellipse(3, lo + 1.2, w * 0.6, 1.6, 0, 0, Math.PI * 2); c.fill(); }
  c.restore();
  if (closed) {
    ink(c, 2.3);
    c.beginPath();
    if (e === 'grin' || e === 'wink' || e === 'happy') { c.moveTo(-w + 1, 1.5); c.quadraticCurveTo(0, -5.5, w, 0); }
    else { c.moveTo(-w + 1, 0); c.quadraticCurveTo(0, 3, w, 0); }
    c.stroke();
    if (!m) { ink(c, 1.4); c.beginPath(); c.moveTo(w - 1, 0); c.quadraticCurveTo(w + 3, -1, w + 5, -4); c.stroke(); }
    c.restore();
    return;
  }
  const tilt = e === 'sad' ? 1.6 : 0;
  const almond = new Path2D();
  almond.moveTo(-w, 1);
  almond.bezierCurveTo(-w * 0.5, -up - tilt, w * 0.45, -up - 0.6, w, -1.8);
  almond.bezierCurveTo(w * 0.5, lo + 0.6, -w * 0.4, lo, -w, 1);
  almond.closePath();
  c.fillStyle = '#f7f1ee';
  c.fill(almond);
  c.save();
  c.clip(almond);
  const ir = 5.6 + B.round * 0.6 + (m ? -0.3 : 0.3);
  const g = c.createRadialGradient(0, 2, 0.5, 0, 0, ir);
  g.addColorStop(0, light(iris, 1.8)); g.addColorStop(0.65, iris); g.addColorStop(1, dark(iris, 1.5));
  c.fillStyle = g;
  c.beginPath(); c.arc(0.5, 0, ir, 0, Math.PI * 2); c.fill();
  c.fillStyle = mix(dark(iris, 2.4), INK, 0.6);
  c.beginPath(); c.arc(0.5, 0.3, ir * 0.42, 0, Math.PI * 2); c.fill();
  // lid shadow across the top of the eyeball
  soft(c, poly([-w - 3, -up - 6, w + 3, -up - 6, w + 3, -up + 4.5, -w - 3, -up + 3]), 'rgba(70,30,60,0.38)', 1);
  c.fillStyle = 'rgba(255,255,255,0.96)';
  c.beginPath(); c.arc(-1.2, -2.2, 1.6, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(2.4, 2, 0.8, 0, Math.PI * 2); c.fill();
  c.restore();
  // upper lid / liner: the heaviest line in the face, winged for the women
  ink(c, m ? 2.2 : 2.6);
  c.beginPath();
  c.moveTo(-w, 1);
  c.bezierCurveTo(-w * 0.5, -up - tilt, w * 0.45, -up - 0.6, w, -1.8);
  c.stroke();
  if (!m) {
    c.fillStyle = INK;
    c.fill(poly([w - 3, -3, w + 6, -7.5, w + 1, -0.6]));
    // a few lashes along the outer half
    ink(c, 1.1);
    for (let i = 0; i < 3; i++) {
      const t = 0.45 + i * 0.18;
      const lx = -w + 2 * w * t, ly = -up * (1 - Math.pow(2 * t - 1, 2)) * 0.95 - 0.5;
      c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx + 1.6, ly - 2.8); c.stroke();
    }
  }
  // lower lid, thin and broken
  ink(c, W_FINE);
  c.beginPath(); c.moveTo(w * 0.9, -0.6); c.bezierCurveTo(w * 0.4, lo + 0.9, -w * 0.2, lo + 0.7, -w * 0.6, lo * 0.6 + 0.6); c.stroke();
  // crease
  c.strokeStyle = mix(dark(L.skin, 1.6), INK, 0.35);
  c.lineWidth = W_FINE;
  c.beginPath(); c.moveTo(-w * 0.5, -up - 2.6); c.quadraticCurveTo(w * 0.15, -up - 4.6, w * 0.85, -up + 0.4); c.stroke();
  if (old) {
    c.beginPath(); c.moveTo(w + 3, 1); c.lineTo(w + 7, -1); c.moveTo(w + 3, 3.5); c.lineTo(w + 7, 4); c.stroke();
    c.beginPath(); c.moveTo(-w * 0.6, lo + 3.5); c.quadraticCurveTo(0, lo + 6, w * 0.7, lo + 3); c.stroke();
  }
  if (e === 'happy') {
    c.strokeStyle = mix(dark(L.skin, 1.2), INK, 0.2);
    c.beginPath(); c.moveTo(-w * 0.6, lo + 3); c.quadraticCurveTo(0, lo + 0.5, w * 0.8, lo + 2.5); c.stroke();
  }
  c.restore();
}

function brow(c: C, L: Look, side: number, e: Expr): void {
  const m = !!L.masc;
  const col = mix(dark(L.hair, 1.1), INK, 0.3);
  const th = m ? 4.4 : 3.4;
  let inY = -14, outY = -15, midY = -19.5;
  if (e === 'sad') { inY = -19; midY = -18.5; outY = -13; }
  if (e === 'annoyed') { inY = -10; midY = -14; outY = -17; }
  if (e === 'surprised') { inY -= 4; midY -= 5; outY -= 3.5; }
  if (e === 'happy' || e === 'grin') { inY -= 1.4; midY -= 1.6; }
  c.save();
  c.translate(X(side * 1), 0);
  c.scale(side * (side < 0 ? 1 - TURN * 0.38 : 1 + TURN * 0.04), 1);
  const p = new Path2D();
  p.moveTo(4, inY + th * 0.5);
  p.quadraticCurveTo(14, midY + th * 0.4, 25, outY + 2);
  p.quadraticCurveTo(14, midY - th * 0.75, 4, inY - th * 0.6);
  p.closePath();
  c.fillStyle = col;
  c.fill(p);
  c.restore();
}

function nose(c: C, L: Look, B: Build): void {
  const len = 20 - B.round * 4;
  const cx = X(0);
  // at three-quarter the bridge is a profile line on the far side, the tip points away
  const sh = dark(L.skin, 1.1);
  soft(c, (() => { const p = new Path2D(); p.moveTo(cx + 1, 0); p.quadraticCurveTo(cx + 4, len * 0.6, cx + 3, len - 1); p.quadraticCurveTo(cx, len + 1, cx - 1, len - 3); p.quadraticCurveTo(cx + 1, len * 0.5, cx + 1, 0); return p; })(), sh, 0.8);
  c.fillStyle = sh;
  c.beginPath(); c.ellipse(cx - 0.5, len + 4.6, 5.4, 1.7, 0, 0, Math.PI * 2); c.fill();
  ink(c, W_IN);
  c.beginPath();
  c.moveTo(cx - 2.5, -1);
  c.quadraticCurveTo(cx - 3.5, len * 0.55, cx - 6.5, len + 0.5);
  c.quadraticCurveTo(cx - 5, len + 3.2, cx - 1.5, len + 2.4);
  c.stroke();
  ink(c, W_FINE);
  c.beginPath(); c.moveTo(cx + 1.5, len + 2.6); c.quadraticCurveTo(cx + 4.5, len + 3.4, cx + 5.5, len + 0.2); c.stroke();
  c.strokeStyle = 'rgba(255,244,232,0.6)';
  c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(cx - 1, 4); c.lineTo(cx - 1.6, len - 5); c.stroke();
}

function mouth(c: C, L: Look, B: Build, e: Expr, talk: number): void {
  const y = 32 - B.round * 3;
  const cx = X(0) + 0.5;
  const lipCol = L.lipstick ?? mix(shade(L.skin, -0.16), '#c05a6a', 0.38);
  const wl = (L.masc ? 10.5 : 10) * (1 - TURN * 0.3), wr = (L.masc ? 10.5 : 10) * (1 + TURN * 0.05);
  const open = (e === 'surprised' ? 6 : 0) + talk * 5;
  const smile = e === 'happy' || e === 'grin' || e === 'wink';
  if (smile || (talk > 0.25 && e !== 'sad' && e !== 'annoyed')) {
    // a wide open laugh: teeth, tongue, lips around it
    const up = smile ? 4 : 0.5;
    const h = (smile ? 10 : 3.5) + open;
    const p = new Path2D();
    p.moveTo(cx - wl - 2, y - up);
    p.quadraticCurveTo(cx, y - up * 0.2 + 0.4, cx + wr + 2, y - up);
    p.bezierCurveTo(cx + wr * 0.7, y + h, cx - wl * 0.7, y + h, cx - wl - 2, y - up);
    p.closePath();
    c.fillStyle = '#4e1626';
    c.fill(p);
    c.save();
    c.clip(p);
    c.fillStyle = '#f6efec';
    c.beginPath(); c.ellipse(cx, y - up - 1, wr + 4, 4.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c75a73';
    c.beginPath(); c.ellipse(cx + 1, y + h + 0.5, wr * 0.75, 5, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    if (L.lipstick) {
      ink(c, 2.6, L.lipstick);
      c.stroke(p);
    }
    ink(c, W_IN + 0.2);
    c.stroke(p);
    c.strokeStyle = dark(L.skin, 0.9);
    c.lineWidth = W_FINE;
    c.beginPath(); c.moveTo(cx - wl * 0.3, y + h + 4); c.quadraticCurveTo(cx, y + h + 5, cx + wr * 0.35, y + h + 4); c.stroke();
    ink(c, W_FINE);
    c.beginPath(); c.moveTo(cx - wl - 2, y - up); c.quadraticCurveTo(cx - wl - 4, y - up + 1, cx - wl - 4.5, y - up + 3); c.moveTo(cx + wr + 2, y - up); c.quadraticCurveTo(cx + wr + 4, y - up + 1, cx + wr + 4.5, y - up + 3); c.stroke();
    return;
  }
  if (e === 'surprised') {
    const p = new Path2D();
    p.ellipse(cx, y + 2, 4.5, 4 + open * 0.6, 0, 0, Math.PI * 2);
    c.fillStyle = '#4e1626';
    c.fill(p);
    if (L.lipstick) { ink(c, 2.4, L.lipstick); c.stroke(p); }
    ink(c, W_IN); c.stroke(p);
    return;
  }
  // closed: shaped full lips, a smirk for the confident, a pout when sad
  const turn = e === 'sad' ? 2.5 : e === 'annoyed' ? 0.6 : -0.6;
  const smirk = e === 'neutral' && !!L.lipstick ? -1.4 : 0;
  const upper = new Path2D();
  upper.moveTo(cx - wl, y + turn);
  upper.quadraticCurveTo(cx - wl * 0.45, y - 3.6, cx - 1, y - 2.2);
  upper.quadraticCurveTo(cx, y - 1.4, cx + 1, y - 2.2);
  upper.quadraticCurveTo(cx + wr * 0.45, y - 3.6, cx + wr, y + turn + smirk);
  upper.quadraticCurveTo(cx, y + 1, cx - wl, y + turn);
  const lower = new Path2D();
  lower.moveTo(cx - wl * 0.8, y + 0.8 + turn * 0.5);
  lower.quadraticCurveTo(cx, y + (L.masc ? 6 : 7.6), cx + wr * 0.8, y + 0.8 + turn * 0.5 + smirk * 0.5);
  lower.quadraticCurveTo(cx, y + 1.8, cx - wl * 0.8, y + 0.8 + turn * 0.5);
  c.globalAlpha = L.lipstick ? 1 : L.masc ? 0.35 : 0.6;
  c.fillStyle = lipCol;
  c.fill(upper);
  c.fill(lower);
  c.globalAlpha = 1;
  if (L.lipstick) {
    c.fillStyle = 'rgba(255,230,240,0.45)';
    c.beginPath(); c.ellipse(cx - 1.5, y + 3.6, wr * 0.3, 1, 0, 0, Math.PI * 2); c.fill();
  }
  ink(c, W_IN + 0.2);
  c.beginPath();
  c.moveTo(cx - wl, y + turn);
  c.quadraticCurveTo(cx, y + 1 + (e === 'sad' ? -1.4 : 0), cx + wr, y + turn + smirk);
  c.stroke();
  soft(c, (() => { const p = new Path2D(); p.ellipse(cx + 0.8, y + 10, wr * 0.35, 1.2, 0, 0, Math.PI * 2); return p; })(), dark(L.skin, 0.7), 0.8);
}

function beard(c: C, L: Look, B: Build): void {
  const col = L.hair;
  const jawX = 22 + B.jaw * 8;
  const p = new Path2D();
  p.moveTo(X(-32), -2);
  p.bezierCurveTo(X(-31), 22, X(-jawX + 2), 44, X(-9), 54);
  p.quadraticCurveTo(X(0), 57, X(9), 54);
  p.bezierCurveTo(X(jawX - 2), 44, X(31), 22, X(32), -2);
  p.bezierCurveTo(X(26), 10, X(22), 22, X(12), 26);
  p.quadraticCurveTo(X(0), 22, X(-12), 26);
  p.bezierCurveTo(X(-22), 22, X(-26), 10, X(-32), -2);
  p.closePath();
  p.moveTo(X(-9), 31);
  p.quadraticCurveTo(X(0), 41, X(9), 31);
  p.quadraticCurveTo(X(0), 35, X(-9), 31);
  paint(c, p, col, { shadow: poly([X(8), -10, 60, -10, 60, 70, X(8), 70]), w: W_IN + 0.3 });
  // stubble texture as fine strokes
  c.save();
  c.clip(p);
  c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 0.8;
  for (let i = 0; i < 26; i++) { const a = i * 2.4; const bx = Math.cos(a) * 24 + CX, by = 30 + Math.sin(a * 1.3) * 18; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + 1, by + 3); c.stroke(); }
  c.restore();
  const mo = new Path2D();
  mo.moveTo(X(-13), 30);
  mo.quadraticCurveTo(X(-6), 23, X(0), 26.5);
  mo.quadraticCurveTo(X(6), 23, X(13), 30);
  mo.quadraticCurveTo(X(6), 27.5, X(0), 29);
  mo.quadraticCurveTo(X(-6), 27.5, X(-13), 30);
  paint(c, mo, shade(col, 0.05), { w: W_IN });
}

// ---------- hair ----------

/** A plait: centre line (head-local) and its width at the top. */
interface Plait { pts: number[]; w: number }

interface HairParts { back?: Path2D; front: Path2D; shadow: Path2D; shine: Path2D; strands: Path2D; braids?: Plait[] }

/** Point and normal on a plait's centre line (polyline) at t in 0..1. */
function along(pts: number[], t: number): { x: number; y: number; nx: number; ny: number } {
  const n = pts.length / 2 - 1;
  const f = Math.min(n - 1e-6, t * n), i = Math.floor(f), u = f - i;
  const ax = pts[i * 2], ay = pts[i * 2 + 1], bx = pts[i * 2 + 2], by = pts[i * 2 + 3];
  const l = Math.hypot(bx - ax, by - ay) || 1;
  return { x: ax + (bx - ax) * u, y: ay + (by - ay) * u, nx: -(by - ay) / l, ny: (bx - ax) / l };
}

function hairShapes(L: Look): HairParts {
  const s = L.style;
  const front = new Path2D(), back = new Path2D(), shadow = new Path2D(), shine = new Path2D(), strands = new Path2D();
  let braids: Plait[] | undefined;
  let hasBack = false;
  const crown = (r: number, cy: number) => {
    shine.moveTo(-r * 0.78, cy - r * 0.32);
    shine.quadraticCurveTo(-r * 0.42, cy - r * 0.96, r * 0.2, cy - r * 0.92);
    shine.quadraticCurveTo(-r * 0.3, cy - r * 0.72, -r * 0.62, cy - r * 0.16);
    shine.closePath();
  };
  // locks: thin tapered curves read as strands
  const lock = (x0: number, y0: number, cx: number, cy: number, x1: number, y1: number) => { strands.moveTo(x0, y0); strands.quadraticCurveTo(cx, cy, x1, y1); };
  switch (s) {
    case 'spiky': {
      front.moveTo(-36, -4);
      for (const [x, y] of [[-42, -30], [-50, -40], [-40, -48], [-50, -66], [-28, -60], [-30, -82], [-10, -68], [0, -90], [12, -68], [30, -84], [28, -60], [50, -64], [40, -44], [50, -34], [38, -24], [37, -6]] as const) front.lineTo(x, y);
      front.lineTo(30, -24);
      front.lineTo(24, -34); front.lineTo(16, -22); front.lineTo(8, -36); front.lineTo(-2, -24); front.lineTo(-10, -38); front.lineTo(-20, -24); front.lineTo(-28, -34);
      front.closePath();
      shadow.moveTo(10, -100); shadow.lineTo(60, -100); shadow.lineTo(60, 0); shadow.lineTo(26, -20); shadow.lineTo(18, -50); shadow.closePath();
      crown(44, -40);
      lock(-18, -60, -14, -50, -12, -40); lock(4, -70, 4, -56, 2, -44); lock(22, -62, 18, -52, 14, -42);
      break;
    }
    case 'short': {
      front.moveTo(-36, 2);
      front.bezierCurveTo(-46, -40, -30, -72, 4, -70);
      front.bezierCurveTo(36, -70, 46, -40, 37, 0);
      front.quadraticCurveTo(34, -18, 30, -26);
      front.quadraticCurveTo(18, -22, 10, -36);
      front.quadraticCurveTo(-6, -26, -24, -32);
      front.quadraticCurveTo(-30, -20, -33, -8);
      front.closePath();
      shadow.moveTo(14, -90); shadow.bezierCurveTo(30, -60, 38, -40, 50, -20); shadow.lineTo(50, 10); shadow.lineTo(26, 10); shadow.lineTo(22, -40); shadow.closePath();
      crown(40, -34);
      lock(-14, -60, -4, -46, -8, -34); lock(10, -64, 16, -48, 12, -38); lock(-28, -40, -30, -28, -32, -14);
      break;
    }
    case 'buzz': {
      front.moveTo(-34, -8);
      front.bezierCurveTo(-38, -56, 38, -62, 34, -8);
      front.quadraticCurveTo(30, -24, 24, -30);
      front.quadraticCurveTo(0, -36, -24, -30);
      front.quadraticCurveTo(-30, -24, -34, -8);
      front.closePath();
      shadow.moveTo(10, -80); shadow.lineTo(50, -80); shadow.lineTo(50, 0); shadow.lineTo(24, -20); shadow.closePath();
      crown(36, -30);
      break;
    }
    case 'bald': {
      for (const side of [-1, 1]) {
        front.moveTo(side * 30, -26);
        front.bezierCurveTo(side * 40, -24, side * 41, -6, side * 36, 6);
        front.quadraticCurveTo(side * 34, -6, side * 31, -10);
        front.closePath();
      }
      shadow.rect(20, -40, 30, 60);
      break;
    }
    case 'bob': {
      hasBack = true;
      back.moveTo(-40, -30);
      back.bezierCurveTo(-52, 0, -50, 34, -42, 50);
      back.lineTo(42, 50);
      back.bezierCurveTo(50, 34, 52, 0, 40, -30);
      back.closePath();
      front.moveTo(-42, 46);
      front.bezierCurveTo(-56, -10, -40, -72, 0, -72);
      front.bezierCurveTo(40, -72, 56, -10, 42, 46);
      front.lineTo(34, 40);
      front.bezierCurveTo(36, 10, 34, -14, 26, -26);
      front.quadraticCurveTo(4, -30, -10, -44);
      front.quadraticCurveTo(-18, -24, -30, -22);
      front.bezierCurveTo(-36, -4, -38, 20, -34, 40);
      front.closePath();
      shadow.moveTo(16, -90); shadow.bezierCurveTo(40, -50, 44, 0, 40, 60); shadow.lineTo(60, 60); shadow.lineTo(60, -90); shadow.closePath();
      shadow.moveTo(-60, 28); shadow.lineTo(60, 28); shadow.lineTo(60, 60); shadow.lineTo(-60, 60); shadow.closePath();
      crown(46, -30);
      lock(-26, -40, -34, -10, -30, 30); lock(20, -50, 30, -10, 28, 30); lock(-6, -62, -16, -48, -22, -30);
      break;
    }
    case 'long': {
      hasBack = true;
      back.moveTo(-40, -36);
      back.bezierCurveTo(-60, 20, -58, 110, -46, 150);
      back.lineTo(46, 150);
      back.bezierCurveTo(58, 110, 60, 20, 40, -36);
      back.closePath();
      front.moveTo(-40, 70);
      front.bezierCurveTo(-58, 0, -44, -74, 0, -72);
      front.bezierCurveTo(44, -74, 58, 0, 40, 70);
      front.lineTo(34, 60);
      front.bezierCurveTo(38, 20, 34, -14, 24, -28);
      front.quadraticCurveTo(10, -32, 2, -50);
      front.quadraticCurveTo(-8, -28, -28, -24);
      front.bezierCurveTo(-36, -4, -38, 30, -33, 60);
      front.closePath();
      shadow.moveTo(14, -90); shadow.bezierCurveTo(40, -50, 46, 10, 42, 80); shadow.lineTo(70, 80); shadow.lineTo(70, -90); shadow.closePath();
      crown(46, -32);
      lock(-24, -44, -36, 0, -34, 50); lock(18, -46, 30, 0, 30, 50); lock(-10, -60, -20, -46, -26, -28);
      break;
    }
    case 'braids': {
      // centre-parted and pulled back, two plaits falling in front of the shoulders
      hasBack = true;
      back.moveTo(-38, -30);
      back.bezierCurveTo(-48, 0, -46, 24, -36, 34);
      back.lineTo(36, 34);
      back.bezierCurveTo(46, 24, 48, 0, 38, -30);
      back.closePath();
      front.moveTo(-35, 4);
      front.bezierCurveTo(-46, -46, -28, -73, 2, -72);
      front.bezierCurveTo(32, -73, 46, -46, 35, 4);
      front.quadraticCurveTo(34, -18, 26, -32);
      front.quadraticCurveTo(12, -40, 3, -50);
      front.quadraticCurveTo(-6, -38, -24, -32);
      front.quadraticCurveTo(-32, -18, -35, 4);
      front.closePath();
      shadow.moveTo(4, -100); shadow.bezierCurveTo(24, -70, 36, -40, 46, -6); shadow.lineTo(80, -6); shadow.lineTo(80, -100); shadow.closePath();
      crown(42, -34);
      lock(2, -70, -8, -56, -22, -36); lock(2, -70, 12, -56, 24, -38); lock(-12, -66, -24, -52, -30, -30); lock(16, -66, 28, -52, 32, -30);
      braids = [{ pts: [-27, 26, -36, 70, -42, 118, -40, 170], w: 9 }, { pts: [27, 26, 36, 70, 42, 118, 40, 170], w: 9 }];
      break;
    }
    case 'bun':
    case 'pony': {
      hasBack = true;
      if (s === 'bun') { back.moveTo(24, -78); back.arc(0, -78, 24, 0, Math.PI * 2); }
      else {
        back.moveTo(26, -50);
        back.bezierCurveTo(64, -60, 72, 10, 54, 64);
        back.bezierCurveTo(52, 28, 46, 0, 28, -20);
        back.closePath();
      }
      front.moveTo(-35, -2);
      front.bezierCurveTo(-46, -46, -30, -72, 0, -72);
      front.bezierCurveTo(32, -72, 46, -46, 35, -2);
      front.quadraticCurveTo(32, -20, 26, -28);
      front.quadraticCurveTo(6, -26, -6, -42);
      front.quadraticCurveTo(-14, -28, -28, -26);
      front.quadraticCurveTo(-32, -16, -35, -2);
      front.closePath();
      shadow.moveTo(14, -100); shadow.bezierCurveTo(32, -70, 40, -40, 50, -10); shadow.lineTo(80, -10); shadow.lineTo(80, -100); shadow.closePath();
      crown(42, -32);
      lock(-6, -64, -18, -54, -24, -38); lock(4, -64, 18, -54, 22, -40); lock(-20, -44, -28, -34, -32, -20);
      if (s === 'bun') lock(-12, -86, 0, -94, 14, -84);
      else lock(40, -40, 60, -10, 56, 50);
      break;
    }
    case 'curly': {
      const blobs: [number, number, number][] = [[-34, -26, 14], [-36, -48, 15], [-22, -66, 16], [0, -74, 17], [22, -66, 16], [36, -48, 15], [34, -26, 14], [-10, -54, 16], [12, -54, 16]];
      for (const [x, y, r] of blobs) { front.moveTo(x + r, y); front.arc(x, y, r, 0, Math.PI * 2); }
      front.moveTo(-30, -26); front.bezierCurveTo(-28, -44, 28, -44, 30, -26); front.quadraticCurveTo(0, -30, -30, -26);
      shadow.moveTo(12, -100); shadow.lineTo(60, -100); shadow.lineTo(60, 0); shadow.lineTo(20, -30); shadow.closePath();
      for (const [x, y, r] of blobs) { shadow.moveTo(x + r, y + r * 0.35); shadow.ellipse(x, y + r * 0.45, r, r * 0.5, 0, 0, Math.PI * 2); }
      for (const [x, y, r] of blobs) { shine.moveTo(x - r * 0.15, y - r * 0.55); shine.ellipse(x - r * 0.35, y - r * 0.45, r * 0.32, r * 0.16, -0.5, 0, Math.PI * 2); }
      for (const [x, y, r] of blobs) lock(x - r * 0.5, y, x, y + r * 0.4, x + r * 0.5, y);
      break;
    }
  }
  return { back: hasBack ? back : undefined, front, shadow, shine, strands, braids };
}

/** Hair is drawn in a slightly squeezed, shifted frame so it follows the turned face. */
function hairFrame(c: C): void {
  c.translate(CX * 0.7, 0);
  c.scale(1 - TURN * 0.14, 1);
}

function hairBack(c: C, L: Look, H: HairParts): void {
  if (!H.back) return;
  c.save();
  hairFrame(c);
  paint(c, H.back, shade(L.hair, -0.08), { shadow: poly([-90, -200, 200, -200, 200, 200, -90, 200]), shadowCol: dark(L.hair, 1.1), rim: 0.3 });
  c.restore();
}

function hairFront(c: C, L: Look, H: HairParts): void {
  c.save();
  hairFrame(c);
  if (L.style === 'bald') {
    paint(c, H.front, L.hair, { shadow: H.shadow, w: W_IN + 0.5 });
    c.restore();
    return;
  }
  paint(c, H.front, L.hair, { shadow: H.shadow, lit: H.shine, shadowCol: dark(L.hair, 1.2), feather: 1.6, rim: 0.35 });
  c.save();
  c.clip(H.front);
  if (L.hair2) {
    c.fillStyle = L.hair2;
    c.globalAlpha = 0.9;
    c.beginPath(); c.ellipse(10, -84, 46, 22, -0.15, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }
  // strands: dark lines plus a few light ones on the lit side
  c.strokeStyle = mix(dark(L.hair, 1.6), INK, 0.4);
  c.lineWidth = W_FINE;
  c.stroke(H.strands);
  c.translate(-1.6, -0.8);
  c.strokeStyle = light(L.hair, 1.6);
  c.globalAlpha = 0.45;
  c.stroke(H.strands);
  c.restore();
  ink(c, W_OUT);
  c.stroke(H.front);
  c.restore();
}

/** Plaits falling from behind the ears over the shoulders, tied with bows. Drawn after the body, before the face. */
function braidsFront(c: C, L: Look, H: HairParts, headY: number): void {
  if (!H.braids) return;
  c.save();
  c.translate(0, headY);
  hairFrame(c);
  for (const pl of H.braids) {
    const N = 24;
    const left: number[] = [], right: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const a = along(pl.pts, t);
      const w = pl.w * (1 - t * 0.3) * (1 + Math.sin(t * Math.PI * 9) * 0.06);
      left.push(a.x + a.nx * w, a.y + a.ny * w);
      right.push(a.x - a.nx * w, a.y - a.ny * w);
    }
    const tube = new Path2D();
    tube.moveTo(left[0], left[1]);
    for (let i = 2; i < left.length; i += 2) tube.lineTo(left[i], left[i + 1]);
    for (let i = right.length - 2; i >= 0; i -= 2) tube.lineTo(right[i], right[i + 1]);
    tube.closePath();
    // shadow along the side away from the light
    const sh = new Path2D();
    const sideX = pl.pts[0] > 0 ? left : right;
    sh.moveTo(sideX[0], sideX[1]);
    for (let i = 2; i < sideX.length; i += 2) sh.lineTo(sideX[i], sideX[i + 1]);
    for (let i = N; i >= 0; i--) { const a = along(pl.pts, i / N); sh.lineTo(a.x, a.y); }
    sh.closePath();
    paint(c, tube, L.hair, { shadow: sh, shadowCol: dark(L.hair, 1.3), w: W_IN + 0.6, rim: 0.35 });
    // the plaits: interlocking chevrons, each with a light edge
    c.save();
    c.clip(tube);
    const segs = 9;
    for (let k = 0; k < segs; k++) {
      const t0 = (k + 0.1) / segs, t1 = (k + 0.9) / segs;
      const a = along(pl.pts, t0), b = along(pl.pts, t1), m = along(pl.pts, (t0 + t1) / 2);
      const w = pl.w * (1 - ((t0 + t1) / 2) * 0.3);
      ink(c, W_FINE + 0.2, mix(dark(L.hair, 2), INK, 0.4));
      c.beginPath();
      c.moveTo(a.x + a.nx * w, a.y + a.ny * w);
      c.quadraticCurveTo(m.x + m.nx * w * 0.3, m.y + m.ny * w * 0.3, b.x, b.y);
      c.moveTo(a.x - a.nx * w, a.y - a.ny * w);
      c.quadraticCurveTo(m.x - m.nx * w * 0.3, m.y - m.ny * w * 0.3, b.x, b.y);
      c.stroke();
      c.globalAlpha = 0.55;
      ink(c, 1.1, light(L.hair, 2.6));
      c.beginPath();
      c.moveTo(a.x + a.nx * w * 0.75, a.y + a.ny * w * 0.75 + 2);
      c.quadraticCurveTo(m.x + m.nx * w * 0.45, m.y + m.ny * w * 0.45 + 1, m.x + m.nx * w * 0.1, m.y + 3);
      c.stroke();
      c.globalAlpha = 1;
    }
    c.restore();
    // a little tuft below the tie
    const e = along(pl.pts, 0.94);
    const tail = new Path2D();
    tail.moveTo(e.x - 5, e.y + 3);
    tail.quadraticCurveTo(e.x - 7, e.y + 15, e.x - 1, e.y + 24);
    tail.quadraticCurveTo(e.x + 3, e.y + 15, e.x + 6, e.y + 3);
    tail.closePath();
    paint(c, tail, L.hair, { w: W_IN, rim: 0.3 });
    if (L.bow) bowAt(c, L.bow, e.x, e.y, 1);
  }
  c.restore();
}

function bowAt(c: C, col: string, bx: number, by: number, k: number): void {
  const bow = new Path2D();
  bow.moveTo(bx, by);
  bow.bezierCurveTo(bx - 15 * k, by - 11 * k, bx - 17 * k, by + 9 * k, bx, by);
  bow.bezierCurveTo(bx + 17 * k, by - 9 * k, bx + 15 * k, by + 11 * k, bx, by);
  paint(c, bow, col, { shadow: poly([bx, by - 20, bx + 30, by - 20, bx + 30, by + 20, bx, by + 20]), w: W_IN, rim: 0.5 });
  const tails = new Path2D();
  tails.moveTo(bx - 1, by + 1); tails.lineTo(bx - 6 * k, by + 13 * k); tails.lineTo(bx - 2 * k, by + 12 * k); tails.closePath();
  tails.moveTo(bx + 1, by + 1); tails.lineTo(bx + 6 * k, by + 12 * k); tails.lineTo(bx + 2 * k, by + 13 * k); tails.closePath();
  paint(c, tails, dark(col, 0.6), { w: W_FINE + 0.2, rim: 0 });
  c.fillStyle = dark(col);
  c.beginPath(); c.arc(bx, by, 2.4 * k, 0, Math.PI * 2); c.fill();
}

/** The tie at the back of the head peeks out as a bow on the near side. */
function napeBow(c: C, L: Look): void {
  if (!L.bow || L.style !== 'braids') return;
  c.save();
  hairFrame(c);
  bowAt(c, L.bow, 34, -40, 1.05);
  c.restore();
}

function fringeShadow(c: C, L: Look, face: Path2D, H: HairParts): void {
  if (L.style === 'bald' || L.style === 'buzz') return;
  c.save();
  c.clip(face);
  hairFrame(c);
  c.translate(3, 6);
  soft(c, H.front, dark(L.skin, 1.05), 1.4);
  c.restore();
}

function hat(c: C, L: Look): void {
  const col = L.hat!;
  const kind = L.hatKind ?? 'cap';
  c.save();
  hairFrame(c);
  if (kind === 'chef') {
    const p = new Path2D();
    p.moveTo(-34, -38);
    p.lineTo(-36, -64);
    p.bezierCurveTo(-58, -70, -54, -112, -26, -104);
    p.bezierCurveTo(-20, -128, 18, -130, 24, -106);
    p.bezierCurveTo(54, -114, 60, -72, 36, -64);
    p.lineTo(34, -38);
    p.closePath();
    paint(c, p, col, { shadow: poly([12, -140, 70, -140, 70, -30, 18, -30, 22, -70]), shadowCol: '#d6d0e4', feather: 2 });
    const band = new Path2D();
    band.rect(-36, -52, 72, 16);
    paint(c, band, '#f6f4fb', { shadow: poly([16, -60, 40, -60, 40, -30, 16, -30]), shadowCol: '#d6d0e4', w: W_IN + 0.5 });
    ink(c, W_FINE);
    c.beginPath(); c.moveTo(-14, -70); c.quadraticCurveTo(-10, -86, -14, -100); c.moveTo(10, -70); c.quadraticCurveTo(14, -88, 8, -104); c.stroke();
  } else if (kind === 'bucket') {
    const brim = new Path2D();
    brim.ellipse(0, -32, 56, 13, 0, 0, Math.PI * 2);
    paint(c, brim, shade(col, -0.05), { shadow: poly([0, -40, 70, -40, 70, -10, 0, -10]) });
    const cr = new Path2D();
    cr.moveTo(-38, -32);
    cr.bezierCurveTo(-38, -76, 38, -76, 38, -32);
    cr.quadraticCurveTo(0, -24, -38, -32);
    cr.closePath();
    paint(c, cr, col, { shadow: poly([10, -90, 50, -90, 50, -20, 16, -20]) });
    ink(c, W_FINE);
    c.beginPath(); c.moveTo(-36, -42); c.quadraticCurveTo(0, -36, 36, -42); c.stroke();
  } else {
    const cr = new Path2D();
    cr.moveTo(-40, -30);
    cr.bezierCurveTo(-44, -84, 44, -84, 40, -30);
    cr.quadraticCurveTo(0, -36, -40, -30);
    cr.closePath();
    paint(c, cr, col, { shadow: poly([8, -100, 60, -100, 60, -20, 18, -24, 16, -60]), lit: poly([-30, -40, -24, -66, -8, -76, -16, -60, -26, -36]) });
    ink(c, W_FINE);
    c.beginPath(); c.moveTo(0, -76); c.lineTo(0, -34); c.stroke();
    c.fillStyle = dark(col);
    c.beginPath(); c.arc(0, -77, 3, 0, Math.PI * 2); c.fill();
    const brim = new Path2D();
    brim.moveTo(-34, -32);
    brim.quadraticCurveTo(10, -42, 52, -24);
    brim.quadraticCurveTo(40, -14, 6, -20);
    brim.quadraticCurveTo(-20, -22, -34, -32);
    brim.closePath();
    paint(c, brim, shade(col, -0.1), { shadow: poly([-40, -24, 60, -24, 60, -10, -40, -10]) });
  }
  c.restore();
}

function glasses(c: C): void {
  ink(c, 2.2, '#3a2420');
  const lx = X(-15), rx = X(15);
  c.beginPath(); c.roundRect(lx - 10 * (1 - TURN * 0.38), -8, 20 * (1 - TURN * 0.38), 15, 4.5); c.stroke();
  c.beginPath(); c.roundRect(rx - 11, -8, 22, 15, 5); c.stroke();
  c.beginPath(); c.moveTo(lx + 9, -3); c.quadraticCurveTo(X(0), -6, rx - 11, -3); c.stroke();
  c.beginPath(); c.moveTo(rx + 11, -5); c.lineTo(X(35), -7); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.45)';
  for (const x of [lx - 6, rx - 7]) c.fill(poly([x, -6, x + 5, -6, x + 1, 4, x - 3, 4]));
}

function head(c: C, L: Look, B: Build, st: CharState, talk: number, H: HairParts): void {
  const face = facePath(B);
  ear(c, L, B);
  c.fillStyle = L.skin;
  c.fill(face);
  c.save();
  c.clip(face);
  // soft forehead light, feathered shadow plane, warm cheeks, rim on the lit edge
  const fg = c.createRadialGradient(X(-14), -30, 4, X(-10), -18, 48);
  fg.addColorStop(0, 'rgba(255,246,232,0.42)');
  fg.addColorStop(1, 'rgba(255,246,232,0)');
  c.fillStyle = fg;
  c.fillRect(-60, -70, 120, 130);
  soft(c, faceShadow(B), dark(L.skin), 1.6);
  for (const side of [-1, 1]) {
    const cx = X(side * 19), cy = 16;
    const bg = c.createRadialGradient(cx, cy, 1, cx, cy, 13);
    bg.addColorStop(0, `rgba(226,110,120,${L.age === 'kid' ? 0.36 : L.masc ? 0.14 : 0.26})`);
    bg.addColorStop(1, 'rgba(226,110,120,0)');
    c.fillStyle = bg;
    c.beginPath(); c.arc(cx, cy, 13, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  rim(c, face, 1);
  fringeShadow(c, L, face, H);
  ink(c, W_OUT);
  c.stroke(face);
  if (B.round < 0.6) {
    c.strokeStyle = mix(dark(L.skin, 1.6), INK, 0.35);
    c.lineWidth = W_FINE;
    c.beginPath(); c.moveTo(X(25), 6); c.quadraticCurveTo(X(27), 12, X(24), 18); c.stroke();
  }
  if (L.freckles) {
    c.fillStyle = 'rgba(150,80,50,0.55)';
    for (const [x, y] of [[-22, 10], [-16, 13], [-25, 15], [-18, 18], [22, 10], [16, 13], [25, 15], [18, 18], [-3, 12], [3, 12]]) { c.beginPath(); c.arc(X(x), y, 0.9, 0, Math.PI * 2); c.fill(); }
  }
  if (L.age === 'old') {
    c.strokeStyle = mix(dark(L.skin, 1.5), INK, 0.3);
    c.lineWidth = W_FINE;
    c.beginPath(); c.moveTo(X(-11), 22); c.quadraticCurveTo(X(-15), 30, X(-13), 38); c.moveTo(X(11), 22); c.quadraticCurveTo(X(15), 30, X(13), 38); c.stroke();
    c.beginPath(); c.moveTo(X(-14), -30); c.quadraticCurveTo(X(0), -33, X(14), -30); c.moveTo(X(-10), -36); c.quadraticCurveTo(X(0), -38, X(10), -36); c.stroke();
  }
  const blink = (st.time % 3.8) > 3.66;
  for (const side of [-1, 1]) eye(c, L, B, side, st.expr, blink);
  for (const side of [-1, 1]) brow(c, L, side, st.expr);
  nose(c, L, B);
  if (L.beard) beard(c, L, B);
  mouth(c, L, B, st.expr, talk);
  hairFront(c, L, H);
  if (L.glasses) glasses(c);
  if (L.hat) hat(c, L);
}

// ---------- body ----------

function neck(c: C, L: Look, B: Build, headY: number): void {
  const w = B.neckW;
  const nx = CX * 0.5;
  const p = poly([nx - w, B.shoulderY + 4, nx - w + 1, headY + 34, nx + w - 1, headY + 34, nx + w, B.shoulderY + 4]);
  const sh = new Path2D();
  sh.moveTo(nx - w - 2, headY + 30);
  sh.lineTo(nx + w + 2, headY + 30);
  sh.lineTo(nx + w + 2, headY + 60);
  sh.quadraticCurveTo(nx, headY + 46, nx - w - 2, headY + 56);
  sh.closePath();
  sh.rect(nx + w * 0.3, headY + 30, w, 120);
  paint(c, p, L.skin, { shadow: sh, w: W_IN + 0.7 });
  // collarbones
  c.strokeStyle = mix(dark(L.skin, 1.5), INK, 0.3);
  c.lineWidth = W_FINE;
  c.beginPath(); c.moveTo(nx - w - 14, B.shoulderY + 6); c.quadraticCurveTo(nx - w - 4, B.shoulderY + 10, nx - 3, B.shoulderY + 8); c.moveTo(nx + w + 14, B.shoulderY + 6); c.quadraticCurveTo(nx + w + 4, B.shoulderY + 10, nx + 3, B.shoulderY + 8); c.stroke();
}

function torsoPath(B: Build): Path2D {
  const { sw, shoulderY: y, neckW: n } = B;
  const l = sw * 0.94, r = sw * 1.03; // the far shoulder sits a touch narrower at three-quarter
  const nx = CX * 0.5;
  const p = new Path2D();
  p.moveTo(nx - n - 4, y - 2);
  p.bezierCurveTo(nx - n - 22, y + 2, -l + 12, y + 2, -l + 2, y + 18);
  p.bezierCurveTo(-l - 6, y + 36, -l - 4, y + 90, -l + 2, y + 210);
  p.lineTo(r - 2, y + 210);
  p.bezierCurveTo(r + 4, y + 90, r + 6, y + 36, r - 2, y + 18);
  p.bezierCurveTo(r - 12, y + 2, nx + n + 22, y + 2, nx + n + 4, y - 2);
  p.closePath();
  return p;
}

function necklace(c: C, L: Look, B: Build): void {
  const y = B.shoulderY, nx = CX * 0.5;
  if (L.necklace === 'cross' || L.necklace === 'chain') {
    ink(c, 1.4, '#c9c6d4');
    c.beginPath(); c.moveTo(nx - B.neckW - 6, y + 2); c.quadraticCurveTo(nx, y + 40, nx + B.neckW + 6, y + 2); c.stroke();
    ink(c, 0.7);
    c.beginPath(); c.moveTo(nx - B.neckW - 6, y + 3.4); c.quadraticCurveTo(nx, y + 41.4, nx + B.neckW + 6, y + 3.4); c.stroke();
    if (L.necklace === 'cross') {
      const cx = nx, cy = y + 32;
      const cr = poly([cx - 1.8, cy, cx + 1.8, cy, cx + 1.8, cy + 5, cx + 6, cy + 5, cx + 6, cy + 8.6, cx + 1.8, cy + 8.6, cx + 1.8, cy + 20, cx - 1.8, cy + 20, cx - 1.8, cy + 8.6, cx - 6, cy + 8.6, cx - 6, cy + 5, cx - 1.8, cy + 5]);
      paint(c, cr, '#d8d4e2', { shadow: poly([cx, cy, cx + 8, cy, cx + 8, cy + 22, cx, cy + 22]), w: W_FINE + 0.3, rim: 0 });
    }
  }
  if (L.necklace === 'whistle') {
    ink(c, 1.6, '#e8665a');
    c.beginPath(); c.moveTo(nx - B.neckW - 6, y + 2); c.quadraticCurveTo(nx, y + 48, nx + B.neckW + 6, y + 2); c.stroke();
    const w = new Path2D(); w.roundRect(nx - 5, y + 42, 16, 8, 3);
    paint(c, w, '#d8dbe2', { shadow: poly([nx, y + 46, nx + 14, y + 46, nx + 14, y + 52, nx, y + 52]), w: W_FINE + 0.3, rim: 0 });
  }
}

function torso(c: C, L: Look, B: Build): void {
  const { sw, shoulderY: y, neckW: n } = B;
  const nx = CX * 0.5;
  const top = L.top;
  const body = torsoPath(B);
  const sh = new Path2D();
  sh.moveTo(sw * 0.42, y - 10);
  sh.bezierCurveTo(sw * 0.6, y + 40, sw * 0.48, y + 90, sw * 0.6, y + 220);
  sh.lineTo(sw + 20, y + 220);
  sh.lineTo(sw + 20, y - 10);
  sh.closePath();
  const lt = poly([-sw + 6, y + 14, -sw * 0.55, y + 8, -sw * 0.62, y + 60, -sw + 4, y + 80]);
  paint(c, body, top, { shadow: sh, lit: lt, feather: 2.4 });
  c.strokeStyle = mix(dark(top, 1.5), INK, 0.3);
  c.lineWidth = W_IN;
  c.beginPath();
  c.moveTo(-sw * 0.5, y + 40); c.quadraticCurveTo(-sw * 0.38, y + 62, -sw * 0.46, y + 88);
  c.moveTo(sw * 0.35, y + 52); c.quadraticCurveTo(sw * 0.28, y + 74, sw * 0.4, y + 96);
  c.stroke();

  const inner = L.inner ?? '#f2efe8';
  switch (L.outfit) {
    case 'hoodie': {
      const hood = new Path2D();
      hood.moveTo(nx - n - 26, y + 4);
      hood.bezierCurveTo(nx - n - 30, y - 22, nx + n + 30, y - 22, nx + n + 26, y + 4);
      hood.bezierCurveTo(nx + n + 12, y + 20, nx - n - 12, y + 20, nx - n - 26, y + 4);
      hood.closePath();
      paint(c, hood, shade(top, -0.06), { shadow: poly([nx + 4, y - 30, 60, y - 30, 60, y + 30, nx + 8, y + 30]), w: W_IN + 0.8 });
      c.fillStyle = dark(top, 1.6);
      c.beginPath(); c.ellipse(nx, y - 2, n + 10, 6, 0, 0, Math.PI * 2); c.fill();
      for (const sx of [-1, 1]) {
        ink(c, 3, '#f4f0e6');
        c.beginPath(); c.moveTo(nx + sx * 9, y + 12); c.quadraticCurveTo(nx + sx * 11, y + 40, nx + sx * 10, y + 58); c.stroke();
        ink(c, 0.8);
        c.beginPath(); c.moveTo(nx + sx * 9 - 1.6, y + 12); c.quadraticCurveTo(nx + sx * 11 - 1.6, y + 40, nx + sx * 10 - 1.6, y + 58); c.stroke();
        c.fillStyle = '#c9c4ba'; c.fillRect(nx + sx * 10 - 2, y + 56, 4, 8);
      }
      c.strokeStyle = mix(dark(top, 1.5), INK, 0.35); c.lineWidth = W_IN;
      c.beginPath(); c.moveTo(-sw * 0.62, y + 150); c.lineTo(-sw * 0.42, y + 108); c.lineTo(sw * 0.42, y + 108); c.lineTo(sw * 0.62, y + 150); c.stroke();
      break;
    }
    case 'tee': {
      const neckHole = new Path2D();
      neckHole.moveTo(nx - n - 9, y - 1);
      neckHole.quadraticCurveTo(nx, y + 22, nx + n + 9, y - 1);
      neckHole.lineTo(nx + n + 4, y - 4);
      neckHole.quadraticCurveTo(nx, y + 12, nx - n - 4, y - 4);
      neckHole.closePath();
      paint(c, neckHole, shade(top, -0.08), { w: W_IN, rim: 0 });
      if (L.inner) {
        const pr = poly([-18, y + 50, 0, y + 34, 18, y + 50, 10, y + 70, -10, y + 70]);
        paint(c, pr, L.inner, { shadow: poly([4, y + 30, 30, y + 30, 30, y + 80, 6, y + 80]), w: W_IN, rim: 0 });
      }
      break;
    }
    case 'shirt': {
      paint(c, poly([nx - 4, y + 4, nx + 4, y + 4, nx + 4, y + 210, nx - 4, y + 210]), shade(top, 0.04), { w: W_FINE, rim: 0 });
      for (const side of [-1, 1]) {
        const col = poly([nx + side * 2, y + 16, nx + side * (n + 14), y - 6, nx + side * (n + 6), y - 10, nx + side * 1, y + 4]);
        paint(c, col, light(top, 0.6), { shadow: side > 0 ? col : undefined, w: W_IN + 0.3, rim: 0 });
      }
      c.fillStyle = '#f6f2ea';
      for (const by of [y + 34, y + 64, y + 94]) { c.beginPath(); c.arc(nx, by, 2.4, 0, Math.PI * 2); c.fill(); ink(c, W_FINE); c.stroke(); }
      break;
    }
    case 'dress': {
      // gothic: square neckline, laced corset, lace trim
      const neckline = new Path2D();
      neckline.moveTo(nx - n - 20, y + 2);
      neckline.quadraticCurveTo(nx, y + 6, nx + n + 20, y + 2);
      neckline.lineTo(nx + n + 16, y + 30);
      neckline.quadraticCurveTo(nx, y + 40, nx - n - 16, y + 30);
      neckline.closePath();
      paint(c, neckline, L.skin, { shadow: poly([nx + 2, y - 4, nx + 40, y - 4, nx + 40, y + 50, nx + 6, y + 50]), w: W_IN, rim: 0 });
      // lace edge
      c.fillStyle = '#1a1220';
      for (let i = 0; i <= 12; i++) { const t = i / 12; const lx = nx - n - 16 + t * (n * 2 + 32); const ly = y + 30 + Math.sin(t * Math.PI) * 9; c.beginPath(); c.arc(lx, ly + 1, 3.4, 0, Math.PI); c.fill(); }
      // corset panel
      const cor = new Path2D();
      cor.moveTo(nx - sw * 0.52, y + 44);
      cor.quadraticCurveTo(nx, y + 36, nx + sw * 0.55, y + 44);
      cor.lineTo(nx + sw * 0.46, y + 210);
      cor.lineTo(nx - sw * 0.44, y + 210);
      cor.closePath();
      paint(c, cor, shade(top, -0.18), { shadow: poly([nx + sw * 0.12, y + 30, nx + 80, y + 30, nx + 80, y + 220, nx + sw * 0.2, y + 220]), w: W_IN + 0.3, rim: 0.5 });
      // boning seams and laces
      c.strokeStyle = mix(dark(top, 1.8), INK, 0.4); c.lineWidth = W_FINE;
      for (const bx of [-0.3, -0.12, 0.14, 0.32]) { c.beginPath(); c.moveTo(nx + sw * bx, y + 42); c.lineTo(nx + sw * bx * 0.9, y + 210); c.stroke(); }
      c.strokeStyle = '#cfc4e0'; c.lineWidth = 1.2;
      for (let ly = y + 52; ly < y + 180; ly += 11) { c.beginPath(); c.moveTo(nx - 5, ly); c.lineTo(nx + 5, ly + 5.5); c.moveTo(nx + 5, ly); c.lineTo(nx - 5, ly + 5.5); c.stroke(); }
      c.fillStyle = '#9a96a8';
      for (let ly = y + 52; ly < y + 180; ly += 11) { c.beginPath(); c.arc(nx - 5.5, ly, 1.2, 0, Math.PI * 2); c.arc(nx + 5.5, ly, 1.2, 0, Math.PI * 2); c.fill(); }
      // puffed shoulders
      for (const side of [-1, 1]) {
        const px = side < 0 ? -sw * 0.94 + 4 : sw * 1.03 - 4;
        const puff = new Path2D();
        puff.ellipse(px - side * 3, y + 20, 17, 20, side * 0.3, 0, Math.PI * 2);
        paint(c, puff, top, { shadow: poly([px + 2, y - 10, px + 40, y - 10, px + 40, y + 60, px + 6, y + 60]), lit: poly([px - 16, y + 6, px - 6, y - 2, px - 4, y + 14, px - 14, y + 26]), w: W_OUT });
        c.strokeStyle = mix(dark(top, 1.6), INK, 0.35); c.lineWidth = W_FINE;
        c.beginPath(); c.moveTo(px - 8 * side, y + 2); c.quadraticCurveTo(px, y + 20, px - 6 * side, y + 42); c.moveTo(px + 6 * side, y + 4); c.quadraticCurveTo(px + 12 * side, y + 22, px + 6 * side, y + 42); c.stroke();
      }
      break;
    }
    case 'jacket': {
      paint(c, poly([nx - n - 8, y - 2, nx + n + 8, y - 2, nx + 16, y + 210, nx - 16, y + 210]), inner, { shadow: poly([nx + 4, y - 10, nx + 40, y - 10, nx + 40, y + 220, nx + 8, y + 220]), w: W_IN, rim: 0 });
      for (const side of [-1, 1]) {
        const lap = poly([nx + side * (n + 9), y - 4, nx + side * (n + 24), y + 2, nx + side * 30, y + 26, nx + side * 14, y + 96, nx + side * 17, y + 30]);
        paint(c, lap, shade(top, -0.06), { shadow: side > 0 ? lap : undefined, w: W_IN + 0.5, rim: 0 });
      }
      ink(c, W_IN);
      c.beginPath(); c.moveTo(nx - 16, y + 96); c.lineTo(nx - 17, y + 210); c.moveTo(nx + 16, y + 96); c.lineTo(nx + 17, y + 210); c.stroke();
      break;
    }
    case 'cardigan': {
      paint(c, poly([nx - n - 7, y - 2, nx + n + 7, y - 2, nx, y + 76]), inner, { shadow: poly([nx + 2, y - 10, nx + 30, y - 10, nx + 30, y + 90]), w: W_IN, rim: 0 });
      ink(c, W_IN);
      c.beginPath(); c.moveTo(nx, y + 76); c.lineTo(nx, y + 210); c.stroke();
      c.fillStyle = '#f2e2c0';
      for (const by of [y + 92, y + 120, y + 148]) { c.beginPath(); c.arc(nx - 5, by, 3, 0, Math.PI * 2); c.fill(); ink(c, W_FINE); c.stroke(); }
      c.strokeStyle = mix(dark(top, 1.4), INK, 0.3); c.lineWidth = W_FINE;
      c.beginPath(); c.moveTo(nx - n - 12, y + 2); c.lineTo(nx - 4, y + 80); c.moveTo(nx + n + 12, y + 2); c.lineTo(nx + 4, y + 80); c.stroke();
      break;
    }
    case 'apron': {
      const bib = poly([nx - 30, y + 46, nx + 30, y + 46, nx + 38, y + 210, nx - 38, y + 210]);
      paint(c, bib, inner, { shadow: poly([nx + 14, y + 40, nx + 50, y + 40, nx + 50, y + 220, nx + 18, y + 220]), w: W_IN + 0.5, rim: 0.4 });
      ink(c, 5, shade(inner, -0.18));
      c.beginPath(); c.moveTo(nx - 27, y + 46); c.lineTo(nx - n - 6, y - 2); c.moveTo(nx + 27, y + 46); c.lineTo(nx + n + 6, y - 2); c.stroke();
      ink(c, W_FINE);
      c.beginPath(); c.moveTo(nx - 22, y + 96); c.lineTo(nx + 22, y + 96); c.moveTo(nx - 22, y + 124); c.lineTo(nx + 22, y + 124); c.moveTo(nx, y + 96); c.lineTo(nx, y + 124); c.stroke();
      break;
    }
  }
  necklace(c, L, B);
}

// ---------- arms & hands ----------

/** Sleeve colour of the forearm (gothic dresses have dark sheer long sleeves under the puff). */
function sleeveOf(L: Look): string {
  if (L.outfit === 'tee') return L.skin;
  if (L.outfit === 'dress') return '#1e1626';
  return L.top;
}

function arm(c: C, L: Look, B: Build, sx: number, sy: number, ex: number, ey: number, hx: number, hy: number): void {
  const bare = L.outfit === 'tee';
  const col = L.outfit === 'dress' ? '#1e1626' : L.top;
  const seg = (ax: number, ay: number, bx: number, by: number, w0: number, w1: number) => {
    const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    const q = [ax + nx * w0, ay + ny * w0, bx + nx * w1, by + ny * w1, bx - nx * w1, by - ny * w1, ax - nx * w0, ay - ny * w0];
    let area = 0;
    for (let i = 0; i < 8; i += 2) { const j = (i + 2) % 8; area += q[i] * q[j + 1] - q[j] * q[i + 1]; }
    const fill = poly(q);
    fill.moveTo(bx + w1, by); fill.arc(bx, by, w1, 0, Math.PI * 2, area < 0);
    const edge = new Path2D();
    edge.moveTo(ax + nx * w0, ay + ny * w0);
    edge.lineTo(bx + nx * w1, by + ny * w1);
    edge.arc(bx, by, w1, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
    edge.lineTo(ax - nx * w0, ay - ny * w0);
    return { fill, edge };
  };
  const shOff = (p: Path2D) => { const s = new Path2D(); s.addPath(p, new DOMMatrix().translate(5, 4)); return s; };
  const part = (sgm: { fill: Path2D; edge: Path2D }, base: string, w: number) => {
    c.fillStyle = base;
    c.fill(sgm.fill);
    c.save(); c.clip(sgm.fill); soft(c, shOff(sgm.fill), dark(base), 1.4); c.restore();
    rim(c, sgm.fill, 0.7);
    ink(c, w);
    c.stroke(sgm.edge);
  };
  const k = B.sw / 72 * (B.fem ? 0.92 : 1);
  const ax = sx + (ex - sx) * -0.12, ay = sy + (ey - sy) * -0.12;
  part(seg(ex, ey, hx, hy, 12 * k, 9 * k), bare ? L.skin : col, W_OUT - 0.4);
  if (bare) {
    part(seg(ax, ay, ex, ey, 14.5 * k, 12 * k), L.skin, W_OUT - 0.4);
    part(seg(ax, ay, sx + (ex - sx) * 0.5, sy + (ey - sy) * 0.5, 16.5 * k, 15 * k), L.top, W_OUT - 0.4);
  } else {
    part(seg(ax, ay, ex, ey, 15 * k, 12.5 * k), col, W_OUT - 0.4);
    if (L.outfit !== 'dress') {
      const cx = ex + (hx - ex) * 0.84, cy = ey + (hy - ey) * 0.84;
      part(seg(cx, cy, hx, hy, 10.5 * k, 10 * k), shade(col, -0.08), W_IN + 0.5);
    } else {
      // lace cuff
      const cx = ex + (hx - ex) * 0.9, cy = ey + (hy - ey) * 0.9;
      part(seg(cx, cy, hx, hy, 11 * k, 12 * k), '#2a2030', W_IN + 0.5);
    }
  }
}

type HandKind = 'open' | 'fist' | 'peace' | 'point' | 'horns' | 'flat';

/** Hand at (x, y), rotated by ang (0 = fingers up); flip mirrors it. */
function hand(c: C, L: Look, B: Build, x: number, y: number, kind: HandKind, ang = 0, flip = 1): void {
  const skin = L.skin;
  const sz = B.fem ? 1.04 : 1.16;
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(flip * sz, sz);
  const fw = B.fem ? 3.1 : 3.6;
  const finger = (fx: number, fy: number, len: number, a: number, w = fw, bent = false) => {
    c.save();
    c.translate(fx, fy);
    c.rotate(a);
    const p = new Path2D();
    if (bent) p.roundRect(-w, -len * 0.5, w * 2, len * 0.5 + 2, w);
    else {
      p.moveTo(-w, 2);
      p.lineTo(-w * 0.86, -len + w);
      p.arc(0, -len + w, w * 0.86, Math.PI, 0);
      p.lineTo(w, 2);
      p.closePath();
    }
    paint(c, p, skin, { shadow: poly([w * 0.15, 4, w + 2, 4, w + 2, -len - 2, w * 0.15, -len - 2]), w: W_IN + 0.3, rim: 0, feather: 0.6 });
    if (!bent) {
      if (L.nails) {
        c.fillStyle = L.nails;
        c.beginPath(); c.ellipse(0, -len + w + 0.4, w * 0.62, w * 0.9, 0, 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = mix(dark(skin, 1.5), INK, 0.3); c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(-w * 0.5, -len * 0.45); c.lineTo(w * 0.4, -len * 0.45); c.stroke();
    }
    c.restore();
  };
  const palm = new Path2D();
  palm.moveTo(-11, -6);
  palm.quadraticCurveTo(-12, 8, -8, 16);
  palm.quadraticCurveTo(0, 20, 9, 15);
  palm.quadraticCurveTo(12, 6, 11, -7);
  palm.quadraticCurveTo(0, -11, -11, -6);
  palm.closePath();
  // which fingers stand (index, middle, ring, little from the thumb side)
  const ext = kind === 'open' || kind === 'flat' ? [true, true, true, true]
    : kind === 'peace' ? [true, true, false, false]
      : kind === 'point' ? [true, false, false, false]
        : kind === 'horns' ? [true, false, false, true]
          : [false, false, false, false];
  const fx = [-7.6, -2.6, 2.6, 7.4], fl = [21, 23, 22, 18];
  const fa = kind === 'open' ? [-0.26, -0.08, 0.08, 0.24] : kind === 'horns' ? [-0.18, -0.04, 0.06, 0.22] : [-0.1, -0.03, 0.05, 0.12];
  for (let i = 0; i < 4; i++) if (ext[i]) finger(fx[i], -7, fl[i], fa[i], i === 3 ? fw * 0.88 : fw);
  paint(c, palm, skin, { shadow: poly([3, -14, 16, -14, 16, 22, 5, 22]), w: W_OUT - 0.6, rim: 0.6 });
  for (let i = 0; i < 4; i++) if (!ext[i]) finger(fx[i], -4, 13, fa[i], i === 3 ? fw * 0.88 : fw, true);
  const th = new Path2D();
  th.moveTo(-10, 4);
  th.quadraticCurveTo(-20, -2, -19, -12);
  th.arc(-16, -12, 3.2, Math.PI, 0);
  th.quadraticCurveTo(-13, -2, -6, 0);
  th.closePath();
  paint(c, th, skin, { w: W_IN + 0.3, rim: 0 });
  c.strokeStyle = mix(dark(skin, 1.5), INK, 0.3); c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(-7, -2); c.quadraticCurveTo(0, -5, 8, -3); c.stroke();
  c.restore();
}

// ---------- the customer ----------

/** Where the hands are in the 'hold' pose (bust units, waist at 0): ±x, y. */
export function holdPoint(L: Look): { x: number; y: number } {
  const B = build(L);
  return { x: B.sw * 0.95, y: B.shoulderY + 58 };
}

/** The bust's breathing bob at a time, in bust units (to move what they hold with them). */
export const breatheAt = (time: number): number => Math.sin(time * 2) * 0.7;

/** Paint the whole bust at origin (waist on the counter line), in character units. */
function renderBust(c: C, L: Look, st: CharState, talk: number): void {
  const B = build(L);
  const H = hairShapes(L);
  const headTilt = st.pose === 'think' ? -0.12 : st.pose === 'shy' ? 0.1 : st.pose === 'cross' ? -0.05 : st.pose === 'laugh' ? -0.08 : st.pose === 'rock' ? 0.06 : 0;
  const headY = B.headY;
  c.save();
  c.translate(0, headY);
  c.rotate(headTilt);
  c.scale(B.headS, B.headS);
  hairBack(c, L, H);
  c.restore();
  neck(c, L, B, headY);
  torso(c, L, B);
  if (L.choker) {
    const ch = new Path2D();
    const nx = CX * 0.5;
    ch.rect(nx - B.neckW - 1.5, B.shoulderY - 20, (B.neckW + 1.5) * 2, 6.5);
    paint(c, ch, '#16121a', { w: W_IN, rim: 0 });
    c.fillStyle = '#dcd8e8';
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(nx + i * (B.neckW * 0.42), B.shoulderY - 16.8, 1.3, 0, Math.PI * 2); c.fill(); }
    ink(c, W_FINE);
    c.beginPath(); c.arc(nx, B.shoulderY - 10.5, 3.2, 0, Math.PI * 2); c.stroke();
  }
  braidsFront(c, L, H, headY);
  c.save();
  c.translate(0, headY);
  c.rotate(headTilt);
  c.scale(B.headS, B.headS);
  head(c, L, B, st, talk, H);
  napeBow(c, L);
  c.restore();

  const { sw, shoulderY: sy } = B;
  const sL = -sw * 0.94 + 6, sR = sw * 1.03 - 6, shY = sy + 22;
  const t = st.time;
  switch (st.pose) {
    case 'cheer': {
      const wob = Math.sin(t * 8) * 4;
      arm(c, L, B, sL, shY, sL - 30, sy - 40, sL - 16, sy - 112 + wob);
      arm(c, L, B, sR, shY, sR + 30, sy - 40, sR + 16, sy - 112 - wob);
      hand(c, L, B, sL - 16, sy - 128 + wob, 'open', -0.15);
      hand(c, L, B, sR + 16, sy - 128 - wob, 'open', 0.15, -1);
      break;
    }
    case 'peace': {
      arm(c, L, B, sR, shY, sR + 22, sy + 56, sR - 4, sy - 34);
      hand(c, L, B, sR - 4, sy - 50, 'peace', 0.12, -1);
      break;
    }
    case 'rock': {
      // rock on: hand up by the face, index and little finger out
      arm(c, L, B, sR, shY, sR + 24, sy + 54, sR + 2, sy - 30);
      hand(c, L, B, sR + 2, sy - 46, 'horns', 0.18, -1);
      break;
    }
    case 'wave': {
      const a = Math.sin(t * 7) * 0.28;
      arm(c, L, B, sR, shY, sR + 28, sy + 50, sR + 24, sy - 46);
      hand(c, L, B, sR + 24, sy - 62, 'open', 0.1 + a, -1);
      break;
    }
    case 'laugh': {
      // one hand on the chest, the other open to the side, palm up
      arm(c, L, B, sL, shY, sL + 6, sy + 92, -6, sy + 66);
      hand(c, L, B, -4, sy + 56, 'flat', 1.15);
      const bob = Math.sin(t * 9) * 2;
      arm(c, L, B, sR, shY, sR + 22, sy + 84, sR + 44, sy + 40 + bob);
      hand(c, L, B, sR + 52, sy + 30 + bob, 'open', 0.7, -1);
      break;
    }
    case 'think': {
      arm(c, L, B, sR, shY, sR - 6, sy + 92, CX + 14, B.headY + 64);
      hand(c, L, B, CX + 14, B.headY + 56, 'point', -0.35, -1);
      break;
    }
    case 'cross': {
      arm(c, L, B, sL, shY, sL - 2, sy + 76, sw * 0.38, sy + 86);
      arm(c, L, B, sR, shY, sR + 2, sy + 88, -sw * 0.38, sy + 96);
      hand(c, L, B, sw * 0.42, sy + 80, 'fist', 1.4);
      hand(c, L, B, -sw * 0.42, sy + 92, 'fist', -1.4, -1);
      break;
    }
    case 'hold': {
      // both hands up in front of the chest, holding something between them
      const h = holdPoint(L);
      arm(c, L, B, sL, shY, sL + 2, sy + 104, -h.x, h.y + 6);
      arm(c, L, B, sR, shY, sR - 2, sy + 104, h.x, h.y + 6);
      hand(c, L, B, -h.x, h.y, 'fist', 1.25);
      hand(c, L, B, h.x, h.y, 'fist', -1.25, -1);
      break;
    }
    case 'shy': {
      arm(c, L, B, sL, shY, sL + 4, sy + 84, -6, sy + 108);
      arm(c, L, B, sR, shY, sR - 4, sy + 88, 6, sy + 112);
      hand(c, L, B, -8, sy + 100, 'fist', 2.6);
      hand(c, L, B, 8, sy + 104, 'fist', -2.6, -1);
      break;
    }
    default:
      break;
  }
}

// One sprite per look / pose / expression / mouth / blink (and a few frames for moving hands).
const BOX = { x0: -150, y0: -350, w: 300, h: 400 };
const cache = new Map<string, HTMLCanvasElement>();
const looksId = new WeakMap<Look, number>();
let nextId = 1;

/**
 * Draw a customer. (x, y) = where their waist meets the counter top; s = scale.
 * talk = 0..1 mouth openness.
 */
export function drawCustomer(c: C, L: Look, x: number, y: number, s: number, st: CharState, talk: number): void {
  const dpr = view.dpr || 1;
  const res = s * dpr;
  if (!looksId.has(L)) looksId.set(L, nextId++);
  const moving = st.pose === 'wave' || st.pose === 'cheer' || st.pose === 'laugh';
  const frame = moving ? Math.floor(st.time * 12) % 18 : 0;
  const blink = (st.time % 3.8) > 3.66;
  const tq = talk > 0.5 ? 2 : talk > 0.2 ? 1 : 0;
  const key = `${looksId.get(L)}|${st.pose}|${st.expr}|${tq}|${blink ? 1 : 0}|${frame}|${res.toFixed(3)}`;
  let spr = cache.get(key);
  if (!spr) {
    spr = document.createElement('canvas');
    spr.width = Math.ceil(BOX.w * res);
    spr.height = Math.ceil(BOX.h * res);
    const g = spr.getContext('2d')!;
    g.setTransform(res, 0, 0, res, -BOX.x0 * res, -BOX.y0 * res);
    px = res;
    // freeze time at the frame / blink state the key describes
    const t = moving ? frame / 12 : blink ? 3.7 : 1;
    renderBust(g, L, { ...st, time: t }, tq === 2 ? 0.8 : tq === 1 ? 0.4 : 0);
    cache.set(key, spr);
    if (cache.size > 48) cache.delete(cache.keys().next().value!);
  }
  const breathe = Math.sin(st.time * 2) * 1.4;
  const sq = 1 + st.bounce * 0.04;
  c.save();
  c.translate(x, y);
  c.scale(1 / sq, sq);
  c.translate(0, breathe * 0.5 * s);
  c.drawImage(spr, BOX.x0 * s, BOX.y0 * s, BOX.w * s, BOX.h * s);
  c.restore();
}
