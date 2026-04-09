/**
 * Strahl.Events — Pub/sub event bus
 * No DOM dependency. Pure message passing.
 */
(function(Strahl) {
    'use strict';

    function create() {
        const listeners = {};

        return {
            on(event, callback) {
                if (!listeners[event]) listeners[event] = [];
                listeners[event].push(callback);
                return () => {
                    const i = listeners[event].indexOf(callback);
                    if (i > -1) listeners[event].splice(i, 1);
                };
            },

            once(event, callback) {
                const unsub = this.on(event, (...args) => {
                    unsub();
                    callback(...args);
                });
                return unsub;
            },

            emit(event, data) {
                if (!listeners[event]) return;
                listeners[event].forEach(fn => {
                    try { fn(data); }
                    catch (e) { console.error(`[Strahl.Events] ${event}:`, e); }
                });
            },

            off(event) {
                if (event) delete listeners[event];
                else for (const k in listeners) delete listeners[k];
            }
        };
    }

    // Standard event names
    const Names = {
        READY: 'strahl:ready',
        STATE_CHANGE: 'state:change',
        FRAME: 'frame',
        START: 'loop:start',
        STOP: 'loop:stop'
    };

    Strahl.Events = { create, Names };

})(window.Strahl);
