/**
 * Dunk - MIDI Module
 * Web MIDI API integration with aggressive device capture
 * Enhanced status feedback and VMX8 controller support
 */

NS.MIDI = {
  // Known controller profiles
  CONTROLLERS: {
    'VMX8': { name: 'VMX8', knobs: { start: 30, end: 37 }, sliders: { start: 40, end: 47 } },
    'VMX-8': { name: 'VMX8', knobs: { start: 30, end: 37 }, sliders: { start: 40, end: 47 } },
    'nanoKONTROL': { name: 'nanoKONTROL', knobs: { start: 16, end: 23 }, sliders: { start: 0, end: 7 } },
    'Launch Control': { name: 'Launch Control', knobs: { start: 21, end: 28 }, sliders: { start: 41, end: 48 } }
  },

  // CC ranges (default VMX8)
  KNOBS: { start: 30, end: 37 },
  SLIDERS: { start: 40, end: 47 },

  // State
  access: null,
  inputs: [],
  outputs: [],
  activeDevice: null,
  learnMode: false,
  learnTarget: null,
  lastCC: null,
  lastActivity: 0,

  // Activity tracking for status
  ccActivity: {},

  /**
   * Initialize MIDI with aggressive device capture
   */
  async init() {
    console.log('[MIDI] Initializing...');

    try {
      if (!navigator.requestMIDIAccess) {
        this._updateStatus('Web MIDI not supported', 'error');
        return;
      }

      // Request with sysex for broader compatibility
      this.access = await navigator.requestMIDIAccess({ sysex: false });

      // Setup inputs immediately
      this._setupInputs();

      // Poll for new devices every 2 seconds (aggressive capture)
      this._pollInterval = setInterval(() => this._pollDevices(), 2000);

      // Handle device connection/disconnection
      this.access.onstatechange = (e) => {
        console.log('[MIDI] State change:', e.port.name, e.port.state);
        this._setupInputs();
        this._updateStatusBar();
      };

      this._updateStatus('MIDI Ready', 'ready');
      console.log('[MIDI] Initialized');

    } catch (e) {
      console.warn('[MIDI] Access denied:', e);
      this._updateStatus('MIDI Access Denied', 'error');
    }

    // Setup MIDI Learn button
    const learnBtn = NS.DOM.$('#btn-midi-learn');
    if (learnBtn) {
      NS.DOM.on(learnBtn, 'click', () => this.toggleLearn());
    }
  },

  /**
   * Poll for new MIDI devices (aggressive capture)
   */
  _pollDevices() {
    if (!this.access) return;

    let newDevices = [];
    this.access.inputs.forEach(input => {
      if (!this.inputs.find(i => i.id === input.id)) {
        newDevices.push(input);
      }
    });

    if (newDevices.length > 0) {
      console.log('[MIDI] New devices detected:', newDevices.map(d => d.name));
      this._setupInputs();
    }
  },

  /**
   * Setup MIDI inputs
   */
  _setupInputs() {
    this.inputs = [];
    this.outputs = [];

    if (!this.access) return;

    this.access.inputs.forEach(input => {
      this.inputs.push(input);
      input.onmidimessage = (msg) => this._handleMessage(msg, input);
      console.log(`[MIDI] Input connected: ${input.name}`);

      // Check for known controllers
      this._detectController(input.name);
    });

    this.access.outputs.forEach(output => {
      this.outputs.push(output);
      console.log(`[MIDI] Output available: ${output.name}`);
    });

    this._updateStatusBar();

    // Update controller panel if available
    if (NS.Controller) {
      NS.Controller.updateDeviceStatus(
        this.inputs.length > 0,
        this.inputs[0]?.name
      );
    }
  },

  /**
   * Detect known controller and apply profile
   */
  _detectController(name) {
    for (const [pattern, profile] of Object.entries(this.CONTROLLERS)) {
      if (name.toLowerCase().includes(pattern.toLowerCase())) {
        console.log(`[MIDI] Detected controller: ${profile.name}`);
        this.activeDevice = profile;
        this.KNOBS = profile.knobs;
        this.SLIDERS = profile.sliders;

        // Show controller panel and status
        this._updateStatus(`${profile.name} Connected`, 'connected');

        // Auto-show controller panel for VMX8
        if (profile.name === 'VMX8' && NS.Controller) {
          NS.Controller.show();
        }

        NS.Bus.emit('midi:deviceDetected', { name: profile.name, profile });
        return;
      }
    }
  },

  /**
   * Handle incoming MIDI message
   */
  _handleMessage(msg, input) {
    const [status, data1, data2] = msg.data;
    const channel = status & 0x0F;
    const type = status & 0xF0;

    this.lastActivity = Date.now();

    // Control Change (CC)
    if (type === 0xB0) {
      const cc = data1;
      const value = data2;

      this.lastCC = cc;
      this.ccActivity[cc] = { value, time: Date.now() };

      // Update status bar with CC activity
      this._updateCCStatus(cc, value, input.name);

      // MIDI Learn mode
      if (this.learnMode && this.learnTarget) {
        this._assignMapping(cc, this.learnTarget);
        return;
      }

      // Emit for controller to handle
      NS.Bus.emit('midi:cc', { cc, value, normalized: value / 127, input: input.name });
    }

    // Note On
    if (type === 0x90 && data2 > 0) {
      const note = data1;
      const velocity = data2 / 127;

      this._updateNoteStatus(note, velocity, input.name);

      // Trigger voice based on note
      if (NS.VoiceBank) {
        const voice = Math.floor((note - 36) / 12) % 4;
        NS.VoiceBank.trigger(voice, velocity, NS.Nasty?.getTriggerOptions());
      }

      NS.Bus.emit('midi:note', { note, velocity, input: input.name });
    }

    // Note Off
    if (type === 0x80 || (type === 0x90 && data2 === 0)) {
      NS.Bus.emit('midi:noteOff', { note: data1, input: input.name });
    }
  },

  /**
   * Update main status bar with MIDI info
   */
  _updateStatusBar() {
    const statusEl = NS.DOM.$('#midi-status');
    if (!statusEl) return;

    if (this.inputs.length > 0) {
      const deviceName = this.activeDevice?.name || this.inputs[0].name;
      statusEl.innerHTML = `
        <span class="midi-icon connected">&#9835;</span>
        <span class="midi-device">${deviceName}</span>
        <span id="midi-cc-display" class="midi-cc"></span>
      `;
      statusEl.className = 'midi-status connected';
    } else {
      statusEl.innerHTML = `
        <span class="midi-icon disconnected">&#9835;</span>
        <span class="midi-device">No MIDI</span>
      `;
      statusEl.className = 'midi-status disconnected';
    }
  },

  /**
   * Update CC status display
   */
  _updateCCStatus(cc, value, inputName) {
    const ccDisplay = NS.DOM.$('#midi-cc-display');
    if (ccDisplay) {
      ccDisplay.textContent = `CC${cc}:${value}`;
      ccDisplay.classList.add('flash');
      setTimeout(() => ccDisplay.classList.remove('flash'), 150);
    }

    // Also update footer MIDI indicator
    const footerMidi = NS.DOM.$('#footer-midi-activity');
    if (footerMidi) {
      footerMidi.textContent = `CC${cc.toString().padStart(2, '0')} = ${value.toString().padStart(3, ' ')}`;
      footerMidi.dataset.cc = cc;
      footerMidi.classList.add('active');
      clearTimeout(this._footerTimeout);
      this._footerTimeout = setTimeout(() => {
        footerMidi.classList.remove('active');
      }, 500);
    }
  },

  /**
   * Update note status display
   */
  _updateNoteStatus(note, velocity, inputName) {
    const footerMidi = NS.DOM.$('#footer-midi-activity');
    if (footerMidi) {
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const noteName = noteNames[note % 12] + Math.floor(note / 12 - 1);
      footerMidi.textContent = `NOTE ${noteName} v${Math.round(velocity * 127)}`;
      footerMidi.classList.add('active');
      clearTimeout(this._footerTimeout);
      this._footerTimeout = setTimeout(() => {
        footerMidi.classList.remove('active');
      }, 500);
    }
  },

  /**
   * Update status helper
   */
  _updateStatus(message, state) {
    console.log(`[MIDI] Status: ${message} (${state})`);
    NS.Bus.emit('midi:status', { message, state });
  },

  /**
   * Toggle MIDI Learn mode
   */
  toggleLearn() {
    this.learnMode = !this.learnMode;

    const btn = NS.DOM.$('#btn-midi-learn');
    if (btn) {
      btn.classList.toggle('active', this.learnMode);
      btn.textContent = this.learnMode ? 'Learning...' : 'MIDI Learn';
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
    const targets = NS.DOM.$$('input[type="range"], select');
    targets.forEach(el => {
      const id = el.id;
      if (!id) return;

      el.dataset.midiLearn = 'true';
      el._midiLearnHandler = () => {
        this.learnTarget = id;
        el.style.outline = '2px solid #00ff00';
        this._updateStatus(`Move CC for: ${id}`, 'learning');
      };
      el.addEventListener('click', el._midiLearnHandler);
    });
  },

  /**
   * Cleanup MIDI learn targets
   */
  _cleanupLearnTargets() {
    NS.DOM.$$('[data-midi-learn]').forEach(el => {
      if (el._midiLearnHandler) {
        el.removeEventListener('click', el._midiLearnHandler);
        delete el._midiLearnHandler;
      }
      el.style.outline = '';
      delete el.dataset.midiLearn;
    });
  },

  /**
   * Assign CC to target
   */
  _assignMapping(cc, targetId) {
    const mapping = { cc, target: targetId };
    const savedMappings = NS.State.get('midi.learnedMappings') || {};
    savedMappings[cc] = targetId;
    NS.State.set('midi.learnedMappings', savedMappings);

    console.log(`[MIDI] Mapped CC${cc} → ${targetId}`);
    this._updateStatus(`CC${cc} → ${targetId}`, 'mapped');

    // Exit learn mode
    this.toggleLearn();

    NS.Bus.emit('midi:mapped', { cc, target: targetId });
  },

  /**
   * Get all connected devices info
   */
  getDevices() {
    return {
      inputs: this.inputs.map(i => ({ name: i.name, id: i.id, state: i.state })),
      outputs: this.outputs.map(o => ({ name: o.name, id: o.id, state: o.state })),
      activeDevice: this.activeDevice
    };
  },

  /**
   * Manually trigger device rescan
   */
  rescan() {
    console.log('[MIDI] Manual rescan...');
    this._setupInputs();
  }
};

console.log('[Dunk] MIDI module loaded');
