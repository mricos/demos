/**
 * MIDI UI VT100 - Terminal-Style MIDI Controller
 *
 * VT100 terminal aesthetic MIDI controller with:
 * - 8 sliders with 4-button mapping slots (a,b,c,d) each
 * - Long-click to assign MIDI CC to slot
 * - localStorage persistence for mappings
 * - Design token colors
 */

import { midiActions } from './midi-context.js';
import { showDangerConfirm } from '../../ui/modal.js';

export class MIDIControllerVT100 {
  constructor(store) {
    this.store = store;
    this.container = null;

    // Control definitions (8 sliders) with unique colors
    this.controls = [
      { id: '1s', label: 'SL1', type: 'slider', color: '#4fc3f7' }, // cyan
      { id: '2s', label: 'SL2', type: 'slider', color: '#81c784' }, // green
      { id: '3s', label: 'SL3', type: 'slider', color: '#ffa726' }, // orange
      { id: '4s', label: 'SL4', type: 'slider', color: '#ba68c8' }, // purple
      { id: '5s', label: 'SL5', type: 'slider', color: '#64b5f6' }, // blue
      { id: '6s', label: 'SL6', type: 'slider', color: '#ffb74d' }, // amber
      { id: '7s', label: 'SL7', type: 'slider', color: '#e57373' }, // red
      { id: '8s', label: 'SL8', type: 'slider', color: '#f06292' }  // pink
    ];

    // Mapping profiles (scale/range/unit configurations)
    this.mappingProfiles = this.initializeMappingProfiles();

    // Control mapping profile assignments: { controlId: { knob: profileName, slider: profileName } }
    this.controlProfiles = {};

    // Mapping slots for each control (a, b, c, d)
    this.mappingSlots = ['a', 'b', 'c', 'd'];

    // Active mapping: { controlId: {
    //   slot: 'a'|'b'|'c'|'d',
    //   knob: { ccNumber, parameter },
    //   slider: { ccNumber, parameter }
    // } }
    this.mappings = {};

    // MIDI learn state
    this.learnMode = {
      active: false,
      controlId: null,
      slot: null,
      element: null,
      timeout: null
    };

    // Long-press state
    this.longPress = {
      timer: null,
      button: null
    };

    // MIDI access for direct listeners
    this.midiAccess = null;
    this.boundMidiHandler = null;

    // Load saved mappings
    this.loadMappings();
  }

  /**
   * Initialize mapping profiles (scale/range/unit configurations)
   */
  initializeMappingProfiles() {
    return {
      // Linear mappings
      'linear-0-1': {
        name: 'Linear 0-1',
        min: 0,
        max: 1,
        scale: 'linear',
        unit: '',
        decimals: 2
      },
      'linear-0-127': {
        name: 'Linear 0-127',
        min: 0,
        max: 127,
        scale: 'linear',
        unit: '',
        decimals: 0
      },

      // Exponential mappings
      'exp-0-1': {
        name: 'Exponential 0-1',
        min: 0,
        max: 1,
        scale: 'exponential',
        exponent: 2,
        unit: '',
        decimals: 3
      },
      'exp2-0-1': {
        name: 'Exponential² 0-1',
        min: 0,
        max: 1,
        scale: 'exponential',
        exponent: 3,
        unit: '',
        decimals: 3
      },

      // Logarithmic mappings
      'log-0-1': {
        name: 'Logarithmic 0-1',
        min: 0.001,
        max: 1,
        scale: 'logarithmic',
        unit: '',
        decimals: 3
      },

      // Frequency mappings
      'freq-20-20k': {
        name: 'Frequency 20Hz-20kHz',
        min: 20,
        max: 20000,
        scale: 'logarithmic',
        unit: 'Hz',
        decimals: 0
      },
      'freq-20-2k': {
        name: 'Frequency 20Hz-2kHz',
        min: 20,
        max: 2000,
        scale: 'logarithmic',
        unit: 'Hz',
        decimals: 0
      },

      // Time mappings
      'time-1ms-10s': {
        name: 'Time 1ms-10s',
        min: 0.001,
        max: 10,
        scale: 'exponential',
        exponent: 2,
        unit: 's',
        decimals: 3
      },
      'time-10ms-3s': {
        name: 'Time 10ms-3s',
        min: 0.01,
        max: 3,
        scale: 'exponential',
        exponent: 2,
        unit: 's',
        decimals: 3
      },

      // BPM mappings
      'bpm-20-300': {
        name: 'BPM 20-300',
        min: 20,
        max: 300,
        scale: 'linear',
        unit: ' BPM',
        decimals: 0
      },
      'bpm-60-180': {
        name: 'BPM 60-180',
        min: 60,
        max: 180,
        scale: 'linear',
        unit: ' BPM',
        decimals: 0
      },

      // Pan/Balance
      'pan': {
        name: 'Pan L-R',
        min: -1,
        max: 1,
        scale: 'linear',
        unit: '',
        decimals: 2
      },

      // Semitones
      'semitones': {
        name: 'Semitones ±24',
        min: -24,
        max: 24,
        scale: 'linear',
        unit: ' st',
        decimals: 0
      },

      // Delta (relative changes)
      'delta-fine': {
        name: 'Delta ±0.1',
        min: -0.1,
        max: 0.1,
        scale: 'linear',
        unit: ' Δ',
        decimals: 3
      },
      'delta-coarse': {
        name: 'Delta ±1.0',
        min: -1,
        max: 1,
        scale: 'linear',
        unit: ' Δ',
        decimals: 2
      }
    };
  }

  /**
   * Initialize UI
   */
  initialize() {
    this.createUI();
    this.setupEventListeners();
    this.updateUI();
    this.setupSavedMidiControls();
    console.log('✓ MIDI VT100 Controller initialized');
  }

  /**
   * Setup real-time MIDI control for all saved mappings
   */
  setupSavedMidiControls() {
    Object.keys(this.mappings).forEach(controlId => {
      const mapping = this.mappings[controlId];

      // Setup knob mapping if exists
      if (mapping?.knob?.ccNumber) {
        this.setupRealTimeMidiControl(controlId, 'knob', mapping.knob.ccNumber);
      }

      // Setup slider mapping if exists
      if (mapping?.slider?.ccNumber) {
        this.setupRealTimeMidiControl(controlId, 'slider', mapping.slider.ccNumber);
      }
    });
  }

  /**
   * Create terminal-style UI
   */
  createUI() {
    this.container = document.createElement('div');
    this.container.id = 'midi-vt100-controller';
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: 480px;
      background: var(--color-bg-panel, #000);
      border: 1px solid var(--color-base-1, #4fc3f7);
      border-radius: 4px;
      box-shadow: 0 0 20px rgba(79, 195, 247, 0.3);
      z-index: var(--z-modal, 1000);
      display: none;
      font-family: var(--font-code, monospace);
      font-size: 9px;
      color: var(--color-text-primary, #4fc3f7);
      padding: 0;
    `;

    // Title bar
    const titleBar = document.createElement('div');
    titleBar.style.cssText = `
      background: var(--color-bg-header, #0a0a0a);
      padding: 4px 8px;
      border-bottom: 1px solid var(--color-base-1, #4fc3f7);
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
      user-select: none;
      height: 20px;
    `;
    titleBar.innerHTML = `
      <span>⦿ MIDI [VT100]</span>
      <span style="cursor: pointer; padding: 0 8px;" id="midi-vt100-close">✕</span>
    `;
    this.container.appendChild(titleBar);

    // Control panel - 8 stacked rows
    const controlPanel = document.createElement('div');
    controlPanel.style.cssText = `
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    `;

    // Create each control
    this.controls.forEach(control => {
      const controlEl = this.createControl(control);
      controlPanel.appendChild(controlEl);
    });

    this.container.appendChild(controlPanel);

    // Footer with save/recall
    const footer = this.createFooter();
    this.container.appendChild(footer);

    // Add to document
    document.body.appendChild(this.container);

    // Add custom slider styling
    this.injectSliderStyles();

    // Make draggable
    this.makeDraggable(titleBar);
  }

  /**
   * Create a single control (horizontal row: buttons | knob | slider)
   */
  createControl(control) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      border: 1px solid var(--color-base-2, #2a4a5a);
      border-radius: 2px;
      padding: 2px 4px;
      background: rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 6px;
      height: 26px;
    `;
    wrapper.dataset.controlId = control.id;

    // 4 Mapping buttons (a, b, c, d) on the left
    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = `
      display: flex;
      gap: 2px;
      flex-shrink: 0;
    `;

    this.mappingSlots.forEach(slot => {
      const btn = document.createElement('button');
      btn.dataset.controlId = control.id;
      btn.dataset.slot = slot;
      btn.textContent = slot;
      btn.style.cssText = `
        width: 14px;
        height: 14px;
        border: 1px solid var(--color-base-2, #2a4a5a);
        background: var(--color-bg-panel, #0a0a0a);
        color: var(--color-base-4, #888);
        font-size: 7px;
        font-weight: bold;
        cursor: pointer;
        border-radius: 2px;
        padding: 0;
        transition: all 0.15s;
        line-height: 12px;
      `;
      btn.classList.add('midi-map-btn');
      buttonGroup.appendChild(btn);
    });
    wrapper.appendChild(buttonGroup);

    // Knob (SVG-based rotary control)
    const knob = this.createKnob(control.id);
    wrapper.appendChild(knob);

    // Knob profile button (gear icon, circular)
    const knobProfileBtn = document.createElement('button');
    knobProfileBtn.dataset.controlId = control.id;
    knobProfileBtn.dataset.target = 'knob';
    knobProfileBtn.classList.add('profile-selector-btn');
    knobProfileBtn.textContent = '⚙';
    knobProfileBtn.style.cssText = `
      width: 14px;
      height: 14px;
      padding: 0;
      border: 1px solid var(--color-base-2, #2a4a5a);
      background: var(--color-bg-panel, #0a0a0a);
      color: var(--color-base-4, #888);
      font-size: 9px;
      cursor: pointer;
      border-radius: 50%;
      line-height: 12px;
      flex-shrink: 0;
    `;
    knobProfileBtn.title = 'Knob mapping profile';
    wrapper.appendChild(knobProfileBtn);

    // Slider (horizontal) with custom color
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '127';
    slider.value = '64';
    slider.className = 'midi-vt100-slider';
    slider.style.cssText = `
      flex-grow: 1;
      height: 4px;
      background: rgba(0, 0, 0, 0.5);
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      border-radius: 2px;
      border: 1px solid ${control.color};
    `;
    slider.dataset.controlId = control.id;
    slider.dataset.type = 'slider';
    slider.dataset.color = control.color;
    wrapper.appendChild(slider);

    // Slider profile button (gear icon, pill-shaped)
    const sliderProfileBtn = document.createElement('button');
    sliderProfileBtn.dataset.controlId = control.id;
    sliderProfileBtn.dataset.target = 'slider';
    sliderProfileBtn.classList.add('profile-selector-btn');
    sliderProfileBtn.textContent = '⚙';
    sliderProfileBtn.style.cssText = `
      width: 18px;
      height: 12px;
      padding: 0;
      border: 1px solid var(--color-base-2, #2a4a5a);
      background: var(--color-bg-panel, #0a0a0a);
      color: var(--color-base-4, #888);
      font-size: 8px;
      cursor: pointer;
      border-radius: 6px;
      line-height: 10px;
      flex-shrink: 0;
    `;
    sliderProfileBtn.title = 'Slider mapping profile';
    wrapper.appendChild(sliderProfileBtn);

    // Value display
    const value = document.createElement('div');
    value.style.cssText = `
      font-size: 8px;
      color: var(--color-base-6, #ffa726);
      min-width: 30px;
      text-align: right;
      flex-shrink: 0;
    `;
    // Initial value with profile formatting
    const initialMidiValue = 64;
    const mappedValue = this.mapMidiValue(control.id, initialMidiValue);
    value.textContent = this.formatValue(control.id, mappedValue);
    value.dataset.valueDisplay = control.id;
    wrapper.appendChild(value);

    return wrapper;
  }

  /**
   * Inject custom slider styles to remove white backgrounds
   */
  injectSliderStyles() {
    const styleId = 'midi-vt100-slider-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .midi-vt100-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--color-base-6, #ffa726);
        border: 1px solid rgba(0, 0, 0, 0.5);
        cursor: pointer;
      }
      .midi-vt100-slider::-moz-range-thumb {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--color-base-6, #ffa726);
        border: 1px solid rgba(0, 0, 0, 0.5);
        cursor: pointer;
      }
      .midi-vt100-slider::-webkit-slider-runnable-track {
        background: transparent;
        border: none;
      }
      .midi-vt100-slider::-moz-range-track {
        background: transparent;
        border: none;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Create an SVG knob control
   */
  createKnob(controlId) {
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      width: 20px;
      height: 20px;
      cursor: pointer;
      flex-shrink: 0;
    `;
    container.dataset.controlId = controlId;
    container.dataset.type = 'knob';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('viewBox', '0 0 20 20');

    // Outer circle
    const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outer.setAttribute('cx', '10');
    outer.setAttribute('cy', '10');
    outer.setAttribute('r', '8');
    outer.setAttribute('fill', 'var(--color-bg-panel, #0a0a0a)');
    outer.setAttribute('stroke', 'var(--color-base-2, #2a4a5a)');
    outer.setAttribute('stroke-width', '1.5');
    svg.appendChild(outer);

    // Indicator line
    const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    indicator.setAttribute('x1', '10');
    indicator.setAttribute('y1', '10');
    indicator.setAttribute('x2', '10');
    indicator.setAttribute('y2', '4');
    indicator.setAttribute('stroke', 'var(--color-base-6, #ffa726)');
    indicator.setAttribute('stroke-width', '1.5');
    indicator.setAttribute('stroke-linecap', 'round');
    indicator.dataset.indicator = controlId;
    svg.appendChild(indicator);

    container.appendChild(svg);
    return container;
  }

  /**
   * Create footer with save/recall
   */
  createFooter() {
    const footer = document.createElement('div');
    footer.style.cssText = `
      border-top: 1px solid var(--color-base-1, #4fc3f7);
      padding: 4px 8px;
      display: flex;
      gap: 6px;
      justify-content: space-between;
      background: var(--color-bg-header, #0a0a0a);
      height: 20px;
      align-items: center;
    `;

    const leftSide = document.createElement('div');
    leftSide.style.cssText = 'display: flex; gap: 6px;';

    const btnStyle = `
      padding: 2px 8px;
      border: 1px solid var(--color-base-1, #4fc3f7);
      background: transparent;
      color: var(--color-base-1, #4fc3f7);
      font-size: 9px;
      cursor: pointer;
      border-radius: 2px;
      font-family: inherit;
      height: 16px;
      line-height: 12px;
    `;

    const saveBtn = document.createElement('button');
    saveBtn.id = 'midi-save-mappings';
    saveBtn.textContent = 'SAVE';
    saveBtn.style.cssText = btnStyle;
    leftSide.appendChild(saveBtn);

    const clearBtn = document.createElement('button');
    clearBtn.id = 'midi-clear-mappings';
    clearBtn.textContent = 'CLEAR';
    clearBtn.style.cssText = btnStyle;
    leftSide.appendChild(clearBtn);

    const statusDiv = document.createElement('div');
    statusDiv.id = 'midi-status-text';
    statusDiv.style.cssText = `
      color: var(--color-base-4, #888);
      font-size: 9px;
      line-height: 16px;
    `;
    statusDiv.textContent = 'Ready';

    footer.appendChild(leftSide);
    footer.appendChild(statusDiv);

    return footer;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close button
    const closeBtn = document.getElementById('midi-vt100-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Slider inputs
    this.container.querySelectorAll('input[type="range"]').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const controlId = e.target.dataset.controlId;
        const value = parseInt(e.target.value);
        this.updateControlValue(controlId, value);
      });

      // Long-click MIDI learn on slider
      this.setupLongClickMidiLearn(slider, slider.dataset.controlId);
    });

    // Knob controls
    this.container.querySelectorAll('[data-type="knob"]').forEach(knob => {
      this.setupKnobInteraction(knob);
      // Long-click MIDI learn on knob
      this.setupLongClickMidiLearn(knob, knob.dataset.controlId);
    });

    // Mapping buttons (long-click to learn)
    this.container.querySelectorAll('.midi-map-btn').forEach(btn => {
      // Mouse events
      btn.addEventListener('mousedown', (e) => this.handleButtonPress(e));
      btn.addEventListener('mouseup', () => this.handleButtonRelease());
      btn.addEventListener('mouseleave', () => this.handleButtonRelease());

      // Touch events
      btn.addEventListener('touchstart', (e) => this.handleButtonPress(e));
      btn.addEventListener('touchend', () => this.handleButtonRelease());
      btn.addEventListener('touchcancel', () => this.handleButtonRelease());

      // Click (activate mapping)
      btn.addEventListener('click', (e) => {
        const { controlId, slot } = e.target.dataset;
        this.activateMapping(controlId, slot);
      });
    });

    // Save button
    const saveBtn = document.getElementById('midi-save-mappings');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveMappings());
    }

    // Clear button
    const clearBtn = document.getElementById('midi-clear-mappings');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearMappings());
    }

    // Profile selector buttons
    this.container.querySelectorAll('.profile-selector-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const controlId = e.target.dataset.controlId;
        const target = e.target.dataset.target; // 'knob' or 'slider'
        this.showProfileSelector(controlId, target, e.target);
      });
    });
  }

  /**
   * Show profile selector dropdown
   */
  showProfileSelector(controlId, target, buttonElement) {
    // Remove any existing dropdown
    const existingDropdown = document.getElementById('midi-profile-dropdown');
    if (existingDropdown) {
      existingDropdown.remove();
    }

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'midi-profile-dropdown';
    dropdown.style.cssText = `
      position: fixed;
      background: var(--color-bg-panel, #000);
      border: 1px solid var(--color-base-1, #4fc3f7);
      border-radius: 4px;
      padding: 4px;
      z-index: 10000;
      max-height: 200px;
      overflow-y: auto;
      font-size: 9px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    `;

    // Position near button
    const rect = buttonElement.getBoundingClientRect();
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.top = `${rect.bottom + 2}px`;

    // Get current profile for this target
    const currentProfile = this.controlProfiles[controlId]?.[target] || 'linear-0-1';

    // Add profile options
    Object.entries(this.mappingProfiles).forEach(([profileKey, profile]) => {
      const option = document.createElement('div');
      option.style.cssText = `
        padding: 4px 8px;
        cursor: pointer;
        color: ${profileKey === currentProfile ? 'var(--color-base-4, #81c784)' : 'var(--color-text-primary, #4fc3f7)'};
        background: ${profileKey === currentProfile ? 'rgba(129, 199, 132, 0.1)' : 'transparent'};
        border-radius: 2px;
        white-space: nowrap;
      `;
      option.textContent = profile.name;
      option.dataset.profileKey = profileKey;

      option.addEventListener('mouseenter', () => {
        if (profileKey !== currentProfile) {
          option.style.background = 'rgba(79, 195, 247, 0.1)';
        }
      });
      option.addEventListener('mouseleave', () => {
        if (profileKey !== currentProfile) {
          option.style.background = 'transparent';
        }
      });

      option.addEventListener('click', () => {
        this.assignProfile(controlId, target, profileKey);
        dropdown.remove();
      });

      dropdown.appendChild(option);
    });

    document.body.appendChild(dropdown);

    // Close on click outside
    setTimeout(() => {
      const closeHandler = (e) => {
        if (!dropdown.contains(e.target) && e.target !== buttonElement) {
          dropdown.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 100);
  }

  /**
   * Assign mapping profile to a control target (knob or slider)
   */
  assignProfile(controlId, target, profileKey) {
    // Ensure controlProfiles entry exists and is an object
    if (!this.controlProfiles[controlId] || typeof this.controlProfiles[controlId] !== 'object') {
      this.controlProfiles[controlId] = {};
    }
    this.controlProfiles[controlId][target] = profileKey;

    // Update display with new profile
    const slider = this.container.querySelector(`input[data-control-id="${controlId}"]`);
    if (slider) {
      const midiValue = parseInt(slider.value);
      this.updateControlValue(controlId, midiValue);
    }

    // Save to localStorage
    this.saveMappings();

    const profile = this.mappingProfiles[profileKey];
    this.setStatus(`${controlId} ${target}: ${profile.name}`, 'var(--color-base-4, #81c784)');
  }

  /**
   * Setup long-click MIDI learn on a control (knob or slider)
   */
  setupLongClickMidiLearn(element, controlId) {
    let longPressTimer = null;
    let originalBackground = null;

    // Determine target type from element
    const target = element.dataset.type === 'knob' ? 'knob' : 'slider';

    const startLongPress = (e) => {
      // Don't interfere with normal dragging/sliding
      longPressTimer = setTimeout(() => {
        // Start MIDI learn for direct CC mapping
        this.startMidiLearnDirect(controlId, target, element);
        originalBackground = element.style.background;
        element.style.background = 'var(--color-base-4, #81c784)';
      }, 800); // 800ms long press
    };

    const cancelLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const resetStyle = () => {
      if (originalBackground !== null) {
        element.style.background = originalBackground;
        originalBackground = null;
      }
    };

    // Mouse events
    element.addEventListener('mousedown', startLongPress);
    element.addEventListener('mouseup', () => {
      cancelLongPress();
      setTimeout(resetStyle, 100);
    });
    element.addEventListener('mouseleave', cancelLongPress);

    // Touch events
    element.addEventListener('touchstart', startLongPress);
    element.addEventListener('touchend', () => {
      cancelLongPress();
      setTimeout(resetStyle, 100);
    });
    element.addEventListener('touchcancel', cancelLongPress);
  }

  /**
   * Handle button press (start long-click timer)
   */
  handleButtonPress(e) {
    e.preventDefault();
    const btn = e.target;
    this.longPress.button = btn;
    this.longPress.timer = setTimeout(() => {
      this.startMidiLearn(btn.dataset.controlId, btn.dataset.slot);
    }, 800); // 800ms long press
  }

  /**
   * Handle button release (cancel long-click)
   */
  handleButtonRelease() {
    if (this.longPress.timer) {
      clearTimeout(this.longPress.timer);
      this.longPress.timer = null;
    }
    this.longPress.button = null;
  }

  /**
   * Start MIDI learn mode for direct CC mapping (knob/slider)
   */
  startMidiLearnDirect(controlId, target, element) {
    this.learnMode.active = true;
    this.learnMode.controlId = controlId;
    this.learnMode.target = target; // 'knob' or 'slider'
    this.learnMode.slot = null; // Direct mapping, no slot
    this.learnMode.element = element;

    this.setStatus(`MIDI LEARN: Move control for ${controlId} ${target}`, 'var(--color-base-4, #81c784)');

    // Setup direct MIDI listener (like tab-completion sliders)
    this.setupDirectMidiListener();

    // Timeout after 10 seconds
    this.learnMode.timeout = setTimeout(() => {
      this.cancelMidiLearn();
    }, 10000);
  }

  /**
   * Setup direct MIDI listener (Web MIDI API)
   */
  setupDirectMidiListener() {
    if (!navigator.requestMIDIAccess) {
      this.setStatus('Web MIDI API not supported', 'var(--color-base-5, #e57373)');
      this.cancelMidiLearn();
      return;
    }

    // Create bound handler for proper cleanup
    this.boundMidiHandler = this.handleDirectMidiMessage.bind(this);

    navigator.requestMIDIAccess().then((midiAccess) => {
      // Store MIDI access for cleanup
      this.midiAccess = midiAccess;

      // Listen to all inputs
      for (const input of midiAccess.inputs.values()) {
        input.addEventListener('midimessage', this.boundMidiHandler);
      }
    }).catch((error) => {
      this.setStatus(`MIDI error: ${error.message}`, 'var(--color-base-5, #e57373)');
      this.cancelMidiLearn();
    });
  }

  /**
   * Handle direct MIDI message during learn mode
   */
  handleDirectMidiMessage(event) {
    if (!this.learnMode.active || this.learnMode.slot !== null) return;

    const [status, data1, data2] = event.data;
    const messageType = status & 0xF0;
    const channel = (status & 0x0F) + 1;

    // Only care about Control Change messages (0xB0)
    if (messageType === 0xB0) {
      const ccNumber = data1;
      const { target } = this.learnMode;

      // Complete the learn with this CC for the specific target
      this.completeMidiLearnDirect(ccNumber, target);

      // Remove listeners
      if (this.midiAccess && this.boundMidiHandler) {
        for (const input of this.midiAccess.inputs.values()) {
          input.removeEventListener('midimessage', this.boundMidiHandler);
        }
        this.boundMidiHandler = null;
      }
    }
  }

  /**
   * Complete direct MIDI learn (separate from slot-based)
   */
  completeMidiLearnDirect(ccNumber, target) {
    const { controlId, element } = this.learnMode;

    // Store mapping locally for specific target (knob or slider)
    if (!this.mappings[controlId]) {
      this.mappings[controlId] = {};
    }
    this.mappings[controlId][target] = {
      ccNumber,
      parameter: `${controlId}_${target}`
    };

    // Dispatch to Redux for centralized state management
    this.store.dispatch({
      type: 'MIDI_MAP_CONTROL',
      payload: {
        controlId: `vt100_${controlId}_${target}`,
        parameter: `${controlId}_${target}`,
        ccNumber: ccNumber
      }
    });

    // Add visual indicator to the specific target
    if (target === 'slider') {
      const slider = this.container.querySelector(`input[data-control-id="${controlId}"]`);
      if (slider) {
        slider.style.borderColor = 'var(--color-base-4, #81c784)';
        slider.style.borderWidth = '2px';
      }
    } else if (target === 'knob') {
      const knob = this.container.querySelector(`[data-type="knob"][data-control-id="${controlId}"]`);
      if (knob) {
        const circle = knob.querySelector('circle');
        if (circle) {
          circle.setAttribute('stroke', 'var(--color-base-4, #81c784)');
          circle.setAttribute('stroke-width', '2');
        }
      }
    }

    this.setStatus(`✓ CC${ccNumber} → ${controlId} ${target}`, 'var(--color-base-4, #81c784)');

    // Setup real-time MIDI control (direct API for speed)
    this.setupRealTimeMidiControl(controlId, target, ccNumber);

    this.cancelMidiLearn();
    this.saveMappings();
  }

  /**
   * Setup real-time MIDI control for a mapped control
   */
  setupRealTimeMidiControl(controlId, target, ccNumber) {
    if (!navigator.requestMIDIAccess) return;

    navigator.requestMIDIAccess().then((midiAccess) => {
      for (const input of midiAccess.inputs.values()) {
        input.addEventListener('midimessage', (event) => {
          const [status, data1, data2] = event.data;
          const messageType = status & 0xF0;

          if (messageType === 0xB0 && data1 === ccNumber) {
            // Update only the specific target (knob or slider)
            this.updateControlValue(controlId, data2, target);
          }
        });
      }
    });
  }

  /**
   * Start MIDI learn mode for a slot
   */
  startMidiLearn(controlId, slot) {
    this.learnMode.active = true;
    this.learnMode.controlId = controlId;
    this.learnMode.slot = slot;
    this.learnMode.element = null;

    this.setStatus(`MIDI LEARN: Move a control for ${controlId}.${slot}`, 'var(--color-base-4, #81c784)');

    // Highlight button
    const btn = this.container.querySelector(`[data-control-id="${controlId}"][data-slot="${slot}"]`);
    if (btn) {
      btn.style.background = 'var(--color-base-4, #81c784)';
      btn.style.color = '#000';
    }

    // Timeout after 10 seconds
    this.learnMode.timeout = setTimeout(() => {
      this.cancelMidiLearn();
    }, 10000);
  }

  /**
   * Complete MIDI learn for slot-based mappings (button assignments)
   * Note: Direct knob/slider mappings use completeMidiLearnDirect()
   */
  completeMidiLearn(ccNumber, parameter) {
    if (!this.learnMode.active) return;

    const { controlId, slot } = this.learnMode;

    // Only handle slot-based mappings here
    if (slot === null) {
      console.warn('completeMidiLearn called for direct mapping - use completeMidiLearnDirect instead');
      return;
    }

    // Slot-based mapping (button)
    if (!this.mappings[controlId]) {
      this.mappings[controlId] = {};
    }
    this.mappings[controlId][slot] = {
      ccNumber,
      parameter: parameter || `unmapped_${ccNumber}`
    };

    // Update UI
    const btn = this.container.querySelector(`[data-control-id="${controlId}"][data-slot="${slot}"]`);
    if (btn) {
      btn.textContent = `${slot}:${ccNumber}`;
      btn.style.borderColor = 'var(--color-base-6, #ffa726)';
    }

    this.setStatus(`✓ CC${ccNumber} → ${controlId}.${slot}`, 'var(--color-base-4, #81c784)');

    this.cancelMidiLearn();
    this.saveMappings();
  }

  /**
   * Cancel MIDI learn
   */
  cancelMidiLearn() {
    if (!this.learnMode.active) return;

    const { controlId, slot, element } = this.learnMode;

    // Reset button style if slot-based
    if (slot !== null) {
      const btn = this.container.querySelector(`[data-control-id="${controlId}"][data-slot="${slot}"]`);
      if (btn) {
        btn.style.background = 'var(--color-bg-panel, #0a0a0a)';
        btn.style.color = 'var(--color-base-4, #888)';
      }
    }

    // Reset element highlight if direct
    if (element) {
      // Restore original background after timeout
      setTimeout(() => {
        const color = element.dataset.color;
        if (color) {
          element.style.borderColor = color;
          element.style.borderWidth = '1px';
        }
      }, 100);
    }

    // Clean up MIDI listeners
    if (this.midiAccess && this.boundMidiHandler) {
      for (const input of this.midiAccess.inputs.values()) {
        input.removeEventListener('midimessage', this.boundMidiHandler);
      }
      this.boundMidiHandler = null;
    }

    if (this.learnMode.timeout) {
      clearTimeout(this.learnMode.timeout);
    }

    this.learnMode = { active: false, controlId: null, slot: null, element: null, timeout: null };
    this.setStatus('Ready');
  }

  /**
   * Activate a mapping slot
   */
  activateMapping(controlId, slot) {
    const mapping = this.mappings[controlId]?.[slot];
    if (!mapping) return;

    // TODO: Apply mapping in Redux state
    this.setStatus(`Activated: ${controlId}.${slot} → CC${mapping.ccNumber}`);
  }

  /**
   * Save mappings and profile assignments to localStorage
   */
  saveMappings() {
    try {
      const data = {
        mappings: this.mappings,
        profiles: this.controlProfiles
      };
      localStorage.setItem('midi-vt100-mappings', JSON.stringify(data));
      this.setStatus('✓ Mappings saved', 'var(--color-base-4, #81c784)');
      setTimeout(() => this.setStatus('Ready'), 2000);
    } catch (e) {
      console.error('Failed to save MIDI mappings:', e);
      this.setStatus('✗ Save failed', 'var(--color-base-5, #e57373)');
    }
  }

  /**
   * Load mappings and profile assignments from localStorage
   */
  loadMappings() {
    try {
      const saved = localStorage.getItem('midi-vt100-mappings');
      if (saved) {
        const data = JSON.parse(saved);

        // Handle both old format (just mappings) and new format (mappings + profiles)
        if (data.mappings) {
          this.mappings = data.mappings;
          this.controlProfiles = data.profiles || {};
        } else {
          // Old format - just mappings
          this.mappings = data;
          this.controlProfiles = {};
        }

        // Migrate old profile format (string) to new format (object with knob/slider)
        Object.keys(this.controlProfiles).forEach(controlId => {
          const profile = this.controlProfiles[controlId];
          if (typeof profile === 'string') {
            // Old format: profile was a string
            // Migrate to new format: { knob: profileName, slider: profileName }
            this.controlProfiles[controlId] = {
              knob: profile,
              slider: profile
            };
          }
        });
      }
    } catch (e) {
      console.error('Failed to load MIDI mappings:', e);
    }
  }

  /**
   * Clear all mappings and profile assignments
   */
  async clearMappings() {
    const confirmed = await showDangerConfirm(
      'Clear all MIDI mappings and profile assignments?',
      'Clear MIDI Mappings',
      {
        confirmLabel: 'Clear All',
        cancelLabel: 'Cancel'
      }
    );

    if (confirmed) {
      this.mappings = {};
      this.controlProfiles = {};
      this.saveMappings();
      this.updateUI();

      // Reset all displays to default profile
      this.controls.forEach(control => {
        this.updateControlValue(control.id, 64); // Reset to center
      });

      this.setStatus('Mappings cleared');
    }
  }

  /**
   * Update UI to reflect current mappings
   */
  updateUI() {
    // Update button mappings
    this.container.querySelectorAll('.midi-map-btn').forEach(btn => {
      const { controlId, slot } = btn.dataset;
      const mapping = this.mappings[controlId]?.[slot];

      if (mapping) {
        btn.textContent = `${slot}:${mapping.ccNumber}`;
        btn.style.borderColor = 'var(--color-base-6, #ffa726)';
      } else {
        btn.textContent = slot;
        btn.style.borderColor = 'var(--color-base-2, #2a4a5a)';
      }
    });

    // Update direct mappings visual indicators (knob and slider separately)
    Object.keys(this.mappings).forEach(controlId => {
      const mapping = this.mappings[controlId];

      // Highlight slider if it has a mapping
      if (mapping?.slider?.ccNumber) {
        const slider = this.container.querySelector(`input[data-control-id="${controlId}"][data-type="slider"]`);
        if (slider) {
          slider.style.borderColor = 'var(--color-base-4, #81c784)';
          slider.style.borderWidth = '2px';
        }
      }

      // Highlight knob if it has a mapping
      if (mapping?.knob?.ccNumber) {
        const knob = this.container.querySelector(`[data-type="knob"][data-control-id="${controlId}"]`);
        if (knob) {
          const circle = knob.querySelector('circle');
          if (circle) {
            circle.setAttribute('stroke', 'var(--color-base-4, #81c784)');
            circle.setAttribute('stroke-width', '2');
          }
        }
      }
    });
  }

  /**
   * Set status message
   */
  setStatus(message, color = 'var(--color-base-4, #888)') {
    const statusEl = document.getElementById('midi-status-text');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.color = color;
    }
  }

  /**
   * Map MIDI value (0-127) using control's assigned profile
   */
  mapMidiValue(controlId, midiValue, target = 'slider') {
    // Get assigned profile for target or default to linear-0-1
    const profileName = this.controlProfiles[controlId]?.[target] || 'linear-0-1';
    const profile = this.mappingProfiles[profileName];

    if (!profile) {
      console.warn(`Profile ${profileName} not found, using linear`);
      return midiValue / 127;
    }

    // Normalize MIDI (0-127) to 0-1
    const normalized = midiValue / 127;

    // Apply scaling
    let scaledValue;
    switch (profile.scale) {
      case 'linear':
        scaledValue = normalized;
        break;

      case 'exponential':
        const exp = profile.exponent || 2;
        scaledValue = Math.pow(normalized, exp);
        break;

      case 'logarithmic':
        // Logarithmic: maps 0-1 to log scale
        // Avoid log(0) by using small offset
        const offset = 0.001;
        const logMin = Math.log(offset);
        const logMax = Math.log(1 + offset);
        scaledValue = (Math.log(normalized + offset) - logMin) / (logMax - logMin);
        break;

      default:
        scaledValue = normalized;
    }

    // Map to range
    const mappedValue = profile.min + (scaledValue * (profile.max - profile.min));
    return mappedValue;
  }

  /**
   * Format value for display using profile
   */
  formatValue(controlId, mappedValue, target = 'slider') {
    const profileName = this.controlProfiles[controlId]?.[target] || 'linear-0-1';
    const profile = this.mappingProfiles[profileName];

    if (!profile) return mappedValue.toString();

    const decimals = profile.decimals || 2;
    const formatted = mappedValue.toFixed(decimals);
    return formatted + profile.unit;
  }

  /**
   * Update control value (syncs knob, slider, and display)
   */
  updateControlValue(controlId, midiValue, target = 'both') {
    // Clamp MIDI value
    midiValue = Math.max(0, Math.min(127, Math.round(midiValue)));

    // Update slider (raw MIDI 0-127) - only if target is 'slider' or 'both'
    if (target === 'slider' || target === 'both') {
      const slider = this.container.querySelector(`input[data-control-id="${controlId}"][data-type="slider"]`);
      if (slider) {
        slider.value = midiValue;
      }
    }

    // Update knob rotation (20x20 knob, center at 10,10, radius 6) - only if target is 'knob' or 'both'
    if (target === 'knob' || target === 'both') {
      const indicator = this.container.querySelector(`[data-indicator="${controlId}"]`);
      if (indicator) {
        // Map 0-127 to -135° to +135° (270° range)
        const angle = -135 + (midiValue / 127) * 270;
        const rad = (angle * Math.PI) / 180;
        const x2 = 10 + Math.sin(rad) * 6;
        const y2 = 10 - Math.cos(rad) * 6;
        indicator.setAttribute('x2', x2);
        indicator.setAttribute('y2', y2);
      }
    }

    // Map value using profile for the specific target
    // Use 'slider' as default for display if both are being updated
    const profileTarget = target === 'both' ? 'slider' : target;
    const mappedValue = this.mapMidiValue(controlId, midiValue, profileTarget);
    const valueDisplay = this.container.querySelector(`[data-value-display="${controlId}"]`);
    if (valueDisplay) {
      valueDisplay.textContent = this.formatValue(controlId, mappedValue, profileTarget);
    }

    // Dispatch with mapped value
    const normalized = midiValue / 127;
    this.store.dispatch(midiActions.controlChange(controlId, normalized));
  }

  /**
   * Setup knob drag interaction
   */
  setupKnobInteraction(knob) {
    const controlId = knob.dataset.controlId;
    let isDragging = false;
    let startY = 0;
    let startValue = 64;

    const onMove = (clientY) => {
      if (!isDragging) return;
      const delta = startY - clientY;
      const newValue = Math.round(startValue + delta * 0.5);
      this.updateControlValue(controlId, newValue);
    };

    knob.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
      const slider = this.container.querySelector(`input[data-control-id="${controlId}"]`);
      startValue = slider ? parseInt(slider.value) : 64;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        onMove(e.clientY);
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Touch support
    knob.addEventListener('touchstart', (e) => {
      isDragging = true;
      startY = e.touches[0].clientY;
      const slider = this.container.querySelector(`input[data-control-id="${controlId}"]`);
      startValue = slider ? parseInt(slider.value) : 64;
      e.preventDefault();
    });

    document.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length > 0) {
        onMove(e.touches[0].clientY);
      }
    });

    document.addEventListener('touchend', () => {
      isDragging = false;
    });
  }

  /**
   * Make element draggable
   */
  makeDraggable(handle) {
    let isDragging = false;
    let currentX, currentY, initialX, initialY;

    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      initialX = e.clientX - this.container.offsetLeft;
      initialY = e.clientY - this.container.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      this.container.style.left = `${currentX}px`;
      this.container.style.top = `${currentY}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  /**
   * Show controller (popup mode)
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
      this.container.style.position = 'fixed';
      this.container.style.bottom = '20px';
      this.container.style.left = '50%';
      this.container.style.transform = 'translateX(-50%)';
    }
  }

  /**
   * Show controller inline (in CLI output)
   */
  showInline() {
    if (!this.container) return;

    // Change to inline mode
    this.container.style.display = 'block';
    this.container.style.position = 'relative';
    this.container.style.bottom = 'auto';
    this.container.style.left = 'auto';
    this.container.style.transform = 'none';
    this.container.style.margin = '8px 0';

    // Remove title bar draggability in inline mode
    const titleBar = this.container.querySelector('div');
    if (titleBar) {
      titleBar.style.cursor = 'default';
    }

    // Add to CLI output
    const cliOutput = document.getElementById('cli-output');
    if (cliOutput && !this.container.parentElement) {
      cliOutput.appendChild(this.container);
      cliOutput.scrollTop = cliOutput.scrollHeight;
    } else if (cliOutput && this.container.parentElement !== cliOutput) {
      // Move from body to CLI output
      cliOutput.appendChild(this.container);
      cliOutput.scrollTop = cliOutput.scrollHeight;
    }
  }

  /**
   * Hide controller
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.container) {
      this.container.remove();
    }
  }
}
