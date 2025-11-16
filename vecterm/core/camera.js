/**
 * Camera System for Normalized Coordinate Space
 *
 * COORDINATE SYSTEM:
 * - All coordinates normalized to -1 to 1 range
 * - x: -1 (left) to 1 (right)
 * - y: -1 (bottom) to 1 (top)
 * - z: -1 (far) to 1 (near)
 * - Resolution independent, scales to any canvas size
 *
 * CAMERA MODES:
 * - 2D: Orthographic, looking down z-axis
 * - 3D: Full perspective camera, can orbit
 * - PixelVector: Fixed camera with poetic z-depth fade
 */

class NormalizedCamera {
  constructor(canvas) {
    this.canvas = canvas;

    // Camera position in normalized space (-1 to 1)
    this.position = { x: 0, y: 0, z: 2 };  // Start above the scene

    // Camera target (what it's looking at)
    this.target = { x: 0, y: 0, z: 0 };

    // Camera up vector
    this.up = { x: 0, y: 1, z: 0 };

    // Field of view (for perspective)
    this.fov = Math.PI / 4;  // 45 degrees
    this.near = 0.1;
    this.far = 10;

    // Zoom level (affects FOV or orthographic scale)
    this.zoom = 1.0;
    this.minZoom = 0.1;
    this.maxZoom = 10.0;

    // Render mode
    this.mode = '2d';  // '2d' | '3d' | 'pixelvector'

    // Pan/drag state
    this.isPanning = false;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Home position
    this.homePosition = { x: 0, y: 0, z: 2 };
    this.homeTarget = { x: 0, y: 0, z: 0 };
    this.homeZoom = 1.0;

    // Bind event handlers
    this.handleWheel = this.handleWheel.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  /**
   * Initialize camera controls
   */
  init() {
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);

    console.log('[CAMERA] Normalized coordinate system: x,y,z ∈ [-1, 1]');
    console.log('[CAMERA] Controls: wheel=zoom, drag=pan, shift+drag=orbit');
  }

  /**
   * Cleanup
   */
  destroy() {
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
  }

  /**
   * Mouse wheel: zoom in/out
   */
  handleWheel(e) {
    e.preventDefault();

    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomDelta));
  }

  /**
   * Mouse down: start pan or orbit
   */
  handleMouseDown(e) {
    if (e.button !== 0) return;

    this.isDragging = true;
    this.isPanning = !e.shiftKey;  // Shift = orbit, otherwise pan
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    this.canvas.style.cursor = 'grabbing';
  }

  /**
   * Mouse move: pan or orbit camera
   */
  handleMouseMove(e) {
    if (!this.isDragging) {
      this.canvas.style.cursor = 'grab';
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const dx = (e.clientX - this.lastMouseX) / rect.width;
    const dy = (e.clientY - this.lastMouseY) / rect.height;

    if (this.isPanning) {
      // Pan: move camera and target together
      const right = this.getRightVector();
      const up = this.getUpVector();

      const panSpeed = 2 / this.zoom;
      const panX = -dx * panSpeed;
      const panY = dy * panSpeed;

      this.position.x += right.x * panX + up.x * panY;
      this.position.y += right.y * panX + up.y * panY;
      this.position.z += right.z * panX + up.z * panY;

      this.target.x += right.x * panX + up.x * panY;
      this.target.y += right.y * panX + up.y * panY;
      this.target.z += right.z * panX + up.z * panY;
    } else {
      // Orbit: rotate camera around target
      const orbitSpeed = Math.PI;
      const azimuthDelta = -dx * orbitSpeed;
      const elevationDelta = -dy * orbitSpeed;

      this.orbit(azimuthDelta, elevationDelta);
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  /**
   * Mouse up: end dragging
   */
  handleMouseUp(e) {
    this.isDragging = false;
    this.isPanning = false;
    this.canvas.style.cursor = 'grab';
  }

  /**
   * Orbit camera around target
   */
  orbit(azimuthDelta, elevationDelta) {
    // Calculate current offset from target
    const offset = {
      x: this.position.x - this.target.x,
      y: this.position.y - this.target.y,
      z: this.position.z - this.target.z
    };

    // Current spherical coordinates
    const radius = Math.sqrt(offset.x * offset.x + offset.y * offset.y + offset.z * offset.z);
    let azimuth = Math.atan2(offset.x, offset.z);
    let elevation = Math.asin(offset.y / radius);

    // Apply deltas
    azimuth += azimuthDelta;
    elevation = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, elevation + elevationDelta));

    // Convert back to Cartesian
    offset.x = radius * Math.sin(azimuth) * Math.cos(elevation);
    offset.y = radius * Math.sin(elevation);
    offset.z = radius * Math.cos(azimuth) * Math.cos(elevation);

    // Update camera position
    this.position.x = this.target.x + offset.x;
    this.position.y = this.target.y + offset.y;
    this.position.z = this.target.z + offset.z;
  }

  /**
   * Get camera right vector
   */
  getRightVector() {
    const forward = {
      x: this.target.x - this.position.x,
      y: this.target.y - this.position.y,
      z: this.target.z - this.position.z
    };

    // Right = forward × up
    const right = this.cross(forward, this.up);
    return this.normalize(right);
  }

  /**
   * Get camera up vector (normalized)
   */
  getUpVector() {
    return this.normalize(this.up);
  }

  /**
   * Get camera forward vector
   */
  getForwardVector() {
    const forward = {
      x: this.target.x - this.position.x,
      y: this.target.y - this.position.y,
      z: this.target.z - this.position.z
    };
    return this.normalize(forward);
  }

  /**
   * Cross product
   */
  cross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }

  /**
   * Normalize vector
   */
  normalize(v) {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (length === 0) return { x: 0, y: 0, z: 0 };
    return {
      x: v.x / length,
      y: v.y / length,
      z: v.z / length
    };
  }

  /**
   * Reset to home position
   */
  home() {
    this.position = { ...this.homePosition };
    this.target = { ...this.homeTarget };
    this.zoom = this.homeZoom;
  }

  /**
   * Set home position
   */
  setHome(position, target, zoom) {
    this.homePosition = { ...position };
    this.homeTarget = { ...target };
    this.homeZoom = zoom || 1.0;
  }

  /**
   * Transform normalized coordinates to screen pixels
   */
  normalizedToScreen(nx, ny) {
    // Apply camera transform based on mode
    if (this.mode === '2d') {
      // Simple orthographic projection
      const aspect = this.canvas.width / this.canvas.height;
      const scale = this.zoom;

      // Offset by camera position
      const viewX = (nx - this.target.x) * scale;
      const viewY = (ny - this.target.y) * scale;

      // Convert to screen space
      const sx = (viewX + 1) * this.canvas.width / 2;
      const sy = (1 - viewY / aspect) * this.canvas.height / 2;

      return { x: sx, y: sy };
    } else {
      // TODO: Full 3D perspective projection
      // For now, use simple orthographic
      const sx = (nx + 1) * this.canvas.width / 2;
      const sy = (1 - ny) * this.canvas.height / 2;
      return { x: sx, y: sy };
    }
  }

  /**
   * Transform screen pixels to normalized coordinates
   */
  screenToNormalized(sx, sy) {
    if (this.mode === '2d') {
      const aspect = this.canvas.width / this.canvas.height;
      const scale = this.zoom;

      // Screen to view space
      const viewX = (sx / this.canvas.width) * 2 - 1;
      const viewY = (1 - (sy / this.canvas.height) * 2) * aspect;

      // Apply camera offset
      const nx = viewX / scale + this.target.x;
      const ny = viewY / scale + this.target.y;

      return { x: nx, y: ny };
    } else {
      // Simple mapping for now
      const nx = (sx / this.canvas.width) * 2 - 1;
      const ny = 1 - (sy / this.canvas.height) * 2;
      return { x: nx, y: ny };
    }
  }

  /**
   * Apply camera transform to 2D canvas context
   * Converts from normalized coordinates (-1 to 1) to screen pixels
   */
  applyTransform(ctx) {
    ctx.save();

    if (this.mode === '2d') {
      // Translate to center of screen
      ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

      // Scale from normalized coordinates (-1 to 1) to pixels
      // This makes 1 unit = half the canvas width
      ctx.scale(this.canvas.width / 2, this.canvas.height / 2);

      // Apply zoom
      ctx.scale(this.zoom, this.zoom);

      // Center on target (in normalized space)
      ctx.translate(-this.target.x, -this.target.y);

      // Flip Y axis (canvas Y is down, normalized Y is up)
      ctx.scale(1, -1);
    }
    // For 3D/pixelvector, transform is handled per-entity
  }

  /**
   * Restore canvas context
   */
  restoreTransform(ctx) {
    ctx.restore();
  }

  /**
   * Calculate Z-depth opacity (poetic fade)
   * z ∈ [-1, 1]: -1 = far (fades out), 0 = center (visible), 1 = near (fades out)
   */
  getZOpacity(z) {
    const normalizedZ = Math.max(-1, Math.min(1, z));
    const distance = Math.abs(normalizedZ);

    // Quadratic falloff for "poetically artistic" quick vanishing
    return Math.pow(1 - distance, 2);
  }

  /**
   * Calculate Z-depth scale (perspective)
   */
  getZScale(z) {
    const normalizedZ = Math.max(-1, Math.min(1, z));

    // Perspective: nearer objects larger, farther objects smaller
    return 1 + normalizedZ * 0.75;
  }

  /**
   * Get camera status
   */
  getStatus() {
    return {
      position: { ...this.position },
      target: { ...this.target },
      zoom: this.zoom,
      mode: this.mode,
      isDragging: this.isDragging,
      isPanning: this.isPanning
    };
  }

  /**
   * Set camera mode
   */
  setMode(mode) {
    this.mode = mode;

    // Reset to appropriate defaults for each mode
    if (mode === '2d') {
      this.position = { x: 0, y: 0, z: 2 };
      this.target = { x: 0, y: 0, z: 0 };
    } else if (mode === '3d') {
      this.position = { x: 1, y: 1, z: 1.5 };
      this.target = { x: 0, y: 0, z: 0 };
    } else if (mode === 'pixelvector') {
      this.position = { x: 0, y: 0, z: 1.5 };
      this.target = { x: 0, y: 0, z: 0 };
    }

    this.setHome(this.position, this.target, this.zoom);
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NormalizedCamera;
} else {
  window.NormalizedCamera = NormalizedCamera;
  // Also set window.Camera for backward compatibility
  window.Camera = NormalizedCamera;
  console.log('[CAMERA] NormalizedCamera class loaded and exported to window.Camera');
}
