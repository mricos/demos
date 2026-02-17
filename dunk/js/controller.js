/**
 * Dunk - Controller Module
 * VMX8-style virtual MIDI controller with 8 sliders, 8 knobs
 * OSC-like message syntax for parameter targeting
 */

NS.Controller = {
  // VMX8 Layout: 8 knobs (CC30-37), 8 sliders (CC40-47), 32 buttons (4 rows x 8 cols)
  VMX8: {
    name: 'VMX8',
    knobs: { start: 30, count: 8 },
    sliders: { start: 40, count: 8 },
    // Buttons: 4 rows of 8, each column is companion to a slider
    // Row 1: CC 20-27, Row 2: CC 28-35, Row 3: CC 36-43, Row 4: CC 44-51
    buttons: {
      row1: { start: 20, count: 8 },  // CC 20-27
      row2: { start: 28, count: 8 },  // CC 28-35
      row3: { start: 36, count: 8 },  // CC 36-43
      row4: { start: 44, count: 8 }   // CC 44-51
    }
  },

  // Button mappings: CC -> action
  // Buttons send 127 on press, 0 on release
  buttonMappings: {
    // Row 1 (CC 20-27): Voice triggers (one-shot)
    20: { action: 'trigger', voice: 0 },
    21: { action: 'trigger', voice: 1 },
    22: { action: 'trigger', voice: 2 },
    23: { action: 'trigger', voice: 3 },
    24: { action: 'mute', voice: 0 },
    25: { action: 'mute', voice: 1 },
    26: { action: 'mute', voice: 2 },
    27: { action: 'mute', voice: 3 },

    // Row 2 (CC 28-35): Channel mutes for current voice
    28: { action: 'channelMute', channel: 0 },  // Sub
    29: { action: 'channelMute', channel: 1 },  // Body
    30: { action: 'channelMute', channel: 2 },  // Click
    31: { action: 'channelMute', channel: 3 },  // Harmonics
    32: { action: 'channelMute', channel: 4 },  // Sub-Harmonic
    33: { action: 'channelMute', channel: 5 },  // Formant
    34: { action: 'channelMute', channel: 6 },  // Noise
    35: { action: 'channelMute', channel: 7 },  // Reese

    // Row 3 (CC 36-43): Sequencer steps 1-8
    36: { action: 'step', step: 0 },
    37: { action: 'step', step: 1 },
    38: { action: 'step', step: 2 },
    39: { action: 'step', step: 3 },
    40: { action: 'step', step: 4 },
    41: { action: 'step', step: 5 },
    42: { action: 'step', step: 6 },
    43: { action: 'step', step: 7 },

    // Row 4 (CC 44-51): Sequencer steps 9-16
    44: { action: 'step', step: 8 },
    45: { action: 'step', step: 9 },
    46: { action: 'step', step: 10 },
    47: { action: 'step', step: 11 },
    48: { action: 'step', step: 12 },
    49: { action: 'step', step: 13 },
    50: { action: 'step', step: 14 },
    51: { action: 'step', step: 15 },

    // Bottom row transport/global (CC 52-62)
    52: { action: 'transport', cmd: 'rewind' },    // <<
    53: { action: 'transport', cmd: 'forward' },   // >>
    54: { action: 'transport', cmd: 'stop' },      // Stop
    55: { action: 'transport', cmd: 'play' },      // Play
    56: { action: 'transport', cmd: 'record' },    // Record (unused)
    57: { action: 'selectVoice', voice: 0 },       // Select Voice 0
    58: { action: 'selectVoice', voice: 1 },       // Select Voice 1
    59: { action: 'selectVoice', voice: 2 },       // Select Voice 2
    60: { action: 'selectVoice', voice: 3 },       // Select Voice 3
    61: { action: 'transport', cmd: 'clear' },     // Clear pattern
    62: { action: 'trigger', voice: -1 }           // Trigger selected voice
  },

  // Track button states for toggle behavior
  buttonStates: {},

  // Control values (0-127)
  values: {
    knobs: new Array(8).fill(64),
    sliders: new Array(8).fill(0)
  },

  // OSC-like address to state path mapping
  oscMappings: {
    // Voice controls: /voice/{n}/...
    '/voice/*/level': 'voices.$.level',
    '/voice/*/channel/*/level': 'voices.$.channels.$',
    '/voice/*/channel/*/mute': 'voices.$.mutes.$',
    '/voice/*/distortion/type': 'voices.$.distortion.type',
    '/voice/*/distortion/amount': 'voices.$.distortion.amount',
    '/voice/*/filter': 'voices.$.filter',

    // Envelope controls: /envelope/...
    '/envelope/pitch/start': 'envelope.pitchStart',
    '/envelope/pitch/end': 'envelope.pitchEnd',
    '/envelope/pitch/time': 'envelope.pitchTime',
    '/envelope/amp/attack': 'envelope.attack',
    '/envelope/amp/decay': 'envelope.decay',
    '/envelope/amp/decayFine': 'nasty.decayFine',

    // Nasty controls: /nasty/...
    '/nasty/decayFine': 'nasty.decayFine',
    '/nasty/decayExtend': 'nasty.decayExtend',
    '/nasty/subHarmonic': 'nasty.subHarmonicMix',
    '/nasty/click': 'nasty.clickIntensity',
    '/nasty/grime': 'nasty.grimeAmount',
    '/nasty/pitchDrift': 'nasty.pitchDrift',
    '/nasty/growl': 'nasty.growlFreq',

    // Master controls: /master/...
    '/master/level': 'masterLevel',
    '/master/comp/threshold': 'master.compThreshold',
    '/master/comp/ratio': 'master.compRatio',
    '/master/reverb': 'master.reverbMix',
    '/master/limiter': 'master.limiter',
    '/master/gate/threshold': 'master.gateThreshold',

    // LFO controls: /lfo/...
    '/lfo/rate': 'lfo.rate',
    '/lfo/depth': 'lfo.depth',
    '/lfo/waveform': 'lfo.waveform',
    '/lfo/target': 'lfo.target',

    // Filter controls: /filter/...
    '/filter/cutoff': 'filter.cutoff',
    '/filter/taps': 'filter.taps',
    '/filter/window': 'filter.window'
  },

  // Default VMX8 CC mappings with value ranges
  vmx8Mappings: {
    // Knobs (CC 30-37) - typically pan/filter/effects
    knobs: [
      { cc: 30, osc: '/filter/cutoff', min: 20, max: 2000, curve: 'log' },
      { cc: 31, osc: '/nasty/decayFine', min: 0, max: 1, curve: 'linear' },
      { cc: 32, osc: '/nasty/grime', min: 0, max: 1, curve: 'linear' },
      { cc: 33, osc: '/lfo/rate', min: 0.5, max: 16, curve: 'linear' },
      { cc: 34, osc: '/lfo/depth', min: 0, max: 1, curve: 'linear' },
      { cc: 35, osc: '/master/reverb', min: 0, max: 1, curve: 'linear' },
      { cc: 36, osc: '/master/comp/threshold', min: -60, max: 0, curve: 'linear' },
      { cc: 37, osc: '/master/level', min: 0, max: 1, curve: 'linear' }
    ],
    // Sliders (CC 40-47) - typically volume faders
    sliders: [
      { cc: 40, osc: '/voice/0/level', min: 0, max: 1, curve: 'linear' },
      { cc: 41, osc: '/voice/1/level', min: 0, max: 1, curve: 'linear' },
      { cc: 42, osc: '/voice/2/level', min: 0, max: 1, curve: 'linear' },
      { cc: 43, osc: '/voice/3/level', min: 0, max: 1, curve: 'linear' },
      { cc: 44, osc: '/nasty/decayExtend', min: 50, max: 2000, curve: 'linear' },
      { cc: 45, osc: '/nasty/subHarmonic', min: 0, max: 1, curve: 'linear' },
      { cc: 46, osc: '/nasty/click', min: 0, max: 1, curve: 'linear' },
      { cc: 47, osc: '/envelope/amp/decay', min: 50, max: 800, curve: 'linear' }
    ]
  },

  // Custom value curves (0-127 to output range)
  curves: {
    linear: (midi, min, max) => min + (midi / 127) * (max - min),
    log: (midi, min, max) => {
      const norm = midi / 127;
      const logVal = Math.pow(norm, 2); // Quadratic for log-like feel
      return min + logVal * (max - min);
    },
    exp: (midi, min, max) => {
      const norm = midi / 127;
      const expVal = Math.pow(norm, 0.5); // Square root for exp-like feel
      return min + expVal * (max - min);
    }
  },

  // UI panel element
  panel: null,
  visible: false,

  /**
   * Initialize controller
   */
  init() {
    this._createPanel();
    this._setupEvents();

    // Listen for MIDI CC events
    NS.Bus.on('midi:cc', ({ cc, value }) => {
      this._handleMIDI(cc, value);
    });

    console.log('[Dunk] Controller initialized');
  },

  /**
   * Create the controller panel UI
   */
  _createPanel() {
    const panel = NS.DOM.create('div', {
      id: 'panel-controller',
      class: 'floating-panel controller-panel hidden'
    });

    panel.innerHTML = `
      <div class="panel-header">
        <h4>VMX8 Controller</h4>
        <div class="controller-status">
          <span id="ctrl-device-status" class="device-status disconnected">No Device</span>
        </div>
        <button class="btn-close">&times;</button>
      </div>
      <div class="panel-content">
        <div class="controller-layout">
          <div class="ctrl-section ctrl-knobs">
            <div class="ctrl-label">KNOBS (CC30-37)</div>
            <div class="ctrl-row" id="ctrl-knobs-row">
              ${this._createKnobsHTML()}
            </div>
          </div>
          <div class="ctrl-section ctrl-sliders">
            <div class="ctrl-label">FADERS (CC40-47)</div>
            <div class="ctrl-row" id="ctrl-sliders-row">
              ${this._createSlidersHTML()}
            </div>
          </div>
          <div class="ctrl-section ctrl-transport">
            <button id="ctrl-oneshot" class="ctrl-btn oneshot">ONE-SHOT</button>
            <button id="ctrl-play" class="ctrl-btn">PLAY</button>
            <button id="ctrl-stop" class="ctrl-btn">STOP</button>
          </div>
        </div>
        <div class="ctrl-mapping-editor">
          <div class="mapping-header">
            <span>Mapping Editor</span>
            <button id="btn-reset-mappings" class="btn-mini">Reset</button>
          </div>
          <div id="mapping-list" class="mapping-list">
            ${this._createMappingListHTML()}
          </div>
        </div>
      </div>
    `;

    document.getElementById('app').appendChild(panel);
    this.panel = panel;

    // Close button
    const closeBtn = NS.DOM.$('.btn-close', panel);
    NS.DOM.on(closeBtn, 'click', () => this.hide());

    // Make header draggable
    const header = NS.DOM.$('.panel-header', panel);
    NS.DOM.on(header, 'mousedown', (e) => this._startDrag(e, panel));
  },

  /**
   * Create HTML for virtual knobs
   */
  _createKnobsHTML() {
    let html = '';
    for (let i = 0; i < 8; i++) {
      const mapping = this.vmx8Mappings.knobs[i];
      const label = mapping.osc.split('/').pop().substring(0, 6);
      html += `
        <div class="ctrl-control knob" data-type="knob" data-index="${i}" data-cc="${mapping.cc}">
          <div class="ctrl-knob-ring">
            <div class="ctrl-knob-indicator" style="transform: rotate(-135deg)"></div>
          </div>
          <div class="ctrl-value">64</div>
          <div class="ctrl-cc">CC${mapping.cc}</div>
          <div class="ctrl-target">${label}</div>
        </div>
      `;
    }
    return html;
  },

  /**
   * Create HTML for virtual sliders
   */
  _createSlidersHTML() {
    let html = '';
    for (let i = 0; i < 8; i++) {
      const mapping = this.vmx8Mappings.sliders[i];
      const label = mapping.osc.split('/').pop().substring(0, 6);
      html += `
        <div class="ctrl-control slider" data-type="slider" data-index="${i}" data-cc="${mapping.cc}">
          <div class="ctrl-slider-track">
            <div class="ctrl-slider-fill" style="height: 0%"></div>
            <div class="ctrl-slider-thumb" style="bottom: 0%"></div>
          </div>
          <div class="ctrl-value">0</div>
          <div class="ctrl-cc">CC${mapping.cc}</div>
          <div class="ctrl-target">${label}</div>
        </div>
      `;
    }
    return html;
  },

  /**
   * Create mapping list HTML
   */
  _createMappingListHTML() {
    let html = '';
    const allMappings = [...this.vmx8Mappings.knobs, ...this.vmx8Mappings.sliders];

    allMappings.forEach((m, i) => {
      const type = i < 8 ? 'knob' : 'slider';
      const idx = i < 8 ? i : i - 8;
      html += `
        <div class="mapping-row" data-type="${type}" data-index="${idx}">
          <span class="mapping-cc">CC${m.cc}</span>
          <select class="mapping-target" data-cc="${m.cc}">
            ${this._createOSCOptions(m.osc)}
          </select>
          <input type="number" class="mapping-min" value="${m.min}" step="0.01">
          <span class="mapping-arrow">→</span>
          <input type="number" class="mapping-max" value="${m.max}" step="0.01">
          <select class="mapping-curve" data-cc="${m.cc}">
            <option value="linear" ${m.curve === 'linear' ? 'selected' : ''}>Lin</option>
            <option value="log" ${m.curve === 'log' ? 'selected' : ''}>Log</option>
            <option value="exp" ${m.curve === 'exp' ? 'selected' : ''}>Exp</option>
          </select>
        </div>
      `;
    });
    return html;
  },

  /**
   * Create OSC target options
   */
  _createOSCOptions(selected) {
    const options = Object.keys(this.oscMappings);
    return options.map(osc =>
      `<option value="${osc}" ${osc === selected ? 'selected' : ''}>${osc}</option>`
    ).join('');
  },

  /**
   * Setup event handlers
   */
  _setupEvents() {
    // Virtual control interaction
    NS.DOM.on(document, 'mousedown', (e) => {
      const ctrl = e.target.closest('.ctrl-control');
      if (ctrl) {
        this._startControlDrag(e, ctrl);
      }
    });

    NS.DOM.on(document, 'mousemove', (e) => {
      if (this._activeDrag) {
        this._updateControlDrag(e);
      }
      if (this._panelDrag) {
        this._updatePanelDrag(e);
      }
    });

    NS.DOM.on(document, 'mouseup', () => {
      this._activeDrag = null;
      this._panelDrag = null;
    });

    // Transport buttons
    NS.DOM.on(document, 'click', (e) => {
      if (e.target.id === 'ctrl-oneshot') {
        this._triggerOneShot();
      } else if (e.target.id === 'ctrl-play') {
        NS.Sequencer.start();
      } else if (e.target.id === 'ctrl-stop') {
        NS.Sequencer.stop();
      } else if (e.target.id === 'btn-reset-mappings') {
        this._resetMappings();
      }
    });

    // Mapping editor changes
    NS.DOM.on(document, 'change', (e) => {
      if (e.target.classList.contains('mapping-target') ||
          e.target.classList.contains('mapping-curve')) {
        this._updateMapping(e.target);
      }
    });

    NS.DOM.on(document, 'input', (e) => {
      if (e.target.classList.contains('mapping-min') ||
          e.target.classList.contains('mapping-max')) {
        this._updateMappingRange(e.target);
      }
    });
  },

  /**
   * Start dragging a virtual control
   */
  _startControlDrag(e, ctrl) {
    e.preventDefault();
    this._activeDrag = {
      ctrl,
      type: ctrl.dataset.type,
      index: parseInt(ctrl.dataset.index),
      cc: parseInt(ctrl.dataset.cc),
      startY: e.clientY,
      startValue: this.values[ctrl.dataset.type + 's'][ctrl.dataset.index]
    };
  },

  /**
   * Update control during drag
   */
  _updateControlDrag(e) {
    const { ctrl, type, index, cc, startY, startValue } = this._activeDrag;
    const dy = startY - e.clientY;
    const sensitivity = type === 'knob' ? 1 : 2;
    let newValue = Math.round(startValue + dy * sensitivity);
    newValue = Math.max(0, Math.min(127, newValue));

    this.values[type + 's'][index] = newValue;
    this._updateControlUI(ctrl, newValue, type);
    this._applyValue(cc, newValue);
  },

  /**
   * Update control UI display
   */
  _updateControlUI(ctrl, value, type) {
    const valueEl = ctrl.querySelector('.ctrl-value');
    valueEl.textContent = value;

    if (type === 'knob') {
      const indicator = ctrl.querySelector('.ctrl-knob-indicator');
      const angle = -135 + (value / 127) * 270;
      indicator.style.transform = `rotate(${angle}deg)`;
    } else {
      const fill = ctrl.querySelector('.ctrl-slider-fill');
      const thumb = ctrl.querySelector('.ctrl-slider-thumb');
      const percent = (value / 127) * 100;
      fill.style.height = percent + '%';
      thumb.style.bottom = percent + '%';
    }
  },

  /**
   * Apply MIDI value to target parameter
   */
  _applyValue(cc, midiValue) {
    // Find mapping for this CC
    const knobMapping = this.vmx8Mappings.knobs.find(m => m.cc === cc);
    const sliderMapping = this.vmx8Mappings.sliders.find(m => m.cc === cc);
    const mapping = knobMapping || sliderMapping;

    if (!mapping) return;

    // Convert MIDI value using curve
    const curve = this.curves[mapping.curve] || this.curves.linear;
    const value = curve(midiValue, mapping.min, mapping.max);

    // Convert OSC address to state path and apply
    this._applyOSC(mapping.osc, value);

    // Emit for status display
    NS.Bus.emit('controller:change', {
      cc,
      midi: midiValue,
      value,
      osc: mapping.osc
    });
  },

  /**
   * Apply value via OSC-like address
   */
  _applyOSC(address, value) {
    // Parse address to extract wildcards
    const parts = address.split('/').filter(p => p);
    const statePath = this.oscMappings[address];

    if (!statePath) {
      // Try pattern matching for wildcard addresses
      for (const [pattern, path] of Object.entries(this.oscMappings)) {
        if (this._matchOSCPattern(address, pattern)) {
          const resolvedPath = this._resolveOSCPath(address, pattern, path);
          this._applyToState(resolvedPath, value);
          return;
        }
      }
      console.warn('[Controller] No mapping for:', address);
      return;
    }

    this._applyToState(statePath, value);
  },

  /**
   * Match OSC pattern with wildcards
   */
  _matchOSCPattern(address, pattern) {
    const addrParts = address.split('/');
    const patternParts = pattern.split('/');

    if (addrParts.length !== patternParts.length) return false;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '*') continue;
      if (addrParts[i] !== patternParts[i]) return false;
    }
    return true;
  },

  /**
   * Resolve OSC pattern to state path with indices
   */
  _resolveOSCPath(address, pattern, pathTemplate) {
    const addrParts = address.split('/');
    const patternParts = pattern.split('/');

    let path = pathTemplate;
    let wildcardIdx = 0;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '*') {
        path = path.replace('$', addrParts[i]);
        wildcardIdx++;
      }
    }

    return path;
  },

  /**
   * Apply value to state via OSC system
   */
  _applyToState(path, value) {
    // Use standardized OSC message dispatch
    if (NS.OSC) {
      // Convert dot notation to OSC address
      // e.g., 'voices.0.level' -> '/voice/0/level'
      // e.g., 'nasty.decayFine' -> '/nasty/decayFine'
      // e.g., 'filter.cutoff' -> '/filter/cutoff'
      const oscAddress = '/' + path
        .replace(/^voices\./, 'voice/')
        .replace(/\./g, '/');

      NS.OSC.send(oscAddress, value);
      return;
    }

    // Fallback: Handle special cases directly
    if (path.startsWith('voices.')) {
      const parts = path.split('.');
      const voiceIdx = parseInt(parts[1]);
      if (parts[2] === 'level' && NS.VoiceBank) {
        const voice = NS.VoiceBank.get(voiceIdx);
        if (voice) {
          NS.Voice.setLevel(voice, value);
        }
      }
      return;
    }

    if (path.startsWith('nasty.') && NS.Nasty) {
      const param = path.replace('nasty.', '');
      NS.Nasty.set(param, value);
      return;
    }

    if (path === 'filter.cutoff' && NS.MasterBus) {
      NS.MasterBus.setFilterCutoff(value);
      return;
    }

    // Generic state set
    NS.State.set(path, value);
  },

  /**
   * Handle incoming MIDI CC
   */
  _handleMIDI(cc, value) {
    // Check if it's a button (value is 127 or 0)
    if (this.buttonMappings[cc] && (value === 127 || value === 0)) {
      this._handleButton(cc, value === 127);
      return;
    }

    // Update virtual control if it matches
    const knobIdx = this.vmx8Mappings.knobs.findIndex(m => m.cc === cc);
    const sliderIdx = this.vmx8Mappings.sliders.findIndex(m => m.cc === cc);

    if (knobIdx >= 0) {
      this.values.knobs[knobIdx] = value;
      const ctrl = document.querySelector(`.ctrl-control[data-type="knob"][data-index="${knobIdx}"]`);
      if (ctrl) this._updateControlUI(ctrl, value, 'knob');
      this._applyValue(cc, value);
    } else if (sliderIdx >= 0) {
      this.values.sliders[sliderIdx] = value;
      const ctrl = document.querySelector(`.ctrl-control[data-type="slider"][data-index="${sliderIdx}"]`);
      if (ctrl) this._updateControlUI(ctrl, value, 'slider');
      this._applyValue(cc, value);
    }
  },

  /**
   * Handle button press/release
   */
  _handleButton(cc, pressed) {
    const mapping = this.buttonMappings[cc];
    if (!mapping) return;

    // Only act on press (not release) for most actions
    if (!pressed && mapping.action !== 'momentary') {
      return;
    }

    const selectedVoice = NS.Sequencer ? NS.Sequencer.selectedVoice : 0;

    switch (mapping.action) {
      case 'trigger':
        // One-shot trigger for voice (-1 = selected voice)
        if (NS.VoiceBank && NS.App.audioStarted) {
          const voiceId = mapping.voice === -1 ? selectedVoice : mapping.voice;
          NS.VoiceBank.trigger(voiceId, 1.0, NS.Nasty?.getTriggerOptions());
        }
        break;

      case 'mute':
        // Toggle voice mute
        if (NS.VoiceBank) {
          const voice = NS.VoiceBank.get(mapping.voice);
          if (voice) {
            voice.enabled = !voice.enabled;
            NS.Bus.emit('voice:muteChanged', { voice: mapping.voice, muted: !voice.enabled });
          }
        }
        break;

      case 'channelMute':
        // Toggle channel mute on selected voice
        if (NS.VoiceBank) {
          const voice = NS.VoiceBank.get(selectedVoice);
          if (voice && voice.channels[mapping.channel]) {
            const ch = voice.channels[mapping.channel];
            ch.muted = !ch.muted;
            NS.Bus.emit('channel:muteChanged', {
              voice: selectedVoice,
              channel: mapping.channel,
              muted: ch.muted
            });
          }
        }
        break;

      case 'step':
        // Toggle sequencer step
        if (NS.Sequencer) {
          NS.Sequencer.toggleStep(mapping.step);
          // UI will update via event
        }
        break;

      case 'transport':
        if (mapping.cmd === 'play') {
          NS.Sequencer?.start();
          NS.Bus.emit('transport:play');
        } else if (mapping.cmd === 'stop') {
          NS.Sequencer?.stop();
          NS.Bus.emit('transport:stop');
        } else if (mapping.cmd === 'clear') {
          NS.Sequencer?.clear();
          NS.DOM?.$$('.step').forEach(el => el.classList.remove('active'));
          NS.Bus.emit('transport:clear');
        } else if (mapping.cmd === 'rewind') {
          // Decrease BPM by 10
          const bpm = (NS.State?.get('bpm') || 140) - 10;
          NS.State?.set('bpm', Math.max(60, bpm));
          NS.Bus.emit('transport:bpmChange', bpm);
        } else if (mapping.cmd === 'forward') {
          // Increase BPM by 10
          const bpm = (NS.State?.get('bpm') || 140) + 10;
          NS.State?.set('bpm', Math.min(200, bpm));
          NS.Bus.emit('transport:bpmChange', bpm);
        }
        break;

      case 'selectVoice':
        if (NS.Sequencer) {
          NS.Sequencer.setSelectedVoice(mapping.voice);
          NS.Bus.emit('voice:selected', { voice: mapping.voice });
        }
        break;
    }

    NS.Bus.emit('controller:button', { cc, pressed, action: mapping.action });
  },

  /**
   * Trigger one-shot sound
   */
  _triggerOneShot() {
    if (!NS.App.audioStarted) {
      console.warn('[Controller] Audio not started');
      return;
    }
    const voice = NS.Sequencer ? NS.Sequencer.selectedVoice : 0;
    NS.VoiceBank.trigger(voice, 1.0, NS.Nasty.getTriggerOptions());
    NS.Bus.emit('controller:oneshot', { voice });
  },

  /**
   * Update a mapping from UI
   */
  _updateMapping(el) {
    const cc = parseInt(el.dataset.cc);
    const row = el.closest('.mapping-row');
    const type = row.dataset.type;
    const index = parseInt(row.dataset.index);

    if (el.classList.contains('mapping-target')) {
      const mapping = type === 'knob'
        ? this.vmx8Mappings.knobs[index]
        : this.vmx8Mappings.sliders[index];
      mapping.osc = el.value;
    } else if (el.classList.contains('mapping-curve')) {
      const mapping = type === 'knob'
        ? this.vmx8Mappings.knobs[index]
        : this.vmx8Mappings.sliders[index];
      mapping.curve = el.value;
    }

    this._saveMappings();
  },

  /**
   * Update mapping range from UI
   */
  _updateMappingRange(el) {
    const row = el.closest('.mapping-row');
    const type = row.dataset.type;
    const index = parseInt(row.dataset.index);
    const mapping = type === 'knob'
      ? this.vmx8Mappings.knobs[index]
      : this.vmx8Mappings.sliders[index];

    if (el.classList.contains('mapping-min')) {
      mapping.min = parseFloat(el.value);
    } else {
      mapping.max = parseFloat(el.value);
    }

    this._saveMappings();
  },

  /**
   * Reset mappings to defaults
   */
  _resetMappings() {
    // Restore default mappings
    this.vmx8Mappings = JSON.parse(JSON.stringify(NS.Controller._getDefaultMappings()));
    this._saveMappings();

    // Refresh mapping list
    const list = document.getElementById('mapping-list');
    if (list) {
      list.innerHTML = this._createMappingListHTML();
    }
  },

  /**
   * Get default mappings (copy)
   */
  _getDefaultMappings() {
    return {
      knobs: [
        { cc: 30, osc: '/filter/cutoff', min: 20, max: 2000, curve: 'log' },
        { cc: 31, osc: '/nasty/decayFine', min: 0, max: 1, curve: 'linear' },
        { cc: 32, osc: '/nasty/grime', min: 0, max: 1, curve: 'linear' },
        { cc: 33, osc: '/lfo/rate', min: 0.5, max: 16, curve: 'linear' },
        { cc: 34, osc: '/lfo/depth', min: 0, max: 1, curve: 'linear' },
        { cc: 35, osc: '/master/reverb', min: 0, max: 1, curve: 'linear' },
        { cc: 36, osc: '/master/comp/threshold', min: -60, max: 0, curve: 'linear' },
        { cc: 37, osc: '/master/level', min: 0, max: 1, curve: 'linear' }
      ],
      sliders: [
        { cc: 40, osc: '/voice/0/level', min: 0, max: 1, curve: 'linear' },
        { cc: 41, osc: '/voice/1/level', min: 0, max: 1, curve: 'linear' },
        { cc: 42, osc: '/voice/2/level', min: 0, max: 1, curve: 'linear' },
        { cc: 43, osc: '/voice/3/level', min: 0, max: 1, curve: 'linear' },
        { cc: 44, osc: '/nasty/decayExtend', min: 50, max: 2000, curve: 'linear' },
        { cc: 45, osc: '/nasty/subHarmonic', min: 0, max: 1, curve: 'linear' },
        { cc: 46, osc: '/nasty/click', min: 0, max: 1, curve: 'linear' },
        { cc: 47, osc: '/envelope/amp/decay', min: 50, max: 800, curve: 'linear' }
      ]
    };
  },

  /**
   * Save mappings to localStorage
   */
  _saveMappings() {
    NS.State.set('controller.mappings', this.vmx8Mappings);
  },

  /**
   * Load saved mappings
   */
  _loadMappings() {
    const saved = NS.State.get('controller.mappings');
    if (saved) {
      this.vmx8Mappings = saved;
    }
  },

  /**
   * Update device status display
   */
  updateDeviceStatus(connected, deviceName = null) {
    const statusEl = document.getElementById('ctrl-device-status');
    if (statusEl) {
      if (connected) {
        statusEl.textContent = deviceName || 'Connected';
        statusEl.className = 'device-status connected';
      } else {
        statusEl.textContent = 'No Device';
        statusEl.className = 'device-status disconnected';
      }
    }
  },

  /**
   * Panel drag handling
   */
  _startDrag(e, panel) {
    this._panelDrag = {
      panel,
      startX: e.clientX,
      startY: e.clientY,
      origX: parseInt(panel.style.left) || 100,
      origY: parseInt(panel.style.top) || 100
    };
  },

  _updatePanelDrag(e) {
    const { panel, startX, startY, origX, origY } = this._panelDrag;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = (origX + dx) + 'px';
    panel.style.top = (origY + dy) + 'px';
  },

  /**
   * Show controller panel
   */
  show() {
    if (this.panel) {
      this.panel.classList.remove('hidden');
      this.visible = true;
      if (!this.panel.style.left) {
        this.panel.style.left = '100px';
        this.panel.style.top = '100px';
      }
    }
  },

  /**
   * Hide controller panel
   */
  hide() {
    if (this.panel) {
      this.panel.classList.add('hidden');
      this.visible = false;
    }
  },

  /**
   * Toggle panel visibility
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }
};

console.log('[Dunk] Controller module loaded');
