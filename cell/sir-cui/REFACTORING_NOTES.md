# SIR-CUI Refactoring Notes

## File Structure

```
demos/cell/sir-cui/
├── index.html              # NEW - Clean Cell UI version (120 lines)
├── sir.html                # ORIGINAL - Monolithic version (2500+ lines)
├── sir.js                  # FIXED - Redux-lite logic (627 lines)
├── sir.css                 # UNCHANGED - Demo styles (14KB)
├── README.md               # NEW - Documentation
└── REFACTORING_NOTES.md    # This file
```

## What We Created

### 1. index.html (NEW)
A clean HTML file that:
- ✅ Loads Cell UI framework modules
- ✅ Loads Redux-lite state management
- ✅ Loads FAB component
- ✅ Loads sir.js for application logic
- ✅ NO inline JavaScript
- ✅ Clean separation of concerns

**Key Framework Imports:**
```html
<!-- Core -->
<script src="../cui/core/cui-core.js"></script>
<script src="../cui/core/cui-tokens.js"></script>
<script src="../cui/core/cui-lifecycle.js"></script>

<!-- Redux-lite -->
<script src="../cui/utils/cui-redux-lite.js"></script>

<!-- Components -->
<script src="../cui/components/cui-fab.js"></script>

<!-- Demo -->
<script src="sir.js"></script>
```

### 2. sir.js (FIXED)

**The Problem:**
Original code had a timing bug:
```javascript
// init() method - BEFORE FIX
this.resetSimulation();  // Line 150 - calls updateStats()
this.Actions = Actions;  // Line 151 - too late!

// updateStats() tries to use this.Actions.UPDATE_STATS
// but this.Actions is still undefined!
```

**The Fix:**
```javascript
// init() method - AFTER FIX
this.Actions = Actions;  // Line 147 - moved BEFORE resetSimulation
this.setupUI();
this.resetSimulation();  // Line 153 - now this.Actions is defined
```

**Verification of this.Actions usage:**
- Line 147: ✅ Assignment (initialization)
- Line 186: ✅ setupUI() - called after 147
- Line 190: ✅ setupUI() - called after 147
- Line 196: ✅ setupUI() - called after 147
- Line 219: ✅ setupUI() - called after 147
- Line 277: ✅ updateStats() - called after 147 (the fix!)
- Line 366: ✅ onParamChanged() - event handler

### 3. README.md (NEW)
Complete documentation including:
- Architecture explanation
- Redux-lite pattern usage
- Comparison with original
- Debugging guide
- Benefits of refactoring

## What We Preserved

### sir.html (ORIGINAL - UNTOUCHED)
- Kept as reference
- Original monolithic implementation
- All JavaScript inline
- Still functional

### sir.css (UNCHANGED)
- Demo-specific styles
- Compatible with both versions
- Uses CSS variables for theming

## Redux-Lite Pattern in sir.js

The file already uses proper Redux-lite:

```javascript
// 1. Define Actions
const Actions = {
  START: 'SIR/START',
  PAUSE: 'SIR/PAUSE',
  RESET: 'SIR/RESET',
  UPDATE_STATS: 'SIR/UPDATE_STATS',
  UPDATE_PARAMS: 'SIR/UPDATE_PARAMS'
};

// 2. Register Reducer
CUI.Redux.reducer('sir', (state = initialState, action) => {
  switch (action.type) {
    case Actions.START:
      return { ...state, running: true };
    case Actions.PAUSE:
      return { ...state, running: false };
    case Actions.UPDATE_STATS:
      return {
        ...state,
        time: action.payload.time,
        stats: action.payload.stats
      };
    default:
      return state;
  }
}, initialState);

// 3. Subscribe to State Changes
CUI.Redux.subscribe((state, prevState) => {
  const sir = state.sir;
  const prevSir = prevState.sir;

  if (sir.stats !== prevSir.stats) {
    this.updateStatsDisplay(sir.stats);
  }

  if (sir.running !== prevSir.running) {
    sir.running ? this.startSimulation() : this.stopSimulation();
  }
});

// 4. Dispatch Actions
CUI.dispatch({ type: this.Actions.START });
CUI.dispatch({
  type: this.Actions.UPDATE_STATS,
  payload: { time, stats }
});
```

## Running the Demo

### Option 1: Direct File Open
```bash
open index.html
```

### Option 2: Local Server (Recommended)
```bash
cd demos/cell/sir-cui
python3 -m http.server 8000
# Visit: http://localhost:8000/index.html
```

### Option 3: From Parent Directory
```bash
cd demos
python3 -m http.server 8000
# Visit: http://localhost:8000/cell/sir-cui/index.html
```

## Browser Console Debugging

Once the demo is running:

```javascript
// View entire state tree
CUI.getState()

// View SIR state slice
CUI.getState('sir')

// View action history (last 50 actions)
CUI.Redux.getHistory()

// View registered reducers
CUI.Redux.getReducers()

// Dispatch actions manually
CUI.dispatch({ type: 'SIR/PAUSE' })
CUI.dispatch({ type: 'SIR/START' })

// Check CUI module status
CUIDebug.status()
CUIDebug.modules()
```

## Error Fixed

**Before:**
```
[CUI] Error in ready callback: TypeError: Cannot read properties of undefined
(reading 'UPDATE_STATS') at Object.updateStats (sir.js:275:28)
```

**After:**
```
[CUI] Design tokens injected
[CUI] SIR App initializing...
[CUI] Reducer "sir" registered
[CUI] FAB "fab" created
[CUI] SIR App ready
```

## Benefits Achieved

1. **Clean Architecture**
   - Framework code separate from demo code
   - No inline JavaScript in HTML
   - Modular, reusable components

2. **Redux-lite State Management**
   - Single source of truth
   - Predictable state updates
   - Action history for debugging
   - Easy to extend

3. **Maintainability**
   - 120-line HTML vs 2500-line original
   - Clear file organization
   - Easy to understand and modify

4. **Developer Experience**
   - Hot-reload support (paste code in console)
   - Rich debugging tools
   - Time-travel debugging possible

## Next Steps (Optional)

- [ ] Add Terminal plugin for CLI commands
- [ ] Add WikiPopup for epidemiology terms
- [ ] Add preset scenarios
- [ ] Add experiment tracking
- [ ] Add parameter presets
- [ ] Add export/import state
- [ ] Add animation controls

## Credits

- **Original SIR Demo**: mricos (demos/cell/sir/sir.html)
- **Cell UI Framework**: mricos (demos/cell/cui/)
- **Refactoring**: 2025-10-31
- **Bug Fix**: this.Actions timing issue
