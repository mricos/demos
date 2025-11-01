/**
 * Tines ADSR Envelope System
 *
 * Implements ADSR envelopes with exponential curves for Attack and Decay.
 * Supports per-channel ADSR with precise control over all parameters.
 *
 * ADSR Parameters:
 * - Attack: time (seconds) + exponential curve factor
 * - Decay: time (seconds) + exponential curve factor
 * - Sustain: level (0-1)
 * - Release: time (seconds)
 *
 * Exponential Curve:
 * - curve < 1: logarithmic (slow start, fast end)
 * - curve = 1: linear
 * - curve > 1: exponential (fast start, slow end)
 */

export class ADSREnvelope {
  constructor(audioContext) {
    this.audioContext = audioContext;

    // Default ADSR parameters
    this.attack = 0.01;
    this.attackCurve = 1.0; // 1.0 = linear
    this.decay = 0.1;
    this.decayCurve = 1.0;
    this.sustain = 0.7;
    this.release = 0.3;
  }

  /**
   * Set ADSR parameters
   */
  setParameters(params) {
    if (params.attack !== undefined) this.attack = Math.max(0.001, params.attack);
    if (params.attackCurve !== undefined) this.attackCurve = Math.max(0.1, Math.min(5, params.attackCurve));
    if (params.decay !== undefined) this.decay = Math.max(0.001, params.decay);
    if (params.decayCurve !== undefined) this.decayCurve = Math.max(0.1, Math.min(5, params.decayCurve));
    if (params.sustain !== undefined) this.sustain = Math.max(0, Math.min(1, params.sustain));
    if (params.release !== undefined) this.release = Math.max(0.001, params.release);
  }

  /**
   * Apply ADSR envelope to a GainNode
   * @param {GainNode} gainNode - The gain node to apply envelope to
   * @param {number} startTime - When to start the envelope
   * @param {number} velocity - Note velocity (0-1)
   * @returns {number} - Total envelope duration
   */
  apply(gainNode, startTime, velocity = 1.0) {
    const param = gainNode.gain;
    const now = this.audioContext.currentTime;
    const start = Math.max(now, startTime);

    // Cancel any existing automation
    param.cancelScheduledValues(start);

    // Start from 0
    param.setValueAtTime(0, start);

    // Attack phase (with exponential curve)
    const attackEnd = start + this.attack;
    const attackTarget = velocity;

    if (this.attackCurve === 1.0) {
      // Linear attack
      param.linearRampToValueAtTime(attackTarget, attackEnd);
    } else {
      // Exponential attack
      this.applyExponentialRamp(param, 0, attackTarget, start, attackEnd, this.attackCurve);
    }

    // Decay phase (with exponential curve)
    const decayEnd = attackEnd + this.decay;
    const sustainLevel = attackTarget * this.sustain;

    if (this.decayCurve === 1.0) {
      // Linear decay
      param.linearRampToValueAtTime(sustainLevel, decayEnd);
    } else {
      // Exponential decay
      this.applyExponentialRamp(param, attackTarget, sustainLevel, attackEnd, decayEnd, this.decayCurve);
    }

    // Sustain phase - hold at sustain level
    // (No automation needed, stays at sustainLevel until release)

    return this.attack + this.decay;
  }

  /**
   * Trigger release phase
   * @param {GainNode} gainNode - The gain node to release
   * @param {number} releaseTime - When to start the release
   */
  triggerRelease(gainNode, releaseTime) {
    const param = gainNode.gain;
    const now = this.audioContext.currentTime;
    const start = Math.max(now, releaseTime);

    // Get current value
    const currentValue = param.value;

    // Cancel future scheduled values
    param.cancelScheduledValues(start);

    // Set starting point
    param.setValueAtTime(currentValue, start);

    // Release to 0
    const releaseEnd = start + this.release;
    param.exponentialRampToValueAtTime(0.001, releaseEnd); // Use exponential for natural release

    return this.release;
  }

  /**
   * Apply exponential curve between two values
   * Uses multiple linear segments to approximate exponential curve
   */
  applyExponentialRamp(param, startValue, endValue, startTime, endTime, curveFactor) {
    const segments = 20; // Number of segments for smooth curve
    const duration = endTime - startTime;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments; // 0 to 1
      const curvedT = Math.pow(t, curveFactor); // Apply curve
      const value = startValue + (endValue - startValue) * curvedT;
      const time = startTime + duration * t;

      if (i === 0) {
        param.setValueAtTime(value, time);
      } else {
        param.linearRampToValueAtTime(value, time);
      }
    }
  }

  /**
   * Load preset
   */
  loadPreset(preset) {
    this.setParameters(preset);
  }

  /**
   * Get current parameters
   */
  getParameters() {
    return {
      attack: this.attack,
      attackCurve: this.attackCurve,
      decay: this.decay,
      decayCurve: this.decayCurve,
      sustain: this.sustain,
      release: this.release
    };
  }

  /**
   * Clone this envelope
   */
  clone() {
    const envelope = new ADSREnvelope(this.audioContext);
    envelope.setParameters(this.getParameters());
    return envelope;
  }
}

/**
 * ADSR Preset Manager
 */
export class ADSRPresetManager {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.presets = this.loadDefaultPresets();
  }

  /**
   * Load default ADSR presets
   */
  loadDefaultPresets() {
    return {
      // Percussive sounds
      'pluck': {
        attack: 0.001,
        attackCurve: 0.5,
        decay: 0.3,
        decayCurve: 2.0,
        sustain: 0.0,
        release: 0.1
      },

      'stab': {
        attack: 0.001,
        attackCurve: 0.3,
        decay: 0.15,
        decayCurve: 1.5,
        sustain: 0.0,
        release: 0.05
      },

      'perc': {
        attack: 0.001,
        attackCurve: 1.0,
        decay: 0.1,
        decayCurve: 1.0,
        sustain: 0.0,
        release: 0.05
      },

      // Sustained sounds
      'pad': {
        attack: 0.5,
        attackCurve: 2.0,
        decay: 0.3,
        decayCurve: 1.5,
        sustain: 0.7,
        release: 1.0
      },

      'organ': {
        attack: 0.01,
        attackCurve: 1.0,
        decay: 0.05,
        decayCurve: 1.0,
        sustain: 1.0,
        release: 0.05
      },

      'brass': {
        attack: 0.1,
        attackCurve: 1.2,
        decay: 0.2,
        decayCurve: 1.5,
        sustain: 0.8,
        release: 0.2
      },

      'strings': {
        attack: 0.3,
        attackCurve: 1.5,
        decay: 0.2,
        decayCurve: 1.0,
        sustain: 0.9,
        release: 0.5
      },

      // Bells/metallic
      'bell': {
        attack: 0.001,
        attackCurve: 0.3,
        decay: 1.0,
        decayCurve: 2.5,
        sustain: 0.2,
        release: 0.8
      },

      'glass': {
        attack: 0.001,
        attackCurve: 0.2,
        decay: 0.5,
        decayCurve: 3.0,
        sustain: 0.1,
        release: 0.6
      },

      // Synth
      'synth-lead': {
        attack: 0.01,
        attackCurve: 0.8,
        decay: 0.1,
        decayCurve: 1.2,
        sustain: 0.6,
        release: 0.2
      },

      'synth-bass': {
        attack: 0.001,
        attackCurve: 0.5,
        decay: 0.2,
        decayCurve: 1.5,
        sustain: 0.4,
        release: 0.15
      }
    };
  }

  /**
   * Get preset
   */
  getPreset(name) {
    return this.presets[name];
  }

  /**
   * Create envelope from preset
   */
  createFromPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) {
      console.warn(`Preset "${presetName}" not found, using default`);
      return new ADSREnvelope(this.audioContext);
    }

    const envelope = new ADSREnvelope(this.audioContext);
    envelope.loadPreset(preset);
    return envelope;
  }

  /**
   * Save custom preset
   */
  savePreset(name, params) {
    this.presets[name] = { ...params };
  }

  /**
   * List all preset names
   */
  listPresets() {
    return Object.keys(this.presets);
  }

  /**
   * Load presets from JSON
   */
  loadFromJSON(jsonData) {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      this.presets = { ...this.presets, ...data };
      return true;
    } catch (error) {
      console.error('Failed to load presets:', error);
      return false;
    }
  }

  /**
   * Export presets to JSON
   */
  exportToJSON() {
    return JSON.stringify(this.presets, null, 2);
  }
}

/**
 * Per-Channel ADSR Manager
 * Manages ADSR envelopes for multiple channels
 */
export class ChannelADSRManager {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.presetManager = new ADSRPresetManager(audioContext);
    this.channelEnvelopes = new Map();
  }

  /**
   * Get or create ADSR envelope for channel
   */
  getChannelEnvelope(channelName) {
    if (!this.channelEnvelopes.has(channelName)) {
      this.channelEnvelopes.set(channelName, new ADSREnvelope(this.audioContext));
    }
    return this.channelEnvelopes.get(channelName);
  }

  /**
   * Set ADSR parameters for channel
   */
  setChannelADSR(channelName, params) {
    const envelope = this.getChannelEnvelope(channelName);
    envelope.setParameters(params);
  }

  /**
   * Set single ADSR parameter for channel
   */
  setChannelParameter(channelName, paramName, value) {
    const envelope = this.getChannelEnvelope(channelName);
    envelope.setParameters({ [paramName]: value });
  }

  /**
   * Load preset for channel
   */
  loadPresetForChannel(channelName, presetName) {
    const preset = this.presetManager.getPreset(presetName);
    if (preset) {
      this.setChannelADSR(channelName, preset);
      return true;
    }
    return false;
  }

  /**
   * Get channel parameters
   */
  getChannelParameters(channelName) {
    const envelope = this.getChannelEnvelope(channelName);
    return envelope.getParameters();
  }

  /**
   * Apply envelope to gain node
   */
  applyEnvelope(channelName, gainNode, startTime, velocity = 1.0) {
    const envelope = this.getChannelEnvelope(channelName);
    return envelope.apply(gainNode, startTime, velocity);
  }

  /**
   * Trigger release
   */
  triggerRelease(channelName, gainNode, releaseTime) {
    const envelope = this.getChannelEnvelope(channelName);
    return envelope.triggerRelease(gainNode, releaseTime);
  }

  /**
   * Get preset manager
   */
  getPresetManager() {
    return this.presetManager;
  }
}
