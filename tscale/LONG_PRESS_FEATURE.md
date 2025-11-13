# Long-Press Feature for Lane Control

## Overview

Replaced Shift+number key combinations with **long-press detection** for expanding/collapsing lanes.

## Usage

### Short Press (< 500ms)
Press and quickly release `1-8` → **Toggle lane visibility**

### Long Press (≥ 500ms)
Press and **hold** `1-8` → **Toggle lane expand/collapse**

## Configuration

The long-press threshold is configurable in `.snn/config` (TOML format):

```toml
# .snn/config
long_press_threshold_ms = 500   # Default: 500ms
double_tap_threshold_ms = 400   # Default: 400ms
```

### Adjusting Threshold

Create or edit `.snn/config`:

```toml
# Faster response (300ms)
long_press_threshold_ms = 300

# Slower response (700ms)
long_press_threshold_ms = 700
```

The threshold is loaded when the app starts. Changes require restart.

## Implementation Details

### KeypressTracker Enhancement

Updated `lanes.py` to track both press and hold timing:

```python
class KeypressTracker:
    def __init__(self, long_press_threshold_ms: int = 500):
        self.long_press_threshold = long_press_threshold_ms / 1000.0
        self.key_down = None  # Currently held key
        self.key_down_time = 0.0  # When it was pressed

    def key_pressed(self, key: int):
        """Record key press start."""
        self.key_down = key
        self.key_down_time = time.time()

    def check_long_press(self, key: int) -> bool:
        """Check if key held long enough."""
        if self.key_down != key:
            return False

        elapsed = time.time() - self.key_down_time
        if elapsed >= self.long_press_threshold:
            self.key_down = None  # Reset
            return True
        return False
```

### Event Loop Integration

Main loop checks for pending long-presses on each iteration:

```python
# In main.py run() loop:
if self.state.lanes.keypress_tracker.key_down is not None:
    held_key = self.state.lanes.keypress_tracker.key_down
    action, lane_id = self.state.lanes.check_long_press_pending(held_key)
    if action == "toggle_expanded":
        self.state.lanes.toggle_expanded(lane_id)
```

### UI Indicator

Header now shows long-press hint instead of Shift keys:

**Before:**
```
[1/!:●c] [2/@:●c] [3/#:○c]
```

**After:**
```
[1(hold):●c] [2(hold):●c] [3(hold):○c]
```

## Benefits

1. **No modifier keys** - Single key operation
2. **User-configurable** - Dial in preferred timing
3. **Discoverable** - Header shows "(hold)" hint
4. **Accessible** - Works on all terminals (no Shift detection issues)

## Default Thresholds

| Setting | Default | Range | Purpose |
|---------|---------|-------|---------|
| `long_press_threshold_ms` | 500ms | 100-2000ms | Time to hold for expand |
| `double_tap_threshold_ms` | 400ms | 100-1000ms | Time between taps |

## Workflow Example

```bash
# Start app
python -m ascii_scope_snn.main test.wav

# Short press "1" → Toggle lane 1 visibility
# Hold "1" for 500ms → Toggle lane 1 expand/collapse

# Adjust threshold if too fast/slow
echo 'long_press_threshold_ms = 300' > .snn/config

# Restart app to use new threshold
python -m ascii_scope_snn.main
```

## Technical Notes

### Curses Limitations

Curses doesn't provide native key-up events, so we use:
- `timeout()` to poll at 30Hz (33ms intervals)
- Time-based detection instead of hardware events
- Reset on successful long-press to prevent retriggering

### Thread Safety

All timing uses `time.time()` for consistency. No threading needed as checks happen in main loop.

## Files Modified

1. `ascii_scope_snn/lanes.py` - Enhanced KeypressTracker
2. `ascii_scope_snn/main.py` - Long-press checking in event loop
3. `ascii_scope_snn/state.py` - Pass config to LaneManager
4. `ascii_scope_snn/project.py` - TOML config support

## Backward Compatibility

**Breaking change**: Shift+number keys no longer work for expand/collapse.

Users must now use long-press instead.

## Future Enhancements

1. **Visual feedback** - Progress bar showing hold duration
2. **Haptic timing** - Beep or flash when threshold reached
3. **Per-lane thresholds** - Different timing for different lanes
4. **Gesture detection** - Long-press + direction for more actions
