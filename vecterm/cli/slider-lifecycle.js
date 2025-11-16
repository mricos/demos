/**
 * Slider Lifecycle Manager
 *
 * Manages the lifecycle of CLI sliders:
 * - Active: Currently interactive slider
 * - History: Previous sliders kept in scroll history
 * - Archived: Sliders removed by swipe left
 *
 * Sliders are never destroyed, only transitioned between states.
 * This allows users to scroll back through history and interact with previous settings.
 */

/**
 * Slider states
 */
export const SliderState = {
  ACTIVE: 'active',
  HISTORY: 'history',
  ARCHIVED: 'archived'
};

/**
 * Category to color mapping (uses CSS token classes)
 */
const CATEGORY_COLORS = {
  'console': { primary: 'token-orange', accent: 'token-yellow' },
  'game': { primary: 'token-purple', accent: 'token-magenta' },
  'tines': { primary: 'token-magenta', accent: 'token-purple' },
  'midi': { primary: 'token-yellow', accent: 'token-orange' },
  'vecterm': { primary: 'token-green', accent: 'token-cyan' },
  'gamepad': { primary: 'token-blue', accent: 'token-cyan' },
  'default': { primary: 'token-cyan', accent: 'token-green' }
};

/**
 * Get color scheme for a command based on its category
 */
function getCategoryColors(command) {
  const category = command.split('.')[0];
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
}

/**
 * SliderLifecycleManager - Manages all slider instances
 */
export class SliderLifecycleManager {
  constructor() {
    this.sliders = new Map(); // Map<sliderId, SliderInstance>
    this.activeSlider = null;
    this.sliderIdCounter = 0;
  }

  /**
   * Create a new slider
   *
   * @param {string} command - Command name (e.g., 'vt100.glow')
   * @param {Object} config - Slider configuration
   * @param {HTMLElement} outputContainer - CLI output container
   * @returns {string} Slider ID
   */
  createSlider(command, config, outputContainer) {
    // Deactivate current active slider (move to history)
    if (this.activeSlider) {
      this.moveToHistory(this.activeSlider);
    }

    const sliderId = `slider-${this.sliderIdCounter++}`;
    const colors = getCategoryColors(command);

    // Create slider DOM element
    const sliderElement = this.buildSliderElement(sliderId, command, config, colors);

    // Create slider instance
    const slider = {
      id: sliderId,
      command,
      config,
      element: sliderElement,
      state: SliderState.ACTIVE,
      value: config.default,
      colors,
      createdAt: Date.now(),
      midiMapping: null // Will be set if MIDI CC is captured
    };

    // Add to DOM
    outputContainer.appendChild(sliderElement);

    // Store and set as active
    this.sliders.set(sliderId, slider);
    this.activeSlider = sliderId;

    // Setup event handlers
    this.setupSliderEvents(slider);

    // Scroll to show
    outputContainer.scrollTop = outputContainer.scrollHeight;

    return sliderId;
  }

  /**
   * Build slider DOM element with category colors
   */
  buildSliderElement(sliderId, command, config, colors) {
    const container = document.createElement('div');
    container.className = 'cli-slider-container';
    container.id = sliderId;
    container.dataset.command = command;
    container.dataset.state = SliderState.ACTIVE;

    // Create label (monochrome - default cyan)
    const label = document.createElement('div');
    label.className = 'cli-slider-label';
    label.textContent = `${command}:`;

    // Create slider input (monochrome)
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'cli-slider';
    slider.min = config.min;
    slider.max = config.max;
    slider.step = config.step;
    slider.value = config.default;

    // Create value display (monochrome - default green)
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'cli-slider-value';
    valueDisplay.textContent = `${config.default}${config.unit}`;

    // MIDI indicator (initially hidden)
    const midiIndicator = document.createElement('span');
    midiIndicator.className = 'cli-slider-midi-indicator';
    midiIndicator.style.display = 'none';
    midiIndicator.innerHTML = '⦿';

    // Quick Settings indicator (initially hidden)
    const qsIndicator = document.createElement('span');
    qsIndicator.className = 'cli-slider-qs-indicator';
    qsIndicator.style.display = 'none';
    qsIndicator.innerHTML = '⚡';

    // Assemble
    container.appendChild(label);
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    container.appendChild(midiIndicator);
    container.appendChild(qsIndicator);

    return container;
  }

  /**
   * Setup event handlers for a slider
   */
  setupSliderEvents(sliderInstance) {
    const sliderInput = sliderInstance.element.querySelector('input[type="range"]');
    const valueDisplay = sliderInstance.element.querySelector('.cli-slider-value');

    // Track if we're currently updating (prevent circular updates)
    let isUpdating = false;

    // Handle slider input
    sliderInput.addEventListener('input', (e) => {
      if (isUpdating) return;

      const value = parseFloat(e.target.value);
      valueDisplay.textContent = `${value}${sliderInstance.config.unit}`;
      sliderInstance.value = value;

      // Update parameter using global API
      if (window.Vecterm?.update) {
        window.Vecterm.update(sliderInstance.command, value);
      }
    });

    // Subscribe to parameter changes (for synchronization)
    if (window.Vecterm?.onParameterChange) {
      const unsubscribe = window.Vecterm.onParameterChange(sliderInstance.command, (command, value) => {
        // Update slider UI if value changed externally
        if (Math.abs(parseFloat(sliderInput.value) - value) > 0.001) {
          isUpdating = true;
          sliderInput.value = value;
          valueDisplay.textContent = `${value}${sliderInstance.config.unit}`;
          sliderInstance.value = value;
          isUpdating = false;
        }
      });

      // Store unsubscribe function for cleanup
      sliderInstance.unsubscribe = unsubscribe;
    }

    // Prevent slider from being unfocused when interacting
    sliderInput.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Move a slider to history state
   */
  moveToHistory(sliderId) {
    const slider = this.sliders.get(sliderId);
    if (!slider) return;

    slider.state = SliderState.HISTORY;
    slider.element.dataset.state = SliderState.HISTORY;
    slider.element.classList.add('history');

    // Disable interaction (but keep visible)
    const sliderInput = slider.element.querySelector('input[type="range"]');
    if (sliderInput) {
      sliderInput.disabled = true;
    }

    if (this.activeSlider === sliderId) {
      this.activeSlider = null;
    }
  }

  /**
   * Reactivate a slider from history
   */
  reactivateSlider(sliderId) {
    // Move current active to history
    if (this.activeSlider) {
      this.moveToHistory(this.activeSlider);
    }

    const slider = this.sliders.get(sliderId);
    if (!slider) return;

    slider.state = SliderState.ACTIVE;
    slider.element.dataset.state = SliderState.ACTIVE;
    slider.element.classList.remove('history', 'archived');

    // Re-enable interaction
    const sliderInput = slider.element.querySelector('input[type="range"]');
    if (sliderInput) {
      sliderInput.disabled = false;
      sliderInput.focus();
    }

    this.activeSlider = sliderId;
  }

  /**
   * Archive a slider (soft delete, can be restored)
   */
  archiveSlider(sliderId) {
    const slider = this.sliders.get(sliderId);
    if (!slider) return;

    slider.state = SliderState.ARCHIVED;
    slider.element.dataset.state = SliderState.ARCHIVED;
    slider.element.classList.add('archived');

    // Fade out and hide
    slider.element.style.opacity = '0';
    setTimeout(() => {
      slider.element.style.display = 'none';
    }, 300);

    if (this.activeSlider === sliderId) {
      this.activeSlider = null;
    }
  }

  /**
   * Add MIDI mapping indicator
   */
  setMidiMapping(sliderId, ccNumber, channels) {
    const slider = this.sliders.get(sliderId);
    if (!slider) return;

    slider.midiMapping = { ccNumber, channels };

    const midiIndicator = slider.element.querySelector('.cli-slider-midi-indicator');
    if (midiIndicator) {
      midiIndicator.style.display = 'inline-block';
      midiIndicator.title = `MIDI CC ${ccNumber} [${channels.join(',')}]`;
    }
  }

  /**
   * Mark slider as added to Quick Settings
   */
  markAsQuickSetting(sliderId) {
    const slider = this.sliders.get(sliderId);
    if (!slider) return;

    slider.inQuickSettings = true;

    const qsIndicator = slider.element.querySelector('.cli-slider-qs-indicator');
    if (qsIndicator) {
      qsIndicator.style.display = 'inline-block';
      qsIndicator.title = 'In Quick Settings';
    }
  }

  /**
   * Unmark slider as removed from Quick Settings
   */
  unmarkAsQuickSetting(sliderId) {
    const slider = this.sliders.get(sliderId);
    if (!slider) return;

    slider.inQuickSettings = false;

    const qsIndicator = slider.element.querySelector('.cli-slider-qs-indicator');
    if (qsIndicator) {
      qsIndicator.style.display = 'none';
    }
  }

  /**
   * Update connection indicator based on Redux state
   * Should be called when parameter connections change
   */
  updateConnectionIndicator(sliderId) {
    const slider = this.sliders.get(sliderId);
    if (!slider) return;

    // Get Redux state
    const store = window.store;
    if (!store) return;

    const state = store.getState();
    const connectionId = `slider:${slider.command}`;
    const connection = state.parameterConnections?.[connectionId];

    // Check if slider has any active connections
    const hasQuickMenu = connection && connection.quickMenu;
    const hasMidiCC = connection && connection.midiCC;

    // Update Quick Settings indicator
    const qsIndicator = slider.element.querySelector('.cli-slider-qs-indicator');
    if (qsIndicator) {
      if (hasQuickMenu) {
        qsIndicator.style.display = 'inline-block';
        qsIndicator.title = 'In Quick Settings';
      } else {
        qsIndicator.style.display = 'none';
      }
    }

    // Update MIDI indicator
    const midiIndicator = slider.element.querySelector('.cli-slider-midi-indicator');
    if (midiIndicator) {
      if (hasMidiCC) {
        midiIndicator.style.display = 'inline-block';
        midiIndicator.title = `MIDI CC ${hasMidiCC.cc}`;
      } else {
        midiIndicator.style.display = 'none';
      }
    }

    // Update internal state
    slider.inQuickSettings = hasQuickMenu;
    slider.midiMapped = hasMidiCC;
  }

  /**
   * Get slider by ID
   */
  getSlider(sliderId) {
    return this.sliders.get(sliderId);
  }

  /**
   * Get active slider
   */
  getActiveSlider() {
    return this.activeSlider ? this.sliders.get(this.activeSlider) : null;
  }

  /**
   * Get all sliders in a specific state
   */
  getSlidersByState(state) {
    return Array.from(this.sliders.values()).filter(s => s.state === state);
  }

  /**
   * Export slider state for persistence
   */
  exportState() {
    return {
      sliders: Array.from(this.sliders.entries()).map(([id, slider]) => ({
        id,
        command: slider.command,
        value: slider.value,
        state: slider.state,
        midiMapping: slider.midiMapping,
        inQuickSettings: slider.inQuickSettings,
        createdAt: slider.createdAt
      })),
      activeSlider: this.activeSlider,
      sliderIdCounter: this.sliderIdCounter
    };
  }
}

// Global singleton instance
let lifecycleManager = null;

/**
 * Get or create the global lifecycle manager
 */
export function getLifecycleManager() {
  if (!lifecycleManager) {
    lifecycleManager = new SliderLifecycleManager();
  }
  return lifecycleManager;
}
