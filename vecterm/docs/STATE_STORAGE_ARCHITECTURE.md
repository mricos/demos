# State Storage Architecture

## Overview

Vecterm uses **two parallel state management systems** to store application data and UI preferences:

1. **Redux Store** - For application logic state
2. **localStorage** - For UI preferences and panel states

This document explains what goes where, why, and how to work with each system.

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    VECTERM STATE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  REDUX STORE (Application State)                    │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │  File: core/store-instance.js                       │  │
│  │  Reducer: core/reducers.js                          │  │
│  │  Middleware: core/middleware.js                     │  │
│  │                                                      │  │
│  │  State Tree:                                        │  │
│  │  {                                                   │  │
│  │    auth: { isLoggedIn, username },                  │  │
│  │    uiState: {                                        │  │
│  │      sectionsCollapsed: {},     ← Right sidebar     │  │
│  │      subsectionsCollapsed: {},  ← Theme tokens      │  │
│  │    },                                                │  │
│  │    count: ...,                                       │  │
│  │    gamepad: { connected, buttons, axes },           │  │
│  │    midi: { ... }                                     │  │
│  │  }                                                   │  │
│  │                                                      │  │
│  │  Persisted To: localStorage['redux-demo-ui-state']  │  │
│  │  Auto-saved: On every Redux action (middleware)     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  LOCALSTORAGE (UI Preferences)                      │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │  File: utils/localStorage-utils.js + event handlers │  │
│  │                                                      │  │
│  │  Keys:                                               │  │
│  │  • vecterm-left-sidebar-collapsed       → boolean   │  │
│  │  • vecterm-subsections-collapsed        → {...}     │  │
│  │  • vecterm-panel-top-bar                → string    │  │
│  │  • vecterm-panel-right-sidebar          → string    │  │
│  │  • vecterm-panel-footer                 → string    │  │
│  │  • vecterm-panel-left-sidebar           → string    │  │
│  │  • vecterm-panel-cli-panel              → string    │  │
│  │  • vecterm-panel-quick-settings-panel   → string    │  │
│  │  • vecterm-show-developer-tools         → boolean   │  │
│  │  • vecterm-quick-settings               → [...]     │  │
│  │                                                      │  │
│  │  Manually saved: On UI interactions                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Redux Store (Application State)

### What's Stored Here?

**Application logic state** that affects rendering, game logic, or requires Redux dev tools:
- User authentication (`auth.isLoggedIn`, `auth.username`)
- Right sidebar (Monitor) section collapse states
- Right sidebar theme token subsection collapse states
- Gamepad connection and button states
- MIDI controller state
- Demo counter state

### File Structure

```
core/
├── store-instance.js    - Creates Redux store
├── reducers.js          - State shape & update logic
├── middleware.js        - Auto-save to localStorage
└── actions.js           - Action creators

utils/
└── localStorage-utils.js - Save/load helpers
```

### How It Works

#### 1. State Definition (`core/reducers.js`)

```javascript
const initialState = {
  uiState: {
    sectionsCollapsed: {},      // { "transitions": true, "state": false }
    subsectionsCollapsed: {},   // { "zindex": true, "colors": false }
  },
  auth: {
    isLoggedIn: false,
    username: null
  },
  // ... other state
};
```

#### 2. Actions (`core/actions.js`)

```javascript
export function toggleSection(section) {
  return { type: 'TOGGLE_SECTION', payload: section };
}
```

#### 3. Reducer Updates (`core/reducers.js`)

```javascript
case 'TOGGLE_SECTION':
  return {
    ...state,
    uiState: {
      ...state.uiState,
      sectionsCollapsed: {
        ...state.uiState.sectionsCollapsed,
        [action.payload]: !state.uiState.sectionsCollapsed[action.payload]
      }
    }
  };
```

#### 4. Middleware Auto-Save (`core/middleware.js`)

```javascript
const localStorageMiddleware = store => next => action => {
  const result = next(action);
  const state = store.getState();

  // Extract only uiState for persistence
  const uiStateToPersist = {
    sectionsCollapsed: state.uiState?.sectionsCollapsed || {},
    subsectionsCollapsed: state.uiState?.subsectionsCollapsed || {}
  };

  saveUIState(uiStateToPersist);  // Save to localStorage
  return result;
};
```

#### 5. Restoration on Boot (`core/boot-manager.js`)

```javascript
const savedUIState = loadUIState();  // Load from localStorage
const store = createStore(rootReducer, {
  uiState: savedUIState || initialState.uiState
});
```

### localStorage Key

```javascript
'redux-demo-ui-state'
```

**Contents**:
```json
{
  "sectionsCollapsed": {
    "transitions": false,
    "state": true,
    "history": false,
    "midi": true,
    "config": false,
    "theme": false
  },
  "subsectionsCollapsed": {
    "zindex": true,
    "spacing": false,
    "colors": true,
    "typography": false
  }
}
```

---

## 💾 localStorage (UI Preferences)

### What's Stored Here?

**Pure UI preferences** that don't need Redux overhead:
- Left sidebar collapsed state
- Left sidebar subsection collapse states
- Panel visibility toggles (T/R/B/L)
- Developer tools visibility
- Quick Settings panel sliders

### Why Not Redux?

These are **presentation-only** concerns:
- Don't affect game logic
- Don't need time-travel debugging
- Don't need Redux DevTools
- Simpler to manage with direct localStorage

### Direct localStorage Keys

| Key | Type | Example Value | Purpose |
|-----|------|--------------|---------|
| `vecterm-left-sidebar-collapsed` | boolean | `true` | Left sidebar collapsed? |
| `vecterm-subsections-collapsed` | Object | `{"playfield": true, "user": false}` | Left sidebar subsection states |
| `vecterm-panel-top-bar` | string | `"visible"` or `"hidden"` | Top bar visibility |
| `vecterm-panel-right-sidebar` | string | `"visible"` | Right sidebar visibility |
| `vecterm-panel-footer` | string | `"visible"` | Footer visibility |
| `vecterm-panel-left-sidebar` | string | `"visible"` | Left sidebar visibility |
| `vecterm-panel-cli-panel` | string | `"hidden"` | CLI terminal visibility |
| `vecterm-panel-quick-settings-panel` | string | `"hidden"` | Quick Settings visibility |
| `vecterm-show-developer-tools` | boolean | `false` | Developer section visible? |
| `vecterm-quick-settings` | Array | `["glow", "scanlines", "wave"]` | Quick Settings sliders |

### How It Works

#### Save Example

```javascript
// Left sidebar toggle
leftSidebar.classList.toggle('collapsed');
const isCollapsed = leftSidebar.classList.contains('collapsed');
localStorage.setItem('vecterm-left-sidebar-collapsed', isCollapsed);
```

#### Load Example

```javascript
// Restore left sidebar state
const collapsed = localStorage.getItem('vecterm-left-sidebar-collapsed');
if (collapsed === 'true') {
  leftSidebar.classList.add('collapsed');
}
```

#### Complex Object Example

```javascript
// Save subsection collapse states
const collapsedState = JSON.parse(
  localStorage.getItem('vecterm-subsections-collapsed') || '{}'
);
collapsedState[subsection] = isCollapsed;
localStorage.setItem(
  'vecterm-subsections-collapsed',
  JSON.stringify(collapsedState)
);

// Restore subsection collapse states
const subsectionsCollapsed = JSON.parse(
  localStorage.getItem('vecterm-subsections-collapsed') || '{}'
);
Object.keys(subsectionsCollapsed).forEach(subsection => {
  if (subsectionsCollapsed[subsection]) {
    const content = document.getElementById(`subsection-${subsection}`);
    content.classList.add('collapsed');
  }
});
```

---

## 🔄 Decision Tree: Redux vs localStorage

Use this flowchart to decide where to store state:

```
Does it affect game logic or rendering?
│
├─ YES ────────────────────────────► Use Redux Store
│                                    (gamepad, midi, auth, etc.)
│
└─ NO ─► Is it a UI preference?
         │
         ├─ YES ──► Does it need debugging?
         │          │
         │          ├─ YES ────────► Use Redux Store
         │          │                (complex state, needs DevTools)
         │          │
         │          └─ NO ─────────► Use localStorage
         │                           (panel visibility, collapse states)
         │
         └─ NO ────────────────────► Consider if it needs persistence
                                     at all (ephemeral state can live
                                     in component only)
```

### Examples

| State | Redux? | localStorage? | Why? |
|-------|--------|--------------|------|
| User logged in | ✅ | ❌ | Affects app logic |
| Gamepad connected | ✅ | ❌ | Affects game rendering |
| Right sidebar collapsed | ✅ | ✅ (via middleware) | Redux for consistency |
| Left sidebar collapsed | ❌ | ✅ | Pure UI, no logic impact |
| VT100 glow value | ✅ | ❌ | Affects terminal rendering |
| Quick Settings sliders | ❌ | ✅ | UI preference only |
| Panel toggles (TRBL) | ❌ | ✅ | UI layout only |

---

## 🛠️ Working With State

### Adding New Redux State

#### 1. Define in Reducer (`core/reducers.js`)

```javascript
const initialState = {
  myNewFeature: {
    enabled: false,
    value: 0
  }
};
```

#### 2. Create Action (`core/actions.js`)

```javascript
export function enableFeature() {
  return { type: 'ENABLE_FEATURE' };
}
```

#### 3. Handle in Reducer

```javascript
case 'ENABLE_FEATURE':
  return {
    ...state,
    myNewFeature: {
      ...state.myNewFeature,
      enabled: true
    }
  };
```

#### 4. Dispatch from UI

```javascript
import * as Actions from '../core/actions.js';

button.addEventListener('click', () => {
  store.dispatch(Actions.enableFeature());
});
```

### Adding New localStorage State

#### 1. Choose Key Name

Follow naming convention: `vecterm-{feature}-{property}`

Example: `vecterm-theme-mode` for dark/light theme

#### 2. Save on Change

```javascript
themeToggle.addEventListener('click', () => {
  const isDark = body.classList.toggle('dark-theme');
  localStorage.setItem('vecterm-theme-mode', isDark ? 'dark' : 'light');
});
```

#### 3. Restore on Load

```javascript
function initializeTheme() {
  const theme = localStorage.getItem('vecterm-theme-mode');
  if (theme === 'dark') {
    body.classList.add('dark-theme');
  }
}
```

---

## 🔍 Debugging State

### Redux State

**Chrome Redux DevTools**:
1. Install [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools)
2. Open DevTools → Redux tab
3. See all actions, state changes, time-travel debugging

**Console**:
```javascript
// Get current Redux state
window.Vecterm.store.getState()

// Subscribe to changes
window.Vecterm.store.subscribe(() => {
  console.log('State changed:', window.Vecterm.store.getState());
});
```

### localStorage State

**Console**:
```javascript
// View all Vecterm localStorage keys
Object.keys(localStorage)
  .filter(key => key.startsWith('vecterm-'))
  .forEach(key => {
    console.log(key, localStorage.getItem(key));
  });

// Clear all Vecterm localStorage
Object.keys(localStorage)
  .filter(key => key.startsWith('vecterm-'))
  .forEach(key => localStorage.removeItem(key));

// View specific key
JSON.parse(localStorage.getItem('vecterm-subsections-collapsed'));
```

**Chrome DevTools**:
1. Application tab → Storage → Local Storage
2. Look for keys starting with `vecterm-`
3. Double-click to edit, right-click to delete

---

## 📊 State Persistence Flow

### On Page Load

```
1. Boot Manager starts
   ↓
2. Load Redux state from localStorage['redux-demo-ui-state']
   ↓
3. Create Redux store with restored state
   ↓
4. Initialize event handlers
   ↓
5. Restore UI preferences from localStorage['vecterm-*']
   │
   ├─ Left sidebar collapsed state
   ├─ Subsection collapsed states
   ├─ Panel visibility states
   ├─ Developer tools visibility
   └─ Quick Settings sliders
   ↓
6. Apply restored UI states to DOM
```

### During Usage

```
User interacts with UI
   │
   ├─ Redux-managed?
   │  │
   │  ├─ YES → Dispatch action
   │  │         ↓
   │  │      Reducer updates state
   │  │         ↓
   │  │      Middleware saves to localStorage['redux-demo-ui-state']
   │  │         ↓
   │  │      Subscribers update UI
   │  │
   │  └─ NO → Direct localStorage update
   │            ↓
   │         localStorage.setItem('vecterm-*', value)
   │            ↓
   │         Update DOM immediately
```

---

## 🚨 Common Pitfalls

### 1. Mixing Redux and Direct DOM Updates

❌ **Bad**:
```javascript
// Updating DOM without updating Redux
button.addEventListener('click', () => {
  panel.classList.toggle('hidden');  // Only updates DOM
});
```

✅ **Good**:
```javascript
// Update Redux, let subscriber update DOM
button.addEventListener('click', () => {
  store.dispatch(Actions.togglePanel('my-panel'));
});
```

### 2. Forgetting to Parse JSON

❌ **Bad**:
```javascript
const state = localStorage.getItem('vecterm-subsections-collapsed');
if (state.playfield) {  // Error: state is a string!
  // ...
}
```

✅ **Good**:
```javascript
const state = JSON.parse(
  localStorage.getItem('vecterm-subsections-collapsed') || '{}'
);
if (state.playfield) {  // Now it's an object
  // ...
}
```

### 3. Not Handling Missing Keys

❌ **Bad**:
```javascript
const collapsed = localStorage.getItem('vecterm-left-sidebar-collapsed');
if (collapsed) {  // Will be truthy even if "false"!
  sidebar.classList.add('collapsed');
}
```

✅ **Good**:
```javascript
const collapsed = localStorage.getItem('vecterm-left-sidebar-collapsed');
if (collapsed === 'true') {  // Explicitly check for string "true"
  sidebar.classList.add('collapsed');
}
```

### 4. Storing Too Much in localStorage

localStorage has a **5-10MB limit** per domain. Don't store:
- Large arrays of data
- Image data
- Frequent updates (use Redux for high-frequency changes)

---

## 📝 Summary

### Redux Store
- **What**: Application logic state
- **Why**: Debugging, time-travel, state management
- **Where**: `localStorage['redux-demo-ui-state']`
- **How**: Middleware auto-saves on every action

### localStorage
- **What**: UI preferences
- **Why**: Simple, no Redux overhead
- **Where**: `localStorage['vecterm-*']` keys
- **How**: Manual `setItem()` on UI interactions

### Key Takeaway

**If it affects how the app works → Redux**
**If it affects how the app looks → localStorage**

---

## 🔗 Related Files

```
State Management:
├── core/store-instance.js       - Redux store creation
├── core/reducers.js             - State shape & reducers
├── core/middleware.js           - Auto-save middleware
├── core/actions.js              - Action creators
├── utils/localStorage-utils.js  - Save/load helpers
└── ui/event-handlers.js         - UI state updates

Documentation:
├── docs/STATE_STORAGE_ARCHITECTURE.md  (this file)
├── docs/GAME_PLATFORM_ARCHITECTURE.md
└── docs/LEFT_SIDEBAR_REFACTOR.md
```

---

## 🎯 Quick Reference

```javascript
// REDUX (Application State)
import * as Actions from '../core/actions.js';
store.dispatch(Actions.toggleSection('my-section'));
const state = store.getState();

// LOCALSTORAGE (UI Preferences)
localStorage.setItem('vecterm-panel-cli', 'hidden');
const value = localStorage.getItem('vecterm-panel-cli');

// COMPLEX OBJECTS
const obj = JSON.parse(localStorage.getItem('vecterm-obj') || '{}');
obj.newProp = 'value';
localStorage.setItem('vecterm-obj', JSON.stringify(obj));

// DEBUGGING
console.log(store.getState());  // Redux state
console.log(localStorage);      // All localStorage
```
