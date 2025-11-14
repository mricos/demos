/**
 * Game Manager
 *
 * Handles game lifecycle: loading, starting (preview/play), stopping.
 * Includes ASCII preview rendering for terminal display.
 */

import * as Actions from '../core/actions.js';
import { cliLog } from '../cli/terminal.js';
import { SpinningCube } from './spinning-cube.js';

/**
 * Create game manager with dependencies injected
 *
 * @param {Object} store - Redux store
 * @returns {Object} Game control functions
 */
function createGameManager(store) {
  /**
   * Start game in preview mode (ASCII art in CLI)
   */
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

      store.dispatch(Actions.updateGameInstance(gameId, {
        instance: gameInstance,
        mode: 'preview',
        canvas: gameCanvas,
        previewDiv: previewDiv,
        previewWidth: previewWidth,
        previewHeight: previewHeight
      }));

      // Start ASCII rendering loop
      startASCIIPreview(gameCanvas, previewDiv, previewWidth, previewHeight, gameId);
    } else if (gameId === 'spinning-cube') {
      const ctx = gameCanvas.getContext('2d');
      const gameInstance = new SpinningCube(gameCanvas, ctx);
      gameInstance.start();

      store.dispatch(Actions.updateGameInstance(gameId, {
        instance: gameInstance,
        mode: 'preview',
        canvas: gameCanvas,
        previewDiv: previewDiv,
        previewWidth: previewWidth,
        previewHeight: previewHeight
      }));

      // NO ASCII! VScope will handle wireframe rendering
      previewDiv.textContent = 'Spinning cube loaded. Use VScope for terminal visualization.';
    }
  }

  /**
   * Convert canvas to ASCII art for VT100 terminal display
   */
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

  /**
   * Start game in play mode (full canvas)
   */
  function startGamePlay(gameId, mode = '2d') {
    const canvas = document.getElementById('main-canvas');

    if (gameId === 'quadrapong') {
      const gameInstance = Quadrapong.create(store, canvas, mode);
      gameInstance.initialize().start();

      store.dispatch(Actions.updateGameInstance(gameId, {
        instance: gameInstance,
        mode: 'play',
        canvas: canvas
      }));

      // Connect VScope to game instance for vectorscope visualization
      if (window.Vecterm && window.Vecterm.VScope) {
        window.Vecterm.VScope.setGameInstance(gameInstance);
      }
    } else if (gameId === 'spinning-cube') {
      const ctx = canvas.getContext('2d');
      const gameInstance = new SpinningCube(canvas, ctx);
      gameInstance.start();

      store.dispatch(Actions.updateGameInstance(gameId, {
        instance: gameInstance,
        mode: 'play',
        canvas: canvas
      }));

      // Connect VScope to game instance for vectorscope visualization
      if (window.Vecterm && window.Vecterm.VScope) {
        window.Vecterm.VScope.setGameInstance(gameInstance);
        // Auto-enable VScope for spinning cube
        window.Vecterm.VScope.enable();
        cliLog('✓ VScope enabled - cube rendering to terminal', 'success');
      }

      cliLog('Type "stop" to end the game', 'success');

      // Terminal is first-class - don't auto-minimize
      // Users can manually minimize with the minimize button if desired
    }
  }

  /**
   * Stop a running game
   */
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

    store.dispatch(Actions.updateGameInstance(gameId, null));
  }

  return {
    startGamePreview,
    startGamePlay,
    stopGame
  };
}

export { createGameManager };
