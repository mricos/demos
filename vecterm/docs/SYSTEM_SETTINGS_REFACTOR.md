# System Settings Panel Refactor

## Changes Made

### 1. Renamed Panel
- **OLD**: "QUICK SETTINGS" ❌
- **NEW**: "SYSTEM SETTINGS" ✅

This eliminates confusion with the actual Quick Settings panel (⚡ on right sidebar).

### 2. Collapsible Sections

All sections are now collapsible with ▼/▶ indicators:

```
[ SYSTEM SETTINGS ]                    ×

Grid System ▼
  Grid Type: [dropdown]
  ☑ Show Grid Overlay
  ☑ Snap to Grid

Vecterm VT100 Effects ▼
  Phosphor Glow:  [━━━○━━━] 0.30
  Scanlines:      [━━━○━━━] 0.15
  ...

Camera (3D) ▼
  Field of View:  [━━━○━━━] 60°
  [Reset Camera]

Gamepad Input ▼
  No gamepad connected
  ...

UI Controls ▼
  [Toggle Sidebar]
```

Click section headers to collapse/expand.

### 3. Compact Layout

**Before:**
```
Phosphor Glow:
[━━━━━○━━━━━] 0.30
```

**After:**
```
Phosphor Glow:  [━━━━━○━━━━━] 0.30
```

All on one line with proper alignment.

### 4. Code Font

Labels and values now use monospace font:
- Labels: `font-family: var(--font-code)` (Monaco/Courier)
- Values: `font-family: var(--font-code)`

### 5. Flexbox Layout

```css
.settings-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings-group label {
  min-width: 140px;  /* Fixed label width */
  flex-shrink: 0;
}

.settings-group input[type="range"] {
  flex: 1;  /* Slider fills available space */
}

.settings-group span {
  min-width: 50px;  /* Fixed value width */
  text-align: right;
  flex-shrink: 0;
}
```

## Visual Comparison

### Before
```
VT100 Effects

  Phosphor Glow:
  [━━━━━━━○━━━━━] 0.30

  Scanlines:
  [━━━━━━━○━━━━━] 0.15

  (Lots of vertical space)
```

### After
```
Vecterm VT100 Effects ▼

Phosphor Glow:   [━━━━━━━○━━━━━] 0.30
Scanlines:       [━━━━━━━○━━━━━] 0.15
Scan Speed:      [━━━━━━━○━━━━━] 8s
Raster Wave:     [━━━━━━━○━━━━━] 2px
Wave Speed:      [━━━━━━━○━━━━━] 3s
Wave Opacity:    [━━━━━━━○━━━━━] 0.60
Border Glow:     [━━━━━━━○━━━━━] 0.40

(Compact and scannable)
```

## Implementation Details

### HTML Structure

```html
<div class="settings-section">
  <h4 class="settings-title collapsible" data-settings-section="vt100">
    Vecterm VT100 Effects ▼
  </h4>
  <div class="settings-section-content" id="settings-vt100">
    <div class="settings-group">
      <label for="glow-intensity">Phosphor Glow:</label>
      <input type="range" id="glow-intensity" ...>
      <span id="glow-value">0.30</span>
    </div>
    <!-- More settings-groups -->
  </div>
</div>
```

### JavaScript (Event Handlers)

```javascript
// System Settings section collapse toggle
document.querySelectorAll('.settings-title.collapsible').forEach(title => {
  title.addEventListener('click', () => {
    const section = title.dataset.settingsSection;
    const content = document.getElementById(`settings-${section}`);
    content.classList.toggle('collapsed');
    title.classList.toggle('collapsed');

    // Update arrow indicator
    if (title.classList.contains('collapsed')) {
      title.textContent = title.textContent.replace('▼', '▶');
    } else {
      title.textContent = title.textContent.replace('▶', '▼');
    }
  });
});
```

### CSS

```css
.settings-section-content {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  opacity: 1;
  overflow: hidden;
}

.settings-section-content.collapsed {
  max-height: 0;
  opacity: 0;
}

.settings-title.collapsible {
  cursor: pointer;
  user-select: none;
}

.settings-title.collapsible:hover {
  color: #00ff88;
}
```

## Sections

1. **Grid System** - Grid type, visibility, snapping
2. **Vecterm VT100 Effects** - 9 terminal CRT effects
3. **Camera (3D)** - FOV and camera controls
4. **Gamepad Input** - Controller configuration
5. **UI Controls** - Sidebar toggle and UI settings

## Benefits

1. **Compact** - More controls visible without scrolling
2. **Scannable** - Aligned layout makes values easy to compare
3. **Professional** - Code font emphasizes technical nature
4. **Organized** - Collapsible sections reduce clutter
5. **Consistent** - Matches sidebar panel styling

## Future Enhancements

- [ ] Remember collapsed state in localStorage
- [ ] Add "Collapse All" / "Expand All" buttons
- [ ] Keyboard navigation (arrow keys to collapse/expand)
- [ ] Search/filter settings
- [ ] Preset configurations
