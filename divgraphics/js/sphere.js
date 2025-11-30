/**
 * DivGraphics - Sphere Classes
 * UV Sphere and Icosphere generators with same interface as Cylinder
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * UVSphere - Latitude/longitude sphere using div faces
     * Same interface as Cylinder for drop-in replacement
     */
    APP.UVSphere = class UVSphere {
        constructor(options = {}) {
            this.radius = options.radius || 100;
            this.latSegments = options.latSegments || 12;
            this.lonSegments = options.lonSegments || 24;
            this.color = options.color || '#00d4ff';
            this.colorSecondary = options.colorSecondary || '#ff00aa';
            this.wireframe = options.wireframe || false;
            this.wireframeMode = options.wireframeMode || 'border'; // 'border' or 'edge'
            this.faceInward = options.faceInward || false;
            this.opacity = options.opacity || 0.85;
            this.borderWidth = options.borderWidth ?? 1;
            this.lodMultiplier = options.lodMultiplier ?? 1.0;

            this.container = null;
            this.faceCount = 0;
            this.divCount = 0;
            this._faces = [];
        }

        _getEffectiveSegments(base, min = 3) {
            return Math.max(min, Math.floor(base * this.lodMultiplier));
        }

        generate() {
            const container = document.createElement('div');
            container.className = 'sphere-geometry uv-sphere';
            container.style.cssText = 'position:absolute;transform-style:preserve-3d;';

            this.faceCount = 0;
            this.divCount = 0;
            this._faces = [];

            const effectiveLat = this._getEffectiveSegments(this.latSegments, 4);
            const effectiveLon = this._getEffectiveSegments(this.lonSegments, 6);

            if (this.wireframe && this.wireframeMode === 'edge') {
                // Edge-based wireframe: draw lat and lon lines as thin edges
                // Latitude lines (horizontal)
                for (let lat = 0; lat <= effectiveLat; lat++) {
                    const phi = (lat / effectiveLat) * Math.PI;
                    for (let lon = 0; lon < effectiveLon; lon++) {
                        const theta1 = (lon / effectiveLon) * 2 * Math.PI;
                        const theta2 = ((lon + 1) / effectiveLon) * 2 * Math.PI;
                        const p1 = this._spherePoint(phi, theta1);
                        const p2 = this._spherePoint(phi, theta2);
                        const edge = this._createEdge(p1, p2);
                        container.appendChild(edge);
                        this.divCount++;
                    }
                }
                // Longitude lines (vertical)
                for (let lon = 0; lon < effectiveLon; lon++) {
                    const theta = (lon / effectiveLon) * 2 * Math.PI;
                    for (let lat = 0; lat < effectiveLat; lat++) {
                        const phi1 = (lat / effectiveLat) * Math.PI;
                        const phi2 = ((lat + 1) / effectiveLat) * Math.PI;
                        const p1 = this._spherePoint(phi1, theta);
                        const p2 = this._spherePoint(phi2, theta);
                        const edge = this._createEdge(p1, p2);
                        container.appendChild(edge);
                        this.divCount++;
                    }
                }
            } else if (this.wireframe) {
                // Border-based wireframe (original): bordered quad faces
                for (let lat = 0; lat < effectiveLat; lat++) {
                    const phi1 = (lat / effectiveLat) * Math.PI;
                    const phi2 = ((lat + 1) / effectiveLat) * Math.PI;

                    const ring = document.createElement('div');
                    ring.className = 'sphere-ring';
                    ring.style.cssText = 'position:absolute;transform-style:preserve-3d;';

                    for (let lon = 0; lon < effectiveLon; lon++) {
                        const theta1 = (lon / effectiveLon) * 2 * Math.PI;
                        const theta2 = ((lon + 1) / effectiveLon) * 2 * Math.PI;

                        const p1 = this._spherePoint(phi1, theta1);
                        const p2 = this._spherePoint(phi1, theta2);
                        const p3 = this._spherePoint(phi2, theta2);
                        const p4 = this._spherePoint(phi2, theta1);

                        const center = {
                            x: (p1.x + p2.x + p3.x + p4.x) / 4,
                            y: (p1.y + p2.y + p3.y + p4.y) / 4,
                            z: (p1.z + p2.z + p3.z + p4.z) / 4
                        };

                        const width = Math.sqrt(
                            Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow(p2.z - p1.z, 2)
                        ) + 0.5;
                        const height = Math.sqrt(
                            Math.pow(p4.x - p1.x, 2) + Math.pow(p4.y - p1.y, 2) + Math.pow(p4.z - p1.z, 2)
                        ) + 0.5;

                        const normal = this._normalize(center);
                        const rotY = Math.atan2(normal.x, normal.z) * 180 / Math.PI;
                        const rotX = -Math.asin(normal.y) * 180 / Math.PI;

                        const t = ((lat / effectiveLat) + (lon / effectiveLon)) / 2;
                        const color = APP.Utils.lerpColor(this.color, this.colorSecondary, t);

                        const face = document.createElement('div');
                        face.className = 'sphere-face';
                        const flipY = this.faceInward ? 180 : 0;

                        face.style.cssText = `position:absolute;width:${width}px;height:${height}px;transform:translate3d(${center.x - width/2}px,${center.y - height/2}px,${center.z}px) rotateY(${rotY + flipY}deg) rotateX(${rotX}deg);border:${this.borderWidth}px solid ${color};background:transparent;opacity:${this.opacity};`;

                        this._faces.push({ el: face, x: center.x, y: center.y, z: center.z });
                        ring.appendChild(face);
                        this.faceCount++;
                        this.divCount++;
                    }

                    container.appendChild(ring);
                    this.divCount++;
                }
            } else {
                // Solid faces
                for (let lat = 0; lat < effectiveLat; lat++) {
                    const phi1 = (lat / effectiveLat) * Math.PI;
                    const phi2 = ((lat + 1) / effectiveLat) * Math.PI;

                    const ring = document.createElement('div');
                    ring.className = 'sphere-ring';
                    ring.style.cssText = 'position:absolute;transform-style:preserve-3d;';

                    for (let lon = 0; lon < effectiveLon; lon++) {
                        const theta1 = (lon / effectiveLon) * 2 * Math.PI;
                        const theta2 = ((lon + 1) / effectiveLon) * 2 * Math.PI;

                        const p1 = this._spherePoint(phi1, theta1);
                        const p2 = this._spherePoint(phi1, theta2);
                        const p3 = this._spherePoint(phi2, theta2);
                        const p4 = this._spherePoint(phi2, theta1);

                        const center = {
                            x: (p1.x + p2.x + p3.x + p4.x) / 4,
                            y: (p1.y + p2.y + p3.y + p4.y) / 4,
                            z: (p1.z + p2.z + p3.z + p4.z) / 4
                        };

                        const width = Math.sqrt(
                            Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow(p2.z - p1.z, 2)
                        ) + 0.5;
                        const height = Math.sqrt(
                            Math.pow(p4.x - p1.x, 2) + Math.pow(p4.y - p1.y, 2) + Math.pow(p4.z - p1.z, 2)
                        ) + 0.5;

                        const normal = this._normalize(center);
                        const rotY = Math.atan2(normal.x, normal.z) * 180 / Math.PI;
                        const rotX = -Math.asin(normal.y) * 180 / Math.PI;

                        const t = ((lat / effectiveLat) + (lon / effectiveLon)) / 2;
                        const color = APP.Utils.lerpColor(this.color, this.colorSecondary, t);

                        const face = document.createElement('div');
                        face.className = 'sphere-face';
                        const flipY = this.faceInward ? 180 : 0;

                        const config = APP.State?.defaults?.config || {};
                        const darkColor = APP.Utils.lerpColor(color, '#000', config.darkColorLerp || 0.3);
                        face.style.cssText = `position:absolute;width:${width}px;height:${height}px;transform:translate3d(${center.x - width/2}px,${center.y - height/2}px,${center.z}px) rotateY(${rotY + flipY}deg) rotateX(${rotX}deg);background:linear-gradient(180deg,${color},${darkColor});opacity:${this.opacity};box-shadow:inset 0 0 20px rgba(255,255,255,0.1);`;

                        this._faces.push({ el: face, x: center.x, y: center.y, z: center.z });
                        ring.appendChild(face);
                        this.faceCount++;
                        this.divCount++;
                    }

                    container.appendChild(ring);
                    this.divCount++;
                }
            }

            this.container = container;
            return container;
        }

        _createEdge(p1, p2) {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dz = p2.z - p1.z;
            const length = Math.sqrt(dx*dx + dy*dy + dz*dz);

            const rotY = Math.atan2(dx, dz) * 180 / Math.PI;
            const horizontalDist = Math.sqrt(dx*dx + dz*dz);
            const rotX = Math.atan2(-dy, horizontalDist) * 180 / Math.PI;

            const midY = (p1.y + p2.y) / 2;
            const ct = (midY / this.radius + 1) / 2;
            const color = APP.Utils.lerpColor(this.color, this.colorSecondary, ct);

            const edge = document.createElement('div');
            edge.className = 'uv-edge';
            edge.style.cssText = `position:absolute;width:${length}px;height:${this.borderWidth}px;background:${color};opacity:${this.opacity};transform-origin:0 50%;transform:translate3d(${p1.x}px,${p1.y - this.borderWidth/2}px,${p1.z}px) rotateY(${rotY}deg) rotateX(${rotX}deg);`;

            const mid = { x: (p1.x + p2.x) / 2, y: midY, z: (p1.z + p2.z) / 2 };
            this._faces.push({ el: edge, x: mid.x, y: mid.y, z: mid.z });
            return edge;
        }

        _spherePoint(phi, theta) {
            return {
                x: this.radius * Math.sin(phi) * Math.sin(theta),
                y: this.radius * Math.cos(phi),
                z: this.radius * Math.sin(phi) * Math.cos(theta)
            };
        }

        _normalize(v) {
            const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
            return { x: v.x / len, y: v.y / len, z: v.z / len };
        }

        updateHaze(opts) {
            const { rotX, rotY, rotZ, intensity, rollMode, camPos } = opts;

            if (!this._faces.length || intensity <= 0) {
                if (intensity <= 0) {
                    this._faces.forEach(f => f.el.style.opacity = this.opacity);
                }
                return;
            }

            const hazeFactor = intensity / 100;
            const isFollowMode = camPos !== null && camPos !== undefined;

            const rx = rotX * Math.PI / 180;
            const ry = rotY * Math.PI / 180;
            const rz = rotZ * Math.PI / 180;

            const cosX = Math.cos(rx), sinX = Math.sin(rx);
            const cosY = Math.cos(ry), sinY = Math.sin(ry);
            const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

            let zMin = Infinity, zMax = -Infinity;
            const viewZs = [];

            for (const face of this._faces) {
                let viewZ;
                if (isFollowMode) {
                    const px = face.x - camPos.x;
                    const py = face.y - camPos.y;
                    const pz = face.z - camPos.z;
                    viewZ = Math.sqrt(px * px + py * py + pz * pz);
                } else if (rollMode === 'world') {
                    const xz = face.x * cosZ - face.y * sinZ;
                    const yz = face.x * sinZ + face.y * cosZ;
                    const zy = -xz * sinY + face.z * cosY;
                    viewZ = yz * sinX + zy * cosX;
                } else {
                    const z1 = -face.x * sinY + face.z * cosY;
                    viewZ = face.y * sinX + z1 * cosX;
                }
                viewZs.push(viewZ);
                zMin = Math.min(zMin, viewZ);
                zMax = Math.max(zMax, viewZ);
            }

            const zRange = zMax - zMin || 1;

            for (let i = 0; i < this._faces.length; i++) {
                const zNorm = (viewZs[i] - zMin) / zRange;
                const opacity = isFollowMode
                    ? Math.max(0.15, 1 - zNorm * hazeFactor)
                    : Math.max(0.15, 1 - (1 - zNorm) * hazeFactor);
                this._faces[i].el.style.opacity = this.opacity * opacity;
            }
        }

        getStats() {
            return { divCount: this.divCount, faceCount: this.faceCount };
        }
    };

    /**
     * IcoSphere - Geodesic sphere from subdivided icosahedron
     * More uniform face distribution than UV sphere
     */
    APP.IcoSphere = class IcoSphere {
        constructor(options = {}) {
            this.radius = options.radius || 100;
            this.subdivisions = options.subdivisions ?? 0;  // 0=20, 1=80, 2=320, 3=1280 faces
            this.color = options.color || '#00d4ff';
            this.colorSecondary = options.colorSecondary || '#ff00aa';
            this.wireframe = options.wireframe || false;
            this.faceInward = options.faceInward || false;
            this.opacity = options.opacity || 0.85;
            this.borderWidth = options.borderWidth ?? 1;
            this.lodMultiplier = options.lodMultiplier ?? 1.0;

            this.container = null;
            this.faceCount = 0;
            this.divCount = 0;
            this._faces = [];
        }

        _getEffectiveSubdivisions() {
            if (this.lodMultiplier < 0.3) return Math.max(0, this.subdivisions - 2);
            if (this.lodMultiplier < 0.6) return Math.max(0, this.subdivisions - 1);
            return this.subdivisions;
        }

        generate() {
            const container = document.createElement('div');
            container.className = 'sphere-geometry ico-sphere';
            container.style.cssText = 'position:absolute;transform-style:preserve-3d;';

            this.faceCount = 0;
            this.divCount = 0;
            this._faces = [];

            const subdivisions = this._getEffectiveSubdivisions();

            // Icosahedron vertices (golden ratio)
            const t = (1 + Math.sqrt(5)) / 2;
            const vertices = this._normalizeAll([
                [-1,  t,  0], [ 1,  t,  0], [-1, -t,  0], [ 1, -t,  0],
                [ 0, -1,  t], [ 0,  1,  t], [ 0, -1, -t], [ 0,  1, -t],
                [ t,  0, -1], [ t,  0,  1], [-t,  0, -1], [-t,  0,  1]
            ]);

            // 20 icosahedron faces
            let faces = [
                [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
                [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
                [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
                [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
            ];

            // Subdivide
            for (let i = 0; i < subdivisions; i++) {
                faces = this._subdivide(vertices, faces);
            }

            // Render triangular faces (wireframe = transparent fill with border, solid = filled)
            for (const [i1, i2, i3] of faces) {
                const v1 = vertices[i1];
                const v2 = vertices[i2];
                const v3 = vertices[i3];

                const p1 = { x: v1[0] * this.radius, y: v1[1] * this.radius, z: v1[2] * this.radius };
                const p2 = { x: v2[0] * this.radius, y: v2[1] * this.radius, z: v2[2] * this.radius };
                const p3 = { x: v3[0] * this.radius, y: v3[1] * this.radius, z: v3[2] * this.radius };

                const center = {
                    x: (p1.x + p2.x + p3.x) / 3,
                    y: (p1.y + p2.y + p3.y) / 3,
                    z: (p1.z + p2.z + p3.z) / 3
                };

                const normal = this._normalizeVec(center);
                const rotY = Math.atan2(normal.x, normal.z) * 180 / Math.PI;
                const rotX = -Math.asin(normal.y) * 180 / Math.PI;

                const edge = Math.sqrt(Math.pow(p2.x-p1.x,2) + Math.pow(p2.y-p1.y,2) + Math.pow(p2.z-p1.z,2));
                const size = edge * 1.15;

                const ct = (normal.y + 1) / 2;
                const color = APP.Utils.lerpColor(this.color, this.colorSecondary, ct);

                const face = document.createElement('div');
                face.className = 'sphere-face ico-face';
                const flipY = this.faceInward ? 180 : 0;

                let bgStyle;
                if (this.wireframe) {
                    // Wireframe: transparent fill with border
                    bgStyle = `background:transparent;border:${this.borderWidth}px solid ${color};`;
                } else {
                    // Solid: gradient fill
                    const config = APP.State?.defaults?.config || {};
                    const darkColor = APP.Utils.lerpColor(color, '#000', config.darkColorLerp || 0.3);
                    bgStyle = `background:linear-gradient(180deg,${color},${darkColor});`;
                }

                face.style.cssText = `position:absolute;width:${size}px;height:${size * 0.866}px;transform:translate3d(${center.x - size/2}px,${center.y - size*0.433}px,${center.z}px) rotateY(${rotY + flipY}deg) rotateX(${rotX}deg);clip-path:polygon(50% 0%, 0% 100%, 100% 100%);${bgStyle}opacity:${this.opacity};`;

                this._faces.push({ el: face, x: center.x, y: center.y, z: center.z });
                container.appendChild(face);
                this.faceCount++;
                this.divCount++;
            }

            this.container = container;
            return container;
        }

        _extractEdges(faces) {
            const edgeSet = new Set();
            const edges = [];
            for (const [i1, i2, i3] of faces) {
                const addEdge = (a, b) => {
                    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
                    if (!edgeSet.has(key)) {
                        edgeSet.add(key);
                        edges.push([Math.min(a, b), Math.max(a, b)]);
                    }
                };
                addEdge(i1, i2);
                addEdge(i2, i3);
                addEdge(i3, i1);
            }
            return edges;
        }

        _createEdge(p1, p2) {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dz = p2.z - p1.z;
            const length = Math.sqrt(dx*dx + dy*dy + dz*dz);

            // Calculate rotation: yaw (Y) then pitch (X)
            const rotY = Math.atan2(dx, dz) * 180 / Math.PI;
            const horizontalDist = Math.sqrt(dx*dx + dz*dz);
            const rotX = Math.atan2(-dy, horizontalDist) * 180 / Math.PI;

            // Color based on height of midpoint
            const midY = (p1.y + p2.y) / 2;
            const ct = (midY / this.radius + 1) / 2;
            const color = APP.Utils.lerpColor(this.color, this.colorSecondary, ct);

            const edge = document.createElement('div');
            edge.className = 'ico-edge';
            // Position at p1, rotate to point toward p2, use left-center origin
            edge.style.cssText = `position:absolute;width:${length}px;height:${this.borderWidth}px;background:${color};opacity:${this.opacity};transform-origin:0 50%;transform:translate3d(${p1.x}px,${p1.y - this.borderWidth/2}px,${p1.z}px) rotateY(${rotY}deg) rotateX(${rotX}deg);`;

            const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, z: (p1.z + p2.z) / 2 };
            this._faces.push({ el: edge, x: mid.x, y: mid.y, z: mid.z });
            return edge;
        }

        _normalizeAll(verts) {
            return verts.map(v => {
                const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
                return [v[0]/len, v[1]/len, v[2]/len];
            });
        }

        _normalizeVec(v) {
            const len = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
            return { x: v.x/len, y: v.y/len, z: v.z/len };
        }

        _subdivide(vertices, faces) {
            const cache = {};
            const newFaces = [];

            const getMid = (i1, i2) => {
                const key = i1 < i2 ? `${i1}_${i2}` : `${i2}_${i1}`;
                if (cache[key] !== undefined) return cache[key];

                const v1 = vertices[i1], v2 = vertices[i2];
                const mid = [(v1[0]+v2[0])/2, (v1[1]+v2[1])/2, (v1[2]+v2[2])/2];
                const len = Math.sqrt(mid[0]*mid[0] + mid[1]*mid[1] + mid[2]*mid[2]);
                mid[0] /= len; mid[1] /= len; mid[2] /= len;

                const idx = vertices.length;
                vertices.push(mid);
                cache[key] = idx;
                return idx;
            };

            for (const [i1, i2, i3] of faces) {
                const a = getMid(i1, i2);
                const b = getMid(i2, i3);
                const c = getMid(i3, i1);
                newFaces.push([i1, a, c], [i2, b, a], [i3, c, b], [a, b, c]);
            }
            return newFaces;
        }

        updateHaze(opts) {
            const { rotX, rotY, rotZ, intensity, rollMode, camPos } = opts;

            if (!this._faces.length || intensity <= 0) {
                if (intensity <= 0) this._faces.forEach(f => f.el.style.opacity = this.opacity);
                return;
            }

            const hazeFactor = intensity / 100;
            const isFollowMode = camPos !== null && camPos !== undefined;

            const rx = rotX * Math.PI / 180;
            const ry = rotY * Math.PI / 180;
            const rz = rotZ * Math.PI / 180;

            const cosX = Math.cos(rx), sinX = Math.sin(rx);
            const cosY = Math.cos(ry), sinY = Math.sin(ry);
            const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

            let zMin = Infinity, zMax = -Infinity;
            const viewZs = [];

            for (const face of this._faces) {
                let viewZ;
                if (isFollowMode) {
                    const px = face.x - camPos.x, py = face.y - camPos.y, pz = face.z - camPos.z;
                    viewZ = Math.sqrt(px*px + py*py + pz*pz);
                } else if (rollMode === 'world') {
                    const xz = face.x * cosZ - face.y * sinZ;
                    const yz = face.x * sinZ + face.y * cosZ;
                    const zy = -xz * sinY + face.z * cosY;
                    viewZ = yz * sinX + zy * cosX;
                } else {
                    const z1 = -face.x * sinY + face.z * cosY;
                    viewZ = face.y * sinX + z1 * cosX;
                }
                viewZs.push(viewZ);
                zMin = Math.min(zMin, viewZ);
                zMax = Math.max(zMax, viewZ);
            }

            const zRange = zMax - zMin || 1;

            for (let i = 0; i < this._faces.length; i++) {
                const zNorm = (viewZs[i] - zMin) / zRange;
                const opacity = isFollowMode
                    ? Math.max(0.15, 1 - zNorm * hazeFactor)
                    : Math.max(0.15, 1 - (1 - zNorm) * hazeFactor);
                this._faces[i].el.style.opacity = this.opacity * opacity;
            }
        }

        getStats() {
            return { divCount: this.divCount, faceCount: this.faceCount };
        }
    };

    /**
     * Dodecahedron - 12 pentagonal faces (dual of icosahedron)
     */
    APP.Dodecahedron = class Dodecahedron {
        constructor(options = {}) {
            this.radius = options.radius || 100;
            this.color = options.color || '#00d4ff';
            this.colorSecondary = options.colorSecondary || '#ff00aa';
            this.wireframe = options.wireframe || false;
            this.faceInward = options.faceInward || false;
            this.opacity = options.opacity || 0.85;
            this.borderWidth = options.borderWidth ?? 1;
            this.lodMultiplier = options.lodMultiplier ?? 1.0;

            this.container = null;
            this.faceCount = 0;
            this.divCount = 0;
            this._faces = [];
        }

        generate() {
            const container = document.createElement('div');
            container.className = 'sphere-geometry dodecahedron';
            container.style.cssText = 'position:absolute;transform-style:preserve-3d;';

            this.faceCount = 0;
            this.divCount = 0;
            this._faces = [];

            // Golden ratio
            const phi = (1 + Math.sqrt(5)) / 2;
            const invPhi = 1 / phi;

            // Dodecahedron vertices (20 vertices)
            const verts = [
                [ 1,  1,  1], [ 1,  1, -1], [ 1, -1,  1], [ 1, -1, -1],
                [-1,  1,  1], [-1,  1, -1], [-1, -1,  1], [-1, -1, -1],
                [0,  phi,  invPhi], [0,  phi, -invPhi], [0, -phi,  invPhi], [0, -phi, -invPhi],
                [ invPhi, 0,  phi], [-invPhi, 0,  phi], [ invPhi, 0, -phi], [-invPhi, 0, -phi],
                [ phi,  invPhi, 0], [ phi, -invPhi, 0], [-phi,  invPhi, 0], [-phi, -invPhi, 0]
            ];

            // Normalize to unit sphere then scale
            const vertices = verts.map(v => {
                const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
                return { x: v[0]/len * this.radius, y: v[1]/len * this.radius, z: v[2]/len * this.radius };
            });

            // Correct 12 pentagonal faces (each with 5 vertices in order)
            const faces = [
                [0, 8, 4, 13, 12],
                [0, 12, 2, 17, 16],
                [0, 16, 1, 9, 8],
                [1, 16, 17, 3, 14],
                [1, 14, 15, 5, 9],
                [2, 12, 13, 6, 10],
                [2, 10, 11, 3, 17],
                [3, 11, 7, 15, 14],
                [4, 8, 9, 5, 18],
                [4, 18, 19, 6, 13],
                [5, 15, 7, 19, 18],
                [6, 19, 7, 11, 10]
            ];

            // Render pentagonal faces (wireframe = transparent fill with border, solid = filled)
            for (const faceIndices of faces) {
                const faceVerts = faceIndices.map(idx => vertices[idx]);

                const center = { x: 0, y: 0, z: 0 };
                for (const v of faceVerts) {
                    center.x += v.x;
                    center.y += v.y;
                    center.z += v.z;
                }
                center.x /= faceVerts.length;
                center.y /= faceVerts.length;
                center.z /= faceVerts.length;

                const normal = this._normalizeVec(center);
                const rotY = Math.atan2(normal.x, normal.z) * 180 / Math.PI;
                const rotX = -Math.asin(normal.y) * 180 / Math.PI;

                const dist = Math.sqrt(
                    Math.pow(faceVerts[0].x - center.x, 2) +
                    Math.pow(faceVerts[0].y - center.y, 2) +
                    Math.pow(faceVerts[0].z - center.z, 2)
                );
                const size = dist * 2.1;

                const ct = (normal.y + 1) / 2;
                const color = APP.Utils.lerpColor(this.color, this.colorSecondary, ct);

                const face = document.createElement('div');
                face.className = 'sphere-face dodeca-face';
                const flipY = this.faceInward ? 180 : 0;

                const pentClip = 'polygon(50% 0%, 100% 38%, 81% 100%, 19% 100%, 0% 38%)';
                let bgStyle;
                if (this.wireframe) {
                    // Wireframe: transparent fill with border
                    bgStyle = `background:transparent;border:${this.borderWidth}px solid ${color};`;
                } else {
                    // Solid: gradient fill
                    const config = APP.State?.defaults?.config || {};
                    const darkColor = APP.Utils.lerpColor(color, '#000', config.darkColorLerp || 0.3);
                    bgStyle = `background:linear-gradient(180deg,${color},${darkColor});`;
                }

                face.style.cssText = `position:absolute;width:${size}px;height:${size * 0.95}px;transform:translate3d(${center.x - size/2}px,${center.y - size*0.475}px,${center.z}px) rotateY(${rotY + flipY}deg) rotateX(${rotX}deg);clip-path:${pentClip};${bgStyle}opacity:${this.opacity};`;

                this._faces.push({ el: face, x: center.x, y: center.y, z: center.z });
                container.appendChild(face);
                this.faceCount++;
                this.divCount++;
            }

            this.container = container;
            return container;
        }

        _extractEdges(faces) {
            const edgeSet = new Set();
            const edges = [];
            for (const faceIndices of faces) {
                for (let i = 0; i < faceIndices.length; i++) {
                    const a = faceIndices[i];
                    const b = faceIndices[(i + 1) % faceIndices.length];
                    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
                    if (!edgeSet.has(key)) {
                        edgeSet.add(key);
                        edges.push([Math.min(a, b), Math.max(a, b)]);
                    }
                }
            }
            return edges;
        }

        _createEdge(p1, p2) {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dz = p2.z - p1.z;
            const length = Math.sqrt(dx*dx + dy*dy + dz*dz);

            const rotY = Math.atan2(dx, dz) * 180 / Math.PI;
            const horizontalDist = Math.sqrt(dx*dx + dz*dz);
            const rotX = Math.atan2(-dy, horizontalDist) * 180 / Math.PI;

            const midY = (p1.y + p2.y) / 2;
            const ct = (midY / this.radius + 1) / 2;
            const color = APP.Utils.lerpColor(this.color, this.colorSecondary, ct);

            const edge = document.createElement('div');
            edge.className = 'dodeca-edge';
            edge.style.cssText = `position:absolute;width:${length}px;height:${this.borderWidth}px;background:${color};opacity:${this.opacity};transform-origin:0 50%;transform:translate3d(${p1.x}px,${p1.y - this.borderWidth/2}px,${p1.z}px) rotateY(${rotY}deg) rotateX(${rotX}deg);`;

            const mid = { x: (p1.x + p2.x) / 2, y: midY, z: (p1.z + p2.z) / 2 };
            this._faces.push({ el: edge, x: mid.x, y: mid.y, z: mid.z });
            return edge;
        }

        _normalizeVec(v) {
            const len = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
            return { x: v.x/len, y: v.y/len, z: v.z/len };
        }

        updateHaze(opts) {
            const { rotX, rotY, rotZ, intensity, rollMode, camPos } = opts;

            if (!this._faces.length || intensity <= 0) {
                if (intensity <= 0) this._faces.forEach(f => f.el.style.opacity = this.opacity);
                return;
            }

            const hazeFactor = intensity / 100;
            const isFollowMode = camPos !== null && camPos !== undefined;

            const rx = rotX * Math.PI / 180;
            const ry = rotY * Math.PI / 180;
            const rz = rotZ * Math.PI / 180;

            const cosX = Math.cos(rx), sinX = Math.sin(rx);
            const cosY = Math.cos(ry), sinY = Math.sin(ry);
            const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

            let zMin = Infinity, zMax = -Infinity;
            const viewZs = [];

            for (const face of this._faces) {
                let viewZ;
                if (isFollowMode) {
                    const px = face.x - camPos.x, py = face.y - camPos.y, pz = face.z - camPos.z;
                    viewZ = Math.sqrt(px*px + py*py + pz*pz);
                } else if (rollMode === 'world') {
                    const xz = face.x * cosZ - face.y * sinZ;
                    const yz = face.x * sinZ + face.y * cosZ;
                    const zy = -xz * sinY + face.z * cosY;
                    viewZ = yz * sinX + zy * cosX;
                } else {
                    const z1 = -face.x * sinY + face.z * cosY;
                    viewZ = face.y * sinX + z1 * cosX;
                }
                viewZs.push(viewZ);
                zMin = Math.min(zMin, viewZ);
                zMax = Math.max(zMax, viewZ);
            }

            const zRange = zMax - zMin || 1;

            for (let i = 0; i < this._faces.length; i++) {
                const zNorm = (viewZs[i] - zMin) / zRange;
                const opacity = isFollowMode
                    ? Math.max(0.15, 1 - zNorm * hazeFactor)
                    : Math.max(0.15, 1 - (1 - zNorm) * hazeFactor);
                this._faces[i].el.style.opacity = this.opacity * opacity;
            }
        }

        getStats() {
            return { divCount: this.divCount, faceCount: this.faceCount };
        }
    };

    /**
     * RingSphere - Sphere made of wireframe hoops (latitude and longitude)
     * Each ring is a single div with border-radius 50% (true circle)
     */
    APP.RingSphere = class RingSphere {
        constructor(options = {}) {
            this.radius = options.radius || 100;
            this.latRings = options.rings || 12;        // Number of latitude rings (horizontal)
            this.lonRings = options.segments || 12;     // Number of longitude rings (vertical)
            this.color = options.color || '#00d4ff';
            this.colorSecondary = options.colorSecondary || '#ff00aa';
            this.opacity = options.opacity || 0.85;
            this.lineWidth = options.segmentSize || 2;  // Border thickness
            this.lodMultiplier = options.lodMultiplier ?? 1.0;

            this.container = null;
            this.faceCount = 0;
            this.divCount = 0;
            this._faces = [];
        }

        generate() {
            const container = document.createElement('div');
            container.className = 'sphere-geometry ring-sphere';
            container.style.cssText = 'position:absolute;transform-style:preserve-3d;';

            this.faceCount = 0;
            this.divCount = 0;
            this._faces = [];

            const effectiveLatRings = Math.max(3, Math.floor(this.latRings * this.lodMultiplier));
            const effectiveLonRings = Math.max(3, Math.floor(this.lonRings * this.lodMultiplier));
            const diameter = this.radius * 2;

            // Latitude rings (horizontal hoops at different heights)
            for (let r = 0; r <= effectiveLatRings; r++) {
                const phi = (r / effectiveLatRings) * Math.PI;
                const y = this.radius * Math.cos(phi);
                const ringRadius = this.radius * Math.sin(phi);

                // Skip poles where ring radius is too small
                if (ringRadius < 3) continue;

                // Color gradient from top to bottom
                const t = r / effectiveLatRings;
                const ringColor = APP.Utils.lerpColor(this.color, this.colorSecondary, t);

                const ringDiameter = ringRadius * 2;
                const ring = document.createElement('div');
                ring.className = 'ring-sphere-lat';
                ring.style.cssText = `
                    position: absolute;
                    width: ${ringDiameter}px;
                    height: ${ringDiameter}px;
                    border: ${this.lineWidth}px solid ${ringColor};
                    border-radius: 50%;
                    background: transparent;
                    opacity: ${this.opacity};
                    transform: translate3d(${-ringRadius}px, ${y - ringRadius}px, 0px) rotateX(90deg);
                `;

                this._faces.push({ el: ring, x: 0, y: y, z: 0 });
                container.appendChild(ring);
                this.faceCount++;
                this.divCount++;
            }

            // Longitude rings (vertical great circles)
            for (let l = 0; l < effectiveLonRings; l++) {
                const theta = (l / effectiveLonRings) * Math.PI;  // 0 to PI (half circle, mirrored)

                // Color based on angle
                const t = l / effectiveLonRings;
                const ringColor = APP.Utils.lerpColor(this.color, this.colorSecondary, t);

                const ring = document.createElement('div');
                ring.className = 'ring-sphere-lon';
                ring.style.cssText = `
                    position: absolute;
                    width: ${diameter}px;
                    height: ${diameter}px;
                    border: ${this.lineWidth}px solid ${ringColor};
                    border-radius: 50%;
                    background: transparent;
                    opacity: ${this.opacity};
                    transform: translate3d(${-this.radius}px, ${-this.radius}px, 0px) rotateY(${theta * 180 / Math.PI}deg);
                `;

                this._faces.push({ el: ring, x: 0, y: 0, z: 0 });
                container.appendChild(ring);
                this.faceCount++;
                this.divCount++;
            }

            this.container = container;
            return container;
        }

        updateHaze(opts) {
            const { rotX, rotY, rotZ, intensity, rollMode, camPos } = opts;

            if (!this._faces.length || intensity <= 0) {
                if (intensity <= 0) {
                    this._faces.forEach(f => f.el.style.opacity = this.opacity);
                }
                return;
            }

            const hazeFactor = intensity / 100;
            const isFollowMode = camPos !== null && camPos !== undefined;

            const rx = rotX * Math.PI / 180;
            const ry = rotY * Math.PI / 180;
            const rz = rotZ * Math.PI / 180;

            const cosX = Math.cos(rx), sinX = Math.sin(rx);
            const cosY = Math.cos(ry), sinY = Math.sin(ry);
            const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

            let zMin = Infinity, zMax = -Infinity;
            const viewZs = [];

            for (const face of this._faces) {
                let viewZ;
                if (isFollowMode) {
                    const px = face.x - camPos.x;
                    const py = face.y - camPos.y;
                    const pz = face.z - camPos.z;
                    viewZ = Math.sqrt(px * px + py * py + pz * pz);
                } else if (rollMode === 'world') {
                    const xz = face.x * cosZ - face.y * sinZ;
                    const yz = face.x * sinZ + face.y * cosZ;
                    const zy = -xz * sinY + face.z * cosY;
                    viewZ = yz * sinX + zy * cosX;
                } else {
                    const z1 = -face.x * sinY + face.z * cosY;
                    viewZ = face.y * sinX + z1 * cosX;
                }
                viewZs.push(viewZ);
                zMin = Math.min(zMin, viewZ);
                zMax = Math.max(zMax, viewZ);
            }

            const zRange = zMax - zMin || 1;

            for (let i = 0; i < this._faces.length; i++) {
                const zNorm = (viewZs[i] - zMin) / zRange;
                const opacity = isFollowMode
                    ? Math.max(0.15, 1 - zNorm * hazeFactor)
                    : Math.max(0.15, 1 - (1 - zNorm) * hazeFactor);
                this._faces[i].el.style.opacity = this.opacity * opacity;
            }
        }

        getStats() {
            return { divCount: this.divCount, faceCount: this.faceCount };
        }
    };

    /**
     * PanelSphere - Sphere made of small panel divs arranged on surface
     * Panels can face outward or lay flat (horizontal)
     */
    APP.PanelSphere = class PanelSphere {
        constructor(options = {}) {
            this.radius = options.radius || 100;
            this.rings = options.rings || 12;           // Number of latitude rings
            this.segments = options.segments || 24;     // Panels per ring
            this.color = options.color || '#00d4ff';
            this.colorSecondary = options.colorSecondary || '#ff00aa';
            this.opacity = options.opacity || 0.85;
            this.panelSize = options.panelSize || 8;    // Size of each panel
            this.roundness = options.roundness ?? 50;   // 0=square, 100=circle
            this.flat = options.flat ?? false;          // true = panels lay flat, false = face outward
            this.lodMultiplier = options.lodMultiplier ?? 1.0;

            this.container = null;
            this.faceCount = 0;
            this.divCount = 0;
            this._faces = [];
        }

        generate() {
            const container = document.createElement('div');
            container.className = 'sphere-geometry panel-sphere';
            container.style.cssText = 'position:absolute;transform-style:preserve-3d;';

            this.faceCount = 0;
            this.divCount = 0;
            this._faces = [];

            const effectiveRings = Math.max(3, Math.floor(this.rings * this.lodMultiplier));
            const effectiveSegments = Math.max(6, Math.floor(this.segments * this.lodMultiplier));

            // Create rings from top to bottom (phi from 0 to PI)
            for (let r = 0; r <= effectiveRings; r++) {
                const phi = (r / effectiveRings) * Math.PI;
                const y = this.radius * Math.cos(phi);
                const ringRadius = this.radius * Math.sin(phi);

                // Skip poles where ring radius is too small
                if (ringRadius < this.panelSize * 0.5) continue;

                // Color gradient from top to bottom
                const t = r / effectiveRings;
                const ringColor = APP.Utils.lerpColor(this.color, this.colorSecondary, t);

                // Create ring container
                const ring = document.createElement('div');
                ring.className = 'panel-sphere-ring';
                ring.style.cssText = `position:absolute;transform-style:preserve-3d;transform:translateY(${y}px);`;

                // Create panels around the ring
                for (let s = 0; s < effectiveSegments; s++) {
                    const theta = (s / effectiveSegments) * Math.PI * 2;
                    const x = ringRadius * Math.sin(theta);
                    const z = ringRadius * Math.cos(theta);

                    // Border radius based on roundness
                    const borderRadius = (this.roundness / 100) * (this.panelSize / 2);

                    const panel = document.createElement('div');
                    panel.className = 'panel-sphere-panel';

                    let transform;
                    if (this.flat) {
                        // Flat mode: panels lay horizontal, rotated to align with ring tangent
                        const angle = theta * (180 / Math.PI);
                        transform = `translate3d(${x - this.panelSize/2}px, 0px, ${z - this.panelSize/2}px) rotateX(90deg) rotateZ(${angle}deg)`;
                    } else {
                        // Normal mode: panels face outward from sphere center
                        const rotY = theta * (180 / Math.PI);
                        transform = `translate3d(${x - this.panelSize/2}px, ${-this.panelSize/2}px, ${z}px) rotateY(${rotY}deg)`;
                    }

                    panel.style.cssText = `
                        position: absolute;
                        width: ${this.panelSize}px;
                        height: ${this.panelSize}px;
                        background: ${ringColor};
                        opacity: ${this.opacity};
                        border-radius: ${borderRadius}px;
                        transform: ${transform};
                    `;

                    // Store face data for haze
                    this._faces.push({
                        el: panel,
                        x: x,
                        y: y,
                        z: z
                    });

                    ring.appendChild(panel);
                    this.faceCount++;
                    this.divCount++;
                }

                container.appendChild(ring);
                this.divCount++;
            }

            this.container = container;
            return container;
        }

        updateHaze(opts) {
            const { rotX, rotY, rotZ, intensity, rollMode, camPos } = opts;

            if (!this._faces.length || intensity <= 0) {
                if (intensity <= 0) {
                    this._faces.forEach(f => f.el.style.opacity = this.opacity);
                }
                return;
            }

            const hazeFactor = intensity / 100;
            const isFollowMode = camPos !== null && camPos !== undefined;

            const rx = rotX * Math.PI / 180;
            const ry = rotY * Math.PI / 180;
            const rz = rotZ * Math.PI / 180;

            const cosX = Math.cos(rx), sinX = Math.sin(rx);
            const cosY = Math.cos(ry), sinY = Math.sin(ry);
            const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

            let zMin = Infinity, zMax = -Infinity;
            const viewZs = [];

            for (const face of this._faces) {
                let viewZ;
                if (isFollowMode) {
                    const px = face.x - camPos.x;
                    const py = face.y - camPos.y;
                    const pz = face.z - camPos.z;
                    viewZ = Math.sqrt(px * px + py * py + pz * pz);
                } else if (rollMode === 'world') {
                    const xz = face.x * cosZ - face.y * sinZ;
                    const yz = face.x * sinZ + face.y * cosZ;
                    const zy = -xz * sinY + face.z * cosY;
                    viewZ = yz * sinX + zy * cosX;
                } else {
                    const z1 = -face.x * sinY + face.z * cosY;
                    viewZ = face.y * sinX + z1 * cosX;
                }
                viewZs.push(viewZ);
                zMin = Math.min(zMin, viewZ);
                zMax = Math.max(zMax, viewZ);
            }

            const zRange = zMax - zMin || 1;

            for (let i = 0; i < this._faces.length; i++) {
                const zNorm = (viewZs[i] - zMin) / zRange;
                const opacity = isFollowMode
                    ? Math.max(0.15, 1 - zNorm * hazeFactor)
                    : Math.max(0.15, 1 - (1 - zNorm) * hazeFactor);
                this._faces[i].el.style.opacity = this.opacity * opacity;
            }
        }

        getStats() {
            return { divCount: this.divCount, faceCount: this.faceCount };
        }
    };

})(window.APP);
