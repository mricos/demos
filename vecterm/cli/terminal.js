/**
 * CLI Terminal
 *
 * Core terminal functionality: logging, HUD updates, initialization.
 */

import { createJsonViewer } from './json-renderer.js';

let actionCount = 0;

/**
 * Log a message to the CLI output
 *
 * @param {string} message - Message to log
 * @param {string} type - Message type ('', 'success', 'error')
 */
function cliLog(message, type = '') {
  const output = document.getElementById('cli-output');
  if (!output) return;

  const line = document.createElement('div');
  line.className = `cli-line ${type}`;
  line.textContent = message;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

/**
 * Log a message with HTML content (for colored completions)
 *
 * @param {string} htmlContent - HTML content to log
 * @param {string} type - Message type ('', 'success', 'error')
 */
function cliLogHtml(htmlContent, type = '') {
  const output = document.getElementById('cli-output');
  if (!output) return;

  const line = document.createElement('div');
  line.className = `cli-line ${type}`;
  line.innerHTML = htmlContent;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

/**
 * Log JSON data to the CLI output with collapsible viewer
 *
 * @param {Object} data - JSON data to display
 * @param {Object} options - Rendering options
 */
function cliLogJson(data, options = {}) {
  const output = document.getElementById('cli-output');
  if (!output) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'cli-line';
  wrapper.style.marginTop = 'var(--space-sm)';
  wrapper.style.marginBottom = 'var(--space-sm)';

  const jsonViewer = createJsonViewer(data, {
    collapsedDepth: 2,
    maxArrayItems: 50,
    maxStringLength: 200,
    ...options
  });

  wrapper.appendChild(jsonViewer);
  output.appendChild(wrapper);
  output.scrollTop = output.scrollHeight;
}

/**
 * Update the HUD (action counter and state size)
 *
 * @param {Object} store - Redux store
 */
function updateHUD(store) {
  actionCount++;
  const actionCounter = document.getElementById('action-counter');
  if (actionCounter) {
    actionCounter.textContent = actionCount;
  }

  const state = store.getState();
  const stateSize = (JSON.stringify(state).length / 1024).toFixed(2);
  const stateSizeEl = document.getElementById('state-size');
  if (stateSizeEl) {
    stateSizeEl.textContent = `${stateSize}KB`;
  }
}

/**
 * Initialize the CLI with welcome messages
 */
function initializeCLI() {
  cliLog('VECTERM Terminal - Redux Demo v1.0');
  cliLog('Type "help" for available commands');
  cliLog('Click [VT100] for display controls');
  cliLog('---');
}

/**
 * Update the CLI prompt based on the current context
 *
 * @param {Object} state - Redux state with cliPrompt structure
 */
function updateCliPrompt(state) {
  const promptEl = document.getElementById('cli-prompt');
  if (!promptEl) return;

  const { mode, username, contextId, fieldId, fieldState } = state.cliPrompt;

  let promptText = 'vecterm';

  // Build prompt based on mode and state
  if (mode === 'context' && contextId) {
    // Context edit mode: vecterm[ctx:name]>
    if (username) {
      promptText = `vecterm[${username}:ctx:${contextId}]`;
    } else {
      promptText = `vecterm[ctx:${contextId}]`;
    }
  } else if (mode === 'field' && fieldId) {
    // Field instance mode: vecterm[name]> or vecterm[username:name]> or vecterm[name:paused]>
    if (username && fieldState) {
      promptText = `vecterm[${username}:${fieldId}:${fieldState}]`;
    } else if (username) {
      promptText = `vecterm[${username}:${fieldId}]`;
    } else if (fieldState) {
      promptText = `vecterm[${fieldId}:${fieldState}]`;
    } else {
      promptText = `vecterm[${fieldId}]`;
    }
  } else if (mode === 'toplevel' && username) {
    // Top-level logged in: vecterm[username]>
    promptText = `vecterm[${username}]`;
  }

  promptEl.textContent = `${promptText}> `;
}

export { cliLog, cliLogHtml, cliLogJson, updateHUD, initializeCLI, updateCliPrompt };
