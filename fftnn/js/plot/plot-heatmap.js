// Heatmap and matrix visualizations
import { COLORS, sizeCanvas } from './plot-core.js';

function plotHeatmap(canvas, matrix, explicitW, explicitH) {
  const { ctx, w, h } = sizeCanvas(canvas, explicitW || 200, explicitH || 80);
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);
  if (!matrix?.length || !matrix[0]?.length) return;

  const rows = matrix.length, cols = matrix[0].length;
  const cw = w / cols, ch = h / rows;

  let min = Infinity, max = -Infinity;
  matrix.forEach(row => row.forEach(v => { if (isFinite(v)) { min = Math.min(min, v); max = Math.max(max, v); }}));
  if (!isFinite(min)) { min = -1; max = 1; }
  if (min === max) { min -= 1; max += 1; }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = Math.max(0, Math.min(1, (matrix[r][c] - min) / (max - min)));
      const R = t < 0.5 ? Math.floor(t * 2 * 255) : 255;
      const G = t < 0.5 ? Math.floor(t * 2 * 255) : Math.floor((1 - (t - 0.5) * 2) * 255);
      const B = t < 0.5 ? 255 : Math.floor((1 - (t - 0.5) * 2) * 255);
      ctx.fillStyle = `rgb(${R},${G},${B})`;
      ctx.fillRect(c * cw, r * ch, cw + 1, ch + 1);
    }
  }
}

function plotConfusion(canvas, matrix, labels) {
  const { ctx, w, h } = sizeCanvas(canvas, 200, 200);
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);
  if (!matrix?.length) return;

  const n = matrix.length;
  const cellSize = (Math.min(w, h) - 30) / n;
  const offset = 25;

  const maxVal = Math.max(...matrix.flat());

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const val = matrix[r][c];
      const intensity = maxVal > 0 ? val / maxVal : 0;
      const color = r === c
        ? `rgb(${Math.floor(63 + 192 * intensity)}, ${Math.floor(185 * intensity)}, ${Math.floor(80 * intensity)})`
        : `rgb(${Math.floor(248 * intensity)}, ${Math.floor(81 * intensity)}, ${Math.floor(73 * intensity)})`;
      ctx.fillStyle = color;
      ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize - 1, cellSize - 1);

      ctx.fillStyle = intensity > 0.5 ? '#000' : '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(val, offset + c * cellSize + cellSize/2, offset + r * cellSize + cellSize/2 + 4);
    }
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = '9px monospace';
  for (let i = 0; i < n; i++) {
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], offset + i * cellSize + cellSize/2, 18);
    ctx.textAlign = 'right';
    ctx.fillText(labels[i], offset - 3, offset + i * cellSize + cellSize/2 + 3);
  }
}

function plotActivationHeatmap(canvas, probeActivations) {
  const { ctx, w, h } = sizeCanvas(canvas, 300, 100);
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);
  if (!probeActivations?.length) return;

  const labelW = 55;
  const plotW = w - labelW;

  const rows = probeActivations.map(p => {
    const flat = [];
    for (const layer of p.activations) flat.push(...layer);
    return flat;
  });

  if (!rows[0]?.length) return;
  const cols = rows[0].length;
  const numRows = rows.length;

  let min = Infinity, max = -Infinity;
  for (const row of rows) for (const v of row) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) { min -= 1; max += 1; }

  const cellW = plotW / cols;
  const cellH = (h - 4) / numRows;

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = Math.max(0, Math.min(1, (rows[r][c] - min) / (max - min)));
      const g = Math.floor(40 + t * 200);
      const b = Math.floor(80 + t * 175);
      ctx.fillStyle = `rgb(${Math.floor(t * 30)},${g},${b})`;
      ctx.fillRect(labelW + c * cellW, 2 + r * cellH, cellW + 1, cellH - 1);
    }
  }

  ctx.fillStyle = COLORS.muted; ctx.font = '8px monospace'; ctx.textAlign = 'right';
  for (let r = 0; r < numRows; r++) {
    ctx.fillText(probeActivations[r].label, labelW - 3, 2 + r * cellH + cellH / 2 + 3);
  }
}

export { plotHeatmap, plotConfusion, plotActivationHeatmap };
