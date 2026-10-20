// Tiny tween + timer system driven by the game loop (so pause freezes it).

export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inCubic: (t: number) => t * t * t,
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inBack: (t: number) => 2.70158 * t * t * t - 1.70158 * t * t,
  outElastic: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
};

interface Job {
  t: number;
  dur: number;
  step?: (k: number) => void;
  done?: () => void;
  ease: Ease;
  tag?: string;
}

let jobs: Job[] = [];

/** Animate numeric props of `obj` to `to` over `dur` seconds. */
export function tween(
  obj: object,
  to: Record<string, number>,
  dur: number,
  e: Ease = ease.outCubic,
  done?: () => void,
  tag?: string,
): void {
  const o = obj as Record<string, number>;
  const from: Record<string, number> = {};
  for (const k in to) from[k] = o[k];
  jobs.push({
    t: 0,
    dur: Math.max(0.0001, dur),
    ease: e,
    tag,
    step: (k) => {
      for (const key in to) o[key] = from[key] + ((to as Record<string, number>)[key] - from[key]) * k;
    },
    done,
  });
}

/** Run `fn(k)` with eased k from 0..1 over `dur` seconds. */
export function animate(dur: number, step: (k: number) => void, e: Ease = ease.linear, done?: () => void, tag?: string): void {
  jobs.push({ t: 0, dur: Math.max(0.0001, dur), step, ease: e, done, tag });
}

export function wait(dur: number, done: () => void, tag?: string): void {
  jobs.push({ t: 0, dur, ease: ease.linear, done, tag });
}

export function cancelTag(tag: string): void {
  jobs = jobs.filter((j) => j.tag !== tag);
}

export function clearTweens(): void {
  jobs = [];
}

export function updateTweens(dt: number): void {
  const list = jobs;
  jobs = [];
  const keep: Job[] = [];
  for (const j of list) {
    j.t += dt;
    const k = Math.min(1, j.t / j.dur);
    j.step?.(j.ease(k));
    if (k >= 1) j.done?.();
    else keep.push(j);
  }
  // jobs added during callbacks land in `jobs`
  jobs = keep.concat(jobs);
}
