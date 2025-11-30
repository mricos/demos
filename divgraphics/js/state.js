/**
 * State - Centralized State Management
 * One-way data flow with localStorage persistence
 *
 * Module Lifecycle:
 *   1. State.hydrate() - load from localStorage
 *   2. Module.init() - each module calls _restoreFromState() then subscribes
 *   3. Subscribers handle ongoing changes
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.State = {
        state: {},
        defaults: {},
        subscribers: [],
        transitions: [],

        config: {
            transitionLimit: 500,
            storageKey: 'APP_STATE_V1',
            persistDebounce: 100
        },

        _persistTimer: null,

        // ================================================================
        // Core Operations
        // ================================================================

        /**
         * Dispatch an action to update state
         * @param {Object} action - { type: 'outer.radius', payload: 100 }
         */
        dispatch(action) {
            const { type, payload } = action;
            const prev = this.select(type);

            // Update state immutably
            this.state = this._setPath(this.state, type, payload);

            // Record transition
            this._recordTransition(action, prev, payload);

            // Notify subscribers
            this._notify(type, payload);

            // Schedule persist
            this._schedulePersist();
        },

        /**
         * Dispatch multiple actions, notify once per path
         * @param {Array} actions - Array of { type, payload }
         */
        batch(actions) {
            const changes = [];

            actions.forEach(action => {
                const { type, payload } = action;
                const prev = this.select(type);
                this.state = this._setPath(this.state, type, payload);
                this._recordTransition(action, prev, payload);
                changes.push({ type, payload });
            });

            // Notify all affected paths
            changes.forEach(({ type, payload }) => this._notify(type, payload));

            this._schedulePersist();
        },

        // ================================================================
        // Read Operations
        // ================================================================

        /**
         * Get value at path
         * @param {string} path - Dot-notation path like 'outer.radius'
         * @returns {*} Value at path
         */
        select(path) {
            return this._getPath(this.state, path);
        },

        /**
         * Subscribe to state changes
         * @param {string} pattern - Path pattern: 'outer.radius', 'outer.*', or '*'
         * @param {Function} fn - Callback: (value, fullState, meta) => {}
         * @returns {Function} Unsubscribe function
         */
        subscribe(pattern, fn) {
            const sub = { pattern, fn };
            this.subscribers.push(sub);
            return () => {
                const idx = this.subscribers.indexOf(sub);
                if (idx > -1) this.subscribers.splice(idx, 1);
            };
        },

        // ================================================================
        // Persistence
        // ================================================================

        /**
         * Load state from source
         * @param {Object|null} source - Object to merge, or null for localStorage
         */
        hydrate(source = null) {
            if (source) {
                this.state = this._deepMerge(this._deepClone(this.defaults), source);
            } else {
                try {
                    const saved = localStorage.getItem(this.config.storageKey);
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        this.state = this._deepMerge(this._deepClone(this.defaults), parsed);
                    } else {
                        this.state = this._deepClone(this.defaults);
                    }
                } catch (e) {
                    console.warn('State: Failed to hydrate from localStorage', e);
                    this.state = this._deepClone(this.defaults);
                }
            }
            // Migrate old schema to new bank-based structure
            this._migrateSchema();
        },

        /**
         * Migrate old schema structures to new formats
         */
        _migrateSchema() {
            // Migrate old input.maps to bank-based structure
            if (this.state.input?.maps && !this.state.input?.banks) {
                console.log('State: Migrating input bindings to bank schema...');
                const oldMaps = this.state.input.maps;
                const mapCount = Object.keys(oldMaps).length;

                this.state.input = {
                    activeBank: 'A',
                    banks: {
                        A: { maps: oldMaps },
                        B: { maps: {} },
                        C: { maps: {} },
                        D: { maps: {} }
                    },
                    bankSwitchMaps: {
                        A: null,
                        B: null,
                        C: null,
                        D: null
                    }
                };

                if (mapCount > 0) {
                    console.log(`State: Migrated ${mapCount} bindings to Bank A`);
                }
            }

            // Migrate rpb (revolutions per beat) to ppr (pulses per revolution)
            if (this.state.animation?.rpb !== undefined && this.state.animation?.ppr === undefined) {
                const rpb = this.state.animation.rpb;
                // Convert: ppr = 1/rpb (with safeguard for zero)
                const ppr = rpb > 0 ? Math.round(1 / rpb) : 160;
                this.state.animation.ppr = Math.max(1, Math.min(256, ppr));
                delete this.state.animation.rpb;
                console.log(`State: Migrated rpb=${rpb} to ppr=${this.state.animation.ppr}`);
            }

            // Migrate curve.distribute to curve.mode
            if (this.state.curve?.distribute !== undefined && this.state.curve?.mode === undefined) {
                this.state.curve.mode = this.state.curve.distribute ? 'distribute' : 'bezier';
                delete this.state.curve.distribute;
                console.log(`State: Migrated curve.distribute to mode=${this.state.curve.mode}`);
            }

            // Ensure track.rotation exists (new feature)
            if (this.state.track && !this.state.track.rotation) {
                this.state.track.rotation = this.defaults.track.rotation;
                console.log('State: Added track.rotation defaults');
            }
        },

        /**
         * Save state to localStorage
         */
        persist() {
            try {
                localStorage.setItem(this.config.storageKey, JSON.stringify(this.state));
            } catch (e) {
                console.warn('State: Failed to persist to localStorage', e);
            }
        },

        /**
         * Reset state to defaults
         */
        reset() {
            const prev = this._deepClone(this.state);
            this.state = this._deepClone(this.defaults);
            this._recordTransition({ type: '*', payload: this.state }, prev, this.state);
            this._notify('*', this.state);
            this._schedulePersist();
        },

        // ================================================================
        // Transitions (Debug)
        // ================================================================

        _recordTransition(action, prev, next) {
            this.transitions.push({
                timestamp: Date.now(),
                action,
                prev,
                next
            });

            // Ring buffer limit
            if (this.transitions.length > this.config.transitionLimit) {
                this.transitions.shift();
            }
        },

        // ================================================================
        // Internal Helpers
        // ================================================================

        _getPath(obj, path) {
            if (!path || path === '*') return obj;
            return path.split('.').reduce((acc, key) => {
                return acc !== undefined && acc !== null ? acc[key] : undefined;
            }, obj);
        },

        _setPath(obj, path, value) {
            if (!path || path === '*') return value;

            const keys = path.split('.');
            const result = this._deepClone(obj);
            let current = result;

            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (current[key] === undefined) {
                    current[key] = {};
                }
                current = current[key];
            }

            current[keys[keys.length - 1]] = value;
            return result;
        },

        _notify(changedPath, value) {
            const meta = {
                path: changedPath,
                value,
                timestamp: Date.now()
            };

            this.subscribers.forEach(sub => {
                if (this._matchPattern(sub.pattern, changedPath)) {
                    try {
                        sub.fn(value, this.state, meta);
                    } catch (e) {
                        console.error('State: Subscriber error', e);
                    }
                }
            });
        },

        _matchPattern(pattern, path) {
            if (pattern === '*') return true;
            if (pattern === path) return true;

            // Wildcard: 'outer.*' matches 'outer.radius', 'outer.height', etc.
            if (pattern.endsWith('.*')) {
                const prefix = pattern.slice(0, -2);
                return path.startsWith(prefix + '.') || path === prefix;
            }

            // Parent match: 'outer.radius' should notify 'outer.*'
            if (path.endsWith('.*')) {
                const prefix = path.slice(0, -2);
                return pattern.startsWith(prefix + '.') || pattern === prefix;
            }

            return false;
        },

        _schedulePersist() {
            if (this._persistTimer) {
                clearTimeout(this._persistTimer);
            }
            this._persistTimer = setTimeout(() => {
                this.persist();
                this._persistTimer = null;
            }, this.config.persistDebounce);
        },

        _deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (Array.isArray(obj)) return obj.map(item => this._deepClone(item));
            const clone = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clone[key] = this._deepClone(obj[key]);
                }
            }
            return clone;
        },

        _deepMerge(target, source) {
            if (source === null || typeof source !== 'object') return source;
            if (Array.isArray(source)) return source.map(item => this._deepClone(item));

            const result = { ...target };
            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                        result[key] = this._deepMerge(target[key] || {}, source[key]);
                    } else {
                        result[key] = this._deepClone(source[key]);
                    }
                }
            }
            return result;
        }
    };

})(window.APP);
