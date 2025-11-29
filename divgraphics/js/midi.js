/**
 * DivGraphics MIDI Integration
 *
 * Structure:
 *   APP.MIDI       - Web MIDI API wrapper (hardware layer)
 *   APP.MIDI.Learn - CC/Note binding logic (business logic)
 *   APP.MIDI.UI    - DOM controls (presentation layer)
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
        handlers: { cc: [], note: [], connect: [], disconnect: [], error: [] },

        async init() {
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

        on(event, handler) {
            if (!this.handlers[event]) this.handlers[event] = [];
            this.handlers[event].push(handler);
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
        }
    };

})(window.APP);

// ============================================================================
// MIDI.Learn - CC/Note binding logic
// ============================================================================
(function(APP) {
    'use strict';

    APP.MIDI.Learn = {
        targetElement: null,

        // Element ID → State path mapping
        pathMap: {
            outerRadius: 'outer.radius',
            outerHeight: 'outer.height',
            outerRadialSegments: 'outer.radialSegments',
            outerHeightSegments: 'outer.heightSegments',
            outerColor: 'outer.color',
            outerColorSecondary: 'outer.colorSecondary',
            outerWireframe: 'outer.wireframe',
            innerRadius: 'inner.radius',
            innerHeight: 'inner.height',
            innerRadialSegments: 'inner.radialSegments',
            innerHeightSegments: 'inner.heightSegments',
            innerColor: 'inner.color',
            innerColorSecondary: 'inner.colorSecondary',
            innerWireframe: 'inner.wireframe',
            innerEnabled: 'inner.enabled',
            autoRotate: 'scene.autoRotate'
        },

        init() {
            this._setupMIDIHandlers();
            this._setupClickHandler();
            this._subscribe();
            this._render();
        },

        // ================================================================
        // RENDER
        // ================================================================
        _render() {
            this._renderLearnModeState();
            this._renderBoundControls();
            this._renderBindingCount();
        },

        _renderLearnModeState() {
            const learnMode = APP.State.select('midi.learnMode');
            document.body.classList.toggle('learn-mode-active', learnMode);
        },

        _renderBoundControls() {
            document.querySelectorAll('.bound').forEach(el => el.classList.remove('bound'));
            const bindings = APP.State.select('midi.bindings') || {};
            Object.values(bindings).forEach(binding => {
                const el = document.getElementById(binding.elementId);
                if (el) el.closest('.control-group')?.classList.add('bound');
            });
        },

        _renderBindingCount() {
            const bindings = APP.State.select('midi.bindings') || {};
            const countEl = document.getElementById('bindingCount');
            if (countEl) countEl.textContent = Object.keys(bindings).length;
        },

        // ================================================================
        // MIDI MESSAGE HANDLERS
        // ================================================================
        _setupMIDIHandlers() {
            const throttledApply = APP.Utils.throttle((key, value) => {
                this._applyBinding(key, value);
            }, 16);

            APP.MIDI.on('cc', (data) => {
                const key = `cc:${data.channel}:${data.controller}`;
                const learnMode = APP.State.select('midi.learnMode');

                if (learnMode && this.targetElement) {
                    this._createBinding(key, data);
                } else {
                    throttledApply(key, data.value);
                }

                if (APP.State.select('display.midiToasts')) {
                    APP.Toast.midi(`CC ${data.controller}: ${data.value}`);
                }
            });

            APP.MIDI.on('note', (data) => {
                if (data.type !== 'on') return;
                const key = `note:${data.channel}:${data.note}`;
                const learnMode = APP.State.select('midi.learnMode');

                if (learnMode && this.targetElement) {
                    this._createBinding(key, { value: data.velocity });
                } else {
                    this._applyBinding(key, data.velocity);
                }
            });
        },

        // ================================================================
        // CLICK HANDLER (Learn target selection)
        // ================================================================
        _setupClickHandler() {
            document.addEventListener('click', (e) => {
                if (!APP.State.select('midi.learnMode')) return;

                const controlGroup = e.target.closest('.control-group');
                if (!controlGroup) return;

                const input = controlGroup.querySelector('input:not([type="checkbox"]), input[type="range"], input[type="color"]');
                if (!input) return;

                document.querySelectorAll('.learn-target').forEach(el => el.classList.remove('learn-target'));

                this.targetElement = input;
                controlGroup.classList.add('learn-target');
                APP.Toast.info(`Move MIDI control for: ${input.id}`);

                e.preventDefault();
                e.stopPropagation();
            });
        },

        // ================================================================
        // SUBSCRIBE
        // ================================================================
        _subscribe() {
            APP.State.subscribe('midi.learnMode', (enabled) => {
                this._renderLearnModeState();
                if (!enabled && this.targetElement) {
                    this.targetElement.closest('.control-group')?.classList.remove('learn-target');
                    this.targetElement = null;
                }
                if (enabled) {
                    APP.Toast.info('Learn mode: click a control');
                }
            });

            APP.State.subscribe('midi.bindings', () => {
                this._renderBoundControls();
                this._renderBindingCount();
            });
        },

        // ================================================================
        // BINDING LOGIC
        // ================================================================
        _createBinding(midiKey, data) {
            const element = this.targetElement;
            const controlGroup = element.closest('.control-group');

            const path = this.pathMap[element.id];
            if (!path) {
                APP.Toast.info(`Cannot bind: ${element.id}`);
                return;
            }

            const binding = {
                path,
                elementId: element.id,
                elementType: element.type,
                min: parseFloat(element.min) || 0,
                max: parseFloat(element.max) || 1
            };

            const bindings = { ...APP.State.select('midi.bindings') };

            // Remove existing binding for this element
            Object.keys(bindings).forEach(key => {
                if (bindings[key]?.elementId === element.id) {
                    delete bindings[key];
                }
            });

            bindings[midiKey] = binding;
            APP.State.dispatch({ type: 'midi.bindings', payload: bindings });

            controlGroup.classList.remove('learn-target');
            controlGroup.classList.add('learn-success');
            setTimeout(() => controlGroup.classList.remove('learn-success'), 300);

            this.targetElement = null;
            APP.Toast.success(`Bound: ${midiKey} → ${path}`);
        },

        _applyBinding(midiKey, value) {
            const bindings = APP.State.select('midi.bindings');
            const binding = bindings?.[midiKey];
            if (!binding) return;

            let dispatchValue;

            switch (binding.elementType) {
                case 'range':
                    dispatchValue = Math.round(binding.min + (value / 127) * (binding.max - binding.min));
                    break;
                case 'checkbox':
                    dispatchValue = value > 64;
                    break;
                case 'color':
                    dispatchValue = this._hslToHex((value / 127) * 360, 100, 50);
                    break;
                default:
                    dispatchValue = value;
            }

            APP.State.dispatch({ type: binding.path, payload: dispatchValue });
        },

        _hslToHex(h, s, l) {
            s /= 100; l /= 100;
            const a = s * Math.min(l, 1 - l);
            const f = n => {
                const k = (n + h / 30) % 12;
                const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                return Math.round(255 * c).toString(16).padStart(2, '0');
            };
            return `#${f(0)}${f(8)}${f(4)}`;
        }
    };

})(window.APP);

// ============================================================================
// MIDI.UI - DOM controls (Strict Unidirectional Data Flow)
// ============================================================================
(function(APP) {
    'use strict';

    APP.MIDI.UI = {
        elements: {},

        init() {
            this.elements = {
                deviceSelect: document.getElementById('midiDevice'),
                learnCheckbox: document.getElementById('learnMode'),
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
        // RENDER - Single place that updates DOM from state
        // ================================================================
        _render() {
            this._renderDeviceList();
            this._renderDeviceStatus();
            this._renderLearnMode();
            this._renderMidiToasts();
        },

        _renderDeviceList() {
            const { deviceSelect } = this.elements;
            if (!deviceSelect) return;

            const currentDevice = APP.State.select('midi.device');

            deviceSelect.innerHTML = '<option value="">Select device...</option>';
            APP.MIDI.inputs.forEach(input => {
                const opt = document.createElement('option');
                opt.value = input.id;
                opt.textContent = input.name || input.id;
                deviceSelect.appendChild(opt);
            });

            if (currentDevice?.name) {
                const match = APP.MIDI.inputs.find(i => i.name === currentDevice.name);
                if (match) deviceSelect.value = match.id;
            }
        },

        _renderDeviceStatus() {
            const { statusIndicator, statusText } = this.elements;
            const device = APP.State.select('midi.device');
            const isConnected = device?.name && APP.MIDI.activeInput;

            if (statusIndicator) statusIndicator.classList.toggle('connected', isConnected);
            if (statusText) statusText.textContent = isConnected ? 'Connected' : 'Disconnected';
        },

        _renderLearnMode() {
            const { learnCheckbox } = this.elements;
            if (!learnCheckbox) return;

            learnCheckbox.checked = APP.State.select('midi.learnMode');
            learnCheckbox.disabled = !APP.MIDI.activeInput;
        },

        _renderMidiToasts() {
            const { midiToastsCheckbox } = this.elements;
            if (!midiToastsCheckbox) return;
            midiToastsCheckbox.checked = APP.State.select('display.midiToasts');
        },

        // ================================================================
        // EVENTS - Dispatch only, no DOM manipulation
        // ================================================================
        _bindEvents() {
            const { deviceSelect, learnCheckbox, clearBtn, midiToastsCheckbox } = this.elements;

            if (deviceSelect) {
                deviceSelect.addEventListener('change', () => {
                    if (deviceSelect.value) {
                        APP.MIDI.selectInput(deviceSelect.value);
                    } else {
                        APP.MIDI.disconnect();
                    }
                });
            }

            if (learnCheckbox) {
                learnCheckbox.addEventListener('change', () => {
                    APP.State.dispatch({ type: 'midi.learnMode', payload: learnCheckbox.checked });
                });
            }

            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    APP.State.dispatch({ type: 'midi.bindings', payload: {} });
                    APP.Toast.info('Bindings cleared');
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
        // SUBSCRIBE - Re-render when relevant state changes
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

    // Auto-init after main app
    document.addEventListener('DOMContentLoaded', async () => {
        setTimeout(async () => {
            const success = await APP.MIDI.init();
            if (success) {
                APP.MIDI.Learn.init();
                APP.MIDI.UI.init();
            }
        }, 100);
    });

})(window.APP);
