// Data-driven commentary keyed by app state

const commentary = {
  // Signal tab
  "signal.input.K0": "K=0: pure noise, no tonal content. The DFT spectrum is flat. The NN must learn this means 'silence'.",
  "signal.input.K1": "K=1: one sinusoidal tone embedded in noise. One peak in the spectrum. Can the NN find it?",
  "signal.input.K2": "K=2: two tones. The DFT must resolve them (need separation >= 2\u0394f). Hardest case for 2-tone classification.",
  "signal.input.K3": "K=3: three tones from potentially different EEG bands. Most complex signal - tests multi-band discrimination.",
  "signal.ensemble": "The ensemble view shows the distribution of training data.",
  "signal.kDistribution": "Controlling K distribution affects what the network prioritizes learning.",

  // Training tab - epoch-aware
  "training.loss.early": "Loss is high. The output neurons produce near-random values. Accuracy ~random guessing.",
  "training.loss.mid": "Loss is dropping. Backprop is adjusting weights: each sample's gradient pushes the correct output neuron higher.",
  "training.loss.plateau": "Loss plateaued. The network has converged. Check accuracy - if low, try more neurons or lower noise.",
  "training.loss.autoStopped": "Auto-stopped: EMA loss not improving for 30 epochs. The network extracted all learnable structure.",

  // Mode-specific commentary
  "mode.fft-simulator": "fft-simulator: the NN is learning to reproduce the DFT transform itself. Each output neuron corresponds to a frequency bin. After training, L1 weight rows should develop sinusoidal patterns - the network is rediscovering the Fourier basis.",
  "mode.band-detector": "band-detector: the NN is learning spectral energy detection - a much simpler task than full FFT simulation. Each of the 5 output neurons maps to an EEG band (delta, theta, alpha, beta, gamma). The network learns to detect the presence/absence of energy in each band.",

  // Network tab
  "network.graph.idle": "Each circle is a neuron. Lines are weights (blue=neg, red=pos). Output layer size depends on mode.",
  "network.activations": "The activation heatmap shows which hidden neurons respond to each probe signal. Brighter = higher activation. Look for neurons that specialize in detecting specific frequencies or bands.",
  "network.weights.early": "Weights start small and random (Xavier initialization). All outputs equally uncertain.",
  "network.weights.trained": "Trained weights show structure. The network learned frequency-selective features in hidden neurons.",
  "network.weightWaveforms": "Each row of L1 weights acts as a matched filter. After training on tones, rows develop sinusoidal patterns tuned to specific frequencies. The DFT frequency label shows what frequency each neuron is 'listening for'.",
  "network.biases": "Bias values shift each neuron's activation threshold. Large positive bias means the neuron fires easily; large negative means it needs strong input to activate.",

  // Architecture
  "arch.neurons": "More neurons = more capacity to learn complex frequency patterns, but also more parameters to train. For fft-simulator, output=N/2+1 matches the FFT bin count. For band-detector, output=5 (one per EEG band).",

  // Detector tab
  "detector.idle": "Compare NN vs FFT-based detection. The inference FLOPs comparison shows the computational cost of each approach.",
  "detector.results": "NN classifies from raw signal. FFT baseline counts spectral peaks. Which is more robust to noise?",
  "detector.snr": "Per-band SNR shows signal strength in each EEG frequency band. Bands above threshold are marked as detected.",

  // Weight probes
  "network.probes": "Each row of L1 weights acts as a matched filter; after training on tones, rows develop sinusoidal patterns tuned to specific frequencies. The DFT frequency label shows what frequency each neuron is 'listening for'.",

  // Probe-specific commentary for training tab
  "training.probes.early": "Probe charts are flat or chaotic \u2014 the network hasn't learned to distinguish different inputs yet. All outputs produce similar random values regardless of whether the input has 0, 1, or 2 tones.",
  "training.probes.learning": "Watch the bold line (true class) separate from the pack. The network is learning to activate the correct output neuron more strongly for each probe signal. K=1 probes typically converge first since single-tone detection is simplest.",
  "training.probes.converged": "Probe signals show clean separation: bold lines near 1.0, others near 0. The network reliably recognizes these fixed reference signals. But probes are noise-free \u2014 real training data has noise, so test accuracy may be lower.",
  "training.probes.k0fail": "The K=0 (silence) probe shows non-zero outputs. The network 'hallucinates' spectral content in a zero signal. This is common when training data has too few K=0 examples \u2014 increase the K=0 weight slider.",
  "training.probes.k2struggle": "The K=2 (dual tone) probe is struggling. The network can handle single tones but can't represent superposition of two peaks simultaneously. Try adding more hidden neurons or training longer.",

  // Training state commentary
  "training.paused": "Training is paused. You can adjust hot parameters (learning rate, batch size, noise, frequency range) and resume. The network weights and training history are preserved.",
  "training.resumed": "Resumed training with updated parameters. The network continues from where it left off \u2014 watch for any change in convergence rate from the new settings.",
};

function getCommentary(appState) {
  const { tab, section, epoch, totalEpochs, loss, probeResults, autoStopped, mode } = appState;

  if (tab === 'signal') {
    if (section === 'kDistribution') return commentary["signal.kDistribution"];
    if (section === 'ensemble') return commentary["signal.ensemble"];
    const k = appState.currentK;
    if (k === 0) return commentary["signal.input.K0"];
    if (k === 1) return commentary["signal.input.K1"];
    if (k === 2) return commentary["signal.input.K2"];
    if (k === 3) return commentary["signal.input.K3"];
    return commentary["signal.input.K1"];
  }

  if (tab === 'training') {
    if (autoStopped) return commentary["training.loss.autoStopped"];
    if (appState.trainingState === 'paused') return commentary["training.paused"];
    if (mode && epoch < 10) {
      const key = `mode.${mode}`;
      if (commentary[key]) return commentary[key];
    }
    if (!epoch || epoch === 0) return commentary["training.loss.early"];
    const progress = epoch / (totalEpochs || 1);
    if (progress < 0.15) return commentary["training.probes.early"];
    if (progress > 0.3 && progress < 0.6) return commentary["training.probes.learning"];
    if (loss !== undefined && loss < 0.05) return commentary["training.probes.converged"];
    if (progress < 0.6) return commentary["training.loss.mid"];
    return commentary["training.loss.mid"];
  }

  if (tab === 'network') {
    if (!epoch || epoch < 3) return commentary["network.weights.early"];
    if (epoch > 10) return commentary["network.weightWaveforms"];
    return commentary["network.graph.idle"];
  }

  if (tab === 'detector') {
    if (section === 'results') return commentary["detector.results"];
    if (section === 'snr') return commentary["detector.snr"];
    return commentary["detector.idle"];
  }

  return commentary["network.graph.idle"];
}

// Rich contextual commentary for detector results
function getDetectorCommentary(testResults, p) {
  if (!testResults.length) return '';

  const lines = [];
  const total = testResults.length;
  const passCount = testResults.filter(r => r.pass).length;
  const passRate = passCount / total * 100;
  const isFft = p.mode === 'fft-simulator';

  // Group by K
  const byK = {};
  testResults.forEach(r => {
    if (!byK[r.K]) byK[r.K] = { total: 0, pass: 0, mseSum: 0, corrSum: 0, fails: [] };
    byK[r.K].total++;
    if (r.pass) byK[r.K].pass++;
    byK[r.K].mseSum += r.mse;
    if (r.corr != null) byK[r.K].corrSum += r.corr;
    if (!r.pass) byK[r.K].fails.push(r);
  });

  // Overall assessment
  if (passRate >= 90) {
    lines.push('<b style="color:#3fb950;">Strong performance.</b> The network generalizes well across test signals.');
  } else if (passRate >= 70) {
    lines.push('<b style="color:#e3b341;">Moderate performance.</b> The network learned useful features but still makes errors on some inputs.');
  } else if (passRate >= 40) {
    lines.push('<b style="color:#f0883e;">Weak performance.</b> The network has partially learned the task but struggles significantly. Consider more training epochs, more neurons, or higher SNR.');
  } else {
    lines.push('<b style="color:#f85149;">Poor performance.</b> The network has not learned the task. Check: is the architecture large enough? Is noise too high? Did training converge?');
  }

  // K-class analysis
  const kKeys = Object.keys(byK).map(Number).sort();
  if (kKeys.length > 1) {
    const kRates = kKeys.map(k => ({ k, rate: byK[k].pass / byK[k].total * 100 }));
    const worst = kRates.reduce((a, b) => a.rate < b.rate ? a : b);
    const best = kRates.reduce((a, b) => a.rate > b.rate ? a : b);

    if (best.rate - worst.rate > 20) {
      lines.push(`<br><b>K-class imbalance:</b> K=${best.k} passes at ${best.rate.toFixed(0)}% but K=${worst.k} only ${worst.rate.toFixed(0)}%.`);
      if (worst.k === 0) {
        lines.push('K=0 (noise-only) signals are hard because the network must output near-zero everywhere \u2014 any spurious activation is an error.');
      } else if (worst.k >= 2) {
        lines.push(`K=${worst.k} signals are harder because multiple tones create complex spectral patterns. The network needs enough capacity (hidden neurons) to represent superpositions.`);
      }
    } else {
      lines.push(`<br><b>K-class balance:</b> Performance is consistent across tone counts (${worst.rate.toFixed(0)}\u2013${best.rate.toFixed(0)}%). The network handles varying complexity equally.`);
    }
  }

  // Mode-specific error analysis
  if (isFft) {
    const avgCorr = testResults.reduce((s,r) => s + (r.corr||0), 0) / total;
    const avgMSE = testResults.reduce((s,r) => s + r.mse, 0) / total;

    lines.push('<br><b>Error metrics explained:</b>');
    lines.push(`<b>Pearson r = ${avgCorr.toFixed(3)}</b> measures shape similarity between predicted and true spectrum. r=1.0 is perfect reproduction, r>0.7 means the NN captures the spectral peaks correctly, r<0.3 means the prediction barely resembles the truth.`);
    lines.push(`<b>MSE = ${avgMSE.toFixed(4)}</b> measures average squared error per output bin. MSE captures magnitude accuracy: low r + low MSE means the NN outputs a flat near-zero spectrum. High r + high MSE means correct peak positions but wrong amplitudes.`);

    if (avgCorr > 0.8 && avgMSE > 0.05) {
      lines.push('<br><span style="color:#e3b341;">The NN finds the right peaks but gets amplitudes wrong.</span> This is common early in training \u2014 shape learning converges before magnitude precision. More epochs or a lower learning rate may help fine-tune amplitudes.');
    }
    if (avgCorr < 0.5 && avgMSE < 0.02) {
      lines.push('<br><span style="color:#e3b341;">Low correlation despite low MSE suggests the NN outputs near-zero everywhere.</span> The network has learned to minimize error by predicting "nothing" rather than learning spectral structure. Try reducing noise (higher SNR) or increasing network size.');
    }

    // Per-bin analysis hint
    lines.push('<br><b>Per-Bin MSE chart:</b> Peaks in the red curve show frequency bins where the NN struggles. Compare these to your signal frequency range \u2014 bins outside the training range will have higher error. DC (bin 0) and Nyquist (last bin) often have different error profiles than mid-band bins.');

    // Correlation distribution hint
    lines.push('<b>Correlation distribution:</b> A tight cluster near r=1.0 means consistent accuracy. A bimodal distribution (peaks at both high and low r) suggests the NN handles some signal types well but fails on others \u2014 check the K-class breakdown above to identify which.');
  } else {
    // Band detector
    const fails = testResults.filter(r => !r.pass);
    if (fails.length > 0) {
      // Analyze failure modes
      const fnCount = {}; // false negatives by band
      const fpCount = {}; // false positives by band
      const bandLabels = ['B1 \u03b4','B2 \u03b8','B3 \u03b1','B4 \u03b2','B5 \u03b3'];
      bandLabels.forEach(b => { fnCount[b] = 0; fpCount[b] = 0; });

      fails.forEach(r => {
        for (let j = 0; j < 5; j++) {
          const predBit = r.pred[j] >= 0.5 ? 1 : 0;
          if (predBit !== r.target[j]) {
            if (r.target[j] === 1) fnCount[bandLabels[j]]++;
            else fpCount[bandLabels[j]]++;
          }
        }
      });

      const worstFN = bandLabels.reduce((a, b) => fnCount[a] > fnCount[b] ? a : b);
      const worstFP = bandLabels.reduce((a, b) => fpCount[a] > fpCount[b] ? a : b);

      lines.push('<br><b>Error metrics explained:</b>');
      lines.push('<b>Pass</b> = all 5 bands correctly classified (threshold 0.5). A single band error fails the entire test.');
      lines.push('<b>TP</b> (true positive): band present and correctly detected. <b>FP</b> (false positive): band absent but NN says present. <b>FN</b> (false negative): band present but NN misses it. <b>TN</b> (true negative): band absent and correctly silent.');
      lines.push('<b>Precision</b> = TP/(TP+FP) \u2014 "when the NN says a band is active, how often is it right?" <b>Recall</b> = TP/(TP+FN) \u2014 "of all active bands, how many does the NN find?"');

      if (fnCount[worstFN] > 0) {
        lines.push(`<br><b>Most missed band: ${worstFN}</b> (${fnCount[worstFN]} false negatives). The NN fails to detect this band when present.`);
        if (worstFN.startsWith('B1')) lines.push('B1/delta (0.5\u20134 Hz) is the lowest frequency band. With small N, very few DFT bins fall in this range, making it hard for the NN to learn.');
        else if (worstFN.startsWith('B5')) lines.push('B5/gamma (30\u2013100 Hz) needs high sample rate to capture. If fs is too low, gamma tones alias or fall outside the representable range.');
        else if (worstFN.startsWith('B2')) lines.push('B2/theta (4\u20138 Hz) is a narrow band. Tones near the boundary with B1/delta or B3/alpha may confuse the detector.');
      }
      if (fpCount[worstFP] > 0) {
        lines.push(`<b>Most false-alarmed band: ${worstFP}</b> (${fpCount[worstFP]} false positives). The NN hallucinates energy in this band.`);
        lines.push('False positives often come from spectral leakage: a strong tone in one band creates sidelobes that bleed into adjacent bands. Higher N (more frequency resolution) reduces leakage.');
      }
    }

    lines.push('<br><b>NN vs SNR baseline:</b> The SNR baseline uses a conventional FFT + peak-power-per-band approach. If the NN underperforms the baseline, the network hasn\'t learned enough structure yet. If the NN outperforms it, the network has learned features that are more robust than simple spectral peak detection.');
  }

  // FLOPs context
  const sizes = [];
  // Reconstruct sizes from test results context
  const half = Math.floor(p.N / 2) + 1;
  const nnFlops = isFft
    ? 2 * p.N * p.neurons + 2 * p.neurons * (p.fftRepr === 'complex' ? half * 2 : half)
    : 2 * p.N * p.neurons + 2 * p.neurons * 5;
  const fftFlops = Math.round(5 * p.N * Math.log2(p.N));

  if (nnFlops < fftFlops) {
    lines.push(`<br><b>Cost advantage:</b> The NN inference (${nnFlops} FLOPs) is cheaper than a standard FFT (${fftFlops} FLOPs). For real-time embedded applications, a trained NN could replace the FFT at lower compute cost \u2014 if accuracy is sufficient.`);
  } else {
    lines.push(`<br><b>Cost comparison:</b> NN inference (${nnFlops} FLOPs) exceeds FFT cost (${fftFlops} FLOPs). The NN approach is only justified if it provides robustness advantages (e.g., noise tolerance, end-to-end learning) that the FFT pipeline doesn't.`);
  }

  return lines.join('<br>');
}

export { commentary, getCommentary, getDetectorCommentary };
