/**
 * topology.js
 *
 * Network topology visualization
 */

class TopologyFigure extends ActiveFigure {
    constructor(canvasId) {
        super({
            containerId: canvasId,
            title: 'Network Topology',
            description: 'Spatial arrangement and connectivity patterns'
        });

        this.nodes = [];
        const N = 20;

        for (let i = 0; i < N; i++) {
            const angle = (i / N) * Math.PI * 2;
            this.nodes.push({
                x: 0.5 + Math.cos(angle) * 0.4,
                y: 0.5 + Math.sin(angle) * 0.4,
                active: Math.random() > 0.5
            });
        }
    }

    update(dt) {
        // Random activity
        this.nodes.forEach(n => {
            if (Math.random() < 0.01) {
                n.active = !n.active;
            }
        });
    }

    render() {
        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Draw connections
        ctx.strokeStyle = 'rgba(74, 158, 255, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                if (Math.random() < 0.1) {
                    const n1 = this.nodes[i];
                    const n2 = this.nodes[j];
                    ctx.beginPath();
                    ctx.moveTo(n1.x * width, n1.y * height);
                    ctx.lineTo(n2.x * width, n2.y * height);
                    ctx.stroke();
                }
            }
        }

        // Draw nodes
        this.nodes.forEach(n => {
            ctx.fillStyle = n.active ? '#ffeb3b' : '#4a9eff';
            ctx.beginPath();
            ctx.arc(n.x * width, n.y * height, 6, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

ActiveFigure.register('topology', TopologyFigure);
