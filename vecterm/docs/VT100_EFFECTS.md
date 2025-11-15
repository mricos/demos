# VT100 Effects System

## Overview

The Vecterm system implements authentic CRT/VT100 phosphor monitor effects for both the terminal display and 3D graphics rendering. Effects are controlled through the Settings panel and apply in real-time.

## Architecture

### Layering (Z-Index Stack)
```
z-index: 10  → VT100 Canvas (VScope overlay, foreground)
z-index: 1   → CLI Output (terminal text)
z-index: 0   → Vecterm Canvas (3D graphics, background)
```

### Effect Application

1. **Terminal Panel Effects** (`#cli-panel`)
   - CSS-based effects via CSS variables
   - Border glow, scanlines, raster wave
   - Applied to entire terminal container

2. **3D Graphics Effects** (Vecterm renderer)
   - Canvas 2D API effects
   - Multi-pass phosphor glow
   - Scanlines, chromatic aberration, glitch effects
   - Rendered per-frame during 3D drawing

## VT100 Controls

Located in Settings → VT100 Effects

### Phosphor Glow (0.0 - 2.0)
**Purpose:** Simulates CRT phosphor bloom

**Implementation:**
- Multi-pass rendering with layered blur (30px, 15px, 5px)
- Intensity scales all passes
- Triggers chromatic aberration at >0.5
- Enables glitch effects at >1.0

**Files:**
- `Vecterm.js:373-410` - Multi-pass glow rendering
- `Vecterm.js:492-522` - Chromatic aberration & glitches

### Scanlines (0.0 - 1.0)
**Purpose:** Horizontal scan line effect

**Implementation:**
- Every other pixel darkened
- Animated scrolling based on scanlineSpeed
- Varying intensity with sine wave pattern

**Files:**
- `Vecterm.js:476-490` - Scanline rendering
- Terminal: CSS `--vt100-scanline-intensity`

### Scan Speed (0.5s - 30s)
**Purpose:** Scanline animation speed

**Implementation:**
- Controls CSS animation duration
- Applied to terminal panel

**Files:**
- Terminal: CSS `--vt100-scanline-speed`

### Raster Wave (0px - 30px)
**Purpose:** Horizontal displacement distortion

**Implementation:**
- CSS-based wave displacement
- Applied to terminal panel only

**Files:**
- Terminal: CSS `--vt100-wave-amplitude`

### Border Glow (0.0 - 2.0)
**Purpose:** Terminal border illumination

**Implementation:**
- CSS box-shadow on terminal panel
- Scales intensity and radius
- Does NOT affect vecterm canvas

**Files:**
- Terminal: CSS `--vt100-glow-intensity`

## Effect Synchronization

### Terminal ↔ 3D Graphics

Event handlers in `ui/event-handlers.js` update both:

```javascript
// Phosphor Glow example
glowIntensity.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);

  // Update Redux state
  store.dispatch(Actions.vectermSetConfig({ glowIntensity: value }));

  // Update vecterm renderer directly
  const vectermRenderer = window.Vecterm.vectermControls.getVectermRenderer();
  if (vectermRenderer) {
    vectermRenderer.config.glowIntensity = value;
  }
});
```

## Advanced Effects

### Chromatic Aberration
- Activates when `glowIntensity > 0.5`
- RGB channel separation (red/blue shift)
- Creates color fringing like old CRTs

### Random Glitch
- 1% chance per frame when `glowIntensity > 1.0`
- Horizontal slice displacement
- Simulates signal interference

### Scanline Variation
- Sine wave modulation of scanline intensity
- Creates flickering/breathing effect
- Formula: `variation = sin(y * 0.1 + time) * 0.2 + 0.8`

## Performance Considerations

### Multi-Pass Glow Cost
- 3 passes per line when glow enabled
- Outer (30px blur) → Middle (15px) → Core (5px)
- Use lower glow values for better performance

### Effect Priorities
1. Glow (most expensive - 3x draw calls)
2. Chromatic aberration (2x canvas draws)
3. Scanlines (cheap - fillRect loop)
4. Glitch (rare - 1% trigger rate)

## Configuration

### Vecterm Config Object
```javascript
{
  backgroundColor: 'transparent',
  phosphorColor: '#00ff88',
  lineWidth: 1,
  glowIntensity: 0.3,        // 0-2
  scanlineIntensity: 0.15,   // 0-1
  scanlineSpeed: 8,          // seconds
  hiddenLineRemoval: true,
  backfaceCulling: true
}
```

### CSS Variables
```css
--vt100-scanline-intensity: 0.15;
--vt100-scanline-speed: 8s;
--vt100-wave-amplitude: 2px;
--vt100-glow-intensity: 0.4;
--vt100-glow-speed: 2s;
```

## Usage Examples

### Subtle Vintage Look
```
Phosphor Glow: 0.3
Scanlines: 0.15
Border Glow: 0.4
```

### Intense Bloom Effect
```
Phosphor Glow: 1.5
Scanlines: 0.3
Border Glow: 1.5
(Chromatic aberration auto-enabled)
```

### Glitching Monitor
```
Phosphor Glow: 2.0
Scanlines: 0.5
Scan Speed: 3s
(Random glitches enabled)
```

## Files Reference

### Core Rendering
- `Vecterm.js` - 3D renderer with effects
- `vecterm-demo.js` - Demo setup and animation

### UI Controls
- `index.html:365-402` - VT100 Effects section
- `ui/event-handlers.js:349-447` - Event handlers
- `style.css:655-710` - Slider styling

### Effects Implementation
- `Vecterm.js:366-411` - Multi-pass glow
- `Vecterm.js:473-523` - Post-processing effects

## Future Enhancements

### Potential Additions
- [ ] Phosphor persistence/trails
- [ ] Color palette swap (amber/green/white)
- [ ] Screen curvature distortion
- [ ] Vignette/corner darkening
- [ ] Refresh rate flicker
- [ ] Focus/defocus blur
