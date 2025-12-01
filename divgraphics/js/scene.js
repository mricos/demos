/**
 * DivGraphics - Scene Module
 * 3D scene management and cylinder rendering
 * Camera control delegated to APP.Camera
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.Scene = {
        container: null,
        viewport: null,
        outerCylinder: null,
        innerCylinder: null,
        sphere: null,
        icosahedron: null,
        curve: null,
        track: null,
        ringPool: null,

        init() {
            this.container = document.getElementById('scene');
            this.viewport = document.getElementById('viewport');

            // Initialize camera with scene container
            APP.Camera.init(this.container, this.viewport);

            // 1. Restore from state
            this._restoreFromState();

            // 2. Subscribe to future changes
            this._subscribe();
        },

        _restoreFromState() {
            // Build geometry from current state
            // Track must be built BEFORE curve so distribute mode can bind to it
            this._rebuildCylinder('outer', false);
            this._rebuildCylinder('inner', true);
            this._rebuildSphere();
            this._rebuildIcosahedron();
            this._rebuildTrack();
            this._rebuildCurve();
            // Camera handles its own state restoration
        },

        _subscribe() {
            const config = APP.State.defaults.config;
            // Throttled rebuilds for performance
            const throttledRebuildOuter = APP.Utils.throttle(() => this._rebuildCylinder('outer', false), config.throttleMs);
            const throttledRebuildInner = APP.Utils.throttle(() => this._rebuildCylinder('inner', true), config.throttleMs);
            const throttledRebuildSphere = APP.Utils.throttle(() => this._rebuildSphere(), config.throttleMs);
            const throttledRebuildIcosahedron = APP.Utils.throttle(() => this._rebuildIcosahedron(), config.throttleMs);
            const throttledRebuildCurve = APP.Utils.throttle(() => this._rebuildCurve(), config.throttleMs);
            const throttledRebuildTrack = APP.Utils.throttle(() => this._rebuildTrack(), config.throttleMs);

            APP.State.subscribe('outer.*', throttledRebuildOuter);
            APP.State.subscribe('inner.*', throttledRebuildInner);
            APP.State.subscribe('icosahedron.*', throttledRebuildIcosahedron);
            APP.State.subscribe('track.*', throttledRebuildTrack);

            // Sphere: lightweight opacity update without rebuild
            // Note: val may be 0-1 (from UI) or 0-100 (from LFO mapping) - normalize
            APP.State.subscribe('sphere.opacity', (val) => {
                if (this.sphere?._faces) {
                    const opacity = val > 1 ? val / 100 : val;  // Handle 0-100 or 0-1
                    this.sphere.opacity = opacity;
                    for (const face of this.sphere._faces) {
                        face.el.style.opacity = opacity;
                    }
                }
            });

            // Sphere: pulse controls brightness (modulates base opacity)
            APP.State.subscribe('sphere.pulse', (val) => {
                if (this.sphere?._faces) {
                    const pulse = val > 1 ? val / 100 : val;  // Handle 0-100 or 0-1
                    const baseOpacity = APP.State?.select('sphere.opacity') ?? 0.85;
                    const depth = (APP.State?.select('sphere.pulseDepth') ?? 50) / 100;
                    // Pulse modulates: full pulse = baseOpacity, zero pulse = baseOpacity * (1-depth)
                    const effectiveOpacity = baseOpacity * (1 - depth + depth * pulse);
                    for (const face of this.sphere._faces) {
                        face.el.style.opacity = effectiveOpacity;
                    }
                }
            });

            // Sphere: other changes trigger rebuild
            APP.State.subscribe('sphere.*', (val, state, meta) => {
                // Skip lightweight updates handled above
                if (meta.path === 'sphere.opacity' || meta.path === 'sphere.pulse') return;
                throttledRebuildSphere();
            });

            // Special handling for curve mode changes - use transitions
            let lastCurveMode = APP.State.select('curve.mode') || 'bezier';
            APP.State.subscribe('curve.mode', (newMode) => {
                if (this.curve && newMode !== lastCurveMode) {
                    const canTransition = (lastCurveMode === 'crystal' || lastCurveMode === 'distribute') &&
                                          (newMode === 'crystal' || newMode === 'distribute');
                    if (canTransition) {
                        // Start smooth transition with rebuild callback
                        const duration = APP.State.select('curve.transitionDuration') || 500;
                        const easing = APP.State.select('curve.transitionEasing') || 'easeInOut';
                        this.curve.startTransition(newMode, duration, easing, () => {
                            // Rebuild with proper geometry after transition completes
                            this._rebuildCurve();
                        });
                        lastCurveMode = newMode;
                        return; // Don't rebuild now, transition will handle it
                    }
                }
                lastCurveMode = newMode;
                throttledRebuildCurve();
            });

            // Handle softness/round without full rebuild
            APP.State.subscribe('curve.softness', (val) => {
                if (this.curve) this.curve.updateEffects(val, undefined);
            });
            APP.State.subscribe('curve.round', (val) => {
                if (this.curve) this.curve.updateEffects(undefined, val);
            });

            // Other curve changes rebuild normally
            APP.State.subscribe('curve.*', (val, state, meta) => {
                // Skip if this is a mode change (handled above)
                if (meta.path === 'curve.mode') return;
                // Skip effects-only changes (handled above)
                if (meta.path === 'curve.softness' || meta.path === 'curve.round') return;
                // Skip rebuild during transition
                if (this.curve?.isTransitioning()) return;
                throttledRebuildCurve();
            });
            // Haze is now view-space, updated in animation loop - no rebuild needed
        },

        _rebuildCylinder(key, faceInward) {
            const config = APP.State.defaults.config;
            const state = APP.State.state[key];
            const propName = key + 'Cylinder';

            if (!state) return;

            // Remove existing geometry if present
            if (this[propName]?.container?.parentNode) {
                this[propName].container.parentNode.removeChild(this[propName].container);
            }

            // Handle disabled (both outer and inner have enabled toggle)
            if (state.enabled === false) {
                this[propName] = null;
                APP.Stats.updateCounts();
                return;
            }

            const opacity = faceInward ? config.innerOpacity : config.outerOpacity;
            const shape = state.shape || 'cylinder';

            // Select geometry class based on shape
            let geometry;
            if (shape === 'uv-sphere' && APP.UVSphere) {
                geometry = new APP.UVSphere({
                    radius: state.radius,
                    latSegments: state.heightSegments,
                    lonSegments: state.radialSegments,
                    color: state.color,
                    colorSecondary: state.colorSecondary,
                    wireframe: state.wireframe,
                    faceInward,
                    opacity
                });
            } else if (shape === 'ico-sphere' && APP.IcoSphere) {
                geometry = new APP.IcoSphere({
                    radius: state.radius,
                    subdivisions: state.subdivisions || 2,
                    color: state.color,
                    colorSecondary: state.colorSecondary,
                    wireframe: state.wireframe,
                    faceInward,
                    opacity
                });
            } else {
                // Default: cylinder
                geometry = new APP.Cylinder({
                    radius: state.radius,
                    height: state.height,
                    radialSegments: state.radialSegments,
                    heightSegments: state.heightSegments,
                    color: state.color,
                    colorSecondary: state.colorSecondary,
                    wireframe: state.wireframe,
                    faceInward,
                    opacity
                });
            }

            this[propName] = geometry;
            const container = this[propName].generate();

            // Apply scale transform (100 = 1.0)
            const scale = (state.scale ?? 100) / 100;
            if (scale !== 1) {
                container.style.transform = `scale3d(${scale}, ${scale}, ${scale})`;
            }

            this.container.appendChild(container);
            APP.Stats.updateCounts();
        },

        _rebuildSphere() {
            const config = APP.State.defaults.config;
            const state = APP.State.state.sphere;

            if (!state) return;

            // Remove existing sphere if present
            if (this.sphere?.container?.parentNode) {
                this.sphere.container.parentNode.removeChild(this.sphere.container);
            }

            // Handle disabled
            if (state.enabled === false) {
                this.sphere = null;
                APP.Stats.updateCounts();
                return;
            }

            const opacity = state.opacity ?? 0.85;
            const type = state.type || 'uv-sphere';

            // Select geometry class based on type
            let geometry;
            if (type === 'ico-sphere' && APP.IcoSphere) {
                geometry = new APP.IcoSphere({
                    radius: state.radius,
                    subdivisions: state.subdivisions || 2,
                    color: state.color,
                    colorSecondary: state.colorSecondary,
                    wireframe: state.wireframe,
                    faceInward: state.faceInward,
                    borderWidth: (state.borderWidth ?? 100) / 100,
                    opacity
                });
            } else if (type === 'ring-sphere' && APP.RingSphere) {
                geometry = new APP.RingSphere({
                    radius: state.radius,
                    rings: state.latSegments || 12,
                    segments: state.lonSegments || 24,
                    color: state.color,
                    colorSecondary: state.colorSecondary,
                    segmentSize: state.segmentSize || 2,
                    roundness: state.roundness ?? 100,
                    opacity
                });
            } else if (type === 'panel-sphere' && APP.PanelSphere) {
                geometry = new APP.PanelSphere({
                    radius: state.radius,
                    rings: state.latSegments || 12,
                    segments: state.lonSegments || 24,
                    color: state.color,
                    colorSecondary: state.colorSecondary,
                    panelSize: state.segmentSize || 2,
                    roundness: state.roundness ?? 50,
                    flat: state.flat ?? false,
                    opacity
                });
            } else if (APP.UVSphere) {
                geometry = new APP.UVSphere({
                    radius: state.radius,
                    latSegments: state.latSegments,
                    lonSegments: state.lonSegments,
                    color: state.color,
                    colorSecondary: state.colorSecondary,
                    wireframe: state.wireframe,
                    wireframeMode: state.wireframeMode || 'border',
                    faceInward: state.faceInward,
                    borderWidth: (state.borderWidth ?? 100) / 100,
                    opacity
                });
            }

            if (geometry) {
                this.sphere = geometry;
                const container = this.sphere.generate();

                // Apply scale transform (100 = 1.0)
                const scale = (state.scale ?? 100) / 100;
                if (scale !== 1) {
                    container.style.transform = `scale3d(${scale}, ${scale}, ${scale})`;
                }

                this.container.appendChild(container);
            }
            APP.Stats.updateCounts();
        },

        _rebuildIcosahedron() {
            const config = APP.State.defaults.config;
            const state = APP.State.state.icosahedron;

            if (!state) return;

            // Remove existing icosahedron if present
            if (this.icosahedron?.container?.parentNode) {
                this.icosahedron.container.parentNode.removeChild(this.icosahedron.container);
            }

            // Handle disabled
            if (state.enabled === false) {
                this.icosahedron = null;
                APP.Stats.updateCounts();
                return;
            }

            const opacity = state.opacity ?? 0.85;

            // Select geometry class based on dual toggle
            let geometry;
            if (state.dual && APP.Dodecahedron) {
                // Dodecahedron mode (12 pentagonal faces)
                geometry = new APP.Dodecahedron({
                    radius: state.radius,
                    color: state.color,
                    colorSecondary: state.colorSecondary,
                    wireframe: state.wireframe,
                    faceInward: state.faceInward,
                    borderWidth: (state.borderWidth ?? 100) / 100,
                    opacity
                });
            } else if (APP.IcoSphere) {
                // Icosahedron mode (subdivided triangular faces)
                geometry = new APP.IcoSphere({
                    radius: state.radius,
                    subdivisions: state.subdivisions || 0,
                    color: state.color,
                    colorSecondary: state.colorSecondary,
                    wireframe: state.wireframe,
                    faceInward: state.faceInward,
                    borderWidth: (state.borderWidth ?? 100) / 100,
                    opacity
                });
            }

            if (geometry) {
                this.icosahedron = geometry;
                this.container.appendChild(this.icosahedron.generate());
            }
            APP.Stats.updateCounts();
        },

        _rebuildCurve() {
            const state = APP.State.state.curve;
            if (!state) return;

            if (this.curve?.container?.parentNode) {
                this.curve.container.parentNode.removeChild(this.curve.container);
            }

            if (!state.enabled) {
                this.curve = null;
                APP.Stats.updateCounts();
                return;
            }

            this.curve = new APP.Curve({
                points: [
                    { x: state.p0x, y: state.p0y, z: state.p0z },
                    { x: state.p1x, y: state.p1y, z: state.p1z },
                    { x: state.p2x, y: state.p2y, z: state.p2z }
                ],
                radius: state.radius,
                curveSegments: state.curveSegments,
                radialSegments: state.radialSegments,
                color: state.color,
                colorSecondary: state.colorSecondary,
                wireframe: state.wireframe,
                // Geometry
                length: state.length,
                spacing: state.spacing,
                twist: state.twist,
                borderWidth: state.borderWidth,
                faceWidthScale: state.faceWidthScale,
                loopBorder: state.loopBorder,
                softness: state.softness,
                round: state.round,
                // Mode and shared modulation
                mode: state.mode,
                pieceCount: state.pieceCount,
                phase: state.phase,
                spin: state.spin,
                spread: state.spread,
                sineAmplitudeX: state.sineAmplitudeX,
                sineAmplitudeY: state.sineAmplitudeY,
                sineAmplitudeZ: state.sineAmplitudeZ,
                sineFrequency: state.sineFrequency,
                // Breathing
                breathe: state.breathe,
                breatheScale: state.breatheScale,
                breatheSpeed: state.breatheSpeed,
                breathePhase: state.breathePhase,
                // Rotation around center of mass
                rotateX: state.rotateX,
                rotateY: state.rotateY,
                rotateZ: state.rotateZ,
                // Position offset (per-mode)
                bezierOffset: state.bezierOffset,
                distributeOffset: state.distributeOffset,
                crystalOffset: state.crystalOffset,
                // Scale factor (per-mode)
                bezierScale: state.bezierScale,
                distributeScale: state.distributeScale,
                crystalScale: state.crystalScale,
                // Crystal
                crystal: state.crystal,
                // Bounding box
                showBoundingBox: state.showBoundingBox,
                boundingBoxColor: state.boundingBoxColor,
                boundingBoxOpacity: state.boundingBoxOpacity
            });

            this.container.appendChild(this.curve.generate());
            APP.Stats.updateCounts();
        },

        _rebuildTrack() {
            const state = APP.State.state.track;
            const config = APP.State.defaults.config;
            if (!state) return;

            // Destroy existing track
            if (this.track) {
                this.track.destroy();
                this.track = null;
            }

            if (!state.enabled) {
                APP.Stats.updateCounts();
                return;
            }

            // Initialize ring pool if needed
            if (!this.ringPool && APP.RingPool) {
                this.ringPool = new APP.RingPool(config.trackRingPoolSize || 200);
            }

            // Get waypoints from preset or endless generation
            let waypoints;
            let closed = false;
            if (state.endless && APP.WaypointManager) {
                waypoints = APP.WaypointManager.generateInitial(config.trackLookAhead * 2);
            } else if (APP.TrackPresets) {
                waypoints = APP.TrackPresets.get(state.preset);
                closed = APP.TrackPresets.isClosed(state.preset);
            } else {
                // Fallback: simple straight track
                waypoints = [
                    { x: 0, y: 0, z: 0 },
                    { x: 0, y: 0, z: 500 }
                ];
            }

            // Apply track.radius as path scale (100 = 1.0x preset scale)
            const pathScale = (state.radius ?? 100) / 100;
            if (pathScale !== 1) {
                waypoints = waypoints.map(p => ({
                    x: p.x * pathScale,
                    y: p.y * pathScale,
                    z: p.z * pathScale
                }));
            }

            // Create track - use hoop.radius for tube size
            if (APP.CatmullRomTrack) {
                this.track = new APP.CatmullRomTrack({
                    waypoints,
                    radius: state.hoop?.radius ?? 23,
                    radialSegments: state.radialSegments,  // 0 = centerline only, 1+ = tube
                    segmentsPerSpan: state.segmentsPerSpan,
                    color: state.color,
                    colorSecondary: state.colorSecondary,
                    wireframe: state.wireframe,
                    tension: state.tension,
                    closed,
                    ringPool: this.ringPool,
                    centerlineWidth: state.centerlineWidth,
                    centerlineColor: state.centerlineColor,
                    widthZScale: state.widthZScale,
                    radialWidthScale: state.radialWidthScale,
                    circle: state.hoop,
                    normals: state.normals,
                    tangents: state.tangents
                });

                this.container.appendChild(this.track.generate());

                // Initialize waypoint manager for endless mode
                if (state.endless && APP.WaypointManager) {
                    APP.WaypointManager.init(this.track);
                    this._setupVariationSource(state);
                }
            }

            APP.Stats.updateCounts();
        },

        _setupVariationSource(state) {
            if (!APP.WaypointManager) return;

            let source = null;

            switch (state.variationSource) {
                case 'perlin':
                    if (APP.PerlinSource) {
                        source = new APP.PerlinSource({
                            intensity: state.variationIntensity / 100
                        });
                    }
                    break;
                case 'random':
                    if (APP.RandomSource) {
                        source = new APP.RandomSource({
                            intensity: state.variationIntensity / 100
                        });
                    }
                    break;
                case 'music':
                    if (APP.MusicSource) {
                        source = new APP.MusicSource({
                            intensity: state.variationIntensity / 100
                        });
                    }
                    break;
            }

            APP.WaypointManager.setVariationSource(source);
        },

        resetView() {
            APP.Camera.resetView();
        }
    };

})(window.APP);
