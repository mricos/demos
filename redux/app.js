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

  // Colorized JSON syntax highlighting
  const json = JSON.stringify(state, null, 2);
  const colorized = json
    .replace(/(".*?"):/g, '<span class="json-key">$1</span>:')
    .replace(/: (".*?")/g, ': <span class="json-string">$1</span>')
    .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/: (null)/g, ': <span class="json-null">$1</span>')
    .replace(/: (-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>');

  display.innerHTML = colorized;
}

// ==========================================
// REDUX MIDDLEWARE - LocalStorage Sync
// ==========================================

const localStorageMiddleware = (store) => (next) => async (action) => {
  // Call the next dispatch (the reducer)
  const result = await next(action);

  // After state update, save to localStorage (skip init actions)
  if (action.type !== '@@INIT' && action.type !== '@@LOAD_STATE') {
    try {
      const state = store.getState();
      // Save UI state and config
      const uiState = {
        sidebarCollapsed: state.uiState?.sidebarCollapsed || false,
        sectionsCollapsed: state.uiState?.sectionsCollapsed || {},
        subsectionsCollapsed: state.uiState?.subsectionsCollapsed || {}
      };
      localStorage.setItem('redux-demo-ui-state', JSON.stringify(uiState));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  return result;
};

// ==========================================
// REDUX CORE - The Store
// ==========================================

function createStore(reducer, enhancer) {
  if (enhancer) {
    return enhancer(createStore)(reducer);
  }

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

// Middleware enhancer
function applyMiddleware(...middlewares) {
  return (createStore) => (reducer) => {
    const store = createStore(reducer);
    let dispatch = store.dispatch;

    const middlewareAPI = {
      getState: store.getState,
      dispatch: (action) => dispatch(action)
    };

    const chain = middlewares.map(middleware => middleware(middlewareAPI));
    dispatch = chain.reduceRight((next, middleware) => middleware(next), store.dispatch);

    return { ...store, dispatch };
  };
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

// UI State actions
const TOGGLE_SIDEBAR = 'TOGGLE_SIDEBAR';
const TOGGLE_SECTION = 'TOGGLE_SECTION';
const TOGGLE_SUBSECTION = 'TOGGLE_SUBSECTION';
const LOAD_STATE = '@@LOAD_STATE';
const SAVE_CONFIG = 'SAVE_CONFIG';
const LOAD_CONFIG = 'LOAD_CONFIG';

// Game Management actions
const LOAD_GAME = 'LOAD_GAME';
const UNLOAD_GAME = 'UNLOAD_GAME';
const SET_PREVIEW_GAME = 'SET_PREVIEW_GAME';
const SET_ACTIVE_GAME = 'SET_ACTIVE_GAME';
const UPDATE_GAME_INSTANCE = 'UPDATE_GAME_INSTANCE';

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

// UI State
const toggleSidebar = () => ({ type: TOGGLE_SIDEBAR });
const toggleSection = (section) => ({ type: TOGGLE_SECTION, payload: section });
const toggleSubsection = (subsection) => ({ type: TOGGLE_SUBSECTION, payload: subsection });
const loadState = (state) => ({ type: LOAD_STATE, payload: state });
const saveConfig = () => ({ type: SAVE_CONFIG });
const loadConfig = () => ({ type: LOAD_CONFIG });

// Game Management
const loadGame = (gameId, namespace) => ({ type: LOAD_GAME, payload: { gameId, namespace } });
const unloadGame = (gameId) => ({ type: UNLOAD_GAME, payload: gameId });
const setPreviewGame = (gameId) => ({ type: SET_PREVIEW_GAME, payload: gameId });
const setActiveGame = (gameId) => ({ type: SET_ACTIVE_GAME, payload: gameId });
const updateGameInstance = (gameId, instance) => ({ type: UPDATE_GAME_INSTANCE, payload: { gameId, instance } });

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

  // Scene editor state (demo namespace)
  entities: [],

  // Game Management
  games: {
    registry: {
      quadrapong: {
        id: 'quadrapong',
        name: 'Quadrapong',
        description: '4-player pong with ECS architecture and VT100 effects',
        version: '1.0.0',
        loaded: false
      }
    },
    activeGame: null,      // Currently loaded game ID
    previewGame: null,     // Game being previewed
    instances: {}          // Loaded game instances by ID
  },

  // Namespace-aware entities
  namespaces: {
    demo: {
      entities: [],
      layers: [
        { id: 'layer-0', name: 'Background', visible: true, locked: false, zIndex: 0 },
        { id: 'layer-1', name: 'Entities', visible: true, locked: false, zIndex: 1 },
        { id: 'layer-2', name: 'UI', visible: true, locked: false, zIndex: 2 }
      ],
      activeLayerId: 'layer-1'
    }
  },

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
  },

  // UI State
  uiState: {
    sidebarCollapsed: false,
    sectionsCollapsed: {},
    subsectionsCollapsed: {}
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

    // Layer actions (operate on demo namespace)
    case ADD_LAYER:
      const demoNs = state.namespaces.demo || { entities: [], layers: [], activeLayerId: null };
      return {
        ...state,
        namespaces: {
          ...state.namespaces,
          demo: {
            ...demoNs,
            layers: [...demoNs.layers, {
              id: `layer-${nextLayerId++}`,
              name: action.payload,
              visible: true,
              locked: false,
              zIndex: demoNs.layers.length
            }]
          }
        }
      };

    case TOGGLE_LAYER_VISIBILITY:
      const demoNsToggle = state.namespaces.demo || { entities: [], layers: [], activeLayerId: null };
      return {
        ...state,
        namespaces: {
          ...state.namespaces,
          demo: {
            ...demoNsToggle,
            layers: demoNsToggle.layers.map(l =>
              l.id === action.payload
                ? { ...l, visible: !l.visible }
                : l
            )
          }
        }
      };

    case SET_ACTIVE_LAYER:
      const demoNsActive = state.namespaces.demo || { entities: [], layers: [], activeLayerId: null };
      return {
        ...state,
        namespaces: {
          ...state.namespaces,
          demo: {
            ...demoNsActive,
            activeLayerId: action.payload
          }
        }
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

    // UI State actions
    case TOGGLE_SIDEBAR:
      return {
        ...state,
        uiState: {
          ...state.uiState,
          sidebarCollapsed: !state.uiState.sidebarCollapsed
        }
      };

    case TOGGLE_SECTION:
      return {
        ...state,
        uiState: {
          ...state.uiState,
          sectionsCollapsed: {
            ...state.uiState.sectionsCollapsed,
            [action.payload]: !state.uiState.sectionsCollapsed[action.payload]
          }
        }
      };

    case TOGGLE_SUBSECTION:
      return {
        ...state,
        uiState: {
          ...state.uiState,
          subsectionsCollapsed: {
            ...state.uiState.subsectionsCollapsed,
            [action.payload]: !state.uiState.subsectionsCollapsed[action.payload]
          }
        }
      };

    case LOAD_STATE:
      return {
        ...state,
        uiState: {
          ...state.uiState,
          ...action.payload
        }
      };

    case SAVE_CONFIG:
      // Save entire state to localStorage
      try {
        localStorage.setItem('redux-demo-full-state', JSON.stringify(state));
      } catch (e) {
        console.error('Failed to save config:', e);
      }
      return state;

    case LOAD_CONFIG:
      // Load full state from localStorage
      try {
        const savedState = localStorage.getItem('redux-demo-full-state');
        if (savedState) {
          return { ...state, ...JSON.parse(savedState) };
        }
      } catch (e) {
        console.error('Failed to load config:', e);
      }
      return state;

    // Game Management actions
    case LOAD_GAME:
      const { gameId, namespace } = action.payload;
      return {
        ...state,
        games: {
          ...state.games,
          registry: {
            ...state.games.registry,
            [gameId]: {
              ...state.games.registry[gameId],
              loaded: true
            }
          }
        },
        namespaces: {
          ...state.namespaces,
          [namespace || gameId]: {
            entities: [],
            layers: [],
            activeLayerId: null
          }
        }
      };

    case UNLOAD_GAME:
      const unloadGameId = action.payload;
      const newNamespaces = { ...state.namespaces };
      delete newNamespaces[unloadGameId];
      return {
        ...state,
        games: {
          ...state.games,
          registry: {
            ...state.games.registry,
            [unloadGameId]: {
              ...state.games.registry[unloadGameId],
              loaded: false
            }
          },
          instances: {
            ...state.games.instances,
            [unloadGameId]: undefined
          },
          activeGame: state.games.activeGame === unloadGameId ? null : state.games.activeGame,
          previewGame: state.games.previewGame === unloadGameId ? null : state.games.previewGame
        },
        namespaces: newNamespaces
      };

    case SET_PREVIEW_GAME:
      return {
        ...state,
        games: {
          ...state.games,
          previewGame: action.payload
        }
      };

    case SET_ACTIVE_GAME:
      return {
        ...state,
        games: {
          ...state.games,
          activeGame: action.payload
        }
      };

    case UPDATE_GAME_INSTANCE:
      return {
        ...state,
        games: {
          ...state.games,
          instances: {
            ...state.games.instances,
            [action.payload.gameId]: action.payload.instance
          }
        }
      };

    default:
      return state;
  }
}

// ==========================================
// CREATE STORE WITH MIDDLEWARE
// ==========================================

const store = createStore(rootReducer, applyMiddleware(localStorageMiddleware));

// Load saved UI state (will be applied after DOM is ready)
let savedUIState = null;
try {
  const savedData = localStorage.getItem('redux-demo-ui-state');
  if (savedData) {
    savedUIState = JSON.parse(savedData);
    store.dispatch(loadState(savedUIState));
  }
} catch (e) {
  console.error('Failed to load UI state:', e);
}

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

  // Render path (HTML DOM element)
  const pathManager = document.getElementById('path-manager');
  if (pathManager && state.path) {
    pathManager.textContent = state.path;
  }

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

  // Get current namespace (demo by default)
  const namespace = state.namespaces.demo || { entities: [], layers: [] };
  const layers = namespace.layers || [];
  const entities = state.entities || namespace.entities || [];

  // Draw entities by layer
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  sortedLayers.forEach(layer => {
    if (!layer.visible) return;

    const layerEntities = entities.filter(e => e.layerId === layer.id);

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
  const activeLayer = layers.find(l => l.id === namespace.activeLayerId);
  ctx.fillText(`Layer: ${activeLayer?.name || 'N/A'}`, 20, 50);
  ctx.fillText(`Entities: ${entities.length}`, 20, 70);

  // Update inspector state display (HTML)
  updateStateDisplay();
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

// Sidebar collapse toggle
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  const sidebar = document.getElementById('right-sidebar');
  sidebar.classList.toggle('collapsed');
});

// Section collapse toggles
document.querySelectorAll('.section-title').forEach(title => {
  title.addEventListener('click', () => {
    const section = title.dataset.section;
    const content = document.getElementById(`${section}-content`);
    content.classList.toggle('collapsed');

    // Dispatch to Redux to save state
    store.dispatch(toggleSection(section));
  });
});

// Restore section collapsed states from localStorage
if (savedUIState && savedUIState.sectionsCollapsed) {
  Object.keys(savedUIState.sectionsCollapsed).forEach(section => {
    if (savedUIState.sectionsCollapsed[section]) {
      const content = document.getElementById(`${section}-content`);
      if (content) {
        content.classList.add('collapsed');
      }
    }
  });
}

// Theme subsection collapse toggle
document.querySelectorAll('.token-title.collapsible').forEach(title => {
  title.addEventListener('click', () => {
    const subsection = title.dataset.subsection;
    const content = document.getElementById(`subsection-${subsection}`);
    content.classList.toggle('collapsed');
    title.classList.toggle('collapsed');

    // Update arrow indicator
    if (title.classList.contains('collapsed')) {
      title.textContent = title.textContent.replace('▼', '▶');
    } else {
      title.textContent = title.textContent.replace('▶', '▼');
    }

    // Dispatch to Redux to save state
    store.dispatch(toggleSubsection(subsection));
  });
});

// Restore subsection collapsed states from localStorage
if (savedUIState && savedUIState.subsectionsCollapsed) {
  Object.keys(savedUIState.subsectionsCollapsed).forEach(subsection => {
    if (savedUIState.subsectionsCollapsed[subsection]) {
      const content = document.getElementById(`subsection-${subsection}`);
      const title = document.querySelector(`[data-subsection="${subsection}"]`);
      if (content) {
        content.classList.add('collapsed');
      }
      if (title) {
        title.classList.add('collapsed');
        title.textContent = title.textContent.replace('▼', '▶');
      }
    }
  });
}

// Config buttons
document.getElementById('save-config').addEventListener('click', () => {
  store.dispatch(saveConfig());
  cliLog('Configuration saved to localStorage', 'success');
});

document.getElementById('load-config').addEventListener('click', () => {
  store.dispatch(loadConfig());
  cliLog('Configuration loaded from localStorage', 'success');
});

document.getElementById('clear-config').addEventListener('click', () => {
  localStorage.removeItem('redux-demo-full-state');
  localStorage.removeItem('redux-demo-ui-state');
  cliLog('Configuration cleared from localStorage', 'success');
  location.reload();
});

// FAB: Toggle CLI
document.getElementById('cli-fab').addEventListener('click', () => {
  const panel = document.getElementById('cli-panel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    panel.classList.remove('minimized');
    document.getElementById('cli-input').focus();
  }
});

// Minimize button
document.getElementById('cli-minimize').addEventListener('click', () => {
  const panel = document.getElementById('cli-panel');
  panel.classList.toggle('minimized');
  document.getElementById('cli-input').focus();
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
  const cmdPath = parts[0].toLowerCase().split('.');
  const cmd = cmdPath[0];
  const args = parts.slice(1);

  cliLog(`redux> ${command}`);

  if (cmd === 'help') {
    cliLog('=== Game Commands ===', 'success');
    cliLog('  games - List available games');
    cliLog('  load <game> - Load game into Redux');
    cliLog('  preview <game> - Preview game in upper right');
    cliLog('  play <game> [2d|3d] - Play loaded game (default: 2d)');
    cliLog('  play3d <game> - Play game in 3D mode');
    cliLog('  stop - Stop active game');
    cliLog('=== Vecterm Commands ===', 'success');
    cliLog('  vecterm.demo - Start spinning cube demo in CLI');
    cliLog('  vecterm.stop - Stop vecterm demo');
    cliLog('  vecterm.camera.orbit <azimuth> <elevation> - Orbit camera');
    cliLog('  vecterm.camera.zoom <delta> - Zoom camera');
    cliLog('=== Entity Commands ===', 'success');
    cliLog('  spawn <type> <x> <y> [color] - Create entity (rect/circle)');
    cliLog('  select <id> - Select entity');
    cliLog('  move <id> <x> <y> - Move entity');
    cliLog('  delete <id> - Delete entity');
    cliLog('  list entities - Show all entities');
    cliLog('=== Tool Commands ===', 'success');
    cliLog('  tool <name> - Switch tool (select/add/paint/erase)');
    cliLog('  grid on/off - Toggle grid');
    cliLog('  grid size <n> - Set grid size');
    cliLog('=== Console VT100 ===', 'success');
    cliLog('  console.vt100.help - Show console VT100 commands');
    cliLog('  console.vt100.status - Show console CRT settings');
    cliLog('=== Game VT100 ===', 'success');
    cliLog('  game.vt100.help - Show game VT100 commands (requires game loaded)');
    cliLog('  game.vt100.status - Show game CRT settings (requires game loaded)');
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

    const state = store.getState();
    const namespace = state.namespaces.demo || { layers: [] };

    if (subcmd === 'add' && parts[2]) {
      store.dispatch(addLayer(parts.slice(2).join(' ')));
      cliLog(`Created layer: ${parts.slice(2).join(' ')}`, 'success');
    } else if (subcmd === 'show' && parts[2]) {
      const layer = namespace.layers.find(l => l.id === parts[2]);
      if (layer && !layer.visible) {
        store.dispatch(toggleLayerVisibility(parts[2]));
        cliLog(`Showed layer: ${parts[2]}`, 'success');
      }
    } else if (subcmd === 'hide' && parts[2]) {
      const layer = namespace.layers.find(l => l.id === parts[2]);
      if (layer && layer.visible) {
        store.dispatch(toggleLayerVisibility(parts[2]));
        cliLog(`Hid layer: ${parts[2]}`, 'success');
      }
    } else if (subcmd === 'active' && parts[2]) {
      store.dispatch(setActiveLayer(parts[2]));
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

  } else if (cmd === 'load' && parts.length === 2) {
    const gameId = parts[1];
    const state = store.getState();

    if (!state.games.registry[gameId]) {
      cliLog(`Error: Game '${gameId}' not found. Type 'games' to list available games.`, 'error');
      return;
    }

    if (state.games.registry[gameId].loaded) {
      cliLog(`Game '${gameId}' is already loaded.`, 'error');
      return;
    }

    store.dispatch(loadGame(gameId, gameId));
    cliLog(`Loaded game: ${state.games.registry[gameId].name}`, 'success');
    cliLog(`Use 'preview ${gameId}' or 'play ${gameId}' to run the game.`, 'success');

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

    store.dispatch(setPreviewGame(gameId));
    cliLog(`Previewing ${state.games.registry[gameId].name} as ASCII in terminal...`, 'success');
    startGamePreview(gameId);

  } else if (cmd === 'play' && parts.length >= 2) {
    const gameId = parts[1];
    const mode = parts[2] || '2d';  // Default to 2d
    const state = store.getState();

    if (!state.games.registry[gameId]) {
      cliLog(`Error: Game '${gameId}' not found.`, 'error');
      return;
    }

    if (!state.games.registry[gameId].loaded) {
      cliLog(`Error: Game '${gameId}' not loaded. Use 'load ${gameId}' first.`, 'error');
      return;
    }

    store.dispatch(setActiveGame(gameId));
    startGamePlay(gameId, mode);
    cliLog(`Playing ${state.games.registry[gameId].name} in ${mode.toUpperCase()} mode...`, 'success');

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

    store.dispatch(setActiveGame(gameId));
    startGamePlay(gameId, '3d');
    cliLog(`Playing ${state.games.registry[gameId].name} in 3D VECTERM mode...`, 'success');

  } else if (cmd === 'stop') {
    const state = store.getState();
    if (state.games.activeGame) {
      stopGame(state.games.activeGame);
      store.dispatch(setActiveGame(null));
      cliLog('Game stopped.', 'success');
    } else if (state.games.previewGame) {
      stopGame(state.games.previewGame);
      store.dispatch(setPreviewGame(null));
      cliLog('Preview stopped.', 'success');
    } else {
      cliLog('No game running.', 'error');
    }

  } else if (cmd === 'demo') {
    cliLog('The "demo" command is deprecated. Use "load quadrapong" then "play quadrapong"', 'error');

  } else if (cmd === 'vecterm' && cmdPath[1] === 'demo') {
    stopVectermDemo();
    startVectermDemo();
    cliLog('Vecterm demo started - spinning cube in CLI viewport', 'success');

  } else if (cmd === 'vecterm' && cmdPath[1] === 'stop') {
    stopVectermDemo();
    cliLog('Vecterm demo stopped', 'success');

  } else if (cmd === 'vecterm' && cmdPath[1] === 'camera' && cmdPath[2] === 'orbit' && args.length === 2) {
    if (vectermCamera) {
      const azimuth = parseFloat(args[0]);
      const elevation = parseFloat(args[1]);
      vectermCamera.orbit(azimuth, elevation);
      cliLog(`Camera orbited: azimuth=${azimuth}, elevation=${elevation}`, 'success');
    } else {
      cliLog('Vecterm not initialized. Open CLI panel first.', 'error');
    }

  } else if (cmd === 'vecterm' && cmdPath[1] === 'camera' && cmdPath[2] === 'zoom' && args.length === 1) {
    if (vectermCamera) {
      const delta = parseFloat(args[0]);
      vectermCamera.zoom(delta);
      cliLog(`Camera zoomed: ${delta}`, 'success');
    } else {
      cliLog('Vecterm not initialized. Open CLI panel first.', 'error');
    }

  } else if (cmd === 'console' && cmdPath[1] === 'vt100') {
    const action = cmdPath[2]; // 'scanlines', 'wave', etc.
    const cliPanel = document.getElementById('cli-panel');

    if (!action || action === 'help') {
      cliLog('=== Console VT100 Commands ===', 'success');
      cliLog('  console.vt100.scanlines <intensity> - Scanline darkness (0-1, default: 0.15)');
      cliLog('  console.vt100.scanspeed <seconds> - Scanline scroll speed (default: 8)');
      cliLog('  console.vt100.wave <amplitude> - Raster wave pixels (default: 2)');
      cliLog('  console.vt100.wavespeed <seconds> - Wave oscillation speed (default: 3)');
      cliLog('  console.vt100.glow <intensity> - Border glow intensity (0-1, default: 0.4)');
      cliLog('  console.vt100.glowspeed <seconds> - Glow pulse speed (default: 2)');
      cliLog('  console.vt100.status - Show current console settings');
      cliLog('  console.vt100.reset - Reset console effects to defaults');
      cliLog('  console.vt100.test - Test if variables are updating');
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
        cliLog('Unknown console.vt100 command. Try "console.vt100.help"', 'error');
      }

  } else if (cmd === 'game' && cmdPath[1] === 'vt100') {
    const action = cmdPath[2];
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

  } else if (trimmed === '') {
    // Empty command, do nothing
  } else {
    cliLog(`Unknown command: ${trimmed}. Type 'help' for available commands.`, 'error');
  }
}

// ==========================================
// GAME MANAGEMENT
// ==========================================

function startGamePreview(gameId) {
  const cliOutput = document.getElementById('cli-output');

  // Create tiny ASCII preview area (40x20 characters)
  const previewWidth = 40;
  const previewHeight = 20;

  // Create HIDDEN offscreen canvas for game rendering
  const gameCanvas = document.createElement('canvas');
  gameCanvas.width = 400;
  gameCanvas.height = 300;
  gameCanvas.id = 'hidden-preview-canvas';
  // Make absolutely sure it's never visible - position far off screen
  gameCanvas.style.position = 'absolute';
  gameCanvas.style.left = '-10000px';
  gameCanvas.style.top = '-10000px';
  gameCanvas.style.width = '400px';
  gameCanvas.style.height = '300px';
  gameCanvas.style.pointerEvents = 'none';
  // Add to body so rendering context works, but completely hidden
  document.body.appendChild(gameCanvas);

  // Create preview display div
  const previewDiv = document.createElement('div');
  previewDiv.id = 'game-preview-ascii';
  previewDiv.className = 'cli-line';
  previewDiv.style.fontFamily = 'monospace';
  previewDiv.style.fontSize = '8px';
  previewDiv.style.lineHeight = '8px';
  previewDiv.style.whiteSpace = 'pre';
  previewDiv.style.color = '#4fc3f7';
  previewDiv.style.marginTop = '8px';
  previewDiv.style.border = '1px solid #4fc3f7';
  previewDiv.style.padding = '4px';

  // Remove any existing preview
  const existingPreview = document.getElementById('game-preview-ascii');
  if (existingPreview) {
    existingPreview.remove();
  }

  // Add preview div to terminal output
  cliOutput.appendChild(previewDiv);
  cliOutput.scrollTop = cliOutput.scrollHeight;

  if (gameId === 'quadrapong') {
    const gameInstance = Quadrapong.create(store, gameCanvas);
    gameInstance.initialize().start();

    store.dispatch(updateGameInstance(gameId, {
      instance: gameInstance,
      mode: 'preview',
      canvas: gameCanvas,
      previewDiv: previewDiv,
      previewWidth: previewWidth,
      previewHeight: previewHeight
    }));

    // Start ASCII rendering loop
    startASCIIPreview(gameCanvas, previewDiv, previewWidth, previewHeight, gameId);
  }
}

// Convert canvas to ASCII art for VT100 terminal display
function startASCIIPreview(canvas, previewDiv, width, height, gameId) {
  const ctx = canvas.getContext('2d');

  function renderASCII() {
    const state = store.getState();
    const gameData = state.games.instances[gameId];

    // Stop if preview was stopped
    if (!gameData || gameData.mode !== 'preview') {
      return;
    }

    // Sample pixels from canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let ascii = '';
    const cellWidth = canvas.width / width;
    const cellHeight = canvas.height / height;

    // ASCII characters from dark to bright
    const chars = ' .:-=+*#%@';

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Sample center of each cell
        const px = Math.floor(x * cellWidth + cellWidth / 2);
        const py = Math.floor(y * cellHeight + cellHeight / 2);
        const idx = (py * canvas.width + px) * 4;

        // Calculate brightness (0-255)
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const brightness = (r + g + b) / 3;

        // Map brightness to character
        const charIndex = Math.floor((brightness / 255) * (chars.length - 1));
        ascii += chars[charIndex];
      }
      ascii += '\n';
    }

    previewDiv.textContent = ascii;

    // Continue rendering at 10 FPS
    setTimeout(() => requestAnimationFrame(renderASCII), 100);
  }

  renderASCII();
}

function startGamePlay(gameId, mode = '2d') {
  const canvas = document.getElementById('main-canvas');

  if (gameId === 'quadrapong') {
    const gameInstance = Quadrapong.create(store, canvas, mode);
    gameInstance.initialize().start();

    store.dispatch(updateGameInstance(gameId, {
      instance: gameInstance,
      mode: 'play',
      canvas: canvas
    }));

    cliLog('Type "stop" to end the game', 'success');
    cliLog('Type "game.vt100.help" for VT100 effects', 'success');

    // Minimize CLI automatically
    setTimeout(() => {
      document.getElementById('cli-panel').classList.add('minimized');
    }, 1000);
  }
}

function stopGame(gameId) {
  const state = store.getState();
  const gameData = state.games.instances[gameId];

  if (gameData && gameData.instance) {
    gameData.instance.stop();

    // Remove ASCII preview from terminal if in preview mode
    if (gameData.mode === 'preview') {
      const previewDiv = document.getElementById('game-preview-ascii');
      if (previewDiv) {
        previewDiv.remove();
      }
      const hiddenCanvas = document.getElementById('hidden-preview-canvas');
      if (hiddenCanvas) {
        hiddenCanvas.remove();
      }
    }
  }

  store.dispatch(updateGameInstance(gameId, null));
}

// CLI Command History
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

// Save history to localStorage
function saveHistory() {
  try {
    // Keep only the last MAX_HISTORY commands
    const historyToSave = commandHistory.slice(-MAX_HISTORY);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyToSave));
  } catch (e) {
    console.error('Failed to save command history:', e);
  }
}

// Handle Enter key for command execution
document.getElementById('cli-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const command = e.target.value.trim();
    if (command) {
      // Add to history (avoid duplicates of last command)
      if (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== command) {
        commandHistory.push(command);
        saveHistory();
      }
      processCLICommand(command);
    }
    e.target.value = '';
    historyPosition = commandHistory.length;
    currentCommand = '';
  }
});

// Top-level commands for tab completion
const TOP_LEVEL_COMMANDS = [
  'help', 'clear', 'state', 'spawn', 'select', 'move', 'delete', 'tool', 'grid',
  'games', 'load', 'preview', 'play', 'play3d', 'stop',
  'vecterm.demo', 'vecterm.stop', 'vecterm.camera.orbit', 'vecterm.camera.zoom',
  'console.vt100.help', 'console.vt100.status', 'console.vt100.scanlines',
  'console.vt100.scanspeed', 'console.vt100.wave', 'console.vt100.wavespeed',
  'console.vt100.glow', 'console.vt100.glowspeed', 'console.vt100.reset',
  'game.vt100.help', 'game.vt100.status', 'game.vt100.wave', 'game.vt100.drift',
  'game.vt100.jitter', 'game.vt100.scanlines', 'game.vt100.bloom',
  'game.vt100.brightness', 'game.vt100.contrast', 'game.vt100.toggle',
  'layer', 'list entities', 'list layers'
];

// Handle arrow keys for history navigation and Tab for completion
document.getElementById('cli-input').addEventListener('keydown', (e) => {
  const input = e.target;

  if (e.key === 'Tab') {
    e.preventDefault();

    const currentInput = input.value;
    const matches = TOP_LEVEL_COMMANDS.filter(cmd =>
      cmd.startsWith(currentInput.toLowerCase())
    );

    if (matches.length === 1) {
      // Single match - complete it
      input.value = matches[0];
    } else if (matches.length > 1) {
      // Multiple matches - show them in CLI output
      cliLog(`Possible completions: ${matches.join(', ')}`, 'success');
    }

  } else if (e.key === 'ArrowUp') {
    e.preventDefault();

    // Save current input if at the end of history
    if (historyPosition === commandHistory.length) {
      currentCommand = input.value;
    }

    // Navigate up in history
    if (historyPosition > 0) {
      historyPosition--;
      input.value = commandHistory[historyPosition];
    }

  } else if (e.key === 'ArrowDown') {
    e.preventDefault();

    // Navigate down in history
    if (historyPosition < commandHistory.length - 1) {
      historyPosition++;
      input.value = commandHistory[historyPosition];
    } else if (historyPosition === commandHistory.length - 1) {
      // Return to current command
      historyPosition = commandHistory.length;
      input.value = currentCommand;
    }
  }
});

// Initialize CLI
cliLog('VECTERM Terminal - Redux Demo v1.0');
cliLog('Type "help" for available commands');
cliLog('---');

// ==========================================
// VECTERM CLI PREVIEW
// ==========================================

let vectermPreview = null;
let vectermCamera = null;
let vectermAnimationId = null;

function initVectermPreview() {
  const vectermCanvas = document.getElementById('cli-vecterm');
  if (!vectermCanvas || typeof Vecterm === 'undefined') {
    console.warn('Vecterm canvas not found or Vecterm not loaded');
    return;
  }

  vectermPreview = new Vecterm(vectermCanvas);
  vectermCamera = new VectermMath.Camera(
    new VectermMath.Vector3(5, 5, 10),
    new VectermMath.Vector3(0, 0, 0)
  );

  // Demo: Render a spinning cube
  startVectermDemo();
}

let demoRotation = 0;
function startVectermDemo() {
  const cubeMesh = VectermMesh.cube(2);

  function animate() {
    demoRotation += 0.01;

    const meshes = [{
      mesh: cubeMesh,
      transform: {
        position: new VectermMath.Vector3(0, 0, 0),
        rotation: new VectermMath.Vector3(demoRotation, demoRotation * 0.7, 0),
        scale: new VectermMath.Vector3(1, 1, 1)
      },
      color: '#00ff88'
    }];

    vectermPreview.render(meshes, vectermCamera, 0.016);
    vectermAnimationId = requestAnimationFrame(animate);
  }

  animate();
}

function stopVectermDemo() {
  if (vectermAnimationId) {
    cancelAnimationFrame(vectermAnimationId);
    vectermAnimationId = null;
  }
  if (vectermPreview) {
    vectermPreview.clear();
  }
}

// Initialize vecterm on CLI panel open
document.getElementById('cli-fab').addEventListener('click', () => {
  setTimeout(() => {
    if (!document.getElementById('cli-panel').classList.contains('hidden') && !vectermPreview) {
      initVectermPreview();
    }
  }, 100);
});

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

