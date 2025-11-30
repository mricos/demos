/**
 * DivGraphics - DivGraphicsInstance
 * A complete self-contained instance of the DivGraphics engine
 * Combines InstanceState, CameraController, and SceneRenderer
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * DivGraphicsInstance - Complete rendering instance
     *
     * Creates a viewport/scene DOM structure and manages:
     * - Camera (CameraController)
     * - Scene rendering (SceneRenderer)
     * - Instance-specific state (InstanceState)
     */
    class DivGraphicsInstance {
        /**
         * @param {Object} options - Instance configuration
         * @param {string} options.id - Unique instance identifier
         * @param {HTMLElement} options.container - Parent element to append viewport to
         * @param {GeometryData} options.sharedGeometry - Shared geometry data
         * @param {string} options.preset - LOD preset ('primary', 'pip', 'stereo', 'symbolic')
         * @param {number} options.lod - Override LOD multiplier
         * @param {string} options.viewMode - Initial view mode ('global', 'follow', 'overhead')
         * @param {boolean} options.enableInteraction - Enable mouse/touch camera control
         * @param {boolean} options.syncWithGlobal - Sync camera with global APP.Camera
         * @param {number} options.fov - Field of view (perspective distance)
         */
        constructor(options) {
            this.id = options.id || 'instance-' + Date.now();
            this.parentContainer = options.container;
            this.sharedGeometry = options.sharedGeometry;

            // Create instance state
            this.instanceState = new APP.InstanceState(this.id, {
                preset: options.preset || 'primary',
                lod: options.lod,
                viewMode: options.viewMode || 'global',
                eyeOffset: options.eyeOffset,
                initialZoom: options.initialZoom
            });

            // Create DOM structure
            this._createDOM();

            // Apply custom FOV if specified
            if (options.fov) {
                this.instanceState.camera.fov = options.fov;
            }

            // Create camera controller
            this.camera = new APP.CameraController(
                this.sceneEl,
                this.viewportEl,
                this.instanceState,
                {
                    enableInteraction: options.enableInteraction ?? false,
                    syncWithGlobal: options.syncWithGlobal ?? false
                }
            );

            // Create scene renderer
            this.renderer = new APP.SceneRenderer(
                this.sceneEl,
                this.instanceState,
                this.sharedGeometry
            );

            // Track if instance is active
            this.active = true;
        }

        /**
         * Create the viewport and scene DOM elements
         */
        _createDOM() {
            // Viewport - provides perspective
            this.viewportEl = document.createElement('div');
            this.viewportEl.className = 'viewport instance-viewport';
            this.viewportEl.id = `viewport-${this.id}`;
            this.viewportEl.style.cssText = `
                flex: 1;
                width: 100%;
                min-height: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                perspective: ${this.instanceState.camera.fov}px;
                perspective-origin: center center;
                overflow: hidden;
            `;

            // Scene - 3D transform container
            this.sceneEl = document.createElement('div');
            this.sceneEl.className = 'scene instance-scene';
            this.sceneEl.id = `scene-${this.id}`;
            this.sceneEl.style.cssText = `
                position: relative;
                transform-style: preserve-3d;
            `;

            this.viewportEl.appendChild(this.sceneEl);
            this.parentContainer.appendChild(this.viewportEl);
        }

        /**
         * Update the instance - called each frame
         * @param {number} deltaMs - Time since last frame
         * @param {Object} appState - Global APP.State.state
         * @param {Object} timing - APP.Timing reference
         */
        update(deltaMs, appState, timing) {
            if (!this.active) return;

            // Check update frequency (skip frames for PIP etc)
            if (!this.instanceState.shouldUpdate()) {
                return;
            }

            // Update camera
            this.camera.update(deltaMs, timing);
            this.camera.applyTransform();

            // Update scene renderer
            this.renderer.render(appState);

            // Update haze effects
            const hazeIntensity = APP.State?.select('display.haze') || 0;
            if (hazeIntensity > 0) {
                const rot = this.camera.getEffectiveRotation();
                this.renderer.updateHaze({
                    rotX: rot.x,
                    rotY: rot.y,
                    rotZ: rot.z,
                    intensity: hazeIntensity,
                    rollMode: this.instanceState.camera.rollMode,
                    camPos: this.camera.getCameraPosition()
                });
            }
        }

        /**
         * Force rebuild all geometry
         */
        rebuildGeometry() {
            this.renderer.rebuildAll();
        }

        /**
         * Set view mode
         */
        setViewMode(mode) {
            this.instanceState.setViewMode(mode);
        }

        /**
         * Set LOD level
         */
        setLOD(lod) {
            this.instanceState.lod = lod;
            this.renderer.rebuildAll();
        }

        /**
         * Get stats for this instance
         */
        getStats() {
            return this.renderer.getStats();
        }

        /**
         * Show the instance
         */
        show() {
            this.viewportEl.style.display = 'flex';
            this.active = true;
        }

        /**
         * Hide the instance
         */
        hide() {
            this.viewportEl.style.display = 'none';
            this.active = false;
        }

        /**
         * Destroy the instance and cleanup DOM
         */
        destroy() {
            this.active = false;
            this.renderer.destroy();
            if (this.viewportEl.parentNode) {
                this.viewportEl.parentNode.removeChild(this.viewportEl);
            }
            this.viewportEl = null;
            this.sceneEl = null;
        }
    }

    // Export
    APP.DivGraphicsInstance = DivGraphicsInstance;

})(window.APP);
