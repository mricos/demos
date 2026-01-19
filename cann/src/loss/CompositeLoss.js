/**
 * CompositeLoss - Combines Local and Global losses
 *
 * The key innovation in Cann is the dual objective:
 *
 *   L_total = α * L_local + β * L_global
 *
 * Where:
 *   L_local: Neighborhood-based rules (like Game of Life)
 *   L_global: Population statistics (density, entropy, etc.)
 *
 * This creates a tension between:
 *   - Local dynamics: How cells interact with neighbors
 *   - Global constraints: What the overall pattern should look like
 *
 * The balance α/β determines whether local or global objectives dominate.
 */

import { Loss } from '../core/Loss.js';
import { LocalLoss } from './LocalLoss.js';
import { GlobalLoss } from './GlobalLoss.js';

export class CompositeLoss extends Loss {
  /**
   * @param {Object} config
   * @param {number} [config.localWeight=0.5] - Weight for local loss (α)
   * @param {number} [config.globalWeight=0.5] - Weight for global loss (β)
   * @param {Object} [config.localConfig] - LocalLoss configuration
   * @param {Object} [config.globalConfig] - GlobalLoss configuration
   * @param {Array<Loss>} [config.additionalLosses] - Extra loss functions
   */
  constructor(config = {}) {
    super(config);

    this.localWeight = config.localWeight ?? 0.5;
    this.globalWeight = config.globalWeight ?? 0.5;

    // Initialize component losses
    this.localLoss = new LocalLoss(config.localConfig || {});
    this.globalLoss = new GlobalLoss(config.globalConfig || {});

    // Additional losses (for extensibility)
    this.additionalLosses = config.additionalLosses || [];

    this.name = 'composite';
  }

  /**
   * Compute combined loss
   * @returns {{ local: number, global: number, total: number, additional: Object }}
   */
  compute(grid, context = {}) {
    const local = this.localLoss.compute(grid, context) * this.localWeight;
    const global = this.globalLoss.compute(grid, context) * this.globalWeight;

    // Compute additional losses
    const additional = {};
    let additionalSum = 0;
    for (const loss of this.additionalLosses) {
      const value = loss.compute(grid, context) * loss.weight;
      additional[loss.name] = value;
      additionalSum += value;
    }

    const total = local + global + additionalSum;

    return {
      local,
      global,
      total,
      additional,
      breakdown: {
        localRaw: local / this.localWeight,
        globalRaw: global / this.globalWeight
      }
    };
  }

  /**
   * Add a custom loss function
   */
  addLoss(loss) {
    this.additionalLosses.push(loss);
    return this;
  }

  /**
   * Remove a loss function by name
   */
  removeLoss(name) {
    this.additionalLosses = this.additionalLosses.filter(l => l.name !== name);
    return this;
  }

  /**
   * Set local loss configuration
   */
  setLocalConfig(config) {
    this.localLoss = new LocalLoss(config);
    return this;
  }

  /**
   * Set global loss configuration
   */
  setGlobalConfig(config) {
    this.globalLoss = new GlobalLoss(config);
    return this;
  }

  /**
   * Adjust balance between local and global
   * @param {number} blend - 0 = all local, 1 = all global
   */
  setBlend(blend) {
    this.localWeight = 1 - blend;
    this.globalWeight = blend;
    return this;
  }

  getConfig() {
    return {
      ...super.getConfig(),
      localWeight: this.localWeight,
      globalWeight: this.globalWeight,
      localConfig: this.localLoss.getConfig(),
      globalConfig: this.globalLoss.getConfig(),
      additionalLosses: this.additionalLosses.map(l => l.getConfig())
    };
  }

  /**
   * Reset temporal state (call when restarting simulation)
   */
  reset() {
    this.globalLoss.reset();
    for (const loss of this.additionalLosses) {
      if (loss.reset) loss.reset();
    }
  }
}

/**
 * Predefined composite loss configurations
 */
CompositeLoss.presets = {
  // Classic CA behavior - local rules dominate
  classicCA: {
    localWeight: 0.9,
    globalWeight: 0.1,
    localConfig: { type: 'rule', rule: { birth: [3], survive: [2, 3] } },
    globalConfig: { type: 'stability' }
  },

  // Pattern emergence - balance local dynamics with global structure
  emergence: {
    localWeight: 0.5,
    globalWeight: 0.5,
    localConfig: { type: 'smoothness' },
    globalConfig: { type: 'complexity', target: 0.5 }
  },

  // Self-organization - global constraints guide local behavior
  selfOrganize: {
    localWeight: 0.3,
    globalWeight: 0.7,
    localConfig: { type: 'gradient' },
    globalConfig: { type: 'distribution' }
  },

  // Oscillation - encourage periodic behavior
  oscillator: {
    localWeight: 0.5,
    globalWeight: 0.5,
    localConfig: { type: 'smoothness' },
    globalConfig: { type: 'periodicity', target: 0.7 }
  },

  // Stability - reward unchanging patterns
  stable: {
    localWeight: 0.2,
    globalWeight: 0.8,
    localConfig: { type: 'smoothness' },
    globalConfig: { type: 'stability' }
  },

  // Creative chaos - encourage complexity and diversity
  creative: {
    localWeight: 0.4,
    globalWeight: 0.6,
    localConfig: { type: 'edge', weight: -1 }, // Reward edges
    globalConfig: { type: 'entropy', target: 0.7 }
  }
};
