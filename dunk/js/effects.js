/**
 * Dunk - Effects Module
 * Master bus effects: Compressor, Reverb, Limiter
 */

NS.Effects = {
  /**
   * Create compressor with sidechain-ready architecture
   */
  createCompressor(ctx, options = {}) {
    const {
      threshold = -24,
      knee = 10,
      ratio = 4,
      attack = 0.003,
      release = 0.25
    } = options;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = threshold;
    compressor.knee.value = knee;
    compressor.ratio.value = ratio;
    compressor.attack.value = attack;
    compressor.release.value = release;

    return {
      node: compressor,
      input: compressor,
      output: compressor,

      setThreshold(val) {
        compressor.threshold.setTargetAtTime(val, ctx.currentTime, 0.01);
      },
      setRatio(val) {
        compressor.ratio.setTargetAtTime(val, ctx.currentTime, 0.01);
      },
      setAttack(val) {
        compressor.attack.setTargetAtTime(val, ctx.currentTime, 0.01);
      },
      setRelease(val) {
        compressor.release.setTargetAtTime(val, ctx.currentTime, 0.01);
      },
      getReduction() {
        return compressor.reduction;
      }
    };
  },

  /**
   * Create reverb using ConvolverNode with generated impulse response
   */
  createReverb(ctx, options = {}) {
    const {
      decay = 1.5,
      wet = 0.1,
      preDelay = 0.01
    } = options;

    const input = ctx.createGain();
    const output = ctx.createGain();
    const dry = ctx.createGain();
    const wetGain = ctx.createGain();
    const convolver = ctx.createConvolver();
    const preDelayNode = ctx.createDelay(0.5);

    // Generate impulse response
    const ir = this._generateImpulseResponse(ctx, decay);
    convolver.buffer = ir;

    // Set levels
    dry.gain.value = 1 - wet;
    wetGain.gain.value = wet;
    preDelayNode.delayTime.value = preDelay;

    // Routing: input → dry → output
    //          input → preDelay → convolver → wet → output
    input.connect(dry);
    dry.connect(output);

    input.connect(preDelayNode);
    preDelayNode.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(output);

    return {
      input,
      output,
      convolver,
      dry,
      wet: wetGain,

      setWet(val) {
        wetGain.gain.setTargetAtTime(val, ctx.currentTime, 0.01);
        dry.gain.setTargetAtTime(1 - val, ctx.currentTime, 0.01);
      },
      setDecay(val) {
        const newIr = this._generateImpulseResponse(ctx, val);
        convolver.buffer = newIr;
      },
      setPreDelay(val) {
        preDelayNode.delayTime.setTargetAtTime(val, ctx.currentTime, 0.01);
      }
    };
  },

  /**
   * Generate synthetic impulse response for reverb
   */
  _generateImpulseResponse(ctx, decay = 1.5, reverse = false) {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * decay);
    const buffer = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponential decay with noise
        const n = reverse ? length - i - 1 : i;
        const envelope = Math.exp(-3 * n / length);
        data[i] = (Math.random() * 2 - 1) * envelope;
      }
    }

    return buffer;
  },

  /**
   * Create limiter (fast compressor with high ratio)
   */
  createLimiter(ctx, options = {}) {
    const {
      threshold = -3,
      release = 0.1
    } = options;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = threshold;
    compressor.knee.value = 0;  // Hard knee
    compressor.ratio.value = 20; // High ratio
    compressor.attack.value = 0.001; // Fast attack
    compressor.release.value = release;

    return {
      node: compressor,
      input: compressor,
      output: compressor,

      setThreshold(val) {
        compressor.threshold.setTargetAtTime(val, ctx.currentTime, 0.01);
      },
      setRelease(val) {
        compressor.release.setTargetAtTime(val, ctx.currentTime, 0.01);
      },
      getReduction() {
        return compressor.reduction;
      }
    };
  },

  /**
   * Create master gain for final output level
   */
  createMasterGain(ctx, level = 0.8) {
    const gain = ctx.createGain();
    gain.gain.value = level;

    return {
      node: gain,
      input: gain,
      output: gain,

      setLevel(val) {
        gain.gain.setTargetAtTime(val, ctx.currentTime, 0.01);
      },
      getLevel() {
        return gain.gain.value;
      }
    };
  }
};

/**
 * Master Bus - Complete effects chain
 *
 * Signal chain:
 * [Input] → [LFO System] → [Master FIR] → [Compressor] → [Reverb] → [Limiter] → [Master Gain] → [Analyser] → [Output]
 */
NS.MasterBus = {
  ctx: null,
  input: null,
  output: null,
  analyser: null,

  // Effect units
  filter: null,
  compressor: null,
  reverb: null,
  limiter: null,
  masterGain: null,

  /**
   * Initialize master bus
   */
  init(ctx) {
    this.ctx = ctx;

    // Create input/output
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    // Create FIR filter for master
    this.filter = NS.FIR.createFromPreset(ctx, '808-lpf');

    // Create effects
    const state = NS.State.current.master || {};

    this.compressor = NS.Effects.createCompressor(ctx, {
      threshold: state.compThreshold || -24,
      ratio: state.compRatio || 4
    });

    this.reverb = NS.Effects.createReverb(ctx, {
      wet: state.reverbMix || 0.1
    });

    this.limiter = NS.Effects.createLimiter(ctx, {
      threshold: state.limiter || -3
    });

    this.masterGain = NS.Effects.createMasterGain(ctx, NS.State.current.masterLevel || 0.8);

    // Create analyser for visualization
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // Connect chain
    this.input.connect(this.filter);
    this.filter.connect(this.compressor.input);
    this.compressor.output.connect(this.reverb.input);
    this.reverb.output.connect(this.limiter.input);
    this.limiter.output.connect(this.masterGain.input);
    this.masterGain.output.connect(this.analyser);
    this.analyser.connect(this.output);

    // Listen for state changes
    NS.Bus.on('state:master.compThreshold', (val) => {
      this.compressor.setThreshold(val);
    });

    NS.Bus.on('state:master.compRatio', (val) => {
      this.compressor.setRatio(val);
    });

    NS.Bus.on('state:master.reverbMix', (val) => {
      this.reverb.setWet(val);
    });

    NS.Bus.on('state:master.limiter', (val) => {
      this.limiter.setThreshold(val);
    });

    NS.Bus.on('state:masterLevel', (val) => {
      this.masterGain.setLevel(val);
    });

    console.log('[Dunk] MasterBus initialized');
  },

  /**
   * Connect to audio destination
   */
  connect(destination) {
    this.output.connect(destination);
    return this;
  },

  /**
   * Get analyser node for visualization
   */
  getAnalyser() {
    return this.analyser;
  },

  /**
   * Get frequency data for visualization
   */
  getFrequencyData() {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  },

  /**
   * Get time domain data for visualization
   */
  getTimeDomainData() {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  },

  /**
   * Set master filter cutoff
   */
  setFilterCutoff(cutoff) {
    NS.FIR.updateCutoff(this.ctx, this.filter, cutoff, {
      type: 'lowpass',
      taps: 127,
      window: 'blackman'
    });
  },

  /**
   * Get compressor reduction for metering
   */
  getCompressorReduction() {
    return this.compressor.getReduction();
  },

  /**
   * Get limiter reduction for metering
   */
  getLimiterReduction() {
    return this.limiter.getReduction();
  }
};

console.log('[Dunk] Effects module loaded');
