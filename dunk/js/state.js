/**
 * Dunk - State Module
 * Preset management and localStorage persistence
 */

NS.State = {
  STORAGE_KEY: 'dunk-state',
  PRESETS_KEY: 'dunk-presets',

  // Default state
  defaults: {
    bpm: 140,
    masterLevel: 0.8,

    // Voice settings (array of 4)
    voices: [
      { enabled: true, level: 0.8, channels: [0.8, 0.6, 0.5, 0.3, 0.4, 0.2, 0.15, 0.25], mutes: [false, false, false, false, false, false, false, false], distortion: { type: 'tanh', amount: 0.3 }, filter: '808-lpf' },
      { enabled: true, level: 0.7, channels: [0.8, 0.6, 0.5, 0.3, 0.4, 0.2, 0.15, 0.25], mutes: [false, false, false, false, false, false, false, false], distortion: { type: 'tanh', amount: 0.3 }, filter: '808-lpf' },
      { enabled: true, level: 0.7, channels: [0.8, 0.6, 0.5, 0.3, 0.4, 0.2, 0.15, 0.25], mutes: [false, false, false, false, false, false, false, false], distortion: { type: 'tanh', amount: 0.3 }, filter: '808-lpf' },
      { enabled: true, level: 0.7, channels: [0.8, 0.6, 0.5, 0.3, 0.4, 0.2, 0.15, 0.25], mutes: [false, false, false, false, false, false, false, false], distortion: { type: 'tanh', amount: 0.3 }, filter: '808-lpf' }
    ],

    // Sequencer
    sequencer: {
      steps: new Array(16).fill(null).map(() => ({ active: false, voice: 0, velocity: 1.0 })),
      swing: 0,
      probability: 1.0
    },

    // Nasty range parameters
    nasty: {
      decayFine: 0.5,
      decayExtend: 200,
      subHarmonicMix: 0.3,
      clickIntensity: 0.4,
      grimeAmount: 0.2,
      pitchDrift: 0,
      growlFreq: 600
    },

    // LFO
    lfo: {
      rate: 4,
      depth: 0.5,
      waveform: 'sine',
      target: 'filter',
      sync: false
    },

    // Master effects
    master: {
      compThreshold: -24,
      compRatio: 4,
      reverbMix: 0.1,
      limiter: -3,
      gateThreshold: -50,  // Noise gate threshold (dB) - aggressive
      gateRelease: 0.02    // Noise gate release (seconds) - fast
    },

    // Envelope settings (808-style defaults)
    envelope: {
      pitchStart: 130,    // Hz
      pitchEnd: 50,       // Hz
      pitchTime: 0.006,   // seconds (6ms)
      attack: 0.002,      // seconds (2ms)
      decay: 200          // ms
    },

    // Filter settings
    filter: {
      cutoff: 200,
      taps: 127,
      window: 'blackman',
      preset: '808-lpf'
    },

    // MIDI mappings (VMX8: knobs CC30-37, sliders CC40-47)
    midi: {
      mappings: {
        30: 'filter.cutoff',
        31: 'filter.resonance',
        32: 'distortion.amount',
        33: 'lfo.rate',
        34: 'lfo.depth',
        35: 'master.reverbMix',
        36: 'master.compThreshold',
        37: 'masterLevel',
        40: 'voices.0.level',
        41: 'voices.1.level',
        42: 'voices.2.level',
        43: 'voices.3.level',
        44: 'nasty.decayFine',
        45: 'nasty.decayExtend',
        46: 'nasty.grimeAmount',
        47: 'nasty.subHarmonicMix'
      }
    }
  },

  // Current state
  current: null,

  // Initialize state
  init() {
    this.current = this.load() || NS.Utils.clone(this.defaults);
    NS.Bus.emit('state:loaded', this.current);
    console.log('[Dunk] State initialized');
  },

  // Get value by path (e.g., 'voices.0.level')
  get(path) {
    const parts = path.split('.');
    let value = this.current;
    for (const part of parts) {
      if (value === undefined) return undefined;
      value = value[part];
    }
    return value;
  },

  // Set value by path
  set(path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    let target = this.current;

    for (const part of parts) {
      if (target[part] === undefined) {
        target[part] = {};
      }
      target = target[part];
    }

    target[last] = value;
    this.save();
    NS.Bus.emit('state:changed', { path, value });
    NS.Bus.emit(`state:${path}`, value);
  },

  // Save to localStorage
  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.current));
    } catch (e) {
      console.error('[Dunk] Failed to save state:', e);
    }
  },

  // Load from localStorage
  load() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('[Dunk] Failed to load state:', e);
      return null;
    }
  },

  // Reset to defaults
  reset() {
    this.current = NS.Utils.clone(this.defaults);
    this.save();
    NS.Bus.emit('state:reset', this.current);
  },

  // Clear all stored state (full reset including localStorage)
  clearAll() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.PRESETS_KEY);
    localStorage.removeItem('dunk-controller-mappings');
    this.current = NS.Utils.clone(this.defaults);
    console.log('[Dunk] All state cleared');
    NS.Bus.emit('state:cleared');
  },

  // Clear just the sequencer steps
  clearSequencer() {
    this.current.sequencer.steps = new Array(16).fill(null).map(() => ({
      active: false,
      voice: 0,
      velocity: 1.0
    }));
    this.save();
    NS.Bus.emit('state:sequencerCleared');
    console.log('[Dunk] Sequencer cleared');
  },

  // Export state as JSON
  export() {
    return JSON.stringify(this.current, null, 2);
  },

  // Import state from JSON
  import(json) {
    try {
      const data = JSON.parse(json);
      this.current = NS.Utils.merge(NS.Utils.clone(this.defaults), data);
      this.save();
      NS.Bus.emit('state:imported', this.current);
      return true;
    } catch (e) {
      console.error('[Dunk] Failed to import state:', e);
      return false;
    }
  }
};

// Preset Manager
NS.Presets = {
  // Built-in presets
  builtIn: {
    '808-classic': {
      name: '808 Classic',
      voices: [
        { enabled: true, level: 0.85, channels: [0.9, 0.5, 0.4, 0.2, 0.3, 0, 0.1, 0], mutes: [false, false, false, false, false, true, false, true], distortion: { type: 'tanh', amount: 0.2 }, filter: '808-lpf' }
      ],
      nasty: { decayFine: 0.4, decayExtend: 300, subHarmonicMix: 0.3, clickIntensity: 0.5, grimeAmount: 0.1, pitchDrift: 0, growlFreq: 500 },
      lfo: { rate: 0, depth: 0, waveform: 'sine', target: 'filter', sync: false }
    },
    'dubstep-wobble': {
      name: 'Dubstep Wobble',
      voices: [
        { enabled: true, level: 0.8, channels: [0.7, 0.4, 0.3, 0.5, 0.4, 0.3, 0.2, 0.6], mutes: [false, false, false, false, false, false, false, false], distortion: { type: 'foldback', amount: 0.5 }, filter: 'dubstep-mid' }
      ],
      nasty: { decayFine: 0.6, decayExtend: 800, subHarmonicMix: 0.5, clickIntensity: 0.3, grimeAmount: 0.4, pitchDrift: 10, growlFreq: 650 },
      lfo: { rate: 4, depth: 0.7, waveform: 'sine', target: 'filter', sync: true }
    },
    'reese-bass': {
      name: 'Reese Bass',
      voices: [
        { enabled: true, level: 0.75, channels: [0.6, 0.3, 0.1, 0.4, 0.5, 0.2, 0.1, 0.9], mutes: [false, false, true, false, false, false, true, false], distortion: { type: 'cubic', amount: 0.4 }, filter: 'sub-pass' }
      ],
      nasty: { decayFine: 0.7, decayExtend: 1200, subHarmonicMix: 0.6, clickIntensity: 0.2, grimeAmount: 0.3, pitchDrift: 8, growlFreq: 550 },
      lfo: { rate: 2, depth: 0.4, waveform: 'triangle', target: 'filter', sync: false }
    },
    'nasty-sub': {
      name: 'Nasty Sub',
      voices: [
        { enabled: true, level: 0.9, channels: [1.0, 0.3, 0.6, 0.4, 0.7, 0.1, 0.3, 0.2], mutes: [false, false, false, false, false, true, false, true], distortion: { type: 'hardclip', amount: 0.6 }, filter: 'sub-pass' }
      ],
      nasty: { decayFine: 0.8, decayExtend: 1500, subHarmonicMix: 0.8, clickIntensity: 0.7, grimeAmount: 0.6, pitchDrift: -15, growlFreq: 700 },
      lfo: { rate: 1, depth: 0.3, waveform: 'sine', target: 'amplitude', sync: false }
    }
  },

  // User presets (stored in localStorage)
  user: {},

  init() {
    this.loadUserPresets();
  },

  loadUserPresets() {
    try {
      const data = localStorage.getItem(NS.State.PRESETS_KEY);
      this.user = data ? JSON.parse(data) : {};
    } catch (e) {
      this.user = {};
    }
  },

  saveUserPresets() {
    try {
      localStorage.setItem(NS.State.PRESETS_KEY, JSON.stringify(this.user));
    } catch (e) {
      console.error('[Dunk] Failed to save user presets:', e);
    }
  },

  // Get all preset names (built-in + user)
  list() {
    return {
      builtIn: Object.keys(this.builtIn),
      user: Object.keys(this.user)
    };
  },

  // Load a preset
  load(id) {
    const preset = this.builtIn[id] || this.user[id];
    if (!preset) {
      console.warn(`[Dunk] Preset "${id}" not found`);
      return false;
    }

    // Merge preset with current state
    const newState = NS.Utils.clone(NS.State.defaults);
    NS.Utils.merge(newState, preset);
    NS.State.current = newState;
    NS.State.save();

    NS.Bus.emit('preset:loaded', { id, preset });
    return true;
  },

  // Save current state as user preset
  save(name) {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    this.user[id] = {
      name,
      voices: NS.Utils.clone(NS.State.current.voices),
      nasty: NS.Utils.clone(NS.State.current.nasty),
      lfo: NS.Utils.clone(NS.State.current.lfo),
      master: NS.Utils.clone(NS.State.current.master),
      filter: NS.Utils.clone(NS.State.current.filter)
    };
    this.saveUserPresets();
    NS.Bus.emit('preset:saved', { id, name });
    return id;
  },

  // Delete user preset
  delete(id) {
    if (this.user[id]) {
      delete this.user[id];
      this.saveUserPresets();
      NS.Bus.emit('preset:deleted', id);
      return true;
    }
    return false;
  }
};

console.log('[Dunk] State module loaded');
