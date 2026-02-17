/**
 * Dunk - Voice Module
 * Complete voice with 8 parallel synthesis channels
 *
 * Signal chain per voice:
 * [8 Parallel Channels] → [Channel Mixer] → [FIR Filter] → [Distortion] → [Voice Out]
 */

NS.Voice = {
  /**
   * Create a voice
   *
   * @param {AudioContext} ctx - Audio context
   * @param {number} id - Voice ID (0-3)
   * @returns {object} - Voice object
   */
  create(ctx, id) {
    const voice = {
      ctx,
      id,
      enabled: true,

      // Create 8 channels
      channels: [],

      // Create mixer (all channels sum here)
      mixer: ctx.createGain(),

      // FIR filter
      filter: null,
      filterPreset: '808-lpf',

      // Distortion unit
      distortion: null,
      distortionType: 'tanh',
      distortionAmount: 0.3,

      // Output gain
      output: ctx.createGain()
    };

    // Create channels
    for (let i = 0; i < 8; i++) {
      const channel = NS.Channel.create(ctx, i);
      channel.output.connect(voice.mixer);
      voice.channels.push(channel);
    }

    // Create FIR filter
    voice.filter = NS.FIR.createFromPreset(ctx, voice.filterPreset);

    // Create distortion unit
    voice.distortion = NS.Distortion.createUnit(
      ctx,
      voice.distortionType,
      voice.distortionAmount,
      1.0 // Full wet
    );

    // Connect signal chain: mixer → filter → distortion → output
    voice.mixer.connect(voice.filter);
    voice.filter.connect(voice.distortion.input);
    voice.distortion.output.connect(voice.output);

    // Set default output level
    voice.output.gain.value = 0.8;

    return voice;
  },

  /**
   * Trigger the voice
   *
   * @param {object} voice - Voice object
   * @param {number} velocity - Trigger velocity (0-1)
   * @param {object} options - Trigger options
   */
  trigger(voice, velocity = 1.0, options = {}) {
    if (!voice.enabled) return;

    const { channels } = voice;
    const state = NS.State.current;
    const voiceState = state.voices[voice.id] || {};
    const nasty = state.nasty || {};

    // Merge state options with provided options
    const triggerOptions = {
      // Base 808 parameters
      pitchStart: NS.CONSTANTS.PITCH_START,
      pitchEnd: NS.CONSTANTS.PITCH_END,
      pitchTime: NS.CONSTANTS.PITCH_TIME,

      // Nasty range parameters
      decay: nasty.decayExtend || 200,
      decayExtend: (nasty.decayExtend || 200) - 200,
      decayFine: nasty.decayFine || 0.5,
      subHarmonicMix: nasty.subHarmonicMix || 0.3,
      clickIntensity: nasty.clickIntensity || 0.4,
      grimeAmount: nasty.grimeAmount || 0.2,
      pitchDrift: nasty.pitchDrift || 0,
      growlFreq: nasty.growlFreq || 600,

      // Override with provided options
      ...options
    };

    // Trigger each channel with appropriate level
    const channelLevels = voiceState.channels || [0.8, 0.6, 0.5, 0.3, 0.4, 0.2, 0.15, 0.25];
    const mutes = voiceState.mutes || new Array(8).fill(false);

    channels.forEach((channel, i) => {
      channel.muted = mutes[i];
      NS.Channel.setLevel(channel, channelLevels[i]);
      NS.Channel.trigger(channel, triggerOptions.pitchEnd, velocity, triggerOptions);
    });

    NS.Bus.emit('voice:triggered', { id: voice.id, velocity });
  },

  /**
   * Set channel level for a voice
   */
  setChannelLevel(voice, channelIndex, level) {
    if (voice.channels[channelIndex]) {
      NS.Channel.setLevel(voice.channels[channelIndex], level);
    }
  },

  /**
   * Set channel mute for a voice
   */
  setChannelMute(voice, channelIndex, muted) {
    if (voice.channels[channelIndex]) {
      NS.Channel.setMute(voice.channels[channelIndex], muted);
    }
  },

  /**
   * Set voice output level
   */
  setLevel(voice, level) {
    voice.output.gain.setTargetAtTime(level, voice.ctx.currentTime, 0.01);
  },

  /**
   * Set voice enabled state
   */
  setEnabled(voice, enabled) {
    voice.enabled = enabled;
  },

  /**
   * Set filter preset
   */
  setFilter(voice, presetId) {
    const { ctx, mixer, distortion } = voice;

    // Disconnect old filter
    if (voice.filter) {
      mixer.disconnect(voice.filter);
      voice.filter.disconnect();
    }

    // Create new filter
    voice.filter = NS.FIR.createFromPreset(ctx, presetId);
    voice.filterPreset = presetId;

    // Reconnect
    mixer.connect(voice.filter);
    voice.filter.connect(distortion.input);
  },

  /**
   * Set custom filter cutoff
   */
  setFilterCutoff(voice, cutoff) {
    const preset = NS.FIR.presets[voice.filterPreset] || NS.FIR.presets['808-lpf'];
    NS.FIR.updateCutoff(voice.ctx, voice.filter, cutoff, {
      type: preset.type,
      taps: preset.taps,
      window: preset.window
    });
  },

  /**
   * Set distortion type
   */
  setDistortionType(voice, type) {
    voice.distortionType = type;
    voice.distortion.setAlgorithm(type, voice.distortionAmount);
  },

  /**
   * Set distortion amount
   */
  setDistortionAmount(voice, amount) {
    voice.distortionAmount = amount;
    voice.distortion.setAmount(amount);
  },

  /**
   * Get voice state for saving
   */
  getState(voice) {
    return {
      enabled: voice.enabled,
      level: voice.output.gain.value,
      channels: voice.channels.map(ch => ch.level.gain.value),
      mutes: voice.channels.map(ch => ch.muted),
      distortion: {
        type: voice.distortionType,
        amount: voice.distortionAmount
      },
      filter: voice.filterPreset
    };
  },

  /**
   * Apply state to voice
   */
  applyState(voice, state) {
    voice.enabled = state.enabled !== false;
    voice.output.gain.value = state.level || 0.8;

    if (state.channels) {
      state.channels.forEach((level, i) => {
        if (voice.channels[i]) {
          NS.Channel.setLevel(voice.channels[i], level);
        }
      });
    }

    if (state.mutes) {
      state.mutes.forEach((muted, i) => {
        if (voice.channels[i]) {
          NS.Channel.setMute(voice.channels[i], muted);
        }
      });
    }

    if (state.distortion) {
      this.setDistortionType(voice, state.distortion.type || 'tanh');
      this.setDistortionAmount(voice, state.distortion.amount || 0.3);
    }

    if (state.filter) {
      this.setFilter(voice, state.filter);
    }
  }
};

/**
 * Voice Bank - Manages all 4 voices
 */
NS.VoiceBank = {
  voices: [],
  masterOutput: null,

  /**
   * Initialize voice bank
   */
  init(ctx) {
    this.voices = [];
    this.masterOutput = ctx.createGain();

    // Create 4 voices
    for (let i = 0; i < NS.CONSTANTS.VOICE_COUNT; i++) {
      const voice = NS.Voice.create(ctx, i);
      voice.output.connect(this.masterOutput);
      this.voices.push(voice);
    }

    // Apply state
    const state = NS.State.current;
    if (state.voices) {
      state.voices.forEach((voiceState, i) => {
        if (this.voices[i]) {
          NS.Voice.applyState(this.voices[i], voiceState);
        }
      });
    }

    console.log('[Dunk] VoiceBank initialized with', this.voices.length, 'voices');
  },

  /**
   * Get voice by ID
   */
  get(id) {
    return this.voices[id];
  },

  /**
   * Trigger a voice
   */
  trigger(voiceId, velocity = 1.0, options = {}) {
    const voice = this.voices[voiceId];
    if (voice) {
      NS.Voice.trigger(voice, velocity, options);
    }
  },

  /**
   * Connect to destination
   */
  connect(destination) {
    this.masterOutput.connect(destination);
    return this;
  },

  /**
   * Disconnect from destination
   */
  disconnect() {
    this.masterOutput.disconnect();
    return this;
  }
};

console.log('[Dunk] Voice module loaded');
