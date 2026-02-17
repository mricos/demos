/**
 * Dunk - LFO Module
 * Wobble LFO system for dubstep modulation
 */

NS.LFO = {
  /**
   * Create an LFO
   *
   * @param {AudioContext} ctx - Audio context
   * @param {object} options - LFO options
   */
  create(ctx, options = {}) {
    const {
      rate = 4,          // Hz
      depth = 0.5,       // 0-1
      waveform = 'sine', // sine, triangle, square, sawtooth, sample-hold
      sync = false,      // Tempo sync
      bpm = 140
    } = options;

    const lfo = {
      ctx,
      rate,
      depth,
      waveform,
      sync,
      bpm,
      running: false,
      targets: [],

      // Nodes
      osc: null,
      gain: null,
      shGain: null,  // Sample & hold
      output: null,

      // Sample & hold state
      _shInterval: null,
      _shValue: 0
    };

    lfo.output = ctx.createGain();
    lfo.gain = ctx.createGain();
    lfo.gain.connect(lfo.output);

    // Initialize
    this._setupOscillator(lfo);

    return lfo;
  },

  /**
   * Setup oscillator based on waveform type
   */
  _setupOscillator(lfo) {
    const { ctx, rate, waveform } = lfo;

    // Clean up existing
    if (lfo.osc) {
      lfo.osc.stop();
      lfo.osc.disconnect();
    }
    if (lfo._shInterval) {
      clearInterval(lfo._shInterval);
      lfo._shInterval = null;
    }

    if (waveform === 'sample-hold') {
      // Sample & hold - use constant source with scheduled updates
      this._setupSampleHold(lfo);
    } else {
      // Standard oscillator
      lfo.osc = ctx.createOscillator();
      lfo.osc.type = waveform;
      lfo.osc.frequency.value = rate;
      lfo.osc.connect(lfo.gain);
      lfo.osc.start();
    }
  },

  /**
   * Setup sample & hold LFO
   */
  _setupSampleHold(lfo) {
    const { ctx, rate } = lfo;

    // Create a constant source we can modulate
    const constantSource = ctx.createConstantSource();
    constantSource.offset.value = 0;
    constantSource.connect(lfo.gain);
    constantSource.start();

    lfo.osc = constantSource;

    // Update value at LFO rate
    const updateValue = () => {
      if (!lfo.running) return;

      const newValue = Math.random() * 2 - 1;
      lfo.osc.offset.setTargetAtTime(newValue, ctx.currentTime, 0.001);
    };

    // Start interval
    lfo._shInterval = setInterval(updateValue, 1000 / rate);
    updateValue();
  },

  /**
   * Start LFO
   */
  start(lfo) {
    lfo.running = true;
    lfo.gain.gain.value = lfo.depth;

    if (lfo.waveform === 'sample-hold' && !lfo._shInterval) {
      this._setupSampleHold(lfo);
    }
  },

  /**
   * Stop LFO
   */
  stop(lfo) {
    lfo.running = false;
    lfo.gain.gain.value = 0;

    if (lfo._shInterval) {
      clearInterval(lfo._shInterval);
      lfo._shInterval = null;
    }
  },

  /**
   * Set LFO rate
   */
  setRate(lfo, rate) {
    lfo.rate = rate;

    if (lfo.sync) {
      // Calculate synced rate from BPM
      rate = this._getSyncedRate(rate, lfo.bpm);
    }

    if (lfo.waveform === 'sample-hold') {
      // Restart sample & hold with new rate
      if (lfo._shInterval) {
        clearInterval(lfo._shInterval);
        lfo._shInterval = setInterval(() => {
          if (!lfo.running) return;
          const newValue = Math.random() * 2 - 1;
          lfo.osc.offset.setTargetAtTime(newValue, lfo.ctx.currentTime, 0.001);
        }, 1000 / rate);
      }
    } else if (lfo.osc) {
      lfo.osc.frequency.setTargetAtTime(rate, lfo.ctx.currentTime, 0.01);
    }
  },

  /**
   * Set LFO depth
   */
  setDepth(lfo, depth) {
    lfo.depth = depth;
    if (lfo.running) {
      lfo.gain.gain.setTargetAtTime(depth, lfo.ctx.currentTime, 0.01);
    }
  },

  /**
   * Set LFO waveform
   */
  setWaveform(lfo, waveform) {
    lfo.waveform = waveform;
    this._setupOscillator(lfo);
    if (lfo.running) {
      this.start(lfo);
    }
  },

  /**
   * Set tempo sync
   */
  setSync(lfo, sync, bpm = 140) {
    lfo.sync = sync;
    lfo.bpm = bpm;
    if (sync) {
      this.setRate(lfo, lfo.rate);
    }
  },

  /**
   * Get synced rate from note division
   * Rate 1-16 maps to note divisions
   */
  _getSyncedRate(rate, bpm) {
    // Map rate to note divisions
    // 1 = 1 bar, 2 = 1/2, 4 = 1/4, 8 = 1/8, 16 = 1/16
    const beatsPerSecond = bpm / 60;

    if (rate <= 1) {
      return beatsPerSecond / 4; // 1 bar
    } else if (rate <= 2) {
      return beatsPerSecond / 2; // 1/2 note
    } else if (rate <= 4) {
      return beatsPerSecond;     // 1/4 note
    } else if (rate <= 8) {
      return beatsPerSecond * 2; // 1/8 note
    } else {
      return beatsPerSecond * 4; // 1/16 note
    }
  },

  /**
   * Connect LFO to a target parameter
   *
   * @param {object} lfo - LFO object
   * @param {object} target - Target parameter config
   */
  connectTarget(lfo, target) {
    const { param, min, max, bipolar = true } = target;

    // Create gain node to scale LFO output
    const scaler = lfo.ctx.createGain();
    const range = max - min;

    if (bipolar) {
      // LFO output (-1 to 1) → (min to max)
      scaler.gain.value = range / 2;

      // Add offset for center
      const offset = lfo.ctx.createConstantSource();
      offset.offset.value = min + range / 2;
      offset.start();
      offset.connect(param);
    } else {
      // LFO output (0 to 1) → (min to max)
      // Need to rectify and scale
      scaler.gain.value = range;
    }

    lfo.output.connect(scaler);
    scaler.connect(param);

    lfo.targets.push({ param, scaler, target });
  },

  /**
   * Disconnect all targets
   */
  disconnectAll(lfo) {
    lfo.targets.forEach(({ scaler }) => {
      scaler.disconnect();
    });
    lfo.targets = [];
  }
};

/**
 * LFO System - Global wobble modulation
 */
NS.LFOSystem = {
  lfo: null,
  currentTarget: null,

  /**
   * Initialize LFO system
   */
  init(ctx) {
    const state = NS.State.current.lfo || {};

    this.lfo = NS.LFO.create(ctx, {
      rate: state.rate || 4,
      depth: state.depth || 0.5,
      waveform: state.waveform || 'sine',
      sync: state.sync || false,
      bpm: NS.State.current.bpm || 140
    });

    this.currentTarget = state.target || 'filter';

    // Listen for state changes
    NS.Bus.on('state:lfo.rate', (val) => {
      NS.LFO.setRate(this.lfo, val);
    });

    NS.Bus.on('state:lfo.depth', (val) => {
      NS.LFO.setDepth(this.lfo, val);
    });

    NS.Bus.on('state:lfo.waveform', (val) => {
      NS.LFO.setWaveform(this.lfo, val);
    });

    NS.Bus.on('state:lfo.sync', (val) => {
      NS.LFO.setSync(this.lfo, val, NS.State.current.bpm);
    });

    NS.Bus.on('state:bpm', (val) => {
      if (this.lfo.sync) {
        NS.LFO.setSync(this.lfo, true, val);
      }
    });

    console.log('[Dunk] LFOSystem initialized');
  },

  /**
   * Start wobble
   */
  start() {
    NS.LFO.start(this.lfo);
  },

  /**
   * Stop wobble
   */
  stop() {
    NS.LFO.stop(this.lfo);
  },

  /**
   * Get LFO output for manual connection
   */
  getOutput() {
    return this.lfo.output;
  },

  /**
   * Connect to filter cutoff modulation
   */
  connectToFilter(filterParam, min = 100, max = 2000) {
    NS.LFO.disconnectAll(this.lfo);
    NS.LFO.connectTarget(this.lfo, {
      param: filterParam,
      min,
      max,
      bipolar: true
    });
    this.currentTarget = 'filter';
  }
};

console.log('[Dunk] LFO module loaded');
