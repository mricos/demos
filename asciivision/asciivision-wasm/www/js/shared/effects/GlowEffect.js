/**
 * GlowEffect - Simple glow/outline effect
 * Adds glowing outline around elements (works with CSS and Canvas)
 */

import { Effect } from './Effect.js';

export class GlowEffect extends Effect {
    constructor(options = {}) {
        super(options);
        this.name = 'GlowEffect';

        // Glow radius in pixels
        this.radius = options.radius ?? 4;

        // Glow color (CSS color string or [r, g, b])
        this.color = options.color || 'currentColor';

        // Number of blur layers
        this.layers = options.layers ?? 3;
    }

    /**
     * Get CSS text-shadow for glow effect
     */
    getCSSTextShadow() {
        if (!this.enabled || this.intensity === 0) return '';

        const shadows = [];
        const color = this.color;
        const baseRadius = this.radius * this.intensity;

        for (let i = 0; i < this.layers; i++) {
            const r = baseRadius * (i + 1) / this.layers;
            shadows.push(`0 0 ${r}px ${color}`);
        }

        return shadows.join(', ');
    }

    /**
     * Get CSS box-shadow for glow effect
     */
    getCSSBoxShadow() {
        if (!this.enabled || this.intensity === 0) return '';

        const shadows = [];
        const color = this.color;
        const baseRadius = this.radius * this.intensity;

        for (let i = 0; i < this.layers; i++) {
            const r = baseRadius * (i + 1) / this.layers;
            shadows.push(`0 0 ${r}px ${color}`);
        }

        return shadows.join(', ');
    }

    /**
     * Get CSS filter for glow approximation
     */
    getCSSFilter() {
        if (!this.enabled || this.intensity === 0) return '';

        // drop-shadow gives a glow-like effect
        const radius = this.radius * this.intensity;
        const color = this.color === 'currentColor' ? 'rgba(255,255,255,0.8)' : this.color;
        return `drop-shadow(0 0 ${radius}px ${color})`;
    }

    /**
     * Apply glow to canvas context
     * @param {CanvasRenderingContext2D} input
     * @param {CanvasRenderingContext2D} output
     */
    apply(input, output, context = {}) {
        if (!this.enabled || this.intensity === 0) return;

        const canvas = output.canvas;

        // Apply blur for glow
        output.save();

        const radius = this.radius * this.intensity;
        const color = this.color === 'currentColor' ? '#fff' : this.color;

        // Draw blurred versions underneath
        output.filter = `blur(${radius}px)`;
        output.globalCompositeOperation = 'lighter';

        for (let i = 0; i < this.layers; i++) {
            output.globalAlpha = (1 - i / this.layers) * 0.5;
            output.drawImage(input.canvas, 0, 0);
        }

        // Draw original on top
        output.filter = 'none';
        output.globalCompositeOperation = 'source-over';
        output.globalAlpha = 1;
        output.drawImage(input.canvas, 0, 0);

        output.restore();
    }

    /**
     * Get GLSL shader code
     */
    getShaderCode() {
        return `
            uniform float u_glowRadius;
            uniform vec3 u_glowColor;
            uniform float u_glowIntensity;

            vec4 applyGlow(sampler2D tex, vec2 uv, vec2 texelSize) {
                vec4 color = texture2D(tex, uv);
                vec4 glow = vec4(0.0);

                // Sample around pixel for glow
                for (float x = -3.0; x <= 3.0; x++) {
                    for (float y = -3.0; y <= 3.0; y++) {
                        vec2 offset = vec2(x, y) * texelSize * u_glowRadius;
                        glow += texture2D(tex, uv + offset);
                    }
                }

                glow /= 49.0;
                glow.rgb = mix(glow.rgb, u_glowColor, 0.5);

                return color + glow * u_glowIntensity;
            }
        `;
    }

    getUniforms() {
        return {
            ...super.getUniforms(),
            glowRadius: this.radius,
            glowIntensity: this.intensity
        };
    }

    /**
     * Set glow radius
     */
    setRadius(value) {
        this.radius = Math.max(0, value);
        return this;
    }

    /**
     * Set glow color
     */
    setColor(color) {
        this.color = color;
        return this;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            radius: this.radius,
            color: this.color,
            layers: this.layers
        };
    }
}

export default GlowEffect;
