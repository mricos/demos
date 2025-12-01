/**
 * ADSR - Generic Attack-Decay-Sustain-Release envelope generator
 * Can be applied to any audio parameter (gain, filter freq, etc.)
 *
 * Usage:
 *   const env = APP.ADSR.create({ attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.5 });
 *   env.trigger(audioParam, peakValue, sustainValue);  // Start envelope
 *   env.release(audioParam, releaseToValue);           // Begin release phase
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.ADSR = {
        /**
         * Create a new ADSR envelope instance
         * @param {Object} config
         * @param {number} config.attack  - Attack time in seconds (0.001 - 10)
         * @param {number} config.decay   - Decay time in seconds (0.001 - 10)
         * @param {number} config.sustain - Sustain level (0 - 1, multiplier of peak)
         * @param {number} config.release - Release time in seconds (0.001 - 10)
         * @returns {Object} ADSR envelope instance
         */
        create(config = {}) {
            return {
                attack: Math.max(0.001, config.attack ?? 0.1),
                decay: Math.max(0.001, config.decay ?? 0.2),
                sustain: Math.max(0, Math.min(1, config.sustain ?? 0.7)),
                release: Math.max(0.001, config.release ?? 0.5),

                _triggered: false,
                _releaseStartTime: 0,
                _releaseStartValue: 0,

                /**
                 * Trigger the envelope (Attack -> Decay -> Sustain)
                 * @param {AudioParam} param - The audio parameter to modulate
                 * @param {number} peakValue - Value at end of attack phase
                 * @param {number} startValue - Starting value (default 0)
                 * @param {AudioContext} ctx - Audio context for timing
                 */
                trigger(param, peakValue, startValue = 0, ctx) {
                    if (!param || !ctx) return;

                    const now = ctx.currentTime;
                    const sustainValue = startValue + (peakValue - startValue) * this.sustain;

                    // Cancel any scheduled changes
                    param.cancelScheduledValues(now);

                    // Start from current/start value
                    param.setValueAtTime(startValue, now);

                    // Attack: ramp to peak
                    param.linearRampToValueAtTime(peakValue, now + this.attack);

                    // Decay: ramp to sustain level
                    param.linearRampToValueAtTime(sustainValue, now + this.attack + this.decay);

                    this._triggered = true;
                    this._releaseStartValue = sustainValue;
                },

                /**
                 * Trigger with exponential curves (more natural for audio)
                 * @param {AudioParam} param - The audio parameter to modulate
                 * @param {number} peakValue - Value at end of attack phase
                 * @param {number} startValue - Starting value (must be > 0 for exponential)
                 * @param {AudioContext} ctx - Audio context for timing
                 */
                triggerExp(param, peakValue, startValue = 0.001, ctx) {
                    if (!param || !ctx) return;

                    const now = ctx.currentTime;
                    // Ensure positive values for exponential ramp
                    startValue = Math.max(0.001, startValue);
                    peakValue = Math.max(0.001, peakValue);
                    const sustainValue = Math.max(0.001, startValue + (peakValue - startValue) * this.sustain);

                    param.cancelScheduledValues(now);
                    param.setValueAtTime(startValue, now);
                    param.exponentialRampToValueAtTime(peakValue, now + this.attack);
                    param.exponentialRampToValueAtTime(sustainValue, now + this.attack + this.decay);

                    this._triggered = true;
                    this._releaseStartValue = sustainValue;
                },

                /**
                 * Begin release phase
                 * @param {AudioParam} param - The audio parameter to modulate
                 * @param {number} endValue - Final value after release (default 0)
                 * @param {AudioContext} ctx - Audio context for timing
                 */
                release(param, endValue = 0, ctx) {
                    if (!param || !ctx) return;

                    const now = ctx.currentTime;

                    param.cancelScheduledValues(now);
                    param.setValueAtTime(param.value, now);
                    param.linearRampToValueAtTime(endValue, now + this.release);

                    this._triggered = false;
                },

                /**
                 * Release with exponential curve
                 * @param {AudioParam} param - The audio parameter to modulate
                 * @param {number} endValue - Final value after release (must be > 0)
                 * @param {AudioContext} ctx - Audio context for timing
                 */
                releaseExp(param, endValue = 0.001, ctx) {
                    if (!param || !ctx) return;

                    const now = ctx.currentTime;
                    endValue = Math.max(0.001, endValue);

                    param.cancelScheduledValues(now);
                    param.setValueAtTime(Math.max(0.001, param.value), now);
                    param.exponentialRampToValueAtTime(endValue, now + this.release);

                    this._triggered = false;
                },

                /**
                 * Immediate stop (no release)
                 * @param {AudioParam} param
                 * @param {number} value - Value to set immediately
                 * @param {AudioContext} ctx
                 */
                stop(param, value = 0, ctx) {
                    if (!param || !ctx) return;

                    const now = ctx.currentTime;
                    param.cancelScheduledValues(now);
                    param.setValueAtTime(value, now);
                    this._triggered = false;
                },

                /**
                 * Update envelope parameters
                 * @param {Object} params - { attack, decay, sustain, release }
                 */
                setParams(params) {
                    if (params.attack !== undefined) this.attack = Math.max(0.001, params.attack);
                    if (params.decay !== undefined) this.decay = Math.max(0.001, params.decay);
                    if (params.sustain !== undefined) this.sustain = Math.max(0, Math.min(1, params.sustain));
                    if (params.release !== undefined) this.release = Math.max(0.001, params.release);
                },

                /**
                 * Check if envelope is currently triggered
                 */
                isTriggered() {
                    return this._triggered;
                }
            };
        },

        /**
         * Apply ADSR using setTargetAtTime for smoother curves
         * This is a stateless helper for one-shot envelopes
         * @param {AudioParam} param
         * @param {Object} env - { attack, decay, sustain, release }
         * @param {number} peakValue
         * @param {number} startValue
         * @param {AudioContext} ctx
         */
        applyEnvelope(param, env, peakValue, startValue, ctx) {
            if (!param || !ctx) return;

            const now = ctx.currentTime;
            const sustainValue = startValue + (peakValue - startValue) * (env.sustain ?? 0.7);

            // Using setTargetAtTime for RC-style curves (more analog feel)
            // Time constant is roughly time/3 to reach ~95% of target
            const attackTC = (env.attack ?? 0.1) / 3;
            const decayTC = (env.decay ?? 0.2) / 3;

            param.cancelScheduledValues(now);
            param.setValueAtTime(startValue, now);
            param.setTargetAtTime(peakValue, now, attackTC);
            param.setTargetAtTime(sustainValue, now + (env.attack ?? 0.1), decayTC);
        },

        /**
         * Static trigger - fade in with attack time
         * @param {AudioParam} param - The audio parameter to modulate
         * @param {number} targetValue - Target value to reach
         * @param {number} attackTime - Attack time in seconds
         * @param {AudioContext} ctx - Audio context for timing
         */
        trigger(param, targetValue, attackTime = 0.1, ctx) {
            if (!param || !ctx) return;

            const now = ctx.currentTime;
            attackTime = Math.max(0.001, attackTime);

            param.cancelScheduledValues(now);
            param.setValueAtTime(Math.max(0.001, param.value), now);
            param.exponentialRampToValueAtTime(Math.max(0.001, targetValue), now + attackTime);
        },

        /**
         * Static release - fade out with release time
         * @param {AudioParam} param - The audio parameter to modulate
         * @param {number} releaseTime - Release time in seconds
         * @param {AudioContext} ctx - Audio context for timing
         */
        release(param, releaseTime = 0.5, ctx) {
            if (!param || !ctx) return;

            const now = ctx.currentTime;
            releaseTime = Math.max(0.001, releaseTime);

            param.cancelScheduledValues(now);
            param.setValueAtTime(Math.max(0.001, param.value), now);
            param.exponentialRampToValueAtTime(0.001, now + releaseTime);

            // Schedule hard zero after release
            param.setValueAtTime(0, now + releaseTime + 0.01);
        }
    };

})(window.APP);
