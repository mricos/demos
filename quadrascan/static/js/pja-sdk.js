(() => {
  const APP = (window.APP = window.APP || {});
  const api = (APP.api = APP.api || {});
  const server = (APP.server = APP.server || {});
  server._modules = {};
  server.register = (name, handlers) => (server._modules[name] = handlers);

  const PROTO = 'pja-1';
  let seq = 1;
  const pending = new Map();

  const post = (win, origin, msg) => win.postMessage(msg, origin);

  addEventListener('message', ev => {
    const { data, source, origin } = ev;
    if (!data || data.proto !== PROTO) return;

    if (data.kind === 'resp') {
      const p = pending.get(data.id);
      if (p) {
        pending.delete(data.id);
        data.ok ? p.r(data.result) : p.j(data.error);
      }
      return;
    }

    if (data.kind === 'req') (async () => {
      let result, ok = true, error = null;
      try {
        const { module, methodPath, args } = data;
        const mod = server._modules[module];
        if (!mod) throw new Error(`no module: ${module}`);
        const fn = methodPath.split('.').reduce((o, k) => o?.[k], mod);
        if (typeof fn !== 'function') throw new Error(`no method: ${methodPath}`);
        result = await fn.apply(mod, args || []);
      } catch (e) {
        ok = false;
        error = String(e.stack || e);
      }
      post(source, origin, { proto: PROTO, kind: 'resp', id: data.id, ok, result, error });
    })();
  });

  api.attach = async (moduleName, iframe, origin, { timeoutMs = 2000 } = {}) => {
    const win = iframe.contentWindow;

    const call = (methodPath, ...args) => new Promise((resolve, reject) => {
      const id = `${Date.now()}-${seq++}`;
      pending.set(id, { r: resolve, j: reject });
      post(win, origin, { proto: PROTO, kind: 'req', id, module: moduleName, methodPath, args });
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error('timeout'));
        }
      }, timeoutMs);
    });

    await call('ping');

    return {
      ping: () => call('ping'),
      getState: () => call('getState'),
      setParams: (p) => call('setParams', p),
      scene: { load: (name) => call('scene.load', name) },
      power: {
        tvOn: () => call('power.tvOn'),
        tvOff: () => call('power.tvOff'),
        gameOn: () => call('power.gameOn'),
        gameOff: () => call('power.gameOff'),
        degauss: () => call('power.degauss')
      },
      presets: {
        apply: (name) => call('presets.apply', name),
        list: () => call('presets.list')
      },
      viewport: {
        setSize: (w, h, scale) => call('viewport.setSize', { w, h, scale })
      }
    };
  };
})();

