// Core plotting: canvas sizing, line plots, multi-series

const COLORS = {
  bg: '#0d1117',
  bgSecondary: '#161b22',
  border: '#30363d',
  accent: '#58a6ff',
  success: '#3fb950',
  error: '#f85149',
  warning: '#f0883e',
  muted: '#8b949e',
  text: '#c9d1d9'
};

function sizeCanvas(canvas, minW = 200, minH = 80) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = Math.max(minW, Math.floor(rect.width - 2));
  const h = canvas.style.height
    ? parseInt(canvas.style.height)
    : Math.max(minH, Math.floor(w * 0.22));
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w, h };
}

function plot(canvas, data, opts = {}) {
  const { ctx, w, h } = sizeCanvas(canvas);
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);
  if (!data?.length) return;

  let yMin = opts.yMin ?? Math.min(...data);
  let yMax = opts.yMax ?? Math.max(...data);
  if (Math.abs(yMax - yMin) < 0.001) { yMin -= 0.5; yMax += 0.5; }

  const mx = 30, pw = w - mx - 5, ph = h - 15;
  const X = i => mx + pw * i / (data.length - 1 || 1);
  const Y = v => 5 + ph * (1 - (v - yMin) / (yMax - yMin || 1));

  ctx.strokeStyle = COLORS.border; ctx.beginPath();
  ctx.moveTo(mx, 5); ctx.lineTo(mx, h - 10); ctx.lineTo(w - 5, h - 10); ctx.stroke();

  ctx.strokeStyle = opts.color || COLORS.success; ctx.lineWidth = 1.5; ctx.beginPath();
  data.forEach((v, i) => i === 0 ? ctx.moveTo(X(i), Y(v)) : ctx.lineTo(X(i), Y(v)));
  ctx.stroke();

  ctx.fillStyle = COLORS.muted; ctx.font = '9px monospace';
  ctx.fillText(yMax.toFixed(2), 1, 12);
  ctx.fillText(yMin.toFixed(2), 1, h - 12);
}

function plotMulti(canvas, datasets, opts = {}) {
  const { ctx, w, h } = sizeCanvas(canvas);
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);
  if (!datasets?.length) return;

  const all = datasets.flatMap(d => d.data || []);
  if (!all.length) return;

  let yMin = opts.yMin ?? Math.min(...all);
  let yMax = opts.yMax ?? Math.max(...all);
  if (Math.abs(yMax - yMin) < 0.001) { yMin -= 0.5; yMax += 0.5; }

  const mx = 30, pw = w - mx - 5, ph = h - 15;
  const maxLen = Math.max(...datasets.map(d => d.data?.length || 0));
  const X = i => mx + pw * i / (maxLen - 1 || 1);
  const Y = v => 5 + ph * (1 - (v - yMin) / (yMax - yMin || 1));

  ctx.strokeStyle = COLORS.border; ctx.beginPath();
  ctx.moveTo(mx, 5); ctx.lineTo(mx, h - 10); ctx.lineTo(w - 5, h - 10); ctx.stroke();

  datasets.forEach(ds => {
    if (!ds.data?.length) return;
    ctx.strokeStyle = ds.color || COLORS.success; ctx.lineWidth = 1.5; ctx.beginPath();
    ds.data.forEach((v, i) => i === 0 ? ctx.moveTo(X(i), Y(v)) : ctx.lineTo(X(i), Y(v)));
    ctx.stroke();
  });
}

function plotEnsemble(canvas, signals, opts = {}) {
  const { ctx, w, h } = sizeCanvas(canvas, 200, 100);
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);
  if (!signals?.length) return;

  const all = signals.flat();
  let yMin = opts.yMin ?? Math.min(...all);
  let yMax = opts.yMax ?? Math.max(...all);
  if (Math.abs(yMax - yMin) < 0.001) { yMin -= 0.5; yMax += 0.5; }

  const mx = 25, pw = w - mx - 5, ph = h - 12;
  const maxLen = Math.max(...signals.map(s => s.length));
  const X = i => mx + pw * i / (maxLen - 1 || 1);
  const Y = v => 4 + ph * (1 - (v - yMin) / (yMax - yMin || 1));

  ctx.strokeStyle = COLORS.border; ctx.beginPath();
  ctx.moveTo(mx, 4); ctx.lineTo(mx, h - 8); ctx.lineTo(w - 5, h - 8); ctx.stroke();

  const alpha = Math.max(0.08, Math.min(0.5, 3.0 / signals.length));
  const color = opts.color || COLORS.accent;
  signals.forEach(data => {
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1;
    ctx.beginPath();
    data.forEach((v, i) => i === 0 ? ctx.moveTo(X(i), Y(v)) : ctx.lineTo(X(i), Y(v)));
    ctx.stroke();
  });
  ctx.globalAlpha = 1.0;

  if (signals.length > 1) {
    const mean = new Array(maxLen).fill(0);
    signals.forEach(s => s.forEach((v, i) => mean[i] += v));
    mean.forEach((v, i) => mean[i] /= signals.length);
    ctx.strokeStyle = opts.meanColor || COLORS.success;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    mean.forEach((v, i) => i === 0 ? ctx.moveTo(X(i), Y(v)) : ctx.lineTo(X(i), Y(v)));
    ctx.stroke();
  }

  ctx.fillStyle = COLORS.muted; ctx.font = '8px monospace';
  ctx.fillText(`n=${signals.length}`, w - 30, 10);
}

function plotHistogram(canvas, values, bins = 25) {
  const { ctx, w, h } = sizeCanvas(canvas);
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);
  if (!values?.length) return;

  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const binWidth = range / bins;
  const counts = new Array(bins).fill(0);
  values.forEach(v => { counts[Math.min(bins-1, Math.floor((v - min) / binWidth))]++; });
  const maxCount = Math.max(...counts);

  const barW = (w - 40) / bins;
  counts.forEach((c, i) => {
    const barH = (c / maxCount) * (h - 20);
    const mid = min + (i + 0.5) * binWidth;
    ctx.fillStyle = mid < 0 ? COLORS.accent : COLORS.error;
    ctx.fillRect(30 + i * barW, h - 10 - barH, barW - 1, barH);
  });

  ctx.fillStyle = COLORS.muted; ctx.font = '9px monospace';
  ctx.fillText(min.toFixed(2), 2, h - 12);
  ctx.fillText(max.toFixed(2), w - 40, h - 12);
}

export { COLORS, sizeCanvas, plot, plotMulti, plotEnsemble, plotHistogram };
