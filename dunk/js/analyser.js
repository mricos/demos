/**
 * Dunk - Analyser Module
 * Phosphor green spectrum analyzer with decay trails
 */

NS.Analyser = {
  canvas: null,
  ctx: null,
  analyser: null,
  animationId: null,
  running: false,

  // Display settings
  settings: {
    bgColor: '#000000',
    lineColor: '#00ff00',
    glowColor: 'rgba(0, 255, 0, 0.5)',
    decayRate: 0.92,     // How fast trails fade (0-1)
    glowBlur: 15,
    lineWidth: 2,
    peakHold: true,
    peakDecay: 0.995,
    logScale: true,      // Logarithmic frequency scale
    minDb: -90,
    maxDb: -10
  },

  // State
  prevData: null,
  peakData: null,

  /**
   * Initialize the analyser visualization
   */
  init(canvasElement, analyserNode) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.analyser = analyserNode;

    // Set canvas size
    this.resize();

    // Initialize data arrays
    const bufferLength = this.analyser.frequencyBinCount;
    this.prevData = new Float32Array(bufferLength).fill(-90);
    this.peakData = new Float32Array(bufferLength).fill(-90);

    // Handle resize
    window.addEventListener('resize', () => this.resize());

    console.log('[Dunk] Analyser initialized');
  },

  /**
   * Resize canvas to container
   */
  resize() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();

    // Set actual size
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;

    // Scale context
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Store display size
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
   * Main draw loop
   */
  _draw() {
    if (!this.running) return;

    this.animationId = requestAnimationFrame(() => this._draw());

    const { ctx, width, height, analyser, settings } = this;
    const bufferLength = analyser.frequencyBinCount;

    // Get frequency data in dB
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatFrequencyData(dataArray);

    // Apply decay to previous frame (phosphor persistence)
    ctx.fillStyle = `rgba(0, 0, 0, ${1 - settings.decayRate})`;
    ctx.fillRect(0, 0, width, height);

    // Update peak hold
    if (settings.peakHold) {
      for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > this.peakData[i]) {
          this.peakData[i] = dataArray[i];
        } else {
          this.peakData[i] *= settings.peakDecay;
          if (this.peakData[i] < settings.minDb) {
            this.peakData[i] = settings.minDb;
          }
        }
      }
    }

    // Draw spectrum
    ctx.save();

    // Glow effect
    ctx.shadowBlur = settings.glowBlur;
    ctx.shadowColor = settings.glowColor;
    ctx.strokeStyle = settings.lineColor;
    ctx.lineWidth = settings.lineWidth;

    // Draw main spectrum
    ctx.beginPath();
    this._drawSpectrum(dataArray, bufferLength);
    ctx.stroke();

    // Draw peak hold (dimmer)
    if (settings.peakHold) {
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      this._drawSpectrum(this.peakData, bufferLength);
      ctx.stroke();
    }

    ctx.restore();

    // Draw frequency labels
    this._drawLabels();

    // Store for next frame
    this.prevData.set(dataArray);
  },

  /**
   * Draw spectrum path
   */
  _drawSpectrum(data, length) {
    const { ctx, width, height, settings, analyser } = this;
    const sampleRate = NS.Audio.ctx?.sampleRate || 48000;
    const nyquist = sampleRate / 2;

    // Start path
    let started = false;

    for (let i = 0; i < length; i++) {
      // Get frequency for this bin
      const freq = (i / length) * nyquist;

      // Skip very low frequencies
      if (freq < 20) continue;

      // X position (log scale)
      let x;
      if (settings.logScale) {
        // Log scale from 20Hz to 20kHz
        const minLog = Math.log10(20);
        const maxLog = Math.log10(20000);
        const logFreq = Math.log10(Math.max(freq, 20));
        x = ((logFreq - minLog) / (maxLog - minLog)) * width;
      } else {
        x = (i / length) * width;
      }

      // Y position (dB to pixels)
      const db = data[i];
      const normalized = (db - settings.minDb) / (settings.maxDb - settings.minDb);
      const y = height - (Math.max(0, Math.min(1, normalized)) * height);

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  },

  /**
   * Draw frequency labels
   */
  _drawLabels() {
    const { ctx, width, height, settings } = this;

    ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    const frequencies = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

    frequencies.forEach(freq => {
      if (settings.logScale) {
        const minLog = Math.log10(20);
        const maxLog = Math.log10(20000);
        const logFreq = Math.log10(freq);
        const x = ((logFreq - minLog) / (maxLog - minLog)) * width;

        // Draw tick
        ctx.fillRect(x - 0.5, height - 15, 1, 5);

        // Draw label
        let label;
        if (freq >= 1000) {
          label = (freq / 1000) + 'k';
        } else {
          label = freq.toString();
        }
        ctx.fillText(label, x, height - 2);
      }
    });

    // Draw dB scale on left
    ctx.textAlign = 'left';
    const dbLevels = [-80, -60, -40, -20, 0];
    dbLevels.forEach(db => {
      const normalized = (db - settings.minDb) / (settings.maxDb - settings.minDb);
      const y = height - (normalized * height);

      if (y > 10 && y < height - 10) {
        ctx.fillText(db + ' dB', 5, y + 3);
      }
    });
  },

  /**
   * Draw a single trigger flash
   */
  flash() {
    const { ctx, width, height } = this;

    // Brief white flash
    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);
  },

  /**
   * Update settings
   */
  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
  }
};

console.log('[Dunk] Analyser module loaded');
