# Vecterm Rendering Semantics
## Formal Specification for Redux-Canvas Apps

**Version:** 1.0
**Last Updated:** 2025-10-30

---

## Table of Contents

1. [Introduction](#introduction)
2. [The Redux-Canvas App Pattern](#the-redux-canvas-app-pattern)
3. [Rendering Contract](#rendering-contract)
4. [State Schema](#state-schema)
5. [Rendering Pipeline](#rendering-pipeline)
6. [Grid System](#grid-system)
7. [Dual-Role Architecture](#dual-role-architecture)
8. [API Surface](#api-surface)
9. [Examples](#examples)

---

## Introduction

**Vecterm** is a 3D vector graphics rendering engine that implements the **redux-canvas app** pattern. This document defines the formal semantics of what it means for an object to "be rendered in Vecterm."

### Core Principles

1. **State-Driven Rendering**: All renderable entities exist in Redux state
2. **Declarative Scene Graph**: Describe WHAT to render, not HOW
3. **Reactive Updates**: UI automatically updates when state changes
4. **Dual-Role Design**: Same engine powers REPL debugging and full-screen games
5. **Unified API**: Consistent patterns with ReduxCanvas (2D sibling)

---

## The Redux-Canvas App Pattern

A **redux-canvas app** is an application architecture that combines:
- **Redux**: Centralized state management with time-travel debugging
- **Canvas**: Hardware-accelerated 2D/3D graphics rendering
- **CLI/REPL**: Interactive command-line interface for state manipulation

```
┌─────────────────────────────────────────────────────────┐
│                  Redux-Canvas App                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  User Input (CLI/GUI)                                   │
│         │                                               │
│         ▼                                               │
│  ┌─────────────┐                                        │
│  │   Actions   │  ←  Declarative intent                │
│  └──────┬──────┘                                        │
│         │                                               │
│         ▼                                               │
│  ┌─────────────┐                                        │
│  │  Reducers   │  ←  Pure state transformations        │
│  └──────┬──────┘                                        │
│         │                                               │
│         ▼                                               │
│  ┌─────────────┐                                        │
│  │    Store    │  ←  Single source of truth            │
│  └──────┬──────┘                                        │
│         │                                               │
│         ▼                                               │
│  ┌─────────────┐                                        │
│  │  Renderer   │  ←  Canvas visualization              │
│  └─────────────┘                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Key Characteristics

- **Predictable**: Same actions + same state = same rendering
- **Debuggable**: Inspect state at any point, replay actions
- **Testable**: Pure functions make testing trivial
- **Extensible**: Add new entity types via reducers
- **Performant**: Efficient diffing and batched updates

---

## Rendering Contract

### Input: Renderable Entity

To be rendered in Vecterm, an object MUST conform to this interface:

```typescript
interface VectermEntity {
  id: string;                    // Unique identifier
  type: 'mesh';                  // Entity type (extensible)
  mesh: Mesh;                    // 3D wireframe geometry
  transform: Transform;          // TRS transformation matrix
  color?: string;                // CSS color (default: phosphor green)
  visible?: boolean;             // Visibility flag (default: true)
  layerId?: string;              // Render layer (default: 'default')
}

interface Mesh {
  vertices: Vector3[];           // 3D vertex positions
  edges: [number, number][];     // Pairs of vertex indices
  faces: number[][];             // Arrays of vertex indices (for culling)
}

interface Transform {
  position: Vector3;             // Translation (x, y, z)
  rotation: Vector3;             // Euler angles (rx, ry, rz in radians)
  scale: Vector3;                // Scale factors (sx, sy, sz)
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}
```

### Output: Visual Representation

Vecterm GUARANTEES the following rendering behavior:

1. **Wireframe Rendering**: Only edges are drawn (no filled faces)
2. **Perspective Projection**: 3D→2D using camera frustum
3. **Hidden Line Removal**: Back edges are occluded via painter's algorithm
4. **Back-face Culling**: Rear-facing polygons are not rendered
5. **VT100 Effects**: Phosphor glow, scanlines, CRT distortion
6. **Depth Sorting**: Proper occlusion ordering

### Transformation Order

Vecterm applies transformations in **TRS order**:

```
World Position = T × Rz × Ry × Rx × S × Local Position
```

Where:
- **S** = Scale matrix
- **Rx, Ry, Rz** = Rotation matrices (X → Y → Z order)
- **T** = Translation matrix

---

## State Schema

### Redux State Structure

```javascript
{
  // ... other app state (auth, todos, etc.)

  vecterm: {
    // Entity management
    entities: {
      'cube-1': {
        id: 'cube-1',
        type: 'mesh',
        meshType: 'cube',      // Factory type for serialization
        meshParams: { size: 2 },
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        color: '#00ff88',
        visible: true,
        layerId: 'default'
      }
    },

    // Camera configuration
    camera: {
      position: { x: 5, y: 5, z: 10 },
      target: { x: 0, y: 0, z: 0 },
      fov: 60,
      near: 0.1,
      far: 1000
    },

    // Layer management (z-ordering)
    layers: {
      'default': { id: 'default', zIndex: 0, visible: true },
      'overlay': { id: 'overlay', zIndex: 10, visible: true }
    },

    // VT100 rendering configuration
    config: {
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
      backfaceCulling: true
    },

    // Grid system (first-class, not default)
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
      activeType: 'none' // 'character' | 'square' | 'none'
    },

    // Grid-aware line segments (populated during rendering)
    lineSegments: [],

    // Animation state
    animation: {
      running: false,
      startTime: null,
      frameCount: 0
    }
  }
}
```

### State Normalization

- **Entities**: Keyed by ID for O(1) lookup
- **Layers**: Separate from entities for independent visibility control
- **Camera**: Single active camera (future: multi-camera support)
- **Config**: Mutable settings that don't affect scene graph

---

## Rendering Pipeline

### Overview

```
Redux State → Vecterm.render() → Canvas Pixels
     │              │                  │
     │              ├─ 1. MVP Transform
     │              ├─ 2. Face Culling
     │              ├─ 3. Edge Collection
     │              ├─ 4. Depth Sorting
     │              ├─ 5. Rasterization
     │              └─ 6. VT100 Effects
     │
     └─ Subscribe to changes (reactive)
```

### Stage 1: MVP Transform

**Input:** Entity vertices in local space
**Output:** Screen-space coordinates with depth

```javascript
// For each vertex:
V_clip = P × V × M × V_local

Where:
  M = Model matrix (from entity.transform)
  V = View matrix (from camera)
  P = Projection matrix (from camera + canvas aspect)
```

Matrix composition:
```javascript
M = T(position) × Rz(rz) × Ry(ry) × Rx(rx) × S(scale)
V = lookAt(camera.position, camera.target, up)
P = perspective(fov, aspect, near, far)
```

### Stage 2: Face Culling

**Input:** Transformed face vertices
**Output:** Set of visible face indices

For each face:
```javascript
// Compute normal via cross product
edge1 = v1 - v0
edge2 = v2 - v0
normal = cross(edge1, edge2)

// If facing camera (in screen space)
if (normal.z < 0) {
  mark_visible(face)
}
```

### Stage 3: Edge Collection

**Input:** Visible faces, all edges
**Output:** List of edges to render

```javascript
visibleEdges = []
for each edge in mesh.edges:
  if (edge belongs to visible face) OR (backfaceCulling == false):
    visibleEdges.push({
      p1: screenSpace(vertex[edge[0]]),
      p2: screenSpace(vertex[edge[1]]),
      depth: average(p1.z, p2.z),
      color: entity.color
    })
```

### Stage 4: Depth Sorting

**Input:** List of edges with depth
**Output:** Depth-sorted edges (back-to-front)

```javascript
// Painter's algorithm
visibleEdges.sort((a, b) => b.depth - a.depth)
```

### Stage 5: Rasterization

**Input:** Sorted edges
**Output:** Canvas pixels

```javascript
for each edge in visibleEdges:
  ctx.strokeStyle = edge.color
  ctx.lineWidth = config.lineWidth

  if (config.glowIntensity > 0):
    ctx.shadowBlur = 10 * config.glowIntensity
    ctx.shadowColor = edge.color

  ctx.beginPath()
  ctx.moveTo(edge.p1.x, edge.p1.y)
  ctx.lineTo(edge.p2.x, edge.p2.y)
  ctx.stroke()
```

### Stage 6: VT100 Effects

**Input:** Rendered canvas
**Output:** Final composited frame

Post-processing effects:
- **Scanlines**: Horizontal dark lines with animated offset
- **Phosphor Glow**: Shadow blur on line primitives
- **Raster Wave**: Sinusoidal Y-displacement (optional)
- **Color Grading**: Retro CRT color palette

---

## Grid System

Vecterm includes **first-class grid support** for spatial awareness and ASCII/terminal rendering. The grid system tracks which grid cells each vector line intersects, enabling features like:

- ASCII art conversion
- Grid snapping
- Terminal/character-cell awareness
- Spatial queries
- Grid-aligned rendering

### Grid Types

Vecterm supports two types of grids:

#### 1. Character Grid (Terminal Mode)

For ASCII/terminal rendering and character-cell awareness:

```javascript
grid: {
  character: {
    enabled: false,        // Enable grid tracking
    cols: 80,             // Terminal columns (default: 80)
    rows: 24,             // Terminal rows (default: 24)
    charWidth: 10,        // Pixels per character width
    charHeight: 20,       // Pixels per character height
    visible: false,       // Show grid overlay on canvas
    color: '#003300',     // Grid line color
    snapToGrid: false     // Snap coordinates to grid
  }
}
```

**Use cases:**
- ASCII art generation
- Terminal emulation (80x24, 132x43, etc.)
- Text-mode graphics
- Retro computing aesthetics

#### 2. Square Grid (Canvas Mode)

For general-purpose grid alignment:

```javascript
grid: {
  square: {
    enabled: false,       // Enable grid tracking (not default)
    size: 32,            // Grid cell size in pixels
    visible: false,      // Show grid overlay
    color: '#1a1a1a',    // Grid line color
    snapToGrid: false,   // Snap coordinates to grid
    subdivisions: 1      // Sub-grid divisions
  }
}
```

**Use cases:**
- Level editors
- Tile-based games
- Spatial partitioning
- Collision detection optimization

### Grid-Aware Rendering

When a grid is active, Vecterm automatically calculates which grid cells each line segment intersects:

```javascript
{
  lineSegments: [
    {
      p1: { x: 10, y: 20, z: 0.5 },
      p2: { x: 50, y: 60, z: 0.5 },
      color: '#00ff88',
      depth: 0.5,
      gridCells: [
        { col: 1, row: 1, x: 10, y: 20, width: 10, height: 20 },
        { col: 2, row: 1, x: 20, y: 20, width: 10, height: 20 },
        { col: 2, row: 2, x: 20, y: 40, width: 10, height: 20 },
        // ... more cells
      ]
    }
  ]
}
```

### Grid Algorithms

Vecterm uses optimized algorithms for grid calculations:

**DDA (Digital Differential Analyzer)**
- Accurate line-grid intersection
- Handles all line angles
- Used by default

**Bresenham's Line Algorithm**
- More efficient for integer coordinates
- Classic rasterization algorithm
- Available via `VectermGridUtils.bresenhamGridLine()`

### ASCII Art Conversion

With character grid enabled, convert any 3D scene to ASCII art:

```javascript
// Enable character grid
store.dispatch(vectermActions.setGridType('character'));
store.dispatch(vectermActions.setCharacterGrid({
  cols: 80,
  rows: 24,
  charWidth: 10,
  charHeight: 20,
  enabled: true
}));

// Render scene
vecterm.render(meshes, camera);

// Convert to ASCII
const ascii = vecterm.toASCII();
console.log(ascii);
```

Output:
```
                    +-----------+
                   /           /|
                  /           / |
                 +-----------+  |
                 |           |  |
                 |           | /
                 |           |/
                 +-----------+
```

### Grid API

**State Actions:**
```javascript
// Set active grid type
vectermSetGridType('character' | 'square' | 'none')

// Configure specific grid
vectermSetCharacterGrid({ cols: 80, rows: 24, ... })
vectermSetSquareGrid({ size: 32, subdivisions: 2, ... })

// Toggle grid overlay visibility
vectermToggleGridVisible('character')
vectermToggleGridVisible('square')
```

**CLI Commands:**
```bash
# Grid type
vecterm.grid.type character    # Set to character grid
vecterm.grid.type square        # Set to square grid
vecterm.grid.type none          # Disable grid

# Grid visibility
vecterm.grid.show character     # Show character grid overlay
vecterm.grid.hide square        # Hide square grid overlay
vecterm.grid.toggle character   # Toggle visibility

# Grid configuration
vecterm.grid.size 32            # Set square grid size
vecterm.grid.character 80 24    # Set character grid dimensions

# Grid utilities
vecterm.grid.ascii              # Convert to ASCII art
vecterm.grid.stats              # Show intersection statistics
vecterm.grid.status             # Show grid config
```

### Grid Utilities (VectermGridUtils)

**Coordinate Conversion:**
```javascript
// Pixel to grid cell
const cell = VectermGridUtils.pixelToCharacterCell(150, 200, charGrid);
// { col: 15, row: 10, x: 150, y: 200, width: 10, height: 20 }

// Snap to grid
const snapped = VectermGridUtils.snapToSquareGrid(157, 203, squareGrid, 'nearest');
// { x: 160, y: 200 }
```

**Line Intersection:**
```javascript
// Get all cells a line crosses
const cells = VectermGridUtils.getLineGridIntersections(
  { x: 0, y: 0 },
  { x: 100, y: 100 },
  charGrid,
  'character'
);
```

**ASCII Rendering:**
```javascript
// Get line character based on angle
const char = VectermGridUtils.getSimpleLineCharacter(p1, p2);
// '|', '/', '-', '\', or '+'

// Convert all lines to ASCII
const ascii = VectermGridUtils.linesToASCII(lineSegments, charGrid);
```

**Grid Rendering:**
```javascript
// Render grid overlay to canvas
VectermGridUtils.renderCharacterGrid(ctx, width, height, charGrid);
VectermGridUtils.renderSquareGrid(ctx, width, height, squareGrid);
```

### Grid Statistics

Query grid usage for optimization:

```javascript
const stats = vecterm.getGridStats();
// {
//   totalLineSegments: 12,
//   totalCellsCrossed: 156,
//   uniqueCellsCrossed: 89,
//   averageCellsPerLine: 13
// }
```

### Grid Design Principles

1. **First-Class, Not Default** - Grids are built-in but optional
2. **Zero Performance Cost** - When disabled, no overhead
3. **Type-Agnostic** - Character and square grids share same algorithms
4. **State-Driven** - Grid config lives in Redux
5. **Utility-Rich** - Comprehensive helpers for common operations

---

## Dual-Role Architecture

Vecterm operates in two modes with **the same rendering engine**:

### REPL Mode (Debug/Interactive)

**Canvas:** `#cli-vecterm` (800×200px)
**Purpose:** Interactive debugging, command testing, live tweaking
**Characteristics:**
- Small viewport for terminal embedding
- Manual camera control via CLI
- Step-by-step entity manipulation
- State inspection in real-time

**Example Usage:**
```bash
> vecterm.spawn cube 2 0,0,0          # Add cube to state
> vecterm.rotate cube-1 0.01 0.007 0  # Update rotation
> vecterm.camera.orbit 0.1 0          # Adjust camera
> vecterm.config.glow 0.8             # Tweak rendering
```

### Game Mode (Immersive)

**Canvas:** `#main-canvas` (fullscreen, typically 1920×1080)
**Purpose:** Production rendering, game visuals, animations
**Characteristics:**
- Large viewport for immersive experience
- Automated camera (scripted or physics-based)
- High-performance batch rendering
- VT100 effects for aesthetic

**Example Usage:**
```javascript
// Game loop updates Redux state
store.dispatch({
  type: 'VECTERM_UPDATE_TRANSFORM',
  id: 'spaceship',
  transform: {
    position: new Vector3(x, y, z),
    rotation: new Vector3(pitch, yaw, roll),
    scale: new Vector3(1, 1, 1)
  }
});

// Renderer subscribes and updates automatically
```

### Mode Switching

Both modes share:
- ✅ Same Redux state schema
- ✅ Same rendering pipeline
- ✅ Same VT100 effects
- ✅ Same entity types

Differences:
- Canvas size (viewport dimensions)
- Update frequency (manual vs 60fps)
- Input source (CLI vs game logic)

---

## API Surface

### Redux Actions

All Vecterm operations are triggered via Redux actions:

```javascript
// Entity lifecycle
VECTERM_ADD_ENTITY      // Create new mesh
VECTERM_UPDATE_ENTITY   // Modify existing mesh
VECTERM_REMOVE_ENTITY   // Delete mesh
VECTERM_TOGGLE_VISIBLE  // Show/hide mesh

// Transform updates (frequent)
VECTERM_SET_POSITION    // Move entity
VECTERM_SET_ROTATION    // Rotate entity
VECTERM_SET_SCALE       // Scale entity
VECTERM_UPDATE_TRANSFORM // Atomic update of all TRS

// Camera controls
VECTERM_SET_CAMERA      // Set camera position/target
VECTERM_ORBIT_CAMERA    // Spherical orbit adjustment
VECTERM_ZOOM_CAMERA     // Dolly in/out

// Layer management
VECTERM_ADD_LAYER       // Create render layer
VECTERM_REMOVE_LAYER    // Delete layer
VECTERM_SET_LAYER_VISIBLE // Show/hide layer
VECTERM_SET_ENTITY_LAYER  // Assign entity to layer

// Configuration
VECTERM_SET_CONFIG      // Update rendering settings
VECTERM_RESET_CONFIG    // Restore defaults

// Animation
VECTERM_START_ANIMATION // Begin render loop
VECTERM_STOP_ANIMATION  // Stop render loop
VECTERM_TICK            // Single frame update
```

### Action Creators

```javascript
import { vectermActions } from './core/actions.js';

// Add a cube
store.dispatch(vectermActions.addEntity({
  id: 'cube-1',
  meshType: 'cube',
  meshParams: { size: 2 },
  transform: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
  },
  color: '#00ff88'
}));

// Rotate continuously
function gameLoop() {
  const state = store.getState();
  const entity = state.vecterm.entities['cube-1'];

  store.dispatch(vectermActions.updateTransform('cube-1', {
    ...entity.transform,
    rotation: {
      x: entity.transform.rotation.x + 0.01,
      y: entity.transform.rotation.y + 0.007,
      z: 0
    }
  }));

  requestAnimationFrame(gameLoop);
}
```

### CLI Commands

Interactive shell maps to actions:

```bash
# Entity management
vecterm.spawn <type> <params> [position] [rotation] [scale]
vecterm.select <id>
vecterm.move <id> <x> <y> <z>
vecterm.rotate <id> <rx> <ry> <rz>
vecterm.scale <id> <sx> <sy> <sz>
vecterm.delete <id>
vecterm.list

# Camera controls
vecterm.camera.set <x> <y> <z> [tx] [ty] [tz]
vecterm.camera.orbit <azimuth> <elevation>
vecterm.camera.zoom <factor>
vecterm.camera.reset

# Configuration
vecterm.config.glow <0-1>
vecterm.config.scanlines <0-1>
vecterm.config.phosphor <color>
vecterm.config.backface <on|off>
vecterm.config.hiddenline <on|off>
vecterm.config.reset

# Animation
vecterm.start
vecterm.stop
vecterm.demo    # Load spinning cube demo
```

---

## Examples

### Example 1: Static Scene

Create a simple scene with two cubes:

```javascript
import { store } from './core/store-instance.js';
import { vectermActions } from './core/actions.js';

// Cube 1: Large, at origin
store.dispatch(vectermActions.addEntity({
  id: 'cube-large',
  meshType: 'cube',
  meshParams: { size: 3 },
  transform: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0.3, y: 0.5, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
  },
  color: '#00ff88'
}));

// Cube 2: Small, offset
store.dispatch(vectermActions.addEntity({
  id: 'cube-small',
  meshType: 'cube',
  meshParams: { size: 1 },
  transform: {
    position: { x: 4, y: 2, z: -1 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
  },
  color: '#ff00ff'
}));

// Render once
vecterm.render(store.getState().vecterm);
```

### Example 2: Animated Rotation

Continuously rotate an entity via Redux:

```javascript
function animateEntity(entityId, rotationSpeed) {
  function tick() {
    const state = store.getState();
    const entity = state.vecterm.entities[entityId];

    if (!entity) return;

    // Dispatch transform update
    store.dispatch(vectermActions.updateTransform(entityId, {
      ...entity.transform,
      rotation: {
        x: entity.transform.rotation.x + rotationSpeed.x,
        y: entity.transform.rotation.y + rotationSpeed.y,
        z: entity.transform.rotation.z + rotationSpeed.z
      }
    }));

    requestAnimationFrame(tick);
  }

  tick();
}

// Usage
animateEntity('cube-1', { x: 0.01, y: 0.007, z: 0 });
```

### Example 3: Interactive Camera

Orbit camera around origin via CLI:

```bash
# Set initial camera position
> vecterm.camera.set 10 5 10 0 0 0

# Orbit horizontally (azimuth)
> vecterm.camera.orbit 0.1 0

# Orbit vertically (elevation)
> vecterm.camera.orbit 0 0.1

# Zoom in
> vecterm.camera.zoom 0.9

# Reset to default
> vecterm.camera.reset
```

### Example 4: Layer Management

Organize entities into layers:

```javascript
// Create layers
store.dispatch(vectermActions.addLayer('background', 0));
store.dispatch(vectermActions.addLayer('foreground', 10));

// Assign entities
store.dispatch(vectermActions.setEntityLayer('cube-1', 'background'));
store.dispatch(vectermActions.setEntityLayer('cube-2', 'foreground'));

// Toggle layer visibility
store.dispatch(vectermActions.setLayerVisible('background', false));
```

### Example 5: VT100 Customization

Configure retro CRT aesthetic:

```javascript
store.dispatch(vectermActions.setConfig({
  phosphorColor: '#00ffaa',        // Cyan-green phosphor
  glowIntensity: 0.6,              // Strong bloom
  scanlineIntensity: 0.25,         // Visible scanlines
  scanlineSpeed: 10,               // Fast scrolling
  rasterWave: {
    enabled: true,
    amplitude: 3,
    frequency: 0.8
  },
  hiddenLineRemoval: true,
  backfaceCulling: true
}));
```

---

## Appendix: Comparison with ReduxCanvas

Both **Vecterm** (3D) and **ReduxCanvas** (2D) implement the redux-canvas app pattern:

| Feature | ReduxCanvas (2D) | Vecterm (3D) |
|---------|-----------------|--------------|
| **State Management** | Redux | Redux |
| **Entity Storage** | `entities` map | `entities` map |
| **Layer System** | Yes (z-index) | Yes (z-index) |
| **Transform** | x, y, rotation | position, rotation, scale |
| **Rendering** | Filled shapes | Wireframe edges |
| **Effects** | VT100 scanlines | VT100 + phosphor glow |
| **Culling** | None (2D) | Back-face + hidden line |
| **Projection** | Orthographic | Perspective |
| **Use Case** | Sprites, UI | 3D models, games |

**Unified API Example:**

```javascript
// ReduxCanvas (2D sprite)
reduxCanvas.addEntity({
  type: 'rect',
  x: 100, y: 100,
  width: 64, height: 64,
  color: '#4fc3f7'
});

// Vecterm (3D mesh) - similar structure!
vecterm.addEntity({
  type: 'mesh',
  meshType: 'cube',
  transform: { position: {x:0,y:0,z:0}, ... },
  color: '#4fc3f7'
});
```

---

## Conclusion

Vecterm's rendering semantics are **state-driven, declarative, and predictable**. By adhering to the redux-canvas app pattern, it provides:

✅ **Single source of truth** - All scene data in Redux
✅ **Time-travel debugging** - Replay actions to reproduce states
✅ **Reactive rendering** - UI updates automatically
✅ **Testable logic** - Pure functions, easy mocking
✅ **Dual-role design** - REPL and game mode with same engine
✅ **Unified API** - Consistent patterns with ReduxCanvas

To render in Vecterm: **Put it in Redux state**.

---

**References:**
- [VECTERM_ANALYSIS.md](./VECTERM_ANALYSIS.md) - Technical deep dive
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall app architecture
- [ReduxCanvas.js](./ReduxCanvas.js) - 2D sibling implementation
