// Fixed reference signals for probing network behavior
import { dft, magPhase, EEG_BANDS, EEG_BAND_NAMES } from './dsp.js';

function createProbes(params) {
  const { N, fs, freqMin, freqMax, maxK } = params;
  const half = Math.floor(N / 2) + 1;
  const probes = [];

  // K=0: silence (all zeros - pure noise scenario)
  const raw0 = new Float64Array(N);
  const input0 = Array.from(raw0);
  probes.push({ k: 0, label: 'K=0 silence', input: input0, rawSignal: raw0, bands: [] });

  // K=1: single sinusoid at mid-range frequency
  const f1 = (freqMin + freqMax) / 2;
  const raw1 = new Float64Array(N);
  for (let n = 0; n < N; n++) raw1[n] = Math.sin(2 * Math.PI * f1 * n / fs);
  const max1 = Math.max(...raw1.map(Math.abs)) || 1;
  const input1 = Array.from(raw1).map(v => v / max1);
  probes.push({ k: 1, label: 'K=1 mid', input: input1, rawSignal: raw1, bands: [getBandForFreq(f1)] });

  // K=2: two sinusoids at 1/3 and 2/3 of frequency range
  const fA = freqMin + (freqMax - freqMin) / 3;
  const fB = freqMin + 2 * (freqMax - freqMin) / 3;
  const raw2 = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    raw2[n] = Math.sin(2 * Math.PI * fA * n / fs) + Math.sin(2 * Math.PI * fB * n / fs);
  }
  const max2 = Math.max(...raw2.map(Math.abs)) || 1;
  const input2 = Array.from(raw2).map(v => v / max2);
  probes.push({ k: 2, label: 'K=2 dual', input: input2, rawSignal: raw2, bands: [getBandForFreq(fA), getBandForFreq(fB)] });

  // K=3 probe (if maxK >= 3): three tones from different bands
  if (maxK >= 3) {
    const f3a = 10;  // alpha
    const f3b = 20;  // beta
    const f3c = 50;  // gamma
    const raw3 = new Float64Array(N);
    for (let n = 0; n < N; n++) {
      raw3[n] = Math.sin(2 * Math.PI * f3a * n / fs) +
                Math.sin(2 * Math.PI * f3b * n / fs) +
                Math.sin(2 * Math.PI * f3c * n / fs);
    }
    const max3 = Math.max(...raw3.map(Math.abs)) || 1;
    const input3 = Array.from(raw3).map(v => v / max3);
    probes.push({ k: 3, label: 'K=3 tri', input: input3, rawSignal: raw3, bands: ['alpha', 'beta', 'gamma'] });
  }

  // Per-band probes: pure tone from each EEG band
  for (const bandName of EEG_BAND_NAMES) {
    const [lo, hi] = EEG_BANDS[bandName];
    const clampLo = Math.max(lo, freqMin);
    const clampHi = Math.min(hi, freqMax);
    if (clampHi <= clampLo) continue; // band outside signal range

    const freq = (clampLo + clampHi) / 2;
    const rawB = new Float64Array(N);
    for (let n = 0; n < N; n++) rawB[n] = Math.sin(2 * Math.PI * freq * n / fs);
    const maxB = Math.max(...rawB.map(Math.abs)) || 1;
    const inputB = Array.from(rawB).map(v => v / maxB);
    probes.push({
      k: 1,
      label: `${bandName} ${freq.toFixed(0)}Hz`,
      input: inputB,
      rawSignal: rawB,
      bands: [bandName],
      isBandProbe: true
    });
  }

  return probes;
}

function getBandForFreq(freq) {
  for (const [name, [lo, hi]] of Object.entries(EEG_BANDS)) {
    if (freq >= lo && freq < hi) return name;
  }
  return 'unknown';
}

export { createProbes, getBandForFreq };
