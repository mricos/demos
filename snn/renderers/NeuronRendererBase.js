/**
 * NeuronRendererBase.js
 *
 * Base class for neuron visualization renderers.
 * Provides common utilities and animation state shared across all renderers.
 */

import { theme } from '../core/theme.js';

export class NeuronRendererBase {
  constructor(config = {}) {
    // Color theme (can be overridden)
    this.colors = {
      ...theme,
      ...config.theme
    };

    // Animation state (for continuous animations like synaptic activity)
    this.synapticPhase = 0;
    this.actionPotentialSpeed = 2.0;  // pixels/ms
  }

  /**
   * Update animation parameters based on elapsed time
   * @param {number} dt - Time delta in milliseconds
   */
  updateAnimations(dt) {
    this.synapticPhase += dt * 0.008;
  }

  /**
   * Draw a dashed line
   * @protected
   */
  _drawDashedLine(ctx, x1, y1, x2, y2, dashPattern = [6, 3]) {
    ctx.setLineDash(dashPattern);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * Draw text with rotation
   * @protected
   */
  _drawRotatedText(ctx, text, x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  /**
   * Abstract render method - must be implemented by subclasses
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} modelState - {membrane, time, lastSpike, spikes, threshold, tau, input}
   * @param {object} bounds - {x, y, width, height}
   */
  render(ctx, modelState, bounds) {
    throw new Error('NeuronRendererBase.render() must be implemented by subclass');
  }
}

export default NeuronRendererBase;
