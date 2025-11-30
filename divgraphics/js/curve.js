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

            // Mode: 'bezier' | 'distribute' | 'crystal'
            this.mode = options.mode || 'bezier';

            // Shared modulation options (all modes)
            this.pieceCount = options.pieceCount || 8;
            this.phase = options.phase || 0;
            this.spin = options.spin || 0;
            this.sineAmplitudeX = options.sineAmplitudeX || 0;
            this.sineAmplitudeY = options.sineAmplitudeY || 0;
            this.sineAmplitudeZ = options.sineAmplitudeZ || 0;
            this.sineFrequency = options.sineFrequency || 1;

            // Breathing options
            this.breathe = options.breathe || false;
            this.breatheScale = options.breatheScale || 50;
            this.breatheSpeed = options.breatheSpeed || 1;
            this.breathePhase = options.breathePhase || 0;

            // Crystal mode options
            this.crystal = options.crystal || {
                layers: 3,
                spread: 60,
                petalLength: 80,
                petalWidth: 30,
                convergence: 100,
                twist: 0,
                bloom: 50
            };

            this.container = null;
            this._faces = [];
            this._breatheTime = 0;
            this._centerOfMass = { x: 0, y: 0, z: 0 };

            // Rotation around center of mass
            this.rotateX = options.rotateX || 0;
            this.rotateY = options.rotateY || 0;
            this.rotateZ = options.rotateZ || 0;

            // Transition state
            this._isTransitioning = false;
            this._transitionStart = 0;
            this._transitionDuration = 500;
            this._fromPositions = [];  // {x, y, z, width, height, rotateX, rotateY, rotateZ}
            this._toPositions = [];
            this._transitionEasing = 'easeInOut';
        }

        // Easing functions
        static _ease(t, type) {
            switch (type) {
                case 'linear': return t;
                case 'easeIn': return t * t;
                case 'easeOut': return t * (2 - t);
                case 'easeInOut': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                default: return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            }
        }

        // Lerp helper
        static _lerp(a, b, t) {
            return a + (b - a) * t;
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

        /**
         * Compute center of mass from all face positions
         */
        _computeCenterOfMass() {
            if (!this._faces.length) return { x: 0, y: 0, z: 0 };

            let com = { x: 0, y: 0, z: 0 };
            for (const f of this._faces) {
                com.x += f.x || 0;
                com.y += f.y || 0;
                com.z += f.z || 0;
            }
            com.x /= this._faces.length;
            com.y /= this._faces.length;
            com.z /= this._faces.length;

            return com;
        }

        /**
         * Get the current center of mass
         */
        getCenterOfMass() {
            return { ...this._centerOfMass };
        }

        /**
         * Update rotation transform around center of mass
         * Call this after changing rotateX/Y/Z or after generate()
         */
        updateRotation() {
            if (!this.container) return;

            const com = this._centerOfMass;
            const rx = this.rotateX || 0;
            const ry = this.rotateY || 0;
            const rz = this.rotateZ || 0;

            // Translate to COM, rotate, translate back
            // This rotates the entire curve around its center of mass
            this.container.style.transform = `
                translate3d(${com.x}px, ${com.y}px, ${com.z}px)
                rotateX(${rx}deg)
                rotateY(${ry}deg)
                rotateZ(${rz}deg)
                translate3d(${-com.x}px, ${-com.y}px, ${-com.z}px)
            `;
        }

        generate() {
            this.container = document.createElement('div');
            this.container.className = 'curve';
            this.container.style.cssText = 'position:absolute;transform-style:preserve-3d;';
            this._faces = [];

            // Dispatch based on mode
            if (this.mode === 'distribute' && APP.Scene?.track) {
                return this._generateDistributed();
            } else if (this.mode === 'crystal') {
                return this._generateCrystal();
            }

            // Generate rings along curve (bezier mode)
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
                            backface-visibility: visible;
                            transform: ${transform};
                        `;
                    } else {
                        face.style.cssText = `
                            position: absolute;
                            width: ${faceWidth}px;
                            height: ${faceHeight}px;
                            background: ${color};
                            transform-style: preserve-3d;
                            backface-visibility: visible;
                            transform: ${transform};
                        `;
                    }

                    ring.appendChild(face);
                }

                this.container.appendChild(ring);
            }

            // Compute center of mass and apply rotation
            this._centerOfMass = this._computeCenterOfMass();
            this.updateRotation();

            return this.container;
        }

        /**
         * Generate pieces distributed along the track with sine modulation
         */
        _generateDistributed() {
            const track = APP.Scene.track;
            const pieceLength = this._getCurveLength() / this.curveSegments;

            for (let i = 0; i < this.pieceCount; i++) {
                // Calculate t position on track (0-1)
                // Phase shifts all pieces around the loop
                const baseT = i / this.pieceCount;
                const phaseOffset = this.phase / 360;
                let t = (baseT + phaseOffset) % 1;
                if (t < 0) t += 1;

                // Get track frame at this position
                const trackPos = track.getPoint(t);
                const trackFrame = track.getFrame(t);

                // Calculate sine modulation offset
                // sineAngle progresses based on position and frequency
                const sineAngle = (baseT * this.sineFrequency * 2 * Math.PI);
                const sineValue = Math.sin(sineAngle);

                // Apply sine offset in track's local frame (normal, binormal, tangent)
                const offsetX = this.sineAmplitudeX * sineValue; // Normal direction
                const offsetY = this.sineAmplitudeY * sineValue; // Binormal direction
                const offsetZ = this.sineAmplitudeZ * sineValue; // Tangent direction

                // Transform offset from track-local to world coordinates
                const worldOffset = {
                    x: trackFrame.normal.x * offsetX + trackFrame.binormal.x * offsetY + trackFrame.tangent.x * offsetZ,
                    y: trackFrame.normal.y * offsetX + trackFrame.binormal.y * offsetY + trackFrame.tangent.y * offsetZ,
                    z: trackFrame.normal.z * offsetX + trackFrame.binormal.z * offsetY + trackFrame.tangent.z * offsetZ
                };

                // Final position
                const pos = {
                    x: trackPos.x + worldOffset.x,
                    y: trackPos.y + worldOffset.y,
                    z: trackPos.z + worldOffset.z
                };

                // Calculate spin rotation per piece
                const spinAngle = i * this.spin;

                // Create a short tube segment (piece) at this position
                this._generatePiece(pos, trackFrame, spinAngle, i);
            }

            // Compute center of mass and apply rotation
            this._centerOfMass = this._computeCenterOfMass();
            this.updateRotation();

            return this.container;
        }

        /**
         * Generate a single piece (short tube segment) at the given position
         */
        _generatePiece(pos, frame, spinAngle, pieceIndex) {
            const pieceLength = this.radius * 2; // Each piece is roughly 2x radius long

            // Get Euler angles from frame
            const euler = this._matrixToEuler(frame.tangent, frame.normal, frame.binormal);

            // Create ring container for this piece
            const ring = document.createElement('div');
            ring.className = 'curve-ring';
            ring.style.cssText = 'position:absolute;transform-style:preserve-3d;';

            // Generate faces around the ring for this piece
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
                const faceHeight = pieceLength;

                const face = document.createElement('div');
                face.className = 'curve-face';

                const color = (pieceIndex + j) % 2 === 0 ? this.color : this.colorSecondary;

                // Store face reference for haze
                this._faces.push({ el: face, x, y, z });

                // Build transform with spin applied
                const transform = `translate3d(${x}px, ${y}px, ${z}px)
                                   rotateY(${euler.y}deg)
                                   rotateX(${euler.x}deg)
                                   rotateZ(${euler.z + faceDeg + spinAngle}deg)
                                   translateX(-50%) translateY(-50%)`;

                if (this.wireframe) {
                    face.style.cssText = `
                        position: absolute;
                        width: ${faceWidth}px;
                        height: ${faceHeight}px;
                        background: transparent;
                        border: 1px solid ${color};
                        transform-style: preserve-3d;
                        backface-visibility: visible;
                        transform: ${transform};
                    `;
                } else {
                    face.style.cssText = `
                        position: absolute;
                        width: ${faceWidth}px;
                        height: ${faceHeight}px;
                        background: ${color};
                        transform-style: preserve-3d;
                        backface-visibility: visible;
                        transform: ${transform};
                    `;
                }

                ring.appendChild(face);
            }

            this.container.appendChild(ring);
        }

        /**
         * Generate a crystal/flower pattern with petals radiating from origin
         * Petals are arranged in cross-plane layers, all vying for the center
         * Calculates center of mass and applies scaling
         */
        _generateCrystal() {
            const c = this.crystal;
            const petalsPerLayer = this.pieceCount;
            const totalPetals = petalsPerLayer * c.layers;

            // Get breathing modulation
            const breatheMod = this._getBreatheMod();

            // Scale factor (1-100 maps to 0.01-1.0)
            const scale = Math.max(0.01, (c.scale || 100) / 100);

            // First pass: calculate all petal data and find center of mass
            const petalData = [];
            let centerOfMass = { x: 0, y: 0, z: 0 };

            for (let layer = 0; layer < c.layers; layer++) {
                const layerAngle = (layer / c.layers) * c.spread * (Math.PI / 180);

                for (let p = 0; p < petalsPerLayer; p++) {
                    const petalIndex = layer * petalsPerLayer + p;
                    const baseAngle = (p / petalsPerLayer) * Math.PI * 2;
                    const phaseRad = this.phase * (Math.PI / 180);
                    const angle = baseAngle + phaseRad;
                    const spinAngle = petalIndex * this.spin;

                    const sineAngle = (p / petalsPerLayer) * this.sineFrequency * Math.PI * 2;
                    const sineValue = Math.sin(sineAngle);

                    const lengthMod = 1 + (this.sineAmplitudeZ / 100) * sineValue;
                    const widthMod = 1 + (this.sineAmplitudeX / 100) * sineValue;
                    const petalLength = c.petalLength * lengthMod * breatheMod;
                    const petalWidth = c.petalWidth * widthMod * breatheMod;

                    const bloomRad = (c.bloom / 100) * (Math.PI / 2);

                    const layerCos = Math.cos(layerAngle);
                    const layerSin = Math.sin(layerAngle);

                    const dirX = Math.cos(angle);
                    const dirY = Math.sin(angle);
                    const rotatedDirY = dirY * layerCos;
                    const rotatedDirZ = dirY * layerSin;

                    const dir = { x: dirX, y: rotatedDirY, z: rotatedDirZ };

                    const perpOffset = this.sineAmplitudeY * sineValue;
                    const perpX = -rotatedDirY;
                    const perpY = dirX * layerCos;
                    const perpZ = dirX * layerSin;

                    const convFactor = c.convergence / 100;

                    // Calculate petal center position (before centering)
                    const centerDist = petalLength / 2;
                    const tiltAngle = bloomRad;
                    const pos = {
                        x: dir.x * centerDist * Math.cos(tiltAngle) + perpX * perpOffset,
                        y: dir.y * centerDist * Math.cos(tiltAngle) + perpY * perpOffset,
                        z: dir.z * centerDist * Math.cos(tiltAngle) + petalLength * 0.5 * Math.sin(tiltAngle) + perpZ * perpOffset
                    };

                    // Accumulate for center of mass
                    centerOfMass.x += pos.x;
                    centerOfMass.y += pos.y;
                    centerOfMass.z += pos.z;

                    petalData.push({
                        dir, petalLength, petalWidth, bloomRad, convFactor,
                        twist: spinAngle + c.twist * (petalIndex / totalPetals),
                        index: petalIndex,
                        perpOffset: { x: perpX * perpOffset, y: perpY * perpOffset, z: perpZ * perpOffset },
                        pos
                    });
                }
            }

            // Calculate center of mass
            if (petalData.length > 0) {
                centerOfMass.x /= petalData.length;
                centerOfMass.y /= petalData.length;
                centerOfMass.z /= petalData.length;
            }

            // Add manual offset
            const offset = c.centerOffset || { x: 0, y: 0, z: 0 };

            // Second pass: generate petals with centering and scaling
            for (const petal of petalData) {
                this._generatePetal(
                    petal.dir,
                    petal.petalLength * scale,
                    petal.petalWidth * scale,
                    petal.bloomRad,
                    petal.convFactor,
                    petal.twist,
                    petal.index,
                    {
                        x: (petal.perpOffset.x - centerOfMass.x + offset.x) * scale,
                        y: (petal.perpOffset.y - centerOfMass.y + offset.y) * scale,
                        z: (petal.perpOffset.z - centerOfMass.z + offset.z) * scale
                    },
                    scale,
                    centerOfMass
                );
            }

            // Compute center of mass and apply rotation
            this._centerOfMass = this._computeCenterOfMass();
            this.updateRotation();

            return this.container;
        }

        /**
         * Generate a single petal (elongated face pointing toward/away from origin)
         * @param {object} dir - Direction vector
         * @param {number} length - Petal length (already scaled)
         * @param {number} width - Petal width (already scaled)
         * @param {number} bloomRad - Bloom angle in radians
         * @param {number} convergence - How much petal points to center (0-1)
         * @param {number} twist - Twist angle in degrees
         * @param {number} index - Petal index for coloring
         * @param {object} perpOffset - Perpendicular offset (already centered and scaled)
         * @param {number} scale - Scale factor (default 1)
         * @param {object} centerOfMass - Center of mass to offset from
         */
        _generatePetal(dir, length, width, bloomRad, convergence, twist, index, perpOffset, scale = 1, centerOfMass = null) {
            // Petal center is halfway along its length from origin
            const centerDist = length / 2;

            // Apply bloom: tilt the petal outward from vertical
            const tiltAngle = bloomRad;

            // Calculate position with bloom tilt, centered and scaled
            let pos = {
                x: dir.x * centerDist * Math.cos(tiltAngle),
                y: dir.y * centerDist * Math.cos(tiltAngle),
                z: dir.z * centerDist * Math.cos(tiltAngle) + length * 0.5 * Math.sin(tiltAngle)
            };

            // Apply centering (subtract center of mass) and scaling
            if (centerOfMass) {
                // Scale the base position relative to center
                pos.x = (pos.x - centerOfMass.x * scale) + perpOffset.x;
                pos.y = (pos.y - centerOfMass.y * scale) + perpOffset.y;
                pos.z = (pos.z - centerOfMass.z * scale) + perpOffset.z;
            } else {
                pos.x += perpOffset.x;
                pos.y += perpOffset.y;
                pos.z += perpOffset.z;
            }

            // Calculate rotation angles
            const radialAngle = Math.atan2(dir.y, dir.x) * (180 / Math.PI);
            const pitchAngle = (1 - convergence) * 90 - bloomRad * (180 / Math.PI);

            // Create the petal face
            const face = document.createElement('div');
            face.className = 'curve-face crystal-petal';

            const color = index % 2 === 0 ? this.color : this.colorSecondary;

            // Store face reference for haze
            this._faces.push({ el: face, x: pos.x, y: pos.y, z: pos.z });

            // Build transform
            const transform = `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px)
                               rotateZ(${radialAngle}deg)
                               rotateX(${pitchAngle}deg)
                               rotateY(${twist}deg)
                               translateX(-50%) translateY(-50%)`;

            if (this.wireframe) {
                face.style.cssText = `
                    position: absolute;
                    width: ${width}px;
                    height: ${length}px;
                    background: transparent;
                    border: 1px solid ${color};
                    transform-style: preserve-3d;
                    backface-visibility: visible;
                    transform: ${transform};
                `;
            } else {
                face.style.cssText = `
                    position: absolute;
                    width: ${width}px;
                    height: ${length}px;
                    background: ${color};
                    transform-style: preserve-3d;
                    backface-visibility: visible;
                    transform: ${transform};
                `;
            }

            this.container.appendChild(face);
        }

        /**
         * Get breathing modulation factor (1.0 = no change)
         * Syncs with animation BPM via timing system
         * Speed: beats per breath cycle (1 = 1 beat per breath, 4 = 4 beats per breath)
         */
        _getBreatheMod() {
            // Read live values from state
            const breathe = APP.State?.select('curve.breathe');
            if (!breathe) return 1.0;

            const breatheScale = APP.State?.select('curve.breatheScale') ?? 50;
            const breatheSpeed = APP.State?.select('curve.breatheSpeed') ?? 4; // beats per breath
            const breathePhase = APP.State?.select('curve.breathePhase') ?? 0;

            // Use timing system's pulse count for true BPM sync
            const pulseCount = APP.Timing?.getPulseCount() || 0;
            const pulsePhase = APP.Timing?.getPhase() || 0;

            // Total pulses (including fractional current pulse)
            const totalPulses = pulseCount + pulsePhase;

            // Convert to breath cycles: one breath every 'breatheSpeed' beats
            // breatheSpeed is stored as 1-32 (beats per breath cycle)
            const breathCycles = totalPulses / breatheSpeed;

            // Add phase offset
            const breathePhaseRad = breathePhase * (Math.PI / 180);
            const breatheAngle = (breathCycles * Math.PI * 2) + breathePhaseRad;

            // Sine wave from 0 to 1 (not -1 to 1)
            const sineValue = (Math.sin(breatheAngle) + 1) / 2;

            // Scale factor: 1.0 at min, (1 + breatheScale/100) at max
            return 1.0 + (breatheScale / 100) * sineValue;
        }

        /**
         * Update breathing animation (called from animation loop)
         */
        updateBreathing() {
            const breathe = APP.State?.select('curve.breathe');
            const mode = APP.State?.select('curve.mode') || 'bezier';
            if (!breathe || mode === 'bezier') return;

            // For breathing to work smoothly, we need to update transforms
            // This is called from the animation loop
            const breatheMod = this._getBreatheMod();

            // Update face scales for breathing effect
            this._faces.forEach((f, i) => {
                if (f.el) {
                    // Remove any existing scale and add new one
                    const currentTransform = f.el.style.transform.replace(/\s*scale\([^)]*\)/g, '');
                    f.el.style.transform = currentTransform + ` scale(${breatheMod})`;
                }
            });
        }

        /**
         * Capture current face positions for transition
         */
        _capturePositions() {
            return this._faces.map(f => ({
                x: f.x || 0,
                y: f.y || 0,
                z: f.z || 0,
                width: f.width || 30,
                height: f.height || 80,
                opacity: 1
            }));
        }

        /**
         * Start a transition to new mode
         * @param {string} newMode - Target mode
         * @param {number} duration - Transition duration in ms
         * @param {string} easing - Easing function name
         */
        startTransition(newMode, duration = 500, easing = 'easeInOut') {
            // Capture current positions
            this._fromPositions = this._capturePositions();
            this._transitionDuration = duration;
            this._transitionEasing = easing;
            this._transitionStart = performance.now();
            this._isTransitioning = true;
            this._transitionToMode = newMode;

            // Calculate target positions without rebuilding DOM yet
            this._toPositions = this._calculatePositionsForMode(newMode);

            // Ensure we have enough faces for the transition
            this._ensureFaceCount(Math.max(this._fromPositions.length, this._toPositions.length));
        }

        /**
         * Calculate positions for a given mode without generating DOM
         */
        _calculatePositionsForMode(mode) {
            const positions = [];

            if (mode === 'crystal') {
                const c = this.crystal;
                const petalsPerLayer = this.pieceCount;
                const scale = Math.max(0.01, (c.scale || 100) / 100);
                const breatheMod = this._getBreatheMod();

                let centerOfMass = { x: 0, y: 0, z: 0 };
                const petalData = [];

                for (let layer = 0; layer < c.layers; layer++) {
                    const layerAngle = (layer / c.layers) * c.spread * (Math.PI / 180);

                    for (let p = 0; p < petalsPerLayer; p++) {
                        const baseAngle = (p / petalsPerLayer) * Math.PI * 2;
                        const phaseRad = this.phase * (Math.PI / 180);
                        const angle = baseAngle + phaseRad;

                        const sineAngle = (p / petalsPerLayer) * this.sineFrequency * Math.PI * 2;
                        const sineValue = Math.sin(sineAngle);

                        const lengthMod = 1 + (this.sineAmplitudeZ / 100) * sineValue;
                        const widthMod = 1 + (this.sineAmplitudeX / 100) * sineValue;
                        const petalLength = c.petalLength * lengthMod * breatheMod;
                        const petalWidth = c.petalWidth * widthMod * breatheMod;

                        const bloomRad = (c.bloom / 100) * (Math.PI / 2);
                        const layerCos = Math.cos(layerAngle);
                        const layerSin = Math.sin(layerAngle);

                        const dirX = Math.cos(angle);
                        const dirY = Math.sin(angle);
                        const rotatedDirY = dirY * layerCos;
                        const rotatedDirZ = dirY * layerSin;

                        const dir = { x: dirX, y: rotatedDirY, z: rotatedDirZ };
                        const centerDist = petalLength / 2;
                        const tiltAngle = bloomRad;

                        const pos = {
                            x: dir.x * centerDist * Math.cos(tiltAngle),
                            y: dir.y * centerDist * Math.cos(tiltAngle),
                            z: dir.z * centerDist * Math.cos(tiltAngle) + petalLength * 0.5 * Math.sin(tiltAngle)
                        };

                        centerOfMass.x += pos.x;
                        centerOfMass.y += pos.y;
                        centerOfMass.z += pos.z;

                        petalData.push({ pos, width: petalWidth, height: petalLength });
                    }
                }

                if (petalData.length > 0) {
                    centerOfMass.x /= petalData.length;
                    centerOfMass.y /= petalData.length;
                    centerOfMass.z /= petalData.length;
                }

                for (const petal of petalData) {
                    positions.push({
                        x: (petal.pos.x - centerOfMass.x) * scale,
                        y: (petal.pos.y - centerOfMass.y) * scale,
                        z: (petal.pos.z - centerOfMass.z) * scale,
                        width: petal.width * scale,
                        height: petal.height * scale,
                        opacity: 1
                    });
                }
            } else if (mode === 'distribute' && APP.Scene?.track) {
                const track = APP.Scene.track;

                for (let i = 0; i < this.pieceCount; i++) {
                    const baseT = i / this.pieceCount;
                    const phaseOffset = this.phase / 360;
                    let t = (baseT + phaseOffset) % 1;
                    if (t < 0) t += 1;

                    const trackPos = track.getPoint(t);
                    const trackFrame = track.getFrame(t);

                    const sineAngle = baseT * this.sineFrequency * 2 * Math.PI;
                    const sineValue = Math.sin(sineAngle);

                    const offsetX = this.sineAmplitudeX * sineValue;
                    const offsetY = this.sineAmplitudeY * sineValue;
                    const offsetZ = this.sineAmplitudeZ * sineValue;

                    const worldOffset = {
                        x: trackFrame.normal.x * offsetX + trackFrame.binormal.x * offsetY + trackFrame.tangent.x * offsetZ,
                        y: trackFrame.normal.y * offsetX + trackFrame.binormal.y * offsetY + trackFrame.tangent.y * offsetZ,
                        z: trackFrame.normal.z * offsetX + trackFrame.binormal.z * offsetY + trackFrame.tangent.z * offsetZ
                    };

                    positions.push({
                        x: trackPos.x + worldOffset.x,
                        y: trackPos.y + worldOffset.y,
                        z: trackPos.z + worldOffset.z,
                        width: this.radius * 2,
                        height: this.radius * 2,
                        opacity: 1
                    });
                }
            }

            return positions;
        }

        /**
         * Ensure we have at least N faces in the container
         */
        _ensureFaceCount(count) {
            // Add faces if needed
            while (this._faces.length < count) {
                const face = document.createElement('div');
                face.className = 'curve-face transition-face';
                face.style.cssText = `
                    position: absolute;
                    transform-style: preserve-3d;
                    backface-visibility: visible;
                    opacity: 0;
                `;
                this.container.appendChild(face);
                this._faces.push({ el: face, x: 0, y: 0, z: 0, width: 30, height: 80 });
            }
        }

        /**
         * Update transition animation (called from animation loop)
         * @returns {boolean} true if still transitioning
         */
        updateTransition() {
            if (!this._isTransitioning) return false;

            const now = performance.now();
            const elapsed = now - this._transitionStart;
            const rawT = Math.min(1, elapsed / this._transitionDuration);
            const t = Curve._ease(rawT, this._transitionEasing);

            const fromLen = this._fromPositions.length;
            const toLen = this._toPositions.length;
            const maxLen = Math.max(fromLen, toLen);

            for (let i = 0; i < this._faces.length && i < maxLen; i++) {
                const face = this._faces[i];
                if (!face.el) continue;

                // Get from/to positions (use last valid or zero if missing)
                const from = this._fromPositions[i] || this._fromPositions[fromLen - 1] || { x: 0, y: 0, z: 0, width: 30, height: 80, opacity: 0 };
                const to = this._toPositions[i] || { x: 0, y: 0, z: 0, width: 30, height: 80, opacity: 0 };

                // Handle fade in/out for mismatched counts
                let fromOpacity = i < fromLen ? 1 : 0;
                let toOpacity = i < toLen ? 1 : 0;

                // Lerp all values
                const x = Curve._lerp(from.x, to.x, t);
                const y = Curve._lerp(from.y, to.y, t);
                const z = Curve._lerp(from.z, to.z, t);
                const width = Curve._lerp(from.width || 30, to.width || 30, t);
                const height = Curve._lerp(from.height || 80, to.height || 80, t);
                const opacity = Curve._lerp(fromOpacity, toOpacity, t);

                // Update face position
                face.x = x;
                face.y = y;
                face.z = z;
                face.width = width;
                face.height = height;

                // Apply color
                const color = i % 2 === 0 ? this.color : this.colorSecondary;

                face.el.style.cssText = `
                    position: absolute;
                    width: ${width}px;
                    height: ${height}px;
                    background: ${this.wireframe ? 'transparent' : color};
                    border: ${this.wireframe ? '1px solid ' + color : 'none'};
                    transform-style: preserve-3d;
                    backface-visibility: visible;
                    opacity: ${opacity};
                    transform: translate3d(${x}px, ${y}px, ${z}px) translateX(-50%) translateY(-50%);
                `;
            }

            // Hide extra faces
            for (let i = maxLen; i < this._faces.length; i++) {
                if (this._faces[i].el) {
                    this._faces[i].el.style.opacity = '0';
                }
            }

            // Check if transition complete
            if (rawT >= 1) {
                this._isTransitioning = false;
                // Update mode and regenerate properly
                this.mode = this._transitionToMode;
                return false;
            }

            return true;
        }

        /**
         * Check if currently transitioning
         */
        isTransitioning() {
            return this._isTransitioning;
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
        // opts: { rotX, rotY, rotZ, intensity, rollMode }
        updateHaze(opts) {
            const { rotX, rotY, rotZ, intensity, rollMode } = opts;

            if (!this._faces.length) return;

            if (intensity <= 0) {
                this._faces.forEach(f => f.el.style.opacity = 1);
                return;
            }

            const hazeFactor = intensity / 100;

            // Convert degrees to radians
            const rx = rotX * Math.PI / 180;
            const ry = rotY * Math.PI / 180;
            const rz = rotZ * Math.PI / 180;

            // Precompute trig
            const cosX = Math.cos(rx), sinX = Math.sin(rx);
            const cosY = Math.cos(ry), sinY = Math.sin(ry);
            const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

            // Find z range after rotation
            let zMin = Infinity, zMax = -Infinity;
            const viewZs = [];

            for (const face of this._faces) {
                let viewZ;

                if (rollMode === 'world') {
                    // WORLD mode: Z → Y → X (Z first in world space)
                    // Apply Z rotation first (rotates in XY plane)
                    const xz = face.x * cosZ - face.y * sinZ;
                    const yz = face.x * sinZ + face.y * cosZ;
                    // Then Y rotation: z' = -x'*sinY + z*cosY
                    const zy = -xz * sinY + face.z * cosY;
                    // Then X rotation: z'' = y'*sinX + z'*cosX
                    viewZ = yz * sinX + zy * cosX;
                } else {
                    // VIEW mode: Y → X (Z is roll at end, doesn't affect depth)
                    // Y rotation: z' = -x*sinY + z*cosY
                    const z1 = -face.x * sinY + face.z * cosY;
                    // X rotation: z'' = y*sinX + z'*cosX
                    viewZ = face.y * sinX + z1 * cosX;
                }

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
