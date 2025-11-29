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
        }

        generate() {
            const container = document.createElement('div');
            container.className = 'cylinder-geometry';
            container.style.cssText = 'position:absolute;transform-style:preserve-3d;';

            this.faceCount = 0;
            this.divCount = 0;

            const segmentAngle = (2 * Math.PI) / this.radialSegments;
            const segmentHeight = this.height / this.heightSegments;
            const faceWidth = 2 * this.radius * Math.sin(segmentAngle / 2) + 0.5;

            for (let h = 0; h < this.heightSegments; h++) {
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
                        const darkColor = APP.Utils.lerpColor(color, '#000', 0.3);
                        face.style.cssText = `position:absolute;width:${faceWidth}px;height:${segmentHeight + 0.5}px;transform:translate3d(${x - faceWidth/2}px,${segmentHeight/2 - (segmentHeight + 0.5)/2}px,${z}px) rotateY(${rotY}deg);background:linear-gradient(180deg,${color},${darkColor});opacity:${this.opacity};box-shadow:inset 0 0 20px rgba(255,255,255,0.1);`;
                    }

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

        getStats() {
            return { divCount: this.divCount, faceCount: this.faceCount };
        }
    };

})(window.APP);
