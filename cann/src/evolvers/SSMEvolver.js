/**
 * SSMEvolver - State Space Model Evolution
 *
 * x[t+1] = f(x[t], h[t])
 * h[t+1] = g(x[t], h[t])
 *
 * Unlike Markovian evolution, SSM maintains a hidden state
 * that carries temporal information across generations.
 * This enables:
 * - Memory of past states
 * - Attention to temporal patterns
 * - More complex dynamics (oscillations, waves, etc.)
 *
 * Architecture:
 *   Perception + Hidden -> GRU-like update -> Output + NewHidden
 *
 * Inspired by:
 * - GRU (Gated Recurrent Units)
 * - S4 (Structured State Space Models)
 * - Temporal attention in Neural CA
 */

import { Evolver } from '../core/Evolver.js';

export class SSMEvolver extends Evolver {
  /**
   * @param {Object} config
   * @param {number} config.inputChannels - Perception field size
   * @param {number} config.hiddenDim - Hidden state dimension
   * @param {number} config.outputChannels - Output channels
   * @param {number} [config.historyDepth=4] - Number of past states to attend to
   * @param {string} [config.gateType='gru'] - 'gru' | 'lstm' | 'simple'
   * @param {boolean} [config.useAttention=false] - Use temporal attention
   */
  constructor(config = {}) {
    super(config);

    this.historyDepth = config.historyDepth || 4;
    this.gateType = config.gateType || 'gru';
    this.useAttention = config.useAttention || false;

    // Additional weights for gated updates
    this._initGateWeights();
  }

  _initGateWeights() {
    const { inputChannels, hiddenDim, outputChannels } = this;
    const combinedInput = inputChannels + hiddenDim;

    switch (this.gateType) {
      case 'gru':
        // Reset gate: controls how much past hidden state to forget
        this.weights.wr = this._initMatrix(hiddenDim, combinedInput, 'xavier');
        this.biases.br = new Float32Array(hiddenDim);

        // Update gate: controls blend between old and new hidden state
        this.weights.wz = this._initMatrix(hiddenDim, combinedInput, 'xavier');
        this.biases.bz = new Float32Array(hiddenDim);

        // Candidate hidden state
        this.weights.wh = this._initMatrix(hiddenDim, combinedInput, 'xavier');
        this.biases.bh = new Float32Array(hiddenDim);
        break;

      case 'lstm':
        // Forget, input, output, cell gates
        this.weights.wf = this._initMatrix(hiddenDim, combinedInput, 'xavier');
        this.weights.wi = this._initMatrix(hiddenDim, combinedInput, 'xavier');
        this.weights.wo = this._initMatrix(hiddenDim, combinedInput, 'xavier');
        this.weights.wc = this._initMatrix(hiddenDim, combinedInput, 'xavier');
        this.biases.bf = new Float32Array(hiddenDim).fill(1); // Forget bias = 1
        this.biases.bi = new Float32Array(hiddenDim);
        this.biases.bo = new Float32Array(hiddenDim);
        this.biases.bc = new Float32Array(hiddenDim);
        break;

      case 'simple':
      default:
        // Simple linear combination
        this.weights.wh = this._initMatrix(hiddenDim, combinedInput, 'xavier');
        this.biases.bh = new Float32Array(hiddenDim);
        break;
    }

    // Output projection
    this.weights.wo_proj = this._initMatrix(outputChannels, hiddenDim, 'xavier');
    this.biases.bo_proj = new Float32Array(outputChannels);

    // Temporal attention weights (if enabled)
    if (this.useAttention) {
      this.weights.wa_q = this._initMatrix(hiddenDim, hiddenDim, 'xavier');
      this.weights.wa_k = this._initMatrix(hiddenDim, hiddenDim, 'xavier');
      this.weights.wa_v = this._initMatrix(hiddenDim, hiddenDim, 'xavier');
    }
  }

  /**
   * Initialize hidden state for grid
   * @param {number} width
   * @param {number} height
   */
  initHidden(width, height) {
    return new Float32Array(width * height * this.hiddenDim);
  }

  /**
   * Forward pass with hidden state
   * @param {Float32Array} perception - Current perception field
   * @param {Float32Array} hidden - Current hidden state for this cell
   * @param {Array<Float32Array>} history - Past states (optional)
   * @returns {{ output: Float32Array, hidden: Float32Array }}
   */
  forward(perception, hidden, history = []) {
    if (!hidden) {
      hidden = new Float32Array(this.hiddenDim);
    }

    // Concatenate perception and hidden state
    const combined = new Float32Array(this.inputChannels + this.hiddenDim);
    combined.set(perception);
    combined.set(hidden, this.inputChannels);

    let newHidden;

    switch (this.gateType) {
      case 'gru':
        newHidden = this._gruUpdate(combined, hidden);
        break;
      case 'lstm':
        newHidden = this._lstmUpdate(combined, hidden);
        break;
      default:
        newHidden = this._simpleUpdate(combined);
    }

    // Optional temporal attention over history
    if (this.useAttention && history.length > 0) {
      newHidden = this._temporalAttention(newHidden, history);
    }

    // Project to output
    const output = this._matmul(
      this.weights.wo_proj,
      newHidden,
      this.biases.bo_proj,
      this.outputChannels,
      this.hiddenDim
    );

    // Clamp output to [0, 1]
    for (let i = 0; i < output.length; i++) {
      output[i] = Math.max(0, Math.min(1, output[i]));
    }

    return { output, hidden: newHidden };
  }

  _gruUpdate(combined, prevHidden) {
    const { wr, wz, wh } = this.weights;
    const { br, bz, bh } = this.biases;
    const combinedSize = this.inputChannels + this.hiddenDim;

    // Reset gate
    const r = this._sigmoid(
      this._matmul(wr, combined, br, this.hiddenDim, combinedSize)
    );

    // Update gate
    const z = this._sigmoid(
      this._matmul(wz, combined, bz, this.hiddenDim, combinedSize)
    );

    // Candidate hidden state (using reset gate)
    const resetHidden = new Float32Array(combinedSize);
    resetHidden.set(combined.subarray(0, this.inputChannels));
    for (let i = 0; i < this.hiddenDim; i++) {
      resetHidden[this.inputChannels + i] = r[i] * prevHidden[i];
    }
    const hCandidate = this._activate(
      this._matmul(wh, resetHidden, bh, this.hiddenDim, combinedSize)
    );

    // New hidden state: blend of old and candidate
    const newHidden = new Float32Array(this.hiddenDim);
    for (let i = 0; i < this.hiddenDim; i++) {
      newHidden[i] = (1 - z[i]) * prevHidden[i] + z[i] * hCandidate[i];
    }

    return newHidden;
  }

  _lstmUpdate(combined, prevHidden) {
    const { wf, wi, wo, wc } = this.weights;
    const { bf, bi, bo, bc } = this.biases;
    const combinedSize = this.inputChannels + this.hiddenDim;

    // Gates
    const f = this._sigmoid(this._matmul(wf, combined, bf, this.hiddenDim, combinedSize));
    const i = this._sigmoid(this._matmul(wi, combined, bi, this.hiddenDim, combinedSize));
    const o = this._sigmoid(this._matmul(wo, combined, bo, this.hiddenDim, combinedSize));
    const cCandidate = this._activate(this._matmul(wc, combined, bc, this.hiddenDim, combinedSize));

    // Cell state update (simplified - no separate cell state)
    const newHidden = new Float32Array(this.hiddenDim);
    for (let j = 0; j < this.hiddenDim; j++) {
      const cell = f[j] * prevHidden[j] + i[j] * cCandidate[j];
      newHidden[j] = o[j] * Math.tanh(cell);
    }

    return newHidden;
  }

  _simpleUpdate(combined) {
    const { wh } = this.weights;
    const { bh } = this.biases;
    const combinedSize = this.inputChannels + this.hiddenDim;

    return this._activate(
      this._matmul(wh, combined, bh, this.hiddenDim, combinedSize)
    );
  }

  _temporalAttention(query, history) {
    if (history.length === 0) return query;

    const { wa_q, wa_k, wa_v } = this.weights;
    const d = this.hiddenDim;
    const scale = 1 / Math.sqrt(d);

    // Compute query
    const Q = this._matmul(wa_q, query, null, d, d);

    // Compute attention over history
    let weightedSum = new Float32Array(d);
    let totalWeight = 0;

    for (const past of history) {
      // Key and Value from past state
      const K = this._matmul(wa_k, past, null, d, d);
      const V = this._matmul(wa_v, past, null, d, d);

      // Attention score: dot(Q, K) * scale
      let score = 0;
      for (let i = 0; i < d; i++) {
        score += Q[i] * K[i];
      }
      score *= scale;
      const weight = Math.exp(score);
      totalWeight += weight;

      // Accumulate weighted value
      for (let i = 0; i < d; i++) {
        weightedSum[i] += weight * V[i];
      }
    }

    // Normalize
    if (totalWeight > 0) {
      for (let i = 0; i < d; i++) {
        weightedSum[i] /= totalWeight;
      }
    }

    // Residual connection
    const output = new Float32Array(d);
    for (let i = 0; i < d; i++) {
      output[i] = query[i] + weightedSum[i];
    }

    return output;
  }

  _sigmoid(x) {
    const result = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) {
      result[i] = 1 / (1 + Math.exp(-x[i]));
    }
    return result;
  }

  /**
   * Process entire grid with hidden state
   */
  forwardGrid(perceptionField, hiddenState, gridWidth, gridHeight, history = []) {
    const batchSize = gridWidth * gridHeight;
    const outputData = new Float32Array(batchSize * this.outputChannels);
    const newHiddenData = new Float32Array(batchSize * this.hiddenDim);

    for (let i = 0; i < batchSize; i++) {
      const pStart = i * this.inputChannels;
      const hStart = i * this.hiddenDim;

      const perception = perceptionField.subarray(pStart, pStart + this.inputChannels);
      const hidden = hiddenState.subarray(hStart, hStart + this.hiddenDim);

      const result = this.forward(perception, hidden, history);

      outputData.set(result.output, i * this.outputChannels);
      newHiddenData.set(result.hidden, hStart);
    }

    return { output: outputData, hidden: newHiddenData };
  }

  getConfig() {
    return {
      ...super.getConfig(),
      type: 'ssm',
      historyDepth: this.historyDepth,
      gateType: this.gateType,
      useAttention: this.useAttention
    };
  }
}
