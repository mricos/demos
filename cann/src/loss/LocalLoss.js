/**
 * LocalLoss - Neighborhood-based objective functions
 *
 * Computes loss per-cell based on local neighborhood properties.
 * Analogous to local rules in traditional CA but expressed as
 * differentiable objectives.
 *
 * Examples:
 * - Smoothness: Penalize sharp gradients
 * - Symmetry: Reward local symmetry
 * - Rule compliance: Match Game of Life rules
 * - Edge detection: Reward/penalize edges
 */

import { Loss } from '../core/Loss.js';

export class LocalLoss extends Loss {
  /**
   * @param {Object} config
   * @param {string} config.type - Loss type: 'smoothness' | 'symmetry' | 'rule' | 'edge' | 'custom'
   * @param {Function} [config.fn] - Custom loss function (for 'custom' type)
   * @param {Object} [config.rule] - Rule specification (for 'rule' type)
   */
  constructor(config = {}) {
    super(config);
    this.type = config.type || 'smoothness';
    this.customFn = config.fn || null;
    this.rule = config.rule || null;
    this.name = `local_${this.type}`;
  }

  compute(grid, context = {}) {
    switch (this.type) {
      case 'smoothness':
        return this._smoothnessLoss(grid);
      case 'symmetry':
        return this._symmetryLoss(grid);
      case 'rule':
        return this._ruleLoss(grid, this.rule);
      case 'edge':
        return this._edgeLoss(grid);
      case 'gradient':
        return this._gradientLoss(grid);
      case 'custom':
        return this.customFn ? this.customFn(grid, context) : 0;
      default:
        return 0;
    }
  }

  /**
   * Smoothness loss: penalizes sharp local gradients
   * Low loss = smooth patterns
   */
  _smoothnessLoss(grid) {
    const { width, height, channels } = grid;
    let loss = 0;
    let count = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = grid.get(x, y);
        const neighbors = grid.getNeighborhood(x, y, 1, 'vonneumann');

        for (const n of neighbors) {
          for (let c = 0; c < channels; c++) {
            const diff = cell[c] - n.value[c];
            loss += diff * diff;
            count++;
          }
        }
      }
    }

    return count > 0 ? loss / count : 0;
  }

  /**
   * Symmetry loss: rewards local bilateral symmetry
   */
  _symmetryLoss(grid) {
    const { width, height, channels } = grid;
    let loss = 0;
    let count = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Horizontal symmetry
        const left = grid.get(x - 1, y);
        const right = grid.get(x + 1, y);
        if (left && right) {
          for (let c = 0; c < channels; c++) {
            const diff = left[c] - right[c];
            loss += diff * diff;
            count++;
          }
        }

        // Vertical symmetry
        const up = grid.get(x, y - 1);
        const down = grid.get(x, y + 1);
        if (up && down) {
          for (let c = 0; c < channels; c++) {
            const diff = up[c] - down[c];
            loss += diff * diff;
            count++;
          }
        }
      }
    }

    return count > 0 ? loss / count : 0;
  }

  /**
   * Rule compliance loss: how well does state follow CA rule?
   * rule = { birth: [3], survive: [2, 3] } for Conway's Life
   */
  _ruleLoss(grid, rule) {
    if (!rule) return 0;

    const { width, height } = grid;
    const birth = rule.birth || [3];
    const survive = rule.survive || [2, 3];
    const threshold = rule.threshold || 0.5;

    let loss = 0;
    let count = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = grid.getChannel(x, y, 0);
        const isAlive = cell > threshold;

        // Count alive neighbors
        const neighbors = grid.getNeighborhood(x, y, 1, 'moore');
        let aliveCount = 0;
        for (const n of neighbors) {
          if (n.value[0] > threshold) aliveCount++;
        }

        // What should the cell be?
        let shouldBeAlive;
        if (isAlive) {
          shouldBeAlive = survive.includes(aliveCount);
        } else {
          shouldBeAlive = birth.includes(aliveCount);
        }

        // Loss is difference from expected
        const target = shouldBeAlive ? 1 : 0;
        loss += (cell - target) * (cell - target);
        count++;
      }
    }

    return count > 0 ? loss / count : 0;
  }

  /**
   * Edge loss: penalizes or rewards sharp edges
   */
  _edgeLoss(grid) {
    const { width, height, channels } = grid;
    let edgeEnergy = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        // Sobel-like edge detection
        for (let c = 0; c < channels; c++) {
          const gx = (
            grid.getChannel(x + 1, y - 1, c) - grid.getChannel(x - 1, y - 1, c) +
            2 * grid.getChannel(x + 1, y, c) - 2 * grid.getChannel(x - 1, y, c) +
            grid.getChannel(x + 1, y + 1, c) - grid.getChannel(x - 1, y + 1, c)
          ) / 4;

          const gy = (
            grid.getChannel(x - 1, y + 1, c) - grid.getChannel(x - 1, y - 1, c) +
            2 * grid.getChannel(x, y + 1, c) - 2 * grid.getChannel(x, y - 1, c) +
            grid.getChannel(x + 1, y + 1, c) - grid.getChannel(x + 1, y - 1, c)
          ) / 4;

          edgeEnergy += gx * gx + gy * gy;
          count++;
        }
      }
    }

    return count > 0 ? edgeEnergy / count : 0;
  }

  /**
   * Gradient magnitude loss: measures overall gradient strength
   */
  _gradientLoss(grid) {
    const { width, height, channels } = grid;
    let gradMag = 0;
    let count = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < channels; c++) {
          const dx = grid.getChannel(x + 1, y, c) - grid.getChannel(x - 1, y, c);
          const dy = grid.getChannel(x, y + 1, c) - grid.getChannel(x, y - 1, c);
          gradMag += Math.sqrt(dx * dx + dy * dy);
          count++;
        }
      }
    }

    return count > 0 ? gradMag / count : 0;
  }

  getConfig() {
    return {
      ...super.getConfig(),
      type: this.type,
      rule: this.rule
    };
  }
}

/**
 * Predefined local loss configurations
 */
LocalLoss.presets = {
  conwayCompliance: {
    type: 'rule',
    rule: { birth: [3], survive: [2, 3] }
  },
  smoothPattern: {
    type: 'smoothness',
    weight: 1.0
  },
  highContrast: {
    type: 'edge',
    weight: -1.0 // Negative weight rewards edges
  },
  symmetric: {
    type: 'symmetry',
    weight: 1.0
  }
};
