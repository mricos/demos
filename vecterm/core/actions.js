// ==========================================
// ACTION TYPES
// ==========================================

// Legacy actions
export const LOGIN = 'LOGIN';
export const LOGOUT = 'LOGOUT';
export const SET_PATH = 'SET_PATH';
export const ADD_CANVAS_ITEM = 'ADD_CANVAS_ITEM';

// Entity actions
export const ADD_ENTITY = 'ADD_ENTITY';
export const UPDATE_ENTITY = 'UPDATE_ENTITY';
export const DELETE_ENTITY = 'DELETE_ENTITY';
export const SELECT_ENTITY = 'SELECT_ENTITY';

// Layer actions
export const ADD_LAYER = 'ADD_LAYER';
export const TOGGLE_LAYER_VISIBILITY = 'TOGGLE_LAYER_VISIBILITY';
export const SET_ACTIVE_LAYER = 'SET_ACTIVE_LAYER';

// Tool actions
export const SET_TOOL = 'SET_TOOL';

// Grid actions
export const TOGGLE_GRID = 'TOGGLE_GRID';
export const SET_GRID_SIZE = 'SET_GRID_SIZE';

// UI State actions
export const TOGGLE_SIDEBAR = 'TOGGLE_SIDEBAR';
export const TOGGLE_SECTION = 'TOGGLE_SECTION';
export const TOGGLE_SUBSECTION = 'TOGGLE_SUBSECTION';
export const LOAD_STATE = '@@LOAD_STATE';
export const SAVE_CONFIG = 'SAVE_CONFIG';
export const LOAD_CONFIG = 'LOAD_CONFIG';
export const SET_CLI_CONTEXT = 'SET_CLI_CONTEXT';
export const SET_MODE = 'SET_MODE';

// Game Management actions
export const LOAD_GAME = 'LOAD_GAME';
export const UNLOAD_GAME = 'UNLOAD_GAME';
export const SET_PREVIEW_GAME = 'SET_PREVIEW_GAME';
export const SET_ACTIVE_GAME = 'SET_ACTIVE_GAME';
export const UPDATE_GAME_INSTANCE = 'UPDATE_GAME_INSTANCE';

// Vecterm Entity actions
export const VECTERM_ADD_ENTITY = 'VECTERM_ADD_ENTITY';
export const VECTERM_UPDATE_ENTITY = 'VECTERM_UPDATE_ENTITY';
export const VECTERM_REMOVE_ENTITY = 'VECTERM_REMOVE_ENTITY';
export const VECTERM_TOGGLE_VISIBLE = 'VECTERM_TOGGLE_VISIBLE';

// Vecterm Transform actions
export const VECTERM_SET_POSITION = 'VECTERM_SET_POSITION';
export const VECTERM_SET_ROTATION = 'VECTERM_SET_ROTATION';
export const VECTERM_SET_SCALE = 'VECTERM_SET_SCALE';
export const VECTERM_UPDATE_TRANSFORM = 'VECTERM_UPDATE_TRANSFORM';

// Vecterm Camera actions
export const VECTERM_SET_CAMERA = 'VECTERM_SET_CAMERA';
export const VECTERM_ORBIT_CAMERA = 'VECTERM_ORBIT_CAMERA';
export const VECTERM_ZOOM_CAMERA = 'VECTERM_ZOOM_CAMERA';

// Vecterm Layer actions
export const VECTERM_ADD_LAYER = 'VECTERM_ADD_LAYER';
export const VECTERM_REMOVE_LAYER = 'VECTERM_REMOVE_LAYER';
export const VECTERM_SET_LAYER_VISIBLE = 'VECTERM_SET_LAYER_VISIBLE';
export const VECTERM_SET_ENTITY_LAYER = 'VECTERM_SET_ENTITY_LAYER';

// Vecterm Config actions
export const VECTERM_SET_CONFIG = 'VECTERM_SET_CONFIG';
export const VECTERM_RESET_CONFIG = 'VECTERM_RESET_CONFIG';

// Vecterm Animation actions
export const VECTERM_START_ANIMATION = 'VECTERM_START_ANIMATION';
export const VECTERM_STOP_ANIMATION = 'VECTERM_STOP_ANIMATION';
export const VECTERM_TICK = 'VECTERM_TICK';

// Vecterm Grid actions
export const VECTERM_SET_GRID_TYPE = 'VECTERM_SET_GRID_TYPE';
export const VECTERM_SET_GRID_CONFIG = 'VECTERM_SET_GRID_CONFIG';
export const VECTERM_TOGGLE_GRID_VISIBLE = 'VECTERM_TOGGLE_GRID_VISIBLE';
export const VECTERM_SET_CHARACTER_GRID = 'VECTERM_SET_CHARACTER_GRID';
export const VECTERM_SET_SQUARE_GRID = 'VECTERM_SET_SQUARE_GRID';

// Context Management actions (3-tier: games → contexts → fields)
export const CREATE_CONTEXT = 'CREATE_CONTEXT';
export const UPDATE_CONTEXT = 'UPDATE_CONTEXT';
export const DELETE_CONTEXT = 'DELETE_CONTEXT';
export const ENTER_CONTEXT_EDIT = 'ENTER_CONTEXT_EDIT';
export const EXIT_CONTEXT_EDIT = 'EXIT_CONTEXT_EDIT';

// Field Management actions (running game instances)
export const CREATE_FIELD = 'CREATE_FIELD';
export const UPDATE_FIELD = 'UPDATE_FIELD';
export const STOP_FIELD = 'STOP_FIELD';
export const ENTER_FIELD = 'ENTER_FIELD';
export const EXIT_FIELD = 'EXIT_FIELD';

// CLI Prompt State actions
export const SET_CLI_PROMPT_STATE = 'SET_CLI_PROMPT_STATE';

// S3 Connection actions
export const S3_CONNECT = 'S3_CONNECT';
export const S3_DISCONNECT = 'S3_DISCONNECT';

// Gamepad Input actions
export const GAMEPAD_CONNECTED = 'GAMEPAD_CONNECTED';
export const GAMEPAD_DISCONNECTED = 'GAMEPAD_DISCONNECTED';
export const GAMEPAD_INPUT = 'GAMEPAD_INPUT';
export const GAMEPAD_ANALOG_MOVEMENT = 'GAMEPAD_ANALOG_MOVEMENT';
export const GAMEPAD_ANALOG_AIM = 'GAMEPAD_ANALOG_AIM';
export const SET_GAMEPAD_MAPPING = 'SET_GAMEPAD_MAPPING';
export const LOAD_GAMEPAD_PRESET = 'LOAD_GAMEPAD_PRESET';
export const TOGGLE_GAMEPAD_ENABLED = 'TOGGLE_GAMEPAD_ENABLED';
export const SET_GAMEPAD_CONFIG = 'SET_GAMEPAD_CONFIG';

// Camera Control actions (for gamepad)
export const CAMERA_ORBIT = 'CAMERA_ORBIT';
export const CAMERA_ZOOM = 'CAMERA_ZOOM';
export const CAMERA_RESET = 'CAMERA_RESET';
export const GRID_TOGGLE = 'GRID_TOGGLE';

// Player Input actions (for game mode)
export const PLAYER_INPUT = 'PLAYER_INPUT';

// ==========================================
// ACTION CREATORS
// ==========================================

// Legacy
export const login = (username) => ({ type: LOGIN, payload: username });
export const logout = () => ({ type: LOGOUT });
export const setPath = (path) => ({ type: SET_PATH, payload: path });
export const addCanvasItem = (text) => ({ type: ADD_CANVAS_ITEM, payload: text });

// Entities
export const addEntity = (entity) => ({ type: ADD_ENTITY, payload: entity });
export const updateEntity = (id, updates) => ({ type: UPDATE_ENTITY, payload: { id, updates } });
export const deleteEntity = (id) => ({ type: DELETE_ENTITY, payload: id });
export const selectEntity = (id) => ({ type: SELECT_ENTITY, payload: id });

// Layers
export const addLayer = (name) => ({ type: ADD_LAYER, payload: name });
export const toggleLayerVisibility = (id) => ({ type: TOGGLE_LAYER_VISIBILITY, payload: id });
export const setActiveLayer = (id) => ({ type: SET_ACTIVE_LAYER, payload: id });

// Tools
export const setTool = (tool) => ({ type: SET_TOOL, payload: tool });

// Grid
export const toggleGrid = () => ({ type: TOGGLE_GRID });
export const setGridSize = (size) => ({ type: SET_GRID_SIZE, payload: size });

// UI State
export const toggleSidebar = () => ({ type: TOGGLE_SIDEBAR });
export const toggleSection = (section) => ({ type: TOGGLE_SECTION, payload: section });
export const toggleSubsection = (subsection) => ({ type: TOGGLE_SUBSECTION, payload: subsection });
export const loadState = (state) => ({ type: LOAD_STATE, payload: state });
export const saveConfig = () => ({ type: SAVE_CONFIG });
export const loadConfig = () => ({ type: LOAD_CONFIG });
export const setCliContext = (context, label) => ({ type: SET_CLI_CONTEXT, payload: { context, label } });
export const setMode = (mode) => ({ type: SET_MODE, payload: mode });

// Game Management
export const loadGame = (gameId, namespace) => ({ type: LOAD_GAME, payload: { gameId, namespace } });
export const unloadGame = (gameId) => ({ type: UNLOAD_GAME, payload: gameId });
export const setPreviewGame = (gameId) => ({ type: SET_PREVIEW_GAME, payload: gameId });
export const setActiveGame = (gameId) => ({ type: SET_ACTIVE_GAME, payload: gameId });
export const updateGameInstance = (gameId, instance) => ({ type: UPDATE_GAME_INSTANCE, payload: { gameId, instance } });

// Vecterm Entities
export const vectermAddEntity = (entity) => ({ type: VECTERM_ADD_ENTITY, payload: entity });
export const vectermUpdateEntity = (id, updates) => ({ type: VECTERM_UPDATE_ENTITY, payload: { id, updates } });
export const vectermRemoveEntity = (id) => ({ type: VECTERM_REMOVE_ENTITY, payload: id });
export const vectermToggleVisible = (id) => ({ type: VECTERM_TOGGLE_VISIBLE, payload: id });

// Vecterm Transforms
export const vectermSetPosition = (id, position) => ({ type: VECTERM_SET_POSITION, payload: { id, position } });
export const vectermSetRotation = (id, rotation) => ({ type: VECTERM_SET_ROTATION, payload: { id, rotation } });
export const vectermSetScale = (id, scale) => ({ type: VECTERM_SET_SCALE, payload: { id, scale } });
export const vectermUpdateTransform = (id, transform) => ({ type: VECTERM_UPDATE_TRANSFORM, payload: { id, transform } });

// Vecterm Camera
export const vectermSetCamera = (camera) => ({ type: VECTERM_SET_CAMERA, payload: camera });
export const vectermOrbitCamera = (azimuth, elevation) => ({ type: VECTERM_ORBIT_CAMERA, payload: { azimuth, elevation } });
export const vectermZoomCamera = (factor) => ({ type: VECTERM_ZOOM_CAMERA, payload: factor });

// Vecterm Layers
export const vectermAddLayer = (id, zIndex) => ({ type: VECTERM_ADD_LAYER, payload: { id, zIndex } });
export const vectermRemoveLayer = (id) => ({ type: VECTERM_REMOVE_LAYER, payload: id });
export const vectermSetLayerVisible = (id, visible) => ({ type: VECTERM_SET_LAYER_VISIBLE, payload: { id, visible } });
export const vectermSetEntityLayer = (entityId, layerId) => ({ type: VECTERM_SET_ENTITY_LAYER, payload: { entityId, layerId } });

// Vecterm Config
export const vectermSetConfig = (config) => ({ type: VECTERM_SET_CONFIG, payload: config });
export const vectermResetConfig = () => ({ type: VECTERM_RESET_CONFIG });

// Vecterm Animation
export const vectermStartAnimation = () => ({ type: VECTERM_START_ANIMATION });
export const vectermStopAnimation = () => ({ type: VECTERM_STOP_ANIMATION });
export const vectermTick = (deltaTime) => ({ type: VECTERM_TICK, payload: deltaTime });

// Vecterm Grid
export const vectermSetGridType = (gridType) => ({ type: VECTERM_SET_GRID_TYPE, payload: gridType });
export const vectermSetGridConfig = (gridType, config) => ({ type: VECTERM_SET_GRID_CONFIG, payload: { gridType, config } });
export const vectermToggleGridVisible = (gridType) => ({ type: VECTERM_TOGGLE_GRID_VISIBLE, payload: gridType });
export const vectermSetCharacterGrid = (config) => ({ type: VECTERM_SET_CHARACTER_GRID, payload: config });
export const vectermSetSquareGrid = (config) => ({ type: VECTERM_SET_SQUARE_GRID, payload: config });

// Context Management
export const createContext = (contextId, gameId, customName = null) => ({
  type: CREATE_CONTEXT,
  payload: { contextId, gameId, customName }
});
export const updateContext = (contextId, updates) => ({
  type: UPDATE_CONTEXT,
  payload: { contextId, updates }
});
export const deleteContext = (contextId) => ({
  type: DELETE_CONTEXT,
  payload: contextId
});
export const enterContextEdit = (contextId) => ({
  type: ENTER_CONTEXT_EDIT,
  payload: contextId
});
export const exitContextEdit = () => ({
  type: EXIT_CONTEXT_EDIT
});

// Field Management
export const createField = (fieldId, contextId, gameId, customName = null) => ({
  type: CREATE_FIELD,
  payload: { fieldId, contextId, gameId, customName }
});
export const updateField = (fieldId, updates) => ({
  type: UPDATE_FIELD,
  payload: { fieldId, updates }
});
export const stopField = (fieldId) => ({
  type: STOP_FIELD,
  payload: fieldId
});
export const enterField = (fieldId) => ({
  type: ENTER_FIELD,
  payload: fieldId
});
export const exitField = () => ({
  type: EXIT_FIELD
});

// CLI Prompt State
export const setCliPromptState = (promptState) => ({
  type: SET_CLI_PROMPT_STATE,
  payload: promptState
});

// S3 Connection
export const s3Connect = (username) => ({
  type: S3_CONNECT,
  payload: username
});
export const s3Disconnect = () => ({
  type: S3_DISCONNECT
});

// Gamepad Input
export const gamepadConnected = (info) => ({
  type: GAMEPAD_CONNECTED,
  payload: info
});
export const gamepadDisconnected = () => ({
  type: GAMEPAD_DISCONNECTED
});
export const gamepadInput = (playerId, action, pressed) => ({
  type: GAMEPAD_INPUT,
  payload: { playerId, action, pressed }
});
export const gamepadAnalogMovement = (playerId, x, y) => ({
  type: GAMEPAD_ANALOG_MOVEMENT,
  payload: { playerId, x, y }
});
export const gamepadAnalogAim = (playerId, x, y) => ({
  type: GAMEPAD_ANALOG_AIM,
  payload: { playerId, x, y }
});
export const setGamepadMapping = (buttonIndex, action, mode) => ({
  type: SET_GAMEPAD_MAPPING,
  payload: { buttonIndex, action, mode }
});
export const loadGamepadPreset = (presetName) => ({
  type: LOAD_GAMEPAD_PRESET,
  payload: presetName
});
export const toggleGamepadEnabled = () => ({
  type: TOGGLE_GAMEPAD_ENABLED
});
export const setGamepadConfig = (config) => ({
  type: SET_GAMEPAD_CONFIG,
  payload: config
});

// Camera Control
export const cameraOrbit = (horizontal, vertical) => ({
  type: CAMERA_ORBIT,
  payload: { horizontal, vertical }
});
export const cameraZoom = (delta) => ({
  type: CAMERA_ZOOM,
  payload: delta
});
export const cameraReset = () => ({
  type: CAMERA_RESET
});
export const gridToggle = () => ({
  type: GRID_TOGGLE
});

// Player Input
export const playerInput = (playerId, action, pressed) => ({
  type: PLAYER_INPUT,
  payload: { playerId, action, pressed }
});

// Vecterm namespace object for convenient imports
export const vectermActions = {
  addEntity: vectermAddEntity,
  updateEntity: vectermUpdateEntity,
  removeEntity: vectermRemoveEntity,
  toggleVisible: vectermToggleVisible,
  setPosition: vectermSetPosition,
  setRotation: vectermSetRotation,
  setScale: vectermSetScale,
  updateTransform: vectermUpdateTransform,
  setCamera: vectermSetCamera,
  orbitCamera: vectermOrbitCamera,
  zoomCamera: vectermZoomCamera,
  addLayer: vectermAddLayer,
  removeLayer: vectermRemoveLayer,
  setLayerVisible: vectermSetLayerVisible,
  setEntityLayer: vectermSetEntityLayer,
  setConfig: vectermSetConfig,
  resetConfig: vectermResetConfig,
  startAnimation: vectermStartAnimation,
  stopAnimation: vectermStopAnimation,
  tick: vectermTick,
  setGridType: vectermSetGridType,
  setGridConfig: vectermSetGridConfig,
  toggleGridVisible: vectermToggleGridVisible,
  setCharacterGrid: vectermSetCharacterGrid,
  setSquareGrid: vectermSetSquareGrid
};
