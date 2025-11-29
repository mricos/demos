/**
 * DivGraphics - State Schema (Defaults)
 * Defines the initial state structure for the application
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.State.defaults = {
        outer: {
            enabled: false,
            radius: 80,
            height: 200,
            radialSegments: 24,
            heightSegments: 8,
            color: '#00d4ff',
            colorSecondary: '#ff00aa',
            wireframe: false
        },
        animation: {
            pps: 1.0,           // Pulses per second (0.5-4 range, log scale in UI)
            rpb: 0.00625,       // Revolutions per pulse (0.00625 = 1 rev per 160 pulses = 160 sec at 1 pps)
            playing: false
        },
        inner: {
            enabled: false,
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
            fov: 800,           // 1-2000, perspective in px (S-curve mapped)
            rotationZ: 0,       // -180 to 180
            panX: 0,            // -200 to 200
            panY: 0,            // -200 to 200
            sensitivity: 5,     // 1-20, displayed as 0.1-2.0
            pitchClamp: false,
            rollMode: 'view'    // 'view' = roll around view axis, 'world' = roll around world Z
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
            activeBank: 'A',              // Currently active bank
            banks: {                      // Maps organized BY bank
                A: { maps: {} },
                B: { maps: {} },
                C: { maps: {} },
                D: { maps: {} }
            },
            bankSwitchMaps: {             // Separate from regular bindings (always active)
                A: null,
                B: null,
                C: null,
                D: null
            }
        },
        ui: {
            popups: {},              // Position persistence: { 'popup-id': { left, top } }
            hud: true,               // Camera direction HUD (bottom center)
            gizmo: true,             // 3D axis gizmo (bottom right corner)
            trackMap: true           // 2D track map widget (bottom left)
        },
        track: {
            enabled: true,
            type: 'catmullrom',      // 'catmullrom' (Bezier handled by curve section)
            preset: 'OVAL_LOOP',     // Closed loop preset

            // Geometry - radialSegments: 0 = centerline only, 1+ = tube with faces
            radius: 15,
            radialSegments: 8,       // 0 = centerline only, 1+ = faces per ring
            segmentsPerSpan: 6,
            color: '#00ff88',
            colorSecondary: '#0088ff',
            wireframe: false,

            // Centerline (used when radialSegments = 0)
            centerlineWidth: 4,      // Base width in px
            centerlineColor: '#ffffff',

            // ===========================================
            // UNIT CIRCLE - the fundamental primitive
            // Everything derives from the circle at each track point
            // ===========================================
            circle: {
                enabled: true,       // Circle is always conceptually present
                visible: false,      // Whether to render the outline
                color: '#ffffff',
                borderWidth: 2,
                fill: false,
                opacity: 1,
                skip: 1,             // Render every Nth ring

                // Phase system - controls rotation accumulation along track
                phase: 0,            // Initial phase at t=0 (degrees)
                advance: 0,          // Base phase advance per ring (degrees)
                curvatureScale: 0,   // 0-100: how much curvature adds to phase
                twistRate: 0         // Full twists over entire track (0, 1, 2, etc.)
            },

            // Normals - rectangles pointing radially outward from circle center
            // Inner (short) edge touches circle, extends outward like spokes
            normals: {
                enabled: true,
                count: 8,            // Number distributed around circle
                phase: 0,            // Phase offset from circle's phase (degrees)
                width: 100,          // % of natural width (short edge)
                length: 100,         // % extension outward from circle
                roundness: 0,        // 0 = square, 100 = round
                spin: 0,             // Rotation around element's own axis (degrees)
                spinRate: 0,         // Additional spin per unit φ (degrees per radian)
                color: '#ff00aa',    // Magenta
                colorSecondary: '#d4007a'
            },

            // Tangents - flat boards perpendicular to normals, touching circle
            // One edge touches circle, lies flat (tangent plane to circle)
            tangents: {
                enabled: false,
                count: 8,            // Number distributed around circle
                phase: 0,            // Phase offset from circle's phase (degrees)
                width: 100,          // % of natural width
                length: 100,         // % extension in tangent direction
                roundness: 0,        // 0 = square, 100 = round
                spin: 0,             // Rotation around element's own axis (degrees)
                spinRate: 0,         // Additional spin per unit φ (degrees per radian)
                color: '#00ff88',    // Green
                colorSecondary: '#00cc66'
            },

            // Z-depth scaling (0 = no scaling, 100 = full perspective scaling)
            widthZScale: 0,          // How much width scales with Z depth
            radialWidthScale: 100,   // Width multiplier for radial elements (0-200, 100=normal)

            // Catmull-Rom specific
            tension: 0.5,            // 0 = sharp corners, 1 = loose curves

            // Endless generation
            endless: false,
            variationSource: 'none', // 'none' | 'perlin' | 'random' | 'music'
            variationIntensity: 50   // 0-100
        },
        flight: {
            enabled: false,
            t: 0,                    // Position on track (parameter value)
            speed: 300,              // Units per second
            position: { x: 0, y: 0, z: 0 },  // Current world position
            heading: 0,              // Direction in degrees (for map)
            health: 100,             // Game health (0-100)
            distance: 0              // Total distance traveled
        },
        chaser: {
            enabled: false,
            follow: false,           // First-person follow cam mode
            stabilize: true,         // Keep chaser level (no roll with tube)
            speed: 50,               // 0-100, relative to BPM (50 = 1 loop per 4 beats at 120 BPM)
            size: 20,                // Square size in px
            tailLength: 60,          // Rectangle length in px
            color: '#b34233',        // Rust/red primary
            colorSecondary: '#8b2500' // Darker rust accent
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
            curveTangentDelta: 0.001,

            // Track
            trackRingPoolSize: 200,
            trackLookAhead: 10,
            trackTrimBuffer: 5,
            trackWaypointSpacing: 100
        }
    };

})(window.APP);
