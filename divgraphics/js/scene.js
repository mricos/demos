/**
 * DivGraphics - Scene Module
 * 3D scene management and cylinder rendering
 * Camera control delegated to APP.Camera
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.Scene = {
        container: null,
        viewport: null,
        outerCylinder: null,
        innerCylinder: null,
        curve: null,

        init() {
            this.container = document.getElementById('scene');
            this.viewport = document.getElementById('viewport');

            // Initialize camera with scene container
            APP.Camera.init(this.container, this.viewport);

            // 1. Restore from state
            this._restoreFromState();

            // 2. Subscribe to future changes
            this._subscribe();
        },

        _restoreFromState() {
            // Build geometry from current state
            this._rebuildCylinder('outer', false);
            this._rebuildCylinder('inner', true);
            this._rebuildCurve();
            // Camera handles its own state restoration
        },

        _subscribe() {
            const config = APP.State.defaults.config;
            // Throttled rebuilds for performance
            const throttledRebuildOuter = APP.Utils.throttle(() => this._rebuildCylinder('outer', false), config.throttleMs);
            const throttledRebuildInner = APP.Utils.throttle(() => this._rebuildCylinder('inner', true), config.throttleMs);
            const throttledRebuildCurve = APP.Utils.throttle(() => this._rebuildCurve(), config.throttleMs);

            APP.State.subscribe('outer.*', throttledRebuildOuter);
            APP.State.subscribe('inner.*', throttledRebuildInner);
            APP.State.subscribe('curve.*', throttledRebuildCurve);
            // Haze is now view-space, updated in animation loop - no rebuild needed
        },

        _rebuildCylinder(key, faceInward) {
            const config = APP.State.defaults.config;
            const state = APP.State.state[key];
            const propName = key + 'Cylinder';

            if (!state) return;

            // Remove existing cylinder if present
            if (this[propName]?.container?.parentNode) {
                this[propName].container.parentNode.removeChild(this[propName].container);
            }

            // Handle disabled inner cylinder
            if (key === 'inner' && !state.enabled) {
                this[propName] = null;
                APP.Stats.updateCounts();
                return;
            }

            const opacity = faceInward ? config.innerOpacity : config.outerOpacity;
            this[propName] = new APP.Cylinder({
                radius: state.radius,
                height: state.height,
                radialSegments: state.radialSegments,
                heightSegments: state.heightSegments,
                color: state.color,
                colorSecondary: state.colorSecondary,
                wireframe: state.wireframe,
                faceInward,
                opacity
            });

            this.container.appendChild(this[propName].generate());
            APP.Stats.updateCounts();
        },

        _rebuildCurve() {
            const state = APP.State.state.curve;
            if (!state) return;

            if (this.curve?.container?.parentNode) {
                this.curve.container.parentNode.removeChild(this.curve.container);
            }

            if (!state.enabled) {
                this.curve = null;
                APP.Stats.updateCounts();
                return;
            }

            this.curve = new APP.Curve({
                points: [
                    { x: state.p0x, y: state.p0y, z: state.p0z },
                    { x: state.p1x, y: state.p1y, z: state.p1z },
                    { x: state.p2x, y: state.p2y, z: state.p2z }
                ],
                radius: state.radius,
                curveSegments: state.curveSegments,
                radialSegments: state.radialSegments,
                color: state.color,
                colorSecondary: state.colorSecondary,
                wireframe: state.wireframe
            });

            this.container.appendChild(this.curve.generate());
            APP.Stats.updateCounts();
        },

        resetView() {
            APP.Camera.resetView();
        }
    };

})(window.APP);
