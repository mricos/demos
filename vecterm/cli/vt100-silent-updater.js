/**
 * VT100 Silent Updater
 *
 * Updates VT100 effects without logging to the console.
 * Used by slider controls to provide real-time feedback without spamming the CLI output.
 *
 * Now integrates with modules/vt100-effects.js for centralized effect management.
 */

import { vt100Effects } from '../modules/vt100-effects.js';

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
 * Silently update console VT100 wave opacity
 *
 * @param {number} opacity - Wave opacity (0-1)
 */
function updateConsoleWaveopacity(opacity) {
  const cliPanel = document.getElementById('cli-panel');
  if (!cliPanel) return;

  cliPanel.style.setProperty('--vt100-wave-opacity', opacity);
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

  // Update dynamic glow animation with scaled values
  let styleEl = document.getElementById('vt100-glow-animation');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'vt100-glow-animation';
    document.head.appendChild(styleEl);
  }

  // Scale animation values based on intensity
  const minGlow = intensity * 0.6;  // Lower bound
  const maxGlow = intensity * 1.0;  // Upper bound
  const minInset = intensity * 0.3;
  const maxInset = intensity * 0.5;

  styleEl.textContent = `
    @keyframes vt100BorderGlow {
      0% {
        box-shadow:
          0 0 8px rgba(79, 195, 247, ${minGlow}),
          inset 0 0 50px rgba(79, 195, 247, ${minInset});
      }
      100% {
        box-shadow:
          0 0 15px rgba(79, 195, 247, ${maxGlow}),
          inset 0 0 80px rgba(79, 195, 247, ${maxInset});
      }
    }
  `;

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
 * Silently update console VT100 border intensity
 *
 * @param {number} intensity - Border intensity (0-2)
 */
function updateConsoleBorder(intensity) {
  const cliPanel = document.getElementById('cli-panel');
  if (!cliPanel) return;

  // Update border color with alpha channel
  // Note: intensity can go up to 2, so we clamp it for alpha
  const r = 79, g = 195, b = 247; // #4fc3f7
  const alpha = Math.min(intensity, 1); // Clamp to valid alpha range
  const currentWidth = getComputedStyle(cliPanel).getPropertyValue('--vt100-border-width').trim();
  cliPanel.style.border = `${currentWidth} solid rgba(${r}, ${g}, ${b}, ${alpha})`;
  cliPanel.offsetHeight; // Force reflow
}

/**
 * Silently update console VT100 border width
 *
 * @param {number} width - Border width in pixels (0-5)
 */
function updateConsoleBorderwidth(width) {
  const cliPanel = document.getElementById('cli-panel');
  if (!cliPanel) return;

  cliPanel.style.setProperty('--vt100-border-width', `${width}px`);
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
 * Silently update tines BPM
 *
 * @param {number} bpm - BPM value (20-300)
 */
function updateTinesBPM(bpm) {
  if (window.Vecterm && window.Vecterm.Tines) {
    try {
      window.Vecterm.Tines.bpm(Math.round(bpm));
    } catch (error) {
      console.error('Failed to update BPM:', error);
    }
  }
}

/**
 * Silently update tines master volume
 *
 * @param {number} volume - Volume value (0-1)
 */
function updateTinesVolume(volume) {
  if (window.Vecterm && window.Vecterm.Tines) {
    try {
      window.Vecterm.Tines.volume(volume);
    } catch (error) {
      console.error('Failed to update volume:', error);
    }
  }
}

/**
 * Silently update tines channel pan
 *
 * @param {string} channel - Channel name
 * @param {number} pan - Pan value (-1 to 1)
 */
function updateTinesPan(channel, pan) {
  if (window.Vecterm && window.Vecterm.Tines) {
    try {
      window.Vecterm.Tines.pan(channel, pan);
    } catch (error) {
      console.error(`Failed to update ${channel} pan:`, error);
    }
  }
}

/**
 * Parameter value registry and listeners
 */
const parameterValues = new Map();
const parameterListeners = new Map();

/**
 * Subscribe to parameter changes
 * @param {string} command - Command name to listen to
 * @param {Function} callback - Called with (command, value) when parameter changes
 * @returns {Function} Unsubscribe function
 */
function onParameterChange(command, callback) {
  if (!parameterListeners.has(command)) {
    parameterListeners.set(command, new Set());
  }
  parameterListeners.get(command).add(callback);

  // Return unsubscribe function
  return () => {
    const listeners = parameterListeners.get(command);
    if (listeners) {
      listeners.delete(callback);
    }
  };
}

/**
 * Notify all listeners that a parameter changed
 * @param {string} command - Command name
 * @param {number} value - New value
 */
function notifyParameterChange(command, value) {
  const listeners = parameterListeners.get(command);
  if (listeners) {
    listeners.forEach(callback => {
      try {
        callback(command, value);
      } catch (error) {
        console.error(`Error in parameter listener for ${command}:`, error);
      }
    });
  }
}

/**
 * Parameter metadata for proper value scaling and rounding
 * VT100 parameters now use centralized config
 */
import { createTabCompletionConfig } from '../config/vt100-config.js';

const vt100Metadata = createTabCompletionConfig();
const parameterMetadata = {
  ...vt100Metadata,
  'tines.bpm': { min: 20, max: 300, step: 1 },
  'tines.volume': { min: 0, max: 1, step: 0.01 },
  'tines.pan.drone': { min: -1, max: 1, step: 0.05 },
  'tines.pan.bells': { min: -1, max: 1, step: 0.05 },
  'tines.pan.synth': { min: -1, max: 1, step: 0.05 }
};

/**
 * Round value to nearest step
 * @param {number} value - Raw value
 * @param {number} step - Step size
 * @returns {number} Rounded value
 */
function roundToStep(value, step) {
  return Math.round(value / step) * step;
}

/**
 * Normalize and scale value based on parameter metadata
 * @param {string} command - Command name
 * @param {number} value - Input value (0-1 for MIDI, or actual value)
 * @param {boolean} isMidiValue - Whether value is 0-1 normalized MIDI value
 * @returns {number} Scaled and rounded value
 */
function normalizeValue(command, value, isMidiValue = false) {
  const metadata = parameterMetadata[command];
  if (!metadata) return value;

  let scaledValue = value;

  // If it's a MIDI value (0-1), scale to parameter range
  if (isMidiValue) {
    scaledValue = metadata.min + (value * (metadata.max - metadata.min));
  }

  // Round to step
  scaledValue = roundToStep(scaledValue, metadata.step);

  // Clamp to range
  return Math.max(metadata.min, Math.min(metadata.max, scaledValue));
}

/**
 * Map command to updater function
 *
 * @param {string} command - Command name
 * @param {number} value - New value (0-1 for MIDI, or actual value)
 * @param {boolean} isMidiValue - Whether value is 0-1 normalized MIDI value
 */
function update(command, value, isMidiValue = false) {
  // Normalize and scale value
  const finalValue = normalizeValue(command, value, isMidiValue);

  // Store the value in registry
  parameterValues.set(command, finalValue);

  const handlers = {
    'vt100.scanlines': () => vt100Effects.setEffect('scanlines', finalValue, true),
    'vt100.scanspeed': () => vt100Effects.setEffect('scanspeed', finalValue, true),
    'vt100.wave': () => vt100Effects.setEffect('wave', finalValue, true),
    'vt100.wavespeed': () => vt100Effects.setEffect('wavespeed', finalValue, true),
    'vt100.waveopacity': () => vt100Effects.setEffect('waveopacity', finalValue, true),
    'vt100.glow': () => vt100Effects.setEffect('glow', finalValue, true),
    'vt100.glowspeed': () => vt100Effects.setEffect('glowspeed', finalValue, true),
    'vt100.border': () => vt100Effects.setEffect('border', finalValue, true),
    'vt100.borderwidth': () => vt100Effects.setEffect('borderwidth', finalValue, true),
    'game.vt100.wave': () => updateGameVT100('wave', finalValue),
    'game.vt100.drift': () => updateGameVT100('drift', finalValue),
    'game.vt100.jitter': () => updateGameVT100('jitter', finalValue),
    'game.vt100.scanlines': () => updateGameVT100('scanlines', finalValue),
    'game.vt100.bloom': () => updateGameVT100('bloom', finalValue),
    'game.vt100.brightness': () => updateGameVT100('brightness', finalValue),
    'game.vt100.contrast': () => updateGameVT100('contrast', finalValue),
    'tines.bpm': () => updateTinesBPM(finalValue),
    'tines.volume': () => updateTinesVolume(finalValue),
    'tines.pan.drone': () => updateTinesPan('drone', finalValue),
    'tines.pan.bells': () => updateTinesPan('bells', finalValue),
    'tines.pan.synth': () => updateTinesPan('synth', finalValue)
  };

  const handler = handlers[command];
  if (handler) {
    handler();
  }

  // Notify all listeners about the change
  notifyParameterChange(command, finalValue);
}

/**
 * Initialize parameter update API
 * Sets up window.Vecterm.update() at top level (generic parameter router)
 * and window.Vecterm.vt100 for vt100-specific utilities
 */
function initVT100API() {
  if (!window.Vecterm) {
    window.Vecterm = {};
  }

  // Top-level generic update (routes to any destination)
  window.Vecterm.update = update;

  // Parameter synchronization API
  window.Vecterm.onParameterChange = onParameterChange;
  window.Vecterm.getParameterValue = (command) => parameterValues.get(command);

  // VT100-specific namespace for direct access to VT100 utilities
  window.Vecterm.vt100 = {
    updateConsoleScanlines,
    updateConsoleScanspeed,
    updateConsoleWave,
    updateConsoleWavespeed,
    updateConsoleWaveopacity,
    updateConsoleGlow,
    updateConsoleGlowspeed,
    updateConsoleBorder,
    updateConsoleBorderwidth,
    updateGameVT100
  };

  // Tines-specific utilities (if not already defined by tines-manager)
  if (!window.Vecterm.Tines) {
    window.Vecterm.Tines = {};
  }
  if (!window.Vecterm.Tines.updateBPM) {
    window.Vecterm.Tines.updateBPM = updateTinesBPM;
    window.Vecterm.Tines.updateVolume = updateTinesVolume;
    window.Vecterm.Tines.updatePan = updateTinesPan;
  }
}

// Initialize on module load
if (typeof window !== 'undefined') {
  initVT100API();
}

export {
  update,
  onParameterChange,
  updateConsoleScanlines,
  updateConsoleScanspeed,
  updateConsoleWave,
  updateConsoleWavespeed,
  updateConsoleWaveopacity,
  updateConsoleGlow,
  updateConsoleGlowspeed,
  updateConsoleBorder,
  updateConsoleBorderwidth,
  updateGameVT100,
  updateTinesBPM,
  updateTinesVolume,
  updateTinesPan,
  initVT100API,
  // Backwards compatibility
  update as updateVT100Silent
};
