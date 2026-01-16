/**
 * Controls Module
 * Custom web components with CRT/vector styling
 */

export { VectorSlider } from './VectorSlider.js';
export { VectorKnob } from './VectorKnob.js';
export { VectorToggle } from './VectorToggle.js';

// Default export
import { VectorSlider } from './VectorSlider.js';
import { VectorKnob } from './VectorKnob.js';
import { VectorToggle } from './VectorToggle.js';

/**
 * Register all vector controls
 * Call this once at app initialization
 */
export function registerVectorControls() {
    // Elements are auto-registered on import,
    // but this function ensures they're loaded
    return {
        VectorSlider,
        VectorKnob,
        VectorToggle
    };
}

export default {
    VectorSlider,
    VectorKnob,
    VectorToggle,
    registerVectorControls
};
