/**
 * DivGraphics - Track Presets Module
 * Hardcoded waypoint arrays for preset tracks
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * TrackPresets - Collection of predefined track waypoint arrays
     */
    APP.TrackPresets = {

        /**
         * GENTLE_TURNS - Easy S-curves with mild elevation changes
         * Good for beginners and testing
         */
        GENTLE_TURNS: [
            { x: 0, y: 0, z: 0 },
            { x: 50, y: 0, z: 100 },
            { x: 100, y: 20, z: 200 },
            { x: 80, y: 40, z: 300 },
            { x: 20, y: 60, z: 400 },
            { x: -40, y: 40, z: 500 },
            { x: -80, y: 20, z: 600 },
            { x: -60, y: 0, z: 700 },
            { x: 0, y: -20, z: 800 },
            { x: 60, y: 0, z: 900 },
            { x: 80, y: 20, z: 1000 },
            { x: 40, y: 40, z: 1100 },
            { x: 0, y: 20, z: 1200 }
        ],

        /**
         * SPIRAL_CLIMB - Ascending helix
         * 3 turns, radius 150, 40 height per turn
         */
        SPIRAL_CLIMB: (function() {
            const points = [];
            const radius = 150;
            const heightPerTurn = 120;
            const turns = 3;
            const pointsPerTurn = 8;
            const totalPoints = turns * pointsPerTurn + 1;

            for (let i = 0; i < totalPoints; i++) {
                const angle = (i / pointsPerTurn) * Math.PI * 2;
                points.push({
                    x: Math.cos(angle) * radius,
                    y: i * (heightPerTurn / pointsPerTurn),
                    z: Math.sin(angle) * radius
                });
            }
            return points;
        })(),

        /**
         * FIGURE_EIGHT - Closed loop figure-8 pattern (lemniscate)
         * Default: scale=200, points=16
         */
        FIGURE_EIGHT: (function() {
            const points = [];
            const scale = 200;
            const numPoints = 16;

            for (let i = 0; i < numPoints; i++) {
                const t = (i / numPoints) * Math.PI * 2;
                // Lemniscate of Bernoulli
                const denom = 1 + Math.sin(t) * Math.sin(t);
                points.push({
                    x: scale * Math.cos(t) / denom,
                    y: 30 * Math.sin(t * 2), // Gentle elevation variation
                    z: scale * Math.sin(t) * Math.cos(t) / denom
                });
            }
            return points;
        })(),

        /**
         * OVAL_LOOP - Simple closed oval track
         * Default: radiusX=200, radiusZ=300, points=12
         */
        OVAL_LOOP: (function() {
            const points = [];
            const radiusX = 200;
            const radiusZ = 300;
            const numPoints = 12;

            for (let i = 0; i < numPoints; i++) {
                const t = (i / numPoints) * Math.PI * 2;
                points.push({
                    x: radiusX * Math.cos(t),
                    y: 20 * Math.sin(t * 2), // Gentle hills
                    z: radiusZ * Math.sin(t)
                });
            }
            return points;
        })(),

        /**
         * Get preset by name (case-insensitive)
         * @param {string} name - Preset name
         * @returns {Array} Waypoint array (copy)
         */
        get(name) {
            const key = (name || '').toUpperCase().replace(/-/g, '_');
            const preset = this[key];

            if (Array.isArray(preset)) {
                // Return a deep copy to prevent mutation
                return preset.map(p => ({ ...p }));
            }

            // Default to GENTLE_TURNS
            console.warn(`TrackPresets: Unknown preset "${name}", using GENTLE_TURNS`);
            return this.GENTLE_TURNS.map(p => ({ ...p }));
        },

        /**
         * List available preset names
         * @returns {Array<string>}
         */
        list() {
            return Object.keys(this).filter(key =>
                Array.isArray(this[key]) && key === key.toUpperCase()
            );
        },

        /**
         * Get preset info (for UI display)
         * @param {string} name
         * @returns {Object}
         */
        getInfo(name) {
            const presets = {
                GENTLE_TURNS: {
                    name: 'Gentle Turns',
                    description: 'Easy S-curves with mild elevation',
                    difficulty: 'Easy',
                    closed: false
                },
                SPIRAL_CLIMB: {
                    name: 'Spiral Climb',
                    description: 'Ascending helix - 3 full turns',
                    difficulty: 'Medium',
                    closed: false
                },
                FIGURE_EIGHT: {
                    name: 'Figure Eight',
                    description: 'Closed figure-8 loop',
                    difficulty: 'Medium',
                    closed: true
                },
                OVAL_LOOP: {
                    name: 'Oval Loop',
                    description: 'Simple closed oval track',
                    difficulty: 'Easy',
                    closed: true
                }
            };

            const key = (name || '').toUpperCase().replace(/-/g, '_');
            return presets[key] || { name: name, description: '', difficulty: 'Unknown', closed: false };
        },

        /**
         * Generate a closed loop with custom scale
         * @param {string} type - 'oval' or 'figure8'
         * @param {number} scale - Size multiplier (default 1.0)
         * @param {number} points - Number of waypoints (default 12)
         * @returns {Array} Waypoint array
         */
        generateLoop(type = 'oval', scale = 1.0, points = 12) {
            const waypoints = [];

            if (type === 'figure8') {
                const baseSize = 200 * scale;
                for (let i = 0; i < points; i++) {
                    const t = (i / points) * Math.PI * 2;
                    const denom = 1 + Math.sin(t) * Math.sin(t);
                    waypoints.push({
                        x: baseSize * Math.cos(t) / denom,
                        y: 30 * scale * Math.sin(t * 2),
                        z: baseSize * Math.sin(t) * Math.cos(t) / denom
                    });
                }
            } else {
                // Default: oval
                const radiusX = 200 * scale;
                const radiusZ = 300 * scale;
                for (let i = 0; i < points; i++) {
                    const t = (i / points) * Math.PI * 2;
                    waypoints.push({
                        x: radiusX * Math.cos(t),
                        y: 20 * scale * Math.sin(t * 2),
                        z: radiusZ * Math.sin(t)
                    });
                }
            }

            return waypoints;
        },

        /**
         * Check if a preset is a closed loop
         * @param {string} name
         * @returns {boolean}
         */
        isClosed(name) {
            return this.getInfo(name).closed === true;
        }
    };

})(window.APP);
