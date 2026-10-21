// Settings popup: sound / music / vibration, language, restart, and clear data
// (two taps: the second one within a few seconds erases everything).

import { type C, rrc, text, button, shade } from '../core/draw';
import { view } from '../core/view';
import { audioSettings, sfx } from '../core/audio';
import { t, lang, setLang } from '../core/i18n';

export class Settings {
  open = 0;
  shown = false;
  onRestart: () => void;
  onClose: () => void;
  onClear: () => void;
  /** Seconds left to confirm Clear data with a second tap (0 = not armed). */
  arm = 0;

  constructor(onRestart: () => void, onClose: () => void, onClear: () => void) {
    this.onRestart = onRestart;
    this.onClose = onClose;
    this.onClear = onClear;
  }

  update(dt: number): void {
    this.open += ((this.shown ? 1 : 0) - this.open) * Math.min(1, dt * 14);
    this.arm = Math.max(0, this.arm - dt);
  }

  rect() {
    const { W, H, U } = view;
    const w = Math.min(300 * U, W - 40 * U), h = 304 * U;
    return { x: W / 2, y: H * 0.46, w, h };
  }

  draw(c: C): void {
    if (this.open < 0.01) return;
    const { W, H, U } = view;
    const r = this.rect();
    c.save();
    c.fillStyle = `rgba(10,10,20,${0.5 * this.open})`;
    c.fillRect(0, 0, W, H);
    c.translate(r.x, r.y);
    const s = 0.85 + 0.15 * this.open;
    c.scale(s, s);
    c.globalAlpha = this.open;
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); rrc(c, -3, 6, r.w, r.h, 16 * U); c.fill();
    c.fillStyle = '#d99a3f';
    c.beginPath(); rrc(c, 0, 0, r.w, r.h, 16 * U); c.fill();
    c.fillStyle = '#fbf2dc';
    c.beginPath(); rrc(c, 0, 0, r.w - 12 * U, r.h - 12 * U, 12 * U); c.fill();
    text(c, t('settings'), 0, -r.h / 2 + 34 * U, 26 * U, '#3b2a1e', { font: 'hand' });
    // close
    c.fillStyle = '#e0443a';
    c.beginPath(); rrc(c, r.w / 2 - 8 * U, -r.h / 2 + 8 * U, 30 * U, 30 * U, 8 * U); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 3 * U; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(r.w / 2 - 15 * U, -r.h / 2 + 1 * U); c.lineTo(r.w / 2 - 1 * U, -r.h / 2 + 15 * U);
    c.moveTo(r.w / 2 - 1 * U, -r.h / 2 + 1 * U); c.lineTo(r.w / 2 - 15 * U, -r.h / 2 + 15 * U);
    c.stroke();
    // toggles
    const keys = ['sound', 'music', 'haptic'] as const;
    keys.forEach((k, i) => {
      const x = (i - 1) * 64 * U, y = -r.h / 2 + 88 * U;
      const on = audioSettings.get(k);
      const col = on ? '#7ccf3c' : '#9aa0a6';
      c.fillStyle = shade(col, -0.35);
      c.beginPath(); rrc(c, x, y + 4 * U, 50 * U, 46 * U, 10 * U); c.fill();
      c.fillStyle = col;
      c.beginPath(); rrc(c, x, y, 50 * U, 46 * U, 10 * U); c.fill();
      this.icon(c, k, x, y, U);
      if (!on) {
        c.strokeStyle = '#e0443a'; c.lineWidth = 3 * U;
        c.beginPath(); c.moveTo(x - 14 * U, y - 14 * U); c.lineTo(x + 14 * U, y + 14 * U); c.stroke();
      }
    });
    // language
    const ly = -r.h / 2 + 150 * U;
    (['vi', 'en'] as const).forEach((l, i) => {
      const x = (i - 0.5) * 64 * U;
      const on = lang === l;
      c.fillStyle = on ? '#7ccf3c' : '#e6dcc6';
      c.beginPath(); rrc(c, x, ly, 54 * U, 30 * U, 8 * U); c.fill();
      text(c, l.toUpperCase(), x, ly + 1, 16 * U, on ? '#fff' : '#7a6a56', { font: 'bold' });
    });
    button(c, 0, r.h / 2 - 98 * U, 190 * U, 44 * U, '↻ ' + t('restart'), '#4a90e2', false, 18 * U);
    button(c, 0, r.h / 2 - 42 * U, 190 * U, 40 * U, this.arm > 0 ? t('clearConfirm') : t('clearData'), '#e0443a', false, this.arm > 0 ? 13 * U : 16 * U);
    c.restore();
  }

  icon(c: C, k: 'sound' | 'music' | 'haptic', x: number, y: number, U: number): void {
    c.fillStyle = '#fff';
    c.strokeStyle = '#fff';
    c.lineWidth = 2.5 * U;
    if (k === 'sound') {
      c.beginPath(); c.moveTo(x - 12 * U, y - 5 * U); c.lineTo(x - 6 * U, y - 5 * U); c.lineTo(x + 2 * U, y - 12 * U); c.lineTo(x + 2 * U, y + 12 * U); c.lineTo(x - 6 * U, y + 5 * U); c.lineTo(x - 12 * U, y + 5 * U); c.closePath(); c.fill();
      c.beginPath(); c.arc(x + 4 * U, y, 8 * U, -0.8, 0.8); c.stroke();
    } else if (k === 'music') {
      c.beginPath(); c.arc(x - 5 * U, y + 8 * U, 5 * U, 0, Math.PI * 2); c.arc(x + 9 * U, y + 5 * U, 5 * U, 0, Math.PI * 2); c.fill();
      c.fillRect(x - 1.5 * U, y - 12 * U, 3 * U, 20 * U);
      c.fillRect(x + 12.5 * U, y - 15 * U, 3 * U, 20 * U);
      c.beginPath(); c.moveTo(x - 1.5 * U, y - 12 * U); c.lineTo(x + 15.5 * U, y - 15 * U); c.lineTo(x + 15.5 * U, y - 10 * U); c.lineTo(x - 1.5 * U, y - 7 * U); c.closePath(); c.fill();
    } else {
      c.beginPath(); rrc(c, x, y, 16 * U, 26 * U, 4 * U); c.stroke();
      c.beginPath(); c.moveTo(x - 14 * U, y - 6 * U); c.lineTo(x - 12 * U, y); c.lineTo(x - 14 * U, y + 6 * U); c.stroke();
      c.beginPath(); c.moveTo(x + 14 * U, y - 6 * U); c.lineTo(x + 12 * U, y); c.lineTo(x + 14 * U, y + 6 * U); c.stroke();
    }
  }

  /** Returns true if the popup consumed the tap. */
  down(px: number, py: number): boolean {
    if (!this.shown) return false;
    const U = view.U;
    const r = this.rect();
    const x = px - r.x, y = py - r.y;
    if (Math.abs(x) > r.w / 2 || Math.abs(y) > r.h / 2 || (Math.abs(x - (r.w / 2 - 8 * U)) < 20 * U && Math.abs(y - (-r.h / 2 + 8 * U)) < 20 * U)) {
      this.close();
      return true;
    }
    const keys = ['sound', 'music', 'haptic'] as const;
    keys.forEach((k, i) => {
      if (Math.abs(x - (i - 1) * 64 * U) < 27 * U && Math.abs(y - (-r.h / 2 + 88 * U)) < 25 * U) {
        audioSettings.set(k, !audioSettings.get(k));
        sfx.tap();
      }
    });
    (['vi', 'en'] as const).forEach((l, i) => {
      if (Math.abs(x - (i - 0.5) * 64 * U) < 29 * U && Math.abs(y - (-r.h / 2 + 150 * U)) < 17 * U) { setLang(l); sfx.tap(); }
    });
    if (Math.abs(x) < 95 * U && Math.abs(y - (r.h / 2 - 98 * U)) < 24 * U) {
      sfx.tap();
      this.shown = false;
      this.onRestart();
    }
    if (Math.abs(x) < 95 * U && Math.abs(y - (r.h / 2 - 42 * U)) < 22 * U) {
      if (this.arm > 0) {
        this.arm = 0;
        this.shown = false;
        this.onClear();
      } else {
        this.arm = 3;
        sfx.error();
      }
    }
    return true;
  }

  show(): void { this.shown = true; this.arm = 0; }
  close(): void { this.shown = false; sfx.tap(); this.onClose(); }
}
