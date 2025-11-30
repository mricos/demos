/**
 * DivGraphics - Particle Chaser Module
 * A particle that chases around closed loop tracks
 * Consists of a square head and a long rectangle tail
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.ParticleChaser = {
        container: null,
        head: null,
        tail: null,
        t: 0,              // Current position parameter on track
        _lastTime: 0,

        // Exposed for follow cam
        currentPos: null,
        currentFrame: null,

        init() {
            this._restoreFromState();
            this._subscribe();
        },

        _restoreFromState() {
            const state = APP.State.select('chaser');
            if (state?.enabled) {
                this._create();
            }
        },

        _subscribe() {
            APP.State.subscribe('chaser.enabled', (enabled) => {
                if (enabled) {
                    this._create();
                } else {
                    this._destroy();
                }
            });

            // Rebuild on style changes
            APP.State.subscribe('chaser.size', () => this._rebuild());
            APP.State.subscribe('chaser.tailLength', () => this._rebuild());
            APP.State.subscribe('chaser.color', () => this._rebuild());
            APP.State.subscribe('chaser.colorSecondary', () => this._rebuild());
        },

        _create() {
            if (this.container) return; // Already exists

            const state = APP.State.select('chaser');
            const size = state?.size || 20;
            const tailLength = state?.tailLength || 60;
            const color = state?.color || '#b34233';
            const colorSecondary = state?.colorSecondary || '#8b2500';

            // Container for the particle
            this.container = document.createElement('div');
            this.container.className = 'particle-chaser';
            this.container.style.cssText = `
                position: absolute;
                transform-style: preserve-3d;
                pointer-events: none;
            `;

            // Square head
            this.head = document.createElement('div');
            this.head.className = 'chaser-head';
            this.head.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                box-shadow: 0 0 ${size/2}px ${color}, 0 0 ${size}px ${colorSecondary};
                transform: translate(-50%, -50%);
            `;

            // Long rectangle tail (perpendicular to direction of travel)
            // This extends along the normal axis (left-right from particle's POV)
            this.tail = document.createElement('div');
            this.tail.className = 'chaser-tail';
            this.tail.style.cssText = `
                position: absolute;
                width: ${tailLength}px;
                height: ${size/3}px;
                background: linear-gradient(90deg, transparent, ${colorSecondary} 20%, ${color} 50%, ${colorSecondary} 80%, transparent);
                transform: translate(-50%, -50%) rotateY(90deg);
                opacity: 0.85;
                box-shadow: 0 0 ${size/3}px ${colorSecondary};
            `;

            this.container.appendChild(this.head);
            this.container.appendChild(this.tail);

            // Add to scene
            const scene = document.getElementById('scene');
            if (scene) {
                scene.appendChild(this.container);
            }

            this.t = 0;
            this._lastTime = performance.now();
        },

        _destroy() {
            if (this.container?.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            this.container = null;
            this.head = null;
            this.tail = null;
        },

        _rebuild() {
            if (!this.container) return;
            const savedT = this.t;
            this._destroy();
            this._create();
            this.t = savedT;
        },

        /**
         * Update particle position - called from animation loop
         * @param {number} deltaMs - Time since last frame
         */
        update(deltaMs) {
            if (!this.container) return;

            const chaserState = APP.State.select('chaser');
            if (!chaserState?.enabled) return;

            // Check if we have a closed loop track
            const track = APP.Scene?.track;
            const trackState = APP.State.select('track');
            if (!track || !trackState?.enabled) {
                this.container.style.display = 'none';
                return;
            }

            // Only run on closed loops
            const presetInfo = APP.TrackPresets?.getInfo(trackState.preset);
            if (!presetInfo?.closed) {
                this.container.style.display = 'none';
                return;
            }

            this.container.style.display = 'block';

            // Get speed settings (similar to track rotation)
            const speed = chaserState.speed ?? 50;
            const direction = chaserState.direction ?? 1;
            const syncBpm = chaserState.syncBpm ?? true;

            const range = track.getParameterRange();
            const tRange = range.max - range.min;

            let loopsPerSecond;
            if (syncBpm) {
                // BPM-synced: speed 50 = 1 loop per 4 beats
                const pps = APP.State.select('animation.pps') || 1.0;
                const speedFactor = speed / 50;
                loopsPerSecond = (pps / 4) * speedFactor;
            } else {
                // Free mode: speed directly controls loops per second (0-100 → 0-2 loops/sec)
                loopsPerSecond = (speed / 100) * 2;
            }

            // Advance t with direction (positive = forward, negative = reverse)
            this.t += direction * (deltaMs / 1000) * loopsPerSecond * tRange;

            // Wrap around for closed loop
            while (this.t >= range.max) {
                this.t -= tRange;
            }
            while (this.t < range.min) {
                this.t += tRange;
            }

            // Get position and frame on track
            const pos = track.getPoint(this.t);
            const frame = track.getFrame(this.t);

            // Store for follow cam
            this.currentPos = pos;
            this.currentFrame = frame;

            // Hide particle when in follow mode (we're riding inside it)
            const followMode = APP.State.select('chaser.follow');
            this.container.style.opacity = followMode ? '0' : '1';

            // Convert frame to euler angles for CSS transform
            const stabilize = APP.State.select('chaser.stabilize');
            const euler = stabilize ? this._frameToEulerStabilized(frame) : this._frameToEuler(frame);

            // Apply transform directly - CSS transition handles smoothing
            this.container.style.transform = `
                translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px)
                rotateX(${euler.x}deg)
                rotateY(${euler.y}deg)
                rotateZ(${euler.z}deg)
            `;
        },

        /**
         * Convert Frenet frame to Euler angles (full rotation with roll)
         */
        _frameToEuler(frame) {
            const t = frame.tangent;
            const n = frame.normal;
            const b = frame.binormal;

            // Build rotation matrix from frame vectors
            // tangent = forward (Z), normal = right (X), binormal = up (Y)
            const m00 = n.x, m01 = b.x, m02 = t.x;
            const m10 = n.y, m11 = b.y, m12 = t.y;
            const m20 = n.z, m21 = b.z, m22 = t.z;

            // Extract Euler angles (XYZ order)
            let x, y, z;

            if (Math.abs(m02) < 0.9999) {
                y = Math.asin(-Math.max(-1, Math.min(1, m02)));
                x = Math.atan2(m12, m22);
                z = Math.atan2(m01, m00);
            } else {
                // Gimbal lock
                y = m02 > 0 ? -Math.PI / 2 : Math.PI / 2;
                x = Math.atan2(-m21, m11);
                z = 0;
            }

            return {
                x: x * 180 / Math.PI,
                y: y * 180 / Math.PI,
                z: z * 180 / Math.PI
            };
        },

        /**
         * Convert Frenet frame to Euler angles - stabilized (no roll)
         * Keeps the chaser level while following the tangent direction
         */
        _frameToEulerStabilized(frame) {
            const t = frame.tangent;

            // Calculate yaw (rotation around Y axis) from tangent
            const yaw = Math.atan2(t.x, t.z) * 180 / Math.PI;

            // Calculate pitch (rotation around X axis) from tangent
            const horizontalDist = Math.sqrt(t.x * t.x + t.z * t.z);
            const pitch = -Math.atan2(t.y, horizontalDist) * 180 / Math.PI;

            // No roll - keep level
            return {
                x: pitch,
                y: yaw,
                z: 0
            };
        },

        /**
         * Reset position to start of track
         */
        reset() {
            this.t = 0;
        }
    };

})(window.APP);
