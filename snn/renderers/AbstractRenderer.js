/**
 * AbstractRenderer.js
 *
 * Minimalist abstract renderer for neurons
 */

class AbstractRenderer {
    constructor() {
        this.name = 'Abstract';
    }

    render(ctx, state, bounds) {
        const { x, y, width, height } = bounds;
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(x, y, width, height);

        // Draw abstract representation
        const intensity = state.membrane || 0;
        const radius = 20 + intensity * 10;

        ctx.fillStyle = `rgba(74, 158, 255, ${intensity})`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Add label
        ctx.fillStyle = '#888';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Abstract View', centerX, centerY + height / 2 - 10);
    }
}
