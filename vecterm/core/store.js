// ==========================================
// REDUX CORE - The Store
// ==========================================

/**
 * Creates a Redux store with optional visualization hooks
 * @param {Function} reducer - The root reducer function
 * @param {Function} enhancer - Optional store enhancer (e.g., applyMiddleware)
 * @param {Object} hooks - Optional visualization hooks
 * @param {Function} hooks.visualizeStep - Called for each Redux flow step
 * @param {Function} hooks.logAction - Called after each action is dispatched
 */
export function createStore(reducer, enhancer, hooks = {}) {
  if (enhancer) {
    return enhancer(createStore)(reducer, null, hooks);
  }

  // Initialize state immediately (synchronously) before any async operations
  let state = reducer(undefined, { type: '@@INIT' });
  let listeners = [];

  const getState = () => state;

  const dispatch = async (action) => {
    // IMPORTANT: Only run visualization if animation is explicitly enabled
    // This prevents performance degradation during gameplay
    const shouldVisualize = hooks.visualizeStep && hooks.animationEnabled;

    // Visual feedback hooks (only when animation enabled)
    if (shouldVisualize) {
      // Step 1 - Action Dispatched
      await hooks.visualizeStep('step-action', action);

      // Step 2 - Reducer Processes
      await hooks.visualizeStep('step-reducer', action);
    }

    state = reducer(state, action);

    if (shouldVisualize) {
      // Step 3 - Store Updated
      await hooks.visualizeStep('step-store', action);

      // Step 4 - UI Re-renders
      await hooks.visualizeStep('step-render', action);
    }

    listeners.forEach(listener => listener());

    // ALWAYS log actions to history, even when visualization is off
    if (hooks.logAction) {
      hooks.logAction(action);
    }

    return action;
  };

  const subscribe = (listener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  };

  return { getState, dispatch, subscribe };
}
