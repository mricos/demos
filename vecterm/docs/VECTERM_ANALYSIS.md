# Vecterm: 3D Vector Terminal Engine - Comprehensive Analysis

## Executive Summary

Vecterm is a sophisticated 3D graphics rendering engine designed to work both as a **hidden-line removal wireframe renderer** with **VT100 phosphor effects** and as a powerful visualization tool within a **hybrid REPL/game engine platform**. It combines mathematical 3D transformations with terminal/canvas rendering to create interactive 3D visualization experiences.

---

## Part 1: The Rotating Cube

### What Is the Rotating Cube?

The rotating cube is a **demonstration of Vecterm's core capabilities**. It is:

1. **A 3D wireframe cube** defined as a mesh with:
   - 8 vertices (corners)
   - 12 edges (connecting lines)
   - 6 faces (for hidden face removal)

2. **Continuously rotated** along multiple axes using matrices:
   ```javascript
   rotation: new VectermMath.Vector3(demoRotation, demoRotation * 0.7, 0)
   ```

3. **Rendered with hidden-line removal**, where the renderer:
   - Determines which cube faces are visible to the camera
   - Only draws edges of visible faces (painter's algorithm)
   - Sorts edges by depth for proper occlusion

### Where It's Implemented

#### Primary Locations:

**1. `/Users/mricos/src/mricos/demos/redux/vecterm/vecterm-demo.js` (107 lines)**
   - **Purpose**: CLI demo manager for the spinning cube
   - **Key Functions**:
     - `initVectermPreview()`: Creates Vecterm instance with camera
     - `startVectermDemo()`: Animates spinning cube
     - `stopVectermDemo()`: Stops animation
     - `getVectermCamera()`: Returns camera for CLI commands
     - `setupVectermInitialization()`: Lazy-initializes when CLI opens

**2. `/Users/mricos/src/mricos/demos/redux/Vecterm.js` (381 lines)**
   - **Purpose**: Core 3D renderer and mesh system
   - **Key Classes**:
     - `Mesh`: 3D wireframe mesh with factory methods
     - `Vecterm`: Main renderer class

**3. `/Users/mricos/src/mricos/demos/redux/VectermMath.js` (331 lines)**
   - **Purpose**: 3D mathematics library
   - **Key Classes**:
     - `Vector3`: 3D vector operations
     - `Matrix4`: 4x4 transformation matrices
     - `Camera`: 3D camera with orbital controls

### Cube Mesh Definition

The cube is created using the factory method:

```javascript
// In vecterm-demo.js, line 42
const cubeMesh = VectermMesh.cube(2);  // 2 units in size
```

This creates a cube with:

```javascript
// In Vecterm.js, lines 20-49
static cube(size = 1) {
  const s = size / 2;
  const vertices = [
    new VectermMath.Vector3(-s, -s, -s), // 0: back-bottom-left
    new VectermMath.Vector3( s, -s, -s), // 1: back-bottom-right
    new VectermMath.Vector3( s,  s, -s), // 2: back-top-right
    new VectermMath.Vector3(-s,  s, -s), // 3: back-top-left
    new VectermMath.Vector3(-s, -s,  s), // 4: front-bottom-left
    new VectermMath.Vector3( s, -s,  s), // 5: front-bottom-right
    new VectermMath.Vector3( s,  s,  s), // 6: front-top-right
    new VectermMath.Vector3(-s,  s,  s)  // 7: front-top-left
  ];
  
  const edges = [
    // Front face: [0,1], [1,2], [2,3], [3,0]
    // Back face: [4,5], [5,6], [6,7], [7,4]
    // Connecting: [0,4], [1,5], [2,6], [3,7]
  ];
  
  const faces = [
    [0,1,2,3], // Front
    [5,4,7,6], // Back
    [4,5,1,0], // Bottom
    [3,2,6,7], // Top
    [4,0,3,7], // Left
    [1,5,6,2]  // Right
  ];
}
```

### Animation Loop

The cube rotates via `requestAnimationFrame`:

```javascript
// In vecterm-demo.js, lines 44-59
function animate() {
  demoRotation += 0.01;  // Increment rotation each frame

  const meshes = [{
    mesh: cubeMesh,
    transform: {
      position: new VectermMath.Vector3(0, 0, 0),
      rotation: new VectermMath.Vector3(
        demoRotation,          // X-axis rotation
        demoRotation * 0.7,    // Y-axis at 70% speed
        0                      // No Z-axis rotation
      ),
      scale: new VectermMath.Vector3(1, 1, 1)
    },
    color: '#00ff88'  // Green phosphor color
  }];

  vectermPreview.render(meshes, vectermCamera, 0.016);
  vectermAnimationId = requestAnimationFrame(animate);
}
```

---

## Part 2: Vecterm Architecture

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│               Vecterm Rendering Pipeline                │
└─────────────────────────────────────────────────────────┘

Input Layer:
  ├─ 3D Mesh Data (vertices, edges, faces)
  ├─ Transform Data (position, rotation, scale)
  └─ Camera Data (position, target, FOV)
            ↓
  ┌─────────────────────────────────────────────┐
  │ Vecterm.render(meshes, camera, deltaTime)   │
  └─────────────────────────────────────────────┘
            ↓
  ┌─────────────────────────────────────────────┐
  │ 1. Build Model Matrix (TRS composition)     │
  │    - Translation × Rotation × Scale         │
  └─────────────────────────────────────────────┘
            ↓
  ┌─────────────────────────────────────────────┐
  │ 2. Transform Vertices (MVP transformation)  │
  │    - Model Matrix × View Matrix × Proj      │
  │    - Screen Space Projection                │
  └─────────────────────────────────────────────┘
            ↓
  ┌─────────────────────────────────────────────┐
  │ 3. Back-Face Culling (if enabled)           │
  │    - Compute face normal via cross product  │
  │    - Cull faces facing away from camera     │
  └─────────────────────────────────────────────┘
            ↓
  ┌─────────────────────────────────────────────┐
  │ 4. Build Edge List                          │
  │    - Only edges of visible faces            │
  │    - Store depth for sorting                │
  └─────────────────────────────────────────────┘
            ↓
  ┌─────────────────────────────────────────────┐
  │ 5. Painter's Algorithm Sorting              │
  │    - Sort edges by average Z-depth          │
  │    - Draw far edges first                   │
  └─────────────────────────────────────────────┘
            ↓
  ┌─────────────────────────────────────────────┐
  │ 6. Rasterization & VT100 Effects            │
  │    - Draw lines with color                  │
  │    - Apply glow effect                      │
  │    - Apply scanlines                        │
  └─────────────────────────────────────────────┘
            ↓
Output: Rendered canvas with 3D visualization
```

### Core Classes

#### 1. VectermMath.Vector3 (Lines 10-93)

**Semantic**: Represents a point or direction in 3D space

**Key Methods**:
```javascript
add(v)                      // Vector addition
sub(v)                      // Vector subtraction
scale(s)                    // Scalar multiplication
dot(v)                      // Dot product (for angle calculations)
cross(v)                    // Cross product (for normal vectors)
length()                    // Magnitude
normalize()                 // Unit vector
distanceTo(v)               // Euclidean distance
clone()                     // Copy vector
toArray()                   // Export as [x, y, z]
```

**Static Constructors**:
```javascript
Vector3.zero()      // (0, 0, 0)
Vector3.one()       // (1, 1, 1)
Vector3.up()        // (0, 1, 0)  - Y axis
Vector3.right()     // (1, 0, 0)  - X axis
Vector3.forward()   // (0, 0, 1)  - Z axis
```

#### 2. VectermMath.Matrix4 (Lines 99-259)

**Semantic**: 4x4 transformation matrix for 3D graphics (column-major order like OpenGL)

**Key Methods**:
```javascript
get(i, j)                   // Get element at row i, col j
set(i, j, value)            // Set element
multiply(other)             // Matrix multiplication
transformPoint(v)           // Transform point (with perspective divide)
transformDirection(v)       // Transform direction (no translation)
clone()                     // Copy matrix

// Static factory methods:
Matrix4.identity()          // Identity matrix
Matrix4.translation(x, y, z)
Matrix4.scale(sx, sy, sz)
Matrix4.rotationX(angle)
Matrix4.rotationY(angle)
Matrix4.rotationZ(angle)
Matrix4.lookAt(eye, target, up)        // Camera matrix
Matrix4.perspective(fov, aspect, near, far)
Matrix4.orthographic(left, right, bottom, top, near, far)
```

**Composition Example** (from Vecterm.js, line 282):
```javascript
// TRS order: Scale → Rotate → Translate
return T.multiply(Rz.multiply(Ry.multiply(Rx.multiply(S))));
```

#### 3. VectermMath.Camera (Lines 265-320)

**Semantic**: 3D camera with orbital controls and projection matrices

**Key Methods**:
```javascript
getViewMatrix()             // World → Camera space matrix
getProjectionMatrix(type)   // Camera → Clip space matrix (perspective or orthographic)
orbit(deltaAzimuth, deltaElevation)  // Orbit around target
zoom(delta)                 // Move closer/farther from target
```

**Orbital Camera Mathematics**:
```javascript
// Spherical to Cartesian conversion
position = target + offset
azimuth = atan2(offset.x, offset.z)
elevation = asin(offset.y / radius)

// After orbiting:
position.x = target.x + radius * sin(azimuth) * cos(elevation)
position.y = target.y + radius * sin(elevation)
position.z = target.z + radius * cos(azimuth) * cos(elevation)
```

#### 4. Vecterm.Mesh (Lines 12-122)

**Semantic**: 3D wireframe mesh with vertices, edges, and faces

**Factory Methods**:
```javascript
Mesh.cube(size)             // Creates cube mesh
Mesh.box(width, height, depth)  // Creates rectangular box
Mesh.sphere(radius, subdivisions)  // Creates icosphere wireframe
```

**Structure**:
```javascript
class Mesh {
  vertices[]    // Array of Vector3 - mesh vertex positions
  edges[]       // Array of [v1Idx, v2Idx] - vertex index pairs
  faces[]       // Array of [v1Idx, v2Idx, v3Idx, ...] - for culling
}
```

#### 5. Vecterm.Vecterm (Lines 128-381)

**Semantic**: Main 3D renderer that combines transformations, culling, depth sorting, and effects

**Configuration**:
```javascript
config = {
  phosphorColor: '#00ff00',          // Default line color
  backgroundColor: '#000000',        // Clear color
  lineWidth: 1,                      // Line thickness
  glowIntensity: 0.3,               // Shadow blur for glow
  scanlineIntensity: 0.15,          // VT100 scanline darkness
  scanlineSpeed: 8,                 // Scanline animation speed
  rasterWave: {
    enabled: false,
    amplitude: 2,
    frequency: 0.5
  },
  hiddenLineRemoval: true,          // Painter's algorithm
  backfaceCulling: true             // Cull back faces
}
```

**Main Rendering Method**:
```javascript
render(meshes, camera, deltaTime)
  // meshes: Array of { mesh, transform, color }
  // camera: VectermMath.Camera instance
  // deltaTime: Frame time for effects animation

// Process:
// 1. Clear canvas
// 2. Get camera matrices (view & projection)
// 3. For each mesh:
//    a. Build model matrix from transform
//    b. Transform vertices to screen space
//    c. If backfaceCulling: cull invisible faces
//    d. Collect visible edges with depths
// 4. Sort edges by depth (painter's algorithm)
// 5. Draw lines with effects
// 6. Apply VT100 scanlines
```

---

## Part 3: How Vecterm Works as Both REPL and Game Engine

### Architectural Context

Vecterm is integrated into a larger **Redux-based hybrid architecture** that serves dual purposes:

```
┌──────────────────────────────────────────────────────────┐
│         Redux Demo Application (app.js)                  │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────┐         ┌──────────────────────┐   │
│  │   CLI/REPL      │         │  Main Canvas/Games   │   │
│  │  (terminal.js)  │         │  (canvas-renderer.js)│   │
│  │                 │         │                      │   │
│  │ - Command Input │         │ - 2D Entity Rendering│   │
│  │ - History       │         │ - Layer System       │   │
│  │ - Tab Completion│         │ - Grid Display       │   │
│  │ - Vecterm Viewport         │ - Redux Visualization   │
│  │   (cli-vecterm canvas)     │                      │   │
│  └────────┬────────┘         └──────────┬───────────┘   │
│           │                             │                │
│           │  ┌────────────────────────────┐              │
│           └─→│  Redux Store (core/)        │←────────────┘
│              │  - Single Source of Truth   │
│              │  - State Management         │
│              │  - Middleware               │
│              └────────────────────────────┘
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### Part A: As a REPL (Terminal Visualization)

**Use Case**: Interactive command-line exploration of 3D graphics

**Components**:

1. **CLI Panel** (`index.html`, lines 140-300)
   - HTML element: `#cli-panel`
   - Contains: `#cli-input` (command input)
   - Contains: `#cli-output` (command history)
   - Contains: `#cli-vecterm` (canvas for 3D rendering)

2. **Vecterm Initialization** (`vecterm-demo.js`, lines 16-31)
   ```javascript
   function initVectermPreview() {
     const vectermCanvas = document.getElementById('cli-vecterm');
     vectermPreview = new Vecterm(vectermCanvas);
     vectermCamera = new VectermMath.Camera(
       new VectermMath.Vector3(5, 5, 10),   // Eye position
       new VectermMath.Vector3(0, 0, 0)    // Target (cube center)
     );
     startVectermDemo();  // Begin spinning cube
   }
   ```

3. **CLI Command Integration** (`command-processor.js`, lines 273-299)
   ```javascript
   // Vecterm commands available via CLI:
   
   vecterm.demo               // Start spinning cube
   vecterm.stop               // Stop animation
   vecterm.camera.orbit <az> <el>  // Orbit camera
   vecterm.camera.zoom <delta>     // Zoom in/out
   ```

4. **Data Flow**:
   ```
   User types command
       ↓
   command-processor.js processes it
       ↓
   getVectermCamera() called
       ↓
   Camera orbited or zoomed
       ↓
   Animation loop re-renders with new camera
   ```

### Part B: As a Game Engine (Canvas Rendering)

**Use Case**: Full-screen 3D game visualization with Redux state management

**Components**:

1. **Game Manager** (`games/game-manager.js`, 195 lines)
   ```javascript
   createGameManager(store)
     ├─ startGamePlay(gameId, mode)
     │  └─ Creates game instance with 'main-canvas'
     │     Can use '2d' or '3d' mode
     │
     ├─ startGamePreview(gameId)
     │  └─ Renders ASCII art to CLI
     │
     └─ stopGame(gameId)
        └─ Cleans up and stops animation
   ```

2. **3D Mode Semantics** (`command-processor.js`, line 253-254)
   ```javascript
   play3d <game>          // Play in 3D Vecterm mode
   play <game> 3d         // Alternative syntax
   ```

3. **Main Canvas** (`index.html`, line 22)
   ```html
   <canvas id="main-canvas" width="1920" height="1080"></canvas>
   ```

4. **Rendering Flow** (`ui/renderer.js`, `ui/canvas-renderer.js`)
   ```
   Store state changes
       ↓
   renderer.js notified via subscription
       ↓
   canvas-renderer.js.renderScene() called
       ↓
   Draws 2D entities, layers, grid, etc.
   ```

5. **Redux Integration**
   - **State**: `store.getState().games`
   - **Actions**: `Actions.setActiveGame()`, `Actions.updateGameInstance()`
   - **Middleware**: Logs game state changes to localStorage

---

## Part 4: Current Rendering Semantics

### Rendering Model

Vecterm uses a **hybrid rendering approach**:

```
┌─────────────────────────────────────────────────────────┐
│            Vecterm Rendering Semantics                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Type: Hidden-Line Removal Wireframe Renderer           │
│                                                           │
│  1. VERTEX PROCESSING                                   │
│     ├─ Transform vertices via MVP matrix                │
│     ├─ Perspective divide (if w ≠ 1)                   │
│     └─ Convert to screen space: x' = (x+1)*W/2, etc     │
│                                                           │
│  2. FACE CULLING (optional)                             │
│     ├─ Compute cross product of face edges              │
│     ├─ If cross product < 0: face is front-facing       │
│     └─ Only draw edges of front-facing faces            │
│                                                           │
│  3. EDGE COLLECTION                                     │
│     ├─ For each visible face, add its edges             │
│     ├─ Each edge stores: p1, p2, depth, color           │
│     └─ Depth = average Z of both endpoints              │
│                                                           │
│  4. DEPTH SORTING                                       │
│     ├─ Sort edges by depth (painter's algorithm)        │
│     ├─ Draw far edges first (smallest Z)                │
│     └─ Near edges drawn last (overwrites far)           │
│                                                           │
│  5. LINE RASTERIZATION                                  │
│     ├─ Glow effect: ctx.shadowBlur + shadowColor        │
│     ├─ Line width: configurable                         │
│     └─ Color: per-mesh or per-edge                      │
│                                                           │
│  6. EFFECTS (VT100 Phosphor)                            │
│     ├─ Scanlines: repeating horizontal bands            │
│     ├─ Animation: scanlines move down over time         │
│     └─ Intensity: configurable from 0-1                │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Rendering Method Signatures

```javascript
// Main render entry point
vecterm.render(meshes, camera, deltaTime)

// Where:
meshes = [
  {
    mesh: Mesh,           // The 3D geometry
    transform: {          // Transformation data
      position: Vector3,  // Translation
      rotation: Vector3,  // Euler angles (radians)
      scale: Vector3      // Scale factors
    },
    color: '#00ff88'      // Line color (hex string)
  },
  // ... more mesh objects
]

camera = VectermMath.Camera
  // Has: position, target, up, fov, near, far, aspect

deltaTime = number        // Seconds since last frame (0.016 ≈ 60fps)
```

### Configuration Semantics

```javascript
// Get configuration
vecterm.getConfig()               // Returns entire config object
vecterm.getConfig('phosphorColor')     // Returns '#00ff00'
vecterm.getConfig('scanlineIntensity') // Returns 0.15

// Set configuration
vecterm.setConfig('phosphorColor', '#ff00ff')
vecterm.setConfig('glowIntensity', 0.5)
vecterm.setConfig('backfaceCulling', false)
```

### Rendering States

The renderer tracks time for effects:

```javascript
this.time = 0;  // Accumulated time

// In render():
this.time += deltaTime;

// Used for scanline animation:
const offset = (this.time * 100 / this.config.scanlineSpeed) % 2;
for (let y = offset; y < this.height; y += 2) {
  // Draw scanline
}
```

---

## Part 5: Object/Entity Rendering Patterns

### Pattern A: Simple Wireframe Mesh

**Semantic**: Render a 3D mesh as interconnected lines

```javascript
// Create mesh
const cubeMesh = VectermMesh.cube(2);

// Define transformation
const transform = {
  position: new VectermMath.Vector3(0, 0, 0),
  rotation: new VectermMath.Vector3(0.5, 1.0, 0),
  scale: new VectermMath.Vector3(1, 1, 1)
};

// Render
vecterm.render([{
  mesh: cubeMesh,
  transform: transform,
  color: '#00ff88'
}], camera, deltaTime);
```

### Pattern B: Multiple Meshes with Depth Sorting

**Semantic**: Render multiple objects with automatic z-ordering via painter's algorithm

```javascript
const meshes = [
  {
    mesh: VectermMesh.cube(1),
    transform: {
      position: new VectermMath.Vector3(-3, 0, 0),
      rotation: new VectermMath.Vector3(rot, rot, 0),
      scale: new VectermMath.Vector3(1, 1, 1)
    },
    color: '#ff0088'
  },
  {
    mesh: VectermMesh.sphere(1.5),
    transform: {
      position: new VectermMath.Vector3(3, 0, 0),
      rotation: new VectermMath.Vector3(rot * 0.5, rot, rot),
      scale: new VectermMath.Vector3(1, 1, 1)
    },
    color: '#00ff88'
  }
];

vecterm.render(meshes, camera, deltaTime);
// Renderer automatically sorts all edges by depth
```

### Pattern C: Per-Face or Per-Vertex Coloring

**Note**: Current implementation supports per-mesh color only.

**Current Limitation**: All edges of a mesh use the same color.

**Workaround**: Create multiple meshes with different transforms/colors:
```javascript
const cubeMesh = VectermMesh.cube(1);
const meshes = [
  { mesh: cubeMesh, transform: t1, color: '#ff0088' },
  { mesh: cubeMesh, transform: t2, color: '#00ff88' }
];
```

### Pattern D: Hidden Line Removal

**Semantic**: Render only visible edges using back-face culling

**How it works**:
1. For each face, compute cross product of edges in screen space
2. If cross product < 0, face is front-facing (visible)
3. Only edges of visible faces are added to the rendering list
4. Edges are depth-sorted (painter's algorithm)

**Configuration**:
```javascript
vecterm.setConfig('backfaceCulling', true);    // Enable
vecterm.setConfig('hiddenLineRemoval', true);  // Enable sorting
```

**Result**: 
- Without these: All edges draw, creating "X-ray" effect
- With these: Only visible surfaces show, proper occlusion

### Pattern E: Orbital Camera Control

**Semantic**: Interactive viewing angle adjustment

```javascript
// Get camera from demo
const camera = getVectermCamera();

// Orbit around target
camera.orbit(0.1, 0.05);    // Azimuth, Elevation (radians)

// Zoom
camera.zoom(0.5);           // Positive = move toward target

// Manual positioning
camera.position = new VectermMath.Vector3(5, 5, 10);
camera.target = new VectermMath.Vector3(0, 0, 0);
```

---

## Part 6: Integration Points

### With Redux Store

**Actions related to Vecterm**:
```javascript
// From cli/command-processor.js, lines 273-299

// Vecterm demo start
store.dispatch(/* no explicit action */);
startVectermDemo();

// Vecterm demo stop
store.dispatch(/* no explicit action */);
stopVectermDemo();

// Camera orbit
const camera = getVectermCamera();
camera.orbit(azimuth, elevation);

// Camera zoom
const camera = getVectermCamera();
camera.zoom(delta);
```

### With CLI Commands

**Available commands** (README.md, lines 40-44):
```
vecterm.demo                    # Start spinning cube demo
vecterm.stop                    # Stop the demo
vecterm.camera.orbit <az> <el>  # Orbit camera
vecterm.camera.zoom <delta>     # Zoom camera
```

### With Main Canvas

**Game mode 3D rendering**:
```javascript
// From command-processor.js, line 254
play3d <game>

// Creates game instance that uses main canvas
// Game can use Vecterm for 3D visualization
startGamePlay(gameId, '3d');
```

### With ReduxCanvas

**Relationship**:
- **ReduxCanvas** (ReduxCanvas.js): 2D layer-based rendering for UI elements
- **Vecterm** (Vecterm.js): 3D wireframe rendering for 3D visualization
- **Purpose**: Orthogonal concerns - 2D UI vs 3D graphics

```javascript
// ReduxCanvas used for:
canvas.addEntity({ type: 'rect', x: 100, y: 100 });

// Vecterm used for:
vecterm.render([{ mesh: cubeMesh, transform, color }], camera);

// Both can be on same page:
// - Main canvas: ReduxCanvas (2D demo visualization)
// - CLI vecterm: Vecterm (3D cube demo)
```

---

## Part 7: Key Rendering Patterns Summary

### Pattern Matrix

| Pattern | Location | Semantics | Example |
|---------|----------|-----------|---------|
| **Wireframe Mesh** | Vecterm.js:176-264 | Draw 3D geometry as lines | Cube, sphere |
| **Hidden-Line Removal** | Vecterm.js:213-235 | Cull back-facing polygons | Visible surfaces only |
| **Painter's Algorithm** | Vecterm.js:254-257 | Sort by depth for occlusion | Proper z-ordering |
| **MVP Transform** | Vecterm.js:189-203 | Model→View→Projection | Camera transformation |
| **Back-Face Culling** | Vecterm.js:299-314 | Cross-product test | Performance + correctness |
| **VT100 Effects** | Vecterm.js:346-361 | Add phosphor aesthetics | Scanlines, glow |
| **Orbital Camera** | VectermMath.js:294-313 | Spherical coordinate control | Interactive rotation |
| **Multiple Meshes** | vecterm-demo.js:47-55 | Render multiple objects | Complex scenes |

---

## Part 8: Technical Deep Dives

### Matrix Multiplication Order (TRS)

The key insight is the **order of transformation composition**:

```javascript
// From Vecterm.js, line 282
return T.multiply(Rz.multiply(Ry.multiply(Rx.multiply(S))));

// Breaking it down:
// 1. S (Scale) is applied first to the vector
// 2. Then Rx (Rotation around X)
// 3. Then Ry (Rotation around Y)
// 4. Then Rz (Rotation around Z)
// 5. Finally T (Translation) is applied

// Mathematically: M = T × Rz × Ry × Rx × S
// Applied to vector v: v' = T × Rz × Ry × Rx × S × v

// This order ensures:
// - Local scaling happens first (in object space)
// - Then rotation (around origin)
// - Then translation (to world position)
```

### Perspective Projection

```javascript
// From VectermMath.js, lines 234-244
static perspective(fov, aspect, near, far) {
  const f = 1.0 / Math.tan(fov / 2);
  const rangeInv = 1.0 / (near - far);

  return new Matrix4([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0
  ]);
}

// This matrix:
// - Scales x by f/aspect (maintains aspect ratio)
// - Scales y by f (controls FOV)
// - Maps z from [near, far] to [-1, 1] (clip space)
// - Sets w = -z (enables perspective divide)
```

### Cross Product for Face Normal

```javascript
// From Vecterm.js, lines 300-314
const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y };
const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y };
const cross = edge1.x * edge2.y - edge1.y * edge2.x;

// In 2D (screen space):
// cross = (v1 - v0) × (v2 - v0)
// If cross < 0: face is front-facing (CCW in screen space)
// If cross > 0: face is back-facing (CW in screen space)
// If cross ≈ 0: face is edge-on (tangent to view)

return cross < 0;  // Return true if visible
```

---

## Part 9: Conclusions and Semantics Summary

### What Makes Vecterm Unique

1. **Dual-Purpose Architecture**
   - Works as both interactive CLI visualization (REPL mode)
   - Works as game engine 3D renderer (Canvas mode)
   - Seamlessly integrated with Redux state management

2. **Hidden-Line Removal**
   - True 3D rendering, not fake 2D projection
   - Back-face culling determines visibility
   - Painter's algorithm ensures correct occlusion
   - Configurable for different visual styles

3. **VT100 Aesthetics**
   - Phosphor color styling
   - Animated scanlines for CRT feel
   - Glow effects with configurable intensity
   - Compatible with terminal theming

4. **Mathematical Foundation**
   - Proper matrix transformations (Column-major)
   - Full perspective projection
   - Spherical orbital camera control
   - Standard 3D graphics math

### Current Rendering Semantics

**Entity Rendering Model**:
```
Input: meshes[]
├─ mesh: Mesh (vertices, edges, faces)
├─ transform: { position, rotation, scale }
└─ color: hex string

Process: MVP Transform → Face Culling → Depth Sort → Rasterize

Output: 2D canvas with 3D visualization
├─ Lines with optional glow
├─ Animated scanlines
└─ Proper depth-based occlusion
```

**Configuration Model**:
```
Vecterm.config object:
├─ Visual: phosphorColor, backgroundColor, lineWidth, glowIntensity
├─ Effects: scanlineIntensity, scanlineSpeed, rasterWave
├─ Behavior: hiddenLineRemoval, backfaceCulling
└─ Time: this.time (accumulated seconds)
```

**Camera Model**:
```
Camera system:
├─ Position-based: Cartesian coordinates
├─ Target-based: Look-at point
├─ Orbital: Spherical coordinate wrapper
├─ Projection: Perspective with configurable FOV
└─ Controls: orbit(), zoom(), manual positioning
```

### Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| Vecterm.js | 381 | Core 3D renderer + Mesh class |
| VectermMath.js | 331 | Vector3, Matrix4, Camera |
| vecterm-demo.js | 107 | CLI spinning cube demo |
| test-vecterm.html | 62 | Standalone test example |
| command-processor.js | ~550 | CLI integration |
| app.js | 151 | Application orchestration |

---

## Appendix: Complete Rendering Flow

```
COMMAND: "vecterm.demo"
    ↓
command-processor.js line 273-276
    ↓
stopVectermDemo() + startVectermDemo()
    ↓
vecterm-demo.js line 36-62 (animate function)
    ↓
Every 16ms (60fps):
    ├─ demoRotation += 0.01
    ├─ Build meshes array with current rotation
    ├─ Call: vectermPreview.render(meshes, vectermCamera, 0.016)
    │
    └─ Inside Vecterm.render():
        ├─ Line 176-187: Clear canvas
        ├─ Line 188-191: Get camera matrices (view & projection)
        ├─ Line 193-211: For each mesh:
        │   ├─ Build model matrix (TRS composition)
        │   ├─ Transform vertices to screen space
        │   ├─ Back-face culling if enabled
        │   ├─ Collect edges with depths
        │
        ├─ Line 254-257: Sort edges by depth
        ├─ Line 260: Draw all edges with effects
        │   └─ _drawLines() in line 322-343
        │       ├─ Set color and shadow
        │       ├─ Draw ctx.moveTo() + ctx.lineTo()
        │       └─ ctx.stroke()
        │
        └─ Line 263: Apply VT100 effects
            └─ _applyEffects() in line 346-361
                └─ Draw animated scanlines

Result: Spinning cube displayed in #cli-vecterm canvas
```

---

*Analysis Complete. This document provides a comprehensive understanding of Vecterm's architecture, rendering semantics, and integration patterns.*
