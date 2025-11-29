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
        scene: {
            autoRotate: true,
            zoom: 1,
            rotationX: -20,
            rotationY: 0
        },
        display: {
            toasts: true,
            stats: true,
            midiToasts: true,
            gamepadToasts: true
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
        }
    };

})(window.APP);
