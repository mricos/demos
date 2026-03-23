/**
 * Optigrab Brains - Pluggable video analysis modules
 *
 * Each brain processes video frames and emits detection events.
 * Interface: { create(config), process(frameData, overlayCtx), createUI() }
 */

//============================================================================
// FLASH BRAIN - Detects sudden brightness changes
//============================================================================
const FlashBrain = {
  create(config = {}) {
    const brain = Object.create(FlashBrain);
    brain.config = {
      threshold: config.threshold || 20,
      cooldownMs: config.cooldownMs || 200,
      roi: config.roi || null,
      ...config
    };
    brain.enabled = config.enabled !== false;
    brain.lastDetection = 0;
    brain.baseline = null;
    brain.history = [];
    return brain;
  },

  process(frameData, overlayCtx) {
    const { frame, previous, width, height, timestamp } = frameData;
    if (!previous) return null;

    const roi = this.config.roi || { x: 0, y: 0, w: width, h: height };
    const current = this._regionBrightness(frame.data, width, roi);
    const prev = this._regionBrightness(previous.data, width, roi);
    const delta = current - prev;

    this.history.push({ t: timestamp, brightness: current, delta });
    if (this.history.length > 60) this.history.shift();

    if (this.config.roi) {
      overlayCtx.strokeStyle = '#0ff';
      overlayCtx.lineWidth = 2;
      overlayCtx.strokeRect(roi.x, roi.y, roi.w, roi.h);
    }

    this._drawIndicator(overlayCtx, width, height, current, delta);

    const detected = Math.abs(delta) > this.config.threshold &&
                     timestamp - this.lastDetection > this.config.cooldownMs;

    if (detected) {
      this.lastDetection = timestamp;
      overlayCtx.fillStyle = delta > 0 ? 'rgba(0,255,0,0.3)' : 'rgba(255,0,0,0.3)';
      overlayCtx.fillRect(0, 0, width, height);
    }

    return { detected, brightness: current, delta, direction: delta > 0 ? 'up' : 'down' };
  },

  _regionBrightness(data, width, roi) {
    let sum = 0, count = 0;
    for (let y = roi.y; y < roi.y + roi.h; y++) {
      for (let x = roi.x; x < roi.x + roi.w; x++) {
        const i = (y * width + x) * 4;
        sum += (data[i] + data[i+1] + data[i+2]) / 3;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  },

  _drawIndicator(ctx, w, h, brightness, delta) {
    const barH = 10, barY = h - barH - 4;
    ctx.fillStyle = '#222';
    ctx.fillRect(4, barY, 100, barH);
    const pct = brightness / 255;
    ctx.fillStyle = `hsl(${120 * pct}, 80%, 50%)`;
    ctx.fillRect(4, barY, pct * 100, barH);
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText(`B:${brightness.toFixed(0)} Δ:${delta > 0 ? '+' : ''}${delta.toFixed(1)}`, 110, barY + 8);
  },

  createUI() {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="og-brain-control">
        <span>Threshold:</span>
        <input type="range" min="5" max="100" value="${this.config.threshold}">
        <span class="og-val">${this.config.threshold}</span>
      </div>
      <div class="og-brain-control">
        <span>Cooldown:</span>
        <input type="number" min="50" max="2000" value="${this.config.cooldownMs}">
        <span>ms</span>
      </div>
    `;
    const range = div.querySelector('input[type="range"]');
    const valSpan = div.querySelector('.og-val');
    range.oninput = () => {
      this.config.threshold = parseInt(range.value);
      valSpan.textContent = range.value;
    };
    div.querySelector('input[type="number"]').onchange = (e) => {
      this.config.cooldownMs = parseInt(e.target.value);
    };
    return div;
  }
};

//============================================================================
// REGION BRAIN - Monitors specific regions for changes
//============================================================================
const RegionBrain = {
  create(config = {}) {
    const brain = Object.create(RegionBrain);
    brain.config = {
      regions: config.regions || [],
      threshold: config.threshold || 25,
      ...config
    };
    brain.enabled = config.enabled !== false;
    return brain;
  },

  addRegion(name, x, y, w, h, color = '#0ff') {
    this.config.regions.push({ name, x, y, w, h, color });
    return this;
  },

  process(frameData, overlayCtx) {
    const { frame, previous, width } = frameData;
    if (!previous) return null;

    const results = [];

    for (const region of this.config.regions) {
      const current = this._regionBrightness(frame.data, width, region);
      const prev = this._regionBrightness(previous.data, width, region);
      const delta = current - prev;
      const detected = Math.abs(delta) > this.config.threshold;

      overlayCtx.strokeStyle = detected ? '#0f0' : region.color;
      overlayCtx.lineWidth = detected ? 3 : 1;
      overlayCtx.strokeRect(region.x, region.y, region.w, region.h);

      overlayCtx.fillStyle = '#fff';
      overlayCtx.font = '10px monospace';
      overlayCtx.fillText(`${region.name}: ${current.toFixed(0)}`, region.x, region.y - 2);

      if (detected) {
        results.push({ region: region.name, brightness: current, delta, detected: true });
      }
    }

    return { detected: results.length > 0, regions: results };
  },

  _regionBrightness(data, width, roi) {
    let sum = 0, count = 0;
    for (let y = roi.y; y < roi.y + roi.h; y++) {
      for (let x = roi.x; x < roi.x + roi.w; x++) {
        const i = (y * width + x) * 4;
        sum += (data[i] + data[i+1] + data[i+2]) / 3;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  },

  createUI() {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="og-brain-control">
        <span>Threshold:</span>
        <input type="range" min="5" max="100" value="${this.config.threshold}">
        <span class="og-val">${this.config.threshold}</span>
      </div>
      <div class="og-brain-control">
        <span>Regions: ${this.config.regions.length}</span>
      </div>
    `;
    const range = div.querySelector('input[type="range"]');
    range.oninput = () => {
      this.config.threshold = parseInt(range.value);
      div.querySelector('.og-val').textContent = range.value;
    };
    return div;
  }
};

//============================================================================
// COLOR BRAIN - Tracks specific colors via HSV
//============================================================================
const ColorBrain = {
  create(config = {}) {
    const brain = Object.create(ColorBrain);
    brain.config = {
      colors: config.colors || [
        { name: 'red', h: [0, 20], s: [50, 100], v: [40, 100] },
        { name: 'green', h: [80, 160], s: [40, 100], v: [40, 100] },
        { name: 'blue', h: [200, 260], s: [40, 100], v: [40, 100] }
      ],
      minPixels: config.minPixels || 100,
      ...config
    };
    brain.enabled = config.enabled !== false;
    return brain;
  },

  process(frameData, overlayCtx) {
    const { frame, width, height } = frameData;
    const data = frame.data;

    const colorCounts = {};
    for (const c of this.config.colors) colorCounts[c.name] = 0;

    for (let i = 0; i < data.length; i += 16) {
      const hsv = this._rgbToHsv(data[i], data[i+1], data[i+2]);
      for (const c of this.config.colors) {
        if (this._matchColor(hsv, c)) colorCounts[c.name]++;
      }
    }

    const detected = [];
    for (const c of this.config.colors) {
      if (colorCounts[c.name] >= this.config.minPixels) {
        detected.push({ name: c.name, pixels: colorCounts[c.name] });
      }
    }

    let y = 20;
    for (const c of this.config.colors) {
      const pct = (colorCounts[c.name] / (data.length / 16)) * 100;
      overlayCtx.fillStyle = c.name;
      overlayCtx.fillRect(width - 80, y, pct * 0.7, 8);
      overlayCtx.fillStyle = '#fff';
      overlayCtx.font = '10px monospace';
      overlayCtx.fillText(`${c.name}: ${colorCounts[c.name]}`, width - 80, y - 2);
      y += 20;
    }

    return { detected: detected.length > 0, colors: detected, counts: colorCounts };
  },

  _rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h, s: s * 100, v: v * 100 };
  },

  _matchColor(hsv, color) {
    return hsv.h >= color.h[0] && hsv.h <= color.h[1] &&
           hsv.s >= color.s[0] && hsv.s <= color.s[1] &&
           hsv.v >= color.v[0] && hsv.v <= color.v[1];
  },

  createUI() {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="og-brain-control">
        <span>Min pixels:</span>
        <input type="number" min="10" max="1000" value="${this.config.minPixels}">
      </div>
      <div class="og-brain-control">
        <span>Tracking: ${this.config.colors.map(c => c.name).join(', ')}</span>
      </div>
    `;
    div.querySelector('input').onchange = (e) => {
      this.config.minPixels = parseInt(e.target.value);
    };
    return div;
  }
};

//============================================================================
// MOTION BRAIN - Detects motion via frame differencing
//============================================================================
const MotionBrain = {
  create(config = {}) {
    const brain = Object.create(MotionBrain);
    brain.config = {
      threshold: config.threshold || 30,
      minPixels: config.minPixels || 500,
      ...config
    };
    brain.enabled = config.enabled !== false;
    return brain;
  },

  process(frameData, overlayCtx) {
    const { frame, previous, width, height } = frameData;
    if (!previous) return null;

    const curr = frame.data, prev = previous.data;
    let motionPixels = 0, sumX = 0, sumY = 0;

    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        const diff = Math.abs(curr[i] - prev[i]) +
                     Math.abs(curr[i+1] - prev[i+1]) +
                     Math.abs(curr[i+2] - prev[i+2]);

        if (diff > this.config.threshold * 3) {
          motionPixels++;
          sumX += x;
          sumY += y;
        }
      }
    }

    const detected = motionPixels >= this.config.minPixels;

    if (detected) {
      const centerX = sumX / motionPixels;
      const centerY = sumY / motionPixels;

      overlayCtx.strokeStyle = '#f0f';
      overlayCtx.lineWidth = 2;
      overlayCtx.beginPath();
      overlayCtx.arc(centerX, centerY, 20, 0, Math.PI * 2);
      overlayCtx.stroke();

      overlayCtx.fillStyle = 'rgba(255,0,255,0.2)';
      overlayCtx.fillRect(0, 0, width, height);
    }

    const pct = Math.min(1, motionPixels / 2000);
    overlayCtx.fillStyle = '#333';
    overlayCtx.fillRect(width - 20, 0, 16, height);
    overlayCtx.fillStyle = `hsl(${280 - pct * 200}, 80%, 50%)`;
    overlayCtx.fillRect(width - 18, height - pct * height, 12, pct * height);

    return {
      detected,
      motionPixels,
      center: detected ? { x: sumX / motionPixels, y: sumY / motionPixels } : null
    };
  },

  createUI() {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="og-brain-control">
        <span>Threshold:</span>
        <input type="range" min="10" max="100" value="${this.config.threshold}">
        <span class="og-val">${this.config.threshold}</span>
      </div>
      <div class="og-brain-control">
        <span>Min pixels:</span>
        <input type="number" min="100" max="5000" value="${this.config.minPixels}">
      </div>
    `;
    const range = div.querySelector('input[type="range"]');
    range.oninput = () => {
      this.config.threshold = parseInt(range.value);
      div.querySelector('.og-val').textContent = range.value;
    };
    div.querySelector('input[type="number"]').onchange = (e) => {
      this.config.minPixels = parseInt(e.target.value);
    };
    return div;
  }
};

// Export
const Brains = { FlashBrain, RegionBrain, ColorBrain, MotionBrain };
if (typeof module !== 'undefined') module.exports = Brains;
