# Vecterm UI Panels Guide

## Overview

Vecterm has multiple panels and UI surfaces. This guide clarifies the purpose and location of each.

## The Two Settings Systems

### 1. System Settings Panel

**ID**: `#settings-panel`
**Title**: "SYSTEM SETTINGS"
**Location**: Center overlay (modal)
**Trigger**: Click ⚙ icon in top-right bar
**Purpose**: Complete system configuration

**Contents:**
- Grid System settings
- VT100 Effects (all 9 effects with sliders)
- Camera settings (3D mode)
- Gamepad input configuration
- UI controls

**Characteristics:**
- Static, predefined controls
- Comprehensive settings
- Modal overlay that covers screen
- Hardcoded in `index.html`

### 2. Quick Settings Panel (Dynamic)

**ID**: `#quick-settings-panel`
**Title**: "⚡ Quick Settings"
**Location**: Right side of screen (floating)
**Trigger**: Automatically shows when sliders are added
**Purpose**: Quick access to frequently-used sliders

**Contents:**
- User-customized slider collection
- Add sliders by swiping right on CLI sliders
- Remove sliders with × button
- Saved to localStorage

**Characteristics:**
- Dynamic content (user-controlled)
- Only shows sliders you've added
- Persists across sessions
- Managed by `cli/quick-settings.js`

## Visual Comparison

```
┌─────────────────────────────────────┐
│  ⚙ SYSTEM SETTINGS (Modal Overlay) │
├─────────────────────────────────────┤
│                                     │
│  Grid System                        │
│  ├─ Grid Type: [dropdown]           │
│  ├─ Show Grid Overlay [checkbox]    │
│  └─ Snap to Grid [checkbox]         │
│                                     │
│  VT100 Effects                      │
│  ├─ Phosphor Glow: [━━━○━━] 0.30   │
│  ├─ Scanlines:     [━━━○━━] 0.15   │
│  ├─ Scan Speed:    [━━━○━━] 8s     │
│  ├─ Raster Wave:   [━━━○━━] 2px    │
│  ├─ Wave Speed:    [━━━○━━] 3s     │
│  ├─ Wave Opacity:  [━━━○━━] 0.60   │
│  ├─ Border Glow:   [━━━○━━] 0.40   │
│  ├─ Glow Speed:    [━━━○━━] 2s     │
│  └─ Border Width:  [━━━○━━] 1px    │
│                                     │
│  Camera (3D)                        │
│  Gamepad Input                      │
│  UI Controls                        │
│                                     │
└─────────────────────────────────────┘
```

```
                              ┌──────────────────────┐
                              │ ⚡ Quick Settings  − │
                              ├──────────────────────┤
                              │ glow   [═○══] 0.30 × │
                              │ wave   [═○══] 2px  × │
                              │ border [═○══] 0.40 × │
                              └──────────────────────┘
                                    (Right sidebar)
```

## Other UI Panels

### 3. VT100 Hamburger Menu

**ID**: `#vt100-params`
**Title**: None (inline controls)
**Location**: Center of CLI terminal (overlay)
**Trigger**: Click ☰ icon in terminal
**Purpose**: Quick VT100 effect adjustments while using terminal

**Contents:**
- 3 most common VT100 effects (glow, scanlines, wave)
- Minimal UI for quick tweaks
- Dynamically generated from `VT100_MENU_EFFECTS`

### 4. CLI Tab Sliders

**ID**: Individual sliders in `#cli-output`
**Title**: Command-specific
**Location**: Inline in CLI output
**Trigger**: Type command + TAB (e.g., `vt100.glow<TAB>`)
**Purpose**: Interactive parameter adjustment via CLI

**Contents:**
- Single slider per command
- Appears in command history
- Can be swiped right to add to Quick Settings
- Managed by `slider-lifecycle.js`

### 5. Right Sidebar (Monitor)

**ID**: `#right-sidebar`
**Title**: "VECTERM MONITOR"
**Location**: Right edge of screen
**Trigger**: Always visible (collapsible)
**Purpose**: Developer/debug information

**Contents:**
- State Flow visualization
- Current State (Redux)
- Action History
- MIDI Controller status
- Config controls
- Theme tokens

## Hierarchy & Purpose

```
System-wide Configuration
├─ System Settings Panel ⚙
│  └─ Grid, VT100, Camera, Gamepad, UI
│
User Workflow
├─ Quick Settings Panel ⚡
│  └─ Custom slider collection (user-curated)
│
Terminal-focused
├─ VT100 Hamburger Menu ☰
│  └─ Essential VT100 effects only
│
Command-line Integration
├─ CLI Tab Sliders
│  └─ Interactive command parameters
│
Developer/Debug
└─ Right Sidebar (Monitor)
   └─ State, actions, MIDI, theme
```

## Usage Patterns

### For End Users

1. **System Settings** - Set up your environment once
2. **Quick Settings** - Access your favorite controls quickly
3. **VT100 Menu** - Tweak effects while in terminal
4. **CLI Sliders** - Fine-tune via commands

### For Developers

1. **Right Sidebar** - Monitor state and actions
2. **System Settings** - Configure development environment
3. **CLI** - Test commands and parameters

## Panel States

### System Settings Panel

```javascript
// Show
document.getElementById('toggle-settings').click();

// Hide
document.getElementById('settings-close').click();
```

### Quick Settings Panel

```javascript
import { getQuickSettings } from './cli/quick-settings.js';

const qs = getQuickSettings();
qs.show();
qs.hide();
qs.toggle();
```

### VT100 Hamburger Menu

```javascript
import { initVT100Params } from './cli/vt100-params.js';

// Toggle via hamburger button
document.getElementById('vt100-menu-toggle').click();
```

## Naming Clarification

| Old Name | New Name | ID | Purpose |
|----------|----------|-----|---------|
| Quick Settings | **System Settings** | `#settings-panel` | Comprehensive system config |
| Quick Settings | **Quick Settings** | `#quick-settings-panel` | User-curated slider collection |

The rename eliminates confusion between the two panels.

## Synchronization

All VT100 effect controls are synchronized:
- System Settings sliders
- Quick Settings sliders
- VT100 Hamburger Menu sliders
- CLI Tab sliders
- Command-line values

Moving any slider updates all others in real-time via `window.Vecterm.update()` and the parameter notification system.

## Storage

### System Settings
- Not persisted (uses defaults from config)
- Can be saved/loaded via Redux state management

### Quick Settings
- Persisted to `localStorage` key: `vecterm-quick-settings`
- Stores command names only
- Recreates sliders on page load

### Sidebar State
- Collapsed/expanded state persisted
- Section collapsed states persisted

## Adding New Controls

### To System Settings
Edit `index.html` directly (static)

### To Quick Settings
User adds via swipe gesture on CLI sliders

### To VT100 Menu
Edit `VT100_MENU_EFFECTS` in `config/vt100-config.js`

### To CLI Tab Completion
Add to `CONTINUOUS_COMMANDS` in `cli/tab-completion.js`
(Or use `createTabCompletionConfig()` for VT100 effects)
