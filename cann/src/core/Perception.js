/**
 * Perception - Neighborhood sampling and feature extraction
 *
 * Defines how each cell perceives its local environment.
 * This is the "convolutional" aspect of Neural CA - gathering
 * local information before the neural network processes it.
 *
 * Supports:
 * - Moore (8-connected) and Von Neumann (4-connected) neighborhoods
 * - Variable radius
 * - Sobel-like gradient filters
 * - Custom filter kernels
 */

export class Perception {
  /**
   * @param {Object} config
   * @param {number} [config.radius=1] - Neighborhood radius
   * @param {string} [config.type='moore'] - 'moore' | 'vonneumann' | 'sobel'
   * @param {boolean} [config.includeCenter=true] - Include center cell
   * @param {Array<Array<number>>} [config.customKernel] - Custom kernel weights
   */
  constructor(config = {}) {
    this.radius = config.radius || 1;
    this.type = config.type || 'moore';
    this.includeCenter = config.includeCenter !== false;
    this.customKernel = config.customKernel || null;

    // Build kernel offsets and weights
    this._offsets = [];
    this._weights = [];
    this._buildKernel();

    // Field size = number of samples per cell
    this.fieldSize = this._offsets.length;
  }

  _buildKernel() {
    if (this.customKernel) {
      this._buildCustomKernel();
      return;
    }

    switch (this.type) {
      case 'sobel':
        this._buildSobelKernel();
        break;
      case 'vonneumann':
        this._buildVonNeumannKernel();
        break;
      case 'moore':
      default:
        this._buildMooreKernel();
    }
  }

  _buildMooreKernel() {
    const r = this.radius;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (!this.includeCenter && dx === 0 && dy === 0) continue;
        this._offsets.push({ dx, dy });
        this._weights.push(1);
      }
    }
  }

  _buildVonNeumannKernel() {
    const r = this.radius;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > r) continue;
        if (!this.includeCenter && dx === 0 && dy === 0) continue;
        this._offsets.push({ dx, dy });
        this._weights.push(1);
      }
    }
  }

  _buildSobelKernel() {
    // Sobel-like gradient detection kernel
    // Returns 3 channels: identity, dx gradient, dy gradient
    // For r=1: 3x3 neighborhood

    // Identity (center cell state)
    if (this.includeCenter) {
      this._offsets.push({ dx: 0, dy: 0, channel: 'id' });
      this._weights.push(1);
    }

    // Sobel X
    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ];

    // Sobel Y
    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ];

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const wx = sobelX[dy + 1][dx + 1];
        const wy = sobelY[dy + 1][dx + 1];
        if (wx !== 0) {
          this._offsets.push({ dx, dy, channel: 'dx' });
          this._weights.push(wx / 4); // Normalize
        }
        if (wy !== 0) {
          this._offsets.push({ dx, dy, channel: 'dy' });
          this._weights.push(wy / 4);
        }
      }
    }
  }

  _buildCustomKernel() {
    const kernel = this.customKernel;
    const h = kernel.length;
    const w = kernel[0].length;
    const cy = Math.floor(h / 2);
    const cx = Math.floor(w / 2);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const weight = kernel[y][x];
        if (weight === 0 && !this.includeCenter) continue;
        const dx = x - cx;
        const dy = y - cy;
        if (!this.includeCenter && dx === 0 && dy === 0) continue;
        this._offsets.push({ dx, dy });
        this._weights.push(weight);
      }
    }
  }

  /**
   * Sample perception field for entire grid
   * @param {Grid} grid
   * @returns {Float32Array} Flattened perception data
   *   Shape: [height, width, fieldSize * channels]
   */
  sample(grid) {
    const { width, height, channels } = grid;
    const outputSize = width * height * this.fieldSize * channels;
    const output = new Float32Array(outputSize);

    let outIdx = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let i = 0; i < this._offsets.length; i++) {
          const { dx, dy } = this._offsets[i];
          const weight = this._weights[i];
          const cell = grid.get(x + dx, y + dy);

          for (let c = 0; c < channels; c++) {
            output[outIdx++] = (cell ? cell[c] : 0) * weight;
          }
        }
      }
    }

    return output;
  }

  /**
   * Sample perception field for single cell
   * @param {Grid} grid
   * @param {number} x
   * @param {number} y
   * @returns {Float32Array}
   */
  sampleCell(grid, x, y) {
    const { channels } = grid;
    const output = new Float32Array(this.fieldSize * channels);

    let outIdx = 0;
    for (let i = 0; i < this._offsets.length; i++) {
      const { dx, dy } = this._offsets[i];
      const weight = this._weights[i];
      const cell = grid.get(x + dx, y + dy);

      for (let c = 0; c < channels; c++) {
        output[outIdx++] = (cell ? cell[c] : 0) * weight;
      }
    }

    return output;
  }

  /**
   * Get kernel as 2D array for visualization
   */
  getKernelMatrix() {
    const size = this.radius * 2 + 1;
    const matrix = Array(size).fill(null).map(() => Array(size).fill(0));
    const center = this.radius;

    for (let i = 0; i < this._offsets.length; i++) {
      const { dx, dy } = this._offsets[i];
      matrix[dy + center][dx + center] = this._weights[i];
    }

    return matrix;
  }

  /**
   * Get configuration
   */
  getConfig() {
    return {
      radius: this.radius,
      type: this.type,
      includeCenter: this.includeCenter,
      fieldSize: this.fieldSize,
      customKernel: this.customKernel
    };
  }
}

/**
 * Predefined perception kernels
 */
Perception.kernels = {
  // Game of Life style (sum of neighbors)
  life: [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1]
  ],

  // Laplacian (edge detection)
  laplacian: [
    [0, 1, 0],
    [1, -4, 1],
    [0, 1, 0]
  ],

  // Gaussian blur 3x3
  gaussian: [
    [1/16, 2/16, 1/16],
    [2/16, 4/16, 2/16],
    [1/16, 2/16, 1/16]
  ],

  // Sharpen
  sharpen: [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0]
  ],

  // Asymmetric growth pattern
  growth: [
    [0.5, 0.8, 0.5],
    [0.8, 1.0, 0.8],
    [0.5, 0.8, 0.5]
  ]
};
