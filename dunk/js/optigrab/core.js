/**
 * Optigrab Core - Webcam capture and brain orchestration
 */

const OptigrabCore = {
  create(config = {}) {
    const instance = Object.create(OptigrabCore);

    // Event handling
    instance._handlers = {};

    instance.config = {
      width: config.width || 640,
      height: config.height || 480,
      fps: config.fps || 30,
      mirrorVideo: config.mirrorVideo !== false,
      ...config
    };

    instance.brains = new Map();
    instance.video = null;
    instance.canvas = null;
    instance.overlayCanvas = null;
    instance.ctx = null;
    instance.overlayCtx = null;
    instance.stream = null;
    instance.running = false;
    instance.frameCount = 0;
    instance.lastFrameTime = 0;
    instance.actualFps = 0;

    instance.currentFrame = null;
    instance.previousFrame = null;

    return instance;
  },

  // Event emitter
  on(event, fn) {
    (this._handlers[event] = this._handlers[event] || []).push(fn);
    return this;
  },

  off(event, fn) {
    if (this._handlers[event]) {
      this._handlers[event] = this._handlers[event].filter(h => h !== fn);
    }
    return this;
  },

  emit(event, data) {
    if (this._handlers[event]) {
      for (const fn of this._handlers[event]) fn(data);
    }
  },

  mount(container) {
    const el = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!el) throw new Error('Optigrab: mount container not found');

    el.innerHTML = `
      <div class="optigrab-container">
        <div class="optigrab-viewport">
          <video class="optigrab-video" playsinline muted></video>
          <canvas class="optigrab-canvas"></canvas>
          <canvas class="optigrab-overlay"></canvas>
          <div class="optigrab-status"></div>
        </div>
        <div class="optigrab-controls">
          <button class="og-btn og-start">Start</button>
          <button class="og-btn og-stop" disabled>Stop</button>
          <button class="og-btn og-snapshot">Snap</button>
          <span class="og-fps">-- fps</span>
        </div>
        <div class="optigrab-brains"></div>
      </div>
    `;

    this.container = el;
    this.video = el.querySelector('.optigrab-video');
    this.canvas = el.querySelector('.optigrab-canvas');
    this.overlayCanvas = el.querySelector('.optigrab-overlay');
    this.statusEl = el.querySelector('.optigrab-status');
    this.fpsEl = el.querySelector('.og-fps');
    this.brainsEl = el.querySelector('.optigrab-brains');

    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.overlayCtx = this.overlayCanvas.getContext('2d');

    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    this.overlayCanvas.width = this.config.width;
    this.overlayCanvas.height = this.config.height;

    el.querySelector('.og-start').onclick = () => this.start();
    el.querySelector('.og-stop').onclick = () => this.stop();
    el.querySelector('.og-snapshot').onclick = () => this.snapshot();

    this._injectStyles();

    return this;
  },

  async start() {
    if (this.running) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: this.config.width },
          height: { ideal: this.config.height },
          frameRate: { ideal: this.config.fps }
        }
      });

      this.video.srcObject = this.stream;
      await this.video.play();

      const vw = this.video.videoWidth || this.config.width;
      const vh = this.video.videoHeight || this.config.height;
      this.canvas.width = vw;
      this.canvas.height = vh;
      this.overlayCanvas.width = vw;
      this.overlayCanvas.height = vh;

      this.running = true;
      this.frameCount = 0;
      this.lastFrameTime = performance.now();

      this._updateButtons(true);
      this.statusEl.textContent = 'LIVE';
      this.statusEl.classList.add('live');

      this.emit('started', { width: vw, height: vh });
      this._frameLoop();

    } catch (err) {
      this.emit('error', err);
    }
  },

  stop() {
    if (!this.running) return;
    this.running = false;

    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }

    this.video.srcObject = null;
    this._updateButtons(false);
    this.statusEl.textContent = 'STOPPED';
    this.statusEl.classList.remove('live');

    this.emit('stopped');
  },

  _frameLoop() {
    if (!this.running) return;

    if (this.config.mirrorVideo) {
      this.ctx.save();
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(this.video, -this.canvas.width, 0);
      this.ctx.restore();
    } else {
      this.ctx.drawImage(this.video, 0, 0);
    }

    this.previousFrame = this.currentFrame;
    this.currentFrame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    const frameData = {
      frame: this.currentFrame,
      previous: this.previousFrame,
      width: this.canvas.width,
      height: this.canvas.height,
      timestamp: performance.now(),
      frameNumber: this.frameCount
    };

    for (const [name, brain] of this.brains) {
      if (brain.enabled) {
        try {
          const result = brain.process(frameData, this.overlayCtx);
          if (result) {
            this.emit(`${name}:result`, result);
            if (result.detected) this.emit(`${name}:detected`, result);
          }
        } catch (err) {
          console.error(`Brain "${name}" error:`, err);
        }
      }
    }

    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFrameTime >= 1000) {
      this.actualFps = Math.round(this.frameCount * 1000 / (now - this.lastFrameTime));
      this.fpsEl.textContent = `${this.actualFps} fps`;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    requestAnimationFrame(() => this._frameLoop());
  },

  snapshot() {
    if (!this.currentFrame) return null;
    const dataUrl = this.canvas.toDataURL('image/png');
    this.emit('snapshot', { dataUrl, frame: this.currentFrame });
    return dataUrl;
  },

  addBrain(name, brain) {
    this.brains.set(name, brain);
    brain.name = name;
    brain.optigrab = this;

    if (brain.createUI && this.brainsEl) {
      const ui = brain.createUI();
      if (ui) {
        const wrapper = document.createElement('div');
        wrapper.className = 'og-brain-panel';
        wrapper.innerHTML = `<div class="og-brain-header">
          <label><input type="checkbox" ${brain.enabled ? 'checked' : ''}> ${name}</label>
        </div>`;
        wrapper.appendChild(ui);
        wrapper.querySelector('input').onchange = (e) => brain.enabled = e.target.checked;
        this.brainsEl.appendChild(wrapper);
      }
    }

    return this;
  },

  removeBrain(name) {
    this.brains.delete(name);
    return this;
  },

  getBrain(name) {
    return this.brains.get(name);
  },

  _updateButtons(running) {
    if (!this.container) return;
    this.container.querySelector('.og-start').disabled = running;
    this.container.querySelector('.og-stop').disabled = !running;
  },

  _injectStyles() {
    if (document.getElementById('optigrab-core-styles')) return;

    const style = document.createElement('style');
    style.id = 'optigrab-core-styles';
    style.textContent = `
      .optigrab-container {
        font-family: ui-monospace, monospace;
        background: #111;
        border: 1px solid #333;
        border-radius: 4px;
        padding: 8px;
      }
      .optigrab-viewport {
        position: relative;
        display: inline-block;
        background: #000;
        border: 1px solid #444;
      }
      .optigrab-video { display: block; max-width: 100%; }
      .optigrab-canvas, .optigrab-overlay {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        pointer-events: none;
      }
      .optigrab-canvas { opacity: 0; }
      .optigrab-overlay { z-index: 10; }
      .optigrab-status {
        position: absolute;
        top: 4px; right: 4px;
        padding: 2px 6px;
        background: #333;
        color: #888;
        font-size: 10px;
        border-radius: 2px;
        z-index: 20;
      }
      .optigrab-status.live {
        background: #0a5;
        color: #fff;
        animation: og-pulse 1.5s infinite;
      }
      @keyframes og-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      .optigrab-controls {
        margin-top: 6px;
        display: flex;
        gap: 4px;
        align-items: center;
      }
      .og-btn {
        padding: 4px 8px;
        background: #222;
        border: 1px solid #444;
        color: #ddd;
        cursor: pointer;
        font-family: inherit;
        font-size: 11px;
        border-radius: 2px;
      }
      .og-btn:hover:not(:disabled) { background: #333; }
      .og-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .og-btn.og-start { background: #1a4a1a; border-color: #2a6a2a; }
      .og-btn.og-stop { background: #4a1a1a; border-color: #6a2a2a; }
      .og-fps { font-size: 10px; color: #888; margin-left: auto; }
      .optigrab-brains {
        margin-top: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .og-brain-panel {
        background: #1a1a2a;
        border: 1px solid #333;
        border-radius: 3px;
        padding: 6px;
        min-width: 140px;
        font-size: 10px;
      }
      .og-brain-header {
        font-weight: bold;
        color: #8be9fd;
        margin-bottom: 6px;
      }
      .og-brain-control {
        display: flex;
        align-items: center;
        gap: 4px;
        margin: 3px 0;
        color: #aaa;
      }
      .og-brain-control input[type="range"] { flex: 1; max-width: 80px; }
      .og-brain-control input[type="number"] {
        width: 45px;
        background: #222;
        border: 1px solid #444;
        color: #ddd;
        padding: 1px 3px;
        font-size: 10px;
      }
    `;
    document.head.appendChild(style);
  }
};

if (typeof module !== 'undefined') module.exports = OptigrabCore;
