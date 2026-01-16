import { Layer } from '../Layer.js';
import { HUDRenderer } from '../../hud.js';

/**
 * HUDLayer - Canvas-based HUD with dial, meters, and position indicator
 */
export class HUDLayer extends Layer {
    constructor(canvas, options = {}) {
        super('hud', {
            element: canvas,
            zIndex: 20,
            ...options
        });
        this.renderer = new HUDRenderer(canvas);
    }

    /**
     * Resize canvas and renderer
     */
    resize(width, height) {
        super.resize(width, height);
        if (this.renderer) {
            this.renderer.resize();
        }
    }

    /**
     * Render HUD with hand data
     * @param {Object} handData - { x, y, theta, spread, reverse, phase, landmarks }
     */
    render(handData) {
        if (!this.visible) {
            this.clear();
            return;
        }
        if (this.renderer && handData) {
            this.renderer.render(handData);
        } else if (this.renderer) {
            this.renderer.clear();
        }
    }

    /**
     * Clear HUD canvas
     */
    clear() {
        if (this.renderer) {
            this.renderer.clear();
        }
    }

    /**
     * Apply effects - canvas uses opacity directly
     */
    applyEffects() {
        if (this.element) {
            this.element.style.opacity = this.effects.opacity;
            // Note: CSS filters on canvas may affect performance
            // Keep minimal for canvas layers
        }
    }
}
