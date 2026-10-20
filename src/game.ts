// Chill Fix Corner — a cozy repair-shop game. One level = one customer:
// they tell their story at the counter, you take the gadget apart on the
// bench, repair + clean it, rebuild it, and hand it back for payment.
//
// The `FalconGame` contract at the bottom is how the studio layer drives it.

import '@fontsource/patrick-hand/400.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/baloo-2/latin-ext-800.css';
import '@fontsource/baloo-2/vietnamese-800.css';

import { createFalconEvents, type FalconGame } from './falcon-game';
import { canvas, ctx, view, resize, beginFrame } from './core/view';
import { updateTweens, clearTweens, tween, ease } from './core/tween';
import { updateFx, drawFx, drawToasts, clearFx } from './core/fx';
import { unlockAudio, pauseAudio, audioSettings } from './core/audio';
import { LEVELS, type Level } from './content/story';
import type { DeviceDef } from './content/device';
import { Counter } from './scenes/counter';
import { Bench } from './scenes/bench';
import { Settings } from './scenes/settings';
import { Collection, markRepaired, loadCollection } from './scenes/collection';
import { Results, type ResultKind } from './scenes/results';
import { noteFrame } from './three/stage';

export const LEVEL_COUNT = LEVELS.length;

// Dev-only test hooks: ?device=<id> swaps in any gadget from src/content/dev-*.ts,
// ?puzzle=<json> swaps the repair mechanic (e.g. ?puzzle={"kind":"popit","cols":4,"rows":3,"color":"#e8665a"}).
const devQuery = import.meta.env.DEV ? new URLSearchParams(location.search) : null;
const devDevices = import.meta.env.DEV ? import.meta.glob('./content/dev-*.ts', { eager: true }) as Record<string, Record<string, unknown>> : {};

function levelAt(i: number): Level {
  const L = LEVELS[i];
  if (!devQuery) return L;
  let out = L;
  const id = devQuery.get('device');
  if (id) {
    for (const m of Object.values(devDevices)) for (const v of Object.values(m)) {
      const d = v as DeviceDef;
      if (d && typeof d === 'object' && d.id === id && Array.isArray(d.parts)) {
        const part = d.parts.find((p) => p.kind !== 'screw' && p.z > 0) ?? d.parts[0];
        out = { ...out, device: d, broken: devQuery.get('broken') ?? part.id, dirty: (devQuery.get('dirty') ?? '').split(',').filter(Boolean), tasks: [] };
      }
    }
  }
  const pz = devQuery.get('puzzle');
  if (pz) out = { ...out, puzzle: JSON.parse(pz) };
  return out;
}

const events = createFalconEvents();

// Who listens for 'win'? registerFalconGame's analytics always does. When the studio layer
// is wired (a Falcon publish build) it listens too and runs its own win popup + next level;
// otherwise (dev, the web build, the APK) the game runs that flow itself.
let winListeners = 0;
const on: FalconGame['on'] = (event, fn) => {
  if (event === 'win') winListeners++;
  const off = events.on(event, fn);
  return () => { if (event === 'win') winListeners--; off(); };
};
const studioRunsFlow = () => winListeners > 1;

// ---------- persistent cash ----------

const CASH_KEY = 'chillfix_cash';
let cash = 5;
try {
  const v = Number(localStorage.getItem(CASH_KEY));
  if (Number.isFinite(v) && localStorage.getItem(CASH_KEY) !== null) cash = v;
} catch { /* storage blocked */ }
const saveCash = () => { try { localStorage.setItem(CASH_KEY, String(cash)); } catch { /* ignore */ } };
const pulse = { v: 0 };

// ---------- scene state ----------

type Scene = 'counter' | 'bench' | 'leave' | 'idle';
let level = 0;
let scene: Scene = 'idle';
let counter: Counter | null = null;
let bench: Bench | null = null;
let pan = { k: 0, active: false, dir: 1 };
let playing = false;
let paused = false;
let won = false;
/** Money the current customer paid (repair + tip), for the result card and the collection. */
let levelEarned = 0;

const settings = new Settings(
  () => startLevel(level),
  () => { /* nothing */ },
);

const collection = new Collection(LEVELS);

const results = new Results({
  onContinue: () => {
    results.hide();
    startLevel(results.kind === 'end' ? 0 : level + 1);
  },
  onCollection: () => collection.show(level),
});

function showResults(): void {
  const L = LEVELS[level];
  const last = level === LEVEL_COUNT - 1;
  const dayEnds = last || LEVELS[level + 1].day !== L.day;
  const kind: ResultKind = last ? 'end' : dayEnds ? 'day' : 'next';
  const done = loadCollection();
  const today = LEVELS.map((x, i) => ({ L: x, i }))
    .filter(({ L: x, i }) => x.day === L.day && i <= level && done[i])
    .map(({ L: x, i }) => ({ L: x, earned: done[i].earned }));
  results.show(L, levelEarned, kind, today);
}

function counterHost(mode: 'arrive' | 'leave') {
  return {
    money: () => cash,
    addMoney: (n: number) => { cash += n; levelEarned += n; saveCash(); pulse.v = 1; },
    cashPulse: () => pulse.v,
    openSettings: () => settings.show(),
    openCollection: () => collection.show(),
    showDay: mode === 'arrive' && (level === 0 || LEVELS[level - 1].day !== LEVELS[level].day),
    onDone: () => (mode === 'arrive' ? goBench() : finishLevel()),
  };
}

function goBench(): void {
  const L = levelAt(level);
  bench = new Bench(L, {
    money: () => cash,
    spend: (n) => { cash = Math.max(0, cash - n); saveCash(); pulse.v = 1; },
    tutorial: level === 0,
    cashPulse: () => pulse.v,
    openSettings: () => settings.show(),
    onPacked: () => goLeave(),
  });
  // pan the camera down from the counter to the bench
  pan = { k: 0, active: true, dir: 1 };
  tween(pan, { k: 1 }, 0.7, ease.inOutCubic, () => {
    pan.active = false;
    scene = 'bench';
    counter = null;
  });
  scene = 'bench';
}

function goLeave(): void {
  counter = new Counter(levelAt(level), 'leave', counterHost('leave'));
  pan = { k: 1, active: true, dir: -1 };
  scene = 'leave';
  tween(pan, { k: 0 }, 0.7, ease.inOutCubic, () => {
    pan.active = false;
    bench?.dispose();
    bench = null;
  });
}

function finishLevel(): void {
  if (won) return;
  won = true;
  playing = false;
  scene = 'idle';
  markRepaired(level, levelEarned);
  events.emit('win');
  // without a studio layer nobody else moves the game on: show our own card
  if (!studioRunsFlow()) showResults();
}

function startLevel(index: number): void {
  level = Math.max(0, Math.min(LEVEL_COUNT - 1, Math.floor(index)));
  clearTweens();
  clearFx();
  settings.shown = false;
  settings.open = 0;
  results.hide();
  collection.shown = false;
  levelEarned = 0;
  bench?.dispose();
  bench = null;
  pan = { k: 0, active: false, dir: 1 };
  counter = new Counter(levelAt(level), 'arrive', counterHost('arrive'));
  scene = 'counter';
  playing = true;
  paused = false;
  won = false;
  // The counter is the first beat of play — the level's clock starts here.
  // two-gadget days are the hard ones (never shown to the player, only reported)
  const hardDay = LEVELS.filter((x) => x.day === LEVELS[level].day).length > 1;
  events.emit('levelStart', { index: level, difficulty: hardDay ? 'hard' : level < 3 ? 'easy' : 'normal', levelId: `${LEVELS[level].device.id}-${level + 1}` });
}

// ---------- loop ----------

let last = performance.now();
function frame(now: number): void {
  const raw = (now - last) / 1000;
  const dt = Math.min(0.05, raw);
  last = now;
  noteFrame(raw);
  if (!paused) {
    updateTweens(dt);
    counter?.update(dt);
    bench?.update(dt);
    updateFx(dt);
    pulse.v = Math.max(0, pulse.v - dt * 3);
  }
  settings.update(dt);
  results.update(dt);
  collection.update(dt);
  render();
  requestAnimationFrame(frame);
}

function render(): void {
  beginFrame();
  const { W, H } = view;
  ctx.fillStyle = '#1b2236';
  ctx.fillRect(0, 0, W, H);
  if (pan.active || (counter && bench)) {
    const k = pan.k;
    counter?.draw(ctx, -H * k);
    bench?.draw(ctx, H * (1 - k));
  } else if (scene === 'bench' && bench) bench.draw(ctx);
  else if (counter) counter.draw(ctx);
  else if (bench) bench.draw(ctx);
  else drawIdle();
  drawFx(ctx);
  drawToasts(ctx);
  results.draw(ctx);
  settings.draw(ctx);
  collection.draw(ctx);
}

function drawIdle(): void {
  // between levels (studio popup on top): keep the last counter look calm
  const { W, H } = view;
  ctx.fillStyle = '#243256';
  ctx.fillRect(0, 0, W, H);
}

// ---------- input ----------

function pos(e: PointerEvent): [number, number] {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

let activePointer = -1;
canvas.addEventListener('pointerdown', (e) => {
  unlockAudio();
  if (activePointer !== -1) return;
  activePointer = e.pointerId;
  canvas.setPointerCapture?.(e.pointerId);
  const [x, y] = pos(e);
  if (collection.down(x, y)) return;
  if (settings.down(x, y)) return;
  if (results.down(x, y)) return;
  if (!playing || paused || pan.active) return;
  if (scene === 'bench') bench?.down(x, y);
  else counter?.down(x, y);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== activePointer) return;
  const [x, y] = pos(e);
  if (collection.move(x, y)) return;
  if (paused || pan.active) return;
  if (scene === 'bench') bench?.move(x, y);
});
const end = (e: PointerEvent) => {
  if (e.pointerId !== activePointer) return;
  activePointer = -1;
  const [x, y] = pos(e);
  if (collection.up()) return;
  if (results.up(x, y)) return;
  if (paused) return;
  if (scene === 'bench') bench?.up(x, y);
};
canvas.addEventListener('pointerup', end);
canvas.addEventListener('pointercancel', end);

if (import.meta.env.DEV) {
  // test handle for automated play-throughs (dev builds only)
  (window as unknown as { __chill: object }).__chill = {
    get bench() { return bench; },
    get counter() { return counter; },
    get scene() { return scene; },
    get results() { return results; },
    get collection() { return collection; },
    get pan() { return pan.active; },
    setCash: (n: number) => { cash = n; },
  };
}

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);
// redraw once the embedded fonts arrive
void document.fonts?.load('20px "Patrick Hand"');
void document.fonts?.load('800 20px "Baloo 2"');

/** What the studio layer attaches to. See falcon-game.ts for every member. */
export const game: FalconGame = {
  getLevelCount: () => LEVEL_COUNT,
  startLevel,
  on,
  pause: () => { paused = true; pauseAudio(true); },
  resume: () => { paused = false; pauseAudio(false); last = performance.now(); },
  getProgress: () => {
    if (scene === 'counter') return 5;
    if (bench) return Math.round(10 + bench.progress() * 85);
    return 100;
  },
  audio: {
    set: (key, on) => audioSettings.set(key, on),
    get: (key) => audioSettings.get(key),
  },
};
