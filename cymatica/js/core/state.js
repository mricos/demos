/**
 * CYMATICA State Module
 * Centralized state management with dot-notation access
 */
(function(CYMATICA) {
    'use strict';

    // Letter path definitions for vector rendering
    const LETTER_PATHS = {
        'C': [
            'M 85 25 Q 85 10 65 5 Q 40 0 20 20 Q 0 45 0 55 Q 0 70 15 85 Q 35 105 65 100 Q 85 95 85 80',
            'M 75 30 Q 75 20 60 15 Q 40 10 25 25 Q 10 45 10 55 Q 10 65 20 78 Q 38 95 60 90 Q 75 85 75 75'
        ],
        'Y': [
            'M 5 5 L 50 50',
            'M 95 5 L 50 50',
            'M 50 50 L 50 100',
            'M 20 20 L 35 35',
            'M 80 20 L 65 35'
        ],
        'M': [
            'M 5 100 L 5 5 L 50 60 L 95 5 L 95 100',
            'M 15 90 L 15 20',
            'M 85 90 L 85 20',
            'M 30 40 L 50 70 L 70 40'
        ],
        'A': [
            'M 5 100 L 50 5 L 95 100',
            'M 22 70 L 78 70',
            'M 20 85 L 50 20 L 80 85',
            'M 30 80 L 70 80'
        ],
        'T': [
            'M 5 5 L 95 5',
            'M 50 5 L 50 100',
            'M 5 15 L 20 5',
            'M 95 15 L 80 5',
            'M 15 15 L 85 15'
        ],
        'I': [
            'M 25 5 L 75 5',
            'M 25 100 L 75 100',
            'M 50 5 L 50 100',
            'M 35 5 L 35 15',
            'M 65 5 L 65 15',
            'M 35 100 L 35 90',
            'M 65 100 L 65 90'
        ],
        // Lowercase letters
        'c': [
            'M 80 30 Q 80 15 55 15 Q 25 15 15 50 Q 5 85 35 95 Q 60 100 80 85',
            'M 70 35 Q 70 25 55 25 Q 35 25 28 50 Q 20 75 40 85 Q 55 90 70 80'
        ],
        'y': [
            'M 10 15 L 50 75',
            'M 90 15 L 50 75 Q 40 100 25 110',
            'M 25 30 L 40 55',
            'M 75 30 L 60 55'
        ],
        'm': [
            'M 5 100 L 5 30',
            'M 5 40 Q 5 15 30 15 Q 50 15 50 40 L 50 100',
            'M 50 40 Q 50 15 75 15 Q 95 15 95 40 L 95 100',
            'M 15 90 L 15 45',
            'M 60 90 L 60 45'
        ],
        'a': [
            'M 75 30 Q 75 15 50 15 Q 20 15 15 50 Q 10 85 50 90 Q 75 90 75 70',
            'M 75 30 L 75 100',
            'M 65 35 Q 65 25 50 25 Q 30 25 27 50 Q 24 75 50 78 Q 65 78 65 65'
        ],
        't': [
            'M 50 5 L 50 85 Q 50 100 70 100',
            'M 25 30 L 80 30',
            'M 35 40 L 70 40'
        ],
        'i': [
            'M 50 30 L 50 100',
            'M 50 5 L 50 15',
            'M 35 30 L 65 30',
            'M 35 100 L 65 100'
        ]
    };

    // Expose letter paths
    CYMATICA.LETTER_PATHS = LETTER_PATHS;

    // Default state values
    const defaultState = {
        // Letter positions
        letters: [
            { char: 'c', x: -350, y: 0, z: 0, scale: 1 },
            { char: 'y', x: -250, y: 0, z: 0, scale: 1 },
            { char: 'm', x: -150, y: 0, z: 0, scale: 1 },
            { char: 'a', x: -50, y: 0, z: 0, scale: 1 },
            { char: 't', x: 50, y: 0, z: 0, scale: 1 },
            { char: 'i', x: 150, y: 0, z: 0, scale: 1 },
            { char: 'c', x: 250, y: 0, z: 0, scale: 1 },
            { char: 'a', x: 350, y: 0, z: 0, scale: 1 }
        ],
        selectedLetter: 0,

        // Rotation
        rotation: { x: 0, y: 0, z: 0 },
        targetRotation: { x: 0, y: 0, z: 0 },
        rotSpeed: { x: 5, y: 15, z: 0 },

        // Camera/view
        zoom: 0.5,
        targetZoom: 0.5,
        minZoom: 0.2,
        maxZoom: 5,
        zoomSpeed: 0.001,
        zoomLerp: 0.15,
        // Pan
        panX: 0,
        panY: 0,
        targetPanX: 0,
        targetPanY: 0,
        panLerp: 0.15,

        // Input
        isDragging: false,
        isPanning: false,
        isPinching: false,
        lastMouse: { x: 0, y: 0 },
        lastPinchDist: 0,
        sensitivity: 0.5,
        lerpFactor: 0.12,

        // Animation
        animating: false,
        animSpeed: 1,
        beamPhase: 0,

        // Rendering
        concentric: 5,
        layerOffset: 2,
        strokeWidth: 1.5,
        glowIntensity: 60,
        colorPrimary: '#00ffff',
        colorSecondary: '#ff00aa',
        fov: 1000,
        cameraZ: 600,

        // Effects
        scanlines: true,
        vignette: true,
        drawOn: false,
        drawSpeed: 2,
        drawProgress: 1,
        drawLoop: true,
        colorOscillate: false,
        oscillateSpeed: 1,

        // Internal (computed during render)
        _oscillatedPrimary: null,
        _oscillatedSecondary: null
    };

    // Active state (mutable copy)
    const state = JSON.parse(JSON.stringify(defaultState));

    // State API
    const CymaticaState = {
        /**
         * Get state value by key or dot-notation path
         * @param {string} path - Key or dot-notation path (e.g., 'rotation.x')
         * @returns {*} Value at path, or entire state if no path
         */
        get: function(path) {
            if (!path) return state;

            // Support dot-notation
            if (path.includes('.')) {
                return CYMATICA.Utils?.getByPath?.(state, path) ||
                       path.split('.').reduce((obj, key) => obj && obj[key], state);
            }

            return state[path];
        },

        /**
         * Set state value by key or dot-notation path
         * @param {string} path - Key or dot-notation path
         * @param {*} value - Value to set
         */
        set: function(path, value) {
            let old;

            if (path.includes('.')) {
                old = this.get(path);
                if (CYMATICA.Utils?.setByPath) {
                    CYMATICA.Utils.setByPath(state, path, value);
                } else {
                    const keys = path.split('.');
                    let current = state;
                    for (let i = 0; i < keys.length - 1; i++) {
                        if (!(keys[i] in current)) current[keys[i]] = {};
                        current = current[keys[i]];
                    }
                    current[keys[keys.length - 1]] = value;
                }
            } else {
                old = state[path];
                state[path] = value;
            }

            // Emit events
            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.STATE_CHANGE, { path, value, old });
                CYMATICA.events.emit(`state:${path}`, { value, old });
            }
        },

        /**
         * Get entire state for serialization
         * @returns {Object} Deep copy of state
         */
        getAll: function() {
            // Filter out internal properties (starting with _)
            const filtered = {};
            for (const key in state) {
                if (!key.startsWith('_')) {
                    filtered[key] = state[key];
                }
            }
            return JSON.parse(JSON.stringify(filtered));
        },

        /**
         * Replace entire state (for loading saved state)
         * @param {Object} newState - State object to load
         */
        replaceAll: function(newState) {
            // Merge new state into current state
            for (const key in newState) {
                if (key in state && !key.startsWith('_')) {
                    state[key] = newState[key];
                }
            }

            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.STATE_CHANGE, { path: '*', value: state });
                CYMATICA.events.emit(CYMATICA.Events.STATE_LOADED, { state: state });
            }
        },

        /**
         * Reset state to defaults
         */
        reset: function() {
            state.rotation = { x: 0, y: 0, z: 0 };
            state.targetRotation = { x: 0, y: 0, z: 0 };
            state.zoom = 0.5;
            state.targetZoom = 0.5;
            state.panX = 0;
            state.panY = 0;
            state.targetPanX = 0;
            state.targetPanY = 0;

            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.STATE_RESET);
                CYMATICA.events.emit(CYMATICA.Events.STATE_CHANGE, { path: '*', value: state });
            }
        },

        /**
         * Reset to factory defaults
         */
        resetToDefaults: function() {
            const copy = JSON.parse(JSON.stringify(defaultState));
            for (const key in copy) {
                state[key] = copy[key];
            }

            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.STATE_RESET);
                CYMATICA.events.emit(CYMATICA.Events.STATE_CHANGE, { path: '*', value: state });
            }
        },

        // Direct access for performance-critical paths (render loop)
        _state: state,
        _defaults: defaultState
    };

    CYMATICA.state = CymaticaState;
    CYMATICA.State = CymaticaState; // Alias for terrain compatibility

})(window.CYMATICA);
