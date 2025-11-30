/**
 * KeyboardInput - Keyboard input source for parameter control
 * Emits key events to InputHub for mapping to parameters
 * Supports both discrete (keydown) and continuous (hold) modes
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.KeyboardInput = {
        _heldKeys: new Map(),  // key -> { startTime, value }
        _enabled: true,

        init() {
            this._setupListeners();
            this._subscribe();
        },

        _setupListeners() {
            // Don't capture keys when typing in inputs
            const isTyping = (e) => {
                const tag = e.target.tagName.toLowerCase();
                return tag === 'input' || tag === 'textarea' || tag === 'select' ||
                       e.target.isContentEditable;
            };

            document.addEventListener('keydown', (e) => {
                if (!this._enabled || isTyping(e)) return;

                const key = e.code; // e.g., 'KeyA', 'ArrowUp', 'Space'

                // Emit discrete event (for increment/toggle)
                APP.InputHub?.emit('keyboard', 'discrete', key, 1, {
                    key: e.key,
                    code: e.code,
                    shift: e.shiftKey,
                    ctrl: e.ctrlKey,
                    alt: e.altKey
                });

                // Track for hold mode (continuous)
                if (!this._heldKeys.has(key)) {
                    this._heldKeys.set(key, {
                        startTime: performance.now(),
                        value: 0
                    });
                }
            });

            document.addEventListener('keyup', (e) => {
                if (!this._enabled) return;

                const key = e.code;

                // Remove from held keys
                this._heldKeys.delete(key);

                // Emit release for hold mode (value = 0)
                APP.InputHub?.emit('keyboard', 'continuous', `hold:${key}`, 0, {
                    key: e.key,
                    code: e.code
                });
            });

            // Clear held keys when window loses focus
            window.addEventListener('blur', () => {
                this._heldKeys.clear();
            });
        },

        /**
         * Update held keys (call from animation loop)
         * Generates continuous values for held keys
         */
        update(deltaTime) {
            if (!this._enabled) return;

            const now = performance.now();

            this._heldKeys.forEach((data, key) => {
                // Calculate hold duration
                const holdDuration = (now - data.startTime) / 1000; // seconds

                // Value ramps up over time (0 to 1 over 1 second, then stays at 1)
                // This allows held keys to act like continuous inputs
                const value = Math.min(1, holdDuration);

                // Emit continuous event for hold mode
                APP.InputHub?.emit('keyboard', 'continuous', `hold:${key}`, value, {
                    code: key,
                    holdDuration
                });
            });
        },

        /**
         * Check if a key is currently held
         */
        isKeyHeld(keyCode) {
            return this._heldKeys.has(keyCode);
        },

        /**
         * Get list of currently held keys
         */
        getHeldKeys() {
            return Array.from(this._heldKeys.keys());
        },

        /**
         * Enable/disable keyboard input
         */
        setEnabled(enabled) {
            this._enabled = enabled;
            if (!enabled) {
                this._heldKeys.clear();
            }
        },

        _subscribe() {
            APP.State?.subscribe('keyboard.enabled', (enabled) => {
                this.setEnabled(enabled);
            });
        },

        /**
         * Get human-readable key name
         */
        getKeyName(code) {
            const names = {
                'Space': 'Space',
                'ArrowUp': 'Up',
                'ArrowDown': 'Down',
                'ArrowLeft': 'Left',
                'ArrowRight': 'Right',
                'Enter': 'Enter',
                'Escape': 'Esc',
                'Backspace': 'Backspace',
                'Tab': 'Tab',
                'ShiftLeft': 'L-Shift',
                'ShiftRight': 'R-Shift',
                'ControlLeft': 'L-Ctrl',
                'ControlRight': 'R-Ctrl',
                'AltLeft': 'L-Alt',
                'AltRight': 'R-Alt'
            };

            if (names[code]) return names[code];

            // KeyA -> A, Digit1 -> 1, etc.
            if (code.startsWith('Key')) return code.slice(3);
            if (code.startsWith('Digit')) return code.slice(5);

            return code;
        }
    };

})(window.APP);
