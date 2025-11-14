/**
 * VScope Overlay System
 *
 * Renders visual feedback on the main canvas:
 * - Border box showing tracked region on field
 * - Connection lines from field region to terminal quadrant
 * - Visual indication of field-to-terminal mapping
 */

export class VscopeOverlay {
  constructor(canvas, ctx, mapper, overlayState) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.mapper = mapper;

    this.showBorderBox = overlayState.borderBox !== undefined ? overlayState.borderBox : true;
    this.showConnectionLines = overlayState.connectionLines !== undefined ? overlayState.connectionLines : true;

    // Visual styling
    this.borderColor = '#00ffff'; // Cyan
    this.connectionColor = '#ff00ff'; // Magenta
    this.lineWidth = 2;
    this.lineDash = [5, 3];

    // Terminal position on screen (approximate - will need to be configured)
    this.terminalScreenPos = {
      x: 50, // pixels from left
      y: canvas.height - 450, // Approximate CLI panel position
      charWidth: 10,
      charHeight: 20
    };

    // Track last rendered region for cleanup
    this.lastRenderedRegion = null;
  }

  /**
   * Render overlay
   */
  render(trackedRegion, targetQuadrant) {
    // Save region for cleanup
    this.lastRenderedRegion = trackedRegion;

    // Note: We don't call clear() here because the game should redraw the canvas
    // The overlay is drawn on top of the game canvas each frame

    if (this.showBorderBox) {
      this.renderBorderBox(trackedRegion);
    }

    // DISABLED: Connection lines are causing game objects to be drawn on canvas
    // The terminal position calculation is wrong and draws game geometry
    // in the bottom-right corner of the canvas
    /*
    if (this.showConnectionLines) {
      this.renderConnectionLines(trackedRegion, targetQuadrant);
    }
    */
  }

  /**
   * Render border box around tracked region
   */
  renderBorderBox(region) {
    this.ctx.save();

    this.ctx.strokeStyle = this.borderColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.setLineDash(this.lineDash);

    // Draw rectangle
    this.ctx.strokeRect(region.x, region.y, region.width, region.height);

    // Draw corner markers
    const markerSize = 20;
    this.ctx.setLineDash([]);
    this.ctx.lineWidth = 3;

    // Top-left
    this.ctx.beginPath();
    this.ctx.moveTo(region.x, region.y + markerSize);
    this.ctx.lineTo(region.x, region.y);
    this.ctx.lineTo(region.x + markerSize, region.y);
    this.ctx.stroke();

    // Top-right
    this.ctx.beginPath();
    this.ctx.moveTo(region.x + region.width - markerSize, region.y);
    this.ctx.lineTo(region.x + region.width, region.y);
    this.ctx.lineTo(region.x + region.width, region.y + markerSize);
    this.ctx.stroke();

    // Bottom-right
    this.ctx.beginPath();
    this.ctx.moveTo(region.x + region.width, region.y + region.height - markerSize);
    this.ctx.lineTo(region.x + region.width, region.y + region.height);
    this.ctx.lineTo(region.x + region.width - markerSize, region.y + region.height);
    this.ctx.stroke();

    // Bottom-left
    this.ctx.beginPath();
    this.ctx.moveTo(region.x + markerSize, region.y + region.height);
    this.ctx.lineTo(region.x, region.y + region.height);
    this.ctx.lineTo(region.x, region.y + region.height - markerSize);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Render connection lines from field to terminal
   */
  renderConnectionLines(trackedRegion, targetQuadrant) {
    // Get corner points
    const corners = this.mapper.getCornerPoints();

    // Convert terminal cell coordinates to screen pixel coordinates
    const terminalCorners = corners.terminal.map(tc => ({
      x: this.terminalScreenPos.x + tc.col * this.terminalScreenPos.charWidth,
      y: this.terminalScreenPos.y + tc.row * this.terminalScreenPos.charHeight
    }));

    this.ctx.save();
    this.ctx.strokeStyle = this.connectionColor;
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 3]);
    this.ctx.globalAlpha = 0.5;

    // Draw connection lines from each corner
    for (let i = 0; i < 4; i++) {
      const fieldCorner = corners.canvas[i];
      const terminalCorner = terminalCorners[i];

      this.ctx.beginPath();
      this.ctx.moveTo(fieldCorner.x, fieldCorner.y);

      // Draw Bezier curve for smooth connection
      const controlX1 = fieldCorner.x + (terminalCorner.x - fieldCorner.x) * 0.3;
      const controlY1 = fieldCorner.y;
      const controlX2 = fieldCorner.x + (terminalCorner.x - fieldCorner.x) * 0.7;
      const controlY2 = terminalCorner.y;

      this.ctx.bezierCurveTo(
        controlX1, controlY1,
        controlX2, controlY2,
        terminalCorner.x, terminalCorner.y
      );

      this.ctx.stroke();

      // Draw endpoint markers
      this.ctx.fillStyle = this.connectionColor;
      this.ctx.globalAlpha = 0.8;
      this.ctx.beginPath();
      this.ctx.arc(terminalCorner.x, terminalCorner.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  /**
   * Clear overlay
   */
  clear() {

    // CRITICAL FIX: When VScope is disabled, the game might have already stopped
    // its render loop, leaving our overlay artifacts (magenta connection lines,
    // cyan border boxes) visible on the canvas. We need to explicitly clear them.

    if (!this.ctx) {
      console.warn('[VscopeOverlay] No context available for clearing');
      return;
    }

    // Clear the entire canvas - this is safe because:
    // 1. If the game is still running, it will redraw on the next frame
    // 2. If the game has stopped, this removes our artifacts
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Reset state
    this.lastRenderedRegion = null;
  }

  /**
   * Set terminal screen position (for accurate connection lines)
   */
  setTerminalPosition(x, y, charWidth, charHeight) {
    this.terminalScreenPos = { x, y, charWidth, charHeight };
  }

  /**
   * Update from Redux state
   */
  updateFromState(overlayState) {
    this.showBorderBox = overlayState.borderBox;
    this.showConnectionLines = overlayState.connectionLines;
  }

  /**
   * Cleanup
   */
  cleanup() {
    // Nothing to clean up - overlay is ephemeral
  }
}
