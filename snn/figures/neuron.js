/**
 * neuron.js
 *
 * Single neuron visualization figure
 */

class NeuronFigure extends ActiveFigure {
    constructor(canvasId) {
        super({
            containerId: canvasId,
            title: 'Single Neuron',
            description: 'A single spiking neuron with membrane dynamics'
        });

        // Neuron state
        this.membrane = 0;
        this.threshold = 1.0;
        this.lastSpike = -Infinity;
        this.spikes = [];
    }

    setup() {
        // Called once on mount
        console.log('NeuronFigure: setup');
    }

    update(dt) {
        // Simple LIF dynamics
        const leak = -0.1 * this.membrane * dt;
        const input = Math.random() < 0.01 ? 0.5 : 0;

        this.membrane += leak + input;

        // Check for spike
        if (this.membrane >= this.threshold) {
            this.membrane = 0;
            this.lastSpike = this.time;
            this.spikes.push(this.time);
        }
    }

    render() {
        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;

        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Draw neuron circle
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = 50;

        // Color based on membrane potential
        const intensity = Math.min(this.membrane / this.threshold, 1);
        ctx.fillStyle = `rgba(74, 158, 255, ${0.3 + intensity * 0.7})`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Spike flash
        const timeSinceSpike = this.time - this.lastSpike;
        if (timeSinceSpike < 0.2) {
            const flash = 1 - timeSinceSpike / 0.2;
            ctx.strokeStyle = `rgba(255, 235, 59, ${flash})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw membrane potential text
        ctx.fillStyle = '#fff';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`V = ${this.membrane.toFixed(2)}`, centerX, centerY);
        ctx.fillText(`Threshold = ${this.threshold.toFixed(2)}`, centerX, centerY + 20);
    }
}

// Register with ActiveFigure system
ActiveFigure.register('neuron', NeuronFigure);
