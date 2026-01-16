/**
 * quat - Quaternion operations for 3D rotations
 * Format: {x, y, z, w} where w is the scalar component
 * Shared module - use across all projects
 */

import { vec3 } from './vec3.js';

export const quat = {
    /**
     * Create identity quaternion
     */
    create() {
        return { x: 0, y: 0, z: 0, w: 1 };
    },

    /**
     * Clone a quaternion
     */
    clone(q) {
        return { x: q.x, y: q.y, z: q.z, w: q.w };
    },

    /**
     * Set to identity
     */
    identity(q) {
        q.x = 0;
        q.y = 0;
        q.z = 0;
        q.w = 1;
        return q;
    },

    /**
     * Create from axis-angle
     */
    fromAxisAngle(axis, radians) {
        const halfAngle = radians / 2;
        const s = Math.sin(halfAngle);
        const n = vec3.normalize(axis);
        return {
            x: n.x * s,
            y: n.y * s,
            z: n.z * s,
            w: Math.cos(halfAngle)
        };
    },

    /**
     * Create from Euler angles (XYZ order)
     */
    fromEuler(x, y, z) {
        const c1 = Math.cos(x / 2), s1 = Math.sin(x / 2);
        const c2 = Math.cos(y / 2), s2 = Math.sin(y / 2);
        const c3 = Math.cos(z / 2), s3 = Math.sin(z / 2);

        return {
            x: s1 * c2 * c3 + c1 * s2 * s3,
            y: c1 * s2 * c3 - s1 * c2 * s3,
            z: c1 * c2 * s3 + s1 * s2 * c3,
            w: c1 * c2 * c3 - s1 * s2 * s3
        };
    },

    /**
     * Convert to Euler angles (XYZ order)
     */
    toEuler(q) {
        const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
        const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
        const x = Math.atan2(sinr_cosp, cosr_cosp);

        const sinp = 2 * (q.w * q.y - q.z * q.x);
        const y = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);

        const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
        const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
        const z = Math.atan2(siny_cosp, cosy_cosp);

        return { x, y, z };
    },

    /**
     * Multiply two quaternions
     */
    multiply(a, b) {
        return {
            x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
            y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
            z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
            w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
        };
    },

    /**
     * Normalize quaternion
     */
    normalize(q) {
        const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
        if (len === 0) return { x: 0, y: 0, z: 0, w: 1 };
        const invLen = 1 / len;
        return {
            x: q.x * invLen,
            y: q.y * invLen,
            z: q.z * invLen,
            w: q.w * invLen
        };
    },

    /**
     * Conjugate (inverse for unit quaternions)
     */
    conjugate(q) {
        return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
    },

    /**
     * Invert quaternion
     */
    invert(q) {
        const dot = q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w;
        const invDot = dot ? 1 / dot : 0;
        return {
            x: -q.x * invDot,
            y: -q.y * invDot,
            z: -q.z * invDot,
            w: q.w * invDot
        };
    },

    /**
     * Dot product
     */
    dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    },

    /**
     * Spherical linear interpolation
     */
    slerp(a, b, t) {
        let dot = quat.dot(a, b);

        // If negative dot, negate one quaternion to take shorter path
        if (dot < 0) {
            b = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
            dot = -dot;
        }

        // If very close, use linear interpolation
        if (dot > 0.9995) {
            return quat.normalize({
                x: a.x + t * (b.x - a.x),
                y: a.y + t * (b.y - a.y),
                z: a.z + t * (b.z - a.z),
                w: a.w + t * (b.w - a.w)
            });
        }

        const theta = Math.acos(dot);
        const sinTheta = Math.sin(theta);
        const wa = Math.sin((1 - t) * theta) / sinTheta;
        const wb = Math.sin(t * theta) / sinTheta;

        return {
            x: wa * a.x + wb * b.x,
            y: wa * a.y + wb * b.y,
            z: wa * a.z + wb * b.z,
            w: wa * a.w + wb * b.w
        };
    },

    /**
     * Rotate a vec3 by quaternion
     */
    rotateVec3(q, v) {
        const qv = { x: q.x, y: q.y, z: q.z };
        const uv = vec3.cross(qv, v);
        const uuv = vec3.cross(qv, uv);
        return vec3.add(v, vec3.add(vec3.scale(uv, 2 * q.w), vec3.scale(uuv, 2)));
    },

    /**
     * Get forward vector (-Z axis) from quaternion
     */
    getForward(q) {
        return {
            x: 2 * (q.x * q.z + q.w * q.y),
            y: 2 * (q.y * q.z - q.w * q.x),
            z: 1 - 2 * (q.x * q.x + q.y * q.y)
        };
    },

    /**
     * Get up vector (Y axis) from quaternion
     */
    getUp(q) {
        return {
            x: 2 * (q.x * q.y - q.w * q.z),
            y: 1 - 2 * (q.x * q.x + q.z * q.z),
            z: 2 * (q.y * q.z + q.w * q.x)
        };
    },

    /**
     * Get right vector (X axis) from quaternion
     */
    getRight(q) {
        return {
            x: 1 - 2 * (q.y * q.y + q.z * q.z),
            y: 2 * (q.x * q.y + q.w * q.z),
            z: 2 * (q.x * q.z - q.w * q.y)
        };
    },

    /**
     * Look rotation - create quaternion that rotates from forward to target direction
     */
    lookRotation(forward, up = vec3.UP) {
        const f = vec3.normalize(forward);
        const r = vec3.normalize(vec3.cross(up, f));
        const u = vec3.cross(f, r);

        const m00 = r.x, m01 = r.y, m02 = r.z;
        const m10 = u.x, m11 = u.y, m12 = u.z;
        const m20 = f.x, m21 = f.y, m22 = f.z;

        const trace = m00 + m11 + m22;

        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1);
            return {
                w: 0.25 / s,
                x: (m12 - m21) * s,
                y: (m20 - m02) * s,
                z: (m01 - m10) * s
            };
        } else if (m00 > m11 && m00 > m22) {
            const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
            return {
                w: (m12 - m21) / s,
                x: 0.25 * s,
                y: (m10 + m01) / s,
                z: (m20 + m02) / s
            };
        } else if (m11 > m22) {
            const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
            return {
                w: (m20 - m02) / s,
                x: (m10 + m01) / s,
                y: 0.25 * s,
                z: (m21 + m12) / s
            };
        } else {
            const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
            return {
                w: (m01 - m10) / s,
                x: (m20 + m02) / s,
                y: (m21 + m12) / s,
                z: 0.25 * s
            };
        }
    },

    // Common quaternions
    IDENTITY: Object.freeze({ x: 0, y: 0, z: 0, w: 1 })
};

export default quat;
