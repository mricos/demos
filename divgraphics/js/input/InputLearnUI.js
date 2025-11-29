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
            // Track press start
            document.addEventListener('pointerdown', (e) => {
                const controlGroup = e.target.closest('.control-group:not(.checkbox-group)');
                if (!controlGroup) return;

                const input = controlGroup.querySelector('input[type="range"], input[type="color"]');
                if (!input) return;

                this._pressTarget = { controlGroup, input, x: e.clientX, y: e.clientY };

                this._pressTimer = setTimeout(() => {
                    this._handleLongPress(this._pressTarget);
                }, LONG_PRESS_DURATION);
            });

            // Cancel on move (user is dragging slider)
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
                this._cancelLongPress();
            });

            // Cancel on pointer leave
            document.addEventListener('pointercancel', () => {
                this._cancelLongPress();
            });

            // Click outside while in learn mode clears target
            document.addEventListener('click', (e) => {
                if (e.target.closest('.learn-mode-btn')) return;
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
            const { controlGroup, input } = pressTarget;
            this._pressTimer = null;
            this._pressTarget = null;

            // Determine which source to use based on what's connected
            const midiConnected = APP.MIDI?.activeInput;
            const gamepadConnected = APP.Gamepad?.activeGamepad;

            let source;
            if (midiConnected && gamepadConnected) {
                source = 'midi'; // Default to MIDI when both connected
            } else if (midiConnected) {
                source = 'midi';
            } else if (gamepadConnected) {
                source = 'gamepad';
            } else {
                APP.Toast.info('Connect MIDI or Gamepad first');
                return;
            }

            // Clear any previous target
            this._clearTarget();

            // Get parameter definition
            const param = APP.ParameterRegistry.get(input.id);
            if (!param) {
                APP.Toast.info(`Cannot bind: ${input.id}`);
                return;
            }

            // Set new target
            this.currentTarget = { elementId: input.id, controlGroup, source, param };
            this.selectedMode = 'increment';

            // Visual feedback
            controlGroup.classList.add('learn-active');

            // Show mode selector
            this._showModeSelector(controlGroup, source);

            // Subscribe to input events for learn mode
            this._startListening();

            APP.Toast.info(`Long-press detected. Move ${source.toUpperCase()} control...`);
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
         * @returns {boolean} true to intercept (prevent normal routing)
         */
        _handleInputEvent(event) {
            const target = this.currentTarget;
            if (!target) return false;

            // Only handle events from the expected source
            if (event.source !== target.source) return false;

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

            // Create the binding
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

            const color = source === 'gamepad' ? 'gamepad' : 'midi';

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
                const { controlGroup } = this.currentTarget;
                controlGroup.classList.remove('learn-active');
            }
            this._hideModeSelector();
            this._stopListening();
            this.currentTarget = null;
        },

        // ================================================================
        // Subscribe to state changes
        // ================================================================

        _subscribeToState() {
            // Maps changed - update badges
            APP.State.subscribe('input.maps', () => {
                this._renderBadges();
                this._renderBindingCounts();
                // Clear target after successful bind
                if (this.currentTarget) {
                    this._clearTarget();
                }
            });
        },

        // ================================================================
        // Render
        // ================================================================

        _render() {
            this._renderBadges();
            this._renderBindingCounts();
        },

        _renderBadges() {
            // Clear existing badges
            document.querySelectorAll('.binding-badges').forEach(el => el.remove());

            const maps = APP.State.select('input.maps') || {};

            // Group maps by elementId
            const mapsByElement = {};
            Object.values(maps).forEach(map => {
                const elId = map.target.elementId;
                if (!mapsByElement[elId]) mapsByElement[elId] = [];
                mapsByElement[elId].push(map);
            });

            // Create badges for each element
            Object.entries(mapsByElement).forEach(([elementId, elementMaps]) => {
                const el = document.getElementById(elementId);
                if (!el) return;

                const controlGroup = el.closest('.control-group');
                if (!controlGroup) return;

                const label = controlGroup.querySelector('label');
                if (!label) return;

                // Create badge container
                const badgeContainer = document.createElement('span');
                badgeContainer.className = 'binding-badges';

                // Check for MIDI and Gamepad bindings
                const midiMap = elementMaps.find(m => m.source.type.startsWith('midi'));
                const gamepadMap = elementMaps.find(m => m.source.type.startsWith('gamepad'));

                if (midiMap) {
                    const badge = document.createElement('span');
                    badge.className = 'binding-badge midi';
                    badge.textContent = 'M';
                    badge.title = 'MIDI bound - click to edit';
                    badge.dataset.mapId = midiMap.id;
                    badgeContainer.appendChild(badge);
                }

                if (gamepadMap) {
                    const badge = document.createElement('span');
                    badge.className = 'binding-badge gamepad';
                    badge.textContent = 'G';
                    badge.title = 'Gamepad bound - click to edit';
                    badge.dataset.mapId = gamepadMap.id;
                    badgeContainer.appendChild(badge);
                }

                if (badgeContainer.children.length > 0) {
                    // Use event delegation for badge clicks
                    badgeContainer.addEventListener('click', (e) => {
                        const badge = e.target.closest('.binding-badge');
                        if (badge) {
                            e.stopPropagation();
                            const mapId = badge.dataset.mapId;
                            const map = (APP.State.select('input.maps') || {})[mapId];
                            if (map) this._showMapEditor(map);
                        }
                    });
                    label.appendChild(badgeContainer);
                }
            });
        },

        // ================================================================
        // Map Editor Popup
        // ================================================================

        _showMapEditor(map) {
            this._hideMapEditor();

            const isGamepad = map.source.type.startsWith('gamepad');
            const sourceLabel = isGamepad ? 'Gamepad' : 'MIDI';
            const valueClass = isGamepad ? 'gamepad' : '';

            const overlay = document.createElement('div');
            overlay.className = 'map-editor-overlay';
            overlay.innerHTML = `
                <div class="map-editor">
                    <div class="map-editor-header">
                        <span class="map-editor-title">${sourceLabel} Binding</span>
                        <button class="map-editor-close">&times;</button>
                    </div>
                    <div class="map-editor-row">
                        <span class="map-editor-label">Target</span>
                        <span class="map-editor-value ${valueClass}">${map.target.elementId}</span>
                    </div>
                    <div class="map-editor-row">
                        <span class="map-editor-label">Source</span>
                        <span class="map-editor-value ${valueClass}">${map.source.key}</span>
                    </div>
                    <div class="map-editor-row">
                        <span class="map-editor-label">Type</span>
                        <span class="map-editor-value ${valueClass}">${map.source.type}</span>
                    </div>
                    <div class="map-editor-row">
                        <span class="map-editor-label">Mode</span>
                        <span class="map-editor-value ${valueClass}">${map.behavior.mode}</span>
                    </div>
                    <div class="map-editor-row">
                        <span class="map-editor-label">Range</span>
                        <span class="map-editor-range">
                            <input type="number" class="map-editor-input" id="mapMin" value="${map.domain.outputMin}">
                            <span class="map-editor-separator">-</span>
                            <input type="number" class="map-editor-input" id="mapMax" value="${map.domain.outputMax}">
                        </span>
                    </div>
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

            // Save button
            overlay.querySelector('.map-editor-btn.save').addEventListener('click', () => {
                const minInput = overlay.querySelector('#mapMin');
                const maxInput = overlay.querySelector('#mapMax');
                const newMin = parseInt(minInput.value, 10);
                const newMax = parseInt(maxInput.value, 10);

                if (!isNaN(newMin) && !isNaN(newMax)) {
                    this._saveMap(map.id, newMin, newMax);
                    this._hideMapEditor();
                }
            });

            // Delete button
            overlay.querySelector('.map-editor-btn.delete').addEventListener('click', () => {
                this._deleteMap(map.id);
                this._hideMapEditor();
            });

            document.body.appendChild(overlay);
        },

        _hideMapEditor() {
            document.querySelectorAll('.map-editor-overlay').forEach(el => el.remove());
        },

        _saveMap(mapId, newMin, newMax) {
            const maps = { ...APP.State.select('input.maps') };
            if (maps[mapId]) {
                maps[mapId] = {
                    ...maps[mapId],
                    domain: {
                        ...maps[mapId].domain,
                        outputMin: newMin,
                        outputMax: newMax
                    }
                };
                APP.State.dispatch({ type: 'input.maps', payload: maps });
                APP.Toast.success(`Range updated: ${newMin} - ${newMax}`);
            }
        },

        _deleteMap(mapId) {
            const maps = { ...APP.State.select('input.maps') };
            delete maps[mapId];
            APP.State.dispatch({ type: 'input.maps', payload: maps });
            APP.Toast.info('Binding deleted');
        },

        _renderBindingCounts() {
            const maps = APP.State.select('input.maps') || {};

            let midiCount = 0;
            let gamepadCount = 0;

            Object.values(maps).forEach(map => {
                if (map.source.type.startsWith('midi')) midiCount++;
                else if (map.source.type.startsWith('gamepad')) gamepadCount++;
            });

            const midiCountEl = document.getElementById('bindingCount');
            const gamepadCountEl = document.getElementById('gamepadBindingCount');

            if (midiCountEl) midiCountEl.textContent = midiCount;
            if (gamepadCountEl) gamepadCountEl.textContent = gamepadCount;
        }
    };

})(window.APP);
