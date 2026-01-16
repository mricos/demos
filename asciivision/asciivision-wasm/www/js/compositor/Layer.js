/**
 * Layer - Base class for all visual layers in the compositor
 * Each layer renders to a DOM element with CSS-based effects
 */
import { GlowEffect } from '../shared/effects/GlowEffect.js';

export class Layer {
    constructor(id, options = {}) {
        this.id = id;
        this.visible = options.visible !== false;
        this.zIndex = options.zIndex || 0;

        // CSS-based effects
        this.effects = {
            color: options.color || null,
            opacity: options.opacity !== undefined ? options.opacity : 1.0,
            blur: options.blur || 0,
            glow: options.glow || 0,
            invert: options.invert || false,
            brightness: options.brightness || 1.0,
            contrast: options.contrast || 1.0
        };

        // DOM element for rendering
        this.element = options.element || null;

        // Grid dimensions
        this.width = 0;
        this.height = 0;
    }

    /**
     * Render layer content - override in subclasses
     * @param {*} data - Layer-specific render data
     */
    render(data) {
        throw new Error('Layer.render() must be implemented by subclass');
    }

    /**
     * Resize the layer grid
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    /**
     * Clear layer content
     */
    clear() {
        if (this.element) {
            if (this.element.tagName === 'CANVAS') {
                const ctx = this.element.getContext('2d');
                ctx.clearRect(0, 0, this.element.width, this.element.height);
            } else {
                this.element.textContent = '';
            }
        }
    }

    /**
     * Set layer visibility
     */
    setVisible(visible) {
        this.visible = visible;
        if (this.element) {
            this.element.style.display = visible ? '' : 'none';
        }
    }

    /**
     * Toggle visibility
     * @returns {boolean} New visibility state
     */
    toggle() {
        this.setVisible(!this.visible);
        return this.visible;
    }

    /**
     * Apply CSS effects to DOM element
     */
    applyEffects() {
        if (!this.element) return;

        const e = this.effects;
        const filters = [];

        if (e.blur > 0) filters.push(`blur(${e.blur}px)`);
        if (e.invert) filters.push('invert(1)');
        if (e.brightness !== 1.0) filters.push(`brightness(${e.brightness})`);
        if (e.contrast !== 1.0) filters.push(`contrast(${e.contrast})`);

        this.element.style.filter = filters.length ? filters.join(' ') : '';
        this.element.style.opacity = e.opacity;

        if (e.color) {
            this.element.style.color = e.color;
        }

        if (e.glow > 0) {
            this.element.style.textShadow = `0 0 ${e.glow}px currentColor`;
        } else {
            this.element.style.textShadow = '';
        }
    }

    /**
     * Set a single effect and apply
     */
    setEffect(name, value) {
        if (name in this.effects) {
            this.effects[name] = value;
            this.applyEffects();
        }
    }

    /**
     * Set multiple effects at once
     */
    setEffects(effects) {
        Object.assign(this.effects, effects);
        this.applyEffects();
    }

    /**
     * Get current effect values
     */
    getEffects() {
        return { ...this.effects };
    }

    /**
     * Reset effects to defaults
     */
    resetEffects() {
        this.effects = {
            color: null,
            opacity: 1.0,
            blur: 0,
            glow: 0,
            invert: false,
            brightness: 1.0,
            contrast: 1.0
        };
        this.applyEffects();
    }
}
