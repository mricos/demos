/**
 * SpikeTrainRenderer.js
 *
 * Renders spike train visualization (raster plot) with temporal window.
 */

import { NeuronRendererBase } from './NeuronRendererBase.js';

export class SpikeTrainRenderer extends NeuronRendererBase {
  /**
   * Render spike train visualization
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} modelState
   * @param {object} bounds
   */
  render(ctx, modelState, bounds) {
    const { x: startX, y: startY, width, height } = bounds;
    const padding = 25;
    const plotX = startX + padding;
    const plotW = width - padding * 2;

    // Title
    ctx.fillStyle = this.colors.label;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Spike Train', plotX, startY + 15);

    // Spike train area
    const trainTop = startY + 40;
    const trainHeight = height - 60;
    const timelineY = trainTop + trainHeight / 2;

    // NOW is at the LEFT edge
    const nowX = plotX;
    const timeWindow = 300;
    const integrationWindowDuration = 40;

    // Draw integration window (shaded region)
    this._drawIntegrationWindow(ctx, nowX, trainTop, trainHeight, integrationWindowDuration, timeWindow, plotW);

    // Draw timeline
    this._drawTimeline(ctx, plotX, plotW, timelineY);

    // Draw spike events as vertical bars
    this._drawSpikes(ctx, modelState, nowX, timelineY, timeWindow, plotW);

    // Draw NOW marker
    this._drawNowMarker(ctx, nowX, trainTop, trainHeight);

    // Labels
    this._drawLabels(ctx, modelState, nowX, plotX, plotW, trainTop, timelineY, timeWindow, integrationWindowDuration);
  }

  _drawIntegrationWindow(ctx, nowX, trainTop, trainHeight, integrationWindowDuration, timeWindow, plotW) {
    const windowWidth = (integrationWindowDuration / timeWindow) * plotW;
    ctx.fillStyle = 'rgba(247, 185, 85, 0.12)';
    ctx.fillRect(nowX, trainTop, windowWidth, trainHeight);

    // Draw window boundary lines
    ctx.strokeStyle = 'rgba(247, 185, 85, 0.4)';
    ctx.lineWidth = 1;
    this._drawDashedLine(ctx, nowX, trainTop, nowX, trainTop + trainHeight, [3, 3]);
    this._drawDashedLine(ctx, nowX + windowWidth, trainTop, nowX + windowWidth, trainTop + trainHeight, [3, 3]);
  }

  _drawTimeline(ctx, plotX, plotW, timelineY) {
    ctx.strokeStyle = this.colors.label;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX, timelineY);
    ctx.lineTo(plotX + plotW, timelineY);
    ctx.stroke();
  }

  _drawSpikes(ctx, modelState, nowX, timelineY, timeWindow, plotW) {
    modelState.spikes.forEach(spike => {
      const age = modelState.time - spike.time;
      if (age >= 0 && age < timeWindow) {
        const x = nowX + (age / timeWindow) * plotW;
        const barHeight = 55;

        // Spike bar
        ctx.fillStyle = this.colors.sodium;
        ctx.fillRect(x - 2, timelineY - barHeight, 4, barHeight);

        // Spike marker circle
        ctx.fillStyle = this.colors.sodium;
        ctx.beginPath();
        ctx.arc(x, timelineY - barHeight, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  _drawNowMarker(ctx, nowX, trainTop, trainHeight) {
    ctx.strokeStyle = this.colors.threshold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(nowX, trainTop - 5);
    ctx.lineTo(nowX, trainTop + trainHeight + 5);
    ctx.stroke();
  }

  _drawLabels(ctx, modelState, nowX, plotX, plotW, trainTop, timelineY, timeWindow, integrationWindowDuration) {
    // NOW label
    ctx.fillStyle = this.colors.threshold;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('NOW', nowX + 3, trainTop - 10);

    // Window duration label
    const windowWidth = (integrationWindowDuration / timeWindow) * plotW;
    ctx.font = '8px sans-serif';
    ctx.fillStyle = this.colors.tau;
    ctx.fillText(`(${integrationWindowDuration}ms = 2τ)`, nowX + windowWidth / 2, trainTop - 5);

    // Time axis labels
    ctx.fillStyle = this.colors.label;
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    for (let t = 0; t <= timeWindow; t += 100) {
      const x = nowX + (t / timeWindow) * plotW;
      if (x >= plotX && x <= plotX + plotW) {
        ctx.fillText(`${(modelState.time - t).toFixed(0)}`, x, timelineY + 25);
      }
    }

    ctx.fillText('Time (ms)', plotX + plotW / 2, timelineY + 42);

    // Labels for temporal regions
    ctx.fillStyle = 'rgba(159, 178, 198, 0.6)';
    ctx.font = 'italic 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Future', plotX + plotW * 0.05, trainTop + 10);
    ctx.textAlign = 'right';
    ctx.fillText('Past', plotX + plotW, trainTop + 10);
  }
}

export default SpikeTrainRenderer;
