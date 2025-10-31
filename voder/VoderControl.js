// VoderControl.js
// API wrapper for programmatic control of the Voder speech synthesizer

class VoderControl {
  constructor() {
    this.ctx = null;
    this.sourceOsc = null;
    this.noiseSource = null;
    this.masterGain = null;
    this.filterNodes = [];
    this.isRunning = false;
    this.isVoiced = true;
    this.currentPitch = 120;
    this.listeners = {};

    this.FREQUENCIES = [200, 350, 500, 700, 900, 1100, 1300, 1600, 2000, 2600];
  }

  // Initialize the audio system
  async init() {
    if (this.isRunning) return;

    this.ctx = new AudioContext();

    // Create sawtooth oscillator for voiced sounds
    this.sourceOsc = this.ctx.createOscillator();
    this.sourceOsc.type = 'sawtooth';
    this.sourceOsc.frequency.value = this.currentPitch;

    // Create noise source for unvoiced sounds
    this.noiseSource = this._createNoise();

    // Master output gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);

    // Create bandpass filter bank
    this.FREQUENCIES.forEach((freq, i) => {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = 10;

      const filterGain = this.ctx.createGain();
      filterGain.gain.value = 0;

      // Connect both sources through each filter
      this.sourceOsc.connect(filter);
      this.noiseSource.connect(filter);
      filter.connect(filterGain);
      filterGain.connect(this.masterGain);

      this.filterNodes.push({ filter, gain: filterGain });
    });

    this.sourceOsc.start();
    this.noiseSource.start();
    this.isRunning = true;

    this.emit('initialized');
  }

  // Create white noise buffer
  _createNoise() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  // Set which filters are active with specified gains
  setFilters(indices, gains = null) {
    if (!this.isRunning) return;

    // Clear all filters first
    this.filterNodes.forEach(({ gain }) => {
      gain.gain.value = 0;
    });

    // Activate specified filters
    indices.forEach((index, i) => {
      if (index >= 0 && index < this.filterNodes.length) {
        const gainValue = gains ? (gains[i] || 1.0) : 1.0;
        this.filterNodes[index].gain.gain.value = gainValue;
      }
    });

    this.emit('filtersChanged', { indices, gains });
  }

  // Clear all filters
  clearFilters() {
    this.setFilters([]);
  }

  // Set voiced (true) or unvoiced (false) mode
  setVoicing(voiced) {
    if (!this.isRunning) return;

    this.isVoiced = voiced;

    if (voiced) {
      this.sourceOsc.frequency.value = this.currentPitch;
    } else {
      this.sourceOsc.frequency.value = 0; // Silence oscillator
    }

    this.emit('voicingChanged', { voiced });
  }

  // Set pitch in Hz
  setPitch(hz) {
    if (!this.isRunning) return;

    this.currentPitch = hz;

    if (this.isVoiced) {
      this.sourceOsc.frequency.value = hz;
    }

    this.emit('pitchChanged', { pitch: hz });
  }

  // Play a single phoneme
  async playPhoneme({ ipa, filters, gains, voiced, pitch, duration = 100 }) {
    if (!this.isRunning) await this.init();

    // Set voicing
    this.setVoicing(voiced);

    // Set pitch if specified
    if (pitch) {
      this.setPitch(pitch);
    }

    // Activate filters
    this.setFilters(filters, gains);

    this.emit('phonemeStart', { ipa, filters, gains, voiced, pitch, duration });

    // Clear filters after duration
    return new Promise(resolve => {
      setTimeout(() => {
        this.clearFilters();
        this.emit('phonemeEnd', { ipa });
        resolve();
      }, duration);
    });
  }

  // Play a sequence of phonemes
  async playSequence(phonemes, options = {}) {
    if (!this.isRunning) await this.init();

    const {
      transitionDuration = 30, // ms for crossfade between phonemes
      pauseDuration = 50 // ms pause between words
    } = options;

    this.emit('sequenceStart', { phonemes });

    for (let i = 0; i < phonemes.length; i++) {
      const phoneme = phonemes[i];
      const isLastPhoneme = i === phonemes.length - 1;

      // Play phoneme
      await this.playPhoneme(phoneme);

      // Add transition or pause
      if (!isLastPhoneme) {
        const nextPhoneme = phonemes[i + 1];

        // Check if there's a word boundary (you can add a 'boundary' flag to phoneme objects)
        if (phoneme.boundary) {
          await this._delay(pauseDuration);
        } else {
          // Brief overlap for smooth transitions
          await this._delay(transitionDuration);
        }
      }
    }

    this.emit('sequenceEnd');
  }

  // Utility: delay promise
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Event system
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data = {}) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }

  // Get current state
  getState() {
    return {
      isRunning: this.isRunning,
      isVoiced: this.isVoiced,
      currentPitch: this.currentPitch,
      filterStates: this.filterNodes.map(({ gain }) => gain.gain.value)
    };
  }

  // Check if initialized
  isInitialized() {
    return this.isRunning;
  }

  // Set voiced state (alias for setVoicing)
  setVoiced(voiced) {
    this.setVoicing(voiced);
  }

  // Play phoneme with filters, gains, and duration (simplified API)
  async playPhonemeSimple(filters, gains, duration) {
    if (!this.isRunning) await this.init();

    // Activate filters
    this.setFilters(filters, gains);

    // Wait for duration
    await this._delay(duration);

    // Clear filters
    this.clearFilters();
  }
}
