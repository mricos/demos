/**
 * Store Instance with Visualization Hooks
 *
 * Creates the Redux store and injects visualization hooks for the inspector UI.
 * This breaks the circular dependency by making visualization hooks injectable.
 */

import { createStore } from './store.js';
import { rootReducer } from './reducers.js';
import { localStorageMiddleware, applyMiddleware } from './middleware.js';
import { loadState } from './actions.js';

/**
 * Visualization hooks for the inspector UI
 * These are injected to avoid circular dependencies
 */
const visualizationHooks = {
  currentDelay: 1000,
  actionHistory: [],

  async visualizeStep(stepId, action) {
    // Remove active class from all steps
    document.querySelectorAll('.flow-step').forEach(step => {
      step.classList.remove('active');
    });

    // Add active class to current step
    const step = document.getElementById(stepId);
    if (step) {
      step.classList.add('active');
    }

    // Wait for the configured delay
    if (action.type !== '@@INIT') {
      await new Promise(resolve => setTimeout(resolve, this.currentDelay / 4));
    }
  },

  logAction(action) {
    if (action.type === '@@INIT') return;

    const entry = {
      type: action.type,
      payload: action.payload,
      timestamp: new Date().toLocaleTimeString()
    };

    this.actionHistory.unshift(entry);
    if (this.actionHistory.length > 20) this.actionHistory.pop();

    this.updateActionHistoryUI();
    this.updateHUD();
  },

  updateActionHistoryUI() {
    const historyDiv = document.getElementById('action-history');
    if (!historyDiv) return;

    historyDiv.innerHTML = this.actionHistory.map((entry, index) => `
      <div class="action-entry ${index === 0 ? 'new' : ''}">
        <div class="action-type">${entry.type}</div>
        ${entry.payload !== undefined ? `<div class="action-payload">payload: ${JSON.stringify(entry.payload)}</div>` : ''}
        <div class="action-time">${entry.timestamp}</div>
      </div>
    `).join('');
  },

  updateStateDisplay(store) {
    const state = store.getState();
    const display = document.getElementById('state-display');
    if (!display) return;

    // Colorized JSON syntax highlighting
    const json = JSON.stringify(state, null, 2);
    const colorized = json
      .replace(/(".*?"):/g, '<span class="json-key">$1</span>:')
      .replace(/: (".*?")/g, ': <span class="json-string">$1</span>')
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/: (null)/g, ': <span class="json-null">$1</span>')
      .replace(/: (-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>');

    display.innerHTML = colorized;
  },

  updateHUD() {
    // Will be connected to action counter in UI module
    const event = new CustomEvent('redux-action-dispatched');
    document.dispatchEvent(event);
  }
};

/**
 * Create the store with visualization hooks injected
 */
const store = createStore(
  rootReducer,
  applyMiddleware(localStorageMiddleware),
  visualizationHooks
);

/**
 * Load saved UI state from localStorage
 */
function loadSavedState() {
  try {
    const savedData = localStorage.getItem('redux-demo-ui-state');
    if (savedData) {
      const savedUIState = JSON.parse(savedData);
      store.dispatch(loadState(savedUIState));
      return savedUIState;
    }
  } catch (e) {
    console.error('Failed to load UI state:', e);
  }
  return null;
}

// Load saved state on initialization
const savedUIState = loadSavedState();

// Export store and visualization hooks
export { store, visualizationHooks, savedUIState };
