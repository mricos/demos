/**
 * DivGraphics - Cylinder Class
 * Generates 3D CSS cylinder geometry using divs
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.Cylinder = class Cylinder {
        constructor(options = {}) {
            this.radius = options.radius || 80;
            this.height = options.height || 200;
            this.radialSegments = options.radialSegments || 24;
            this.heightSegments = options.heightSegments || 8;
            this.color = options.color || '#00d4ff';
            this.colorSecondary = options.colorSecondary || '#ff00aa';
            this.wireframe = options.wireframe || false;
            this.faceInward = options.faceInward || false;
            this.opacity = options.opacity || 0.85;

            this.container = null;
            this.faceCount = 0;
            this.divCount = 0;

            // Store face references for view-space haze updates
            this._faces = [];
        }

        generate() {
            const container = document.createElement('div');
            container.className = 'cylinder-geometry';
            container.style.cssText = 'position:absolute;transform-style:preserve-3d;';

            this.faceCount = 0;
            this.divCount = 0;
            this._faces = [];

            const segmentAngle = (2 * Math.PI) / this.radialSegments;
            const segmentHeight = this.height / this.heightSegments;
            const faceWidth = 2 * this.radius * Math.sin(segmentAngle / 2) + 0.5;

            for (let h = 0; h < this.heightSegments; h++) {
                const y = h * segmentHeight - this.height / 2 + segmentHeight / 2;
                const ring = document.createElement('div');
                ring.className = 'cylinder-ring';
                ring.style.cssText = `position:absolute;transform-style:preserve-3d;transform:translateY(${h * segmentHeight - this.height / 2}px);`;

                for (let r = 0; r < this.radialSegments; r++) {
                    const angle = r * segmentAngle;
                    const x = this.radius * Math.cos(angle + segmentAngle / 2);
                    const z = this.radius * Math.sin(angle + segmentAngle / 2);
                    const rotY = APP.Utils.radToDeg(angle + segmentAngle / 2) + (this.faceInward ? 180 : 0);

                    const t = ((h / this.heightSegments) + (r / this.radialSegments)) / 2;
                    const color = APP.Utils.lerpColor(this.color, this.colorSecondary, t);

                    const face = document.createElement('div');
                    face.className = 'cylinder-face';

                    if (this.wireframe) {
                        face.style.cssText = `position:absolute;width:${faceWidth}px;height:${segmentHeight + 0.5}px;transform:translate3d(${x - faceWidth/2}px,${segmentHeight/2 - (segmentHeight + 0.5)/2}px,${z}px) rotateY(${rotY}deg);border:1px solid ${color};background:transparent;opacity:${this.opacity};`;
                    } else {
                        const config = APP.State.defaults.config;
                        const darkColor = APP.Utils.lerpColor(color, '#000', config.darkColorLerp);
                        face.style.cssText = `position:absolute;width:${faceWidth}px;height:${segmentHeight + 0.5}px;transform:translate3d(${x - faceWidth/2}px,${segmentHeight/2 - (segmentHeight + 0.5)/2}px,${z}px) rotateY(${rotY}deg);background:linear-gradient(180deg,${color},${darkColor});opacity:${this.opacity};box-shadow:inset 0 0 20px rgba(255,255,255,0.1);`;
                    }

                    // Store face reference with local position for view-space haze
                    this._faces.push({ el: face, x, y, z });

                    ring.appendChild(face);
                    this.faceCount++;
                    this.divCount++;
                }

                container.appendChild(ring);
                this.divCount++;
            }

            this.container = container;
            return container;
        }

        // Update haze based on camera rotation (view-space z)
        // opts: { rotX, rotY, rotZ, intensity, rollMode }
        updateHaze(opts) {
            const { rotX, rotY, rotZ, intensity, rollMode } = opts;

            if (!this._faces.length || intensity <= 0) {
                if (intensity <= 0) {
                    this._faces.forEach(f => f.el.style.opacity = this.opacity);
                }
                return;
            }

            const hazeFactor = intensity / 100;

            // Convert degrees to radians
            const rx = rotX * Math.PI / 180;
            const ry = rotY * Math.PI / 180;
            const rz = rotZ * Math.PI / 180;

            // Precompute trig
            const cosX = Math.cos(rx), sinX = Math.sin(rx);
            const cosY = Math.cos(ry), sinY = Math.sin(ry);
            const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

            // Find z range after rotation
            let zMin = Infinity, zMax = -Infinity;
            const viewZs = [];

            for (const face of this._faces) {
                let viewZ;

                if (rollMode === 'world') {
                    // WORLD mode: Z → Y → X (Z first in world space)
                    // Apply Z rotation first (rotates in XY plane)
                    const xz = face.x * cosZ - face.y * sinZ;
                    const yz = face.x * sinZ + face.y * cosZ;
                    // Then Y rotation: z' = -x'*sinY + z*cosY
                    const zy = -xz * sinY + face.z * cosY;
                    // Then X rotation: z'' = y'*sinX + z'*cosX
                    viewZ = yz * sinX + zy * cosX;
                } else {
                    // VIEW mode: Y → X (Z is roll at end, doesn't affect depth)
                    // Y rotation: z' = -x*sinY + z*cosY
                    const z1 = -face.x * sinY + face.z * cosY;
                    // X rotation: z'' = y*sinX + z'*cosX
                    viewZ = face.y * sinX + z1 * cosX;
                }

                viewZs.push(viewZ);
                zMin = Math.min(zMin, viewZ);
                zMax = Math.max(zMax, viewZ);
            }

            const zRange = zMax - zMin || 1;

            // Apply opacity based on view-space z
            for (let i = 0; i < this._faces.length; i++) {
                const zNorm = (viewZs[i] - zMin) / zRange; // 0 = far, 1 = near
                const hazeAmount = 1 - (1 - zNorm) * hazeFactor;
                const opacity = this.opacity * Math.max(0.15, hazeAmount);
                this._faces[i].el.style.opacity = opacity;
            }
        }

        getStats() {
            return { divCount: this.divCount, faceCount: this.faceCount };
        }
    };

})(window.APP);
