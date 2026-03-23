// Experiment save, load, render, compare
import { $, state } from './state.js';
import { computeFLOPs } from './dsp.js';
import { plotMulti } from './plot.js';
import { getParams, buildSizes, updateLabels, updateKDistDisplay, updateSummary } from './params.js';
import { doGenerate } from './signal.js';

function saveExperiment() {
  if (!state.nn) return;
  const p = getParams();
  const finalLoss = state.lossHistory[state.lossHistory.length - 1];
  const finalAcc = state.accHistory.length ? state.accHistory[state.accHistory.length - 1] : 0;

  const allW = state.nn.layers.flatMap(l => l.W.flat());
  const meanW = allW.reduce((a,b) => a+b, 0) / allW.length;
  const stdW = Math.sqrt(allW.reduce((a,b) => a + (b-meanW)**2, 0) / allW.length);
  const sparsity = allW.filter(w => Math.abs(w) < 0.01).length / allW.length;
  const maxW = Math.max(...allW.map(Math.abs));

  const layerInfo = state.nn.layers.map((l, i) => {
    const w = l.W.flat();
    const mw = w.reduce((a,b) => a+b, 0) / w.length;
    const sw = Math.sqrt(w.reduce((a,b) => a + (b-mw)**2, 0) / w.length);
    const mb = l.b.reduce((a,b) => a+b, 0) / l.b.length;
    return { layer: i+1, shape: `${l.W[0].length}\u2192${l.W.length}`, meanW: mw, stdW: sw, meanB: mb };
  });

  const sizes = buildSizes(p);
  const flops = computeFLOPs({ N: p.N, sizes });

  const minLoss = Math.min(...state.lossHistory);
  const minLossEpoch = state.lossHistory.indexOf(minLoss) + 1;
  const loss10 = state.lossHistory.length >= 10 ? state.lossHistory[9] : null;
  const loss50 = state.lossHistory.length >= 50 ? state.lossHistory[49] : null;

  state.experiments.push({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    params: { ...p },
    sizes: state.nn.sizes,
    lossHistory: [...state.lossHistory],
    accHistory: [...state.accHistory],
    finalLoss, finalAcc,
    autoStopped: state.appState.autoStopped,
    totalEpochs: p.epochs,
    trainedEpochs: state.lossHistory.length,
    insights: {
      meanW: meanW.toFixed(4), stdW: stdW.toFixed(4), maxW: maxW.toFixed(4),
      sparsity: (sparsity * 100).toFixed(1),
      accuracy: (finalAcc * 100).toFixed(1),
      converged: finalAcc > 0.9,
      epochs: state.lossHistory.length,
      minLoss: minLoss.toFixed(4), minLossEpoch,
      loss10: loss10?.toFixed(4) || '-', loss50: loss50?.toFixed(4) || '-',
      fftFlops: flops.fftFlops, nnFlops: flops.nnFlops,
      params: state.nn.countParams(),
      layerInfo
    }
  });
  renderExperiments();
}

function experimentToText(exp, i) {
  const p = exp.params;
  const ins = exp.insights;
  const deltaF = p.fs / p.N;
  const lines = [
    `Exp #${i + 1} ${ins.converged ? '\u2713 converged' : '\u2717 not converged'}`,
    `${new Date(exp.timestamp).toLocaleString()}`,
    ``,
    `-- Architecture --`,
    `Mode: ${p.mode || 'fft-simulator'}${p.fftRepr === 'complex' ? ' (complex)' : ' (absolute)'}`,
    `Arch: ${exp.sizes.join('\u2192')}`,
    `Activation: ${p.activation}`,
    `Params: ${ins.params || '-'}`,
    ``,
    `-- Signal --`,
    `N=${p.N}, fs=${p.fs}Hz, \u0394f=${deltaF.toFixed(2)}Hz`,
    `Freq: ${p.freqMin}-${p.freqMax}Hz, sep\u2265${p.freqSep}Hz`,
    `Amp: ${p.ampMin}-${p.ampMax}, SNR: ${p.noiseSNR || 20}dB (\u03c3=${p.sigma?.toFixed(4) || '-'})`,
    `Max tones K: ${p.maxK}`,
    ``,
    `-- Training --`,
    `lr=${p.lr.toFixed(4)}, batch=${p.batch}, epochs=${exp.trainedEpochs || ins.epochs}/${exp.totalEpochs || p.epochs}${exp.autoStopped ? ' (auto-stopped)' : ''}`,
    `Seed: ${p.seed}`,
    ``,
    `-- Results --`,
    `Final loss: ${exp.finalLoss?.toFixed(4) || '-'}`,
    `Best loss: ${ins.minLoss || '-'} @ epoch ${ins.minLossEpoch || '-'}`,
    `Loss @10: ${ins.loss10 || '-'}, @50: ${ins.loss50 || '-'}`,
    `Accuracy: ${ins.accuracy}%`,
    ``,
    `-- Weights --`,
    `W: \u03bc=${ins.meanW} \u03c3=${ins.stdW} max=${ins.maxW || '-'}`,
    `Sparsity: ${ins.sparsity}% (|w|<0.01)`,
  ];
  if (ins.layerInfo) {
    ins.layerInfo.forEach(l => {
      lines.push(`  L${l.layer} (${l.shape}): W \u03bc=${l.meanW.toFixed(3)} \u03c3=${l.stdW.toFixed(3)}, B \u03bc=${l.meanB.toFixed(3)}`);
    });
  }
  lines.push('');
  lines.push(`-- FLOPs --`);
  lines.push(`FFT: ${ins.fftFlops || '-'} | NN: ${ins.nnFlops || '-'}`);
  return lines.join('\n');
}

function loadExperimentParams(exp) {
  const p = exp.params;
  $('N').value = p.N;
  $('fs').value = p.fs;
  $('maxK').value = p.maxK;
  $('freqMin').value = p.freqMin;
  $('freqMax').value = p.freqMax;
  $('freqSep').value = p.freqSep;
  $('ampMin').value = p.ampMin;
  $('ampMax').value = p.ampMax;
  $('noiseSNR').value = p.noiseSNR || 20;
  $('layers').value = p.layers;
  $('neurons').value = p.neurons;
  $('activation').value = p.activation;
  $('mode').value = p.mode || 'fft-simulator';
  $('fftRepr').value = p.fftRepr || 'absolute';
  $('lr').value = Math.log10(p.lr);
  $('batch').value = p.batch;
  $('epochs').value = p.epochs;
  $('seed').value = p.seed;
  $('mcSamples').value = p.mcSamples;
  $('peakThresh').value = p.peakThresh;
  $('snrThresh').value = p.snrThresh;
  if (p.kWeights) {
    $('kw0').value = p.kWeights[0] || 0;
    $('kw1').value = p.kWeights[1] || 0;
    $('kw2').value = p.kWeights[2] || 0;
    if (p.kWeights[3] !== undefined) $('kw3').value = p.kWeights[3];
  }
  state.nn = null;
  updateLabels();
  updateKDistDisplay();
  updateSummary();
  doGenerate();
  $('fftReprLabel').style.display = $('mode').value === 'fft-simulator' ? '' : 'none';
}

function showExperimentDetail(idx) {
  state.sidebarExpIdx = idx;
  const exp = state.experiments[idx];
  const text = experimentToText(exp, idx);
  const acc = $('expDetailAccordion');
  acc.style.display = '';
  acc.open = true;
  $('expDetailText').textContent = text;
}

function renderExperiments() {
  $('experimentsList').innerHTML = state.experiments.map((exp, i) => {
    const p = exp.params;
    const ins = exp.insights;
    const deltaF = p.fs / p.N;
    return `
    <div class="experiment-card ${state.selectedExperiments.includes(i) ? 'selected' : ''}" data-idx="${i}">
      <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
        <input type="checkbox" class="exp-checkbox" data-idx="${i}" ${state.selectedExperiments.includes(i) ? 'checked' : ''}>
        <h4 style="margin:0; flex:1;">Exp #${i + 1} ${ins.converged ? '\u2713' : ''}</h4>
        <button class="btn-secondary exp-copy" data-idx="${i}" style="font-size:9px; padding:2px 6px;">Copy</button>
        <button class="btn-secondary exp-load" data-idx="${i}" style="font-size:9px; padding:2px 6px;">Load</button>
      </div>
      <div class="meta">${new Date(exp.timestamp).toLocaleTimeString()} | ${exp.trainedEpochs || ins.epochs}/${exp.totalEpochs || p.epochs} epochs${exp.autoStopped ? ' (auto)' : ''}</div>
      <div class="params">
        <span>${p.mode || 'fft-simulator'}${p.fftRepr === 'complex' ? '/complex' : ''}</span>
        <span>${exp.sizes.join('\u2192')}</span>
        <span>${p.activation}</span>
        <span>lr=${p.lr.toFixed(4)}</span>
      </div>
      <div class="params">
        <span>N=${p.N}</span>
        <span>fs=${p.fs}</span>
        <span>\u0394f=${deltaF.toFixed(1)}Hz</span>
        <span>SNR=${p.noiseSNR || 20}dB</span>
        <span>K\u2264${p.maxK}</span>
      </div>
      <div style="display:flex; gap:10px; margin:4px 0;">
        <div style="flex:1;">
          <div style="font-size:9px; color:#8b949e;">Loss: ${exp.finalLoss?.toFixed(4) || '-'} (best: ${ins.minLoss || '-'} @${ins.minLossEpoch || '-'})</div>
          <div style="font-size:9px; color:#8b949e;">Acc: ${ins.accuracy}% | Params: ${ins.params || '-'}</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:9px; color:#8b949e;">FLOPs FFT: ${ins.fftFlops || '-'} | NN: ${ins.nnFlops || '-'}</div>
          <div style="font-size:9px; color:#8b949e;">@10: ${ins.loss10 || '-'} @50: ${ins.loss50 || '-'}</div>
        </div>
      </div>
      <canvas id="expLoss${i}"></canvas>
      <div class="insights">
        <div>W: \u03bc=${ins.meanW} \u03c3=${ins.stdW} max=${ins.maxW || '-'}</div>
        <div>Sparsity: ${ins.sparsity}%</div>
      </div>
    </div>`;
  }).join('');

  state.experiments.forEach((exp, i) => {
    const c = $(`expLoss${i}`);
    if (c && exp.lossHistory.length) {
      c.width = 280; c.height = 30;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#161b22'; ctx.fillRect(0, 0, 280, 30);
      const d = exp.lossHistory, max = Math.max(...d), min = Math.min(...d);
      ctx.strokeStyle = '#3fb950'; ctx.lineWidth = 1; ctx.beginPath();
      d.forEach((v, j) => {
        const x = j / (d.length - 1) * 280;
        const y = 25 - ((v - min) / (max - min || 1)) * 20;
        j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  });

  // Checkbox handlers
  $('experimentsList').querySelectorAll('.exp-checkbox').forEach(cb => {
    cb.onclick = (e) => {
      e.stopPropagation();
      const idx = +cb.dataset.idx;
      if (cb.checked) {
        if (state.selectedExperiments.length >= 2) {
          const oldest = state.selectedExperiments.shift();
          const oldCb = $('experimentsList').querySelector(`.exp-checkbox[data-idx="${oldest}"]`);
          if (oldCb) oldCb.checked = false;
          const oldCard = $('experimentsList').querySelector(`.experiment-card[data-idx="${oldest}"]`);
          if (oldCard) oldCard.classList.remove('selected');
        }
        state.selectedExperiments.push(idx);
      } else {
        state.selectedExperiments = state.selectedExperiments.filter(i => i !== idx);
      }
      $('experimentsList').querySelectorAll('.experiment-card').forEach(card => {
        card.classList.toggle('selected', state.selectedExperiments.includes(+card.dataset.idx));
      });
      updateComparison();
    };
  });

  // Copy handlers
  $('experimentsList').querySelectorAll('.exp-copy').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = +btn.dataset.idx;
      const text = experimentToText(state.experiments[idx], idx);
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      });
    };
  });

  // Load handlers
  $('experimentsList').querySelectorAll('.exp-load').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = +btn.dataset.idx;
      loadExperimentParams(state.experiments[idx]);
      btn.textContent = 'Loaded';
      setTimeout(() => { btn.textContent = 'Load'; }, 1500);
    };
  });

  // Card click → detail
  $('experimentsList').querySelectorAll('.experiment-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.matches('input, button')) return;
      showExperimentDetail(+card.dataset.idx);
    });
  });
}

function updateComparison() {
  const panel = $('comparisonPanel');
  if (state.selectedExperiments.length < 2) { panel.style.display = 'none'; return; }

  panel.style.display = 'block';
  const [e1, e2] = state.selectedExperiments.map(i => state.experiments[i]);
  const i1 = state.selectedExperiments[0] + 1;
  const i2 = state.selectedExperiments[1] + 1;

  const rows = [
    ['Architecture', e1.sizes.join('\u2192'), e2.sizes.join('\u2192')],
    ['Activation', e1.params.activation, e2.params.activation],
    ['Mode', e1.params.mode || 'fft-simulator', e2.params.mode || 'fft-simulator'],
    ['Learning Rate', e1.params.lr.toFixed(4), e2.params.lr.toFixed(4)],
    ['Batch Size', e1.params.batch, e2.params.batch],
    ['\u0394f', (e1.params.fs / e1.params.N).toFixed(2) + 'Hz', (e2.params.fs / e2.params.N).toFixed(2) + 'Hz'],
    ['Noise SNR', (e1.params.noiseSNR || 20) + 'dB', (e2.params.noiseSNR || 20) + 'dB'],
    ['Epochs', e1.insights.epochs, e2.insights.epochs],
    ['Final Loss', e1.finalLoss?.toFixed(4) || '-', e2.finalLoss?.toFixed(4) || '-'],
    ['Accuracy', e1.insights.accuracy + '%', e2.insights.accuracy + '%'],
    ['Converged', e1.insights.converged ? '\u2713' : '\u2717', e2.insights.converged ? '\u2713' : '\u2717'],
  ];

  const lossDiff = (e2.finalLoss - e1.finalLoss);
  const lossDiffHtml = lossDiff > 0
    ? `<span class="diff-worse">+${lossDiff.toFixed(4)}</span>`
    : `<span class="diff-better">${lossDiff.toFixed(4)}</span>`;

  $('comparisonArea').innerHTML = `
    <table class="comparison-table">
      <thead><tr><th>Parameter</th><th>Exp #${i1}</th><th>Exp #${i2}</th></tr></thead>
      <tbody>
        ${rows.map(([name, v1, v2]) => `
          <tr>
            <td class="param-name">${name}</td>
            <td>${v1}</td>
            <td class="${String(v1) !== String(v2) ? '' : 'diff-same'}">${v2}</td>
          </tr>
        `).join('')}
        <tr>
          <td class="param-name">Loss Delta</td>
          <td colspan="2">${lossDiffHtml} (Exp #${i2} vs #${i1})</td>
        </tr>
      </tbody>
    </table>
    <div class="comparison-charts">
      <div>
        <div style="font-size:10px; color:#8b949e; margin-bottom:4px;">Exp #${i1} Loss</div>
        <canvas id="cmpLoss1"></canvas>
      </div>
      <div>
        <div style="font-size:10px; color:#8b949e; margin-bottom:4px;">Exp #${i2} Loss</div>
        <canvas id="cmpLoss2"></canvas>
      </div>
    </div>
  `;

  plotMulti($('cmpLoss1'), [{ data: e1.lossHistory, color: '#3fb950' }], { yMin: 0 });
  plotMulti($('cmpLoss2'), [{ data: e2.lossHistory, color: '#58a6ff' }], { yMin: 0 });
}

export { saveExperiment, experimentToText, loadExperimentParams, showExperimentDetail, renderExperiments, updateComparison };
