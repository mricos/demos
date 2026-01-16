/**
 * Effect - Base class for visual effects
 * Effects can be applied to layers, renderers, or post-processing
 */

export class Effect {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.intensity = options.intensity ?? 1.0;
        this.name = this.constructor.name;
    }

    /**
     * Apply effect - override in subclass
     * @param {*} input - Effect input (varies by effect type)
     * @param {*} output - Effect output destination
     * @param {Object} context - Additional context (time, delta, etc)
     */
    apply(input, output, context = {}) {
        throw new Error('Effect.apply() must be implemented by subclass');
    }

    /**
     * Get CSS filter string for this effect
     * Override in subclass if applicable
     */
    getCSSFilter() {
        return '';
    }

    /**
     * Get shader uniform values
     * Override in subclass for WebGL effects
     */
    getUniforms() {
        return {
            intensity: this.intensity
        };
    }

    /**
     * Set effect intensity
     */
    setIntensity(value) {
        this.intensity = Math.max(0, Math.min(1, value));
        return this;
    }

    /**
     * Enable/disable effect
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        return this;
    }

    /**
     * Toggle enabled state
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    /**
     * Serialize to JSON
     */
    toJSON() {
        return {
            type: this.name,
            enabled: this.enabled,
            intensity: this.intensity
        };
    }
}

/**
 * EffectChain - Chain multiple effects together
 */
export class EffectChain {
    constructor() {
        this.effects = [];
    }

    /**
     * Add an effect to the chain
     */
    add(effect) {
        this.effects.push(effect);
        return this;
    }

    /**
     * Remove an effect from the chain
     */
    remove(effect) {
        const idx = this.effects.indexOf(effect);
        if (idx !== -1) {
            this.effects.splice(idx, 1);
        }
        return this;
    }

    /**
     * Get effect by name
     */
    get(name) {
        return this.effects.find(e => e.name === name) || null;
    }

    /**
     * Apply all enabled effects in sequence
     */
    apply(input, output, context = {}) {
        let current = input;
        for (const effect of this.effects) {
            if (effect.enabled) {
                effect.apply(current, output, context);
                current = output;
            }
        }
        return output;
    }

    /**
     * Get combined CSS filter string
     */
    getCSSFilter() {
        return this.effects
            .filter(e => e.enabled)
            .map(e => e.getCSSFilter())
            .filter(f => f)
            .join(' ');
    }

    /**
     * Get all uniforms for shader
     */
    getUniforms() {
        const uniforms = {};
        for (const effect of this.effects) {
            if (effect.enabled) {
                Object.assign(uniforms, effect.getUniforms());
            }
        }
        return uniforms;
    }

    /**
     * Set all effects enabled/disabled
     */
    setAllEnabled(enabled) {
        for (const effect of this.effects) {
            effect.enabled = enabled;
        }
        return this;
    }

    /**
     * Serialize chain
     */
    toJSON() {
        return {
            effects: this.effects.map(e => e.toJSON())
        };
    }
}

export default Effect;
