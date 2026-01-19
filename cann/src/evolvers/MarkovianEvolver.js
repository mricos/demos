/**
 * MarkovianEvolver - Memoryless state evolution
 *
 * x[t+1] = f(x[t])
 *
 * The next state depends ONLY on the current state.
 * This is the classic Neural CA formulation where a small
 * neural network processes the local perception field.
 *
 * Architecture:
 *   Perception[N] -> Dense[H] -> Activation -> Dense[C] -> Residual -> Output
 *
 * The residual connection helps with stability and allows
 * the network to learn incremental updates.
 */

import { Evolver } from '../core/Evolver.js';

export class MarkovianEvolver extends Evolver {
  /**
   * @param {Object} config
   * @param {number} config.inputChannels - Perception field size
   * @param {number} config.hiddenDim - Hidden layer dimension
   * @param {number} config.outputChannels - Output channels
   * @param {string} [config.activation='relu']
   * @param {boolean} [config.useResidual=true] - Add residual connection
   * @param {number} [config.updateRate=1.0] - Stochastic update probability
   */
  constructor(config = {}) {
    super(config);

    this.useResidual = config.useResidual !== false;
    this.updateRate = config.updateRate ?? 1.0;

    // Initialize weights
    this.initWeights(config.init || 'xavier');
  }

  /**
   * Forward pass: perception -> next state
   * @param {Float32Array} perception - Local perception field
   * @returns {Float32Array} - Next cell state
   */
  forward(perception) {
    const { hiddenDim, outputChannels, inputChannels } = this;
    const { w1, w2 } = this.weights;
    const { b1, b2 } = this.biases;

    // Stochastic update: some cells don't update (helps stability)
    if (this.updateRate < 1.0 && Math.random() > this.updateRate) {
      // Return center cell unchanged
      // Assuming perception has center cell at specific position
      const center = perception.subarray(0, outputChannels);
      return new Float32Array(center);
    }

    // Layer 1: perception -> hidden
    const h1 = this._matmul(w1, perception, b1, hiddenDim, inputChannels);
    const a1 = this._activate(h1);

    // Layer 2: hidden -> output
    const h2 = this._matmul(w2, a1, b2, outputChannels, hiddenDim);

    // Apply residual connection
    const output = new Float32Array(outputChannels);
    if (this.useResidual) {
      // Add to center cell state (first outputChannels of perception)
      for (let i = 0; i < outputChannels; i++) {
        output[i] = perception[i] + h2[i];
      }
    } else {
      output.set(h2);
    }

    // Clamp to [0, 1]
    for (let i = 0; i < outputChannels; i++) {
      output[i] = Math.max(0, Math.min(1, output[i]));
    }

    return output;
  }

  /**
   * Process entire grid in one pass
   * More efficient than cell-by-cell for large grids
   */
  forwardGrid(perceptionField, gridWidth, gridHeight) {
    const batchSize = gridWidth * gridHeight;
    const output = new Float32Array(batchSize * this.outputChannels);

    // Process all cells
    for (let i = 0; i < batchSize; i++) {
      const start = i * this.inputChannels;
      const perception = perceptionField.subarray(start, start + this.inputChannels);
      const result = this.forward(perception);
      output.set(result, i * this.outputChannels);
    }

    return output;
  }

  /**
   * Create from classic CA rule (Game of Life, etc.)
   * Encodes the rule as network weights
   */
  static fromRule(rule, config = {}) {
    const evolver = new MarkovianEvolver({
      inputChannels: 9, // 3x3 neighborhood, 1 channel
      hiddenDim: 32,
      outputChannels: 1,
      useResidual: false,
      ...config
    });

    // Encode rule into weights
    // This maps convolution sum -> rule lookup
    evolver._encodeRule(rule);
    return evolver;
  }

  _encodeRule(rule) {
    // Interpret rule as birth/survive counts
    // rule = { birth: [3], survive: [2, 3] } for Conway's Life

    const birth = rule.birth || [3];
    const survive = rule.survive || [2, 3];

    // Simple encoding: weights that sum neighbors
    // Then threshold based on birth/survive rules
    const w1 = this.weights.w1;
    const w2 = this.weights.w2;

    // First layer: sum all neighbors (excluding center)
    // Assuming center is at index 4 in 3x3 grid
    for (let i = 0; i < 9; i++) {
      if (i !== 4) {
        w1[i] = 1; // Sum all neighbors
      }
      w1[9 + i] = i === 4 ? 1 : 0; // Pass center cell state
    }

    // Second layer: apply birth/survive logic
    // This is approximate - true encoding needs more complex structure
    for (let i = 0; i < this.hiddenDim; i++) {
      if (birth.includes(i)) {
        w2[i] = 0.5; // Birth contribution
      }
      if (survive.includes(i)) {
        w2[this.hiddenDim + i] = 0.5; // Survive contribution
      }
    }
  }

  getConfig() {
    return {
      ...super.getConfig(),
      type: 'markovian',
      useResidual: this.useResidual,
      updateRate: this.updateRate
    };
  }
}
