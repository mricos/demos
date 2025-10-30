/**
 * EQUATION-ANIMATOR.JS
 * Control CSS animations for math elements
 * Brings equations to life with dynamic effects
 */

class EquationAnimator {
    constructor() {
        this.activeAnimations = new Map();
    }

    /**
     * Apply an animation to an element
     * @param {HTMLElement} element - Target element
     * @param {string} animationClass - CSS animation class name
     * @param {number} duration - Duration in ms (0 = use CSS default)
     */
    applyAnimation(element, animationClass, duration = 0) {
        // Remove existing animations
        this.clearAnimations(element);

        // Add new animation
        element.classList.add(animationClass);

        // Track active animation
        const animId = Math.random().toString(36).substr(2, 9);
        this.activeAnimations.set(element, {
            class: animationClass,
            id: animId
        });

        // Auto-remove if duration specified
        if (duration > 0) {
            setTimeout(() => {
                element.classList.remove(animationClass);
                this.activeAnimations.delete(element);
            }, duration);
        }

        return animId;
    }

    /**
     * Clear all animations from an element
     * @param {HTMLElement} element - Target element
     */
    clearAnimations(element) {
        const anim = this.activeAnimations.get(element);
        if (anim) {
            element.classList.remove(anim.class);
            this.activeAnimations.delete(element);
        }
    }

    /**
     * PULSE - Subtle pulsing effect
     * @param {HTMLElement} element
     */
    pulse(element) {
        return this.applyAnimation(element, 'pulse');
    }

    /**
     * PULSE STRONG - More dramatic pulsing
     * @param {HTMLElement} element
     */
    pulseStrong(element) {
        return this.applyAnimation(element, 'pulse-strong');
    }

    /**
     * PULSE GLOW - Pulsing with glow effect
     * @param {HTMLElement} element
     */
    pulseGlow(element) {
        return this.applyAnimation(element, 'pulse-glow');
    }

    /**
     * WIGGLE - Gentle rotation wiggle
     * @param {HTMLElement} element
     */
    wiggle(element) {
        return this.applyAnimation(element, 'wiggle', 800);
    }

    /**
     * WIGGLE SUBTLE - Horizontal movement
     * @param {HTMLElement} element
     */
    wiggleSubtle(element) {
        return this.applyAnimation(element, 'wiggle-subtle');
    }

    /**
     * WIGGLE BOUNCE - Vertical bounce
     * @param {HTMLElement} element
     */
    wiggleBounce(element) {
        return this.applyAnimation(element, 'wiggle-bounce');
    }

    /**
     * GLOW - Blue glow effect
     * @param {HTMLElement} element
     */
    glow(element) {
        return this.applyAnimation(element, 'glow');
    }

    /**
     * GLOW RAINBOW - Rainbow color cycling
     * @param {HTMLElement} element
     */
    glowRainbow(element) {
        return this.applyAnimation(element, 'glow-rainbow');
    }

    /**
     * GLOW TEXT - Text shadow glow
     * @param {HTMLElement} element
     */
    glowText(element) {
        return this.applyAnimation(element, 'glow-text');
    }

    /**
     * SCALE UP - Quick scale animation
     * @param {HTMLElement} element
     */
    scaleUp(element) {
        return this.applyAnimation(element, 'scale-up', 1000);
    }

    /**
     * SCALE BOUNCE - Bouncy scale
     * @param {HTMLElement} element
     */
    scaleBounce(element) {
        return this.applyAnimation(element, 'scale-bounce', 1000);
    }

    /**
     * BREATHE - Slow breathing effect
     * @param {HTMLElement} element
     */
    breathe(element) {
        return this.applyAnimation(element, 'breathe');
    }

    /**
     * COLOR CYCLE - Cycle through colors
     * @param {HTMLElement} element
     */
    colorCycle(element) {
        return this.applyAnimation(element, 'color-cycle');
    }

    /**
     * HIGHLIGHT FLASH - Background flash
     * @param {HTMLElement} element
     */
    highlightFlash(element) {
        return this.applyAnimation(element, 'highlight-flash');
    }

    /**
     * BORDER FLASH - Border outline flash
     * @param {HTMLElement} element
     */
    borderFlash(element) {
        return this.applyAnimation(element, 'border-flash');
    }

    /**
     * SHAKE - Horizontal shake
     * @param {HTMLElement} element
     */
    shake(element) {
        return this.applyAnimation(element, 'shake', 800);
    }

    /**
     * TADA - Celebratory animation
     * @param {HTMLElement} element
     */
    tada(element) {
        return this.applyAnimation(element, 'tada', 1000);
    }

    /**
     * RUBBER BAND - Elastic effect
     * @param {HTMLElement} element
     */
    rubberBand(element) {
        return this.applyAnimation(element, 'rubber-band', 1000);
    }

    /**
     * CONNECTED - Show connection to related elements
     * @param {HTMLElement} element
     */
    connected(element) {
        return this.applyAnimation(element, 'connected');
    }

    /**
     * FLOW - Flowing gradient effect
     * @param {HTMLElement} element
     */
    flow(element) {
        return this.applyAnimation(element, 'flow');
    }

    /**
     * FADE IN - Fade in animation
     * @param {HTMLElement} element
     */
    fadeIn(element) {
        return this.applyAnimation(element, 'fade-in', 400);
    }

    /**
     * FADE OUT - Fade out animation
     * @param {HTMLElement} element
     */
    fadeOut(element) {
        return this.applyAnimation(element, 'fade-out', 400);
    }

    /**
     * FADE IN SCALE - Fade in with scale
     * @param {HTMLElement} element
     */
    fadeInScale(element) {
        return this.applyAnimation(element, 'fade-in-scale', 500);
    }

    /**
     * EMPHASIZE - Composite emphasis effect
     * @param {HTMLElement} element
     */
    emphasize(element) {
        return this.applyAnimation(element, 'emphasize');
    }

    /**
     * SUPER EMPHASIZE - Maximum emphasis
     * @param {HTMLElement} element
     */
    superEmphasize(element) {
        return this.applyAnimation(element, 'super-emphasize');
    }

    /**
     * GENTLE ATTENTION - Subtle attention-getter
     * @param {HTMLElement} element
     */
    gentleAttention(element) {
        return this.applyAnimation(element, 'gentle-attention');
    }

    /**
     * Animate sequence of elements with delay
     * @param {Array<HTMLElement>} elements - Elements to animate
     * @param {string} animationClass - Animation to apply
     * @param {number} staggerDelay - Delay between each (ms)
     */
    stagger(elements, animationClass, staggerDelay = 100) {
        elements.forEach((element, index) => {
            setTimeout(() => {
                this.applyAnimation(element, animationClass);
            }, index * staggerDelay);
        });
    }

    /**
     * Animate equation block
     * @param {string} equationId - Equation block ID
     * @param {string} effect - Effect type
     */
    animateEquation(equationId, effect = 'appear') {
        const block = document.querySelector(`[data-eq-id="${equationId}"]`);
        if (!block) return;

        if (effect === 'appear') {
            this.applyAnimation(block, 'appear', 600);
        } else if (effect === 'highlight') {
            this.applyAnimation(block, 'highlighted');
        }
    }

    /**
     * Synchronize animations across multiple elements
     * @param {Array<HTMLElement>} elements - Elements to sync
     * @param {string} animationClass - Animation to apply
     */
    synchronize(elements, animationClass) {
        // Apply to all at once
        elements.forEach(element => {
            this.applyAnimation(element, animationClass);
        });
    }

    /**
     * Create a custom animation sequence
     * @param {Array<Object>} sequence - Array of {element, animation, delay}
     */
    async playSequence(sequence) {
        for (const step of sequence) {
            await new Promise(resolve => {
                setTimeout(() => {
                    this.applyAnimation(step.element, step.animation, step.duration || 0);
                    resolve();
                }, step.delay || 0);
            });
        }
    }

    /**
     * Stop all animations on the page
     */
    stopAll() {
        this.activeAnimations.forEach((anim, element) => {
            element.classList.remove(anim.class);
        });
        this.activeAnimations.clear();
    }

    /**
     * Get appropriate animation for a given context
     * @param {string} context - Context type
     * @returns {string} Animation class name
     */
    getContextualAnimation(context) {
        const animations = {
            'click': 'emphasize',
            'hover': 'pulse',
            'related': 'connected',
            'definition': 'glow',
            'derivation': 'flow',
            'important': 'super-emphasize',
            'subtle': 'gentle-attention'
        };

        return animations[context] || 'pulse';
    }

    /**
     * Apply physics-inspired animation
     * @param {HTMLElement} element
     * @param {string} type - Physics type (wave, particle, field)
     */
    physics(element, type = 'wave') {
        const animations = {
            'wave': 'wiggle-bounce',
            'particle': 'rubber-band',
            'field': 'flow'
        };

        return this.applyAnimation(element, animations[type] || 'wiggle-bounce');
    }
}

// Create global singleton
window.EquationAnimator = new EquationAnimator();
