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
            this._rebuildCylinder('outer', false);
            this._rebuildCylinder('inner', true);
            this._rebuildCurve();
            this._rebuildTrack();
            // Camera handles its own state restoration
        },

        _subscribe() {
            const config = APP.State.defaults.config;
            // Throttled rebuilds for performance
            const throttledRebuildOuter = APP.Utils.throttle(() => this._rebuildCylinder('outer', false), config.throttleMs);
            const throttledRebuildInner = APP.Utils.throttle(() => this._rebuildCylinder('inner', true), config.throttleMs);
            const throttledRebuildCurve = APP.Utils.throttle(() => this._rebuildCurve(), config.throttleMs);
            const throttledRebuildTrack = APP.Utils.throttle(() => this._rebuildTrack(), config.throttleMs);

            APP.State.subscribe('outer.*', throttledRebuildOuter);
            APP.State.subscribe('inner.*', throttledRebuildInner);
            APP.State.subscribe('track.*', throttledRebuildTrack);

            // Special handling for curve mode changes - use transitions
            let lastCurveMode = APP.State.select('curve.mode') || 'bezier';
            APP.State.subscribe('curve.mode', (newMode) => {
                if (this.curve && newMode !== lastCurveMode) {
                    const canTransition = (lastCurveMode === 'crystal' || lastCurveMode === 'distribute') &&
                                          (newMode === 'crystal' || newMode === 'distribute');
                    if (canTransition) {
                        // Start smooth transition
                        const duration = APP.State.select('curve.transitionDuration') || 500;
                        const easing = APP.State.select('curve.transitionEasing') || 'easeInOut';
                        this.curve.startTransition(newMode, duration, easing);
                        lastCurveMode = newMode;
                        return; // Don't rebuild, transition will handle it
                    }
                }
                lastCurveMode = newMode;
                throttledRebuildCurve();
            });

            // Other curve changes rebuild normally
            APP.State.subscribe('curve.*', (val, state, meta) => {
                // Skip if this is a mode change (handled above)
                if (meta.path === 'curve.mode') return;
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

            // Remove existing cylinder if present
            if (this[propName]?.container?.parentNode) {
                this[propName].container.parentNode.removeChild(this[propName].container);
            }

            // Handle disabled cylinders (both outer and inner have enabled toggle)
            if (state.enabled === false) {
                this[propName] = null;
                APP.Stats.updateCounts();
                return;
            }

            const opacity = faceInward ? config.innerOpacity : config.outerOpacity;
            this[propName] = new APP.Cylinder({
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

            this.container.appendChild(this[propName].generate());
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
                // Mode and shared modulation
                mode: state.mode,
                pieceCount: state.pieceCount,
                phase: state.phase,
                spin: state.spin,
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
                // Crystal
                crystal: state.crystal
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

            // Create track
            if (APP.CatmullRomTrack) {
                this.track = new APP.CatmullRomTrack({
                    waypoints,
                    radius: state.radius,
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
                    circle: state.circle,
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
