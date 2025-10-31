/**
 * Event Handlers
 *
 * Sets up all DOM event listeners for UI controls.
 * Handles button clicks, toggles, and section collapse states.
 */

import * as Actions from '../core/actions.js';

/**
 * Initialize all event handlers
 *
 * @param {Object} store - Redux store
 * @param {Object} delayControl - Delay control object
 * @param {Object} savedUIState - Saved UI state from localStorage
 * @param {Function} cliLog - CLI logging function
 */
function initializeEventHandlers(store, delayControl, savedUIState, cliLog) {
  // Delay slider control
  const delaySlider = document.getElementById('delay');
  const delayValue = document.getElementById('delay-value');

  if (delaySlider && delayValue) {
    delaySlider.addEventListener('input', (e) => {
      delayControl.currentDelay = parseInt(e.target.value);
      delayValue.textContent = `${delayControl.currentDelay}ms`;
    });
  }

  // Toggle auth button
  const toggleAuthBtn = document.getElementById('toggle-auth');
  if (toggleAuthBtn) {
    toggleAuthBtn.addEventListener('click', () => {
      const state = store.getState();
      if (state.auth.isLoggedIn) {
        store.dispatch(Actions.logout());
      } else {
        store.dispatch(Actions.login('demo-user'));
      }
    });
  }

  // Sidebar collapse toggle
  const sidebarToggle = document.getElementById('sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      const sidebar = document.getElementById('right-sidebar');
      sidebar.classList.toggle('collapsed');
    });
  }

  // Section collapse toggles
  document.querySelectorAll('.section-title').forEach(title => {
    title.addEventListener('click', () => {
      const section = title.dataset.section;
      const content = document.getElementById(`${section}-content`);
      if (content) {
        content.classList.toggle('collapsed');

        // Dispatch to Redux to save state
        store.dispatch(Actions.toggleSection(section));
      }
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
      if (content) {
        content.classList.toggle('collapsed');
        title.classList.toggle('collapsed');

        // Update arrow indicator
        if (title.classList.contains('collapsed')) {
          title.textContent = title.textContent.replace('▼', '▶');
        } else {
          title.textContent = title.textContent.replace('▶', '▼');
        }

        // Dispatch to Redux to save state
        store.dispatch(Actions.toggleSubsection(subsection));
      }
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
  const saveConfigBtn = document.getElementById('save-config');
  if (saveConfigBtn) {
    saveConfigBtn.addEventListener('click', () => {
      store.dispatch(Actions.saveConfig());
      cliLog('Configuration saved to localStorage', 'success');
    });
  }

  const loadConfigBtn = document.getElementById('load-config');
  if (loadConfigBtn) {
    loadConfigBtn.addEventListener('click', () => {
      store.dispatch(Actions.loadConfig());
      cliLog('Configuration loaded from localStorage', 'success');
    });
  }

  const clearConfigBtn = document.getElementById('clear-config');
  if (clearConfigBtn) {
    clearConfigBtn.addEventListener('click', () => {
      localStorage.removeItem('redux-demo-full-state');
      localStorage.removeItem('redux-demo-ui-state');
      cliLog('Configuration cleared from localStorage', 'success');
      location.reload();
    });
  }

  // FAB: Toggle CLI
  const cliFab = document.getElementById('cli-fab');
  if (cliFab) {
    cliFab.addEventListener('click', () => {
      const panel = document.getElementById('cli-panel');
      panel.classList.toggle('hidden');
      if (!panel.classList.contains('hidden')) {
        panel.classList.remove('minimized');
        const cliInput = document.getElementById('cli-input');
        if (cliInput) cliInput.focus();
      }
    });
  }

  // Minimize button
  const cliMinimize = document.getElementById('cli-minimize');
  if (cliMinimize) {
    cliMinimize.addEventListener('click', () => {
      const panel = document.getElementById('cli-panel');
      panel.classList.toggle('minimized');
      const cliInput = document.getElementById('cli-input');
      if (cliInput) cliInput.focus();
    });
  }

  // Settings Panel Toggle
  const toggleSettings = document.getElementById('toggle-settings');
  if (toggleSettings) {
    toggleSettings.addEventListener('click', () => {
      const panel = document.getElementById('settings-panel');
      panel.classList.toggle('hidden');
    });
  }

  const settingsClose = document.getElementById('settings-close');
  if (settingsClose) {
    settingsClose.addEventListener('click', () => {
      const panel = document.getElementById('settings-panel');
      panel.classList.add('hidden');
    });
  }

  // Grid Toggle Button (top bar)
  const toggleGrid = document.getElementById('toggle-grid');
  if (toggleGrid) {
    toggleGrid.addEventListener('click', () => {
      const state = store.getState();
      const currentType = state.vecterm.grid.activeType;
      const newType = currentType === 'none' ? 'square' : 'none';
      store.dispatch(Actions.vectermSetGridType(newType));
    });
  }

  // Settings Panel - Grid Type Select
  const gridTypeSelect = document.getElementById('grid-type-select');
  if (gridTypeSelect) {
    gridTypeSelect.addEventListener('change', (e) => {
      store.dispatch(Actions.vectermSetGridType(e.target.value));
    });
  }

  // Settings Panel - Grid Visible Checkbox
  const gridVisibleCheckbox = document.getElementById('grid-visible-checkbox');
  if (gridVisibleCheckbox) {
    gridVisibleCheckbox.addEventListener('change', (e) => {
      const state = store.getState();
      const activeType = state.vecterm.grid.activeType;
      if (activeType !== 'none') {
        store.dispatch(Actions.vectermToggleGridVisible(activeType));
      }
    });
  }

  // Settings Panel - Glow Intensity
  const glowIntensity = document.getElementById('glow-intensity');
  const glowValue = document.getElementById('glow-value');
  if (glowIntensity && glowValue) {
    glowIntensity.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      glowValue.textContent = value.toFixed(1);
      store.dispatch(Actions.vectermSetConfig({ glowIntensity: value }));
    });
  }

  // Settings Panel - Scanline Intensity
  const scanlineIntensity = document.getElementById('scanline-intensity');
  const scanlineValue = document.getElementById('scanline-value');
  if (scanlineIntensity && scanlineValue) {
    scanlineIntensity.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      scanlineValue.textContent = value.toFixed(2);
      store.dispatch(Actions.vectermSetConfig({ scanlineIntensity: value }));
    });
  }

  // Settings Panel - Back-face Culling
  const backfaceCulling = document.getElementById('backface-culling-checkbox');
  if (backfaceCulling) {
    backfaceCulling.addEventListener('change', (e) => {
      store.dispatch(Actions.vectermSetConfig({ backfaceCulling: e.target.checked }));
    });
  }

  // Settings Panel - Hidden Line Removal
  const hiddenLineCheckbox = document.getElementById('hidden-line-checkbox');
  if (hiddenLineCheckbox) {
    hiddenLineCheckbox.addEventListener('change', (e) => {
      store.dispatch(Actions.vectermSetConfig({ hiddenLineRemoval: e.target.checked }));
    });
  }

  // Settings Panel - Camera FOV
  const cameraFov = document.getElementById('camera-fov');
  const fovValue = document.getElementById('fov-value');
  if (cameraFov && fovValue) {
    cameraFov.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      fovValue.textContent = `${value}°`;
      const state = store.getState();
      store.dispatch(Actions.vectermSetCamera({
        ...state.vecterm.camera,
        fov: value
      }));
    });
  }

  // Settings Panel - Camera Reset
  const cameraResetBtn = document.getElementById('camera-reset-btn');
  if (cameraResetBtn) {
    cameraResetBtn.addEventListener('click', () => {
      store.dispatch(Actions.vectermSetCamera({
        position: { x: 5, y: 5, z: 10 },
        target: { x: 0, y: 0, z: 0 },
        fov: 60,
        near: 0.1,
        far: 1000
      }));
      if (cameraFov) cameraFov.value = 60;
      if (fovValue) fovValue.textContent = '60°';
    });
  }

  // Settings Panel - Gamepad Enable/Disable
  const gamepadEnabledCheckbox = document.getElementById('gamepad-enabled-checkbox');
  if (gamepadEnabledCheckbox) {
    gamepadEnabledCheckbox.addEventListener('change', (e) => {
      const state = store.getState();
      if (state.gamepad.enabled !== e.target.checked) {
        store.dispatch(Actions.toggleGamepadEnabled());
      }
    });
  }

  // Settings Panel - Gamepad Preset Select
  const gamepadPresetSelect = document.getElementById('gamepad-preset-select');
  if (gamepadPresetSelect) {
    gamepadPresetSelect.addEventListener('change', (e) => {
      store.dispatch(Actions.loadGamepadPreset(e.target.value));
    });
  }

  // Update gamepad status in UI when state changes
  function updateGamepadStatus() {
    const state = store.getState();

    // Safety check: state might not be initialized yet
    if (!state || !state.gamepad) {
      return;
    }

    const gamepadState = state.gamepad;

    // Update connection indicator
    const gamepadStatus = document.getElementById('gamepad-status');
    if (gamepadStatus) {
      if (gamepadState.connected) {
        gamepadStatus.textContent = `Connected: ${gamepadState.connected.id}`;
        gamepadStatus.classList.add('connected');
        gamepadStatus.classList.remove('disconnected');
      } else {
        gamepadStatus.textContent = 'No gamepad connected';
        gamepadStatus.classList.add('disconnected');
        gamepadStatus.classList.remove('connected');
      }
    }

    // Update enabled checkbox
    if (gamepadEnabledCheckbox && gamepadState.enabled !== undefined) {
      gamepadEnabledCheckbox.checked = gamepadState.enabled;
    }

    // Update preset select
    if (gamepadPresetSelect && gamepadState.activePreset) {
      gamepadPresetSelect.value = gamepadState.activePreset;
    }
  }

  // Subscribe to store updates for gamepad status
  store.subscribe(() => {
    const state = store.getState();

    // Safety check: gamepad state might not be initialized yet
    if (!state.gamepad) {
      return;
    }

    const previousState = store.getState.__previousGamepadState || {};

    // Only update if gamepad state changed
    if (JSON.stringify(state.gamepad) !== JSON.stringify(previousState)) {
      updateGamepadStatus();
      store.getState.__previousGamepadState = { ...state.gamepad };
    }
  });

  // Initial update
  updateGamepadStatus();
}

/**
 * Initialize uptime counter
 */
function initializeUptimeCounter() {
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
}

export { initializeEventHandlers, initializeUptimeCounter };
