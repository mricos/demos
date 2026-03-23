/**
 * Optigrab Calibrator - LED position detection & virtual controller builder
 *
 * Depends on:
 *   - compositor.js (Compositor)
 *   - marker.js (DetectionMarker)
 */

const OptigrabCalibrator = {
  create(config = {}) {
    const cal = Object.create(OptigrabCalibrator);
    cal.config = {
      width: config.width || 640,
      height: config.height || 480,
      ...config
    };
    cal.compositor = null;
    cal.markers = new Map();
    cal.sourceImage = null;
    cal.selectedMarker = null;
    cal.mode = 'view';
    cal.stats = {
      markersTotal: 0,
      markersHigh: 0,
      markersMed: 0,
      markersLow: 0,
      avgConfidence: 0
    };
    cal.onMarkerSelect = null;
    cal.onStatsUpdate = null;
    return cal;
  },

  mount(container) {
    const el = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!el) throw new Error('Calibrator: container not found');

    el.innerHTML = `
      <div class="calibrator">
        <div class="cal-viewport"></div>
        <div class="cal-output-preview" style="display:none">
          <div class="cal-virtual-controller"></div>
        </div>
      </div>
    `;

    this.container = el;
    this._injectStyles();

    // Create compositor (uses global Compositor)
    if (typeof Compositor === 'undefined') {
      throw new Error('Compositor not loaded');
    }

    this.compositor = Compositor.create({
      width: this.config.width,
      height: this.config.height
    });
    this.compositor.mount(el.querySelector('.cal-viewport'));

    // Add layers
    this.compositor.addLayer('source', 'canvas');
    this.compositor.addLayer('detection', 'canvas');
    this.compositor.addLayer('guides', 'canvas');
    this.compositor.addLayer('markers', 'div');

    this._bindEvents();

    return this;
  },

  setSourceImage(imageSource) {
    const img = new Image();
    img.onload = () => {
      this.sourceImage = img;
      const layer = this.compositor.getLayer('source');
      layer.ctx.clearRect(0, 0, this.config.width, this.config.height);

      const scale = Math.min(
        this.config.width / img.width,
        this.config.height / img.height
      );
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (this.config.width - w) / 2;
      const y = (this.config.height - h) / 2;

      layer.ctx.drawImage(img, x, y, w, h);
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else if (imageSource instanceof Blob) {
      img.src = URL.createObjectURL(imageSource);
    }
  },

  addMarker(config) {
    if (typeof DetectionMarker === 'undefined') {
      throw new Error('DetectionMarker not loaded');
    }

    const marker = DetectionMarker.create(config);
    this.markers.set(marker.id, marker);
    this._renderMarkers();
    this._updateStats();
    return marker;
  },

  updateMarker(id, updates) {
    const marker = this.markers.get(id);
    if (marker) {
      Object.assign(marker, updates);
      this._renderMarkers();
      this._updateStats();
    }
  },

  removeMarker(id) {
    this.markers.delete(id);
    const el = document.getElementById(id);
    if (el) el.remove();
    this._renderMarkers();
    this._updateStats();
  },

  clearMarkers() {
    this.markers.clear();
    this.compositor.clearLayer('detection');
    this.compositor.clearLayer('markers');
    this._updateStats();
  },

  autoDetect(options = {}) {
    const threshold = options.threshold ?? 200;
    const minSize = options.minSize ?? 8;
    const maxSize = options.maxSize ?? 40;

    const sourceLayer = this.compositor.getLayer('source');
    const imageData = sourceLayer.ctx.getImageData(0, 0, this.config.width, this.config.height);
    const data = imageData.data;

    const visited = new Set();
    const blobs = [];

    const getPixel = (x, y) => {
      if (x < 0 || x >= this.config.width || y < 0 || y >= this.config.height) return 0;
      const i = (y * this.config.width + x) * 4;
      return (data[i] + data[i+1] + data[i+2]) / 3;
    };

    const floodFill = (startX, startY) => {
      const stack = [[startX, startY]];
      const pixels = [];
      let sumX = 0, sumY = 0;
      let minX = startX, maxX = startX, minY = startY, maxY = startY;
      let sumIntensity = 0;

      while (stack.length > 0) {
        const [x, y] = stack.pop();
        const key = `${x},${y}`;
        if (visited.has(key)) continue;

        const intensity = getPixel(x, y);
        if (intensity < threshold) continue;

        visited.add(key);
        pixels.push([x, y]);
        sumX += x;
        sumY += y;
        sumIntensity += intensity;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);

        stack.push([x+1, y], [x-1, y], [x, y+1], [x, y-1]);
      }

      return pixels.length > 0 ? {
        pixels,
        centerX: sumX / pixels.length,
        centerY: sumY / pixels.length,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        avgIntensity: sumIntensity / pixels.length
      } : null;
    };

    for (let y = 0; y < this.config.height; y += 2) {
      for (let x = 0; x < this.config.width; x += 2) {
        const key = `${x},${y}`;
        if (visited.has(key)) continue;

        const intensity = getPixel(x, y);
        if (intensity >= threshold) {
          const blob = floodFill(x, y);
          if (blob && blob.width >= minSize && blob.height >= minSize &&
              blob.width <= maxSize && blob.height <= maxSize) {
            blobs.push(blob);
          }
        }
      }
    }

    for (const blob of blobs) {
      const aspectRatio = blob.width / blob.height;
      const squareness = 1 - Math.abs(1 - aspectRatio);
      const size = blob.pixels.length;
      const expectedSize = blob.width * blob.height;
      const fillRatio = size / expectedSize;

      this.addMarker({
        x: blob.centerX,
        y: blob.centerY,
        width: blob.width,
        height: blob.height,
        certaintyX: Math.min(1, 0.5 + squareness * 0.3 + fillRatio * 0.2),
        certaintyY: Math.min(1, 0.5 + squareness * 0.3 + fillRatio * 0.2),
        confidence: Math.min(1, 0.3 + fillRatio * 0.4 + (blob.avgIntensity / 255) * 0.3),
        intensity: blob.avgIntensity / 255,
        color: [0, 255, 200]
      });
    }

    this._updateStats();
    return blobs.length;
  },

  generateController() {
    const output = this.container.querySelector('.cal-virtual-controller');
    const preview = this.container.querySelector('.cal-output-preview');
    preview.style.display = 'block';

    output.innerHTML = '';
    output.style.cssText = `
      position: relative;
      width: ${this.config.width}px;
      height: ${this.config.height}px;
      background: #222;
      border: 1px solid #444;
    `;

    const sorted = [...this.markers.values()]
      .filter(m => m.confidence > 0.5)
      .sort((a, b) => b.confidence - a.confidence);

    for (const marker of sorted) {
      const btn = document.createElement('div');
      btn.className = 'virtual-led';
      btn.style.cssText = `
        position: absolute;
        left: ${marker.x - marker.width/2}px;
        top: ${marker.y - marker.height/2}px;
        width: ${marker.width}px;
        height: ${marker.height}px;
        background: #333;
        border: 1px solid #555;
        border-radius: 2px;
        cursor: pointer;
      `;
      btn.dataset.note = marker.note ?? '';
      btn.title = marker.label || marker.note || marker.id;

      const led = document.createElement('div');
      led.className = 'virtual-led-light';
      led.style.cssText = `
        width: 100%; height: 100%;
        background: rgba(0,255,100,0.1);
        border-radius: 1px;
        transition: background 0.1s;
      `;
      btn.appendChild(led);
      output.appendChild(btn);
    }

    return sorted.length;
  },

  exportJSON() {
    const data = {
      version: 1,
      dimensions: { width: this.config.width, height: this.config.height },
      markers: [...this.markers.values()].map(m => ({
        id: m.id, x: m.x, y: m.y,
        width: m.width, height: m.height,
        label: m.label, note: m.note,
        confidence: m.confidence,
        certaintyX: m.certaintyX, certaintyY: m.certaintyY,
        intensity: m.intensity
      }))
    };

    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json);
    return data;
  },

  _renderMarkers() {
    const canvasLayer = this.compositor.getLayer('detection');
    canvasLayer.ctx.clearRect(0, 0, this.config.width, this.config.height);

    const divLayer = this.compositor.getLayer('markers');

    for (const marker of this.markers.values()) {
      marker.renderToCanvas(canvasLayer.ctx);
      marker.renderToDiv(divLayer.element);
    }
  },

  _updateStats() {
    const markers = [...this.markers.values()];
    this.stats.markersTotal = markers.length;
    this.stats.markersHigh = markers.filter(m => m.confidence > 0.7).length;
    this.stats.markersMed = markers.filter(m => m.confidence > 0.4 && m.confidence <= 0.7).length;
    this.stats.markersLow = markers.filter(m => m.confidence <= 0.4).length;
    this.stats.avgConfidence = markers.length > 0
      ? markers.reduce((sum, m) => sum + m.confidence, 0) / markers.length
      : 0;

    if (this.onStatsUpdate) this.onStatsUpdate(this.stats);
  },

  _bindEvents() {
    const cal = this;

    // Marker selection
    this.compositor.getLayer('markers').element.onclick = (e) => {
      const markerEl = e.target.closest('.detection-marker');
      if (markerEl) {
        cal.selectedMarker = cal.markers.get(markerEl.dataset.markerId);
        if (cal.onMarkerSelect) cal.onMarkerSelect(cal.selectedMarker);
      }
    };

    // PDF popup on hover
    let pdfPopup = null;
    const markersLayer = this.compositor.getLayer('markers').element;

    markersLayer.addEventListener('mouseenter', (e) => {
      const markerEl = e.target.closest('.detection-marker');
      if (markerEl && markerEl._marker) {
        if (pdfPopup) pdfPopup.remove();
        pdfPopup = markerEl._marker.createPDFPopup();
        document.body.appendChild(pdfPopup);

        const rect = markerEl.getBoundingClientRect();
        pdfPopup.style.left = `${rect.right + 10}px`;
        pdfPopup.style.top = `${rect.top}px`;

        const popupRect = pdfPopup.getBoundingClientRect();
        if (popupRect.right > window.innerWidth) {
          pdfPopup.style.left = `${rect.left - popupRect.width - 10}px`;
        }
        if (popupRect.bottom > window.innerHeight) {
          pdfPopup.style.top = `${window.innerHeight - popupRect.height - 10}px`;
        }
      }
    }, true);

    markersLayer.addEventListener('mouseleave', (e) => {
      if (e.target.closest('.detection-marker') && pdfPopup) {
        pdfPopup.remove();
        pdfPopup = null;
      }
    }, true);

    // Click to add marker in edit mode
    this.compositor.getLayer('source').element.onclick = (e) => {
      if (cal.mode !== 'edit') return;
      const rect = e.target.getBoundingClientRect();
      cal.addMarker({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        width: 16, height: 16,
        confidence: 0.5, certaintyX: 0.5, certaintyY: 0.5, intensity: 0.5
      });
    };
  },

  _injectStyles() {
    if (document.getElementById('calibrator-styles')) return;

    const style = document.createElement('style');
    style.id = 'calibrator-styles';
    style.textContent = `
      .calibrator {
        font-family: ui-monospace, monospace;
        background: #111;
      }
      .cal-viewport { background: #0a0a0a; }
      .cal-output-preview { margin-top: 8px; }
      .cal-virtual-controller { background: #111; border: 1px solid #333; }
      .virtual-led:hover { border-color: #0ff !important; }
      .virtual-led-light.on {
        background: rgba(0,255,100,0.8) !important;
        box-shadow: 0 0 8px rgba(0,255,100,0.4);
      }
      .detection-marker:hover {
        border-color: #fff !important;
        border-width: 2px !important;
      }

      /* PDF Popup */
      .marker-pdf-popup {
        position: fixed;
        z-index: 10000;
        background: #1a1a1a;
        border: 1px solid #444;
        border-radius: 4px;
        padding: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        font-family: ui-monospace, monospace;
        font-size: 10px;
      }
      .pdf-header {
        font-size: 10px;
        font-weight: bold;
        color: #8be9fd;
        margin-bottom: 6px;
        padding-bottom: 4px;
        border-bottom: 1px solid #333;
      }
      .pdf-2d-container { margin-bottom: 8px; }
      .pdf-2d { display: block; border: 1px solid #333; border-radius: 2px; }
      .pdf-1d-container { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
      .pdf-1d-row { display: flex; align-items: center; gap: 4px; }
      .pdf-1d-label { font-size: 9px; color: #666; width: 20px; }
      .pdf-1d-x, .pdf-1d-y { border: 1px solid #333; border-radius: 2px; }
      .pdf-stats { font-size: 9px; color: #888; }
      .pdf-stat-row { display: flex; gap: 6px; margin: 2px 0; }
      .pdf-stat-row span:nth-child(odd) { color: #555; }
      .pdf-stat-row span:nth-child(even) { color: #ccc; }
    `;
    document.head.appendChild(style);
  }
};

if (typeof module !== 'undefined') module.exports = OptigrabCalibrator;
