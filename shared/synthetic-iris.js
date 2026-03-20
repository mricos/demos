/**
 * synthetic-iris.js — Shared Gaussian mixture dataset generator
 *
 * Usage (ES module):
 *   import { generateIris, generateGMM, gaussianRandom } from '/shared/synthetic-iris.js';
 *
 *   const data = generateIris();              // defaults: 50 per class, 3 classes
 *   const data = generateIris({ nPerClass: 100, seed: 42 });
 *   const data = generateGMM({ centers, spreads, nPerClass });
 *
 * Returns: Array of { features: number[], class: number }
 *
 * Also exports math primitives for reuse:
 *   gaussianRandom, setSeed, choleskyDecomposition, zScoreNormalize
 */

// ── Seeded RNG ──────────────────────────────────
// Mulberry32 — deterministic 32-bit PRNG
let _rngState = (Date.now() >>> 0) || 1;

export function setSeed(seed) {
  _rngState = seed >>> 0 || 1;
  _gaussSpare = null;
}

function _rand() {
  _rngState |= 0;
  _rngState = (_rngState + 0x6D2B79F5) | 0;
  let t = Math.imul(_rngState ^ (_rngState >>> 15), 1 | _rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ── Box-Muller Gaussian ─────────────────────────
let _gaussSpare = null;

export function gaussianRandom(mu, sigma) {
  if (mu === undefined) mu = 0;
  if (sigma === undefined) sigma = 1;

  if (_gaussSpare !== null) {
    const v = _gaussSpare;
    _gaussSpare = null;
    return mu + sigma * v;
  }
  let u = 0, v = 0;
  while (u === 0) u = _rand();
  while (v === 0) v = _rand();
  const mag = Math.sqrt(-2.0 * Math.log(u));
  const z0 = mag * Math.cos(2 * Math.PI * v);
  const z1 = mag * Math.sin(2 * Math.PI * v);
  _gaussSpare = z1;
  return mu + sigma * z0;
}

// ── Cholesky decomposition ──────────────────────
export function choleskyDecomposition(matrix) {
  const n = matrix.length;
  const L = Array(n).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }
      if (i === j) {
        const val = matrix[i][i] - sum;
        L[i][j] = val > 0 ? Math.sqrt(val) : 0.01;
      } else {
        L[i][j] = (matrix[i][j] - sum) / (L[j][j] || 0.01);
      }
    }
  }
  return L;
}

// ── z-score normalization ───────────────────────
export function zScoreNormalize(data) {
  if (data.length === 0) return { data: [], means: [], stds: [] };
  const nFeatures = data[0].features.length;
  const means = new Array(nFeatures).fill(0);
  const stds = new Array(nFeatures).fill(0);

  // Compute means
  for (const d of data) {
    for (let i = 0; i < nFeatures; i++) means[i] += d.features[i];
  }
  for (let i = 0; i < nFeatures; i++) means[i] /= data.length;

  // Compute standard deviations
  for (const d of data) {
    for (let i = 0; i < nFeatures; i++) {
      const diff = d.features[i] - means[i];
      stds[i] += diff * diff;
    }
  }
  for (let i = 0; i < nFeatures; i++) stds[i] = Math.sqrt(stds[i] / data.length) || 1;

  // Normalize
  const normalized = data.map(d => ({
    features: d.features.map((v, i) => (v - means[i]) / stds[i]),
    class: d.class
  }));

  return { data: normalized, means, stds };
}

// ── Iris-specific defaults ──────────────────────
const IRIS_CENTERS = [
  [5.0, 3.4, 1.5, 0.2], // setosa
  [6.0, 2.8, 4.5, 1.3], // versicolor
  [6.7, 3.1, 5.5, 2.1]  // virginica
];

const IRIS_SPREADS = [
  [0.2, 0.2, 0.2, 0.05],  // setosa (tight)
  [0.4, 0.3, 0.4, 0.2],   // versicolor (medium)
  [0.5, 0.3, 0.6, 0.25]   // virginica (wide)
];

const IRIS_LABELS = ["setosa", "versicolor", "virginica"];
const IRIS_FEATURE_NAMES = ["sepal_length", "sepal_width", "petal_length", "petal_width"];

// ── Core GMM generator ──────────────────────────
/**
 * Generate data from a Gaussian Mixture Model.
 *
 * @param {Object} config
 * @param {number[][]} config.centers — class centroids, shape [nClasses][nFeatures]
 * @param {number[][]} config.spreads — per-feature std devs, shape [nClasses][nFeatures]
 * @param {number} [config.nPerClass=50]
 * @param {number} [config.seed] — optional deterministic seed
 * @param {number} [config.separation=1.0] — scale class distances from global mean
 * @param {number[][]} [config.corrMatrix] — optional correlation matrix (Cholesky)
 * @returns {Array<{features: number[], class: number}>}
 */
export function generateGMM(config) {
  const centers = config.centers;
  const spreads = config.spreads;
  const nPerClass = config.nPerClass || 50;
  const separation = config.separation || 1.0;
  const corrMatrix = config.corrMatrix || null;

  if (config.seed !== undefined) setSeed(config.seed);

  const nClasses = centers.length;
  const nFeatures = centers[0].length;
  const data = [];

  // Global mean for separation scaling
  const globalMean = new Array(nFeatures).fill(0);
  for (let d = 0; d < nFeatures; d++) {
    for (let c = 0; c < nClasses; c++) globalMean[d] += centers[c][d];
    globalMean[d] /= nClasses;
  }

  // Cholesky factor if correlated
  const L = corrMatrix ? choleskyDecomposition(corrMatrix) : null;

  for (let c = 0; c < nClasses; c++) {
    for (let n = 0; n < nPerClass; n++) {
      let z;
      if (L) {
        // Generate correlated samples
        const raw = new Array(nFeatures);
        for (let d = 0; d < nFeatures; d++) raw[d] = gaussianRandom();
        z = new Array(nFeatures).fill(0);
        for (let i = 0; i < nFeatures; i++) {
          for (let j = 0; j < nFeatures; j++) {
            z[i] += L[i][j] * raw[j];
          }
        }
      } else {
        z = new Array(nFeatures);
        for (let d = 0; d < nFeatures; d++) z[d] = gaussianRandom();
      }

      const features = new Array(nFeatures);
      for (let d = 0; d < nFeatures; d++) {
        const scaledCenter = globalMean[d] + (centers[c][d] - globalMean[d]) * separation;
        features[d] = scaledCenter + z[d] * spreads[c][d];
      }
      data.push({ features, class: c });
    }
  }

  return data;
}

// ── Convenience: Iris dataset ───────────────────
/**
 * Generate a synthetic Iris-like dataset.
 *
 * @param {Object} [opts]
 * @param {number} [opts.nPerClass=50]
 * @param {number} [opts.seed]
 * @param {number} [opts.separation=1.0]
 * @param {number} [opts.spreadScale=1.0] — multiply all spreads
 * @param {boolean} [opts.normalize=false] — apply z-score normalization
 * @returns {{ data: Array<{features, class}>, labels: string[], featureNames: string[], means?: number[], stds?: number[] }}
 */
export function generateIris(opts) {
  if (!opts) opts = {};
  const spreadScale = opts.spreadScale || 1.0;
  const spreads = IRIS_SPREADS.map(row => row.map(v => v * spreadScale));

  const raw = generateGMM({
    centers: IRIS_CENTERS,
    spreads: spreads,
    nPerClass: opts.nPerClass || 50,
    seed: opts.seed,
    separation: opts.separation || 1.0,
    corrMatrix: opts.corrMatrix
  });

  if (opts.normalize) {
    const result = zScoreNormalize(raw);
    return {
      data: result.data,
      labels: IRIS_LABELS,
      featureNames: IRIS_FEATURE_NAMES,
      means: result.means,
      stds: result.stds
    };
  }

  return {
    data: raw,
    labels: IRIS_LABELS,
    featureNames: IRIS_FEATURE_NAMES
  };
}
