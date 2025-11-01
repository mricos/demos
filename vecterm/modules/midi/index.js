/**
 * MIDI Module - Main Entry Point
 *
 * Integrates all MIDI components:
 * - Redux context and state management
 * - Hardware MIDI controller (Web MIDI API)
 * - Visual MIDI controller UI
 * - Parameter mapping system
 * - Transport controls
 */

import { midiReducer, initialMidiState, midiActions } from './midi-context.js';
import { MIDIController } from './midi-controller.js';
import { MIDIVisualController } from './midi-ui.js';
import { MIDIControllerVT100 } from './midi-ui-vt100.js';
import { MIDIMapping } from './midi-mapping.js';
import { MIDITransport } from './midi-transport.js';

// Module-level instances
let midiController = null;
let visualController = null;
let vt100Controller = null;
let midiMapping = null;
let transport = null;
let store = null;

/**
 * Initialize MIDI module
 */
export async function init(reduxStore) {
  store = reduxStore;

  console.log('Initializing MIDI module...');

  // Create instances
  midiController = new MIDIController(store);
  visualController = new MIDIVisualController(store);
  vt100Controller = new MIDIControllerVT100(store);
  midiMapping = new MIDIMapping(store);
  transport = new MIDITransport(store);

  // Initialize hardware MIDI
  await midiController.initialize();

  // Initialize visual controllers
  visualController.initialize();
  vt100Controller.initialize();

  // Set up global API
  setupGlobalAPI();

  console.log('✓ MIDI module initialized');
}

/**
 * Set up global API at window.Vecterm.MIDI
 */
function setupGlobalAPI() {
  if (!window.Vecterm) {
    window.Vecterm = {};
  }

  window.Vecterm.MIDI = {
    // State
    getState: () => store.getState().midi,

    // Device management
    getDevices: () => {
      const state = store.getState().midi;
      return {
        inputs: state.devices.inputs,
        outputs: state.devices.outputs,
        selected: state.devices.selected
      };
    },

    selectDevice: (deviceId) => {
      store.dispatch(midiActions.selectDevice(deviceId));
    },

    // Visual controller (canvas-based)
    showVisual: () => visualController.show(),
    hideVisual: () => visualController.hide(),
    toggleVisual: () => {
      const visible = store.getState().midi?.visual?.visible;
      if (visible) {
        visualController.hide();
      } else {
        visualController.show();
      }
    },

    // VT100 controller (new terminal-style with mapping buttons)
    vt100Controller, // Expose controller for MIDI learn access
    showVT100: () => vt100Controller.show(),
    showVT100Inline: () => vt100Controller.showInline(),
    hideVT100: () => vt100Controller.hide(),
    toggleVT100: () => {
      const isVisible = vt100Controller.container?.style.display === 'block';
      if (isVisible) {
        vt100Controller.hide();
      } else {
        vt100Controller.show();
      }
    },

    // Mappings
    map: (controlId, parameter) => {
      if (!midiMapping.validateParameter(parameter)) {
        console.error(`Invalid parameter: ${parameter}`);
        return false;
      }
      store.dispatch(midiActions.mapControl(controlId, parameter));
      console.log(`✓ Mapped ${controlId} → ${parameter}`);
      return true;
    },

    unmap: (controlId) => {
      store.dispatch(midiActions.unmapControl(controlId));
      console.log(`✓ Unmapped ${controlId}`);
    },

    resetMappings: () => {
      store.dispatch(midiActions.resetMappings());
      console.log('✓ All mappings reset');
    },

    getMappings: () => {
      return store.getState().midi?.mappings || {};
    },

    // MIDI Learn
    learn: (parameter) => {
      if (!midiMapping.validateParameter(parameter)) {
        console.error(`Invalid parameter: ${parameter}`);
        return false;
      }
      store.dispatch(midiActions.startLearn(parameter));
      console.log(`♪ MIDI Learn: Waiting for input to map to ${parameter}`);
      console.log('  Move a control or press Esc to cancel');
      return true;
    },

    // Alias for learn (for JSON viewer integration)
    learnParameter: (parameter) => {
      return window.Vecterm.MIDI.learn(parameter);
    },

    cancelLearn: () => {
      store.dispatch(midiActions.cancelLearn());
      console.log('✗ MIDI Learn cancelled');
    },

    // Presets
    loadPreset: (presetName) => {
      return midiMapping.loadPreset(presetName);
    },

    savePreset: (presetName, description) => {
      return midiMapping.savePreset(presetName, description);
    },

    listPresets: () => {
      const presets = midiMapping.getPresetNames();
      console.log('Available MIDI presets:');
      presets.forEach(name => {
        const preset = midiMapping.getPreset(name);
        console.log(`  ${name}: ${preset.description}`);
      });
      return presets;
    },

    getPreset: (presetName) => {
      return midiMapping.getPreset(presetName);
    },

    // Transport
    play: () => transport.play(),
    stop: () => transport.stop(),
    record: () => transport.toggleRecord(),
    setTempo: (bpm) => transport.setTempo(bpm),
    syncWithTines: () => transport.syncWithTines(),

    // Recordings
    getRecordings: () => transport.getSavedRecordings(),
    playRecording: (index) => {
      const recordings = transport.getSavedRecordings();
      if (recordings[index]) {
        transport.playbackRecording(recordings[index]);
      } else {
        console.error(`Recording ${index} not found`);
      }
    },
    exportRecording: (index) => {
      const recordings = transport.getSavedRecordings();
      if (recordings[index]) {
        transport.exportMIDI(recordings[index]);
      } else {
        console.error(`Recording ${index} not found`);
      }
    },
    deleteRecording: (index) => transport.deleteRecording(index),
    clearRecordings: () => transport.clearAllRecordings(),

    // Control values
    getControl: (controlId) => {
      return store.getState().midi?.controls?.[controlId] || 0;
    },

    setControl: (controlId, value) => {
      store.dispatch(midiActions.controlChange(controlId, value));
    },

    // Status
    status: () => {
      const state = store.getState().midi;
      console.log('MIDI Status:');
      console.log(`  Devices: ${state.devices.inputs.length} input(s), ${state.devices.outputs.length} output(s)`);
      if (state.devices.inputs.length > 0) {
        console.log('  Inputs:');
        state.devices.inputs.forEach((d, i) => {
          const selected = d.id === state.devices.selected ? ' [selected]' : '';
          console.log(`    ${i + 1}. ${d.name} (${d.manufacturer})${selected}`);
        });
      }
      console.log(`  Visual controller: ${state.visual.visible ? 'visible' : 'hidden'}`);
      console.log(`  Mappings: ${Object.keys(state.mappings).length} active`);
      if (Object.keys(state.mappings).length > 0) {
        console.log('  Active mappings:');
        Object.entries(state.mappings).forEach(([controlId, param]) => {
          const value = state.controls[controlId] || 0;
          const formatted = midiMapping.formatValue(value, param);
          console.log(`    ${controlId} → ${param} (${formatted})`);
        });
      }
      console.log(`  Transport: ${state.transport.playing ? 'playing' : 'stopped'}`);
      console.log(`  Recording: ${state.transport.recording ? 'active' : 'inactive'}`);
      console.log(`  Tempo: ${state.transport.tempo} BPM`);
      console.log(`  Learn mode: ${state.learn.active ? `active (${state.learn.targetParameter})` : 'inactive'}`);

      const recordings = transport.getSavedRecordings();
      console.log(`  Saved recordings: ${recordings.length}`);
    }
  };
}

/**
 * Cleanup function
 */
export function cleanup() {
  if (midiController) {
    midiController.cleanup();
  }
  if (visualController) {
    visualController.cleanup();
  }
  console.log('✓ MIDI module cleaned up');
}

/**
 * Export for module loader
 */
export default {
  init,
  cleanup,
  reducer: midiReducer,
  initialState: initialMidiState,
  actions: midiActions
};
