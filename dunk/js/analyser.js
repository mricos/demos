/**
 * Dunk - Analyser Module
 * Spectrum analyzer with tuner (HP Lab Equipment style)
 */

NS.Analyser = {
  canvas: null,
  ctx: null,
  analyser: null,
  animationId: null,
  running: false,

  // Feature toggles
  fftEnabled: true,
  tunerEnabled: true,

  // Display settings (HP Lab aesthetic)
  settings: {
    bgColor: '#1a1a10',
    gridColor: '#222218',
    gridColorMajor: '#2a2a20',
    lineColor: '#33ff33',
    lineColorDim: '#114411',
    textColor: '#888880',
    decayRate: 0.85,
    lineWidth: 1.5,
    peakHold: true,
    peakDecay: 0.998,
    logScale: true,
    minDb: -90,
    maxDb: -10
  },

  // State
  prevData: null,
  peakData: null,

  // Tuner state
  tuner: {
    frequency: 0,
    note: '--',
    octave: 0,
    cents: 0,
    confidence: 0
  },

  // Performance tracking
  perf: {
    lastTime: 0,
    frameCount: 0,
    fps: 0,
    updateInterval: 500
  },

  // Note names for tuner
  NOTE_NAMES: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],

  /**
   * Initialize the analyser visualization
   */
  init(canvasElement, analyserNode) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.analyser = analyserNode;

    // Configure analyser for better frequency resolution
    this.analyser.fftSize = 4096;
    this.analyser.smoothingTimeConstant = 0.7;

    this.resize();

    // Initialize data arrays
    const bufferLength = this.analyser.frequencyBinCount;
    this.prevData = new Float32Array(bufferLength).fill(-90);
    this.peakData = new Float32Array(bufferLength).fill(-90);

    window.addEventListener('resize', () => this.resize());

    console.log('[Dunk] Analyser initialized');
  },

  /**
   * Resize canvas to container
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
    this.perf.lastTime = performance.now();
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
   * Set FFT enabled state
   */
  setFFTEnabled(enabled) {
    this.fftEnabled = enabled;
    if (!enabled) {
      // Clear display
      this.ctx.fillStyle = this.settings.bgColor;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this._drawGrid();
    }
  },

  /**
   * Set tuner enabled state
   */
  setTunerEnabled(enabled) {
    this.tunerEnabled = enabled;
    const overlay = NS.DOM.$('#tuner-overlay');
    if (overlay) {
      overlay.style.display = enabled ? 'block' : 'none';
    }
  },

  /**
   * Main draw loop
   */
  _draw() {
    if (!this.running) return;

    this.animationId = requestAnimationFrame(() => this._draw());

    // Update performance metrics
    this._updatePerf();

    const { ctx, width, height, settings } = this;

    // Get frequency data
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatFrequencyData(dataArray);

    // Clear with decay (persistence effect)
    ctx.fillStyle = settings.bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    this._drawGrid();

    if (this.fftEnabled) {
      // Update peak hold
      if (settings.peakHold) {
        for (let i = 0; i < bufferLength; i++) {
          if (dataArray[i] > this.peakData[i]) {
            this.peakData[i] = dataArray[i];
          } else {
            this.peakData[i] = Math.max(
              settings.minDb,
              this.peakData[i] - (1 - settings.peakDecay) * 100
            );
          }
        }
      }

      // Draw spectrum with decay trail
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = settings.lineColorDim;
      ctx.lineWidth = settings.lineWidth;
      ctx.beginPath();
      this._drawSpectrum(this.prevData, bufferLength);
      ctx.stroke();
      ctx.restore();

      // Draw main spectrum
      ctx.strokeStyle = settings.lineColor;
      ctx.lineWidth = settings.lineWidth;
      ctx.beginPath();
      this._drawSpectrum(dataArray, bufferLength);
      ctx.stroke();

      // Draw peak hold
      if (settings.peakHold) {
        ctx.strokeStyle = '#225522';
        ctx.lineWidth = 1;
        ctx.beginPath();
        this._drawSpectrum(this.peakData, bufferLength);
        ctx.stroke();
      }

      // Store for decay trail
      this.prevData.set(dataArray);
    }

    // Draw labels
    this._drawLabels();

    // Update tuner if enabled
    if (this.tunerEnabled) {
      this._updateTuner(dataArray, bufferLength);
    }
  },

  /**
   * Update performance metrics
   */
  _updatePerf() {
    const now = performance.now();
    this.perf.frameCount++;

    if (now - this.perf.lastTime >= this.perf.updateInterval) {
      this.perf.fps = Math.round(this.perf.frameCount * 1000 / (now - this.perf.lastTime));
      this.perf.frameCount = 0;
      this.perf.lastTime = now;

      // Update display
      const fpsEl = NS.DOM.$('#perf-fps');
      if (fpsEl) {
        fpsEl.textContent = this.perf.fps;
        fpsEl.className = 'value' + (this.perf.fps < 30 ? ' warning' : this.perf.fps < 20 ? ' critical' : '');
      }
    }
  },

  /**
   * Draw grid lines (HP lab equipment style)
   */
  _drawGrid() {
    const { ctx, width, height, settings } = this;
    const sampleRate = NS.Audio.ctx?.sampleRate || 48000;

    ctx.strokeStyle = settings.gridColor;
    ctx.lineWidth = 0.5;

    // Vertical lines (frequency)
    const frequencies = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    frequencies.forEach(freq => {
      const x = this._freqToX(freq);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    });

    // Major frequency lines
    ctx.strokeStyle = settings.gridColorMajor;
    [100, 1000, 10000].forEach(freq => {
      const x = this._freqToX(freq);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    });

    // Horizontal lines (dB)
    ctx.strokeStyle = settings.gridColor;
    for (let db = -80; db <= 0; db += 10) {
      const y = this._dbToY(db);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  },

  /**
   * Convert frequency to X coordinate
   */
  _freqToX(freq) {
    const minLog = Math.log10(20);
    const maxLog = Math.log10(20000);
    const logFreq = Math.log10(Math.max(freq, 20));
    return ((logFreq - minLog) / (maxLog - minLog)) * this.width;
  },

  /**
   * Convert dB to Y coordinate
   */
  _dbToY(db) {
    const { settings, height } = this;
    const normalized = (db - settings.minDb) / (settings.maxDb - settings.minDb);
    return height - (Math.max(0, Math.min(1, normalized)) * height);
  },

  /**
   * Draw spectrum path
   */
  _drawSpectrum(data, length) {
    const { ctx, width, height, settings } = this;
    const sampleRate = NS.Audio.ctx?.sampleRate || 48000;
    const nyquist = sampleRate / 2;

    let started = false;

    for (let i = 0; i < length; i++) {
      const freq = (i / length) * nyquist;
      if (freq < 20) continue;

      const x = this._freqToX(freq);
      const y = this._dbToY(data[i]);

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  },

  /**
   * Draw frequency and dB labels
   */
  _drawLabels() {
    const { ctx, width, height, settings } = this;

    ctx.fillStyle = settings.textColor;
    ctx.font = '9px Consolas, monospace';
    ctx.textAlign = 'center';

    // Frequency labels
    const frequencies = [50, 100, 200, 500, '1k', '2k', '5k', '10k', '20k'];
    const freqValues = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

    frequencies.forEach((label, i) => {
      const x = this._freqToX(freqValues[i]);
      ctx.fillText(label.toString(), x, height - 3);
    });

    // dB labels
    ctx.textAlign = 'left';
    [-80, -60, -40, -20, 0].forEach(db => {
      const y = this._dbToY(db);
      if (y > 10 && y < height - 10) {
        ctx.fillText(db.toString(), 3, y + 3);
      }
    });
  },

  /**
   * Update tuner display
   */
  _updateTuner(data, length) {
    const sampleRate = NS.Audio.ctx?.sampleRate || 48000;
    const nyquist = sampleRate / 2;

    // Find dominant frequency using simple peak detection
    // Focus on bass frequencies (20-500Hz)
    let maxMag = -Infinity;
    let maxBin = 0;

    const minBin = Math.floor(20 / nyquist * length);
    const maxBinLimit = Math.floor(500 / nyquist * length);

    for (let i = minBin; i < maxBinLimit; i++) {
      if (data[i] > maxMag) {
        maxMag = data[i];
        maxBin = i;
      }
    }

    // Only update if signal is strong enough
    if (maxMag < -60) {
      this._displayTuner('--', 0, 0, 0);
      return;
    }

    // Parabolic interpolation for better frequency resolution
    const freq = this._interpolateFrequency(data, maxBin, length, nyquist);

    // Convert to note
    const { note, octave, cents } = this._freqToNote(freq);

    this._displayTuner(note, octave, freq, cents);
  },

  /**
   * Parabolic interpolation for sub-bin frequency accuracy
   */
  _interpolateFrequency(data, bin, length, nyquist) {
    if (bin <= 0 || bin >= length - 1) {
      return (bin / length) * nyquist;
    }

    const y1 = data[bin - 1];
    const y2 = data[bin];
    const y3 = data[bin + 1];

    // Parabolic interpolation
    const d = (y1 - y3) / (2 * (y1 - 2 * y2 + y3));
    const interpolatedBin = bin + d;

    return (interpolatedBin / length) * nyquist;
  },

  /**
   * Convert frequency to note name and cents deviation
   */
  _freqToNote(freq) {
    // A4 = 440Hz = MIDI note 69
    const midiNote = 12 * Math.log2(freq / 440) + 69;
    const roundedNote = Math.round(midiNote);
    const cents = Math.round((midiNote - roundedNote) * 100);

    const noteIndex = ((roundedNote % 12) + 12) % 12;
    const octave = Math.floor(roundedNote / 12) - 1;

    return {
      note: this.NOTE_NAMES[noteIndex],
      octave,
      cents
    };
  },

  /**
   * Update tuner display elements
   */
  _displayTuner(note, octave, freq, cents) {
    const noteEl = NS.DOM.$('#tuner-note');
    const freqEl = NS.DOM.$('#tuner-freq');
    const centsIndicator = NS.DOM.$('#tuner-cents-indicator');
    const centsValue = NS.DOM.$('#tuner-cents-value');

    if (noteEl) {
      noteEl.textContent = note === '--' ? '--' : `${note}${octave}`;
    }

    if (freqEl) {
      freqEl.textContent = freq > 0 ? `${freq.toFixed(1)} Hz` : '-- Hz';
    }

    if (centsIndicator) {
      // Map cents (-50 to +50) to position (0% to 100%)
      const position = 50 + (cents / 50) * 50;
      centsIndicator.style.left = `${Math.max(0, Math.min(100, position))}%`;

      // Color based on how in-tune
      centsIndicator.classList.remove('flat', 'sharp');
      if (Math.abs(cents) <= 5) {
        centsIndicator.style.background = '#33ff33';
      } else if (cents < 0) {
        centsIndicator.classList.add('flat');
      } else {
        centsIndicator.classList.add('sharp');
      }
    }

    if (centsValue) {
      if (note === '--') {
        centsValue.textContent = '-- ct';
      } else {
        const sign = cents > 0 ? '+' : '';
        centsValue.textContent = `${sign}${cents} ct`;
      }
    }
  },

  /**
   * Update settings
   */
  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
  }
};

console.log('[Dunk] Analyser module loaded');
