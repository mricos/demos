# ECS Entity Architecture - Storage, Naming & Orchestration

## Entity Storage Format

### Core Structure
Entities are stored as JavaScript objects with a component-based architecture:

```javascript
{
  id: "entity-1",           // Unique identifier: "entity-{incrementing number}"
  position: { x: 0, y: 0 }, // Components are flat properties
  velocity: { vx: 0.5, vy: 0.3 },
  renderable: { type: 'circle', color: '#4FC3F7', visible: true },
  ball: { size: 0.03, baseSpeed: 0.8 },
  aabb: { width: 0.03, height: 0.03 },
  trail: { points: [], maxLength: 20 },
  tags: { tags: ['ball', 'quadrapong'] }
}
```

### Storage Locations

**Dual Storage System** (Performance + Inspection):

1. **ECS Local Cache** (`ecs.entities` Map)
   - Primary storage during gameplay
   - JavaScript `Map<string, Object>`
   - Ultra-fast O(1) lookups
   - Updated every frame (60 FPS)
   - Location: `core/ecs.js` → `this.entities`

2. **Redux Store** (Optional, disabled by default)
   - Secondary storage for inspection/debugging
   - Synced at 2 FPS (500ms intervals) when enabled
   - Accessible via game panel tabs
   - Location: `core/store.js` → `state.entities`
   - **Current Mode**: `performanceMode: true, enableReduxSync: false`

### Entity ID Naming Convention

```javascript
// Format: "entity-{autoIncrement}"
// Examples:
"entity-1"    // First entity created
"entity-2"    // Second entity
"entity-47"   // 47th entity

// ID Generation (core/ecs.js:33-34)
const entityId = `entity-${this.nextEntityId++}`;
```

**Rules**:
- IDs never reuse (increment-only)
- Always prefixed with `entity-`
- Sequential numbering per ECS instance
- Immutable after creation

## Component Naming Conventions

### Standard Components (Defined in `core/components.js`)

| Component | Purpose | Example Data |
|-----------|---------|--------------|
| `position` | 2D/3D spatial location | `{ x: 0, y: 0 }` or `{ x, y, z }` |
| `velocity` | Movement vector | `{ vx: 0.5, vy: 0.3 }` |
| `transform` | Unified 2D/3D transform | `{ is3D, position, rotation, scale }` |
| `renderable` | Visual representation | `{ type: 'circle', color: '#4FC3F7', visible: true }` |
| `aabb` | Axis-aligned bounding box | `{ width: 0.03, height: 0.03 }` |
| `tags` | Entity categorization | `{ tags: ['ball', 'player', 'enemy'] }` |

### Game-Specific Components

| Component | Game | Purpose |
|-----------|------|---------|
| `paddle` | Quadrapong | Paddle data: `{ side, length, thickness, speed }` |
| `ball` | Quadrapong | Ball properties: `{ size, baseSpeed }` |
| `playerControlled` | Quadrapong | Input mapping: `{ player, upKey, downKey, upPressed, downPressed }` |
| `aiControlled` | Quadrapong | AI behavior: `{ enabled, trackingSpeed }` |
| `score` | Quadrapong | Player score: `{ value }` |
| `trail` | Effects | Motion trail: `{ points: [], maxLength }` |

### Component Factory Pattern

All components use factory functions (not classes):

```javascript
// core/components.js
const Components = {
  Position: (x, y) => ({ x, y }),

  Velocity: (vx, vy) => ({ vx, vy }),

  Renderable: (type, color, visible = true) => ({
    type,      // 'rect', 'circle', 'line'
    color,     // CSS color string
    visible    // boolean
  }),

  // Usage in game:
  // Components.Position(0, 0)
  // Components.Renderable('circle', '#4FC3F7')
};
```

**Why Factories?**
- Simple data structures (POJOs - Plain Old JavaScript Objects)
- No prototype chain overhead
- Serializable to JSON
- Easy to clone/copy
- Fast property access

## Render Engine Orchestration

### Current Architecture: Inline Game Rendering

**Current State**: Each game has embedded rendering logic

```javascript
// games/QuadrapongGame.js:264-322
class Game {
  constructor(store, canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');  // ← Engine determined here
    this.camera = new NormalizedCamera(canvas);
  }

  render() {
    const ctx = this.ctx;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Apply camera transform (normalized → pixel coords)
    this.camera.applyTransform(ctx);

    // Draw grid
    this.drawGridNormalized(ctx);

    // Render entities
    const renderables = this.ecs.query('renderable', 'position');
    renderables.forEach(entity => {
      if (entity.renderable.type === 'rect') {
        ctx.fillRect(entity.position.x, entity.position.y, w, h);
      } else if (entity.renderable.type === 'circle') {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Restore transform
    this.camera.restoreTransform(ctx);
  }
}
```

### Game Orchestration Flow

```
User Input (CLI)
      ↓
cli/command-processor.js
      ↓
games/game-manager.js
  - createGameManager(store)
  - startGamePreview(gameId)  ← ASCII preview in terminal
  - startGamePlay(gameId)     ← Full canvas gameplay
      ↓
if (gameId === 'quadrapong')
      ↓
games/QuadrapongGame.js
  - QuadrapongGame.create(store, canvas)
  - .initialize()  ← Create entities, register systems
  - .start()       ← Start game loop
      ↓
Game Loop (60 FPS)
  - update(deltaTime)   → ECS systems update
  - render()            → Canvas 2D rendering
```

### Available Render Contexts

**Detected Rendering Paths**:

1. **Canvas 2D** (Current - Quadrapong)
   - `canvas.getContext('2d')`
   - Direct imperative drawing
   - Transform-based coordinate system

2. **WebGL/3D** (Exists but unused)
   - VectermMath.js has 3D primitives (Vector3, Matrix4, Camera)
   - Not currently integrated with ECS

3. **VScope Renderer** (Module-based)
   - `modules/vscope/vscope-renderer.js`
   - Terminal-like scanline effects
   - Not integrated with main game loop

4. **PixelVector Renderer** (Partially implemented)
   - `ui/pixel-vector-renderer.js`
   - Retro CRT aesthetic
   - Camera supports 'pixelvector' mode but no renderer yet

## Camera System (Normalized Coordinates)

### Architecture

```javascript
// core/camera.js
class NormalizedCamera {
  mode: '2d' | '3d' | 'pixelvector'

  // Coordinate space: -1 to 1
  position: { x: 0, y: 0, z: 2 }
  target: { x: 0, y: 0, z: 0 }
  zoom: 1.0

  // Transform: normalized (-1 to 1) → screen pixels
  applyTransform(ctx) {
    ctx.translate(width/2, height/2);          // Center origin
    ctx.scale(width/2, height/2);              // -1..1 → pixels
    ctx.scale(zoom, zoom);                     // Zoom
    ctx.translate(-target.x, -target.y);       // Pan
    ctx.scale(1, -1);                          // Flip Y (up is positive)
  }
}
```

### Benefits of Normalized Coordinates

✅ **Resolution Independent**: Game scales to any canvas size
✅ **Multi-mode Ready**: Same entities work in 2D, 3D, pixelvector
✅ **Camera Freedom**: Can orbit, zoom, pan without entity changes
✅ **Infinite Canvas**: No numerical precision issues
✅ **Z-Depth Integration**: Z coordinate fits naturally in -1 to 1

## Footer Status Bar Integration

### Current Footer Elements

```html
<!-- index.html:1428-1444 -->
<div id="footer">
  <div class="footer-section">
    <span class="footer-label">VECTERM PLAYGROUND</span>
    <span class="footer-value">v0.0.3</span>
  </div>
  <div class="footer-section">
    <span class="footer-label">RENDER ENGINE</span>
    <span class="footer-value" id="footer-engine">Canvas 2D/3D</span>
  </div>
  <div class="footer-section">
    <span class="footer-label">STATUS</span>
    <span class="footer-value status-active" id="footer-status">OPERATIONAL</span>
  </div>
  <div class="footer-section">
    <span class="footer-label">UPTIME</span>
    <span class="footer-value" id="uptime">00:00:00</span>
  </div>
</div>
```

### Current Engine Display

**Element**: `#footer-engine`
**Current Value**: `"Canvas 2D/3D"` (static, hardcoded)
**Needs**: Dynamic updates based on active game/renderer

## Problems with Current Architecture

### 1. ❌ Hardcoded Rendering
- Each game implements its own render loop
- No abstraction layer
- Can't switch renderers without rewriting game

### 2. ❌ Renderer Not Tracked
- Footer engine display is static
- No runtime detection of active renderer
- Can't inspect renderer state

### 3. ❌ No Renderer Registry
- No central place to register renderers
- No way to enumerate available engines
- Manual if/else chains for renderer selection

### 4. ❌ Tightly Coupled
- Game owns canvas context
- Rendering logic mixed with game logic
- Camera is separate but not abstracted

### 5. ❌ Missing Features
- No renderer hot-swapping
- No performance monitoring
- No renderer-specific settings
- No fallback mechanism

## Next Steps Required

See: `docs/RENDER_ENGINE_MANAGER.md` for proposed architecture
