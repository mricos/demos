/**
 * tines.js - Bells Instrument
 * FM synthesis bell instrument with multiple presets
 */

import { noteToFreq } from '../tines-engine.js';
import { parseNote } from '../note-parser.js';

export class BellVoice {
  constructor(engine, params = {}) {
    this.engine = engine;
    this.channel = 'bells';

    // FM synthesis parameters
    this.params = {
      frequency: params.frequency || 440,
      harmonicity: params.harmonicity || 3.5, // Carrier:modulator ratio
      modulationIndex: params.modulationIndex || 10, // Modulation depth
      attack: params.attack || 0.001, // Very fast attack
      decay: params.decay || 0.3,
      sustain: params.sustain || 0.3,
      release: params.release || 1.5,
      brightness: params.brightness || 0.8, // Filter cutoff multiplier
      volume: params.volume || 0.5,
      pan: params.pan || 0 // Stereo pan (-1 to 1)
    };

    this.carrier = null;
    this.modulator = null;
    this.modulatorGain = null;
    this.gainNode = null;
    this.filterNode = null;

    this.playing = false;
    this.voiceId = `bell_${Date.now()}_${Math.random()}`;
  }

  /**
   * Start the bell voice
   */
  start(time = null) {
    if (this.playing) return;

    const ctx = this.engine.audioContext;
    const startTime = time || ctx.currentTime;
    const channel = this.engine.channels[this.channel];

    // Create FM synthesis chain
    // Modulator oscillator
    this.modulator = ctx.createOscillator();
    this.modulator.frequency.value = this.params.frequency * this.params.harmonicity;

    // Modulation gain (modulation index)
    this.modulatorGain = ctx.createGain();
    const peakModIndex = this.params.frequency * this.params.modulationIndex;
    this.modulatorGain.gain.setValueAtTime(0, startTime);
    this.modulatorGain.gain.linearRampToValueAtTime(
      peakModIndex,
      startTime + this.params.attack
    );
    this.modulatorGain.gain.exponentialRampToValueAtTime(
      peakModIndex * this.params.sustain,
      startTime + this.params.attack + this.params.decay
    );

    // Carrier oscillator
    this.carrier = ctx.createOscillator();
    this.carrier.frequency.value = this.params.frequency;

    // Low-pass filter for brightness control
    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    const filterFreq = this.params.frequency * 4 * this.params.brightness;
    this.filterNode.frequency.setValueAtTime(filterFreq * 2, startTime);
    this.filterNode.frequency.exponentialRampToValueAtTime(
      filterFreq,
      startTime + this.params.attack + this.params.decay
    );
    this.filterNode.Q.value = 1;

    // Amplitude envelope
    this.gainNode = ctx.createGain();
    this.gainNode.gain.setValueAtTime(0, startTime);
    this.gainNode.gain.linearRampToValueAtTime(
      this.params.volume,
      startTime + this.params.attack
    );
    this.gainNode.gain.exponentialRampToValueAtTime(
      this.params.volume * this.params.sustain,
      startTime + this.params.attack + this.params.decay
    );

    // Connect FM chain: modulator -> modulatorGain -> carrier.frequency
    this.modulator.connect(this.modulatorGain);
    this.modulatorGain.connect(this.carrier.frequency);

    // Connect audio chain: carrier -> filter -> gain -> channel panner
    this.carrier.connect(this.filterNode);
    this.filterNode.connect(this.gainNode);
    this.gainNode.connect(channel.panner);

    // Start oscillators
    this.modulator.start(startTime);
    this.carrier.start(startTime);

    this.playing = true;

    // Register with engine
    this.engine.registerVoice(this.voiceId, this);

    console.log('[bell] Started', {
      frequency: this.params.frequency,
      harmonicity: this.params.harmonicity,
      modulationIndex: this.params.modulationIndex
    });
  }

  /**
   * Stop the bell voice
   */
  stop(time = null) {
    if (!this.playing) return;

    const ctx = this.engine.audioContext;
    const stopTime = time || ctx.currentTime;

    // Release envelope
    this.gainNode.gain.cancelScheduledValues(stopTime);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, stopTime);
    this.gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime + this.params.release);

    // Fade out modulation
    this.modulatorGain.gain.cancelScheduledValues(stopTime);
    this.modulatorGain.gain.setValueAtTime(this.modulatorGain.gain.value, stopTime);
    this.modulatorGain.gain.exponentialRampToValueAtTime(1, stopTime + this.params.release);

    // Stop oscillators after release
    this.carrier.stop(stopTime + this.params.release);
    this.modulator.stop(stopTime + this.params.release);

    this.playing = false;

    // Unregister after release
    setTimeout(() => {
      this.engine.unregisterVoice(this.voiceId);
    }, this.params.release * 1000 + 100);

    console.log('[bell] Stopped');
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
        if (this.carrier) {
          this.carrier.frequency.setValueAtTime(value, now);
        }
        if (this.modulator) {
          this.modulator.frequency.setValueAtTime(value * this.params.harmonicity, now);
        }
        break;

      case 'harmonicity':
        this.params.harmonicity = value;
        if (this.modulator) {
          this.modulator.frequency.setValueAtTime(
            this.params.frequency * value,
            now
          );
        }
        break;

      case 'modulationIndex':
        this.params.modulationIndex = value;
        if (this.modulatorGain) {
          this.modulatorGain.gain.setValueAtTime(
            this.params.frequency * value,
            now
          );
        }
        break;

      case 'brightness':
        this.params.brightness = value;
        if (this.filterNode) {
          const filterFreq = this.params.frequency * 4 * value;
          this.filterNode.frequency.setValueAtTime(filterFreq, now);
        }
        break;

      case 'volume':
        this.params.volume = value;
        if (this.gainNode) {
          this.gainNode.gain.setValueAtTime(value, now);
        }
        break;

      default:
        console.warn(`[bell] Unknown parameter: ${param}`);
    }
  }
}

/**
 * Bells Instrument Interface
 */
export class BellsInstrument {
  constructor(engine) {
    this.engine = engine;
    this.activeVoices = new Map();

    // Presets for different bell sounds
    this.presets = {
      // Classic tubular bell
      classic: {
        harmonicity: 3.5,
        modulationIndex: 10,
        attack: 0.001,
        decay: 0.3,
        sustain: 0.3,
        release: 1.5,
        brightness: 0.8,
        volume: 0.5
      },

      // Bright metallic bell
      bright: {
        harmonicity: 4.2,
        modulationIndex: 15,
        attack: 0.001,
        decay: 0.2,
        sustain: 0.2,
        release: 2.0,
        brightness: 1.2,
        volume: 0.6
      },

      // Soft chime
      soft: {
        harmonicity: 2.5,
        modulationIndex: 6,
        attack: 0.005,
        decay: 0.4,
        sustain: 0.4,
        release: 1.0,
        brightness: 0.6,
        volume: 0.4
      },

      // Glass/crystal
      glass: {
        harmonicity: 5.1,
        modulationIndex: 20,
        attack: 0.001,
        decay: 0.15,
        sustain: 0.1,
        release: 0.8,
        brightness: 1.5,
        volume: 0.5
      },

      // Gong-like
      gong: {
        harmonicity: 1.414, // √2 for inharmonic sound
        modulationIndex: 25,
        attack: 0.01,
        decay: 0.5,
        sustain: 0.6,
        release: 3.0,
        brightness: 0.4,
        volume: 0.7
      }
    };

    this.defaultParams = this.presets.classic;
    this.currentPreset = 'classic';
  }

  /**
   * Play a bell note
   */
  play(note, params = {}) {
    // Parse note (supports note names, MIDI, Hz offsets, cents, etc.)
    const frequency = typeof note === 'number' ? note : parseNote(note);

    const bellParams = {
      ...this.defaultParams,
      ...params,
      frequency
    };

    const voice = new BellVoice(this.engine, bellParams);
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
   * Set preset
   */
  setPreset(presetName) {
    if (!this.presets[presetName]) {
      console.warn(`[bells] Unknown preset: ${presetName}`);
      return;
    }

    this.currentPreset = presetName;
    this.defaultParams = this.presets[presetName];
    console.log(`[bells] Preset set to: ${presetName}`);
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

  /**
   * List available presets
   */
  listPresets() {
    return Object.keys(this.presets);
  }
}
