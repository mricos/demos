/**
 * DivGraphics - Curve Module
 * 3D tubes/pipes along bezier curves using CSS 3D transforms
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * Curve - Creates a 3D tube along a bezier path
     */
    class Curve {
        constructor(options = {}) {
            // Control points for quadratic bezier (3 points) or cubic (4 points)
            this.points = options.points || [
                { x: -100, y: 0, z: 0 },
                { x: 0, y: -100, z: 50 },
                { x: 100, y: 0, z: 0 }
            ];

            this.curveSegments = options.curveSegments || 16;
            this.radialSegments = options.radialSegments || 8;
            this.radius = options.radius || 10;
            this.color = options.color || '#00ff88';
            this.colorSecondary = options.colorSecondary || '#0088ff';
            this.wireframe = options.wireframe || false;

            this.container = null;
            this._faces = [];
        }

        // Quadratic bezier: 3 control points
        _quadraticBezier(t, p0, p1, p2) {
            const mt = 1 - t;
            return {
                x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
                y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
                z: mt * mt * p0.z + 2 * mt * t * p1.z + t * t * p2.z
            };
        }

        // Cubic bezier: 4 control points
        _cubicBezier(t, p0, p1, p2, p3) {
            const mt = 1 - t;
            const mt2 = mt * mt;
            const t2 = t * t;
            return {
                x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
                y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
                z: mt2 * mt * p0.z + 3 * mt2 * t * p1.z + 3 * mt * t2 * p2.z + t2 * t * p3.z
            };
        }

        // Get point on curve
        _getPoint(t) {
            if (this.points.length === 3) {
                return this._quadraticBezier(t, this.points[0], this.points[1], this.points[2]);
            } else if (this.points.length === 4) {
                return this._cubicBezier(t, this.points[0], this.points[1], this.points[2], this.points[3]);
            }
            return this.points[0];
        }

        // Get tangent (derivative) at point
        _getTangent(t) {
            const delta = APP.State.defaults.config.curveTangentDelta;
            const p1 = this._getPoint(Math.max(0, t - delta));
            const p2 = this._getPoint(Math.min(1, t + delta));

            const len = Math.sqrt(
                (p2.x - p1.x) ** 2 +
                (p2.y - p1.y) ** 2 +
                (p2.z - p1.z) ** 2
            );

            return {
                x: (p2.x - p1.x) / len,
                y: (p2.y - p1.y) / len,
                z: (p2.z - p1.z) / len
            };
        }

        // Build orthonormal frame (tangent, normal, binormal)
        _getFrame(t) {
            const tangent = this._getTangent(t);

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
            binormal.x /= bLen;
            binormal.y /= bLen;
            binormal.z /= bLen;

            // normal = binormal × tangent
            const normal = {
                x: binormal.y * tangent.z - binormal.z * tangent.y,
                y: binormal.z * tangent.x - binormal.x * tangent.z,
                z: binormal.x * tangent.y - binormal.y * tangent.x
            };

            return { tangent, normal, binormal };
        }

        // Convert rotation matrix to CSS angles
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

        generate() {
            this.container = document.createElement('div');
            this.container.className = 'curve';
            this.container.style.cssText = 'position:absolute;transform-style:preserve-3d;';
            this._faces = [];

            // Generate rings along curve
            for (let i = 0; i <= this.curveSegments; i++) {
                const t = i / this.curveSegments;
                const pos = this._getPoint(t);
                const frame = this._getFrame(t);

                // Create ring at this position
                const ring = document.createElement('div');
                ring.className = 'curve-ring';
                ring.style.cssText = 'position:absolute;transform-style:preserve-3d;';

                // Get Euler angles from Frenet frame (computed once per ring)
                const euler = this._matrixToEuler(frame.tangent, frame.normal, frame.binormal);

                // Generate faces around the ring
                for (let j = 0; j < this.radialSegments; j++) {
                    const angle1 = (j / this.radialSegments) * Math.PI * 2;
                    const angle2 = ((j + 1) / this.radialSegments) * Math.PI * 2;

                    // Points on circle in local frame
                    const cos1 = Math.cos(angle1) * this.radius;
                    const sin1 = Math.sin(angle1) * this.radius;

                    // Transform to world coordinates
                    const x = pos.x + frame.normal.x * cos1 + frame.binormal.x * sin1;
                    const y = pos.y + frame.normal.y * cos1 + frame.binormal.y * sin1;
                    const z = pos.z + frame.normal.z * cos1 + frame.binormal.z * sin1;

                    // Face angle (pointing outward from tube center)
                    const faceAngle = (angle1 + angle2) / 2;
                    const faceDeg = faceAngle * 180 / Math.PI;

                    // Calculate face dimensions
                    const faceWidth = 2 * this.radius * Math.sin(Math.PI / this.radialSegments);
                    const faceHeight = this._getCurveLength() / this.curveSegments;

                    const face = document.createElement('div');
                    face.className = 'curve-face';

                    const color = (i + j) % 2 === 0 ? this.color : this.colorSecondary;

                    // Store face reference with world position for view-space haze
                    this._faces.push({ el: face, x, y, z });

                    // Build transform using proper Euler angles from Frenet frame
                    // rotateZ(faceDeg) rotates the face around the tube's tangent axis
                    const transform = `translate3d(${x}px, ${y}px, ${z}px)
                                       rotateY(${euler.y}deg)
                                       rotateX(${euler.x}deg)
                                       rotateZ(${euler.z + faceDeg}deg)
                                       translateX(-50%) translateY(-50%)`;

                    if (this.wireframe) {
                        face.style.cssText = `
                            position: absolute;
                            width: ${faceWidth}px;
                            height: ${faceHeight}px;
                            background: transparent;
                            border: 1px solid ${color};
                            transform-style: preserve-3d;
                            backface-visibility: hidden;
                            transform: ${transform};
                        `;
                    } else {
                        face.style.cssText = `
                            position: absolute;
                            width: ${faceWidth}px;
                            height: ${faceHeight}px;
                            background: ${color};
                            transform-style: preserve-3d;
                            backface-visibility: hidden;
                            transform: ${transform};
                        `;
                    }

                    ring.appendChild(face);
                }

                this.container.appendChild(ring);
            }

            return this.container;
        }

        _getCurveLength() {
            let length = 0;
            let prev = this._getPoint(0);
            for (let i = 1; i <= 20; i++) {
                const curr = this._getPoint(i / 20);
                length += Math.sqrt(
                    (curr.x - prev.x) ** 2 +
                    (curr.y - prev.y) ** 2 +
                    (curr.z - prev.z) ** 2
                );
                prev = curr;
            }
            return length;
        }

        destroy() {
            if (this.container?.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            this.container = null;
            this._faces = [];
        }

        // Update haze based on camera rotation (view-space z)
        updateHaze(rotX, rotY, hazeIntensity) {
            if (!this._faces.length) return;

            if (hazeIntensity <= 0) {
                // Reset to full opacity when haze is off
                this._faces.forEach(f => f.el.style.opacity = 1);
                return;
            }

            const hazeFactor = hazeIntensity / 100;

            // Convert degrees to radians
            const rx = rotX * Math.PI / 180;
            const ry = rotY * Math.PI / 180;

            // Precompute trig
            const cosX = Math.cos(rx), sinX = Math.sin(rx);
            const cosY = Math.cos(ry), sinY = Math.sin(ry);

            // Find z range after rotation
            let zMin = Infinity, zMax = -Infinity;
            const viewZs = [];

            for (const face of this._faces) {
                // Apply Y rotation then X rotation to get view-space z
                const z1 = face.x * sinY + face.z * cosY;
                const viewZ = face.y * sinX + z1 * cosX;
                viewZs.push(viewZ);
                zMin = Math.min(zMin, viewZ);
                zMax = Math.max(zMax, viewZ);
            }

            const zRange = zMax - zMin || 1;

            // Apply opacity based on view-space z
            for (let i = 0; i < this._faces.length; i++) {
                const zNorm = (viewZs[i] - zMin) / zRange; // 0 = far, 1 = near
                const hazeAmount = 1 - (1 - zNorm) * hazeFactor;
                const opacity = Math.max(0.15, hazeAmount);
                this._faces[i].el.style.opacity = opacity;
            }
        }

        getStats() {
            const rings = this.curveSegments + 1;
            const facesPerRing = this.radialSegments;
            const faceCount = rings * facesPerRing;
            // Each ring is a div, each face is a div, plus container
            const divCount = 1 + rings + faceCount;
            return { divCount, faceCount };
        }
    }

    APP.Curve = Curve;

})(window.APP);
