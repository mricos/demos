/**
 * DivGraphics - CatmullRomTrack Module
 * Catmull-Rom spline track for smooth endless tracks through waypoints
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * CatmullRomTrack - Interpolates smoothly through waypoint array
     * Extends TrackBase with Catmull-Rom spline math
     */
    class CatmullRomTrack extends APP.TrackBase {
        constructor(options = {}) {
            super(options);

            // Waypoint array
            this.waypoints = options.waypoints || [];
            this.tension = options.tension ?? 0.5; // Catmull-Rom tension (0 = sharp, 1 = loose)
            this.closed = options.closed ?? false; // Closed loop - wraps back to start

            // Ring pooling (optional)
            this.ringPool = options.ringPool || null;
        }

        // ============================================================
        // Parameter range - based on waypoint count
        // ============================================================

        getParameterRange() {
            // For closed loops, t goes from 0 to waypoints.length (full loop)
            // For open tracks, t goes from 0 to waypoints.length - 1
            return {
                min: 0,
                max: Math.max(0, this.closed ? this.waypoints.length : this.waypoints.length - 1)
            };
        }

        // ============================================================
        // Catmull-Rom spline interpolation
        // ============================================================

        /**
         * Catmull-Rom interpolation between 4 control points
         * p0, p1, p2, p3 are control points
         * t is 0-1 within the p1-p2 segment
         */
        _catmullRom(t, p0, p1, p2, p3) {
            const t2 = t * t;
            const t3 = t2 * t;
            const tension = this.tension;

            // Catmull-Rom basis matrix coefficients
            // Using centripetal parameterization for more natural curves
            const c0 = -tension * t3 + 2 * tension * t2 - tension * t;
            const c1 = (2 - tension) * t3 + (tension - 3) * t2 + 1;
            const c2 = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * t;
            const c3 = tension * t3 - tension * t2;

            return {
                x: c0 * p0.x + c1 * p1.x + c2 * p2.x + c3 * p3.x,
                y: c0 * p0.y + c1 * p1.y + c2 * p2.y + c3 * p3.y,
                z: c0 * p0.z + c1 * p1.z + c2 * p2.z + c3 * p3.z
            };
        }

        /**
         * Get point at global parameter t
         * For open tracks: t ranges from 0 to (waypoints.length - 1)
         * For closed loops: t ranges from 0 to waypoints.length (wraps to start)
         */
        getPoint(t) {
            const n = this.waypoints.length;

            if (n === 0) return { x: 0, y: 0, z: 0 };
            if (n === 1) return { ...this.waypoints[0] };
            if (n === 2 && !this.closed) {
                // Linear interpolation for 2 points (open only)
                const t01 = Math.max(0, Math.min(1, t));
                return {
                    x: this.waypoints[0].x + (this.waypoints[1].x - this.waypoints[0].x) * t01,
                    y: this.waypoints[0].y + (this.waypoints[1].y - this.waypoints[0].y) * t01,
                    z: this.waypoints[0].z + (this.waypoints[1].z - this.waypoints[0].z) * t01
                };
            }

            if (this.closed) {
                // Closed loop: wrap t to [0, n)
                t = ((t % n) + n) % n;
                const segment = Math.floor(t);
                const localT = t - segment;

                // Wrap indices for closed loop
                const i0 = (segment - 1 + n) % n;
                const i1 = segment % n;
                const i2 = (segment + 1) % n;
                const i3 = (segment + 2) % n;

                return this._catmullRom(
                    localT,
                    this.waypoints[i0],
                    this.waypoints[i1],
                    this.waypoints[i2],
                    this.waypoints[i3]
                );
            }

            // Open track: clamp t to valid range
            t = Math.max(0, Math.min(n - 1, t));

            // Find which segment we're in
            const segment = Math.floor(t);
            const localT = t - segment;

            // Handle edge case at end
            if (segment >= n - 1) {
                return { ...this.waypoints[n - 1] };
            }

            // Get 4 control points with clamping at boundaries
            const i0 = Math.max(0, segment - 1);
            const i1 = segment;
            const i2 = Math.min(n - 1, segment + 1);
            const i3 = Math.min(n - 1, segment + 2);

            return this._catmullRom(
                localT,
                this.waypoints[i0],
                this.waypoints[i1],
                this.waypoints[i2],
                this.waypoints[i3]
            );
        }

        // ============================================================
        // Waypoint management for endless tracks
        // ============================================================

        /**
         * Add waypoint to end of track
         */
        addWaypoint(point) {
            this.waypoints.push({ ...point });
        }

        /**
         * Remove waypoints from the beginning
         * Used to trim passed segments in endless mode
         */
        trimFront(count) {
            if (count > 0 && count < this.waypoints.length) {
                this.waypoints.splice(0, count);
            }
        }

        /**
         * Get waypoint by index
         */
        getWaypoint(index) {
            if (index >= 0 && index < this.waypoints.length) {
                return { ...this.waypoints[index] };
            }
            return null;
        }

        /**
         * Set waypoints (replaces entire array)
         */
        setWaypoints(waypoints) {
            this.waypoints = waypoints.map(p => ({ ...p }));
        }

        /**
         * Get waypoint count
         */
        get waypointCount() {
            return this.waypoints.length;
        }

        // ============================================================
        // Generate with optional pooling
        // ============================================================

        generate() {
            this.container = document.createElement('div');
            this.container.className = 'track catmull-rom-track';
            this.container.style.cssText = 'position:absolute;transform-style:preserve-3d;';
            this._faces = [];
            this._rings = [];

            const range = this.getParameterRange();
            if (range.max <= 0) {
                return this.container; // No geometry for < 2 waypoints
            }

            // Calculate segments based on waypoint count and segments per span
            const totalSegments = Math.ceil(range.max * this.segmentsPerSpan);
            const faceHeight = this.getLength() / Math.max(1, totalSegments);

            // Phase accumulation - each ring's circle has accumulated phase
            let accumulatedPhase = this.circle.phase;

            for (let i = 0; i <= totalSegments; i++) {
                const t = range.min + range.max * (i / totalSegments);

                // Compute phase advance for this ring
                const phaseAdvance = this._computePhaseAdvance(t, i, totalSegments);

                const ringData = this._generateRing(t, i, totalSegments, faceHeight, accumulatedPhase);
                this.container.appendChild(ringData.element);
                this._rings.push(ringData);

                // Accumulate phase for next ring
                accumulatedPhase += phaseAdvance;
            }

            return this.container;
        }

        /**
         * Override to support ring pooling
         * Uses local coordinate system - ring container is the transform parent
         * @param {number} circlePhase - Accumulated phase for this circle (degrees)
         */
        _generateRing(t, ringIndex, totalRings, faceHeight, circlePhase = 0) {
            const pos = this.getPoint(t);
            const frame = this.getFrame(t);
            const euler = this._matrixToEuler(frame.tangent, frame.normal, frame.binormal);

            // Convert circle phase to radians
            const circlePhaseRad = (circlePhase * Math.PI) / 180;

            // Use pooled ring or create new
            const ring = this.ringPool?.acquire() || document.createElement('div');
            ring.className = 'track-ring';

            // Ring container - transformed to curve position and orientation
            ring.style.cssText = `
                position: absolute;
                transform-style: preserve-3d;
                transform: translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px)
                           rotateY(${euler.y}deg)
                           rotateX(${euler.x}deg)
                           rotateZ(${euler.z}deg);
            `;

            // Clear any existing children if recycled
            while (ring.firstChild) {
                ring.removeChild(ring.firstChild);
            }

            const faces = [];

            // ===========================================
            // CIRCLE SKIP LOGIC - applies to ALL ring elements
            // Circle is the owner: when skipped, normals and tangents skip too
            // ===========================================
            const shouldRenderRingElements = (ringIndex % this.circle.skip === 0);

            // UNIT CIRCLE - the fundamental primitive
            if (this.circle.visible && shouldRenderRingElements) {
                const circleEl = this._createCircleLocal();
                this._faces.push({ el: circleEl, x: pos.x, y: pos.y, z: pos.z, baseWidth: this.radius * 2 });
                faces.push(circleEl);
                ring.appendChild(circleEl);
            }

            // Normals - distributed around circle with phase offset
            // Respects circle skip: if circle is skipped, normals are too
            if (this.normals.enabled && shouldRenderRingElements) {
                const count = this.normals.count;
                const normalPhaseOffset = (this.normals.phase * Math.PI) / 180;

                for (let j = 0; j < count; j++) {
                    const baseAngle = (j / count) * Math.PI * 2;
                    const angle = circlePhaseRad + normalPhaseOffset + baseAngle;

                    const normalEl = this._createNormalLocal(angle, j, ringIndex, faceHeight, totalRings);
                    this._faces.push({
                        el: normalEl,
                        x: pos.x, y: pos.y, z: pos.z,
                        baseWidth: this.radius * (this.normals.width / 100),
                        baseHeight: faceHeight
                    });
                    faces.push(normalEl);
                    ring.appendChild(normalEl);
                }
            }

            // Tangents - distributed around circle with phase offset
            // Respects circle skip: if circle is skipped, tangents are too
            if (this.tangents.enabled && shouldRenderRingElements) {
                const count = this.tangents.count;
                const tangentPhaseOffset = (this.tangents.phase * Math.PI) / 180;

                for (let j = 0; j < count; j++) {
                    const baseAngle = (j / count) * Math.PI * 2;
                    const angle = circlePhaseRad + tangentPhaseOffset + baseAngle;

                    const tangentEl = this._createTangentLocal(angle, j, ringIndex, faceHeight, totalRings);
                    this._faces.push({
                        el: tangentEl,
                        x: pos.x, y: pos.y, z: pos.z,
                        baseWidth: this.radius * (this.tangents.width / 100),
                        baseHeight: faceHeight
                    });
                    faces.push(tangentEl);
                    ring.appendChild(tangentEl);
                }
            }

            return { element: ring, t, pos, faces };
        }

        /**
         * Override destroy to release pooled rings
         */
        destroy() {
            if (this.ringPool) {
                for (const ringData of this._rings) {
                    this.ringPool.release(ringData.element);
                }
            }
            super.destroy();
        }

        // ============================================================
        // Utility methods
        // ============================================================

        /**
         * Find parameter t for a given arc length from start
         * Uses binary search on arc length table
         */
        getParameterAtLength(targetLength) {
            const range = this.getParameterRange();
            const totalLength = this.getLength();

            if (targetLength <= 0) return range.min;
            if (targetLength >= totalLength) return range.max;

            // Binary search
            let lo = range.min;
            let hi = range.max;
            const tolerance = 0.001;

            for (let i = 0; i < 20; i++) { // Max iterations
                const mid = (lo + hi) / 2;
                const midLength = this._getLengthTo(mid);

                if (Math.abs(midLength - targetLength) < tolerance) {
                    return mid;
                }

                if (midLength < targetLength) {
                    lo = mid;
                } else {
                    hi = mid;
                }
            }

            return (lo + hi) / 2;
        }

        /**
         * Get arc length from start to parameter t
         */
        _getLengthTo(t) {
            let length = 0;
            const steps = Math.ceil(t * 10);
            let prev = this.getPoint(0);

            for (let i = 1; i <= steps; i++) {
                const curr = this.getPoint(t * (i / steps));
                length += Math.sqrt(
                    (curr.x - prev.x) ** 2 +
                    (curr.y - prev.y) ** 2 +
                    (curr.z - prev.z) ** 2
                );
                prev = curr;
            }
            return length;
        }

        /**
         * Get bounding box of track
         */
        getBounds() {
            if (this.waypoints.length === 0) {
                return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
            }

            const min = { x: Infinity, y: Infinity, z: Infinity };
            const max = { x: -Infinity, y: -Infinity, z: -Infinity };

            // Sample along curve
            const range = this.getParameterRange();
            const steps = Math.max(20, this.waypoints.length * 5);

            for (let i = 0; i <= steps; i++) {
                const t = range.min + (range.max - range.min) * (i / steps);
                const p = this.getPoint(t);
                min.x = Math.min(min.x, p.x);
                min.y = Math.min(min.y, p.y);
                min.z = Math.min(min.z, p.z);
                max.x = Math.max(max.x, p.x);
                max.y = Math.max(max.y, p.y);
                max.z = Math.max(max.z, p.z);
            }

            return { min, max };
        }
    }

    APP.CatmullRomTrack = CatmullRomTrack;

})(window.APP);
