/**
 * Design Tokens System
 * Inspired by phase field wave interference patterns
 * Primary Font: Azeret Mono (technical monospace)
 * Secondary Font: Space Grotesk (technical sans-serif)
 */

window.DesignTokens = (function() {
    'use strict';

    // Color palette extracted from phase field visualization
    const colors = {
        // Primary spectrum (from wave peaks)
        spectrum: {
            cyan: '#00D4FF',
            blue: '#0066FF',
            purple: '#6600FF',
            magenta: '#FF00FF',
            green: '#00FF64',
            yellow: '#FFFF00'
        },

        // Background layers
        background: {
            primary: '#0A0A12',      // Deep space
            secondary: '#1A1A2E',    // Dark matter
            tertiary: '#2A2A3E',     // Nebula
            elevated: '#3A3A4E'      // Surface
        },

        // Functional colors
        functional: {
            success: '#00FF64',
            warning: '#FFB800',
            error: '#FF3366',
            info: '#00D4FF'
        },

        // Text hierarchy
        text: {
            primary: '#FFFFFF',
            secondary: '#B8B8CC',
            tertiary: '#8888AA',
            disabled: '#4A4A5E'
        },

        // Borders & dividers
        border: {
            subtle: 'rgba(255, 255, 255, 0.08)',
            medium: 'rgba(255, 255, 255, 0.15)',
            strong: 'rgba(255, 255, 255, 0.25)',
            accent: 'rgba(0, 212, 255, 0.4)'
        },

        // Interactive states
        interactive: {
            hover: 'rgba(0, 212, 255, 0.15)',
            active: 'rgba(0, 212, 255, 0.3)',
            focus: 'rgba(0, 212, 255, 0.5)',
            disabled: 'rgba(255, 255, 255, 0.05)'
        },

        // Gamepad type colors
        gamepad: {
            xbox: '#107C10',         // Xbox green
            playstation: '#003087',  // PlayStation blue
            nintendo: '#E60012',     // Nintendo red
            generic: '#888888',      // Generic gray
            virtual: '#00D4FF'       // Virtual cyan
        }
    };

    // Typography scale
    const typography = {
        fonts: {
            mono: '"Azeret Mono", "Courier New", monospace',
            sans: '"Space Grotesk", -apple-system, BlinkMacSystemFont, sans-serif'
        },

        sizes: {
            xs: '0.75rem',    // 12px
            sm: '0.875rem',   // 14px
            base: '1rem',     // 16px
            lg: '1.125rem',   // 18px
            xl: '1.25rem',    // 20px
            '2xl': '1.5rem',  // 24px
            '3xl': '1.875rem' // 30px
        },

        weights: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700
        },

        lineHeights: {
            tight: 1.2,
            base: 1.5,
            relaxed: 1.75
        }
    };

    // Spacing scale (8px base)
    const spacing = {
        xs: '0.25rem',   // 4px
        sm: '0.5rem',    // 8px
        md: '1rem',      // 16px
        lg: '1.5rem',    // 24px
        xl: '2rem',      // 32px
        '2xl': '3rem',   // 48px
        '3xl': '4rem'    // 64px
    };

    // Border radius
    const radii = {
        none: '0',
        sm: '0.25rem',   // 4px
        md: '0.5rem',    // 8px
        lg: '0.75rem',   // 12px
        xl: '1rem',      // 16px
        full: '9999px'
    };

    // Shadows
    const shadows = {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
        glow: {
            cyan: '0 0 20px rgba(0, 212, 255, 0.5)',
            purple: '0 0 20px rgba(102, 0, 255, 0.5)',
            green: '0 0 20px rgba(0, 255, 100, 0.5)'
        }
    };

    // Transitions
    const transitions = {
        fast: '150ms ease',
        base: '250ms ease',
        slow: '400ms ease',
        bounce: '300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    };

    // Z-index scale
    const zIndex = {
        base: 1,
        dropdown: 100,
        modal: 200,
        popover: 300,
        tooltip: 400,
        toast: 500
    };

    /**
     * Generate CSS custom properties
     */
    function generateCSSVariables() {
        const root = document.documentElement;

        // Colors
        Object.entries(colors.spectrum).forEach(([key, value]) => {
            root.style.setProperty(`--color-spectrum-${key}`, value);
        });

        Object.entries(colors.background).forEach(([key, value]) => {
            root.style.setProperty(`--color-bg-${key}`, value);
        });

        Object.entries(colors.functional).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value);
        });

        Object.entries(colors.text).forEach(([key, value]) => {
            root.style.setProperty(`--color-text-${key}`, value);
        });

        Object.entries(colors.border).forEach(([key, value]) => {
            root.style.setProperty(`--color-border-${key}`, value);
        });

        Object.entries(colors.interactive).forEach(([key, value]) => {
            root.style.setProperty(`--color-interactive-${key}`, value);
        });

        Object.entries(colors.gamepad).forEach(([key, value]) => {
            root.style.setProperty(`--color-gamepad-${key}`, value);
        });

        // Typography
        root.style.setProperty('--font-mono', typography.fonts.mono);
        root.style.setProperty('--font-sans', typography.fonts.sans);

        Object.entries(typography.sizes).forEach(([key, value]) => {
            root.style.setProperty(`--text-${key}`, value);
        });

        // Spacing
        Object.entries(spacing).forEach(([key, value]) => {
            root.style.setProperty(`--space-${key}`, value);
        });

        // Radii
        Object.entries(radii).forEach(([key, value]) => {
            root.style.setProperty(`--radius-${key}`, value);
        });

        // Transitions
        Object.entries(transitions).forEach(([key, value]) => {
            root.style.setProperty(`--transition-${key}`, value);
        });
    }

    /**
     * Initialize design system
     */
    function init() {
        generateCSSVariables();
        console.log('[DesignTokens] Design system initialized');
    }

    return {
        colors,
        typography,
        spacing,
        radii,
        shadows,
        transitions,
        zIndex,
        init
    };
})();
