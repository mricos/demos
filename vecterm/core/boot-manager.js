/**
 * Boot Manager - Orchestrates Application Initialization
 *
 * Ensures all systems initialize in the correct order with proper dependencies.
 * Handles async initialization and provides clear boot phases.
 */

export const BootPhase = {
  UNINITIALIZED: 'uninitialized',
  CREATING_STORE: 'creating_store',
  LOADING_STATE: 'loading_state',
  INITIALIZING_SYSTEMS: 'initializing_systems',
  CONNECTING_UI: 'connecting_ui',
  READY: 'ready',
  ERROR: 'error'
};

export class BootManager {
  constructor() {
    this.phase = BootPhase.UNINITIALIZED;
    this.errors = [];
    this.store = null;
    this.systems = {};
  }

  /**
   * Main boot sequence
   */
  async boot() {
    try {
      // Phase 1: Create Store
      this.setPhase(BootPhase.CREATING_STORE);
      await this.createStore();

      // Phase 2: Load Persisted State
      this.setPhase(BootPhase.LOADING_STATE);
      await this.loadPersistedState();

      // Phase 3: Initialize Core Systems
      this.setPhase(BootPhase.INITIALIZING_SYSTEMS);
      await this.initializeSystems();

      // Phase 4: Connect UI
      this.setPhase(BootPhase.CONNECTING_UI);
      await this.connectUI();

      // Phase 5: Ready
      this.setPhase(BootPhase.READY);
      this.logBoot('Application ready');

    } catch (error) {
      this.setPhase(BootPhase.ERROR);
      this.errors.push(error);
      console.error('Boot failed:', error);
      throw error;
    }
  }

  /**
   * Phase 1: Create and initialize Redux store
   */
  async createStore() {
    const { createStore } = await import('./store.js');
    const { rootReducer, initialState } = await import('./reducers.js');
    const { localStorageMiddleware, applyMiddleware } = await import('./middleware.js');

    // Create visualization hooks
    const visualizationHooks = this.createVisualizationHooks();

    // Create store with middleware
    this.store = createStore(
      rootReducer,
      applyMiddleware(localStorageMiddleware),
      visualizationHooks
    );

    this.systems.visualizationHooks = visualizationHooks;

    // Wait for initial dispatch to complete
    await this.waitForStoreReady();

    this.logBoot('Store created and initialized');
  }

  /**
   * Wait for store to be fully initialized
   */
  async waitForStoreReady() {
    return new Promise((resolve) => {
      // Check if state is defined
      const checkState = () => {
        const state = this.store.getState();
        if (state && state.gamepad !== undefined) {
          resolve();
        } else {
          setTimeout(checkState, 10);
        }
      };
      checkState();
    });
  }

  /**
   * Phase 2: Load persisted state from localStorage
   */
  async loadPersistedState() {
    try {
      const savedData = localStorage.getItem('redux-demo-ui-state');
      if (savedData) {
        const savedUIState = JSON.parse(savedData);
        const { loadState } = await import('./actions.js');
        this.store.dispatch(loadState(savedUIState));
        this.systems.savedUIState = savedUIState;
        this.logBoot('Loaded persisted state');
      }
    } catch (e) {
      console.warn('Failed to load persisted state:', e);
      // Non-fatal, continue boot
    }
  }

  /**
   * Phase 3: Initialize core application systems
   */
  async initializeSystems() {
    // Initialize in dependency order

    // 3.1: Game Manager (depends on: store)
    const { createGameManager } = await import('../games/game-manager.js');
    this.systems.gameManager = createGameManager(this.store);
    this.logBoot('Game manager initialized');

    // 3.2: Vecterm Demo (depends on: store)
    const vectermModule = await import('../vecterm/vecterm-demo.js');
    this.systems.vectermControls = {
      get vectermCamera() { return vectermModule.getVectermCamera(); },
      startVectermDemo: vectermModule.startVectermDemo,
      stopVectermDemo: vectermModule.stopVectermDemo,
      getVectermRenderer: vectermModule.getVectermRenderer
    };
    this.logBoot('Vecterm controls initialized');

    // 3.3: CLI Command Processor (depends on: store, gameManager, vectermControls)
    const { createCommandProcessor } = await import('../cli/command-processor.js');
    this.systems.processCLICommand = createCommandProcessor(
      this.store,
      this.systems.vectermControls,
      this.systems.gameManager
    );
    this.logBoot('CLI command processor initialized');

    // 3.4: Gamepad System (depends on: store)
    const { GamepadInputSystem } = await import('../GamepadInputSystem.js');
    this.systems.gamepadSystem = new GamepadInputSystem(this.store);
    this.logBoot('Gamepad system initialized');

    // 3.5: Delay Control (for visualization)
    this.systems.delayControl = {
      get currentDelay() { return this.systems.visualizationHooks.currentDelay; },
      set currentDelay(val) { this.systems.visualizationHooks.currentDelay = val; }
    };
  }

  /**
   * Phase 4: Connect UI components
   */
  async connectUI() {
    // 4.1: Renderer (depends on: store, visualizationHooks)
    const { createRenderer } = await import('../ui/renderer.js');
    this.systems.render = createRenderer(this.store, this.systems.visualizationHooks);
    this.store.subscribe(this.systems.render);
    this.logBoot('Renderer connected');

    // 4.2: Event Handlers (depends on: store, delayControl, savedUIState, cliLog)
    const { initializeEventHandlers, initializeUptimeCounter } = await import('../ui/event-handlers.js');
    const { cliLog } = await import('../cli/terminal.js');
    initializeEventHandlers(
      this.store,
      this.systems.delayControl,
      this.systems.savedUIState,
      cliLog
    );
    initializeUptimeCounter();
    this.logBoot('Event handlers initialized');

    // 4.3: CLI (depends on: processCLICommand, terminal setup)
    const { initializeCLI } = await import('../cli/terminal.js');
    initializeCLI();
    this.setupCLIInput();
    this.logBoot('CLI initialized');

    // 4.4: Query params (optional initialization)
    const { getQueryParams } = await import('../utils/query-params.js');
    const queryParams = getQueryParams();
    if (Object.keys(queryParams).length > 0) {
      this.logBoot(`Query params: ${JSON.stringify(queryParams)}`);
    }
  }

  /**
   * Setup CLI input handlers
   */
  setupCLIInput() {
    const { addToHistory, navigateUp, navigateDown } = require('../cli/history.js');
    const { handleTabCompletion } = require('../cli/tab-completion.js');
    const { cliLog } = require('../cli/terminal.js');

    const cliInput = document.getElementById('cli-input');
    if (!cliInput) {
      console.warn('CLI input element not found');
      return;
    }

    // Enter key: execute command
    cliInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const command = e.target.value.trim();
        if (command) {
          addToHistory(command);
          cliLog(`> ${command}`);
          this.systems.processCLICommand(command);
          e.target.value = '';
        }
      }
    });

    // Arrow keys: history navigation
    cliInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.target.value = navigateUp() || e.target.value;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.target.value = navigateDown() || '';
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const newValue = handleTabCompletion(e.target.value);
        if (newValue) {
          e.target.value = newValue;
        }
      }
    });
  }

  /**
   * Create visualization hooks object
   */
  createVisualizationHooks() {
    return {
      currentDelay: 1000,
      actionHistory: [],

      async visualizeStep(stepId, action) {
        document.querySelectorAll('.flow-step').forEach(step => {
          step.classList.remove('active');
        });

        const step = document.getElementById(stepId);
        if (step) {
          step.classList.add('active');
        }

        if (action.type !== '@@INIT') {
          await new Promise(resolve => setTimeout(resolve, this.currentDelay / 4));
        }
      },

      logAction(action) {
        if (action.type === '@@INIT') return;

        const entry = {
          type: action.type,
          payload: action.payload,
          timestamp: new Date().toLocaleTimeString()
        };

        this.actionHistory.unshift(entry);
        if (this.actionHistory.length > 20) this.actionHistory.pop();

        this.updateActionHistoryUI();
        this.updateHUD();
      },

      updateActionHistoryUI() {
        const historyDiv = document.getElementById('action-history');
        if (!historyDiv) return;

        historyDiv.innerHTML = this.actionHistory.map((entry, index) => `
          <div class="action-entry ${index === 0 ? 'new' : ''}">
            <div class="action-type">${entry.type}</div>
            ${entry.payload !== undefined ? `<div class="action-payload">payload: ${JSON.stringify(entry.payload)}</div>` : ''}
            <div class="action-time">${entry.timestamp}</div>
          </div>
        `).join('');
      },

      updateStateDisplay(store) {
        const state = store.getState();
        const display = document.getElementById('state-display');
        if (!display) return;

        const json = JSON.stringify(state, null, 2);
        const colorized = json
          .replace(/(".*?"):/g, '<span class="json-key">$1</span>:')
          .replace(/: (".*?")/g, ': <span class="json-string">$1</span>')
          .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
          .replace(/: (null)/g, ': <span class="json-null">$1</span>')
          .replace(/: (-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>');

        display.innerHTML = colorized;
      },

      updateHUD() {
        const event = new CustomEvent('redux-action-dispatched');
        document.dispatchEvent(event);
      }
    };
  }

  /**
   * Set boot phase and emit event
   */
  setPhase(phase) {
    this.phase = phase;
    const event = new CustomEvent('boot-phase-change', { detail: { phase } });
    document.dispatchEvent(event);
  }

  /**
   * Log boot message with timestamp
   */
  logBoot(message) {
    console.log(`[BOOT] ${this.phase}: ${message}`);
  }

  /**
   * Get initialized system by name
   */
  getSystem(name) {
    if (!this.systems[name]) {
      throw new Error(`System '${name}' not initialized`);
    }
    return this.systems[name];
  }

  /**
   * Check if boot is complete
   */
  isReady() {
    return this.phase === BootPhase.READY;
  }

  /**
   * Get boot errors
   */
  getErrors() {
    return this.errors;
  }
}

// Create singleton instance
export const bootManager = new BootManager();

// Export convenience function
export async function bootApplication() {
  await bootManager.boot();
  return bootManager;
}
