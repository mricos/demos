/**
 * Design Token Editor Component
 *
 * Provides UI controls for customizing design tokens:
 * - Colors (Primary cyan, Game orange, Success green)
 * - Glow Intensity (Buttons, Panels, FAB buttons)
 * - Button Feel (Transition speed, Hover scale, Border radius)
 *
 * Features:
 * - Live preview of changes
 * - localStorage persistence
 * - Reset to defaults
 */

const TOKEN_DEFAULTS = {
  primaryColor: '#4fc3f7',
  gameColor: '#ffa726',
  successColor: '#66bb6a',
  glowButtons: 10,
  glowPanels: 15,
  glowFab: 12,
  transitionSpeed: 300,
  hoverScale: 1.05,
  borderRadius: 4
};

export class DesignTokenEditor {
  constructor() {
    this.defaults = TOKEN_DEFAULTS;
    this.initialized = false;
  }

  /**
   * Initialize the Design Token Editor
   * Sets up event listeners and loads saved state
   */
  initialize() {
    if (this.initialized) {
      console.warn('[DESIGN TOKENS] Already initialized');
      return;
    }

    this.setupColorPickers();
    this.setupRangeSliders();
    this.setupApplyButton();
    this.setupResetButton();
    this.loadSavedTokens();

    this.initialized = true;
    console.log('[DESIGN TOKENS] Editor initialized');
  }

  /**
   * Setup color pickers to update hex display in real-time
   */
  setupColorPickers() {
    const colorInputs = [
      { picker: 'token-primary-color', hex: 'token-primary-hex', property: '--color-base-1' },
      { picker: 'token-game-color', hex: 'token-game-hex', property: '--color-base-6' },
      { picker: 'token-success-color', hex: 'token-success-hex', property: '--color-base-7' }
    ];

    colorInputs.forEach(({ picker, hex }) => {
      const pickerEl = document.getElementById(picker);
      const hexEl = document.getElementById(hex);
      if (pickerEl && hexEl) {
        pickerEl.addEventListener('input', (e) => {
          hexEl.value = e.target.value;
        });
      }
    });
  }

  /**
   * Setup range sliders to update value display in real-time
   */
  setupRangeSliders() {
    const rangeInputs = [
      { slider: 'token-glow-buttons', label: 'px' },
      { slider: 'token-glow-panels', label: 'px' },
      { slider: 'token-glow-fab', label: 'px' },
      { slider: 'token-transition-speed', label: 'ms' },
      { slider: 'token-hover-scale', label: 'x' },
      { slider: 'token-border-radius', label: 'px' }
    ];

    rangeInputs.forEach(({ slider, label }) => {
      const sliderEl = document.getElementById(slider);
      if (sliderEl) {
        const valueSpan = sliderEl.parentElement.querySelector('.token-value');
        if (valueSpan) {
          sliderEl.addEventListener('input', (e) => {
            valueSpan.textContent = e.target.value + label;
          });
        }
      }
    });
  }

  /**
   * Setup Apply Changes button
   * Applies all token values to CSS custom properties and saves to localStorage
   */
  setupApplyButton() {
    const tokenApply = document.getElementById('token-apply');
    if (!tokenApply) return;

    tokenApply.addEventListener('click', () => {
      this.applyTokens();
    });
  }

  /**
   * Setup Reset to Default button
   * Restores all default values and applies them
   */
  setupResetButton() {
    const tokenReset = document.getElementById('token-reset');
    if (!tokenReset) return;

    tokenReset.addEventListener('click', () => {
      this.resetToDefaults();
    });
  }

  /**
   * Apply all token values to CSS and save to localStorage
   */
  applyTokens() {
    const root = document.documentElement;

    // Apply colors
    const primaryColor = document.getElementById('token-primary-color').value;
    const gameColor = document.getElementById('token-game-color').value;
    const successColor = document.getElementById('token-success-color').value;

    root.style.setProperty('--color-base-1', primaryColor);
    root.style.setProperty('--color-base-6', gameColor);
    root.style.setProperty('--color-base-7', successColor);

    // Apply glow values
    const glowButtons = document.getElementById('token-glow-buttons').value;
    const glowPanels = document.getElementById('token-glow-panels').value;
    const glowFab = document.getElementById('token-glow-fab').value;

    // Update button shadows
    root.style.setProperty('--shadow-sm', `0 0 ${glowButtons}px rgba(79, 195, 247, 0.3)`);
    root.style.setProperty('--shadow-md', `0 0 ${glowPanels}px rgba(79, 195, 247, 0.4)`);
    root.style.setProperty('--shadow-lg', `0 0 ${glowFab}px rgba(79, 195, 247, 0.5)`);

    // Apply button feel
    const transitionSpeed = document.getElementById('token-transition-speed').value;
    const hoverScale = document.getElementById('token-hover-scale').value;
    const borderRadius = document.getElementById('token-border-radius').value;

    root.style.setProperty('--transition-base', `all ${transitionSpeed}ms ease`);
    root.style.setProperty('--hover-scale', hoverScale);
    root.style.setProperty('--radius-sm', `${borderRadius}px`);

    // Save to localStorage
    const tokenValues = {
      primaryColor,
      gameColor,
      successColor,
      glowButtons,
      glowPanels,
      glowFab,
      transitionSpeed,
      hoverScale,
      borderRadius
    };
    localStorage.setItem('vecterm-design-tokens', JSON.stringify(tokenValues));

    console.log('[DESIGN TOKENS] Applied and saved:', tokenValues);
  }

  /**
   * Reset all token values to defaults
   */
  resetToDefaults() {
    // Reset color pickers
    document.getElementById('token-primary-color').value = this.defaults.primaryColor;
    document.getElementById('token-primary-hex').value = this.defaults.primaryColor;
    document.getElementById('token-game-color').value = this.defaults.gameColor;
    document.getElementById('token-game-hex').value = this.defaults.gameColor;
    document.getElementById('token-success-color').value = this.defaults.successColor;
    document.getElementById('token-success-hex').value = this.defaults.successColor;

    // Reset glow sliders
    document.getElementById('token-glow-buttons').value = this.defaults.glowButtons;
    document.getElementById('token-glow-panels').value = this.defaults.glowPanels;
    document.getElementById('token-glow-fab').value = this.defaults.glowFab;

    // Reset button feel sliders
    document.getElementById('token-transition-speed').value = this.defaults.transitionSpeed;
    document.getElementById('token-hover-scale').value = this.defaults.hoverScale;
    document.getElementById('token-border-radius').value = this.defaults.borderRadius;

    // Update value displays
    document.querySelector('#token-glow-buttons').parentElement.querySelector('.token-value').textContent = this.defaults.glowButtons + 'px';
    document.querySelector('#token-glow-panels').parentElement.querySelector('.token-value').textContent = this.defaults.glowPanels + 'px';
    document.querySelector('#token-glow-fab').parentElement.querySelector('.token-value').textContent = this.defaults.glowFab + 'px';
    document.querySelector('#token-transition-speed').parentElement.querySelector('.token-value').textContent = this.defaults.transitionSpeed + 'ms';
    document.querySelector('#token-hover-scale').parentElement.querySelector('.token-value').textContent = this.defaults.hoverScale + 'x';
    document.querySelector('#token-border-radius').parentElement.querySelector('.token-value').textContent = this.defaults.borderRadius + 'px';

    // Apply defaults to CSS
    const root = document.documentElement;
    root.style.setProperty('--color-base-1', this.defaults.primaryColor);
    root.style.setProperty('--color-base-6', this.defaults.gameColor);
    root.style.setProperty('--color-base-7', this.defaults.successColor);
    root.style.setProperty('--shadow-sm', `0 0 ${this.defaults.glowButtons}px rgba(79, 195, 247, 0.3)`);
    root.style.setProperty('--shadow-md', `0 0 ${this.defaults.glowPanels}px rgba(79, 195, 247, 0.4)`);
    root.style.setProperty('--shadow-lg', `0 0 ${this.defaults.glowFab}px rgba(79, 195, 247, 0.5)`);
    root.style.setProperty('--transition-base', `all ${this.defaults.transitionSpeed}ms ease`);
    root.style.setProperty('--hover-scale', this.defaults.hoverScale);
    root.style.setProperty('--radius-sm', `${this.defaults.borderRadius}px`);

    // Clear localStorage
    localStorage.removeItem('vecterm-design-tokens');

    console.log('[DESIGN TOKENS] Reset to defaults');
  }

  /**
   * Load saved tokens from localStorage on startup
   */
  loadSavedTokens() {
    const savedTokens = localStorage.getItem('vecterm-design-tokens');
    if (!savedTokens) return;

    try {
      const tokens = JSON.parse(savedTokens);

      // Set color pickers
      if (tokens.primaryColor) {
        document.getElementById('token-primary-color').value = tokens.primaryColor;
        document.getElementById('token-primary-hex').value = tokens.primaryColor;
      }
      if (tokens.gameColor) {
        document.getElementById('token-game-color').value = tokens.gameColor;
        document.getElementById('token-game-hex').value = tokens.gameColor;
      }
      if (tokens.successColor) {
        document.getElementById('token-success-color').value = tokens.successColor;
        document.getElementById('token-success-hex').value = tokens.successColor;
      }

      // Set glow sliders
      if (tokens.glowButtons) {
        document.getElementById('token-glow-buttons').value = tokens.glowButtons;
        document.querySelector('#token-glow-buttons').parentElement.querySelector('.token-value').textContent = tokens.glowButtons + 'px';
      }
      if (tokens.glowPanels) {
        document.getElementById('token-glow-panels').value = tokens.glowPanels;
        document.querySelector('#token-glow-panels').parentElement.querySelector('.token-value').textContent = tokens.glowPanels + 'px';
      }
      if (tokens.glowFab) {
        document.getElementById('token-glow-fab').value = tokens.glowFab;
        document.querySelector('#token-glow-fab').parentElement.querySelector('.token-value').textContent = tokens.glowFab + 'px';
      }

      // Set button feel sliders
      if (tokens.transitionSpeed) {
        document.getElementById('token-transition-speed').value = tokens.transitionSpeed;
        document.querySelector('#token-transition-speed').parentElement.querySelector('.token-value').textContent = tokens.transitionSpeed + 'ms';
      }
      if (tokens.hoverScale) {
        document.getElementById('token-hover-scale').value = tokens.hoverScale;
        document.querySelector('#token-hover-scale').parentElement.querySelector('.token-value').textContent = tokens.hoverScale + 'x';
      }
      if (tokens.borderRadius) {
        document.getElementById('token-border-radius').value = tokens.borderRadius;
        document.querySelector('#token-border-radius').parentElement.querySelector('.token-value').textContent = tokens.borderRadius + 'px';
      }

      // Apply to CSS
      const root = document.documentElement;
      root.style.setProperty('--color-base-1', tokens.primaryColor);
      root.style.setProperty('--color-base-6', tokens.gameColor);
      root.style.setProperty('--color-base-7', tokens.successColor);
      root.style.setProperty('--shadow-sm', `0 0 ${tokens.glowButtons}px rgba(79, 195, 247, 0.3)`);
      root.style.setProperty('--shadow-md', `0 0 ${tokens.glowPanels}px rgba(79, 195, 247, 0.4)`);
      root.style.setProperty('--shadow-lg', `0 0 ${tokens.glowFab}px rgba(79, 195, 247, 0.5)`);
      root.style.setProperty('--transition-base', `all ${tokens.transitionSpeed}ms ease`);
      root.style.setProperty('--hover-scale', tokens.hoverScale);
      root.style.setProperty('--radius-sm', `${tokens.borderRadius}px`);

      console.log('[DESIGN TOKENS] Loaded from localStorage:', tokens);
    } catch (e) {
      console.error('[DESIGN TOKENS] Failed to load saved tokens:', e);
    }
  }
}

// Export singleton instance
export const designTokenEditor = new DesignTokenEditor();
