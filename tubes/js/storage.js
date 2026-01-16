// TUBES.storage - LocalStorage Persistence
(function(TUBES) {
    'use strict';

    const STORAGE_KEY = 'tubes_app_state';

    TUBES.storage = {
        storedPanelsState: null,

        init() {
            this.load();
            console.log('TUBES.storage: initialized');
        },

        save() {
            const state = {
                settings: TUBES.config.settings,
                panels: this.getPanelsState(),
                groups: {
                    groups: TUBES.groups ? TUBES.groups.groups : [],
                    nextGroupId: TUBES.groups ? TUBES.groups.nextGroupId : 0
                }
            };

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                console.log('TUBES.storage: state saved');
                return true;
            } catch (error) {
                console.error('TUBES.storage: save failed', error);
                return false;
            }
        },

        load() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const state = JSON.parse(stored);

                    if (state.settings) {
                        Object.assign(TUBES.config.settings, state.settings);
                    }

                    this.storedPanelsState = state.panels;

                    if (state.groups && TUBES.groups) {
                        TUBES.groups.groups = state.groups.groups || [];
                        TUBES.groups.nextGroupId = state.groups.nextGroupId || 0;
                    }

                    console.log('TUBES.storage: state loaded');
                    return state;
                }
            } catch (error) {
                console.error('TUBES.storage: load failed', error);
            }
            return null;
        },

        getPanelsState() {
            if (!TUBES.panels || !TUBES.panels.panelDefinitions) return null;

            const panelsState = {
                order: TUBES.panels.panelOrder,
                collapsed: {}
            };

            TUBES.panels.panelDefinitions.forEach(panel => {
                panelsState.collapsed[panel.id] = panel.collapsed || false;

                if (panel.subPanels) {
                    panel.subPanels.forEach(subPanel => {
                        panelsState.collapsed[`${panel.id}_${subPanel.id}`] = subPanel.collapsed || false;
                    });
                }
            });

            return panelsState;
        },

        clear() {
            try {
                localStorage.removeItem(STORAGE_KEY);
                console.log('TUBES.storage: cleared');
                return true;
            } catch (error) {
                console.error('TUBES.storage: clear failed', error);
                return false;
            }
        },

        export() {
            const state = {
                settings: TUBES.config.settings,
                panels: this.getPanelsState(),
                timestamp: new Date().toISOString()
            };

            const json = JSON.stringify(state, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `tubes_config_${Date.now()}.json`;
            a.click();

            URL.revokeObjectURL(url);
            console.log('TUBES.storage: exported');
        },

        import(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = (e) => {
                    try {
                        const state = JSON.parse(e.target.result);

                        if (state.settings) {
                            Object.assign(TUBES.config.settings, state.settings);
                        }

                        if (state.panels) {
                            this.storedPanelsState = state.panels;
                        }

                        if (TUBES.panels) {
                            TUBES.panels.rebuild();
                        }

                        console.log('TUBES.storage: imported');
                        resolve(state);
                    } catch (error) {
                        console.error('TUBES.storage: import failed', error);
                        reject(error);
                    }
                };

                reader.onerror = reject;
                reader.readAsText(file);
            });
        }
    };
})(window.TUBES);
