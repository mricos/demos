/**
 * CLI Command Processor
 *
 * Processes all CLI commands and dispatches appropriate actions.
 * Handles entity commands, tool commands, game commands, VT100 effects, and more.
 */

import * as Actions from '../core/actions.js';
import { cliLog, cliLogJson } from './terminal.js';
import { showHelp, showCategoryHelp, LEGACY_HELP_MAP } from './help-system.js';
import { multiplayerCommands } from '../multiplayer.js';

/**
 * Create command processor with dependencies injected
 *
 * @param {Object} store - Redux store
 * @param {Object} vectermControls - Vecterm controls (camera, start/stop, renderer getter)
 * @param {Object} gameControls - Game controls (start, stop, preview functions)
 * @param {Object} tinesManager - Tines audio manager (optional)
 * @returns {Function} Command processor function
 */
function createCommandProcessor(store, vectermControls, gameControls, tinesManagerOrGetter = null) {
  // Don't destructure vectermCamera - it's a getter that needs lazy evaluation
  const { startVectermDemo, stopVectermDemo, getVectermRenderer } = vectermControls;
  const { startGamePlay, stopGame, startGamePreview } = gameControls;

  // Support both direct value and getter function for tinesManager
  const getTinesManager = () => {
    if (typeof tinesManagerOrGetter === 'function') {
      return tinesManagerOrGetter();
    }
    return tinesManagerOrGetter;
  };

  return function processCLICommand(command) {
    const tinesManager = getTinesManager();
    const trimmed = command.trim();
    const parts = trimmed.split(' ');
    const cmdPath = parts[0].toLowerCase().split('.');
    const cmd = cmdPath[0];
    const args = parts.slice(1);

    cliLog(`vecterm> ${command}`);

    if (cmd === 'help') {
      // New hierarchical help system
      if (args.length === 0) {
        showHelp();
      } else {
        showCategoryHelp(args[0]);
      }

    } else if (cmd === 'ls') {
      const namespace = args[0];
      const state = store.getState();

      if (!namespace) {
        // List top-level namespaces
        const fieldCount = Object.keys(state.fields.instances).length;
        const gameCount = Object.keys(state.games.registry).length;
        const contextCount = Object.keys(state.contexts).length;
        const s3Status = state.s3.connected ? 'connected' : 'disconnected (login required)';

        cliLog('fields/      ' + fieldCount + (fieldCount === 1 ? ' instance' : ' instances'), 'success');
        cliLog('games/       ' + gameCount + ' available', 'success');
        cliLog('contexts/    ' + contextCount + ' loaded', 'success');
        cliLog('s3/          ' + s3Status, 'success');
        cliLog('help', 'success');

      } else if (namespace === 'fields') {
        // List all field instances
        const fields = state.fields.instances;
        if (Object.keys(fields).length === 0) {
          cliLog('(empty - no instances running)', 'success');
        } else {
          Object.values(fields).forEach(field => {
            const status = `[${field.status}]`;
            const from = `from: contexts.${field.contextId}`;
            cliLog(`fields.${field.id}  ${status}  ${from}`, 'success');
          });
        }

      } else if (namespace === 'games') {
        // List all available games
        const games = state.games.registry;
        Object.values(games).forEach(game => {
          const provenance = '[built-in]';  // TODO: Add provenance when we support local/s3
          cliLog(`games.${game.id}  ${provenance}  ${game.description}  v${game.version}`, 'success');
        });

      } else if (namespace === 'contexts') {
        // List all loaded contexts
        const contexts = state.contexts;
        if (Object.keys(contexts).length === 0) {
          cliLog('(empty - no contexts loaded)', 'success');
        } else {
          Object.values(contexts).forEach(ctx => {
            const from = `[from: games.${ctx.gameId} built-in]`;
            const customCount = Object.keys(ctx.customizations).length;
            const customized = customCount > 0 ? `  customized: ${customCount} params` : '';
            cliLog(`contexts.${ctx.id}  ${from}${customized}`, 'success');
          });
        }

      } else if (namespace === 's3') {
        // List S3 contents (requires login)
        if (!state.s3.connected) {
          cliLog('ERROR: Not authenticated. Type \'login <username> <password>\'', 'error');
        } else {
          cliLog('[PLACEHOLDER] S3 listing - not yet implemented', 'success');
          cliLog('Your saved games:', 'success');
          cliLog('  (empty)', 'success');
          cliLog('Your uploaded games:', 'success');
          cliLog('  (empty)', 'success');
        }

      } else {
        cliLog(`Unknown namespace: ${namespace}`, 'error');
        cliLog('Available namespaces: fields, games, contexts, s3', 'error');
      }

    } else if (cmd === 'clear') {
      const output = document.getElementById('cli-output');
      if (output) output.innerHTML = '';
      cliLog('CLI cleared', 'success');

    } else if (cmd === 'sleep') {
      // Sleep command for pasted scripts - does nothing, just provides timing
      const ms = args.length > 0 ? parseInt(args[0]) : 0;
      if (ms > 0) {
        cliLog(`Sleeping for ${ms}ms...`, 'success');
      }

    } else if (cmd === 'inspect' && parts.length === 3) {
      // inspect context <name> OR inspect field <name>
      const type = parts[1];
      const name = parts[2];
      const state = store.getState();

      if (type === 'context') {
        if (state.contexts[name]) {
          cliLog(`Context: ${name}`, 'success');
          cliLogJson(state.contexts[name], { collapsedDepth: 5, rootCollapsed: false });
        } else {
          cliLog(`Context '${name}' not found.`, 'error');
        }
      } else if (type === 'field') {
        if (state.fields.instances[name]) {
          cliLog(`Field: ${name}`, 'success');
          // Don't show the actual instance object (too large), just metadata
          const { instance, ...metadata } = state.fields.instances[name];
          cliLogJson({
            ...metadata,
            instance: instance ? '<Game Instance>' : null
          }, { collapsedDepth: 5, rootCollapsed: false });
        } else {
          cliLog(`Field '${name}' not found.`, 'error');
        }
      } else {
        cliLog(`Unknown type: ${type}. Use 'context' or 'field'.`, 'error');
      }

    } else if (cmd === 'state') {
      const state = store.getState();

      // Support filtering: state contexts, state fields, etc.
      if (args.length > 0) {
        const path = args[0];
        const value = path.split('.').reduce((obj, key) => obj?.[key], state);
        if (value !== undefined) {
          cliLog(`state.${path}:`, 'success');
          cliLogJson(value, { collapsedDepth: 3 });
        } else {
          cliLog(`Path not found: state.${path}`, 'error');
        }
      } else {
        cliLog('Redux State:', 'success');
        cliLogJson(state, { collapsedDepth: 2 });
      }

    } else if (cmd === 'spawn' && parts.length >= 4) {
      const type = parts[1];
      const x = parseInt(parts[2]);
      const y = parseInt(parts[3]);
      const color = parts[4] || '#4fc3f7';

      store.dispatch(Actions.addEntity({
        type,
        x,
        y,
        width: 64,
        height: 64,
        color,
        label: type
      }));
      cliLog(`Spawned ${type} at (${x}, ${y})`, 'success');

    } else if (cmd === 'select' && parts.length === 2) {
      store.dispatch(Actions.selectEntity(parts[1]));
      cliLog(`Selected entity: ${parts[1]}`, 'success');

    } else if (cmd === 'move' && parts.length === 4) {
      const id = parts[1];
      const x = parseInt(parts[2]);
      const y = parseInt(parts[3]);
      store.dispatch(Actions.updateEntity(id, { x, y }));
      cliLog(`Moved ${id} to (${x}, ${y})`, 'success');

    } else if (cmd === 'delete' && parts.length === 2) {
      store.dispatch(Actions.deleteEntity(parts[1]));
      cliLog(`Deleted entity: ${parts[1]}`, 'success');

    } else if (trimmed.toLowerCase() === 'list entities') {
      const entities = store.getState().entities;
      if (entities.length === 0) {
        cliLog('No entities', 'success');
      } else {
        entities.forEach(e => {
          cliLog(`${e.id}: ${e.type} at (${e.x}, ${e.y})`, 'success');
        });
      }

    } else if (cmd === 'layer' && parts.length >= 2) {
      const subcmd = parts[1].toLowerCase();

      const state = store.getState();
      const namespace = state.namespaces.demo || { layers: [] };

      if (subcmd === 'add' && parts[2]) {
        store.dispatch(Actions.addLayer(parts.slice(2).join(' ')));
        cliLog(`Created layer: ${parts.slice(2).join(' ')}`, 'success');
      } else if (subcmd === 'show' && parts[2]) {
        const layer = namespace.layers.find(l => l.id === parts[2]);
        if (layer && !layer.visible) {
          store.dispatch(Actions.toggleLayerVisibility(parts[2]));
          cliLog(`Showed layer: ${parts[2]}`, 'success');
        }
      } else if (subcmd === 'hide' && parts[2]) {
        const layer = namespace.layers.find(l => l.id === parts[2]);
        if (layer && layer.visible) {
          store.dispatch(Actions.toggleLayerVisibility(parts[2]));
          cliLog(`Hid layer: ${parts[2]}`, 'success');
        }
      } else if (subcmd === 'active' && parts[2]) {
        store.dispatch(Actions.setActiveLayer(parts[2]));
        cliLog(`Set active layer: ${parts[2]}`, 'success');
      }

    } else if (trimmed.toLowerCase() === 'list layers') {
      const state = store.getState();
      const namespace = state.namespaces.demo || { layers: [] };
      const layers = namespace.layers;
      if (layers.length === 0) {
        cliLog('No layers in demo namespace', 'success');
      } else {
        layers.forEach(l => {
          cliLog(`${l.id}: ${l.name} (${l.visible ? 'visible' : 'hidden'})`, 'success');
        });
      }

    } else if (cmd === 'tool' && parts.length === 2) {
      store.dispatch(Actions.setTool(parts[1]));
      cliLog(`Switched to ${parts[1]} tool`, 'success');

    } else if (cmd === 'grid' && parts.length === 2) {
      if (parts[1] === 'on' || parts[1] === 'off') {
        const state = store.getState();
        if ((parts[1] === 'on' && !state.grid.enabled) || (parts[1] === 'off' && state.grid.enabled)) {
          store.dispatch(Actions.toggleGrid());
          cliLog(`Grid ${parts[1]}`, 'success');
        }
      } else if (parts[1] === 'size' && parts[2]) {
        store.dispatch(Actions.setGridSize(parseInt(parts[2])));
        cliLog(`Grid size set to ${parts[2]}`, 'success');
      }

    } else if (cmd === 'games') {
      const state = store.getState();
      const registry = state.games.registry;

      cliLog('=== Available Games ===', 'success');
      Object.values(registry).forEach(game => {
        const status = game.loaded ? '[LOADED]' : '';
        cliLog(`  ${game.id} - ${game.name} ${status}`, 'success');
        cliLog(`    ${game.description}`);
        cliLog(`    Version: ${game.version}`);
      });

    } else if (cmd === 'load' && parts.length >= 2) {
      // New 3-tier: load <game> [as <name>] - creates context from game
      const gameId = parts[1];
      const state = store.getState();

      // Check for "as <name>" syntax
      let contextId = gameId;
      if (parts.length >= 4 && parts[2] === 'as') {
        contextId = parts[3];
      }

      if (!state.games.registry[gameId]) {
        cliLog(`Error: Game '${gameId}' not found. Type 'ls games' to list available games.`, 'error');
        return;
      }

      if (state.contexts[contextId]) {
        cliLog(`Error: Context '${contextId}' already exists. Use 'unload ${contextId}' first.`, 'error');
        return;
      }

      store.dispatch(Actions.createContext(contextId, gameId, contextId !== gameId ? contextId : null));
      cliLog(`Context created: contexts.${contextId}`, 'success');
      cliLog(`Type 'edit ${contextId}' to customize or 'play ${contextId}' to start.`, 'success');

    } else if (cmd === 'preview' && parts.length === 2) {
      const gameId = parts[1];
      const state = store.getState();

      if (!state.games.registry[gameId]) {
        cliLog(`Error: Game '${gameId}' not found.`, 'error');
        return;
      }

      if (!state.games.registry[gameId].loaded) {
        cliLog(`Error: Game '${gameId}' not loaded. Use 'load ${gameId}' first.`, 'error');
        return;
      }

      store.dispatch(Actions.setPreviewGame(gameId));
      cliLog(`Preview mode: ${state.games.registry[gameId].name}`, 'success');
      cliLog(`Note: Use 'play ${gameId}' to actually run the game`, 'success');
      // Preview disabled - don't render ASCII or start game
      // startGamePreview(gameId);

    } else if (cmd === 'edit' && parts.length === 2) {
      // Enter context edit mode
      const contextId = parts[1];
      const state = store.getState();

      if (!state.contexts[contextId]) {
        cliLog(`Error: Context '${contextId}' not found. Type 'ls contexts' to list loaded contexts.`, 'error');
        return;
      }

      store.dispatch(Actions.enterContextEdit(contextId));
      cliLog(`Entered context edit mode: ${contextId}`, 'success');
      cliLog(`[PLACEHOLDER] Context customization commands not yet implemented`, 'success');
      cliLog(`Type 'exit' to leave edit mode.`, 'success');

    } else if (cmd === 'unload' && parts.length === 2) {
      // Remove context from lobby
      const contextId = parts[1];
      const state = store.getState();

      if (!state.contexts[contextId]) {
        cliLog(`Error: Context '${contextId}' not found.`, 'error');
        return;
      }

      // Check if any fields are using this context
      const fieldsUsingContext = Object.values(state.fields.instances).filter(f => f.contextId === contextId);
      if (fieldsUsingContext.length > 0) {
        cliLog(`Error: Cannot unload context '${contextId}'. Fields still running:`, 'error');
        fieldsUsingContext.forEach(f => cliLog(`  - ${f.id}`, 'error'));
        cliLog(`Stop these fields first with 'stop <field>'.`, 'error');
        return;
      }

      store.dispatch(Actions.deleteContext(contextId));
      cliLog(`Context unloaded: ${contextId}`, 'success');

    } else if (cmd === 'play' && parts.length >= 2) {
      // New 3-tier: play <context> [as <name>] [3d|2d] - creates field from context
      const contextId = parts[1];
      const state = store.getState();

      // Parse arguments: [as <name>] [3d|2d]
      let fieldId = null;
      let mode = '3d';  // Default to 3D (2D is isometric projection)

      let i = 2;
      while (i < parts.length) {
        if (parts[i] === 'as' && i + 1 < parts.length) {
          fieldId = parts[i + 1];
          i += 2;
        } else if (parts[i] === '2d' || parts[i] === '3d') {
          mode = parts[i];
          i += 1;
        } else {
          mode = parts[i];  // Assume it's a mode if not 'as'
          i += 1;
        }
      }

      // Check context exists
      if (!state.contexts[contextId]) {
        cliLog(`Error: Context '${contextId}' not found. Use 'load ${contextId}' first.`, 'error');
        return;
      }

      const context = state.contexts[contextId];

      // Generate field ID if not provided
      if (!fieldId) {
        const nextNum = state.fields.nextInstanceNumber[context.gameId] || 1;
        fieldId = `${context.gameId}-${String(nextNum).padStart(3, '0')}`;
      }

      // Check field doesn't already exist
      if (state.fields.instances[fieldId]) {
        cliLog(`Error: Field '${fieldId}' already exists. Choose a different name.`, 'error');
        return;
      }

      // Create field instance
      store.dispatch(Actions.createField(fieldId, contextId, context.gameId, fieldId));
      cliLog(`Instance created: fields.${fieldId}`, 'success');

      // Start the game
      store.dispatch(Actions.setActiveGame(context.gameId));
      store.dispatch(Actions.setMode('game'));
      startGamePlay(context.gameId, mode);

      // Update field with game instance
      const gameInstance = store.getState().games.instances[context.gameId];
      store.dispatch(Actions.updateField(fieldId, { instance: gameInstance, mode }));

      const modeLabel = mode === '3d' ? '3D VECTERM' : '2D ISOMETRIC';
      cliLog(`Playing ${state.games.registry[context.gameId].name} in ${modeLabel} mode...`, 'success');
      cliLog(`Type 'use ${fieldId}' to interact or 'stop ${fieldId}' to end.`, 'success');

    } else if (cmd === 'play3d' && parts.length === 2) {
      const gameId = parts[1];
      const state = store.getState();

      if (!state.games.registry[gameId]) {
        cliLog(`Error: Game '${gameId}' not found.`, 'error');
        return;
      }

      if (!state.games.registry[gameId].loaded) {
        cliLog(`Error: Game '${gameId}' not loaded. Use 'load ${gameId}' first.`, 'error');
        return;
      }

      store.dispatch(Actions.setActiveGame(gameId));
      store.dispatch(Actions.setCliContext('game', gameId));
      store.dispatch(Actions.setMode('game'));
      startGamePlay(gameId, '3d');
      cliLog(`Playing ${state.games.registry[gameId].name} in 3D VECTERM mode...`, 'success');

    } else if (cmd === 'use' && parts.length === 2) {
      // Enter field instance context
      const fieldId = parts[1];
      const state = store.getState();

      if (!state.fields.instances[fieldId]) {
        cliLog(`Error: Field '${fieldId}' not found. Type 'ls fields' to list running instances.`, 'error');
        return;
      }

      store.dispatch(Actions.enterField(fieldId));
      cliLog(`Entered field: ${fieldId}`, 'success');
      cliLog(`[PLACEHOLDER] Field interaction commands not yet implemented`, 'success');
      cliLog(`Type 'exit' to leave field context.`, 'success');

    } else if (cmd === 'exit') {
      // Exit current context (field or context edit)
      const state = store.getState();
      const { mode, contextId, fieldId } = state.cliPrompt;

      if (mode === 'context' && contextId) {
        store.dispatch(Actions.exitContextEdit());
        cliLog(`Exited context edit: ${contextId}`, 'success');
      } else if (mode === 'field' && fieldId) {
        store.dispatch(Actions.exitField());
        cliLog(`Exited field: ${fieldId}`, 'success');
      } else {
        cliLog('Not in a context or field. Already at top level.', 'error');
      }

    } else if (cmd === 'stop') {
      // New 3-tier: stop [field] - stop field instance
      const state = store.getState();

      let fieldId = parts[1];

      // If no field specified, try to infer
      if (!fieldId) {
        const runningFields = Object.keys(state.fields.instances);
        if (runningFields.length === 0) {
          cliLog('No fields running.', 'error');
          return;
        } else if (runningFields.length === 1) {
          fieldId = runningFields[0];
        } else if (state.cliPrompt.fieldId) {
          // If in a field context, stop that field
          fieldId = state.cliPrompt.fieldId;
        } else {
          cliLog('Multiple fields running. Specify which to stop:', 'error');
          runningFields.forEach(id => cliLog(`  stop ${id}`, 'error'));
          return;
        }
      }

      // Check field exists
      if (!state.fields.instances[fieldId]) {
        cliLog(`Error: Field '${fieldId}' not found.`, 'error');
        return;
      }

      const field = state.fields.instances[fieldId];

      // Stop the game
      stopGame(field.gameId);
      store.dispatch(Actions.setActiveGame(null));
      store.dispatch(Actions.setMode('idle'));

      // Remove field
      store.dispatch(Actions.stopField(fieldId));
      cliLog(`Field stopped: ${fieldId}`, 'success');

    } else if (cmd === 'demo') {
      cliLog('The "demo" command is deprecated. Use "load quadrapong" then "play quadrapong"', 'error');

    } else if (cmd === 'vecterm' && cmdPath[1] === 'demo') {
      stopVectermDemo();
      startVectermDemo();
      cliLog('Vecterm demo started - spinning cube in CLI viewport', 'success');

    } else if (cmd === 'vecterm' && cmdPath[1] === 'stop') {
      stopVectermDemo();
      cliLog('Vecterm demo stopped', 'success');

    // Vecterm entity commands
    } else if (cmd === 'vecterm' && cmdPath[1] === 'spawn' && args.length >= 2) {
      const meshType = args[0]; // cube, sphere, box
      const sizeParam = parseFloat(args[1]) || 1;
      const posStr = args[2] || '0,0,0';
      const color = args[3] || '#00ff88';

      const [x, y, z] = posStr.split(',').map(parseFloat);
      const id = `${meshType}-${Date.now()}`;

      store.dispatch(Actions.vectermAddEntity({
        id,
        meshType,
        meshParams: { size: sizeParam },
        transform: {
          position: { x, y, z },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        color,
        visible: true
      }));
      cliLog(`Spawned ${meshType} (id: ${id}) at (${x}, ${y}, ${z})`, 'success');

    } else if (cmd === 'vecterm' && cmdPath[1] === 'list') {
      const state = store.getState();
      const entities = Object.values(state.vecterm.entities);
      if (entities.length === 0) {
        cliLog('No vecterm entities', 'info');
      } else {
        cliLog(`Vecterm entities (${entities.length}):`, 'success');
        entities.forEach(e => {
          const pos = e.transform.position;
          cliLog(`  ${e.id}: ${e.meshType} at (${pos.x}, ${pos.y}, ${pos.z}) ${e.visible ? '👁️' : '🙈'}`, 'info');
        });
      }

    } else if (cmd === 'vecterm' && cmdPath[1] === 'delete' && args.length === 1) {
      const id = args[0];
      store.dispatch(Actions.vectermRemoveEntity(id));
      cliLog(`Deleted entity: ${id}`, 'success');

    } else if (cmd === 'vecterm' && cmdPath[1] === 'move' && args.length === 2) {
      const id = args[0];
      const posStr = args[1];
      const [x, y, z] = posStr.split(',').map(parseFloat);

      store.dispatch(Actions.vectermSetPosition(id, { x, y, z }));
      cliLog(`Moved ${id} to (${x}, ${y}, ${z})`, 'success');

    } else if (cmd === 'vecterm' && cmdPath[1] === 'rotate' && args.length === 2) {
      const id = args[0];
      const rotStr = args[1];
      const [rx, ry, rz] = rotStr.split(',').map(parseFloat);

      store.dispatch(Actions.vectermSetRotation(id, { x: rx, y: ry, z: rz }));
      cliLog(`Rotated ${id} to (${rx}, ${ry}, ${rz})`, 'success');

    } else if (cmd === 'vecterm' && cmdPath[1] === 'toggle' && args.length === 1) {
      const id = args[0];
      store.dispatch(Actions.vectermToggleVisible(id));
      cliLog(`Toggled visibility: ${id}`, 'success');

    // Vecterm camera commands (now Redux-based)
    } else if (cmd === 'vecterm' && cmdPath[1] === 'camera' && cmdPath[2] === 'set' && args.length >= 3) {
      const [x, y, z] = args.slice(0, 3).map(parseFloat);
      const [tx, ty, tz] = args.length >= 6 ? args.slice(3, 6).map(parseFloat) : [0, 0, 0];

      store.dispatch(Actions.vectermSetCamera({
        position: { x, y, z },
        target: { x: tx, y: ty, z: tz }
      }));
      cliLog(`Camera set: pos(${x}, ${y}, ${z}) target(${tx}, ${ty}, ${tz})`, 'success');

    } else if (cmd === 'vecterm' && cmdPath[1] === 'camera' && cmdPath[2] === 'orbit' && args.length === 2) {
      const azimuth = parseFloat(args[0]);
      const elevation = parseFloat(args[1]);

      store.dispatch(Actions.vectermOrbitCamera(azimuth, elevation));
      cliLog(`Camera orbited: azimuth=${azimuth}, elevation=${elevation}`, 'success');

    } else if (cmd === 'vecterm' && cmdPath[1] === 'camera' && cmdPath[2] === 'zoom' && args.length === 1) {
      const factor = parseFloat(args[0]);

      store.dispatch(Actions.vectermZoomCamera(factor));
      cliLog(`Camera zoomed: factor=${factor}`, 'success');

    } else if (cmd === 'vecterm' && cmdPath[1] === 'camera' && cmdPath[2] === 'reset') {
      store.dispatch(Actions.vectermSetCamera({
        position: { x: 5, y: 5, z: 10 },
        target: { x: 0, y: 0, z: 0 }
      }));
      cliLog('Camera reset to default position', 'success');

    // Vecterm config commands
    } else if (cmd === 'vecterm' && cmdPath[1] === 'config' && cmdPath[2] === 'glow' && args.length === 1) {
      const value = parseFloat(args[0]);
      store.dispatch(Actions.vectermSetConfig({ glowIntensity: value }));
      cliLog(`Glow intensity set to ${value}`, 'success');

    } else if (cmd === 'vecterm' && cmdPath[1] === 'config' && cmdPath[2] === 'scanlines' && args.length === 1) {
      const value = parseFloat(args[0]);
      store.dispatch(Actions.vectermSetConfig({ scanlineIntensity: value }));
      cliLog(`Scanline intensity set to ${value}`, 'success');

    } else if (cmd === 'vecterm' && cmdPath[1] === 'config' && cmdPath[2] === 'phosphor' && args.length === 1) {
      const color = args[0];
      store.dispatch(Actions.vectermSetConfig({ phosphorColor: color }));
      cliLog(`Phosphor color set to ${color}`, 'success');

    } else if (cmd === 'vecterm' && cmdPath[1] === 'config' && cmdPath[2] === 'reset') {
      store.dispatch(Actions.vectermResetConfig());
      cliLog('Vecterm config reset to defaults', 'success');

    } else if (cmd === 'vecterm' && cmdPath[1] === 'config' && cmdPath[2] === 'status') {
      const state = store.getState();
      cliLog('Vecterm Configuration:', 'success');
      cliLog(JSON.stringify(state.vecterm.config, null, 2), 'info');

    // Vecterm grid commands
    } else if (cmd === 'vecterm' && cmdPath[1] === 'grid' && cmdPath[2] === 'type' && args.length === 1) {
      const gridType = args[0]; // 'character' | 'square' | 'none'
      if (!['character', 'square', 'none'].includes(gridType)) {
        cliLog('Invalid grid type. Use: character, square, or none', 'error');
      } else {
        store.dispatch(Actions.vectermSetGridType(gridType));
        cliLog(`Grid type set to: ${gridType}`, 'success');
      }

    } else if (cmd === 'vecterm' && cmdPath[1] === 'grid' && cmdPath[2] === 'show' && args.length === 1) {
      const gridType = args[0]; // 'character' | 'square'
      if (!['character', 'square'].includes(gridType)) {
        cliLog('Invalid grid type. Use: character or square', 'error');
      } else {
        store.dispatch(Actions.vectermSetGridConfig(gridType, { visible: true }));
        cliLog(`${gridType} grid overlay shown`, 'success');
      }

    } else if (cmd === 'vecterm' && cmdPath[1] === 'grid' && cmdPath[2] === 'hide' && args.length === 1) {
      const gridType = args[0]; // 'character' | 'square'
      if (!['character', 'square'].includes(gridType)) {
        cliLog('Invalid grid type. Use: character or square', 'error');
      } else {
        store.dispatch(Actions.vectermSetGridConfig(gridType, { visible: false }));
        cliLog(`${gridType} grid overlay hidden`, 'success');
      }

    } else if (cmd === 'vecterm' && cmdPath[1] === 'grid' && cmdPath[2] === 'toggle' && args.length === 1) {
      const gridType = args[0];
      if (!['character', 'square'].includes(gridType)) {
        cliLog('Invalid grid type. Use: character or square', 'error');
      } else {
        store.dispatch(Actions.vectermToggleGridVisible(gridType));
        cliLog(`Toggled ${gridType} grid visibility`, 'success');
      }

    } else if (cmd === 'vecterm' && cmdPath[1] === 'grid' && cmdPath[2] === 'size' && args.length === 1) {
      const size = parseInt(args[0]);
      store.dispatch(Actions.vectermSetSquareGrid({ size }));
      cliLog(`Square grid size set to ${size}px`, 'success');

    } else if (cmd === 'vecterm' && cmdPath[1] === 'grid' && cmdPath[2] === 'character' && args.length === 2) {
      const cols = parseInt(args[0]);
      const rows = parseInt(args[1]);
      store.dispatch(Actions.vectermSetCharacterGrid({ cols, rows }));
      cliLog(`Character grid set to ${cols}x${rows}`, 'success');

    } else if (cmd === 'vecterm' && cmdPath[1] === 'grid' && cmdPath[2] === 'ascii') {
      // Get vecterm renderer and convert to ASCII
      const vectermRenderer = getVectermRenderer?.();
      if (vectermRenderer && vectermRenderer.toASCII) {
        const ascii = vectermRenderer.toASCII();
        cliLog('ASCII Rendering:', 'success');
        cliLog(ascii, 'info');
      } else {
        cliLog('ASCII conversion requires character grid to be active', 'error');
      }

    } else if (cmd === 'vecterm' && cmdPath[1] === 'grid' && cmdPath[2] === 'stats') {
      const vectermRenderer = getVectermRenderer?.();
      if (vectermRenderer && vectermRenderer.getGridStats) {
        const stats = vectermRenderer.getGridStats();
        if (stats) {
          cliLog('Grid Statistics:', 'success');
          cliLog(JSON.stringify(stats, null, 2), 'info');
        } else {
          cliLog('No grid statistics available', 'info');
        }
      } else {
        cliLog('Grid statistics not available', 'error');
      }

    } else if (cmd === 'vecterm' && cmdPath[1] === 'grid' && cmdPath[2] === 'status') {
      const state = store.getState();
      cliLog('Vecterm Grid Configuration:', 'success');
      cliLog(JSON.stringify(state.vecterm.grid, null, 2), 'info');

    } else if (cmd === 'gamepad' && cmdPath[1] === 'status') {
      const state = store.getState();
      const gamepadState = state.gamepad;

      if (gamepadState.connected) {
        cliLog('Gamepad Status:', 'success');
        cliLog(`  Connected: ${gamepadState.connected.id}`, 'info');
        cliLog(`  Index: ${gamepadState.connected.index}`, 'info');
        cliLog(`  Mapping: ${gamepadState.connected.mapping}`, 'info');
        cliLog(`  Buttons: ${gamepadState.connected.buttons}`, 'info');
        cliLog(`  Axes: ${gamepadState.connected.axes}`, 'info');
        cliLog(`  Enabled: ${gamepadState.enabled}`, 'info');
        cliLog(`  Active Preset: ${gamepadState.activePreset}`, 'info');
        cliLog(`  Deadzone: ${gamepadState.deadzone}`, 'info');
      } else {
        cliLog('No gamepad connected', 'error');
        cliLog('Connect a gamepad and press any button to detect it.', 'info');
      }

    } else if (cmd === 'gamepad' && cmdPath[1] === 'enable') {
      const state = store.getState();
      if (!state.gamepad.enabled) {
        store.dispatch(Actions.toggleGamepadEnabled());
        cliLog('Gamepad input enabled', 'success');
      } else {
        cliLog('Gamepad input already enabled', 'info');
      }

    } else if (cmd === 'gamepad' && cmdPath[1] === 'disable') {
      const state = store.getState();
      if (state.gamepad.enabled) {
        store.dispatch(Actions.toggleGamepadEnabled());
        cliLog('Gamepad input disabled', 'success');
      } else {
        cliLog('Gamepad input already disabled', 'info');
      }

    } else if (cmd === 'gamepad' && cmdPath[1] === 'load' && args.length === 1) {
      const preset = args[0].toLowerCase();
      const validPresets = ['xbox', 'playstation', 'generic'];

      if (validPresets.includes(preset)) {
        store.dispatch(Actions.loadGamepadPreset(preset));
        cliLog(`Loaded gamepad preset: ${preset}`, 'success');
      } else {
        cliLog(`Invalid preset: ${preset}`, 'error');
        cliLog(`Valid presets: ${validPresets.join(', ')}`, 'info');
      }

    } else if (cmd === 'gamepad' && cmdPath[1] === 'map' && args.length === 3) {
      const buttonIndex = parseInt(args[0]);
      const action = args[1];
      const mode = args[2]; // 'game' or 'camera'

      if (isNaN(buttonIndex) || buttonIndex < 0 || buttonIndex > 15) {
        cliLog('Invalid button index. Must be 0-15.', 'error');
      } else if (mode !== 'game' && mode !== 'camera') {
        cliLog('Invalid mode. Must be "game" or "camera".', 'error');
      } else {
        store.dispatch(Actions.setGamepadMapping(buttonIndex, action, mode));
        cliLog(`Mapped button ${buttonIndex} to "${action}" in ${mode} mode`, 'success');
      }

    } else if (cmd === 'gamepad' && cmdPath[1] === 'test') {
      cliLog('Gamepad Test Mode', 'success');
      cliLog('Press any button or move any stick...', 'info');
      cliLog('Note: This is a one-time snapshot. For live testing, use the settings panel.', 'info');

      const gamepads = navigator.getGamepads();
      let found = false;

      for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (gamepad) {
          found = true;
          cliLog(`\nGamepad ${i}: ${gamepad.id}`, 'success');

          // Show buttons
          cliLog('  Buttons:', 'info');
          gamepad.buttons.forEach((button, index) => {
            if (button.pressed || button.value > 0) {
              cliLog(`    [${index}] pressed: ${button.pressed}, value: ${button.value.toFixed(2)}`, 'success');
            }
          });

          // Show axes
          cliLog('  Axes:', 'info');
          gamepad.axes.forEach((value, index) => {
            if (Math.abs(value) > 0.1) {
              cliLog(`    [${index}] value: ${value.toFixed(2)}`, 'success');
            }
          });
        }
      }

      if (!found) {
        cliLog('No gamepad detected. Connect a gamepad and press any button.', 'error');
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'status') {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        const status = tinesManager.getStatus();
        cliLog('Tines Audio Engine Status:', 'success');
        cliLog(`  Initialized: ${status.engine.initialized}`, 'info');
        cliLog(`  BPM: ${status.clock.bpm}`, 'info');
        cliLog(`  Playing: ${status.clock.playing ? 'YES' : 'NO'}`, 'info');
        cliLog(`  Master Volume: ${status.engine.masterVolume.toFixed(2)}`, 'info');
        cliLog(`  Active Voices: ${status.engine.activeVoices} / ${status.engine.maxVoices}`, 'info');
        cliLog(`  Active Patterns: ${status.patterns.length}`, 'info');
        cliLog('  Channels:', 'info');
        status.engine.channels.forEach(ch => {
          const muted = ch.muted ? ' [MUTED]' : '';
          cliLog(`    ${ch.name}: vol=${ch.volume.toFixed(2)}, voices=${ch.voiceCount}${muted}`, 'info');
        });
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'drone' && args.length >= 1) {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        const pattern = args.join(' ');
        tinesManager.playPattern('drone', pattern);
        cliLog(`Playing drone: ${pattern}`, 'success');
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'bells' && args.length >= 1) {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        const pattern = args.join(' ');
        tinesManager.playPattern('bells', pattern);
        cliLog(`Playing bells: ${pattern}`, 'success');
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'pan' && args.length >= 2) {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        const channel = args[0];
        const pan = parseFloat(args[1]);
        if (isNaN(pan) || pan < -1 || pan > 1) {
          cliLog('ERROR: Pan must be between -1 (left) and 1 (right)', 'error');
        } else {
          tinesManager.setChannelPan(channel, pan);
          cliLog(`Set ${channel} pan to ${pan}`, 'success');
        }
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'set' && args.length >= 2) {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        const varName = args[0];
        const varValue = args.slice(1).join(' ');
        tinesManager.setVariable(varName, varValue);
        cliLog(`Set variable ${varName} = ${varValue}`, 'success');
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'get' && args.length >= 1) {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        const varName = args[0];
        const varValue = tinesManager.getVariable(varName);
        if (varValue !== undefined) {
          cliLog(`${varName} = ${varValue}`, 'info');
        } else {
          cliLog(`Variable '${varName}' not found`, 'error');
        }
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'vars') {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        const vars = tinesManager.listVariables();
        cliLog('Global Variables:', 'success');
        if (Object.keys(vars.global).length === 0) {
          cliLog('  (none)', 'info');
        } else {
          Object.entries(vars.global).forEach(([name, value]) => {
            cliLog(`  ${name} = ${value}`, 'info');
          });
        }
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'preset' && args.length >= 1) {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        const presetName = args[0];
        const bellsInstrument = tinesManager.getInstrument('bells');
        if (bellsInstrument && bellsInstrument.setPreset) {
          bellsInstrument.setPreset(presetName);
          cliLog(`Set bells preset to: ${presetName}`, 'success');
        } else {
          cliLog('ERROR: Bells instrument not available', 'error');
        }
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'stop') {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        if (args.length === 0) {
          tinesManager.stopAll();
          cliLog('Stopped all audio', 'success');
        } else {
          const channel = args[0];
          tinesManager.stopChannel(channel);
          cliLog(`Stopped channel: ${channel}`, 'success');
        }
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'bpm' && args.length === 1) {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        const bpm = parseFloat(args[0]);
        if (isNaN(bpm) || bpm < 20 || bpm > 300) {
          cliLog('ERROR: BPM must be between 20 and 300', 'error');
        } else {
          tinesManager.setBPM(bpm);
          cliLog(`BPM set to ${bpm}`, 'success');
        }
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'volume' && args.length === 1) {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        const volume = parseFloat(args[0]);
        if (isNaN(volume) || volume < 0 || volume > 1) {
          cliLog('ERROR: Volume must be between 0 and 1', 'error');
        } else {
          tinesManager.setMasterVolume(volume);
          cliLog(`Master volume set to ${volume.toFixed(2)}`, 'success');
        }
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'channel' && args.length === 2) {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        const channel = args[0];
        const volume = parseFloat(args[1]);
        if (isNaN(volume) || volume < 0 || volume > 1) {
          cliLog('ERROR: Volume must be between 0 and 1', 'error');
        } else {
          tinesManager.setChannelVolume(channel, volume);
          cliLog(`${channel} volume set to ${volume.toFixed(2)}`, 'success');
        }
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'mute' && args.length === 1) {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        const channel = args[0];
        tinesManager.setChannelMute(channel, true);
        cliLog(`${channel} muted`, 'success');
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'unmute' && args.length === 1) {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        const channel = args[0];
        tinesManager.setChannelMute(channel, false);
        cliLog(`${channel} unmuted`, 'success');
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'start') {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        tinesManager.start();
        cliLog('Clock started', 'success');
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'pause') {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        tinesManager.pause();
        cliLog('Clock paused', 'success');
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'resume') {
      if (!tinesManager) {
        cliLog('ERROR: Tines audio engine not initialized', 'error');
      } else {
        tinesManager.resume();
        cliLog('Clock resumed', 'success');
      }

    } else if (cmd === 'tines' && cmdPath[1] === 'help') {
      cliLog('Tines Audio Engine Commands:', 'success');
      cliLog('  tines.status              - Show engine status', 'info');
      cliLog('  tines.drone <pattern>     - Play drone pattern (e.g., "C2" or "C2 ~ G2 ~")', 'info');
      cliLog('  tines.bells <pattern>     - Play bells pattern (e.g., "C4 E4 G4")', 'info');
      cliLog('  tines.stop [channel]      - Stop all or specific channel', 'info');
      cliLog('  tines.bpm <bpm>           - Set BPM (20-300)', 'info');
      cliLog('  tines.volume <vol>        - Set master volume (0-1)', 'info');
      cliLog('  tines.channel <ch> <vol>  - Set channel volume', 'info');
      cliLog('  tines.mute <channel>      - Mute channel', 'info');
      cliLog('  tines.unmute <channel>    - Unmute channel', 'info');
      cliLog('  tines.pan <ch> <val>      - Set channel pan (-1 left, 0 center, 1 right)', 'info');
      cliLog('  tines.set <name> <value>  - Set variable', 'info');
      cliLog('  tines.get <name>          - Get variable value', 'info');
      cliLog('  tines.vars                - List all variables', 'info');
      cliLog('  tines.preset <name>       - Set bells preset (classic, bright, soft, glass, gong)', 'info');
      cliLog('  tines.start               - Start clock', 'info');
      cliLog('  tines.pause               - Pause clock', 'info');
      cliLog('  tines.resume              - Resume clock', 'info');
      cliLog('', 'info');
      cliLog('Pattern Syntax (Strudel-inspired):', 'success');
      cliLog('  "C4 E4 G4"        - Play notes in sequence', 'info');
      cliLog('  "C4 ~ E4 ~"       - Rests (~)', 'info');
      cliLog('  "C4*2"            - Repeat (C4 C4)', 'info');
      cliLog('  "[C4 E4]*2"       - Group repeat', 'info');
      cliLog('  "<C4 E4>"         - Alternate between options', 'info');
      cliLog('  "C4/2"            - Sustain for 2 steps', 'info');
      cliLog('  "euclid(3,8)"     - Euclidean rhythm (3 hits in 8 steps)', 'info');
      cliLog('  "euclid(3,8,C4)"  - Euclidean with note', 'info');
      cliLog('  "[C4,E4,G4]"      - Random choice (comma-separated)', 'info');
      cliLog('  "$rootnote+7"     - Variable interpolation', 'info');
      cliLog('  "C4+10hz"         - Frequency offset (Hz)', 'info');
      cliLog('  "C4+50c"          - Cents offset (tuning)', 'info');
      cliLog('  "60"              - MIDI note number', 'info');

    } else if (cmd === 'midi' && cmdPath[1] === 'status') {
      if (window.Vecterm?.MIDI) {
        window.Vecterm.MIDI.status();
      } else {
        cliLog('ERROR: MIDI system not initialized', 'error');
      }

    } else if (cmd === 'midi' && cmdPath[1] === 'devices') {
      if (window.Vecterm?.MIDI) {
        const devices = window.Vecterm.MIDI.getDevices();
        if (devices.inputs.length === 0) {
          cliLog('No MIDI devices connected', 'info');
        } else {
          cliLog('Connected MIDI Devices:', 'success');
          devices.inputs.forEach(dev => {
            cliLog(`  ${dev.name} (${dev.manufacturer})`, 'info');
          });
        }
      } else {
        cliLog('ERROR: MIDI system not initialized', 'error');
      }

    } else if (cmd === 'midi' && cmdPath[1] === 'show') {
      if (window.Vecterm?.MIDI) {
        window.Vecterm.MIDI.showVisual();
        cliLog('Showing MIDI visual controller', 'success');
      } else {
        cliLog('ERROR: MIDI system not initialized', 'error');
      }

    } else if (cmd === 'midi' && cmdPath[1] === 'hide') {
      if (window.Vecterm?.MIDI) {
        window.Vecterm.MIDI.hideVisual();
        cliLog('Hiding MIDI visual controller', 'success');
      } else {
        cliLog('ERROR: MIDI system not initialized', 'error');
      }

    } else if (cmd === 'midi' && cmdPath[1] === 'popup') {
      if (window.Vecterm?.MIDI) {
        window.Vecterm.MIDI.showVT100();
        cliLog('Showing MIDI controller (popup)', 'success');
      } else {
        cliLog('ERROR: MIDI system not initialized', 'error');
      }

    } else if (cmd === 'midi' && cmdPath[1] === 'controller') {
      if (window.Vecterm?.MIDI) {
        window.Vecterm.MIDI.showVT100Inline();
      } else {
        cliLog('ERROR: MIDI system not initialized', 'error');
      }

    } else if (cmd === 'midi' && cmdPath[1] === 'map' && args.length >= 2) {
      if (window.Vecterm?.MIDI) {
        const controlId = args[0];
        const parameter = args[1];
        window.Vecterm.MIDI.map(controlId, parameter);
        cliLog(`Mapped ${controlId} → ${parameter}`, 'success');
      } else {
        cliLog('ERROR: MIDI system not initialized', 'error');
      }

    } else if (cmd === 'midi' && cmdPath[1] === 'unmap' && args.length >= 1) {
      if (window.Vecterm?.MIDI) {
        const controlId = args[0];
        window.Vecterm.MIDI.unmap(controlId);
        cliLog(`Unmapped ${controlId}`, 'success');
      } else {
        cliLog('ERROR: MIDI system not initialized', 'error');
      }

    } else if (cmd === 'midi' && cmdPath[1] === 'learn' && args.length >= 1) {
      if (window.Vecterm?.MIDI) {
        const parameter = args[0];
        window.Vecterm.MIDI.learn(parameter);
        cliLog(`MIDI Learn: Move a control to map it to ${parameter}`, 'success');
      } else {
        cliLog('ERROR: MIDI system not initialized', 'error');
      }

    } else if (cmd === 'midi' && cmdPath[1] === 'preset' && args.length >= 1) {
      if (window.Vecterm?.MIDI) {
        const presetName = args[0];
        window.Vecterm.MIDI.loadPreset(presetName);
        cliLog(`Loaded MIDI preset: ${presetName}`, 'success');
      } else {
        cliLog('ERROR: MIDI system not initialized', 'error');
      }

    } else if (cmd === 'midi' && cmdPath[1] === 'presets') {
      if (window.Vecterm?.MIDI) {
        const presets = window.Vecterm.MIDI.listPresets();
        if (presets.length === 0) {
          cliLog('No MIDI presets available', 'info');
        } else {
          cliLog('Available MIDI Presets:', 'success');
          presets.forEach(preset => {
            cliLog(`  ${preset.name} - ${preset.description || 'No description'}`, 'info');
          });
        }
      } else {
        cliLog('ERROR: MIDI system not initialized', 'error');
      }

    // ==========================================
    // VSCOPE COMMANDS
    // ==========================================

    } else if (cmd === 'vscope' && cmdPath[1] === 'status') {
      if (window.Vecterm?.VScope) {
        window.Vecterm.VScope.status();
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'enable') {
      if (window.Vecterm?.VScope) {
        window.Vecterm.VScope.enable();
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'disable') {
      if (window.Vecterm?.VScope) {
        window.Vecterm.VScope.disable();
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'camera' && cmdPath[2] === 'field') {
      if (window.Vecterm?.VScope) {
        window.Vecterm.VScope.camera.field();
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'camera' && cmdPath[2] === 'scope') {
      if (window.Vecterm?.VScope) {
        window.Vecterm.VScope.camera.scope();
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'camera' && cmdPath[2] === 'pan' && args.length >= 2) {
      if (window.Vecterm?.VScope) {
        const x = parseFloat(args[0]);
        const y = parseFloat(args[1]);
        window.Vecterm.VScope.camera.pan(x, y);
        cliLog(`Camera panned by (${x}, ${y})`, 'success');
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'camera' && cmdPath[2] === 'zoom' && args.length >= 1) {
      if (window.Vecterm?.VScope) {
        const factor = parseFloat(args[0]);
        window.Vecterm.VScope.camera.zoom(factor);
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'camera' && cmdPath[2] === 'projection' && args.length >= 1) {
      if (window.Vecterm?.VScope) {
        const mode = args[0];
        window.Vecterm.VScope.camera.projection(mode);
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'camera' && cmdPath[2] === 'reset') {
      if (window.Vecterm?.VScope) {
        window.Vecterm.VScope.camera.reset();
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'field' && cmdPath[2] === 'vector') {
      if (window.Vecterm?.VScope) {
        window.Vecterm.VScope.field.vector();
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'field' && cmdPath[2] === 'grid') {
      if (window.Vecterm?.VScope) {
        window.Vecterm.VScope.field.grid();
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'field' && cmdPath[2] === 'pixel') {
      if (window.Vecterm?.VScope) {
        window.Vecterm.VScope.field.pixel();
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'track' && cmdPath[2] === 'entity' && args.length >= 1) {
      if (window.Vecterm?.VScope) {
        const entityId = args[0];
        window.Vecterm.VScope.track.entity(entityId);
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'track' && cmdPath[2] === 'entities' && args.length >= 1) {
      if (window.Vecterm?.VScope) {
        const entityIds = args[0];
        window.Vecterm.VScope.track.entities(entityIds);
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'track' && cmdPath[2] === 'region' && args.length >= 4) {
      if (window.Vecterm?.VScope) {
        const x = parseFloat(args[0]);
        const y = parseFloat(args[1]);
        const width = parseFloat(args[2]);
        const height = parseFloat(args[3]);
        window.Vecterm.VScope.track.region(x, y, width, height);
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'track' && cmdPath[2] === 'reset') {
      if (window.Vecterm?.VScope) {
        window.Vecterm.VScope.track.reset();
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'quadrant' && args.length >= 1) {
      if (window.Vecterm?.VScope) {
        const quadrant = parseInt(args[0]);
        window.Vecterm.VScope.quadrant(quadrant);
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'vscope' && cmdPath[1] === 'updaterate' && args.length >= 1) {
      if (window.Vecterm?.VScope) {
        const fps = parseInt(args[0]);
        window.Vecterm.VScope.updaterate(fps);
      } else {
        cliLog('ERROR: VScope system not initialized', 'error');
      }

    } else if (cmd === 'console' && cmdPath[1] === 'vt100') {
      handleConsoleVT100Command(cmdPath[2], args);

    } else if (cmd === 'game' && cmdPath[1] === 'vt100') {
      handleGameVT100Command(cmdPath[2], args, store);

    } else if (cmd === 'login' && parts.length === 3) {
      // Login: login <username> <password>
      const username = parts[1];
      const password = parts[2];

      // Simple auth check (placeholder)
      if (password.length > 0) {
        store.dispatch(Actions.login(username));
        cliLog(`Authenticated as: ${username}`, 'success');
        cliLog('S3 access enabled.', 'success');
      } else {
        cliLog('Invalid credentials.', 'error');
      }

    } else if (cmd === 'logout') {
      // Logout
      const state = store.getState();
      if (state.auth.isLoggedIn) {
        store.dispatch(Actions.logout());
        cliLog('Logged out.', 'success');
      } else {
        cliLog('Not logged in.', 'error');
      }

    } else if (cmd === 'connect' || cmd === 'disconnect' ||
               cmd === 'lobby_create' || cmd === 'lobby_join' ||
               cmd === 'lobby_leave' || cmd === 'lobby_list' ||
               cmd === 'game_start' || cmd === 'mp_status') {
      // Multiplayer commands
      if (multiplayerCommands[cmd]) {
        multiplayerCommands[cmd](args, store);
      } else {
        cliLog(`Unknown multiplayer command: ${cmd}`, 'error');
      }

    } else if (trimmed === '') {
      // Empty command, do nothing
    } else {
      // Try to evaluate as JavaScript expression
      try {
        const result = eval(trimmed);
        if (result !== undefined) {
          if (typeof result === 'object') {
            cliLogJson(result);
          } else {
            cliLog(String(result), 'success');
          }
        }
      } catch (error) {
        cliLog(`Unknown command: ${trimmed}. Type 'help' for available commands.`, 'error');
      }
    }
  };
}

/**
 * Handle console VT100 commands
 */
function handleConsoleVT100Command(action, args) {
  const cliPanel = document.getElementById('cli-panel');

  if (!action || action === 'help') {
    cliLog('=== Console VT100 Commands ===', 'success');
    cliLog('  vt100.scanlines <intensity> - Scanline darkness (0-1, default: 0.15)');
    cliLog('  vt100.scanspeed <seconds> - Scanline scroll speed (default: 8)');
    cliLog('  vt100.wave <amplitude> - Raster wave pixels (default: 2)');
    cliLog('  vt100.wavespeed <seconds> - Wave oscillation speed (default: 3)');
    cliLog('  vt100.glow <intensity> - Border glow intensity (0-1, default: 0.4)');
    cliLog('  vt100.glowspeed <seconds> - Glow pulse speed (default: 2)');
    cliLog('  vt100.status - Show current console settings');
    cliLog('  vt100.reset - Reset console effects to defaults');
    cliLog('  vt100.test - Test if variables are updating');
  } else if (action === 'test') {
    cliLog('Testing VT100 variable updates...', 'success');
    const before = getComputedStyle(cliPanel).getPropertyValue('--vt100-scanline-intensity').trim();
    cliLog(`Before: scanline-intensity = ${before}`);
    cliPanel.style.setProperty('--vt100-scanline-intensity', '0.9');
    const after = getComputedStyle(cliPanel).getPropertyValue('--vt100-scanline-intensity').trim();
    cliLog(`After: scanline-intensity = ${after}`);
    cliLog(`Panel element: ${cliPanel ? 'Found' : 'NOT FOUND'}`);
    cliLog(`Panel classes: ${cliPanel.className}`);
    cliLog(`Panel visible: ${!cliPanel.classList.contains('hidden')}`);

    // Check if dynamic styles exist
    const styleEl = document.getElementById('vt100-dynamic-styles');
    cliLog(`Dynamic styles element: ${styleEl ? 'EXISTS' : 'NOT FOUND'}`);
    if (styleEl) {
      cliLog(`Style content length: ${styleEl.textContent.length}`);
    }

    // Check computed style of pseudo-element
    const beforeStyle = getComputedStyle(cliPanel, '::before');
    cliLog(`::before background: ${beforeStyle.background.substring(0, 50)}...`);

    // Reset
    setTimeout(() => {
      cliPanel.style.setProperty('--vt100-scanline-intensity', before);
      cliLog('Reset to original value');
    }, 2000);
  } else if (action === 'scanlines' && args.length === 1) {
    const intensity = parseFloat(args[0]);
    cliPanel.style.setProperty('--vt100-scanline-intensity', intensity);

    // Update pseudo-element with very obvious style
    let styleEl = document.getElementById('vt100-dynamic-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'vt100-dynamic-styles';
      document.head.appendChild(styleEl);
    }

    // Proper CRT scanlines - apply to panel including borders with matching border-radius
    const currentSpeed = getComputedStyle(cliPanel).getPropertyValue('--vt100-scanline-speed').trim();
    styleEl.textContent = `
      #cli-panel::before {
        content: '' !important;
        position: absolute !important;
        top: -1px !important;
        left: -1px !important;
        width: calc(100% + 2px) !important;
        height: calc(100% + 2px) !important;
        border-radius: 16px 16px 4px 4px !important;
        background: repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, ${intensity}) 0px,
          rgba(0, 0, 0, ${intensity}) 1px,
          transparent 1px,
          transparent 2px
        ) !important;
        pointer-events: none !important;
        z-index: 9999 !important;
        animation: vt100Scanlines ${currentSpeed} linear infinite !important;
      }
      .panel-header::before {
        content: '' !important;
        position: absolute !important;
        top: -1px !important;
        left: -1px !important;
        width: calc(100% + 2px) !important;
        height: calc(100% + 2px) !important;
        border-radius: 16px 16px 0 0 !important;
        background: repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, ${intensity}) 0px,
          rgba(0, 0, 0, ${intensity}) 1px,
          transparent 1px,
          transparent 2px
        ) !important;
        pointer-events: none !important;
        z-index: 9999 !important;
        animation: vt100Scanlines ${currentSpeed} linear infinite !important;
      }
    `;
    cliLog(`Console VT100 scanlines: ${intensity} (including borders)`, 'success');
  } else if (action === 'scanspeed' && args.length === 1) {
    const speed = parseFloat(args[0]);
    cliPanel.style.setProperty('--vt100-scanline-speed', `${speed}s`);
    cliPanel.offsetHeight;
    cliLog(`VT100 terminal scanline speed: ${speed}s (animation restarted)`, 'success');
  } else if (action === 'wave' && args.length === 1) {
    const amplitude = parseFloat(args[0]);
    cliPanel.style.setProperty('--vt100-wave-amplitude', `${amplitude}px`);
    cliPanel.offsetHeight;
    cliLog(`VT100 terminal raster wave: ${amplitude}px (refresh visible)`, 'success');
  } else if (action === 'wavespeed' && args.length === 1) {
    const speed = parseFloat(args[0]);
    cliPanel.style.setProperty('--vt100-wave-speed', `${speed}s`);
    cliPanel.offsetHeight;
    cliLog(`VT100 terminal wave speed: ${speed}s (animation restarted)`, 'success');
  } else if (action === 'glow' && args.length === 1) {
    const intensity = parseFloat(args[0]);
    cliPanel.style.setProperty('--vt100-glow-intensity', intensity);
    cliPanel.offsetHeight;
    cliLog(`VT100 terminal glow: ${intensity} (refresh visible)`, 'success');
  } else if (action === 'glowspeed' && args.length === 1) {
    const speed = parseFloat(args[0]);
    cliPanel.style.setProperty('--vt100-glow-speed', `${speed}s`);
    cliPanel.offsetHeight;
    cliLog(`VT100 terminal glow speed: ${speed}s (animation restarted)`, 'success');
  } else if (action === 'status') {
    const getVar = (name) => getComputedStyle(cliPanel).getPropertyValue(name).trim();
    cliLog('VT100 Terminal Configuration:', 'success');
    cliLog(`  Scanline Intensity: ${getVar('--vt100-scanline-intensity')}`);
    cliLog(`  Scanline Speed: ${getVar('--vt100-scanline-speed')}`);
    cliLog(`  Wave Amplitude: ${getVar('--vt100-wave-amplitude')}`);
    cliLog(`  Wave Speed: ${getVar('--vt100-wave-speed')}`);
    cliLog(`  Glow Intensity: ${getVar('--vt100-glow-intensity')}`);
    cliLog(`  Glow Speed: ${getVar('--vt100-glow-speed')}`);
  } else if (action === 'reset') {
    cliPanel.style.setProperty('--vt100-scanline-intensity', '0.15');
    cliPanel.style.setProperty('--vt100-scanline-speed', '8s');
    cliPanel.style.setProperty('--vt100-wave-amplitude', '2px');
    cliPanel.style.setProperty('--vt100-wave-speed', '3s');
    cliPanel.style.setProperty('--vt100-glow-intensity', '0.4');
    cliPanel.style.setProperty('--vt100-glow-speed', '2s');
    cliLog('Console VT100 effects reset to defaults', 'success');
  } else {
    cliLog('Unknown vt100 command. Try "vt100.help"', 'error');
  }
}

/**
 * Handle game VT100 commands
 */
function handleGameVT100Command(action, args, store) {
  const state = store.getState();
  const gameId = state.games.activeGame || state.games.previewGame;

  if (!gameId || !state.games.instances[gameId]) {
    cliLog('No game running. Use "play <game>" or "preview <game>" first.', 'error');
    return;
  }

  const game = state.games.instances[gameId].instance;

  if (!action || action === 'help') {
    cliLog('=== Game VT100 Commands ===', 'success');
    cliLog('  game.vt100.wave <freq> <amp> - Raster wave (freq: Hz, amp: pixels)');
    cliLog('  game.vt100.drift <amount> - Slow drift amount');
    cliLog('  game.vt100.jitter <amount> - Jitter amount');
    cliLog('  game.vt100.scanlines <intensity> - Scanline intensity (0-1)');
    cliLog('  game.vt100.bloom <pixels> - Phosphor bloom blur');
    cliLog('  game.vt100.brightness <value> - Brightness (0-2)');
    cliLog('  game.vt100.contrast <value> - Contrast (0-2)');
    cliLog('  game.vt100.toggle - Enable/disable raster wave');
    cliLog('  game.vt100.status - Show game settings');
  } else if (action === 'wave' && args.length === 2) {
    const freq = parseFloat(args[0]);
    const amp = parseFloat(args[1]);
    game.vt100Config('rasterWave.frequency', freq);
    game.vt100Config('rasterWave.amplitude', amp);
    cliLog(`VT100 canvas raster wave: ${freq}Hz, ${amp}px`, 'success');
  } else if (action === 'drift' && args.length === 1) {
    const drift = parseFloat(args[0]);
    game.vt100Config('rasterWave.drift', drift);
    cliLog(`VT100 canvas drift: ${drift}`, 'success');
  } else if (action === 'jitter' && args.length === 1) {
    const jitter = parseFloat(args[0]);
    game.vt100Config('rasterWave.jitter', jitter);
    cliLog(`VT100 canvas jitter: ${jitter}`, 'success');
  } else if (action === 'scanlines' && args.length === 1) {
    const intensity = parseFloat(args[0]);
    game.vt100Config('scanlineIntensity', intensity);
    cliLog(`VT100 canvas scanlines: ${intensity}`, 'success');
  } else if (action === 'bloom' && args.length === 1) {
    const bloom = parseFloat(args[0]);
    game.vt100Config('bloom', bloom);
    cliLog(`VT100 canvas bloom: ${bloom}px`, 'success');
  } else if (action === 'brightness' && args.length === 1) {
    const brightness = parseFloat(args[0]);
    game.vt100Config('brightness', brightness);
    cliLog(`VT100 canvas brightness: ${brightness}`, 'success');
  } else if (action === 'contrast' && args.length === 1) {
    const contrast = parseFloat(args[0]);
    game.vt100Config('contrast', contrast);
    cliLog(`VT100 canvas contrast: ${contrast}`, 'success');
  } else if (action === 'toggle') {
    const current = game.vt100Config('rasterWave.enabled');
    game.vt100Config('rasterWave.enabled', !current);
    cliLog(`VT100 canvas raster wave ${!current ? 'enabled' : 'disabled'}`, 'success');
  } else if (action === 'status') {
    const config = game.vt100Config();
    cliLog('VT100 Canvas Configuration:', 'success');
    cliLog(`  Raster Wave: ${config.rasterWave.enabled ? 'ON' : 'OFF'}`);
    cliLog(`  Frequency: ${config.rasterWave.frequency}Hz`);
    cliLog(`  Amplitude: ${config.rasterWave.amplitude}px`);
    cliLog(`  Drift: ${config.rasterWave.drift}`);
    cliLog(`  Jitter: ${config.rasterWave.jitter}`);
    cliLog(`  Scanlines: ${config.scanlineIntensity}`);
    cliLog(`  Bloom: ${config.bloom}px`);
    cliLog(`  Brightness: ${config.brightness}`);
    cliLog(`  Contrast: ${config.contrast}`);
  } else {
    cliLog('Unknown game.vt100 command. Try "game.vt100.help"', 'error');
  }
}

export { createCommandProcessor };
