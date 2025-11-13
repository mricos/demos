# .snn Directory

Project-local configuration and state for ASCII Scope SNN.

## Files

### `config.json`
Project-specific configuration. All values are optional (defaults shown):

```json
{
  "quick_press_threshold_ms": 200,    // Quick press (tap)
  "medium_press_threshold_ms": 500,   // Medium press (hold)
  "long_press_threshold_ms": 1000     // Long press (reserved)
}
```

### Lane Controls

Simple two-action model (header shows most recent 2 lanes):

**Quick press (< 200ms) - "tap":**
- Always toggles visibility on/off
- First priority - works on any lane, any state

**Long press (~500ms) - "hold":**
- If lane is OFF (hidden): Turn on AND show large (expanded)
- If lane is ON (visible): Toggle open/close (expanded state)

Visual feedback in header shows press duration: `[1:▱▱▱]` → `[1:▰▱▱]` → `[1:▰▰▱]` → `[1:▰▰▰]`

Header shows only the 2 most recently used lanes with hints:
- Visible: `[1(tap=off/hold=mode):●c]` or `[1(tap=off/hold=mode):●E]`
- Hidden: `[1(tap=on/hold=large):○c]`

### `session.json`
Auto-saved session state (created on exit):
- Last audio file and data file
- Playback position
- Markers
- Kernel parameters
- Display mode

Automatically restored on next launch.

## Database Files

The `db/` directory contains TRS (Time-series Record System) files managed by the project.
See `../ascii_scope_snn/trs.py` for implementation details.
