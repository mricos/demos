// CYMATICA.mod.asr - Attack-Sustain-Release Envelope Generator
// Provides impulse-triggered envelopes for modulation
(function(CYMATICA) {
    'use strict';

    // Envelope phases
    const Phase = {
        IDLE: 0,
        ATTACK: 1,
        SUSTAIN: 2,
        RELEASE: 3
    };

    CYMATICA.mod = CYMATICA.mod || {};

    CYMATICA.mod.asr = {
        _runtimes: {},    // Runtime state per envelope
        Phase,            // Expose phase constants

        /**
         * Create a new ASR envelope configuration
         * @param {object} options - Envelope options
         * @returns {object} ASR configuration object
         */
        createASR(options = {}) {
            const id = options.id || this._generateId();
            return {
                id,
                enabled: options.enabled ?? true,
                attack: options.attack ?? 0.1,          // Attack time in seconds
                sustain: options.sustain ?? 1.0,        // Sustain level 0-1
                release: options.release ?? 0.3,        // Release time in seconds
                holdTime: options.holdTime ?? 0,        // Auto-release after N seconds (0 = manual)
                triggerChannel: options.triggerChannel || null,  // External trigger channel
                curve: options.curve ?? 'linear'        // 'linear' or 'exponential'
            };
        },

        /**
         * Trigger an envelope (note-on or note-off)
         * @param {string} asrId - Envelope identifier
         * @param {boolean} pressed - true = note-on, false = note-off
         */
        trigger(asrId, pressed) {
            const state = CYMATICA.state._state;
            const config = state.mod?.asrs?.[asrId];
            if (!config?.enabled) return;

            // Get or create runtime
            let runtime = this._runtimes[asrId];
            if (!runtime) {
                runtime = this._runtimes[asrId] = {
                    phase: Phase.IDLE,
                    value: 0,
                    time: 0,
                    sustainStart: 0
                };
            }

            if (pressed) {
                // Note-on: start attack phase
                runtime.phase = Phase.ATTACK;
                runtime.time = 0;
                runtime.startValue = runtime.value; // For smooth retrigger
            } else {
                // Note-off: start release phase (only if in attack or sustain)
                if (runtime.phase === Phase.ATTACK || runtime.phase === Phase.SUSTAIN) {
                    runtime.phase = Phase.RELEASE;
                    runtime.time = 0;
                    runtime.releaseStart = runtime.value;
                }
            }
        },

        /**
         * Update all envelopes - call each frame
         * @param {number} deltaMs - Time since last frame in milliseconds
         */
        update(deltaMs) {
            const dt = deltaMs / 1000;
            const state = CYMATICA.state._state;
            const asrs = state.mod?.asrs || {};

            Object.values(asrs).forEach(config => {
                if (!config.enabled) return;

                // Get or create runtime
                let runtime = this._runtimes[config.id];
                if (!runtime) {
                    runtime = this._runtimes[config.id] = {
                        phase: Phase.IDLE,
                        value: 0,
                        time: 0,
                        sustainStart: 0,
                        startValue: 0,
                        releaseStart: 0
                    };
                }

                runtime.time += dt;

                switch (runtime.phase) {
                    case Phase.ATTACK:
                        if (config.attack <= 0) {
                            // Instant attack
                            runtime.value = 1;
                            runtime.phase = Phase.SUSTAIN;
                            runtime.sustainStart = performance.now();
                        } else {
                            // Linear or exponential attack
                            const t = runtime.time / config.attack;
                            if (config.curve === 'exponential') {
                                runtime.value = runtime.startValue + (1 - runtime.startValue) * (1 - Math.exp(-t * 5));
                            } else {
                                runtime.value = runtime.startValue + (1 - runtime.startValue) * Math.min(1, t);
                            }

                            if (runtime.value >= 0.999) {
                                runtime.value = 1;
                                runtime.phase = Phase.SUSTAIN;
                                runtime.sustainStart = performance.now();
                            }
                        }
                        break;

                    case Phase.SUSTAIN:
                        runtime.value = config.sustain;

                        // Auto-release after holdTime
                        if (config.holdTime > 0) {
                            const held = (performance.now() - runtime.sustainStart) / 1000;
                            if (held >= config.holdTime) {
                                runtime.phase = Phase.RELEASE;
                                runtime.time = 0;
                                runtime.releaseStart = runtime.value;
                            }
                        }
                        break;

                    case Phase.RELEASE:
                        if (config.release <= 0) {
                            // Instant release
                            runtime.value = 0;
                            runtime.phase = Phase.IDLE;
                        } else {
                            const t = runtime.time / config.release;
                            if (config.curve === 'exponential') {
                                runtime.value = runtime.releaseStart * Math.exp(-t * 5);
                            } else {
                                runtime.value = runtime.releaseStart * Math.max(0, 1 - t);
                            }

                            if (runtime.value <= 0.001) {
                                runtime.value = 0;
                                runtime.phase = Phase.IDLE;
                            }
                        }
                        break;

                    case Phase.IDLE:
                    default:
                        runtime.value = 0;
                        break;
                }
            });
        },

        /**
         * Get current value of an envelope
         * @param {string} asrId - Envelope identifier
         * @returns {number} Current value 0-1
         */
        getValue(asrId) {
            return this._runtimes[asrId]?.value ?? 0;
        },

        /**
         * Get current phase of an envelope
         * @param {string} asrId - Envelope identifier
         * @returns {number} Phase constant
         */
        getPhase(asrId) {
            return this._runtimes[asrId]?.phase ?? Phase.IDLE;
        },

        /**
         * Check if envelope is active (not idle)
         * @param {string} asrId - Envelope identifier
         * @returns {boolean}
         */
        isActive(asrId) {
            const phase = this.getPhase(asrId);
            return phase !== Phase.IDLE;
        },

        /**
         * Force stop an envelope
         * @param {string} asrId - Envelope identifier
         */
        stop(asrId) {
            const runtime = this._runtimes[asrId];
            if (runtime) {
                runtime.phase = Phase.IDLE;
                runtime.value = 0;
            }
        },

        /**
         * Remove runtime state for an envelope
         * @param {string} asrId - Envelope identifier
         */
        remove(asrId) {
            delete this._runtimes[asrId];
        },

        /**
         * Clear all runtime states
         */
        clear() {
            this._runtimes = {};
        },

        /**
         * Initialize the ASR engine
         */
        init() {
            this._runtimes = {};
            console.log('cymatica.mod.asr: initialized');
        },

        /**
         * Generate unique ASR ID
         * @private
         */
        _generateId() {
            return 'asr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
        }
    };

})(window.CYMATICA);
