/**
 * Dunk - Core Module
 * Event bus and utility functions
 */

// Global namespace
const NS = window.NS = window.NS || {};

// Event Bus - Pub/Sub pattern for component communication
NS.Bus = {
  _listeners: {},

  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
    return () => this.off(event, callback);
  },

  off(event, callback) {
    if (!this._listeners[event]) return;
    const idx = this._listeners[event].indexOf(callback);
    if (idx > -1) {
      this._listeners[event].splice(idx, 1);
    }
  },

  emit(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.error(`Event handler error for "${event}":`, e);
      }
    });
  },

  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }
};

// Audio Context singleton
NS.Audio = {
  ctx: null,
  sampleRate: 48000,

  async init() {
    if (this.ctx) return this.ctx;

    this.ctx = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: this.sampleRate
    });

    // Resume if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    NS.Bus.emit('audio:ready', this.ctx);
    return this.ctx;
  },

  get currentTime() {
    return this.ctx ? this.ctx.currentTime : 0;
  },

  get destination() {
    return this.ctx ? this.ctx.destination : null;
  }
};

// Utility functions
NS.Utils = {
  // Clamp value between min and max
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  // Linear interpolation
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  // Map value from one range to another
  map(value, inMin, inMax, outMin, outMax) {
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
  },

  // Convert MIDI note to frequency
  midiToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  },

  // Convert frequency to MIDI note
  freqToMidi(freq) {
    return 69 + 12 * Math.log2(freq / 440);
  },

  // Convert decibels to linear gain
  dbToGain(db) {
    return Math.pow(10, db / 20);
  },

  // Convert linear gain to decibels
  gainToDb(gain) {
    return 20 * Math.log10(Math.max(gain, 0.0001));
  },

  // Generate unique ID
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // Debounce function calls
  debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  // Throttle function calls
  throttle(fn, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Deep clone object
  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  // Merge objects deeply
  merge(target, ...sources) {
    for (const source of sources) {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = target[key] || {};
          this.merge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    return target;
  }
};

// DOM utilities
NS.DOM = {
  $(selector, context = document) {
    return context.querySelector(selector);
  },

  $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  },

  on(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    return () => element.removeEventListener(event, handler, options);
  },

  create(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') {
        el.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key.startsWith('data-')) {
        el.dataset[key.slice(5)] = value;
      } else {
        el.setAttribute(key, value);
      }
    }
    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    }
    return el;
  }
};

// Constants
NS.CONSTANTS = {
  SAMPLE_RATE: 48000,
  VOICE_COUNT: 4,
  CHANNEL_COUNT: 8,
  STEP_COUNT: 16,

  // Channel types
  CHANNELS: {
    SUB: 0,
    BODY: 1,
    CLICK: 2,
    HARMONICS: 3,
    SUB_HARMONIC: 4,
    FORMANT: 5,
    NOISE: 6,
    REESE: 7
  },

  // 808 synthesis defaults
  PITCH_START: 130,  // Hz
  PITCH_END: 50,     // Hz
  PITCH_TIME: 0.006, // 6ms
  ATTACK: 0.002,     // 2ms
  DECAY_MIN: 50,     // ms
  DECAY_MAX: 2000,   // ms
  DECAY_DEFAULT: 200 // ms
};

/**
 * OSC - Message dispatcher for OSC-like parameter control
 *
 * Address format: /category/target/parameter
 * Examples:
 *   /voice/0/level
 *   /voice/1/channel/0/level
 *   /master/reverb
 *   /lfo/rate
 *   /envelope/pitch/start
 *   /nasty/decayFine
 */
NS.OSC = {
  /**
   * Send a value to an OSC address
   * @param {string} address - OSC-style address (e.g., /voice/0/level)
   * @param {number|string} value - Value to set
   */
  send(address, value) {
    const parts = address.split('/').filter(p => p);

    if (parts.length < 2) {
      console.warn('[OSC] Invalid address:', address);
      return;
    }

    const category = parts[0];

    switch (category) {
      case 'voice':
        this._handleVoice(parts, value);
        break;
      case 'master':
        this._handleMaster(parts, value);
        break;
      case 'lfo':
        this._handleLFO(parts, value);
        break;
      case 'envelope':
        this._handleEnvelope(parts, value);
        break;
      case 'nasty':
        this._handleNasty(parts, value);
        break;
      case 'filter':
        this._handleFilter(parts, value);
        break;
      case 'sequencer':
        this._handleSequencer(parts, value);
        break;
      default:
        console.warn('[OSC] Unknown category:', category);
    }

    // Emit event for logging/UI updates
    NS.Bus.emit('osc:message', { address, value });
  },

  /**
   * Handle /voice/N/... messages
   */
  _handleVoice(parts, value) {
    const voiceIdx = parseInt(parts[1]);
    if (isNaN(voiceIdx) || voiceIdx < 0 || voiceIdx > 3) return;

    const voice = NS.VoiceBank?.get(voiceIdx);
    if (!voice) return;

    if (parts[2] === 'level') {
      NS.Voice?.setLevel(voice, value);
    } else if (parts[2] === 'channel' && parts.length >= 5) {
      const channelIdx = parseInt(parts[3]);
      const param = parts[4];
      // Handle channel-specific params
      if (param === 'level') {
        // Channel level
      } else if (param === 'mute') {
        // Channel mute
      }
    } else if (parts[2] === 'distortion') {
      if (parts[3] === 'type') {
        // Set distortion type
      } else if (parts[3] === 'amount') {
        // Set distortion amount
      }
    }
  },

  /**
   * Handle /master/... messages
   */
  _handleMaster(parts, value) {
    const param = parts.slice(1).join('.');
    const pathMap = {
      'level': 'masterLevel',
      'reverb': 'master.reverbMix',
      'comp.threshold': 'master.compThreshold',
      'comp.ratio': 'master.compRatio',
      'limiter': 'master.limiter',
      'gate.threshold': 'master.gateThreshold'
    };

    const statePath = pathMap[param];
    if (statePath) {
      NS.State.set(statePath, value);
    }
  },

  /**
   * Handle /lfo/... messages
   */
  _handleLFO(parts, value) {
    const param = parts[1];
    NS.State.set(`lfo.${param}`, value);
  },

  /**
   * Handle /envelope/... messages
   */
  _handleEnvelope(parts, value) {
    const section = parts[1]; // pitch, amp
    const param = parts[2];   // start, end, time, attack, decay

    if (section === 'pitch') {
      if (param === 'start') NS.CONSTANTS.PITCH_START = value;
      else if (param === 'end') NS.CONSTANTS.PITCH_END = value;
      else if (param === 'time') NS.CONSTANTS.PITCH_TIME = value;
    } else if (section === 'amp') {
      if (param === 'attack') NS.CONSTANTS.ATTACK = value;
      else if (param === 'decay') NS.CONSTANTS.DECAY_DEFAULT = value;
    }

    NS.State.set(`envelope.${section}${param.charAt(0).toUpperCase() + param.slice(1)}`, value);
  },

  /**
   * Handle /nasty/... messages
   */
  _handleNasty(parts, value) {
    const param = parts[1];
    NS.Nasty?.set(param, value);
  },

  /**
   * Handle /filter/... messages
   */
  _handleFilter(parts, value) {
    const param = parts[1];
    if (param === 'cutoff' && NS.MasterBus) {
      NS.MasterBus.setFilterCutoff(value);
    }
    NS.State.set(`filter.${param}`, value);
  },

  /**
   * Handle /sequencer/... messages
   */
  _handleSequencer(parts, value) {
    const cmd = parts[1];
    if (cmd === 'start') NS.Sequencer?.start();
    else if (cmd === 'stop') NS.Sequencer?.stop();
    else if (cmd === 'bpm') NS.State.set('bpm', value);
    else if (cmd === 'step' && parts.length >= 4) {
      const stepIdx = parseInt(parts[2]);
      const action = parts[3];
      if (action === 'on') NS.Sequencer?.setStep(stepIdx, true);
      else if (action === 'off') NS.Sequencer?.setStep(stepIdx, false);
    }
  }
};

console.log('[Dunk] Core module loaded');
