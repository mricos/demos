/**
 * CLUSTER • Canvas
 * PubSub graph visualization with draggable nodes
 */

(function(global){
  'use strict';
  const NS = global.CLUSTER = global.CLUSTER || {};
  const U = NS.Utils;

  const Canvas = {
    nodes: [],
    lookup: new Map(),
    canvas: null,
    ctx: null,
    hover: null
  };

  const MODULE_MAP = {
    audio: '#panel-control1',
    control1: '#panel-control1',
    control2: '#panel-control2',
    control3: '#panel-control3',
    scope: '#panel-scope',
    gamepad: '#panel-gamepad',
    midi: '#panel-midi',
    mapper: '#panel-mapper',
    log: '#panel-log',
    ui: '#panel-ui',
    pubsub: null
  };

  function addNode(name, x, y) {
    const n = {
      name,
      x,
      y,
      vx: 0,
      vy: 0,
      r: 54,
      color: '#2a2f45',
      last: 0
    };
    Canvas.nodes.push(n);
    Canvas.lookup.set(name, n);
  }

  Canvas.pulse = (topic) => {
    const base = topic.split(':')[0];
    const n = Canvas.lookup.get(base) || Canvas.lookup.get(topic);
    if (n) {
      n.last = U.now();
    }
  };

  Canvas.dragByIndex = (i, dx, dy) => {
    if (Canvas.nodes.length === 0) return;
    const idx = ((i % Canvas.nodes.length) + Canvas.nodes.length) % Canvas.nodes.length;
    const n = Canvas.nodes[idx];
    n.x = U.clamp(n.x + dx, 60, Canvas.canvas.width - 60);
    n.y = U.clamp(n.y + dy, 60, Canvas.canvas.height - 60);
  };

  function drawNode(n, now, hover) {
    const c = Canvas.ctx;
    const age = Math.min(1, (now - n.last) / 400);
    const glow = 1 - age;

    c.save();
    c.translate(n.x, n.y);

    c.fillStyle = n.color;
    c.strokeStyle = hover ? '#5e7ae0' : '#3c4565';
    c.lineWidth = 1.5;

    c.beginPath();
    c.arc(0, 0, n.r, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    if (glow > 0) {
      c.beginPath();
      c.arc(0, 0, n.r + 8 * glow, 0, Math.PI * 2);
      c.strokeStyle = `rgba(122,162,247,${0.6 * glow})`;
      c.lineWidth = 6 * glow;
      c.stroke();
    }

    c.fillStyle = '#cfe1ff';
    c.font = '12px ui-monospace,monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(n.name, 0, 0);

    c.restore();
  }

  function draw() {
    const c = Canvas.ctx;
    const W = Canvas.canvas.width;
    const H = Canvas.canvas.height;
    const now = U.now();

    c.clearRect(0, 0, W, H);

    // Grid
    c.strokeStyle = '#162032';
    c.lineWidth = 1;
    c.globalAlpha = 0.6;

    for (let x = 0; x < W; x += 80) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, H);
      c.stroke();
    }

    for (let y = 0; y < H; y += 80) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y);
      c.stroke();
    }

    c.globalAlpha = 1;

    // Nodes
    Canvas.nodes.forEach(n => drawNode(n, now, n === Canvas.hover));

    requestAnimationFrame(draw);
  }

  function hit(x, y) {
    return Canvas.nodes.find(n => Math.hypot(n.x - x, n.y - y) < n.r);
  }

  Canvas.init = () => {
    const can = document.getElementById('bus-canvas');
    if (!can) return;

    Canvas.canvas = can;
    Canvas.ctx = can.getContext('2d');

    // Default nodes & layout
    const cols = ['control1', 'control2', 'control3', 'scope', 'gamepad', 'midi', 'mapper', 'log', 'ui', 'pubsub'];
    cols.forEach((t, i) => {
      addNode(t, 140 + (i % 5) * 260, 220 + (i >= 5 ? 160 : 0));
    });

    // Mouse interactions
    let dragging = null;
    let offx = 0;
    let offy = 0;

    can.addEventListener('mousemove', (e) => {
      const r = can.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      Canvas.hover = hit(x, y) || null;
    });

    can.addEventListener('mousedown', (e) => {
      const r = can.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      dragging = hit(x, y);
      if (dragging) {
        offx = dragging.x - x;
        offy = dragging.y - y;
      }
    });

    can.addEventListener('mouseup', () => {
      dragging = null;
    });

    can.addEventListener('mouseleave', () => {
      dragging = null;
    });

    can.addEventListener('dblclick', (e) => {
      const r = can.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const n = hit(x, y);

      if (!n) return;

      const id = MODULE_MAP[n.name];
      if (id) {
        const panelId = id.replace('#', '');
        NS.PanelManager.setMode(panelId, 'open');
      }
    });

    can.addEventListener('mousemove', (e) => {
      if (!dragging) return;

      const r = can.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;

      dragging.x = U.clamp(x + offx, 60, can.width - 60);
      dragging.y = U.clamp(y + offy, 60, can.height - 60);
    });

    // Resize canvas
    function fit() {
      can.width = innerWidth * devicePixelRatio;
      can.height = innerHeight * devicePixelRatio;
      can.style.width = innerWidth + 'px';
      can.style.height = innerHeight + 'px';
      Canvas.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    window.addEventListener('resize', fit);
    fit();

    draw();
  };

  NS.Canvas = Canvas;

})(window);
