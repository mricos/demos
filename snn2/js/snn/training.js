/**
 * training.js
 * Training step with backpropagation for SNN
 *
 * Uses shared/nn.js backward pass via the network wrapper.
 * Keeps stochastic mini-batch sampling pattern (interval-based, not epoch-based).
 */

import { network, forwardSingle } from './network.js';
import { crossEntropy } from '/shared/losses.js';

/**
 * Training state
 */
export const training = {
  lossHistory: [],
  valLossHistory: [],
  stepCount: 0,
  timer: null,
  isTraining: false,
  randomConfusion: null
};

/**
 * Perform one training step with mini-batch SGD
 * Uses the shared network's backward() for gradient computation.
 * @param {Array} dataset - Training samples with .x and .y properties
 * @param {number} batchSize - Mini-batch size
 * @param {number} learningRate - Learning rate
 * @param {number} numInput - Number of input features
 * @param {number} numHidden - Number of hidden neurons
 * @param {number} numOutput - Number of output classes
 * @param {number} maxLossPoints - Max history size
 */
export function trainStep(dataset, batchSize, learningRate, numInput, numHidden, numOutput, maxLossPoints) {
  if (!dataset || dataset.length === 0) return;

  const net = network._net;
  const n = dataset.length;
  let loss = 0;

  // Train on a random mini-batch using the shared network's backward pass
  for (let s = 0; s < batchSize; s++) {
    const idx = Math.floor(Math.random() * n);
    const sample = dataset[idx];
    const x = sample.x.slice();

    const { acts, pres } = net.forward(x);
    const probs = acts[acts.length - 1];

    // Cross-entropy loss
    loss += crossEntropy(probs, sample.y);

    // One-hot target for backward pass (softmax+CE gradient = probs - one_hot)
    const target = new Array(numOutput).fill(0);
    target[sample.y] = 1;

    // Use shared backward pass (updates weights in-place)
    net.backward(acts, pres, target, learningRate / batchSize);
  }
  loss /= batchSize;

  // Record loss
  if (training.lossHistory.length >= maxLossPoints) training.lossHistory.shift();
  training.lossHistory.push({ step: training.stepCount, loss });

  // Compute validation loss every 5 steps
  if (training.stepCount % 5 === 0) {
    let valLoss = 0;
    const valSize = Math.min(30, dataset.length);
    for (let i = 0; i < valSize; i++) {
      const idx = Math.floor(Math.random() * dataset.length);
      const sample = dataset[idx];
      const { probs } = forwardSingle(sample.x);
      valLoss += crossEntropy(probs, sample.y);
    }
    valLoss /= valSize;
    if (training.valLossHistory.length >= maxLossPoints) training.valLossHistory.shift();
    training.valLossHistory.push({ step: training.stepCount, loss: valLoss });
  }

  training.stepCount++;
}

/**
 * Start continuous training
 * @param {Function} stepCallback - Called after each training step
 * @param {boolean} slowMode - If true, 1 step per 400ms, else 10 steps per 60ms
 */
export function startTraining(stepCallback, slowMode = false) {
  if (training.isTraining) return;
  training.isTraining = true;

  const delay = slowMode ? 400 : 60;
  const stepsPerTick = slowMode ? 1 : 10;

  training.timer = setInterval(() => {
    for (let i = 0; i < stepsPerTick; i++) {
      stepCallback();
    }
  }, delay);
}

/**
 * Stop continuous training
 */
export function stopTraining() {
  if (!training.isTraining) return;
  training.isTraining = false;
  if (training.timer) {
    clearInterval(training.timer);
    training.timer = null;
  }
}
