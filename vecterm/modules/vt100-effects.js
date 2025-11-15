/**
 * VT100 Effects Controller
 *
 * Unified interface for controlling VT100 CRT effects across:
 * - CLI terminal panel (CSS variables)
 * - Vecterm demo canvas (renderer config)
 * - VScope canvas (future integration)
 *
 * Now uses centralized config from config/vt100-config.js
 */

import { VT100_EFFECTS, getEffectConfig } from '../config/vt100-config.js';

class VT100Effects {
  constructor() {
    // Initialize effects from config defaults
    this.effects = {};
    VT100_EFFECTS.forEach(effect => {
      this.effects[effect.id] = effect.default;
    });
  }

  /**
   * Set effect value and apply to all targets
   * @param {string} name - Effect name
   * @param {number} value - Effect value
   * @param {boolean} skipNotify - Skip notification (prevents circular updates)
   */
  setEffect(name, value, skipNotify = false) {
    if (!(name in this.effects)) {
      console.warn(`Unknown VT100 effect: ${name}`);
      return;
    }

    this.effects[name] = value;
    this._applyToTargets(name, value);

    // Notify parameter change system for slider synchronization
    if (!skipNotify) {
      this._notifyChange(`vt100.${name}`, value);
    }
  }

  /**
   * Get current effect value
   */
  getEffect(name) {
    return this.effects[name];
  }

  /**
   * Get all effects
   */
  getAllEffects() {
    return { ...this.effects };
  }

  /**
   * Reset all effects to defaults from config
   */
  reset() {
    VT100_EFFECTS.forEach(effect => {
      this.setEffect(effect.id, effect.default);
    });
  }

  /**
   * Apply effect to all registered targets
   */
  _applyToTargets(name, value) {
    // 1. CLI Panel CSS variables
    this._applyCLIPanelEffect(name, value);

    // 2. Vecterm demo canvas
    this._applyVectermEffect(name, value);

    // 3. Update UI controls if they exist
    this._updateUIControls(name, value);
  }

  /**
   * Apply to CLI panel CSS variables
   * Now uses config for CSS variable mapping
   */
  _applyCLIPanelEffect(name, value) {
    const cliPanel = document.getElementById('cli-panel');
    if (!cliPanel) return;

    const config = getEffectConfig(name);
    if (!config || !config.cssVar) return;

    // Format value with unit if needed
    const formattedValue = config.unit === ''
      ? value
      : config.unit === 's'
        ? `${value}s`
        : config.unit === 'px'
          ? `${value}px`
          : `${value}${config.unit}`;

    cliPanel.style.setProperty(config.cssVar, formattedValue);
  }

  /**
   * Apply to Vecterm demo canvas renderer
   */
  _applyVectermEffect(name, value) {
    try {
      const vectermRenderer = window.Vecterm?.vectermControls?.getVectermRenderer();
      if (!vectermRenderer) return;

      switch (name) {
        case 'glow':
          vectermRenderer.config.glowIntensity = value;
          break;
        case 'scanlines':
          vectermRenderer.config.scanlineIntensity = value;
          break;
        case 'scanspeed':
          vectermRenderer.config.scanlineSpeed = value;
          break;
      }
    } catch (e) {
      // Vecterm not running, ignore
    }
  }

  /**
   * Update UI control values (sliders, displays)
   */
  _updateUIControls(name, value) {
    const controlMap = {
      'glow': { slider: 'glow-intensity', display: 'glow-value', format: v => v.toFixed(2) },
      'scanlines': { slider: 'scanline-intensity', display: 'scanline-value', format: v => v.toFixed(2) },
      'scanspeed': { slider: 'scanline-speed', display: 'scanspeed-value', format: v => `${v}s` },
      'wave': { slider: 'wave-amplitude', display: 'wave-value', format: v => `${v}px` },
      'border': { slider: 'border-glow', display: 'border-glow-value', format: v => v.toFixed(2) }
    };

    const mapping = controlMap[name];
    if (!mapping) return;

    const slider = document.getElementById(mapping.slider);
    const display = document.getElementById(mapping.display);

    if (slider) slider.value = value;
    if (display) display.textContent = mapping.format(value);
  }

  /**
   * Notify parameter change listeners (for slider synchronization)
   */
  _notifyChange(command, value) {
    // Use the vt100-silent-updater notification system if available
    if (typeof window !== 'undefined' && window.Vecterm?.update) {
      // Update via the centralized system (will notify all listeners)
      window.Vecterm.update(command, value);
    }
  }
}

// Create singleton instance
const vt100Effects = new VT100Effects();

// Expose globally
if (typeof window !== 'undefined') {
  window.Vecterm = window.Vecterm || {};
  window.Vecterm.VT100 = vt100Effects;
}

export { vt100Effects, VT100Effects };
