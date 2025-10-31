/**
 * Interactive Terminal Controls API
 *
 * Provides API for creating clickable, interactive elements in the CLI terminal.
 * Features:
 * - Clickable text tokens that trigger callbacks
 * - Mini popup controls (sliders, toggles, dropdowns)
 * - Redux state manipulation through terminal interaction
 * - Color-coded interactive elements
 *
 * Usage:
 *   import { createClickableToken, createMiniControl } from './interactive-controls.js';
 *
 *   // Create clickable token
 *   const token = createClickableToken('click me', 'cyan', () => console.log('clicked!'));
 *   cliLogHtml(token);
 *
 *   // Create mini control popup
 *   const control = createMiniControl({
 *     type: 'slider',
 *     label: 'Brightness',
 *     min: 0,
 *     max: 2,
 *     value: 1,
 *     onChange: (value) => dispatch(setBrightness(value))
 *   });
 */

/**
 * Create a clickable token for terminal output
 *
 * @param {string} text - Display text
 * @param {string} color - Color class ('cyan', 'green', 'orange', 'purple', 'blue')
 * @param {Function} onClick - Click handler callback
 * @param {Object} options - Additional options
 * @returns {string} HTML string for clickable token
 */
function createClickableToken(text, color = 'cyan', onClick = null, options = {}) {
  const {
    tooltip = '',
    underline = true,
    id = `clickable-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  } = options;

  // Store click handler in global registry
  if (onClick) {
    window._cliClickHandlers = window._cliClickHandlers || {};
    window._cliClickHandlers[id] = onClick;
  }

  const styles = [
    'cursor: pointer',
    underline ? 'text-decoration: underline' : '',
    'transition: opacity 0.2s'
  ].filter(Boolean).join('; ');

  const attrs = [
    `id="${id}"`,
    `class="token-${color} clickable-token"`,
    `style="${styles}"`,
    tooltip ? `title="${tooltip}"` : '',
    onClick ? `onclick="window._cliClickHandlers['${id}']()"` : ''
  ].filter(Boolean).join(' ');

  return `<span ${attrs}>${text}</span>`;
}

/**
 * Create a mini control popup in the terminal
 *
 * @param {Object} config - Control configuration
 * @returns {HTMLElement} Control element
 */
function createMiniControl(config) {
  const {
    type = 'slider',        // 'slider', 'toggle', 'select', 'buttons'
    label = '',
    value = null,
    onChange = null,
    onClose = null
  } = config;

  const container = document.createElement('div');
  container.className = 'cli-mini-control';
  container.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    margin: 4px 0;
    background: rgba(79, 195, 247, 0.08);
    border: 1px solid var(--color-base-1);
    border-radius: 6px;
    font-family: var(--font-code);
    font-size: var(--font-size-sm);
    animation: controlSlideIn 0.2s ease-out;
  `;

  // Add label
  if (label) {
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.color = 'var(--color-base-1)';
    labelEl.style.minWidth = '80px';
    container.appendChild(labelEl);
  }

  // Create control based on type
  let controlEl;

  if (type === 'slider') {
    controlEl = createSliderControl(config, onChange);
  } else if (type === 'toggle') {
    controlEl = createToggleControl(config, onChange);
  } else if (type === 'select') {
    controlEl = createSelectControl(config, onChange);
  } else if (type === 'buttons') {
    controlEl = createButtonsControl(config, onChange);
  }

  if (controlEl) {
    container.appendChild(controlEl);
  }

  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    color: var(--color-base-5);
    font-size: 18px;
    cursor: pointer;
    padding: 0 4px;
    opacity: 0.6;
    transition: opacity 0.2s;
  `;
  closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
  closeBtn.onmouseout = () => closeBtn.style.opacity = '0.6';
  closeBtn.onclick = () => {
    container.remove();
    if (onClose) onClose();
  };
  container.appendChild(closeBtn);

  return container;
}

/**
 * Create slider control element
 */
function createSliderControl(config, onChange) {
  const { min = 0, max = 100, step = 1, value = 50, unit = '' } = config;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display: flex; align-items: center; gap: 8px;';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = min;
  slider.max = max;
  slider.step = step;
  slider.value = value;
  slider.style.cssText = `
    width: 120px;
    cursor: pointer;
  `;

  const valueDisplay = document.createElement('span');
  valueDisplay.textContent = `${value}${unit}`;
  valueDisplay.style.cssText = `
    color: var(--color-base-4);
    min-width: 50px;
    text-align: right;
  `;

  slider.oninput = (e) => {
    const newValue = parseFloat(e.target.value);
    valueDisplay.textContent = `${newValue}${unit}`;
    if (onChange) onChange(newValue);
  };

  wrapper.appendChild(slider);
  wrapper.appendChild(valueDisplay);
  return wrapper;
}

/**
 * Create toggle control element
 */
function createToggleControl(config, onChange) {
  const { value = false } = config;

  const toggle = document.createElement('button');
  toggle.textContent = value ? 'ON' : 'OFF';
  toggle.style.cssText = `
    padding: 4px 12px;
    background: ${value ? 'var(--color-base-4)' : 'var(--color-base-5)'};
    color: #000;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-family: var(--font-code);
    font-size: var(--font-size-sm);
    font-weight: bold;
    min-width: 50px;
    transition: all 0.2s;
  `;

  toggle.onclick = () => {
    const newValue = toggle.textContent === 'OFF';
    toggle.textContent = newValue ? 'ON' : 'OFF';
    toggle.style.background = newValue ? 'var(--color-base-4)' : 'var(--color-base-5)';
    if (onChange) onChange(newValue);
  };

  return toggle;
}

/**
 * Create select/dropdown control element
 */
function createSelectControl(config, onChange) {
  const { options = [], value = '' } = config;

  const select = document.createElement('select');
  select.style.cssText = `
    padding: 4px 8px;
    background: rgba(10, 10, 10, 0.8);
    color: var(--color-base-1);
    border: 1px solid var(--color-base-1);
    border-radius: 4px;
    cursor: pointer;
    font-family: var(--font-code);
    font-size: var(--font-size-sm);
  `;

  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = typeof opt === 'string' ? opt : opt.value;
    option.textContent = typeof opt === 'string' ? opt : opt.label;
    option.selected = option.value === value;
    select.appendChild(option);
  });

  select.onchange = (e) => {
    if (onChange) onChange(e.target.value);
  };

  return select;
}

/**
 * Create button group control element
 */
function createButtonsControl(config, onChange) {
  const { buttons = [] } = config;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display: flex; gap: 6px;';

  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.textContent = btn.label || btn;
    button.style.cssText = `
      padding: 4px 10px;
      background: rgba(79, 195, 247, 0.2);
      color: var(--color-base-1);
      border: 1px solid var(--color-base-1);
      border-radius: 4px;
      cursor: pointer;
      font-family: var(--font-code);
      font-size: var(--font-size-sm);
      transition: all 0.2s;
    `;
    button.onmouseover = () => {
      button.style.background = 'rgba(79, 195, 247, 0.4)';
    };
    button.onmouseout = () => {
      button.style.background = 'rgba(79, 195, 247, 0.2)';
    };
    button.onclick = () => {
      const value = btn.value !== undefined ? btn.value : btn;
      if (onChange) onChange(value);
    };
    wrapper.appendChild(button);
  });

  return wrapper;
}

/**
 * Add interactive control to CLI output
 *
 * @param {Object} config - Control configuration
 * @returns {HTMLElement} Control element
 */
function addInteractiveControl(config) {
  const cliOutput = document.getElementById('cli-output');
  if (!cliOutput) return null;

  const control = createMiniControl(config);
  cliOutput.appendChild(control);
  cliOutput.scrollTop = cliOutput.scrollHeight;

  return control;
}

/**
 * Create a group of clickable command tokens
 *
 * @param {Array<Object>} commands - Array of {text, color, onClick} objects
 * @returns {string} HTML string with clickable tokens
 */
function createCommandTokens(commands) {
  return commands.map(cmd => {
    const { text, color = 'cyan', onClick = null, tooltip = '' } = cmd;
    return createClickableToken(text, color, onClick, { tooltip });
  }).join(' ');
}

// Add CSS for clickable tokens
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .clickable-token:hover {
      opacity: 0.7;
      filter: brightness(1.3);
    }

    @keyframes controlSlideIn {
      from {
        opacity: 0;
        transform: translateY(-5px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}

export {
  createClickableToken,
  createMiniControl,
  addInteractiveControl,
  createCommandTokens
};
