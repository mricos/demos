/**
 * PhosphorEffect - CRT phosphor persistence/decay effect
 * Creates ghosting trails as bright elements fade over time
 */

import { Effect } from './Effect.js';

export class PhosphorEffect extends Effect {
    constructor(options = {}) {
        super(options);
        this.name = 'PhosphorEffect';

        // Decay rate (0 = instant, 1 = never fades)
        this.decay = options.decay ?? 0.92;

        // Color temperature shift during decay (warmer = more red/orange)
        this.warmth = options.warmth ?? 0.1;

        // Previous frame buffer (for blending)
        this.previousFrame = null;
        this.currentFrame = null;
    }

    /**
     * Apply phosphor persistence effect
     * @param {ImageData|CanvasRenderingContext2D} input
     * @param {CanvasRenderingContext2D} output
     * @param {Object} context - {time, dt}
     */
    apply(input, output, context = {}) {
        if (!this.enabled) return;

        const canvas = output.canvas;
        const width = canvas.width;
        const height = canvas.height;

        // Get current frame
        let currentData;
        if (input instanceof ImageData) {
            currentData = input;
        } else {
            currentData = input.getImageData(0, 0, width, height);
        }

        // Initialize previous frame if needed
        if (!this.previousFrame || this.previousFrame.width !== width) {
            this.previousFrame = output.createImageData(width, height);
        }

        const current = currentData.data;
        const previous = this.previousFrame.data;
        const result = output.createImageData(width, height);
        const out = result.data;

        const decay = this.decay * this.intensity;
        const warmth = this.warmth;

        for (let i = 0; i < current.length; i += 4) {
            // Decay previous frame
            const prevR = previous[i] * decay;
            const prevG = previous[i + 1] * decay * (1 - warmth * 0.5);
            const prevB = previous[i + 2] * decay * (1 - warmth);

            // Combine with current (max blend for glow effect)
            out[i] = Math.max(current[i], prevR);
            out[i + 1] = Math.max(current[i + 1], prevG);
            out[i + 2] = Math.max(current[i + 2], prevB);
            out[i + 3] = 255;

            // Store for next frame
            previous[i] = out[i];
            previous[i + 1] = out[i + 1];
            previous[i + 2] = out[i + 2];
            previous[i + 3] = 255;
        }

        output.putImageData(result, 0, 0);
    }

    /**
     * Get GLSL fragment shader code for this effect
     */
    getShaderCode() {
        return `
            uniform sampler2D u_currentFrame;
            uniform sampler2D u_previousFrame;
            uniform float u_phosphorDecay;
            uniform float u_phosphorWarmth;

            vec4 applyPhosphor(vec2 uv) {
                vec4 current = texture2D(u_currentFrame, uv);
                vec4 previous = texture2D(u_previousFrame, uv);

                // Decay with color temperature shift
                vec3 decayed = previous.rgb * u_phosphorDecay;
                decayed.g *= 1.0 - u_phosphorWarmth * 0.5;
                decayed.b *= 1.0 - u_phosphorWarmth;

                // Max blend for glow
                return vec4(max(current.rgb, decayed), 1.0);
            }
        `;
    }

    getUniforms() {
        return {
            ...super.getUniforms(),
            phosphorDecay: this.decay,
            phosphorWarmth: this.warmth
        };
    }

    /**
     * Set decay rate
     */
    setDecay(value) {
        this.decay = Math.max(0, Math.min(1, value));
        return this;
    }

    /**
     * Set warmth (color temperature shift)
     */
    setWarmth(value) {
        this.warmth = Math.max(0, Math.min(1, value));
        return this;
    }

    /**
     * Reset persistence buffer
     */
    reset() {
        if (this.previousFrame) {
            this.previousFrame.data.fill(0);
        }
        return this;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            decay: this.decay,
            warmth: this.warmth
        };
    }
}

export default PhosphorEffect;
