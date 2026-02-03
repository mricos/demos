// Main application - event wiring and initialization
import { $, state } from './state.js';
import { on } from './events.js';
import { plot, plotEnsemble, plotProbeEvolution } from './plot.js';
import { getParams, buildSizes, updateLabels, updateSummary, updateKDistDisplay, updateInsightPanel, updateDocPanel, markStale, setFrozenParamsDisabled } from './params.js';
import { doGenerate, generateBatch, renderBatchGrid, updateBatchNav } from './signal.js';
import { doTrain, resetWeights, createNetwork, updateProbeViz, stopTrain } from './train.js';
import { updateNetworkViz } from './network-viz.js';
import { runDetector, applyTestFilter, showTestResult, testLogToText } from './detector.js';
import { saveExperiment, experimentToText, loadExperimentParams, renderExperiments } from './experiments.js';

// ── Resize handling ──
function redrawActiveTab() {
  const activeTab = document.querySelector('.tab.active')?.dataset.tab;
  if (activeTab === 'signal') doGenerate();
  else if (activeTab === 'training' && state.lossHistory.length) {
    plot($('cLoss'), state.lossHistory, { color: '#3fb950', yMin: 0 });
    plot($('cAccuracy'), state.accHistory, { color: '#58a6ff', yMin: 0, yMax: 1 });
  }
  else if (activeTab === 'network' && state.nn) updateNetworkViz(state.currentEpoch);
}

let resizeTimeout;
const resizeObserver = new ResizeObserver(() => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(redrawActiveTab, 150);
});

// ── Init ──
function updateTrainButtons() {
  const s = state.trainingState;
  const indicator = $('trainStateIndicator');
  if (s === 'idle') {
    $('btnTrain').disabled = false;
    $('btnTrain').textContent = '\u25b6 Train';
    $('btnStop').disabled = true;
    $('btnReset').disabled = false;
    setFrozenParamsDisabled(false);
    if (indicator) indicator.textContent = '';
  } else if (s === 'running') {
    $('btnTrain').disabled = false;
    $('btnTrain').textContent = '\u25b6 +Batch';
    $('btnStop').disabled = false;
    $('btnReset').disabled = true;
    setFrozenParamsDisabled(true);
    if (indicator) indicator.textContent = 'training...';
  }
}

// React to training state changes via event bus (replaces polling)
on('training:state', updateTrainButtons);

function initApp() {
  $('btnTrain').onclick = doTrain;
  $('btnStop').onclick = stopTrain;
  $('btnReset').onclick = resetWeights;
  $('btnSave').onclick = saveExperiment;
  $('btnDetector').onclick = runDetector;

  // Test browser navigation
  $('btnPrevTest').onclick = () => { if (state.filteredTests.length) showTestResult(state.currentTestIdx - 1); };
  $('btnNextTest').onclick = () => { if (state.filteredTests.length) showTestResult(state.currentTestIdx + 1); };
  $('testFilter').onchange = () => { if (state.testResults.length) applyTestFilter(); };
  $('btnCopyTestLog').onclick = () => {
    navigator.clipboard.writeText(testLogToText()).then(() => {
      $('btnCopyTestLog').textContent = 'Copied';
      setTimeout(() => { $('btnCopyTestLog').textContent = 'Copy All'; }, 1500);
    });
  };

  // Sidebar experiment detail buttons
  $('expDetailCopy').onclick = () => {
    if (state.sidebarExpIdx === null) return;
    const text = experimentToText(state.experiments[state.sidebarExpIdx], state.sidebarExpIdx);
    navigator.clipboard.writeText(text).then(() => {
      $('expDetailCopy').textContent = 'Copied';
      setTimeout(() => { $('expDetailCopy').textContent = 'Copy'; }, 1500);
    });
  };
  $('expDetailLoad').onclick = () => {
    if (state.sidebarExpIdx === null) return;
    loadExperimentParams(state.experiments[state.sidebarExpIdx]);
    $('expDetailLoad').textContent = 'Loaded';
    setTimeout(() => { $('expDetailLoad').textContent = 'Load Settings'; }, 1500);
  };

  // Batch navigator
  $('btnPrevBatch').onclick = () => {
    if (state.currentBatchIdx > 0) {
      state.currentBatchIdx--;
      const batch = state.batches[state.currentBatchIdx];
      renderBatchGrid(batch);
      plotEnsemble($('cEnsemble'), batch.signals, { color: '#58a6ff', meanColor: '#3fb950' });
      plotEnsemble($('cEnsembleSpec'), batch.specs, { color: '#f0883e', meanColor: '#3fb950' });
      updateBatchNav();
    }
  };
  $('btnNextBatch').onclick = () => {
    if (state.currentBatchIdx < state.batches.length - 1) {
      state.currentBatchIdx++;
      const batch = state.batches[state.currentBatchIdx];
      renderBatchGrid(batch);
      plotEnsemble($('cEnsemble'), batch.signals, { color: '#58a6ff', meanColor: '#3fb950' });
      plotEnsemble($('cEnsembleSpec'), batch.specs, { color: '#f0883e', meanColor: '#3fb950' });
      updateBatchNav();
    }
  };
  $('btnNewBatch').onclick = () => {
    const p = getParams();
    const batch = generateBatch(p, p.batch);
    state.batches.push(batch);
    state.currentBatchIdx = state.batches.length - 1;
    renderBatchGrid(batch);
    plotEnsemble($('cEnsemble'), batch.signals, { color: '#58a6ff', meanColor: '#3fb950' });
    plotEnsemble($('cEnsembleSpec'), batch.specs, { color: '#f0883e', meanColor: '#3fb950' });
    updateBatchNav();
  };

  // Range labels
  ['ampMin', 'ampMax', 'noiseSNR', 'lr', 'peakThresh'].forEach(id => $(id).oninput = updateLabels);
  $('snrThresh').oninput = updateLabels;

  // K-distribution sliders
  ['kw0', 'kw1', 'kw2', 'kw3'].forEach(id => {
    const el = $(id);
    if (el) el.oninput = () => {
      updateKDistDisplay();
      doGenerate();
      if (state.nn) markStale();
    };
  });

  // Insight panel toggle
  $('btnToggleInsight').onclick = () => { $('insightPanel').classList.toggle('collapsed'); };
  $('btnToggleDoc').onclick = () => { $('docPanel').classList.toggle('hidden'); };

  // Probe zoom modal
  const zoomModal = $('probeZoomModal');
  if (zoomModal) {
    zoomModal.onclick = () => { zoomModal.style.display = 'none'; };

    // Delegate click on probe grid cells
    const probeGrid = $('probeGrid');
    if (probeGrid) {
      probeGrid.addEventListener('click', (e) => {
        const cell = e.target.closest('.probe-cell');
        if (!cell) return;
        const canvas = cell.querySelector('canvas');
        if (!canvas) return;
        const idMatch = canvas.id.match(/cProbe(\d+)/);
        if (!idMatch) return;
        const idx = +idMatch[1];
        if (!state.probes || !state.probes[idx] || !state.probeHistory[idx]?.length) return;

        const probe = state.probes[idx];
        const p = getParams();
        const numClasses = buildSizes(p);
        const outDim = numClasses[numClasses.length - 1];

        // Title and info
        $('probeZoomTitle').textContent = `Probe: ${probe.label}`;
        const latest = state.probeHistory[idx][state.probeHistory[idx].length - 1];
        const predK = latest.indexOf(Math.max(...latest));
        const correct = predK === probe.k;
        const epochs = state.probeHistory[idx].length;
        const predLabel = probe.isBandProbe ? `B${predK + 1}` : `out[${predK}]`;
        const trueLabel = probe.isBandProbe ? `B${probe.k + 1}` : `${probe.k} tones`;
        let info = `Epochs tracked: ${epochs} | True: ${trueLabel} | Predicted: ${predLabel} ${correct ? '(correct)' : '(wrong)'}`;
        if (probe.bands?.length) info += ` | Bands: ${probe.bands.join(', ')}`;
        info += `\nEach line is one output neuron's activation over training. The bold line corresponds to the correct output. `;
        info += `If this probe shows convergence (bold line rising, others falling), the network has learned to recognize this signal pattern.`;
        $('probeZoomInfo').textContent = info;

        // Show modal first so canvas parent has layout width, then render
        zoomModal.style.display = 'flex';
        requestAnimationFrame(() => {
          plotProbeEvolution($('cProbeZoom'), probe, state.probeHistory[idx], outDim);
        });
      });
    }
  }

  // Signal params: auto-regenerate preview, recreate network (N changes dimensions)
  ['N', 'fs', 'maxK', 'freqMin', 'freqMax', 'freqSep'].forEach(id => {
    $(id).onchange = () => {
      if (state.trainingState !== 'idle') return; // frozen during training
      createNetwork();
      updateKDistDisplay();
      updateSummary();
      doGenerate();
      updateNetworkViz(0);
    };
  });

  // Signal range params: also regenerate
  ['ampMin', 'ampMax', 'noiseSNR'].forEach(id => {
    const orig = $(id).oninput;
    $(id).oninput = function() {
      if (orig) orig.call(this);
      doGenerate();
      if (state.nn) markStale();
    };
  });

  // Architecture params: recreate network immediately so Network tab always shows current arch
  ['layers', 'neurons', 'activation', 'mode', 'fftRepr'].forEach(id => {
    $(id).onchange = () => {
      if (state.trainingState !== 'idle') return; // frozen during training
      createNetwork();
      updateSummary();
      updateFftReprVisibility();
      updateNetworkViz(0);
    };
  });

  function updateFftReprVisibility() {
    const show = $('mode').value === 'fft-simulator';
    $('fftReprLabel').style.display = show ? '' : 'none';
  }
  updateFftReprVisibility();

  // Training params
  ['batch', 'epochs', 'seed'].forEach(id => {
    $(id).onchange = updateSummary;
  });

  $('epochSlider').oninput = function() {
    $('epochNum').textContent = this.value;
    updateNetworkViz(+this.value);
  };

  $('btnPlayEpochs').onclick = function() {
    if (state.playInterval) {
      clearInterval(state.playInterval); state.playInterval = null;
      this.textContent = '\u25b6';
    } else {
      this.textContent = '\u25a0';
      let e = 0;
      state.playInterval = setInterval(() => {
        if (e >= state.networkSnapshots.length) {
          clearInterval(state.playInterval); state.playInterval = null;
          $('btnPlayEpochs').textContent = '\u25b6';
          return;
        }
        $('epochSlider').value = e;
        $('epochNum').textContent = e;
        updateNetworkViz(e++);
      }, 80);
    }
  };

  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      $('tab-' + tab.dataset.tab).classList.add('active');
      state.appState.tab = tab.dataset.tab;
      updateDocPanel(tab.dataset.tab);
      updateInsightPanel();
      if (tab.dataset.tab === 'network' && state.nn) { updateNetworkViz(state.currentEpoch); updateProbeViz(); }
      if (tab.dataset.tab === 'experiments') renderExperiments();
      requestAnimationFrame(redrawActiveTab);
    };
  });

  const mainEl = document.querySelector('.main');
  if (mainEl) resizeObserver.observe(mainEl);

  updateLabels();
  updateKDistDisplay();
  doGenerate();

  // Create initial network so Network tab shows architecture immediately
  if (!state.nn) {
    createNetwork();
    updateNetworkViz(0);
  }

  // Doc panel resize drag handle
  const docPanel = $('docPanel');
  const docDragHandle = $('docDragHandle');
  if (docDragHandle && docPanel) {
    let dragging = false;
    let startX = 0;
    let startW = 0;
    docDragHandle.addEventListener('mousedown', (e) => {
      dragging = true;
      startX = e.clientX;
      startW = docPanel.offsetWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const newW = Math.max(180, Math.min(800, startW + (startX - e.clientX)));
      docPanel.style.width = newW + 'px';
      // Scale font: 10px at 180px, 24px at 800px
      const fontSize = 10 + (newW - 180) / (800 - 180) * 14;
      $('docBody').style.fontSize = fontSize + 'px';
    });
    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

window.addEventListener('TERRAIN_READY', initApp);
