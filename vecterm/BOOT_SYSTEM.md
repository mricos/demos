# Vecterm Boot System

## Architecture

### Boot Manager (`core/boot-manager.js`)

Phased initialization with:
- Health monitoring
- Timeout protection (5-10s per system)
- Critical vs optional system classification
- Retry failed systems
- Status API

### Boot Phases

1. `CREATING_STORE` - Initialize Redux store
2. `LOADING_STATE` - Load persisted state
3. `INITIALIZING_SYSTEMS` - Initialize core systems
4. `CONNECTING_UI` - Connect UI and event handlers
5. `READY` - Operational

## System Classification

### Critical Systems (must succeed)
- `store` - Redux store
- `renderer` - UI renderer
- `cli` - Command line interface

### Optional Systems (can fail)
- `gameManager` - Game loading
- `vectermControls` - 3D rendering
- `gamepadSystem` - Gamepad input
- `tinesManager` - Audio engine
- `midiModule` - MIDI controller

## Features

### Timeout Protection
```javascript
await this.initializeSystem('midiModule', async () => {
  // init code
}, { timeout: 10000, critical: false });
```

### Health Tracking
- Status: `uninitialized` | `initializing` | `ready` | `failed`
- Error message
- Init time
- Timestamps

### Retry
```javascript
Vecterm.System.retry('midiModule')
```

## Global APIs

```javascript
// System status
Vecterm.status()              // Print status
Vecterm.getStatus()           // Get status object
Vecterm.retry('name')         // Retry failed system
Vecterm.isReady()             // Check if ready
Vecterm.getPhase()            // Get boot phase

// MIDI
Vecterm.MIDI.status()
Vecterm.MIDI.showVisual()
Vecterm.MIDI.map('1k', 'tines.volume.drone')

// Audio
Vecterm.Tines.play()
Vecterm.Tines.setVolume(0.5)
```

## Error Handling

### Critical failure
Boot stops, error screen shown.

### Optional failure
Warning logged, app continues without that system.

## Adding a New System

1. Add to health tracking:
```javascript
this.systemHealth = {
  mySystem: { status: 'uninitialized', error: null, startTime: null, endTime: null }
};
```

2. Classify as critical or optional:
```javascript
this.optionalSystems = [..., 'mySystem'];
```

3. Initialize:
```javascript
await this.initializeSystem('mySystem', async () => {
  const module = await import('./my-system.js');
  this.systems.mySystem = await module.init(this.store);
}, { timeout: 5000, critical: false });
```

4. For retry support, extract to method:
```javascript
async initializeMySystem() {
  await this.initializeSystem('mySystem', async () => { /* ... */ });
}
```

## Performance

Typical boot: 500-800ms
- Store: ~45ms
- Systems: ~300-500ms
- UI: ~40-60ms
- Audio/MIDI: ~200-400ms
