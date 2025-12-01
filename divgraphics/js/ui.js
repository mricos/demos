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
        'displayGreenDesat': (v) => v === 0 ? 'Off' : v + '%',
        'displayBlur': (v) => v === 0 ? 'Off' : v + '%',
        'displayDimmer': (v) => v + '%',
        'displayBright': (v) => v + '%',
        'trackTension': (v) => (v / 100).toFixed(2),
        'trackRadialsTwist': (v) => v + '°',
        'curveSpread': (v) => v + '%',
        'curvePhase': (v) => v + '°',
        'curveSpin': (v) => v + '°',
        'curveBorderWidth': (v) => (v / 100).toFixed(3),
        'curveFaceWidthScale': (v) => v + '%',
        'curveSoftness': (v) => v,
        'curveRound': (v) => v + '%',
        'curveBreatheScale': (v) => v + '%',
        'curveBreatheSpeed': (v) => v,
        'curveBreathePhase': (v) => v + '°',
        'curveCrystalSpread': (v) => v + '°',
        'curveCrystalTwist': (v) => v + '°',
        'curveRotateX': (v) => v + '°',
        'curveRotateY': (v) => v + '°',
        'curveRotateZ': (v) => v + '°',
        'trackRotationSpeed': (v) => v,
        'trackRotationPpr': (v) => v,
        'sphereOpacity': (v) => (v / 100).toFixed(2),
        'spherePulse': (v) => (v / 100).toFixed(2),
        'spherePulseDepth': (v) => v + '%',
        'icosahedronOpacity': (v) => (v / 100).toFixed(2)
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
                sphereControls: document.getElementById('sphereControls'),
                icoControls: document.getElementById('icoControls'),
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
            this._syncFromState('sphere');
            this._syncFromState('icosahedron');
            this._syncFromState('curve');
            this._syncFromState('track');
            this._syncFromState('chaser');
            this._syncFromState('scene');
            this._syncFromState('camera');
            this._syncFromState('display');
            this._syncFromState('ui');
            this._syncFromState('animation');
            this._syncFromState('pip');

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

            // Sphere controls visibility
            const sphereEnabled = APP.State.select('sphere.enabled');
            if (this.elements.sphereControls) {
                this.elements.sphereControls.style.display = sphereEnabled ? 'block' : 'none';
            }

            // Icosahedron controls visibility
            const icoEnabled = APP.State.select('icosahedron.enabled');
            if (this.elements.icoControls) {
                this.elements.icoControls.style.display = icoEnabled ? 'block' : 'none';
            }
        },

        _bindInputs() {
            // Bind shape selects - outer/inner geometry
            this._bindSelect('outerShape', 'outer.shape');
            this._bindSelect('innerShape', 'inner.shape');

            // Bind range inputs - cylinders
            this._bindRange('outerRadius', 'outer.radius');
            this._bindRange('outerHeight', 'outer.height');
            this._bindRange('outerRadialSegments', 'outer.radialSegments');
            this._bindRange('outerHeightSegments', 'outer.heightSegments');
            this._bindRange('outerScale', 'outer.scale');
            this._bindRange('innerRadius', 'inner.radius');
            this._bindRange('innerHeight', 'inner.height');
            this._bindRange('innerRadialSegments', 'inner.radialSegments');
            this._bindRange('innerHeightSegments', 'inner.heightSegments');
            this._bindRange('innerScale', 'inner.scale');

            // Bind sphere controls
            this._bindCheckbox('sphereWireframe', 'sphere.wireframe');
            this._bindCheckbox('sphereFaceInward', 'sphere.faceInward');
            this._bindRange('sphereRadius', 'sphere.radius');
            this._bindRange('sphereLatSegments', 'sphere.latSegments');
            this._bindRange('sphereLonSegments', 'sphere.lonSegments');
            this._bindRange('sphereSubdivisions', 'sphere.subdivisions');
            this._bindRange('sphereSegmentSize', 'sphere.segmentSize');
            this._bindRange('sphereRoundness', 'sphere.roundness');
            this._bindCheckbox('sphereFlat', 'sphere.flat');
            this._bindBorderWidth('sphereBorderWidth', 'sphere.borderWidth');
            this._bindRangeScaled('sphereOpacity', 'sphere.opacity', 100);
            this._bindRange('sphereScale', 'sphere.scale');
            this._bindRangeScaled('spherePulse', 'sphere.pulse', 100);  // 0-100 → 0-1
            this._bindRange('spherePulseDepth', 'sphere.pulseDepth');
            this._bindColor('sphereColor', 'sphere.color');
            this._bindColor('sphereColorSecondary', 'sphere.colorSecondary');
            this._bindSphereWireframeMode();
            this._bindSphereType(); // Toggle lat/lon vs subdivisions visibility

            // Bind icosahedron controls
            this._bindCheckbox('icoEnabled', 'icosahedron.enabled');
            this._bindCheckbox('icoWireframe', 'icosahedron.wireframe');
            this._bindCheckbox('icoFaceInward', 'icosahedron.faceInward');
            this._bindRange('icoRadius', 'icosahedron.radius');
            this._bindRange('icoSubdivisions', 'icosahedron.subdivisions');
            this._bindBorderWidth('icoBorderWidth', 'icosahedron.borderWidth');
            this._bindRangeScaled('icoOpacity', 'icosahedron.opacity', 100);
            this._bindColor('icoColor', 'icosahedron.color');
            this._bindColor('icoColorSecondary', 'icosahedron.colorSecondary');
            this._bindIcoDual(); // Ico/Dodeca toggle

            // Bind range inputs - curve
            this._bindRange('curveRadius', 'curve.radius');
            this._bindRange('curveCurveSegments', 'curve.curveSegments');
            this._bindRange('curveRadialSegments', 'curve.radialSegments');

            // Curve geometry
            this._bindCurveLength(); // Custom handler for length (0-200 → 0.0-2.0)
            this._bindSpacing(); // Custom handler for spacing (0-200 → 0%-200%)
            this._bindRange('curveTwist', 'curve.twist');
            this._bindRange('curveBorderWidth', 'curve.borderWidth');
            this._bindFaceWidthScale(); // Custom handler for face width (0-200 → 0%-200%)
            this._bindCheckbox('curveLoopBorder', 'curve.loopBorder');
            this._bindRange('curveSoftness', 'curve.softness');
            this._bindRange('curveRound', 'curve.round');

            this._bindRange('curveP0x', 'curve.p0x');
            this._bindRange('curveP0y', 'curve.p0y');
            this._bindRange('curveP0z', 'curve.p0z');
            this._bindRange('curveP1x', 'curve.p1x');
            this._bindRange('curveP1y', 'curve.p1y');
            this._bindRange('curveP1z', 'curve.p1z');
            this._bindRange('curveP2x', 'curve.p2x');
            this._bindRange('curveP2y', 'curve.p2y');
            this._bindRange('curveP2z', 'curve.p2z');

            // Curve modulation (shared across modes)
            this._bindRange('curvePieceCount', 'curve.pieceCount');
            this._bindRange('curveSpread', 'curve.spread');
            this._bindRange('curvePhase', 'curve.phase');
            this._bindRange('curveSpin', 'curve.spin');
            this._bindRange('curveSineFrequency', 'curve.sineFrequency');
            this._bindRange('curveSineAmplitudeX', 'curve.sineAmplitudeX');
            this._bindRange('curveSineAmplitudeY', 'curve.sineAmplitudeY');
            this._bindRange('curveSineAmplitudeZ', 'curve.sineAmplitudeZ');

            // Curve breathing
            this._bindCheckbox('curveBreathe', 'curve.breathe');
            this._bindRange('curveBreatheScale', 'curve.breatheScale');
            this._bindBreatheSpeed(); // Custom handler for speed (25-400 to 0.25-4.0)
            this._bindRange('curveBreathePhase', 'curve.breathePhase');

            // Curve rotation around center of mass
            this._bindRange('curveRotateX', 'curve.rotateX');
            this._bindRange('curveRotateY', 'curve.rotateY');
            this._bindRange('curveRotateZ', 'curve.rotateZ');

            // Curve crystal mode
            this._bindRange('curveCrystalLayers', 'curve.crystal.layers');
            this._bindRange('curveCrystalSpread', 'curve.crystal.spread');
            this._bindRange('curveCrystalPetalLength', 'curve.crystal.petalLength');
            this._bindRange('curveCrystalPetalWidth', 'curve.crystal.petalWidth');
            this._bindRange('curveCrystalConvergence', 'curve.crystal.convergence');
            this._bindRange('curveCrystalTwist', 'curve.crystal.twist');
            this._bindRange('curveCrystalBloom', 'curve.crystal.bloom');
            this._bindRange('curveCrystalScale', 'curve.crystal.scale');

            // Bind range inputs - track
            this._bindRange('trackRadius', 'track.radius');
            this._bindRange('trackSegmentsPerSpan', 'track.segmentsPerSpan');
            this._bindRange('trackVariationIntensity', 'track.variationIntensity');
            this._bindTrackTension(); // Custom handler for tension (0-100 to 0-1)

            // Bind range inputs - chaser
            this._bindRange('chaserSpeed', 'chaser.speed');
            this._bindChaserDirection();
            this._bindCheckbox('chaserSyncBpm', 'chaser.syncBpm');
            this._bindRange('chaserSmoothing', 'chaser.smoothing');
            // Head
            this._bindRange('chaserSize', 'chaser.size');
            this._bindSelect('chaserHeadShape', 'chaser.headShape');
            this._bindRange('chaserHeadRoundness', 'chaser.headRoundness');
            this._bindRange('chaserHeadOpacity', 'chaser.headOpacity');
            // Body (wings)
            this._bindRange('chaserBodyLength', 'chaser.bodyLength');
            this._bindRange('chaserBodyWidth', 'chaser.bodyWidth');
            this._bindRange('chaserBodyAngle', 'chaser.bodyAngle');
            this._bindRange('chaserBodyRoundness', 'chaser.bodyRoundness');
            this._bindRange('chaserBodyOpacity', 'chaser.bodyOpacity');
            this._bindSelect('chaserBodyStyle', 'chaser.bodyStyle');
            // Tail
            this._bindRange('chaserTailLength', 'chaser.tailLength');
            this._bindRange('chaserTailWidth', 'chaser.tailWidth');
            this._bindRange('chaserTailAngle', 'chaser.tailAngle');
            this._bindRange('chaserTailOpacity', 'chaser.tailOpacity');
            this._bindSelect('chaserTailStyle', 'chaser.tailStyle');
            // Glow
            this._bindRange('chaserGlowSize', 'chaser.glowSize');
            this._bindRange('chaserGlowIntensity', 'chaser.glowIntensity');

            // Bind range inputs - camera
            this._bindRange('cameraZoom', 'camera.zoom');
            this._bindFovSCurve('cameraFov', 'camera.fov');  // S-curve: 0-100 → 1-2000
            this._bindRange('cameraPanX', 'camera.panX');
            this._bindRange('cameraPanY', 'camera.panY');
            this._bindRange('cameraRotationZ', 'camera.rotationZ');
            this._bindRange('cameraSensitivity', 'camera.sensitivity');

            // Bind range inputs - display effects
            this._bindRange('displayHaze', 'display.haze');
            this._bindRange('displayGreenDesat', 'display.greenDesat');
            this._bindRange('displayBlur', 'display.blur');
            this._bindDimmer();

            // Bind color inputs
            this._bindColor('outerColor', 'outer.color');
            this._bindColor('outerColorSecondary', 'outer.colorSecondary');
            this._bindColor('innerColor', 'inner.color');
            this._bindColor('innerColorSecondary', 'inner.colorSecondary');
            this._bindColor('sphereColor', 'sphere.color');
            this._bindColor('sphereColorSecondary', 'sphere.colorSecondary');
            this._bindColor('curveColor', 'curve.color');
            this._bindColor('curveColorSecondary', 'curve.colorSecondary');
            this._bindColor('trackColor', 'track.color');
            this._bindColor('trackColorSecondary', 'track.colorSecondary');
            this._bindColor('chaserColor', 'chaser.color');
            this._bindColor('chaserColorSecondary', 'chaser.colorSecondary');

            // Bind range inputs - animation (log-scale PPS/BPM)
            this._bindAnimationSliders();
            this._bindRange('animationPpr', 'animation.ppr');

            // Bind checkboxes
            this._bindCheckbox('outerEnabled', 'outer.enabled');
            this._bindCheckbox('outerWireframe', 'outer.wireframe');
            this._bindCheckbox('innerWireframe', 'inner.wireframe');
            this._bindCheckbox('innerEnabled', 'inner.enabled');
            this._bindCheckbox('sphereEnabled', 'sphere.enabled');
            this._bindCheckbox('sphereWireframe', 'sphere.wireframe');
            this._bindCheckbox('sphereFaceInward', 'sphere.faceInward');
            this._bindCheckbox('curveEnabled', 'curve.enabled');
            this._bindCheckbox('curveWireframe', 'curve.wireframe');
            this._bindCheckbox('curveBoundingBox', 'curve.showBoundingBox');
            this._bindCurveMode(); // Custom handler for mode visibility
            this._bindCurveOffset(); // Custom handler for per-mode offset
            this._bindCheckbox('trackEnabled', 'track.enabled');
            this._bindCheckbox('trackWireframe', 'track.wireframe');
            this._bindCheckbox('trackEndless', 'track.endless');

            // Track hoop (the ring at each track point)
            this._bindCheckbox('trackHoopEnabled', 'track.hoop.visible');
            this._bindCheckbox('trackHoopFill', 'track.hoop.fill');
            this._bindRange('trackHoopRadius', 'track.hoop.radius');
            this._bindRange('trackHoopBorderWidth', 'track.hoop.borderWidth');
            this._bindRange('trackHoopSkip', 'track.hoop.skip');
            this._bindRangeScaled('trackHoopOpacity', 'track.hoop.opacity', 100);
            this._bindColor('trackHoopColor', 'track.hoop.color');

            // Track normals (magenta, point radially outward)
            this._bindCheckbox('trackRadialsEnabled', 'track.normals.enabled');
            this._bindRange('trackRadialsRoundness', 'track.normals.roundness');
            this._bindRange('trackRadialsSize', 'track.normals.width');
            this._bindRange('trackRadialsTwist', 'track.normals.spin'); // Spin around own axis

            // Track tangents (green, flat boards perpendicular to normals)
            this._bindCheckbox('trackRadialsOutward', 'track.tangents.enabled');
            this._bindCheckbox('chaserEnabled', 'chaser.enabled');
            this._bindCheckbox('chaserFollow', 'chaser.follow');
            this._bindCheckbox('pipShowWhenFollow', 'pip.showWhenFollow');
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

            // Track rotation controls
            this._bindRange('trackRotationSpeed', 'track.rotation.speed');
            this._bindRange('trackRotationPpr', 'track.rotation.ppr');
            this._bindTrackRotationDirection();
            this._bindCheckbox('trackRotationSyncBpm', 'track.rotation.syncBpm');
        },

        _subscribe() {
            // Sync UI when state changes (for MIDI/LFO-driven changes)
            // Use targeted sync to avoid expensive full-state iteration
            const prefixes = ['outer', 'inner', 'sphere', 'icosahedron', 'curve',
                              'track', 'chaser', 'scene', 'camera', 'display', 'ui', 'animation'];

            prefixes.forEach(prefix => {
                APP.State.subscribe(`${prefix}.*`, (val, state, meta) => {
                    // Targeted sync: only update the specific element that changed
                    this._syncSingleElement(meta.path, val);
                });
            });
            APP.State.subscribe('pip.*', () => this._syncFromState('pip'));

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

            // Sphere controls visibility
            APP.State.subscribe('sphere.enabled', (enabled) => {
                if (this.elements.sphereControls) {
                    this.elements.sphereControls.style.display = enabled ? 'block' : 'none';
                }
            });

            // Icosahedron controls visibility
            APP.State.subscribe('icosahedron.enabled', (enabled) => {
                if (this.elements.icoControls) {
                    this.elements.icoControls.style.display = enabled ? 'block' : 'none';
                }
            });
        },

        _setupUI() {
            // Ghost badge toggles - update text on change
            this._setupGhostBadges();

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

            // Collapsible subsections
            document.querySelectorAll('.subsection-header').forEach(header => {
                header.addEventListener('click', (e) => {
                    // Don't toggle if clicking on a control inside the header
                    if (e.target.matches('input, select, button')) return;
                    header.parentElement.classList.toggle('collapsed');
                });
            });

            // Ctrl buttons (C) - scroll to and expand MIDI/Gamepad section
            this._setupCtrlButtons();

            // Export/Import settings
            this._setupSettingsIO();
        },

        /**
         * Setup ctrl-btn click handlers
         * Now handled by ControlHelper which shows Input Sources popup
         */
        _setupCtrlButtons() {
            // Click behavior managed by ControlHelper
            // Both click and long-press show the Input Sources popup
        },

        /**
         * Setup export/import settings functionality
         */
        _setupSettingsIO() {
            const exportBtn = document.getElementById('exportSettingsBtn');
            const importBtn = document.getElementById('importSettingsBtn');
            const importFile = document.getElementById('importSettingsFile');

            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    this._exportSettings();
                });
            }

            if (importBtn && importFile) {
                importBtn.addEventListener('click', () => {
                    importFile.click();
                });

                importFile.addEventListener('change', (e) => {
                    if (e.target.files.length > 0) {
                        this._importSettings(e.target.files[0]);
                        e.target.value = ''; // Reset for next import
                    }
                });
            }
        },

        /**
         * Export current settings to a JSON file
         */
        _exportSettings() {
            // Get current state (exclude runtime config)
            const state = APP.State.state;
            const exportData = {};

            // Copy all state except config (runtime constants)
            for (const key in state) {
                if (key !== 'config') {
                    exportData[key] = JSON.parse(JSON.stringify(state[key]));
                }
            }

            // Add metadata
            exportData._meta = {
                exportedAt: new Date().toISOString(),
                version: '1.0'
            };

            // Create and download file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `divgraphics-settings-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            APP.Toast?.success('Settings exported');
        },

        /**
         * Import settings from a JSON file
         */
        _importSettings(file) {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const importData = JSON.parse(e.target.result);

                    // Remove metadata before applying
                    delete importData._meta;

                    // Migrate old track settings (pre-hoop refactor)
                    // Old: track.radius was tube size (5-50), track.circle was hoop settings
                    // New: track.radius is path scale (50-200), track.hoop.radius is tube size
                    if (importData.track) {
                        const oldRadius = importData.track.radius;
                        // Detect old format: radius was tube size (typically 5-50)
                        if (oldRadius && oldRadius < 50) {
                            // Migrate: old radius -> hoop.radius, set new radius to default
                            if (!importData.track.hoop) {
                                importData.track.hoop = {};
                            }
                            importData.track.hoop.radius = oldRadius;
                            importData.track.radius = 100; // Default path scale

                            // Also migrate circle -> hoop if present
                            if (importData.track.circle && !importData.track.hoop.visible) {
                                Object.assign(importData.track.hoop, importData.track.circle);
                                delete importData.track.circle;
                            }
                            console.log('Migrated old track settings: radius', oldRadius, '-> hoop.radius');
                        }
                    }

                    // Apply each top-level state section
                    for (const section in importData) {
                        const sectionData = importData[section];

                        if (typeof sectionData === 'object' && sectionData !== null) {
                            // Dispatch each property in the section
                            this._applyStateSection(section, sectionData);
                        }
                    }

                    // Force UI sync
                    this._restoreFromState();

                    APP.Toast?.success('Settings imported');
                } catch (err) {
                    console.error('Import error:', err);
                    APP.Toast?.show('Import failed: ' + err.message, 'error');
                }
            };

            reader.onerror = () => {
                APP.Toast?.show('Failed to read file', 'error');
            };

            reader.readAsText(file);
        },

        /**
         * Recursively apply state section
         * Skips empty objects and handles null values
         */
        _applyStateSection(prefix, data, depth = 0) {
            // Safety limit to prevent infinite recursion
            if (depth > 10) return;

            for (const key in data) {
                const path = `${prefix}.${key}`;
                const value = data[key];

                // Skip null/undefined values
                if (value === null || value === undefined) {
                    continue;
                }

                // Check if it's a non-empty plain object (not array)
                const isPlainObject = typeof value === 'object' && !Array.isArray(value);
                const hasKeys = isPlainObject && Object.keys(value).length > 0;

                if (isPlainObject && hasKeys) {
                    // Check if this is a "leaf" object that should be set as a whole
                    // (objects with only primitive values, or known leaf objects)
                    const isLeafObject = this._isLeafObject(value);

                    if (isLeafObject) {
                        // Set the entire object at once
                        APP.State.dispatch({ type: path, payload: value });
                    } else {
                        // Recurse into nested objects
                        this._applyStateSection(path, value, depth + 1);
                    }
                } else if (!isPlainObject || !hasKeys) {
                    // Dispatch primitive values and empty objects
                    APP.State.dispatch({ type: path, payload: value });
                }
            }
        },

        /**
         * Check if an object should be treated as a leaf (set as whole)
         * Returns true for objects containing only primitives or arrays
         */
        _isLeafObject(obj) {
            for (const key in obj) {
                const val = obj[key];
                if (val !== null && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0) {
                    return false;
                }
            }
            return true;
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

        /**
         * Bind curve length slider (10-300 → 0.1-3.0 display)
         */
        _bindCurveLength() {
            const el = document.getElementById('curveLength');
            const valueEl = document.getElementById('curveLengthValue');
            if (!el) return;

            // Length stored as 10-300, display as 0.1-3.0
            el.addEventListener('input', () => {
                const length = parseInt(el.value);
                if (valueEl) valueEl.textContent = (length / 100).toFixed(1);
                APP.State.dispatch({ type: 'curve.length', payload: length });
            });

            // Sync from state
            APP.State.subscribe('curve.length', (length) => {
                el.value = length || 100;
                if (valueEl) valueEl.textContent = ((length || 100) / 100).toFixed(1);
            });

            // Initial sync
            const initialLength = APP.State.select('curve.length') || 100;
            el.value = initialLength;
            if (valueEl) valueEl.textContent = (initialLength / 100).toFixed(1);
        },

        /**
         * Bind face width scale slider (0-200 → 0%-200% display)
         */
        _bindFaceWidthScale() {
            const el = document.getElementById('curveFaceWidthScale');
            const valueEl = document.getElementById('curveFaceWidthScaleValue');
            if (!el) return;

            el.addEventListener('input', () => {
                const scale = parseInt(el.value);
                if (valueEl) valueEl.textContent = scale + '%';
                APP.State.dispatch({ type: 'curve.faceWidthScale', payload: scale });
            });

            // Sync from state
            APP.State.subscribe('curve.faceWidthScale', (scale) => {
                const val = scale ?? 100;
                el.value = val;
                if (valueEl) valueEl.textContent = val + '%';
            });

            // Initial sync
            const initialScale = APP.State.select('curve.faceWidthScale') ?? 100;
            el.value = initialScale;
            if (valueEl) valueEl.textContent = initialScale + '%';
        },

        /**
         * Bind spacing slider (0-200 → 0%-200% display)
         */
        _bindSpacing() {
            const el = document.getElementById('curveSpacing');
            const valueEl = document.getElementById('curveSpacingValue');
            if (!el) return;

            el.addEventListener('input', () => {
                const val = parseInt(el.value);
                if (valueEl) valueEl.textContent = val + '%';
                APP.State.dispatch({ type: 'curve.spacing', payload: val });
            });

            APP.State.subscribe('curve.spacing', (val) => {
                const v = val ?? 100;
                el.value = v;
                if (valueEl) valueEl.textContent = v + '%';
            });

            const initial = APP.State.select('curve.spacing') ?? 100;
            el.value = initial;
            if (valueEl) valueEl.textContent = initial + '%';
        },

        /**
         * Bind global dimmer and bright - applies brightness filter to scene
         */
        _bindDimmer() {
            const dimmerEl = document.getElementById('displayDimmer');
            const dimmerValueEl = document.getElementById('displayDimmerValue');
            const brightEl = document.getElementById('displayBright');
            const brightValueEl = document.getElementById('displayBrightValue');
            const scene = document.getElementById('scene');
            if (!scene) return;

            const applyBrightness = () => {
                const dimmer = APP.State.select('display.dimmer') ?? 100;
                const bright = APP.State.select('display.bright') ?? 100;
                // Combine: dimmer (0-100) and bright (100-300)
                // At dimmer=100, bright=100 → 1.0
                // At dimmer=50, bright=100 → 0.5
                // At dimmer=100, bright=200 → 2.0
                const brightness = (dimmer / 100) * (bright / 100);
                scene.style.filter = brightness !== 1 ? `brightness(${brightness})` : '';
            };

            if (dimmerEl) {
                dimmerEl.addEventListener('input', () => {
                    const val = parseInt(dimmerEl.value);
                    if (dimmerValueEl) dimmerValueEl.textContent = val + '%';
                    APP.State.dispatch({ type: 'display.dimmer', payload: val });
                    applyBrightness();
                });
            }

            if (brightEl) {
                brightEl.addEventListener('input', () => {
                    const val = parseInt(brightEl.value);
                    if (brightValueEl) brightValueEl.textContent = val + '%';
                    APP.State.dispatch({ type: 'display.bright', payload: val });
                    applyBrightness();
                });
            }

            // Sync from state
            APP.State.subscribe('display.dimmer', (val) => {
                if (dimmerEl) dimmerEl.value = val ?? 100;
                if (dimmerValueEl) dimmerValueEl.textContent = (val ?? 100) + '%';
                applyBrightness();
            });

            APP.State.subscribe('display.bright', (val) => {
                if (brightEl) brightEl.value = val ?? 100;
                if (brightValueEl) brightValueEl.textContent = (val ?? 100) + '%';
                applyBrightness();
            });

            // Initial sync
            if (dimmerEl) {
                const initialDimmer = APP.State.select('display.dimmer') ?? 100;
                dimmerEl.value = initialDimmer;
                if (dimmerValueEl) dimmerValueEl.textContent = initialDimmer + '%';
            }
            if (brightEl) {
                const initialBright = APP.State.select('display.bright') ?? 100;
                brightEl.value = initialBright;
                if (brightValueEl) brightValueEl.textContent = initialBright + '%';
            }
            applyBrightness();
        },

        /**
         * Bind curve mode selector (radio badges) with visibility toggle
         */
        _bindCurveMode() {
            const radios = document.querySelectorAll('input[name="curveMode"]');
            const modulationControls = document.getElementById('curveModulationControls');
            const crystalControls = document.getElementById('curveCrystalControls');
            const bezierControls = document.getElementById('curveBezierControls');
            if (!radios.length) return;

            const updateVisibility = (mode) => {
                // Modulation controls visible for distribute and crystal modes
                if (modulationControls) {
                    modulationControls.style.display = (mode === 'distribute' || mode === 'crystal') ? 'block' : 'none';
                }
                // Crystal controls only for crystal mode
                if (crystalControls) {
                    crystalControls.style.display = mode === 'crystal' ? 'block' : 'none';
                }
                // Bezier controls only for bezier mode
                if (bezierControls) {
                    bezierControls.style.display = mode === 'bezier' ? 'block' : 'none';
                }
            };

            // Handle radio changes
            radios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.checked) {
                        APP.State.dispatch({ type: 'curve.mode', payload: radio.value });
                        updateVisibility(radio.value);
                    }
                });
            });

            // Sync from state
            APP.State.subscribe('curve.mode', (mode) => {
                const targetMode = mode || 'bezier';
                radios.forEach(radio => {
                    radio.checked = radio.value === targetMode;
                });
                updateVisibility(targetMode);
            });

            // Initial sync
            const initialMode = APP.State.select('curve.mode') || 'bezier';
            radios.forEach(radio => {
                radio.checked = radio.value === initialMode;
            });
            updateVisibility(initialMode);
        },

        /**
         * Bind curve offset controls (per-mode X/Y/Z offset)
         * Radio buttons select which mode's offset to edit
         * Defaults to and follows the currently selected curve.mode
         */
        _bindCurveOffset() {
            const radios = document.querySelectorAll('input[name="curveOffsetMode"]');
            const xSlider = document.getElementById('curveOffsetX');
            const ySlider = document.getElementById('curveOffsetY');
            const zSlider = document.getElementById('curveOffsetZ');
            const scaleSlider = document.getElementById('curveOffsetScale');
            const xValue = document.getElementById('curveOffsetXValue');
            const yValue = document.getElementById('curveOffsetYValue');
            const zValue = document.getElementById('curveOffsetZValue');
            const scaleValue = document.getElementById('curveOffsetScaleValue');

            if (!radios.length || !xSlider || !ySlider || !zSlider) return;

            // Map curve.mode to offset mode (free uses bezier offset)
            const modeToOffsetMode = (mode) => {
                if (mode === 'distribute') return 'distribute';
                if (mode === 'crystal') return 'crystal';
                return 'bezier'; // 'free' and 'bezier' both use bezier offset
            };

            // Track currently selected offset mode - init from curve.mode
            const currentCurveMode = APP.State.select('curve.mode') || 'bezier';
            let selectedOffsetMode = modeToOffsetMode(currentCurveMode);

            // Get state path for current mode's offset
            const getOffsetPath = (mode) => {
                switch (mode) {
                    case 'distribute': return 'curve.distributeOffset';
                    case 'crystal': return 'curve.crystalOffset';
                    default: return 'curve.bezierOffset';
                }
            };

            // Get state path for current mode's scale
            const getScalePath = (mode) => {
                switch (mode) {
                    case 'distribute': return 'curve.distributeScale';
                    case 'crystal': return 'curve.crystalScale';
                    default: return 'curve.bezierScale';
                }
            };

            // Update sliders from state
            const syncSliders = () => {
                const offsetPath = getOffsetPath(selectedOffsetMode);
                const scalePath = getScalePath(selectedOffsetMode);
                const offset = APP.State.select(offsetPath) || { x: 0, y: 0, z: 0 };
                const scale = APP.State.select(scalePath) ?? 100;
                xSlider.value = offset.x || 0;
                ySlider.value = offset.y || 0;
                zSlider.value = offset.z || 0;
                if (scaleSlider) scaleSlider.value = scale;
                if (xValue) xValue.textContent = offset.x || 0;
                if (yValue) yValue.textContent = offset.y || 0;
                if (zValue) zValue.textContent = offset.z || 0;
                if (scaleValue) scaleValue.textContent = scale + '%';
            };

            // Handle radio changes
            radios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.checked) {
                        selectedOffsetMode = radio.value;
                        syncSliders();
                    }
                });
            });

            // Simple input handlers - dispatch to nested path directly
            xSlider.addEventListener('input', () => {
                const val = parseInt(xSlider.value);
                if (xValue) xValue.textContent = val;
                const path = getOffsetPath(selectedOffsetMode) + '.x';
                APP.State.dispatch({ type: path, payload: val });
            });

            ySlider.addEventListener('input', () => {
                const val = parseInt(ySlider.value);
                if (yValue) yValue.textContent = val;
                const path = getOffsetPath(selectedOffsetMode) + '.y';
                APP.State.dispatch({ type: path, payload: val });
            });

            zSlider.addEventListener('input', () => {
                const val = parseInt(zSlider.value);
                if (zValue) zValue.textContent = val;
                const path = getOffsetPath(selectedOffsetMode) + '.z';
                APP.State.dispatch({ type: path, payload: val });
            });

            // Scale slider handler
            if (scaleSlider) {
                scaleSlider.addEventListener('input', () => {
                    const val = parseInt(scaleSlider.value);
                    if (scaleValue) scaleValue.textContent = val + '%';
                    const path = getScalePath(selectedOffsetMode);
                    APP.State.dispatch({ type: path, payload: val });
                    // Also update the generic path for CC/LFO consistency
                    APP.State.dispatch({ type: 'curve.offset.scale', payload: val });
                });
            }

            // Sync radio buttons to match selected mode
            const syncRadios = () => {
                radios.forEach(radio => {
                    radio.checked = radio.value === selectedOffsetMode;
                });
            };

            // Subscribe to curve.mode changes - auto-switch offset mode to match
            APP.State.subscribe('curve.mode', (newMode) => {
                selectedOffsetMode = modeToOffsetMode(newMode);
                syncRadios();
                syncSliders();
            });

            // Guard against recursive dispatch
            let isForwarding = false;

            // Subscribe to curve.offset.scale (from CC/LFO) - apply to current mode
            APP.State.subscribe('curve.offset.scale', (val) => {
                if (val === undefined || isForwarding) return;
                isForwarding = true;
                const path = getScalePath(selectedOffsetMode);
                // Update the per-mode scale
                APP.State.dispatch({ type: path, payload: val });
                // Sync slider UI
                if (scaleSlider) scaleSlider.value = val;
                if (scaleValue) scaleValue.textContent = val + '%';
                isForwarding = false;
            });

            // Subscribe to curve.offset.x/y/z (from CC/LFO) - apply to current mode
            APP.State.subscribe('curve.offset.x', (val) => {
                if (val === undefined || isForwarding) return;
                isForwarding = true;
                const path = getOffsetPath(selectedOffsetMode) + '.x';
                APP.State.dispatch({ type: path, payload: val });
                if (xSlider) xSlider.value = val;
                if (xValue) xValue.textContent = val;
                isForwarding = false;
            });

            APP.State.subscribe('curve.offset.y', (val) => {
                if (val === undefined || isForwarding) return;
                isForwarding = true;
                const path = getOffsetPath(selectedOffsetMode) + '.y';
                APP.State.dispatch({ type: path, payload: val });
                if (ySlider) ySlider.value = val;
                if (yValue) yValue.textContent = val;
                isForwarding = false;
            });

            APP.State.subscribe('curve.offset.z', (val) => {
                if (val === undefined || isForwarding) return;
                isForwarding = true;
                const path = getOffsetPath(selectedOffsetMode) + '.z';
                APP.State.dispatch({ type: path, payload: val });
                if (zSlider) zSlider.value = val;
                if (zValue) zValue.textContent = val;
                isForwarding = false;
            });

            // Initial sync
            syncRadios();
            syncSliders();
        },

        /**
         * Bind sphere type radio buttons and toggle visibility of type-specific controls
         */
        _bindSphereType() {
            const radios = document.querySelectorAll('input[name="sphereType"]');
            const ringSphereControls = document.getElementById('ringSphereControls');
            const flatControl = document.getElementById('sphereFlatControl');

            if (!radios.length) return;

            const updateVisibility = (type) => {
                // Show ring/panel sphere controls for ring-sphere and panel-sphere types
                if (ringSphereControls) {
                    ringSphereControls.style.display = (type === 'ring-sphere' || type === 'panel-sphere') ? 'block' : 'none';
                }
                // Show flat checkbox only for panel-sphere
                if (flatControl) {
                    flatControl.style.display = type === 'panel-sphere' ? 'flex' : 'none';
                }

                // Update radio checked state
                radios.forEach(radio => {
                    radio.checked = radio.value === type;
                });
            };

            // Handle radio changes
            radios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.checked) {
                        APP.State.dispatch({ type: 'sphere.type', payload: radio.value });
                        updateVisibility(radio.value);
                    }
                });
            });

            // Subscribe to state changes
            APP.State.subscribe('sphere.type', (type) => {
                updateVisibility(type || 'uv-sphere');
            });

            // Initial state
            const initialType = APP.State.select('sphere.type') || 'uv-sphere';
            updateVisibility(initialType);
        },

        /**
         * Bind icosahedron dual toggle (Ico/Dodeca radio pills)
         */
        _bindIcoDual() {
            const radios = document.querySelectorAll('input[name="icoDual"]');
            if (!radios.length) return;

            // Handle radio changes
            radios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.checked) {
                        const isDual = radio.value === 'true';
                        APP.State.dispatch({ type: 'icosahedron.dual', payload: isDual });
                    }
                });
            });

            // Subscribe to state changes
            APP.State.subscribe('icosahedron.dual', (isDual) => {
                const targetValue = isDual === true ? 'true' : 'false';
                radios.forEach(radio => {
                    radio.checked = radio.value === targetValue;
                });
            });

            // Initial state
            const initialDual = APP.State.select('icosahedron.dual') === true;
            const targetValue = initialDual ? 'true' : 'false';
            radios.forEach(radio => {
                radio.checked = radio.value === targetValue;
            });
        },

        /**
         * Bind sphere wireframe mode (border vs edge)
         */
        _bindSphereWireframeMode() {
            const radios = document.querySelectorAll('input[name="sphereWireframeMode"]');
            if (!radios.length) return;

            radios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.checked) {
                        APP.State.dispatch({ type: 'sphere.wireframeMode', payload: radio.value });
                    }
                });
            });

            APP.State.subscribe('sphere.wireframeMode', (mode) => {
                radios.forEach(radio => {
                    radio.checked = radio.value === mode;
                });
            });

            const initial = APP.State.select('sphere.wireframeMode') || 'border';
            radios.forEach(radio => {
                radio.checked = radio.value === initial;
            });
        },

        /**
         * Bind border width slider (1-400 → 0.01-4.0px)
         */
        _bindBorderWidth(id, path) {
            const el = document.getElementById(id);
            const valueEl = document.getElementById(id + 'Value');
            if (!el) return;

            el.addEventListener('input', () => {
                const val = parseInt(el.value);
                const displayVal = (val / 100).toFixed(2);
                if (valueEl) valueEl.textContent = displayVal;
                APP.State.dispatch({ type: path, payload: val });
            });

            // Sync from state
            APP.State.subscribe(path, (val) => {
                const v = val ?? 100;
                el.value = v;
                if (valueEl) valueEl.textContent = (v / 100).toFixed(2);
            });

            // Initial sync
            const initial = APP.State.select(path) ?? 100;
            el.value = initial;
            if (valueEl) valueEl.textContent = (initial / 100).toFixed(2);
        },

        /**
         * Bind breathing speed slider (1-32 beats per breath cycle)
         */
        _bindBreatheSpeed() {
            const el = document.getElementById('curveBreatheSpeed');
            const valueEl = document.getElementById('curveBreatheSpeedValue');
            if (!el) return;

            el.addEventListener('input', () => {
                const beats = parseInt(el.value);
                if (valueEl) valueEl.textContent = beats;
                APP.State.dispatch({ type: 'curve.breatheSpeed', payload: beats });
            });

            // Sync from state
            APP.State.subscribe('curve.breatheSpeed', (beats) => {
                const val = beats || 4;
                el.value = val;
                if (valueEl) valueEl.textContent = val;
            });

            // Initial sync
            const initialBeats = APP.State.select('curve.breatheSpeed') || 4;
            el.value = initialBeats;
            if (valueEl) valueEl.textContent = initialBeats;
        },

        /**
         * Setup ghost badge toggles - prevent clicks from collapsing section
         */
        _setupGhostBadges() {
            // Visual object toggles that can be soloed
            const soloableIds = ['outerEnabled', 'innerEnabled', 'sphereEnabled', 'icoEnabled', 'curveEnabled', 'trackEnabled', 'chaserEnabled'];
            const soloStatePaths = {
                'outerEnabled': 'outer.enabled',
                'innerEnabled': 'inner.enabled',
                'sphereEnabled': 'sphere.enabled',
                'icoEnabled': 'icosahedron.enabled',
                'curveEnabled': 'curve.enabled',
                'trackEnabled': 'track.enabled',
                'chaserEnabled': 'chaser.enabled'
            };

            // Track solo state - Set of soloed IDs
            this._soloSet = new Set();
            this._soloableIds = soloableIds;
            this._soloStatePaths = soloStatePaths;
            this._preSoloStates = null;

            // Stop propagation on both the badge (label) and the hidden checkbox
            document.querySelectorAll('.ghost-badge, .ghost-toggle').forEach(el => {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();

                    const checkbox = el.classList.contains('ghost-toggle') ? el : document.getElementById(el.getAttribute('for'));
                    if (!checkbox) return;

                    // If in solo mode and clicking a soloed badge, toggle it out
                    if (this._soloSet && this._soloSet.size > 0 && this._soloSet.has(checkbox.id)) {
                        e.preventDefault();
                        this._toggleSoloItem(checkbox.id);
                        return;
                    }

                    // Check for shift-click solo on soloable badges
                    if (e.shiftKey && soloableIds.includes(checkbox.id)) {
                        e.preventDefault();
                        this._toggleSolo(checkbox.id);
                    }
                });
            });
        },

        /**
         * Toggle a single item in/out of solo set
         */
        _toggleSoloItem(id) {
            if (this._soloSet.has(id)) {
                // Remove from solo set
                this._soloSet.delete(id);

                // Update badge
                const badge = document.querySelector(`label[for="${id}"]`);
                if (badge) {
                    badge.textContent = '';
                    badge.classList.remove('solo-active');
                }

                // If no more solos, exit solo mode entirely
                if (this._soloSet.size === 0) {
                    // Restore previous states before clearing
                    if (this._preSoloStates) {
                        for (const [elemId, wasEnabled] of Object.entries(this._preSoloStates)) {
                            const path = this._soloStatePaths[elemId];
                            if (path) {
                                APP.State.dispatch({ type: path, payload: wasEnabled });
                            }
                        }
                        this._preSoloStates = null;
                    }
                    APP.Toast?.show('Solo off');
                } else {
                    // Hide this item
                    const path = this._soloStatePaths[id];
                    if (path) {
                        APP.State.dispatch({ type: path, payload: false });
                    }
                    APP.Toast?.show(`Solo: ${this._soloSet.size} items`);
                }
            }
        },

        /**
         * Exit solo mode and restore previous states
         */
        _exitSolo() {
            // Restore previous states
            if (this._preSoloStates) {
                for (const [elemId, wasEnabled] of Object.entries(this._preSoloStates)) {
                    const path = this._soloStatePaths[elemId];
                    if (path) {
                        APP.State.dispatch({ type: path, payload: wasEnabled });
                    }
                }
                this._preSoloStates = null;
            }

            // Clear all solo indicators
            for (const id of this._soloSet) {
                const badge = document.querySelector(`label[for="${id}"]`);
                if (badge) {
                    badge.textContent = '';
                    badge.classList.remove('solo-active');
                }
            }

            this._soloSet.clear();
            APP.Toast?.show('Solo off');
        },

        /**
         * Toggle solo mode for a visual object
         * Shift-click: add/remove from solo set
         */
        _toggleSolo(id) {
            // First time entering solo mode - save all states
            if (this._soloSet.size === 0) {
                this._preSoloStates = {};
                for (const elemId of this._soloableIds) {
                    const path = this._soloStatePaths[elemId];
                    this._preSoloStates[elemId] = APP.State.select(path) ?? false;
                }
                // Hide all
                for (const elemId of this._soloableIds) {
                    const path = this._soloStatePaths[elemId];
                    APP.State.dispatch({ type: path, payload: false });
                }
            }

            if (this._soloSet.has(id)) {
                // Remove from solo
                this._soloSet.delete(id);
                const path = this._soloStatePaths[id];
                APP.State.dispatch({ type: path, payload: false });

                const badge = document.querySelector(`label[for="${id}"]`);
                if (badge) {
                    badge.textContent = '';
                    badge.classList.remove('solo-active');
                }

                // If no more solos, exit entirely
                if (this._soloSet.size === 0) {
                    this._exitSolo();
                    return;
                }
            } else {
                // Add to solo
                this._soloSet.add(id);
                const path = this._soloStatePaths[id];
                APP.State.dispatch({ type: path, payload: true });

                const badge = document.querySelector(`label[for="${id}"]`);
                if (badge) {
                    badge.textContent = 'S';
                    badge.classList.add('solo-active');
                }
            }

            const names = Array.from(this._soloSet).map(i =>
                i.replace('Enabled', '').replace(/([A-Z])/g, ' $1').trim()
            );
            APP.Toast?.show(`Solo: ${names.join(', ')}`);
        },

        /**
         * Bind track rotation direction select (1 = CW, -1 = CCW)
         */
        _bindTrackRotationDirection() {
            const el = document.getElementById('trackRotationDirection');
            if (!el) return;

            // Restore from state
            const saved = APP.State.select('track.rotation.direction');
            if (saved !== undefined) el.value = saved;

            el.addEventListener('change', () => {
                APP.State.dispatch({ type: 'track.rotation.direction', payload: parseInt(el.value) });
            });

            // Sync from state
            APP.State.subscribe('track.rotation.direction', (val) => {
                el.value = val !== undefined ? val : 1;
            });
        },

        /**
         * Bind chaser direction select (1 = forward, -1 = reverse)
         */
        _bindChaserDirection() {
            const el = document.getElementById('chaserDirection');
            if (!el) return;

            // Restore from state
            const saved = APP.State.select('chaser.direction');
            if (saved !== undefined) el.value = saved;

            el.addEventListener('change', () => {
                APP.State.dispatch({ type: 'chaser.direction', payload: parseInt(el.value) });
            });

            // Sync from state
            APP.State.subscribe('chaser.direction', (val) => {
                el.value = val !== undefined ? val : 1;
            });
        },

        _syncFromState(prefix) {
            const state = APP.State.select(prefix);
            if (!state) return;

            // Skip custom-handled elements (scaled values that need special sync)
            const customHandled = ['animationPps', 'animationBpm', 'trackTension', 'cameraFov',
                                   'curveOffsetX', 'curveOffsetY', 'curveOffsetZ', 'curveOffsetScale',
                                   'sphereOpacity', 'spherePulse', 'icosahedronOpacity'];

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

            // Handle scaled opacity values (stored as 0-1, slider is 0-100)
            if (prefix === 'sphere' && state.opacity !== undefined) {
                this._syncEl('sphereOpacity', state.opacity * 100, 'range', state.opacity.toFixed(2));
            }
            // Handle pulse value (stored as 0-1 in state, slider is 0-100)
            if (prefix === 'sphere' && state.pulse !== undefined) {
                this._syncEl('spherePulse', state.pulse * 100, 'range', state.pulse.toFixed(2));
            }
            if (prefix === 'icosahedron' && state.opacity !== undefined) {
                this._syncEl('icoOpacity', state.opacity * 100, 'range', state.opacity.toFixed(2));
            }
        },

        /**
         * Sync a single element when its state path changes
         * Much faster than _syncFromState for continuous updates (LFO, MIDI)
         */
        _syncSingleElement(path, value) {
            // Convert path to element ID: sphere.opacity -> sphereOpacity
            const parts = path.split('.');
            if (parts.length < 2) return;

            const prefix = parts[0];
            const key = parts.slice(1).join('.');

            // Handle nested paths (e.g., track.hoop.radius)
            let id;
            if (parts.length === 2) {
                id = prefix + key.charAt(0).toUpperCase() + key.slice(1);
            } else {
                // Nested: track.hoop.radius -> trackHoopRadius
                id = parts.map((p, i) => i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)).join('');
            }

            // Handle special scaled values
            const scaledPaths = {
                'sphere.opacity': { mult: 100, format: v => v.toFixed(2) },
                'sphere.pulse': { mult: 100, format: v => v.toFixed(2) },
                'icosahedron.opacity': { mult: 100, format: v => v.toFixed(2) },
                'track.hoop.opacity': { mult: 100, format: v => v.toFixed(1) }
            };

            const scaled = scaledPaths[path];
            if (scaled) {
                this._syncEl(id, value * scaled.mult, 'range', scaled.format(value));
                return;
            }

            // Standard sync
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
        },

        _syncTrackSubsections(state) {
            // Rotation
            if (state.rotation) {
                this._syncEl('trackRotationSpeed', state.rotation.speed, 'range');
                this._syncEl('trackRotationPpr', state.rotation.ppr, 'range');
                this._syncEl('trackRotationSyncBpm', state.rotation.syncBpm, 'checkbox');
                const dirEl = document.getElementById('trackRotationDirection');
                if (dirEl) dirEl.value = state.rotation.direction;
            }

            // Hoop (the ring at each track point)
            if (state.hoop) {
                this._syncEl('trackHoopEnabled', state.hoop.visible, 'checkbox');
                this._syncEl('trackHoopFill', state.hoop.fill, 'checkbox');
                this._syncEl('trackHoopRadius', state.hoop.radius, 'range');
                this._syncEl('trackHoopBorderWidth', state.hoop.borderWidth, 'range');
                this._syncEl('trackHoopSkip', state.hoop.skip, 'range');
                this._syncEl('trackHoopOpacity', state.hoop.opacity * 100, 'range', state.hoop.opacity.toFixed(1));
                this._syncEl('trackHoopColor', state.hoop.color, 'color');
            }

            // Normals (magenta, radially outward)
            if (state.normals) {
                this._syncEl('trackRadialsEnabled', state.normals.enabled, 'checkbox');
                this._syncEl('trackRadialsRoundness', state.normals.roundness, 'range');
                this._syncEl('trackRadialsSize', state.normals.width, 'range', state.normals.width + '%');
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
