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
  animationEnabled: false, // ALWAYS OFF by default - must be explicitly enabled

  async visualizeStep(stepId, action) {
    // IMPORTANT: Skip animation if disabled (performance)
    // This prevents throttling of Redux actions during gameplay
    if (!this.animationEnabled) {
      return;
    }

    // Remove active class from all steps
    document.querySelectorAll('.flow-step').forEach(step => {
      step.classList.remove('active');
    });

    // Add active class to current step
    const step = document.getElementById(stepId);
    if (step) {
      step.classList.add('active');
    }

    // Wait for the configured delay (only when animation is enabled)
    if (action.type !== '@@INIT') {
      await new Promise(resolve => setTimeout(resolve, this.currentDelay / 4));
    }
  },

  logAction(action) {
    if (action.type === '@@INIT') return;

    // Skip logging if action is marked as silent (e.g., ECS sync)
    if (action.meta && action.meta.silent) return;

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

    // Use the enhanced JSON viewer with mapping support
    // Import dynamically to avoid circular dependencies
    import('../cli/json-renderer.js').then(({ createJsonViewer }) => {
      display.innerHTML = ''; // Clear previous content

      const viewer = createJsonViewer(state, {
        collapsedDepth: 2,
        maxArrayItems: 50,
        maxStringLength: 200,
        showDataTypes: false,
        rootCollapsed: false,
        enableMapping: true,
        onMapParameter: (path, value) => {
          // Trigger MIDI learn mode for this parameter
          if (window.Vecterm?.MIDI?.learnParameter) {
            window.Vecterm.MIDI.learnParameter(path);
            if (window.Vecterm?.CLI?.log) {
              window.Vecterm.CLI.log(`✓ MIDI learn activated for: ${path}`, 'success');
              window.Vecterm.CLI.log(`Move any MIDI control to map it`, '');
            }
          } else {
            console.log(`Parameter selected for mapping: ${path} = ${value}`);
          }
        }
      });

      display.appendChild(viewer);
    }).catch(err => {
      console.error('Failed to load JSON viewer:', err);
      // Fallback to simple display
      display.textContent = JSON.stringify(state, null, 2);
    });
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
