/**
 * LFOUI - User interface for LFO management
 * LFOs are created via ControlHelper, shown here with target parameter
 * Each LFO shows its mapped destination with dropdown to change target
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.LFOUI = {
        _container: null,
        _emptyMessage: null,

        init() {
            this._container = document.getElementById('lfoList');
            this._emptyMessage = document.getElementById('lfoEmptyMessage');
            this._setupEventListeners();
            this._subscribe();
            this._render();
        },

        _setupEventListeners() {
            // Master enable
            const masterEnable = document.getElementById('lfoMasterEnabled');
            if (masterEnable) {
                masterEnable.addEventListener('change', (e) => {
                    APP.State?.dispatch({ type: 'lfo.enabled', payload: e.target.checked });
                    if (e.target.checked) {
                        APP.LFOEngine?.start();
                    } else {
                        APP.LFOEngine?.stop();
                    }
                });
            }

            // Add LFO button
            const addBtn = document.getElementById('lfoAddBtn');
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    this._addNewLFO();
                });
            }
        },

        /**
         * Add a new unmapped LFO
         */
        _addNewLFO() {
            const lfoId = APP.LFOEngine?.addLFO({
                enabled: true,
                waveform: 'sine',
                frequency: 1.0,
                amplitude: 0.5,
                offset: 0.5,
                phase: 0,
                sync: false,
                syncDiv: 4
            });

            if (lfoId) {
                APP.Toast?.success('LFO added');
            }
        },

        _subscribe() {
            // Track LFO count to only re-render when LFOs added/removed
            let lastLfoCount = Object.keys(APP.State?.select('lfo.lfos') || {}).length;

            APP.State?.subscribe('lfo.lfos', (lfos) => {
                const newCount = Object.keys(lfos || {}).length;
                // Only re-render if LFO count changed (added/removed)
                if (newCount !== lastLfoCount) {
                    lastLfoCount = newCount;
                    this._render();
                }
            });

            APP.State?.subscribe('lfo.enabled', (enabled) => {
                const el = document.getElementById('lfoMasterEnabled');
                if (el) el.checked = enabled;
            });

            // Re-render when input mappings change (to update target display)
            APP.State?.subscribe('input.banks.*', () => this._render());
        },

        _render() {
            if (!this._container) return;

            const lfos = APP.State?.select('lfo.lfos') || {}
            const lfoIds = Object.keys(lfos);

            // Show/hide empty message
            if (this._emptyMessage) {
                this._emptyMessage.style.display = lfoIds.length === 0 ? 'block' : 'none';
            }

            if (lfoIds.length === 0) {
                this._container.innerHTML = '';
                return;
            }

            this._container.innerHTML = lfoIds.map(id => this._renderLFO(lfos[id])).join('');
            this._attachLFOEventListeners();
        },

        /**
         * Get the target parameter path for an LFO (from input mappings)
         */
        _getLFOTarget(lfoId) {
            const activeBank = APP.InputHub?.getActiveBank() || 'A';
            const maps = APP.State?.select(`input.banks.${activeBank}.maps`) || {};

            for (const map of Object.values(maps)) {
                if (map.source?.type === 'lfo' && map.source?.key === lfoId) {
                    return map.target?.path || null;
                }
            }
            return null;
        },

        /**
         * Get the LFO map object for an LFO
         */
        _getLFOMap(lfoId) {
            const activeBank = APP.InputHub?.getActiveBank() || 'A';
            const maps = APP.State?.select(`input.banks.${activeBank}.maps`) || {};

            for (const map of Object.values(maps)) {
                if (map.source?.type === 'lfo' && map.source?.key === lfoId) {
                    return map;
                }
            }
            return null;
        },

        /**
         * Get current curve preset name from map behavior
         */
        _getCurvePreset(map) {
            if (!map?.behavior) return 'linear';
            const { curveA, curveB } = map.behavior;
            const a = curveA ?? 1.0;
            const b = curveB ?? 1.0;

            // Match to presets
            if (Math.abs(a - 1.0) < 0.1 && Math.abs(b - 1.0) < 0.1) return 'linear';
            if (Math.abs(a - 0.25) < 0.1 && Math.abs(b - 0.25) < 0.1) return 'log';
            if (Math.abs(a - 4.0) < 0.5 && Math.abs(b - 4.0) < 0.5) return 'exp';
            if (Math.abs(a - 4.0) < 0.5 && Math.abs(b - 0.25) < 0.1) return 'scurve';
            if (Math.abs(a - 0.25) < 0.1 && Math.abs(b - 4.0) < 0.5) return 'invs';
            return 'linear';
        },

        /**
         * Get all bindable parameters for dropdown
         */
        _getAllParameters() {
            const params = [];
            const registry = APP.ParameterRegistry?.parameters || {};

            for (const [id, def] of Object.entries(registry)) {
                if (def.path) {
                    params.push({
                        id,
                        path: def.path,
                        label: def.path
                    });
                }
            }

            // Sort by path
            params.sort((a, b) => a.path.localeCompare(b.path));
            return params;
        },

        // Logarithmic speed mapping: slider 0-100 → freq 0.001-10 Hz
        // More resolution at low speeds
        _sliderToFreq(sliderVal) {
            // 0 → 0.001, 50 → 0.1, 100 → 10
            const minFreq = 0.001;
            const maxFreq = 10;
            const t = sliderVal / 100;
            return minFreq * Math.pow(maxFreq / minFreq, t);
        },

        _freqToSlider(freq) {
            const minFreq = 0.001;
            const maxFreq = 10;
            freq = Math.max(minFreq, Math.min(maxFreq, freq));
            return 100 * Math.log(freq / minFreq) / Math.log(maxFreq / minFreq);
        },

        _formatFreq(freq) {
            if (freq < 0.01) return freq.toFixed(3);
            if (freq < 0.1) return freq.toFixed(3);
            if (freq < 1) return freq.toFixed(2);
            return freq.toFixed(1);
        },

        _renderLFO(lfo) {
            const waveforms = APP.LFOEngine?.getWaveforms() || ['sine', 'triangle', 'square', 'saw'];
            const waveformOptions = waveforms.map(w =>
                `<option value="${w}" ${lfo.waveform === w ? 'selected' : ''}>${w}</option>`
            ).join('');

            // Speed: logarithmic 0.001 - 10 Hz
            const sliderVal = Math.round(this._freqToSlider(lfo.frequency));
            const speedValue = this._formatFreq(lfo.frequency);
            const ampValue = Math.round(lfo.amplitude * 100);

            // Get current target and map
            const lfoMap = this._getLFOMap(lfo.id);
            const targetPath = lfoMap?.target?.path || null;
            const currentCurve = this._getCurvePreset(lfoMap);

            // Build destination dropdown
            const allParams = this._getAllParameters();
            const destOptions = allParams.map(p =>
                `<option value="${p.path}" ${p.path === targetPath ? 'selected' : ''}>${p.path}</option>`
            ).join('');

            // Build curve dropdown
            const curvePresets = ['linear', 'log', 'exp', 'scurve', 'invs'];
            const curveLabels = { linear: 'Lin', log: 'Log', exp: 'Exp', scurve: 'S', invs: 'S⁻¹' };
            const curveOptions = curvePresets.map(c =>
                `<option value="${c}" ${c === currentCurve ? 'selected' : ''}>${curveLabels[c]}</option>`
            ).join('');

            const enableId = `lfoEnable_${lfo.id}`;
            return `
                <div class="lfo-entry" data-lfo-id="${lfo.id}">
                    <div class="lfo-header">
                        <input type="checkbox" id="${enableId}" class="lfo-enabled ghost-toggle" ${lfo.enabled ? 'checked' : ''}>
                        <label for="${enableId}" class="ghost-badge lfo-enable-badge" title="Enable"></label>
                        <select class="lfo-destination" title="Modulation target">
                            <option value="">-- Select target --</option>
                            ${destOptions}
                        </select>
                        <select class="lfo-curve" title="Response curve">
                            ${curveOptions}
                        </select>
                        <button class="lfo-delete-btn ghost-btn-tiny ghost-btn-danger" title="Delete">&times;</button>
                    </div>
                    <div class="mini-control">
                        <span class="mini-label">Wave</span>
                        <select class="lfo-waveform" title="Waveform">${waveformOptions}</select>
                    </div>
                    <div class="mini-control">
                        <span class="mini-label">Speed</span>
                        <input type="range" class="lfo-speed" min="0" max="100" value="${sliderVal}" title="Speed (Hz)">
                        <span class="mini-value lfo-speed-value">${speedValue}</span>
                    </div>
                    <div class="mini-control">
                        <span class="mini-label">Amp</span>
                        <input type="range" class="lfo-amplitude" min="0" max="100" value="${ampValue}" title="Amplitude">
                        <span class="mini-value lfo-amp-value">${ampValue}%</span>
                    </div>
                    <div class="lfo-visualizer">
                        <div class="lfo-value-bar"></div>
                    </div>
                </div>
            `;
        },

        _attachLFOEventListeners() {
            const entries = this._container.querySelectorAll('.lfo-entry');
            entries.forEach(entry => {
                const id = entry.dataset.lfoId;

                // Enable toggle
                entry.querySelector('.lfo-enabled')?.addEventListener('change', (e) => {
                    APP.LFOEngine?.updateLFO(id, { enabled: e.target.checked });
                });

                // Waveform
                entry.querySelector('.lfo-waveform')?.addEventListener('change', (e) => {
                    APP.LFOEngine?.updateLFO(id, { waveform: e.target.value });
                });

                // Speed (logarithmic: 0.001 - 10 Hz)
                entry.querySelector('.lfo-speed')?.addEventListener('input', (e) => {
                    const freq = this._sliderToFreq(parseInt(e.target.value));
                    APP.LFOEngine?.updateLFO(id, { frequency: freq });
                    const valueEl = entry.querySelector('.lfo-speed-value');
                    if (valueEl) valueEl.textContent = this._formatFreq(freq);
                });

                // Amplitude (0 - 1)
                entry.querySelector('.lfo-amplitude')?.addEventListener('input', (e) => {
                    const amp = parseInt(e.target.value);
                    APP.LFOEngine?.updateLFO(id, { amplitude: amp / 100 });
                    const valueEl = entry.querySelector('.lfo-amp-value');
                    if (valueEl) valueEl.textContent = amp + '%';
                });

                // Destination change
                entry.querySelector('.lfo-destination')?.addEventListener('change', (e) => {
                    const newPath = e.target.value;
                    if (newPath) {
                        this._changeMapping(id, newPath);
                    } else {
                        this._removeMapping(id);
                    }
                });

                // Curve change
                entry.querySelector('.lfo-curve')?.addEventListener('change', (e) => {
                    this._updateMapCurve(id, e.target.value);
                });

                // Delete button
                entry.querySelector('.lfo-delete-btn')?.addEventListener('click', () => {
                    this._removeMapping(id);
                    APP.LFOEngine?.removeLFO(id);
                });
            });

            // Start visualizer updates
            this._startVisualizerUpdates();
        },

        /**
         * Change the mapping target for an LFO
         */
        _changeMapping(lfoId, targetPath) {
            // Find element ID from path
            const elementId = APP.ParameterRegistry?.findByPath(targetPath);
            if (!elementId) {
                APP.Toast?.info(`Unknown target: ${targetPath}`);
                return;
            }

            const element = document.getElementById(elementId);
            if (!element) {
                APP.Toast?.info(`Element not found: ${elementId}`);
                return;
            }

            // Remove existing mapping for this LFO
            this._removeMapping(lfoId);

            // Create new mapping
            const sourceType = 'lfo';
            const fullKey = `lfo:${lfoId}`;

            let map = APP.InputMap?.fromElement(
                element,
                sourceType,
                lfoId,
                fullKey,
                { inferredAction: 'absolute' }
            );

            if (map) {
                APP.InputHub?.addMap(map);
                APP.Toast?.success(`LFO → ${targetPath}`);
            }
        },

        /**
         * Remove mapping for an LFO
         */
        _removeMapping(lfoId) {
            const activeBank = APP.InputHub?.getActiveBank() || 'A';
            const maps = { ...APP.State?.select(`input.banks.${activeBank}.maps`) };

            let removed = false;
            for (const [mapId, map] of Object.entries(maps)) {
                if (map.source?.type === 'lfo' && map.source?.key === lfoId) {
                    delete maps[mapId];
                    removed = true;
                }
            }

            if (removed) {
                APP.State?.dispatch({ type: `input.banks.${activeBank}.maps`, payload: maps });
            }
        },

        /**
         * Update the response curve for an LFO mapping
         */
        _updateMapCurve(lfoId, curvePreset) {
            const activeBank = APP.InputHub?.getActiveBank() || 'A';
            const maps = { ...APP.State?.select(`input.banks.${activeBank}.maps`) };

            // Get curve values from preset
            const presets = APP.InputMap?.CurvePresets || {
                linear: { a: 1.0, b: 1.0 },
                log:    { a: 0.25, b: 0.25 },
                exp:    { a: 4.0, b: 4.0 },
                scurve: { a: 4.0, b: 0.25 },
                invs:   { a: 0.25, b: 4.0 }
            };
            const curve = presets[curvePreset] || presets.linear;

            // Find and update the map
            for (const [mapId, map] of Object.entries(maps)) {
                if (map.source?.type === 'lfo' && map.source?.key === lfoId) {
                    maps[mapId] = {
                        ...map,
                        behavior: {
                            ...map.behavior,
                            curveA: curve.a,
                            curveB: curve.b
                        }
                    };
                    APP.State?.dispatch({ type: `input.banks.${activeBank}.maps`, payload: maps });
                    APP.Toast?.success(`Curve: ${curvePreset}`);
                    return;
                }
            }
        },

        _startVisualizerUpdates() {
            // Update visualizers periodically
            const update = () => {
                const entries = this._container?.querySelectorAll('.lfo-entry');
                entries?.forEach(entry => {
                    const id = entry.dataset.lfoId;
                    const value = APP.LFOEngine?.getCurrentValue(id) ?? 0.5;
                    const bar = entry.querySelector('.lfo-value-bar');
                    if (bar) {
                        bar.style.width = (value * 100) + '%';
                    }
                });
            };

            // Update every 50ms
            if (this._visualizerInterval) {
                clearInterval(this._visualizerInterval);
            }
            this._visualizerInterval = setInterval(update, 50);
        },

        /**
         * Create a new LFO mapped to a specific parameter
         * Called by ControlHelper when LFO mode is selected
         */
        createLFOForParameter(targetPath) {
            const elementId = APP.ParameterRegistry?.findByPath(targetPath);
            if (!elementId) {
                APP.Toast?.info(`Unknown parameter: ${targetPath}`);
                return null;
            }

            const element = document.getElementById(elementId);
            if (!element) {
                APP.Toast?.info(`Element not found: ${elementId}`);
                return null;
            }

            // Create the LFO
            const lfoId = APP.LFOEngine?.addLFO({
                enabled: true,
                waveform: 'sine',
                frequency: 1.0,
                amplitude: 0.5,
                offset: 0.5,
                phase: 0,
                sync: false,
                syncDiv: 4
            });

            if (!lfoId) {
                APP.Toast?.info('Failed to create LFO');
                return null;
            }

            // Create mapping to target
            const fullKey = `lfo:${lfoId}`;
            let map = APP.InputMap?.fromElement(
                element,
                'lfo',
                lfoId,
                fullKey,
                { inferredAction: 'absolute' }
            );

            if (map) {
                APP.InputHub?.addMap(map);
                APP.Toast?.success(`LFO → ${targetPath}`);

                // Scroll to LFO section
                this._focusLFOSection();
            }

            return lfoId;
        },

        _focusLFOSection() {
            const sections = document.querySelectorAll('.control-section');
            sections.forEach(section => {
                const header = section.querySelector('.section-title');
                if (header && header.textContent.trim() === 'LFO') {
                    section.classList.remove('collapsed');
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }
    };

})(window.APP);
