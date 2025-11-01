/**
 * lif-trace.js
 *
 * LIF neuron with membrane potential trace
 */

class LIFTraceFigure extends ActiveFigure {
    constructor(canvasId) {
        super({
            containerId: canvasId,
            title: 'LIF Membrane Trace',
            description: 'Leaky Integrate-and-Fire neuron with voltage trace over time'
        });

        this.membrane = 0;
        this.history = [];
        this.maxHistory = 300;
    }

    update(dt) {
        // LIF dynamics
        const leak = -0.1 * this.membrane * dt;
        const input = Math.random() < 0.02 ? 0.6 : 0.1 * dt;

        this.membrane += leak + input;

        if (this.membrane >= 1.0) {
            this.membrane = 0;
        }

        // Store history
        this.history.push({ time: this.time, v: this.membrane });
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    render() {
        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Draw trace
        if (this.history.length > 1) {
            ctx.strokeStyle = '#4a9eff';
            ctx.lineWidth = 2;
            ctx.beginPath();

            this.history.forEach((point, i) => {
                const x = (i / this.maxHistory) * width;
                const y = height - (point.v * height * 0.8 + height * 0.1);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });

            ctx.stroke();
        }

        // Threshold line
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, height * 0.1);
        ctx.lineTo(width, height * 0.1);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = '#888';
        ctx.font = '12px monospace';
        ctx.fillText('Threshold', 10, height * 0.1 - 5);
    }
}

ActiveFigure.register('lif', LIFTraceFigure);
