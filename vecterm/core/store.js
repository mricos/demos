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

  let state;
  let listeners = [];

  const getState = () => state;

  const dispatch = async (action) => {
    // Visual feedback hooks (optional)
    if (hooks.visualizeStep) {
      // Step 1 - Action Dispatched
      await hooks.visualizeStep('step-action', action);

      // Step 2 - Reducer Processes
      await hooks.visualizeStep('step-reducer', action);
    }

    state = reducer(state, action);

    if (hooks.visualizeStep) {
      // Step 3 - Store Updated
      await hooks.visualizeStep('step-store', action);

      // Step 4 - UI Re-renders
      await hooks.visualizeStep('step-render', action);
    }

    listeners.forEach(listener => listener());

    // Log action to history (optional hook)
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

  // Initialize state
  dispatch({ type: '@@INIT' });

  return { getState, dispatch, subscribe };
}
