/**
 * DivGraphics - RandomSource Module
 * Random waypoint variation for unpredictable track paths
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * RandomSource - Generates random track variations
     * Less smooth than Perlin but more chaotic
     */
    class RandomSource {
        constructor(options = {}) {
            this.intensity = options.intensity ?? 1.0;

            // Amplitude per axis
            this.amplitudeX = options.amplitudeX ?? 100;
            this.amplitudeY = options.amplitudeY ?? 60;

            // Smoothing (0 = fully random, 1 = heavily smoothed)
            this.smoothing = options.smoothing ?? 0.5;

            // Track last values for smoothing
            this._lastX = 0;
            this._lastY = 0;
        }

        /**
         * Get variation for a waypoint
         * @param {number} index - Waypoint index
         * @param {Object} prevPos - Previous waypoint position
         * @returns {{x: number, y: number, z: number}}
         */
        getVariation(index, prevPos) {
            // Generate random target
            const targetX = (Math.random() - 0.5) * this.amplitudeX * this.intensity * 2;
            const targetY = (Math.random() - 0.5) * this.amplitudeY * this.intensity * 2;

            // Smooth toward target
            this._lastX += (targetX - this._lastX) * (1 - this.smoothing);
            this._lastY += (targetY - this._lastY) * (1 - this.smoothing);

            return {
                x: this._lastX,
                y: this._lastY,
                z: 0  // Forward progression handled by WaypointManager
            };
        }

        /**
         * Reset internal state
         */
        reset() {
            this._lastX = 0;
            this._lastY = 0;
        }
    }

    APP.RandomSource = RandomSource;

})(window.APP);
