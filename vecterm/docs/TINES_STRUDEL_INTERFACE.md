# Tines Strudel-Style Interface

## Overview

Tines now uses a **Strudel-inspired inline slider interface**! Instead of a separate visual player, tines commands create interactive sliders directly in the CLI output, just like VT100 sliders.

## Key Features

✅ **Inline Sliders** - Commands without args create interactive sliders
✅ **Swipe Gestures** - Swipe-right to add to quick menu
✅ **Direct Control** - Commands with args set values directly
✅ **Magenta Theme** - Tines sliders use magenta color scheme
✅ **Persistent** - Sliders stay in scroll history

## How It Works

### Interactive Sliders (No Arguments)

Type command **without arguments** to create an interactive slider:

```bash
# Create BPM slider
tines.bpm

# Create volume slider
tines.volume
```

**What you get:**
- Interactive slider appears in CLI output
- Drag to adjust in real-time
- Current value displayed
- Magenta theme (tines category color)
- Can swipe-right to add to quick menu!

### Direct Control (With Arguments)

Type command **with arguments** to set value directly:

```bash
# Set BPM directly
tines.bpm 140

# Set volume directly
tines.volume 0.5
```

**What you get:**
- Value set immediately
- Confirmation message in CLI
- No slider created

## Swipe Gestures

Tines sliders support the same gestures as VT100 sliders:

| Gesture | Action |
|---------|--------|
| **Swipe Right** | Add to Quick Settings (⚡ indicator appears) |
| **Swipe Left** | Archive slider (removes from view) |
| **Long Press** | Enter MIDI learn mode (map to MIDI CC) |

## Available Slider Commands

```bash
# Audio Controls
tines.bpm           # Create BPM slider (20-300)
tines.volume        # Create master volume slider (0-1)

# Future (coming soon):
# tines.pan drone     # Create drone pan slider
# tines.attack        # Create attack slider
# tines.release       # Create release slider
```

## Example Workflow

```bash
# 1. Start playing some audio
tines.drone C2 ~ G2 ~

# 2. Create interactive controls
tines.volume        # Creates volume slider
tines.bpm           # Creates BPM slider

# 3. Adjust with sliders in real-time
# (drag the sliders!)

# 4. Add to quick menu
# (swipe-right on any slider)

# 5. Access from quick menu
# (click ⚡ button in footer)
```

## Comparison: Old vs New

### Old (Visual Player)
```
❌ Separate visual player widget
❌ Fixed position above CLI output
❌ Overlapped with sliders
❌ Green theme (didn't match system)
❌ No quick menu integration
❌ Hard to control
```

### New (Strudel-Style)
```
✅ Inline sliders in CLI output
✅ Scrolls naturally with output
✅ No overlap issues
✅ Magenta theme (tines category)
✅ Quick menu integration
✅ Familiar slider interface
```

## Pattern Playback

Pattern playback works the same:

```bash
# Play patterns
tines.drone C2 ~ G2 ~
tines.bells C4 E4 G4 C5

# Control playback
tines.start
tines.pause
tines.resume
tines.stop
```

## Volume Improvements

**Logarithmic Mapping:** Volume sliders now use logarithmic scaling (volume²) for better perceived control

**Lower Default:** Default volume reduced from 0.7 to 0.3

**Better Control:**
- 0% slider = 0% volume (silence)
- 50% slider = 25% volume (comfortable)
- 100% slider = 100% volume (full)

## System Settings Gear

**Fixed:** Settings gear (⚙) now always visible in top-right corner, even when top bar is hidden!

- Position: Fixed top-right
- Always accessible
- Opens left sidebar with system settings
- Circular button with blur background

## CLI Slider Integration

Tines sliders use the same `SliderLifecycleManager` as VT100 sliders:

**States:**
- `ACTIVE` - Current interactive slider
- `HISTORY` - Previous sliders (visible in scroll)
- `ARCHIVED` - Dismissed sliders (hidden)

**Features:**
- Only one active slider at a time
- Previous sliders move to history (dimmed)
- Swipe gestures work identically
- MIDI learn mode available
- Quick Settings integration

## Category Color

Tines uses the **magenta** color scheme:

```javascript
'tines': {
  primary: 'token-magenta',  // #f74fc3
  accent: 'token-purple'     // #9c27b0
}
```

## Help

```bash
# Show all tines commands
tines.help

# Show UI panel controls
ui.help
```

## Technical Details

**Slider Creation:**
- Uses `SliderLifecycleManager.createSlider()`
- Appends to `#cli-output`
- Automatic scroll to view
- Event handlers for real-time updates

**Visual Player:**
- Now DISABLED by default
- Using inline sliders instead
- Can be re-enabled if needed (future config)

**Settings Gear:**
- `position: fixed !important`
- `z-index: calc(var(--z-topbar) + 1)`
- `top: 12px; right: 12px`
- Circular with backdrop blur

## Future Enhancements

Planned slider commands:

```bash
tines.pan drone         # Pan control per channel
tines.attack            # Envelope attack
tines.release           # Envelope release
tines.filter drone      # Filter cutoff
tines.reverb           # Reverb amount
```

Each will create an inline slider just like `tines.volume` and `tines.bpm`!

## Philosophy

**Strudel-Inspired:**
- Inline, immediate feedback
- Visual representation of audio state
- Interactive parameter control
- Familiar slider UX
- CLI-native workflow

**CLI-First:**
- Everything accessible via commands
- Keyboard-friendly
- Scriptable and automatable
- History and recall
- Gesture-enhanced
