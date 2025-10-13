/**
 * CLUSTER • Gamepad
 * Enhanced input handling with rich visualizations
 */

(function(global){
  'use strict';
  const NS = global.CLUSTER = global.CLUSTER || {};
  const U = NS.Utils;

  const Gamepad = {
    dead: 0.08,
    speed: 900,
    stickMode: 'left', // 'left', 'right', or 'both'
    cursor: { x: 200, y: 200 },
    buf: { t: [], ax: [], ay: [], vx: [], vy: [], ax2: [], ay2: [], vmag: [], amag: [], N: 240 },
    stats: {
      ax: new U.RunningStats(),
      ay: new U.RunningStats(),
      vx: new U.RunningStats(),
      vy: new U.RunningStats()
    },
    emaAx: new U.EMA(0.25),
    emaAy: new U.EMA(0.25),
    spring: new U.EMA(0.05),
    learnParam: null,
    pressedCache: '',
    visualizers: {},
    // Component selection/activation state
    selectedComponent: null,
    rtPressed: false,
    rtPressStart: 0,
    // Button hold state for acceleration
    ltPressStart: 0,
    lbPressStart: 0,
    // Calibration offsets for stick drift
    centerOffset: { x: 0, y: 0 },
    calibrating: false,
    calibSamples: []
  };

  function listPads() {
    return (navigator.getGamepads ? Array.from(navigator.getGamepads() || []) : []).filter(Boolean);
  }

  /* ---------- Series Data ---------- */
  function pushSeries(dt, ax, ay) {
    const B = Gamepad.buf;
    const N = B.N;

    const lastAx = B.ax.length ? B.ax[B.ax.length - 1] : 0;
    const lastAy = B.ay.length ? B.ay[B.ay.length - 1] : 0;

    const vx = (ax - lastAx) / dt;
    const vy = (ay - lastAy) / dt;

    const lastVx = B.vx.length ? B.vx[B.vx.length - 1] : 0;
    const lastVy = B.vy.length ? B.vy[B.vy.length - 1] : 0;

    const ax2 = (vx - lastVx) / dt;
    const ay2 = (vy - lastVy) / dt;

    const vmag = Math.hypot(vx, vy);
    const amag = Math.hypot(ax2, ay2);

    B.t.push((B.t.length ? B.t[B.t.length - 1] + dt : 0));
    B.ax.push(ax);
    B.ay.push(ay);
    B.vx.push(vx);
    B.vy.push(vy);
    B.ax2.push(ax2);
    B.ay2.push(ay2);
    B.vmag.push(vmag);
    B.amag.push(amag);

    if (B.t.length > N) {
      ['t', 'ax', 'ay', 'vx', 'vy', 'ax2', 'ay2', 'vmag', 'amag'].forEach(k => B[k].splice(0, B[k].length - N));
    }

    Gamepad.stats.ax.push(ax);
    Gamepad.stats.ay.push(ay);
    Gamepad.stats.vx.push(vx);
    Gamepad.stats.vy.push(vy);

    Gamepad.spring.step(vmag < 0 ? -vmag : 0);

    NS.Bus.emit('gamepad:series', { ...B });
  }

  /* ---------- Circular Joystick Position Visualizer ---------- */
  function createPositionViz() {
    const el = U.$('#gp-position');
    if (!el) return null;

    const c = el.getContext('2d');
    const W = el.width;
    const H = el.height;
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) / 2 - 20;

    return {
      draw: (ax, ay) => {
        c.clearRect(0, 0, W, H);

        // Background circle
        c.strokeStyle = '#3c4565';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);
        c.stroke();

        // Deadzone circle
        c.strokeStyle = '#252a3b';
        c.lineWidth = 1;
        c.beginPath();
        c.arc(cx, cy, r * Gamepad.dead, 0, Math.PI * 2);
        c.stroke();

        // Cross hairs
        c.strokeStyle = '#252a3b';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(cx - r, cy);
        c.lineTo(cx + r, cy);
        c.moveTo(cx, cy - r);
        c.lineTo(cx, cy + r);
        c.stroke();

        // Position indicator
        const px = cx + ax * r;
        const py = cy - ay * r; // Y inverted

        // Trail from center
        c.strokeStyle = 'rgba(122,162,247,0.3)';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(cx, cy);
        c.lineTo(px, py);
        c.stroke();

        // Current position
        c.fillStyle = '#7aa2f7';
        c.strokeStyle = '#dbe0ff';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(px, py, 8, 0, Math.PI * 2);
        c.fill();
        c.stroke();

        // Coordinates text
        c.fillStyle = '#cbd3ea';
        c.font = '11px ui-monospace,monospace';
        c.textAlign = 'center';
        c.fillText(`X: ${ax.toFixed(3)}`, cx, H - 25);
        c.fillText(`Y: ${ay.toFixed(3)}`, cx, H - 10);
      }
    };
  }

  /* ---------- Button Grid Visualizer ---------- */
  function createButtonViz() {
    const el = U.$('#gp-buttons');
    if (!el) return null;

    const c = el.getContext('2d');
    const W = el.width;
    const H = el.height;

    const buttonLayout = {
      // Face buttons (right side)
      0: { x: 220, y: 60, label: 'A', color: '#8bd5ca' },
      1: { x: 245, y: 40, label: 'B', color: '#eb6f92' },
      2: { x: 195, y: 40, label: 'X', color: '#7aa2f7' },
      3: { x: 220, y: 20, label: 'Y', color: '#f6c177' },
      // D-Pad (left side)
      12: { x: 60, y: 20, label: '↑', color: '#c5c8d4' },
      13: { x: 60, y: 60, label: '↓', color: '#c5c8d4' },
      14: { x: 40, y: 40, label: '←', color: '#c5c8d4' },
      15: { x: 80, y: 40, label: '→', color: '#c5c8d4' },
      // Shoulders
      4: { x: 40, y: 110, label: 'LB', color: '#9fb2e0' },
      5: { x: 220, y: 110, label: 'RB', color: '#9fb2e0' },
      // Triggers
      6: { x: 40, y: 145, label: 'LT', color: '#9fb2e0', analog: true },
      7: { x: 220, y: 145, label: 'RT', color: '#9fb2e0', analog: true },
      // Meta
      8: { x: 100, y: 145, label: 'Sel', color: '#8a8f9d' },
      9: { x: 160, y: 145, label: 'Sta', color: '#8a8f9d' }
    };

    return {
      draw: (gp) => {
        c.clearRect(0, 0, W, H);

        // Title
        c.fillStyle = '#cbd3ea';
        c.font = '10px ui-monospace,monospace';
        c.textAlign = 'left';

        Object.keys(buttonLayout).forEach(idx => {
          const i = parseInt(idx);
          const btn = gp.buttons[i];
          const layout = buttonLayout[i];

          if (btn && layout) {
            const pressed = btn.pressed;
            const value = btn.value || 0;

            // Button circle
            c.fillStyle = pressed ? layout.color : '#1a1f2b';
            c.strokeStyle = layout.color;
            c.lineWidth = pressed ? 2 : 1;
            c.beginPath();
            c.arc(layout.x, layout.y, 12, 0, Math.PI * 2);
            c.fill();
            c.stroke();

            // Analog indicator (for triggers)
            if (layout.analog && value > 0) {
              c.fillStyle = layout.color;
              c.globalAlpha = value;
              c.beginPath();
              c.arc(layout.x, layout.y, 10, 0, Math.PI * 2);
              c.fill();
              c.globalAlpha = 1;
            }

            // Label
            c.fillStyle = pressed ? '#0b0c10' : layout.color;
            c.font = 'bold 10px ui-monospace,monospace';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(layout.label, layout.x, layout.y);
          }
        });
      }
    };
  }

  /* ---------- Waveform Visualizer ---------- */
  function createWaveformViz(id, keys, colors) {
    const el = U.$('#' + id);
    if (!el) return null;

    const c = el.getContext('2d');
    const W = el.width;
    const H = el.height;

    function norm(arr) {
      if (!arr || arr.length === 0) return [];
      let mn = 1e9, mx = -1e9;
      for (const v of arr) {
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      const d = (mx - mn) || 1;
      // If all values are the same (e.g., all zeros), return them as-is
      if (d < 0.001) {
        return arr.map(() => 0);
      }
      return arr.map(v => ((v - mn) / d) * 2 - 1);
    }

    return {
      draw: () => {
        c.clearRect(0, 0, W, H);

        // Grid
        c.strokeStyle = '#1a1f2b';
        c.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const y = (i / 4) * H;
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(W, y);
          c.stroke();
        }

        // Center line
        c.strokeStyle = '#252a3b';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(0, H / 2);
        c.lineTo(W, H / 2);
        c.stroke();

        keys.forEach((k, i) => {
          const arr = norm(Gamepad.buf[k]);
          if (arr.length === 0) return;

          c.strokeStyle = colors[i % colors.length];
          c.lineWidth = 2;
          c.beginPath();

          for (let j = 0; j < arr.length; j++) {
            const x = (j / (Gamepad.buf.N - 1)) * W;
            const y = (0.5 - arr[j] * 0.45) * H;

            if (j === 0) {
              c.moveTo(x, y);
            } else {
              c.lineTo(x, y);
            }
          }

          c.stroke();
        });

        // Legend
        c.font = '10px ui-monospace,monospace';
        c.textAlign = 'left';
        keys.forEach((k, i) => {
          c.fillStyle = colors[i % colors.length];
          c.fillText(k, 10 + i * 50, 15);
        });
      }
    };
  }

  /* ---------- Magnitude Visualizer ---------- */
  function createMagnitudeViz(id, key, color) {
    const el = U.$('#' + id);
    if (!el) return null;

    const c = el.getContext('2d');
    const W = el.width;
    const H = el.height;

    return {
      draw: () => {
        c.clearRect(0, 0, W, H);

        // Grid
        c.strokeStyle = '#1a1f2b';
        c.lineWidth = 1;
        for (let i = 0; i <= 3; i++) {
          const y = (i / 3) * H;
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(W, y);
          c.stroke();
        }

        const arr = Gamepad.buf[key];
        if (!arr || arr.length === 0) return;

        // Find max for scaling
        let max = 0;
        for (const v of arr) {
          if (v > max) max = v;
        }
        const scale = max > 0 ? 1 / max : 1;

        // Waveform
        c.fillStyle = color;
        c.globalAlpha = 0.6;
        c.beginPath();
        c.moveTo(0, H);

        for (let j = 0; j < arr.length; j++) {
          const x = (j / (Gamepad.buf.N - 1)) * W;
          const y = H - (arr[j] * scale * H);
          c.lineTo(x, y);
        }

        c.lineTo(W, H);
        c.closePath();
        c.fill();
        c.globalAlpha = 1;

        // Line
        c.strokeStyle = color;
        c.lineWidth = 2;
        c.beginPath();

        for (let j = 0; j < arr.length; j++) {
          const x = (j / (Gamepad.buf.N - 1)) * W;
          const y = H - (arr[j] * scale * H);

          if (j === 0) {
            c.moveTo(x, y);
          } else {
            c.lineTo(x, y);
          }
        }

        c.stroke();

        // Current value
        const current = arr[arr.length - 1] || 0;
        c.fillStyle = color;
        c.font = '11px ui-monospace,monospace';
        c.textAlign = 'right';
        c.fillText(current.toFixed(3), W - 10, 15);
      }
    };
  }

  /* ---------- Control Finding & Learning ---------- */
  function nearestControl(x, y) {
    let best = null, bd = 1e9;
    U.$all('[data-param]').forEach(el => {
      const r = el.getBoundingClientRect();
      const cx = (r.left + r.right) / 2;
      const cy = (r.top + r.bottom) / 2;
      const d = Math.hypot(cx - x, cy - y);
      if (d < bd) {
        bd = d;
        best = el;
      }
    });
    return best;
  }

  function focusNearest() {
    const c = U.$('#gp-cursor').getBoundingClientRect();
    const el = nearestControl(c.left, c.top);
    if (el) el.focus();
  }

  function bindLearn(source, param) {
    // Detect scale type from element attribute
    const el = document.querySelector(`[data-param="${param}"]`);
    const scaleType = el?.getAttribute('data-scale') || 'linear';

    // Use Mapper API to add mapping
    if (NS.Mapper) {
      NS.Mapper.addMapping(source, param, 1, 0, false, Gamepad.dead, scaleType);
    }
  }

  /* ---------- Stats Display ---------- */
  function updateStatsView(gp) {
    const s = Gamepad.stats;
    const vmag = Gamepad.buf.vmag[Gamepad.buf.vmag.length - 1] || 0;
    const amag = Gamepad.buf.amag[Gamepad.buf.amag.length - 1] || 0;

    // Show raw axis values for diagnostics
    const axes = gp ? gp.axes : [];
    const axisInfo = axes.length > 0 ? `
Raw Axes:
  L: [${(axes[0] || 0).toFixed(3)}, ${(axes[1] || 0).toFixed(3)}]
  R: [${(axes[2] || 0).toFixed(3)}, ${(axes[3] || 0).toFixed(3)}]

` : '';

    const txt = `${axisInfo}Position:
  ax: μ=${s.ax.mean.toFixed(4)} σ=${s.ax.std().toFixed(4)}
  ay: μ=${s.ay.mean.toFixed(4)} σ=${s.ay.std().toFixed(4)}

Velocity:
  vx: μ=${s.vx.mean.toFixed(4)} σ=${s.vx.std().toFixed(4)}
  vy: μ=${s.vy.mean.toFixed(4)} σ=${s.vy.std().toFixed(4)}
  |v|: ${vmag.toFixed(4)}

Acceleration:
  |a|: ${amag.toFixed(4)}

Spring: ${Gamepad.spring.y.toFixed(4)}`;

    const statsEl = U.$('#gp-stats');
    if (statsEl) {
      statsEl.textContent = txt;
    }
  }

  /* ---------- Logging ---------- */
  function snapshot(gp, ax, ay, dt) {
    const t = new Date();
    const dpad = {
      U: gp.buttons[12]?.pressed ? 1 : 0,
      D: gp.buttons[13]?.pressed ? 1 : 0,
      L: gp.buttons[14]?.pressed ? 1 : 0,
      R: gp.buttons[15]?.pressed ? 1 : 0
    };
    const face = {
      A: gp.buttons[0]?.pressed ? 1 : 0,
      B: gp.buttons[1]?.pressed ? 1 : 0,
      X: gp.buttons[2]?.pressed ? 1 : 0,
      Y: gp.buttons[3]?.pressed ? 1 : 0
    };
    const sh = {
      LB: gp.buttons[4]?.pressed ? 1 : 0,
      RB: gp.buttons[5]?.pressed ? 1 : 0
    };
    const trig = {
      LT: (gp.buttons[6]?.value || 0),
      RT: (gp.buttons[7]?.value || 0)
    };
    const meta = {
      Bk: gp.buttons[8]?.pressed ? 1 : 0,
      St: gp.buttons[9]?.pressed ? 1 : 0
    };

    return {
      T: t.toLocaleTimeString([], { hour12: false }),
      dms: dt.toFixed(1),
      ax: ax.toFixed(3),
      ay: ay.toFixed(3),
      dpad, face, sh,
      trig: { LT: +trig.LT.toFixed(2), RT: +trig.RT.toFixed(2) },
      meta
    };
  }

  function snapshotChanged(prev, cur, eps = 0.002) {
    if (!prev) return { changed: true, fields: new Set(['*']) };

    const f = new Set();
    if (Math.abs(+prev.ax - +cur.ax) > eps) f.add('ax');
    if (Math.abs(+prev.ay - +cur.ay) > eps) f.add('ay');

    const groups = ['dpad', 'face', 'sh', 'trig', 'meta'];
    groups.forEach(g => {
      const a = prev[g];
      const b = cur[g];
      for (const k in b) {
        if (Math.abs((a?.[k] || 0) - (b[k] || 0)) > (g === 'trig' ? 0.02 : 0.5)) {
          f.add(g);
          break;
        }
      }
    });

    return { changed: f.size > 0, fields: f };
  }

  function renderParsedRow(prev, snap) {
    const td = (v, chg) => `<td class="${chg ? 'chg' : ''}">${v}</td>`;
    const f = snapshotChanged(prev, snap).fields;

    const dpadStr = `${snap.dpad.U ? 'U' : ''}${snap.dpad.D ? 'D' : ''}${snap.dpad.L ? 'L' : ''}${snap.dpad.R ? 'R' : ''}` || '·';
    const faceStr = `${snap.face.A ? 'A' : ''}${snap.face.B ? 'B' : ''}${snap.face.X ? 'X' : ''}${snap.face.Y ? 'Y' : ''}` || '·';
    const shStr = `${snap.sh.LB ? 'LB' : ''}${snap.sh.RB ? ' RB' : ''}`.trim() || '·';
    const trigStr = `${snap.trig.LT > 0.01 ? 'LT:' + snap.trig.LT.toFixed(2) : ''}${snap.trig.RT > 0.01 ? (snap.trig.LT > 0.01 ? ' ' : '') + 'RT:' + snap.trig.RT.toFixed(2) : ''}` || '·';
    const metaStr = `${snap.meta.Bk ? 'Bk' : ''}${snap.meta.St ? (snap.meta.Bk ? ' ' : '') + 'St' : ''}` || '·';

    const tr = document.createElement('tr');
    tr.innerHTML = td(snap.T, false) + td(snap.dms, false)
      + td(snap.ax, f.has('ax')) + td(snap.ay, f.has('ay'))
      + td(dpadStr, f.has('dpad')) + td(faceStr, f.has('face'))
      + td(shStr, f.has('sh')) + td(trigStr, f.has('trig')) + td(metaStr, f.has('meta'));

    return tr;
  }

  /* ---------- UI Attachment ---------- */
  function attachUI() {
    // Learn mappings
    U.$all('[data-param]').forEach(inp => {
      inp.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        Gamepad.learnParam = inp.getAttribute('data-param');
        NS.Bus.emit('log:learn', { param: Gamepad.learnParam });
      });
    });

    // Mapper clear (handled by mapper itself now)

    // Calibrate
    const calibBtn = U.$('#gp-calib');
    if (calibBtn) {
      calibBtn.addEventListener('click', () => {
        // Start calibration sampling (will collect 60 samples in main loop)
        Gamepad.calibrating = true;
        Gamepad.calibSamples = [];
        calibBtn.textContent = 'Calibrating...';
        calibBtn.disabled = true;

        // Reset stats too
        Gamepad.stats = {
          ax: new U.RunningStats(),
          ay: new U.RunningStats(),
          vx: new U.RunningStats(),
          vy: new U.RunningStats()
        };
      });
    }

    // Speed control
    const speedEl = U.$('#gp-speed');
    if (speedEl) {
      speedEl.addEventListener('input', () => {
        Gamepad.speed = +speedEl.value;
      });
    }

    // Deadzone control
    const deadEl = U.$('#gp-dead');
    if (deadEl) {
      deadEl.addEventListener('input', () => {
        Gamepad.dead = +deadEl.value;
      });
    }

    // Stick selection
    const stickSelect = U.$('#gp-stick-select');
    if (stickSelect) {
      stickSelect.addEventListener('change', () => {
        Gamepad.stickMode = stickSelect.value;
      });
    }

    // Log mode
    const mode = U.$('#log-mode');
    if (mode) {
      mode.addEventListener('change', () => {
        const parsed = mode.checked;
        const table = U.$('.log-table');
        const raw = U.$('#log-raw');
        if (table) table.style.display = parsed ? 'table' : 'none';
        if (raw) raw.style.display = parsed ? 'none' : 'block';
      });
    }
  }

  /* ---------- Poll Loop ---------- */
  function start() {
    attachUI();

    // Create visualizers immediately
    Gamepad.visualizers.position = createPositionViz();
    Gamepad.visualizers.buttons = createButtonViz();
    Gamepad.visualizers.axes = createWaveformViz('gp-axes', ['ax', 'ay'], ['#7aa2f7', '#8bd5ca']);
    Gamepad.visualizers.axes2 = createWaveformViz('gp-axes2', ['ax', 'ay'], ['#7aa2f7', '#8bd5ca']);
    Gamepad.visualizers.deriv = createWaveformViz('gp-deriv', ['vx', 'vy', 'ax2', 'ay2'], ['#7aa2f7', '#8bd5ca', '#f6c177', '#eb6f92']);
    Gamepad.visualizers.velocity = createMagnitudeViz('gp-velocity', 'vmag', '#7aa2f7');
    Gamepad.visualizers.accel = createMagnitudeViz('gp-accel', 'amag', '#eb6f92');

    const cursor = U.$('#gp-cursor');
    let last = U.now();
    let prevSnap = null;
    let selNode = 0;
    let selPanel = 0;
    let hoveredComponent = null;

    function step() {
      const now = U.now();
      const dt = Math.max(0.001, (now - last));
      last = now;

      const pads = listPads();

      if (pads.length) {
        U.$('#status-gp').textContent = 'gamepad: 1';
        const gp = pads[0];

        // Select axes based on stick mode
        let axRaw, ayRaw;
        if (Gamepad.stickMode === 'left') {
          axRaw = gp.axes[0] || 0;  // Left stick X
          ayRaw = gp.axes[1] || 0;  // Left stick Y
        } else if (Gamepad.stickMode === 'right') {
          axRaw = gp.axes[2] || 0;  // Right stick X
          ayRaw = gp.axes[3] || 0;  // Right stick Y
        } else { // 'both' - average both sticks
          axRaw = ((gp.axes[0] || 0) + (gp.axes[2] || 0)) / 2;
          ayRaw = ((gp.axes[1] || 0) + (gp.axes[3] || 0)) / 2;
        }

        // Calibration sampling
        if (Gamepad.calibrating) {
          Gamepad.calibSamples.push({ x: axRaw, y: ayRaw });

          if (Gamepad.calibSamples.length >= 60) {
            // Calculate average offset
            const sumX = Gamepad.calibSamples.reduce((s, sample) => s + sample.x, 0);
            const sumY = Gamepad.calibSamples.reduce((s, sample) => s + sample.y, 0);
            Gamepad.centerOffset.x = sumX / Gamepad.calibSamples.length;
            Gamepad.centerOffset.y = sumY / Gamepad.calibSamples.length;

            // Finish calibration
            Gamepad.calibrating = false;
            Gamepad.calibSamples = [];

            // Update button
            const calibBtn = U.$('#gp-calib');
            if (calibBtn) {
              calibBtn.textContent = 'Calibrate';
              calibBtn.disabled = false;
            }

            console.log(`Calibrated with offset: x=${Gamepad.centerOffset.x.toFixed(4)}, y=${Gamepad.centerOffset.y.toFixed(4)}`);
          }
        }

        // Apply calibration offset
        axRaw -= Gamepad.centerOffset.x;
        ayRaw -= Gamepad.centerOffset.y;

        // Y inverted
        const ax = Math.abs(axRaw) < Gamepad.dead ? 0 : axRaw;
        const ay = Math.abs(ayRaw) < Gamepad.dead ? 0 : -ayRaw;

        const dax = Gamepad.emaAx.step(ax);
        const day = Gamepad.emaAy.step(ay);

        const springK = U.clamp(0.5 + Gamepad.spring.y, 0.05, 1.2);
        Gamepad.cursor.x = U.clamp(Gamepad.cursor.x + dax * Gamepad.speed * (dt / 1000) * springK, 0, window.innerWidth);
        Gamepad.cursor.y = U.clamp(Gamepad.cursor.y + day * Gamepad.speed * (dt / 1000) * springK, 0, window.innerHeight);

        if (cursor) {
          cursor.style.transform = `translate(${Gamepad.cursor.x}px,${Gamepad.cursor.y}px) translate(-7px,-7px)`;
        }

        // Update hover state for nearest component
        const nearestNow = nearestControl(Gamepad.cursor.x, Gamepad.cursor.y);
        if (nearestNow !== hoveredComponent) {
          if (hoveredComponent) hoveredComponent.classList.remove('gp-hover');
          if (nearestNow) nearestNow.classList.add('gp-hover');
          hoveredComponent = nearestNow;
        }

        pushSeries(dt / 1000, ax, ay);
        updateStatsView(gp);

        // Update visualizers
        if (Gamepad.visualizers.position) Gamepad.visualizers.position.draw(ax, ay);
        if (Gamepad.visualizers.buttons) Gamepad.visualizers.buttons.draw(gp);
        if (Gamepad.visualizers.axes) Gamepad.visualizers.axes.draw();
        if (Gamepad.visualizers.axes2) Gamepad.visualizers.axes2.draw();
        if (Gamepad.visualizers.deriv) Gamepad.visualizers.deriv.draw();
        if (Gamepad.visualizers.velocity) Gamepad.visualizers.velocity.draw();
        if (Gamepad.visualizers.accel) Gamepad.visualizers.accel.draw();

        // Emit raw axis values for mapper
        NS.Bus.emit('gamepad:axis', { source: 'g0.axis0', value: ax * 0.5 + 0.5, raw: ax });
        NS.Bus.emit('gamepad:axis', { source: 'g0.axis1', value: ay * 0.5 + 0.5, raw: ay });

        // Process button mappings
        gp.buttons.forEach((bt, bi) => {
          const key = `g0.btn${bi}`;

          // Handle learning mode
          if (bt.pressed && !Gamepad.pressedCache.includes(`btn${bi}`)) {
            if (Gamepad.learnParam) {
              bindLearn(key, Gamepad.learnParam);
              Gamepad.learnParam = null;
              if (NS.Mapper && NS.Mapper.renderMappingTable) {
                NS.Mapper.renderMappingTable();
              }
            }
          }

          // Emit button events
          NS.Bus.emit('gamepad:button', {
            source: key,
            value: bt.value,
            pressed: bt.pressed,
            justPressed: bt.pressed && !Gamepad.pressedCache.includes(`btn${bi}`)
          });
        });

        // RT button (7): Activate/select component under cursor
        const rtBtn = gp.buttons[7];
        const rtNowPressed = rtBtn?.pressed || false;

        if (rtNowPressed && !Gamepad.rtPressed) {
          // RT just pressed - select component under cursor
          Gamepad.rtPressStart = now;
          const nearest = nearestControl(Gamepad.cursor.x, Gamepad.cursor.y);
          if (nearest) {
            Gamepad.selectedComponent = nearest;
            nearest.focus();
            nearest.classList.add('gp-selected');
          }
        } else if (!rtNowPressed && Gamepad.rtPressed) {
          // RT just released - deselect
          if (Gamepad.selectedComponent) {
            Gamepad.selectedComponent.classList.remove('gp-selected');
            Gamepad.selectedComponent = null;
          }
        }

        Gamepad.rtPressed = rtNowPressed;

        // Advanced value control when component is selected
        if (Gamepad.selectedComponent) {
          const el = Gamepad.selectedComponent;
          const min = +el.min || 0;
          const max = +el.max || 1;
          const step = +el.step || 0.01;
          const range = max - min;
          let currentVal = +el.value;

          // LT (button 6): Decrement with acceleration
          const ltPressed = gp.buttons[6]?.pressed || false;
          if (ltPressed) {
            if (Gamepad.ltPressStart === 0) Gamepad.ltPressStart = now;
            const holdDuration = (now - Gamepad.ltPressStart) / 1000;
            const accel = 1 + Math.min(holdDuration * 2, 5); // Accelerate up to 6x over 2.5s
            const delta = -step * accel * (dt / 16); // Normalized to ~60fps
            currentVal = U.clamp(currentVal + delta, min, max);
          } else {
            Gamepad.ltPressStart = 0;
          }

          // LB (button 4): Increment with acceleration
          const lbPressed = gp.buttons[4]?.pressed || false;
          if (lbPressed) {
            if (Gamepad.lbPressStart === 0) Gamepad.lbPressStart = now;
            const holdDuration = (now - Gamepad.lbPressStart) / 1000;
            const accel = 1 + Math.min(holdDuration * 2, 5);
            const delta = step * accel * (dt / 16);
            currentVal = U.clamp(currentVal + delta, min, max);
          } else {
            Gamepad.lbPressStart = 0;
          }

          // Right stick velocity-based control (use right stick explicitly)
          if (Gamepad.stickMode !== 'right') {
            const rsX = gp.axes[2] || 0;
            const rsY = gp.axes[3] || 0;
            const rsVelocity = Math.abs(rsX) > Math.abs(rsY) ? rsX : -rsY; // Prefer horizontal, then vertical

            if (Math.abs(rsVelocity) > Gamepad.dead) {
              // Velocity-based control: faster movement = larger value changes
              const velocityMag = Math.abs(rsVelocity);
              const velocitySign = Math.sign(rsVelocity);
              const velocityScale = velocityMag * velocityMag * 2; // Quadratic scaling for fine control
              const delta = velocitySign * velocityScale * range * (dt / 1000);
              currentVal = U.clamp(currentVal + delta, min, max);
            }
          }

          // Apply value if changed
          if (currentVal !== +el.value) {
            el.value = currentVal;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }

        // Update pressed cache FIRST for proper debouncing
        const newPressedCache = gp.buttons.map((b, i) => b.pressed ? `btn${i}` : '').filter(Boolean).join(',');

        // Note: Panel toggles and other button actions are now handled
        // by applyButtonActions() above, which is called for all button presses

        // D-pad: Component navigation within focused panel
        // Get all controls in visible panels
        const allControls = Array.from(U.$all('[data-param]')).filter(el => {
          const panel = el.closest('.panel');
          return panel && !panel.classList.contains('panel--closed');
        });

        if (allControls.length > 0) {
          let currentIdx = allControls.indexOf(Gamepad.selectedComponent);
          if (currentIdx === -1) currentIdx = 0;

          // D-pad navigation (with debounce via pressedCache)
          if (gp.buttons[15]?.pressed && !Gamepad.pressedCache.includes('btn15')) {
            // Right: Next component
            currentIdx = (currentIdx + 1) % allControls.length;
            const newComp = allControls[currentIdx];
            if (Gamepad.selectedComponent) Gamepad.selectedComponent.classList.remove('gp-selected');
            Gamepad.selectedComponent = newComp;
            newComp.classList.add('gp-selected');
            newComp.focus();
          }

          if (gp.buttons[14]?.pressed && !Gamepad.pressedCache.includes('btn14')) {
            // Left: Previous component
            currentIdx = (currentIdx - 1 + allControls.length) % allControls.length;
            const newComp = allControls[currentIdx];
            if (Gamepad.selectedComponent) Gamepad.selectedComponent.classList.remove('gp-selected');
            Gamepad.selectedComponent = newComp;
            newComp.classList.add('gp-selected');
            newComp.focus();
          }

          if (gp.buttons[13]?.pressed && !Gamepad.pressedCache.includes('btn13')) {
            // Down: Next by 5 (skip ahead)
            currentIdx = (currentIdx + 5) % allControls.length;
            const newComp = allControls[currentIdx];
            if (Gamepad.selectedComponent) Gamepad.selectedComponent.classList.remove('gp-selected');
            Gamepad.selectedComponent = newComp;
            newComp.classList.add('gp-selected');
            newComp.focus();
          }

          if (gp.buttons[12]?.pressed && !Gamepad.pressedCache.includes('btn12')) {
            // Up: Previous by 5 (skip back)
            currentIdx = (currentIdx - 5 + allControls.length) % allControls.length;
            const newComp = allControls[currentIdx];
            if (Gamepad.selectedComponent) Gamepad.selectedComponent.classList.remove('gp-selected');
            Gamepad.selectedComponent = newComp;
            newComp.classList.add('gp-selected');
            newComp.focus();
          }
        }

        // Update pressed cache for next frame
        Gamepad.pressedCache = newPressedCache;

        // Logging
        const snap = snapshot(gp, ax, ay, dt);
        const ch = snapshotChanged(prevSnap, snap);

        if (ch.changed) {
          const body = document.getElementById('log-body');
          const mode = U.$('#log-mode');

          if (body && mode?.checked) {
            body.appendChild(renderParsedRow(prevSnap, snap));
            while (body.children.length > 180) body.removeChild(body.firstChild);
            body.parentElement.scrollTop = body.parentElement.scrollHeight;
          } else {
            const raw = U.$('#log-raw');
            if (raw) {
              raw.textContent += JSON.stringify(snap) + '\n';
              if (raw.textContent.length > 12000) {
                raw.textContent = raw.textContent.slice(-12000);
              }
            }
          }

          prevSnap = snap;
        }
      } else {
        U.$('#status-gp').textContent = 'gamepad: none';
      }

      // Poll modulation systems
      if (NS.Rhythm && NS.Rhythm.poll) {
        NS.Rhythm.poll(now);
      }
      if (NS.Mapper && NS.Mapper.poll) {
        NS.Mapper.poll(now);
      }

      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  Gamepad.start = start;
  NS.Gamepad = Gamepad;

})(window);
