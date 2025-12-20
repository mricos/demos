/**
 * CYMATICA Persistence Module
 * Save and restore state to localStorage
 */
(function(CYMATICA) {
    'use strict';

    const STORAGE_KEY = 'cymatica-state';
    const PANEL_STORAGE_KEY = 'cymatica-panel';

    // Debounce helper
    let saveTimer = null;
    function debouncedSave(delay = 500) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => CymaticaPersistence.save(), delay);
    }

    const CymaticaPersistence = {
        /**
         * Save current state to localStorage
         */
        save: function() {
            try {
                const state = CYMATICA.state?.getAll?.();
                if (state) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                    console.log('[CYMATICA.Persistence] State saved');

                    if (CYMATICA.events) {
                        CYMATICA.events.emit(CYMATICA.Events.STATE_SAVED, { state });
                    }
                }
            } catch (e) {
                console.error('[CYMATICA.Persistence] Save failed:', e);
            }
        },

        /**
         * Load saved state from localStorage
         */
        load: function() {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const state = JSON.parse(saved);
                    if (CYMATICA.state?.replaceAll) {
                        CYMATICA.state.replaceAll(state);
                        console.log('[CYMATICA.Persistence] State loaded');
                        return true;
                    }
                }
            } catch (e) {
                console.error('[CYMATICA.Persistence] Load failed:', e);
            }
            return false;
        },

        /**
         * Clear saved state
         */
        clear: function() {
            localStorage.removeItem(STORAGE_KEY);
            console.log('[CYMATICA.Persistence] State cleared');
        },

        /**
         * Save panel state (position, collapsed sections)
         */
        savePanelState: function(panelState) {
            try {
                localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(panelState));
            } catch (e) {
                console.error('[CYMATICA.Persistence] Panel state save failed:', e);
            }
        },

        /**
         * Load panel state
         */
        loadPanelState: function() {
            try {
                const saved = localStorage.getItem(PANEL_STORAGE_KEY);
                return saved ? JSON.parse(saved) : null;
            } catch (e) {
                console.error('[CYMATICA.Persistence] Panel state load failed:', e);
                return null;
            }
        },

        /**
         * Auto-save on state changes
         */
        enableAutoSave: function() {
            if (CYMATICA.events) {
                CYMATICA.events.on(CYMATICA.Events.STATE_CHANGE, (data) => {
                    // Skip internal properties
                    if (data?.path?.startsWith('_')) return;
                    debouncedSave();
                });
                console.log('[CYMATICA.Persistence] Auto-save enabled');
            }
        },

        /**
         * Initialize persistence module
         */
        init: function() {
            // Auto-save is optional, controlled by mode
            if (CYMATICA.Mode?.isFeatureEnabled?.('persistence')) {
                this.enableAutoSave();
            }
        }
    };

    CYMATICA.Persistence = CymaticaPersistence;

})(window.CYMATICA);
