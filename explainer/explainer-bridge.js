// explainer-bridge.js — Drop into any existing demo to join the backbone
//
// Usage (in an iframe'd demo):
//   <script src="../explainer-bridge.js"></script>
//   <script>
//     const bridge = ExplainerBridge.init('my-demo');
//     bridge.expose('filter.cutoff', () => myState.filter.cutoff);
//     bridge.onSet('filter.cutoff', (v) => { myState.filter.cutoff = v; });
//   </script>

const ExplainerBridge = (() => {
  let _namespace = 'demo';
  const _exposed = {};   // path → getter fn
  const _handlers = {};  // path → setter fn

  function init(namespace) {
    _namespace = namespace || 'demo';
    window.addEventListener('message', _onMessage);

    // Announce presence to parent
    _post('bridge:ready', { namespace: _namespace });

    return Bridge;
  }

  // Expose a readable param to the shell
  function expose(path, getter) {
    _exposed[path] = getter;
  }

  // Handle incoming set commands from the shell
  function onSet(path, handler) {
    _handlers[path] = handler;
  }

  // Push a value change up to the shell
  function send(path, value) {
    _post('param:changed', { path: `${_namespace}.${path}`, value });
    _post(`param:${_namespace}.${path}`, { path: `${_namespace}.${path}`, value });
  }

  // Listen for any bus topic coming from the shell
  function on(topic, fn) {
    if (!_topicListeners[topic]) _topicListeners[topic] = [];
    _topicListeners[topic].push(fn);
  }

  const _topicListeners = {};

  function _onMessage(e) {
    const msg = e.data;
    if (!msg || !msg._explainer) return;

    // Handle param:set directed at this namespace
    if (msg.topic === 'param:set' || msg.topic === 'param:changed') {
      const prefix = _namespace + '.';
      if (msg.path && msg.path.startsWith(prefix)) {
        const localPath = msg.path.slice(prefix.length);
        if (_handlers[localPath]) {
          _handlers[localPath](msg.value, msg);
        }
      }
    }

    // Handle param:query (shell asking for current values)
    if (msg.topic === 'param:query') {
      const values = {};
      for (const [path, getter] of Object.entries(_exposed)) {
        values[`${_namespace}.${path}`] = getter();
      }
      _post('param:values', { values });
    }

    // Dispatch to topic listeners
    const list = _topicListeners[msg.topic];
    if (list) for (const fn of list) {
      try { fn(msg); } catch (err) { console.error(`[Bridge] ${msg.topic}:`, err); }
    }
  }

  function _post(topic, data = {}) {
    if (window.parent === window) return; // not in iframe
    window.parent.postMessage({
      _explainer: true,
      topic,
      source: _namespace,
      ts: Date.now(),
      ...data
    }, '*');
  }

  function destroy() {
    window.removeEventListener('message', _onMessage);
  }

  const Bridge = { init, expose, onSet, send, on, destroy };
  return Bridge;
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExplainerBridge;
}
