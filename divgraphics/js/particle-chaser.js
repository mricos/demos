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
        t: 0,              // Current position parameter on track (arc-length normalized)
        _lastTime: 0,
        _arcLengthTable: null,  // Cached arc-length lookup table
        _tableTrackId: null,    // Track ID for cache invalidation

        // Smoothed rotation state
        _smoothedEuler: null,   // Current smoothed rotation { x, y, z }

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
            APP.State.subscribe('chaser.*', (val, state, meta) => {
                // Only rebuild for appearance properties, not speed/direction
                const path = meta.path;
                if (path.includes('speed') || path.includes('direction') ||
                    path.includes('syncBpm') || path.includes('enabled') ||
                    path.includes('follow') || path.includes('stabilize')) {
                    return;
                }
                this._rebuild();
            });
        },

        _create() {
            if (this.container) return; // Already exists

            const state = APP.State.select('chaser');
            const size = state?.size || 17;
            const headShape = state?.headShape || 'square';
            const headRoundness = (state?.headRoundness ?? 0) / 100;
            const headOpacity = (state?.headOpacity ?? 100) / 100;
            // Body (wings - perpendicular to travel)
            const bodyLength = state?.bodyLength || 54;
            const bodyWidth = ((state?.bodyWidth ?? 33) / 100) * size;
            const bodyAngle = state?.bodyAngle ?? 90;  // 0 = knife, 90 = flat wing
            const bodyOpacity = (state?.bodyOpacity ?? 85) / 100;
            const bodyStyle = state?.bodyStyle || 'gradient';
            // Tail/Exhaust (extends from back of body)
            const tailLength = state?.tailLength || 40;
            const tailWidth = ((state?.tailWidth ?? 25) / 100) * size;
            const tailOpacity = (state?.tailOpacity ?? 70) / 100;
            const tailStyle = state?.tailStyle || 'gradient';
            // Glow
            const glowSize = ((state?.glowSize ?? 50) / 100) * size;
            const glowIntensity = (state?.glowIntensity ?? 50) / 100;
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

            // Head shape styles
            let headBorderRadius = '0';
            let headTransform = 'translate(-50%, -50%)';
            if (headShape === 'circle') {
                headBorderRadius = '50%';
            } else if (headShape === 'diamond') {
                headTransform = 'translate(-50%, -50%) rotate(45deg)';
            } else if (headShape === 'square' && headRoundness > 0) {
                headBorderRadius = `${headRoundness * 50}%`;
            }

            // Glow box-shadow
            const glowShadow = glowIntensity > 0
                ? `0 0 ${glowSize}px ${color}, 0 0 ${glowSize * 1.5}px ${colorSecondary}`
                : 'none';

            // Head element
            this.head = document.createElement('div');
            this.head.className = 'chaser-head';
            this.head.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border-radius: ${headBorderRadius};
                box-shadow: ${glowShadow};
                transform: ${headTransform};
                opacity: ${headOpacity};
            `;

            // Helper to get background based on style
            const getBackground = (style) => {
                if (style === 'solid') return color;
                if (style === 'glow') return `radial-gradient(ellipse at center, ${color} 0%, ${colorSecondary} 40%, transparent 70%)`;
                // gradient (default)
                return `linear-gradient(90deg, transparent, ${colorSecondary} 20%, ${color} 50%, ${colorSecondary} 80%, transparent)`;
            };

            const partGlow = glowIntensity > 0
                ? `0 0 ${glowSize * 0.5}px ${colorSecondary}`
                : 'none';

            // Body element (wings - perpendicular to travel)
            // Angle: 0 = knife edge (rotateX 90), 90 = flat wing (rotateX 0)
            const bodyRotateX = 90 - bodyAngle;
            this.body = document.createElement('div');
            this.body.className = 'chaser-body';
            this.body.style.cssText = `
                position: absolute;
                width: ${bodyLength}px;
                height: ${bodyWidth}px;
                background: ${getBackground(bodyStyle)};
                transform: translate(-50%, -50%) rotateY(90deg) rotateX(${bodyRotateX}deg);
                opacity: ${bodyOpacity};
                box-shadow: ${partGlow};
                border-radius: ${bodyWidth / 2}px;
                transform-style: preserve-3d;
            `;

            // Tail/Exhaust element - extends from back of body like exhaust
            // Position at the back edge of the body, extending backward
            const tailOffsetY = bodyWidth / 2;  // Start at back edge of body
            this.tail = document.createElement('div');
            this.tail.className = 'chaser-tail';
            this.tail.style.cssText = `
                position: absolute;
                width: ${tailWidth}px;
                height: ${tailLength}px;
                background: ${getBackground(tailStyle)};
                transform: translate(-50%, 0) translateY(${tailOffsetY}px);
                transform-origin: center top;
                opacity: ${tailOpacity};
                box-shadow: ${partGlow};
                border-radius: ${tailWidth / 2}px;
            `;

            this.container.appendChild(this.head);
            if (bodyLength > 0) {
                this.container.appendChild(this.body);
            }
            if (tailLength > 0) {
                this.container.appendChild(this.tail);
            }

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
            this.body = null;
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

            // Build/rebuild arc-length table if needed (cache by track preset)
            const trackId = trackState.preset + '_' + (trackState.tension || 0.5);
            if (!this._arcLengthTable || this._tableTrackId !== trackId) {
                const result = this._buildArcLengthTable(track, 300);
                this._arcLengthTable = result.table;
                this._tableTrackId = trackId;
            }

            // Get speed settings (similar to track rotation)
            const speed = chaserState.speed ?? 50;
            const direction = chaserState.direction ?? 1;
            const syncBpm = chaserState.syncBpm ?? true;

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

            // Advance normalized position (0-1) with direction
            // this.t is now normalized arc-length, not raw track parameter
            this.t += direction * (deltaMs / 1000) * loopsPerSecond;

            // Wrap around for closed loop (0-1 range)
            while (this.t >= 1) {
                this.t -= 1;
            }
            while (this.t < 0) {
                this.t += 1;
            }

            // Convert arc-length position to track parameter
            const trackT = this._arcLengthToT(this.t, this._arcLengthTable);

            // Get position and frame on track using the corrected parameter
            const pos = track.getPoint(trackT);
            const frame = track.getFrame(trackT);

            // Store for follow cam
            this.currentPos = pos;
            this.currentFrame = frame;

            // Hide particle when in follow mode (we're riding inside it)
            const followMode = APP.State.select('chaser.follow');
            this.container.style.opacity = followMode ? '0' : '1';

            // Convert frame to euler angles for CSS transform
            const stabilize = APP.State.select('chaser.stabilize');
            const targetEuler = stabilize ? this._frameToEulerStabilized(frame) : this._frameToEuler(frame);

            // Apply rotation smoothing
            const smoothing = chaserState.smoothing ?? 50;
            const euler = this._smoothRotation(targetEuler, deltaMs, smoothing);

            // Apply transform
            this.container.style.transform = `
                translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px)
                rotateX(${euler.x}deg)
                rotateY(${euler.y}deg)
                rotateZ(${euler.z}deg)
            `;
        },

        /**
         * Smoothly interpolate rotation towards target
         * @param {Object} target - Target euler angles { x, y, z }
         * @param {number} deltaMs - Time delta in ms
         * @param {number} smoothing - 0-100 smoothing amount
         * @returns {Object} Smoothed euler angles
         */
        _smoothRotation(target, deltaMs, smoothing) {
            // Initialize smoothed state if needed
            if (!this._smoothedEuler) {
                this._smoothedEuler = { ...target };
                return target;
            }

            // smoothing 0 = instant (alpha = 1)
            // smoothing 100 = very smooth (alpha approaches 0)
            // Convert to time constant: higher smoothing = slower response
            const tau = 10 + (smoothing / 100) * 200; // 10-210ms time constant
            const alpha = 1 - Math.exp(-deltaMs / tau);

            // Lerp each angle, handling wraparound for yaw (Y axis)
            this._smoothedEuler.x = this._lerpAngle(this._smoothedEuler.x, target.x, alpha);
            this._smoothedEuler.y = this._lerpAngle(this._smoothedEuler.y, target.y, alpha);
            this._smoothedEuler.z = this._lerpAngle(this._smoothedEuler.z, target.z, alpha);

            return this._smoothedEuler;
        },

        /**
         * Lerp between angles, taking the shortest path
         */
        _lerpAngle(from, to, alpha) {
            let diff = to - from;

            // Normalize to [-180, 180]
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;

            return from + diff * alpha;
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
        },

        /**
         * Build arc-length lookup table for uniform speed
         * Maps normalized distance (0-1) to track parameter t
         */
        _buildArcLengthTable(track, samples = 200) {
            const range = track.getParameterRange();
            const tMin = range.min;
            const tMax = range.max;
            const tRange = tMax - tMin;

            const table = [{ s: 0, t: tMin }];
            let totalLength = 0;
            let prevPoint = track.getPoint(tMin);

            for (let i = 1; i <= samples; i++) {
                const t = tMin + (tRange * i / samples);
                const point = track.getPoint(t);

                // Accumulate distance
                const dx = point.x - prevPoint.x;
                const dy = point.y - prevPoint.y;
                const dz = point.z - prevPoint.z;
                totalLength += Math.sqrt(dx * dx + dy * dy + dz * dz);

                table.push({ s: totalLength, t: t });
                prevPoint = point;
            }

            // Normalize distances to 0-1
            for (let i = 0; i < table.length; i++) {
                table[i].s /= totalLength;
            }

            return { table, totalLength };
        },

        /**
         * Convert normalized arc-length (0-1) to track parameter t
         * Uses binary search for efficiency
         */
        _arcLengthToT(s, table) {
            // Clamp s to [0, 1]
            s = Math.max(0, Math.min(1, s));

            // Binary search
            let low = 0;
            let high = table.length - 1;

            while (low < high - 1) {
                const mid = Math.floor((low + high) / 2);
                if (table[mid].s < s) {
                    low = mid;
                } else {
                    high = mid;
                }
            }

            // Linear interpolation between low and high
            const s0 = table[low].s;
            const s1 = table[high].s;
            const t0 = table[low].t;
            const t1 = table[high].t;

            if (s1 === s0) return t0;

            const alpha = (s - s0) / (s1 - s0);
            return t0 + alpha * (t1 - t0);
        }
    };

})(window.APP);
