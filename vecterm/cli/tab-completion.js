/**
 * CLI Tab Completion
 *
 * Handles tab completion for commands and arguments.
 * Context-aware: adjusts completions based on CLI prompt state.
 * Includes interactive slider controls for continuous variables.
 */

import { cliLog, cliLogHtml } from './terminal.js';
import { getAllCommands, HELP_CATEGORIES } from './help-system.js';
import { getLifecycleManager } from './slider-lifecycle.js';
import { initGestureHandler, getGestureHandler } from './slider-gestures.js';
import { startMidiLearn } from './slider-midi-capture.js';
import { initQuickSettings, getQuickSettings } from './quick-settings.js';

// Top-level commands for tab completion (global context)
const TOP_LEVEL_COMMANDS = [
  'help', 'clear', 'state', 'inspect', 'login', 'logout',
  'ls', 'load', 'play', 'use', 'stop', 'exit',
  'vecterm.demo', 'vecterm.stop', 'vecterm.spawn', 'vecterm.list', 'vecterm.delete',
  'vecterm.camera.orbit', 'vecterm.camera.zoom', 'vecterm.camera.reset',
  'vecterm.grid.type', 'vecterm.grid.toggle', 'vecterm.grid.status',
  'vt100.help', 'vt100.status', 'vt100.scanlines',
  'vt100.scanspeed', 'vt100.wave', 'vt100.wavespeed',
  'vt100.glow', 'vt100.glowspeed', 'vt100.border',
  'vt100.borderwidth', 'vt100.reset',
  // View VT100 effects (new namespace)
  'view.vt100.help', 'view.vt100.status', 'view.vt100.wave', 'view.vt100.drift',
  'view.vt100.jitter', 'view.vt100.scanlines', 'view.vt100.bloom',
  'view.vt100.brightness', 'view.vt100.contrast', 'view.vt100.toggle',
  // Game VT100 effects (deprecated - use view.vt100.*)
  'game.vt100.help', 'game.vt100.status', 'game.vt100.wave', 'game.vt100.drift',
  'game.vt100.jitter', 'game.vt100.scanlines', 'game.vt100.bloom',
  'game.vt100.brightness', 'game.vt100.contrast', 'game.vt100.toggle',
  'gamepad.status', 'gamepad.enable', 'gamepad.disable', 'gamepad.test',
  'tines.status', 'tines.drone', 'tines.bells', 'tines.stop', 'tines.bpm', 'tines.volume',
  'tines.channel', 'tines.mute', 'tines.unmute', 'tines.pan', 'tines.start', 'tines.pause',
  'tines.resume', 'tines.set', 'tines.get', 'tines.vars', 'tines.preset',
  'midi.status', 'midi.devices', 'midi.show', 'midi.hide', 'midi.controller', 'midi.popup', 'midi.map', 'midi.unmap',
  'midi.learn', 'midi.preset', 'midi.presets',
  'vscope.enable', 'vscope.disable', 'vscope.status',
  'vscope.camera.field', 'vscope.camera.scope', 'vscope.camera.pan', 'vscope.camera.zoom', 'vscope.camera.projection', 'vscope.camera.reset',
  'vscope.field.vector', 'vscope.field.grid', 'vscope.field.pixel',
  'vscope.track.entity', 'vscope.track.entities', 'vscope.track.region', 'vscope.track.reset',
  'vscope.quadrant', 'vscope.updaterate'
];

// Add help category commands
Object.keys(HELP_CATEGORIES).forEach(cat => {
  TOP_LEVEL_COMMANDS.push(`help ${cat}`);
});

// Continuous variable command metadata for slider controls
const CONTINUOUS_COMMANDS = {
  'vt100.scanlines': { min: 0, max: 1, step: 0.05, default: 0.15, unit: '' },
  'vt100.scanspeed': { min: 1, max: 20, step: 0.5, default: 8, unit: 's' },
  'vt100.wave': { min: 0, max: 10, step: 0.5, default: 2, unit: 'px' },
  'vt100.wavespeed': { min: 1, max: 10, step: 0.5, default: 3, unit: 's' },
  'vt100.glow': { min: 0, max: 1, step: 0.05, default: 0.4, unit: '' },
  'vt100.glowspeed': { min: 1, max: 10, step: 0.5, default: 2, unit: 's' },
  'vt100.border': { min: 0, max: 1, step: 0.05, default: 1, unit: '' },
  'vt100.borderwidth': { min: 0, max: 5, step: 0.5, default: 1, unit: 'px' },
  // View VT100 slider configs
  'view.vt100.wave': { min: 0, max: 10, step: 0.5, default: 2, unit: 'px' },
  'view.vt100.drift': { min: 0, max: 5, step: 0.1, default: 1, unit: 'px' },
  'view.vt100.jitter': { min: 0, max: 5, step: 0.1, default: 0.5, unit: 'px' },
  'view.vt100.scanlines': { min: 0, max: 1, step: 0.05, default: 0.2, unit: '' },
  'view.vt100.bloom': { min: 0, max: 1, step: 0.05, default: 0.3, unit: '' },
  'view.vt100.brightness': { min: 0.5, max: 2, step: 0.05, default: 1, unit: '' },
  'view.vt100.contrast': { min: 0.5, max: 2, step: 0.05, default: 1, unit: '' },
  // Game VT100 slider configs (deprecated - same as view)
  'game.vt100.wave': { min: 0, max: 10, step: 0.5, default: 2, unit: 'px' },
  'game.vt100.drift': { min: 0, max: 5, step: 0.1, default: 1, unit: 'px' },
  'game.vt100.jitter': { min: 0, max: 5, step: 0.1, default: 0.5, unit: 'px' },
  'game.vt100.scanlines': { min: 0, max: 1, step: 0.05, default: 0.2, unit: '' },
  'game.vt100.bloom': { min: 0, max: 1, step: 0.05, default: 0.3, unit: '' },
  'game.vt100.brightness': { min: 0.5, max: 2, step: 0.05, default: 1, unit: '' },
  'game.vt100.contrast': { min: 0.5, max: 2, step: 0.05, default: 1, unit: '' },
  'tines.bpm': { min: 20, max: 300, step: 1, default: 120, unit: ' BPM' },
  'tines.volume': { min: 0, max: 1, step: 0.05, default: 0.7, unit: '' },
  'tines.pan.drone': { min: -1, max: 1, step: 0.1, default: 0, unit: '' },
  'tines.pan.bells': { min: -1, max: 1, step: 0.1, default: 0, unit: '' },
  'tines.pan.synth': { min: -1, max: 1, step: 0.1, default: 0, unit: '' },
  'vscope.camera.zoom': { min: 0.1, max: 10, step: 0.1, default: 1.0, unit: 'x' },
  'vscope.camera.fov': { min: 10, max: 120, step: 1, default: 60, unit: '°' },
  'vscope.track.smoothing': { min: 0, max: 1, step: 0.05, default: 0.1, unit: '' },
  'vscope.glow.intensity': { min: 0, max: 1, step: 0.05, default: 0.3, unit: '' },
  'vscope.glow.radius': { min: 0, max: 30, step: 1, default: 10, unit: 'px' },
  'vscope.bloom.radius': { min: 0, max: 20, step: 0.5, default: 5, unit: 'px' },
  'vscope.bloom.intensity': { min: 0, max: 1, step: 0.05, default: 0.5, unit: '' },
  'vscope.scanlines.intensity': { min: 0, max: 1, step: 0.05, default: 0.15, unit: '' },
  'vscope.scanlines.speed': { min: 1, max: 20, step: 0.5, default: 8, unit: 's' },
  'vscope.updaterate': { min: 10, max: 60, step: 5, default: 30, unit: ' FPS' },
  'vscope.quadrant': { min: 0, max: 4, step: 1, default: 1, unit: '' }
};

// Initialization flag
let systemsInitialized = false;

/**
 * Format command completions with category-based colors
 *
 * Colors the text after category.dot with accent colors:
 * - Base commands → cyan (--color-base-1)
 * - vecterm.* → green (--color-base-4)
 * - vt100.* → orange (--color-base-6)
 * - game.vt100.* → purple (--color-base-7)
 * - gamepad.* → blue (--color-base-3)
 * - tines.* → magenta (--color-base-5)
 * - midi.* → yellow (--color-base-2)
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
    } else if (cmd.startsWith('vt100.')) {
      const parts = cmd.split('.');
      return `${parts[0]}.${parts[1]}.<span class="token-orange">${parts.slice(2).join('.')}</span>`;
    } else if (cmd.startsWith('view.vt100.') || cmd.startsWith('game.vt100.')) {
      const parts = cmd.split('.');
      return `${parts[0]}.${parts[1]}.<span class="token-purple">${parts.slice(2).join('.')}</span>`;
    } else if (cmd.startsWith('gamepad.')) {
      const [category, ...rest] = cmd.split('.');
      return `${category}.<span class="token-blue">${rest.join('.')}</span>`;
    } else if (cmd.startsWith('tines.')) {
      const [category, ...rest] = cmd.split('.');
      return `${category}.<span class="token-magenta">${rest.join('.')}</span>`;
    } else if (cmd.startsWith('midi.')) {
      const [category, ...rest] = cmd.split('.');
      return `${category}.<span class="token-yellow">${rest.join('.')}</span>`;
    } else if (cmd.startsWith('vscope.')) {
      const [category, ...rest] = cmd.split('.');
      return `${category}.<span class="token-cyan">${rest.join('.')}</span>`;
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
 * Find longest common prefix among an array of strings
 *
 * @param {Array<string>} strings - Array of strings
 * @returns {string} Longest common prefix
 */
function findCommonPrefix(strings) {
  if (strings.length === 0) return '';
  if (strings.length === 1) return strings[0];

  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (strings[i].indexOf(prefix) !== 0) {
      prefix = prefix.substring(0, prefix.length - 1);
      if (prefix === '') return '';
    }
  }
  return prefix;
}

/**
 * Initialize the new slider systems (lifecycle, gestures, quick settings)
 */
function initializeSystems() {
  if (systemsInitialized) return;

  // Initialize Quick Settings
  initQuickSettings();

  // Initialize gesture handler with callbacks
  const handleQuickSettings = (sliderId, slider) => {
    const qs = getQuickSettings();
    qs.addSlider(sliderId, slider);
  };

  const handleMidiCapture = (sliderId, slider) => {
    startMidiLearn(sliderId, slider);
  };

  initGestureHandler(handleQuickSettings, handleMidiCapture);

  systemsInitialized = true;
  console.log('[Tab Completion] Systems initialized');
}

/**
 * Show inline slider for continuous variable commands using new lifecycle system
 *
 * @param {string} command - Command name
 * @param {Object} config - Slider configuration
 */
function showInlineSlider(command, config) {
  // Initialize systems on first use
  initializeSystems();

  const cliOutput = document.getElementById('cli-output');
  const lifecycleManager = getLifecycleManager();
  const gestureHandler = getGestureHandler();

  // Create slider using lifecycle manager
  const sliderId = lifecycleManager.createSlider(command, config, cliOutput);
  const slider = lifecycleManager.getSlider(sliderId);

  if (!slider) {
    console.error('[Tab Completion] Failed to create slider');
    return;
  }

  // Attach gesture handlers
  if (gestureHandler) {
    gestureHandler.attachToSlider(slider.element);
  }

  // Handle Enter or Escape to move slider to history
  const dismissHandler = (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      lifecycleManager.moveToHistory(sliderId);
      document.removeEventListener('keydown', dismissHandler);

      // Refocus input
      const input = document.getElementById('cli-input');
      if (input) input.focus();
    }
  };

  document.addEventListener('keydown', dismissHandler);

  // Focus the slider for immediate interaction
  const sliderInput = slider.element.querySelector('input[type="range"]');
  if (sliderInput) {
    sliderInput.focus();
  }
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
  const endsWithSpace = currentInput.endsWith(' ');
  const trimmedInput = currentInput.trim();
  const parts = currentInput.split(/\s+/);
  const firstWord = parts[0].toLowerCase();

  // Get context-aware command list
  const availableCommands = getContextualCommands(store);

  // NEW: Detect space+tab pattern for continuous commands
  // If input ends with space and the trimmed part is a continuous command, show slider
  if (endsWithSpace && trimmedInput && CONTINUOUS_COMMANDS[trimmedInput.toLowerCase()]) {
    const matchedCommand = trimmedInput.toLowerCase();
    input.value = '';
    cliLog(`vecterm> ${matchedCommand}`, 'success');
    showInlineSlider(matchedCommand, CONTINUOUS_COMMANDS[matchedCommand]);
    return true;
  }

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
    cmd.startsWith(trimmedInput.toLowerCase())
  );

  if (matches.length === 0) {
    // No matches
    return true;
  } else if (matches.length === 1) {
    const matchedCommand = matches[0];

    // Check if this is a continuous variable command
    if (CONTINUOUS_COMMANDS[matchedCommand]) {
      // Don't auto-show slider, just complete the command
      // User needs to press space+tab to show slider
      input.value = matchedCommand;
    } else {
      // Regular completion
      input.value = matchedCommand;
    }
  } else {
    // Multiple matches - complete up to ambiguity
    const commonPrefix = findCommonPrefix(matches);

    // Always complete to the longest common prefix if it's longer than current input
    if (commonPrefix && commonPrefix.length > trimmedInput.length) {
      input.value = commonPrefix;
    } else {
      // Already at ambiguity or no common prefix, show all matches
      const coloredCompletions = formatCompletionsWithColors(matches);
      cliLogHtml(`Possible completions: ${coloredCompletions}`, 'success');
    }
  }

  return true;
}

export { handleTabCompletion, TOP_LEVEL_COMMANDS, CONTINUOUS_COMMANDS };
