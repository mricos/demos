# Right Sidebar State Persistence Fix

## Problem

**Issue**: Right sidebar (Monitor) reopens on page reload even when closed by the user.

**Expected**: Sidebar should remain collapsed after reload if user closed it.

**Observed**: Sidebar always opens on reload, ignoring user preference.

---

## Root Cause Analysis

### The Bug

The right sidebar collapse state was being **saved but not restored**:

1. ✅ **Redux Store** had `sidebarCollapsed` state
2. ✅ **Middleware** saved it to localStorage
3. ❌ **Event handler** didn't dispatch Redux action (just toggled CSS)
4. ❌ **No subscriber** applied Redux state to DOM on load

### What Was Happening

```
User closes sidebar
  ↓
Event handler toggles CSS class: sidebar.classList.toggle('collapsed')
  ↓
Redux state unchanged (still sidebarCollapsed: false)
  ↓
Middleware saves Redux state: { sidebarCollapsed: false }
  ↓
Page reload
  ↓
Redux loads state: { sidebarCollapsed: false }
  ↓
No code applies "collapsed" class to DOM
  ↓
Sidebar opens (because no CSS class applied) ❌
```

### Why It Happened

**Two separate systems not communicating**:

1. **DOM State**: CSS class `.collapsed` on `#right-sidebar`
2. **Redux State**: Boolean `uiState.sidebarCollapsed`

The event handler was updating DOM but not Redux. Redux was saving state but not applying it to DOM.

---

## The Fix

### Changed: `ui/event-handlers.js` (lines 53-88)

#### Before (Broken)

```javascript
// Sidebar collapse toggle
const sidebarToggle = document.getElementById('sidebar-toggle');
if (sidebarToggle) {
  sidebarToggle.addEventListener('click', () => {
    const sidebar = document.getElementById('right-sidebar');
    sidebar.classList.toggle('collapsed');  // ❌ Only updates DOM
  });
}
// ❌ No restoration logic
// ❌ No Redux dispatch
// ❌ No subscriber
```

#### After (Fixed)

```javascript
// Right sidebar collapse toggle
const sidebarToggle = document.getElementById('sidebar-toggle');
const rightSidebar = document.getElementById('right-sidebar');

if (sidebarToggle && rightSidebar) {
  // ✅ 1. Restore sidebar state from Redux store on page load
  if (savedUIState && savedUIState.sidebarCollapsed) {
    rightSidebar.classList.add('collapsed');
    console.log('[RIGHT SIDEBAR] Restored collapsed state from Redux');
  }

  // ✅ 2. Toggle handler dispatches Redux action
  sidebarToggle.addEventListener('click', () => {
    store.dispatch(Actions.toggleSidebar());  // Updates Redux state
  });

  // ✅ 3. Subscribe to Redux changes and apply to DOM
  store.subscribe(() => {
    const state = store.getState();
    const shouldBeCollapsed = state.uiState?.sidebarCollapsed || false;
    const isCollapsed = rightSidebar.classList.contains('collapsed');

    // Sync Redux state to DOM
    if (shouldBeCollapsed && !isCollapsed) {
      rightSidebar.classList.add('collapsed');
      console.log('[RIGHT SIDEBAR] Collapsed via Redux');
    } else if (!shouldBeCollapsed && isCollapsed) {
      rightSidebar.classList.remove('collapsed');
      console.log('[RIGHT SIDEBAR] Expanded via Redux');
    }
  });
}
```

---

## How It Works Now

### Correct Flow

```
User clicks collapse button (◀)
  ↓
Event handler dispatches: store.dispatch(Actions.toggleSidebar())
  ↓
Redux reducer updates: sidebarCollapsed: false → true
  ↓
Middleware auto-saves to localStorage: { sidebarCollapsed: true }
  ↓
Subscriber detects state change
  ↓
Subscriber adds CSS class: sidebar.classList.add('collapsed')
  ↓
Sidebar collapses visually ✅

Page reload
  ↓
Redux loads state from localStorage: { sidebarCollapsed: true }
  ↓
Event handler checks savedUIState.sidebarCollapsed
  ↓
Adds CSS class: sidebar.classList.add('collapsed')
  ↓
Sidebar remains collapsed ✅
```

---

## Three-Part Fix

### 1. **Restore State on Page Load**

```javascript
if (savedUIState && savedUIState.sidebarCollapsed) {
  rightSidebar.classList.add('collapsed');
}
```

Reads Redux state (loaded from localStorage) and applies to DOM.

### 2. **Dispatch Redux Action on Click**

```javascript
sidebarToggle.addEventListener('click', () => {
  store.dispatch(Actions.toggleSidebar());  // Not just CSS toggle!
});
```

Updates Redux state, which triggers middleware to save to localStorage.

### 3. **Subscribe to Redux Changes**

```javascript
store.subscribe(() => {
  const shouldBeCollapsed = state.uiState?.sidebarCollapsed || false;
  // Sync Redux state to DOM
  if (shouldBeCollapsed && !isCollapsed) {
    rightSidebar.classList.add('collapsed');
  }
});
```

Keeps DOM in sync with Redux state automatically.

---

## Why This Approach?

### Comparison: Redux vs localStorage

**Right Sidebar**: Uses **Redux** (via middleware to localStorage)

**Left Sidebar**: Uses **direct localStorage**

**Why different?**

| Aspect | Right Sidebar | Left Sidebar |
|--------|--------------|--------------|
| **State System** | Redux | localStorage |
| **Why?** | Historical - existed before left sidebar | New - simpler pattern |
| **Sections Collapse** | Redux `sectionsCollapsed` | No sections (only subsections) |
| **Subsections Collapse** | Redux `subsectionsCollapsed` | Direct localStorage |
| **Should Refactor?** | Could unify, but works now | - |

### Should We Unify?

**Option 1**: Keep as-is (mixed approach)
- ✅ Works correctly now
- ✅ No breaking changes
- ❌ Two patterns to remember

**Option 2**: Move right sidebar to direct localStorage
- ✅ Consistent with left sidebar
- ❌ Requires Redux refactor
- ❌ Breaking change

**Recommendation**: Keep as-is. Both patterns work, and changing would risk introducing bugs.

---

## Testing

### Before Fix

1. Open page → Right sidebar visible
2. Click ◀ to collapse sidebar
3. Reload page
4. **Bug**: Sidebar opens again ❌

### After Fix

1. Open page → Right sidebar visible
2. Click ◀ to collapse sidebar
3. Console: `[RIGHT SIDEBAR] Collapsed via Redux`
4. Reload page
5. Console: `[RIGHT SIDEBAR] Restored collapsed state from Redux`
6. **Fixed**: Sidebar remains collapsed ✅

### Verify in Console

```javascript
// Check Redux state
window.Vecterm.store.getState().uiState.sidebarCollapsed
// Should match sidebar visibility

// Check localStorage
JSON.parse(localStorage.getItem('redux-demo-ui-state')).sidebarCollapsed
// Should match Redux state
```

---

## Related Code

### Redux Action

**File**: `core/actions.js`

```javascript
export const TOGGLE_SIDEBAR = 'TOGGLE_SIDEBAR';
export const toggleSidebar = () => ({ type: TOGGLE_SIDEBAR });
```

### Redux Reducer

**File**: `core/reducers.js`

```javascript
case ActionTypes.TOGGLE_SIDEBAR:
  return {
    ...state,
    uiState: {
      ...state.uiState,
      sidebarCollapsed: !state.uiState.sidebarCollapsed  // Toggle boolean
    }
  };
```

### Middleware

**File**: `core/middleware.js`

```javascript
const uiStateToPersist = {
  sidebarCollapsed: state.uiState?.sidebarCollapsed || false,
  sectionsCollapsed: state.uiState?.sectionsCollapsed || {},
  subsectionsCollapsed: state.uiState?.subsectionsCollapsed || {}
};
saveUIState(uiStateToPersist);  // Auto-save to localStorage
```

---

## Lessons Learned

### 1. **Single Source of Truth**

When using Redux, don't manually toggle CSS classes. Let Redux be the source of truth:

❌ **Bad**:
```javascript
button.addEventListener('click', () => {
  element.classList.toggle('collapsed');  // Manual DOM update
});
```

✅ **Good**:
```javascript
button.addEventListener('click', () => {
  store.dispatch(Actions.toggleSidebar());  // Update Redux
});

store.subscribe(() => {
  // Redux → DOM sync
  if (state.collapsed) {
    element.classList.add('collapsed');
  }
});
```

### 2. **Restoration is Required**

Saving state is only half the battle. You must:
1. ✅ Save state (middleware)
2. ✅ Restore state on load (event handler)
3. ✅ Subscribe to changes (event handler)

### 3. **Console Logging Helps**

Adding `console.log()` made debugging easy:
- `[RIGHT SIDEBAR] Restored collapsed state from Redux`
- `[RIGHT SIDEBAR] Collapsed via Redux`

Without logs, it's hard to see if state is being restored.

---

## Summary

**Problem**: Right sidebar didn't persist collapsed state across reloads.

**Root Cause**:
- Event handler toggled CSS but didn't dispatch Redux action
- No code restored Redux state to DOM on page load
- No subscriber kept Redux and DOM in sync

**Fix**:
1. Restore state from Redux on page load
2. Dispatch Redux action on click (not just CSS toggle)
3. Subscribe to Redux changes to keep DOM in sync

**Result**: Right sidebar collapse state now persists correctly! ✅
