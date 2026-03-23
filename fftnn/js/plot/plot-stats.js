// Statistical and domain-specific plots
import { COLORS, sizeCanvas } from './plot-core.js';
import { plotActivationHeatmap } from './plot-heatmap.js';

function plotBandSNR(canvas, bandResults, threshold = 6) {
  const { ctx, w, h } = sizeCanvas(canvas, 250, 120);
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);
  if (!bandResults) return;

  const bands = Object.entries(bandResults);
  const n = bands.length;
  const labelH = 14;
  const barAreaW = w - 60;
  const barH = (h - labelH - 10) / n;

  const maxSNR = Math.max(20, ...bands.map(([, r]) => r.snrDB));

  bands.forEach(([name, result], i) => {
    const y = 5 + i * barH;
    const snr = Math.max(0, result.snrDB);
    const barW = (snr / maxSNR) * barAreaW;

    ctx.fillStyle = result.detected ? COLORS.success : '#30363d';
    ctx.fillRect(55, y, barW, barH - 2);

    ctx.fillStyle = COLORS.text; ctx.font = '9px monospace'; ctx.textAlign = 'right';
    ctx.fillText(name, 52, y + barH / 2 + 3);

    ctx.fillStyle = result.detected ? COLORS.success : COLORS.muted;
    ctx.textAlign = 'left';
    ctx.fillText(`${result.snrDB.toFixed(1)}dB`, 55 + barW + 3, y + barH / 2 + 3);
  });

  const threshX = 55 + (threshold / maxSNR) * barAreaW;
  ctx.strokeStyle = COLORS.error; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(threshX, 2); ctx.lineTo(threshX, h - labelH); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = COLORS.error; ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.fillText(`${threshold}dB`, threshX, h - 2);
}

function plotTestSignalActivations(canvas, network, testSignals) {
  const { ctx, w, h } = sizeCanvas(canvas, 300, 120);
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);
  if (!network || !testSignals?.length) return;

  const probeData = testSignals.map(sig => ({
    label: sig.label,
    activations: network.getActivations(sig.input)
  }));

  plotActivationHeatmap(canvas, probeData);
}

function plotClassOutput(canvas, output, trueK, labels) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = Math.max(150, Math.floor(rect.width - 2));
  const h = canvas.style.height ? parseInt(canvas.style.height) : Math.max(80, Math.floor(w * 0.22));
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);

  const n = output.length;
  if (!labels) labels = output.map((_, i) => `K=${i}`);
  const colors = ['#8b949e', '#58a6ff', '#3fb950', '#f0883e'];
  const barW = (w - 40) / n;
  const maxVal = Math.max(...output, 1);
  const predK = output.indexOf(Math.max(...output));

  for (let i = 0; i < n; i++) {
    const barH = Math.max(1, (output[i] / maxVal) * (h - 30));
    const x = 20 + i * barW + 4;
    const bw = barW - 8;

    ctx.fillStyle = i === trueK ? (colors[i % colors.length]) : '#30363d';
    ctx.fillRect(x, h - 12 - barH, bw, barH);

    if (i === predK) {
      ctx.strokeStyle = COLORS.error;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1, h - 13 - barH, bw + 2, barH + 2);
    }

    ctx.fillStyle = COLORS.muted; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + bw / 2, h - 1);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(output[i].toFixed(2), x + bw / 2, h - 15 - barH);
  }
}

export { plotBandSNR, plotTestSignalActivations, plotClassOutput };
