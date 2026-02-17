/**
 * Dunk - Sequencer Module
 * 16-step pattern sequencer with voice assignment
 */

NS.Sequencer = {
  STEP_COUNT: 16,

  // State
  steps: [],
  currentStep: -1,
  playing: false,
  bpm: 140,
  swing: 0,
  probability: 1.0,
  selectedVoice: 0,

  // Timing
  _intervalId: null,
  _nextStepTime: 0,
  _lookahead: 25,      // ms
  _scheduleAhead: 0.1, // seconds

  /**
   * Initialize sequencer
   */
  init() {
    const state = NS.State.current.sequencer || {};

    this.bpm = NS.State.current.bpm || 140;
    this.swing = state.swing || 0;
    this.probability = state.probability || 1.0;

    // Initialize steps from state or defaults
    if (state.steps && state.steps.length === this.STEP_COUNT) {
      this.steps = state.steps.map(s => ({ ...s }));
    } else {
      this.steps = [];
      for (let i = 0; i < this.STEP_COUNT; i++) {
        this.steps.push({
          active: false,
          voice: 0,
          velocity: 1.0
        });
      }
    }

    // Listen for BPM changes
    NS.Bus.on('state:bpm', (val) => {
      this.bpm = val;
    });

    console.log('[Dunk] Sequencer initialized');
  },

  /**
   * Start playback
   */
  start() {
    if (this.playing) return;

    this.playing = true;
    this.currentStep = -1;
    this._nextStepTime = NS.Audio.currentTime;

    // Use Web Audio timing for accurate scheduling
    this._scheduler();

    NS.Bus.emit('sequencer:start');
  },

  /**
   * Stop playback
   */
  stop() {
    if (!this.playing) return;

    this.playing = false;
    this.currentStep = -1;

    if (this._intervalId) {
      clearTimeout(this._intervalId);
      this._intervalId = null;
    }

    NS.Bus.emit('sequencer:stop');
  },

  /**
   * Toggle playback
   */
  toggle() {
    if (this.playing) {
      this.stop();
    } else {
      this.start();
    }
  },

  /**
   * Internal scheduler - uses setTimeout with lookahead
   */
  _scheduler() {
    if (!this.playing) return;

    const currentTime = NS.Audio.currentTime;

    // Schedule all steps that need to play before the next lookahead
    while (this._nextStepTime < currentTime + this._scheduleAhead) {
      this._scheduleStep(this._nextStepTime);
      this._advanceStep();
    }

    // Call again
    this._intervalId = setTimeout(() => this._scheduler(), this._lookahead);
  },

  /**
   * Schedule a step to play
   */
  _scheduleStep(time) {
    const stepIndex = (this.currentStep + 1) % this.STEP_COUNT;
    const step = this.steps[stepIndex];

    if (!step.active) return;

    // Apply probability
    if (this.probability < 1.0 && Math.random() > this.probability) {
      return;
    }

    // Trigger the voice
    NS.VoiceBank.trigger(step.voice, step.velocity, {
      ...NS.Nasty.getTriggerOptions()
    });

    NS.Bus.emit('sequencer:trigger', {
      step: stepIndex,
      voice: step.voice,
      velocity: step.velocity,
      time
    });
  },

  /**
   * Advance to next step
   */
  _advanceStep() {
    this.currentStep = (this.currentStep + 1) % this.STEP_COUNT;

    // Calculate time to next step
    const secondsPerBeat = 60 / this.bpm;
    const secondsPerStep = secondsPerBeat / 4; // 16th notes

    // Apply swing to even steps (1, 3, 5, etc in 0-indexed)
    let stepTime = secondsPerStep;
    if (this.swing > 0 && this.currentStep % 2 === 1) {
      const swingAmount = (this.swing / 100) * secondsPerStep * 0.5;
      stepTime += swingAmount;
    }

    this._nextStepTime += stepTime;

    NS.Bus.emit('sequencer:step', this.currentStep);
  },

  /**
   * Set step state
   */
  setStep(index, active, options = {}) {
    if (index < 0 || index >= this.STEP_COUNT) return;

    this.steps[index] = {
      active,
      voice: options.voice ?? this.steps[index].voice ?? this.selectedVoice,
      velocity: options.velocity ?? this.steps[index].velocity ?? 1.0
    };

    this._saveState();
    NS.Bus.emit('sequencer:stepChanged', { index, step: this.steps[index] });
  },

  /**
   * Toggle step
   */
  toggleStep(index) {
    if (index < 0 || index >= this.STEP_COUNT) return;

    const step = this.steps[index];
    this.setStep(index, !step.active, {
      voice: this.selectedVoice
    });
  },

  /**
   * Set step velocity
   */
  setStepVelocity(index, velocity) {
    if (index < 0 || index >= this.STEP_COUNT) return;
    this.steps[index].velocity = NS.Utils.clamp(velocity, 0, 1);
    this._saveState();
  },

  /**
   * Set step voice
   */
  setStepVoice(index, voice) {
    if (index < 0 || index >= this.STEP_COUNT) return;
    this.steps[index].voice = NS.Utils.clamp(voice, 0, 3);
    this._saveState();
  },

  /**
   * Set swing amount (0-100)
   */
  setSwing(value) {
    this.swing = NS.Utils.clamp(value, 0, 100);
    this._saveState();
    NS.Bus.emit('sequencer:swing', this.swing);
  },

  /**
   * Set probability (0-1)
   */
  setProbability(value) {
    this.probability = NS.Utils.clamp(value, 0, 1);
    this._saveState();
    NS.Bus.emit('sequencer:probability', this.probability);
  },

  /**
   * Set selected voice for new steps
   */
  setSelectedVoice(voice) {
    this.selectedVoice = NS.Utils.clamp(voice, 0, 3);
    NS.Bus.emit('sequencer:selectedVoice', this.selectedVoice);
  },

  /**
   * Clear all steps
   */
  clear() {
    for (let i = 0; i < this.STEP_COUNT; i++) {
      this.steps[i] = { active: false, voice: 0, velocity: 1.0 };
    }
    this._saveState();
    NS.Bus.emit('sequencer:cleared');
  },

  /**
   * Load pattern
   */
  loadPattern(pattern) {
    if (!pattern || pattern.length !== this.STEP_COUNT) return false;

    for (let i = 0; i < this.STEP_COUNT; i++) {
      this.steps[i] = { ...pattern[i] };
    }
    this._saveState();
    NS.Bus.emit('sequencer:patternLoaded');
    return true;
  },

  /**
   * Get current pattern
   */
  getPattern() {
    return this.steps.map(s => ({ ...s }));
  },

  /**
   * Save state to persistent storage
   */
  _saveState() {
    NS.State.set('sequencer', {
      steps: this.steps.map(s => ({ ...s })),
      swing: this.swing,
      probability: this.probability
    });
  },

  /**
   * Pattern presets
   */
  patterns: {
    'four-floor': {
      name: 'Four on the Floor',
      steps: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]
    },
    'off-beat': {
      name: 'Off Beat',
      steps: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]
    },
    'dubstep-half': {
      name: 'Dubstep Half',
      steps: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]
    },
    'trap': {
      name: 'Trap',
      steps: [1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,1,0]
    },
    'breakbeat': {
      name: 'Breakbeat',
      steps: [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,1,0]
    }
  },

  /**
   * Load pattern preset
   */
  loadPreset(presetId) {
    const preset = this.patterns[presetId];
    if (!preset) return false;

    const pattern = preset.steps.map((active, i) => ({
      active: !!active,
      voice: 0,
      velocity: 1.0
    }));

    return this.loadPattern(pattern);
  }
};

console.log('[Dunk] Sequencer module loaded');
