// CYMATICA.mod.broadcast - External Control Receiver
// Handles BroadcastChannel and postMessage for external controller integration
(function(CYMATICA) {
    'use strict';

    CYMATICA.mod = CYMATICA.mod || {};

    CYMATICA.mod.broadcast = {
        _channel: null,
        _stateChannel: null,
        _values: {},            // External control values by key
        _connected: false,
        _messageCount: 0,

        /**
         * Initialize broadcast receiver
         * @param {string} channelName - BroadcastChannel name (default: 'cymatica-control')
         */
        init(channelName = 'cymatica-control') {
            // Listen for postMessage from parent/host
            window.addEventListener('message', (e) => this._handleMessage(e));

            // Create BroadcastChannel for ControlDeck integration
            try {
                this._channel = new BroadcastChannel(channelName);
                this._channel.onmessage = (e) => this._handleBroadcast(e);

                // Also listen on ControlDeck's default channel
                this._controldeckChannel = new BroadcastChannel('controldeck-default');
                this._controldeckChannel.onmessage = (e) => {
                    console.log('[cymatica.broadcast] RAW message:', e.data);
                    this._handleControlDeck(e);
                };

                // Optional state output channel
                this._stateChannel = new BroadcastChannel(channelName + '-state');

                this._connected = true;
                console.log(`cymatica.mod.broadcast: listening on ${channelName} + controldeck-default`);
            } catch (err) {
                console.warn('cymatica.mod.broadcast: BroadcastChannel not supported');
            }

            CYMATICA.events.publish('broadcast:init', { channelName });
        },

        /**
         * Handle postMessage events
         * @private
         */
        _handleMessage(event) {
            const data = event.data;
            if (!data) return;

            // Accept messages from known sources
            const validSources = ['cymatica', 'plenith', 'plenith-tv', 'pja-host'];
            if (data.source && !validSources.includes(data.source)) return;

            this._messageCount++;

            switch (data.type) {
                case 'game:control':
                    this._handleGameControl(data);
                    break;

                case 'note:on':
                case 'note:off':
                    this._handleNoteEvent(data);
                    break;

                case 'continuous':
                    this._handleContinuous(data);
                    break;

                case 'trigger':
                    this._handleTrigger(data);
                    break;

                case 'channel-init':
                    CYMATICA.events.publish('broadcast:channel-init', data);
                    break;

                case 'mod:lfo':
                    this._handleLFOCommand(data);
                    break;

                case 'mod:asr':
                    this._handleASRCommand(data);
                    break;

                case 'mod:route':
                    this._handleRouteCommand(data);
                    break;
            }
        },

        /**
         * Handle BroadcastChannel messages
         * @private
         */
        _handleBroadcast(event) {
            const data = event.data;
            if (!data) return;

            this._messageCount++;

            switch (data.type) {
                case 'trigger':
                    this._handleTrigger(data);
                    break;

                case 'continuous':
                    this._handleContinuous(data);
                    break;
            }
        },

        /**
         * Handle ControlDeck protocol messages
         * Maps gamepad controls to cymatica actions
         * @private
         */
        _handleControlDeck(event) {
            const data = event.data;
            console.log('[cymatica.broadcast] Received:', data?.control, data?.value);
            if (!data || data._src !== 'controldeck') return;

            this._messageCount++;
            const state = CYMATICA.state._state;

            if (data.type === 'trigger') {
                // Button mappings
                switch (data.control) {
                    case 'start':
                        if (data.pressed) {
                            state.animating = !state.animating;
                            CYMATICA.events.publish('animation:toggled', state.animating);
                        }
                        break;
                    case 'select':
                        if (data.pressed) CYMATICA.state.reset();
                        break;
                    case 'a':
                        if (data.pressed) {
                            state.drawOn = !state.drawOn;
                            state.drawProgress = 0;
                        }
                        break;
                    case 'dpad-up':
                        if (data.pressed) state.targetZoom *= 1.1;
                        break;
                    case 'dpad-down':
                        if (data.pressed) state.targetZoom *= 0.9;
                        break;
                }
                this._handleTrigger(data);
            }

            if (data.type === 'continuous') {
                // Axis mappings: sticks control rotation
                const rawValue = data.raw?.value ?? (data.value * 2 - 1);
                switch (data.control) {
                    case 'left-x':
                        state.targetRotation.y += rawValue * 2;
                        break;
                    case 'left-y':
                        state.targetRotation.x += rawValue * 2;
                        break;
                    case 'right-x':
                        state.targetPanX += rawValue * 5;
                        break;
                    case 'right-y':
                        state.targetPanY += rawValue * 5;
                        break;
                    // Hand tracking from ASCIIVision
                    case 'hand-x':
                        state.targetRotation.y = rawValue * 45;
                        break;
                    case 'hand-y':
                        state.targetRotation.x = rawValue * 45;
                        break;
                    case 'hand-theta':
                        state.targetRotation.z = rawValue * 90;
                        break;
                    case 'hand-spread':
                        state.targetZoom = 0.5 + data.value * 2;
                        break;
                }
                this._handleContinuous(data);
            }
        },

        /**
         * Handle game:control messages (paddle, start, stop, etc.)
         * @private
         */
        _handleGameControl(data) {
            switch (data.action) {
                case 'paddle':
                    // Store paddle value for external source routing
                    const key = `paddle:${data.player || 1}`;
                    this._values[key] = data.value;
                    CYMATICA.events.publish('broadcast:paddle', {
                        player: data.player || 1,
                        value: data.value
                    });
                    break;

                case 'start':
                    CYMATICA.events.publish('broadcast:start');
                    break;

                case 'stop':
                    CYMATICA.events.publish('broadcast:stop');
                    break;

                case 'reset':
                    CYMATICA.state.reset();
                    break;

                case 'pause':
                case 'resume':
                case 'toggle':
                    const state = CYMATICA.state._state;
                    if (data.action === 'toggle') {
                        state.animating = !state.animating;
                    } else {
                        state.animating = data.action === 'resume';
                    }
                    CYMATICA.events.publish('broadcast:animate', { animating: state.animating });
                    break;
            }
        },

        /**
         * Handle note:on / note:off events
         * @private
         */
        _handleNoteEvent(data) {
            const pressed = data.type === 'note:on' && (data.velocity || 127) > 0;
            const noteKey = `note:${data.channel || 0}:${data.note}`;

            // Store velocity for external routing
            this._values[noteKey] = pressed ? (data.velocity || 127) / 127 : 0;

            // Trigger any ASRs listening to this note
            const state = CYMATICA.state._state;
            const asrs = state.mod?.asrs || {};

            Object.values(asrs).forEach(asr => {
                if (asr.triggerChannel === noteKey || asr.triggerChannel === `note:${data.note}`) {
                    CYMATICA.mod.asr.trigger(asr.id, pressed);
                }
            });

            CYMATICA.events.publish('broadcast:note', {
                note: data.note,
                channel: data.channel || 0,
                velocity: data.velocity || 127,
                pressed
            });
        },

        /**
         * Handle continuous control messages
         * @private
         */
        _handleContinuous(data) {
            const key = data.control || data.key || 'unknown';
            this._values[key] = data.value;

            CYMATICA.events.publish('broadcast:continuous', {
                control: key,
                value: data.value
            });
        },

        /**
         * Handle trigger (impulse) messages
         * @private
         */
        _handleTrigger(data) {
            const pressed = data.pressed !== false;
            const control = data.control || 'trigger';

            // Trigger any ASRs listening to this control
            const state = CYMATICA.state._state;
            const asrs = state.mod?.asrs || {};

            Object.values(asrs).forEach(asr => {
                if (asr.triggerChannel === control) {
                    CYMATICA.mod.asr.trigger(asr.id, pressed);
                }
            });

            CYMATICA.events.publish('broadcast:trigger', { control, pressed });
        },

        /**
         * Handle LFO configuration commands
         * @private
         */
        _handleLFOCommand(data) {
            const state = CYMATICA.state._state;
            state.mod = state.mod || { lfos: {}, asrs: {}, routes: [], enabled: true };

            switch (data.action) {
                case 'create':
                    const lfo = CYMATICA.mod.lfo.createLFO(data.config);
                    state.mod.lfos[lfo.id] = lfo;
                    break;

                case 'update':
                    if (state.mod.lfos[data.id]) {
                        Object.assign(state.mod.lfos[data.id], data.config);
                    }
                    break;

                case 'remove':
                    delete state.mod.lfos[data.id];
                    CYMATICA.mod.lfo.remove(data.id);
                    break;
            }
        },

        /**
         * Handle ASR configuration commands
         * @private
         */
        _handleASRCommand(data) {
            const state = CYMATICA.state._state;
            state.mod = state.mod || { lfos: {}, asrs: {}, routes: [], enabled: true };

            switch (data.action) {
                case 'create':
                    const asr = CYMATICA.mod.asr.createASR(data.config);
                    state.mod.asrs[asr.id] = asr;
                    break;

                case 'update':
                    if (state.mod.asrs[data.id]) {
                        Object.assign(state.mod.asrs[data.id], data.config);
                    }
                    break;

                case 'remove':
                    delete state.mod.asrs[data.id];
                    CYMATICA.mod.asr.remove(data.id);
                    break;

                case 'trigger':
                    CYMATICA.mod.asr.trigger(data.id, data.pressed);
                    break;
            }
        },

        /**
         * Handle route configuration commands
         * @private
         */
        _handleRouteCommand(data) {
            switch (data.action) {
                case 'create':
                    CYMATICA.mod.hub.addRoute(data.config);
                    break;

                case 'update':
                    const state = CYMATICA.state._state;
                    const route = state.mod?.routes?.find(r => r.id === data.id);
                    if (route) {
                        Object.assign(route, data.config);
                    }
                    break;

                case 'remove':
                    CYMATICA.mod.hub.removeRoute(data.id);
                    break;
            }
        },

        /**
         * Get value of an external control
         * @param {string} key - Control key
         * @returns {number|undefined}
         */
        getValue(key) {
            return this._values[key];
        },

        /**
         * Get all current values
         * @returns {object}
         */
        getValues() {
            return { ...this._values };
        },

        /**
         * Check if connected
         * @returns {boolean}
         */
        isConnected() {
            return this._connected;
        },

        /**
         * Get message count (for debugging)
         * @returns {number}
         */
        getMessageCount() {
            return this._messageCount;
        },

        /**
         * Send message to host/parent
         * @param {string} type - Message type
         * @param {object} data - Message data
         */
        send(type, data = {}) {
            const msg = {
                source: 'cymatica',
                type,
                timestamp: Date.now(),
                ...data
            };

            // Send via BroadcastChannel
            if (this._stateChannel) {
                this._stateChannel.postMessage(msg);
            }

            // Send to parent window
            if (window.parent !== window) {
                window.parent.postMessage(msg, '*');
            }
        },

        /**
         * Send current state snapshot
         */
        sendState() {
            const state = CYMATICA.state._state;
            this.send('state:snapshot', {
                rotation: { ...state.rotation },
                zoom: state.zoom,
                panX: state.panX,
                panY: state.panY,
                animating: state.animating
            });
        }
    };

})(window.CYMATICA);
