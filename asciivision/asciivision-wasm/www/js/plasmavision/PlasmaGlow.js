/**
 * PlasmaGlow - Line glow influenced by gravitational plasma masses
 *
 * Concept:
 * - Each 3D line segment emits glow perpendicular to its length
 * - Plasma masses attract the glow toward their centers
 * - Creates asymmetric aurora-like effects around wireframes
 */

import { vec3 } from '../shared/math/vec3.js';

// Re-export vec3 for convenience
export { vec3 };

/**
 * PlasmaMass - A gravitational attractor for glow
 */
export class PlasmaMass {
    constructor(options = {}) {
        this.position = options.position || vec3.create(0, 0, 0);
        this.mass = options.mass ?? 1.0;           // Strength of attraction
        this.radius = options.radius ?? 0.5;       // Falloff radius
        this.color = options.color || [1, 0.5, 0]; // Orange plasma
        this.pulse = options.pulse ?? 0;           // Pulsation rate
        this._phase = 0;
    }

    /**
     * Calculate gravitational influence on a point
     * @param {Object} point - {x, y, z} position
     * @returns {Object} { direction: vec3, strength: 0-1 }
     */
    getInfluence(point) {
        const toMass = vec3.sub(this.position, point);
        const distance = vec3.length(toMass);

        if (distance < 0.001) {
            return { direction: vec3.create(0, 1, 0), strength: 1.0 };
        }

        const direction = vec3.normalize(toMass);

        // Inverse square falloff with radius cutoff
        const normalizedDist = distance / this.radius;
        const strength = this.mass / (1 + normalizedDist * normalizedDist);

        // Apply pulse
        const pulseFactor = this.pulse > 0
            ? 1 + Math.sin(this._phase) * 0.3
            : 1;

        return {
            direction,
            strength: Math.min(1, strength * pulseFactor)
        };
    }

    update(dt) {
        if (this.pulse > 0) {
            this._phase += dt * this.pulse * Math.PI * 2;
        }
    }
}

/**
 * PlasmaField - Collection of plasma masses
 */
export class PlasmaField {
    constructor() {
        this.masses = [];
    }

    addMass(mass) {
        this.masses.push(mass);
        return mass;
    }

    removeMass(mass) {
        const idx = this.masses.indexOf(mass);
        if (idx >= 0) this.masses.splice(idx, 1);
    }

    /**
     * Get combined gravitational influence at a point
     * @param {Object} point - {x, y, z}
     * @returns {Object} { direction: vec3, strength: 0-1 }
     */
    getInfluence(point) {
        if (this.masses.length === 0) {
            return { direction: vec3.create(0, 0, 0), strength: 0 };
        }

        let totalDir = vec3.create(0, 0, 0);
        let totalStrength = 0;

        for (const mass of this.masses) {
            const influence = mass.getInfluence(point);
            totalDir = vec3.add(totalDir, vec3.scale(influence.direction, influence.strength));
            totalStrength += influence.strength;
        }

        return {
            direction: vec3.normalize(totalDir),
            strength: Math.min(1, totalStrength)
        };
    }

    update(dt) {
        for (const mass of this.masses) {
            mass.update(dt);
        }
    }
}

/**
 * GlowSegment - A 3D line segment with plasma-influenced glow
 */
export class GlowSegment {
    constructor(start, end, options = {}) {
        this.start = start;
        this.end = end;
        this.baseColor = options.color || [0, 1, 0.5];  // Cyan-green
        this.baseGlow = options.glow ?? 1.0;
        this.glowRadius = options.glowRadius ?? 0.1;
    }

    /**
     * Get the line direction (tangent)
     */
    getTangent() {
        return vec3.normalize(vec3.sub(this.end, this.start));
    }

    /**
     * Get perpendicular plane basis vectors (for uniform glow)
     */
    getGlowBasis() {
        const tangent = this.getTangent();

        // Find a non-parallel vector for cross product
        let up = vec3.create(0, 1, 0);
        if (Math.abs(vec3.dot(tangent, up)) > 0.99) {
            up = vec3.create(1, 0, 0);
        }

        const normal = vec3.normalize(vec3.cross(tangent, up));
        const binormal = vec3.cross(tangent, normal);

        return { tangent, normal, binormal };
    }

    /**
     * Sample glow points around the segment with plasma influence
     * @param {PlasmaField} field - Gravitational field
     * @param {number} samples - Points along segment
     * @param {number} radialSamples - Points around segment
     * @returns {Array} Array of { position, color, intensity }
     */
    sampleGlow(field, samples = 10, radialSamples = 8) {
        const points = [];
        const basis = this.getGlowBasis();

        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const linePoint = vec3.lerp(this.start, this.end, t);

            // Get plasma influence at this point on the line
            const influence = field.getInfluence(linePoint);

            for (let j = 0; j < radialSamples; j++) {
                const angle = (j / radialSamples) * Math.PI * 2;

                // Base radial direction (perpendicular to line)
                const radialDir = vec3.add(
                    vec3.scale(basis.normal, Math.cos(angle)),
                    vec3.scale(basis.binormal, Math.sin(angle))
                );

                // Blend radial direction with gravity direction
                const gravityBlend = influence.strength * 0.8;  // Max 80% gravity influence
                const glowDir = vec3.normalize(vec3.add(
                    vec3.scale(radialDir, 1 - gravityBlend),
                    vec3.scale(influence.direction, gravityBlend)
                ));

                // Calculate glow intensity
                // Brighter when radial direction aligns with gravity
                const alignment = vec3.dot(radialDir, influence.direction);
                const alignmentBoost = influence.strength * (alignment * 0.5 + 0.5);

                // Intensity varies by distance from line
                const glowDist = this.glowRadius * (1 + alignmentBoost * 0.5);
                const glowPos = vec3.add(linePoint, vec3.scale(glowDir, glowDist));

                // Color shifts toward plasma mass color when influenced
                const massColor = this._getBlendedMassColor(field, linePoint);
                const finalColor = this._lerpColor(
                    this.baseColor,
                    massColor,
                    influence.strength * 0.6
                );

                points.push({
                    position: glowPos,
                    linePoint,
                    color: finalColor,
                    intensity: this.baseGlow * (1 + alignmentBoost),
                    gravityStrength: influence.strength
                });
            }
        }

        return points;
    }

    _getBlendedMassColor(field, point) {
        if (field.masses.length === 0) return this.baseColor;

        let totalColor = [0, 0, 0];
        let totalWeight = 0;

        for (const mass of field.masses) {
            const inf = mass.getInfluence(point);
            totalColor[0] += mass.color[0] * inf.strength;
            totalColor[1] += mass.color[1] * inf.strength;
            totalColor[2] += mass.color[2] * inf.strength;
            totalWeight += inf.strength;
        }

        if (totalWeight > 0) {
            return [
                totalColor[0] / totalWeight,
                totalColor[1] / totalWeight,
                totalColor[2] / totalWeight
            ];
        }
        return this.baseColor;
    }

    _lerpColor(a, b, t) {
        return [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t
        ];
    }
}

/**
 * PlasmaWireframe - A collection of glow segments forming a 3D shape
 */
export class PlasmaWireframe {
    constructor(options = {}) {
        this.segments = [];
        this.color = options.color || [0, 1, 0.5];
        this.glow = options.glow ?? 1.0;
        this.glowRadius = options.glowRadius ?? 0.1;
    }

    /**
     * Add vertices and edges
     * @param {Array} vertices - Array of {x, y, z}
     * @param {Array} edges - Array of [startIndex, endIndex]
     */
    setGeometry(vertices, edges) {
        this.segments = [];
        for (const [i, j] of edges) {
            this.segments.push(new GlowSegment(
                vertices[i],
                vertices[j],
                {
                    color: this.color,
                    glow: this.glow,
                    glowRadius: this.glowRadius
                }
            ));
        }
    }

    /**
     * Create a unit cube
     */
    static cube(options = {}) {
        const wf = new PlasmaWireframe(options);
        const s = options.size ?? 1;
        const h = s / 2;

        const vertices = [
            { x: -h, y: -h, z: -h }, { x:  h, y: -h, z: -h },
            { x:  h, y:  h, z: -h }, { x: -h, y:  h, z: -h },
            { x: -h, y: -h, z:  h }, { x:  h, y: -h, z:  h },
            { x:  h, y:  h, z:  h }, { x: -h, y:  h, z:  h }
        ];

        const edges = [
            [0, 1], [1, 2], [2, 3], [3, 0],  // Front
            [4, 5], [5, 6], [6, 7], [7, 4],  // Back
            [0, 4], [1, 5], [2, 6], [3, 7]   // Connecting
        ];

        wf.setGeometry(vertices, edges);
        return wf;
    }

    /**
     * Create a UV sphere wireframe
     */
    static sphere(options = {}) {
        const wf = new PlasmaWireframe(options);
        const r = options.radius ?? 1;
        const latSegments = options.latSegments ?? 8;
        const lonSegments = options.lonSegments ?? 12;

        const vertices = [];
        const edges = [];

        // Generate vertices
        for (let lat = 0; lat <= latSegments; lat++) {
            const theta = (lat / latSegments) * Math.PI;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon < lonSegments; lon++) {
                const phi = (lon / lonSegments) * Math.PI * 2;
                vertices.push({
                    x: r * sinTheta * Math.cos(phi),
                    y: r * cosTheta,
                    z: r * sinTheta * Math.sin(phi)
                });
            }
        }

        // Generate edges
        for (let lat = 0; lat < latSegments; lat++) {
            for (let lon = 0; lon < lonSegments; lon++) {
                const current = lat * lonSegments + lon;
                const next = lat * lonSegments + ((lon + 1) % lonSegments);
                const below = (lat + 1) * lonSegments + lon;

                // Longitude line
                edges.push([current, next]);
                // Latitude line
                if (lat < latSegments) {
                    edges.push([current, below]);
                }
            }
        }

        wf.setGeometry(vertices, edges);
        return wf;
    }

    /**
     * Sample all glow points for rendering
     */
    sampleAllGlow(field, samplesPerSegment = 8, radialSamples = 6) {
        const allPoints = [];
        for (const segment of this.segments) {
            const points = segment.sampleGlow(field, samplesPerSegment, radialSamples);
            allPoints.push(...points);
        }
        return allPoints;
    }
}

// WebGL Shader for plasma glow rendering
export const PlasmaGlowShaders = {
    vertex: `#version 300 es
        precision highp float;

        in vec3 a_position;
        in vec3 a_color;
        in float a_intensity;
        in float a_gravityStrength;

        uniform mat4 u_viewProjection;
        uniform float u_pointSize;
        uniform float u_time;

        out vec3 v_color;
        out float v_intensity;
        out float v_gravityStrength;

        void main() {
            gl_Position = u_viewProjection * vec4(a_position, 1.0);

            // Larger points for stronger gravity influence (plasma accumulation)
            float sizeBoost = 1.0 + a_gravityStrength * 0.5;
            gl_PointSize = u_pointSize * sizeBoost * a_intensity;

            v_color = a_color;
            v_intensity = a_intensity;
            v_gravityStrength = a_gravityStrength;
        }
    `,

    fragment: `#version 300 es
        precision highp float;

        in vec3 v_color;
        in float v_intensity;
        in float v_gravityStrength;

        uniform float u_phosphorDecay;
        uniform float u_time;

        out vec4 fragColor;

        void main() {
            // Soft circular point
            vec2 center = gl_PointCoord - 0.5;
            float dist = length(center) * 2.0;

            // Gaussian falloff for glow
            float glow = exp(-dist * dist * 2.0);

            // Flicker based on gravity (plasma instability)
            float flicker = 1.0 + sin(u_time * 10.0 + v_gravityStrength * 20.0) * 0.1 * v_gravityStrength;

            // Final color with intensity
            vec3 finalColor = v_color * v_intensity * glow * flicker;

            // Alpha for additive blending
            float alpha = glow * v_intensity * 0.8;

            fragColor = vec4(finalColor, alpha);
        }
    `,

    // Post-process for CRT phosphor effect
    phosphorVertex: `#version 300 es
        in vec2 a_position;
        out vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_position * 0.5 + 0.5;
        }
    `,

    phosphorFragment: `#version 300 es
        precision highp float;

        in vec2 v_texCoord;

        uniform sampler2D u_currentFrame;
        uniform sampler2D u_previousFrame;
        uniform float u_decay;
        uniform float u_bloomIntensity;
        uniform float u_scanlineIntensity;
        uniform float u_time;

        out vec4 fragColor;

        void main() {
            vec4 current = texture(u_currentFrame, v_texCoord);
            vec4 previous = texture(u_previousFrame, v_texCoord);

            // Phosphor persistence (temporal blur)
            vec4 phosphor = max(current, previous * u_decay);

            // Bloom (sample neighbors)
            vec4 bloom = vec4(0.0);
            float bloomSize = 0.003;
            for (int x = -2; x <= 2; x++) {
                for (int y = -2; y <= 2; y++) {
                    vec2 offset = vec2(float(x), float(y)) * bloomSize;
                    bloom += texture(u_currentFrame, v_texCoord + offset);
                }
            }
            bloom /= 25.0;

            // CRT scanlines
            float scanline = 1.0 - sin(v_texCoord.y * 800.0) * u_scanlineIntensity * 0.5;

            // Combine
            vec3 finalColor = phosphor.rgb + bloom.rgb * u_bloomIntensity;
            finalColor *= scanline;

            fragColor = vec4(finalColor, 1.0);
        }
    `
};

export default {
    PlasmaMass,
    PlasmaField,
    GlowSegment,
    PlasmaWireframe,
    PlasmaGlowShaders,
    vec3
};
