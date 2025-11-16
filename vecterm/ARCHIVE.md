# Archive - Deprecated Files

This file tracks deprecated code that has been superseded by refactored implementations.

## Quadrapong Refactor (2025-01-15)

### Archived Files

1. **Quadrapong.js** → **archive/Quadrapong.js**
   - Old monolithic IIFE implementation
   - Combined game logic, ECS, components, and systems in single file
   - ~750 lines
   - **Replaced by**: `games/QuadrapongGame.js` (uses core ECS system)

2. **games/quadrapong-controller.js** → **archive/quadrapong-controller.js**
   - Attempted ES6 module refactor
   - Command processor for game panel
   - Never fully integrated
   - **Replaced by**: Direct game instance methods in `QuadrapongGame.js`

3. **games/quadrapong-ecs.js** → **archive/quadrapong-ecs.js**
   - Separate ECS implementation for quadrapong
   - Duplicated core ECS functionality
   - **Replaced by**: Uses `core/ecs.js`, `core/components.js`, `core/systems.js`

### Rationale

**Why refactor?**
- **DRY**: Old approach had duplicate ECS implementations
- **Maintainability**: Core ECS now shared across all games
- **Clarity**: IIFE pattern preferred for self-contained games
- **Reusability**: Components and Systems now in shared library

**Architecture Decision: IIFE + Core Modules**
- Games use IIFE pattern for encapsulation
- Core ECS/Components/Systems in global scope (non-module scripts)
- Games access core via `window.ECS`, `window.Components`, `window.Systems`
- No build step required, works directly in browser

### Migration Path

**Old approach:**
```javascript
// Everything in one file
const Quadrapong = (() => {
  class ECS { ... }
  const Components = { ... }
  const Systems = { ... }
  class Game { ... }
  return { create: ... }
})();
```

**New approach:**
```javascript
// Core shared (core/*.js)
class ECS { ... }  // window.ECS
const Components = { ... }  // window.Components
const Systems = { ... }  // window.Systems

// Game uses core (games/QuadrapongGame.js)
const QuadrapongGame = (() => {
  class Game {
    constructor(store, canvas) {
      this.ecs = new window.ECS(store);  // Use core ECS
    }
  }
  return { create: ... }
})();
```

## Benefits

✅ Single source of truth for ECS architecture
✅ Games remain self-contained via IIFE
✅ No module bundler required
✅ Easy to add new games using same pattern
✅ Core ECS improvements benefit all games

## To Move Files to Archive

```bash
mkdir -p archive/games
mv Quadrapong.js archive/
mv games/quadrapong-controller.js archive/games/
mv games/quadrapong-ecs.js archive/games/
```
