/**
 * CanvasRenderer - 2D Canvas rendering for Cann
 *
 * Renders Grid state to a canvas element with:
 * - Configurable color mapping
 * - Scale-aware rendering (resolution ↔ stage)
 * - Optional 3D projection (height field visualization)
 * - Overlay support for debugging (gradients, loss, etc.)
 */

export class CanvasRenderer {
  /**
   * @param {Object} config
   * @param {HTMLCanvasElement} config.canvas - Target canvas
   * @param {number} [config.cellSize=4] - Pixels per cell
   * @param {Array<string>} [config.palette] - Color palette
   * @param {string} [config.mode='rgba'] - 'rgba' | 'grayscale' | 'heatmap' | 'custom'
   * @param {boolean} [config.smooth=false] - Enable image smoothing
   */
  constructor(config = {}) {
    this.canvas = config.canvas;
    this.ctx = this.canvas?.getContext('2d');
    this.cellSize = config.cellSize || 4;
    this.mode = config.mode || 'rgba';
    this.smooth = config.smooth || false;
    this.palette = config.palette || CanvasRenderer.defaultPalette;

    // Grid reference
    this.grid = null;

    // Off-screen buffer for efficient rendering
    this._buffer = null;
    this._bufferCtx = null;

    // 3D projection state (hidden abstraction)
    this._projectionMode = 'flat'; // 'flat' | 'heightfield' | 'isometric'
    this._cameraAngle = 0;
    this._lightDirection = [0.5, 0.5, 1];

    // Overlays
    this._overlays = [];

    // Performance
    this._lastRenderTime = 0;

    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = this.smooth;
    }
  }

  /**
   * Attach grid for rendering
   */
  setGrid(grid) {
    this.grid = grid;
    this._initBuffer();
    return this;
  }

  _initBuffer() {
    if (!this.grid) return;

    // Create off-screen buffer at native grid resolution
    this._buffer = document.createElement('canvas');
    this._buffer.width = this.grid.width;
    this._buffer.height = this.grid.height;
    this._bufferCtx = this._buffer.getContext('2d');
    this._bufferCtx.imageSmoothingEnabled = false;
  }

  /**
   * Render current grid state
   */
  render() {
    if (!this.grid || !this.ctx) return this;

    const start = performance.now();

    // Render to buffer at native resolution
    this._renderToBuffer();

    // Scale buffer to canvas
    this.ctx.imageSmoothingEnabled = this.smooth;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(
      this._buffer,
      0, 0, this.grid.width, this.grid.height,
      0, 0, this.canvas.width, this.canvas.height
    );

    // Render overlays
    for (const overlay of this._overlays) {
      overlay.render(this.ctx, this.grid, this);
    }

    this._lastRenderTime = performance.now() - start;
    return this;
  }

  _renderToBuffer() {
    switch (this._projectionMode) {
      case 'heightfield':
        this._renderHeightField();
        break;
      case 'isometric':
        this._renderIsometric();
        break;
      default:
        this._renderFlat();
    }
  }

  _renderFlat() {
    const imageData = this._bufferCtx.createImageData(this.grid.width, this.grid.height);
    const { width, height, channels } = this.grid;
    const data = this.grid.getData();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gridIdx = (y * width + x) * channels;
        const imgIdx = (y * width + x) * 4;

        const color = this._mapColor(data, gridIdx, channels);
        imageData.data[imgIdx] = color[0];
        imageData.data[imgIdx + 1] = color[1];
        imageData.data[imgIdx + 2] = color[2];
        imageData.data[imgIdx + 3] = color[3];
      }
    }

    this._bufferCtx.putImageData(imageData, 0, 0);
  }

  _mapColor(data, idx, channels) {
    switch (this.mode) {
      case 'rgba':
        return [
          Math.floor(data[idx] * 255),
          Math.floor((data[idx + 1] || 0) * 255),
          Math.floor((data[idx + 2] || 0) * 255),
          Math.floor((data[idx + 3] ?? 1) * 255)
        ];

      case 'grayscale':
        const gray = Math.floor(data[idx] * 255);
        return [gray, gray, gray, 255];

      case 'heatmap':
        return this._heatmap(data[idx]);

      case 'palette':
        return this._paletteMap(data[idx]);

      default:
        const val = Math.floor(data[idx] * 255);
        return [val, val, val, 255];
    }
  }

  _heatmap(value) {
    // Blue -> Cyan -> Green -> Yellow -> Red
    const v = Math.max(0, Math.min(1, value));
    let r, g, b;

    if (v < 0.25) {
      r = 0;
      g = Math.floor(v * 4 * 255);
      b = 255;
    } else if (v < 0.5) {
      r = 0;
      g = 255;
      b = Math.floor((1 - (v - 0.25) * 4) * 255);
    } else if (v < 0.75) {
      r = Math.floor((v - 0.5) * 4 * 255);
      g = 255;
      b = 0;
    } else {
      r = 255;
      g = Math.floor((1 - (v - 0.75) * 4) * 255);
      b = 0;
    }

    return [r, g, b, 255];
  }

  _paletteMap(value) {
    const idx = Math.floor(value * (this.palette.length - 1));
    const color = this.palette[Math.max(0, Math.min(idx, this.palette.length - 1))];
    return this._parseColor(color);
  }

  _parseColor(color) {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        255
      ];
    }
    return [128, 128, 128, 255];
  }

  // === 3D Projection (Hidden Abstraction) ===

  /**
   * Set projection mode
   * @param {string} mode - 'flat' | 'heightfield' | 'isometric'
   */
  setProjection(mode) {
    this._projectionMode = mode;
    return this;
  }

  _renderHeightField() {
    const { width, height } = this.grid;
    const imageData = this._bufferCtx.createImageData(width, height);

    // Use first channel as height, compute normals for shading
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const h = this.grid.getChannel(x, y, 0);

        // Compute normal from height differences
        const hx = this.grid.getChannel(x + 1, y, 0) - this.grid.getChannel(x - 1, y, 0);
        const hy = this.grid.getChannel(x, y + 1, 0) - this.grid.getChannel(x, y - 1, 0);

        // Normalized normal
        const len = Math.sqrt(hx * hx + hy * hy + 1);
        const nx = -hx / len;
        const ny = -hy / len;
        const nz = 1 / len;

        // Diffuse lighting
        const [lx, ly, lz] = this._lightDirection;
        const diffuse = Math.max(0, nx * lx + ny * ly + nz * lz);

        // Color based on height and lighting
        const brightness = 0.3 + 0.7 * diffuse;
        const r = Math.floor(h * brightness * 255);
        const g = Math.floor(h * brightness * 200);
        const b = Math.floor((1 - h) * brightness * 255);

        const idx = (y * width + x) * 4;
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 255;
      }
    }

    this._bufferCtx.putImageData(imageData, 0, 0);
  }

  _renderIsometric() {
    // Simple isometric projection
    const { width, height } = this.grid;

    this._bufferCtx.fillStyle = '#1a1a2e';
    this._bufferCtx.fillRect(0, 0, width, height);

    const scale = 0.5;
    const heightScale = 20;

    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        const h = this.grid.getChannel(x, y, 0) * heightScale;

        // Isometric projection
        const isoX = (x - y) * scale + width / 2;
        const isoY = (x + y) * scale * 0.5 - h + height / 2;

        // Color from channels
        const r = Math.floor(this.grid.getChannel(x, y, 0) * 255);
        const g = Math.floor((this.grid.getChannel(x, y, 1) || 0) * 255);
        const b = Math.floor((this.grid.getChannel(x, y, 2) || 0) * 255);

        this._bufferCtx.fillStyle = `rgb(${r},${g},${b})`;
        this._bufferCtx.fillRect(Math.floor(isoX), Math.floor(isoY), 2, 2);
      }
    }
  }

  // === Overlays ===

  /**
   * Add debug overlay
   * @param {Object} overlay - { name, render(ctx, grid, renderer) }
   */
  addOverlay(overlay) {
    this._overlays.push(overlay);
    return this;
  }

  removeOverlay(name) {
    this._overlays = this._overlays.filter(o => o.name !== name);
    return this;
  }

  // === Resize ===

  /**
   * Resize canvas
   */
  resize(width, height) {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    return this;
  }

  /**
   * Auto-fit to grid size
   */
  fitToGrid() {
    if (this.grid && this.canvas) {
      this.canvas.width = this.grid.width * this.cellSize;
      this.canvas.height = this.grid.height * this.cellSize;
    }
    return this;
  }

  // === Utils ===

  /**
   * Get rendering statistics
   */
  getStats() {
    return {
      renderTime: this._lastRenderTime,
      fps: this._lastRenderTime > 0 ? 1000 / this._lastRenderTime : 0,
      bufferSize: this._buffer ? this._buffer.width * this._buffer.height * 4 : 0
    };
  }

  /**
   * Export canvas as data URL
   */
  toDataURL(type = 'image/png') {
    return this.canvas?.toDataURL(type);
  }

  /**
   * Clean up
   */
  destroy() {
    this._buffer = null;
    this._bufferCtx = null;
    this.grid = null;
    this._overlays = [];
  }
}

/**
 * Default color palette
 */
CanvasRenderer.defaultPalette = [
  '#000000', // Black
  '#1a1a2e', // Dark blue
  '#16213e', // Navy
  '#0f3460', // Blue
  '#e94560', // Pink
  '#ff6b6b', // Coral
  '#feca57', // Yellow
  '#ffffff'  // White
];

/**
 * Built-in overlays
 */
CanvasRenderer.overlays = {
  grid: {
    name: 'grid',
    render(ctx, grid, renderer) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      const cellSize = renderer.cellSize;

      for (let x = 0; x <= grid.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, grid.height * cellSize);
        ctx.stroke();
      }
      for (let y = 0; y <= grid.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(grid.width * cellSize, y * cellSize);
        ctx.stroke();
      }
    }
  },

  stats: {
    name: 'stats',
    render(ctx, grid, renderer) {
      const stats = grid.getStats();
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(10, 10, 150, 60);
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.fillText(`Density: ${(stats.density * 100).toFixed(1)}%`, 20, 30);
      ctx.fillText(`Mean: ${stats.mean[0].toFixed(3)}`, 20, 45);
      ctx.fillText(`Render: ${renderer._lastRenderTime.toFixed(1)}ms`, 20, 60);
    }
  }
};
