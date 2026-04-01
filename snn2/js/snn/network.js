/**
 * network.js
 * Neural network state and initialization for SNN demo
 *
 * Uses shared/nn.js for network creation and forward/backward passes.
 * Maintains backward-compatible API (network.W1/b1/W2/b2, forwardSingle).
 */

import { createNetwork } from '/shared/nn.js';

/**
 * Network state — exposes W1/b1/W2/b2 as views into the shared network's layers.
 * The _net property holds the shared network instance.
 */
export const network = {
  W1: null,  // Input to hidden weights (alias for _net.layers[0].W)
  b1: null,  // Hidden biases
  W2: null,  // Hidden to output weights
  b2: null,  // Output biases
  _net: null, // Shared network instance
};

/**
 * Initialize network weights with random values
 * @param {number} numInput - Number of input neurons
 * @param {number} numHidden - Number of hidden neurons
 * @param {number} numOutput - Number of output neurons
 */
export function initNetwork(numInput, numHidden, numOutput) {
  const net = createNetwork([numInput, numHidden, numOutput], {
    activation: 'sigmoid',
    outputActivation: 'softmax',
    initMethod: 'xavier',
  });
  network._net = net;
  // Expose weight references for direct access (same underlying arrays)
  network.W1 = net.layers[0].W;
  network.b1 = net.layers[0].b;
  network.W2 = net.layers[1].W;
  network.b2 = net.layers[1].b;
}

/**
 * Forward pass through the network
 * @param {number[]} x - Input features
 * @param {number} [numHidden] - (ignored, kept for API compat)
 * @param {number} [numOutput] - (ignored, kept for API compat)
 * @returns {Object} { z1, h, z2, probs }
 */
export function forwardSingle(x, numHidden, numOutput) {
  const { acts, pres } = network._net.forward(x);
  return {
    z1: pres[1],           // pre-activations of hidden layer
    h: acts[1],            // hidden activations (sigmoid applied)
    z2: pres[2],           // pre-activations of output layer
    probs: acts[2],        // output probabilities (softmax applied)
  };
}
