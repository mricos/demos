/**
 * CYMATICA Bootloader
 * Phase-based async module loading
 */
(function() {
    'use strict';

    // Ensure CYMATICA namespace exists
    window.CYMATICA = window.CYMATICA || {};

    // Mode configuration
    const MODE_CONFIG = {
        basePath: 'modes/',
        defaultPath: 'modes/cymatica.mode.json',
        extension: '.mode.json'
    };

    // Parse URL parameter for mode
    function getModePath() {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        if (mode) {
            if (mode.includes('/') || mode.includes('.json')) {
                return mode;
            }
            return MODE_CONFIG.basePath + mode + MODE_CONFIG.extension;
        }
        return MODE_CONFIG.defaultPath;
    }

    const Bootloader = {
        loaded: [],
        startTime: Date.now(),
        modePath: getModePath(),

        /**
         * Log with timestamp
         */
        log: function(msg) {
            const elapsed = Date.now() - this.startTime;
            console.log(`[CYMATICA ${elapsed}ms] ${msg}`);
        },

        /**
         * Load a script dynamically
         */
        loadScript: function(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => {
                    this.loaded.push(src);
                    resolve();
                };
                script.onerror = () => reject(new Error(`Failed to load: ${src}`));
                document.head.appendChild(script);
            });
        },

        /**
         * Load a CSS file dynamically
         */
        loadCSS: function(href) {
            return new Promise((resolve) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                link.onload = resolve;
                link.onerror = () => {
                    console.warn(`[CYMATICA] CSS not found: ${href}`);
                    resolve(); // Continue anyway
                };
                document.head.appendChild(link);
            });
        },

        /**
         * Main boot sequence
         */
        boot: async function() {
            this.log('Booting...');

            try {
                // =========================================================
                // Phase 1: Core Modules
                // =========================================================
                this.log('Phase 1: Loading core modules');

                await Promise.all([
                    this.loadScript('js/core/config.js'),
                    this.loadScript('js/core/utils.js')
                ]);

                await this.loadScript('js/core/events.js');
                await this.loadScript('js/core/state.js');

                // =========================================================
                // Phase 2: Mode System
                // =========================================================
                this.log('Phase 2: Loading mode system');

                await this.loadScript('js/core/mode.js');

                if (CYMATICA.Mode) {
                    await CYMATICA.Mode.init(this.modePath);
                    CYMATICA.Mode.apply();
                }

                // =========================================================
                // Phase 3: Feature Modules
                // =========================================================
                this.log('Phase 3: Loading feature modules');

                await Promise.all([
                    this.loadScript('js/modules/render.js'),
                    this.loadScript('js/modules/input.js')
                ]);

                // =========================================================
                // Phase 3b: Modulation System
                // =========================================================
                this.log('Phase 3b: Loading modulation system');

                // Ensure mod namespace exists
                CYMATICA.mod = CYMATICA.mod || {};

                await this.loadScript('js/mod/mapper.js');
                await this.loadScript('js/mod/lfo.js');
                await this.loadScript('js/mod/asr.js');
                await this.loadScript('js/mod/hub.js');
                await this.loadScript('js/mod/broadcast.js');
                await this.loadScript('js/mod-ui.js');

                // =========================================================
                // Phase 4: UI Modules (conditional)
                // =========================================================
                this.log('Phase 4: Loading UI modules');

                const uiConfig = CYMATICA.Mode?.getUI?.() || { sidePanel: true };

                if (uiConfig.sidePanel !== false) {
                    await this.loadScript('js/ui/controls.js');
                }

                // =========================================================
                // Phase 5: Design Mode (conditional)
                // =========================================================
                const designMode = CYMATICA.Config?.features?.designMode ||
                                   CYMATICA.Utils?.getUrlParamBool?.('design') ||
                                   new URLSearchParams(window.location.search).get('design') === 'true';

                if (designMode) {
                    this.log('Phase 5: Loading design mode');

                    // Create TERRAIN shim for TUT (TUT requires window.TERRAIN)
                    window.TERRAIN = window.TERRAIN || {
                        modules: {},
                        register: function(name, module) {
                            this.modules[name] = module;
                            this[name] = module;
                            console.log('[TERRAIN shim] Registered:', name);
                        }
                    };

                    await Promise.all([
                        this.loadCSS('lib/tut.css'),
                        this.loadScript('lib/tut.js')
                    ]);

                    // TUT auto-initializes when ?design=true is present
                    this.log('TUT loaded');

                    // Load config panel
                    await this.loadScript('js/ui/config-panel.js').catch(() => {
                        this.log('config-panel.js not found (optional)');
                    });
                }

                // =========================================================
                // Phase 6: Persistence (conditional)
                // =========================================================
                const persistenceEnabled = CYMATICA.Mode?.isFeatureEnabled?.('persistence') !== false;

                if (persistenceEnabled) {
                    this.log('Phase 6: Loading persistence');

                    try {
                        await this.loadScript('js/modules/persistence.js');
                        if (CYMATICA.Persistence?.load) {
                            CYMATICA.Persistence.load();
                        }
                    } catch (e) {
                        this.log('Persistence module not found (optional)');
                    }
                }

                // =========================================================
                // Phase 7: Initialize Modules
                // =========================================================
                this.log('Phase 7: Initializing modules');

                this.initModules();

                // =========================================================
                // Phase 8: DOM Bindings
                // =========================================================
                this.log('Phase 8: Binding DOM');

                if (CYMATICA.events?.bindDOM) {
                    CYMATICA.events.bindDOM();
                }

                // =========================================================
                // Phase 9: Start Animation Loop
                // =========================================================
                this.log('Phase 9: Starting animation');

                if (CYMATICA.render?.animate) {
                    requestAnimationFrame(CYMATICA.render.animate);
                }

                // =========================================================
                // Phase 10: Ready
                // =========================================================
                const loadTime = Date.now() - this.startTime;

                if (CYMATICA.events) {
                    CYMATICA.events.emit(CYMATICA.Events.READY, {
                        loadTime: loadTime,
                        modules: this.loaded,
                        mode: CYMATICA.Mode?.getName?.()
                    });
                }

                this.log(`Ready (${loadTime}ms)`);
                this.hideLoading();

            } catch (error) {
                console.error('[CYMATICA] Boot failed:', error);
                this.showError(error.message);
            }
        },

        /**
         * Initialize all loaded modules
         */
        initModules: function() {
            // Initialize modulation modules first (nested in CYMATICA.mod)
            const modModules = ['lfo', 'asr', 'hub', 'broadcast'];
            modModules.forEach(name => {
                const module = CYMATICA.mod?.[name];
                if (module && typeof module.init === 'function') {
                    try {
                        module.init();
                        this.log(`Initialized: mod.${name}`);
                    } catch (e) {
                        console.error(`[CYMATICA] Failed to init mod.${name}:`, e);
                    }
                }
            });

            // Start LFO engine
            if (CYMATICA.mod?.lfo?.start) {
                CYMATICA.mod.lfo.start();
                this.log('Started: mod.lfo');
            }

            // Initialize main modules
            const modules = ['render', 'input', 'ui', 'controls', 'modUI', 'Persistence', 'ConfigPanel'];

            modules.forEach(name => {
                const module = CYMATICA[name];
                if (module && typeof module.init === 'function') {
                    try {
                        module.init();
                        this.log(`Initialized: ${name}`);
                    } catch (e) {
                        console.error(`[CYMATICA] Failed to init ${name}:`, e);
                    }
                }
            });
        },

        /**
         * Hide loading overlay
         */
        hideLoading: function() {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.classList.add('fade-out');
                setTimeout(() => overlay.remove(), 400);
            }
        },

        /**
         * Show error in loading overlay
         */
        showError: function(message) {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                const text = overlay.querySelector('.loading-text');
                if (text) {
                    text.textContent = 'LOAD ERROR';
                    text.style.color = 'var(--error, #ff4444)';
                }
            }
            console.error('[CYMATICA] Error:', message);
        }
    };

    // Export bootloader
    CYMATICA.Bootloader = Bootloader;

    // Auto-boot when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Bootloader.boot());
    } else {
        Bootloader.boot();
    }

})();
