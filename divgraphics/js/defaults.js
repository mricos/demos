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
            shape: 'uv-sphere',      // 'cylinder' | 'uv-sphere' | 'ico-sphere'
            radius: 30,
            height: 102,
            radialSegments: 16,
            heightSegments: 1,
            scale: 21,               // 0-200: uniform scale (100 = 1.0)
            // Sphere-specific (latSegments = heightSegments, lonSegments = radialSegments)
            subdivisions: 2,         // For ico-sphere: 0=20, 1=80, 2=320, 3=1280 faces
            color: '#acc8b2',
            colorSecondary: '#cfb5c6',
            wireframe: true
        },
        animation: {
            pps: 0.6551967019291817,  // Pulses per second (0.5-4 range, log scale in UI)
            ppr: 43,                   // Pulses per revolution (160 = very slow, 1 = fast, 256 max)
            playing: true
        },
        inner: {
            enabled: true,
            shape: 'uv-sphere',      // 'cylinder' | 'uv-sphere' | 'ico-sphere'
            radius: 99,
            height: 116,
            radialSegments: 22,
            heightSegments: 5,
            scale: 20,               // 0-200: uniform scale (100 = 1.0)
            // Sphere-specific
            subdivisions: 2,         // For ico-sphere
            color: '#ff00aa',
            colorSecondary: '#00d4ff',
            wireframe: true
        },
        sphere: {
            enabled: true,
            type: 'uv-sphere',       // 'uv-sphere' | 'ico-sphere' | 'ring-sphere'
            radius: 177,
            latSegments: 12,
            lonSegments: 24,
            color: '#00d4ff',
            colorSecondary: '#ff00aa',
            wireframe: true,
            wireframeMode: 'border', // 'border' (original thick) or 'edge' (thin lines)
            faceInward: false,
            borderWidth: 100,        // Line thickness (1-400 → 0.01-4.0px)
            opacity: 0.85,           // 0.0-1.0
            scale: 39,               // 0-200: uniform scale (100 = 1.0)
            // Ring/Panel sphere specific
            segmentSize: 2,          // 0.1-20px line width / panel size
            roundness: 50,           // 0=square, 100=circle for segments
            flat: false,             // Panel sphere: true = flat panels, false = face outward
            // Pulse (driven by audio LFO)
            pulse: 1,                // 0-100: current pulse value (50 = middle)
            pulseDepth: 40           // 0-100: how much pulse affects opacity
        },
        icosahedron: {
            enabled: false,
            dual: false,             // false = icosahedron (20 tri), true = dodecahedron (12 pent)
            radius: 100,
            subdivisions: 0,         // 0=base shape, 1+=subdivided
            color: '#00ff88',
            colorSecondary: '#0088ff',
            wireframe: true,
            faceInward: false,
            borderWidth: 100,        // Line thickness (1-400 → 0.01-4.0px)
            opacity: 0.85            // 0.0-1.0
        },
        curve: {
            enabled: true,
            radius: 11,
            curveSegments: 21,
            radialSegments: 13,      // Number of radial faces (all modes use pieceCount, this is legacy)
            color: '#00ff88',
            colorSecondary: '#0088ff',
            wireframe: true,
            // Control points stored as flat values for UI binding
            p0x: -197, p0y: -200, p0z: -140,
            p1x: -170, p1y: -99, p1z: -200,
            p2x: -200, p2y: -200, p2z: -140,

            // Mode: 'bezier' | 'distribute' | 'crystal'
            mode: 'distribute',

            // === Geometry parameters (shared across all modes) ===
            length: 63,              // Segment/petal length as % (0-200)
            spacing: 81,             // Gap between segments (0-200%, 100=natural)
            twist: -9,               // Rotation delta per segment in degrees
            borderWidth: 0,          // Border width (5-200 slider → 0.05-2px)
            faceWidthScale: 24,      // Face width scale (0-200, 100=natural)
            loopBorder: true,        // Full border loop (true) vs hairline edges only (false)
            softness: 0,             // Blur to soften lines (0-100 → 0-5px blur)
            round: 0,                // Round corners (0=square, 100=fully rounded)

            // === Shared modulation parameters (all modes respond to these) ===
            pieceCount: 32,          // Number of radial segments/petals (unified across modes)
            phase: 249,              // Global phase offset (0-360)
            spin: -50,               // Rotation per piece (degrees)
            spread: 4,               // Distribution spread (0=stacked at center, 100=evenly distributed)
            sineAmplitudeX: 0,       // Sine modulation amplitude for X/normal
            sineAmplitudeY: 0,       // Sine modulation amplitude for Y/binormal
            sineAmplitudeZ: 95,      // Sine modulation amplitude for Z/tangent
            sineFrequency: 4,        // Sine wave cycles per loop

            // === Breathing parameters (beat-synced animation) ===
            breathe: true,           // Enable breathing animation
            breatheScale: 40,        // How much size changes (0-100%)
            breatheSpeed: 5,         // Beats per breath cycle (1-32, 4 = 1 bar)
            breathePhase: 171,       // Phase offset for breathing (0-360)

            // === Transition parameters ===
            transitionDuration: 500, // Duration in ms for mode transitions
            transitionEasing: 'easeInOut', // 'linear', 'easeIn', 'easeOut', 'easeInOut'

            // === Rotation around center of mass ===
            rotateX: -139,           // Rotation around COM X axis (degrees)
            rotateY: -71,            // Rotation around COM Y axis (degrees)
            rotateZ: 102,            // Rotation around COM Z axis (degrees)

            // === Crystal mode specific ===
            crystal: {
                layers: 2,           // Number of cross-plane layers
                spread: 0,           // Angular spread between layers (degrees)
                petalLength: 20,     // Length of petals from origin
                petalWidth: 5,       // Width of petals
                convergence: 98,     // How much petals point to center (0-100%)
                twist: -71,          // Twist along petal length (degrees)
                bloom: 35,           // Openness of flower (0=closed, 100=flat)
                scale: 49,           // Overall scale (1-100%, can go to dot size)
                centerOffset: { x: 0, y: 0, z: 0 }  // Manual center adjustment
            },

            // === Position offset (per-mode) ===
            bezierOffset: { x: 0, y: 0, z: 0 },      // Offset for bezier/free mode
            distributeOffset: { x: 0, y: 0, z: 0 },  // Offset for distribute/bound mode
            crystalOffset: { x: 0, y: 2, z: -2 },    // Offset for crystal mode

            // === Scale factor (per-mode) ===
            bezierScale: 20,         // Scale for bezier/free mode (0-200%)
            distributeScale: 45,     // Scale for distribute/bound mode (0-200%)
            crystalScale: 18,        // Scale for crystal mode (0-200%)

            // === Bounding box (debug/visualization) ===
            showBoundingBox: false,       // Toggle bounding box visibility
            boundingBoxColor: '#ffffff',  // Box edge color
            boundingBoxOpacity: 0.5       // Box edge opacity (0-1)
        },
        scene: {
            autoRotate: false
        },
        camera: {
            zoom: 100,          // 30-250, displayed as 0.3-2.5
            fov: 1359,          // 1-2000, perspective in px (S-curve mapped)
            rotationZ: 0,       // -180 to 180
            panX: 0,            // -200 to 200
            panY: 0,            // -200 to 200
            sensitivity: 5,     // 1-20, displayed as 0.1-2.0
            pitchClamp: true,
            rollMode: 'world'   // 'view' = roll around view axis, 'world' = roll around world Z
        },
        display: {
            toasts: true,
            stats: false,
            header: true,
            midiToasts: true,
            gamepadToasts: true,
            haze: 75,           // 0 = off, 1-100 = z-depth haze intensity
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
                A: { maps: {
                    map_curve_phase_lfo: {
                        id: 'map_curve_phase_lfo',
                        source: {
                            type: 'lfo',
                            key: 'lfo_curve_phase',
                            fullKey: 'lfo:lfo_curve_phase',
                            device: null
                        },
                        target: {
                            path: 'curve.phase',
                            elementId: 'curvePhase',
                            type: 'range'
                        },
                        domain: {
                            inputMin: 0,
                            inputMax: 1,
                            outputMin: 0,
                            outputMax: 360,
                            step: null
                        },
                        behavior: {
                            direction: 'normal',
                            mode: 'absolute',
                            stepSize: 10,
                            curveA: 1,
                            curveB: 1,
                            curveMid: 0.5
                        },
                        intent: { inferredAction: 'absolute' },
                        meta: { createdAt: 0, label: 'curvePhase' }
                    }
                }},
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
            hud: false,              // Camera direction HUD (bottom center)
            gizmo: false,            // 3D axis gizmo (bottom right corner)
            trackMap: true           // 2D track map widget (bottom left)
        },
        track: {
            enabled: true,
            type: 'catmullrom',      // 'catmullrom' (Bezier handled by curve section)
            preset: 'OVAL_LOOP',     // Closed loop preset
            radius: 177,             // 50-200: track path distance from center (100 = 1.0x preset scale)

            // Rotation - explicit control over track rotation (synced to BPM)
            rotation: {
                speed: 9,            // 0-100: rotation speed (50 = 1 rev per 4 beats at default BPM)
                direction: -1,       // 1 = CW, -1 = CCW
                syncBpm: true,       // Lock rotation to BPM timing
                ppr: 256             // Pulses per revolution when synced (1 = fast, 256 = slow)
            },

            // Geometry - radialSegments: 0 = centerline only, 1+ = tube with faces
            radialSegments: 7,       // 0 = centerline only, 1+ = faces per ring
            segmentsPerSpan: 2,
            color: '#00ff88',
            colorSecondary: '#0088ff',
            wireframe: true,

            // Centerline (used when radialSegments = 0)
            centerlineWidth: 4,      // Base width in px
            centerlineColor: '#ffffff',

            // ===========================================
            // HOOP - the ring geometry at each track point
            // ===========================================
            hoop: {
                enabled: true,       // Hoop is always conceptually present
                visible: true,       // Whether to render the outline
                radius: 23,          // Tube radius (size of hoop cross-section)
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
                roundness: 75,       // 0 = square, 100 = round
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
            variationSource: 'perlin', // 'none' | 'perlin' | 'random' | 'music'
            variationIntensity: 59   // 0-100
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
            // Speed controls (similar to track.rotation)
            speed: 70,               // 0-100: movement speed (50 = 1 loop per 4 beats)
            direction: -1,           // 1 = forward, -1 = reverse
            syncBpm: true,           // Lock speed to BPM timing
            smoothing: 82,           // 0-100: rotation smoothing (0 = snap, 100 = very smooth)
            // Head appearance
            size: 10,                // Head size in px
            headShape: 'diamond',    // 'square', 'circle', 'diamond'
            headRoundness: 62,       // 0-100: corner roundness for square
            headOpacity: 100,        // 0-100
            // Body/Wings appearance (perpendicular to travel - like wings)
            bodyLength: 14,          // Wing span in px
            bodyWidth: 3,            // Wing width in px
            bodyAngle: 193,          // 0-360: rotation around travel axis
            bodyRoundness: 100,      // 0-100: corner roundness (0 = square, 100 = fully rounded)
            bodyOpacity: 91,         // 0-100
            bodyStyle: 'solid',      // 'gradient', 'solid', 'glow'
            // Tail/Exhaust appearance (extends from back of body)
            tailLength: 25,          // Exhaust length in px
            tailWidth: 6,            // Exhaust width in px
            tailAngle: 89,           // 0-360: rotation around travel axis (0 = same plane as body)
            tailOpacity: 64,         // 0-100
            tailStyle: 'glow',       // 'gradient', 'solid', 'glow'
            // Glow effects
            glowSize: 4,             // Glow radius in px
            glowIntensity: 83,       // 0-100
            // Colors
            color: '#b54e21',        // Orange/rust primary
            colorSecondary: '#e7aa04' // Gold accent
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
                lfo_curve_phase: {
                    id: 'lfo_curve_phase',
                    enabled: true,
                    waveform: 'saw',
                    frequency: 0.044,    // Slow sweep (~23 sec cycle)
                    amplitude: 1,
                    offset: 0.5,
                    phase: 0,
                    sync: false,
                    syncDiv: 4,
                    _currentPhase: 0,
                    _lastRandomCycle: -1,
                    _randomValue: 0.5
                }
            }
        },
        keyboard: {
            enabled: true,           // Keyboard input enabled
            learnMode: false         // Keyboard learn mode
        },
        audio: {
            enabled: false,          // Master audio enable (starts off, requires user gesture)
            masterVolume: 50,        // 0-100: master output volume

            // Chaser audio - brown noise with sweepable bandpass for Doppler effect
            chaser: {
                enabled: true,
                volume: 50,          // 0-100: chaser sound volume
                filterMin: 200,      // Minimum bandpass frequency (far/muffled)
                filterMax: 2000,     // Maximum bandpass frequency (near/bright)
                filterQ: 2,          // Bandpass Q (1-10, higher = narrower band)
                stereoWidth: 80      // 0-100: stereo spread based on position
            },

            // Sphere hum - sawtooth oscillator with LFO pulsing
            sphere: {
                enabled: true,
                volume: 33,          // 0-100: sphere hum volume
                baseFreq: 40,        // Base frequency in Hz
                filterFreq: 50,      // Lowpass filter cutoff
                filterQ: 4,          // Filter resonance (0.5-10)
                lfoRate: 0.2,        // Pulse rate in Hz
                lfoDepth: 42,        // 0-100: pulse depth
                // ADSR envelope for smooth start/stop
                attack: 1.2,         // Attack time - pronounced ramp up
                decay: 0.5,          // Decay time - settle into sustain
                sustain: 75,         // Sustain level 0-100 (% of peak)
                release: 1.5,        // Release time - gradual power down
                // Startup sweep (absolute Hz values)
                startFreq: 27,           // Start frequency in Hz
                overshootFreq: 60,       // Overshoot frequency in Hz
                startFilter: 45,         // Start filter cutoff in Hz
                overshootFilter: 225     // Overshoot filter cutoff in Hz
            },

            // Cabin noise - cockpit rattle in follow mode
            cabin: {
                enabled: true,
                volume: 20,          // 0-100: cabin noise volume
                filterFreq: 100      // Lowpass cutoff (rumble character)
            },

            // Engine rumble - vehicle presence sound
            engine: {
                enabled: true,
                volume: 20,          // 0-100: engine volume
                baseFreq: 40,        // Base frequency in Hz (low rumble)
                filterFreq: 100      // Lowpass cutoff
            },

            // Particle Cluster Synth - lush tines triggered by collisions
            cluster: {
                enabled: true,
                volume: 30,          // 0-100: cluster synth volume

                // Oscillator cluster settings
                baseFreq: 440,       // Base frequency in Hz (A4)
                clusterSize: 4,      // Number of detuned oscillators (1-6)
                detune: 8,           // Detune spread in cents (0-50)
                waveform: 'triangle', // 'sine', 'triangle', 'sawtooth'

                // Filter
                filterFreq: 2000,    // Lowpass cutoff (200-8000 Hz)
                filterQ: 1.5,        // Filter resonance (0.5-10)

                // ADSR envelope
                attack: 0.01,        // Attack time in seconds (0.001-0.5)
                decay: 0.3,          // Decay time in seconds (0.01-2)
                sustain: 30,         // Sustain level 0-100
                release: 1.5,        // Release time in seconds (0.1-5)
                hold: 200,           // Hold time before release in ms (50-2000)

                // Velocity/dynamics
                velocity: 80,        // 0-100: velocity sensitivity

                // Reverb
                reverbMix: 35,       // 0-100: wet/dry mix
                reverbDamping: 4000  // Reverb high-frequency damping (1000-10000 Hz)
            }
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
            zoomMin: 10,
            zoomMax: 800,
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
