/**
 * CUI Core
 * Foundational namespace, utilities, state management, and event system
 */

(function() {
  'use strict';

  // Initialize the CUI namespace
  window.CUI = window.CUI || {};

  // Version tracking
  CUI.VERSION = '0.1.0';
  CUI.BUILD_DATE = '2025-10-27';

  console.log(`[CUI] Core v${CUI.VERSION} initializing...`);

  // ==========================================================================
  // State Management (Simple Reactive)
  // ==========================================================================

  CUI.State = (function() {
    const listeners = new Map(); // key -> Set of callbacks
    const state = {};

    return {
      get(key) {
        return state[key];
      },

      set(key, value) {
        const oldValue = state[key];
        state[key] = value;

        // Notify listeners
        if (listeners.has(key)) {
          listeners.get(key).forEach(callback => {
            callback(value, oldValue);
          });
        }
      },

      subscribe(key, callback) {
        if (!listeners.has(key)) {
          listeners.set(key, new Set());
        }
        listeners.get(key).add(callback);

        // Return unsubscribe function
        return () => {
          listeners.get(key).delete(callback);
        };
      },

      getAll() {
        return { ...state };
      },

      clear() {
        Object.keys(state).forEach(key => delete state[key]);
        listeners.clear();
      }
    };
  })();

  // ==========================================================================
  // Event Bus (Pub/Sub)
  // ==========================================================================

  CUI.Events = (function() {
    const events = new Map(); // event name -> Set of callbacks

    return {
      on(eventName, callback) {
        if (!events.has(eventName)) {
          events.set(eventName, new Set());
        }
        events.get(eventName).add(callback);

        // Return unsubscribe function
        return () => {
          events.get(eventName).delete(callback);
        };
      },

      off(eventName, callback) {
        if (events.has(eventName)) {
          events.get(eventName).delete(callback);
        }
      },

      emit(eventName, data) {
        if (events.has(eventName)) {
          events.get(eventName).forEach(callback => {
            try {
              callback(data);
            } catch (err) {
              console.error(`[CUI Events] Error in handler for "${eventName}":`, err);
            }
          });
        }
      },

      once(eventName, callback) {
        const wrapped = (data) => {
          callback(data);
          CUI.Events.off(eventName, wrapped);
        };
        CUI.Events.on(eventName, wrapped);
      },

      clear(eventName) {
        if (eventName) {
          events.delete(eventName);
        } else {
          events.clear();
        }
      }
    };
  })();

  // ==========================================================================
  // DOM Utilities
  // ==========================================================================

  CUI.DOM = {
    /**
     * Shorthand for document.getElementById
     */
    $(id) {
      return document.getElementById(id);
    },

    /**
     * Shorthand for document.querySelectorAll
     */
    $$(selector, parent = document) {
      return Array.from(parent.querySelectorAll(selector));
    },

    /**
     * Create element with attributes and children
     */
    create(tag, attrs = {}, ...children) {
      const el = document.createElement(tag);

      // Set attributes
      Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'class' || key === 'className') {
          el.className = value;
        } else if (key === 'style' && typeof value === 'object') {
          Object.assign(el.style, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
          const eventName = key.substring(2).toLowerCase();
          el.addEventListener(eventName, value);
        } else {
          el.setAttribute(key, value);
        }
      });

      // Append children
      children.flat().forEach(child => {
        if (child != null) {
          el.appendChild(
            typeof child === 'string' ? document.createTextNode(child) : child
          );
        }
      });

      return el;
    },

    /**
     * Remove all children from element
     */
    empty(element) {
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
    },

    /**
     * Toggle class on element
     */
    toggleClass(element, className, force) {
      element.classList.toggle(className, force);
    },

    /**
     * Add multiple event listeners
     */
    onAll(elements, eventName, handler) {
      elements.forEach(el => el.addEventListener(eventName, handler));
    }
  };

  // ==========================================================================
  // Utilities
  // ==========================================================================

  CUI.Utils = {
    /**
     * Clamp value between min and max
     */
    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },

    /**
     * Linear interpolation
     */
    lerp(a, b, t) {
      return a + (b - a) * t;
    },

    /**
     * Map value from one range to another
     */
    map(value, inMin, inMax, outMin, outMax) {
      return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    /**
     * Throttle function
     */
    throttle(func, limit) {
      let inThrottle;
      return function(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    /**
     * Deep clone object
     */
    clone(obj) {
      return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Merge objects deeply
     */
    merge(target, ...sources) {
      if (!sources.length) return target;
      const source = sources.shift();

      if (CUI.Utils.isObject(target) && CUI.Utils.isObject(source)) {
        for (const key in source) {
          if (CUI.Utils.isObject(source[key])) {
            if (!target[key]) Object.assign(target, { [key]: {} });
            CUI.Utils.merge(target[key], source[key]);
          } else {
            Object.assign(target, { [key]: source[key] });
          }
        }
      }

      return CUI.Utils.merge(target, ...sources);
    },

    /**
     * Check if value is plain object
     */
    isObject(item) {
      return item && typeof item === 'object' && !Array.isArray(item);
    },

    /**
     * Format number with specific decimals
     */
    format(value, decimals = 2) {
      return Number(value).toFixed(decimals);
    },

    /**
     * Generate unique ID
     */
    uid() {
      return `cui-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Simple random number generator (for seeded RNG, use physics module)
     */
    random(min = 0, max = 1) {
      return min + Math.random() * (max - min);
    }
  };

  // ==========================================================================
  // Module Registry (populated by cui-lifecycle.js)
  // ==========================================================================

  CUI.modules = {};

  // ==========================================================================
  // Logging
  // ==========================================================================

  CUI.log = function(...args) {
    console.log('[CUI]', ...args);
  };

  CUI.warn = function(...args) {
    console.warn('[CUI]', ...args);
  };

  CUI.error = function(...args) {
    console.error('[CUI]', ...args);
  };

  // ==========================================================================
  // Initialization
  // ==========================================================================

  CUI.init = function(config = {}) {
    CUI.log('Initializing with config:', config);
    CUI.Events.emit('cui:init', config);
  };

  // Signal core is ready
  CUI.Events.emit('cui:core:ready');
  CUI.log('Core ready');

  // Make $ and $$ globally available (optional)
  if (!window.$) window.$ = CUI.DOM.$;
  if (!window.$$) window.$$ = CUI.DOM.$$;

})();
