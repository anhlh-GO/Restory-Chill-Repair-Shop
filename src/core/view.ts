// Canvas + layout units. Everything is laid out for a portrait phone: `U` is
// one design pixel of a 390-wide screen, clamped so tall/short phones still fit.

export const canvas = document.getElementById('game') as HTMLCanvasElement;
export const ctx = canvas.getContext('2d')!;

export const view = { W: 390, H: 800, U: 1, dpr: 1, top: 0 };

export function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const W = canvas.clientWidth || window.innerWidth;
  const H = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  view.W = W;
  view.H = H;
  view.dpr = dpr;
  view.U = Math.min(W / 390, H / 760);
  // Safe-area top (notch): a probe element padded with env(safe-area-inset-top).
  view.top = parseFloat(getComputedStyle(probe()).paddingTop) || 0;
}

let probeEl: HTMLDivElement | null = null;
function probe(): HTMLDivElement {
  if (!probeEl) {
    probeEl = document.createElement('div');
    probeEl.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top);pointer-events:none';
    document.body.appendChild(probeEl);
  }
  return probeEl;
}

export function beginFrame(): void {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
}
