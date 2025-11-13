# ✅ Long-Press Feature Complete

## Summary

Replaced **Shift+number** key combinations with **configurable long-press detection** for lane expand/collapse control.

## How It Works

### Short Press (< 500ms)
Tap `1-8` quickly → **Toggle lane visibility**

### Long Press (≥ 500ms)
Hold `1-8` → **Toggle lane expand/collapse**

## Configuration

Threshold is stored in `.snn/config` (TOML):

```toml
# .snn/config (created automatically)
long_press_threshold_ms = 500   # Default: 500ms
double_tap_threshold_ms = 400   # Default: 400ms
```

### Customization

Edit `.snn/config` to adjust timing:

```toml
# Faster response
long_press_threshold_ms = 300

# Slower, more deliberate
long_press_threshold_ms = 700
```

Restart app to apply changes.

## Implementation

### Files Modified (4 files)

1. **`lanes.py`** - Enhanced KeypressTracker
   - Added `key_pressed()`, `check_long_press()`, `key_released()`
   - Tracks key-down time and elapsed duration
   - Detects when threshold is exceeded

2. **`main.py`** - Event loop integration
   - Checks for pending long-press on each iteration (30Hz)
   - Triggers expand/collapse when threshold met
   - Updated header to show "(hold)" instead of Shift keys

3. **`state.py`** - Config integration
   - Passes `long_press_threshold_ms` to LaneManager
   - Reads from project config on init

4. **`project.py`** - TOML config support
   - Changed from JSON to TOML for config
   - Added default config values
   - Added `get_config_value()` helper

### Key Classes Updated

```python
class KeypressTracker:
    def __init__(self, long_press_threshold_ms=500):
        self.long_press_threshold = long_press_threshold_ms / 1000.0
        self.key_down = None          # Currently held key
        self.key_down_time = 0.0      # When pressed

    def key_pressed(self, key):
        """Start tracking long-press."""
        self.key_down = key
        self.key_down_time = time.time()

    def check_long_press(self, key) -> bool:
        """Return True if held long enough."""
        if self.key_down != key:
            return False
        elapsed = time.time() - self.key_down_time
        return elapsed >= self.long_press_threshold
```

## UI Changes

### Header Display

**Before:**
```
[1/!:●c] [2/@:●c] [3/#:○c]
 ↑ Shift key indicator
```

**After:**
```
[1(hold):●c] [2(hold):●c] [3(hold):○c]
 ↑ Long-press hint
```

## Benefits

✓ **No modifier keys** - Works on all terminals
✓ **User-configurable** - Adjust to your preference
✓ **Discoverable** - UI shows "(hold)" hint
✓ **Consistent** - Same interaction pattern as modern UIs
✓ **Accessible** - No Shift detection issues

## Testing

```bash
cd /Users/mricos/src/mricos/demos/tscale

# Test with default threshold (500ms)
python -m ascii_scope_snn.main test.wav

# Press "1" quickly → Toggle visibility
# Hold "1" for 500ms → Toggle expand

# Adjust threshold
echo 'long_press_threshold_ms = 300' > .snn/config

# Test with faster threshold
python -m ascii_scope_snn.main
# Now only need 300ms hold
```

## Breaking Change

**Old behavior (removed):**
- Shift+1 = `!` → Expand lane 1
- Shift+2 = `@` → Expand lane 2
- etc.

**New behavior:**
- Hold `1` for 500ms → Expand lane 1
- Hold `2` for 500ms → Expand lane 2
- etc.

## Configuration Details

### Config File Location
`.snn/config` (in project root)

### Config Format (TOML)
```toml
# Timing thresholds (milliseconds)
long_press_threshold_ms = 500
double_tap_threshold_ms = 400
```

### Default Values
If `.snn/config` doesn't exist, uses:
- `long_press_threshold_ms`: 500ms
- `double_tap_threshold_ms`: 400ms

### Valid Ranges
- `long_press_threshold_ms`: 100-2000ms recommended
- `double_tap_threshold_ms`: 100-1000ms recommended

## Technical Details

### Event Loop Flow

```
1. Check if key currently held (key_down != None)
2. If yes, check elapsed time
3. If elapsed >= threshold:
   - Trigger expand/collapse
   - Reset key_down to prevent repeat
4. Get new key press with getch()
5. If lane key (1-8):
   - Record key_down and timestamp
   - Return toggle_visibility action
```

### Polling Rate

Runs at 30Hz (33ms intervals) via:
```python
stdscr.timeout(int(1000 / REFRESH_HZ))  # 30 FPS
```

This provides smooth detection without CPU overhead.

## Future Enhancements

Potential improvements:
1. **Visual feedback** - Progress bar while holding
2. **Audio cue** - Beep when threshold reached
3. **Vibration** - Haptic feedback (if supported)
4. **Multi-level** - Different actions at 250ms, 500ms, 1000ms
5. **Gestures** - Hold + arrow keys for more actions

## Documentation Created

- **LONG_PRESS_FEATURE.md** - Feature documentation
- **LONG_PRESS_COMPLETE.md** - This summary

## Status: ✅ READY TO USE

Long-press detection is fully implemented and configurable.

Try it now:
```bash
python -m ascii_scope_snn.main test.wav

# Hold any lane key (1-8) for 500ms to expand!
```

Adjust timing in `.snn/config` to match your preference.
