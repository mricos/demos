/**
 * Dunk - SliderBank Module
 * Reusable slider/knob UI component with themeable design tokens
 * Used by midi-tool.html and dunk.html controller panel
 */

const SliderBank = {
  // Design tokens for theming
  themes: {
    // "Tool" theme - dark minimal (test.html / midi-tool.html style)
    tool: {
      '--sb-bg': '#111',
      '--sb-bg-control': '#1a1a1a',
      '--sb-border': '#444',
      '--sb-border-highlight': '#555',
      '--sb-text': '#ddd',
      '--sb-text-dim': '#888',
      '--sb-text-label': '#aaa',
      '--sb-accent': '#8be9fd',
      '--sb-accent-glow': 'rgba(139, 233, 253, 0.3)',
      '--sb-slider-track': '#333',
      '--sb-slider-fill': '#8be9fd',
      '--sb-slider-thumb': '#fff',
      '--sb-knob-ring': '#333',
      '--sb-knob-indicator': '#8be9fd',
      '--sb-knob-center': '#222',
      '--sb-font': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      '--sb-font-size': '12px',
      '--sb-border-radius': '4px',
      '--sb-control-gap': '8px',
      '--sb-slider-width': '40px',
      '--sb-slider-height': '120px',
      '--sb-knob-size': '48px'
    },
    // "HP Lab" theme - 90s test equipment aesthetic (dunk.html style)
    hp: {
      '--sb-bg': '#1a1a18',
      '--sb-bg-control': '#2a2a28',
      '--sb-border': '#4a4a48',
      '--sb-border-highlight': '#5a5a58',
      '--sb-text': '#c8c8c0',
      '--sb-text-dim': '#888880',
      '--sb-text-label': '#a0a098',
      '--sb-accent': '#33ff33',
      '--sb-accent-glow': 'rgba(51, 255, 51, 0.25)',
      '--sb-slider-track': '#181816',
      '--sb-slider-fill': '#33ff33',
      '--sb-slider-thumb': '#33ff33',
      '--sb-knob-ring': '#181816',
      '--sb-knob-indicator': '#33ff33',
      '--sb-knob-center': '#222220',
      '--sb-font': 'Consolas, Monaco, Lucida Console, monospace',
      '--sb-font-size': '11px',
      '--sb-border-radius': '2px',
      '--sb-control-gap': '6px',
      '--sb-slider-width': '36px',
      '--sb-slider-height': '100px',
      '--sb-knob-size': '44px'
    }
  },

  // Current theme
  currentTheme: 'tool',

  // Active instances
  instances: new Map(),

  // CSS injected flag
  cssInjected: false,

  /**
   * Set theme for all SliderBank instances
   * @param {string} themeName - 'tool' or 'hp'
   */
  setTheme(themeName) {
    if (!this.themes[themeName]) {
      console.warn(`[SliderBank] Unknown theme: ${themeName}`);
      return;
    }
    this.currentTheme = themeName;
    const tokens = this.themes[themeName];

    // Apply to all instances
    this.instances.forEach((instance, container) => {
      Object.entries(tokens).forEach(([key, value]) => {
        container.style.setProperty(key, value);
      });
    });
  },

  /**
   * Create a slider bank
   * @param {Object} config
   * @param {HTMLElement} config.container - Container element
   * @param {number} config.sliders - Number of sliders (default 8)
   * @param {number} config.knobs - Number of knobs (default 8)
   * @param {string} config.theme - 'tool' or 'hp' (default 'tool')
   * @param {Array} config.sliderLabels - Labels for sliders
   * @param {Array} config.knobLabels - Labels for knobs
   * @param {Array} config.sliderCCs - CC numbers for sliders
   * @param {Array} config.knobCCs - CC numbers for knobs
   * @param {Function} config.onChange - Callback (type, index, value, cc)
   * @returns {Object} SliderBank instance
   */
  create(config) {
    const {
      container,
      sliders = 8,
      knobs = 8,
      theme = 'tool',
      sliderLabels = [],
      knobLabels = [],
      sliderCCs = [],
      knobCCs = [],
      onChange = null
    } = config;

    if (!container) {
      console.error('[SliderBank] No container provided');
      return null;
    }

    // Inject CSS if not done
    if (!this.cssInjected) {
      this._injectCSS();
      this.cssInjected = true;
    }

    // Apply theme tokens
    const tokens = this.themes[theme] || this.themes.tool;
    Object.entries(tokens).forEach(([key, value]) => {
      container.style.setProperty(key, value);
    });

    // Create instance state
    const instance = {
      container,
      sliderValues: new Array(sliders).fill(0),
      knobValues: new Array(knobs).fill(64),
      sliderCCs,
      knobCCs,
      onChange,
      elements: {
        sliders: [],
        knobs: []
      }
    };

    // Build HTML
    container.classList.add('slider-bank');
    container.innerHTML = `
      ${knobs > 0 ? `
        <div class="sb-section sb-knobs">
          <div class="sb-section-label">KNOBS</div>
          <div class="sb-row sb-knob-row">
            ${this._createKnobsHTML(knobs, knobLabels, knobCCs)}
          </div>
        </div>
      ` : ''}
      ${sliders > 0 ? `
        <div class="sb-section sb-sliders">
          <div class="sb-section-label">FADERS</div>
          <div class="sb-row sb-slider-row">
            ${this._createSlidersHTML(sliders, sliderLabels, sliderCCs)}
          </div>
        </div>
      ` : ''}
    `;

    // Cache element references
    instance.elements.knobs = Array.from(container.querySelectorAll('.sb-knob'));
    instance.elements.sliders = Array.from(container.querySelectorAll('.sb-slider'));

    // Setup event handlers
    this._setupEvents(instance);

    // Store instance
    this.instances.set(container, instance);

    return instance;
  },

  /**
   * Create HTML for knobs
   */
  _createKnobsHTML(count, labels, ccs) {
    let html = '';
    for (let i = 0; i < count; i++) {
      const label = labels[i] || `K${i + 1}`;
      const cc = ccs[i] !== undefined ? ccs[i] : (30 + i);
      html += `
        <div class="sb-control sb-knob" data-type="knob" data-index="${i}" data-cc="${cc}">
          <div class="sb-knob-ring">
            <div class="sb-knob-indicator" style="transform: rotate(-135deg)"></div>
          </div>
          <div class="sb-value">64</div>
          <div class="sb-cc">CC${cc}</div>
          <div class="sb-label">${label}</div>
        </div>
      `;
    }
    return html;
  },

  /**
   * Create HTML for sliders
   */
  _createSlidersHTML(count, labels, ccs) {
    let html = '';
    for (let i = 0; i < count; i++) {
      const label = labels[i] || `F${i + 1}`;
      const cc = ccs[i] !== undefined ? ccs[i] : (40 + i);
      html += `
        <div class="sb-control sb-slider" data-type="slider" data-index="${i}" data-cc="${cc}">
          <div class="sb-slider-track">
            <div class="sb-slider-fill" style="height: 0%"></div>
            <div class="sb-slider-thumb" style="bottom: 0%"></div>
          </div>
          <div class="sb-value">0</div>
          <div class="sb-cc">CC${cc}</div>
          <div class="sb-label">${label}</div>
        </div>
      `;
    }
    return html;
  },

  /**
   * Setup event handlers for an instance
   */
  _setupEvents(instance) {
    const { container, onChange } = instance;
    let activeDrag = null;

    const startDrag = (e) => {
      const ctrl = e.target.closest('.sb-control');
      if (!ctrl) return;
      e.preventDefault();

      const type = ctrl.dataset.type;
      const index = parseInt(ctrl.dataset.index);
      const cc = parseInt(ctrl.dataset.cc);
      const values = type === 'knob' ? instance.knobValues : instance.sliderValues;

      activeDrag = {
        ctrl,
        type,
        index,
        cc,
        startY: e.clientY,
        startValue: values[index]
      };
    };

    const updateDrag = (e) => {
      if (!activeDrag) return;
      e.preventDefault();

      const { ctrl, type, index, cc, startY, startValue } = activeDrag;
      const dy = startY - e.clientY;
      const sensitivity = type === 'knob' ? 1 : 2;
      let newValue = Math.round(startValue + dy * sensitivity);
      newValue = Math.max(0, Math.min(127, newValue));

      // Update state
      if (type === 'knob') {
        instance.knobValues[index] = newValue;
      } else {
        instance.sliderValues[index] = newValue;
      }

      // Update UI
      this._updateControlUI(ctrl, newValue, type);

      // Callback
      if (onChange) {
        onChange(type, index, newValue, cc);
      }
    };

    const endDrag = () => {
      activeDrag = null;
    };

    container.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', updateDrag);
    document.addEventListener('mouseup', endDrag);

    // Touch support
    container.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startDrag({ target: e.target, clientY: touch.clientY, preventDefault: () => e.preventDefault() });
    });
    document.addEventListener('touchmove', (e) => {
      if (activeDrag) {
        const touch = e.touches[0];
        updateDrag({ clientY: touch.clientY, preventDefault: () => e.preventDefault() });
      }
    });
    document.addEventListener('touchend', endDrag);

    // Store cleanup function
    instance._cleanup = () => {
      container.removeEventListener('mousedown', startDrag);
      document.removeEventListener('mousemove', updateDrag);
      document.removeEventListener('mouseup', endDrag);
    };
  },

  /**
   * Update a control's UI
   */
  _updateControlUI(ctrl, value, type) {
    const valueEl = ctrl.querySelector('.sb-value');
    valueEl.textContent = value;

    if (type === 'knob') {
      const indicator = ctrl.querySelector('.sb-knob-indicator');
      const angle = -135 + (value / 127) * 270;
      indicator.style.transform = `rotate(${angle}deg)`;
    } else {
      const fill = ctrl.querySelector('.sb-slider-fill');
      const thumb = ctrl.querySelector('.sb-slider-thumb');
      const percent = (value / 127) * 100;
      fill.style.height = percent + '%';
      thumb.style.bottom = percent + '%';
    }
  },

  /**
   * Update a specific control externally (e.g., from MIDI input)
   * @param {Object} instance - SliderBank instance
   * @param {string} type - 'knob' or 'slider'
   * @param {number} index - Control index
   * @param {number} value - MIDI value 0-127
   */
  update(instance, type, index, value) {
    const values = type === 'knob' ? instance.knobValues : instance.sliderValues;
    const elements = type === 'knob' ? instance.elements.knobs : instance.elements.sliders;

    if (index >= 0 && index < values.length) {
      values[index] = value;
      const ctrl = elements[index];
      if (ctrl) {
        this._updateControlUI(ctrl, value, type);
      }
    }
  },

  /**
   * Update a control by CC number
   * @param {Object} instance - SliderBank instance
   * @param {number} cc - MIDI CC number
   * @param {number} value - MIDI value 0-127
   */
  updateByCC(instance, cc, value) {
    // Check knobs
    const knobIndex = instance.knobCCs.indexOf(cc);
    if (knobIndex >= 0) {
      this.update(instance, 'knob', knobIndex, value);
      return true;
    }

    // Check sliders
    const sliderIndex = instance.sliderCCs.indexOf(cc);
    if (sliderIndex >= 0) {
      this.update(instance, 'slider', sliderIndex, value);
      return true;
    }

    return false;
  },

  /**
   * Get all values from an instance
   * @param {Object} instance
   * @returns {Object} { knobs: number[], sliders: number[] }
   */
  getValues(instance) {
    return {
      knobs: [...instance.knobValues],
      sliders: [...instance.sliderValues]
    };
  },

  /**
   * Set all values
   * @param {Object} instance
   * @param {Object} values - { knobs: number[], sliders: number[] }
   */
  setValues(instance, values) {
    if (values.knobs) {
      values.knobs.forEach((v, i) => {
        this.update(instance, 'knob', i, v);
      });
    }
    if (values.sliders) {
      values.sliders.forEach((v, i) => {
        this.update(instance, 'slider', i, v);
      });
    }
  },

  /**
   * Destroy an instance
   */
  destroy(instance) {
    if (instance._cleanup) {
      instance._cleanup();
    }
    this.instances.delete(instance.container);
    instance.container.innerHTML = '';
    instance.container.classList.remove('slider-bank');
  },

  /**
   * Inject CSS styles
   */
  _injectCSS() {
    const style = document.createElement('style');
    style.id = 'slider-bank-css';
    style.textContent = `
      .slider-bank {
        font-family: var(--sb-font);
        font-size: var(--sb-font-size);
        background: var(--sb-bg);
        color: var(--sb-text);
        padding: 12px;
        border-radius: var(--sb-border-radius);
        border: 1px solid var(--sb-border);
      }

      .sb-section {
        margin-bottom: 12px;
      }

      .sb-section:last-child {
        margin-bottom: 0;
      }

      .sb-section-label {
        color: var(--sb-text-dim);
        font-size: 10px;
        letter-spacing: 1px;
        margin-bottom: 8px;
        padding-left: 2px;
      }

      .sb-row {
        display: flex;
        gap: var(--sb-control-gap);
        justify-content: center;
      }

      .sb-control {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        cursor: ns-resize;
        user-select: none;
        touch-action: none;
      }

      .sb-value {
        font-family: var(--sb-font);
        font-size: 11px;
        color: var(--sb-accent);
        min-width: 24px;
        text-align: center;
      }

      .sb-cc {
        font-size: 9px;
        color: var(--sb-text-dim);
      }

      .sb-label {
        font-size: 9px;
        color: var(--sb-text-label);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        max-width: var(--sb-slider-width);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: center;
      }

      /* Knob styles */
      .sb-knob-ring {
        width: var(--sb-knob-size);
        height: var(--sb-knob-size);
        border-radius: 50%;
        background: var(--sb-knob-ring);
        border: 2px solid var(--sb-border);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .sb-knob-ring::before {
        content: '';
        width: 60%;
        height: 60%;
        border-radius: 50%;
        background: var(--sb-knob-center);
        border: 1px solid var(--sb-border-highlight);
      }

      .sb-knob-indicator {
        position: absolute;
        width: 3px;
        height: 40%;
        background: var(--sb-knob-indicator);
        border-radius: 2px;
        top: 8%;
        left: 50%;
        transform-origin: bottom center;
        margin-left: -1.5px;
        box-shadow: 0 0 4px var(--sb-accent-glow);
      }

      /* Slider styles */
      .sb-slider-track {
        width: var(--sb-slider-width);
        height: var(--sb-slider-height);
        background: var(--sb-slider-track);
        border: 2px solid var(--sb-border);
        border-radius: var(--sb-border-radius);
        position: relative;
        overflow: hidden;
      }

      .sb-slider-fill {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(to top, var(--sb-slider-fill), transparent);
        opacity: 0.5;
        transition: height 0.05s ease-out;
      }

      .sb-slider-thumb {
        position: absolute;
        left: 2px;
        right: 2px;
        height: 6px;
        background: var(--sb-slider-thumb);
        border-radius: 2px;
        transform: translateY(50%);
        box-shadow: 0 0 6px var(--sb-accent-glow);
        transition: bottom 0.05s ease-out;
      }

      /* Active state */
      .sb-control:active .sb-knob-ring,
      .sb-control:active .sb-slider-track {
        border-color: var(--sb-accent);
      }

      .sb-control:active .sb-value {
        text-shadow: 0 0 8px var(--sb-accent-glow);
      }

      /* Hover state */
      .sb-control:hover .sb-knob-ring,
      .sb-control:hover .sb-slider-track {
        border-color: var(--sb-border-highlight);
      }
    `;
    document.head.appendChild(style);
  }
};

// Export for module systems or attach to window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SliderBank;
} else if (typeof window !== 'undefined') {
  window.SliderBank = SliderBank;
}

console.log('[SliderBank] Module loaded');
