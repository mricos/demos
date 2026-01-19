/**
 * WebGLRenderer - GPU-accelerated rendering for Cann
 *
 * Uses fragment shaders for:
 * - Perception field computation
 * - State evolution (parallel cell updates)
 * - Color mapping and visualization
 *
 * This is a stub for future GPU acceleration.
 * Currently delegates to CanvasRenderer.
 */

import { CanvasRenderer } from './CanvasRenderer.js';

export class WebGLRenderer {
  /**
   * @param {Object} config
   * @param {HTMLCanvasElement} config.canvas
   * @param {Object} [config.shaders] - Custom GLSL shaders
   */
  constructor(config = {}) {
    this.canvas = config.canvas;
    this.gl = null;
    this.isWebGL = false;

    // Fallback to Canvas2D
    this._fallback = null;

    // Shader programs
    this._programs = {};
    this._textures = {};
    this._framebuffers = {};

    // Try to initialize WebGL
    this._init(config);
  }

  _init(config) {
    try {
      this.gl = this.canvas.getContext('webgl2') ||
                this.canvas.getContext('webgl') ||
                this.canvas.getContext('experimental-webgl');

      if (this.gl) {
        this.isWebGL = true;
        this._initShaders(config.shaders);
      } else {
        this._initFallback(config);
      }
    } catch (e) {
      console.warn('WebGL not available, falling back to Canvas2D');
      this._initFallback(config);
    }
  }

  _initFallback(config) {
    this._fallback = new CanvasRenderer({
      canvas: this.canvas,
      cellSize: config.cellSize || 4,
      mode: config.mode || 'rgba'
    });
  }

  _initShaders(customShaders = {}) {
    // Placeholder for shader compilation
    // Full implementation would include:
    // - Perception shader (convolution)
    // - Evolution shader (neural network forward pass)
    // - Display shader (color mapping)
  }

  setGrid(grid) {
    if (this._fallback) {
      this._fallback.setGrid(grid);
    } else {
      // Upload grid to GPU texture
      this._uploadTexture(grid);
    }
    return this;
  }

  _uploadTexture(grid) {
    // Placeholder for texture upload
  }

  render() {
    if (this._fallback) {
      return this._fallback.render();
    }

    // WebGL render path (placeholder)
    // Would use double-buffered textures for evolution
    return this;
  }

  /**
   * Execute GPU-accelerated evolution step
   * This is where the real performance gains come from
   */
  evolveOnGPU(evolver) {
    if (!this.isWebGL) {
      console.warn('GPU evolution not available, use CPU fallback');
      return null;
    }

    // Placeholder for GPU evolution
    // Would compile evolver weights into shader uniforms
    // and run perception + forward pass entirely on GPU
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    if (this._fallback) {
      this._fallback.resize(width, height);
    }
    return this;
  }

  destroy() {
    if (this._fallback) {
      this._fallback.destroy();
    }
    // Clean up WebGL resources
    this.gl = null;
  }
}

/**
 * GLSL shader templates (for future implementation)
 */
WebGLRenderer.shaders = {
  vertex: `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;

    void main() {
      gl_Position = vec4(a_position, 0, 1);
      v_texCoord = a_texCoord;
    }
  `,

  perception: `
    precision highp float;
    uniform sampler2D u_state;
    uniform vec2 u_resolution;
    varying vec2 v_texCoord;

    // Perception kernel (3x3 neighborhood)
    vec4 perceive() {
      vec2 texel = 1.0 / u_resolution;
      vec4 sum = vec4(0.0);

      // Sample 3x3 neighborhood
      for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
          vec2 offset = vec2(float(dx), float(dy)) * texel;
          sum += texture2D(u_state, v_texCoord + offset);
        }
      }

      return sum / 9.0;
    }

    void main() {
      gl_FragColor = perceive();
    }
  `,

  evolution: `
    precision highp float;
    uniform sampler2D u_perception;
    uniform mat4 u_weights1;
    uniform mat4 u_weights2;
    uniform vec4 u_bias1;
    uniform vec4 u_bias2;
    varying vec2 v_texCoord;

    // Simple 2-layer neural network
    vec4 evolve(vec4 perception) {
      // Layer 1
      vec4 hidden = u_weights1 * perception + u_bias1;
      hidden = max(hidden, vec4(0.0)); // ReLU

      // Layer 2
      vec4 output = u_weights2 * hidden + u_bias2;

      // Residual connection
      return clamp(perception + output, 0.0, 1.0);
    }

    void main() {
      vec4 perception = texture2D(u_perception, v_texCoord);
      gl_FragColor = evolve(perception);
    }
  `
};
