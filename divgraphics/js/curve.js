/**
 * DivGraphics - Curve Module
 * 3D tubes/pipes along bezier curves using CSS 3D transforms
 * Refactored to use StageDefinition and StageMorph for clean transitions
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * Curve - Creates a 3D tube along a bezier path
     * Now delegates to StageMorph for transitions between bezier/distribute/crystal
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
            this.radius = options.radius || 10;
            this.color = options.color || '#00ff88';
            this.colorSecondary = options.colorSecondary || '#0088ff';
            this.wireframe = options.wireframe || false;

            // Mode: 'bezier' | 'distribute' | 'crystal'
            this.mode = options.mode || 'bezier';

            // === UNIFIED parameters (shared across all modes) ===
            // pieceCount controls radial segments in bezier/distribute AND petal count in crystal
            this.pieceCount = options.pieceCount || 8;
            // Legacy radialSegments - now derived from pieceCount
            this.radialSegments = options.radialSegments || this.pieceCount;

            // Length as percentage (100 = natural length) - applies to segments AND petals
            this.length = options.length ?? 100;
            // Spacing between segments (0-200%, 100=natural gap)
            this.spacing = options.spacing ?? 100;
            // Twist: rotation delta per segment in degrees
            this.twist = options.twist ?? 0;
            // Border width - use 1px base, let scaleX handle thinning
            // Slider 0.5-200 maps to 0.005-2px but we clamp minimum to 0.5px for rendering
            this.borderWidth = Math.max(0.5, (options.borderWidth ?? 50) / 100);
            // Face width scale (0-200%, 100 = natural width based on pieceCount)
            this.faceWidthScale = options.faceWidthScale ?? 100;
            // Loop border - full continuous border (true) vs hairline edges only (false)
            this.loopBorder = options.loopBorder ?? false;
            // Softness - applies uniform blur to make lines appear thinner/softer
            this.softness = options.softness ?? 0;
            // Round - rounds corners of faces (0=square, 100=fully rounded/oval)
            this.round = options.round ?? 0;

            // Shared modulation options (all modes)
            this.phase = options.phase || 0;
            this.spin = options.spin || 0;
            this.spread = options.spread ?? 100; // 0=stacked, 100=distributed
            this.sineAmplitudeX = options.sineAmplitudeX || 0;
            this.sineAmplitudeY = options.sineAmplitudeY || 0;
            this.sineAmplitudeZ = options.sineAmplitudeZ || 0;
            this.sineFrequency = options.sineFrequency ?? 1;

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

            // Rotation around center of mass (or track-relative in bound mode)
            this.rotateX = options.rotateX ?? 0;
            this.rotateY = options.rotateY ?? 0;
            this.rotateZ = options.rotateZ ?? 0;

            // Position offset (per-mode)
            this.bezierOffset = options.bezierOffset || { x: 0, y: 0, z: 0 };
            this.distributeOffset = options.distributeOffset || { x: 0, y: 0, z: 0 };
            this.crystalOffset = options.crystalOffset || { x: 0, y: 0, z: 0 };

            // Scale factor (per-mode)
            this.bezierScale = options.bezierScale ?? 100;
            this.distributeScale = options.distributeScale ?? 100;
            this.crystalScale = options.crystalScale ?? 100;

            // StageMorph instance (created on generate)
            this._morph = null;

            // Bounding box
            this.showBoundingBox = options.showBoundingBox ?? false;
            this.boundingBoxColor = options.boundingBoxColor || '#ffffff';
            this.boundingBoxOpacity = options.boundingBoxOpacity ?? 0.5;
            this._boundingBoxContainer = null;
            this._boundingBox = null; // { min: {x,y,z}, max: {x,y,z} }

            // Legacy transition state (for backward compatibility)
            this._isTransitioning = false;
            this._transitionStart = 0;
            this._transitionDuration = 500;
            this._fromPositions = [];
            this._toPositions = [];
            this._transitionEasing = 'easeInOut';
        }

        /**
         * Check if StageMorph is available and should be used
         * Disabled for now - using legacy generator with length support
         */
        _useStageMorph() {
            return false; // APP.StageMorph && APP.StageRegistry;
        }

        // Easing functions (kept for legacy support)
        static _ease(t, type) {
            if (APP.Easing && APP.Easing[type]) {
                return APP.Easing[type](t);
            }
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

            // Use consistent up vector based on curve start to avoid frame flipping
            const startTangent = this._getTangent(0);
            let up;
            if (Math.abs(startTangent.y) > 0.9) {
                up = { x: 0, y: 0, z: 1 }; // Z-up if curve starts vertical
            } else {
                up = { x: 0, y: 1, z: 0 }; // Y-up otherwise
            }

            // binormal = tangent × up
            let binormal = {
                x: tangent.y * up.z - tangent.z * up.y,
                y: tangent.z * up.x - tangent.x * up.z,
                z: tangent.x * up.y - tangent.y * up.x
            };
            let bLen = Math.sqrt(binormal.x ** 2 + binormal.y ** 2 + binormal.z ** 2);

            // If tangent parallel to up, use alternative
            if (bLen < 0.01) {
                up = { x: 1, y: 0, z: 0 };
                binormal = {
                    x: tangent.y * up.z - tangent.z * up.y,
                    y: tangent.z * up.x - tangent.x * up.z,
                    z: tangent.x * up.y - tangent.y * up.x
                };
                bLen = Math.sqrt(binormal.x ** 2 + binormal.y ** 2 + binormal.z ** 2);
            }

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
         * Get extra CSS for softness and round effects
         */
        _getEffectStyles(width, height) {
            let css = '';

            // Softness blur
            if (this.softness > 0) {
                const blur = this.softness / 20; // 0-100 → 0-5px blur
                css += `filter: blur(${blur}px); `;
            }

            // Round corners - 50% of smaller dimension = full oval/circle
            if (this.round > 0) {
                const minDim = Math.min(width, height);
                const radius = (this.round / 100) * (minDim / 2);
                css += `border-radius: ${radius}px; `;
            }

            return css;
        }

        /**
         * Get face width in pixels - independent of radius
         * faceWidthScale: 0-200 maps to 1-40px base width
         * Returns { width, scaleX } where scaleX handles hairline effect
         */
        _getFaceWidth() {
            // Base width of 20px at 100%, independent of radius
            const baseWidth = 20;
            const scale = Math.max(0.05, this.faceWidthScale / 100);
            return {
                width: baseWidth,
                scaleX: scale
            };
        }

        /**
         * Get the scaleX value for hairline effect (legacy, for compatibility)
         */
        _getFaceScaleX() {
            if (this.faceWidthScale <= 0) {
                return 0.05; // Minimum hairline
            }
            return this.faceWidthScale / 100;
        }

        /**
         * Update softness and round effects on existing faces without rebuild
         * Stores softness blur in face._softnessBlur for preservation during haze updates
         */
        updateEffects(softness, round) {
            this.softness = softness ?? this.softness;
            this.round = round ?? this.round;

            const blur = this.softness / 20; // 0-100 → 0-5px blur

            for (const face of this._faces) {
                if (!face.el) continue;

                // Store softness blur for preservation during haze updates
                face._softnessBlur = blur;

                // Apply blur (will be combined with haze in updateHaze)
                face.el.style.filter = blur > 0 ? `blur(${blur}px)` : '';

                // Apply border radius
                if (this.round > 0) {
                    const minDim = Math.min(face.width || 10, face.height || 10);
                    const radius = (this.round / 100) * (minDim / 2);
                    face.el.style.borderRadius = radius + 'px';
                } else {
                    face.el.style.borderRadius = '';
                }
            }
        }

        /**
         * Get the offset for the current mode
         */
        _getOffset() {
            switch (this.mode) {
                case 'distribute':
                    return this.distributeOffset || { x: 0, y: 0, z: 0 };
                case 'crystal':
                    return this.crystalOffset || { x: 0, y: 0, z: 0 };
                case 'bezier':
                default:
                    return this.bezierOffset || { x: 0, y: 0, z: 0 };
            }
        }

        /**
         * Get the scale factor for the current mode (0-200 → 0-2)
         */
        _getScale() {
            let scale;
            switch (this.mode) {
                case 'distribute':
                    scale = this.distributeScale ?? 100;
                    break;
                case 'crystal':
                    scale = this.crystalScale ?? 100;
                    break;
                case 'bezier':
                default:
                    scale = this.bezierScale ?? 100;
                    break;
            }
            return scale / 100;
        }

        /**
         * Update rotation transform around center of mass
         * Call this after changing rotateX/Y/Z or after generate()
         * Centers the curve's COM at the view origin (0,0,0)
         *
         * In distribute mode: rotations are handled differently
         *   - rotateX: adds to phase (around track like chaser)
         *   - rotateY: barrel roll (applied during piece generation)
         *   - rotateZ: disabled (no meaning when bound to track)
         *   - Container has identity transform (COM is zero)
         *   - But offset and scale still apply
         */
        updateRotation() {
            if (!this.container) return;

            const com = this._centerOfMass;
            const offset = this._getOffset();
            const scale = this._getScale();
            const ox = offset.x || 0;
            const oy = offset.y || 0;
            const oz = offset.z || 0;

            // In distribute mode, rotations are handled during generation
            // Scale is applied per-piece during generation (not on container, which would move pieces off track)
            // Container only needs offset transform
            if (this.mode === 'distribute') {
                if (ox !== 0 || oy !== 0 || oz !== 0) {
                    this.container.style.transform = `translate3d(${ox}px, ${oy}px, ${oz}px)`;
                } else {
                    this.container.style.transform = '';
                }
                return;
            }

            const rx = this.rotateX || 0;
            const ry = this.rotateY || 0;
            const rz = this.rotateZ || 0;

            // Translate COM to origin, apply offset/scale, then rotate
            // Scale is applied after centering so it scales from COM
            this.container.style.transform = `
                translate3d(${ox}px, ${oy}px, ${oz}px)
                rotateX(${rx}deg)
                rotateY(${ry}deg)
                rotateZ(${rz}deg)
                scale3d(${scale}, ${scale}, ${scale})
                translate3d(${-com.x}px, ${-com.y}px, ${-com.z}px)
            `;
        }

        generate() {
            this.container = document.createElement('div');
            this.container.className = 'curve';
            this.container.style.cssText = 'position:absolute;transform-style:preserve-3d;';
            this._faces = [];

            // Use StageMorph if available for cleaner stage management
            if (this._useStageMorph()) {
                return this._generateWithMorph();
            }

            // Legacy: Dispatch based on mode
            if (this.mode === 'distribute' && APP.Scene?.track) {
                return this._generateDistributed();
            } else if (this.mode === 'crystal') {
                return this._generateCrystal();
            }

            // Legacy: Generate rings along curve (bezier mode)
            return this._generateBezierLegacy();
        }

        /**
         * Generate using StageMorph system
         */
        _generateWithMorph() {
            // Create StageMorph instance
            this._morph = new APP.StageMorph(this.container, {
                color: this.color,
                colorSecondary: this.colorSecondary,
                wireframe: this.wireframe
            });

            // Build params and context for current stage
            const params = this._getStageParams();
            const context = this._getStageContext();

            // Set initial stage
            this._morph.setStage(this.mode, params, context);

            // Compute center of mass from morph faces
            this._centerOfMass = this._computeCenterOfMassFromMorph();
            this.updateRotation();

            return this.container;
        }

        /**
         * Get stage parameters from current state
         */
        _getStageParams() {
            return {
                // Bezier params
                points: this.points,
                curveSegments: this.curveSegments,
                radialSegments: this.radialSegments,
                radius: this.radius,

                // Geometry params
                length: this.length,

                // Shared params
                pieceCount: this.pieceCount,
                phase: this.phase,
                spin: this.spin,
                spread: this.spread,
                sineAmplitudeX: this.sineAmplitudeX,
                sineAmplitudeY: this.sineAmplitudeY,
                sineAmplitudeZ: this.sineAmplitudeZ,
                sineFrequency: this.sineFrequency,

                // Crystal params
                crystal: this.crystal
            };
        }

        /**
         * Get stage context (track, timing, etc.)
         */
        _getStageContext() {
            return {
                track: APP.Scene?.track || null,
                breatheMod: this._getBreatheMod()
            };
        }

        /**
         * Compute center of mass from StageMorph faces
         */
        _computeCenterOfMassFromMorph() {
            if (!this._morph) return { x: 0, y: 0, z: 0 };

            const positions = this._morph.getFacePositions();
            if (!positions.length) return { x: 0, y: 0, z: 0 };

            let com = { x: 0, y: 0, z: 0 };
            for (const p of positions) {
                com.x += p.x;
                com.y += p.y;
                com.z += p.z;
            }
            com.x /= positions.length;
            com.y /= positions.length;
            com.z /= positions.length;

            return com;
        }

        /**
         * Legacy bezier generation (fallback when StageMorph not available)
         */
        _generateBezierLegacy() {
            // Spacing controls how rings are distributed along curve
            // 0% = all stacked at center, 100% = normal spread, 200% = extended
            const spacingScale = (this.spacing ?? 100) / 100;

            for (let i = 0; i <= this.curveSegments; i++) {
                const baseT = i / this.curveSegments;

                // Compress/expand segments along curve based on spacing
                // At spacing=0, all at t=0.5; at spacing=100, normal spread
                const posT = 0.5 + (baseT - 0.5) * spacingScale;
                const clampedT = Math.max(0, Math.min(1, posT));

                // Position from spacing-adjusted t, but frame from original t for consistent orientation
                const pos = this._getPoint(clampedT);
                const frame = this._getFrame(baseT);

                const ring = document.createElement('div');
                ring.className = 'curve-ring';
                ring.style.cssText = 'position:absolute;transform-style:preserve-3d;';

                const euler = this._matrixToEuler(frame.tangent, frame.normal, frame.binormal);

                for (let j = 0; j < this.radialSegments; j++) {
                    const angle1 = (j / this.radialSegments) * Math.PI * 2;
                    const angle2 = ((j + 1) / this.radialSegments) * Math.PI * 2;

                    const cos1 = Math.cos(angle1) * this.radius;
                    const sin1 = Math.sin(angle1) * this.radius;

                    const x = pos.x + frame.normal.x * cos1 + frame.binormal.x * sin1;
                    const y = pos.y + frame.normal.y * cos1 + frame.binormal.y * sin1;
                    const z = pos.z + frame.normal.z * cos1 + frame.binormal.z * sin1;

                    const faceAngle = (angle1 + angle2) / 2;
                    const faceDeg = faceAngle * 180 / Math.PI;

                    // Face width independent of radius - controlled by FaceW slider
                    const { width: faceWidth, scaleX } = this._getFaceWidth();
                    // Length controls radial segment length (size of each face)
                    // baseHeight is natural size, length scales it
                    const baseHeight = this._getCurveLength() / this.curveSegments;
                    const faceHeight = baseHeight * (this.length / 100);

                    const face = document.createElement('div');
                    face.className = 'curve-face';

                    const color = (i + j) % 2 === 0 ? this.color : this.colorSecondary;

                    this._faces.push({ el: face, x, y, z, width: faceWidth, height: faceHeight, _softnessBlur: this.softness / 20 });

                    // Add twist: each segment rotates by i * twist degrees
                    const twistRotation = i * this.twist;

                    // scaleX for hairline effect - applied after centering
                    const transform = `translate3d(${x}px, ${y}px, ${z}px)
                                       rotateY(${euler.y}deg)
                                       rotateX(${euler.x}deg)
                                       rotateZ(${euler.z + faceDeg + twistRotation}deg)
                                       translateX(-50%) translateY(-50%)
                                       scaleX(${scaleX})`;

                    const effects = this._getEffectStyles(faceWidth, faceHeight);

                    if (this.wireframe) {
                        // Line thickness controlled by borderWidth, compensate for scaleX
                        const compensatedBorder = this.borderWidth / scaleX;
                        const borderStyle = this.loopBorder
                            ? `border: ${compensatedBorder}px solid ${color};`
                            : `border-left: ${compensatedBorder}px solid ${color}; border-right: ${compensatedBorder}px solid ${color};`;
                        face.style.cssText = `
                            position: absolute;
                            width: ${faceWidth}px;
                            height: ${faceHeight}px;
                            background: transparent;
                            ${borderStyle}
                            transform-style: preserve-3d;
                            backface-visibility: visible;
                            transform: ${transform};
                            ${effects}
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
                            ${effects}
                        `;
                    }

                    ring.appendChild(face);
                }

                this.container.appendChild(ring);
            }

            this._centerOfMass = this._computeCenterOfMass();
            this.updateRotation();

            // Generate bounding box if enabled
            if (this.showBoundingBox) {
                this.generateBoundingBox();
            }

            return this.container;
        }

        /**
         * Generate pieces distributed along the track with sine modulation
         * Rotation semantics in bound mode:
         *   - rotateX: moves pieces around track (adds to phase)
         *   - rotateY: barrel roll - rotates formation around track tangent
         *   - rotateZ: disabled (no meaning when bound to track)
         */
        _generateDistributed() {
            const track = APP.Scene.track;
            // pieceLength affected by spacing (100 = natural, 50 = half size with gaps)
            const spacingFactor = (this.spacing ?? 100) / 100;
            const basePieceLength = this._getCurveLength() / this.curveSegments;
            const pieceLength = basePieceLength * spacingFactor;

            // Get track parameter range (NOT 0-1, but 0 to waypoints.length for closed loops)
            const range = track.getParameterRange();
            const tRange = range.max - range.min;

            // Barrel roll angle (rotateY in bound mode)
            const barrelRollRad = (this.rotateY || 0) * Math.PI / 180;
            const cosBarrel = Math.cos(barrelRollRad);
            const sinBarrel = Math.sin(barrelRollRad);

            // rotateX adds to phase in bound mode (around track like chaser)
            const rotateXPhase = (this.rotateX ?? 0) / 360;

            // Spread: 0 = all stacked at center, 100 = evenly distributed
            const spreadFactor = (this.spread ?? 100) / 100;

            for (let i = 0; i < this.pieceCount; i++) {
                // Calculate normalized position (0-1), then scale to track parameter range
                // At spread=0, all pieces at phase position; at spread=100, evenly distributed
                const baseT = (i / this.pieceCount) * spreadFactor;
                const phaseOffset = this.phase / 360 + rotateXPhase;
                let tNorm = (baseT + phaseOffset) % 1;
                if (tNorm < 0) tNorm += 1;

                // Scale to track's actual parameter range
                const t = range.min + tNorm * tRange;

                // Get track frame at this position
                // Track waypoints are pre-scaled, so positions are already in world coordinates
                const trackPos = track.getPoint(t);
                const trackFrame = track.getFrame(t);

                // Apply barrel roll: rotate normal and binormal around tangent
                // N' = N*cos(θ) + B*sin(θ)
                // B' = -N*sin(θ) + B*cos(θ)
                const rolledNormal = {
                    x: trackFrame.normal.x * cosBarrel + trackFrame.binormal.x * sinBarrel,
                    y: trackFrame.normal.y * cosBarrel + trackFrame.binormal.y * sinBarrel,
                    z: trackFrame.normal.z * cosBarrel + trackFrame.binormal.z * sinBarrel
                };
                const rolledBinormal = {
                    x: -trackFrame.normal.x * sinBarrel + trackFrame.binormal.x * cosBarrel,
                    y: -trackFrame.normal.y * sinBarrel + trackFrame.binormal.y * cosBarrel,
                    z: -trackFrame.normal.z * sinBarrel + trackFrame.binormal.z * cosBarrel
                };
                const rolledFrame = {
                    tangent: trackFrame.tangent,
                    normal: rolledNormal,
                    binormal: rolledBinormal
                };

                // Calculate sine modulation offset
                // sineAngle based on piece index, not track position
                const sineAngle = (baseT * this.sineFrequency * 2 * Math.PI);
                const sineValue = Math.sin(sineAngle);

                // Apply sine offset in rolled track frame (normal, binormal, tangent)
                const offsetX = this.sineAmplitudeX * sineValue; // Normal direction
                const offsetY = this.sineAmplitudeY * sineValue; // Binormal direction
                const offsetZ = this.sineAmplitudeZ * sineValue; // Tangent direction

                // Transform offset from track-local to world coordinates using rolled frame
                const worldOffset = {
                    x: rolledNormal.x * offsetX + rolledBinormal.x * offsetY + trackFrame.tangent.x * offsetZ,
                    y: rolledNormal.y * offsetX + rolledBinormal.y * offsetY + trackFrame.tangent.y * offsetZ,
                    z: rolledNormal.z * offsetX + rolledBinormal.z * offsetY + trackFrame.tangent.z * offsetZ
                };

                // Final position
                const pos = {
                    x: trackPos.x + worldOffset.x,
                    y: trackPos.y + worldOffset.y,
                    z: trackPos.z + worldOffset.z
                };

                // Calculate spin rotation per piece
                const spinAngle = i * this.spin;

                // Create a short tube segment (piece) at this position with rolled frame
                // Pass distribute scale to size the pieces (not the positions)
                const pieceScale = this._getScale();
                this._generatePiece(pos, rolledFrame, spinAngle, i, pieceScale);
            }

            // Distribute mode: pieces are in world space on track, no COM centering ("release gravity")
            this._centerOfMass = { x: 0, y: 0, z: 0 };
            this.updateRotation();

            // Generate bounding box if enabled
            if (this.showBoundingBox) {
                this.generateBoundingBox();
            }

            return this.container;
        }

        /**
         * Generate a single piece (short tube segment) at the given position
         * @param {number} scale - Optional scale multiplier for piece size (default 1)
         */
        _generatePiece(pos, frame, spinAngle, pieceIndex, scale = 1) {
            const lengthScale = this.length / 100;
            const spacingScale = (this.spacing ?? 100) / 100;
            // Scale affects radial size of the tube
            const scaledRadius = this.radius * scale;
            // pieceLength is based on unscaled radius for proportional sizing
            const pieceLength = this.radius * 2 * lengthScale * spacingScale * scale;

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

                // Points on circle in local frame (using scaled radius)
                const cos1 = Math.cos(angle1) * scaledRadius;
                const sin1 = Math.sin(angle1) * scaledRadius;

                // Transform to world coordinates
                const x = pos.x + frame.normal.x * cos1 + frame.binormal.x * sin1;
                const y = pos.y + frame.normal.y * cos1 + frame.binormal.y * sin1;
                const z = pos.z + frame.normal.z * cos1 + frame.binormal.z * sin1;

                // Face angle (pointing outward from tube center)
                const faceAngle = (angle1 + angle2) / 2;
                const faceDeg = faceAngle * 180 / Math.PI;

                // Face width: base from slider, scaled uniformly with piece
                const { width: baseFaceWidth, scaleX } = this._getFaceWidth();
                const faceWidth = baseFaceWidth * scale;
                const faceHeight = pieceLength;

                const face = document.createElement('div');
                face.className = 'curve-face';

                const color = (pieceIndex + j) % 2 === 0 ? this.color : this.colorSecondary;

                // Store face reference with dimensions for haze and transitions
                this._faces.push({ el: face, x, y, z, width: faceWidth, height: faceHeight, _softnessBlur: this.softness / 20 });

                // Build transform with spin and scaleX for hairline effect
                const transform = `translate3d(${x}px, ${y}px, ${z}px)
                                   rotateY(${euler.y}deg)
                                   rotateX(${euler.x}deg)
                                   rotateZ(${euler.z + faceDeg + spinAngle}deg)
                                   translateX(-50%) translateY(-50%)
                                   scaleX(${scaleX})`;

                const effects = this._getEffectStyles(faceWidth, faceHeight);

                if (this.wireframe) {
                    // Line thickness controlled by borderWidth, compensate for scaleX
                    const compensatedBorder = this.borderWidth / scaleX;
                    const borderStyle = this.loopBorder
                        ? `border: ${compensatedBorder}px solid ${color};`
                        : `border-left: ${compensatedBorder}px solid ${color}; border-right: ${compensatedBorder}px solid ${color};`;
                    face.style.cssText = `
                        position: absolute;
                        width: ${faceWidth}px;
                        height: ${faceHeight}px;
                        background: transparent;
                        ${borderStyle}
                        transform-style: preserve-3d;
                        backface-visibility: visible;
                        transform: ${transform};
                        ${effects}
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
                        ${effects}
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
                    // Use unified length parameter (as base) scaled by crystal.petalLength
                    // this.length is 0-200%, c.petalLength is the base size
                    const baseLength = c.petalLength * (this.length / 100);
                    const petalLength = baseLength * lengthMod * breatheMod;
                    // Width: use fixed base (20px), independent of radius
                    // FaceW slider controls scaleX for visual thinning
                    const { width: petalWidth } = this._getFaceWidth();

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

            // Generate bounding box if enabled
            if (this.showBoundingBox) {
                this.generateBoundingBox();
            }

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
            const scaleX = this._getFaceScaleX();

            // Store face reference with dimensions for haze and transitions
            this._faces.push({ el: face, x: pos.x, y: pos.y, z: pos.z, width, height: length, _softnessBlur: this.softness / 20 });

            // Build transform with scaleX for hairline effect
            // scaleY for petals because width is already the thin dimension
            // and height (length) is the long dimension - we want to thin the width
            const transform = `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px)
                               rotateZ(${radialAngle}deg)
                               rotateX(${pitchAngle}deg)
                               rotateY(${twist}deg)
                               translateX(-50%) translateY(-50%)
                               scale(${scaleX}, 1)`;

            const effects = this._getEffectStyles(width, length);

            if (this.wireframe) {
                // Line thickness controlled by borderWidth, compensate for scaleX
                const compensatedBorder = this.borderWidth / scaleX;
                const borderStyle = this.loopBorder
                    ? `border: ${compensatedBorder}px solid ${color};`
                    : `border-left: ${compensatedBorder}px solid ${color}; border-right: ${compensatedBorder}px solid ${color};`;
                face.style.cssText = `
                    position: absolute;
                    width: ${width}px;
                    height: ${length}px;
                    background: transparent;
                    ${borderStyle}
                    transform-style: preserve-3d;
                    backface-visibility: visible;
                    transform: ${transform};
                    ${effects}
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
                    ${effects}
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

            const breatheMod = this._getBreatheMod();

            // Use StageMorph if available
            if (this._morph) {
                this._morph.updateBreathing(breatheMod);
                return;
            }

            // Legacy breathing
            this._faces.forEach((f, i) => {
                if (f.el) {
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
         * @param {Function} onComplete - Callback when transition finishes
         */
        startTransition(newMode, duration = 500, easing = 'easeInOut', onComplete = null) {
            // Use StageMorph if available
            if (this._morph) {
                const params = this._getStageParams();
                const context = this._getStageContext();

                this._morph.transitionTo(newMode, params, context, {
                    duration,
                    easing,
                    onComplete: () => {
                        this.mode = newMode;
                        this._centerOfMass = this._computeCenterOfMassFromMorph();
                        this.updateRotation();
                        if (onComplete) onComplete();
                    }
                });

                this._isTransitioning = true;
                this._transitionToMode = newMode;
                return;
            }

            // Legacy transition
            this._fromPositions = this._capturePositions();
            this._transitionDuration = duration;
            this._transitionEasing = easing;
            this._transitionStart = performance.now();
            this._isTransitioning = true;
            this._transitionToMode = newMode;
            this._onTransitionComplete = onComplete;

            // Handle coordinate system change between modes
            // Crystal mode: positions are COM-centered, container has translate(-COM)
            // Distribute mode: positions are world-space, container has identity transform
            const goingToDistribute = newMode === 'distribute';
            const comingFromDistribute = this.mode === 'distribute';

            if (goingToDistribute && !comingFromDistribute) {
                // Transform from-positions from COM-centered to world-space
                const com = this._centerOfMass;
                this._fromPositions = this._fromPositions.map(p => ({
                    ...p,
                    x: p.x + com.x,
                    y: p.y + com.y,
                    z: p.z + com.z
                }));
                // Release gravity: reset container transform
                this._centerOfMass = { x: 0, y: 0, z: 0 };
                this.updateRotation();
            }

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
                // Match dimensions used in _generatePiece (with scale applied uniformly)
                const pieceScale = this._getScale();
                const scaledRadius = this.radius * pieceScale;
                const lengthScale = this.length / 100;
                const pieceLength = this.radius * 2 * lengthScale * pieceScale;
                const { width: baseFaceWidth } = this._getFaceWidth();
                const faceWidth = baseFaceWidth * pieceScale;

                // Get track parameter range
                const range = track.getParameterRange();
                const tRange = range.max - range.min;

                // Barrel roll angle (rotateY in bound mode)
                const barrelRollRad = (this.rotateY || 0) * Math.PI / 180;
                const cosBarrel = Math.cos(barrelRollRad);
                const sinBarrel = Math.sin(barrelRollRad);

                // rotateX adds to phase in bound mode
                const rotateXPhase = (this.rotateX ?? 0) / 360;

                // Spread: 0 = all stacked at center, 100 = evenly distributed
                const spreadFactor = (this.spread ?? 100) / 100;

                for (let i = 0; i < this.pieceCount; i++) {
                    const baseT = (i / this.pieceCount) * spreadFactor;
                    const phaseOffset = this.phase / 360 + rotateXPhase;
                    let tNorm = (baseT + phaseOffset) % 1;
                    if (tNorm < 0) tNorm += 1;

                    // Scale to track's actual parameter range
                    const t = range.min + tNorm * tRange;

                    // Get track frame at this position
                    // Track waypoints are pre-scaled, so positions are already in world coordinates
                    const trackPos = track.getPoint(t);
                    const trackFrame = track.getFrame(t);

                    // Apply barrel roll to frame
                    const rolledNormal = {
                        x: trackFrame.normal.x * cosBarrel + trackFrame.binormal.x * sinBarrel,
                        y: trackFrame.normal.y * cosBarrel + trackFrame.binormal.y * sinBarrel,
                        z: trackFrame.normal.z * cosBarrel + trackFrame.binormal.z * sinBarrel
                    };
                    const rolledBinormal = {
                        x: -trackFrame.normal.x * sinBarrel + trackFrame.binormal.x * cosBarrel,
                        y: -trackFrame.normal.y * sinBarrel + trackFrame.binormal.y * cosBarrel,
                        z: -trackFrame.normal.z * sinBarrel + trackFrame.binormal.z * cosBarrel
                    };

                    const sineAngle = baseT * this.sineFrequency * 2 * Math.PI;
                    const sineValue = Math.sin(sineAngle);

                    const offsetX = this.sineAmplitudeX * sineValue;
                    const offsetY = this.sineAmplitudeY * sineValue;
                    const offsetZ = this.sineAmplitudeZ * sineValue;

                    // Use rolled frame for offset calculation
                    const worldOffset = {
                        x: rolledNormal.x * offsetX + rolledBinormal.x * offsetY + trackFrame.tangent.x * offsetZ,
                        y: rolledNormal.y * offsetX + rolledBinormal.y * offsetY + trackFrame.tangent.y * offsetZ,
                        z: rolledNormal.z * offsetX + rolledBinormal.z * offsetY + trackFrame.tangent.z * offsetZ
                    };

                    positions.push({
                        x: trackPos.x + worldOffset.x,
                        y: trackPos.y + worldOffset.y,
                        z: trackPos.z + worldOffset.z,
                        width: faceWidth,
                        height: pieceLength,
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

            // Use StageMorph if available
            if (this._morph) {
                const stillTransitioning = this._morph.update();
                if (!stillTransitioning) {
                    this._isTransitioning = false;
                }
                return stillTransitioning;
            }

            // Legacy transition
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

                const from = this._fromPositions[i] || this._fromPositions[fromLen - 1] || { x: 0, y: 0, z: 0, width: 30, height: 80, opacity: 0 };
                const to = this._toPositions[i] || { x: 0, y: 0, z: 0, width: 30, height: 80, opacity: 0 };

                let fromOpacity = i < fromLen ? 1 : 0;
                let toOpacity = i < toLen ? 1 : 0;

                const x = Curve._lerp(from.x, to.x, t);
                const y = Curve._lerp(from.y, to.y, t);
                const z = Curve._lerp(from.z, to.z, t);
                const width = Curve._lerp(from.width || 30, to.width || 30, t);
                const height = Curve._lerp(from.height || 80, to.height || 80, t);
                const opacity = Curve._lerp(fromOpacity, toOpacity, t);

                face.x = x;
                face.y = y;
                face.z = z;
                face.width = width;
                face.height = height;

                const color = i % 2 === 0 ? this.color : this.colorSecondary;
                const effects = this._getEffectStyles(width, height);

                face.el.style.cssText = `
                    position: absolute;
                    width: ${width}px;
                    height: ${height}px;
                    background: ${this.wireframe ? 'transparent' : color};
                    border: ${this.wireframe ? this.borderWidth + 'px solid ' + color : 'none'};
                    transform-style: preserve-3d;
                    backface-visibility: visible;
                    opacity: ${opacity};
                    transform: translate3d(${x}px, ${y}px, ${z}px) translateX(-50%) translateY(-50%);
                    ${effects}
                `;
            }

            for (let i = maxLen; i < this._faces.length; i++) {
                if (this._faces[i].el) {
                    this._faces[i].el.style.opacity = '0';
                }
            }

            if (rawT >= 1) {
                this._isTransitioning = false;
                this.mode = this._transitionToMode;

                // Trigger a rebuild to generate proper geometry with correct orientations
                // The transition only interpolated positions; now we need full geometry
                if (this._onTransitionComplete) {
                    this._onTransitionComplete();
                }
                return false;
            }

            return true;
        }

        /**
         * Check if currently transitioning
         */
        isTransitioning() {
            if (this._morph) {
                return this._morph.isTransitioning();
            }
            return this._isTransitioning;
        }

        /**
         * Refresh current stage with updated params (no transition)
         * Call when parameters change but mode stays the same
         */
        refresh() {
            if (this._morph) {
                const params = this._getStageParams();
                const context = this._getStageContext();
                this._morph.refresh(params, context);
                this._centerOfMass = this._computeCenterOfMassFromMorph();
                this.updateRotation();
            }
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
            // Cleanup StageMorph if used
            if (this._morph) {
                this._morph.destroy();
                this._morph = null;
            }

            if (this.container?.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            this.container = null;
            this._faces = [];
        }

        // Update effects based on camera rotation (view-space z)
        // opts: { rotX, rotY, rotZ, intensity, rollMode, greenDesat, blur }
        updateHaze(opts) {
            // Use StageMorph if available
            if (this._morph) {
                this._morph.updateHaze(opts);
                return;
            }

            // Legacy haze
            const { rotX, rotY, rotZ, intensity, rollMode, greenDesat = 0, blur = 0 } = opts;

            if (!this._faces.length) return;

            // Get current softness blur value
            const softnessBlur = this.softness / 20; // 0-100 → 0-5px blur

            // Clear haze effects if none are active, but preserve softness blur
            if (intensity <= 0 && greenDesat <= 0 && blur <= 0) {
                this._faces.forEach(f => {
                    f.el.style.opacity = 1;
                    // Preserve softness blur
                    const faceBlur = f._softnessBlur ?? softnessBlur;
                    f.el.style.filter = faceBlur > 0 ? `blur(${faceBlur}px)` : '';
                });
                return;
            }

            const hazeFactor = intensity / 100;

            const rx = rotX * Math.PI / 180;
            const ry = rotY * Math.PI / 180;
            const rz = rotZ * Math.PI / 180;

            const cosX = Math.cos(rx), sinX = Math.sin(rx);
            const cosY = Math.cos(ry), sinY = Math.sin(ry);
            const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

            let zMin = Infinity, zMax = -Infinity;
            const viewZs = [];

            for (const face of this._faces) {
                let viewZ;

                if (rollMode === 'world') {
                    const xz = face.x * cosZ - face.y * sinZ;
                    const yz = face.x * sinZ + face.y * cosZ;
                    const zy = -xz * sinY + face.z * cosY;
                    viewZ = yz * sinX + zy * cosX;
                } else {
                    const z1 = -face.x * sinY + face.z * cosY;
                    viewZ = face.y * sinX + z1 * cosX;
                }

                viewZs.push(viewZ);
                zMin = Math.min(zMin, viewZ);
                zMax = Math.max(zMax, viewZ);
            }

            const zRange = zMax - zMin || 1;

            for (let i = 0; i < this._faces.length; i++) {
                const face = this._faces[i];
                const zNorm = (viewZs[i] - zMin) / zRange;

                // Apply haze opacity
                // Ensure visible effect by using wider opacity range
                if (intensity > 0) {
                    // zNorm 0 = far, 1 = near in view-space
                    // Far faces get lower opacity (more haze)
                    const hazeAmount = 1 - (1 - zNorm) * hazeFactor;
                    face.el.style.opacity = Math.max(0.1, hazeAmount);
                } else {
                    face.el.style.opacity = 1;
                }

                // Build filter string with multiple effects
                const filters = [];

                // Always include softness blur first (from face or instance)
                const faceBlur = face._softnessBlur ?? softnessBlur;
                if (faceBlur > 0) {
                    filters.push(`blur(${faceBlur}px)`);
                }

                // Green desaturation
                if (greenDesat > 0) {
                    const color = face.el.style.backgroundColor || face.el.style.borderColor || '';
                    const isGreen = this._isGreenish(color);
                    if (isGreen) {
                        const desatAmount = (greenDesat / 100) * (1 - zNorm * 0.5);
                        filters.push(`saturate(${1 - desatAmount})`);
                    }
                }

                // Depth-based blur (farther = more blur) - adds to softness blur
                if (blur > 0) {
                    const depthBlurAmount = (1 - zNorm) * (blur / 100) * 4; // max 4px blur
                    if (depthBlurAmount > 0.1) {
                        // Note: Multiple blur() filters stack, which is the desired effect
                        filters.push(`blur(${depthBlurAmount.toFixed(1)}px)`);
                    }
                }

                face.el.style.filter = filters.length > 0 ? filters.join(' ') : '';
            }
        }

        /**
         * Check if a CSS color string is greenish (hue 80-160)
         */
        _isGreenish(colorStr) {
            if (!colorStr) return false;

            // Parse hex color
            let r, g, b;
            if (colorStr.startsWith('#')) {
                const hex = colorStr.slice(1);
                if (hex.length === 3) {
                    r = parseInt(hex[0] + hex[0], 16);
                    g = parseInt(hex[1] + hex[1], 16);
                    b = parseInt(hex[2] + hex[2], 16);
                } else if (hex.length === 6) {
                    r = parseInt(hex.slice(0, 2), 16);
                    g = parseInt(hex.slice(2, 4), 16);
                    b = parseInt(hex.slice(4, 6), 16);
                } else {
                    return false;
                }
            } else if (colorStr.startsWith('rgb')) {
                const match = colorStr.match(/(\d+),\s*(\d+),\s*(\d+)/);
                if (!match) return false;
                r = parseInt(match[1]);
                g = parseInt(match[2]);
                b = parseInt(match[3]);
            } else {
                return false;
            }

            // Convert to HSL to check hue
            r /= 255; g /= 255; b /= 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            const l = (max + min) / 2;

            if (max === min) return false; // achromatic

            const d = max - min;
            let h;
            if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            else if (max === g) h = ((b - r) / d + 2) / 6;
            else h = ((r - g) / d + 4) / 6;

            const hue = h * 360;
            // Green hues are roughly 80-160 degrees
            return hue >= 80 && hue <= 160;
        }

        /**
         * Compute the axis-aligned bounding box from face positions
         * @returns {{ min: {x,y,z}, max: {x,y,z}, center: {x,y,z}, size: {x,y,z} }}
         */
        computeBoundingBox() {
            if (!this._faces.length) {
                return {
                    min: { x: 0, y: 0, z: 0 },
                    max: { x: 0, y: 0, z: 0 },
                    center: { x: 0, y: 0, z: 0 },
                    size: { x: 0, y: 0, z: 0 }
                };
            }

            let minX = Infinity, minY = Infinity, minZ = Infinity;
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

            for (const face of this._faces) {
                const x = face.x || 0;
                const y = face.y || 0;
                const z = face.z || 0;

                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                minZ = Math.min(minZ, z);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
                maxZ = Math.max(maxZ, z);
            }

            this._boundingBox = {
                min: { x: minX, y: minY, z: minZ },
                max: { x: maxX, y: maxY, z: maxZ },
                center: {
                    x: (minX + maxX) / 2,
                    y: (minY + maxY) / 2,
                    z: (minZ + maxZ) / 2
                },
                size: {
                    x: maxX - minX,
                    y: maxY - minY,
                    z: maxZ - minZ
                }
            };

            return this._boundingBox;
        }

        /**
         * Get the current bounding box (compute if not cached)
         */
        getBoundingBox() {
            if (!this._boundingBox) {
                this.computeBoundingBox();
            }
            return this._boundingBox;
        }

        /**
         * Generate a wireframe 3D bounding box
         * Creates 12 edges using CSS-transformed divs
         */
        generateBoundingBox() {
            // Remove existing bounding box
            if (this._boundingBoxContainer?.parentNode) {
                this._boundingBoxContainer.parentNode.removeChild(this._boundingBoxContainer);
            }

            const bbox = this.computeBoundingBox();
            const { min, max, size } = bbox;

            // Create container for bounding box edges
            this._boundingBoxContainer = document.createElement('div');
            this._boundingBoxContainer.className = 'bounding-box';
            this._boundingBoxContainer.style.cssText = 'position:absolute;transform-style:preserve-3d;';

            const color = this.boundingBoxColor;
            const opacity = this.boundingBoxOpacity;
            const lineWidth = 1;

            // 8 corners of the box
            const corners = [
                { x: min.x, y: min.y, z: min.z }, // 0: front-bottom-left
                { x: max.x, y: min.y, z: min.z }, // 1: front-bottom-right
                { x: max.x, y: max.y, z: min.z }, // 2: front-top-right
                { x: min.x, y: max.y, z: min.z }, // 3: front-top-left
                { x: min.x, y: min.y, z: max.z }, // 4: back-bottom-left
                { x: max.x, y: min.y, z: max.z }, // 5: back-bottom-right
                { x: max.x, y: max.y, z: max.z }, // 6: back-top-right
                { x: min.x, y: max.y, z: max.z }  // 7: back-top-left
            ];

            // 12 edges connecting the corners
            const edges = [
                // Front face (z = min)
                [0, 1], [1, 2], [2, 3], [3, 0],
                // Back face (z = max)
                [4, 5], [5, 6], [6, 7], [7, 4],
                // Connecting edges (front to back)
                [0, 4], [1, 5], [2, 6], [3, 7]
            ];

            for (const [i1, i2] of edges) {
                const p1 = corners[i1];
                const p2 = corners[i2];

                // Calculate edge properties
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dz = p2.z - p1.z;
                const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (length < 0.001) continue; // Skip zero-length edges

                // Midpoint for positioning
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                const midZ = (p1.z + p2.z) / 2;

                // Calculate rotation angles to orient the edge
                // rotateY: rotation around Y axis (yaw) - from XZ plane
                // rotateX: rotation around X axis (pitch) - from XY plane
                const rotY = Math.atan2(dx, dz) * (180 / Math.PI);
                const rotX = -Math.asin(dy / length) * (180 / Math.PI);

                const edge = document.createElement('div');
                edge.className = 'bbox-edge';
                edge.style.cssText = `
                    position: absolute;
                    width: ${lineWidth}px;
                    height: ${length}px;
                    background: ${color};
                    opacity: ${opacity};
                    transform-style: preserve-3d;
                    transform-origin: center center;
                    transform: translate3d(${midX}px, ${midY}px, ${midZ}px)
                               rotateY(${rotY}deg)
                               rotateX(${rotX + 90}deg)
                               translateX(-50%);
                `;

                this._boundingBoxContainer.appendChild(edge);
            }

            // Add the bounding box to the curve's container so it inherits rotation
            if (this.container) {
                this.container.appendChild(this._boundingBoxContainer);
            }

            return this._boundingBoxContainer;
        }

        /**
         * Toggle bounding box visibility
         */
        setBoundingBoxVisible(visible) {
            this.showBoundingBox = visible;
            if (visible) {
                this.generateBoundingBox();
            } else if (this._boundingBoxContainer?.parentNode) {
                this._boundingBoxContainer.parentNode.removeChild(this._boundingBoxContainer);
                this._boundingBoxContainer = null;
            }
        }

        /**
         * Update bounding box (call after regenerating curve)
         */
        updateBoundingBox() {
            if (this.showBoundingBox) {
                this.generateBoundingBox();
            }
        }

        getStats() {
            // Use StageMorph stats if available
            if (this._morph) {
                const morphStats = this._morph.getStats();
                return {
                    divCount: 1 + morphStats.poolTotal,
                    faceCount: morphStats.faces,
                    poolTotal: morphStats.poolTotal,
                    poolActive: morphStats.poolActive,
                    currentStage: morphStats.currentStage,
                    isTransitioning: morphStats.isTransitioning
                };
            }

            // Legacy stats
            const rings = this.curveSegments + 1;
            const facesPerRing = this.radialSegments;
            const faceCount = rings * facesPerRing;
            const divCount = 1 + rings + faceCount;
            return { divCount, faceCount };
        }
    }

    APP.Curve = Curve;

})(window.APP);
