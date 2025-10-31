# Redux Pattern Visualizer with VT100 Terminal

A comprehensive demonstration of the Redux state management pattern with integrated VT100 terminal emulator and CRT effects.

## PJA (Project Jupiter Architecture)

Modular API framework exposed via `window.PJA` for reusable components.

## Browser Demo

Open `index.html` in a browser to see the full visual demo with:
- Interactive canvas visualization
- Collapsible right sidebar showing Redux state
- Redux Flow diagram showing the 4-step pattern
- Action history tracking
- CLI terminal for advanced commands
- Real-time state monitoring

### Features
- **Toggle Login**: Top bar button to dispatch login/logout actions
- **Redux Flow**: Visual representation of the Redux pattern
- **Current State**: Live JSON view of the entire state tree
- **Action History**: Chronological list of dispatched actions
- **Layers**: Layer management for canvas entities
- **Config**: Animation delay configuration
- **CLI Terminal**: Command-line interface for advanced operations

### CLI Commands

#### Tab Completion with Sliders

The CLI supports **interactive sliders** for continuous variable commands. Simply type a command prefix and press **Tab** to activate:

```bash
# Type "console.vt100.scan" and press Tab
# → Auto-completes and shows graphical slider
# → Drag slider to adjust value in real-time
# → Press Enter or Escape to dismiss slider

# Works with all VT100 continuous variables:
console.vt100.scanlines    # Tab → shows slider (0-1)
console.vt100.scanspeed    # Tab → shows slider (1-20s)
console.vt100.wave         # Tab → shows slider (0-10px)
console.vt100.wavespeed    # Tab → shows slider (1-10s)
console.vt100.glow         # Tab → shows slider (0-1)
console.vt100.glowspeed    # Tab → shows slider (1-10s)
game.vt100.scanlines       # Tab → shows slider (0-1)
game.vt100.brightness      # Tab → shows slider (0.5-2)
# ... and more!
```

**Slider Features:**
- 🎚️ Real-time visual feedback with glowing thumb
- ⚡ Continuously applies changes to Redux as you drag
- 🎯 Precise control with step increments
- ⌨️ Keyboard friendly (Enter/Escape to dismiss)
- 💫 Smooth animations and CRT-style glow effects

#### Console VT100 (Terminal CRT Effects)
```bash
console.vt100.scanlines 0.5      # Scanline darkness (0-1)
console.vt100.scanspeed 8        # Scanline animation speed
console.vt100.wave 2             # Raster wave amplitude
console.vt100.wavespeed 3        # Wave speed
console.vt100.glow 0.8           # Border glow intensity
console.vt100.glowspeed 2        # Glow pulse speed
console.vt100.status             # Show current settings
console.vt100.reset              # Reset to defaults
```

#### Game VT100 (Canvas CRT Effects)
```bash
game.vt100.wave 0.5 2            # Frequency (Hz) and amplitude (px)
game.vt100.drift 0.1             # Slow drift amount
game.vt100.jitter 0.5            # Random jitter
game.vt100.scanlines 0.2         # Scanline intensity
game.vt100.bloom 3               # Phosphor bloom blur
game.vt100.brightness 1.2        # Brightness multiplier
game.vt100.contrast 1.1          # Contrast multiplier
game.vt100.toggle                # Enable/disable wave
game.vt100.status                # Show current settings
```

#### Redux Commands
```bash
# Entity Commands
spawn <type> <x> <y> [color]  # Create entity (rect/circle)
select <id>                    # Select entity
move <id> <x> <y>             # Move entity
delete <id>                    # Delete entity
list entities                  # Show all entities

# Layer Commands
layer add <name>               # Create layer
layer show <id>                # Show layer
layer hide <id>                # Hide layer
layer active <id>              # Set active layer
list layers                    # Show all layers

# Tool Commands
tool <name>                    # Switch tool (select/add/paint/erase)
grid on/off                    # Toggle grid
grid size <n>                  # Set grid size

# General
demo                           # Run Quadrapong game
state                          # Show current state
clear                          # Clear output
```

## REPL Demo

Run the interactive REPL demo in your terminal:

```bash
node redux-demo.js
```

Or:

```bash
./redux-demo.js
```

### REPL Usage

The REPL provides an interactive environment to explore Redux patterns:

```javascript
// Show help
showHelp()

// Run automated demo
runDemo()

// Get current state
store.getState()

// Pretty print state
showState()

// Dispatch actions
store.dispatch(login('john'))
store.dispatch(addTodo('Learn Redux'))
store.dispatch(toggleTodo(1))
store.dispatch(increment())

// Use action creators directly
login('john')          // Returns action object
logout()
addTodo('text')
toggleTodo(1)
removeTodo(1)
increment()
decrement()
```

### Available Actions

**Auth:**
- `store.dispatch(login("username"))` - Login user
- `store.dispatch(logout())` - Logout user

**Todos:**
- `store.dispatch(addTodo("text"))` - Add todo item
- `store.dispatch(toggleTodo(id))` - Toggle todo completion
- `store.dispatch(removeTodo(id))` - Remove todo item

**Counter:**
- `store.dispatch(increment())` - Increment counter
- `store.dispatch(decrement())` - Decrement counter

### Example Session

```javascript
redux> runDemo()
// Runs automated demo showing all features

redux> store.dispatch(login('alice'))
📤 DISPATCH: LOGIN
   Payload: "alice"

🔄 STATE CHANGED

📊 CURRENT STATE:
{
  "user": {
    "isLoggedIn": true,
    "username": "alice"
  },
  "todos": [],
  "counter": 0
}

redux> store.dispatch(addTodo('Master Redux'))
📤 DISPATCH: ADD_TODO
   Payload: "Master Redux"

🔄 STATE CHANGED

📊 CURRENT STATE:
{
  "user": {
    "isLoggedIn": true,
    "username": "alice"
  },
  "todos": [
    {
      "id": 1,
      "text": "Master Redux",
      "completed": false
    }
  ],
  "counter": 0
}

redux> store.dispatch(toggleTodo(1))
📤 DISPATCH: TOGGLE_TODO
   Payload: 1

🔄 STATE CHANGED
```

## Redux Pattern Explained

The demo illustrates the core Redux pattern:

1. **Action Dispatched**: User triggers an action (e.g., clicking button, typing command)
2. **Reducer Processes**: Pure function receives action and current state, returns new state
3. **Store Updated**: Redux store saves the new state
4. **UI Re-renders**: Subscribed components update to reflect new state

### Key Principles

- **Single Source of Truth**: All state in one store
- **State is Read-Only**: Only way to change state is to dispatch actions
- **Changes via Pure Functions**: Reducers are pure functions that return new state
- **Predictable State**: Same actions always produce same results
- **Time-Travel Debugging**: Action history enables replay and debugging

## Project Structure

```
redux/
├── ReduxCanvas.js      # Modular canvas system (PJA)
├── Quadrapong.js       # VT100 CRT renderer + game
├── app.js              # Redux store + VT100 terminal
├── index.html          # Browser demo
├── style.css           # VT100 terminal styling
├── redux-demo.js       # Node.js REPL demo
└── README.md           # This file
```

## PJA API

### ReduxCanvas Module

```javascript
// Initialize
const canvas = new PJA.ReduxCanvas('main-canvas', {
  width: 1920,
  height: 1080,
  enableVT100: true
});

// Entity management
const id = canvas.addEntity({
  type: 'rect',
  x: 100,
  y: 100,
  width: 64,
  height: 64,
  color: '#4fc3f7',
  layerId: 'default'
});

canvas.updateEntity(id, { x: 200, y: 200 });
canvas.removeEntity(id);

// Layer management
canvas.addLayer('background', 0);  // zIndex: 0
canvas.addLayer('foreground', 10); // zIndex: 10
canvas.setLayerVisible('background', false);

// Grid
canvas.setGrid(true, 50, '#1a1a1a');

// Rendering
canvas.render();
canvas.startAnimation((deltaTime) => {
  // Custom game logic here
});

// VT100 controls
canvas.setVT100Config('scanlineIntensity', 0.5);
const config = canvas.getVT100Config();
```

## Semantic Model

- **Console** = VT100 Terminal (the CLI interface)
- **Game** = Canvas-based game rendering
- **VT100** = CRT display effects system

Both console and game use VT100 rendering with independent parameters.

## Requirements

- **Browser Demo**: Modern web browser with ES6 support
- **REPL Demo**: Node.js (any recent version)

## Quick Start

**Browser:**
```bash
open index.html
```

**REPL:**
```bash
node redux-demo.js
```

---

*A demonstration of Redux state management patterns by @mricos*
