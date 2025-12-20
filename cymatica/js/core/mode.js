/**
 * CYMATICA Mode Module
 * Unified behavioral configuration
 *
 * Mode controls:
 * - Animation behavior
 * - Rendering settings
 * - Effects (scanlines, vignette, etc.)
 * - UI visibility
 * - Feature flags
 * - Default theme
 */
(function(CYMATICA) {
    'use strict';

    const CymaticaMode = {
        config: null,
        modeName: null,
        themeName: null,

        /**
         * Default mode (cymatica)
         */
        defaults: {
            mode: {
                name: 'Cymatica',
                version: '1.0.0',
                description: 'Quadrascan Vector Art - Default Mode'
            },
            defaultTheme: 'phosphor',
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
            features: {
                designMode: false,
                persistence: true,
                effects: true
            }
        },

        /**
         * Initialize mode module
         * @param {string} modePath - Path to mode JSON file
         * @param {string} themeName - Optional theme override
         */
        init: async function(modePath, themeName) {
            const path = modePath || 'modes/cymatica.mode.json';

            try {
                const response = await fetch(path);
                if (!response.ok) {
                    throw new Error('Mode not found: ' + path);
                }
                this.config = await response.json();
                this.modeName = this.config.mode?.name || 'Unknown';
                console.log('[CYMATICA.Mode] Loaded:', this.modeName);

                // Determine theme: explicit > mode default > system default
                this.themeName = themeName || this.config.defaultTheme || 'phosphor';

                return true;
            } catch (e) {
                console.log('[CYMATICA.Mode] Using defaults:', e.message);
                this.config = this.defaults;
                this.modeName = 'default';
                this.themeName = themeName || 'phosphor';
                return false;
            }
        },

        /**
         * Check if URL has a parameter
         */
        _hasUrlParam: function(name) {
            return CYMATICA.Utils?.hasUrlParam?.(name) ||
                   new URLSearchParams(window.location.search).has(name);
        },

        /**
         * Get URL parameter value
         */
        _getUrlParam: function(name) {
            return CYMATICA.Utils?.getUrlParam?.(name) ||
                   new URLSearchParams(window.location.search).get(name);
        },

        /**
         * Apply mode settings to CYMATICA.Config and state
         * URL parameters always override mode settings
         */
        apply: function() {
            if (!this.config) return;

            const Config = CYMATICA.Config;
            if (!Config) {
                console.warn('[CYMATICA.Mode] Config not available');
                return;
            }

            // Apply animation settings
            if (this.config.animation) {
                Config.animation = Config.animation || {};
                Object.assign(Config.animation, this.config.animation);
            }

            // Apply rendering settings
            if (this.config.rendering) {
                Config.rendering = Config.rendering || {};
                Object.assign(Config.rendering, this.config.rendering);
            }

            // Apply effects settings
            if (this.config.effects) {
                Config.effects = Config.effects || {};
                Object.assign(Config.effects, this.config.effects);
            }

            // Apply feature flags (but don't override URL params)
            if (this.config.features) {
                Config.features = Config.features || {};
                for (const [key, value] of Object.entries(this.config.features)) {
                    // Skip designMode if URL param is set
                    if (key === 'designMode' && this._hasUrlParam('design')) {
                        continue;
                    }
                    Config.features[key] = value;
                }
            }

            // Apply UI visibility
            if (this.config.ui) {
                Config.ui = Config.ui || {};
                Object.assign(Config.ui, this.config.ui);
            }

            // Apply to state if available
            if (CYMATICA.state && this.config.rendering) {
                const state = CYMATICA.state._state;
                if (state) {
                    // Apply rendering defaults to state
                    for (const [key, value] of Object.entries(this.config.rendering)) {
                        if (key in state) {
                            state[key] = value;
                        }
                    }
                    // Apply effects to state
                    if (this.config.effects) {
                        for (const [key, value] of Object.entries(this.config.effects)) {
                            if (key in state) {
                                state[key] = value;
                            }
                        }
                    }
                    // Apply animation to state
                    if (this.config.animation) {
                        if (this.config.animation.rotSpeed) {
                            state.rotSpeed = { ...this.config.animation.rotSpeed };
                        }
                        state.animSpeed = this.config.animation.speed || 1;
                        state.animating = this.config.animation.autoRotate || false;
                    }
                }
            }

            // Emit event
            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.MODE_APPLIED, {
                    mode: this.modeName,
                    theme: this.themeName,
                    config: this.config
                });
            }

            console.log('[CYMATICA.Mode] Applied:', this.modeName);
        },

        // =====================================================================
        // Query Methods
        // =====================================================================

        /**
         * Check if a feature is enabled
         */
        isFeatureEnabled: function(feature) {
            return this.config?.features?.[feature] !== false;
        },

        /**
         * Check if animation should auto-start
         */
        isAutoRotate: function() {
            return this.config?.animation?.autoRotate === true;
        },

        /**
         * Get UI visibility config
         */
        getUI: function() {
            return this.config?.ui || { sidePanel: true, configPanel: false, fab: true };
        },

        /**
         * Get rendering config
         */
        getRendering: function() {
            return this.config?.rendering || this.defaults.rendering;
        },

        /**
         * Get effects config
         */
        getEffects: function() {
            return this.config?.effects || this.defaults.effects;
        },

        /**
         * Get animation config
         */
        getAnimation: function() {
            return this.config?.animation || this.defaults.animation;
        },

        /**
         * Get raw config object
         */
        getConfig: function() {
            return this.config;
        },

        /**
         * Get mode name
         */
        getName: function() {
            return this.modeName;
        },

        /**
         * Get theme name
         */
        getTheme: function() {
            return this.themeName;
        },

        /**
         * Switch theme at runtime
         */
        switchTheme: function(themeName) {
            this.themeName = themeName;

            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.THEME_CHANGED, {
                    theme: themeName
                });
            }
        }
    };

    CYMATICA.Mode = CymaticaMode;

})(window.CYMATICA);
