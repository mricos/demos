/**
 * DivGraphics - 3D rendering library using CSS transforms and div elements
 * Modular API: window.APP.{Utils, Tube, Scene, init}
 */
window.APP = window.APP || {};

// Utils module
window.APP.Utils = {
    degToRad: (deg) => deg * Math.PI / 180,
    radToDeg: (rad) => rad * 180 / Math.PI,

    parseColor: (color) => {
        const hexResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
        if (hexResult) {
            return {
                r: parseInt(hexResult[1], 16),
                g: parseInt(hexResult[2], 16),
                b: parseInt(hexResult[3], 16)
            };
        }

        const rgbResult = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i.exec(color);
        if (rgbResult) {
            return {
                r: parseInt(rgbResult[1], 10),
                g: parseInt(rgbResult[2], 10),
                b: parseInt(rgbResult[3], 10)
            };
        }

        return { r: 255, g: 255, b: 255 };
    },

    lerpColor: (color1, color2, t) => {
        const c1 = window.APP.Utils.parseColor(color1);
        const c2 = window.APP.Utils.parseColor(color2);
        return `rgb(${Math.round(c1.r + (c2.r - c1.r) * t)}, ${Math.round(c1.g + (c2.g - c1.g) * t)}, ${Math.round(c1.b + (c2.b - c1.b) * t)})`;
    }
};

// Tube class
window.APP.Tube = class Tube {
    constructor(options = {}) {
        this.radius = options.radius || 80;
        this.innerRadius = options.innerRadius || 0;
        this.height = options.height || 200;
        this.radialSegments = options.radialSegments || 24;
        this.heightSegments = options.heightSegments || 8;
        this.color = options.color || '#00d4ff';
        this.colorSecondary = options.colorSecondary || '#ff00aa';
        this.wireframe = options.wireframe || false;
        this.showCaps = options.showCaps !== undefined ? options.showCaps : true;

        this.container = null;
        this.faces = [];
        this.divCount = 0;
    }

    generate() {
        this.container = document.createElement('div');
        this.container.className = 'tube-geometry';
        this.container.style.cssText = `
            position: relative;
            transform-style: preserve-3d;
        `;

        this.faces = [];
        this.divCount = 0;

        this._generateCylinderSurface(this.radius, false);

        if (this.innerRadius > 0 && this.innerRadius < this.radius) {
            this._generateCylinderSurface(this.innerRadius, true);
        }

        if (this.showCaps) {
            this._generateCaps();
        }

        return this.container;
    }

    _generateCylinderSurface(radius, isInner) {
        const utils = window.APP.Utils;
        const segmentAngle = (2 * Math.PI) / this.radialSegments;
        const segmentHeight = this.height / this.heightSegments;
        const faceWidth = 2 * radius * Math.sin(segmentAngle / 2);

        for (let h = 0; h < this.heightSegments; h++) {
            const ring = document.createElement('div');
            ring.className = 'tube-ring';
            ring.style.cssText = `
                position: absolute;
                transform-style: preserve-3d;
                transform: translateY(${h * segmentHeight - this.height / 2}px);
            `;

            for (let r = 0; r < this.radialSegments; r++) {
                const angle = r * segmentAngle;
                const x = radius * Math.cos(angle + segmentAngle / 2);
                const z = radius * Math.sin(angle + segmentAngle / 2);
                const rotationY = utils.radToDeg(angle + segmentAngle / 2) + (isInner ? 180 : 0);

                const heightT = h / this.heightSegments;
                const angleT = r / this.radialSegments;

                const face = this._createFace({
                    width: faceWidth + 0.5,
                    height: segmentHeight + 0.5,
                    x: x,
                    y: segmentHeight / 2,
                    z: z,
                    rotationY: rotationY,
                    color: utils.lerpColor(this.color, this.colorSecondary, (heightT + angleT) / 2),
                    opacity: isInner ? 0.7 : 0.85
                });

                ring.appendChild(face);
                this.faces.push(face);
                this.divCount++;
            }

            this.container.appendChild(ring);
            this.divCount++;
        }
    }

    _generateCaps() {
        const utils = window.APP.Utils;
        const segmentAngle = (2 * Math.PI) / this.radialSegments;

        ['top', 'bottom'].forEach((position) => {
            const isTop = position === 'top';
            const yOffset = isTop ? this.height / 2 : -this.height / 2;

            const cap = document.createElement('div');
            cap.className = 'tube-cap';
            cap.style.cssText = `
                position: absolute;
                transform-style: preserve-3d;
                transform: translateY(${yOffset}px) rotateX(${isTop ? 0 : 180}deg);
            `;

            if (this.innerRadius > 0) {
                for (let r = 0; r < this.radialSegments; r++) {
                    const angle1 = r * segmentAngle;
                    const angle2 = (r + 1) * segmentAngle;

                    const segment = this._createCapSegment(
                        this.innerRadius,
                        this.radius,
                        angle1,
                        angle2,
                        isTop
                    );

                    cap.appendChild(segment);
                    this.divCount++;
                }
            } else {
                for (let r = 0; r < this.radialSegments; r++) {
                    const angle = r * segmentAngle;
                    const midAngle = angle + segmentAngle / 2;

                    const sliceWidth = 2 * this.radius * Math.sin(segmentAngle / 2);
                    const sliceHeight = this.radius;

                    const slice = document.createElement('div');
                    slice.className = 'tube-face cap-slice';

                    const gradientT = r / this.radialSegments;

                    slice.style.cssText = `
                        position: absolute;
                        width: ${sliceWidth}px;
                        height: ${sliceHeight}px;
                        transform-origin: center bottom;
                        transform: rotateZ(${utils.radToDeg(midAngle) - 90}deg) translateY(${-sliceHeight / 2}px);
                        ${this.wireframe
                            ? `border: 1px solid ${this.color}; background: transparent;`
                            : `background: linear-gradient(to top, ${utils.lerpColor(this.color, this.colorSecondary, gradientT)}, ${utils.lerpColor(this.colorSecondary, this.color, gradientT)});`
                        }
                        opacity: 0.7;
                        clip-path: polygon(50% 100%, 0% 0%, 100% 0%);
                    `;

                    cap.appendChild(slice);
                    this.divCount++;
                }
            }

            this.container.appendChild(cap);
            this.divCount++;
        });
    }

    _createCapSegment(innerR, outerR, angle1, angle2, isTop) {
        const utils = window.APP.Utils;
        const segment = document.createElement('div');
        segment.className = 'tube-face cap-segment';

        const midAngle = (angle1 + angle2) / 2;
        const avgR = (innerR + outerR) / 2;

        const width = 2 * outerR * Math.sin((angle2 - angle1) / 2);
        const depth = outerR - innerR;

        const x = avgR * Math.cos(midAngle);
        const z = avgR * Math.sin(midAngle);

        const gradientT = midAngle / (2 * Math.PI);

        segment.style.cssText = `
            position: absolute;
            width: ${width + 1}px;
            height: ${depth + 1}px;
            transform-origin: center center;
            transform: translate3d(${x - width/2}px, ${-depth/2}px, ${z}px) rotateX(-90deg) rotateZ(${utils.radToDeg(midAngle) + 90}deg);
            ${this.wireframe
                ? `border: 1px solid ${this.color}; background: transparent;`
                : `background: ${utils.lerpColor(this.color, this.colorSecondary, gradientT)};`
            }
            opacity: 0.6;
        `;

        return segment;
    }

    _createFace(options) {
        const utils = window.APP.Utils;
        const face = document.createElement('div');
        face.className = 'tube-face';

        face.style.cssText = `
            position: absolute;
            width: ${options.width}px;
            height: ${options.height}px;
            transform: translate3d(${options.x - options.width/2}px, ${options.y - options.height/2}px, ${options.z}px) rotateY(${options.rotationY}deg);
            ${this.wireframe
                ? `border: 1px solid ${options.color}; background: transparent;`
                : `background: linear-gradient(180deg, ${options.color}, ${utils.lerpColor(options.color, '#000', 0.3)});`
            }
            opacity: ${options.opacity || 0.85};
            box-shadow: ${this.wireframe ? 'none' : `inset 0 0 20px rgba(255,255,255,0.1)`};
        `;

        return face;
    }

    update(options) {
        Object.assign(this, options);
        if (this.container && this.container.parentNode) {
            const parent = this.container.parentNode;
            parent.removeChild(this.container);
            parent.appendChild(this.generate());
        }
    }

    getStats() {
        return {
            divCount: this.divCount,
            faceCount: this.faces.length
        };
    }
};

// Scene class
window.APP.Scene = class Scene {
    constructor(containerEl, viewportEl) {
        this.container = containerEl;
        this.viewport = viewportEl;
        this.objects = [];

        this.rotation = { x: -20, y: 0 };
        this.targetRotation = { x: -20, y: 0 };
        this.zoom = 1;

        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.autoRotate = true;

        this._initInteraction();
        this._animate();
    }

    add(object) {
        const element = object.generate();
        this.container.appendChild(element);
        this.objects.push(object);
        return object;
    }

    clear() {
        this.container.innerHTML = '';
        this.objects = [];
    }

    _initInteraction() {
        this.viewport.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;

            this.targetRotation.y += dx * 0.5;
            this.targetRotation.x += dy * 0.5;
            this.targetRotation.x = Math.max(-90, Math.min(90, this.targetRotation.x));

            this.lastMouse = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.viewport.addEventListener('touchstart', (e) => {
            this.isDragging = true;
            this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        });

        this.viewport.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;

            const dx = e.touches[0].clientX - this.lastMouse.x;
            const dy = e.touches[0].clientY - this.lastMouse.y;

            this.targetRotation.y += dx * 0.5;
            this.targetRotation.x += dy * 0.5;
            this.targetRotation.x = Math.max(-90, Math.min(90, this.targetRotation.x));

            this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        });

        this.viewport.addEventListener('touchend', () => {
            this.isDragging = false;
        });

        this.viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.zoom += e.deltaY * -0.001;
            this.zoom = Math.max(0.3, Math.min(2.5, this.zoom));
        });
    }

    _animate() {
        if (this.autoRotate && !this.isDragging) {
            this.targetRotation.y += 0.3;
        }

        this.rotation.x += (this.targetRotation.x - this.rotation.x) * 0.1;
        this.rotation.y += (this.targetRotation.y - this.rotation.y) * 0.1;

        this.container.style.transform = `
            scale(${this.zoom})
            rotateX(${this.rotation.x}deg)
            rotateY(${this.rotation.y}deg)
        `;

        requestAnimationFrame(() => this._animate());
    }

    resetView() {
        this.targetRotation = { x: -20, y: 0 };
        this.zoom = 1;
    }
};

// Application state
window.APP.state = {
    scene: null,
    tube: null,
    controls: {}
};

// Initialize application
window.APP.init = function() {
    const state = window.APP.state;

    state.scene = new window.APP.Scene(
        document.getElementById('scene'),
        document.getElementById('viewport')
    );

    state.tube = new window.APP.Tube({
        radius: 80,
        innerRadius: 50,
        height: 200,
        radialSegments: 24,
        heightSegments: 8,
        color: '#00d4ff',
        colorSecondary: '#ff00aa',
        wireframe: false,
        showCaps: true
    });

    state.scene.add(state.tube);
    window.APP.updateStats();

    state.controls = {
        radius: document.getElementById('radius'),
        height: document.getElementById('height'),
        radialSegments: document.getElementById('radialSegments'),
        heightSegments: document.getElementById('heightSegments'),
        innerRadius: document.getElementById('innerRadius'),
        color: document.getElementById('color'),
        colorSecondary: document.getElementById('colorSecondary'),
        wireframe: document.getElementById('wireframe'),
        autoRotate: document.getElementById('autoRotate'),
        showCaps: document.getElementById('showCaps'),
        resetBtn: document.getElementById('resetBtn')
    };

    window.APP.bindControls();
};

// Rebuild tube with current control values
window.APP.rebuildTube = function() {
    const state = window.APP.state;
    const controls = state.controls;

    state.scene.clear();
    state.tube = new window.APP.Tube({
        radius: parseInt(controls.radius.value),
        innerRadius: parseInt(controls.innerRadius.value),
        height: parseInt(controls.height.value),
        radialSegments: parseInt(controls.radialSegments.value),
        heightSegments: parseInt(controls.heightSegments.value),
        color: controls.color.value,
        colorSecondary: controls.colorSecondary.value,
        wireframe: controls.wireframe.checked,
        showCaps: controls.showCaps.checked
    });
    state.scene.add(state.tube);
    window.APP.updateStats();
};

// Update statistics display
window.APP.updateStats = function() {
    const stats = window.APP.state.tube.getStats();
    document.getElementById('statDivs').textContent = stats.divCount;
    document.getElementById('statFaces').textContent = stats.faceCount;
};

// Bind control event listeners
window.APP.bindControls = function() {
    const controls = window.APP.state.controls;
    const scene = window.APP.state.scene;

    ['radius', 'height', 'radialSegments', 'heightSegments', 'innerRadius'].forEach(id => {
        controls[id].addEventListener('input', function() {
            document.getElementById(id + 'Value').textContent = this.value;
            window.APP.rebuildTube();
        });
    });

    controls.color.addEventListener('input', window.APP.rebuildTube);
    controls.colorSecondary.addEventListener('input', window.APP.rebuildTube);

    controls.wireframe.addEventListener('change', window.APP.rebuildTube);
    controls.showCaps.addEventListener('change', window.APP.rebuildTube);
    controls.autoRotate.addEventListener('change', function() {
        scene.autoRotate = this.checked;
    });

    controls.resetBtn.addEventListener('click', () => {
        scene.resetView();
    });
};

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', window.APP.init);
