/**
 * Strahl.Math3D — 3D projection and rotation
 * Pure functions, no state, no DOM.
 */
(function(Strahl) {
    'use strict';

    const DEG2RAD = Math.PI / 180;

    /**
     * Rotate a point through ZYX Euler angles (degrees)
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} rx - Rotation around X axis (degrees)
     * @param {number} ry - Rotation around Y axis (degrees)
     * @param {number} rz - Rotation around Z axis (degrees)
     * @returns {{x: number, y: number, z: number}}
     */
    function rotate(x, y, z, rx, ry, rz) {
        const radX = rx * DEG2RAD;
        const radY = ry * DEG2RAD;
        const radZ = rz * DEG2RAD;

        const cosX = Math.cos(radX), sinX = Math.sin(radX);
        const cosY = Math.cos(radY), sinY = Math.sin(radY);
        const cosZ = Math.cos(radZ), sinZ = Math.sin(radZ);

        // Rotate around Z
        const x1 = x * cosZ - y * sinZ;
        const y1 = x * sinZ + y * cosZ;
        const z1 = z;

        // Rotate around Y
        const x2 = x1 * cosY + z1 * sinY;
        const y2 = y1;
        const z2 = -x1 * sinY + z1 * cosY;

        // Rotate around X
        return {
            x: x2,
            y: y2 * cosX - z2 * sinX,
            z: y2 * sinX + z2 * cosX
        };
    }

    /**
     * Project a 3D point to 2D with perspective
     * @param {number} x - World X
     * @param {number} y - World Y
     * @param {number} z - World Z
     * @param {number} rx - Rotation X (degrees)
     * @param {number} ry - Rotation Y (degrees)
     * @param {number} rz - Rotation Z (degrees)
     * @param {number} fov - Field of view (projection scale)
     * @param {number} cameraZ - Camera distance
     * @returns {{x: number, y: number, z: number, scale: number, depth: number}}
     */
    function project(x, y, z, rx, ry, rz, fov, cameraZ) {
        const rotated = rotate(x, y, z, rx, ry, rz);
        const depth = cameraZ + rotated.z;
        const scale = fov / Math.max(depth, 1);

        return {
            x: rotated.x * scale,
            y: rotated.y * scale,
            z: rotated.z,
            scale,
            depth
        };
    }

    /**
     * Transform an SVG path string through 3D projection
     * Handles M, L, Q, C commands with coordinate pairs
     *
     * @param {string} pathStr - SVG path data
     * @param {number} ox - Origin X offset (letter position)
     * @param {number} oy - Origin Y offset
     * @param {number} oz - Origin Z offset
     * @param {number} scale - Local scale factor
     * @param {number} rx - Rotation X (degrees)
     * @param {number} ry - Rotation Y (degrees)
     * @param {number} rz - Rotation Z (degrees)
     * @param {number} fov - Field of view
     * @param {number} cameraZ - Camera distance
     * @param {number} pathCenter - Center offset for path coordinates (default 50)
     * @returns {string} Transformed SVG path data
     */
    function transformPath(pathStr, ox, oy, oz, scale, rx, ry, rz, fov, cameraZ, pathCenter) {
        pathCenter = pathCenter ?? 50;
        const tokens = pathStr.match(/[MLQC]|[-\d.]+/g);
        if (!tokens) return '';

        const result = [];
        let i = 0;

        while (i < tokens.length) {
            const tok = tokens[i];
            if (/[MLQC]/.test(tok)) {
                result.push(tok);
                i++;
            } else {
                const localX = (parseFloat(tok) - pathCenter) * scale;
                const localY = (parseFloat(tokens[i + 1]) - pathCenter) * scale;
                const proj = project(ox + localX, oy + localY, oz, rx, ry, rz, fov, cameraZ);
                result.push(proj.x.toFixed(2), proj.y.toFixed(2));
                i += 2;
            }
        }

        return result.join(' ');
    }

    /**
     * Linearly interpolate between two values
     */
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    Strahl.Math3D = {
        DEG2RAD,
        rotate,
        project,
        transformPath,
        lerp
    };

})(window.Strahl);
