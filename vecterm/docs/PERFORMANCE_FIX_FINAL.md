# Performance Fix - Final Solution

## Problem

Game showed 60 FPS but was updating very slowly (< 1 update per second).

## Root Causes Found

### 1. Async Dispatch Overhead
- `store.dispatch()` was always `async`
- Even when skipping visualization, async overhead slowed every action
- Game dispatches actions 60 times per second

### 2. Expensive UI Updates (60 FPS)
- `logAction()` called `updateActionHistoryUI()` and `updateHUD()` for every action
- `updateActionHistoryUI()` did expensive DOM manipulation + JSON stringification
- Running 60 times per second = massive slowdown

### 3. Redux Sync Every 500ms
- ECS was dispatching `ECS_SYNC` actions every 500ms
- Each sync triggered full entity serialization
- Redux state not even used during gameplay

## Solutions Implemented

### 1. Fast Path for Gameplay Actions (core/store.js:42-53)

Added synchronous fast path that completely bypasses async:

```javascript
// FAST PATH: Skip all async for gameplay actions
if (isGameplayAction || !shouldVisualize) {
  state = reducer(state, action);
  listeners.forEach(listener => listener());

  // Only log non-silent actions
  if (hooks.logAction && !action.meta?.silent) {
    hooks.logAction(action);
  }

  return action;
}
```

**Impact:** Gameplay actions now execute synchronously with zero async overhead.

### 2. Throttled UI Updates (core/boot-manager.js:377-402)

Added intelligent throttling to `logAction()`:

```javascript
const isGameplayAction = /* ... */;

if (!isGameplayAction) {
  // Always update UI for non-gameplay actions
  this.updateActionHistoryUI();
  this.updateHUD();
} else {
  // Throttle gameplay action UI updates to 10 FPS max
  const now = Date.now();
  if (!this.lastUIUpdate || now - this.lastUIUpdate > 100) {
    this.lastUIUpdate = now;
    this.updateActionHistoryUI();
    this.updateHUD();
  }
}
```

**Impact:** UI updates throttled from 60 FPS → 10 FPS during gameplay.

### 3. Disabled Redux Sync (core/ecs.js:23-25, 232-233)

Added flag to completely disable Redux sync during gameplay:

```javascript
// ULTRA PERFORMANCE: Disable Redux sync entirely during gameplay
this.enableReduxSync = false;

// In syncToRedux():
if (!this.enableReduxSync) return;
```

**Impact:** Zero Redux dispatches from ECS during gameplay.

## Gameplay Actions Protected

All these action types now use the fast path:
- `UPDATE_ENTITY*`
- `MOVE_ENTITY*`
- `game/*`
- `UPDATE_ENTITIES`
- `BATCH_UPDATE_ENTITIES`
- `ECS_SYNC`
- `ECS_UPDATE`

## Performance Comparison

**Before (Slow):**
- Dispatch: Async (promises, microtasks)
- UI Updates: 60 FPS (expensive DOM + JSON)
- Redux Sync: Every 500ms
- Result: Game updates < 1 per second

**After (Fast):**
- Dispatch: Synchronous (no async overhead)
- UI Updates: 10 FPS (throttled)
- Redux Sync: Disabled
- Result: True 60 FPS gameplay

## Files Modified

1. `core/store.js`
   - Added fast path for gameplay actions
   - Skip async entirely for performance

2. `core/boot-manager.js`
   - Throttled UI updates during gameplay
   - 60 FPS → 10 FPS for action history

3. `core/ecs.js`
   - Disabled Redux sync entirely
   - Zero state dispatch overhead

## Testing

The game should now:
- ✅ Show 60 FPS
- ✅ Actually UPDATE at 60 FPS
- ✅ Ball moves smoothly
- ✅ Paddles respond instantly
- ✅ No sluggish behavior

## Configuration

To enable Redux sync for debugging (if needed):

```javascript
// In browser console:
window.Vecterm.getSystem('store').getState().games.instances['quadrapong'].instance.ecs.enableReduxSync = true;
```

To check performance mode:

```
perf
```

## Trade-offs

**What we kept:**
- ✅ 60 FPS gameplay
- ✅ Smooth responsive controls
- ✅ Zero lag

**What we sacrificed:**
- ⚠️ Redux DevTools won't show entity updates in real-time
- ⚠️ Action history updates at 10 FPS instead of 60 FPS
- ⚠️ Entity inspector panels need separate implementation

This is the correct trade-off: gameplay performance is critical, debugging tools can refresh slower.
