/**
 * CLUSTER • Main
 * Bootstrap & initialize all modules
 */

(function(global){
  'use strict';
  const NS = global.CLUSTER = global.CLUSTER || {};
  const U = NS.Utils;

  function tickFPS() {
    let last = U.now();
    let frames = 0;
    let acc = 0;

    function raf() {
      const now = U.now();
      const dt = now - last;
      last = now;
      frames++;
      acc += dt;

      if (acc >= 500) {
        const fps = Math.round(frames * 1000 / acc);
        const el = document.getElementById('status-fps');
        if (el) {
          el.textContent = 'fps: ' + fps;
        }
        frames = 0;
        acc = 0;
      }

      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
  }

  function boot() {
    console.log('CLUSTER • Booting modular architecture...');

    // Initialize core systems
    NS.StateManager.init();
    NS.PanelManager.init();

    // Initialize audio & UI
    NS.Audio.init();

    // Initialize visualization
    NS.Scope.init();
    NS.Canvas.init();

    // Initialize input & mapping
    NS.Gamepad.start();
    NS.Mapper.init();
    NS.Rhythm.init();
    NS.Log.init();

    // Build token editor
    NS.StateManager.buildTokenEditor();

    // Shuffle Z button
    const btnShuffle = U.$('#btn-shuffle');
    if (btnShuffle) {
      btnShuffle.addEventListener('click', () => NS.Z.shuffle());
    }

    // Start FPS counter
    tickFPS();

    console.log('CLUSTER • Ready!');
    NS.Bus.emit('cluster:ready');
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window);
