// ==========================================
// REDUX MIDDLEWARE - LocalStorage Sync
// ==========================================

export const localStorageMiddleware = (store) => (next) => async (action) => {
  // Call the next dispatch (the reducer)
  const result = await next(action);

  // After state update, save to localStorage (skip init actions)
  if (action.type !== '@@INIT' && action.type !== '@@LOAD_STATE') {
    try {
      const state = store.getState();
      // Save UI state and config
      const uiState = {
        sidebarCollapsed: state.uiState?.sidebarCollapsed || false,
        sectionsCollapsed: state.uiState?.sectionsCollapsed || {},
        subsectionsCollapsed: state.uiState?.subsectionsCollapsed || {}
      };
      localStorage.setItem('redux-demo-ui-state', JSON.stringify(uiState));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  return result;
};

/**
 * Middleware enhancer
 * Applies middleware to the store's dispatch function
 */
export function applyMiddleware(...middlewares) {
  return (createStore) => (reducer, enhancer, hooks) => {
    const store = createStore(reducer, null, hooks);
    let dispatch = store.dispatch;

    const middlewareAPI = {
      getState: store.getState,
      dispatch: (action) => dispatch(action)
    };

    const chain = middlewares.map(middleware => middleware(middlewareAPI));
    dispatch = chain.reduceRight((next, middleware) => middleware(next), store.dispatch);

    return { ...store, dispatch };
  };
}
