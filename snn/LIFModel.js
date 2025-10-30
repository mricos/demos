/**
 * LIFModel.js
 *
 * Pure Leaky Integrate-and-Fire (LIF) neuron physics simulation.
 * No rendering, no DOM - just differential equations and spike detection.
 *
 * LIF Model:
 *   τ dV/dt = -V + I
 *   if V ≥ Vth: spike and V ← 0
 *
 * Where:
 *   V = membrane potential
 *   τ = membrane time constant
 *   I = input current
 *   Vth = spike threshold
 */

export class LIFModel {
  constructor(config = {}) {
    // Model parameters
    this.threshold = config.threshold ?? 1.0;      // Spike threshold (V)
    this.tau = config.tau ?? 20;                   // Membrane time constant (ms)
    this.input = config.input ?? 0.04;             // Input current
    this.resetValue = config.resetValue ?? 0;      // Post-spike reset voltage
    this.inputMultiplier = config.inputMultiplier ?? 1.3;  // Input boost factor

    // State variables
    this.membrane = 0;                             // Current membrane potential
    this.time = 0;                                 // Simulation time (ms)
    this.lastSpike = -1000;                        // Time of last spike (ms)
    this.spikes = [];                              // Spike history: [{time, voltage}, ...]

    // Integration parameters
    this.dt = config.dt ?? 0.5;                    // Integration timestep (ms)
    this.historyDuration = config.historyDuration ?? 300;  // How long to keep spike history (ms)
  }

  /**
   * Advance simulation by one timestep
   * @param {number} dt - Time delta in milliseconds (optional, uses this.dt if not provided)
   * @returns {boolean} True if spike occurred in this step
   */
  step(dt = this.dt) {
    // LIF differential equation solution (exponential Euler)
    // V(t+Δt) = V(t) · e^(-Δt/τ) + I
    const decayFactor = Math.exp(-dt / this.tau);
    this.membrane = this.membrane * decayFactor + (this.input * this.inputMultiplier * dt / this.tau);

    // Check for spike
    let spiked = false;
    if (this.membrane >= this.threshold) {
      spiked = true;
      this.spikes.push({
        time: this.time,
        voltage: this.membrane
      });
      this.lastSpike = this.time;
      this.membrane = this.resetValue;
    }

    // Update time
    this.time += dt;

    // Cleanup old spikes
    this._cleanupHistory();

    return spiked;
  }

  /**
   * Check if spike occurred at current time
   * @returns {boolean}
   */
  checkSpike() {
    return this.lastSpike === this.time;
  }

  /**
   * Reset simulation to initial state
   */
  reset() {
    this.membrane = 0;
    this.time = 0;
    this.lastSpike = -1000;
    this.spikes = [];
  }

  /**
   * Get current state snapshot
   * @returns {object}
   */
  getState() {
    return {
      membrane: this.membrane,
      time: this.time,
      lastSpike: this.lastSpike,
      spikes: [...this.spikes],  // Copy array
      threshold: this.threshold,
      tau: this.tau,
      input: this.input
    };
  }

  /**
   * Restore state from snapshot
   * @param {object} state
   */
  setState(state) {
    this.membrane = state.membrane ?? 0;
    this.time = state.time ?? 0;
    this.lastSpike = state.lastSpike ?? -1000;
    this.spikes = state.spikes ? [...state.spikes] : [];
    if (state.threshold !== undefined) this.threshold = state.threshold;
    if (state.tau !== undefined) this.tau = state.tau;
    if (state.input !== undefined) this.input = state.input;
  }

  /**
   * Change input current
   * @param {number} current
   */
  setInput(current) {
    this.input = Math.max(0, current);
  }

  /**
   * Get spikes within a time window
   * @param {number} startTime - Window start (ms)
   * @param {number} endTime - Window end (ms)
   * @returns {Array} Spikes in window
   */
  getSpikesInWindow(startTime, endTime) {
    return this.spikes.filter(spike =>
      spike.time >= startTime && spike.time <= endTime
    );
  }

  /**
   * Reconstruct membrane potential history over a duration
   * Uses backward simulation from current state
   * @param {number} duration - Duration to reconstruct (ms)
   * @returns {Array} [{time, voltage}, ...]
   */
  getMembraneHistory(duration) {
    const history = [];
    const numPoints = Math.ceil(duration / this.dt);

    // Get spikes in the history window
    const startTime = this.time - duration;
    const relevantSpikes = this.getSpikesInWindow(startTime, this.time);

    // Reconstruct backward from current state
    let V = this.membrane;
    for (let i = 0; i < numPoints; i++) {
      const t = this.time - (i * this.dt);

      // Check if there was a spike at this time (within tolerance)
      const spikeAtTime = relevantSpikes.find(spike =>
        Math.abs(spike.time - t) < this.dt / 2
      );

      if (spikeAtTime) {
        // Spike occurred, voltage was at threshold
        V = this.threshold;
      }

      history.unshift({ time: t, voltage: V });

      // Backward integration (reverse of forward dynamics)
      // This is approximate but sufficient for visualization
      const decayFactor = Math.exp(this.dt / this.tau);
      V = (V - (this.input * this.inputMultiplier * this.dt / this.tau)) / decayFactor;
      V = Math.max(0, V);  // Clamp to zero
    }

    return history;
  }

  /**
   * Get time since last spike
   * @returns {number} Time in milliseconds
   */
  getTimeSinceSpike() {
    return this.time - this.lastSpike;
  }

  /**
   * Clean up old spike history
   * @private
   */
  _cleanupHistory() {
    const cutoffTime = this.time - this.historyDuration;
    this.spikes = this.spikes.filter(spike => spike.time >= cutoffTime);
  }
}

export default LIFModel;
