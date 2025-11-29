/**
 * DivGraphics - Scene Module
 * 3D scene management, cylinder rendering, interaction, and animation
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.Scene = {
        container: null,
        viewport: null,
        outerCylinder: null,
        innerCylinder: null,

        rotation: { x: -20, y: 0 },
        targetRotation: { x: -20, y: 0 },
        zoom: 1,
        isDragging: false,
        lastMouse: { x: 0, y: 0 },

        init() {
            this.container = document.getElementById('scene');
            this.viewport = document.getElementById('viewport');

            this._initInteraction();
            this._startAnimationLoop();

            // 1. Restore from state
            this._restoreFromState();

            // 2. Subscribe to future changes
            this._subscribe();
        },

        _restoreFromState() {
            // Build cylinders from current state
            this._rebuildOuter();
            this._rebuildInner();

            // Restore scene properties
            const scene = APP.State.select('scene');
            if (scene) {
                this.targetRotation.x = scene.rotationX;
                this.targetRotation.y = scene.rotationY;
                this.zoom = scene.zoom;
            }
        },

        _subscribe() {
            // Throttled rebuilds for performance
            const throttledRebuildOuter = APP.Utils.throttle(() => this._rebuildOuter(), 16);
            const throttledRebuildInner = APP.Utils.throttle(() => this._rebuildInner(), 16);

            APP.State.subscribe('outer.*', throttledRebuildOuter);
            APP.State.subscribe('inner.*', throttledRebuildInner);
        },

        _rebuildOuter() {
            const state = APP.State.state.outer;
            if (!state) return;

            if (this.outerCylinder?.container?.parentNode) {
                this.outerCylinder.container.parentNode.removeChild(this.outerCylinder.container);
            }

            this.outerCylinder = new APP.Cylinder({
                radius: state.radius,
                height: state.height,
                radialSegments: state.radialSegments,
                heightSegments: state.heightSegments,
                color: state.color,
                colorSecondary: state.colorSecondary,
                wireframe: state.wireframe,
                faceInward: false,
                opacity: 0.85
            });

            this.container.appendChild(this.outerCylinder.generate());
            APP.Stats.updateCounts();
        },

        _rebuildInner() {
            const state = APP.State.state.inner;
            if (!state) return;

            if (this.innerCylinder?.container?.parentNode) {
                this.innerCylinder.container.parentNode.removeChild(this.innerCylinder.container);
            }

            if (!state.enabled) {
                this.innerCylinder = null;
                APP.Stats.updateCounts();
                return;
            }

            this.innerCylinder = new APP.Cylinder({
                radius: state.radius,
                height: state.height,
                radialSegments: state.radialSegments,
                heightSegments: state.heightSegments,
                color: state.color,
                colorSecondary: state.colorSecondary,
                wireframe: state.wireframe,
                faceInward: true,
                opacity: 0.7
            });

            this.container.appendChild(this.innerCylinder.generate());
            APP.Stats.updateCounts();
        },

        _initInteraction() {
            const vp = this.viewport;

            vp.addEventListener('mousedown', (e) => {
                this.isDragging = true;
                this.lastMouse = { x: e.clientX, y: e.clientY };
            });

            window.addEventListener('mousemove', (e) => {
                if (!this.isDragging) return;
                this.targetRotation.y += (e.clientX - this.lastMouse.x) * 0.5;
                this.targetRotation.x = Math.max(-90, Math.min(90, this.targetRotation.x + (e.clientY - this.lastMouse.y) * 0.5));
                this.lastMouse = { x: e.clientX, y: e.clientY };
            });

            window.addEventListener('mouseup', () => this.isDragging = false);

            vp.addEventListener('touchstart', (e) => {
                this.isDragging = true;
                this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            });

            vp.addEventListener('touchmove', (e) => {
                if (!this.isDragging) return;
                this.targetRotation.y += (e.touches[0].clientX - this.lastMouse.x) * 0.5;
                this.targetRotation.x = Math.max(-90, Math.min(90, this.targetRotation.x + (e.touches[0].clientY - this.lastMouse.y) * 0.5));
                this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            });

            vp.addEventListener('touchend', () => this.isDragging = false);

            vp.addEventListener('wheel', (e) => {
                e.preventDefault();
                this.zoom = Math.max(0.3, Math.min(2.5, this.zoom - e.deltaY * 0.001));
            }, { passive: false });
        },

        _startAnimationLoop() {
            const animate = () => {
                const autoRotate = APP.State.select('scene.autoRotate');
                if (autoRotate && !this.isDragging) {
                    this.targetRotation.y += 0.3;
                }

                this.rotation.x += (this.targetRotation.x - this.rotation.x) * 0.1;
                this.rotation.y += (this.targetRotation.y - this.rotation.y) * 0.1;

                this.container.style.transform = `scale(${this.zoom}) rotateX(${this.rotation.x}deg) rotateY(${this.rotation.y}deg)`;

                APP.Stats.tick();
                requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        },

        resetView() {
            this.targetRotation = { x: -20, y: 0 };
            this.zoom = 1;
        }
    };

})(window.APP);
