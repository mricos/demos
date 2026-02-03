// Network creation and training loop
import { $, state } from './state.js';
import { emit } from './events.js';
import { initRng } from './rng.js';
import { generateSignal, dft, idft, magPhase, computeFLOPs, EEG_BAND_NAMES, circularShift } from './dsp.js';
import { NN } from './nn.js';
import { plot, plotProbeEvolution, plotActivationHeatmap, plotClassOutput } from './plot.js';
import { createProbes } from './probes.js';
import { getParams, buildSizes, updateHeaderTraining, resetHeaderTraining, clearStale, updateInsightPanel } from './params.js';
import { updateNetworkViz } from './network-viz.js';

function prepareInput(normSignal, rawSignal, p) {
  return Array.isArray(normSignal) ? normSignal : Array.from(normSignal);
}

function makeTarget(K, p) {
  if (p.mode === 'fft-simulator') {
    const half = Math.floor(p.N / 2) + 1;
    const dim = p.fftRepr === 'complex' ? half * 2 : half;
    return new Array(dim).fill(0);
  }
  return new Array(5).fill(0);
}

function makeBandTarget(tones, p) {
  const target = new Array(5).fill(0);
  if (tones) {
    for (const tone of tones) {
      const idx = EEG_BAND_NAMES.indexOf(tone.band);
      if (idx >= 0) target[idx] = 1;
    }
  }
  return target;
}

function updateProbeViz() {
  if (!state.nn || !state.probes) return;
  const p = getParams();
  const numClasses = buildSizes(p).slice(-1)[0];
  const results = [];

  state.probes.forEach((probe, i) => {
    const input = prepareInput(probe.input, probe.rawSignal, p);
    const pred = state.nn.predict(input);
    if (!state.probeHistory[i]) state.probeHistory[i] = [];
    state.probeHistory[i].push(pred.slice());

    const predK = pred.indexOf(Math.max(...pred));
    const target = makeTarget(probe.k, p);
    const err = pred.reduce((s, v, j) => s + (v - target[j]) ** 2, 0) / pred.length;
    results.push({ error: err, predK });

    const canvas = $(`cProbe${i}`);
    if (canvas) plotProbeEvolution(canvas, probe, state.probeHistory[i], numClasses);
  });

  state.appState.probeResults = results;

  const heatmapData = state.probes.map(probe => {
    const input = prepareInput(probe.input, probe.rawSignal, p);
    return { label: probe.label, activations: state.nn.getActivations(input) };
  });
  const hCanvas = $('cActivationHeatmap');
  if (hCanvas) plotActivationHeatmap(hCanvas, heatmapData);
}

function createNetwork() {
  const p = getParams();
  initRng(p.seed);
  const sizes = buildSizes(p);
  const outAct = 'linear';
  state.nn = new NN(sizes, p.activation, outAct);
  state.lossHistory = [];
  state.accHistory = [];
  state.networkSnapshots = [state.nn.clone()];
  state.currentEpoch = 0;
  state.probes = createProbes(p);
  state.probeHistory = [];
  state.kDistTracker = new Array(p.maxK + 1).fill(0);
  state.autoStopState = { smoothedLoss: null, prevSmoothed: null, plateauCount: 0 };

  const probeGrid = $('probeGrid');
  if (probeGrid) {
    probeGrid.innerHTML = '';
    state.probes.forEach((probe, i) => {
      const cell = document.createElement('div');
      cell.className = 'probe-cell';
      const canvas = document.createElement('canvas');
      canvas.id = `cProbe${i}`;
      cell.appendChild(canvas);
      probeGrid.appendChild(cell);
    });
  }

  $('epochSlider').max = 0; $('epochSlider').value = 0; $('epochNum').textContent = 0;
  $('statParams').textContent = state.nn.countParams();

  const flops = computeFLOPs({ N: p.N, sizes });
  $('statFLOPs').textContent = `${flops.fftFlops}/${flops.nnFlops}`;
  clearStale();
}

function resetWeights() {
  if (state.trainingState === 'running') return;
  state.trainingState = 'idle';
  createNetwork();
  resetHeaderTraining();
  updateNetworkViz(0);
}

function stopTrain() {
  if (state.trainingState === 'running') {
    state.trainingState = 'idle';
    emit('training:state', 'idle');
  }
}

async function doTrain() {
  if (state.trainingState === 'running') {
    // Queuing: extend the target, return immediately
    state.targetEpochs += getParams().epochs;
    return;
  }

  // Create network only if none exists (Reset is the only way to start fresh)
  if (!state.nn) createNetwork();

  state.trainingState = 'running';
  emit('training:state', 'running');
  clearStale();
  state.appState.autoStopped = false;

  const p = getParams();
  state.targetEpochs = state.currentEpoch + p.epochs;
  state.appState.mode = p.mode;

  const startTime = Date.now();
  const emaAlpha = 0.1;
  const plateauThreshold = 0.00005;
  const plateauPatience = 30;
  let autoStopped = false;

  while (state.trainingState === 'running' && state.currentEpoch < state.targetEpochs) {
    // Re-read hot params each epoch
    const p = getParams();

    const vizInterval = state.targetEpochs > 200 ? 5 : state.targetEpochs > 50 ? 2 : 1;
    const inputs = [], targets = [];
    let epochCorrect = 0;

    for (let b = 0; b < p.batch; b++) {
      const meta = generateSignal(p, true);
      const x = meta.x;
      const K = meta.K;
      const maxIn = Math.max(...x.map(Math.abs)) || 1;
      const normX = Array.from(x).map(v => v / maxIn);
      const input = prepareInput(normX, x, p);
      inputs.push(input);

      let target;
      if (p.mode === 'fft-simulator') {
        const { re, im } = dft(x);
        if (p.fftRepr === 'complex') {
          const h = Math.floor(x.length / 2) + 1;
          const maxVal = Math.max(...Array.from(re).slice(0, h).map(Math.abs), ...Array.from(im).slice(0, h).map(Math.abs)) || 1;
          target = [];
          for (let k = 0; k < h; k++) target.push(re[k] / maxVal);
          for (let k = 0; k < h; k++) target.push(im[k] / maxVal);
        } else {
          const { mag } = magPhase(re, im, true);
          target = Array.from(mag);
        }
      } else {
        target = makeBandTarget(meta.tones, p);
      }
      targets.push(target);
      if (K <= p.maxK) state.kDistTracker[K]++;

      // Phase-shift augmentation
      if (p.phaseShifts > 0) {
        for (let si = 0; si < p.phaseShifts; si++) {
          const d = Math.floor(p.N / Math.pow(2, si + 1));
          if (d === 0) break;
          const shifted = circularShift(x, d);
          const maxS = Math.max(...Array.from(shifted).map(Math.abs)) || 1;
          const normS = Array.from(shifted).map(v => v / maxS);
          const sInput = prepareInput(normS, shifted, p);
          inputs.push(sInput);

          let sTarget;
          if (p.mode === 'fft-simulator') {
            const { re: sre, im: sim } = dft(shifted);
            if (p.fftRepr === 'complex') {
              const h = Math.floor(shifted.length / 2) + 1;
              const maxVal = Math.max(...Array.from(sre).slice(0, h).map(Math.abs), ...Array.from(sim).slice(0, h).map(Math.abs)) || 1;
              sTarget = [];
              for (let k = 0; k < h; k++) sTarget.push(sre[k] / maxVal);
              for (let k = 0; k < h; k++) sTarget.push(sim[k] / maxVal);
            } else {
              const { mag } = magPhase(sre, sim, true);
              sTarget = Array.from(mag);
            }
          } else {
            sTarget = makeBandTarget(meta.tones, p);
          }
          targets.push(sTarget);
        }
      }
    }

    // Scale learning rate by augmentation factor to keep effective step size constant
    const augFactor = inputs.length / p.batch;
    const loss = state.nn.train(inputs, targets, p.lr / augFactor);

    if (p.mode === 'band-detector') {
      for (let b = 0; b < p.batch; b++) {
        const pred = state.nn.predict(inputs[b]);
        let correct = 0;
        for (let j = 0; j < pred.length; j++) {
          if ((pred[j] >= 0.5 ? 1 : 0) === targets[b][j]) correct++;
        }
        epochCorrect += correct / pred.length;
      }
    } else {
      for (let b = 0; b < p.batch; b++) {
        const pred = state.nn.predict(inputs[b]);
        const t = targets[b];
        const meanP = pred.reduce((a,v) => a+v, 0) / pred.length;
        const meanT = t.reduce((a,v) => a+v, 0) / t.length;
        let num = 0, denP = 0, denT = 0;
        for (let j = 0; j < pred.length; j++) {
          num += (pred[j]-meanP)*(t[j]-meanT);
          denP += (pred[j]-meanP)**2;
          denT += (t[j]-meanT)**2;
        }
        const corr = (denP > 0 && denT > 0) ? num / Math.sqrt(denP*denT) : 0;
        epochCorrect += Math.max(0, corr);
      }
    }
    const acc = epochCorrect / p.batch;

    state.lossHistory.push(loss);
    state.accHistory.push(acc);
    state.networkSnapshots.push(state.nn.clone());
    state.currentEpoch++;
    emit('epoch', { epoch: state.currentEpoch, loss, acc });

    // Auto-stop EMA (persists across pause/resume)
    const as = state.autoStopState;
    if (as.smoothedLoss === null) {
      as.smoothedLoss = loss;
    } else {
      as.smoothedLoss = emaAlpha * loss + (1 - emaAlpha) * as.smoothedLoss;
    }

    if (as.prevSmoothed !== null && state.currentEpoch > 20) {
      const improvement = (as.prevSmoothed - as.smoothedLoss) / (as.prevSmoothed || 1);
      if (improvement < plateauThreshold) as.plateauCount++;
      else as.plateauCount = 0;
      if (as.plateauCount >= plateauPatience) { autoStopped = true; break; }
    }
    as.prevSmoothed = as.smoothedLoss;

    $('epochSlider').max = state.currentEpoch;
    $('epochSlider').value = state.currentEpoch;
    $('epochNum').textContent = state.currentEpoch;
    updateHeaderTraining(state.currentEpoch, state.targetEpochs, loss);

    if (state.currentEpoch % vizInterval === 0 || state.currentEpoch >= state.targetEpochs || autoStopped) {
      plot($('cLoss'), state.lossHistory, { color: '#3fb950', yMin: 0 });
      plot($('cAccuracy'), state.accHistory, { color: '#58a6ff', yMin: 0, yMax: 1 });

      if (state.signal) {
        const maxIn = Math.max(...state.signal.map(Math.abs)) || 1;
        const normX = Array.from(state.signal).map(v => v / maxIn);
        const input = prepareInput(normX, state.signal, p);
        const pred = state.nn.predict(input);
        let labels;
        if (p.mode === 'band-detector') {
          labels = ['B1 \u03b4','B2 \u03b8','B3 \u03b1','B4 \u03b2','B5 \u03b3'];
        } else if (p.fftRepr === 'complex') {
          const h = Math.floor(p.N / 2) + 1;
          labels = pred.map((_, i) => i < h ? `Re${i}` : `Im${i - h}`);
        } else {
          labels = pred.map((_, i) => `${i}`);
        }
        plotClassOutput($('cClassOutput'), pred, p.mode === 'band-detector' ? -1 : state.signalMeta.K, labels);

        if (p.mode === 'band-detector') {
          const detected = pred.map((v, i) => v >= 0.5 ? labels[i] : null).filter(Boolean);
          $('classInfo').textContent = `Detected bands: ${detected.join(', ') || 'none'} | [${pred.map(v => v.toFixed(3)).join(', ')}]`;
        } else {
          $('classInfo').textContent = `Output: [${pred.map(v => v.toFixed(3)).join(', ')}] (${pred.length} bins)`;
        }

        // Reconstruction panel (complex mode only)
        const reconPanel = $('reconPanel');
        if (p.mode === 'fft-simulator' && p.fftRepr === 'complex' && reconPanel) {
          reconPanel.style.display = '';
          const h = Math.floor(p.N / 2) + 1;
          const predRe = new Float64Array(p.N);
          const predIm = new Float64Array(p.N);
          // Fill first half+1 bins from prediction
          for (let k = 0; k < h; k++) {
            predRe[k] = pred[k];
            predIm[k] = pred[h + k];
          }
          // Mirror conjugate for full spectrum
          for (let k = 1; k < p.N - h + 1; k++) {
            predRe[p.N - k] = predRe[k];
            predIm[p.N - k] = -predIm[k];
          }
          const recovered = idft(predRe, predIm);
          // Denormalize: pred was normalized by maxVal of DFT, and input was normalized by maxIn
          // For overlay comparison, normalize both to [-1,1]
          const maxOrig = Math.max(...Array.from(state.signal).map(Math.abs)) || 1;
          const origNorm = Array.from(state.signal).map(v => v / maxOrig);
          const maxRec = Math.max(...Array.from(recovered).map(Math.abs)) || 1;
          const recNorm = Array.from(recovered).map(v => v / maxRec);
          // Plot overlay
          const cRecon = $('cReconstruction');
          if (cRecon) {
            const ctx = cRecon.getContext('2d');
            cRecon.width = cRecon.clientWidth * (window.devicePixelRatio || 1);
            cRecon.height = cRecon.clientHeight * (window.devicePixelRatio || 1);
            ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
            const w = cRecon.clientWidth, ht = cRecon.clientHeight;
            ctx.clearRect(0, 0, w, ht);
            ctx.fillStyle = '#0d1117';
            ctx.fillRect(0, 0, w, ht);
            const drawLine = (data, color) => {
              ctx.strokeStyle = color;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              for (let i = 0; i < data.length; i++) {
                const px = i / (data.length - 1) * w;
                const py = ht / 2 - data[i] * (ht / 2 - 4);
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
              }
              ctx.stroke();
            };
            drawLine(origNorm, '#3fb950');
            drawLine(recNorm, '#f0883e');
          }
          // MSE
          let mse = 0;
          for (let i = 0; i < origNorm.length; i++) mse += (origNorm[i] - recNorm[i]) ** 2;
          mse /= origNorm.length;
          const reconInfo = $('reconInfo');
          if (reconInfo) reconInfo.textContent = `Reconstruction MSE: ${mse.toFixed(6)}`;
        } else if (reconPanel) {
          reconPanel.style.display = 'none';
        }

        const { re, im } = dft(state.signal);
        const { mag: trueMag } = magPhase(re, im, true);
        plot($('cPredMag'), Array.from(trueMag), { color: '#3fb950', yMin: 0, yMax: 1 });
      }

      updateProbeViz();

      state.appState.epoch = state.currentEpoch;
      state.appState.totalEpochs = state.targetEpochs;
      state.appState.loss = loss;
      state.appState.training = true;
      state.appState.autoStopped = autoStopped;
      updateInsightPanel();

      $('statEpoch').textContent = state.currentEpoch;
      $('statLoss').textContent = loss.toFixed(4);
      $('statAcc').textContent = p.mode === 'fft-simulator' ? `r=${acc.toFixed(2)}` : (acc * 100).toFixed(0) + '%';
      $('statTime').textContent = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
      $('statConv').textContent = acc > 0.95 ? '\u2713' : acc > 0.7 ? '~' : '\u2717';

      updateNetworkViz(state.currentEpoch);
      await new Promise(r => setTimeout(r, 0));
    }
  }

  // Reached epoch limit, auto-stopped, or user stopped
  state.trainingState = 'idle';
  emit('training:state', 'idle');
  const finalLoss = state.lossHistory[state.lossHistory.length - 1];
  $('hdrLoss').textContent = finalLoss?.toFixed(4) || '-';
  $('hdrProgress').style.width = '100%';

  state.appState.training = false;
  state.appState.autoStopped = autoStopped;
  updateInsightPanel();

  if (autoStopped) {
    $('statConv').innerHTML = '<span class="auto-stop-badge">auto-stop</span>';
    $('hdrEpoch').textContent = `${state.currentEpoch}/${state.targetEpochs} (auto)`;
  }
}

export { prepareInput, makeTarget, makeBandTarget, updateProbeViz, createNetwork, resetWeights, doTrain, stopTrain };
