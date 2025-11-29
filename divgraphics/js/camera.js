/**
 * DivGraphics - Camera Module
 * 3D camera control with full rotation axes, pan, and zoom
 * Integrates with State system for MIDI/gamepad learning
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.Camera = {
        container: null,
        viewport: null,

        // Runtime state (smoothed values)
        rotation: { x: -20, y: 0, z: 0 },
        targetRotation: { x: -20, y: 0, z: 0 },
        pan: { x: 0, y: 0 },
        targetPan: { x: 0, y: 0 },
        zoom: 1,

        // Interaction state
        isDragging: false,
        isPanning: false,
        lastMouse: { x: 0, y: 0 },

        // Cached from State
        sensitivity: 0.5,
        pitchClamp: false,
        rollMode: 'view',
        _lastHaze: 0,
        _lastHazeRotX: null,
        _lastHazeRotY: null,

        init(container, viewport) {
            this.container = container;
            this.viewport = viewport;

            this._restoreFromState();
            this._subscribe();
            this._initInteraction();
            this._startAnimationLoop();
        },

        _restoreFromState() {
            const config = APP.State.defaults.config;
            const cam = APP.State.select('camera');
            if (cam) {
                this.zoom = cam.zoom / config.zoomScale;
                this.targetRotation.z = cam.rotationZ;
                this.rotation.z = cam.rotationZ;
                this.targetPan.x = cam.panX;
                this.targetPan.y = cam.panY;
                this.pan.x = cam.panX;
                this.pan.y = cam.panY;
                this.sensitivity = cam.sensitivity / config.sensitivityScale;
                this.pitchClamp = cam.pitchClamp;
                this.rollMode = cam.rollMode || 'view';
                // Apply FOV to viewport
                if (this.viewport && cam.fov) {
                    this.viewport.style.perspective = cam.fov + 'px';
                }
            }
        },

        _subscribe() {
            const config = APP.State.defaults.config;
            // Subscribe to state changes (from UI, MIDI, gamepad)
            APP.State.subscribe('camera.zoom', (val) => {
                this.zoom = val / config.zoomScale;
            });
            APP.State.subscribe('camera.rotationZ', (val) => {
                this.targetRotation.z = val;
            });
            APP.State.subscribe('camera.panX', (val) => {
                this.targetPan.x = val;
            });
            APP.State.subscribe('camera.panY', (val) => {
                this.targetPan.y = val;
            });
            APP.State.subscribe('camera.sensitivity', (val) => {
                this.sensitivity = val / config.sensitivityScale;
            });
            APP.State.subscribe('camera.pitchClamp', (val) => {
                this.pitchClamp = val;
            });
            APP.State.subscribe('camera.rollMode', (val) => {
                this.rollMode = val || 'view';
            });
            APP.State.subscribe('camera.fov', (val) => {
                if (this.viewport) {
                    this.viewport.style.perspective = val + 'px';
                }
            });
        },

        _handleDrag(clientX, clientY) {
            const config = APP.State.defaults.config;
            const dx = (clientX - this.lastMouse.x) * this.sensitivity;
            const dy = (clientY - this.lastMouse.y) * this.sensitivity;

            this.targetRotation.y += dx;
            if (this.pitchClamp) {
                this.targetRotation.x = Math.max(
                    config.pitchClampMin,
                    Math.min(config.pitchClampMax, this.targetRotation.x + dy)
                );
            } else {
                this.targetRotation.x += dy;
            }
            this.lastMouse = { x: clientX, y: clientY };
        },

        _initInteraction() {
            const vp = this.viewport;
            const config = APP.State.defaults.config;

            // Disable context menu for right-click panning (Shift+Right-click allows context menu)
            vp.addEventListener('contextmenu', (e) => {
                if (!e.shiftKey) e.preventDefault();
            });

            // Mouse drag: left = rotate, right = pan (Shift+right = context menu)
            vp.addEventListener('mousedown', (e) => {
                this.lastMouse = { x: e.clientX, y: e.clientY };
                if (e.button === 0) {
                    this.isDragging = true;
                } else if (e.button === 2 && !e.shiftKey) {
                    this.isPanning = true;
                }
            });

            // Throttle mousemove to reduce render pressure
            let lastMoveTime = 0;
            const moveThrottleMs = 16; // ~60fps max input rate

            window.addEventListener('mousemove', (e) => {
                if (!this.isDragging && !this.isPanning) return;

                const now = performance.now();
                if (now - lastMoveTime < moveThrottleMs) return;
                lastMoveTime = now;

                if (this.isDragging) {
                    this._handleDrag(e.clientX, e.clientY);
                } else if (this.isPanning) {
                    // Pan - update State for persistence
                    const dx = e.clientX - this.lastMouse.x;
                    const dy = e.clientY - this.lastMouse.y;
                    const newPanX = this.targetPan.x + dx;
                    const newPanY = this.targetPan.y + dy;
                    APP.State.dispatch({ type: 'camera.panX', payload: newPanX });
                    APP.State.dispatch({ type: 'camera.panY', payload: newPanY });
                    this.lastMouse = { x: e.clientX, y: e.clientY };
                }
            });

            window.addEventListener('mouseup', () => {
                this.isDragging = false;
                this.isPanning = false;
            });

            // Touch - uses same drag handler as mouse
            vp.addEventListener('touchstart', (e) => {
                this.isDragging = true;
                this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            });

            vp.addEventListener('touchmove', (e) => {
                if (!this.isDragging) return;
                this._handleDrag(e.touches[0].clientX, e.touches[0].clientY);
            });

            vp.addEventListener('touchend', () => this.isDragging = false);

            // Scroll wheel zoom - update State
            vp.addEventListener('wheel', (e) => {
                e.preventDefault();
                const currentZoom = APP.State.select('camera.zoom') || config.zoomScale;
                const newZoom = Math.max(
                    config.zoomMin,
                    Math.min(config.zoomMax, currentZoom - e.deltaY * config.wheelZoomFactor)
                );
                APP.State.dispatch({ type: 'camera.zoom', payload: Math.round(newZoom) });
            }, { passive: false });
        },

        _startAnimationLoop() {
            const config = APP.State.defaults.config;
            const animate = () => {
                APP.Stats?.beginFrame();
                try {
                    const autoRotate = APP.State.select('scene.autoRotate');
                    if (autoRotate && !this.isDragging) {
                        this.targetRotation.y += config.autoRotateSpeed;
                    }

                    // Smooth interpolation
                    const lerp = config.lerpFactor;
                    this.rotation.x += (this.targetRotation.x - this.rotation.x) * lerp;
                    this.rotation.y += (this.targetRotation.y - this.rotation.y) * lerp;
                    this.rotation.z += (this.targetRotation.z - this.rotation.z) * lerp;
                    this.pan.x += (this.targetPan.x - this.pan.x) * lerp;
                    this.pan.y += (this.targetPan.y - this.pan.y) * lerp;

                    this.applyTransform();

                    // Update view-space haze on geometry (only when rotation changed)
                    const hazeIntensity = APP.State?.select('display.haze') || 0;
                    const hazeChanged = hazeIntensity !== this._lastHaze;
                    const rotChanged = this._lastHazeRotX === null ||
                        Math.abs(this.rotation.x - this._lastHazeRotX) > 0.5 ||
                        Math.abs(this.rotation.y - this._lastHazeRotY) > 0.5;

                    if ((hazeIntensity > 0 && rotChanged) || hazeChanged) {
                        const hazeOpts = {
                            rotX: this.rotation.x,
                            rotY: this.rotation.y,
                            rotZ: this.rotation.z,
                            intensity: hazeIntensity,
                            rollMode: this.rollMode
                        };
                        APP.Scene?.outerCylinder?.updateHaze(hazeOpts);
                        APP.Scene?.innerCylinder?.updateHaze(hazeOpts);
                        APP.Scene?.curve?.updateHaze(hazeOpts);
                        this._lastHaze = hazeIntensity;
                        this._lastHazeRotX = this.rotation.x;
                        this._lastHazeRotY = this.rotation.y;
                    }
                } catch (e) {
                    console.error('Animation error:', e);
                }
                APP.Stats?.endFrame();
                requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        },

        applyTransform() {
            if (!this.container) return;

            const base = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom}) `;

            if (this.rollMode === 'view') {
                // VIEW mode: Z → X → Y (Z is view-space roll, applied last)
                // CSS applies right-to-left, so Z on left = applied last
                this.container.style.transform = base +
                    `rotateZ(${this.rotation.z}deg) ` +
                    `rotateX(${this.rotation.x}deg) ` +
                    `rotateY(${this.rotation.y}deg)`;
            } else {
                // WORLD mode: X → Y → Z (Z is world-space roll, applied first)
                this.container.style.transform = base +
                    `rotateX(${this.rotation.x}deg) ` +
                    `rotateY(${this.rotation.y}deg) ` +
                    `rotateZ(${this.rotation.z}deg)`;
            }
        },

        setRotation(x, y, z) {
            if (x !== undefined) this.targetRotation.x = x;
            if (y !== undefined) this.targetRotation.y = y;
            if (z !== undefined) this.targetRotation.z = z;
        },

        setZoom(value) {
            const config = APP.State.defaults.config;
            APP.State.dispatch({ type: 'camera.zoom', payload: Math.round(value * config.zoomScale) });
        },

        resetView() {
            const config = APP.State.defaults.config;
            this.targetRotation = { x: -20, y: 0, z: 0 };
            APP.State.dispatch({ type: 'camera.zoom', payload: config.zoomScale });
            APP.State.dispatch({ type: 'camera.rotationZ', payload: 0 });
            APP.State.dispatch({ type: 'camera.panX', payload: 0 });
            APP.State.dispatch({ type: 'camera.panY', payload: 0 });
        }
    };

})(window.APP);
