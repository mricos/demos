# View System Documentation

## Overview

The View system is the rendering layer of the **World/Field/View** architecture. It provides a unified interface for rendering both 2D and 3D graphics.

## Architecture

```
World/Field/View Separation

┌─────────────────┐
│     World       │  Entity/Component data model
│  (world.js)     │  - Entities & components
│                 │  - Spatial indexing
│                 │  - Scene management
└────────┬────────┘
         │
┌────────▼────────┐
│     Field       │  Runtime container
│  (field.js)     │  - Time/tick management
│                 │  - Systems execution
│                 │  - RNG & checkpoints
└────────┬────────┘
         │
┌────────▼────────┐
│     View        │  Rendering layer
│  (view.js)      │  - Multiple rendering backends
│                 │  - 2D and 3D support
│                 │  - Camera management
└─────────────────┘
```

## View Classes

### Abstract Base: `View`

All views implement this interface:

- `render(frame)` - Render a frame
- `clear()` - Clear the view
- `getDimensions()` - Get view dimensions
- `createViewport(name, rect, camera)` - Create viewport

### Canvas2DView

2D rendering using HTML Canvas API.

**Features:**
- Primitives: line, rect, circle, polygon, text
- Viewport support
- Camera transforms

**Example:**
```javascript
import { Canvas2DView, Frame } from './core/view.js';

const canvas = document.getElementById('my-canvas');
const view = new Canvas2DView('main', 'Main View', canvas);

const frame = new Frame();
frame.addPrimitive({
  type: 'circle',
  x: 200, y: 150,
  radius: 50,
  color: '#00ff00',
  filled: true
});

view.render(frame);
```

### VT100View

Terminal character grid rendering with VT100 effects.

**Features:**
- Character-based rendering
- Bresenham line drawing
- Phosphor glow effects
- Scanlines

**Example:**
```javascript
import { VT100View, Frame } from './core/view.js';

const canvas = document.getElementById('terminal-canvas');
const view = new VT100View('terminal', 'Terminal', canvas, 80, 24);

const frame = new Frame();
frame.addPrimitive({
  type: 'line',
  from: { x: 0, y: 0 },
  to: { x: 400, y: 300 },
  char: '█',
  color: '#00ff00'
});

view.writeAt(2, 2, 'Hello VT100!', '#00ff00');
view.render(frame);
```

### Vecterm3DView

3D wireframe rendering with hidden line removal.

**Dependencies:**
- VectermMath.js
- Vecterm.js

**Features:**
- Hidden line removal
- Backface culling
- Phosphor effects
- Camera projection

**Example:**
```javascript
import { Vecterm3DView, Frame, Camera3D } from './core/view.js';

const canvas = document.getElementById('3d-canvas');
const view = new Vecterm3DView('3d', '3D View', canvas);

// Create camera
const camera = new Camera3D(
  {x: 0, y: 5, z: 10},  // position
  {x: 0, y: 0, z: 0}    // target
);
view.setCamera(camera.getCamera());

// Create mesh
const cube = VectermMesh.cube(2);

const frame = new Frame();
frame.addMesh(cube, {
  position: {x: 0, y: 0, z: 0},
  rotation: {x: 0.5, y: 1.0, z: 0.3},
  scale: {x: 1, y: 1, z: 1}
}, '#00ff88');

view.render(frame);
```

## Frame System

The `Frame` class contains rendering primitives and metadata.

### 2D Primitives

```javascript
// Line
{ type: 'line', from: {x, y}, to: {x, y}, color, width }

// Rectangle
{ type: 'rect', x, y, width, height, color, filled }

// Circle
{ type: 'circle', x, y, radius, color, filled }

// Polygon
{ type: 'polygon', points: [{x, y}, ...], color, filled }

// Text
{ type: 'text', x, y, text, color, font }
```

### 3D Primitives

```javascript
// Mesh
{
  type: 'mesh',
  mesh: VectermMesh,  // cube, sphere, box, etc.
  transform: {
    position: {x, y, z},
    rotation: {x, y, z},  // radians
    scale: {x, y, z}
  },
  color: '#00ff00'
}
```

### Helper Methods

```javascript
const frame = new Frame();

// Add primitive manually
frame.addPrimitive({ type: 'circle', x: 100, y: 100, radius: 50 });

// Add 3D mesh (convenience method)
frame.addMesh(mesh, transform, color);

// Clear frame
frame.clear();
```

## Camera System

### Camera2D

Simple 2D camera with pan and zoom.

```javascript
import { Camera2D } from './core/view.js';

const camera = new Camera2D(0, 0, 800, 600, 1.0);

camera.setPosition(100, 50);
camera.setZoom(1.5);

const screenPos = camera.worldToScreen(worldX, worldY);
const worldPos = camera.screenToWorld(screenX, screenY);
```

### Camera3D

3D perspective camera (wraps VectermMath.Camera).

```javascript
import { Camera3D } from './core/view.js';

const camera = new Camera3D(
  {x: 0, y: 10, z: 20},  // position
  {x: 0, y: 0, z: 0},    // target
  Math.PI / 4,           // fov (optional)
  0.1,                   // near (optional)
  1000                   // far (optional)
);

// Set position
camera.setPosition(5, 10, 15);

// Set target
camera.setTarget(0, 0, 0);

// Orbit around target
camera.orbit(
  Math.PI / 4,  // azimuth
  Math.PI / 6,  // elevation
  20            // distance
);

// Get matrices
const viewMatrix = camera.getViewMatrix();
const projMatrix = camera.getProjectionMatrix();

// Get underlying VectermMath.Camera
const vectermCamera = camera.getCamera();
```

## Integration with World/Field

### Typical Usage Pattern

```javascript
import { World } from './core/world.js';
import { Field, System } from './core/field.js';
import { Canvas2DView, Frame } from './core/view.js';

// Create world
const world = new World({ name: 'game-world' });

// Add entities
world.createEntity({ id: '#player' });
world.addComponent('#player', 'position', { x: 100, y: 100 });
world.addComponent('#player', 'renderable', { color: '#0f0', radius: 10 });

// Create field with systems
const field = new Field({ world, name: 'game' });

// Create view
const canvas = document.getElementById('canvas');
const view = new Canvas2DView('game', 'Game View', canvas);

// Game loop
function gameLoop() {
  // Update simulation
  field.tick(16.67);

  // Render
  const frame = new Frame();
  const entities = world.queryComponents('position', 'renderable');

  for (const { components } of entities) {
    const pos = components.position;
    const r = components.renderable;

    frame.addPrimitive({
      type: 'circle',
      x: pos.x,
      y: pos.y,
      radius: r.radius,
      color: r.color,
      filled: true
    });
  }

  view.render(frame);

  requestAnimationFrame(gameLoop);
}

field.start();
gameLoop();
```

## Testing

### 2D Tests
```
http://localhost:8003/test-phase1.html
```

Runs all Phase 1 architecture tests including:
- World entity/component queries
- Field systems and tick management
- Canvas2DView and VT100View rendering
- Full integration test

### 3D Tests
```
http://localhost:8003/test-3d-view.html
```

Demonstrates:
- Vecterm3DView rendering
- Camera3D usage
- 3D mesh primitives
- System-driven animation

## Best Practices

### 1. Don't Mutate Components

**Bad:**
```javascript
const pos = world.getComponent(entityId, 'position');
pos.x += 10;  // Mutates stored object!
world.addComponent(entityId, 'position', pos);
```

**Good:**
```javascript
const pos = world.getComponent(entityId, 'position');
const newPos = { x: pos.x + 10, y: pos.y };
world.addComponent(entityId, 'position', newPos);
```

### 2. Use Appropriate View for Content

- **Canvas2DView**: UI, sprites, 2D games
- **VT100View**: Retro effects, ASCII art, terminal apps
- **Vecterm3DView**: 3D wireframes, vector graphics

### 3. Multiple Views on Same World

You can render the same World/Field with multiple views:

```javascript
const world = new World();
const field = new Field({ world });

const view2D = new Canvas2DView('2d', '2D', canvas2D);
const view3D = new Vecterm3DView('3d', '3D', canvas3D);

// Render to both
view2D.render(frame2D);
view3D.render(frame3D);
```

### 4. Frame Reuse

Clear and reuse frames instead of creating new ones each tick:

```javascript
const frame = new Frame();

function render() {
  frame.clear();
  // Add primitives...
  view.render(frame);
}
```

## API Reference

See `core/view.js` header comments for complete API documentation.

## Examples

- **test-phase1.html** - 2D architecture tests
- **test-3d-view.html** - 3D rendering demo
- **Quadrapong.js** - Full game using 2D/3D modes

## Future Enhancements

- SVGView for vector export
- WebGLView for hardware-accelerated 3D
- Post-processing effects
- Multi-viewport rendering
- Render-to-texture support
