# Slider System Refactor

## Overview

Complete refactoring of the CLI slider system with lifecycle management, gesture controls, MIDI CC capture, and Quick Settings integration.

## Problem Solved

**Original Issue**: Tab completion couldn't distinguish between `console.vt100.glow` and `console.vt100.glowspeed` because they share the same prefix.

**Solution**: Implemented **space+tab** trigger pattern. Users type the command, press **space**, then **tab** to bring up the slider.

## New Architecture

### Files Created

1. **`cli/slider-lifecycle.js`** - Manages slider state and lifecycle
2. **`cli/slider-gestures.js`** - Touch/mouse gesture handling
3. **`cli/slider-midi-capture.js`** - MIDI CC learn and mapping
4. **`cli/quick-settings.js`** - Quick Settings panel
5. **`style.css`** - New CSS for all features (added ~200 lines)

### Files Modified

1. **`cli/tab-completion.js`** - Integrated new system with space+tab detection

## Features

### 1. Space+Tab Trigger

**How it works:**
- Type command: `console.vt100.glow`
- Press **space**
- Press **tab**
- Slider appears

This solves the ambiguity problem with commands like `glow` and `glowspeed`.

### 2. Slider Lifecycle Management

Sliders are **never destroyed**, only transitioned between states:

- **Active**: Currently interactive slider (green highlight)
- **History**: Previous sliders in scroll history (dimmed, disabled)
- **Archived**: Removed by swipe left (hidden, can be restored)

**Benefits:**
- Scroll back through history to see previous settings
- All settings preserved in DOM for reference
- Clean visual hierarchy

### 3. Gesture Controls

#### Swipe Left → Archive
- Remove slider from view
- Soft delete (can be restored from state)

#### Swipe Right → Add to Quick Settings
- Adds slider to floating Quick Settings panel
- Quick access to frequently used controls

#### Long Click → MIDI CC Capture
- Enter MIDI learn mode (yellow pulsing border)
- Move any MIDI controller to map it
- Format: `[cc:27:{a,b,c,d}]`
  - `cc:27` = Control Change number 27
  - `{a,b,c,d}` = Channel mapping (a=ch1, b=ch2, c=ch3, d=ch4)

### 4. Category Colors (Token Design)

Each slider category has its own color scheme:

| Category   | Primary Color | Usage                  |
|------------|---------------|------------------------|
| console    | Orange        | console.vt100.*        |
| game       | Purple        | game.vt100.*           |
| tines      | Magenta       | tines.*                |
| midi       | Yellow        | midi.*                 |
| vecterm    | Green         | vecterm.*              |
| gamepad    | Blue          | gamepad.*              |
| default    | Cyan          | Other commands         |

**Visual indicators:**
- Colored left border bar (4px)
- Colored label text
- Colored slider thumb

### 5. Quick Settings Panel

Floating panel in top-right corner showing frequently used sliders.

**Features:**
- Swipe right on any slider to add it
- Mini sliders with same functionality
- Persistent across sessions (localStorage)
- Toggle visibility with **−** button
- Remove individual sliders with **×** button

### 6. MIDI CC Capture

**Format Example:**
```
console.vt100.scanspeed [cc:27:{a,b,c,d}]
```

**Workflow:**
1. Long click on slider
2. Yellow pulsing border appears
3. Move a MIDI controller (knob, slider, etc.)
4. Mapping captured and saved to localStorage
5. Real-time MIDI control activated

**Channel Mapping:**
- `a` = Channel 1
- `b` = Channel 2
- `c` = Channel 3
- `d` = Channel 4

(Can be customized later for specific channels)

## Usage Examples

### Basic Usage

```bash
# Type command and space+tab
console.vt100.glow <space><tab>
# Slider appears with orange color (console category)

# Adjust value with slider
# Press Enter or Escape to move to history
```

### Gesture Controls

```bash
# Create a slider
console.vt100.scanlines <space><tab>

# Swipe right → Added to Quick Settings ⚡
# Swipe left → Archived (removed from view)
# Long click → MIDI learn mode 🎹
```

### MIDI Mapping

```bash
# Long click on slider
# (Yellow pulsing border appears)
# Move MIDI controller CC #27
# ✓ MIDI Mapped: console.vt100.scanspeed [cc:27:{a,b,c,d}]
```

## Code Integration

### Importing in app.js

```javascript
// Initialize the slider system
import { initQuickSettings } from './cli/quick-settings.js';
import { initGestureHandler } from './cli/slider-gestures.js';

// On app init
initQuickSettings();
```

The system auto-initializes on first slider creation via tab completion.

### Accessing Lifecycle Manager

```javascript
import { getLifecycleManager } from './cli/slider-lifecycle.js';

const manager = getLifecycleManager();
const activeSlider = manager.getActiveSlider();
const allHistory = manager.getSlidersByState('history');
```

## Persistence

### localStorage Keys

- `vecterm-slider-state` - Slider lifecycle state
- `vecterm-quick-settings` - Quick Settings panel contents
- `vecterm-midi-mappings` - MIDI CC mappings

## Visual Feedback

### Animations

- **Slider creation**: Slide in from top with fade
- **MIDI learn mode**: Pulsing yellow glow
- **Long press**: Scale up with flash
- **Swipe left**: Slide out left with fade
- **Swipe right**: Slight bounce right

### State Indicators

- **🎹** = MIDI mapped
- **⚡** = In Quick Settings
- **Dimmed** = History state
- **Hidden** = Archived

## Technical Details

### Slider ID Format

```
slider-0, slider-1, slider-2, ...
```

Auto-incremented counter ensures unique IDs.

### State Machine

```
[created] → ACTIVE
          → (Enter/Esc) → HISTORY
          → (Swipe left) → ARCHIVED
          → (Reactivate) → ACTIVE
```

### Category Detection

```javascript
const category = command.split('.')[0];
// 'console.vt100.glow' → 'console' → orange color
```

## Browser Compatibility

- **MIDI**: Requires Web MIDI API (Chrome, Edge, Opera)
- **Touch gestures**: Works on all touch devices
- **Mouse gestures**: Works on all browsers
- **CSS**: Modern browsers (Chrome, Firefox, Safari, Edge)

## Performance

- **Memory**: Sliders kept in DOM but hidden when archived
- **DOM nodes**: ~10-15 nodes per slider
- **Event listeners**: Managed and cleaned up properly
- **Storage**: Minimal localStorage usage (~1-5KB)

## Future Enhancements

1. **Custom channel mapping**: UI to select specific MIDI channels
2. **Preset system**: Save/load slider configurations
3. **Drag to reorder**: Reorder sliders in Quick Settings
4. **Export/import**: Share slider configurations
5. **Keyboard shortcuts**: Rapid slider access

## Testing

### Manual Tests

1. **Space+tab**: Type `console.vt100.glow ` + tab → Slider appears
2. **Ambiguity**: Try `console.vt100.glow` and `console.vt100.glowspeed` separately
3. **History**: Create multiple sliders, press Enter, scroll back to see them
4. **Swipe left**: Remove slider (on mobile or with mouse drag)
5. **Swipe right**: Add to Quick Settings
6. **Long click**: Enter MIDI learn mode
7. **Categories**: Check colors for different command categories

## Notes

- Sliders are designed for **continuous variables** only
- Discrete commands (like toggles) should use buttons or different UI
- The system is **stateful** - all interactions are saved
- Gesture thresholds are tuned for both touch and mouse
- MIDI learn has a 10-second timeout

## Credits

- Designed for vecterm CLI system
- Uses token-based color design
- Implements Material Design gesture patterns
- MIDI integration following Web MIDI API spec
