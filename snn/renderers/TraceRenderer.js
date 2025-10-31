/**
 * TraceRenderer.js
 *
 * Renders live membrane potential trace with integration window.
 */

import { NeuronRendererBase } from './NeuronRendererBase.js';

export class TraceRenderer extends NeuronRendererBase {
  /**
   * Render live membrane potential trace
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} modelState
   * @param {object} bounds
   */
  render(ctx, modelState, bounds) {
    const { x: startX, y: startY, width, height } = bounds;
    const padding = 20;
    const plotX = startX + padding;
    const plotW = width - padding * 2;

    // Title
    ctx.fillStyle = this.colors.label;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Live Membrane Potential', plotX, startY + 12);

    // Trace area
    const traceTop = startY + 35;
    const traceHeight = height - 60;
    const traceBottom = traceTop + traceHeight;

    // Draw axes
    this._drawAxes(ctx, plotX, plotW, traceTop, traceBottom);

    // Threshold line
    this._drawThresholdLine(ctx, modelState, plotX, plotW, traceTop, traceHeight, traceBottom);

    // NOW is at the LEFT edge
    const nowX = plotX;
    const integrationWindowDuration = 40; // 2τ
    const timeWindow = 200;

    // Draw integration window (shaded region)
    this._drawIntegrationWindow(ctx, nowX, traceTop, traceHeight, integrationWindowDuration, timeWindow, plotW);

    // Draw membrane potential trace
    this._drawMembranePotential(ctx, modelState, nowX, traceTop, traceHeight, traceBottom, timeWindow, plotW);

    // NOW label
    this._drawNowLabel(ctx, nowX, traceTop, integrationWindowDuration, timeWindow, plotW);

    // Y-axis label
    this._drawYAxisLabel(ctx, plotX, traceTop, traceBottom);
  }

  _drawAxes(ctx, plotX, plotW, traceTop, traceBottom) {
    ctx.strokeStyle = this.colors.label;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX, traceTop);
    ctx.lineTo(plotX, traceBottom);
    ctx.lineTo(plotX + plotW, traceBottom);
    ctx.stroke();
  }

  _drawThresholdLine(ctx, modelState, plotX, plotW, traceTop, traceHeight, traceBottom) {
    const thresholdY = traceBottom - (modelState.threshold / 2.0) * traceHeight;
    ctx.strokeStyle = this.colors.threshold;
    ctx.lineWidth = 1.5;
    this._drawDashedLine(ctx, plotX, thresholdY, plotX + plotW, thresholdY, [4, 2]);

    ctx.fillStyle = this.colors.threshold;
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Vth', plotX - 3, thresholdY + 3);
  }

  _drawIntegrationWindow(ctx, nowX, traceTop, traceHeight, integrationWindowDuration, timeWindow, plotW) {
    const windowWidth = (integrationWindowDuration / timeWindow) * plotW;
    ctx.fillStyle = 'rgba(247, 185, 85, 0.15)';
    ctx.fillRect(nowX, traceTop, windowWidth, traceHeight);
  }

  _drawMembranePotential(ctx, modelState, nowX, traceTop, traceHeight, traceBottom, timeWindow, plotW) {
    ctx.strokeStyle = this.colors.membrane;
    ctx.lineWidth = 2;
    ctx.beginPath();

    let tempMembrane = modelState.membrane;
    let tempTime = modelState.time;

    for (let t = 0; t < timeWindow; t += 2) {
      const x = nowX + (t / timeWindow) * plotW;
      const v = Math.max(0, Math.min(2, tempMembrane));
      const y = traceBottom - (v / 2.0) * traceHeight;

      if (t === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      tempMembrane = tempMembrane * Math.exp(-2 / modelState.tau) - 0.1;
      const spikeTimes = modelState.spikes.map(s => Math.round(s.time));
      if (spikeTimes.includes(Math.round(tempTime - t))) {
        tempMembrane = 0;
      }
    }
    ctx.stroke();
  }

  _drawNowLabel(ctx, nowX, traceTop, integrationWindowDuration, timeWindow, plotW) {
    const windowWidth = (integrationWindowDuration / timeWindow) * plotW;
    ctx.fillStyle = this.colors.threshold;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('NOW', nowX + 3, traceTop - 5);
    ctx.font = '7px sans-serif';
    ctx.fillStyle = this.colors.tau;
    ctx.fillText(`(2τ window)`, nowX + windowWidth / 2, traceTop - 14);
  }

  _drawYAxisLabel(ctx, plotX, traceTop, traceBottom) {
    ctx.fillStyle = this.colors.label;
    ctx.font = '9px sans-serif';
    this._drawRotatedText(ctx, 'V', plotX - 12, (traceTop + traceBottom) / 2, -Math.PI / 2);
  }
}

export default TraceRenderer;
