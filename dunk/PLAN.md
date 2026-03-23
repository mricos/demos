# Dunk UI Architecture Plan

## Current Issues

### 1. Glitchy Noise When Silent
**Root Cause**: The synthesis channels (especially Noise and Reese) create oscillator/buffer nodes that output low-level signal even when "silent". The amplitude envelope goes to 0.001 (not true zero) to allow exponentialRampToValue to work.

**Fix Strategy**:
- Add a master noise gate after the voice mixer
- Disconnect oscillator nodes after envelope completes (not just stop)
- Use `gain.setValueAtTime(0, endTime)` as final cutoff
- Add a silence threshold in the analyser to zero-out sub-threshold signals

---

## UI Meta-Architecture

### Design Philosophy

The UI should be describable as a **composition of semantic components** with **stylistic tokens** that can be swapped wholesale. Think of it as:

```
UI = Structure × Style × Behavior
```

Where:
- **Structure** = HTML/DOM hierarchy (what exists)
- **Style** = Visual presentation (how it looks)
- **Behavior** = Interaction logic (what it does)

A "skin" changes **Style** without touching Structure or Behavior.

---

## Component Taxonomy

### 1. Display Components (Read-only visualization)
```
┌─────────────────────────────────────────────────┐
│ DISPLAY COMPONENTS                               │
├─────────────────────────────────────────────────┤
│ SpectrumAnalyzer   - FFT frequency display      │
│ PhaseMeter         - Lissajous + correlation    │
│ Tuner              - Note/cents deviation       │
│ SignalSchematic    - Audio routing diagram      │
│ PerformanceMeters  - FPS/CPU/Latency readouts   │
│ StepIndicator      - Current sequencer position │
│ LevelMeter         - VU/Peak meters (future)    │
└─────────────────────────────────────────────────┘
```

### 2. Control Components (User input)
```
┌─────────────────────────────────────────────────┐
│ CONTROL COMPONENTS                               │
├─────────────────────────────────────────────────┤
│ Knob               - Rotary parameter control   │
│ Slider             - Linear parameter control   │
│ Button             - Momentary/toggle action    │
│ StepButton         - Sequencer step toggle      │
│ Selector           - Dropdown/radio options     │
│ ToggleSwitch       - On/off binary state        │
│ NumericInput       - Direct value entry         │
└─────────────────────────────────────────────────┘
```

### 3. Container Components (Layout/grouping)
```
┌─────────────────────────────────────────────────┐
│ CONTAINER COMPONENTS                             │
├─────────────────────────────────────────────────┤
│ Panel              - Floating parameter window  │
│ Section            - Main area grouping         │
│ Toolbar            - Action button strip        │
│ Sidebar            - Info/help content          │
│ Header             - Top status bar             │
│ Footer             - Bottom toolbar             │
└─────────────────────────────────────────────────┘
```

### 4. Canvas Components (Drawn graphics)
```
┌─────────────────────────────────────────────────┐
│ CANVAS COMPONENTS                                │
├─────────────────────────────────────────────────┤
│ Grid               - Background reference lines │
│ Trace              - Signal path visualization  │
│ Waveform           - Oscilloscope-style display │
│ Bars               - Spectrum/level bars        │
│ Scope              - XY/Lissajous plotting      │
│ Module             - Schematic block element    │
│ Wire               - Schematic connection       │
└─────────────────────────────────────────────────┘
```

---

## Design Token Categories

### Token Hierarchy
```
tokens/
├── color/
│   ├── background      # Surface colors
│   ├── foreground      # Text colors
│   ├── accent          # Highlight colors
│   ├── semantic        # Success/warning/error
│   └── canvas          # Visualization colors
├── typography/
│   ├── family          # Font stacks
│   ├── size            # Font sizes
│   ├── weight          # Font weights
│   └── tracking        # Letter spacing
├── spacing/
│   ├── inset           # Padding values
│   ├── stack           # Vertical gaps
│   ├── inline          # Horizontal gaps
│   └── grid            # Layout grid
├── border/
│   ├── width           # Border thickness
│   ├── style           # Solid/dashed/groove
│   ├── radius          # Corner rounding
│   └── color           # Border colors
├── elevation/
│   ├── shadow          # Drop shadows
│   ├── glow            # Light effects
│   └── bevel           # 3D edge effects
├── motion/
│   ├── duration        # Timing values
│   ├── easing          # Timing functions
│   └── delay           # Stagger values
└── canvas/
    ├── line            # Stroke properties
    ├── fill            # Fill properties
    ├── decay           # Persistence values
    └── glow            # Blur/shadow effects
```

---

## Skin Definitions

### Skin 1: "Phosphor" (Original)
**Character**: Modern, glowing, minimal, dark EDM aesthetic

```javascript
phosphor: {
  meta: {
    name: 'Phosphor',
    description: 'Glowing green on black, modern minimal aesthetic',
    author: 'Dunk',
    version: '1.0'
  },

  color: {
    bg: {
      primary: '#0a0a0a',
      secondary: '#141414',
      tertiary: '#1a1a1a',
      input: '#222222'
    },
    fg: {
      primary: '#e0e0e0',
      secondary: '#888888',
      muted: '#555555'
    },
    accent: {
      primary: '#00ff00',
      primaryDim: '#00aa00',
      secondary: '#ff8800',
      tertiary: '#4488ff'
    },
    semantic: {
      success: '#00ff00',
      warning: '#ff8800',
      error: '#ff4444',
      info: '#4488ff'
    },
    canvas: {
      trace: '#00ff00',
      traceDim: '#004400',
      grid: '#222222',
      gridMajor: '#333333'
    }
  },

  typography: {
    family: {
      primary: "'Consolas', 'Monaco', monospace",
      display: "'Consolas', monospace"
    },
    size: {
      xs: '10px',
      sm: '11px',
      md: '13px',
      lg: '16px',
      xl: '20px'
    }
  },

  border: {
    width: '1px',
    style: 'solid',
    radius: {
      none: '0',
      sm: '2px',
      md: '4px'
    }
  },

  elevation: {
    flat: true,
    glow: {
      accent: '0 0 10px rgba(0, 255, 0, 0.3)',
      strong: '0 0 20px rgba(0, 255, 0, 0.5)'
    },
    shadow: 'none'
  },

  canvas: {
    lineWidth: 2,
    glowBlur: 15,
    decayRate: 0.92,
    dotSize: 2
  }
}
```

### Skin 2: "Laboratory" (HP Style)
**Character**: 90s test equipment, beveled, technical, instrument-panel

```javascript
laboratory: {
  meta: {
    name: 'Laboratory',
    description: 'HP/Agilent test equipment aesthetic, beveled 3D panels',
    author: 'Dunk',
    version: '1.0'
  },

  color: {
    bg: {
      primary: '#1a1a18',
      secondary: '#2a2a28',
      tertiary: '#222220',
      input: '#181816',
      bezel: '#3a3a38'
    },
    fg: {
      primary: '#c8c8c0',
      secondary: '#888880',
      label: '#a0a098'
    },
    accent: {
      primary: '#33ff33',
      primaryDim: '#228822',
      secondary: '#ffaa00',
      secondaryDim: '#885500',
      tertiary: '#3388ff'
    },
    semantic: {
      success: '#33ff33',
      warning: '#ffaa00',
      error: '#ff3333',
      info: '#3388ff'
    },
    canvas: {
      trace: '#33ff33',
      traceDim: '#114411',
      grid: '#222218',
      gridMajor: '#2a2a20'
    }
  },

  typography: {
    family: {
      primary: "'Consolas', 'Monaco', 'Lucida Console', monospace",
      display: "'Consolas', monospace"
    },
    size: {
      xs: '8px',
      sm: '9px',
      md: '10px',
      lg: '11px',
      xl: '12px'
    }
  },

  border: {
    width: '2px',
    style: 'solid',
    radius: {
      none: '0',
      sm: '0',
      md: '0'
    },
    bevel: {
      raised: {
        top: '#5a5a58',
        left: '#5a5a58',
        bottom: '#0a0a08',
        right: '#0a0a08'
      },
      inset: {
        top: '#0a0a08',
        left: '#0a0a08',
        bottom: '#5a5a58',
        right: '#5a5a58'
      }
    }
  },

  elevation: {
    flat: false,
    bevel: true,
    glow: {
      accent: 'none',
      strong: 'none'
    },
    shadow: '4px 4px 8px rgba(0, 0, 0, 0.5)'
  },

  canvas: {
    lineWidth: 1.5,
    glowBlur: 0,
    decayRate: 0.85,
    dotSize: 1
  }
}
```

### Skin 3: "Neon" (Future - Cyberpunk)
**Character**: High contrast, hot pink/cyan, scanlines, CRT aesthetic

### Skin 4: "Vintage" (Future - Analog)
**Character**: Warm browns, wood grain, VU meters, tape machine

### Skin 5: "Blueprint" (Future - Technical)
**Character**: White on blue, engineering diagram style

---

## Implementation Architecture

### File Structure
```
dunk/
├── index.html
├── js/
│   ├── core.js
│   ├── skin.js          # NEW: Skin manager
│   ├── tokens.js        # NEW: Token definitions
│   └── ... (existing)
├── skins/
│   ├── phosphor.js      # Skin definition
│   ├── laboratory.js    # Skin definition
│   └── index.js         # Skin registry
└── dunk.css             # Base structural CSS only
```

### Skin Manager API
```javascript
NS.Skin = {
  current: null,
  available: {},

  // Register a skin
  register(id, definition) { },

  // Apply a skin
  apply(id) {
    // 1. Update CSS custom properties
    // 2. Update canvas renderer settings
    // 3. Emit 'skin:changed' event
    // 4. Store preference
  },

  // Get token value
  token(path) {
    // e.g., token('color.accent.primary')
  },

  // Generate CSS from tokens
  generateCSS() { }
};
```

### CSS Architecture
```css
/* Base structural CSS (skin-independent) */
.section {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-inset-md);
  border-width: var(--border-width);
  border-style: var(--border-style);
}

/* Skin applies values to CSS variables */
:root[data-skin="phosphor"] {
  --color-bg-primary: #0a0a0a;
  --color-accent-primary: #00ff00;
  --border-width: 1px;
  --elevation-shadow: none;
}

:root[data-skin="laboratory"] {
  --color-bg-primary: #1a1a18;
  --color-accent-primary: #33ff33;
  --border-width: 2px;
  --elevation-shadow: 4px 4px 8px rgba(0,0,0,0.5);
}
```

### Canvas Rendering Integration
```javascript
// Canvas components read from skin tokens
NS.Analyser._draw() {
  const skin = NS.Skin.current;
  ctx.strokeStyle = skin.token('canvas.trace');
  ctx.lineWidth = skin.token('canvas.lineWidth');
  // ...
}
```

---

## Implementation Phases

### Phase 1: Foundation
1. Fix silence noise issue
2. Create `tokens.js` with token structure
3. Create `skin.js` with skin manager
4. Extract current CSS into token-based system

### Phase 2: Skin Definitions
5. Define "Phosphor" skin (original look)
6. Define "Laboratory" skin (current HP look)
7. Add skin selector to UI
8. Persist skin preference

### Phase 3: Canvas Integration
9. Update Analyser to use skin tokens
10. Update Phase meter to use skin tokens
11. Update Schematic to use skin tokens
12. Add skin-aware grid/label rendering

### Phase 4: Polish
13. Smooth skin transitions (CSS transitions)
14. Preview thumbnails for skin selector
15. Custom skin editor (future)
16. Import/export skin definitions

---

## UI Component Specifications

### Section Component
```
┌─────────────────────────────────────────────────────┐
│ SECTION                                             │
├─────────────────────────────────────────────────────┤
│ ┌─ header ────────────────────────────────────────┐ │
│ │ [title]                    [controls]           │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─ content ───────────────────────────────────────┐ │
│ │                                                 │ │
│ │     (canvas / controls / info)                  │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

Tokens used:
- color.bg.secondary (background)
- border.* (container edge)
- elevation.* (depth effect)
- spacing.inset.* (padding)
- typography.size.sm (title)
- color.fg.label (title color)
```

### Display (Canvas) Component
```
┌─────────────────────────────────────────────────────┐
│ DISPLAY                                             │
├─────────────────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓                                               ▓ │
│ ▓   (canvas rendering area)                     ▓ │
│ ▓                                               ▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│   20   100    1k    10k   (labels)                │
└─────────────────────────────────────────────────────┘

Tokens used:
- color.bg.input (canvas background)
- border.* (inset frame)
- canvas.trace (line color)
- canvas.grid (grid color)
- canvas.lineWidth (stroke width)
- canvas.decayRate (persistence)
- canvas.glowBlur (glow effect)
- typography.size.xs (labels)
```

### Control: Slider
```
┌─────────────────────────────────────────────────────┐
│ SLIDER                                              │
├─────────────────────────────────────────────────────┤
│  [label]    ═══════●═══════════    [value]         │
│              track    thumb                         │
└─────────────────────────────────────────────────────┘

Tokens used:
- color.bg.input (track)
- color.accent.primary (thumb - phosphor)
- color.bg.bezel + border.bevel (thumb - laboratory)
- typography.size.sm (label)
- color.fg.label (label color)
- color.accent.primary (value color)
```

### Control: Button
```
┌─────────────────────────────────────────────────────┐
│ BUTTON (variants)                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Phosphor:    ┌──────────┐   (flat, glowing hover) │
│               │  LABEL   │                          │
│               └──────────┘                          │
│                                                     │
│  Laboratory:  ╔══════════╗   (beveled 3D)          │
│               ║  LABEL   ║                          │
│               ╚══════════╝                          │
│                                                     │
└─────────────────────────────────────────────────────┘

Tokens used:
- color.bg.tertiary / color.bg.bezel (background)
- border.* (edge)
- border.bevel.raised (3D effect - lab only)
- elevation.glow.accent (hover - phosphor only)
- typography.size.sm (label)
- spacing.inset.sm (padding)
```

---

## Next Steps (Priority Order)

1. **Fix silence noise** - Immediate audio quality issue
2. **Create skin.js** - Token manager and skin switcher
3. **Extract tokens** - Pull hardcoded values to tokens
4. **Define both skins** - Phosphor and Laboratory
5. **Add skin selector** - UI control to switch
6. **Update canvas renderers** - Use skin tokens

---

## Questions to Resolve

1. Should skins support partial overrides (inheritance)?
2. Should canvas components support real-time skin switching?
3. How much should typography scale between skins?
4. Should we support user-created custom skins?
5. Should skins include sound design presets?
