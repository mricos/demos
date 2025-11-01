# Refactor Summary: window.PJA → window.Vecterm

## Overview

Successfully refactored the global namespace from `window.PJA` (Pixeljam Arcade) to `window.Vecterm` to better align with the project name.

## What Changed

### Global Namespace
- **Before**: `window.PJA.Tines`, `window.PJA.MIDI`
- **After**: `window.Vecterm.Tines`, `window.Vecterm.MIDI`

### Files Modified

**Core Audio:**
- `audio/tines-manager.js` - Updated global API creation

**MIDI Module:**
- `modules/midi/index.js` - Updated global API creation
- `modules/midi/midi-controller.js` - Updated Tines references
- `modules/midi/midi-transport.js` - Updated Tines references

**CLI:**
- `cli/vt100-silent-updater.js` - Updated namespace references
- `cli/prompt-manager.js` - Updated ModuleLoader reference

**UI:**
- `ui/event-handlers.js` - Updated MIDI button handlers

**Documentation:**
- `docs/PJA_NAMESPACE.md` → `docs/VECTERM_NAMESPACE.md`
- `MIDI_TESTING_GUIDE.md` - Updated all examples

## API Changes

### Before
```javascript
// Tines
window.PJA.Tines.drone("C2 ~ G2 ~")
window.PJA.Tines.bpm(140)
window.PJA.Tines.status()

// MIDI
window.PJA.MIDI.status()
window.PJA.MIDI.map('1k', 'tines.volume.drone')
window.PJA.MIDI.showVisual()
```

### After
```javascript
// Tines
window.Vecterm.Tines.drone("C2 ~ G2 ~")
window.Vecterm.Tines.bpm(140)
window.Vecterm.Tines.status()

// MIDI
window.Vecterm.MIDI.status()
window.Vecterm.MIDI.map('1k', 'tines.volume.drone')
window.Vecterm.MIDI.showVisual()
```

## Shorter Aliases (Optional)

For convenience in the console:
```javascript
// You can create shortcuts
const Tines = window.Vecterm.Tines;
const MIDI = window.Vecterm.MIDI;

// Then use:
Tines.drone("C2 ~ G2 ~")
MIDI.showVisual()
```

## Testing

After refactor, verify:

1. **Check namespace exists:**
   ```javascript
   Object.keys(window.Vecterm)
   // Should return: ['Tines', 'MIDI']
   ```

2. **Test Tines:**
   ```javascript
   Vecterm.Tines.status()
   Vecterm.Tines.drone("C2 ~ G2 ~")
   ```

3. **Test MIDI:**
   ```javascript
   Vecterm.MIDI.status()
   Vecterm.MIDI.showVisual()
   ```

4. **Check console logs:**
   - Should see: `[tines] Global API created at window.Vecterm.Tines`
   - Should NOT see any `window.PJA` references

## Backwards Compatibility

Currently **NO backwards compatibility** - all references to `window.PJA` have been removed.

If needed, you can add a compatibility shim:
```javascript
// In app.js or boot-manager.js
window.PJA = window.Vecterm; // Legacy alias
```

## Files NOT Changed

These files were left as-is (no PJA references):
- All Redux core files
- Game files
- VT100 renderer
- Most CLI files

## Benefits

1. **Clarity**: `window.Vecterm` clearly indicates this is the vecterm API
2. **Consistency**: Namespace matches project name
3. **Discovery**: Easier to find in documentation
4. **Branding**: Better alignment with vecterm identity

## Next Steps

Consider adding to `window.Vecterm`:
- `Vecterm.ModuleLoader` - Dynamic module system
- `Vecterm.Graphics` - 3D vector terminal
- `Vecterm.Network` - Multiplayer (VTMP)
- `Vecterm.Input` - Unified input system

---

*Refactored: 2025-01-11*
