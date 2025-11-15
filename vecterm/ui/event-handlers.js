/**
 * Event Handlers
 *
 * Sets up all DOM event listeners for UI controls.
 * Handles button clicks, toggles, and section collapse states.
 */

import * as Actions from '../core/actions.js';
import { vt100Effects } from '../modules/vt100-effects.js';
import { designTokenEditor } from './components/design-token-editor.js';
import { Shapemaker } from '../games/shapemaker.js';
import { QuadrapongController } from '../games/quadrapong-controller.js';

/**
 * Initialize all event handlers
 *
 * @param {Object} store - Redux store
 * @param {Object} delayControl - Delay control object
 * @param {Object} savedUIState - Saved UI state from localStorage
 * @param {Function} cliLog - CLI logging function
 */
function initializeEventHandlers(store, delayControl, savedUIState, cliLog) {
  // Animation toggle control
  const animationToggle = document.getElementById('animation-toggle');
  if (animationToggle) {
    // IMPORTANT: Force animation OFF on page load for performance
    // This prevents Redux action throttling during gameplay
    animationToggle.checked = false;
    delayControl.animationEnabled = false;

    console.log('[ANIMATION TOGGLE] Initial state:', {
      checked: animationToggle.checked,
      animationEnabled: delayControl.animationEnabled
    });

    animationToggle.addEventListener('change', (e) => {
      delayControl.animationEnabled = e.target.checked;
      console.log('[ANIMATION TOGGLE] Changed:', {
        checked: e.target.checked,
        animationEnabled: delayControl.animationEnabled
      });
      cliLog(`Redux flow animation ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
    });
  }

  // Dispatch Redux Action button (demonstrates flow visualization)
  const testFlowBtn = document.getElementById('test-flow-animation');
  if (testFlowBtn) {
    testFlowBtn.addEventListener('click', () => {
      console.log('[REDUX DISPATCH] Dispatching action, animationEnabled:', delayControl.animationEnabled);
      // Dispatch an ADD_CANVAS_ITEM action (typical of what ECS systems do)
      store.dispatch(Actions.addCanvasItem(`Redux action dispatched at ${new Date().toLocaleTimeString()}`));

      if (delayControl.animationEnabled) {
        cliLog('Watch the State Flow diagram above ↑', 'info');
      } else {
        cliLog('Enable Flow Animation to see Redux pipeline visualization', 'info');
      }
    });
  }

  // Delay slider control
  const delaySlider = document.getElementById('delay');
  const delayValue = document.getElementById('delay-value');

  if (delaySlider && delayValue) {
    delaySlider.addEventListener('input', (e) => {
      delayControl.currentDelay = parseInt(e.target.value);
      delayValue.textContent = `${delayControl.currentDelay}ms`;
    });
  }

  // State Flow tab switching
  const stateFlowTabs = document.querySelectorAll('.state-flow-tab');
  const stateFlowTabContents = document.querySelectorAll('.state-flow-tab-content');

  stateFlowTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');

      // Update tab buttons
      stateFlowTabs.forEach(t => {
        t.classList.remove('active');
        t.style.color = '#666';
        t.style.borderBottomColor = 'transparent';
      });
      tab.classList.add('active');
      tab.style.color = '#4fc3f7';
      tab.style.borderBottomColor = '#4fc3f7';

      // Update tab content
      stateFlowTabContents.forEach(content => {
        const contentTab = content.getAttribute('data-tab-content');
        if (contentTab === tabName) {
          content.classList.add('active');
          content.style.display = 'block';
        } else {
          content.classList.remove('active');
          content.style.display = 'none';
        }
      });

      cliLog(`State Flow: ${tabName} tab`, 'info');
    });
  });

  // ECS Demo Canvas Setup
  const ecsDemoCanvas = document.getElementById('ecs-demo-canvas');
  const ecsDemoCtx = ecsDemoCanvas ? ecsDemoCanvas.getContext('2d') : null;

  // Track spawned entity positions for expand/collapse
  const spawnedEntityPositions = new Map(); // entityId -> {originalX, originalY}
  let spawnCounter = 0;

  // Render ECS demo canvas (wireframe with soapfilm glow)
  function renderECSDemoCanvas() {
    if (!ecsDemoCtx) return;

    const state = store.getState();
    const demoNamespace = state.namespaces.reduxCanvasDemo || { entities: [] };
    const demoEntities = demoNamespace.entities;

    // Clear with black background
    ecsDemoCtx.fillStyle = '#000';
    ecsDemoCtx.fillRect(0, 0, ecsDemoCanvas.width, ecsDemoCanvas.height);

    // Draw each entity with soapfilm wireframe style
    demoEntities.forEach(entity => {
      const { x, y, width, height, color } = entity;
      const radius = 8; // Rounded corner radius

      // Helper function to draw rounded rectangle path
      function roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        ctx.lineTo(x + radius, y + height);
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
      }

      // Very subtle inner glow (much less intense)
      ecsDemoCtx.save();
      roundRect(ecsDemoCtx, x, y, width, height, radius);
      ecsDemoCtx.clip();

      const gradient = ecsDemoCtx.createRadialGradient(
        x + width/2, y + height/2, 0,
        x + width/2, y + height/2, width * 0.5
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ', 0.08)'));

      ecsDemoCtx.fillStyle = gradient;
      ecsDemoCtx.fillRect(x - 10, y - 10, width + 20, height + 20);
      ecsDemoCtx.restore();

      // Main wireframe - bright thin line
      ecsDemoCtx.strokeStyle = color;
      ecsDemoCtx.lineWidth = 1.5;
      ecsDemoCtx.shadowColor = color;
      ecsDemoCtx.shadowBlur = 6;
      roundRect(ecsDemoCtx, x, y, width, height, radius);
      ecsDemoCtx.stroke();

      // Outer glow pass 1 - soft
      ecsDemoCtx.shadowBlur = 12;
      ecsDemoCtx.globalAlpha = 0.2;
      roundRect(ecsDemoCtx, x, y, width, height, radius);
      ecsDemoCtx.stroke();

      // Outer glow pass 2 - very soft
      ecsDemoCtx.shadowBlur = 20;
      ecsDemoCtx.globalAlpha = 0.1;
      roundRect(ecsDemoCtx, x, y, width, height, radius);
      ecsDemoCtx.stroke();

      ecsDemoCtx.globalAlpha = 1;
      ecsDemoCtx.shadowBlur = 0;
    });

    requestAnimationFrame(renderECSDemoCanvas);
  }

  // Start render loop for demo canvas
  if (ecsDemoCtx) {
    renderECSDemoCanvas();
  }

  // Spawn Demo Cube button (ECS tab) - NOT A SYSTEM
  const spawnCubeBtn = document.getElementById('spawn-demo-cube');

  if (spawnCubeBtn) {
    spawnCubeBtn.addEventListener('click', () => {
      // Mini canvas dimensions: 400x250
      const centerX = 200;
      const centerY = 125;
      const radius = 60; // Circle radius for positioning

      // Calculate position in circle pattern
      const angle = (spawnCounter * (Math.PI * 2)) / 8; // 8 positions around circle
      const x = centerX + Math.cos(angle) * radius - 25; // -25 to center 50px cube
      const y = centerY + Math.sin(angle) * radius - 25;

      const size = 50;
      const colors = ['#4fc3f7', '#00ff88', '#ff4444', '#ffa726', '#ab47bc'];
      const color = colors[spawnCounter % colors.length];

      const payload = {
        type: 'rect',
        x,
        y,
        width: size,
        height: size,
        color,
        layerId: 'layer-1',
        tags: ['reduxCanvasDemo', 'spawned']
      };

      store.dispatch({
        type: 'ADD_ENTITY',
        payload,
        namespace: 'reduxCanvasDemo'
      });

      const newState = store.getState();
      const demoNamespace = newState.namespaces.reduxCanvasDemo || { entities: [] };
      const newEntity = demoNamespace.entities[demoNamespace.entities.length - 1];

      // Store original position for expand functionality
      if (newEntity) {
        spawnedEntityPositions.set(newEntity.id, { originalX: x, originalY: y });
      }
      spawnCounter++;

      cliLog(`Entity #${spawnCounter} spawned - namespaces.reduxCanvasDemo (isolated)`, 'success');
    });
  }

  // Stack Cubes button - BATCH TRANSFORM (not a system)
  const stackCubesBtn = document.getElementById('stack-cubes');
  if (stackCubesBtn) {
    stackCubesBtn.addEventListener('click', () => {
      const state = store.getState();
      const demoNamespace = state.namespaces.reduxCanvasDemo || { entities: [] };
      const spawnedEntities = demoNamespace.entities.filter(e => e.tags?.includes('spawned'));

      // Stack at center of mini canvas
      const stackX = 200 - 25; // Center 50px cube
      const stackY = 125 - 25;

      spawnedEntities.forEach(entity => {
        store.dispatch({
          type: 'UPDATE_ENTITY',
          payload: {
            id: entity.id,
            updates: { x: stackX, y: stackY }
          },
          namespace: 'reduxCanvasDemo'
        });
      });

      cliLog(`Stacked ${spawnedEntities.length} entities - ${spawnedEntities.length} UPDATE_ENTITY to reduxCanvasDemo`, 'success');
    });
  }

  // Expand Cubes button - POSITION RESTORE (not a system)
  const expandCubesBtn = document.getElementById('expand-cubes');
  if (expandCubesBtn) {
    expandCubesBtn.addEventListener('click', () => {
      const state = store.getState();
      const demoNamespace = state.namespaces.reduxCanvasDemo || { entities: [] };
      const spawnedEntities = demoNamespace.entities.filter(e => e.tags?.includes('spawned'));

      spawnedEntities.forEach(entity => {
        const originalPos = spawnedEntityPositions.get(entity.id);
        if (originalPos) {
          store.dispatch({
            type: 'UPDATE_ENTITY',
            payload: {
              id: entity.id,
              updates: { x: originalPos.originalX, y: originalPos.originalY }
            },
            namespace: 'reduxCanvasDemo'
          });
        }
      });

      cliLog(`Expanded ${spawnedEntities.length} entities - ${spawnedEntities.length} UPDATE_ENTITY to reduxCanvasDemo`, 'success');
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

  // Right sidebar collapse toggle
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const rightSidebar = document.getElementById('right-sidebar');

  if (sidebarToggle && rightSidebar) {
    // Restore sidebar state from Redux store
    if (savedUIState && savedUIState.sidebarCollapsed) {
      rightSidebar.classList.add('collapsed');
      console.log('[RIGHT SIDEBAR] Restored collapsed state from Redux');
    }

    // Toggle handler - dispatch Redux action
    sidebarToggle.addEventListener('click', () => {
      // Dispatch Redux action to update state
      store.dispatch(Actions.toggleSidebar());

      // Redux reducer will toggle sidebarCollapsed
      // Middleware will save to localStorage
      // We need to subscribe to apply it to DOM
    });

    // Subscribe to Redux state changes for right sidebar
    store.subscribe(() => {
      const state = store.getState();
      const shouldBeCollapsed = state.uiState?.sidebarCollapsed || false;
      const isCollapsed = rightSidebar.classList.contains('collapsed');

      if (shouldBeCollapsed && !isCollapsed) {
        rightSidebar.classList.add('collapsed');
        console.log('[RIGHT SIDEBAR] Collapsed via Redux');
      } else if (!shouldBeCollapsed && isCollapsed) {
        rightSidebar.classList.remove('collapsed');
        console.log('[RIGHT SIDEBAR] Expanded via Redux');
      }
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

  // System Settings section collapse toggle
  document.querySelectorAll('.settings-title.collapsible').forEach(title => {
    title.addEventListener('click', () => {
      const section = title.dataset.settingsSection;
      const content = document.getElementById(`settings-${section}`);
      if (content) {
        content.classList.toggle('collapsed');
        title.classList.toggle('collapsed');

        // Update arrow indicator
        if (title.classList.contains('collapsed')) {
          title.textContent = title.textContent.replace('▼', '▶');
        } else {
          title.textContent = title.textContent.replace('▶', '▼');
        }

        // Save state to Redux with settings- prefix to distinguish from main sections
        store.dispatch(Actions.toggleSection(`settings-${section}`));
      }
    });
  });

  // Restore System Settings section collapsed states from localStorage
  if (savedUIState && savedUIState.sectionsCollapsed) {
    Object.keys(savedUIState.sectionsCollapsed).forEach(section => {
      // Only process settings- prefixed sections
      if (section.startsWith('settings-') && savedUIState.sectionsCollapsed[section]) {
        const sectionName = section.replace('settings-', '');
        const content = document.getElementById(`settings-${sectionName}`);
        const title = document.querySelector(`[data-settings-section="${sectionName}"]`);
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

  // FAB: Toggle CLI with CRT power-off animation
  const cliFab = document.getElementById('cli-fab');
  if (cliFab) {
    cliFab.addEventListener('click', () => {
      const panel = document.getElementById('cli-panel');

      if (panel.classList.contains('hidden')) {
        // Opening: Just remove hidden and let CSS animation play
        panel.classList.remove('hidden');
        panel.classList.remove('minimized');
        panel.classList.remove('closing');
        const cliInput = document.getElementById('cli-input');
        if (cliInput) cliInput.focus();
      } else {
        // Closing: Play power-off animation first
        panel.classList.add('closing');
        // Get dynamic duration from CSS variable
        const duration = parseFloat(getComputedStyle(panel).getPropertyValue('--vt100-poweroff-duration')) * 1000 || 600;
        setTimeout(() => {
          panel.classList.add('hidden');
          panel.classList.remove('closing');
        }, duration);
      }
    });
  }

  // Game Controllers
  const shapemakerGame = new Shapemaker(store);
  const quadrapongController = new QuadrapongController(store);

  // Game FAB: Toggle Game Panel
  const gameFab = document.getElementById('game-fab');
  const gamePanel = document.getElementById('game-panel');
  if (gameFab && gamePanel) {
    // Restore panel size from localStorage
    const savedSize = localStorage.getItem('vecterm-game-panel-size');
    if (savedSize) {
      const { width, height } = JSON.parse(savedSize);
      gamePanel.style.width = width;
      gamePanel.style.height = height;
    }

    // Save panel size on resize
    const resizeObserver = new ResizeObserver(() => {
      const size = {
        width: gamePanel.style.width || '320px',
        height: gamePanel.style.height || '400px'
      };
      localStorage.setItem('vecterm-game-panel-size', JSON.stringify(size));
    });
    resizeObserver.observe(gamePanel);

    gameFab.addEventListener('click', () => {
      gamePanel.classList.toggle('hidden');
    });

    // Close button in game panel
    const gamePanelClose = document.getElementById('game-panel-close');
    if (gamePanelClose) {
      gamePanelClose.addEventListener('click', () => {
        gamePanel.classList.add('hidden');
      });
    }

    // Game start buttons
    const gameStartButtons = document.querySelectorAll('.game-start-btn');
    gameStartButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const gameId = btn.dataset.game;
        console.log('[GAME FAB] Starting game:', gameId);

        if (gameId === 'quadrapong') {
          // Start Quadrapong via CLI command
          if (window.processCLICommand) {
            await window.processCLICommand('quadrapong');
          }
          showGameView('quadrapong');
        } else if (gameId === 'shapemaker') {
          // Start Shapemaker
          shapemakerGame.start();
          showGameView('shapemaker');
        }
      });
    });

    // Quadrapong Terminal Input
    const quadrapongInput = document.getElementById('quadrapong-input');
    if (quadrapongInput) {
      quadrapongInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const command = quadrapongInput.value.trim();
          if (command) {
            quadrapongController.processCommand(command);
            quadrapongInput.value = '';
          }
        }
      });

      // Click help commands to insert
      document.querySelectorAll('#quadrapong-view .game-help-cmd').forEach(cmd => {
        cmd.addEventListener('click', () => {
          quadrapongInput.value = cmd.textContent.trim();
          quadrapongInput.focus();
        });
      });
    }

    // Shapemaker Terminal Input
    const shapemakerInput = document.getElementById('shapemaker-input');
    if (shapemakerInput) {
      shapemakerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const command = shapemakerInput.value.trim();
          if (command) {
            shapemakerGame.processCommand(command);
            shapemakerInput.value = '';
          }
        }
      });

      // Click help commands to insert
      document.querySelectorAll('#shapemaker-view .game-help-cmd').forEach(cmd => {
        cmd.addEventListener('click', () => {
          shapemakerInput.value = cmd.textContent.trim();
          shapemakerInput.focus();
        });
      });
    }
  }

  // Helper: Switch game panel view based on active game
  function showGameView(gameId) {
    const gameSelectView = document.getElementById('game-select-view');
    const quadrapongView = document.getElementById('quadrapong-view');
    const shapemakerView = document.getElementById('shapemaker-view');
    const gamePanelTitle = document.getElementById('game-panel-title');
    const gameTabs = document.getElementById('game-tabs');

    // Hide all views first
    if (gameSelectView) gameSelectView.classList.add('hidden');
    if (quadrapongView) quadrapongView.classList.add('hidden');
    if (shapemakerView) shapemakerView.classList.add('hidden');

    if (!gameId) {
      // Show game selection
      if (gameSelectView) gameSelectView.classList.remove('hidden');
      if (gamePanelTitle) gamePanelTitle.textContent = '[ GAME SELECT ]';
      if (gameTabs) gameTabs.classList.add('hidden');
    } else if (gameId === 'quadrapong') {
      // Show Quadrapong terminal
      if (quadrapongView) quadrapongView.classList.remove('hidden');
      if (gamePanelTitle) gamePanelTitle.textContent = '[ QUADRAPONG ]';
      if (gameTabs) gameTabs.classList.remove('hidden');
      // Show CLI tab by default
      switchGameTab('quadrapong', 'cli');
      // Focus input
      const input = document.getElementById('quadrapong-input');
      if (input) setTimeout(() => input.focus(), 100);
    } else if (gameId === 'shapemaker') {
      // Show Shapemaker terminal
      if (shapemakerView) shapemakerView.classList.remove('hidden');
      if (gamePanelTitle) gamePanelTitle.textContent = '[ SHAPEMAKER ]';
      if (gameTabs) gameTabs.classList.remove('hidden');
      // Show CLI tab by default
      switchGameTab('shapemaker', 'cli');
      // Focus input
      const input = document.getElementById('shapemaker-input');
      if (input) setTimeout(() => input.focus(), 100);
    }
  }

  // Helper: Switch tabs within game view
  function switchGameTab(gameId, tabName) {
    console.log('[TAB SYSTEM] switchGameTab called:', gameId, tabName);

    // Get the parent view for this game
    const gameView = document.getElementById(`${gameId}-view`);
    if (!gameView) {
      console.warn('[TAB SYSTEM] Game view not found:', `${gameId}-view`);
      return;
    }

    // Update tab buttons
    const tabButtons = document.querySelectorAll('.game-tab');
    console.log('[TAB SYSTEM] Updating', tabButtons.length, 'tab buttons');
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update tab content
    const tabContents = gameView.querySelectorAll('.game-tab-content');
    console.log('[TAB SYSTEM] Found', tabContents.length, 'tab contents in', gameId);
    tabContents.forEach(content => {
      const contentTab = content.dataset.tabContent;
      if (contentTab === tabName) {
        content.classList.add('active');
        console.log('[TAB SYSTEM] Activated tab:', contentTab);
      } else {
        content.classList.remove('active');
      }
    });

    // Update ECS views if switching to ECS tabs
    if (['entities', 'components', 'systems'].includes(tabName)) {
      updateECSViews(gameId);
    }
  }

  // Tab switching handlers
  const tabButtons = document.querySelectorAll('.game-tab');
  console.log('[TAB SYSTEM] Found', tabButtons.length, 'tab buttons');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      const state = store.getState();
      const activeGame = state.games?.activeGame;

      console.log('[TAB SYSTEM] Tab clicked:', tabName, 'Active game:', activeGame);

      if (activeGame) {
        switchGameTab(activeGame, tabName);
      }
    });
  });

  // Tines Sound Library Handlers
  function setupTinesSoundLibrary(gameId) {
    const soundsContainer = document.getElementById(`${gameId}-sounds`);
    if (!soundsContainer) return;

    // Load saved sounds from localStorage
    const savedSounds = localStorage.getItem(`vecterm-${gameId}-sounds`);
    if (savedSounds) {
      try {
        const sounds = JSON.parse(savedSounds);
        sounds.forEach((sound, index) => {
          if (index === 0) {
            // Update first item
            const firstItem = soundsContainer.querySelector('.tines-sound-item');
            if (firstItem) {
              firstItem.querySelector('.tines-sound-name').value = sound.name;
              firstItem.querySelector('.tines-sound-pattern').value = sound.pattern;
            }
          } else {
            // Add new items
            addTinesSound(gameId, sound.name, sound.pattern);
          }
        });
      } catch (e) {
        console.error('[TINES] Failed to load sounds:', e);
      }
    }

    // Test button handlers
    soundsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('tines-sound-test')) {
        const item = e.target.closest('.tines-sound-item');
        const pattern = item.querySelector('.tines-sound-pattern').value;
        if (pattern && window.processCLICommand) {
          window.processCLICommand(`tines.play ${pattern}`);
        }
      }
    });

    // Save button handlers
    soundsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('tines-sound-save')) {
        saveTinesSounds(gameId);
      }
    });

    // Add sound button
    const addSoundBtn = document.getElementById(`${gameId}-add-sound`);
    if (addSoundBtn) {
      addSoundBtn.addEventListener('click', () => {
        addTinesSound(gameId, '', '');
      });
    }
  }

  function addTinesSound(gameId, name = '', pattern = '') {
    const soundsContainer = document.getElementById(`${gameId}-sounds`);
    if (!soundsContainer) return;

    const item = document.createElement('div');
    item.className = 'tines-sound-item';
    item.innerHTML = `
      <input type="text" class="tines-sound-name" placeholder="sound_name" value="${name}" />
      <input type="text" class="tines-sound-pattern" placeholder="note('c4').s('triangle')" value="${pattern}" />
      <button class="tines-sound-test">▶</button>
      <button class="tines-sound-save">Save</button>
    `;
    soundsContainer.appendChild(item);
  }

  function saveTinesSounds(gameId) {
    const soundsContainer = document.getElementById(`${gameId}-sounds`);
    if (!soundsContainer) return;

    const items = soundsContainer.querySelectorAll('.tines-sound-item');
    const sounds = [];

    items.forEach(item => {
      const name = item.querySelector('.tines-sound-name').value.trim();
      const pattern = item.querySelector('.tines-sound-pattern').value.trim();
      if (name && pattern) {
        sounds.push({ name, pattern });
      }
    });

    localStorage.setItem(`vecterm-${gameId}-sounds`, JSON.stringify(sounds));
    console.log(`[TINES] Saved ${sounds.length} sounds for ${gameId}`);

    // Update trigger dropdowns
    updateTinesTriggerOptions(gameId, sounds);

    // Show feedback
    if (window.cliLog) {
      window.cliLog(`Saved ${sounds.length} Tines sounds`, 'success');
    }
  }

  function updateTinesTriggerOptions(gameId, sounds) {
    const triggers = document.querySelectorAll(`#${gameId}-view .tines-trigger-sound`);
    triggers.forEach(select => {
      const currentValue = select.value;
      select.innerHTML = '<option value="">No sound</option>';
      sounds.forEach(sound => {
        const option = document.createElement('option');
        option.value = sound.name;
        option.textContent = sound.name;
        if (sound.name === currentValue) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    });
  }

  // Initialize Tines for both games
  setupTinesSoundLibrary('quadrapong');
  setupTinesSoundLibrary('shapemaker');

  // ECS View Population
  function updateECSViews(gameId) {
    // Get ECS instance from game controller
    let ecsGame = null;
    if (gameId === 'quadrapong' && quadrapongController.getECS) {
      ecsGame = quadrapongController.getECS();
    }

    if (!ecsGame) return;

    // Update Entities tab
    const entitiesContainer = document.querySelector(`#${gameId}-view [data-tab-content="entities"] .ecs-list`);
    if (entitiesContainer) {
      const entities = ecsGame.getAllEntities();
      entitiesContainer.innerHTML = '';

      entities.forEach(entity => {
        const item = document.createElement('div');
        item.className = 'ecs-entity-item';

        const components = Object.keys(entity).filter(k => k !== 'id');
        const tags = entity.tags?.tags ? Array.from(entity.tags.tags).join(', ') : '';

        item.innerHTML = `
          <div class="ecs-entity-name">${entity.id}${tags ? ` [${tags}]` : ''}</div>
          <div class="ecs-component-list">${components.join(', ')}</div>
        `;

        entitiesContainer.appendChild(item);
      });
    }

    // Update Components tab
    const componentsContainer = document.querySelector(`#${gameId}-view [data-tab-content="components"] .ecs-list`);
    if (componentsContainer) {
      const componentMap = ecsGame.getEntitiesByComponent();
      componentsContainer.innerHTML = '';

      Object.keys(componentMap).sort().forEach(componentName => {
        const count = componentMap[componentName].length;
        const item = document.createElement('div');
        item.className = 'ecs-entity-item';

        item.innerHTML = `
          <div class="ecs-entity-name">${componentName}</div>
          <div class="ecs-component-list">${count} entities</div>
        `;

        componentsContainer.appendChild(item);
      });
    }

    // Update Systems tab
    const systemsContainer = document.querySelector(`#${gameId}-view [data-tab-content="systems"] .ecs-list`);
    if (systemsContainer) {
      const systems = ecsGame.getSystems();
      systemsContainer.innerHTML = '';

      systems.forEach(system => {
        const item = document.createElement('div');
        item.className = 'ecs-entity-item';

        item.innerHTML = `
          <div class="ecs-entity-name">${system.name}</div>
          <div class="ecs-component-list">${system.enabled ? 'Enabled' : 'Disabled'}</div>
        `;

        systemsContainer.appendChild(item);
      });
    }
  }

  // Subscribe to Redux store to update game panel when game state changes
  if (store) {
    store.subscribe(() => {
      const state = store.getState();
      const activeGame = state.games?.activeGame;

      // Update game view based on active game
      if (activeGame) {
        showGameView(activeGame);
      } else {
        showGameView(null);
      }

      // Update Quadrapong scores if in game
      if (activeGame === 'quadrapong' && state.games?.quadrapong) {
        const scores = state.games.quadrapong.scores || {};
        const p1Score = document.getElementById('quadrapong-score-p1');
        const p2Score = document.getElementById('quadrapong-score-p2');
        const p3Score = document.getElementById('quadrapong-score-p3');
        const p4Score = document.getElementById('quadrapong-score-p4');

        if (p1Score) p1Score.textContent = scores.p1 || 0;
        if (p2Score) p2Score.textContent = scores.p2 || 0;
        if (p3Score) p3Score.textContent = scores.p3 || 0;
        if (p4Score) p4Score.textContent = scores.p4 || 0;
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

  // Settings Button (in top bar)
  const canvasSettingsBtn = document.getElementById('canvas-settings-btn');

  if (canvasSettingsBtn) {
    // Simple click to toggle settings panel
    canvasSettingsBtn.addEventListener('click', () => {
      const panel = document.getElementById('settings-panel');
      if (panel) {
        panel.classList.toggle('hidden');
        console.log('[SETTINGS] Panel toggled:', !panel.classList.contains('hidden'));
      }
    });
  }

  const settingsClose = document.getElementById('settings-close');
  if (settingsClose) {
    settingsClose.addEventListener('click', () => {
      const panel = document.getElementById('settings-panel');
      panel.classList.add('hidden');
    });
  }

  // Make Settings Panel Draggable
  const settingsPanel = document.getElementById('settings-panel');
  const panelHeader = settingsPanel ? settingsPanel.querySelector('.panel-header') : null;

  if (settingsPanel && panelHeader) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    panelHeader.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
      if (e.target.closest('.minimize-btn')) return; // Don't drag when clicking close button

      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === panelHeader || panelHeader.contains(e.target)) {
        isDragging = true;
        settingsPanel.classList.add('dragging');
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        setTranslate(currentX, currentY, settingsPanel);
      }
    }

    function dragEnd(e) {
      initialX = currentX;
      initialY = currentY;

      isDragging = false;
      settingsPanel.classList.remove('dragging');
    }

    function setTranslate(xPos, yPos, el) {
      el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }
  }

  // Design Token Editor - delegate to component
  designTokenEditor.initialize();

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

  // MIDI Controller Buttons
  const midiShowController = document.getElementById('midi-show-controller');
  if (midiShowController) {
    midiShowController.addEventListener('click', () => {
      if (window.Vecterm && window.Vecterm.MIDI) {
        window.Vecterm.MIDI.toggleVisual();
      }
      // Silent if not available - MIDI is optional
    });
  }

  const midiStatus = document.getElementById('midi-status');
  if (midiStatus) {
    midiStatus.addEventListener('click', () => {
      if (window.Vecterm && window.Vecterm.MIDI) {
        window.Vecterm.MIDI.status();
      }
      // Silent if not available - MIDI is optional
    });
  }

  // Subscribe to MIDI state changes to update sidebar
  store.subscribe(() => {
    const state = store.getState();
    if (!state.midi) {
      console.log('[MIDI UI] No MIDI state in Redux');
      return;
    }

    // Update device list
    const deviceList = document.getElementById('midi-device-list');
    if (deviceList) {
      const devices = state.midi.devices.inputs;
      // Only log on device count change, not every update
      if (devices.length === 0) {
        deviceList.textContent = 'No MIDI devices detected';
        deviceList.style.color = '#666';
      } else {
        deviceList.innerHTML = devices.map(d =>
          `<div style="color: #0f0; margin: 2px 0;">${d.name}</div>`
        ).join('');
      }
    }

    // Update mappings list
    const mappingList = document.getElementById('midi-mapping-list');
    if (mappingList) {
      const mappings = state.midi.mappings;
      const entries = Object.entries(mappings);
      if (entries.length === 0) {
        mappingList.textContent = 'No mappings';
        mappingList.style.color = '#666';
      } else {
        mappingList.innerHTML = entries.map(([control, param]) =>
          `<div style="color: #0ff; margin: 2px 0; font-size: 11px;">
            ${control} → ${param}
          </div>`
        ).join('');
      }
    }

    // Update show/hide button text
    const showBtn = document.getElementById('midi-show-controller');
    if (showBtn) {
      showBtn.textContent = state.midi.visual.visible ? 'Hide Controller' : 'Show Controller';
    }
  });

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
      vt100Effects.setEffect('glow', value);
      store.dispatch(Actions.vectermSetConfig({ glowIntensity: value }));
    });
  }

  // Settings Panel - Scanline Intensity
  const scanlineIntensity = document.getElementById('scanline-intensity');
  const scanlineValue = document.getElementById('scanline-value');
  if (scanlineIntensity && scanlineValue) {
    scanlineIntensity.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      vt100Effects.setEffect('scanlines', value);
      store.dispatch(Actions.vectermSetConfig({ scanlineIntensity: value }));
    });
  }

  // Settings Panel - Scanline Speed
  const scanlineSpeed = document.getElementById('scanline-speed');
  if (scanlineSpeed) {
    scanlineSpeed.addEventListener('input', (e) => {
      vt100Effects.setEffect('scanspeed', parseFloat(e.target.value));
    });
  }

  // Settings Panel - Wave Amplitude
  const waveAmplitude = document.getElementById('wave-amplitude');
  if (waveAmplitude) {
    waveAmplitude.addEventListener('input', (e) => {
      vt100Effects.setEffect('wave', parseFloat(e.target.value));
    });
  }

  // Settings Panel - Wave Speed
  const waveSpeed = document.getElementById('wave-speed');
  if (waveSpeed) {
    waveSpeed.addEventListener('input', (e) => {
      vt100Effects.setEffect('wavespeed', parseFloat(e.target.value));
    });
  }

  // Settings Panel - Wave Opacity
  const waveOpacity = document.getElementById('wave-opacity');
  if (waveOpacity) {
    waveOpacity.addEventListener('input', (e) => {
      vt100Effects.setEffect('waveopacity', parseFloat(e.target.value));
    });
  }

  // Settings Panel - Border Glow
  const borderGlow = document.getElementById('border-glow');
  if (borderGlow) {
    borderGlow.addEventListener('input', (e) => {
      vt100Effects.setEffect('border', parseFloat(e.target.value));
    });
  }

  // Settings Panel - Glow Pulse Speed
  const glowPulseSpeed = document.getElementById('glow-pulse-speed');
  if (glowPulseSpeed) {
    glowPulseSpeed.addEventListener('input', (e) => {
      vt100Effects.setEffect('glowspeed', parseFloat(e.target.value));
    });
  }

  // Settings Panel - Border Width
  const borderWidth = document.getElementById('border-width');
  if (borderWidth) {
    borderWidth.addEventListener('input', (e) => {
      vt100Effects.setEffect('borderwidth', parseFloat(e.target.value));
    });
  }

  // Settings Panel - Power-On Speed
  const poweronSpeed = document.getElementById('poweron-speed');
  if (poweronSpeed) {
    poweronSpeed.addEventListener('input', (e) => {
      vt100Effects.setEffect('poweronspeed', parseFloat(e.target.value));
    });
  }

  // Settings Panel - Power-Off Speed
  const poweroffSpeed = document.getElementById('poweroff-speed');
  if (poweroffSpeed) {
    poweroffSpeed.addEventListener('input', (e) => {
      vt100Effects.setEffect('poweroffspeed', parseFloat(e.target.value));
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

  // Settings Panel - Toggle Sidebar
  const settingsToggleSidebar = document.getElementById('settings-toggle-sidebar');
  if (settingsToggleSidebar) {
    settingsToggleSidebar.addEventListener('click', () => {
      const sidebar = document.getElementById('right-sidebar');
      if (sidebar) {
        sidebar.classList.toggle('collapsed');
      }
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

    // Also update session uptime in left sidebar
    const sessionUptimeEl = document.getElementById('session-uptime');
    if (sessionUptimeEl) {
      sessionUptimeEl.textContent = `${hours}:${minutes}:${seconds}`;
    }
  }

  setInterval(updateUptime, 1000);
  updateUptime();
}

/**
 * Initialize left sidebar event handlers
 */
function initializeLeftSidebar(store, cliLog) {
  console.log('[LEFT SIDEBAR] Initializing...');

  // Left sidebar toggle
  const leftSidebarToggle = document.getElementById('left-sidebar-toggle');
  const leftSidebar = document.getElementById('left-sidebar');

  if (leftSidebarToggle && leftSidebar) {
    leftSidebarToggle.addEventListener('click', () => {
      leftSidebar.classList.toggle('collapsed');

      // Update button text
      if (leftSidebar.classList.contains('collapsed')) {
        leftSidebarToggle.textContent = '▶';
      } else {
        leftSidebarToggle.textContent = '◀';
      }

      // Save state to localStorage
      const isCollapsed = leftSidebar.classList.contains('collapsed');
      localStorage.setItem('vecterm-left-sidebar-collapsed', isCollapsed);
      console.log('[LEFT SIDEBAR] Toggled:', isCollapsed ? 'collapsed' : 'expanded');
    });
  }

  // Restore left sidebar collapsed state
  const leftSidebarCollapsed = localStorage.getItem('vecterm-left-sidebar-collapsed');
  if (leftSidebarCollapsed === 'true' && leftSidebar) {
    leftSidebar.classList.add('collapsed');
    if (leftSidebarToggle) {
      leftSidebarToggle.textContent = '▶';
    }
    console.log('[LEFT SIDEBAR] Restored collapsed state');
  }

  // Subsection collapse toggles - use event delegation for better reliability
  const subsectionTitles = document.querySelectorAll('.subsection-title.collapsible');
  console.log('[LEFT SIDEBAR] Found', subsectionTitles.length, 'collapsible subsections');

  subsectionTitles.forEach(title => {
    title.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const subsection = title.dataset.subsection;
      const content = document.getElementById(`subsection-${subsection}`);

      console.log('[LEFT SIDEBAR] Clicked subsection:', subsection, 'content:', content);

      if (content) {
        const isCollapsed = content.classList.toggle('collapsed');
        title.classList.toggle('collapsed');

        // Update arrow indicator - preserve the text but change arrow
        const text = title.textContent.trim();
        if (isCollapsed) {
          title.textContent = text.replace('▼', '▶');
        } else {
          title.textContent = text.replace('▶', '▼');
        }

        // Save collapsed state
        const collapsedState = JSON.parse(localStorage.getItem('vecterm-subsections-collapsed') || '{}');
        collapsedState[subsection] = isCollapsed;
        localStorage.setItem('vecterm-subsections-collapsed', JSON.stringify(collapsedState));

        console.log('[LEFT SIDEBAR] Subsection', subsection, isCollapsed ? 'collapsed' : 'expanded');
      } else {
        console.warn('[LEFT SIDEBAR] Content not found for subsection:', subsection);
      }
    });
  });

  // Restore subsection collapsed states
  const subsectionsCollapsed = JSON.parse(localStorage.getItem('vecterm-subsections-collapsed') || '{}');
  console.log('[LEFT SIDEBAR] Restoring subsection states:', subsectionsCollapsed);

  Object.keys(subsectionsCollapsed).forEach(subsection => {
    if (subsectionsCollapsed[subsection]) {
      const content = document.getElementById(`subsection-${subsection}`);
      const title = document.querySelector(`.subsection-title[data-subsection="${subsection}"]`);
      if (content && title) {
        content.classList.add('collapsed');
        title.classList.add('collapsed');
        const text = title.textContent.trim();
        title.textContent = text.replace('▼', '▶');
      }
    }
  });

  // Game camera controls
  const gameCameraFov = document.getElementById('game-camera-fov');
  const gameFovValue = document.getElementById('game-fov-value');
  if (gameCameraFov && gameFovValue) {
    gameCameraFov.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      gameFovValue.textContent = `${value}°`;
      // Sync with main camera FOV control
      const mainCameraFov = document.getElementById('camera-fov');
      if (mainCameraFov) {
        mainCameraFov.value = value;
        document.getElementById('fov-value').textContent = `${value}°`;
      }
      if (cliLog) {
        cliLog(`Game camera FOV: ${value}°`, 'info');
      }
    });
  }

  const gameCameraReset = document.getElementById('game-camera-reset');
  if (gameCameraReset) {
    gameCameraReset.addEventListener('click', () => {
      if (gameCameraFov) {
        gameCameraFov.value = 60;
        gameFovValue.textContent = '60°';
      }
      if (cliLog) {
        cliLog('Game camera reset to defaults', 'success');
      }
    });
  }

  // Game VT100 effect sliders (game.vt100.* namespace)
  const gameGlow = document.getElementById('game-glow');
  const gameGlowValue = document.getElementById('game-glow-value');
  if (gameGlow && gameGlowValue) {
    gameGlow.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      gameGlowValue.textContent = value.toFixed(2);
      // TODO: Apply to game canvas when game.vt100 effects are implemented
      if (cliLog) {
        cliLog(`Game glow: ${value.toFixed(2)}`, 'info');
      }
    });
  }

  const gameScanlines = document.getElementById('game-scanlines');
  const gameScanlinesValue = document.getElementById('game-scanlines-value');
  if (gameScanlines && gameScanlinesValue) {
    gameScanlines.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      gameScanlinesValue.textContent = value.toFixed(2);
      if (cliLog) {
        cliLog(`Game scanlines: ${value.toFixed(2)}`, 'info');
      }
    });
  }

  const gameWave = document.getElementById('game-wave');
  const gameWaveValue = document.getElementById('game-wave-value');
  if (gameWave && gameWaveValue) {
    gameWave.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      gameWaveValue.textContent = `${value}px`;
      if (cliLog) {
        cliLog(`Game wave: ${value}px`, 'info');
      }
    });
  }

  // Left sidebar grid controls (sync with main grid controls)
  const leftGridType = document.getElementById('left-grid-type');
  if (leftGridType) {
    leftGridType.addEventListener('change', (e) => {
      const mainGridType = document.getElementById('grid-type-select');
      if (mainGridType) {
        mainGridType.value = e.target.value;
        mainGridType.dispatchEvent(new Event('change'));
      }
    });
  }

  const leftGridVisible = document.getElementById('left-grid-visible');
  if (leftGridVisible) {
    leftGridVisible.addEventListener('change', (e) => {
      const mainGridVisible = document.getElementById('grid-visible-checkbox');
      if (mainGridVisible) {
        mainGridVisible.checked = e.target.checked;
        mainGridVisible.dispatchEvent(new Event('change'));
      }
    });
  }

  const leftGridSnap = document.getElementById('left-grid-snap');
  if (leftGridSnap) {
    leftGridSnap.addEventListener('change', (e) => {
      const mainGridSnap = document.getElementById('grid-snap-checkbox');
      if (mainGridSnap) {
        mainGridSnap.checked = e.target.checked;
        mainGridSnap.dispatchEvent(new Event('change'));
      }
    });
  }

  // Terminal VT100 sliders (sync with main VT100 controls)
  const terminalGlow = document.getElementById('terminal-glow');
  const terminalGlowValue = document.getElementById('terminal-glow-value');
  if (terminalGlow && terminalGlowValue) {
    terminalGlow.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      terminalGlowValue.textContent = value.toFixed(2);
      // Sync with main glow slider
      const mainGlow = document.getElementById('glow-intensity');
      if (mainGlow) {
        mainGlow.value = value;
        document.getElementById('glow-value').textContent = value.toFixed(2);
        mainGlow.dispatchEvent(new Event('input'));
      }
    });
  }

  const terminalScanlines = document.getElementById('terminal-scanlines');
  const terminalScanlinesValue = document.getElementById('terminal-scanlines-value');
  if (terminalScanlines && terminalScanlinesValue) {
    terminalScanlines.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      terminalScanlinesValue.textContent = value.toFixed(2);
      const mainScanlines = document.getElementById('scanline-intensity');
      if (mainScanlines) {
        mainScanlines.value = value;
        document.getElementById('scanline-value').textContent = value.toFixed(2);
        mainScanlines.dispatchEvent(new Event('input'));
      }
    });
  }

  const terminalWave = document.getElementById('terminal-wave');
  const terminalWaveValue = document.getElementById('terminal-wave-value');
  if (terminalWave && terminalWaveValue) {
    terminalWave.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      terminalWaveValue.textContent = `${value}px`;
      const mainWave = document.getElementById('wave-amplitude');
      if (mainWave) {
        mainWave.value = value;
        document.getElementById('wave-value').textContent = `${value}px`;
        mainWave.dispatchEvent(new Event('input'));
      }
    });
  }

  // Open all VT100 settings button
  const openAllVT100 = document.getElementById('open-all-vt100');
  if (openAllVT100) {
    openAllVT100.addEventListener('click', () => {
      const settingsPanel = document.getElementById('settings-panel');
      if (settingsPanel) {
        settingsPanel.classList.remove('hidden');
        // Expand VT100 section
        const vt100Content = document.getElementById('settings-vt100');
        const vt100Title = document.querySelector('.settings-title[data-settings-section="vt100"]');
        if (vt100Content && vt100Title) {
          vt100Content.classList.remove('collapsed');
          vt100Title.classList.remove('collapsed');
          vt100Title.textContent = vt100Title.textContent.replace('▶', '▼');
        }
      }
    });
  }

  // Left sidebar gamepad controls (sync with main gamepad controls)
  const leftGamepadEnabled = document.getElementById('left-gamepad-enabled');
  if (leftGamepadEnabled) {
    leftGamepadEnabled.addEventListener('change', (e) => {
      const mainGamepadEnabled = document.getElementById('gamepad-enabled-checkbox');
      if (mainGamepadEnabled) {
        mainGamepadEnabled.checked = e.target.checked;
        mainGamepadEnabled.dispatchEvent(new Event('change'));
      }
    });
  }

  const leftGamepadPreset = document.getElementById('left-gamepad-preset');
  if (leftGamepadPreset) {
    leftGamepadPreset.addEventListener('change', (e) => {
      const mainGamepadPreset = document.getElementById('gamepad-preset-select');
      if (mainGamepadPreset) {
        mainGamepadPreset.value = e.target.value;
        mainGamepadPreset.dispatchEvent(new Event('change'));
      }
    });
  }

  // Toggle right sidebar from left sidebar
  const toggleRightSidebar = document.getElementById('left-toggle-right-sidebar');
  if (toggleRightSidebar) {
    toggleRightSidebar.addEventListener('click', () => {
      const rightSidebar = document.getElementById('right-sidebar');
      if (rightSidebar) {
        rightSidebar.classList.toggle('collapsed');
      }
    });
  }

  // Toggle quick settings from left sidebar
  const toggleQuickSettings = document.getElementById('left-toggle-quick-settings');
  if (toggleQuickSettings) {
    toggleQuickSettings.addEventListener('click', () => {
      // TODO: Implement quick settings toggle when quick-settings module is available
      if (cliLog) {
        cliLog('Quick Settings toggle clicked', 'info');
      }
    });
  }

  // Show developer tools checkbox
  const showDeveloperTools = document.getElementById('show-developer-tools');
  if (showDeveloperTools) {
    showDeveloperTools.addEventListener('change', (e) => {
      const developerSection = document.getElementById('developer-section');
      if (developerSection) {
        if (e.target.checked) {
          developerSection.classList.remove('hidden');
        } else {
          developerSection.classList.add('hidden');
        }
        // Save to localStorage
        localStorage.setItem('vecterm-show-developer-tools', e.target.checked);
      }
    });

    // Restore developer tools state
    const showDevTools = localStorage.getItem('vecterm-show-developer-tools') === 'true';
    showDeveloperTools.checked = showDevTools;
    if (showDevTools) {
      const developerSection = document.getElementById('developer-section');
      if (developerSection) {
        developerSection.classList.remove('hidden');
      }
    }
  }

  // Open monitor button
  const openMonitor = document.getElementById('open-monitor');
  if (openMonitor) {
    openMonitor.addEventListener('click', () => {
      const rightSidebar = document.getElementById('right-sidebar');
      if (rightSidebar) {
        rightSidebar.classList.remove('collapsed');
      }
    });
  }

  // Open theme tokens button
  const openThemeTokens = document.getElementById('open-theme-tokens');
  if (openThemeTokens) {
    openThemeTokens.addEventListener('click', () => {
      const rightSidebar = document.getElementById('right-sidebar');
      if (rightSidebar) {
        rightSidebar.classList.remove('collapsed');
        // Expand theme section
        const themeContent = document.getElementById('theme-content');
        const themeTitle = document.querySelector('.section-title[data-section="theme"]');
        if (themeContent && themeTitle && themeContent.classList.contains('collapsed')) {
          themeContent.classList.remove('collapsed');
        }
      }
    });
  }

  // Panel toggle buttons (TRBL - Top/Right/Bottom/Left)
  // NOTE: cli-panel is controlled by the FAB button (cli-fab) with special CRT animation
  const panelToggles = {
    'toggle-top-bar': 'top-bar',
    'toggle-right-sidebar': 'right-sidebar',
    'toggle-footer': 'footer',
    'toggle-left-sidebar': 'left-sidebar'
    // 'toggle-cli-panel': 'cli-panel', // REMOVED: Use FAB button instead
    // 'toggle-quick-settings-panel': 'quick-settings-panel' // REMOVED: Panel doesn't exist
  };

  // Default visibility for essential panels
  const defaultVisible = {
    'top-bar': true,
    'right-sidebar': true,
    'footer': true,
    'left-sidebar': true
  };

  Object.keys(panelToggles).forEach(buttonId => {
    const button = document.getElementById(buttonId);
    const panelId = panelToggles[buttonId];
    const panel = document.getElementById(panelId);

    console.log('[PANEL TOGGLE] Setting up button:', buttonId, 'button found:', !!button, 'panel found:', !!panel);

    if (button) {
      // Restore toggle state from localStorage, or use default
      const panelState = localStorage.getItem(`vecterm-panel-${panelId}`);
      const isVisible = panelState === null ? defaultVisible[panelId] : panelState === 'visible';

      // Apply initial panel visibility
      if (panel) {
        if (isVisible) {
          panel.classList.remove('hidden');
          button.classList.add('toggle-active');
        } else {
          panel.classList.add('hidden');
          button.classList.remove('toggle-active');
        }
        console.log('[PANEL TOGGLE] Initialized', panelId, isVisible ? 'visible' : 'hidden', 'from', panelState === null ? 'default' : 'localStorage');
      } else {
        console.warn('[PANEL TOGGLE] Panel not found during init:', panelId);
      }

      // Add click handler
      button.addEventListener('click', (e) => {
        console.log('[PANEL TOGGLE] Button clicked:', buttonId, 'for panel:', panelId);
        const panel = document.getElementById(panelId);

        if (panel) {
          // Special handling for sidebars (use collapsed class instead of hidden)
          if (panelId === 'right-sidebar') {
            // Trigger the existing sidebar toggle button
            const sidebarToggle = document.getElementById('sidebar-toggle');
            if (sidebarToggle) {
              sidebarToggle.click();
              console.log('[PANEL TOGGLE] Triggered right-sidebar Redux toggle');
            }
            return;
          }

          if (panelId === 'left-sidebar') {
            // Trigger the existing left sidebar toggle button
            const leftToggle = document.getElementById('left-sidebar-toggle');
            if (leftToggle) {
              leftToggle.click();
              console.log('[PANEL TOGGLE] Triggered left-sidebar toggle');
            }
            return;
          }

          // For other panels, use hidden class
          const isCurrentlyVisible = !panel.classList.contains('hidden');
          console.log('[PANEL TOGGLE] Current state:', isCurrentlyVisible ? 'visible' : 'hidden');

          if (isCurrentlyVisible) {
            panel.classList.add('hidden');
            button.classList.remove('toggle-active');
            localStorage.setItem(`vecterm-panel-${panelId}`, 'hidden');
            console.log('[PANEL TOGGLE]', panelId, 'hidden');
          } else {
            panel.classList.remove('hidden');
            button.classList.add('toggle-active');
            localStorage.setItem(`vecterm-panel-${panelId}`, 'visible');
            console.log('[PANEL TOGGLE]', panelId, 'visible');
          }
        } else {
          console.warn('[PANEL TOGGLE] Panel not found:', panelId);
        }
      });
    }
  });

  console.log('[LEFT SIDEBAR] Panel toggles initialized');

  // Subscribe to Redux for right-sidebar toggle button state sync
  const rightSidebarToggleBtn = document.getElementById('toggle-right-sidebar');
  if (rightSidebarToggleBtn && store) {
    store.subscribe(() => {
      const state = store.getState();
      const isCollapsed = state.uiState?.sidebarCollapsed || false;

      if (isCollapsed) {
        rightSidebarToggleBtn.classList.remove('toggle-active');
      } else {
        rightSidebarToggleBtn.classList.add('toggle-active');
      }
    });
  }

  // ==========================================
  // KEYBOARD SHORTCUTS FOR PANEL TOGGLES
  // ==========================================

  // Global keyboard shortcuts (only when CLI input is not focused)
  document.addEventListener('keydown', (e) => {
    const cliInput = document.getElementById('cli-input');
    const isTyping = cliInput && document.activeElement === cliInput;

    // Don't trigger shortcuts when typing in CLI
    if (isTyping) return;

    // Ctrl+T: Toggle Top Bar
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      const topBar = document.getElementById('top-bar');
      const button = document.getElementById('toggle-top-bar');
      if (topBar && button) {
        button.click(); // Reuse existing toggle logic
        console.log('[KEYBOARD] Toggled top bar (Ctrl+T)');
      }
    }

    // Ctrl+L: Toggle Left Sidebar
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      const button = document.getElementById('toggle-left-sidebar');
      if (button) {
        button.click();
        console.log('[KEYBOARD] Toggled left sidebar (Ctrl+L)');
      }
    }

    // Ctrl+R: Toggle Right Sidebar
    if (e.ctrlKey && e.key === 'r') {
      e.preventDefault();
      const button = document.getElementById('toggle-right-sidebar');
      if (button) {
        button.click();
        console.log('[KEYBOARD] Toggled right sidebar (Ctrl+R)');
      }
    }

    // Ctrl+B: Toggle Footer (Bottom)
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      const button = document.getElementById('toggle-footer');
      if (button) {
        button.click();
        console.log('[KEYBOARD] Toggled footer (Ctrl+B)');
      }
    }

    // Backtick (`): Toggle CLI Terminal
    if (e.key === '`' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const cliFab = document.getElementById('cli-fab');
      if (cliFab) {
        cliFab.click();
        console.log('[KEYBOARD] Toggled CLI terminal (`)');
      }
    }
  });

  console.log('[KEYBOARD] Panel toggle shortcuts initialized:');
  console.log('  Ctrl+T: Toggle Top Bar');
  console.log('  Ctrl+L: Toggle Left Sidebar');
  console.log('  Ctrl+R: Toggle Right Sidebar');
  console.log('  Ctrl+B: Toggle Footer');
  console.log('  ` (backtick): Toggle CLI Terminal');

  // localStorage Viewer
  const storageDisplay = document.getElementById('storage-display');
  const refreshStorageBtn = document.getElementById('refresh-storage');
  const clearStorageBtn = document.getElementById('clear-storage');
  const exportStorageBtn = document.getElementById('export-storage');

  function renderStorageViewer() {
    if (!storageDisplay) return;

    const vectermKeys = [];
    const otherKeys = [];

    // Categorize localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('vecterm-') || key === 'redux-demo-ui-state') {
        vectermKeys.push(key);
      } else {
        otherKeys.push(key);
      }
    }

    // Sort keys
    vectermKeys.sort();
    otherKeys.sort();

    if (vectermKeys.length === 0 && otherKeys.length === 0) {
      storageDisplay.innerHTML = '<div class="storage-empty">No data in localStorage</div>';
      return;
    }

    let html = '';

    // Render vecterm keys first
    vectermKeys.forEach(key => {
      const value = localStorage.getItem(key);
      let displayValue = value;
      let isJson = false;

      // Try to pretty-print JSON
      try {
        const parsed = JSON.parse(value);
        displayValue = JSON.stringify(parsed, null, 2);
        isJson = true;
      } catch (e) {
        // Not JSON, use as-is
      }

      html += `
        <div class="storage-item">
          <div class="storage-key">${key}</div>
          <div class="storage-value ${isJson ? 'json' : ''}">${displayValue}</div>
        </div>
      `;
    });

    // Render other keys
    if (otherKeys.length > 0) {
      otherKeys.forEach(key => {
        const value = localStorage.getItem(key);
        let displayValue = value;
        let isJson = false;

        try {
          const parsed = JSON.parse(value);
          displayValue = JSON.stringify(parsed, null, 2);
          isJson = true;
        } catch (e) {
          // Not JSON
        }

        html += `
          <div class="storage-item">
            <div class="storage-key">${key}</div>
            <div class="storage-value ${isJson ? 'json' : ''}">${displayValue}</div>
          </div>
        `;
      });
    }

    storageDisplay.innerHTML = html;
  }

  // Initialize viewer
  if (storageDisplay) {
    renderStorageViewer();
  }

  // Refresh button
  if (refreshStorageBtn) {
    refreshStorageBtn.addEventListener('click', () => {
      renderStorageViewer();
      console.log('[STORAGE VIEWER] Refreshed');
      if (cliLog) {
        cliLog('localStorage viewer refreshed', 'system');
      }
    });
  }

  // Clear button
  if (clearStorageBtn) {
    clearStorageBtn.addEventListener('click', () => {
      if (confirm('Clear all localStorage? This will reset all Vecterm settings and state.')) {
        localStorage.clear();
        renderStorageViewer();
        console.log('[STORAGE VIEWER] localStorage cleared');
        if (cliLog) {
          cliLog('localStorage cleared - page will reload', 'system');
        }
        // Reload page after clearing
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    });
  }

  // Export button
  if (exportStorageBtn) {
    exportStorageBtn.addEventListener('click', () => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
          data[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          data[key] = localStorage.getItem(key);
        }
      }

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vecterm-storage-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      console.log('[STORAGE VIEWER] Exported localStorage');
      if (cliLog) {
        cliLog('localStorage exported to file', 'system');
      }
    });
  }

  console.log('[LEFT SIDEBAR] localStorage viewer initialized');
}

export { initializeEventHandlers, initializeUptimeCounter, initializeLeftSidebar };
