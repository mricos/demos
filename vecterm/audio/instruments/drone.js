/**
 * tines.js - Drone Instrument
 * Multi-oscillator drone synthesizer with detuning and modulation
 */

import { noteToFreq } from '../tines-engine.js';

export class DroneVoice {
  constructor(engine, params = {}) {
    this.engine = engine;
    this.channel = 'drone';

    // Parameters
    this.params = {
      frequency: params.frequency || 110, // A2
      waveform: params.waveform || 'sawtooth', // sine, square, sawtooth, triangle
      detune: params.detune || 10, // Cents detuning for richness
      voices: params.voices || 3, // Number of detuned oscillators
      filterFreq: params.filterFreq || 2000,
      filterQ: params.filterQ || 1,
      lfoRate: params.lfoRate || 0.2, // Hz
      lfoDepth: params.lfoDepth || 0.3, // 0-1
      volume: params.volume || 0.5,
      attack: params.attack || 2.0, // Seconds
      release: params.release || 2.0
    };

    this.oscillators = [];
    this.gainNode = null;
    this.filterNode = null;
    this.lfo = null;
    this.lfoGain = null;

    this.playing = false;
    this.voiceId = `drone_${Date.now()}_${Math.random()}`;
  }

  /**
   * Start the drone
   */
  start(time = null) {
    if (this.playing) return;

    const ctx = this.engine.audioContext;
    const startTime = time || ctx.currentTime;
    const channel = this.engine.channels[this.channel];

    // Create gain node
    this.gainNode = ctx.createGain();
    this.gainNode.gain.setValueAtTime(0, startTime);
    this.gainNode.gain.linearRampToValueAtTime(
      this.params.volume,
      startTime + this.params.attack
    );

    // Create filter (low-pass for warmth)
    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = this.params.filterFreq;
    this.filterNode.Q.value = this.params.filterQ;

    // Create LFO for modulation
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = this.params.lfoRate;
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = this.params.filterFreq * this.params.lfoDepth;

    // LFO modulates filter frequency
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filterNode.frequency);

    // Create detuned oscillators for richness
    const detuneSpread = this.params.detune;
    for (let i = 0; i < this.params.voices; i++) {
      const osc = ctx.createOscillator();
      osc.type = this.params.waveform;
      osc.frequency.value = this.params.frequency;

      // Detune each oscillator differently
      const detuneAmount = ((i - Math.floor(this.params.voices / 2)) * detuneSpread);
      osc.detune.value = detuneAmount;

      // Connect: Oscillator -> Filter -> Gain -> Channel
      osc.connect(this.filterNode);
      osc.start(startTime);

      this.oscillators.push(osc);
    }

    // Connect chain: filter -> voice gain -> channel panner -> channel gain
    this.filterNode.connect(this.gainNode);
    this.gainNode.connect(channel.panner);

    // Start LFO
    this.lfo.start(startTime);

    this.playing = true;

    // Register with engine
    this.engine.registerVoice(this.voiceId, this);

    console.log('[drone] Started', {
      frequency: this.params.frequency,
      voices: this.params.voices,
      detune: this.params.detune
    });
  }

  /**
   * Stop the drone
   */
  stop(time = null) {
    if (!this.playing) return;

    const ctx = this.engine.audioContext;
    const stopTime = time || ctx.currentTime;

    // Fade out
    this.gainNode.gain.cancelScheduledValues(stopTime);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, stopTime);
    this.gainNode.gain.linearRampToValueAtTime(0, stopTime + this.params.release);

    // Stop oscillators after release
    this.oscillators.forEach(osc => {
      osc.stop(stopTime + this.params.release);
    });

    if (this.lfo) {
      this.lfo.stop(stopTime + this.params.release);
    }

    this.playing = false;

    // Unregister after release
    setTimeout(() => {
      this.engine.unregisterVoice(this.voiceId);
    }, this.params.release * 1000 + 100);

    console.log('[drone] Stopped');
  }

  /**
   * Update parameters in real-time
   */
  setParam(param, value) {
    const ctx = this.engine.audioContext;
    const now = ctx.currentTime;

    switch (param) {
      case 'frequency':
        this.params.frequency = value;
        this.oscillators.forEach(osc => {
          osc.frequency.setValueAtTime(value, now);
        });
        break;

      case 'filterFreq':
        this.params.filterFreq = value;
        if (this.filterNode) {
          this.filterNode.frequency.setValueAtTime(value, now);
        }
        break;

      case 'filterQ':
        this.params.filterQ = value;
        if (this.filterNode) {
          this.filterNode.Q.setValueAtTime(value, now);
        }
        break;

      case 'lfoRate':
        this.params.lfoRate = value;
        if (this.lfo) {
          this.lfo.frequency.setValueAtTime(value, now);
        }
        break;

      case 'lfoDepth':
        this.params.lfoDepth = value;
        if (this.lfoGain) {
          this.lfoGain.gain.setValueAtTime(
            this.params.filterFreq * value,
            now
          );
        }
        break;

      case 'volume':
        this.params.volume = value;
        if (this.gainNode) {
          this.gainNode.gain.setValueAtTime(value, now);
        }
        break;

      default:
        console.warn(`[drone] Unknown parameter: ${param}`);
    }
  }

  /**
   * Slide to a new frequency (glide/portamento)
   */
  glide(targetFreq, duration = 1.0) {
    if (!this.playing) return;

    const ctx = this.engine.audioContext;
    const now = ctx.currentTime;

    this.params.frequency = targetFreq;
    this.oscillators.forEach(osc => {
      osc.frequency.cancelScheduledValues(now);
      osc.frequency.setValueAtTime(osc.frequency.value, now);
      osc.frequency.linearRampToValueAtTime(targetFreq, now + duration);
    });
  }
}

/**
 * Drone Instrument Interface
 */
export class DroneInstrument {
  constructor(engine) {
    this.engine = engine;
    this.activeVoices = new Map();
    this.defaultParams = {
      waveform: 'sawtooth',
      detune: 10,
      voices: 3,
      filterFreq: 2000,
      filterQ: 1,
      lfoRate: 0.2,
      lfoDepth: 0.3,
      volume: 0.5,
      attack: 2.0,
      release: 2.0
    };
  }

  /**
   * Play a drone note
   */
  play(note, params = {}) {
    const frequency = typeof note === 'number' ? note : noteToFreq(note);

    const droneParams = {
      ...this.defaultParams,
      ...params,
      frequency
    };

    const voice = new DroneVoice(this.engine, droneParams);
    voice.start();

    this.activeVoices.set(voice.voiceId, voice);
    return voice;
  }

  /**
   * Stop a specific voice or all voices
   */
  stop(voiceId = null) {
    if (voiceId) {
      const voice = this.activeVoices.get(voiceId);
      if (voice) {
        voice.stop();
        this.activeVoices.delete(voiceId);
      }
    } else {
      // Stop all
      this.activeVoices.forEach(voice => voice.stop());
      this.activeVoices.clear();
    }
  }

  /**
   * Set default parameters
   */
  setDefaults(params) {
    this.defaultParams = {
      ...this.defaultParams,
      ...params
    };
  }

  /**
   * Get active voice count
   */
  getVoiceCount() {
    return this.activeVoices.size;
  }
}
