/**
 * PlasmaOverlay - Integrates PlasmaVision WebGL rendering with DivGraphics
 *
 * Creates a transparent WebGL canvas overlay that syncs with CSS 3D camera.
 * Converts CSS perspective to WebGL projection matrix.
 */

import { vec3, mat4 } from './math/index.js';
import { PlasmaRenderer } from './PlasmaRenderer.js?v=7';
import { PlasmaField, PlasmaMass, PlasmaWireframe } from './PlasmaGlow.js?v=7';

/**
 * Convert CSS perspective (in pixels) to WebGL field of view (in radians)
 *
 * CSS perspective: distance from viewer to z=0 plane
 * WebGL FOV: vertical field of view angle
 *
 * Formula: fov = 2 * atan(viewportHeight / 2 / perspective)
 *
 * @param {number} perspectivePx - CSS perspective value in pixels
 * @param {number} viewportHeight - Viewport height in pixels
 * @returns {number} FOV in radians
 */
export function cssPerspectiveToFov(perspectivePx, viewportHeight) {
    return 2 * Math.atan(viewportHeight / 2 / perspectivePx);
}

/**
 * Convert FOV (radians) back to CSS perspective (pixels)
 */
export function fovToCssPerspective(fovRadians, viewportHeight) {
    return (viewportHeight / 2) / Math.tan(fovRadians / 2);
}

/**
 * PlasmaOverlay - WebGL overlay for DivGraphics
 */
export class PlasmaOverlay {
    /**
     * @param {HTMLElement} viewport - DivGraphics viewport element
     * @param {Object} options - Configuration options
     */
    constructor(viewport, options = {}) {
        this.viewport = viewport;
        this.options = {
            zIndex: options.zIndex ?? 10,
            opacity: options.opacity ?? 1.0,
            blendMode: options.blendMode ?? 'screen',  // CSS mix-blend-mode
            // PlasmaRenderer options
            phosphorDecay: options.phosphorDecay ?? 0.85,
            bloomIntensity: options.bloomIntensity ?? 0.4,
            scanlineIntensity: options.scanlineIntensity ?? 0.1,
            pointSize: options.pointSize ?? 3.0,
            backgroundColor: options.backgroundColor || [0, 0, 0, 0]  // Transparent
        };

        // Create canvas overlay
        this.canvas = this._createCanvas();
        this.renderer = null;

        // Plasma scene
        this.field = new PlasmaField();
        this.wireframes = [];

        // Camera sync
        this._lastCssRotation = { x: 0, y: 0, z: 0 };
        this._lastCssZoom = 1;
        this._lastCssPerspective = 1000;

        // Animation
        this._animating = false;
        this._lastTime = 0;

        // Initialize
        this._initRenderer();
        this._initResizeObserver();
    }

    _createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.id = 'plasma-overlay';
        canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: ${this.options.zIndex};
            opacity: ${this.options.opacity};
            mix-blend-mode: ${this.options.blendMode};
        `;

        // Size to viewport
        const rect = this.viewport.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        this.viewport.appendChild(canvas);
        return canvas;
    }

    _initRenderer() {
        try {
            this.renderer = new PlasmaRenderer(this.canvas, {
                phosphorDecay: this.options.phosphorDecay,
                bloomIntensity: this.options.bloomIntensity,
                scanlineIntensity: this.options.scanlineIntensity,
                pointSize: this.options.pointSize,
                backgroundColor: [0, 0, 0]  // Renderer clears to black, we blend via CSS
            });

            // Set initial camera distance based on typical DivGraphics scale
            this.renderer.camera.position = vec3.create(0, 0, 400);

        } catch (e) {
            console.error('PlasmaOverlay: WebGL init failed', e);
            this.canvas.remove();
            this.canvas = null;
        }
    }

    _initResizeObserver() {
        if (!this.canvas) return;

        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                const dpr = window.devicePixelRatio || 1;
                this.canvas.width = width * dpr;
                this.canvas.height = height * dpr;
                if (this.renderer) {
                    this.renderer.resize(width * dpr, height * dpr);
                }
            }
        });

        ro.observe(this.viewport);
        this._resizeObserver = ro;
    }

    /**
     * Sync camera with DivGraphics CSS transform
     *
     * @param {Object} cssCamera - DivGraphics camera state
     * @param {number} cssCamera.rotationX - X rotation in degrees
     * @param {number} cssCamera.rotationY - Y rotation in degrees
     * @param {number} cssCamera.rotationZ - Z rotation in degrees
     * @param {number} cssCamera.zoom - Zoom factor (1.0 = 100%)
     * @param {number} cssCamera.perspective - CSS perspective in pixels
     */
    syncCamera(cssCamera) {
        if (!this.renderer) return;

        // Store for change detection
        this._lastCssRotation = {
            x: cssCamera.rotationX ?? 0,
            y: cssCamera.rotationY ?? 0,
            z: cssCamera.rotationZ ?? 0
        };
        this._lastCssZoom = cssCamera.zoom ?? 1;
        this._lastCssPerspective = cssCamera.perspective ?? 1000;

        // Convert CSS perspective to WebGL FOV
        const viewportHeight = this.canvas.height / (window.devicePixelRatio || 1);
        const fovRadians = cssPerspectiveToFov(this._lastCssPerspective, viewportHeight);
        this.renderer.camera.fov = fovRadians * 180 / Math.PI;  // Store as degrees

        // Apply rotation (WebGL Y-up, CSS uses different conventions)
        // DivGraphics rotateX is pitch, rotateY is yaw, rotateZ is roll
        this.renderer.setRotation(
            -this._lastCssRotation.x * Math.PI / 180,  // Pitch (negate for WebGL)
            -this._lastCssRotation.y * Math.PI / 180   // Yaw (negate for WebGL)
        );

        // Zoom affects camera distance
        // Base distance of 400px, zoom scales it inversely
        const baseDistance = 400;
        this.renderer.camera.position.z = baseDistance / this._lastCssZoom;
    }

    /**
     * Add a plasma mass to the field
     */
    addMass(options) {
        const mass = new PlasmaMass(options);
        this.field.addMass(mass);
        return mass;
    }

    /**
     * Add a wireframe to the scene
     */
    addWireframe(wireframe) {
        this.wireframes.push(wireframe);
        return wireframe;
    }

    /**
     * Create and add a sphere wireframe
     */
    addSphere(options = {}) {
        // Scale from DivGraphics pixels to PlasmaVision units
        // DivGraphics radius ~100-200px, PlasmaVision expects ~1-2 units
        const scale = options.scale ?? 0.01;  // 100px → 1 unit

        const wf = PlasmaWireframe.sphere({
            radius: (options.radius ?? 100) * scale,
            latSegments: options.latSegments ?? 8,
            lonSegments: options.lonSegments ?? 12,
            color: options.color ?? [0, 1, 0.5],
            glow: options.glow ?? 1.0,
            glowRadius: options.glowRadius ?? 0.1
        });

        this.wireframes.push(wf);
        return wf;
    }

    /**
     * Create and add a cube wireframe
     */
    addCube(options = {}) {
        const scale = options.scale ?? 0.01;

        const wf = PlasmaWireframe.cube({
            size: (options.size ?? 50) * scale,
            color: options.color ?? [1, 0.5, 0],
            glow: options.glow ?? 1.0,
            glowRadius: options.glowRadius ?? 0.08
        });

        this.wireframes.push(wf);
        return wf;
    }

    /**
     * Start animation loop
     */
    start() {
        if (this._animating || !this.renderer) return;
        this._animating = true;
        this._lastTime = performance.now();
        this._animate();
    }

    /**
     * Stop animation loop
     */
    stop() {
        this._animating = false;
    }

    _animate() {
        if (!this._animating) return;

        const now = performance.now();
        const dt = (now - this._lastTime) / 1000;
        this._lastTime = now;

        // Update plasma field
        this.field.update(dt);

        // Sample glow points from all wireframes
        const allPoints = [];
        const allSegments = [];

        for (const wf of this.wireframes) {
            const points = wf.sampleAllGlow(this.field, 6, 6);
            allPoints.push(...points);
            allSegments.push(...wf.segments);
        }

        // Upload and render
        this.renderer.uploadLines(allSegments);
        this.renderer.uploadGlowPoints(allPoints);
        this.renderer.render(dt);

        requestAnimationFrame(() => this._animate());
    }

    /**
     * Render single frame (for manual control)
     */
    renderFrame(dt = 1/60) {
        if (!this.renderer) return;

        this.field.update(dt);

        const allPoints = [];
        const allSegments = [];

        for (const wf of this.wireframes) {
            const points = wf.sampleAllGlow(this.field, 6, 6);
            allPoints.push(...points);
            allSegments.push(...wf.segments);
        }

        this.renderer.uploadLines(allSegments);
        this.renderer.uploadGlowPoints(allPoints);
        this.renderer.render(dt);
    }

    /**
     * Set blend mode
     */
    setBlendMode(mode) {
        if (this.canvas) {
            this.canvas.style.mixBlendMode = mode;
        }
    }

    /**
     * Set opacity
     */
    setOpacity(opacity) {
        if (this.canvas) {
            this.canvas.style.opacity = opacity;
        }
    }

    /**
     * Get renderer options for UI binding
     */
    getOptions() {
        return this.renderer?.options ?? {};
    }

    /**
     * Update renderer option
     */
    setOption(key, value) {
        if (this.renderer?.options) {
            this.renderer.options[key] = value;
        }
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        this.stop();

        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }

        if (this.renderer) {
            this.renderer.destroy();
        }

        if (this.canvas) {
            this.canvas.remove();
        }

        this.wireframes = [];
        this.field = new PlasmaField();
    }
}

export default PlasmaOverlay;
