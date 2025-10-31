/**
 * GamepadInputSystem.js
 *
 * Context-aware gamepad input system for vecterm
 * - Controls game entities during gameplay
 * - Controls 3D camera in idle/3D mode
 * - Polls Gamepad API on animation frames
 * - Dispatches Redux actions based on current mode
 */

export class GamepadInputSystem {
  constructor(store, mappings = null) {
    this.store = store;
    this.mappings = mappings;
    this.deadzone = 0.15;

    // Track button states to detect press/release edges
    this.previousButtonStates = {};
    this.previousAxisValues = {};

    // Gamepad connection state
    this.gamepadIndex = null;
    this.connected = false;

    // Bind methods
    this.poll = this.poll.bind(this);
    this.onGamepadConnected = this.onGamepadConnected.bind(this);
    this.onGamepadDisconnected = this.onGamepadDisconnected.bind(this);
  }

  /**
   * Initialize the system and set up event listeners
   */
  init() {
    // Listen for gamepad connection events
    window.addEventListener('gamepadconnected', this.onGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected);

    // Check if a gamepad is already connected
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this.onGamepadConnected({ gamepad: gamepads[i] });
        break;
      }
    }
  }

  /**
   * Handle gamepad connection
   */
  onGamepadConnected(event) {
    const gamepad = event.gamepad;
    this.gamepadIndex = gamepad.index;
    this.connected = true;

    console.log(`Gamepad connected: ${gamepad.id} (index ${gamepad.index})`);

    // Dispatch Redux action
    if (this.store) {
      this.store.dispatch({
        type: 'GAMEPAD_CONNECTED',
        payload: {
          index: gamepad.index,
          id: gamepad.id,
          mapping: gamepad.mapping,
          buttons: gamepad.buttons.length,
          axes: gamepad.axes.length
        }
      });
    }
  }

  /**
   * Handle gamepad disconnection
   */
  onGamepadDisconnected(event) {
    if (event.gamepad.index === this.gamepadIndex) {
      console.log(`Gamepad disconnected: ${event.gamepad.id}`);
      this.gamepadIndex = null;
      this.connected = false;
      this.previousButtonStates = {};
      this.previousAxisValues = {};

      // Dispatch Redux action
      if (this.store) {
        this.store.dispatch({
          type: 'GAMEPAD_DISCONNECTED'
        });
      }
    }
  }

  /**
   * Poll gamepad state (call this in animation loop)
   */
  poll() {
    if (!this.connected || this.gamepadIndex === null) {
      return;
    }

    const state = this.store.getState();
    const gamepadState = state.gamepad || {};

    // Check if gamepad input is enabled
    if (gamepadState.enabled === false) {
      return;
    }

    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[this.gamepadIndex];

    if (!gamepad) {
      return;
    }

    // Get current app mode to determine control target
    const mode = state.uiState?.mode || 'idle';
    const isGameMode = mode === 'game' || mode === '2d';

    // Get active mapping preset
    const activePreset = gamepadState.activePreset || 'xbox';
    const mappings = gamepadState.mappings || this.mappings || {};
    const mapping = mappings[activePreset] || mappings.xbox || {};

    // Process inputs based on mode
    if (isGameMode) {
      this.processGameInput(gamepad, mapping.game || {});
    } else {
      this.processCameraInput(gamepad, mapping.camera || {});
    }
  }

  /**
   * Process gamepad input for game entity control
   */
  processGameInput(gamepad, mapping) {
    // Process buttons
    this.processButtons(gamepad, mapping.buttons || {}, 'game');

    // Process analog sticks for movement
    this.processAnalogMovement(gamepad, mapping.axes || {});
  }

  /**
   * Process gamepad input for camera control
   */
  processCameraInput(gamepad, mapping) {
    // Process buttons (e.g., reset camera, toggle grid)
    this.processButtons(gamepad, mapping.buttons || {}, 'camera');

    // Process analog sticks for camera orbit/zoom
    this.processAnalogCamera(gamepad, mapping.axes || {});
  }

  /**
   * Process button presses with edge detection
   */
  processButtons(gamepad, buttonMapping, mode) {
    gamepad.buttons.forEach((button, index) => {
      const wasPressed = this.previousButtonStates[index] || false;
      const isPressed = button.pressed;

      // Detect edges
      const justPressed = isPressed && !wasPressed;
      const justReleased = !isPressed && wasPressed;

      // Update state
      this.previousButtonStates[index] = isPressed;

      // Get action for this button
      const action = buttonMapping[index];
      if (!action) return;

      // Dispatch appropriate action based on mode
      if (mode === 'game') {
        if (justPressed) {
          this.store.dispatch({
            type: 'PLAYER_INPUT',
            payload: {
              playerId: 1, // Single gamepad maps to player 1
              action: action,
              pressed: true
            }
          });
        } else if (justReleased) {
          this.store.dispatch({
            type: 'PLAYER_INPUT',
            payload: {
              playerId: 1,
              action: action,
              pressed: false
            }
          });
        }
      } else if (mode === 'camera') {
        if (justPressed) {
          this.dispatchCameraAction(action);
        }
      }
    });
  }

  /**
   * Process analog sticks for game entity movement
   */
  processAnalogMovement(gamepad, axesMapping) {
    // Left stick (typically axes 0 and 1)
    const leftX = this.applyDeadzone(gamepad.axes[0] || 0);
    const leftY = this.applyDeadzone(gamepad.axes[1] || 0);

    // Right stick (typically axes 2 and 3)
    const rightX = this.applyDeadzone(gamepad.axes[2] || 0);
    const rightY = this.applyDeadzone(gamepad.axes[3] || 0);

    // Dispatch movement actions if analog sticks moved
    if (Math.abs(leftX) > 0 || Math.abs(leftY) > 0) {
      this.store.dispatch({
        type: 'GAMEPAD_ANALOG_MOVEMENT',
        payload: {
          playerId: 1,
          x: leftX,
          y: leftY
        }
      });
    }

    // Right stick can be used for aiming or secondary actions
    if (Math.abs(rightX) > 0 || Math.abs(rightY) > 0) {
      this.store.dispatch({
        type: 'GAMEPAD_ANALOG_AIM',
        payload: {
          playerId: 1,
          x: rightX,
          y: rightY
        }
      });
    }
  }

  /**
   * Process analog sticks for camera control
   */
  processAnalogCamera(gamepad, axesMapping) {
    // Left stick - camera orbit
    const orbitX = this.applyDeadzone(gamepad.axes[0] || 0);
    const orbitY = this.applyDeadzone(gamepad.axes[1] || 0);

    // Right stick - camera zoom/pan
    const zoomY = this.applyDeadzone(gamepad.axes[3] || 0);

    // D-pad (axes 9 and 10 on some controllers, or buttons)
    // Handled in button processing

    // Dispatch camera control actions
    if (Math.abs(orbitX) > 0 || Math.abs(orbitY) > 0) {
      this.store.dispatch({
        type: 'CAMERA_ORBIT',
        payload: {
          horizontal: orbitX * 0.05, // Sensitivity multiplier
          vertical: orbitY * 0.05
        }
      });
    }

    if (Math.abs(zoomY) > 0) {
      this.store.dispatch({
        type: 'CAMERA_ZOOM',
        payload: {
          delta: -zoomY * 0.5 // Invert Y and apply sensitivity
        }
      });
    }
  }

  /**
   * Apply deadzone to analog axis value
   */
  applyDeadzone(value) {
    if (Math.abs(value) < this.deadzone) {
      return 0;
    }
    // Rescale to 0-1 range after deadzone
    const sign = Math.sign(value);
    const magnitude = Math.abs(value);
    return sign * ((magnitude - this.deadzone) / (1 - this.deadzone));
  }

  /**
   * Dispatch camera-specific action based on button mapping
   */
  dispatchCameraAction(action) {
    switch (action) {
      case 'reset':
        this.store.dispatch({ type: 'CAMERA_RESET' });
        break;
      case 'grid_toggle':
        this.store.dispatch({ type: 'GRID_TOGGLE' });
        break;
      case 'zoom_in':
        this.store.dispatch({
          type: 'CAMERA_ZOOM',
          payload: { delta: -1 }
        });
        break;
      case 'zoom_out':
        this.store.dispatch({
          type: 'CAMERA_ZOOM',
          payload: { delta: 1 }
        });
        break;
      default:
        console.log(`Unknown camera action: ${action}`);
    }
  }

  /**
   * Cleanup and remove event listeners
   */
  destroy() {
    window.removeEventListener('gamepadconnected', this.onGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected);
  }
}
