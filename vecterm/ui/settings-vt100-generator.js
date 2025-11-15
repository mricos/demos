/**
 * Settings Panel VT100 Effects Generator
 *
 * Dynamically generates VT100 effects controls for the Settings panel
 * from the centralized config.
 */

import { VT100_EFFECTS } from '../config/vt100-config.js';
import { vt100Effects } from '../modules/vt100-effects.js';
import * as Actions from '../core/actions.js';

/**
 * Generate VT100 effects HTML for Settings panel
 * @returns {string} HTML string for VT100 effects section
 */
export function generateVT100EffectsHTML() {
  let html = '<h4 class="settings-title">VT100 Effects</h4>';

  VT100_EFFECTS.forEach(effect => {
    const { id, label, min, max, step, default: defaultValue, unit } = effect;
    const displayValue = unit === '' ? defaultValue.toFixed(2) : `${defaultValue}${unit}`;

    html += `
      <div class="settings-group">
        <label for="${id}-control">${label}:</label>
        <input type="range" id="${id}-control"
               min="${min}" max="${max}" step="${step}" value="${defaultValue}">
        <span id="${id}-value">${displayValue}</span>
      </div>
    `;
  });

  return html;
}

/**
 * Initialize VT100 effect controls in Settings panel
 * Must be called after DOM is ready and controls are rendered
 */
export function initializeVT100EffectControls(store) {
  VT100_EFFECTS.forEach(effect => {
    const { id, unit } = effect;
    const control = document.getElementById(`${id}-control`);
    const valueDisplay = document.getElementById(`${id}-value`);

    if (!control || !valueDisplay) return;

    control.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);

      // Update VT100 effects system
      vt100Effects.setEffect(id, value);

      // Update display
      const displayValue = unit === ''
        ? value.toFixed(2)
        : unit === 's'
          ? `${value}${unit}`
          : `${value.toFixed(step < 1 ? 2 : 0)}${unit}`;
      valueDisplay.textContent = displayValue;

      // Dispatch Redux action if needed
      // Map effect IDs to Redux config keys
      const reduxKeyMap = {
        'glow': 'glowIntensity',
        'scanlines': 'scanlineIntensity',
        'scanspeed': 'scanlineSpeed',
        'wave': 'waveAmplitude',
        'wavespeed': 'waveSpeed',
        'border': 'borderGlow'
      };

      const reduxKey = reduxKeyMap[id];
      if (reduxKey) {
        const config = {};
        config[reduxKey] = value;
        store.dispatch(Actions.vectermSetConfig(config));
      }
    });
  });
}

/**
 * Replace existing VT100 effects section in Settings panel
 * with dynamically generated one
 */
export function replaceVT100EffectsSection(store) {
  const settingsPanel = document.getElementById('settings-panel');
  if (!settingsPanel) return;

  // Find the VT100 Effects section
  const vt100Section = Array.from(settingsPanel.querySelectorAll('.settings-section'))
    .find(section => section.querySelector('.settings-title')?.textContent === 'VT100 Effects');

  if (!vt100Section) {
    console.warn('VT100 Effects section not found in Settings panel');
    return;
  }

  // Generate new HTML
  vt100Section.innerHTML = generateVT100EffectsHTML();

  // Initialize event handlers
  initializeVT100EffectControls(store);

  console.log('VT100 Effects section replaced with data-driven version');
}
