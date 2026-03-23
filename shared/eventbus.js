/**
 * eventbus.js — Canonical event bus for decoupled module communication
 *
 * Usage (local, single-tab):
 *   import { EventBus } from '/shared/eventbus.js';
 *
 *   const bus = EventBus();
 *   const unsub = bus.on('update', (data) => console.log(data));
 *   bus.emit('update', { value: 42 });
 *   unsub();
 *
 * Usage (cross-tab via BroadcastChannel):
 *   const bus = EventBus({ broadcast: true, channel: 'my-app' });
 *   bus.on('sync', (data) => { ... });  // receives from other tabs too
 *   bus.emit('sync', payload);           // broadcasts to all tabs
 *
 * API:
 *   on(event, fn)    → unsubscribe function
 *   off(event, fn)   → remove specific listener
 *   emit(event, data) → fire event
 *   once(event, fn)  → listen for one event then auto-remove
 *   clear()          → remove all listeners
 *   destroy()        → clear + close BroadcastChannel
 */

/**
 * Create a new EventBus instance.
 * @param {Object} [opts]
 * @param {boolean} [opts.broadcast=false] — use BroadcastChannel for cross-tab events
 * @param {string} [opts.channel='demos-eventbus'] — BroadcastChannel name
 */
export function EventBus(opts) {
  const o = opts || {};
  const listeners = {};
  let bc = null;

  if (o.broadcast) {
    bc = new BroadcastChannel(o.channel || 'demos-eventbus');
    bc.onmessage = function(e) {
      const { event, data } = e.data;
      _fire(event, data);
    };
  }

  function _fire(event, data) {
    const list = listeners[event];
    if (list) {
      // Iterate over a copy in case listeners modify the array
      const copy = list.slice();
      for (let i = 0; i < copy.length; i++) copy[i](data);
    }
  }

  function on(event, fn) {
    (listeners[event] || (listeners[event] = [])).push(fn);
    return function() { off(event, fn); };
  }

  function off(event, fn) {
    const list = listeners[event];
    if (list) {
      const idx = list.indexOf(fn);
      if (idx > -1) list.splice(idx, 1);
    }
  }

  function emit(event, data) {
    _fire(event, data);
    if (bc) {
      bc.postMessage({ event, data });
    }
  }

  function once(event, fn) {
    const unsub = on(event, function handler(data) {
      unsub();
      fn(data);
    });
    return unsub;
  }

  function clear() {
    for (const key in listeners) delete listeners[key];
  }

  function destroy() {
    clear();
    if (bc) { bc.close(); bc = null; }
  }

  return { on, off, emit, once, clear, destroy };
}
