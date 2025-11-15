# VT100 Controls Harmonization

## Overview

This document describes the harmonization of VT100 CRT effect controls across the Vecterm application. All VT100 controls are now **data-driven** from a single source of truth: `config/vt100-config.js`.

## Problem Statement

Prior to this refactor, VT100 effect configurations were scattered across multiple files with inconsistent values, ranges, and naming:

1. **Quick Settings panel** (right sidebar)
2. **VT100 hamburger menu** (overlay controls)
3. **Settings panel** (main settings)
4. **CLI commands** (vt100.*)
5. **Tab completion** (slider configs)
6. **MIDI mappings**

This led to:
- Inconsistent default values
- Duplicate configuration definitions
- Difficulty adding new effects
- Maintenance burden

## Solution: Centralized Configuration

### New File Structure

```
config/
  └── vt100-config.js          # Single source of truth for VT100 effects

cli/
  ├── quick-settings.js         # Uses VT100_EFFECTS, QUICK_SETTINGS_DEFAULTS
  ├── vt100-params.js           # Uses VT100_MENU_EFFECTS
  ├── tab-completion.js         # Uses createTabCompletionConfig()
  └── command-processor.js      # Uses VT100_EFFECTS for help and commands

modules/
  └── vt100-effects.js          # Uses VT100_EFFECTS for defaults

ui/
  └── settings-vt100-generator.js  # Generates Settings panel controls
```

### Configuration Schema

Each effect in `config/vt100-config.js` has:

```javascript
{
  id: 'glow',                          // Internal identifier
  label: 'Phosphor Glow',              // Display name
  min: 0,                              // Minimum value
  max: 2,                              // Maximum value
  step: 0.05,                          // Slider step
  default: 0.3,                        // Default value
  unit: '',                            // Display unit ('', 's', 'px')
  description: 'Phosphor glow...',     // Help text
  cssVar: '--vt100-border-glow',       // CSS variable name
  category: 'visual'                   // Grouping category
}
```

## Effect Definitions

### Current VT100 Effects

| ID | Label | Range | Default | Unit | Description |
|----|-------|-------|---------|------|-------------|
| `glow` | Phosphor Glow | 0-2 | 0.3 | - | Phosphor glow intensity around text and graphics |
| `scanlines` | Scanlines | 0-1 | 0.15 | - | Horizontal scanline darkness |
| `scanspeed` | Scan Speed | 0.5-30 | 8 | s | Scanline animation scroll speed |
| `wave` | Raster Wave | 0-30 | 2 | px | Horizontal raster wave amplitude (flyback distortion) |
| `wavespeed` | Wave Speed | 1-10 | 3 | s | Raster wave oscillation speed |
| `border` | Border Glow | 0-2 | 0.4 | - | Terminal border glow intensity |

### Effect Categories

- **visual**: Glow and scanline appearance
- **animation**: Speed and timing of effects
- **distortion**: CRT geometry and wave effects

## UI Panels Configuration

### Quick Settings (Right Sidebar)

**Default effects** (defined in `QUICK_SETTINGS_DEFAULTS`):
- Phosphor Glow
- Scanlines
- Scan Speed
- Raster Wave
- Border Glow

Users can add/remove effects via swipe gestures on CLI sliders.

### VT100 Hamburger Menu (Overlay)

**Subset of effects** (defined in `VT100_MENU_EFFECTS`):
- Phosphor Glow
- Scanlines
- Raster Wave

This menu shows the most commonly adjusted effects for quick access during terminal use.

### Settings Panel (Main Settings)

Shows **all VT100 effects** from the configuration. The Settings panel section is now dynamically generated using `ui/settings-vt100-generator.js`.

## Adding New Effects

To add a new VT100 effect, simply add an entry to the `VT100_EFFECTS` array in `config/vt100-config.js`:

```javascript
{
  id: 'flicker',
  label: 'Phosphor Flicker',
  min: 0,
  max: 1,
  step: 0.05,
  default: 0.1,
  unit: '',
  description: 'Random phosphor intensity flicker',
  cssVar: '--vt100-flicker-intensity',
  category: 'visual'
}
```

Then:
1. Add CSS variable handling in `modules/vt100-effects.js` `_applyCLIPanelEffect()`
2. Optionally add to `QUICK_SETTINGS_DEFAULTS` or `VT100_MENU_EFFECTS`
3. Effect automatically appears in:
   - CLI help (`vt100.help`)
   - Tab completion
   - Command handler
   - Settings panel

## API Reference

### `config/vt100-config.js`

#### Exports

- `VT100_EFFECTS` - Array of all effect definitions
- `QUICK_SETTINGS_DEFAULTS` - Array of effect IDs for Quick Settings defaults
- `VT100_MENU_EFFECTS` - Array of effect IDs for hamburger menu
- `EFFECT_CATEGORIES` - Category definitions

#### Functions

- `getEffectConfig(id)` - Get config for specific effect
- `getEffectsByCategory(category)` - Get all effects in category
- `getAllEffectIds()` - Get array of all effect IDs
- `createEffectConfigMap()` - Create map of id -> config
- `formatEffectValue(effectId, value)` - Format value with unit
- `createTabCompletionConfig()` - Generate config for tab completion
- `createMidiMappingConfig()` - Generate config for MIDI mapping

### Usage Examples

#### CLI Commands

```bash
# Show help
vt100.help

# Get current value
vt100.glow

# Set value
vt100.glow 0.5

# Show all current values
vt100.status

# Reset to defaults
vt100.reset
```

#### JavaScript API

```javascript
import { vt100Effects } from './modules/vt100-effects.js';

// Set effect
vt100Effects.setEffect('glow', 0.5);

// Get effect
const glow = vt100Effects.getEffect('glow');

// Get all effects
const all = vt100Effects.getAllEffects();

// Reset all
vt100Effects.reset();
```

#### Configuration Access

```javascript
import { getEffectConfig, formatEffectValue } from './config/vt100-config.js';

const config = getEffectConfig('glow');
// { id: 'glow', label: 'Phosphor Glow', min: 0, max: 2, ... }

const formatted = formatEffectValue('glow', 0.3);
// "0.30"
```

## Migration Notes

### Breaking Changes

None. The refactor is backward compatible. All existing code continues to work.

### Deprecated Patterns

❌ **Old**: Hardcoded effect configurations in multiple files
```javascript
const CONTINUOUS_COMMANDS = {
  'vt100.scanlines': { min: 0, max: 1, step: 0.05, default: 0.15, unit: '' },
  'vt100.glow': { min: 0, max: 1, step: 0.05, default: 0.4, unit: '' },
  // ... duplicated everywhere
};
```

✅ **New**: Import from centralized config
```javascript
import { createTabCompletionConfig } from '../config/vt100-config.js';
const CONTINUOUS_COMMANDS = {
  ...createTabCompletionConfig(),
  // ... other commands
};
```

## Benefits

1. **Single Source of Truth**: All VT100 configurations in one place
2. **Consistency**: Identical ranges and defaults across all UIs
3. **Maintainability**: Add/modify effects in one location
4. **Self-Documenting**: Rich metadata for each effect
5. **Type Safety**: Structured configuration schema
6. **Extensibility**: Easy to add new effects or UI panels

## Future Enhancements

- [ ] Add effect presets (e.g., "authentic", "modern", "minimal")
- [ ] Persist user preferences to localStorage
- [ ] Add effect interpolation/animation
- [ ] Support effect groups (enable/disable by category)
- [ ] Add visual effect previews in Settings panel
- [ ] Export/import effect configurations

## Files Modified

### New Files
- `config/vt100-config.js` - Centralized configuration
- `ui/settings-vt100-generator.js` - Settings panel generator
- `docs/VT100_HARMONIZATION.md` - This document

### Modified Files
- `cli/quick-settings.js` - Uses centralized config
- `cli/vt100-params.js` - Dynamically generates controls
- `cli/tab-completion.js` - Uses `createTabCompletionConfig()`
- `cli/command-processor.js` - Data-driven help and handler
- `modules/vt100-effects.js` - Uses config for defaults

## Testing

To verify the harmonization:

1. Open the Vecterm application
2. Test Quick Settings panel (right sidebar)
3. Test VT100 hamburger menu (click hamburger icon in terminal)
4. Test Settings panel (⚙ icon in top bar)
5. Test CLI commands:
   ```bash
   vt100.help      # Should show all effects with ranges
   vt100.status    # Should show current values
   vt100.glow 0.5  # Should update in all UIs
   ```

All three UI panels should now have consistent values and ranges.

## Credits

Refactored as part of VT100 controls harmonization initiative.
