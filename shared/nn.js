/**
 * shared/nn.js — Neural network primitives
 *
 * Factory-based multi-layer feedforward network with forward/backward pass.
 * Extracted from fftnn/js/nn.js, generalized for N layers.
 *
 * Usage:
 *   import { createNetwork } from '/shared/nn.js';
 *   const net = createNetwork([4, 16, 3], { activation: 'relu', outputActivation: 'softmax' });
 *   const output = net.predict([1, 2, 3, 4]);
 */

/**
 * Activation functions and their derivatives
 */
const activations = {
  relu:    x => Math.max(0, x),
  tanh:    x => Math.tanh(x),
  sigmoid: x => 1 / (1 + Math.exp(-x)),
  linear:  x => x,
};

const activationDerivs = {
  relu:    x => x > 0 ? 1 : 0,
  tanh:    x => { const t = Math.tanh(x); return 1 - t * t; },
  sigmoid: x => { const s = 1 / (1 + Math.exp(-x)); return s * (1 - s); },
  linear:  () => 1,
};

/**
 * Initialize a weight matrix
 * @param {number} fanIn - Number of input units
 * @param {number} fanOut - Number of output units
 * @param {string} [method='xavier'] - Initialization method: 'xavier', 'he', 'uniform'
 * @param {Function} [rng] - Random number generator (0-1), defaults to Math.random
 * @returns {number[][]} Weight matrix [fanOut x fanIn]
 */
export function initWeights(fanIn, fanOut, method = 'xavier', rng = Math.random) {
  const W = [];
  let scale;
  if (method === 'he') {
    scale = Math.sqrt(2 / fanIn);
  } else if (method === 'uniform') {
    scale = Math.sqrt(1 / fanIn);
  } else {
    // xavier (glorot)
    scale = Math.sqrt(2 / (fanIn + fanOut));
  }
  for (let j = 0; j < fanOut; j++) {
    W[j] = [];
    for (let k = 0; k < fanIn; k++) {
      W[j][k] = (rng() - 0.5) * 2 * scale;
    }
  }
  return W;
}

/**
 * Forward pass through layers
 * @param {Array} layers - Array of { W, b } layer objects
 * @param {number[]} input - Input vector
 * @param {string} activation - Hidden layer activation name
 * @param {string} outputActivation - Output layer activation name
 * @returns {{ acts: number[][], pres: number[][] }} Activations and pre-activations per layer
 */
export function forwardPass(layers, input, activation, outputActivation) {
  const act = activations[activation] || activations.relu;
  const acts = [input.slice()];
  const pres = [input.slice()];
  let a = input.slice();

  for (let l = 0; l < layers.length; l++) {
    const { W, b } = layers[l];
    const z = W.map((row, j) => row.reduce((s, w, k) => s + w * a[k], b[j]));
    pres.push([...z]);

    if (l === layers.length - 1) {
      a = applyOutputActivation(z, outputActivation);
    } else {
      a = z.map(v => act(v));
    }
    acts.push([...a]);
  }
  return { acts, pres };
}

/**
 * Backward pass — computes deltas and updates weights in-place
 * @param {Array} layers - Array of { W, b } layer objects
 * @param {number[][]} acts - Activations from forward pass
 * @param {number[][]} pres - Pre-activations from forward pass
 * @param {number[]} target - Target output vector
 * @param {number} lr - Learning rate
 * @param {Object} [opts] - Options
 * @param {number} [opts.gradientClip=1] - Max gradient magnitude
 * @param {string} [opts.activation='relu'] - Hidden activation name
 * @param {string} [opts.outputActivation='linear'] - Output activation name
 */
export function backwardPass(layers, acts, pres, target, lr, opts = {}) {
  const { gradientClip = 1, activation = 'relu', outputActivation = 'linear' } = opts;
  const actDeriv = activationDerivs[activation] || activationDerivs.relu;
  const L = layers.length;
  const deltas = [];

  // Output layer delta
  if (outputActivation === 'sigmoid') {
    deltas[L - 1] = acts[L].map((o, i) => (o - target[i]) * o * (1 - o));
  } else {
    // softmax+cross-entropy or linear: gradient simplifies to (output - target)
    deltas[L - 1] = acts[L].map((o, i) => o - target[i]);
  }

  // Hidden layer deltas
  for (let l = L - 2; l >= 0; l--) {
    const Wn = layers[l + 1].W;
    deltas[l] = layers[l].W.map((_, j) => {
      const s = Wn.reduce((sum, row, k) => sum + row[j] * deltas[l + 1][k], 0);
      return s * actDeriv(pres[l + 1][j]);
    });
  }

  // Weight updates with gradient clipping
  const clip = v => Math.max(-gradientClip, Math.min(gradientClip, v));
  for (let l = 0; l < L; l++) {
    const { W, b } = layers[l];
    const a = acts[l], d = deltas[l];
    for (let j = 0; j < W.length; j++) {
      for (let k = 0; k < W[j].length; k++) {
        W[j][k] -= lr * clip(d[j] * a[k]);
      }
      b[j] -= lr * clip(d[j]);
    }
  }
}

/**
 * Apply output activation to a vector
 */
function applyOutputActivation(z, name) {
  if (name === 'sigmoid') {
    return z.map(v => 1 / (1 + Math.exp(-v)));
  }
  if (name === 'softmax') {
    const max = Math.max(...z);
    const exps = z.map(v => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }
  return [...z]; // linear
}

/**
 * Create a multi-layer feedforward neural network
 * @param {number[]} sizes - Layer sizes, e.g. [4, 16, 3]
 * @param {Object} [opts] - Configuration
 * @param {string} [opts.activation='relu'] - Hidden activation: 'relu', 'tanh', 'sigmoid', 'linear'
 * @param {string} [opts.outputActivation='linear'] - Output activation: 'linear', 'sigmoid', 'softmax'
 * @param {string} [opts.initMethod='xavier'] - Weight init: 'xavier', 'he', 'uniform'
 * @param {Function} [opts.rng] - Random number generator (0-1)
 * @returns {Object} Network object with forward, backward, predict, train, clone, etc.
 */
export function createNetwork(sizes, opts = {}) {
  const {
    activation = 'relu',
    outputActivation = 'linear',
    initMethod = 'xavier',
    rng = Math.random,
  } = opts;

  const layers = [];
  for (let i = 0; i < sizes.length - 1; i++) {
    const [fanIn, fanOut] = [sizes[i], sizes[i + 1]];
    const W = initWeights(fanIn, fanOut, initMethod, rng);
    const b = new Array(fanOut).fill(0);
    layers.push({ W, b });
  }

  const net = {
    sizes,
    layers,
    activation,
    outputActivation,

    /** Forward pass returning activations and pre-activations */
    forward(input) {
      return forwardPass(layers, input, activation, outputActivation);
    },

    /** Get output prediction for an input */
    predict(input) {
      const { acts } = forwardPass(layers, input, activation, outputActivation);
      return acts[layers.length];
    },

    /** Get hidden layer activations (excludes input and output) */
    getActivations(input) {
      const { acts } = forwardPass(layers, input, activation, outputActivation);
      return acts.slice(1, -1);
    },

    /** Backward pass — updates weights in-place */
    backward(acts, pres, target, lr, gradientClip = 1) {
      backwardPass(layers, acts, pres, target, lr, {
        gradientClip, activation, outputActivation,
      });
    },

    /** Train on a batch of (input, target) pairs, returns mean loss */
    train(inputs, targets, lr) {
      let loss = 0;
      for (let i = 0; i < inputs.length; i++) {
        const { acts, pres } = net.forward(inputs[i]);
        const out = acts[acts.length - 1];
        loss += out.reduce((s, o, j) => s + (o - targets[i][j]) ** 2, 0) / out.length;
        net.backward(acts, pres, targets[i], lr);
      }
      return loss / inputs.length;
    },

    /** Count total parameters (weights + biases) */
    countParams() {
      return layers.reduce((sum, l) => sum + l.W.length * l.W[0].length + l.b.length, 0);
    },

    /** Deep clone the network */
    clone() {
      const c = createNetwork(sizes, { activation, outputActivation, initMethod, rng });
      layers.forEach((l, i) => {
        c.layers[i].W = l.W.map(r => [...r]);
        c.layers[i].b = [...l.b];
      });
      return c;
    },
  };

  return net;
}
