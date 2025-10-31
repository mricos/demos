/**
 * CLI Command History
 *
 * Manages command history with localStorage persistence and arrow key navigation.
 */

const HISTORY_STORAGE_KEY = 'redux-demo-cli-history';
const MAX_HISTORY = 100;

// Load history from localStorage
const commandHistory = (() => {
  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Failed to load command history:', e);
    return [];
  }
})();

let historyPosition = commandHistory.length;
let currentCommand = '';

/**
 * Save history to localStorage
 */
function saveHistory() {
  try {
    // Keep only the last MAX_HISTORY commands
    const historyToSave = commandHistory.slice(-MAX_HISTORY);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyToSave));
  } catch (e) {
    console.error('Failed to save command history:', e);
  }
}

/**
 * Add a command to history
 *
 * @param {string} command - Command to add
 */
function addToHistory(command) {
  // Add to history (avoid duplicates of last command)
  if (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== command) {
    commandHistory.push(command);
    saveHistory();
  }
  historyPosition = commandHistory.length;
  currentCommand = '';
}

/**
 * Navigate up in history
 *
 * @param {string} inputValue - Current input value
 * @returns {string} History entry or current value
 */
function navigateUp(inputValue) {
  // Save current input if at the end of history
  if (historyPosition === commandHistory.length) {
    currentCommand = inputValue;
  }

  // Navigate up in history
  if (historyPosition > 0) {
    historyPosition--;
    return commandHistory[historyPosition];
  }

  return inputValue;
}

/**
 * Navigate down in history
 *
 * @returns {string} History entry or current command
 */
function navigateDown() {
  // Navigate down in history
  if (historyPosition < commandHistory.length - 1) {
    historyPosition++;
    return commandHistory[historyPosition];
  } else if (historyPosition === commandHistory.length - 1) {
    // Return to current command
    historyPosition = commandHistory.length;
    return currentCommand;
  }

  return currentCommand;
}

export { addToHistory, navigateUp, navigateDown };
