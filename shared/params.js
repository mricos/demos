/**
 * params.js — Sync UI state to URL search params
 *
 * Usage:
 *   import { Params } from '/shared/params.js';
 *
 *   const state = Params.init({
 *     sigma: 1.0,
 *     mu: 0,
 *     dist: "gaussian",
 *     showGrid: true
 *   });
 *
 *   // state.sigma is now from URL if present, else default
 *   // Changing state auto-updates the URL:
 *   Params.set("sigma", 2.5);
 *   // URL becomes ?sigma=2.5&mu=0&dist=gaussian&showGrid=true
 *
 *   // Read current value:
 *   Params.get("sigma")  // 2.5
 *
 *   // Subscribe to changes (from back/forward navigation):
 *   Params.onChange(() => { redraw(); });
 *
 *   // Batch updates without triggering onChange per-set:
 *   Params.batch({ sigma: 3.0, mu: 1.0 });
 *
 *   // Get shareable URL:
 *   Params.toURL()  // full URL string
 */

const _state = {};
const _types = {};
const _listeners = [];
let _initialized = false;

function _parseValue(raw, type) {
  if (type === "number") return Number(raw);
  if (type === "boolean") return raw === "true";
  return raw;
}

function _inferType(val) {
  if (typeof val === "number") return "number";
  if (typeof val === "boolean") return "boolean";
  return "string";
}

function _pushURL() {
  const params = new URLSearchParams();
  for (const key in _state) {
    params.set(key, String(_state[key]));
  }
  const url = location.pathname + "?" + params.toString();
  history.replaceState(null, "", url);
}

function _notify() {
  for (const fn of _listeners) fn(_state);
}

export const Params = {
  /**
   * Initialize state from defaults, overridden by URL params.
   * @param {Object} defaults — key/value pairs with types inferred from values
   * @returns {Object} current state (read-only snapshot)
   */
  init(defaults) {
    const urlParams = new URLSearchParams(location.search);

    for (const key in defaults) {
      const type = _inferType(defaults[key]);
      _types[key] = type;

      if (urlParams.has(key)) {
        _state[key] = _parseValue(urlParams.get(key), type);
      } else {
        _state[key] = defaults[key];
      }
    }

    // Listen for back/forward
    window.addEventListener("popstate", function() {
      const p = new URLSearchParams(location.search);
      for (const key in _state) {
        if (p.has(key)) {
          _state[key] = _parseValue(p.get(key), _types[key]);
        }
      }
      _notify();
    });

    _initialized = true;
    _pushURL();
    return Object.assign({}, _state);
  },

  /**
   * Get a single param value.
   */
  get(key) {
    return _state[key];
  },

  /**
   * Get all params as a plain object.
   */
  getAll() {
    return Object.assign({}, _state);
  },

  /**
   * Set a single param and update URL.
   */
  set(key, value) {
    _state[key] = value;
    _pushURL();
    _notify();
  },

  /**
   * Set multiple params at once (one URL update, one notification).
   */
  batch(obj) {
    for (const key in obj) {
      _state[key] = obj[key];
    }
    _pushURL();
    _notify();
  },

  /**
   * Subscribe to param changes (popstate or programmatic).
   * @param {Function} fn — called with current state object
   * @returns {Function} unsubscribe function
   */
  onChange(fn) {
    _listeners.push(fn);
    return function() {
      const idx = _listeners.indexOf(fn);
      if (idx > -1) _listeners.splice(idx, 1);
    };
  },

  /**
   * Get the full shareable URL.
   */
  toURL() {
    const params = new URLSearchParams();
    for (const key in _state) {
      params.set(key, String(_state[key]));
    }
    return location.origin + location.pathname + "?" + params.toString();
  }
};
