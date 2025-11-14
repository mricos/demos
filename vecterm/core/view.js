/**
 * View - Rendering Target Abstraction
 *
 * Abstract interface for rendering targets (canvas, terminal, 3D, etc.)
 * Views are pure rendering targets with no game logic.
 *
 * World/Field/View Architecture:
 * - World: Entity/component data model (core/world.js)
 * - Field: Runtime container with systems (core/field.js)
 * - View: Rendering layer (this file)
 *
 * View Hierarchy:
 * - View (abstract interface)
 *   - Canvas2DView (2D HTML canvas rendering)
 *   - VT100View (terminal character grid rendering)
 *   - Vecterm3DView (3D wireframe rendering with hidden line removal)
 *   - SVGView (future - vector graphics)
 *
 * Features:
 * - Rendering frames with primitives (2D and 3D)
 * - Multiple viewports per view
 * - Camera management (Camera2D, Camera3D)
 * - Viewport transforms and projections
 * - Clear/reset operations
 * - VT100 effect pipeline (scanlines, bloom, glow, raster wave)
 *
 * Usage:
 *   import { Canvas2DView, Vecterm3DView, Frame } from './core/view.js';
 *   import { VT100EffectPipeline } from './vt100-effects.js';
 *
 *   // 2D rendering with VT100 effects
 *   const view2d = new Canvas2DView('main', 'Main View', canvas);
 *   const effects = new VT100EffectPipeline();
 *   view2d.setEffectPipeline(effects);
 *
 *   const frame = new Frame();
 *   frame.addPrimitive({ type: 'circle', x: 100, y: 100, radius: 50, color: '#0f0' });
 *   view2d.render(frame);
 *
 *   // 3D rendering (requires VectermMath.js and Vecterm.js)
 *   const view3d = new Vecterm3DView('3d', '3D View', canvas);
 *   const mesh = VectermMesh.cube(2);
 *   frame.addMesh(mesh, { position: {x: 0, y: 0, z: 0} }, '#00ff00');
 *   view3d.render(frame);
 */

import { VT100EffectPipeline } from './vt100-effects.js';

/**
 * Abstract View interface
 * All concrete views must implement these methods
 */
export class View {
  constructor(id, name) {
    if (new.target === View) {
      throw new Error('View is abstract and cannot be instantiated directly');
    }

    this.id = id;
    this.name = name;
    this.viewports = new Map(); // name → Viewport
    this.bounds = { x: 0, y: 0, width: 0, height: 0 };

    // VT100 effect pipeline (optional, per-view)
    this.effectPipeline = null;
  }

  /**
   * Render a frame to the view
   * @param {Frame} frame - Rendered frame data
   * @abstract
   */
  render(frame) {
    throw new Error('View.render() must be implemented by subclass');
  }

  /**
   * Clear the view
   * @abstract
   */
  clear() {
    throw new Error('View.clear() must be implemented by subclass');
  }

  /**
   * Get view dimensions
   * @returns {{width: number, height: number}}
   */
  getDimensions() {
    return {
      width: this.bounds.width,
      height: this.bounds.height
    };
  }

  /**
   * Set VT100 effect pipeline for this view
   * @param {VT100EffectPipeline} pipeline - Effect pipeline instance
   */
  setEffectPipeline(pipeline) {
    this.effectPipeline = pipeline;
  }

  /**
   * Get VT100 effect pipeline
   * @returns {VT100EffectPipeline|null}
   */
  getEffectPipeline() {
    return this.effectPipeline;
  }

  /**
   * Apply VT100 effects (called by subclasses after rendering)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Function} bloomCallback - Optional callback for bloom content
   */
  applyEffects(ctx, bloomCallback = null) {
    if (!this.effectPipeline) return;

    const { width, height } = this.getDimensions();
    this.effectPipeline.applyAll(ctx, width, height, bloomCallback);
  }

  /**
   * Create viewport on this view
   * @param {string} name - Viewport name
   * @param {Object} rect - Viewport rectangle {x, y, width, height}
   * @param {Camera} camera - Camera for projection
   * @returns {Viewport}
   */
  createViewport(name, rect, camera) {
    const viewport = new Viewport(name, this, rect, camera);
    this.viewports.set(name, viewport);
    return viewport;
  }

  /**
   * Get viewport by name
   * @param {string} name - Viewport name
   * @returns {Viewport|undefined}
   */
  getViewport(name) {
    return this.viewports.get(name);
  }

  /**
   * Remove viewport
   * @param {string} name - Viewport name
   */
  removeViewport(name) {
    return this.viewports.delete(name);
  }

  /**
   * Get all viewports
   * @returns {Array<Viewport>}
   */
  getAllViewports() {
    return Array.from(this.viewports.values());
  }
}

/**
 * Canvas2DView - HTML Canvas rendering target
 */
export class Canvas2DView extends View {
  constructor(id, name, canvasElement) {
    super(id, name);

    if (!canvasElement) {
      throw new Error('Canvas element is required');
    }

    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    this.bounds = {
      x: 0,
      y: 0,
      width: canvasElement.width,
      height: canvasElement.height
    };

    // Rendering options
    this.options = {
      antialias: true,
      backgroundColor: '#000000'
    };
  }

  /**
   * Render frame to Canvas2D view
   * @param {Frame} frame - Frame with drawing commands
   */
  render(frame) {
    const ctx = this.ctx;

    // Clear if needed
    if (frame.clearBefore) {
      this.clear();
    }

    // Update effect pipeline time if present
    if (this.effectPipeline && frame.deltaTime) {
      this.effectPipeline.update(frame.deltaTime);
    }

    // Apply viewport transform if frame has viewport
    if (frame.viewport) {
      ctx.save();
      const vp = frame.viewport;
      ctx.translate(vp.rect.x, vp.rect.y);
      ctx.rect(0, 0, vp.rect.width, vp.rect.height);
      ctx.clip();
    }

    // Render primitives
    for (const primitive of frame.primitives) {
      this.renderPrimitive(ctx, primitive);
    }

    if (frame.viewport) {
      ctx.restore();
    }

    // Apply VT100 effects after rendering (scanlines, bloom, etc)
    if (this.effectPipeline) {
      // Bloom callback: re-render primitives for bloom layer
      const bloomCallback = (ctx, rasterOffset) => {
        for (const primitive of frame.primitives) {
          // Apply raster offset if primitive supports it
          if (rasterOffset && primitive.x !== undefined) {
            ctx.save();
            ctx.translate(rasterOffset, 0);
            this.renderPrimitive(ctx, primitive);
            ctx.restore();
          } else {
            this.renderPrimitive(ctx, primitive);
          }
        }
      };

      this.applyEffects(ctx, bloomCallback);
    }
  }

  /**
   * Render a single primitive
   */
  renderPrimitive(ctx, primitive) {
    ctx.save();

    switch (primitive.type) {
      case 'line':
        this.drawLine(ctx, primitive);
        break;
      case 'rect':
        this.drawRect(ctx, primitive);
        break;
      case 'circle':
        this.drawCircle(ctx, primitive);
        break;
      case 'polygon':
        this.drawPolygon(ctx, primitive);
        break;
      case 'text':
        this.drawText(ctx, primitive);
        break;
      default:
        console.warn(`Unknown primitive type: ${primitive.type}`);
    }

    ctx.restore();
  }

  drawLine(ctx, { from, to, color = '#ffffff', width = 1 }) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  drawRect(ctx, { x, y, width, height, color = '#ffffff', filled = false }) {
    if (filled) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, width, height);
    } else {
      ctx.strokeStyle = color;
      ctx.strokeRect(x, y, width, height);
    }
  }

  drawCircle(ctx, { x, y, radius, color = '#ffffff', filled = false }) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);

    if (filled) {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }

  drawPolygon(ctx, { points, color = '#ffffff', filled = false }) {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.closePath();

    if (filled) {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }

  drawText(ctx, { x, y, text, color = '#ffffff', font = '16px monospace' }) {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.fillText(text, x, y);
  }

  /**
   * Clear the canvas
   */
  clear() {
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Resize canvas
   */
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.bounds.width = width;
    this.bounds.height = height;
  }
}

/**
 * VT100View - Terminal character grid rendering target
 * Used for terminal-based vector graphics visualization
 */
export class VT100View extends View {
  constructor(id, name, canvasElement, cols = 80, rows = 24) {
    super(id, name);

    if (!canvasElement) {
      throw new Error('Canvas element is required for VT100View');
    }

    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    this.cols = cols;
    this.rows = rows;

    // Character cell dimensions
    this.charWidth = canvasElement.width / cols;
    this.charHeight = canvasElement.height / rows;

    this.bounds = {
      x: 0,
      y: 0,
      width: canvasElement.width,
      height: canvasElement.height
    };

    // Terminal buffer (2D array of characters)
    this.buffer = this.createBuffer();

    // Color buffer (for colored characters)
    this.colorBuffer = this.createBuffer();

    // Terminal style
    this.style = {
      fgColor: '#00ff00',  // Green phosphor
      bgColor: '#000000',
      font: '16px "Courier New", monospace',
      glow: true,
      glowIntensity: 5
    };

    // Character density palette for vector rendering
    this.densityChars = ' ·:+=*#█';
  }

  createBuffer() {
    const buffer = [];
    for (let y = 0; y < this.rows; y++) {
      buffer[y] = [];
      for (let x = 0; x < this.cols; x++) {
        buffer[y][x] = ' ';
      }
    }
    return buffer;
  }

  /**
   * Render frame to terminal grid
   * @param {Frame} frame - Frame with terminal-specific data
   */
  render(frame) {
    // Clear buffer if needed
    if (frame.clearBefore) {
      this.clearBuffer();
    }

    // Render primitives to buffer
    for (const primitive of frame.primitives) {
      this.renderPrimitiveToBuffer(primitive);
    }

    // Blit buffer to canvas
    this.blitBuffer();
  }

  /**
   * Render primitive to character buffer
   */
  renderPrimitiveToBuffer(primitive) {
    switch (primitive.type) {
      case 'char':
        // Direct character placement
        this.setChar(primitive.col, primitive.row, primitive.char, primitive.color);
        break;

      case 'line':
        // Line drawing using Bresenham's algorithm
        this.drawLineToBuffer(primitive);
        break;

      case 'rect':
        this.drawRectToBuffer(primitive);
        break;

      default:
        // For complex primitives, rasterize to cells
        this.rasterizePrimitive(primitive);
    }
  }

  setChar(col, row, char, color) {
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      this.buffer[row][col] = char;
      if (color) {
        this.colorBuffer[row][col] = color;
      }
    }
  }

  drawLineToBuffer({ from, to, char = '█', color }) {
    // Convert canvas coordinates to terminal coordinates
    const x0 = Math.floor(from.x / this.charWidth);
    const y0 = Math.floor(from.y / this.charHeight);
    const x1 = Math.floor(to.x / this.charWidth);
    const y1 = Math.floor(to.y / this.charHeight);

    // Bresenham's line algorithm
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      this.setChar(x, y, char, color);

      if (x === x1 && y === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  drawRectToBuffer({ x, y, width, height, char = '█', color, filled = false }) {
    const col0 = Math.floor(x / this.charWidth);
    const row0 = Math.floor(y / this.charHeight);
    const col1 = Math.floor((x + width) / this.charWidth);
    const row1 = Math.floor((y + height) / this.charHeight);

    if (filled) {
      for (let row = row0; row <= row1; row++) {
        for (let col = col0; col <= col1; col++) {
          this.setChar(col, row, char, color);
        }
      }
    } else {
      // Draw border
      for (let col = col0; col <= col1; col++) {
        this.setChar(col, row0, char, color);
        this.setChar(col, row1, char, color);
      }
      for (let row = row0; row <= row1; row++) {
        this.setChar(col0, row, char, color);
        this.setChar(col1, row, char, color);
      }
    }
  }

  rasterizePrimitive(primitive) {
    // For complex shapes, sample the canvas region
    // This is a fallback for primitives that don't have terminal-specific rendering
    console.warn('Rasterization not yet implemented for primitive:', primitive.type);
  }

  /**
   * Blit character buffer to canvas
   */
  blitBuffer() {
    const ctx = this.ctx;

    // Clear canvas
    ctx.fillStyle = this.style.bgColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Set font
    ctx.font = this.style.font;
    ctx.textBaseline = 'top';

    // Add glow effect if enabled
    if (this.style.glow) {
      ctx.shadowColor = this.style.fgColor;
      ctx.shadowBlur = this.style.glowIntensity;
    }

    // Render buffer
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const char = this.buffer[row][col];
        if (char !== ' ') {
          const x = col * this.charWidth;
          const y = row * this.charHeight;

          // Use custom color if available, otherwise use default
          ctx.fillStyle = this.colorBuffer[row][col] || this.style.fgColor;
          ctx.fillText(char, x, y);
        }
      }
    }
  }

  clearBuffer() {
    this.buffer = this.createBuffer();
    this.colorBuffer = this.createBuffer();
  }

  /**
   * Clear the surface
   */
  clear() {
    this.clearBuffer();
    this.ctx.fillStyle = this.style.bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Write text at position
   */
  writeAt(col, row, text, color) {
    for (let i = 0; i < text.length && col + i < this.cols; i++) {
      this.setChar(col + i, row, text[i], color);
    }
  }

  /**
   * Get character at position
   */
  getChar(col, row) {
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      return this.buffer[row][col];
    }
    return ' ';
  }
}

/**
 * Vecterm3DView - 3D wireframe rendering view
 * Uses the Vecterm renderer for hidden-line removal 3D graphics
 *
 * Requires:
 * - VectermMath.js (Vector3, Matrix4, Camera)
 * - Vecterm.js (Vecterm renderer, VectermMesh)
 *
 * These must be loaded via <script> tags before using this view.
 */
export class Vecterm3DView extends View {
  constructor(id, name, canvasElement, config = {}) {
    super(id, name);

    if (!canvasElement) {
      throw new Error('Canvas element is required for Vecterm3DView');
    }

    // Check dependencies
    if (typeof window === 'undefined' || !window.Vecterm || !window.VectermMath) {
      throw new Error('Vecterm3DView requires Vecterm.js and VectermMath.js to be loaded');
    }

    this.canvas = canvasElement;
    this.bounds = {
      x: 0,
      y: 0,
      width: canvasElement.width,
      height: canvasElement.height
    };

    // Create Vecterm renderer
    this.vecterm = new window.Vecterm(canvasElement);

    // Default camera
    this.camera = config.camera || new window.VectermMath.Camera(
      new window.VectermMath.Vector3(0, 5, 10), // position
      new window.VectermMath.Vector3(0, 0, 0)   // target
    );

    // Apply config
    if (config.vecterm) {
      Object.keys(config.vecterm).forEach(key => {
        this.vecterm.config[key] = config.vecterm[key];
      });
    }

    // Track time for animations
    this.time = 0;
  }

  /**
   * Render frame to 3D view
   * @param {Frame} frame - Frame with 3D mesh primitives
   */
  render(frame) {
    if (frame.clearBefore !== false) {
      this.clear();
    }

    // Update time
    const deltaTime = frame.metadata?.deltaTime || 0.016;
    this.time += deltaTime;

    // Collect mesh primitives from frame
    const meshes = [];

    for (const primitive of frame.primitives) {
      if (primitive.type === 'mesh') {
        meshes.push({
          mesh: primitive.mesh,
          transform: primitive.transform || {
            position: new window.VectermMath.Vector3(0, 0, 0),
            rotation: new window.VectermMath.Vector3(0, 0, 0),
            scale: new window.VectermMath.Vector3(1, 1, 1)
          },
          color: primitive.color || this.vecterm.config.phosphorColor
        });
      }
    }

    // Use frame camera if provided, otherwise use default
    const camera = frame.metadata?.camera || this.camera;

    // Render with Vecterm
    this.vecterm.render(meshes, camera, deltaTime);
  }

  /**
   * Clear the view
   */
  clear() {
    this.vecterm.clear();
  }

  /**
   * Set camera
   * @param {VectermMath.Camera} camera - Camera instance
   */
  setCamera(camera) {
    this.camera = camera;
  }

  /**
   * Get camera
   * @returns {VectermMath.Camera}
   */
  getCamera() {
    return this.camera;
  }

  /**
   * Update Vecterm config
   * @param {string} path - Config path (e.g., 'phosphorColor', 'hiddenLineRemoval')
   * @param {*} value - Config value
   */
  setConfig(path, value) {
    this.vecterm.setConfig(path, value);
  }

  /**
   * Get Vecterm config
   * @param {string} path - Config path
   * @returns {*}
   */
  getConfig(path) {
    return this.vecterm.getConfig(path);
  }

  /**
   * Resize canvas
   */
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.bounds.width = width;
    this.bounds.height = height;
    this.vecterm.width = width;
    this.vecterm.height = height;
  }
}

/**
 * Viewport - Window onto a View
 * Manages camera, projection, and clipping for a region of a view
 */
export class Viewport {
  constructor(name, view, rect, camera) {
    this.name = name;
    this.view = view;
    this.rect = rect; // {x, y, width, height} in view coordinates
    this.camera = camera;
  }

  /**
   * Get viewport bounds in view coordinates
   */
  getBounds() {
    return { ...this.rect };
  }

  /**
   * Update viewport rectangle
   */
  setRect(rect) {
    this.rect = { ...rect };
  }

  /**
   * Update camera
   */
  setCamera(camera) {
    this.camera = camera;
  }

  /**
   * Project world coordinates to viewport coordinates
   */
  worldToViewport(worldX, worldY) {
    // Apply camera transform
    const { x, y } = this.camera.worldToScreen(worldX, worldY);

    // Scale to viewport
    return {
      x: this.rect.x + (x / this.camera.viewWidth) * this.rect.width,
      y: this.rect.y + (y / this.camera.viewHeight) * this.rect.height
    };
  }

  /**
   * Project viewport coordinates to world coordinates
   */
  viewportToWorld(viewportX, viewportY) {
    // Scale from viewport to camera space
    const x = ((viewportX - this.rect.x) / this.rect.width) * this.camera.viewWidth;
    const y = ((viewportY - this.rect.y) / this.rect.height) * this.camera.viewHeight;

    // Apply inverse camera transform
    return this.camera.screenToWorld(x, y);
  }
}

/**
 * Simple camera for 2D projection
 */
export class Camera2D {
  constructor(x = 0, y = 0, width = 800, height = 600, zoom = 1) {
    this.x = x;
    this.y = y;
    this.viewWidth = width;
    this.viewHeight = height;
    this.zoom = zoom;
  }

  worldToScreen(worldX, worldY) {
    return {
      x: (worldX - this.x) * this.zoom,
      y: (worldY - this.y) * this.zoom
    };
  }

  screenToWorld(screenX, screenY) {
    return {
      x: screenX / this.zoom + this.x,
      y: screenY / this.zoom + this.y
    };
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  setZoom(zoom) {
    this.zoom = zoom;
  }
}

/**
 * Camera3D - Wrapper for VectermMath.Camera
 * Provides a unified interface for 3D camera operations
 *
 * Note: This is a convenience wrapper. You can also use VectermMath.Camera directly.
 */
export class Camera3D {
  /**
   * Create a 3D camera
   * @param {Object} position - {x, y, z} camera position
   * @param {Object} target - {x, y, z} look-at target
   * @param {number} fov - Field of view in radians (default: Math.PI/4)
   * @param {number} near - Near clipping plane (default: 0.1)
   * @param {number} far - Far clipping plane (default: 1000)
   */
  constructor(position = {x: 0, y: 5, z: 10}, target = {x: 0, y: 0, z: 0}, fov, near, far) {
    if (typeof window === 'undefined' || !window.VectermMath) {
      throw new Error('Camera3D requires VectermMath.js to be loaded');
    }

    // Create VectermMath.Camera instance
    this.camera = new window.VectermMath.Camera(
      new window.VectermMath.Vector3(position.x, position.y, position.z),
      new window.VectermMath.Vector3(target.x, target.y, target.z)
    );

    // Set optional parameters
    if (fov !== undefined) this.camera.fov = fov;
    if (near !== undefined) this.camera.near = near;
    if (far !== undefined) this.camera.far = far;
  }

  /**
   * Get the underlying VectermMath.Camera instance
   * @returns {VectermMath.Camera}
   */
  getCamera() {
    return this.camera;
  }

  /**
   * Set camera position
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setPosition(x, y, z) {
    this.camera.position = new window.VectermMath.Vector3(x, y, z);
    return this;
  }

  /**
   * Set look-at target
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setTarget(x, y, z) {
    this.camera.target = new window.VectermMath.Vector3(x, y, z);
    return this;
  }

  /**
   * Orbit camera around target
   * @param {number} azimuth - Horizontal angle (radians)
   * @param {number} elevation - Vertical angle (radians)
   * @param {number} distance - Distance from target
   */
  orbit(azimuth, elevation, distance) {
    const x = distance * Math.cos(elevation) * Math.sin(azimuth);
    const y = distance * Math.sin(elevation);
    const z = distance * Math.cos(elevation) * Math.cos(azimuth);

    this.camera.position = new window.VectermMath.Vector3(
      this.camera.target.x + x,
      this.camera.target.y + y,
      this.camera.target.z + z
    );
    return this;
  }

  /**
   * Get view matrix
   * @returns {VectermMath.Matrix4}
   */
  getViewMatrix() {
    return this.camera.getViewMatrix();
  }

  /**
   * Get projection matrix
   * @returns {VectermMath.Matrix4}
   */
  getProjectionMatrix() {
    return this.camera.getProjectionMatrix();
  }
}

/**
 * Frame - Render data passed to views
 * Contains primitives and metadata for rendering
 *
 * Supported primitive types:
 *
 * 2D Primitives (Canvas2DView, VT100View):
 * - line: { type: 'line', from: {x, y}, to: {x, y}, color, width }
 * - rect: { type: 'rect', x, y, width, height, color, filled }
 * - circle: { type: 'circle', x, y, radius, color, filled }
 * - polygon: { type: 'polygon', points: [{x, y}, ...], color, filled }
 * - text: { type: 'text', x, y, text, color, font }
 *
 * 3D Primitives (Vecterm3DView):
 * - mesh: {
 *     type: 'mesh',
 *     mesh: VectermMesh,  // Vecterm mesh instance (cube, sphere, box, etc.)
 *     transform: {
 *       position: {x, y, z},
 *       rotation: {x, y, z},  // Euler angles in radians
 *       scale: {x, y, z}
 *     },
 *     color: '#00ff00'
 *   }
 *
 * VT100 Specific:
 * - char: { type: 'char', col, row, char, color }
 */
export class Frame {
  constructor(options = {}) {
    this.primitives = options.primitives || [];
    this.viewport = options.viewport || null;
    this.clearBefore = options.clearBefore !== undefined ? options.clearBefore : true;
    this.metadata = options.metadata || {};
    this.deltaTime = options.deltaTime || 0; // For VT100 effect time updates
  }

  /**
   * Add a primitive to the frame
   * @param {Object} primitive - Primitive object (see class docs for types)
   */
  addPrimitive(primitive) {
    this.primitives.push(primitive);
  }

  /**
   * Add a 3D mesh primitive
   * @param {Object} mesh - VectermMesh instance
   * @param {Object} transform - {position, rotation, scale}
   * @param {string} color - Hex color
   */
  addMesh(mesh, transform = {}, color = '#00ff00') {
    this.primitives.push({
      type: 'mesh',
      mesh,
      transform: {
        position: transform.position || {x: 0, y: 0, z: 0},
        rotation: transform.rotation || {x: 0, y: 0, z: 0},
        scale: transform.scale || {x: 1, y: 1, z: 1}
      },
      color
    });
  }

  /**
   * Clear all primitives
   */
  clear() {
    this.primitives = [];
  }
}

/**
 * View registry for managing all rendering targets
 */
export class ViewRegistry {
  constructor() {
    this.views = new Map(); // id → View
  }

  register(view) {
    this.views.set(view.id, view);
    return view;
  }

  unregister(id) {
    return this.views.delete(id);
  }

  get(id) {
    return this.views.get(id);
  }

  getAll() {
    return Array.from(this.views.values());
  }

  getByName(name) {
    for (const view of this.views.values()) {
      if (view.name === name) {
        return view;
      }
    }
    return null;
  }
}

// Export singleton registry
export const viewRegistry = new ViewRegistry();
