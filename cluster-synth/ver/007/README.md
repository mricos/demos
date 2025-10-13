# CLUSTER v007 • Modular Graph Synthesizer

A modular dual-cluster synthesis environment with advanced panel management, gamepad control, and real-time visualization.

## Architecture

### Modular File Structure

```
js/
├── core.js              # Event Bus, Utilities, Z-Order Management
├── state-manager.js     # localStorage persistence (panels, params, tokens)
├── panel-manager.js     # Panel lifecycle & three display modes
├── audio.js             # Dual cluster synthesis with FM & FX
├── scope.js             # Oscilloscope visualization
├── canvas.js            # PubSub graph with draggable nodes
├── gamepad.js           # Input handling & cursor control
├── mapper.js            # Gamepad→Synth parameter mapping
├── log.js               # Event logging system
└── main.js              # Bootstrap & initialization
```

## Panel Management System

### Three Display Modes

Each panel supports three modes:

1. **Closed** - Hidden, FAB is inactive
2. **Open** - Normal floating panel, draggable
3. **Fullscreen** - Maximized to viewport

### FAB Controls (Floating Action Buttons)

- Click FAB to **toggle** panel open/closed
- FAB shows **active state** (blue highlight) when panel is open
- Located in bottom-right corner

### Panel Header Controls

Each panel header includes mode controls:
- **Minimize** button (−) - Close panel
- **Maximize** button (□) - Toggle fullscreen mode

### Panel Features

- **Drag to Move** - Click and drag panel header
- **Z-Order** - Click panel to bring to front
- **State Persistence** - Positions and modes saved to localStorage
- **Joystick Control** - Navigate panels with gamepad

## Modules & Panels

### Control.1 • Global & FX
Global output gain, dry/wet mix, frequency shifter, delay/feedback effects

### Control.2 • Left Generator
Cluster synthesis parameters: pitch, detune, FM, waveshaping, filter, pan, level

### Control.3 • Right Generator
Independent right channel cluster synthesis

### Scope • Dual
Real-time waveform visualization for left and right channels

### Gamepad • Dynamics
**Layout (top to bottom):**
1. Axes • Realtime - Current joystick position
2. Stats & Pressed - Statistics and button states (side by side)
3. Derivatives • Velocity & Acceleration - Motion analysis **below** realtime data

### Mapper • Gamepad ↔ Synth
Map gamepad axes and buttons to synth parameters
- Right-click parameter to learn
- Move axis or press button to bind
- Adjust scale, offset, invert, deadzone

### Log • Parsed Snapshot
Real-time event log with BPM/beat tracking

### UI • Design Tokens
Edit CSS custom properties, persisted to localStorage

## Gamepad Controls

### Navigation
- **Left Stick** - Move cursor
- **A Button** - Focus nearest control
- **D-pad Left/Right** - Select graph nodes
- **D-pad Up/Down** - Select panels
- **LB (Left Bumper)** - Drag selected node
- **RB (Right Bumper)** - Move selected panel

### Mapping
- **Right-click** any parameter to enter learn mode
- **Move axis or press button** to create binding
- Mappings auto-save to localStorage

## State Persistence

### Automatically Saved
- Panel positions and sizes
- Panel visibility and display modes
- Synth parameters (debounced, 500ms)
- Design tokens (CSS custom properties)
- Gamepad mappings

### Storage Keys
- `cluster.panels.v1` - Panel states
- `cluster.params.v1` - Synth parameters
- `cluster.tokens.v1` - Design tokens
- `cluster.gpmaps.v3` - Gamepad mappings

## Event Bus

Global event system for inter-module communication:

```javascript
// Subscribe to events
CLUSTER.Bus.on('audio:ready', (data) => { ... });

// Emit events
CLUSTER.Bus.emit('panel:mode-changed', { panelId, mode });
```

### Key Events
- `cluster:ready` - All modules initialized
- `audio:started` - Audio context created
- `audio:ready` - Analysers available
- `panel:mode-changed` - Panel display mode changed
- `gamepad:series` - Motion data updated
- `ui:param-changed` - Parameter value changed

## Canvas Graph

PubSub visualization showing module activity:
- **Drag nodes** to rearrange
- **Double-click node** to open associated panel
- **Nodes pulse** when events fire
- **Grid background** for spatial reference

## CSS Architecture

### Custom Properties (Design Tokens)
All colors, spacing, and dimensions use CSS custom properties for easy theming.

### Semantic Class Names
- `.panel-header` - Panel header with title and actions
- `.panel-body` - Scrollable panel content
- `.panel-title` - Panel title text
- `.panel-actions` - Header action buttons
- `.panel-mode-controls` - Minimize/maximize buttons

### Panel Mode Classes
- `.panel--closed` - Hidden state
- `.panel--open` - Normal floating state
- `.panel--fullscreen` - Maximized state

### FAB States
- `.fab` - Base FAB style
- `.fab--active` - Active/highlighted state

## Development

### Adding a New Panel

1. **HTML** - Add panel section with `data-module` attribute
2. **FAB** - Add FAB button with matching `data-module`
3. **Module** - Panel automatically registered by `PanelManager`
4. **Canvas Node** - Add to `Canvas.init()` node list (optional)

### Adding Event Listeners

Use the Bus system for loose coupling:

```javascript
NS.Bus.on('your-event', (data) => {
  // Handle event
});

NS.Bus.emit('your-event', { key: 'value' });
```

## Performance

- 60 FPS rendering for all visualizations
- Efficient Z-order management
- Debounced state persistence
- Optimized gamepad polling
- Canvas rendering with requestAnimationFrame

## Browser Compatibility

- Modern browsers with Web Audio API
- Gamepad API for controller support
- localStorage for persistence
- ES6+ JavaScript features

## Tips

- **Loose Layout** - Panels float freely, arrange as needed
- **Persist State** - Positions and settings auto-save
- **Keyboard + Gamepad** - Use together for maximum control
- **Right-click to Learn** - Quick parameter mapping
- **Shuffle Z** - Button in HUD randomizes panel Z-order
- **Design Tokens** - Edit UI panel for live theming

---

**Version:** 007
**Architecture:** Modular
**State Management:** localStorage
**Panel Modes:** closed | open | fullscreen
