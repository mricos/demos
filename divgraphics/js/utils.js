/**
 * DivGraphics - Utils Module
 * Pure utility functions for math, colors, and timing
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.Utils = {
        degToRad: (deg) => deg * Math.PI / 180,
        radToDeg: (rad) => rad * 180 / Math.PI,

        parseColor(color) {
            const hex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
            if (hex) {
                return { r: parseInt(hex[1], 16), g: parseInt(hex[2], 16), b: parseInt(hex[3], 16) };
            }
            return { r: 255, g: 255, b: 255 };
        },

        lerpColor(c1, c2, t) {
            const a = this.parseColor(c1);
            const b = this.parseColor(c2);
            const r = Math.round(a.r + (b.r - a.r) * t);
            const g = Math.round(a.g + (b.g - a.g) * t);
            const bl = Math.round(a.b + (b.b - a.b) * t);
            return `rgb(${r},${g},${bl})`;
        },

        throttle(fn, limit) {
            let waiting = false;
            let lastArgs = null;
            return function(...args) {
                if (!waiting) {
                    fn.apply(this, args);
                    waiting = true;
                    setTimeout(() => {
                        waiting = false;
                        if (lastArgs) {
                            fn.apply(this, lastArgs);
                            lastArgs = null;
                        }
                    }, limit);
                } else {
                    lastArgs = args;
                }
            };
        },

        debounce(fn, delay) {
            let timer = null;
            return function(...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, args), delay);
            };
        }
    };

})(window.APP);
