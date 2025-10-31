/**
 * CLI Tab Completion
 *
 * Handles tab completion for commands and arguments.
 * Context-aware: adjusts completions based on CLI prompt state.
 * Includes interactive slider controls for continuous variables.
 */

import { cliLog, cliLogHtml } from './terminal.js';
import { getAllCommands, HELP_CATEGORIES } from './help-system.js';
import { updateVT100Silent } from './vt100-silent-updater.js';

// Top-level commands for tab completion (global context)
const TOP_LEVEL_COMMANDS = [
  'help', 'clear', 'state', 'inspect', 'login', 'logout',
  'ls', 'load', 'play', 'use', 'stop', 'exit',
  'vecterm.demo', 'vecterm.stop', 'vecterm.spawn', 'vecterm.list', 'vecterm.delete',
  'vecterm.camera.orbit', 'vecterm.camera.zoom', 'vecterm.camera.reset',
  'vecterm.grid.type', 'vecterm.grid.toggle', 'vecterm.grid.status',
  'console.vt100.help', 'console.vt100.status', 'console.vt100.scanlines',
  'console.vt100.scanspeed', 'console.vt100.wave', 'console.vt100.wavespeed',
  'console.vt100.glow', 'console.vt100.glowspeed', 'console.vt100.reset',
  'game.vt100.help', 'game.vt100.status', 'game.vt100.wave', 'game.vt100.drift',
  'game.vt100.jitter', 'game.vt100.scanlines', 'game.vt100.bloom',
  'game.vt100.brightness', 'game.vt100.contrast', 'game.vt100.toggle',
  'gamepad.status', 'gamepad.enable', 'gamepad.disable', 'gamepad.test'
];

// Add help category commands
Object.keys(HELP_CATEGORIES).forEach(cat => {
  TOP_LEVEL_COMMANDS.push(`help ${cat}`);
});

// Continuous variable command metadata for slider controls
const CONTINUOUS_COMMANDS = {
  'console.vt100.scanlines': { min: 0, max: 1, step: 0.05, default: 0.15, unit: '' },
  'console.vt100.scanspeed': { min: 1, max: 20, step: 0.5, default: 8, unit: 's' },
  'console.vt100.wave': { min: 0, max: 10, step: 0.5, default: 2, unit: 'px' },
  'console.vt100.wavespeed': { min: 1, max: 10, step: 0.5, default: 3, unit: 's' },
  'console.vt100.glow': { min: 0, max: 1, step: 0.05, default: 0.4, unit: '' },
  'console.vt100.glowspeed': { min: 1, max: 10, step: 0.5, default: 2, unit: 's' },
  'game.vt100.wave': { min: 0, max: 10, step: 0.5, default: 2, unit: 'px' },
  'game.vt100.drift': { min: 0, max: 5, step: 0.1, default: 1, unit: 'px' },
  'game.vt100.jitter': { min: 0, max: 5, step: 0.1, default: 0.5, unit: 'px' },
  'game.vt100.scanlines': { min: 0, max: 1, step: 0.05, default: 0.2, unit: '' },
  'game.vt100.bloom': { min: 0, max: 1, step: 0.05, default: 0.3, unit: '' },
  'game.vt100.brightness': { min: 0.5, max: 2, step: 0.05, default: 1, unit: '' },
  'game.vt100.contrast': { min: 0.5, max: 2, step: 0.05, default: 1, unit: '' }
};

// Active slider state
let activeSlider = null;

/**
 * Format command completions with category-based colors
 *
 * Colors the text after category.dot with accent colors:
 * - Base commands → cyan (--color-base-1)
 * - vecterm.* → green (--color-base-4)
 * - console.vt100.* → orange (--color-base-6)
 * - game.vt100.* → purple (--color-base-7)
 * - gamepad.* → blue (--color-base-3)
 *
 * @param {Array<string>} commands - Command list to format
 * @returns {string} HTML string with colored spans
 */
function formatCompletionsWithColors(commands) {
  const formatted = commands.map(cmd => {
    // Check command category
    if (cmd.startsWith('vecterm.')) {
      const [category, ...rest] = cmd.split('.');
      return `${category}.<span class="token-green">${rest.join('.')}</span>`;
    } else if (cmd.startsWith('console.vt100.')) {
      const parts = cmd.split('.');
      return `${parts[0]}.${parts[1]}.<span class="token-orange">${parts.slice(2).join('.')}</span>`;
    } else if (cmd.startsWith('game.vt100.')) {
      const parts = cmd.split('.');
      return `${parts[0]}.${parts[1]}.<span class="token-purple">${parts.slice(2).join('.')}</span>`;
    } else if (cmd.startsWith('gamepad.')) {
      const [category, ...rest] = cmd.split('.');
      return `${category}.<span class="token-blue">${rest.join('.')}</span>`;
    } else if (cmd.startsWith('help ')) {
      // help commands - color the category name
      const [helpCmd, category] = cmd.split(' ');
      return `${helpCmd} <span class="token-cyan">${category}</span>`;
    } else {
      // Base commands - use default cyan
      return `<span class="token-cyan">${cmd}</span>`;
    }
  });

  return formatted.join(', ');
}

/**
 * Show inline slider for continuous variable commands
 *
 * @param {string} command - Command name
 * @param {Object} config - Slider configuration
 * @returns {HTMLElement} Slider container element
 */
function showInlineSlider(command, config) {
  // Remove any existing slider
  if (activeSlider) {
    activeSlider.remove();
    activeSlider = null;
  }

  const cliOutput = document.getElementById('cli-output');

  // Create slider container
  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'cli-slider-container';
  sliderContainer.id = 'active-slider';

  // Create label
  const label = document.createElement('div');
  label.className = 'cli-slider-label';
  label.textContent = `${command}:`;

  // Create slider input
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'cli-slider';
  slider.min = config.min;
  slider.max = config.max;
  slider.step = config.step;
  slider.value = config.default;

  // Create value display
  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'cli-slider-value';
  valueDisplay.textContent = `${config.default}${config.unit}`;

  // Assemble container
  sliderContainer.appendChild(label);
  sliderContainer.appendChild(slider);
  sliderContainer.appendChild(valueDisplay);

  // Add to output
  cliOutput.appendChild(sliderContainer);
  activeSlider = sliderContainer;

  // Scroll to show slider
  cliOutput.scrollTop = cliOutput.scrollHeight;

  // Handle slider input - continuously update (silently, without logging)
  slider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    valueDisplay.textContent = `${value}${config.unit}`;

    // Update VT100 effect silently without logging to console
    updateVT100Silent(command, value);
  });

  // Handle Enter or Escape to dismiss slider
  const dismissHandler = (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      if (activeSlider) {
        activeSlider.remove();
        activeSlider = null;
      }
      document.removeEventListener('keydown', dismissHandler);

      // Refocus input
      const input = document.getElementById('cli-input');
      if (input) input.focus();
    }
  };

  document.addEventListener('keydown', dismissHandler);

  // Focus the slider for immediate interaction
  slider.focus();

  return sliderContainer;
}

/**
 * Get context-aware commands based on CLI prompt state
 *
 * @param {Object} store - Redux store
 * @returns {Array<string>} Available commands for current context
 */
function getContextualCommands(store) {
  const state = store.getState();
  const cliPrompt = state.cliPrompt || {};

  // Base commands always available
  let commands = [...TOP_LEVEL_COMMANDS];

  // Add context-specific commands
  if (cliPrompt.mode === 'field') {
    // Inside a field: add field-specific commands
    commands = commands.concat([
      'pause', 'resume', 'restart', 'controls',
      'player.move', 'player.action'
    ]);
  } else if (cliPrompt.mode === 'context') {
    // Inside a context: add context-editing commands
    commands = commands.concat([
      'set', 'get', 'reset', 'preview'
    ]);
  }

  return commands;
}

/**
 * Handle tab completion
 *
 * @param {HTMLInputElement} input - CLI input element
 * @param {Object} store - Redux store
 * @param {Function} processCLICommand - Command processor function
 * @returns {boolean} True if completion was handled
 */
function handleTabCompletion(input, store, processCLICommand) {
  const currentInput = input.value;
  const parts = currentInput.split(/\s+/);  // Don't trim - we need to detect trailing space
  const firstWord = parts[0].toLowerCase();

  // Get context-aware command list
  const availableCommands = getContextualCommands(store);

  // Check if we're completing a command with arguments (load/preview/play)
  if (firstWord === 'load' || firstWord === 'preview' || firstWord === 'play' || firstWord === 'play3d') {
    // Check if there's a space after the command
    if (currentInput.includes(' ')) {
      // Complete game name argument
      const state = store.getState();
      const gameIds = Object.keys(state.games.registry);
      const partialGame = parts.length === 2 ? parts[1].toLowerCase() : '';
      const gameMatches = gameIds.filter(id => id.startsWith(partialGame));

      if (gameMatches.length === 1) {
        input.value = `${firstWord} ${gameMatches[0]}`;
      } else if (gameMatches.length > 0) {
        const coloredGames = gameMatches.map(g => `<span class="token-cyan">${g}</span>`).join(', ');
        cliLogHtml(`Available games: ${coloredGames}`, 'success');
      }
      return true;
    } else if (parts.length === 1) {
      // Just completed the command, add space for argument
      input.value = firstWord + ' ';
      return true;
    }
  }

  // Standard command completion (context-aware)
  const matches = availableCommands.filter(cmd =>
    cmd.startsWith(currentInput.toLowerCase())
  );

  if (matches.length === 1) {
    const matchedCommand = matches[0];

    // Check if this is a continuous variable command
    if (CONTINUOUS_COMMANDS[matchedCommand]) {
      // Clear input and show slider
      input.value = '';
      cliLog(`redux> ${matchedCommand}`, 'success');
      showInlineSlider(matchedCommand, CONTINUOUS_COMMANDS[matchedCommand]);
    } else {
      // Regular completion
      input.value = matchedCommand;
    }
  } else if (matches.length > 1) {
    // Multiple matches - show them with colored output
    const coloredCompletions = formatCompletionsWithColors(matches);
    cliLogHtml(`Possible completions: ${coloredCompletions}`, 'success');
  }

  return true;
}

export { handleTabCompletion, TOP_LEVEL_COMMANDS, CONTINUOUS_COMMANDS };
