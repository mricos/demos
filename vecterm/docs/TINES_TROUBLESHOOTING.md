# Tines Audio Engine - Troubleshooting Guide

## Quick Test Sequence

Open the CLI terminal (click the terminal FAB button bottom-right) and run these commands in order:

### 1. Check Initialization
```
tines.status
```
**Expected Output:**
- `Initialized: true`
- `BPM: 120` (or whatever default)
- `Master Volume: 0.70`
- If you see `ERROR: Tines audio engine not initialized`, there's a boot problem

### 2. Test Audio Context State
Open browser console (F12) and type:
```javascript
window.Vecterm.Tines.manager.engine.audioContext.state
```
**Expected:** `"running"`
**If "suspended":** Click anywhere on the page, then check again. Browsers require user interaction to start audio.

### 3. Play Simple Drone
```
tines.drone C2
```
**Expected:** You should hear a continuous low C drone note

### 4. Play Pattern
```
tines.drone C2 ~ G2 ~
```
**Expected:** Alternating C and G notes (C plays, rest, G plays, rest)

### 5. Play Bells
```
tines.bells C4 E4 G4 C5
```
**Expected:** Arpeggio of bells playing C major chord

## Common Issues & Fixes

### Issue 1: "Tines audio engine not initialized"
**Cause:** Boot manager failed to initialize tines
**Fix:**
1. Check browser console for errors
2. In console, manually retry:
   ```javascript
   await window.bootManager.initializeTines()
   ```

### Issue 2: No Sound (Status shows initialized)
**Cause:** AudioContext suspended (browser security)
**Fix:**
1. Click anywhere on the page
2. Or run in console:
   ```javascript
   window.Vecterm.Tines.manager.engine.audioContext.resume()
   ```
3. Check state again - should be "running"

### Issue 3: Visual Player Not Showing
**Cause:** CLI panel not ready when tines initialized
**Fix:**
- This is OK! Audio works without visual player
- Visual player will show in CLI panel when you open it
- Not critical for audio functionality

### Issue 4: Clicks/Pops in Audio
**Cause:** Envelope attack/release too sharp
**Fix:**
```
tines.set attack 0.01
tines.set release 0.1
```

## Testing Web Audio Directly

If tines isn't working, test if Web Audio works at all:

```javascript
// Create basic test tone
const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);
gain.gain.value = 0.3;
osc.frequency.value = 440; // A4
osc.start();
setTimeout(() => osc.stop(), 1000); // Play for 1 second
```

If this doesn't make sound, it's a browser/system audio issue, not tines.

## Tines Architecture

```
Boot Manager (core/boot-manager.js)
  └─> initializeTines()
       └─> createTinesManager(store)  [audio/tines-manager.js]
            ├─> TinesEngine.init()    [audio/tines-engine.js]
            │    ├─> AudioContext
            │    ├─> Master Gain
            │    └─> Channels (drone, bells, synth, drums)
            ├─> TinesClock              [audio/tines-clock.js]
            ├─> Instruments
            │    ├─> DroneInstrument   [audio/instruments/drone.js]
            │    └─> BellsInstrument   [audio/instruments/bells.js]
            └─> TinesVisualPlayer      [audio/tines-visual-player.js]
                 └─> Inserted in #cli-panel (VT100 terminal)
```

## Location Changes (Recent Fix)

**Before:** Visual player tried to insert before `.cli-output`, fell back to `body` → showed in play field with green border

**After:** Visual player ALWAYS inserts inside `#cli-panel` → stays in terminal, out of play field

**New Theme:** Changed from green (`#00ff00`) to cyan (`#4fc3f7`) to match VT100 terminal

## Quick Commands Reference

```bash
# Status
tines.status

# Play patterns
tines.drone C2 ~ G2 ~
tines.bells C4 E4 G4

# Control
tines.bpm 140
tines.volume 0.5
tines.pan drone -0.5
tines.stop
tines.pause
tines.resume

# Variables
tines.set attack 0.01
tines.get attack
tines.vars

# Full help
tines.help
```

## Browser Console Direct Access

```javascript
// Global API
Vecterm.Tines.drone("C2 ~ G2 ~")
Vecterm.Tines.bells("C4 E4 G4")
Vecterm.Tines.bpm(140)
Vecterm.Tines.volume(0.5)
Vecterm.Tines.stop()

// Manager access
Vecterm.Tines.manager.engine.audioContext.state
Vecterm.Tines.manager.getStatus()

// Functional API
const p = Vecterm.Tines.p("C4 E4 G4").fast(2)
p.play('bells')
```

## Expected Boot Sequence

Watch browser console during boot:

1. `🚀 Starting Vecterm...`
2. `[boot-manager] Phase 1: Core Foundation`
3. `[boot-manager] Phase 2: UI Systems`
4. `[boot-manager] Phase 3: Optional Systems`
5. `[tines] Engine initialized`
6. `[tines-manager] Initialized successfully`
7. `[tines-visual-player] Inserted into CLI panel`
8. `[tines-manager] Visual player initialized`
9. `[tines] Global API created at window.Vecterm.Tines`

If any of these fail, check the error message in console.
