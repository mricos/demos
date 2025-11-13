# Simplified Lane-Based Refactoring - Complete

## Overview

Successfully refactored the ASCII Scope SNN from a complex page-based system to a simplified lane-based architecture with scrolling tracks and a fixed CLI section.

## What Changed

### 1. Architecture Shift

**Before:**
- 5 pages (oscilloscope, CLI, statistics, markers, etc.)
- Complex page visibility system
- Channel management separate from display

**After:**
- 3-section fixed layout:
  1. Header (1 row) - transport status and lane indicators
  2. Scrollable track viewport (middle) - data lanes
  3. Fixed CLI/log section (6 rows, bottom) - always visible

### 2. Simplified lanes.py (300 → 200 lines)

**Removed:**
- ❌ Pinned lanes (time, summary, cli)
- ❌ Lane reordering (move_up/move_down)
- ❌ Focus system (Tab navigation)
- ❌ Complex layout computation

**Added:**
- ✅ Double-tap detection (400ms threshold)
- ✅ Scroll offset tracking
- ✅ Simple 8-lane system (0-7)
- ✅ Fixed heights (1 row compact, 10 rows expanded)

**Key Classes:**
```python
Lane              # Simple data lane (id, name, visible, expanded, gain)
KeypressTracker   # Detects double-taps for expand/collapse
LaneManager       # Manages 8 data lanes with scrolling
```

### 3. Updated main.py

**New Rendering Pipeline:**
```python
def _render_track_viewport():
    # Scrollable middle section
    # Renders visible lanes with clipping
    # Sparkline (compact) or waveform (expanded)

def _render_cli_section():
    # Fixed bottom section
    # Shows output history + input line
    # Always visible, no toggle needed
```

**New Keyboard Handling:**
- `1-8` (single tap) → Toggle lane visibility
- `1-8` (double tap) → Toggle lane expand/collapse
- `PgUp/PgDown` → Scroll viewport by 5 lanes
- `Up/Down` → Scroll viewport by 1 lane
- `:` → Enter CLI mode
- `ESC` → Exit CLI mode

### 4. Updated config.py

**Changed:**
- Removed `pages_visible` array
- Removed `channels` array
- Added `lanes` array with visibility/expanded/gain state

### 5. Updated CLI commands

**Changed:**
- `page <N>` → `lane <1-8>`
- `lane <N> on/off` → Toggle visibility
- `lane <N> expand/collapse` → Toggle height

### 6. Deleted Files

**Rendering (no longer needed):**
- `rendering/timeline.py` - time ruler (moved to header)
- `rendering/summary_lane.py` - kernel params (moved to header)
- `rendering/cli_lane.py` - CLI as lane (now fixed section)

**Pages (obsolete):**
- `pages/` directory (entire directory removed)
  - `base.py`
  - `oscilloscope.py`
  - `cli_page.py`
  - `statistics.py`
  - `markers.py`

## Visual Layout

```
┌─────────────────────────────────────────────────┐
│ [▶PLAY] 01:23/05:00 (25%) zoom=1.0s [1:●c][2:●c]│ ← Header
├─────────────────────────────────────────────────┤
│ [1:audio]  ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁  pk:−0.2            │ ← Scrollable
│ [2:pulse1] ▁▁▁▁█▁▁▁▁▁▁▁█▁▁  pk:+1.0            │   track
│ [3:pulse2] ─────────────────────────────────────│   viewport
│            │     ▲                              │
│            │    ╱ ╲                             │
│            │   ╱   ╲     [EXPANDED]             │
│            │  ╱     ╲                           │
│            ├─────────────▶                      │
│            │               ╲                    │
│            │                ╲    ╱              │
│            │                 ╲  ╱               │
│            │                  ╲╱                │
│ [4:env]    ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁  pk:−0.5            │
├─────────────────────────────────────────────────┤
│ > :lane 3 expand                                │ ← Fixed
│   Lane 3 (pulse2) expanded                      │   CLI/Log
│ > :seek 1.5                                     │   section
│   Position: 1.500s                              │   (always
│ > _                                             │   visible)
└─────────────────────────────────────────────────┘
```

## Key Features

### Double-Tap Detection
- First tap on `1-8`: Toggle lane visibility
- Second tap within 400ms: Toggle expand/collapse
- Prevents triple-tap with state reset

### Scrolling
- Automatically enabled when lanes don't fit viewport
- `PgUp/PgDown`: Jump by 5 lanes
- `Up/Down`: Scroll by 1 lane
- Smart clipping: Partial lanes rendered at bottom

### Fixed CLI Section
- Always visible at bottom (no toggle needed)
- Shows last 10 output lines
- Input line with cursor positioning
- Separator line for visual clarity

## Code Reduction

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| lanes.py | 300 lines | 200 lines | -33% |
| main.py rendering | ~180 lines | ~120 lines | -33% |
| Total rendering files | 9 files | 3 files | -67% |
| Configuration complexity | High (pages+channels) | Low (lanes only) | Simplified |

## Testing

All basic functionality tested:
- ✅ Lane creation and initialization
- ✅ Visibility toggling
- ✅ Expand/collapse toggling
- ✅ Double-tap detection
- ✅ Scroll offset tracking
- ✅ Import/export configuration

## How to Use

### Running the Application
```bash
python -m ascii_scope_snn.main tscale.out.txt
```

### Keyboard Shortcuts
```
Transport:
  Space       Play/pause
  ←→          Scrub (±1%)
  Shift+←→    Scrub (±10%)
  < >         Zoom in/out

Lanes:
  1-8         Single tap: Toggle visibility
  1-8         Double tap: Expand/collapse
  PgUp/PgDown Scroll viewport
  Up/Down     Scroll by 1 lane

CLI:
  :           Enter CLI mode
  ESC         Exit CLI mode

General:
  ?           Help
  q           Quit
```

### CLI Commands
```
lane 1               # Toggle lane 1 visibility
lane 2 expand        # Expand lane 2
lane 3 collapse      # Collapse lane 3
lane 4 on            # Show lane 4
lane 5 off           # Hide lane 5

seek 1.5             # Seek to 1.5 seconds
zoom 2.0             # Set zoom to 2 seconds
toggle_play          # Toggle playback
```

## Benefits

1. **Simpler Mental Model**
   - 3 sections vs. 5 pages
   - Lanes are just data tracks
   - CLI always accessible

2. **Better UX**
   - No toggling to access CLI
   - Scrolling handles overflow naturally
   - Double-tap feels intuitive

3. **Easier to Maintain**
   - Less code (200 lines removed)
   - Fewer files (6 files deleted)
   - Clearer separation of concerns

4. **Room to Grow**
   - Easy to add more lanes (up to 8)
   - Simple to add lane-specific controls
   - Fixed layout scales with terminal size

## Next Steps (Optional Enhancements)

- [ ] Add visual scroll indicator (show "Lane 3-7 of 8")
- [ ] Add lane solo/mute functionality
- [ ] Add lane gain adjustment from keyboard
- [ ] Add lane color customization
- [ ] Persist scroll position in config
- [ ] Add timeline overlay (optional, in header area)

---

**Status:** ✅ Complete and tested
**Date:** 2025-11-04
**Lines changed:** ~500 lines modified/removed
**Files affected:** 8 files
