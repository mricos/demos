/**
 * TTFSRenderer.js
 *
 * Renders Time-To-First-Spike (TTFS) binary detector visualization.
 */

import { NeuronRendererBase } from './NeuronRendererBase.js';

export class TTFSRenderer extends NeuronRendererBase {
  /**
   * Render TTFS binary detector
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} modelState
   * @param {object} ttfsState - {encodingWindowStart, encodingWindowDuration, ttfsThreshold, detectedBit}
   * @param {object} bounds
   */
  render(ctx, modelState, ttfsState, bounds) {
    const { x: startX, y: startY, width, height } = bounds;
    const padding = 20;
    const plotX = startX + padding;
    const plotW = width - padding * 2;

    // Title
    ctx.fillStyle = this.colors.label;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TTFS Binary Output', plotX, startY + 5);

    const displayY = startY + 30;

    if (ttfsState.detectedBit !== null) {
      this._drawDetectedBit(ctx, ttfsState, plotX, plotW, displayY);
    } else {
      this._drawWaitingState(ctx, modelState, ttfsState, plotX, plotW, displayY);
    }
  }

  _drawDetectedBit(ctx, ttfsState, plotX, plotW, displayY) {
    const bitColor = ttfsState.detectedBit === 1 ? '#29d398' : '#9fb2c6';
    const bitLabel = ttfsState.detectedBit === 1 ? 'BIT 1' : 'BIT 0';

    // Large bit display
    ctx.fillStyle = bitColor;
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ttfsState.detectedBit.toString(), plotX + plotW / 2, displayY + 30);

    // Label
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(bitLabel, plotX + plotW / 2, displayY + 55);

    // Description
    ctx.fillStyle = this.colors.label;
    ctx.font = '10px sans-serif';
    const desc = ttfsState.detectedBit === 1 ? 'Early spike detected' : 'Late/no spike detected';
    ctx.fillText(desc, plotX + plotW / 2, displayY + 70);
  }

  _drawWaitingState(ctx, modelState, ttfsState, plotX, plotW, displayY) {
    // Waiting for detection
    const windowAge = modelState.time - ttfsState.encodingWindowStart;
    const progress = Math.min(1, windowAge / ttfsState.encodingWindowDuration);

    ctx.fillStyle = this.colors.label;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for spike...', plotX + plotW / 2, displayY + 30);

    // Show encoding window progress
    const barWidth = plotW * 0.6;
    const barX = plotX + (plotW - barWidth) / 2;
    const barY = displayY + 45;

    ctx.strokeStyle = this.colors.label;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, 8);

    ctx.fillStyle = this.colors.threshold;
    ctx.fillRect(barX, barY, barWidth * progress, 8);
  }
}

export default TTFSRenderer;
