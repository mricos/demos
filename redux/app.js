// ==========================================
// INSPECTOR VISUALIZATION (Define early)
// ==========================================

let currentDelay = 1000;
const actionHistory = [];

async function visualizeStep(stepId, action) {
  // Remove active class from all steps
  document.querySelectorAll('.flow-step').forEach(step => {
    step.classList.remove('active');
  });

  // Add active class to current step
  const step = document.getElementById(stepId);
  if (step) {
    step.classList.add('active');
  }

  // Wait for the configured delay
  if (action.type !== '@@INIT') {
    await new Promise(resolve => setTimeout(resolve, currentDelay / 4));
  }
}

function logAction(action) {
  if (action.type === '@@INIT') return;

  const entry = {
    type: action.type,
    payload: action.payload,
    timestamp: new Date().toLocaleTimeString()
  };

  actionHistory.unshift(entry);
  if (actionHistory.length > 20) actionHistory.pop();

  updateActionHistoryUI();
  updateHUD();
}

function updateActionHistoryUI() {
  const historyDiv = document.getElementById('action-history');
  if (!historyDiv) return;

  historyDiv.innerHTML = actionHistory.map((entry, index) => `
    <div class="action-entry ${index === 0 ? 'new' : ''}">
      <div class="action-type">${entry.type}</div>
      ${entry.payload !== undefined ? `<div class="action-payload">payload: ${JSON.stringify(entry.payload)}</div>` : ''}
      <div class="action-time">${entry.timestamp}</div>
    </div>
  `).join('');
}

function updateStateDisplay() {
  const state = store.getState();
  const display = document.getElementById('state-display');
  if (!display) return;

  display.textContent = JSON.stringify(state, null, 2);
}

function updateLayerList() {
  const state = store.getState();
  const layerList = document.getElementById('layer-list');
  if (!layerList) return;

  layerList.innerHTML = state.layers
    .sort((a, b) => b.zIndex - a.zIndex)
    .map(layer => `
      <div class="layer-item ${layer.id === state.activeLayerId ? 'active' : ''}">
        <span class="layer-name">${layer.name}</span>
        <span class="layer-status">${layer.visible ? '👁' : '🚫'}</span>
      </div>
    `).join('');
}

// ==========================================
// REDUX CORE - The Store
// ==========================================

function createStore(reducer) {
  let state;
  let listeners = [];

  const getState = () => state;

  const dispatch = async (action) => {
    // Visual feedback: Step 1 - Action Dispatched
    await visualizeStep('step-action', action);

    // Visual feedback: Step 2 - Reducer Processes
    await visualizeStep('step-reducer', action);
    state = reducer(state, action);

    // Visual feedback: Step 3 - Store Updated
    await visualizeStep('step-store', action);

    // Visual feedback: Step 4 - UI Re-renders
    await visualizeStep('step-render', action);
    listeners.forEach(listener => listener());

    // Log action to history
    logAction(action);

    return action;
  };

  const subscribe = (listener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  };

  // Initialize state
  dispatch({ type: '@@INIT' });

  return { getState, dispatch, subscribe };
}

// ==========================================
// ACTION TYPES
// ==========================================

// Legacy actions
const LOGIN = 'LOGIN';
const LOGOUT = 'LOGOUT';
const SET_PATH = 'SET_PATH';
const ADD_CANVAS_ITEM = 'ADD_CANVAS_ITEM';

// Entity actions
const ADD_ENTITY = 'ADD_ENTITY';
const UPDATE_ENTITY = 'UPDATE_ENTITY';
const DELETE_ENTITY = 'DELETE_ENTITY';
const SELECT_ENTITY = 'SELECT_ENTITY';

// Layer actions
const ADD_LAYER = 'ADD_LAYER';
const TOGGLE_LAYER_VISIBILITY = 'TOGGLE_LAYER_VISIBILITY';
const SET_ACTIVE_LAYER = 'SET_ACTIVE_LAYER';

// Tool actions
const SET_TOOL = 'SET_TOOL';

// Grid actions
const TOGGLE_GRID = 'TOGGLE_GRID';
const SET_GRID_SIZE = 'SET_GRID_SIZE';

// ==========================================
// ACTION CREATORS
// ==========================================

// Legacy
const login = (username) => ({ type: LOGIN, payload: username });
const logout = () => ({ type: LOGOUT });
const setPath = (path) => ({ type: SET_PATH, payload: path });
const addCanvasItem = (text) => ({ type: ADD_CANVAS_ITEM, payload: text });

// Entities
const addEntity = (entity) => ({ type: ADD_ENTITY, payload: entity });
const updateEntity = (id, updates) => ({ type: UPDATE_ENTITY, payload: { id, updates } });
const deleteEntity = (id) => ({ type: DELETE_ENTITY, payload: id });
const selectEntity = (id) => ({ type: SELECT_ENTITY, payload: id });

// Layers
const addLayer = (name) => ({ type: ADD_LAYER, payload: name });
const toggleLayerVisibility = (id) => ({ type: TOGGLE_LAYER_VISIBILITY, payload: id });
const setActiveLayer = (id) => ({ type: SET_ACTIVE_LAYER, payload: id });

// Tools
const setTool = (tool) => ({ type: SET_TOOL, payload: tool });

// Grid
const toggleGrid = () => ({ type: TOGGLE_GRID });
const setGridSize = (size) => ({ type: SET_GRID_SIZE, payload: size });

// ==========================================
// REDUCERS
// ==========================================

const initialState = {
  // Legacy state
  auth: {
    isLoggedIn: false,
    username: null
  },
  path: '/home/demo.md',
  canvasItems: [],

  // Scene editor state
  entities: [],
  layers: [
    { id: 'layer-0', name: 'Background', visible: true, locked: false, zIndex: 0 },
    { id: 'layer-1', name: 'Entities', visible: true, locked: false, zIndex: 1 },
    { id: 'layer-2', name: 'UI', visible: true, locked: false, zIndex: 2 }
  ],
  activeLayerId: 'layer-1',
  selectedEntityIds: [],
  activeTool: 'select',
  grid: {
    enabled: true,
    size: 32,
    snapToGrid: true
  },
  camera: {
    x: 0,
    y: 0,
    zoom: 1
  }
};

let nextEntityId = 1;
let nextLayerId = 3;

function rootReducer(state = initialState, action) {
  switch (action.type) {
    // Legacy actions
    case LOGIN:
      return {
        ...state,
        auth: {
          isLoggedIn: true,
          username: action.payload
        }
      };

    case LOGOUT:
      return {
        ...state,
        auth: {
          isLoggedIn: false,
          username: null
        }
      };

    case SET_PATH:
      return {
        ...state,
        path: action.payload
      };

    case ADD_CANVAS_ITEM:
      return {
        ...state,
        canvasItems: [...state.canvasItems, action.payload]
      };

    // Entity actions
    case ADD_ENTITY:
      return {
        ...state,
        entities: [...state.entities, {
          id: `entity-${nextEntityId++}`,
          layerId: state.activeLayerId,
          ...action.payload
        }]
      };

    case UPDATE_ENTITY:
      return {
        ...state,
        entities: state.entities.map(e =>
          e.id === action.payload.id
            ? { ...e, ...action.payload.updates }
            : e
        )
      };

    case DELETE_ENTITY:
      return {
        ...state,
        entities: state.entities.filter(e => e.id !== action.payload),
        selectedEntityIds: state.selectedEntityIds.filter(id => id !== action.payload)
      };

    case SELECT_ENTITY:
      return {
        ...state,
        selectedEntityIds: action.payload ? [action.payload] : []
      };

    // Layer actions
    case ADD_LAYER:
      return {
        ...state,
        layers: [...state.layers, {
          id: `layer-${nextLayerId++}`,
          name: action.payload,
          visible: true,
          locked: false,
          zIndex: state.layers.length
        }]
      };

    case TOGGLE_LAYER_VISIBILITY:
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id === action.payload
            ? { ...l, visible: !l.visible }
            : l
        )
      };

    case SET_ACTIVE_LAYER:
      return {
        ...state,
        activeLayerId: action.payload
      };

    // Tool actions
    case SET_TOOL:
      return {
        ...state,
        activeTool: action.payload
      };

    // Grid actions
    case TOGGLE_GRID:
      return {
        ...state,
        grid: { ...state.grid, enabled: !state.grid.enabled }
      };

    case SET_GRID_SIZE:
      return {
        ...state,
        grid: { ...state.grid, size: action.payload }
      };

    default:
      return state;
  }
}

// ==========================================
// CREATE STORE
// ==========================================

const store = createStore(rootReducer);

// ==========================================
// UI RENDERING
// ==========================================

// ==========================================
// CANVAS ENTITY RENDERER
// ==========================================

function drawGrid(ctx, canvas, gridSize) {
  ctx.strokeStyle = 'rgba(79, 195, 247, 0.1)';
  ctx.lineWidth = 1;

  // Vertical lines
  for (let x = 0; x <= canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = 0; y <= canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Origin marker
  ctx.fillStyle = '#4fc3f7';
  ctx.fillRect(0, 0, 4, 4);
}

function drawEntity(ctx, entity, isSelected) {
  const { x, y, width = 64, height = 64, color = '#4fc3f7', type = 'rect', label } = entity;

  // Draw entity shape
  ctx.fillStyle = color;
  ctx.strokeStyle = isSelected ? '#00ff88' : '#4fc3f7';
  ctx.lineWidth = isSelected ? 3 : 1;

  if (type === 'rect') {
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
  } else if (type === 'circle') {
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Draw entity label
  if (label) {
    ctx.font = '12px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + width / 2, y + height / 2);
  }

  // Draw ID for selected entities
  if (isSelected) {
    ctx.font = '10px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.textAlign = 'left';
    ctx.fillText(entity.id, x, y - 5);
  }
}

function render() {
  const state = store.getState();

  // Render auth status (HTML DOM element)
  const authManager = document.getElementById('auth-manager');
  if (state.auth.isLoggedIn) {
    authManager.textContent = `Logged in as ${state.auth.username}`;
  } else {
    authManager.textContent = 'Not logged in';
  }

  // Render path (HTML DOM element)
  document.getElementById('path-manager').textContent = state.path;

  // ==========================================
  // CANVAS SCENE RENDERING
  // ==========================================

  const canvas = document.getElementById('main-canvas');
  const ctx = canvas.getContext('2d');

  // Clear canvas
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw grid if enabled
  if (state.grid.enabled) {
    drawGrid(ctx, canvas, state.grid.size);
  }

  // Draw entities by layer
  const sortedLayers = [...state.layers].sort((a, b) => a.zIndex - b.zIndex);

  sortedLayers.forEach(layer => {
    if (!layer.visible) return;

    const layerEntities = state.entities.filter(e => e.layerId === layer.id);

    layerEntities.forEach(entity => {
      const isSelected = state.selectedEntityIds.includes(entity.id);
      drawEntity(ctx, entity, isSelected);
    });
  });

  // Draw active tool indicator
  ctx.font = '14px monospace';
  ctx.fillStyle = '#4fc3f7';
  ctx.textAlign = 'left';
  ctx.fillText(`Tool: ${state.activeTool.toUpperCase()}`, 20, 30);
  ctx.fillText(`Layer: ${state.layers.find(l => l.id === state.activeLayerId)?.name || 'N/A'}`, 20, 50);
  ctx.fillText(`Entities: ${state.entities.length}`, 20, 70);

  // Update inspector state display (HTML)
  updateStateDisplay();
  updateLayerList();
}

// Subscribe to state changes
store.subscribe(render);

// ==========================================
// CONTROLS & EVENT HANDLERS
// ==========================================

function getQueryParams() {
  const params = {};
  window.location.search
    .slice(1)
    .split('&')
    .forEach(part => {
      if (!part) return;
      const [key, val] = part.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(val || '');
    });
  return params;
}

// Delay slider control
const delaySlider = document.getElementById('delay');
const delayValue = document.getElementById('delay-value');

delaySlider.addEventListener('input', (e) => {
  currentDelay = parseInt(e.target.value);
  delayValue.textContent = `${currentDelay}ms`;
});

// Toggle auth button
document.getElementById('toggle-auth').addEventListener('click', () => {
  const state = store.getState();
  if (state.auth.isLoggedIn) {
    store.dispatch(logout());
  } else {
    store.dispatch(login('demo-user'));
  }
});

// FAB: Toggle CLI
document.getElementById('cli-fab').addEventListener('click', () => {
  const panel = document.getElementById('cli-panel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    document.getElementById('cli-input').focus();
  }
});

// FAB: Toggle Inspector
document.getElementById('inspector-fab').addEventListener('click', () => {
  const panel = document.getElementById('inspector');
  panel.classList.toggle('hidden');
});

// Close buttons
document.getElementById('cli-close').addEventListener('click', () => {
  document.getElementById('cli-panel').classList.add('hidden');
});

document.getElementById('inspector-close').addEventListener('click', () => {
  document.getElementById('inspector').classList.add('hidden');
});

// ==========================================
// CLI TERMINAL
// ==========================================

let actionCount = 0;

function cliLog(message, type = '') {
  const output = document.getElementById('cli-output');
  const line = document.createElement('div');
  line.className = `cli-line ${type}`;
  line.textContent = message;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function updateHUD() {
  actionCount++;
  document.getElementById('action-counter').textContent = actionCount;

  const state = store.getState();
  const stateSize = (JSON.stringify(state).length / 1024).toFixed(2);
  document.getElementById('state-size').textContent = `${stateSize}KB`;
}

function processCLICommand(command) {
  const trimmed = command.trim();
  const parts = trimmed.split(' ');
  const cmd = parts[0].toLowerCase();

  cliLog(`redux> ${command}`);

  if (cmd === 'help') {
    cliLog('=== Entity Commands ===', 'success');
    cliLog('  spawn <type> <x> <y> [color] - Create entity (rect/circle)');
    cliLog('  select <id> - Select entity');
    cliLog('  move <id> <x> <y> - Move entity');
    cliLog('  delete <id> - Delete entity');
    cliLog('  list entities - Show all entities');
    cliLog('=== Layer Commands ===', 'success');
    cliLog('  layer add <name> - Create layer');
    cliLog('  layer show <id> - Show layer');
    cliLog('  layer hide <id> - Hide layer');
    cliLog('  layer active <id> - Set active layer');
    cliLog('  list layers - Show all layers');
    cliLog('=== Tool Commands ===', 'success');
    cliLog('  tool <name> - Switch tool (select/add/paint/erase)');
    cliLog('  grid on/off - Toggle grid');
    cliLog('  grid size <n> - Set grid size');
    cliLog('=== General ===', 'success');
    cliLog('  state - Show current state');
    cliLog('  clear - Clear output');

  } else if (cmd === 'clear') {
    document.getElementById('cli-output').innerHTML = '';
    cliLog('CLI cleared', 'success');

  } else if (cmd === 'state') {
    cliLog(JSON.stringify(store.getState(), null, 2), 'success');

  } else if (cmd === 'spawn' && parts.length >= 4) {
    const type = parts[1];
    const x = parseInt(parts[2]);
    const y = parseInt(parts[3]);
    const color = parts[4] || '#4fc3f7';

    store.dispatch(addEntity({
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
    store.dispatch(selectEntity(parts[1]));
    cliLog(`Selected entity: ${parts[1]}`, 'success');

  } else if (cmd === 'move' && parts.length === 4) {
    const id = parts[1];
    const x = parseInt(parts[2]);
    const y = parseInt(parts[3]);
    store.dispatch(updateEntity(id, { x, y }));
    cliLog(`Moved ${id} to (${x}, ${y})`, 'success');

  } else if (cmd === 'delete' && parts.length === 2) {
    store.dispatch(deleteEntity(parts[1]));
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

    if (subcmd === 'add' && parts[2]) {
      store.dispatch(addLayer(parts.slice(2).join(' ')));
      cliLog(`Created layer: ${parts.slice(2).join(' ')}`, 'success');
    } else if (subcmd === 'show' && parts[2]) {
      const layer = store.getState().layers.find(l => l.id === parts[2]);
      if (layer && !layer.visible) {
        store.dispatch(toggleLayerVisibility(parts[2]));
        cliLog(`Showed layer: ${parts[2]}`, 'success');
      }
    } else if (subcmd === 'hide' && parts[2]) {
      const layer = store.getState().layers.find(l => l.id === parts[2]);
      if (layer && layer.visible) {
        store.dispatch(toggleLayerVisibility(parts[2]));
        cliLog(`Hid layer: ${parts[2]}`, 'success');
      }
    } else if (subcmd === 'active' && parts[2]) {
      store.dispatch(setActiveLayer(parts[2]));
      cliLog(`Set active layer: ${parts[2]}`, 'success');
    }

  } else if (trimmed.toLowerCase() === 'list layers') {
    const layers = store.getState().layers;
    layers.forEach(l => {
      cliLog(`${l.id}: ${l.name} (${l.visible ? 'visible' : 'hidden'})`, 'success');
    });

  } else if (cmd === 'tool' && parts.length === 2) {
    store.dispatch(setTool(parts[1]));
    cliLog(`Switched to ${parts[1]} tool`, 'success');

  } else if (cmd === 'grid' && parts.length === 2) {
    if (parts[1] === 'on' || parts[1] === 'off') {
      const state = store.getState();
      if ((parts[1] === 'on' && !state.grid.enabled) || (parts[1] === 'off' && state.grid.enabled)) {
        store.dispatch(toggleGrid());
        cliLog(`Grid ${parts[1]}`, 'success');
      }
    } else if (parts[1] === 'size' && parts[2]) {
      store.dispatch(setGridSize(parseInt(parts[2])));
      cliLog(`Grid size set to ${parts[2]}`, 'success');
    }

  } else if (trimmed === '') {
    // Empty command, do nothing
  } else {
    cliLog(`Unknown command: ${trimmed}. Type 'help' for available commands.`, 'error');
  }
}

document.getElementById('cli-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const command = e.target.value;
    processCLICommand(command);
    e.target.value = '';
  }
});

// Initialize CLI
cliLog('Redux CLI Terminal v1.0');
cliLog('Type "help" for available commands');
cliLog('---');

// ==========================================
// FOOTER UPTIME COUNTER
// ==========================================

const startTime = Date.now();

function updateUptime() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');

  const uptimeEl = document.getElementById('uptime');
  if (uptimeEl) {
    uptimeEl.textContent = `${hours}:${minutes}:${seconds}`;
  }
}

setInterval(updateUptime, 1000);
updateUptime();

// ==========================================
// INITIALIZATION
// ==========================================

// Check query params and dispatch login
const params = getQueryParams();
if (params.name === 'mike' && params.pass === '1234') {
  store.dispatch(login('mike'));
}

// Set initial path
store.dispatch(setPath('/projects/redux-demo.md'));

// Initial render
render();

// Add introductory canvas items with delay
setTimeout(() => store.dispatch(addCanvasItem('Welcome to Redux!')), 2000);
setTimeout(() => store.dispatch(addCanvasItem('Click buttons to dispatch actions')), 4000);
setTimeout(() => store.dispatch(addCanvasItem('Watch the flow diagram animate')), 6000);

