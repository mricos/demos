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
  },

  /**
   * Create noise gate to silence sub-threshold signals
   * Uses AnalyserNode for level detection and GainNode for gating
   * Includes DC blocking filter to remove DC offset
   */
  createNoiseGate(ctx, options = {}) {
    const {
      threshold = -50,    // dB below which gate closes (more aggressive)
      attack = 0.0005,    // Gate open time (s) - faster
      release = 0.02,     // Gate close time (s) - faster
      range = -96,        // Attenuation when closed (dB) - complete silence
      holdTime = 0.005    // Hold time before release (s)
    } = options;

    const input = ctx.createGain();
    const output = ctx.createGain();
    const gateGain = ctx.createGain();
    const analyser = ctx.createAnalyser();

    // DC blocking filter (high-pass at 10Hz to remove DC offset and sub-audio rumble)
    const dcBlocker = ctx.createBiquadFilter();
    dcBlocker.type = 'highpass';
    dcBlocker.frequency.value = 10;
    dcBlocker.Q.value = 0.7;

    // Configure analyser for fast response
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.2;

    // Connect: input → dcBlocker → analyser → gateGain → output
    input.connect(dcBlocker);
    dcBlocker.connect(analyser);
    analyser.connect(gateGain);
    gateGain.connect(output);

    // Gate state
    let isOpen = false;
    let holdCounter = 0;
    let animationId = null;
    let silenceFrames = 0;
    const dataArray = new Float32Array(analyser.fftSize);

    // Convert threshold dB to linear (mutable for dynamic updates)
    let thresholdLinear = Math.pow(10, threshold / 20);
    let releaseTime = release;
    const rangeLinear = Math.pow(10, range / 20);

    // Gate processing loop
    const processGate = () => {
      analyser.getFloatTimeDomainData(dataArray);

      // Calculate RMS level
      let sumSquares = 0;
      let peak = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sumSquares += dataArray[i] * dataArray[i];
        peak = Math.max(peak, Math.abs(dataArray[i]));
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);

      const now = ctx.currentTime;

      // Use both RMS and peak detection for better accuracy
      const level = Math.max(rms, peak * 0.5);

      if (level > thresholdLinear) {
        // Signal above threshold - open gate
        if (!isOpen) {
          gateGain.gain.cancelScheduledValues(now);
          gateGain.gain.setTargetAtTime(1, now, attack);
          isOpen = true;
        }
        holdCounter = holdTime * 60; // Convert to frames (assuming 60fps)
        silenceFrames = 0;
      } else {
        // Signal below threshold
        silenceFrames++;

        if (isOpen && holdCounter <= 0) {
          // Close gate after hold time
          gateGain.gain.cancelScheduledValues(now);
          gateGain.gain.setTargetAtTime(rangeLinear, now, releaseTime);
          isOpen = false;
        } else if (holdCounter > 0) {
          holdCounter--;
        }

        // Hard silence after extended quiet period (30 frames = ~0.5s)
        if (silenceFrames > 30 && gateGain.gain.value > 0.0001) {
          gateGain.gain.cancelScheduledValues(now);
          gateGain.gain.setValueAtTime(0, now);
        }
      }

      animationId = requestAnimationFrame(processGate);
    };

    return {
      input,
      output,
      analyser,

      start() {
        if (!animationId) {
          gateGain.gain.value = 0; // Start fully closed (complete silence)
          silenceFrames = 30; // Already in silence mode
          processGate();
        }
      },

      stop() {
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
      },

      setThreshold(val) {
        // Update threshold (dB) - converts to linear for processing loop
        thresholdLinear = Math.pow(10, val / 20);
      },

      setRelease(val) {
        // Update release time
        releaseTime = val;
      },

      isOpen() {
        return isOpen;
      },

      getState() {
        return { isOpen, thresholdLinear, releaseTime };
      }
    };
  }
};

/**
 * Master Bus - Complete effects chain
 *
 * Signal chain:
 * [Input] → [Master FIR] → [Compressor] → [Reverb] → [Limiter] → [Noise Gate] → [Master Gain] → [Analyser] → [Output]
 *
 * The Noise Gate silences any sub-threshold signals to eliminate glitchy noise when silent.
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
  noiseGate: null,
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

    // Noise gate to silence sub-threshold signals
    this.noiseGate = NS.Effects.createNoiseGate(ctx, {
      threshold: state.gateThreshold || -60,
      release: state.gateRelease || 0.05
    });

    this.masterGain = NS.Effects.createMasterGain(ctx, NS.State.current.masterLevel || 0.8);

    // Create analyser for visualization
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // Connect chain (with noise gate after limiter)
    this.input.connect(this.filter);
    this.filter.connect(this.compressor.input);
    this.compressor.output.connect(this.reverb.input);
    this.reverb.output.connect(this.limiter.input);
    this.limiter.output.connect(this.noiseGate.input);
    this.noiseGate.output.connect(this.masterGain.input);
    this.masterGain.output.connect(this.analyser);
    this.analyser.connect(this.output);

    // Start noise gate processing
    this.noiseGate.start();

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

    NS.Bus.on('state:master.gateThreshold', (val) => {
      this.noiseGate.setThreshold(val);
    });

    NS.Bus.on('state:master.gateRelease', (val) => {
      this.noiseGate.setRelease(val);
    });

    console.log('[Dunk] MasterBus initialized (with noise gate)');
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
