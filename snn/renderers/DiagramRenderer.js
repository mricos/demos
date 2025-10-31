/**
 * DiagramRenderer.js
 *
 * Renders static LIF model diagram with equation and idealized membrane potential curve.
 */

import { NeuronRendererBase } from './NeuronRendererBase.js';

export class DiagramRenderer extends NeuronRendererBase {
  /**
   * Render static LIF model diagram with equation
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} modelState
   * @param {object} bounds
   */
  render(ctx, modelState, bounds) {
    const { x: startX, y: startY, width, height } = bounds;
    const padding = 20;
    const plotX = startX + padding;
    const plotY = startY + padding;
    const plotW = width - padding * 2;
    const plotH = height - padding * 2;

    // Title
    ctx.fillStyle = this.colors.soma;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Leaky Integrate-and-Fire Model Dynamics', plotX, startY + 8);

    // Equation with color-coded variables
    this._drawEquation(ctx, plotX, startY);

    // Parameters with color-coded values
    this._drawParameters(ctx, modelState, plotX, startY);

    // Diagram area
    const diagramY = startY + 65;
    const diagramH = height - 75;
    const baselineY = diagramY + diagramH;

    // Draw axes
    this._drawAxes(ctx, plotX, plotW, diagramY, diagramH, baselineY);

    // Threshold line
    this._drawThresholdLine(ctx, plotX, plotW, diagramY, diagramH);

    // Draw idealized membrane potential curve
    this._drawIdealizedCurve(ctx, plotX, plotW, diagramY, diagramH, baselineY);

    // Time axis label
    ctx.fillStyle = this.colors.label;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time (ms)', plotX + plotW / 2, baselineY + 18);
  }

  _drawEquation(ctx, plotX, startY) {
    ctx.font = '10px sans-serif';
    let xPos = plotX;

    ctx.fillStyle = this.colors.membrane;
    ctx.fillText('V', xPos, startY + 26);
    xPos += ctx.measureText('V').width;
    ctx.fillStyle = this.colors.somaText;
    ctx.fillText('(t+Δt) = ', xPos, startY + 26);
    xPos += ctx.measureText('(t+Δt) = ').width;
    ctx.fillStyle = this.colors.membrane;
    ctx.fillText('V', xPos, startY + 26);
    xPos += ctx.measureText('V').width;
    ctx.fillStyle = this.colors.somaText;
    ctx.fillText('(t) · e^(-Δt/', xPos, startY + 26);
    xPos += ctx.measureText('(t) · e^(-Δt/').width;
    ctx.fillStyle = this.colors.tau;
    ctx.fillText('τ', xPos, startY + 26);
    xPos += ctx.measureText('τ').width;
    ctx.fillStyle = this.colors.somaText;
    ctx.fillText(') + I(t)', xPos, startY + 26);
  }

  _drawParameters(ctx, modelState, plotX, startY) {
    ctx.font = '9px sans-serif';
    let xPos = plotX;
    ctx.fillStyle = this.colors.tau;
    ctx.fillText('τ', xPos, startY + 40);
    xPos += ctx.measureText('τ').width;
    ctx.fillStyle = this.colors.label;
    ctx.fillText(` = ${modelState.tau} ms   `, xPos, startY + 40);
    xPos += ctx.measureText(` = ${modelState.tau} ms   `).width;
    ctx.fillStyle = this.colors.threshold;
    ctx.fillText('Vth', xPos, startY + 40);
    xPos += ctx.measureText('Vth').width;
    ctx.fillStyle = this.colors.label;
    ctx.fillText(` = ${modelState.threshold.toFixed(1)}   `, xPos, startY + 40);
    xPos += ctx.measureText(` = ${modelState.threshold.toFixed(1)}   `).width;
    ctx.fillStyle = this.colors.membrane;
    ctx.fillText('V', xPos, startY + 40);
    xPos += ctx.measureText('V').width;
    ctx.fillStyle = this.colors.label;
    ctx.fillText(` = ${modelState.membrane.toFixed(3)}`, xPos, startY + 40);
  }

  _drawAxes(ctx, plotX, plotW, diagramY, diagramH, baselineY) {
    ctx.strokeStyle = this.colors.label;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(plotX, diagramY);
    ctx.lineTo(plotX, baselineY);
    ctx.lineTo(plotX + plotW, baselineY);
    ctx.stroke();
  }

  _drawThresholdLine(ctx, plotX, plotW, diagramY, diagramH) {
    const thresholdY = diagramY + diagramH * 0.2;
    ctx.strokeStyle = this.colors.threshold;
    ctx.lineWidth = 2;
    this._drawDashedLine(ctx, plotX, thresholdY, plotX + plotW, thresholdY, [6, 3]);

    ctx.fillStyle = this.colors.threshold;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Vth', plotX + plotW + 5, thresholdY + 4);
  }

  _drawIdealizedCurve(ctx, plotX, plotW, diagramY, diagramH, baselineY) {
    // Draw idealized membrane potential curve (integrate → spike → reset)
    ctx.strokeStyle = this.colors.membrane;
    ctx.lineWidth = 3;
    ctx.beginPath();

    // First integration phase
    const path1 = [
      [50, 200], [80, 190], [110, 175], [140, 155],
      [170, 130], [200, 100], [230, 75], [250, 60]
    ];
    path1.forEach(([x, y], i) => {
      const nx = plotX + (x / 600) * plotW;
      const ny = diagramY + (y / 250) * diagramH;
      if (i === 0) ctx.moveTo(nx, ny);
      else ctx.lineTo(nx, ny);
    });
    ctx.stroke();

    // Spike
    const spikeX = plotX + (250 / 600) * plotW;
    const spikeTop = diagramY + (20 / 250) * diagramH;
    ctx.strokeStyle = this.colors.sodium;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(spikeX, diagramY + (60 / 250) * diagramH);
    ctx.lineTo(spikeX, spikeTop);
    ctx.stroke();

    // Spike marker
    ctx.fillStyle = this.colors.sodium;
    ctx.beginPath();
    ctx.arc(spikeX, spikeTop, 4, 0, Math.PI * 2);
    ctx.fill();

    // Spike label
    ctx.fillStyle = this.colors.sodium;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Spike!', spikeX, spikeTop - 8);

    // Reset line
    ctx.strokeStyle = this.colors.sodium;
    ctx.lineWidth = 2;
    this._drawDashedLine(ctx, spikeX, spikeTop, plotX + (260 / 600) * plotW, baselineY, [3, 3]);

    // Second integration phase
    ctx.strokeStyle = this.colors.membrane;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const path2 = [
      [260, 200], [290, 190], [320, 180], [350, 170],
      [380, 158], [410, 145], [440, 130], [470, 112], [500, 92], [530, 75]
    ];
    path2.forEach(([x, y], i) => {
      const nx = plotX + (x / 600) * plotW;
      const ny = diagramY + (y / 250) * diagramH;
      if (i === 0) ctx.moveTo(nx, ny);
      else ctx.lineTo(nx, ny);
    });
    ctx.stroke();
  }
}

export default DiagramRenderer;
