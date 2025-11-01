/**
 * MIDI Transport Controls
 *
 * Handles playback transport: play, stop, record
 * Integrates with Tines audio engine
 */

import { midiActions } from './midi-context.js';

export class MIDITransport {
  constructor(store) {
    this.store = store;
    this.isRecording = false;
    this.recordedEvents = [];
    this.recordStartTime = 0;
  }

  /**
   * Start playback
   */
  play() {
    this.store.dispatch(midiActions.transportPlay());

    // Start Tines if available
    if (window.Vecterm?.Tines) {
      window.Vecterm.Tines.resume?.();
    }

    console.log('▶ Transport: Play');
  }

  /**
   * Stop playback
   */
  stop() {
    this.store.dispatch(midiActions.transportStop());

    // Stop recording if active
    if (this.isRecording) {
      this.stopRecording();
    }

    // Pause Tines if available
    if (window.Vecterm?.Tines) {
      window.Vecterm.Tines.pause?.();
    }

    console.log('■ Transport: Stop');
  }

  /**
   * Toggle record mode
   */
  toggleRecord() {
    const state = this.store.getState();
    const recording = !state.midi?.transport?.recording;

    if (recording) {
      this.startRecording();
    } else {
      this.stopRecording();
    }
  }

  /**
   * Start recording MIDI events
   */
  startRecording() {
    this.isRecording = true;
    this.recordedEvents = [];
    this.recordStartTime = performance.now();

    this.store.dispatch(midiActions.transportRecord(true));

    // Auto-start playback
    if (!this.store.getState().midi?.transport?.playing) {
      this.play();
    }

    console.log('● Transport: Recording started');
  }

  /**
   * Stop recording
   */
  stopRecording() {
    this.isRecording = false;
    this.store.dispatch(midiActions.transportRecord(false));

    console.log(`● Transport: Recording stopped (${this.recordedEvents.length} events)`);

    // Optionally save or export recording
    if (this.recordedEvents.length > 0) {
      this.saveRecording();
    }
  }

  /**
   * Record a MIDI event
   */
  recordEvent(event) {
    if (!this.isRecording) return;

    const timestamp = performance.now() - this.recordStartTime;
    this.recordedEvents.push({
      timestamp,
      ...event
    });
  }

  /**
   * Save recording (to localStorage or export)
   */
  saveRecording() {
    const recording = {
      timestamp: Date.now(),
      duration: performance.now() - this.recordStartTime,
      events: this.recordedEvents,
      tempo: this.store.getState().midi?.transport?.tempo || 120
    };

    // Save to localStorage
    const savedRecordings = JSON.parse(localStorage.getItem('midi_recordings') || '[]');
    savedRecordings.push(recording);
    localStorage.setItem('midi_recordings', JSON.stringify(savedRecordings));

    console.log('✓ Recording saved to localStorage');
  }

  /**
   * Playback recorded events
   */
  playbackRecording(recording) {
    console.log('▶ Playing back recording...');

    const startTime = performance.now();

    recording.events.forEach(event => {
      setTimeout(() => {
        // Dispatch the recorded event
        if (event.type === 'controlChange') {
          this.store.dispatch(midiActions.controlChange(event.controlId, event.value));
        } else if (event.type === 'buttonPress') {
          this.store.dispatch(midiActions.buttonPress(event.buttonId));
        } else if (event.type === 'buttonRelease') {
          this.store.dispatch(midiActions.buttonRelease(event.buttonId));
        }
      }, event.timestamp);
    });

    console.log(`✓ Playback scheduled (${recording.events.length} events)`);
  }

  /**
   * Export recording as MIDI file
   * (Simplified version - would need full MIDI file spec)
   */
  exportMIDI(recording) {
    // This would generate a proper MIDI file
    // For now, just export as JSON
    const json = JSON.stringify(recording, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `midi-recording-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
    console.log('✓ Recording exported');
  }

  /**
   * Set tempo
   */
  setTempo(bpm) {
    this.store.dispatch(midiActions.setTempo(bpm));

    // Update Tines tempo if available
    if (window.Vecterm?.Tines) {
      window.Vecterm.Tines.setBPM?.(bpm);
    }

    console.log(`♪ Tempo: ${bpm} BPM`);
  }

  /**
   * Sync with Tines clock
   */
  syncWithTines() {
    if (!window.Vecterm?.Tines) return;

    const tinesBPM = window.Vecterm.Tines.getBPM?.();
    if (tinesBPM) {
      this.store.dispatch(midiActions.setTempo(tinesBPM));
    }
  }

  /**
   * Get saved recordings
   */
  getSavedRecordings() {
    return JSON.parse(localStorage.getItem('midi_recordings') || '[]');
  }

  /**
   * Delete recording
   */
  deleteRecording(index) {
    const recordings = this.getSavedRecordings();
    recordings.splice(index, 1);
    localStorage.setItem('midi_recordings', JSON.stringify(recordings));
    console.log('✓ Recording deleted');
  }

  /**
   * Clear all recordings
   */
  clearAllRecordings() {
    localStorage.removeItem('midi_recordings');
    console.log('✓ All recordings cleared');
  }
}
