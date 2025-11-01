/**
 * MIDI Mapping - Parameter Mapping System
 *
 * Handles mapping between MIDI controls and vecterm parameters
 * Supports preset mappings and custom user mappings
 */

export class MIDIMapping {
  constructor(store) {
    this.store = store;
    this.presets = this.initializePresets();
  }

  /**
   * Initialize default mapping presets
   */
  initializePresets() {
    return {
      'tines-mixer': {
        name: 'Tines Mixer',
        description: '8 channels volume + pan control',
        mappings: {
          '1k': 'tines.volume.drone',
          '2k': 'tines.volume.bells',
          '3k': 'tines.volume.channel3',
          '4k': 'tines.volume.channel4',
          '1s': 'tines.pan.drone',
          '2s': 'tines.pan.bells',
          '3s': 'tines.pan.channel3',
          '4s': 'tines.pan.channel4'
        }
      },

      'tines-adsr': {
        name: 'Tines ADSR',
        description: 'Envelope control for active channel',
        mappings: {
          '1k': 'tines.adsr.active.attack',
          '2k': 'tines.adsr.active.decay',
          '3k': 'tines.adsr.active.sustain',
          '4k': 'tines.adsr.active.release',
          '1s': 'tines.adsr.active.attack.curve',
          '2s': 'tines.adsr.active.decay.curve'
        }
      },

      'tines-performance': {
        name: 'Tines Performance',
        description: 'Live performance controls',
        mappings: {
          '1k': 'tines.bpm',
          '2k': 'tines.volume.master',
          '3k': 'tines.volume.drone',
          '4k': 'tines.volume.bells',
          '5k': 'tines.adsr.drone.attack',
          '6k': 'tines.adsr.drone.release',
          '7k': 'tines.adsr.bells.attack',
          '8k': 'tines.adsr.bells.release',
          '1a': 'tines.mute.drone',
          '1b': 'tines.solo.drone',
          '1c': 'tines.mute.bells',
          '1d': 'tines.solo.bells'
        }
      },

      'vt100-effects': {
        name: 'VT100 Effects',
        description: 'Visual effects control',
        mappings: {
          '1k': 'vt100.scanlines',
          '2k': 'vt100.glow',
          '3k': 'vt100.wave',
          '4k': 'vt100.chromaticAberration',
          '5k': 'game.vt100.scanlines',
          '6k': 'game.vt100.glow',
          '7k': 'game.vt100.wave',
          '8k': 'game.vt100.chromaticAberration'
        }
      },

      'vecterm-camera': {
        name: 'Vecterm Camera',
        description: '3D camera control',
        mappings: {
          '1k': 'vecterm.camera.orbitAngle',
          '2k': 'vecterm.camera.orbitElevation',
          '3k': 'vecterm.camera.distance',
          '4k': 'vecterm.camera.fov',
          '1s': 'vecterm.config.glowIntensity',
          '2s': 'vecterm.config.lineWidth'
        }
      }
    };
  }

  /**
   * Load a preset mapping
   */
  loadPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) {
      console.error(`Preset "${presetName}" not found`);
      return false;
    }

    // Apply all mappings from preset
    Object.entries(preset.mappings).forEach(([controlId, parameter]) => {
      this.store.dispatch({
        type: 'MIDI_MAP_CONTROL',
        payload: { controlId, parameter }
      });
    });

    console.log(`✓ Loaded MIDI preset: ${preset.name}`);
    return true;
  }

  /**
   * Save current mappings as preset
   */
  savePreset(presetName, description) {
    const state = this.store.getState();
    const mappings = state.midi?.mappings || {};

    this.presets[presetName] = {
      name: presetName,
      description: description || 'User preset',
      mappings: { ...mappings }
    };

    console.log(`✓ Saved MIDI preset: ${presetName}`);
    return true;
  }

  /**
   * Get all preset names
   */
  getPresetNames() {
    return Object.keys(this.presets);
  }

  /**
   * Get preset info
   */
  getPreset(presetName) {
    return this.presets[presetName];
  }

  /**
   * Validate parameter path
   */
  validateParameter(parameter) {
    const validPrefixes = [
      'tines.',
      'vecterm.',
      'vt100.',
      'game.vt100.',
      'gamepad.'
    ];

    return validPrefixes.some(prefix => parameter.startsWith(prefix));
  }

  /**
   * Get parameter metadata (min, max, step, unit)
   */
  getParameterMetadata(parameter) {
    const metadata = {
      // Tines audio
      'tines.bpm': { min: 20, max: 300, step: 1, unit: ' BPM', type: 'continuous' },
      'tines.volume.master': { min: 0, max: 1, step: 0.01, unit: '', type: 'continuous' },
      'tines.volume.*': { min: 0, max: 1, step: 0.01, unit: '', type: 'continuous' },
      'tines.pan.*': { min: -1, max: 1, step: 0.01, unit: '', type: 'continuous' },
      'tines.adsr.*.attack': { min: 0.001, max: 2, step: 0.01, unit: 's', type: 'exponential' },
      'tines.adsr.*.decay': { min: 0.001, max: 2, step: 0.01, unit: 's', type: 'exponential' },
      'tines.adsr.*.sustain': { min: 0, max: 1, step: 0.01, unit: '', type: 'continuous' },
      'tines.adsr.*.release': { min: 0.001, max: 3, step: 0.01, unit: 's', type: 'exponential' },
      'tines.adsr.*.*.curve': { min: 0.1, max: 5, step: 0.1, unit: '', type: 'exponential' },
      'tines.delay.*': { min: 0, max: 48000, step: 1, unit: ' samples', type: 'continuous' },
      'tines.pitch.*': { min: -24, max: 24, step: 1, unit: ' semitones', type: 'continuous' },

      // VT100 effects
      'vt100.scanlines': { min: 0, max: 1, step: 0.01, unit: '', type: 'continuous' },
      'vt100.glow': { min: 0, max: 1, step: 0.01, unit: '', type: 'continuous' },
      'vt100.wave': { min: 0, max: 1, step: 0.01, unit: '', type: 'continuous' },
      'vt100.chromaticAberration': { min: 0, max: 10, step: 0.1, unit: 'px', type: 'continuous' },
      'game.vt100.scanlines': { min: 0, max: 1, step: 0.01, unit: '', type: 'continuous' },
      'game.vt100.glow': { min: 0, max: 1, step: 0.01, unit: '', type: 'continuous' },
      'game.vt100.wave': { min: 0, max: 1, step: 0.01, unit: '', type: 'continuous' },
      'game.vt100.chromaticAberration': { min: 0, max: 10, step: 0.1, unit: 'px', type: 'continuous' },

      // Vecterm 3D
      'vecterm.camera.orbitAngle': { min: 0, max: 360, step: 1, unit: '°', type: 'continuous' },
      'vecterm.camera.orbitElevation': { min: -90, max: 90, step: 1, unit: '°', type: 'continuous' },
      'vecterm.camera.distance': { min: 5, max: 50, step: 0.5, unit: '', type: 'continuous' },
      'vecterm.camera.fov': { min: 30, max: 120, step: 1, unit: '°', type: 'continuous' },
      'vecterm.config.glowIntensity': { min: 0, max: 1, step: 0.01, unit: '', type: 'continuous' },
      'vecterm.config.lineWidth': { min: 1, max: 5, step: 0.1, unit: 'px', type: 'continuous' }
    };

    // Try exact match first
    if (metadata[parameter]) {
      return metadata[parameter];
    }

    // Try wildcard match
    for (const [pattern, meta] of Object.entries(metadata)) {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '[^.]+') + '$');
        if (regex.test(parameter)) {
          return meta;
        }
      }
    }

    // Default metadata
    return { min: 0, max: 1, step: 0.01, unit: '', type: 'continuous' };
  }

  /**
   * Scale MIDI value (0-1) to parameter range
   */
  scaleValue(midiValue, parameter) {
    const meta = this.getParameterMetadata(parameter);

    if (meta.type === 'exponential') {
      // Exponential scaling for time-based parameters
      const range = meta.max - meta.min;
      return meta.min + (Math.pow(midiValue, 2) * range);
    } else {
      // Linear scaling
      return meta.min + (midiValue * (meta.max - meta.min));
    }
  }

  /**
   * Unscale parameter value to MIDI range (0-1)
   */
  unscaleValue(paramValue, parameter) {
    const meta = this.getParameterMetadata(parameter);

    if (meta.type === 'exponential') {
      const range = meta.max - meta.min;
      return Math.sqrt((paramValue - meta.min) / range);
    } else {
      return (paramValue - meta.min) / (meta.max - meta.min);
    }
  }

  /**
   * Format value for display
   */
  formatValue(value, parameter) {
    const meta = this.getParameterMetadata(parameter);
    const scaledValue = this.scaleValue(value, parameter);

    if (meta.step >= 1) {
      return Math.round(scaledValue) + meta.unit;
    } else if (meta.step >= 0.1) {
      return scaledValue.toFixed(1) + meta.unit;
    } else {
      return scaledValue.toFixed(2) + meta.unit;
    }
  }
}
