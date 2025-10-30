# Cell UI (CUI) Framework

**A modular, vanilla JavaScript framework for building interactive physics simulations and data-driven applications with hot-reload support.**

Version: 0.1.0
Build Date: 2025-10-27

---

## Overview

Cell UI is a lightweight, framework-free UI system designed for rapid prototyping of physics simulations and scientific visualizations. It features:

- **IIFE Lifecycle System** - Load modules in any order with automatic dependency resolution
- **Hot Reload** - Paste module code in browser console for instant updates
- **Design Tokens** - Centralized theming via CSS variables
- **Event Bus** - Decoupled component communication
- **Mobile Responsive** - Portrait-friendly layouts
- **Vanilla JS** - Zero dependencies, runs everywhere

---

## Architecture

### File Structure

```
/cell/
  sir.html                    # Original monolithic demo (preserved)
  test.html                   # CUI framework test/demo

  /js/
    cui-core.js              # Core namespace, state, events, utils
    cui-tokens.js            # Design tokens & CSS injection
    cui-lifecycle.js         # Module registration & dependency resolution
    cui-tabs.js              # Tab/sub-tab system
    cui-fab.js               # Floating action buttons & drawers
    cui-terminal.js          # CLI terminal with CRT effects
    cui-behaviors.js         # Reusable UI behaviors (sliders, buttons, etc.)

  /css/
    cui-base.css             # Reset, tokens, base styles
    cui-components.css       # UI components (cards, FABs, drawers, tabs)
    cui-terminal.css         # Terminal CRT effects

  /manifests/
    sir.json                 # SIR physics manifest (example)
```

---

## Core Modules

### 1. cui-core.js

**Purpose:** Foundation layer - namespace, state, events, utilities

```javascript
// State management
CUI.State.set('key', value);
CUI.State.get('key');
CUI.State.subscribe('key', callback);

// Event bus
CUI.Events.on('eventName', callback);
CUI.Events.emit('eventName', data);
CUI.Events.once('eventName', callback);

// DOM utilities
CUI.DOM.$('elementId');
CUI.DOM.$$('selector');
CUI.DOM.create('div', { class: 'foo' }, 'content');

// Utilities
CUI.Utils.clamp(value, min, max);
CUI.Utils.debounce(func, wait);
CUI.Utils.throttle(func, limit);
```

### 2. cui-tokens.js

**Purpose:** Design system tokens and CSS variable injection

```javascript
// Inject tokens into :root
CUI.Tokens.inject();

// Access token values
CUI.Tokens.colors.palette.blue;  // '#4aa3ff'

// Create custom theme
CUI.Tokens.createTheme('myTheme', {
  colors: { palette: { blue: '#ff0000' } }
});

// Apply theme
CUI.Tokens.applyTheme('myTheme');
```

**Available Tokens:**
- Colors: `--cui-bg`, `--cui-text`, `--cui-accent`, etc.
- Spacing: `--cui-space-xs` through `--cui-space-xxl`
- Radius: `--cui-radius-sm` through `--cui-radius-xxl`
- Z-index: `--cui-z-base` through `--cui-z-modal`

### 3. cui-lifecycle.js

**Purpose:** IIFE module registration with dependency resolution

```javascript
// Register a module
CUI.register('myModule', ['core', 'tabs'], function(CUI) {
  CUI.MyModule = {
    // Module implementation
  };
});

// Wait for all modules to load
CUI.ready(function(CUI) {
  // Initialize app
});

// Debug helpers
CUIDebug.modules();     // List all modules
CUIDebug.status();      // Show load status
CUIDebug.graph();       // Dependency graph
CUIDebug.reload('name'); // Hot reload module
```

**Hot Reload:**
Modify a module file, copy entire IIFE, paste in browser console → instant update!

---

## UI Components

### 4. cui-tabs.js

**Purpose:** Generic tab and sub-tab system

```javascript
const tabs = CUI.Tabs.create({
  containerId: 'myTabs',
  tabs: [
    {
      id: 'tab1',
      label: 'Tab 1',
      content: '<p>Content</p>',
      subtabs: [...]  // Optional nested tabs
    }
  ],
  onChange: (active) => {
    console.log('Active tab:', active.tab, active.subtab);
  }
});

// Activate tab
tabs.activate('tab1', 'subtab1');

// Preset tab system (collapsible groups)
CUI.Tabs.createPresetTabs({
  containerId: 'presets',
  groups: {
    regimes: [...],
    patterns: [...]
  },
  onSelect: (preset, group) => { }
});
```

### 5. cui-fab.js

**Purpose:** Floating action buttons and drawer management

```javascript
// Create FAB with drawer
CUI.FAB.create({
  id: 'docFab',
  icon: '?',
  type: 'doc',
  drawerId: 'docpanel',
  closeOthers: true
});

// Control drawer
CUI.FAB.open('docFab');
CUI.FAB.close('docFab');
CUI.FAB.toggle('docFab');

// Build drawer programmatically
CUI.Drawer.build({
  id: 'drawer',
  sections: [
    { type: 'header', content: '<h4>Title</h4>' },
    { type: 'controls', content: '...' },
    { type: 'actions', content: '...' }
  ]
});
```

### 6. cui-terminal.js

**Purpose:** CLI terminal with command routing and CRT effects

```javascript
const terminal = CUI.Terminal.create({
  id: 'terminal',
  prompt: '$',
  crtEffects: true,
  commands: {
    mycommand: (args, term) => {
      term.log('Output', 'success');
    }
  }
});

// Logging
terminal.log('Message', 'info');    // Green
terminal.log('Success!', 'success'); // Bright green
terminal.log('Warning', 'warning');  // Yellow
terminal.log('Error', 'error');      // Red

// Built-in commands
// help, clear, history, echo, version, modules
```

**CRT Themes:**
- Default: Green (`crt-terminal`)
- Blue: Add class `blue-crt`
- Amber: Add class `amber-crt`

### 7. cui-behaviors.js

**Purpose:** Reusable UI behaviors and helpers

### 8. cui-meta.js

**Purpose:** Framework self-documentation and meta commands

```javascript
// Meta commands are auto-registered with terminals
const terminal = CUI.Terminal.create({ id: 'term' });
// CUI.Meta.registerCommands(terminal) is called automatically

// Available meta commands (use in terminal):
// layout [overview|zstack|hierarchy] - Show ASCII architecture diagrams
// semantics [left|right|overlay]     - View semantic naming conventions
// architecture                        - Display module dependencies
// meta                                - Learn about meta system
// mapping                             - Show current → semantic class mappings

// Access meta data programmatically
CUI.Meta.layouts.overview;        // ASCII layout diagram
CUI.Meta.semantics.leftSide;      // Semantic info for left viewport
CUI.Meta.modules.core;            // Module architecture info
CUI.Meta.commands.layout;         // Command metadata
```

**Meta Terminal Commands:**

```bash
$ layout              # Show main CUI layout diagram
$ layout zstack       # Show z-index stacking diagram
$ layout hierarchy    # Show semantic hierarchy tree

$ semantics           # Show all semantic naming
$ semantics left      # Show left viewport semantics
$ semantics right     # Show right viewport semantics

$ architecture        # Display module dependencies

$ mapping             # Current → semantic class map

$ help layout         # Detailed help for layout command
```

**Purpose:** Makes the framework self-documenting. Type meta commands in the terminal to explore CUI architecture, semantic naming, and module structure without leaving the app.

```javascript
// Slider with live value display
CUI.Slider.create({
  id: 'mySlider',
  onChange: (value) => console.log(value),
  format: (v) => v.toFixed(2)
});

// Button grid
CUI.ButtonGrid.create({
  containerId: 'grid',
  buttons: [
    { id: 'btn1', label: 'Button 1' }
  ],
  onSelect: (btn) => { }
});

// Dropdown
CUI.Dropdown.create({
  triggerId: 'trigger',
  dropdownId: 'dropdown',
  options: [
    { id: 'opt1', label: 'Option 1' }
  ],
  onSelect: (opt) => { }
});

// Parameter binding
const params = {};
CUI.ParamBinder.bind({
  id: 'slider',
  params,
  key: 'value',
  onChange: (val, key) => { }
});

// Animations
await CUI.Animate.fadeIn(element);
await CUI.Animate.slideDown(element);
```

---

## Physics Integration

### Manifest System

Physics engines are defined via JSON manifests:

```json
{
  "id": "sir",
  "name": "SIR Epidemic Model",
  "canvases": [
    { "id": "field", "label": "Agent Field" }
  ],
  "parameters": [
    {
      "id": "N",
      "label": "Population N",
      "type": "slider",
      "min": 50,
      "max": 1500,
      "default": 400
    }
  ],
  "presets": {
    "regimes": [...],
    "patterns": [...]
  },
  "stats": [...]
}
```

**Future:** `CUI.registerPhysics(manifest)` will auto-generate UI from manifest.

---

## Getting Started

### Quick Start

```html
<!doctype html>
<html>
<head>
  <link rel="stylesheet" href="css/cui-base.css">
  <link rel="stylesheet" href="css/cui-components.css">
</head>
<body>
  <div id="app">...</div>

  <!-- Core modules (order matters) -->
  <script src="js/cui-core.js"></script>
  <script src="js/cui-tokens.js"></script>
  <script src="js/cui-lifecycle.js"></script>

  <!-- Component modules (any order) -->
  <script src="js/cui-tabs.js"></script>
  <script src="js/cui-fab.js"></script>
  <script src="js/cui-terminal.js"></script>
  <script src="js/cui-behaviors.js"></script>

  <script>
    CUI.ready(function(CUI) {
      CUI.Tokens.inject();
      // Your app code here
    });
  </script>
</body>
</html>
```

### Demo

Open `test.html` in a browser to see a working demo with:
- Terminal with custom commands
- Tab system
- FABs and drawers
- Interactive sliders
- Module status display

**Try in console:**
```javascript
CUIDebug.status();      // Show all modules
window.testCUI();       // Run test suite
CUI.Tokens.applyTheme('light'); // Switch theme
```

---

## Development Workflow

### Hot Reload Example

1. Open `test.html` in browser
2. Open DevTools console
3. Edit `js/cui-terminal.js` (add a new command)
4. Copy entire file contents
5. Paste into console
6. New command immediately available!

**Why?** All modules are IIFEs that call `CUI.register()`. Pasting re-registers the module, and the lifecycle system re-executes it with updated code.

---

## Design Tokens

### Color Palette

```css
--cui-bg:       #0b0f14  (Dark background)
--cui-panel:    #11161d  (Panel background)
--cui-text:     #dbe7f3  (Light text)
--cui-muted:    #9fb2c6  (Muted text)
--cui-accent:   #4aa3ff  (Primary accent - blue)
--cui-accent-2: #ff6b6b  (Secondary - red)
--cui-good:     #29d398  (Success - green)
--cui-warn:     #f7b955  (Warning - yellow)
```

### Spacing Scale

```css
--cui-space-xs:  4px
--cui-space-sm:  8px
--cui-space-md:  12px
--cui-space-lg:  18px
--cui-space-xl:  24px
--cui-space-xxl: 32px
```

### Z-Index Layers

```css
--cui-z-base:    1
--cui-z-overlay: 10
--cui-z-drawer:  20
--cui-z-fab:     30
--cui-z-modal:   40
```

---

## Mobile Responsive

CUI is mobile-friendly with breakpoints:

- **Desktop:** > 768px (2-column grid, full drawers)
- **Mobile:** ≤ 768px (1-column grid, full-width bottom drawers)
- **Small:** ≤ 374px (Adjusted fonts, stacked layouts)

Drawers slide up from bottom on mobile with rounded top corners.

---

## Event System

Global events emitted by CUI:

```javascript
// Lifecycle
CUI.Events.on('cui:init', callback);
CUI.Events.on('cui:ready', callback);
CUI.Events.on('cui:module:loaded', callback);
CUI.Events.on('cui:module:reloaded', callback);

// Tokens
CUI.Events.on('cui:tokens:injected', callback);

// Tabs
CUI.Events.on('cui:tab:changed', callback);
CUI.Events.on('cui:subtab:changed', callback);

// FAB
CUI.Events.on('cui:fab:opened', callback);
CUI.Events.on('cui:fab:closed', callback);

// Terminal
CUI.Events.on('cui:terminal:log', callback);
CUI.Events.on('cui:terminal:command', callback);

// Parameters
CUI.Events.on('cui:param:changed', callback);
```

---

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ features required (arrow functions, template literals, classes)
- CSS Grid and Custom Properties required
- No polyfills included

---

## Next Steps

### Planned Features

1. **Physics Engine Integration**
   - `CUI.registerPhysics(manifest)` - Auto-generate UI
   - Canvas management
   - Time stepping and rendering

2. **Additional Components**
   - Color picker
   - File upload/download
   - Markdown renderer for docs
   - Chart/graph components

3. **Enhanced Terminal**
   - Autocomplete
   - Syntax highlighting
   - Multi-line input
   - Terminal history persistence

4. **State Persistence**
   - LocalStorage integration
   - URL parameter sync
   - Import/export configs

---

## Contributing

Cell UI is designed for rapid iteration. To add a new module:

1. Create `js/cui-mymodule.js`
2. Wrap in IIFE with `CUI.register('mymodule', deps, factory)`
3. Add to HTML before app code
4. Use `CUI.ready()` to initialize

---

## License

Public domain / MIT (choose your own adventure)

---

## Credits

Created for interactive physics simulations and scientific visualizations.
Designed with hot-reload development and console-driven workflows in mind.

**Framework:** Cell UI (CUI)
**Author:** mricos
**Date:** 2025-10-27
