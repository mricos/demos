// ==========================================
// VECTERM - Main Application Entry Point
// ==========================================
//
// This file bootstraps the application using the BootManager.
// The BootManager handles:
// - Phased initialization with dependency tracking
// - Health monitoring and timeout protection
// - Graceful degradation for optional systems
// - System retry capabilities
// - Global status API
//
// For direct system access, use: window.Vecterm.System
// For MIDI controls, use: window.Vecterm.MIDI
// For audio controls, use: window.Vecterm.Tines

import { bootApplication } from './core/boot-manager.js';
import * as Actions from './core/actions.js';
import { getQueryParams } from './utils/query-params.js';

// ==========================================
// BOOT APPLICATION
// ==========================================

let bootManager;

(async () => {
  try {
    console.log('🚀 Starting Vecterm...');

    // Boot the application
    bootManager = await bootApplication();

    // Get systems from boot manager
    const store = bootManager.getSystem('store');

    // ==========================================
    // POST-BOOT INITIALIZATION
    // ==========================================

    // Check query params and dispatch login
    const params = getQueryParams();
    if (params.name === 'mike' && params.pass === '1234') {
      store.dispatch(Actions.login('mike'));
    }

    // Set initial path
    store.dispatch(Actions.setPath('/projects/redux-demo.md'));

    // Initial render
    const render = bootManager.getSystem('render');
    render();

    // Add introductory canvas items with delay
    setTimeout(() => store.dispatch(Actions.addCanvasItem('Welcome to Redux!')), 2000);
    setTimeout(() => store.dispatch(Actions.addCanvasItem('Click buttons to dispatch actions')), 4000);
    setTimeout(() => store.dispatch(Actions.addCanvasItem('Watch the flow diagram animate')), 6000);

    // ==========================================
    // INITIALIZE GAMEPAD SYSTEM
    // ==========================================

    const gamepadSystem = bootManager.getSystem('gamepadSystem');
    if (gamepadSystem) {
      // Load gamepad mappings from JSON
      try {
        const response = await fetch('./gamepad-mappings.json');
        const mappings = await response.json();

        // Update Redux state with loaded mappings
        store.dispatch(Actions.setGamepadConfig({ mappings }));

        const { cliLog } = await import('./cli/terminal.js');
        cliLog('Gamepad mappings loaded', 'success');
      } catch (error) {
        console.error('Failed to load gamepad mappings:', error);
        const { cliLog } = await import('./cli/terminal.js');
        cliLog('Warning: Failed to load gamepad mappings. Using defaults.', 'error');
      }

      gamepadSystem.init();
    }

    // ==========================================
    // INITIALIZE MULTIPLAYER
    // ==========================================

    const { initializeMultiplayer } = await import('./multiplayer.js');
    const { cliLog } = await import('./cli/terminal.js');
    const multiplayerClient = initializeMultiplayer(store);
    cliLog('Multiplayer system ready. Type "connect <name>" to join.', 'info');

    // ==========================================
    // MAIN ANIMATION LOOP (for gamepad polling + FPS)
    // ==========================================

    // Global FPS tracking
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let lastFrameTime = performance.now();

    function animationLoop(currentTime) {
      // Calculate delta time
      const deltaTime = (currentTime - lastFrameTime) / 1000;
      lastFrameTime = currentTime;

      // Poll gamepad state
      if (gamepadSystem) {
        gamepadSystem.poll();
      }

      // Update FPS counter (once per second)
      frameCount++;
      const timeSinceUpdate = currentTime - lastFpsUpdate;
      if (timeSinceUpdate >= 1000) {
        const fps = Math.round((frameCount * 1000) / timeSinceUpdate);
        const fpsCounter = document.getElementById('fps-counter');
        if (fpsCounter) {
          fpsCounter.textContent = fps;
        }
        frameCount = 0;
        lastFpsUpdate = currentTime;
      }

      // Continue loop
      requestAnimationFrame(animationLoop);
    }

    // Start animation loop
    animationLoop(performance.now());

    console.log('✨ Vecterm ready!');

  } catch (error) {
    console.error('💥 Failed to boot Vecterm:', error);
    console.error('Stack trace:', error.stack);

    // Create error details for clipboard
    const errorDetails = `
=== VECTERM BOOT ERROR ===
Time: ${new Date().toISOString()}
Browser: ${navigator.userAgent}

Error: ${error.message}

Stack Trace:
${error.stack}

System Status:
${bootManager ? JSON.stringify(bootManager.getSystemStatus(), null, 2) : 'Boot manager not initialized'}
    `.trim();

    // Store in window for copy button
    window.__vectermError = errorDetails;

    // Show error to user
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a1a;
      border: 2px solid #ff4444;
      padding: 40px;
      border-radius: 8px;
      font-family: monospace;
      color: #ff4444;
      max-width: 700px;
    `;

    errorDiv.innerHTML = `
      <h2 style="margin-top: 0;">⚠️ Vecterm Failed to Start</h2>
      <p><strong>Error:</strong> ${error.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>

      <details style="margin: 20px 0; color: #888;">
        <summary style="cursor: pointer; color: #ff4444;">Show Stack Trace</summary>
        <pre style="
          background: #0a0a0a;
          padding: 15px;
          border-radius: 4px;
          overflow: auto;
          max-height: 300px;
          font-size: 11px;
          margin-top: 10px;
          color: #ccc;
        ">${error.stack.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </details>

      <div style="display: flex; gap: 10px;">
        <button id="copy-error-btn" style="
          background: #666;
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-family: monospace;
          font-weight: bold;
        ">
          Copy Error Details
        </button>
        <button id="reload-btn" style="
          background: #ff4444;
          color: #000;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-family: monospace;
          font-weight: bold;
        ">
          Reload Page
        </button>
      </div>
    `;

    document.body.innerHTML = '';
    document.body.appendChild(errorDiv);

    // Attach event listeners
    document.getElementById('copy-error-btn').addEventListener('click', function() {
      navigator.clipboard.writeText(window.__vectermError).then(() => {
        this.textContent = '✓ Copied!';
        setTimeout(() => this.textContent = 'Copy Error Details', 2000);
      });
    });

    document.getElementById('reload-btn').addEventListener('click', () => {
      location.reload();
    });
  }
})();

// ==========================================
// GLOBAL EXPORTS FOR DEBUGGING
// ==========================================

// Expose boot manager for debugging
if (typeof window !== 'undefined') {
  window.__bootManager = () => bootManager;
}
