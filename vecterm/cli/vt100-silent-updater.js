/**
 * VT100 Silent Updater
 *
 * Updates VT100 effects without logging to the console.
 * Used by slider controls to provide real-time feedback without spamming the CLI output.
 */

/**
 * Silently update console VT100 scanlines
 *
 * @param {number} intensity - Scanline intensity (0-1)
 */
function updateConsoleScanlines(intensity) {
  const cliPanel = document.getElementById('cli-panel');
  if (!cliPanel) return;

  cliPanel.style.setProperty('--vt100-scanline-intensity', intensity);

  // Update pseudo-element styles
  let styleEl = document.getElementById('vt100-dynamic-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'vt100-dynamic-styles';
    document.head.appendChild(styleEl);
  }

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
}

/**
 * Silently update console VT100 scanline speed
 *
 * @param {number} speed - Scanline speed in seconds
 */
function updateConsoleScanspeed(speed) {
  const cliPanel = document.getElementById('cli-panel');
  if (!cliPanel) return;

  cliPanel.style.setProperty('--vt100-scanline-speed', `${speed}s`);
  cliPanel.offsetHeight; // Force reflow
}

/**
 * Silently update console VT100 wave amplitude
 *
 * @param {number} amplitude - Wave amplitude in pixels
 */
function updateConsoleWave(amplitude) {
  const cliPanel = document.getElementById('cli-panel');
  if (!cliPanel) return;

  cliPanel.style.setProperty('--vt100-wave-amplitude', `${amplitude}px`);
  cliPanel.offsetHeight; // Force reflow
}

/**
 * Silently update console VT100 wave speed
 *
 * @param {number} speed - Wave speed in seconds
 */
function updateConsoleWavespeed(speed) {
  const cliPanel = document.getElementById('cli-panel');
  if (!cliPanel) return;

  cliPanel.style.setProperty('--vt100-wave-speed', `${speed}s`);
  cliPanel.offsetHeight; // Force reflow
}

/**
 * Silently update console VT100 glow intensity
 *
 * @param {number} intensity - Glow intensity (0-1)
 */
function updateConsoleGlow(intensity) {
  const cliPanel = document.getElementById('cli-panel');
  if (!cliPanel) return;

  cliPanel.style.setProperty('--vt100-glow-intensity', intensity);
  cliPanel.offsetHeight; // Force reflow
}

/**
 * Silently update console VT100 glow speed
 *
 * @param {number} speed - Glow speed in seconds
 */
function updateConsoleGlowspeed(speed) {
  const cliPanel = document.getElementById('cli-panel');
  if (!cliPanel) return;

  cliPanel.style.setProperty('--vt100-glow-speed', `${speed}s`);
  cliPanel.offsetHeight; // Force reflow
}

/**
 * Silently update game VT100 effects
 *
 * @param {string} property - Property to update
 * @param {number} value - New value
 */
function updateGameVT100(property, value) {
  const gameView = document.getElementById('game-view');
  if (!gameView) return;

  const propMap = {
    'wave': '--game-vt100-wave',
    'drift': '--game-vt100-drift',
    'jitter': '--game-vt100-jitter',
    'scanlines': '--game-vt100-scanlines',
    'bloom': '--game-vt100-bloom',
    'brightness': '--game-vt100-brightness',
    'contrast': '--game-vt100-contrast'
  };

  const cssVar = propMap[property];
  if (cssVar) {
    gameView.style.setProperty(cssVar, value);
    gameView.offsetHeight; // Force reflow
  }
}

/**
 * Map command to silent updater function
 *
 * @param {string} command - Command name
 * @param {number} value - New value
 */
function updateVT100Silent(command, value) {
  const handlers = {
    'console.vt100.scanlines': () => updateConsoleScanlines(value),
    'console.vt100.scanspeed': () => updateConsoleScanspeed(value),
    'console.vt100.wave': () => updateConsoleWave(value),
    'console.vt100.wavespeed': () => updateConsoleWavespeed(value),
    'console.vt100.glow': () => updateConsoleGlow(value),
    'console.vt100.glowspeed': () => updateConsoleGlowspeed(value),
    'game.vt100.wave': () => updateGameVT100('wave', value),
    'game.vt100.drift': () => updateGameVT100('drift', value),
    'game.vt100.jitter': () => updateGameVT100('jitter', value),
    'game.vt100.scanlines': () => updateGameVT100('scanlines', value),
    'game.vt100.bloom': () => updateGameVT100('bloom', value),
    'game.vt100.brightness': () => updateGameVT100('brightness', value),
    'game.vt100.contrast': () => updateGameVT100('contrast', value)
  };

  const handler = handlers[command];
  if (handler) {
    handler();
  }
}

export {
  updateConsoleScanlines,
  updateConsoleScanspeed,
  updateConsoleWave,
  updateConsoleWavespeed,
  updateConsoleGlow,
  updateConsoleGlowspeed,
  updateGameVT100,
  updateVT100Silent
};
