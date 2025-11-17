/**
 * data-generator.js
 * Synthetic Iris dataset generation using Gaussian Mixture Model
 */

import { gaussianRandom, choleskyDecomposition } from './math-utils.js';

// GMM Configuration
export const gmmConfig = {
  centers: [
    [5.0, 3.4, 1.5, 0.2], // setosa
    [6.0, 2.8, 4.5, 1.3], // versicolor
    [6.7, 3.1, 5.5, 2.1]  // virginica
  ],
  baseSpreads: [
    [0.2, 0.2, 0.2, 0.05],
    [0.4, 0.3, 0.4, 0.2],
    [0.5, 0.3, 0.6, 0.25]
  ],
  spreads: [
    [0.2, 0.2, 0.2, 0.05],
    [0.4, 0.3, 0.4, 0.2],
    [0.5, 0.3, 0.6, 0.25]
  ],
  nPerClass: 50,
  spreadMultiplier: 1.0,
  separationMultiplier: 1.0,
  ellipseAxisScale: 1.0,
  versicolorSkew: 0.0
};

/**
 * Update spread values based on multiplier
 */
export function updateSpreads() {
  for (let c = 0; c < 3; c++) {
    for (let d = 0; d < 4; d++) {
      gmmConfig.spreads[c][d] = gmmConfig.baseSpreads[c][d] * gmmConfig.spreadMultiplier;
    }
  }
}

/**
 * Apply skew transformation to samples (Versicolor only)
 * @param {number[][]} samples - Array of feature vectors
 * @param {number} skewFactor - Skew intensity
 * @returns {number[][]} Skewed samples
 */
export function applySkewToSamples(samples, skewFactor) {
  if (Math.abs(skewFactor) < 0.01) return samples;

  return samples.map(sample => {
    const skewed = sample.slice();
    for (let i = 0; i < 4; i++) {
      if (skewFactor > 0) {
        skewed[i] = sample[i] + skewFactor * Math.pow(Math.max(0, sample[i]), 2);
      } else {
        skewed[i] = sample[i] + skewFactor * Math.pow(Math.min(0, sample[i]), 2);
      }
    }
    return skewed;
  });
}

/**
 * Generate correlated samples using Cholesky decomposition
 * @param {number} n - Number of samples
 * @param {number[][]} corrMatrix - Correlation matrix
 * @returns {number[][]} Array of correlated samples
 */
export function generateCorrelatedSamples(n, corrMatrix) {
  const L = choleskyDecomposition(corrMatrix);
  const samples = [];

  for (let i = 0; i < n; i++) {
    const z = [gaussianRandom(), gaussianRandom(), gaussianRandom(), gaussianRandom()];
    const x = [0, 0, 0, 0];

    // Matrix multiplication: x = L * z
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        x[row] += L[row][col] * z[col];
      }
    }
    samples.push(x);
  }
  return samples;
}

/**
 * Generate synthetic Iris dataset using GMM
 * @param {number[][]|null} customCorrMatrix - Optional correlation matrix for structured data
 * @returns {Array} Dataset with .features and .class properties
 */
export function generateData(customCorrMatrix = null) {
  const data = [];

  // Calculate global mean across all class centers for separation scaling
  const globalMean = [0, 0, 0, 0];
  for (let d = 0; d < 4; d++) {
    globalMean[d] = (gmmConfig.centers[0][d] + gmmConfig.centers[1][d] + gmmConfig.centers[2][d]) / 3;
  }

  for (let c = 0; c < 3; c++) {
    let classSamples;

    if (customCorrMatrix) {
      // Generate correlated samples
      classSamples = generateCorrelatedSamples(gmmConfig.nPerClass, customCorrMatrix);
    } else {
      // Generate independent samples
      classSamples = [];
      for (let n = 0; n < gmmConfig.nPerClass; n++) {
        classSamples.push([
          gaussianRandom(),
          gaussianRandom(),
          gaussianRandom(),
          gaussianRandom()
        ]);
      }
    }

    // Apply skew to Versicolor class (c === 1)
    if (c === 1) {
      classSamples = applySkewToSamples(classSamples, gmmConfig.versicolorSkew);
    }

    // Scale and translate samples to class center
    for (const sample of classSamples) {
      const features = new Array(4);
      for (let d = 0; d < 4; d++) {
        const scaledSpread = gmmConfig.spreads[c][d];
        const scaledCenter = globalMean[d] + (gmmConfig.centers[c][d] - globalMean[d]) * gmmConfig.separationMultiplier;
        features[d] = scaledCenter + sample[d] * scaledSpread;
      }
      data.push({ features, class: c });
    }
  }

  return data;
}
