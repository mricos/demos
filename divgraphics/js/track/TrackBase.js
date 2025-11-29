/**
 * DivGraphics - TrackBase Module
 * Abstract base class for track types (Bezier, Catmull-Rom, etc.)
 * Provides common Frenet frame calculation and tube generation
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * TrackBase - Abstract base class for all track types
     */
    class TrackBase {
        constructor(options = {}) {
            this.radius = options.radius || 15;
            this.radialSegments = options.radialSegments ?? 8;  // 0 = centerline only, 1+ = tube
            this.segmentsPerSpan = options.segmentsPerSpan || 6;
            this.color = options.color || '#00ff88';
            this.colorSecondary = options.colorSecondary || '#0088ff';
            this.wireframe = options.wireframe || false;

            // Centerline options (used when radialSegments = 0)
            this.centerlineWidth = options.centerlineWidth || 4;
            this.centerlineColor = options.centerlineColor || '#ffffff';

            // ===========================================
            // UNIT CIRCLE - the fundamental primitive
            // Everything derives from the circle at each track point
            // ===========================================
            this.circle = {
                enabled: options.circle?.enabled ?? true,
                visible: options.circle?.visible ?? false,
                color: options.circle?.color ?? '#ffffff',
                borderWidth: options.circle?.borderWidth ?? 2,
                fill: options.circle?.fill ?? false,
                opacity: options.circle?.opacity ?? 1,
                skip: options.circle?.skip ?? 1,
                // Phase system
                phase: options.circle?.phase ?? 0,
                advance: options.circle?.advance ?? 0,
                curvatureScale: options.circle?.curvatureScale ?? 0,
                twistRate: options.circle?.twistRate ?? 0
            };

            // Normals - rectangles pointing radially outward, inner edge touches circle
            this.normals = {
                enabled: options.normals?.enabled ?? true,
                count: options.normals?.count ?? 8,
                phase: options.normals?.phase ?? 0,
                width: options.normals?.width ?? 100,
                length: options.normals?.length ?? 100,
                roundness: options.normals?.roundness ?? 0,
                spin: options.normals?.spin ?? 0,
                spinRate: options.normals?.spinRate ?? 0,
                color: options.normals?.color ?? '#ff00aa',
                colorSecondary: options.normals?.colorSecondary ?? '#d4007a'
            };

            // Tangents - flat boards perpendicular to normals, one edge touches circle
            this.tangents = {
                enabled: options.tangents?.enabled ?? false,
                count: options.tangents?.count ?? 8,
                phase: options.tangents?.phase ?? 0,
                width: options.tangents?.width ?? 100,
                length: options.tangents?.length ?? 100,
                roundness: options.tangents?.roundness ?? 0,
                spin: options.tangents?.spin ?? 0,
                spinRate: options.tangents?.spinRate ?? 0,
                color: options.tangents?.color ?? '#00ff88',
                colorSecondary: options.tangents?.colorSecondary ?? '#00cc66'
            };

            // Z-depth scaling
            this.widthZScale = options.widthZScale ?? 0;       // 0-100, how much width scales with Z
            this.radialWidthScale = options.radialWidthScale ?? 100; // 0-200, width multiplier

            this.container = null;
            this._faces = [];      // All faces (normals + tangents)
            this._centerline = []; // Centerline elements
            this._rings = [];
        }

        // ============================================================
        // Abstract methods - must be implemented by subclasses
        // ============================================================

        /**
         * Get position at parameter t
         * @param {number} t - Parameter value
         * @returns {{x: number, y: number, z: number}}
         */
        getPoint(t) {
            throw new Error('TrackBase.getPoint() must be implemented by subclass');
        }

        /**
         * Get the parameter range for this track
         * @returns {{min: number, max: number}}
         */
        getParameterRange() {
            return { min: 0, max: 1 };
        }

        // ============================================================
        // Common implementations - Frenet frame math
        // ============================================================

        /**
         * Get tangent (derivative) at parameter t
         * Uses finite difference approximation
         */
        getTangent(t) {
            const delta = APP.State?.defaults?.config?.curveTangentDelta || 0.001;
            const range = this.getParameterRange();
            const p1 = this.getPoint(Math.max(range.min, t - delta));
            const p2 = this.getPoint(Math.min(range.max, t + delta));

            const len = Math.sqrt(
                (p2.x - p1.x) ** 2 +
                (p2.y - p1.y) ** 2 +
                (p2.z - p1.z) ** 2
            );

            if (len < 0.0001) {
                return { x: 0, y: 0, z: 1 }; // Default forward
            }

            return {
                x: (p2.x - p1.x) / len,
                y: (p2.y - p1.y) / len,
                z: (p2.z - p1.z) / len
            };
        }

        /**
         * Get curvature at parameter t (rate of change of tangent direction)
         * Returns a scalar value - higher means tighter curve
         */
        getCurvature(t) {
            const delta = 0.01;
            const range = this.getParameterRange();
            const t1 = Math.max(range.min, t - delta);
            const t2 = Math.min(range.max, t + delta);

            const tan1 = this.getTangent(t1);
            const tan2 = this.getTangent(t2);

            // Curvature ≈ |dT/ds| where T is unit tangent
            const dTx = tan2.x - tan1.x;
            const dTy = tan2.y - tan1.y;
            const dTz = tan2.z - tan1.z;

            const dTlen = Math.sqrt(dTx * dTx + dTy * dTy + dTz * dTz);

            // Approximate arc length between t1 and t2
            const p1 = this.getPoint(t1);
            const p2 = this.getPoint(t2);
            const ds = Math.sqrt(
                (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2 + (p2.z - p1.z) ** 2
            );

            return ds > 0.0001 ? dTlen / ds : 0;
        }

        /**
         * Build orthonormal Frenet frame (tangent, normal, binormal)
         * Used for orienting tube cross-sections
         */
        getFrame(t) {
            const tangent = this.getTangent(t);

            // Find a vector not parallel to tangent
            let up = { x: 0, y: 1, z: 0 };
            if (Math.abs(tangent.y) > 0.99) {
                up = { x: 1, y: 0, z: 0 };
            }

            // binormal = tangent × up
            const binormal = {
                x: tangent.y * up.z - tangent.z * up.y,
                y: tangent.z * up.x - tangent.x * up.z,
                z: tangent.x * up.y - tangent.y * up.x
            };
            const bLen = Math.sqrt(binormal.x ** 2 + binormal.y ** 2 + binormal.z ** 2);
            if (bLen > 0.0001) {
                binormal.x /= bLen;
                binormal.y /= bLen;
                binormal.z /= bLen;
            }

            // normal = binormal × tangent
            const normal = {
                x: binormal.y * tangent.z - binormal.z * tangent.y,
                y: binormal.z * tangent.x - binormal.x * tangent.z,
                z: binormal.x * tangent.y - binormal.y * tangent.x
            };

            return { tangent, normal, binormal };
        }

        /**
         * Convert Frenet frame to Euler angles for CSS transforms
         */
        _matrixToEuler(tangent, normal, binormal) {
            // Rotation matrix columns are normal, binormal, tangent
            // Extract Euler angles (YXZ order works well for CSS)
            const m11 = normal.x, m12 = binormal.x, m13 = tangent.x;
            const m21 = normal.y, m22 = binormal.y, m23 = tangent.y;
            const m31 = normal.z, m32 = binormal.z, m33 = tangent.z;

            let rotY = Math.atan2(m13, m33);
            let rotX = Math.atan2(-m23, Math.sqrt(m21 * m21 + m22 * m22));
            let rotZ = Math.atan2(m21, m22);

            return {
                x: rotX * 180 / Math.PI,
                y: rotY * 180 / Math.PI,
                z: rotZ * 180 / Math.PI
            };
        }

        // ============================================================
        // Arc length utilities
        // ============================================================

        /**
         * Approximate total arc length using sampling
         */
        getLength() {
            let length = 0;
            const range = this.getParameterRange();
            const steps = 50;
            let prev = this.getPoint(range.min);

            for (let i = 1; i <= steps; i++) {
                const t = range.min + (range.max - range.min) * (i / steps);
                const curr = this.getPoint(t);
                length += Math.sqrt(
                    (curr.x - prev.x) ** 2 +
                    (curr.y - prev.y) ** 2 +
                    (curr.z - prev.z) ** 2
                );
                prev = curr;
            }
            return length;
        }

        // ============================================================
        // Tube geometry generation
        // ============================================================

        /**
         * Generate DOM elements for the track tube
         * Can be overridden for custom geometry
         */
        generate() {
            this.container = document.createElement('div');
            this.container.className = 'track';
            this.container.style.cssText = 'position:absolute;transform-style:preserve-3d;';
            this._faces = [];
            this._centerline = [];
            this._rings = [];

            const range = this.getParameterRange();
            const totalSegments = Math.ceil((range.max - range.min) * this.segmentsPerSpan);
            const faceHeight = this.getLength() / totalSegments;

            // radialSegments = 0 means centerline only, > 0 means tube with radial faces
            const showCenterline = this.radialSegments === 0;
            const showTube = this.radialSegments > 0;

            // Generate centerline (main loop) when radialSegments is 0
            if (showCenterline) {
                this._generateCenterline(range, totalSegments, faceHeight);
            }

            // Generate tube rings when radialSegments > 0
            // Each ring's unit circle has accumulated phase from previous rings
            if (showTube) {
                let accumulatedPhase = this.circle.phase; // Initial phase

                for (let i = 0; i <= totalSegments; i++) {
                    const t = range.min + (range.max - range.min) * (i / totalSegments);

                    // Compute phase advance for this ring
                    const phaseAdvance = this._computePhaseAdvance(t, i, totalSegments);

                    const ringData = this._generateRing(t, i, totalSegments, faceHeight, accumulatedPhase);
                    this.container.appendChild(ringData.element);
                    this._rings.push(ringData);

                    // Accumulate phase for next ring
                    accumulatedPhase += phaseAdvance;
                }
            }

            return this.container;
        }

        /**
         * Compute phase advance for a ring at parameter t
         * Phase can be influenced by: base advance, curvature, twist rate
         */
        _computePhaseAdvance(t, ringIndex, totalRings) {
            let advance = this.circle.advance; // Base advance per ring

            // Add curvature-based phase if enabled
            if (this.circle.curvatureScale > 0) {
                const curvature = this.getCurvature(t);
                // Normalize curvature contribution (curvature can vary widely)
                advance += curvature * this.circle.curvatureScale * 10;
            }

            // Add twist rate contribution (full twists over entire track)
            if (this.circle.twistRate !== 0) {
                // Distribute twist evenly across all rings
                advance += (this.circle.twistRate * 360) / totalRings;
            }

            return advance;
        }

        /**
         * Generate centerline elements (rounded div following the spline center)
         */
        _generateCenterline(range, totalSegments, segmentLength) {
            for (let i = 0; i < totalSegments; i++) {
                const t1 = range.min + (range.max - range.min) * (i / totalSegments);
                const t2 = range.min + (range.max - range.min) * ((i + 1) / totalSegments);

                const pos1 = this.getPoint(t1);
                const pos2 = this.getPoint(t2);

                // Calculate segment length and midpoint
                const dx = pos2.x - pos1.x;
                const dy = pos2.y - pos1.y;
                const dz = pos2.z - pos1.z;
                const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

                const midX = (pos1.x + pos2.x) / 2;
                const midY = (pos1.y + pos2.y) / 2;
                const midZ = (pos1.z + pos2.z) / 2;

                // Get rotation to align with segment direction
                const frame = this.getFrame((t1 + t2) / 2);
                const euler = this._matrixToEuler(frame.tangent, frame.normal, frame.binormal);

                const el = document.createElement('div');
                el.className = 'track-centerline';

                const transform = `translate3d(${midX}px, ${midY}px, ${midZ}px)
                                   rotateY(${euler.y}deg)
                                   rotateX(${euler.x}deg)
                                   rotateZ(${euler.z}deg)
                                   translateX(-50%) translateY(-50%)`;

                el.style.cssText = `
                    position: absolute;
                    width: ${this.centerlineWidth}px;
                    height: ${length + 1}px;
                    background: ${this.centerlineColor};
                    border-radius: ${this.centerlineWidth / 2}px;
                    transform-style: preserve-3d;
                    transform: ${transform};
                `;

                this._centerline.push({
                    el,
                    x: midX,
                    y: midY,
                    z: midZ,
                    baseWidth: this.centerlineWidth
                });
                this.container.appendChild(el);
            }
        }

        /**
         * Generate a single ring at parameter t
         * Ring container is transformed to curve position/orientation
         * All children use LOCAL coordinates relative to the circle plane
         * Local coords: X = normal direction, Y = binormal direction, Z = tangent (curve) direction
         *
         * @param {number} t - Parameter on track
         * @param {number} ringIndex - Index of this ring
         * @param {number} totalRings - Total number of rings
         * @param {number} faceHeight - Height of face elements
         * @param {number} circlePhase - Accumulated phase for this circle (degrees)
         */
        _generateRing(t, ringIndex, totalRings, faceHeight, circlePhase = 0) {
            const pos = this.getPoint(t);
            const frame = this.getFrame(t);
            const euler = this._matrixToEuler(frame.tangent, frame.normal, frame.binormal);

            // Convert circle phase to radians for positioning calculations
            const circlePhaseRad = (circlePhase * Math.PI) / 180;

            // Ring container - transformed to curve position and orientation
            const ring = document.createElement('div');
            ring.className = 'track-ring';
            ring.style.cssText = `
                position: absolute;
                transform-style: preserve-3d;
                transform: translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px)
                           rotateY(${euler.y}deg)
                           rotateX(${euler.x}deg)
                           rotateZ(${euler.z}deg);
            `;

            const faces = [];

            // ===========================================
            // CIRCLE SKIP LOGIC - applies to ALL ring elements
            // Circle is the owner: when skipped, normals and tangents skip too
            // ===========================================
            const shouldRenderRingElements = (ringIndex % this.circle.skip === 0);

            // UNIT CIRCLE - the fundamental primitive
            // All elements are positioned relative to this circle's phase
            if (this.circle.visible && shouldRenderRingElements) {
                const circleEl = this._createCircleLocal();
                this._faces.push({ el: circleEl, x: pos.x, y: pos.y, z: pos.z, baseWidth: this.radius * 2 });
                faces.push(circleEl);
                ring.appendChild(circleEl);
            }

            // Normals - distributed around circle, offset by circle phase + normal phase
            // Respects circle skip: if circle is skipped, normals are too
            if (this.normals.enabled && shouldRenderRingElements) {
                const count = this.normals.count;
                const normalPhaseOffset = (this.normals.phase * Math.PI) / 180;

                for (let j = 0; j < count; j++) {
                    // Position on circle: circle phase + normal phase offset + distribution
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

            // Tangents - distributed around circle, offset by circle phase + tangent phase
            // Respects circle skip: if circle is skipped, tangents are too
            if (this.tangents.enabled && shouldRenderRingElements) {
                const count = this.tangents.count;
                const tangentPhaseOffset = (this.tangents.phase * Math.PI) / 180;

                for (let j = 0; j < count; j++) {
                    // Position on circle: circle phase + tangent phase offset + distribution
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
         * Create circle in LOCAL coordinates (at origin of ring container)
         * Circle lies in the XY plane (perpendicular to Z/tangent)
         */
        _createCircleLocal() {
            const diameter = this.radius * 2;
            const el = document.createElement('div');
            el.className = 'track-circle';

            // Local: centered at origin, in XY plane
            // Use explicit pixel offset so resizing grows from center
            const halfDiameter = diameter / 2;
            const transform = `translate(${-halfDiameter}px, ${-halfDiameter}px)`;

            const baseStyle = `
                position: absolute;
                left: 0;
                top: 0;
                width: ${diameter}px;
                height: ${diameter}px;
                border-radius: 50%;
                opacity: ${this.circle.opacity};
                transform-style: preserve-3d;
                backface-visibility: visible;
                transform: ${transform};
            `;

            if (this.circle.fill) {
                el.style.cssText = baseStyle + `background: ${this.circle.color};`;
            } else {
                el.style.cssText = baseStyle + `
                    background: transparent;
                    border: ${this.circle.borderWidth}px solid ${this.circle.color};
                    box-sizing: border-box;
                `;
            }

            return el;
        }

        /**
         * Create normal element in LOCAL coordinates
         * Rectangle pointing radially outward from circle center
         * Inner (short) edge touches circle, extends outward like a spoke
         *
         * @param {number} angle - Position around circle (radians), includes accumulated phase
         * @param {number} index - Element index for coloring
         * @param {number} ringIndex - Ring index for coloring
         * @param {number} faceHeight - Base height for sizing
         * @param {number} totalRings - Total rings
         */
        _createNormalLocal(angle, index, ringIndex, faceHeight, totalRings) {
            const el = document.createElement('div');
            el.className = 'track-normal';

            // Dimensions
            // width = tangential (narrow, wraps around circle)
            // length = radial (long, extends outward like caterpillar hair)
            const baseWidth = 2 * this.radius * Math.sin(Math.PI / this.normals.count);
            const width = baseWidth * (this.normals.width / 100);   // tangential extent
            const length = faceHeight * (this.normals.length / 100); // radial extent

            // Orientation angle (points outward along radius)
            const angleDeg = (angle * 180) / Math.PI;

            // Spin: base spin + spin rate * angle
            const spin = this.normals.spin + this.normals.spinRate * angle;

            // Color alternation
            const color = (ringIndex + index) % 2 === 0 ? this.normals.color : this.normals.colorSecondary;

            // Roundness
            const borderRadius = (this.normals.roundness / 100) * 50;
            const halfWidth = width / 2;

            // REFACTORED: Inner edge center anchored at circle radius
            // - Position element so its LEFT edge center is at (radius, 0)
            // - Rotate around ring origin (0, 0) to place at angle
            // - transform-origin set to ring center relative to element
            const transform = `rotateZ(${angleDeg}deg) rotateZ(${spin}deg)`;

            // CSS width = radial extent (length), height = tangential extent (width)
            el.style.cssText = `
                position: absolute;
                left: ${this.radius}px;
                top: ${-halfWidth}px;
                width: ${length}px;
                height: ${width}px;
                transform-origin: ${-this.radius}px ${halfWidth}px;
                background: ${this.wireframe ? 'transparent' : color};
                border: ${this.wireframe ? `1px solid ${color}` : 'none'};
                border-radius: ${borderRadius}%;
                transform-style: preserve-3d;
                backface-visibility: visible;
                transform: ${transform};
            `;

            return el;
        }

        /**
         * Create tangent element in LOCAL coordinates
         * Flat board perpendicular to normal, one edge touches circle
         * Lies in the tangent plane (perpendicular to radius)
         *
         * @param {number} angle - Position around circle (radians), includes accumulated phase
         * @param {number} index - Element index for coloring
         * @param {number} ringIndex - Ring index for coloring
         * @param {number} faceHeight - Base height for sizing
         * @param {number} totalRings - Total rings
         */
        _createTangentLocal(angle, index, ringIndex, faceHeight, totalRings) {
            const el = document.createElement('div');
            el.className = 'track-tangent';

            // Dimensions
            const baseWidth = 2 * this.radius * Math.sin(Math.PI / this.tangents.count);
            const width = baseWidth * (this.tangents.width / 100);
            const length = faceHeight * (this.tangents.length / 100);
            const halfLength = length / 2;

            // Orientation angle
            const angleDeg = (angle * 180) / Math.PI;

            // Spin: base spin + spin rate * angle
            const spin = this.tangents.spin + this.tangents.spinRate * angle;

            // Color alternation
            const color = (ringIndex + index) % 2 === 0 ? this.tangents.color : this.tangents.colorSecondary;

            // Roundness
            const borderRadius = (this.tangents.roundness / 100) * 50;

            // REFACTORED: Tangent straddles the circle
            // - Position at angle using cos/sin
            // - Circle passes through CENTER of the tangent plane
            // - rotateY(90deg) flips to be perpendicular to normal
            const halfWidth = width / 2;
            const x = this.radius * Math.cos(angle);
            const y = this.radius * Math.sin(angle);
            const transform = `rotateZ(${angleDeg}deg) rotateY(90deg) rotateZ(${spin}deg)`;

            el.style.cssText = `
                position: absolute;
                left: ${x - halfWidth}px;
                top: ${y - halfLength}px;
                width: ${width}px;
                height: ${length}px;
                transform-origin: 50% 50%;
                background: ${this.wireframe ? 'transparent' : color};
                border: ${this.wireframe ? `1px solid ${color}` : 'none'};
                border-radius: ${borderRadius}%;
                transform-style: preserve-3d;
                backface-visibility: visible;
                transform: ${transform};
            `;

            return el;
        }

        /**
         * Create a single face element
         * @param {Object} opts - Face options
         */
        _createFace(opts) {
            const { x, y, z, euler, faceDeg, width, height, ringIndex, faceIndex, roundness, outward } = opts;

            const face = document.createElement('div');
            face.className = 'track-face';

            const color = (ringIndex + faceIndex) % 2 === 0 ? this.color : this.colorSecondary;

            // Outward = rotate 90° to point away from center (like scales)
            const extraRotate = outward ? 'rotateX(90deg)' : '';

            // Roundness: 0 = square, 100 = fully round (50% border-radius)
            const borderRadius = (roundness / 100) * 50;

            const transform = `translate3d(${x}px, ${y}px, ${z}px)
                               rotateY(${euler.y}deg)
                               rotateX(${euler.x}deg)
                               rotateZ(${euler.z + faceDeg}deg)
                               ${extraRotate}
                               translateX(-50%) translateY(-50%)`;

            face.style.cssText = `
                position: absolute;
                width: ${width}px;
                height: ${height}px;
                background: ${this.wireframe ? 'transparent' : color};
                border: ${this.wireframe ? `1px solid ${color}` : 'none'};
                border-radius: ${borderRadius}%;
                transform-style: preserve-3d;
                backface-visibility: visible;
                transform: ${transform};
            `;

            return face;
        }

        // ============================================================
        // Lifecycle
        // ============================================================

        destroy() {
            if (this.container?.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            this.container = null;
            this._faces = [];
            this._centerline = [];
            this._rings = [];
        }

        // ============================================================
        // View-space haze (depth-based opacity)
        // ============================================================

        updateHaze(opts) {
            const { rotX, rotY, rotZ, intensity, rollMode, camPos } = opts;

            const faceLen = this._faces.length;
            const clLen = this._centerline.length;
            if (!faceLen && !clLen) return;

            const widthZFactor = this.widthZScale / 100;

            if (intensity <= 0 && widthZFactor <= 0) {
                // No haze or width scaling - reset only if needed
                if (this._hazeApplied) {
                    for (let i = 0; i < faceLen; i++) {
                        const f = this._faces[i];
                        f.el.style.opacity = 1;
                        if (f.baseWidth) f.el.style.width = f.baseWidth + 'px';
                    }
                    for (let i = 0; i < clLen; i++) {
                        const c = this._centerline[i];
                        c.el.style.opacity = 1;
                        if (c.baseWidth) {
                            c.el.style.width = c.baseWidth + 'px';
                            c.el.style.borderRadius = (c.baseWidth / 2) + 'px';
                        }
                    }
                    this._hazeApplied = false;
                }
                return;
            }

            this._hazeApplied = true;
            const hazeFactor = intensity / 100;

            // Camera position offset (for follow mode)
            const camX = camPos?.x || 0;
            const camY = camPos?.y || 0;
            const camZ = camPos?.z || 0;
            const isFollowMode = !!camPos;

            // Convert degrees to radians
            const rx = rotX * Math.PI / 180;
            const ry = rotY * Math.PI / 180;
            const rz = rotZ * Math.PI / 180;

            // Precompute trig
            const cosX = Math.cos(rx), sinX = Math.sin(rx);
            const cosY = Math.cos(ry), sinY = Math.sin(ry);
            const cosZ = Math.cos(rz), sinZ = Math.sin(rz);
            const isWorld = rollMode === 'world';

            // First pass: compute viewZ and find range (inline, no array allocation)
            let zMin = Infinity, zMax = -Infinity;

            for (let i = 0; i < faceLen; i++) {
                const f = this._faces[i];
                // Position relative to camera
                const px = f.x - camX;
                const py = f.y - camY;
                const pz = f.z - camZ;
                let viewZ;
                if (isFollowMode) {
                    // Simple distance from camera (further = larger)
                    viewZ = Math.sqrt(px * px + py * py + pz * pz);
                } else if (isWorld) {
                    const xz = px * cosZ - py * sinZ;
                    const yz = px * sinZ + py * cosZ;
                    const zy = -xz * sinY + pz * cosY;
                    viewZ = yz * sinX + zy * cosX;
                } else {
                    const z1 = -px * sinY + pz * cosY;
                    viewZ = py * sinX + z1 * cosX;
                }
                f._viewZ = viewZ;
                if (viewZ < zMin) zMin = viewZ;
                if (viewZ > zMax) zMax = viewZ;
            }

            for (let i = 0; i < clLen; i++) {
                const c = this._centerline[i];
                // Position relative to camera
                const px = c.x - camX;
                const py = c.y - camY;
                const pz = c.z - camZ;
                let viewZ;
                if (isFollowMode) {
                    viewZ = Math.sqrt(px * px + py * py + pz * pz);
                } else if (isWorld) {
                    const xz = px * cosZ - py * sinZ;
                    const yz = px * sinZ + py * cosZ;
                    const zy = -xz * sinY + pz * cosY;
                    viewZ = yz * sinX + zy * cosX;
                } else {
                    const z1 = -px * sinY + pz * cosY;
                    viewZ = py * sinX + z1 * cosX;
                }
                c._viewZ = viewZ;
                if (viewZ < zMin) zMin = viewZ;
                if (viewZ > zMax) zMax = viewZ;
            }

            const zRange = zMax - zMin || 1;
            const invZRange = 1 / zRange;

            // Second pass: apply haze and width scaling

            for (let i = 0; i < faceLen; i++) {
                const face = this._faces[i];
                const zNorm = (face._viewZ - zMin) * invZRange;

                if (hazeFactor > 0) {
                    // Follow mode: far (high zNorm) = faded
                    // Global mode: original formula (inverted viewZ convention)
                    const opacity = isFollowMode
                        ? Math.max(0.15, 1 - zNorm * hazeFactor)
                        : Math.max(0.15, 1 - (1 - zNorm) * hazeFactor);
                    face.el.style.opacity = opacity;
                }

                if (widthZFactor > 0 && face.baseWidth) {
                    const widthScale = 1 + (zNorm - 0.5) * widthZFactor;
                    face.el.style.width = (face.baseWidth * widthScale) + 'px';
                }
            }

            for (let i = 0; i < clLen; i++) {
                const cl = this._centerline[i];
                const zNorm = (cl._viewZ - zMin) * invZRange;

                if (hazeFactor > 0) {
                    const opacity = isFollowMode
                        ? Math.max(0.15, 1 - zNorm * hazeFactor)
                        : Math.max(0.15, 1 - (1 - zNorm) * hazeFactor);
                    cl.el.style.opacity = opacity;
                }

                if (widthZFactor > 0 && cl.baseWidth) {
                    const widthScale = 1 + (zNorm - 0.5) * widthZFactor;
                    const newWidth = cl.baseWidth * widthScale;
                    cl.el.style.width = newWidth + 'px';
                    cl.el.style.borderRadius = (newWidth / 2) + 'px';
                }
            }
        }

        // ============================================================
        // Stats
        // ============================================================

        getStats() {
            const ringCount = this._rings.length;
            const faceCount = this._faces.length;
            const centerlineCount = this._centerline.length;
            const divCount = 1 + ringCount + faceCount + centerlineCount;
            return { divCount, faceCount, ringCount, centerlineCount };
        }
    }

    APP.TrackBase = TrackBase;

})(window.APP);
