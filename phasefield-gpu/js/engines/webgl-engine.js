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
                    float param2;  // slitSeparation for aperture, slitCount
                    float reflCoeff;
                };
                uniform Element u_elements[MAX_ELEMENTS];
                uniform int u_num_elements;

                // Palette texture
                uniform sampler2D u_palette;
                uniform float u_colorCycle;

                // Wave value range for normalization
                uniform vec2 u_waveRange;  // (min, max)

                /**
                 * Check if ray from p1 to p2 intersects element
                 * Returns: 0.0 = blocked, 1.0 = unblocked, 0.0-1.0 = partial (lens)
                 */
                float checkRayIntersection(vec2 p1, vec2 p2, Element elem) {
                    // Transform ray to element's local space
                    float cos_a = cos(-elem.angle);
                    float sin_a = sin(-elem.angle);

                    vec2 d1 = p1 - elem.position;
                    vec2 d2 = p2 - elem.position;

                    vec2 local1 = vec2(
                        d1.x * cos_a - d1.y * sin_a,
                        d1.x * sin_a + d1.y * cos_a
                    );

                    vec2 local2 = vec2(
                        d2.x * cos_a - d2.y * sin_a,
                        d2.x * sin_a + d2.y * cos_a
                    );

                    // Check if ray crosses element plane (X = 0 in local space)
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
                    float intersectY = local1.y + t * (local2.y - local1.y);

                    // Check if within element length bounds
                    if (abs(intersectY) > elem.length * 0.5) {
                        return 1.0;  // Outside element bounds
                    }

                    // Element type specific logic
                    if (elem.type == 0) {
                        // Wall - completely blocks
                        if (abs(intersectY) <= elem.length * 0.5) {
                            return 0.0;  // Blocked
                        }
                    }
                    else if (elem.type == 1) {
                        // Aperture - check if passes through slit(s)
                        float slitWidth = elem.param1;
                        float slitSeparation = elem.param2;
                        int slitCount = int(slitSeparation / (slitWidth * 2.0) + 0.5);
                        if (slitCount < 1) slitCount = 1;

                        // Check single slit centered at Y=0
                        if (slitCount == 1) {
                            if (abs(intersectY) <= slitWidth * 0.5) {
                                return 1.0;  // Passes through slit
                            }
                            return 0.0;  // Blocked by material
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

                        return inSlit ? 1.0 : 0.0;
                    }
                    else if (elem.type == 2) {
                        // Lens - refracts but doesn't block
                        // For now, just attenuate slightly
                        return 1.0 - elem.reflCoeff;  // Transmission coefficient
                    }

                    return 1.0;  // Default: unblocked
                }

                /**
                 * Calculate wave field at current pixel
                 */
                float calculateWaveField(vec2 pos) {
                    float sum = 0.0;

                    for (int i = 0; i < MAX_SOURCES; i++) {
                        if (i >= u_num_sources) break;

                        vec2 source = u_sources[i];
                        vec2 delta = pos - source;
                        float distance = length(delta);

                        // Calculate phase
                        float basePhase = distance * u_frequency * 0.05 - u_time + u_source_phases[i];

                        // Check optical path - does ray reach target?
                        float amplitude = 1.0;
                        for (int j = 0; j < MAX_ELEMENTS; j++) {
                            if (j >= u_num_elements) break;

                            float pathFactor = checkRayIntersection(source, pos, u_elements[j]);
                            amplitude *= pathFactor;

                            // Early exit if completely blocked
                            if (amplitude < 0.01) {
                                amplitude = 0.0;
                                break;
                            }
                        }

                        if (amplitude > 0.0) {
                            // Calculate wave
                            float wave = sin(basePhase) * u_amplitude * amplitude;

                            // Apply distance falloff
                            float falloff = pow(distance * 0.01 + 1.0, u_distortion);
                            sum += wave / falloff;
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
                } else if (elem.type === Matter.ElementType.LENS) {
                    gl.uniform1f(locs.param1, elem.focalLength || 0);
                    gl.uniform1f(locs.param2, 0);
                } else {
                    gl.uniform1f(locs.param1, 0);
                    gl.uniform1f(locs.param2, 0);
                }

                gl.uniform1f(locs.reflCoeff, elem.reflectionCoefficient || 0.5);
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

            // Draw ghost elements
            if (Config.state.ghostElement && !Config.state.particleMode) {
                this.drawOpticalElement(ctx, Config.state.ghostElement, true, false);
            }

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
        }

        /**
         * Draw an optical element (simplified for overlay)
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

            // Simple rectangle representation
            ctx.strokeRect(-element.thickness / 2, -element.length / 2, element.thickness, element.length);

            ctx.restore();
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
