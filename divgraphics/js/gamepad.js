/**
 * DivGraphics Gamepad Integration
 *
 * Structure:
 *   APP.Gamepad    - Gamepad API wrapper (hardware layer)
 *   APP.Gamepad.UI - DOM controls (presentation layer)
 *
 * Note: Binding logic now handled by InputHub
 */
window.APP = window.APP || {};

// ============================================================================
// Gamepad - Gamepad API wrapper
// ============================================================================
(function(APP) {
    'use strict';

    APP.Gamepad = {
        gamepads: [],
        activeGamepad: null,
        polling: false,
        pollInterval: null,

        // Deadzone for analog sticks (loaded from config)
        deadzone: null,

        // Track previous state for change detection
        prevAxes: [],
        prevButtons: [],

        init() {
            // Initialize event emitter
            this._initEvents(['axis', 'button', 'connect', 'disconnect']);
            this.deadzone = APP.State.defaults.config.gamepadDeadzone;

            window.addEventListener('gamepadconnected', (e) => {
                this._updateGamepads();
                this._emit('connect', e.gamepad);

                // Auto-select if no gamepad currently active
                if (!this.activeGamepad) {
                    this.selectGamepad(e.gamepad.index);
                    // selectGamepad shows its own toast
                } else {
                    // Multiple gamepads: inform user another is available
                    APP.Toast.gamepad(`${e.gamepad.id.split('(')[0].trim()} available`);
                }
            });

            window.addEventListener('gamepaddisconnected', (e) => {
                this._updateGamepads();
                this._emit('disconnect', e.gamepad);
                APP.Toast.gamepad(`${e.gamepad.id.split('(')[0].trim()} disconnected`);

                if (this.activeGamepad?.index === e.gamepad.index) {
                    this.activeGamepad = null;
                    APP.State.dispatch({ type: 'gamepad.device', payload: null });
                }
            });

            // Initial check for already-connected gamepads
            this._updateGamepads();

            // Setup InputHub bridge
            this._setupInputHubBridge();

            return true;
        },

        _updateGamepads() {
            const gps = navigator.getGamepads ? navigator.getGamepads() : [];
            this.gamepads = [];
            for (let i = 0; i < gps.length; i++) {
                if (gps[i]) {
                    this.gamepads.push({
                        index: gps[i].index,
                        id: gps[i].id,
                        name: gps[i].id.split('(')[0].trim()
                    });
                }
            }
        },

        selectGamepad(index, silent = false) {
            this._updateGamepads();
            const gp = this.gamepads.find(g => g.index === index);
            if (!gp) return false;

            this.activeGamepad = gp;
            this.prevAxes = [];
            this.prevButtons = [];

            APP.State.dispatch({ type: 'gamepad.device', payload: { index: gp.index, name: gp.name } });
            if (!silent) APP.Toast.gamepad(`${gp.name} activated`);

            this._startPolling();
            return true;
        },

        disconnect() {
            this._stopPolling();
            this.activeGamepad = null;
            APP.State.dispatch({ type: 'gamepad.device', payload: null });
        },

        _startPolling() {
            if (this.polling) return;
            this.polling = true;
            this._poll();
        },

        _stopPolling() {
            this.polling = false;
            if (this.pollInterval) {
                cancelAnimationFrame(this.pollInterval);
                this.pollInterval = null;
            }
        },

        _poll() {
            if (!this.polling || !this.activeGamepad) return;

            const gps = navigator.getGamepads();
            const gp = gps[this.activeGamepad.index];

            if (gp) {
                // Process axes
                for (let i = 0; i < gp.axes.length; i++) {
                    let value = gp.axes[i];

                    // Apply deadzone
                    if (Math.abs(value) < this.deadzone) {
                        value = 0;
                    }

                    // Only emit on change (with some tolerance)
                    if (Math.abs(value - (this.prevAxes[i] || 0)) > 0.01) {
                        this.prevAxes[i] = value;
                        this._emit('axis', { axis: i, value });
                    }
                }

                // Process buttons
                for (let i = 0; i < gp.buttons.length; i++) {
                    const pressed = gp.buttons[i].pressed;
                    const value = gp.buttons[i].value;

                    if (pressed !== this.prevButtons[i]) {
                        this.prevButtons[i] = pressed;
                        this._emit('button', {
                            button: i,
                            pressed,
                            value,
                            type: pressed ? 'down' : 'up'
                        });
                    }
                }
            }

            this.pollInterval = requestAnimationFrame(() => this._poll());
        },

        /**
         * Bridge Gamepad events to InputHub
         * Note: No throttling needed - polling already rate-limits,
         * and shared throttle state can cross-contaminate axis values
         */
        _setupInputHubBridge() {
            this.on('axis', (data) => {
                const key = `axis:${data.axis}`;
                APP.InputHub.emit('gamepad', 'continuous', key, data.value, {
                    axis: data.axis
                });

                if (APP.State.select('display.gamepadToasts')) {
                    APP.Toast.gamepad(`Axis ${data.axis}: ${data.value.toFixed(2)}`);
                }
            });

            this.on('button', (data) => {
                if (data.type !== 'down') return;
                const key = `button:${data.button}`;
                APP.InputHub.emit('gamepad', 'discrete', key, 1, {
                    button: data.button
                });

                if (APP.State.select('display.gamepadToasts')) {
                    APP.Toast.gamepad(`Button ${data.button}`);
                }
            });
        },

    };

    // Mix in EventEmitter methods
    Object.assign(APP.Gamepad, APP.EventEmitter);

})(window.APP);

// ============================================================================
// Gamepad.UI - DOM controls
// ============================================================================
(function(APP) {
    'use strict';

    APP.Gamepad.UI = {
        elements: {},

        init() {
            this.elements = {
                deviceSelect: document.getElementById('gamepadDevice'),
                clearBtn: document.getElementById('clearGamepadBindingsBtn'),
                gamepadToastsCheckbox: document.getElementById('gamepadToastsEnabled'),
                statusIndicator: document.querySelector('.gamepad-status-indicator'),
                statusText: document.querySelector('.gamepad-status-text')
            };

            this._bindEvents();
            this._subscribe();
            this._reconnectSavedDevice();
            this._render();
        },

        // ================================================================
        // RENDER
        // ================================================================
        _render() {
            this._renderDeviceList();
            this._renderDeviceStatus();
            this._renderGamepadToasts();
        },

        _renderDeviceList() {
            APP.Gamepad._updateGamepads();
            const currentDevice = APP.State.select('gamepad.device');
            APP.HardwareUI.renderDeviceList(
                this.elements.deviceSelect,
                APP.Gamepad.gamepads,
                currentDevice?.name,
                'index'
            );
        },

        _renderDeviceStatus() {
            const { statusIndicator } = this.elements;
            const device = APP.State.select('gamepad.device');
            const isConnected = device?.name && APP.Gamepad.activeGamepad;
            const wasConnected = statusIndicator?.classList.contains('connected');

            APP.HardwareUI.renderStatus(
                statusIndicator,
                this.elements.statusText,
                isConnected
            );

            // Trigger burst animation on new connection (gamepad-specific)
            if (isConnected && !wasConnected) {
                const statusContainer = statusIndicator?.closest('.gamepad-status');
                if (statusContainer) {
                    statusContainer.classList.add('just-connected');
                    setTimeout(() => statusContainer.classList.remove('just-connected'), 800);
                }
            }
        },

        _renderGamepadToasts() {
            APP.HardwareUI.syncToastsCheckbox(
                this.elements.gamepadToastsCheckbox,
                'display.gamepadToasts'
            );
        },

        // ================================================================
        // EVENTS
        // ================================================================
        _bindEvents() {
            const { deviceSelect, clearBtn, gamepadToastsCheckbox } = this.elements;

            if (deviceSelect) {
                deviceSelect.addEventListener('change', () => {
                    if (deviceSelect.value !== '') {
                        APP.Gamepad.selectGamepad(parseInt(deviceSelect.value));
                    } else {
                        APP.Gamepad.disconnect();
                    }
                });
            }

            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    APP.InputHub.clearMapsForSource('gamepad');
                });
            }

            if (gamepadToastsCheckbox) {
                gamepadToastsCheckbox.addEventListener('change', () => {
                    APP.State.dispatch({ type: 'display.gamepadToasts', payload: gamepadToastsCheckbox.checked });
                });
            }

            APP.Gamepad.on('connect', () => this._render());
            APP.Gamepad.on('disconnect', () => this._render());
        },

        // ================================================================
        // SUBSCRIBE
        // ================================================================
        _subscribe() {
            APP.State.subscribe('gamepad.*', () => this._render());
            APP.State.subscribe('display.gamepadToasts', () => this._renderGamepadToasts());
        },

        // ================================================================
        // RECONNECT
        // ================================================================
        _reconnectSavedDevice() {
            const savedDevice = APP.State.select('gamepad.device');
            if (savedDevice?.name) {
                APP.Gamepad._updateGamepads();
                const match = APP.Gamepad.gamepads.find(g => g.name === savedDevice.name);
                if (match) {
                    APP.Gamepad.selectGamepad(match.index, true);
                    APP.Toast.gamepad(`Reconnected to ${match.name}`);
                }
            }
        }
    };

})(window.APP);
