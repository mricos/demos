/**
 * PlasmaOverlay - Self-contained IIFE for DivGraphics integration
 *
 * Creates a transparent WebGL canvas overlay that syncs with CSS 3D camera.
 * Includes all dependencies inline (vec3, mat4, plasma physics, WebGL renderer).
 *
 * Usage:
 *   const overlay = new PlasmaOverlay(viewportElement);
 *   overlay.addSphere({ radius: 1.5 });
 *   overlay.addMass({ position: {x:0,y:0,z:0}, mass: 1.0 });
 *   overlay.syncCamera({ rotationX: 30, rotationY: 45, zoom: 1, perspective: 1000 });
 *   overlay.start();
 */
(function(global) {
    'use strict';

    // ========================================================================
    // vec3 - 3D vector operations
    // ========================================================================
    const vec3 = {
        create(x = 0, y = 0, z = 0) { return { x, y, z }; },
        clone(v) { return { x: v.x, y: v.y, z: v.z }; },
        add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; },
        sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; },
        scale(v, s) { return { x: v.x * s, y: v.y * s, z: v.z * s }; },
        dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; },
        cross(a, b) {
            return {
                x: a.y * b.z - a.z * b.y,
                y: a.z * b.x - a.x * b.z,
                z: a.x * b.y - a.y * b.x
            };
        },
        length(v) { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); },
        normalize(v) {
            const len = vec3.length(v);
            return len > 0 ? vec3.scale(v, 1 / len) : { x: 0, y: 0, z: 0 };
        },
        lerp(a, b, t) {
            return {
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t,
                z: a.z + (b.z - a.z) * t
            };
        }
    };

    // ========================================================================
    // mat4 - 4x4 matrix operations (column-major)
    // ========================================================================
    const mat4 = {
        create() {
            const m = new Float32Array(16);
            m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
            return m;
        },

        perspective(fovY, aspect, near, far, out = new Float32Array(16)) {
            const f = 1.0 / Math.tan(fovY / 2);
            out.fill(0);
            out[0] = f / aspect;
            out[5] = f;
            out[10] = (far + near) / (near - far);
            out[11] = -1;
            out[14] = (2 * far * near) / (near - far);
            return out;
        },

        lookAt(eye, target, up, out = new Float32Array(16)) {
            const zAxis = vec3.normalize(vec3.sub(eye, target));
            const xAxis = vec3.normalize(vec3.cross(up, zAxis));
            const yAxis = vec3.cross(zAxis, xAxis);

            out[0] = xAxis.x; out[1] = yAxis.x; out[2] = zAxis.x; out[3] = 0;
            out[4] = xAxis.y; out[5] = yAxis.y; out[6] = zAxis.y; out[7] = 0;
            out[8] = xAxis.z; out[9] = yAxis.z; out[10] = zAxis.z; out[11] = 0;
            out[12] = -vec3.dot(xAxis, eye);
            out[13] = -vec3.dot(yAxis, eye);
            out[14] = -vec3.dot(zAxis, eye);
            out[15] = 1;
            return out;
        },

        multiply(a, b, out = new Float32Array(16)) {
            for (let col = 0; col < 4; col++) {
                for (let row = 0; row < 4; row++) {
                    out[col * 4 + row] =
                        a[0 * 4 + row] * b[col * 4 + 0] +
                        a[1 * 4 + row] * b[col * 4 + 1] +
                        a[2 * 4 + row] * b[col * 4 + 2] +
                        a[3 * 4 + row] * b[col * 4 + 3];
                }
            }
            return out;
        }
    };

    // ========================================================================
    // PlasmaMass - Gravitational attractor for glow
    // ========================================================================
    class PlasmaMass {
        constructor(options = {}) {
            this.position = options.position || vec3.create(0, 0, 0);
            this.mass = options.mass ?? 1.0;
            this.radius = options.radius ?? 0.5;
            this.color = options.color || [1, 0.5, 0];
            this.pulse = options.pulse ?? 0;
            this._phase = 0;
        }

        getInfluence(point) {
            const toMass = vec3.sub(this.position, point);
            const distance = vec3.length(toMass);

            if (distance < 0.001) {
                return { direction: vec3.create(0, 1, 0), strength: 1.0 };
            }

            const direction = vec3.normalize(toMass);
            const normalizedDist = distance / this.radius;
            const strength = this.mass / (1 + normalizedDist * normalizedDist);
            const pulseFactor = this.pulse > 0 ? 1 + Math.sin(this._phase) * 0.3 : 1;

            return {
                direction,
                strength: Math.min(1, strength * pulseFactor)
            };
        }

        update(dt) {
            if (this.pulse > 0) {
                this._phase += dt * this.pulse * Math.PI * 2;
            }
        }
    }

    // ========================================================================
    // PlasmaField - Collection of plasma masses
    // ========================================================================
    class PlasmaField {
        constructor() {
            this.masses = [];
        }

        addMass(mass) {
            this.masses.push(mass);
            return mass;
        }

        removeMass(mass) {
            const idx = this.masses.indexOf(mass);
            if (idx >= 0) this.masses.splice(idx, 1);
        }

        getInfluence(point) {
            if (this.masses.length === 0) {
                return { direction: vec3.create(0, 0, 0), strength: 0 };
            }

            let totalDir = vec3.create(0, 0, 0);
            let totalStrength = 0;

            for (const mass of this.masses) {
                const influence = mass.getInfluence(point);
                totalDir = vec3.add(totalDir, vec3.scale(influence.direction, influence.strength));
                totalStrength += influence.strength;
            }

            return {
                direction: vec3.normalize(totalDir),
                strength: Math.min(1, totalStrength)
            };
        }

        update(dt) {
            for (const mass of this.masses) {
                mass.update(dt);
            }
        }
    }

    // ========================================================================
    // GlowSegment - 3D line segment with plasma-influenced glow
    // ========================================================================
    class GlowSegment {
        constructor(start, end, options = {}) {
            this.start = start;
            this.end = end;
            this.baseColor = options.color || [0, 1, 0.5];
            this.baseGlow = options.glow ?? 1.0;
            this.glowRadius = options.glowRadius ?? 0.1;
        }

        getTangent() {
            return vec3.normalize(vec3.sub(this.end, this.start));
        }

        getGlowBasis() {
            const tangent = this.getTangent();
            let up = vec3.create(0, 1, 0);
            if (Math.abs(vec3.dot(tangent, up)) > 0.99) {
                up = vec3.create(1, 0, 0);
            }
            const normal = vec3.normalize(vec3.cross(tangent, up));
            const binormal = vec3.cross(tangent, normal);
            return { tangent, normal, binormal };
        }

        sampleGlow(field, samples = 10, radialSamples = 8) {
            const points = [];
            const basis = this.getGlowBasis();

            for (let i = 0; i <= samples; i++) {
                const t = i / samples;
                const linePoint = vec3.lerp(this.start, this.end, t);
                const influence = field.getInfluence(linePoint);

                for (let j = 0; j < radialSamples; j++) {
                    const angle = (j / radialSamples) * Math.PI * 2;

                    const radialDir = vec3.add(
                        vec3.scale(basis.normal, Math.cos(angle)),
                        vec3.scale(basis.binormal, Math.sin(angle))
                    );

                    const gravityBlend = influence.strength * 0.8;
                    const glowDir = vec3.normalize(vec3.add(
                        vec3.scale(radialDir, 1 - gravityBlend),
                        vec3.scale(influence.direction, gravityBlend)
                    ));

                    const alignment = vec3.dot(radialDir, influence.direction);
                    const alignmentBoost = influence.strength * (alignment * 0.5 + 0.5);
                    const glowDist = this.glowRadius * (1 + alignmentBoost * 0.5);
                    const glowPos = vec3.add(linePoint, vec3.scale(glowDir, glowDist));

                    const massColor = this._getBlendedMassColor(field, linePoint);
                    const finalColor = this._lerpColor(this.baseColor, massColor, influence.strength * 0.6);

                    points.push({
                        position: glowPos,
                        linePoint,
                        color: finalColor,
                        intensity: this.baseGlow * (1 + alignmentBoost),
                        gravityStrength: influence.strength
                    });
                }
            }

            return points;
        }

        _getBlendedMassColor(field, point) {
            if (field.masses.length === 0) return this.baseColor;

            let totalColor = [0, 0, 0];
            let totalWeight = 0;

            for (const mass of field.masses) {
                const inf = mass.getInfluence(point);
                totalColor[0] += mass.color[0] * inf.strength;
                totalColor[1] += mass.color[1] * inf.strength;
                totalColor[2] += mass.color[2] * inf.strength;
                totalWeight += inf.strength;
            }

            if (totalWeight > 0) {
                return [
                    totalColor[0] / totalWeight,
                    totalColor[1] / totalWeight,
                    totalColor[2] / totalWeight
                ];
            }
            return this.baseColor;
        }

        _lerpColor(a, b, t) {
            return [
                a[0] + (b[0] - a[0]) * t,
                a[1] + (b[1] - a[1]) * t,
                a[2] + (b[2] - a[2]) * t
            ];
        }
    }

    // ========================================================================
    // PlasmaWireframe - Collection of glow segments
    // ========================================================================
    class PlasmaWireframe {
        constructor(options = {}) {
            this.segments = [];
            this.color = options.color || [0, 1, 0.5];
            this.glow = options.glow ?? 1.0;
            this.glowRadius = options.glowRadius ?? 0.1;
        }

        setGeometry(vertices, edges) {
            this.segments = [];
            for (const [i, j] of edges) {
                this.segments.push(new GlowSegment(
                    vertices[i], vertices[j],
                    { color: this.color, glow: this.glow, glowRadius: this.glowRadius }
                ));
            }
        }

        static cube(options = {}) {
            const wf = new PlasmaWireframe(options);
            const s = options.size ?? 1;
            const h = s / 2;

            const vertices = [
                { x: -h, y: -h, z: -h }, { x: h, y: -h, z: -h },
                { x: h, y: h, z: -h }, { x: -h, y: h, z: -h },
                { x: -h, y: -h, z: h }, { x: h, y: -h, z: h },
                { x: h, y: h, z: h }, { x: -h, y: h, z: h }
            ];

            const edges = [
                [0, 1], [1, 2], [2, 3], [3, 0],
                [4, 5], [5, 6], [6, 7], [7, 4],
                [0, 4], [1, 5], [2, 6], [3, 7]
            ];

            wf.setGeometry(vertices, edges);
            return wf;
        }

        static sphere(options = {}) {
            const wf = new PlasmaWireframe(options);
            const r = options.radius ?? 1;
            const latSegments = options.latSegments ?? 8;
            const lonSegments = options.lonSegments ?? 12;

            const vertices = [];
            const edges = [];

            for (let lat = 0; lat <= latSegments; lat++) {
                const theta = (lat / latSegments) * Math.PI;
                const sinTheta = Math.sin(theta);
                const cosTheta = Math.cos(theta);

                for (let lon = 0; lon < lonSegments; lon++) {
                    const phi = (lon / lonSegments) * Math.PI * 2;
                    vertices.push({
                        x: r * sinTheta * Math.cos(phi),
                        y: r * cosTheta,
                        z: r * sinTheta * Math.sin(phi)
                    });
                }
            }

            for (let lat = 0; lat < latSegments; lat++) {
                for (let lon = 0; lon < lonSegments; lon++) {
                    const current = lat * lonSegments + lon;
                    const next = lat * lonSegments + ((lon + 1) % lonSegments);
                    const below = (lat + 1) * lonSegments + lon;

                    edges.push([current, next]);
                    if (lat < latSegments) {
                        edges.push([current, below]);
                    }
                }
            }

            wf.setGeometry(vertices, edges);
            return wf;
        }

        sampleAllGlow(field, samplesPerSegment = 8, radialSamples = 6) {
            const allPoints = [];
            for (const segment of this.segments) {
                const points = segment.sampleGlow(field, samplesPerSegment, radialSamples);
                allPoints.push(...points);
            }
            return allPoints;
        }
    }

    // ========================================================================
    // WebGL Shaders
    // ========================================================================
    const Shaders = {
        vertex: `#version 300 es
            precision highp float;
            in vec3 a_position;
            in vec3 a_color;
            in float a_intensity;
            in float a_gravityStrength;
            uniform mat4 u_viewProjection;
            uniform float u_pointSize;
            uniform float u_time;
            out vec3 v_color;
            out float v_intensity;
            out float v_gravityStrength;
            void main() {
                gl_Position = u_viewProjection * vec4(a_position, 1.0);
                float sizeBoost = 1.0 + a_gravityStrength * 0.5;
                gl_PointSize = u_pointSize * sizeBoost * a_intensity;
                v_color = a_color;
                v_intensity = a_intensity;
                v_gravityStrength = a_gravityStrength;
            }
        `,

        fragment: `#version 300 es
            precision highp float;
            in vec3 v_color;
            in float v_intensity;
            in float v_gravityStrength;
            uniform float u_time;
            out vec4 fragColor;
            void main() {
                vec2 center = gl_PointCoord - 0.5;
                float dist = length(center) * 2.0;
                float glow = exp(-dist * dist * 2.0);
                float flicker = 1.0 + sin(u_time * 10.0 + v_gravityStrength * 20.0) * 0.1 * v_gravityStrength;
                vec3 finalColor = v_color * v_intensity * glow * flicker;
                float alpha = glow * v_intensity * 0.8;
                fragColor = vec4(finalColor, alpha);
            }
        `,

        phosphorVertex: `#version 300 es
            in vec2 a_position;
            out vec2 v_texCoord;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_position * 0.5 + 0.5;
            }
        `,

        phosphorFragment: `#version 300 es
            precision highp float;
            in vec2 v_texCoord;
            uniform sampler2D u_currentFrame;
            uniform sampler2D u_previousFrame;
            uniform float u_decay;
            uniform float u_bloomIntensity;
            uniform float u_scanlineIntensity;
            uniform float u_time;
            out vec4 fragColor;
            void main() {
                vec4 current = texture(u_currentFrame, v_texCoord);
                vec4 previous = texture(u_previousFrame, v_texCoord);
                vec4 phosphor = max(current, previous * u_decay);
                vec4 bloom = vec4(0.0);
                float bloomSize = 0.003;
                for (int x = -2; x <= 2; x++) {
                    for (int y = -2; y <= 2; y++) {
                        vec2 offset = vec2(float(x), float(y)) * bloomSize;
                        bloom += texture(u_currentFrame, v_texCoord + offset);
                    }
                }
                bloom /= 25.0;
                float scanline = 1.0 - sin(v_texCoord.y * 800.0) * u_scanlineIntensity * 0.5;
                vec3 finalColor = phosphor.rgb + bloom.rgb * u_bloomIntensity;
                finalColor *= scanline;
                fragColor = vec4(finalColor, 1.0);
            }
        `
    };

    // ========================================================================
    // PlasmaRenderer - WebGL2 renderer
    // ========================================================================
    class PlasmaRenderer {
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.gl = canvas.getContext('webgl2', {
                antialias: true,
                alpha: true,
                premultipliedAlpha: false
            });

            if (!this.gl) throw new Error('WebGL2 not supported');

            this.options = {
                phosphorDecay: options.phosphorDecay ?? 0.92,
                bloomIntensity: options.bloomIntensity ?? 0.3,
                scanlineIntensity: options.scanlineIntensity ?? 0.15,
                pointSize: options.pointSize ?? 4.0,
                backgroundColor: options.backgroundColor || [0.02, 0.02, 0.05]
            };

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

            const gl = this.gl;
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        }

        _initShaders() {
            const gl = this.gl;

            this.glowProgram = this._createProgram(Shaders.vertex, Shaders.fragment);
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

            this.phosphorProgram = this._createProgram(Shaders.phosphorVertex, Shaders.phosphorFragment);
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
                throw new Error('Vertex shader: ' + gl.getShaderInfoLog(vs));
            }

            const fs = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fs, fragmentSrc);
            gl.compileShader(fs);
            if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
                throw new Error('Fragment shader: ' + gl.getShaderInfoLog(fs));
            }

            const program = gl.createProgram();
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error('Link: ' + gl.getProgramInfoLog(program));
            }

            return program;
        }

        _initBuffers() {
            const gl = this.gl;

            this.glowVAO = gl.createVertexArray();
            this.glowBuffer = gl.createBuffer();
            this.glowPointCount = 0;

            this.lineVAO = gl.createVertexArray();
            this.lineBuffer = gl.createBuffer();
            this.lineVertexCount = 0;

            this.quadVAO = gl.createVertexArray();
            gl.bindVertexArray(this.quadVAO);

            const quadBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1
            ]), gl.STATIC_DRAW);

            gl.enableVertexAttribArray(this.phosphorLocations.position);
            gl.vertexAttribPointer(this.phosphorLocations.position, 2, gl.FLOAT, false, 0, 0);
            gl.bindVertexArray(null);
        }

        _initFramebuffers() {
            const gl = this.gl;
            const width = this.canvas.width;
            const height = this.canvas.height;

            this.fbos = [
                this._createFramebuffer(width, height),
                this._createFramebuffer(width, height)
            ];
            this.currentFbo = 0;
        }

        _createFramebuffer(width, height) {
            const gl = this.gl;
            gl.getExtension('EXT_color_buffer_float');

            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);

            try {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.FLOAT, null);
            } catch (e) {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            }

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            const fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            return { fbo, texture };
        }

        resize(width, height) {
            this.canvas.width = width;
            this.canvas.height = height;
            this.gl.viewport(0, 0, width, height);
            this._initFramebuffers();
        }

        uploadLines(segments) {
            const gl = this.gl;
            const data = new Float32Array(segments.length * 2 * 8);

            for (let i = 0; i < segments.length; i++) {
                const seg = segments[i];
                const color = seg.baseColor || [0, 1, 0.5];
                const offset = i * 16;

                data[offset] = seg.start.x; data[offset + 1] = seg.start.y; data[offset + 2] = seg.start.z;
                data[offset + 3] = color[0]; data[offset + 4] = color[1]; data[offset + 5] = color[2];
                data[offset + 6] = 1.0; data[offset + 7] = 0.0;

                data[offset + 8] = seg.end.x; data[offset + 9] = seg.end.y; data[offset + 10] = seg.end.z;
                data[offset + 11] = color[0]; data[offset + 12] = color[1]; data[offset + 13] = color[2];
                data[offset + 14] = 1.0; data[offset + 15] = 0.0;
            }

            gl.bindVertexArray(this.lineVAO);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

            const stride = 32;
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

        uploadGlowPoints(points) {
            const gl = this.gl;
            const data = new Float32Array(points.length * 8);

            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                const offset = i * 8;
                data[offset] = p.position.x; data[offset + 1] = p.position.y; data[offset + 2] = p.position.z;
                data[offset + 3] = p.color[0]; data[offset + 4] = p.color[1]; data[offset + 5] = p.color[2];
                data[offset + 6] = p.intensity; data[offset + 7] = p.gravityStrength;
            }

            gl.bindVertexArray(this.glowVAO);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.glowBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

            const stride = 32;
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

        render(dt) {
            const gl = this.gl;
            this.time += dt;

            const viewProjection = this._getViewProjectionMatrix();

            const currentFbo = this.fbos[this.currentFbo];
            const previousFbo = this.fbos[1 - this.currentFbo];

            gl.bindFramebuffer(gl.FRAMEBUFFER, currentFbo.fbo);
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);

            const bg = this.options.backgroundColor;
            gl.clearColor(bg[0], bg[1], bg[2], 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(this.glowProgram);
            gl.uniformMatrix4fv(this.glowLocations.viewProjection, false, viewProjection);
            gl.uniform1f(this.glowLocations.pointSize, this.options.pointSize);
            gl.uniform1f(this.glowLocations.time, this.time);

            if (this.lineVertexCount > 0) {
                gl.bindVertexArray(this.lineVAO);
                gl.drawArrays(gl.LINES, 0, this.lineVertexCount);
            }

            if (this.glowPointCount > 0) {
                gl.bindVertexArray(this.glowVAO);
                gl.drawArrays(gl.POINTS, 0, this.glowPointCount);
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            gl.clearColor(0, 0, 0, 0);
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

            gl.disable(gl.BLEND);
            gl.bindVertexArray(this.quadVAO);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            gl.enable(gl.BLEND);

            this.currentFbo = 1 - this.currentFbo;
        }

        _getViewProjectionMatrix() {
            const aspect = this.canvas.width / this.canvas.height;
            const fovRad = this.camera.fov * Math.PI / 180;

            const proj = mat4.perspective(fovRad, aspect, this.camera.near, this.camera.far);

            const dist = this.camera.position.z;
            const pitch = this.rotation.x;
            const yaw = this.rotation.y;

            const eye = vec3.create(
                dist * Math.sin(yaw) * Math.cos(pitch),
                dist * Math.sin(pitch),
                dist * Math.cos(yaw) * Math.cos(pitch)
            );

            const view = mat4.lookAt(eye, this.camera.target, this.camera.up);

            return mat4.multiply(proj, view);
        }

        setRotation(x, y) {
            this.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, x));
            this.rotation.y = y;
        }

        destroy() {
            const gl = this.gl;
            gl.deleteProgram(this.glowProgram);
            gl.deleteProgram(this.phosphorProgram);
            gl.deleteBuffer(this.glowBuffer);
            gl.deleteBuffer(this.lineBuffer);
        }
    }

    // ========================================================================
    // PlasmaOverlay - Main integration class
    // ========================================================================
    class PlasmaOverlay {
        constructor(viewport, options = {}) {
            this.viewport = viewport;
            this.options = {
                zIndex: options.zIndex ?? 10,
                opacity: options.opacity ?? 1.0,
                blendMode: options.blendMode ?? 'screen',
                phosphorDecay: options.phosphorDecay ?? 0.85,
                bloomIntensity: options.bloomIntensity ?? 0.4,
                scanlineIntensity: options.scanlineIntensity ?? 0.1,
                pointSize: options.pointSize ?? 3.0
            };

            this.canvas = this._createCanvas();
            this.renderer = null;
            this.field = new PlasmaField();
            this.wireframes = [];

            this._animating = false;
            this._lastTime = 0;

            this._initRenderer();
            this._initResizeObserver();
        }

        _createCanvas() {
            const canvas = document.createElement('canvas');
            canvas.id = 'plasma-overlay';
            canvas.style.cssText = `
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                pointer-events: none;
                z-index: ${this.options.zIndex};
                opacity: ${this.options.opacity};
                mix-blend-mode: ${this.options.blendMode};
            `;

            const rect = this.viewport.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            this.viewport.appendChild(canvas);
            return canvas;
        }

        _initRenderer() {
            try {
                this.renderer = new PlasmaRenderer(this.canvas, {
                    phosphorDecay: this.options.phosphorDecay,
                    bloomIntensity: this.options.bloomIntensity,
                    scanlineIntensity: this.options.scanlineIntensity,
                    pointSize: this.options.pointSize,
                    backgroundColor: [0, 0, 0]
                });
                this.renderer.camera.position = vec3.create(0, 0, 5);
            } catch (e) {
                console.error('PlasmaOverlay: WebGL init failed', e);
                this.canvas.remove();
                this.canvas = null;
            }
        }

        _initResizeObserver() {
            if (!this.canvas) return;

            const ro = new ResizeObserver(entries => {
                for (const entry of entries) {
                    const { width, height } = entry.contentRect;
                    const dpr = window.devicePixelRatio || 1;
                    this.canvas.width = width * dpr;
                    this.canvas.height = height * dpr;
                    if (this.renderer) {
                        this.renderer.resize(width * dpr, height * dpr);
                    }
                }
            });

            ro.observe(this.viewport);
            this._resizeObserver = ro;
        }

        /**
         * Sync camera with DivGraphics CSS transform
         * @param {Object} cssCamera - { rotationX, rotationY, rotationZ, zoom, perspective }
         */
        syncCamera(cssCamera) {
            if (!this.renderer) return;

            const rotX = cssCamera.rotationX ?? 0;
            const rotY = cssCamera.rotationY ?? 0;
            const zoom = cssCamera.zoom ?? 1;
            const perspective = cssCamera.perspective ?? 1000;

            // Convert CSS perspective to WebGL FOV
            const viewportHeight = this.canvas.height / (window.devicePixelRatio || 1);
            const fovRadians = 2 * Math.atan(viewportHeight / 2 / perspective);
            this.renderer.camera.fov = fovRadians * 180 / Math.PI;

            // Apply rotation (negate for WebGL convention)
            this.renderer.setRotation(
                -rotX * Math.PI / 180,
                -rotY * Math.PI / 180
            );

            // Zoom affects camera distance
            this.renderer.camera.position.z = 5 / zoom;
        }

        addMass(options) {
            const mass = new PlasmaMass(options);
            this.field.addMass(mass);
            return mass;
        }

        addWireframe(wf) {
            this.wireframes.push(wf);
            return wf;
        }

        addSphere(options = {}) {
            const wf = PlasmaWireframe.sphere({
                radius: options.radius ?? 1.5,
                latSegments: options.latSegments ?? 8,
                lonSegments: options.lonSegments ?? 12,
                color: options.color ?? [0, 1, 0.5],
                glow: options.glow ?? 1.0,
                glowRadius: options.glowRadius ?? 0.1
            });
            this.wireframes.push(wf);
            return wf;
        }

        addCube(options = {}) {
            const wf = PlasmaWireframe.cube({
                size: options.size ?? 1,
                color: options.color ?? [1, 0.5, 0],
                glow: options.glow ?? 1.0,
                glowRadius: options.glowRadius ?? 0.08
            });
            this.wireframes.push(wf);
            return wf;
        }

        start() {
            if (this._animating || !this.renderer) return;
            this._animating = true;
            this._lastTime = performance.now();
            this._animate();
        }

        stop() {
            this._animating = false;
        }

        _animate() {
            if (!this._animating) return;

            const now = performance.now();
            const dt = (now - this._lastTime) / 1000;
            this._lastTime = now;

            this.field.update(dt);

            const allPoints = [];
            const allSegments = [];

            for (const wf of this.wireframes) {
                const points = wf.sampleAllGlow(this.field, 6, 6);
                allPoints.push(...points);
                allSegments.push(...wf.segments);
            }

            this.renderer.uploadLines(allSegments);
            this.renderer.uploadGlowPoints(allPoints);
            this.renderer.render(dt);

            requestAnimationFrame(() => this._animate());
        }

        renderFrame(dt = 1/60) {
            if (!this.renderer) return;

            this.field.update(dt);

            const allPoints = [];
            const allSegments = [];

            for (const wf of this.wireframes) {
                const points = wf.sampleAllGlow(this.field, 6, 6);
                allPoints.push(...points);
                allSegments.push(...wf.segments);
            }

            this.renderer.uploadLines(allSegments);
            this.renderer.uploadGlowPoints(allPoints);
            this.renderer.render(dt);
        }

        setBlendMode(mode) {
            if (this.canvas) this.canvas.style.mixBlendMode = mode;
        }

        setOpacity(opacity) {
            if (this.canvas) this.canvas.style.opacity = opacity;
        }

        getOptions() {
            return this.renderer?.options ?? {};
        }

        setOption(key, value) {
            if (this.renderer?.options) this.renderer.options[key] = value;
        }

        destroy() {
            this.stop();
            if (this._resizeObserver) this._resizeObserver.disconnect();
            if (this.renderer) this.renderer.destroy();
            if (this.canvas) this.canvas.remove();
            this.wireframes = [];
            this.field = new PlasmaField();
        }
    }

    // ========================================================================
    // Export
    // ========================================================================
    global.PlasmaOverlay = PlasmaOverlay;
    global.PlasmaWireframe = PlasmaWireframe;
    global.PlasmaMass = PlasmaMass;
    global.PlasmaField = PlasmaField;

})(typeof window !== 'undefined' ? window : this);
