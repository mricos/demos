# SIR-CUI - Cell UI Refactored Demo

**A clean refactoring of the SIR epidemic model demo using the Cell UI framework**

## What This Is

This directory contains a **refactored version** of the SIR (Susceptible-Infected-Recovered) epidemic model demo that properly uses the Cell UI framework.

## Directory Structure

```
demos/cell/sir-cui/
  index.html      # Clean HTML using Cell UI framework
  sir.js          # Redux-lite state management (unchanged)
  sir.css         # Demo-specific styles
  README.md       # This file
```

## Key Differences from Original

### Original (`demos/cell/sir/sir.html`)
- ❌ All JavaScript inline in HTML (2000+ lines)
- ❌ No framework imports
- ❌ Manual DOM manipulation
- ❌ Hard to maintain and debug

### Refactored (`demos/cell/sir-cui/index.html`)
- ✅ Clean HTML structure (~100 lines)
- ✅ Imports Cell UI framework modules
- ✅ Uses Redux-lite state management
- ✅ Separation of concerns (HTML/CSS/JS)
- ✅ Modular and maintainable

## How It Works

### 1. Cell UI Framework Imports

```html
<!-- Core -->
<script src="../cui/core/cui-core.js"></script>
<script src="../cui/core/cui-tokens.js"></script>
<script src="../cui/core/cui-lifecycle.js"></script>

<!-- Redux-lite -->
<script src="../cui/utils/cui-redux-lite.js"></script>

<!-- Components -->
<script src="../cui/components/cui-fab.js"></script>
```

### 2. Redux-lite State Management

The `sir.js` file uses proper Redux-lite pattern:

```javascript
// Define actions
const Actions = {
  START: 'SIR/START',
  PAUSE: 'SIR/PAUSE',
  UPDATE_STATS: 'SIR/UPDATE_STATS',
  UPDATE_PARAMS: 'SIR/UPDATE_PARAMS'
};

// Register reducer
CUI.Redux.reducer('sir', (state = initialState, action) => {
  switch (action.type) {
    case Actions.START:
      return { ...state, running: true };
    // ...
  }
}, initialState);

// Subscribe to changes
CUI.Redux.subscribe((state, prevState) => {
  // Update UI when state changes
});

// Dispatch actions
CUI.dispatch({ type: Actions.START });
```

### 3. Component Usage

```javascript
// FAB with drawer
CUI.FAB.create({
  id: 'fab',
  drawerId: 'drawer',
  closeOthers: true
});
```

## Benefits

1. **Clean Separation**
   - HTML defines structure
   - CSS defines styles
   - JS defines behavior
   - Framework provides utilities

2. **Redux-lite State**
   - Single source of truth
   - Predictable state updates
   - Easy debugging with action history
   - Time-travel debugging possible

3. **Maintainability**
   - No more 2000-line HTML files
   - Modular code organization
   - Easy to extend and modify
   - Clear dependencies

4. **Framework Features**
   - FAB and drawer components
   - Event bus for communication
   - DOM utilities
   - Design token system

## Running the Demo

```bash
# Open in browser
open index.html
```

Or use a local server:

```bash
python3 -m http.server 8000
# Then visit http://localhost:8000/demos/cell/sir-cui/
```

## Debugging

```javascript
// In browser console:

// See all state
CUI.getState();

// See SIR state slice
CUI.getState('sir');

// See action history
CUI.Redux.getHistory();

// See registered reducers
CUI.Redux.getReducers();
```

## Comparison with Original

| Aspect | Original | Refactored |
|--------|----------|------------|
| HTML size | ~2500 lines | ~100 lines |
| Inline JS | ✓ | ✗ |
| Framework | None | Cell UI |
| State mgmt | Scattered | Redux-lite |
| Maintainability | Low | High |
| Debuggability | Hard | Easy |

## Next Steps

Potential enhancements:
- [ ] Add Terminal plugin for CLI commands
- [ ] Add WikiPopup for epidemiology terms
- [ ] Add preset scenarios (pandemic, waves, etc.)
- [ ] Add experiment tracking
- [ ] Add parameter visualization

## Credits

- **Framework**: Cell UI (CUI) v0.2.0
- **Original SIR Demo**: mricos
- **Refactored**: 2025-10-31
- **Pattern**: Redux-lite state management
