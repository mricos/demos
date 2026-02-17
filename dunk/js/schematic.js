/**
 * Dunk - Schematic Module
 * Signal chain visualization with mixer manual aesthetic
 */

NS.Schematic = {
  canvas: null,
  ctx: null,
  animationId: null,
  running: false,

  // Layout
  padding: 20,
  moduleWidth: 60,
  moduleHeight: 40,
  connectionWidth: 30,

  // Colors
  colors: {
    bg: '#000000',
    module: '#1a1a1a',
    moduleBorder: '#333333',
    moduleActive: '#00aa00',
    text: '#888888',
    textActive: '#00ff00',
    wire: '#444444',
    wireSignal: '#00ff00',
    masterBg: '#0a0a0a'
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

    this.resize();
    window.addEventListener('resize', () => this.resize());

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
   * Resize canvas
   */
  resize() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();

    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;

    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    this.width = rect.width;
    this.height = rect.height;

    // Recalculate layout
    this._calculateLayout();
  },

  /**
   * Calculate module positions
   */
  _calculateLayout() {
    const { width, height, padding, moduleWidth, moduleHeight, connectionWidth } = this;

    // Voice section
    const voiceStartX = padding;
    const voiceY = padding + 20;
    const voiceSpacing = (moduleHeight + 15);

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
    const masterX = voiceStartX + (moduleWidth + connectionWidth) * 4 + 20;
    const masterY = voiceY + voiceSpacing;
    const masterWidth = width - masterX - padding;
    const masterHeight = voiceSpacing * 2;

    this.layout.masterBus = {
      x: masterX,
      y: masterY,
      w: masterWidth,
      h: masterHeight,
      modules: {
        lfo: { x: masterX + 15, y: masterY + 10, w: 50, h: 30 },
        comp: { x: masterX + 75, y: masterY + 10, w: 50, h: 30 },
        reverb: { x: masterX + 15, y: masterY + 50, w: 50, h: 30 },
        output: { x: masterX + 75, y: masterY + 50, w: 50, h: 30 }
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

    // Update signal flow animation
    this.signalFlowPhase = (this.signalFlowPhase + 0.05) % 1;

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
   * Draw a voice signal chain
   */
  _drawVoiceChain(voice, index) {
    const { ctx, colors, activeVoices } = this;
    const isActive = activeVoices[index];

    // Draw modules
    this._drawModule(voice.voice, `V${index}`, isActive, 'voice');
    this._drawModule(voice.fir, 'FIR', isActive, 'fir');
    this._drawModule(voice.dist, 'DIST', isActive, 'dist');
    this._drawModule(voice.out, 'OUT', isActive, 'out');

    // Draw connections
    this._drawConnection(voice.voice, voice.fir, isActive);
    this._drawConnection(voice.fir, voice.dist, isActive);
    this._drawConnection(voice.dist, voice.out, isActive);
  },

  /**
   * Draw a module box
   */
  _drawModule(pos, label, active, type) {
    const { ctx, colors } = this;
    const { x, y, w, h } = pos;

    // Background
    ctx.fillStyle = active ? colors.moduleActive : colors.module;
    ctx.fillRect(x, y, w, h);

    // Border
    ctx.strokeStyle = active ? colors.textActive : colors.moduleBorder;
    ctx.lineWidth = active ? 2 : 1;
    ctx.strokeRect(x, y, w, h);

    // Label
    ctx.fillStyle = active ? '#000' : colors.text;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);

    // Store for click detection
    this.activeModules[`${type}-${label}`] = { x, y, w, h, type, label };
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

    // Draw arrow
    const arrowSize = 6;
    const angle = Math.atan2(endY - startY, endX - startX);

    ctx.beginPath();
    ctx.moveTo(endX - 5, endY);
    ctx.lineTo(endX - 5 - arrowSize * Math.cos(angle - Math.PI / 6), endY - arrowSize * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(endX - 5 - arrowSize * Math.cos(angle + Math.PI / 6), endY - arrowSize * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = active ? colors.wireSignal : colors.wire;
    ctx.fill();

    // Signal flow dots (when active)
    if (active) {
      const dotX = startX + (endX - startX) * signalFlowPhase;
      const dotY = startY + (endY - startY) * signalFlowPhase;

      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
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
    ctx.fillStyle = colors.text;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MASTER BUS', master.x + master.w / 2, master.y - 5);

    // Draw master modules
    const mods = master.modules;
    this._drawModule(mods.lfo, 'LFO', false, 'master');
    this._drawModule(mods.comp, 'CMP', false, 'master');
    this._drawModule(mods.reverb, 'RVB', false, 'master');
    this._drawModule(mods.output, 'OUT', false, 'master');

    // Internal connections
    ctx.strokeStyle = colors.wire;
    ctx.lineWidth = 1;

    // LFO to COMP
    ctx.beginPath();
    ctx.moveTo(mods.lfo.x + mods.lfo.w, mods.lfo.y + mods.lfo.h / 2);
    ctx.lineTo(mods.comp.x, mods.comp.y + mods.comp.h / 2);
    ctx.stroke();

    // COMP to RVB (diagonal)
    ctx.beginPath();
    ctx.moveTo(mods.comp.x + mods.comp.w / 2, mods.comp.y + mods.comp.h);
    ctx.lineTo(mods.reverb.x + mods.reverb.w / 2, mods.reverb.y);
    ctx.stroke();

    // RVB to OUT
    ctx.beginPath();
    ctx.moveTo(mods.reverb.x + mods.reverb.w, mods.reverb.y + mods.reverb.h / 2);
    ctx.lineTo(mods.output.x, mods.output.y + mods.output.h / 2);
    ctx.stroke();
  },

  /**
   * Draw connections from voice outputs to master bus
   */
  _drawVoiceToMasterConnections() {
    const { ctx, colors, layout, activeVoices } = this;
    const master = layout.masterBus;

    // Summing point
    const sumX = master.x - 15;
    const sumY = master.y + master.h / 2;

    // Draw summing node
    ctx.beginPath();
    ctx.arc(sumX, sumY, 8, 0, Math.PI * 2);
    ctx.fillStyle = colors.module;
    ctx.fill();
    ctx.strokeStyle = colors.moduleBorder;
    ctx.stroke();

    // Sum symbol
    ctx.fillStyle = colors.text;
    ctx.font = '12px monospace';
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

      // Curve to summing point
      const midX = sumX - 10;
      ctx.bezierCurveTo(
        midX, startY,
        midX, sumY,
        sumX - 8, sumY
      );

      ctx.strokeStyle = activeVoices[i] ? colors.wireSignal : colors.wire;
      ctx.lineWidth = activeVoices[i] ? 2 : 1;
      ctx.stroke();
    });

    // Line from sum to master input
    ctx.beginPath();
    ctx.moveTo(sumX + 8, sumY);
    ctx.lineTo(master.x, sumY);
    ctx.strokeStyle = colors.wire;
    ctx.lineWidth = 1;
    ctx.stroke();
  },

  /**
   * Handle click on schematic
   */
  handleClick(x, y) {
    // Check if click is on a module
    for (const [key, mod] of Object.entries(this.activeModules)) {
      if (x >= mod.x && x <= mod.x + mod.w &&
          y >= mod.y && y <= mod.y + mod.h) {
        NS.Bus.emit('schematic:moduleClick', {
          type: mod.type,
          label: mod.label
        });
        return;
      }
    }
  }
};

console.log('[Dunk] Schematic module loaded');
