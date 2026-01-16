/**
 * Grid - Multi-channel state representation
 *
 * Provides:
 * - Flat Float32Array storage for efficient computation
 * - Multi-channel access (RGBA or custom channels)
 * - Toroidal wrapping
 * - 2D ↔ 3D projection (hidden abstraction)
 */

export class Grid {
  /**
   * @param {Object} config
   * @param {number} config.width - Grid width
   * @param {number} config.height - Grid height
   * @param {number} [config.channels=4] - Channels per cell
   * @param {boolean} [config.wrap=true] - Toroidal wrapping
   */
  constructor(config = {}) {
    this.width = config.width || 64;
    this.height = config.height || 64;
    this.channels = config.channels || 4;
    this.wrap = config.wrap !== false;

    // Flat storage: width * height * channels
    this.size = this.width * this.height;
    this.dataSize = this.size * this.channels;
    this._data = new Float32Array(this.dataSize);

    // Optional depth for 3D projection (hidden abstraction)
    this._depth = config.depth || 1;
    this._is3D = this._depth > 1;

    // Statistics cache (invalidated on write)
    this._statsCache = null;
  }

  /**
   * Get flat index for (x, y, channel)
   */
  _idx(x, y, c = 0) {
    if (this.wrap) {
      x = ((x % this.width) + this.width) % this.width;
      y = ((y % this.height) + this.height) % this.height;
    } else {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
        return -1;
      }
    }
    return (y * this.width + x) * this.channels + c;
  }

  /**
   * Get all channels for cell (x, y)
   * @returns {Float32Array} View into data
   */
  get(x, y) {
    const idx = this._idx(x, y);
    if (idx < 0) return null;
    return this._data.subarray(idx, idx + this.channels);
  }

  /**
   * Get single channel value
   */
  getChannel(x, y, c) {
    const idx = this._idx(x, y, c);
    return idx >= 0 ? this._data[idx] : 0;
  }

  /**
   * Set all channels for cell (x, y)
   * @param {number} x
   * @param {number} y
   * @param {Array<number>|Float32Array} values
   */
  set(x, y, values) {
    const idx = this._idx(x, y);
    if (idx < 0) return this;
    for (let c = 0; c < this.channels && c < values.length; c++) {
      this._data[idx + c] = values[c];
    }
    this._statsCache = null;
    return this;
  }

  /**
   * Set single channel value
   */
  setChannel(x, y, c, value) {
    const idx = this._idx(x, y, c);
    if (idx >= 0) {
      this._data[idx] = value;
      this._statsCache = null;
    }
    return this;
  }

  /**
   * Get raw data buffer
   */
  getData() {
    return this._data;
  }

  /**
   * Set entire data buffer
   * @param {Float32Array|Uint8ClampedArray} data
   */
  setData(data) {
    if (data.length !== this.dataSize) {
      throw new Error(`Data size mismatch: expected ${this.dataSize}, got ${data.length}`);
    }
    if (data instanceof Float32Array) {
      this._data.set(data);
    } else {
      // Convert from Uint8 to Float32 (0-255 -> 0-1)
      for (let i = 0; i < data.length; i++) {
        this._data[i] = data[i] / 255;
      }
    }
    this._statsCache = null;
    return this;
  }

  /**
   * Fill grid with initialization pattern
   * @param {string|Function} init
   */
  fill(init) {
    if (typeof init === 'function') {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const values = init(x, y, this.width, this.height);
          this.set(x, y, values);
        }
      }
    } else {
      switch (init) {
        case 'random':
          this._fillRandom();
          break;
        case 'center':
          this._fillCenter();
          break;
        case 'noise':
          this._fillNoise();
          break;
        case 'gradient':
          this._fillGradient();
          break;
        case 'zero':
        case 'empty':
        default:
          this._data.fill(0);
      }
    }
    this._statsCache = null;
    return this;
  }

  _fillRandom() {
    for (let i = 0; i < this.dataSize; i++) {
      this._data[i] = Math.random();
    }
  }

  _fillCenter() {
    this._data.fill(0);
    const cx = Math.floor(this.width / 2);
    const cy = Math.floor(this.height / 2);
    const radius = Math.min(this.width, this.height) / 8;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy < radius * radius) {
          this.set(x, y, Array(this.channels).fill(1));
        }
      }
    }
  }

  _fillNoise() {
    // Simple value noise
    const scale = 8;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const values = [];
        for (let c = 0; c < this.channels; c++) {
          values.push(this._noise2D(x / scale + c * 100, y / scale + c * 100));
        }
        this.set(x, y, values);
      }
    }
  }

  _fillGradient() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const u = x / this.width;
        const v = y / this.height;
        this.set(x, y, [u, v, (u + v) / 2, 1]);
      }
    }
  }

  // Simple value noise (for initialization only)
  _noise2D(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  /**
   * Get neighborhood around (x, y)
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radius - Neighborhood radius
   * @param {string} type - 'moore' | 'vonneumann'
   * @returns {Array<{x, y, value}>}
   */
  getNeighborhood(x, y, radius = 1, type = 'moore') {
    const neighbors = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (type === 'vonneumann' && Math.abs(dx) + Math.abs(dy) > radius) {
          continue;
        }
        const value = this.get(x + dx, y + dy);
        if (value) {
          neighbors.push({ dx, dy, value: Array.from(value) });
        }
      }
    }
    return neighbors;
  }

  /**
   * Compute population statistics (cached)
   */
  getStats() {
    if (this._statsCache) return this._statsCache;

    const stats = {
      mean: new Float32Array(this.channels),
      variance: new Float32Array(this.channels),
      min: new Float32Array(this.channels).fill(Infinity),
      max: new Float32Array(this.channels).fill(-Infinity),
      sum: new Float32Array(this.channels),
      population: 0, // Count of "alive" cells (any channel > threshold)
      density: 0
    };

    const threshold = 0.1;

    // First pass: sum, min, max
    for (let i = 0; i < this.size; i++) {
      let isAlive = false;
      for (let c = 0; c < this.channels; c++) {
        const val = this._data[i * this.channels + c];
        stats.sum[c] += val;
        stats.min[c] = Math.min(stats.min[c], val);
        stats.max[c] = Math.max(stats.max[c], val);
        if (val > threshold) isAlive = true;
      }
      if (isAlive) stats.population++;
    }

    // Compute mean
    for (let c = 0; c < this.channels; c++) {
      stats.mean[c] = stats.sum[c] / this.size;
    }

    // Second pass: variance
    for (let i = 0; i < this.size; i++) {
      for (let c = 0; c < this.channels; c++) {
        const val = this._data[i * this.channels + c];
        const diff = val - stats.mean[c];
        stats.variance[c] += diff * diff;
      }
    }
    for (let c = 0; c < this.channels; c++) {
      stats.variance[c] /= this.size;
    }

    stats.density = stats.population / this.size;

    this._statsCache = stats;
    return stats;
  }

  /**
   * Convert to ImageData for canvas rendering
   */
  toImageData() {
    const data = new Uint8ClampedArray(this.width * this.height * 4);
    for (let i = 0; i < this.size; i++) {
      for (let c = 0; c < 4; c++) {
        if (c < this.channels) {
          data[i * 4 + c] = Math.floor(this._data[i * this.channels + c] * 255);
        } else {
          data[i * 4 + c] = 255; // Alpha = 1 for missing channels
        }
      }
    }
    return new ImageData(data, this.width, this.height);
  }

  /**
   * Clone grid
   */
  clone() {
    const grid = new Grid({
      width: this.width,
      height: this.height,
      channels: this.channels,
      wrap: this.wrap
    });
    grid._data.set(this._data);
    return grid;
  }

  // === 3D Projection (Hidden Abstraction) ===

  /**
   * Project 2D grid to 3D height field
   * Uses first channel as height, remaining as surface properties
   */
  toHeightField() {
    const field = {
      width: this.width,
      height: this.height,
      vertices: [],
      normals: [],
      colors: []
    };

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.get(x, y);
        const h = cell[0]; // Height from first channel

        // Vertex position
        field.vertices.push(
          x / this.width - 0.5,
          h,
          y / this.height - 0.5
        );

        // Surface color from remaining channels
        field.colors.push(
          cell[1] || h,
          cell[2] || h,
          cell[3] || 1
        );
      }
    }

    // Compute normals
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const h = this.getChannel(x, y, 0);
        const hx = this.getChannel(x + 1, y, 0) - this.getChannel(x - 1, y, 0);
        const hy = this.getChannel(x, y + 1, 0) - this.getChannel(x, y - 1, 0);

        // Cross product for normal
        const len = Math.sqrt(hx * hx + hy * hy + 1);
        field.normals.push(-hx / len, 1 / len, -hy / len);
      }
    }

    return field;
  }

  /**
   * Project from 3D voxel slice
   * @param {Array} voxels - 3D voxel data
   * @param {number} slice - Slice index along Z axis
   */
  fromVoxelSlice(voxels, slice) {
    // Extract 2D slice from 3D volume
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const voxel = voxels[slice]?.[y]?.[x];
        if (voxel) {
          this.set(x, y, voxel);
        }
      }
    }
    return this;
  }
}
