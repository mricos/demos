/**
 * Dunk - UI Module
 * Panel management and control bindings
 */

NS.UI = {
  panels: {},
  activePanel: null,
  dragState: null,

  /**
   * Initialize UI
   */
  init() {
    this._initPanels();
    this._initControls();
    this._initSequencerUI();
    this._initKeyboard();
    this._initMeteringToggles();

    console.log('[Dunk] UI initialized');
  },

  /**
   * Initialize floating panels
   */
  _initPanels() {
    const panelIds = [
      'panel-filter-design',
      'panel-nasty-range',
      'panel-voice',
      'panel-lfo',
      'panel-master',
      'panel-envelope'
    ];

    panelIds.forEach(id => {
      const el = NS.DOM.$(`#${id}`);
      if (el) {
        this.panels[id] = {
          el,
          visible: false
        };

        // Close button
        const closeBtn = NS.DOM.$('.btn-close', el);
        if (closeBtn) {
          NS.DOM.on(closeBtn, 'click', () => this.hidePanel(id));
        }

        // Draggable header
        const header = NS.DOM.$('.panel-header', el);
        if (header) {
          NS.DOM.on(header, 'mousedown', (e) => this._startDrag(e, el));
        }
      }
    });

    // Global mouse events for dragging
    NS.DOM.on(document, 'mousemove', (e) => this._drag(e));
    NS.DOM.on(document, 'mouseup', () => this._endDrag());

    // Panel trigger buttons
    NS.DOM.on(NS.DOM.$('#btn-filter-design'), 'click', () => {
      this.togglePanel('panel-filter-design');
    });

    NS.DOM.on(NS.DOM.$('#btn-nasty-range'), 'click', () => {
      this.togglePanel('panel-nasty-range');
    });

    NS.DOM.on(NS.DOM.$('#btn-envelope'), 'click', () => {
      this.togglePanel('panel-envelope');
    });

    NS.DOM.on(NS.DOM.$('#btn-controller'), 'click', () => {
      if (NS.Controller) {
        NS.Controller.toggle();
      }
    });

    // Listen for schematic module clicks
    NS.Bus.on('schematic:moduleClick', ({ type, label }) => {
      if (type === 'voice') {
        const voiceNum = parseInt(label.replace('V', ''));
        NS.DOM.$('#voice-panel-num').textContent = voiceNum;
        this.showPanel('panel-voice');
      } else if (type === 'fir') {
        this.showPanel('panel-filter-design');
      } else if (type === 'dist') {
        this.showPanel('panel-voice');
      } else if (type === 'master') {
        if (label === 'LFO') {
          this.showPanel('panel-lfo');
        } else {
          this.showPanel('panel-master');
        }
      }
    });
  },

  /**
   * Initialize control bindings
   */
  _initControls() {
    // BPM
    const bpmInput = NS.DOM.$('#bpm');
    NS.DOM.on(bpmInput, 'change', () => {
      NS.State.set('bpm', parseInt(bpmInput.value));
    });

    // Transport buttons
    NS.DOM.on(NS.DOM.$('#btn-play'), 'click', () => {
      NS.Sequencer.start();
      NS.DOM.$('#btn-play').classList.add('active');
      NS.DOM.$('#btn-stop').classList.remove('active');
    });

    NS.DOM.on(NS.DOM.$('#btn-stop'), 'click', () => {
      NS.Sequencer.stop();
      NS.DOM.$('#btn-play').classList.remove('active');
    });

    // One-shot trigger button
    const oneshotBtn = NS.DOM.$('#btn-oneshot');
    if (oneshotBtn) {
      NS.DOM.on(oneshotBtn, 'click', () => {
        if (!NS.App.audioStarted) return;
        const voice = NS.Sequencer ? NS.Sequencer.selectedVoice : 0;
        NS.VoiceBank.trigger(voice, 1.0, NS.Nasty?.getTriggerOptions());
        oneshotBtn.classList.add('flash');
        setTimeout(() => oneshotBtn.classList.remove('flash'), 100);
      });
    }

    // Swing
    const swingInput = NS.DOM.$('#swing');
    const swingVal = NS.DOM.$('#swing-val');
    NS.DOM.on(swingInput, 'input', () => {
      NS.Sequencer.setSwing(parseInt(swingInput.value));
      swingVal.textContent = swingInput.value + '%';
    });

    // Probability
    const probInput = NS.DOM.$('#probability');
    const probVal = NS.DOM.$('#prob-val');
    NS.DOM.on(probInput, 'input', () => {
      NS.Sequencer.setProbability(parseInt(probInput.value) / 100);
      probVal.textContent = probInput.value + '%';
    });

    // Voice select buttons
    NS.DOM.$$('.voice-btn').forEach(btn => {
      NS.DOM.on(btn, 'click', () => {
        NS.DOM.$$('.voice-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        NS.Sequencer.setSelectedVoice(parseInt(btn.dataset.voice));
      });
    });

    // Preset select
    const presetSelect = NS.DOM.$('#preset-select');
    NS.DOM.on(presetSelect, 'change', () => {
      if (presetSelect.value) {
        NS.Presets.load(presetSelect.value);
      }
    });

    // Save/Load/Export
    NS.DOM.on(NS.DOM.$('#btn-save'), 'click', () => this._savePreset());
    NS.DOM.on(NS.DOM.$('#btn-load'), 'click', () => this._loadPreset());
    NS.DOM.on(NS.DOM.$('#btn-export'), 'click', () => this._exportState());

    // Filter design controls
    this._initFilterControls();

    // Nasty range controls
    this._initNastyControls();

    // LFO controls
    this._initLFOControls();

    // Master controls
    this._initMasterControls();

    // Envelope controls
    this._initEnvelopeControls();
  },

  /**
   * Initialize filter design panel controls
   */
  _initFilterControls() {
    const cutoffInput = NS.DOM.$('#filter-cutoff');
    const cutoffVal = NS.DOM.$('#filter-cutoff-val');
    const tapsSelect = NS.DOM.$('#filter-taps');
    const windowSelect = NS.DOM.$('#filter-window');
    const presetSelect = NS.DOM.$('#filter-preset');

    if (cutoffInput) {
      NS.DOM.on(cutoffInput, 'input', () => {
        const val = parseInt(cutoffInput.value);
        cutoffVal.textContent = val + ' Hz';
        NS.State.set('filter.cutoff', val);
      });
    }

    if (tapsSelect) {
      NS.DOM.on(tapsSelect, 'change', () => {
        NS.State.set('filter.taps', parseInt(tapsSelect.value));
      });
    }

    if (windowSelect) {
      NS.DOM.on(windowSelect, 'change', () => {
        NS.State.set('filter.window', windowSelect.value);
      });
    }

    if (presetSelect) {
      NS.DOM.on(presetSelect, 'change', () => {
        NS.State.set('filter.preset', presetSelect.value);
      });
    }
  },

  /**
   * Initialize nasty range controls
   */
  _initNastyControls() {
    const controls = [
      { id: 'nasty-decay-fine', param: 'decayFine', scale: 0.01, unit: '' },
      { id: 'nasty-decay-extend', param: 'decayExtend', scale: 1, unit: ' ms' },
      { id: 'nasty-sub-harmonic', param: 'subHarmonicMix', scale: 0.01, unit: '' },
      { id: 'nasty-click', param: 'clickIntensity', scale: 0.01, unit: '' },
      { id: 'nasty-grime', param: 'grimeAmount', scale: 0.01, unit: '' },
      { id: 'nasty-pitch-drift', param: 'pitchDrift', scale: 1, unit: ' cents' },
      { id: 'nasty-growl', param: 'growlFreq', scale: 1, unit: ' Hz' }
    ];

    controls.forEach(({ id, param, scale, unit }) => {
      const input = NS.DOM.$(`#${id}`);
      const valSpan = NS.DOM.$(`#${id}-val`);

      if (input && valSpan) {
        NS.DOM.on(input, 'input', () => {
          const raw = parseFloat(input.value);
          const value = raw * scale;
          NS.Nasty.set(param, value);

          if (scale === 0.01) {
            valSpan.textContent = value.toFixed(2) + unit;
          } else {
            valSpan.textContent = value + unit;
          }
        });
      }
    });
  },

  /**
   * Initialize LFO controls
   */
  _initLFOControls() {
    const rateInput = NS.DOM.$('#lfo-rate');
    const rateVal = NS.DOM.$('#lfo-rate-val');
    const depthInput = NS.DOM.$('#lfo-depth');
    const depthVal = NS.DOM.$('#lfo-depth-val');
    const waveformSelect = NS.DOM.$('#lfo-waveform');
    const targetSelect = NS.DOM.$('#lfo-target');
    const syncCheck = NS.DOM.$('#lfo-sync');

    if (rateInput) {
      NS.DOM.on(rateInput, 'input', () => {
        const val = parseFloat(rateInput.value);
        rateVal.textContent = val.toFixed(1) + ' Hz';
        NS.State.set('lfo.rate', val);
      });
    }

    if (depthInput) {
      NS.DOM.on(depthInput, 'input', () => {
        const val = parseInt(depthInput.value);
        depthVal.textContent = val + '%';
        NS.State.set('lfo.depth', val / 100);
      });
    }

    if (waveformSelect) {
      NS.DOM.on(waveformSelect, 'change', () => {
        NS.State.set('lfo.waveform', waveformSelect.value);
      });
    }

    if (targetSelect) {
      NS.DOM.on(targetSelect, 'change', () => {
        NS.State.set('lfo.target', targetSelect.value);
      });
    }

    if (syncCheck) {
      NS.DOM.on(syncCheck, 'change', () => {
        NS.State.set('lfo.sync', syncCheck.checked);
      });
    }
  },

  /**
   * Initialize master controls
   */
  _initMasterControls() {
    const controls = [
      { id: 'master-comp-thresh', param: 'master.compThreshold', unit: ' dB' },
      { id: 'master-comp-ratio', param: 'master.compRatio', unit: ':1' },
      { id: 'master-reverb', param: 'master.reverbMix', scale: 0.01, unit: '%' },
      { id: 'master-limiter', param: 'master.limiter', unit: ' dB' },
      { id: 'master-level', param: 'masterLevel', scale: 0.01, unit: '%' }
    ];

    controls.forEach(({ id, param, scale = 1, unit }) => {
      const input = NS.DOM.$(`#${id}`);
      const valSpan = NS.DOM.$(`#${id}-val`);

      if (input && valSpan) {
        NS.DOM.on(input, 'input', () => {
          const raw = parseFloat(input.value);
          const value = raw * scale;
          NS.State.set(param, value);

          if (scale === 0.01) {
            valSpan.textContent = Math.round(raw) + unit;
          } else {
            valSpan.textContent = value + unit;
          }
        });
      }
    });
  },

  /**
   * Initialize envelope controls
   */
  _initEnvelopeControls() {
    const controls = [
      { id: 'env-pitch-start', param: 'pitchStart', unit: ' Hz', key: 'PITCH_START' },
      { id: 'env-pitch-end', param: 'pitchEnd', unit: ' Hz', key: 'PITCH_END' },
      { id: 'env-pitch-time', param: 'pitchTime', scale: 0.001, unit: ' ms', key: 'PITCH_TIME' },
      { id: 'env-amp-attack', param: 'attack', scale: 0.001, unit: ' ms', key: 'ATTACK' },
      { id: 'env-amp-decay', param: 'decay', unit: ' ms', key: 'DECAY' }
    ];

    controls.forEach(({ id, param, scale = 1, unit, key }) => {
      const input = NS.DOM.$(`#${id}`);
      const valSpan = NS.DOM.$(`#${id}-val`);

      if (input && valSpan) {
        NS.DOM.on(input, 'input', () => {
          const raw = parseFloat(input.value);
          const value = raw * scale;

          // Update constant
          if (key && NS.CONSTANTS) {
            NS.CONSTANTS[key] = value;
          }

          // Store in state
          NS.State.set(`envelope.${param}`, value);

          // Update display
          if (scale < 1) {
            valSpan.textContent = raw + unit;
          } else {
            valSpan.textContent = value + unit;
          }

          // Apply to ganged voices/channels
          this._applyEnvelopeGanging(param, value);
        });
      }
    });

    // Decay shape control
    const shapeInput = NS.DOM.$('#env-decay-shape');
    const shapeVal = NS.DOM.$('#env-decay-shape-val');
    if (shapeInput && shapeVal) {
      NS.DOM.on(shapeInput, 'input', () => {
        const val = parseInt(shapeInput.value);
        NS.Nasty.set('decayFine', val / 100);
        const labels = ['Linear', 'Lin/Exp', 'Exp', 'Exp/Log', 'Log'];
        const idx = Math.floor(val / 25);
        shapeVal.textContent = labels[Math.min(idx, 4)];
      });
    }

    // Gang checkboxes
    const gangAllCheckbox = NS.DOM.$('#gang-ch-all');
    if (gangAllCheckbox) {
      NS.DOM.on(gangAllCheckbox, 'change', () => {
        const checked = gangAllCheckbox.checked;
        ['sub', 'body', 'harm'].forEach(ch => {
          const cb = NS.DOM.$(`#gang-ch-${ch}`);
          if (cb) cb.checked = checked;
        });
      });
    }
  },

  /**
   * Apply envelope parameter to ganged voices/channels
   */
  _applyEnvelopeGanging(param, value) {
    // Get ganged voices
    const gangVoices = [];
    for (let i = 0; i < 4; i++) {
      const cb = NS.DOM.$(`#gang-v${i}`);
      if (cb && cb.checked) gangVoices.push(i);
    }

    // Get ganged channels
    const gangChannels = [];
    const channelMap = { sub: 0, body: 1, harm: 3 };
    Object.entries(channelMap).forEach(([name, idx]) => {
      const cb = NS.DOM.$(`#gang-ch-${name}`);
      if (cb && cb.checked) gangChannels.push(idx);
    });

    // Apply to ganged combinations
    // (This would require voice/channel-level envelope storage,
    // for now it affects the global constants)
    NS.Bus.emit('envelope:changed', { param, value, gangVoices, gangChannels });
  },

  /**
   * Initialize sequencer UI
   */
  _initSequencerUI() {
    const stepsContainer = NS.DOM.$('#steps');

    // Create step buttons
    for (let i = 0; i < 16; i++) {
      const step = NS.DOM.create('button', {
        class: 'step',
        'data-step': i
      }, [(i + 1).toString()]);

      NS.DOM.on(step, 'click', () => {
        NS.Sequencer.toggleStep(i);
      });

      stepsContainer.appendChild(step);
    }

    // Sync UI with loaded sequencer state (show any active steps from localStorage)
    setTimeout(() => {
      this._syncSequencerUI();
    }, 100);

    // Clear pattern button
    const clearBtn = NS.DOM.$('#btn-clear-pattern');
    if (clearBtn) {
      NS.DOM.on(clearBtn, 'click', () => {
        NS.Sequencer.clear();
        NS.DOM.$$('.step').forEach(el => el.classList.remove('active'));
      });
    }

    // Update step display when steps change
    NS.Bus.on('sequencer:stepChanged', ({ index, step }) => {
      const stepEl = NS.DOM.$(`.step[data-step="${index}"]`);
      if (stepEl) {
        stepEl.classList.toggle('active', step.active);
      }
    });

    // Highlight current step
    NS.Bus.on('sequencer:step', (step) => {
      NS.DOM.$$('.step').forEach((el, i) => {
        el.classList.toggle('current', i === step);
      });
    });

    // Clear current on stop
    NS.Bus.on('sequencer:stop', () => {
      NS.DOM.$$('.step').forEach(el => {
        el.classList.remove('current');
      });
    });
  },

  /**
   * Sync sequencer UI with current state
   */
  _syncSequencerUI() {
    if (NS.Sequencer && NS.Sequencer.steps) {
      NS.Sequencer.steps.forEach((step, i) => {
        const stepEl = NS.DOM.$(`.step[data-step="${i}"]`);
        if (stepEl) {
          stepEl.classList.toggle('active', step.active);
        }
      });
    }
  },

  /**
   * Initialize keyboard shortcuts
   */
  _initKeyboard() {
    NS.DOM.on(document, 'keydown', (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          NS.Sequencer.toggle();
          break;
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
          NS.Sequencer.setSelectedVoice(parseInt(e.key) - 1);
          NS.DOM.$$('.voice-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.voice === (parseInt(e.key) - 1).toString());
          });
          break;
        case 'KeyT':
          // Trigger current voice
          NS.VoiceBank.trigger(NS.Sequencer.selectedVoice, 1.0);
          break;
        case 'KeyC':
          NS.Sequencer.clear();
          NS.DOM.$$('.step').forEach(el => el.classList.remove('active'));
          break;
        case 'KeyM':
          NS.MIDI.toggleLearn();
          break;
        case 'Escape':
          this.hideAllPanels();
          break;
      }
    });
  },

  /**
   * Show panel
   */
  showPanel(id) {
    const panel = this.panels[id];
    if (!panel) return;

    panel.el.classList.remove('hidden');
    panel.visible = true;

    // Position panel if not already positioned
    if (!panel.positioned) {
      panel.el.style.top = '100px';
      panel.el.style.left = '100px';
      panel.positioned = true;
    }
  },

  /**
   * Hide panel
   */
  hidePanel(id) {
    const panel = this.panels[id];
    if (!panel) return;

    panel.el.classList.add('hidden');
    panel.visible = false;
  },

  /**
   * Toggle panel
   */
  togglePanel(id) {
    const panel = this.panels[id];
    if (!panel) return;

    if (panel.visible) {
      this.hidePanel(id);
    } else {
      this.showPanel(id);
    }
  },

  /**
   * Hide all panels
   */
  hideAllPanels() {
    Object.keys(this.panels).forEach(id => this.hidePanel(id));
  },

  /**
   * Start panel drag
   */
  _startDrag(e, el) {
    this.dragState = {
      el,
      startX: e.clientX,
      startY: e.clientY,
      origX: parseInt(el.style.left) || 100,
      origY: parseInt(el.style.top) || 100
    };
  },

  /**
   * Handle drag
   */
  _drag(e) {
    if (!this.dragState) return;

    const { el, startX, startY, origX, origY } = this.dragState;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    el.style.left = (origX + dx) + 'px';
    el.style.top = (origY + dy) + 'px';
  },

  /**
   * End drag
   */
  _endDrag() {
    this.dragState = null;
  },

  /**
   * Save preset dialog
   */
  _savePreset() {
    const name = prompt('Preset name:');
    if (name) {
      NS.Presets.save(name);
      this._updateStatus('Preset saved: ' + name);
    }
  },

  /**
   * Load preset dialog
   */
  _loadPreset() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (NS.State.import(e.target.result)) {
            this._updateStatus('State loaded');
            location.reload(); // Reload to apply state
          } else {
            this._updateStatus('Load failed', true);
          }
        };
        reader.readAsText(file);
      }
    };

    input.click();
  },

  /**
   * Export state
   */
  _exportState() {
    const json = NS.State.export();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'dunk-preset.json';
    a.click();

    URL.revokeObjectURL(url);
    this._updateStatus('State exported');
  },

  /**
   * Initialize metering toggle switches
   */
  _initMeteringToggles() {
    // FFT toggle
    const fftToggle = NS.DOM.$('#toggle-fft');
    if (fftToggle) {
      NS.DOM.on(fftToggle, 'change', () => {
        if (NS.Analyser) {
          NS.Analyser.setFFTEnabled(fftToggle.checked);
        }
      });
    }

    // Tuner toggle
    const tunerToggle = NS.DOM.$('#toggle-tuner');
    if (tunerToggle) {
      NS.DOM.on(tunerToggle, 'change', () => {
        if (NS.Analyser) {
          NS.Analyser.setTunerEnabled(tunerToggle.checked);
        }
      });
    }

    // Phase meter toggle
    const phaseToggle = NS.DOM.$('#toggle-phase');
    if (phaseToggle) {
      NS.DOM.on(phaseToggle, 'change', () => {
        if (NS.Phase) {
          NS.Phase.setEnabled(phaseToggle.checked);
        }
      });
    }
  },

  /**
   * Update status display
   */
  _updateStatus(message, isError = false) {
    const status = NS.DOM.$('#status');
    status.textContent = message;
    status.className = isError ? 'status-error' : 'status-running';

    setTimeout(() => {
      status.textContent = NS.Audio.ctx ? 'Running' : 'Ready';
      status.className = NS.Audio.ctx ? 'status-running' : 'status-idle';
    }, 2000);
  }
};

console.log('[Dunk] UI module loaded');
