/**
 * NeuronRenderer.js
 *
 * Stateless rendering functions for neuron visualizations.
 * Takes model state as input, produces canvas graphics as output.
 * No physics, no state management - pure visualization.
 */

import { theme } from './theme.js';

export class NeuronRenderer {
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
   * Render biological neuron visualization
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} modelState - {membrane, time, lastSpike, spikes, threshold, tau, input}
   * @param {object} bounds - {x, y, width, height}
   */
  renderBiologicalNeuron(ctx, modelState, bounds) {
    const { x, y, width, height } = bounds;

    // Title
    ctx.fillStyle = this.colors.soma;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Biological Neuron', x + width / 2, y + 15);

    // Center the neuron horizontally
    const neuronX = x + width / 2;
    const neuronY = y + height / 2 + 10;
    const somaRadius = 45;
    const axonLength = 180;

    this._drawDendrites(ctx, modelState, neuronX, neuronY, somaRadius);
    this._drawSoma(ctx, modelState, neuronX, neuronY, somaRadius);
    this._drawAxon(ctx, modelState, neuronX + somaRadius, neuronY, axonLength);
  }

  /**
   * Render static LIF model diagram with equation
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} modelState
   * @param {object} bounds
   */
  renderLIFDiagram(ctx, modelState, bounds) {
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

    // Parameters with color-coded values
    ctx.font = '9px sans-serif';
    xPos = plotX;
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

    // Diagram area
    const diagramY = startY + 65;
    const diagramH = height - 75;
    const baselineY = diagramY + diagramH;

    // Draw axes
    ctx.strokeStyle = this.colors.label;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(plotX, diagramY);
    ctx.lineTo(plotX, baselineY);
    ctx.lineTo(plotX + plotW, baselineY);
    ctx.stroke();

    // Threshold line
    const thresholdY = diagramY + diagramH * 0.2;
    ctx.strokeStyle = this.colors.threshold;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(plotX, thresholdY);
    ctx.lineTo(plotX + plotW, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = this.colors.threshold;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Vth', plotX + plotW + 5, thresholdY + 4);

    // Draw idealized membrane potential curve
    this._drawIdealizedCurve(ctx, plotX, plotW, diagramY, diagramH, baselineY);

    // Time axis label
    ctx.fillStyle = this.colors.label;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time (ms)', plotX + plotW / 2, baselineY + 18);
  }

  /**
   * Render live membrane potential trace
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} modelState
   * @param {object} bounds
   */
  renderMembraneTrace(ctx, modelState, bounds) {
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

    // Axes
    ctx.strokeStyle = this.colors.label;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX, traceTop);
    ctx.lineTo(plotX, traceBottom);
    ctx.lineTo(plotX + plotW, traceBottom);
    ctx.stroke();

    // Threshold line
    const thresholdY = traceBottom - (modelState.threshold / 2.0) * traceHeight;
    ctx.strokeStyle = this.colors.threshold;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(plotX, thresholdY);
    ctx.lineTo(plotX + plotW, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = this.colors.threshold;
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Vth', plotX - 3, thresholdY + 3);

    // NOW is at the LEFT edge
    const nowX = plotX;
    const integrationWindowDuration = 40; // 2τ
    const timeWindow = 200;

    // Draw integration window (shaded region)
    const windowWidth = (integrationWindowDuration / timeWindow) * plotW;
    ctx.fillStyle = 'rgba(247, 185, 85, 0.15)';
    ctx.fillRect(nowX, traceTop, windowWidth, traceHeight);

    // Draw membrane potential trace
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

    // NOW label
    ctx.fillStyle = this.colors.threshold;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('NOW', nowX + 3, traceTop - 5);
    ctx.font = '7px sans-serif';
    ctx.fillStyle = this.colors.tau;
    ctx.fillText(`(2τ window)`, nowX + windowWidth / 2, traceTop - 14);

    // Y-axis label
    ctx.fillStyle = this.colors.label;
    ctx.font = '9px sans-serif';
    ctx.save();
    ctx.translate(plotX - 12, (traceTop + traceBottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('V', 0, 0);
    ctx.restore();
  }

  /**
   * Render spike train visualization
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} modelState
   * @param {object} bounds
   */
  renderSpikeTrain(ctx, modelState, bounds) {
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
    const windowWidth = (integrationWindowDuration / timeWindow) * plotW;
    ctx.fillStyle = 'rgba(247, 185, 85, 0.12)';
    ctx.fillRect(nowX, trainTop, windowWidth, trainHeight);

    // Draw window boundary lines
    ctx.strokeStyle = 'rgba(247, 185, 85, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(nowX, trainTop);
    ctx.lineTo(nowX, trainTop + trainHeight);
    ctx.moveTo(nowX + windowWidth, trainTop);
    ctx.lineTo(nowX + windowWidth, trainTop + trainHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw timeline
    ctx.strokeStyle = this.colors.label;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX, timelineY);
    ctx.lineTo(plotX + plotW, timelineY);
    ctx.stroke();

    // Draw spike events as vertical bars
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

    // Draw NOW marker
    ctx.strokeStyle = this.colors.threshold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(nowX, trainTop - 5);
    ctx.lineTo(nowX, trainTop + trainHeight + 5);
    ctx.stroke();

    // NOW label
    ctx.fillStyle = this.colors.threshold;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('NOW', nowX + 3, trainTop - 10);
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

  /**
   * Render TTFS binary detector
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} modelState
   * @param {object} ttfsState - {encodingWindowStart, encodingWindowDuration, ttfsThreshold, detectedBit}
   * @param {object} bounds
   */
  renderTTFSDetector(ctx, modelState, ttfsState, bounds) {
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
    } else {
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

  // ============================================================================
  // Internal rendering helpers
  // ============================================================================

  _drawDendrites(ctx, modelState, centerX, centerY, somaRadius) {
    const dendriteCount = 3;

    for (let i = 0; i < dendriteCount; i++) {
      const angle = -Math.PI / 2 + (i - 1) * Math.PI / 5;
      const length = 80;
      const endX = centerX + Math.cos(angle) * length;
      const endY = centerY + Math.sin(angle) * length;

      // Draw dendrite
      ctx.strokeStyle = this.colors.dendrite;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(centerX, centerY);
      ctx.stroke();

      // Draw synapse receptor
      ctx.fillStyle = '#2a4566';
      ctx.beginPath();
      ctx.arc(endX, endY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = this.colors.calcium;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Animate synaptic activity
      this._drawSynapticActivity(ctx, modelState, endX, endY, centerX, centerY, angle, i);
    }
  }

  _drawSynapticActivity(ctx, modelState, endX, endY, centerX, centerY, angle, index) {
    const phase = (this.synapticPhase + index * 0.4) % 1;

    if (phase < 0.15) {
      // Neurotransmitter approaching synapse
      const progress = 1 - phase / 0.15;
      const ntX = endX - Math.cos(angle) * 25 * progress;
      const ntY = endY - Math.sin(angle) * 25 * progress;

      ctx.fillStyle = this.colors.neurotransmitter;
      ctx.beginPath();
      ctx.arc(ntX, ntY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Label on first dendrite
      if (index === 0 && phase < 0.1) {
        ctx.fillStyle = this.colors.neurotransmitter;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Neurotransmitter', ntX + 8, ntY);
      }
    } else if (phase < 0.8) {
      // Ion current flowing into dendrite
      const ionPhase = (phase - 0.15) / 0.65;
      const ionX = endX + (centerX - endX) * ionPhase;
      const ionY = endY + (centerY - endY) * ionPhase;

      ctx.fillStyle = this.colors.calcium;
      ctx.beginPath();
      ctx.arc(ionX, ionY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Label
      if (index === 1 && ionPhase > 0.3 && ionPhase < 0.5) {
        ctx.fillStyle = this.colors.calcium;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Ca²⁺ influx', ionX - 8, ionY);
      }
    }
  }

  _drawSoma(ctx, modelState, centerX, centerY, radius) {
    // Soma with intensity based on membrane potential
    const intensity = Math.min(1, modelState.membrane / modelState.threshold);
    ctx.fillStyle = `rgba(74, 163, 255, ${0.2 + intensity * 0.6})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.colors.soma;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Membrane potential value
    ctx.fillStyle = this.colors.somaText;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`V=${modelState.membrane.toFixed(2)}`, centerX, centerY + 6);

    // Label
    ctx.fillStyle = this.colors.label;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('Soma', centerX, centerY + radius + 18);
    ctx.font = '11px sans-serif';
    ctx.fillText('(integration)', centerX, centerY + radius + 32);
  }

  _drawAxon(ctx, modelState, startX, centerY, length) {
    const endX = startX + length;

    // Draw axon hillock
    const hillockWidth = 15;
    ctx.fillStyle = '#2a4566';
    ctx.beginPath();
    ctx.moveTo(startX, centerY - 6);
    ctx.lineTo(startX + hillockWidth, centerY - 8);
    ctx.lineTo(startX + hillockWidth, centerY + 8);
    ctx.lineTo(startX, centerY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = this.colors.soma;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Axon hillock label
    ctx.fillStyle = this.colors.label;
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Hillock', startX + hillockWidth / 2, centerY - 12);

    // Draw axon
    ctx.strokeStyle = this.colors.axon;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(startX + hillockWidth, centerY);
    ctx.lineTo(endX, centerY);
    ctx.stroke();

    // Draw voltage-gated channels
    this._drawChannels(ctx, startX + hillockWidth, centerY, length - hillockWidth, 3);

    // Animate action potential
    this._drawActionPotential(ctx, modelState, startX + hillockWidth, centerY, length - hillockWidth);

    // Label
    ctx.fillStyle = this.colors.label;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Axon', (startX + hillockWidth + endX) / 2, centerY + 60);
    ctx.font = '11px sans-serif';
    ctx.fillText('(voltage-gated Na⁺/K⁺ channels)', (startX + hillockWidth + endX) / 2, centerY + 74);
  }

  _drawChannels(ctx, startX, centerY, length, count) {
    for (let i = 0; i < count; i++) {
      const channelX = startX + (i + 1) * (length / (count + 1));

      ctx.fillStyle = '#2a4566';
      ctx.fillRect(channelX - 3, centerY - 8, 6, 16);
      ctx.strokeStyle = '#4a6a99';
      ctx.lineWidth = 1;
      ctx.strokeRect(channelX - 3, centerY - 8, 6, 16);
    }
  }

  _drawActionPotential(ctx, modelState, startX, centerY, length) {
    const timeSinceSpike = modelState.time - modelState.lastSpike;

    if (timeSinceSpike >= 0 && timeSinceSpike < 100) {
      const progress = timeSinceSpike / 100;
      const spikeX = startX + length * progress;

      // Na+ influx (red)
      ctx.fillStyle = 'rgba(255, 107, 107, 0.6)';
      ctx.beginPath();
      ctx.arc(spikeX, centerY - 18, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.colors.sodium;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Na⁺', spikeX, centerY - 26);
      ctx.font = '10px sans-serif';
      ctx.fillText('(influx)', spikeX, centerY - 36);

      // K+ efflux (blue) - trails behind
      if (progress > 0.3) {
        const kX = startX + length * (progress - 0.3);
        ctx.fillStyle = 'rgba(74, 163, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(kX, centerY + 18, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.colors.potassium;
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('K⁺', kX, centerY + 32);
        ctx.font = '10px sans-serif';
        ctx.fillText('(efflux)', kX, centerY + 42);
      }

      // Action potential wave
      ctx.strokeStyle = this.colors.sodium;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(spikeX, centerY, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
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
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(spikeX, spikeTop);
    ctx.lineTo(plotX + (260 / 600) * plotW, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

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

export default NeuronRenderer;
