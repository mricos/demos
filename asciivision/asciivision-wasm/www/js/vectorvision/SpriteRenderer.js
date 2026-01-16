/**
 * SpriteRenderer - Renders VectorVision sprites to ASCII grid
 * Supports line drawing, scaling, and simple 3D projection
 */
import { Camera3D } from '../shared/Camera3D.js';

export class SpriteRenderer {
    constructor(cols, rows) {
        this.cols = cols;
        this.rows = rows;

        // Character buffer (2D array)
        this.buffer = this._createBuffer();

        // Camera settings for 3D projection
        this.camera = {
            fov: 45,           // Field of view (degrees)
            distance: 10,      // Camera distance from origin
            near: 0.1,
            far: 100,
            zoom: 0.3          // Viewport scale (smaller = smaller sprites)
        };

        // Default character for drawing
        this.defaultChar = '*';
    }

    /**
     * Create empty buffer
     */
    _createBuffer() {
        return Array(this.rows).fill(null).map(() =>
            Array(this.cols).fill(' ')
        );
    }

    /**
     * Resize buffer
     */
    resize(cols, rows) {
        this.cols = cols;
        this.rows = rows;
        this.buffer = this._createBuffer();
    }

    /**
     * Clear buffer
     */
    clear() {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                this.buffer[y][x] = ' ';
            }
        }
    }

    /**
     * Project 3D point to 2D screen coords
     * Returns {x, y} in grid coordinates or null if behind camera
     */
    project(x, y, z) {
        // Simple perspective projection
        const d = this.camera.distance;
        const zOffset = z + d;

        if (zOffset <= this.camera.near) return null;

        const scale = d / zOffset;
        const fovScale = Math.tan((this.camera.fov * Math.PI / 180) / 2);
        const zoom = this.camera.zoom || 1;

        // Project to normalized device coordinates (-1 to 1), apply zoom
        const ndcX = x * scale * zoom / fovScale;
        const ndcY = y * scale * zoom / fovScale;

        // Convert to grid coordinates (centered)
        const gridX = (ndcX + 1) * 0.5 * this.cols;
        const gridY = (ndcY + 1) * 0.5 * this.rows;

        return { x: gridX, y: gridY };
    }

    /**
     * Set a character at grid position (with bounds checking)
     */
    setChar(x, y, char) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);

        if (ix >= 0 && ix < this.cols && iy >= 0 && iy < this.rows) {
            this.buffer[iy][ix] = char;
        }
    }

    /**
     * Draw a line between two 2D points using Bresenham's algorithm
     */
    drawLine(x0, y0, x1, y1, char) {
        x0 = Math.floor(x0);
        y0 = Math.floor(y0);
        x1 = Math.floor(x1);
        y1 = Math.floor(y1);

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            this.setChar(x0, y0, char);

            if (x0 === x1 && y0 === y1) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }
    }

    /**
     * Render a sprite to the buffer
     */
    renderSprite(sprite, options = {}) {
        const transformed = sprite.getTransformedVertices();
        const char = options.char || sprite.char || this.defaultChar;

        // Project all vertices to 2D
        const projected = transformed.map(v => this.project(v.x, v.y, v.z));

        // Draw edges
        for (const [v1, v2] of sprite.edges) {
            const p1 = projected[v1];
            const p2 = projected[v2];

            if (p1 && p2) {
                this.drawLine(p1.x, p1.y, p2.x, p2.y, char);
            }
        }

        // Draw vertices (optional)
        if (options.drawVertices !== false) {
            const vertexChar = options.vertexChar || char;
            for (const p of projected) {
                if (p) this.setChar(p.x, p.y, vertexChar);
            }
        }
    }

    /**
     * Render multiple sprites
     */
    renderSprites(sprites, options = {}) {
        for (const sprite of sprites) {
            this.renderSprite(sprite, options);
        }
    }

    /**
     * Get buffer as string
     */
    toString() {
        return this.buffer.map(row => row.join('')).join('\n');
    }

    /**
     * Get buffer as array of strings (one per row)
     */
    toLines() {
        return this.buffer.map(row => row.join(''));
    }

    /**
     * Draw text at position
     */
    drawText(x, y, text) {
        for (let i = 0; i < text.length; i++) {
            this.setChar(x + i, y, text[i]);
        }
    }

    /**
     * Draw a circle (approximate with ASCII)
     */
    drawCircle(cx, cy, radius, char = 'o') {
        const steps = Math.max(8, Math.floor(radius * 4));
        for (let i = 0; i < steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius * 0.5; // Adjust for char aspect
            this.setChar(x, y, char);
        }
    }

    /**
     * Draw a rectangle outline
     */
    drawRect(x, y, width, height, char = '#') {
        this.drawLine(x, y, x + width, y, char);
        this.drawLine(x + width, y, x + width, y + height, char);
        this.drawLine(x + width, y + height, x, y + height, char);
        this.drawLine(x, y + height, x, y, char);
    }
}
