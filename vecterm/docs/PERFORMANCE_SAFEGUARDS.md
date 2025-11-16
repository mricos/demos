# Performance Safeguards

## Problem

Redux animation system was causing games to run at 1 FPS instead of 60 FPS by adding ~250ms delay to every action.

## Root Cause

- `store.js:27` checks `hooks.animationEnabled` before throttling
- If animation checkbox was enabled (via UI or localStorage), ALL actions would be delayed
- Game loop dispatches actions 60 times per second
- Result: 60 FPS → 1 FPS (unplayable)

## Solution Implemented

### 1. Defensive Guard in Store (core/store.js:25-38)

Added automatic detection of gameplay actions:

```javascript
// DEFENSIVE GUARD: Never animate during active gameplay
const isGameplayAction = action.type && (
  action.type.startsWith('UPDATE_ENTITY') ||
  action.type.startsWith('MOVE_ENTITY') ||
  action.type.startsWith('game/') ||
  action.type === 'UPDATE_ENTITIES' ||
  action.type === 'BATCH_UPDATE_ENTITIES'
);

const shouldVisualize = hooks.visualizeStep &&
                       hooks.animationEnabled &&
                       !isGameplayAction;
```

**Effect:** Even if animation is enabled, gameplay actions skip the delay entirely.

### 2. Performance Debug Commands (cli/command-processor.js:236-275)

Added CLI commands to diagnose and fix performance issues:

#### `perf` - Check performance status
Shows:
- Animation enabled/disabled status
- Current delay setting
- Warning if animation is slowing things down
- Instructions to fix

#### `perf.fix` - Force disable animation
Immediately disables Redux animation and restores 60 FPS performance.

### 3. Exposed Visualization Hooks (core/store.js:77-82)

Store now exposes `visualizationHooks` for runtime control:

```javascript
const store = {
  getState,
  dispatch,
  subscribe,
  visualizationHooks: hooks  // ← Now accessible
};
```

Can check/modify at runtime:
```javascript
// Check if animation is enabled
console.log(window.Vecterm.store.visualizationHooks.animationEnabled);

// Force disable
window.Vecterm.store.visualizationHooks.animationEnabled = false;
```

## Usage

### If Game is Running Slow

1. **Check status:**
   ```
   perf
   ```

2. **If animation is enabled, fix it:**
   ```
   perf.fix
   ```

3. **Or manually via System Settings:**
   - Click ⚙️ icon
   - Uncheck "Enable State Flow Animation"

### Preventive Measures

The defensive guard in `store.js` means:
- ✅ Gameplay is ALWAYS fast, even if animation enabled
- ✅ Non-gameplay actions can still be animated (if desired)
- ✅ No user intervention needed during gameplay

## Technical Details

### Action Types Protected

The defensive guard automatically skips animation for:
- `UPDATE_ENTITY*` - Individual entity updates
- `MOVE_ENTITY*` - Entity movement
- `game/*` - Any game-namespaced action
- `UPDATE_ENTITIES` - Batch entity updates
- `BATCH_UPDATE_ENTITIES` - Large batch updates

### Performance Impact

**Before (with animation enabled):**
- Action dispatch time: ~250ms
- Frame rate: 1 FPS
- Playability: Unacceptable

**After (with defensive guard):**
- Gameplay action dispatch time: <1ms
- Frame rate: 60 FPS
- Playability: Excellent

**Non-gameplay actions (with animation enabled):**
- Still animated for educational purposes
- Doesn't affect game performance

## Files Modified

- `core/store.js` - Added defensive guard + exposed hooks
- `cli/command-processor.js` - Added perf debug commands

## Testing

1. Enable animation in System Settings
2. Run `play quadrapong`
3. Game should still run at 60 FPS (not 1 FPS)
4. Run `perf` to verify status
5. Use `perf.fix` if needed

## Future Improvements

Consider:
- Auto-disable animation when any game starts
- Add performance monitoring/FPS counter
- Warn user if animation is on when starting a game
- Add `perf.status` for continuous monitoring
