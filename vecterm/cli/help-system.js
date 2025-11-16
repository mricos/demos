/**
 * Hierarchical Help System
 *
 * Organizes commands into 5-7 top-level categories.
 * Provides detailed help for each category.
 */

import { cliLog } from './terminal.js';

/**
 * Help hierarchy: 5 top-level categories
 */
export const HELP_CATEGORIES = {
  context: {
    name: 'context',
    desc: 'Context & field management (3-tier system)',
    commands: [
      { cmd: 'ls [namespace]', desc: 'List: fields, games, contexts, s3' },
      { cmd: 'load <game> [as <name>]', desc: 'Load game → context (lobby)' },
      { cmd: 'play <context> [as <name>] [3d|2d]', desc: 'Create field instance' },
      { cmd: 'use <field>', desc: 'Enter field context' },
      { cmd: 'stop [field]', desc: 'Stop field instance' },
      { cmd: 'exit', desc: 'Exit current context/field' }
    ]
  },

  vecterm: {
    name: 'vecterm',
    desc: '3D vector graphics & entities',
    commands: [
      { cmd: 'vecterm.demo', desc: 'Start spinning cube demo' },
      { cmd: 'vecterm.stop', desc: 'Stop demo' },
      { cmd: 'vecterm.spawn <type> <size> [x,y,z]', desc: 'Create mesh (cube/sphere/box)' },
      { cmd: 'vecterm.list', desc: 'List entities' },
      { cmd: 'vecterm.camera.orbit <az> <el>', desc: 'Orbit camera' },
      { cmd: 'vecterm.camera.zoom <factor>', desc: 'Zoom (0.9=in, 1.1=out)' },
      { cmd: 'vecterm.camera.reset', desc: 'Reset camera' },
      { cmd: 'vecterm.grid.type <char|square|none>', desc: 'Set grid type' },
      { cmd: 'vecterm.grid.toggle <type>', desc: 'Toggle grid visibility' }
    ]
  },

  vt100: {
    name: 'vt100',
    desc: 'CRT effects for console & game',
    commands: [
      { cmd: 'vt100.help', desc: 'Console CRT commands' },
      { cmd: 'vt100.status', desc: 'Show console CRT settings' },
      { cmd: 'vt100.scanlines <0-1>', desc: 'Scanline intensity (slider)' },
      { cmd: 'vt100.glow <0-1>', desc: 'Glow intensity (slider)' },
      { cmd: 'view.vt100.help', desc: 'View CRT effects commands' },
      { cmd: 'view.vt100.status', desc: 'Show view CRT settings' },
      { cmd: 'view.vt100.toggle', desc: 'Toggle all view effects' },
      { cmd: 'game.vt100.help', desc: '[DEPRECATED] Use view.vt100.*' }
    ]
  },

  input: {
    name: 'input',
    desc: 'Gamepad & input configuration',
    commands: [
      { cmd: 'gamepad.status', desc: 'Show connected gamepad' },
      { cmd: 'gamepad.enable/disable', desc: 'Toggle gamepad input' },
      { cmd: 'gamepad.load <preset>', desc: 'Load preset (xbox/playstation)' },
      { cmd: 'gamepad.test', desc: 'Live button/axis test' }
    ]
  },

  tines: {
    name: 'tines',
    desc: 'BPM-aware audio engine (Strudel-inspired)',
    commands: [
      { cmd: 'tines.status', desc: 'Show engine status & active patterns' },
      { cmd: 'tines.drone <pattern>', desc: 'Play drone pattern (e.g., "C2 ~ G2 ~")' },
      { cmd: 'tines.stop [channel]', desc: 'Stop all or specific channel' },
      { cmd: 'tines.bpm <bpm>', desc: 'Set BPM (20-300)' },
      { cmd: 'tines.volume <0-1>', desc: 'Set master volume' },
      { cmd: 'tines.channel <ch> <vol>', desc: 'Set channel volume' },
      { cmd: 'tines.mute <channel>', desc: 'Mute channel' },
      { cmd: 'tines.unmute <channel>', desc: 'Unmute channel' },
      { cmd: 'tines.start/pause/resume', desc: 'Clock control' },
      { cmd: 'tines.help', desc: 'Pattern syntax guide' }
    ]
  },

  midi: {
    name: 'midi',
    desc: 'MIDI controller & hardware mapping',
    commands: [
      { cmd: 'midi.status', desc: 'Show MIDI devices & mappings' },
      { cmd: 'midi.devices', desc: 'List connected MIDI devices' },
      { cmd: 'midi.controller', desc: 'Show inline MIDI controller (8 channels)' },
      { cmd: 'midi.popup', desc: 'Show popup MIDI controller' },
      { cmd: 'midi.show', desc: 'Show visual MIDI controller (legacy)' },
      { cmd: 'midi.hide', desc: 'Hide visual controller' },
      { cmd: 'midi.map <ctrl> <param>', desc: 'Map control to parameter (e.g., 1k tines.bpm)' },
      { cmd: 'midi.unmap <ctrl>', desc: 'Remove mapping' },
      { cmd: 'midi.learn <param>', desc: 'MIDI learn - move control to map it' },
      { cmd: 'midi.preset <name>', desc: 'Load mapping preset (tines-mixer)' },
      { cmd: 'midi.presets', desc: 'List available presets' }
    ]
  },

  games: {
    name: 'games',
    desc: 'Game commands & parameters',
    commands: [
      { cmd: 'quadrapong', desc: 'Start Quadrapong (4-player pong)' },
      { cmd: 'controls', desc: 'Show current paddle controls' },
      { cmd: 'controls.player1 <side>', desc: 'Assign paddle to Player 1 (left/right/top/bottom)' },
      { cmd: 'controls.ai <side>', desc: 'Return paddle to AI' },
      { cmd: 'reset', desc: 'Reset game state (when game active)' },
      { cmd: 'pause', desc: 'Pause game' },
      { cmd: 'resume', desc: 'Resume game' },
      { cmd: '<game>.<param> <value>', desc: 'Set game parameter (tab-complete enabled)' }
    ]
  },

  system: {
    name: 'system',
    desc: 'State, auth, and utilities',
    commands: [
      { cmd: 'state [path]', desc: 'Show Redux state (JSON)' },
      { cmd: 'inspect context <name>', desc: 'Inspect context details' },
      { cmd: 'inspect field <name>', desc: 'Inspect field instance' },
      { cmd: 'inspect entities', desc: 'List all entities with components' },
      { cmd: 'inspect entity <id>', desc: 'Detailed view of single entity' },
      { cmd: 'list entities', desc: 'Simple entity list' },
      { cmd: 'perf', desc: 'Show performance status' },
      { cmd: 'perf.fix', desc: 'Force disable Redux animation' },
      { cmd: 'login <user> <pass>', desc: 'Authenticate & enable S3' },
      { cmd: 'logout', desc: 'End session' },
      { cmd: 'clear', desc: 'Clear terminal output' },
      { cmd: 'sleep <ms>', desc: 'Delay for multi-line scripts (paste)' }
    ]
  }
};

/**
 * Show top-level help (category list)
 */
export function showHelp() {
  cliLog('=== Vecterm Command Categories ===', 'success');
  cliLog('');

  Object.values(HELP_CATEGORIES).forEach(category => {
    cliLog(`  help ${category.name.padEnd(10)} - ${category.desc}`);
  });

  cliLog('');
  cliLog('Tip: Use TAB for command completion', 'success');
}

/**
 * Show detailed help for a category
 */
export function showCategoryHelp(categoryName) {
  const category = HELP_CATEGORIES[categoryName];

  if (!category) {
    cliLog(`Unknown category: ${categoryName}`, 'error');
    cliLog('Available: ' + Object.keys(HELP_CATEGORIES).join(', '), 'success');
    return;
  }

  cliLog(`=== ${category.name.toUpperCase()}: ${category.desc} ===`, 'success');
  cliLog('');

  category.commands.forEach(({ cmd, desc }) => {
    cliLog(`  ${cmd.padEnd(35)} ${desc}`);
  });

  cliLog('');
}

/**
 * Get all command names for tab completion
 */
export function getAllCommands() {
  const commands = [];

  // Add top-level help commands
  Object.keys(HELP_CATEGORIES).forEach(cat => {
    commands.push(`help ${cat}`);
  });

  // Add all actual commands
  Object.values(HELP_CATEGORIES).forEach(category => {
    category.commands.forEach(({ cmd }) => {
      const cmdName = cmd.split(' ')[0].split('<')[0].trim();
      if (!commands.includes(cmdName)) {
        commands.push(cmdName);
      }
    });
  });

  return commands.sort();
}

/**
 * Get commands for a specific category (for context-aware completion)
 */
export function getCommandsForCategory(categoryName) {
  const category = HELP_CATEGORIES[categoryName];
  if (!category) return [];

  return category.commands.map(({ cmd }) => cmd.split(' ')[0].trim());
}

/**
 * Legacy help mapping (for gradual migration)
 */
export const LEGACY_HELP_MAP = {
  'vt100.help': () => showCategoryHelp('vt100'),
  'view.vt100.help': () => showCategoryHelp('vt100'),
  'game.vt100.help': () => showCategoryHelp('vt100'), // Backward compat
  'vecterm.help': () => showCategoryHelp('vecterm'),
  'gamepad.help': () => showCategoryHelp('input'),
  'tines.help': () => showCategoryHelp('tines')
};
