/**
 * InputLearnUI - Learn mode via long-click
 * Long-click control → show +/-/T buttons → move input → binding created
 *
 * Owns all learn mode state and logic. InputHub is a pure router.
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    const LONG_PRESS_DURATION = 500; // ms

    APP.InputLearnUI = {
        // Current learn target state
        currentTarget: null,  // { elementId, controlGroup, source, param }
        selectedMode: 'increment',  // Default mode

        // Long press tracking
        _pressTimer: null,
        _pressTarget: null,

        // InputHub event unsubscribe function
        _unsubscribeInput: null,

        // Pre-specified source for LFO/Keyboard mapping
        _pendingSource: null,  // { source: 'lfo', key: 'lfo_xxx', fullKey: 'lfo:lfo_xxx' }

        init() {
            this._setupLongClickHandler();
            this._setupModeButtonDelegation();
            this._subscribeToState();
            this._render();
        },

        // ================================================================
        // Long-Click Handler - Detect long press on controls
        // ================================================================

        _setupLongClickHandler() {
            // Use event delegation for control indicators
            // Quick click = open editor, Long press = enter learn mode
            document.addEventListener('pointerdown', (e) => {
                const indicator = e.target.closest('.control-indicator');
                if (!indicator) return;

                const controlGroup = indicator.closest('.control-group');
                const input = controlGroup?.querySelector('input[type="range"], input[type="color"], input[type="checkbox"], select');
                if (!input) return;

                e.preventDefault();
                e.stopPropagation();

                this._pressTarget = { controlGroup, input, indicator, x: e.clientX, y: e.clientY };

                this._pressTimer = setTimeout(() => {
                    this._handleLongPress(this._pressTarget);
                    this._pressTarget = null;
                }, LONG_PRESS_DURATION);
            });

            // Quick click (no long press) = open editor
            document.addEventListener('click', (e) => {
                const indicator = e.target.closest('.control-indicator');
                if (!indicator) return;

                // If we're in learn mode, don't open editor
                if (this.currentTarget) {
                    e.stopPropagation();
                    return;
                }

                // If long press timer is still pending, it's a quick click
                if (this._pressTarget && this._pressTimer) {
                    this._cancelLongPress();
                    const controlGroup = indicator.closest('.control-group');
                    const input = controlGroup?.querySelector('input[type="range"], input[type="color"], input[type="checkbox"], select');
                    if (input) {
                        this._showControlEditor(input.id);
                    }
                }
            });

            // Cancel on move
            document.addEventListener('pointermove', (e) => {
                if (!this._pressTarget) return;
                const dx = Math.abs(e.clientX - this._pressTarget.x);
                const dy = Math.abs(e.clientY - this._pressTarget.y);
                if (dx > 10 || dy > 10) {
                    this._cancelLongPress();
                }
            });

            // Cancel on release
            document.addEventListener('pointerup', () => {
                // Don't cancel immediately - let click handler fire first
                setTimeout(() => this._cancelLongPress(), 10);
            });

            // Cancel on pointer leave
            document.addEventListener('pointercancel', () => {
                this._cancelLongPress();
            });

            // Click outside while in learn mode clears target
            document.addEventListener('click', (e) => {
                if (e.target.closest('.learn-mode-btn')) return;
                if (e.target.closest('.control-indicator')) return;

                if (this.currentTarget && !e.target.closest('.control-group')) {
                    this._clearTarget();
                }
            });
        },

        /**
         * Event delegation for mode buttons (fixes memory leak)
         */
        _setupModeButtonDelegation() {
            document.addEventListener('click', (e) => {
                const btn = e.target.closest('.learn-mode-btn');
                if (!btn) return;

                e.stopPropagation();
                const mode = btn.dataset.mode;
                const selector = btn.closest('.learn-mode-selector');
                if (selector && mode) {
                    this._selectMode(mode, selector);
                }
            });
        },

        _cancelLongPress() {
            if (this._pressTimer) {
                clearTimeout(this._pressTimer);
                this._pressTimer = null;
            }
            this._pressTarget = null;
        },

        _handleLongPress(pressTarget) {
            const { controlGroup, input, indicator } = pressTarget;
            this._pressTimer = null;

            // Determine which sources are available
            const midiConnected = APP.MIDI?.activeInput;
            const gamepadConnected = APP.Gamepad?.activeGamepad;
            const lfosExist = Object.keys(APP.State?.select('lfo.lfos') || {}).length > 0;
            const keyboardEnabled = APP.State?.select('keyboard.enabled');

            if (!midiConnected && !gamepadConnected && !lfosExist && !keyboardEnabled) {
                APP.Toast?.info('Connect MIDI/Gamepad, create LFO, or enable keyboard');
                return;
            }

            // Clear any previous target
            this._clearTarget();

            // Get parameter definition
            const param = APP.ParameterRegistry.get(input.id);
            if (!param) {
                APP.Toast?.info(`Cannot bind: ${input.id}`);
                return;
            }

            // Enter learn mode - listen for ANY connected input
            this._enterLearnMode(controlGroup, input, indicator, param);
        },

        /**
         * Start learn mode with a pre-specified source (called by LFOUI)
         * User then clicks on a control to complete the mapping
         */
        startLearnWithSource(source, key, fullKey) {
            this._pendingSource = { source, key, fullKey };
            APP.Toast?.info(`Click a control to map ${source}:${key}`);

            // Listen for clicks on control indicators
            this._setupPendingSourceHandler();
        },

        _setupPendingSourceHandler() {
            // One-time handler for control selection
            const handler = (e) => {
                const indicator = e.target.closest('.control-indicator');
                if (!indicator && !e.target.closest('.control-group')) {
                    // Clicked elsewhere - cancel
                    this._pendingSource = null;
                    document.removeEventListener('click', handler);
                    return;
                }

                if (!indicator) return;

                e.preventDefault();
                e.stopPropagation();

                const controlGroup = indicator.closest('.control-group');
                const input = controlGroup?.querySelector('input[type="range"], input[type="color"], input[type="checkbox"], select');
                if (!input) {
                    this._pendingSource = null;
                    document.removeEventListener('click', handler);
                    return;
                }

                const param = APP.ParameterRegistry.get(input.id);
                if (!param) {
                    APP.Toast?.info(`Cannot bind: ${input.id}`);
                    this._pendingSource = null;
                    document.removeEventListener('click', handler);
                    return;
                }

                // Create binding with pending source
                const pendingSource = this._pendingSource;
                this._pendingSource = null;
                document.removeEventListener('click', handler);

                this._createBindingFromSource(pendingSource, input, param);
            };

            // Use setTimeout to avoid catching the current click
            setTimeout(() => {
                document.addEventListener('click', handler);
            }, 100);
        },

        _createBindingFromSource(sourceInfo, element, param) {
            const sourceType = APP.InputHub.getSourceType(sourceInfo.source, sourceInfo.key);

            let map = APP.InputMap.fromElement(
                element,
                sourceType,
                sourceInfo.key,
                sourceInfo.fullKey,
                { inferredAction: 'increment' }
            );

            if (!map) {
                APP.Toast?.error('Failed to create binding');
                return;
            }

            // Remove existing maps for this element from this source type
            APP.InputHub.removeMapsByElement(element.id, sourceInfo.source);

            // Add new map
            APP.InputHub.addMap(map);

            const badge = APP.InputMap.getBadgeSymbol(map);
            APP.Toast.success(`Bound [${badge}]: ${sourceInfo.key} → ${param.path}`);
        },

        /**
         * Enter learn mode - listens for input from any connected source
         */
        _enterLearnMode(controlGroup, input, indicator, param) {
            const midiConnected = APP.MIDI?.activeInput;
            const gamepadConnected = APP.Gamepad?.activeGamepad;
            const lfosExist = Object.keys(APP.State?.select('lfo.lfos') || {}).length > 0;
            const keyboardEnabled = APP.State?.select('keyboard.enabled');

            // Set new target - source will be determined by first input received
            this.currentTarget = { elementId: input.id, controlGroup, param, indicator };
            this.selectedMode = 'increment';

            // Visual feedback
            controlGroup.classList.add('learn-active');
            if (indicator) indicator.classList.add('learning');

            // Show mode selector (neutral color since we don't know source yet)
            this._showModeSelector(controlGroup, null);

            // Subscribe to input events for learn mode
            this._startListening();

            // Helpful message
            const sources = [];
            if (midiConnected) sources.push('MIDI');
            if (gamepadConnected) sources.push('Gamepad');
            if (lfosExist) sources.push('LFO');
            if (keyboardEnabled) sources.push('key');
            APP.Toast?.info(`Move/press: ${sources.join(', ')}`);
        },

        // ================================================================
        // Input Event Listening (Learn Mode)
        // ================================================================

        _startListening() {
            // Subscribe to raw input events from InputHub
            this._unsubscribeInput = APP.InputHub.on((event) => {
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
         * Handle incoming input during learn mode
         * Accepts input from ANY connected source - first one to move wins
         * @returns {boolean} true to intercept (prevent normal routing)
         */
        _handleInputEvent(event) {
            const target = this.currentTarget;
            if (!target) return false;

            const sourceType = APP.InputHub.getSourceType(event.source, event.key);
            const isDiscrete = APP.InputMap.InputDomains[sourceType]?.discrete ?? false;

            // For continuous inputs, require significant movement
            if (!isDiscrete) {
                const domain = APP.InputMap.InputDomains[sourceType];
                const range = domain.max - domain.min;
                const threshold = range * APP.State.defaults.config.learnThreshold;
                if (Math.abs(event.value - domain.min) < threshold &&
                    Math.abs(event.value - domain.max) < threshold) {
                    return true; // Intercept but don't bind yet
                }
            }

            // Create the binding with whatever source moved first
            this._createBinding(event, sourceType, target);
            return true; // Intercept - don't route normally
        },

        /**
         * Create and store a new binding
         */
        _createBinding(event, sourceType, target) {
            const element = document.getElementById(target.elementId);
            if (!element) return;

            // Create the map
            let map = APP.InputMap.fromElement(
                element,
                sourceType,
                event.key,
                event.fullKey,
                { inferredAction: this.selectedMode }
            );
            if (!map) return;

            // Remove existing maps for this element from this source
            APP.InputHub.removeMapsByElement(target.elementId, event.source);

            // Add new map
            APP.InputHub.addMap(map);

            // Show success
            const badge = APP.InputMap.getBadgeSymbol(map);
            APP.Toast.success(`Bound [${badge}]: ${event.key} → ${target.param.path}`);

            // Clear learn target
            this._clearTarget();
        },

        // ================================================================
        // Mode Selector - Inline buttons
        // ================================================================

        _showModeSelector(controlGroup, source) {
            this._hideModeSelector();

            // Use neutral color if source unknown, otherwise use source-specific color
            const color = source ? (source === 'gamepad' ? 'gamepad' : 'midi') : '';

            const selector = document.createElement('div');
            selector.className = `learn-mode-selector ${color}`;
            selector.innerHTML = `
                <button class="learn-mode-btn selected" data-mode="increment" title="Increment">+</button>
                <button class="learn-mode-btn" data-mode="decrement" title="Decrement">−</button>
                <button class="learn-mode-btn" data-mode="toggle" title="Toggle">T</button>
            `;

            controlGroup.appendChild(selector);
        },

        _selectMode(mode, selector) {
            this.selectedMode = mode;

            // Update button states
            selector.querySelectorAll('.learn-mode-btn').forEach(btn => {
                btn.classList.toggle('selected', btn.dataset.mode === mode);
            });
        },

        _hideModeSelector() {
            document.querySelectorAll('.learn-mode-selector').forEach(el => el.remove());
        },

        _clearTarget() {
            if (this.currentTarget) {
                const { controlGroup, indicator } = this.currentTarget;
                controlGroup.classList.remove('learn-active');
                // Remove learning class from indicator
                if (indicator) indicator.classList.remove('learning');
            }
            this._hideModeSelector();
            this._stopListening();
            this.currentTarget = null;
        },

        /**
         * Show control editor for a specific element
         * Shows all bindings (MIDI and Gamepad) in a unified view
         */
        _showControlEditor(elementId) {
            const activeBank = APP.InputHub.getActiveBank();
            const maps = APP.InputHub.getMapsForElement(elementId);

            if (maps.length === 0) {
                // No binding - show info toast with hint
                APP.Toast?.info(`No binding. Long-press to learn.`);
                return;
            }

            if (maps.length === 1) {
                // Single binding - show detailed editor
                this._showMapEditor(maps[0], activeBank);
            } else {
                // Multiple bindings - show unified editor with all maps
                this._showUnifiedEditor(elementId, maps, activeBank);
            }
        },

        /**
         * Show unified editor when multiple bindings exist (MIDI + Gamepad)
         */
        _showUnifiedEditor(elementId, maps, activeBank) {
            this._hideMapEditor();

            const param = APP.ParameterRegistry.get(elementId);
            const midiMap = maps.find(m => m.source.type.startsWith('midi'));
            const gamepadMap = maps.find(m => m.source.type.startsWith('gamepad'));

            const overlay = document.createElement('div');
            overlay.className = 'map-editor-overlay';
            overlay.innerHTML = `
                <div class="map-editor unified">
                    <div class="map-editor-header">
                        <span class="map-editor-title">Control Bindings</span>
                        <button class="map-editor-info" title="How mapping works">?</button>
                        <button class="map-editor-close">&times;</button>
                    </div>

                    <div class="unified-target">
                        <span class="target-label">Target:</span>
                        <span class="target-path">${param?.path || elementId}</span>
                        <span class="target-bank">Bank ${activeBank}</span>
                    </div>

                    <div class="unified-bindings">
                        ${midiMap ? this._buildBindingCard(midiMap, 'midi', activeBank) : ''}
                        ${gamepadMap ? this._buildBindingCard(gamepadMap, 'gamepad', activeBank) : ''}
                    </div>

                    <div class="map-editor-actions">
                        <button class="map-editor-btn close-btn">Close</button>
                    </div>
                </div>
            `;

            // Event handlers
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this._hideMapEditor();
            });

            overlay.querySelector('.map-editor-close').addEventListener('click', () => {
                this._hideMapEditor();
            });

            overlay.querySelector('.close-btn').addEventListener('click', () => {
                this._hideMapEditor();
            });

            overlay.querySelector('.map-editor-info').addEventListener('click', () => {
                this._showMappingInfoPopup();
            });

            // Delete buttons for each binding
            overlay.querySelectorAll('.binding-delete-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const mapId = btn.dataset.mapId;
                    this._deleteMap(mapId, activeBank);
                    this._hideMapEditor();
                });
            });

            // Edit buttons to show detailed editor
            overlay.querySelectorAll('.binding-edit-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const mapId = btn.dataset.mapId;
                    const map = maps.find(m => m.id === mapId);
                    if (map) {
                        this._hideMapEditor();
                        this._showMapEditor(map, activeBank);
                    }
                });
            });

            document.body.appendChild(overlay);
        },

        /**
         * Build a binding card for the unified editor
         */
        _buildBindingCard(map, type, bank) {
            const isGamepad = type === 'gamepad';
            const themeClass = isGamepad ? 'gamepad' : 'midi';
            const label = isGamepad ? 'Gamepad' : 'MIDI';
            const modeSymbol = APP.InputMap.getBadgeSymbol(map);

            return `
                <div class="binding-card ${themeClass}">
                    <div class="binding-header">
                        <span class="binding-type-badge ${themeClass}">${label[0]}</span>
                        <span class="binding-type-label">${label}</span>
                        <span class="binding-mode-badge">${modeSymbol}</span>
                    </div>
                    <div class="binding-details">
                        <div class="binding-row">
                            <span class="binding-key">${map.source.key}</span>
                        </div>
                        <div class="binding-row">
                            <span class="binding-range">${map.domain.outputMin} → ${map.domain.outputMax}</span>
                        </div>
                    </div>
                    <div class="binding-actions">
                        <button class="binding-edit-btn" data-map-id="${map.id}" title="Edit">✎</button>
                        <button class="binding-delete-btn" data-map-id="${map.id}" title="Delete">×</button>
                    </div>
                </div>
            `;
        },

        // ================================================================
        // Subscribe to state changes
        // ================================================================

        _subscribeToState() {
            // Maps changed - update badges (subscribe to all banks)
            APP.State.subscribe('input.banks.*', () => {
                this._renderBadges();
                this._renderBindingCounts();
                // Clear target after successful bind
                if (this.currentTarget) {
                    this._clearTarget();
                }
            });

            // Active bank changed - re-render badges
            APP.State.subscribe('input.activeBank', () => {
                this._renderBadges();
                this._renderBindingCounts();
            });
        },

        // ================================================================
        // Render
        // ================================================================

        _render() {
            this._renderEditButtons();
            this._renderBadges();
            this._renderBindingCounts();
        },

        /**
         * Render unified control indicators on all control groups
         * Shows "C" when bound (solid), ghost ring when unbound
         * Placed inline with label for consistent positioning
         */
        _renderEditButtons() {
            // Remove existing control indicators
            document.querySelectorAll('.control-indicator').forEach(el => el.remove());

            const activeBank = APP.InputHub.getActiveBank();

            // Add control indicator to each control group with bindable input
            document.querySelectorAll('.control-group').forEach(controlGroup => {
                const input = controlGroup.querySelector('input[type="range"], input[type="color"], input[type="checkbox"], select');
                if (!input || !input.id) return;

                // Check if parameter is registered
                const param = APP.ParameterRegistry?.get(input.id);
                if (!param) return;

                // Find the label to append indicator to
                const label = controlGroup.querySelector('label');
                if (!label) return;

                // Check for existing bindings
                const maps = APP.InputHub?.getMapsForElement(input.id) || [];
                const hasMidi = maps.some(m => m.source.type.startsWith('midi'));
                const hasGamepad = maps.some(m => m.source.type.startsWith('gamepad'));
                const hasLfo = maps.some(m => m.source.type === 'lfo');
                const hasKeyboard = maps.some(m => m.source.type.startsWith('keyboard'));
                const hasBinding = maps.length > 0;

                // Create control indicator
                const indicator = document.createElement('button');
                indicator.className = 'control-indicator';
                indicator.dataset.elementId = input.id;

                if (hasBinding) {
                    // Bound - show "C" solid
                    indicator.classList.add('bound');
                    indicator.textContent = 'C';

                    // Build source list for title
                    const sources = [];
                    if (hasMidi) sources.push('MIDI');
                    if (hasGamepad) sources.push('Gamepad');
                    if (hasLfo) sources.push('LFO');
                    if (hasKeyboard) sources.push('Keyboard');

                    // Add source indicators
                    if (sources.length > 1) {
                        indicator.classList.add('both');
                    } else if (hasMidi) {
                        indicator.classList.add('midi-only');
                    } else if (hasGamepad) {
                        indicator.classList.add('gamepad-only');
                    } else if (hasLfo) {
                        indicator.classList.add('lfo-only');
                    } else if (hasKeyboard) {
                        indicator.classList.add('keyboard-only');
                    }
                    indicator.title = `${sources.join(' + ')} (Bank ${activeBank}) - click to edit`;
                } else {
                    // Unbound - ghost ring (CSS ::before handles the icon)
                    indicator.title = 'Hold to learn binding';
                }

                // Append to label for inline positioning
                label.appendChild(indicator);
            });
        },

        /**
         * Update indicators without full re-render (called on binding changes)
         */
        _renderBadges() {
            // Just re-render the edit buttons (now unified indicators)
            this._renderEditButtons();
        },

        // ================================================================
        // Map Editor Popup
        // ================================================================

        _showMapEditor(map, currentBank) {
            this._hideMapEditor();

            const isGamepad = map.source.type.startsWith('gamepad');
            const sourceLabel = isGamepad ? 'Gamepad' : 'MIDI';
            const valueClass = isGamepad ? 'gamepad' : '';
            const isDiscrete = APP.InputMap.isDiscrete(map);

            // Build bank selector ghost buttons
            const bankButtons = ['A', 'B', 'C', 'D'].map(b =>
                `<button class="bank-ghost-btn ${b === currentBank ? 'active' : ''}" data-bank="${b}">${b}</button>`
            ).join('');

            // Build the mapping function visualization
            const inputDomain = APP.InputMap.InputDomains[map.source.type] || { min: 0, max: 127 };
            const mappingViz = this._buildMappingVisualization(map, inputDomain, isDiscrete, isGamepad);

            // Get current curve values (with migration from old format)
            let curveA = map.behavior.curveA ?? 1;
            let curveB = map.behavior.curveB ?? 1;
            let curveMid = map.behavior.curveMid ?? 0.5;
            // Migrate from old curve string format
            if (map.behavior.curve && typeof map.behavior.curve === 'string') {
                const preset = APP.InputMap.curveTypeToParams(map.behavior.curve);
                curveA = preset.a;
                curveB = preset.b;
            }

            // Determine which preset is active (if any)
            const isPreset = (a, b) => Math.abs(curveA - a) < 0.1 && Math.abs(curveB - b) < 0.1;

            const overlay = document.createElement('div');
            overlay.className = 'map-editor-overlay';
            overlay.innerHTML = `
                <div class="map-editor compact ${isGamepad ? 'gamepad-theme' : ''}">
                    <div class="map-editor-header">
                        <span class="map-editor-title">${sourceLabel} Binding</span>
                        <button class="map-editor-info" title="How mapping works">?</button>
                        <button class="map-editor-close">&times;</button>
                    </div>

                    <div class="map-editor-rows">
                        <div class="map-editor-row">
                            <span class="map-editor-label">Target</span>
                            <span class="map-editor-value ${valueClass}">${map.target.path}</span>
                        </div>
                        <div class="map-editor-row">
                            <span class="map-editor-label">Source</span>
                            <span class="map-editor-value ${valueClass}">${map.source.key}</span>
                        </div>
                        <div class="map-editor-row">
                            <span class="map-editor-label">Bank</span>
                            <div class="inline-btns bank-ghost-selector">${bankButtons}</div>
                        </div>
                        <div class="map-editor-row">
                            <span class="map-editor-label">Mode</span>
                            <div class="inline-btns mode-selector">
                                <button class="sm-btn ${map.behavior.mode === 'absolute' ? 'active' : ''}" data-mode="absolute" title="Absolute">~</button>
                                <button class="sm-btn ${map.behavior.mode === 'increment' ? 'active' : ''}" data-mode="increment" title="Increment">+</button>
                                <button class="sm-btn ${map.behavior.mode === 'decrement' ? 'active' : ''}" data-mode="decrement" title="Decrement">−</button>
                                <button class="sm-btn ${map.behavior.mode === 'toggle' ? 'active' : ''}" data-mode="toggle" title="Toggle">T</button>
                            </div>
                        </div>
                        <div class="map-editor-row">
                            <span class="map-editor-label">Polarity</span>
                            <div class="inline-btns polarity-selector">
                                <button class="sm-btn ${map.behavior.direction === 'normal' ? 'active' : ''}" data-direction="normal" title="Normal">→</button>
                                <button class="sm-btn ${map.behavior.direction === 'inverted' ? 'active' : ''}" data-direction="inverted" title="Inverted">←</button>
                            </div>
                        </div>
                        <div class="map-editor-row ${isDiscrete ? 'hidden' : ''}">
                            <span class="map-editor-label">Curve</span>
                            <div class="inline-btns curve-presets">
                                <button class="sm-btn ${isPreset(1, 1) ? 'active' : ''}" data-curve="linear" title="Linear">─</button>
                                <button class="sm-btn ${isPreset(0.4, 0.4) ? 'active' : ''}" data-curve="log" title="Log">╭</button>
                                <button class="sm-btn ${isPreset(2.5, 2.5) ? 'active' : ''}" data-curve="exp" title="Exp">╰</button>
                                <button class="sm-btn ${isPreset(2.5, 0.4) ? 'active' : ''}" data-curve="scurve" title="S-Curve">∿</button>
                            </div>
                        </div>
                    </div>

                    <div class="curve-editor ${isDiscrete ? 'hidden' : ''}">
                        <div class="curve-canvas-wrapper">
                            <canvas class="curve-canvas" width="200" height="100" data-curve-a="${curveA}" data-curve-b="${curveB}" data-curve-mid="${curveMid}"></canvas>
                            <div class="curve-labels">
                                <span class="curve-label-in">In</span>
                                <span class="curve-label-out">Out</span>
                            </div>
                        </div>
                    </div>

                    <div class="map-editor-row range-row">
                        <span class="map-editor-label">Range</span>
                        <div class="range-inline">
                            <input type="number" class="sm-input" id="mapMin" value="${map.domain.outputMin}">
                            <span class="range-arrow">→</span>
                            <input type="number" class="sm-input" id="mapMax" value="${map.domain.outputMax}">
                        </div>
                    </div>

                    <input type="hidden" id="mapStep" value="${map.behavior.stepSize}">

                    <div class="map-editor-actions">
                        <button class="map-editor-btn save">Save</button>
                        <button class="map-editor-btn delete">Delete</button>
                    </div>
                </div>
            `;

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this._hideMapEditor();
            });

            // Close button
            overlay.querySelector('.map-editor-close').addEventListener('click', () => {
                this._hideMapEditor();
            });

            // Info button
            overlay.querySelector('.map-editor-info').addEventListener('click', () => {
                this._showMappingInfoPopup();
            });

            // Bank move buttons
            overlay.querySelector('.bank-ghost-selector').addEventListener('click', (e) => {
                const btn = e.target.closest('.bank-ghost-btn');
                if (!btn) return;
                const targetBank = btn.dataset.bank;
                if (targetBank !== currentBank) {
                    APP.InputHub.moveMapToBank(map.id, currentBank, targetBank);
                    this._hideMapEditor();
                }
            });

            // Mode buttons
            overlay.querySelector('.mode-selector').addEventListener('click', (e) => {
                const btn = e.target.closest('.sm-btn');
                if (!btn) return;

                // Update active state
                overlay.querySelectorAll('.mode-selector .sm-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });

            // Polarity buttons
            overlay.querySelector('.polarity-selector').addEventListener('click', (e) => {
                const btn = e.target.closest('.sm-btn');
                if (!btn) return;

                // Update active state
                overlay.querySelectorAll('.polarity-selector .sm-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });

            // Curve preset buttons
            const curveSection = overlay.querySelector('.curve-presets');
            const canvas = overlay.querySelector('.curve-canvas');
            if (curveSection && canvas) {
                curveSection.addEventListener('click', (e) => {
                    const btn = e.target.closest('.sm-btn');
                    if (!btn) return;

                    // Update active state
                    overlay.querySelectorAll('.curve-presets .sm-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    // Get preset values and update canvas data attributes
                    const preset = APP.InputMap.CurvePresets[btn.dataset.curve] || APP.InputMap.CurvePresets.linear;
                    canvas.dataset.curveA = preset.a;
                    canvas.dataset.curveB = preset.b;
                    canvas.dataset.curveMid = 0.5; // Reset midpoint for presets

                    // Redraw curve with new values
                    this._drawCurve(canvas, preset.a, preset.b, 0.5, isGamepad);
                });

                // Setup canvas drag for fine-tuning
                this._setupCurveDrag(canvas, overlay, isGamepad);

                // Initial curve draw
                this._drawCurve(canvas, curveA, curveB, curveMid, isGamepad);
            }

            // Save button
            overlay.querySelector('.map-editor-btn.save').addEventListener('click', () => {
                const minInput = overlay.querySelector('#mapMin');
                const maxInput = overlay.querySelector('#mapMax');
                const stepInput = overlay.querySelector('#mapStep');
                const activeMode = overlay.querySelector('.mode-selector .sm-btn.active');
                const activePolarity = overlay.querySelector('.polarity-selector .sm-btn.active');
                const curveCanvas = overlay.querySelector('.curve-canvas');

                const newMin = parseFloat(minInput.value);
                const newMax = parseFloat(maxInput.value);
                const newStep = parseInt(stepInput.value, 10) || 10;
                const newMode = activeMode?.dataset.mode || map.behavior.mode;
                const newDirection = activePolarity?.dataset.direction || map.behavior.direction;
                const newCurveA = parseFloat(curveCanvas?.dataset.curveA) || 1;
                const newCurveB = parseFloat(curveCanvas?.dataset.curveB) || 1;
                const newCurveMid = parseFloat(curveCanvas?.dataset.curveMid) || 0.5;

                if (!isNaN(newMin) && !isNaN(newMax)) {
                    this._saveMapFull(map.id, currentBank, {
                        outputMin: newMin,
                        outputMax: newMax,
                        mode: newMode,
                        direction: newDirection,
                        stepSize: newStep,
                        curveA: newCurveA,
                        curveB: newCurveB,
                        curveMid: newCurveMid
                    });
                    this._hideMapEditor();
                }
            });

            // Delete button
            overlay.querySelector('.map-editor-btn.delete').addEventListener('click', () => {
                this._deleteMap(map.id, currentBank);
                this._hideMapEditor();
            });

            document.body.appendChild(overlay);
        },

        /**
         * Build the visual mapping function representation
         */
        _buildMappingVisualization(map, inputDomain, isDiscrete, isGamepad) {
            const themeClass = isGamepad ? 'gamepad' : 'midi';
            const direction = map.behavior.direction === 'inverted' ? '↔' : '→';
            const modeSymbol = APP.InputMap.getBadgeSymbol(map);

            if (isDiscrete) {
                // Discrete input visualization (button/note press)
                const actionWord = map.behavior.mode === 'toggle' ? 'Toggle' :
                                   map.behavior.mode === 'increment' ? `+${map.behavior.stepSize}` :
                                   map.behavior.mode === 'decrement' ? `-${map.behavior.stepSize}` : 'Set';

                return `
                    <div class="map-viz-discrete ${themeClass}">
                        <div class="viz-input-block">
                            <div class="viz-label">Input</div>
                            <div class="viz-value">${map.source.type.includes('button') ? 'Button' : 'Note'}</div>
                            <div class="viz-sublabel">Press</div>
                        </div>
                        <div class="viz-arrow">
                            <span class="viz-mode-badge ${themeClass}">${modeSymbol}</span>
                        </div>
                        <div class="viz-output-block">
                            <div class="viz-label">Output</div>
                            <div class="viz-value">${actionWord}</div>
                            <div class="viz-sublabel">${map.domain.outputMin}–${map.domain.outputMax}</div>
                        </div>
                    </div>
                `;
            } else {
                // Continuous input visualization (CC/axis)
                const inputLabel = map.source.type === 'gamepad-axis' ? 'Axis' : 'CC';
                const inputRange = inputDomain.min === -1 ? '-1 to +1' : `0–${inputDomain.max}`;

                return `
                    <div class="map-viz-continuous ${themeClass}">
                        <div class="viz-input-block">
                            <div class="viz-label">${inputLabel}</div>
                            <div class="viz-value">${inputRange}</div>
                        </div>
                        <div class="viz-transform">
                            <div class="viz-formula">
                                <span class="viz-fn">f(x)</span>
                                <span class="viz-direction ${map.behavior.direction}">${direction}</span>
                            </div>
                            <div class="viz-mode-badge ${themeClass}">${modeSymbol}</div>
                        </div>
                        <div class="viz-output-block">
                            <div class="viz-label">Value</div>
                            <div class="viz-value">${map.domain.outputMin}–${map.domain.outputMax}</div>
                        </div>
                    </div>
                `;
            }
        },

        /**
         * Get human-readable mode name
         */
        _getModeDisplayName(map) {
            const { mode, direction } = map.behavior;
            const isDiscrete = APP.InputMap.isDiscrete(map);

            if (map.target.type === 'checkbox') return 'Toggle';

            if (isDiscrete) {
                if (mode === 'toggle') return 'Toggle';
                if (mode === 'increment') return `Increment (+${map.behavior.stepSize})`;
                if (mode === 'decrement') return `Decrement (-${map.behavior.stepSize})`;
                return mode;
            }

            // Continuous
            if (direction === 'inverted') return 'Absolute (Inverted)';
            return 'Absolute';
        },

        /**
         * Show the mapping info popup with tabbed interface
         */
        _showMappingInfoPopup() {
            this._hideMappingInfoPopup();

            const popup = document.createElement('div');
            popup.className = 'mapping-info-popup-overlay';
            popup.innerHTML = `
                <div class="mapping-info-popup">
                    <div class="mapping-info-header">
                        <h3>How Mapping Works</h3>
                        <button class="mapping-info-close">&times;</button>
                    </div>
                    <div class="mapping-info-tabs">
                        <button class="info-tab active" data-tab="sources">Sources</button>
                        <button class="info-tab" data-tab="transform">Transform</button>
                        <button class="info-tab" data-tab="modes">Modes</button>
                        <button class="info-tab" data-tab="tips">Tips</button>
                    </div>
                    <div class="mapping-info-content">
                        <div class="info-tab-panel active" data-panel="sources">
                            <div class="info-grid">
                                <div class="info-item midi">
                                    <span class="info-badge">M</span>
                                    <div>
                                        <strong>MIDI CC</strong>
                                        <p>Continuous values 0–127</p>
                                    </div>
                                </div>
                                <div class="info-item midi">
                                    <span class="info-badge">M</span>
                                    <div>
                                        <strong>MIDI Note</strong>
                                        <p>On/Off trigger (velocity)</p>
                                    </div>
                                </div>
                                <div class="info-item gamepad">
                                    <span class="info-badge">G</span>
                                    <div>
                                        <strong>Gamepad Axis</strong>
                                        <p>Continuous -1.0 to +1.0</p>
                                    </div>
                                </div>
                                <div class="info-item gamepad">
                                    <span class="info-badge">G</span>
                                    <div>
                                        <strong>Gamepad Button</strong>
                                        <p>On/Off trigger</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="info-tab-panel" data-panel="transform">
                            <div class="formula-box">
                                <code>y = f(x; a, b, m)</code>
                            </div>
                            <p class="info-note">Input normalized to 0–1, then curved, then scaled to output range.</p>
                            <div class="curve-info">
                                <h4>Parametric Curve</h4>
                                <p>Three parameters control the response curve shape:</p>
                                <ul class="curve-params">
                                    <li><strong>a</strong> = exponent below midpoint</li>
                                    <li><strong>b</strong> = exponent above midpoint</li>
                                    <li><strong>m</strong> = midpoint position (0.1–0.9)</li>
                                </ul>
                                <p class="info-note" style="margin-top: 8px;">Exponent values: &gt;1 = convex, &lt;1 = concave</p>
                                <h4 style="margin-top: 12px;">Canvas Drag Controls</h4>
                                <ul class="curve-params">
                                    <li>Drag <strong>left zone</strong> vertically → adjust a</li>
                                    <li>Drag <strong>right zone</strong> vertically → adjust b</li>
                                    <li>Drag <strong>midpoint circle</strong> horizontally → adjust m</li>
                                </ul>
                            </div>
                        </div>

                        <div class="info-tab-panel" data-panel="modes">
                            <div class="mode-list">
                                <div class="mode-item">
                                    <span class="mode-badge absolute">~</span>
                                    <div>
                                        <strong>Absolute</strong>
                                        <p>Input directly controls output value</p>
                                    </div>
                                </div>
                                <div class="mode-item">
                                    <span class="mode-badge increment">+</span>
                                    <div>
                                        <strong>Increment</strong>
                                        <p>Each press adds step size to current value</p>
                                    </div>
                                </div>
                                <div class="mode-item">
                                    <span class="mode-badge decrement">−</span>
                                    <div>
                                        <strong>Decrement</strong>
                                        <p>Each press subtracts step size from current value</p>
                                    </div>
                                </div>
                                <div class="mode-item">
                                    <span class="mode-badge toggle">T</span>
                                    <div>
                                        <strong>Toggle</strong>
                                        <p>Each press flips between on/off</p>
                                    </div>
                                </div>
                            </div>
                            <div class="polarity-info">
                                <h4>Polarity</h4>
                                <div class="mode-list">
                                    <div class="mode-item">
                                        <span class="mode-badge">→</span>
                                        <div>
                                            <strong>Normal</strong>
                                            <p>Input maps directly to output</p>
                                        </div>
                                    </div>
                                    <div class="mode-item">
                                        <span class="mode-badge">←</span>
                                        <div>
                                            <strong>Inverted</strong>
                                            <p>Input direction reversed</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="info-tab-panel" data-panel="tips">
                            <ul class="tips-list">
                                <li><strong>Long-press</strong> the C icon to learn a new binding</li>
                                <li><strong>Click</strong> the C icon to edit existing binding</li>
                                <li>Use <strong>Banks A–D</strong> to store different control setups</li>
                                <li>Adjust <strong>Output Range</strong> to limit the effect</li>
                                <li><strong>Drag curve canvas</strong> vertically to fine-tune response</li>
                                <li>Both <strong>MIDI and Gamepad</strong> can bind to same control</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;

            // Tab switching
            popup.querySelectorAll('.info-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabName = tab.dataset.tab;

                    // Update active tab
                    popup.querySelectorAll('.info-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');

                    // Update active panel
                    popup.querySelectorAll('.info-tab-panel').forEach(p => p.classList.remove('active'));
                    popup.querySelector(`.info-tab-panel[data-panel="${tabName}"]`)?.classList.add('active');
                });
            });

            popup.addEventListener('click', (e) => {
                if (e.target === popup) this._hideMappingInfoPopup();
            });

            popup.querySelector('.mapping-info-close').addEventListener('click', () => {
                this._hideMappingInfoPopup();
            });

            document.body.appendChild(popup);
        },

        _hideMappingInfoPopup() {
            document.querySelectorAll('.mapping-info-popup-overlay').forEach(el => el.remove());
        },

        _hideMapEditor() {
            document.querySelectorAll('.map-editor-overlay').forEach(el => el.remove());
        },

        _saveMap(mapId, bank, newMin, newMax) {
            const maps = { ...APP.State.select(`input.banks.${bank}.maps`) };
            if (maps[mapId]) {
                maps[mapId] = {
                    ...maps[mapId],
                    domain: {
                        ...maps[mapId].domain,
                        outputMin: newMin,
                        outputMax: newMax
                    }
                };
                APP.State.dispatch({ type: `input.banks.${bank}.maps`, payload: maps });
                APP.Toast?.success(`Range updated: ${newMin} - ${newMax}`);
            }
        },

        /**
         * Save full map configuration including behavior
         */
        _saveMapFull(mapId, bank, config) {
            const maps = { ...APP.State.select(`input.banks.${bank}.maps`) };
            if (maps[mapId]) {
                maps[mapId] = {
                    ...maps[mapId],
                    domain: {
                        ...maps[mapId].domain,
                        outputMin: config.outputMin,
                        outputMax: config.outputMax
                    },
                    behavior: {
                        ...maps[mapId].behavior,
                        mode: config.mode,
                        direction: config.direction,
                        stepSize: config.stepSize,
                        curveA: config.curveA ?? 1,
                        curveB: config.curveB ?? 1,
                        curveMid: config.curveMid ?? 0.5
                    }
                };
                APP.State.dispatch({ type: `input.banks.${bank}.maps`, payload: maps });

                const modeLabel = config.mode === 'absolute' ? '~' :
                                  config.mode === 'increment' ? '+' :
                                  config.mode === 'decrement' ? '−' : 'T';
                const dirLabel = config.direction === 'inverted' ? '←' : '→';
                const isLinear = Math.abs(config.curveA - 1) < 0.1 && Math.abs(config.curveB - 1) < 0.1 && Math.abs(config.curveMid - 0.5) < 0.05;
                const curveLabel = isLinear ? '' : ` (${config.curveA.toFixed(1)},${config.curveB.toFixed(1)}@${config.curveMid.toFixed(2)})`;
                APP.Toast?.success(`Updated: ${modeLabel} ${dirLabel}${curveLabel} [${config.outputMin}–${config.outputMax}]`);
            }
        },

        /**
         * Draw response curve on canvas using parametric (a, b, m) values
         * @param {HTMLCanvasElement} canvas
         * @param {number} a - Exponent for lower half (0.2-5.0)
         * @param {number} b - Exponent for upper half (0.2-5.0)
         * @param {number} m - Midpoint position (0.1-0.9)
         * @param {boolean} isGamepad - Use gamepad color theme
         */
        _drawCurve(canvas, a = 1, b = 1, m = 0.5, isGamepad = false) {
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const w = canvas.width;
            const h = canvas.height;
            const padding = 10;

            // Clear
            ctx.clearRect(0, 0, w, h);

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, w, h);

            // Grid lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            // Vertical midpoint line (dynamic based on m)
            const midLineX = padding + m * (w - 2 * padding);
            ctx.moveTo(midLineX, padding);
            ctx.lineTo(midLineX, h - padding);
            // Horizontal center
            ctx.moveTo(padding, h / 2);
            ctx.lineTo(w - padding, h / 2);
            ctx.stroke();

            // Linear reference line (diagonal)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(padding, h - padding);
            ctx.lineTo(w - padding, padding);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw the parametric curve
            const color = isGamepad ? '#ffaa00' : '#00d4ff';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();

            const steps = 50;
            for (let i = 0; i <= steps; i++) {
                const x = i / steps;
                const y = APP.InputMap.applyParametricCurve(x, a, b, m);

                const px = padding + x * (w - 2 * padding);
                const py = (h - padding) - y * (h - 2 * padding);

                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.stroke();

            // Draw endpoints
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(padding, h - padding, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(w - padding, padding, 3, 0, Math.PI * 2);
            ctx.fill();

            // Draw midpoint marker (draggable)
            const midY = APP.InputMap.applyParametricCurve(m, a, b, m);
            const midPx = padding + m * (w - 2 * padding);
            const midPy = (h - padding) - midY * (h - 2 * padding);

            // Midpoint outer ring (drag handle)
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(midPx, midPy, 8, 0, Math.PI * 2);
            ctx.stroke();

            // Midpoint inner fill
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(midPx, midPy, 4, 0, Math.PI * 2);
            ctx.fill();

            // Draw drag zone indicators (subtle shading)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            // Left zone (a)
            ctx.fillRect(0, 0, midLineX, h);
        },

        /**
         * Setup canvas dragging for parametric curve adjustment
         * Drag left half = adjust a (vertical), drag right half = adjust b (vertical)
         * Drag midpoint = adjust m (horizontal)
         * Up = higher exp (convex), Down = lower exp (concave)
         */
        _setupCurveDrag(canvas, overlay, isGamepad) {
            if (!canvas) return;

            let isDragging = false;
            let dragMode = null; // 'left', 'right', or 'midpoint'
            let startX = 0;
            let startY = 0;
            let startValue = 1;
            const padding = 10;

            // Get canvas coordinates from mouse event (accounts for CSS scaling)
            const getCanvasCoords = (e, rect) => {
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                return {
                    x: (e.clientX - rect.left) * scaleX,
                    y: (e.clientY - rect.top) * scaleY
                };
            };

            const updatePresetButtons = (a, b, m) => {
                // Clear preset button active states if values don't match a preset
                const presets = APP.InputMap.CurvePresets;
                let matchedPreset = null;
                // Only match preset if midpoint is centered
                if (Math.abs(m - 0.5) < 0.05) {
                    for (const [name, preset] of Object.entries(presets)) {
                        if (Math.abs(a - preset.a) < 0.1 && Math.abs(b - preset.b) < 0.1) {
                            matchedPreset = name;
                            break;
                        }
                    }
                }
                overlay.querySelectorAll('.curve-presets .sm-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.curve === matchedPreset);
                });
            };

            const isNearMidpoint = (canvasX, canvasY) => {
                const m = parseFloat(canvas.dataset.curveMid) || 0.5;
                const a = parseFloat(canvas.dataset.curveA) || 1;
                const b = parseFloat(canvas.dataset.curveB) || 1;
                const w = canvas.width;
                const h = canvas.height;

                // Calculate midpoint position in canvas coordinates
                const midPx = padding + m * (w - 2 * padding);
                const midY = APP.InputMap.applyParametricCurve(m, a, b, m);
                const midPy = (h - padding) - midY * (h - 2 * padding);

                // Check if click is within 15px of midpoint (in canvas coords)
                const dist = Math.sqrt(Math.pow(canvasX - midPx, 2) + Math.pow(canvasY - midPy, 2));
                return dist < 15;
            };

            canvas.addEventListener('pointerdown', (e) => {
                const rect = canvas.getBoundingClientRect();
                const coords = getCanvasCoords(e, rect);
                const m = parseFloat(canvas.dataset.curveMid) || 0.5;

                isDragging = true;

                // Check if dragging midpoint
                if (isNearMidpoint(coords.x, coords.y)) {
                    dragMode = 'midpoint';
                    startX = coords.x;
                    startValue = m;
                    canvas.style.cursor = 'ew-resize';
                } else {
                    // Determine which side of the current midpoint
                    const midPx = padding + m * (canvas.width - 2 * padding);
                    dragMode = coords.x < midPx ? 'left' : 'right';
                    startY = coords.y;
                    startValue = parseFloat(canvas.dataset[dragMode === 'left' ? 'curveA' : 'curveB']) || 1;
                    canvas.style.cursor = 'ns-resize';
                }

                canvas.setPointerCapture(e.pointerId);
            });

            canvas.addEventListener('pointermove', (e) => {
                const rect = canvas.getBoundingClientRect();
                const coords = getCanvasCoords(e, rect);

                if (!isDragging) {
                    // Show appropriate cursor based on hover position
                    if (isNearMidpoint(coords.x, coords.y)) {
                        canvas.style.cursor = 'ew-resize';
                    } else {
                        canvas.style.cursor = 'ns-resize';
                    }
                    return;
                }

                const a = parseFloat(canvas.dataset.curveA) || 1;
                const b = parseFloat(canvas.dataset.curveB) || 1;
                const m = parseFloat(canvas.dataset.curveMid) || 0.5;

                if (dragMode === 'midpoint') {
                    // Horizontal drag for midpoint (in canvas coordinates)
                    const deltaX = coords.x - startX;
                    // Convert pixel delta to normalized value (canvas is 200px wide with 10px padding each side)
                    const drawWidth = canvas.width - 2 * padding;
                    let newMid = startValue + deltaX / drawWidth;
                    newMid = Math.max(0.1, Math.min(0.9, newMid));
                    canvas.dataset.curveMid = newMid;
                    this._drawCurve(canvas, a, b, newMid, isGamepad);
                    updatePresetButtons(a, b, newMid);
                } else {
                    // Vertical drag for a/b
                    const deltaY = startY - coords.y; // Positive = up = more convex
                    const sensitivity = 0.05;
                    let newValue = startValue + deltaY * sensitivity;
                    newValue = Math.max(0.1, Math.min(10, newValue));

                    if (dragMode === 'left') {
                        canvas.dataset.curveA = newValue;
                        this._drawCurve(canvas, newValue, b, m, isGamepad);
                        updatePresetButtons(newValue, b, m);
                    } else {
                        canvas.dataset.curveB = newValue;
                        this._drawCurve(canvas, a, newValue, m, isGamepad);
                        updatePresetButtons(a, newValue, m);
                    }
                }
            });

            canvas.addEventListener('pointerup', (e) => {
                isDragging = false;
                dragMode = null;
                canvas.style.cursor = 'ns-resize';
                canvas.releasePointerCapture(e.pointerId);
            });

            canvas.addEventListener('pointercancel', (e) => {
                isDragging = false;
                dragMode = null;
                canvas.style.cursor = 'ns-resize';
            });

            // Show cursor hint
            canvas.style.cursor = 'ns-resize';
        },

        _deleteMap(mapId, bank) {
            const maps = { ...APP.State.select(`input.banks.${bank}.maps`) };
            delete maps[mapId];
            APP.State.dispatch({ type: `input.banks.${bank}.maps`, payload: maps });
            APP.Toast?.info('Binding deleted');
        },

        _renderBindingCounts() {
            const activeBank = APP.InputHub.getActiveBank();
            const maps = APP.State.select(`input.banks.${activeBank}.maps`) || {};

            let midiCount = 0;
            let gamepadCount = 0;
            let lfoCount = 0;
            let keyboardCount = 0;

            Object.values(maps).forEach(map => {
                if (map.source.type.startsWith('midi')) midiCount++;
                else if (map.source.type.startsWith('gamepad')) gamepadCount++;
                else if (map.source.type === 'lfo') lfoCount++;
                else if (map.source.type.startsWith('keyboard')) keyboardCount++;
            });

            const midiCountEl = document.getElementById('bindingCount');
            const gamepadCountEl = document.getElementById('gamepadBindingCount');
            const lfoCountEl = document.getElementById('lfoBindingCount');
            const keyboardCountEl = document.getElementById('keyboardBindingCount');

            if (midiCountEl) midiCountEl.textContent = `${midiCount} (${activeBank})`;
            if (gamepadCountEl) gamepadCountEl.textContent = `${gamepadCount} (${activeBank})`;
            if (lfoCountEl) lfoCountEl.textContent = `${lfoCount} (${activeBank})`;
            if (keyboardCountEl) keyboardCountEl.textContent = `${keyboardCount} (${activeBank})`;
        }
    };

})(window.APP);
