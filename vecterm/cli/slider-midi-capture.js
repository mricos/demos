/**
 * MIDI CC Capture for Sliders
 *
 * Allows users to capture MIDI Control Change messages and map them to sliders.
 * Format: [cc:27:{a,b,c,d}]
 *
 * - cc: MIDI CC number
 * - {a,b,c,d}: Channel mapping (a=ch1, b=ch2, c=ch3, d=ch4, or specific channels)
 *
 * Long click on a slider enters MIDI learn mode.
 * Move any MIDI controller to capture the CC number and channel.
 */

import { getLifecycleManager } from './slider-lifecycle.js';
import { cliLog, cliLogHtml } from './terminal.js';

// MIDI learn state
let learnModeActive = false;
let learningSliderId = null;
let learnTimeout = null;
const LEARN_TIMEOUT_MS = 10000; // 10 second timeout

/**
 * Start MIDI learn mode for a slider
 */
export function startMidiLearn(sliderId, slider) {
  // Cancel any existing learn mode
  if (learnModeActive) {
    cancelMidiLearn();
  }

  learnModeActive = true;
  learningSliderId = sliderId;

  // Visual feedback
  const sliderElement = slider.element;
  sliderElement.classList.add('midi-learn-mode');

  // Show instructions
  const colors = slider.colors;
  cliLogHtml(
    `<span class="${colors.primary}">⦿ MIDI Learn Mode</span>: ` +
    `Move a MIDI controller to map it to <span class="${colors.accent}">${slider.command}</span>`,
    'success'
  );

  // Set timeout
  learnTimeout = setTimeout(() => {
    if (learnModeActive) {
      cliLog('MIDI learn mode timed out', 'warning');
      cancelMidiLearn();
    }
  }, LEARN_TIMEOUT_MS);

  // Setup MIDI listener
  setupMidiListener();
}

/**
 * Cancel MIDI learn mode
 */
export function cancelMidiLearn() {
  if (!learnModeActive) return;

  learnModeActive = false;

  if (learningSliderId) {
    const lifecycleManager = getLifecycleManager();
    const slider = lifecycleManager.getSlider(learningSliderId);
    if (slider) {
      slider.element.classList.remove('midi-learn-mode');
    }
  }

  if (learnTimeout) {
    clearTimeout(learnTimeout);
    learnTimeout = null;
  }

  learningSliderId = null;
}

/**
 * Setup MIDI listener for learn mode
 */
function setupMidiListener() {
  // Check if MIDI is available
  if (!navigator.requestMIDIAccess) {
    cliLog('Web MIDI API not supported in this browser', 'error');
    cancelMidiLearn();
    return;
  }

  navigator.requestMIDIAccess().then((midiAccess) => {
    // Listen to all inputs
    for (const input of midiAccess.inputs.values()) {
      input.addEventListener('midimessage', handleMidiMessage);
    }
  }).catch((error) => {
    cliLog(`MIDI access error: ${error.message}`, 'error');
    cancelMidiLearn();
  });
}

/**
 * Handle incoming MIDI message during learn mode
 */
function handleMidiMessage(event) {
  if (!learnModeActive) return;

  const [status, data1, data2] = event.data;
  const messageType = status & 0xF0;
  const channel = (status & 0x0F) + 1; // MIDI channels are 1-indexed for display

  // We only care about Control Change messages (0xB0)
  if (messageType === 0xB0) {
    const ccNumber = data1;
    const value = data2;

    // Capture this CC mapping
    captureMidiMapping(ccNumber, channel, value);

    // Remove listener
    const midiAccess = event.target.midiAccess;
    if (midiAccess) {
      for (const input of midiAccess.inputs.values()) {
        input.removeEventListener('midimessage', handleMidiMessage);
      }
    }
  }
}

/**
 * Capture MIDI mapping
 */
function captureMidiMapping(ccNumber, channel, initialValue) {
  if (!learningSliderId) return;

  const lifecycleManager = getLifecycleManager();
  const slider = lifecycleManager.getSlider(learningSliderId);

  if (!slider) {
    cancelMidiLearn();
    return;
  }

  // Default channel mapping: listen to all channels (a=1, b=2, c=3, d=4)
  // User can customize this later
  const channels = ['a', 'b', 'c', 'd']; // Placeholder for channel 1-4

  // Set the mapping
  lifecycleManager.setMidiMapping(learningSliderId, ccNumber, channels);

  // Log the mapping with format
  const mappingStr = `[cc:${ccNumber}:{${channels.join(',')}}]`;
  cliLogHtml(
    `<span class="${slider.colors.primary}">✓ MIDI Mapped:</span> ` +
    `<span class="${slider.colors.accent}">${slider.command}</span> ` +
    `<span class="token-yellow">${mappingStr}</span>`,
    'success'
  );

  // Store mapping in localStorage for persistence
  saveMidiMapping(slider.command, ccNumber, channels);

  // Setup real-time MIDI control for this slider
  setupMidiControl(slider, ccNumber, channels);

  // Exit learn mode
  cancelMidiLearn();
}

/**
 * Save MIDI mapping to localStorage
 */
function saveMidiMapping(command, ccNumber, channels) {
  const storageKey = 'vecterm-midi-mappings';
  let mappings = {};

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      mappings = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load MIDI mappings:', e);
  }

  mappings[command] = { ccNumber, channels };

  try {
    localStorage.setItem(storageKey, JSON.stringify(mappings));
  } catch (e) {
    console.error('Failed to save MIDI mapping:', e);
  }
}

/**
 * Load MIDI mappings from localStorage
 */
export function loadMidiMappings() {
  const storageKey = 'vecterm-midi-mappings';

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load MIDI mappings:', e);
  }

  return {};
}

/**
 * Setup real-time MIDI control for a slider
 */
function setupMidiControl(slider, ccNumber, channels) {
  if (!navigator.requestMIDIAccess) return;

  navigator.requestMIDIAccess().then((midiAccess) => {
    for (const input of midiAccess.inputs.values()) {
      input.addEventListener('midimessage', (event) => {
        const [status, data1, data2] = event.data;
        const messageType = status & 0xF0;
        const channel = (status & 0x0F) + 1;

        // Check if this is our CC on a listened channel
        if (messageType === 0xB0 && data1 === ccNumber) {
          // TODO: Check if channel is in our channels array
          // For now, accept all channels

          // Map MIDI value (0-127) to slider range
          const normalizedValue = data2 / 127;
          const { min, max } = slider.config;
          const mappedValue = min + (normalizedValue * (max - min));

          // Update slider
          const sliderInput = slider.element.querySelector('input[type="range"]');
          const valueDisplay = slider.element.querySelector('.cli-slider-value');

          if (sliderInput && valueDisplay) {
            // Only update if value actually changed (prevents sync loops)
            const currentValue = parseFloat(sliderInput.value);
            if (Math.abs(currentValue - mappedValue) > 0.001) {
              sliderInput.value = mappedValue;
              valueDisplay.textContent = `${mappedValue.toFixed(2)}${slider.config.unit}`;
              slider.value = mappedValue;

              // Update parameter (this will sync to other sliders)
              if (window.Vecterm?.update) {
                window.Vecterm.update(slider.command, mappedValue);
              }
            }
          }
        }
      });
    }
  });
}

/**
 * Format MIDI mapping for display
 */
export function formatMidiMapping(ccNumber, channels) {
  return `[cc:${ccNumber}:{${channels.join(',')}}]`;
}

/**
 * Parse MIDI mapping string
 */
export function parseMidiMapping(mappingStr) {
  // Format: [cc:27:{a,b,c,d}]
  const match = mappingStr.match(/\[cc:(\d+):\{([^}]+)\}\]/);
  if (match) {
    const ccNumber = parseInt(match[1]);
    const channels = match[2].split(',').map(ch => ch.trim());
    return { ccNumber, channels };
  }
  return null;
}
