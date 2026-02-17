/**
 * Dunk - Phase Meter Module
 * Lissajous display and stereo correlation meter
 */

NS.Phase = {
  canvas: null,
  ctx: null,
  splitter: null,
  analyserL: null,
  analyserR: null,
  animationId: null,
  running: false,
  enabled: true,

  // Display settings
  settings: {
    bgColor: '#1a1a10',
    gridColor: '#222218',
    traceColor: '#33ff33',
    traceColorDim: '#114411',
    centerColor: '#333328',
    decayRate: 0.92,
    dotSize: 1,
    trailLength: 512
  },

  // State
  bufferSize: 1024,
  trailBuffer: [],
  correlation: 0,

  /**
   * Initialize phase meter
   */
  init(canvasElement, audioSource, audioContext) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    // Create stereo splitter and analysers
    this.splitter = audioContext.createChannelSplitter(2);
    this.analyserL = audioContext.createAnalyser();
    this.analyserR = audioContext.createAnalyser();

    this.analyserL.fftSize = this.bufferSize * 2;
    this.analyserR.fftSize = this.bufferSize * 2;
    this.analyserL.smoothingTimeConstant = 0;
    this.analyserR.smoothingTimeConstant = 0;

    // Connect audio source to splitter
    audioSource.connect(this.splitter);
    this.splitter.connect(this.analyserL, 0);
    this.splitter.connect(this.analyserR, 1);

    // Initialize trail buffer
    this.trailBuffer = [];

    this.resize();
    window.addEventListener('resize', () => this.resize());

    console.log('[Dunk] Phase meter initialized');
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
  },

  /**
   * Start visualization
   */
  start() {
    if (this.running) return;
    this.running = true;
    this._draw();
  },

  /**
   * Stop visualization
   */
  stop() {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  },

  /**
   * Set enabled state
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      // Clear display
      this.ctx.fillStyle = this.settings.bgColor;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this._drawGrid();
    }
  },

  /**
   * Main draw loop
   */
  _draw() {
    if (!this.running) return;

    this.animationId = requestAnimationFrame(() => this._draw());

    if (!this.enabled) return;

    const { ctx, width, height, settings } = this;

    // Get time domain data for both channels
    const dataL = new Float32Array(this.bufferSize);
    const dataR = new Float32Array(this.bufferSize);

    this.analyserL.getFloatTimeDomainData(dataL);
    this.analyserR.getFloatTimeDomainData(dataR);

    // Clear with decay
    ctx.fillStyle = settings.bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    this._drawGrid();

    // Draw Lissajous figure
    this._drawLissajous(dataL, dataR);

    // Calculate and display correlation
    this._updateCorrelation(dataL, dataR);
  },

  /**
   * Draw grid (HP lab style)
   */
  _drawGrid() {
    const { ctx, width, height, settings } = this;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.strokeStyle = settings.gridColor;
    ctx.lineWidth = 0.5;

    // Draw crosshairs
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Draw diagonal guides (L+R and L-R axes)
    ctx.strokeStyle = settings.centerColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, height);
    ctx.moveTo(width, 0);
    ctx.lineTo(0, height);
    ctx.stroke();

    // Draw circle guides
    ctx.strokeStyle = settings.gridColor;
    const radii = [0.25, 0.5, 0.75, 1.0];
    const maxRadius = Math.min(width, height) / 2 * 0.9;

    radii.forEach(r => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius * r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Labels
    ctx.fillStyle = '#666660';
    ctx.font = '8px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('L', 8, centerY - 3);
    ctx.fillText('R', width - 8, centerY - 3);
    ctx.fillText('+', centerX, 10);
    ctx.fillText('-', centerX, height - 4);
  },

  /**
   * Draw Lissajous figure (X-Y oscilloscope mode)
   * L channel = X axis, R channel = Y axis
   * Rotated 45 degrees so mono appears vertical
   */
  _drawLissajous(dataL, dataR) {
    const { ctx, width, height, settings, trailBuffer } = this;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) / 2 * 0.85;

    // Add current frame to trail
    const framePoints = [];
    const step = Math.max(1, Math.floor(dataL.length / 256)); // Downsample for performance

    for (let i = 0; i < dataL.length; i += step) {
      const l = dataL[i];
      const r = dataR[i];

      // Rotate 45 degrees: M/S transform
      // Mid (mono) = (L + R) / sqrt(2)  -> vertical
      // Side = (L - R) / sqrt(2)         -> horizontal
      const mid = (l + r) * 0.707;
      const side = (l - r) * 0.707;

      const x = centerX + side * scale;
      const y = centerY - mid * scale;

      framePoints.push({ x, y });
    }

    // Add to trail buffer
    trailBuffer.push(framePoints);
    if (trailBuffer.length > settings.trailLength / step) {
      trailBuffer.shift();
    }

    // Draw trail (older = dimmer)
    trailBuffer.forEach((points, frameIndex) => {
      const alpha = (frameIndex / trailBuffer.length) * 0.5;
      ctx.fillStyle = `rgba(51, 255, 51, ${alpha})`;

      points.forEach(p => {
        ctx.fillRect(p.x - settings.dotSize / 2, p.y - settings.dotSize / 2,
                     settings.dotSize, settings.dotSize);
      });
    });

    // Draw current frame brighter
    ctx.fillStyle = settings.traceColor;
    framePoints.forEach(p => {
      ctx.fillRect(p.x - settings.dotSize, p.y - settings.dotSize,
                   settings.dotSize * 2, settings.dotSize * 2);
    });
  },

  /**
   * Calculate stereo correlation coefficient
   * +1 = mono (in phase)
   *  0 = uncorrelated
   * -1 = out of phase
   */
  _updateCorrelation(dataL, dataR) {
    let sumL = 0, sumR = 0, sumLR = 0;
    let sumL2 = 0, sumR2 = 0;

    for (let i = 0; i < dataL.length; i++) {
      sumL += dataL[i];
      sumR += dataR[i];
      sumLR += dataL[i] * dataR[i];
      sumL2 += dataL[i] * dataL[i];
      sumR2 += dataR[i] * dataR[i];
    }

    const n = dataL.length;
    const meanL = sumL / n;
    const meanR = sumR / n;

    let covLR = 0, varL = 0, varR = 0;

    for (let i = 0; i < dataL.length; i++) {
      const dL = dataL[i] - meanL;
      const dR = dataR[i] - meanR;
      covLR += dL * dR;
      varL += dL * dL;
      varR += dR * dR;
    }

    const stdL = Math.sqrt(varL / n);
    const stdR = Math.sqrt(varR / n);

    if (stdL > 0.0001 && stdR > 0.0001) {
      this.correlation = this.correlation * 0.9 + (covLR / (n * stdL * stdR)) * 0.1;
    } else {
      this.correlation = this.correlation * 0.95;
    }

    // Update display
    this._displayCorrelation();
  },

  /**
   * Update correlation display
   */
  _displayCorrelation() {
    const bar = NS.DOM.$('#phase-correlation-bar');
    const value = NS.DOM.$('#phase-value');

    if (bar) {
      // Map correlation (-1 to +1) to bar height (0 to 100%)
      // 0 is at center, positive goes up, negative goes down
      const height = Math.abs(this.correlation) * 50;
      bar.style.height = `${height}%`;

      if (this.correlation >= 0) {
        bar.style.bottom = '50%';
        bar.style.top = 'auto';
        bar.style.background = this.correlation > 0.8 ? '#33ff33' : '#ffaa00';
      } else {
        bar.style.top = '50%';
        bar.style.bottom = 'auto';
        bar.style.background = '#ff3333';
      }
    }

    if (value) {
      value.textContent = this.correlation.toFixed(2);
    }
  }
};

console.log('[Dunk] Phase module loaded');
