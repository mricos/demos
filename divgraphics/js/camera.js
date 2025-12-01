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
        _lastGreenDesat: 0,
        _lastBlur: 0,
        _lastHazeRotX: null,
        _lastHazeRotY: null,
        _lastTrackHazeTime: 0,

        // Follow cam smoothing
        _followPos: { x: 0, y: 0, z: 0 },
        _followYaw: 0,
        _followPitch: 0,

        // Follow mode look-around offset (resets when not dragging)
        _lookOffset: { yaw: 0, pitch: 0 },

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

            // In follow mode, update look offset instead of global rotation
            const followMode = APP.State?.select('chaser.follow');
            if (followMode) {
                // Clamp look offset to reasonable range
                this._lookOffset.yaw = Math.max(-120, Math.min(120, this._lookOffset.yaw + dx));
                this._lookOffset.pitch = Math.max(-60, Math.min(60, this._lookOffset.pitch + dy));
            } else {
                this.targetRotation.y += dx;
                if (this.pitchClamp) {
                    this.targetRotation.x = Math.max(
                        config.pitchClampMin,
                        Math.min(config.pitchClampMax, this.targetRotation.x + dy)
                    );
                } else {
                    this.targetRotation.x += dy;
                }
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
            let lastTime = performance.now();

            const animate = (currentTime) => {
                const deltaMs = currentTime - lastTime;
                lastTime = currentTime;

                APP.Stats?.beginFrame();
                try {
                    // Update timing system
                    APP.Timing?.tick(deltaMs);

                    // Update modulation sources (LFO, keyboard)
                    APP.LFOEngine?.update(deltaMs);
                    APP.KeyboardInput?.update(deltaMs);

                    // Update particle chaser
                    APP.ParticleChaser?.update(deltaMs);

                    // Update collision detection
                    APP.Collision?.update();

                    // Update audio system with chaser data
                    if (APP.AudioEngine && APP.ParticleChaser) {
                        const chaser = APP.ParticleChaser;
                        const chaserData = chaser.currentPos ? {
                            pos: chaser.currentPos,
                            frame: chaser.currentFrame,
                            t: chaser.t,
                            velocity: chaser._lastVelocity || null
                        } : null;
                        const cameraData = {
                            position: this._followPos || { x: 0, y: 0, z: 300 },
                            rotation: this.rotation
                        };
                        // Include collision data for audio triggers
                        const collisionData = APP.Collision ? {
                            proximity: APP.Collision.proximity,
                            penetration: APP.Collision.penetration,
                            isColliding: APP.Collision._wasColliding
                        } : null;
                        APP.AudioEngine.update(chaserData, cameraData, deltaMs, collisionData);
                    }

                    // BPM-driven rotation when playing, otherwise use autoRotate
                    const playing = APP.State.select('animation.playing');
                    if (playing && !this.isDragging) {
                        const rotRate = APP.Timing?.getRotationRate() || 0;
                        this.targetRotation.y += rotRate * deltaMs;
                    } else {
                        const autoRotate = APP.State.select('scene.autoRotate');
                        if (autoRotate && !this.isDragging) {
                            this.targetRotation.y += config.autoRotateSpeed;
                        }
                    }

                    // Smooth interpolation
                    const lerp = config.lerpFactor;
                    this.rotation.x += (this.targetRotation.x - this.rotation.x) * lerp;
                    this.rotation.y += (this.targetRotation.y - this.rotation.y) * lerp;
                    this.rotation.z += (this.targetRotation.z - this.rotation.z) * lerp;
                    this.pan.x += (this.targetPan.x - this.pan.x) * lerp;
                    this.pan.y += (this.targetPan.y - this.pan.y) * lerp;

                    // In follow mode, lerp look offset back to zero when not dragging
                    const followMode = APP.State?.select('chaser.follow');
                    if (followMode && !this.isDragging) {
                        const returnLerp = lerp * 0.5; // Slower return for smoother feel
                        this._lookOffset.yaw *= (1 - returnLerp);
                        this._lookOffset.pitch *= (1 - returnLerp);
                        // Snap to zero when close enough
                        if (Math.abs(this._lookOffset.yaw) < 0.1) this._lookOffset.yaw = 0;
                        if (Math.abs(this._lookOffset.pitch) < 0.1) this._lookOffset.pitch = 0;
                    }

                    this.applyTransform();

                    // Update view-space effects on geometry (haze, greenDesat, blur)
                    const hazeIntensity = APP.State?.select('display.haze') || 0;
                    const greenDesat = APP.State?.select('display.greenDesat') ?? 0;
                    const blur = APP.State?.select('display.blur') ?? 0;

                    const hazeChanged = hazeIntensity !== this._lastHaze;
                    const greenDesatChanged = greenDesat !== this._lastGreenDesat;
                    const blurChanged = blur !== this._lastBlur;

                    // Use follow camera rotation when in follow mode
                    const effectiveRotX = followMode ? this._followPitch : this.rotation.x;
                    const effectiveRotY = followMode ? this._followYaw : this.rotation.y;
                    const effectiveRotZ = followMode ? 0 : this.rotation.z;

                    const rotChanged = this._lastHazeRotX === null ||
                        Math.abs(effectiveRotX - this._lastHazeRotX) > 0.5 ||
                        Math.abs(effectiveRotY - this._lastHazeRotY) > 0.5;

                    // Any effect active?
                    const anyEffectActive = hazeIntensity > 0 || greenDesat > 0 || blur > 0;
                    const anyEffectChanged = hazeChanged || greenDesatChanged || blurChanged;

                    // Update when effects change or rotation changes while effects are active
                    if ((anyEffectActive && (rotChanged || followMode)) || anyEffectChanged) {
                        const hazeOpts = {
                            rotX: effectiveRotX,
                            rotY: effectiveRotY,
                            rotZ: effectiveRotZ,
                            intensity: hazeIntensity,
                            rollMode: this.rollMode,
                            greenDesat: greenDesat,
                            blur: blur,
                            // In follow mode, pass camera position for relative depth calc
                            camPos: followMode ? this._followPos : null
                        };
                        APP.Scene?.outerCylinder?.updateHaze(hazeOpts);
                        APP.Scene?.innerCylinder?.updateHaze(hazeOpts);
                        APP.Scene?.sphere?.updateHaze(hazeOpts);
                        APP.Scene?.icosahedron?.updateHaze(hazeOpts);
                        APP.Scene?.curve?.updateHaze(hazeOpts);

                        // Throttle track and chaser haze more aggressively (every 50ms)
                        const now = currentTime;
                        if (now - this._lastTrackHazeTime > 50) {
                            APP.Scene?.track?.updateHaze(hazeOpts);
                            APP.ParticleChaser?.updateHaze(hazeOpts);
                            this._lastTrackHazeTime = now;
                        }

                        this._lastHaze = hazeIntensity;
                        this._lastGreenDesat = greenDesat;
                        this._lastBlur = blur;
                        this._lastHazeRotX = effectiveRotX;
                        this._lastHazeRotY = effectiveRotY;
                    }

                    // Update curve transitions and breathing
                    if (APP.Scene?.curve?.isTransitioning()) {
                        APP.Scene.curve.updateTransition();
                    } else {
                        APP.Scene?.curve?.updateBreathing();
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

            // Check for follow cam mode
            const followMode = APP.State?.select('chaser.follow');
            const chaser = APP.ParticleChaser;

            if (followMode && chaser?.currentPos && chaser?.currentFrame) {
                this._applyFollowTransform(chaser.currentPos, chaser.currentFrame);
                return;
            }

            // Reset follow cam smoothing when not in follow mode
            if (!followMode && chaser?.currentPos) {
                this._followPos = { ...chaser.currentPos };
            }

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

        /**
         * Apply first-person follow camera transform
         * Positions camera at chaser location, looking along tangent
         * Keeps horizon level (no roll) for stability
         * Uses smoothing for fluid motion
         */
        _applyFollowTransform(pos, frame) {
            const t = frame.tangent;
            const config = APP.State.defaults.config;
            const lerp = config.lerpFactor * 2; // Slightly faster follow

            // Calculate target yaw and pitch - look along tangent
            // (chaser moves in -t direction, looking along +t = looking backward at oncoming track)
            let targetYaw = Math.atan2(t.x, t.z) * 180 / Math.PI;
            const targetPitch = Math.asin(Math.max(-1, Math.min(1, -t.y))) * 180 / Math.PI;

            // Handle yaw wraparound (avoid spinning 360 when crossing -180/180)
            let yawDiff = targetYaw - this._followYaw;
            if (yawDiff > 180) yawDiff -= 360;
            if (yawDiff < -180) yawDiff += 360;

            // Smooth interpolation
            this._followPos.x += (pos.x - this._followPos.x) * lerp;
            this._followPos.y += (pos.y - this._followPos.y) * lerp;
            this._followPos.z += (pos.z - this._followPos.z) * lerp;
            this._followYaw += yawDiff * lerp;
            this._followPitch += (targetPitch - this._followPitch) * lerp;

            // Normalize yaw to -180 to 180
            while (this._followYaw > 180) this._followYaw -= 360;
            while (this._followYaw < -180) this._followYaw += 360;

            // Apply transform with smoothed values
            // In CSS 3D, perspective defines viewing distance from z=0.
            // To be "at" the chaser, we need to push scene back by the perspective distance
            // so the chaser (now at origin after translate3d) is at the focal plane.
            const fov = APP.State?.select('camera.fov') ?? 1200;
            const cameraOffset = fov;

            // Add look offset for mouse look-around
            const finalPitch = this._followPitch + this._lookOffset.pitch;
            const finalYaw = this._followYaw + this._lookOffset.yaw;

            this.container.style.transform =
                `translateZ(${cameraOffset}px) ` +
                `scale(${this.zoom}) ` +
                `rotateX(${-finalPitch}deg) ` +
                `rotateY(${-finalYaw}deg) ` +
                `translate3d(${-this._followPos.x}px, ${-this._followPos.y}px, ${-this._followPos.z}px)`;
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
