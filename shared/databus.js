/**
 * databus.js — Cross-demo data sharing via BroadcastChannel + localStorage
 *
 * Lets one demo publish a dataset and another consume it, even across tabs.
 *
 * Usage — Producer (e.g. synthetic-iris):
 *   import { DataBus } from '/shared/databus.js';
 *
 *   const iris = generateIris({ seed: 42 });
 *   DataBus.publish("iris", iris.data);
 *
 * Usage — Consumer (e.g. snn2, bayes):
 *   import { DataBus } from '/shared/databus.js';
 *
 *   // Get latest published dataset (from localStorage):
 *   const data = DataBus.get("iris");
 *
 *   // Or subscribe to live updates (via BroadcastChannel):
 *   DataBus.subscribe("iris", (data) => {
 *     reloadVisualization(data);
 *   });
 *
 * Channels:
 *   "iris"       — synthetic Iris dataset
 *   "timeseries" — time-series observations
 *   "custom"     — user-defined data
 *
 * Data is JSON-serialized to localStorage for persistence
 * and broadcast via BroadcastChannel for live cross-tab updates.
 */

const STORAGE_PREFIX = "databus:";
let _channel = null;
const _listeners = {};

function _getChannel() {
  if (!_channel) {
    _channel = new BroadcastChannel("demos-databus");
    _channel.onmessage = function(e) {
      const { name, data } = e.data;
      if (_listeners[name]) {
        _listeners[name].forEach(function(fn) { fn(data); });
      }
    };
  }
  return _channel;
}

export const DataBus = {
  /**
   * Publish a dataset. Stores in localStorage and broadcasts to other tabs.
   * @param {string} name — channel name (e.g. "iris")
   * @param {*} data — JSON-serializable data
   */
  publish(name, data) {
    try {
      localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(data));
    } catch (e) {
      console.warn("[databus] localStorage write failed:", e.message);
    }
    _getChannel().postMessage({ name, data });
    // Also notify local listeners
    if (_listeners[name]) {
      _listeners[name].forEach(function(fn) { fn(data); });
    }
  },

  /**
   * Get the latest published dataset from localStorage.
   * @param {string} name
   * @returns {*|null} parsed data or null
   */
  get(name) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + name);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Subscribe to live updates on a channel.
   * @param {string} name
   * @param {Function} fn — called with (data) on each publish
   * @returns {Function} unsubscribe
   */
  subscribe(name, fn) {
    _getChannel(); // ensure channel is open
    if (!_listeners[name]) _listeners[name] = [];
    _listeners[name].push(fn);
    return function() {
      const arr = _listeners[name];
      if (arr) {
        const idx = arr.indexOf(fn);
        if (idx > -1) arr.splice(idx, 1);
      }
    };
  },

  /**
   * List all published channel names.
   * @returns {string[]}
   */
  list() {
    const names = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(STORAGE_PREFIX)) {
        names.push(key.slice(STORAGE_PREFIX.length));
      }
    }
    return names;
  },

  /**
   * Clear a channel's stored data.
   * @param {string} name
   */
  clear(name) {
    localStorage.removeItem(STORAGE_PREFIX + name);
  }
};
