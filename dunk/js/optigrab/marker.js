/**
 * Optigrab Marker - Detection marker with probability visualization
 *
 * Visualizes position uncertainty through:
 *   - Ellipse axes = X/Y certainty ratio
 *   - Border blur = overall certainty
 *   - Border thickness = detection confidence
 *   - Fill intensity = signal strength
 *   - Gradient falloff = probability density
 */

const DetectionMarker = {
  create(config = {}) {
    const marker = Object.create(DetectionMarker);
    marker.id = config.id || `marker-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    marker.x = config.x || 0;
    marker.y = config.y || 0;
    marker.width = config.width || 20;
    marker.height = config.height || 20;

    // Certainty metrics (0-1)
    marker.certaintyX = config.certaintyX ?? 0.5;
    marker.certaintyY = config.certaintyY ?? 0.5;
    marker.confidence = config.confidence ?? 0.5;
    marker.intensity = config.intensity ?? 0.5;

    // Metadata
    marker.label = config.label || '';
    marker.note = config.note ?? null;
    marker.color = config.color || [0, 255, 255];

    return marker;
  },

  // Certainty to color: red (0) -> yellow (0.5) -> green (1)
  _certaintyColor(certainty, alpha = 1) {
    const r = Math.round(255 * (1 - certainty));
    const g = Math.round(255 * certainty);
    return `rgba(${r},${g},50,${alpha})`;
  },

  // Render to canvas - soft probability field
  renderToCanvas(ctx) {
    const { x, y, width, height, certaintyX, certaintyY, confidence, intensity } = this;

    ctx.save();
    ctx.translate(x, y);

    const avgCertainty = (certaintyX + certaintyY) / 2;
    const baseRadius = Math.max(width, height) / 2;
    const spreadX = baseRadius * (1.5 + (1 - certaintyX) * 2);
    const spreadY = baseRadius * (1.5 + (1 - certaintyY) * 2);
    const maxSpread = Math.max(spreadX, spreadY);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, maxSpread);
    const coreAlpha = 0.15 + intensity * 0.15;

    gradient.addColorStop(0, this._certaintyColor(avgCertainty, coreAlpha));
    gradient.addColorStop(0.3, this._certaintyColor(avgCertainty, coreAlpha * 0.6));
    gradient.addColorStop(0.6, this._certaintyColor(avgCertainty, coreAlpha * 0.2));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    const blur = Math.max(2, (1 - avgCertainty) * 8);
    ctx.filter = `blur(${blur}px)`;

    ctx.beginPath();
    ctx.ellipse(0, 0, spreadX, spreadY, 0, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();
  },

  // Render as DIV - thin stroke morphing from circle to rectangle
  renderToDiv(container) {
    let el = document.getElementById(this.id);
    if (!el) {
      el = document.createElement('div');
      el.id = this.id;
      el.className = 'detection-marker';
      container.appendChild(el);
    }

    const avgCertainty = (this.certaintyX + this.certaintyY) / 2;
    const pad = 2;
    const displayW = this.width + pad * 2;
    const displayH = this.height + pad * 2;

    const maxRadius = Math.min(displayW, displayH) / 2;
    const minRadius = 3;
    const radius = maxRadius - (maxRadius - minRadius) * this.confidence;

    const color = this._certaintyColor(avgCertainty, 0.7 + this.confidence * 0.3);

    el.style.cssText = `
      position: absolute;
      left: ${this.x - displayW/2}px;
      top: ${this.y - displayH/2}px;
      width: ${displayW}px;
      height: ${displayH}px;
      border-radius: ${radius}px;
      background: transparent;
      border: 1px solid ${color};
      pointer-events: auto;
      cursor: pointer;
      transition: all 0.1s ease;
    `;

    el.dataset.markerId = this.id;
    el.dataset.note = this.note ?? '';
    el._marker = this;

    return el;
  },

  // Generate PDF hover popup
  createPDFPopup() {
    const popup = document.createElement('div');
    popup.className = 'marker-pdf-popup';

    const canvasSize = 120;
    const graphHeight = 40;

    popup.innerHTML = `
      <div class="pdf-header">${this.label || this.id}</div>
      <div class="pdf-2d-container">
        <canvas class="pdf-2d" width="${canvasSize}" height="${canvasSize}"></canvas>
      </div>
      <div class="pdf-1d-container">
        <div class="pdf-1d-row">
          <span class="pdf-1d-label">P(x)</span>
          <canvas class="pdf-1d-x" width="100" height="${graphHeight}"></canvas>
        </div>
        <div class="pdf-1d-row">
          <span class="pdf-1d-label">P(y)</span>
          <canvas class="pdf-1d-y" width="100" height="${graphHeight}"></canvas>
        </div>
      </div>
      <div class="pdf-stats">
        <div class="pdf-stat-row">
          <span>σx:</span><span>${((1 - this.certaintyX) * 20).toFixed(1)}px</span>
          <span>σy:</span><span>${((1 - this.certaintyY) * 20).toFixed(1)}px</span>
        </div>
        <div class="pdf-stat-row">
          <span>Conf:</span><span>${(this.confidence * 100).toFixed(0)}%</span>
          <span>Int:</span><span>${(this.intensity * 100).toFixed(0)}%</span>
        </div>
      </div>
    `;

    const canvas2d = popup.querySelector('.pdf-2d');
    this._draw2DPDF(canvas2d.getContext('2d'), canvasSize);

    const canvasX = popup.querySelector('.pdf-1d-x');
    const canvasY = popup.querySelector('.pdf-1d-y');
    this._draw1DPDF(canvasX.getContext('2d'), 100, graphHeight, this.certaintyX);
    this._draw1DPDF(canvasY.getContext('2d'), 100, graphHeight, this.certaintyY);

    return popup;
  },

  _draw2DPDF(ctx, size) {
    const cx = size / 2;
    const cy = size / 2;

    const sigmaX = (1 - this.certaintyX) * size * 0.4 + size * 0.05;
    const sigmaY = (1 - this.certaintyY) * size * 0.4 + size * 0.05;

    const [r, g, b] = this.color;
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - cx) / sigmaX;
        const dy = (y - cy) / sigmaY;
        const p = Math.exp(-0.5 * (dx * dx + dy * dy));

        const i = (y * size + x) * 4;
        data[i] = r * p;
        data[i + 1] = g * p;
        data[i + 2] = b * p;
        data[i + 3] = p * 200 * this.confidence;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Crosshairs
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, size);
    ctx.moveTo(0, cy); ctx.lineTo(size, cy);
    ctx.stroke();

    // 1-sigma ellipse
    ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, sigmaX, sigmaY, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2-sigma ellipse
    ctx.strokeStyle = `rgba(${r},${g},${b},0.4)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, sigmaX * 2, sigmaY * 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  },

  _draw1DPDF(ctx, w, h, certainty) {
    const sigma = (1 - certainty) * w * 0.3 + w * 0.05;
    const mean = w / 2;
    const [r, g, b] = this.color;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, h);

    ctx.beginPath();
    ctx.moveTo(0, h);

    for (let x = 0; x < w; x++) {
      const dx = (x - mean) / sigma;
      const p = Math.exp(-0.5 * dx * dx);
      const y = h - p * (h - 4);
      ctx.lineTo(x, y);
    }

    ctx.lineTo(w, h);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, `rgba(${r},${g},${b},0.8)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0.1)`);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = `rgba(${r},${g},${b},1)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const dx = (x - mean) / sigma;
      const p = Math.exp(-0.5 * dx * dx);
      ctx.lineTo(x, h - p * (h - 4));
    }
    ctx.stroke();

    // Mean line
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(mean, 0); ctx.lineTo(mean, h);
    ctx.stroke();

    // Sigma markers
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(mean - sigma, 0, 1, h);
    ctx.fillRect(mean + sigma, 0, 1, h);
  }
};

if (typeof module !== 'undefined') module.exports = DetectionMarker;
