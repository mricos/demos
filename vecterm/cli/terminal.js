/**
 * CLI Terminal
 *
 * Core terminal functionality: logging, HUD updates, initialization.
 */

import { createJsonViewer } from './json-renderer.js';

let actionCount = 0;

// Output sync callbacks for game panels
const outputSyncCallbacks = [];

/**
 * Register a callback to receive CLI output
 * Useful for game panels that want to mirror CLI output
 *
 * @param {Function} callback - Function(message, type) to call on each log
 * @returns {Function} Unregister function
 */
function registerOutputSync(callback) {
  outputSyncCallbacks.push(callback);
  return () => {
    const index = outputSyncCallbacks.indexOf(callback);
    if (index > -1) {
      outputSyncCallbacks.splice(index, 1);
    }
  };
}

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

  // Notify any registered sync callbacks (e.g., game panels)
  outputSyncCallbacks.forEach(cb => {
    try {
      cb(message, type);
    } catch (err) {
      console.error('Output sync callback error:', err);
    }
  });
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

  const { mode, username, contextId, fieldId, fieldState, gameId, gameName } = state.cliPrompt;

  let promptText = 'vecterm';

  // Build prompt based on mode and state
  if (mode === 'game' && gameName) {
    // Game mode: gameName>
    promptText = gameName;
  } else if (mode === 'context' && contextId) {
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

/**
 * Setup CLI input handlers (keypress, paste, history navigation, tab completion)
 *
 * @param {Function} processCLICommand - Command processor function
 * @param {Object} store - Redux store
 */
async function setupCliInput(processCLICommand, store) {
  const { addToHistory, navigateUp, navigateDown } = await import('./history.js');
  const { handleTabCompletion } = await import('./tab-completion.js');

  const cliInput = document.getElementById('cli-input');
  if (!cliInput) {
    console.warn('CLI input element not found');
    return;
  }

  // Enter key: execute command
  cliInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const command = e.target.value.trim();
      if (command) {
        addToHistory(command);
        cliLog(`> ${command}`);
        processCLICommand(command);
        e.target.value = '';
      }
    }
  });

  // Paste handler: execute each line separately
  cliInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');

    // Split by newlines and filter out empty lines
    const lines = pastedText.split(/\r?\n/).filter(line => line.trim());

    if (lines.length === 0) return;

    // If only one line, just paste it normally
    if (lines.length === 1) {
      e.target.value = lines[0];
      return;
    }

    // Multiple lines: execute each one sequentially
    let delay = 0;
    lines.forEach((line) => {
      const command = line.trim();
      if (command && !command.startsWith('#')) { // Skip empty lines and comments
        setTimeout(() => {
          addToHistory(command);
          cliLog(`> ${command}`);
          processCLICommand(command);
        }, delay);

        // Check if this is a sleep command and adjust delay accordingly
        const parts = command.split(/\s+/);
        if (parts[0].toLowerCase() === 'sleep' && parts.length > 1) {
          const sleepMs = parseInt(parts[1]);
          if (!isNaN(sleepMs) && sleepMs > 0) {
            delay += sleepMs;
          }
        } else {
          delay += 100; // Default delay between commands
        }
      }
    });

    // Clear the input
    e.target.value = '';
  });

  // Arrow keys: history navigation
  cliInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.target.value = navigateUp() || e.target.value;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.target.value = navigateDown() || '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion(e.target, store, processCLICommand);
    }
  });
}

export { cliLog, cliLogHtml, cliLogJson, updateHUD, initializeCLI, updateCliPrompt, setupCliInput, registerOutputSync };
