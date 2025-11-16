/**
 * MIDI Controller - Web MIDI API Integration
 *
 * Handles communication with physical MIDI hardware devices
 * Maps MIDI CC messages to vecterm controls
 */

import { midiActions } from './midi-context.js';

export class MIDIController {
  constructor(store) {
    this.store = store;
    this.midiAccess = null;
    this.activeInputs = new Map();
    this.activeOutputs = new Map();
    this.ccToControlMap = this.initializeCCMapping();
  }

  /**
   * Initialize default CC number to control ID mapping
   * Can be customized by user
   */
  initializeCCMapping() {
    return {
      // Knobs: CC 1-8
      1: '1k', 2: '2k', 3: '3k', 4: '4k',
      5: '5k', 6: '6k', 7: '7k', 8: '8k',

      // Sliders: CC 10-17
      10: '1s', 11: '2s', 12: '3s', 13: '4s',
      14: '5s', 15: '6s', 16: '7s', 17: '8s',

      // Buttons: CC 20-35 (note on/off also supported)
      20: '1a', 21: '1b', 22: '1c', 23: '1d',
      24: '2a', 25: '2b', 26: '2c', 27: '2d',
      28: '3a', 29: '3b', 30: '3c', 31: '3d',
      32: '4a', 33: '4b', 34: '4c', 35: '4d'
    };
  }

  /**
   * Initialize Web MIDI API
   */
  async initialize() {
    if (!navigator.requestMIDIAccess) {
      console.error('Web MIDI API not supported in this browser');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });

      // Set up device detection
      this.midiAccess.onstatechange = this.handleStateChange.bind(this);

      // Detect initial devices
      this.detectDevices();

      console.log('✓ MIDI Controller initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize MIDI:', error);
      return false;
    }
  }

  /**
   * Detect connected MIDI devices
   */
  detectDevices() {
    const inputs = [];
    const outputs = [];

    console.log('[MIDI] Scanning for devices...');
    console.log('[MIDI] Total inputs available:', this.midiAccess.inputs.size);
    console.log('[MIDI] Total outputs available:', this.midiAccess.outputs.size);

    // Scan inputs
    for (const input of this.midiAccess.inputs.values()) {
      console.log('[MIDI] Found input:', input.name, input.manufacturer, input.state);
      inputs.push({
        id: input.id,
        name: input.name,
        manufacturer: input.manufacturer,
        state: input.state,
        connection: input.connection
      });
      this.setupInput(input);
    }

    // Scan outputs
    for (const output of this.midiAccess.outputs.values()) {
      console.log('[MIDI] Found output:', output.name, output.manufacturer, output.state);
      outputs.push({
        id: output.id,
        name: output.name,
        manufacturer: output.manufacturer,
        state: output.state,
        connection: output.connection
      });
      this.activeOutputs.set(output.id, output);
    }

    console.log('[MIDI] Dispatching MIDI_DEVICES_DETECTED with', inputs.length, 'inputs and', outputs.length, 'outputs');
    this.store.dispatch(midiActions.devicesDetected(inputs, outputs));

    if (inputs.length > 0) {
      console.log(`✓ Detected ${inputs.length} MIDI input(s):`);
      inputs.forEach(i => console.log(`  - ${i.name} (${i.manufacturer})`));
    } else {
      console.log('[MIDI] No MIDI input devices detected');
    }
  }

  /**
   * Handle device connection/disconnection
   */
  handleStateChange(event) {
    const port = event.port;

    if (port.type === 'input') {
      if (port.state === 'connected') {
        this.setupInput(port);
        this.store.dispatch(midiActions.deviceConnected({
          id: port.id,
          name: port.name,
          manufacturer: port.manufacturer,
          state: port.state
        }));
        console.log(`✓ MIDI device connected: ${port.name}`);
      } else if (port.state === 'disconnected') {
        this.activeInputs.delete(port.id);
        this.store.dispatch(midiActions.deviceDisconnected(port.id));
        console.log(`✗ MIDI device disconnected: ${port.name}`);
      }
    }
  }

  /**
   * Set up MIDI input message handling
   */
  setupInput(input) {
    input.onmidimessage = this.handleMIDIMessage.bind(this);
    this.activeInputs.set(input.id, input);
  }

  /**
   * Handle incoming MIDI messages
   */
  handleMIDIMessage(event) {
    const [status, data1, data2] = event.data;
    const command = status >> 4;
    const channel = status & 0x0F;

    // Control Change (CC)
    if (command === 11) { // 0xB = CC
      this.handleControlChange(data1, data2);
    }
    // Note On
    else if (command === 9) { // 0x9 = Note On
      if (data2 > 0) { // velocity > 0
        this.handleNoteOn(data1, data2);
      } else {
        this.handleNoteOff(data1);
      }
    }
    // Note Off
    else if (command === 8) { // 0x8 = Note Off
      this.handleNoteOff(data1);
    }
  }

  /**
   * Handle Control Change messages
   */
  handleControlChange(ccNumber, value) {
    const controlId = this.ccToControlMap[ccNumber];

    // Check for parameter connections (entity parameters)
    this.applyParameterConnections(ccNumber, value);

    if (!controlId) {
      // Unknown CC, check if in MIDI learn mode
      if (this.isInLearnMode()) {
        this.completeMIDILearn(ccNumber);
      }
      // Debug output for unmapped CC (only if not connected to parameters)
      const state = this.store.getState();
      const hasParameterConnection = Object.values(state.parameterConnections || {}).some(
        conn => conn.midiCC && conn.midiCC.cc === ccNumber
      );
      if (!hasParameterConnection && window.Vecterm?.CLI?.log) {
        window.Vecterm.CLI.log(`MIDI CC ${ccNumber}: ${value}`);
      }
      return;
    }

    // Normalize MIDI value (0-127) to 0-1
    const normalizedValue = value / 127;

    // Debug output to vecterm CLI
    if (window.Vecterm?.CLI?.log) {
      window.Vecterm.CLI.log(`MIDI ${controlId} [CC${ccNumber}]: ${value} (${normalizedValue.toFixed(3)})`);
    }

    // Dispatch control change
    this.store.dispatch(midiActions.controlChange(controlId, normalizedValue));

    // Apply mapping if exists
    this.applyMapping(controlId, normalizedValue);

    // Complete MIDI learn if active (Redux-based system)
    if (this.isInLearnMode()) {
      this.completeMIDILearn(ccNumber);
    }

    // Note: VT100 controller now uses direct Web MIDI API
    // (same as tab-completion sliders) to avoid Redux animation delays
  }

  /**
   * Apply parameter connections (entity parameters controlled by MIDI CC)
   */
  applyParameterConnections(ccNumber, midiValue) {
    const state = this.store.getState();
    const connections = state.parameterConnections || {};

    // Find all connections with this MIDI CC
    Object.entries(connections).forEach(([connectionId, connection]) => {
      if (connection.midiCC && connection.midiCC.cc === ccNumber) {
        const { entityId, parameter } = connection;

        // Get active game instance
        const activeGame = window.activeGame;
        if (!activeGame || !activeGame.ecs) {
          console.warn(`[MIDI] No active game for parameter: ${entityId}.${parameter}`);
          return;
        }

        // Get entity from ECS
        const entity = activeGame.ecs.getEntityById(entityId);
        if (!entity || !entity.parameterSet) {
          console.warn(`[MIDI] Entity not found or has no parameters: ${entityId}`);
          return;
        }

        // Get parameter config
        const paramConfig = entity.parameterSet.parameters[parameter];
        if (!paramConfig) {
          console.warn(`[MIDI] Parameter not found: ${entityId}.${parameter}`);
          return;
        }

        // Map MIDI value (0-127) to parameter range
        const normalizedValue = midiValue / 127;
        const mappedValue = paramConfig.min + (paramConfig.max - paramConfig.min) * normalizedValue;

        // Update parameter value
        paramConfig.value = mappedValue;
        activeGame.ecs.addComponent(entityId, 'parameterSet', entity.parameterSet);

        // Log to CLI
        if (window.Vecterm?.CLI?.log) {
          window.Vecterm.CLI.log(
            `MIDI CC ${ccNumber} → ${entityId}.${parameter} = ${mappedValue.toFixed(2)}`
          );
        }
      }
    });
  }

  /**
   * Handle Note On messages (can be used for buttons)
   */
  handleNoteOn(note, velocity) {
    // Map note numbers to buttons (e.g., C3-D#4 = buttons 1a-4d)
    const buttonId = this.noteToButton(note);
    if (buttonId) {
      this.store.dispatch(midiActions.buttonPress(buttonId));
      this.applyButtonAction(buttonId, true);
    }

    // MIDI learn
    if (this.isInLearnMode()) {
      this.completeMIDILearn(`note_${note}`);
    }
  }

  /**
   * Handle Note Off messages
   */
  handleNoteOff(note) {
    const buttonId = this.noteToButton(note);
    if (buttonId) {
      this.store.dispatch(midiActions.buttonRelease(buttonId));
      this.applyButtonAction(buttonId, false);
    }
  }

  /**
   * Map note number to button ID
   * C3 (48) to D#4 (63) = 16 notes for 16 buttons
   */
  noteToButton(note) {
    if (note < 48 || note > 63) return null;

    const buttons = [
      '1a', '1b', '1c', '1d',
      '2a', '2b', '2c', '2d',
      '3a', '3b', '3c', '3d',
      '4a', '4b', '4c', '4d'
    ];

    return buttons[note - 48];
  }

  /**
   * Apply MIDI control mapping to vecterm parameter
   * Uses window.Vecterm.update (same as mouse sliders)
   */
  applyMapping(controlId, value) {
    const state = this.store.getState();
    const mapping = state.midi?.mappings?.[controlId];

    if (!mapping) return;

    // Use global API with MIDI flag for proper scaling/rounding
    if (window.Vecterm?.update) {
      window.Vecterm.update(mapping, value, true); // true = isMidiValue
    } else {
      console.warn(`[MIDI] window.Vecterm.update not available for ${mapping}`);
    }
  }

  /**
   * Apply mapping to Tines audio parameters (DEPRECATED - kept for reference)
   * Now handled by window.Vecterm.update
   */
  applyTinesMapping(parts, value) {
    console.warn('[MIDI] applyTinesMapping is deprecated, use window.Vecterm.update');
  }

  /**
   * Apply mapping to Vecterm 3D parameters (DEPRECATED - kept for reference)
   * Now handled by window.Vecterm.update
   */
  applyVectermMapping(parts, value) {
    console.warn('[MIDI] applyVectermMapping is deprecated, use window.Vecterm.update');
  }

  /**
   * Apply mapping to VT100 effect parameters (DEPRECATED - kept for reference)
   * Now handled by window.Vecterm.update
   */
  applyVT100Mapping(parts, value) {
    console.warn('[MIDI] applyVT100Mapping is deprecated, use window.Vecterm.update');
  }

  /**
   * Apply button action
   */
  applyButtonAction(buttonId, pressed) {
    const state = this.store.getState();
    const mapping = state.midi?.mappings?.[buttonId];

    if (!mapping) return;

    // Buttons can trigger actions (not continuous values)
    // Example mappings: "tines.play", "tines.stop", "tines.mute.drone"
    if (pressed) {
      console.log(`Button action: ${buttonId} → ${mapping}`);
      // Execute mapped command
      // This would integrate with command processor
    }
  }

  /**
   * Check if in MIDI learn mode
   */
  isInLearnMode() {
    const state = this.store.getState();
    return state.midi?.learn?.active === true;
  }

  /**
   * Complete MIDI learn by mapping the CC/note to the target parameter
   */
  completeMIDILearn(ccOrNote) {
    const state = this.store.getState();
    const targetParameter = state.midi?.learn?.targetParameter;

    if (!targetParameter) return;

    // Determine control ID
    let controlId;
    if (typeof ccOrNote === 'number') {
      // CC number
      if (!this.ccToControlMap[ccOrNote]) {
        // Create new mapping for this CC
        controlId = `cc${ccOrNote}`;
        this.ccToControlMap[ccOrNote] = controlId;
      } else {
        controlId = this.ccToControlMap[ccOrNote];
      }
    } else {
      // Note
      controlId = ccOrNote;
    }

    this.store.dispatch(midiActions.completeLearn(controlId, targetParameter));
    console.log(`✓ MIDI learn complete: ${controlId} → ${targetParameter}`);
  }

  /**
   * Send MIDI message to output device
   */
  sendMessage(deviceId, message) {
    const output = this.activeOutputs.get(deviceId);
    if (output) {
      output.send(message);
    }
  }

  /**
   * Send CC message
   */
  sendCC(deviceId, channel, ccNumber, value) {
    const status = 0xB0 | (channel & 0x0F);
    this.sendMessage(deviceId, [status, ccNumber, value]);
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.midiAccess) {
      for (const input of this.activeInputs.values()) {
        input.onmidimessage = null;
      }
      this.activeInputs.clear();
      this.activeOutputs.clear();
      this.midiAccess.onstatechange = null;
    }
  }
}
