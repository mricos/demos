/**
 * PlasmaRenderer - WebGL2 renderer for plasma glow wireframes
 * Renders 3D lines with gravitationally-influenced glow
 */

import { vec3, mat4 } from '../shared/math/index.js';
import { PlasmaGlowShaders } from './PlasmaGlow.js?v=7';

export class PlasmaRenderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2', {
            antialias: true,
            alpha: false,
            premultipliedAlpha: false
        });

        if (!this.gl) {
            throw new Error('WebGL2 not supported');
        }

        this.options = {
            phosphorDecay: options.phosphorDecay ?? 0.92,
            bloomIntensity: options.bloomIntensity ?? 0.3,
            scanlineIntensity: options.scanlineIntensity ?? 0.15,
            pointSize: options.pointSize ?? 4.0,
            backgroundColor: options.backgroundColor || [0.02, 0.02, 0.05]
        };

        // Camera
        this.camera = {
            position: vec3.create(0, 0, 5),
            target: vec3.create(0, 0, 0),
            up: vec3.create(0, 1, 0),
            fov: 60,
            near: 0.1,
            far: 100
        };

        this.rotation = { x: 0, y: 0 };
        this.time = 0;

        this._initShaders();
        this._initBuffers();
        this._initFramebuffers();

        // Enable additive blending for glow
        const gl = this.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);  // Additive
    }

    _initShaders() {
        const gl = this.gl;

        // Main glow shader
        this.glowProgram = this._createProgram(
            PlasmaGlowShaders.vertex,
            PlasmaGlowShaders.fragment
        );

        this.glowLocations = {
            position: gl.getAttribLocation(this.glowProgram, 'a_position'),
            color: gl.getAttribLocation(this.glowProgram, 'a_color'),
            intensity: gl.getAttribLocation(this.glowProgram, 'a_intensity'),
            gravityStrength: gl.getAttribLocation(this.glowProgram, 'a_gravityStrength'),
            viewProjection: gl.getUniformLocation(this.glowProgram, 'u_viewProjection'),
            pointSize: gl.getUniformLocation(this.glowProgram, 'u_pointSize'),
            time: gl.getUniformLocation(this.glowProgram, 'u_time'),
            phosphorDecay: gl.getUniformLocation(this.glowProgram, 'u_phosphorDecay')
        };

        // Phosphor post-process shader
        this.phosphorProgram = this._createProgram(
            PlasmaGlowShaders.phosphorVertex,
            PlasmaGlowShaders.phosphorFragment
        );

        this.phosphorLocations = {
            position: gl.getAttribLocation(this.phosphorProgram, 'a_position'),
            currentFrame: gl.getUniformLocation(this.phosphorProgram, 'u_currentFrame'),
            previousFrame: gl.getUniformLocation(this.phosphorProgram, 'u_previousFrame'),
            decay: gl.getUniformLocation(this.phosphorProgram, 'u_decay'),
            bloomIntensity: gl.getUniformLocation(this.phosphorProgram, 'u_bloomIntensity'),
            scanlineIntensity: gl.getUniformLocation(this.phosphorProgram, 'u_scanlineIntensity'),
            time: gl.getUniformLocation(this.phosphorProgram, 'u_time')
        };
    }

    _createProgram(vertexSrc, fragmentSrc) {
        const gl = this.gl;

        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertexSrc);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.error('Vertex shader error:', gl.getShaderInfoLog(vs));
            throw new Error('Vertex shader failed to compile');
        }

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragmentSrc);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error('Fragment shader error:', gl.getShaderInfoLog(fs));
            throw new Error('Fragment shader failed to compile');
        }

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            throw new Error('Program failed to link');
        }

        console.log('Shader program compiled successfully');
        return program;
    }

    _initBuffers() {
        const gl = this.gl;

        // Glow points buffer (dynamic)
        this.glowVAO = gl.createVertexArray();
        this.glowBuffer = gl.createBuffer();
        this.glowPointCount = 0;

        // Line buffer for wireframe
        this.lineVAO = gl.createVertexArray();
        this.lineBuffer = gl.createBuffer();
        this.lineVertexCount = 0;

        // Full-screen quad for post-process
        this.quadVAO = gl.createVertexArray();
        gl.bindVertexArray(this.quadVAO);

        const quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,  1, -1,  -1, 1,
            -1,  1,  1, -1,   1, 1
        ]), gl.STATIC_DRAW);

        gl.enableVertexAttribArray(this.phosphorLocations.position);
        gl.vertexAttribPointer(this.phosphorLocations.position, 2, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);
    }

    _initFramebuffers() {
        const gl = this.gl;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Create ping-pong framebuffers for phosphor persistence
        this.fbos = [
            this._createFramebuffer(width, height),
            this._createFramebuffer(width, height)
        ];
        this.currentFbo = 0;
    }

    _createFramebuffer(width, height) {
        const gl = this.gl;

        // Enable float texture extension
        gl.getExtension('EXT_color_buffer_float');

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Try RGBA16F, fallback to RGBA8
        try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.FLOAT, null);
        } catch (e) {
            console.warn('RGBA16F not supported, using RGBA8');
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Framebuffer not complete:', status);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return { fbo, texture };
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);

        // Recreate framebuffers at new size
        this._initFramebuffers();
    }

    /**
     * Upload wireframe lines to GPU
     * @param {Array} segments - Array of {start: vec3, end: vec3, color: [r,g,b]}
     */
    uploadLines(segments) {
        const gl = this.gl;

        // Pack data: 2 vertices per segment, each has position(3) + color(3) + intensity(1) + gravity(1)
        const data = new Float32Array(segments.length * 2 * 8);

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const color = seg.baseColor || [0, 1, 0.5];
            const offset = i * 16;

            // Start vertex
            data[offset + 0] = seg.start.x;
            data[offset + 1] = seg.start.y;
            data[offset + 2] = seg.start.z;
            data[offset + 3] = color[0];
            data[offset + 4] = color[1];
            data[offset + 5] = color[2];
            data[offset + 6] = 1.0;  // intensity
            data[offset + 7] = 0.0;  // gravity

            // End vertex
            data[offset + 8] = seg.end.x;
            data[offset + 9] = seg.end.y;
            data[offset + 10] = seg.end.z;
            data[offset + 11] = color[0];
            data[offset + 12] = color[1];
            data[offset + 13] = color[2];
            data[offset + 14] = 1.0;
            data[offset + 15] = 0.0;
        }

        gl.bindVertexArray(this.lineVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

        const stride = 8 * 4;

        gl.enableVertexAttribArray(this.glowLocations.position);
        gl.vertexAttribPointer(this.glowLocations.position, 3, gl.FLOAT, false, stride, 0);

        gl.enableVertexAttribArray(this.glowLocations.color);
        gl.vertexAttribPointer(this.glowLocations.color, 3, gl.FLOAT, false, stride, 12);

        gl.enableVertexAttribArray(this.glowLocations.intensity);
        gl.vertexAttribPointer(this.glowLocations.intensity, 1, gl.FLOAT, false, stride, 24);

        gl.enableVertexAttribArray(this.glowLocations.gravityStrength);
        gl.vertexAttribPointer(this.glowLocations.gravityStrength, 1, gl.FLOAT, false, stride, 28);

        gl.bindVertexArray(null);

        this.lineVertexCount = segments.length * 2;
    }

    /**
     * Upload glow point data to GPU
     */
    uploadGlowPoints(points) {
        const gl = this.gl;

        // Pack data: position(3) + color(3) + intensity(1) + gravity(1) = 8 floats per point
        const data = new Float32Array(points.length * 8);

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const offset = i * 8;
            data[offset + 0] = p.position.x;
            data[offset + 1] = p.position.y;
            data[offset + 2] = p.position.z;
            data[offset + 3] = p.color[0];
            data[offset + 4] = p.color[1];
            data[offset + 5] = p.color[2];
            data[offset + 6] = p.intensity;
            data[offset + 7] = p.gravityStrength;
        }

        gl.bindVertexArray(this.glowVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.glowBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

        const stride = 8 * 4;  // 8 floats * 4 bytes

        gl.enableVertexAttribArray(this.glowLocations.position);
        gl.vertexAttribPointer(this.glowLocations.position, 3, gl.FLOAT, false, stride, 0);

        gl.enableVertexAttribArray(this.glowLocations.color);
        gl.vertexAttribPointer(this.glowLocations.color, 3, gl.FLOAT, false, stride, 12);

        gl.enableVertexAttribArray(this.glowLocations.intensity);
        gl.vertexAttribPointer(this.glowLocations.intensity, 1, gl.FLOAT, false, stride, 24);

        gl.enableVertexAttribArray(this.glowLocations.gravityStrength);
        gl.vertexAttribPointer(this.glowLocations.gravityStrength, 1, gl.FLOAT, false, stride, 28);

        gl.bindVertexArray(null);

        this.glowPointCount = points.length;
    }

    /**
     * Render a frame
     */
    render(dt) {
        const gl = this.gl;
        this.time += dt;

        // Calculate view-projection matrix
        const viewProjection = this._getViewProjectionMatrix();

        // Render glow to current FBO
        const currentFbo = this.fbos[this.currentFbo];
        const previousFbo = this.fbos[1 - this.currentFbo];

        gl.bindFramebuffer(gl.FRAMEBUFFER, currentFbo.fbo);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        // Clear with dark background
        const bg = this.options.backgroundColor;
        gl.clearColor(bg[0], bg[1], bg[2], 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.glowProgram);
        gl.uniformMatrix4fv(this.glowLocations.viewProjection, false, viewProjection);
        gl.uniform1f(this.glowLocations.pointSize, this.options.pointSize);
        gl.uniform1f(this.glowLocations.time, this.time);
        gl.uniform1f(this.glowLocations.phosphorDecay, this.options.phosphorDecay);

        // Draw wireframe lines first
        if (this.lineVertexCount > 0) {
            gl.bindVertexArray(this.lineVAO);
            gl.drawArrays(gl.LINES, 0, this.lineVertexCount);
        }

        // Draw glow points on top
        if (this.glowPointCount > 0) {
            gl.bindVertexArray(this.glowVAO);
            gl.drawArrays(gl.POINTS, 0, this.glowPointCount);
        }

        // Post-process with phosphor effect to screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.phosphorProgram);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, currentFbo.texture);
        gl.uniform1i(this.phosphorLocations.currentFrame, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, previousFbo.texture);
        gl.uniform1i(this.phosphorLocations.previousFrame, 1);

        gl.uniform1f(this.phosphorLocations.decay, this.options.phosphorDecay);
        gl.uniform1f(this.phosphorLocations.bloomIntensity, this.options.bloomIntensity);
        gl.uniform1f(this.phosphorLocations.scanlineIntensity, this.options.scanlineIntensity);
        gl.uniform1f(this.phosphorLocations.time, this.time);

        gl.disable(gl.BLEND);  // No blending for post-process
        gl.bindVertexArray(this.quadVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.enable(gl.BLEND);

        // Swap framebuffers
        this.currentFbo = 1 - this.currentFbo;
    }

    _getViewProjectionMatrix() {
        const aspect = this.canvas.width / this.canvas.height;
        const fovRad = this.camera.fov * Math.PI / 180;

        // Perspective projection using mat4 module
        const proj = mat4.perspective(fovRad, aspect, this.camera.near, this.camera.far);

        // Orbit camera - calculate eye position from rotation
        const dist = this.camera.position.z;
        const pitch = this.rotation.x;
        const yaw = this.rotation.y;

        const eye = vec3.create(
            dist * Math.sin(yaw) * Math.cos(pitch),
            dist * Math.sin(pitch),
            dist * Math.cos(yaw) * Math.cos(pitch)
        );

        // View matrix using mat4 module
        const view = mat4.lookAt(eye, this.camera.target, this.camera.up);

        // Multiply: result = proj * view
        return mat4.multiply(proj, view);
    }

    /**
     * Set camera rotation (for mouse drag)
     */
    setRotation(x, y) {
        this.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, x));
        this.rotation.y = y;
    }

    destroy() {
        // Cleanup WebGL resources
        const gl = this.gl;
        gl.deleteProgram(this.glowProgram);
        gl.deleteProgram(this.phosphorProgram);
        gl.deleteBuffer(this.glowBuffer);
        // ... delete other resources
    }
}

export default PlasmaRenderer;
