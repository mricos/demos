/**
 * math-utils.js
 * Core mathematical utilities for Iris SNN demo
 * Provides Gaussian random number generation and matrix operations
 */

// Box-Muller transform for Gaussian random numbers
let _gaussSpare = null;

export function gaussianRandom() {
  if (_gaussSpare !== null) {
    const v = _gaussSpare;
    _gaussSpare = null;
    return v;
  }
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const mag = Math.sqrt(-2.0 * Math.log(u));
  const z0 = mag * Math.cos(2 * Math.PI * v);
  const z1 = mag * Math.sin(2 * Math.PI * v);
  _gaussSpare = z1;
  return z0;
}

/**
 * Cholesky decomposition for generating correlated multivariate data
 * @param {number[][]} matrix - Symmetric positive definite matrix
 * @returns {number[][]} Lower triangular matrix L where LL^T = matrix
 */
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
        L[i][j] = val > 0 ? Math.sqrt(val) : 0.01; // Safeguard against numerical issues
      } else {
        L[i][j] = (matrix[i][j] - sum) / (L[j][j] || 0.01);
      }
    }
  }
  return L;
}

/**
 * Matrix power operation
 * @param {number[][]} matrix - Square matrix
 * @param {number} power - Exponent
 * @returns {number[][]} Matrix raised to the power
 */
export function matrixPower(matrix, power) {
  const n = matrix.length;

  // For power of 2, just multiply matrix by itself
  if (power === 2) {
    const result = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < n; k++) {
          result[i][j] += matrix[i][k] * matrix[k][j];
        }
      }
    }
    return result;
  }

  // For power of 0.5 (square root), use eigendecomposition
  // This is a simplified implementation for symmetric positive definite matrices
  if (power === 0.5) {
    // Note: This is a placeholder - full eigendecomposition needed for general case
    return matrix.map(row => row.slice());
  }

  throw new Error(`Matrix power ${power} not implemented`);
}

/**
 * Frobenius norm of a matrix
 * @param {number[][]} matrix - Input matrix
 * @returns {number} Frobenius norm (sqrt of sum of squared elements)
 */
export function frobeniusNorm(matrix) {
  let sum = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      sum += matrix[i][j] * matrix[i][j];
    }
  }
  return Math.sqrt(sum);
}

/**
 * Determinant of a 4x4 matrix
 * @param {number[][]} m - 4x4 matrix
 * @returns {number} Determinant value
 */
export function determinant4x4(m) {
  return (
    m[0][3] * m[1][2] * m[2][1] * m[3][0] - m[0][2] * m[1][3] * m[2][1] * m[3][0] -
    m[0][3] * m[1][1] * m[2][2] * m[3][0] + m[0][1] * m[1][3] * m[2][2] * m[3][0] +
    m[0][2] * m[1][1] * m[2][3] * m[3][0] - m[0][1] * m[1][2] * m[2][3] * m[3][0] -
    m[0][3] * m[1][2] * m[2][0] * m[3][1] + m[0][2] * m[1][3] * m[2][0] * m[3][1] +
    m[0][3] * m[1][0] * m[2][2] * m[3][1] - m[0][0] * m[1][3] * m[2][2] * m[3][1] -
    m[0][2] * m[1][0] * m[2][3] * m[3][1] + m[0][0] * m[1][2] * m[2][3] * m[3][1] +
    m[0][3] * m[1][1] * m[2][0] * m[3][2] - m[0][1] * m[1][3] * m[2][0] * m[3][2] -
    m[0][3] * m[1][0] * m[2][1] * m[3][2] + m[0][0] * m[1][3] * m[2][1] * m[3][2] +
    m[0][1] * m[1][0] * m[2][3] * m[3][2] - m[0][0] * m[1][1] * m[2][3] * m[3][2] -
    m[0][2] * m[1][1] * m[2][0] * m[3][3] + m[0][1] * m[1][2] * m[2][0] * m[3][3] +
    m[0][2] * m[1][0] * m[2][1] * m[3][3] - m[0][0] * m[1][2] * m[2][1] * m[3][3] -
    m[0][1] * m[1][0] * m[2][2] * m[3][3] + m[0][0] * m[1][1] * m[2][2] * m[3][3]
  );
}

/**
 * Sigmoid activation function
 * @param {number} x - Input value
 * @returns {number} Sigmoid output in range (0, 1)
 */
export function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Softmax function for multi-class probabilities
 * @param {number[]} logits - Raw logit values
 * @returns {number[]} Probability distribution summing to 1
 */
export function softmax(logits) {
  let maxLogit = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > maxLogit) maxLogit = logits[i];
  }
  const exps = new Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    const e = Math.exp(logits[i] - maxLogit);
    exps[i] = e;
    sum += e;
  }
  const probs = new Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    probs[i] = exps[i] / sum;
  }
  return probs;
}

/**
 * Argmax - find index of maximum value
 * @param {number[]} arr - Input array
 * @returns {number} Index of maximum value
 */
export function argmax(arr) {
  let best = 0;
  let bestVal = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > bestVal) {
      bestVal = arr[i];
      best = i;
    }
  }
  return best;
}
