// Network graph and weight visualizations
import { COLORS, sizeCanvas } from './plot-core.js';

function plotNetwork(canvas, network, epoch) {
  const { ctx, w, h } = sizeCanvas(canvas, 400, 220);
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);
  if (!network) return;

  const sizes = network.sizes;
  const numLayers = sizes.length;
  const maxNeurons = Math.max(...sizes);
  const layerSpacing = w / (numLayers + 1);

  const positions = sizes.map((size, l) => {
    const x = layerSpacing * (l + 1);
    const neurons = [];
    const spacing = Math.min(20, (h - 30) / (size + 1));
    const startY = (h - spacing * (size - 1)) / 2;
    for (let n = 0; n < size; n++) neurons.push({ x, y: startY + n * spacing });
    return neurons;
  });

  for (let l = 0; l < network.layers.length; l++) {
    const { W } = network.layers[l];
    const from = positions[l], to = positions[l + 1];
    for (let j = 0; j < Math.min(W.length, to.length); j++) {
      for (let k = 0; k < Math.min(W[j].length, from.length); k++) {
        const weight = W[j][k];
        const alpha = Math.min(0.8, Math.abs(weight) * 2);
        ctx.strokeStyle = weight > 0 ? `rgba(248,81,73,${alpha})` : `rgba(88,166,255,${alpha})`;
        ctx.lineWidth = Math.max(0.3, Math.min(2, Math.abs(weight) * 2));
        ctx.beginPath();
        ctx.moveTo(from[k].x, from[k].y);
        ctx.lineTo(to[j].x, to[j].y);
        ctx.stroke();
      }
    }
  }

  for (let l = 0; l < sizes.length; l++) {
    const neurons = positions[l];
    const bias = l > 0 ? network.layers[l-1].b : null;
    for (let n = 0; n < neurons.length; n++) {
      const { x, y } = neurons[n];
      const r = Math.max(3, Math.min(8, 100 / maxNeurons));
      let fill = '#21262d';
      if (bias && n < bias.length) {
        const t = (Math.tanh(bias[n]) + 1) / 2;
        fill = `rgb(${Math.floor(88 + t * 160)},${Math.floor(166 - t * 85)},${Math.floor(255 - t * 182)})`;
      }
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = l === 0 ? COLORS.success : l === sizes.length - 1 ? COLORS.error : COLORS.muted;
      ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.fillStyle = COLORS.muted; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText(l === 0 ? `In(${sizes[l]})` : l === sizes.length-1 ? `Out(${sizes[l]})` : `H${l}(${sizes[l]})`, positions[l][0].x, h - 3);
  }

  ctx.fillStyle = COLORS.accent; ctx.font = '10px monospace'; ctx.textAlign = 'left';
  ctx.fillText(`Epoch ${epoch}`, 5, 12);
}

function plotWeightWaveforms(canvas, W, fs) {
  const { ctx, w, h } = sizeCanvas(canvas, 300, 180);
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);
  if (!W?.length || !W[0]?.length) return;

  const numRows = W.length;
  const cols = W[0].length;
  const rowH = (h - 10) / numRows;
  const labelW = 40;
  const plotW = w - labelW - 5;

  for (let r = 0; r < numRows; r++) {
    const row = W[r];
    const yMid = 5 + r * rowH + rowH / 2;
    const amp = Math.max(...row.map(Math.abs)) || 1;

    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c < cols; c++) {
      const x = labelW + c / (cols - 1) * plotW;
      const y = yMid - (row[c] / amp) * (rowH * 0.4);
      c === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    let maxMag = 0, domK = 0;
    for (let k = 1; k < Math.floor(cols / 2); k++) {
      let re = 0, im = 0;
      for (let n = 0; n < cols; n++) {
        const angle = -2 * Math.PI * k * n / cols;
        re += row[n] * Math.cos(angle);
        im += row[n] * Math.sin(angle);
      }
      const mag = Math.sqrt(re * re + im * im);
      if (mag > maxMag) { maxMag = mag; domK = k; }
    }
    const domFreq = domK * (fs || 256) / cols;

    ctx.fillStyle = COLORS.muted; ctx.font = '7px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`n${r}:${domFreq.toFixed(0)}Hz`, labelW - 2, yMid + 3);
  }
}

function plotProbeEvolution(canvas, probe, predHistory, numClasses = 3) {
  const { ctx, w, h } = sizeCanvas(canvas, 150, 60);
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);
  if (!probe || !predHistory?.length) {
    ctx.fillStyle = COLORS.muted; ctx.font = '9px monospace';
    ctx.fillText(probe?.label || '?', 4, 12);
    return;
  }

  const trueK = probe.k;
  const epochs = predHistory.length;
  const mx = 4, pw = w - mx - 2, ph = h - 16;
  const nC = numClasses || predHistory[0].length;

  const classColors = ['#8b949e', '#58a6ff', '#3fb950', '#f0883e'];
  for (let k = 0; k < nC; k++) {
    ctx.strokeStyle = classColors[k % classColors.length];
    ctx.lineWidth = k === trueK ? 2 : 0.8;
    ctx.globalAlpha = k === trueK ? 1 : 0.4;
    ctx.beginPath();
    for (let e = 0; e < epochs; e++) {
      const x = mx + pw * e / (epochs - 1 || 1);
      const v = predHistory[e][k] || 0;
      const y = 3 + ph * (1 - Math.max(0, Math.min(1, v)));
      e === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const latest = predHistory[predHistory.length - 1];
  const predIdx = latest.indexOf(Math.max(...latest));
  const correct = predIdx === trueK;

  ctx.fillStyle = COLORS.muted; ctx.font = '8px monospace'; ctx.textAlign = 'left';
  ctx.fillText(`${probe.label}`, 2, h - 1);
  ctx.textAlign = 'right';
  ctx.fillStyle = correct ? COLORS.success : COLORS.error;
  const predLabel = probe.isBandProbe ? `B${predIdx + 1}` : `out[${predIdx}]`;
  ctx.fillText(`pred:${predLabel} ${correct ? '\u2713' : '\u2717'}`, w - 2, h - 1);
}

export { plotNetwork, plotWeightWaveforms, plotProbeEvolution };
