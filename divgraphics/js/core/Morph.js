/**
 * DivGraphics - Morph Utilities
 * Generic lerp and morphing helpers for smooth transitions
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    const Morph = {
        /**
         * Linear interpolation between two values
         * @param {number} a - Start value
         * @param {number} b - End value
         * @param {number} t - Interpolation factor (0-1)
         * @returns {number}
         */
        lerp(a, b, t) {
            return a + (b - a) * t;
        },

        /**
         * Inverse lerp - find t given a value between a and b
         * @param {number} a - Start value
         * @param {number} b - End value
         * @param {number} value - The value to find t for
         * @returns {number} t value (0-1, unclamped)
         */
        inverseLerp(a, b, value) {
            if (a === b) return 0;
            return (value - a) / (b - a);
        },

        /**
         * Remap a value from one range to another
         * @param {number} value - Input value
         * @param {number} inMin - Input range min
         * @param {number} inMax - Input range max
         * @param {number} outMin - Output range min
         * @param {number} outMax - Output range max
         * @returns {number}
         */
        remap(value, inMin, inMax, outMin, outMax) {
            const t = this.inverseLerp(inMin, inMax, value);
            return this.lerp(outMin, outMax, t);
        },

        /**
         * Clamp a value between min and max
         * @param {number} value
         * @param {number} min
         * @param {number} max
         * @returns {number}
         */
        clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        },

        /**
         * Clamp01 - clamp between 0 and 1
         * @param {number} value
         * @returns {number}
         */
        clamp01(value) {
            return this.clamp(value, 0, 1);
        },

        /**
         * Lerp between two 3D points
         * @param {Object} a - {x, y, z}
         * @param {Object} b - {x, y, z}
         * @param {number} t - Interpolation factor
         * @returns {Object} {x, y, z}
         */
        lerpVec3(a, b, t) {
            return {
                x: this.lerp(a.x, b.x, t),
                y: this.lerp(a.y, b.y, t),
                z: this.lerp(a.z, b.z, t)
            };
        },

        /**
         * Lerp angles (handles wrap-around)
         * @param {number} a - Start angle in degrees
         * @param {number} b - End angle in degrees
         * @param {number} t - Interpolation factor
         * @returns {number} Angle in degrees
         */
        lerpAngle(a, b, t) {
            let diff = b - a;
            // Normalize to -180 to 180
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;
            return a + diff * t;
        },

        /**
         * Smooth step - ease in/out curve
         * @param {number} t - Input (0-1)
         * @returns {number} Smoothed value (0-1)
         */
        smoothStep(t) {
            return t * t * (3 - 2 * t);
        },

        /**
         * Smoother step - even smoother S-curve
         * @param {number} t - Input (0-1)
         * @returns {number} Smoothed value (0-1)
         */
        smootherStep(t) {
            return t * t * t * (t * (t * 6 - 15) + 10);
        },

        /**
         * Calculate spread factor for distributed pieces
         * Maps from stacked (all at center) to evenly distributed
         *
         * @param {number} index - Piece index
         * @param {number} count - Total piece count
         * @param {number} spread - Spread amount (0-100)
         * @param {Object} options - Optional config
         * @param {number} options.center - Center position (default 0.5)
         * @param {boolean} options.wrap - Whether to wrap around (for closed loops)
         * @returns {number} Position parameter (0-1)
         */
        spreadPosition(index, count, spread, options = {}) {
            const center = options.center ?? 0.5;
            const wrap = options.wrap ?? true;
            const spreadFactor = this.clamp01(spread / 100);

            if (count <= 1) return center;

            // Natural evenly distributed position
            const distributedT = index / count;

            // When spread=0, all pieces stack at center
            // When spread=100, pieces are evenly distributed
            if (spreadFactor === 0) {
                return center;
            }

            // Calculate position that lerps from center toward distributed
            // For a closed loop, we want symmetric spreading from center
            let t;
            if (wrap) {
                // Distance from center (can be negative)
                const distFromCenter = distributedT - center;
                // Scale by spread factor
                t = center + distFromCenter * spreadFactor;
                // Wrap to 0-1
                if (t < 0) t += 1;
                if (t >= 1) t -= 1;
            } else {
                // Linear lerp for open paths
                t = this.lerp(center, distributedT, spreadFactor);
            }

            return t;
        },

        /**
         * Get positions for a spread distribution
         * @param {number} count - Number of pieces
         * @param {number} spread - Spread amount (0-100)
         * @param {Object} options - See spreadPosition options
         * @returns {number[]} Array of t positions (0-1)
         */
        getSpreadPositions(count, spread, options = {}) {
            const positions = [];
            for (let i = 0; i < count; i++) {
                positions.push(this.spreadPosition(i, count, spread, options));
            }
            return positions;
        },

        /**
         * Apply sine modulation to a base position
         * @param {number} baseT - Base position (0-1)
         * @param {Object} sine - Sine parameters
         * @param {number} sine.frequency - Oscillation frequency
         * @param {number} sine.amplitudeX - X amplitude
         * @param {number} sine.amplitudeY - Y amplitude
         * @param {number} sine.amplitudeZ - Z amplitude
         * @param {Object} frame - Frenet frame {normal, binormal, tangent}
         * @returns {Object} World offset {x, y, z}
         */
        sineModulation(baseT, sine, frame) {
            const angle = baseT * sine.frequency * Math.PI * 2;
            const sineValue = Math.sin(angle);

            const offsetX = (sine.amplitudeX || 0) * sineValue;
            const offsetY = (sine.amplitudeY || 0) * sineValue;
            const offsetZ = (sine.amplitudeZ || 0) * sineValue;

            // Transform to world coordinates using frame
            return {
                x: frame.normal.x * offsetX + frame.binormal.x * offsetY + frame.tangent.x * offsetZ,
                y: frame.normal.y * offsetX + frame.binormal.y * offsetY + frame.tangent.y * offsetZ,
                z: frame.normal.z * offsetX + frame.binormal.z * offsetY + frame.tangent.z * offsetZ
            };
        }
    };

    APP.Morph = Morph;

})(window.APP);
