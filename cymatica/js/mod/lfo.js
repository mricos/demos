// CYMATICA.mod.lfo - Low Frequency Oscillator Engine
// Provides multiple waveform types with configurable frequency, amplitude, offset, and phase
(function(CYMATICA) {
    'use strict';

    // Waveform generators - all output 0-1 range
    const Waveforms = {
        sine: (phase) => (Math.sin(phase * Math.PI * 2) + 1) / 2,

        triangle: (phase) => {
            const t = phase % 1;
            return t < 0.5 ? t * 2 : 2 - t * 2;
        },

        square: (phase) => (phase % 1) < 0.5 ? 1 : 0,

        saw: (phase) => phase % 1,

        sawDown: (phase) => 1 - (phase % 1),

        // Sample-and-hold random - changes once per cycle
        random: (phase, runtime) => {
            const cycle = Math.floor(phase);
            if (cycle !== runtime._lastCycle) {
                runtime._lastCycle = cycle;
                runtime._randomValue = Math.random();
            }
            return runtime._randomValue ?? 0.5;
        },

        // True noise - new value each frame
        noise: () => Math.random()
    };

    CYMATICA.mod = CYMATICA.mod || {};

    CYMATICA.mod.lfo = {
        _runtimes: {},    // Runtime state per LFO
        _running: false,

        /**
         * Create a new LFO configuration
         * @param {object} options - LFO options
         * @returns {object} LFO configuration object
         */
        createLFO(options = {}) {
            const id = options.id || this._generateId();
            return {
                id,
                enabled: options.enabled ?? true,
                waveform: options.waveform || 'sine',
                frequency: options.frequency ?? 1.0,      // Hz
                amplitude: options.amplitude ?? 1.0,      // 0-1 depth
                offset: options.offset ?? 0.5,            // Center point 0-1
                phase: options.phase ?? 0,                // Starting phase in degrees
                sync: options.sync ?? false,              // Sync to BPM
                syncDiv: options.syncDiv ?? 1             // Beat division (1=quarter, 2=8th, 4=16th)
            };
        },

        /**
         * Update all LFOs - call each frame
         * @param {number} deltaMs - Time since last frame in milliseconds
         */
        update(deltaMs) {
            if (!this._running) return;

            const dt = deltaMs / 1000;
            const state = CYMATICA.state._state;
            const lfos = state.mod?.lfos || {};

            Object.values(lfos).forEach(config => {
                if (!config.enabled) return;

                // Get or create runtime state
                let runtime = this._runtimes[config.id];
                if (!runtime) {
                    runtime = this._runtimes[config.id] = {
                        _currentPhase: (config.phase || 0) / 360,
                        _lastCycle: -1,
                        _randomValue: 0.5,
                        currentValue: 0.5
                    };
                }

                // Calculate effective frequency
                let freq = config.frequency;
                if (config.sync && state.bpm) {
                    freq = (state.bpm / 60) / config.syncDiv;
                }

                // Advance phase
                runtime._currentPhase += freq * dt;

                // Get waveform function
                const waveformFn = Waveforms[config.waveform] || Waveforms.sine;

                // Generate raw value (0-1)
                let value = waveformFn(runtime._currentPhase, runtime);

                // Apply amplitude and offset
                // offset=0.5, amplitude=1.0 gives full 0-1 range
                // offset=0.5, amplitude=0.5 gives 0.25-0.75 range
                value = config.offset + (value - 0.5) * config.amplitude;

                // Clamp to 0-1
                value = Math.max(0, Math.min(1, value));

                // Store for hub to read
                runtime.currentValue = value;
            });
        },

        /**
         * Get current value of an LFO
         * @param {string} lfoId - LFO identifier
         * @returns {number} Current value 0-1
         */
        getValue(lfoId) {
            return this._runtimes[lfoId]?.currentValue ?? 0.5;
        },

        /**
         * Get phase of an LFO (0-1)
         * @param {string} lfoId - LFO identifier
         * @returns {number} Current phase 0-1
         */
        getPhase(lfoId) {
            const runtime = this._runtimes[lfoId];
            return runtime ? (runtime._currentPhase % 1) : 0;
        },

        /**
         * Reset an LFO's phase
         * @param {string} lfoId - LFO identifier
         * @param {number} phase - New phase 0-360 degrees
         */
        resetPhase(lfoId, phase = 0) {
            const runtime = this._runtimes[lfoId];
            if (runtime) {
                runtime._currentPhase = phase / 360;
            }
        },

        /**
         * Start the LFO engine
         */
        start() {
            this._running = true;
        },

        /**
         * Stop the LFO engine
         */
        stop() {
            this._running = false;
        },

        /**
         * Check if engine is running
         * @returns {boolean}
         */
        isRunning() {
            return this._running;
        },

        /**
         * Get list of available waveform types
         * @returns {string[]}
         */
        getWaveforms() {
            return Object.keys(Waveforms);
        },

        /**
         * Remove runtime state for an LFO
         * @param {string} lfoId - LFO identifier
         */
        remove(lfoId) {
            delete this._runtimes[lfoId];
        },

        /**
         * Clear all runtime states
         */
        clear() {
            this._runtimes = {};
        },

        /**
         * Initialize the LFO engine
         */
        init() {
            this._runtimes = {};
            console.log('cymatica.mod.lfo: initialized');
        },

        /**
         * Generate unique LFO ID
         * @private
         */
        _generateId() {
            return 'lfo_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
        }
    };

})(window.CYMATICA);
