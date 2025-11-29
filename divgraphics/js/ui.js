/**
 * DivGraphics - UI Module
 * Input bindings and state synchronization for control panel
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    // Custom display formatters for values
    const VALUE_FORMATTERS = {
        'cameraZoom': (v) => (v / 100).toFixed(1),
        'cameraSensitivity': (v) => (v / 10).toFixed(1),
        'displayHaze': (v) => v === 0 ? 'Off' : v + '%'
    };

    APP.UI = {
        // Cached DOM references for frequently accessed elements
        elements: {},

        init() {
            // Cache DOM references
            this.elements = {
                innerControls: document.getElementById('innerControls'),
                curveControls: document.getElementById('curveControls'),
                resetBtn: document.getElementById('resetBtn')
            };

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
            this._syncFromState('curve');
            this._syncFromState('scene');
            this._syncFromState('camera');
            this._syncFromState('display');

            // Inner controls visibility
            const innerEnabled = APP.State.select('inner.enabled');
            if (this.elements.innerControls) {
                this.elements.innerControls.style.display = innerEnabled ? 'block' : 'none';
            }

            // Curve controls visibility
            const curveEnabled = APP.State.select('curve.enabled');
            if (this.elements.curveControls) {
                this.elements.curveControls.style.display = curveEnabled ? 'block' : 'none';
            }
        },

        _bindInputs() {
            // Bind range inputs - cylinders
            this._bindRange('outerRadius', 'outer.radius');
            this._bindRange('outerHeight', 'outer.height');
            this._bindRange('outerRadialSegments', 'outer.radialSegments');
            this._bindRange('outerHeightSegments', 'outer.heightSegments');
            this._bindRange('innerRadius', 'inner.radius');
            this._bindRange('innerHeight', 'inner.height');
            this._bindRange('innerRadialSegments', 'inner.radialSegments');
            this._bindRange('innerHeightSegments', 'inner.heightSegments');

            // Bind range inputs - curve
            this._bindRange('curveRadius', 'curve.radius');
            this._bindRange('curveCurveSegments', 'curve.curveSegments');
            this._bindRange('curveRadialSegments', 'curve.radialSegments');
            this._bindRange('curveP0x', 'curve.p0x');
            this._bindRange('curveP0y', 'curve.p0y');
            this._bindRange('curveP0z', 'curve.p0z');
            this._bindRange('curveP1x', 'curve.p1x');
            this._bindRange('curveP1y', 'curve.p1y');
            this._bindRange('curveP1z', 'curve.p1z');
            this._bindRange('curveP2x', 'curve.p2x');
            this._bindRange('curveP2y', 'curve.p2y');
            this._bindRange('curveP2z', 'curve.p2z');

            // Bind range inputs - camera
            this._bindRange('cameraZoom', 'camera.zoom');
            this._bindRange('cameraFov', 'camera.fov');
            this._bindRange('cameraPanX', 'camera.panX');
            this._bindRange('cameraPanY', 'camera.panY');
            this._bindRange('cameraRotationZ', 'camera.rotationZ');
            this._bindRange('cameraSensitivity', 'camera.sensitivity');

            // Bind range inputs - display
            this._bindRange('displayHaze', 'display.haze');

            // Bind color inputs
            this._bindColor('outerColor', 'outer.color');
            this._bindColor('outerColorSecondary', 'outer.colorSecondary');
            this._bindColor('innerColor', 'inner.color');
            this._bindColor('innerColorSecondary', 'inner.colorSecondary');
            this._bindColor('curveColor', 'curve.color');
            this._bindColor('curveColorSecondary', 'curve.colorSecondary');

            // Bind checkboxes
            this._bindCheckbox('outerWireframe', 'outer.wireframe');
            this._bindCheckbox('innerWireframe', 'inner.wireframe');
            this._bindCheckbox('innerEnabled', 'inner.enabled');
            this._bindCheckbox('curveEnabled', 'curve.enabled');
            this._bindCheckbox('curveWireframe', 'curve.wireframe');
            this._bindCheckbox('autoRotate', 'scene.autoRotate');
            this._bindCheckbox('cameraPitchClamp', 'camera.pitchClamp');
            this._bindCheckbox('toastsEnabled', 'display.toasts');
            this._bindCheckbox('statsEnabled', 'display.stats');
            this._bindCheckbox('headerEnabled', 'display.header');
        },

        _subscribe() {
            // Sync UI when state changes (for MIDI-driven changes)
            APP.State.subscribe('outer.*', () => this._syncFromState('outer'));
            APP.State.subscribe('inner.*', () => this._syncFromState('inner'));
            APP.State.subscribe('curve.*', () => this._syncFromState('curve'));
            APP.State.subscribe('scene.*', () => this._syncFromState('scene'));
            APP.State.subscribe('camera.*', () => this._syncFromState('camera'));
            APP.State.subscribe('display.*', () => this._syncFromState('display'));

            // Inner controls visibility
            APP.State.subscribe('inner.enabled', (enabled) => {
                if (this.elements.innerControls) {
                    this.elements.innerControls.style.display = enabled ? 'block' : 'none';
                }
            });

            // Curve controls visibility
            APP.State.subscribe('curve.enabled', (enabled) => {
                if (this.elements.curveControls) {
                    this.elements.curveControls.style.display = enabled ? 'block' : 'none';
                }
            });
        },

        _setupUI() {
            // Reset button
            if (this.elements.resetBtn) {
                this.elements.resetBtn.addEventListener('click', () => APP.Scene.resetView());
            }

            // Curve info button
            const curveInfoBtn = document.getElementById('curveInfoBtn');
            if (curveInfoBtn) {
                curveInfoBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Don't toggle section
                    APP.CurveInfo?.toggle();
                });
            }

            // Frustum info button
            const frustumInfoBtn = document.getElementById('frustumInfoBtn');
            if (frustumInfoBtn) {
                frustumInfoBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Don't toggle section
                    APP.FrustumInfo?.toggle();
                });
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

            const valueEl = document.getElementById(id + 'Value');
            const formatter = VALUE_FORMATTERS[id];

            el.addEventListener('input', () => {
                const newVal = parseInt(el.value);
                if (valueEl) {
                    valueEl.textContent = formatter ? formatter(newVal) : newVal;
                }
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
                    if (valueEl) {
                        const formatter = VALUE_FORMATTERS[id];
                        valueEl.textContent = formatter ? formatter(value) : value;
                    }
                } else if (el.type === 'color') {
                    el.value = value;
                }
            });
        }
    };

})(window.APP);
