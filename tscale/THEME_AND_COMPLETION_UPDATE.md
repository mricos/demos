# Tab-Completion Hints & Warm Theme Integration

## Summary

Added two major enhancements to ASCII Scope SNN:

1. **Tab-completion with live descriptions** - Shows command descriptions below CLI input
2. **TDS Warm Theme colors** - Implements 8x3+status color system from tetra/tds/themes

## 1. Tab-Completion Descriptions

### Changes Made

**cli/manager.py**:
- Added `completion_hint` property to track current hint text
- Added `set_completion_hint()` and `get_completion_hint()` methods

**main.py**:
- Added `_update_completion_hint()` method to set hints based on completion context
- Modified `_render_cli_section()` to display hint on bottom line (2-line CLI input area)
- Shows different hints depending on what you're completing:
  - **Command names**: Shows description + category
  - **Parameters**: Shows parameter name + description
  - **No completion**: Shows usage help

### Usage

When tabbing through commands:
```
> zo<TAB>
zoom           [Zoom in (decrease span) [Category: zoom]]

> zoom <TAB>
span: <float>  [Set zoom span (time window width) → span: Span in seconds]
```

The hint line shows:
- Command description and category when completing command names
- Parameter name and description when completing arguments
- "Tab: complete | ↑↓: history | Esc: exit CLI" when no active completion

## 2. Warm Theme Colors (TDS Integration)

### Theme System Architecture

Implements the **8x3+status** color system from tetra/tds/themes:

#### 4 Semantic Palettes (8 colors total)
- **ENV (Lanes 1-2)**: Amber/warm - Primary environment colors
- **MODE (Lanes 3-4)**: Orange - Structural/secondary colors
- **VERBS (Lanes 5-6)**: Red - Action/accent colors
- **NOUNS (Lanes 7-8)**: Neutral warm grays - Data/content colors

#### Color Brightness Strategy

Uses **300/400 series** (brighter) instead of 500 series for better visibility on dark terminals:

| Lane | Color | Hex | RGB | Usage |
|------|-------|-----|-----|-------|
| 1 | Amber (bright) | #fcd34d | 252,211,77 | ENV primary |
| 2 | Rich amber | #fbbf24 | 251,191,36 | ENV secondary |
| 3 | Orange (bright) | #fb923c | 251,146,60 | MODE primary |
| 4 | Bright orange | #f97316 | 249,115,22 | MODE secondary |
| 5 | Red (bright) | #f87171 | 248,113,113 | VERBS primary |
| 6 | Bright red | #ef4444 | 239,68,68 | VERBS secondary |
| 7 | Light warm gray | #e7e5e4 | 231,229,228 | NOUNS primary |
| 8 | Medium light gray | #d6d3d1 | 214,211,209 | NOUNS secondary |

### Changes Made

**palette.py**:
- Fixed regex pattern to handle numbers in variable names (`[A-Z_0-9]+`)
- Updated `apply_to_curses()` to map TDS warm palette to 8 lanes
- Updated `find_tds_theme()` to search `~/src/devops/tetra/bash/tds/themes/`
- Added documentation for semantic color mapping

**rendering/helpers.py**:
- Already had theme loading via `init_colors()`
- Automatically searches for and loads warm theme on startup

### Theme Loading

Searches these locations in order:
1. `~/src/devops/tetra/bash/tds/themes/warm.sh`
2. `~/tetra/bash/tds/themes/warm.sh`
3. `~/tetra/tds/themes/warm.sh`
4. `~/.tds/themes/warm.sh`
5. `/usr/local/share/tds/themes/warm.sh`
6. `~/.config/tds/themes/warm.sh`

Falls back to standard terminal colors if:
- Theme file not found
- Terminal doesn't support color changes (`curses.can_change_color()`)

### Verification

Successfully parses **40 color definitions** from warm.sh:
- 9 PRIMARY colors (amber gradient)
- 9 SECONDARY colors (orange gradient)
- 9 ACCENT colors (red gradient)
- 9 NEUTRAL colors (warm gray gradient)
- 4 STATE colors (success, warning, error, info)

## Bug Fixes

**main.py**:
- Fixed quit key handling - `q` quits, `ESC` exits CLI mode (was both doing quit)
- Added 2-line CLI input area (input line + hint line below)

## Testing

Created test_warm_theme.py that verified:
- ✓ Theme file found at correct path
- ✓ 40 color definitions parsed
- ✓ All 8 lane colors mapped correctly
- ✓ RGB values extracted properly

## Usage

The warm theme loads automatically on startup. To verify:

```bash
python -m ascii_scope_snn.main <data_file>
```

You should see warm amber/orange/red colors for lanes 1-6 instead of dark defaults.

Press `:` to enter CLI mode and tab through commands to see descriptions.

## Future Enhancements

1. **Theme selection**: Add CLI command to switch themes (`:theme warm|cool|neutral|electric`)
2. **Theme preview**: Show color samples in help screen
3. **Custom themes**: Support user themes in `~/.config/ascii_scope_snn/themes/`
4. **Status colors**: Use TDS status palette for success/warning/error messages
