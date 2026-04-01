/**
 * shared/statistics.js — Descriptive statistics and ML metrics
 *
 * Extracted from snn2/js/core/statistics.js and stat-rethink/lib/rethinking.js.
 * General-purpose: works on plain arrays, not tied to any dataset format.
 *
 * Usage:
 *   import { mean, confusionMatrix, roc } from '/shared/statistics.js';
 */

/**
 * Arithmetic mean
 * @param {number[]} arr
 * @returns {number}
 */
export function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * Variance (population, N denominator)
 * @param {number[]} arr
 * @param {boolean} [sample=false] - Use N-1 denominator for sample variance
 * @returns {number}
 */
export function variance(arr, sample = false) {
  const m = mean(arr);
  const denom = sample ? arr.length - 1 : arr.length;
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / denom;
}

/**
 * Standard deviation
 * @param {number[]} arr
 * @param {boolean} [sample=false]
 * @returns {number}
 */
export function std(arr, sample = false) {
  return Math.sqrt(variance(arr, sample));
}

/**
 * Covariance between two arrays
 * @param {number[]} x
 * @param {number[]} y
 * @param {boolean} [sample=false]
 * @returns {number}
 */
export function covariance(x, y, sample = false) {
  const mx = mean(x), my = mean(y);
  const denom = sample ? x.length - 1 : x.length;
  return x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0) / denom;
}

/**
 * Pearson correlation coefficient
 * @param {number[]} x
 * @param {number[]} y
 * @returns {number}
 */
export function correlation(x, y) {
  const sx = std(x), sy = std(y);
  if (sx < 1e-10 || sy < 1e-10) return 0;
  return covariance(x, y) / (sx * sy);
}

/**
 * Covariance matrix for multi-feature data
 * @param {number[][]} data - Array of feature vectors
 * @returns {number[][]} n×n covariance matrix
 */
export function covarianceMatrix(data) {
  const n = data.length;
  const d = data[0].length;
  const means = new Array(d).fill(0);

  for (const row of data) {
    for (let i = 0; i < d; i++) means[i] += row[i];
  }
  for (let i = 0; i < d; i++) means[i] /= n;

  const cov = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const row of data) {
    for (let i = 0; i < d; i++) {
      for (let j = i; j < d; j++) {
        cov[i][j] += (row[i] - means[i]) * (row[j] - means[j]);
      }
    }
  }
  for (let i = 0; i < d; i++) {
    for (let j = i; j < d; j++) {
      cov[i][j] /= n;
      cov[j][i] = cov[i][j];
    }
  }
  return cov;
}

/**
 * Correlation matrix for multi-feature data
 * @param {number[][]} data - Array of feature vectors
 * @returns {number[][]} n×n correlation matrix
 */
export function correlationMatrix(data) {
  const cov = covarianceMatrix(data);
  const d = cov.length;
  const corr = Array.from({ length: d }, () => new Array(d).fill(0));
  for (let i = 0; i < d; i++) {
    corr[i][i] = 1;
    const si = Math.sqrt(cov[i][i]);
    for (let j = i + 1; j < d; j++) {
      const sj = Math.sqrt(cov[j][j]);
      const r = (si > 1e-10 && sj > 1e-10) ? cov[i][j] / (si * sj) : 0;
      corr[i][j] = r;
      corr[j][i] = r;
    }
  }
  return corr;
}

/**
 * Confusion matrix for classification
 * @param {number[]} predictions - Predicted class indices
 * @param {number[]} labels - True class indices
 * @param {number} nClasses - Number of classes
 * @returns {number[][]} nClasses × nClasses confusion matrix
 */
export function confusionMatrix(predictions, labels, nClasses) {
  const matrix = Array.from({ length: nClasses }, () => new Array(nClasses).fill(0));
  for (let i = 0; i < predictions.length; i++) {
    matrix[labels[i]][predictions[i]]++;
  }
  return matrix;
}

/**
 * Classification accuracy
 * @param {number[]} predictions - Predicted class indices
 * @param {number[]} labels - True class indices
 * @returns {number} Accuracy (0-1)
 */
export function accuracy(predictions, labels) {
  let correct = 0;
  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i] === labels[i]) correct++;
  }
  return correct / predictions.length;
}

/**
 * Precision for a specific class
 * @param {number[]} predictions
 * @param {number[]} labels
 * @param {number} classIdx
 * @returns {number}
 */
export function precision(predictions, labels, classIdx) {
  let tp = 0, fp = 0;
  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i] === classIdx) {
      if (labels[i] === classIdx) tp++;
      else fp++;
    }
  }
  return tp + fp > 0 ? tp / (tp + fp) : 0;
}

/**
 * Recall for a specific class
 * @param {number[]} predictions
 * @param {number[]} labels
 * @param {number} classIdx
 * @returns {number}
 */
export function recall(predictions, labels, classIdx) {
  let tp = 0, fn = 0;
  for (let i = 0; i < predictions.length; i++) {
    if (labels[i] === classIdx) {
      if (predictions[i] === classIdx) tp++;
      else fn++;
    }
  }
  return tp + fn > 0 ? tp / (tp + fn) : 0;
}

/**
 * F1 score for a specific class
 * @param {number[]} predictions
 * @param {number[]} labels
 * @param {number} classIdx
 * @returns {number}
 */
export function f1Score(predictions, labels, classIdx) {
  const p = precision(predictions, labels, classIdx);
  const r = recall(predictions, labels, classIdx);
  return p + r > 0 ? 2 * p * r / (p + r) : 0;
}

/**
 * ROC curve computation
 * @param {number[]} scores - Predicted scores/probabilities for positive class
 * @param {number[]} labels - True binary labels (0 or 1)
 * @returns {{ fpr: number[], tpr: number[], thresholds: number[], auc: number }}
 */
export function roc(scores, labels) {
  // Sort by score descending
  const indices = Array.from({ length: scores.length }, (_, i) => i);
  indices.sort((a, b) => scores[b] - scores[a]);

  const totalPos = labels.filter(l => l === 1).length;
  const totalNeg = labels.length - totalPos;
  if (totalPos === 0 || totalNeg === 0) {
    return { fpr: [0, 1], tpr: [0, 1], thresholds: [Infinity, -Infinity], auc: 0.5 };
  }

  const fpr = [0], tpr = [0], thresholds = [Infinity];
  let tp = 0, fp = 0;

  for (let i = 0; i < indices.length; i++) {
    if (labels[indices[i]] === 1) tp++;
    else fp++;
    fpr.push(fp / totalNeg);
    tpr.push(tp / totalPos);
    thresholds.push(scores[indices[i]]);
  }

  // AUC via trapezoidal rule
  let auc = 0;
  for (let i = 1; i < fpr.length; i++) {
    auc += (fpr[i] - fpr[i - 1]) * (tpr[i] + tpr[i - 1]) / 2;
  }

  return { fpr, tpr, thresholds, auc };
}

/**
 * Gaussian PDF
 * @param {number} x
 * @param {number} [mu=0]
 * @param {number} [sigma=1]
 * @returns {number}
 */
export function gaussianPDF(x, mu = 0, sigma = 1) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}
