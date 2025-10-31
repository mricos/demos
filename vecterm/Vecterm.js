/**
 * VECTERM - Vector Terminal 3D Graphics Engine
 * Hidden line removal wireframe renderer with VT100 phosphor effects
 *
 * Depends on: VectermMath.js (must be loaded first)
 */

// Import grid utilities (if using modules)
let GridUtils = null;
if (typeof window !== 'undefined' && window.VectermGridUtils) {
  GridUtils = window.VectermGridUtils;
}

// ==========================================
// MESH - 3D Wireframe Mesh
// ==========================================

class Mesh {
  constructor(vertices = [], edges = [], faces = []) {
    this.vertices = vertices;  // Array of VectermMath.Vector3
    this.edges = edges;        // Array of [vertexIndex1, vertexIndex2]
    this.faces = faces;        // Array of [v1, v2, v3, ...] vertex indices (for hidden face removal)
  }

  // Factory: Create a cube mesh
  static cube(size = 1) {
    const s = size / 2;
    const vertices = [
      new VectermMath.Vector3(-s, -s, -s), // 0
      new VectermMath.Vector3( s, -s, -s), // 1
      new VectermMath.Vector3( s,  s, -s), // 2
      new VectermMath.Vector3(-s,  s, -s), // 3
      new VectermMath.Vector3(-s, -s,  s), // 4
      new VectermMath.Vector3( s, -s,  s), // 5
      new VectermMath.Vector3( s,  s,  s), // 6
      new VectermMath.Vector3(-s,  s,  s)  // 7
    ];

    const edges = [
      [0,1], [1,2], [2,3], [3,0], // Front face
      [4,5], [5,6], [6,7], [7,4], // Back face
      [0,4], [1,5], [2,6], [3,7]  // Connecting edges
    ];

    const faces = [
      [0,1,2,3], // Front
      [5,4,7,6], // Back
      [4,5,1,0], // Bottom
      [3,2,6,7], // Top
      [4,0,3,7], // Left
      [1,5,6,2]  // Right
    ];

    return new Mesh(vertices, edges, faces);
  }

  // Factory: Create a rectangular box
  static box(width, height, depth) {
    const w = width / 2;
    const h = height / 2;
    const d = depth / 2;

    const vertices = [
      new VectermMath.Vector3(-w, -h, -d), new VectermMath.Vector3( w, -h, -d),
      new VectermMath.Vector3( w,  h, -d), new VectermMath.Vector3(-w,  h, -d),
      new VectermMath.Vector3(-w, -h,  d), new VectermMath.Vector3( w, -h,  d),
      new VectermMath.Vector3( w,  h,  d), new VectermMath.Vector3(-w,  h,  d)
    ];

    const edges = [
      [0,1], [1,2], [2,3], [3,0],
      [4,5], [5,6], [6,7], [7,4],
      [0,4], [1,5], [2,6], [3,7]
    ];

    const faces = [
      [0,1,2,3], [5,4,7,6], [4,5,1,0],
      [3,2,6,7], [4,0,3,7], [1,5,6,2]
    ];

    return new Mesh(vertices, edges, faces);
  }

  // Factory: Create an icosphere (approximates sphere with wireframe)
  static sphere(radius = 1, subdivisions = 1) {
    // Start with icosahedron
    const t = (1 + Math.sqrt(5)) / 2;
    const vertices = [
      new VectermMath.Vector3(-1,  t,  0), new VectermMath.Vector3( 1,  t,  0),
      new VectermMath.Vector3(-1, -t,  0), new VectermMath.Vector3( 1, -t,  0),
      new VectermMath.Vector3( 0, -1,  t), new VectermMath.Vector3( 0,  1,  t),
      new VectermMath.Vector3( 0, -1, -t), new VectermMath.Vector3( 0,  1, -t),
      new VectermMath.Vector3( t,  0, -1), new VectermMath.Vector3( t,  0,  1),
      new VectermMath.Vector3(-t,  0, -1), new VectermMath.Vector3(-t,  0,  1)
    ].map(v => v.normalize().scale(radius));

    const faces = [
      [0,11,5], [0,5,1], [0,1,7], [0,7,10], [0,10,11],
      [1,5,9], [5,11,4], [11,10,2], [10,7,6], [7,1,8],
      [3,9,4], [3,4,2], [3,2,6], [3,6,8], [3,8,9],
      [4,9,5], [2,4,11], [6,2,10], [8,6,7], [9,8,1]
    ];

    // Generate edges from faces
    const edgeSet = new Set();
    faces.forEach(face => {
      for (let i = 0; i < face.length; i++) {
        const a = face[i];
        const b = face[(i + 1) % face.length];
        const edge = a < b ? `${a},${b}` : `${b},${a}`;
        edgeSet.add(edge);
      }
    });

    const edges = Array.from(edgeSet).map(e => e.split(',').map(Number));

    return new Mesh(vertices, edges, faces);
  }

  // Clone and transform mesh
  clone() {
    return new Mesh(
      this.vertices.map(v => v.clone()),
      this.edges.map(e => [...e]),
      this.faces.map(f => [...f])
    );
  }
}

// ==========================================
// VECTERM - 3D Vector Terminal Renderer
// ==========================================

class Vecterm {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    // VT100-style configuration
    this.config = {
      phosphorColor: '#00ff00',
      backgroundColor: '#000000',
      lineWidth: 1,
      glowIntensity: 0.3,
      scanlineIntensity: 0.15,
      scanlineSpeed: 8,
      rasterWave: {
        enabled: false,
        amplitude: 2,
        frequency: 0.5
      },
      hiddenLineRemoval: true,
      backfaceCulling: true,
      // Grid configuration
      grid: {
        character: {
          enabled: false,
          cols: 80,
          rows: 24,
          charWidth: 10,
          charHeight: 20,
          visible: false,
          color: '#003300',
          snapToGrid: false
        },
        square: {
          enabled: false,
          size: 32,
          visible: false,
          color: '#1a1a1a',
          snapToGrid: false,
          subdivisions: 1
        },
        activeType: 'none'
      }
    };

    this.time = 0;
    this.lineSegments = []; // Grid-aware line segments
  }

  // Update configuration
  setConfig(path, value) {
    const keys = path.split('.');
    let obj = this.config;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
  }

  getConfig(path) {
    if (!path) return this.config;
    const keys = path.split('.');
    let obj = this.config;
    for (let key of keys) {
      obj = obj[key];
    }
    return obj;
  }

  // Main render function
  render(meshes, camera, deltaTime = 0) {
    this.time += deltaTime;

    // Update aspect ratio
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    camera.aspect = this.width / this.height;

    // Clear canvas
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Get camera matrices
    const viewMatrix = camera.getViewMatrix();
    const projMatrix = camera.getProjectionMatrix();
    const viewProjMatrix = projMatrix.multiply(viewMatrix);

    // Process each mesh
    const allLines = [];

    meshes.forEach(meshData => {
      const { mesh, transform, color } = meshData;

      // Build model matrix from transform
      const modelMatrix = this._buildModelMatrix(transform);

      // Combined transformation matrix
      const mvpMatrix = viewProjMatrix.multiply(modelMatrix);

      // Transform vertices
      const transformedVertices = mesh.vertices.map(v => {
        const transformed = mvpMatrix.transformPoint(v);
        // Convert to screen space
        return this._toScreenSpace(transformed);
      });

      // Back-face culling (if enabled)
      let visibleFaces = null;
      if (this.config.backfaceCulling && mesh.faces.length > 0) {
        visibleFaces = new Set();
        mesh.faces.forEach((face, faceIdx) => {
          if (this._isFacingCamera(face, transformedVertices)) {
            visibleFaces.add(faceIdx);
            // Mark edges of visible faces
            face.forEach((vIdx, i) => {
              const nextIdx = face[(i + 1) % face.length];
              mesh.edges.forEach((edge, edgeIdx) => {
                if ((edge[0] === vIdx && edge[1] === nextIdx) ||
                    (edge[1] === vIdx && edge[0] === nextIdx)) {
                  allLines.push({
                    p1: transformedVertices[edge[0]],
                    p2: transformedVertices[edge[1]],
                    depth: this._getEdgeDepth(transformedVertices[edge[0]], transformedVertices[edge[1]]),
                    color: color || this.config.phosphorColor
                  });
                }
              });
            });
          }
        });
      } else {
        // No face culling - draw all edges
        mesh.edges.forEach(edge => {
          const p1 = transformedVertices[edge[0]];
          const p2 = transformedVertices[edge[1]];

          // Clip to viewport
          if (this._isInViewport(p1) || this._isInViewport(p2)) {
            allLines.push({
              p1, p2,
              depth: this._getEdgeDepth(p1, p2),
              color: color || this.config.phosphorColor
            });
          }
        });
      }
    });

    // Sort lines by depth (painter's algorithm for hidden line removal)
    if (this.config.hiddenLineRemoval) {
      allLines.sort((a, b) => b.depth - a.depth);
    }

    // Calculate grid intersections if grid is enabled
    if (GridUtils && this.config.grid.activeType !== 'none') {
      this._calculateGridIntersections(allLines);
    }

    // Draw grid overlay (before lines for underlay, or after for overlay)
    this._drawGrid();

    // Draw lines
    this._drawLines(allLines);

    // Apply VT100 effects
    this._applyEffects();

    // Return grid-aware segments for external use (e.g., ASCII conversion)
    return this.lineSegments;
  }

  // Build model transformation matrix
  _buildModelMatrix(transform) {
    if (!transform) return VectermMath.Matrix4.identity();

    const { position, rotation, scale } = transform;
    const pos = position || new VectermMath.Vector3();
    const rot = rotation || new VectermMath.Vector3();
    const scl = scale || new VectermMath.Vector3(1, 1, 1);

    const T = VectermMath.Matrix4.translation(pos.x, pos.y, pos.z);
    const Rx = VectermMath.Matrix4.rotationX(rot.x);
    const Ry = VectermMath.Matrix4.rotationY(rot.y);
    const Rz = VectermMath.Matrix4.rotationZ(rot.z);
    const S = VectermMath.Matrix4.scale(scl.x, scl.y, scl.z);

    // TRS order: Scale, then Rotate, then Translate
    return T.multiply(Rz.multiply(Ry.multiply(Rx.multiply(S))));
  }

  // Convert normalized device coordinates to screen space
  _toScreenSpace(v) {
    return {
      x: (v.x + 1) * 0.5 * this.width,
      y: (1 - v.y) * 0.5 * this.height,
      z: v.z  // Keep depth for sorting
    };
  }

  // Check if point is in viewport
  _isInViewport(p) {
    return p.x >= 0 && p.x <= this.width && p.y >= 0 && p.y <= this.height;
  }

  // Check if face is facing camera (for back-face culling)
  _isFacingCamera(face, vertices) {
    if (face.length < 3) return true;

    const v0 = vertices[face[0]];
    const v1 = vertices[face[1]];
    const v2 = vertices[face[2]];

    // Compute cross product of two edges
    const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y };
    const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y };
    const cross = edge1.x * edge2.y - edge1.y * edge2.x;

    // If cross product is negative, face is front-facing (in screen space)
    return cross < 0;
  }

  // Get average depth of edge
  _getEdgeDepth(p1, p2) {
    return (p1.z + p2.z) / 2;
  }

  // Draw all lines
  _drawLines(lines) {
    const ctx = this.ctx;

    lines.forEach(line => {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = this.config.lineWidth;

      // Draw with glow effect
      if (this.config.glowIntensity > 0) {
        ctx.shadowBlur = 10 * this.config.glowIntensity;
        ctx.shadowColor = line.color;
      }

      ctx.beginPath();
      ctx.moveTo(line.p1.x, line.p1.y);
      ctx.lineTo(line.p2.x, line.p2.y);
      ctx.stroke();
    });

    // Reset shadow
    ctx.shadowBlur = 0;
  }

  // Calculate grid intersections for all line segments
  _calculateGridIntersections(allLines) {
    if (!GridUtils) {
      this.lineSegments = allLines.map(line => ({ ...line, gridCells: [] }));
      return;
    }

    const gridType = this.config.grid.activeType;
    const gridConfig = gridType === 'character'
      ? this.config.grid.character
      : this.config.grid.square;

    this.lineSegments = allLines.map(line => {
      let gridCells = [];

      if (gridConfig.enabled) {
        try {
          gridCells = GridUtils.getLineGridIntersections(
            line.p1,
            line.p2,
            gridConfig,
            gridType
          );
        } catch (e) {
          console.warn('Grid intersection calculation failed:', e);
          gridCells = [];
        }
      }

      return {
        ...line,
        gridCells
      };
    });
  }

  // Draw grid overlay
  _drawGrid() {
    if (!GridUtils) return;

    const gridType = this.config.grid.activeType;

    if (gridType === 'character' && this.config.grid.character.visible) {
      GridUtils.renderCharacterGrid(
        this.ctx,
        this.width,
        this.height,
        this.config.grid.character
      );
    } else if (gridType === 'square' && this.config.grid.square.visible) {
      GridUtils.renderSquareGrid(
        this.ctx,
        this.width,
        this.height,
        this.config.grid.square
      );
    }
  }

  // Apply VT100 phosphor effects
  _applyEffects() {
    const ctx = this.ctx;

    // Scanlines
    if (this.config.scanlineIntensity > 0) {
      ctx.globalAlpha = this.config.scanlineIntensity;
      ctx.fillStyle = '#000000';

      const offset = (this.time * 100 / this.config.scanlineSpeed) % 2;
      for (let y = offset; y < this.height; y += 2) {
        ctx.fillRect(0, y, this.width, 1);
      }

      ctx.globalAlpha = 1.0;
    }
  }

  // Clear canvas
  clear() {
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  // Get current grid-aware line segments
  getLineSegments() {
    return this.lineSegments;
  }

  // Convert current rendering to ASCII art
  toASCII() {
    if (!GridUtils || this.config.grid.activeType !== 'character') {
      console.warn('ASCII conversion requires character grid to be active');
      return '';
    }

    return GridUtils.linesToASCII(this.lineSegments, this.config.grid.character);
  }

  // Get grid statistics
  getGridStats() {
    if (!GridUtils) return null;
    return GridUtils.getGridStats(this.lineSegments);
  }
}

// ==========================================
// EXPORTS
// ==========================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Vecterm, Mesh };
} else {
  // Export directly to window for browser usage
  window.Vecterm = Vecterm;
  window.VectermMesh = Mesh;
}
