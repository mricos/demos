/**
 * ControlHelper - Main control input helper popup
 * Click [C] button = show Input Sources popup (quick select)
 * Long-press [C] button = enter learn mode for first input to capture
 *
 * Shows 5 input modes: MIDI, Gamepad, LFO, Mobile, Key
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    const LONG_PRESS_DURATION = 500; // ms

    APP.ControlHelper = {
        _pressTimer: null,
        _pressTarget: null,
        _isOpen: false,
        _overlay: null,
        _learnMode: null, // { bindKey, sourceType, elementId }
        _unsubscribeInput: null,

        init() {
            this._setupCtrlButtonListener();
            this._updateBoundButtons();
            this._subscribeToMaps();
        },

        /**
         * Subscribe to map changes to update button highlights
         */
        _subscribeToMaps() {
            APP.State?.subscribe('input.banks.*', () => {
                this._updateBoundButtons();
            });
        },

        /**
         * Update all ctrl-btn elements to show bound state
         */
        _updateBoundButtons() {
            const buttons = document.querySelectorAll('.ctrl-btn[data-bind]');
            const activeBank = APP.State?.select('input.activeBank') || 'A';
            const maps = APP.State?.select(`input.banks.${activeBank}.maps`) || {};

            // Build set of bound paths
            const boundPaths = new Set();
            Object.values(maps).forEach(map => {
                if (map.target?.path) {
                    boundPaths.add(map.target.path);
                }
            });

            // Update each button
            buttons.forEach(btn => {
                const bindKey = btn.dataset.bind;
                if (boundPaths.has(bindKey)) {
                    btn.classList.add('bound');
                } else {
                    btn.classList.remove('bound');
                }
            });
        },

        /**
         * Setup click and long-press handlers on .ctrl-btn elements
         * Click = show popup, Long-press = enter learn mode directly
         */
        _setupCtrlButtonListener() {
            // Pointer down - start long-press timer
            document.addEventListener('pointerdown', (e) => {
                const btn = e.target.closest('.ctrl-btn');
                if (!btn) return;

                this._pressTarget = {
                    btn,
                    bindKey: btn.dataset.bind,
                    x: e.clientX,
                    y: e.clientY,
                    wasLongPress: false
                };

                this._pressTimer = setTimeout(() => {
                    if (this._pressTarget) {
                        this._pressTarget.wasLongPress = true;
                        this._handleLongPress(this._pressTarget);
                    }
                }, LONG_PRESS_DURATION);
            });

            // Pointer move - cancel if dragged
            document.addEventListener('pointermove', (e) => {
                if (!this._pressTarget) return;
                const dx = Math.abs(e.clientX - this._pressTarget.x);
                const dy = Math.abs(e.clientY - this._pressTarget.y);
                if (dx > 10 || dy > 10) {
                    this._cancelPress();
                }
            });

            // Pointer up - if not long press, show popup
            document.addEventListener('pointerup', (e) => {
                if (!this._pressTarget) return;

                const wasLongPress = this._pressTarget.wasLongPress;
                const target = { ...this._pressTarget };
                this._cancelPress();

                // If it was a quick click (not long press), show the popup
                if (!wasLongPress) {
                    this._showHelper(target);
                }
            });

            document.addEventListener('pointercancel', () => {
                this._cancelPress();
            });
        },

        _cancelPress() {
            if (this._pressTimer) {
                clearTimeout(this._pressTimer);
                this._pressTimer = null;
            }
            this._pressTarget = null;
        },

        /**
         * Handle long-press - enter learn mode directly
         * Listens for first MIDI, Gamepad, or touch input
         */
        _handleLongPress(target) {
            const bindKey = target.bindKey;
            if (!bindKey) {
                APP.Toast?.info('No parameter to bind');
                return;
            }

            // Find the element
            const elementId = APP.ParameterRegistry?.findByPath(bindKey);
            if (!elementId) {
                APP.Toast?.info(`Unknown parameter: ${bindKey}`);
                return;
            }

            // Check what sources are available
            const midiConnected = !!APP.MIDI?.activeInput;
            const gamepadConnected = !!APP.Gamepad?.activeGamepad;
            const hasTouch = this._isTouchDevice();

            if (!midiConnected && !gamepadConnected && !hasTouch) {
                APP.Toast?.info('Connect MIDI or Gamepad first');
                return;
            }

            // Visual feedback on the button
            target.btn.classList.add('learning');

            // Build source list for message
            const sources = [];
            if (midiConnected) sources.push('MIDI');
            if (gamepadConnected) sources.push('Gamepad');
            if (hasTouch) sources.push('Touch');

            // Show sticky learn toast (stays visible while CC messages come/go)
            this._learnToast = APP.Toast?.learn(`Move ${sources.join('/')}: ${bindKey}`);

            // Enter learn mode
            this._learnMode = {
                bindKey,
                elementId,
                btn: target.btn
            };

            // Subscribe to input events
            this._startListening();

            // Cancel on click elsewhere
            const cancelHandler = (e) => {
                if (e.target.closest('.ctrl-btn') === target.btn) return;
                this._exitLearnMode();
                document.removeEventListener('click', cancelHandler);
            };
            setTimeout(() => {
                document.addEventListener('click', cancelHandler);
            }, 100);

            // Auto-cancel after 10 seconds
            setTimeout(() => {
                if (this._learnMode) {
                    this._exitLearnMode();
                    APP.Toast?.info('Learn mode timed out');
                }
            }, 10000);
        },

        _startListening() {
            this._unsubscribeInput = APP.InputHub?.on((event) => {
                return this._handleInputEvent(event);
            });
        },

        _stopListening() {
            if (this._unsubscribeInput) {
                this._unsubscribeInput();
                this._unsubscribeInput = null;
            }
        },

        /**
         * Handle input event during learn mode
         */
        _handleInputEvent(event) {
            if (!this._learnMode) return false;

            const sourceType = APP.InputHub?.getSourceType(event.source, event.key);
            const isDiscrete = APP.InputMap?.InputDomains[sourceType]?.discrete ?? false;

            // For continuous inputs, require significant movement
            if (!isDiscrete) {
                const domain = APP.InputMap?.InputDomains[sourceType];
                if (domain) {
                    const range = domain.max - domain.min;
                    const threshold = range * 0.1;
                    if (Math.abs(event.value - domain.min) < threshold &&
                        Math.abs(event.value - domain.max) < threshold) {
                        return true; // Intercept but don't bind yet
                    }
                }
            }

            // Create the binding
            this._createBinding(event, sourceType);
            return true;
        },

        _createBinding(event, sourceType) {
            const learn = this._learnMode;
            if (!learn) return;

            const element = document.getElementById(learn.elementId);
            if (!element) {
                this._exitLearnMode();
                return;
            }

            // Create the map
            let map = APP.InputMap?.fromElement(
                element,
                sourceType,
                event.key,
                event.fullKey,
                { inferredAction: 'absolute' }
            );

            if (!map) {
                APP.Toast?.info('Failed to create binding');
                this._exitLearnMode();
                return;
            }

            // Remove existing maps for this element from this source type
            APP.InputHub?.removeMapsByElement(learn.elementId, event.source);

            // Add new map
            APP.InputHub?.addMap(map);

            // Show success
            const badge = APP.InputMap?.getBadgeSymbol(map) || '?';
            APP.Toast?.success(`[${badge}] ${event.key} → ${learn.bindKey}`);

            this._exitLearnMode();
        },

        _exitLearnMode() {
            if (this._learnMode?.btn) {
                this._learnMode.btn.classList.remove('learning');
            }
            // Dismiss sticky toast
            if (this._learnToast) {
                APP.Toast?.dismissSticky(this._learnToast);
                this._learnToast = null;
            }
            this._learnMode = null;
            this._stopListening();
        },

        _showHelper(pressTarget) {
            if (this._isOpen) return;
            this._isOpen = true;

            // Gather connection status
            const midiConnected = !!APP.MIDI?.activeInput;
            const gamepadConnected = !!APP.Gamepad?.activeGamepad;
            const lfoCount = Object.keys(APP.State?.select('lfo.lfos') || {}).length;
            const keyboardEnabled = APP.State?.select('keyboard.enabled') !== false;

            // The parameter being bound (if any)
            const bindKey = pressTarget?.bindKey || null;

            // Build mode cards
            const modes = [
                {
                    id: 'midi',
                    icon: 'M',
                    label: 'MIDI',
                    connected: midiConnected,
                    status: midiConnected ? APP.MIDI.activeInput.name : 'Disconnected',
                    desc: 'Click to learn CC/Note',
                    canLearn: midiConnected,
                    action: () => this._startLearn('midi', bindKey)
                },
                {
                    id: 'gamepad',
                    icon: 'G',
                    label: 'Gamepad',
                    connected: gamepadConnected,
                    status: gamepadConnected ? APP.Gamepad.activeGamepad.id.substring(0, 20) : 'Disconnected',
                    desc: 'Click to learn Axis/Button',
                    canLearn: gamepadConnected,
                    action: () => this._startLearn('gamepad', bindKey)
                },
                {
                    id: 'lfo',
                    icon: '~',
                    label: 'LFO',
                    connected: lfoCount > 0,
                    status: lfoCount > 0 ? `${lfoCount} active` : 'Create new',
                    desc: 'Oscillator modulation',
                    canLearn: true,
                    action: () => this._startLearn('lfo', bindKey)
                },
                {
                    id: 'mobile',
                    icon: 'T',
                    label: 'Mobile',
                    connected: this._isTouchDevice(),
                    status: this._isTouchDevice() ? 'Touch available' : 'Not available',
                    desc: 'Click to learn Touch/Gyro',
                    canLearn: this._isTouchDevice(),
                    action: () => this._startLearn('mobile', bindKey)
                },
                {
                    id: 'keyboard',
                    icon: 'K',
                    label: 'Key',
                    connected: keyboardEnabled,
                    status: keyboardEnabled ? 'Enabled' : 'Disabled',
                    desc: 'Click to learn key',
                    canLearn: keyboardEnabled,
                    action: () => this._startLearn('keyboard', bindKey)
                }
            ];

            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'control-helper-overlay';

            const targetInfo = bindKey
                ? `<div class="control-helper-target">Binding: <strong>${bindKey}</strong></div>`
                : '';

            overlay.innerHTML = `
                <div class="control-helper-popup">
                    <div class="control-helper-header">
                        <span class="control-helper-title">Input Sources</span>
                        <button class="control-helper-close">&times;</button>
                    </div>
                    ${targetInfo}
                    <div class="control-helper-grid">
                        ${modes.map(m => this._buildModeCard(m)).join('')}
                    </div>
                    <div class="control-helper-footer">
                        <span class="control-helper-hint">Long-press [C] for quick learn</span>
                        <span class="control-helper-bank">Bank ${APP.InputHub?.getActiveBank() || 'A'}</span>
                    </div>
                </div>
            `;

            // Close handlers
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this._hideHelper();
            });

            overlay.querySelector('.control-helper-close').addEventListener('click', () => {
                this._hideHelper();
            });

            // Mode card click handlers
            modes.forEach(mode => {
                const card = overlay.querySelector(`[data-mode="${mode.id}"]`);
                if (card) {
                    card.addEventListener('click', () => {
                        this._hideHelper();
                        mode.action();
                    });
                }
            });

            // Escape to close
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    this._hideHelper();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);

            document.body.appendChild(overlay);
            this._overlay = overlay;
        },

        _buildModeCard(mode) {
            const statusClass = mode.connected ? 'connected' : 'disconnected';
            const disabledClass = !mode.canLearn ? 'disabled' : '';
            return `
                <div class="control-helper-card ${mode.id} ${disabledClass}" data-mode="${mode.id}">
                    <div class="card-icon ${statusClass}">${mode.icon}</div>
                    <div class="card-content">
                        <div class="card-label">${mode.label}</div>
                        <div class="card-status ${statusClass}">${mode.status}</div>
                        <div class="card-desc">${mode.desc}</div>
                    </div>
                </div>
            `;
        },

        _hideHelper() {
            if (this._overlay) {
                this._overlay.remove();
                this._overlay = null;
            }
            this._isOpen = false;
        },

        _isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        },

        /**
         * Start learn mode for a specific source type
         */
        _startLearn(sourceType, bindKey) {
            if (!bindKey) {
                APP.Toast?.info('No target parameter');
                return;
            }

            const elementId = APP.ParameterRegistry?.findByPath(bindKey);
            if (!elementId) {
                APP.Toast?.info(`Unknown parameter: ${bindKey}`);
                return;
            }

            if (sourceType === 'lfo') {
                // Create a new LFO mapped to this parameter
                APP.LFOUI?.createLFOForParameter(bindKey);
                return;
            }

            // For MIDI, Gamepad, Mobile, Keyboard - enter learn mode
            const element = document.getElementById(elementId);
            if (!element) {
                APP.Toast?.info(`Element not found: ${elementId}`);
                return;
            }

            // Check if source is connected
            if (sourceType === 'midi' && !APP.MIDI?.activeInput) {
                APP.Toast?.info('Connect MIDI device first');
                return;
            }
            if (sourceType === 'gamepad' && !APP.Gamepad?.activeGamepad) {
                APP.Toast?.info('Connect Gamepad first');
                return;
            }
            if (sourceType === 'mobile' && !this._isTouchDevice()) {
                APP.Toast?.info('Touch not available');
                return;
            }
            if (sourceType === 'keyboard' && !APP.State?.select('keyboard.enabled')) {
                APP.Toast?.info('Keyboard input disabled');
                return;
            }

            // Enter learn mode for this specific source
            this._learnMode = {
                bindKey,
                elementId,
                sourceType,
                btn: null
            };

            const sourceLabel = {
                'midi': 'MIDI control',
                'gamepad': 'Gamepad axis/button',
                'mobile': 'Touch/gyro',
                'keyboard': 'Key'
            }[sourceType] || sourceType;

            // Show sticky learn toast
            this._learnToast = APP.Toast?.learn(`Move ${sourceLabel}: ${bindKey}`);

            // Subscribe to input events (filtered by source type)
            this._startListeningFiltered(sourceType);

            // Auto-cancel after 10 seconds
            setTimeout(() => {
                if (this._learnMode) {
                    this._exitLearnMode();
                    APP.Toast?.info('Learn mode timed out');
                }
            }, 10000);
        },

        /**
         * Start listening for specific source type only
         */
        _startListeningFiltered(sourceType) {
            this._unsubscribeInput = APP.InputHub?.on((event) => {
                // Filter by source type
                const eventSourceType = APP.InputHub?.getSourceType(event.source, event.key);

                // Match source type
                if (sourceType === 'midi' && !eventSourceType?.startsWith('midi')) return false;
                if (sourceType === 'gamepad' && !eventSourceType?.startsWith('gamepad')) return false;
                if (sourceType === 'keyboard' && !eventSourceType?.startsWith('keyboard')) return false;
                if (sourceType === 'mobile' && event.source !== 'touch') return false;

                return this._handleInputEvent(event);
            });
        },

        _focusSection(sectionId) {
            const sectionMap = {
                'midi': 'MIDI',
                'gamepad': 'Gamepad',
                'lfo': 'LFO',
                'keyboard': 'Keyboard'
            };

            const title = sectionMap[sectionId];
            if (!title) return;

            if (APP.Sidebar?.isCollapsed) {
                APP.Sidebar.show();
            }

            const sections = document.querySelectorAll('.control-section');
            sections.forEach(section => {
                const header = section.querySelector('.section-title');
                if (header && header.textContent.trim() === title) {
                    section.classList.remove('collapsed');
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        },

        toggle() {
            if (this._isOpen) {
                this._hideHelper();
            } else {
                this._showHelper(null);
            }
        }
    };

})(window.APP);
