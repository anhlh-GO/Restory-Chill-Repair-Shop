// Particles + floating toasts. Coordinates are screen pixels.

import { type C, sparkleShape, pill, star5, text } from './draw';

type Kind = 'spark' | 'dust' | 'bubble' | 'star' | 'ring' | 'steam' | 'note' | 'confetti' | 'flash';

interface P {
  kind: Kind;
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; color: string; rot: number; vr: number; g: number;
}

const parts: P[] = [];

export function emit(kind: Kind, x: number, y: number, n: number, o: Partial<{ speed: number; size: number; color: string | string[]; life: number; spread: number; dir: number; g: number }> = {}): void {
  for (let i = 0; i < n; i++) {
    const dir = (o.dir ?? -Math.PI / 2) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2);
    const sp = (o.speed ?? 120) * (0.4 + Math.random() * 0.8);
    const col = Array.isArray(o.color) ? o.color[Math.floor(Math.random() * o.color.length)] : o.color ?? '#fff';
    const life = (o.life ?? 0.8) * (0.7 + Math.random() * 0.6);
    parts.push({
      kind, x, y,
      vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp,
      life, max: life,
      size: (o.size ?? 6) * (0.6 + Math.random() * 0.8),
      color: col, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8, g: o.g ?? 0,
    });
  }
}

export function updateFx(dt: number): void {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.vy += p.g * dt;
    if (p.kind === 'bubble' || p.kind === 'steam') { p.vx *= 0.97; p.vy *= 0.97; }
    if (p.kind === 'dust') { p.vx *= 0.92; p.vy *= 0.92; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
  for (let i = toasts.length - 1; i >= 0; i--) {
    toasts[i].t += dt;
    if (toasts[i].t > toasts[i].dur) toasts.splice(i, 1);
  }
}

export function drawFx(c: C): void {
  for (const p of parts) {
    const k = p.life / p.max;
    c.save();
    c.globalAlpha = Math.min(1, k * 1.6);
    switch (p.kind) {
      case 'spark':
        sparkleShape(c, p.x, p.y, p.size * (0.4 + k * 0.6), p.color);
        break;
      case 'star':
        c.fillStyle = p.color;
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        star5(c, 0, 0, p.size);
        c.fill();
        break;
      case 'dust':
        c.fillStyle = p.color;
        c.globalAlpha = k * 0.7;
        c.beginPath();
        c.arc(p.x, p.y, p.size * (1.4 - k * 0.6), 0, Math.PI * 2);
        c.fill();
        break;
      case 'bubble':
        c.strokeStyle = 'rgba(255,255,255,0.85)';
        c.fillStyle = 'rgba(200,240,255,0.25)';
        c.lineWidth = 1.2;
        c.beginPath();
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.9)';
        c.beginPath();
        c.arc(p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.22, 0, Math.PI * 2);
        c.fill();
        break;
      case 'ring':
        c.strokeStyle = p.color;
        c.globalAlpha = k;
        c.lineWidth = 3 * k + 0.5;
        c.beginPath();
        c.arc(p.x, p.y, p.size * (1 + (1 - k) * 3), 0, Math.PI * 2);
        c.stroke();
        break;
      case 'steam':
        c.fillStyle = p.color;
        c.globalAlpha = k * 0.35;
        c.beginPath();
        c.arc(p.x, p.y, p.size * (2 - k), 0, Math.PI * 2);
        c.fill();
        break;
      case 'note':
        text(c, p.vr > 0 ? '♪' : '♫', p.x, p.y, p.size * 3, p.color, { font: 'bold' });
        break;
      case 'confetti':
        c.fillStyle = p.color;
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        break;
      case 'flash':
        c.globalAlpha = k * k;
        c.fillStyle = p.color;
        c.beginPath();
        c.arc(p.x, p.y, p.size * (2 - k), 0, Math.PI * 2);
        c.fill();
        break;
    }
    c.restore();
  }
}

// ---------- toasts ----------

interface Toast { s: string; x: number; y: number; t: number; dur: number; size: number }
const toasts: Toast[] = [];

export function toast(s: string, x: number, y: number, size: number, dur = 1.4): void {
  // replace an identical one rather than stacking
  for (let i = toasts.length - 1; i >= 0; i--) if (toasts[i].s === s) toasts.splice(i, 1);
  toasts.push({ s, x, y, t: 0, dur, size });
}

export function drawToasts(c: C): void {
  for (const t of toasts) {
    const inK = Math.min(1, t.t / 0.18);
    const outK = Math.min(1, (t.dur - t.t) / 0.3);
    const a = Math.min(inK, outK);
    c.save();
    c.translate(t.x, t.y - (1 - inK) * 10);
    const s = 0.85 + 0.15 * (inK < 1 ? inK : 1);
    c.scale(s, s);
    pill(c, 0, 0, t.s, t.size, a);
    c.restore();
  }
}

export function clearFx(): void {
  parts.length = 0;
  toasts.length = 0;
}
