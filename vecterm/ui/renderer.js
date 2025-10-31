/**
 * Main UI Renderer
 *
 * Coordinates all UI updates when state changes.
 * Connects Redux state to DOM updates.
 */

import { renderScene } from './canvas-renderer.js';
import { updateCliPrompt } from '../cli/terminal.js';

/**
 * Create the main render function
 *
 * @param {Object} store - Redux store
 * @param {Object} visualizationHooks - Visualization hooks from store-instance
 * @returns {Function} Render function to call on state changes
 */
function createRenderer(store, visualizationHooks) {
  return function render() {
    const state = store.getState();

    // Safety check
    if (!state) return;

    // Update toggle button text based on auth state
    const toggleBtn = document.getElementById('toggle-auth');
    if (toggleBtn && state.auth) {
      if (state.auth.isLoggedIn) {
        toggleBtn.textContent = `Logout (${state.auth.username})`;
      } else {
        toggleBtn.textContent = 'Toggle Login';
      }
    }

    // Update mode display
    const modeValue = document.getElementById('mode-value');
    if (modeValue && state.uiState) {
      const mode = state.uiState.mode || 'idle';
      modeValue.textContent = mode.toUpperCase();
      modeValue.className = `mode-${mode}`;
    }

    // Update context display
    const contextValue = document.getElementById('context-value');
    if (contextValue && state.uiState) {
      const context = state.uiState.cliLabel || state.uiState.cliContext || 'vecterm';
      contextValue.textContent = context;
    }

    // Update entity counter (2D entities + 3D vecterm entities)
    const entityCounter = document.getElementById('entity-counter');
    if (entityCounter) {
      const count2D = state.entities ? state.entities.length : 0;
      const count3D = state.vecterm && state.vecterm.entities ? Object.keys(state.vecterm.entities).length : 0;
      entityCounter.textContent = count2D + count3D;
    }

    // Render canvas scene
    const canvas = document.getElementById('main-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      renderScene(ctx, canvas, state);
    }

    // Update CLI prompt based on context
    updateCliPrompt(state);

    // Update inspector state display (HTML)
    visualizationHooks.updateStateDisplay(store);
  };
}

export { createRenderer };
