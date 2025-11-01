/**
 * MIDI Context - Redux State Management for MIDI
 *
 * Manages MIDI controller state including:
 * - Connected devices (hardware)
 * - Visual controller state
 * - Control mappings (knobs/sliders/buttons → parameters)
 * - MIDI learn mode
 * - Transport state
 */

// MIDI State Shape
export const initialMidiState = {
  // Hardware devices
  devices: {
    inputs: [],  // Available MIDI input devices
    outputs: [], // Available MIDI output devices
    selected: null // Currently selected device ID
  },

  // Visual controller state
  visual: {
    visible: false,
    position: { x: 20, y: 100 },
    size: { width: 400, height: 600 }
  },

  // Controller values (0-127 MIDI range, normalized to 0-1 internally)
  controls: {
    // 8 Knobs (1k-8k)
    '1k': 0, '2k': 0, '3k': 0, '4k': 0,
    '5k': 0, '6k': 0, '7k': 0, '8k': 0,

    // 8 Sliders (1s-8s)
    '1s': 0, '2s': 0, '3s': 0, '4s': 0,
    '5s': 0, '6s': 0, '7s': 0, '8s': 0,

    // 4 Buttons (1-4 for each: a,b,c,d)
    '1a': false, '1b': false, '1c': false, '1d': false,
    '2a': false, '2b': false, '2c': false, '2d': false,
    '3a': false, '3b': false, '3c': false, '3d': false,
    '4a': false, '4b': false, '4c': false, '4d': false
  },

  // MIDI CC mappings (controlId → vecterm parameter path)
  mappings: {
    // Example:
    // '1k': 'tines.volume.drone',
    // '2k': 'tines.adsr.bells.attack',
    // '1s': 'tines.bpm'
  },

  // MIDI learn mode
  learn: {
    active: false,
    targetParameter: null,
    waitingForInput: false
  },

  // Transport controls
  transport: {
    playing: false,
    recording: false,
    tempo: 120
  },

  // MIDI settings
  settings: {
    channel: 1, // MIDI channel (1-16)
    ccOffset: 0, // CC number offset for knobs/sliders
    velocity: 100 // Default velocity for note messages
  }
};

// Action Types
export const MIDI_ACTIONS = {
  // Device management
  MIDI_DEVICES_DETECTED: 'MIDI_DEVICES_DETECTED',
  MIDI_DEVICE_CONNECTED: 'MIDI_DEVICE_CONNECTED',
  MIDI_DEVICE_DISCONNECTED: 'MIDI_DEVICE_DISCONNECTED',
  MIDI_DEVICE_SELECT: 'MIDI_DEVICE_SELECT',

  // Visual controller
  MIDI_VISUAL_TOGGLE: 'MIDI_VISUAL_TOGGLE',
  MIDI_VISUAL_MOVE: 'MIDI_VISUAL_MOVE',
  MIDI_VISUAL_RESIZE: 'MIDI_VISUAL_RESIZE',

  // Control values
  MIDI_CONTROL_CHANGE: 'MIDI_CONTROL_CHANGE',
  MIDI_BUTTON_PRESS: 'MIDI_BUTTON_PRESS',
  MIDI_BUTTON_RELEASE: 'MIDI_BUTTON_RELEASE',

  // Mappings
  MIDI_MAP_CONTROL: 'MIDI_MAP_CONTROL',
  MIDI_UNMAP_CONTROL: 'MIDI_UNMAP_CONTROL',
  MIDI_RESET_MAPPINGS: 'MIDI_RESET_MAPPINGS',

  // MIDI learn
  MIDI_LEARN_START: 'MIDI_LEARN_START',
  MIDI_LEARN_COMPLETE: 'MIDI_LEARN_COMPLETE',
  MIDI_LEARN_CANCEL: 'MIDI_LEARN_CANCEL',

  // Transport
  MIDI_TRANSPORT_PLAY: 'MIDI_TRANSPORT_PLAY',
  MIDI_TRANSPORT_STOP: 'MIDI_TRANSPORT_STOP',
  MIDI_TRANSPORT_RECORD: 'MIDI_TRANSPORT_RECORD',
  MIDI_TRANSPORT_TEMPO: 'MIDI_TRANSPORT_TEMPO'
};

// Action Creators
export const midiActions = {
  // Devices
  devicesDetected: (inputs, outputs) => ({
    type: MIDI_ACTIONS.MIDI_DEVICES_DETECTED,
    payload: { inputs, outputs }
  }),

  deviceConnected: (device) => ({
    type: MIDI_ACTIONS.MIDI_DEVICE_CONNECTED,
    payload: device
  }),

  deviceDisconnected: (deviceId) => ({
    type: MIDI_ACTIONS.MIDI_DEVICE_DISCONNECTED,
    payload: deviceId
  }),

  selectDevice: (deviceId) => ({
    type: MIDI_ACTIONS.MIDI_DEVICE_SELECT,
    payload: deviceId
  }),

  // Visual controller
  toggleVisual: (visible) => ({
    type: MIDI_ACTIONS.MIDI_VISUAL_TOGGLE,
    payload: visible
  }),

  moveVisual: (x, y) => ({
    type: MIDI_ACTIONS.MIDI_VISUAL_MOVE,
    payload: { x, y }
  }),

  resizeVisual: (width, height) => ({
    type: MIDI_ACTIONS.MIDI_VISUAL_RESIZE,
    payload: { width, height }
  }),

  // Controls
  controlChange: (controlId, value) => ({
    type: MIDI_ACTIONS.MIDI_CONTROL_CHANGE,
    payload: { controlId, value }
  }),

  buttonPress: (buttonId) => ({
    type: MIDI_ACTIONS.MIDI_BUTTON_PRESS,
    payload: buttonId
  }),

  buttonRelease: (buttonId) => ({
    type: MIDI_ACTIONS.MIDI_BUTTON_RELEASE,
    payload: buttonId
  }),

  // Mappings
  mapControl: (controlId, parameter) => ({
    type: MIDI_ACTIONS.MIDI_MAP_CONTROL,
    payload: { controlId, parameter }
  }),

  unmapControl: (controlId) => ({
    type: MIDI_ACTIONS.MIDI_UNMAP_CONTROL,
    payload: controlId
  }),

  resetMappings: () => ({
    type: MIDI_ACTIONS.MIDI_RESET_MAPPINGS
  }),

  // MIDI Learn
  startLearn: (parameter) => ({
    type: MIDI_ACTIONS.MIDI_LEARN_START,
    payload: parameter
  }),

  completeLearn: (controlId, parameter) => ({
    type: MIDI_ACTIONS.MIDI_LEARN_COMPLETE,
    payload: { controlId, parameter }
  }),

  cancelLearn: () => ({
    type: MIDI_ACTIONS.MIDI_LEARN_CANCEL
  }),

  // Transport
  transportPlay: () => ({
    type: MIDI_ACTIONS.MIDI_TRANSPORT_PLAY
  }),

  transportStop: () => ({
    type: MIDI_ACTIONS.MIDI_TRANSPORT_STOP
  }),

  transportRecord: (recording) => ({
    type: MIDI_ACTIONS.MIDI_TRANSPORT_RECORD,
    payload: recording
  }),

  setTempo: (tempo) => ({
    type: MIDI_ACTIONS.MIDI_TRANSPORT_TEMPO,
    payload: tempo
  })
};

// Reducer
export function midiReducer(state = initialMidiState, action) {
  switch (action.type) {
    case MIDI_ACTIONS.MIDI_DEVICES_DETECTED:
      return {
        ...state,
        devices: {
          ...state.devices,
          inputs: action.payload.inputs,
          outputs: action.payload.outputs
        }
      };

    case MIDI_ACTIONS.MIDI_DEVICE_CONNECTED:
      return {
        ...state,
        devices: {
          ...state.devices,
          inputs: [...state.devices.inputs, action.payload]
        }
      };

    case MIDI_ACTIONS.MIDI_DEVICE_DISCONNECTED:
      return {
        ...state,
        devices: {
          ...state.devices,
          inputs: state.devices.inputs.filter(d => d.id !== action.payload),
          selected: state.devices.selected === action.payload ? null : state.devices.selected
        }
      };

    case MIDI_ACTIONS.MIDI_DEVICE_SELECT:
      return {
        ...state,
        devices: {
          ...state.devices,
          selected: action.payload
        }
      };

    case MIDI_ACTIONS.MIDI_VISUAL_TOGGLE:
      return {
        ...state,
        visual: {
          ...state.visual,
          visible: action.payload
        }
      };

    case MIDI_ACTIONS.MIDI_VISUAL_MOVE:
      return {
        ...state,
        visual: {
          ...state.visual,
          position: action.payload
        }
      };

    case MIDI_ACTIONS.MIDI_VISUAL_RESIZE:
      return {
        ...state,
        visual: {
          ...state.visual,
          size: action.payload
        }
      };

    case MIDI_ACTIONS.MIDI_CONTROL_CHANGE:
      return {
        ...state,
        controls: {
          ...state.controls,
          [action.payload.controlId]: action.payload.value
        }
      };

    case MIDI_ACTIONS.MIDI_BUTTON_PRESS:
      return {
        ...state,
        controls: {
          ...state.controls,
          [action.payload]: true
        }
      };

    case MIDI_ACTIONS.MIDI_BUTTON_RELEASE:
      return {
        ...state,
        controls: {
          ...state.controls,
          [action.payload]: false
        }
      };

    case MIDI_ACTIONS.MIDI_MAP_CONTROL:
      return {
        ...state,
        mappings: {
          ...state.mappings,
          [action.payload.controlId]: action.payload.parameter
        }
      };

    case MIDI_ACTIONS.MIDI_UNMAP_CONTROL:
      const { [action.payload]: removed, ...remainingMappings } = state.mappings;
      return {
        ...state,
        mappings: remainingMappings
      };

    case MIDI_ACTIONS.MIDI_RESET_MAPPINGS:
      return {
        ...state,
        mappings: {}
      };

    case MIDI_ACTIONS.MIDI_LEARN_START:
      return {
        ...state,
        learn: {
          active: true,
          targetParameter: action.payload,
          waitingForInput: true
        }
      };

    case MIDI_ACTIONS.MIDI_LEARN_COMPLETE:
      return {
        ...state,
        learn: {
          active: false,
          targetParameter: null,
          waitingForInput: false
        },
        mappings: {
          ...state.mappings,
          [action.payload.controlId]: action.payload.parameter
        }
      };

    case MIDI_ACTIONS.MIDI_LEARN_CANCEL:
      return {
        ...state,
        learn: {
          active: false,
          targetParameter: null,
          waitingForInput: false
        }
      };

    case MIDI_ACTIONS.MIDI_TRANSPORT_PLAY:
      return {
        ...state,
        transport: {
          ...state.transport,
          playing: true
        }
      };

    case MIDI_ACTIONS.MIDI_TRANSPORT_STOP:
      return {
        ...state,
        transport: {
          ...state.transport,
          playing: false,
          recording: false
        }
      };

    case MIDI_ACTIONS.MIDI_TRANSPORT_RECORD:
      return {
        ...state,
        transport: {
          ...state.transport,
          recording: action.payload
        }
      };

    case MIDI_ACTIONS.MIDI_TRANSPORT_TEMPO:
      return {
        ...state,
        transport: {
          ...state.transport,
          tempo: action.payload
        }
      };

    default:
      return state;
  }
}
