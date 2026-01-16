/**
 * Cann - Main orchestrator for Neural Cellular Automata
 *
 * Manages the lifecycle of a CA simulation including:
 * - Grid state management
 * - Evolution strategy (Markovian vs SSM)
 * - Loss computation and gradient flow
 * - Rendering pipeline
 */

import { Grid } from './Grid.js';
import { Perception } from './Perception.js';
import { CompositeLoss } from '../loss/CompositeLoss.js';
import { MarkovianEvolver } from '../evolvers/MarkovianEvolver.js';

export class Cann {
  /**
   * @param {Object} config
   * @param {number} config.width - Grid width in cells
   * @param {number} config.height - Grid height in cells
   * @param {number} [config.channels=4] - State channels per cell (RGBA default)
   * @param {number} [config.scale=1] - Resolution scale factor
   * @param {string} [config.mode='markovian'] - Evolution mode: 'markovian' | 'ssm'
   * @param {Object} [config.perception] - Perception field configuration
   * @param {Object} [config.evolver] - Evolver configuration
   * @param {Object} [config.loss] - Loss function configuration
   */
  constructor(config = {}) {
    this.config = {
      width: 64,
      height: 64,
      channels: 4,
      scale: 1,
      mode: 'markovian',
      wrap: true,
      ...config
    };

    // Core state
    this.grid = null;
    this.perception = null;
    this.evolver = null;
    this.loss = null;
    this.renderer = null;

    // Evolution state
    this.generation = 0;
    this.isRunning = false;
    this.frameId = null;

    // Hidden state for SSM mode
    this._hiddenState = null;

    // History buffer for state space models
    this._historyDepth = config.historyDepth || 4;
    this._history = [];

    // Metrics
    this.metrics = {
      localLoss: 0,
      globalLoss: 0,
      totalLoss: 0,
      fps: 0,
      lastFrameTime: 0
    };

    // Event callbacks
    this._callbacks = {
      onStep: [],
      onLoss: [],
      onRender: []
    };

    this._init();
  }

  _init() {
    const { width, height, channels, scale, mode } = this.config;

    // Effective dimensions considering scale
    const effectiveWidth = Math.floor(width * scale);
    const effectiveHeight = Math.floor(height * scale);

    // Initialize grid
    this.grid = new Grid({
      width: effectiveWidth,
      height: effectiveHeight,
      channels,
      wrap: this.config.wrap
    });

    // Initialize perception field (neighborhood sampling)
    this.perception = new Perception({
      radius: this.config.perception?.radius || 1,
      type: this.config.perception?.type || 'moore',
      includeCenter: true
    });

    // Initialize evolver based on mode
    this._initEvolver(mode);

    // Initialize composite loss
    this.loss = new CompositeLoss({
      localWeight: this.config.loss?.localWeight ?? 0.5,
      globalWeight: this.config.loss?.globalWeight ?? 0.5,
      localConfig: this.config.loss?.local || {},
      globalConfig: this.config.loss?.global || {}
    });
  }

  _initEvolver(mode) {
    if (mode === 'ssm') {
      // Lazy load SSM evolver to keep bundle small if not used
      import('../evolvers/SSMEvolver.js').then(({ SSMEvolver }) => {
        this.evolver = new SSMEvolver({
          inputChannels: this.perception.fieldSize * this.config.channels,
          hiddenDim: this.config.evolver?.hiddenDim || 128,
          outputChannels: this.config.channels,
          historyDepth: this._historyDepth,
          ...this.config.evolver
        });
        this._hiddenState = this.evolver.initHidden(
          this.config.width * this.config.scale,
          this.config.height * this.config.scale
        );
      });
    } else {
      // Default Markovian (memoryless) evolver
      this.evolver = new MarkovianEvolver({
        inputChannels: this.perception.fieldSize * this.config.channels,
        hiddenDim: this.config.evolver?.hiddenDim || 64,
        outputChannels: this.config.channels,
        ...this.config.evolver
      });
    }
  }

  /**
   * Initialize grid state
   * @param {string|Function|Uint8ClampedArray} init - Initialization method
   */
  seed(init = 'random') {
    if (typeof init === 'function') {
      this.grid.fill((x, y) => init(x, y, this.grid.width, this.grid.height));
    } else if (init instanceof Uint8ClampedArray || init instanceof Float32Array) {
      this.grid.setData(init);
    } else {
      this.grid.fill(init); // 'random', 'center', 'noise', etc.
    }

    // Clear history for SSM mode
    this._history = [];
    this.generation = 0;

    return this;
  }

  /**
   * Perform one evolution step
   */
  step() {
    if (!this.evolver) return this;

    const startTime = performance.now();

    // Capture perception field for each cell
    const perceptionField = this.perception.sample(this.grid);

    // Compute next state based on evolution mode
    let nextState;
    if (this.config.mode === 'ssm' && this._hiddenState) {
      // State Space Model: use hidden state
      const result = this.evolver.forward(
        perceptionField,
        this._hiddenState,
        this._history
      );
      nextState = result.output;
      this._hiddenState = result.hidden;
    } else {
      // Markovian: memoryless transition
      nextState = this.evolver.forward(perceptionField);
    }

    // Update history buffer
    if (this._history.length >= this._historyDepth) {
      this._history.shift();
    }
    this._history.push(this.grid.getData().slice());

    // Apply next state
    this.grid.setData(nextState);
    this.generation++;

    // Compute loss
    this._computeLoss();

    // Update metrics
    const frameTime = performance.now() - startTime;
    this.metrics.fps = 1000 / frameTime;
    this.metrics.lastFrameTime = frameTime;

    // Fire callbacks
    this._emit('onStep', {
      generation: this.generation,
      metrics: this.metrics
    });

    return this;
  }

  _computeLoss() {
    const result = this.loss.compute(this.grid, {
      generation: this.generation,
      history: this._history,
      evolver: this.evolver
    });

    this.metrics.localLoss = result.local;
    this.metrics.globalLoss = result.global;
    this.metrics.totalLoss = result.total;

    this._emit('onLoss', result);
  }

  /**
   * Start continuous evolution
   * @param {number} [targetFPS=30] - Target frames per second
   */
  run(targetFPS = 30) {
    if (this.isRunning) return this;
    this.isRunning = true;

    const frameInterval = 1000 / targetFPS;
    let lastTime = performance.now();

    const loop = () => {
      if (!this.isRunning) return;

      const now = performance.now();
      const elapsed = now - lastTime;

      if (elapsed >= frameInterval) {
        this.step();
        if (this.renderer) {
          this.render();
        }
        lastTime = now - (elapsed % frameInterval);
      }

      this.frameId = requestAnimationFrame(loop);
    };

    this.frameId = requestAnimationFrame(loop);
    return this;
  }

  /**
   * Stop continuous evolution
   */
  stop() {
    this.isRunning = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    return this;
  }

  /**
   * Attach a renderer
   * @param {CanvasRenderer|WebGLRenderer} renderer
   */
  attachRenderer(renderer) {
    this.renderer = renderer;
    renderer.setGrid(this.grid);
    return this;
  }

  /**
   * Render current state
   */
  render() {
    if (!this.renderer) return this;
    this.renderer.render();
    this._emit('onRender', { generation: this.generation });
    return this;
  }

  /**
   * Get state at position (supports scale-aware access)
   * @param {number} x - X coordinate (in logical space)
   * @param {number} y - Y coordinate (in logical space)
   */
  getCell(x, y) {
    const scale = this.config.scale;
    return this.grid.get(
      Math.floor(x * scale),
      Math.floor(y * scale)
    );
  }

  /**
   * Set state at position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Array<number>} value - Channel values
   */
  setCell(x, y, value) {
    const scale = this.config.scale;
    this.grid.set(
      Math.floor(x * scale),
      Math.floor(y * scale),
      value
    );
    return this;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      ...this.config,
      evolver: this.evolver?.getConfig(),
      loss: this.loss?.getConfig(),
      perception: this.perception?.getConfig()
    };
  }

  /**
   * Load configuration
   * @param {Object} config
   */
  loadConfig(config) {
    this.config = { ...this.config, ...config };
    this._init();
    return this;
  }

  /**
   * Export state for serialization
   */
  exportState() {
    return {
      generation: this.generation,
      grid: Array.from(this.grid.getData()),
      hidden: this._hiddenState ? Array.from(this._hiddenState) : null,
      history: this._history.map(h => Array.from(h)),
      config: this.getConfig(),
      metrics: { ...this.metrics }
    };
  }

  /**
   * Import state
   * @param {Object} state
   */
  importState(state) {
    this.generation = state.generation || 0;
    if (state.grid) {
      this.grid.setData(new Float32Array(state.grid));
    }
    if (state.hidden) {
      this._hiddenState = new Float32Array(state.hidden);
    }
    if (state.history) {
      this._history = state.history.map(h => new Float32Array(h));
    }
    return this;
  }

  /**
   * Register event callback
   * @param {string} event - Event name: 'onStep' | 'onLoss' | 'onRender'
   * @param {Function} callback
   */
  on(event, callback) {
    if (this._callbacks[event]) {
      this._callbacks[event].push(callback);
    }
    return () => this.off(event, callback);
  }

  /**
   * Remove event callback
   */
  off(event, callback) {
    if (this._callbacks[event]) {
      const idx = this._callbacks[event].indexOf(callback);
      if (idx > -1) this._callbacks[event].splice(idx, 1);
    }
    return this;
  }

  _emit(event, data) {
    if (this._callbacks[event]) {
      this._callbacks[event].forEach(cb => cb(data));
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stop();
    this.renderer?.destroy?.();
    this.grid = null;
    this.evolver = null;
    this._callbacks = { onStep: [], onLoss: [], onRender: [] };
  }
}
