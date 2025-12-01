/**
 * ValueMap - Lightweight value transformation utility
 *
 * Uses the same parametric curve math as InputMap but designed for
 * programmatic use (audio, physics, animations) rather than UI bindings.
 *
 * Features:
 * - Normalize any input range to 0-1
 * - Apply parametric curves (a, b exponents + midpoint)
 * - Scale to any output range
 * - Invert direction
 * - Preset curves: linear, log, exp, scurve, invs
 *
 * Usage:
 *   // One-shot transform
 *   const output = APP.ValueMap.transform(input, { curve: 'scurve', outMin: 0, outMax: 100 });
 *
 *   // Reusable mapper
 *   const freqMap = APP.ValueMap.create({ curve: 'log', outMin: 200, outMax: 2000 });
 *   const freq = freqMap.apply(proximity);
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    // Curve presets (same as InputMap)
    const CurvePresets = {
        linear: { a: 1.0, b: 1.0, m: 0.5 },
        log:    { a: 0.25, b: 0.25, m: 0.5 },   // Fast rise, slow finish
        exp:    { a: 4.0, b: 4.0, m: 0.5 },     // Slow rise, fast finish
        scurve: { a: 2.0, b: 2.0, m: 0.5 },     // Smooth S-curve (ease in-out)
        invs:   { a: 0.25, b: 4.0, m: 0.5 },    // Inverse S
        smooth: { a: 1.5, b: 1.5, m: 0.5 },     // Gentle smoothing
        steep:  { a: 3.0, b: 3.0, m: 0.5 },     // Steeper S-curve
        // Asymmetric presets
        loglin: { a: 0.25, b: 1.0, m: 0.5 },    // Log bottom, linear top
        linexp: { a: 1.0, b: 4.0, m: 0.5 },     // Linear bottom, exp top
        // Audio-specific
        fade:   { a: 1.5, b: 2.0, m: 0.4 },     // Nice fade curve
        pan:    { a: 0.7, b: 0.7, m: 0.5 }      // Gentle pan curve
    };

    /**
     * Parametric piecewise power-law curve
     * Same math as InputMap.applyParametricCurve
     *
     * @param {number} x - Normalized input (0-1)
     * @param {number} a - Exponent for lower half
     * @param {number} b - Exponent for upper half
     * @param {number} m - Midpoint position (0.1-0.9)
     * @returns {number} Curved output (0-1)
     */
    function applyCurve(x, a = 1, b = 1, m = 0.5) {
        x = Math.max(0, Math.min(1, x));
        a = Math.max(0.1, Math.min(10, a));
        b = Math.max(0.1, Math.min(10, b));
        m = Math.max(0.1, Math.min(0.9, m));

        if (x <= m) {
            const t = x / m;
            return m * Math.pow(t, a);
        } else {
            const t = (x - m) / (1 - m);
            return 1 - (1 - m) * Math.pow(1 - t, b);
        }
    }

    /**
     * Parse curve config into { a, b, m }
     * @param {string|Object} curve - Preset name or { a, b, m } object
     * @returns {Object} { a, b, m }
     */
    function parseCurve(curve) {
        if (!curve) return CurvePresets.linear;
        if (typeof curve === 'string') {
            return CurvePresets[curve] || CurvePresets.linear;
        }
        return {
            a: curve.a ?? 1,
            b: curve.b ?? 1,
            m: curve.m ?? curve.mid ?? 0.5
        };
    }

    APP.ValueMap = {
        CurvePresets,
        applyCurve,

        /**
         * One-shot value transformation
         *
         * @param {number} value - Input value
         * @param {Object} config - Transform configuration
         * @param {number} [config.inMin=0] - Input minimum
         * @param {number} [config.inMax=1] - Input maximum
         * @param {number} [config.outMin=0] - Output minimum
         * @param {number} [config.outMax=1] - Output maximum
         * @param {string|Object} [config.curve='linear'] - Curve preset or { a, b, m }
         * @param {boolean} [config.invert=false] - Invert the curve
         * @param {boolean} [config.clamp=true] - Clamp output to range
         * @returns {number} Transformed value
         */
        transform(value, config = {}) {
            const {
                inMin = 0,
                inMax = 1,
                outMin = 0,
                outMax = 1,
                curve = 'linear',
                invert = false,
                clamp = true
            } = config;

            // Normalize to 0-1
            let normalized = (value - inMin) / (inMax - inMin);

            // Clamp normalized
            normalized = Math.max(0, Math.min(1, normalized));

            // Invert if requested
            if (invert) {
                normalized = 1 - normalized;
            }

            // Apply curve
            const { a, b, m } = parseCurve(curve);
            const curved = applyCurve(normalized, a, b, m);

            // Scale to output range
            let output = outMin + curved * (outMax - outMin);

            // Clamp output
            if (clamp) {
                const min = Math.min(outMin, outMax);
                const max = Math.max(outMin, outMax);
                output = Math.max(min, Math.min(max, output));
            }

            return output;
        },

        /**
         * Create a reusable value mapper
         *
         * @param {Object} config - Same options as transform()
         * @returns {Object} Mapper with apply() method
         */
        create(config = {}) {
            const {
                inMin = 0,
                inMax = 1,
                outMin = 0,
                outMax = 1,
                curve = 'linear',
                invert = false,
                clamp = true
            } = config;

            const { a, b, m } = parseCurve(curve);

            // Pre-compute for efficiency
            const inRange = inMax - inMin;
            const outRange = outMax - outMin;
            const clampMin = Math.min(outMin, outMax);
            const clampMax = Math.max(outMin, outMax);

            return {
                // Config (for inspection/serialization)
                config: { inMin, inMax, outMin, outMax, curve: { a, b, m }, invert, clamp },

                /**
                 * Apply the mapping to a value
                 * @param {number} value - Input value
                 * @returns {number} Transformed value
                 */
                apply(value) {
                    let normalized = (value - inMin) / inRange;
                    normalized = Math.max(0, Math.min(1, normalized));

                    if (invert) normalized = 1 - normalized;

                    const curved = applyCurve(normalized, a, b, m);
                    let output = outMin + curved * outRange;

                    if (clamp) {
                        output = Math.max(clampMin, Math.min(clampMax, output));
                    }

                    return output;
                },

                /**
                 * Get the normalized (0-1) curved value without scaling
                 * @param {number} value - Input value
                 * @returns {number} Curved normalized value (0-1)
                 */
                normalize(value) {
                    let normalized = (value - inMin) / inRange;
                    normalized = Math.max(0, Math.min(1, normalized));
                    if (invert) normalized = 1 - normalized;
                    return applyCurve(normalized, a, b, m);
                },

                /**
                 * Update output range (useful for dynamic min/max)
                 * @param {number} newMin
                 * @param {number} newMax
                 */
                setOutputRange(newMin, newMax) {
                    this.config.outMin = newMin;
                    this.config.outMax = newMax;
                }
            };
        },

        /**
         * Create a bipolar mapper (-1 to 1 input, like gamepad axes or pan)
         * Handles center deadzone and symmetric curve
         *
         * @param {Object} config
         * @param {number} [config.deadzone=0.05] - Center deadzone (0-0.5)
         * @param {number} [config.outMin=-1] - Output at -1 input
         * @param {number} [config.outMax=1] - Output at +1 input
         * @param {string|Object} [config.curve='linear'] - Curve applied to each side
         * @returns {Object} Mapper with apply() method
         */
        createBipolar(config = {}) {
            const {
                deadzone = 0.05,
                outMin = -1,
                outMax = 1,
                curve = 'linear'
            } = config;

            const { a, b, m } = parseCurve(curve);
            const outCenter = (outMin + outMax) / 2;
            const outHalfRange = (outMax - outMin) / 2;

            return {
                config: { deadzone, outMin, outMax, curve: { a, b, m } },

                apply(value) {
                    // Clamp input to -1 to 1
                    value = Math.max(-1, Math.min(1, value));

                    // Apply deadzone
                    if (Math.abs(value) < deadzone) {
                        return outCenter;
                    }

                    // Rescale past deadzone
                    const sign = value < 0 ? -1 : 1;
                    const magnitude = (Math.abs(value) - deadzone) / (1 - deadzone);

                    // Apply curve to magnitude
                    const curved = applyCurve(magnitude, a, b, m);

                    // Scale to output
                    return outCenter + sign * curved * outHalfRange;
                }
            };
        },

        /**
         * Create a distance-based mapper (for proximity effects)
         * Input: distance (0 = touching, increasing = farther)
         * Output: effect intensity (1 = max effect at distance 0)
         *
         * @param {Object} config
         * @param {number} [config.maxDistance=200] - Distance at which effect is zero
         * @param {number} [config.outMin=0] - Output at max distance
         * @param {number} [config.outMax=1] - Output at zero distance
         * @param {string|Object} [config.curve='exp'] - Falloff curve
         * @returns {Object} Mapper with apply() method
         */
        createProximity(config = {}) {
            const {
                maxDistance = 200,
                outMin = 0,
                outMax = 1,
                curve = 'exp'  // Exponential falloff feels natural
            } = config;

            const { a, b, m } = parseCurve(curve);

            return {
                config: { maxDistance, outMin, outMax, curve: { a, b, m } },

                apply(distance) {
                    // Normalize: 0 at distance 0, 1 at maxDistance
                    let normalized = Math.max(0, Math.min(1, distance / maxDistance));

                    // Invert: we want 1 when close, 0 when far
                    normalized = 1 - normalized;

                    // Apply curve
                    const curved = applyCurve(normalized, a, b, m);

                    // Scale to output
                    return outMin + curved * (outMax - outMin);
                }
            };
        },

        /**
         * Utility: Lerp between two values
         */
        lerp(a, b, t) {
            return a + (b - a) * Math.max(0, Math.min(1, t));
        },

        /**
         * Utility: Inverse lerp (get t from value between a and b)
         */
        invLerp(a, b, value) {
            return (value - a) / (b - a);
        },

        /**
         * Utility: Remap value from one range to another
         */
        remap(value, inMin, inMax, outMin, outMax) {
            const t = (value - inMin) / (inMax - inMin);
            return outMin + t * (outMax - outMin);
        }
    };

})(window.APP);
