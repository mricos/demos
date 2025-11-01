/**
 * tines.js - Core Audio Engine
 * Multi-timbral Web Audio engine with independent BPM clock
 */

export class TinesEngine {
  constructor(config = {}) {
    this.config = {
      masterVolume: config.masterVolume || 0.7,
      maxVoices: config.maxVoices || 16,
      ...config
    };

    this.audioContext = null;
    this.masterGain = null;
    this.channels = {}; // Multi-timbral routing
    this.activeVoices = new Map();
    this.initialized = false;
  }

  /**
   * Initialize Web Audio context and routing
   */
  async init() {
    if (this.initialized) {
      console.warn('[tines] Already initialized');
      return;
    }

    try {
      // Create AudioContext (handle vendor prefixes)
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();

      // Create master gain node
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.config.masterVolume;
      this.masterGain.connect(this.audioContext.destination);

      // Create multi-timbral channels (4 main + effects bus)
      this.channels = {
        drone: this.createChannel('drone'),
        synth: this.createChannel('synth'),
        bells: this.createChannel('bells'),
        drums: this.createChannel('drums'),
        fx: this.createChannel('fx') // Effects bus
      };

      this.initialized = true;
      console.log('[tines] Engine initialized', {
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state
      });

      // Resume context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        console.warn('[tines] AudioContext suspended - will auto-resume on first user interaction');
        // Add click listener to resume on any user interaction
        const resumeOnInteraction = async () => {
          if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('[tines] AudioContext resumed!');
          }
          // Remove listeners after first interaction
          document.removeEventListener('click', resumeOnInteraction);
          document.removeEventListener('keydown', resumeOnInteraction);
        };
        document.addEventListener('click', resumeOnInteraction);
        document.addEventListener('keydown', resumeOnInteraction);
      }

      return true;
    } catch (error) {
      console.error('[tines] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a channel with gain control and stereo panning
   */
  createChannel(name) {
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 1.0;

    // Add stereo panner for left/right positioning
    const pannerNode = this.audioContext.createStereoPanner();
    pannerNode.pan.value = 0; // Center by default

    // Connect: panner -> gain -> master
    pannerNode.connect(gainNode);
    gainNode.connect(this.masterGain);

    return {
      name,
      panner: pannerNode, // Stereo panner node
      gain: gainNode,
      pan: 0, // -1 (left) to 1 (right)
      volume: 1.0,
      muted: false,
      voiceCount: 0
    };
  }

  /**
   * Get current audio time
   */
  now() {
    return this.audioContext ? this.audioContext.currentTime : 0;
  }

  /**
   * Set master volume (0.0 - 1.0)
   */
  setMasterVolume(volume) {
    if (!this.masterGain) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.masterGain.gain.setValueAtTime(clampedVolume, this.now());
    this.config.masterVolume = clampedVolume;
  }

  /**
   * Set channel volume (0.0 - 1.0)
   */
  setChannelVolume(channelName, volume) {
    const channel = this.channels[channelName];
    if (!channel) {
      console.warn(`[tines] Channel not found: ${channelName}`);
      return;
    }

    const clampedVolume = Math.max(0, Math.min(1, volume));
    channel.gain.gain.setValueAtTime(clampedVolume, this.now());
    channel.volume = clampedVolume;
  }

  /**
   * Mute/unmute channel
   */
  setChannelMute(channelName, muted) {
    const channel = this.channels[channelName];
    if (!channel) return;

    channel.muted = muted;
    channel.gain.gain.setValueAtTime(muted ? 0 : channel.volume, this.now());
  }

  /**
   * Set channel pan (-1.0 to 1.0, -1 = left, 0 = center, 1 = right)
   */
  setChannelPan(channelName, pan) {
    const channel = this.channels[channelName];
    if (!channel || !channel.panner) {
      console.warn(`[tines] Channel not found: ${channelName}`);
      return;
    }

    const clampedPan = Math.max(-1, Math.min(1, pan));
    channel.panner.pan.setValueAtTime(clampedPan, this.now());
    channel.pan = clampedPan;
  }

  /**
   * Register an active voice
   */
  registerVoice(voiceId, voice) {
    // Voice limiting
    if (this.activeVoices.size >= this.config.maxVoices) {
      // Stop oldest voice
      const oldestVoice = this.activeVoices.values().next().value;
      if (oldestVoice && oldestVoice.stop) {
        oldestVoice.stop();
      }
      this.activeVoices.delete(this.activeVoices.keys().next().value);
    }

    this.activeVoices.set(voiceId, voice);

    // Update channel voice count
    if (voice.channel && this.channels[voice.channel]) {
      this.channels[voice.channel].voiceCount++;
    }
  }

  /**
   * Unregister a voice
   */
  unregisterVoice(voiceId) {
    const voice = this.activeVoices.get(voiceId);
    if (voice) {
      if (voice.channel && this.channels[voice.channel]) {
        this.channels[voice.channel].voiceCount--;
      }
      this.activeVoices.delete(voiceId);
    }
  }

  /**
   * Stop all voices
   */
  stopAll() {
    this.activeVoices.forEach((voice, id) => {
      if (voice.stop) {
        voice.stop();
      }
    });
    this.activeVoices.clear();

    // Reset voice counts
    Object.values(this.channels).forEach(channel => {
      channel.voiceCount = 0;
    });
  }

  /**
   * Stop all voices on a specific channel
   */
  stopChannel(channelName) {
    this.activeVoices.forEach((voice, id) => {
      if (voice.channel === channelName && voice.stop) {
        voice.stop();
        this.unregisterVoice(id);
      }
    });
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      state: this.audioContext?.state || 'not-initialized',
      sampleRate: this.audioContext?.sampleRate || 0,
      masterVolume: this.config.masterVolume,
      activeVoices: this.activeVoices.size,
      maxVoices: this.config.maxVoices,
      channels: Object.entries(this.channels).map(([name, ch]) => ({
        name,
        volume: ch.volume,
        muted: ch.muted,
        voiceCount: ch.voiceCount
      }))
    };
  }

  /**
   * Cleanup and dispose
   */
  async dispose() {
    this.stopAll();

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.initialized = false;
    console.log('[tines] Engine disposed');
  }
}

/**
 * Utility: Convert MIDI note number to frequency
 */
export function midiToFreq(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Utility: Convert note name to MIDI number
 * Examples: C4 -> 60, A4 -> 69, C#5 -> 73
 */
export function noteToMidi(noteName) {
  const noteMap = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11
  };

  const match = noteName.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) {
    console.warn(`[tines] Invalid note name: ${noteName}`);
    return 60; // Default to C4
  }

  const [, note, octave] = match;
  const midiNote = (parseInt(octave) + 1) * 12 + noteMap[note];
  return midiNote;
}

/**
 * Utility: Convert note name to frequency
 */
export function noteToFreq(noteName) {
  return midiToFreq(noteToMidi(noteName));
}
