/**
 * DivGraphics - Particle Cluster Synth
 * Creates lush "tines" sounds using clustered oscillators with reverb
 * Triggered by collision events from chaser/caterpillar
 *
 * Inspired by cluster-synth: multiple detuned oscillators with FM,
 * waveshaping, filtering, and diffuse reverb for rich harmonic content.
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.ParticleClusterSynth = {
        ctx: null,                    // AudioContext (shared with AudioEngine)
        masterGain: null,             // Output gain node

        // Voice pool for polyphony
        voices: [],
        maxVoices: 6,

        // Reverb chain
        reverbInput: null,
        reverbWet: null,
        reverbDry: null,

        // State
        _initialized: false,
        _collisionHandlerBound: false,

        /**
         * Initialize with existing AudioContext from AudioEngine
         * @param {AudioContext} ctx
         * @param {GainNode} destination - Usually AudioEngine.masterGain
         */
        init(ctx, destination) {
            if (this._initialized) return;
            if (!ctx) return;

            this.ctx = ctx;

            // Master gain for cluster synth - start at 0 if disabled
            this.masterGain = ctx.createGain();
            const state = APP.State?.select('audio.cluster') || {};
            const clusterEnabled = state.enabled !== false;
            this.masterGain.gain.value = clusterEnabled ? (state.volume ?? 30) / 100 : 0;

            // Build reverb chain
            this._buildReverb();

            // Connect: voices -> reverb -> master -> destination
            this.masterGain.connect(destination);

            // Pre-allocate voice pool
            for (let i = 0; i < this.maxVoices; i++) {
                this.voices.push(this._createVoice());
            }

            // Subscribe to collision events
            this._bindCollisionEvents();
            this._subscribe();

            this._initialized = true;
            console.log('[ParticleClusterSynth] Initialized');
        },

        /**
         * Build simple reverb using allpass filters and delay (no impulse response needed)
         */
        _buildReverb() {
            const ctx = this.ctx;
            const state = APP.State?.select('audio.cluster') || {};

            this.reverbInput = ctx.createGain();
            this.reverbInput.gain.value = 1;

            // Pre-delay
            const preDelay = ctx.createDelay(0.5);
            preDelay.delayTime.value = 0.01;

            // Allpass diffusion network for smooth reverb tail
            const ap1 = this._createAllpass(1117 / 44100, 0.7);
            const ap2 = this._createAllpass(1277 / 44100, 0.7);
            const ap3 = this._createAllpass(1559 / 44100, 0.7);
            const ap4 = this._createAllpass(1877 / 44100, 0.7);

            // Comb filters for reverb density
            const comb1 = this._createCombFilter(0.0297, 0.65);
            const comb2 = this._createCombFilter(0.0371, 0.65);
            const comb3 = this._createCombFilter(0.0411, 0.65);
            const comb4 = this._createCombFilter(0.0437, 0.65);

            // Mix comb outputs
            const combMix = ctx.createGain();
            combMix.gain.value = 0.25;

            // Connect diffusion chain
            this.reverbInput.connect(preDelay);
            preDelay.connect(ap1.input);
            ap1.output.connect(ap2.input);
            ap2.output.connect(ap3.input);
            ap3.output.connect(ap4.input);

            // Connect to comb filters
            ap4.output.connect(comb1.input);
            ap4.output.connect(comb2.input);
            ap4.output.connect(comb3.input);
            ap4.output.connect(comb4.input);

            // Mix combs
            comb1.output.connect(combMix);
            comb2.output.connect(combMix);
            comb3.output.connect(combMix);
            comb4.output.connect(combMix);

            // Lowpass to tame high frequencies
            const lpf = ctx.createBiquadFilter();
            lpf.type = 'lowpass';
            lpf.frequency.value = state.reverbDamping || 4000;
            lpf.Q.value = 0.5;
            combMix.connect(lpf);

            // Wet/dry mix
            this.reverbWet = ctx.createGain();
            this.reverbDry = ctx.createGain();

            const wetLevel = (state.reverbMix ?? 35) / 100;
            this.reverbWet.gain.value = wetLevel;
            this.reverbDry.gain.value = 1 - wetLevel;

            lpf.connect(this.reverbWet);
            this.reverbInput.connect(this.reverbDry);

            this.reverbWet.connect(this.masterGain);
            this.reverbDry.connect(this.masterGain);
        },

        /**
         * Create allpass filter for diffusion
         */
        _createAllpass(delayTime, feedback) {
            const ctx = this.ctx;
            const input = ctx.createGain();
            const output = ctx.createGain();
            const delay = ctx.createDelay(0.1);
            const fb = ctx.createGain();
            const ff = ctx.createGain();

            delay.delayTime.value = delayTime;
            fb.gain.value = feedback;
            ff.gain.value = -feedback;

            // Allpass topology: input -> delay -> output + feedback loop
            input.connect(delay);
            input.connect(ff);
            delay.connect(output);
            delay.connect(fb);
            fb.connect(input);
            ff.connect(output);

            return { input, output };
        },

        /**
         * Create comb filter for reverb density
         */
        _createCombFilter(delayTime, feedback) {
            const ctx = this.ctx;
            const input = ctx.createGain();
            const output = ctx.createGain();
            const delay = ctx.createDelay(0.1);
            const fb = ctx.createGain();

            delay.delayTime.value = delayTime;
            fb.gain.value = feedback;

            input.connect(delay);
            delay.connect(output);
            delay.connect(fb);
            fb.connect(delay);

            return { input, output };
        },

        /**
         * Create a voice with cluster of oscillators
         * Returns object with trigger/release methods
         */
        _createVoice() {
            const ctx = this.ctx;

            return {
                oscillators: [],
                gains: [],
                filter: null,
                voiceGain: null,
                envelope: null,
                active: false,
                startTime: 0,

                /**
                 * Build oscillator cluster for this voice
                 * @param {Object} params - { baseFreq, clusterSize, detune, filterFreq, filterQ }
                 */
                build(params) {
                    const state = APP.State?.select('audio.cluster') || {};
                    const baseFreq = params.baseFreq || state.baseFreq || 440;
                    const clusterSize = params.clusterSize || state.clusterSize || 4;
                    const detune = params.detune || state.detune || 8;
                    const waveform = state.waveform || 'triangle';

                    // Clean up existing oscillators
                    this.cleanup();

                    // Voice output gain (for ADSR)
                    this.voiceGain = ctx.createGain();
                    this.voiceGain.gain.value = 0;

                    // Filter for tone shaping
                    this.filter = ctx.createBiquadFilter();
                    this.filter.type = 'lowpass';
                    this.filter.frequency.value = params.filterFreq || state.filterFreq || 2000;
                    this.filter.Q.value = params.filterQ || state.filterQ || 1.5;

                    // Create cluster of detuned oscillators
                    for (let i = 0; i < clusterSize; i++) {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();

                        // Set waveform - triangle for bell-like, sine for pure, sawtooth for rich
                        osc.type = waveform;

                        // Base frequency
                        osc.frequency.value = baseFreq;

                        // Spread detune symmetrically around center
                        const frac = (i - (clusterSize - 1) / 2) / Math.max(1, clusterSize - 1);
                        osc.detune.value = frac * detune;

                        // Individual gain (normalize by cluster size)
                        gain.gain.value = 1 / clusterSize;

                        // Connect: osc -> gain -> filter
                        osc.connect(gain);
                        gain.connect(this.filter);

                        this.oscillators.push(osc);
                        this.gains.push(gain);
                    }

                    // Connect filter -> voice gain
                    this.filter.connect(this.voiceGain);

                    // Create ADSR envelope
                    this.envelope = APP.ADSR?.create({
                        attack: state.attack ?? 0.01,
                        decay: state.decay ?? 0.3,
                        sustain: (state.sustain ?? 30) / 100,
                        release: state.release ?? 1.5
                    });

                    return this;
                },

                /**
                 * Connect voice to destination
                 */
                connect(destination) {
                    if (this.voiceGain) {
                        this.voiceGain.connect(destination);
                    }
                    return this;
                },

                /**
                 * Trigger voice with ADSR
                 * @param {number} velocity - 0-1 velocity/intensity
                 */
                trigger(velocity = 0.8) {
                    if (!this.voiceGain || !ctx) return;

                    const state = APP.State?.select('audio.cluster') || {};
                    const peakGain = velocity * (state.velocity ?? 80) / 100;

                    // Start oscillators
                    this.oscillators.forEach(osc => {
                        try { osc.start(); } catch(e) {}
                    });

                    // Trigger ADSR
                    if (this.envelope && APP.ADSR) {
                        this.envelope.triggerExp(this.voiceGain.gain, peakGain, 0.001, ctx);
                    } else {
                        // Fallback: simple attack
                        const now = ctx.currentTime;
                        this.voiceGain.gain.setValueAtTime(0.001, now);
                        this.voiceGain.gain.exponentialRampToValueAtTime(peakGain, now + 0.01);
                    }

                    this.active = true;
                    this.startTime = ctx.currentTime;
                },

                /**
                 * Release voice (begin release phase)
                 */
                release() {
                    if (!this.voiceGain || !ctx) return;

                    const releaseTime = this.envelope?.release ?? 1.5;
                    const now = ctx.currentTime;

                    // Cancel any pending scheduled automation from attack/decay
                    this.voiceGain.gain.cancelScheduledValues(now);

                    // Capture current gain value and set it as starting point
                    const currentGain = Math.max(this.voiceGain.gain.value, 0.001);
                    this.voiceGain.gain.setValueAtTime(currentGain, now);

                    // Use setTargetAtTime for reliable exponential decay
                    // Time constant = releaseTime / 4 means ~98% decay in releaseTime
                    this.voiceGain.gain.setTargetAtTime(0.00001, now, releaseTime / 4);

                    // CRITICAL: Schedule oscillators to STOP (they must stop!)
                    const stopTime = now + releaseTime + 0.1;
                    this.oscillators.forEach(osc => {
                        try {
                            osc.stop(stopTime);
                        } catch(e) {
                            // Already stopped
                        }
                    });

                    // Schedule cleanup after oscillators have stopped
                    setTimeout(() => {
                        this.cleanup();
                        this.active = false;
                    }, (releaseTime + 0.2) * 1000);
                },

                /**
                 * Stop and disconnect all oscillators
                 */
                cleanup() {
                    this.oscillators.forEach(osc => {
                        try { osc.stop(); osc.disconnect(); } catch(e) {}
                    });
                    this.gains.forEach(g => {
                        try { g.disconnect(); } catch(e) {}
                    });
                    if (this.filter) {
                        try { this.filter.disconnect(); } catch(e) {}
                    }
                    if (this.voiceGain) {
                        try { this.voiceGain.disconnect(); } catch(e) {}
                    }
                    this.oscillators = [];
                    this.gains = [];
                    this.filter = null;
                    this.voiceGain = null;
                    this.active = false;
                }
            };
        },

        /**
         * Get an available voice from the pool
         */
        _getVoice() {
            // Find inactive voice
            for (const voice of this.voices) {
                if (!voice.active) return voice;
            }

            // Steal oldest voice
            let oldest = this.voices[0];
            for (const voice of this.voices) {
                if (voice.startTime < oldest.startTime) {
                    oldest = voice;
                }
            }
            oldest.cleanup();
            return oldest;
        },

        /**
         * Play a note triggered by collision
         * @param {Object} collisionData - { penetration, velocity, faceIndex }
         */
        playNote(collisionData = {}) {
            if (!this._initialized || !this.ctx) return;
            if (this.ctx.state !== 'running') return;

            const state = APP.State?.select('audio.cluster') || {};
            if (!state.enabled) return;

            const penetration = collisionData.penetration ?? 0.5;
            const velocity = collisionData.velocity ?? penetration;
            const faceIndex = collisionData.faceIndex ?? 0;

            // Map face index to pitch (pentatonic-ish for pleasant sounds)
            const baseFreq = state.baseFreq || 440;
            const scale = [1, 1.125, 1.25, 1.333, 1.5, 1.667, 1.875, 2]; // Major scale ratios
            const scaleIndex = faceIndex % scale.length;
            const octave = Math.floor(faceIndex / scale.length) % 3;
            const noteFreq = baseFreq * scale[scaleIndex] * Math.pow(2, octave - 1);

            // Get voice and configure
            const voice = this._getVoice();
            voice.build({
                baseFreq: noteFreq,
                clusterSize: state.clusterSize || 4,
                detune: state.detune || 8,
                filterFreq: state.filterFreq || 2000,
                filterQ: state.filterQ || 1.5
            });

            // Connect to reverb input
            voice.connect(this.reverbInput);

            // Trigger with velocity from collision intensity
            voice.trigger(velocity);

            // Capture references NOW before voice could be reused
            const oscillatorsToStop = [...voice.oscillators];
            const gainToFade = voice.voiceGain;
            const releaseTime = state.release ?? 1.5;

            // Auto-release after attack + decay + hold time
            const attack = state.attack ?? 0.01;
            const decay = state.decay ?? 0.3;
            const holdTime = (state.hold ?? 200) / 1000;
            const totalHoldMs = (attack + decay + holdTime) * 1000;

            setTimeout(() => {
                // Use captured references, not voice.oscillators which may have changed
                this._releaseNote(oscillatorsToStop, gainToFade, releaseTime);
            }, totalHoldMs);
        },

        /**
         * Release a specific note (with captured oscillators/gain)
         */
        _releaseNote(oscillators, gainNode, releaseTime) {
            if (!gainNode || !this.ctx) return;

            const ctx = this.ctx;
            const now = ctx.currentTime;

            // Cancel any pending scheduled automation
            gainNode.gain.cancelScheduledValues(now);

            // Capture current gain and set as starting point
            const currentGain = Math.max(gainNode.gain.value, 0.001);
            gainNode.gain.setValueAtTime(currentGain, now);

            // Exponential decay
            gainNode.gain.setTargetAtTime(0.00001, now, releaseTime / 4);

            // Schedule oscillators to stop
            const stopTime = now + releaseTime + 0.1;
            oscillators.forEach(osc => {
                try { osc.stop(stopTime); } catch(e) {}
            });

            // Hard cleanup after release
            setTimeout(() => {
                oscillators.forEach(osc => {
                    try { osc.stop(); osc.disconnect(); } catch(e) {}
                });
                try { gainNode.disconnect(); } catch(e) {}
            }, (releaseTime + 0.2) * 1000);
        },

        /**
         * Bind to collision events
         */
        _bindCollisionEvents() {
            if (this._collisionHandlerBound) return;

            // Listen for collision triggers
            APP.Collision?.on('trigger', (data) => {
                this.playNote(data);
            });

            // Optional: sustained sound on collision enter
            APP.Collision?.on('enter', (data) => {
                // Could start a drone here if desired
            });

            APP.Collision?.on('exit', (data) => {
                // Could release drone here
            });

            this._collisionHandlerBound = true;
        },

        /**
         * Subscribe to state changes
         */
        _subscribe() {
            APP.State?.subscribe('audio.cluster.volume', (vol) => {
                if (this.masterGain) {
                    this.masterGain.gain.setTargetAtTime(vol / 100, this.ctx.currentTime, 0.05);
                }
            });

            APP.State?.subscribe('audio.cluster.reverbMix', (mix) => {
                if (this.reverbWet && this.reverbDry) {
                    const wetLevel = mix / 100;
                    this.reverbWet.gain.setTargetAtTime(wetLevel, this.ctx.currentTime, 0.05);
                    this.reverbDry.gain.setTargetAtTime(1 - wetLevel, this.ctx.currentTime, 0.05);
                }
            });
        },

        /**
         * Manual trigger for testing
         * @param {number} freq - Base frequency
         * @param {number} velocity - 0-1
         */
        testNote(freq = 440, velocity = 0.8) {
            this.playNote({
                penetration: velocity,
                velocity: velocity,
                faceIndex: Math.floor(Math.random() * 8)
            });
        },

        /**
         * Update parameters (can be called with external modulation)
         */
        setParams(params) {
            if (params.volume !== undefined && this.masterGain) {
                this.masterGain.gain.value = params.volume / 100;
            }
            if (params.reverbMix !== undefined && this.reverbWet && this.reverbDry) {
                const wetLevel = params.reverbMix / 100;
                this.reverbWet.gain.value = wetLevel;
                this.reverbDry.gain.value = 1 - wetLevel;
            }
        },

        /**
         * Clean up
         */
        destroy() {
            this.voices.forEach(v => v.cleanup());
            this.voices = [];
            this._initialized = false;
        }
    };

})(window.APP);
