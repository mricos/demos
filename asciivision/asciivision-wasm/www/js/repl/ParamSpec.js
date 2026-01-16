/**
 * ParamSpec - Parameter specification with mapping functions
 * Defines type, range, units, and value transformations
 */

/**
 * Mapping functions: slider position (0-1) → actual value
 */
export const Mappings = {
    lin: (t, min, max) => min + t * (max - min),
    exp: (t, min, max) => {
        // Handle zero/negative mins for exponential
        if (min <= 0) min = 0.001;
        return min * Math.pow(max / min, t);
    },
    log: (t, min, max) => {
        if (min <= 0) min = 0.001;
        return Math.exp(Math.log(min) + t * (Math.log(max) - Math.log(min)));
    },
    pow2: (t, min, max) => min + Math.pow(t, 2) * (max - min),
    pow3: (t, min, max) => min + Math.pow(t, 3) * (max - min),
    sqrt: (t, min, max) => min + Math.sqrt(t) * (max - min),
    // S-curve for smooth transitions
    scurve: (t, min, max) => {
        const s = t * t * (3 - 2 * t);  // Smoothstep
        return min + s * (max - min);
    },
};

/**
 * Inverse mappings: actual value → slider position (0-1)
 */
export const InverseMappings = {
    lin: (v, min, max) => (v - min) / (max - min),
    exp: (v, min, max) => {
        if (min <= 0) min = 0.001;
        if (v <= 0) v = min;
        return Math.log(v / min) / Math.log(max / min);
    },
    log: (v, min, max) => {
        if (min <= 0) min = 0.001;
        if (v <= 0) v = min;
        return (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min));
    },
    pow2: (v, min, max) => Math.sqrt((v - min) / (max - min)),
    pow3: (v, min, max) => Math.cbrt((v - min) / (max - min)),
    sqrt: (v, min, max) => Math.pow((v - min) / (max - min), 2),
    scurve: (v, min, max) => {
        // Approximate inverse of smoothstep
        const t = (v - min) / (max - min);
        return 0.5 - Math.sin(Math.asin(1 - 2 * t) / 3);
    },
};

/**
 * Unit display suffixes and formatting hints
 */
export const Units = {
    '': { suffix: '', decimals: 2 },
    'deg': { suffix: '°', decimals: 0 },
    '%': { suffix: '%', decimals: 0, scale: 100 },
    'px': { suffix: 'px', decimals: 0 },
    'ms': { suffix: 'ms', decimals: 0 },
    's': { suffix: 's', decimals: 2 },
    'dB': { suffix: 'dB', decimals: 1 },
    'Hz': { suffix: 'Hz', decimals: 0 },
    'kHz': { suffix: 'kHz', decimals: 2, scale: 0.001 },
    'x': { suffix: 'x', decimals: 2 },
};

/**
 * @typedef {Object} ParamSpecOptions
 * @property {'number'|'boolean'|'enum'|'trigger'} [type='number']
 * @property {number} [min=0] - Minimum value
 * @property {number} [max=1] - Maximum value
 * @property {number} [default] - Default value (defaults to min)
 * @property {number} [step] - Step size for input/display
 * @property {string} [unit=''] - Unit identifier
 * @property {string|Function} [mapping='lin'] - Mapping function name or custom fn
 * @property {Function} [inverseMapping] - Custom inverse mapping (required if mapping is custom fn)
 * @property {Function} [format] - Custom format function (value) => string
 * @property {boolean} [readonly=false] - If true, value cannot be set
 * @property {string[]} [choices] - For enum type
 * @property {string} [group='default'] - Grouping for UI
 * @property {string} [description=''] - Help text
 * @property {string|Object} [key] - Property key or {get, set} for binding
 */

export class ParamSpec {
    /**
     * @param {ParamSpecOptions} options
     */
    constructor(options = {}) {
        this.type = options.type || 'number';
        this.min = options.min ?? 0;
        this.max = options.max ?? 1;
        this.default = options.default ?? (this.type === 'boolean' ? false : this.min);
        this.step = options.step ?? this._autoStep();
        this.unit = options.unit || '';
        this.mapping = options.mapping || 'lin';
        this.readonly = options.readonly || false;
        this.choices = options.choices || null;
        this.group = options.group || 'default';
        this.description = options.description || '';
        this.key = options.key || null;

        // Resolve mapping functions
        if (typeof this.mapping === 'function') {
            this._mapFn = this.mapping;
            this._invMapFn = options.inverseMapping || null;
        } else {
            this._mapFn = Mappings[this.mapping] || Mappings.lin;
            this._invMapFn = InverseMappings[this.mapping] || InverseMappings.lin;
        }

        // Custom format function
        this._formatFn = options.format || null;
    }

    /**
     * Auto-calculate step based on range
     */
    _autoStep() {
        if (this.type === 'boolean' || this.type === 'trigger') return 1;
        if (this.type === 'enum') return 1;
        const range = this.max - this.min;
        if (range <= 1) return 0.01;
        if (range <= 10) return 0.1;
        if (range <= 100) return 1;
        return Math.pow(10, Math.floor(Math.log10(range)) - 1);
    }

    /**
     * Convert slider position (0-1) to actual value
     * @param {number} t - Slider position 0-1
     * @returns {*} Actual value
     */
    fromSlider(t) {
        t = Math.max(0, Math.min(1, t));

        if (this.type === 'boolean') {
            return t >= 0.5;
        }
        if (this.type === 'enum' && this.choices) {
            return Math.round(t * (this.choices.length - 1));
        }
        if (this.type === 'trigger') {
            return t >= 0.5;
        }

        return this._mapFn(t, this.min, this.max);
    }

    /**
     * Convert actual value to slider position (0-1)
     * @param {*} v - Actual value
     * @returns {number} Slider position 0-1
     */
    toSlider(v) {
        if (this.type === 'boolean') {
            return v ? 1 : 0;
        }
        if (this.type === 'enum' && this.choices) {
            return v / (this.choices.length - 1);
        }
        if (this.type === 'trigger') {
            return 0;
        }

        if (!this._invMapFn) {
            // Fallback to linear if no inverse
            return (v - this.min) / (this.max - this.min);
        }

        const t = this._invMapFn(v, this.min, this.max);
        return Math.max(0, Math.min(1, t));
    }

    /**
     * Format value for display
     * @param {*} v - Value to format
     * @returns {string} Formatted string
     */
    formatValue(v) {
        // Custom format function takes precedence
        if (this._formatFn) {
            return this._formatFn(v);
        }

        // Boolean
        if (this.type === 'boolean') {
            return v ? 'on' : 'off';
        }

        // Enum
        if (this.type === 'enum' && this.choices) {
            const idx = Math.round(v);
            return this.choices[idx] || String(idx);
        }

        // Trigger
        if (this.type === 'trigger') {
            return '[ ]';
        }

        // Number with unit
        const unitInfo = Units[this.unit] || Units[''];
        let displayValue = v;

        // Apply scale if defined
        if (unitInfo.scale) {
            displayValue = v * unitInfo.scale;
        }

        // Format with appropriate decimals
        const decimals = unitInfo.decimals ?? this._autoDecimals(displayValue);
        const formatted = displayValue.toFixed(decimals);

        return unitInfo.suffix ? `${formatted}${unitInfo.suffix}` : formatted;
    }

    /**
     * Auto-determine decimal places based on value magnitude
     */
    _autoDecimals(v) {
        const absV = Math.abs(v);
        if (absV >= 100) return 0;
        if (absV >= 10) return 1;
        if (absV >= 1) return 2;
        if (absV >= 0.1) return 3;
        return 4;
    }

    /**
     * Validate and clamp value to valid range
     * @param {*} v - Input value
     * @returns {*} Validated value
     */
    validate(v) {
        if (this.type === 'boolean') {
            return !!v;
        }
        if (this.type === 'trigger') {
            return true;
        }
        if (this.type === 'enum' && this.choices) {
            const idx = Math.round(Number(v));
            return Math.max(0, Math.min(this.choices.length - 1, idx));
        }

        // Number: clamp to range
        const num = Number(v);
        if (isNaN(num)) return this.default;
        return Math.max(this.min, Math.min(this.max, num));
    }

    /**
     * Parse string input to value
     * @param {string} str - Input string
     * @returns {*} Parsed value
     */
    parse(str) {
        str = str.trim().toLowerCase();

        if (this.type === 'boolean') {
            return str === 'true' || str === 'on' || str === '1' || str === 'yes';
        }

        if (this.type === 'enum' && this.choices) {
            // Try to match by name first
            const idx = this.choices.findIndex(c => c.toLowerCase() === str);
            if (idx >= 0) return idx;
            // Fall back to number
            return this.validate(parseInt(str, 10));
        }

        // Number: strip unit suffix if present
        const unitInfo = Units[this.unit];
        if (unitInfo?.suffix && str.endsWith(unitInfo.suffix.toLowerCase())) {
            str = str.slice(0, -unitInfo.suffix.length);
        }

        let num = parseFloat(str);

        // Reverse scale if needed
        if (unitInfo?.scale) {
            num = num / unitInfo.scale;
        }

        return this.validate(num);
    }

    /**
     * Create a copy with overrides
     * @param {ParamSpecOptions} overrides
     * @returns {ParamSpec}
     */
    extend(overrides) {
        return new ParamSpec({
            type: this.type,
            min: this.min,
            max: this.max,
            default: this.default,
            step: this.step,
            unit: this.unit,
            mapping: this.mapping,
            readonly: this.readonly,
            choices: this.choices,
            group: this.group,
            description: this.description,
            key: this.key,
            format: this._formatFn,
            ...overrides
        });
    }
}

/**
 * Preset specs for common parameter types
 */
export const Presets = {
    // Normalized 0-1
    normalized: () => new ParamSpec({ min: 0, max: 1, default: 0 }),

    // Bipolar -1 to 1
    bipolar: () => new ParamSpec({ min: -1, max: 1, default: 0 }),

    // Percentage
    percent: () => new ParamSpec({ min: 0, max: 100, default: 100, unit: '%' }),

    // Angle in degrees
    angle: () => new ParamSpec({ min: -180, max: 180, default: 0, unit: 'deg' }),

    // Positive angle
    rotation: () => new ParamSpec({ min: 0, max: 360, default: 0, unit: 'deg' }),

    // Audio frequency (exponential)
    frequency: () => new ParamSpec({
        min: 20, max: 20000, default: 440,
        unit: 'Hz', mapping: 'exp'
    }),

    // Time in seconds (logarithmic for wide ranges)
    time: () => new ParamSpec({
        min: 0.001, max: 10, default: 0.1,
        unit: 's', mapping: 'log'
    }),

    // Decibels
    decibels: () => new ParamSpec({
        min: -60, max: 12, default: 0,
        unit: 'dB'
    }),

    // Boolean toggle
    toggle: () => new ParamSpec({ type: 'boolean', default: false }),

    // Integer count
    count: (min, max, def) => new ParamSpec({
        min, max, default: def ?? min,
        step: 1
    }),

    // Enum/choice
    choice: (choices, def = 0) => new ParamSpec({
        type: 'enum',
        choices,
        default: def
    }),
};
