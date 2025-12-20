/**
 * CYMATICA Utils Module
 * Shared utility functions
 */
(function(CYMATICA) {
    'use strict';

    const CymaticaUtils = {
        /**
         * Cached URLSearchParams instance
         */
        _urlParams: null,

        /**
         * Get URLSearchParams (cached)
         */
        getUrlParams: function() {
            if (!this._urlParams) {
                this._urlParams = new URLSearchParams(window.location.search);
            }
            return this._urlParams;
        },

        /**
         * Get a URL parameter value
         */
        getUrlParam: function(name, defaultValue = null) {
            const value = this.getUrlParams().get(name);
            return value !== null ? value : defaultValue;
        },

        /**
         * Check if URL has a parameter
         */
        hasUrlParam: function(name) {
            return this.getUrlParams().has(name);
        },

        /**
         * Get URL parameter as boolean
         */
        getUrlParamBool: function(name, defaultValue = false) {
            const value = this.getUrlParams().get(name);
            if (value === null) return defaultValue;
            return value === 'true' || value === '1' || value === '';
        },

        /**
         * Debounce a function
         */
        debounce: function(fn, delay) {
            let timer = null;
            return function(...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, args), delay);
            };
        },

        /**
         * Throttle a function
         */
        throttle: function(fn, limit) {
            let inThrottle = false;
            return function(...args) {
                if (!inThrottle) {
                    fn.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Generate a unique ID
         */
        uniqueId: function(prefix) {
            return (prefix || 'id') + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        },

        /**
         * Deep clone an object
         */
        deepClone: function(obj) {
            return JSON.parse(JSON.stringify(obj));
        },

        /**
         * Get value from nested object by dot-notation path
         */
        getByPath: function(obj, path, defaultValue) {
            const keys = path.split('.');
            let result = obj;
            for (const key of keys) {
                if (result == null || typeof result !== 'object') {
                    return defaultValue;
                }
                result = result[key];
            }
            return result !== undefined ? result : defaultValue;
        },

        /**
         * Set value in nested object by dot-notation path
         */
        setByPath: function(obj, path, value) {
            const keys = path.split('.');
            let current = obj;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!(key in current) || typeof current[key] !== 'object') {
                    current[key] = {};
                }
                current = current[key];
            }
            current[keys[keys.length - 1]] = value;
        },

        // =====================================================================
        // Color Utilities (for rendering)
        // =====================================================================

        /**
         * Parse hex color to RGB
         */
        hexToRgb: function(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },

        /**
         * Convert RGB to hex
         */
        rgbToHex: function(r, g, b) {
            return '#' + [r, g, b].map(x => {
                const hex = Math.round(x).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        },

        /**
         * Interpolate between two hex colors
         */
        lerpColor: function(color1, color2, t) {
            const rgb1 = this.hexToRgb(color1);
            const rgb2 = this.hexToRgb(color2);
            if (!rgb1 || !rgb2) return color1;

            return this.rgbToHex(
                rgb1.r + (rgb2.r - rgb1.r) * t,
                rgb1.g + (rgb2.g - rgb1.g) * t,
                rgb1.b + (rgb2.b - rgb1.b) * t
            );
        },

        /**
         * HSL to RGB conversion
         */
        hslToRgb: function(h, s, l) {
            let r, g, b;
            if (s === 0) {
                r = g = b = l;
            } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }
            return { r: r * 255, g: g * 255, b: b * 255 };
        }
    };

    CYMATICA.Utils = CymaticaUtils;

})(window.CYMATICA);
