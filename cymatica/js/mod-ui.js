// CYMATICA.modUI - Modulation Scene Editor Panel
// Provides UI for creating and managing LFOs, ASRs, and modulation routes
(function(CYMATICA) {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    CYMATICA.modUI = {
        _panel: null,
        _visualizerInterval: null,

        /**
         * Initialize the modulation UI
         */
        init() {
            this._createPanel();
            this._bindControls();
            this._startVisualizers();
            this._render();
            console.log('cymatica.modUI: initialized');
        },

        /**
         * Create the modulation panel HTML
         * @private
         */
        _createPanel() {
            const panelContent = $('.panel-content');
            if (!panelContent) return;

            const section = document.createElement('div');
            section.className = 'control-section';
            section.id = 'mod-section';
            section.innerHTML = `
                <div class="section-header">
                    <h3>Modulation</h3>
                    <span class="section-toggle">&#9660;</span>
                </div>
                <div class="section-content">
                    <!-- Enable Toggle -->
                    <div class="control-group">
                        <div class="toggle-wrapper">
                            <label>Enable Modulation</label>
                            <div class="toggle active" id="toggle-mod-enable"></div>
                        </div>
                    </div>

                    <!-- LFO List -->
                    <div class="mod-subsection">
                        <div class="mod-subsection-header">
                            <span>LFOs</span>
                            <button class="add-btn" id="add-lfo-btn" title="Add LFO">+</button>
                        </div>
                        <div id="lfo-list" class="mod-list"></div>
                    </div>

                    <!-- ASR List -->
                    <div class="mod-subsection">
                        <div class="mod-subsection-header">
                            <span>Envelopes (ASR)</span>
                            <button class="add-btn" id="add-asr-btn" title="Add Envelope">+</button>
                        </div>
                        <div id="asr-list" class="mod-list"></div>
                    </div>

                    <!-- Routes List -->
                    <div class="mod-subsection">
                        <div class="mod-subsection-header">
                            <span>Routes</span>
                            <button class="add-btn" id="add-route-btn" title="Add Route">+</button>
                        </div>
                        <div id="route-list" class="mod-list"></div>
                    </div>

                    <!-- Broadcast Status -->
                    <div class="mod-subsection">
                        <div class="mod-subsection-header">
                            <span>External Control</span>
                        </div>
                        <div id="broadcast-status" class="broadcast-status">
                            <span class="status-dot"></span>
                            <span class="status-text">Listening...</span>
                        </div>
                    </div>

                    <!-- Demo Preset -->
                    <div class="mod-subsection">
                        <button class="action-btn" id="load-demo-preset" style="width: 100%;">Load Demo Preset</button>
                    </div>
                </div>
            `;
            panelContent.appendChild(section);
            this._panel = section;
        },

        /**
         * Bind control event handlers
         * @private
         */
        _bindControls() {
            // Enable toggle
            $('#toggle-mod-enable')?.addEventListener('click', function() {
                this.classList.toggle('active');
                const state = CYMATICA.state._state;
                state.mod = state.mod || { lfos: {}, asrs: {}, routes: [], enabled: true };
                state.mod.enabled = this.classList.contains('active');
            });

            // Add LFO button
            $('#add-lfo-btn')?.addEventListener('click', () => this._addLFO());

            // Add ASR button
            $('#add-asr-btn')?.addEventListener('click', () => this._addASR());

            // Add Route button
            $('#add-route-btn')?.addEventListener('click', () => this._addRoute());

            // Section collapse
            $('#mod-section .section-header')?.addEventListener('click', (e) => {
                e.currentTarget.classList.toggle('collapsed');
            });

            // Demo preset button
            $('#load-demo-preset')?.addEventListener('click', () => this._loadDemoPreset());
        },

        /**
         * Add a new LFO
         * @private
         */
        _addLFO() {
            const state = CYMATICA.state._state;
            state.mod = state.mod || { lfos: {}, asrs: {}, routes: [], enabled: true };

            const lfo = CYMATICA.mod.lfo.createLFO({
                waveform: 'sine',
                frequency: 0.5,
                amplitude: 1.0,
                offset: 0.5
            });
            state.mod.lfos[lfo.id] = lfo;

            this._renderLFOs();
            CYMATICA.events.publish('mod:lfo:added', lfo);
        },

        /**
         * Add a new ASR envelope
         * @private
         */
        _addASR() {
            const state = CYMATICA.state._state;
            state.mod = state.mod || { lfos: {}, asrs: {}, routes: [], enabled: true };

            const asr = CYMATICA.mod.asr.createASR({
                attack: 0.1,
                sustain: 1.0,
                release: 0.3
            });
            state.mod.asrs[asr.id] = asr;

            this._renderASRs();
            CYMATICA.events.publish('mod:asr:added', asr);
        },

        /**
         * Add a new modulation route
         * @private
         */
        _addRoute() {
            const state = CYMATICA.state._state;
            state.mod = state.mod || { lfos: {}, asrs: {}, routes: [], enabled: true };

            // Get first available source
            const lfoIds = Object.keys(state.mod.lfos);
            const asrIds = Object.keys(state.mod.asrs);
            const sourceType = lfoIds.length > 0 ? 'lfo' : (asrIds.length > 0 ? 'asr' : 'lfo');
            const sourceId = lfoIds[0] || asrIds[0] || '';

            const route = CYMATICA.mod.hub.createRoute({
                sourceType,
                sourceId,
                target: 'rotation.y',
                min: -30,
                max: 30
            });
            state.mod.routes.push(route);

            this._renderRoutes();
        },

        /**
         * Render all modulation components
         * @private
         */
        _render() {
            this._renderLFOs();
            this._renderASRs();
            this._renderRoutes();
        },

        /**
         * Render LFO list
         * @private
         */
        _renderLFOs() {
            const container = $('#lfo-list');
            if (!container) return;

            const lfos = CYMATICA.state._state.mod?.lfos || {};
            const waveforms = CYMATICA.mod.lfo.getWaveforms();

            container.innerHTML = Object.values(lfos).map(lfo => `
                <div class="mod-item lfo-item" data-id="${lfo.id}">
                    <div class="mod-item-header">
                        <input type="checkbox" class="lfo-enable" ${lfo.enabled ? 'checked' : ''} title="Enable">
                        <select class="lfo-waveform" title="Waveform">
                            ${waveforms.map(w => `<option value="${w}" ${lfo.waveform === w ? 'selected' : ''}>${w}</option>`).join('')}
                        </select>
                        <button class="delete-btn" title="Delete">&times;</button>
                    </div>
                    <div class="mod-item-controls">
                        <label>Freq</label>
                        <input type="range" class="lfo-freq" min="0.01" max="10" step="0.01" value="${lfo.frequency}">
                        <span class="value-display lfo-freq-val">${lfo.frequency.toFixed(2)}</span>
                    </div>
                    <div class="mod-item-controls">
                        <label>Amp</label>
                        <input type="range" class="lfo-amp" min="0" max="1" step="0.01" value="${lfo.amplitude}">
                        <span class="value-display lfo-amp-val">${(lfo.amplitude * 100).toFixed(0)}%</span>
                    </div>
                    <div class="mod-visualizer"><div class="mod-bar lfo-bar"></div></div>
                </div>
            `).join('');

            this._attachLFOListeners();
        },

        /**
         * Attach event listeners to LFO items
         * @private
         */
        _attachLFOListeners() {
            $$('.lfo-item').forEach(item => {
                const id = item.dataset.id;
                const state = CYMATICA.state._state;

                // Enable checkbox
                item.querySelector('.lfo-enable')?.addEventListener('change', (e) => {
                    if (state.mod?.lfos?.[id]) {
                        state.mod.lfos[id].enabled = e.target.checked;
                    }
                });

                // Waveform select
                item.querySelector('.lfo-waveform')?.addEventListener('change', (e) => {
                    if (state.mod?.lfos?.[id]) {
                        state.mod.lfos[id].waveform = e.target.value;
                    }
                });

                // Frequency slider
                const freqSlider = item.querySelector('.lfo-freq');
                const freqVal = item.querySelector('.lfo-freq-val');
                freqSlider?.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    if (state.mod?.lfos?.[id]) {
                        state.mod.lfos[id].frequency = val;
                    }
                    if (freqVal) freqVal.textContent = val.toFixed(2);
                });

                // Amplitude slider
                const ampSlider = item.querySelector('.lfo-amp');
                const ampVal = item.querySelector('.lfo-amp-val');
                ampSlider?.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    if (state.mod?.lfos?.[id]) {
                        state.mod.lfos[id].amplitude = val;
                    }
                    if (ampVal) ampVal.textContent = (val * 100).toFixed(0) + '%';
                });

                // Delete button
                item.querySelector('.delete-btn')?.addEventListener('click', () => {
                    if (state.mod?.lfos?.[id]) {
                        delete state.mod.lfos[id];
                        CYMATICA.mod.lfo.remove(id);
                        this._renderLFOs();
                        this._renderRoutes(); // Update route source options
                    }
                });
            });
        },

        /**
         * Render ASR envelope list
         * @private
         */
        _renderASRs() {
            const container = $('#asr-list');
            if (!container) return;

            const asrs = CYMATICA.state._state.mod?.asrs || {};

            container.innerHTML = Object.values(asrs).map(asr => `
                <div class="mod-item asr-item" data-id="${asr.id}">
                    <div class="mod-item-header">
                        <input type="checkbox" class="asr-enable" ${asr.enabled ? 'checked' : ''} title="Enable">
                        <span class="asr-label">ASR</span>
                        <button class="test-btn" title="Test trigger">Test</button>
                        <button class="delete-btn" title="Delete">&times;</button>
                    </div>
                    <div class="mod-item-controls">
                        <label>A</label>
                        <input type="range" class="asr-attack" min="0.01" max="2" step="0.01" value="${asr.attack}">
                        <span class="value-display">${asr.attack.toFixed(2)}s</span>
                    </div>
                    <div class="mod-item-controls">
                        <label>S</label>
                        <input type="range" class="asr-sustain" min="0" max="1" step="0.01" value="${asr.sustain}">
                        <span class="value-display">${(asr.sustain * 100).toFixed(0)}%</span>
                    </div>
                    <div class="mod-item-controls">
                        <label>R</label>
                        <input type="range" class="asr-release" min="0.01" max="3" step="0.01" value="${asr.release}">
                        <span class="value-display">${asr.release.toFixed(2)}s</span>
                    </div>
                    <div class="mod-item-controls">
                        <label>Trigger</label>
                        <input type="text" class="asr-trigger-channel" value="${asr.triggerChannel || ''}" placeholder="note:60">
                    </div>
                    <div class="mod-visualizer"><div class="mod-bar asr-bar"></div></div>
                </div>
            `).join('');

            this._attachASRListeners();
        },

        /**
         * Attach event listeners to ASR items
         * @private
         */
        _attachASRListeners() {
            $$('.asr-item').forEach(item => {
                const id = item.dataset.id;
                const state = CYMATICA.state._state;

                // Enable checkbox
                item.querySelector('.asr-enable')?.addEventListener('change', (e) => {
                    if (state.mod?.asrs?.[id]) {
                        state.mod.asrs[id].enabled = e.target.checked;
                    }
                });

                // Attack slider
                item.querySelector('.asr-attack')?.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    if (state.mod?.asrs?.[id]) state.mod.asrs[id].attack = val;
                    e.target.nextElementSibling.textContent = val.toFixed(2) + 's';
                });

                // Sustain slider
                item.querySelector('.asr-sustain')?.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    if (state.mod?.asrs?.[id]) state.mod.asrs[id].sustain = val;
                    e.target.nextElementSibling.textContent = (val * 100).toFixed(0) + '%';
                });

                // Release slider
                item.querySelector('.asr-release')?.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    if (state.mod?.asrs?.[id]) state.mod.asrs[id].release = val;
                    e.target.nextElementSibling.textContent = val.toFixed(2) + 's';
                });

                // Trigger channel input
                item.querySelector('.asr-trigger-channel')?.addEventListener('change', (e) => {
                    if (state.mod?.asrs?.[id]) {
                        state.mod.asrs[id].triggerChannel = e.target.value || null;
                    }
                });

                // Test button
                item.querySelector('.test-btn')?.addEventListener('click', () => {
                    CYMATICA.mod.asr.trigger(id, true);
                    setTimeout(() => CYMATICA.mod.asr.trigger(id, false), 300);
                });

                // Delete button
                item.querySelector('.delete-btn')?.addEventListener('click', () => {
                    if (state.mod?.asrs?.[id]) {
                        delete state.mod.asrs[id];
                        CYMATICA.mod.asr.remove(id);
                        this._renderASRs();
                        this._renderRoutes();
                    }
                });
            });
        },

        /**
         * Render modulation routes list
         * @private
         */
        _renderRoutes() {
            const container = $('#route-list');
            if (!container) return;

            const state = CYMATICA.state._state;
            const routes = state.mod?.routes || [];
            const lfos = state.mod?.lfos || {};
            const asrs = state.mod?.asrs || {};
            const targets = CYMATICA.mod.hub.getRoutableTargets();
            const curvePresets = Object.keys(CYMATICA.mod.mapper.CurvePresets);

            container.innerHTML = routes.map((route, idx) => {
                // Build source options based on type
                let sourceOptions = '';
                if (route.sourceType === 'lfo') {
                    sourceOptions = Object.keys(lfos).map(id =>
                        `<option value="${id}" ${route.sourceId === id ? 'selected' : ''}>${id.substr(0, 8)}</option>`
                    ).join('');
                } else if (route.sourceType === 'asr') {
                    sourceOptions = Object.keys(asrs).map(id =>
                        `<option value="${id}" ${route.sourceId === id ? 'selected' : ''}>${id.substr(0, 8)}</option>`
                    ).join('');
                } else {
                    sourceOptions = '<option value="">External</option>';
                }

                // Determine current curve preset
                const curvePreset = this._detectCurvePreset(route);

                return `
                    <div class="mod-item route-item" data-index="${idx}">
                        <div class="route-row">
                            <input type="checkbox" class="route-enable" ${route.enabled ? 'checked' : ''} title="Enable">
                            <select class="route-source-type" title="Source type">
                                <option value="lfo" ${route.sourceType === 'lfo' ? 'selected' : ''}>LFO</option>
                                <option value="asr" ${route.sourceType === 'asr' ? 'selected' : ''}>ASR</option>
                                <option value="external" ${route.sourceType === 'external' ? 'selected' : ''}>Ext</option>
                            </select>
                            <select class="route-source-id" title="Source">
                                ${sourceOptions}
                            </select>
                            <span class="route-arrow">→</span>
                            <select class="route-target" title="Target parameter">
                                ${targets.map(t => `<option value="${t}" ${route.target === t ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                            <button class="delete-btn" title="Delete">&times;</button>
                        </div>
                        <div class="route-row">
                            <label>Range</label>
                            <input type="number" class="route-min" value="${route.min}" step="0.1" title="Min">
                            <input type="number" class="route-max" value="${route.max}" step="0.1" title="Max">
                            <select class="route-curve" title="Curve">
                                ${curvePresets.map(c => `<option value="${c}" ${curvePreset === c ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                `;
            }).join('');

            this._attachRouteListeners();
        },

        /**
         * Detect which curve preset matches the route params
         * @private
         */
        _detectCurvePreset(route) {
            const presets = CYMATICA.mod.mapper.CurvePresets;
            for (const [name, preset] of Object.entries(presets)) {
                if (Math.abs(route.curveA - preset.a) < 0.1 &&
                    Math.abs(route.curveB - preset.b) < 0.1) {
                    return name;
                }
            }
            return 'linear';
        },

        /**
         * Attach event listeners to route items
         * @private
         */
        _attachRouteListeners() {
            $$('.route-item').forEach(item => {
                const idx = parseInt(item.dataset.index);
                const state = CYMATICA.state._state;
                const getRoute = () => state.mod?.routes?.[idx];

                // Enable checkbox
                item.querySelector('.route-enable')?.addEventListener('change', (e) => {
                    const route = getRoute();
                    if (route) route.enabled = e.target.checked;
                });

                // Source type
                item.querySelector('.route-source-type')?.addEventListener('change', (e) => {
                    const route = getRoute();
                    if (route) {
                        route.sourceType = e.target.value;
                        route.sourceId = '';
                        this._renderRoutes();
                    }
                });

                // Source ID
                item.querySelector('.route-source-id')?.addEventListener('change', (e) => {
                    const route = getRoute();
                    if (route) route.sourceId = e.target.value;
                });

                // Target
                item.querySelector('.route-target')?.addEventListener('change', (e) => {
                    const route = getRoute();
                    if (route) route.target = e.target.value;
                });

                // Min/Max
                item.querySelector('.route-min')?.addEventListener('change', (e) => {
                    const route = getRoute();
                    if (route) route.min = parseFloat(e.target.value);
                });

                item.querySelector('.route-max')?.addEventListener('change', (e) => {
                    const route = getRoute();
                    if (route) route.max = parseFloat(e.target.value);
                });

                // Curve preset
                item.querySelector('.route-curve')?.addEventListener('change', (e) => {
                    const route = getRoute();
                    if (route) {
                        const preset = CYMATICA.mod.mapper.getPreset(e.target.value);
                        route.curveA = preset.a;
                        route.curveB = preset.b;
                        route.curveMid = preset.m;
                    }
                });

                // Delete
                item.querySelector('.delete-btn')?.addEventListener('click', () => {
                    if (state.mod?.routes) {
                        state.mod.routes.splice(idx, 1);
                        this._renderRoutes();
                    }
                });
            });
        },

        /**
         * Start visualizer update interval
         * @private
         */
        _startVisualizers() {
            this._visualizerInterval = setInterval(() => {
                // Update LFO bars
                $$('.lfo-item').forEach(item => {
                    const id = item.dataset.id;
                    const val = CYMATICA.mod.lfo.getValue(id);
                    const bar = item.querySelector('.lfo-bar');
                    if (bar) bar.style.width = (val * 100) + '%';
                });

                // Update ASR bars
                $$('.asr-item').forEach(item => {
                    const id = item.dataset.id;
                    const val = CYMATICA.mod.asr.getValue(id);
                    const bar = item.querySelector('.asr-bar');
                    if (bar) bar.style.width = (val * 100) + '%';
                });

                // Update broadcast status
                const statusEl = $('#broadcast-status');
                if (statusEl && CYMATICA.mod.broadcast) {
                    const count = CYMATICA.mod.broadcast.getMessageCount();
                    const connected = CYMATICA.mod.broadcast.isConnected();
                    statusEl.querySelector('.status-dot')?.classList.toggle('active', connected);
                    statusEl.querySelector('.status-text').textContent =
                        connected ? `Messages: ${count}` : 'Not connected';
                }
            }, 50);
        },

        /**
         * Stop visualizers
         */
        stopVisualizers() {
            if (this._visualizerInterval) {
                clearInterval(this._visualizerInterval);
                this._visualizerInterval = null;
            }
        },

        /**
         * Load demo preset - creates LFO modulating rotation.y
         * @private
         */
        _loadDemoPreset() {
            const state = CYMATICA.state._state;
            state.mod = state.mod || { lfos: {}, asrs: {}, routes: [], enabled: true };

            // Clear existing
            state.mod.lfos = {};
            state.mod.asrs = {};
            state.mod.routes = [];

            // Create demo LFO - slow sine wave
            const lfo1 = CYMATICA.mod.lfo.createLFO({
                waveform: 'sine',
                frequency: 0.3,
                amplitude: 1.0,
                offset: 0.5
            });
            state.mod.lfos[lfo1.id] = lfo1;

            // Create second LFO for letter scale wobble
            const lfo2 = CYMATICA.mod.lfo.createLFO({
                waveform: 'triangle',
                frequency: 0.8,
                amplitude: 0.5,
                offset: 0.5
            });
            state.mod.lfos[lfo2.id] = lfo2;

            // Create demo ASR envelope
            const asr = CYMATICA.mod.asr.createASR({
                attack: 0.15,
                sustain: 0.8,
                release: 0.5
            });
            state.mod.asrs[asr.id] = asr;

            // Route LFO1 → rotation.y (gentle swaying)
            const route1 = CYMATICA.mod.hub.createRoute({
                sourceType: 'lfo',
                sourceId: lfo1.id,
                target: 'rotation.y',
                min: -25,
                max: 25
            });
            state.mod.routes.push(route1);

            // Route LFO2 → first letter scale (breathing effect)
            const route2 = CYMATICA.mod.hub.createRoute({
                sourceType: 'lfo',
                sourceId: lfo2.id,
                target: 'letters[0].scale',
                min: 0.9,
                max: 1.3
            });
            state.mod.routes.push(route2);

            // Route ASR → zoom (pulse on trigger)
            const route3 = CYMATICA.mod.hub.createRoute({
                sourceType: 'asr',
                sourceId: asr.id,
                target: 'zoom',
                min: 0.5,
                max: 0.7
            });
            state.mod.routes.push(route3);

            // Re-render UI
            this._render();

            console.log('cymatica.modUI: demo preset loaded');
            CYMATICA.events.publish('mod:preset:loaded', { name: 'demo' });
        }
    };

})(window.CYMATICA);
