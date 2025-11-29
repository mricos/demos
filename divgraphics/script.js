/**
 * DivGraphics - 3D CSS Cylinder Visualization
 * PState-driven IIFE architecture bound to window.APP
 */
window.APP = window.APP || {};

// ============================================================================
// State Schema (Defaults)
// ============================================================================
(function(APP) {
    'use strict';

    APP.PState.defaults = {
        outer: {
            radius: 80,
            height: 200,
            radialSegments: 24,
            heightSegments: 8,
            color: '#00d4ff',
            colorSecondary: '#ff00aa',
            wireframe: false
        },
        inner: {
            enabled: true,
            radius: 50,
            height: 200,
            radialSegments: 24,
            heightSegments: 8,
            color: '#ff00aa',
            colorSecondary: '#00d4ff',
            wireframe: false
        },
        scene: {
            autoRotate: true,
            zoom: 1,
            rotationX: -20,
            rotationY: 0
        },
        display: {
            toasts: true,
            stats: true,
            midiToasts: true
        },
        midi: {
            bindings: {},
            device: null,
            learnMode: false
        }
    };

})(window.APP);

// ============================================================================
// Utils Module
// ============================================================================
(function(APP) {
    'use strict';

    APP.Utils = {
        degToRad: (deg) => deg * Math.PI / 180,
        radToDeg: (rad) => rad * 180 / Math.PI,

        parseColor(color) {
            const hex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
            if (hex) {
                return { r: parseInt(hex[1], 16), g: parseInt(hex[2], 16), b: parseInt(hex[3], 16) };
            }
            return { r: 255, g: 255, b: 255 };
        },

        lerpColor(c1, c2, t) {
            const a = this.parseColor(c1);
            const b = this.parseColor(c2);
            const r = Math.round(a.r + (b.r - a.r) * t);
            const g = Math.round(a.g + (b.g - a.g) * t);
            const bl = Math.round(a.b + (b.b - a.b) * t);
            return `rgb(${r},${g},${bl})`;
        },

        throttle(fn, limit) {
            let waiting = false;
            let lastArgs = null;
            return function(...args) {
                if (!waiting) {
                    fn.apply(this, args);
                    waiting = true;
                    setTimeout(() => {
                        waiting = false;
                        if (lastArgs) {
                            fn.apply(this, lastArgs);
                            lastArgs = null;
                        }
                    }, limit);
                } else {
                    lastArgs = args;
                }
            };
        },

        debounce(fn, delay) {
            let timer = null;
            return function(...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, args), delay);
            };
        }
    };

})(window.APP);

// ============================================================================
// Cylinder Class
// ============================================================================
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

// ============================================================================
// Scene Module (Subscriber Pattern)
// ============================================================================
(function(APP) {
    'use strict';

    APP.Scene = {
        container: null,
        viewport: null,
        objects: [],
        outerCylinder: null,
        innerCylinder: null,

        rotation: { x: -20, y: 0 },
        targetRotation: { x: -20, y: 0 },
        zoom: 1,
        isDragging: false,
        lastMouse: { x: 0, y: 0 },

        init() {
            this.container = document.getElementById('scene');
            this.viewport = document.getElementById('viewport');

            this._initInteraction();
            this._startAnimationLoop();

            // Subscribe to state changes (throttled for performance)
            const throttledRebuildOuter = APP.Utils.throttle(() => this._rebuildOuter(), 16);
            const throttledRebuildInner = APP.Utils.throttle(() => this._rebuildInner(), 16);

            APP.PState.subscribe('outer.*', throttledRebuildOuter);
            APP.PState.subscribe('inner.*', throttledRebuildInner);
            APP.PState.subscribe('scene.autoRotate', (val) => {
                // autoRotate is handled in animation loop
            });

            // Initial build
            this._rebuildOuter();
            this._rebuildInner();
        },

        _rebuildOuter() {
            const state = APP.PState.state.outer;
            if (!state) return;

            if (this.outerCylinder?.container?.parentNode) {
                this.outerCylinder.container.parentNode.removeChild(this.outerCylinder.container);
            }

            this.outerCylinder = new APP.Cylinder({
                radius: state.radius,
                height: state.height,
                radialSegments: state.radialSegments,
                heightSegments: state.heightSegments,
                color: state.color,
                colorSecondary: state.colorSecondary,
                wireframe: state.wireframe,
                faceInward: false,
                opacity: 0.85
            });

            this.container.appendChild(this.outerCylinder.generate());
            APP.Stats.updateCounts();
        },

        _rebuildInner() {
            const state = APP.PState.state.inner;
            if (!state) return;

            if (this.innerCylinder?.container?.parentNode) {
                this.innerCylinder.container.parentNode.removeChild(this.innerCylinder.container);
            }

            if (!state.enabled) {
                this.innerCylinder = null;
                APP.Stats.updateCounts();
                return;
            }

            this.innerCylinder = new APP.Cylinder({
                radius: state.radius,
                height: state.height,
                radialSegments: state.radialSegments,
                heightSegments: state.heightSegments,
                color: state.color,
                colorSecondary: state.colorSecondary,
                wireframe: state.wireframe,
                faceInward: true,
                opacity: 0.7
            });

            this.container.appendChild(this.innerCylinder.generate());
            APP.Stats.updateCounts();
        },

        _initInteraction() {
            const vp = this.viewport;

            vp.addEventListener('mousedown', (e) => {
                this.isDragging = true;
                this.lastMouse = { x: e.clientX, y: e.clientY };
            });

            window.addEventListener('mousemove', (e) => {
                if (!this.isDragging) return;
                this.targetRotation.y += (e.clientX - this.lastMouse.x) * 0.5;
                this.targetRotation.x = Math.max(-90, Math.min(90, this.targetRotation.x + (e.clientY - this.lastMouse.y) * 0.5));
                this.lastMouse = { x: e.clientX, y: e.clientY };
            });

            window.addEventListener('mouseup', () => this.isDragging = false);

            vp.addEventListener('touchstart', (e) => {
                this.isDragging = true;
                this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            });

            vp.addEventListener('touchmove', (e) => {
                if (!this.isDragging) return;
                this.targetRotation.y += (e.touches[0].clientX - this.lastMouse.x) * 0.5;
                this.targetRotation.x = Math.max(-90, Math.min(90, this.targetRotation.x + (e.touches[0].clientY - this.lastMouse.y) * 0.5));
                this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            });

            vp.addEventListener('touchend', () => this.isDragging = false);

            vp.addEventListener('wheel', (e) => {
                e.preventDefault();
                this.zoom = Math.max(0.3, Math.min(2.5, this.zoom - e.deltaY * 0.001));
            }, { passive: false });
        },

        _startAnimationLoop() {
            const animate = () => {
                const autoRotate = APP.PState.select('scene.autoRotate');
                if (autoRotate && !this.isDragging) {
                    this.targetRotation.y += 0.3;
                }

                this.rotation.x += (this.targetRotation.x - this.rotation.x) * 0.1;
                this.rotation.y += (this.targetRotation.y - this.rotation.y) * 0.1;

                this.container.style.transform = `scale(${this.zoom}) rotateX(${this.rotation.x}deg) rotateY(${this.rotation.y}deg)`;

                APP.Stats.tick();
                requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        },

        resetView() {
            this.targetRotation = { x: -20, y: 0 };
            this.zoom = 1;
        }
    };

})(window.APP);

// ============================================================================
// Toast System
// ============================================================================
(function(APP) {
    'use strict';

    APP.Toast = {
        container: null,
        maxToasts: 5,
        duration: 2000,

        init() {
            this.container = document.getElementById('toastContainer');
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'toastContainer';
                this.container.className = 'toast-container';
                document.body.appendChild(this.container);
            }

            // Subscribe to display.toasts
            APP.PState.subscribe('display.toasts', (enabled) => {
                this.container.style.display = enabled ? 'flex' : 'none';
            });
        },

        show(message, type = 'info') {
            const enabled = APP.PState.select('display.toasts');
            if (!enabled || !this.container) return;

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;

            this.container.appendChild(toast);

            while (this.container.children.length > this.maxToasts) {
                this.container.removeChild(this.container.firstChild);
            }

            requestAnimationFrame(() => toast.classList.add('show'));

            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, this.duration);
        },

        info(msg) { this.show(msg, 'info'); },
        success(msg) { this.show(msg, 'success'); },
        midi(msg) {
            const midiToasts = APP.PState.select('display.midiToasts');
            if (midiToasts) this.show(msg, 'midi');
        }
    };

})(window.APP);

// ============================================================================
// Stats / FPS Module
// ============================================================================
(function(APP) {
    'use strict';

    APP.Stats = {
        fps: 0,
        frames: 0,
        lastTime: performance.now(),
        element: null,
        fpsEl: null,
        divCountEl: null,
        faceCountEl: null,

        init() {
            this.element = document.getElementById('statsToast');
            this.fpsEl = document.getElementById('statFps');
            this.divCountEl = document.getElementById('statDivs');
            this.faceCountEl = document.getElementById('statFaces');

            // Subscribe to display.stats
            APP.PState.subscribe('display.stats', (visible) => {
                if (this.element) {
                    this.element.style.display = visible ? 'block' : 'none';
                }
            });
        },

        tick() {
            this.frames++;
            const now = performance.now();
            const delta = now - this.lastTime;

            if (delta >= 1000) {
                this.fps = Math.round((this.frames * 1000) / delta);
                this.frames = 0;
                this.lastTime = now;
                this.updateDisplay();
            }
        },

        updateDisplay() {
            if (this.fpsEl) {
                this.fpsEl.textContent = this.fps;
            }
        },

        updateCounts() {
            let divs = 0, faces = 0;

            if (APP.Scene.outerCylinder) {
                const s = APP.Scene.outerCylinder.getStats();
                divs += s.divCount;
                faces += s.faceCount;
            }
            if (APP.Scene.innerCylinder) {
                const s = APP.Scene.innerCylinder.getStats();
                divs += s.divCount;
                faces += s.faceCount;
            }

            if (this.divCountEl) this.divCountEl.textContent = divs;
            if (this.faceCountEl) this.faceCountEl.textContent = faces;
        }
    };

})(window.APP);

// ============================================================================
// UI Module (Dispatcher Pattern)
// ============================================================================
(function(APP) {
    'use strict';

    APP.UI = {
        init() {
            // Bind range inputs
            this._bindRange('outerRadius', 'outer.radius');
            this._bindRange('outerHeight', 'outer.height');
            this._bindRange('outerRadialSegments', 'outer.radialSegments');
            this._bindRange('outerHeightSegments', 'outer.heightSegments');
            this._bindRange('innerRadius', 'inner.radius');
            this._bindRange('innerHeight', 'inner.height');
            this._bindRange('innerRadialSegments', 'inner.radialSegments');
            this._bindRange('innerHeightSegments', 'inner.heightSegments');

            // Bind color inputs
            this._bindColor('outerColor', 'outer.color');
            this._bindColor('outerColorSecondary', 'outer.colorSecondary');
            this._bindColor('innerColor', 'inner.color');
            this._bindColor('innerColorSecondary', 'inner.colorSecondary');

            // Bind checkboxes
            this._bindCheckbox('outerWireframe', 'outer.wireframe');
            this._bindCheckbox('innerWireframe', 'inner.wireframe');
            this._bindCheckbox('innerEnabled', 'inner.enabled');
            this._bindCheckbox('autoRotate', 'scene.autoRotate');
            this._bindCheckbox('toastsEnabled', 'display.toasts');
            this._bindCheckbox('statsEnabled', 'display.stats');

            // Inner controls visibility
            APP.PState.subscribe('inner.enabled', (enabled) => {
                const el = document.getElementById('innerControls');
                if (el) el.style.display = enabled ? 'block' : 'none';
            });

            // Reset button
            const resetBtn = document.getElementById('resetBtn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => APP.Scene.resetView());
            }

            // Collapsible sections
            document.querySelectorAll('.section-header').forEach(header => {
                header.addEventListener('click', () => {
                    header.parentElement.classList.toggle('collapsed');
                });
            });

            // Sync UI from state (for MIDI-driven changes)
            APP.PState.subscribe('outer.*', () => this._syncFromState('outer'));
            APP.PState.subscribe('inner.*', () => this._syncFromState('inner'));
            APP.PState.subscribe('scene.*', () => this._syncFromState('scene'));
            APP.PState.subscribe('display.*', () => this._syncFromState('display'));
        },

        _bindRange(id, path) {
            const el = document.getElementById(id);
            const valueEl = document.getElementById(id + 'Value');
            if (!el) return;

            // Set initial value
            const val = APP.PState.select(path);
            if (val !== undefined) {
                el.value = val;
                if (valueEl) valueEl.textContent = val;
            }

            el.addEventListener('input', () => {
                const newVal = parseInt(el.value);
                if (valueEl) valueEl.textContent = newVal;
                APP.PState.dispatch({ type: path, payload: newVal });
            });
        },

        _bindColor(id, path) {
            const el = document.getElementById(id);
            if (!el) return;

            const val = APP.PState.select(path);
            if (val !== undefined) el.value = val;

            el.addEventListener('input', () => {
                APP.PState.dispatch({ type: path, payload: el.value });
            });
        },

        _bindCheckbox(id, path) {
            const el = document.getElementById(id);
            if (!el) return;

            const val = APP.PState.select(path);
            if (val !== undefined) el.checked = val;

            el.addEventListener('change', () => {
                APP.PState.dispatch({ type: path, payload: el.checked });
            });
        },

        _syncFromState(prefix) {
            const state = APP.PState.select(prefix);
            if (!state) return;

            Object.entries(state).forEach(([key, value]) => {
                const id = prefix + key.charAt(0).toUpperCase() + key.slice(1);
                const el = document.getElementById(id);
                if (!el) return;

                if (el.type === 'checkbox') {
                    el.checked = value;
                } else if (el.type === 'range') {
                    el.value = value;
                    const valueEl = document.getElementById(id + 'Value');
                    if (valueEl) valueEl.textContent = value;
                } else if (el.type === 'color') {
                    el.value = value;
                }
            });
        }
    };

})(window.APP);

// ============================================================================
// Persistence Module
// ============================================================================
(function(APP) {
    'use strict';

    APP.Persistence = {
        init() {
            // Hydrate from localStorage
            APP.PState.hydrate();

            // Subscribe to all changes for auto-persist (handled by PState)
            // PState already debounces persist calls
        }
    };

})(window.APP);

// ============================================================================
// Init (Boot Sequence)
// ============================================================================
(function(APP) {
    'use strict';

    APP.init = function() {
        // 1. Hydrate state from localStorage
        APP.Persistence.init();

        // 2. Initialize display modules
        APP.Toast.init();
        APP.Stats.init();

        // 3. Initialize scene (subscribes to state)
        APP.Scene.init();

        // 4. Bind UI controls
        APP.UI.init();

        // 5. Welcome message
        APP.Toast.success('DivGraphics loaded');
    };

    document.addEventListener('DOMContentLoaded', APP.init);

})(window.APP);
