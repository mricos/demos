/**
 * CUI Redux-Lite
 * Lightweight Redux-inspired state management
 * - Single state tree
 * - Action creators
 * - Reducer registration
 * - Dispatch with history
 * - Hot-reload compatible
 */

(function() {
  'use strict';

  CUI.register('redux-lite', ['core', 'lifecycle'], function(CUI) {
    CUI.log('Redux-Lite module initializing...');

    // State tree
    let state = {};

    // Reducers registry
    const reducers = new Map();

    // Action history (last 50 actions)
    const actionHistory = [];
    const MAX_HISTORY = 50;

    // Subscribers
    const subscribers = new Set();

    // Action ID counter
    let actionId = 0;

    /**
     * Redux-Lite API
     */
    CUI.Redux = {

      /**
       * Register a reducer
       * @param {string} name - Slice name (e.g., 'simulation', 'params')
       * @param {Function} reducer - Reducer function (state, action) => newState
       * @param {*} initialState - Initial state for this slice
       */
      reducer(name, reducer, initialState = {}) {
        if (typeof reducer !== 'function') {
          throw new Error(`Reducer for "${name}" must be a function`);
        }

        // Initialize state slice if not exists
        if (state[name] === undefined) {
          state[name] = initialState;
        }

        // Register reducer
        reducers.set(name, reducer);

        CUI.log(`Reducer "${name}" registered`);

        return this;
      },

      /**
       * Dispatch an action
       * @param {Object} action - Action object { type, payload?, meta? }
       * @returns {Object} The dispatched action with metadata
       */
      dispatch(action) {
        if (!action || typeof action !== 'object') {
          throw new Error('Action must be an object');
        }

        if (!action.type || typeof action.type !== 'string') {
          throw new Error('Action must have a string type');
        }

        // Add metadata
        const enrichedAction = {
          ...action,
          meta: {
            timestamp: Date.now(),
            id: ++actionId,
            ...(action.meta || {})
          }
        };

        // Store previous state for subscribers
        const prevState = { ...state };

        // Run all reducers
        const newState = {};
        reducers.forEach((reducer, name) => {
          const prevSlice = state[name];
          const nextSlice = reducer(prevSlice, enrichedAction);
          newState[name] = nextSlice;
        });

        // Update state
        state = newState;

        // Add to history
        actionHistory.push(enrichedAction);
        if (actionHistory.length > MAX_HISTORY) {
          actionHistory.shift();
        }

        // Emit event
        CUI.Events.emit('cui:action:dispatched', {
          action: enrichedAction,
          prevState,
          nextState: state
        });

        // Notify subscribers
        subscribers.forEach(callback => {
          try {
            callback(state, prevState, enrichedAction);
          } catch (err) {
            CUI.error('Error in Redux subscriber:', err);
          }
        });

        return enrichedAction;
      },

      /**
       * Get current state
       * @param {string} [slice] - Optional slice name
       * @returns {*} State or slice
       */
      getState(slice) {
        if (slice) {
          return state[slice];
        }
        return state;
      },

      /**
       * Subscribe to state changes
       * @param {Function} callback - (state, prevState, action) => void
       * @returns {Function} Unsubscribe function
       */
      subscribe(callback) {
        if (typeof callback !== 'function') {
          throw new Error('Subscriber must be a function');
        }

        subscribers.add(callback);

        return () => subscribers.delete(callback);
      },

      /**
       * Replace a reducer (for hot-reload)
       * @param {string} name - Slice name
       * @param {Function} reducer - New reducer function
       */
      replaceReducer(name, reducer) {
        if (!reducers.has(name)) {
          CUI.warn(`Reducer "${name}" not found, registering new reducer`);
        }

        reducers.set(name, reducer);
        CUI.log(`Reducer "${name}" replaced`);

        CUI.Events.emit('cui:reducer:replaced', { name });

        return this;
      },

      /**
       * Get action history
       * @param {number} [limit] - Number of recent actions
       * @returns {Array} Action history
       */
      getHistory(limit) {
        if (limit) {
          return actionHistory.slice(-limit);
        }
        return [...actionHistory];
      },

      /**
       * Clear action history
       */
      clearHistory() {
        actionHistory.length = 0;
        CUI.log('Action history cleared');
      },

      /**
       * Action creator helper
       * @param {string} type - Action type
       * @param {Function} [payloadCreator] - Function to create payload
       * @returns {Function} Action creator
       */
      createAction(type, payloadCreator) {
        return (...args) => {
          const action = { type };

          if (payloadCreator) {
            action.payload = payloadCreator(...args);
          } else if (args.length === 1) {
            action.payload = args[0];
          } else if (args.length > 1) {
            action.payload = args;
          }

          return action;
        };
      },

      /**
       * Combine multiple reducers for a slice
       * @param {Object} reducers - { key: reducer }
       * @returns {Function} Combined reducer
       */
      combineReducers(reducerMap) {
        return (state = {}, action) => {
          const nextState = {};
          let hasChanged = false;

          Object.keys(reducerMap).forEach(key => {
            const reducer = reducerMap[key];
            const prevSlice = state[key];
            const nextSlice = reducer(prevSlice, action);
            nextState[key] = nextSlice;
            hasChanged = hasChanged || nextSlice !== prevSlice;
          });

          return hasChanged ? nextState : state;
        };
      },

      /**
       * Debug helper: Get reducer names
       */
      getReducers() {
        return Array.from(reducers.keys());
      },

      /**
       * Debug helper: Reset state (dangerous!)
       */
      __RESET__() {
        state = {};
        reducers.forEach((reducer, name) => {
          state[name] = reducer(undefined, { type: '@@INIT' });
        });
        CUI.warn('State reset to initial values');
      }
    };

    // Initialize event listeners
    CUI.Events.on('cui:ready', () => {
      CUI.log('Redux-Lite ready');
    });

    CUI.log('Redux-Lite module loaded');
  });

})();
