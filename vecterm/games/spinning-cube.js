/**
 * Spinning Cube Demo - VScope Integration
 *
 * A simple 3D spinning cube that can be rendered to the terminal via VScope
 */

export class SpinningCube {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.running = false;
    this.animationId = null;

    // Cube vertices (8 corners)
    this.vertices = [
      [-100, -100, -100], [100, -100, -100], [100, 100, -100], [-100, 100, -100],
      [-100, -100,  100], [100, -100,  100], [100, 100,  100], [-100, 100,  100]
    ];

    // Cube edges
    this.edges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // Back face
      [4, 5], [5, 6], [6, 7], [7, 4], // Front face
      [0, 4], [1, 5], [2, 6], [3, 7]  // Connections
    ];

    // Rotation angles
    this.angleX = 0;
    this.angleY = 0;
    this.angleZ = 0;

    // Center position on canvas
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;

    // Bind methods
    this.update = this.update.bind(this);
  }

  // 3D rotation helpers
  rotateX(point, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const [x, y, z] = point;
    return [x, y * cos - z * sin, y * sin + z * cos];
  }

  rotateY(point, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const [x, y, z] = point;
    return [x * cos + z * sin, y, -x * sin + z * cos];
  }

  rotateZ(point, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const [x, y, z] = point;
    return [x * cos - y * sin, x * sin + y * cos, z];
  }

  // Project 3D to 2D
  project(point) {
    const distance = 400;
    const [x, y, z] = point;
    const scale = distance / (distance + z);
    return [
      this.centerX + x * scale,
      this.centerY - y * scale
    ];
  }

  // Get line segments for VScope rendering
  getLineSegments() {
    const lines = [];

    // Transform vertices
    const transformed = this.vertices.map(vertex => {
      let point = vertex.slice();
      point = this.rotateX(point, this.angleX);
      point = this.rotateY(point, this.angleY);
      point = this.rotateZ(point, this.angleZ);
      return point;
    });

    // Project to 2D
    const projected = transformed.map(p => this.project(p));

    // Create line segments
    this.edges.forEach(([start, end]) => {
      const [x1, y1] = projected[start];
      const [x2, y2] = projected[end];

      lines.push({
        p1: { x: x1, y: y1 },
        p2: { x: x2, y: y2 },
        color: '#00ff00'
      });
    });

    return lines;
  }

  // Render to main canvas
  render() {
    // Clear canvas
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw cube
    const lines = this.getLineSegments();

    this.ctx.strokeStyle = '#00ff00';
    this.ctx.lineWidth = 2;

    lines.forEach(line => {
      this.ctx.beginPath();
      this.ctx.moveTo(line.p1.x, line.p1.y);
      this.ctx.lineTo(line.p2.x, line.p2.y);
      this.ctx.stroke();
    });
  }

  // Update animation
  update() {
    if (!this.running) return;

    // Rotate
    this.angleX += 0.01;
    this.angleY += 0.015;
    this.angleZ += 0.005;

    // Render
    this.render();

    // Continue animation
    this.animationId = requestAnimationFrame(this.update);
  }

  // Start the cube
  start() {
    this.running = true;
    this.update();
  }

  // Stop the cube
  stop() {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // Cleanup
  cleanup() {
    this.stop();
  }
}

// Game manifest for game-manager integration
export default {
  id: 'spinning-cube',
  name: 'Spinning Cube',
  description: '3D spinning cube demo for VScope',
  class: SpinningCube,

  // Game metadata
  metadata: {
    author: 'Vecterm',
    version: '1.0.0',
    category: 'demo'
  }
};
