/**
 * Effects Module
 * Visual effects for graphics applications
 */

export { Effect, EffectChain } from './Effect.js';
export { PhosphorEffect } from './PhosphorEffect.js';
export { BloomEffect } from './BloomEffect.js';
export { ScanlineEffect } from './ScanlineEffect.js';
export { GlowEffect } from './GlowEffect.js';

// Default export
import { Effect, EffectChain } from './Effect.js';
import { PhosphorEffect } from './PhosphorEffect.js';
import { BloomEffect } from './BloomEffect.js';
import { ScanlineEffect } from './ScanlineEffect.js';
import { GlowEffect } from './GlowEffect.js';

/**
 * Create a CRT effect chain with all classic effects
 */
export function createCRTEffectChain(options = {}) {
    const chain = new EffectChain();

    chain.add(new PhosphorEffect({
        decay: options.phosphorDecay ?? 0.92,
        warmth: options.phosphorWarmth ?? 0.1,
        intensity: options.phosphorIntensity ?? 1.0
    }));

    chain.add(new BloomEffect({
        radius: options.bloomRadius ?? 4,
        threshold: options.bloomThreshold ?? 0.5,
        intensity: options.bloomIntensity ?? 0.3
    }));

    chain.add(new ScanlineEffect({
        spacing: options.scanlineSpacing ?? 2,
        opacity: options.scanlineOpacity ?? 0.15,
        intensity: options.scanlineIntensity ?? 1.0
    }));

    chain.add(new GlowEffect({
        radius: options.glowRadius ?? 2,
        intensity: options.glowIntensity ?? 0.5
    }));

    return chain;
}

export default {
    Effect,
    EffectChain,
    PhosphorEffect,
    BloomEffect,
    ScanlineEffect,
    GlowEffect,
    createCRTEffectChain
};
