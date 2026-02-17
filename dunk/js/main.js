/**
 * Dunk - Main Bootstrap
 * Initialize and wire all components
 */

NS.App = {
  initialized: false,
  audioStarted: false,

  // Performance monitoring
  perf: {
    cpuHistory: [],
    maxHistory: 20,
    estimatedCPU: 0,
    lastUpdate: 0
  },

  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) return;

    console.log('[Dunk] Initializing...');

    // Initialize state first
    NS.State.init();
    NS.Presets.init();

    // Initialize UI components (don't need audio yet)
    NS.Sidepanel.init();
    NS.UI.init();

    // Initialize MIDI (can work before audio)
    await NS.MIDI.init();

    // Initialize controller panel
    if (NS.Controller) {
      NS.Controller.init();
    }

    // Setup start button
    const startBtn = NS.DOM.$('#btn-start');
    NS.DOM.on(startBtn, 'click', () => this.startAudio());

    // Also start on any click if not started (mobile friendly)
    NS.DOM.on(document, 'click', () => {
      if (!this.audioStarted) {
        this.startAudio();
      }
    }, { once: true });

    this.initialized = true;
    console.log('[Dunk] Initialized (waiting for audio start)');
  },

  /**
   * Start audio context and audio components
   */
  async startAudio() {
    if (this.audioStarted) return;

    console.log('[Dunk] Starting audio...');

    const startBtn = NS.DOM.$('#btn-start');
    startBtn.textContent = 'Starting...';
    startBtn.disabled = true;

    try {
      // Initialize audio context
      const ctx = await NS.Audio.init();

      // Initialize audio components
      NS.VoiceBank.init(ctx);
      NS.MasterBus.init(ctx);
      NS.LFOSystem.init(ctx);
      NS.Sequencer.init();

      // Connect audio graph
      // VoiceBank → MasterBus → Destination
      NS.VoiceBank.connect(NS.MasterBus.input);
      NS.MasterBus.connect(ctx.destination);

      // Initialize spectrum analyser
      NS.Analyser.init(
        NS.DOM.$('#phosphor-canvas'),
        NS.MasterBus.getAnalyser()
      );

      // Initialize phase meter (connect to master output for stereo analysis)
      NS.Phase.init(
        NS.DOM.$('#phase-canvas'),
        NS.MasterBus.output,
        ctx
      );

      // Initialize schematic
      NS.Schematic.init(NS.DOM.$('#schematic-canvas'));

      // Start visualizations
      NS.Analyser.start();
      NS.Phase.start();
      NS.Schematic.start();

      // Start performance monitoring
      this._startPerfMonitor(ctx);

      // Setup schematic click handler
      NS.DOM.on(NS.DOM.$('#schematic-canvas'), 'click', (e) => {
        const rect = e.target.getBoundingClientRect();
        const x = (e.clientX - rect.left) / NS.Schematic.zoom;
        const y = (e.clientY - rect.top) / NS.Schematic.zoom;
        NS.Schematic.handleClick(x, y);
      });

      // Update UI
      startBtn.textContent = 'Active';
      startBtn.classList.add('active');

      const status = NS.DOM.$('#status');
      status.textContent = 'Running';
      status.className = 'status-running';

      // Update latency display
      this._updateLatencyDisplay(ctx);

      this.audioStarted = true;
      NS.Bus.emit('app:audioStarted');

      console.log('[Dunk] Audio started');

    } catch (e) {
      console.error('[Dunk] Failed to start audio:', e);

      startBtn.textContent = 'Start';
      startBtn.disabled = false;

      const status = NS.DOM.$('#status');
      status.textContent = 'Error';
      status.className = 'status-error';
    }
  },

  /**
   * Start performance monitoring
   */
  _startPerfMonitor(ctx) {
    // Estimate CPU usage by measuring audio callback timing
    // This is an approximation based on buffer underruns and processing time

    const updatePerf = () => {
      if (!this.audioStarted) return;

      const now = performance.now();

      // Estimate CPU based on audio context state
      // Higher base latency suggests higher CPU load
      if (ctx.baseLatency) {
        const idealLatency = 128 / ctx.sampleRate; // Ideal ~2.7ms at 48kHz
        const actualLatency = ctx.baseLatency;
        const loadFactor = actualLatency / idealLatency;

        // Smooth the estimate
        this.perf.cpuHistory.push(loadFactor);
        if (this.perf.cpuHistory.length > this.perf.maxHistory) {
          this.perf.cpuHistory.shift();
        }

        const avgLoad = this.perf.cpuHistory.reduce((a, b) => a + b, 0) / this.perf.cpuHistory.length;
        this.perf.estimatedCPU = Math.min(100, Math.round(avgLoad * 15)); // Scale to percentage
      }

      // Update display every 500ms
      if (now - this.perf.lastUpdate > 500) {
        this._updateCPUDisplay();
        this.perf.lastUpdate = now;
      }

      requestAnimationFrame(updatePerf);
    };

    updatePerf();
  },

  /**
   * Update CPU display
   */
  _updateCPUDisplay() {
    const cpuEl = NS.DOM.$('#perf-cpu');
    if (cpuEl) {
      const cpu = this.perf.estimatedCPU;
      cpuEl.textContent = cpu + '%';
      cpuEl.className = 'value' + (cpu > 70 ? ' critical' : cpu > 50 ? ' warning' : '');
    }
  },

  /**
   * Update latency display
   */
  _updateLatencyDisplay(ctx) {
    const latencyEl = NS.DOM.$('#perf-latency');
    if (latencyEl && ctx.baseLatency) {
      const latencyMs = Math.round(ctx.baseLatency * 1000);
      latencyEl.textContent = latencyMs + ' ms';
      latencyEl.className = 'value' + (latencyMs > 50 ? ' warning' : latencyMs > 100 ? ' critical' : '');
    }
  },

  /**
   * Trigger a test sound
   */
  testSound() {
    if (!this.audioStarted) {
      console.warn('[Dunk] Audio not started');
      return;
    }

    NS.VoiceBank.trigger(0, 1.0);
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NS.App.init());
} else {
  NS.App.init();
}

// Expose for debugging
window.Dunk = NS;

console.log('[Dunk] Main module loaded');
console.log('[Dunk] Debug: Access app via window.Dunk');
