/**
 * CYMATICA Events Module
 * Pub/sub event bus with DOM binding support
 */
(function(CYMATICA) {
    'use strict';

    const listeners = {};

    const CymaticaEvents = {
        /**
         * Subscribe to an event (terrain-compatible)
         */
        on: function(event, callback) {
            if (!listeners[event]) {
                listeners[event] = [];
            }
            listeners[event].push(callback);

            // Return unsubscribe function
            return function() {
                const index = listeners[event].indexOf(callback);
                if (index > -1) {
                    listeners[event].splice(index, 1);
                }
            };
        },

        /**
         * Subscribe to an event (one-time)
         */
        once: function(event, callback) {
            const unsubscribe = this.on(event, function(...args) {
                unsubscribe();
                callback.apply(this, args);
            });
        },

        /**
         * Emit an event (terrain-compatible)
         */
        emit: function(event, data) {
            if (listeners[event]) {
                listeners[event].forEach(callback => {
                    try {
                        callback(data);
                    } catch (e) {
                        console.error(`[CYMATICA.Events] Error in ${event} handler:`, e);
                    }
                });
            }
        },

        /**
         * Remove all listeners for an event
         */
        off: function(event) {
            if (event) {
                delete listeners[event];
            } else {
                Object.keys(listeners).forEach(key => delete listeners[key]);
            }
        },

        // Legacy API aliases (keep backwards compatibility)
        subscribe: function(event, callback) {
            return this.on(event, callback);
        },

        publish: function(event, data) {
            this.emit(event, data);
        },

        // ================================
        // DOM Binding (data-cymatica-* attributes)
        // ================================

        _bindings: new WeakMap(),
        _observer: null,

        /**
         * Initialize DOM bindings
         */
        bindDOM: function() {
            this.scanBindings();
            this.setupMutationObserver();
            console.log('[CYMATICA.Events] DOM bindings initialized');
        },

        /**
         * Scan document for data-cymatica-bind attributes
         */
        scanBindings: function() {
            document.querySelectorAll('[data-cymatica-bind]').forEach(el => {
                this.bindElement(el);
            });

            document.querySelectorAll('[data-action]').forEach(el => {
                this.bindAction(el);
            });
        },

        /**
         * Bind an element to a state path
         */
        bindElement: function(el) {
            if (this._bindings.has(el)) return;

            const path = el.dataset.cymaticaBind;
            const format = el.dataset.cymaticaFormat || 'text';

            if (!path) return;

            const state = CYMATICA.state;
            if (!state) {
                console.warn('[CYMATICA.Events] State not available for binding');
                return;
            }

            // Set initial value
            this.updateElement(el, state.get(path), format);

            // Subscribe to state changes
            const unsubscribe = this.on(CymaticaEvents.STATE_CHANGE, (data) => {
                if (!data || !data.path || data.path === path || data.path === '*' || path.startsWith(data.path + '.')) {
                    this.updateElement(el, state.get(path), format);
                }
            });

            this._bindings.set(el, { path, format, unsubscribe });
        },

        /**
         * Update element based on format type
         */
        updateElement: function(el, value, format) {
            switch (format) {
                case 'text':
                    el.textContent = value ?? '';
                    break;
                case 'html':
                    el.innerHTML = value ?? '';
                    break;
                case 'value':
                    el.value = value ?? '';
                    break;
                case 'visible':
                    el.classList.toggle('hidden', !value);
                    break;
                case 'hidden':
                    el.classList.toggle('hidden', !!value);
                    break;
                case 'toggle':
                    el.classList.toggle('active', !!value);
                    break;
                default:
                    el.textContent = value ?? '';
            }
        },

        /**
         * Bind an action element
         */
        bindAction: function(el) {
            if (el._actionBound) return;

            const actionSpec = el.dataset.action;
            if (!actionSpec) return;

            const [eventName, ...payloadParts] = actionSpec.split(':');
            const payloadStr = payloadParts.join(':');

            el.addEventListener('click', (e) => {
                e.preventDefault();
                let payload = {};

                if (payloadStr) {
                    try {
                        payload = JSON.parse(payloadStr);
                    } catch {
                        payload = { value: payloadStr };
                    }
                }

                this.emit(eventName, payload);
            });

            el._actionBound = true;
        },

        /**
         * Setup mutation observer for dynamically added elements
         */
        setupMutationObserver: function() {
            if (this._observer) return;

            this._observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.scanNodeBindings(node);
                        }
                    });
                });
            });

            this._observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },

        /**
         * Scan a node and its children for bindings
         */
        scanNodeBindings: function(node) {
            if (node.dataset) {
                if (node.dataset.cymaticaBind) {
                    this.bindElement(node);
                }
                if (node.dataset.action) {
                    this.bindAction(node);
                }
            }

            if (node.querySelectorAll) {
                node.querySelectorAll('[data-cymatica-bind]').forEach(el => {
                    this.bindElement(el);
                });
                node.querySelectorAll('[data-action]').forEach(el => {
                    this.bindAction(el);
                });
            }
        }
    };

    // Standard event names
    // Lifecycle
    CymaticaEvents.READY = 'cymatica:ready';
    CymaticaEvents.DESTROY = 'cymatica:destroy';

    // State
    CymaticaEvents.STATE_CHANGE = 'state:change';
    CymaticaEvents.STATE_LOADED = 'state:loaded';
    CymaticaEvents.STATE_SAVED = 'state:saved';
    CymaticaEvents.STATE_RESET = 'state:reset';

    // Mode & Theme
    CymaticaEvents.MODE_APPLIED = 'mode:applied';
    CymaticaEvents.THEME_CHANGED = 'theme:changed';

    // Animation
    CymaticaEvents.ANIMATION_START = 'animation:start';
    CymaticaEvents.ANIMATION_STOP = 'animation:stop';

    // UI
    CymaticaEvents.UI_TOGGLE = 'ui:toggle';
    CymaticaEvents.CONFIG_TOGGLE = 'config:toggle';
    CymaticaEvents.PANEL_OPEN = 'panel:open';
    CymaticaEvents.PANEL_CLOSE = 'panel:close';

    // Rendering
    CymaticaEvents.RENDER_FRAME = 'render:frame';
    CymaticaEvents.PRESET_APPLIED = 'preset:applied';
    CymaticaEvents.LAYOUT_CHANGED = 'layout:changed';

    CYMATICA.events = CymaticaEvents;
    CYMATICA.Events = CymaticaEvents; // Alias for terrain compatibility

})(window.CYMATICA);
