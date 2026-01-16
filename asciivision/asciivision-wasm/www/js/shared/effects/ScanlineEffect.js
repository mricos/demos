/**
 * ScanlineEffect - CRT scanline simulation
 * Creates horizontal scan lines like old CRT monitors
 */

import { Effect } from './Effect.js';

export class ScanlineEffect extends Effect {
    constructor(options = {}) {
        super(options);
        this.name = 'ScanlineEffect';

        // Scanline spacing (pixels between lines)
        this.spacing = options.spacing ?? 2;

        // Scanline thickness (0-1, relative to spacing)
        this.thickness = options.thickness ?? 0.5;

        // Scanline opacity (0-1)
        this.opacity = options.opacity ?? 0.3;

        // Scroll speed (0 = static, positive = scroll down)
        this.scrollSpeed = options.scrollSpeed ?? 0;

        // Current scroll offset
        this._scrollOffset = 0;

        // Cached pattern
        this._pattern = null;
        this._patternCanvas = null;
    }

    /**
     * Apply scanline effect
     * @param {CanvasRenderingContext2D} input
     * @param {CanvasRenderingContext2D} output
     * @param {Object} context - {time, dt}
     */
    apply(input, output, context = {}) {
        if (!this.enabled || this.intensity === 0) return;

        const canvas = output.canvas;
        const width = canvas.width;
        const height = canvas.height;

        // Copy input to output first
        output.drawImage(input.canvas, 0, 0);

        // Update scroll
        if (this.scrollSpeed !== 0 && context.dt) {
            this._scrollOffset += this.scrollSpeed * context.dt * 60;
            this._scrollOffset %= this.spacing;
        }

        // Create or update pattern
        this._updatePattern();

        // Apply scanlines with pattern
        output.globalAlpha = this.opacity * this.intensity;
        output.globalCompositeOperation = 'multiply';

        // Tile pattern over canvas
        const pattern = output.createPattern(this._patternCanvas, 'repeat');
        output.fillStyle = pattern;

        // Apply scroll offset
        output.save();
        output.translate(0, this._scrollOffset);
        output.fillRect(0, -this._scrollOffset, width, height + this.spacing);
        output.restore();

        output.globalCompositeOperation = 'source-over';
        output.globalAlpha = 1;
    }

    /**
     * Update scanline pattern
     */
    _updatePattern() {
        const spacing = Math.max(1, Math.round(this.spacing));
        const lineHeight = Math.max(1, Math.round(spacing * this.thickness));

        // Check if pattern needs update
        if (this._patternCanvas &&
            this._patternCanvas.height === spacing &&
            this._lastLineHeight === lineHeight) {
            return;
        }

        // Create pattern canvas
        if (!this._patternCanvas) {
            this._patternCanvas = document.createElement('canvas');
        }

        this._patternCanvas.width = 1;
        this._patternCanvas.height = spacing;
        this._lastLineHeight = lineHeight;

        const ctx = this._patternCanvas.getContext('2d');

        // Clear
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 1, spacing);

        // Draw dark scanline
        ctx.fillStyle = 'black';
        ctx.fillRect(0, spacing - lineHeight, 1, lineHeight);
    }

    /**
     * Get CSS for scanline overlay
     * Can be applied as a pseudo-element or overlay div
     */
    getCSSBackground() {
        if (!this.enabled || this.intensity === 0) return '';

        const spacing = this.spacing;
        const lineHeight = spacing * this.thickness;

        return `repeating-linear-gradient(
            0deg,
            transparent,
            transparent ${spacing - lineHeight}px,
            rgba(0, 0, 0, ${this.opacity * this.intensity}) ${spacing - lineHeight}px,
            rgba(0, 0, 0, ${this.opacity * this.intensity}) ${spacing}px
        )`;
    }

    /**
     * Get GLSL fragment shader code
     */
    getShaderCode() {
        return `
            uniform float u_scanlineSpacing;
            uniform float u_scanlineThickness;
            uniform float u_scanlineOpacity;
            uniform float u_scanlineScroll;
            uniform float u_time;

            vec4 applyScanlines(vec4 color, vec2 fragCoord) {
                float line = mod(fragCoord.y + u_scanlineScroll * u_time, u_scanlineSpacing);
                float scanline = step(u_scanlineSpacing * (1.0 - u_scanlineThickness), line);
                return color * (1.0 - scanline * u_scanlineOpacity);
            }
        `;
    }

    getUniforms() {
        return {
            ...super.getUniforms(),
            scanlineSpacing: this.spacing,
            scanlineThickness: this.thickness,
            scanlineOpacity: this.opacity,
            scanlineScroll: this.scrollSpeed
        };
    }

    /**
     * Set scanline spacing
     */
    setSpacing(value) {
        this.spacing = Math.max(1, value);
        return this;
    }

    /**
     * Set line thickness
     */
    setThickness(value) {
        this.thickness = Math.max(0, Math.min(1, value));
        return this;
    }

    /**
     * Set scanline opacity
     */
    setOpacity(value) {
        this.opacity = Math.max(0, Math.min(1, value));
        return this;
    }

    /**
     * Set scroll speed
     */
    setScrollSpeed(value) {
        this.scrollSpeed = value;
        return this;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            spacing: this.spacing,
            thickness: this.thickness,
            opacity: this.opacity,
            scrollSpeed: this.scrollSpeed
        };
    }
}

export default ScanlineEffect;
