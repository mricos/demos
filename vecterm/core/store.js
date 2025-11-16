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
    // DEFENSIVE GUARD: Never animate during active gameplay
    // Check if we're in an active game by looking for game-related actions
    const isGameplayAction = action.type && (
      action.type.startsWith('UPDATE_ENTITY') ||
      action.type.startsWith('MOVE_ENTITY') ||
      action.type.startsWith('game/') ||
      action.type === 'UPDATE_ENTITIES' ||
      action.type === 'BATCH_UPDATE_ENTITIES' ||
      action.type === 'ECS_SYNC' ||
      action.type === 'ECS_UPDATE'
    );

    // IMPORTANT: Only run visualization if animation is explicitly enabled
    // AND we're not in active gameplay
    // This prevents performance degradation during gameplay
    const shouldVisualize = hooks.visualizeStep && hooks.animationEnabled && !isGameplayAction;

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

    // SLOW PATH: Visualization enabled for non-gameplay actions
    // Visual feedback hooks (only when animation enabled)
    // Step 1 - Action Dispatched
    await hooks.visualizeStep('step-action', action);

    // Step 2 - Reducer Processes
    await hooks.visualizeStep('step-reducer', action);

    state = reducer(state, action);

    // Step 3 - Store Updated
    await hooks.visualizeStep('step-store', action);

    // Step 4 - UI Re-renders
    await hooks.visualizeStep('step-render', action);

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

  // Expose visualization hooks for runtime control
  const store = {
    getState,
    dispatch,
    subscribe,
    visualizationHooks: hooks
  };

  return store;
}
