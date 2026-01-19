/**
 * Evolver - Base class for state evolution strategies
 *
 * An Evolver transforms the current perception field into
 * the next state. This is where the "neural" part of NCA lives.
 *
 * Architecture (default):
 *   Perception -> Dense -> Activation -> Dense -> Output
 *
 * The evolver's weights can be:
 * - Random (emergence through chaos)
 * - Hand-crafted (classic CA rules)
 * - Learned (via gradient descent on loss)
 */

export class Evolver {
  /**
   * @param {Object} config
   * @param {number} config.inputChannels - Input size (perception field * channels)
   * @param {number} config.hiddenDim - Hidden layer size
   * @param {number} config.outputChannels - Output channels per cell
   * @param {string} [config.activation='relu'] - Activation function
   * @param {boolean} [config.useBias=true] - Include bias terms
   */
  constructor(config = {}) {
    this.inputChannels = config.inputChannels || 36; // 9 neighbors * 4 channels
    this.hiddenDim = config.hiddenDim || 64;
    this.outputChannels = config.outputChannels || 4;
    this.activation = config.activation || 'relu';
    this.useBias = config.useBias !== false;

    // Learnable parameters
    this.weights = {};
    this.biases = {};
    this.gradients = {};

    // Learning state
    this.learningRate = config.learningRate || 0.001;
    this.isTraining = false;
  }

  /**
   * Initialize weights with random values
   * @param {string} init - 'random' | 'xavier' | 'he' | 'zero'
   */
  initWeights(init = 'xavier') {
    const { inputChannels, hiddenDim, outputChannels } = this;

    this.weights.w1 = this._initMatrix(inputChannels, hiddenDim, init);
    this.weights.w2 = this._initMatrix(hiddenDim, outputChannels, init);

    if (this.useBias) {
      this.biases.b1 = new Float32Array(hiddenDim);
      this.biases.b2 = new Float32Array(outputChannels);
    }

    return this;
  }

  _initMatrix(rows, cols, init) {
    const size = rows * cols;
    const matrix = new Float32Array(size);

    switch (init) {
      case 'xavier':
        // Xavier/Glorot initialization
        const stdXavier = Math.sqrt(2 / (rows + cols));
        for (let i = 0; i < size; i++) {
          matrix[i] = (Math.random() * 2 - 1) * stdXavier;
        }
        break;

      case 'he':
        // He initialization (for ReLU)
        const stdHe = Math.sqrt(2 / rows);
        for (let i = 0; i < size; i++) {
          matrix[i] = (Math.random() * 2 - 1) * stdHe;
        }
        break;

      case 'random':
        for (let i = 0; i < size; i++) {
          matrix[i] = Math.random() * 2 - 1;
        }
        break;

      case 'zero':
      default:
        // Already zero-initialized
        break;
    }

    return matrix;
  }

  /**
   * Forward pass through the network
   * Must be implemented by subclasses
   * @param {Float32Array} perception - Perception field data
   * @returns {Float32Array} - Next state
   */
  forward(perception) {
    throw new Error('Evolver.forward() must be implemented by subclass');
  }

  /**
   * Apply activation function
   */
  _activate(x) {
    const result = new Float32Array(x.length);
    switch (this.activation) {
      case 'relu':
        for (let i = 0; i < x.length; i++) {
          result[i] = Math.max(0, x[i]);
        }
        break;

      case 'leaky_relu':
        for (let i = 0; i < x.length; i++) {
          result[i] = x[i] > 0 ? x[i] : 0.01 * x[i];
        }
        break;

      case 'tanh':
        for (let i = 0; i < x.length; i++) {
          result[i] = Math.tanh(x[i]);
        }
        break;

      case 'sigmoid':
        for (let i = 0; i < x.length; i++) {
          result[i] = 1 / (1 + Math.exp(-x[i]));
        }
        break;

      case 'gelu':
        // Gaussian Error Linear Unit
        for (let i = 0; i < x.length; i++) {
          const cdf = 0.5 * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x[i] + 0.044715 * x[i] * x[i] * x[i])));
          result[i] = x[i] * cdf;
        }
        break;

      case 'sin':
        // Sinusoidal (for periodic patterns)
        for (let i = 0; i < x.length; i++) {
          result[i] = Math.sin(x[i]);
        }
        break;

      case 'identity':
      default:
        result.set(x);
        break;
    }
    return result;
  }

  /**
   * Matrix-vector multiplication: y = Wx + b
   */
  _matmul(W, x, b, rows, cols) {
    const y = new Float32Array(rows);
    for (let i = 0; i < rows; i++) {
      let sum = b ? b[i] : 0;
      for (let j = 0; j < cols; j++) {
        sum += W[i * cols + j] * x[j];
      }
      y[i] = sum;
    }
    return y;
  }

  /**
   * Batched forward pass for entire grid
   * @param {Float32Array} perceptionBatch - Shape: [N, inputChannels]
   * @param {number} batchSize - Number of cells
   */
  forwardBatch(perceptionBatch, batchSize) {
    const output = new Float32Array(batchSize * this.outputChannels);

    for (let i = 0; i < batchSize; i++) {
      const start = i * this.inputChannels;
      const cell = perceptionBatch.subarray(start, start + this.inputChannels);
      const result = this.forward(cell);

      output.set(result, i * this.outputChannels);
    }

    return output;
  }

  /**
   * Backward pass for training
   * Computes gradients given loss
   */
  backward(loss, perception, output) {
    // To be implemented for training support
    // For now, Cann focuses on emergence rather than training
    throw new Error('Training not yet implemented');
  }

  /**
   * Update weights using gradients
   */
  updateWeights() {
    if (!this.isTraining) return;

    for (const key in this.weights) {
      const grad = this.gradients[key];
      if (!grad) continue;

      const w = this.weights[key];
      for (let i = 0; i < w.length; i++) {
        w[i] -= this.learningRate * grad[i];
      }
    }
  }

  /**
   * Get weights for serialization
   */
  getWeights() {
    return {
      weights: Object.fromEntries(
        Object.entries(this.weights).map(([k, v]) => [k, Array.from(v)])
      ),
      biases: Object.fromEntries(
        Object.entries(this.biases).map(([k, v]) => [k, Array.from(v)])
      )
    };
  }

  /**
   * Load weights from serialized form
   */
  setWeights(data) {
    for (const key in data.weights) {
      this.weights[key] = new Float32Array(data.weights[key]);
    }
    for (const key in data.biases) {
      this.biases[key] = new Float32Array(data.biases[key]);
    }
    return this;
  }

  /**
   * Get configuration
   */
  getConfig() {
    return {
      inputChannels: this.inputChannels,
      hiddenDim: this.hiddenDim,
      outputChannels: this.outputChannels,
      activation: this.activation,
      useBias: this.useBias,
      learningRate: this.learningRate
    };
  }

  /**
   * Mutate weights for evolutionary optimization
   * @param {number} rate - Mutation rate (0-1)
   * @param {number} strength - Mutation strength
   */
  mutate(rate = 0.1, strength = 0.1) {
    for (const key in this.weights) {
      const w = this.weights[key];
      for (let i = 0; i < w.length; i++) {
        if (Math.random() < rate) {
          w[i] += (Math.random() * 2 - 1) * strength;
        }
      }
    }
    return this;
  }

  /**
   * Crossover with another evolver
   * @param {Evolver} other
   * @returns {Evolver} Child evolver
   */
  crossover(other) {
    const child = new this.constructor(this.getConfig());
    child.initWeights('zero');

    for (const key in this.weights) {
      const w1 = this.weights[key];
      const w2 = other.weights[key];
      const wc = child.weights[key];

      for (let i = 0; i < w1.length; i++) {
        // Uniform crossover
        wc[i] = Math.random() < 0.5 ? w1[i] : w2[i];
      }
    }

    return child;
  }
}
