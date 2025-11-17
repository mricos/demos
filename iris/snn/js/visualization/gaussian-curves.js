/**
 * gaussian-curves.js
 * 1D Gaussian distribution curve visualization
 */

import { computeFeatureStats, gaussianPDF } from '../core/statistics.js';

/**
 * Draw Gaussian curve for a single feature dimension
 */
export function drawGaussianCurve(canvas, data, featureIdx) {
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = 20;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#1b1f27';
  ctx.fillRect(0, 0, w, h);

  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d'];

  // Get data range for this feature
  let minX = Infinity, maxX = -Infinity;
  for (const d of data) {
    if (d.features[featureIdx] < minX) minX = d.features[featureIdx];
    if (d.features[featureIdx] > maxX) maxX = d.features[featureIdx];
  }
  const rangeX = maxX - minX;
  minX -= rangeX * 0.1;
  maxX += rangeX * 0.1;

  // Compute stats for each class
  const classStats = [];
  let maxPDF = 0;
  for (let c = 0; c < 3; c++) {
    const stats = computeFeatureStats(data, c, featureIdx);
    classStats.push(stats);
    // Sample PDF at mean to get approximate max
    const pdf = gaussianPDF(stats.mean, stats.mean, stats.std);
    if (pdf > maxPDF) maxPDF = pdf;
  }

  // Draw axes
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, h - pad);
  ctx.lineTo(w - pad, h - pad);
  ctx.stroke();

  // Draw Gaussian curves
  const numPoints = 200;
  for (let c = 0; c < 3; c++) {
    const { mean, std } = classStats[c];

    ctx.strokeStyle = colors[c];
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const x = minX + t * (maxX - minX);
      const pdfVal = gaussianPDF(x, mean, std);
      const canvasX = pad + t * (w - 2 * pad);
      const canvasY = h - pad - (pdfVal / maxPDF) * (h - 2 * pad);

      if (i === 0) {
        ctx.moveTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    }
    ctx.stroke();

    // Fill area under curve
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = colors[c];
    ctx.lineTo(w - pad, h - pad);
    ctx.lineTo(pad, h - pad);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  // Axis labels
  ctx.fillStyle = '#8b949e';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(minX.toFixed(1), pad, h - pad + 15);
  ctx.textAlign = 'right';
  ctx.fillText(maxX.toFixed(1), w - pad, h - pad + 15);
}
