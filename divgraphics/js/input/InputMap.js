/**
 * InputMap - First-class binding objects
 * Transforms input values to parameter values with direction, mode, etc.
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    // Input source type constants
    const SourceTypes = {
        MIDI_CC: 'midi-cc',
        MIDI_NOTE: 'midi-note',
        GAMEPAD_AXIS: 'gamepad-axis',
        GAMEPAD_BUTTON: 'gamepad-button',
        LFO: 'lfo',
        KEYBOARD_KEY: 'keyboard-key',
        KEYBOARD_HOLD: 'keyboard-hold'
    };

    // Input domains (raw value ranges)
    const InputDomains = {
        'midi-cc':        { min: 0, max: 127, discrete: false },
        'midi-note':      { min: 0, max: 127, discrete: true },
        'gamepad-axis':   { min: -1, max: 1, discrete: false },
        'gamepad-button': { min: 0, max: 1, discrete: true },
        'lfo':            { min: 0, max: 1, discrete: false },
        'keyboard-key':   { min: 0, max: 1, discrete: true },  // keydown = 1, for increment/toggle
        'keyboard-hold':  { min: 0, max: 1, discrete: false }  // continuous while held
    };

    // Behavior modes for discrete inputs
    const Modes = {
        ABSOLUTE: 'absolute',
        INCREMENT: 'increment',
        DECREMENT: 'decrement',
        TOGGLE: 'toggle'
    };

    // Curve preset values (a, b exponents)
    const CurvePresets = {
        linear: { a: 1.0, b: 1.0 },
        log:    { a: 0.25, b: 0.25 },
        exp:    { a: 4.0, b: 4.0 },
        scurve: { a: 4.0, b: 0.25 },
        invs:   { a: 0.25, b: 4.0 }
    };

    /**
     * Parametric piecewise power-law curve
     * Uses two exponents (a, b) for below/above midpoint, with adjustable midpoint
     *
     * f(x; a, b, m) = {
     *     m * (x/m)^a,                        if x <= m
     *     1 - (1-m) * (1 - (x-m)/(1-m))^b,    if x > m
     * }
     *
     * Guarantees: f(0)=0, f(m)=m, f(1)=1
     *
     * @param {number} x - Normalized input (0-1)
     * @param {number} a - Exponent for lower half (0.2-5.0, default 1.0)
     * @param {number} b - Exponent for upper half (0.2-5.0, default 1.0)
     * @param {number} m - Midpoint position (0.1-0.9, default 0.5)
     * @returns {number} Curved output (0-1)
     */
    function applyParametricCurve(x, a = 1, b = 1, m = 0.5) {
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
     * Legacy: Apply response curve by type name (for backward compatibility)
     * Converts old curve type strings to (a, b) values
     */
    function applyCurve(curveType, x) {
        const preset = CurvePresets[curveType] || CurvePresets.linear;
        return applyParametricCurve(x, preset.a, preset.b);
    }

    /**
     * Get (a, b) values from legacy curve type
     */
    function curveTypeToParams(curveType) {
        return CurvePresets[curveType] || CurvePresets.linear;
    }

    APP.InputMap = {
        SourceTypes,
        InputDomains,
        Modes,
        CurvePresets,
        applyParametricCurve,
        applyCurve,
        curveTypeToParams,

        /**
         * Create a new InputMap
         * @param {Object} config
         * @returns {Object} InputMap instance
         */
        create(config) {
            const id = config.id || this._generateId();
            const sourceType = config.source?.type || config.sourceType;
            const inputDomain = InputDomains[sourceType] || { min: 0, max: 1, discrete: false };

            return {
                id,

                // Source identification
                source: {
                    type: sourceType,
                    key: config.source?.key || config.sourceKey,
                    fullKey: config.source?.fullKey || null,
                    device: config.source?.device || null
                },

                // Target
                target: {
                    path: config.target?.path || config.targetPath,
                    elementId: config.target?.elementId || config.elementId,
                    type: config.target?.type || config.targetType || 'range'
                },

                // Value domain
                domain: {
                    inputMin: config.domain?.inputMin ?? inputDomain.min,
                    inputMax: config.domain?.inputMax ?? inputDomain.max,
                    outputMin: config.domain?.outputMin ?? config.min ?? 0,
                    outputMax: config.domain?.outputMax ?? config.max ?? 1,
                    step: config.domain?.step ?? config.step ?? null
                },

                // Behavior
                behavior: {
                    direction: config.behavior?.direction || 'normal',
                    mode: config.behavior?.mode || (inputDomain.discrete ? 'increment' : 'absolute'),
                    stepSize: config.behavior?.stepSize ?? 10,
                    curveA: config.behavior?.curveA ?? 1.0,
                    curveB: config.behavior?.curveB ?? 1.0,
                    curveMid: config.behavior?.curveMid ?? 0.5
                },

                // Intent (captured at bind time)
                intent: {
                    inferredAction: config.intent?.inferredAction || 'increment'
                },

                // Metadata
                meta: {
                    createdAt: config.meta?.createdAt || Date.now(),
                    label: config.meta?.label || config.target?.elementId || ''
                }
            };
        },

        /**
         * Transform a continuous input value through the map
         * @param {Object} map - InputMap instance
         * @param {number} rawValue - Raw input value
         * @returns {*} Transformed value for dispatch
         */
        transform(map, rawValue) {
            const { inputMin, inputMax, outputMin, outputMax, step } = map.domain;
            const { direction, curveA, curveB } = map.behavior;
            const { type } = map.target;

            // Normalize to 0-1
            let normalized = (rawValue - inputMin) / (inputMax - inputMin);

            // Clamp
            normalized = Math.max(0, Math.min(1, normalized));

            // Apply direction inversion
            if (direction === 'inverted') {
                normalized = 1 - normalized;
            }

            // Apply parametric response curve (with midpoint)
            const curveMid = map.behavior.curveMid ?? 0.5;
            normalized = applyParametricCurve(normalized, curveA ?? 1, curveB ?? 1, curveMid);

            // Transform based on target type
            return this._transformByType(type, normalized, outputMin, outputMax, step);
        },

        /**
         * Apply a discrete input (button/note) through the map
         * @param {Object} map - InputMap instance
         * @param {*} currentValue - Current value at target path
         * @returns {*} New value for dispatch
         */
        applyDiscrete(map, currentValue) {
            const { mode, stepSize, direction } = map.behavior;
            const { outputMin, outputMax } = map.domain;
            const { type } = map.target;

            // For checkboxes, always toggle
            if (type === 'checkbox') {
                return !currentValue;
            }

            // Apply direction to step
            const effectiveStep = direction === 'inverted' ? -stepSize : stepSize;

            switch (mode) {
                case Modes.TOGGLE:
                    return !currentValue;

                case Modes.INCREMENT:
                    return Math.min(outputMax, (currentValue || outputMin) + Math.abs(effectiveStep));

                case Modes.DECREMENT:
                    return Math.max(outputMin, (currentValue || outputMax) - Math.abs(effectiveStep));

                case Modes.ABSOLUTE:
                default:
                    // For absolute mode on discrete, just return current (no-op) or midpoint
                    return currentValue;
            }
        },

        /**
         * Check if this map's source is discrete (button/note)
         * @param {Object} map
         * @returns {boolean}
         */
        isDiscrete(map) {
            const domain = InputDomains[map.source.type];
            return domain?.discrete ?? false;
        },

        /**
         * Get badge symbol for this map
         * @param {Object} map
         * @returns {string} '+', '-', '~', or 'T'
         */
        getBadgeSymbol(map) {
            const { mode, direction } = map.behavior;
            const discrete = this.isDiscrete(map);

            if (map.target.type === 'checkbox' || mode === Modes.TOGGLE) {
                return 'T';
            }

            if (discrete) {
                if (mode === Modes.INCREMENT) return '+';
                if (mode === Modes.DECREMENT) return '-';
            }

            // Continuous
            if (direction === 'inverted') return '-';
            if (direction === 'normal') return map.source.type.includes('axis') ? '~' : '+';

            return '+';
        },

        /**
         * Serialize map for storage
         * @param {Object} map
         * @returns {Object}
         */
        toJSON(map) {
            return JSON.parse(JSON.stringify(map));
        },

        /**
         * Create map from element and source data during learn
         * @param {HTMLElement} element - Target element
         * @param {string} sourceType - e.g., 'midi-cc'
         * @param {string} sourceKey - e.g., 'cc:1:74'
         * @param {string} fullKey - e.g., 'midi:cc:1:74'
         * @param {Object} intent - { clickPosition, inferredAction }
         * @returns {Object} InputMap
         */
        fromElement(element, sourceType, sourceKey, fullKey, intent = {}) {
            const param = APP.ParameterRegistry.get(element.id);
            if (!param) return null;

            const isDiscrete = InputDomains[sourceType]?.discrete ?? false;

            // Determine behavior based on intent and source type
            let behavior = { direction: 'normal', mode: 'absolute', stepSize: 10 };

            if (isDiscrete) {
                // Discrete input - use intent to determine mode
                if (param.type === 'checkbox') {
                    behavior.mode = 'toggle';
                } else if (intent.inferredAction === 'decrement') {
                    behavior.mode = 'decrement';
                } else if (intent.inferredAction === 'increment') {
                    behavior.mode = 'increment';
                }
                // Calculate step size as ~10% of range
                if (param.min !== undefined && param.max !== undefined) {
                    behavior.stepSize = Math.round((param.max - param.min) / 10);
                }
            } else {
                // Continuous input - use intent for direction
                behavior.direction = intent.inferredAction === 'decrement' ? 'inverted' : 'normal';
                behavior.mode = 'absolute';
            }

            return this.create({
                source: { type: sourceType, key: sourceKey, fullKey },
                target: { path: param.path, elementId: element.id, type: param.type },
                domain: {
                    outputMin: param.min ?? 0,
                    outputMax: param.max ?? 1,
                    step: param.step ?? null
                },
                behavior,
                intent: {
                    inferredAction: intent.inferredAction || 'increment'
                }
            });
        },

        // ================================================================
        // Internal helpers
        // ================================================================

        _transformByType(type, normalized, min, max, step) {
            switch (type) {
                case 'range': {
                    let value = min + normalized * (max - min);
                    if (step) {
                        value = Math.round(value / step) * step;
                    }
                    // Round to integer if min/max are integers
                    if (Number.isInteger(min) && Number.isInteger(max)) {
                        value = Math.round(value);
                    }
                    return Math.max(min, Math.min(max, value));
                }

                case 'checkbox':
                    return normalized > 0.5;

                case 'color':
                    return this._normalizedToHex(normalized);

                default:
                    return normalized;
            }
        },

        _normalizedToHex(normalized) {
            // Map normalized 0-1 to hue 0-360, fixed saturation/lightness
            const h = normalized * 360;
            const s = 100, l = 50;

            const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
            const f = n => {
                const k = (n + h / 30) % 12;
                const c = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                return Math.round(255 * c).toString(16).padStart(2, '0');
            };
            return `#${f(0)}${f(8)}${f(4)}`;
        },

        _generateId() {
            return 'map_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        }
    };

})(window.APP);
