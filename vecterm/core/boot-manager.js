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

    // System health tracking
    this.systemHealth = {
      store: { status: 'uninitialized', error: null, startTime: null, endTime: null },
      gameManager: { status: 'uninitialized', error: null, startTime: null, endTime: null },
      vectermControls: { status: 'uninitialized', error: null, startTime: null, endTime: null },
      gamepadSystem: { status: 'uninitialized', error: null, startTime: null, endTime: null },
      tinesManager: { status: 'uninitialized', error: null, startTime: null, endTime: null },
      midiModule: { status: 'uninitialized', error: null, startTime: null, endTime: null },
      vscopeModule: { status: 'uninitialized', error: null, startTime: null, endTime: null },
      cli: { status: 'uninitialized', error: null, startTime: null, endTime: null },
      renderer: { status: 'uninitialized', error: null, startTime: null, endTime: null },
      eventHandlers: { status: 'uninitialized', error: null, startTime: null, endTime: null }
    };

    // Critical vs optional systems
    this.criticalSystems = ['store', 'renderer', 'cli'];
    this.optionalSystems = ['gameManager', 'vectermControls', 'gamepadSystem', 'tinesManager', 'midiModule', 'vscopeModule'];
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

      // Setup global system status API
      this.setupGlobalAPI();

      // Print system status
      this.printSystemStatus();

    } catch (error) {
      this.setPhase(BootPhase.ERROR);
      this.errors.push(error);
      console.error('Boot failed:', error);
      throw error;
    }
  }

  /**
   * Setup global API for system management
   */
  setupGlobalAPI() {
    if (!window.Vecterm) {
      window.Vecterm = {};
    }

    // Top-level methods
    window.Vecterm.status = () => this.printSystemStatus();
    window.Vecterm.getStatus = () => this.getSystemStatus();
    window.Vecterm.retry = (name) => this.retrySystem(name);
    window.Vecterm.getSystem = (name) => this.getSystem(name);
    window.Vecterm.isReady = () => this.isReady();
    window.Vecterm.getPhase = () => this.phase;
    window.Vecterm.getErrors = () => this.getErrors();

    // CLI namespace for terminal logging
    window.Vecterm.CLI = {};

    console.log('💡 System API: Vecterm.status()');
  }

  /**
   * Phase 1: Create and initialize Redux store
   */
  async createStore() {
    await this.initializeSystem('store', async () => {
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

      // Register in systems
      this.systems.store = this.store;
      this.systems.visualizationHooks = visualizationHooks;

      // Wait for initial dispatch to complete
      await this.waitForStoreReady();
    }, { timeout: 5000, critical: true });
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
    await this.initializeSystem('gameManager', async () => {
      const { createGameManager } = await import('../games/game-manager.js');
      this.systems.gameManager = createGameManager(this.store);
    }, { timeout: 5000, critical: false });

    // 3.2: Vecterm Demo (depends on: store)
    await this.initializeSystem('vectermControls', async () => {
      const vectermModule = await import('../vecterm/vecterm-demo.js');
      this.systems.vectermControls = {
        get vectermCamera() { return vectermModule.getVectermCamera(); },
        startVectermDemo: vectermModule.startVectermDemo,
        stopVectermDemo: vectermModule.stopVectermDemo,
        getVectermRenderer: vectermModule.getVectermRenderer
      };
    }, { timeout: 5000, critical: false });

    // 3.3: Gamepad System (depends on: store)
    await this.initializeGamepad();

    // 3.4: Tines Audio Manager (depends on: store)
    await this.initializeTines();

    // 3.5: MIDI Module (depends on: store)
    await this.initializeMIDI();

    // 3.6: VScope Module (depends on: store)
    await this.initializeVScope();

    // 3.7: CLI Command Processor (depends on: store, gameManager, vectermControls, tinesManager)
    await this.initializeSystem('cli', async () => {
      const { createCommandProcessor } = await import('../cli/command-processor.js');
      this.systems.processCLICommand = createCommandProcessor(
        this.store,
        this.systems.vectermControls,
        this.systems.gameManager,
        this.systems.tinesManager
      );
    }, { timeout: 5000, critical: true });

    // 3.7: Delay Control (for visualization)
    this.systems.delayControl = {
      get currentDelay() { return this.systems.visualizationHooks.currentDelay; },
      set currentDelay(val) { this.systems.visualizationHooks.currentDelay = val; }
    };
  }

  /**
   * Initialize Gamepad system (can be retried)
   */
  async initializeGamepad() {
    await this.initializeSystem('gamepadSystem', async () => {
      const { GamepadInputSystem } = await import('../GamepadInputSystem.js');
      this.systems.gamepadSystem = new GamepadInputSystem(this.store);
    }, { timeout: 5000, critical: false });
  }

  /**
   * Initialize Tines audio system (can be retried)
   */
  async initializeTines() {
    await this.initializeSystem('tinesManager', async () => {
      const { createTinesManager, createGlobalAPI } = await import('../audio/tines-manager.js');
      this.systems.tinesManager = createTinesManager(this.store);
      await this.systems.tinesManager.init();
      createGlobalAPI(this.systems.tinesManager);
      window.__tinesReady = true;
    }, { timeout: 10000, critical: false });
  }

  /**
   * Initialize MIDI module (can be retried)
   */
  async initializeMIDI() {
    await this.initializeSystem('midiModule', async () => {
      const midiModule = await import('../modules/midi/index.js');
      await midiModule.init(this.store);
      this.systems.midiModule = midiModule;
    }, { timeout: 10000, critical: false });
  }

  /**
   * Initialize VScope module (can be retried)
   */
  async initializeVScope() {
    await this.initializeSystem('vscopeModule', async () => {
      const vscopeModule = await import('../modules/vscope/index.js');
      await vscopeModule.init(this.store);
      this.systems.vscopeModule = vscopeModule;
    }, { timeout: 10000, critical: false });
  }

  /**
   * Phase 4: Connect UI components
   */
  async connectUI() {
    // 4.1: Renderer (depends on: store, visualizationHooks)
    await this.initializeSystem('renderer', async () => {
      const { createRenderer } = await import('../ui/renderer.js');
      this.systems.render = createRenderer(this.store, this.systems.visualizationHooks);
      this.store.subscribe(this.systems.render);
    }, { timeout: 5000, critical: true });

    // 4.2: Event Handlers (depends on: store, delayControl, savedUIState, cliLog)
    await this.initializeSystem('eventHandlers', async () => {
      const { initializeEventHandlers, initializeUptimeCounter } = await import('../ui/event-handlers.js');
      const { cliLog } = await import('../cli/terminal.js');
      initializeEventHandlers(
        this.store,
        this.systems.delayControl,
        this.systems.savedUIState,
        cliLog
      );
      initializeUptimeCounter();
    }, { timeout: 5000, critical: true });

    // 4.3: CLI (depends on: processCLICommand, terminal setup)
    const { initializeCLI, cliLog } = await import('../cli/terminal.js');
    initializeCLI();
    await this.setupCLIInput();

    // Expose CLI log function to global API
    if (!window.Vecterm.CLI) {
      window.Vecterm.CLI = {};
    }
    window.Vecterm.CLI.log = cliLog;

    // Initialize VT100 parameter update API
    await import('../cli/vt100-silent-updater.js');

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
  async setupCLIInput() {
    const { addToHistory, navigateUp, navigateDown } = await import('../cli/history.js');
    const { handleTabCompletion } = await import('../cli/tab-completion.js');
    const { cliLog } = await import('../cli/terminal.js');

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
        handleTabCompletion(e.target, this.store, this.systems.processCLICommand);
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

  /**
   * Initialize a system with timeout and health tracking
   */
  async initializeSystem(name, initFn, options = {}) {
    const { timeout = 10000, critical = false } = options;

    this.systemHealth[name].status = 'initializing';
    this.systemHealth[name].startTime = Date.now();

    try {
      // Race between initialization and timeout
      const result = await Promise.race([
        initFn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${name} initialization timed out after ${timeout}ms`)), timeout)
        )
      ]);

      this.systemHealth[name].status = 'ready';
      this.systemHealth[name].endTime = Date.now();
      const duration = this.systemHealth[name].endTime - this.systemHealth[name].startTime;
      this.logBoot(`${name} initialized in ${duration}ms`);

      return result;
    } catch (error) {
      this.systemHealth[name].status = 'failed';
      this.systemHealth[name].error = error.message;
      this.systemHealth[name].endTime = Date.now();

      if (critical) {
        console.error(`❌ Critical system ${name} failed:`, error);
        throw error;
      } else {
        console.warn(`⚠️  Optional system ${name} failed:`, error);
        console.warn(`   Application will continue without ${name}`);
        return null;
      }
    }
  }

  /**
   * Retry a failed system
   */
  async retrySystem(name) {
    if (!this.systemHealth[name]) {
      throw new Error(`Unknown system: ${name}`);
    }

    if (this.systemHealth[name].status !== 'failed') {
      console.log(`System ${name} is not in failed state, current status: ${this.systemHealth[name].status}`);
      return;
    }

    console.log(`Retrying ${name}...`);

    // Re-run the appropriate initialization based on system name
    try {
      if (name === 'tinesManager') {
        await this.initializeTines();
      } else if (name === 'midiModule') {
        await this.initializeMIDI();
      } else if (name === 'vscopeModule') {
        await this.initializeVScope();
      } else if (name === 'gamepadSystem') {
        await this.initializeGamepad();
      } else {
        throw new Error(`Retry not implemented for ${name}`);
      }
      console.log(`✓ ${name} retry successful`);
    } catch (error) {
      console.error(`✗ ${name} retry failed:`, error);
      throw error;
    }
  }

  /**
   * Get system status report
   */
  getSystemStatus() {
    const report = {
      phase: this.phase,
      systems: {},
      summary: {
        total: Object.keys(this.systemHealth).length,
        ready: 0,
        failed: 0,
        initializing: 0,
        uninitialized: 0
      }
    };

    for (const [name, health] of Object.entries(this.systemHealth)) {
      report.systems[name] = {
        status: health.status,
        error: health.error,
        critical: this.criticalSystems.includes(name),
        initTime: health.endTime && health.startTime
          ? `${health.endTime - health.startTime}ms`
          : null
      };
      report.summary[health.status]++;
    }

    return report;
  }

  /**
   * Print system status to console
   */
  printSystemStatus() {
    const status = this.getSystemStatus();

    console.log('\n=== VECTERM SYSTEM STATUS ===');
    console.log(`Boot Phase: ${status.phase}`);
    console.log(`\nSystems: ${status.summary.ready}/${status.summary.total} ready`);

    console.log('\n✓ Ready Systems:');
    Object.entries(status.systems)
      .filter(([_, s]) => s.status === 'ready')
      .forEach(([name, s]) => {
        const badge = s.critical ? '[CRITICAL]' : '[OPTIONAL]';
        console.log(`  ${badge} ${name} (${s.initTime})`);
      });

    if (status.summary.failed > 0) {
      console.log('\n✗ Failed Systems:');
      Object.entries(status.systems)
        .filter(([_, s]) => s.status === 'failed')
        .forEach(([name, s]) => {
          const badge = s.critical ? '[CRITICAL]' : '[OPTIONAL]';
          console.log(`  ${badge} ${name}: ${s.error}`);
        });
    }

    if (status.summary.initializing > 0) {
      console.log('\n⏳ Initializing:');
      Object.entries(status.systems)
        .filter(([_, s]) => s.status === 'initializing')
        .forEach(([name, _]) => console.log(`  - ${name}`));
    }

    console.log('\n=============================\n');
  }
}

// Create singleton instance
export const bootManager = new BootManager();

// Export convenience function
export async function bootApplication() {
  await bootManager.boot();
  return bootManager;
}
