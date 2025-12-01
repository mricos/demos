/**
 * DivGraphics - Audio UI
 * User interface for the AUDIO section
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.AudioUI = {
        container: null,
        _pulseBarEl: null,
        _pulseValueEl: null,

        init() {
            this._bindControls();
            this._restoreFromState();
            this._subscribe();
            this._initPulseIndicator();
        },

        _bindControls() {
            // Master controls
            this._bindCheckbox('audioEnabled', 'audio.enabled');
            this._bindRange('audioMasterVolume', 'audio.masterVolume', v => `${v}%`);

            // Chaser controls (ghost button toggle)
            this._bindToggleButton('audioChaserEnabled', 'audio.chaser.enabled');
            this._bindRange('audioChaserVolume', 'audio.chaser.volume', v => `${v}%`);
            this._bindRange('audioChaserFilterMin', 'audio.chaser.filterMin', v => `${v}Hz`);
            this._bindRange('audioChaserFilterMax', 'audio.chaser.filterMax', v => `${v}Hz`);
            this._bindRange('audioChaserFilterQ', 'audio.chaser.filterQ', v => v.toFixed(1));
            this._bindRange('audioChaserStereoWidth', 'audio.chaser.stereoWidth', v => `${v}%`);

            // Sphere controls (ghost button toggle)
            this._bindToggleButton('audioSphereEnabled', 'audio.sphere.enabled');
            this._bindRange('audioSphereVolume', 'audio.sphere.volume', v => `${v}%`);
            this._bindRange('audioSphereBaseFreq', 'audio.sphere.baseFreq', v => `${v}Hz`);
            this._bindRange('audioSphereFilterFreq', 'audio.sphere.filterFreq', v => `${v}Hz`);
            this._bindRange('audioSphereFilterQ', 'audio.sphere.filterQ', v => v.toFixed(1));
            this._bindRange('audioSphereLfoRate', 'audio.sphere.lfoRate', v => `${v.toFixed(2)}Hz`);
            this._bindRange('audioSphereLfoDepth', 'audio.sphere.lfoDepth', v => `${v}%`);
            // ADSR envelope
            this._bindRange('audioSphereAttack', 'audio.sphere.attack', v => `${v.toFixed(2)}s`);
            this._bindRange('audioSphereDecay', 'audio.sphere.decay', v => `${v.toFixed(2)}s`);
            this._bindRange('audioSphereSustain', 'audio.sphere.sustain', v => `${v}%`);
            this._bindRange('audioSphereRelease', 'audio.sphere.release', v => `${v.toFixed(2)}s`);
            // Startup sweep
            this._bindRange('audioSphereStartFreq', 'audio.sphere.startFreq', v => `${v}Hz`);
            this._bindRange('audioSphereOvershootFreq', 'audio.sphere.overshootFreq', v => `${v}Hz`);
            this._bindRange('audioSphereStartFilter', 'audio.sphere.startFilter', v => `${v}Hz`);
            this._bindRange('audioSphereOvershootFilter', 'audio.sphere.overshootFilter', v => `${v}Hz`);

            // Cabin controls (ghost button toggle)
            this._bindToggleButton('audioCabinEnabled', 'audio.cabin.enabled');
            this._bindRange('audioCabinVolume', 'audio.cabin.volume', v => `${v}%`);
            this._bindRange('audioCabinFilterFreq', 'audio.cabin.filterFreq', v => `${v}Hz`);

            // Engine controls (ghost button toggle)
            this._bindToggleButton('audioEngineEnabled', 'audio.engine.enabled');
            this._bindRange('audioEngineVolume', 'audio.engine.volume', v => `${v}%`);
            this._bindRange('audioEngineBaseFreq', 'audio.engine.baseFreq', v => `${v}Hz`);
            this._bindRange('audioEngineFilterFreq', 'audio.engine.filterFreq', v => `${v}Hz`);

            // Cluster controls (ghost button toggle)
            this._bindToggleButton('audioClusterEnabled', 'audio.cluster.enabled');
            this._bindRange('audioClusterVolume', 'audio.cluster.volume', v => `${v}%`);
            this._bindRange('audioClusterBaseFreq', 'audio.cluster.baseFreq', v => `${v}Hz`);
            this._bindRange('audioClusterSize', 'audio.cluster.clusterSize', v => v);
            this._bindRange('audioClusterDetune', 'audio.cluster.detune', v => `${v}¢`);
            this._bindRange('audioClusterFilterFreq', 'audio.cluster.filterFreq', v => `${v}Hz`);
            // ADSR envelope
            this._bindRange('audioClusterAttack', 'audio.cluster.attack', v => `${v.toFixed(2)}s`);
            this._bindRange('audioClusterDecay', 'audio.cluster.decay', v => `${v.toFixed(2)}s`);
            this._bindRange('audioClusterSustain', 'audio.cluster.sustain', v => `${v}%`);
            this._bindRange('audioClusterRelease', 'audio.cluster.release', v => `${v.toFixed(2)}s`);
            this._bindRange('audioClusterHold', 'audio.cluster.hold', v => `${v}ms`);
            // Reverb
            this._bindRange('audioClusterReverbMix', 'audio.cluster.reverbMix', v => `${v}%`);
            this._bindRange('audioClusterReverbDamping', 'audio.cluster.reverbDamping', v => `${v}Hz`);
        },

        _bindCheckbox(elementId, statePath) {
            const el = document.getElementById(elementId);
            if (!el) return;

            el.addEventListener('change', () => {
                APP.State?.dispatch({ type: statePath, payload: el.checked });
            });
        },

        /**
         * Bind a ghost button toggle (ON/OFF button instead of checkbox)
         */
        _bindToggleButton(elementId, statePath) {
            const el = document.getElementById(elementId);
            if (!el) return;

            el.addEventListener('click', () => {
                const isActive = el.classList.contains('active');
                const newState = !isActive;

                // Update button state
                el.classList.toggle('active', newState);
                el.textContent = newState ? 'ON' : 'OFF';

                // Dispatch to state
                APP.State?.dispatch({ type: statePath, payload: newState });
            });
        },

        _bindRange(elementId, statePath, formatter = v => v) {
            const el = document.getElementById(elementId);
            const valueEl = document.getElementById(elementId + 'Value');
            if (!el) return;

            el.addEventListener('input', () => {
                const val = parseFloat(el.value);
                APP.State?.dispatch({ type: statePath, payload: val });
                if (valueEl) {
                    valueEl.textContent = formatter(val);
                }
            });
        },

        _restoreFromState() {
            // Master
            this._restoreCheckbox('audioEnabled', 'audio.enabled');
            this._restoreRange('audioMasterVolume', 'audio.masterVolume', v => `${v}%`);

            // Chaser (toggle button)
            this._restoreToggleButton('audioChaserEnabled', 'audio.chaser.enabled');
            this._restoreRange('audioChaserVolume', 'audio.chaser.volume', v => `${v}%`);
            this._restoreRange('audioChaserFilterMin', 'audio.chaser.filterMin', v => `${v}Hz`);
            this._restoreRange('audioChaserFilterMax', 'audio.chaser.filterMax', v => `${v}Hz`);
            this._restoreRange('audioChaserFilterQ', 'audio.chaser.filterQ', v => v.toFixed(1));
            this._restoreRange('audioChaserStereoWidth', 'audio.chaser.stereoWidth', v => `${v}%`);

            // Sphere (toggle button)
            this._restoreToggleButton('audioSphereEnabled', 'audio.sphere.enabled');
            this._restoreRange('audioSphereVolume', 'audio.sphere.volume', v => `${v}%`);
            this._restoreRange('audioSphereBaseFreq', 'audio.sphere.baseFreq', v => `${v}Hz`);
            this._restoreRange('audioSphereFilterFreq', 'audio.sphere.filterFreq', v => `${v}Hz`);
            this._restoreRange('audioSphereFilterQ', 'audio.sphere.filterQ', v => v.toFixed(1));
            this._restoreRange('audioSphereLfoRate', 'audio.sphere.lfoRate', v => `${v.toFixed(2)}Hz`);
            this._restoreRange('audioSphereLfoDepth', 'audio.sphere.lfoDepth', v => `${v}%`);
            // ADSR envelope
            this._restoreRange('audioSphereAttack', 'audio.sphere.attack', v => `${v.toFixed(2)}s`);
            this._restoreRange('audioSphereDecay', 'audio.sphere.decay', v => `${v.toFixed(2)}s`);
            this._restoreRange('audioSphereSustain', 'audio.sphere.sustain', v => `${v}%`);
            this._restoreRange('audioSphereRelease', 'audio.sphere.release', v => `${v.toFixed(2)}s`);
            // Startup sweep
            this._restoreRange('audioSphereStartFreq', 'audio.sphere.startFreq', v => `${v}Hz`);
            this._restoreRange('audioSphereOvershootFreq', 'audio.sphere.overshootFreq', v => `${v}Hz`);
            this._restoreRange('audioSphereStartFilter', 'audio.sphere.startFilter', v => `${v}Hz`);
            this._restoreRange('audioSphereOvershootFilter', 'audio.sphere.overshootFilter', v => `${v}Hz`);

            // Cabin (toggle button)
            this._restoreToggleButton('audioCabinEnabled', 'audio.cabin.enabled');
            this._restoreRange('audioCabinVolume', 'audio.cabin.volume', v => `${v}%`);
            this._restoreRange('audioCabinFilterFreq', 'audio.cabin.filterFreq', v => `${v}Hz`);

            // Engine (toggle button)
            this._restoreToggleButton('audioEngineEnabled', 'audio.engine.enabled');
            this._restoreRange('audioEngineVolume', 'audio.engine.volume', v => `${v}%`);
            this._restoreRange('audioEngineBaseFreq', 'audio.engine.baseFreq', v => `${v}Hz`);
            this._restoreRange('audioEngineFilterFreq', 'audio.engine.filterFreq', v => `${v}Hz`);

            // Cluster (toggle button)
            this._restoreToggleButton('audioClusterEnabled', 'audio.cluster.enabled');
            this._restoreRange('audioClusterVolume', 'audio.cluster.volume', v => `${v}%`);
            this._restoreRange('audioClusterBaseFreq', 'audio.cluster.baseFreq', v => `${v}Hz`);
            this._restoreRange('audioClusterSize', 'audio.cluster.clusterSize', v => v);
            this._restoreRange('audioClusterDetune', 'audio.cluster.detune', v => `${v}¢`);
            this._restoreRange('audioClusterFilterFreq', 'audio.cluster.filterFreq', v => `${v}Hz`);
            // ADSR envelope
            this._restoreRange('audioClusterAttack', 'audio.cluster.attack', v => `${v.toFixed(2)}s`);
            this._restoreRange('audioClusterDecay', 'audio.cluster.decay', v => `${v.toFixed(2)}s`);
            this._restoreRange('audioClusterSustain', 'audio.cluster.sustain', v => `${v}%`);
            this._restoreRange('audioClusterRelease', 'audio.cluster.release', v => `${v.toFixed(2)}s`);
            this._restoreRange('audioClusterHold', 'audio.cluster.hold', v => `${v}ms`);
            // Reverb
            this._restoreRange('audioClusterReverbMix', 'audio.cluster.reverbMix', v => `${v}%`);
            this._restoreRange('audioClusterReverbDamping', 'audio.cluster.reverbDamping', v => `${v}Hz`);
        },

        _restoreCheckbox(elementId, statePath) {
            const el = document.getElementById(elementId);
            if (!el) return;
            const val = APP.State?.select(statePath);
            if (val !== undefined) {
                el.checked = val;
            }
        },

        /**
         * Restore toggle button state from state
         */
        _restoreToggleButton(elementId, statePath) {
            const el = document.getElementById(elementId);
            if (!el) return;
            const val = APP.State?.select(statePath);
            if (val !== undefined) {
                el.classList.toggle('active', val);
                el.textContent = val ? 'ON' : 'OFF';
            }
        },

        _restoreRange(elementId, statePath, formatter = v => v) {
            const el = document.getElementById(elementId);
            const valueEl = document.getElementById(elementId + 'Value');
            if (!el) return;

            const val = APP.State?.select(statePath);
            if (val !== undefined) {
                el.value = val;
                if (valueEl) {
                    valueEl.textContent = formatter(val);
                }
            }
        },

        _subscribe() {
            // Update UI when state changes externally (from MIDI/LFO mappings)
            APP.State?.subscribe('audio.*', (val, state, meta) => {
                const path = meta.path;

                // Map state path to element ID
                const elementId = this._pathToElementId(path);
                const el = document.getElementById(elementId);
                if (!el) return;

                if (el.type === 'checkbox') {
                    el.checked = val;
                } else if (el.type === 'range') {
                    el.value = val;
                    // Update value display
                    const valueEl = document.getElementById(elementId + 'Value');
                    if (valueEl) {
                        valueEl.textContent = this._formatValue(path, val);
                    }
                } else if (el.tagName === 'BUTTON' && el.classList.contains('subsection-enable-btn')) {
                    // Toggle button for subsection enable
                    el.classList.toggle('active', val);
                    el.textContent = val ? 'ON' : 'OFF';
                }
            });
        },

        _pathToElementId(path) {
            // audio.masterVolume -> audioMasterVolume
            // audio.chaser.volume -> audioChaserVolume
            // audio.sphere.baseFreq -> audioSphereBaseFreq
            const parts = path.split('.');
            return parts.map((p, i) => i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)).join('');
        },

        _formatValue(path, val) {
            if (path.includes('Volume') || path.includes('Width') || path.includes('Depth') ||
                path.includes('Sustain') || path.includes('reverbMix')) {
                return `${val}%`;
            }
            if (path.includes('Freq') || path.includes('Min') || path.includes('Max') || path.includes('Damping')) {
                return `${val}Hz`;
            }
            if (path.includes('Q')) {
                return val.toFixed(1);
            }
            if (path.includes('Rate')) {
                return `${val.toFixed(2)}Hz`;
            }
            if (path.includes('attack') || path.includes('decay') || path.includes('release') ||
                path.includes('Attack') || path.includes('Decay') || path.includes('Release')) {
                return `${parseFloat(val).toFixed(2)}s`;
            }
            if (path.includes('hold') || path.includes('Hold')) {
                return `${val}ms`;
            }
            if (path.includes('detune') || path.includes('Detune')) {
                return `${val}¢`;
            }
            if (path.includes('clusterSize') || path.includes('Size')) {
                return val;
            }
            return val;
        },

        /**
         * Initialize pulse indicator and listen for audio LFO events
         */
        _initPulseIndicator() {
            this._pulseBarEl = document.getElementById('audioLfoPulseFill');
            this._pulseValueEl = document.getElementById('audioLfoPulseValue');

            // Listen for audio-lfo events from InputHub
            APP.InputHub?.on((event) => {
                if (event.source === 'audio-lfo' && event.key === 'spherePulse') {
                    this._updatePulseIndicator(event.value);
                }
                // Don't intercept - let events continue routing
                return false;
            });
        },

        /**
         * Update the visual pulse indicator
         * @param {number} pulse - Value from 0-1
         */
        _updatePulseIndicator(pulse) {
            if (this._pulseBarEl) {
                this._pulseBarEl.style.width = `${pulse * 100}%`;
            }
            if (this._pulseValueEl) {
                this._pulseValueEl.textContent = pulse.toFixed(2);
            }
        }
    };

})(window.APP);
