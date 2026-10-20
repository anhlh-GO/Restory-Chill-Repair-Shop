// The shop counter: the customer arrives, tells their story, leaves the box;
// later comes back, reacts, pays (receipt + PAID stamp).

import { type C, rr, rrc, text, shade, setFont, wrap, rng, star5 } from '../core/draw';
import { view } from '../core/view';
import { tween, wait, ease, animate } from '../core/tween';
import { sfx, haptic } from '../core/audio';
import { emit } from '../core/fx';
import { t, lang } from '../core/i18n';
import { drawCustomer, type CharState } from '../content/characters';
import type { Level, Line } from '../content/story';
import { drawStreet, skyFor } from './city';
import { drawCash } from './desk';
import { counter3D } from '../three/counter3d';

export interface CounterHost {
  money(): number;
  addMoney(n: number): void;
  cashPulse(): number;
  openSettings(): void;
  /** The shelf of repaired gadgets. */
  openCollection(): void;
  /** arrive: box handed over; leave: customer paid and left. */
  onDone(): void;
  showDay: boolean;
}

export class Counter {
  L: Level;
  mode: 'arrive' | 'leave';
  host: CounterHost;
  time = 0;
  lines: Line[];
  li = -1;
  chars = 0;
  custX = 1; // 0 = in place, 1 = off to the right
  custAlpha = 1;
  ch: CharState = { pose: 'idle', expr: 'neutral', time: 0, bounce: 0 };
  boxOnCounter: boolean;
  boxY = 0;
  dialogA = 0;
  receipt = 0; // 0 hidden .. 1 shown
  stamp = 0;
  stampOn = false;
  dayCard = 0;
  busy = true;
  total = 0;
  tip = 0;
  blipT = 0;
  ding = 0;

  constructor(level: Level, mode: 'arrive' | 'leave', host: CounterHost) {
    this.L = level;
    this.mode = mode;
    this.host = host;
    this.lines = mode === 'arrive' ? level.arrive : level.leave;
    this.boxOnCounter = mode === 'arrive';
    const r = rng(level.pay * 7 + level.day);
    this.tip = Math.round(1 + r() * 4);
    this.total = level.pay + this.tip;
    if (mode === 'arrive') {
      this.custX = 1;
      const enter = () => {
        sfx.door();
        tween(this, { custX: 0 }, 0.7, ease.outCubic, () => {
          // they tap the service bell, then start talking
          this.ding = 1;
          sfx.bell();
          wait(0.25, () => this.next());
        });
      };
      if (host.showDay) {
        this.dayCard = 0.001;
        tween(this, { dayCard: 1 }, 0.35, ease.outCubic, () => wait(0.9, () => tween(this, { dayCard: 0 }, 0.35, ease.inCubic, enter)));
      } else wait(0.25, enter);
    } else {
      this.custX = 0;
      this.ch.pose = 'idle';
      this.ch.expr = 'surprised';
      wait(0.5, () => this.next());
    }
  }

  get layout() {
    const { W, H, U } = view;
    const wallH = view.top + Math.max(78 * U, H * 0.12);
    const yC = H * 0.585;
    return { W, H, U, wallH, yC, winY0: wallH, winY1: yC - 4 * U };
  }

  update(dt: number): void {
    this.time += dt;
    this.ch.time = this.time;
    this.ch.bounce = Math.max(0, this.ch.bounce - dt * 4);
    this.ding = Math.max(0, this.ding - dt * 5);
    const line = this.lines[this.li];
    if (line && this.chars < this.lineText(line).length) {
      this.chars = Math.min(this.lineText(line).length, this.chars + dt * 42);
      this.blipT -= dt;
      if (this.blipT <= 0) { sfx.blip(this.L.voice); this.blipT = 0.07; }
    }
  }

  lineText(l: Line): string { return lang === 'vi' ? l.vi : l.en; }

  next(): void {
    this.li++;
    if (this.li < this.lines.length) {
      const l = this.lines[this.li];
      this.chars = 0;
      this.ch.pose = l.pose ?? this.ch.pose;
      this.ch.expr = l.expr ?? this.ch.expr;
      this.ch.bounce = 1;
      this.busy = false;
      if (this.dialogA === 0) tween(this, { dialogA: 1 }, 0.2);
      if (this.mode === 'leave' && this.li === 0) {
        emit('star', view.W / 2, this.layout.yC - 200 * view.U, 10, { color: ['#ffd23f', '#fff'], speed: 160, size: 7 });
      }
      return;
    }
    this.busy = true;
    tween(this, { dialogA: 0 }, 0.2);
    if (this.mode === 'arrive') this.handOver();
    else this.showReceipt();
  }

  handOver(): void {
    // the box slides off the counter toward the bench below
    sfx.whoosh();
    this.ch.pose = 'idle';
    this.ch.expr = 'happy';
    tween(this, { boxY: 1 }, 0.45, ease.inBack, () => {
      this.boxOnCounter = false;
      wait(0.1, () => this.host.onDone());
    });
  }

  showReceipt(): void {
    sfx.whoosh();
    tween(this, { receipt: 1 }, 0.5, ease.outBack, () => {
      wait(0.5, () => {
        this.stampOn = true;
        this.stamp = 0;
        animate(0.22, (k) => (this.stamp = k), ease.inQuad, () => {
          sfx.stamp();
          haptic(40);
          const { W, H, U } = this.layout;
          emit('dust', W / 2 + 60 * U, H * 0.5, 10, { color: 'rgba(200,40,40,0.5)', speed: 100, size: 4, life: 0.4 });
          wait(0.35, () => this.payout());
        });
      });
    });
  }

  payout(): void {
    const { U } = this.layout;
    const n = Math.min(10, this.total);
    const per = Math.floor(this.total / n);
    let given = 0;
    sfx.cash();
    for (let i = 0; i < n; i++) {
      wait(i * 0.07, () => {
        const amt = i === n - 1 ? this.total - given : per;
        given += amt;
        const sx = view.W / 2 + (Math.random() - 0.5) * 80 * U, sy = view.H * 0.55;
        const tx = 68 * U, ty = view.top + 32 * U;
        const coin = { x: sx, y: sy };
        animate(0.5, (k) => {
          coin.x = sx + (tx - sx) * k;
          coin.y = sy + (ty - sy) * k - Math.sin(k * Math.PI) * 60 * U;
        }, ease.inOutSine, () => {
          this.coins.splice(this.coins.indexOf(coin), 1);
          this.host.addMoney(amt);
          sfx.coin();
        });
        this.coins.push(coin);
      });
    }
    wait(n * 0.07 + 0.9, () => {
      tween(this, { receipt: 0 }, 0.35, ease.inBack, () => {
        this.ch.pose = 'wave';
        this.ch.expr = 'happy';
        wait(0.7, () => {
          sfx.door();
          tween(this, { custX: -1.2 }, 0.6, ease.inCubic, () => wait(0.2, () => this.host.onDone()));
        });
      });
    });
  }
  coins: { x: number; y: number }[] = [];

  /** A little wooden sign on the wall that opens the collection. */
  shelfSign() {
    const { W, U, wallH } = this.layout;
    return { x: W * 0.48, y: wallH - 30 * U, w: 112 * U, h: 30 * U };
  }

  drawShelfSign(c: C): void {
    const { U } = this.layout;
    const r = this.shelfSign();
    const sway = Math.sin(this.time * 1.6) * 0.03;
    c.save();
    c.translate(r.x, r.y - r.h / 2 - 8 * U);
    c.rotate(sway);
    c.strokeStyle = '#2a1b15'; c.lineWidth = 1.5 * U;
    c.beginPath(); c.moveTo(-r.w * 0.3, r.h / 2 + 8 * U); c.lineTo(0, 0); c.lineTo(r.w * 0.3, r.h / 2 + 8 * U); c.stroke();
    c.fillStyle = '#c9a46a'; c.beginPath(); c.arc(0, 0, 2.5 * U, 0, Math.PI * 2); c.fill();
    c.translate(0, r.h / 2 + 8 * U);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); rrc(c, 2, 3, r.w, r.h, 7 * U); c.fill();
    c.fillStyle = '#b98552'; c.beginPath(); rrc(c, 0, 0, r.w, r.h, 7 * U); c.fill();
    c.strokeStyle = '#6e4630'; c.lineWidth = 2 * U; c.beginPath(); rrc(c, 0, 0, r.w - 4 * U, r.h - 4 * U, 6 * U); c.stroke();
    text(c, t('collectionBtn'), 0, 1, 13.5 * U, '#3b2414', { font: 'bold' });
    c.restore();
  }

  down(x: number, y: number): void {
    const sign = this.shelfSign();
    if (Math.abs(x - sign.x) < sign.w / 2 + 6 && Math.abs(y - sign.y) < sign.h / 2 + 10) { this.host.openCollection(); return; }
    if (this.busy) return;
    const line = this.lines[this.li];
    if (!line) return;
    if (this.chars < this.lineText(line).length) { this.chars = this.lineText(line).length; return; }
    sfx.tap();
    this.next();
  }
  move(): void { /* no drag here */ }
  up(): void { /* tap only */ }

  // ---------------- drawing ----------------

  draw(c: C, oy = 0): void {
    const { W, H, U, wallH, yC, winY0, winY1 } = this.layout;
    const hour = this.mode === 'arrive' ? this.L.timeIn : this.L.timeOut;
    c.save();
    c.translate(0, oy);

    // below the counter: the top of the workbench mat (the camera pans down onto it)
    const fg = c.createLinearGradient(0, yC, 0, H);
    fg.addColorStop(0, '#24406e'); fg.addColorStop(1, '#2d4d82');
    c.fillStyle = fg;
    c.fillRect(0, yC, W, H - yC);
    c.strokeStyle = 'rgba(255,255,255,0.1)';
    c.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const yy = yC + 46 * U + (H - yC) * Math.pow(i / 14, 1.25);
      c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke();
    }
    for (let i = 0; i <= 12; i++) {
      c.beginPath(); c.moveTo(W / 2 + (i - 6) * W * 0.07, yC + 46 * U); c.lineTo(W / 2 + (i - 6) * W * 0.11, H); c.stroke();
    }

    // window + street
    drawStreet(c, 0, winY0, W, winY1 - winY0, skyFor(hour[0], hour[1]), view.dpr, U);
    // window frame + mullion
    c.fillStyle = '#4a3326';
    c.fillRect(0, winY0, W, 8 * U);
    c.fillRect(0, winY0, 10 * U, winY1 - winY0);
    c.fillRect(W - 10 * U, winY0, 10 * U, winY1 - winY0);
    // blinds rolled at the top
    const bg = c.createLinearGradient(0, winY0, 0, winY0 + 26 * U);
    bg.addColorStop(0, '#efe1c4'); bg.addColorStop(1, '#c9b48e');
    c.fillStyle = bg;
    c.fillRect(8 * U, winY0 + 6 * U, W - 16 * U, 22 * U);
    c.strokeStyle = 'rgba(120,90,50,0.35)';
    for (let yy = winY0 + 10 * U; yy < winY0 + 28 * U; yy += 4 * U) { c.beginPath(); c.moveTo(8 * U, yy); c.lineTo(W - 8 * U, yy); c.stroke(); }
    // glass reflection
    c.fillStyle = 'rgba(255,255,255,0.06)';
    c.beginPath(); c.moveTo(W * 0.1, winY1); c.lineTo(W * 0.35, winY0 + 30 * U); c.lineTo(W * 0.45, winY0 + 30 * U); c.lineTo(W * 0.2, winY1); c.closePath(); c.fill();

    // wall band with shelf, calendar, clock
    const wg = c.createLinearGradient(0, 0, 0, wallH);
    wg.addColorStop(0, '#3a2620'); wg.addColorStop(1, '#5c3c2c');
    c.fillStyle = wg;
    c.fillRect(0, 0, W, wallH);
    c.strokeStyle = 'rgba(0,0,0,0.2)';
    for (let yy = 8 * U; yy < wallH; yy += 14 * U) {
      c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke();
      for (let xx = ((yy / (14 * U)) % 2) * 20 * U; xx < W; xx += 40 * U) { c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, yy + 14 * U); c.stroke(); }
    }
    c.fillStyle = '#2a1b15';
    c.fillRect(0, wallH - 8 * U, W, 8 * U);
    // calendar
    const cx0 = W * 0.13, cy0 = wallH - 34 * U;
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); rr(c, cx0 - 22 * U + 3, cy0 - 18 * U + 4, 44 * U, 34 * U, 4 * U); c.fill();
    c.fillStyle = '#f4f1ea'; c.beginPath(); rr(c, cx0 - 22 * U, cy0 - 18 * U, 44 * U, 34 * U, 4 * U); c.fill();
    c.fillStyle = '#8a8f99'; c.fillRect(cx0 - 22 * U, cy0 - 18 * U, 44 * U, 7 * U);
    text(c, String(this.L.day), cx0, cy0 + 3 * U, 20 * U, '#2b2b33', { font: 'bold' });
    // clock
    const kx = W * 0.82, ky = wallH - 30 * U;
    c.fillStyle = '#c86a2a'; c.beginPath(); rrc(c, kx, ky, 62 * U, 28 * U, 7 * U); c.fill();
    c.fillStyle = '#1a2a1a'; c.beginPath(); rrc(c, kx, ky, 54 * U, 20 * U, 4 * U); c.fill();
    const hh = String(hour[0]).padStart(2, '0'), mm = String(hour[1]).padStart(2, '0');
    setFont(c, 15 * U, 'bold');
    c.fillStyle = '#7dff8a';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(`${hh}${Math.floor(this.time * 2) % 2 ? ':' : ' '}${mm}`, kx, ky + 1);
    this.drawShelfSign(c);

    // the customer
    if (this.custX > -1.15) {
      // medium shot, chest up: the waist sits well below the counter, the crown just under the wall
      const sink = 70 * U;
      const s = Math.min(U * 1.45, (yC + sink - wallH - 14 * U) / 318);
      const walk = Math.abs(Math.sin(this.custX * 14)) * 8 * U * Math.min(1, Math.abs(this.custX) * 6);
      c.save();
      c.globalAlpha = this.custAlpha;
      c.beginPath(); c.rect(0, winY0, W, yC - winY0); c.clip();
      const talk = this.li >= 0 && this.lines[this.li] && this.chars < this.lineText(this.lines[this.li]).length ? (Math.sin(this.time * 22) > 0 ? 1 : 0.2) : 0;
      drawCustomer(c, this.L.look, W * 0.5 + this.custX * W * 0.8, yC + sink - walk, s, this.ch, talk);
      c.restore();
    }

    // counter, box and desk props: 3D, or the flat drawing without WebGL
    const c3 = counter3D();
    if (c3) c3.render(c, { yC, boxY: this.boxY, boxOn: this.boxOnCounter, ding: this.ding });
    else this.flatCounter(c, W, H, U, yC);

    // cash only shows up while getting paid (the counter view stays clean, like the reference)
    if (this.receipt > 0.01 || this.coins.length) drawCash(c, 14 * U, view.top + 12 * U, this.host.money(), U, this.host.cashPulse());

    // dialogue
    if (this.dialogA > 0.01 && this.li >= 0 && this.li < this.lines.length) this.drawDialog(c);

    // receipt
    if (this.receipt > 0.01) this.drawReceipt(c);
    for (const coin of this.coins) {
      c.fillStyle = '#c98a00'; c.beginPath(); c.arc(coin.x, coin.y + 2, 9 * U, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(coin.x, coin.y, 9 * U, 0, Math.PI * 2); c.fill();
      text(c, '$', coin.x, coin.y + 1, 11 * U, '#a86a00', { font: 'bold' });
    }

    // day title card
    if (this.dayCard > 0) {
      c.fillStyle = `rgba(20,16,30,${0.75 * this.dayCard})`;
      c.fillRect(0, 0, W, H);
      c.save();
      c.globalAlpha = this.dayCard;
      c.translate(W / 2, H * 0.42);
      c.scale(0.8 + 0.2 * this.dayCard, 0.8 + 0.2 * this.dayCard);
      text(c, `${t('day')} ${this.L.day}`, 0, 0, 52 * U, '#ffe7a0', { font: 'bold', stroke: '#5a3a1a', strokeW: 8 * U });
      text(c, t('shopName'), 0, 46 * U, 18 * U, '#f4f1ea', { font: 'bold' });
      c.restore();
    }
    c.restore();
  }

  /** The counter without WebGL: flat top, box and props. */
  flatCounter(c: C, W: number, H: number, U: number, yC: number): void {
    const cg = c.createLinearGradient(0, yC - 6 * U, 0, yC + 40 * U);
    cg.addColorStop(0, '#a8744a'); cg.addColorStop(0.2, '#7a4f30'); cg.addColorStop(1, '#4a2e1c');
    c.fillStyle = cg;
    c.fillRect(0, yC - 6 * U, W, 46 * U);
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.fillRect(0, yC - 6 * U, W, 2 * U);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(0, yC + 40 * U, W, 6 * U);

    // box on counter
    if (this.boxOnCounter) {
      const bx = W * 0.36, by = yC - 2 * U + this.boxY * (H * 0.5);
      const bw = 92 * U, bh = 54 * U, depth = 18 * U;
      c.save();
      c.globalAlpha = 1 - this.boxY * 0.5;
      c.fillStyle = '#c08a52';
      c.beginPath(); c.moveTo(bx - bw / 2, by - bh); c.lineTo(bx - bw / 2 + depth, by - bh - depth * 0.7); c.lineTo(bx + bw / 2 + depth, by - bh - depth * 0.7); c.lineTo(bx + bw / 2, by - bh); c.closePath(); c.fill();
      c.fillStyle = '#9a6a3c';
      c.beginPath(); c.moveTo(bx + bw / 2, by - bh); c.lineTo(bx + bw / 2 + depth, by - bh - depth * 0.7); c.lineTo(bx + bw / 2 + depth, by - depth * 0.7); c.lineTo(bx + bw / 2, by); c.closePath(); c.fill();
      c.fillStyle = '#d9a46a';
      c.fillRect(bx - bw / 2, by - bh, bw, bh);
      c.fillStyle = 'rgba(240,225,190,0.8)';
      c.fillRect(bx - 8 * U, by - bh, 16 * U, bh);
      c.fillStyle = '#f4efe2'; c.fillRect(bx + 14 * U, by - bh + 12 * U, 26 * U, 16 * U);
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(bx + 17 * U, by - bh + 16 * U, 20 * U, 2 * U); c.fillRect(bx + 17 * U, by - bh + 21 * U, 14 * U, 2 * U);
      c.restore();
    }

    // desk props on the counter: pen cup + photo (left), lamp (right)
    this.props(c, W, U, yC);
  }

  props(c: C, W: number, U: number, yC: number): void {
    // pen cup
    const px = W * 0.08, py = yC + 2 * U;
    for (const [dx, h2, col] of [[-6, 34, '#3fa34d'], [2, 40, '#e8424f'], [9, 30, '#3b7ff0']] as const) {
      c.strokeStyle = col; c.lineWidth = 4 * U; c.lineCap = 'round';
      c.beginPath(); c.moveTo(px + dx * U, py - 20 * U); c.lineTo(px + dx * 1.6 * U, py - h2 * U); c.stroke();
    }
    c.fillStyle = '#c85a24';
    c.beginPath(); rr(c, px - 14 * U, py - 30 * U, 28 * U, 30 * U, 4 * U); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(px - 10 * U, py - 28 * U, 5 * U, 26 * U);
    // photo frame
    c.save();
    c.translate(W * 0.2, yC - 2 * U);
    c.rotate(-0.06);
    c.fillStyle = '#6b4a2e'; c.fillRect(-18 * U, -46 * U, 36 * U, 46 * U);
    c.fillStyle = '#9fc3e0'; c.fillRect(-14 * U, -42 * U, 28 * U, 38 * U);
    c.fillStyle = '#f2c6a0'; c.beginPath(); c.arc(0, -28 * U, 7 * U, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3a2a40'; c.fillRect(-9 * U, -20 * U, 18 * U, 16 * U);
    c.restore();
    // lamp
    const lx = W * 0.86, ly = yC - 4 * U;
    c.strokeStyle = '#1f2a45'; c.lineWidth = 5 * U; c.lineCap = 'round';
    c.beginPath(); c.moveTo(lx + 18 * U, ly); c.lineTo(lx + 26 * U, ly - 40 * U); c.lineTo(lx - 2 * U, ly - 70 * U); c.stroke();
    c.fillStyle = '#1f2a45'; c.beginPath(); c.ellipse(lx + 18 * U, ly, 18 * U, 5 * U, 0, 0, Math.PI * 2); c.fill();
    c.save();
    c.translate(lx - 6 * U, ly - 72 * U);
    c.rotate(-0.7);
    const lg = c.createLinearGradient(0, -20 * U, 0, 20 * U);
    lg.addColorStop(0, '#5b6f9c'); lg.addColorStop(1, '#1f2a45');
    c.fillStyle = lg;
    c.beginPath(); c.moveTo(-10 * U, -12 * U); c.lineTo(10 * U, -12 * U); c.lineTo(24 * U, 18 * U); c.lineTo(-24 * U, 18 * U); c.closePath(); c.fill();
    c.fillStyle = '#fff3c8'; c.beginPath(); c.ellipse(0, 18 * U, 22 * U, 5 * U, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  drawDialog(c: C): void {
    const { W, H, U } = this.layout;
    const l = this.lines[this.li];
    const s = this.lineText(l);
    const bw = W - 28 * U, bh = Math.min(150 * U, H * 0.2);
    const bx = 14 * U, by = H * 0.67;
    c.save();
    c.globalAlpha = this.dialogA;
    c.translate(0, (1 - this.dialogA) * 20 * U);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); rr(c, bx - 2, by + 6, bw, bh, 14 * U); c.fill();
    c.fillStyle = '#c99a5a';
    c.beginPath(); rr(c, bx, by, bw, bh, 14 * U); c.fill();
    c.fillStyle = '#fbf2dc';
    c.beginPath(); rr(c, bx + 6 * U, by + 6 * U, bw - 12 * U, bh - 12 * U, 10 * U); c.fill();
    // name tag
    setFont(c, 17 * U, 'bold');
    const nw = c.measureText(this.L.name).width + 26 * U;
    c.fillStyle = shade(this.L.tag, -0.3);
    c.beginPath(); rr(c, bx + 12 * U, by - 18 * U + 3, nw, 30 * U, 9 * U); c.fill();
    c.fillStyle = this.L.tag;
    c.beginPath(); rr(c, bx + 12 * U, by - 18 * U, nw, 30 * U, 9 * U); c.fill();
    text(c, this.L.name, bx + 12 * U + nw / 2, by - 2 * U, 17 * U, '#fff', { font: 'bold' });
    // text
    setFont(c, 19 * U, 'hand');
    const shown = s.slice(0, Math.floor(this.chars));
    const lines = wrap(c, s, bw - 44 * U);
    let left = shown.length;
    c.fillStyle = '#3b2a1e';
    c.textAlign = 'left';
    c.textBaseline = 'top';
    lines.forEach((ln, i) => {
      if (left <= 0) return;
      const part = ln.slice(0, left);
      left -= ln.length + 1;
      c.fillText(part, bx + 22 * U, by + 26 * U + i * 24 * U);
    });
    if (this.chars >= s.length) {
      const b = Math.sin(this.time * 6) * 3 * U;
      c.fillStyle = '#c99a5a';
      c.beginPath();
      c.moveTo(bx + bw - 30 * U, by + bh - 24 * U + b);
      c.lineTo(bx + bw - 18 * U, by + bh - 24 * U + b);
      c.lineTo(bx + bw - 24 * U, by + bh - 16 * U + b);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  drawReceipt(c: C): void {
    const { W, H, U } = this.layout;
    const rw = Math.min(250 * U, W * 0.68), rh = 270 * U;
    const x = W / 2 - rw / 2;
    const y = H - (H * 0.5 + rh / 2) * this.receipt;
    c.save();
    c.fillStyle = `rgba(10,10,20,${0.35 * this.receipt})`;
    c.fillRect(0, 0, W, H);
    c.translate(x, y);
    c.rotate(-0.02);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(4, 8, rw, rh);
    c.fillStyle = '#fbf5e6';
    c.beginPath();
    c.moveTo(0, 0); c.lineTo(rw, 0); c.lineTo(rw, rh);
    for (let i = 0; i <= 14; i++) c.lineTo(rw - (rw / 14) * i, rh + (i % 2 ? 6 * U : 0));
    c.closePath();
    c.fill();
    text(c, t('shopName'), rw / 2, 26 * U, 18 * U, '#2b2b33', { font: 'bold' });
    const d = `${String(10 + this.L.day).padStart(2, '0')}/10/2026`;
    text(c, d, rw / 2, 46 * U, 12 * U, '#6a6a72');
    const row = (label: string, val: string, yy: number, bold = false) => {
      text(c, label, 20 * U, yy, (bold ? 16 : 14) * U, '#2b2b33', { align: 'left', font: bold ? 'bold' : 'hand' });
      text(c, val, rw - 20 * U, yy, (bold ? 16 : 14) * U, '#2b2b33', { align: 'right', font: bold ? 'bold' : 'hand' });
    };
    row(`🔧 ${t('receiptRepair')}`, `$${this.L.pay}.00`, 80 * U);
    row(`💛 ${t('receiptTip')}`, `$${this.tip}.00`, 104 * U);
    c.strokeStyle = '#b0a898'; c.setLineDash([4, 4]); c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(16 * U, 122 * U); c.lineTo(rw - 16 * U, 122 * U); c.stroke();
    c.setLineDash([]);
    row(t('total'), `$${this.total}.00`, 144 * U, true);
    // barcode
    const r = rng(this.L.pay);
    let bx = 20 * U;
    while (bx < rw - 20 * U) {
      const w = (1 + Math.floor(r() * 3)) * U;
      c.fillStyle = '#2b2b33';
      c.fillRect(bx, 172 * U, w, 40 * U);
      bx += w + (1 + Math.floor(r() * 3)) * U;
    }
    text(c, t('thankYou'), rw / 2, 232 * U, 15 * U, '#2b2b33', { font: 'bold' });
    // stars
    for (let i = 0; i < 5; i++) {
      c.fillStyle = '#ffc93a';
      star5(c, rw / 2 + (i - 2) * 20 * U, 254 * U, 7 * U);
      c.fill();
    }
    // PAID stamp
    if (this.stampOn) {
      const k = this.stamp;
      c.save();
      c.translate(rw - 62 * U, 150 * U);
      c.rotate(-0.25);
      const sc = 2.4 - 1.4 * k;
      c.scale(sc, sc);
      c.globalAlpha = Math.min(1, k * 1.5) * 0.85;
      c.strokeStyle = '#d0342c'; c.lineWidth = 3 * U;
      c.beginPath(); rrc(c, 0, 0, 74 * U, 32 * U, 6 * U); c.stroke();
      text(c, t('paid'), 0, 1, 19 * U, '#d0342c', { font: 'bold' });
      c.restore();
    }
    c.restore();
  }
}
