/**
 * neuron-improved.js
 *
 * Enhanced single neuron visualization with biological rendering
 * and spike train display
 */

class ImprovedNeuronFigure extends ActiveFigure {
    constructor(canvasId) {
        super({
            containerId: canvasId,
            title: 'LIF Neuron with Spike Train',
            description: 'Leaky Integrate-and-Fire neuron showing biological morphology and spike timing'
        });

        // LIF parameters
        this.threshold = 1.0;
        this.tau = 20; // ms
        this.restingPotential = 0;
        this.membrane = 0;
        this.inputCurrent = 0.04;

        // Spike tracking
        this.spikes = [];
        this.lastSpike = -Infinity;
        this.refractoryPeriod = 2; // ms

        // Trace history for plotting
        this.traceHistory = [];
        this.maxTracePoints = 200;

        // Spike train history
        this.spikeTrainDuration = 5000; // ms - show last 5 seconds
    }

    setup() {
        console.log('ImprovedNeuronFigure: setup');
    }

    update(dt) {
        const dtSec = dt / 1000; // Convert to seconds

        // Check if in refractory period
        const timeSinceSpike = this.time - this.lastSpike;
        if (timeSinceSpike < this.refractoryPeriod) {
            // During refractory, clamp at resting
            this.membrane = this.restingPotential;
        } else {
            // LIF dynamics: dV/dt = -(V - V_rest)/tau + I
            const leak = -(this.membrane - this.restingPotential) / this.tau;
            const input = this.inputCurrent;

            this.membrane += (leak + input) * dt;

            // Check for spike
            if (this.membrane >= this.threshold) {
                this.spikes.push(this.time);
                this.lastSpike = this.time;
                this.membrane = this.restingPotential; // Reset

                // Keep only recent spikes
                const cutoff = this.time - this.spikeTrainDuration;
                this.spikes = this.spikes.filter(t => t >= cutoff);
            }
        }

        // Store trace history
        this.traceHistory.push({
            time: this.time,
            voltage: this.membrane
        });

        if (this.traceHistory.length > this.maxTracePoints) {
            this.traceHistory.shift();
        }
    }

    render() {
        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;

        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Split view: biological neuron on left, traces on right
        const splitX = width * 0.4;

        // === LEFT: Biological Neuron ===
        this.renderBiologicalNeuron(ctx, 0, 0, splitX, height);

        // === RIGHT: Spike Train + Membrane Trace ===
        this.renderTraces(ctx, splitX, 0, width - splitX, height);
    }

    renderBiologicalNeuron(ctx, x, y, w, h) {
        const centerX = x + w / 2;
        const centerY = y + h / 2;

        // Soma size based on membrane potential
        const baseRadius = 40;
        const intensity = Math.min(this.membrane / this.threshold, 1);
        const somaRadius = baseRadius * (1 + intensity * 0.2);

        // Draw dendrites (simplified)
        ctx.strokeStyle = '#4aa3ff';
        ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const dendriteLength = 60;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(angle) * (somaRadius + dendriteLength),
                centerY + Math.sin(angle) * (somaRadius + dendriteLength)
            );
            ctx.stroke();
        }

        // Draw soma
        ctx.fillStyle = `rgba(74, 158, 255, ${0.3 + intensity * 0.7})`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, somaRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Spike flash
        const timeSinceSpike = this.time - this.lastSpike;
        if (timeSinceSpike < 50) {
            const flash = 1 - timeSinceSpike / 50;
            ctx.strokeStyle = `rgba(255, 235, 59, ${flash})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(centerX, centerY, somaRadius + 15, 0, Math.PI * 2);
            ctx.stroke();

            // Axon spike propagation
            const axonLength = 80;
            const spikePos = (timeSinceSpike / 50) * axonLength;
            ctx.fillStyle = `rgba(255, 235, 59, ${flash})`;
            ctx.beginPath();
            ctx.arc(
                centerX + somaRadius + spikePos,
                centerY,
                8 * flash,
                0, Math.PI * 2
            );
            ctx.fill();
        }

        // Draw axon
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX + somaRadius, centerY);
        ctx.lineTo(centerX + somaRadius + 80, centerY);
        ctx.stroke();

        // Membrane potential text
        ctx.fillStyle = '#fff';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`V = ${this.membrane.toFixed(2)}`, centerX, centerY);
    }

    renderTraces(ctx, x, y, w, h) {
        const padding = 20;
        const plotX = x + padding;
        const plotW = w - padding * 2;

        // Split into two plots: spike train (top) and membrane trace (bottom)
        const spikeTrainH = h * 0.3;
        const traceH = h * 0.7;

        // === Spike Train (Raster Plot) ===
        this.renderSpikeRaster(ctx, plotX, y + padding, plotW, spikeTrainH - padding * 2);

        // === Membrane Potential Trace ===
        this.renderMembraneTrace(ctx, plotX, y + spikeTrainH, plotW, traceH - padding);
    }

    renderSpikeRaster(ctx, x, y, w, h) {
        // Background
        ctx.fillStyle = '#111';
        ctx.fillRect(x, y, w, h);

        // Title
        ctx.fillStyle = '#888';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Spike Train (${this.spikes.length} spikes)`, x + 5, y + 15);

        // Time window
        const currentTime = this.time;
        const timeWindowStart = currentTime - this.spikeTrainDuration;

        // Draw spikes
        const centerY = y + h / 2;
        const spikeHeight = h * 0.6;

        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 2;

        this.spikes.forEach(spikeTime => {
            if (spikeTime >= timeWindowStart) {
                const x_pos = x + ((spikeTime - timeWindowStart) / this.spikeTrainDuration) * w;
                ctx.beginPath();
                ctx.moveTo(x_pos, centerY - spikeHeight / 2);
                ctx.lineTo(x_pos, centerY + spikeHeight / 2);
                ctx.stroke();
            }
        });

        // Time axis
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.stroke();
    }

    renderMembraneTrace(ctx, x, y, w, h) {
        // Background
        ctx.fillStyle = '#111';
        ctx.fillRect(x, y, w, h);

        // Title
        ctx.fillStyle = '#888';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Membrane Potential', x + 5, y + 15);

        // Axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.stroke();

        // Threshold line
        const thresholdY = y + h - (this.threshold / 1.2) * h * 0.8 - 20;
        ctx.strokeStyle = '#ff6b6b';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, thresholdY);
        ctx.lineTo(x + w, thresholdY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ff6b6b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('threshold', x + w - 5, thresholdY - 5);

        // Plot trace
        if (this.traceHistory.length > 1) {
            ctx.strokeStyle = '#4a9eff';
            ctx.lineWidth = 2;
            ctx.beginPath();

            this.traceHistory.forEach((point, i) => {
                const x_pos = x + (i / this.maxTracePoints) * w;
                const y_pos = y + h - (point.voltage / 1.2) * h * 0.8 - 20;

                if (i === 0) {
                    ctx.moveTo(x_pos, y_pos);
                } else {
                    ctx.lineTo(x_pos, y_pos);
                }
            });

            ctx.stroke();
        }
    }
}

// Register with ActiveFigure system
ActiveFigure.register('neuron-improved', ImprovedNeuronFigure);
