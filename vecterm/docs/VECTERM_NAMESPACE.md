# Vecterm Namespace - Pixeljam Arcade

## Overview

**PJA (Pixeljam Arcade)** is vecterm's modular API framework exposed via the global `window.Vecterm` namespace. It provides a consistent interface for accessing vecterm's subsystems from the browser console or CLI.

## Current PJA Modules

### window.Vecterm.Tines - Audio Engine
*Location: `audio/tines-manager.js`*

Rhythmic audio synthesis engine with pattern-based sequencing.

```javascript
// Quick play methods
Vecterm.Tines.drone("C2 ~ G2 ~")        // Play drone pattern
Vecterm.Tines.bells("C4 E4 G4")         // Play bells pattern
Vecterm.Tines.pattern(channel, "...", params)

// Functional API
Vecterm.Tines.p()      // pattern constructor
Vecterm.Tines.s()      // sequence
Vecterm.Tines.n()      // note
Vecterm.Tines.stack()  // layer patterns
Vecterm.Tines.seq()    // sequence patterns
Vecterm.Tines.cat()    // concatenate
Vecterm.Tines.alt()    // alternate

// Control
Vecterm.Tines.bpm(140)              // Set BPM
Vecterm.Tines.volume(0.7)           // Master volume
Vecterm.Tines.pan('drone', -0.5)    // Channel pan
Vecterm.Tines.stop()                // Stop all
Vecterm.Tines.stopChannel('drone')  // Stop channel

// Variables
Vecterm.Tines.set('rootnote', 'C4')
Vecterm.Tines.get('rootnote')
Vecterm.Tines.vars()

// Clock
Vecterm.Tines.start()
Vecterm.Tines.pause()
Vecterm.Tines.resume()

// Status
Vecterm.Tines.status()

// Direct manager access
Vecterm.Tines.manager
```

**Instruments:**
- `drone` - Multi-oscillator drone synth
- `bells` - FM synthesis bells

**Pattern Syntax:**
- `"C4 E4 G4"` - Sequence
- `"C4 ~ E4 ~"` - With rests
- `"[C4 E4]*2"` - Repeat
- `"<C4 E4>"` - Alternate
- `"euclid(3,8)"` - Euclidean rhythm
- `"[C4,E4,G4]"` - Random choice
- `"$rootnote+7"` - Variables

### window.Vecterm.MIDI - MIDI Controller
*Location: `modules/midi/index.js`*

MIDI hardware integration and visual controller.

```javascript
// Device management
Vecterm.MIDI.getDevices()           // List devices
Vecterm.MIDI.selectDevice(id)       // Select device

// Visual controller
Vecterm.MIDI.showVisual()           // Show visual controller
Vecterm.MIDI.hideVisual()           // Hide visual controller
Vecterm.MIDI.toggleVisual()         // Toggle visibility

// Mappings
Vecterm.MIDI.map('1k', 'tines.volume.drone')    // Map control to param
Vecterm.MIDI.unmap('1k')                         // Remove mapping
Vecterm.MIDI.resetMappings()                     // Clear all mappings
Vecterm.MIDI.getMappings()                       // Get current mappings

// MIDI Learn
Vecterm.MIDI.learn('tines.bpm')     // Enter learn mode
Vecterm.MIDI.cancelLearn()          // Cancel learn

// Presets
Vecterm.MIDI.loadPreset('tines-mixer')      // Load preset
Vecterm.MIDI.savePreset('my-preset', 'My custom mapping')
Vecterm.MIDI.listPresets()                  // List all presets
Vecterm.MIDI.getPreset('tines-mixer')       // Get preset info

// Transport
Vecterm.MIDI.play()                 // Start playback
Vecterm.MIDI.stop()                 // Stop playback
Vecterm.MIDI.record()               // Toggle record
Vecterm.MIDI.setTempo(120)          // Set tempo
Vecterm.MIDI.syncWithTines()        // Sync with Tines BPM

// Recordings
Vecterm.MIDI.getRecordings()        // List recordings
Vecterm.MIDI.playRecording(0)       // Playback recording
Vecterm.MIDI.exportRecording(0)     // Export as JSON
Vecterm.MIDI.deleteRecording(0)     // Delete recording
Vecterm.MIDI.clearRecordings()      // Clear all

// Control values
Vecterm.MIDI.getControl('1k')       // Get control value
Vecterm.MIDI.setControl('1k', 0.75) // Set control value

// Status
Vecterm.MIDI.status()               // Full MIDI status
Vecterm.MIDI.getState()             // Get MIDI Redux state
```

**Controls:**
- Knobs: `1k`, `2k`, `3k`, `4k`, `5k`, `6k`, `7k`, `8k`
- Sliders: `1s`, `2s`, `3s`, `4s`, `5s`, `6s`, `7s`, `8s`
- Buttons: `1a-4a`, `1b-4b`, `1c-4c`, `1d-4d`

**Preset Mappings:**
- `tines-mixer` - 8-channel volume + pan
- `tines-adsr` - Envelope control
- `tines-performance` - Live performance
- `vt100-effects` - Visual effects
- `vecterm-camera` - 3D camera

### window.Vecterm.ReduxCanvas (Legacy)
*Location: `ReduxCanvas.js`*

Modular canvas rendering system (deprecated, use vecterm instead).

```javascript
const canvas = new Vecterm.ReduxCanvas('main-canvas', {
  width: 1920,
  height: 1080,
  enableVT100: true
});

canvas.addEntity({ type: 'rect', x: 100, y: 100, ... });
canvas.updateEntity(id, { x: 200 });
canvas.removeEntity(id);
canvas.render();
```

### Future PJA Modules

Planned additions:

- `Vecterm.ModuleLoader` - Dynamic module system (in development)
- `Vecterm.Vecterm` - 3D vector terminal API
- `Vecterm.Network` - Multiplayer/networking (VTMP)
- `Vecterm.Gamepad` - Gamepad input abstraction

## Design Philosophy

### Naming Convention
All PJA modules use consistent patterns:
- Constructor functions (PascalCase): `new Vecterm.ReduxCanvas()`
- Singleton APIs (PascalCase): `Vecterm.Tines`, `Vecterm.MIDI`
- Method names (camelCase): `Vecterm.Tines.bpm()`, `Vecterm.MIDI.status()`

### Global Access
PJA provides console-accessible APIs for:
- **Debugging**: Quick access to inspect state
- **Live Coding**: Interactive development
- **Performance**: Real-time parameter tweaking
- **Testing**: Manual testing without UI

### Redux Integration
All PJA modules integrate with Redux:
- State changes dispatch Redux actions
- Read state via `store.getState()`
- Subscribe to state changes
- Time-travel debugging compatible

## Usage Patterns

### From Browser Console
```javascript
// Check what's available
window.Vecterm

// Use Tines
Vecterm.Tines.drone("C2 ~ G2 ~")
Vecterm.Tines.bpm(140)

// Use MIDI
Vecterm.MIDI.status()
Vecterm.MIDI.map('1k', 'tines.volume.drone')

// Check state
store.getState().audio
store.getState().midi
```

### From CLI
```bash
# Tines commands
tines.drone "C2 ~ G2 ~"
tines.bpm 140
tines.status

# MIDI commands
midi.status
midi.map 1k tines.volume.drone
midi.ui show
```

### From Application Code
```javascript
import { init } from './modules/midi/index.js';

// Initialize module
await init(store);

// Use API
window.Vecterm.MIDI.loadPreset('tines-mixer');
```

## Architecture Benefits

1. **Discoverability**: Type `Vecterm.` in console to see all modules
2. **Consistency**: All modules follow same patterns
3. **Modularity**: Add new modules without changing core
4. **Testing**: Easy to test via console
5. **Documentation**: Self-documenting via `.status()` methods

## Module Development

To add a new PJA module:

1. **Create module directory**: `modules/my-module/`
2. **Add manifest.json**: Define metadata
3. **Create index.js**: Export `init()` function
4. **Set up global API**:
   ```javascript
   export function setupGlobalAPI(manager) {
     window.Vecterm = window.Vecterm || {};
     window.Vecterm.MyModule = {
       // Your API here
     };
   }
   ```
5. **Integrate with boot**: Add to `boot-manager.js`

## Debugging PJA

```javascript
// List all PJA modules
Object.keys(window.Vecterm)

// Check if module loaded
window.Vecterm.MIDI ? 'Loaded' : 'Not loaded'

// Get module state
Vecterm.MIDI.getState()
Vecterm.Tines.status()

// Access Redux state
store.getState().midi
store.getState().audio

// Direct manager access
Vecterm.Tines.manager
```

## Why "PJA"?

**Pixeljam Arcade** - The namespace for vecterm's modular architecture that brings together audio (Tines), MIDI control, visuals, input, and networking into a unified arcade-style development platform.

## See Also

- [Tines API Documentation](TINES_API.md)
- [MIDI Testing Guide](../MIDI_TESTING_GUIDE.md)
- [Module System](MODULE_SYSTEM.md) *(coming soon)*
