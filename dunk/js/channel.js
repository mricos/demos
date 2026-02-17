/**
 * Dunk - Channel Module
 * Individual synthesis channels for the 8-channel voice architecture
 *
 * Channel types:
 * 0: Sub (sine 40-60Hz, long decay)
 * 1: Body (triangle, octave up)
 * 2: Click (noise burst 1-4kHz)
 * 3: Harmonics (saw, pitch follow)
 * 4: Sub-Harmonic (sine f/2)
 * 5: Formant (bandpass excited)
 * 6: Noise (filtered noise layer)
 * 7: Reese (detuned saws for wobble)
 */

NS.Channel = {
  /**
   * Channel type definitions
   */
  types: {
    SUB: 0,
    BODY: 1,
    CLICK: 2,
    HARMONICS: 3,
    SUB_HARMONIC: 4,
    FORMANT: 5,
    NOISE: 6,
    REESE: 7
  },

  /**
   * Create a synthesis channel
   *
   * @param {AudioContext} ctx - Audio context
   * @param {number} type - Channel type (0-7)
   * @returns {object} - Channel object with trigger method
   */
  create(ctx, type) {
    const channel = {
      ctx,
      type,
      output: ctx.createGain(),
      level: ctx.createGain(),
      muted: false,
      nodes: []
    };

    channel.level.gain.value = 1.0;
    channel.level.connect(channel.output);

    // Store type-specific setup
    channel._setup = this._getSetup(type);

    return channel;
  },

  /**
   * Get setup function for channel type
   */
  _getSetup(type) {
    const setups = {
      // Sub channel - deep sine wave
      [this.types.SUB]: (ctx, baseFreq, velocity, options) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = baseFreq;

        // Apply pitch envelope
        NS.Envelope.pitchEnvelope(osc.frequency, ctx.currentTime, {
          pitchStart: options.pitchStart || 130,
          pitchEnd: baseFreq,
          pitchTime: options.pitchTime || 0.006,
          pitchDrift: options.pitchDrift || 0
        });

        // Amplitude envelope
        NS.Envelope.amplitudeEnvelope(env, ctx.currentTime, {
          velocity: velocity * (options.subLevel || 0.8),
          decay: options.decay || 200,
          decayExtend: options.decayExtend || 0,
          decayFine: options.decayFine || 0.5
        });

        osc.connect(env);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 3); // Max duration

        return { osc, env, output: env };
      },

      // Body channel - triangle wave, octave up
      [this.types.BODY]: (ctx, baseFreq, velocity, options) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = baseFreq * 2; // Octave up

        // Apply pitch envelope (faster for body)
        NS.Envelope.pitchEnvelope(osc.frequency, ctx.currentTime, {
          pitchStart: (options.pitchStart || 130) * 2,
          pitchEnd: baseFreq * 2,
          pitchTime: (options.pitchTime || 0.006) * 0.8,
          pitchDrift: options.pitchDrift || 0
        });

        NS.Envelope.amplitudeEnvelope(env, ctx.currentTime, {
          velocity: velocity * (options.bodyLevel || 0.6),
          decay: (options.decay || 200) * 0.7,
          decayExtend: (options.decayExtend || 0) * 0.5,
          decayFine: options.decayFine || 0.5
        });

        osc.connect(env);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 2);

        return { osc, env, output: env };
      },

      // Click channel - noise burst through bandpass
      [this.types.CLICK]: (ctx, baseFreq, velocity, options) => {
        // Create noise buffer
        const bufferSize = ctx.sampleRate * 0.05; // 50ms max
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        // Bandpass filter for click (1-4kHz range)
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2500;
        filter.Q.value = 1;

        const env = ctx.createGain();

        NS.Envelope.clickEnvelope(env, ctx.currentTime, {
          clickIntensity: velocity * (options.clickIntensity || 0.5),
          clickDuration: 0.004
        });

        noise.connect(filter);
        filter.connect(env);
        noise.start(ctx.currentTime);
        noise.stop(ctx.currentTime + 0.05);

        return { noise, filter, env, output: env };
      },

      // Harmonics channel - sawtooth with pitch follow
      [this.types.HARMONICS]: (ctx, baseFreq, velocity, options) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = baseFreq;

        NS.Envelope.pitchEnvelope(osc.frequency, ctx.currentTime, {
          pitchStart: options.pitchStart || 130,
          pitchEnd: baseFreq,
          pitchTime: options.pitchTime || 0.006,
          pitchDrift: options.pitchDrift || 0
        });

        NS.Envelope.amplitudeEnvelope(env, ctx.currentTime, {
          velocity: velocity * (options.harmonicsLevel || 0.3),
          decay: (options.decay || 200) * 0.6,
          decayExtend: (options.decayExtend || 0) * 0.3,
          decayFine: Math.max(0, (options.decayFine || 0.5) - 0.2)
        });

        osc.connect(env);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 2);

        return { osc, env, output: env };
      },

      // Sub-harmonic channel - sine at f/2 (octave below)
      [this.types.SUB_HARMONIC]: (ctx, baseFreq, velocity, options) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = baseFreq / 2; // Octave below

        // Slower pitch envelope for sub-harmonic
        NS.Envelope.pitchEnvelope(osc.frequency, ctx.currentTime, {
          pitchStart: (options.pitchStart || 130) / 2,
          pitchEnd: baseFreq / 2,
          pitchTime: (options.pitchTime || 0.006) * 1.5,
          pitchDrift: options.pitchDrift || 0
        });

        NS.Envelope.subHarmonicEnvelope(env, ctx.currentTime, {
          subMix: velocity * (options.subHarmonicMix || 0.4),
          decay: options.decay || 200,
          decayExtend: options.decayExtend || 0
        });

        osc.connect(env);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 4);

        return { osc, env, output: env };
      },

      // Formant channel - bandpass-excited vowel sounds
      [this.types.FORMANT]: (ctx, baseFreq, velocity, options) => {
        // Source oscillator
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = baseFreq;

        // Formant filters (vowel "ah")
        const formants = [
          { freq: 700, Q: 10 },
          { freq: 1200, Q: 10 },
          { freq: 2500, Q: 10 }
        ];

        const filters = formants.map(f => {
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = f.freq;
          filter.Q.value = f.Q;
          return filter;
        });

        const mixer = ctx.createGain();
        const env = ctx.createGain();

        // Connect each formant to mixer
        filters.forEach((filter, i) => {
          const gain = ctx.createGain();
          gain.gain.value = 0.33;
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(mixer);
        });

        NS.Envelope.formantEnvelope(env, ctx.currentTime, {
          level: velocity * (options.formantLevel || 0.2),
          decay: options.decay || 200,
          decayExtend: options.decayExtend || 0
        });

        mixer.connect(env);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 2);

        return { osc, filters, mixer, env, output: env };
      },

      // Noise channel - filtered noise layer
      [this.types.NOISE]: (ctx, baseFreq, velocity, options) => {
        const bufferSize = ctx.sampleRate * 0.5; // 500ms
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        // Lowpass filter to shape noise
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = baseFreq * 4;
        filter.Q.value = 0.7;

        const env = ctx.createGain();

        NS.Envelope.noiseEnvelope(env, ctx.currentTime, {
          level: velocity * (options.noiseLevel || 0.15),
          duration: 0.02 + (options.decay || 200) / 1000 * 0.1
        });

        noise.connect(filter);
        filter.connect(env);
        noise.start(ctx.currentTime);
        noise.stop(ctx.currentTime + 0.5);

        return { noise, filter, env, output: env };
      },

      // Reese channel - detuned saws for wobble/phasing
      [this.types.REESE]: (ctx, baseFreq, velocity, options) => {
        const detune = options.reeseDetune || 10; // cents
        const oscs = [];
        const mixer = ctx.createGain();
        const env = ctx.createGain();

        // Create 3 detuned oscillators
        [-detune, 0, detune].forEach((d, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = baseFreq;
          osc.detune.value = d;

          const gain = ctx.createGain();
          gain.gain.value = 0.33;

          osc.connect(gain);
          gain.connect(mixer);
          oscs.push(osc);
        });

        NS.Envelope.reeseEnvelope(env, ctx.currentTime, {
          level: velocity * (options.reeseLevel || 0.25),
          decay: options.decay || 200,
          decayExtend: options.decayExtend || 0,
          decayFine: options.decayFine || 0.5
        });

        mixer.connect(env);

        oscs.forEach(osc => {
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 4);
        });

        return { oscs, mixer, env, output: env };
      }
    };

    return setups[type] || setups[this.types.SUB];
  },

  /**
   * Trigger the channel
   *
   * @param {object} channel - Channel object
   * @param {number} baseFreq - Base frequency (default 50Hz for 808)
   * @param {number} velocity - Trigger velocity (0-1)
   * @param {object} options - Additional options (nasty params, etc.)
   */
  trigger(channel, baseFreq = 50, velocity = 1.0, options = {}) {
    if (channel.muted) return;

    const { ctx, level, _setup } = channel;

    // Create nodes for this trigger
    const nodes = _setup(ctx, baseFreq, velocity, options);

    // Connect to channel output through level control
    nodes.output.connect(level);

    // Store for cleanup
    channel.nodes.push(nodes);

    // Clean up old nodes after they finish
    setTimeout(() => {
      const idx = channel.nodes.indexOf(nodes);
      if (idx > -1) {
        channel.nodes.splice(idx, 1);
      }
    }, 5000);
  },

  /**
   * Set channel level
   */
  setLevel(channel, level) {
    channel.level.gain.setTargetAtTime(level, channel.ctx.currentTime, 0.01);
  },

  /**
   * Set channel mute state
   */
  setMute(channel, muted) {
    channel.muted = muted;
  }
};

console.log('[Dunk] Channel module loaded');
