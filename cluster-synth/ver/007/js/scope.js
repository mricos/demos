/**
 * CLUSTER • Scope
 * Dual oscilloscope visualization
 */

(function(global){
  'use strict';
  const NS = global.CLUSTER = global.CLUSTER || {};
  const U = NS.Utils;

  const Scope = {};

  function draw(analyser, canvas, color) {
    const c = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const buf = new Float32Array(analyser.fftSize);

    function tick() {
      requestAnimationFrame(tick);
      analyser.getFloatTimeDomainData(buf);

      c.clearRect(0, 0, W, H);
      c.strokeStyle = color;
      c.beginPath();

      for (let i = 0; i < W; i++) {
        const idx = (i * buf.length / W) | 0;
        const v = buf[idx];
        const y = (0.5 - v * 0.45) * H;

        if (i === 0) {
          c.moveTo(i, y);
        } else {
          c.lineTo(i, y);
        }
      }

      c.stroke();
    }

    tick();
  }

  Scope.init = () => {
    NS.Bus.on('audio:ready', nodes => {
      const L = document.getElementById('scopeL');
      const R = document.getElementById('scopeR');

      if (L && R) {
        draw(nodes.analyserL, L, '#7aa2f7');
        draw(nodes.analyserR, R, '#8bd5ca');
      }
    });
  };

  NS.Scope = Scope;

})(window);
