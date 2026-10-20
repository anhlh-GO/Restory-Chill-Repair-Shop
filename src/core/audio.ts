// Synthesised SFX + a soft lo-fi loop. No audio files: everything is WebAudio.

type Key = 'sound' | 'music' | 'haptic';

const settings: Record<Key, boolean> = { sound: true, music: true, haptic: true };
try {
  const raw = localStorage.getItem('chillfix_audio');
  if (raw) Object.assign(settings, JSON.parse(raw));
} catch { /* ignore */ }

let ac: AudioContext | null = null;
let master: GainNode;
let sfxBus: GainNode;
let musicBus: GainNode;
let noiseBuf: AudioBuffer;
let musicTimer = 0;
let nextBeat = 0;
let beatIndex = 0;
let suspended = false;

function ensure(): AudioContext | null {
  if (ac) return ac;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ac = new Ctor();
  master = ac.createGain();
  master.gain.value = 0.9;
  master.connect(ac.destination);
  sfxBus = ac.createGain();
  sfxBus.gain.value = settings.sound ? 0.7 : 0;
  sfxBus.connect(master);
  musicBus = ac.createGain();
  musicBus.gain.value = settings.music ? 0.32 : 0;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  musicBus.connect(lp);
  lp.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ac;
}

/** Call from a user gesture: unlocks audio and starts the music loop. */
export function unlockAudio(): void {
  const a = ensure();
  if (!a) return;
  if (a.state === 'suspended' && !suspended) void a.resume();
  if (!musicTimer) {
    nextBeat = a.currentTime + 0.1;
    musicTimer = window.setInterval(scheduleMusic, 100);
  }
}

export function pauseAudio(p: boolean): void {
  suspended = p;
  if (!ac) return;
  if (p) void ac.suspend();
  else void ac.resume();
}

export const audioSettings = {
  set(key: Key, on: boolean): void {
    settings[key] = on;
    try { localStorage.setItem('chillfix_audio', JSON.stringify(settings)); } catch { /* ignore */ }
    if (ac) {
      sfxBus.gain.value = settings.sound ? 0.7 : 0;
      musicBus.gain.value = settings.music ? 0.32 : 0;
    }
  },
  get(key: Key): boolean {
    return settings[key];
  },
};

export function haptic(ms = 12): void {
  if (!settings.haptic) return;
  try { navigator.vibrate?.(ms); } catch { /* ignore */ }
}

// ---------- building blocks ----------

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, at = 0, slideTo?: number, bus?: GainNode): void {
  const a = ensure();
  if (!a || (!settings.sound && !bus)) return;
  const t0 = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(bus ?? sfxBus);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, freq: number, q = 1, vol = 0.3, at = 0, type: BiquadFilterType = 'bandpass', bus?: GainNode): void {
  const a = ensure();
  if (!a || (!settings.sound && !bus)) return;
  const t0 = a.currentTime + at;
  const s = a.createBufferSource();
  s.buffer = noiseBuf;
  s.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f);
  f.connect(g);
  g.connect(bus ?? sfxBus);
  s.start(t0, Math.random() * 0.5);
  s.stop(t0 + dur + 0.02);
}

// ---------- SFX ----------

export const sfx = {
  tap(): void { tone(880, 0.06, 'triangle', 0.15); },
  blip(pitch = 1): void { tone(520 * pitch + Math.random() * 60, 0.045, 'square', 0.035); },
  pop(): void { tone(420, 0.12, 'sine', 0.3, 0, 900); noise(0.05, 3000, 2, 0.08); },
  lift(): void { tone(300, 0.1, 'triangle', 0.15, 0, 520); },
  place(): void {
    tone(180, 0.12, 'sine', 0.35, 0, 90);
    noise(0.06, 1800, 3, 0.25);
    tone(1400, 0.05, 'square', 0.05, 0.03);
  },
  ratchet(n = 6): void {
    for (let i = 0; i < n; i++) noise(0.025, 4200 + Math.random() * 800, 6, 0.22, i * 0.07);
  },
  clink(): void { tone(2200, 0.18, 'sine', 0.12); tone(3300, 0.12, 'sine', 0.06, 0.02); },
  whoosh(): void { noise(0.25, 900, 0.7, 0.18, 0, 'bandpass'); },
  scrub(): void { noise(0.07, 2500 + Math.random() * 1500, 1.5, 0.08); },
  bubble(): void { tone(600 + Math.random() * 600, 0.07, 'sine', 0.06, 0, 1400); },
  sparkle(): void {
    [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, 0.25, 'sine', 0.08, i * 0.06));
  },
  success(): void {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'triangle', 0.18, i * 0.08));
    tone(1568, 0.6, 'sine', 0.08, 0.32);
  },
  fanfare(): void {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.4, 'triangle', 0.16, i * 0.07));
    noise(0.6, 6000, 0.5, 0.05, 0.3, 'highpass');
  },
  cash(): void {
    noise(0.05, 3000, 2, 0.2);
    tone(2637, 0.4, 'sine', 0.15, 0.06);
    tone(3520, 0.5, 'sine', 0.12, 0.12);
  },
  coin(): void { tone(1976, 0.08, 'square', 0.05); tone(2637, 0.14, 'square', 0.05, 0.06); },
  stamp(): void { tone(90, 0.2, 'sine', 0.5, 0, 50); noise(0.1, 600, 1, 0.35); },
  error(): void { tone(160, 0.16, 'square', 0.08); tone(130, 0.18, 'square', 0.08, 0.08); },
  box(): void { noise(0.18, 700, 0.8, 0.28); noise(0.12, 1400, 1, 0.15, 0.08); },
  flip(): void { noise(0.15, 1200, 0.8, 0.15); tone(500, 0.12, 'triangle', 0.08, 0.04, 700); },
  connect(step = 0): void { tone(440 * Math.pow(2, (step % 12) / 12), 0.12, 'triangle', 0.16); },
  zap(): void { noise(0.12, 5000, 4, 0.12); tone(1200, 0.08, 'sawtooth', 0.03, 0, 2400); },
  // ---- ASMR / antistress ----
  /** Soldering iron on a pad: a short hiss + crackle. Call repeatedly while held. */
  sizzle(): void { noise(0.12, 5200 + Math.random() * 1500, 1.2, 0.07); if (Math.random() < 0.4) noise(0.02, 2400, 6, 0.08, 0.04); },
  /** Silicone dome popping (pop-it / rubber keys); pitch varies a little. */
  popit(pitch = 1): void { tone(260 * pitch + Math.random() * 40, 0.09, 'sine', 0.32, 0, 120); noise(0.03, 1800, 3, 0.12); },
  /** Protective film coming off: call every few pixels of peel. */
  peel(): void { noise(0.05, 3200 + Math.random() * 2500, 2.5, 0.09); },
  /** Puff of the bulb blower. */
  blow(): void { noise(0.28, 1100, 0.6, 0.16, 0, 'lowpass'); noise(0.18, 3500, 0.8, 0.05, 0.02); },
  /** Cleaning gel pressed and pulled. */
  squish(): void { tone(140 + Math.random() * 40, 0.16, 'sine', 0.18, 0, 70); noise(0.1, 700, 2, 0.08, 0.03, 'lowpass'); },
  /** Small mechanical tick (tape reel, terminal screw, switch). */
  tick(): void { noise(0.015, 4800, 8, 0.2); tone(1800, 0.02, 'square', 0.03); },
  /** Wire snapping into a terminal. */
  snap(): void { noise(0.03, 2600, 5, 0.3); tone(900, 0.06, 'triangle', 0.12, 0.01, 1300); },
  bell(): void { tone(2093, 0.7, 'sine', 0.14); tone(4186, 0.45, 'sine', 0.05, 0.01); tone(2637, 0.5, 'sine', 0.04, 0.02); },
  door(): void { tone(1318, 0.25, 'sine', 0.12); tone(1046, 0.35, 'sine', 0.12, 0.18); },
  rotate(): void { noise(0.04, 2600, 4, 0.18); tone(700, 0.05, 'triangle', 0.08); },
  heat(): void { noise(0.8, 400, 0.6, 0.12, 0, 'lowpass'); },
  shutter(): void { noise(0.03, 5000, 3, 0.3); noise(0.05, 3000, 3, 0.25, 0.07); },
};

// ---------- music: a 4-chord lo-fi loop at 76 bpm ----------

const BPM = 76;
const CHORDS = [
  [53, 57, 60, 64], // Fmaj7
  [52, 55, 59, 62], // Em7
  [50, 53, 57, 60], // Dm7
  [48, 52, 55, 59], // Cmaj7
];
const MELODY = [76, -1, 74, 72, -1, 69, -1, 72, 71, -1, 67, -1, 69, -1, -1, -1];

const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

function keys(freq: number, t: number, dur: number, vol: number): void {
  const a = ac!;
  const o = a.createOscillator();
  const o2 = a.createOscillator();
  const g = a.createGain();
  o.type = 'sine';
  o2.type = 'triangle';
  o.frequency.value = freq;
  o2.frequency.value = freq * 2.001;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(vol * 0.4, t + 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const g2 = a.createGain();
  g2.gain.value = 0.25;
  o.connect(g);
  o2.connect(g2);
  g2.connect(g);
  g.connect(musicBus);
  o.start(t);
  o2.start(t);
  o.stop(t + dur + 0.05);
  o2.stop(t + dur + 0.05);
}

function scheduleMusic(): void {
  if (!ac || suspended) return;
  const spb = 60 / BPM / 2; // eighth notes
  if (nextBeat < ac.currentTime) nextBeat = ac.currentTime + 0.05; // tab was throttled
  while (nextBeat < ac.currentTime + 0.4) {
    const t = nextBeat;
    const bar = Math.floor(beatIndex / 8) % 4;
    const step = beatIndex % 8;
    if (settings.music) {
      if (step === 0) for (const n of CHORDS[bar]) keys(mtof(n), t, spb * 7.5, 0.05);
      if (step === 0 || step === 5) keys(mtof(CHORDS[bar][0] - 12), t, spb * 3, 0.09);
      const mel = MELODY[(beatIndex % 16)];
      if (mel > 0 && bar % 2 === 1) keys(mtof(mel), t + 0.02, spb * 2, 0.035);
      // soft kick / rim / hat
      if (step === 0 || step === 3) {
        tone(110, 0.18, 'sine', 0.25, t - ac.currentTime, 45, musicBus);
      }
      if (step === 4) noise(0.08, 1800, 1.2, 0.08, t - ac.currentTime, 'bandpass', musicBus);
      noise(0.03, 8000, 1, step % 2 ? 0.02 : 0.035, t - ac.currentTime + (step % 2 ? 0.04 : 0), 'highpass', musicBus);
      if (Math.random() < 0.25) noise(0.01, 3000, 0.5, 0.012, t - ac.currentTime + Math.random() * spb, 'highpass', musicBus);
    }
    nextBeat += spb;
    beatIndex++;
  }
}
