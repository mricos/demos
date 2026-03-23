/**
 * Optigrab Compositor - Layer management and blending
 */

const Compositor = {
  create(config = {}) {
    const comp = Object.create(Compositor);
    comp.config = {
      width: config.width || 640,
      height: config.height || 480,
      ...config
    };
    comp.layers = new Map();
    comp.container = null;
    comp.outputCanvas = null;
    comp.outputCtx = null;
    return comp;
  },

  mount(container) {
    const el = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!el) throw new Error('Compositor: container not found');

    el.innerHTML = `
      <div class="comp-viewport" style="position:relative; width:${this.config.width}px; height:${this.config.height}px; background:#111; overflow:hidden;">
        <canvas class="comp-output" width="${this.config.width}" height="${this.config.height}" style="position:absolute; top:0; left:0;"></canvas>
        <div class="comp-layers" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;"></div>
      </div>
    `;

    this.container = el;
    this.viewport = el.querySelector('.comp-viewport');
    this.layerContainer = el.querySelector('.comp-layers');
    this.outputCanvas = el.querySelector('.comp-output');
    this.outputCtx = this.outputCanvas.getContext('2d');

    return this;
  },

  addLayer(name, type = 'canvas') {
    const layer = {
      name,
      type,
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      element: null,
      ctx: null,
      zIndex: this.layers.size
    };

    if (type === 'canvas') {
      const canvas = document.createElement('canvas');
      canvas.width = this.config.width;
      canvas.height = this.config.height;
      canvas.className = `comp-layer comp-layer-${name}`;
      canvas.style.cssText = `position:absolute; top:0; left:0; pointer-events:none; z-index:${layer.zIndex};`;
      layer.element = canvas;
      layer.ctx = canvas.getContext('2d');
      this.layerContainer.appendChild(canvas);
    } else if (type === 'div') {
      const div = document.createElement('div');
      div.className = `comp-layer comp-layer-${name}`;
      div.style.cssText = `position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:${layer.zIndex};`;
      layer.element = div;
      this.layerContainer.appendChild(div);
    }

    this.layers.set(name, layer);
    return layer;
  },

  getLayer(name) {
    return this.layers.get(name);
  },

  setLayerOpacity(name, opacity) {
    const layer = this.layers.get(name);
    if (layer) {
      layer.opacity = opacity;
      layer.element.style.opacity = opacity;
    }
  },

  setLayerVisible(name, visible) {
    const layer = this.layers.get(name);
    if (layer) {
      layer.visible = visible;
      layer.element.style.display = visible ? 'block' : 'none';
    }
  },

  clearLayer(name) {
    const layer = this.layers.get(name);
    if (layer?.ctx) {
      layer.ctx.clearRect(0, 0, this.config.width, this.config.height);
    } else if (layer?.element) {
      layer.element.innerHTML = '';
    }
  },

  composite() {
    this.outputCtx.clearRect(0, 0, this.config.width, this.config.height);

    const sorted = [...this.layers.values()]
      .filter(l => l.visible && l.type === 'canvas')
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of sorted) {
      this.outputCtx.globalAlpha = layer.opacity;
      this.outputCtx.drawImage(layer.element, 0, 0);
    }
    this.outputCtx.globalAlpha = 1;
  },

  toDataURL() {
    this.composite();
    return this.outputCanvas.toDataURL('image/png');
  }
};

if (typeof module !== 'undefined') module.exports = Compositor;
