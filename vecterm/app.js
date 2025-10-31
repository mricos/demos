// ==========================================
// REDUX DEMO - Main Application
// ==========================================

// Import Redux core modules
import { store, visualizationHooks, savedUIState } from './core/store-instance.js';
import * as Actions from './core/actions.js';
import { getQueryParams } from './utils/query-params.js';

// Import UI modules
import { createRenderer } from './ui/renderer.js';
import { initializeEventHandlers, initializeUptimeCounter } from './ui/event-handlers.js';

// Import CLI modules
import { cliLog, initializeCLI } from './cli/terminal.js';
import { addToHistory, navigateUp, navigateDown } from './cli/history.js';
import { handleTabCompletion } from './cli/tab-completion.js';
import { createCommandProcessor } from './cli/command-processor.js';
import { initVT100Params } from './cli/vt100-params.js';

// Import game manager
import { createGameManager } from './games/game-manager.js';

// Import vecterm demo
import {
  startVectermDemo,
  stopVectermDemo,
  getVectermCamera,
  getVectermRenderer,
  setupVectermInitialization
} from './vecterm/vecterm-demo.js';

// Import gamepad system
import { GamepadInputSystem } from './GamepadInputSystem.js';

// Import multiplayer system
import { initializeMultiplayer } from './multiplayer.js';

// ==========================================
// SETUP DELAY CONTROL
// ==========================================

// Expose delay control to visualization hooks
const delayControl = {
  get currentDelay() { return visualizationHooks.currentDelay; },
  set currentDelay(val) { visualizationHooks.currentDelay = val; }
};

// ==========================================
// SETUP GAME MANAGER
// ==========================================

const gameManager = createGameManager(store);
const { startGamePlay, stopGame, startGamePreview } = gameManager;

// ==========================================
// SETUP VECTERM CONTROLS
// ==========================================

const vectermControls = {
  get vectermCamera() { return getVectermCamera(); },
  startVectermDemo,
  stopVectermDemo,
  getVectermRenderer
};

// ==========================================
// SETUP CLI COMMAND PROCESSOR
// ==========================================

const processCLICommand = createCommandProcessor(
  store,
  vectermControls,
  gameManager
);

// ==========================================
// SETUP RENDERER
// ==========================================

const render = createRenderer(store, visualizationHooks);

// Subscribe to state changes
store.subscribe(render);

// ==========================================
// INITIALIZE EVENT HANDLERS
// ==========================================

initializeEventHandlers(store, delayControl, savedUIState, cliLog);

// ==========================================
// INITIALIZE CLI
// ==========================================

initializeCLI();
initVT100Params();

// CLI input: Enter key for command execution
const cliInput = document.getElementById('cli-input');
if (cliInput) {
  cliInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const command = e.target.value.trim();
      if (command) {
        // Add to history (avoid duplicates of last command)
        addToHistory(command);
        processCLICommand(command);
      }
      e.target.value = '';
    }
  });

  // CLI input: Arrow keys for history, Tab for completion
  cliInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion(cliInput, store, processCLICommand);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cliInput.value = navigateUp(cliInput.value);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      cliInput.value = navigateDown();
    }
  });
}

// ==========================================
// INITIALIZE VECTERM
// ==========================================

setupVectermInitialization();

// ==========================================
// INITIALIZE UPTIME COUNTER
// ==========================================

initializeUptimeCounter();

// ==========================================
// INITIALIZATION
// ==========================================

// Check query params and dispatch login
const params = getQueryParams();
if (params.name === 'mike' && params.pass === '1234') {
  store.dispatch(Actions.login('mike'));
}

// Set initial path
store.dispatch(Actions.setPath('/projects/redux-demo.md'));

// Initial render
render();

// Add introductory canvas items with delay
setTimeout(() => store.dispatch(Actions.addCanvasItem('Welcome to Redux!')), 2000);
setTimeout(() => store.dispatch(Actions.addCanvasItem('Click buttons to dispatch actions')), 4000);
setTimeout(() => store.dispatch(Actions.addCanvasItem('Watch the flow diagram animate')), 6000);

// ==========================================
// INITIALIZE GAMEPAD SYSTEM
// ==========================================

// Load gamepad mappings from JSON
let gamepadMappings = null;
fetch('./gamepad-mappings.json')
  .then(response => response.json())
  .then(mappings => {
    gamepadMappings = mappings;

    // Update Redux state with loaded mappings
    store.dispatch(Actions.setGamepadConfig({ mappings }));

    cliLog('Gamepad mappings loaded', 'success');
  })
  .catch(error => {
    console.error('Failed to load gamepad mappings:', error);
    cliLog('Warning: Failed to load gamepad mappings. Using defaults.', 'error');
  });

// Initialize gamepad input system
const gamepadSystem = new GamepadInputSystem(store, gamepadMappings);
gamepadSystem.init();

// ==========================================
// INITIALIZE MULTIPLAYER
// ==========================================

// Initialize multiplayer system
const multiplayerClient = initializeMultiplayer(store);
cliLog('Multiplayer system ready. Type "connect <name>" to join.', 'info');

// ==========================================
// MAIN ANIMATION LOOP (for gamepad polling)
// ==========================================

function animationLoop() {
  // Poll gamepad state
  gamepadSystem.poll();

  // Continue loop
  requestAnimationFrame(animationLoop);
}

// Start animation loop
animationLoop();
