// CYMATICA.events - PubSub Event System
(function(CYMATICA) {
    'use strict';

    const subscribers = {};

    CYMATICA.events = {
        subscribe(event, callback, context) {
            if (!subscribers[event]) subscribers[event] = [];
            subscribers[event].push({ callback, context });
            return () => this.unsubscribe(event, callback);
        },

        unsubscribe(event, callback) {
            if (!subscribers[event]) return;
            subscribers[event] = subscribers[event].filter(s => s.callback !== callback);
        },

        publish(event, data) {
            if (!subscribers[event]) return;
            subscribers[event].forEach(s => {
                s.callback.call(s.context, data);
            });
        },

        clear(event) {
            if (event) {
                delete subscribers[event];
            } else {
                Object.keys(subscribers).forEach(k => delete subscribers[k]);
            }
        }
    };
})(window.CYMATICA);
