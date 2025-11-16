/**
 * PixelVector Renderer
 *
 * Renders vector entities as laser beams casting glows onto a dynamic pixel grid.
 * Physical Model:
 * - The grid is a 2D slice (z=0) through a 3D space of "global fibers"
 * - Vector entities are laser jets (cylindrical beams) passing through this space
 * - When a jet's cylinder shell is tangent to a grid cell, that cell is "kissed" and activates
 * - The gauge parameter controls how local disturbances spread to neighbors
 */

const PixelVectorRenderer = (() => {

/**
 * PixelVector Renderer Class
 */
class PixelVectorRendererClass {
  constructor(config = {}) {
    // Grid configuration
    this.gridSize = config.gridSize || 16; // pixels per cell
    this.gauge = config.gauge || 1.0; // laser beam size multiplier (controls spread)

    // Cached grid dimensions
    this.gridCols = 0;
    this.gridRows = 0;

    // Grid cell buffer (for caching activations)
    this.cellBuffer = null;
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    if (config.gridSize !== undefined) this.gridSize = config.gridSize;
    if (config.gauge !== undefined) this.gauge = config.gauge;

    // Invalidate buffer when grid size changes
    if (config.gridSize !== undefined) {
      this.cellBuffer = null;
    }
  }

  /**
   * Initialize grid buffer for canvas dimensions
   */
  initializeGrid(canvas) {
    this.gridCols = Math.ceil(canvas.width / this.gridSize);
    this.gridRows = Math.ceil(canvas.height / this.gridSize);
    this.cellBuffer = new Float32Array(this.gridCols * this.gridRows * 3); // RGB channels
  }

  /**
   * Extract vector primitives from ECS entities
   * Converts circles to line segments, rects to outlines
   */
  extractVectorPrimitives(entities) {
    const primitives = [];

    entities.forEach(entity => {
      if (!entity.renderable || !entity.renderable.visible) return;
      if (!entity.position) return;

      const { x, y } = entity.position;
      const color = this.parseColor(entity.renderable.color);

      if (entity.renderable.type === 'rect' && entity.aabb) {
        // Rectangle → 4 line segments (outline)
        const w = entity.aabb.width;
        const h = entity.aabb.height;

        primitives.push(
          { type: 'line', x1: x, y1: y, x2: x + w, y2: y, color }, // top
          { type: 'line', x1: x + w, y1: y, x2: x + w, y2: y + h, color }, // right
          { type: 'line', x1: x + w, y1: y + h, x2: x, y2: y + h, color }, // bottom
          { type: 'line', x1: x, y1: y + h, x2: x, y2: y, color } // left
        );
      } else if (entity.renderable.type === 'circle' && entity.ball) {
        // Circle → approximated as line segments around perimeter
        const radius = entity.ball.size / 2;
        const cx = x + radius;
        const cy = y + radius;
        const segments = 16; // number of line segments for circle approximation

        for (let i = 0; i < segments; i++) {
          const angle1 = (i / segments) * Math.PI * 2;
          const angle2 = ((i + 1) / segments) * Math.PI * 2;
          const x1 = cx + Math.cos(angle1) * radius;
          const y1 = cy + Math.sin(angle1) * radius;
          const x2 = cx + Math.cos(angle2) * radius;
          const y2 = cy + Math.sin(angle2) * radius;

          primitives.push({ type: 'line', x1, y1, x2, y2, color });
        }
      }
    });

    return primitives;
  }

  /**
   * Calculate shortest distance from a point to a line segment
   * This is the "normal distance" from the jet cylinder shell to the grid cell center
   */
  pointToLineDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      // Line segment is actually a point
      return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    }

    // Parameter t represents position along line segment (0 to 1)
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t)); // Clamp to segment

    // Closest point on segment
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    // Distance from point to closest point
    return Math.sqrt((px - closestX) * (px - closestX) + (py - closestY) * (py - closestY));
  }

  /**
   * Calculate cell activation based on jet-field interaction model
   *
   * Physical model:
   * - laserRadius = gauge × gridCellSize (cylinder radius)
   * - When distance < laserRadius, cell is "kissed" by cylinder shell
   * - Activation intensity uses exponential falloff
   * - Low gauge: sharp line (only tangent cells activate)
   * - High gauge: broad glow (neighbors get influenced)
   */
  calculateCellActivation(cellCenterX, cellCenterY, primitives) {
    let r = 0, g = 0, b = 0;
    const laserRadius = this.gauge * this.gridSize;

    primitives.forEach(primitive => {
      if (primitive.type === 'line') {
        const distance = this.pointToLineDistance(
          cellCenterX, cellCenterY,
          primitive.x1, primitive.y1,
          primitive.x2, primitive.y2
        );

        if (distance < laserRadius) {
          // Cell is within the jet's influence
          // Exponential falloff: intensity peaks at tangent (distance ≈ 0)
          const normalizedDistance = distance / laserRadius;
          const intensity = Math.exp(-normalizedDistance * 3); // Steeper falloff for sharper look

          r += primitive.color.r * intensity;
          g += primitive.color.g * intensity;
          b += primitive.color.b * intensity;
        }
      }
    });

    // Clamp to valid color range
    return {
      r: Math.min(255, r),
      g: Math.min(255, g),
      b: Math.min(255, b)
    };
  }

  /**
   * Render the pixel grid with vector glow
   */
  render(ctx, canvas, entities) {
    // Initialize grid buffer if needed
    if (!this.cellBuffer || this.gridCols !== Math.ceil(canvas.width / this.gridSize)) {
      this.initializeGrid(canvas);
    }

    // Clear buffer
    this.cellBuffer.fill(0);

    // Extract vector primitives from entities
    const primitives = this.extractVectorPrimitives(entities);

    // Calculate activation for each grid cell
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const cellX = col * this.gridSize;
        const cellY = row * this.gridSize;
        const cellCenterX = cellX + this.gridSize / 2;
        const cellCenterY = cellY + this.gridSize / 2;

        const activation = this.calculateCellActivation(cellCenterX, cellCenterY, primitives);

        // Only render cells with non-zero activation
        if (activation.r > 0 || activation.g > 0 || activation.b > 0) {
          ctx.fillStyle = `rgb(${Math.floor(activation.r)}, ${Math.floor(activation.g)}, ${Math.floor(activation.b)})`;
          ctx.fillRect(cellX, cellY, this.gridSize, this.gridSize);
        }
      }
    }
  }

  /**
   * Render background grid (optional - for debugging/visualization)
   */
  renderBackgroundGrid(ctx, canvas) {
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.05)';
    ctx.lineWidth = 1;

    for (let x = 0; x < canvas.width; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y < canvas.height; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  /**
   * Parse CSS color string to RGB object
   */
  parseColor(colorStr) {
    // Handle hex colors
    if (colorStr.startsWith('#')) {
      const hex = colorStr.slice(1);
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }

    // Handle rgb/rgba colors
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }

    // Default to cyan
    return { r: 79, g: 195, b: 247 };
  }
}

// Return the class
return PixelVectorRendererClass;

})();

// Make available globally
if (typeof window !== 'undefined') {
  window.PixelVectorRenderer = PixelVectorRenderer;
}
