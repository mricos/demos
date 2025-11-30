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
        stickyContainer: null,
        maxToasts: 5,
        duration: 2000,
        stickyDuration: 8000, // Sticky toasts last 8 seconds

        init() {
            this.container = document.getElementById('toastContainer');
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'toastContainer';
                this.container.className = 'toast-container';
                document.body.appendChild(this.container);
            }

            // Sticky container at top (separate from regular toasts)
            this.stickyContainer = document.getElementById('stickyToastContainer');
            if (!this.stickyContainer) {
                this.stickyContainer = document.createElement('div');
                this.stickyContainer.id = 'stickyToastContainer';
                this.stickyContainer.className = 'sticky-toast-container';
                document.body.appendChild(this.stickyContainer);
            }

            // 1. Restore from state
            this._restoreFromState();

            // 2. Subscribe to future changes
            this._subscribe();
        },

        _restoreFromState() {
            const enabled = APP.State.select('display.toasts');
            this.container.style.display = enabled ? 'flex' : 'none';
            this.stickyContainer.style.display = enabled ? 'flex' : 'none';
        },

        _subscribe() {
            APP.State.subscribe('display.toasts', (enabled) => {
                this.container.style.display = enabled ? 'flex' : 'none';
                this.stickyContainer.style.display = enabled ? 'flex' : 'none';
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

        /**
         * Show a sticky toast that stays longer at the top
         * Useful for learn mode messages that should persist while CC messages come/go
         */
        sticky(message, type = 'info') {
            const enabled = APP.State.select('display.toasts');
            if (!enabled || !this.stickyContainer) return;

            // Remove existing sticky of same type
            const existing = this.stickyContainer.querySelector(`.toast-${type}`);
            if (existing) {
                existing.remove();
            }

            const toast = document.createElement('div');
            toast.className = `toast toast-${type} toast-sticky`;
            toast.textContent = message;

            this.stickyContainer.appendChild(toast);

            requestAnimationFrame(() => toast.classList.add('show'));

            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, this.stickyDuration);

            return toast; // Return for manual dismissal
        },

        /**
         * Dismiss a sticky toast early
         */
        dismissSticky(toast) {
            if (toast) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }
        },

        info(msg) { this.show(msg, 'info'); },
        success(msg) { this.show(msg, 'success'); },
        learn(msg) { return this.sticky(msg, 'learn'); }, // Sticky learn mode toast
        midi(msg) {
            if (APP.State.select('display.midiToasts')) {
                this.show(msg, 'midi');
            }
        },
        gamepad(msg) {
            if (APP.State.select('display.gamepadToasts')) {
                this.show(msg, 'gamepad');
            }
        }
    };

})(window.APP);

// ============================================================================
// Stats / FPS Module (Enhanced with frame budget tracking)
// ============================================================================
(function(APP) {
    'use strict';

    APP.Stats = {
        // FPS tracking (simple frame counting)
        fps: 60,
        frameCount: 0,
        lastFpsTime: 0,
        fpsInterval: 500,        // Update FPS every 500ms

        // Frame budget tracking (JS work time)
        frameStart: 0,
        lastWorkTime: 0,
        smoothWorkTime: 0,
        workSmoothing: 0.3,      // 30% new, 70% old for stability
        budgetMs: 16.67,         // Target: 60fps = 1000/60
        budgetPercent: 0,

        // DOM elements
        element: null,
        fpsEl: null,
        budgetEl: null,
        frameTimeEl: null,
        divCountEl: null,
        faceCountEl: null,

        init() {
            this.element = document.getElementById('statsToast');
            this.fpsEl = document.getElementById('statFps');
            this.budgetEl = document.getElementById('statBudget');
            this.frameTimeEl = document.getElementById('statFrameTime');
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
                this.element.style.display = visible !== false ? 'block' : 'none';
            }
        },

        _subscribe() {
            APP.State.subscribe('display.stats', (visible) => {
                if (this.element) {
                    this.element.style.display = visible ? 'block' : 'none';
                }
            });
        },

        // Call at START of animation frame
        beginFrame() {
            this.frameStart = performance.now();
        },

        // Call at END of animation frame
        endFrame() {
            const now = performance.now();
            this.frameCount++;

            // Calculate smoothed work time for budget
            this.lastWorkTime = now - this.frameStart;
            this.smoothWorkTime = this.smoothWorkTime * (1 - this.workSmoothing)
                                + this.lastWorkTime * this.workSmoothing;
            this.budgetPercent = Math.round((this.smoothWorkTime / this.budgetMs) * 100);

            // Update FPS and display every interval
            if (this.lastFpsTime === 0) {
                this.lastFpsTime = now;
            }
            const elapsed = now - this.lastFpsTime;
            if (elapsed >= this.fpsInterval) {
                this.fps = Math.round((this.frameCount * 1000) / elapsed);
                this.frameCount = 0;
                this.lastFpsTime = now;
                this.updateDisplay();
            }
        },

        // Legacy tick - same as endFrame but without work time
        tick() {
            const now = performance.now();
            this.frameCount++;

            if (this.lastFpsTime === 0) {
                this.lastFpsTime = now;
            }
            const elapsed = now - this.lastFpsTime;
            if (elapsed >= this.fpsInterval) {
                this.fps = Math.round((this.frameCount * 1000) / elapsed);
                this.frameCount = 0;
                this.lastFpsTime = now;
                this.updateDisplay();
            }
        },

        updateDisplay() {
            // FPS with color coding
            if (this.fpsEl) {
                this.fpsEl.textContent = this.fps;
                this.fpsEl.style.color =
                    this.fps >= 55 ? '#00ff88' :
                    this.fps >= 30 ? '#ffaa00' : '#ff4444';
            }

            // Budget percentage
            if (this.budgetEl) {
                this.budgetEl.textContent = this.budgetPercent < 1 && this.smoothWorkTime > 0
                    ? '<1%'
                    : this.budgetPercent + '%';
                this.budgetEl.style.color =
                    this.budgetPercent < 50 ? '#00ff88' :
                    this.budgetPercent < 80 ? '#ffaa00' : '#ff4444';
            }

            // Work time in ms (smoothed) - more precision for small values
            if (this.frameTimeEl) {
                const ms = this.smoothWorkTime;
                this.frameTimeEl.textContent = ms < 1
                    ? ms.toFixed(2) + 'ms'
                    : ms.toFixed(1) + 'ms';
            }
        },

        updateCounts() {
            let divs = 0, faces = 0;

            if (APP.Scene?.outerCylinder) {
                const s = APP.Scene.outerCylinder.getStats();
                divs += s.divCount;
                faces += s.faceCount;
            }
            if (APP.Scene?.innerCylinder) {
                const s = APP.Scene.innerCylinder.getStats();
                divs += s.divCount;
                faces += s.faceCount;
            }
            if (APP.Scene?.curve) {
                const s = APP.Scene.curve.getStats();
                divs += s.divCount;
                faces += s.faceCount;
            }
            if (APP.Scene?.track) {
                const s = APP.Scene.track.getStats();
                divs += s.divCount;
                faces += s.faceCount + (s.centerlineCount || 0);
            }

            // Also count SceneManager objects if available
            if (APP.SceneManager?.objects) {
                for (const obj of APP.SceneManager.objects.values()) {
                    if (obj.getStats) {
                        const s = obj.getStats();
                        divs += s.divCount || 0;
                        faces += s.faceCount || 0;
                    }
                }
            }

            if (this.divCountEl) this.divCountEl.textContent = divs;
            if (this.faceCountEl) this.faceCountEl.textContent = faces;
        },

        // Get current stats as object
        getStats() {
            return {
                fps: this.fps,
                budgetPercent: this.budgetPercent,
                workTime: this.smoothWorkTime,
                budgetMs: this.budgetMs
            };
        },

        // Set target FPS (changes budget calculation)
        setTargetFps(fps) {
            this.budgetMs = 1000 / fps;
        }
    };

})(window.APP);

// ============================================================================
// Header Visibility
// ============================================================================
(function(APP) {
    'use strict';

    APP.Header = {
        element: null,

        init() {
            this.element = document.querySelector('header');
            this._restoreFromState();
            this._subscribe();
        },

        _restoreFromState() {
            const visible = APP.State.select('display.header');
            if (this.element && visible === false) {
                this.element.style.display = 'none';
            }
        },

        _subscribe() {
            APP.State.subscribe('display.header', (visible) => {
                if (this.element) {
                    this.element.style.display = visible ? '' : 'none';
                }
            });
        }
    };

})(window.APP);
