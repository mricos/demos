/**
 * SchematicRenderer.js
 *
 * Circuit diagram style renderer for neurons
 */

class SchematicRenderer {
    constructor() {
        this.name = 'Schematic';
    }

    render(ctx, state, bounds) {
        const { x, y, width, height } = bounds;
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(x, y, width, height);

        // Draw circuit symbol
        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        ctx.stroke();

        // Add label
        ctx.fillStyle = '#888';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Schematic View', centerX, centerY + height / 2 - 10);
    }
}
