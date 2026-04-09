/**
 * Strahl.State — Reactive state store with dot-notation access
 * Emits change events. No DOM dependency.
 */
(function(Strahl) {
    'use strict';

    /**
     * Create a state store
     * @param {object} events - Strahl.Events instance
     * @param {object} defaults - Default state values
     * @returns {object} State API
     */
    function create(events, defaults = {}) {
        const state = JSON.parse(JSON.stringify(defaults));

        function getByPath(obj, path) {
            return path.split(/[\.\[\]]/).filter(Boolean).reduce(
                (o, k) => o && o[isNaN(k) ? k : parseInt(k)],
                obj
            );
        }

        function setByPath(obj, path, value) {
            const keys = path.split(/[\.\[\]]/).filter(Boolean);
            let current = obj;
            for (let i = 0; i < keys.length - 1; i++) {
                const k = isNaN(keys[i]) ? keys[i] : parseInt(keys[i]);
                if (!(k in current)) current[k] = {};
                current = current[k];
            }
            const finalKey = keys[keys.length - 1];
            current[isNaN(finalKey) ? finalKey : parseInt(finalKey)] = value;
        }

        return {
            /**
             * Get value at path, or entire state if no path
             */
            get(path) {
                if (!path) return state;
                if (path.includes('.') || path.includes('[')) {
                    return getByPath(state, path);
                }
                return state[path];
            },

            /**
             * Set value at path, emit change event
             */
            set(path, value) {
                const old = this.get(path);
                if (path.includes('.') || path.includes('[')) {
                    setByPath(state, path, value);
                } else {
                    state[path] = value;
                }
                if (events) {
                    events.emit(Strahl.Events.Names.STATE_CHANGE, { path, value, old });
                }
            },

            /**
             * Merge an object into state
             */
            merge(obj) {
                for (const key in obj) {
                    state[key] = obj[key];
                }
                if (events) {
                    events.emit(Strahl.Events.Names.STATE_CHANGE, { path: '*', value: state });
                }
            },

            /**
             * Deep copy of state (for serialization)
             */
            snapshot() {
                return JSON.parse(JSON.stringify(state));
            },

            /**
             * Direct mutable reference (for hot-path code like render loops)
             */
            get raw() { return state; },

            /**
             * Internal path helpers (exposed for hub routing)
             */
            _getByPath: getByPath,
            _setByPath: setByPath
        };
    }

    Strahl.State = { create };

})(window.Strahl);
