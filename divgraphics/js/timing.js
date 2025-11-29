/**
 * DivGraphics - Timing Module
 * PPS-based timing system for pulse-synchronized animation
 * PPS = Pulses Per Second (1 pps = 60 BPM, 2 pps = 120 BPM)
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.Timing = {
        _pulseAccumulator: 0,
        _pulseCount: 0,

        init() {
            // Subscribe to PPS changes for any future needs
            APP.State?.subscribe('animation.pps', () => {
                // PPS changed - accumulator continues from current phase
            });
        },

        /**
         * Called from camera.js animation loop
         * @param {number} deltaMs - Time since last frame in milliseconds
         * @returns {object} Current timing state
         */
        tick(deltaMs) {
            const playing = APP.State?.select('animation.playing');
            if (!playing) {
                return { phase: this._pulseAccumulator, pps: 0, pulse: this._pulseCount };
            }

            const pps = APP.State?.select('animation.pps') || 1.0;
            const pulsesPerMs = pps / 1000;
            this._pulseAccumulator += deltaMs * pulsesPerMs;

            // Fire pulse callback when crossing integer boundary
            while (this._pulseAccumulator >= 1.0) {
                this._pulseAccumulator -= 1.0;
                this._pulseCount++;
                this._onPulse(this._pulseCount);
            }

            return { phase: this._pulseAccumulator, pps, pulse: this._pulseCount };
        },

        /**
         * Extension point for future pulse-triggered events
         * @param {number} pulseNum - Current pulse number
         */
        _onPulse(pulseNum) {
            // Future: fire triggers here
            // APP.Triggers?.firePulse(pulseNum);
        },

        /**
         * Get rotation rate in degrees per millisecond
         * Based on current PPS and RPB (revolutions per pulse)
         * @returns {number} Degrees per millisecond
         */
        getRotationRate() {
            const pps = APP.State?.select('animation.pps') || 1.0;
            const rpb = APP.State?.select('animation.rpb') || 0.00625;
            // deg/ms = (rev/pulse) * (360 deg/rev) * (pulse/ms)
            // pulse/ms = pps / 1000
            return rpb * 360 * (pps / 1000);
        },

        /**
         * Get current pulse phase (0-1 within current pulse)
         * @returns {number} Phase within current pulse
         */
        getPhase() {
            return this._pulseAccumulator;
        },

        /**
         * Get total pulse count since play started
         * @returns {number} Pulse count
         */
        getPulseCount() {
            return this._pulseCount;
        },

        /**
         * Convert PPS to BPM
         * @param {number} pps - Pulses per second
         * @returns {number} Beats per minute
         */
        ppsToBpm(pps) {
            return pps * 60;
        },

        /**
         * Convert BPM to PPS
         * @param {number} bpm - Beats per minute
         * @returns {number} Pulses per second
         */
        bpmToPps(bpm) {
            return bpm / 60;
        },

        /**
         * Reset timing state (called on stop)
         */
        reset() {
            this._pulseAccumulator = 0;
            this._pulseCount = 0;
        }
    };

})(window.APP);
