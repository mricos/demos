/**
 * Param - Runtime parameter instance with getter/setter and change notification
 */

import { ParamSpec } from './ParamSpec.js';

export class Param {
    /**
     * @param {string} name - Full parameter name (e.g., 'layer.camera.opacity')
     * @param {ParamSpec|Object} spec - Parameter specification
     * @param {Object} [target] - Object containing the value
     * @param {string|Object} [key] - Property key or {get, set} functions
     */
    constructor(name, spec, target = null, key = null) {
        this.name = name;
        this.spec = spec instanceof ParamSpec ? spec : new ParamSpec(spec);

        // Value storage: either bound to target object or internal
        this._target = target;
        this._key = key;
        this._internalValue = this.spec.default;

        // Resolve getter/setter
        if (key && typeof key === 'object' && (key.get || key.set)) {
            this._getter = key.get || null;
            this._setter = key.set || null;
        } else if (this.spec.key && typeof this.spec.key === 'object') {
            this._getter = this.spec.key.get || null;
            this._setter = this.spec.key.set || null;
        } else {
            this._getter = null;
            this._setter = null;
        }

        // Change listeners
        this._listeners = [];

        // Metadata extracted from name
        const parts = name.split('.');
        this.shortName = parts[parts.length - 1];
        this.namespace = parts.length > 1 ? parts.slice(0, -1).join('.') : '';
    }

    /**
     * Get current value
     * @returns {*} Current value
     */
    get() {
        try {
            // Custom getter function
            if (this._getter) {
                return this._getter();
            }
            // Target object property
            if (this._target && this._key && typeof this._key === 'string') {
                return this._target[this._key];
            }
            // Internal value
            return this._internalValue;
        } catch (e) {
            console.warn(`Param.get(${this.name}) error:`, e);
            return this.spec.default;
        }
    }

    /**
     * Set value
     * @param {*} value - New value
     * @returns {boolean} True if value changed
     */
    set(value) {
        if (this.spec.readonly) {
            return false;
        }

        const validated = this.spec.validate(value);
        const oldValue = this.get();

        // Skip if no change
        if (validated === oldValue) {
            return false;
        }

        try {
            // Custom setter function
            if (this._setter) {
                this._setter(validated);
            }
            // Target object property
            else if (this._target && this._key && typeof this._key === 'string') {
                this._target[this._key] = validated;
            }
            // Internal value
            else {
                this._internalValue = validated;
            }

            // Notify listeners
            this._notifyChange(validated, oldValue);
            return true;

        } catch (e) {
            console.warn(`Param.set(${this.name}) error:`, e);
            return false;
        }
    }

    /**
     * Set value from slider position (0-1)
     * @param {number} t - Slider position 0-1
     */
    setFromSlider(t) {
        const value = this.spec.fromSlider(t);
        this.set(value);
    }

    /**
     * Get current slider position (0-1)
     * @returns {number} Slider position 0-1
     */
    getSliderPosition() {
        return this.spec.toSlider(this.get());
    }

    /**
     * Get formatted display string
     * @returns {string} Formatted value
     */
    getDisplay() {
        return this.spec.formatValue(this.get());
    }

    /**
     * Get type indicator for UI display
     * @returns {string} Short type indicator
     */
    getTypeIndicator() {
        switch (this.spec.type) {
            case 'boolean': return '◉';  // toggle
            case 'enum': return '▼';     // dropdown/select
            case 'trigger': return '▶';  // action
            default: return '─';         // slider/number
        }
    }

    /**
     * Parse and set from string input
     * @param {string} str - Input string
     * @returns {boolean} True if value changed
     */
    setFromString(str) {
        const value = this.spec.parse(str);
        return this.set(value);
    }

    /**
     * Reset to default value
     * @returns {boolean} True if value changed
     */
    reset() {
        return this.set(this.spec.default);
    }

    /**
     * Toggle boolean value or cycle enum
     * @returns {*} New value
     */
    toggle() {
        if (this.spec.type === 'boolean') {
            this.set(!this.get());
        } else if (this.spec.type === 'enum' && this.spec.choices) {
            const current = this.get();
            const next = (current + 1) % this.spec.choices.length;
            this.set(next);
        }
        return this.get();
    }

    /**
     * Increment value by step
     * @param {number} [multiplier=1] - Step multiplier
     * @returns {*} New value
     */
    increment(multiplier = 1) {
        if (this.spec.type === 'boolean') {
            return this.toggle();
        }
        const current = this.get();
        const step = this.spec.step * multiplier;
        return this.set(current + step);
    }

    /**
     * Decrement value by step
     * @param {number} [multiplier=1] - Step multiplier
     * @returns {*} New value
     */
    decrement(multiplier = 1) {
        return this.increment(-multiplier);
    }

    /**
     * Subscribe to value changes
     * @param {Function} fn - Callback (newValue, oldValue, param) => void
     * @returns {Function} Unsubscribe function
     */
    onChange(fn) {
        this._listeners.push(fn);
        return () => {
            this._listeners = this._listeners.filter(f => f !== fn);
        };
    }

    /**
     * Notify all listeners of value change
     */
    _notifyChange(newValue, oldValue) {
        for (const fn of this._listeners) {
            try {
                fn(newValue, oldValue, this);
            } catch (e) {
                console.warn(`Param onChange listener error:`, e);
            }
        }
    }

    /**
     * Get serializable representation
     * @returns {*} Value for serialization
     */
    serialize() {
        return this.get();
    }

    /**
     * Restore from serialized value
     * @param {*} value - Serialized value
     */
    deserialize(value) {
        this.set(value);
    }

    /**
     * Get info object for UI/debugging
     * @returns {Object} Parameter info
     */
    getInfo() {
        return {
            name: this.name,
            shortName: this.shortName,
            namespace: this.namespace,
            value: this.get(),
            display: this.getDisplay(),
            type: this.spec.type,
            min: this.spec.min,
            max: this.spec.max,
            unit: this.spec.unit,
            readonly: this.spec.readonly,
            group: this.spec.group,
            description: this.spec.description,
            choices: this.spec.choices,
        };
    }

    /**
     * Create a param bound to an object property
     * @param {string} name - Parameter name
     * @param {Object} spec - Spec options
     * @param {Object} target - Target object
     * @param {string} key - Property key
     * @returns {Param}
     */
    static bound(name, spec, target, key) {
        return new Param(name, spec, target, key);
    }

    /**
     * Create a param with custom getter/setter
     * @param {string} name - Parameter name
     * @param {Object} spec - Spec options
     * @param {Function} getter - Getter function
     * @param {Function} [setter] - Setter function (null for readonly)
     * @returns {Param}
     */
    static computed(name, spec, getter, setter = null) {
        const fullSpec = { ...spec, readonly: !setter };
        return new Param(name, fullSpec, null, { get: getter, set: setter });
    }

    /**
     * Create a standalone param with internal storage
     * @param {string} name - Parameter name
     * @param {Object} spec - Spec options
     * @returns {Param}
     */
    static standalone(name, spec) {
        return new Param(name, spec);
    }
}
