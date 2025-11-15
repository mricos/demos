# VT100 Slider Synchronization

## Overview

All VT100 sliders are now **fully synchronized** across:
- Quick Settings panel (right sidebar)
- CLI tab sliders
- VT100 hamburger menu (terminal overlay)
- Settings panel
- Command-line interface

When you move any slider, **all other sliders for the same parameter move in sync**.

## Architecture

### Synchronization Flow

```
User moves ANY slider
        │
        ▼
┌─────────────────────────────────────────────┐
│  window.Vecterm.update(command, value)      │
│  (vt100-silent-updater.js)                  │
└─────────────────────────────────────────────┘
        │
        ├─ Store value in parameterValues
        │
        ├─ Call handler for command
        │
        ▼
┌─────────────────────────────────────────────┐
│  vt100Effects.setEffect(name, value, true)  │
│  (modules/vt100-effects.js)                 │
│  skipNotify=true prevents circular updates  │
└─────────────────────────────────────────────┘
        │
        ├─ Update internal state
        │
        ├─────────────────────────────┐
        │                             │
        ▼                             ▼
┌──────────────────┐        ┌──────────────────┐
│  Update CSS      │        │  Update Canvas   │
│  Variables       │        │  Renderer        │
│  (CLI Panel)     │        │  (Vecterm)       │
└──────────────────┘        └──────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│  notifyParameterChange(command, value)      │
│  (vt100-silent-updater.js)                  │
└─────────────────────────────────────────────┘
        │
        ├─ Notify all subscribed listeners
        │
        ▼
┌─────────────────────────────────────────────┐
│  All sliders update their UI                │
│  - Quick Settings sliders                   │
│  - CLI tab sliders                          │
│  - VT100 hamburger menu sliders             │
│  - Settings panel sliders                   │
└─────────────────────────────────────────────┘
```

### Preventing Circular Updates

The `skipNotify` parameter in `vt100Effects.setEffect()` prevents infinite loops:

```javascript
// From vt100-silent-updater.js (skipNotify=true)
vt100Effects.setEffect('glow', 0.5, true);  // ✓ Updates effects, doesn't notify

// From command-processor.js (skipNotify=false)
vt100Effects.setEffect('glow', 0.5);        // ✓ Updates effects AND notifies sliders
```

**Flow with skipNotify:**

```
Slider Input
    ↓
window.Vecterm.update()
    ↓
vt100Effects.setEffect(name, value, skipNotify=true)
    ↓
Apply CSS + Canvas changes
    ↓
notifyParameterChange()  ← Called by vt100-silent-updater
    ↓
Update all UI sliders
```

**Flow without skipNotify:**

```
CLI Command: vt100.glow 0.5
    ↓
vt100Effects.setEffect('glow', 0.5, skipNotify=false)
    ↓
Apply CSS + Canvas changes
    ↓
window.Vecterm.update()  ← Called by vt100Effects._notifyChange()
    ↓
notifyParameterChange()
    ↓
Update all UI sliders
```

## Subscription System

### How Sliders Subscribe

Each slider subscribes to parameter changes when created:

```javascript
// Quick Settings slider (cli/quick-settings.js)
const unsubscribe = window.Vecterm.onParameterChange(command, (cmd, value) => {
  // Update slider UI when value changes externally
  if (Math.abs(parseFloat(slider.value) - value) > 0.001) {
    isUpdating = true;  // Prevent circular updates
    slider.value = value;
    valueDisplay.textContent = `${value}${config.unit}`;
    isUpdating = false;
  }
});
```

### Cleanup

When a slider is removed, it unsubscribes:

```javascript
removeBtn.addEventListener('click', () => {
  if (unsubscribe) {
    unsubscribe();  // Stop listening to changes
  }
  this.removeSlider(command);
});
```

## Implementation Details

### 1. vt100-silent-updater.js

**Responsibilities:**
- Central dispatcher for parameter updates
- Maintains parameter value registry
- Manages subscription system
- Routes commands to appropriate handlers
- Notifies all listeners of changes

**Key Functions:**
```javascript
// Update a parameter and notify listeners
window.Vecterm.update(command, value, isMidiValue)

// Subscribe to parameter changes
window.Vecterm.onParameterChange(command, callback)

// Get current parameter value
window.Vecterm.getParameterValue(command)
```

**Handler Mapping:**
```javascript
const handlers = {
  'vt100.glow': () => vt100Effects.setEffect('glow', finalValue, true),
  'vt100.scanlines': () => vt100Effects.setEffect('scanlines', finalValue, true),
  'vt100.scanspeed': () => vt100Effects.setEffect('scanspeed', finalValue, true),
  'vt100.wave': () => vt100Effects.setEffect('wave', finalValue, true),
  'vt100.wavespeed': () => vt100Effects.setEffect('wavespeed', finalValue, true),
  'vt100.border': () => vt100Effects.setEffect('border', finalValue, true),
  'vt100.glowspeed': () => vt100Effects.setEffect('glowspeed', finalValue, true),
  'vt100.borderwidth': () => vt100Effects.setEffect('borderwidth', finalValue, true),
  // ... other commands
};
```

### 2. modules/vt100-effects.js

**Responsibilities:**
- Manages VT100 effect state
- Applies effects to CSS variables
- Applies effects to canvas renderers
- Notifies synchronization system (when skipNotify=false)

**Key Methods:**
```javascript
// Set effect with optional notification control
setEffect(name, value, skipNotify = false)

// Apply to all targets (CSS, canvas, UI)
_applyToTargets(name, value)

// Notify change listeners (unless skipNotify=true)
_notifyChange(command, value)
```

### 3. config/vt100-config.js

**Effect Configuration:**
Each effect now includes:
- `cssVar`: CSS variable name for direct DOM updates
- `min/max/step`: Slider constraints
- `unit`: Display unit and value formatting

```javascript
{
  id: 'glow',
  label: 'Phosphor Glow',
  min: 0,
  max: 2,
  step: 0.05,
  default: 0.3,
  unit: '',
  description: 'Phosphor glow intensity',
  cssVar: '--vt100-border-glow',  ← Used for CSS updates
  category: 'visual'
}
```

## Complete Effect List (8 Effects)

All 8 VT100 effects are now synchronized:

| Effect | Command | CSS Variable | Default |
|--------|---------|--------------|---------|
| Phosphor Glow | `vt100.glow` | `--vt100-border-glow` | 0.3 |
| Scanlines | `vt100.scanlines` | `--vt100-scanline-intensity` | 0.15 |
| Scan Speed | `vt100.scanspeed` | `--vt100-scanline-speed` | 8s |
| Raster Wave | `vt100.wave` | `--vt100-wave-amplitude` | 2px |
| Wave Speed | `vt100.wavespeed` | `--vt100-wave-speed` | 3s |
| Border Glow | `vt100.border` | `--vt100-glow-intensity` | 0.4 |
| Glow Pulse Speed | `vt100.glowspeed` | `--vt100-glow-speed` | 2s |
| Border Width | `vt100.borderwidth` | `--vt100-border-width` | 1px |

## Testing Synchronization

To verify sliders are synchronized:

### Test 1: Quick Settings → CLI Slider

1. Open Quick Settings panel (right sidebar)
2. Type `vt100.glow` in CLI and press TAB
3. Move the Quick Settings glow slider
4. **Expected**: CLI glow slider moves in sync

### Test 2: CLI Slider → Hamburger Menu

1. Type `vt100.scanlines` in CLI and press TAB
2. Click hamburger icon (☰) in terminal to open VT100 menu
3. Move the CLI scanlines slider
4. **Expected**: Hamburger menu scanlines slider moves in sync

### Test 3: Command → All Sliders

1. Have multiple sliders open:
   - Quick Settings panel
   - VT100 hamburger menu
   - CLI tab slider
2. Type command: `vt100.wave 5`
3. **Expected**: All wave sliders jump to 5px

### Test 4: Settings Panel → Quick Settings

1. Open Settings panel (⚙ icon)
2. Open Quick Settings panel
3. Move Settings panel "Raster Wave" slider
4. **Expected**: Quick Settings wave slider moves in sync

## Debugging

### Enable Debug Logging

Check browser console for synchronization events:

```javascript
// In browser console
window.Vecterm.onParameterChange('vt100.glow', (cmd, value) => {
  console.log(`Parameter changed: ${cmd} = ${value}`);
});
```

### Check Parameter Registry

View all current parameter values:

```javascript
// In browser console
console.log('Glow:', window.Vecterm.getParameterValue('vt100.glow'));
console.log('Scanlines:', window.Vecterm.getParameterValue('vt100.scanlines'));
```

### Verify Subscription Count

Check how many listeners are subscribed:

```javascript
// In vt100-silent-updater.js, add temporary logging:
function notifyParameterChange(command, value) {
  const listeners = parameterListeners.get(command);
  console.log(`Notifying ${listeners?.size || 0} listeners for ${command}`);
  // ... rest of function
}
```

## Performance Considerations

### Optimizations

1. **Debouncing**: Slider updates are throttled during drag operations
2. **Circular Prevention**: `isUpdating` flags prevent feedback loops
3. **Lazy Updates**: CSS variables only update when values actually change
4. **Weak References**: Unsubscribe functions clean up listeners properly

### Avoid

❌ **Don't** call `window.Vecterm.update()` repeatedly in tight loops
❌ **Don't** create sliders without unsubscribing on removal
❌ **Don't** bypass the synchronization system for VT100 effects

## Future Enhancements

- [ ] Persist parameter values to localStorage
- [ ] Add undo/redo for parameter changes
- [ ] Support parameter animation/interpolation
- [ ] Add parameter presets with transitions
- [ ] Record parameter automation tracks
