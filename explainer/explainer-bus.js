// explainer-bus.js — Unified message backbone
// Combines: dunk NS.Bus + cymatica BroadcastChannel + postMessage iframe bridge
//
// Message format: { topic, path, value, source, ts }
//   topic  — event name (e.g. "param:changed", "state:sync")
//   path   — dot-separated state path (e.g. "filter.cutoff")
//   value  — payload
//   source — namespace of sender (e.g. "dunk", "pong64", "shell")
//   ts     — Date.now()

const ExplainerBus = (() => {
  const _listeners = {};
  const _iframes = new Map();   // id → { iframe, namespace }
  const _values = {};            // path → { value, source, ts }
  let _bc = null;
  let _namespace = 'shell';
  let _statusEl = null;
  let _msgCount = 0;

  // --- Local pub/sub (from dunk NS.Bus) ---

  function on(topic, fn) {
    ((_listeners[topic]) ??= []).push(fn);
    return () => off(topic, fn);
  }

  function off(topic, fn) {
    const list = _listeners[topic];
    if (list) _listeners[topic] = list.filter(f => f !== fn);
  }

  function once(topic, fn) {
    const wrapper = (msg) => { off(topic, wrapper); fn(msg); };
    on(topic, wrapper);
  }

  function emit(topic, data = {}, { local = true, broadcast = true, iframes = true } = {}) {
    const msg = {
      topic,
      path: data.path || null,
      value: data.value ?? null,
      source: data.source || _namespace,
      ts: Date.now(),
      ...data
    };

    // Cache latest value by path
    if (msg.path) {
      _values[msg.path] = { value: msg.value, source: msg.source, ts: msg.ts };
    }

    _msgCount++;
    _updateStatus(topic, msg.source);

    // Local listeners
    if (local) {
      const list = _listeners[topic];
      if (list) for (const fn of list) {
        try { fn(msg); } catch (e) { console.error(`[Bus] ${topic}:`, e); }
      }
    }

    // Cross-tab via BroadcastChannel
    if (broadcast && _bc) {
      try { _bc.postMessage(msg); } catch (e) { /* channel closed */ }
    }

    // Down to child iframes via postMessage
    if (iframes) {
      for (const [id, entry] of _iframes) {
        try {
          entry.iframe.contentWindow.postMessage(
            { _explainer: true, ...msg }, '*'
          );
        } catch (e) { /* cross-origin or dead iframe */ }
      }
    }
  }

  // --- Value cache (from cymatica broadcast._values) ---

  function get(path) {
    return _values[path]?.value ?? undefined;
  }

  function set(path, value, source) {
    emit('param:changed', { path, value, source: source || _namespace });
    emit(`param:${path}`, { path, value, source: source || _namespace });
  }

  function snapshot() {
    const out = {};
    for (const [k, v] of Object.entries(_values)) out[k] = v.value;
    return out;
  }

  // --- Cross-tab (from cymatica BroadcastChannel) ---

  function initBroadcast(channelName = 'explainer') {
    if (_bc) _bc.close();
    _bc = new BroadcastChannel(channelName);
    _bc.onmessage = (e) => {
      const msg = e.data;
      if (!msg || !msg.topic || msg.source === _namespace) return;
      // Deliver locally + to iframes, but don't re-broadcast
      emit(msg.topic, msg, { local: true, broadcast: false, iframes: true });
    };
  }

  // --- Cross-iframe (postMessage bridge) ---

  function registerIframe(id, iframeEl, namespace) {
    _iframes.set(id, { iframe: iframeEl, namespace: namespace || id });
  }

  function unregisterIframe(id) {
    _iframes.delete(id);
  }

  function _handlePostMessage(e) {
    const msg = e.data;
    if (!msg || !msg._explainer || !msg.topic) return;
    // Bubble up: deliver locally + broadcast + other iframes
    // But don't send back to the source iframe
    const sourceNs = msg.source;
    if (msg.path) {
      _values[msg.path] = { value: msg.value, source: sourceNs, ts: msg.ts };
    }

    _msgCount++;
    _updateStatus(msg.topic, sourceNs);

    // Local listeners
    const list = _listeners[msg.topic];
    if (list) for (const fn of list) {
      try { fn(msg); } catch (err) { console.error(`[Bus] ${msg.topic}:`, err); }
    }

    // Cross-tab
    if (_bc) {
      try { _bc.postMessage(msg); } catch (err) { /* */ }
    }

    // Other iframes (not the source)
    for (const [id, entry] of _iframes) {
      if (entry.namespace === sourceNs) continue;
      try {
        entry.iframe.contentWindow.postMessage(
          { _explainer: true, ...msg }, '*'
        );
      } catch (err) { /* */ }
    }
  }

  // --- Status bar integration ---

  function bindStatus(el) {
    _statusEl = el;
  }

  function _updateStatus(topic, source) {
    if (!_statusEl) return;
    _statusEl.textContent =
      `${_msgCount} msgs | last: ${source}→${topic} | ${_iframes.size} iframes`;
  }

  // --- Init ---

  function init(namespace = 'shell', channelName = 'explainer') {
    _namespace = namespace;
    initBroadcast(channelName);
    window.addEventListener('message', _handlePostMessage);
    return Bus;
  }

  function destroy() {
    if (_bc) { _bc.close(); _bc = null; }
    window.removeEventListener('message', _handlePostMessage);
    _iframes.clear();
  }

  const Bus = {
    on, off, once, emit,
    get, set, snapshot,
    init, destroy,
    initBroadcast,
    registerIframe, unregisterIframe,
    bindStatus,
    get namespace() { return _namespace; },
    get iframeCount() { return _iframes.size; },
    get messageCount() { return _msgCount; }
  };

  return Bus;
})();

// Support both script tag and ES module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExplainerBus;
}
