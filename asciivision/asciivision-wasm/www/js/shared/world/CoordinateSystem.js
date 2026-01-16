/**
 * CoordinateSystem - Unified coordinate conversion utilities
 *
 * Coordinate Systems:
 * 1. World Space: 3D right-handed, origin at center
 *    - +X = right, +Y = up, +Z = toward viewer
 *    - Range: typically -1 to 1 (normalized) or custom bounds
 *
 * 2. Screen Space: 2D, origin at top-left
 *    - +X = right, +Y = down
 *    - Range: 0 to width/height in pixels
 *
 * 3. NDC (Normalized Device Coordinates): WebGL clip space
 *    - -1 to 1 in all dimensions
 *    - +X = right, +Y = up
 *
 * 4. Grid Space: ASCII grid coordinates
 *    - Origin at top-left (like screen)
 *    - Integer column/row values
 *
 * 5. MediaPipe Landmark Space:
 *    - 0 to 1, origin at top-left of image
 *    - +X = right, +Y = down
 */

import { vec3 } from '../math/vec3.js';
import { mat4 } from '../math/mat4.js';

export class CoordinateSystem {
    constructor(options = {}) {
        // Screen dimensions
        this.screenWidth = options.screenWidth || 1280;
        this.screenHeight = options.screenHeight || 720;

        // Grid dimensions
        this.gridCols = options.gridCols || 120;
        this.gridRows = options.gridRows || 40;

        // World bounds (for normalized coordinates)
        this.worldBounds = options.worldBounds || {
            minX: -1, maxX: 1,
            minY: -1, maxY: 1,
            minZ: -1, maxZ: 1
        };

        // Aspect ratio
        this.aspectRatio = this.screenWidth / this.screenHeight;
    }

    /**
     * Update dimensions
     */
    setScreenSize(width, height) {
        this.screenWidth = width;
        this.screenHeight = height;
        this.aspectRatio = width / height;
        return this;
    }

    setGridSize(cols, rows) {
        this.gridCols = cols;
        this.gridRows = rows;
        return this;
    }

    // ========================================
    // Screen <-> World conversions
    // ========================================

    /**
     * Screen coordinates to normalized world XY (-1 to 1)
     */
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX / this.screenWidth) * 2 - 1,
            y: 1 - (screenY / this.screenHeight) * 2,  // Flip Y
            z: 0
        };
    }

    /**
     * World coordinates to screen
     */
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX + 1) * 0.5 * this.screenWidth,
            y: (1 - worldY) * 0.5 * this.screenHeight
        };
    }

    // ========================================
    // Grid <-> World conversions
    // ========================================

    /**
     * Grid cell to normalized world (-1 to 1)
     */
    gridToWorld(col, row) {
        return {
            x: (col / this.gridCols) * 2 - 1,
            y: 1 - (row / this.gridRows) * 2,
            z: 0
        };
    }

    /**
     * World to grid cell
     */
    worldToGrid(worldX, worldY) {
        return {
            col: Math.floor((worldX + 1) * 0.5 * this.gridCols),
            row: Math.floor((1 - worldY) * 0.5 * this.gridRows)
        };
    }

    /**
     * Grid cell to screen coordinates
     */
    gridToScreen(col, row) {
        const cellWidth = this.screenWidth / this.gridCols;
        const cellHeight = this.screenHeight / this.gridRows;
        return {
            x: col * cellWidth,
            y: row * cellHeight
        };
    }

    /**
     * Screen to grid cell
     */
    screenToGrid(screenX, screenY) {
        return {
            col: Math.floor(screenX * this.gridCols / this.screenWidth),
            row: Math.floor(screenY * this.gridRows / this.screenHeight)
        };
    }

    // ========================================
    // MediaPipe Landmark conversions
    // ========================================

    /**
     * MediaPipe landmark (0-1, Y down) to world (-1 to 1, Y up)
     * @param {Object} landmark - {x, y, z} from MediaPipe
     * @param {boolean} mirror - Mirror X axis (default true for front camera)
     */
    landmarkToWorld(landmark, mirror = true) {
        return {
            x: mirror ? (1 - landmark.x) * 2 - 1 : landmark.x * 2 - 1,
            y: 1 - landmark.y * 2,  // Flip Y
            z: -(landmark.z || 0)   // Negate Z for right-handed system
        };
    }

    /**
     * World to MediaPipe landmark space
     */
    worldToLandmark(worldX, worldY, worldZ = 0, mirror = true) {
        return {
            x: mirror ? 1 - (worldX + 1) * 0.5 : (worldX + 1) * 0.5,
            y: (1 - worldY) * 0.5,
            z: -worldZ
        };
    }

    /**
     * MediaPipe landmark to grid cell
     */
    landmarkToGrid(landmark, mirror = true) {
        const world = this.landmarkToWorld(landmark, mirror);
        return this.worldToGrid(world.x, world.y);
    }

    /**
     * MediaPipe landmark to screen
     */
    landmarkToScreen(landmark, mirror = true) {
        return {
            x: mirror ? (1 - landmark.x) * this.screenWidth : landmark.x * this.screenWidth,
            y: landmark.y * this.screenHeight
        };
    }

    // ========================================
    // NDC conversions
    // ========================================

    /**
     * Screen to NDC (-1 to 1)
     */
    screenToNDC(screenX, screenY) {
        return {
            x: (screenX / this.screenWidth) * 2 - 1,
            y: 1 - (screenY / this.screenHeight) * 2,
            z: 0
        };
    }

    /**
     * NDC to screen
     */
    ndcToScreen(ndcX, ndcY) {
        return {
            x: (ndcX + 1) * 0.5 * this.screenWidth,
            y: (1 - ndcY) * 0.5 * this.screenHeight
        };
    }

    // ========================================
    // 3D Projection helpers
    // ========================================

    /**
     * Project 3D world point to 2D screen using camera matrices
     * @param {Object} point - {x, y, z}
     * @param {Float32Array} viewProjectionMatrix
     */
    projectPoint(point, viewProjectionMatrix) {
        const ndc = mat4.transformPoint(viewProjectionMatrix, point);

        // Check if behind camera
        if (ndc.z < -1 || ndc.z > 1) return null;

        return {
            x: (ndc.x + 1) * 0.5 * this.screenWidth,
            y: (1 - ndc.y) * 0.5 * this.screenHeight,
            z: ndc.z,
            visible: ndc.z >= -1 && ndc.z <= 1
        };
    }

    /**
     * Unproject 2D screen point to 3D ray
     * @param {number} screenX
     * @param {number} screenY
     * @param {Float32Array} inverseViewProjection
     */
    unprojectToRay(screenX, screenY, inverseViewProjection) {
        const ndcX = (screenX / this.screenWidth) * 2 - 1;
        const ndcY = 1 - (screenY / this.screenHeight) * 2;

        const near = mat4.transformPoint(inverseViewProjection, { x: ndcX, y: ndcY, z: -1 });
        const far = mat4.transformPoint(inverseViewProjection, { x: ndcX, y: ndcY, z: 1 });

        return {
            origin: near,
            direction: vec3.normalize(vec3.sub(far, near))
        };
    }

    // ========================================
    // Utility methods
    // ========================================

    /**
     * Get cell dimensions in screen pixels
     */
    getCellSize() {
        return {
            width: this.screenWidth / this.gridCols,
            height: this.screenHeight / this.gridRows
        };
    }

    /**
     * Get character aspect ratio (for ASCII rendering)
     */
    getCharAspect() {
        const cell = this.getCellSize();
        // Typical monospace character is ~0.6 width to height
        return cell.width / cell.height / 0.6;
    }

    /**
     * Clamp grid coordinates to valid range
     */
    clampGrid(col, row) {
        return {
            col: Math.max(0, Math.min(this.gridCols - 1, Math.floor(col))),
            row: Math.max(0, Math.min(this.gridRows - 1, Math.floor(row)))
        };
    }

    /**
     * Check if grid position is in bounds
     */
    isInGrid(col, row) {
        return col >= 0 && col < this.gridCols && row >= 0 && row < this.gridRows;
    }

    /**
     * Check if screen position is in bounds
     */
    isInScreen(screenX, screenY) {
        return screenX >= 0 && screenX < this.screenWidth &&
               screenY >= 0 && screenY < this.screenHeight;
    }

    /**
     * Get world bounds for a grid cell
     */
    getGridCellBounds(col, row) {
        const topLeft = this.gridToWorld(col, row);
        const bottomRight = this.gridToWorld(col + 1, row + 1);
        return {
            minX: topLeft.x,
            maxX: bottomRight.x,
            minY: bottomRight.y,
            maxY: topLeft.y
        };
    }

    /**
     * Convert batch of landmarks to world coordinates
     */
    landmarksToWorld(landmarks, mirror = true) {
        return landmarks.map(lm => this.landmarkToWorld(lm, mirror));
    }

    /**
     * Serialize configuration
     */
    toJSON() {
        return {
            screenWidth: this.screenWidth,
            screenHeight: this.screenHeight,
            gridCols: this.gridCols,
            gridRows: this.gridRows,
            worldBounds: { ...this.worldBounds }
        };
    }

    /**
     * Create from JSON
     */
    static fromJSON(json) {
        return new CoordinateSystem(json);
    }
}

// Singleton for global coordinate system
let globalCoordinateSystem = null;

/**
 * Get or create global coordinate system
 */
export function getCoordinateSystem(options) {
    if (!globalCoordinateSystem) {
        globalCoordinateSystem = new CoordinateSystem(options);
    } else if (options) {
        Object.assign(globalCoordinateSystem, options);
    }
    return globalCoordinateSystem;
}

export default CoordinateSystem;
