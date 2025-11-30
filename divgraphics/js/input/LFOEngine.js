/**
 * LFOEngine - Low Frequency Oscillator modulation source
 * Generates periodic values that can be mapped to any parameter
 * Integrates with InputHub like MIDI/Gamepad sources
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    // Waveform generators (all return 0-1)
    const Waveforms = {
        sine: (phase) => (Math.sin(phase * Math.PI * 2) + 1) / 2,
        triangle: (phase) => {
            const t = phase % 1;
            return t < 0.5 ? t * 2 : 2 - t * 2;
        },
        square: (phase) => phase % 1 < 0.5 ? 1 : 0,
        saw: (phase) => phase % 1,
        sawDown: (phase) => 1 - (phase % 1),
        random: (phase, lfo) => {
            // Sample-and-hold random: changes once per cycle
            const cycle = Math.floor(phase);
            if (cycle !== lfo._lastRandomCycle) {
                lfo._lastRandomCycle = cycle;
                lfo._randomValue = Math.random();
            }
            return lfo._randomValue ?? 0.5;
        },
        noise: () => Math.random()  // True noise, changes every frame
    };

    APP.LFOEngine = {
        _lfos: {},           // Active LFO states
        _lastTime: 0,
        _running: false,

        init() {
            this._restoreFromState();
            this._subscribe();
        },

        /**
         * Create default LFO configuration
         */
        createLFO(id, options = {}) {
            return {
                id: id || this._generateId(),
                enabled: options.enabled ?? true,
                waveform: options.waveform || 'sine',
                frequency: options.frequency ?? 1.0,      // Hz (or beat multiplier if synced)
                amplitude: options.amplitude ?? 1.0,      // 0-1 output range scale
                offset: options.offset ?? 0.5,            // Center point (0-1)
                phase: options.phase ?? 0,                // Starting phase (0-360 degrees)
                sync: options.sync ?? false,              // Sync to BPM
                syncDiv: options.syncDiv ?? 1,            // Beat division (1=quarter, 2=8th, 4=16th)
                // Runtime state (not persisted)
                _currentPhase: (options.phase ?? 0) / 360,
                _lastRandomCycle: -1,
                _randomValue: 0.5
            };
        },

        /**
         * Update all LFOs (call from animation loop)
         * @param {number} deltaTime - Time since last frame in ms
         */
        update(deltaTime) {
            if (!this._running) return;

            const dt = deltaTime / 1000; // Convert to seconds
            const state = APP.State?.state?.lfo;
            if (!state?.lfos) return;

            // Get BPM for sync
            const pps = APP.State?.select('animation.pps') || 1.0;
            const bpm = pps * 60; // Approximate BPM from pulses per second

            Object.values(state.lfos).forEach(lfoConfig => {
                if (!lfoConfig.enabled) return;

                // Get or create runtime state
                let lfo = this._lfos[lfoConfig.id];
                if (!lfo) {
                    lfo = this._lfos[lfoConfig.id] = {
                        _currentPhase: (lfoConfig.phase || 0) / 360,
                        _lastRandomCycle: -1,
                        _randomValue: 0.5
                    };
                }

                // Calculate frequency
                let freq = lfoConfig.frequency;
                if (lfoConfig.sync) {
                    // Sync to BPM: freq = (BPM / 60) / syncDiv
                    freq = (bpm / 60) / (lfoConfig.syncDiv || 1);
                }

                // Advance phase
                lfo._currentPhase += freq * dt;

                // Generate value using waveform
                const waveformFn = Waveforms[lfoConfig.waveform] || Waveforms.sine;
                let value = waveformFn(lfo._currentPhase, lfo);

                // Apply amplitude and offset
                // value goes from 0-1, we scale by amplitude and center on offset
                // Final range: [offset - amplitude/2, offset + amplitude/2]
                const amp = lfoConfig.amplitude ?? 1;
                const off = lfoConfig.offset ?? 0.5;
                value = off + (value - 0.5) * amp;

                // Clamp to 0-1
                value = Math.max(0, Math.min(1, value));

                // Emit to InputHub
                const key = lfoConfig.id;
                APP.InputHub?.emit('lfo', 'continuous', key, value, {
                    lfoId: lfoConfig.id,
                    waveform: lfoConfig.waveform,
                    frequency: freq
                });
            });
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
         * Reset an LFO's phase
         */
        resetPhase(lfoId) {
            const lfo = this._lfos[lfoId];
            if (lfo) {
                const config = APP.State?.select(`lfo.lfos.${lfoId}`);
                lfo._currentPhase = (config?.phase || 0) / 360;
            }
        },

        /**
         * Reset all LFO phases
         */
        resetAllPhases() {
            Object.keys(this._lfos).forEach(id => this.resetPhase(id));
        },

        /**
         * Get current value of an LFO (for display)
         */
        getCurrentValue(lfoId) {
            const lfo = this._lfos[lfoId];
            if (!lfo) return 0.5;

            const config = APP.State?.select(`lfo.lfos.${lfoId}`);
            if (!config) return 0.5;

            const waveformFn = Waveforms[config.waveform] || Waveforms.sine;
            let value = waveformFn(lfo._currentPhase, lfo);

            const amp = config.amplitude ?? 1;
            const off = config.offset ?? 0.5;
            value = off + (value - 0.5) * amp;

            return Math.max(0, Math.min(1, value));
        },

        /**
         * Add a new LFO to state
         */
        addLFO(options = {}) {
            const lfo = this.createLFO(null, options);
            const lfos = { ...APP.State?.select('lfo.lfos') };
            lfos[lfo.id] = lfo;
            APP.State?.dispatch({ type: 'lfo.lfos', payload: lfos });
            return lfo.id;
        },

        /**
         * Remove an LFO from state
         */
        removeLFO(lfoId) {
            const lfos = { ...APP.State?.select('lfo.lfos') };
            delete lfos[lfoId];
            delete this._lfos[lfoId];
            APP.State?.dispatch({ type: 'lfo.lfos', payload: lfos });
        },

        /**
         * Update an LFO's configuration
         */
        updateLFO(lfoId, updates) {
            const current = APP.State?.select(`lfo.lfos.${lfoId}`);
            if (!current) return;

            const lfos = { ...APP.State?.select('lfo.lfos') };
            lfos[lfoId] = { ...current, ...updates };
            APP.State?.dispatch({ type: 'lfo.lfos', payload: lfos });
        },

        /**
         * Get list of available waveforms
         */
        getWaveforms() {
            return Object.keys(Waveforms);
        },

        // ================================================================
        // Internal
        // ================================================================

        _restoreFromState() {
            // Initialize runtime state for existing LFOs
            const lfos = APP.State?.select('lfo.lfos') || {};
            Object.keys(lfos).forEach(id => {
                this._lfos[id] = {
                    _currentPhase: (lfos[id].phase || 0) / 360,
                    _lastRandomCycle: -1,
                    _randomValue: 0.5
                };
            });
        },

        _subscribe() {
            // Reset phase when LFO phase setting changes
            APP.State?.subscribe('lfo.lfos.*', (val, state, meta) => {
                if (meta.path.endsWith('.phase')) {
                    const parts = meta.path.split('.');
                    const lfoId = parts[2];
                    this.resetPhase(lfoId);
                }
            });
        },

        _generateId() {
            return 'lfo_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
        }
    };

})(window.APP);
