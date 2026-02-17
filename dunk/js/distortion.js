/**
 * Dunk - Distortion Module
 * Interchangeable distortion algorithms using strategy pattern
 */

NS.Distortion = {
  /**
   * Algorithm definitions
   * Each generates a waveshaper curve for WaveShaperNode
   */
  algorithms: {
    /**
     * Hyperbolic tangent soft clipping
     * Classic warm saturation
     */
    tanh: {
      name: 'Tanh (Soft)',
      generate(amount, samples = 8192) {
        const curve = new Float32Array(samples);
        const k = amount * 50; // Scale amount to useful range

        for (let i = 0; i < samples; i++) {
          const x = (i * 2 / samples) - 1;
          curve[i] = Math.tanh(k * x);
        }

        return curve;
      }
    },

    /**
     * Cubic soft clipping
     * Smooth overdrive with softer knee
     */
    cubic: {
      name: 'Cubic (Smooth)',
      generate(amount, samples = 8192) {
        const curve = new Float32Array(samples);
        const k = 1 + amount * 3;

        for (let i = 0; i < samples; i++) {
          const x = (i * 2 / samples) - 1;
          const scaled = x * k;

          if (scaled > 1) {
            curve[i] = 2/3;
          } else if (scaled < -1) {
            curve[i] = -2/3;
          } else {
            curve[i] = scaled - (scaled * scaled * scaled) / 3;
          }
        }

        // Normalize
        const max = Math.max(...curve.map(Math.abs));
        if (max > 0) {
          for (let i = 0; i < samples; i++) {
            curve[i] /= max;
          }
        }

        return curve;
      }
    },

    /**
     * Hard clipping
     * Harsh, aggressive distortion
     */
    hardclip: {
      name: 'Hard Clip',
      generate(amount, samples = 8192) {
        const curve = new Float32Array(samples);
        const threshold = 1 - (amount * 0.9); // Higher amount = lower threshold

        for (let i = 0; i < samples; i++) {
          const x = (i * 2 / samples) - 1;

          if (x > threshold) {
            curve[i] = threshold;
          } else if (x < -threshold) {
            curve[i] = -threshold;
          } else {
            curve[i] = x;
          }
        }

        // Normalize to full scale
        const max = Math.max(...curve.map(Math.abs));
        if (max > 0) {
          for (let i = 0; i < samples; i++) {
            curve[i] /= max;
          }
        }

        return curve;
      }
    },

    /**
     * Wavefold distortion
     * Complex harmonics through signal folding
     */
    foldback: {
      name: 'Foldback',
      generate(amount, samples = 8192) {
        const curve = new Float32Array(samples);
        const folds = 1 + amount * 4; // Number of folds

        for (let i = 0; i < samples; i++) {
          const x = (i * 2 / samples) - 1;
          let y = x * folds;

          // Fold the signal
          while (y > 1 || y < -1) {
            if (y > 1) {
              y = 2 - y;
            } else if (y < -1) {
              y = -2 - y;
            }
          }

          curve[i] = y;
        }

        return curve;
      }
    },

    /**
     * Bitcrusher-style quantization
     * Lo-fi digital distortion
     */
    bitcrush: {
      name: 'Bitcrush',
      generate(amount, samples = 8192) {
        const curve = new Float32Array(samples);
        const bits = Math.max(2, Math.round(16 - amount * 14)); // 16-bit down to 2-bit
        const levels = Math.pow(2, bits);

        for (let i = 0; i < samples; i++) {
          const x = (i * 2 / samples) - 1;
          // Quantize
          curve[i] = Math.round(x * levels) / levels;
        }

        return curve;
      }
    },

    /**
     * Variable hardness curve
     * Adjustable transition from soft to hard clipping
     */
    variable: {
      name: 'Variable',
      generate(amount, samples = 8192) {
        const curve = new Float32Array(samples);
        // amount controls curve shape: 0=linear, 0.5=sigmoid, 1=hard
        const hardness = amount * 10;

        for (let i = 0; i < samples; i++) {
          const x = (i * 2 / samples) - 1;

          if (hardness < 0.1) {
            // Linear (clean)
            curve[i] = x;
          } else {
            // Soft to hard clipping via power function
            const sign = x >= 0 ? 1 : -1;
            const abs = Math.abs(x);
            curve[i] = sign * (1 - Math.pow(1 - abs, 1 + hardness));
          }
        }

        return curve;
      }
    },

    /**
     * Asymmetric clipping
     * Even harmonics for tube-like character
     */
    asymmetric: {
      name: 'Asymmetric',
      generate(amount, samples = 8192) {
        const curve = new Float32Array(samples);
        const k = 1 + amount * 10;

        for (let i = 0; i < samples; i++) {
          const x = (i * 2 / samples) - 1;

          // Different curves for positive and negative
          if (x >= 0) {
            curve[i] = Math.tanh(k * x * 0.8);
          } else {
            curve[i] = Math.tanh(k * x * 1.2);
          }
        }

        // Normalize
        const max = Math.max(...curve.map(Math.abs));
        if (max > 0) {
          for (let i = 0; i < samples; i++) {
            curve[i] /= max;
          }
        }

        return curve;
      }
    }
  },

  /**
   * Create a WaveShaperNode with specified algorithm
   */
  create(ctx, algorithmName = 'tanh', amount = 0.5) {
    const shaper = ctx.createWaveShaper();
    shaper.oversample = '4x'; // Better quality at high distortion

    const algorithm = this.algorithms[algorithmName];
    if (!algorithm) {
      console.warn(`[Dunk] Distortion algorithm "${algorithmName}" not found, using tanh`);
      shaper.curve = this.algorithms.tanh.generate(amount);
    } else {
      shaper.curve = algorithm.generate(amount);
    }

    return shaper;
  },

  /**
   * Update distortion amount on existing shaper
   */
  setAmount(shaper, algorithmName, amount) {
    const algorithm = this.algorithms[algorithmName] || this.algorithms.tanh;
    shaper.curve = algorithm.generate(amount);
  },

  /**
   * Get list of available algorithms
   */
  list() {
    return Object.entries(this.algorithms).map(([id, algo]) => ({
      id,
      name: algo.name
    }));
  },

  /**
   * Create bypass-capable distortion unit
   * Includes dry/wet mix
   */
  createUnit(ctx, algorithmName = 'tanh', amount = 0.5, mix = 1.0) {
    const input = ctx.createGain();
    const output = ctx.createGain();
    const dry = ctx.createGain();
    const wet = ctx.createGain();
    const shaper = this.create(ctx, algorithmName, amount);

    // Routing
    input.connect(dry);
    input.connect(shaper);
    shaper.connect(wet);
    dry.connect(output);
    wet.connect(output);

    // Set mix levels
    dry.gain.value = 1 - mix;
    wet.gain.value = mix;

    return {
      input,
      output,
      shaper,
      dry,
      wet,
      setAmount: (amt) => this.setAmount(shaper, algorithmName, amt),
      setAlgorithm: (name, amt = amount) => {
        const algo = this.algorithms[name] || this.algorithms.tanh;
        shaper.curve = algo.generate(amt);
      },
      setMix: (m) => {
        dry.gain.value = 1 - m;
        wet.gain.value = m;
      }
    };
  }
};

console.log('[Dunk] Distortion module loaded');
