/**
 * shared/losses.js — Loss functions for neural networks and statistical models
 *
 * Provides scalar loss values and gradient vectors for common loss functions.
 * Extracted from fftnn, snn2, bayes, gmdh inline implementations.
 *
 * Usage:
 *   import { mse, crossEntropy, l2Penalty } from '/shared/losses.js';
 *   const loss = mse(predicted, target);
 */

/**
 * Mean Squared Error
 * @param {number[]} predicted - Predicted values
 * @param {number[]} target - Target values
 * @returns {number} MSE loss
 */
export function mse(predicted, target) {
  let sum = 0;
  for (let i = 0; i < predicted.length; i++) {
    sum += (predicted[i] - target[i]) ** 2;
  }
  return sum / predicted.length;
}

/**
 * MSE gradient: d(MSE)/d(predicted)
 * @param {number[]} predicted
 * @param {number[]} target
 * @returns {number[]} Gradient vector
 */
export function mseGrad(predicted, target) {
  const n = predicted.length;
  return predicted.map((p, i) => 2 * (p - target[i]) / n);
}

/**
 * Cross-entropy loss for classification (log loss)
 * @param {number[]} probs - Predicted probabilities (after softmax)
 * @param {number} targetIdx - Index of the correct class
 * @returns {number} Negative log-likelihood
 */
export function crossEntropy(probs, targetIdx) {
  return -Math.log(Math.max(probs[targetIdx], 1e-15));
}

/**
 * Cross-entropy gradient w.r.t. probabilities
 * @param {number[]} probs - Predicted probabilities
 * @param {number} targetIdx - Index of the correct class
 * @returns {number[]} Gradient vector
 */
export function crossEntropyGrad(probs, targetIdx) {
  return probs.map((p, i) => i === targetIdx ? -1 / Math.max(p, 1e-15) : 0);
}

/**
 * Softmax + cross-entropy gradient w.r.t. logits (simplified)
 * @param {number[]} probs - Output probabilities (after softmax)
 * @param {number} targetIdx - Index of the correct class
 * @returns {number[]} Gradient vector (probs - one-hot target)
 */
export function softmaxCrossEntropyGrad(probs, targetIdx) {
  return probs.map((p, i) => p - (i === targetIdx ? 1 : 0));
}

/**
 * Binary cross-entropy loss
 * @param {number} predicted - Predicted probability (0-1)
 * @param {number} target - Target value (0 or 1)
 * @returns {number} BCE loss
 */
export function binaryCrossEntropy(predicted, target) {
  const p = Math.max(1e-15, Math.min(1 - 1e-15, predicted));
  return -(target * Math.log(p) + (1 - target) * Math.log(1 - p));
}

/**
 * L1 penalty (Lasso) — sum of absolute values
 * @param {number[]|number[][]} weights - Weight array or matrix
 * @returns {number} L1 norm
 */
export function l1Penalty(weights) {
  if (Array.isArray(weights[0])) {
    return weights.reduce((s, row) => s + row.reduce((rs, w) => rs + Math.abs(w), 0), 0);
  }
  return weights.reduce((s, w) => s + Math.abs(w), 0);
}

/**
 * L2 penalty (Ridge) — sum of squared values
 * @param {number[]|number[][]} weights - Weight array or matrix
 * @returns {number} L2 norm (sum of squares, not sqrt)
 */
export function l2Penalty(weights) {
  if (Array.isArray(weights[0])) {
    return weights.reduce((s, row) => s + row.reduce((rs, w) => rs + w * w, 0), 0);
  }
  return weights.reduce((s, w) => s + w * w, 0);
}

/**
 * Huber loss — smooth L1 loss
 * @param {number[]} predicted
 * @param {number[]} target
 * @param {number} [delta=1] - Threshold between L2 and L1 behavior
 * @returns {number} Huber loss
 */
export function huber(predicted, target, delta = 1) {
  let sum = 0;
  for (let i = 0; i < predicted.length; i++) {
    const a = Math.abs(predicted[i] - target[i]);
    sum += a <= delta ? 0.5 * a * a : delta * (a - 0.5 * delta);
  }
  return sum / predicted.length;
}
