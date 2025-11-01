/**
 * LIFNeuronFigure.js
 *
 * Leaky Integrate-and-Fire neuron ActiveFigure implementation.
 * Extends ActiveFigure base class, composes LIFModel + NeuronRenderer.
 *
 * This is a specific implementation of the ActiveFigure primitive
 * for visualizing LIF neuron dynamics.
 */

import { ActiveFigure } from '../core/ActiveFigure.js?v=7';
import { LIFModel } from '../core/LIFModel.js?v=7';
import { NeuronRenderer } from '../NeuronRenderer.js?v=7';

export class LIFNeuronFigure extends ActiveFigure {
  constructor(config = {}) {
    super(config);

    // Configure which views to show (modular layout!)
    this.views = {
      biological: config.views?.biological ?? true,
      diagram: config.views?.diagram ?? false,
      trace: config.views?.trace ?? false,     // Use combined instead
      spikes: config.views?.spikes ?? false,   // Use combined instead
      combined: config.views?.combined ?? true, // Combined trace + spikes
      ttfs: config.views?.ttfs ?? false
    };

    // Initialize physics model
    this.model = new LIFModel({
      threshold: config.threshold ?? 1.0,
      tau: config.tau ?? 20,
      input: config.input ?? 0.04,
      ...config.modelConfig
    });

    // Initialize renderer
    this.renderer = new NeuronRenderer({
      theme: config.theme,
      ...config.rendererConfig
    });

    // TTFS encoding state (optional feature)
    this.ttfsEnabled = config.ttfs?.enabled ?? false;
    this.ttfsState = {
      encodingWindowDuration: config.ttfs?.windowDuration ?? 100,  // ms
      ttfsThreshold: config.ttfs?.threshold ?? 50,                 // ms - early spike threshold
      encodingWindowStart: 0,
      detectedBit: null
    };

    // Calculate layout
    this._recalculateLayout();
  }

  /**
   * Update simulation state (implements ActiveFigure.update)
   * @param {number} dt - Time delta in milliseconds
   */
  update(dt) {
    // Step physics simulation
    const spiked = this.model.step(dt);

    // Emit spike event
    if (spiked) {
      this.emit('spike', {
        time: this.model.time,
        voltage: this.model.threshold
      });
    }

    // Update TTFS detector if enabled
    if (this.ttfsEnabled) {
      this._updateTTFS();
    }

    // Update renderer animations
    this.renderer.updateAnimations(dt);

    // Emit state change
    this.emit('statechange', this.getState());
  }

  /**
   * Render current frame (implements ActiveFigure.render)
   */
  render() {
    const { ctx } = this;

    // Clear canvas
    ctx.fillStyle = this.renderer.colors.background;
    ctx.fillRect(0, 0, this.width, this.height);

    // Get model state
    const modelState = this.model.getState();

    // Render each enabled view
    if (this.views.biological) {
      this.renderer.renderBiologicalNeuron(ctx, modelState, this.layout.biological);
    }

    if (this.views.diagram) {
      this.renderer.renderLIFDiagram(ctx, modelState, this.layout.diagram);
    }

    if (this.views.trace) {
      this.renderer.renderMembraneTrace(ctx, modelState, this.layout.trace);
    }

    if (this.views.spikes) {
      this.renderer.renderSpikeTrain(ctx, modelState, this.layout.spikes);
    }

    if (this.views.combined) {
      this.renderer.renderCombinedTrace(ctx, modelState, this.layout.combined);
    }

    if (this.views.ttfs && this.ttfsEnabled) {
      this.renderer.renderTTFSDetector(ctx, modelState, this.ttfsState, this.layout.ttfs);
    }
  }

  /**
   * Get complete state (overrides ActiveFigure.getState)
   * @returns {object}
   */
  getState() {
    return {
      ...super.getState(),
      model: this.model.getState(),
      ttfs: this.ttfsEnabled ? { ...this.ttfsState } : null,
      views: { ...this.views }
    };
  }

  // ============================================================================
  // Domain-specific API
  // ============================================================================

  /**
   * Change input current to the neuron
   * @param {number} current
   */
  setInput(current) {
    this.model.setInput(current);
    this.emit('inputchange', { input: current });
  }

  /**
   * Get current input current
   * @returns {number}
   */
  getInput() {
    return this.model.input;
  }

  /**
   * Show a specific view
   * @param {string} name - 'biological', 'diagram', 'trace', 'spikes', 'ttfs'
   */
  showView(name) {
    if (this.views.hasOwnProperty(name)) {
      this.views[name] = true;
      this._recalculateLayout();
    }
  }

  /**
   * Hide a specific view
   * @param {string} name
   */
  hideView(name) {
    if (this.views.hasOwnProperty(name)) {
      this.views[name] = false;
      this._recalculateLayout();
    }
  }

  /**
   * Get model state
   * @returns {object}
   */
  getModelState() {
    return this.model.getState();
  }

  /**
   * Set encoding preset for TTFS binary encoding
   * @param {number} bit - 0, 0.5, or 1
   */
  encodeBit(bit) {
    // Presets for TTFS encoding
    const presets = {
      0: { input: 0.03, speed: 0.5 },   // Subthreshold or late spike
      0.5: { input: 0.045, speed: 0.7 }, // Borderline
      1: { input: 0.08, speed: 1.0 }    // Early spike
    };

    const preset = presets[bit];
    if (preset) {
      this.setInput(preset.input);
      this.setSpeed(preset.speed);
      this.resetTTFS();
      this.emit('encodingchange', { bit, ...preset });
    }
  }

  /**
   * Reset TTFS encoding window
   */
  resetTTFS() {
    if (this.ttfsEnabled) {
      this.ttfsState.encodingWindowStart = this.model.time;
      this.ttfsState.detectedBit = null;
      this.emit('ttfsreset', { time: this.model.time });
    }
  }

  /**
   * Get TTFS detector state
   * @returns {object}
   */
  getTTFSState() {
    return this.ttfsEnabled ? { ...this.ttfsState } : null;
  }

  /**
   * Reset model to initial state
   */
  reset() {
    this.model.reset();
    if (this.ttfsEnabled) {
      this.resetTTFS();
    }
    this.time = 0;
    this.emit('reset');
  }

  // ============================================================================
  // Internal methods
  // ============================================================================

  /**
   * Calculate layout for enabled views
   * @private
   */
  _recalculateLayout() {
    this.layout = {};

    // Count enabled views
    const enabledViews = Object.entries(this.views)
      .filter(([name, enabled]) => enabled)
      .map(([name]) => name);

    const viewCount = enabledViews.length;
    if (viewCount === 0) return;

    const gap = 5;  // Reduced from 10 to minimize space
    let currentY = 0;  // Start from top edge

    // Default heights for each view type
    const defaultHeights = {
      biological: 280,
      diagram: 180,
      trace: 180,
      spikes: 200,
      combined: 220,  // Combined trace + spikes
      ttfs: 120
    };

    // Calculate available space
    const totalGap = gap * (viewCount + 1);
    const availableHeight = this.height - totalGap;

    // Distribute height proportionally
    const totalDefaultHeight = enabledViews.reduce((sum, name) =>
      sum + defaultHeights[name], 0
    );

    enabledViews.forEach(name => {
      const proportionalHeight = (defaultHeights[name] / totalDefaultHeight) * availableHeight;

      this.layout[name] = {
        x: 0,  // No left margin
        y: currentY,
        width: this.width,  // Full width
        height: proportionalHeight
      };

      currentY += proportionalHeight + gap;
    });
  }

  /**
   * Update TTFS binary detector
   * @private
   */
  _updateTTFS() {
    const windowAge = this.model.time - this.ttfsState.encodingWindowStart;

    // Check if we should detect a bit
    if (this.ttfsState.detectedBit === null && windowAge < this.ttfsState.encodingWindowDuration) {
      // Check for first spike within window
      const firstSpikeInWindow = this.model.spikes.find(
        spike => spike.time >= this.ttfsState.encodingWindowStart &&
                 spike.time < this.ttfsState.encodingWindowStart + this.ttfsState.encodingWindowDuration
      );

      if (firstSpikeInWindow) {
        const latency = firstSpikeInWindow.time - this.ttfsState.encodingWindowStart;
        this.ttfsState.detectedBit = latency < this.ttfsState.ttfsThreshold ? 1 : 0;

        this.emit('bitdetected', {
          bit: this.ttfsState.detectedBit,
          latency,
          time: this.model.time
        });
      }
    } else if (this.ttfsState.detectedBit === null && windowAge >= this.ttfsState.encodingWindowDuration) {
      // Window closed, no spike = bit 0
      this.ttfsState.detectedBit = 0;

      this.emit('bitdetected', {
        bit: 0,
        latency: null,
        time: this.model.time
      });
    }
  }
}

export default LIFNeuronFigure;
