/**
 * Dunk - MIDI Module
 * Web MIDI API integration with CC mapping
 */

NS.MIDI = {
  // CC ranges
  KNOBS: { start: 20, end: 27 },
  SLIDERS: { start: 40, end: 47 },

  // Default mappings
  defaultMappings: {
    // Knobs (CC 20-27)
    20: 'filter.cutoff',
    21: 'filter.resonance',
    22: 'distortion.amount',
    23: 'lfo.rate',
    24: 'lfo.depth',
    25: 'master.reverbMix',
    26: 'master.compThreshold',
    27: 'masterLevel',
    // Sliders (CC 40-47)
    40: 'voices.0.level',
    41: 'voices.1.level',
    42: 'voices.2.level',
    43: 'voices.3.level',
    44: 'nasty.decayFine',
    45: 'nasty.decayExtend',
    46: 'nasty.grimeAmount',
    47: 'nasty.subHarmonicMix'
  },

  // Current mappings
  mappings: {},

  // State
  access: null,
  inputs: [],
  learnMode: false,
  learnTarget: null,
  lastCC: null,

  /**
   * Initialize MIDI
   */
  async init() {
    // Load saved mappings or use defaults
    this.mappings = NS.State.get('midi.mappings') || { ...this.defaultMappings };

    // Request MIDI access
    try {
      if (navigator.requestMIDIAccess) {
        this.access = await navigator.requestMIDIAccess();
        this._setupInputs();

        // Handle device connection/disconnection
        this.access.onstatechange = () => this._setupInputs();

        console.log('[Dunk] MIDI initialized');
      } else {
        console.log('[Dunk] Web MIDI not supported');
      }
    } catch (e) {
      console.warn('[Dunk] MIDI access denied:', e);
    }

    // Setup MIDI Learn button
    const learnBtn = NS.DOM.$('#btn-midi-learn');
    if (learnBtn) {
      NS.DOM.on(learnBtn, 'click', () => this.toggleLearn());
    }
  },

  /**
   * Setup MIDI inputs
   */
  _setupInputs() {
    this.inputs = [];

    this.access.inputs.forEach(input => {
      this.inputs.push(input);
      input.onmidimessage = (msg) => this._handleMessage(msg);
      console.log(`[Dunk] MIDI input: ${input.name}`);
    });
  },

  /**
   * Handle incoming MIDI message
   */
  _handleMessage(msg) {
    const [status, data1, data2] = msg.data;
    const channel = status & 0x0F;
    const type = status & 0xF0;

    // Control Change (CC)
    if (type === 0xB0) {
      const cc = data1;
      const value = data2;

      this.lastCC = cc;

      // MIDI Learn mode
      if (this.learnMode && this.learnTarget) {
        this._assignMapping(cc, this.learnTarget);
        return;
      }

      // Normal operation
      this._processCC(cc, value);
    }

    // Note On (could trigger voice)
    if (type === 0x90 && data2 > 0) {
      const note = data1;
      const velocity = data2 / 127;

      // Trigger voice based on note (C1-C5 map to voices 0-3)
      const voice = Math.floor((note - 36) / 12) % 4;
      NS.VoiceBank.trigger(voice, velocity);
    }
  },

  /**
   * Process CC message
   */
  _processCC(cc, value) {
    const target = this.mappings[cc];
    if (!target) return;

    const normalized = value / 127;

    // Apply to target parameter
    this._applyToTarget(target, normalized);

    NS.Bus.emit('midi:cc', { cc, value, normalized, target });
  },

  /**
   * Apply normalized value to target parameter
   */
  _applyToTarget(target, normalized) {
    // Handle special cases
    if (target.startsWith('voices.')) {
      // Voice level: voices.0.level
      const parts = target.split('.');
      const voiceIdx = parseInt(parts[1]);
      if (parts[2] === 'level') {
        const voice = NS.VoiceBank.get(voiceIdx);
        if (voice) {
          NS.Voice.setLevel(voice, normalized);
        }
      }
      return;
    }

    if (target.startsWith('nasty.')) {
      const param = target.replace('nasty.', '');
      const paramDef = NS.Nasty.params[param];
      if (paramDef) {
        const value = NS.Utils.lerp(paramDef.min, paramDef.max, normalized);
        NS.Nasty.set(param, value);
        this._updateUI(target, value);
      }
      return;
    }

    if (target === 'filter.cutoff') {
      // Map to 20-2000Hz (log scale would be better)
      const cutoff = 20 + normalized * 1980;
      NS.MasterBus.setFilterCutoff(cutoff);
      this._updateUI(target, cutoff);
      return;
    }

    if (target === 'lfo.rate') {
      const rate = 0.5 + normalized * 15.5;
      NS.State.set('lfo.rate', rate);
      this._updateUI(target, rate);
      return;
    }

    if (target === 'lfo.depth') {
      NS.State.set('lfo.depth', normalized);
      this._updateUI(target, normalized);
      return;
    }

    if (target === 'masterLevel') {
      NS.State.set('masterLevel', normalized);
      this._updateUI(target, normalized);
      return;
    }

    if (target.startsWith('master.')) {
      const param = target.replace('master.', '');
      let value;

      switch (param) {
        case 'compThreshold':
          value = -60 + normalized * 60;
          break;
        case 'compRatio':
          value = 1 + normalized * 19;
          break;
        case 'reverbMix':
          value = normalized;
          break;
        case 'limiter':
          value = -12 + normalized * 12;
          break;
        default:
          value = normalized;
      }

      NS.State.set(target, value);
      this._updateUI(target, value);
      return;
    }

    // Generic parameter set
    NS.State.set(target, normalized);
  },

  /**
   * Update UI control to reflect MIDI-set value
   */
  _updateUI(target, value) {
    // Map target to UI element ID
    const uiMap = {
      'filter.cutoff': { input: '#filter-cutoff', val: '#filter-cutoff-val', format: (v) => Math.round(v) + ' Hz' },
      'lfo.rate': { input: '#lfo-rate', val: '#lfo-rate-val', format: (v) => v.toFixed(1) + ' Hz' },
      'lfo.depth': { input: '#lfo-depth', val: '#lfo-depth-val', format: (v) => Math.round(v * 100) + '%' },
      'masterLevel': { input: '#master-level', val: '#master-level-val', format: (v) => Math.round(v * 100) + '%' },
      'master.compThreshold': { input: '#master-comp-thresh', val: '#master-comp-thresh-val', format: (v) => Math.round(v) + ' dB' },
      'master.compRatio': { input: '#master-comp-ratio', val: '#master-comp-ratio-val', format: (v) => Math.round(v) + ':1' },
      'master.reverbMix': { input: '#master-reverb', val: '#master-reverb-val', format: (v) => Math.round(v * 100) + '%' },
      'master.limiter': { input: '#master-limiter', val: '#master-limiter-val', format: (v) => Math.round(v) + ' dB' },
      'nasty.decayFine': { input: '#nasty-decay-fine', val: '#nasty-decay-fine-val', format: (v) => v.toFixed(2) },
      'nasty.decayExtend': { input: '#nasty-decay-extend', val: '#nasty-decay-extend-val', format: (v) => Math.round(v) + ' ms' },
      'nasty.grimeAmount': { input: '#nasty-grime', val: '#nasty-grime-val', format: (v) => v.toFixed(2) },
      'nasty.subHarmonicMix': { input: '#nasty-sub-harmonic', val: '#nasty-sub-harmonic-val', format: (v) => v.toFixed(2) }
    };

    const mapping = uiMap[target];
    if (!mapping) return;

    const input = NS.DOM.$(mapping.input);
    const valEl = NS.DOM.$(mapping.val);

    if (input) {
      // Convert value back to input range
      if (target === 'lfo.depth' || target === 'masterLevel' || target === 'master.reverbMix') {
        input.value = Math.round(value * 100);
      } else if (target.startsWith('nasty.')) {
        const param = target.replace('nasty.', '');
        const paramDef = NS.Nasty.params[param];
        if (paramDef && paramDef.max <= 1) {
          input.value = Math.round(value * 100);
        } else {
          input.value = value;
        }
      } else {
        input.value = value;
      }
    }

    if (valEl) {
      valEl.textContent = mapping.format(value);
    }
  },

  /**
   * Toggle MIDI Learn mode
   */
  toggleLearn() {
    this.learnMode = !this.learnMode;

    const btn = NS.DOM.$('#btn-midi-learn');
    if (btn) {
      btn.classList.toggle('active', this.learnMode);
    }

    document.body.classList.toggle('midi-learn-mode', this.learnMode);

    if (this.learnMode) {
      this._setupLearnTargets();
      NS.Bus.emit('midi:learnStart');
    } else {
      this._cleanupLearnTargets();
      this.learnTarget = null;
      NS.Bus.emit('midi:learnStop');
    }
  },

  /**
   * Setup click targets for MIDI learn
   */
  _setupLearnTargets() {
    // Mark all controllable elements
    const targets = [
      { el: '#filter-cutoff', target: 'filter.cutoff' },
      { el: '#lfo-rate', target: 'lfo.rate' },
      { el: '#lfo-depth', target: 'lfo.depth' },
      { el: '#master-level', target: 'masterLevel' },
      { el: '#master-comp-thresh', target: 'master.compThreshold' },
      { el: '#master-comp-ratio', target: 'master.compRatio' },
      { el: '#master-reverb', target: 'master.reverbMix' },
      { el: '#master-limiter', target: 'master.limiter' },
      { el: '#nasty-decay-fine', target: 'nasty.decayFine' },
      { el: '#nasty-decay-extend', target: 'nasty.decayExtend' },
      { el: '#nasty-grime', target: 'nasty.grimeAmount' },
      { el: '#nasty-sub-harmonic', target: 'nasty.subHarmonicMix' }
    ];

    targets.forEach(({ el, target }) => {
      const element = NS.DOM.$(el);
      if (element) {
        element.dataset.midiTarget = target;
        element._midiLearnHandler = () => {
          this.learnTarget = target;
          element.style.outline = '2px solid #00ff00';
        };
        element.addEventListener('click', element._midiLearnHandler);
      }
    });
  },

  /**
   * Cleanup MIDI learn targets
   */
  _cleanupLearnTargets() {
    NS.DOM.$$('[data-midi-target]').forEach(el => {
      if (el._midiLearnHandler) {
        el.removeEventListener('click', el._midiLearnHandler);
        delete el._midiLearnHandler;
      }
      el.style.outline = '';
      delete el.dataset.midiTarget;
    });
  },

  /**
   * Assign CC to target
   */
  _assignMapping(cc, target) {
    this.mappings[cc] = target;
    NS.State.set('midi.mappings', this.mappings);

    // Exit learn mode
    this.toggleLearn();

    console.log(`[Dunk] MIDI: CC${cc} → ${target}`);
    NS.Bus.emit('midi:mapped', { cc, target });
  },

  /**
   * Get mapping for CC
   */
  getMapping(cc) {
    return this.mappings[cc];
  },

  /**
   * Reset to default mappings
   */
  resetMappings() {
    this.mappings = { ...this.defaultMappings };
    NS.State.set('midi.mappings', this.mappings);
  },

  /**
   * Get all current mappings
   */
  getMappings() {
    return { ...this.mappings };
  }
};

console.log('[Dunk] MIDI module loaded');
