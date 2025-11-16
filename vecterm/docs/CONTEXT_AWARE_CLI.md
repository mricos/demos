# Context-Aware CLI System

## Overview

The CLI now supports **context-aware command aliasing** where `vt100.*` commands resolve to different targets based on the current context (prompt).

## Architecture

### Context Types

```javascript
{
  vecterm: {
    prompt: 'vecterm>',
    vt100Target: 'vecterm.vt100',
    description: 'Terminal/system context'
  },
  game: {
    prompt: 'game>',
    vt100Target: 'game.vt100',
    description: 'Game engine context'
  },
  // Future contexts...
}
```

### Command Resolution

```
User types: vt100.glow 0.5

┌─────────────────┐
│ Current Context │
└────────┬────────┘
         │
    vecterm> ────────► vecterm.vt100.glow 0.5
    game>    ────────► game.vt100.glow 0.5
```

## Namespace Hierarchy

```
Global Commands
├─ help, clear, state, etc.
│
Vecterm (Terminal)
├─ vecterm.vt100.glow
├─ vecterm.vt100.scanlines
├─ vecterm.vt100.wave
├─ ...
│
Game (Canvas/Renderer)
├─ game.vt100.glow
├─ game.vt100.scanlines
├─ game.vt100.wave
├─ ...
│
Aliases (context-dependent)
└─ vt100.glow ──► resolves to vecterm.vt100.glow OR game.vt100.glow
   vt100.scanlines
   vt100.wave
   ...
```

## Usage Examples

### In Vecterm Context

```bash
vecterm> vt100.glow 0.8
✓ Vecterm terminal glow: 0.80

vecterm> vt100.status
=== Vecterm VT100 Effects ===
  Phosphor Glow: 0.80
  Scanlines: 0.15
  ...

# Explicit full path also works
vecterm> vecterm.vt100.glow 0.5
✓ Vecterm terminal glow: 0.50
```

### In Game Context

```bash
vecterm> play quadrapong
# Context switches to game

game> vt100.glow 1.5
✓ Game canvas glow: 1.50

game> vt100.status
=== Game VT100 Effects ===
  Phosphor Glow: 1.50
  Scanlines: 0.20
  ...

# Explicit access to terminal effects while in game
game> vecterm.vt100.glow 0.3
✓ Vecterm terminal glow: 0.30
```

### Context Switching

```bash
vecterm> play quadrapong
[Game starts - context switches to 'game']
game>

game> stop
[Game stops - context switches back to 'vecterm']
vecterm>

game> exit
[Returns to vecterm context]
vecterm>
```

## Implementation

### 1. Context Manager

```javascript
// core/context-manager.js
class ContextManager {
  constructor() {
    this.contexts = {
      vecterm: {
        prompt: 'vecterm>',
        vt100Target: 'vecterm.vt100'
      },
      game: {
        prompt: 'game>',
        vt100Target: 'game.vt100'
      }
    };
    this.currentContext = 'vecterm';
  }

  setContext(contextName) {
    if (this.contexts[contextName]) {
      this.currentContext = contextName;
      this.updatePrompt();
      return true;
    }
    return false;
  }

  getContext() {
    return this.currentContext;
  }

  resolveAlias(command) {
    // If command starts with 'vt100.', resolve to current context
    if (command.startsWith('vt100.')) {
      const target = this.contexts[this.currentContext].vt100Target;
      return command.replace('vt100.', `${target}.`);
    }
    return command;
  }

  updatePrompt() {
    const prompt = this.contexts[this.currentContext].prompt;
    const promptElement = document.getElementById('cli-prompt');
    if (promptElement) {
      promptElement.textContent = prompt;
    }
  }
}
```

### 2. Command Processor Integration

```javascript
// cli/command-processor.js
function processCLICommand(command) {
  const trimmed = command.trim();

  // Resolve aliases based on context
  const resolved = contextManager.resolveAlias(trimmed);

  // Process the resolved command
  processResolvedCommand(resolved);
}
```

### 3. Dual VT100 Effect Systems

```javascript
// Both use same config but target different elements

// vecterm.vt100.* → affects #cli-panel
vectermVT100Effects.setEffect('glow', 0.5);

// game.vt100.* → affects #main-canvas or game renderer
gameVT100Effects.setEffect('glow', 1.5);
```

## Two Separate VT100 Effect Engines

### Vecterm VT100 (Terminal)

**Target**: `#cli-panel` (the terminal)
**Purpose**: CRT effects for the terminal interface
**Commands**: `vecterm.vt100.*` (or `vt100.*` when in vecterm context)

```javascript
// modules/vt100-effects.js (already exists)
const vectermVT100Effects = new VT100Effects();
vectermVT100Effects.setEffect('glow', 0.5);

// Applies to:
// - CSS variables on #cli-panel
// - Terminal pseudo-elements (scanlines, raster wave)
// - Terminal border glow
```

### Game VT100 (Canvas/Renderer)

**Target**: `#main-canvas` or game renderer
**Purpose**: CRT effects for game graphics
**Commands**: `game.vt100.*` (or `vt100.*` when in game context)

```javascript
// modules/game-vt100-effects.js (NEW)
const gameVT100Effects = new VT100Effects();
gameVT100Effects.setEffect('glow', 1.5);

// Applies to:
// - Canvas renderer config
// - Post-processing effects
// - Shader parameters
```

## Synchronization

Each VT100 system has its own:
- Effect state
- Sliders (when context is active)
- Parameter registry
- Notification listeners

```
vecterm.vt100.glow ──► vectermVT100Effects ──► #cli-panel CSS
                                           ──► CLI sliders

game.vt100.glow ──────► gameVT100Effects ──────► Canvas renderer
                                           ──► Game sliders
```

## Tab Completion

Tab completion respects context:

```bash
vecterm> vt100.glow<TAB>
# Shows slider for vecterm.vt100.glow

game> vt100.glow<TAB>
# Shows slider for game.vt100.glow
```

## Quick Settings Integration

Quick Settings can show sliders from both contexts:

```
┌──────────────────────────┐
│ ⚡ Quick Settings      − │
├──────────────────────────┤
│ Terminal Effects         │
│ glow      [═○══] 0.30 ×  │  ← vecterm.vt100.glow
│ scanlines [═○══] 0.15 ×  │
│                          │
│ Game Effects             │
│ glow      [═○══] 1.50 ×  │  ← game.vt100.glow
│ bloom     [═○══] 0.80 ×  │
└──────────────────────────┘
```

## Context Triggers

### Enter Game Context

```javascript
// When game starts
function startGame() {
  contextManager.setContext('game');
  // Prompt changes to "game>"
}
```

### Return to Vecterm Context

```javascript
// When game stops
function stopGame() {
  contextManager.setContext('vecterm');
  // Prompt changes to "vecterm>"
}
```

### Manual Context Switch

```bash
vecterm> context game
Switched to game context
game>

game> context vecterm
Switched to vecterm context
vecterm>
```

## Migration Path

### Phase 1: Maintain Backward Compatibility
- Keep `vt100.*` working (resolves to `vecterm.vt100.*` by default)
- Add explicit `vecterm.vt100.*` commands
- Add `game.vt100.*` commands

### Phase 2: Add Context Manager
- Implement context switching
- Update prompt based on context
- Alias resolution

### Phase 3: UI Updates
- Show current context in UI
- Separate sliders by context in Quick Settings
- Context indicator in status bar

## Benefits

1. **Clarity**: Clear separation between terminal and game effects
2. **Flexibility**: Each context can have different effect values
3. **Scalability**: Easy to add new contexts (editor, debugger, etc.)
4. **Intuitive**: Prompt shows current context, commands resolve naturally
5. **Explicit**: Can always use full paths (`vecterm.vt100.*`, `game.vt100.*`)

## Example Session

```bash
vecterm> vt100.glow 0.3
✓ Terminal glow: 0.30

vecterm> vt100.status
=== Vecterm VT100 Effects ===
  Phosphor Glow: 0.30
  ...

vecterm> play quadrapong
[Loading game...]
[Game started - switched to game context]

game> vt100.glow 2.0
✓ Game glow: 2.00

game> vt100.status
=== Game VT100 Effects ===
  Phosphor Glow: 2.00
  ...

game> vecterm.vt100.status
=== Vecterm VT100 Effects ===
  Phosphor Glow: 0.30  ← Still set to original value
  ...

game> stop
[Game stopped - switched back to vecterm context]

vecterm> vt100.status
=== Vecterm VT100 Effects ===
  Phosphor Glow: 0.30  ← Preserved
  ...
```
