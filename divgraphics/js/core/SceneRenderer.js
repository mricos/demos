/**
 * DivGraphics - SceneRenderer
 * Instantiable scene renderer extracted from APP.Scene singleton
 * Each instance can render geometry to its own DOM container
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * SceneRenderer - Per-instance scene rendering
     *
     * Renders geometry (cylinders, curves, tracks) to a specific DOM container.
     * Uses GeometryData for shared geometry parameters.
     * Applies LOD based on InstanceState settings.
     */
    class SceneRenderer {
        /**
         * @param {HTMLElement} container - The scene container to render into
         * @param {InstanceState} instanceState - Per-instance state with LOD settings
         * @param {GeometryData} geometryData - Shared geometry data
         */
        constructor(container, instanceState, geometryData) {
            this.container = container;
            this.state = instanceState;
            this.geometryData = geometryData;

            // Geometry instances (owned by this renderer)
            this.outerCylinder = null;
            this.innerCylinder = null;
            this.curve = null;
            this.track = null;
            this.ringPool = null;

            // Version tracking for change detection
            this._lastGeometryVersion = -1;

            // Throttle state
            this._lastRebuildTime = 0;
            this._rebuildThrottleMs = APP.State?.defaults?.config?.throttleMs || 16;
        }

        /**
         * Render/update the scene
         * Called each frame by InstanceManager
         * @param {Object} appState - Global APP.State.state reference
         */
        render(appState) {
            // Check if geometry data has changed
            if (this.geometryData.hasChanged(this._lastGeometryVersion)) {
                this._rebuildAll(false);  // Don't throttle for version-triggered rebuilds
                this._lastGeometryVersion = this.geometryData.getVersion();
            }
        }

        /**
         * Force rebuild all geometry
         */
        rebuildAll() {
            this._rebuildAll(false);  // Force rebuild, no throttle
        }

        /**
         * Rebuild all geometry from geometry data
         * @param {boolean} throttle - Whether to apply throttling (default: true)
         */
        _rebuildAll(throttle = true) {
            if (throttle) {
                const now = performance.now();
                if (now - this._lastRebuildTime < this._rebuildThrottleMs) {
                    return;
                }
                this._lastRebuildTime = now;
            }

            this._rebuildCylinder('outer', false);
            this._rebuildCylinder('inner', true);
            this._rebuildCurve();
            this._rebuildTrack();
        }

        /**
         * Rebuild a cylinder with LOD applied
         */
        _rebuildCylinder(key, faceInward) {
            const propName = key + 'Cylinder';
            const params = key === 'outer'
                ? this.geometryData.getOuterParams(this.state)
                : this.geometryData.getInnerParams(this.state);

            // Remove existing
            if (this[propName]?.container?.parentNode) {
                this[propName].container.parentNode.removeChild(this[propName].container);
            }

            // Handle disabled or missing params
            if (!params || params.enabled === false) {
                this[propName] = null;
                return;
            }

            const config = APP.State?.defaults?.config || {};
            const opacity = faceInward ? (config.innerOpacity || 0.85) : (config.outerOpacity || 0.85);

            this[propName] = new APP.Cylinder({
                radius: params.radius,
                height: params.height,
                radialSegments: params.radialSegments,  // Already LOD-adjusted
                heightSegments: params.heightSegments,  // Already LOD-adjusted
                color: params.color,
                colorSecondary: params.colorSecondary,
                wireframe: params.wireframe,
                faceInward,
                opacity,
                lodMultiplier: this.state.lod  // Pass LOD for any additional adjustments
            });

            this.container.appendChild(this[propName].generate());
        }

        /**
         * Rebuild curve with LOD applied
         */
        _rebuildCurve() {
            const params = this.geometryData.getCurveParams(this.state);

            // Remove existing
            if (this.curve?.container?.parentNode) {
                this.curve.container.parentNode.removeChild(this.curve.container);
            }

            // Handle disabled or missing
            if (!params || !params.enabled) {
                this.curve = null;
                return;
            }

            if (!APP.Curve) return;

            this.curve = new APP.Curve({
                points: params.points,
                radius: params.radius,
                curveSegments: params.curveSegments,    // Already LOD-adjusted
                radialSegments: params.radialSegments,  // Already LOD-adjusted
                color: params.color,
                colorSecondary: params.colorSecondary,
                wireframe: params.wireframe,
                lodMultiplier: this.state.lod
            });

            this.container.appendChild(this.curve.generate());
        }

        /**
         * Rebuild track with LOD applied
         */
        _rebuildTrack() {
            const params = this.geometryData.getTrackParams(this.state);
            const trackState = APP.State?.state?.track;
            const config = APP.State?.defaults?.config || {};

            // Destroy existing
            if (this.track) {
                this.track.destroy();
                this.track = null;
            }

            // Handle disabled or missing
            if (!params || !params.enabled || !trackState) {
                return;
            }

            if (!APP.CatmullRomTrack) return;

            // Initialize ring pool if needed
            if (!this.ringPool && APP.RingPool) {
                this.ringPool = new APP.RingPool(config.trackRingPoolSize || 200);
            }

            // Get waypoints from preset
            let waypoints;
            let closed = false;
            if (trackState.endless && APP.WaypointManager) {
                waypoints = APP.WaypointManager.generateInitial(config.trackLookAhead * 2);
            } else if (APP.TrackPresets) {
                waypoints = APP.TrackPresets.get(trackState.preset);
                closed = APP.TrackPresets.isClosed(trackState.preset);
            } else {
                waypoints = [
                    { x: 0, y: 0, z: 0 },
                    { x: 0, y: 0, z: 500 }
                ];
            }

            // Apply track.radius as path scale (100 = 1.0x preset scale)
            const pathScale = (trackState.radius ?? 100) / 100;
            if (pathScale !== 1) {
                waypoints = waypoints.map(p => ({
                    x: p.x * pathScale,
                    y: p.y * pathScale,
                    z: p.z * pathScale
                }));
            }

            this.track = new APP.CatmullRomTrack({
                waypoints,
                radius: trackState.hoop?.radius ?? 23,
                radialSegments: trackState.radialSegments,
                segmentsPerSpan: params.segmentsPerSpan,  // LOD-adjusted
                color: trackState.color,
                colorSecondary: trackState.colorSecondary,
                wireframe: trackState.wireframe,
                tension: trackState.tension,
                closed,
                ringPool: this.ringPool,
                centerlineWidth: trackState.centerlineWidth,
                centerlineColor: trackState.centerlineColor,
                widthZScale: trackState.widthZScale,
                radialWidthScale: trackState.radialWidthScale,
                circle: trackState.hoop,
                normals: trackState.normals,
                tangents: trackState.tangents,
                lodMultiplier: this.state.lod
            });

            this.container.appendChild(this.track.generate());
        }

        /**
         * Update haze on all geometry
         * @param {Object} opts - Haze options (rotX, rotY, rotZ, intensity, rollMode, camPos)
         */
        updateHaze(opts) {
            this.outerCylinder?.updateHaze(opts);
            this.innerCylinder?.updateHaze(opts);
            this.curve?.updateHaze(opts);
            this.track?.updateHaze(opts);
        }

        /**
         * Get div/face counts for stats
         */
        getStats() {
            let divCount = 0;
            let faceCount = 0;

            if (this.outerCylinder) {
                const stats = this.outerCylinder.getStats();
                divCount += stats.divCount;
                faceCount += stats.faceCount;
            }
            if (this.innerCylinder) {
                const stats = this.innerCylinder.getStats();
                divCount += stats.divCount;
                faceCount += stats.faceCount;
            }
            if (this.curve) {
                const stats = this.curve.getStats();
                divCount += stats.divCount;
                faceCount += stats.faceCount;
            }
            if (this.track) {
                const stats = this.track.getStats();
                divCount += stats.divCount;
                faceCount += stats.faceCount;
            }

            return { divCount, faceCount };
        }

        /**
         * Destroy and cleanup
         */
        destroy() {
            if (this.outerCylinder?.container?.parentNode) {
                this.outerCylinder.container.parentNode.removeChild(this.outerCylinder.container);
            }
            if (this.innerCylinder?.container?.parentNode) {
                this.innerCylinder.container.parentNode.removeChild(this.innerCylinder.container);
            }
            if (this.curve?.container?.parentNode) {
                this.curve.container.parentNode.removeChild(this.curve.container);
            }
            if (this.track) {
                this.track.destroy();
            }

            this.outerCylinder = null;
            this.innerCylinder = null;
            this.curve = null;
            this.track = null;
        }
    }

    // Export
    APP.SceneRenderer = SceneRenderer;

})(window.APP);
