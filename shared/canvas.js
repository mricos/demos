/**
 * canvas.js — Shared canvas setup, DPI scaling, and resize handling
 *
 * Usage:
 *   import { createCanvas, resizeCanvas, canvasLoop } from '/shared/canvas.js';
 *
 *   // Auto-create a DPI-aware canvas that fills its container
 *   const { canvas, ctx } = createCanvas(container, { background: '#000' });
 *
 *   // Or upgrade an existing canvas element
 *   const { canvas, ctx } = resizeCanvas(existingCanvas);
 *
 *   // Run a render loop with dt and frame count
 *   const stop = canvasLoop(ctx, (ctx, dt, frame) => {
 *     ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
 *     // draw...
 *   });
 *   // stop() to cancel
 */

/**
 * Get the device pixel ratio, clamped to avoid excessive scaling.
 */
export function dpr() {
  return Math.min(window.devicePixelRatio || 1, 3);
}

/**
 * Resize a canvas to match its CSS display size at device pixel ratio.
 * Returns { canvas, ctx, width, height } where width/height are CSS pixels.
 */
export function resizeCanvas(canvas, opts) {
  const o = opts || {};
  const ratio = dpr();
  const rect = canvas.getBoundingClientRect();
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);

  canvas.width = w * ratio;
  canvas.height = h * ratio;

  const ctx = canvas.getContext('2d', o.ctxOptions);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  return { canvas, ctx, width: w, height: h };
}

/**
 * Create a new canvas inside a container element, sized to fill it.
 * Watches for resize via ResizeObserver.
 *
 * @param {HTMLElement} container
 * @param {Object} [opts]
 * @param {string} [opts.background] — CSS background for the canvas
 * @param {Function} [opts.onResize] — called with (width, height) on resize
 * @param {Object} [opts.ctxOptions] — passed to getContext('2d', options)
 * @returns {{ canvas, ctx, destroy }}
 */
export function createCanvas(container, opts) {
  const o = opts || {};
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  if (o.background) canvas.style.background = o.background;
  container.appendChild(canvas);

  let ctx;
  function resize() {
    const result = resizeCanvas(canvas, o);
    ctx = result.ctx;
    if (o.onResize) o.onResize(result.width, result.height);
  }

  resize();

  const observer = new ResizeObserver(resize);
  observer.observe(container);

  return {
    canvas,
    get ctx() { return ctx; },
    destroy() {
      observer.disconnect();
      canvas.remove();
    }
  };
}

/**
 * Run a render loop tied to requestAnimationFrame.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Function} draw — (ctx, dt, frame) where dt is seconds since last frame
 * @returns {Function} stop — call to cancel the loop
 */
export function canvasLoop(ctx, draw) {
  let frame = 0;
  let lastTime = 0;
  let rafId;

  function tick(time) {
    const dt = lastTime ? (time - lastTime) / 1000 : 0;
    lastTime = time;
    draw(ctx, dt, frame++);
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  return function stop() {
    cancelAnimationFrame(rafId);
  };
}
