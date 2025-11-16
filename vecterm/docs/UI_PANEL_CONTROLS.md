# UI Panel Controls - Complete Guide

## Overview

Vecterm has 5 main UI panels that can be shown/hidden to customize your workspace:
- **Top Bar** - HUD with mode, context, FPS, entity count
- **Left Sidebar** - Game and system settings
- **Right Sidebar** - State monitor and inspector
- **Footer** - Quick panel toggles and system info
- **CLI Terminal** - VT100 terminal for commands

## 3 Ways to Control Panels

### 1. Button Toggles (Footer)

Located in the **footer** (bottom bar) under "Panel Visibility":
- **T** - Toggle Top Bar
- **L** - Toggle Left Sidebar
- **R** - Toggle Right Sidebar
- **B** - Toggle Footer (bottom)
- **⚡** - Toggle Quick Settings

The **CLI Terminal** has its own FAB button (bottom-right corner with terminal icon).

### 2. Keyboard Shortcuts

**Global shortcuts** (work anywhere except when typing in CLI):

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | Toggle Top Bar |
| `Ctrl+L` | Toggle Left Sidebar |
| `Ctrl+R` | Toggle Right Sidebar |
| `Ctrl+B` | Toggle Footer |
| `` ` `` (backtick) | Toggle CLI Terminal |

**Note:** Shortcuts are disabled when typing in the CLI input to avoid conflicts.

### 3. CLI Commands

Open the CLI terminal (`` ` `` or click terminal FAB) and use these commands:

```bash
# Toggle (show/hide)
ui.toggle top
ui.toggle left
ui.toggle right
ui.toggle bottom
ui.toggle cli

# Show explicitly
ui.show top
ui.show left
ui.show right
ui.show bottom

# Hide explicitly
ui.hide top
ui.hide left
ui.hide right
ui.hide bottom

# Get help
ui.help
```

**Panel name aliases:**
- `top`, `topbar` → Top Bar
- `left` → Left Sidebar
- `right` → Right Sidebar
- `bottom`, `footer` → Footer
- `cli`, `terminal` → CLI Terminal

## Common Scenarios

### Scenario 1: "I hid the top bar and can't get it back!"

**Solution 1 - Keyboard:**
```
Press: Ctrl+T
```

**Solution 2 - Footer Button:**
1. Look at the bottom footer
2. Click the **T** button in "Panel Visibility"

**Solution 3 - CLI:**
1. Open terminal: Press `` ` ``
2. Type: `ui.show top`

### Scenario 2: "I want full screen play field (hide everything)"

**Via CLI:**
```bash
ui.hide top
ui.hide left
ui.hide right
ui.hide bottom
```

**Via Keyboard:**
```
Ctrl+T  (hide top)
Ctrl+L  (hide left)
Ctrl+R  (hide right)
Ctrl+B  (hide footer)
```

**To restore:**
```
Ctrl+T  (show top)
Ctrl+L  (show left)
Ctrl+R  (show right)
Ctrl+B  (show footer)
```

### Scenario 3: "I want minimal UI for gaming"

Keep only the top bar (HUD):
```bash
ui.hide left
ui.hide right
ui.hide bottom
ui.show top
```

### Scenario 4: "I closed everything by accident!"

**Don't panic!** You can always use keyboard shortcuts:
```
Ctrl+B  (show footer first)
```

Then use the footer buttons to show other panels.

Or open CLI:
```
` (backtick)
ui.show top
ui.show left
ui.show right
ui.show bottom
```

## Panel Persistence

Panel visibility is saved to `localStorage` automatically:
- Settings persist across page reloads
- Each panel has its own state: `vecterm-panel-<panel-id>`
- Clear all settings: Footer → localStorage → Clear Storage

## Browser Console Access

You can also toggle panels via browser console (F12):

```javascript
// Show top bar
document.getElementById('top-bar').classList.remove('hidden');

// Hide top bar
document.getElementById('top-bar').classList.add('hidden');

// Toggle
const topBar = document.getElementById('top-bar');
topBar.classList.toggle('hidden');
```

## Architecture

**Panel IDs:**
- `top-bar`
- `left-sidebar`
- `right-sidebar`
- `footer`
- `cli-panel`

**Toggle Button IDs:**
- `toggle-top-bar`
- `toggle-left-sidebar`
- `toggle-right-sidebar`
- `toggle-footer`
- `cli-fab` (special FAB button for CLI)

**CSS Classes:**
- `.hidden` - Applied to hide panels
- `.toggle-active` - Applied to buttons when panel is visible

## Z-Index Layering

From bottom to top:
1. `--z-base: 0` - Main canvas (play field)
2. `--z-content: 10` - Regular content
3. `--z-sidebar: 50` - Left/Right sidebars
4. `--z-cli: 55` - CLI panel
5. `--z-fab: 60` - FAB button
6. `--z-topbar: 100` - Top bar (overlays everything)
7. `--z-modal: 5001` - Modals

This ensures the top bar always appears on top of the canvas, even when positioned at `top: 0`.

## Tips

1. **Quick Toggle Top Bar**: `Ctrl+T` is the fastest way
2. **Full Immersion**: Hide all panels for maximum play field
3. **CLI Always Available**: Press `` ` `` from anywhere
4. **Footer is Your Friend**: If lost, show footer first (`Ctrl+B`)
5. **Check Console**: Boot logs show keyboard shortcuts on startup

## Troubleshooting

**Shortcuts not working?**
- Make sure you're not typing in the CLI input
- Check browser console for conflicts
- Try reloading the page

**Panels won't show/hide?**
- Check browser console for errors
- Clear localStorage and reload
- Verify panel IDs exist in DOM

**Lost all UI?**
1. Press `` ` `` (backtick) - opens CLI
2. Type: `ui.show top` and `ui.show bottom`
3. Or press `Ctrl+B` to show footer
4. Or reload page (F5)
