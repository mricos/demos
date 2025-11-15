/**
 * Quick Settings Panel
 *
 * Floating panel that displays frequently used sliders.
 * Sliders can be added by swiping right on them in the CLI.
 */

import { getLifecycleManager } from './slider-lifecycle.js';
import { VT100_EFFECTS, QUICK_SETTINGS_DEFAULTS, getEffectConfig } from '../config/vt100-config.js';

/**
 * QuickSettings - Manages the Quick Settings panel
 */
export class QuickSettings {
  constructor() {
    this.panel = null;
    this.sliders = new Map(); // Map<command, miniSlider>
    this.visible = false;
    this.initialized = false;
  }

  /**
   * Initialize the Quick Settings panel
   */
  initialize() {
    if (this.initialized) return;

    // Create panel
    this.panel = this.createPanel();
    document.body.appendChild(this.panel);

    // Load saved settings or populate defaults
    this.loadFromStorage();

    this.initialized = true;
  }

  /**
   * Initialize with default VT100 effects
   */
  initializeDefaults() {
    // Create lifecycle manager instances for default effects
    const lifecycleManager = getLifecycleManager();

    QUICK_SETTINGS_DEFAULTS.forEach(effectId => {
      const config = getEffectConfig(effectId);
      if (!config) return;

      const command = `vt100.${effectId}`;

      // Check if slider already exists
      const existingSlider = lifecycleManager.getSlider(command);
      if (existingSlider) {
        this.addSlider(command, existingSlider);
      } else {
        // Create a minimal slider instance for Quick Settings
        const sliderInstance = {
          command,
          config: {
            min: config.min,
            max: config.max,
            step: config.step,
            default: config.default,
            unit: config.unit
          },
          colors: {
            primary: 'token-orange',
            accent: 'token-orange-accent'
          },
          value: config.default
        };
        this.addSlider(command, sliderInstance);
      }
    });
  }

  /**
   * Create Quick Settings panel DOM
   */
  createPanel() {
    const panel = document.createElement('div');
    panel.id = 'quick-settings-panel';
    panel.className = 'quick-settings-panel hidden';

    // Header
    const header = document.createElement('div');
    header.className = 'quick-settings-header';
    header.innerHTML = `
      <span class="token-cyan">⚡ Quick Settings</span>
      <button id="qs-toggle" class="qs-toggle-btn">−</button>
    `;

    // Content container
    const content = document.createElement('div');
    content.id = 'quick-settings-content';
    content.className = 'quick-settings-content';

    // Empty state
    const emptyState = document.createElement('div');
    emptyState.id = 'qs-empty-state';
    emptyState.className = 'qs-empty-state';
    emptyState.innerHTML = `
      <span class="token-base-2">Swipe right on any slider to add it here</span>
    `;
    content.appendChild(emptyState);

    panel.appendChild(header);
    panel.appendChild(content);

    // Setup toggle button
    const toggleBtn = header.querySelector('#qs-toggle');
    toggleBtn.addEventListener('click', () => {
      this.toggle();
    });

    return panel;
  }

  /**
   * Add a slider to Quick Settings
   */
  addSlider(sliderId, sliderInstance) {
    const command = sliderInstance.command;

    // Don't add duplicates
    if (this.sliders.has(command)) {
      console.log(`[QuickSettings] ${command} already in Quick Settings`);
      return;
    }

    // Remove empty state
    const emptyState = document.getElementById('qs-empty-state');
    if (emptyState) {
      emptyState.remove();
    }

    // Create mini slider
    const miniSlider = this.createMiniSlider(sliderInstance);
    this.sliders.set(command, miniSlider);

    // Add to panel
    const content = document.getElementById('quick-settings-content');
    content.appendChild(miniSlider.element);

    // Save to storage
    this.saveToStorage();

    // Show panel if hidden
    if (this.panel.classList.contains('hidden')) {
      this.show();
    }

    console.log(`[QuickSettings] Added ${command}`);
  }

  /**
   * Create a mini slider for Quick Settings
   */
  createMiniSlider(sliderInstance) {
    const { command, config, colors, value } = sliderInstance;

    // Create container
    const container = document.createElement('div');
    container.className = 'qs-slider-container';
    container.dataset.command = command;

    // Color bar
    const colorBar = document.createElement('div');
    colorBar.className = `qs-slider-color-bar ${colors.primary}`;
    container.appendChild(colorBar);

    // Label
    const label = document.createElement('div');
    label.className = `qs-slider-label ${colors.primary}`;
    label.textContent = command.split('.').pop(); // Show only last part
    label.title = command; // Full command on hover

    // Slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = `qs-slider ${colors.accent}`;
    slider.min = config.min;
    slider.max = config.max;
    slider.step = config.step;
    slider.value = value || config.default;

    // Value display
    const valueDisplay = document.createElement('span');
    valueDisplay.className = `qs-slider-value ${colors.accent}`;
    valueDisplay.textContent = `${slider.value}${config.unit}`;

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'qs-remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove from Quick Settings';

    // Assemble
    container.appendChild(label);
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    container.appendChild(removeBtn);

    // Track if we're currently updating (prevent circular updates)
    let isUpdating = false;

    // Setup events
    slider.addEventListener('input', (e) => {
      if (isUpdating) return;

      const newValue = parseFloat(e.target.value);
      valueDisplay.textContent = `${newValue}${config.unit}`;
      if (window.Vecterm?.update) {
        window.Vecterm.update(command, newValue);
      }
    });

    // Subscribe to parameter changes (for synchronization)
    let unsubscribe = null;
    if (window.Vecterm?.onParameterChange) {
      unsubscribe = window.Vecterm.onParameterChange(command, (cmd, value) => {
        // Update slider UI if value changed externally
        if (Math.abs(parseFloat(slider.value) - value) > 0.001) {
          isUpdating = true;
          slider.value = value;
          valueDisplay.textContent = `${value}${config.unit}`;
          isUpdating = false;
        }
      });
    }

    removeBtn.addEventListener('click', () => {
      // Cleanup subscription
      if (unsubscribe) {
        unsubscribe();
      }
      this.removeSlider(command);
    });

    return {
      element: container,
      command,
      slider,
      valueDisplay,
      unsubscribe
    };
  }

  /**
   * Remove a slider from Quick Settings
   */
  removeSlider(command) {
    const miniSlider = this.sliders.get(command);
    if (!miniSlider) return;

    // Remove from DOM
    miniSlider.element.remove();
    this.sliders.delete(command);

    // Save to storage
    this.saveToStorage();

    // Show empty state if no sliders
    if (this.sliders.size === 0) {
      const content = document.getElementById('quick-settings-content');
      const emptyState = document.createElement('div');
      emptyState.id = 'qs-empty-state';
      emptyState.className = 'qs-empty-state';
      emptyState.innerHTML = `
        <span class="token-base-2">Swipe right on any slider to add it here</span>
      `;
      content.appendChild(emptyState);
    }

    console.log(`[QuickSettings] Removed ${command}`);
  }

  /**
   * Toggle panel visibility
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Show panel
   */
  show() {
    if (!this.panel) return;
    this.panel.classList.remove('hidden');
    this.visible = true;

    // Update toggle button
    const toggleBtn = document.getElementById('qs-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = '−';
    }
  }

  /**
   * Hide panel
   */
  hide() {
    if (!this.panel) return;
    this.panel.classList.add('hidden');
    this.visible = false;

    // Update toggle button
    const toggleBtn = document.getElementById('qs-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = '+';
    }
  }

  /**
   * Save Quick Settings to localStorage
   */
  saveToStorage() {
    const storageKey = 'vecterm-quick-settings';
    const data = {
      commands: Array.from(this.sliders.keys())
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save Quick Settings:', e);
    }
  }

  /**
   * Load Quick Settings from localStorage
   */
  loadFromStorage() {
    const storageKey = 'vecterm-quick-settings';

    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;

      const data = JSON.parse(stored);
      const lifecycleManager = getLifecycleManager();

      // Restore sliders
      // Note: This requires the CONTINUOUS_COMMANDS config from tab-completion
      // We'll import it when needed
    } catch (e) {
      console.error('Failed to load Quick Settings:', e);
    }
  }
}

// Global singleton
let quickSettings = null;

/**
 * Get or create Quick Settings instance
 */
export function getQuickSettings() {
  if (!quickSettings) {
    quickSettings = new QuickSettings();
  }
  return quickSettings;
}

/**
 * Initialize Quick Settings
 */
export function initQuickSettings() {
  const qs = getQuickSettings();
  qs.initialize();
  return qs;
}
