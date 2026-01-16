/**
 * SkeletonRenderer - Draws hand skeleton as red ASCII/UTF-8 characters
 * Perfect registration with ASCII output using same character grid
 */

export class SkeletonRenderer {
    constructor(overlayElement, width, height) {
        this.overlay = overlayElement;
        this.width = width;
        this.height = height;
        this.visible = true;

        // Calibration for skeleton position only
        this.calibration = {
            offsetX: 0,
            offsetY: 0,
            scale: 1.0
        };

        // UTF-8 characters for skeleton
        this.chars = {
            joint: '●',      // Joints
            tip: '◉',        // Fingertips
            wrist: '◎',      // Wrist
            boneH: '─',      // Horizontal bone
            boneV: '│',      // Vertical bone
            boneDR: '╲',     // Diagonal down-right
            boneDL: '╱',     // Diagonal down-left
            dot: '·',        // Small marker
        };

        // Hand connections
        this.connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],      // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8],      // Index
            [0, 9], [9, 10], [10, 11], [11, 12], // Middle
            [0, 13], [13, 14], [14, 15], [15, 16], // Ring
            [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
            [5, 9], [9, 13], [13, 17]             // Palm
        ];

        // Fingertip indices
        this.tips = [4, 8, 12, 16, 20];
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;
    }

    toggle() {
        this.visible = !this.visible;
        if (!this.visible) {
            this.clear();
        }
        return this.visible;
    }

    clear() {
        this.overlay.textContent = '';
    }

    setCalibration(cal) {
        Object.assign(this.calibration, cal);
    }

    /**
     * Convert normalized landmark to grid coordinates
     * Always mirrors for front-facing camera (natural view)
     */
    toGrid(point) {
        // Mirror horizontally for natural front-camera view
        let x = 1 - point.x;
        let y = point.y;

        // Apply calibration offsets
        x = x + this.calibration.offsetX;
        y = y + this.calibration.offsetY;

        // Convert to grid coordinates
        const gridX = Math.round(x * this.width);
        const gridY = Math.round(y * this.height);

        return { x: gridX, y: gridY };
    }

    /**
     * Get line character based on angle
     */
    getLineChar(dx, dy) {
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const absAngle = Math.abs(angle);

        if (absAngle < 30 || absAngle > 150) {
            return this.chars.boneH;
        } else if (absAngle > 60 && absAngle < 120) {
            return this.chars.boneV;
        } else if ((angle > 30 && angle < 60) || (angle > -150 && angle < -120)) {
            return this.chars.boneDR;
        } else {
            return this.chars.boneDL;
        }
    }

    /**
     * Draw line between two grid points using Bresenham
     */
    drawLine(grid, x0, y0, x1, y1, char) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        let x = x0, y = y0;
        while (true) {
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                if (!grid[y][x]) {
                    grid[y][x] = char;
                }
            }

            if (x === x1 && y === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x += sx; }
            if (e2 < dx) { err += dx; y += sy; }
        }
    }

    /**
     * Render hand skeleton as ASCII
     */
    render(landmarks) {
        if (!this.visible || !landmarks) {
            this.clear();
            return;
        }

        // Create empty grid
        const grid = Array(this.height).fill(null).map(() => Array(this.width).fill(null));

        // Convert all landmarks to grid coords
        const points = landmarks.map(lm => this.toGrid(lm));

        // Draw bones (connections) first
        for (const [from, to] of this.connections) {
            const p1 = points[from];
            const p2 = points[to];
            const lineChar = this.getLineChar(p2.x - p1.x, p2.y - p1.y);
            this.drawLine(grid, p1.x, p1.y, p2.x, p2.y, lineChar);
        }

        // Draw joints on top
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p.x >= 0 && p.x < this.width && p.y >= 0 && p.y < this.height) {
                if (i === 0) {
                    grid[p.y][p.x] = this.chars.wrist;
                } else if (this.tips.includes(i)) {
                    grid[p.y][p.x] = this.chars.tip;
                } else {
                    grid[p.y][p.x] = this.chars.joint;
                }
            }
        }

        // Convert grid to string
        let output = '';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                output += grid[y][x] || ' ';
            }
            if (y < this.height - 1) output += '\n';
        }

        this.overlay.textContent = output;
    }
}
