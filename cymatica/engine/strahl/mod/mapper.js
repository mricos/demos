/**
 * Strahl.Mod.Mapper — Parametric curve mapping
 * Transforms 0-1 values through configurable response curves.
 * Pure functions, no state.
 */
(function(Strahl) {
    'use strict';

    const Presets = {
        linear:  { a: 1.0, b: 1.0, m: 0.5 },
        log:     { a: 0.25, b: 0.25, m: 0.5 },
        exp:     { a: 4.0, b: 4.0, m: 0.5 },
        scurve:  { a: 4.0, b: 0.25, m: 0.5 },
        invs:    { a: 0.25, b: 4.0, m: 0.5 }
    };

    /**
     * Piecewise power-law curve: f(0)=0, f(m)=m, f(1)=1
     */
    function curve(x, a, b, m) {
        x = Math.max(0, Math.min(1, x));
        a = Math.max(0.1, Math.min(10, a || 1));
        b = Math.max(0.1, Math.min(10, b || 1));
        m = Math.max(0.1, Math.min(0.9, m || 0.5));

        if (x <= m) {
            return m * Math.pow(x / m, a);
        } else {
            return 1 - (1 - m) * Math.pow(1 - (x - m) / (1 - m), b);
        }
    }

    /**
     * Full transform: clamp → invert → curve → range → quantize
     */
    function transform(value, config) {
        const { min = 0, max = 1, curveA = 1, curveB = 1, curveMid = 0.5,
                invert = false, step = null } = config;

        let v = Math.max(0, Math.min(1, value));
        if (invert) v = 1 - v;
        v = curve(v, curveA, curveB, curveMid);

        let out = min + v * (max - min);
        if (step && step > 0) out = Math.round(out / step) * step;

        return Math.max(Math.min(min, max), Math.min(Math.max(min, max), out));
    }

    /**
     * Create a reusable transform function with fixed config
     */
    function createTransform(config) {
        return (value) => transform(value, config);
    }

    Strahl.Mod = Strahl.Mod || {};
    Strahl.Mod.Mapper = { Presets, curve, transform, createTransform };

})(window.Strahl);
