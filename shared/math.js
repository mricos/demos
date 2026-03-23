/**
 * math.js — Shared math primitives for all demos
 *
 * Canonical source for commonly duplicated functions.
 * Import what you need:
 *
 *   import { gaussianRandom, setSeed, choleskyDecomposition } from '/shared/math.js';
 *   import { sigmoid, softmax, argmax } from '/shared/math.js';
 *   import { zScoreNormalize, clamp, lerp } from '/shared/math.js';
 *   import { matrixPower, frobeniusNorm, determinant4x4 } from '/shared/math.js';
 */

// ── Seeded RNG (Mulberry32) ──────────────────────
let _rngState = (Date.now() >>> 0) || 1;
let _gaussSpare = null;

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

/** Seeded random in [0, 1). Uses Mulberry32. */
export function seededRandom() { return _rand(); }

// ── Box-Muller Gaussian ─────────────────────────

/**
 * Gaussian random variate via Box-Muller.
 * Uses the seeded PRNG (call setSeed first for reproducibility).
 * @param {number} [mu=0]
 * @param {number} [sigma=1]
 */
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

// ── Linear algebra ──────────────────────────────

/**
 * Cholesky decomposition of a symmetric positive-definite matrix.
 * Returns lower triangular L where LL^T = matrix.
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
        L[i][j] = val > 0 ? Math.sqrt(val) : 0.01;
      } else {
        L[i][j] = (matrix[i][j] - sum) / (L[j][j] || 0.01);
      }
    }
  }
  return L;
}

/**
 * Matrix power (supports 2 for squaring).
 */
export function matrixPower(matrix, power) {
  const n = matrix.length;
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
  if (power === 0.5) {
    return matrix.map(row => row.slice());
  }
  throw new Error(`Matrix power ${power} not implemented`);
}

/** Frobenius norm (sqrt of sum of squared elements). */
export function frobeniusNorm(matrix) {
  let sum = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      sum += matrix[i][j] * matrix[i][j];
    }
  }
  return Math.sqrt(sum);
}

/** Determinant of a 4x4 matrix. */
export function determinant4x4(m) {
  return (
    m[0][3]*m[1][2]*m[2][1]*m[3][0] - m[0][2]*m[1][3]*m[2][1]*m[3][0] -
    m[0][3]*m[1][1]*m[2][2]*m[3][0] + m[0][1]*m[1][3]*m[2][2]*m[3][0] +
    m[0][2]*m[1][1]*m[2][3]*m[3][0] - m[0][1]*m[1][2]*m[2][3]*m[3][0] -
    m[0][3]*m[1][2]*m[2][0]*m[3][1] + m[0][2]*m[1][3]*m[2][0]*m[3][1] +
    m[0][3]*m[1][0]*m[2][2]*m[3][1] - m[0][0]*m[1][3]*m[2][2]*m[3][1] -
    m[0][2]*m[1][0]*m[2][3]*m[3][1] + m[0][0]*m[1][2]*m[2][3]*m[3][1] +
    m[0][3]*m[1][1]*m[2][0]*m[3][2] - m[0][1]*m[1][3]*m[2][0]*m[3][2] -
    m[0][3]*m[1][0]*m[2][1]*m[3][2] + m[0][0]*m[1][3]*m[2][1]*m[3][2] +
    m[0][1]*m[1][0]*m[2][3]*m[3][2] - m[0][0]*m[1][1]*m[2][3]*m[3][2] -
    m[0][2]*m[1][1]*m[2][0]*m[3][3] + m[0][1]*m[1][2]*m[2][0]*m[3][3] +
    m[0][2]*m[1][0]*m[2][1]*m[3][3] - m[0][0]*m[1][2]*m[2][1]*m[3][3] -
    m[0][1]*m[1][0]*m[2][2]*m[3][3] + m[0][0]*m[1][1]*m[2][2]*m[3][3]
  );
}

// ── Normalization & scaling ─────────────────────

/**
 * z-score normalize an array of { features: number[], class: number }.
 * Returns { data, means, stds }.
 */
export function zScoreNormalize(data) {
  if (data.length === 0) return { data: [], means: [], stds: [] };
  const nFeatures = data[0].features.length;
  const means = new Array(nFeatures).fill(0);
  const stds = new Array(nFeatures).fill(0);

  for (const d of data) {
    for (let i = 0; i < nFeatures; i++) means[i] += d.features[i];
  }
  for (let i = 0; i < nFeatures; i++) means[i] /= data.length;

  for (const d of data) {
    for (let i = 0; i < nFeatures; i++) {
      const diff = d.features[i] - means[i];
      stds[i] += diff * diff;
    }
  }
  for (let i = 0; i < nFeatures; i++) stds[i] = Math.sqrt(stds[i] / data.length) || 1;

  const normalized = data.map(d => ({
    features: d.features.map((v, i) => (v - means[i]) / stds[i]),
    class: d.class
  }));

  return { data: normalized, means, stds };
}

/** Clamp value to [min, max]. */
export function clamp(x, min, max) {
  return x < min ? min : x > max ? max : x;
}

/** Linear interpolation between a and b by t. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Map value from [inMin, inMax] to [outMin, outMax]. */
export function mapRange(x, inMin, inMax, outMin, outMax) {
  return outMin + (x - inMin) * (outMax - outMin) / (inMax - inMin);
}

// ── Activation functions ────────────────────────

export function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

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
