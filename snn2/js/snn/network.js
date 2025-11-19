/**
 * network.js
 * Neural network state and initialization for SNN demo
 */

import { sigmoid, softmax } from '../core/math-utils.js';

/**
 * Network state object
 */
export const network = {
  W1: null,  // Input to hidden weights
  b1: null,  // Hidden biases
  W2: null,  // Hidden to output weights
  b2: null,  // Output biases
};

/**
 * Initialize network weights with random values
 * @param {number} numInput - Number of input neurons
 * @param {number} numHidden - Number of hidden neurons
 * @param {number} numOutput - Number of output neurons
 */
export function initNetwork(numInput, numHidden, numOutput) {
  network.W1 = new Array(numHidden);
  network.b1 = new Array(numHidden);
  network.W2 = new Array(numOutput);
  network.b2 = new Array(numOutput);

  for (let j = 0; j < numHidden; j++) {
    network.W1[j] = new Array(numInput);
    for (let i = 0; i < numInput; i++) {
      network.W1[j][i] = (Math.random() - 0.5) * 0.5;
    }
    network.b1[j] = 0;
  }

  for (let k = 0; k < numOutput; k++) {
    network.W2[k] = new Array(numHidden);
    for (let j = 0; j < numHidden; j++) {
      network.W2[k][j] = (Math.random() - 0.5) * 0.5;
    }
    network.b2[k] = 0;
  }
}

/**
 * Forward pass through the network
 * @param {number[]} x - Input features
 * @param {number} numHidden - Number of hidden neurons
 * @param {number} numOutput - Number of output neurons
 * @returns {Object} { z1, h, z2, probs }
 */
export function forwardSingle(x, numHidden, numOutput) {
  const z1 = new Array(numHidden);
  const h = new Array(numHidden);

  for (let j = 0; j < numHidden; j++) {
    let sum = network.b1[j];
    for (let i = 0; i < x.length; i++) {
      sum += network.W1[j][i] * x[i];
    }
    z1[j] = sum;
    h[j] = sigmoid(sum);
  }

  const z2 = new Array(numOutput);
  for (let k = 0; k < numOutput; k++) {
    let sum = network.b2[k];
    for (let j = 0; j < numHidden; j++) {
      sum += network.W2[k][j] * h[j];
    }
    z2[k] = sum;
  }

  const probs = softmax(z2);
  return { z1, h, z2, probs };
}
