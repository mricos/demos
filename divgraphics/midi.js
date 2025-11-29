/**
 * DivGraphics MIDI Integration
 * PState-driven IIFE module bound to window.APP
 */

// ============================================================================
// MIDI Module - Web MIDI API wrapper
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

            // Update state with both id and name for reconnect
            APP.PState.dispatch({ type: 'midi.device', payload: { id: input.id, name: input.name } });
            if (!silent) APP.Toast.success(`MIDI: ${input.name}`);
            return true;
        },

        disconnect() {
            if (this.activeInput) {
                this.activeInput.port.onmidimessage = null;
                this.activeInput = null;
                APP.PState.dispatch({ type: 'midi.device', payload: null });
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
// MIDI Learn Module (PState-driven)
// ============================================================================
(function(APP) {
    'use strict';

    APP.MIDILearn = {
        targetElement: null,
        storageKey: 'divgraphics-midi-bindings',

        init() {
            this._setupClickHandler();

            // Throttled apply binding for smooth MIDI control
            const throttledApply = APP.Utils.throttle((key, value) => {
                this._applyBinding(key, value);
            }, 16);

            APP.MIDI.on('cc', (data) => {
                const key = `cc:${data.channel}:${data.controller}`;
                const learnMode = APP.PState.select('midi.learnMode');

                if (learnMode && this.targetElement) {
                    this._createBinding(key, data);
                } else {
                    throttledApply(key, data.value);
                }

                const showToasts = APP.PState.select('display.midiToasts');
                if (showToasts) {
                    APP.Toast.midi(`CC ${data.controller}: ${data.value}`);
                }
            });

            APP.MIDI.on('note', (data) => {
                if (data.type !== 'on') return;
                const key = `note:${data.channel}:${data.note}`;
                const learnMode = APP.PState.select('midi.learnMode');

                if (learnMode && this.targetElement) {
                    this._createBinding(key, { value: data.velocity });
                } else {
                    this._applyBinding(key, data.velocity);
                }
            });

            // Subscribe to learn mode changes
            APP.PState.subscribe('midi.learnMode', (enabled) => {
                document.body.classList.toggle('learn-mode-active', enabled);

                if (!enabled && this.targetElement) {
                    this.targetElement.closest('.control-group')?.classList.remove('learn-target');
                    this.targetElement = null;
                }

                if (enabled) {
                    APP.Toast.info('Learn mode: click a control');
                }
            });

            // Apply visual indicators for existing bindings
            this._markBoundControls();

            // Subscribe to binding changes to update UI
            APP.PState.subscribe('midi.bindings', () => {
                this._markBoundControls();
                this._updateUI();
            });

            this._updateUI();
        },

        setLearnMode(enabled) {
            APP.PState.dispatch({ type: 'midi.learnMode', payload: enabled });
        },

        _setupClickHandler() {
            document.addEventListener('click', (e) => {
                const learnMode = APP.PState.select('midi.learnMode');
                if (!learnMode) return;

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

        _createBinding(midiKey, data) {
            const element = this.targetElement;
            const controlGroup = element.closest('.control-group');

            // Determine the state path from element ID
            const path = this._elementIdToPath(element.id);
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

            // Get current bindings
            const bindings = { ...APP.PState.select('midi.bindings') };

            // Remove existing binding for this element
            Object.keys(bindings).forEach(key => {
                if (bindings[key]?.elementId === element.id) {
                    delete bindings[key];
                }
            });

            // Add new binding
            bindings[midiKey] = binding;

            // Dispatch to state
            APP.PState.dispatch({ type: 'midi.bindings', payload: bindings });

            controlGroup.classList.remove('learn-target');
            controlGroup.classList.add('bound');
            controlGroup.classList.add('learn-success');
            setTimeout(() => controlGroup.classList.remove('learn-success'), 300);

            this.targetElement = null;

            APP.Toast.success(`Bound: ${midiKey} → ${path}`);
        },

        _elementIdToPath(id) {
            // Map element IDs to state paths
            const mapping = {
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
            };
            return mapping[id] || null;
        },

        _applyBinding(midiKey, value) {
            const bindings = APP.PState.select('midi.bindings');
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

            APP.PState.dispatch({ type: binding.path, payload: dispatchValue });
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
        },

        _markBoundControls() {
            // Clear existing
            document.querySelectorAll('.bound').forEach(el => el.classList.remove('bound'));

            // Mark bound controls
            const bindings = APP.PState.select('midi.bindings') || {};
            Object.values(bindings).forEach(binding => {
                const el = document.getElementById(binding.elementId);
                if (el) el.closest('.control-group')?.classList.add('bound');
            });
        },

        clearBindings() {
            APP.PState.dispatch({ type: 'midi.bindings', payload: {} });
            document.querySelectorAll('.bound').forEach(el => el.classList.remove('bound'));
            APP.Toast.info('Bindings cleared');
        },

        _updateUI() {
            const bindings = APP.PState.select('midi.bindings') || {};
            const countEl = document.getElementById('bindingCount');
            if (countEl) countEl.textContent = Object.keys(bindings).length;
        }
    };

})(window.APP);

// ============================================================================
// MIDI UI Binding
// ============================================================================
(function(APP) {
    'use strict';

    APP._populateMIDIDevices = function() {
        const select = document.getElementById('midiDevice');
        if (!select) return;

        select.innerHTML = '<option value="">Select device...</option>';
        APP.MIDI.inputs.forEach(input => {
            const opt = document.createElement('option');
            opt.value = input.id;
            opt.textContent = input.name || input.id;
            select.appendChild(opt);
        });

        // Restore saved device selection
        const savedDevice = APP.PState.select('midi.device');
        if (savedDevice?.id) {
            const exists = APP.MIDI.inputs.find(i => i.id === savedDevice.id);
            if (exists) {
                select.value = savedDevice.id;
                // Auto-reconnect
                APP.MIDI.selectInput(savedDevice.id, true);
                APP.Toast.info(`MIDI: Reconnected to ${savedDevice.name}`);
                // Update UI
                const statusIndicator = document.querySelector('.midi-status-indicator');
                const statusText = document.querySelector('.midi-status-text');
                const learnCheckbox = document.getElementById('learnMode');
                if (statusIndicator) statusIndicator.classList.add('connected');
                if (statusText) statusText.textContent = 'Connected';
                if (learnCheckbox) learnCheckbox.disabled = false;
            }
        }
    };

    APP._initMIDIUI = function() {
        const deviceSelect = document.getElementById('midiDevice');
        const learnCheckbox = document.getElementById('learnMode');
        const clearBtn = document.getElementById('clearBindingsBtn');
        const midiToastsCheckbox = document.getElementById('midiToastsEnabled');
        const statusIndicator = document.querySelector('.midi-status-indicator');
        const statusText = document.querySelector('.midi-status-text');

        if (deviceSelect) {
            deviceSelect.addEventListener('change', function() {
                if (this.value) {
                    APP.MIDI.selectInput(this.value);
                    if (statusIndicator) statusIndicator.classList.add('connected');
                    if (statusText) statusText.textContent = 'Connected';
                    if (learnCheckbox) learnCheckbox.disabled = false;
                } else {
                    APP.MIDI.disconnect();
                    if (statusIndicator) statusIndicator.classList.remove('connected');
                    if (statusText) statusText.textContent = 'Disconnected';
                    if (learnCheckbox) {
                        learnCheckbox.disabled = true;
                        learnCheckbox.checked = false;
                        APP.MIDILearn.setLearnMode(false);
                    }
                }
            });
        }

        if (learnCheckbox) {
            learnCheckbox.addEventListener('change', function() {
                APP.MIDILearn.setLearnMode(this.checked);
            });

            // Sync from state
            APP.PState.subscribe('midi.learnMode', (enabled) => {
                learnCheckbox.checked = enabled;
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => APP.MIDILearn.clearBindings());
        }

        if (midiToastsCheckbox) {
            // Set initial value from state
            midiToastsCheckbox.checked = APP.PState.select('display.midiToasts');

            midiToastsCheckbox.addEventListener('change', function() {
                APP.PState.dispatch({ type: 'display.midiToasts', payload: this.checked });
            });
        }

        APP.MIDI.on('disconnect', (port) => {
            if (APP.MIDI.activeInput && port.id === APP.MIDI.activeInput.id) {
                if (statusIndicator) statusIndicator.classList.remove('connected');
                if (statusText) statusText.textContent = 'Disconnected';
                if (deviceSelect) deviceSelect.value = '';
            }
            APP._populateMIDIDevices();
        });

        APP.MIDI.on('connect', () => APP._populateMIDIDevices());
    };

    // Auto-init MIDI after main app
    document.addEventListener('DOMContentLoaded', async () => {
        setTimeout(async () => {
            const success = await APP.MIDI.init();
            if (success) {
                APP.MIDILearn.init();
                APP._populateMIDIDevices();
                APP._initMIDIUI();
            }
        }, 100);
    });

})(window.APP);
