/**
 * CYMATICA Configuration Module
 * Feature flags and application defaults
 */
(function(CYMATICA) {
    'use strict';

    // Resolve design mode from URL or config
    function resolveDesignMode(configDefault) {
        const urlParam = CYMATICA.Utils?.getUrlParam?.('design');
        if (urlParam === 'true') return true;
        if (urlParam === 'false') return false;
        return configDefault;
    }

    const CymaticaConfig = {
        version: '2.0.0',

        features: {
            // Design token FAB - hidden by default, ?design=true to enable
            designMode: resolveDesignMode(false),

            // State persistence to localStorage
            persistence: true,

            // Visual effects
            effects: true
        },

        animation: {
            autoRotate: false,
            speed: 1,
            rotSpeed: { x: 5, y: 15, z: 0 }
        },

        rendering: {
            concentric: 5,
            layerOffset: 2,
            strokeWidth: 1.5,
            glowIntensity: 60,
            colorPrimary: '#00ffff',
            colorSecondary: '#ff00aa',
            fov: 1000,
            cameraZ: 600
        },

        effects: {
            scanlines: true,
            vignette: true,
            drawOn: false,
            drawSpeed: 2,
            colorOscillate: false
        },

        ui: {
            sidePanel: true,
            configPanel: false,
            fab: true
        },

        data: {
            source: 'static',
            defaultsPath: 'data/defaults.json'
        },

        /**
         * Get a config value by dot-notation path
         */
        get: function(path) {
            return CYMATICA.Utils?.getByPath?.(this, path) ||
                   path.split('.').reduce((obj, key) => obj && obj[key], this);
        },

        /**
         * Set a config value by dot-notation path
         */
        set: function(path, value) {
            if (CYMATICA.Utils?.setByPath) {
                CYMATICA.Utils.setByPath(this, path, value);
            } else {
                const keys = path.split('.');
                const lastKey = keys.pop();
                const target = keys.reduce((obj, key) => obj[key], this);
                if (target) {
                    target[lastKey] = value;
                }
            }
        },

        /**
         * Initialize from merged config (mode + app overrides)
         */
        init: function(config) {
            const merge = (target, source) => {
                for (const key in source) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        target[key] = target[key] || {};
                        merge(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            };
            merge(this, config);
            console.log('[CYMATICA.Config] Initialized');
        }
    };

    CYMATICA.Config = CymaticaConfig;

})(window.CYMATICA);
