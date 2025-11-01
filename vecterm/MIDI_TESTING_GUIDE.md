# MIDI Controller Testing Guide

## Quick Debug Steps

### 1. Test Basic Web MIDI Support

Open `debug-midi.html` in your browser:
```bash
# From vecterm directory
open debug-midi.html
# or
python3 -m http.server 8000
# Then navigate to: http://localhost:8000/debug-midi.html
```

This standalone test will show:
- If Web MIDI API is supported
- All connected MIDI devices
- Live MIDI messages when you move controls

### 2. Check Browser Console

Open vecterm and check the browser console for these logs:

**Expected boot sequence:**
```
[BOOT] Loading MIDI module...
[BOOT] Initializing MIDI controller...
Initializing MIDI module...
✓ MIDI Controller initialized
[MIDI] Scanning for devices...
[MIDI] Total inputs available: X
[MIDI] Found input: YourDevice YourManufacturer connected
[MIDI] Dispatching MIDI_DEVICES_DETECTED with X inputs and Y outputs
✓ Detected X MIDI input(s):
  - YourDevice (YourManufacturer)
✓ MIDI Visual Controller initialized
✓ MIDI module initialized
[BOOT] initializing_systems: MIDI controller initialized
```

**When sidebar updates:**
```
[MIDI UI] Updating device list, found X devices
[MIDI UI] Rendering devices: [array of devices]
```

### 3. Check Redux State

In the browser console:
```javascript
// Get current MIDI state
store.getState().midi

// Should show:
{
  devices: {
    inputs: [{id: '...', name: 'YourDevice', manufacturer: '...', ...}],
    outputs: [...],
    selected: null
  },
  visual: { visible: false, position: {...}, size: {...} },
  controls: { '1k': 0, '2k': 0, ... },
  mappings: {},
  ...
}
```

### 4. Test Global API

In the browser console:
```javascript
// Check if MIDI API exists
window.Vecterm.MIDI

// Get status
window.Vecterm.MIDI.status()
// Should log full MIDI status including devices

// Get devices
window.Vecterm.MIDI.getDevices()
// Returns: { inputs: [...], outputs: [...], selected: null }

// Show visual controller
window.Vecterm.MIDI.showVisual()
```

## Common Issues

### Issue: No devices showing in sidebar

**Check:**
1. Is your MIDI controller connected and powered on?
2. Does `debug-midi.html` show your device?
3. Did you grant MIDI permissions in the browser?
4. Check console for `[MIDI UI] Updating device list` logs

**Solution:**
```javascript
// Force device detection in console
const state = store.getState();
console.log('MIDI state:', state.midi);

// Manually check Web MIDI
navigator.requestMIDIAccess().then(access => {
  console.log('Inputs:', Array.from(access.inputs.values()));
  console.log('Outputs:', Array.from(access.outputs.values()));
});
```

### Issue: Web MIDI not supported

**Browser Support:**
- ✅ Chrome/Chromium
- ✅ Edge
- ✅ Opera
- ❌ Firefox (requires flag: `dom.webmidi.enabled`)
- ❌ Safari (no support)

**Firefox Setup:**
1. Go to `about:config`
2. Set `dom.webmidi.enabled` to `true`
3. Restart Firefox

### Issue: Permission denied

Web MIDI requires user permission. The browser should prompt you automatically when vecterm loads.

**To reset permissions:**
- Chrome: Settings → Privacy → Site Settings → MIDI devices
- Edge: Settings → Cookies and site permissions → MIDI devices

### Issue: Visual controller not showing

```javascript
// Check if initialized
window.Vecterm.MIDI.getState()

// Force show
window.Vecterm.MIDI.showVisual()

// Check DOM
document.getElementById('midi-visual-controller')
```

## Testing MIDI Input

### With Hardware Controller

1. Connect your MIDI controller
2. Open vecterm
3. Move a knob/slider/button
4. Check console for MIDI messages (if logging enabled)

### Without Hardware (Virtual MIDI)

**Mac:**
- Use IAC Driver (Audio MIDI Setup → MIDI Studio → IAC Driver)
- Or install loopMIDI: https://www.tobias-erichsen.de/software/loopmidi.html

**Windows:**
- Install loopMIDI: https://www.tobias-erichsen.de/software/loopmidi.html

**Linux:**
- Use ALSA virtual ports:
  ```bash
  modprobe snd-virmidi
  ```

## Testing Visual Controller

```javascript
// Show controller
window.Vecterm.MIDI.showVisual()

// Move a knob (programmatically)
store.dispatch({
  type: 'MIDI_CONTROL_CHANGE',
  payload: { controlId: '1k', value: 0.5 }
});

// Map knob to parameter
window.Vecterm.MIDI.map('1k', 'tines.volume.drone')

// Check mapping
window.Vecterm.MIDI.getMappings()
```

## Expected Behavior

### Sidebar Display

**When NO devices connected:**
```
Devices:
  No MIDI devices detected

Active Mappings:
  No mappings
```

**When device connected:**
```
Devices:
  YourDevice (YourManufacturer)
  AnotherDevice (Manufacturer)

Active Mappings:
  No mappings
```

**After creating mappings:**
```
Devices:
  YourDevice (YourManufacturer)

Active Mappings:
  1k → tines.volume.drone
  2k → tines.bpm
  1s → tines.pan.bells
```

### Visual Controller

- Draggable window with title bar
- 8 knobs arranged horizontally
- 8 sliders arranged horizontally
- 16 buttons in 4×4 grid
- 3 transport buttons (play, stop, record)
- Shows current values
- Shows parameter mappings below controls

## Debug Commands

```javascript
// Full status
window.Vecterm.MIDI.status()

// List available presets
window.Vecterm.MIDI.listPresets()

// Load preset
window.Vecterm.MIDI.loadPreset('tines-mixer')

// Start MIDI learn
window.Vecterm.MIDI.learn('tines.bpm')
// Then move a control on your MIDI device

// Manual control change
window.Vecterm.MIDI.setControl('1k', 0.75)

// Get control value
window.Vecterm.MIDI.getControl('1k')
```

## Next Steps

If everything is working:
1. Try mapping controls to parameters
2. Test with your MIDI hardware
3. Create custom mapping presets
4. Integrate with Tines audio engine

If still having issues, paste the console output and we'll debug further!
