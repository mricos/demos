/**
 * HUDRenderer - Canvas-based heads-up display for hand tracking
 */

export class HUDRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.visible = true;
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    toggle() {
        this.visible = !this.visible;
        if (!this.visible) {
            this.clear();
        }
        return this.visible;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Render the HUD
     * @param {Object} data - { landmarks, x, y, theta, spread, reverse, phase }
     */
    render(data) {
        if (!this.visible || !data || !data.landmarks) {
            this.clear();
            return;
        }

        if (this.canvas.width === 0 || this.canvas.height === 0) {
            this.resize();
        }

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.clear();

        // Draw HUD panel (top-left)
        this.drawMainPanel(ctx, data);

        // Draw rotation dial (top-right area of panel)
        this.drawRotationDial(ctx, data);

        // Draw hand position indicator (small crosshair in corner)
        this.drawPositionIndicator(ctx, data, w, h);

        // Draw spread indicator
        this.drawSpreadIndicator(ctx, data);
    }

    drawMainPanel(ctx, data) {
        const x = 10, y = 10;
        const pw = 180, ph = 90;

        // Panel background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 2;

        // Rounded rect
        ctx.beginPath();
        ctx.roundRect(x, y, pw, ph, 5);
        ctx.fill();
        ctx.stroke();

        // Title bar
        ctx.fillStyle = 'rgba(255, 50, 50, 0.3)';
        ctx.fillRect(x + 2, y + 2, pw - 4, 18);

        // Title
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#ff6666';
        ctx.fillText('HAND TRACKING', x + 8, y + 14);

        // Reverse indicator
        if (data.reverse) {
            ctx.fillStyle = '#ff8800';
            ctx.fillText('REV', x + pw - 35, y + 14);
        }

        // Data fields
        ctx.font = '12px monospace';
        const lineH = 16;
        let ly = y + 35;

        // X value with bar
        ctx.fillStyle = '#ff4444';
        ctx.fillText('X:', x + 8, ly);
        this.drawValueBar(ctx, x + 28, ly - 10, 60, 12, data.x);
        ctx.fillStyle = '#ff6666';
        ctx.fillText(data.x.toFixed(2), x + 95, ly);

        ly += lineH;

        // Y value with bar
        ctx.fillStyle = '#ff4444';
        ctx.fillText('Y:', x + 8, ly);
        this.drawValueBar(ctx, x + 28, ly - 10, 60, 12, data.y);
        ctx.fillStyle = '#ff6666';
        ctx.fillText(data.y.toFixed(2), x + 95, ly);

        ly += lineH;

        // Theta - apply reverse
        ctx.fillStyle = '#ff4444';
        ctx.fillText('θ:', x + 8, ly);
        ctx.fillStyle = '#ff6666';
        let thetaRad = data.theta;
        if (data.reverse) {
            thetaRad = -thetaRad;
        }
        const thetaDeg = (thetaRad * 180 / Math.PI).toFixed(0);
        const effectiveTheta = parseFloat(thetaDeg) + (data.phase || 0);
        ctx.fillText(`${effectiveTheta.toFixed(0)}°`, x + 28, ly);

        // Phase offset
        if (data.phase) {
            ctx.fillStyle = '#888';
            ctx.font = '10px monospace';
            ctx.fillText(`(+${data.phase}°)`, x + 70, ly);
        }
    }

    drawValueBar(ctx, x, y, w, h, value) {
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, w, h);

        // Value bar (value is -1 to 1)
        const center = x + w / 2;
        const barW = (value * w / 2);

        ctx.fillStyle = value >= 0 ? '#ff4444' : '#ff8844';
        if (value >= 0) {
            ctx.fillRect(center, y + 1, barW, h - 2);
        } else {
            ctx.fillRect(center + barW, y + 1, -barW, h - 2);
        }

        // Center line
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(center, y);
        ctx.lineTo(center, y + h);
        ctx.stroke();
    }

    drawRotationDial(ctx, data) {
        const cx = 155, cy = 55;
        const r = 25;

        // Dial background
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();
        ctx.strokeStyle = data.reverse ? '#ff8800' : '#ff3333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Tick marks
        ctx.strokeStyle = '#662222';
        ctx.lineWidth = 1;
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5));
            ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            ctx.stroke();
        }

        // Rotation needle - apply reverse to dial direction
        let theta = data.theta;
        if (data.reverse) {
            theta = -theta;
        }
        theta += (data.phase || 0) * Math.PI / 180;
        ctx.strokeStyle = '#ff2222';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(theta) * (r - 3), cy + Math.sin(theta) * (r - 3));
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Center dot
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4444';
        ctx.fill();
    }

    drawPositionIndicator(ctx, data, canvasW, canvasH) {
        // Small position crosshair in bottom-left
        const size = 50;
        const x = 15, y = canvasH - size - 50;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 3);
        ctx.fill();
        ctx.stroke();

        // Grid
        ctx.strokeStyle = '#442222';
        ctx.beginPath();
        ctx.moveTo(x + size/2, y);
        ctx.lineTo(x + size/2, y + size);
        ctx.moveTo(x, y + size/2);
        ctx.lineTo(x + size, y + size/2);
        ctx.stroke();

        // Position dot
        const px = x + size/2 + (data.x * size/2);
        const py = y + size/2 + (data.y * size/2);

        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ff3333';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 5;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.font = '9px monospace';
        ctx.fillStyle = '#ff6666';
        ctx.fillText('POS', x + 2, y - 3);
    }

    drawSpreadIndicator(ctx, data) {
        if (!data.spread && data.spread !== 0) return;

        const x = 15, y = 110;
        const w = 60, h = 8;

        // Label
        ctx.font = '9px monospace';
        ctx.fillStyle = '#ff6666';
        ctx.fillText('SPREAD', x, y - 3);

        // Bar background
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, w, h);

        // Bar value (spread is 0 to ~0.05, scale up)
        const spreadNorm = Math.min(1, data.spread * 20);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(x, y, w * spreadNorm, h);

        // Border
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
    }
}
