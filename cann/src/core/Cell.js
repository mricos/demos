/**
 * Cell - Individual cell state wrapper
 *
 * Provides semantic access to cell state channels.
 * Channels can represent:
 * - RGBA color values
 * - State variables (alive/dead, age, type)
 * - Hidden features (for neural processing)
 *
 * The Cell abstraction allows thinking about
 * individual entities while Grid handles the collection.
 */

export class Cell {
  /**
   * @param {Float32Array|Array<number>} data - Channel values
   * @param {Object} [schema] - Channel semantics
   */
  constructor(data, schema = null) {
    this.data = data instanceof Float32Array ? data : new Float32Array(data);
    this.schema = schema || Cell.defaultSchema(this.data.length);
  }

  /**
   * Get channel by name
   */
  get(name) {
    const idx = this.schema[name];
    return idx !== undefined ? this.data[idx] : undefined;
  }

  /**
   * Set channel by name
   */
  set(name, value) {
    const idx = this.schema[name];
    if (idx !== undefined) {
      this.data[idx] = value;
    }
    return this;
  }

  /**
   * Get all channels as object
   */
  toObject() {
    const obj = {};
    for (const [name, idx] of Object.entries(this.schema)) {
      obj[name] = this.data[idx];
    }
    return obj;
  }

  /**
   * Check if cell is "alive" (above threshold)
   */
  isAlive(threshold = 0.5, channel = 0) {
    return this.data[channel] > threshold;
  }

  /**
   * Get primary value (first channel)
   */
  get value() {
    return this.data[0];
  }

  set value(v) {
    this.data[0] = v;
  }

  /**
   * Get color as CSS string
   */
  get color() {
    const r = Math.floor((this.data[0] || 0) * 255);
    const g = Math.floor((this.data[1] || 0) * 255);
    const b = Math.floor((this.data[2] || 0) * 255);
    const a = this.data[3] ?? 1;
    return `rgba(${r},${g},${b},${a})`;
  }

  /**
   * Clone cell
   */
  clone() {
    return new Cell(new Float32Array(this.data), { ...this.schema });
  }

  /**
   * Interpolate between two cells
   */
  static lerp(a, b, t) {
    const result = new Float32Array(a.data.length);
    for (let i = 0; i < result.length; i++) {
      result[i] = a.data[i] * (1 - t) + b.data[i] * t;
    }
    return new Cell(result, a.schema);
  }

  /**
   * Default schema for N channels
   */
  static defaultSchema(n) {
    if (n === 4) {
      return { r: 0, g: 1, b: 2, a: 3, red: 0, green: 1, blue: 2, alpha: 3 };
    }
    if (n === 3) {
      return { r: 0, g: 1, b: 2, red: 0, green: 1, blue: 2 };
    }
    if (n === 1) {
      return { value: 0, state: 0 };
    }
    // Generic channels
    const schema = {};
    for (let i = 0; i < n; i++) {
      schema[`c${i}`] = i;
    }
    return schema;
  }
}

/**
 * Predefined cell schemas
 */
Cell.schemas = {
  // Standard RGBA
  rgba: { r: 0, g: 1, b: 2, a: 3 },

  // Game of Life style
  life: { state: 0, age: 1, type: 2, energy: 3 },

  // Neural CA (hidden state)
  neural: {
    h0: 0, h1: 1, h2: 2, h3: 3,
    h4: 4, h5: 5, h6: 6, h7: 7,
    h8: 8, h9: 9, h10: 10, h11: 11,
    h12: 12, h13: 13, h14: 14, h15: 15
  },

  // Reaction-diffusion
  reactionDiffusion: { u: 0, v: 1, du: 2, dv: 3 },

  // Multi-species
  multiSpecies: { speciesA: 0, speciesB: 1, speciesC: 2, resource: 3 }
};
