/**
 * ParameterRegistry - Single source of truth for bindable parameters
 * Maps element IDs to state paths with metadata
 *
 * On init(), scans DOM for inputs and auto-registers them.
 * Uses data-path attribute for explicit path, or infers from ID.
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    // Path inference rules: ID prefix → state prefix
    const PATH_PREFIXES = {
        'outer': 'outer',
        'inner': 'inner',
        'scene': 'scene',
        'display': 'display'
    };

    // Special cases where ID doesn't follow prefix.property pattern
    const PATH_OVERRIDES = {
        'autoRotate': 'scene.autoRotate',
        'toastsEnabled': 'display.toasts',
        'statsEnabled': 'display.stats'
    };

    APP.ParameterRegistry = {
        parameters: {},

        /**
         * Initialize registry by scanning DOM
         * Reads type/min/max/step from element attributes
         */
        init() {
            this.parameters = {};

            // Scan all inputs with IDs
            const inputs = document.querySelectorAll('input[id], select[id]');
            inputs.forEach(el => {
                const def = this._extractDefinition(el);
                if (def) {
                    this.parameters[el.id] = def;
                }
            });
        },

        /**
         * Extract parameter definition from DOM element
         */
        _extractDefinition(el) {
            // Get path from data-path or infer from ID
            const path = el.dataset.path || this._inferPath(el.id);
            if (!path) return null;

            const type = el.type || 'text';
            const def = { path, type };

            // Extract numeric attributes for range inputs
            if (type === 'range') {
                if (el.min !== '') def.min = parseFloat(el.min);
                if (el.max !== '') def.max = parseFloat(el.max);
                if (el.step !== '') def.step = parseFloat(el.step);
            }

            return def;
        },

        /**
         * Infer state path from element ID
         * outerRadius → outer.radius
         * innerColorSecondary → inner.colorSecondary
         */
        _inferPath(id) {
            // Check special cases first
            if (PATH_OVERRIDES[id]) {
                return PATH_OVERRIDES[id];
            }

            // Find matching prefix
            for (const [prefix, statePath] of Object.entries(PATH_PREFIXES)) {
                if (id.startsWith(prefix) && id.length > prefix.length) {
                    const rest = id.slice(prefix.length);
                    const property = rest.charAt(0).toLowerCase() + rest.slice(1);
                    return `${statePath}.${property}`;
                }
            }

            return null;
        },

        /**
         * Get full parameter definition by element ID
         * @param {string} elementId
         * @returns {Object|null} { path, type, min, max, step }
         */
        get(elementId) {
            return this.parameters[elementId] || null;
        },

        /**
         * Get just the state path (backwards compatible)
         * @param {string} elementId
         * @returns {string|null}
         */
        getPath(elementId) {
            return this.parameters[elementId]?.path || null;
        },

        /**
         * Register a new parameter dynamically
         * @param {string} elementId
         * @param {Object} definition { path, type, min?, max?, step? }
         */
        register(elementId, definition) {
            this.parameters[elementId] = definition;
        },

        /**
         * Get all registered element IDs
         * @returns {string[]}
         */
        getAllIds() {
            return Object.keys(this.parameters);
        },

        /**
         * Find element ID by state path
         * @param {string} path
         * @returns {string|null}
         */
        findByPath(path) {
            for (const [id, def] of Object.entries(this.parameters)) {
                if (def.path === path) return id;
            }
            return null;
        }
    };

})(window.APP);
