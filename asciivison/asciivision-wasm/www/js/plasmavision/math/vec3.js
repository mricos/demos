/**
 * vec3 - 3D vector operations
 * Immutable style: all operations return new objects
 */

export const vec3 = {
    /**
     * Create a new vector
     */
    create(x = 0, y = 0, z = 0) {
        return { x, y, z };
    },

    /**
     * Create from array [x, y, z]
     */
    fromArray(arr) {
        return { x: arr[0] || 0, y: arr[1] || 0, z: arr[2] || 0 };
    },

    /**
     * Convert to array
     */
    toArray(v) {
        return [v.x, v.y, v.z];
    },

    /**
     * Clone a vector
     */
    clone(v) {
        return { x: v.x, y: v.y, z: v.z };
    },

    /**
     * Add two vectors
     */
    add(a, b) {
        return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
    },

    /**
     * Subtract b from a
     */
    sub(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    },

    /**
     * Scale vector by scalar
     */
    scale(v, s) {
        return { x: v.x * s, y: v.y * s, z: v.z * s };
    },

    /**
     * Multiply component-wise
     */
    mul(a, b) {
        return { x: a.x * b.x, y: a.y * b.y, z: a.z * b.z };
    },

    /**
     * Dot product
     */
    dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    },

    /**
     * Cross product
     */
    cross(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    },

    /**
     * Vector length
     */
    length(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    },

    /**
     * Squared length (avoids sqrt)
     */
    lengthSq(v) {
        return v.x * v.x + v.y * v.y + v.z * v.z;
    },

    /**
     * Distance between two points
     */
    distance(a, b) {
        return vec3.length(vec3.sub(a, b));
    },

    /**
     * Normalize to unit length
     */
    normalize(v) {
        const len = vec3.length(v);
        return len > 0 ? vec3.scale(v, 1 / len) : { x: 0, y: 0, z: 0 };
    },

    /**
     * Negate vector
     */
    negate(v) {
        return { x: -v.x, y: -v.y, z: -v.z };
    },

    /**
     * Linear interpolation
     */
    lerp(a, b, t) {
        return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            z: a.z + (b.z - a.z) * t
        };
    },

    /**
     * Reflect vector off surface with normal n
     */
    reflect(v, n) {
        const d = 2 * vec3.dot(v, n);
        return vec3.sub(v, vec3.scale(n, d));
    },

    /**
     * Angle between two vectors (radians)
     */
    angle(a, b) {
        const d = vec3.dot(vec3.normalize(a), vec3.normalize(b));
        return Math.acos(Math.max(-1, Math.min(1, d)));
    },

    /**
     * Project a onto b
     */
    project(a, b) {
        const bLenSq = vec3.lengthSq(b);
        if (bLenSq === 0) return vec3.create();
        const scalar = vec3.dot(a, b) / bLenSq;
        return vec3.scale(b, scalar);
    },

    /**
     * Check if vectors are approximately equal
     */
    equals(a, b, epsilon = 0.0001) {
        return Math.abs(a.x - b.x) < epsilon &&
               Math.abs(a.y - b.y) < epsilon &&
               Math.abs(a.z - b.z) < epsilon;
    },

    /**
     * Component-wise min
     */
    min(a, b) {
        return {
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y),
            z: Math.min(a.z, b.z)
        };
    },

    /**
     * Component-wise max
     */
    max(a, b) {
        return {
            x: Math.max(a.x, b.x),
            y: Math.max(a.y, b.y),
            z: Math.max(a.z, b.z)
        };
    },

    /**
     * Clamp each component
     */
    clamp(v, minVal, maxVal) {
        return {
            x: Math.max(minVal, Math.min(maxVal, v.x)),
            y: Math.max(minVal, Math.min(maxVal, v.y)),
            z: Math.max(minVal, Math.min(maxVal, v.z))
        };
    },

    // Common vectors
    ZERO: Object.freeze({ x: 0, y: 0, z: 0 }),
    ONE: Object.freeze({ x: 1, y: 1, z: 1 }),
    UP: Object.freeze({ x: 0, y: 1, z: 0 }),
    DOWN: Object.freeze({ x: 0, y: -1, z: 0 }),
    LEFT: Object.freeze({ x: -1, y: 0, z: 0 }),
    RIGHT: Object.freeze({ x: 1, y: 0, z: 0 }),
    FORWARD: Object.freeze({ x: 0, y: 0, z: -1 }),
    BACK: Object.freeze({ x: 0, y: 0, z: 1 })
};

export default vec3;
