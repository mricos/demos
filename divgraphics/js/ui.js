/**
 * DivGraphics - UI Module
 * Input bindings and state synchronization for control panel
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.UI = {
        init() {
            // 1. Restore from state (sync DOM with state)
            this._restoreFromState();

            // 2. Bind inputs to dispatch
            this._bindInputs();

            // 3. Subscribe to sync UI from state changes (e.g., MIDI)
            this._subscribe();

            // 4. Setup other UI interactions
            this._setupUI();
        },

        _restoreFromState() {
            // Sync all controls from current state
            this._syncFromState('outer');
            this._syncFromState('inner');
            this._syncFromState('scene');
            this._syncFromState('display');

            // Inner controls visibility
            const innerEnabled = APP.State.select('inner.enabled');
            const innerControls = document.getElementById('innerControls');
            if (innerControls) {
                innerControls.style.display = innerEnabled ? 'block' : 'none';
            }
        },

        _bindInputs() {
            // Bind range inputs
            this._bindRange('outerRadius', 'outer.radius');
            this._bindRange('outerHeight', 'outer.height');
            this._bindRange('outerRadialSegments', 'outer.radialSegments');
            this._bindRange('outerHeightSegments', 'outer.heightSegments');
            this._bindRange('innerRadius', 'inner.radius');
            this._bindRange('innerHeight', 'inner.height');
            this._bindRange('innerRadialSegments', 'inner.radialSegments');
            this._bindRange('innerHeightSegments', 'inner.heightSegments');

            // Bind color inputs
            this._bindColor('outerColor', 'outer.color');
            this._bindColor('outerColorSecondary', 'outer.colorSecondary');
            this._bindColor('innerColor', 'inner.color');
            this._bindColor('innerColorSecondary', 'inner.colorSecondary');

            // Bind checkboxes
            this._bindCheckbox('outerWireframe', 'outer.wireframe');
            this._bindCheckbox('innerWireframe', 'inner.wireframe');
            this._bindCheckbox('innerEnabled', 'inner.enabled');
            this._bindCheckbox('autoRotate', 'scene.autoRotate');
            this._bindCheckbox('toastsEnabled', 'display.toasts');
            this._bindCheckbox('statsEnabled', 'display.stats');
        },

        _subscribe() {
            // Sync UI when state changes (for MIDI-driven changes)
            APP.State.subscribe('outer.*', () => this._syncFromState('outer'));
            APP.State.subscribe('inner.*', () => this._syncFromState('inner'));
            APP.State.subscribe('scene.*', () => this._syncFromState('scene'));
            APP.State.subscribe('display.*', () => this._syncFromState('display'));

            // Inner controls visibility
            APP.State.subscribe('inner.enabled', (enabled) => {
                const el = document.getElementById('innerControls');
                if (el) el.style.display = enabled ? 'block' : 'none';
            });
        },

        _setupUI() {
            // Reset button
            const resetBtn = document.getElementById('resetBtn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => APP.Scene.resetView());
            }

            // Collapsible sections
            document.querySelectorAll('.section-header').forEach(header => {
                header.addEventListener('click', () => {
                    header.parentElement.classList.toggle('collapsed');
                });
            });
        },

        _bindRange(id, path) {
            const el = document.getElementById(id);
            if (!el) return;

            el.addEventListener('input', () => {
                const newVal = parseInt(el.value);
                const valueEl = document.getElementById(id + 'Value');
                if (valueEl) valueEl.textContent = newVal;
                APP.State.dispatch({ type: path, payload: newVal });
            });
        },

        _bindColor(id, path) {
            const el = document.getElementById(id);
            if (!el) return;

            el.addEventListener('input', () => {
                APP.State.dispatch({ type: path, payload: el.value });
            });
        },

        _bindCheckbox(id, path) {
            const el = document.getElementById(id);
            if (!el) return;

            el.addEventListener('change', () => {
                APP.State.dispatch({ type: path, payload: el.checked });
            });
        },

        _syncFromState(prefix) {
            const state = APP.State.select(prefix);
            if (!state) return;

            Object.entries(state).forEach(([key, value]) => {
                const id = prefix + key.charAt(0).toUpperCase() + key.slice(1);
                const el = document.getElementById(id);
                if (!el) return;

                if (el.type === 'checkbox') {
                    el.checked = value;
                } else if (el.type === 'range') {
                    el.value = value;
                    const valueEl = document.getElementById(id + 'Value');
                    if (valueEl) valueEl.textContent = value;
                } else if (el.type === 'color') {
                    el.value = value;
                }
            });
        }
    };

})(window.APP);
