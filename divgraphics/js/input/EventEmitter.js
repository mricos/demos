/**
 * DivGraphics - Event Emitter Mixin
 * Shared event handling for hardware adapters (MIDI, Gamepad, etc.)
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.EventEmitter = {
        /**
         * Initialize event handlers
         * @param {string[]} eventTypes - Array of event type names
         */
        _initEvents(eventTypes) {
            this.handlers = {};
            eventTypes.forEach(t => this.handlers[t] = []);
        },

        /**
         * Subscribe to an event
         * @param {string} event - Event name
         * @param {Function} handler - Callback function
         * @returns {this} For chaining
         */
        on(event, handler) {
            if (!this.handlers[event]) this.handlers[event] = [];
            this.handlers[event].push(handler);
            return this;
        },

        /**
         * Unsubscribe from an event
         * @param {string} event - Event name
         * @param {Function} handler - Callback to remove
         * @returns {this} For chaining
         */
        off(event, handler) {
            if (!this.handlers[event]) return this;
            const idx = this.handlers[event].indexOf(handler);
            if (idx > -1) this.handlers[event].splice(idx, 1);
            return this;
        },

        /**
         * Emit an event to all subscribers
         * @param {string} event - Event name
         * @param {*} data - Event data
         */
        _emit(event, data) {
            if (this.handlers[event]) {
                this.handlers[event].forEach(h => h(data));
            }
        }
    };

})(window.APP);
