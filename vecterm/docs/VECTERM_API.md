# Vecterm 3-Tier API Specification

**Status:** Implemented (Core Complete)
**Version:** 1.0.0
**Date:** 2025-10-31

---

## Overview

Vecterm implements a **3-tier semantic architecture** for managing game instances:

1. **Games** (Tier 1) - Immutable definitions/factories
2. **Contexts** (Tier 2) - Customizable templates in the lobby
3. **Fields** (Tier 3) - Running instances on the playing field

This architecture enables:
- Template-based instantiation
- Multi-instance support with isolated state
- Runtime customization without modifying definitions
- Context-aware CLI with dynamic prompts

### 3D-First Philosophy

**Every context has a 3D engine behind it.** Vecterm is fundamentally a 3D wireframe rendering system:
- **3D mode** (default) - Full 3D vecterm rendering with camera controls
- **2D mode** - Isometric projection of the 3D scene (special case)

When you create a field instance, it defaults to 3D unless you explicitly request 2D.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         TIER 1: GAMES                        │
│                    (Immutable Definitions)                   │
├─────────────────────────────────────────────────────────────┤
│  games.registry = {                                         │
│    'quadrapong': {                                          │
│      id: 'quadrapong',                                      │
│      provenance: 'built-in',      // 'built-in'|'local'|'s3'│
│      version: '1.0.0',                                      │
│      factory: Quadrapong.create   // Game constructor       │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                            ▼  load
┌─────────────────────────────────────────────────────────────┐
│                       TIER 2: CONTEXTS                       │
│                   (Templates in Lobby)                       │
├─────────────────────────────────────────────────────────────┤
│  contexts = {                                               │
│    'quadrapong': {                                          │
│      id: 'quadrapong',                                      │
│      gameId: 'quadrapong',                                  │
│      customizations: {           // User modifications      │
│        ball: { speed: 12 },                                 │
│        paddle: { ai: false }                                │
│      },                                                     │
│      createdAt: '2025-10-31T14:00:00Z'                      │
│    },                                                       │
│    'chaos-mode': {              // Named variant            │
│      id: 'chaos-mode',                                      │
│      gameId: 'quadrapong',                                  │
│      customizations: {                                      │
│        ball: { speed: random(10, 20) }                      │
│      }                                                      │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                            ▼  play
┌─────────────────────────────────────────────────────────────┐
│                        TIER 3: FIELDS                        │
│                   (Running Instances)                        │
├─────────────────────────────────────────────────────────────┤
│  fields.instances = {                                       │
│    'quadrapong-001': {                                      │
│      id: 'quadrapong-001',                                  │
│      contextId: 'quadrapong',                               │
│      gameId: 'quadrapong',                                  │
│      instance: <Quadrapong>,   // Actual game object        │
│      status: 'running',         // 'running'|'paused'       │
│      mode: '3d',                // Default: 3D wireframe    │
│      startedAt: '2025-10-31T14:05:00Z'                      │
│    },                                                       │
│    'epic-battle': {             // Custom name              │
│      id: 'epic-battle',                                     │
│      contextId: 'chaos-mode',                               │
│      gameId: 'quadrapong',                                  │
│      instance: <Quadrapong>,                                │
│      status: 'running',                                     │
│      mode: '3d'                 // 3D vecterm rendering     │
│    },                                                       │
│    'iso-view': {                // 2D isometric             │
│      id: 'iso-view',                                        │
│      contextId: 'quadrapong',                               │
│      gameId: 'quadrapong',                                  │
│      instance: <Quadrapong>,                                │
│      status: 'running',                                     │
│      mode: '2d'                 // Isometric projection     │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## CLI Commands

### Namespace Exploration

```bash
# List top-level namespaces
vecterm> ls
fields/      2 instances
games/       1 available
contexts/    2 loaded
s3/          connected
help

# List specific namespace
vecterm> ls fields
fields.quadrapong-001  [running]  from: contexts.quadrapong
fields.epic-battle     [running]  from: contexts.chaos-mode

vecterm> ls games
games.quadrapong  [built-in]  4-player pong...  v1.0.0

vecterm> ls contexts
contexts.quadrapong   [from: games.quadrapong built-in]
contexts.chaos-mode   [from: games.quadrapong built-in]  customized: 1 params

vecterm> ls s3
(requires login)
```

### Context Management (Tier 2)

```bash
# Load game into context
vecterm> load <game> [as <name>]

# Examples:
vecterm> load quadrapong
Context created: contexts.quadrapong

vecterm> load quadrapong as chaos-mode
Context created: contexts.chaos-mode

# Enter context edit mode
vecterm> edit <context>
vecterm[ctx:quadrapong]>
[PLACEHOLDER] Context customization not yet implemented
vecterm[ctx:quadrapong]> exit

# Remove context from lobby
vecterm> unload <context>
Context unloaded: chaos-mode
```

### Field Management (Tier 3)

```bash
# Create field instance from context
vecterm> play <context> [as <name>] [3d|2d]

# Examples (defaults to 3D):
vecterm> play quadrapong
Instance created: fields.quadrapong-001
Playing Quadrapong in 3D VECTERM mode...

vecterm> play quadrapong as epic-battle
Instance created: fields.epic-battle
Playing Quadrapong in 3D VECTERM mode...

vecterm> play quadrapong as iso-view 2d
Instance created: fields.iso-view
Playing Quadrapong in 2D ISOMETRIC mode...

vecterm> play chaos-mode
Instance created: fields.chaos-mode-001

# Enter field instance
vecterm> use <field>
vecterm[epic-battle]>
[PLACEHOLDER] Field interaction not yet implemented
vecterm[epic-battle]> exit

# Stop field instance
vecterm> stop [field]
Field stopped: epic-battle

# Auto-infer if only one field running
vecterm> stop
Field stopped: quadrapong-001

# Auto-stop current field if in context
vecterm[chaos-mode-001]> stop
Field stopped: chaos-mode-001
vecterm>
```

### Navigation

```bash
# Exit context/field
vecterm[ctx:quadrapong]> exit
Exited context edit: quadrapong
vecterm>

vecterm[epic-battle]> exit
Exited field: epic-battle
vecterm>
```

### Authentication & S3

```bash
# Login (enables S3 access)
vecterm> login <username> <password>
Authenticated as: mricos
S3 access enabled.
vecterm[mricos]>

# Logout
vecterm[mricos]> logout
Logged out.
vecterm>

# S3 operations (placeholders)
vecterm[mricos]> ls s3
[PLACEHOLDER] S3 listing not yet implemented
```

---

## Dynamic Prompt States

The CLI prompt reflects your current context:

```bash
vecterm>                      # Top-level, not logged in
vecterm[mricos]>              # Logged in as mricos
vecterm[ctx:quadrapong]>      # Editing context template
vecterm[epic-battle]>         # In field instance
vecterm[mricos:test]>         # Logged in + in field
vecterm[test:paused]>         # Field with state modifier
vecterm[mricos:test:3d]>      # All modifiers combined
```

---

## Redux State Schema

```javascript
{
  // Authentication & S3
  auth: {
    isLoggedIn: false,
    username: null
  },
  s3: {
    connected: false,
    bucket: 'vecterm-games',
    region: 'nyc3',
    endpoint: 'nyc3.digitaloceanspaces.com'
  },

  // CLI Prompt State
  cliPrompt: {
    mode: 'toplevel',        // 'toplevel' | 'context' | 'field'
    username: null,          // Set when logged in
    contextId: null,         // Set when editing context
    fieldId: null,           // Set when in field
    fieldState: null         // Optional modifier: 'paused', '3d', etc.
  },

  // Tier 1: Game Definitions
  games: {
    registry: {
      'quadrapong': {
        id: 'quadrapong',
        name: 'Quadrapong',
        description: '4-player pong with ECS architecture',
        version: '1.0.0',
        provenance: 'built-in',
        factory: Quadrapong.create
      }
    },
    activeGame: null,        // Currently active game ID
    instances: {}            // Game instances by ID
  },

  // Tier 2: Contexts (Templates)
  contexts: {
    'quadrapong': {
      id: 'quadrapong',
      gameId: 'quadrapong',
      customName: null,
      customizations: {},
      createdAt: '2025-10-31T14:00:00Z'
    }
  },

  // Tier 3: Fields (Instances)
  fields: {
    instances: {
      'quadrapong-001': {
        id: 'quadrapong-001',
        contextId: 'quadrapong',
        gameId: 'quadrapong',
        instance: null,      // Actual game object
        status: 'running',
        mode: '3d',          // Default: 3D (2D is isometric projection)
        startedAt: '2025-10-31T14:05:00Z'
      }
    },
    nextInstanceNumber: {
      'quadrapong': 2
    }
  }
}
```

---

## Redux Actions

### Context Management

```javascript
// Create context from game
store.dispatch(Actions.createContext(contextId, gameId, customName));

// Update context customizations
store.dispatch(Actions.updateContext(contextId, { ball: { speed: 12 } }));

// Delete context
store.dispatch(Actions.deleteContext(contextId));

// Enter/exit context edit mode
store.dispatch(Actions.enterContextEdit(contextId));
store.dispatch(Actions.exitContextEdit());
```

### Field Management

```javascript
// Create field instance
store.dispatch(Actions.createField(fieldId, contextId, gameId, customName));

// Update field properties
store.dispatch(Actions.updateField(fieldId, { status: 'paused' }));

// Stop field
store.dispatch(Actions.stopField(fieldId));

// Enter/exit field
store.dispatch(Actions.enterField(fieldId));
store.dispatch(Actions.exitField());
```

### Prompt State

```javascript
// Set CLI prompt state
store.dispatch(Actions.setCliPromptState({
  mode: 'field',
  fieldId: 'epic-battle',
  fieldState: '3d'
}));
```

### Authentication

```javascript
// Login (also connects S3)
store.dispatch(Actions.login(username));

// Logout (also disconnects S3)
store.dispatch(Actions.logout());
```

---

## Game Integration API

Games integrate with the 3-tier system through a simple factory pattern:

### Tier 1: Game Registration

```javascript
// games.registry entry
{
  id: 'mygame',
  name: 'My Game',
  description: 'A cool game',
  version: '1.0.0',
  provenance: 'built-in',
  factory: MyGame.create  // Factory function
}
```

### Tier 2: Context Customization Schema

```javascript
// Game should define customizable parameters
{
  customizations: {
    ball: {
      speed: 6,        // Default from game
      size: 20
    },
    paddle: {
      length: 150,
      speed: 8,
      ai: {
        enabled: true,
        difficulty: 1.0
      }
    },
    effects: {
      glow: 0.3,
      scanlines: 0.15
    }
  }
}
```

### Tier 3: Instance Creation

```javascript
// Factory function signature
MyGame.create(store, canvas, mode = '2d') {
  return new MyGame(store, canvas, mode);
}

// Game instance API
class MyGame {
  constructor(store, canvas, mode) {
    this.store = store;
    this.canvas = canvas;
    this.mode = mode;
  }

  initialize() {
    // Set up game from context customizations
    const state = this.store.getState();
    // Apply customizations...
    return this;
  }

  start() {
    // Begin game loop
    return this;
  }

  stop() {
    // Clean up
    return this;
  }

  pause() { /* ... */ }
  resume() { /* ... */ }
}
```

---

## Example Workflows

### Simple: Load and Play

```bash
vecterm> load quadrapong
Context created: contexts.quadrapong

vecterm> play quadrapong
Instance created: fields.quadrapong-001
Playing Quadrapong in 3D VECTERM mode...

vecterm> stop
Field stopped: quadrapong-001
```

### Advanced: Custom Context with Multiple Instances

```bash
vecterm> load quadrapong as chaos
Context created: contexts.chaos

vecterm> edit chaos
vecterm[ctx:chaos]> # Customize parameters here
vecterm[ctx:chaos]> exit

vecterm> play chaos as game1
Instance created: fields.game1
Playing Quadrapong in 3D VECTERM mode...

vecterm> play chaos as game2 2d
Instance created: fields.game2
Playing Quadrapong in 2D ISOMETRIC mode...

vecterm> ls fields
fields.game1  [running]  from: contexts.chaos
fields.game2  [running]  from: contexts.chaos

vecterm> use game1
vecterm[game1]> # Interact with game1
vecterm[game1]> exit

vecterm> stop game1
Field stopped: game1

vecterm> stop game2
Field stopped: game2
```

### With Authentication

```bash
vecterm> login mricos password
Authenticated as: mricos
S3 access enabled.

vecterm[mricos]> ls s3
[PLACEHOLDER] S3 listing

vecterm[mricos]> load quadrapong
Context created: contexts.quadrapong

vecterm[mricos]> play quadrapong
Instance created: fields.quadrapong-001

vecterm[mricos:quadrapong-001]> # Automatically entered field

vecterm[mricos:quadrapong-001]> stop
Field stopped: quadrapong-001

vecterm[mricos]> logout
Logged out.

vecterm>
```

---

## Planned Features (Placeholders)

### Context Customization Commands

```bash
vecterm[ctx:chaos]> ball.speed = 15
vecterm[ctx:chaos]> paddle.ai.enabled = false
vecterm[ctx:chaos]> effects.glow = 0.8
vecterm[ctx:chaos]> save
```

### Field Interaction Commands

```bash
vecterm[epic-battle]> ball.velocity
{ x: 5, y: -3, z: 0 }

vecterm[epic-battle]> ball.velocity.x = 10
Updated: ball.velocity.x = 10

vecterm[epic-battle]> pause
Instance paused

vecterm[epic-battle:paused]> resume
Instance resumed
```

### S3 Operations

```bash
vecterm[mricos]> s3.save fields.epic-battle "my-best-game"
Saved to S3: my-best-game-2025-10-31.json

vecterm[mricos]> s3.load "my-best-game-2025-10-31"
Loaded into: contexts.my-best-game

vecterm[mricos]> s3.upload.game ./path/to/game.js "my-game" public
Uploaded: s3/games/my-game.js [shared: public]
```

---

## API Design Principles

1. **Three-Tier Separation**: Games → Contexts → Fields
2. **Immutable Definitions**: Game definitions never change
3. **Template Inheritance**: Fields inherit from contexts
4. **Multi-Instance Support**: Multiple fields from same context
5. **Context-Aware CLI**: Prompt reflects current location
6. **Explicit Navigation**: `use`, `edit`, `exit` for movement
7. **Smart Inference**: Auto-detect field when unambiguous
8. **Provenance Tracking**: Know where games came from
9. **3D-First Architecture**: Every context has a 3D engine; 2D is isometric
10. **Future-Ready**: S3 and network placeholders in place

---

## Next Steps

- [ ] Implement context customization commands
- [ ] Implement field interaction commands
- [ ] Add S3 integration (Digital Ocean Spaces)
- [ ] Add cross-game communication API
- [ ] Add game variants and behavior loops
- [ ] Implement ASCII export for fields
- [ ] Add replay/time-travel for fields

---

**End of API Specification**
