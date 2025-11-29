/**
 * InputHub - Central input dispatcher (pure router)
 * Receives events from all sources (MIDI, Gamepad, etc.)
 * Routes through InputMaps to update state
 *
 * Note: Learn mode is handled by InputLearnUI, not here.
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.InputHub = {
        // Maps indexed by source key for fast lookup
        _mapsBySource: new Map(),

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

            // Apply mapping if not intercepted by learn mode
            if (!handled) {
                this._handleApply(event);
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
        // Map Management
        // ================================================================

        /**
         * Add a new map to state
         * @param {Object} map - InputMap instance
         */
        addMap(map) {
            const maps = { ...APP.State.select('input.maps') };
            maps[map.id] = APP.InputMap.toJSON(map);
            APP.State.dispatch({ type: 'input.maps', payload: maps });
        },

        /**
         * Remove maps for an element from a specific source
         */
        removeMapsByElement(elementId, source) {
            const maps = { ...APP.State.select('input.maps') };
            let changed = false;

            Object.keys(maps).forEach(id => {
                const map = maps[id];
                if (map.target.elementId === elementId && map.source.type.startsWith(source)) {
                    delete maps[id];
                    changed = true;
                }
            });

            if (changed) {
                APP.State.dispatch({ type: 'input.maps', payload: maps });
            }
        },

        /**
         * Get all maps for an element
         * @param {string} elementId
         * @returns {Object[]}
         */
        getMapsForElement(elementId) {
            const maps = APP.State.select('input.maps') || {};
            return Object.values(maps).filter(m => m.target.elementId === elementId);
        },

        /**
         * Get map count
         */
        getMapCount() {
            const maps = APP.State.select('input.maps') || {};
            return Object.keys(maps).length;
        },

        /**
         * Clear all maps
         */
        clearMaps() {
            APP.State.dispatch({ type: 'input.maps', payload: {} });
            APP.Toast.info('All bindings cleared');
        },

        /**
         * Clear maps for a specific source
         * @param {string} source - 'midi' or 'gamepad'
         */
        clearMapsForSource(source) {
            const maps = { ...APP.State.select('input.maps') };
            Object.keys(maps).forEach(id => {
                if (maps[id].source.type.startsWith(source)) {
                    delete maps[id];
                }
            });
            APP.State.dispatch({ type: 'input.maps', payload: maps });
            APP.Toast.info(`${source.toUpperCase()} bindings cleared`);
        },

        // ================================================================
        // Index Management
        // ================================================================

        _rebuildIndex() {
            this._mapsBySource.clear();
            const maps = APP.State.select('input.maps') || {};

            Object.values(maps).forEach(mapData => {
                // Use stored fullKey, or reconstruct for legacy data
                const fullKey = mapData.source.fullKey ||
                    `${mapData.source.type.split('-')[0]}:${mapData.source.key}`;
                this._mapsBySource.set(fullKey, mapData);
            });
        },

        _subscribe() {
            APP.State.subscribe('input.maps', () => {
                this._rebuildIndex();
            });
        },

        // ================================================================
        // Helpers
        // ================================================================

        /**
         * Get source type from source and key
         * @param {string} source - 'midi' or 'gamepad'
         * @param {string} key - e.g., 'cc:1:74'
         * @returns {string} e.g., 'midi-cc'
         */
        getSourceType(source, key) {
            if (source === 'midi') {
                return key.startsWith('cc:') ? 'midi-cc' : 'midi-note';
            }
            if (source === 'gamepad') {
                return key.startsWith('axis:') ? 'gamepad-axis' : 'gamepad-button';
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
