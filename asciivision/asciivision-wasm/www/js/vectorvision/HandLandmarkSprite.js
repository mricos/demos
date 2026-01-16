/**
 * HandLandmarkSprite - Static representation of MediaPipe 21-landmark hand
 * with toggleable labels (0-20) and cube at fingertips
 */
import { Sprite } from './Sprite.js';

// MediaPipe landmark names
export const LANDMARK_NAMES = [
    'WRIST',           // 0
    'THUMB_CMC',       // 1
    'THUMB_MCP',       // 2
    'THUMB_IP',        // 3
    'THUMB_TIP',       // 4
    'INDEX_MCP',       // 5
    'INDEX_PIP',       // 6
    'INDEX_DIP',       // 7
    'INDEX_TIP',       // 8
    'MIDDLE_MCP',      // 9
    'MIDDLE_PIP',      // 10
    'MIDDLE_DIP',      // 11
    'MIDDLE_TIP',      // 12
    'RING_MCP',        // 13
    'RING_PIP',        // 14
    'RING_DIP',        // 15
    'RING_TIP',        // 16
    'PINKY_MCP',       // 17
    'PINKY_PIP',       // 18
    'PINKY_DIP',       // 19
    'PINKY_TIP'        // 20
];

// MediaPipe hand connections
export const HAND_CONNECTIONS = [
    // Thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // Index
    [0, 5], [5, 6], [6, 7], [7, 8],
    // Middle
    [0, 9], [9, 10], [10, 11], [11, 12],
    // Ring
    [0, 13], [13, 14], [14, 15], [15, 16],
    // Pinky
    [0, 17], [17, 18], [18, 19], [19, 20],
    // Palm connections
    [5, 9], [9, 13], [13, 17]
];

/**
 * Create static hand landmark positions matching MediaPipe diagram
 * Right hand, palm facing camera, normalized to ~(-1,1) range
 */
function createStaticLandmarks() {
    // Positions based on typical proportions (y increases downward in screen space)
    // Hand pointing up, wrist at bottom
    return [
        // 0: WRIST (bottom center)
        { x: 0, y: 0.9, z: 0 },

        // THUMB (extends left)
        { x: -0.35, y: 0.65, z: 0.1 },   // 1: THUMB_CMC
        { x: -0.55, y: 0.45, z: 0.15 },  // 2: THUMB_MCP
        { x: -0.65, y: 0.20, z: 0.12 },  // 3: THUMB_IP
        { x: -0.70, y: 0.0,  z: 0.1 },   // 4: THUMB_TIP

        // INDEX FINGER
        { x: -0.25, y: 0.35, z: 0 },     // 5: INDEX_MCP
        { x: -0.28, y: 0.0,  z: 0 },     // 6: INDEX_PIP
        { x: -0.30, y: -0.25, z: 0 },    // 7: INDEX_DIP
        { x: -0.32, y: -0.50, z: 0 },    // 8: INDEX_TIP

        // MIDDLE FINGER (longest)
        { x: -0.05, y: 0.32, z: 0 },     // 9: MIDDLE_MCP
        { x: -0.05, y: -0.05, z: 0 },    // 10: MIDDLE_PIP
        { x: -0.05, y: -0.35, z: 0 },    // 11: MIDDLE_DIP
        { x: -0.05, y: -0.60, z: 0 },    // 12: MIDDLE_TIP

        // RING FINGER
        { x: 0.15, y: 0.35, z: 0 },      // 13: RING_MCP
        { x: 0.17, y: 0.0,  z: 0 },      // 14: RING_PIP
        { x: 0.19, y: -0.28, z: 0 },     // 15: RING_DIP
        { x: 0.21, y: -0.48, z: 0 },     // 16: RING_TIP

        // PINKY
        { x: 0.35, y: 0.42, z: 0 },      // 17: PINKY_MCP
        { x: 0.40, y: 0.15, z: 0 },      // 18: PINKY_PIP
        { x: 0.44, y: -0.05, z: 0 },     // 19: PINKY_DIP
        { x: 0.48, y: -0.25, z: 0 }      // 20: PINKY_TIP
    ];
}

export class HandLandmarkSprite extends Sprite {
    constructor(options = {}) {
        super('hand-landmarks', { char: 'o' });

        // Whether to show landmark labels (0-20)
        this.showLabels = options.showLabels ?? true;

        // Whether to show the held cube
        this.showCube = options.showCube ?? false;

        // Cube size (relative to hand)
        this.cubeSize = options.cubeSize ?? 0.15;

        // Initialize with static landmarks
        this._initFromStatic();
    }

    /**
     * Initialize vertices and edges from static landmark positions
     */
    _initFromStatic() {
        const landmarks = createStaticLandmarks();

        // Add all 21 landmarks as vertices
        for (const lm of landmarks) {
            this.addVertex(lm.x, lm.y, lm.z);
        }

        // Add all hand connections as edges
        for (const [a, b] of HAND_CONNECTIONS) {
            this.addEdge(a, b);
        }
    }

    /**
     * Update from live MediaPipe landmarks
     * @param {Array} landmarks - Array of 21 {x, y, z} landmarks (0-1 normalized)
     */
    updateFromLive(landmarks) {
        if (!landmarks || landmarks.length < 21) return;

        // Update vertices from live data
        for (let i = 0; i < 21; i++) {
            const lm = landmarks[i];
            // Convert from 0-1 normalized to -1 to 1 range
            this.vertices[i] = {
                x: (lm.x - 0.5) * 2,
                y: (lm.y - 0.5) * 2,
                z: (lm.z || 0)
            };
        }
        this._bounds = null;
    }

    /**
     * Reset to static position
     */
    resetToStatic() {
        this.vertices = [];
        this.edges = [];
        this._initFromStatic();
    }

    /**
     * Get the 3 fingertip positions for cube placement
     * @returns {{thumb: Object, index: Object, middle: Object}}
     */
    getFingertipPositions() {
        const transformed = this.getTransformedVertices();
        return {
            thumb: transformed[4],    // THUMB_TIP
            index: transformed[8],    // INDEX_TIP
            middle: transformed[12]   // MIDDLE_TIP
        };
    }

    /**
     * Calculate cube position centered between thumb, index, and middle tips
     * @returns {{x, y, z}}
     */
    getCubeCenter() {
        const tips = this.getFingertipPositions();
        return {
            x: (tips.thumb.x + tips.index.x + tips.middle.x) / 3,
            y: (tips.thumb.y + tips.index.y + tips.middle.y) / 3,
            z: (tips.thumb.z + tips.index.z + tips.middle.z) / 3
        };
    }

    /**
     * Create a cube sprite positioned at fingertips
     * @returns {Sprite}
     */
    createHeldCube() {
        const center = this.getCubeCenter();
        const size = this.cubeSize * this.transform.scale;

        const cube = new Sprite('held-cube', { char: '#' });

        // Cube vertices (centered at origin, will be positioned later)
        const half = size / 2;
        const verts = [
            { x: -half, y: -half, z: -half },
            { x:  half, y: -half, z: -half },
            { x:  half, y:  half, z: -half },
            { x: -half, y:  half, z: -half },
            { x: -half, y: -half, z:  half },
            { x:  half, y: -half, z:  half },
            { x:  half, y:  half, z:  half },
            { x: -half, y:  half, z:  half }
        ];

        // Offset to center position
        for (const v of verts) {
            cube.addVertex(v.x + center.x, v.y + center.y, v.z + center.z);
        }

        // Cube edges
        const edges = [
            [0, 1], [1, 2], [2, 3], [3, 0],  // Front
            [4, 5], [5, 6], [6, 7], [7, 4],  // Back
            [0, 4], [1, 5], [2, 6], [3, 7]   // Connecting
        ];

        for (const [a, b] of edges) {
            cube.addEdge(a, b);
        }

        return cube;
    }

    /**
     * Get label positions for rendering
     * @param {Array} projected - Array of projected 2D positions
     * @returns {Array<{x, y, label}>}
     */
    getLabelPositions(projected) {
        if (!this.showLabels) return [];

        const labels = [];
        for (let i = 0; i < 21 && i < projected.length; i++) {
            const p = projected[i];
            if (p) {
                labels.push({
                    x: p.x + 1,  // Offset label slightly right
                    y: p.y,
                    label: String(i)
                });
            }
        }
        return labels;
    }

    /**
     * Toggle label visibility
     */
    toggleLabels() {
        this.showLabels = !this.showLabels;
        return this.showLabels;
    }

    /**
     * Toggle cube visibility
     */
    toggleCube() {
        this.showCube = !this.showCube;
        return this.showCube;
    }
}

// Export a ready-to-use static hand sprite
export function createStaticHandSprite(options = {}) {
    const sprite = new HandLandmarkSprite(options);
    sprite.setScale(options.scale ?? 0.8);
    return sprite;
}
