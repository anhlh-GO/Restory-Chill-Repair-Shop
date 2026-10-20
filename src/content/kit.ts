// Reusable drawing pieces for device internals.

import { type C, rr, rrc, rng, shade } from '../core/draw';

/** Green PCB with chips, traces and gold pads. */
export function pcb(c: C, w: number, h: number, seed: number, color = '#2f8a4f'): void {
  const r = rng(seed);
  c.save();
  const p = new Path2D();
  rrc(p, 0, 0, w, h, Math.min(8, w * 0.1));
  c.fillStyle = 'rgba(10,20,40,0.35)';
  c.save(); c.translate(-3, 4); c.fill(p); c.restore();
  c.fillStyle = shade(color, -0.4);
  c.save(); c.translate(0, 3); c.fill(p); c.restore();
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, shade(color, 0.15));
  g.addColorStop(1, shade(color, -0.12));
  c.fillStyle = g;
  c.fill(p);
  c.clip(p);
  // traces
  c.strokeStyle = shade(color, 0.28);
  c.lineWidth = 1.2;
  for (let i = 0; i < Math.max(4, (w * h) / 900); i++) {
    let x = (r() - 0.5) * w, y = (r() - 0.5) * h;
    c.beginPath();
    c.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      if (r() < 0.5) x += (r() - 0.5) * w * 0.6; else y += (r() - 0.5) * h * 0.6;
      c.lineTo(x, y);
    }
    c.stroke();
  }
  // gold pads
  c.fillStyle = '#e8c15a';
  for (let i = 0; i < Math.max(3, (w * h) / 1400); i++) {
    c.beginPath();
    c.arc((r() - 0.5) * w * 0.85, (r() - 0.5) * h * 0.85, 1.6 + r() * 1.4, 0, Math.PI * 2);
    c.fill();
  }
  // chips
  const n = Math.max(1, Math.round((w * h) / 3200));
  for (let i = 0; i < n; i++) {
    const cw = 10 + r() * Math.min(34, w * 0.35), ch = 8 + r() * Math.min(26, h * 0.3);
    const cx = (r() - 0.5) * (w - cw - 8), cy = (r() - 0.5) * (h - ch - 8);
    c.fillStyle = '#9aa3ad';
    for (let k = 0; k < cw / 4; k++) {
      c.fillRect(cx - cw / 2 + 2 + k * 4, cy - ch / 2 - 2, 1.6, 2);
      c.fillRect(cx - cw / 2 + 2 + k * 4, cy + ch / 2, 1.6, 2);
    }
    c.fillStyle = '#23262d';
    c.beginPath(); rrc(c, cx, cy, cw, ch, 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.fillRect(cx - cw / 2 + 1, cy - ch / 2 + 1, cw - 2, ch * 0.35);
  }
  // small caps (yellow / orange like the reference)
  for (let i = 0; i < Math.max(1, (w * h) / 2600); i++) {
    const x = (r() - 0.5) * w * 0.8, y = (r() - 0.5) * h * 0.8;
    c.fillStyle = r() < 0.5 ? '#f1c232' : '#e57a2e';
    c.beginPath(); rrc(c, x, y, 7, 5, 1.5); c.fill();
  }
  c.restore();
  c.strokeStyle = shade(color, -0.45);
  c.lineWidth = 1;
  c.stroke(p);
}

/** A horizontal cylinder (axis along x) — motors, coils, batteries. */
export function cylH(c: C, w: number, h: number, color: string, cap = '#d9b25a'): void {
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, shade(color, -0.25));
  g.addColorStop(0.28, shade(color, 0.35));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -0.45));
  c.fillStyle = 'rgba(10,20,40,0.3)';
  c.beginPath(); rrc(c, -3, 5, w, h, h * 0.18); c.fill();
  c.fillStyle = g;
  c.beginPath(); rrc(c, 0, 0, w, h, h * 0.18); c.fill();
  // end caps
  const cg = c.createLinearGradient(0, -h / 2, 0, h / 2);
  cg.addColorStop(0, shade(cap, -0.2));
  cg.addColorStop(0.3, shade(cap, 0.45));
  cg.addColorStop(1, shade(cap, -0.4));
  c.fillStyle = cg;
  c.beginPath(); rrc(c, -w / 2 + 4, 0, 8, h + 2, 3); c.fill();
  c.beginPath(); rrc(c, w / 2 - 4, 0, 8, h + 2, 3); c.fill();
}

/** Copper winding texture inside a rect. */
export function coil(c: C, w: number, h: number): void {
  c.save();
  c.beginPath(); rrc(c, 0, 0, w, h, 4); c.clip();
  for (let x = -w / 2; x < w / 2; x += 3) {
    const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#7a3d12');
    g.addColorStop(0.35, '#f0a35a');
    g.addColorStop(1, '#6a3410');
    c.fillStyle = g;
    c.fillRect(x, -h / 2, 2.2, h);
  }
  c.restore();
}

/** Knurled ring (lens ring, dials). */
export function knurlRing(c: C, r: number, inner: number, color: string): void {
  c.fillStyle = 'rgba(10,20,40,0.3)';
  c.beginPath(); c.arc(-3, 5, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = shade(color, -0.35);
  c.beginPath(); c.arc(0, 3, r, 0, Math.PI * 2); c.fill();
  const g = c.createRadialGradient(-r * 0.4, -r * 0.5, r * 0.1, 0, 0, r);
  g.addColorStop(0, shade(color, 0.5));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.3));
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = shade(color, -0.4);
  c.lineWidth = 1.2;
  const n = Math.round(r * 1.4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    c.beginPath();
    c.moveTo(Math.cos(a) * (inner + (r - inner) * 0.25), Math.sin(a) * (inner + (r - inner) * 0.25));
    c.lineTo(Math.cos(a) * r * 0.97, Math.sin(a) * r * 0.97);
    c.stroke();
  }
}

/** Dark glass disc with reflections. */
export function glass(c: C, r: number, tint = '#1d3b4f'): void {
  const g = c.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.05, 0, 0, r);
  g.addColorStop(0, shade(tint, 0.5));
  g.addColorStop(0.5, tint);
  g.addColorStop(1, shade(tint, -0.6));
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(160,220,255,0.35)';
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(0, 0, r * 0.62, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(0, 0, r * 0.32, 0, Math.PI * 2); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.75)';
  c.beginPath(); c.ellipse(-r * 0.35, -r * 0.4, r * 0.2, r * 0.1, -0.6, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.beginPath(); c.arc(r * 0.35, r * 0.3, r * 0.07, 0, Math.PI * 2); c.fill();
}

/** Horizontal vent slots. */
export function vents(c: C, x: number, y: number, w: number, n: number, gap: number, color: string): void {
  c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    c.strokeStyle = shade(color, -0.5);
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(x - w / 2, y + i * gap); c.lineTo(x + w / 2, y + i * gap); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.25)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(x - w / 2, y + i * gap + 2); c.lineTo(x + w / 2, y + i * gap + 2); c.stroke();
  }
}

/** Inner cavity look for a base shell seen from the open side. */
export function cavity(c: C, path: Path2D, color: string, inset: Path2D): void {
  c.fillStyle = shade(color, -0.35);
  c.fill(inset);
  c.save();
  c.clip(inset);
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 10;
  c.translate(2, 4);
  c.stroke(inset);
  c.restore();
  void path;
}

/** Screw boss (the post a screw goes into). */
export function boss(c: C, x: number, y: number, color: string): void {
  c.fillStyle = shade(color, -0.15);
  c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fill();
  c.fillStyle = shade(color, -0.55);
  c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill();
}

export function ribbon(c: C, x: number, y: number, w: number, h: number): void {
  c.fillStyle = '#e0a640';
  c.beginPath(); rr(c, x - w / 2, y - h / 2, w, h, 2); c.fill();
  c.strokeStyle = 'rgba(120,70,0,0.5)';
  c.lineWidth = 0.6;
  for (let i = 1; i < w / 3; i++) {
    c.beginPath(); c.moveTo(x - w / 2 + i * 3, y - h / 2); c.lineTo(x - w / 2 + i * 3, y + h / 2); c.stroke();
  }
}
