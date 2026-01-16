// TUBES.state - Centralized State Management
(function(TUBES) {
    'use strict';

    // Centralized application state
    const state = {
        // Cylinder data
        cylinders: [],
        selectedIds: [],
        nextCylinderId: 0,

        // Group data
        groups: [],
        nextGroupId: 0,

        // Settings (from CONFIG)
        settings: {
            radius: 0.5,
            depth: 1.0,
            segments: 16,
            curvePoints: 100,
            smoothing: 0.5,
            interpolation: 'catmull-rom',
            color: '#e94560',
            metalness: 0.3,
            roughness: 0.4,
            singleWidthMode: true
        },

        // Camera state
        camera: {
            position: { x: 0, y: 2, z: 5 },
            target: { x: 0, y: 0, z: 0 },
            orbitSpeed: 0.005,
            zoomSpeed: 0.001
        },

        // Input state
        input: {
            isDragging: false,
            isDrawing: false,
            lastMouse: { x: 0, y: 0 }
        },

        // UI state
        panels: {
            visible: true,
            collapsed: {}
        }
    };

    TUBES.state = {
        get(key) {
            return key ? state[key] : state;
        },

        set(key, value) {
            const old = state[key];
            state[key] = value;
            TUBES.events.publish('state:changed', { key, value, old });
            TUBES.events.publish(`state:${key}`, { value, old });
        },

        // Update nested property
        update(path, value) {
            const keys = path.split('.');
            let obj = state;
            for (let i = 0; i < keys.length - 1; i++) {
                obj = obj[keys[i]];
            }
            const old = obj[keys[keys.length - 1]];
            obj[keys[keys.length - 1]] = value;
            TUBES.events.publish('state:changed', { key: path, value, old });
        },

        reset() {
            state.cylinders = [];
            state.selectedIds = [];
            state.nextCylinderId = 0;
            TUBES.events.publish('state:reset');
        },

        // Direct access for performance-critical paths
        _state: state
    };
})(window.TUBES);
