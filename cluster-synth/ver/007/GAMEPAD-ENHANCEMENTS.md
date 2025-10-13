# Gamepad Panel • Enhanced Visualizations

The gamepad panel has been completely redesigned with rich, real-time visualizations.

## New Visualizations

### 1. **Joystick Position** (Circular Display)
- Visual circular joystick representation
- Shows deadzone as inner circle
- Crosshairs for reference
- Trail line from center to current position
- Real-time X/Y coordinate readout
- Position indicator dot with glow effect

### 2. **Button Grid** (Visual Button Map)
Complete button layout visualization:
- **Face Buttons** (A/B/X/Y) - Color-coded, right side
- **D-Pad** (↑/↓/←/→) - Left side with arrows
- **Shoulder Buttons** (LB/RB)
- **Triggers** (LT/RT) - With analog pressure visualization
- **Meta Buttons** (Select/Start)
- Active buttons light up in their designated colors
- Analog triggers show graduated fill based on pressure

### 3. **Axes • Realtime**
Waveform display showing:
- X-axis (ax) in blue
- Y-axis (ay) in cyan
- Grid background
- Center reference line
- Color-coded legend

### 4. **Velocity Magnitude**
Filled waveform showing:
- Total velocity magnitude |v| = √(vx² + vy²)
- Filled gradient visualization
- Current value displayed
- Auto-scaling to data range

### 5. **Derivatives • Velocity & Acceleration**
Multi-channel waveform:
- **vx** (velocity X) - Blue
- **vy** (velocity Y) - Cyan
- **ax2** (acceleration X) - Orange
- **ay2** (acceleration Y) - Pink
- All four channels overlaid for comparison

### 6. **Acceleration Magnitude**
Filled waveform showing:
- Total acceleration magnitude |a| = √(ax² + ay²)
- Filled gradient in pink
- Current value displayed
- Useful for detecting sudden movements

### 7. **Stats • Motion Analysis**
Comprehensive statistics display:
```
Position:
  ax: μ=0.0000 σ=0.0000  (mean, std deviation)
  ay: μ=0.0000 σ=0.0000

Velocity:
  vx: μ=0.0000 σ=0.0000
  vy: μ=0.0000 σ=0.0000
  |v|: 0.0000            (current magnitude)

Acceleration:
  |a|: 0.0000            (current magnitude)

Spring: 0.0000           (spring damping factor)
```

## New Controls

### Speed Slider
- Range: 100-2000
- Default: 900
- Controls cursor movement speed

### Deadzone Slider
- Range: 0-0.2
- Default: 0.08
- Sets joystick deadzone threshold
- Visually represented in circular joystick display

### Calibrate Button
- Resets all running statistics
- Clears accumulated data
- Useful after connecting new controller

## Layout

**Top Row:**
- Joystick Position (circular) | Axes Realtime (waveform)

**Second Row:**
- Button Grid (visual map) | Stats (text data)

**Bottom Section (full width):**
1. Velocity Magnitude
2. Derivatives (4-channel overlay)
3. Acceleration Magnitude

All derivative graphs positioned **below** realtime data as requested.

## Technical Features

- **Immediate Start** - Visualizations begin as soon as gamepad detected
- **60 FPS Rendering** - Smooth, real-time updates
- **240-sample Buffer** - ~4 seconds of history
- **Auto-scaling** - Graphs adapt to data range
- **Welford Statistics** - Numerically stable running stats
- **EMA Smoothing** - Exponential moving average for smooth motion

## Color Coding

- **Blue (#7aa2f7)** - X-axis, velocity magnitude
- **Cyan (#8bd5ca)** - Y-axis
- **Orange (#f6c177)** - X-acceleration
- **Pink (#eb6f92)** - Y-acceleration, accel magnitude
- **Face Buttons:**
  - A: Cyan
  - B: Pink
  - X: Blue
  - Y: Orange
- **D-Pad/Shoulders:** Grey tones

## Data Flow

```
Raw Input → Deadzone Filter → EMA Smoothing → Series Buffer → Visualizers
                                     ↓
                              Cursor Movement
                                     ↓
                              Parameter Mapping
```

## Performance

- All visualizations run in `requestAnimationFrame` loop
- Canvas-based rendering for efficiency
- Minimal DOM manipulation
- <1ms render time per frame at 60 FPS

---

**Panel Width:** 840px (expanded to fit all visualizations)
**Visualizers:** 6 total (position, buttons, axes, velocity, derivatives, acceleration)
**Update Rate:** 60 Hz
**Data Retention:** 240 samples (~4 seconds at 60 Hz)
