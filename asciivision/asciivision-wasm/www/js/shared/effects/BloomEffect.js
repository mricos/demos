/**
 * BloomEffect - Glow/bloom effect for bright areas
 * Creates soft glow around bright elements
 */

import { Effect } from './Effect.js';

export class BloomEffect extends Effect {
    constructor(options = {}) {
        super(options);
        this.name = 'BloomEffect';

        // Bloom radius in pixels
        this.radius = options.radius ?? 4;

        // Brightness threshold (0-1, below this won't bloom)
        this.threshold = options.threshold ?? 0.5;

        // Soft knee for smooth threshold transition
        this.softKnee = options.softKnee ?? 0.5;

        // Blur passes (more = smoother but slower)
        this.passes = options.passes ?? 2;

        // Work canvas for blur operations
        this._workCanvas = null;
        this._workCtx = null;
    }

    /**
     * Apply bloom effect
     * @param {CanvasRenderingContext2D} input
     * @param {CanvasRenderingContext2D} output
     * @param {Object} context
     */
    apply(input, output, context = {}) {
        if (!this.enabled || this.intensity === 0) return;

        const canvas = output.canvas;
        const width = canvas.width;
        const height = canvas.height;

        // Initialize work canvas
        if (!this._workCanvas || this._workCanvas.width !== width) {
            this._workCanvas = document.createElement('canvas');
            this._workCanvas.width = width;
            this._workCanvas.height = height;
            this._workCtx = this._workCanvas.getContext('2d');
        }

        // Copy input to output first
        output.drawImage(input.canvas, 0, 0);

        // Extract bright areas
        const imageData = input.getImageData(0, 0, width, height);
        const data = imageData.data;
        const threshold = this.threshold * 255;

        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (brightness < threshold) {
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = 0;
            }
        }

        this._workCtx.putImageData(imageData, 0, 0);

        // Apply blur passes
        for (let pass = 0; pass < this.passes; pass++) {
            this._blurPass(this._workCtx, this.radius);
        }

        // Additive blend bloom onto output
        output.globalCompositeOperation = 'lighter';
        output.globalAlpha = this.intensity;
        output.drawImage(this._workCanvas, 0, 0);
        output.globalCompositeOperation = 'source-over';
        output.globalAlpha = 1;
    }

    /**
     * Simple box blur pass
     */
    _blurPass(ctx, radius) {
        const canvas = ctx.canvas;
        ctx.filter = `blur(${radius}px)`;
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
    }

    /**
     * Get CSS filter for simple bloom approximation
     */
    getCSSFilter() {
        if (!this.enabled || this.intensity === 0) return '';
        // CSS can't do true bloom, but we can approximate with drop-shadow
        return '';
    }

    /**
     * Get GLSL fragment shader code
     */
    getShaderCode() {
        return `
            uniform sampler2D u_texture;
            uniform float u_bloomIntensity;
            uniform float u_bloomThreshold;
            uniform float u_bloomRadius;

            vec4 applyBloom(vec2 uv, vec2 texelSize) {
                vec4 color = texture2D(u_texture, uv);

                // Sample surrounding pixels for blur
                vec4 bloom = vec4(0.0);
                float total = 0.0;

                for (float x = -2.0; x <= 2.0; x++) {
                    for (float y = -2.0; y <= 2.0; y++) {
                        vec2 offset = vec2(x, y) * texelSize * u_bloomRadius;
                        vec4 sample = texture2D(u_texture, uv + offset);

                        // Only bloom bright areas
                        float brightness = dot(sample.rgb, vec3(0.299, 0.587, 0.114));
                        if (brightness > u_bloomThreshold) {
                            float weight = 1.0 - length(vec2(x, y)) / 4.0;
                            bloom += sample * weight;
                            total += weight;
                        }
                    }
                }

                if (total > 0.0) {
                    bloom /= total;
                }

                return color + bloom * u_bloomIntensity;
            }
        `;
    }

    getUniforms() {
        return {
            ...super.getUniforms(),
            bloomIntensity: this.intensity,
            bloomThreshold: this.threshold,
            bloomRadius: this.radius
        };
    }

    /**
     * Set bloom radius
     */
    setRadius(value) {
        this.radius = Math.max(1, value);
        return this;
    }

    /**
     * Set brightness threshold
     */
    setThreshold(value) {
        this.threshold = Math.max(0, Math.min(1, value));
        return this;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            radius: this.radius,
            threshold: this.threshold,
            softKnee: this.softKnee,
            passes: this.passes
        };
    }
}

export default BloomEffect;
