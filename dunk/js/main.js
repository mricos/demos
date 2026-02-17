/**
 * Dunk - Main Bootstrap
 * Initialize and wire all components
 */

NS.App = {
  initialized: false,
  audioStarted: false,

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

      // Initialize visualizations
      NS.Analyser.init(
        NS.DOM.$('#phosphor-canvas'),
        NS.MasterBus.getAnalyser()
      );
      NS.Schematic.init(NS.DOM.$('#schematic-canvas'));

      // Start visualizations
      NS.Analyser.start();
      NS.Schematic.start();

      // Setup schematic click handler
      NS.DOM.on(NS.DOM.$('#schematic-canvas'), 'click', (e) => {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        NS.Schematic.handleClick(x, y);
      });

      // Flash on trigger
      NS.Bus.on('voice:triggered', () => {
        NS.Analyser.flash();
      });

      // Update UI
      startBtn.textContent = 'Audio Active';
      startBtn.classList.add('active');

      const status = NS.DOM.$('#status');
      status.textContent = 'Running';
      status.className = 'status-running';

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
