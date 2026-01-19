/**
 * Loss - Base class for objective functions
 *
 * In Neural CA, loss functions guide what patterns emerge.
 * Unlike traditional NN training where loss drives gradient descent,
 * in Cann loss can be used for:
 * - Fitness evaluation in evolutionary optimization
 * - Real-time feedback for interactive exploration
 * - Monitoring pattern health and stability
 *
 * Loss Types:
 * - Local: Computed per-cell based on neighborhood
 * - Global: Computed over entire population
 */

export class Loss {
  constructor(config = {}) {
    this.weight = config.weight ?? 1.0;
    this.name = config.name || 'loss';
  }

  /**
   * Compute loss for given grid state
   * @param {Grid} grid
   * @param {Object} context - Additional context (generation, history, etc.)
   * @returns {number}
   */
  compute(grid, context = {}) {
    throw new Error('Loss.compute() must be implemented by subclass');
  }

  /**
   * Compute gradient (for training)
   */
  gradient(grid, context = {}) {
    throw new Error('Loss.gradient() not implemented');
  }

  getConfig() {
    return {
      name: this.name,
      weight: this.weight
    };
  }
}
