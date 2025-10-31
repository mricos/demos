# Cell-UI Quick Start

## 🎯 What You Have

```
/demos/
├── cellui-apps.html    ← START HERE (landing page)
├── cui/                ← Framework (window.CUI)
├── sir/                ← SIR epidemic app
└── dimer/              ← Turing patterns app
```

## 🚀 Quick Launch

```bash
# Landing page
open cellui-apps.html

# Framework test
open cui/index.html

# SIR simulation
open sir/sir.html

# Turing patterns
open dimer/dimer.html
```

## 🔍 Framework Status

The modules you see loaded:
```javascript
CUIDebug.status();     // ✓ 8 modules loaded

lifecycle          // Module system
redux-lite         // State management ⭐
tabs              // Tab component
fab               // Floating action buttons
behaviors         // Sliders, dropdowns
command-manager   // Command routing
terminal          // CLI terminal
meta              // Self-documentation
```

## 💻 Console Commands

### Redux-Lite
```javascript
// Get state
CUI.getState()                    // Full state tree
CUI.getState('sir')               // SIR slice
CUI.getState('dimer')             // Dimer slice

// Dispatch actions
CUI.dispatch({ type: 'SIR/START' })
CUI.dispatch({ type: 'DIMER/LOAD_PRESET', payload: 'waves' })

// Debug
CUI.Redux.getHistory()            // Last 50 actions
CUI.Redux.getReducers()           // ['sir', 'dimer', ...]
CUI.Redux.clearHistory()          // Clear log
```

### Framework Debug
```javascript
CUIDebug.status()                 // Module status
CUIDebug.modules()                // List modules
CUIDebug.graph()                  // Dependency graph
testCUI()                         // Run full test (on cui/index.html)
```

## 📝 Creating Your Own App

1. **Create directory**
   ```bash
   mkdir myapp
   cd myapp
   ```

2. **Create HTML** (`myapp.html`)
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <link rel="stylesheet" href="../cui/css/cui-base.css">
     <link rel="stylesheet" href="../cui/css/cui-components.css">
     <link rel="stylesheet" href="myapp.css">
   </head>
   <body>
     <div id="app"></div>

     <!-- Core -->
     <script src="../cui/core/cui-core.js"></script>
     <script src="../cui/core/cui-lifecycle.js"></script>
     <script src="../cui/core/cui-tokens.js"></script>

     <!-- Redux-lite -->
     <script src="../cui/utils/cui-redux-lite.js"></script>

     <!-- Your app -->
     <script src="myapp.js"></script>

     <script>
       CUI.ready(() => {
         CUI.Tokens.inject();
         MyApp.init();
       });
     </script>
   </body>
   </html>
   ```

3. **Create JavaScript** (`myapp.js`)
   ```javascript
   (function() {
     window.MyApp = {
       init() {
         // Define actions
         const Actions = {
           START: 'MYAPP/START',
           STOP: 'MYAPP/STOP'
         };

         // Register reducer
         CUI.Redux.reducer('myapp', (state = { running: false }, action) => {
           switch (action.type) {
             case Actions.START:
               return { ...state, running: true };
             case Actions.STOP:
               return { ...state, running: false };
             default:
               return state;
           }
         }, { running: false });

         // Subscribe to changes
         CUI.Redux.subscribe((state, prevState) => {
           if (state.myapp.running !== prevState.myapp.running) {
             console.log('Running:', state.myapp.running);
           }
         });

         this.Actions = Actions;
       }
     };
   })();
   ```

4. **Create CSS** (`myapp.css`)
   ```css
   /* Your app-specific styles */
   .myapp-container {
     /* ... */
   }
   ```

## 🎨 Design Tokens

All available as CSS variables:

```css
/* Colors */
--cui-bg: #0b0f14
--cui-panel: #11161d
--cui-text: #dbe7f3
--cui-accent: #4aa3ff
--cui-good: #29d398
--cui-warn: #f7b955

/* Spacing */
--cui-space-xs: 4px
--cui-space-sm: 8px
--cui-space-md: 12px
--cui-space-lg: 18px

/* Use in CSS */
.my-element {
  background: var(--cui-panel);
  color: var(--cui-text);
  padding: var(--cui-space-md);
}
```

## 🔥 Hot Reload

Still works! Edit any module, copy entire file, paste in console → instant update.

```javascript
// After pasting updated module
CUIDebug.reload('terminal');  // Reload specific module
```

## 📚 Documentation

- `cui/README.md` - Complete framework docs
- `REFACTORING_SUMMARY.md` - What changed in v0.2.0
- `REDUX_ANALYSIS.md` - Redux design decisions

## 🎯 Examples

### SIR App Structure
```javascript
// Define actions
Actions = {
  START: 'SIR/START',
  PAUSE: 'SIR/PAUSE',
  UPDATE_STATS: 'SIR/UPDATE_STATS'
}

// Register reducer
CUI.Redux.reducer('sir', reducerFn, initialState);

// Dispatch actions
CUI.dispatch({ type: Actions.START });

// Subscribe to changes
CUI.Redux.subscribe((state, prevState) => {
  if (state.sir.stats !== prevState.sir.stats) {
    updateUI(state.sir.stats);
  }
});
```

### Dimer App Structure
```javascript
// Load preset
CUI.dispatch({
  type: 'DIMER/LOAD_PRESET',
  payload: 'waves'
});

// Perturb grid
CUI.dispatch({ type: 'DIMER/PERTURB' });

// Get current pattern
const pattern = CUI.getState('dimer').pattern;
```

## 🐛 Debugging

### See Action History
```javascript
const history = CUI.Redux.getHistory();
console.table(history.map(a => ({
  type: a.type,
  time: new Date(a.meta.timestamp).toLocaleTimeString()
})));
```

### Inspect State Changes
```javascript
CUI.Redux.subscribe((state, prevState, action) => {
  console.group(action.type);
  console.log('Previous:', prevState);
  console.log('Next:', state);
  console.log('Action:', action);
  console.groupEnd();
});
```

### Check Module Status
```javascript
CUIDebug.status();      // All modules loaded?
CUIDebug.graph();       // Dependency tree
```

## ✨ Tips

1. **Always use Redux-lite for multi-component apps**
   - Easier debugging
   - Action history
   - Predictable state

2. **Use Simple State for trivial cases**
   ```javascript
   CUI.State.set('menuOpen', true);  // Still works!
   ```

3. **Check the console**
   - All CUI events logged
   - Action dispatches visible
   - Module loads tracked

4. **Explore the framework test page**
   ```bash
   open cui/index.html
   ```

5. **Read the docs**
   ```bash
   open cui/README.md
   ```

---

**Built with Cell-UI v0.2.0 - Redux-lite Edition**

🎨 Framework • 🦠 SIR • 🌀 Dimer • 📖 Docs
