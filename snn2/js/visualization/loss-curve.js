/**
 * loss-curve.js
 * Training and validation loss curve visualization
 */

/**
 * Draw loss curve on canvas
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {Array} trainHistory - Array of {step, loss} objects
 * @param {Array} valHistory - Array of {step, loss} objects for validation
 */
export function drawLossCurve(canvas, trainHistory, valHistory = []) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const left = 32, right = w - 10;
  const top = 10, bottom = h - 20;

  // Draw axes
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();

  if (trainHistory.length < 2) return;

  // Find min/max loss across both curves
  let minL = Infinity, maxL = -Infinity;
  for (const p of trainHistory) {
    if (p.loss < minL) minL = p.loss;
    if (p.loss > maxL) maxL = p.loss;
  }
  for (const p of valHistory) {
    if (p.loss < minL) minL = p.loss;
    if (p.loss > maxL) maxL = p.loss;
  }

  if (!isFinite(minL) || !isFinite(maxL)) return;
  if (minL === maxL) maxL = minL + 1;

  // Draw horizontal reference line at 50% of range
  const refLoss = minL + (maxL - minL) * 0.5;
  const refY = bottom - (bottom - top) * 0.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(139,148,158,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, refY);
  ctx.lineTo(right, refY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Label for reference line
  ctx.fillStyle = 'rgba(139,148,158,0.6)';
  ctx.font = '10px system-ui';
  ctx.fillText(refLoss.toFixed(2), left - 28, refY + 3);

  // Training loss curve
  ctx.strokeStyle = '#2ea043';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < trainHistory.length; i++) {
    const p = trainHistory[i];
    const tx = i / Math.max(1, trainHistory.length - 1);
    const x = left + (right - left) * tx;
    const ty = (p.loss - minL) / (maxL - minL);
    const y = bottom - (bottom - top) * ty;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Validation loss curve
  if (valHistory.length > 1) {
    ctx.strokeStyle = '#f78166';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < valHistory.length; i++) {
      const p = valHistory[i];
      const tx = i / Math.max(1, valHistory.length - 1);
      const x = left + (right - left) * tx;
      const ty = (p.loss - minL) / (maxL - minL);
      const y = bottom - (bottom - top) * ty;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Legend
  ctx.fillStyle = '#2ea043';
  ctx.fillRect(right - 70, top + 2, 12, 2);
  ctx.fillStyle = '#e6edf3';
  ctx.font = '10px system-ui';
  ctx.fillText('Train', right - 54, top + 6);

  if (valHistory.length > 1) {
    ctx.fillStyle = '#f78166';
    ctx.fillRect(right - 70, top + 12, 12, 2);
    ctx.fillStyle = '#e6edf3';
    ctx.fillText('Val', right - 54, top + 16);
  }
}
