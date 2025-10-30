# Phase Field Design System

## Overview

Comprehensive design system inspired by wave interference patterns with technical aesthetics.

## Typography

### Fonts
- **Primary (Monospace)**: Azeret Mono - Technical monospace for code/data
- **Secondary (Sans-serif)**: Space Grotesk - Technical geometric sans

### Font Files
- `/fonts/azeret-mono-400.woff2` - Regular
- `/fonts/azeret-mono-700.woff2` - Bold
- `/fonts/space-grotesk-400.woff2` - Regular
- `/fonts/space-grotesk-700.woff2` - Bold

### Usage
```css
/* Monospace for technical data */
font-family: var(--font-mono);

/* Sans-serif for UI text */
font-family: var(--font-sans);
```

## Color System

### Spectrum Colors
Inspired by wave field visualization:
- **Cyan**: `#00D4FF` - `var(--color-spectrum-cyan)`
- **Blue**: `#0066FF` - `var(--color-spectrum-blue)`
- **Purple**: `#6600FF` - `var(--color-spectrum-purple)`
- **Magenta**: `#FF00FF` - `var(--color-spectrum-magenta)`
- **Green**: `#00FF64` - `var(--color-spectrum-green)`
- **Yellow**: `#FFFF00` - `var(--color-spectrum-yellow)`

### Background Layers
- **Primary**: `#0A0A12` - Deep space
- **Secondary**: `#1A1A2E` - Dark matter
- **Tertiary**: `#2A2A3E` - Nebula
- **Elevated**: `#3A3A4E` - Surface

### Functional Colors
- **Success**: `#00FF64` - `var(--color-success)`
- **Warning**: `#FFB800` - `var(--color-warning)`
- **Error**: `#FF3366` - `var(--color-error)`
- **Info**: `#00D4FF` - `var(--color-info)`

### Gamepad Type Colors
**Clear distinction between controller types:**
- **Xbox**: `#107C10` - `var(--color-gamepad-xbox)` - Xbox green
- **PlayStation**: `#003087` - `var(--color-gamepad-playstation)` - PlayStation blue
- **Nintendo**: `#E60012` - `var(--color-gamepad-nintendo)` - Nintendo red
- **Generic**: `#888888` - `var(--color-gamepad-generic)` - Generic gray
- **Virtual**: `#00D4FF` - `var(--color-gamepad-virtual)` - Virtual cyan

## Modules

### 1. Design Tokens (`js/design-tokens.js`)
Central design system with CSS custom properties.

```javascript
// Initialize design system
DesignTokens.init();

// Access tokens
DesignTokens.colors.spectrum.cyan // '#00D4FF'
DesignTokens.typography.fonts.mono // '"Azeret Mono", monospace'
DesignTokens.spacing.md // '1rem'
```

### 2. Curve Mapper (`js/curve-mapper.js`)
Sophisticated S-curve mapping for control modulation (inspired by audio mixing).

**Features:**
- Attack/sustain/release parameters
- Exponential curves for smooth modulation
- Real-time visualization with canvas
- 8 built-in presets

**Usage:**
```javascript
// Create curve
const curveId = 'freq-curve';
FP.CurveMapper.createCurve(curveId, {
    attack: 0.7,   // 0-1: slow to fast attack
    sustain: 0.5,  // 0-1: depth
    release: 0.7,  // 0-1: slow to fast release
    gain: 1.0      // Output multiplier
});

// Apply curve
const input = 0.5; // 0-1
const output = FP.CurveMapper.applyCurve(curveId, input);

// Draw to canvas
const canvas = document.getElementById('curve-canvas');
FP.CurveMapper.drawCurve(canvas, curveId, {
    padding: 20,
    currentValue: 0.5 // Optional: shows indicator
});

// Load preset
FP.CurveMapper.loadPreset(curveId, 'fastAttack');
```

**Presets:**
- `linear` - Linear response
- `fastAttack` - Quick ramp up, normal release
- `slowAttack` - Gradual ramp up
- `fastRelease` - Normal attack, quick release
- `slowRelease` - Normal attack, gradual release
- `sCurve` - Smooth S-curve
- `exponential` - Aggressive exponential
- `logarithmic` - Gentle logarithmic

### 3. Logger (`js/logger.js`)
Sophisticated logging system with levels, filtering, and persistence.

**Log Levels:**
- DEBUG (🔍)
- INFO (ℹ️)
- WARN (⚠️)
- ERROR (❌)
- CRITICAL (🔥)

**Usage:**
```javascript
// Basic logging
FP.Logger.info('ModuleName', 'Message', { data: 'optional' });
FP.Logger.warn('Gamepad', 'Axis stuck detected');
FP.Logger.error('Main', 'Failed to initialize', errorObj);

// Configuration
FP.Logger.setLevel('DEBUG'); // Show all logs
FP.Logger.setFilters(['Gamepad', 'Main']); // Only show these modules
FP.Logger.clearFilters(); // Show all modules

// UI logging
const logContainer = document.getElementById('log-output');
FP.Logger.setUIElement(logContainer);

// Export/download
FP.Logger.downloadLogs(); // Downloads JSON file
const stats = FP.Logger.getStats(); // Get statistics
```

### 4. Parameter Mapper (`js/parameter-mapper.js`)
Maps gamepad inputs to game parameters with curve modulation.

**Features:**
- Route any axis/button to any parameter
- Apply curve mapping to inputs
- Filter by gamepad type
- Save/load mappings

**Usage:**
```javascript
// Create mapping
FP.ParameterMapper.createMapping('freq-control', {
    enabled: true,
    source: {
        type: 'axis',        // 'axis' or 'button'
        index: 0,            // Left stick X
        gamepadType: 'xbox'  // Optional: only for Xbox controllers
    },
    target: {
        type: 'config_param',  // TARGET_TYPES.CONFIG_PARAM
        path: 'frequency',      // Config.params.frequency
        min: 0.5,
        max: 5.0
    },
    curve: 'freq-curve',    // Optional: CurveMapper ID
    deadzone: 0.1,
    name: 'Frequency Control'
});

// Process in game loop
FP.ParameterMapper.processGamepad(gamepad, gamepadType);

// Save/load
FP.ParameterMapper.saveMappings();
FP.ParameterMapper.loadMappings();
```

### 5. Storage Manager (`js/storage-manager.js`)
Centralized localStorage management with versioning.

**Features:**
- Automatic versioning (prevents conflicts)
- Prefixed keys (isolated storage)
- Export/import functionality
- Storage usage monitoring

**Usage:**
```javascript
// Save data
FP.StorageManager.save('gameSettings', {
    frequency: 2.0,
    amplitude: 40
});

// Load data
const settings = FP.StorageManager.load('gameSettings', defaultSettings);

// Check existence
if (FP.StorageManager.has('gameSettings')) {
    // ...
}

// Storage info
const info = FP.StorageManager.getStorageInfo();
console.log(`Using ${info.usagePercent}% of storage`);

// Backup
FP.StorageManager.downloadBackup(); // Downloads JSON backup
```

### 6. Gamepad Type Detection
Automatically detects controller type:

```javascript
// In gamepad.js
const type = FP.Gamepad.getGamepadType();
// Returns: 'xbox', 'playstation', 'nintendo', 'generic', or 'virtual'
```

**Detection Logic:**
- **Xbox**: Matches "xbox", "xinput", "360", "one"
- **PlayStation**: Matches "playstation", "dualshock", "dualsense", "ps3/4/5"
- **Nintendo**: Matches "nintendo", "switch", "pro controller", "joycon"
- **Generic**: Everything else (8BitDo, etc.)
- **Virtual**: From BroadcastChannel gamepad

**UI Integration:**
The gamepad status now shows:
- `"Connected (Xbox)"` in green (#107C10)
- `"Connected (PlayStation)"` in blue (#003087)
- `"Connected (Virtual)"` in cyan (#00D4FF)
- etc.

## Integration Guide

### 1. Add to index.html

```html
<head>
    <link rel="stylesheet" href="fonts.css">
</head>

<body>
    <!-- Before closing </body>, add new modules: -->
    <script src="js/design-tokens.js"></script>
    <script src="js/curve-mapper.js"></script>
    <script src="js/logger.js"></script>
    <script src="js/parameter-mapper.js"></script>
    <script src="js/storage-manager.js"></script>
</body>
```

### 2. Initialize in main.js

```javascript
// In init() function, before other initializations:
DesignTokens.init();
FP.Logger.setLevel('INFO');
FP.Logger.info('Main', 'Phase Field starting...');
```

### 3. Add UI Elements

```html
<!-- Gamepad type badge -->
<span id="gamepad-type" class="gamepad-type-badge"></span>

<!-- Logger output -->
<div id="log-output" class="log-container"></div>

<!-- Curve visualizer -->
<canvas id="curve-canvas" width="400" height="300"></canvas>
```

### 4. CSS for Gamepad Type Badges

```css
.gamepad-type-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: bold;
}

.gamepad-type-xbox {
    background: var(--color-gamepad-xbox);
    color: white;
}

.gamepad-type-playstation {
    background: var(--color-gamepad-playstation);
    color: white;
}

.gamepad-type-nintendo {
    background: var(--color-gamepad-nintendo);
    color: white;
}

.gamepad-type-virtual {
    background: var(--color-gamepad-virtual);
    color: black;
}

.gamepad-type-generic {
    background: var(--color-gamepad-generic);
    color: white;
}
```

## Example: Complete Curve Mapper UI

```html
<div class="curve-mapper-panel">
    <h3>Response Curve</h3>

    <canvas id="curve-canvas" width="400" height="300"></canvas>

    <div class="curve-controls">
        <label>
            Attack:
            <input type="range" id="curve-attack" min="0" max="100" value="70">
        </label>

        <label>
            Sustain:
            <input type="range" id="curve-sustain" min="0" max="100" value="50">
        </label>

        <label>
            Release:
            <input type="range" id="curve-release" min="0" max="100" value="70">
        </label>

        <label>
            Gain:
            <input type="range" id="curve-gain" min="0" max="200" value="100">
        </label>

        <select id="curve-preset">
            <option value="linear">Linear</option>
            <option value="fastAttack">Fast Attack</option>
            <option value="slowAttack">Slow Attack</option>
            <option value="fastRelease">Fast Release</option>
            <option value="slowRelease">Slow Release</option>
            <option value="sCurve" selected>S-Curve</option>
            <option value="exponential">Exponential</option>
            <option value="logarithmic">Logarithmic</option>
        </select>
    </div>
</div>

<script>
const curveId = 'main-curve';
FP.CurveMapper.createCurve(curveId);

function updateCurve() {
    FP.CurveMapper.updateCurve(curveId, {
        attack: parseFloat(document.getElementById('curve-attack').value) / 100,
        sustain: parseFloat(document.getElementById('curve-sustain').value) / 100,
        release: parseFloat(document.getElementById('curve-release').value) / 100,
        gain: parseFloat(document.getElementById('curve-gain').value) / 100
    });

    const canvas = document.getElementById('curve-canvas');
    FP.CurveMapper.drawCurve(canvas, curveId);
}

// Attach event listeners
['curve-attack', 'curve-sustain', 'curve-release', 'curve-gain'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateCurve);
});

document.getElementById('curve-preset').addEventListener('change', (e) => {
    FP.CurveMapper.loadPreset(curveId, e.target.value);
    updateCurve();
});

updateCurve();
</script>
```

## Benefits

1. **Consistent Visual Language**: Design tokens ensure consistent colors, spacing, and typography
2. **Professional Typography**: Technical fonts (Azeret Mono + Space Grotesk) enhance scientific aesthetic
3. **Sophisticated Control**: Curve mapper provides audio-mixing-grade modulation
4. **Better Debugging**: Logger module with filtering and export
5. **Flexible Routing**: Parameter mapper allows custom control schemes
6. **Clear Distinctions**: Gamepad type detection with visual indicators
7. **Data Persistence**: Storage manager with versioning and backup

## Next Steps

To fully integrate the design system:

1. Update `style.css` to use design tokens
2. Create collapsible sections for logger and curve mapper in UI
3. Add curve visualization to gamepad controls
4. Wire parameter mapper to actual game parameters
5. Add export/import UI for mappings and settings

---

Generated for Phase Field GPU project
