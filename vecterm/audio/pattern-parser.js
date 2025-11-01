/**
 * tines.js - Pattern Parser
 * Strudel-inspired abbreviated syntax for musical patterns
 */

// Import noteToMidi at the top level (needed for parseChord)
import { noteToMidi } from './tines-engine.js';
import { resolveVariables, globalVariables } from './tines-variables.js';

/**
 * Generate Euclidean rhythm
 * Distributes hits evenly across steps using Bjorklund's algorithm
 * @param {number} hits - Number of hits
 * @param {number} steps - Total number of steps
 * @param {number} rotation - Rotation offset (default 0)
 * @param {string} hitValue - Value for hits (default 'x')
 * @returns {Array} Pattern array
 */
export function generateEuclidean(hits, steps, rotation = 0, hitValue = 'x') {
  if (hits >= steps) {
    // All steps are hits
    return Array(steps).fill(hitValue);
  }

  if (hits === 0) {
    // All rests
    return Array(steps).fill('~');
  }

  // Bjorklund's algorithm
  const pattern = [];
  const bucket = [];

  for (let i = 0; i < steps; i++) {
    bucket.push(i < hits ? 1 : 0);
  }

  // Distribute using Euclidean algorithm
  let divisor = steps - hits;
  let remainder = hits;

  while (remainder > 1) {
    const count = Math.floor(divisor / remainder);
    const newRemainder = divisor % remainder;
    divisor = remainder;
    remainder = newRemainder;

    if (count > 0) {
      // Group items
      const groups = [];
      for (let i = 0; i < divisor; i++) {
        groups.push([bucket[i]]);
      }
      for (let i = 0; i < remainder; i++) {
        for (let j = 0; j < count; j++) {
          groups[i].push(bucket[divisor + i * count + j]);
        }
      }
      bucket.length = 0;
      bucket.push(...groups.map(g => g.flat()).flat());
    }
  }

  // Convert to hits/rests
  const result = bucket.map(v => v === 1 ? hitValue : '~');

  // Apply rotation
  if (rotation !== 0) {
    const rot = ((rotation % steps) + steps) % steps;
    return [...result.slice(rot), ...result.slice(0, rot)];
  }

  return result;
}

/**
 * Choose random element from array
 * @param {Array} options - Array of options
 * @returns {*} Random element
 */
export function randomChoice(options) {
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Parse a pattern string into an array of events
 *
 * Syntax:
 * - Space-separated notes: "C4 E4 G4" -> [C4, E4, G4]
 * - Rests: "C4 ~ E4" -> [C4, rest, E4]
 * - Repetition: "C4*2" -> [C4, C4]
 * - Grouping: "[C4 E4]*2" -> [C4, E4, C4, E4]
 * - Alternation: "<C4 E4>" -> rotates between options each cycle
 * - Subdivision: "C4/2" -> C4 lasts 2 steps
 * - Euclidean: "euclid(3,8)" or "euclid(3,8,C4)" -> Euclidean rhythm
 * - Random choice: "[C4,E4,G4]" -> random selection (comma-separated)
 * - Variables: "$root+7" -> variable interpolation
 *
 * @param {string} patternStr - Pattern notation string
 * @param {string} scopeId - Optional scope ID for variable resolution
 * @returns {Array} Parsed event array
 */
export function parsePattern(patternStr, scopeId = null) {
  if (!patternStr || typeof patternStr !== 'string') {
    return [];
  }

  // Resolve variables first
  patternStr = resolveVariables(patternStr, globalVariables, scopeId);

  // Trim and normalize whitespace
  patternStr = patternStr.trim().replace(/\s+/g, ' ');

  try {
    const events = parseExpression(patternStr);
    return events;
  } catch (error) {
    console.error('[pattern-parser] Parse error:', error.message);
    return [];
  }
}

/**
 * Parse a full expression (handles alternation)
 */
function parseExpression(str) {
  // Handle alternation <...>
  const altMatch = str.match(/^<([^>]+)>(.*)$/);
  if (altMatch) {
    const [, alts, rest] = altMatch;
    const options = alts.split(/\s+/).filter(Boolean);

    // For now, expand to a single cycle of alternation
    // In a more advanced parser, this would track state across cycles
    const events = options.flatMap(opt => parseSequence(opt));

    if (rest) {
      events.push(...parseExpression(rest.trim()));
    }

    return events;
  }

  return parseSequence(str);
}

/**
 * Parse a sequence (space-separated items)
 */
function parseSequence(str) {
  const tokens = tokenize(str);
  const events = [];

  for (const token of tokens) {
    events.push(...parseToken(token));
  }

  return events;
}

/**
 * Tokenize a string (handle brackets and spaces)
 */
function tokenize(str) {
  const tokens = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === '[') {
      if (depth === 0 && current.trim()) {
        tokens.push(current.trim());
        current = '';
      }
      current += char;
      depth++;
    } else if (char === ']') {
      depth--;
      current += char;
      if (depth === 0) {
        tokens.push(current.trim());
        current = '';
      }
    } else if (char === ' ' && depth === 0) {
      if (current.trim()) {
        tokens.push(current.trim());
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  return tokens;
}

/**
 * Parse a single token
 */
function parseToken(token) {
  // Handle Euclidean rhythms: euclid(hits, steps) or euclid(hits, steps, note) or euclid(hits, steps, rotation)
  const euclidMatch = token.match(/^euclid\((\d+),(\d+)(?:,(.+))?\)$/);
  if (euclidMatch) {
    const [, hitsStr, stepsStr, arg3] = euclidMatch;
    const hits = parseInt(hitsStr, 10);
    const steps = parseInt(stepsStr, 10);

    // Check if arg3 is a number (rotation) or a note
    let rotation = 0;
    let hitValue = 'x';

    if (arg3) {
      if (/^\d+$/.test(arg3.trim())) {
        rotation = parseInt(arg3.trim(), 10);
      } else {
        hitValue = arg3.trim();
      }
    }

    return generateEuclidean(hits, steps, rotation, hitValue);
  }

  // Handle random choice [A,B,C] (comma-separated)
  if (token.startsWith('[') && token.endsWith(']') && token.includes(',')) {
    const inner = token.slice(1, -1);
    const options = inner.split(',').map(s => s.trim());
    const chosen = randomChoice(options);
    return [chosen];
  }

  // Handle grouped patterns [...] (space-separated)
  if (token.startsWith('[') && token.endsWith(']')) {
    const inner = token.slice(1, -1);
    return parseGrouped(inner);
  }

  // Handle repetition *N
  const repMatch = token.match(/^(.+)\*(\d+)$/);
  if (repMatch) {
    const [, item, count] = repMatch;
    const parsed = parseToken(item);
    return Array(parseInt(count)).fill(parsed).flat();
  }

  // Handle subdivision /N (note lasts N steps)
  const subMatch = token.match(/^(.+)\/(\d+)$/);
  if (subMatch) {
    const [, item, duration] = subMatch;
    const count = parseInt(duration);
    return [item, ...Array(count - 1).fill('~')]; // Fill with rests
  }

  // Rest
  if (token === '~') {
    return ['~'];
  }

  // Single note or event
  return [token];
}

/**
 * Parse grouped pattern [...]
 */
function parseGrouped(str) {
  const tokens = tokenize(str);
  const events = [];

  for (const token of tokens) {
    events.push(...parseToken(token));
  }

  return events;
}

/**
 * Pattern class for managing event sequences
 */
export class Pattern {
  constructor(patternStr, params = {}) {
    this.patternStr = patternStr;
    this.events = parsePattern(patternStr);
    this.params = params;
    this.currentIndex = 0;
  }

  /**
   * Get next event in the pattern
   */
  next() {
    if (this.events.length === 0) return null;

    const event = this.events[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.events.length;

    return event === '~' ? null : event;
  }

  /**
   * Get event at specific index
   */
  at(index) {
    if (this.events.length === 0) return null;
    const event = this.events[index % this.events.length];
    return event === '~' ? null : event;
  }

  /**
   * Get pattern length
   */
  length() {
    return this.events.length;
  }

  /**
   * Reset to beginning
   */
  reset() {
    this.currentIndex = 0;
  }

  /**
   * Check if pattern is empty
   */
  isEmpty() {
    return this.events.length === 0;
  }

  /**
   * Clone the pattern
   */
  clone() {
    return new Pattern(this.patternStr, { ...this.params });
  }

  /**
   * Get all events (for debugging)
   */
  getEvents() {
    return [...this.events];
  }
}

/**
 * Parse drum pattern notation
 * Special syntax for drum patterns: "bd ~ sn ~"
 *
 * Drum abbreviations:
 * - bd: bass drum (kick)
 * - sn: snare
 * - hh: hi-hat
 * - oh: open hi-hat
 * - cp: clap
 * - cy: cymbal
 */
export function parseDrumPattern(patternStr) {
  const drumMap = {
    'bd': 'kick',
    'sn': 'snare',
    'hh': 'hihat',
    'oh': 'openhihat',
    'cp': 'clap',
    'cy': 'cymbal',
    'kick': 'kick',
    'snare': 'snare',
    'hihat': 'hihat'
  };

  const events = parsePattern(patternStr);

  return events.map(event => {
    if (event === '~') return '~';

    // Map abbreviations to full drum names
    const drumName = drumMap[event.toLowerCase()] || event;
    return drumName;
  });
}

/**
 * Parse chord notation
 * Examples: "Cmaj7", "Am", "D7"
 */
export function parseChord(chordStr) {
  const chordMap = {
    // Triads
    '': [0, 4, 7],          // Major
    'm': [0, 3, 7],         // Minor
    'dim': [0, 3, 6],       // Diminished
    'aug': [0, 4, 8],       // Augmented

    // Sevenths
    '7': [0, 4, 7, 10],     // Dominant 7th
    'maj7': [0, 4, 7, 11],  // Major 7th
    'm7': [0, 3, 7, 10],    // Minor 7th
    'dim7': [0, 3, 6, 9],   // Diminished 7th

    // Extensions
    '9': [0, 4, 7, 10, 14], // Dominant 9th
    'maj9': [0, 4, 7, 11, 14] // Major 9th
  };

  // Match root note + chord quality
  const match = chordStr.match(/^([A-G][#b]?)(\d+)?(.*)?$/);
  if (!match) {
    console.warn(`[pattern-parser] Invalid chord: ${chordStr}`);
    return [];
  }

  const [, root, octave, quality] = match;
  const intervals = chordMap[quality || ''] || chordMap[''];

  // Convert root to MIDI
  const rootMidi = noteToMidi(root + (octave || '4'));

  // Build chord
  return intervals.map(interval => rootMidi + interval);
}

/**
 * Validate pattern syntax
 */
export function validatePattern(patternStr) {
  try {
    const events = parsePattern(patternStr);
    return {
      valid: true,
      events,
      length: events.length
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}
