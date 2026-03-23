// Digital Signal Processing functions
import { random, randn } from './rng.js';

// EEG frequency bands (Hz)
const EEG_BANDS = {
  delta: [0.5, 4],
  theta: [4, 8],
  alpha: [8, 13],
  beta: [13, 30],
  gamma: [30, 100]
};

const EEG_BAND_NAMES = Object.keys(EEG_BANDS);

// Weighted K sampling: given weights array, pick K proportionally
function weightedK(weights, rng) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

// Legacy signal generator
function generateSignal(p, returnMeta = false) {
  return generateSignalV2(p, returnMeta);
}

// V2 signal generator with EEG band awareness
function generateSignalV2(p, returnMeta = false) {
  const effectiveMaxK = Math.min(p.maxK, 3);
  const K = p.kWeights
    ? weightedK(p.kWeights.slice(0, effectiveMaxK + 1), random)
    : Math.floor(random() * (effectiveMaxK + 1));

  const freqs = [], amps = [], tones = [];
  const ampMin = p.ampMin ?? 0.6;
  const ampMax = p.ampMax ?? 0.8;

  // Get bands that overlap with the configured freq range
  const availableBands = EEG_BAND_NAMES.filter(name => {
    const [lo, hi] = EEG_BANDS[name];
    return hi > p.freqMin && lo < p.freqMax;
  });

  for (let i = 0; i < K; i++) {
    let f, band, bandIdx, attempts = 0;
    do {
      // Pick a random EEG band, then random freq within it (clamped to configured range)
      if (availableBands.length > 0) {
        bandIdx = Math.floor(random() * availableBands.length);
        band = availableBands[bandIdx];
        const [bLo, bHi] = EEG_BANDS[band];
        const lo = Math.max(bLo, p.freqMin);
        const hi = Math.min(bHi, p.freqMax);
        f = lo + random() * (hi - lo);
      } else {
        band = 'unknown';
        bandIdx = -1;
        f = p.freqMin + random() * (p.freqMax - p.freqMin);
      }
      attempts++;
    } while (attempts < 50 && freqs.some(ef => Math.abs(ef - f) < p.freqSep));

    const amp = ampMin + random() * (ampMax - ampMin);
    freqs.push(f);
    amps.push(amp);
    tones.push({ freq: f, amp, band, bandIdx: EEG_BAND_NAMES.indexOf(band) });
  }

  const x = new Float64Array(p.N);
  const phases = freqs.map(() => random() * 2 * Math.PI);

  for (let n = 0; n < p.N; n++) {
    for (let i = 0; i < K; i++) {
      x[n] += amps[i] * Math.sin(2 * Math.PI * freqs[i] * n / p.fs + phases[i]);
    }
    x[n] += p.sigma * randn();
  }

  if (returnMeta) return { x, K, freqs, amps, phases, tones, noiseStd: p.sigma };
  return x;
}

// Discrete Fourier Transform
function dft(x) {
  const N = x.length;
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    for (let n = 0; n < N; n++) {
      const angle = -2 * Math.PI * k * n / N;
      re[k] += x[n] * Math.cos(angle);
      im[k] += x[n] * Math.sin(angle);
    }
  }
  return { re, im };
}

// Convert complex spectrum to magnitude and phase
function magPhase(re, im, normalize = true) {
  const half = Math.floor(re.length / 2) + 1;
  const mag = new Float64Array(half), phase = new Float64Array(half);
  for (let k = 0; k < half; k++) {
    mag[k] = Math.sqrt(re[k]**2 + im[k]**2);
    phase[k] = Math.atan2(im[k], re[k]);
  }
  if (normalize) {
    const max = Math.max(...mag) || 1;
    for (let k = 0; k < half; k++) mag[k] /= max;
  }
  return { mag, phase };
}

// Detect spectral peaks above threshold
function detectPeaks(spectrum, threshold) {
  const peaks = [];
  for (let k = 1; k < spectrum.length - 1; k++) {
    if (spectrum[k] > threshold && spectrum[k] > spectrum[k-1] && spectrum[k] > spectrum[k+1]) {
      peaks.push(k);
    }
  }
  return peaks;
}

// SNR-based band detection
function detectWithSNR(signal, fs, bands = EEG_BANDS, threshold = 6) {
  const N = signal.length;
  const { re, im } = dft(signal);
  const half = Math.floor(N / 2) + 1;

  // Unnormalized power spectrum
  const power = new Float64Array(half);
  for (let k = 0; k < half; k++) {
    power[k] = re[k] ** 2 + im[k] ** 2;
  }

  // Noise floor: median of power bins
  const sorted = Array.from(power).sort((a, b) => a - b);
  const noiseFloor = sorted[Math.floor(sorted.length / 2)] || 1e-10;

  const deltaF = fs / N;
  const bandResults = {};

  for (const [name, [fLo, fHi]] of Object.entries(bands)) {
    const kLo = Math.max(1, Math.floor(fLo / deltaF));
    const kHi = Math.min(half - 1, Math.ceil(fHi / deltaF));

    let peakPower = 0, peakBin = kLo, peakFreq = fLo;
    for (let k = kLo; k <= kHi; k++) {
      if (power[k] > peakPower) {
        peakPower = power[k];
        peakBin = k;
        peakFreq = k * deltaF;
      }
    }

    const snrDB = 10 * Math.log10((peakPower + 1e-10) / (noiseFloor + 1e-10));
    bandResults[name] = {
      snrDB: snrDB,
      peakBin,
      peakFreq,
      detected: snrDB > threshold
    };
  }

  return { bandResults, noiseFloor, power };
}

// Compute FLOP counts for various methods
function computeFLOPs(config) {
  const { N, sizes } = config;
  const half = Math.floor(N / 2) + 1;

  // FFT: ~5 * N * log2(N)
  const fftFlops = 5 * N * Math.log2(N);

  // NN: sum of (2*fanIn*fanOut) per layer (multiply + add per weight)
  let nnFlops = 0;
  for (let i = 0; i < sizes.length - 1; i++) {
    nnFlops += 2 * sizes[i] * sizes[i + 1];
  }

  return { fftFlops: Math.round(fftFlops), nnFlops };
}

// Inverse Discrete Fourier Transform
function idft(re, im) {
  const N = re.length;
  const x = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    for (let k = 0; k < N; k++) {
      const angle = 2 * Math.PI * k * n / N;
      x[n] += re[k] * Math.cos(angle) - im[k] * Math.sin(angle);
    }
    x[n] /= N;
  }
  return x;
}

// Circular shift: x'[n] = x[(n+d) % N]
function circularShift(x, d) {
  const N = x.length;
  const out = new Float64Array(N);
  for (let n = 0; n < N; n++) out[n] = x[((n + d) % N + N) % N];
  return out;
}

export { EEG_BANDS, EEG_BAND_NAMES, generateSignal, generateSignalV2, weightedK, dft, idft, magPhase, detectPeaks, detectWithSNR, computeFLOPs, circularShift };
