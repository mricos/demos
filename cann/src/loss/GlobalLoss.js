/**
 * GlobalLoss - Population-level objective functions
 *
 * Computes loss over entire grid state, capturing emergent
 * properties that local rules cannot express:
 *
 * - Density: Population fraction
 * - Entropy: Information content / disorder
 * - Fractal dimension: Scale-invariant complexity
 * - Temporal stability: Change rate over time
 * - Spatial distribution: Clustering, uniformity
 *
 * These act as "boundary conditions" that shape what
 * patterns can emerge while local rules drive the dynamics.
 */

import { Loss } from '../core/Loss.js';

export class GlobalLoss extends Loss {
  /**
   * @param {Object} config
   * @param {string} config.type - 'density' | 'entropy' | 'stability' | 'complexity' | 'distribution' | 'custom'
   * @param {number} [config.target] - Target value (for density, entropy, etc.)
   * @param {Function} [config.fn] - Custom loss function
   */
  constructor(config = {}) {
    super(config);
    this.type = config.type || 'entropy';
    this.target = config.target;
    this.customFn = config.fn || null;
    this.name = `global_${this.type}`;

    // History for temporal metrics
    this._history = [];
    this._historyLength = config.historyLength || 10;
  }

  compute(grid, context = {}) {
    // Update history
    if (context.generation !== undefined) {
      const stats = grid.getStats();
      this._history.push({
        generation: context.generation,
        density: stats.density,
        mean: Array.from(stats.mean)
      });
      if (this._history.length > this._historyLength) {
        this._history.shift();
      }
    }

    switch (this.type) {
      case 'density':
        return this._densityLoss(grid);
      case 'entropy':
        return this._entropyLoss(grid);
      case 'stability':
        return this._stabilityLoss(grid, context);
      case 'complexity':
        return this._complexityLoss(grid);
      case 'distribution':
        return this._distributionLoss(grid);
      case 'periodicity':
        return this._periodicityLoss(grid, context);
      case 'diversity':
        return this._diversityLoss(grid);
      case 'custom':
        return this.customFn ? this.customFn(grid, context) : 0;
      default:
        return 0;
    }
  }

  /**
   * Density loss: penalizes deviation from target population density
   */
  _densityLoss(grid) {
    const stats = grid.getStats();
    const target = this.target ?? 0.3; // Default 30% density

    return Math.pow(stats.density - target, 2);
  }

  /**
   * Entropy loss: Shannon entropy of cell values
   * High entropy = disorder, Low entropy = order
   */
  _entropyLoss(grid) {
    const { width, height, channels } = grid;
    const data = grid.getData();

    // Discretize values into bins for histogram
    const numBins = 32;
    const histogram = new Float32Array(numBins);

    for (let i = 0; i < data.length; i++) {
      const bin = Math.min(numBins - 1, Math.floor(data[i] * numBins));
      histogram[bin]++;
    }

    // Compute entropy
    const total = data.length;
    let entropy = 0;
    for (let i = 0; i < numBins; i++) {
      if (histogram[i] > 0) {
        const p = histogram[i] / total;
        entropy -= p * Math.log2(p);
      }
    }

    // Normalize to [0, 1]
    const maxEntropy = Math.log2(numBins);
    const normalizedEntropy = entropy / maxEntropy;

    // Return loss (squared deviation from target if specified)
    if (this.target !== undefined) {
      return Math.pow(normalizedEntropy - this.target, 2);
    }
    return normalizedEntropy;
  }

  /**
   * Stability loss: measures temporal change rate
   * Low loss = stable patterns
   */
  _stabilityLoss(grid, context) {
    if (this._history.length < 2) return 0;

    const current = grid.getStats();
    const previous = this._history[this._history.length - 2];

    // Compare density change
    const densityChange = Math.abs(current.density - previous.density);

    // Compare mean values change
    let meanChange = 0;
    for (let c = 0; c < current.mean.length; c++) {
      meanChange += Math.abs(current.mean[c] - previous.mean[c]);
    }
    meanChange /= current.mean.length;

    return densityChange + meanChange;
  }

  /**
   * Complexity loss: approximate measure of pattern complexity
   * Uses compression-based approach (run-length encoding size)
   */
  _complexityLoss(grid) {
    const { width, height } = grid;
    const data = grid.getData();

    // Simple RLE-based complexity measure
    let runs = 0;
    let prevVal = -1;
    const threshold = 0.1;

    for (let i = 0; i < data.length; i += grid.channels) {
      const val = data[i] > threshold ? 1 : 0;
      if (val !== prevVal) {
        runs++;
        prevVal = val;
      }
    }

    // Normalized complexity (1 = maximum complexity, 0 = uniform)
    const maxRuns = width * height;
    const complexity = runs / maxRuns;

    if (this.target !== undefined) {
      return Math.pow(complexity - this.target, 2);
    }
    return complexity;
  }

  /**
   * Distribution loss: measures spatial uniformity
   * Divides grid into quadrants and compares densities
   */
  _distributionLoss(grid) {
    const { width, height, channels } = grid;
    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);

    // Compute density in each quadrant
    const quadrants = [
      { x0: 0, y0: 0, x1: halfW, y1: halfH },
      { x0: halfW, y0: 0, x1: width, y1: halfH },
      { x0: 0, y0: halfH, x1: halfW, y1: height },
      { x0: halfW, y0: halfH, x1: width, y1: height }
    ];

    const densities = quadrants.map(q => {
      let sum = 0;
      let count = 0;
      for (let y = q.y0; y < q.y1; y++) {
        for (let x = q.x0; x < q.x1; x++) {
          sum += grid.getChannel(x, y, 0);
          count++;
        }
      }
      return count > 0 ? sum / count : 0;
    });

    // Variance of quadrant densities
    const mean = densities.reduce((a, b) => a + b, 0) / densities.length;
    const variance = densities.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / densities.length;

    return variance;
  }

  /**
   * Periodicity loss: detects repeating temporal patterns
   * Useful for oscillators and gliders
   */
  _periodicityLoss(grid, context) {
    if (this._history.length < 4) return 0;

    // Check if density is periodic
    const densities = this._history.map(h => h.density);

    // Autocorrelation at different lags
    let maxCorr = 0;
    for (let lag = 1; lag < Math.floor(densities.length / 2); lag++) {
      let corr = 0;
      let count = 0;
      for (let i = 0; i < densities.length - lag; i++) {
        corr += densities[i] * densities[i + lag];
        count++;
      }
      if (count > 0) {
        corr /= count;
        maxCorr = Math.max(maxCorr, Math.abs(corr));
      }
    }

    if (this.target !== undefined) {
      return Math.pow(maxCorr - this.target, 2);
    }
    return maxCorr;
  }

  /**
   * Diversity loss: penalizes uniformity across channels
   * Encourages different channels to have different values
   */
  _diversityLoss(grid) {
    const stats = grid.getStats();
    const { mean, variance } = stats;

    // Variance of means across channels
    const channelMean = mean.reduce((a, b) => a + b, 0) / mean.length;
    let channelVariance = 0;
    for (let c = 0; c < mean.length; c++) {
      channelVariance += Math.pow(mean[c] - channelMean, 2);
    }
    channelVariance /= mean.length;

    // Low channel variance = low diversity = high loss
    const diversity = Math.sqrt(channelVariance);
    return 1 - diversity; // Invert so low diversity = high loss
  }

  getConfig() {
    return {
      ...super.getConfig(),
      type: this.type,
      target: this.target,
      historyLength: this._historyLength
    };
  }

  /**
   * Reset history (call when restarting simulation)
   */
  reset() {
    this._history = [];
  }
}

/**
 * Predefined global loss configurations
 */
GlobalLoss.presets = {
  sparsePopulation: {
    type: 'density',
    target: 0.1,
    weight: 1.0
  },
  balancedPopulation: {
    type: 'density',
    target: 0.3,
    weight: 1.0
  },
  highEntropy: {
    type: 'entropy',
    target: 0.8,
    weight: 1.0
  },
  stable: {
    type: 'stability',
    weight: 1.0
  },
  complex: {
    type: 'complexity',
    target: 0.5,
    weight: 1.0
  },
  uniform: {
    type: 'distribution',
    weight: 1.0
  },
  oscillating: {
    type: 'periodicity',
    target: 0.5,
    weight: 1.0
  }
};
