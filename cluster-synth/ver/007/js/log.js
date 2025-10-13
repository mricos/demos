/**
 * CLUSTER • Log
 * Realtime event logging with BPM/beat tracking
 */

(function(global){
  'use strict';
  const NS = global.CLUSTER = global.CLUSTER || {};
  const U = NS.Utils;

  const Log = {
    lastTs: U.now(),
    bpm: 120
  };

  Log.push = (topic, data) => {
    // Event stream mirrored if needed later
    // Parsed view in gamepad module is primary
  };

  Log.init = () => {
    const bpmEl = document.getElementById('log-bpm');
    if (bpmEl) {
      bpmEl.addEventListener('input', () => {
        Log.bpm = +bpmEl.value;
        const statusEl = document.getElementById('status-bpm');
        if (statusEl) {
          statusEl.textContent = 'bpm: ' + Log.bpm;
        }
      });
    }

    const clr = document.getElementById('log-clear');
    if (clr) {
      clr.onclick = () => {
        const body = document.getElementById('log-body');
        const raw = document.getElementById('log-raw');
        if (body) body.innerHTML = '';
        if (raw) raw.textContent = '';
      };
    }
  };

  NS.Log = Log;

})(window);
