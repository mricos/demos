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

