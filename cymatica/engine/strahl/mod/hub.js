/**
 * Strahl.Mod.Hub — Modulation router
 * Routes LFO/ASR/external sources to arbitrary state paths.
 * Supports replace, add, and multiply modes.
 */
(function(Strahl) {
    'use strict';

    const Mode = {
        REPLACE:  'replace',
        ADD:      'add',
        MULTIPLY: 'multiply'
    };

    /**
     * Create a hub bound to an engine instance
     * @param {object} engine - Strahl engine (needs .mod.lfo, .mod.asr, .state)
     */
    function create(engine) {
        const routes = [];
        const baseValues = {};
        let enabled = true;
        let _nextId = 1;

        function resolveSource(route) {
            switch (route.sourceType) {
                case 'lfo': return engine.mod.lfo.getValue(route.sourceId);
                case 'asr': return engine.mod.asr.getValue(route.sourceId);
                case 'external': return route._externalValue ?? 0;
                default: return 0;
            }
        }

        function applyToState(path, value, route) {
            const raw = engine.state.raw;
            const parts = path.split(/[\.\[\]]/).filter(Boolean);
            if (!parts.length) return;

            let obj = raw;
            for (let i = 0; i < parts.length - 1; i++) {
                const key = isNaN(parts[i]) ? parts[i] : parseInt(parts[i]);
                obj = obj[key];
                if (obj === undefined) return;
            }

            const finalKey = parts[parts.length - 1];
            const baseKey = route.id + ':' + path;

            switch (route.mode) {
                case Mode.ADD:
                    if (baseValues[baseKey] === undefined) baseValues[baseKey] = obj[finalKey];
                    obj[finalKey] = baseValues[baseKey] + value;
                    break;
                case Mode.MULTIPLY:
                    if (baseValues[baseKey] === undefined) baseValues[baseKey] = obj[finalKey];
                    obj[finalKey] = baseValues[baseKey] * value;
                    break;
                default:
                    obj[finalKey] = value;
            }
        }

        return {
            Mode,

            /**
             * Add a modulation route
             */
            route(config = {}) {
                const r = {
                    id: config.id || 'route_' + (_nextId++),
                    enabled: config.enabled ?? true,
                    sourceType: config.sourceType || 'lfo',
                    sourceId: config.sourceId || '',
                    target: config.target || '',
                    min: config.min ?? 0,
                    max: config.max ?? 1,
                    curveA: config.curveA ?? 1,
                    curveB: config.curveB ?? 1,
                    curveMid: config.curveMid ?? 0.5,
                    invert: config.invert ?? false,
                    mode: config.mode || Mode.REPLACE,
                    _externalValue: 0
                };
                routes.push(r);
                return r;
            },

            /**
             * Update all routes — call each frame
             */
            update(deltaMs) {
                if (!enabled) return;

                for (const r of routes) {
                    if (!r.enabled) continue;

                    const raw = resolveSource(r);
                    const mapped = Strahl.Mod.Mapper.transform(raw, {
                        min: r.min,
                        max: r.max,
                        curveA: r.curveA,
                        curveB: r.curveB,
                        curveMid: r.curveMid,
                        invert: r.invert
                    });

                    applyToState(r.target, mapped, r);
                }
            },

            /**
             * Set an external source value (for WebSocket, MIDI, etc.)
             */
            setExternal(routeId, value) {
                const r = routes.find(r => r.id === routeId);
                if (r) r._externalValue = value;
            },

            /**
             * Remove a route
             */
            remove(id) {
                const idx = routes.findIndex(r => r.id === id);
                if (idx !== -1) {
                    // Clear cached base values
                    for (const key in baseValues) {
                        if (key.startsWith(id + ':')) delete baseValues[key];
                    }
                    routes.splice(idx, 1);
                }
            },

            /**
             * Get all routes
             */
            getRoutes() { return routes; },

            /**
             * Get route by id
             */
            get(id) { return routes.find(r => r.id === id) || null; },

            /**
             * Enable/disable the hub
             */
            set enabled(v) { enabled = v; },
            get enabled()  { return enabled; },

            /**
             * Clear all routes and cached values
             */
            clear() {
                routes.length = 0;
                for (const k in baseValues) delete baseValues[k];
            }
        };
    }

    Strahl.Mod = Strahl.Mod || {};
    Strahl.Mod.Hub = { create, Mode };

})(window.Strahl);
