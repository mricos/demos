/**
 * synthetic-iris.js — Shared Gaussian mixture dataset generator
 *
 * Usage (ES module):
 *   import { generateIris, generateGMM } from '/shared/synthetic-iris.js';
 *
 *   const data = generateIris();              // defaults: 50 per class, 3 classes
 *   const data = generateIris({ nPerClass: 100, seed: 42 });
 *   const data = generateGMM({ centers, spreads, nPerClass });
 *
 * Returns: Array of { features: number[], class: number }
 *
 * Math primitives are re-exported from /shared/math.js for convenience:
 *   import { gaussianRandom, setSeed, choleskyDecomposition, zScoreNormalize } from '/shared/synthetic-iris.js';
 */

// Re-export math primitives for backward compatibility
export {
  gaussianRandom,
  setSeed,
  choleskyDecomposition,
  zScoreNormalize
} from './math.js';

import { gaussianRandom, setSeed, choleskyDecomposition, zScoreNormalize } from './math.js';

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
