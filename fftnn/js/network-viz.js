// Network visualization
import { $, state } from './state.js';
import { computeFLOPs } from './dsp.js';
import { plotNetwork, plotHistogram, plotHeatmap, plotWeightWaveforms, plot } from './plot.js';
import { getParams } from './params.js';
import { computeSingularValues, computeOrthogonality, computeSpectralPurity, detectDeadRedundant } from './diagnostics.js';

function updateNetworkViz(epoch) {
  const snap = state.networkSnapshots[epoch] || state.nn;
  if (!snap) return;

  plotNetwork($('cNetwork'), snap, epoch);

  const allW = snap.layers.flatMap(l => l.W.flat());
  plotHistogram($('cWeightHist'), allW);

  if (snap.layers[0]) plotHeatmap($('cWeightMatrix'), snap.layers[0].W);

  const allB = snap.layers.flatMap(l => l.b);
  plot($('cBias'), allB, { color: '#f0883e' });

  if (snap.layers[0]) {
    const p = getParams();
    plotWeightWaveforms($('cWeightWaveforms'), snap.layers[0].W, p.fs);
  }

  const p2 = getParams();
  const flops2 = computeFLOPs({ N: p2.N, sizes: snap.sizes });
  let html = `<div style="margin:4px 0; padding:4px; background:#0d1117; border-radius:3px;">
    <div style="color:#f0883e;">Inference FLOPs</div>
    <div>FFT: ${flops2.fftFlops} | NN: ${flops2.nnFlops}</div>
  </div>`;
  snap.layers.forEach((l, i) => {
    const w = l.W.flat();
    const meanW = w.reduce((a,b) => a+b, 0) / w.length;
    const stdW = Math.sqrt(w.reduce((a,b) => a + (b-meanW)**2, 0) / w.length);
    const meanB = l.b.reduce((a,b) => a+b, 0) / l.b.length;
    const maxW = Math.max(...w.map(Math.abs));
    html += `<div style="margin:4px 0; padding:4px; background:#0d1117; border-radius:3px;">
      <div style="color:#58a6ff;">L${i+1} (${l.W[0].length}\u2192${l.W.length})</div>
      <div>W: \u03bc=${meanW.toFixed(3)} \u03c3=${stdW.toFixed(3)} max=${maxW.toFixed(3)}</div>
      <div>B: \u03bc=${meanB.toFixed(3)}</div>
    </div>`;
  });
  $('layerStats').innerHTML = html;

  // Weight diagnostics for L1
  if (snap.layers[0]) {
    const W = snap.layers[0].W;
    const b = snap.layers[0].b;

    const svd = computeSingularValues(W);
    const orth = computeOrthogonality(W);
    const purity = computeSpectralPurity(W);
    const dr = detectDeadRedundant(W);
    const meanBias = Math.abs(b.reduce((a, v) => a + v, 0) / b.length);

    const metrics = [
      { label: 'Condition #', value: svd.conditionNumber === Infinity ? '∞' : svd.conditionNumber.toFixed(2), ideal: '1.0' },
      { label: 'Effective Rank', value: svd.effectiveRank + '/' + Math.min(W.length, W[0].length), ideal: 'max' },
      { label: 'Orthogonality', value: orth.score.toFixed(3), ideal: '0.0' },
      { label: 'Spectral Purity', value: purity.mean.toFixed(3), ideal: '1.0' },
      { label: 'Mean |bias|', value: meanBias.toFixed(4), ideal: '0.0' },
      { label: 'Dead / Redundant', value: dr.deadCount + ' / ' + dr.redundantCount, ideal: '0 / 0' },
    ];

    const diagEl = $('diagMetrics');
    if (diagEl) {
      diagEl.innerHTML = metrics.map(m =>
        `<div class="diag-metric">
          <div class="diag-value">${m.value}</div>
          <div class="diag-label">${m.label}</div>
          <div class="diag-ideal">ideal: ${m.ideal}</div>
        </div>`
      ).join('');
    }

    // Singular value spectrum
    const svCanvas = $('cSingularValues');
    if (svCanvas) plot(svCanvas, svd.singularValues, { color: '#58a6ff' });

    // Gram matrix heatmap
    const gmCanvas = $('cGramMatrix');
    if (gmCanvas) plotHeatmap(gmCanvas, orth.gramMatrix);
  }
}

export { updateNetworkViz };
