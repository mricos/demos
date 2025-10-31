# CUI Framework (Cell UI)

**A modular, vanilla JavaScript framework for building interactive physics simulations and data-driven applications with Redux-lite state management and hot-reload support.**

Version: 0.2.0 (Refactored)
Build Date: 2025-10-30

---

## What's New in v0.2.0

### ✨ Major Refactoring

- **Redux-lite State Management** - Actions, reducers, single state tree
- **Plugin Architecture** - Terminal, WikiPopup, Meta moved to plugins
- **Clean Separation** - Framework core vs demo-specific code
- **Improved Structure** - Organized into core, components, plugins, utils
- **Backwards Compatible** - Old `CUI.State.set()` still works

---

## Quick Start

### Framework Test Page

```bash
# Open in browser
open cui/index.html
```

### SIR Demo (Redux-lite example)

```bash
# Open in browser
open demos/sir/sir.html
```

---

## Architecture

### Directory Structure

```
cui/                          # Core framework (reusable)
  core/
    cui-core.js              # State, events, DOM, utils
    cui-lifecycle.js         # Module system
    cui-tokens.js            # Design tokens
  components/
    cui-tabs.js              # Tab system
    cui-fab.js               # Floating action buttons
    cui-behaviors.js         # Sliders, dropdowns, etc.
  plugins/
    cui-terminal.js          # CLI terminal
    cui-wikipopup.js         # Wikipedia integration
    cui-command-manager.js   # Command routing
    cui-meta.js              # Self-documentation
  utils/
    cui-redux-lite.js        # Redux-lite state management
  css/
    cui-base.css             # Base styles & tokens
    cui-components.css       # Component styles
    cui-terminal.css         # Terminal CRT effects
  index.html                 # Framework test page

demos/
  sir/                       # SIR epidemic demo
    sir.html                 # Demo page
    sir.js                   # Redux-style simulation
    sir.css                  # Demo-specific styles
    sir.json                 # Manifest
```

---

## Core Modules

### 1. cui-core.js - Foundation

**State Management (Legacy)**
```javascript
CUI.State.set('key', value);
CUI.State.get('key');
CUI.State.subscribe('key', callback);
```

**Event Bus**
```javascript
CUI.Events.on('eventName', callback);
CUI.Events.emit('eventName', data);
CUI.Events.once('eventName', callback);
```

**DOM Utilities**
```javascript
CUI.DOM.$('elementId');
CUI.DOM.$$('selector');
CUI.DOM.create('div', { class: 'foo' }, 'content');
```

**Utilities**
```javascript
CUI.Utils.clamp(value, min, max);
CUI.Utils.debounce(func, wait);
CUI.Utils.throttle(func, limit);
CUI.Utils.clone(obj);
```

### 2. cui-redux-lite.js - State Management

**Register Reducer**
```javascript
CUI.Redux.reducer('simulation', (state = initialState, action) => {
  switch (action.type) {
    case 'START':
      return { ...state, running: true };
    case 'PAUSE':
      return { ...state, running: false };
    default:
      return state;
  }
}, initialState);
```

**Dispatch Actions**
```javascript
CUI.dispatch({ type: 'START' });
CUI.dispatch({ type: 'UPDATE_PARAMS', payload: { speed: 90 } });
```

**Subscribe to Changes**
```javascript
CUI.Redux.subscribe((state, prevState, action) => {
  console.log('State changed:', action.type);
  updateUI(state);
});
```

**Get State**
```javascript
const state = CUI.getState();          // Entire state tree
const sim = CUI.getState('simulation'); // Specific slice
```

**Debug Helpers**
```javascript
CUI.Redux.getHistory();       // Last 50 actions
CUI.Redux.getReducers();      // Registered reducers
CUI.Redux.clearHistory();     // Clear action log
```

**Action Creators**
```javascript
const increment = CUI.Redux.createAction('COUNTER/INCREMENT');
const setSpeed = CUI.Redux.createAction('SET_SPEED', (speed) => ({ speed }));

CUI.dispatch(increment());
CUI.dispatch(setSpeed(90));
```

---

## Components

### Tabs
```javascript
CUI.Tabs.create({
  containerId: 'myTabs',
  tabs: [
    { id: 'tab1', label: 'Tab 1', content: '<p>Content</p>' }
  ],
  onChange: (active) => console.log(active)
});
```

### FAB & Drawers
```javascript
CUI.FAB.create({
  id: 'docFab',
  icon: '?',
  drawerId: 'docpanel'
});
```

### Behaviors (Sliders, etc.)
```javascript
CUI.Slider.create({
  id: 'mySlider',
  onChange: (value) => console.log(value)
});
```

---

## Plugins

### Terminal
```javascript
const terminal = CUI.Terminal.create({
  id: 'terminal',
  prompt: '$',
  crtEffects: true,
  commands: {
    mycommand: (args, term) => {
      term.log('Command executed!', 'success');
    }
  }
});
```

**Built-in Commands:**
- `help` - Show available commands
- `clear` - Clear terminal
- `history` - Show command history
- `version` - Show CUI version
- `modules` - List loaded modules

### WikiPopup
```javascript
const wiki = CUI.WikiPopUp.create({
  id: 'wikiPopup',
  onClose: () => console.log('Closed')
});

CUI.WikiPopUp.open('wikiPopup', 'Turing pattern');
```

### Command Manager
```javascript
CUI.CommandManager.register('wiki', (args, context) => {
  const title = args.join(' ');
  CUI.WikiPopUp.open('mainWiki', title);
  return { success: true, output: `Opening ${title}` };
}, {
  description: 'Open Wikipedia article',
  syntax: 'wiki <title>',
  examples: ['wiki Turing pattern']
});
```

---

## Using Redux-Lite Pattern

### Example: SIR Simulation

```javascript
// 1. Define action types
const Actions = {
  START: 'SIR/START',
  PAUSE: 'SIR/PAUSE',
  UPDATE_STATS: 'SIR/UPDATE_STATS'
};

// 2. Register reducer
CUI.Redux.reducer('simulation', (state = initialState, action) => {
  switch (action.type) {
    case Actions.START:
      return { ...state, running: true };
    case Actions.PAUSE:
      return { ...state, running: false };
    case Actions.UPDATE_STATS:
      return {
        ...state,
        stats: { ...state.stats, ...action.payload }
      };
    default:
      return state;
  }
}, initialState);

// 3. Subscribe to changes
CUI.Redux.subscribe((state, prevState, action) => {
  if (state.simulation.stats !== prevState.simulation.stats) {
    updateStatsDisplay(state.simulation.stats);
  }
});

// 4. Dispatch actions
document.getElementById('startBtn').addEventListener('click', () => {
  CUI.dispatch({ type: Actions.START });
});

// 5. Use state in simulation loop
function simulate() {
  const { stats, params } = CUI.getState('simulation');
  const newStats = runSimulationStep(stats, params);
  CUI.dispatch({
    type: Actions.UPDATE_STATS,
    payload: newStats
  });
}
```

---

## Benefits of Redux-Lite

### Before (Scattered State)
```javascript
// State in multiple places
CUI.State.set('paused', true);
params.speed = 90;
terminal.history.push(cmd);
updateUI(); // Manual UI update
```

### After (Centralized)
```javascript
// Single source of truth
CUI.dispatch({ type: 'PAUSE' });
CUI.dispatch({ type: 'SET_SPEED', payload: 90 });
CUI.dispatch({ type: 'TERMINAL/COMMAND', payload: cmd });
// UI updates automatically via subscribers
```

### Debug Workflow
```javascript
// See what happened
CUI.Redux.getHistory();

// Inspect state
CUI.getState();

// Time-travel (manual)
const history = CUI.Redux.getHistory();
history.forEach(action => CUI.dispatch(action)); // Replay
```

---

## Hot Reload

Still works! Paste module code into console:

```javascript
// 1. Edit cui-terminal.js
// 2. Copy entire file
// 3. Paste in console
// → Module reloads instantly

CUIDebug.reload('terminal');
```

---

## Migration Guide

### From CUI v0.1.0 to v0.2.0

**File Paths Changed:**
```diff
- <script src="js/cui-core.js"></script>
+ <script src="cui/core/cui-core.js"></script>

- <script src="js/cui-terminal.js"></script>
+ <script src="cui/plugins/cui-terminal.js"></script>

+ <script src="cui/utils/cui-redux-lite.js"></script>
```

**State Management (Optional Migration):**
```javascript
// Old way (still works)
CUI.State.set('speed', 90);

// New way (recommended)
CUI.dispatch({ type: 'SET_SPEED', payload: 90 });
```

**Demo-Specific CSS:**
```diff
<!-- Remove from framework -->
- <link rel="stylesheet" href="cui/css/cui-components.css">

<!-- Add demo CSS -->
+ <link rel="stylesheet" href="demos/sir/sir.css">
```

---

## Design Tokens

All available as CSS variables:

```css
/* Colors */
--cui-bg:       #0b0f14
--cui-panel:    #11161d
--cui-text:     #dbe7f3
--cui-accent:   #4aa3ff
--cui-good:     #29d398
--cui-warn:     #f7b955

/* Spacing */
--cui-space-xs:  4px
--cui-space-sm:  8px
--cui-space-md:  12px
--cui-space-lg:  18px
--cui-space-xl:  24px
--cui-space-xxl: 32px

/* Radius */
--cui-radius-sm: 2px
--cui-radius-md: 4px
--cui-radius-lg: 8px

/* Z-index */
--cui-z-base:    1
--cui-z-overlay: 10
--cui-z-drawer:  20
--cui-z-fab:     30
--cui-z-modal:   40
```

---

## Browser Support

- Chrome/Edge (modern)
- Firefox (modern)
- Safari (modern)
- Requires ES6+ (arrow functions, template literals, classes)
- Requires CSS Grid and Custom Properties

---

## Development

### Load Framework
```html
<!-- Core -->
<script src="cui/core/cui-core.js"></script>
<script src="cui/core/cui-tokens.js"></script>
<script src="cui/core/cui-lifecycle.js"></script>

<!-- Redux-lite (optional) -->
<script src="cui/utils/cui-redux-lite.js"></script>

<!-- Components (as needed) -->
<script src="cui/components/cui-tabs.js"></script>
<script src="cui/components/cui-fab.js"></script>

<!-- Plugins (as needed) -->
<script src="cui/plugins/cui-terminal.js"></script>

<script>
  CUI.ready(function() {
    CUI.Tokens.inject();
    // Your app here
  });
</script>
```

### Debug Helpers
```javascript
CUIDebug.status();        // Module status
CUIDebug.modules();       // List modules
CUIDebug.graph();         // Dependency graph
CUIDebug.reload('name');  // Hot reload module

CUI.Redux.getHistory();   // Action history
CUI.Redux.getReducers();  // Registered reducers
CUI.getState();           // Full state tree

testCUI();                // Run full test (if on test page)
```

---

## Creating a Demo

### 1. Create Demo Directory
```bash
mkdir demos/mydemo
cd demos/mydemo
```

### 2. Create HTML
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="../../cui/css/cui-base.css">
  <link rel="stylesheet" href="../../cui/css/cui-components.css">
  <link rel="stylesheet" href="mydemo.css">
</head>
<body>
  <div id="app"></div>

  <!-- Core -->
  <script src="../../cui/core/cui-core.js"></script>
  <script src="../../cui/core/cui-tokens.js"></script>
  <script src="../../cui/core/cui-lifecycle.js"></script>
  <script src="../../cui/utils/cui-redux-lite.js"></script>

  <!-- Your demo -->
  <script src="mydemo.js"></script>

  <script>
    CUI.ready(function() {
      CUI.Tokens.inject();
      MyDemo.init();
    });
  </script>
</body>
</html>
```

### 3. Create Redux-style Logic
```javascript
// mydemo.js
(function() {
  window.MyDemo = {
    init() {
      // Define reducer
      CUI.Redux.reducer('demo', (state = {}, action) => {
        // Handle actions
        return state;
      });

      // Subscribe to changes
      CUI.Redux.subscribe((state) => {
        // Update UI
      });

      // Wire up UI
      // ...
    }
  };
})();
```

### 4. Create Demo-Specific CSS
```css
/* mydemo.css */
.mydemo-specific {
  /* Demo styles here */
}
```

---

## Comparison: Before vs After

### Before (v0.1.0)
- Framework + demo code mixed
- `.sir-*` classes in framework CSS
- No Redux pattern
- State scattered everywhere
- Hard to debug state changes
- One big `cell/` directory

### After (v0.2.0)
- Clean framework/demo separation
- Demo classes in `demos/sir/sir.css`
- Redux-lite actions + reducers
- Single state tree
- Action history for debugging
- Organized `cui/` + `demos/` structure

---

## Contributing

### Adding a Core Component
1. Create `cui/components/cui-mycomponent.js`
2. Wrap in `CUI.register('mycomponent', deps, factory)`
3. Add to `cui/index.html` test page
4. Document API

### Adding a Plugin
1. Create `cui/plugins/cui-myplugin.js`
2. Keep it optional (not required by core)
3. Document plugin API
4. Add example usage

### Creating a Demo
1. Create `demos/mydemo/` directory
2. Follow Redux-lite pattern
3. Keep demo-specific code separate
4. Add to main README examples

---

## License

Public domain / MIT

---

## Credits

**Framework:** Cell UI (CUI)
**Author:** mricos
**Refactored:** 2025-10-30
**Original:** 2025-10-27

Created for interactive physics simulations and scientific visualizations with hot-reload development and Redux-lite state management.
