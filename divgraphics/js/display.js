/**
 * DivGraphics - Display Module
 * Toast notifications and Stats/FPS tracking
 */
window.APP = window.APP || {};

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

            // 1. Restore from state
            this._restoreFromState();

            // 2. Subscribe to future changes
            this._subscribe();
        },

        _restoreFromState() {
            const enabled = APP.State.select('display.toasts');
            this.container.style.display = enabled ? 'flex' : 'none';
        },

        _subscribe() {
            APP.State.subscribe('display.toasts', (enabled) => {
                this.container.style.display = enabled ? 'flex' : 'none';
            });
        },

        show(message, type = 'info') {
            const enabled = APP.State.select('display.toasts');
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
            const midiToasts = APP.State.select('display.midiToasts');
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

            // 1. Restore from state
            this._restoreFromState();

            // 2. Subscribe to future changes
            this._subscribe();
        },

        _restoreFromState() {
            const visible = APP.State.select('display.stats');
            if (this.element) {
                this.element.style.display = visible ? 'block' : 'none';
            }
        },

        _subscribe() {
            APP.State.subscribe('display.stats', (visible) => {
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
