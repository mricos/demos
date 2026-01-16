#MULTICAT_START
# dir: .
# file: host.html
# note: Host page with PJAIframer + theme manager + CRT CLI; uses RELATIVE asset URLs (./static/...) so it works when served from repo root
#MULTICAT_END
<!doctype html>
<meta charset="utf-8" />
<title>Pong CRT Host</title>
<script src="./static/js/pja-iframer.js"></script>
<script src="./static/js/theme-manager.js"></script>
<script src="./static/js/pja-sdk.js"></script>
<link rel="stylesheet" href="./static/css/design-tokens.css">
<body style="margin:0;background:var(--pja-bg-primary);color:var(--pja-text-primary);font:12px/1.4 var(--pja-font-mono);">
  <div id="crt-container"></div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      window.PJAThemeManager = new PJAThemeManager();

      const crtIframer = new PJAIframer({
        id: 'crt',
        title: 'CRT Simulator',
        icon: '📺',
        src: './crt.iframe.com/crt.simulator.html',
        buttons: ['reload', 'info', 'cli', 'launch'],
        logMessages: true
      });

      crtIframer.render(document.getElementById('crt-container'));
      setupCRTCommands(crtIframer);
    });

    function setupCRTCommands(iframer) {
      let crtAPI = null;

      iframer.on('ready', async () => {
        try {
          const iframe = iframer.iframe;
          const ORIGIN = new URL(iframe.src, window.location.href).origin;
          crtAPI = await APP.api.attach('crt', iframe, ORIGIN, { timeoutMs: 3000 });
          iframer.logCLI('success', 'CRT API attached');

          const r = iframe.getBoundingClientRect();
          crtAPI.viewport.setSize(r.width | 0, r.height | 0, window.devicePixelRatio || 1);
        } catch (e) {
          iframer.logCLI('error', `Attach failed: ${e}`);
        }
      });

      const ro = new ResizeObserver(() => {
        if (!crtAPI || !iframer.iframe) return;
        const r = iframer.iframe.getBoundingClientRect();
        crtAPI.viewport.setSize(r.width | 0, r.height | 0, window.devicePixelRatio || 1);
      });
      ro.observe(document.getElementById('crt-container'));

      const originalExecuteCLI = iframer.executeCLICommand.bind(iframer);
      iframer.executeCLICommand = function(command) {
        const parts = command.trim().split(/\s+/);
        const cmd = (parts[0] || '').toLowerCase();
        const args = parts.slice(1);

        if (!cmd) return;

        if (cmd === 'crt-help') {
          this.logCLI('info', 'CRT: tv-on|tv-off|game-on|game-off|degauss');
          this.logCLI('info', 'CRT: scene <grid|pong>');
          this.logCLI('info', 'CRT: preset <name>|list');
          this.logCLI('info', 'CRT: params <json>');
          this.logCLI('info', 'CRT: status');
          this.logCLI('info', 'Standard: ping|test|theme|clear|help');
          return;
        }

        if (!crtAPI) {
          this.logCLI('error', 'CRT API not ready');
          return;
        }

        switch (cmd) {
          case 'tv-on':
            crtAPI.power.tvOn().then(() => this.logCLI('success', 'TV on')).catch(e => this.logCLI('error', String(e)));
            break;

          case 'tv-off':
            crtAPI.power.tvOff().then(() => this.logCLI('success', 'TV off')).catch(e => this.logCLI('error', String(e)));
            break;

          case 'game-on':
            crtAPI.power.gameOn().then(() => this.logCLI('success', 'Game on')).catch(e => this.logCLI('error', String(e)));
            break;

          case 'game-off':
            crtAPI.power.gameOff().then(() => this.logCLI('success', 'Game off')).catch(e => this.logCLI('error', String(e)));
            break;

          case 'degauss':
            crtAPI.power.degauss().then(() => this.logCLI('success', 'Degauss')).catch(e => this.logCLI('error', String(e)));
            break;

          case 'scene':
            if (!args[0]) {
              this.logCLI('error', 'Usage: scene <grid|pong>');
              break;
            }
            crtAPI.scene.load(args[0]).then(() => this.logCLI('success', `Scene ${args[0]}`)).catch(e => this.logCLI('error', String(e)));
            break;

          case 'preset':
            if (args[0] === 'list') {
              crtAPI.presets.list().then(list => this.logCLI('info', `Presets: ${list.join(', ')}`)).catch(e => this.logCLI('error', String(e)));
              break;
            }
            if (!args[0]) {
              this.logCLI('error', 'Usage: preset <name> | preset list');
              break;
            }
            crtAPI.presets.apply(args[0]).then(() => this.logCLI('success', `Preset ${args[0]}`)).catch(e => this.logCLI('error', String(e)));
            break;

          case 'params':
            if (args.length === 0) {
              this.logCLI('error', 'Usage: params {"timing":{"vHoldStability":0.92}}');
              break;
            }
            try {
              const json = JSON.parse(args.join(' '));
              crtAPI.setParams(json).then(() => this.logCLI('success', 'Params updated')).catch(e => this.logCLI('error', String(e)));
            } catch {
              this.logCLI('error', 'Invalid JSON');
            }
            break;

          case 'status':
            crtAPI.getState().then(s => this.logCLI('info', JSON.stringify(s))).catch(e => this.logCLI('error', String(e)));
            break;

          default:
            originalExecuteCLI(command);
        }
      };
    }
  </script>
</body>

#MULTICAT_START
# dir: ./crt.iframe.com
# file: crt.simulator.html
# note: Same-origin iframe client (relative); loads local RPC shim + CRT simulator
#MULTICAT_END
<!doctype html>
<meta charset="utf-8" />
<title>CRT Simulator</title>
<style>
  html,body { margin:0; background:#000; height:100%; overflow:hidden; }
  canvas { display:block; width:100vw; height:100vh; image-rendering: pixelated; }
</style>
<canvas id="crt"></canvas>
<script src="../static/js/pja-sdk.js"></script>
<script type="module" src="../static/js/crt-sim.js"></script>

#MULTICAT_START
# dir: ./static/js
# file: pja-sdk.js
# note: Minimal postMessage RPC shim; both host and iframe must load; supports same-origin relative URLs
#MULTICAT_END
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

#MULTICAT_START
# dir: ./static/js
# file: crt-sim.js
# note: Canvas CRT effects + power sequencing + RPC server module "crt"; scenes: grid/pong; presets: stable_tv/rickety_tv/quadrascan_hint
#MULTICAT_END
(function () {
  const canvas = document.getElementById('crt');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

  const state = {
    tvPower: 'off',      // 'off'|'warming'|'on'
    gamePower: 'off',    // 'off'|'booting'|'on'
    degaussTime: 0,
    scene: 'grid',       // 'grid'|'pong'
    params: defaultParams(),
    viewport: { w: 640, h: 480, scale: 1 },
    pong: initPong()
  };

  APP.server.register('crt', {
    ping: () => ({ ok: true, t: performance.now() }),

    getState: () => structuredClone({
      tvPower: state.tvPower,
      gamePower: state.gamePower,
      scene: state.scene,
      params: state.params
    }),

    setParams: (p) => { deepMerge(state.params, p); return true; },

    scene: {
      load: (name) => {
        if (!['grid', 'pong'].includes(name)) throw new Error('bad scene');
        state.scene = name;
        if (name === 'pong') state.pong = initPong();
        return true;
      }
    },

    power: {
      tvOn: () => {
        if (state.tvPower !== 'on') {
          state.tvPower = 'warming';
          state.tWarm = performance.now();
        }
        return true;
      },
      tvOff: () => { state.tvPower = 'off'; return true; },

      gameOn: () => {
        if (state.gamePower !== 'on') {
          state.gamePower = 'booting';
          state.tGame = performance.now();
        }
        return true;
      },
      gameOff: () => { state.gamePower = 'off'; return true; },

      degauss: () => { state.degaussTime = state.params.power.degaussPulseSec; return true; }
    },

    presets: {
      apply: (name) => {
        const p = presetMap()[name];
        if (!p) throw new Error('bad preset');
        deepMerge(state.params, p);
        return true;
      },
      list: () => Object.keys(presetMap())
    },

    viewport: {
      setSize: ({ w, h, scale }) => {
        const s = scale || 1;
        const W = Math.max(320, (w | 0) * s);
        const H = Math.max(240, (h | 0) * s);
        state.viewport = { w: w | 0, h: h | 0, scale: s };
        canvas.width = W;
        canvas.height = H;
        return true;
      }
    }
  });

  function defaultParams() {
    return {
      brightness: 0.45,
      contrast: 1.0,
      gamma: 2.2,
      mask: { type: 'shadow', opacity: 0.12, triadPx: 2 },
      scan: { scanline: 0.35, lineJitterPx: 0.2, fieldFlicker: 0.05 },
      beam: { focusSigma: 0.7, bloom: 0.18, haloGain: 0.12, persistenceMs: 70, streakH: 0.0, streakV: 0.0 },
      convergence: { rx: 0.2, ry: -0.2, gx: 0.0, gy: 0.0, bx: -0.2, by: 0.2 },
      geometry: { curvatureX: 0.12, curvatureY: 0.08, keystone: 0.01, rotation: 0.3 * Math.PI / 180 },
      timing: { hFreq: 15734, vFreq: 60, vHoldStability: 0.98, hHoldStability: 0.985, vsyncDriftHz: 0.0 },
      supply: { rippleVolt: 0.2, rippleHz: 60, sagGain: 0.08 },
      rf: { snow: 0.02, humBar: 0.02 },
      power: { warmupSec: 3.0, degaussPulseSec: 1.2 }
    };
  }

  function presetMap() {
    return {
      stable_tv: {
        scan: { scanline: 0.28, lineJitterPx: 0.05, fieldFlicker: 0.01 },
        beam: { focusSigma: 0.55, bloom: 0.12, haloGain: 0.07, persistenceMs: 60 },
        timing: { vHoldStability: 0.995, hHoldStability: 0.995, vsyncDriftHz: 0.0 },
        supply: { rippleVolt: 0.05, sagGain: 0.02 },
        rf: { snow: 0.0, humBar: 0.0 },
        geometry: { curvatureX: 0.08, curvatureY: 0.06, keystone: 0.0, rotation: 0.0 }
      },

      rickety_tv: {
        scan: { scanline: 0.50, lineJitterPx: 0.70, fieldFlicker: 0.12 },
        beam: { focusSigma: 1.10, bloom: 0.35, haloGain: 0.22, persistenceMs: 110 },
        timing: { vHoldStability: 0.90, hHoldStability: 0.92, vsyncDriftHz: 0.25 },
        supply: { rippleVolt: 0.90, sagGain: 0.20 },
        rf: { snow: 0.06, humBar: 0.12 },
        geometry: { curvatureX: 0.16, curvatureY: 0.12, keystone: 0.02, rotation: 0.8 * Math.PI / 180 },
        mask: { opacity: 0.18 }
      },

      quadrascan_hint: {
        mask: { type: 'aperture', opacity: 0.06, triadPx: 1 },
        beam: { focusSigma: 0.40, bloom: 0.08, haloGain: 0.05, persistenceMs: 40, streakH: 0.02, streakV: 0.02 },
        scan: { scanline: 0.20, lineJitterPx: 0.05, fieldFlicker: 0.01 },
        timing: { vHoldStability: 0.997, hHoldStability: 0.997, vsyncDriftHz: 0.0 },
        rf: { snow: 0.0, humBar: 0.0 }
      }
    };
  }

  function initPong() { return { x: 320, y: 240, vx: 120, vy: 70, p1: 200, p2: 200 }; }

  const fb = ctx.createImageData(640, 480);
  const prev = ctx.createImageData(640, 480);

  let lastT = performance.now();
  requestAnimationFrame(function loop(t) {
    const dt = Math.max(0.001, (t - lastT) / 1000);
    lastT = t;

    stepPower();
    drawFrame();
    blitCRT(dt);

    requestAnimationFrame(loop);
  });

  function stepPower() {
    if (state.tvPower === 'warming' && (performance.now() - state.tWarm) / 1000 >= state.params.power.warmupSec) state.tvPower = 'on';
    if (state.gamePower === 'booting' && (performance.now() - state.tGame) / 1000 >= 0.6) state.gamePower = 'on';
  }

  function clearFB() { fb.data.fill(0); }

  function putRect(x, y, w, h, r, g, b) {
    const W = fb.width, H = fb.height;
    const x0 = Math.max(0, x | 0), x1 = Math.min(W, (x + w) | 0);
    const y0 = Math.max(0, y | 0), y1 = Math.min(H, (y + h) | 0);
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
      const k = (j * W + i) * 4;
      fb.data[k] = r; fb.data[k + 1] = g; fb.data[k + 2] = b; fb.data[k + 3] = 255;
    }
  }

  function rfNoise() {
    const W = fb.width, H = fb.height;
    const { snow, humBar } = state.params.rf;
    const t = performance.now() / 1000;
    for (let y = 0; y < H; y++) {
      const hum = humBar > 0 ? (0.5 + 0.5 * Math.sin(2 * Math.PI * state.params.supply.rippleHz * (t + y / H))) * 255 * humBar : 0;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const n = (Math.random() < snow ? 255 * Math.random() : 0);
        const v = Math.min(255, n + hum);
        fb.data[i] = fb.data[i + 1] = fb.data[i + 2] = v;
        fb.data[i + 3] = 255;
      }
    }
  }

  function drawGrid() {
    const W = fb.width, H = fb.height;
    for (let x = 0; x < W; x += 32) putRect(x, 0, 1, H, 80, 80, 80);
    for (let y = 0; y < H; y += 32) putRect(0, y, W, 1, 80, 80, 80);
    putRect(W / 2 - 1, 0, 3, H, 160, 160, 160);
    putRect(0, H / 2 - 1, W, 3, 160, 160, 160);
  }

  function stepPong(dt) {
    const p = state.pong;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.y < 5 && p.vy < 0) p.vy *= -1;
    if (p.y > fb.height - 5 && p.vy > 0) p.vy *= -1;
    p.p1 += Math.sign(p.y - (p.p1 + 30)) * 90 * dt;
    p.p2 += Math.sign(p.y - (p.p2 + 30)) * 100 * dt;
    if (p.x < 18 && p.vx < 0 && Math.abs(p.y - (p.p1 + 30)) < 38) p.vx *= -1.02;
    if (p.x > fb.width - 18 && p.vx > 0 && Math.abs(p.y - (p.p2 + 30)) < 38) p.vx *= -1.02;
    if (p.x < 0 || p.x > fb.width) { p.x = fb.width / 2; p.y = fb.height / 2; p.vx = 120 * Math.sign(p.vx) * -1; p.vy = 70; }
  }

  function drawPong() {
    stepPong(1 / 60);
    const p = state.pong;
    putRect(8, p.p1, 8, 60, 255, 255, 255);
    putRect(fb.width - 16, p.p2, 8, 60, 255, 255, 255);
    putRect(p.x - 4, p.y - 4, 8, 8, 255, 255, 255);
  }

  function drawFrame() {
    clearFB();
    if (state.tvPower === 'off') return;
    if (state.gamePower === 'on') state.scene === 'grid' ? drawGrid() : drawPong();
    else rfNoise();
  }

  function blitCRT(dt) {
    if (state.tvPower === 'off') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); return; }

    const pers = Math.exp(-dt * 1000 / Math.max(1, state.params.beam.persistenceMs));
    for (let i = 0; i < fb.data.length; i += 4) {
      prev.data[i] = prev.data[i] * pers + fb.data[i] * (1 - pers);
      prev.data[i + 1] = prev.data[i + 1] * pers + fb.data[i + 1] * (1 - pers);
      prev.data[i + 2] = prev.data[i + 2] * pers + fb.data[i + 2] * (1 - pers);
      prev.data[i + 3] = 255;
    }

    const sag = 1.0 - state.params.supply.sagGain * beamLoad(prev);
    const ripple = 1.0 - 0.25 * state.params.supply.rippleVolt * (0.5 + 0.5 * Math.sin(2 * Math.PI * state.params.supply.rippleHz * performance.now() / 1000));
    const powerScalar = clamp(sag * ripple, 0.6, 1.2);

    const off = convertWithGamma(prev, powerScalar, state.params);

    const W = canvas.width, H = canvas.height;
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(off, 0, 0, W, H);

    scanlineOverlay(W, H, state.params.scan);
    if (state.params.mask.opacity > 0) shadowMask(W, H, state.params.mask);

    if (state.degaussTime > 0) {
      const a = 0.35 * (state.degaussTime / state.params.power.degaussPulseSec);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(0, 0, W, H);
      state.degaussTime = Math.max(0, state.degaussTime - dt);
    }

    ctx.restore();
  }

  function beamLoad(img) {
    let acc = 0, n = img.data.length / 4;
    for (let i = 0; i < img.data.length; i += 4) acc += (img.data[i] + img.data[i + 1] + img.data[i + 2]) / (3 * 255);
    return acc / n;
  }

  function convertWithGamma(img, powerScalar, params) {
    const lut = new Uint8ClampedArray(256);
    const { gamma, brightness, contrast } = params;
    for (let i = 0; i < 256; i++) {
      let v = i / 255;
      v = Math.pow(v, 1 / gamma);
      v = (v - 0.5) * contrast + 0.5;
      v = clamp(v + (brightness - 0.5), 0, 1);
      v *= powerScalar;
      lut[i] = clampI(v * 255, 0, 255);
    }

    const off = document.createElement('canvas');
    off.width = img.width; off.height = img.height;
    const c = off.getContext('2d');
    const d = c.createImageData(img.width, img.height);

    const jitter = params.scan.lineJitterPx;
    for (let y = 0; y < img.height; y++) {
      const j = ((Math.random() * 2 - 1) * jitter) | 0;
      for (let x = 0; x < img.width; x++) {
        const si = (y * img.width + clampI(x + j, 0, img.width - 1)) * 4;
        const di = (y * img.width + x) * 4;
        d.data[di] = lut[img.data[si]];
        d.data[di + 1] = lut[img.data[si + 1]];
        d.data[di + 2] = lut[img.data[si + 2]];
        d.data[di + 3] = 255;
      }
    }
    c.putImageData(d, 0, 0);
    return off;
  }

  function scanlineOverlay(W, H, scan) {
    if (!scan.scanline) return;
    const a = clamp(scan.scanline + (Math.random() < 0.5 ? scan.fieldFlicker : -scan.fieldFlicker), 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#000';
    for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
    ctx.globalAlpha = 1;
  }

  function shadowMask(W, H, mask) {
    const p = mask.triadPx | 0 || 1;
    const a = clamp(mask.opacity, 0, 1);

    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const cc = off.getContext('2d');
    const img = cc.createImageData(W, H);

    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const m = ((x / p) % 3) | 0;
      img.data[i] = m === 0 ? 255 : 0;
      img.data[i + 1] = m === 1 ? 255 : 0;
      img.data[i + 2] = m === 2 ? 255 : 0;
      img.data[i + 3] = 255;
    }

    cc.putImageData(img, 0, 0);
    ctx.globalAlpha = a;
    ctx.drawImage(off, 0, 0);
    ctx.globalAlpha = 1;
  }

  function deepMerge(dst, src) {
    for (const k in src) {
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) {
        if (!dst[k] || typeof dst[k] !== 'object') dst[k] = {};
        deepMerge(dst[k], src[k]);
      } else {
        dst[k] = src[k];
      }
    }
    return dst;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clampI(v, a, b) { return Math.max(a, Math.min(b, v | 0)); }
})();

#MULTICAT_START
# dir: ./static/js
# file: pja-iframer.js
# note: Minimal stub PJAIframer with CLI + events; sufficient for this project; replace with your full implementation if available
#MULTICAT_END
(function () {
  class PJAIframer {
    constructor(opts) {
      this.opts = opts;
      this._handlers = new Map();
      this.iframe = null;
      this.root = null;
      this.cliInput = null;
      this.cliLog = null;
      this._cliVisible = true;
    }

    on(ev, fn) {
      if (!this._handlers.has(ev)) this._handlers.set(ev, []);
      this._handlers.get(ev).push(fn);
    }

    _emit(ev, ...args) {
      const hs = this._handlers.get(ev) || [];
      for (const h of hs) { try { h(...args); } catch (_) {} }
    }

    render(container) {
      const wrap = document.createElement('div');
      wrap.style.display = 'grid';
      wrap.style.gridTemplateRows = '36px 1fr 180px';
      wrap.style.height = '100vh';

      const bar = document.createElement('div');
      bar.style.display = 'flex';
      bar.style.alignItems = 'center';
      bar.style.gap = '10px';
      bar.style.padding = '0 10px';
      bar.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
      bar.style.userSelect = 'none';

      const title = document.createElement('div');
      title.textContent = `${this.opts.icon || ''} ${this.opts.title || this.opts.id}`;
      title.style.fontFamily = 'var(--pja-font-mono, monospace)';

      const btn = (name, onClick) => {
        const b = document.createElement('button');
        b.textContent = name;
        b.style.background = 'transparent';
        b.style.border = '1px solid rgba(255,255,255,0.12)';
        b.style.color = 'inherit';
        b.style.padding = '4px 8px';
        b.style.cursor = 'pointer';
        b.onclick = onClick;
        return b;
      };

      bar.appendChild(title);
      const buttons = this.opts.buttons || [];

      if (buttons.includes('reload')) bar.appendChild(btn('reload', () => this.reload()));
      if (buttons.includes('cli')) bar.appendChild(btn('cli', () => this.toggleCLI()));
      if (buttons.includes('launch')) bar.appendChild(btn('launch', () => window.open(this.opts.src, '_blank')));
      if (buttons.includes('info')) bar.appendChild(btn('info', () => this.logCLI('info', `src=${this.opts.src}`)));

      const iframe = document.createElement('iframe');
      iframe.id = this.opts.id;
      iframe.src = this.opts.src;
      iframe.style.border = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.onload = () => this._emit('ready');

      const cli = document.createElement('div');
      cli.style.display = 'grid';
      cli.style.gridTemplateRows = '1fr 32px';
      cli.style.borderTop = '1px solid rgba(255,255,255,0.08)';
      cli.style.background = 'rgba(0,0,0,0.35)';

      const log = document.createElement('div');
      log.style.overflow = 'auto';
      log.style.padding = '8px';
      log.style.fontFamily = 'var(--pja-font-mono, monospace)';
      log.style.fontSize = '12px';
      log.style.whiteSpace = 'pre-wrap';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'cli> (try: crt-help)';
      input.style.width = '100%';
      input.style.boxSizing = 'border-box';
      input.style.border = '0';
      input.style.outline = 'none';
      input.style.padding = '6px 8px';
      input.style.fontFamily = 'var(--pja-font-mono, monospace)';
      input.style.background = 'rgba(0,0,0,0.6)';
      input.style.color = 'inherit';

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const cmd = input.value.trim();
          if (!cmd) return;
          input.value = '';
          this.logCLI('cmd', cmd);
          this.executeCLICommand(cmd);
        }
      });

      cli.appendChild(log);
      cli.appendChild(input);

      wrap.appendChild(bar);
      wrap.appendChild(iframe);
      wrap.appendChild(cli);

      container.innerHTML = '';
      container.appendChild(wrap);

      this.iframe = iframe;
      this.root = wrap;
      this.cliInput = input;
      this.cliLog = log;

      this.logCLI('info', 'PJAIframer ready');
      this._emit('ready');
    }

    reload() {
      if (this.iframe) this.iframe.src = this.iframe.src;
    }

    toggleCLI() {
      const rows = this.root.style.gridTemplateRows.split(' ');
      this._cliVisible = !this._cliVisible;
      this.root.style.gridTemplateRows = this._cliVisible ? '36px 1fr 180px' : '36px 1fr 0px';
      if (!this._cliVisible) this.logCLI('info', 'CLI hidden');
    }

    executeCLICommand(command) {
      // Default built-ins; host overrides to add CRT commands
      const c = command.trim().toLowerCase();
      if (c === 'help') {
        this.logCLI('info', 'Built-ins: help|clear|ping');
        return;
      }
      if (c === 'clear') {
        this.cliLog.textContent = '';
        return;
      }
      if (c === 'ping') {
        this.logCLI('info', 'pong');
        return;
      }
      this.logCLI('error', `Unknown command: ${command}`);
    }

    logCLI(level, msg) {
      const line = `[${level}] ${msg}\n`;
      this.cliLog.textContent += line;
      this.cliLog.scrollTop = this.cliLog.scrollHeight;
      if (this.opts.logMessages) console.log(line.trim());
    }
  }

  window.PJAIframer = PJAIframer;
})();

#MULTICAT_START
# dir: ./static/js
# file: theme-manager.js
# note: Minimal stub; sets document attribute for theming; replace with your full implementation if available
#MULTICAT_END
(function () {
  class PJAThemeManager {
    constructor() {
      this.setTheme('dark');
    }
    setTheme(name) {
      document.documentElement.setAttribute('data-theme', name);
    }
  }
  window.PJAThemeManager = PJAThemeManager;
})();

#MULTICAT_START
# dir: ./static/css
# file: design-tokens.css
# note: Minimal design tokens used by host body; replace with your full token set if available
#MULTICAT_END
:root {
  --pja-bg-primary: #0b0d10;
  --pja-text-primary: #c9d1d9;
  --pja-font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

#MULTICAT_START
# dir: ./scripts
# file: deploy.sh
# note: Simple deployment script showing MULTICAT usage
#MULTICAT_END
#!/usr/bin/env bash
set -euo pipefail

echo "MULTISPLIT: Use 'ms file.mc' to extract files from MULTICAT format"
echo "Deploying application..."
echo "MULTICAT format allows LLMs to generate multiple files in one response"

#MULTICAT_START
# dir: ./docs/guides
# file: llm-instructions.md
# note: Instructions for LLMs to generate clean MULTICAT output
#MULTICAT_END
# LLM MULTICAT Generation Instructions

❌ WRONG - Do NOT do this:
```bash
#MULTICAT_START
# dir: ./src
# file: app.js
#MULTICAT_END
console.log("hello");
