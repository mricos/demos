/**
 * InputHub - Central input dispatcher (pure router)
 * Receives events from all sources (MIDI, Gamepad, etc.)
 * Routes through InputMaps to update state
 * Supports 4 banks (A/B/C/D) for multiplexing controllers
 *
 * Note: Learn mode is handled by InputLearnUI, not here.
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.InputHub = {
        // Maps indexed by source key for fast lookup (active bank only)
        _mapsBySource: new Map(),

        // Bank-switch maps indexed by source key (always active)
        _bankSwitchBySource: new Map(),

        // Raw event handlers (for learn mode, debug, visualization)
        handlers: [],

        init() {
            this._rebuildIndex();
            this._subscribe();
        },

        // ================================================================
        // Event Emission (called by source adapters)
        // ================================================================

        /**
         * Emit an input event from any source
         * @param {string} source - 'midi' or 'gamepad'
         * @param {string} type - 'continuous' or 'discrete'
         * @param {string} key - e.g., 'cc:1:74' or 'axis:0'
         * @param {number} value - Raw value
         * @param {Object} meta - Additional metadata
         */
        emit(source, type, key, value, meta = {}) {
            const fullKey = `${source}:${key}`;
            const event = { source, type, key, fullKey, value, meta, timestamp: performance.now() };

            // Notify raw event handlers first (learn mode can intercept)
            let handled = false;
            for (const handler of this.handlers) {
                if (handler(event) === true) {
                    handled = true;
                    break;
                }
            }

            if (!handled) {
                // Check bank-switch maps first (always active, intercept before normal routing)
                const bankSwitch = this._bankSwitchBySource.get(event.fullKey);
                if (bankSwitch) {
                    this._handleBankSwitch(bankSwitch.bank, event);
                    return;
                }

                // Apply mapping through active bank
                this._handleApply(event);
            }
        },

        /**
         * Handle bank switch event
         */
        _handleBankSwitch(targetBank, event) {
            const currentBank = APP.State.select('input.activeBank');
            if (currentBank !== targetBank) {
                APP.State.dispatch({ type: 'input.activeBank', payload: targetBank });
                APP.Toast?.success(`Bank ${targetBank}`);
            }
        },

        // ================================================================
        // Apply Mode (normal operation)
        // ================================================================

        _handleApply(event) {
            const map = this._mapsBySource.get(event.fullKey);
            if (!map) return;

            const isDiscrete = APP.InputMap.isDiscrete(map);
            let newValue;

            if (isDiscrete) {
                const currentValue = APP.State.select(map.target.path);
                newValue = APP.InputMap.applyDiscrete(map, currentValue);
            } else {
                newValue = APP.InputMap.transform(map, event.value);
            }

            APP.State.dispatch({ type: map.target.path, payload: newValue });
        },

        // ================================================================
        // Map Management (operates on active bank)
        // ================================================================

        /**
         * Get current active bank
         */
        getActiveBank() {
            return APP.State.select('input.activeBank') || 'A';
        },

        /**
         * Add a new map to active bank
         * @param {Object} map - InputMap instance
         */
        addMap(map) {
            const activeBank = this.getActiveBank();
            const maps = { ...APP.State.select(`input.banks.${activeBank}.maps`) };
            maps[map.id] = APP.InputMap.toJSON(map);
            APP.State.dispatch({ type: `input.banks.${activeBank}.maps`, payload: maps });
        },

        /**
         * Remove a specific map by ID from active bank
         */
        removeMap(mapId) {
            const activeBank = this.getActiveBank();
            const maps = { ...APP.State.select(`input.banks.${activeBank}.maps`) };
            delete maps[mapId];
            APP.State.dispatch({ type: `input.banks.${activeBank}.maps`, payload: maps });
        },

        /**
         * Remove maps for an element from a specific source (active bank)
         */
        removeMapsByElement(elementId, source) {
            const activeBank = this.getActiveBank();
            const maps = { ...APP.State.select(`input.banks.${activeBank}.maps`) };
            let changed = false;

            Object.keys(maps).forEach(id => {
                const map = maps[id];
                if (map.target.elementId === elementId && map.source.type.startsWith(source)) {
                    delete maps[id];
                    changed = true;
                }
            });

            if (changed) {
                APP.State.dispatch({ type: `input.banks.${activeBank}.maps`, payload: maps });
            }
        },

        /**
         * Get all maps for an element (active bank only)
         * @param {string} elementId
         * @returns {Object[]}
         */
        getMapsForElement(elementId) {
            const activeBank = this.getActiveBank();
            const maps = APP.State.select(`input.banks.${activeBank}.maps`) || {};
            return Object.values(maps).filter(m => m.target.elementId === elementId);
        },

        /**
         * Get all maps for an element across all banks
         * @param {string} elementId
         * @returns {Object[]} Maps with bank property added
         */
        getMapsForElementAllBanks(elementId) {
            const result = [];
            ['A', 'B', 'C', 'D'].forEach(bank => {
                const maps = APP.State.select(`input.banks.${bank}.maps`) || {};
                Object.values(maps).forEach(map => {
                    if (map.target.elementId === elementId) {
                        result.push({ ...map, _bank: bank });
                    }
                });
            });
            return result;
        },

        /**
         * Get map count (active bank)
         */
        getMapCount() {
            const activeBank = this.getActiveBank();
            const maps = APP.State.select(`input.banks.${activeBank}.maps`) || {};
            return Object.keys(maps).length;
        },

        /**
         * Get total map count across all banks
         */
        getTotalMapCount() {
            let count = 0;
            ['A', 'B', 'C', 'D'].forEach(bank => {
                const maps = APP.State.select(`input.banks.${bank}.maps`) || {};
                count += Object.keys(maps).length;
            });
            return count;
        },

        /**
         * Clear all maps in active bank
         */
        clearMaps() {
            const activeBank = this.getActiveBank();
            APP.State.dispatch({ type: `input.banks.${activeBank}.maps`, payload: {} });
            APP.Toast?.info(`Bank ${activeBank} bindings cleared`);
        },

        /**
         * Clear maps for a specific source in active bank
         * @param {string} source - 'midi' or 'gamepad'
         */
        clearMapsForSource(source) {
            const activeBank = this.getActiveBank();
            const maps = { ...APP.State.select(`input.banks.${activeBank}.maps`) };
            Object.keys(maps).forEach(id => {
                if (maps[id].source.type.startsWith(source)) {
                    delete maps[id];
                }
            });
            APP.State.dispatch({ type: `input.banks.${activeBank}.maps`, payload: maps });
            APP.Toast?.info(`Bank ${activeBank} ${source.toUpperCase()} bindings cleared`);
        },

        /**
         * Move a map from one bank to another
         */
        moveMapToBank(mapId, fromBank, toBank) {
            if (fromBank === toBank) return;

            const fromMaps = { ...APP.State.select(`input.banks.${fromBank}.maps`) };
            const map = fromMaps[mapId];
            if (!map) return;

            delete fromMaps[mapId];
            const toMaps = { ...APP.State.select(`input.banks.${toBank}.maps`) };
            toMaps[mapId] = map;

            APP.State.batch([
                { type: `input.banks.${fromBank}.maps`, payload: fromMaps },
                { type: `input.banks.${toBank}.maps`, payload: toMaps }
            ]);
            APP.Toast?.success(`Moved to Bank ${toBank}`);
        },

        // ================================================================
        // Bank Switch Map Management
        // ================================================================

        /**
         * Set bank-switch CC for a bank
         */
        setBankSwitchMap(bank, fullKey, sourceType, sourceKey) {
            const switchMaps = { ...APP.State.select('input.bankSwitchMaps') };
            switchMaps[bank] = {
                source: { type: sourceType, key: sourceKey, fullKey }
            };
            APP.State.dispatch({ type: 'input.bankSwitchMaps', payload: switchMaps });
        },

        /**
         * Clear bank-switch CC for a bank
         */
        clearBankSwitchMap(bank) {
            const switchMaps = { ...APP.State.select('input.bankSwitchMaps') };
            switchMaps[bank] = null;
            APP.State.dispatch({ type: 'input.bankSwitchMaps', payload: switchMaps });
        },

        // ================================================================
        // Index Management
        // ================================================================

        _rebuildIndex() {
            this._mapsBySource.clear();
            this._bankSwitchBySource.clear();

            // Index active bank's maps only
            const activeBank = this.getActiveBank();
            const bankMaps = APP.State.select(`input.banks.${activeBank}.maps`) || {};

            Object.values(bankMaps).forEach(mapData => {
                // Use stored fullKey, or reconstruct for legacy data
                const fullKey = mapData.source.fullKey ||
                    `${mapData.source.type.split('-')[0]}:${mapData.source.key}`;
                this._mapsBySource.set(fullKey, mapData);
            });

            // Index bank-switch maps (always active)
            const switchMaps = APP.State.select('input.bankSwitchMaps') || {};
            Object.entries(switchMaps).forEach(([bank, mapData]) => {
                if (mapData?.source?.fullKey) {
                    this._bankSwitchBySource.set(mapData.source.fullKey, { bank, map: mapData });
                }
            });
        },

        _subscribe() {
            // Rebuild on active bank change
            APP.State.subscribe('input.activeBank', () => {
                this._rebuildIndex();
            });

            // Rebuild on any bank's maps change
            APP.State.subscribe('input.banks.*', () => {
                this._rebuildIndex();
            });

            // Rebuild on bank-switch maps change
            APP.State.subscribe('input.bankSwitchMaps', () => {
                this._rebuildIndex();
            });
        },

        // ================================================================
        // Helpers
        // ================================================================

        /**
         * Get source type from source and key
         * @param {string} source - 'midi', 'gamepad', 'lfo', or 'keyboard'
         * @param {string} key - e.g., 'cc:1:74', 'lfo_1', 'KeyA'
         * @returns {string} e.g., 'midi-cc', 'lfo', 'keyboard-key'
         */
        getSourceType(source, key) {
            if (source === 'midi') {
                return key.startsWith('cc:') ? 'midi-cc' : 'midi-note';
            }
            if (source === 'gamepad') {
                return key.startsWith('axis:') ? 'gamepad-axis' : 'gamepad-button';
            }
            if (source === 'lfo') {
                return 'lfo';
            }
            if (source === 'audio-lfo') {
                return 'audio-lfo';
            }
            if (source === 'keyboard') {
                return key.startsWith('hold:') ? 'keyboard-hold' : 'keyboard-key';
            }
            return `${source}-unknown`;
        },

        /**
         * Subscribe to raw input events
         * Handler can return true to intercept (prevent normal routing)
         * @param {Function} handler - (event) => boolean
         * @returns {Function} Unsubscribe function
         */
        on(handler) {
            this.handlers.push(handler);
            return () => {
                const idx = this.handlers.indexOf(handler);
                if (idx > -1) this.handlers.splice(idx, 1);
            };
        }
    };

})(window.APP);
