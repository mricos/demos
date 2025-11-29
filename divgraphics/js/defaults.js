/**
 * DivGraphics - State Schema (Defaults)
 * Defines the initial state structure for the application
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.State.defaults = {
        outer: {
            radius: 80,
            height: 200,
            radialSegments: 24,
            heightSegments: 8,
            color: '#00d4ff',
            colorSecondary: '#ff00aa',
            wireframe: false
        },
        inner: {
            enabled: true,
            radius: 50,
            height: 200,
            radialSegments: 24,
            heightSegments: 8,
            color: '#ff00aa',
            colorSecondary: '#00d4ff',
            wireframe: false
        },
        curve: {
            enabled: false,
            radius: 10,
            curveSegments: 16,
            radialSegments: 8,
            color: '#00ff88',
            colorSecondary: '#0088ff',
            wireframe: false,
            // Control points stored as flat values for UI binding
            p0x: -100, p0y: 0, p0z: 0,
            p1x: 0, p1y: -100, p1z: 50,
            p2x: 100, p2y: 0, p2z: 0
        },
        scene: {
            autoRotate: true
        },
        camera: {
            zoom: 100,          // 30-250, displayed as 0.3-2.5
            fov: 1200,          // 400-2000, perspective in px
            rotationZ: 0,       // -180 to 180
            panX: 0,            // -200 to 200
            panY: 0,            // -200 to 200
            sensitivity: 5,     // 1-20, displayed as 0.1-2.0
            pitchClamp: false
        },
        display: {
            toasts: true,
            stats: true,
            header: true,
            midiToasts: true,
            gamepadToasts: true,
            haze: 0             // 0 = off, 1-100 = z-depth haze intensity
        },
        midi: {
            device: null,
            learnMode: false
        },
        gamepad: {
            device: null,
            learnMode: false
        },
        input: {
            maps: {}    // All bindings stored here as { [id]: InputMap }
        },

        // Runtime configuration constants (not persisted)
        config: {
            // Animation & rendering
            throttleMs: 16,              // 60fps frame budget
            lerpFactor: 0.1,             // Smooth interpolation speed
            autoRotateSpeed: 0.3,        // Degrees per frame

            // Camera
            zoomScale: 100,              // Stored value divisor (100 → 1.0)
            sensitivityScale: 10,        // Stored value divisor (10 → 1.0)
            pitchClampMin: -90,
            pitchClampMax: 90,
            zoomMin: 30,
            zoomMax: 250,
            wheelZoomFactor: 0.1,

            // Geometry
            outerOpacity: 0.85,
            innerOpacity: 0.7,
            darkColorLerp: 0.3,

            // Input
            gamepadDeadzone: 0.15,
            learnThreshold: 0.3,
            curveTangentDelta: 0.001
        }
    };

})(window.APP);
