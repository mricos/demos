/**
 * Dunk - FIR Filter Module
 * Windowed-sinc filter design with ConvolverNode
 */

NS.FIR = {
  // Window functions
  windows: {
    /**
     * Hamming window
     * Good general-purpose window, moderate sidelobe suppression
     */
    hamming(n, N) {
      return 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1));
    },

    /**
     * Blackman window
     * Better sidelobe suppression, wider main lobe
     */
    blackman(n, N) {
      return 0.42 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)) +
             0.08 * Math.cos(4 * Math.PI * n / (N - 1));
    },

    /**
     * Kaiser window
     * Adjustable tradeoff between main lobe width and sidelobe level
     */
    kaiser(n, N, beta = 5) {
      const bessel = (x) => {
        let sum = 1;
        let term = 1;
        for (let k = 1; k < 25; k++) {
          term *= (x / 2) * (x / 2) / (k * k);
          sum += term;
        }
        return sum;
      };

      const alpha = (N - 1) / 2;
      const ratio = (n - alpha) / alpha;
      return bessel(beta * Math.sqrt(1 - ratio * ratio)) / bessel(beta);
    },

    /**
     * Rectangular window (no windowing)
     */
    rectangular(n, N) {
      return 1;
    },

    /**
     * Hann window
     */
    hann(n, N) {
      return 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));
    }
  },

  /**
   * Generate lowpass FIR coefficients using windowed-sinc method
   *
   * @param {number} cutoff - Cutoff frequency in Hz
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} taps - Number of filter taps (odd recommended)
   * @param {string} windowType - Window function name
   * @returns {Float32Array} - Filter coefficients
   */
  lowpass(cutoff, sampleRate, taps = 127, windowType = 'blackman') {
    const coeffs = new Float32Array(taps);
    const fc = cutoff / sampleRate; // Normalized cutoff frequency
    const windowFn = this.windows[windowType] || this.windows.blackman;
    const M = (taps - 1) / 2;

    let sum = 0;

    for (let n = 0; n < taps; n++) {
      const m = n - M;

      // Sinc function
      let sinc;
      if (m === 0) {
        sinc = 2 * Math.PI * fc;
      } else {
        sinc = Math.sin(2 * Math.PI * fc * m) / m;
      }

      // Apply window
      const window = windowFn(n, taps);
      coeffs[n] = sinc * window;
      sum += coeffs[n];
    }

    // Normalize for unity gain at DC
    for (let n = 0; n < taps; n++) {
      coeffs[n] /= sum;
    }

    return coeffs;
  },

  /**
   * Generate highpass FIR coefficients
   * Created by spectral inversion of lowpass
   */
  highpass(cutoff, sampleRate, taps = 127, windowType = 'blackman') {
    const lpf = this.lowpass(cutoff, sampleRate, taps, windowType);
    const coeffs = new Float32Array(taps);
    const M = (taps - 1) / 2;

    for (let n = 0; n < taps; n++) {
      if (n === M) {
        coeffs[n] = 1 - lpf[n];
      } else {
        coeffs[n] = -lpf[n];
      }
    }

    return coeffs;
  },

  /**
   * Generate bandpass FIR coefficients
   * Created by convolving lowpass with highpass
   */
  bandpass(lowCutoff, highCutoff, sampleRate, taps = 191, windowType = 'blackman') {
    const coeffs = new Float32Array(taps);
    const fcLow = lowCutoff / sampleRate;
    const fcHigh = highCutoff / sampleRate;
    const windowFn = this.windows[windowType] || this.windows.blackman;
    const M = (taps - 1) / 2;

    let sum = 0;

    for (let n = 0; n < taps; n++) {
      const m = n - M;

      let sinc;
      if (m === 0) {
        sinc = 2 * Math.PI * (fcHigh - fcLow);
      } else {
        sinc = (Math.sin(2 * Math.PI * fcHigh * m) - Math.sin(2 * Math.PI * fcLow * m)) / (Math.PI * m);
      }

      const window = windowFn(n, taps);
      coeffs[n] = sinc * window;
      sum += Math.abs(coeffs[n]);
    }

    // Normalize
    const centerFreq = (lowCutoff + highCutoff) / 2;
    let gainAtCenter = 0;
    for (let n = 0; n < taps; n++) {
      const phase = 2 * Math.PI * (centerFreq / sampleRate) * (n - M);
      gainAtCenter += coeffs[n] * Math.cos(phase);
    }

    if (gainAtCenter !== 0) {
      for (let n = 0; n < taps; n++) {
        coeffs[n] /= Math.abs(gainAtCenter);
      }
    }

    return coeffs;
  },

  /**
   * Built-in filter presets
   */
  presets: {
    '808-lpf': {
      name: '808 LPF',
      type: 'lowpass',
      cutoff: 200,
      taps: 127,
      window: 'blackman'
    },
    'sub-pass': {
      name: 'Sub Pass',
      type: 'lowpass',
      cutoff: 80,
      taps: 255,
      window: 'kaiser'
    },
    'dubstep-mid': {
      name: 'Dubstep Mid',
      type: 'bandpass',
      lowCutoff: 100,
      highCutoff: 800,
      taps: 191,
      window: 'blackman'
    }
  },

  /**
   * Create ConvolverNode from filter coefficients
   */
  createConvolver(ctx, coeffs) {
    const convolver = ctx.createConvolver();
    convolver.normalize = false;

    // Create impulse response buffer
    const buffer = ctx.createBuffer(1, coeffs.length, ctx.sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < coeffs.length; i++) {
      channelData[i] = coeffs[i];
    }

    convolver.buffer = buffer;
    return convolver;
  },

  /**
   * Create filter from preset
   */
  createFromPreset(ctx, presetId) {
    const preset = this.presets[presetId];
    if (!preset) {
      console.warn(`[Dunk] FIR preset "${presetId}" not found`);
      return null;
    }

    let coeffs;
    if (preset.type === 'lowpass') {
      coeffs = this.lowpass(preset.cutoff, ctx.sampleRate, preset.taps, preset.window);
    } else if (preset.type === 'highpass') {
      coeffs = this.highpass(preset.cutoff, ctx.sampleRate, preset.taps, preset.window);
    } else if (preset.type === 'bandpass') {
      coeffs = this.bandpass(preset.lowCutoff, preset.highCutoff, ctx.sampleRate, preset.taps, preset.window);
    }

    return this.createConvolver(ctx, coeffs);
  },

  /**
   * Create custom filter
   */
  create(ctx, options = {}) {
    const {
      type = 'lowpass',
      cutoff = 200,
      lowCutoff = 100,
      highCutoff = 800,
      taps = 127,
      window = 'blackman'
    } = options;

    let coeffs;
    if (type === 'lowpass') {
      coeffs = this.lowpass(cutoff, ctx.sampleRate, taps, window);
    } else if (type === 'highpass') {
      coeffs = this.highpass(cutoff, ctx.sampleRate, taps, window);
    } else if (type === 'bandpass') {
      coeffs = this.bandpass(lowCutoff, highCutoff, ctx.sampleRate, taps, window);
    }

    return {
      convolver: this.createConvolver(ctx, coeffs),
      coeffs: coeffs,
      options: { type, cutoff, lowCutoff, highCutoff, taps, window }
    };
  },

  /**
   * Calculate frequency response for visualization
   */
  getFrequencyResponse(coeffs, sampleRate, numPoints = 512) {
    const frequencies = new Float32Array(numPoints);
    const magnitudes = new Float32Array(numPoints);
    const phases = new Float32Array(numPoints);

    // Log scale from 20Hz to 20kHz
    for (let i = 0; i < numPoints; i++) {
      frequencies[i] = 20 * Math.pow(1000, i / (numPoints - 1));
    }

    for (let i = 0; i < numPoints; i++) {
      const f = frequencies[i];
      const omega = 2 * Math.PI * f / sampleRate;

      let real = 0;
      let imag = 0;

      for (let n = 0; n < coeffs.length; n++) {
        real += coeffs[n] * Math.cos(omega * n);
        imag -= coeffs[n] * Math.sin(omega * n);
      }

      magnitudes[i] = Math.sqrt(real * real + imag * imag);
      phases[i] = Math.atan2(imag, real);
    }

    return { frequencies, magnitudes, phases };
  },

  /**
   * Update filter cutoff in real-time
   * Creates a new convolver buffer (for smooth transitions, crossfade externally)
   */
  updateCutoff(ctx, convolver, cutoff, options = {}) {
    const {
      type = 'lowpass',
      taps = 127,
      window = 'blackman'
    } = options;

    const coeffs = type === 'lowpass'
      ? this.lowpass(cutoff, ctx.sampleRate, taps, window)
      : this.highpass(cutoff, ctx.sampleRate, taps, window);

    const buffer = ctx.createBuffer(1, coeffs.length, ctx.sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < coeffs.length; i++) {
      channelData[i] = coeffs[i];
    }

    convolver.buffer = buffer;
    return coeffs;
  }
};

console.log('[Dunk] FIR module loaded');
