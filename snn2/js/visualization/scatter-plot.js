/**
 * scatter-plot.js
 * 2D scatter plot visualization with Gaussian ellipses
 */

import { compute2DCovMatrix } from '../core/statistics.js';
import { gmmConfig } from '../core/data-generator.js';

/**
 * Draw rotated Gaussian ellipse using eigenvalue decomposition
 * Correctly handles non-uniform scaling between X and Y axes
 */
export function drawEllipse(ctx, centerX, centerY, covXX, covYY, covXY, w, h, pad, minX, maxX, minY, maxY, color, alpha = 0.2, nstd = 2) {
  // Transform center to canvas coordinates
  const cx = pad + ((centerX - minX) / (maxX - minX)) * (w - 2 * pad);
  const cy = h - pad - ((centerY - minY) / (maxY - minY)) * (h - 2 * pad);

  // Calculate scale factors for X and Y axes
  const scaleX = (w - 2 * pad) / (maxX - minX);
  const scaleY = (h - 2 * pad) / (maxY - minY);

  // Transform covariance matrix to canvas space
  // This accounts for different scaling and Y-axis inversion
  const covXX_canvas = covXX * scaleX * scaleX;
  const covYY_canvas = covYY * scaleY * scaleY;
  const covXY_canvas = covXY * scaleX * scaleY * (-1); // Negate for Y-axis flip

  // Eigenvalue decomposition in canvas space
  const a = covXX_canvas, b = covXY_canvas, c = covXY_canvas, d = covYY_canvas;
  const trace = a + d;
  const det = a * d - b * c;
  const discriminant = Math.sqrt(Math.max(0, trace * trace / 4 - det));

  const lambda1 = trace / 2 + discriminant;
  const lambda2 = trace / 2 - discriminant;

  // Eigenvector for larger eigenvalue (lambda1) - now in canvas space
  // Eigenvector is [covXY, λ₁ - covXX] = [b, lambda1 - a]
  let angle;
  if (Math.abs(b) < 1e-10) {
    angle = a >= d ? 0 : Math.PI / 2;
  } else {
    angle = Math.atan2(lambda1 - a, b);  // atan2(y-component, x-component)
  }

  // Radii - already in canvas space from transformed eigenvalues
  const rx = nstd * Math.sqrt(lambda1);
  const ry = nstd * Math.sqrt(lambda2);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);

  ctx.fillStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
  ctx.fill();

  ctx.strokeStyle = color + Math.floor((alpha * 2) * 255).toString(16).padStart(2, '0');
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw 2D scatter plot with optional Gaussian ellipses
 */
export function drawScatter(canvas, data, dimX, dimY, showEllipses = true) {
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;

  // Clear
  ctx.fillStyle = '#1b1f27';
  ctx.fillRect(0, 0, w, h);

  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d'];
  const pad = 35;

  // Get data ranges
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const d of data) {
    if (d.features[dimX] < minX) minX = d.features[dimX];
    if (d.features[dimX] > maxX) maxX = d.features[dimX];
    if (d.features[dimY] < minY) minY = d.features[dimY];
    if (d.features[dimY] > maxY) maxY = d.features[dimY];
  }

  // Add padding to ranges
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  minX -= rangeX * 0.1;
  maxX += rangeX * 0.1;
  minY -= rangeY * 0.1;
  maxY += rangeY * 0.1;

  // Draw grid
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const x = pad + (i / 4) * (w - 2 * pad);
    const y = h - pad - (i / 4) * (h - 2 * pad);
    ctx.beginPath();
    ctx.moveTo(x, pad);
    ctx.lineTo(x, h - pad);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();
  }

  // Draw axes
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, h - pad);
  ctx.lineTo(w - pad, h - pad);
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, h - pad);
  ctx.stroke();

  // Draw Gaussian ellipses if enabled
  if (showEllipses) {
    for (let c = 0; c < 3; c++) {
      const cov = compute2DCovMatrix(data, c, dimX, dimY);
      drawEllipse(ctx, cov.meanX, cov.meanY, cov.covXX, cov.covYY, cov.covXY,
                  w, h, pad, minX, maxX, minY, maxY, colors[c], 0.15, 2);
    }
  }

  // Draw points
  for (const d of data) {
    const x = pad + ((d.features[dimX] - minX) / (maxX - minX)) * (w - 2 * pad);
    const y = h - pad - ((d.features[dimY] - minY) / (maxY - minY)) * (h - 2 * pad);

    ctx.fillStyle = colors[d.class];
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Add subtle stroke
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Axis labels
  ctx.fillStyle = '#8b949e';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(minX.toFixed(1), pad - 5, h - pad + 15);
  ctx.textAlign = 'right';
  ctx.fillText(maxX.toFixed(1), w - pad + 5, h - pad + 15);

  ctx.textAlign = 'right';
  ctx.fillText(minY.toFixed(1), pad - 5, h - pad + 5);
  ctx.fillText(maxY.toFixed(1), pad - 5, pad + 5);
}
