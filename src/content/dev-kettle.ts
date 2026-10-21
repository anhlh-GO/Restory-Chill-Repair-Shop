// Retro enamel jug kettle standing on its power base, seen from above: a duck-egg
// blue jug with a domed lid (chrome rim, tall knob, little thermometer dial), a
// chrome pour spout with its scale filter, and a real D handle: a top bar that
// carries the lid button and the rocker switch, and a soft grip running down the
// back. Grandma's kettle: the enamel is a bit chalky, the chrome still shines.

import { type C, type Pts, shade, rrc, ellPath, rng, shapeFrom, roundedPts, rrPts, ellPts } from '../core/draw';
import { type DeviceDef, type PartDef, screw } from './device';

const ENAMEL = '#8fc6da';
const CHROME = '#dfe3e8';
const STEEL = '#b9c0c9';
const CREAM = '#f3ead8';
const BLACK = '#26262b';
const LED = '#5ab8ff';
const SANS = '"Helvetica Neue", Arial, sans-serif';

// The jug is round; the whole kettle is shifted right so the handle fits.
const OX = 14;
const R = 66;
const TH = 74; // jug height
const RND = 14; // edge radius: near-vertical walls with a rolled shoulder
const BELLY = Math.max(TH * 0.3, Math.min(TH, RND)); // the rounded underside the 3D layer hangs under the jug
const CAV = 46; // inside depth: the floor sits at TH - CAV
const FLOOR = TH - CAV;

function font(c: C, size: number, weight = 700): void {
  c.font = `${weight} ${size}px ${SANS}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
}

/** A filled annulus. */
function ring(c: C, r0: number, r1: number, style: string | CanvasGradient): void {
  c.fillStyle = style;
  c.beginPath(); c.arc(0, 0, r1, 0, Math.PI * 2); c.arc(0, 0, r0, 0, Math.PI * 2, true); c.fill();
}

/** Polished chrome annulus: a radial sweep with a window reflection. */
function chromeRing(c: C, r0: number, r1: number): void {
  const g = c.createLinearGradient(-r1, -r1, r1, r1);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, '#aeb4bc'); g.addColorStop(0.45, '#f4f6f8');
  g.addColorStop(0.7, '#8d939c'); g.addColorStop(1, '#e6e9ec');
  ring(c, r0, r1, g);
  c.strokeStyle = 'rgba(60,66,76,0.45)'; c.lineWidth = 0.6;
  c.beginPath(); c.arc(0, 0, r0 + 0.3, 0, Math.PI * 2); c.stroke();
}

/** Fine speckle of an enamel finish (clip first). */
function enamelGrain(c: C, x: number, y: number, w: number, h: number, seed: number): void {
  const r = rng(seed);
  for (let i = 0; i < (w * h) / 40; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(30,60,80,0.07)';
    c.fillRect(x + r() * w, y + r() * h, 0.9, 0.9);
  }
}

// ---------------- jug ----------------

const BODY = ellPath(0, 0, R, R);
const body: PartDef = {
  id: 'body', name: { en: 'Kettle Jug', vi: 'Thân ấm' }, side: 'A', z: 0, x: OX, y: 0, w: R * 2, h: R * 2, icon: '🫖',
  shape: BODY, needs: ['plate', 'handle', 'hgrip', 'base', 'spout'], tool: 'sponge', thick: TH, cavity: CAV, round: RND, wall: 11, body: shade(ENAMEL, -0.2),
  draw(c) {
    // outside wall: enamel, lit from the top left, a long window highlight down the side
    const g = c.createRadialGradient(-20, -26, 10, 0, 0, R);
    g.addColorStop(0, shade(ENAMEL, 0.22)); g.addColorStop(0.75, ENAMEL); g.addColorStop(1, shade(ENAMEL, -0.18));
    ring(c, 50, R, g);
    c.save(); c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.clip();
    enamelGrain(c, -R, -R, R * 2, R * 2, 7);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath(); c.ellipse(-36, -40, 16, 5, -0.8, 0, Math.PI * 2); c.fill();
    c.restore();
    // the rolled chrome rim on top of the wall
    chromeRing(c, 51.5, 56);
    // inside: brushed stainless, darker down the walls, an old tide line of scale
    const s = c.createRadialGradient(-8, -10, 4, 0, 0, 52);
    s.addColorStop(0, shade(STEEL, 0.12)); s.addColorStop(0.7, STEEL); s.addColorStop(0.92, shade(STEEL, -0.4)); s.addColorStop(1, shade(STEEL, -0.55));
    c.fillStyle = s; c.beginPath(); c.arc(0, 0, 51.5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 0.5;
    for (let r = 6; r < 50; r += 2.2) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
    c.strokeStyle = 'rgba(236,228,206,0.55)'; c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, 50, 0, Math.PI * 2); c.stroke();
    // water gauge printed on the inner wall facing you
    c.strokeStyle = shade(STEEL, -0.6); c.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * 0.42 + i * 0.05;
      c.beginPath(); c.moveTo(Math.cos(a) * 47, Math.sin(a) * 47); c.lineTo(Math.cos(a) * (i % 2 ? 49.5 : 51), Math.sin(a) * (i % 2 ? 49.5 : 51)); c.stroke();
    }
    font(c, 4.2); c.fillStyle = shade(STEEL, -0.6);
    c.fillText('MAX 1.7L', 6, 44); c.fillText('MIN', -18, 45);
    // the seat the heating plate screws into
    for (const [x, y] of PLATE_SCREWS) {
      c.fillStyle = shade(STEEL, -0.3); c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#4a4f57'; c.beginPath(); c.arc(x, y, 2.4, 0, Math.PI * 2); c.fill();
    }
  },
};

// ---------------- heating plate on the floor ----------------

const PR = 47;
const PLATE_SCREWS: [number, number][] = [[-30, 18], [30, 18]];
const plate: PartDef = {
  id: 'plate', name: { en: 'Heating Plate', vi: 'Mâm nhiệt' }, side: 'A', z: 2, x: OX, y: 0, w: PR * 2, h: PR * 2, icon: '🔥',
  shape: ellPath(0, 0, PR, PR), needs: ['k2', 'k3'], elev: FLOOR, thick: 4, round: 2, mat: 'metal', body: '#8b9097',
  draw(c, s) {
    // pressed stainless disc: a raised outer ring, a shallow dish, the stamped centre boss
    const g = c.createRadialGradient(-14, -18, 4, 0, 0, PR);
    g.addColorStop(0, '#f7f9fb'); g.addColorStop(0.55, '#cfd4db'); g.addColorStop(0.9, '#a7adb6'); g.addColorStop(1, '#7d838c');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, PR, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 0.5;
    for (let r = 3; r < PR; r += 1.6) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
    for (const [r, a] of [[PR - 4, 0.45], [PR - 7, 0.25], [17, 0.35]] as const) {
      c.strokeStyle = `rgba(70,78,90,${a})`; c.lineWidth = 1.4; c.beginPath(); c.arc(0.6, 0.8, r, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 0.8; c.beginPath(); c.arc(-0.4, -0.5, r, 0, Math.PI * 2); c.stroke();
    }
    // the element ring brazed underneath, ghosting through as a warm band; glowing when it boils
    c.strokeStyle = s.power > 0 ? `rgba(255,${150 - s.power * 60},60,${0.45 + 0.25 * Math.sin(s.time * 3)})` : 'rgba(176,132,92,0.28)';
    c.lineWidth = 7;
    c.beginPath(); c.arc(0, 0, 31, 0, Math.PI * 2); c.stroke();
    // stamped centre: maker + rating
    c.fillStyle = '#bfc5cd'; c.beginPath(); c.arc(0, 0, 15, 0, Math.PI * 2); c.fill();
    font(c, 4.6); c.fillStyle = '#5a606a'; c.fillText('CHILL', 0, -3);
    font(c, 3.2, 600); c.fillText('2200W  230V', 0, 3.5);
    if (s.broken) {
      c.fillStyle = 'rgba(240,234,214,0.9)';
      for (let i = 0; i < 22; i++) {
        const a = i * 2.39, r = 14 + ((i * 37) % 30);
        c.beginPath(); c.ellipse(Math.cos(a) * r, Math.sin(a) * r, 4 + (i % 4) * 1.6, 2.5 + (i % 3), a, 0, Math.PI * 2); c.fill();
      }
    }
  },
};

// ---------------- lid: enamel dome, chrome rim, tall knob, thermometer ----------------

const LR = 58;
const HINGE = { x: OX - 62, y: 0 };
const LID: Pts = (() => {
  const pts: [number, number][] = ellPts(0, 0, LR, LR, 72).filter(([x, y]) => !(x < -50 && Math.abs(y) < 16));
  pts.push(...rrPts(-62, 0, 20, 28, 7).filter(([x]) => x < -54));
  return pts.sort((p, q) => Math.atan2(p[1], p[0]) - Math.atan2(q[1], q[0]));
})();
const LID_P = shapeFrom(LID);
const THERM = { x: 24, y: -20 };

const lid: PartDef = {
  id: 'lid', name: { en: 'Lid', vi: 'Nắp ấm' }, side: 'A', z: 6, x: OX, y: 0, w: 136, h: 116, icon: '⚪',
  shape: LID_P, needs: ['k1'], tool: 'sponge', elev: TH, thick: 9, round: 8, body: shade(ENAMEL, -0.22),
  bumps: [
    { kind: 'cyl', x: -6, y: 4, w: 24, height: 3, color: CHROME, metal: true },
    { kind: 'cyl', x: -6, y: 4, w: 14, height: 13, color: CREAM },
  ],
  draw(c, s) {
    // enamel dome
    const g = c.createRadialGradient(-18, -22, 6, 0, 0, LR);
    g.addColorStop(0, shade(ENAMEL, 0.28)); g.addColorStop(0.7, ENAMEL); g.addColorStop(1, shade(ENAMEL, -0.2));
    c.fillStyle = g; c.fill(LID_P);
    c.save(); c.clip(LID_P); enamelGrain(c, -70, -LR, 130, LR * 2, 9); c.restore();
    // chrome rim, the hinge knuckle
    chromeRing(c, LR - 6, LR);
    const hg = c.createLinearGradient(0, -14, 0, 14);
    hg.addColorStop(0, '#9aa0a8'); hg.addColorStop(0.35, '#ffffff'); hg.addColorStop(1, '#7d838c');
    c.fillStyle = hg; c.beginPath(); rrc(c, -62, 0, 18, 26, 6); c.fill();
    // steam vent slots toward the spout
    for (let i = 0; i < 5; i++) {
      c.fillStyle = shade(ENAMEL, -0.55); c.beginPath(); rrc(c, 38, -12 + i * 6, 11, 2.8, 1.4); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(33, -10.4 + i * 6, 10, 0.6);
    }
    // knob seat shadow
    c.fillStyle = 'rgba(30,60,80,0.25)'; c.beginPath(); c.arc(-4, 7, 13, 0, Math.PI * 2); c.fill();
    // thermometer dial: cream face, °C arc, red needle that climbs when it boils
    c.save(); c.translate(THERM.x, THERM.y);
    chromeRing(c, 9.5, 12.5);
    c.fillStyle = '#fbf6ea'; c.beginPath(); c.arc(0, 0, 9.5, 0, Math.PI * 2); c.fill();
    const a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
    c.strokeStyle = '#4a7fb0'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 7.5, a0, a0 + (a1 - a0) * 0.6); c.stroke();
    c.strokeStyle = '#d8453a'; c.beginPath(); c.arc(0, 0, 7.5, a0 + (a1 - a0) * 0.6, a1); c.stroke();
    font(c, 2.6); c.fillStyle = '#33363d'; c.fillText('°C', 0, 4.5);
    const na = a0 + (a1 - a0) * (0.12 + 0.8 * s.power);
    c.strokeStyle = '#c42f2f'; c.lineWidth = 1; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(na) * 7, Math.sin(na) * 7); c.stroke();
    c.fillStyle = '#33363d'; c.beginPath(); c.arc(0, 0, 1.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-3.5, -4, 4, 1.6, -0.6, 0, Math.PI * 2); c.fill();
    c.restore();
    // embossed maker's script
    font(c, 7, 800);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillText('chill', -6, -29.5);
    c.fillStyle = shade(ENAMEL, -0.35); c.fillText('chill', -6, -30);
    if (s.power > 0) {
      c.fillStyle = `rgba(255,255,255,${0.5 * s.power})`;
      for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(Math.cos(i * 2.2) * (18 + (i % 4) * 8), Math.sin(i * 2.2) * (18 + (i % 4) * 8), 1.3, 0, Math.PI * 2); c.fill(); }
    }
  },
};

// ---------------- spout: a chrome pour lip with the scale filter clipped inside ----------------

const SPOUT = shapeFrom(roundedPts([[-16, -22, 8], [24, -8, 5], [32, 0, 3], [24, 8, 5], [-16, 22, 8]]));
const spout: PartDef = {
  id: 'spout', name: { en: 'Spout & Scale Filter', vi: 'Vòi rót & lưới lọc' }, side: 'A', z: 3, x: OX + R, y: 0, w: 48, h: 44, icon: '🔻',
  shape: SPOUT, elev: TH - 24, thick: 22, round: 10, mat: 'metal', body: '#9aa0a8',
  draw(c) {
    const g = c.createLinearGradient(0, -22, 0, 22);
    g.addColorStop(0, '#8d939c'); g.addColorStop(0.3, '#ffffff'); g.addColorStop(0.55, CHROME); g.addColorStop(1, '#7a8089');
    c.fillStyle = g; c.fill(SPOUT);
    // the pour channel down the middle
    c.save(); c.clip(SPOUT);
    const ch = c.createLinearGradient(0, -8, 0, 8);
    ch.addColorStop(0, '#5b6068'); ch.addColorStop(0.5, '#2a2d33'); ch.addColorStop(1, '#6a6f78');
    c.fillStyle = ch;
    c.beginPath(); c.moveTo(-14, -11); c.quadraticCurveTo(14, -6, 29, -1); c.lineTo(29, 1); c.quadraticCurveTo(14, 6, -14, 11); c.closePath(); c.fill();
    // stainless mesh filter at the throat
    c.fillStyle = '#c9ced6'; c.beginPath(); rrc(c, -8, 0, 10, 20, 3); c.fill();
    c.strokeStyle = 'rgba(70,76,86,0.6)'; c.lineWidth = 0.4;
    for (let k = -10; k <= 10; k += 1.3) { c.beginPath(); c.moveTo(-13, k); c.lineTo(-3, k); c.stroke(); }
    for (let k = -13; k <= -3; k += 1.3) { c.beginPath(); c.moveTo(k, -10); c.lineTo(k, 10); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(4, -13, 12, 1.6, 0.25, 0, Math.PI * 2); c.fill();
    c.restore();
  },
};

// ---------------- handle: top bar, thermostat under its cover, grip down the back ----------------

const HB = { x: OX - 93, len: 66 }; // bar centre + length, runs along x from the rim outward
const BAR = shapeFrom(roundedPts([[-33, -14, 7], [33, -16, 4], [33, 16, 4], [-33, 14, 7]]));
const BAR_EL = TH - 20;
const handle: PartDef = {
  id: 'handle', name: { en: 'Handle Frame', vi: 'Khung tay cầm' }, side: 'A', z: 3, x: HB.x, y: 0, w: 66, h: 32, icon: '🫳',
  shape: BAR, needs: ['thermo'], tool: 'sponge', elev: BAR_EL, thick: 14, round: 7, body: shade(ENAMEL, -0.22),
  draw(c) {
    const g = c.createLinearGradient(0, -16, 0, 16);
    g.addColorStop(0, shade(ENAMEL, -0.15)); g.addColorStop(0.3, shade(ENAMEL, 0.25)); g.addColorStop(0.6, ENAMEL); g.addColorStop(1, shade(ENAMEL, -0.25));
    c.fillStyle = g; c.fill(BAR);
    c.save(); c.clip(BAR); enamelGrain(c, -34, -16, 68, 32, 3); c.restore();
    // the moulded channel the thermostat and its leads lie in, the cover's screw posts
    c.fillStyle = shade(ENAMEL, -0.5); c.beginPath(); rrc(c, -2, 0, 50, 13, 5); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-26, -6.5, 48, 2.5);
    for (const x of [K4X, K5X]) {
      c.fillStyle = shade(ENAMEL, -0.1); c.beginPath(); c.arc(x - HB.x, 0, 5.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3a4a52'; c.beginPath(); c.arc(x - HB.x, 0, 2.2, 0, Math.PI * 2); c.fill();
    }
    // chrome collar where it meets the jug
    const cg = c.createLinearGradient(0, -14, 0, 14);
    cg.addColorStop(0, '#8d939c'); cg.addColorStop(0.35, '#ffffff'); cg.addColorStop(1, '#7a8089');
    c.fillStyle = cg; c.fillRect(26, -15, 5, 30);
  },
};

// the vertical grip down the back: hangs under the bar's outer end
const HG = shapeFrom(rrPts(0, 0, 20, 28, 9));
const hgrip: PartDef = {
  id: 'hgrip', name: { en: 'Handle Grip', vi: 'Tay nắm' }, side: 'A', z: 2, x: OX - 116, y: 0, w: 20, h: 28, icon: '▮',
  shape: HG, needs: ['handle'], elev: -8, thick: BAR_EL + 8, round: 9, body: shade(ENAMEL, -0.18),
  draw(c) {
    const g = c.createLinearGradient(-10, 0, 10, 0);
    g.addColorStop(0, shade(ENAMEL, -0.25)); g.addColorStop(0.35, shade(ENAMEL, 0.22)); g.addColorStop(1, shade(ENAMEL, -0.3));
    c.fillStyle = g; c.fill(HG);
    // the top end that plugs into the bar: a tenon with two pins
    c.fillStyle = shade(ENAMEL, -0.45); c.beginPath(); rrc(c, 0, 0, 10, 16, 3); c.fill();
    c.fillStyle = '#c9ced6';
    for (const y of [-4, 4]) { c.beginPath(); c.arc(0, y, 1.6, 0, Math.PI * 2); c.fill(); }
  },
};

// Thermostat: a brown bakelite steam switch with its bimetal disc, leads along the channel.
const THERMO = shapeFrom(rrPts(0, 0, 46, 12, 5));
const thermo: PartDef = {
  id: 'thermo', name: { en: 'Steam Thermostat', vi: 'Rơ-le nhiệt' }, side: 'A', z: 4, x: HB.x - 2, y: 0, w: 46, h: 12, icon: '🌡',
  shape: THERMO, needs: ['grip'], elev: BAR_EL + 10, thick: 6, round: 3, mat: 'metal', body: '#6a5444',
  draw(c, s) {
    // bakelite housing with the stainless bimetal disc
    const g = c.createLinearGradient(0, -6, 0, 6);
    g.addColorStop(0, '#4a382a'); g.addColorStop(0.4, '#9a7a5c'); g.addColorStop(1, '#3e2e22');
    c.fillStyle = g; c.beginPath(); rrc(c, 8, 0, 22, 12, 4); c.fill();
    const m = c.createRadialGradient(6, -2, 0.5, 8, 0, 5.5);
    m.addColorStop(0, '#ffffff'); m.addColorStop(0.6, '#c9ced6'); m.addColorStop(1, '#7d838c');
    c.fillStyle = m; c.beginPath(); c.arc(8, 0, 4.6, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(60,66,76,0.6)'; c.lineWidth = 0.5; c.beginPath(); c.arc(8, 0, 3, 0, Math.PI * 2); c.stroke();
    // brass spade terminals, the red / blue leads running to the switch end
    c.fillStyle = '#e0b84e';
    for (const y of [-3.2, 3.2]) c.fillRect(-6, y - 1.3, 4, 2.6);
    c.lineCap = 'round'; c.lineWidth = 2.2;
    for (const [y, col] of [[-3.2, '#e04a3a'], [3.2, '#3d7fd8']] as const) {
      c.strokeStyle = col;
      c.beginPath(); c.moveTo(-6, y);
      if (s.broken && y > 0) c.quadraticCurveTo(-12, y + 1, -14, y + 6);
      else c.lineTo(-21, y);
      c.stroke();
    }
    if (s.broken) {
      // the blue lead popped off its spade: bare strands + a scorch on the bakelite
      c.strokeStyle = '#e39a4a'; c.lineWidth = 0.7;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-14, 9); c.lineTo(-16 + i * 2, 12); c.stroke(); }
      c.fillStyle = 'rgba(30,18,10,0.6)'; c.beginPath(); c.arc(-1, 3, 4, 0, Math.PI * 2); c.fill();
    }
  },
};

const K4X = OX - 73, K5X = OX - 119;
const GRIP = shapeFrom(rrPts(0, 0, 58, 24, 9));
const SW = { btn: -13, led: -4, rock: 9 }; // grip-local x of the lid button, LED, rocker
const grip: PartDef = {
  id: 'grip', name: { en: 'Handle Cover', vi: 'Ốp tay cầm' }, side: 'A', z: 5, x: HB.x + 3, y: 0, w: 58, h: 24, icon: '▬',
  shape: GRIP, needs: ['k4', 'k5'], elev: BAR_EL + 12, thick: 8, round: 4, body: shade(ENAMEL, -0.25),
  bumps: [
    { kind: 'box', x: SW.btn, y: 0, w: 9, h: 15, height: 3.5, color: CHROME, metal: true },
    { kind: 'box', x: SW.rock, y: 0, w: 11, h: 14, height: 4.5, color: BLACK },
    { kind: 'cyl', x: SW.led, y: 0, w: 4.5, height: 1.4, color: LED },
  ],
  draw(c, s) {
    const g = c.createLinearGradient(0, -12, 0, 12);
    g.addColorStop(0, shade(ENAMEL, -0.1)); g.addColorStop(0.3, shade(ENAMEL, 0.28)); g.addColorStop(1, shade(ENAMEL, -0.22));
    c.fillStyle = g; c.fill(GRIP);
    c.save(); c.clip(GRIP); enamelGrain(c, -30, -12, 60, 24, 5); c.restore();
    // recesses round the lid button and the rocker, ON / OFF marks
    c.fillStyle = shade(ENAMEL, -0.45);
    c.beginPath(); rrc(c, SW.btn, 0, 12, 18, 4); c.fill();
    c.beginPath(); rrc(c, SW.rock, 0, 14, 17, 4); c.fill();
    font(c, 3.2); c.fillStyle = '#ffffff';
    c.fillText('I', SW.rock + 9.5, -4); c.fillText('O', SW.rock + 9.5, 4);
    c.fillText('▲', SW.btn, -11);
    // power LED
    const on = s.power > 0;
    c.fillStyle = on ? `rgba(90,184,255,${0.7 + 0.3 * Math.sin(s.time * 4)})` : '#6f8796';
    c.beginPath(); c.arc(SW.led, 0, 3, 0, Math.PI * 2); c.fill();
  },
};

// ---------------- power base: the round stand the jug sits on ----------------

const BR = R + 15;
const BASE = ellPath(0, 0, BR, BR);
const powerBase: PartDef = {
  id: 'base', name: { en: 'Power Base', vi: 'Đế nguồn' }, side: 'A', z: 1, x: OX, y: 0, w: BR * 2, h: BR * 2, icon: '🔌',
  shape: BASE, elev: -BELLY, thick: 13, round: 6, body: '#c9ced6',
  draw(c, s) {
    // satin white top with a chrome skirt round the edge
    const g = c.createRadialGradient(-20, -24, 8, 0, 0, BR);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.8, '#eceae6'); g.addColorStop(1, '#cfccc6');
    c.fillStyle = g; c.fill(BASE);
    chromeRing(c, BR - 5, BR);
    // LED ring round the seat, lit blue when it boils
    c.strokeStyle = s.power > 0 ? `rgba(90,184,255,${0.65 + 0.35 * Math.sin(s.time * 4)})` : '#c3cdd6';
    c.lineWidth = 3;
    c.beginPath(); c.arc(0, 0, BR - 9, 0, Math.PI * 2); c.stroke();
    // the 360° connector: concentric contact rings round a black post
    c.fillStyle = '#2b2a30'; c.beginPath(); c.arc(0, 0, 22, 0, Math.PI * 2); c.fill();
    for (const r of [19, 14, 9]) {
      c.strokeStyle = '#d9dde3'; c.lineWidth = 2.2; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
    }
    c.fillStyle = '#d9dde3'; c.beginPath(); c.arc(0, 0, 3.5, 0, Math.PI * 2); c.fill();
    // cord tidy groove + rating print
    c.strokeStyle = '#d6d3cc'; c.lineWidth = 5;
    c.beginPath(); c.arc(0, 0, 50, 0.3, 1.5); c.stroke();
    font(c, 4.4); c.fillStyle = '#8a8780';
    c.fillText('CHILL  ·  230V ~ 2200W', 0, -36);
    c.fillText('KETTLE BASE  MOD. K-17', 0, 36);
    if (s.broken) {
      const b = c.createRadialGradient(10, -6, 1, 10, -6, 20);
      b.addColorStop(0, 'rgba(20,12,8,0.95)'); b.addColorStop(1, 'rgba(60,30,10,0)');
      c.fillStyle = b; c.beginPath(); c.arc(10, -6, 20, 0, Math.PI * 2); c.fill();
    }
  },
};

const TIP = { x: OX + R + 30, y: 0 };

export const kettle: DeviceDef = {
  id: 'kettle',
  name: { en: 'Electric Kettle', vi: 'Ấm siêu tốc' },
  w: 240, h: 175,
  hasBack: false,
  parts: [
    body, plate, powerBase, spout, lid, handle, hgrip, thermo, grip,
    { ...screw('k1', HINGE.x, HINGE.y, 'A', 9), elev: TH + 7 },
    { ...screw('k2', OX + PLATE_SCREWS[0][0], PLATE_SCREWS[0][1], 'A', 4, ['lid']), elev: FLOOR + 4 },
    { ...screw('k3', OX + PLATE_SCREWS[1][0], PLATE_SCREWS[1][1], 'A', 4, ['lid']), elev: FLOOR + 4 },
    { ...screw('k4', K4X, 0, 'A', 9), elev: BAR_EL + 20 },
    { ...screw('k5', K5X, 0, 'A', 9), elev: BAR_EL + 20 },
  ],
  working(c, t, k) {
    c.save();
    // steam curling out of the spout and the lid vents
    for (const [x, y, n] of [[TIP.x, TIP.y, 5], [OX + 44, 0, 3]] as const) {
      for (let i = 0; i < n; i++) {
        const ph = (t * 0.7 + i / n) % 1;
        c.globalAlpha = k * (1 - ph) * 0.75;
        c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(x + Math.sin(ph * 6 + i) * 8, y - ph * 70, 8 + ph * 14, 0, Math.PI * 2); c.fill();
      }
    }
    // the power LED on the handle glows
    const lx = HB.x + 3 + SW.led;
    c.globalAlpha = k * (0.6 + 0.3 * Math.sin(t * 4));
    const g = c.createRadialGradient(lx, 0, 1, lx, 0, 14);
    g.addColorStop(0, 'rgba(120,200,255,0.9)'); g.addColorStop(1, 'rgba(90,184,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(lx, 0, 14, 0, Math.PI * 2); c.fill();
    c.restore();
  },
  workFx: { kind: 'steam', x: TIP.x, y: TIP.y, color: '#ffffff', dir: -Math.PI / 2 },
};
