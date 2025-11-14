/**
 * VT100 Effects - Reusable CRT Terminal Visual Effects
 *
 * Extracted from Quadrapong.js VT100 class to be reusable across:
 * - Canvas2DView (main game canvas)
 * - VT100View (terminal character rendering)
 * - VScope terminal output
 *
 * Each View instance can have its own effect configuration.
 */

/**
 * VT100EffectPipeline - Manages and applies CRT effects to canvas
 */
export class VT100EffectPipeline {
  constructor(config = {}) {
    this.config = {
      phosphorColor: config.phosphorColor || '#00ff00',
      phosphorDecay: config.phosphorDecay || 0.95,
      scanlineIntensity: config.scanlineIntensity || 0.15,
      scanlineCount: config.scanlineCount || 2,
      bloom: config.bloom || 3,
      brightness: config.brightness || 1.1,
      contrast: config.contrast || 1.2,

      // Flyback circuit parameters (bad caps simulation)
      rasterWave: {
        enabled: config.rasterWave?.enabled ?? true,
        frequency: config.rasterWave?.frequency || 0.5,  // Hz
        amplitude: config.rasterWave?.amplitude || 2,    // pixels
        drift: config.rasterWave?.drift || 0.1,
        jitter: config.rasterWave?.jitter || 0.5
      },

      // Screen geometry distortion
      geometry: {
        barrel: config.geometry?.barrel || 0.05,
        pincushion: config.geometry?.pincushion || 0.0,
        tilt: config.geometry?.tilt || 0.0
      },

      // Phosphor persistence
      persistence: {
        enabled: config.persistence?.enabled ?? true,
        fadeRate: config.persistence?.fadeRate || 0.02
      }
    };

    // Effect state
    this.time = 0;
    this.rasterOffset = 0;
    this.scanlinePosition = 0;
  }

  /**
   * Update time-based effects
   */
  update(deltaTime) {
    this.time += deltaTime;

    if (this.config.rasterWave.enabled) {
      this.updateRasterWave();
    }
  }

  /**
   * Calculate raster wave offset (flyback distortion)
   */
  updateRasterWave() {
    const wave = this.config.rasterWave;

    // Primary wave from bad caps
    const primaryWave = Math.sin(this.time * wave.frequency * Math.PI * 2) * wave.amplitude;

    // Slow drift
    const drift = Math.sin(this.time * 0.1) * wave.drift;

    // Random jitter
    const jitter = (Math.random() - 0.5) * wave.jitter;

    this.rasterOffset = primaryWave + drift + jitter;
  }

  /**
   * Get current raster offset for entity positioning
   */
  getRasterOffset() {
    return this.rasterOffset;
  }

  /**
   * Apply scanlines effect to canvas
   */
  applyScanlines(ctx, width, height) {
    if (this.config.scanlineIntensity <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.config.scanlineIntensity;
    ctx.fillStyle = '#000000';

    for (let y = 0; y < height; y += this.config.scanlineCount) {
      ctx.fillRect(0, y, width, 1);
    }

    ctx.restore();
  }

  /**
   * Apply phosphor bloom/glow effect
   * Pass a render callback that draws the content to be bloomed
   */
  applyBloom(ctx, renderCallback) {
    if (!this.config.bloom || this.config.bloom <= 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = `blur(${this.config.bloom}px)`;
    ctx.globalAlpha = 0.5;

    renderCallback(ctx, this.rasterOffset);

    ctx.restore();
  }

  /**
   * Apply brightness/contrast adjustments
   */
  applyColorAdjustments(ctx) {
    if (this.config.brightness === 1.0 && this.config.contrast === 1.0) return;

    ctx.filter = `brightness(${this.config.brightness}) contrast(${this.config.contrast})`;
  }

  /**
   * Apply barrel distortion (TODO: requires full canvas recomposition)
   */
  applyBarrelDistortion(ctx, width, height) {
    // This is complex and requires pixel manipulation or WebGL
    // Placeholder for future implementation
    if (this.config.geometry.barrel === 0) return;

    // TODO: Implement barrel distortion via pixel shader or manual transformation
  }

  /**
   * Apply full effect pipeline to canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {Function} bloomRenderCallback - Optional callback for bloom content
   */
  applyAll(ctx, width, height, bloomRenderCallback = null) {
    // Order matters: bloom first, then scanlines on top
    if (bloomRenderCallback) {
      this.applyBloom(ctx, bloomRenderCallback);
    }

    this.applyScanlines(ctx, width, height);
  }

  /**
   * Set configuration value using dot notation
   * @param {string} key - Config key (e.g., 'rasterWave.frequency')
   * @param {*} value - Value to set
   */
  setConfig(key, value) {
    const keys = key.split('.');
    let target = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }

    target[keys[keys.length - 1]] = value;
    return this;
  }

  /**
   * Get configuration value using dot notation
   * @param {string} key - Config key (e.g., 'rasterWave.frequency')
   * @returns {*} Config value, or entire config if no key provided
   */
  getConfig(key = null) {
    if (!key) return this.config;

    const keys = key.split('.');
    let value = this.config;

    for (const k of keys) {
      if (value === undefined) return undefined;
      value = value[k];
    }

    return value;
  }

  /**
   * Reset to default configuration
   */
  reset() {
    this.config = new VT100EffectPipeline().config;
    this.time = 0;
    this.rasterOffset = 0;
    this.scanlinePosition = 0;
  }
}

/**
 * Standalone effect functions (for simpler use cases)
 */

/**
 * Render scanlines on a canvas
 */
export function renderScanlines(ctx, width, height, intensity = 0.15, spacing = 2) {
  if (intensity <= 0) return;

  ctx.save();
  ctx.globalAlpha = intensity;
  ctx.fillStyle = '#000000';

  for (let y = 0; y < height; y += spacing) {
    ctx.fillRect(0, y, width, 1);
  }

  ctx.restore();
}

/**
 * Render bloom/glow effect via blur and screen blend
 */
export function renderBloom(ctx, blurRadius, opacity, renderCallback) {
  if (blurRadius <= 0) return;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.filter = `blur(${blurRadius}px)`;
  ctx.globalAlpha = opacity || 0.5;

  renderCallback(ctx);

  ctx.restore();
}

/**
 * Apply brightness and contrast filters
 */
export function applyColorFilters(ctx, brightness = 1.0, contrast = 1.0) {
  if (brightness === 1.0 && contrast === 1.0) return;
  ctx.filter = `brightness(${brightness}) contrast(${contrast})`;
}
