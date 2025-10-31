# Redux Analysis & Design Decisions

## Question: Should We Bake in Redux?

**Answer:** We implemented **Redux-lite** - a simplified Redux pattern that preserves CUI's philosophy while adding predictable state management.

---

## Redux Full vs Redux-Lite vs No Redux

### Full Redux

**Pros:**
- Complete ecosystem (DevTools, middleware, thunks)
- Battle-tested in production
- Extensive documentation
- Plugin ecosystem

**Cons:**
- ❌ Requires build step (npm install)
- ❌ Not vanilla JS
- ❌ Breaks paste-in-console workflow
- ❌ Overkill for small demos
- ❌ Steeper learning curve

### Redux-Lite (What We Built)

**Pros:**
- ✅ Core benefits (actions, reducers, single state tree)
- ✅ Action history for debugging
- ✅ Still vanilla JS
- ✅ Still hot-reloadable
- ✅ Zero dependencies
- ✅ Simpler API
- ✅ No build step

**Cons:**
- ⚠️ No middleware system
- ⚠️ No DevTools integration
- ⚠️ Manual time-travel
- ⚠️ No async action helpers

### No Redux

**Pros:**
- ✅ Simplest possible
- ✅ Minimal code

**Cons:**
- ❌ State scattered everywhere
- ❌ Hard to debug "who changed what"
- ❌ No action history
- ❌ Imperative mutations
- ❌ Side effects everywhere

---

## Design Decision: Redux-Lite

We chose Redux-lite because:

1. **Preserves CUI Philosophy**
   - Vanilla JS ✓
   - No build step ✓
   - Hot-reload ✓
   - Paste-in-console ✓

2. **Adds Key Benefits**
   - Predictable state ✓
   - Action history ✓
   - Single source of truth ✓
   - Easier debugging ✓

3. **Avoids Complexity**
   - No middleware (add if needed)
   - No DevTools (console.log works)
   - No async magic (just use async/await)
   - No huge API surface

---

## Comparison: State Management Patterns

### Pattern 1: Direct Mutation (Original)

```javascript
// Where is state?
const params = { speed: 50 };

// Who changed it?
params.speed = 90; // Could be anywhere

// How do we debug?
console.log(params); // After the fact

// How do we undo?
// Can't - no history
```

**Problems:**
- State scattered
- No change tracking
- Hard to debug
- No undo/redo

### Pattern 2: CUI.State (v0.1.0)

```javascript
// Centralized key-value store
CUI.State.set('speed', 90);

// Subscribe to changes
CUI.State.subscribe('speed', (value) => {
  console.log('Speed changed:', value);
});

// Get value
const speed = CUI.State.get('speed');
```

**Better, but:**
- ✓ Centralized storage
- ✓ Change notifications
- ✓ Subscribe to keys
- ❌ No action history
- ❌ Direct mutation (`set()`)
- ❌ No "why" (just "what")

### Pattern 3: Redux-Lite (v0.2.0)

```javascript
// Define reducer (pure function)
CUI.Redux.reducer('simulation', (state = {}, action) => {
  switch (action.type) {
    case 'SET_SPEED':
      return { ...state, speed: action.payload };
    default:
      return state;
  }
}, { speed: 50 });

// Dispatch action (with "why")
CUI.dispatch({
  type: 'SET_SPEED',
  payload: 90,
  meta: { source: 'slider' }
});

// Subscribe to all changes
CUI.Redux.subscribe((state, prevState, action) => {
  console.log('Action:', action.type);
  console.log('State:', state);
});

// Debug
CUI.Redux.getHistory(); // See all actions
```

**Best of both worlds:**
- ✓ Single state tree
- ✓ Change notifications
- ✓ Action history
- ✓ Know "why" (action type)
- ✓ Pure functions (testable)
- ✓ Time-travel debugging
- ✓ Still vanilla JS

---

## What We Didn't Include (And Why)

### 1. Middleware System

**What it is:**
```javascript
const logger = store => next => action => {
  console.log('Dispatching:', action);
  return next(action);
};

store.applyMiddleware(logger);
```

**Why we skipped it:**
- Adds complexity
- Easy to add later if needed
- Can intercept in reducer if necessary

**If you need it:**
```javascript
// Add in your app
const originalDispatch = CUI.Redux.dispatch;
CUI.Redux.dispatch = function(action) {
  console.log('Action:', action); // Logging
  return originalDispatch(action);
};
```

### 2. Redux DevTools

**What it is:**
- Browser extension
- Time-travel debugging UI
- State diff viewer

**Why we skipped it:**
- Requires Redux library
- Breaks vanilla JS goal
- `CUI.Redux.getHistory()` is good enough

**Alternative:**
```javascript
// Console-based DevTools
CUI.Redux.subscribe((state, prevState, action) => {
  console.group(action.type);
  console.log('Prev:', prevState);
  console.log('Next:', state);
  console.log('Action:', action);
  console.groupEnd();
});
```

### 3. Async Actions (Thunks)

**What it is:**
```javascript
const fetchData = () => async (dispatch, getState) => {
  dispatch({ type: 'FETCH_START' });
  const data = await fetch('/api');
  dispatch({ type: 'FETCH_SUCCESS', payload: data });
};
```

**Why we skipped it:**
- Just use async/await directly
- Don't need special dispatch

**Alternative:**
```javascript
// Just use async functions
async function loadData() {
  CUI.dispatch({ type: 'LOADING' });
  const data = await fetch('/api').then(r => r.json());
  CUI.dispatch({ type: 'LOADED', payload: data });
}
```

### 4. Selector Memoization

**What it is:**
```javascript
const getR0 = createSelector(
  state => state.beta,
  state => state.gamma,
  (beta, gamma) => beta / gamma // Cached
);
```

**Why we skipped it:**
- Simple apps don't need it
- Easy to add if performance matters

**Alternative:**
```javascript
// Just compute in subscribe
CUI.Redux.subscribe((state, prevState) => {
  const { beta, gamma } = state.params;
  if (beta !== prevState.params.beta ||
      gamma !== prevState.params.gamma) {
    const r0 = beta / gamma;
    updateR0Display(r0);
  }
});
```

### 5. Immutability Enforcement

**What it is:**
- Libraries like Immer
- Automatic immutability

**Why we skipped it:**
- Vanilla JS goal
- Spread operator is good enough
- Trust developers

**Alternative:**
```javascript
// Just use spread operator
return { ...state, speed: newSpeed };

// Or Object.assign
return Object.assign({}, state, { speed: newSpeed });
```

---

## Redux-Lite API Design Decisions

### 1. Dispatch Helper on CUI

```javascript
CUI.dispatch({ type: 'ACTION' }); // Easy access
```

**Why:**
- Convenient global access
- Matches `CUI.getState()`, `CUI.subscribe()`
- Backwards compatible with `CUI.State.set()`

### 2. Backwards Compatibility

```javascript
// Old code still works
CUI.State.set('key', value);

// New code uses Redux
CUI.dispatch({ type: 'SET_KEY', payload: value });
```

**Why:**
- Gradual migration
- Don't break existing demos
- Both patterns coexist

### 3. Action History Limit (50)

```javascript
const MAX_HISTORY = 50;
```

**Why:**
- Prevents memory leaks
- 50 is enough for debugging
- Can increase if needed

### 4. Metadata on Every Action

```javascript
{
  type: 'ACTION',
  payload: {},
  meta: {
    timestamp: Date.now(),
    id: 123
  }
}
```

**Why:**
- Helps debugging
- Track when actions happened
- Correlate with logs

### 5. No Action Validation

```javascript
// We don't validate action shapes
CUI.dispatch({ type: 'ANYTHING' });
```

**Why:**
- Keep it simple
- Runtime flexibility
- Developer freedom
- Can add TypeScript later if needed

---

## When to Use Redux-Lite vs Simple State

### Use Redux-Lite When:

✅ Multiple components need same state
✅ Complex state transitions
✅ Need to debug state changes
✅ Want action history
✅ Building larger demos
✅ State changes come from many sources

**Example:** SIR simulation
- Multiple UI components
- Complex state (params, stats, running state)
- Need to debug parameter changes
- Want to replay simulations

### Use Simple State When:

✅ Single component
✅ Trivial state (boolean, counter)
✅ No debugging needed
✅ Small demos

**Example:** Toggle button
```javascript
// Overkill for Redux:
CUI.State.set('menuOpen', !CUI.State.get('menuOpen'));

// Just use local variable:
let menuOpen = false;
button.onclick = () => {
  menuOpen = !menuOpen;
  menu.classList.toggle('open', menuOpen);
};
```

---

## Performance Impact

### Benchmarks (Rough)

```
Direct mutation:     0.001ms
CUI.State.set():     0.05ms
CUI.dispatch():      0.1ms
Subscriber notify:   0.1ms per subscriber
```

**Conclusion:** Negligible for UI apps. Even with 100 actions/second, overhead is <10ms.

---

## Real-World Example: SIR Demo

### Before (Direct Mutation)

```javascript
// State scattered
const params = { N: 400, beta: 0.5, gamma: 0.2 };
const stats = { S: 400, I: 1, R: 0 };
let running = false;

// Changes everywhere
function updateSpeed(value) {
  params.speed = value;
  updateUI();
  saveToLocalStorage();
  logAnalytics();
}

// Hard to debug
console.log(params); // When did this change?
```

### After (Redux-Lite)

```javascript
// Single state tree
CUI.Redux.reducer('simulation', (state, action) => {
  switch (action.type) {
    case 'START': return { ...state, running: true };
    case 'PAUSE': return { ...state, running: false };
    case 'UPDATE_PARAMS':
      return {
        ...state,
        params: { ...state.params, ...action.payload }
      };
    default: return state;
  }
}, {
  running: false,
  params: { N: 400, beta: 0.5, gamma: 0.2 },
  stats: { S: 400, I: 1, R: 0 }
});

// Changes centralized
function updateSpeed(value) {
  CUI.dispatch({
    type: 'UPDATE_PARAMS',
    payload: { speed: value }
  });
}

// Subscribers handle side effects
CUI.Redux.subscribe((state, prevState, action) => {
  if (state.simulation.params !== prevState.simulation.params) {
    updateUI(state.simulation.params);
    saveToLocalStorage(state);
    logAnalytics(action.type);
  }
});

// Easy to debug
CUI.Redux.getHistory(); // See all changes
CUI.getState(); // Current state
```

**Benefits:**
- Clear action trail
- Centralized state logic
- Side effects in subscribers
- Easy debugging
- Can replay actions

---

## Conclusion

### We Built Redux-Lite Because:

1. **It fits CUI's philosophy**
   - Vanilla JS ✓
   - Hot-reload ✓
   - No build ✓

2. **It solves real problems**
   - State scattered → Single tree
   - No history → Action log
   - Hard to debug → Clear trail
   - Imperative → Pure reducers

3. **It's simple**
   - ~200 LOC
   - No dependencies
   - Easy to understand
   - Easy to extend

4. **It's optional**
   - Use if you want
   - Old code still works
   - Mix patterns freely

### Full Redux Would Have:

❌ Required build step
❌ Broken hot-reload
❌ Added dependencies
❌ More complexity
❌ Bigger API surface

### No Redux Would Have:

❌ Left state scattered
❌ No action history
❌ Hard debugging
❌ Imperative mutations

---

## Recommendation

**Use Redux-Lite for:**
- Physics simulations (SIR, etc.)
- Multi-component apps
- Apps needing state debugging
- Larger demos

**Use Simple State for:**
- Toggles and flags
- Single-component state
- Trivial demos
- Quick prototypes

**Both are fine!** CUI supports both patterns.
