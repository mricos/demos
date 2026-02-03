// Parameter reading, UI labels, summary display
import { $, state } from './state.js';
import { computeFLOPs } from './dsp.js';
import { getCommentary } from './commentary.js';

function getKWeights() {
  const maxK = +$('maxK').value;
  const weights = [+$('kw0').value, +$('kw1').value, +$('kw2').value];
  if (maxK >= 3) weights.push(+$('kw3').value);
  return weights;
}

function getParams() {
  return {
    N: +$('N').value, fs: +$('fs').value, maxK: +$('maxK').value,
    freqMin: +$('freqMin').value, freqMax: +$('freqMax').value, freqSep: +$('freqSep').value,
    ampMin: +$('ampMin').value, ampMax: +$('ampMax').value,
    noiseSNR: +$('noiseSNR').value,
    sigma: Math.pow(10, -(+$('noiseSNR').value) / 20),
    layers: +$('layers').value, neurons: +$('neurons').value,
    activation: $('activation').value,
    mode: $('mode').value,
    fftRepr: $('fftRepr').value,
    lr: Math.pow(10, +$('lr').value), batch: +$('batch').value, epochs: +$('epochs').value,
    mcSamples: +$('mcSamples').value, peakThresh: +$('peakThresh').value,
    snrThresh: +$('snrThresh').value,
    seed: +$('seed').value,
    kWeights: getKWeights(),
    phaseShifts: +$('phaseShifts').value,
  };
}

function buildSizes(p) {
  const half = Math.floor(p.N / 2) + 1;
  const inputDim = p.N;
  let outputDim;
  if (p.mode === 'fft-simulator') {
    outputDim = p.fftRepr === 'complex' ? half * 2 : half;
  } else {
    outputDim = 5;
  }
  const sizes = [inputDim];
  for (let i = 0; i < p.layers; i++) sizes.push(p.neurons);
  sizes.push(outputDim);
  return sizes;
}

function updateLabels() {
  $('ampMinV').textContent = (+$('ampMin').value).toFixed(1);
  $('ampMaxV').textContent = (+$('ampMax').value).toFixed(1);
  const snrVal = +$('noiseSNR').value;
  const sigmaVal = Math.pow(10, -snrVal / 20);
  $('noiseSNRV').textContent = `${snrVal}dB (\u03c3=${sigmaVal.toFixed(sigmaVal < 0.01 ? 4 : 2)})`;
  $('lrV').textContent = Math.pow(10, +$('lr').value).toFixed(4);
  $('peakThreshV').textContent = (+$('peakThresh').value).toFixed(2);
  $('snrThreshV').textContent = $('snrThresh').value;
  updateSummary();
}

function updateSummary() {
  const p = getParams();
  const sizes = buildSizes(p);
  const deltaF = p.fs / p.N;
  $('summary').innerHTML = `
    <div><span class="k">Arch</span><span class="v">${sizes.join('\u2192')}</span></div>
    <div><span class="k">&Delta;f</span><span class="v">${deltaF.toFixed(2)}Hz (fs=${p.fs}, N=${p.N})</span></div>
    <div><span class="k">Freq</span><span class="v">${p.freqMin}-${p.freqMax}Hz, \u0394\u2265${p.freqSep}</span></div>
    <div><span class="k">Train</span><span class="v">lr=${p.lr.toFixed(4)}, ${p.batch}\u00d7${p.epochs}</span></div>
    <div><span class="k">Mode</span><span class="v">${p.mode}</span></div>
    <div><span class="k">Dims</span><span class="v">in=${sizes[0]} out=${sizes[sizes.length-1]}</span></div>
  `;
  updateHeaderStats();
  updateDftResolution();
}

function updateHeaderStats() {
  const p = getParams();
  const sizes = buildSizes(p);
  $('hdrArch').textContent = sizes.join('\u2192');
}

function updateHeaderTraining(epoch, totalEpochs, loss) {
  $('hdrEpoch').textContent = `${epoch}/${totalEpochs}`;
  $('hdrLoss').textContent = loss.toFixed(4);
  $('hdrProgress').style.width = (epoch / totalEpochs * 100) + '%';
}

function resetHeaderTraining() {
  $('hdrEpoch').textContent = '-';
  $('hdrLoss').textContent = '-';
  $('hdrProgress').style.width = '0%';
}

function updateDftResolution() {
  const p = getParams();
  const deltaF = p.fs / p.N;
  const nyquist = p.fs / 2;
  const numBins = Math.floor(p.N / 2) + 1;
  const canResolve2 = p.freqSep >= deltaF * 2;
  $('dftResInfo').innerHTML = `
    <div class="dft-res-item">
      <div class="res-val">${deltaF.toFixed(2)} Hz</div>
      <div class="res-lbl">&Delta;f = fs/N = ${p.fs}/${p.N}</div>
    </div>
    <div class="dft-res-item">
      <div class="res-val">${nyquist} Hz</div>
      <div class="res-lbl">Nyquist = fs/2</div>
    </div>
    <div class="dft-res-item">
      <div class="res-val">${numBins}</div>
      <div class="res-lbl">Freq bins (N/2+1)</div>
    </div>
    <div class="dft-res-item ${canResolve2 ? '' : 'res-warn'}">
      <div class="res-val">${canResolve2 ? 'Yes' : 'No'}</div>
      <div class="res-lbl">Can resolve 2 tones? (sep ${p.freqSep}Hz &ge; 2&Delta;f=${(deltaF*2).toFixed(1)}Hz)</div>
    </div>
    <div class="dft-res-item">
      <div class="res-val">${p.freqMin}-${p.freqMax} Hz</div>
      <div class="res-lbl">Signal freq range (EEG bands)</div>
    </div>
    <div class="dft-res-item">
      <div class="res-val">${(p.N / p.fs * 1000).toFixed(1)} ms</div>
      <div class="res-lbl">Window duration (N/fs)</div>
    </div>
  `;
}

function updateKDistDisplay() {
  const maxK = +$('maxK').value;
  const kw3Label = $('kw3Label');
  if (kw3Label) kw3Label.style.display = maxK >= 3 ? '' : 'none';
  const weights = getKWeights();
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const pcts = weights.map(w => Math.round(w / total * 100));
  $('kw0V').textContent = pcts[0] + '%';
  $('kw1V').textContent = pcts[1] + '%';
  $('kw2V').textContent = pcts[2] + '%';
  if (maxK >= 3) $('kw3V').textContent = pcts[3] + '%';
  const colors = ['k0', 'k1', 'k2', 'k3'];
  let barHtml = '';
  for (let i = 0; i <= Math.min(maxK, 3); i++) {
    barHtml += `<span class="${colors[i]}" style="width:${pcts[i]}%"></span>`;
  }
  $('kDistBar').innerHTML = barHtml;
}

function updateInsightPanel() {
  const body = $('insightBody');
  if (body) {
    const text = getCommentary(state.appState);
    if (text) body.textContent = text;
  }
}

function updateDocPanel(tabName) {
  document.querySelectorAll('.doc-section').forEach(s => s.classList.remove('active'));
  const map = { signal: 'docSignal', training: 'docTraining', network: 'docNetwork', detector: 'docDetector', experiments: 'docExperiments', theory: 'docTheory' };
  const el = $(map[tabName]);
  if (el) el.classList.add('active');
}

function setFrozenParamsDisabled(disabled) {
  ['N', 'mode', 'fftRepr', 'neurons', 'layers', 'activation'].forEach(id => {
    const el = $(id);
    if (el) el.disabled = disabled;
  });
}

function markStale() {
  if (state.nn && state.trainingState === 'idle') {
    state.networkStale = true;
    $('staleBadge').hidden = false;
  }
}

function clearStale() {
  state.networkStale = false;
  $('staleBadge').hidden = true;
}

export {
  getParams, buildSizes, getKWeights,
  updateLabels, updateSummary, updateHeaderStats, updateHeaderTraining, resetHeaderTraining,
  updateDftResolution, updateKDistDisplay, updateInsightPanel, updateDocPanel,
  markStale, clearStale, setFrozenParamsDisabled
};
