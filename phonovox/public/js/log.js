(function () {
  function time() { return new Date().toISOString().replace('T',' ').replace('Z',''); }
  function ensureSink() { return document.getElementById('log-sink'); }
  window.Log = {
    info(msg, data){ console.log('[I]', msg, data||'');
      const el = ensureSink(); if (el) el.innerText += `${time()} [I] ${msg}${data? ' ' + JSON.stringify(data): ''}\n`; },
    warn(msg, data){ console.warn('[W]', msg, data||'');
      const el = ensureSink(); if (el) el.innerText += `${time()} [W] ${msg}${data? ' ' + JSON.stringify(data): ''}\n`; },
    err (msg, data){ console.error('[E]', msg, data||'');
      const el = ensureSink(); if (el) el.innerText += `${time()} [E] ${msg}${data? ' ' + JSON.stringify(data): ''}\n`; }
  };
  // bridge EventBus 'log' events
  if (window.EventBus) {
    EventBus.on('log', e => window.Log.info(e.detail?.msg || '', e.detail?.data));
  }
})();

