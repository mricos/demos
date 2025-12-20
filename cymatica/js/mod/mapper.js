// CYMATICA.mod.mapper - Parametric curve mapping
// Transforms 0-1 modulation values with configurable response curves
(function(CYMATICA) {
    'use strict';

    // Curve presets for quick selection
    const CurvePresets = {
        linear:  { a: 1.0, b: 1.0, m: 0.5 },
        log:     { a: 0.25, b: 0.25, m: 0.5 },
        exp:     { a: 4.0, b: 4.0, m: 0.5 },
        scurve:  { a: 4.0, b: 0.25, m: 0.5 },
        invs:    { a: 0.25, b: 4.0, m: 0.5 }
    };

    CYMATICA.mod = CYMATICA.mod || {};

    CYMATICA.mod.mapper = {
        CurvePresets,

        /**
         * Parametric piecewise power-law curve
         * Guarantees: f(0)=0, f(m)=m, f(1)=1
         *
         * @param {number} x - Input value 0-1
         * @param {number} a - Lower half exponent (< 1 = log, > 1 = exp)
         * @param {number} b - Upper half exponent (< 1 = log, > 1 = exp)
         * @param {number} m - Midpoint (where curve passes through)
         * @returns {number} Curved value 0-1
         */
        applyParametricCurve(x, a = 1, b = 1, m = 0.5) {
            // Clamp inputs
            x = Math.max(0, Math.min(1, x));
            a = Math.max(0.1, Math.min(10, a));
            b = Math.max(0.1, Math.min(10, b));
            m = Math.max(0.1, Math.min(0.9, m));

            if (x <= m) {
                // Lower half: scale x to [0,1] within [0,m], apply power, scale back
                const t = x / m;
                return m * Math.pow(t, a);
            } else {
                // Upper half: mirror the operation
                const t = (x - m) / (1 - m);
                return 1 - (1 - m) * Math.pow(1 - t, b);
            }
        },

        /**
         * Get preset curve parameters by name
         * @param {string} name - Preset name
         * @returns {object} {a, b, m} parameters
         */
        getPreset(name) {
            return CurvePresets[name] || CurvePresets.linear;
        },

        /**
         * Transform a 0-1 modulation value to a target range with curve
         *
         * @param {number} value - Input value 0-1
         * @param {object} config - Transform configuration
         * @param {number} config.min - Output minimum
         * @param {number} config.max - Output maximum
         * @param {number} config.curveA - Lower half exponent
         * @param {number} config.curveB - Upper half exponent
         * @param {number} config.curveMid - Curve midpoint
         * @param {boolean} config.invert - Invert before mapping
         * @param {number} config.step - Quantization step (optional)
         * @returns {number} Transformed value
         */
        transform(value, config) {
            const {
                min = 0,
                max = 1,
                curveA = 1,
                curveB = 1,
                curveMid = 0.5,
                invert = false,
                step = null
            } = config;

            // Clamp input
            let v = Math.max(0, Math.min(1, value));

            // Invert if needed
            if (invert) v = 1 - v;

            // Apply parametric curve
            v = this.applyParametricCurve(v, curveA, curveB, curveMid);

            // Map to output range
            let output = min + v * (max - min);

            // Quantize if step specified
            if (step && step > 0) {
                output = Math.round(output / step) * step;
            }

            // Final clamp to output range
            return Math.max(Math.min(min, max), Math.min(Math.max(min, max), output));
        },

        /**
         * Create a reusable transform function with fixed config
         * @param {object} config - Transform configuration
         * @returns {function} Transform function (value) => transformedValue
         */
        createTransform(config) {
            return (value) => this.transform(value, config);
        },

        /**
         * Interpolate between two curve presets
         * @param {string} preset1 - First preset name
         * @param {string} preset2 - Second preset name
         * @param {number} t - Interpolation factor 0-1
         * @returns {object} Interpolated {a, b, m}
         */
        lerpPresets(preset1, preset2, t) {
            const p1 = this.getPreset(preset1);
            const p2 = this.getPreset(preset2);
            return {
                a: p1.a + (p2.a - p1.a) * t,
                b: p1.b + (p2.b - p1.b) * t,
                m: p1.m + (p2.m - p1.m) * t
            };
        }
    };

})(window.CYMATICA);
