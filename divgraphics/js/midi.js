/**
 * DivGraphics MIDI Integration
 *
 * Structure:
 *   APP.MIDI    - Web MIDI API wrapper (hardware layer)
 *   APP.MIDI.UI - DOM controls (presentation layer)
 *
 * Note: Binding logic now handled by InputHub
 */
window.APP = window.APP || {};

// ============================================================================
// MIDI - Web MIDI API wrapper
// ============================================================================
(function(APP) {
    'use strict';

    APP.MIDI = {
        access: null,
        inputs: [],
        activeInput: null,

        async init() {
            // Initialize event emitter
            this._initEvents(['cc', 'note', 'connect', 'disconnect', 'error']);
            if (!navigator.requestMIDIAccess) {
                this._emit('error', 'Web MIDI API not supported');
                APP.Toast.info('MIDI not supported in this browser');
                return false;
            }

            try {
                this.access = await navigator.requestMIDIAccess();
                this._updateInputs();

                this.access.onstatechange = (e) => {
                    this._updateInputs();
                    if (e.port.state === 'connected') {
                        this._emit('connect', e.port);
                        APP.Toast.success(`MIDI: ${e.port.name} connected`);
                    } else {
                        this._emit('disconnect', e.port);
                        APP.Toast.info(`MIDI: ${e.port.name} disconnected`);
                    }
                };

                // Setup handlers to emit to InputHub
                this._setupInputHubBridge();

                return true;
            } catch (err) {
                this._emit('error', 'MIDI access denied');
                APP.Toast.info('MIDI access denied');
                return false;
            }
        },

        _updateInputs() {
            this.inputs = [];
            if (this.access) {
                this.access.inputs.forEach((input) => {
                    this.inputs.push({ id: input.id, name: input.name, port: input });
                });
            }
        },

        selectInput(id, silent = false) {
            if (this.activeInput) {
                this.activeInput.port.onmidimessage = null;
            }

            const input = this.inputs.find(i => i.id === id);
            if (!input) return false;

            this.activeInput = input;
            input.port.onmidimessage = (e) => this._handleMessage(e);

            APP.State.dispatch({ type: 'midi.device', payload: { id: input.id, name: input.name } });
            if (!silent) APP.Toast.success(`MIDI: ${input.name}`);
            return true;
        },

        disconnect() {
            if (this.activeInput) {
                this.activeInput.port.onmidimessage = null;
                this.activeInput = null;
                APP.State.dispatch({ type: 'midi.device', payload: null });
            }
        },

        _handleMessage(event) {
            const [status, data1, data2] = event.data;
            const channel = (status & 0x0F) + 1;
            const type = status & 0xF0;

            if (type === 0xB0) {
                this._emit('cc', { channel, controller: data1, value: data2 });
            } else if (type === 0x90 && data2 > 0) {
                this._emit('note', { channel, note: data1, velocity: data2, type: 'on' });
            } else if (type === 0x80 || (type === 0x90 && data2 === 0)) {
                this._emit('note', { channel, note: data1, velocity: 0, type: 'off' });
            }
        },

        /**
         * Bridge MIDI events to InputHub
         * Note: No throttling - MIDI hardware already rate-limits,
         * and shared throttle state can cross-contaminate controller values
         */
        _setupInputHubBridge() {
            this.on('cc', (data) => {
                const key = `cc:${data.channel}:${data.controller}`;
                APP.InputHub.emit('midi', 'continuous', key, data.value, {
                    channel: data.channel,
                    controller: data.controller
                });

                if (APP.State.select('display.midiToasts')) {
                    APP.Toast.midi(`CC ${data.controller}: ${data.value}`);
                }
            });

            this.on('note', (data) => {
                if (data.type !== 'on') return;
                const key = `note:${data.channel}:${data.note}`;
                APP.InputHub.emit('midi', 'discrete', key, data.velocity, {
                    channel: data.channel,
                    note: data.note,
                    velocity: data.velocity
                });
            });
        },

    };

    // Mix in EventEmitter methods
    Object.assign(APP.MIDI, APP.EventEmitter);

})(window.APP);

// ============================================================================
// MIDI.UI - DOM controls
// ============================================================================
(function(APP) {
    'use strict';

    APP.MIDI.UI = {
        elements: {},

        init() {
            this.elements = {
                deviceSelect: document.getElementById('midiDevice'),
                clearBtn: document.getElementById('clearBindingsBtn'),
                midiToastsCheckbox: document.getElementById('midiToastsEnabled'),
                statusIndicator: document.querySelector('.midi-status-indicator'),
                statusText: document.querySelector('.midi-status-text')
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
            this._renderMidiToasts();
        },

        _renderDeviceList() {
            const currentDevice = APP.State.select('midi.device');
            APP.HardwareUI.renderDeviceList(
                this.elements.deviceSelect,
                APP.MIDI.inputs,
                currentDevice?.name,
                'id'
            );
        },

        _renderDeviceStatus() {
            const device = APP.State.select('midi.device');
            const isConnected = device?.name && APP.MIDI.activeInput;
            APP.HardwareUI.renderStatus(
                this.elements.statusIndicator,
                this.elements.statusText,
                isConnected
            );
        },

        _renderMidiToasts() {
            APP.HardwareUI.syncToastsCheckbox(
                this.elements.midiToastsCheckbox,
                'display.midiToasts'
            );
        },

        // ================================================================
        // EVENTS
        // ================================================================
        _bindEvents() {
            const { deviceSelect, clearBtn, midiToastsCheckbox } = this.elements;

            if (deviceSelect) {
                deviceSelect.addEventListener('change', () => {
                    if (deviceSelect.value) {
                        APP.MIDI.selectInput(deviceSelect.value);
                    } else {
                        APP.MIDI.disconnect();
                    }
                });
            }

            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    APP.InputHub.clearMapsForSource('midi');
                });
            }

            if (midiToastsCheckbox) {
                midiToastsCheckbox.addEventListener('change', () => {
                    APP.State.dispatch({ type: 'display.midiToasts', payload: midiToastsCheckbox.checked });
                });
            }

            APP.MIDI.on('connect', () => this._render());
            APP.MIDI.on('disconnect', () => this._render());
        },

        // ================================================================
        // SUBSCRIBE
        // ================================================================
        _subscribe() {
            APP.State.subscribe('midi.*', () => this._render());
            APP.State.subscribe('display.midiToasts', () => this._renderMidiToasts());
        },

        // ================================================================
        // RECONNECT
        // ================================================================
        _reconnectSavedDevice() {
            const savedDevice = APP.State.select('midi.device');
            if (savedDevice?.name) {
                const match = APP.MIDI.inputs.find(i => i.name === savedDevice.name);
                if (match) {
                    APP.MIDI.selectInput(match.id, true);
                    APP.Toast.info(`MIDI: Reconnected to ${match.name}`);
                }
            }
        }
    };

})(window.APP);
