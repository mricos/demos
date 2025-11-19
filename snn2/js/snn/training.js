/**
 * training.js
 * Training step with backpropagation for SNN
 */

import { network, forwardSingle } from './network.js';

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

  const n = dataset.length;
  const z1Batch = new Array(batchSize);
  const hBatch = new Array(batchSize);
  const z2Batch = new Array(batchSize);
  const pBatch = new Array(batchSize);
  const yBatch = new Array(batchSize);
  const xBatch = new Array(batchSize);

  // Sample batch
  for (let s = 0; s < batchSize; s++) {
    const idx = Math.floor(Math.random() * n);
    const sample = dataset[idx];
    xBatch[s] = sample.x.slice();
    yBatch[s] = sample.y;
  }

  // Forward pass
  let loss = 0;
  for (let s = 0; s < batchSize; s++) {
    const x = xBatch[s];
    const { z1, h, z2, probs } = forwardSingle(x, numHidden, numOutput);
    z1Batch[s] = z1;
    hBatch[s] = h;
    z2Batch[s] = z2;
    pBatch[s] = probs;
    loss += -Math.log(probs[yBatch[s]] + 1e-9);
  }
  loss /= batchSize;

  // Backward pass
  const dW2 = new Array(numOutput);
  const db2 = new Array(numOutput).fill(0);
  const dW1 = new Array(numHidden);
  const db1 = new Array(numHidden).fill(0);

  for (let k = 0; k < numOutput; k++) {
    dW2[k] = new Array(numHidden).fill(0);
  }
  for (let j = 0; j < numHidden; j++) {
    dW1[j] = new Array(numInput).fill(0);
  }

  for (let s = 0; s < batchSize; s++) {
    const probs = pBatch[s];
    const h = hBatch[s];
    const x = xBatch[s];
    const y = yBatch[s];

    const dZ2 = new Array(numOutput);
    for (let k = 0; k < numOutput; k++) {
      dZ2[k] = probs[k] - (k === y ? 1 : 0);
    }

    // Output layer gradients
    for (let k = 0; k < numOutput; k++) {
      db2[k] += dZ2[k];
      for (let j = 0; j < numHidden; j++) {
        dW2[k][j] += dZ2[k] * h[j];
      }
    }

    // Hidden layer gradients
    const dH = new Array(numHidden).fill(0);
    for (let j = 0; j < numHidden; j++) {
      let sum = 0;
      for (let k = 0; k < numOutput; k++) {
        sum += dZ2[k] * network.W2[k][j];
      }
      dH[j] = sum;
    }

    for (let j = 0; j < numHidden; j++) {
      const sig = h[j];
      const dZ1 = dH[j] * sig * (1 - sig);
      db1[j] += dZ1;
      for (let i = 0; i < numInput; i++) {
        dW1[j][i] += dZ1 * x[i];
      }
    }
  }

  // Update weights
  const scale = learningRate / batchSize;
  for (let k = 0; k < numOutput; k++) {
    network.b2[k] -= scale * db2[k];
    for (let j = 0; j < numHidden; j++) {
      network.W2[k][j] -= scale * dW2[k][j];
    }
  }
  for (let j = 0; j < numHidden; j++) {
    network.b1[j] -= scale * db1[j];
    for (let i = 0; i < numInput; i++) {
      network.W1[j][i] -= scale * dW1[j][i];
    }
  }

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
      const { probs } = forwardSingle(sample.x, numHidden, numOutput);
      valLoss += -Math.log(probs[sample.y] + 1e-9);
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
