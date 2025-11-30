/**
 * DivGraphics - StageDefinition
 * Encapsulates position/transform calculation for each curve stage (bezier, distribute, crystal)
 * Pure data class - no DOM creation
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * FaceData - Position and visual properties for a single face
     */
    class FaceData {
        constructor() {
            this.x = 0;
            this.y = 0;
            this.z = 0;
            this.width = 30;
            this.height = 80;
            this.rotateX = 0;
            this.rotateY = 0;
            this.rotateZ = 0;
            this.opacity = 1;
            this.colorIndex = 0;
        }

        copyFrom(other) {
            this.x = other.x || 0;
            this.y = other.y || 0;
            this.z = other.z || 0;
            this.width = other.width || 30;
            this.height = other.height || 80;
            this.rotateX = other.rotateX || 0;
            this.rotateY = other.rotateY || 0;
            this.rotateZ = other.rotateZ || 0;
            this.opacity = other.opacity ?? 1;
            this.colorIndex = other.colorIndex || 0;
            return this;
        }

        lerp(from, to, t) {
            this.x = from.x + (to.x - from.x) * t;
            this.y = from.y + (to.y - from.y) * t;
            this.z = from.z + (to.z - from.z) * t;
            this.width = from.width + (to.width - from.width) * t;
            this.height = from.height + (to.height - from.height) * t;
            this.rotateX = from.rotateX + (to.rotateX - from.rotateX) * t;
            this.rotateY = from.rotateY + (to.rotateY - from.rotateY) * t;
            this.rotateZ = from.rotateZ + (to.rotateZ - from.rotateZ) * t;
            this.opacity = from.opacity + (to.opacity - from.opacity) * t;
            this.colorIndex = from.colorIndex; // Don't interpolate color index
            return this;
        }
    }

    /**
     * StageDefinition - Abstract base for stage position calculators
     */
    class StageDefinition {
        constructor(name) {
            this.name = name;
        }

        /**
         * Calculate all face positions for this stage
         * @param {Object} params - Stage parameters from curve/state
         * @param {Object} context - Shared context (track, timing, etc.)
         * @returns {FaceData[]} Array of face data
         */
        calculate(params, context) {
            throw new Error('StageDefinition.calculate() must be implemented');
        }

        /**
         * Get the expected face count for this stage
         */
        getFaceCount(params) {
            throw new Error('StageDefinition.getFaceCount() must be implemented');
        }
    }

    /**
     * BezierStage - Faces distributed along bezier curve
     */
    class BezierStage extends StageDefinition {
        constructor() {
            super('bezier');
        }

        getFaceCount(params) {
            return (params.curveSegments + 1) * params.radialSegments;
        }

        calculate(params, context) {
            const faces = [];
            const { points, curveSegments, radialSegments, radius } = params;

            for (let i = 0; i <= curveSegments; i++) {
                const t = i / curveSegments;
                const pos = this._getPoint(t, points);
                const frame = this._getFrame(t, points);
                const euler = this._matrixToEuler(frame);

                for (let j = 0; j < radialSegments; j++) {
                    const angle = (j / radialSegments) * Math.PI * 2;
                    const cos1 = Math.cos(angle) * radius;
                    const sin1 = Math.sin(angle) * radius;

                    const face = new FaceData();
                    face.x = pos.x + frame.normal.x * cos1 + frame.binormal.x * sin1;
                    face.y = pos.y + frame.normal.y * cos1 + frame.binormal.y * sin1;
                    face.z = pos.z + frame.normal.z * cos1 + frame.binormal.z * sin1;

                    const faceAngle = (j + 0.5) / radialSegments * Math.PI * 2;
                    face.rotateX = euler.x;
                    face.rotateY = euler.y;
                    face.rotateZ = euler.z + faceAngle * 180 / Math.PI;

                    face.width = 2 * radius * Math.sin(Math.PI / radialSegments);
                    face.height = this._getCurveLength(points) / curveSegments;
                    face.colorIndex = (i + j) % 2;

                    faces.push(face);
                }
            }

            return faces;
        }

        _getPoint(t, points) {
            if (points.length === 3) {
                return this._quadraticBezier(t, points[0], points[1], points[2]);
            } else if (points.length === 4) {
                return this._cubicBezier(t, points[0], points[1], points[2], points[3]);
            }
            return points[0];
        }

        _quadraticBezier(t, p0, p1, p2) {
            const mt = 1 - t;
            return {
                x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
                y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
                z: mt * mt * p0.z + 2 * mt * t * p1.z + t * t * p2.z
            };
        }

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

        _getFrame(t, points) {
            const delta = 0.001;
            const p1 = this._getPoint(Math.max(0, t - delta), points);
            const p2 = this._getPoint(Math.min(1, t + delta), points);

            const dx = p2.x - p1.x, dy = p2.y - p1.y, dz = p2.z - p1.z;
            const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
            const tangent = { x: dx / len, y: dy / len, z: dz / len };

            // Use consistent up vector based on curve start direction
            // to avoid frame flipping mid-curve
            const startTangent = this._getStartTangent(points);
            let up;
            if (Math.abs(startTangent.y) > 0.9) {
                up = { x: 0, y: 0, z: 1 }; // Use Z-up if curve starts vertical
            } else {
                up = { x: 0, y: 1, z: 0 }; // Use Y-up otherwise
            }

            let binormal = this._cross(tangent, up);
            const binormalLen = Math.sqrt(binormal.x * binormal.x + binormal.y * binormal.y + binormal.z * binormal.z);

            // If tangent is parallel to up, use alternative
            if (binormalLen < 0.01) {
                up = { x: 1, y: 0, z: 0 };
                binormal = this._cross(tangent, up);
            }

            this._normalize(binormal);
            const normal = this._cross(binormal, tangent);

            return { tangent, normal, binormal };
        }

        _getStartTangent(points) {
            const p1 = this._getPoint(0, points);
            const p2 = this._getPoint(0.01, points);
            const dx = p2.x - p1.x, dy = p2.y - p1.y, dz = p2.z - p1.z;
            const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
            return { x: dx / len, y: dy / len, z: dz / len };
        }

        _cross(a, b) {
            return {
                x: a.y * b.z - a.z * b.y,
                y: a.z * b.x - a.x * b.z,
                z: a.x * b.y - a.y * b.x
            };
        }

        _normalize(v) {
            const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
            v.x /= len; v.y /= len; v.z /= len;
        }

        _matrixToEuler(frame) {
            const { tangent, normal, binormal } = frame;
            const m13 = tangent.x, m23 = tangent.y, m33 = tangent.z;
            const m21 = normal.y, m22 = binormal.y;

            return {
                x: Math.atan2(-m23, Math.sqrt(m21 * m21 + m22 * m22)) * 180 / Math.PI,
                y: Math.atan2(m13, m33) * 180 / Math.PI,
                z: Math.atan2(m21, m22) * 180 / Math.PI
            };
        }

        _getCurveLength(points) {
            let length = 0;
            let prev = this._getPoint(0, points);
            for (let i = 1; i <= 20; i++) {
                const curr = this._getPoint(i / 20, points);
                length += Math.sqrt(
                    (curr.x - prev.x) ** 2 +
                    (curr.y - prev.y) ** 2 +
                    (curr.z - prev.z) ** 2
                );
                prev = curr;
            }
            return length;
        }
    }

    /**
     * DistributeStage - Pieces distributed along track with sine modulation
     *
     * Spread parameter (0-100):
     *   0 = all pieces stacked at center of track
     *   100 = pieces evenly distributed around track
     *
     * Natural position is on the track through-line.
     * Sine modulation deviates pieces from the through-line.
     */
    class DistributeStage extends StageDefinition {
        constructor() {
            super('distribute');
        }

        getFaceCount(params) {
            return params.pieceCount * params.radialSegments;
        }

        calculate(params, context) {
            const faces = [];
            const { pieceCount, phase, spin, radius, radialSegments } = params;
            const { sineAmplitudeX, sineAmplitudeY, sineAmplitudeZ, sineFrequency } = params;
            const spread = params.spread ?? 100; // Default to fully spread
            const track = context.track;

            if (!track) return faces;

            // Use Morph utility if available, otherwise inline calculation
            const Morph = APP.Morph;

            for (let i = 0; i < pieceCount; i++) {
                // Calculate base t position using spread
                // spread=0: all at center (t=0.5)
                // spread=100: evenly distributed (t = i/pieceCount)
                let baseT;
                if (Morph) {
                    baseT = Morph.spreadPosition(i, pieceCount, spread, { center: 0.5, wrap: true });
                } else {
                    // Inline fallback
                    const spreadFactor = Math.max(0, Math.min(1, spread / 100));
                    const distributedT = i / pieceCount;
                    const center = 0.5;
                    const distFromCenter = distributedT - center;
                    baseT = center + distFromCenter * spreadFactor;
                    if (baseT < 0) baseT += 1;
                    if (baseT >= 1) baseT -= 1;
                }

                // Apply phase offset
                const phaseOffset = phase / 360;
                let t = (baseT + phaseOffset) % 1;
                if (t < 0) t += 1;

                // Get position on track through-line
                // Track waypoints are pre-scaled, so positions are already in world coordinates
                const trackPos = track.getPoint(t);
                const trackFrame = track.getFrame(t);

                // Sine modulation - deviates from through-line
                // Use original distributed position for sine phase (not spread-adjusted)
                // This keeps sine wave consistent regardless of spread
                const sineBaseT = i / pieceCount;
                const sineAngle = sineBaseT * sineFrequency * Math.PI * 2;
                const sineValue = Math.sin(sineAngle);

                // Offsets in track-local frame (normal, binormal, tangent)
                const offsetX = sineAmplitudeX * sineValue; // Normal direction
                const offsetY = sineAmplitudeY * sineValue; // Binormal direction
                const offsetZ = sineAmplitudeZ * sineValue; // Tangent direction

                // Transform to world coordinates
                const worldOffset = {
                    x: trackFrame.normal.x * offsetX + trackFrame.binormal.x * offsetY + trackFrame.tangent.x * offsetZ,
                    y: trackFrame.normal.y * offsetX + trackFrame.binormal.y * offsetY + trackFrame.tangent.y * offsetZ,
                    z: trackFrame.normal.z * offsetX + trackFrame.binormal.z * offsetY + trackFrame.tangent.z * offsetZ
                };

                // Final position = through-line + sine deviation
                const pos = {
                    x: trackPos.x + worldOffset.x,
                    y: trackPos.y + worldOffset.y,
                    z: trackPos.z + worldOffset.z
                };

                const spinAngle = i * spin;
                const euler = this._matrixToEuler(trackFrame);

                // Generate faces around this piece
                for (let j = 0; j < radialSegments; j++) {
                    const angle = (j / radialSegments) * Math.PI * 2;
                    const cos1 = Math.cos(angle) * radius;
                    const sin1 = Math.sin(angle) * radius;

                    const face = new FaceData();
                    face.x = pos.x + trackFrame.normal.x * cos1 + trackFrame.binormal.x * sin1;
                    face.y = pos.y + trackFrame.normal.y * cos1 + trackFrame.binormal.y * sin1;
                    face.z = pos.z + trackFrame.normal.z * cos1 + trackFrame.binormal.z * sin1;

                    const faceAngle = (j + 0.5) / radialSegments * Math.PI * 2;
                    face.rotateX = euler.x;
                    face.rotateY = euler.y;
                    face.rotateZ = euler.z + faceAngle * 180 / Math.PI + spinAngle;

                    face.width = 2 * radius * Math.sin(Math.PI / radialSegments);
                    face.height = radius * 2;
                    face.colorIndex = (i + j) % 2;

                    faces.push(face);
                }
            }

            return faces;
        }

        _matrixToEuler(frame) {
            const { tangent, normal, binormal } = frame;
            const m13 = tangent.x, m23 = tangent.y, m33 = tangent.z;
            const m21 = normal.y, m22 = binormal.y;

            return {
                x: Math.atan2(-m23, Math.sqrt(m21 * m21 + m22 * m22)) * 180 / Math.PI,
                y: Math.atan2(m13, m33) * 180 / Math.PI,
                z: Math.atan2(m21, m22) * 180 / Math.PI
            };
        }
    }

    /**
     * CrystalStage - Petals in flower pattern radiating from center
     */
    class CrystalStage extends StageDefinition {
        constructor() {
            super('crystal');
        }

        getFaceCount(params) {
            return params.pieceCount * params.crystal.layers;
        }

        calculate(params, context) {
            const faces = [];
            const { pieceCount, phase, spin, crystal } = params;
            const { sineAmplitudeX, sineAmplitudeY, sineAmplitudeZ, sineFrequency } = params;
            const breatheMod = context.breatheMod || 1;
            const scale = Math.max(0.01, (crystal.scale || 100) / 100);

            const petalsPerLayer = pieceCount;
            const totalPetals = petalsPerLayer * crystal.layers;

            // First pass: calculate positions and center of mass
            const petalData = [];
            let com = { x: 0, y: 0, z: 0 };

            for (let layer = 0; layer < crystal.layers; layer++) {
                const layerAngle = (layer / crystal.layers) * crystal.spread * (Math.PI / 180);
                const layerCos = Math.cos(layerAngle);
                const layerSin = Math.sin(layerAngle);

                for (let p = 0; p < petalsPerLayer; p++) {
                    const petalIndex = layer * petalsPerLayer + p;
                    const baseAngle = (p / petalsPerLayer) * Math.PI * 2;
                    const phaseRad = phase * (Math.PI / 180);
                    const angle = baseAngle + phaseRad;

                    const sineAngle = (p / petalsPerLayer) * sineFrequency * Math.PI * 2;
                    const sineValue = Math.sin(sineAngle);

                    const lengthMod = 1 + (sineAmplitudeZ / 100) * sineValue;
                    const widthMod = 1 + (sineAmplitudeX / 100) * sineValue;
                    const petalLength = crystal.petalLength * lengthMod * breatheMod;
                    const petalWidth = crystal.petalWidth * widthMod * breatheMod;

                    const bloomRad = (crystal.bloom / 100) * (Math.PI / 2);

                    const dirX = Math.cos(angle);
                    const dirY = Math.sin(angle);
                    const rotatedDirY = dirY * layerCos;
                    const rotatedDirZ = dirY * layerSin;
                    const dir = { x: dirX, y: rotatedDirY, z: rotatedDirZ };

                    const perpOffset = sineAmplitudeY * sineValue;
                    const perpX = -rotatedDirY;
                    const perpY = dirX * layerCos;
                    const perpZ = dirX * layerSin;

                    const centerDist = petalLength / 2;
                    const tiltAngle = bloomRad;
                    const pos = {
                        x: dir.x * centerDist * Math.cos(tiltAngle) + perpX * perpOffset,
                        y: dir.y * centerDist * Math.cos(tiltAngle) + perpY * perpOffset,
                        z: dir.z * centerDist * Math.cos(tiltAngle) + petalLength * 0.5 * Math.sin(tiltAngle) + perpZ * perpOffset
                    };

                    com.x += pos.x;
                    com.y += pos.y;
                    com.z += pos.z;

                    petalData.push({
                        pos, dir, petalLength, petalWidth, bloomRad,
                        convFactor: crystal.convergence / 100,
                        twist: (petalIndex * spin) + crystal.twist * (petalIndex / totalPetals),
                        colorIndex: petalIndex % 2
                    });
                }
            }

            // Calculate center of mass
            if (petalData.length > 0) {
                com.x /= petalData.length;
                com.y /= petalData.length;
                com.z /= petalData.length;
            }

            // Second pass: create faces centered and scaled
            for (const petal of petalData) {
                const face = new FaceData();

                face.x = (petal.pos.x - com.x) * scale;
                face.y = (petal.pos.y - com.y) * scale;
                face.z = (petal.pos.z - com.z) * scale;

                const radialAngle = Math.atan2(petal.dir.y, petal.dir.x) * (180 / Math.PI);
                const pitchAngle = (1 - petal.convFactor) * 90 - petal.bloomRad * (180 / Math.PI);

                face.rotateX = pitchAngle;
                face.rotateY = petal.twist;
                face.rotateZ = radialAngle;

                face.width = petal.petalWidth * scale;
                face.height = petal.petalLength * scale;
                face.colorIndex = petal.colorIndex;

                faces.push(face);
            }

            return faces;
        }
    }

    /**
     * StageRegistry - Manages available stage definitions
     */
    class StageRegistry {
        constructor() {
            this._stages = new Map();
        }

        register(stage) {
            this._stages.set(stage.name, stage);
        }

        get(name) {
            return this._stages.get(name);
        }

        has(name) {
            return this._stages.has(name);
        }

        list() {
            return Array.from(this._stages.keys());
        }
    }

    // Create and populate default registry
    const registry = new StageRegistry();
    registry.register(new BezierStage());
    registry.register(new DistributeStage());
    registry.register(new CrystalStage());

    // Export
    APP.FaceData = FaceData;
    APP.StageDefinition = StageDefinition;
    APP.BezierStage = BezierStage;
    APP.DistributeStage = DistributeStage;
    APP.CrystalStage = CrystalStage;
    APP.StageRegistry = registry;

})(window.APP);
