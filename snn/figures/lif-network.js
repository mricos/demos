/**
 * lif-network.js
 *
 * Network of connected LIF neurons
 */

class LIFNetworkFigure extends ActiveFigure {
    constructor(canvasId) {
        super({
            containerId: canvasId,
            title: 'LIF Network',
            description: 'Small network of interconnected spiking neurons'
        });

        this.neurons = [];
        this.numNeurons = 10;

        // Create neurons
        for (let i = 0; i < this.numNeurons; i++) {
            this.neurons.push({
                x: Math.random(),
                y: Math.random(),
                membrane: Math.random() * 0.5,
                lastSpike: -Infinity
            });
        }
    }

    update(dt) {
        this.neurons.forEach(n => {
            // Simple dynamics
            n.membrane += (-0.1 * n.membrane + 0.05) * dt;

            if (n.membrane >= 1.0) {
                n.membrane = 0;
                n.lastSpike = this.time;
            }
        });
    }

    render() {
        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Draw neurons
        this.neurons.forEach(n => {
            const x = n.x * width;
            const y = n.y * height;
            const flash = Math.max(0, 1 - (this.time - n.lastSpike) / 0.3);

            ctx.fillStyle = flash > 0 ? `rgba(255, 235, 59, ${flash})` : '#4a9eff';
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

ActiveFigure.register('network', LIFNetworkFigure);
