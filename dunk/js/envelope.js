/**
 * Dunk - Envelope Module
 * 808-style pitch and amplitude envelopes
 */

NS.Envelope = {
  /**
   * Create pitch envelope for 808-style kick
   * Classic 808: 130Hz → 50Hz in ~6ms (exponential)
   *
   * @param {AudioParam} param - Frequency AudioParam to control
   * @param {number} startTime - Start time in audio context seconds
   * @param {object} options - Envelope options
   */
  pitchEnvelope(param, startTime, options = {}) {
    const {
      pitchStart = NS.CONSTANTS.PITCH_START,
      pitchEnd = NS.CONSTANTS.PITCH_END,
      pitchTime = NS.CONSTANTS.PITCH_TIME,
      pitchDrift = 0
    } = options;

    // Apply pitch drift (in cents)
    const driftMultiplier = Math.pow(2, pitchDrift / 1200);
    const adjustedEnd = pitchEnd * driftMultiplier;

    // Set start frequency
    param.setValueAtTime(pitchStart, startTime);

    // Exponential ramp to end frequency
    param.exponentialRampToValueAtTime(
      Math.max(adjustedEnd, 0.01), // Prevent zero/negative
      startTime + pitchTime
    );
  },

  /**
   * Create amplitude envelope
   * Fast attack, variable decay with shape control
   *
   * @param {GainNode} gainNode - GainNode to control
   * @param {number} startTime - Start time
   * @param {object} options - Envelope options
   */
  amplitudeEnvelope(gainNode, startTime, options = {}) {
    const {
      attack = 0.002,       // 2ms attack
      decay = 200,          // Base decay in ms
      decayFine = 0.5,      // 0=linear, 0.5=exp, 1=log
      decayExtend = 0,      // Additional decay time
      velocity = 1.0,       // Trigger velocity
      sustainLevel = 0      // Sustain level (0 for 808)
    } = options;

    const totalDecay = (decay + decayExtend) / 1000; // Convert to seconds
    const peak = velocity;
    const param = gainNode.gain;

    // Clear any scheduled values
    param.cancelScheduledValues(startTime);

    // Attack phase
    param.setValueAtTime(0, startTime);
    param.linearRampToValueAtTime(peak, startTime + attack);

    // Decay phase with shape control
    const decayEnd = startTime + attack + totalDecay;

    if (decayFine <= 0.33) {
      // Linear decay
      param.linearRampToValueAtTime(sustainLevel + 0.001, decayEnd);
    } else if (decayFine <= 0.66) {
      // Exponential decay (classic 808)
      param.exponentialRampToValueAtTime(sustainLevel + 0.001, decayEnd);
    } else {
      // Logarithmic-ish decay (longer tail)
      // Achieved by using setTargetAtTime with longer time constant
      const timeConstant = totalDecay / 3;
      param.setTargetAtTime(sustainLevel + 0.001, startTime + attack, timeConstant);
    }

    // Final cutoff
    param.setValueAtTime(0, decayEnd + 0.01);
  },

  /**
   * Create click/transient envelope
   * Very fast attack and decay for initial transient
   *
   * @param {GainNode} gainNode - GainNode to control
   * @param {number} startTime - Start time
   * @param {object} options - Envelope options
   */
  clickEnvelope(gainNode, startTime, options = {}) {
    const {
      clickIntensity = 0.5,
      clickDuration = 0.004  // 4ms
    } = options;

    const param = gainNode.gain;

    param.cancelScheduledValues(startTime);
    param.setValueAtTime(0, startTime);

    // Very fast attack
    param.linearRampToValueAtTime(clickIntensity, startTime + 0.0005);

    // Fast exponential decay
    param.exponentialRampToValueAtTime(0.001, startTime + clickDuration);
    param.setValueAtTime(0, startTime + clickDuration + 0.001);
  },

  /**
   * Create sub-harmonic envelope
   * Slower attack, longer decay than main
   *
   * @param {GainNode} gainNode - GainNode to control
   * @param {number} startTime - Start time
   * @param {object} options - Envelope options
   */
  subHarmonicEnvelope(gainNode, startTime, options = {}) {
    const {
      subMix = 0.3,
      decay = 200,
      decayExtend = 0
    } = options;

    const totalDecay = (decay + decayExtend) / 1000 * 1.5; // 50% longer than main
    const param = gainNode.gain;

    param.cancelScheduledValues(startTime);
    param.setValueAtTime(0, startTime);

    // Slower attack for sub
    param.linearRampToValueAtTime(subMix, startTime + 0.008);

    // Long decay
    param.exponentialRampToValueAtTime(0.001, startTime + 0.008 + totalDecay);
    param.setValueAtTime(0, startTime + 0.008 + totalDecay + 0.01);
  },

  /**
   * Create formant/vowel envelope
   * Smooth attack, medium decay
   */
  formantEnvelope(gainNode, startTime, options = {}) {
    const {
      level = 0.2,
      decay = 200,
      decayExtend = 0
    } = options;

    const totalDecay = (decay + decayExtend) / 1000 * 0.8;
    const param = gainNode.gain;

    param.cancelScheduledValues(startTime);
    param.setValueAtTime(0, startTime);

    // Medium attack
    param.linearRampToValueAtTime(level, startTime + 0.005);

    // Decay
    param.exponentialRampToValueAtTime(0.001, startTime + 0.005 + totalDecay);
    param.setValueAtTime(0, startTime + 0.005 + totalDecay + 0.01);
  },

  /**
   * Create noise burst envelope
   * Very short burst for attack transient
   */
  noiseEnvelope(gainNode, startTime, options = {}) {
    const {
      level = 0.15,
      duration = 0.02  // 20ms burst
    } = options;

    const param = gainNode.gain;

    param.cancelScheduledValues(startTime);
    param.setValueAtTime(0, startTime);

    // Instant attack
    param.linearRampToValueAtTime(level, startTime + 0.001);

    // Quick decay
    param.exponentialRampToValueAtTime(0.001, startTime + duration);
    param.setValueAtTime(0, startTime + duration + 0.001);
  },

  /**
   * Create Reese bass envelope
   * Longer sustain for wobble bass
   */
  reeseEnvelope(gainNode, startTime, options = {}) {
    const {
      level = 0.25,
      decay = 200,
      decayExtend = 0,
      decayFine = 0.5
    } = options;

    const totalDecay = (decay + decayExtend) / 1000 * 2; // Double duration for Reese
    const param = gainNode.gain;

    param.cancelScheduledValues(startTime);
    param.setValueAtTime(0, startTime);

    // Smooth attack
    param.linearRampToValueAtTime(level, startTime + 0.01);

    // Very long decay
    if (decayFine > 0.66) {
      // Long tail
      param.setTargetAtTime(0.001, startTime + 0.01, totalDecay / 2);
    } else {
      param.exponentialRampToValueAtTime(0.001, startTime + 0.01 + totalDecay);
    }
  },

  /**
   * Apply envelope to AudioParam with custom shape
   * Utility for creating arbitrary envelopes
   *
   * @param {AudioParam} param - Parameter to control
   * @param {number} startTime - Start time
   * @param {Array} points - Array of {time, value, curve} objects
   */
  custom(param, startTime, points) {
    param.cancelScheduledValues(startTime);

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const time = startTime + point.time;
      const value = Math.max(point.value, 0.0001);

      if (i === 0 || point.curve === 'instant') {
        param.setValueAtTime(value, time);
      } else if (point.curve === 'linear') {
        param.linearRampToValueAtTime(value, time);
      } else if (point.curve === 'exponential') {
        param.exponentialRampToValueAtTime(value, time);
      } else if (point.curve === 'target') {
        const timeConstant = point.timeConstant || 0.1;
        param.setTargetAtTime(value, time, timeConstant);
      }
    }
  }
};

console.log('[Dunk] Envelope module loaded');
