/**
 * Sprite - 3D vector sprite definition for VectorVision
 * Sprites are defined as collections of points and lines in 3D space
 * Can be scaled, rotated, and positioned before rendering to ASCII
 */
export class Sprite {
    constructor(name, options = {}) {
        this.name = name;

        // 3D vertices as [{x, y, z}]
        this.vertices = [];

        // Edges as [vertexIndex1, vertexIndex2]
        this.edges = [];

        // Character to use for rendering (null = use ramp)
        this.char = options.char || '*';

        // Transform state
        this.transform = {
            x: 0, y: 0, z: 0,           // Position
            scale: 1,                    // Uniform scale
            rotX: 0, rotY: 0, rotZ: 0   // Rotation (radians)
        };

        // Bounding box (computed)
        this._bounds = null;
    }

    /**
     * Add a vertex, returns its index
     */
    addVertex(x, y, z = 0) {
        this.vertices.push({ x, y, z });
        this._bounds = null;
        return this.vertices.length - 1;
    }

    /**
     * Add an edge between two vertex indices
     */
    addEdge(v1, v2) {
        this.edges.push([v1, v2]);
    }

    /**
     * Set position
     */
    setPosition(x, y, z = 0) {
        this.transform.x = x;
        this.transform.y = y;
        this.transform.z = z;
    }

    /**
     * Set scale
     */
    setScale(s) {
        this.transform.scale = s;
    }

    /**
     * Set rotation (degrees)
     */
    setRotation(rx, ry, rz) {
        this.transform.rotX = rx * Math.PI / 180;
        this.transform.rotY = ry * Math.PI / 180;
        this.transform.rotZ = rz * Math.PI / 180;
    }

    /**
     * Get transformed vertices
     */
    getTransformedVertices() {
        const { x, y, z, scale, rotX, rotY, rotZ } = this.transform;
        const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
        const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
        const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

        return this.vertices.map(v => {
            // Apply scale
            let vx = v.x * scale;
            let vy = v.y * scale;
            let vz = v.z * scale;

            // Rotate around X
            let ty = vy * cosX - vz * sinX;
            let tz = vy * sinX + vz * cosX;
            vy = ty; vz = tz;

            // Rotate around Y
            let tx = vx * cosY + vz * sinY;
            tz = -vx * sinY + vz * cosY;
            vx = tx;

            // Rotate around Z
            tx = vx * cosZ - vy * sinZ;
            ty = vx * sinZ + vy * cosZ;
            vx = tx; vy = ty;

            // Translate
            return {
                x: vx + x,
                y: vy + y,
                z: vz + z
            };
        });
    }

    /**
     * Get bounding box of untransformed sprite
     */
    getBounds() {
        if (this._bounds) return this._bounds;
        if (this.vertices.length === 0) {
            return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
        }

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const v of this.vertices) {
            minX = Math.min(minX, v.x);
            maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y);
            maxY = Math.max(maxY, v.y);
            minZ = Math.min(minZ, v.z);
            maxZ = Math.max(maxZ, v.z);
        }

        this._bounds = { minX, maxX, minY, maxY, minZ, maxZ };
        return this._bounds;
    }

    /**
     * Clone sprite
     */
    clone() {
        const s = new Sprite(this.name);
        s.vertices = this.vertices.map(v => ({ ...v }));
        s.edges = this.edges.map(e => [...e]);
        s.char = this.char;
        s.transform = { ...this.transform };
        return s;
    }

    /**
     * Create from JSON definition
     */
    static fromJSON(data) {
        const s = new Sprite(data.name, { char: data.char });
        if (data.vertices) {
            s.vertices = data.vertices.map(v =>
                Array.isArray(v) ? { x: v[0], y: v[1], z: v[2] || 0 } : { ...v }
            );
        }
        if (data.edges) {
            s.edges = data.edges.map(e => [...e]);
        }
        return s;
    }

    /**
     * Serialize to JSON
     */
    toJSON() {
        return {
            name: this.name,
            char: this.char,
            vertices: this.vertices.map(v => [v.x, v.y, v.z]),
            edges: this.edges
        };
    }
}

// Built-in sprite definitions
export const BuiltInSprites = {
    // Simple crosshair
    crosshair: {
        name: 'crosshair',
        char: '+',
        vertices: [
            [-1, 0, 0], [1, 0, 0],  // Horizontal
            [0, -1, 0], [0, 1, 0]   // Vertical
        ],
        edges: [[0, 1], [2, 3]]
    },

    // Triangle pointer
    pointer: {
        name: 'pointer',
        char: '^',
        vertices: [
            [0, -1, 0],   // Top
            [-0.7, 0.7, 0], // Bottom left
            [0.7, 0.7, 0]  // Bottom right
        ],
        edges: [[0, 1], [1, 2], [2, 0]]
    },

    // Cube wireframe
    cube: {
        name: 'cube',
        char: '#',
        vertices: [
            [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],  // Front face
            [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]        // Back face
        ],
        edges: [
            [0, 1], [1, 2], [2, 3], [3, 0],  // Front
            [4, 5], [5, 6], [6, 7], [7, 4],  // Back
            [0, 4], [1, 5], [2, 6], [3, 7]   // Connecting
        ]
    },

    // Diamond shape
    diamond: {
        name: 'diamond',
        char: '<>',
        vertices: [
            [0, -1, 0],   // Top
            [-1, 0, 0],   // Left
            [0, 1, 0],    // Bottom
            [1, 0, 0],    // Right
            [0, 0, -0.5], // Front
            [0, 0, 0.5]   // Back
        ],
        edges: [
            [0, 1], [1, 2], [2, 3], [3, 0],  // Main diamond
            [0, 4], [1, 4], [2, 4], [3, 4],  // Front connections
            [0, 5], [1, 5], [2, 5], [3, 5]   // Back connections
        ]
    },

    // Hand (simplified skeleton)
    hand: {
        name: 'hand',
        char: 'o',
        vertices: [
            // Wrist
            [0, 0, 0],
            // Thumb
            [-0.4, -0.2, 0], [-0.6, -0.5, 0], [-0.7, -0.8, 0],
            // Index
            [-0.2, -0.7, 0], [-0.2, -1.0, 0], [-0.2, -1.2, 0],
            // Middle
            [0, -0.8, 0], [0, -1.1, 0], [0, -1.3, 0],
            // Ring
            [0.2, -0.7, 0], [0.2, -1.0, 0], [0.2, -1.2, 0],
            // Pinky
            [0.4, -0.6, 0], [0.4, -0.8, 0], [0.4, -1.0, 0]
        ],
        edges: [
            // Thumb
            [0, 1], [1, 2], [2, 3],
            // Index
            [0, 4], [4, 5], [5, 6],
            // Middle
            [0, 7], [7, 8], [8, 9],
            // Ring
            [0, 10], [10, 11], [11, 12],
            // Pinky
            [0, 13], [13, 14], [14, 15]
        ]
    }
};
