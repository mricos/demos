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
        'displayHaze': (v) => v === 0 ? 'Off' : v + '%',
        'animationRpb': (v) => parseFloat(v).toFixed(2),
        'trackTension': (v) => (v / 100).toFixed(2),
        'trackRadialsTwist': (v) => v + '°'  // Normals spin in degrees
    };

    // Log scale conversion for PPS (0.5 to 4 pps mapped to 0-100 slider)
    // slider 0 = 0.5 pps, slider 33.3 = 1 pps, slider 66.7 = 2 pps, slider 100 = 4 pps
    const sliderToPps = (slider) => 0.5 * Math.pow(2, slider * 3 / 100);
    const ppsToSlider = (pps) => Math.log2(pps / 0.5) * 100 / 3;

    APP.UI = {
        // Cached DOM references for frequently accessed elements
        elements: {},

        init() {
            // Cache DOM references
            this.elements = {
                outerControls: document.getElementById('outerControls'),
                innerControls: document.getElementById('innerControls'),
                curveControls: document.getElementById('curveControls'),
                trackControls: document.getElementById('trackControls'),
                chaserControls: document.getElementById('chaserControls'),
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
            this._syncFromState('track');
            this._syncFromState('chaser');
            this._syncFromState('scene');
            this._syncFromState('camera');
            this._syncFromState('display');
            this._syncFromState('ui');
            this._syncFromState('animation');

            // Outer controls visibility
            const outerEnabled = APP.State.select('outer.enabled');
            if (this.elements.outerControls) {
                this.elements.outerControls.style.display = outerEnabled !== false ? 'block' : 'none';
            }

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

            // Track controls visibility
            const trackEnabled = APP.State.select('track.enabled');
            if (this.elements.trackControls) {
                this.elements.trackControls.style.display = trackEnabled ? 'block' : 'none';
            }

            // Chaser controls visibility
            const chaserEnabled = APP.State.select('chaser.enabled');
            if (this.elements.chaserControls) {
                this.elements.chaserControls.style.display = chaserEnabled ? 'block' : 'none';
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

            // Bind range inputs - track
            this._bindRange('trackRadius', 'track.radius');
            this._bindRange('trackSegmentsPerSpan', 'track.segmentsPerSpan');
            this._bindRange('trackVariationIntensity', 'track.variationIntensity');
            this._bindTrackTension(); // Custom handler for tension (0-100 to 0-1)

            // Bind range inputs - chaser
            this._bindRange('chaserSpeed', 'chaser.speed');
            this._bindRange('chaserSize', 'chaser.size');
            this._bindRange('chaserTailLength', 'chaser.tailLength');

            // Bind range inputs - camera
            this._bindRange('cameraZoom', 'camera.zoom');
            this._bindFovSCurve('cameraFov', 'camera.fov');  // S-curve: 0-100 → 1-2000
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
            this._bindColor('trackColor', 'track.color');
            this._bindColor('trackColorSecondary', 'track.colorSecondary');
            this._bindColor('chaserColor', 'chaser.color');
            this._bindColor('chaserColorSecondary', 'chaser.colorSecondary');

            // Bind range inputs - animation (log-scale PPS/BPM)
            this._bindAnimationSliders();
            this._bindRange('animationRpb', 'animation.rpb', true);

            // Bind checkboxes
            this._bindCheckbox('outerEnabled', 'outer.enabled');
            this._bindCheckbox('outerWireframe', 'outer.wireframe');
            this._bindCheckbox('innerWireframe', 'inner.wireframe');
            this._bindCheckbox('innerEnabled', 'inner.enabled');
            this._bindCheckbox('curveEnabled', 'curve.enabled');
            this._bindCheckbox('curveWireframe', 'curve.wireframe');
            this._bindCheckbox('trackEnabled', 'track.enabled');
            this._bindCheckbox('trackWireframe', 'track.wireframe');
            this._bindCheckbox('trackEndless', 'track.endless');

            // Track circle (the fundamental primitive)
            this._bindCheckbox('trackCircleEnabled', 'track.circle.visible');
            this._bindCheckbox('trackCircleFill', 'track.circle.fill');
            this._bindRange('trackCircleBorderWidth', 'track.circle.borderWidth');
            this._bindRange('trackCircleSkip', 'track.circle.skip');
            this._bindRangeScaled('trackCircleOpacity', 'track.circle.opacity', 100);
            this._bindColor('trackCircleColor', 'track.circle.color');

            // Track normals (magenta, point radially outward)
            this._bindCheckbox('trackRadialsEnabled', 'track.normals.enabled');
            this._bindRange('trackRadialsRoundness', 'track.normals.roundness');
            this._bindRange('trackRadialsSize', 'track.normals.width');
            this._bindRange('trackRadialsTwist', 'track.normals.spin'); // Spin around own axis

            // Track tangents (green, flat boards perpendicular to normals)
            this._bindCheckbox('trackRadialsOutward', 'track.tangents.enabled');
            this._bindCheckbox('chaserEnabled', 'chaser.enabled');
            this._bindCheckbox('chaserFollow', 'chaser.follow');
            this._bindCheckbox('animationPlaying', 'animation.playing');
            this._bindCheckbox('autoRotate', 'scene.autoRotate');
            this._bindCheckbox('cameraPitchClamp', 'camera.pitchClamp');
            this._bindCheckbox('toastsEnabled', 'display.toasts');
            this._bindCheckbox('statsEnabled', 'display.stats');
            this._bindCheckbox('headerEnabled', 'display.header');
            this._bindCheckbox('uiHud', 'ui.hud');
            this._bindCheckbox('uiGizmo', 'ui.gizmo');

            // Bind select elements - track
            this._bindSelect('trackPreset', 'track.preset');
            this._bindSelect('trackVariationSource', 'track.variationSource');
        },

        _subscribe() {
            // Sync UI when state changes (for MIDI-driven changes)
            APP.State.subscribe('outer.*', () => this._syncFromState('outer'));
            APP.State.subscribe('inner.*', () => this._syncFromState('inner'));
            APP.State.subscribe('curve.*', () => this._syncFromState('curve'));
            APP.State.subscribe('track.*', () => this._syncFromState('track'));
            APP.State.subscribe('chaser.*', () => this._syncFromState('chaser'));
            APP.State.subscribe('scene.*', () => this._syncFromState('scene'));
            APP.State.subscribe('camera.*', () => this._syncFromState('camera'));
            APP.State.subscribe('display.*', () => this._syncFromState('display'));
            APP.State.subscribe('ui.*', () => this._syncFromState('ui'));
            APP.State.subscribe('animation.*', () => this._syncFromState('animation'));

            // Outer controls visibility
            APP.State.subscribe('outer.enabled', (enabled) => {
                if (this.elements.outerControls) {
                    this.elements.outerControls.style.display = enabled !== false ? 'block' : 'none';
                }
            });

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

            // Track controls visibility
            APP.State.subscribe('track.enabled', (enabled) => {
                if (this.elements.trackControls) {
                    this.elements.trackControls.style.display = enabled ? 'block' : 'none';
                }
            });

            // Chaser controls visibility
            APP.State.subscribe('chaser.enabled', (enabled) => {
                if (this.elements.chaserControls) {
                    this.elements.chaserControls.style.display = enabled ? 'block' : 'none';
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

            // Camera info button - rotation semantics (R)
            const cameraInfoBtn = document.getElementById('cameraInfoBtn');
            if (cameraInfoBtn) {
                cameraInfoBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    APP.CameraInfo?.toggle();
                });
            }

            // Frustum info button - perspective/FOV (P)
            const frustumInfoBtn = document.getElementById('frustumInfoBtn');
            if (frustumInfoBtn) {
                frustumInfoBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    APP.FrustumInfo?.toggle();
                });
            }

            // Animation info button (A)
            const animationInfoBtn = document.getElementById('animationInfoBtn');
            if (animationInfoBtn) {
                animationInfoBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    APP.AnimationInfo?.toggle();
                });
            }

            // Code stats button
            const codeStatsBtn = document.getElementById('codeStatsBtn');
            if (codeStatsBtn) {
                codeStatsBtn.addEventListener('click', () => {
                    APP.CodeStats?.toggle();
                });
            }

            // Roll mode select
            const rollModeSelect = document.getElementById('cameraRollMode');
            if (rollModeSelect) {
                // Restore from state
                const saved = APP.State.select('camera.rollMode');
                if (saved) rollModeSelect.value = saved;

                rollModeSelect.addEventListener('change', () => {
                    APP.State.dispatch({ type: 'camera.rollMode', payload: rollModeSelect.value });
                });

                // Sync from state
                APP.State.subscribe('camera.rollMode', (val) => {
                    rollModeSelect.value = val || 'view';
                });
            }

            // Collapsible sections
            document.querySelectorAll('.section-header').forEach(header => {
                header.addEventListener('click', () => {
                    header.parentElement.classList.toggle('collapsed');
                });
            });
        },

        /**
         * Bind PPS and BPM sliders with log scale, both controlling animation.pps
         */
        _bindAnimationSliders() {
            const ppsEl = document.getElementById('animationPps');
            const bpmEl = document.getElementById('animationBpm');
            const ppsValueEl = document.getElementById('animationPpsValue');
            const bpmValueEl = document.getElementById('animationBpmValue');

            const updateDisplays = (pps) => {
                const bpm = pps * 60;
                if (ppsValueEl) ppsValueEl.textContent = pps.toFixed(2);
                if (bpmValueEl) bpmValueEl.textContent = Math.round(bpm);
            };

            const updateSliders = (pps) => {
                const sliderVal = ppsToSlider(pps);
                if (ppsEl) ppsEl.value = sliderVal;
                if (bpmEl) bpmEl.value = sliderVal;
            };

            // PPS slider input
            if (ppsEl) {
                ppsEl.addEventListener('input', () => {
                    const pps = sliderToPps(parseInt(ppsEl.value));
                    updateDisplays(pps);
                    if (bpmEl) bpmEl.value = ppsEl.value; // Sync BPM slider
                    APP.State.dispatch({ type: 'animation.pps', payload: pps });
                });
            }

            // BPM slider input (same log scale, just different label)
            if (bpmEl) {
                bpmEl.addEventListener('input', () => {
                    const pps = sliderToPps(parseInt(bpmEl.value));
                    updateDisplays(pps);
                    if (ppsEl) ppsEl.value = bpmEl.value; // Sync PPS slider
                    APP.State.dispatch({ type: 'animation.pps', payload: pps });
                });
            }

            // Subscribe to state changes to update sliders
            APP.State.subscribe('animation.pps', (pps) => {
                updateDisplays(pps);
                updateSliders(pps);
            });

            // Initial sync
            const initialPps = APP.State.select('animation.pps') || 2.0;
            updateDisplays(initialPps);
            updateSliders(initialPps);
        },

        _bindRange(id, path, isFloat = false) {
            const el = document.getElementById(id);
            if (!el) return;

            const valueEl = document.getElementById(id + 'Value');
            const formatter = VALUE_FORMATTERS[id];

            el.addEventListener('input', () => {
                const newVal = isFloat ? parseFloat(el.value) : parseInt(el.value);
                if (valueEl) {
                    valueEl.textContent = formatter ? formatter(newVal) : newVal;
                }
                APP.State.dispatch({ type: path, payload: newVal });
            });
        },

        _bindRangeScaled(id, path, divisor) {
            const el = document.getElementById(id);
            if (!el) return;

            const valueEl = document.getElementById(id + 'Value');

            el.addEventListener('input', () => {
                const scaledVal = parseInt(el.value) / divisor;
                if (valueEl) {
                    valueEl.textContent = scaledVal;
                }
                APP.State.dispatch({ type: path, payload: scaledVal });
            });
        },

        /**
         * Bind FOV with S-curve mapping (0-100 slider → 1-2000 FOV)
         * S-curve provides more resolution in the useful mid-range
         */
        _bindFovSCurve(id, path) {
            const el = document.getElementById(id);
            if (!el) return;

            const valueEl = document.getElementById(id + 'Value');
            const MIN_FOV = 1;
            const MAX_FOV = 2000;

            // S-curve: more resolution around middle values
            const sliderToFov = (t) => {
                // t is 0-100, normalize to 0-1
                const x = t / 100;
                // Sigmoid-like S-curve with tunable steepness
                const k = 4; // Steepness (higher = sharper transition)
                const s = 1 / (1 + Math.exp(-k * (x - 0.5)));
                // Normalize sigmoid output (which is ~0.018 to ~0.982) to 0-1
                const sMin = 1 / (1 + Math.exp(k * 0.5));
                const sMax = 1 / (1 + Math.exp(-k * 0.5));
                const normalized = (s - sMin) / (sMax - sMin);
                return Math.round(MIN_FOV + normalized * (MAX_FOV - MIN_FOV));
            };

            // Inverse: FOV to slider position (for syncing from state)
            const fovToSlider = (fov) => {
                const normalized = (fov - MIN_FOV) / (MAX_FOV - MIN_FOV);
                const k = 4;
                const sMin = 1 / (1 + Math.exp(k * 0.5));
                const sMax = 1 / (1 + Math.exp(-k * 0.5));
                const s = sMin + normalized * (sMax - sMin);
                // Inverse sigmoid: x = 0.5 - ln((1-s)/s) / k
                const x = 0.5 - Math.log((1 - s) / s) / k;
                return Math.round(x * 100);
            };

            el.addEventListener('input', () => {
                const fov = sliderToFov(parseInt(el.value));
                if (valueEl) {
                    valueEl.textContent = fov;
                }
                APP.State.dispatch({ type: path, payload: fov });
            });

            // Store inverse function for syncing
            el._fovToSlider = fovToSlider;
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

        _bindSelect(id, path) {
            const el = document.getElementById(id);
            if (!el) return;

            // Restore from state
            const saved = APP.State.select(path);
            if (saved) el.value = saved;

            el.addEventListener('change', () => {
                APP.State.dispatch({ type: path, payload: el.value });
            });

            // Sync from state changes
            APP.State.subscribe(path, (val) => {
                el.value = val || '';
            });
        },

        _bindTrackTension() {
            const el = document.getElementById('trackTension');
            const valueEl = document.getElementById('trackTensionValue');
            if (!el) return;

            // Tension is stored as 0-1 but slider shows 0-100
            el.addEventListener('input', () => {
                const tension = parseInt(el.value) / 100;
                if (valueEl) valueEl.textContent = tension.toFixed(2);
                APP.State.dispatch({ type: 'track.tension', payload: tension });
            });

            // Sync from state
            APP.State.subscribe('track.tension', (tension) => {
                el.value = Math.round((tension || 0.5) * 100);
                if (valueEl) valueEl.textContent = (tension || 0.5).toFixed(2);
            });

            // Initial sync
            const initialTension = APP.State.select('track.tension') || 0.5;
            el.value = Math.round(initialTension * 100);
            if (valueEl) valueEl.textContent = initialTension.toFixed(2);
        },

        _syncFromState(prefix) {
            const state = APP.State.select(prefix);
            if (!state) return;

            // Skip custom-handled elements
            const customHandled = ['animationPps', 'animationBpm', 'trackTension', 'cameraFov'];

            Object.entries(state).forEach(([key, value]) => {
                const id = prefix + key.charAt(0).toUpperCase() + key.slice(1);
                if (customHandled.includes(id)) return; // Skip custom-handled elements

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
                } else if (el.tagName === 'SELECT') {
                    el.value = value;
                }
            });

            // Handle nested track subsections
            if (prefix === 'track') {
                this._syncTrackSubsections(state);
            }

            // Handle S-curve FOV sync
            if (prefix === 'camera' && state.fov !== undefined) {
                const fovEl = document.getElementById('cameraFov');
                const fovValueEl = document.getElementById('cameraFovValue');
                if (fovEl && fovEl._fovToSlider) {
                    fovEl.value = fovEl._fovToSlider(state.fov);
                    if (fovValueEl) fovValueEl.textContent = state.fov;
                }
            }
        },

        _syncTrackSubsections(state) {
            // Circle (the fundamental primitive)
            if (state.circle) {
                this._syncEl('trackCircleEnabled', state.circle.visible, 'checkbox');
                this._syncEl('trackCircleFill', state.circle.fill, 'checkbox');
                this._syncEl('trackCircleBorderWidth', state.circle.borderWidth, 'range');
                this._syncEl('trackCircleSkip', state.circle.skip, 'range');
                this._syncEl('trackCircleOpacity', state.circle.opacity * 100, 'range', state.circle.opacity);
                this._syncEl('trackCircleColor', state.circle.color, 'color');
            }

            // Normals (magenta, radially outward)
            if (state.normals) {
                this._syncEl('trackRadialsEnabled', state.normals.enabled, 'checkbox');
                this._syncEl('trackRadialsRoundness', state.normals.roundness, 'range');
                this._syncEl('trackRadialsSize', state.normals.width, 'range');
                this._syncEl('trackRadialsTwist', state.normals.spin, 'range', state.normals.spin + '°');
            }

            // Tangents
            if (state.tangents) {
                this._syncEl('trackRadialsOutward', state.tangents.enabled, 'checkbox');
            }
        },

        _syncEl(id, value, type, displayValue) {
            const el = document.getElementById(id);
            if (!el) return;

            if (type === 'checkbox') {
                el.checked = value;
            } else if (type === 'range') {
                el.value = value;
                const valueEl = document.getElementById(id + 'Value');
                if (valueEl) valueEl.textContent = displayValue !== undefined ? displayValue : value;
            } else if (type === 'color') {
                el.value = value;
            }
        }
    };

})(window.APP);
