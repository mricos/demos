/**
 * Dunk - Nasty Range Module
 * Fine-tuning parameters for aggressive dubstep/808 sounds
 */

NS.Nasty = {
  /**
   * Parameter definitions with ranges and defaults
   */
  params: {
    decayFine: {
      name: 'Decay Fine',
      description: 'Curve shape: linear → exponential → logarithmic',
      min: 0,
      max: 1,
      default: 0.5,
      unit: ''
    },
    decayExtend: {
      name: 'Decay Extend',
      description: 'Extended decay beyond normal 808',
      min: 50,
      max: 2000,
      default: 200,
      unit: 'ms'
    },
    subHarmonicMix: {
      name: 'Sub-Harmonic',
      description: 'Octave-below sine blend',
      min: 0,
      max: 1,
      default: 0.3,
      unit: ''
    },
    clickIntensity: {
      name: 'Click Intensity',
      description: 'Transient emphasis (1-4kHz)',
      min: 0,
      max: 1,
      default: 0.4,
      unit: ''
    },
    grimeAmount: {
      name: 'Grime Amount',
      description: '100-500Hz harmonic dirt',
      min: 0,
      max: 1,
      default: 0.2,
      unit: ''
    },
    pitchDrift: {
      name: 'Pitch Drift',
      description: 'Micro pitch variations',
      min: -50,
      max: 50,
      default: 0,
      unit: 'cents'
    },
    growlFreq: {
      name: 'Growl Freq',
      description: '"Nasty zone" focus frequency',
      min: 400,
      max: 800,
      default: 600,
      unit: 'Hz'
    }
  },

  /**
   * Get current nasty state
   */
  getState() {
    return NS.State.current.nasty || this.getDefaults();
  },

  /**
   * Get default values
   */
  getDefaults() {
    const defaults = {};
    for (const [key, param] of Object.entries(this.params)) {
      defaults[key] = param.default;
    }
    return defaults;
  },

  /**
   * Set a nasty parameter
   */
  set(name, value) {
    const param = this.params[name];
    if (!param) {
      console.warn(`[Dunk] Unknown nasty param: ${name}`);
      return;
    }

    // Clamp to valid range
    const clamped = NS.Utils.clamp(value, param.min, param.max);
    NS.State.set(`nasty.${name}`, clamped);

    NS.Bus.emit('nasty:changed', { name, value: clamped });
  },

  /**
   * Get a nasty parameter
   */
  get(name) {
    return NS.State.get(`nasty.${name}`) ?? this.params[name]?.default;
  },

  /**
   * Apply nasty parameters to trigger options
   * Returns object ready to pass to voice trigger
   */
  getTriggerOptions() {
    const state = this.getState();

    return {
      decay: state.decayExtend,
      decayExtend: Math.max(0, state.decayExtend - 200),
      decayFine: state.decayFine,
      subHarmonicMix: state.subHarmonicMix,
      clickIntensity: state.clickIntensity,
      grimeAmount: state.grimeAmount,
      pitchDrift: state.pitchDrift,
      growlFreq: state.growlFreq
    };
  },

  /**
   * Calculate decay curve parameters based on decayFine
   *
   * @param {number} decayFine - 0-1 value
   * @returns {object} - Curve parameters
   */
  getDecayCurve(decayFine) {
    if (decayFine <= 0.33) {
      // Linear decay
      return { type: 'linear', factor: 1 };
    } else if (decayFine <= 0.66) {
      // Exponential decay (classic 808)
      return { type: 'exponential', factor: 3 + (decayFine - 0.33) * 6 };
    } else {
      // Logarithmic-ish (long tail)
      return { type: 'logarithmic', factor: 0.3 + (1 - decayFine) * 0.4 };
    }
  },

  /**
   * Apply grime through additional filtering/saturation
   * Returns parameters for a grime filter
   */
  getGrimeParams() {
    const grime = this.get('grimeAmount');
    const growl = this.get('growlFreq');

    return {
      // Bandpass center frequency
      frequency: growl,
      // Q increases with grime
      Q: 1 + grime * 4,
      // Saturation amount
      saturation: grime * 0.5,
      // Mix level
      mix: grime * 0.3
    };
  },

  /**
   * Preset nasty configurations
   */
  presets: {
    'clean': {
      name: 'Clean',
      values: {
        decayFine: 0.5,
        decayExtend: 200,
        subHarmonicMix: 0.2,
        clickIntensity: 0.3,
        grimeAmount: 0,
        pitchDrift: 0,
        growlFreq: 500
      }
    },
    'punchy': {
      name: 'Punchy',
      values: {
        decayFine: 0.4,
        decayExtend: 150,
        subHarmonicMix: 0.4,
        clickIntensity: 0.6,
        grimeAmount: 0.1,
        pitchDrift: 0,
        growlFreq: 550
      }
    },
    'dubstep': {
      name: 'Dubstep',
      values: {
        decayFine: 0.7,
        decayExtend: 800,
        subHarmonicMix: 0.5,
        clickIntensity: 0.3,
        grimeAmount: 0.4,
        pitchDrift: 10,
        growlFreq: 650
      }
    },
    'nasty': {
      name: 'Nasty',
      values: {
        decayFine: 0.85,
        decayExtend: 1500,
        subHarmonicMix: 0.7,
        clickIntensity: 0.7,
        grimeAmount: 0.6,
        pitchDrift: -15,
        growlFreq: 700
      }
    },
    'earthquake': {
      name: 'Earthquake',
      values: {
        decayFine: 0.9,
        decayExtend: 2000,
        subHarmonicMix: 0.9,
        clickIntensity: 0.5,
        grimeAmount: 0.3,
        pitchDrift: -30,
        growlFreq: 450
      }
    }
  },

  /**
   * Load a nasty preset
   */
  loadPreset(presetId) {
    const preset = this.presets[presetId];
    if (!preset) {
      console.warn(`[Dunk] Nasty preset "${presetId}" not found`);
      return false;
    }

    for (const [key, value] of Object.entries(preset.values)) {
      this.set(key, value);
    }

    NS.Bus.emit('nasty:preset', { id: presetId, name: preset.name });
    return true;
  },

  /**
   * List available presets
   */
  listPresets() {
    return Object.entries(this.presets).map(([id, preset]) => ({
      id,
      name: preset.name
    }));
  }
};

console.log('[Dunk] Nasty module loaded');
