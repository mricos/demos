/**
 * DivGraphics - CameraController
 * Instantiable camera controller extracted from APP.Camera singleton
 * Each instance can have its own camera state and transform target
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * CameraController - Per-instance camera management
     *
     * Controls camera rotation, pan, zoom for a specific viewport/scene pair.
     * Reads from InstanceState for camera parameters.
     * Can operate independently or sync with global APP.Camera.
     */
    class CameraController {
        /**
         * @param {HTMLElement} container - The scene container to apply transforms to
         * @param {HTMLElement} viewport - The viewport element (for perspective)
         * @param {InstanceState} instanceState - Per-instance state
         * @param {Object} options - Additional options
         * @param {boolean} options.enableInteraction - Enable mouse/touch interaction
         * @param {boolean} options.syncWithGlobal - Sync rotation with global camera
         */
        constructor(container, viewport, instanceState, options = {}) {
            this.container = container;
            this.viewport = viewport;
            this.state = instanceState;

            this.enableInteraction = options.enableInteraction ?? false;
            this.syncWithGlobal = options.syncWithGlobal ?? false;

            // Haze tracking
            this._lastHaze = 0;
            this._lastHazeRotX = null;
            this._lastHazeRotY = null;

            // Initialize interaction if enabled
            if (this.enableInteraction) {
                this._initInteraction();
            }

            // Apply initial FOV
            if (this.viewport && this.state.camera.fov) {
                this.viewport.style.perspective = this.state.camera.fov + 'px';
            }
        }

        /**
         * Update camera state - called each frame
         * @param {number} deltaMs - Time since last frame
         * @param {Object} timing - APP.Timing reference (optional)
         */
        update(deltaMs, timing) {
            const cam = this.state.camera;
            const config = APP.State?.defaults?.config || {
                lerpFactor: 0.1,
                autoRotateSpeed: 0.2
            };

            // Sync with global camera if enabled (for PIP showing same orbit)
            if (this.syncWithGlobal && this.state.viewMode === 'global') {
                // Copy global rotation to our target
                if (APP.Camera) {
                    cam.targetRotation.x = APP.Camera.rotation.x;
                    cam.targetRotation.y = APP.Camera.rotation.y;
                    cam.targetRotation.z = APP.Camera.rotation.z;
                } else {
                    // Fallback to state camera values if APP.Camera not ready
                    const stateCam = APP.State?.select('camera');
                    if (stateCam) {
                        cam.targetRotation.z = stateCam.rotationZ || 0;
                    }
                }
            }

            // Auto-rotate when not syncing and not in follow mode
            if (!this.syncWithGlobal && this.state.viewMode !== 'follow') {
                const autoRotate = APP.State?.select('scene.autoRotate');
                if (autoRotate && !this.state.interaction.isDragging) {
                    cam.targetRotation.y += config.autoRotateSpeed;
                }
            }

            // Smooth interpolation
            const lerp = config.lerpFactor;
            cam.rotation.x += (cam.targetRotation.x - cam.rotation.x) * lerp;
            cam.rotation.y += (cam.targetRotation.y - cam.rotation.y) * lerp;
            cam.rotation.z += (cam.targetRotation.z - cam.rotation.z) * lerp;
            cam.pan.x += (cam.targetPan.x - cam.pan.x) * lerp;
            cam.pan.y += (cam.targetPan.y - cam.pan.y) * lerp;
        }

        /**
         * Apply CSS transform to the scene container
         */
        applyTransform() {
            if (!this.container) return;

            const cam = this.state.camera;
            const follow = this.state.follow;

            // Follow mode - first person camera
            if (this.state.viewMode === 'follow' && APP.ParticleChaser?.currentPos) {
                this._applyFollowTransform();
                return;
            }

            // Overhead mode - fixed top-down view
            if (this.state.viewMode === 'overhead') {
                this.container.style.transform =
                    `scale(${cam.zoom * 0.3}) ` +
                    `rotateX(-90deg) rotateZ(0deg)`;
                return;
            }

            // Global mode - standard orbit camera
            const base = `translate(${cam.pan.x}px, ${cam.pan.y}px) scale(${cam.zoom}) `;

            if (cam.rollMode === 'view') {
                this.container.style.transform = base +
                    `rotateZ(${cam.rotation.z}deg) ` +
                    `rotateX(${cam.rotation.x}deg) ` +
                    `rotateY(${cam.rotation.y}deg)`;
            } else {
                this.container.style.transform = base +
                    `rotateX(${cam.rotation.x}deg) ` +
                    `rotateY(${cam.rotation.y}deg) ` +
                    `rotateZ(${cam.rotation.z}deg)`;
            }
        }

        /**
         * Apply first-person follow camera transform
         */
        _applyFollowTransform() {
            const chaser = APP.ParticleChaser;
            if (!chaser?.currentPos || !chaser?.currentFrame) return;

            const pos = chaser.currentPos;
            const frame = chaser.currentFrame;
            const t = frame.tangent;
            const cam = this.state.camera;
            const follow = this.state.follow;
            const config = APP.State?.defaults?.config || { lerpFactor: 0.1 };
            const lerp = config.lerpFactor * 2;

            // Calculate target yaw and pitch
            let targetYaw = Math.atan2(t.x, t.z) * 180 / Math.PI;
            const targetPitch = Math.asin(Math.max(-1, Math.min(1, -t.y))) * 180 / Math.PI;

            // Handle yaw wraparound
            let yawDiff = targetYaw - follow.yaw;
            if (yawDiff > 180) yawDiff -= 360;
            if (yawDiff < -180) yawDiff += 360;

            // Smooth interpolation
            follow.pos.x += (pos.x - follow.pos.x) * lerp;
            follow.pos.y += (pos.y - follow.pos.y) * lerp;
            follow.pos.z += (pos.z - follow.pos.z) * lerp;
            follow.yaw += yawDiff * lerp;
            follow.pitch += (targetPitch - follow.pitch) * lerp;

            // Normalize yaw
            while (follow.yaw > 180) follow.yaw -= 360;
            while (follow.yaw < -180) follow.yaw += 360;

            const cameraOffset = 500;

            this.container.style.transform =
                `translateZ(${cameraOffset}px) ` +
                `scale(${cam.zoom}) ` +
                `rotateX(${-follow.pitch}deg) ` +
                `rotateY(${-follow.yaw}deg) ` +
                `translate3d(${-follow.pos.x}px, ${-follow.pos.y}px, ${-follow.pos.z}px)`;
        }

        /**
         * Get current rotation for haze calculations
         */
        getEffectiveRotation() {
            const cam = this.state.camera;
            const follow = this.state.follow;

            if (this.state.viewMode === 'follow') {
                return {
                    x: follow.pitch,
                    y: follow.yaw,
                    z: 0
                };
            }

            if (this.state.viewMode === 'overhead') {
                return { x: -90, y: 0, z: 0 };
            }

            return {
                x: cam.rotation.x,
                y: cam.rotation.y,
                z: cam.rotation.z
            };
        }

        /**
         * Get camera position for follow mode haze
         */
        getCameraPosition() {
            if (this.state.viewMode === 'follow') {
                return this.state.follow.pos;
            }
            return null;
        }

        /**
         * Initialize mouse/touch interaction
         */
        _initInteraction() {
            const vp = this.viewport;
            if (!vp) return;

            const cam = this.state.camera;
            const interaction = this.state.interaction;
            const config = APP.State?.defaults?.config || {
                pitchClampMin: -89,
                pitchClampMax: 89,
                zoomMin: 10,
                zoomMax: 800,
                wheelZoomFactor: 0.1
            };

            // Disable context menu
            vp.addEventListener('contextmenu', (e) => {
                if (!e.shiftKey) e.preventDefault();
            });

            // Mouse drag
            vp.addEventListener('mousedown', (e) => {
                interaction.lastMouse = { x: e.clientX, y: e.clientY };
                if (e.button === 0) {
                    interaction.isDragging = true;
                } else if (e.button === 2 && !e.shiftKey) {
                    interaction.isPanning = true;
                }
            });

            // Throttled mousemove
            let lastMoveTime = 0;
            const moveThrottleMs = 16;

            window.addEventListener('mousemove', (e) => {
                if (!interaction.isDragging && !interaction.isPanning) return;

                const now = performance.now();
                if (now - lastMoveTime < moveThrottleMs) return;
                lastMoveTime = now;

                const dx = (e.clientX - interaction.lastMouse.x) * cam.sensitivity;
                const dy = (e.clientY - interaction.lastMouse.y) * cam.sensitivity;

                if (interaction.isDragging) {
                    cam.targetRotation.y += dx;
                    if (cam.pitchClamp) {
                        cam.targetRotation.x = Math.max(
                            config.pitchClampMin,
                            Math.min(config.pitchClampMax, cam.targetRotation.x + dy)
                        );
                    } else {
                        cam.targetRotation.x += dy;
                    }
                } else if (interaction.isPanning) {
                    cam.targetPan.x += e.clientX - interaction.lastMouse.x;
                    cam.targetPan.y += e.clientY - interaction.lastMouse.y;
                }

                interaction.lastMouse = { x: e.clientX, y: e.clientY };
            });

            window.addEventListener('mouseup', () => {
                interaction.isDragging = false;
                interaction.isPanning = false;
            });

            // Touch support
            vp.addEventListener('touchstart', (e) => {
                interaction.isDragging = true;
                interaction.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            });

            vp.addEventListener('touchmove', (e) => {
                if (!interaction.isDragging) return;

                const dx = (e.touches[0].clientX - interaction.lastMouse.x) * cam.sensitivity;
                const dy = (e.touches[0].clientY - interaction.lastMouse.y) * cam.sensitivity;

                cam.targetRotation.y += dx;
                if (cam.pitchClamp) {
                    cam.targetRotation.x = Math.max(
                        config.pitchClampMin,
                        Math.min(config.pitchClampMax, cam.targetRotation.x + dy)
                    );
                } else {
                    cam.targetRotation.x += dy;
                }

                interaction.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            });

            vp.addEventListener('touchend', () => interaction.isDragging = false);

            // Scroll wheel zoom
            vp.addEventListener('wheel', (e) => {
                e.preventDefault();
                const newZoom = Math.max(
                    config.zoomMin / 100,
                    Math.min(config.zoomMax / 100, cam.zoom - e.deltaY * config.wheelZoomFactor / 100)
                );
                cam.zoom = newZoom;
            }, { passive: false });
        }

        /**
         * Set FOV (perspective distance)
         */
        setFOV(fov) {
            this.state.camera.fov = fov;
            if (this.viewport) {
                this.viewport.style.perspective = fov + 'px';
            }
        }

        /**
         * Reset camera to default position
         */
        reset() {
            this.state.resetCamera();
        }
    }

    // Export
    APP.CameraController = CameraController;

})(window.APP);
