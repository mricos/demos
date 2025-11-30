/**
 * LFOUI - User interface for LFO management
 * Handles LFO creation, editing, and learn mode integration
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.LFOUI = {
        _container: null,
        _learnMode: false,
        _learnTarget: null,  // Element being learned to

        init() {
            this._container = document.getElementById('lfoList');
            this._setupEventListeners();
            this._subscribe();
            this._render();
        },

        _setupEventListeners() {
            // Add LFO button
            const addBtn = document.getElementById('lfoAddButton');
            if (addBtn) {
                addBtn.addEventListener('click', () => this._addLFO());
            }

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

            // LFO Learn mode
            const learnToggle = document.getElementById('lfoLearnMode');
            if (learnToggle) {
                learnToggle.addEventListener('change', (e) => {
                    this._setLearnMode(e.target.checked);
                });
            }
        },

        _subscribe() {
            // Re-render when LFOs change
            APP.State?.subscribe('lfo.lfos', () => this._render());
            APP.State?.subscribe('lfo.enabled', (enabled) => {
                const el = document.getElementById('lfoMasterEnabled');
                if (el) el.checked = enabled;
            });
        },

        _render() {
            if (!this._container) return;

            const lfos = APP.State?.select('lfo.lfos') || {};
            const lfoIds = Object.keys(lfos);

            if (lfoIds.length === 0) {
                this._container.innerHTML = `
                    <p style="font-size: 11px; color: #666; text-align: center; padding: 8px;">
                        No LFOs. Click "+ Add LFO" to create one.
                    </p>
                `;
                return;
            }

            this._container.innerHTML = lfoIds.map(id => this._renderLFO(lfos[id])).join('');
            this._attachLFOEventListeners();
        },

        _renderLFO(lfo) {
            const waveforms = APP.LFOEngine?.getWaveforms() || ['sine', 'triangle', 'square', 'saw'];
            const waveformOptions = waveforms.map(w =>
                `<option value="${w}" ${lfo.waveform === w ? 'selected' : ''}>${w}</option>`
            ).join('');

            return `
                <div class="lfo-entry" data-lfo-id="${lfo.id}" style="
                    border: 1px solid #333;
                    border-radius: 4px;
                    padding: 8px;
                    margin-bottom: 8px;
                    background: #1a1a1a;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <label style="display: flex; align-items: center; gap: 4px; font-size: 12px;">
                            <input type="checkbox" class="lfo-enabled" ${lfo.enabled ? 'checked' : ''}>
                            <span class="lfo-name" style="font-weight: bold; color: #0af;">${lfo.id.slice(0, 8)}</span>
                        </label>
                        <div style="display: flex; gap: 4px;">
                            <button class="lfo-map-btn btn btn-tiny" title="Map to parameter" style="font-size: 10px; padding: 2px 6px;">
                                Map
                            </button>
                            <button class="lfo-delete-btn btn btn-tiny btn-danger" title="Delete LFO" style="font-size: 10px; padding: 2px 6px;">
                                ×
                            </button>
                        </div>
                    </div>

                    <div class="lfo-controls" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px;">
                        <div>
                            <label style="color: #888;">Wave</label>
                            <select class="lfo-waveform" style="width: 100%; font-size: 10px;">
                                ${waveformOptions}
                            </select>
                        </div>
                        <div>
                            <label style="color: #888;">Freq</label>
                            <input type="range" class="lfo-frequency" min="1" max="100" value="${Math.round(lfo.frequency * 10)}" style="width: 100%;">
                        </div>
                        <div>
                            <label style="color: #888;">Amp</label>
                            <input type="range" class="lfo-amplitude" min="0" max="100" value="${Math.round(lfo.amplitude * 100)}" style="width: 100%;">
                        </div>
                        <div>
                            <label style="color: #888;">Offset</label>
                            <input type="range" class="lfo-offset" min="0" max="100" value="${Math.round(lfo.offset * 100)}" style="width: 100%;">
                        </div>
                        <div style="grid-column: span 2;">
                            <label style="display: flex; align-items: center; gap: 4px; color: #888;">
                                <input type="checkbox" class="lfo-sync" ${lfo.sync ? 'checked' : ''}>
                                Sync to BPM
                                <select class="lfo-syncDiv" style="width: 50px; font-size: 10px; margin-left: auto;" ${!lfo.sync ? 'disabled' : ''}>
                                    <option value="1" ${lfo.syncDiv === 1 ? 'selected' : ''}>1</option>
                                    <option value="2" ${lfo.syncDiv === 2 ? 'selected' : ''}>2</option>
                                    <option value="4" ${lfo.syncDiv === 4 ? 'selected' : ''}>4</option>
                                    <option value="8" ${lfo.syncDiv === 8 ? 'selected' : ''}>8</option>
                                    <option value="16" ${lfo.syncDiv === 16 ? 'selected' : ''}>16</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    <div class="lfo-visualizer" style="
                        height: 20px;
                        background: #111;
                        border-radius: 2px;
                        margin-top: 6px;
                        position: relative;
                        overflow: hidden;
                    ">
                        <div class="lfo-value-bar" style="
                            position: absolute;
                            left: 0;
                            top: 0;
                            height: 100%;
                            background: linear-gradient(90deg, #0af, #08f);
                            width: 50%;
                            transition: width 50ms linear;
                        "></div>
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

                // Frequency (0.1 - 10 Hz)
                entry.querySelector('.lfo-frequency')?.addEventListener('input', (e) => {
                    APP.LFOEngine?.updateLFO(id, { frequency: parseInt(e.target.value) / 10 });
                });

                // Amplitude (0 - 1)
                entry.querySelector('.lfo-amplitude')?.addEventListener('input', (e) => {
                    APP.LFOEngine?.updateLFO(id, { amplitude: parseInt(e.target.value) / 100 });
                });

                // Offset (0 - 1)
                entry.querySelector('.lfo-offset')?.addEventListener('input', (e) => {
                    APP.LFOEngine?.updateLFO(id, { offset: parseInt(e.target.value) / 100 });
                });

                // Sync toggle
                entry.querySelector('.lfo-sync')?.addEventListener('change', (e) => {
                    APP.LFOEngine?.updateLFO(id, { sync: e.target.checked });
                    const syncDiv = entry.querySelector('.lfo-syncDiv');
                    if (syncDiv) syncDiv.disabled = !e.target.checked;
                });

                // Sync division
                entry.querySelector('.lfo-syncDiv')?.addEventListener('change', (e) => {
                    APP.LFOEngine?.updateLFO(id, { syncDiv: parseInt(e.target.value) });
                });

                // Delete button
                entry.querySelector('.lfo-delete-btn')?.addEventListener('click', () => {
                    if (confirm('Delete this LFO?')) {
                        APP.LFOEngine?.removeLFO(id);
                    }
                });

                // Map button
                entry.querySelector('.lfo-map-btn')?.addEventListener('click', () => {
                    this._startMapping(id);
                });
            });

            // Start visualizer updates
            this._startVisualizerUpdates();
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

        _addLFO() {
            const id = APP.LFOEngine?.addLFO({
                enabled: true,
                waveform: 'sine',
                frequency: 1.0,
                amplitude: 1.0,
                offset: 0.5,
                phase: 0,
                sync: false,
                syncDiv: 4
            });
            APP.Toast?.success(`LFO created: ${id.slice(0, 8)}`);
        },

        _startMapping(lfoId) {
            // Activate learn mode and set this LFO as the source
            this._mappingLfoId = lfoId;
            APP.Toast?.info(`Click a control to map LFO ${lfoId.slice(0, 8)} to it`);

            // Register a one-time handler with InputLearnUI
            if (APP.InputLearnUI) {
                APP.InputLearnUI.startLearnWithSource('lfo', lfoId, `lfo:${lfoId}`);
            }
        },

        _setLearnMode(enabled) {
            this._learnMode = enabled;
            if (enabled) {
                APP.Toast?.info('LFO Learn: Click a control, then click "Map" on an LFO');
            }
        }
    };

})(window.APP);
