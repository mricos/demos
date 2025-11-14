/**
 * VScope Renderer - Terminal Wireframe Rendering
 *
 * Renders field content to VT100 terminal display:
 * - Vector mode: Direct line-to-character mapping
 * - Grid mode: Grid cell visualization
 * - Pixel mode: Density heatmap rendering
 *
 * Uses character density to represent vector/pixel intensity: ' ·:+=*#█'
 */

export class VscopeRenderer {
  constructor(vt100Renderer, mapper, pixelGrid, effects) {
    this.vt100Renderer = vt100Renderer;
    this.mapper = mapper;
    this.pixelGrid = pixelGrid;
    this.effects = effects;

    // Character palette for density visualization
    this.densityChars = ' ·:+=*#█';

    // Rendering buffer (stores what was rendered for clearing)
    this.buffer = null;
  }

  /**
   * Set VT100 renderer (if not available during construction)
   */
  setVT100Renderer(renderer) {
    this.vt100Renderer = renderer;
  }

  /**
   * Main render function
   */
  render(sceneData, state) {
    // EMERGENCY KILL SWITCH - set this to true in console to stop all rendering
    if (window.VSCOPE_DISABLE_ALL) {
      console.warn('[VscopeRenderer] DISABLED BY KILL SWITCH');
      return;
    }

    if (!this.vt100Renderer) {
      console.warn('VT100 renderer not available');
      return;
    }

    // Clear previous render
    this.clearTargetRegion();

    // Render based on scene type
    switch (sceneData.type) {
      case 'vectors':
        this.renderVectors(sceneData.lines, state);
        break;

      case 'grid':
        this.renderGrid(sceneData.gridSize, state);
        break;

      case 'pixels':
        this.renderPixels(sceneData.imageData, sceneData.region, state);
        break;

      default:
        console.warn(`Unknown scene type: ${sceneData.type}`);
    }
  }

  /**
   * Render vectors to terminal - WIREFRAME MODE (not ASCII!)
   */
  renderVectors(lines, state) {
    if (!lines || lines.length === 0) {
      console.warn('[VscopeRenderer] No lines to render');
      return;
    }

    console.log('[VscopeRenderer] Rendering', lines.length, 'lines');

    // Get VT100 canvas context for direct drawing
    if (!this.vt100Renderer.canvas || !this.vt100Renderer.ctx) {
      console.warn('[VscopeRenderer] VT100 canvas not available for vector rendering');
      return;
    }

    const canvas = this.vt100Renderer.canvas;
    const ctx = this.vt100Renderer.ctx;

    // CRITICAL: Ensure canvas is sized properly
    if (canvas.width === 0 || canvas.height === 0) {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      console.log('[VscopeRenderer] Sized canvas:', canvas.width, 'x', canvas.height);
    }

    const targetRegion = this.mapper.getTargetRegion();

    // Calculate pixel positions for target region
    const charWidth = canvas.width / this.vt100Renderer.cols;
    const charHeight = canvas.height / this.vt100Renderer.rows;

    const regionX = targetRegion.col * charWidth;
    const regionY = targetRegion.row * charHeight;
    const regionWidth = targetRegion.cols * charWidth;
    const regionHeight = targetRegion.rows * charHeight;

    // Clear the target region first
    ctx.fillStyle = '#000';
    ctx.fillRect(regionX, regionY, regionWidth, regionHeight);

    // Set up drawing style
    ctx.save();
    ctx.strokeStyle = '#00ff00'; // Green vectors
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    // Draw each line segment
    for (const line of lines) {
      if (!line.p1 || !line.p2) continue;

      // Map canvas coordinates to terminal pixel coordinates
      const p1Terminal = this.mapper.canvasToTerminal(line.p1.x, line.p1.y);
      const p2Terminal = this.mapper.canvasToTerminal(line.p2.x, line.p2.y);

      // Convert terminal cell coordinates to pixel coordinates
      const x1 = regionX + p1Terminal.col * charWidth;
      const y1 = regionY + p1Terminal.row * charHeight;
      const x2 = regionX + p2Terminal.col * charWidth;
      const y2 = regionY + p2Terminal.row * charHeight;

      // Draw line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Render grid overlay to terminal
   */
  renderGrid(gridSize, state) {
    const targetRegion = this.mapper.getTargetRegion();

    // Draw horizontal and vertical lines
    for (let row = 0; row < targetRegion.rows; row++) {
      for (let col = 0; col < targetRegion.cols; col++) {
        const terminalCol = targetRegion.col + col;
        const terminalRow = targetRegion.row + row;

        // Get canvas coordinates
        const canvasPos = this.mapper.terminalToCanvas(col, row);

        // Check if this is a grid line position
        const isVerticalLine = Math.floor(canvasPos.x / gridSize) !== Math.floor((canvasPos.x + 1) / gridSize);
        const isHorizontalLine = Math.floor(canvasPos.y / gridSize) !== Math.floor((canvasPos.y + 1) / gridSize);

        let char = ' ';
        if (isVerticalLine && isHorizontalLine) {
          char = '+'; // Intersection
        } else if (isVerticalLine) {
          char = '|'; // Vertical line
        } else if (isHorizontalLine) {
          char = '-'; // Horizontal line
        }

        if (char !== ' ') {
          this.vt100Renderer.writeAt(terminalCol, terminalRow, char);
        }
      }
    }
  }

  /**
   * Render pixels to terminal
   */
  renderPixels(imageData, region, state) {
    if (!imageData) {
      return;
    }

    const targetRegion = this.mapper.getTargetRegion();

    for (let row = 0; row < targetRegion.rows; row++) {
      for (let col = 0; col < targetRegion.cols; col++) {
        const terminalCol = targetRegion.col + col;
        const terminalRow = targetRegion.row + row;

        // Map to canvas region
        const canvasPos = this.mapper.terminalToCanvas(col, row);

        // Sample pixel brightness
        const brightness = this.samplePixelBrightness(
          imageData,
          canvasPos.x - region.x,
          canvasPos.y - region.y,
          region.width,
          region.height
        );

        // Map brightness to character
        const char = this.brightnessToChar(brightness);

        if (char !== ' ') {
          this.vt100Renderer.writeAt(terminalCol, terminalRow, char);
        }
      }
    }
  }

  /**
   * Sample vector density in a canvas region
   */
  sampleRegionDensity(canvasRegion) {
    let totalDensity = 0;
    let sampleCount = 0;

    // Sample multiple points in the region
    const samples = 4; // 2x2 grid of samples
    const stepX = canvasRegion.width / samples;
    const stepY = canvasRegion.height / samples;

    for (let sy = 0; sy < samples; sy++) {
      for (let sx = 0; sx < samples; sx++) {
        const x = canvasRegion.x + sx * stepX + stepX / 2;
        const y = canvasRegion.y + sy * stepY + stepY / 2;

        const col = this.pixelGrid.canvasToGridCol(x);
        const row = this.pixelGrid.canvasToGridRow(y);

        const density = this.pixelGrid.getCellDensity(col, row);
        totalDensity += density;
        sampleCount++;
      }
    }

    return sampleCount > 0 ? totalDensity / sampleCount : 0;
  }

  /**
   * Sample pixel brightness from image data
   */
  samplePixelBrightness(imageData, x, y, width, height) {
    // Clamp coordinates
    x = Math.max(0, Math.min(width - 1, Math.floor(x)));
    y = Math.max(0, Math.min(height - 1, Math.floor(y)));

    const index = (y * width + x) * 4;

    if (index >= imageData.data.length) {
      return 0;
    }

    const r = imageData.data[index];
    const g = imageData.data[index + 1];
    const b = imageData.data[index + 2];

    // Calculate brightness (luminance)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  /**
   * Map density to character
   */
  densityToChar(density, maxDensity) {
    if (maxDensity === 0 || density === 0) {
      return ' ';
    }

    const normalized = density / maxDensity;
    const index = Math.floor(normalized * (this.densityChars.length - 1));
    return this.densityChars[Math.min(index, this.densityChars.length - 1)];
  }

  /**
   * Map brightness to character
   */
  brightnessToChar(brightness) {
    const index = Math.floor(brightness * (this.densityChars.length - 1));
    return this.densityChars[Math.min(index, this.densityChars.length - 1)];
  }

  /**
   * Clear target region in terminal
   */
  clearTargetRegion() {
    if (!this.vt100Renderer) {
      console.warn('[VscopeRenderer] clearTargetRegion: VT100 renderer not available');
      return;
    }

    const targetRegion = this.mapper.getTargetRegion();

    // Batched clear to prevent flicker
    for (let row = 0; row < targetRegion.rows; row++) {
      for (let col = 0; col < targetRegion.cols; col++) {
        const terminalCol = targetRegion.col + col;
        const terminalRow = targetRegion.row + row;
        this.vt100Renderer.writeAt(terminalCol, terminalRow, ' ', true);
      }
    }

    // CRITICAL: Force render to flush the clear to display
    this.vt100Renderer.requestRender();

    // Also clear the pixel grid to prevent stale data
    if (this.pixelGrid) {
      this.pixelGrid.clear();
    }
  }

  /**
   * Clear entire terminal
   */
  clear() {
    this.clearTargetRegion();
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.clear();
  }
}
