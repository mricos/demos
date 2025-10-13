# Phase Field GPU Optimization Guide

## Executive Summary

This document describes how to add GPU acceleration to the Phase Field wave simulation while maintaining the existing CPU implementation as a fallback. The optimization targets the most expensive operation: wave field calculation, which currently runs at O(sources × samples × elements) per frame.

**Expected Performance Gains:**
- WebGL: 10-50x speedup (widely supported)
- WebGPU: 50-100x speedup (Chrome 113+, Safari 18+)
- Resolution: From 1024×1024 to 4096×4096+ possible
- Frame rate: From ~30fps to 60fps at higher resolutions

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Mental Model Shift](#mental-model-shift)
3. [Implementation Strategy](#implementation-strategy)
4. [WebGL Implementation](#webgl-implementation)
5. [WebGPU Implementation](#webgpu-implementation)
6. [Integration Guide](#integration-guide)
7. [Performance Considerations](#performance-considerations)
8. [Browser Compatibility](#browser-compatibility)

---

## Architecture Overview

### Current Architecture

```
┌─────────────┐
│   Main.js   │
│  (animate)  │
└──────┬──────┘
       │
       ├──> Field.js
       │    └──> calculateWaveValue() [CPU, Sequential]
       │         ├──> Loop over sources
       │         └──> Optics.calculateOpticalPath()
       │              └──> Loop over elements
       │
       └──> Renderer.js
            └──> Canvas 2D API
```

**Bottleneck:** `Field.calculateBlockValue()` at line 150-194
- Nested loops: sources × samples × elements
- Ray tracing for each sample point
- Runs sequentially on single CPU core

### Proposed Dual-Mode Architecture

```
┌─────────────┐
│   Main.js   │
└──────┬──────┘
       │
       ├──> ComputeEngine.js (Mode Selector)
       │    │
       │    ├──> CPUEngine (field.js - current code)
       │    │    └──> Sequential loops
       │    │
       │    ├──> WebGLEngine (NEW)
       │    │    ├──> Fragment shader
       │    │    └──> Render to texture
       │    │
       │    └──> WebGPUEngine (NEW)
       │         ├──> Compute shader
       │         └──> GPU buffer operations
       │
       └──> Renderer.js
            ├──> Canvas 2D (CPU mode)
            └──> WebGL/GPU texture (GPU modes)
```

### Key Design Principles

1. **Backwards Compatible:** CPU mode always works
2. **Progressive Enhancement:** GPU modes auto-detected
3. **Minimal Refactoring:** Wrap existing code, don't rewrite
4. **Shared Physics:** Optics.js geometry used by all modes
5. **Graceful Degradation:** Fall back to CPU on errors

---

## Mental Model Shift

### CPU: Sequential Thinking

```javascript
// Traditional loop: "Do this for each pixel"
for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        let sum = 0;

        // For each wave source
        for (const source of sources) {
            const distance = Math.sqrt((x - source.x)**2 + (y - source.y)**2);
            const phase = distance * frequency - time;

            // Check if blocked by elements
            const optical = checkOpticalPath(source, {x, y});
            if (!optical.blocked) {
                sum += Math.sin(phase) * amplitude;
            }
        }

        imageData[index] = colorFromWave(sum);
    }
}
```

**Mental Model:**
- "Step through each pixel"
- "For this pixel, calculate wave"
- "Write result to array"

### GPU: Parallel Thinking

```glsl
// Fragment shader: "Here's the formula for ANY pixel"
uniform vec2 sources[MAX_SOURCES];
uniform int numSources;
uniform float time;
uniform float frequency;

void main() {
    // THIS RUNS FOR ALL PIXELS AT THE SAME TIME
    vec2 pos = gl_FragCoord.xy;
    float sum = 0.0;

    for (int i = 0; i < numSources; i++) {
        float dist = distance(pos, sources[i]);
        float phase = dist * frequency - time;

        // Optical path check (implemented in shader)
        if (!isBlocked(sources[i], pos)) {
            sum += sin(phase);
        }
    }

    gl_FragColor = paletteColor(sum);
}
```

**Mental Model:**
- "Define the function for a pixel"
- "GPU executes it for all pixels in parallel"
- "Result appears as texture"

### Data Flow Comparison

```
CPU Mode:
┌────────┐    ┌────────────┐    ┌─────────┐
│ Sources│ -> │ Calculate  │ -> │ImageData│
│Elements│    │ (JS loops) │    │ buffer  │
└────────┘    └────────────┘    └─────────┘
     │              │                 │
     └──> Sequential processing ──────┘

GPU Mode:
┌────────┐    ┌──────────┐    ┌────────┐
│ Sources│ -> │ Uniforms │ -> │ Shader │
│Elements│    │ (Upload) │    │(Parallel)│
└────────┘    └──────────┘    └────────┘
                                    │
                                    v
                              ┌─────────┐
                              │ Texture │
                              │(Canvas) │
                              └─────────┘
    │
    └──> Parallel: ALL pixels computed simultaneously
```

---

## Implementation Strategy

### Phase 1: Infrastructure (Minimal Risk)

**Goal:** Add mode-switching without breaking existing code

1. Create `js/compute-engine.js` - capability detection + mode selector
2. Add UI controls for mode switching
3. Wrap existing code in `CPUEngine` class
4. Add empty stubs for `WebGLEngine` and `WebGPUEngine`

**Result:** Mode switching works, GPU modes just call CPU for now

### Phase 2: WebGL Basics (Proof of Concept)

**Goal:** Get simple wave field rendering on GPU

1. Implement WebGL context initialization
2. Write basic fragment shader (just wave sources, no elements)
3. Upload wave sources as uniforms
4. Render to canvas
5. Compare results with CPU mode

**Result:** Wave interference patterns work on GPU (10x+ faster)

### Phase 3: Optical Elements (Feature Parity)

**Goal:** Add walls, apertures, lenses to GPU

1. Pass optical elements as uniform arrays
2. Implement ray-element intersection in GLSL
3. Add blocking logic to shader
4. Test against CPU mode for correctness

**Result:** Full feature parity with CPU mode

### Phase 4: Optimization (Performance)

**Goal:** Maximize GPU efficiency

1. Use textures instead of uniforms for large datasets
2. Implement spatial partitioning in shader
3. Add level-of-detail (LOD) based on zoom
4. Profile and optimize hotspots

**Result:** 50-100x speedup at 4K resolution

### Phase 5: WebGPU (Future-Proofing)

**Goal:** Add next-gen GPU API support

1. Implement WebGPU compute shader path
2. Use storage buffers for unlimited elements
3. Multi-pass rendering for complex scenes

**Result:** Best possible performance on modern browsers

---

## WebGL Implementation

### File Structure

```
js/
├── compute-engine.js       (NEW - mode selector)
├── engines/
│   ├── cpu-engine.js      (NEW - wraps existing field.js)
│   ├── webgl-engine.js    (NEW - GPU implementation)
│   └── webgpu-engine.js   (NEW - future)
├── shaders/
│   ├── wave-field.vert    (NEW - vertex shader)
│   └── wave-field.frag    (NEW - fragment shader)
└── [existing files unchanged]
```

### Step 1: Compute Engine (js/compute-engine.js)

```javascript
/**
 * Compute Engine - Mode selector for CPU/GPU rendering
 */
window.FP = window.FP || {};

window.FP.ComputeEngine = (function() {
    'use strict';

    const MODES = {
        CPU: 'cpu',
        WEBGL: 'webgl',
        WEBGPU: 'webgpu'
    };

    let currentMode = MODES.CPU;
    let currentEngine = null;

    /**
     * Detect GPU capabilities
     */
    function detectCapabilities() {
        const canvas = document.createElement('canvas');

        const caps = {
            cpu: true,
            webgl: !!canvas.getContext('webgl2'),
            webgpu: !!navigator.gpu
        };

        console.log('[ComputeEngine] Detected capabilities:', caps);
        return caps;
    }

    /**
     * Set compute mode
     */
    function setMode(mode, canvas) {
        const capabilities = detectCapabilities();

        // Validate mode is supported
        if (mode === MODES.WEBGL && !capabilities.webgl) {
            console.warn('[ComputeEngine] WebGL not supported, falling back to CPU');
            mode = MODES.CPU;
        }
        if (mode === MODES.WEBGPU && !capabilities.webgpu) {
            console.warn('[ComputeEngine] WebGPU not supported, falling back to CPU');
            mode = MODES.CPU;
        }

        // Cleanup old engine
        if (currentEngine && currentEngine.cleanup) {
            currentEngine.cleanup();
        }

        // Initialize new engine
        currentMode = mode;

        try {
            switch (mode) {
                case MODES.WEBGL:
                    currentEngine = new window.FP.WebGLEngine();
                    currentEngine.initialize(canvas);
                    break;

                case MODES.WEBGPU:
                    currentEngine = new window.FP.WebGPUEngine();
                    currentEngine.initialize(canvas);
                    break;

                default:
                    currentEngine = new window.FP.CPUEngine();
                    currentEngine.initialize(canvas);
            }

            console.log(`[ComputeEngine] Switched to ${mode} mode`);
            return true;

        } catch (error) {
            console.error(`[ComputeEngine] Failed to initialize ${mode} mode:`, error);

            // Fall back to CPU
            if (mode !== MODES.CPU) {
                console.log('[ComputeEngine] Falling back to CPU mode');
                return setMode(MODES.CPU, canvas);
            }

            return false;
        }
    }

    /**
     * Get current engine
     */
    function getEngine() {
        return currentEngine;
    }

    /**
     * Get current mode
     */
    function getMode() {
        return currentMode;
    }

    return {
        MODES,
        detectCapabilities,
        setMode,
        getEngine,
        getMode
    };
})();
```

### Step 2: CPU Engine Wrapper (js/engines/cpu-engine.js)

```javascript
/**
 * CPU Engine - Wraps existing field.js implementation
 */
window.FP = window.FP || {};

window.FP.CPUEngine = (function() {
    'use strict';

    const Field = window.FP.Field;
    const Config = window.FP.Config;
    const Palette = window.FP.Palette;

    class CPUEngine {
        constructor() {
            this.type = 'cpu';
            this.canvas = null;
            this.ctx = null;
        }

        initialize(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            console.log('[CPUEngine] Initialized with canvas', canvas.width, 'x', canvas.height);
        }

        /**
         * Compute field and render
         * Uses existing Field.js + Renderer.js code
         */
        render(params) {
            // Delegate to existing renderer
            // This is your current renderAtResolution() code
            const imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);

            // Call existing rendering code
            // (Keep your current implementation from renderer.js)
            this.renderAtResolution(imageData, params.resolution, params.mode, 1, params.palette);

            this.ctx.putImageData(imageData, 0, 0);
        }

        renderAtResolution(imageData, resolutionValue, mode, opacity, palette) {
            // Copy your existing renderAtResolution code from renderer.js:29-112
            // This stays EXACTLY as-is
        }

        cleanup() {
            // Nothing to clean up for CPU mode
        }
    }

    return CPUEngine;
})();
```

### Step 3: WebGL Engine (js/engines/webgl-engine.js)

```javascript
/**
 * WebGL Engine - GPU-accelerated wave field computation
 */
window.FP = window.FP || {};

window.FP.WebGLEngine = (function() {
    'use strict';

    const Optics = window.FP.Optics;

    class WebGLEngine {
        constructor() {
            this.type = 'webgl';
            this.canvas = null;
            this.gl = null;
            this.program = null;
            this.locations = {};

            // Framebuffer for off-screen rendering if needed
            this.fbo = null;
            this.texture = null;
        }

        initialize(canvas) {
            this.canvas = canvas;

            // Get WebGL2 context
            const gl = canvas.getContext('webgl2', {
                alpha: false,
                depth: false,
                antialias: false,
                preserveDrawingBuffer: true
            });

            if (!gl) {
                throw new Error('WebGL2 not supported');
            }

            this.gl = gl;

            // Compile shaders
            this.program = this.createShaderProgram();

            // Get uniform locations
            this.cacheUniformLocations();

            // Set up geometry (fullscreen quad)
            this.setupGeometry();

            console.log('[WebGLEngine] Initialized with WebGL2');
        }

        createShaderProgram() {
            const gl = this.gl;

            // Vertex shader: simple fullscreen quad
            const vertexShaderSource = `#version 300 es
                precision highp float;

                in vec2 a_position;
                out vec2 v_uv;

                void main() {
                    v_uv = a_position * 0.5 + 0.5;  // Convert -1..1 to 0..1
                    gl_Position = vec4(a_position, 0.0, 1.0);
                }
            `;

            // Fragment shader: wave field computation
            const fragmentShaderSource = `#version 300 es
                precision highp float;

                in vec2 v_uv;
                out vec4 fragColor;

                // Canvas dimensions
                uniform vec2 u_resolution;

                // Wave parameters
                uniform float u_time;
                uniform float u_frequency;
                uniform float u_amplitude;
                uniform float u_distortion;

                // Wave sources (max 16 for now)
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
                    int type;  // 0=wall, 1=aperture, 2=lens
                    float reflCoeff;
                };
                uniform Element u_elements[MAX_ELEMENTS];
                uniform int u_num_elements;

                // Palette (pass as texture for more colors)
                uniform sampler2D u_palette;

                /**
                 * Check if ray from p1 to p2 is blocked by element
                 */
                bool isBlockedByElement(vec2 p1, vec2 p2, Element elem) {
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
                        return false;
                    }

                    // Calculate intersection Y coordinate
                    float t = -local1.x / (local2.x - local1.x);
                    if (t < 0.0 || t > 1.0) {
                        return false;
                    }

                    float intersectY = local1.y + t * (local2.y - local1.y);

                    // Check if within element bounds
                    if (abs(intersectY) <= elem.length * 0.5) {
                        // For apertures (type 1), check if in slit
                        // For now, treat as solid wall
                        return true;
                    }

                    return false;
                }

                /**
                 * Check if ray is blocked by any element
                 */
                float calculateOpticalPath(vec2 source, vec2 target) {
                    for (int i = 0; i < MAX_ELEMENTS; i++) {
                        if (i >= u_num_elements) break;

                        if (isBlockedByElement(source, target, u_elements[i])) {
                            // Apply reflection coefficient
                            return u_elements[i].reflCoeff;
                        }
                    }
                    return 1.0;  // Unblocked
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

                        // Check optical path
                        float amplitude = calculateOpticalPath(source, pos);

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
                    // Convert UV to pixel coordinates
                    vec2 pixelPos = v_uv * u_resolution;

                    // Calculate wave field
                    float waveValue = calculateWaveField(pixelPos);

                    // Normalize to 0..1 (simple version, can improve)
                    float normalized = (waveValue + u_amplitude * float(u_num_sources))
                                     / (u_amplitude * float(u_num_sources) * 2.0);
                    normalized = clamp(normalized, 0.0, 1.0);

                    // Sample palette
                    vec4 color = texture(u_palette, vec2(normalized, 0.5));

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
                elements: [],  // Array of structs
                num_elements: gl.getUniformLocation(prog, 'u_num_elements'),
                palette: gl.getUniformLocation(prog, 'u_palette')
            };

            // Cache element uniform locations
            for (let i = 0; i < 32; i++) {
                this.locations.elements.push({
                    position: gl.getUniformLocation(prog, `u_elements[${i}].position`),
                    angle: gl.getUniformLocation(prog, `u_elements[${i}].angle`),
                    length: gl.getUniformLocation(prog, `u_elements[${i}].length`),
                    thickness: gl.getUniformLocation(prog, `u_elements[${i}].thickness`),
                    type: gl.getUniformLocation(prog, `u_elements[${i}].type`),
                    reflCoeff: gl.getUniformLocation(prog, `u_elements[${i}].reflCoeff`)
                });
            }
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
        }

        /**
         * Create palette texture from color array
         */
        createPaletteTexture(palette) {
            const gl = this.gl;

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

            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            return texture;
        }

        /**
         * Main render function
         */
        render(params) {
            const gl = this.gl;

            // Use program
            gl.useProgram(this.program);

            // Upload uniforms
            gl.uniform2f(this.locations.resolution, this.canvas.width, this.canvas.height);
            gl.uniform1f(this.locations.time, params.time);
            gl.uniform1f(this.locations.frequency, params.frequency);
            gl.uniform1f(this.locations.amplitude, params.amplitude);
            gl.uniform1f(this.locations.distortion, params.distortion);

            // Upload wave sources
            const sources = params.sources || [];
            const sourcePositions = new Float32Array(sources.length * 2);
            const sourcePhases = new Float32Array(sources.length);

            for (let i = 0; i < sources.length; i++) {
                sourcePositions[i * 2 + 0] = sources[i].x;
                sourcePositions[i * 2 + 1] = sources[i].y;
                sourcePhases[i] = sources[i].phase || 0;
            }

            gl.uniform2fv(this.locations.sources, sourcePositions);
            gl.uniform1fv(this.locations.source_phases, sourcePhases);
            gl.uniform1i(this.locations.num_sources, sources.length);

            // Upload optical elements
            const elements = params.elements || [];
            gl.uniform1i(this.locations.num_elements, Math.min(elements.length, 32));

            for (let i = 0; i < Math.min(elements.length, 32); i++) {
                const elem = elements[i];
                const locs = this.locations.elements[i];

                gl.uniform2f(locs.position, elem.x, elem.y);
                gl.uniform1f(locs.angle, elem.angle);
                gl.uniform1f(locs.length, elem.length);
                gl.uniform1f(locs.thickness, elem.thickness);

                // Map element type to int
                let typeInt = 0;
                if (elem.type === 'aperture') typeInt = 1;
                else if (elem.type === 'lens') typeInt = 2;

                gl.uniform1i(locs.type, typeInt);
                gl.uniform1f(locs.reflCoeff, elem.reflectionCoefficient || 0.5);
            }

            // Upload palette
            if (params.palette && params.palette.length > 0) {
                const paletteTexture = this.createPaletteTexture(params.palette);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
                gl.uniform1i(this.locations.palette, 0);
            }

            // Bind VAO and draw
            gl.bindVertexArray(this.vao);
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        cleanup() {
            if (this.gl) {
                // Clean up WebGL resources
                if (this.program) {
                    this.gl.deleteProgram(this.program);
                }
                // ... delete other resources
            }
        }
    }

    return WebGLEngine;
})();
```

### Step 4: Integration into Main.js

```javascript
// In main.js, modify the animate() function

function init() {
    // ... existing init code ...

    // Initialize compute engine
    const capabilities = window.FP.ComputeEngine.detectCapabilities();
    console.log('GPU capabilities:', capabilities);

    // Start with CPU mode (user can switch via UI)
    window.FP.ComputeEngine.setMode(window.FP.ComputeEngine.MODES.CPU, canvas);

    // ... rest of init ...
}

function animate() {
    const frameStartTime = performance.now();

    // Poll gamepad
    Gamepad.poll();

    // Get current compute engine
    const engine = window.FP.ComputeEngine.getEngine();

    if (engine) {
        // Prepare render parameters
        const params = {
            time: Config.performance.time,
            frequency: Config.params.frequency,
            amplitude: Config.params.amplitude,
            distortion: Config.params.distortion,
            sources: Field.getWaveSources(),
            elements: Optics.getAllElements(),
            palette: Config.state.currentPalette,
            resolution: Config.params.resolution,
            mode: Config.params.pixelatorMode
        };

        // Render using current engine (CPU or GPU)
        engine.render(params);
    } else {
        // Fallback: use old rendering code
        Renderer.render();
    }

    // Update time
    Config.performance.time += Config.params.speed;
    Config.performance.frameCount++;

    // Update performance metrics
    const frameTime = performance.now() - frameStartTime;
    Renderer.updatePerformanceMetrics(frameTime);

    requestAnimationFrame(animate);
}
```

### Step 5: UI Controls (Add to index.html)

```html
<!-- Add after the Pixelator section -->
<h2 id="header-performance">Performance</h2>
<div class="collapsible-content" id="section-performance">
    <div class="control-group">
        <label>Compute Mode</label>
        <div class="radio-group">
            <label class="radio-option">
                <input type="radio" name="compute-mode" value="cpu" checked>
                <span>CPU (Compatible)</span>
            </label>
            <label class="radio-option" id="webgl-option">
                <input type="radio" name="compute-mode" value="webgl">
                <span>WebGL (Fast)</span>
            </label>
            <label class="radio-option" id="webgpu-option" style="display: none;">
                <input type="radio" name="compute-mode" value="webgpu">
                <span>WebGPU (Fastest)</span>
            </label>
        </div>
        <div class="help-text" id="compute-mode-info">
            CPU: Slower but compatible | WebGL: 10-50x faster
        </div>
    </div>

    <div class="control-group">
        <label>Current Mode: <span class="value-display" id="current-mode">CPU</span></label>
        <label>Performance: <span class="value-display" id="perf-info">-</span></label>
    </div>
</div>
```

### Step 6: UI Event Handlers (Add to ui.js)

```javascript
// In ui.js setupEventListeners()

function setupComputeModeControls() {
    const capabilities = window.FP.ComputeEngine.detectCapabilities();

    // Show/hide options based on capabilities
    if (capabilities.webgl) {
        document.getElementById('webgl-option').style.display = 'block';
    }
    if (capabilities.webgpu) {
        document.getElementById('webgpu-option').style.display = 'block';
    }

    // Handle mode changes
    document.querySelectorAll('input[name="compute-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const mode = e.target.value;
            const canvas = document.getElementById('canvas');

            const success = window.FP.ComputeEngine.setMode(mode, canvas);

            if (success) {
                document.getElementById('current-mode').textContent = mode.toUpperCase();
                updatePerformanceInfo();
            } else {
                // Revert radio selection
                document.querySelector('input[name="compute-mode"][value="cpu"]').checked = true;
            }
        });
    });
}

function updatePerformanceInfo() {
    const mode = window.FP.ComputeEngine.getMode();
    const fps = Config.performance.fps;

    let info = '';
    if (mode === 'cpu') {
        info = `${fps} FPS (single-threaded)`;
    } else if (mode === 'webgl') {
        info = `${fps} FPS (GPU accelerated)`;
    } else if (mode === 'webgpu') {
        info = `${fps} FPS (compute shaders)`;
    }

    document.getElementById('perf-info').textContent = info;
}

// Call in setupEventListeners()
setupComputeModeControls();
setInterval(updatePerformanceInfo, 1000);
```

---

## WebGPU Implementation

WebGPU is the next-generation API with better compute shader support. Here's a basic implementation:

```javascript
/**
 * WebGPU Engine - Next-gen compute shader approach
 */
window.FP.WebGPUEngine = (function() {
    'use strict';

    class WebGPUEngine {
        constructor() {
            this.type = 'webgpu';
            this.device = null;
            this.context = null;
            this.pipeline = null;
        }

        async initialize(canvas) {
            if (!navigator.gpu) {
                throw new Error('WebGPU not supported');
            }

            // Request adapter and device
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                throw new Error('Failed to get GPU adapter');
            }

            this.device = await adapter.requestDevice();

            // Configure canvas context
            this.context = canvas.getContext('webgpu');
            const format = navigator.gpu.getPreferredCanvasFormat();

            this.context.configure({
                device: this.device,
                format: format,
                alphaMode: 'opaque'
            });

            // Create compute pipeline
            await this.createComputePipeline();

            console.log('[WebGPUEngine] Initialized');
        }

        async createComputePipeline() {
            // WebGPU compute shader (WGSL language)
            const computeShader = `
                struct WaveSource {
                    position: vec2<f32>,
                    phase: f32,
                    padding: f32
                }

                struct Element {
                    position: vec2<f32>,
                    angle: f32,
                    length: f32,
                    thickness: f32,
                    element_type: u32,
                    reflCoeff: f32,
                    padding: f32
                }

                struct Params {
                    resolution: vec2<f32>,
                    time: f32,
                    frequency: f32,
                    amplitude: f32,
                    distortion: f32,
                    num_sources: u32,
                    num_elements: u32
                }

                @group(0) @binding(0) var<uniform> params: Params;
                @group(0) @binding(1) var<storage, read> sources: array<WaveSource>;
                @group(0) @binding(2) var<storage, read> elements: array<Element>;
                @group(0) @binding(3) var<storage, read_write> output: array<f32>;

                @compute @workgroup_size(8, 8)
                fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                    let pos = vec2<f32>(f32(global_id.x), f32(global_id.y));

                    if (global_id.x >= u32(params.resolution.x) ||
                        global_id.y >= u32(params.resolution.y)) {
                        return;
                    }

                    var sum: f32 = 0.0;

                    // Calculate wave field
                    for (var i: u32 = 0u; i < params.num_sources; i = i + 1u) {
                        let source = sources[i];
                        let delta = pos - source.position;
                        let distance = length(delta);

                        let phase = distance * params.frequency * 0.05 - params.time + source.phase;

                        // Check optical path (simplified)
                        var amplitude: f32 = 1.0;
                        // TODO: Implement element blocking

                        if (amplitude > 0.0) {
                            let wave = sin(phase) * params.amplitude * amplitude;
                            let falloff = pow(distance * 0.01 + 1.0, params.distortion);
                            sum = sum + wave / falloff;
                        }
                    }

                    // Write result
                    let index = global_id.y * u32(params.resolution.x) + global_id.x;
                    output[index] = sum;
                }
            `;

            // Create shader module
            const shaderModule = this.device.createShaderModule({
                code: computeShader
            });

            // Create bind group layout
            this.bindGroupLayout = this.device.createBindGroupLayout({
                entries: [
                    { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
                    { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
                    { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
                    { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
                ]
            });

            // Create pipeline
            this.pipeline = this.device.createComputePipeline({
                layout: this.device.createPipelineLayout({
                    bindGroupLayouts: [this.bindGroupLayout]
                }),
                compute: {
                    module: shaderModule,
                    entryPoint: 'main'
                }
            });
        }

        render(params) {
            // Create buffers for sources, elements, output
            // Run compute shader
            // Copy result to canvas

            // This is more involved - see WebGPU documentation
            console.log('[WebGPUEngine] Render not yet implemented');
        }

        cleanup() {
            if (this.device) {
                this.device.destroy();
            }
        }
    }

    return WebGPUEngine;
})();
```

---

## Integration Guide

### Minimal Changes Checklist

1. **Add new files:**
   - `js/compute-engine.js`
   - `js/engines/cpu-engine.js`
   - `js/engines/webgl-engine.js`
   - `js/engines/webgpu-engine.js` (optional)

2. **Update index.html:**
   - Add script tags for new files
   - Add performance section with mode selector

3. **Update main.js:**
   - Initialize ComputeEngine
   - Modify animate() to use engine.render()

4. **Update ui.js:**
   - Add mode switching event handlers
   - Update performance display

5. **Keep unchanged:**
   - field.js (used by CPUEngine)
   - optics.js (used by all engines)
   - matter.js (used by all engines)
   - palette.js (used by all engines)
   - renderer.js (used by CPUEngine)

### Testing Strategy

1. **Phase 1:** Verify CPU mode still works
2. **Phase 2:** Test WebGL with simple wave (no elements)
3. **Phase 3:** Add elements one at a time, compare with CPU
4. **Phase 4:** Performance benchmarks
5. **Phase 5:** Cross-browser testing

---

## Performance Considerations

### Expected Speedups (Relative to CPU)

| Resolution | CPU      | WebGL   | WebGPU  |
|-----------|----------|---------|---------|
| 256×256   | 30 FPS   | 60 FPS  | 60 FPS  |
| 512×512   | 10 FPS   | 60 FPS  | 60 FPS  |
| 1024×1024 | 2 FPS    | 45 FPS  | 60 FPS  |
| 2048×2048 | <1 FPS   | 15 FPS  | 60 FPS  |
| 4096×4096 | N/A      | 5 FPS   | 30 FPS  |

### Memory Usage

- **CPU:** 4 bytes per pixel (ImageData)
- **WebGL:** 4 bytes per pixel (texture) + shader memory
- **WebGPU:** 4-8 bytes per pixel (double buffering)

### Optimization Tips

1. **Reduce uniform uploads:** Only update changed data
2. **Use textures for large datasets:** Elements as texture atlas
3. **Implement spatial partitioning:** Grid-based culling in shader
4. **Level of detail:** Lower sample rate for distant regions
5. **Async compute:** Use multiple command buffers (WebGPU)

---

## Browser Compatibility

### WebGL2 Support

- ✅ Chrome 56+ (2017)
- ✅ Firefox 51+ (2017)
- ✅ Safari 15+ (2021)
- ✅ Edge 79+ (2020)

**Coverage:** ~97% of browsers

### WebGPU Support

- ✅ Chrome 113+ (2023)
- ✅ Edge 113+ (2023)
- 🔄 Firefox 131+ (2024, behind flag)
- ✅ Safari 18+ (2024)

**Coverage:** ~70% of browsers (growing rapidly)

### Detection Code

```javascript
function detectGPUSupport() {
    const canvas = document.createElement('canvas');

    return {
        webgl: !!canvas.getContext('webgl2'),
        webgpu: !!navigator.gpu,
        webgl_version: canvas.getContext('webgl2')?.getParameter(
            canvas.getContext('webgl2').VERSION
        )
    };
}
```

---

## Summary

### What You Get

- **10-100x faster** wave field calculation
- **Higher resolutions** (up to 4K+)
- **Smooth 60 FPS** at 1080p
- **Backwards compatible** with CPU fallback
- **Future-proof** with WebGPU support

### Implementation Effort

- **Phase 1 (Infrastructure):** 2-4 hours
- **Phase 2 (WebGL Basic):** 4-8 hours
- **Phase 3 (Full Features):** 8-16 hours
- **Phase 4 (Optimization):** 4-8 hours
- **Phase 5 (WebGPU):** 8-16 hours

**Total:** 1-2 weeks part-time

### Recommended Approach

1. Start with **Phase 1** (infrastructure)
2. Implement **WebGL basic** (just waves)
3. Test performance gains
4. If satisfied, add elements support
5. Optimize as needed
6. Add WebGPU later (optional)

---

## Next Steps

Ready to implement? Here's the order:

1. Create `js/compute-engine.js` (mode selector)
2. Create `js/engines/cpu-engine.js` (wrap existing code)
3. Add UI controls for mode switching
4. Test that CPU mode still works
5. Create `js/engines/webgl-engine.js` (start simple)
6. Test WebGL with just wave sources (no elements)
7. Add element support to shader
8. Compare results with CPU mode
9. Optimize and tune performance
10. Add WebGPU (optional future enhancement)

Good luck! 🚀
