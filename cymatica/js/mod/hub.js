// CYMATICA.mod.hub - Central Modulation Router
// Routes modulation sources (LFO, ASR, external) to state parameters
(function(CYMATICA) {
    'use strict';

    // Modulation modes
    const Mode = {
        REPLACE: 'replace',     // Replace parameter value
        ADD: 'add',             // Add to base value
        MULTIPLY: 'multiply'    // Multiply base value
    };

    CYMATICA.mod = CYMATICA.mod || {};

    CYMATICA.mod.hub = {
        Mode,
        _baseValues: {},    // Cached base values for add/multiply modes

        /**
         * Create a new modulation route
         * @param {object} config - Route configuration
         * @returns {object} Route object
         */
        createRoute(config = {}) {
            return {
                id: config.id || this._generateId(),
                enabled: config.enabled ?? true,
                sourceType: config.sourceType || 'lfo',    // 'lfo', 'asr', 'external'
                sourceId: config.sourceId || '',
                target: config.target || '',               // State path like "rotation.y"
                min: config.min ?? 0,
                max: config.max ?? 1,
                curveA: config.curveA ?? 1,
                curveB: config.curveB ?? 1,
                curveMid: config.curveMid ?? 0.5,
                invert: config.invert ?? false,
                mode: config.mode || Mode.REPLACE,
                letterIndex: config.letterIndex ?? null    // For per-letter targeting
            };
        },

        /**
         * Update all modulation routes - call each frame
         * @param {number} deltaMs - Time since last frame (unused but consistent API)
         */
        update(deltaMs) {
            const state = CYMATICA.state._state;
            if (!state.mod?.enabled) return;

            const routes = state.mod?.routes || [];

            routes.forEach(route => {
                if (!route.enabled) return;

                // Get modulation value from source
                let value;
                switch (route.sourceType) {
                    case 'lfo':
                        value = CYMATICA.mod.lfo.getValue(route.sourceId);
                        break;
                    case 'asr':
                        value = CYMATICA.mod.asr.getValue(route.sourceId);
                        break;
                    case 'external':
                        value = CYMATICA.mod.broadcast?.getValue(route.sourceId) ?? 0;
                        break;
                    default:
                        return;
                }

                // Apply curve mapping
                const transformed = CYMATICA.mod.mapper.transform(value, {
                    min: route.min,
                    max: route.max,
                    curveA: route.curveA,
                    curveB: route.curveB,
                    curveMid: route.curveMid,
                    invert: route.invert
                });

                // Apply to target
                this._applyToTarget(route.target, transformed, route);
            });
        },

        /**
         * Apply modulation value to a state path
         * Supports: "rotation.x", "letters[2].scale", etc.
         * @private
         */
        _applyToTarget(targetPath, value, route) {
            const state = CYMATICA.state._state;

            // Parse path like "letters[2].scale" or "rotation.x"
            const parts = targetPath.split(/[\.\[\]]/).filter(Boolean);

            if (parts.length === 0) return;

            // Navigate to parent object
            let obj = state;
            for (let i = 0; i < parts.length - 1; i++) {
                const key = isNaN(parts[i]) ? parts[i] : parseInt(parts[i]);
                obj = obj[key];
                if (obj === undefined) return;
            }

            const finalKey = parts[parts.length - 1];
            const baseKey = route.id + ':' + targetPath;

            // Handle modulation mode
            switch (route.mode) {
                case Mode.ADD:
                    // Cache base value on first access
                    if (this._baseValues[baseKey] === undefined) {
                        this._baseValues[baseKey] = obj[finalKey];
                    }
                    obj[finalKey] = this._baseValues[baseKey] + value;
                    break;

                case Mode.MULTIPLY:
                    // Cache base value on first access
                    if (this._baseValues[baseKey] === undefined) {
                        this._baseValues[baseKey] = obj[finalKey];
                    }
                    obj[finalKey] = this._baseValues[baseKey] * value;
                    break;

                case Mode.REPLACE:
                default:
                    obj[finalKey] = value;
                    break;
            }
        },

        /**
         * Get base value for a route (for add/multiply modes)
         * @param {string} routeId - Route identifier
         * @param {string} targetPath - Target path
         * @returns {number|undefined}
         */
        getBaseValue(routeId, targetPath) {
            return this._baseValues[routeId + ':' + targetPath];
        },

        /**
         * Reset base value cache for a route
         * @param {string} routeId - Route identifier
         */
        resetBaseValues(routeId) {
            Object.keys(this._baseValues).forEach(key => {
                if (key.startsWith(routeId + ':')) {
                    delete this._baseValues[key];
                }
            });
        },

        /**
         * Clear all base value caches
         */
        clearBaseValues() {
            this._baseValues = {};
        },

        /**
         * Get list of routable target paths
         * @returns {string[]}
         */
        getRoutableTargets() {
            const state = CYMATICA.state._state;
            const targets = [
                // Rotation
                'rotation.x', 'rotation.y', 'rotation.z',
                'targetRotation.x', 'targetRotation.y', 'targetRotation.z',
                'rotSpeed.x', 'rotSpeed.y', 'rotSpeed.z',
                // Camera/view
                'zoom', 'targetZoom',
                'panX', 'panY', 'targetPanX', 'targetPanY',
                'fov', 'cameraZ',
                // Rendering
                'concentric', 'layerOffset', 'strokeWidth', 'glowIntensity',
                // Animation
                'animSpeed', 'drawSpeed', 'oscillateSpeed', 'beamPhase'
            ];

            // Add per-letter targets
            if (state.letters) {
                state.letters.forEach((_, i) => {
                    targets.push(
                        `letters[${i}].x`,
                        `letters[${i}].y`,
                        `letters[${i}].z`,
                        `letters[${i}].scale`
                    );
                });
            }

            return targets;
        },

        /**
         * Get current value of a target path
         * @param {string} targetPath - Target path
         * @returns {number|undefined}
         */
        getTargetValue(targetPath) {
            const state = CYMATICA.state._state;
            const parts = targetPath.split(/[\.\[\]]/).filter(Boolean);

            let obj = state;
            for (const part of parts) {
                const key = isNaN(part) ? part : parseInt(part);
                obj = obj[key];
                if (obj === undefined) return undefined;
            }

            return obj;
        },

        /**
         * Add a route to state
         * @param {object} route - Route configuration
         */
        addRoute(route) {
            const state = CYMATICA.state._state;
            state.mod = state.mod || { lfos: {}, asrs: {}, routes: [], enabled: true };
            state.mod.routes = state.mod.routes || [];

            const newRoute = this.createRoute(route);
            state.mod.routes.push(newRoute);

            CYMATICA.events.publish('mod:route:added', newRoute);
            return newRoute;
        },

        /**
         * Remove a route from state
         * @param {string} routeId - Route identifier
         */
        removeRoute(routeId) {
            const state = CYMATICA.state._state;
            if (!state.mod?.routes) return;

            const index = state.mod.routes.findIndex(r => r.id === routeId);
            if (index !== -1) {
                state.mod.routes.splice(index, 1);
                this.resetBaseValues(routeId);
                CYMATICA.events.publish('mod:route:removed', { id: routeId });
            }
        },

        /**
         * Initialize the hub
         */
        init() {
            this._baseValues = {};
            console.log('cymatica.mod.hub: initialized');
        },

        /**
         * Generate unique route ID
         * @private
         */
        _generateId() {
            return 'route_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
        }
    };

})(window.CYMATICA);
