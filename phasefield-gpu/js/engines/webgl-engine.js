/**
 * WebGL Engine - GPU-accelerated wave field computation
 * Uses fragment shaders to compute wave interference in parallel
 */
window.FP = window.FP || {};

window.FP.WebGLEngine = (function() {
    'use strict';

    const Config = window.FP.Config;
    const Matter = window.FP.Matter;
    const Optics = window.FP.Optics;

    class WebGLEngine {
        constructor() {
            this.type = 'webgl';
            this.canvas = null;
            this.overlayCanvas = null;
            this.overlayCtx = null;
            this.gl = null;
            this.program = null;
            this.locations = {};
            this.vao = null;
            this.paletteTexture = null;
        }

        initialize(canvas) {
            this.canvas = canvas;

            // Get or create overlay canvas for 2D drawing
            this.overlayCanvas = document.getElementById('overlay-canvas');
            if (!this.overlayCanvas) {
                throw new Error('Overlay canvas not found - add #overlay-canvas to HTML');
            }
            this.overlayCtx = this.overlayCanvas.getContext('2d');

            // Get WebGL2 context
            const gl = canvas.getContext('webgl2', {
                alpha: false,
                depth: false,
                antialias: false,
                preserveDrawingBuffer: false,
                powerPreference: 'high-performance'
            });

            if (!gl) {
                throw new Error('WebGL2 not supported');
            }

            this.gl = gl;

            console.log('[WebGLEngine] Context acquired');
            console.log('[WebGLEngine] Max texture size:', gl.getParameter(gl.MAX_TEXTURE_SIZE));
            console.log('[WebGLEngine] Max uniforms:', gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS));

            // Compile shaders
            this.program = this.createShaderProgram();

            // Get uniform locations
            this.cacheUniformLocations();

            // Set up geometry (fullscreen quad)
            this.setupGeometry();

            // Set viewport
            gl.viewport(0, 0, canvas.width, canvas.height);

            // Sync overlay canvas size
            this.resizeOverlay();

            console.log('[WebGLEngine] Initialized successfully');
        }

        resizeOverlay() {
            if (this.overlayCanvas && this.canvas) {
                this.overlayCanvas.width = this.canvas.width;
                this.overlayCanvas.height = this.canvas.height;
            }
        }

        createShaderProgram() {
            const gl = this.gl;

            // Vertex shader: simple fullscreen quad
            const vertexShaderSource = `#version 300 es
                precision highp float;

                in vec2 a_position;
                out vec2 v_texCoord;

                void main() {
                    v_texCoord = a_position * 0.5 + 0.5;
                    gl_Position = vec4(a_position, 0.0, 1.0);
                }
            `;

            // Fragment shader: wave field computation
            const fragmentShaderSource = `#version 300 es
                precision highp float;

                in vec2 v_texCoord;
                out vec4 fragColor;

                // Canvas dimensions
                uniform vec2 u_resolution;

                // Wave parameters
                uniform float u_time;
                uniform float u_frequency;
                uniform float u_amplitude;
                uniform float u_distortion;

                // Wave sources (max 16)
                #define MAX_SOURCES 16
                uniform vec2 u_sources[MAX_SOURCES];
                uniform float u_source_phases[MAX_SOURCES];
                uniform int u_num_sources;

                // Optical elements (max 32)
                #define MAX_ELEMENTS 32
                struct Element {
                    vec2 position;
                    float angle;
                    float length;
                    float thickness;
                    int type;  // 0=wall, 1=aperture, 2=lens, 3=grating, 4=mirror
                    float param1;  // slitWidth for aperture, focalLength for lens
                    float param2;  // slitSeparation for aperture
                    int slitCount;  // number of slits for aperture
                    float curvature;  // focal length for parabolic curve (0=flat)
                    float reflCoeff;
                };
                uniform Element u_elements[MAX_ELEMENTS];
                uniform int u_num_elements;

                // Palette texture
                uniform sampler2D u_palette;
                uniform float u_colorCycle;

                // Wave value range for normalization
                uniform vec2 u_waveRange;  // (min, max)

                // Diffraction control
                uniform float u_diffractionStrength;  // 0-100

                // Shared physics constants (synchronized with Config.physics in config.js)
                const float FREQUENCY_SCALE = 0.05;        // Spatial frequency scaling (must match Config.physics.frequencyScale)
                const float DISTANCE_FALLOFF = 0.01;       // Distance falloff base (must match Config.physics.distanceFalloffBase)
                const float EDGE_DIFFRACTION_RANGE = 5.0;  // Wavelengths for edge diffraction (must match Config.physics.edgeDiffractionRange)

                /**
                 * Distance from point (px, py) to line segment (x1,y1)-(x2,y2)
                 */
                float distanceToSegment(vec2 p1, vec2 p2, vec2 p) {
                    vec2 d = p2 - p1;
                    float lenSq = dot(d, d);

                    if (lenSq < 0.0001) {
                        return length(p - p1);
                    }

                    float t = clamp(dot(p - p1, d) / lenSq, 0.0, 1.0);
                    vec2 proj = p1 + t * d;
                    return length(p - proj);
                }

                /**
                 * Check curved barrier intersection using sampling
                 */
                float checkCurvedIntersection(vec2 local1, vec2 local2, Element elem, out float intersectY) {
                    float halfLen = elem.length * 0.5;
                    float halfThick = elem.thickness * 0.5;
                    float curvature = elem.curvature;

                    // Sample points along the parabolic curve
                    const int samples = 20;
                    float minDist = 1e6;
                    intersectY = 0.0;

                    for (int i = 0; i <= samples; i++) {
                        float t = (float(i) / float(samples)) * 2.0 - 1.0;  // -1 to 1
                        float y = t * halfLen;
                        float xCurve = (y * y) / (4.0 * curvature);

                        vec2 curvePoint = vec2(xCurve, y);
                        float dist = distanceToSegment(local1, local2, curvePoint);

                        if (dist < minDist) {
                            minDist = dist;
                            intersectY = y;
                        }
                    }

                    // Check if ray is close enough to curve
                    if (minDist < halfThick) {
                        return 1.0;  // Hit the curve
                    }

                    return 0.0;  // Miss
                }

                /**
                 * Check if ray from p1 to p2 intersects element
                 * Returns: amplitude factor (0.0-1.0) for transmission
                 * - For walls/mirrors: blocks transmission (returns 0.0), reflection handled separately
                 * - For apertures: returns 0.0 for blocked, 1.0 for slit pass-through
                 * - For lenses: returns transmission coefficient
                 * out_edgeDistance: distance to nearest edge (for edge diffraction)
                 */
                float checkRayIntersection(vec2 p1, vec2 p2, Element elem, float basePhase, out float edgeDistance) {
                    // Initialize edge distance to large value
                    edgeDistance = 1e6;

                    // Transform ray to element's local space
                    // Canvas uses Y-down coordinates
                    // Standard rotation matrix for coordinate transformation
                    float cos_a = cos(-elem.angle);
                    float sin_a = sin(-elem.angle);

                    vec2 d1 = p1 - elem.position;
                    vec2 d2 = p2 - elem.position;

                    // Rotation matrix: same as CPU/Canvas version (matter.js:79-86)
                    vec2 local1 = vec2(
                        d1.x * cos_a - d1.y * sin_a,
                        d1.x * sin_a + d1.y * cos_a
                    );

                    vec2 local2 = vec2(
                        d2.x * cos_a - d2.y * sin_a,
                        d2.x * sin_a + d2.y * cos_a
                    );

                    float intersectY = 0.0;
                    bool hitsCurve = false;

                    // Handle curved barriers
                    if (abs(elem.curvature) > 0.1) {
                        float hit = checkCurvedIntersection(local1, local2, elem, intersectY);
                        if (hit > 0.5) {
                            hitsCurve = true;
                        } else {
                            return 1.0;  // No intersection with curve
                        }
                    } else {
                        // Flat barrier - check if ray crosses element plane (X = 0 in local space)
                        if ((local1.x < 0.0 && local2.x < 0.0) || (local1.x > 0.0 && local2.x > 0.0)) {
                            return 1.0;  // Doesn't cross plane
                        }

                        // Avoid division by zero
                        float dx = local2.x - local1.x;
                        if (abs(dx) < 0.0001) {
                            return 1.0;
                        }

                        // Calculate intersection parameter
                        float t = -local1.x / dx;
                        if (t < 0.0 || t > 1.0) {
                            return 1.0;  // Intersection not between endpoints
                        }

                        // Calculate Y coordinate of intersection
                        intersectY = local1.y + t * (local2.y - local1.y);
                    }

                    // Check if within element length bounds
                    if (abs(intersectY) > elem.length * 0.5) {
                        edgeDistance = 1e6;  // Far from edges
                        return 1.0;  // Outside element bounds
                    }

                    // Calculate distance to nearest edge (for edge diffraction)
                    edgeDistance = elem.length * 0.5 - abs(intersectY);

                    // Element type specific logic
                    if (elem.type == 0 || elem.type == 4) {
                        // Wall or Mirror - COMPLETELY BLOCKS direct transmission
                        // Reflection is handled separately in calculateWaveField
                        return 0.0;
                    }
                    else if (elem.type == 1) {
                        // Aperture - check if passes through slit(s)
                        float slitWidth = elem.param1;
                        float slitSeparation = elem.param2;
                        int slitCount = elem.slitCount;

                        // Special case: slitCount = 0 means SOLID BARRIER (no slits at all)
                        if (slitCount == 0) {
                            // Treat as solid wall - blocks completely
                            return 0.0;
                        }

                        // Check single slit centered at Y=0
                        if (slitCount == 1) {
                            if (abs(intersectY) <= slitWidth * 0.5) {
                                return 1.0;  // Passes through slit
                            }
                            // Blocked by aperture material
                            return 0.0;
                        }

                        // Multiple slits: check if in any slit
                        // Slits placed middle-out using slitWidth * 2.0 spacing
                        bool inSlit = false;

                        // Odd number: center slit + symmetric pairs
                        if (mod(float(slitCount), 2.0) > 0.5) {
                            // Center slit
                            if (abs(intersectY) <= slitWidth * 0.5) {
                                inSlit = true;
                            }
                            // Symmetric pairs
                            for (int i = 1; i <= 4; i++) {
                                if (i > slitCount / 2) break;
                                float offset = float(i) * slitWidth * 2.0;
                                if (abs(intersectY - offset) <= slitWidth * 0.5 ||
                                    abs(intersectY + offset) <= slitWidth * 0.5) {
                                    inSlit = true;
                                    break;
                                }
                            }
                        } else {
                            // Even number: symmetric pairs on either side
                            for (int i = 0; i < 4; i++) {
                                if (i >= slitCount / 2) break;
                                float offset = (float(i) + 0.5) * slitWidth * 2.0;
                                if (abs(intersectY - offset) <= slitWidth * 0.5 ||
                                    abs(intersectY + offset) <= slitWidth * 0.5) {
                                    inSlit = true;
                                    break;
                                }
                            }
                        }

                        if (inSlit) {
                            return 1.0;
                        } else {
                            // Blocked by aperture material
                            return 0.0;
                        }
                    }
                    else if (elem.type == 2) {
                        // Lens - refracts but doesn't block
                        // Return transmission coefficient (1.0 - reflCoeff for lenses)
                        return 1.0 - elem.reflCoeff;  // Transmission coefficient
                    }

                    return 1.0;  // Default: unblocked
                }

                /**
                 * Calculate reflection contribution from a barrier
                 * Returns reflected wave amplitude based on reflection coefficient and edge effects
                 *
                 * REFLECTION COEFFICIENT BEHAVIOR:
                 * - 0.0: Black body (total absorption, no reflection)
                 * - 0.0-1.0: Partial reflection (energy absorbed, reflection strength increases)
                 * - 1.0: Perfect mirror (specular reflection, no absorption)
                 * - 1.0-2.0: Iridescent dispersion (wavelength-dependent scattering, creates rainbow effects)
                 */
                float calculateReflection(vec2 pos, vec2 source, Element elem, float sourcePhase, float edgeDistance) {
                    // Only reflective surfaces contribute
                    if (elem.reflCoeff < 0.01) {
                        return 0.0;
                    }

                    // Calculate wavelength for dispersion effects
                    float wavelength = 20.0 / max(u_frequency, 0.1);

                    // Find reflection point on barrier
                    // Normal points perpendicular to barrier surface
                    vec2 barrierNormal = vec2(cos(elem.angle), sin(elem.angle));

                    // Calculate mirror image of source across barrier plane
                    // This is the virtual source that creates the reflected wave
                    vec2 toSource = source - elem.position;
                    float distToBarrier = dot(toSource, barrierNormal);
                    vec2 mirrorSource = source - 2.0 * distToBarrier * barrierNormal;

                    // === IRIDESCENT DISPERSION MODE (reflCoeff > 1.0) ===
                    // Creates wavelength-dependent scattering for rainbow/prismatic effects
                    if (elem.reflCoeff > 1.0) {
                        // Iridescence strength: 0.0 at reflCoeff=1.0, 1.0 at reflCoeff=2.0
                        float iridescenceStrength = elem.reflCoeff - 1.0;

                        // Chromatic dispersion: wavelength-dependent angular shift
                        // Shorter wavelengths (higher frequency) scatter more
                        // This mimics prism, diffraction grating, or opal effects
                        float freqNorm = (u_frequency - 0.5) / 3.0;  // Normalize frequency range
                        float chromaticShift = freqNorm * iridescenceStrength * 80.0;  // Increased from 50 to 80

                        // Apply angular shift to mirror source (perpendicular to normal)
                        vec2 perpendicular = vec2(-barrierNormal.y, barrierNormal.x);
                        mirrorSource += perpendicular * chromaticShift;

                        // Add slight spatial spread for "spreading" rainbow effect
                        float spreadAmount = iridescenceStrength * 30.0;
                        mirrorSource += barrierNormal * sin(freqNorm * 6.28) * spreadAmount;
                    }

                    // Distance from mirror source to observation point
                    float reflectedDistance = length(pos - mirrorSource);

                    // Phase of reflected wave
                    // Phase inversion (+π) occurs for hard surface reflections
                    float reflectedPhase = reflectedDistance * u_frequency * FREQUENCY_SCALE - u_time + sourcePhase + 3.14159;

                    // === AMPLITUDE CALCULATION ===

                    // Base reflection amplitude (clamp standard reflection to 1.0)
                    float baseReflCoeff = min(elem.reflCoeff, 1.0);
                    float reflAmp = baseReflCoeff;

                    // Boost base amplitude to make reflections more visible
                    reflAmp *= 1.5;

                    // === EDGE ENHANCEMENT ===
                    // Near edges, reflection becomes more diffuse and pronounced
                    if (edgeDistance < wavelength * EDGE_DIFFRACTION_RANGE) {
                        // Edge diffraction strength increases near edges
                        float edgeFactor = 1.0 - (edgeDistance / (wavelength * EDGE_DIFFRACTION_RANGE));

                        // For high reflection coefficients (> 1.0), boost edge effects dramatically
                        // This creates the "spreading" rainbow effect at edges
                        if (elem.reflCoeff > 1.0) {
                            float iridescenceBoost = (elem.reflCoeff - 1.0) * 5.0;  // Increased from 3.0 to 5.0
                            reflAmp *= (1.0 + edgeFactor * iridescenceBoost);
                        } else {
                            // Normal edge diffraction enhancement
                            reflAmp *= (1.0 + edgeFactor * 0.5);  // Increased from 0.3 to 0.5
                        }
                    }

                    // Calculate reflected wave
                    float reflectedWave = sin(reflectedPhase) * reflAmp;

                    // Distance falloff (reflection weakens with distance)
                    float falloff = 1.0 / (reflectedDistance * DISTANCE_FALLOFF + 1.0);

                    return reflectedWave * falloff;
                }

                /**
                 * Calculate edge diffraction contribution from a barrier edge
                 * Uses Huygens-Fresnel principle: edge acts as secondary wave source
                 * This creates the characteristic wave spreading around obstacles
                 */
                float calculateEdgeDiffraction(vec2 pos, vec2 edgePoint, vec2 source, float sourcePhase) {
                    // Calculate wavelength (spatial period of wave)
                    float wavelength = 20.0 / max(u_frequency, 0.1);

                    // Distance from source to edge (illumination path)
                    float d1 = length(edgePoint - source);
                    // Distance from edge to observation point (scattered path)
                    float d2 = length(pos - edgePoint);

                    // Total optical path length through edge point
                    float totalDistance = d1 + d2;

                    // === AMPLITUDE CALCULATION ===

                    // Base amplitude: Huygens-Fresnel principle says secondary sources
                    // have amplitude proportional to 1/sqrt(distance)
                    // Boost factor: 8.0 to make diffraction visible
                    float amplitude = 8.0 / sqrt(totalDistance + 1.0);

                    // Wavelength-dependent diffraction strength
                    // Longer wavelengths (lower frequency) bend more around obstacles
                    // This is a fundamental wave property
                    float beta = d2 / wavelength;

                    // Fresnel diffraction envelope
                    // exp(-beta/scale) means:
                    //   - Small beta (close to edge, long wavelength): strong diffraction
                    //   - Large beta (far from edge, short wavelength): weak diffraction
                    // Scale of 15.0 creates gradual falloff
                    amplitude *= exp(-beta / 15.0);

                    // Additional geometric spreading factor
                    // Near edges get more contribution (Fresnel zones)
                    float edgeProximity = 1.0 / (1.0 + d2 * 0.02);
                    amplitude *= (1.0 + edgeProximity);

                    // === PHASE CALCULATION ===

                    // Phase accumulated along total optical path
                    // Includes time evolution and source phase offset
                    float phase = totalDistance * u_frequency * FREQUENCY_SCALE - u_time + sourcePhase;

                    // Return wave contribution from this edge point
                    // sin(phase) gives oscillating wave, scaled by amplitude
                    return sin(phase) * amplitude;
                }

                /**
                 * Calculate wave field at current pixel with proper diffraction
                 */
                float calculateWaveField(vec2 pos) {
                    float sum = 0.0;
                    float wavelength = 20.0 / max(u_frequency, 0.1);

                    // Scale diffraction strength from 0-100 slider to 0-1 range
                    // Higher values = more wave-like, artistic diffraction
                    float diffractionScale = u_diffractionStrength / 100.0;

                    for (int i = 0; i < MAX_SOURCES; i++) {
                        if (i >= u_num_sources) break;

                        vec2 source = u_sources[i];
                        vec2 delta = pos - source;
                        float distance = length(delta);

                        // Calculate phase
                        float basePhase = distance * u_frequency * FREQUENCY_SCALE - u_time + u_source_phases[i];

                        // Check optical path - does ray reach target?
                        float amplitude = 1.0;
                        int blockingElement = -1;
                        float blockingEdgeDist = 1e6;

                        for (int j = 0; j < MAX_ELEMENTS; j++) {
                            if (j >= u_num_elements) break;

                            float edgeDist = 0.0;
                            float pathFactor = checkRayIntersection(source, pos, u_elements[j], basePhase, edgeDist);
                            amplitude *= pathFactor;

                            // Track which element blocked us (first one to significantly block)
                            if (pathFactor < 0.01 && blockingElement < 0) {
                                blockingElement = j;
                                blockingEdgeDist = edgeDist;
                            }
                        }

                        // Add direct path contribution (if not completely blocked)
                        if (amplitude > 0.0) {
                            // Calculate wave
                            float wave = sin(basePhase) * u_amplitude * amplitude;

                            // Apply distance falloff
                            float falloff = pow(distance * DISTANCE_FALLOFF + 1.0, u_distortion);
                            sum += wave / falloff;
                        }

                        // If blocked, add REFLECTION and EDGE DIFFRACTION
                        if (blockingElement >= 0) {
                            Element elem = u_elements[blockingElement];

                            // === REFLECTION from walls and mirrors ===
                            if (elem.type == 0 || elem.type == 4) {
                                float reflContrib = calculateReflection(pos, source, elem, u_source_phases[i], blockingEdgeDist);
                                // Scale reflection by diffraction strength for artistic control
                                sum += reflContrib * u_amplitude * (0.5 + 0.5 * diffractionScale);
                            }

                            // === EDGE DIFFRACTION - Huygens-Fresnel principle ===
                            // When blocked, edges of the obstacle become secondary wave sources
                            // This creates the characteristic wave spreading around obstacles

                            // Only apply edge diffraction when diffractionStrength > 0
                            if (diffractionScale > 0.01) {
                                // Calculate edge points of the blocking element
                                float halfLen = elem.length * 0.5;

                                // Top edge point (in world coordinates)
                                vec2 edgeTop = elem.position + vec2(
                                    -halfLen * sin(elem.angle),
                                    halfLen * cos(elem.angle)
                                );

                                // Bottom edge point
                                vec2 edgeBottom = elem.position + vec2(
                                    halfLen * sin(elem.angle),
                                    -halfLen * cos(elem.angle)
                                );

                                // Calculate diffraction contribution from both edges
                                float topEdgeDiffraction = calculateEdgeDiffraction(pos, edgeTop, source, u_source_phases[i]);
                                float bottomEdgeDiffraction = calculateEdgeDiffraction(pos, edgeBottom, source, u_source_phases[i]);

                                // Scale by diffraction strength and add to sum
                                // Higher diffractionStrength = more pronounced wave bending
                                float edgeContribution = (topEdgeDiffraction + bottomEdgeDiffraction) * diffractionScale;
                                sum += edgeContribution * u_amplitude;
                            }

                            // Add minimal diffraction leakage for non-reflective surfaces
                            // This prevents completely black shadows even at low diffraction strength
                            if (elem.reflCoeff < 0.01) {
                                float leakage = 0.001 * diffractionScale;  // Scale leakage by diffraction
                                float leakedWave = sin(basePhase) * u_amplitude * leakage;
                                float falloff = pow(distance * DISTANCE_FALLOFF + 1.0, u_distortion);
                                sum += leakedWave / falloff;
                            }
                        }
                    }

                    return sum;
                }

                void main() {
                    // Convert texture coordinates to pixel coordinates
                    vec2 pixelPos = v_texCoord * u_resolution;

                    // Calculate wave field
                    float waveValue = calculateWaveField(pixelPos);

                    // Normalize to 0..1 using provided range
                    float rangeMin = u_waveRange.x;
                    float rangeMax = u_waveRange.y;
                    float rangeDelta = max(0.1, rangeMax - rangeMin);
                    float normalized = (waveValue - rangeMin) / rangeDelta;
                    normalized = clamp(normalized, 0.0, 1.0);

                    // Apply color cycling
                    float palettePos = mod(normalized * u_colorCycle, 1.0);

                    // Sample palette texture
                    vec4 color = texture(u_palette, vec2(palettePos, 0.5));

                    fragColor = color;
                }
            `;

            // Compile shaders
            const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

            // Link program
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                const info = gl.getProgramInfoLog(program);
                throw new Error('Failed to link shader program: ' + info);
            }

            console.log('[WebGLEngine] Shaders compiled and linked');

            return program;
        }

        compileShader(type, source) {
            const gl = this.gl;
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const info = gl.getShaderInfoLog(shader);
                const typeName = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
                throw new Error(`Failed to compile ${typeName} shader: ${info}`);
            }

            return shader;
        }

        cacheUniformLocations() {
            const gl = this.gl;
            const prog = this.program;

            this.locations = {
                // Attributes
                position: gl.getAttribLocation(prog, 'a_position'),

                // Uniforms
                resolution: gl.getUniformLocation(prog, 'u_resolution'),
                time: gl.getUniformLocation(prog, 'u_time'),
                frequency: gl.getUniformLocation(prog, 'u_frequency'),
                amplitude: gl.getUniformLocation(prog, 'u_amplitude'),
                distortion: gl.getUniformLocation(prog, 'u_distortion'),
                sources: gl.getUniformLocation(prog, 'u_sources'),
                source_phases: gl.getUniformLocation(prog, 'u_source_phases'),
                num_sources: gl.getUniformLocation(prog, 'u_num_sources'),
                num_elements: gl.getUniformLocation(prog, 'u_num_elements'),
                palette: gl.getUniformLocation(prog, 'u_palette'),
                colorCycle: gl.getUniformLocation(prog, 'u_colorCycle'),
                waveRange: gl.getUniformLocation(prog, 'u_waveRange'),
                diffractionStrength: gl.getUniformLocation(prog, 'u_diffractionStrength'),
                elements: []
            };

            // Cache element struct uniform locations
            for (let i = 0; i < 32; i++) {
                this.locations.elements.push({
                    position: gl.getUniformLocation(prog, `u_elements[${i}].position`),
                    angle: gl.getUniformLocation(prog, `u_elements[${i}].angle`),
                    length: gl.getUniformLocation(prog, `u_elements[${i}].length`),
                    thickness: gl.getUniformLocation(prog, `u_elements[${i}].thickness`),
                    type: gl.getUniformLocation(prog, `u_elements[${i}].type`),
                    param1: gl.getUniformLocation(prog, `u_elements[${i}].param1`),
                    param2: gl.getUniformLocation(prog, `u_elements[${i}].param2`),
                    slitCount: gl.getUniformLocation(prog, `u_elements[${i}].slitCount`),
                    curvature: gl.getUniformLocation(prog, `u_elements[${i}].curvature`),
                    reflCoeff: gl.getUniformLocation(prog, `u_elements[${i}].reflCoeff`)
                });
            }

            console.log('[WebGLEngine] Cached', Object.keys(this.locations).length, 'uniform locations');
        }

        setupGeometry() {
            const gl = this.gl;

            // Fullscreen quad: two triangles covering -1..1 in NDC
            const vertices = new Float32Array([
                -1, -1,
                 1, -1,
                -1,  1,
                -1,  1,
                 1, -1,
                 1,  1
            ]);

            const vbo = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

            // Create VAO
            const vao = gl.createVertexArray();
            gl.bindVertexArray(vao);

            gl.enableVertexAttribArray(this.locations.position);
            gl.vertexAttribPointer(this.locations.position, 2, gl.FLOAT, false, 0, 0);

            this.vao = vao;

            console.log('[WebGLEngine] Geometry set up');
        }

        /**
         * Create or update palette texture from color array
         */
        updatePaletteTexture(palette) {
            const gl = this.gl;

            if (!palette || palette.length === 0) {
                console.warn('[WebGLEngine] Empty palette');
                return;
            }

            // Convert palette to RGBA array
            const width = palette.length;
            const data = new Uint8Array(width * 4);

            for (let i = 0; i < width; i++) {
                const color = palette[i];
                data[i * 4 + 0] = color.r;
                data[i * 4 + 1] = color.g;
                data[i * 4 + 2] = color.b;
                data[i * 4 + 3] = 255;
            }

            // Create or update texture
            if (!this.paletteTexture) {
                this.paletteTexture = gl.createTexture();
            }

            gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        /**
         * Main render function
         */
        render(params) {
            const gl = this.gl;

            // Use program
            gl.useProgram(this.program);

            // Upload basic uniforms
            gl.uniform2f(this.locations.resolution, this.canvas.width, this.canvas.height);
            gl.uniform1f(this.locations.time, params.time);
            gl.uniform1f(this.locations.frequency, params.frequency);
            gl.uniform1f(this.locations.amplitude, params.amplitude);
            gl.uniform1f(this.locations.distortion, params.distortion);
            gl.uniform1f(this.locations.colorCycle, params.colorCycle || Config.params.colorCycle);

            // Upload wave range
            const rangeMin = Config.range.waveMin || -params.amplitude * params.sources.length;
            const rangeMax = Config.range.waveMax || params.amplitude * params.sources.length;
            gl.uniform2f(this.locations.waveRange, rangeMin, rangeMax);

            // Upload diffraction strength
            gl.uniform1f(this.locations.diffractionStrength, Config.params.diffractionStrength || 50);

            // Upload wave sources
            const sources = params.sources || [];
            const numSources = Math.min(sources.length, 16);

            const sourcePositions = new Float32Array(numSources * 2);
            const sourcePhases = new Float32Array(numSources);

            for (let i = 0; i < numSources; i++) {
                sourcePositions[i * 2 + 0] = sources[i].x;
                sourcePositions[i * 2 + 1] = sources[i].y;
                sourcePhases[i] = sources[i].phase || 0;
            }

            gl.uniform2fv(this.locations.sources, sourcePositions);
            gl.uniform1fv(this.locations.source_phases, sourcePhases);
            gl.uniform1i(this.locations.num_sources, numSources);

            // Upload optical elements
            const elements = params.elements || [];
            const numElements = Math.min(elements.length, 32);
            gl.uniform1i(this.locations.num_elements, numElements);

            for (let i = 0; i < numElements; i++) {
                const elem = elements[i];
                const locs = this.locations.elements[i];

                gl.uniform2f(locs.position, elem.x, elem.y);
                gl.uniform1f(locs.angle, elem.angle);
                gl.uniform1f(locs.length, elem.length);
                gl.uniform1f(locs.thickness, elem.thickness);

                // Map element type to int
                let typeInt = 0;
                if (elem.type === Matter.ElementType.WALL) typeInt = 0;
                else if (elem.type === Matter.ElementType.APERTURE) typeInt = 1;
                else if (elem.type === Matter.ElementType.LENS) typeInt = 2;
                else if (elem.type === Matter.ElementType.GRATING) typeInt = 3;
                else if (elem.type === Matter.ElementType.MIRROR) typeInt = 4;

                gl.uniform1i(locs.type, typeInt);

                // Type-specific parameters
                if (elem.type === Matter.ElementType.APERTURE) {
                    gl.uniform1f(locs.param1, elem.slitWidth || 20);
                    gl.uniform1f(locs.param2, elem.slitSeparation || 80);
                    gl.uniform1i(locs.slitCount, elem.slitCount || 1);
                } else if (elem.type === Matter.ElementType.LENS) {
                    gl.uniform1f(locs.param1, elem.focalLength || 0);
                    gl.uniform1f(locs.param2, 0);
                    gl.uniform1i(locs.slitCount, 0);
                } else {
                    gl.uniform1f(locs.param1, 0);
                    gl.uniform1f(locs.param2, 0);
                    gl.uniform1i(locs.slitCount, 0);
                }

                // Upload curvature (0 = flat barrier)
                const curvature = (elem.curvature !== undefined && elem.curvature !== null) ? elem.curvature : 0;
                gl.uniform1f(locs.curvature, curvature);

                // Upload reflection coefficient - CRITICAL: Use explicit undefined check to allow 0 values
                const reflCoeff = (elem.reflectionCoefficient !== undefined && elem.reflectionCoefficient !== null)
                    ? elem.reflectionCoefficient
                    : 0.5;
                gl.uniform1f(locs.reflCoeff, reflCoeff);

                // DEBUG: Log what we're uploading for this element
                if (i < 5) {  // Only log first 5 elements to avoid spam
                    console.log(`[WebGLEngine] Element ${i}: type=${typeInt} (${elem.type}), pos=(${elem.x.toFixed(0)},${elem.y.toFixed(0)}), reflCoeff=${reflCoeff.toFixed(3)}, curvature=${curvature.toFixed(3)}`);
                }
            }

            // Upload palette texture
            if (params.palette && params.palette.length > 0) {
                this.updatePaletteTexture(params.palette);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture);
                gl.uniform1i(this.locations.palette, 0);
            }

            // Draw fullscreen quad
            gl.bindVertexArray(this.vao);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            // Draw optical elements overlay (using 2D context)
            this.drawOverlay(params);
        }

        /**
         * Draw optical elements and UI overlays using Canvas 2D on overlay canvas
         */
        drawOverlay(params) {
            const ctx = this.overlayCtx;
            if (!ctx) return;

            // Clear overlay
            ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

            // Draw optical elements
            const elements = params.elements || [];
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                const isSelected = (i === Config.state.editingElementIndex);
                this.drawOpticalElement(ctx, element, false, isSelected);
            }

            // Draw ghost elements (disabled - not needed)
            // if (Config.state.ghostElement && !Config.state.particleMode) {
            //     this.drawOpticalElement(ctx, Config.state.ghostElement, true, false);
            // }

            if (Config.state.ghostSource && Config.state.particleMode) {
                ctx.save();
                ctx.fillStyle = 'rgba(255, 100, 255, 0.6)';
                ctx.strokeStyle = 'rgba(255, 255, 0, 1)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(Config.state.ghostSource.x, Config.state.ghostSource.y, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }

            // Draw mode indicator
            this.drawModeIndicator(ctx);

            // Draw light pucks (from LightPuck module)
            if (window.FP.LightPuck) {
                window.FP.LightPuck.draw(ctx);
            }
        }

        /**
         * Draw an optical element with proper curved rendering
         */
        drawOpticalElement(ctx, element, isGhost, isSelected) {
            ctx.save();
            ctx.translate(element.x, element.y);
            ctx.rotate(element.angle);

            if (isGhost) {
                ctx.strokeStyle = 'rgba(255, 255, 0, 1)';
                ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = isSelected ? 'rgba(0, 255, 255, 1)' : 'rgba(255, 255, 255, 0.7)';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = isSelected ? 3 : 2;
            }

            // Draw based on element type and curvature
            if (element.type === Matter.ElementType.WALL ||
                (element.type === Matter.ElementType.APERTURE && element.slitCount === 0)) {
                // Wall or solid barrier
                if (element.curvature && Math.abs(element.curvature) > 0.1) {
                    this.drawCurvedWall(ctx, element);
                } else {
                    ctx.fillRect(-element.thickness / 2, -element.length / 2, element.thickness, element.length);
                    ctx.strokeRect(-element.thickness / 2, -element.length / 2, element.thickness, element.length);
                }
            } else if (element.type === Matter.ElementType.APERTURE) {
                // Aperture with slits
                if (element.curvature && Math.abs(element.curvature) > 0.1) {
                    this.drawCurvedAperture(ctx, element);
                } else {
                    // Flat aperture - draw clean barrier with gaps
                    this.drawFlatAperture(ctx, element);
                }
            } else {
                // Lens or other - simple rectangle
                ctx.strokeRect(-element.thickness / 2, -element.length / 2, element.thickness, element.length);
            }

            ctx.restore();
        }

        /**
         * Draw curved wall (parabolic shape)
         */
        drawCurvedWall(ctx, element) {
            const halfLength = element.length / 2;
            const halfThickness = element.thickness / 2;
            const curvature = element.curvature;
            const segments = 40;

            ctx.beginPath();

            // Draw front edge (curved)
            for (let i = 0; i <= segments; i++) {
                const t = (i / segments) * 2 - 1;  // -1 to 1
                const y = t * halfLength;
                const x = (y * y) / (4 * curvature);

                if (i === 0) {
                    ctx.moveTo(x - halfThickness, y);
                } else {
                    ctx.lineTo(x - halfThickness, y);
                }
            }

            // Draw back edge (curved)
            for (let i = segments; i >= 0; i--) {
                const t = (i / segments) * 2 - 1;
                const y = t * halfLength;
                const x = (y * y) / (4 * curvature);
                ctx.lineTo(x + halfThickness, y);
            }

            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        /**
         * Draw flat aperture as clean solid barrier with transparent slit gaps
         */
        drawFlatAperture(ctx, element) {
            const halfLength = element.length / 2;
            const halfThickness = element.thickness / 2;
            const slitWidth = element.slitWidth || 20;
            const slitCount = element.slitCount;

            // Calculate slit positions (middle-out)
            const slitPositions = [];
            if (slitCount === 1) {
                slitPositions.push(0);
            } else if (slitCount % 2 === 1) {
                // Odd: center slit + pairs
                slitPositions.push(0);
                for (let i = 1; i <= Math.floor(slitCount / 2); i++) {
                    slitPositions.push(i * slitWidth * 2);
                    slitPositions.push(-i * slitWidth * 2);
                }
            } else {
                // Even: symmetric pairs
                for (let i = 0; i < slitCount / 2; i++) {
                    const offset = (i + 0.5) * slitWidth * 2;
                    slitPositions.push(offset);
                    slitPositions.push(-offset);
                }
            }

            // Draw the full barrier first
            ctx.fillRect(-halfThickness, -halfLength, element.thickness, element.length);

            // Cut out the slits by drawing them in destination-out mode
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 1)';

            for (const center of slitPositions) {
                ctx.fillRect(-halfThickness - 1, center - slitWidth / 2, element.thickness + 2, slitWidth);
            }

            ctx.restore();

            // Draw outline
            ctx.strokeRect(-halfThickness, -halfLength, element.thickness, element.length);

            // Draw thin lines to show slit edges
            ctx.save();
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 1;
            for (const center of slitPositions) {
                // Top edge of slit
                ctx.beginPath();
                ctx.moveTo(-halfThickness, center - slitWidth / 2);
                ctx.lineTo(halfThickness, center - slitWidth / 2);
                ctx.stroke();
                // Bottom edge of slit
                ctx.beginPath();
                ctx.moveTo(-halfThickness, center + slitWidth / 2);
                ctx.lineTo(halfThickness, center + slitWidth / 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        /**
         * Draw curved aperture with tangent-oriented particles
         */
        drawCurvedAperture(ctx, element) {
            const halfThickness = element.thickness / 2;
            const curvature = element.curvature;
            const particleSize = element.particleSize || 8;
            const particles = element.getParticlePositions();

            for (const particle of particles) {
                ctx.save();

                // Calculate curve position for this Y coordinate
                const y = particle.localY;
                const xCurve = (y * y) / (4 * curvature);

                // Calculate tangent angle
                const dxdy = y / (2 * curvature);
                const tangentAngle = Math.atan(dxdy);

                // Position on curve
                ctx.translate(particle.localX + xCurve, particle.localY);
                ctx.rotate(tangentAngle);

                // Draw brick
                ctx.fillRect(-halfThickness, -particleSize/2, element.thickness, particleSize);
                ctx.strokeRect(-halfThickness, -particleSize/2, element.thickness, particleSize);

                ctx.restore();
            }
        }

        /**
         * Draw mode indicator
         */
        drawModeIndicator(ctx) {
            ctx.save();

            const modeText = Config.state.particleMode ? 'PARTICLE MODE' : 'WAVE MODE';
            const freqText = `Freq: ${Config.params.frequency.toFixed(2)}`;
            const elementCount = (Optics.getAllElements() || []).length;
            const elementsText = `Elements: ${elementCount}`;
            const computeText = `Compute: WebGL`;

            // Draw dark background box
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(5, this.overlayCanvas.height - 95, 260, 90);

            // Draw border
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
            ctx.lineWidth = 2;
            ctx.strokeRect(5, this.overlayCanvas.height - 95, 260, 90);

            // Draw text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px monospace';
            ctx.fillText(modeText, 10, this.overlayCanvas.height - 75);
            ctx.fillText(freqText, 10, this.overlayCanvas.height - 55);
            ctx.fillText(elementsText, 10, this.overlayCanvas.height - 35);

            ctx.fillStyle = '#0ff';
            ctx.font = 'bold 16px monospace';
            ctx.fillText(computeText, 10, this.overlayCanvas.height - 15);

            ctx.restore();
        }

        cleanup() {
            const gl = this.gl;
            if (!gl) return;

            console.log('[WebGLEngine] Cleanup');

            if (this.program) {
                gl.deleteProgram(this.program);
            }
            if (this.vao) {
                gl.deleteVertexArray(this.vao);
            }
            if (this.paletteTexture) {
                gl.deleteTexture(this.paletteTexture);
            }
        }
    }

    return WebGLEngine;
})();
