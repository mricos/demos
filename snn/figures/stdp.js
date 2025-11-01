/**
 * stdp.js
 *
 * STDP learning rule visualization
 */

class STDPFigure extends ActiveFigure {
    constructor(canvasId) {
        super({
            containerId: canvasId,
            title: 'STDP Learning',
            description: 'Spike-timing-dependent plasticity learning rule'
        });
    }

    update(dt) {
        // Static visualization - no update needed
    }

    render() {
        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Draw STDP curve
        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let x = 0; x < width; x++) {
            const dt = (x / width - 0.5) * 100; // -50 to +50 ms
            const dw = dt > 0 ? Math.exp(-dt / 20) : -Math.exp(dt / 20);
            const y = height / 2 - dw * height * 0.3;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.stroke();

        // Axes
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#888';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LTP', width / 4, 20);
        ctx.fillText('LTD', width * 3 / 4, height - 10);
    }
}

ActiveFigure.register('stdp', STDPFigure);
