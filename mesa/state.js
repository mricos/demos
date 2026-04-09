/**
 * mesa/state.js — Path-based reactive state store + event bus
 *
 * Store: dot-notation get/set with wildcard listeners
 *   state.set('model.lr', 0.01)
 *   state.get('model.lr') → 0.01
 *   state.on('model.*', fn)  → unsubscribe fn
 *
 * Bus: lightweight pub/sub for decoupled events
 *   bus.on('training:done', fn) → unsubscribe fn
 *   bus.emit('training:done', { accuracy: 0.95 })
 */

// ── Event Bus ───────────────────────────────────────
export class Bus {
  constructor() { this._l = {}; }

  on(event, fn) {
    (this._l[event] ??= []).push(fn);
    return () => { this._l[event] = this._l[event].filter(f => f !== fn); };
  }

  once(event, fn) {
    const unsub = this.on(event, (...args) => { unsub(); fn(...args); });
    return unsub;
  }

  emit(event, data) {
    this._l[event]?.forEach(fn => fn(data));
  }

  clear(event) {
    if (event) delete this._l[event];
    else this._l = {};
  }
}

// ── State Store ─────────────────────────────────────
export class Store {
  constructor(initial = {}) {
    this._state = {};
    this._listeners = new Map();  // path pattern → Set<fn>
    this._batching = false;
    this._pendingPaths = new Set();
    this._notifying = false;      // re-entry guard: prevent cascade

    if (Object.keys(initial).length) this.merge(initial);
  }

  /** Get value at dot-notation path, or entire state if no path */
  get(path) {
    if (!path) return this._state;
    const keys = path.split('.');
    let v = this._state;
    for (const k of keys) {
      if (v == null) return undefined;
      v = v[k];
    }
    return v;
  }

  /** Set value at dot-notation path, fire listeners */
  set(path, value) {
    const keys = path.split('.');
    let obj = this._state;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (obj[k] == null || typeof obj[k] !== 'object') obj[k] = {};
      obj = obj[k];
    }
    const old = obj[keys[keys.length - 1]];
    if (old === value) return;
    obj[keys[keys.length - 1]] = value;

    if (this._batching) {
      this._pendingPaths.add(path);
    } else {
      this._notify(path, value, old);
    }
  }

  /** Merge an object tree into state, firing listeners for each leaf */
  merge(obj, prefix = '') {
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        this.merge(v, path);
      } else {
        this.set(path, v);
      }
    }
  }

  /** Set multiple values, fire listeners once per path at the end */
  batch(updates) {
    this._batching = true;
    for (const [path, value] of Object.entries(updates)) {
      this.set(path, value);
    }
    this._batching = false;
    for (const path of this._pendingPaths) {
      this._notify(path, this.get(path));
    }
    this._pendingPaths.clear();
  }

  /**
   * Listen for changes at a path pattern.
   * Supports exact ('model.lr'), wildcard ('model.*'), deep wildcard ('model.**')
   * Returns unsubscribe function.
   */
  on(pattern, fn) {
    if (!this._listeners.has(pattern)) this._listeners.set(pattern, new Set());
    this._listeners.get(pattern).add(fn);
    return () => {
      const set = this._listeners.get(pattern);
      if (set) { set.delete(fn); if (set.size === 0) this._listeners.delete(pattern); }
    };
  }

  /** Remove all listeners, optionally for a specific pattern */
  off(pattern) {
    if (pattern) this._listeners.delete(pattern);
    else this._listeners.clear();
  }

  /** Dump state as plain object (for serialization) */
  toJSON() { return JSON.parse(JSON.stringify(this._state)); }

  // ── internal ──────────────────────────────────────
  _notify(path, value, old) {
    if (this._notifying) {
      // Re-entrant: a listener called set() during notification.
      // Queue it — will be flushed after current notification pass.
      this._pendingPaths.add(path);
      return;
    }

    this._notifying = true;
    this._fire(path, value, old);

    // Flush any paths queued by re-entrant set() calls
    while (this._pendingPaths.size > 0) {
      const queued = [...this._pendingPaths];
      this._pendingPaths.clear();
      for (const p of queued) {
        this._fire(p, this.get(p));
      }
    }
    this._notifying = false;
  }

  _fire(path, value, old) {
    for (const [pattern, fns] of this._listeners) {
      if (this._matches(pattern, path)) {
        for (const fn of fns) fn(value, path, old);
      }
    }
  }

  _matches(pattern, path) {
    if (pattern === path) return true;
    if (pattern === '*') return true;

    const pp = pattern.split('.');
    const tp = path.split('.');

    for (let i = 0; i < pp.length; i++) {
      if (pp[i] === '**') return true;  // deep wildcard matches everything below
      if (pp[i] === '*') {
        // single wildcard: must be at the end
        if (i === pp.length - 1) return tp.length > i;
        // not at end: match exactly one segment
        if (i >= tp.length) return false;
        continue;
      }
      if (i >= tp.length || pp[i] !== tp[i]) return false;
    }
    return pp.length === tp.length;
  }
}

// ── Singleton instances ─────────────────────────────
export const bus = new Bus();
export const state = new Store();

// Expose for terrain bridge (terrain/js/modules/mesa.js)
if (typeof window !== 'undefined') {
  window.__mesaState = state;
  window.__mesaBus = bus;
}
