/**
 * ActiveFigure.js
 *
 * Abstract base class for animated canvas visualizations.
 * Like <img> but procedural and temporal - renders f(t) → pixels.
 *
 * Design Philosophy:
 * - Minimal API (play/pause/seek like <video>)
 * - No UI controls (container app provides interface)
 * - State broadcasting (emits events, doesn't consume them)
 * - Self-contained rendering (owns canvas, manages draw loop)
 * - Composable (multiple figures can coexist)
 * - Time-based (everything is a function of time t)
 */

export class ActiveFigure {
  constructor(config = {}) {
    // Canvas configuration
    this.containerId = config.containerId;
    this.width = config.width ?? 800;
    this.height = config.height ?? 600;
    this.dpr = window.devicePixelRatio ?? 1;

    // Time control
    this.time = 0;                                  // Current time (ms)
    this.speed = config.speed ?? 1.0;               // Playback speed multiplier
    this.fps = config.fps ?? 30;                    // Target frame rate
    this.loop = config.loop ?? true;                // Loop when reaching end?
    this.duration = config.duration ?? Infinity;    // Total duration (ms)

    // Animation state
    this.isPlaying = false;
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / this.fps;
    this.animationFrameId = null;

    // Canvas elements
    this.container = null;
    this.canvas = null;
    this.ctx = null;

    // Event system
    this.listeners = {};
  }

  /**
   * Initialize the figure - create canvas and setup context
   */
  init() {
    this._createCanvas();
    this._setupContext();
    this.emit('initialized', { width: this.width, height: this.height });
    return this;
  }

  /**
   * Clean up - remove canvas and cancel animations
   */
  destroy() {
    this.pause();
    if (this.canvas && this.container) {
      this.container.removeChild(this.canvas);
    }
    this.listeners = {};
    this.emit('destroyed');
  }

  /**
   * Start animation playback
   */
  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this._animate(this.lastFrameTime);
    this.emit('play', { time: this.time });
  }

  /**
   * Pause animation playback
   */
  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.emit('pause', { time: this.time });
  }

  /**
   * Seek to specific time
   * @param {number} time - Time in milliseconds
   */
  seek(time) {
    this.time = Math.max(0, Math.min(time, this.duration));
    this.emit('seek', { time: this.time });

    // If not playing, render one frame at new time
    if (!this.isPlaying) {
      this.render();
    }
  }

  /**
   * Set playback speed multiplier
   * @param {number} multiplier - Speed multiplier (1.0 = normal, 0.5 = half speed, 2.0 = double speed)
   */
  setSpeed(multiplier) {
    this.speed = Math.max(0, multiplier);
    this.emit('speedchange', { speed: this.speed });
  }

  /**
   * Get current time
   * @returns {number} Current time in milliseconds
   */
  getTime() {
    return this.time;
  }

  /**
   * Get total duration
   * @returns {number} Duration in milliseconds
   */
  getDuration() {
    return this.duration;
  }

  /**
   * Check if currently playing
   * @returns {boolean}
   */
  getIsPlaying() {
    return this.isPlaying;
  }

  /**
   * Get complete state (for serialization/restoration)
   * Subclasses should override to include domain-specific state
   * @returns {object}
   */
  getState() {
    return {
      time: this.time,
      isPlaying: this.isPlaying,
      speed: this.speed
    };
  }

  /**
   * Event subscription
   * Events: 'initialized', 'play', 'pause', 'seek', 'timeupdate', 'statechange', 'frame', 'destroyed'
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Event unsubscription
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  /**
   * Emit event to all subscribers
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }

  /**
   * Abstract method - update simulation state
   * Subclasses must implement
   * @param {number} dt - Time delta in milliseconds
   */
  update(dt) {
    throw new Error('ActiveFigure.update() must be implemented by subclass');
  }

  /**
   * Abstract method - render current frame
   * Subclasses must implement
   */
  render() {
    throw new Error('ActiveFigure.render() must be implemented by subclass');
  }

  // ============================================================================
  // Internal methods
  // ============================================================================

  /**
   * Main animation loop
   * @private
   */
  _animate(timestamp) {
    if (!this.isPlaying) return;

    // Frame rate throttling
    const elapsed = timestamp - this.lastFrameTime;
    if (elapsed < this.frameInterval) {
      this.animationFrameId = requestAnimationFrame(t => this._animate(t));
      return;
    }

    // Calculate time delta with speed multiplier
    const dt = elapsed * this.speed;
    this.lastFrameTime = timestamp;

    // Update time
    this.time += dt;

    // Handle looping
    if (this.time >= this.duration) {
      if (this.loop) {
        this.time = this.time % this.duration;
      } else {
        this.time = this.duration;
        this.pause();
        this.emit('ended', { time: this.time });
        return;
      }
    }

    // Update simulation state
    this.update(dt);

    // Render frame
    this.render();

    // Emit events
    this.emit('timeupdate', { time: this.time, dt });
    this.emit('frame', { time: this.time, dt });

    // Continue loop
    this.animationFrameId = requestAnimationFrame(t => this._animate(t));
  }

  /**
   * Create canvas element
   * @private
   */
  _createCanvas() {
    // Get container
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      throw new Error(`Container element with id '${this.containerId}' not found`);
    }

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    // Set actual canvas size accounting for device pixel ratio
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;

    // Append to container
    this.container.appendChild(this.canvas);
  }

  /**
   * Setup canvas context
   * @private
   */
  _setupContext() {
    this.ctx = this.canvas.getContext('2d');

    // Scale context to match device pixel ratio
    this.ctx.scale(this.dpr, this.dpr);

    // Set default styles
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'left';
  }
}

export default ActiveFigure;
