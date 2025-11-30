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
            radius: 150,
            height: 155,
            radialSegments: 44,
            heightSegments: 1,
            color: '#00d4ff',
            colorSecondary: '#ff00aa',
            wireframe: false
        },
        animation: {
            pps: 0.8408964152537145,  // Pulses per second (0.5-4 range, log scale in UI)
            ppr: 256,                  // Pulses per revolution (160 = very slow, 1 = fast, 256 max)
            playing: true
        },
        inner: {
            enabled: false,
            radius: 50,
            height: 200,
            radialSegments: 42,
            heightSegments: 19,
            color: '#ff00aa',
            colorSecondary: '#00d4ff',
            wireframe: false
        },
        curve: {
            enabled: true,
            radius: 8,
            curveSegments: 5,
            radialSegments: 8,       // Number of radial faces (all modes use pieceCount, this is legacy)
            color: '#00ff88',
            colorSecondary: '#0088ff',
            wireframe: true,
            // Control points stored as flat values for UI binding
            p0x: 85, p0y: -1, p0z: -45,
            p1x: 0, p1y: 2, p1z: -20,
            p2x: 200, p2y: -3, p2z: 0,

            // Mode: 'bezier' | 'distribute' | 'crystal'
            mode: 'bezier',

            // === Geometry parameters (shared across all modes) ===
            length: 100,             // Segment/petal length as % (0-200)
            spacing: 100,            // Gap between segments (0-200%, 100=natural)
            twist: 0,                // Rotation delta per segment in degrees
            borderWidth: 50,         // Border width (5-200 slider → 0.05-2px)
            faceWidthScale: 100,     // Face width scale (0-200, 100=natural)
            loopBorder: false,       // Full border loop (true) vs hairline edges only (false)
            softness: 0,             // Blur to soften lines (0-100 → 0-5px blur)
            round: 0,                // Round corners (0=square, 100=fully rounded)

            // === Shared modulation parameters (all modes respond to these) ===
            pieceCount: 23,          // Number of radial segments/petals (unified across modes)
            phase: 0,                // Global phase offset (0-360)
            spin: -124,              // Rotation per piece (degrees)
            spread: 100,             // Distribution spread (0=stacked at center, 100=evenly distributed)
            sineAmplitudeX: 0,       // Sine modulation amplitude for X/normal
            sineAmplitudeY: 67,      // Sine modulation amplitude for Y/binormal
            sineAmplitudeZ: 54,      // Sine modulation amplitude for Z/tangent
            sineFrequency: 7,        // Sine wave cycles per loop

            // === Breathing parameters (beat-synced animation) ===
            breathe: false,          // Enable breathing animation
            breatheScale: 50,        // How much size changes (0-100%)
            breatheSpeed: 4,         // Beats per breath cycle (1-32, 4 = 1 bar)
            breathePhase: 0,         // Phase offset for breathing (0-360)

            // === Transition parameters ===
            transitionDuration: 500, // Duration in ms for mode transitions
            transitionEasing: 'easeInOut', // 'linear', 'easeIn', 'easeOut', 'easeInOut'

            // === Rotation around center of mass ===
            rotateX: 0,              // Rotation around COM X axis (degrees)
            rotateY: 0,              // Rotation around COM Y axis (degrees)
            rotateZ: 0,              // Rotation around COM Z axis (degrees)

            // === Crystal mode specific ===
            crystal: {
                layers: 3,           // Number of cross-plane layers
                spread: 60,          // Angular spread between layers (degrees)
                petalLength: 80,     // Length of petals from origin
                petalWidth: 30,      // Width of petals
                convergence: 100,    // How much petals point to center (0-100%)
                twist: 0,            // Twist along petal length (degrees)
                bloom: 50,           // Openness of flower (0=closed, 100=flat)
                scale: 100,          // Overall scale (1-100%, can go to dot size)
                centerOffset: { x: 0, y: 0, z: 0 }  // Manual center adjustment
            }
        },
        scene: {
            autoRotate: false
        },
        camera: {
            zoom: 105,          // 30-250, displayed as 0.3-2.5
            fov: 618,           // 1-2000, perspective in px (S-curve mapped)
            rotationZ: -3,      // -180 to 180
            panX: -8,           // -200 to 200
            panY: 61,           // -200 to 200
            sensitivity: 5,     // 1-20, displayed as 0.1-2.0
            pitchClamp: false,
            rollMode: 'world'   // 'view' = roll around view axis, 'world' = roll around world Z
        },
        display: {
            toasts: false,
            stats: true,
            header: false,
            midiToasts: true,
            gamepadToasts: true,
            haze: 52,           // 0 = off, 1-100 = z-depth haze intensity
            greenDesat: 0,      // 0 = off, 1-100 = extra desaturation for green hues
            blur: 0,            // 0 = off, 1-100 = depth-based blur intensity
            dimmer: 100,        // 0-100 = global brightness (100 = full)
            bright: 100         // 100-300 = global brightness boost (100 = normal)
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
            gizmo: false,            // 3D axis gizmo (bottom right corner)
            trackMap: true           // 2D track map widget (bottom left)
        },
        track: {
            enabled: true,
            type: 'catmullrom',      // 'catmullrom' (Bezier handled by curve section)
            preset: 'OVAL_LOOP',     // Closed loop preset

            // Rotation - explicit control over track rotation (synced to BPM)
            rotation: {
                speed: 50,           // 0-100: rotation speed (50 = 1 rev per 4 beats at default BPM)
                direction: 1,        // 1 = CW, -1 = CCW
                syncBpm: true,       // Lock rotation to BPM timing
                ppr: 160             // Pulses per revolution when synced (1 = fast, 256 = slow)
            },

            // Geometry - radialSegments: 0 = centerline only, 1+ = tube with faces
            radius: 23,
            radialSegments: 7,       // 0 = centerline only, 1+ = faces per ring
            segmentsPerSpan: 2,
            color: '#00ff88',
            colorSecondary: '#0088ff',
            wireframe: true,

            // Centerline (used when radialSegments = 0)
            centerlineWidth: 4,      // Base width in px
            centerlineColor: '#ffffff',

            // ===========================================
            // UNIT CIRCLE - the fundamental primitive
            // Everything derives from the circle at each track point
            // ===========================================
            circle: {
                enabled: true,       // Circle is always conceptually present
                visible: true,       // Whether to render the outline
                color: '#d6d9bf',
                borderWidth: 1,
                fill: false,
                opacity: 0.61,
                skip: 4,             // Render every Nth ring

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
                width: 71,           // % of natural width (short edge)
                length: 100,         // % extension outward from circle
                roundness: 52,       // 0 = square, 100 = round
                spin: -98,           // Rotation around element's own axis (degrees)
                spinRate: 0,         // Additional spin per unit φ (degrees per radian)
                color: '#ff00aa',    // Magenta
                colorSecondary: '#d4007a'
            },

            // Tangents - flat boards perpendicular to normals, touching circle
            // One edge touches circle, lies flat (tangent plane to circle)
            tangents: {
                enabled: true,
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
            tension: 0.15,           // 0 = sharp corners, 1 = loose curves

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
            enabled: true,
            follow: false,           // First-person follow cam mode
            stabilize: true,         // Keep chaser level (no roll with tube)
            speed: 3,                // 0-100, relative to BPM (50 = 1 loop per 4 beats at 120 BPM)
            size: 17,                // Square size in px
            tailLength: 54,          // Rectangle length in px
            color: '#b34233',        // Rust/red primary
            colorSecondary: '#8b2500' // Darker rust accent
        },
        pip: {
            enabled: false,          // PIP overlay enabled
            showWhenFollow: false,   // Auto-show when entering follow mode
            viewMode: 'global',      // 'global' | 'overhead'
            lod: 0.5,                // Level of detail (0.5 = half segments)
            position: {
                left: 20,
                bottom: 100
            },
            size: {
                width: 280,
                height: 200
            }
        },
        lfo: {
            enabled: true,           // Master LFO enable
            lfos: {
                // Example LFO (can be empty by default)
                // lfo_default: {
                //     id: 'lfo_default',
                //     enabled: true,
                //     waveform: 'sine',
                //     frequency: 1.0,
                //     amplitude: 1.0,
                //     offset: 0.5,
                //     phase: 0,
                //     sync: false,
                //     syncDiv: 1
                // }
            }
        },
        keyboard: {
            enabled: true,           // Keyboard input enabled
            learnMode: false         // Keyboard learn mode
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
