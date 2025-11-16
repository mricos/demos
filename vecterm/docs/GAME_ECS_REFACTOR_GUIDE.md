# Game ECS Refactoring Implementation Guide

## Overview

This guide documents the ECS (Entity Component System) refactoring for Vecterm, transforming demos into a unified game system with 2D/3D view mode switching and entity parameter controls.

## What's Been Completed

### ✅ Phase 1: Core ECS Architecture (DONE)

1. **ECS Core** (`core/ecs.js`)
   - Extracted from Quadrapong into reusable module
   - Entity lifecycle management (create, update, delete, query)
   - Namespace support for multiplayer
   - System execution pipeline

2. **Component Library** (`core/components.js`)
   - **Unified Transform Component**: Supports both 2D and 3D with `is3D` flag
   - **RotationBehavior Component**: Per-entity rotation control with speed and axis
   - **ParameterSet Component**: Exposes entity parameters for slider/MIDI control
   - **ViewMode Component**: Defines geometry mapping for 2D/3D switching
   - Backward compatible with legacy 2D components (Position, Velocity, AABB)

3. **System Library** (`core/systems.js`)
   - **RotationSystem**: Updates entity rotation based on RotationBehavior
   - **ViewModeAdapter**: Transforms entities when global view mode changes
   - **ParameterSync**: Syncs entity parameters to component values
   - Legacy systems preserved: Movement, PaddleAI, Collision, Scoring

4. **Redux State** (`core/reducers.js`)
   - Added `viewMode: '2d' | '3d'` - global rendering mode
   - Added `parameterConnections` - tracks slider/quick menu/MIDI connections
   - New actions: SET_VIEW_MODE, TOGGLE_VIEW_MODE, CONNECT_PARAMETER, etc.

5. **CLI Command** (`cli/command-processor.js`)
   - `viewmode` command: `viewmode [2d|3d|toggle]`
   - Shows current mode when called without arguments

## What Needs To Be Done

### 🔨 Phase 2: Parameter Control System (IN PROGRESS)

#### Task 1: Fix Slider Connection Tracking (Lightning Bolt Bug)

**Problem**: When a slider is removed from a quick menu, the CLI slider still shows the lightning bolt indicator (connection status is not synced).

**Files to Modify**:
- `cli/interactive-controls.js` - CLI slider component
- `cli/quick-settings.js` - Quick menu slider removal

**Implementation**:

```javascript
// In interactive-controls.js

function updateSliderConnectionStatus(sliderId) {
  const state = store.getState();
  const connectionId = `slider:${sliderId}`;
  const connection = state.parameterConnections[connectionId];

  // Check if slider has any active connections
  const hasCliConnection = connection && connection.cliSlider;
  const hasQuickMenu = connection && connection.quickMenu;
  const hasMidiCC = connection && connection.midiCC;

  const isConnected = hasQuickMenu || hasMidiCC;

  // Update lightning bolt visibility
  const slider = document.querySelector(`[data-slider-id="${sliderId}"]`);
  const indicator = slider?.querySelector('.connection-indicator');
  if (indicator) {
    indicator.classList.toggle('active', isConnected);
  }
}

// Call this when:
// - Slider is added to quick menu
// - Slider is removed from quick menu
// - MIDI CC is mapped/unmapped
```

**Testing**:
1. Create slider in CLI
2. Add to quick menu (swipe left) - lightning bolt should appear
3. Remove from quick menu - lightning bolt should disappear
4. Map MIDI CC - lightning bolt should reappear

---

#### Task 2: Add Swipe-Left Gesture to Quick Menu 2

**Current**: Sliders don't have swipe gesture support
**Goal**: Swipe left on CLI slider → adds to Quick Menu 2

**Files to Modify**:
- `cli/interactive-controls.js` - Add gesture handler

**Implementation**:

```javascript
// In interactive-controls.js

function initializeSliderGestures(sliderElement, sliderId) {
  let touchStartX = 0;
  let touchEndX = 0;

  sliderElement.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  sliderElement.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipeGesture(sliderId);
  });

  function handleSwipeGesture(sliderId) {
    const swipeThreshold = 50; // pixels
    const swipeDistance = touchEndX - touchStartX;

    if (swipeDistance < -swipeThreshold) {
      // Swipe left - add to Quick Menu 2
      addToQuickMenu(sliderId, 2);

      // Dispatch connection action
      store.dispatch({
        type: 'CONNECT_PARAMETER',
        payload: {
          connectionId: `slider:${sliderId}`,
          connectionType: 'quickMenu',
          connectionData: 2  // Quick Menu number
        }
      });

      // Show feedback
      showToast('Added to Quick Menu 2');
    }
  }
}

function addToQuickMenu(sliderId, menuNumber) {
  const state = store.getState();
  const slider = state.cliSliders[sliderId];

  // Dispatch to quick menu system
  window.quickSettings?.addSlider({
    id: sliderId,
    label: slider.label,
    value: slider.value,
    min: slider.min,
    max: slider.max,
    menuNumber: menuNumber
  });
}
```

---

#### Task 3: Add Dual Quick Menu Support

**Current**: Only one quick menu exists
**Goal**: Two quick menus (1: VT100 effects, 2: Game/entity parameters)

**Files to Modify**:
- `cli/quick-settings.js`
- `style.css`

**Implementation**:

```javascript
// In quick-settings.js

class QuickSettings {
  constructor() {
    this.menus = {
      1: { sliders: [], visible: true },   // VT100 effects
      2: { sliders: [], visible: true }    // Game/entity parameters
    };
  }

  addSlider(config) {
    const menuNumber = config.menuNumber || 1;
    this.menus[menuNumber].sliders.push(config);
    this.render(menuNumber);
  }

  removeSlider(sliderId, menuNumber) {
    const menu = this.menus[menuNumber];
    menu.sliders = menu.sliders.filter(s => s.id !== sliderId);

    // Disconnect parameter
    store.dispatch({
      type: 'DISCONNECT_PARAMETER',
      payload: {
        connectionId: `slider:${sliderId}`,
        connectionType: 'quickMenu'
      }
    });

    this.render(menuNumber);
  }

  render(menuNumber) {
    const menu = this.menus[menuNumber];
    const container = document.querySelector(`#quick-menu-${menuNumber}`);

    container.innerHTML = '';
    menu.sliders.forEach(slider => {
      const el = this.createSliderElement(slider);
      container.appendChild(el);
    });
  }
}
```

**CSS**:
```css
#quick-menu-1 {
  position: fixed;
  right: 20px;
  top: 60px;
  width: 200px;
}

#quick-menu-2 {
  position: fixed;
  right: 20px;
  top: 300px;  /* Below menu 1 */
  width: 200px;
}

.quick-menu-header {
  font-weight: bold;
  padding: 8px;
  background: #222;
  border-bottom: 1px solid #00ff00;
}
```

---

### 🎮 Phase 3: Game Refactoring

#### Task 4: Refactor Spinning Cube to Use ECS

**Current**: `games/spinning-cube.js` uses custom code
**Goal**: Convert to ECS with entity parameters

**Implementation**:

```javascript
// games/spinning-cube.js

import ECS from '../core/ecs.js';
import Components from '../core/components.js';
import Systems from '../core/systems.js';

class SpinningCubeGame {
  constructor(store, canvas) {
    this.ecs = new ECS(store);
    this.canvas = canvas;

    // Add systems
    this.ecs.addSystem(Systems.RotationSystem);
    this.ecs.addSystem(Systems.ViewModeAdapter);
    this.ecs.addSystem(Systems.ParameterSync);
  }

  initialize() {
    // Create cube entity
    this.cubeId = this.ecs.createEntity({
      transform: Components.Transform({
        is3D: true,
        position: new VectermMath.Vector3(0, 0, 0),
        rotation: new VectermMath.Vector3(0, 0, 0),
        scale: new VectermMath.Vector3(1, 1, 1)
      }),
      mesh3D: Components.Mesh3D(VectermMesh.cube(1), '#00ff00'),
      renderable: Components.Renderable('mesh', '#00ff00', '3d'),
      rotationBehavior: Components.RotationBehavior({
        speed: 1.0,
        axis: { x: true, y: true, z: false },
        enabled: true
      }),
      parameterSet: Components.ParameterSet({
        rotationSpeed: {
          value: 1.0,
          min: 0,
          max: 5,
          label: 'Rotation Speed',
          step: 0.1
        },
        size: {
          value: 1.0,
          min: 0.5,
          max: 3,
          label: 'Cube Size',
          step: 0.1
        }
      }),
      viewMode: Components.ViewMode(['2d', '3d'], {
        '2d': 'square',
        '3d': 'cube'
      })
    });
  }

  update(deltaTime) {
    this.ecs.update(deltaTime, this.canvas);
  }

  // Expose parameters for CLI/UI control
  getParameterSchema() {
    const entity = this.ecs.getEntityById(this.cubeId);
    return entity?.parameterSet?.parameters || {};
  }

  setParameter(name, value) {
    const entity = this.ecs.getEntityById(this.cubeId);
    if (entity && entity.parameterSet.parameters[name]) {
      entity.parameterSet.parameters[name].value = value;
      this.ecs.addComponent(this.cubeId, 'parameterSet', entity.parameterSet);
    }
  }
}

export default SpinningCubeGame;
```

---

#### Task 5: Update Game Manager for 'load game' Command

**Current**: `vecterm.demo` command
**Goal**: `load <gameName>` command

**Files to Modify**:
- `games/game-manager.js`
- `cli/command-processor.js`

**Implementation**:

```javascript
// In command-processor.js

} else if (cmd === 'load') {
  const gameName = args[0];

  if (!gameName) {
    cliLog('Usage: load <gameName>', 'error');
    cliLog('Available games:', 'info');
    const games = store.getState().games.registry;
    Object.keys(games).forEach(id => {
      cliLog(`  - ${id}`, 'info');
    });
    return;
  }

  const state = store.getState();
  const game = state.games.registry[gameName];

  if (!game) {
    cliLog(`Game not found: ${gameName}`, 'error');
    return;
  }

  // Load game into terminal view
  gameControls.loadGame(gameName);
  cliLog(`Loaded game: ${game.name}`, 'success');
  cliLog('Type "play" to start, or use parameter controls', 'info');
}
```

---

#### Task 6: Wire Entity Parameters to MIDI

**Goal**: MIDI CC controls entity parameters

**Files to Modify**:
- `modules/midi/midi-mapper.js`

**Implementation**:

```javascript
// In midi-mapper.js

function handleMidiControlChange(device, cc, value) {
  const state = store.getState();

  // Find parameter connection for this MIDI CC
  const connectionId = Object.keys(state.parameterConnections).find(id => {
    const conn = state.parameterConnections[id];
    return conn.midiCC && conn.midiCC.device === device && conn.midiCC.cc === cc;
  });

  if (connectionId) {
    const conn = state.parameterConnections[connectionId];
    const { entityId, parameter } = conn;

    // Get entity from ECS
    const entity = window.activeGame?.ecs.getEntityById(entityId);
    if (entity && entity.parameterSet?.parameters[parameter]) {
      const param = entity.parameterSet.parameters[parameter];

      // Map MIDI value (0-127) to parameter range
      const normalizedValue = value / 127;
      const mappedValue = param.min + (param.max - param.min) * normalizedValue;

      // Update parameter
      window.activeGame.setParameter(parameter, mappedValue);

      cliLog(`MIDI CC ${cc}: ${parameter} = ${mappedValue.toFixed(2)}`, 'info');
    }
  }
}
```

---

## Key Concepts

### Entity Component System (ECS)

**Entities** are just IDs with attached components:
```javascript
{
  id: 'cube-1',
  transform: { is3D: true, position: {...}, rotation: {...} },
  rotationBehavior: { speed: 1.0, axis: { x: true, y: true } },
  parameterSet: { parameters: { rotationSpeed: {...} } }
}
```

**Components** are pure data (no logic):
```javascript
RotationBehavior({ speed: 1.0, axis: { x: true, y: true, z: false } })
```

**Systems** contain all the logic:
```javascript
RotationSystem.execute(ecs, deltaTime) {
  // Query entities with required components
  const entities = ecs.query('transform', 'rotationBehavior');

  // Update each entity
  entities.forEach(entity => {
    // Calculate new rotation
    // Update transform component
  });
}
```

### View Mode Switching

1. User calls `viewmode 3d`
2. Redux state updated: `viewMode: '3d'`
3. ViewModeAdapter system executes
4. Entities with ViewMode component transform:
   - 2D square → 3D cube
   - Position coordinates normalized
   - Renderable component updated

### Parameter Connection Flow

```
CLI Slider Creation
  ↓
User swipes left
  ↓
Dispatch CONNECT_PARAMETER
  ↓
parameterConnections['slider:id'] = {
  entityId: 'cube-1',
  parameter: 'rotationSpeed',
  quickMenu: 2
}
  ↓
Quick Menu 2 displays slider
  ↓
User adjusts slider
  ↓
ParameterSync system updates entity
  ↓
RotationSystem uses new value
```

## Testing Checklist

### ECS Core
- [ ] Create entity with components
- [ ] Query entities by components
- [ ] Update entity components
- [ ] Remove entity
- [ ] Systems execute in order
- [ ] Namespace isolation works

### View Mode
- [ ] `viewmode` command shows current mode
- [ ] `viewmode 2d` switches to 2D
- [ ] `viewmode 3d` switches to 3D
- [ ] `viewmode toggle` alternates
- [ ] Entities transform correctly
- [ ] Parameters preserved during switch

### Parameters
- [ ] Create CLI slider
- [ ] Swipe left adds to Quick Menu 2
- [ ] Lightning bolt shows connection
- [ ] Remove from quick menu clears bolt
- [ ] MIDI CC controls parameter
- [ ] Parameter changes affect entity

### Games
- [ ] `load spinning-cube` loads game
- [ ] Game runs in 2D mode
- [ ] Game runs in 3D mode
- [ ] Parameters controllable
- [ ] Multiple games can load
- [ ] Games isolated (no conflicts)

## Future Enhancements

1. **Parameter Presets**: Save/load parameter configurations
2. **Animation Curves**: Keyframe entity parameters over time
3. **Multi-entity Control**: One slider controls multiple entities
4. **Parameter Expressions**: Link parameters with math (size = rotationSpeed * 2)
5. **Network Sync**: Replicate entity parameters in multiplayer
6. **Touch Gestures**: Swipe right to remove, pinch to scale, etc.
7. **Parameter Recording**: Record parameter changes for playback

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                   Redux State                    │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────┐│
│  │entities │  │ viewMode │  │parameterConn... ││
│  └─────────┘  └──────────┘  └─────────────────┘│
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│                  ECS Systems                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │Rotation  │  │ViewMode  │  │ParameterSync  │ │
│  │System    │  │Adapter   │  │System         │ │
│  └──────────┘  └──────────┘  └───────────────┘ │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│                   Entities                       │
│  ┌──────────────────────────────────────────┐  │
│  │ Entity: cube-1                            │  │
│  │   • Transform (3D)                        │  │
│  │   • Mesh3D (cube mesh)                    │  │
│  │   • RotationBehavior (speed, axis)        │  │
│  │   • ParameterSet (exposed controls)       │  │
│  │   • ViewMode (2D ↔ 3D mapping)           │  │
│  └──────────────────────────────────────────┘  │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│              UI Control Surfaces                 │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐ │
│  │CLI       │  │Quick Menu │  │MIDI          │ │
│  │Sliders   │  │1 & 2      │  │Controller    │ │
│  └──────────┘  └───────────┘  └──────────────┘ │
└─────────────────────────────────────────────────┘
```

## Conclusion

The ECS refactoring provides:
- **Unified Architecture**: All games use same ECS core
- **Flexible Rendering**: Easy 2D ↔ 3D switching
- **Rich Control**: CLI, quick menus, MIDI all integrated
- **Extensibility**: Add components/systems without changing games
- **Clean Separation**: Data (components) vs Logic (systems)

This foundation enables rapid game development with consistent parameter control and rendering flexibility.
