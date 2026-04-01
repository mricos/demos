/**
 * mesa/viz.js — Canvas utilities + plotting primitives
 *
 * DPI-aware canvas setup, ResizeObserver integration,
 * reusable axes/gridlines, line/bar/scatter drawing helpers.
 */

// ── Color palettes ──────────────────────────────────
export const COLORS = {
  red:    '#ef4444',
  orange: '#fb923c',
  yellow: '#fbbf24',
  green:  '#34d399',
  blue:   '#60a5fa',
  purple: '#a78bfa',
  cyan:   '#4af0c0',
  white:  '#e2e8f0',
  muted:  '#94a3b8',
  dim:    '#64748b',
  grid:   '#1e293b',
  bg:     '#0a0f1a',
  surface:'#111827',
};

export const PALETTE = [
  COLORS.red, COLORS.orange, COLORS.yellow,
  COLORS.green, COLORS.blue, COLORS.purple, COLORS.cyan,
];

export const EEG_BAND_COLORS = {
  delta: '#ef4444',
  theta: '#fb923c',
  alpha: '#fbbf24',
  beta:  '#3b82f6',
  gamma: '#a78bfa',
};

export const STATE_COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#ef4444'];

// ── Canvas setup ────────────────────────────────────

/**
 * Set up a canvas for DPI-aware rendering.
 * Returns { ctx, w, h } where w/h are CSS pixels.
 * Call this before every draw pass (handles resize).
 */
export function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/**
 * Watch a canvas (or its parent) for resize and call `drawFn`.
 * Returns a disconnect function.
 */
export function watchResize(canvas, drawFn) {
  const target = canvas.parentElement || canvas;
  const ro = new ResizeObserver(() => drawFn());
  ro.observe(target);
  return () => ro.disconnect();
}

// ── Plot helpers ────────────────────────────────────

/**
 * Create a coordinate system with padding.
 * Returns { toX, toY, fromX, fromY, pw, ph, pad }
 */
export function coords(w, h, xRange, yRange, pad) {
  pad = { l: 45, r: 10, t: 10, b: 28, ...pad };
  const pw = w - pad.l - pad.r;
  const ph = h - pad.t - pad.b;
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;

  return {
    toX: x => pad.l + (x - xMin) / (xMax - xMin) * pw,
    toY: y => pad.t + ph - (y - yMin) / (yMax - yMin) * ph,
    fromX: px => xMin + (px - pad.l) / pw * (xMax - xMin),
    fromY: py => yMin + (1 - (py - pad.t) / ph) * (yMax - yMin),
    pw, ph, pad,
    xRange, yRange,
  };
}

/** Draw axis gridlines and labels */
export function drawGrid(ctx, c, opts = {}) {
  const { xTicks = 5, yTicks = 5, xLabel, yLabel, xFmt, yFmt } = opts;
  const fmt = (v, f) => f ? f(v) : (Math.abs(v) >= 100 ? v.toFixed(0) :
    Math.abs(v) >= 1 ? v.toFixed(1) : v.toFixed(2));

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;
  ctx.fillStyle = COLORS.dim;
  ctx.font = '9px JetBrains Mono, monospace';

  // Y grid + labels
  for (let i = 0; i <= yTicks; i++) {
    const v = c.yRange[0] + i * (c.yRange[1] - c.yRange[0]) / yTicks;
    const y = c.toY(v);
    ctx.beginPath(); ctx.moveTo(c.pad.l, y); ctx.lineTo(c.pad.l + c.pw, y); ctx.stroke();
    ctx.fillText(fmt(v, yFmt), 2, y + 3);
  }

  // X grid + labels
  for (let i = 0; i <= xTicks; i++) {
    const v = c.xRange[0] + i * (c.xRange[1] - c.xRange[0]) / xTicks;
    const x = c.toX(v);
    ctx.beginPath(); ctx.moveTo(x, c.pad.t); ctx.lineTo(x, c.pad.t + c.ph); ctx.stroke();
    ctx.fillText(fmt(v, xFmt), x - 8, c.pad.t + c.ph + 12);
  }

  if (xLabel) {
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(xLabel + ' →', c.pad.l + c.pw - 40, c.pad.t + c.ph + 24);
  }
  if (yLabel) {
    ctx.fillText(yLabel, 2, c.pad.t - 3);
  }
}

/** Draw a line chart from (x,y) pairs */
export function drawLine(ctx, c, data, color, lineWidth = 2, dash) {
  if (!data || data.length === 0) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  data.forEach(([x, y], i) => {
    const px = c.toX(x);
    const py = Math.max(c.pad.t - 5, Math.min(c.pad.t + c.ph + 5, c.toY(y)));
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  });
  ctx.stroke();
  if (dash) ctx.setLineDash([]);
}

/** Draw a function as a continuous line, sampling nPts points over xRange */
export function drawFn(ctx, c, fn, color, lineWidth = 2, nPts = 200, dash) {
  const data = [];
  for (let i = 0; i <= nPts; i++) {
    const x = c.xRange[0] + i / nPts * (c.xRange[1] - c.xRange[0]);
    data.push([x, fn(x)]);
  }
  drawLine(ctx, c, data, color, lineWidth, dash);
}

/** Draw scatter points */
export function drawDots(ctx, c, data, color, radius = 3) {
  ctx.fillStyle = color;
  data.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(c.toX(x), c.toY(y), radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Draw vertical bars (for bar charts) */
export function drawBars(ctx, c, data, color, barWidth, alpha = 0.8) {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  data.forEach(([x, y]) => {
    const px = c.toX(x) - barWidth / 2;
    const py = c.toY(Math.max(0, y));
    const h = c.toY(0) - py;
    ctx.fillRect(px, py, barWidth, h > 0 ? h : -h);
  });
  ctx.globalAlpha = 1;
}

/** Draw a vertical dashed marker line */
export function drawVLine(ctx, c, x, color = COLORS.yellow, lineWidth = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([4, 3]);
  const px = c.toX(x);
  ctx.beginPath(); ctx.moveTo(px, c.pad.t); ctx.lineTo(px, c.pad.t + c.ph); ctx.stroke();
  ctx.setLineDash([]);
}

/** Draw a horizontal dashed marker line */
export function drawHLine(ctx, c, y, color = COLORS.yellow, lineWidth = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([4, 3]);
  const py = c.toY(y);
  ctx.beginPath(); ctx.moveTo(c.pad.l, py); ctx.lineTo(c.pad.l + c.pw, py); ctx.stroke();
  ctx.setLineDash([]);
}

/** Draw a filled point with label */
export function drawAnnotation(ctx, c, x, y, label, color = COLORS.yellow) {
  const px = c.toX(x);
  const py = c.toY(y);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
  if (label) {
    ctx.fillStyle = '#000';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, px, py + 3);
    ctx.textAlign = 'left';
  }
}

/** Draw colored background bands (for state/region visualization) */
export function drawBands(ctx, c, bands, alpha = 0.12) {
  // bands: [{ x0, x1, color }]
  ctx.globalAlpha = alpha;
  bands.forEach(({ x0, x1, color }) => {
    ctx.fillStyle = color;
    const px0 = c.toX(x0);
    const px1 = c.toX(x1);
    ctx.fillRect(px0, c.pad.t, px1 - px0, c.ph);
  });
  ctx.globalAlpha = 1;
}

// ── Spectrogram helper ──────────────────────────────

/**
 * Compute and draw a spectrogram on a canvas.
 * signal: Float64Array, fs: sample rate, maxFreq: Hz to display
 */
export function drawSpectrogram(ctx, w, h, signal, fs, opts = {}) {
  const { winSize = 256, hopSize = 64, maxFreq = 100, pad = { l: 40, r: 10, t: 5, b: 15 } } = opts;
  const pw = w - pad.l - pad.r;
  const ph = h - pad.t - pad.b;
  const nFrames = Math.floor((signal.length - winSize) / hopSize);
  const nBins = winSize / 2;
  const maxBin = Math.min(nBins, Math.ceil(maxFreq * winSize / fs));

  if (nFrames <= 0) return;

  const TAU = Math.PI * 2;
  const spec = [];
  let maxPow = 0;

  for (let f = 0; f < nFrames; f++) {
    const start = f * hopSize;
    const bins = new Float64Array(maxBin);
    for (let k = 0; k < maxBin; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < winSize; n++) {
        const wn = 0.5 * (1 - Math.cos(TAU * n / (winSize - 1)));
        const angle = -TAU * k * n / winSize;
        const s = (signal[start + n] || 0) * wn;
        re += s * Math.cos(angle);
        im += s * Math.sin(angle);
      }
      bins[k] = Math.log(1 + Math.sqrt(re * re + im * im));
      if (bins[k] > maxPow) maxPow = bins[k];
    }
    spec.push(bins);
  }

  const colW = pw / nFrames;
  const rowH = ph / maxBin;

  for (let f = 0; f < nFrames; f++) {
    for (let k = 0; k < maxBin; k++) {
      const t = spec[f][k] / (maxPow || 1);
      ctx.fillStyle = `rgb(${Math.floor(t * 255)},${Math.floor(t * 200)},${Math.floor((1 - t) * 150 + 50)})`;
      ctx.fillRect(pad.l + f * colW, pad.t + ph - (k + 1) * rowH, Math.ceil(colW) + 1, Math.ceil(rowH) + 1);
    }
  }

  // Frequency reference lines
  ctx.fillStyle = COLORS.dim;
  ctx.font = '8px JetBrains Mono, monospace';
  [4, 8, 13, 30, 60].forEach(freq => {
    const bin = freq * winSize / fs;
    if (bin < maxBin) {
      const y = pad.t + ph - bin * rowH;
      ctx.fillText(freq + 'Hz', 2, y + 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    }
  });
}
