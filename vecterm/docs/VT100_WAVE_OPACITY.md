# VT100 Wave Opacity Effect

## Overview

The **Wave Opacity** effect controls the intensity of the cycling opacity on the raster wave gradient overlay. This is the subtle pulsing vertical gradient you see in the background of the CLI terminal.

## What It Does

The raster wave effect creates a vertical gradient overlay that:
- Moves horizontally based on `wave` (amplitude)
- Cycles at speed controlled by `wavespeed`
- **Pulses opacity** between 80% and 100% of the `waveopacity` value

### Visual Effect

```
Min Opacity (0%, 100%): waveopacity × 0.8
Max Opacity (50%):      waveopacity × 1.0
```

The gradient itself:
```css
linear-gradient(
  180deg,
  transparent 0%,
  rgba(79, 195, 247, 0.03) 50%,  /* Subtle cyan */
  transparent 100%
)
```

## Configuration

### Effect Definition

```javascript
{
  id: 'waveopacity',
  label: 'Wave Opacity',
  min: 0,
  max: 1,
  step: 0.05,
  default: 0.6,
  unit: '',
  description: 'Raster wave overlay opacity intensity',
  cssVar: '--vt100-wave-opacity',
  category: 'visual'
}
```

### CSS Variable

```css
--vt100-wave-opacity: 0.6;
```

### Animation

```css
@keyframes vt100RasterWave {
  0%, 100% {
    transform: translateX(0px) scaleX(1.0);
    opacity: calc(var(--vt100-wave-opacity) * 0.8);  /* 80% at endpoints */
  }
  50% {
    transform: translateX(var(--vt100-wave-amplitude)) scaleX(1.002);
    opacity: var(--vt100-wave-opacity);  /* 100% at peak */
  }
}
```

## Usage

### CLI Commands

```bash
# Get current value
vt100.waveopacity

# Set value
vt100.waveopacity 0.8

# Show all VT100 settings
vt100.status

# Reset to default (0.6)
vt100.reset
```

### JavaScript API

```javascript
import { vt100Effects } from './modules/vt100-effects.js';

// Set wave opacity
vt100Effects.setEffect('waveopacity', 0.8);

// Get current value
const opacity = vt100Effects.getEffect('waveopacity');

// Disable the effect (set to 0)
vt100Effects.setEffect('waveopacity', 0);
```

## Effect Values

| Value | Description | Visual Result |
|-------|-------------|---------------|
| 0.0 | Disabled | No gradient overlay visible |
| 0.3 | Very Subtle | Barely noticeable pulsing |
| 0.6 | Default | Balanced CRT simulation |
| 0.8 | Strong | Noticeable gradient cycling |
| 1.0 | Maximum | Very prominent overlay |

## Interaction with Other Effects

The wave opacity works together with:

- **`wave`** (Raster Wave Amplitude) - Controls horizontal movement
- **`wavespeed`** (Wave Speed) - Controls animation speed
- **`glow`** (Phosphor Glow) - Combined creates authentic CRT look
- **`scanlines`** (Scanlines) - Layered on top of wave effect

### Layering Order (front to back)

```
1. Scanlines (#cli-panel::before) - z-index: 100
2. Raster Wave (#cli-panel::after) - z-index: 99
3. Terminal Content - z-index: 1-10
4. Background
```

## CSS Implementation

### The Gradient Overlay

```css
#cli-panel::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(79, 195, 247, 0.03) 50%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 99;
  animation: vt100RasterWave var(--vt100-wave-speed) ease-in-out infinite;
}
```

The gradient is:
- **Vertical** (180deg)
- **Subtle cyan tint** (79, 195, 247 = #4fc3f7)
- **Very low base opacity** (0.03)
- **Fades at edges** (transparent at 0% and 100%)

The animation opacity multiplies this base opacity:
- At `waveopacity: 0.6`, the peak opacity is `0.6 * 0.03 = 0.018` (1.8%)
- At `waveopacity: 1.0`, the peak opacity is `1.0 * 0.03 = 0.03` (3%)

## Synchronization

Wave opacity is fully synchronized across all UI controls:
- ✅ Quick Settings panel
- ✅ CLI tab sliders
- ✅ VT100 hamburger menu
- ✅ Settings panel
- ✅ Command-line interface

Moving any slider updates all other sliders in real-time.

## Disabling the Effect

To completely disable the pulsing gradient:

```bash
vt100.waveopacity 0
```

Or set it very low for subtle effect:

```bash
vt100.waveopacity 0.1
```

## Advanced: Custom Gradient

To modify the gradient itself (requires CSS editing):

```css
#cli-panel::after {
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(255, 0, 255, 0.05) 50%,  /* Custom color: magenta */
    transparent 100%
  );
}
```

## Total VT100 Effects (9)

The wave opacity is now the **9th configurable VT100 effect**:

1. Phosphor Glow (`glow`)
2. Scanlines (`scanlines`)
3. Scan Speed (`scanspeed`)
4. Raster Wave (`wave`)
5. Wave Speed (`wavespeed`)
6. **Wave Opacity (`waveopacity`)** ⭐ NEW
7. Border Glow (`border`)
8. Glow Pulse Speed (`glowspeed`)
9. Border Width (`borderwidth`)

All effects are data-driven from `config/vt100-config.js`.
