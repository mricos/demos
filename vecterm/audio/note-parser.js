/**
 * tines.js - Advanced Note Parser
 * Supports note names, MIDI numbers, frequency offsets (Hz/cents), and arithmetic expressions
 */

import { evaluateExpression } from './tines-variables.js';

/**
 * Note name to MIDI number mapping
 */
const NOTE_MAP = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
  'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

/**
 * Parse a note specification to frequency (Hz)
 * Supports:
 * - Note names: C4, F#3, Bb2
 * - MIDI numbers: 60, 64, 67
 * - Frequency offsets: C4+10hz, C4-5hz, 440+10hz
 * - Cents offsets: C4+50c, C4-25c
 * - Arithmetic: C4+7, 60-12, $root+$interval
 *
 * @param {string|number} noteSpec - Note specification
 * @param {Object} context - Context for variable resolution
 * @returns {number} Frequency in Hz
 */
export function parseNote(noteSpec, context = {}) {
  // If already a number, assume it's a frequency
  if (typeof noteSpec === 'number') {
    return noteSpec;
  }

  const spec = String(noteSpec).trim();

  // Parse the note specification
  const result = parseNoteSpec(spec, context);

  // Convert to frequency
  if (result.type === 'frequency') {
    return result.value;
  } else if (result.type === 'midi') {
    return midiToFreq(result.value);
  } else if (result.type === 'note') {
    const midi = noteNameToMidi(result.value);
    return midiToFreq(midi);
  }

  // Fallback
  console.warn(`[note-parser] Could not parse note: ${noteSpec}`);
  return 440; // A4
}

/**
 * Parse note specification into structured form
 * @param {string} spec - Note specification string
 * @param {Object} context - Context for evaluation
 * @returns {Object} Parsed note with type and value
 */
function parseNoteSpec(spec, context = {}) {
  // Check for Hz offset: C4+10hz, 440-5hz
  const hzMatch = spec.match(/^(.+?)([+-])([\d.]+)hz$/i);
  if (hzMatch) {
    const [, base, op, offset] = hzMatch;
    const baseFreq = parseNote(base, context);
    const offsetValue = parseFloat(offset);
    return {
      type: 'frequency',
      value: op === '+' ? baseFreq + offsetValue : baseFreq - offsetValue
    };
  }

  // Check for cents offset: C4+50c, C4-25c
  const centsMatch = spec.match(/^(.+?)([+-])([\d.]+)c$/i);
  if (centsMatch) {
    const [, base, op, cents] = centsMatch;
    const baseFreq = parseNote(base, context);
    const centsValue = parseFloat(cents);
    const actualCents = op === '+' ? centsValue : -centsValue;
    return {
      type: 'frequency',
      value: baseFreq * Math.pow(2, actualCents / 1200)
    };
  }

  // Check for arithmetic expression with semitones: C4+7, 60-12
  const arithmeticMatch = spec.match(/^(.+?)([+-])([\d.]+)$/);
  if (arithmeticMatch) {
    const [, base, op, offset] = arithmeticMatch;

    // Try parsing base as MIDI or note
    let baseMidi;
    if (/^\d+$/.test(base)) {
      baseMidi = parseInt(base, 10);
    } else {
      baseMidi = noteNameToMidi(base);
    }

    if (!isNaN(baseMidi)) {
      const offsetValue = parseFloat(offset);
      const resultMidi = op === '+' ? baseMidi + offsetValue : baseMidi - offsetValue;
      return {
        type: 'midi',
        value: resultMidi
      };
    }
  }

  // Check if it's a MIDI number
  if (/^\d+(\.\d+)?$/.test(spec)) {
    return {
      type: 'midi',
      value: parseFloat(spec)
    };
  }

  // Check if it's a note name
  const noteName = spec.match(/^([A-G][#b]?)(\d+)$/);
  if (noteName) {
    return {
      type: 'note',
      value: spec
    };
  }

  // Check if it's a raw frequency
  if (/^\d+(\.\d+)?$/.test(spec)) {
    return {
      type: 'frequency',
      value: parseFloat(spec)
    };
  }

  // Fallback - try to parse as note name
  return {
    type: 'note',
    value: spec
  };
}

/**
 * Convert note name to MIDI number
 * @param {string} noteName - Note name (e.g., "C4", "F#3")
 * @returns {number} MIDI note number
 */
export function noteNameToMidi(noteName) {
  const match = noteName.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) {
    console.warn(`[note-parser] Invalid note name: ${noteName}`);
    return 69; // A4
  }

  const [, note, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const noteValue = NOTE_MAP[note];

  if (noteValue === undefined) {
    console.warn(`[note-parser] Unknown note: ${note}`);
    return 69;
  }

  // MIDI note number = (octave + 1) * 12 + noteValue
  return (octave + 1) * 12 + noteValue;
}

/**
 * Convert MIDI note number to frequency (Hz)
 * @param {number} midi - MIDI note number
 * @returns {number} Frequency in Hz
 */
export function midiToFreq(midi) {
  // A4 (MIDI 69) = 440 Hz
  // freq = 440 * 2^((midi - 69) / 12)
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Convert frequency to MIDI note number
 * @param {number} freq - Frequency in Hz
 * @returns {number} MIDI note number (can be fractional)
 */
export function freqToMidi(freq) {
  // midi = 69 + 12 * log2(freq / 440)
  return 69 + 12 * Math.log2(freq / 440);
}

/**
 * Convert MIDI number to note name
 * @param {number} midi - MIDI note number
 * @returns {string} Note name (e.g., "C4")
 */
export function midiToNoteName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = Math.round(midi) % 12;
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${noteNames[noteIndex]}${octave}`;
}

/**
 * Parse panning specification
 * @param {string|number} panSpec - Pan value or specification
 * @returns {number} Pan value (-1 to 1)
 */
export function parsePan(panSpec) {
  if (typeof panSpec === 'number') {
    return Math.max(-1, Math.min(1, panSpec));
  }

  const spec = String(panSpec).toLowerCase().trim();

  // Named positions
  if (spec === 'left' || spec === 'l') return -1;
  if (spec === 'right' || spec === 'r') return 1;
  if (spec === 'center' || spec === 'c') return 0;

  // Numeric value
  const num = parseFloat(spec);
  if (!isNaN(num)) {
    return Math.max(-1, Math.min(1, num));
  }

  return 0; // Default center
}

/**
 * Extract timing offset from note specification
 * Examples: C4@-10ms, E4@+5ms
 * @param {string} noteSpec - Note specification
 * @returns {Object} { note, offset } where offset is in milliseconds
 */
export function parseTimingOffset(noteSpec) {
  const match = String(noteSpec).match(/^(.+?)@([+-]?[\d.]+)ms$/);
  if (match) {
    const [, note, offset] = match;
    return {
      note: note.trim(),
      offset: parseFloat(offset)
    };
  }

  return {
    note: noteSpec,
    offset: 0
  };
}

/**
 * Extract parameter overrides from note specification
 * Example: C4:pan(0.5):volume(0.8)
 * @param {string} noteSpec - Note specification
 * @returns {Object} { note, params }
 */
export function parseNoteParams(noteSpec) {
  const parts = String(noteSpec).split(':');
  const note = parts[0].trim();
  const params = {};

  for (let i = 1; i < parts.length; i++) {
    const paramMatch = parts[i].match(/^(\w+)\(([-\d.]+)\)$/);
    if (paramMatch) {
      const [, paramName, paramValue] = paramMatch;
      params[paramName] = parseFloat(paramValue);
    }
  }

  return { note, params };
}

export default {
  parseNote,
  noteNameToMidi,
  midiToFreq,
  freqToMidi,
  midiToNoteName,
  parsePan,
  parseTimingOffset,
  parseNoteParams
};
