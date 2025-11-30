/**
 * DivGraphics - StageMorph
 * Handles smooth morphing transitions between stage definitions
 * Manages DOM face pool and applies interpolated transforms
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * Easing functions for transitions
     */
    const Easing = {
        linear: t => t,
        easeIn: t => t * t,
        easeOut: t => t * (2 - t),
        easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        elastic: t => {
            if (t === 0 || t === 1) return t;
            return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
        },
        bounce: t => {
            if (t < 1 / 2.75) return 7.5625 * t * t;
            if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
            if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    };

    /**
     * FacePool - Manages reusable DOM face elements
     */
    class FacePool {
        constructor(container) {
            this.container = container;
            this._pool = [];
            this._active = 0;
        }

        /**
         * Ensure pool has at least n faces available
         */
        ensureCapacity(n) {
            while (this._pool.length < n) {
                const face = document.createElement('div');
                face.className = 'curve-face morph-face';
                face.style.cssText = `
                    position: absolute;
                    transform-style: preserve-3d;
                    backface-visibility: visible;
                    will-change: transform, opacity, width, height;
                `;
                this.container.appendChild(face);
                this._pool.push({
                    el: face,
                    active: false
                });
            }
        }

        /**
         * Get n active faces, creating if needed
         */
        getActive(n) {
            this.ensureCapacity(n);

            // Activate needed faces
            for (let i = 0; i < n; i++) {
                if (!this._pool[i].active) {
                    this._pool[i].active = true;
                    this._pool[i].el.style.display = 'block';
                }
            }

            // Deactivate excess faces
            for (let i = n; i < this._pool.length; i++) {
                if (this._pool[i].active) {
                    this._pool[i].active = false;
                    this._pool[i].el.style.display = 'none';
                }
            }

            this._active = n;
            return this._pool.slice(0, n);
        }

        /**
         * Get pool statistics
         */
        getStats() {
            return {
                total: this._pool.length,
                active: this._active
            };
        }

        /**
         * Clear all faces from DOM
         */
        clear() {
            for (const item of this._pool) {
                if (item.el.parentNode) {
                    item.el.parentNode.removeChild(item.el);
                }
            }
            this._pool = [];
            this._active = 0;
        }
    }

    /**
     * StageMorph - Manages transitions between stages
     */
    class StageMorph {
        constructor(container, options = {}) {
            this.container = container;
            this.facePool = new FacePool(container);

            // Colors
            this.color = options.color || '#00ff88';
            this.colorSecondary = options.colorSecondary || '#0088ff';
            this.wireframe = options.wireframe || false;

            // Transition state
            this._fromFaces = [];
            this._toFaces = [];
            this._currentFaces = [];
            this._isTransitioning = false;
            this._transitionStart = 0;
            this._transitionDuration = 500;
            this._transitionEasing = 'easeInOut';
            this._onComplete = null;

            // Current stage
            this._currentStage = null;
            this._currentParams = null;
            this._currentContext = null;
        }

        /**
         * Set current stage without transition
         */
        setStage(stageName, params, context) {
            const stage = APP.StageRegistry.get(stageName);
            if (!stage) {
                console.warn(`StageMorph: Unknown stage "${stageName}"`);
                return;
            }

            this._currentStage = stage;
            this._currentParams = params;
            this._currentContext = context;

            // Calculate face data
            this._currentFaces = stage.calculate(params, context);

            // Update DOM
            this._applyFaces(this._currentFaces);
        }

        /**
         * Start a transition to a new stage
         */
        transitionTo(stageName, params, context, options = {}) {
            const stage = APP.StageRegistry.get(stageName);
            if (!stage) {
                console.warn(`StageMorph: Unknown stage "${stageName}"`);
                return;
            }

            const duration = options.duration ?? 500;
            const easing = options.easing || 'easeInOut';
            const onComplete = options.onComplete || null;

            // Capture current state as "from"
            this._fromFaces = this._currentFaces.map(f => {
                const copy = new APP.FaceData();
                copy.copyFrom(f);
                return copy;
            });

            // Calculate target state
            this._toFaces = stage.calculate(params, context);

            // Handle mismatched face counts
            this._reconcileFaceCounts();

            // Start transition
            this._transitionStart = performance.now();
            this._transitionDuration = duration;
            this._transitionEasing = easing;
            this._onComplete = onComplete;
            this._isTransitioning = true;

            // Store target stage info
            this._targetStage = stage;
            this._targetParams = params;
            this._targetContext = context;

            // Allocate faces for transition
            const maxFaces = Math.max(this._fromFaces.length, this._toFaces.length);
            this._currentFaces = [];
            for (let i = 0; i < maxFaces; i++) {
                this._currentFaces.push(new APP.FaceData());
            }
        }

        /**
         * Reconcile face counts between from and to arrays
         * Extra faces fade in/out during transition
         */
        _reconcileFaceCounts() {
            const fromLen = this._fromFaces.length;
            const toLen = this._toFaces.length;

            // Store original target count for cleanup after transition
            this._targetFaceCount = toLen;

            if (fromLen < toLen) {
                // Add ghost "from" faces that fade in
                for (let i = fromLen; i < toLen; i++) {
                    const ghost = new APP.FaceData();
                    ghost.copyFrom(this._toFaces[i]);
                    ghost.opacity = 0; // Start invisible
                    this._fromFaces.push(ghost);
                }
            } else if (toLen < fromLen) {
                // Add ghost "to" faces that fade out
                // Position them at center (converge) so they don't stay at old positions
                const center = this._computeCenter(this._toFaces);
                for (let i = toLen; i < fromLen; i++) {
                    const ghost = new APP.FaceData();
                    // Move toward center while fading out
                    ghost.x = center.x;
                    ghost.y = center.y;
                    ghost.z = center.z;
                    ghost.width = 0;
                    ghost.height = 0;
                    ghost.opacity = 0;
                    ghost.rotateX = this._fromFaces[i].rotateX;
                    ghost.rotateY = this._fromFaces[i].rotateY;
                    ghost.rotateZ = this._fromFaces[i].rotateZ;
                    this._toFaces.push(ghost);
                }
            }
        }

        /**
         * Compute center of face positions
         */
        _computeCenter(faces) {
            if (!faces.length) return { x: 0, y: 0, z: 0 };
            let x = 0, y = 0, z = 0;
            for (const f of faces) {
                x += f.x;
                y += f.y;
                z += f.z;
            }
            return { x: x / faces.length, y: y / faces.length, z: z / faces.length };
        }

        /**
         * Update transition (call from animation loop)
         * @returns {boolean} true if still transitioning
         */
        update() {
            if (!this._isTransitioning) return false;

            const now = performance.now();
            const elapsed = now - this._transitionStart;
            const rawT = Math.min(1, elapsed / this._transitionDuration);

            // Apply easing
            const easeFn = Easing[this._transitionEasing] || Easing.easeInOut;
            const t = easeFn(rawT);

            // Interpolate all faces
            for (let i = 0; i < this._currentFaces.length; i++) {
                const from = this._fromFaces[i];
                const to = this._toFaces[i];
                this._currentFaces[i].lerp(from, to, t);
            }

            // Apply to DOM
            this._applyFaces(this._currentFaces);

            // Check completion
            if (rawT >= 1) {
                this._isTransitioning = false;
                this._currentStage = this._targetStage;
                this._currentParams = this._targetParams;
                this._currentContext = this._targetContext;

                // Only keep actual target faces, not ghost faces
                const targetCount = this._targetFaceCount ?? this._toFaces.length;
                this._currentFaces = this._toFaces.slice(0, targetCount);

                // Re-apply with correct face count (hides extra pool faces)
                this._applyFaces(this._currentFaces);

                if (this._onComplete) {
                    this._onComplete();
                }
                return false;
            }

            return true;
        }

        /**
         * Apply face data to DOM elements
         */
        _applyFaces(faces) {
            const poolFaces = this.facePool.getActive(faces.length);

            for (let i = 0; i < faces.length; i++) {
                const data = faces[i];
                const poolItem = poolFaces[i];
                const el = poolItem.el;

                const color = data.colorIndex % 2 === 0 ? this.color : this.colorSecondary;

                // Build transform (batch style updates)
                const transform = `translate3d(${data.x}px, ${data.y}px, ${data.z}px)
                    rotateZ(${data.rotateZ}deg)
                    rotateX(${data.rotateX}deg)
                    rotateY(${data.rotateY}deg)
                    translateX(-50%) translateY(-50%)`;

                if (this.wireframe) {
                    el.style.cssText = `
                        position: absolute;
                        width: ${data.width}px;
                        height: ${data.height}px;
                        background: transparent;
                        border: 1px solid ${color};
                        transform-style: preserve-3d;
                        backface-visibility: visible;
                        opacity: ${data.opacity};
                        transform: ${transform};
                        will-change: transform, opacity;
                    `;
                } else {
                    el.style.cssText = `
                        position: absolute;
                        width: ${data.width}px;
                        height: ${data.height}px;
                        background: ${color};
                        transform-style: preserve-3d;
                        backface-visibility: visible;
                        opacity: ${data.opacity};
                        transform: ${transform};
                        will-change: transform, opacity;
                    `;
                }
            }
        }

        /**
         * Refresh current stage with new params (no transition)
         */
        refresh(params, context) {
            if (!this._currentStage) return;

            this._currentParams = params || this._currentParams;
            this._currentContext = context || this._currentContext;
            this._currentFaces = this._currentStage.calculate(this._currentParams, this._currentContext);
            this._applyFaces(this._currentFaces);
        }

        /**
         * Check if currently transitioning
         */
        isTransitioning() {
            return this._isTransitioning;
        }

        /**
         * Get current stage name
         */
        getCurrentStage() {
            return this._currentStage?.name || null;
        }

        /**
         * Get current face count
         */
        getFaceCount() {
            return this._currentFaces.length;
        }

        /**
         * Update colors
         */
        setColors(color, colorSecondary) {
            this.color = color;
            this.colorSecondary = colorSecondary;
            if (!this._isTransitioning && this._currentFaces.length > 0) {
                this._applyFaces(this._currentFaces);
            }
        }

        /**
         * Update wireframe mode
         */
        setWireframe(enabled) {
            this.wireframe = enabled;
            if (!this._isTransitioning && this._currentFaces.length > 0) {
                this._applyFaces(this._currentFaces);
            }
        }

        /**
         * Get face positions for external use (haze, etc.)
         */
        getFacePositions() {
            return this._currentFaces.map(f => ({
                x: f.x,
                y: f.y,
                z: f.z,
                el: null // Pool faces are internal
            }));
        }

        /**
         * Get actual DOM elements for haze application
         */
        getFaceElements() {
            const poolFaces = this.facePool.getActive(this._currentFaces.length);
            return this._currentFaces.map((f, i) => ({
                x: f.x,
                y: f.y,
                z: f.z,
                el: poolFaces[i]?.el || null
            }));
        }

        /**
         * Update haze based on camera rotation
         */
        updateHaze(opts) {
            const { rotX, rotY, rotZ, intensity, rollMode } = opts;
            const faceElements = this.getFaceElements();

            if (!faceElements.length || intensity <= 0) {
                faceElements.forEach(f => {
                    if (f.el) f.el.style.opacity = 1;
                });
                return;
            }

            const hazeFactor = intensity / 100;
            const rx = rotX * Math.PI / 180;
            const ry = rotY * Math.PI / 180;
            const rz = rotZ * Math.PI / 180;

            const cosX = Math.cos(rx), sinX = Math.sin(rx);
            const cosY = Math.cos(ry), sinY = Math.sin(ry);
            const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

            let zMin = Infinity, zMax = -Infinity;
            const viewZs = [];

            for (const face of faceElements) {
                let viewZ;
                if (rollMode === 'world') {
                    const xz = face.x * cosZ - face.y * sinZ;
                    const yz = face.x * sinZ + face.y * cosZ;
                    const zy = -xz * sinY + face.z * cosY;
                    viewZ = yz * sinX + zy * cosX;
                } else {
                    const z1 = -face.x * sinY + face.z * cosY;
                    viewZ = face.y * sinX + z1 * cosX;
                }

                viewZs.push(viewZ);
                zMin = Math.min(zMin, viewZ);
                zMax = Math.max(zMax, viewZ);
            }

            const zRange = zMax - zMin || 1;

            for (let i = 0; i < faceElements.length; i++) {
                const zNorm = (viewZs[i] - zMin) / zRange;
                const hazeAmount = 1 - (1 - zNorm) * hazeFactor;
                const opacity = Math.max(0.15, hazeAmount);
                if (faceElements[i].el) {
                    faceElements[i].el.style.opacity = opacity;
                }
            }
        }

        /**
         * Apply breathing modulation
         */
        updateBreathing(breatheMod) {
            if (!this._currentStage || this._isTransitioning) return;

            const faceElements = this.getFaceElements();
            for (const face of faceElements) {
                if (face.el) {
                    const currentTransform = face.el.style.transform.replace(/\s*scale\([^)]*\)/g, '');
                    face.el.style.transform = currentTransform + ` scale(${breatheMod})`;
                }
            }
        }

        /**
         * Get statistics
         */
        getStats() {
            const poolStats = this.facePool.getStats();
            return {
                faces: this._currentFaces.length,
                poolTotal: poolStats.total,
                poolActive: poolStats.active,
                isTransitioning: this._isTransitioning,
                currentStage: this._currentStage?.name || null
            };
        }

        /**
         * Destroy and cleanup
         */
        destroy() {
            this.facePool.clear();
            this._fromFaces = [];
            this._toFaces = [];
            this._currentFaces = [];
            this._isTransitioning = false;
        }
    }

    // Export
    APP.Easing = Easing;
    APP.FacePool = FacePool;
    APP.StageMorph = StageMorph;

})(window.APP);
