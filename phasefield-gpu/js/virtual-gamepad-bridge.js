/**
 * Virtual Gamepad Bridge Module
 * Enables cross-tab virtual gamepad via BroadcastChannel
 */

window.Gamepad = window.Gamepad || {};

window.Gamepad.VirtualBridge = (function() {
    'use strict';

    const CHANNEL_NAME = 'phasefield-virtual-gamepad';
    let channel = null;
    let virtualGamepadState = null;
    let isEnabled = true;

    /**
     * Create a virtual gamepad state object that mimics the Gamepad API
     */
    function createEmptyGamepadState() {
        return {
            axes: [0, 0, 0, 0, 0, 0],  // 6 axes (left stick X/Y, right stick X/Y, triggers)
            buttons: Array(16).fill(null).map(() => ({
                pressed: false,
                value: 0,
                touched: false
            })),
            connected: false,
            id: "Virtual Gamepad (Cross-Tab)",
            index: 99,  // Use high index to avoid conflicts with physical gamepads
            timestamp: Date.now(),
            mapping: "standard"
        };
    }

    /**
     * Initialize the BroadcastChannel
     */
    function init() {
        if (!window.BroadcastChannel) {
            console.warn('[VirtualGamepadBridge] BroadcastChannel not supported in this browser');
            isEnabled = false;
            return false;
        }

        try {
            channel = new BroadcastChannel(CHANNEL_NAME);

            channel.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'gamepad-state') {
                    virtualGamepadState = event.data.state;
                    virtualGamepadState.timestamp = Date.now();

                    // Debug log (optional - can be disabled)
                    // console.log('[VirtualGamepadBridge] Received state:', virtualGamepadState);
                }
            });

            // Initialize empty state
            virtualGamepadState = createEmptyGamepadState();

            console.log('[VirtualGamepadBridge] Initialized and listening on channel:', CHANNEL_NAME);
            return true;
        } catch (error) {
            console.error('[VirtualGamepadBridge] Failed to initialize:', error);
            isEnabled = false;
            return false;
        }
    }

    /**
     * Get the current virtual gamepad state
     * Returns null if not connected or disabled
     */
    function getVirtualGamepad() {
        if (!isEnabled || !virtualGamepadState || !virtualGamepadState.connected) {
            return null;
        }
        return virtualGamepadState;
    }

    /**
     * Check if virtual gamepad is connected
     */
    function isConnected() {
        return isEnabled && virtualGamepadState && virtualGamepadState.connected;
    }

    /**
     * Send a test message (for debugging)
     */
    function sendTestMessage() {
        if (!channel) {
            console.warn('[VirtualGamepadBridge] Channel not initialized');
            return;
        }

        const testState = createEmptyGamepadState();
        testState.connected = true;
        testState.buttons[0].pressed = true;
        testState.axes[0] = 0.5;

        channel.postMessage({
            type: 'gamepad-state',
            state: testState
        });

        console.log('[VirtualGamepadBridge] Sent test message');
    }

    /**
     * Disable virtual gamepad
     */
    function disable() {
        isEnabled = false;
        virtualGamepadState = createEmptyGamepadState();
        console.log('[VirtualGamepadBridge] Disabled');
    }

    /**
     * Enable virtual gamepad
     */
    function enable() {
        isEnabled = true;
        console.log('[VirtualGamepadBridge] Enabled');
    }

    /**
     * Cleanup
     */
    function cleanup() {
        if (channel) {
            channel.close();
            channel = null;
        }
        virtualGamepadState = null;
    }

    return {
        init,
        getVirtualGamepad,
        isConnected,
        isEnabled: () => isEnabled,
        enable,
        disable,
        sendTestMessage,
        cleanup
    };
})();
