/**
 * CombinedTraceRenderer.js
 *
 * Renders membrane potential trace with dual pulse train comparison.
 * Shows bio-inspired (alpha) vs idealized (rectangular) input patterns.
 */

import { NeuronRendererBase } from './NeuronRendererBase.js';

export class CombinedTraceRenderer extends NeuronRendererBase {
  constructor(config = {}) {
    super(config);
    this.spikeCount = 0;  // Track total spikes
  }

  /**
   * Render combined membrane trace with spike markers
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} modelState
   * @param {object} bounds
   */
  render(ctx, modelState, bounds) {
    const { x: startX, y: startY, width, height } = bounds;
    const padding = 25;
    const plotX = startX + padding + 40;  // Extra space for labels
    const plotW = width - padding * 2 - 40;

    // Title with spike counter
    this._drawTitle(ctx, modelState, startX + padding, startY + 15);

    // Layout configuration
    const integrationWindowDuration = 40; // 2τ - the NOW window
    const futureBufferDuration = 10;      // Buffer zone before NOW
    const timeWindow = integrationWindowDuration + futureBufferDuration;  // Total visible time

    // NOW is at the LEFT edge (after future buffer)
    const futureBufferWidth = (futureBufferDuration / timeWindow) * plotW;
    const nowX = plotX + futureBufferWidth;
    const nowWindowWidth = (integrationWindowDuration / timeWindow) * plotW;

    // Vertical layout
    const pulseTrainTop = startY + 40;
    const pulseTrainHeight = 80;
    const traceTop = pulseTrainTop + pulseTrainHeight + 15;
    const traceHeight = height - (pulseTrainHeight + 100);
    const traceBottom = traceTop + traceHeight;

    // Draw dual pulse trains (above membrane trace)
    this._drawDualPulseTrains(ctx, modelState, plotX, nowX, plotW, pulseTrainTop, pulseTrainHeight,
                              timeWindow, nowWindowWidth, futureBufferWidth);

    // Draw axes for membrane trace
    this._drawAxes(ctx, plotX, plotW, traceTop, traceBottom);

    // Threshold line
    this._drawThresholdLine(ctx, modelState, plotX, plotW, traceTop, traceHeight, traceBottom);

    // Draw NOW window (shaded integration region)
    this._drawNowWindow(ctx, nowX, traceTop, traceHeight, nowWindowWidth);

    // Draw FUTURE buffer zone
    this._drawFutureBuffer(ctx, plotX, futureBufferWidth, traceTop, traceHeight);

    // Draw membrane potential trace
    this._drawMembranePotential(ctx, modelState, nowX, traceTop, traceHeight, traceBottom, timeWindow, plotW, futureBufferWidth);

    // Draw spike markers on top of trace
    this._drawSpikes(ctx, modelState, nowX, traceTop, traceBottom, traceHeight, timeWindow, plotW, futureBufferWidth);

    // NOW marker and labels
    this._drawNowMarkerAndLabels(ctx, plotX, nowX, nowWindowWidth, futureBufferWidth, traceTop, traceHeight, integrationWindowDuration);

    // PAST arrow and label
    this._drawPastLabel(ctx, plotX, plotW, traceTop, traceHeight);

    // Y-axis label
    this._drawYAxisLabel(ctx, plotX, traceTop, traceBottom);

    // Time axis labels
    this._drawTimeAxis(ctx, modelState, plotX, nowX, plotW, traceBottom, timeWindow, futureBufferDuration);
  }

  _drawTitle(ctx, modelState, x, y) {
    // Update spike count
    this.spikeCount = modelState.spikes.length;

    ctx.fillStyle = this.colors.label;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Membrane Potential & Input Comparison', x, y);

    // Spike counter on the right
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = this.colors.sodium;
    ctx.textAlign = 'right';
    ctx.fillText(`Spikes: ${this.spikeCount}`, x + 700, y);
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
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Vth', plotX - 5, thresholdY + 3);
  }

  _drawNowWindow(ctx, nowX, traceTop, traceHeight, nowWindowWidth) {
    // Shaded integration window
    ctx.fillStyle = 'rgba(74, 163, 255, 0.08)';
    ctx.fillRect(nowX, traceTop, nowWindowWidth, traceHeight);

    // Border lines
    ctx.strokeStyle = 'rgba(74, 163, 255, 0.4)';
    ctx.lineWidth = 2;
    this._drawDashedLine(ctx, nowX, traceTop, nowX, traceTop + traceHeight, [4, 3]);
    this._drawDashedLine(ctx, nowX + nowWindowWidth, traceTop, nowX + nowWindowWidth, traceTop + traceHeight, [4, 3]);
  }

  _drawFutureBuffer(ctx, plotX, futureBufferWidth, traceTop, traceHeight) {
    // Dimmed future zone with diagonal stripes
    ctx.fillStyle = 'rgba(26, 38, 54, 0.3)';
    ctx.fillRect(plotX, traceTop, futureBufferWidth, traceHeight);

    // Label
    ctx.fillStyle = 'rgba(159, 178, 198, 0.5)';
    ctx.font = 'italic 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FUTURE', plotX + futureBufferWidth / 2, traceTop + 12);
  }

  _drawDualPulseTrains(ctx, modelState, plotX, nowX, plotW, pulseTrainTop, pulseTrainHeight,
                       timeWindow, nowWindowWidth, futureBufferWidth) {
    const trainHeight = pulseTrainHeight / 2 - 5;

    // Bio-inspired (Alpha) - Top
    this._drawPulseTrain(ctx, modelState, plotX, nowX, plotW, pulseTrainTop, trainHeight,
                        timeWindow, futureBufferWidth, 'alpha', 'Bio-Inspired (α-function)', true);

    // Idealized (Rectangular) - Bottom
    this._drawPulseTrain(ctx, modelState, plotX, nowX, plotW, pulseTrainTop + trainHeight + 10, trainHeight,
                        timeWindow, futureBufferWidth, 'rectangular', 'Idealized (Rectangular)', false);
  }

  _drawPulseTrain(ctx, modelState, plotX, nowX, plotW, trainTop, trainHeight, timeWindow, futureBufferWidth, shape, label, isCurrent) {
    const baselineY = trainTop + trainHeight / 2;

    // Draw baseline
    ctx.strokeStyle = isCurrent ? 'rgba(74, 163, 255, 0.3)' : 'rgba(159, 178, 198, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX, baselineY);
    ctx.lineTo(plotX + plotW, baselineY);
    ctx.stroke();

    // Label
    ctx.fillStyle = isCurrent ? this.colors.accent : this.colors.label;
    ctx.font = isCurrent ? 'bold 10px sans-serif' : '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, plotX - 35, trainTop + 8);

    // Draw pulses from input history
    if (modelState.inputHistory && modelState.inputHistory.length > 0) {
      const maxInput = Math.max(...modelState.inputHistory, 0.1);

      for (let i = 0; i < modelState.inputHistory.length; i++) {
        let input = modelState.inputHistory[i];
        const age = i;  // ms ago

        // Convert to requested shape
        if (shape === 'rectangular' && input > 0) {
          input = maxInput;  // Flatten to rectangular
        }

        if (age < timeWindow) {
          const x = nowX - futureBufferWidth + (age / timeWindow) * plotW;
          const pulseHeight = (input / maxInput) * (trainHeight - 4);

          if (pulseHeight > 0.5) {
            // Fade in effect for future zone
            let alpha = 1.0;
            if (x < nowX) {
              alpha = Math.max(0.15, (x - plotX) / futureBufferWidth);
            }

            // Draw pulse bar (thicker)
            const fillColor = isCurrent ?
              `rgba(74, 163, 255, ${0.7 * alpha})` :
              `rgba(247, 185, 85, ${0.6 * alpha})`;
            ctx.fillStyle = fillColor;
            ctx.fillRect(x - 2, baselineY - pulseHeight, 4, pulseHeight);
          }
        }
      }
    }
  }

  _drawMembranePotential(ctx, modelState, nowX, traceTop, traceHeight, traceBottom, timeWindow, plotW, futureBufferWidth) {
    ctx.strokeStyle = this.colors.membrane;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    let tempMembrane = modelState.membrane;
    let tempTime = modelState.time;
    const plotStartX = nowX - futureBufferWidth;

    for (let t = 0; t < timeWindow; t += 2) {
      const x = plotStartX + (t / timeWindow) * plotW;
      const v = Math.max(0, Math.min(2, tempMembrane));
      const y = traceBottom - (v / 2.0) * traceHeight;

      // Fade in the future zone
      if (x < nowX) {
        const alpha = Math.max(0.2, (x - plotStartX) / futureBufferWidth);
        ctx.globalAlpha = alpha;
      } else {
        ctx.globalAlpha = 1.0;
      }

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
    ctx.globalAlpha = 1.0;
  }

  _drawSpikes(ctx, modelState, nowX, traceTop, traceBottom, traceHeight, timeWindow, plotW, futureBufferWidth) {
    const thresholdY = traceBottom - (modelState.threshold / 2.0) * traceHeight;
    const plotStartX = nowX - futureBufferWidth;

    modelState.spikes.forEach(spike => {
      const age = modelState.time - spike.time;
      if (age >= 0 && age < timeWindow) {
        const x = plotStartX + (age / timeWindow) * plotW;

        // Only draw if in NOW window or later
        if (x >= nowX) {
          // Draw vertical spike line from threshold to top
          ctx.strokeStyle = this.colors.sodium;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, thresholdY);
          ctx.lineTo(x, traceTop);
          ctx.stroke();

          // Draw spike marker at top
          ctx.fillStyle = this.colors.sodium;
          ctx.beginPath();
          ctx.arc(x, traceTop, 5, 0, Math.PI * 2);
          ctx.fill();

          // Add glow effect
          ctx.strokeStyle = 'rgba(255, 107, 107, 0.4)';
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.arc(x, traceTop, 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });
  }

  _drawNowMarkerAndLabels(ctx, plotX, nowX, nowWindowWidth, futureBufferWidth, traceTop, traceHeight, integrationWindowDuration) {
    // NOW start marker (thick line)
    ctx.strokeStyle = this.colors.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(nowX, traceTop - 15);
    ctx.lineTo(nowX, traceTop + traceHeight + 5);
    ctx.stroke();

    // NOW end marker
    ctx.strokeStyle = 'rgba(74, 163, 255, 0.6)';
    ctx.lineWidth = 2;
    this._drawDashedLine(ctx, nowX + nowWindowWidth, traceTop - 15, nowX + nowWindowWidth, traceTop + traceHeight + 5, [6, 4]);

    // NOW label (large, prominent)
    ctx.fillStyle = this.colors.accent;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NOW', nowX + nowWindowWidth / 2, traceTop - 25);

    // Window duration
    ctx.font = '10px sans-serif';
    ctx.fillStyle = this.colors.tau;
    ctx.fillText(`Window of Simultaneity (2τ = ${integrationWindowDuration}ms)`, nowX + nowWindowWidth / 2, traceTop - 10);

    // Arrow spanning NOW window
    this._drawArrow(ctx, nowX + 5, traceTop - 20, nowX + nowWindowWidth - 5, traceTop - 20, this.colors.accent);
  }

  _drawPastLabel(ctx, plotX, plotW, traceTop, traceHeight) {
    const pastX = plotX + plotW - 40;
    const pastY = traceTop + traceHeight / 2;

    // PAST label
    ctx.fillStyle = 'rgba(159, 178, 198, 0.6)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('PAST', plotX + plotW - 15, pastY);

    // Arrow pointing left (into the past)
    this._drawArrow(ctx, pastX, pastY - 3, plotX + plotW - 70, pastY - 3, 'rgba(159, 178, 198, 0.5)');
  }

  _drawYAxisLabel(ctx, plotX, traceTop, traceBottom) {
    ctx.fillStyle = this.colors.label;
    ctx.font = '10px sans-serif';
    this._drawRotatedText(ctx, 'Voltage (V)', plotX - 15, (traceTop + traceBottom) / 2, -Math.PI / 2);
  }

  _drawTimeAxis(ctx, modelState, plotX, nowX, plotW, traceBottom, timeWindow, futureBufferDuration) {
    ctx.fillStyle = this.colors.label;
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';

    const plotStartX = nowX - (futureBufferDuration / timeWindow) * plotW;

    // Time labels every 10ms (denser for short window)
    for (let t = 0; t <= timeWindow; t += 10) {
      const x = plotStartX + (t / timeWindow) * plotW;
      if (x >= plotX && x <= plotX + plotW) {
        const timeValue = modelState.time - t;

        // Dim labels in future zone
        if (x < nowX) {
          ctx.fillStyle = 'rgba(159, 178, 198, 0.4)';
        } else {
          ctx.fillStyle = this.colors.label;
        }

        ctx.fillText(`${timeValue.toFixed(0)}`, x, traceBottom + 15);

        // Tick marks
        ctx.strokeStyle = x < nowX ? 'rgba(159, 178, 198, 0.3)' : this.colors.label;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, traceBottom);
        ctx.lineTo(x, traceBottom + 3);
        ctx.stroke();
      }
    }

    ctx.fillStyle = this.colors.label;
    ctx.fillText('Time (ms)', plotX + plotW / 2, traceBottom + 28);
  }

  _drawArrow(ctx, x1, y1, x2, y2, color) {
    const headLength = 6;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Arrowhead
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }
}

export default CombinedTraceRenderer;
