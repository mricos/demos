/**
 * DivGraphics - Collision Detection Module
 * Detects chaser-to-curve collisions and outputs:
 * - Continuous values (proximity, penetration) for LFO-like modulation
 * - Trigger events for audio/visual feedback
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.Collision = {
        // Output values (0-1 range, usable like LFOs)
        proximity: 0,        // 1 = touching, 0 = far away
        penetration: 0,      // How deep into collision (0-1)
        nearestFaceIndex: -1,

        // Trigger state
        _wasColliding: false,
        _lastTriggerTime: 0,
        _triggerCooldown: 50, // ms between triggers

        // Config
        _enabled: true,
        _maxDistance: 200,   // Distance at which proximity = 0

        // Event handlers
        handlers: {
            trigger: [],
            enter: [],
            exit: []
        },

        init() {
            this._subscribe();
        },

        _subscribe() {
            // Could subscribe to state changes here if needed
        },

        /**
         * Subscribe to collision events
         * @param {string} event - 'trigger', 'enter', or 'exit'
         * @param {Function} handler - Callback(data)
         */
        on(event, handler) {
            if (this.handlers[event]) {
                this.handlers[event].push(handler);
            }
            return this;
        },

        off(event, handler) {
            if (!this.handlers[event]) return this;
            const idx = this.handlers[event].indexOf(handler);
            if (idx > -1) this.handlers[event].splice(idx, 1);
            return this;
        },

        _emit(event, data) {
            if (this.handlers[event]) {
                this.handlers[event].forEach(h => h(data));
            }
        },

        /**
         * Update collision detection (call from animation loop)
         */
        update() {
            if (!this._enabled) return;

            const chaser = APP.ParticleChaser;
            if (!chaser?.currentPos) {
                this.proximity = 0;
                this.penetration = 0;
                return;
            }

            // Get curve from scene (single curve or array)
            const curve = APP.Scene?.curve;
            const curves = curve ? [curve] : (APP.Scene?.curves || []);
            if (!curves.length) {
                this.proximity = 0;
                this.penetration = 0;
                return;
            }

            const chaserState = APP.State?.select('chaser');
            const chaserRadius = (chaserState?.size || 17) / 2;
            const pos = chaser.currentPos;

            let minDist = Infinity;
            let nearestFace = -1;
            let nearestCurve = null;

            // Check all curves
            for (const curve of curves) {
                if (!curve._faces?.length) continue;

                for (let i = 0; i < curve._faces.length; i++) {
                    const face = curve._faces[i];
                    const dx = pos.x - face.x;
                    const dy = pos.y - face.y;
                    const dz = pos.z - face.z;
                    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

                    if (dist < minDist) {
                        minDist = dist;
                        nearestFace = i;
                        nearestCurve = curve;
                    }
                }
            }

            // Calculate outputs
            const faceRadius = 10; // Approximate face collision radius
            const collisionDist = chaserRadius + faceRadius;
            const isColliding = minDist < collisionDist;

            // Proximity: 1 at collision distance, 0 at maxDistance
            this.proximity = Math.max(0, 1 - (minDist - collisionDist) / this._maxDistance);

            // Penetration: 0 when not colliding, increases as chaser goes deeper
            this.penetration = isColliding ? Math.min(1, (collisionDist - minDist) / collisionDist) : 0;

            this.nearestFaceIndex = nearestFace;

            // Handle triggers
            const now = performance.now();

            if (isColliding && !this._wasColliding) {
                // Collision enter
                this._emit('enter', {
                    faceIndex: nearestFace,
                    curve: nearestCurve,
                    distance: minDist,
                    penetration: this.penetration
                });
            }

            if (!isColliding && this._wasColliding) {
                // Collision exit
                this._emit('exit', {
                    faceIndex: nearestFace
                });
            }

            // Trigger on collision (with cooldown)
            if (isColliding && (now - this._lastTriggerTime) > this._triggerCooldown) {
                this._emit('trigger', {
                    faceIndex: nearestFace,
                    curve: nearestCurve,
                    penetration: this.penetration,
                    velocity: this.penetration // Could compute actual velocity
                });
                this._lastTriggerTime = now;
            }

            this._wasColliding = isColliding;
        },

        /**
         * Get current values as object (for InputHub routing)
         */
        getValues() {
            return {
                proximity: this.proximity,
                penetration: this.penetration,
                isColliding: this._wasColliding ? 1 : 0
            };
        },

        /**
         * Route collision values through InputHub (like LFO)
         * Call this if you want collision to act as an input source
         */
        emitToInputHub() {
            if (!APP.InputHub) return;

            // Emit as continuous values (like MIDI CC)
            APP.InputHub.emit('collision', 'continuous', 'proximity', this.proximity, {
                label: 'Collision Proximity'
            });
            APP.InputHub.emit('collision', 'continuous', 'penetration', this.penetration, {
                label: 'Collision Depth'
            });

            // Emit trigger as discrete
            if (this._wasColliding) {
                APP.InputHub.emit('collision', 'discrete', 'hit', 1, {
                    label: 'Collision Hit'
                });
            }
        }
    };

})(window.APP);
