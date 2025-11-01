/**
 * VScope Effects Pipeline
 *
 * Manages visual effects for field rendering:
 * - Glow: Canvas shadowBlur effect
 * - Bloom: Multi-pass blur with additive blending
 * - Scanlines: CRT-style horizontal scanlines
 *
 * Effects can be toggled and configured in real-time
 */

export class VscopeEffects {
  constructor(effectsState) {
    this.glow = effectsState.glow || { enabled: true, intensity: 0.3, radius: 10 };
    this.bloom = effectsState.bloom || { enabled: true, radius: 5, intensity: 0.5, threshold: 0.5 };
    this.scanlines = effectsState.scanlines || { enabled: true, intensity: 0.15, speed: 8 };

    // Effect order
    this.effectOrder = ['glow', 'bloom', 'scanlines'];
  }

  /**
   * Apply glow effect to context
   */
  applyGlow(ctx) {
    if (!this.glow.enabled) {
      return;
    }

    ctx.shadowBlur = this.glow.radius * this.glow.intensity;
    ctx.shadowColor = ctx.strokeStyle || '#00ff00';
  }

  /**
   * Clear glow effect
   */
  clearGlow(ctx) {
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }

  /**
   * Apply bloom effect (requires re-rendering scene)
   */
  applyBloom(ctx, renderCallback) {
    if (!this.bloom.enabled) {
      renderCallback();
      return;
    }

    // Render scene normally
    renderCallback();

    // Create bloom pass
    ctx.save();
    ctx.globalCompositeOperation = 'screen'; // Additive blending
    ctx.filter = `blur(${this.bloom.radius}px)`;
    ctx.globalAlpha = this.bloom.intensity;

    // Re-render scene for bloom
    renderCallback();

    ctx.restore();
  }

  /**
   * Apply scanlines effect
   */
  applyScanlines(ctx, width, height, time = 0) {
    if (!this.scanlines.enabled) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = this.scanlines.intensity;
    ctx.fillStyle = '#000000';

    // Animated offset based on speed
    const offset = (time * 100 / this.scanlines.speed) % 2;

    // Draw horizontal lines
    for (let y = offset; y < height; y += 2) {
      ctx.fillRect(0, y, width, 1);
    }

    ctx.restore();
  }

  /**
   * Apply all enabled effects
   */
  applyAll(ctx, width, height, renderCallback, time = 0) {
    for (const effectName of this.effectOrder) {
      switch (effectName) {
        case 'glow':
          this.applyGlow(ctx);
          break;

        case 'bloom':
          this.applyBloom(ctx, renderCallback);
          break;

        case 'scanlines':
          this.applyScanlines(ctx, width, height, time);
          break;
      }
    }

    // Clear glow after rendering
    this.clearGlow(ctx);
  }

  /**
   * Set effect enabled state
   */
  setEnabled(effectName, enabled) {
    if (this[effectName]) {
      this[effectName].enabled = enabled;
    }
  }

  /**
   * Update effect parameters
   */
  updateEffect(effectName, params) {
    if (this[effectName]) {
      Object.assign(this[effectName], params);
    }
  }

  /**
   * Update from Redux state
   */
  updateFromState(effectsState) {
    if (effectsState.glow) {
      this.glow = { ...this.glow, ...effectsState.glow };
    }
    if (effectsState.bloom) {
      this.bloom = { ...this.bloom, ...effectsState.bloom };
    }
    if (effectsState.scanlines) {
      this.scanlines = { ...this.scanlines, ...effectsState.scanlines };
    }
  }

  /**
   * Get current effect state
   */
  toState() {
    return {
      glow: { ...this.glow },
      bloom: { ...this.bloom },
      scanlines: { ...this.scanlines }
    };
  }
}
