/**
 * Tines Delay System
 *
 * Sample-accurate delay lines for per-channel delay
 * Supports independent delay on each channel with sample-level precision
 */

export class DelayLine {
  constructor(audioContext, maxDelaySamples = 48000) {
    this.audioContext = audioContext;
    this.maxDelaySamples = maxDelaySamples;
    this.maxDelayTime = maxDelaySamples / audioContext.sampleRate;

    // Create delay node
    this.delayNode = audioContext.createDelay(this.maxDelayTime);
    this.delayNode.delayTime.value = 0;

    // Current delay in samples
    this.delaySamples = 0;
  }

  /**
   * Set delay in samples
   */
  setDelaySamples(samples) {
    this.delaySamples = Math.max(0, Math.min(this.maxDelaySamples, samples));
    const delayTime = this.delaySamples / this.audioContext.sampleRate;
    this.delayNode.delayTime.value = delayTime;
  }

  /**
   * Set delay in milliseconds
   */
  setDelayMs(ms) {
    const samples = Math.round((ms / 1000) * this.audioContext.sampleRate);
    this.setDelaySamples(samples);
  }

  /**
   * Set delay in seconds
   */
  setDelaySeconds(seconds) {
    const samples = Math.round(seconds * this.audioContext.sampleRate);
    this.setDelaySamples(samples);
  }

  /**
   * Get current delay in samples
   */
  getDelaySamples() {
    return this.delaySamples;
  }

  /**
   * Get current delay in milliseconds
   */
  getDelayMs() {
    return (this.delaySamples / this.audioContext.sampleRate) * 1000;
  }

  /**
   * Get current delay in seconds
   */
  getDelaySeconds() {
    return this.delaySamples / this.audioContext.sampleRate;
  }

  /**
   * Get the delay node for audio routing
   */
  getNode() {
    return this.delayNode;
  }

  /**
   * Connect input to delay
   */
  connect(destination) {
    this.delayNode.connect(destination);
  }

  /**
   * Disconnect delay
   */
  disconnect() {
    this.delayNode.disconnect();
  }
}

/**
 * Per-Channel Delay Manager
 * Manages delay lines for multiple channels
 */
export class ChannelDelayManager {
  constructor(audioContext, maxDelaySamples = 48000) {
    this.audioContext = audioContext;
    this.maxDelaySamples = maxDelaySamples;
    this.channelDelays = new Map();
  }

  /**
   * Get or create delay line for channel
   */
  getChannelDelay(channelName) {
    if (!this.channelDelays.has(channelName)) {
      this.channelDelays.set(
        channelName,
        new DelayLine(this.audioContext, this.maxDelaySamples)
      );
    }
    return this.channelDelays.get(channelName);
  }

  /**
   * Set delay in samples for channel
   */
  setChannelDelaySamples(channelName, samples) {
    const delay = this.getChannelDelay(channelName);
    delay.setDelaySamples(samples);
  }

  /**
   * Set delay in milliseconds for channel
   */
  setChannelDelayMs(channelName, ms) {
    const delay = this.getChannelDelay(channelName);
    delay.setDelayMs(ms);
  }

  /**
   * Set delay in seconds for channel
   */
  setChannelDelaySeconds(channelName, seconds) {
    const delay = this.getChannelDelay(channelName);
    delay.setDelaySeconds(seconds);
  }

  /**
   * Get channel delay in samples
   */
  getChannelDelaySamples(channelName) {
    const delay = this.getChannelDelay(channelName);
    return delay.getDelaySamples();
  }

  /**
   * Get channel delay in milliseconds
   */
  getChannelDelayMs(channelName) {
    const delay = this.getChannelDelay(channelName);
    return delay.getDelayMs();
  }

  /**
   * Get channel delay in seconds
   */
  getChannelDelaySeconds(channelName) {
    const delay = this.getChannelDelay(channelName);
    return delay.getDelaySeconds();
  }

  /**
   * Get delay node for channel
   */
  getChannelDelayNode(channelName) {
    const delay = this.getChannelDelay(channelName);
    return delay.getNode();
  }

  /**
   * Remove delay from channel (set to 0)
   */
  removeChannelDelay(channelName) {
    const delay = this.channelDelays.get(channelName);
    if (delay) {
      delay.setDelaySamples(0);
    }
  }

  /**
   * Clear all delays
   */
  clearAllDelays() {
    for (const [channelName, delay] of this.channelDelays) {
      delay.setDelaySamples(0);
    }
  }

  /**
   * Get all channel delays (for status display)
   */
  getAllChannelDelays() {
    const delays = {};
    for (const [channelName, delay] of this.channelDelays) {
      const samples = delay.getDelaySamples();
      if (samples > 0) {
        delays[channelName] = {
          samples,
          ms: delay.getDelayMs(),
          seconds: delay.getDelaySeconds()
        };
      }
    }
    return delays;
  }
}

/**
 * Rhythmic Delay Utilities
 * Helper functions for musical/rhythmic delays based on BPM
 */
export class RhythmicDelay {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.bpm = 120;
  }

  /**
   * Set BPM
   */
  setBPM(bpm) {
    this.bpm = bpm;
  }

  /**
   * Get delay time for a note division
   * @param {string} division - Note division: '1/4', '1/8', '1/16', '1/32', 'dotted-1/8', 'triplet-1/8', etc.
   * @returns {number} - Delay time in seconds
   */
  getDelayTime(division) {
    const beatDuration = 60 / this.bpm; // Quarter note duration in seconds

    const divisions = {
      // Straight notes
      '1/1': 4,     // Whole note
      '1/2': 2,     // Half note
      '1/4': 1,     // Quarter note
      '1/8': 0.5,   // Eighth note
      '1/16': 0.25, // Sixteenth note
      '1/32': 0.125, // Thirty-second note

      // Dotted notes (1.5x)
      'dotted-1/2': 3,
      'dotted-1/4': 1.5,
      'dotted-1/8': 0.75,
      'dotted-1/16': 0.375,

      // Triplets (2/3x)
      'triplet-1/4': 2/3,
      'triplet-1/8': 1/3,
      'triplet-1/16': 1/6
    };

    const multiplier = divisions[division] || 1;
    return beatDuration * multiplier;
  }

  /**
   * Get delay in samples for a note division
   */
  getDelaySamples(division) {
    const delayTime = this.getDelayTime(division);
    return Math.round(delayTime * this.audioContext.sampleRate);
  }

  /**
   * Set delay on a DelayLine using musical division
   */
  setMusicalDelay(delayLine, division) {
    const samples = this.getDelaySamples(division);
    delayLine.setDelaySamples(samples);
  }
}
