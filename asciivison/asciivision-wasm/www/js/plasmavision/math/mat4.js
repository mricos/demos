/**
 * mat4 - 4x4 matrix operations for 3D graphics
 * Column-major layout (WebGL compatible)
 *
 * Matrix layout:
 * [0]  [4]  [8]  [12]     [m00] [m10] [m20] [m30]
 * [1]  [5]  [9]  [13]  =  [m01] [m11] [m21] [m31]
 * [2]  [6]  [10] [14]     [m02] [m12] [m22] [m32]
 * [3]  [7]  [11] [15]     [m03] [m13] [m23] [m33]
 */

import { vec3 } from './vec3.js';

export const mat4 = {
    /**
     * Create identity matrix
     */
    create() {
        const m = new Float32Array(16);
        m[0] = 1;
        m[5] = 1;
        m[10] = 1;
        m[15] = 1;
        return m;
    },

    /**
     * Clone a matrix
     */
    clone(m) {
        return new Float32Array(m);
    },

    /**
     * Set to identity
     */
    identity(out) {
        out.fill(0);
        out[0] = 1;
        out[5] = 1;
        out[10] = 1;
        out[15] = 1;
        return out;
    },

    /**
     * Multiply two matrices: out = a * b
     */
    multiply(a, b, out = new Float32Array(16)) {
        for (let col = 0; col < 4; col++) {
            for (let row = 0; row < 4; row++) {
                out[col * 4 + row] =
                    a[0 * 4 + row] * b[col * 4 + 0] +
                    a[1 * 4 + row] * b[col * 4 + 1] +
                    a[2 * 4 + row] * b[col * 4 + 2] +
                    a[3 * 4 + row] * b[col * 4 + 3];
            }
        }
        return out;
    },

    /**
     * Perspective projection matrix
     * @param {number} fovY - Field of view in radians
     * @param {number} aspect - Aspect ratio (width/height)
     * @param {number} near - Near clipping plane
     * @param {number} far - Far clipping plane
     */
    perspective(fovY, aspect, near, far, out = new Float32Array(16)) {
        const f = 1.0 / Math.tan(fovY / 2);

        out.fill(0);
        out[0] = f / aspect;
        out[5] = f;
        out[10] = (far + near) / (near - far);
        out[11] = -1;
        out[14] = (2 * far * near) / (near - far);

        return out;
    },

    /**
     * Orthographic projection matrix
     */
    ortho(left, right, bottom, top, near, far, out = new Float32Array(16)) {
        const lr = 1 / (left - right);
        const bt = 1 / (bottom - top);
        const nf = 1 / (near - far);

        out.fill(0);
        out[0] = -2 * lr;
        out[5] = -2 * bt;
        out[10] = 2 * nf;
        out[12] = (left + right) * lr;
        out[13] = (top + bottom) * bt;
        out[14] = (far + near) * nf;
        out[15] = 1;

        return out;
    },

    /**
     * Look-at view matrix
     * @param {Object} eye - Camera position {x, y, z}
     * @param {Object} target - Look-at target {x, y, z}
     * @param {Object} up - Up vector {x, y, z}
     */
    lookAt(eye, target, up, out = new Float32Array(16)) {
        const zAxis = vec3.normalize(vec3.sub(eye, target));
        const xAxis = vec3.normalize(vec3.cross(up, zAxis));
        const yAxis = vec3.cross(zAxis, xAxis);

        out[0] = xAxis.x;
        out[1] = yAxis.x;
        out[2] = zAxis.x;
        out[3] = 0;
        out[4] = xAxis.y;
        out[5] = yAxis.y;
        out[6] = zAxis.y;
        out[7] = 0;
        out[8] = xAxis.z;
        out[9] = yAxis.z;
        out[10] = zAxis.z;
        out[11] = 0;
        out[12] = -vec3.dot(xAxis, eye);
        out[13] = -vec3.dot(yAxis, eye);
        out[14] = -vec3.dot(zAxis, eye);
        out[15] = 1;

        return out;
    },

    /**
     * Translation matrix
     */
    translation(x, y, z, out = new Float32Array(16)) {
        mat4.identity(out);
        out[12] = x;
        out[13] = y;
        out[14] = z;
        return out;
    },

    /**
     * Scaling matrix
     */
    scaling(x, y, z, out = new Float32Array(16)) {
        out.fill(0);
        out[0] = x;
        out[5] = y;
        out[10] = z;
        out[15] = 1;
        return out;
    },

    /**
     * Rotation around X axis
     */
    rotationX(radians, out = new Float32Array(16)) {
        const c = Math.cos(radians);
        const s = Math.sin(radians);

        mat4.identity(out);
        out[5] = c;
        out[6] = s;
        out[9] = -s;
        out[10] = c;

        return out;
    },

    /**
     * Rotation around Y axis
     */
    rotationY(radians, out = new Float32Array(16)) {
        const c = Math.cos(radians);
        const s = Math.sin(radians);

        mat4.identity(out);
        out[0] = c;
        out[2] = -s;
        out[8] = s;
        out[10] = c;

        return out;
    },

    /**
     * Rotation around Z axis
     */
    rotationZ(radians, out = new Float32Array(16)) {
        const c = Math.cos(radians);
        const s = Math.sin(radians);

        mat4.identity(out);
        out[0] = c;
        out[1] = s;
        out[4] = -s;
        out[5] = c;

        return out;
    },

    /**
     * Rotation around arbitrary axis
     */
    rotation(axis, radians, out = new Float32Array(16)) {
        const n = vec3.normalize(axis);
        const c = Math.cos(radians);
        const s = Math.sin(radians);
        const t = 1 - c;

        out[0] = t * n.x * n.x + c;
        out[1] = t * n.x * n.y + s * n.z;
        out[2] = t * n.x * n.z - s * n.y;
        out[3] = 0;
        out[4] = t * n.x * n.y - s * n.z;
        out[5] = t * n.y * n.y + c;
        out[6] = t * n.y * n.z + s * n.x;
        out[7] = 0;
        out[8] = t * n.x * n.z + s * n.y;
        out[9] = t * n.y * n.z - s * n.x;
        out[10] = t * n.z * n.z + c;
        out[11] = 0;
        out[12] = 0;
        out[13] = 0;
        out[14] = 0;
        out[15] = 1;

        return out;
    },

    /**
     * Transform a vec3 by matrix (as point, w=1)
     */
    transformPoint(m, v) {
        const w = m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15];
        return {
            x: (m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12]) / w,
            y: (m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13]) / w,
            z: (m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14]) / w
        };
    },

    /**
     * Transform a vec3 by matrix (as direction, w=0)
     */
    transformDirection(m, v) {
        return {
            x: m[0] * v.x + m[4] * v.y + m[8] * v.z,
            y: m[1] * v.x + m[5] * v.y + m[9] * v.z,
            z: m[2] * v.x + m[6] * v.y + m[10] * v.z
        };
    },

    /**
     * Invert a matrix
     */
    invert(m, out = new Float32Array(16)) {
        const m00 = m[0], m01 = m[1], m02 = m[2], m03 = m[3];
        const m10 = m[4], m11 = m[5], m12 = m[6], m13 = m[7];
        const m20 = m[8], m21 = m[9], m22 = m[10], m23 = m[11];
        const m30 = m[12], m31 = m[13], m32 = m[14], m33 = m[15];

        const tmp0 = m22 * m33 - m32 * m23;
        const tmp1 = m21 * m33 - m31 * m23;
        const tmp2 = m21 * m32 - m31 * m22;
        const tmp3 = m20 * m33 - m30 * m23;
        const tmp4 = m20 * m32 - m30 * m22;
        const tmp5 = m20 * m31 - m30 * m21;

        const t0 = tmp0 * m11 - tmp1 * m12 + tmp2 * m13;
        const t1 = -(tmp0 * m10 - tmp3 * m12 + tmp4 * m13);
        const t2 = tmp1 * m10 - tmp3 * m11 + tmp5 * m13;
        const t3 = -(tmp2 * m10 - tmp4 * m11 + tmp5 * m12);

        const det = 1 / (m00 * t0 + m01 * t1 + m02 * t2 + m03 * t3);

        out[0] = t0 * det;
        out[1] = (-(tmp0 * m01 - tmp1 * m02 + tmp2 * m03)) * det;
        out[2] = ((m12 * m33 - m32 * m13) * m01 - (m11 * m33 - m31 * m13) * m02 + (m11 * m32 - m31 * m12) * m03) * det;
        out[3] = (-(m12 * m23 - m22 * m13) * m01 + (m11 * m23 - m21 * m13) * m02 - (m11 * m22 - m21 * m12) * m03) * det;
        out[4] = t1 * det;
        out[5] = (tmp0 * m00 - tmp3 * m02 + tmp4 * m03) * det;
        out[6] = (-((m12 * m33 - m32 * m13) * m00 - (m10 * m33 - m30 * m13) * m02 + (m10 * m32 - m30 * m12) * m03)) * det;
        out[7] = ((m12 * m23 - m22 * m13) * m00 - (m10 * m23 - m20 * m13) * m02 + (m10 * m22 - m20 * m12) * m03) * det;
        out[8] = t2 * det;
        out[9] = (-(tmp1 * m00 - tmp3 * m01 + tmp5 * m03)) * det;
        out[10] = ((m11 * m33 - m31 * m13) * m00 - (m10 * m33 - m30 * m13) * m01 + (m10 * m31 - m30 * m11) * m03) * det;
        out[11] = (-((m11 * m23 - m21 * m13) * m00 - (m10 * m23 - m20 * m13) * m01 + (m10 * m21 - m20 * m11) * m03)) * det;
        out[12] = t3 * det;
        out[13] = (tmp2 * m00 - tmp4 * m01 + tmp5 * m02) * det;
        out[14] = (-((m11 * m32 - m31 * m12) * m00 - (m10 * m32 - m30 * m12) * m01 + (m10 * m31 - m30 * m11) * m02)) * det;
        out[15] = ((m11 * m22 - m21 * m12) * m00 - (m10 * m22 - m20 * m12) * m01 + (m10 * m21 - m20 * m11) * m02) * det;

        return out;
    },

    /**
     * Transpose a matrix
     */
    transpose(m, out = new Float32Array(16)) {
        if (out === m) {
            const tmp = m[1]; m[1] = m[4]; m[4] = tmp;
            const tmp2 = m[2]; m[2] = m[8]; m[8] = tmp2;
            const tmp3 = m[3]; m[3] = m[12]; m[12] = tmp3;
            const tmp4 = m[6]; m[6] = m[9]; m[9] = tmp4;
            const tmp5 = m[7]; m[7] = m[13]; m[13] = tmp5;
            const tmp6 = m[11]; m[11] = m[14]; m[14] = tmp6;
            return out;
        }

        out[0] = m[0]; out[1] = m[4]; out[2] = m[8]; out[3] = m[12];
        out[4] = m[1]; out[5] = m[5]; out[6] = m[9]; out[7] = m[13];
        out[8] = m[2]; out[9] = m[6]; out[10] = m[10]; out[11] = m[14];
        out[12] = m[3]; out[13] = m[7]; out[14] = m[11]; out[15] = m[15];

        return out;
    }
};

export default mat4;
