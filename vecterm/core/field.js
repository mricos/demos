/**
 * Field - Running Game Instance (Runtime Container)
 *
 * Owns:
 * - World instance (simulation space)
 * - Time/tick management
 * - RNG state
 * - I/O bindings (input handlers)
 * - Session state (pause/resume/checkpoints)
 * - Per-run configuration
 *
 * Does NOT own:
 * - Rendering (owned by Surface)
 * - Display state (owned by UI layer)
 *
 * Pure functional updates: tick(field) → field
 */

import { World } from './world.js';

export class Field {
  constructor(config = {}) {
    this.id = config.id || this.generateId();
    this.name = config.name || 'unnamed';
    this.gameSpec = config.gameSpec; // Reference to game definition

    // World instance (simulation space)
    this.world = config.world || new World({
      id: `${this.id}_world`,
      name: `${this.name}_world`,
      bounds: config.bounds
    });

    // Time management
    this.time = {
      current: 0,        // Current simulation time (ms)
      delta: 0,          // Last frame delta (ms)
      scale: 1.0,        // Time scale multiplier (1.0 = normal)
      accumulated: 0,    // Accumulated time for fixed timestep
      fixedStep: 16.67,  // Fixed timestep (ms) - 60 FPS
      maxSteps: 4        // Max fixed steps per frame (prevent spiral of death)
    };

    // State
    this.state = {
      status: 'stopped',  // 'stopped' | 'running' | 'paused'
      mode: config.mode || '3d',  // '2d' | '3d'
      tick: 0            // Frame count
    };

    // RNG state (for deterministic replay)
    this.rng = {
      seed: config.seed || Date.now(),
      state: config.seed || Date.now()
    };

    // Systems (game logic functions)
    this.systems = [];

    // Input handlers
    this.inputHandlers = new Map(); // inputType → handler function

    // Session management
    this.session = {
      checkpoints: new Map(),  // name → serialized state
      startTime: null,
      pauseTime: null,
      totalPausedTime: 0
    };

    // Configuration
    this.config = {
      ...config,
      tickRate: config.tickRate || 60,  // Target ticks per second
      autoStart: config.autoStart !== undefined ? config.autoStart : true
    };

    // Metadata
    this.metadata = {
      created: Date.now(),
      version: '1.0.0',
      tags: config.tags || []
    };
  }

  generateId() {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start the field simulation
   */
  start() {
    if (this.state.status === 'running') {
      console.warn('Field is already running');
      return this;
    }

    this.state.status = 'running';
    this.session.startTime = Date.now();

    console.log(`Field ${this.id} started`);
    return this;
  }

  /**
   * Pause the simulation
   */
  pause() {
    if (this.state.status !== 'running') {
      console.warn('Field is not running');
      return this;
    }

    this.state.status = 'paused';
    this.session.pauseTime = Date.now();

    console.log(`Field ${this.id} paused at tick ${this.state.tick}`);
    return this;
  }

  /**
   * Resume the simulation
   */
  resume() {
    if (this.state.status !== 'paused') {
      console.warn('Field is not paused');
      return this;
    }

    this.state.status = 'running';

    if (this.session.pauseTime) {
      this.session.totalPausedTime += Date.now() - this.session.pauseTime;
      this.session.pauseTime = null;
    }

    console.log(`Field ${this.id} resumed`);
    return this;
  }

  /**
   * Stop the simulation
   */
  stop() {
    this.state.status = 'stopped';
    console.log(`Field ${this.id} stopped at tick ${this.state.tick}`);
    return this;
  }

  /**
   * Reset to initial state
   */
  reset() {
    // Reset world
    this.world = new World({
      id: `${this.id}_world`,
      name: `${this.name}_world`,
      bounds: this.config.bounds
    });

    // Reset time
    this.time.current = 0;
    this.time.delta = 0;
    this.time.accumulated = 0;

    // Reset state
    this.state.status = 'stopped';
    this.state.tick = 0;

    // Reset RNG
    this.rng.state = this.rng.seed;

    // Reset session
    this.session.startTime = null;
    this.session.pauseTime = null;
    this.session.totalPausedTime = 0;

    console.log(`Field ${this.id} reset`);
    return this;
  }

  /**
   * Advance simulation by delta time (ms)
   * Uses fixed timestep for deterministic simulation
   *
   * @param {number} deltaMs - Time elapsed since last tick (ms)
   * @returns {Field} Updated field (for functional updates)
   */
  tick(deltaMs = null) {
    if (this.state.status !== 'running') {
      return this;
    }

    // Use provided delta or fixed step
    const delta = deltaMs !== null ? deltaMs : this.time.fixedStep;

    // Apply time scale
    const scaledDelta = delta * this.time.scale;

    // Accumulate time
    this.time.accumulated += scaledDelta;
    this.time.delta = scaledDelta;

    // Fixed timestep loop
    let steps = 0;
    while (this.time.accumulated >= this.time.fixedStep && steps < this.time.maxSteps) {
      // Execute systems
      this.executeSystems(this.time.fixedStep);

      // Update time
      this.time.current += this.time.fixedStep;
      this.time.accumulated -= this.time.fixedStep;
      this.state.tick++;
      steps++;
    }

    return this;
  }

  /**
   * Execute all systems for one timestep
   * @param {number} dt - Delta time (ms)
   */
  executeSystems(dt) {
    for (const system of this.systems) {
      if (system.enabled !== false) {
        system.execute(this.world, dt, this);
      }
    }
  }

  /**
   * Add a system to the field
   * @param {Object} system - System object with execute(world, dt, field) method
   */
  addSystem(system) {
    if (!system.execute || typeof system.execute !== 'function') {
      throw new Error('System must have an execute(world, dt, field) method');
    }

    this.systems.push(system);
    return this;
  }

  /**
   * Remove a system
   */
  removeSystem(system) {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      this.systems.splice(index, 1);
    }
    return this;
  }

  /**
   * Register input handler
   * @param {string} inputType - Input type ('keyboard', 'mouse', 'gamepad', etc.)
   * @param {Function} handler - Handler function
   */
  registerInputHandler(inputType, handler) {
    this.inputHandlers.set(inputType, handler);
    return this;
  }

  /**
   * Handle input event
   * @param {string} inputType - Input type
   * @param {Object} event - Input event data
   */
  handleInput(inputType, event) {
    const handler = this.inputHandlers.get(inputType);
    if (handler) {
      handler(event, this.world, this);
    }
  }

  /**
   * Get RNG value [0, 1)
   * Linear congruential generator for deterministic randomness
   */
  random() {
    const a = 1664525;
    const c = 1013904223;
    const m = 2 ** 32;

    this.rng.state = (a * this.rng.state + c) % m;
    return this.rng.state / m;
  }

  /**
   * Get random integer [min, max)
   */
  randomInt(min, max) {
    return Math.floor(this.random() * (max - min)) + min;
  }

  /**
   * Get random float [min, max)
   */
  randomFloat(min, max) {
    return this.random() * (max - min) + min;
  }

  /**
   * Save checkpoint
   * @param {string} name - Checkpoint name
   */
  saveCheckpoint(name) {
    const checkpoint = this.serialize();
    this.session.checkpoints.set(name, checkpoint);
    console.log(`Checkpoint '${name}' saved at tick ${this.state.tick}`);
    return this;
  }

  /**
   * Load checkpoint
   * @param {string} name - Checkpoint name
   */
  loadCheckpoint(name) {
    const checkpoint = this.session.checkpoints.get(name);
    if (!checkpoint) {
      console.error(`Checkpoint '${name}' not found`);
      return this;
    }

    const field = Field.deserialize(checkpoint);

    // Copy state to this instance
    this.world = field.world;
    this.time = field.time;
    this.state = field.state;
    this.rng = field.rng;

    console.log(`Checkpoint '${name}' loaded (tick ${this.state.tick})`);
    return this;
  }

  /**
   * Get elapsed time (ms) - accounting for pauses
   */
  getElapsedTime() {
    if (!this.session.startTime) return 0;

    const now = this.state.status === 'paused' ? this.session.pauseTime : Date.now();
    return now - this.session.startTime - this.session.totalPausedTime;
  }

  /**
   * Get simulation speed (ticks per second)
   */
  getTickRate() {
    const elapsed = this.getElapsedTime();
    return elapsed > 0 ? (this.state.tick / elapsed) * 1000 : 0;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      tick: this.state.tick,
      time: this.time.current,
      elapsed: this.getElapsedTime(),
      tickRate: this.getTickRate(),
      status: this.state.status,
      entities: this.world.metrics.entityCount,
      systems: this.systems.length
    };
  }

  /**
   * Serialize field state
   * @returns {Object} Serialized field data
   */
  serialize() {
    return {
      id: this.id,
      name: this.name,
      gameSpec: this.gameSpec,
      world: this.world.serialize(),
      time: { ...this.time },
      state: { ...this.state },
      rng: { ...this.rng },
      config: { ...this.config },
      metadata: { ...this.metadata },
      session: {
        startTime: this.session.startTime,
        pauseTime: this.session.pauseTime,
        totalPausedTime: this.session.totalPausedTime,
        checkpoints: Array.from(this.session.checkpoints.entries())
      }
    };
  }

  /**
   * Deserialize field state
   * @param {Object} data - Serialized field data
   * @returns {Field}
   */
  static deserialize(data) {
    const field = new Field({
      id: data.id,
      name: data.name,
      gameSpec: data.gameSpec,
      world: World.deserialize(data.world),
      seed: data.rng.seed,
      ...data.config
    });

    field.time = data.time;
    field.state = data.state;
    field.rng = data.rng;
    field.metadata = data.metadata;
    field.session = {
      ...data.session,
      checkpoints: new Map(data.session.checkpoints)
    };

    return field;
  }

  /**
   * Create field from game spec
   * @param {Object} gameSpec - Game specification
   * @param {Object} options - Field options
   * @returns {Field}
   */
  static fromGameSpec(gameSpec, options = {}) {
    return new Field({
      name: gameSpec.id,
      gameSpec: gameSpec,
      bounds: gameSpec.bounds,
      ...options
    });
  }
}

/**
 * System interface for game logic
 * All systems should implement this interface
 */
export class System {
  constructor(name) {
    this.name = name;
    this.enabled = true;
  }

  /**
   * Execute system logic
   * @param {World} world - World instance
   * @param {number} dt - Delta time (ms)
   * @param {Field} field - Field instance (for RNG, input, etc.)
   */
  execute(world, dt, field) {
    throw new Error('System.execute() must be implemented');
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}

/**
 * Field registry for managing all running fields
 */
export class FieldRegistry {
  constructor() {
    this.fields = new Map(); // id → Field
  }

  register(field) {
    this.fields.set(field.id, field);
    return field;
  }

  unregister(id) {
    const field = this.fields.get(id);
    if (field) {
      field.stop();
    }
    return this.fields.delete(id);
  }

  get(id) {
    return this.fields.get(id);
  }

  getAll() {
    return Array.from(this.fields.values());
  }

  getByName(name) {
    for (const field of this.fields.values()) {
      if (field.name === name) {
        return field;
      }
    }
    return null;
  }

  /**
   * Get fields by status
   */
  getByStatus(status) {
    return this.getAll().filter(f => f.state.status === status);
  }

  /**
   * Tick all running fields
   */
  tickAll(deltaMs) {
    for (const field of this.fields.values()) {
      if (field.state.status === 'running') {
        field.tick(deltaMs);
      }
    }
  }
}

// Export singleton registry
export const fieldRegistry = new FieldRegistry();
