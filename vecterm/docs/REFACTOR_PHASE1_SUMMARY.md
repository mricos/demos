# Phase 1 Complete: Core Architecture Refactor

## Summary

Phase 1 establishes the foundational World/Field/Surface separation with clean architectural boundaries.

---

## Files Created

### 1. `core/world.js` - Platonic Simulation Space
**Purpose**: Pure entity/component container, independent of runtime and rendering

**Key Features**:
- Entity lifecycle (create, destroy, query)
- Component storage with indexing
- Label-based queries for Prometheus-style selectors
- Spatial indexing (grid-based, upgradeable to quadtree)
- Scene partitioning
- Serialization/deserialization

**API**:
```javascript
world.createEntity({ id, labels, scene })
world.addComponent(entityId, componentName, data)
world.queryComponents(...componentNames)
world.queryLabels({ type: 'ball', player: '1' })
world.querySpatial({ x, y, width, height })
world.getScene(name)
world.serialize() / World.deserialize(data)
```

**Architecture**:
- Entities are just IDs with label sets
- Components stored separately in indexed maps
- Labels indexed for O(1) lookup by key-value
- Spatial grid for fast 2D region queries
- No rendering, no time, no I/O

---

### 2. `core/surface.js` - Rendering Target Abstraction
**Purpose**: Abstract rendering targets with viewport support

**Key Classes**:
- `Surface` (abstract interface)
- `Canvas2DSurface` (HTML canvas implementation)
- `VT100Surface` (terminal character grid)
- `Viewport` (window onto surface with camera)
- `Camera2D` (simple 2D projection)
- `Frame` (render data container)
- `SurfaceRegistry` (global surface management)

**Rendering Pipeline**:
```
World → Frame (primitives) → Surface.render() → Blit to canvas/terminal
```

**Primitive Types**:
- line, rect, circle, polygon, text
- VT100: char, line (Bresenham), rect

**API**:
```javascript
surface.render(frame)
surface.clear()
surface.createViewport(name, rect, camera)
viewport.worldToViewport(x, y)
viewport.viewportToWorld(x, y)
```

---

### 3. `core/field.js` - Runtime Container
**Purpose**: Owns World + time/tick management + I/O + session state

**Key Features**:
- Owns World instance
- Fixed timestep simulation (60 FPS default)
- Time scaling and accumulation
- RNG state for deterministic replay
- System execution framework
- Input handler registry
- Session management (pause/resume/checkpoints)
- Serialization for save/load

**Lifecycle**:
```javascript
field.start()    // Begin simulation
field.tick(dt)   // Advance by delta time
field.pause()    // Pause simulation
field.resume()   // Resume simulation
field.stop()     // Stop simulation
field.reset()    // Reset to initial state
```

**Systems**:
```javascript
class MovementSystem extends System {
  execute(world, dt, field) {
    // Update entities with position + velocity
  }
}

field.addSystem(new MovementSystem())
```

**API**:
```javascript
field.world          // Access World instance
field.tick(deltaMs)  // Advance simulation
field.addSystem(system)
field.handleInput(type, event)
field.saveCheckpoint(name)
field.loadCheckpoint(name)
field.getMetrics()
field.serialize() / Field.deserialize(data)
```

---

## Redux State Refactored

### Old Structure (removed)
```javascript
state.games.instances      // Mixed game data + live instances
state.contexts             // Tier 2 lobby templates
state.fields.instances     // Tier 3 with live objects in Redux (❌)
state.cliPrompt            // Old mode-based prompt
```

### New Structure
```javascript
state.games.registry       // Immutable game definitions
state.worlds               // World metadata (not live instances)
state.fields               // Field metadata (not live instances)
state.surfaces             // Surface metadata
state.viewports            // Viewport metadata
state.cliPrompt            // Context stack for prompt
```

**Key Change**: Live instances (World, Field, Surface) are **NOT stored in Redux**. They live in memory registries:
- `fieldRegistry` (from core/field.js)
- `surfaceRegistry` (from core/surface.js)

Redux only stores **metadata** for UI display and persistence.

---

## Architecture Diagram

```
┌─────────────┐
│   Redux     │  ← Metadata only (UI state, configs)
│   Store     │
└─────────────┘
       ↓
┌─────────────┐
│  Registries │  ← Live instances in memory
├─────────────┤
│ fieldReg    │  → Map<id, Field>
│ surfaceReg  │  → Map<id, Surface>
└─────────────┘
       ↓
┌─────────────────────────────────────┐
│             Field                   │
│  ┌────────────┐    ┌─────────────┐ │
│  │   World    │    │   Systems   │ │
│  │            │    │             │ │
│  │ Entities   │    │ Movement    │ │
│  │ Components │    │ Collision   │ │
│  │ Labels     │    │ Scoring     │ │
│  │ Scenes     │    │ ...         │ │
│  └────────────┘    └─────────────┘ │
│                                     │
│  Time/Tick, RNG, Input, Session    │
└─────────────────────────────────────┘
       ↓ project
┌─────────────────────────────────────┐
│            Surface                  │
│  ┌────────────┐    ┌─────────────┐ │
│  │  Canvas    │    │  Viewports  │ │
│  │            │    │             │ │
│  │ Primitives │    │  Camera     │ │
│  │ Frame      │    │  Clipping   │ │
│  │ Blit       │    │  ...        │ │
│  └────────────┘    └─────────────┘ │
└─────────────────────────────────────┘
```

---

## Separation of Concerns

### World
- **Owns**: Entities, components, labels, scenes, spatial index
- **Does NOT own**: Time, rendering, I/O
- **Pure data**: Can be serialized/cloned

### Field
- **Owns**: World instance, time/tick, RNG, systems, input handlers, session state
- **Does NOT own**: Rendering
- **Lifecycle**: start → tick → pause/resume → stop → reset

### Surface
- **Owns**: Rendering target (canvas/terminal), viewports, cameras
- **Does NOT own**: Simulation state
- **Pure rendering**: Receives frames, blits to target

---

## Invariants

1. `World` has no side effects (pure data container)
2. `tick(field) → field` is pure w.r.t. world topology (except through systems)
3. `project(world, camera, viewport) → frame` is pure
4. `blit(frame, surface)` is the only side-effecting render step
5. Live instances NEVER stored in Redux (only metadata)
6. Redux → UI state, Registries → Simulation state

---

## Breaking Changes

### Removed
- `state.contexts` (Tier 2 lobby system)
- `state.fields.instances` (live game objects in Redux)
- `state.games.instances` (mixed metadata + live objects)

### Changed
- `state.games` now only has `registry` (immutable specs)
- `state.cliPrompt` uses context stack instead of mode
- Field/World lifecycle separated from Redux

---

## Migration Notes

### Old Code
```javascript
// Get field from Redux (❌ stored live object)
const field = store.getState().fields.instances[id]

// Dispatch to update field (❌ mutating live object in Redux)
store.dispatch(updateFieldTick(id, tick))
```

### New Code
```javascript
// Get field from registry (✓ not in Redux)
import { fieldRegistry } from './core/field.js'
const field = fieldRegistry.get(id)

// Update field directly (✓ not through Redux)
field.tick(deltaMs)

// Redux only for metadata
store.dispatch(updateFieldMetadata(id, { status: field.state.status }))
```

---

## Next Steps

**Phase 2**: Query Language
- Query parser (Prometheus/NATS-inspired)
- Query executor (label selectors, metrics, aggregations)
- Collection type (lazy evaluation, functional operations)

**Phase 3**: Decouple ECS
- Extract ECS from Quadrapong
- Remove Redux dependency
- Add label/tag support

**Phase 4**: Command Processor Refactor
- New command syntax (`get entities{type="ball"}`)
- Context-aware prompt with sigils
- Query commands

**Phase 5**: Surface Management
- Refactor game-manager.js
- Decouple rendering from Quadrapong
- Viewport system

**Phase 6**: VScope Integration
- Connect to World queries
- Remove gameInstance reference
- Query-based tracking

**Phase 7**: Type System
- Visual type system with sigils
- Syntax highlighting
- Type checking

---

## Testing

To test the new architecture:

```javascript
import { World } from './core/world.js'
import { Field } from './core/field.js'
import { Canvas2DSurface } from './core/surface.js'

// Create world
const world = new World({ name: 'test' })
const entity = world.createEntity({
  labels: { type: 'ball' }
})
world.addComponent(entity.id, 'position', { x: 100, y: 200 })

// Create field
const field = new Field({ world, name: 'test-field' })
field.start()
field.tick(16.67) // One frame at 60 FPS

// Create surface
const canvas = document.getElementById('main-canvas')
const surface = new Canvas2DSurface('main', 'Main', canvas)

// Render (Phase 5 will implement full pipeline)
const frame = new Frame()
// ... add primitives from world entities
surface.render(frame)
```

---

## Status: ✅ Phase 1 Complete

**Duration**: ~1 hour
**Files Created**: 3
**Files Modified**: 1
**Lines of Code**: ~1500
**Breaking Changes**: Yes (full refactor)
**Tests**: Manual (automated tests in Phase 8)

Ready for Phase 2: Query Language!
