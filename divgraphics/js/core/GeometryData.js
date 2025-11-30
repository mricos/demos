/**
 * DivGraphics - GeometryData
 * Shared geometry data that can be rendered at different LODs
 * Pure data class - no DOM creation
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * GeometryData - Computes and caches geometry data from APP.State
     *
     * This class extracts geometry parameters from the global state
     * and provides methods to sample them at different LOD levels.
     * Multiple instances can share this data but render at different detail levels.
     */
    class GeometryData {
        constructor() {
            // Cached geometry parameters from state
            this.outer = null;
            this.inner = null;
            this.curve = null;
            this.track = null;

            // Change tracking
            this._lastUpdateTime = 0;
            this._stateVersion = 0;
        }

        /**
         * Update geometry data from global APP.State
         * Call this when state changes to refresh cached data
         */
        updateFromState() {
            if (!APP.State) return;

            this._stateVersion++;
            this._lastUpdateTime = performance.now();

            // Extract outer cylinder params
            const outerState = APP.State.select('outer');
            if (outerState) {
                this.outer = {
                    enabled: outerState.enabled,
                    radius: outerState.radius,
                    height: outerState.height,
                    radialSegments: outerState.radialSegments,
                    heightSegments: outerState.heightSegments,
                    color: outerState.color,
                    colorSecondary: outerState.colorSecondary,
                    wireframe: outerState.wireframe
                };
            }

            // Extract inner cylinder params
            const innerState = APP.State.select('inner');
            if (innerState) {
                this.inner = {
                    enabled: innerState.enabled,
                    radius: innerState.radius,
                    height: innerState.height,
                    radialSegments: innerState.radialSegments,
                    heightSegments: innerState.heightSegments,
                    color: innerState.color,
                    colorSecondary: innerState.colorSecondary,
                    wireframe: innerState.wireframe
                };
            }

            // Extract curve params
            const curveState = APP.State.select('curve');
            if (curveState) {
                this.curve = {
                    enabled: curveState.enabled,
                    radius: curveState.radius,
                    curveSegments: curveState.curveSegments,
                    radialSegments: curveState.radialSegments,
                    color: curveState.color,
                    colorSecondary: curveState.colorSecondary,
                    wireframe: curveState.wireframe,
                    points: [
                        { x: curveState.p0x, y: curveState.p0y, z: curveState.p0z },
                        { x: curveState.p1x, y: curveState.p1y, z: curveState.p1z },
                        { x: curveState.p2x, y: curveState.p2y, z: curveState.p2z }
                    ]
                };
            }

            // Extract track params
            const trackState = APP.State.select('track');
            if (trackState) {
                this.track = {
                    enabled: trackState.enabled,
                    preset: trackState.preset,
                    radius: trackState.radius,  // Path scale (50-200)
                    segmentsPerSpan: trackState.segmentsPerSpan,
                    tension: trackState.tension,
                    color: trackState.color,
                    colorSecondary: trackState.colorSecondary,
                    wireframe: trackState.wireframe,
                    // Hoop (ring at each track point)
                    hoopRadius: trackState.hoop?.radius,
                    hoopEnabled: trackState.hoop?.visible,
                    hoopBorderWidth: trackState.hoop?.borderWidth,
                    hoopFill: trackState.hoop?.fill,
                    hoopColor: trackState.hoop?.color,
                    hoopSkip: trackState.hoop?.skip,
                    hoopOpacity: trackState.hoop?.opacity,
                    // Normals
                    normalsEnabled: trackState.normalsEnabled,
                    normalsRoundness: trackState.normalsRoundness,
                    normalsSize: trackState.normalsSize,
                    normalsTwist: trackState.normalsTwist,
                    // Tangents
                    tangentsEnabled: trackState.tangentsEnabled,
                    // Endless mode
                    endless: trackState.endless,
                    variationSource: trackState.variationSource,
                    variationIntensity: trackState.variationIntensity
                };
            }
        }

        /**
         * Get outer cylinder params with LOD applied
         * @param {InstanceState} instanceState - Instance state with LOD settings
         */
        getOuterParams(instanceState) {
            if (!this.outer) return null;

            return {
                ...this.outer,
                radialSegments: instanceState.getEffectiveRadialSegments(this.outer.radialSegments),
                heightSegments: instanceState.getEffectiveSegments(this.outer.heightSegments)
            };
        }

        /**
         * Get inner cylinder params with LOD applied
         * @param {InstanceState} instanceState - Instance state with LOD settings
         */
        getInnerParams(instanceState) {
            if (!this.inner) return null;

            return {
                ...this.inner,
                radialSegments: instanceState.getEffectiveRadialSegments(this.inner.radialSegments),
                heightSegments: instanceState.getEffectiveSegments(this.inner.heightSegments)
            };
        }

        /**
         * Get curve params with LOD applied
         * @param {InstanceState} instanceState - Instance state with LOD settings
         */
        getCurveParams(instanceState) {
            if (!this.curve) return null;

            return {
                ...this.curve,
                curveSegments: instanceState.getEffectiveSegments(this.curve.curveSegments),
                radialSegments: instanceState.getEffectiveRadialSegments(this.curve.radialSegments)
            };
        }

        /**
         * Get track params with LOD applied
         * @param {InstanceState} instanceState - Instance state with LOD settings
         */
        getTrackParams(instanceState) {
            if (!this.track) return null;

            return {
                ...this.track,
                segmentsPerSpan: instanceState.getEffectiveSegments(this.track.segmentsPerSpan),
                // For normals count, use radial segments logic
                normalsCount: instanceState.getEffectiveRadialSegments(8)
            };
        }

        /**
         * Check if geometry needs rebuild
         * Compare version with last known version
         */
        hasChanged(lastKnownVersion) {
            return this._stateVersion !== lastKnownVersion;
        }

        /**
         * Get current state version
         */
        getVersion() {
            return this._stateVersion;
        }

        /**
         * Subscribe to relevant state changes
         * Returns unsubscribe function
         */
        subscribeToState() {
            const patterns = [
                'outer.*',
                'inner.*',
                'curve.*',
                'track.*'
            ];

            const unsubscribes = patterns.map(pattern =>
                APP.State.subscribe(pattern, () => this.updateFromState())
            );

            // Initial update
            this.updateFromState();

            return () => unsubscribes.forEach(unsub => unsub());
        }
    }

    // Export
    APP.GeometryData = GeometryData;

})(window.APP);
