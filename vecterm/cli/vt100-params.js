/**
 * VT100 Parameter Controls
 *
 * Hamburger menu-triggered overlay for adjusting VT100 effects in real-time
 * Managed by Vecterm, positioned center screen when visible
 *
 * Now data-driven from config/vt100-config.js
 */

import { VT100_MENU_EFFECTS, getEffectConfig, formatEffectValue } from '../config/vt100-config.js';
import { vt100Effects } from '../modules/vt100-effects.js';

let paramsVisible = false; // Start hidden

/**
 * Initialize VT100 parameter controls
 * Dynamically generates controls from VT100_MENU_EFFECTS config
 */
function initVT100Params() {
  const paramsPanel = document.getElementById('vt100-params');
  const hamburger = document.getElementById('vt100-menu-toggle');

  if (!paramsPanel) return;

  // Clear existing content and rebuild from config
  paramsPanel.innerHTML = '';

  // Generate controls for each effect in VT100_MENU_EFFECTS
  VT100_MENU_EFFECTS.forEach(effectId => {
    const config = getEffectConfig(effectId);
    if (!config) return;

    const paramRow = document.createElement('div');
    paramRow.className = 'param-row';

    // Label
    const label = document.createElement('label');
    label.textContent = config.label.toUpperCase();
    label.title = config.description;

    // Slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `param-${effectId}`;
    slider.min = config.min;
    slider.max = config.max;
    slider.step = config.step;
    slider.value = config.default;

    // Value display
    const valueSpan = document.createElement('span');
    valueSpan.className = 'param-val';
    valueSpan.textContent = formatEffectValue(effectId, config.default);

    // Event listener
    slider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      vt100Effects.setEffect(effectId, value);
      valueSpan.textContent = formatEffectValue(effectId, value);
    });

    paramRow.appendChild(label);
    paramRow.appendChild(slider);
    paramRow.appendChild(valueSpan);
    paramsPanel.appendChild(paramRow);
  });

  // Start hidden
  paramsPanel.classList.add('hidden');

  // Hamburger menu toggles parameter controls
  if (hamburger) {
    hamburger.addEventListener('click', (e) => {
      e.preventDefault();
      toggleParams();
    });
  }

  // Escape key hides parameters
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && paramsVisible) {
      hideParams();
    }
  });
}

/**
 * Toggle parameter panel visibility
 */
function toggleParams() {
  const hamburger = document.getElementById('vt100-menu-toggle');

  if (paramsVisible) {
    hideParams();
    if (hamburger) hamburger.classList.remove('active');
  } else {
    showParams();
    if (hamburger) hamburger.classList.add('active');
  }
}

/**
 * Show parameter panel
 */
function showParams() {
  const paramsPanel = document.getElementById('vt100-params');
  if (paramsPanel) {
    paramsPanel.classList.remove('hidden');
    paramsVisible = true;
  }
}

/**
 * Hide parameter panel
 */
function hideParams() {
  const paramsPanel = document.getElementById('vt100-params');
  const hamburger = document.getElementById('vt100-menu-toggle');

  if (paramsPanel) {
    paramsPanel.classList.add('hidden');
    paramsVisible = false;
  }

  if (hamburger) {
    hamburger.classList.remove('active');
  }
}

export { initVT100Params };
