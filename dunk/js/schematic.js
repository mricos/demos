/**
 * Dunk - Schematic Module
 * Signal chain visualization with zoom/pan (HP Lab Equipment style)
 */

NS.Schematic = {
  canvas: null,
  ctx: null,
  viewport: null,
  animationId: null,
  running: false,

  // Zoom and pan
  zoom: 1.0,
  zoomMin: 0.5,
  zoomMax: 2.0,
  panX: 0,
  panY: 0,
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  panStart: { x: 0, y: 0 },

  // Layout (base dimensions at zoom 1.0)
  baseWidth: 700,
  baseHeight: 200,
  padding: 20,
  moduleWidth: 55,
  moduleHeight: 35,
  connectionWidth: 25,

  // Colors (HP Lab aesthetic)
  colors: {
    bg: '#1a1a10',
    module: '#2a2a28',
    moduleBorder: '#4a4a48',
    moduleBorderLight: '#5a5a58',
    moduleBorderDark: '#2a2a28',
    moduleActive: '#228822',
    text: '#888880',
    textActive: '#33ff33',
    wire: '#3a3a38',
    wireSignal: '#33ff33',
    masterBg: '#222220'
  },

  // State
  activeVoices: [false, false, false, false],
  activeModules: {},
  signalFlowPhase: 0,

  /**
   * Initialize schematic
   */
  init(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.viewport = canvasElement.parentElement;

    this._setupCanvas();
    this._setupEvents();

    // Listen for voice triggers
    NS.Bus.on('voice:triggered', ({ id }) => {
      this.activeVoices[id] = true;
      setTimeout(() => {
        this.activeVoices[id] = false;
      }, 200);
    });

    console.log('[Dunk] Schematic initialized');
  },

  /**
   * Setup canvas size based on zoom
   */
  _setupCanvas() {
    const width = this.baseWidth * this.zoom;
    const height = this.baseHeight * this.zoom;

    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(window.devicePixelRatio * this.zoom, window.devicePixelRatio * this.zoom);

    this.width = this.baseWidth;
    this.height = this.baseHeight;

    this._calculateLayout();
  },

  /**
   * Setup event handlers for zoom/pan
   */
  _setupEvents() {
    // Zoom buttons
    const zoomIn = NS.DOM.$('#zoom-in');
    const zoomOut = NS.DOM.$('#zoom-out');
    const zoomFit = NS.DOM.$('#zoom-fit');
    const zoomValue = NS.DOM.$('#zoom-value');

    if (zoomIn) {
      NS.DOM.on(zoomIn, 'click', () => this.setZoom(this.zoom + 0.25));
    }
    if (zoomOut) {
      NS.DOM.on(zoomOut, 'click', () => this.setZoom(this.zoom - 0.25));
    }
    if (zoomFit) {
      NS.DOM.on(zoomFit, 'click', () => this.fitToView());
    }

    // Mouse wheel zoom
    NS.DOM.on(this.viewport, 'wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      this.setZoom(this.zoom + delta);
    });

    // Pan with mouse drag
    NS.DOM.on(this.viewport, 'mousedown', (e) => {
      if (e.button === 0) {
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.panStart = { x: this.viewport.scrollLeft, y: this.viewport.scrollTop };
        this.viewport.style.cursor = 'grabbing';
      }
    });

    NS.DOM.on(document, 'mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        this.viewport.scrollLeft = this.panStart.x - dx;
        this.viewport.scrollTop = this.panStart.y - dy;
      }
    });

    NS.DOM.on(document, 'mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.viewport.style.cursor = 'grab';
      }
    });

    // Click on modules
    NS.DOM.on(this.canvas, 'click', (e) => {
      if (!this.isDragging) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoom;
        const y = (e.clientY - rect.top) / this.zoom;
        this.handleClick(x, y);
      }
    });
  },

  /**
   * Set zoom level
   */
  setZoom(level) {
    this.zoom = Math.max(this.zoomMin, Math.min(this.zoomMax, level));
    this._setupCanvas();

    const zoomValue = NS.DOM.$('#zoom-value');
    if (zoomValue) {
      zoomValue.textContent = Math.round(this.zoom * 100) + '%';
    }
  },

  /**
   * Fit schematic to viewport
   */
  fitToView() {
    const viewRect = this.viewport.getBoundingClientRect();
    const scaleX = (viewRect.width - 20) / this.baseWidth;
    const scaleY = (viewRect.height - 20) / this.baseHeight;
    this.setZoom(Math.min(scaleX, scaleY, 1.0));

    // Center in viewport
    this.viewport.scrollLeft = 0;
    this.viewport.scrollTop = 0;
  },

  /**
   * Calculate module positions
   */
  _calculateLayout() {
    const { width, height, padding, moduleWidth, moduleHeight, connectionWidth } = this;

    const voiceStartX = padding;
    const voiceY = padding + 15;
    const voiceSpacing = (moduleHeight + 10);

    this.layout = {
      voices: [],
      masterBus: null
    };

    // Calculate voice rows
    for (let i = 0; i < 4; i++) {
      const y = voiceY + i * voiceSpacing;
      this.layout.voices.push({
        voice: { x: voiceStartX, y, w: moduleWidth, h: moduleHeight },
        fir: { x: voiceStartX + moduleWidth + connectionWidth, y, w: moduleWidth, h: moduleHeight },
        dist: { x: voiceStartX + (moduleWidth + connectionWidth) * 2, y, w: moduleWidth, h: moduleHeight },
        out: { x: voiceStartX + (moduleWidth + connectionWidth) * 3, y, w: moduleWidth, h: moduleHeight }
      });
    }

    // Master bus section
    const masterX = voiceStartX + (moduleWidth + connectionWidth) * 4 + 15;
    const masterY = voiceY + voiceSpacing * 0.5;
    const masterWidth = width - masterX - padding;
    const masterHeight = voiceSpacing * 3;

    this.layout.masterBus = {
      x: masterX,
      y: masterY,
      w: masterWidth,
      h: masterHeight,
      modules: {
        lfo: { x: masterX + 10, y: masterY + 8, w: 40, h: 25 },
        comp: { x: masterX + 60, y: masterY + 8, w: 40, h: 25 },
        reverb: { x: masterX + 10, y: masterY + 40, w: 40, h: 25 },
        limiter: { x: masterX + 60, y: masterY + 40, w: 40, h: 25 },
        gate: { x: masterX + 10, y: masterY + 72, w: 40, h: 25 },
        output: { x: masterX + 60, y: masterY + 72, w: 40, h: 25 }
      }
    };
  },

  /**
   * Start animation
   */
  start() {
    if (this.running) return;
    this.running = true;
    this._draw();
  },

  /**
   * Stop animation
   */
  stop() {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  },

  /**
   * Main draw loop
   */
  _draw() {
    if (!this.running) return;

    this.animationId = requestAnimationFrame(() => this._draw());

    const { ctx, width, height, colors, layout } = this;

    // Clear
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    this._drawGrid();

    // Update signal flow animation
    this.signalFlowPhase = (this.signalFlowPhase + 0.03) % 1;

    // Draw voice chains
    layout.voices.forEach((voice, i) => {
      this._drawVoiceChain(voice, i);
    });

    // Draw master bus
    this._drawMasterBus();

    // Draw connections from voices to master
    this._drawVoiceToMasterConnections();
  },

  /**
   * Draw background grid
   */
  _drawGrid() {
    const { ctx, width, height, colors } = this;

    ctx.strokeStyle = '#222218';
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  },

  /**
   * Draw a voice signal chain
   */
  _drawVoiceChain(voice, index) {
    const { colors, activeVoices } = this;
    const isActive = activeVoices[index];

    this._drawModule(voice.voice, `V${index}`, isActive, 'voice', index);
    this._drawModule(voice.fir, 'FIR', isActive, 'fir', index);
    this._drawModule(voice.dist, 'DIST', isActive, 'dist', index);
    this._drawModule(voice.out, 'OUT', isActive, 'out', index);

    this._drawConnection(voice.voice, voice.fir, isActive);
    this._drawConnection(voice.fir, voice.dist, isActive);
    this._drawConnection(voice.dist, voice.out, isActive);
  },

  /**
   * Draw a module box (HP bezel style)
   */
  _drawModule(pos, label, active, type, index = 0) {
    const { ctx, colors } = this;
    const { x, y, w, h } = pos;

    // Background
    ctx.fillStyle = active ? colors.moduleActive : colors.module;
    ctx.fillRect(x, y, w, h);

    // 3D bezel effect
    ctx.strokeStyle = active ? colors.textActive : colors.moduleBorderLight;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();

    ctx.strokeStyle = colors.moduleBorderDark;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.stroke();

    // Label
    ctx.fillStyle = active ? '#000' : colors.text;
    ctx.font = '9px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);

    // Store for click detection
    this.activeModules[`${type}-${index}-${label}`] = { x, y, w, h, type, label, index };
  },

  /**
   * Draw connection wire between modules
   */
  _drawConnection(from, to, active) {
    const { ctx, colors, signalFlowPhase } = this;

    const startX = from.x + from.w;
    const startY = from.y + from.h / 2;
    const endX = to.x;
    const endY = to.y + to.h / 2;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);

    ctx.strokeStyle = active ? colors.wireSignal : colors.wire;
    ctx.lineWidth = active ? 2 : 1;
    ctx.stroke();

    // Arrow
    const arrowSize = 4;
    ctx.beginPath();
    ctx.moveTo(endX - 3, endY - arrowSize / 2);
    ctx.lineTo(endX - 3, endY + arrowSize / 2);
    ctx.lineTo(endX, endY);
    ctx.closePath();
    ctx.fillStyle = active ? colors.wireSignal : colors.wire;
    ctx.fill();

    // Signal flow dot
    if (active) {
      const dotX = startX + (endX - startX) * signalFlowPhase;
      const dotY = startY + (endY - startY) * signalFlowPhase;

      ctx.beginPath();
      ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
      ctx.fillStyle = colors.textActive;
      ctx.fill();
    }
  },

  /**
   * Draw master bus section
   */
  _drawMasterBus() {
    const { ctx, colors, layout } = this;
    const master = layout.masterBus;

    // Background
    ctx.fillStyle = colors.masterBg;
    ctx.fillRect(master.x, master.y, master.w, master.h);

    // Border
    ctx.strokeStyle = colors.moduleBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(master.x, master.y, master.w, master.h);

    // Title
    ctx.fillStyle = '#ffaa00';
    ctx.font = '8px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MASTER', master.x + master.w / 2, master.y - 4);

    // Draw master modules
    const mods = master.modules;
    this._drawModule(mods.lfo, 'LFO', false, 'master-lfo');
    this._drawModule(mods.comp, 'CMP', false, 'master-comp');
    this._drawModule(mods.reverb, 'RVB', false, 'master-reverb');
    this._drawModule(mods.limiter, 'LIM', false, 'master-limiter');
    this._drawModule(mods.gate, 'GATE', false, 'master-gate');
    this._drawModule(mods.output, 'OUT', false, 'master-out');

    // Internal connections
    ctx.strokeStyle = colors.wire;
    ctx.lineWidth = 1;

    // LFO to COMP
    this._drawSmallConnection(mods.lfo, mods.comp);
    // COMP to RVB (diagonal)
    this._drawSmallConnectionDiag(mods.comp, mods.reverb);
    // RVB to LIM
    this._drawSmallConnection(mods.reverb, mods.limiter);
    // LIM to GATE (diagonal)
    this._drawSmallConnectionDiag(mods.limiter, mods.gate);
    // GATE to OUT
    this._drawSmallConnection(mods.gate, mods.output);
  },

  /**
   * Draw small horizontal connection
   */
  _drawSmallConnection(from, to) {
    const { ctx, colors } = this;
    ctx.strokeStyle = colors.wire;
    ctx.beginPath();
    ctx.moveTo(from.x + from.w, from.y + from.h / 2);
    ctx.lineTo(to.x, to.y + to.h / 2);
    ctx.stroke();
  },

  /**
   * Draw small diagonal connection
   */
  _drawSmallConnectionDiag(from, to) {
    const { ctx, colors } = this;
    ctx.strokeStyle = colors.wire;
    ctx.beginPath();
    ctx.moveTo(from.x + from.w / 2, from.y + from.h);
    ctx.lineTo(to.x + to.w / 2, to.y);
    ctx.stroke();
  },

  /**
   * Draw connections from voice outputs to master bus
   */
  _drawVoiceToMasterConnections() {
    const { ctx, colors, layout, activeVoices } = this;
    const master = layout.masterBus;

    // Summing point
    const sumX = master.x - 12;
    const sumY = master.y + master.h / 2;

    // Draw summing node
    ctx.beginPath();
    ctx.arc(sumX, sumY, 6, 0, Math.PI * 2);
    ctx.fillStyle = colors.module;
    ctx.fill();
    ctx.strokeStyle = colors.moduleBorder;
    ctx.stroke();

    ctx.fillStyle = colors.text;
    ctx.font = '10px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', sumX, sumY);

    // Draw lines from each voice out to summing point
    layout.voices.forEach((voice, i) => {
      const out = voice.out;
      const startX = out.x + out.w;
      const startY = out.y + out.h / 2;

      ctx.beginPath();
      ctx.moveTo(startX, startY);

      const midX = sumX - 8;
      ctx.bezierCurveTo(midX, startY, midX, sumY, sumX - 6, sumY);

      ctx.strokeStyle = activeVoices[i] ? colors.wireSignal : colors.wire;
      ctx.lineWidth = activeVoices[i] ? 2 : 1;
      ctx.stroke();
    });

    // Line from sum to master input
    ctx.beginPath();
    ctx.moveTo(sumX + 6, sumY);
    ctx.lineTo(master.x, sumY);
    ctx.strokeStyle = colors.wire;
    ctx.lineWidth = 1;
    ctx.stroke();
  },

  /**
   * Handle click on schematic
   */
  handleClick(x, y) {
    for (const [key, mod] of Object.entries(this.activeModules)) {
      if (x >= mod.x && x <= mod.x + mod.w &&
          y >= mod.y && y <= mod.y + mod.h) {
        NS.Bus.emit('schematic:moduleClick', {
          type: mod.type,
          label: mod.label,
          index: mod.index
        });
        return;
      }
    }
  }
};

console.log('[Dunk] Schematic module loaded');
