// TUBES.events - PubSub Event System
(function(TUBES) {
    'use strict';

    const subscribers = {};

    TUBES.events = {
        init() {
            console.log('TUBES.events: initialized');
        },

        subscribe(event, callback, context = null) {
            if (!subscribers[event]) {
                subscribers[event] = [];
            }

            const subscription = {
                callback: callback,
                context: context,
                id: Math.random().toString(36).substr(2, 9)
            };

            subscribers[event].push(subscription);
            return subscription.id;
        },

        unsubscribe(event, subscriptionId) {
            if (!subscribers[event]) return;
            subscribers[event] = subscribers[event].filter(sub => sub.id !== subscriptionId);
        },

        publish(event, data = null) {
            if (!subscribers[event]) return;

            subscribers[event].forEach(subscription => {
                if (subscription.context) {
                    subscription.callback.call(subscription.context, data);
                } else {
                    subscription.callback(data);
                }
            });

            // Debug logging
            if (TUBES.config && TUBES.config.debug) {
                console.log(`TUBES.events: ${event}`, data);
            }
        },

        clear(event) {
            if (event) {
                delete subscribers[event];
            } else {
                Object.keys(subscribers).forEach(k => delete subscribers[k]);
            }
        }
    };
})(window.TUBES);
