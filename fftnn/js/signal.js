// Signal generation and batch management
import { $, state } from './state.js';
import { initRng } from './rng.js';
import { generateSignal, dft, magPhase } from './dsp.js';
import { plot, plotMulti, plotEnsemble } from './plot.js';
import { getParams, updateDftResolution, updateInsightPanel } from './params.js';

function generateBatch(p, count = 8) {
  const signals = [], metas = [], specs = [];
  for (let i = 0; i < count; i++) {
    const meta = generateSignal(p, true);
    const m = Math.max(...meta.x.map(Math.abs)) || 1;
    const norm = Array.from(meta.x).map(v => v / m);
    signals.push(norm);
    metas.push(meta);
    const { re, im } = dft(meta.x);
    specs.push(Array.from(magPhase(re, im, true).mag));
  }
  return { signals, metas, specs };
}

function renderBatchGrid(batch) {
  const grid = $('batchGrid');
  grid.innerHTML = '';
  batch.signals.forEach((sig, i) => {
    const meta = batch.metas[i];
    const cell = document.createElement('div');
    cell.className = 'ensemble-cell';
    const canvas = document.createElement('canvas');
    const label = document.createElement('div');
    label.className = 'ensemble-label';
    const bandInfo = meta.tones ? meta.tones.map(t => t.band).join(',') : '';
    label.textContent = `K=${meta.K} [${meta.freqs.map(f => f.toFixed(0)).join(',')}]Hz ${bandInfo}`;
    cell.appendChild(canvas);
    cell.appendChild(label);
    grid.appendChild(cell);
    requestAnimationFrame(() => plot(canvas, sig, { color: '#58a6ff' }));
  });
}

function updateBatchNav() {
  $('batchNum').textContent = state.currentBatchIdx + 1;
  $('batchTotal').textContent = state.batches.length;
}

function doGenerate() {
  const p = getParams();
  initRng(p.seed);
  const meta = generateSignal(p, true);
  state.signal = meta.x;
  state.signalMeta = meta;
  state.appState.currentK = meta.K;
  updateInsightPanel();

  const maxAbs = Math.max(...state.signal.map(Math.abs)) || 1;
  plot($('cSignal'), Array.from(state.signal).map(v => v / maxAbs), { color: '#58a6ff' });

  const deltaF = p.fs / p.N;
  const bandStr = meta.tones ? meta.tones.map(t => `${t.freq.toFixed(1)}Hz(${t.band})`).join(', ') : meta.freqs.map(f => f.toFixed(1) + 'Hz').join(', ');
  $('signalInfo').textContent = `K=${meta.K}, tones=[${bandStr}], amps=[${meta.amps.map(a => a.toFixed(2)).join(', ')}], \u0394f=${deltaF.toFixed(2)}Hz`;

  const { re, im } = dft(state.signal);
  const { mag, phase } = magPhase(re, im, true);
  plotMulti($('cTarget'), [
    { data: Array.from(mag), color: '#3fb950' },
    { data: Array.from(phase).map(p => p / Math.PI), color: '#58a6ff' }
  ], { yMin: -1, yMax: 1 });

  const batch = generateBatch(p, p.batch);
  state.batches = [batch];
  state.currentBatchIdx = 0;

  plotEnsemble($('cEnsemble'), batch.signals, { color: '#58a6ff', meanColor: '#3fb950' });
  plotEnsemble($('cEnsembleSpec'), batch.specs, { color: '#f0883e', meanColor: '#3fb950' });

  renderBatchGrid(batch);
  updateBatchNav();
  updateDftResolution();
}

export { generateBatch, renderBatchGrid, updateBatchNav, doGenerate };
