/**
 * GeometryConfig - Manages camera, ASCII output, and mapping geometry
 * Central configuration for the rendering pipeline
 */

// Default character ramps
export const CharacterRamps = {
    detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
    simple: " .:-=+*#%@",
    blocks: " ░▒▓█",
    dots: " ·•●",
    binary: " █",
    ascii: " .,:;+*?%#@",
    minimal: " .-+*#"
};

export class GeometryConfig {
    constructor() {
        // Camera input geometry (source)
        this.camera = {
            width: 1280,
            height: 720,
            aspectRatio: 16/9,
            mirrored: true
        };

        // ASCII output geometry (destination)
        this.ascii = {
            cols: 100,
            rows: 60,
            charAspect: 0.55,  // monospace char width/height ratio
            fontSize: 10
        };

        // Character mapping
        this.charmap = {
            ramp: CharacterRamps.detailed,
            rampName: 'detailed',
            inverted: false
        };

        // Coordinate mapping settings
        this.mapping = {
            // Scale factors (computed)
            scaleX: 1,
            scaleY: 1,
            // Offsets for calibration
            offsetX: 0,
            offsetY: 0,
            // Phase rotation (degrees)
            phase: 0
        };

        // Processing settings
        this.processing = {
            brightness: 1.0,
            contrast: 1.0,
            invert: false
        };

        // Listeners for config changes
        this._listeners = [];

        this._computeScales();
    }

    /**
     * Compute scale factors from camera to ASCII grid
     */
    _computeScales() {
        this.mapping.scaleX = this.camera.width / this.ascii.cols;
        this.mapping.scaleY = this.camera.height / this.ascii.rows;
    }

    /**
     * Set camera dimensions
     */
    setCamera(width, height) {
        this.camera.width = width;
        this.camera.height = height;
        this.camera.aspectRatio = width / height;
        this._computeScales();
        this._notify('camera');
    }

    /**
     * Set ASCII grid dimensions
     */
    setAscii(cols, rows) {
        this.ascii.cols = cols;
        this.ascii.rows = rows;
        this._computeScales();
        this._notify('ascii');
    }

    /**
     * Set character ramp by name or custom string
     */
    setCharRamp(rampOrName) {
        if (typeof rampOrName === 'string' && CharacterRamps[rampOrName]) {
            this.charmap.ramp = CharacterRamps[rampOrName];
            this.charmap.rampName = rampOrName;
        } else if (typeof rampOrName === 'string') {
            this.charmap.ramp = rampOrName;
            this.charmap.rampName = 'custom';
        }
        this._notify('charmap');
    }

    /**
     * Get character for grayscale value (0-255)
     */
    getChar(gray) {
        const ramp = this.charmap.ramp;
        const value = this.charmap.inverted ? 255 - gray : gray;
        const index = Math.floor((value / 255) * (ramp.length - 1));
        return ramp[Math.max(0, Math.min(ramp.length - 1, index))];
    }

    /**
     * Convert camera pixel coords to ASCII grid coords
     */
    cameraToGrid(camX, camY) {
        let x = camX / this.mapping.scaleX;
        let y = camY / this.mapping.scaleY;

        // Apply mirroring
        if (this.camera.mirrored) {
            x = this.ascii.cols - 1 - x;
        }

        // Apply offsets
        x += this.mapping.offsetX;
        y += this.mapping.offsetY;

        return { x, y };
    }

    /**
     * Convert normalized coords (0-1) to ASCII grid coords
     */
    normalizedToGrid(normX, normY) {
        let x = normX * this.ascii.cols;
        let y = normY * this.ascii.rows;

        // Apply mirroring
        if (this.camera.mirrored) {
            x = this.ascii.cols - x;
        }

        // Apply offsets
        x += this.mapping.offsetX;
        y += this.mapping.offsetY;

        return { x, y };
    }

    /**
     * Convert ASCII grid coords to normalized (0-1)
     */
    gridToNormalized(gridX, gridY) {
        let x = gridX / this.ascii.cols;
        let y = gridY / this.ascii.rows;

        if (this.camera.mirrored) {
            x = 1 - x;
        }

        return { x, y };
    }

    /**
     * Get info object for display
     */
    getInfo() {
        return {
            camera: `${this.camera.width}x${this.camera.height}`,
            ascii: `${this.ascii.cols}x${this.ascii.rows}`,
            scale: `${this.mapping.scaleX.toFixed(2)}x${this.mapping.scaleY.toFixed(2)}`,
            ramp: this.charmap.rampName,
            rampLength: this.charmap.ramp.length
        };
    }

    /**
     * Serialize to JSON
     */
    toJSON() {
        return {
            camera: { ...this.camera },
            ascii: { ...this.ascii },
            charmap: { ...this.charmap },
            mapping: { ...this.mapping },
            processing: { ...this.processing }
        };
    }

    /**
     * Load from JSON
     */
    fromJSON(data) {
        if (data.camera) Object.assign(this.camera, data.camera);
        if (data.ascii) Object.assign(this.ascii, data.ascii);
        if (data.charmap) Object.assign(this.charmap, data.charmap);
        if (data.mapping) Object.assign(this.mapping, data.mapping);
        if (data.processing) Object.assign(this.processing, data.processing);
        this._computeScales();
        this._notify('all');
    }

    /**
     * Subscribe to changes
     */
    onChange(fn) {
        this._listeners.push(fn);
        return () => {
            this._listeners = this._listeners.filter(f => f !== fn);
        };
    }

    _notify(what) {
        for (const fn of this._listeners) {
            try { fn(what, this); } catch (e) { console.warn('GeometryConfig listener error:', e); }
        }
    }
}

// Singleton instance
let _instance = null;
export function getGeometryConfig() {
    if (!_instance) _instance = new GeometryConfig();
    return _instance;
}
