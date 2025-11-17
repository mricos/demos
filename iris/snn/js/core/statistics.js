/**
 * statistics.js
 * Statistical computation utilities
 * Provides covariance, correlation, and distribution statistics
 */

/**
 * Compute 2D covariance matrix for a specific class and feature dimensions
 * @param {Array} data - Dataset with .class and .features properties
 * @param {number} classIdx - Class index to filter by
 * @param {number} dimX - First feature dimension
 * @param {number} dimY - Second feature dimension
 * @returns {Object} { covXX, covYY, covXY, meanX, meanY }
 */
export function compute2DCovMatrix(data, classIdx, dimX, dimY) {
  const classData = data.filter(d => d.class === classIdx);
  const n = classData.length;
  if (n === 0) return { covXX: 1, covYY: 1, covXY: 0, meanX: 0, meanY: 0 };

  // Compute means
  let meanX = 0, meanY = 0;
  for (const d of classData) {
    meanX += d.features[dimX];
    meanY += d.features[dimY];
  }
  meanX /= n;
  meanY /= n;

  // Compute covariance
  let covXX = 0, covYY = 0, covXY = 0;
  for (const d of classData) {
    const dx = d.features[dimX] - meanX;
    const dy = d.features[dimY] - meanY;
    covXX += dx * dx;
    covYY += dy * dy;
    covXY += dx * dy;
  }
  covXX /= n;
  covYY /= n;
  covXY /= n;

  return { covXX, covYY, covXY, meanX, meanY };
}

/**
 * Compute full correlation matrix for dataset
 * @param {Array} data - Dataset with .features property
 * @returns {number[][]} 4x4 correlation matrix
 */
export function computeCorrelationMatrix(data) {
  const n = data.length;
  if (n === 0) return [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];

  const numFeatures = 4;
  const means = new Array(numFeatures).fill(0);
  const stds = new Array(numFeatures).fill(0);

  // Compute means
  for (const d of data) {
    for (let i = 0; i < numFeatures; i++) {
      means[i] += d.features[i];
    }
  }
  for (let i = 0; i < numFeatures; i++) {
    means[i] /= n;
  }

  // Compute standard deviations
  for (const d of data) {
    for (let i = 0; i < numFeatures; i++) {
      const diff = d.features[i] - means[i];
      stds[i] += diff * diff;
    }
  }
  for (let i = 0; i < numFeatures; i++) {
    stds[i] = Math.sqrt(stds[i] / n);
    if (stds[i] < 1e-10) stds[i] = 1; // Prevent division by zero
  }

  // Compute correlation matrix
  const corr = Array(numFeatures).fill(0).map(() => Array(numFeatures).fill(0));
  for (let i = 0; i < numFeatures; i++) {
    corr[i][i] = 1;
    for (let j = i + 1; j < numFeatures; j++) {
      let sum = 0;
      for (const d of data) {
        const xi = (d.features[i] - means[i]) / stds[i];
        const xj = (d.features[j] - means[j]) / stds[j];
        sum += xi * xj;
      }
      const r = sum / n;
      corr[i][j] = r;
      corr[j][i] = r;
    }
  }

  return corr;
}

/**
 * Compute statistics for a single feature within a class
 * @param {Array} data - Dataset
 * @param {number} classIdx - Class index
 * @param {number} featureIdx - Feature dimension index
 * @returns {Object} { mean, std }
 */
export function computeFeatureStats(data, classIdx, featureIdx) {
  const classData = data.filter(d => d.class === classIdx);
  const n = classData.length;
  if (n === 0) return { mean: 0, std: 1 };

  let mean = 0;
  for (const d of classData) {
    mean += d.features[featureIdx];
  }
  mean /= n;

  let variance = 0;
  for (const d of classData) {
    const diff = d.features[featureIdx] - mean;
    variance += diff * diff;
  }
  const std = Math.sqrt(variance / n) || 1;

  return { mean, std };
}

/**
 * Gaussian probability density function
 * @param {number} x - Value to evaluate
 * @param {number} mu - Mean
 * @param {number} sigma - Standard deviation
 * @returns {number} PDF value
 */
export function gaussianPDF(x, mu, sigma) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}
