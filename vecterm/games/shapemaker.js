/**
 * Shapemaker Game
 * Element creator and inspector tool
 */

import * as Actions from '../core/actions.js';

export class Shapemaker {
  constructor(store) {
    this.store = store;
    this.entities = [];
    this.nextId = 1;
  }

  start() {
    console.log('[SHAPEMAKER] Starting...');
    this.store.dispatch(Actions.setGameActive('shapemaker'));
    this.store.dispatch(Actions.setMode('game'));
    this.store.dispatch(Actions.setCliContext('shapemaker'));
    this.addTerminalLine('Shapemaker started. Type "help" for commands.');

    // Also log to main terminal
    if (window.cliLog) {
      window.cliLog('Shapemaker context active', 'success');
    }
  }

  stop() {
    console.log('[SHAPEMAKER] Stopping...');
    this.store.dispatch(Actions.setGameActive(null));
    this.store.dispatch(Actions.setMode('idle'));
    this.store.dispatch(Actions.setCliContext('vecterm'));
    this.entities = [];

    // Log to main terminal
    if (window.cliLog) {
      window.cliLog('Shapemaker stopped', 'info');
    }
  }

  processCommand(command) {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    console.log('[SHAPEMAKER] Command:', cmd, args);

    // Mirror to main terminal
    if (window.cliLog) {
      window.cliLog(`shape> ${command}`, 'command');
    }

    switch (cmd) {
      case 'help':
        this.showHelp();
        break;
      case 'create':
        this.createEntity(args[0], args.slice(1));
        break;
      case 'list':
        this.listEntities();
        break;
      case 'inspect':
        this.inspectEntity(args[0]);
        break;
      case 'delete':
        this.deleteEntity(args[0]);
        break;
      case 'clear':
        this.clearAll();
        break;
      default:
        this.addTerminalLine(`Unknown command: ${cmd}`, 'error');
    }
  }

  showHelp() {
    this.addTerminalLine('Commands:');
    this.addTerminalLine('  create <type> - Create entity (circle, rect, triangle)');
    this.addTerminalLine('  list - List all entities');
    this.addTerminalLine('  inspect <id> - Inspect entity properties');
    this.addTerminalLine('  delete <id> - Delete entity');
    this.addTerminalLine('  clear - Clear all entities');
  }

  createEntity(type, args) {
    if (!type) {
      this.addTerminalLine('Usage: create <type>', 'error');
      return;
    }

    const id = `shape-${this.nextId++}`;
    const colors = ['#4fc3f7', '#ffa726', '#66bb6a', '#ff5252', '#ab47bc'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const entity = {
      id,
      type: type.toLowerCase(),
      x: Math.random() * 800 + 100,
      y: Math.random() * 400 + 100,
      width: 50,
      height: 50,
      color,
      rotation: 0
    };

    // Dispatch to Redux
    this.store.dispatch(Actions.addEntity(entity));
    this.entities.push(entity);

    this.addTerminalLine(`Created ${type} "${id}" at (${Math.floor(entity.x)}, ${Math.floor(entity.y)})`);
    this.updateEntityCount();
  }

  listEntities() {
    if (this.entities.length === 0) {
      this.addTerminalLine('No entities');
      return;
    }

    this.addTerminalLine(`Entities (${this.entities.length}):`);
    this.entities.forEach(e => {
      this.addTerminalLine(`  ${e.id}: ${e.type} at (${Math.floor(e.x)}, ${Math.floor(e.y)})`);
    });
  }

  inspectEntity(id) {
    const entity = this.entities.find(e => e.id === id);
    if (!entity) {
      this.addTerminalLine(`Entity "${id}" not found`, 'error');
      return;
    }

    this.addTerminalLine(`Inspecting ${id}:`);
    this.addTerminalLine(`  type: ${entity.type}`);
    this.addTerminalLine(`  position: (${Math.floor(entity.x)}, ${Math.floor(entity.y)})`);
    this.addTerminalLine(`  size: ${entity.width}x${entity.height}`);
    this.addTerminalLine(`  color: ${entity.color}`);
    this.addTerminalLine(`  rotation: ${entity.rotation}°`);
  }

  deleteEntity(id) {
    const index = this.entities.findIndex(e => e.id === id);
    if (index === -1) {
      this.addTerminalLine(`Entity "${id}" not found`, 'error');
      return;
    }

    this.entities.splice(index, 1);
    this.store.dispatch(Actions.deleteEntity(id));
    this.addTerminalLine(`Deleted ${id}`);
    this.updateEntityCount();
  }

  clearAll() {
    this.entities.forEach(e => {
      this.store.dispatch(Actions.deleteEntity(e.id));
    });
    this.entities = [];
    this.addTerminalLine('Cleared all entities');
    this.updateEntityCount();
  }

  addTerminalLine(text, type = 'info') {
    const output = document.getElementById('shapemaker-output');
    if (!output) return;

    const line = document.createElement('div');
    line.className = 'game-terminal-line';

    const prompt = document.createElement('span');
    prompt.className = 'game-prompt';
    prompt.textContent = 'shape>';

    const textSpan = document.createElement('span');
    textSpan.className = type === 'error' ? 'game-text-error' : 'game-text';
    textSpan.textContent = text;

    line.appendChild(prompt);
    line.appendChild(textSpan);
    output.appendChild(line);

    // Auto-scroll
    output.scrollTop = output.scrollHeight;
  }

  updateEntityCount() {
    const counter = document.getElementById('shapemaker-entity-count');
    if (counter) {
      counter.textContent = this.entities.length;
    }
  }
}
