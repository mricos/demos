/**
 * DivGraphics - Audio Engine
 * Web Audio API synthesis with brown noise, bandpass filters, and sawtooth oscillator
 * Driven by chaser position for Doppler-like effects and sphere hum
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.AudioEngine = {
        ctx: null,                    // AudioContext
        masterGain: null,             // Master volume

        // Chaser audio chain: noise -> bandpass -> stereo panner -> gain (flyby whoosh)
        chaserNoise: null,            // Brown noise generator (AudioWorklet or ScriptProcessor)
        chaserFilter: null,           // BiquadFilter for bandpass
        chaserPanner: null,           // StereoPannerNode
        chaserGain: null,             // GainNode for chaser volume

        // Chaser engine rumble: sawtooth + noise -> filter -> panner -> gain
        engineOsc: null,              // Low frequency sawtooth
        engineOsc2: null,             // Second detuned oscillator for thickness
        engineNoiseGain: null,        // Noise component for texture
        engineFilter: null,           // Lowpass filter
        enginePanner: null,           // Stereo panner (follows chaser)
        engineGain: null,             // Engine volume

        // Sphere audio chain: sawtooth -> filter -> gain
        sphereOsc: null,              // OscillatorNode (sawtooth)
        sphereFilter: null,           // BiquadFilter for filtering
        sphereGain: null,             // GainNode for sphere volume
        sphereLfoGain: null,          // Gain modulation for pulsing

        // Cabin audio chain: noise -> lowpass -> gain (for follow mode rattle)
        cabinNoiseBuffer: null,
        cabinNoiseSource: null,
        cabinFilter: null,
        cabinGain: null,
        _cabinTargetGain: 0,          // Target gain for smooth fade

        // Internal LFO for sphere pulsing
        _sphereLfoPhase: 0,
        spherePulse: 1,              // Current pulse value (0-1) for visual sync
        _pulseCurve: null,           // ValueMap for smooth pulse shaping

        // Distance-based LFO values (exported for binding)
        chaserProximity: 0,          // 0-1: 1 = close, 0 = far
        chaserPanLR: 0,              // -1 to +1: stereo position
        _proximityMap: null,         // ValueMap for proximity curve
        _panMap: null,               // ValueMap for pan curve

        // ADSR envelope for sphere
        _sphereEnvelope: null,
        _sphereAudioEnabled: false,  // Track sphere audio state for ADSR trigger

        // Brown noise buffer
        _noiseBuffer: null,
        _noiseSource: null,

        init() {
            this._subscribe();
            this._createValueMaps();
            // Don't auto-start - wait for user gesture via enable toggle
        },

        /**
         * Create ValueMaps for smooth curve shaping
         */
        _createValueMaps() {
            // Sphere pulse: S-curve for smooth fade (not abrupt flash)
            this._pulseCurve = APP.ValueMap?.create({
                curve: 'scurve',  // Smooth ease in-out
                inMin: 0, inMax: 1,
                outMin: 0, outMax: 1
            });

            // Proximity: exponential falloff (louder when close)
            this._proximityMap = APP.ValueMap?.createProximity({
                maxDistance: 300,
                curve: 'exp',
                outMin: 0, outMax: 1
            });

            // Pan: gentle curve for stereo spread
            this._panMap = APP.ValueMap?.createBipolar({
                deadzone: 0.02,
                curve: 'pan',
                outMin: -1, outMax: 1
            });
        },

        /**
         * Create AudioContext and all nodes (called on first enable)
         */
        _createContext() {
            if (this.ctx) return;

            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();

                // Master gain - restore from state
                const masterVol = APP.State?.select('audio.masterVolume') ?? 30;
                this.masterGain = this.ctx.createGain();
                this.masterGain.connect(this.ctx.destination);
                this.masterGain.gain.value = masterVol / 100;

                // Only sphere - with smooth gain
                this._createSphereChain();

                // Initialize particle cluster synth (triggered by collisions)
                this._initClusterSynth();

                console.log('[AudioEngine] Context created - sphere + cluster synth');
            } catch (e) {
                console.error('[AudioEngine] Failed to create AudioContext:', e);
            }
        },

        /**
         * Create brown noise -> bandpass -> panner -> gain chain for chaser
         */
        _createChaserChain() {
            const state = APP.State?.select('audio.chaser') || {};

            // Bandpass filter - sweepable for Doppler effect
            this.chaserFilter = this.ctx.createBiquadFilter();
            this.chaserFilter.type = 'bandpass';
            this.chaserFilter.frequency.value = state.filterFreq || 800;
            this.chaserFilter.Q.value = state.filterQ || 2;

            // Stereo panner
            this.chaserPanner = this.ctx.createStereoPanner();
            this.chaserPanner.pan.value = 0;

            // Chaser gain - start at 0 if disabled
            this.chaserGain = this.ctx.createGain();
            const chaserEnabled = state.enabled !== false;
            this.chaserGain.gain.value = chaserEnabled ? (state.volume ?? 50) / 100 : 0;

            // Connect chain: filter -> panner -> gain -> master
            this.chaserFilter.connect(this.chaserPanner);
            this.chaserPanner.connect(this.chaserGain);
            this.chaserGain.connect(this.masterGain);

            // Skip noise - just use engine oscillators for chaser sound
            // this._noiseBuffer = this._createBrownNoiseBuffer(5);
            // this._startNoiseSource();

            // Create engine rumble chain (clean oscillators only)
            this._createEngineChain();
        },

        /**
         * Create engine rumble - low freq oscillators for vehicle presence
         */
        _createEngineChain() {
            const state = APP.State?.select('audio.engine') || {};

            // Primary sawtooth oscillator - base rumble (use triangle for softer sound)
            this.engineOsc = this.ctx.createOscillator();
            this.engineOsc.type = 'triangle';
            this.engineOsc.frequency.value = state.baseFreq || 40;

            // Secondary oscillator - slightly detuned for thickness
            this.engineOsc2 = this.ctx.createOscillator();
            this.engineOsc2.type = 'triangle';
            this.engineOsc2.frequency.value = (state.baseFreq || 40) * 1.005; // Subtle detune

            // Mixer for oscillators - reduced level
            const oscMixer = this.ctx.createGain();
            oscMixer.gain.value = 0.25;

            // Add some noise for texture - very subtle
            this.engineNoiseGain = this.ctx.createGain();
            this.engineNoiseGain.gain.value = 0.05;

            // Lowpass filter to shape the rumble
            this.engineFilter = this.ctx.createBiquadFilter();
            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.value = state.filterFreq || 120;
            this.engineFilter.Q.value = 0.7; // Lower Q for smoother sound

            // Stereo panner - follows chaser position
            this.enginePanner = this.ctx.createStereoPanner();
            this.enginePanner.pan.value = 0;

            // Engine gain - start at 0 if disabled
            this.engineGain = this.ctx.createGain();
            const engineEnabled = state.enabled !== false;
            this.engineGain.gain.value = engineEnabled ? (state.volume ?? 20) / 100 : 0;

            // Connect oscillators to mixer
            this.engineOsc.connect(oscMixer);
            this.engineOsc2.connect(oscMixer);

            // Connect oscillators directly to filter (no noise)
            oscMixer.connect(this.engineFilter);

            // Connect chain: filter -> panner -> gain -> master
            this.engineFilter.connect(this.enginePanner);
            this.enginePanner.connect(this.engineGain);
            this.engineGain.connect(this.masterGain);

            // Start oscillators
            this.engineOsc.start();
            this.engineOsc2.start();
        },

        /**
         * Start or restart brown noise source (looping)
         */
        _startNoiseSource() {
            if (!this._noiseBuffer || !this.ctx) return;

            // Stop existing source
            if (this._noiseSource) {
                try { this._noiseSource.stop(); } catch(e) {}
            }

            this._noiseSource = this.ctx.createBufferSource();
            this._noiseSource.buffer = this._noiseBuffer;
            this._noiseSource.loop = true;
            this._noiseSource.connect(this.chaserFilter);
            this._noiseSource.start();
        },

        /**
         * Generate brown noise buffer (random walk) with seamless loop
         */
        _createBrownNoiseBuffer(durationSec) {
            const sampleRate = this.ctx.sampleRate;
            const frameCount = sampleRate * durationSec;
            const buffer = this.ctx.createBuffer(2, frameCount, sampleRate); // Stereo
            const fadeLen = Math.floor(sampleRate * 0.05); // 50ms crossfade

            for (let channel = 0; channel < 2; channel++) {
                const data = buffer.getChannelData(channel);
                let lastSample = 0;

                // Generate noise
                for (let i = 0; i < frameCount; i++) {
                    // Brown noise: integrate white noise
                    const white = Math.random() * 2 - 1;
                    lastSample = (lastSample + (0.02 * white)) / 1.02;
                    // Soft limit to prevent clipping (tanh saturation)
                    data[i] = Math.tanh(lastSample * 2) * 0.5;
                }

                // Crossfade end to start for seamless loop
                for (let i = 0; i < fadeLen; i++) {
                    const fadeOut = 1 - (i / fadeLen);
                    const fadeIn = i / fadeLen;
                    const endIdx = frameCount - fadeLen + i;
                    // Blend end into start
                    data[i] = data[i] * fadeIn + data[endIdx] * fadeOut;
                }
            }

            return buffer;
        },

        /**
         * Create sawtooth -> filter -> gain chain for sphere hum
         */
        _createSphereChain() {
            const state = APP.State?.select('audio.sphere') || {};

            // Sawtooth oscillator for buzzy hum
            this.sphereOsc = this.ctx.createOscillator();
            this.sphereOsc.type = 'sawtooth';
            this.sphereOsc.frequency.value = state.baseFreq || 55; // Low A

            // Filter to shape tone
            this.sphereFilter = this.ctx.createBiquadFilter();
            this.sphereFilter.type = 'lowpass';
            this.sphereFilter.frequency.value = state.filterFreq || 200;
            this.sphereFilter.Q.value = state.filterQ || 1;

            // LFO gain modulation (for pulsing)
            this.sphereLfoGain = this.ctx.createGain();
            this.sphereLfoGain.gain.value = 1;

            // Sphere master gain - starts at 0, ADSR will bring it up
            this.sphereGain = this.ctx.createGain();
            this.sphereGain.gain.value = 0;

            // Connect chain
            this.sphereOsc.connect(this.sphereFilter);
            this.sphereFilter.connect(this.sphereLfoGain);
            this.sphereLfoGain.connect(this.sphereGain);
            this.sphereGain.connect(this.masterGain);

            this.sphereOsc.start();

            // Create ADSR envelope for sphere
            this._sphereEnvelope = APP.ADSR?.create({
                attack: state.attack ?? 0.5,
                decay: state.decay ?? 0.3,
                sustain: (state.sustain ?? 80) / 100,
                release: state.release ?? 1.0
            });
        },

        /**
         * Initialize particle cluster synth for collision-triggered tines
         */
        _initClusterSynth() {
            if (!APP.ParticleClusterSynth) {
                console.warn('[AudioEngine] ParticleClusterSynth not loaded');
                return;
            }

            // Initialize with shared AudioContext and master gain
            APP.ParticleClusterSynth.init(this.ctx, this.masterGain);
        },

        /**
         * Create cabin noise chain - rattle/rumble for follow mode
         * Pink-ish noise with low frequency emphasis for mechanical feel
         */
        _createCabinChain() {
            const state = APP.State?.select('audio.cabin') || {};

            // Lowpass filter - keeps it rumbly
            this.cabinFilter = this.ctx.createBiquadFilter();
            this.cabinFilter.type = 'lowpass';
            this.cabinFilter.frequency.value = state.filterFreq || 150;
            this.cabinFilter.Q.value = state.filterQ || 0.7;

            // Second filter for more rumble character
            this.cabinFilter2 = this.ctx.createBiquadFilter();
            this.cabinFilter2.type = 'peaking';
            this.cabinFilter2.frequency.value = 60; // Boost low rumble
            this.cabinFilter2.Q.value = 1;
            this.cabinFilter2.gain.value = 6; // +6dB at 60Hz

            // Cabin gain - starts at 0, fades in when in follow mode
            this.cabinGain = this.ctx.createGain();
            this.cabinGain.gain.value = 0;

            // Connect chain: filter -> filter2 -> gain -> master
            this.cabinFilter.connect(this.cabinFilter2);
            this.cabinFilter2.connect(this.cabinGain);
            this.cabinGain.connect(this.masterGain);

            // Disable cabin noise - was causing clicks
            // this.cabinNoiseBuffer = this._createCabinNoiseBuffer(6);
            // this._startCabinNoiseSource();
        },

        /**
         * Generate cabin noise - smooth brown noise for cockpit rumble with seamless loop
         */
        _createCabinNoiseBuffer(durationSec) {
            const sampleRate = this.ctx.sampleRate;
            const frameCount = sampleRate * durationSec;
            const buffer = this.ctx.createBuffer(2, frameCount, sampleRate);
            const fadeLen = Math.floor(sampleRate * 0.1); // 100ms crossfade for smoother loop

            for (let channel = 0; channel < 2; channel++) {
                const data = buffer.getChannelData(channel);
                let lastSample = 0;

                for (let i = 0; i < frameCount; i++) {
                    // Brown noise with slower integration for deeper rumble
                    const white = Math.random() * 2 - 1;
                    lastSample = (lastSample + (0.015 * white)) / 1.015;
                    // Soft limit with tanh
                    data[i] = Math.tanh(lastSample * 1.5) * 0.4;
                }

                // Crossfade end to start for seamless loop
                for (let i = 0; i < fadeLen; i++) {
                    const fadeOut = 1 - (i / fadeLen);
                    const fadeIn = i / fadeLen;
                    const endIdx = frameCount - fadeLen + i;
                    data[i] = data[i] * fadeIn + data[endIdx] * fadeOut;
                }
            }

            return buffer;
        },

        /**
         * Start cabin noise source
         */
        _startCabinNoiseSource() {
            if (!this.cabinNoiseBuffer || !this.ctx || !this.cabinFilter) return;

            if (this.cabinNoiseSource) {
                try { this.cabinNoiseSource.stop(); } catch(e) {}
            }

            this.cabinNoiseSource = this.ctx.createBufferSource();
            this.cabinNoiseSource.buffer = this.cabinNoiseBuffer;
            this.cabinNoiseSource.loop = true;
            this.cabinNoiseSource.connect(this.cabinFilter);
            this.cabinNoiseSource.start();
        },

        /**
         * Enable/start audio
         */
        start() {
            console.log('[AudioEngine] start() called');

            if (!this.ctx) {
                this._createContext();
            }

            // Apply persisted state after context creation
            this._restoreFromState();

            if (this.ctx?.state === 'suspended') {
                console.log('[AudioEngine] Resuming suspended context');
                this.ctx.resume().then(() => {
                    console.log('[AudioEngine] Context resumed, state:', this.ctx.state);
                });
            }

            console.log('[AudioEngine] Context state:', this.ctx?.state);
        },

        /**
         * Apply persisted audio state after context creation
         */
        _restoreFromState() {
            if (!this.ctx) return;

            const audio = APP.State?.select('audio') || {};

            // Master volume
            if (this.masterGain && audio.masterVolume !== undefined) {
                this.masterGain.gain.value = audio.masterVolume / 100;
            }

            // Sphere params - ALL of them
            const sphere = audio.sphere || {};

            // Oscillator frequency
            if (this.sphereOsc && sphere.baseFreq !== undefined) {
                this.sphereOsc.frequency.value = sphere.baseFreq;
            }

            // Filter
            if (this.sphereFilter) {
                if (sphere.filterFreq !== undefined) {
                    this.sphereFilter.frequency.value = sphere.filterFreq;
                }
                if (sphere.filterQ !== undefined) {
                    this.sphereFilter.Q.value = sphere.filterQ;
                }
            }

            // ADSR envelope
            if (this._sphereEnvelope) {
                this._sphereEnvelope.setParams({
                    attack: sphere.attack ?? 0.5,
                    decay: sphere.decay ?? 0.3,
                    sustain: (sphere.sustain ?? 80) / 100,
                    release: sphere.release ?? 1.0
                });
            }

            // Store LFO params for use in update loop
            this._sphereLfoRate = sphere.lfoRate ?? 0.75;
            this._sphereLfoDepth = sphere.lfoDepth ?? 50;
            this._sphereVolume = sphere.volume ?? 15;

            console.log('[AudioEngine] Restored audio settings:', {
                masterVol: audio.masterVolume,
                sphereVol: sphere.volume,
                sphereFreq: sphere.baseFreq,
                lfoRate: sphere.lfoRate,
                lfoDepth: sphere.lfoDepth
            });
        },

        /**
         * Suspend audio (pause)
         */
        stop() {
            if (this.ctx?.state === 'running') {
                this.ctx.suspend();
            }
        },

        /**
         * Update audio based on chaser position - called from animation loop
         * @param {Object} chaserData - { pos, frame, t, velocity }
         * @param {Object} cameraData - { position, rotation }
         * @param {number} deltaMs - Time since last frame
         */
        update(chaserData, cameraData, deltaMs) {
            if (!this.ctx || this.ctx.state !== 'running') return;

            const audioState = APP.State?.select('audio');
            if (!audioState?.enabled) return;

            // Check if in follow mode
            const followMode = APP.State?.select('chaser.follow');

            // Update chaser audio (flyby sound - fade out in follow mode)
            if (audioState.chaser?.enabled && chaserData) {
                this._updateChaserAudio(chaserData, cameraData, deltaMs, followMode);
            }

            // Update engine rumble (always on, follows chaser position)
            if (audioState.engine?.enabled !== false && chaserData) {
                this._updateEngineAudio(chaserData, cameraData, deltaMs, followMode);
            }

            // Update cabin audio (cockpit rattle - fade in during follow mode)
            if (audioState.cabin?.enabled !== false) { // Default enabled
                this._updateCabinAudio(deltaMs, followMode, chaserData);
            }

            // Update sphere audio
            if (audioState.sphere?.enabled) {
                this._updateSphereAudio(deltaMs);
            }
        },

        /**
         * Update chaser audio - Doppler effect based on position
         * Also calculates and emits proximity/pan LFOs for external use
         */
        _updateChaserAudio(chaserData, cameraData, deltaMs, followMode) {
            const state = APP.State?.select('audio.chaser') || {};
            if (!chaserData?.pos) return;

            // Get camera position (default to origin if not available)
            const camPos = cameraData?.position || { x: 0, y: 0, z: 300 };

            // Calculate distance from camera to chaser
            const dx = chaserData.pos.x - camPos.x;
            const dy = chaserData.pos.y - camPos.y;
            const dz = chaserData.pos.z - camPos.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // === Calculate and emit proximity LFO (0-1, 1 = close) ===
            this.chaserProximity = this._proximityMap?.apply(distance) ?? Math.max(0, 1 - distance / 300);

            // === Calculate and emit stereo pan LFO (-1 to +1) ===
            const panRange = 250;  // Wider range for more pronounced panning
            const rawPan = dx / panRange;
            this.chaserPanLR = this._panMap?.apply(rawPan) ?? Math.max(-1, Math.min(1, rawPan));

            // Emit as LFO sources for external binding
            APP.InputHub?.emit('audio-lfo', 'continuous', 'chaserProximity', this.chaserProximity, {
                source: 'AudioEngine', type: 'proximity'
            });
            APP.InputHub?.emit('audio-lfo', 'continuous', 'chaserPan', (this.chaserPanLR + 1) / 2, {
                source: 'AudioEngine', type: 'pan'  // Normalize to 0-1 for binding
            });

            // In follow mode, fade out the external chaser sound
            if (followMode) {
                if (this.chaserGain) {
                    const currentVol = this.chaserGain.gain.value;
                    this.chaserGain.gain.value = currentVol * 0.95; // Fade out
                }
                return;
            }

            // === Apply STRONG stereo panning ===
            const maxPan = state.stereoWidth ?? 90;  // Default to 90% width
            const pan = this.chaserPanLR * (maxPan / 100);

            // Smooth pan changes (faster response for more pronounced effect)
            if (this.chaserPanner) {
                const currentPan = this.chaserPanner.pan.value;
                const smoothPan = currentPan + (pan - currentPan) * 0.2;  // Faster smoothing
                this.chaserPanner.pan.value = smoothPan;
            }

            // Filter frequency based on distance (Doppler-like effect)
            // Close = high freq (passing by), far = low freq (muffled)
            const minFreq = state.filterMin || 200;
            const maxFreq = state.filterMax || 2000;

            // Use proximity for filter (curved falloff)
            const filterT = this.chaserProximity;

            // Use velocity for true Doppler (approaching = higher, receding = lower)
            let dopplerShift = 1;
            if (chaserData.velocity) {
                // Radial velocity (towards camera = negative)
                const radialVel = (dx * chaserData.velocity.x +
                                   dy * chaserData.velocity.y +
                                   dz * chaserData.velocity.z) / (distance || 1);
                // Scale: moving away lowers pitch, moving towards raises
                const speedOfSound = 343; // m/s (scaled down for effect)
                const scaledVel = radialVel * 0.5; // Scale factor for noticeable effect
                dopplerShift = Math.max(0.5, Math.min(2, 1 - scaledVel / speedOfSound));
            }

            // Base frequency from proximity (close = bright, far = muffled), modified by Doppler
            const baseFilterFreq = minFreq + (maxFreq - minFreq) * filterT;
            const targetFreq = baseFilterFreq * dopplerShift;

            if (this.chaserFilter) {
                // Smooth frequency changes
                const currentFreq = this.chaserFilter.frequency.value;
                const smoothFreq = currentFreq + (targetFreq - currentFreq) * 0.15;
                this.chaserFilter.frequency.value = Math.max(minFreq, Math.min(maxFreq, smoothFreq));
                this.chaserFilter.Q.value = state.filterQ || 2;
            }

            // Volume based on proximity (closer = louder, using curved proximity)
            const baseVolume = (state.volume ?? 50) / 100;

            if (this.chaserGain) {
                const targetVol = baseVolume * this.chaserProximity;
                const currentVol = this.chaserGain.gain.value;
                this.chaserGain.gain.value = currentVol + (targetVol - currentVol) * 0.12;
            }
        },

        /**
         * Update engine rumble - follows chaser with pitch modulation
         */
        _updateEngineAudio(chaserData, cameraData, deltaMs, followMode) {
            if (!this.engineGain || !chaserData?.pos) return;

            const state = APP.State?.select('audio.engine') || {};
            const baseVolume = (state.volume ?? 35) / 100;
            const baseFreq = state.baseFreq || 40;

            // Get camera position
            const camPos = cameraData?.position || { x: 0, y: 0, z: 300 };

            // Calculate distance for volume and panning
            const dx = chaserData.pos.x - camPos.x;
            const dy = chaserData.pos.y - camPos.y;
            const dz = chaserData.pos.z - camPos.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const distanceNorm = Math.min(1, distance / 400);

            // In follow mode, engine is close and constant
            let targetVol, targetPan, targetFreq;

            if (followMode) {
                // Inside the vehicle - steady engine sound
                targetVol = baseVolume * 0.6; // Quieter inside
                targetPan = 0; // Centered
                targetFreq = baseFreq;
            } else {
                // External view - distance based
                const distanceAtten = 1 / (1 + distanceNorm * 1.5);
                targetVol = baseVolume * distanceAtten;

                // Panning based on position
                const panRange = 200;
                targetPan = Math.max(-1, Math.min(1, dx / panRange));

                // Pitch varies slightly with speed (higher when faster)
                let speedFactor = 1;
                if (chaserData.velocity) {
                    const vel = chaserData.velocity;
                    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
                    speedFactor = 1 + (speed / 1000) * 0.3; // Up to 30% pitch increase
                }
                targetFreq = baseFreq * speedFactor;
            }

            // Smooth all parameters
            if (this.engineGain) {
                const currentVol = this.engineGain.gain.value;
                this.engineGain.gain.value = currentVol + (targetVol - currentVol) * 0.08;
            }

            if (this.enginePanner) {
                const currentPan = this.enginePanner.pan.value;
                this.enginePanner.pan.value = currentPan + (targetPan - currentPan) * 0.1;
            }

            if (this.engineOsc) {
                const currentFreq = this.engineOsc.frequency.value;
                const smoothFreq = currentFreq + (targetFreq - currentFreq) * 0.05;
                this.engineOsc.frequency.value = smoothFreq;
                this.engineOsc2.frequency.value = smoothFreq * 1.01; // Keep detune
            }

            // Update filter
            if (this.engineFilter) {
                this.engineFilter.frequency.value = state.filterFreq || 120;
            }
        },

        /**
         * Update cabin audio - cockpit rattle in follow mode
         */
        _updateCabinAudio(deltaMs, followMode, chaserData) {
            if (!this.cabinGain) return;

            const state = APP.State?.select('audio.cabin') || {};
            const baseVolume = (state.volume ?? 40) / 100;

            // Target gain: full volume in follow mode, zero otherwise
            let targetGain = followMode ? baseVolume : 0;

            // Modulate cabin noise based on speed/acceleration for more realism
            if (followMode && chaserData?.velocity) {
                const vel = chaserData.velocity;
                const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
                // More rumble at higher speeds
                const speedFactor = Math.min(1.5, 0.7 + speed / 500);
                targetGain *= speedFactor;
            }

            // Smooth fade in/out
            const currentGain = this.cabinGain.gain.value;
            const fadeSpeed = followMode ? 0.08 : 0.03; // Faster fade in, slower fade out
            this.cabinGain.gain.value = currentGain + (targetGain - currentGain) * fadeSpeed;

            // Update filter based on state
            if (this.cabinFilter) {
                this.cabinFilter.frequency.value = state.filterFreq || 150;
            }
        },

        /**
         * Update sphere audio - pulsing hum (using setTargetAtTime for click-free)
         */
        _updateSphereAudio(deltaMs) {
            const state = APP.State?.select('audio.sphere') || {};
            const sphereEnabled = APP.State?.select('sphere.enabled');
            const sphereAudioEnabled = state.enabled !== false;
            const shouldPlay = sphereEnabled && sphereAudioEnabled;

            // Update ADSR params if they changed
            if (this._sphereEnvelope) {
                this._sphereEnvelope.setParams({
                    attack: state.attack ?? 0.5,
                    decay: state.decay ?? 0.3,
                    sustain: (state.sustain ?? 80) / 100,
                    release: state.release ?? 1.0
                });
            }

            const now = this.ctx?.currentTime || 0;
            const baseFreq = state.baseFreq || 55;
            const filterFreq = state.filterFreq || 150;
            const peakVol = (state.volume ?? 15) / 100;
            const attack = state.attack ?? 0.5;
            const decay = state.decay ?? 0.3;
            const release = state.release ?? 1.0;

            // Handle ADSR trigger/release with frequency sweep
            if (shouldPlay && !this._sphereAudioEnabled) {
                // === POWER UP: Volume + Frequency + Filter sweep ===

                // Volume: Attack -> Decay -> Sustain
                if (this._sphereEnvelope && this.sphereGain) {
                    this._sphereEnvelope.trigger(this.sphereGain.gain, peakVol, 0, this.ctx);
                }

                // Frequency: Start low, sweep up to target during attack
                if (this.sphereOsc) {
                    const startFreqHz = state.startFreq ?? 27;
                    const overshootFreqHz = state.overshootFreq ?? 60;
                    this.sphereOsc.frequency.cancelScheduledValues(now);
                    this.sphereOsc.frequency.setValueAtTime(startFreqHz, now);
                    this.sphereOsc.frequency.exponentialRampToValueAtTime(overshootFreqHz, now + attack);
                    this.sphereOsc.frequency.exponentialRampToValueAtTime(baseFreq, now + attack + decay);
                }

                // Filter: Start muffled, open up during attack
                if (this.sphereFilter) {
                    const startFilterHz = state.startFilter ?? 45;
                    const overshootFilterHz = state.overshootFilter ?? 225;
                    this.sphereFilter.frequency.cancelScheduledValues(now);
                    this.sphereFilter.frequency.setValueAtTime(startFilterHz, now);
                    this.sphereFilter.frequency.exponentialRampToValueAtTime(overshootFilterHz, now + attack);
                    this.sphereFilter.frequency.exponentialRampToValueAtTime(filterFreq, now + attack + decay);
                }

                this._sphereAudioEnabled = true;

            } else if (!shouldPlay && this._sphereAudioEnabled) {
                // === POWER DOWN: Reverse sweep - volume down, frequency down, filter closes ===

                // Volume: Release to zero
                if (this._sphereEnvelope && this.sphereGain) {
                    this._sphereEnvelope.release(this.sphereGain.gain, 0, this.ctx);
                }

                // Frequency: Sweep down during release (like powering down)
                if (this.sphereOsc) {
                    const currentFreq = this.sphereOsc.frequency.value;
                    this.sphereOsc.frequency.cancelScheduledValues(now);
                    this.sphereOsc.frequency.setValueAtTime(currentFreq, now);
                    this.sphereOsc.frequency.exponentialRampToValueAtTime(Math.max(20, baseFreq * 0.3), now + release);
                }

                // Filter: Close down during release (muffled fade)
                if (this.sphereFilter) {
                    const currentFilter = this.sphereFilter.frequency.value;
                    this.sphereFilter.frequency.cancelScheduledValues(now);
                    this.sphereFilter.frequency.setValueAtTime(currentFilter, now);
                    this.sphereFilter.frequency.exponentialRampToValueAtTime(Math.max(50, filterFreq * 0.2), now + release);
                }

                this._sphereAudioEnabled = false;
            } else if (shouldPlay) {
                // === RUNNING: Smooth updates to frequency/filter if user changes them ===
                const rampTime = 0.1;
                if (this.sphereOsc) {
                    this.sphereOsc.frequency.setTargetAtTime(baseFreq, now, rampTime);
                }
                if (this.sphereFilter) {
                    this.sphereFilter.frequency.setTargetAtTime(filterFreq, now, rampTime);
                }
            }

            // === LFO for audio pulsing + emit to InputHub ===
            if (shouldPlay) {
                const lfoRate = state.lfoRate ?? 0.75;
                const lfoDepth = (state.lfoDepth ?? 50) / 100;

                this._sphereLfoPhase += (deltaMs / 1000) * lfoRate * Math.PI * 2;
                while (this._sphereLfoPhase > Math.PI * 2) {
                    this._sphereLfoPhase -= Math.PI * 2;
                }

                // Raw sine pulse (0-1)
                const rawPulse = 0.5 + 0.5 * Math.sin(this._sphereLfoPhase);

                // Apply S-curve for smooth fade
                const pulse = this._pulseCurve?.apply(rawPulse) ?? rawPulse;

                // Modulate audio gain
                const lfoGain = 1 - lfoDepth + lfoDepth * pulse;
                if (this.sphereLfoGain) {
                    this.sphereLfoGain.gain.setTargetAtTime(lfoGain, now, 0.05);
                }

                // Emit to InputHub as LFO source - can be mapped to any parameter
                APP.InputHub?.emit('audio-lfo', 'continuous', 'spherePulse', pulse, {
                    source: 'AudioEngine',
                    type: 'sphereLFO'
                });
            }

        },

        /**
         * Set master volume
         */
        setMasterVolume(vol) {
            if (this.masterGain) {
                this.masterGain.gain.value = vol / 100;
            }
        },

        /**
         * Update chaser parameters directly
         */
        setChaserParams(params) {
            if (params.enabled !== undefined && this.chaserGain && this.ctx) {
                const vol = (APP.State?.select('audio.chaser.volume') ?? 50) / 100;
                if (params.enabled) {
                    const attack = APP.State?.select('audio.chaser.attack') ?? 0.1;
                    APP.ADSR?.trigger(this.chaserGain.gain, vol, attack, this.ctx);
                } else {
                    const release = APP.State?.select('audio.chaser.release') ?? 0.3;
                    const now = this.ctx.currentTime;
                    this.chaserGain.gain.cancelScheduledValues(now);
                    this.chaserGain.gain.setValueAtTime(this.chaserGain.gain.value, now);
                    this.chaserGain.gain.setTargetAtTime(0, now, release / 3);
                }
            }
            if (params.filterFreq !== undefined && this.chaserFilter) {
                this.chaserFilter.frequency.value = params.filterFreq;
            }
            if (params.filterQ !== undefined && this.chaserFilter) {
                this.chaserFilter.Q.value = params.filterQ;
            }
            if (params.volume !== undefined && this.chaserGain) {
                // Only set volume if enabled
                const enabled = APP.State?.select('audio.chaser.enabled') !== false;
                if (enabled) {
                    this.chaserGain.gain.value = params.volume / 100;
                }
            }
            if (params.pan !== undefined && this.chaserPanner) {
                this.chaserPanner.pan.value = params.pan;
            }
        },

        /**
         * Update sphere parameters directly
         */
        setSphereParams(params) {
            if (params.enabled !== undefined && this.sphereGain && this.ctx) {
                const state = APP.State?.select('audio.sphere') || {};
                if (params.enabled) {
                    // Let _updateSphereAudio handle trigger (includes frequency sweep)
                    // Don't set _sphereAudioEnabled here - _updateSphereAudio will set it
                } else {
                    // ADSR release - smooth exponential decay
                    const release = state.release ?? 1.0;
                    const baseFreq = state.baseFreq || 55;
                    const filterFreq = state.filterFreq || 150;
                    const now = this.ctx.currentTime;

                    // Volume fade
                    this.sphereGain.gain.cancelScheduledValues(now);
                    this.sphereGain.gain.setValueAtTime(this.sphereGain.gain.value, now);
                    this.sphereGain.gain.setTargetAtTime(0, now, release / 3);

                    // Frequency power-down sweep
                    if (this.sphereOsc) {
                        this.sphereOsc.frequency.cancelScheduledValues(now);
                        this.sphereOsc.frequency.setValueAtTime(this.sphereOsc.frequency.value, now);
                        this.sphereOsc.frequency.exponentialRampToValueAtTime(Math.max(20, baseFreq * 0.3), now + release);
                    }

                    // Filter power-down sweep
                    if (this.sphereFilter) {
                        this.sphereFilter.frequency.cancelScheduledValues(now);
                        this.sphereFilter.frequency.setValueAtTime(this.sphereFilter.frequency.value, now);
                        this.sphereFilter.frequency.exponentialRampToValueAtTime(Math.max(50, filterFreq * 0.2), now + release);
                    }

                    this._sphereAudioEnabled = false;
                }
            }
            if (params.baseFreq !== undefined && this.sphereOsc) {
                this.sphereOsc.frequency.value = params.baseFreq;
            }
            if (params.filterFreq !== undefined && this.sphereFilter) {
                this.sphereFilter.frequency.value = params.filterFreq;
            }
            if (params.filterQ !== undefined && this.sphereFilter) {
                this.sphereFilter.Q.value = params.filterQ;
            }
            if (params.volume !== undefined && this.sphereGain) {
                // Only set volume if enabled
                const enabled = APP.State?.select('audio.sphere.enabled') !== false;
                if (enabled) {
                    this.sphereGain.gain.value = params.volume / 100;
                }
            }
        },

        /**
         * Update engine parameters directly
         */
        setEngineParams(params) {
            if (params.enabled !== undefined && this.engineGain && this.ctx) {
                const vol = (APP.State?.select('audio.engine.volume') ?? 40) / 100;
                if (params.enabled) {
                    const attack = APP.State?.select('audio.engine.attack') ?? 0.1;
                    APP.ADSR?.trigger(this.engineGain.gain, vol, attack, this.ctx);
                } else {
                    const release = APP.State?.select('audio.engine.release') ?? 0.3;
                    const now = this.ctx.currentTime;
                    this.engineGain.gain.cancelScheduledValues(now);
                    this.engineGain.gain.setValueAtTime(this.engineGain.gain.value, now);
                    this.engineGain.gain.setTargetAtTime(0, now, release / 3);
                }
            }
            if (params.volume !== undefined && this.engineGain) {
                const enabled = APP.State?.select('audio.engine.enabled') !== false;
                if (enabled) {
                    this.engineGain.gain.value = params.volume / 100;
                }
            }
        },

        /**
         * Update cabin parameters directly
         */
        setCabinParams(params) {
            if (params.enabled !== undefined && this.cabinGain && this.ctx) {
                const vol = (APP.State?.select('audio.cabin.volume') ?? 25) / 100;
                if (params.enabled) {
                    const attack = APP.State?.select('audio.cabin.attack') ?? 0.1;
                    APP.ADSR?.trigger(this.cabinGain.gain, vol, attack, this.ctx);
                } else {
                    const release = APP.State?.select('audio.cabin.release') ?? 0.3;
                    const now = this.ctx.currentTime;
                    this.cabinGain.gain.cancelScheduledValues(now);
                    this.cabinGain.gain.setValueAtTime(this.cabinGain.gain.value, now);
                    this.cabinGain.gain.setTargetAtTime(0, now, release / 3);
                }
            }
            if (params.volume !== undefined && this.cabinGain) {
                const enabled = APP.State?.select('audio.cabin.enabled') !== false;
                if (enabled) {
                    this.cabinGain.gain.value = params.volume / 100;
                }
            }
        },

        /**
         * Update cluster synth parameters
         */
        setClusterParams(params) {
            if (params.enabled !== undefined && APP.ParticleClusterSynth?.masterGain && this.ctx) {
                const vol = (APP.State?.select('audio.cluster.volume') ?? 30) / 100;
                if (params.enabled) {
                    const attack = APP.State?.select('audio.cluster.attack') ?? 0.01;
                    APP.ADSR?.trigger(APP.ParticleClusterSynth.masterGain.gain, vol, attack, this.ctx);
                } else {
                    const release = APP.State?.select('audio.cluster.release') ?? 1.5;
                    const now = this.ctx.currentTime;
                    const gain = APP.ParticleClusterSynth.masterGain.gain;
                    gain.cancelScheduledValues(now);
                    gain.setValueAtTime(gain.value, now);
                    gain.setTargetAtTime(0, now, release / 3);
                }
            }
            if (params.volume !== undefined && APP.ParticleClusterSynth?.masterGain) {
                const enabled = APP.State?.select('audio.cluster.enabled') !== false;
                if (enabled) {
                    APP.ParticleClusterSynth.setParams({ volume: params.volume });
                }
            }
        },

        _subscribe() {
            // React to audio enable toggle
            APP.State?.subscribe('audio.enabled', (enabled) => {
                if (enabled) {
                    this.start();
                } else {
                    this.stop();
                }
            });

            // React to master volume
            APP.State?.subscribe('audio.masterVolume', (vol) => {
                this.setMasterVolume(vol);
            });

            // React to chaser audio params
            APP.State?.subscribe('audio.chaser.*', (val, state, meta) => {
                const path = meta.path.split('.').pop();
                this.setChaserParams({ [path]: val });
            });

            // React to sphere audio params
            APP.State?.subscribe('audio.sphere.*', (val, state, meta) => {
                const path = meta.path.split('.').pop();
                this.setSphereParams({ [path]: val });
            });

            // React to engine audio params
            APP.State?.subscribe('audio.engine.*', (val, state, meta) => {
                const path = meta.path.split('.').pop();
                this.setEngineParams({ [path]: val });
            });

            // React to cabin audio params
            APP.State?.subscribe('audio.cabin.*', (val, state, meta) => {
                const path = meta.path.split('.').pop();
                this.setCabinParams({ [path]: val });
            });

            // React to cluster synth params
            APP.State?.subscribe('audio.cluster.*', (val, state, meta) => {
                const path = meta.path.split('.').pop();
                this.setClusterParams({ [path]: val });
            });
        },

        /**
         * Clean up
         */
        destroy() {
            if (this.sphereOsc) {
                this.sphereOsc.stop();
            }
            if (this._noiseSource) {
                this._noiseSource.stop();
            }
            // Clean up cluster synth
            APP.ParticleClusterSynth?.destroy();

            if (this.ctx) {
                this.ctx.close();
            }
            this.ctx = null;
        }
    };

})(window.APP);
