/**
 * DivGraphics - PerlinSource Module
 * Perlin noise-based waypoint variation for smooth organic track paths
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * PerlinSource - Generates smooth, organic track variations using Perlin-like noise
     */
    class PerlinSource {
        constructor(options = {}) {
            this.intensity = options.intensity ?? 1.0;
            this.scale = options.scale ?? 0.05;      // Noise frequency
            this.seed = options.seed ?? Math.random() * 10000;

            // Amplitude per axis
            this.amplitudeX = options.amplitudeX ?? 80;
            this.amplitudeY = options.amplitudeY ?? 40;

            // Pre-generate permutation table for noise
            this._perm = this._generatePermutation();
        }

        /**
         * Generate permutation table for noise
         * @private
         */
        _generatePermutation() {
            const p = [];
            for (let i = 0; i < 256; i++) p[i] = i;

            // Fisher-Yates shuffle with seed
            let seed = this.seed;
            for (let i = 255; i > 0; i--) {
                seed = (seed * 16807) % 2147483647;
                const j = seed % (i + 1);
                [p[i], p[j]] = [p[j], p[i]];
            }

            // Duplicate for wrapping
            return [...p, ...p];
        }

        /**
         * Fade function for smooth interpolation
         * @private
         */
        _fade(t) {
            return t * t * t * (t * (t * 6 - 15) + 10);
        }

        /**
         * Linear interpolation
         * @private
         */
        _lerp(t, a, b) {
            return a + t * (b - a);
        }

        /**
         * Gradient function
         * @private
         */
        _grad(hash, x) {
            return (hash & 1) === 0 ? x : -x;
        }

        /**
         * 1D Perlin noise
         * @private
         */
        _noise1D(x) {
            const X = Math.floor(x) & 255;
            x -= Math.floor(x);

            const u = this._fade(x);

            return this._lerp(u,
                this._grad(this._perm[X], x),
                this._grad(this._perm[X + 1], x - 1)
            );
        }

        /**
         * Get variation for a waypoint
         * @param {number} index - Waypoint index
         * @param {Object} prevPos - Previous waypoint position
         * @returns {{x: number, y: number, z: number}}
         */
        getVariation(index, prevPos) {
            const t = index * this.scale;

            // Use different offsets for X and Y to get independent variation
            const noiseX = this._noise1D(t + this.seed);
            const noiseY = this._noise1D(t + this.seed + 100);

            return {
                x: noiseX * this.amplitudeX * this.intensity,
                y: noiseY * this.amplitudeY * this.intensity,
                z: 0  // Forward progression handled by WaypointManager
            };
        }

        /**
         * Reset with new seed
         */
        reseed(seed) {
            this.seed = seed ?? Math.random() * 10000;
            this._perm = this._generatePermutation();
        }
    }

    APP.PerlinSource = PerlinSource;

})(window.APP);
