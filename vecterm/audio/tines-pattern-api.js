/**
 * tines.js - Functional Pattern API
 * Strudel-inspired chainable/functional programming interface
 */

import { Pattern, parsePattern } from './pattern-parser.js';

/**
 * Chainable Pattern Builder
 * Inspired by Strudel's functional API
 */
export class TinesPattern {
  constructor(data, transforms = []) {
    // Data can be a string pattern or array of events
    this.data = typeof data === 'string' ? parsePattern(data) : data;
    this.transforms = transforms;
    this.params = {};
  }

  /**
   * Get the final event sequence
   */
  getEvents() {
    let events = [...this.data];

    // Apply all transforms
    for (const transform of this.transforms) {
      events = transform(events);
    }

    return events;
  }

  /**
   * Fast: Speed up pattern by factor
   * fast(2) = play twice as fast
   */
  fast(factor) {
    const transform = (events) => {
      const result = [];
      for (let i = 0; i < factor; i++) {
        result.push(...events);
      }
      return result;
    };
    return new TinesPattern(this.data, [...this.transforms, transform]);
  }

  /**
   * Slow: Slow down pattern by factor
   * slow(2) = play half as fast (insert rests)
   */
  slow(factor) {
    const transform = (events) => {
      const result = [];
      for (const event of events) {
        result.push(event);
        for (let i = 1; i < factor; i++) {
          result.push('~');
        }
      }
      return result;
    };
    return new TinesPattern(this.data, [...this.transforms, transform]);
  }

  /**
   * Every: Apply function every N cycles
   * every(4, p => p.fast(2)) - double speed every 4th cycle
   */
  every(n, fn) {
    this.params.every = { n, fn };
    return this;
  }

  /**
   * Repeat: Repeat the pattern N times
   */
  repeat(n) {
    const transform = (events) => {
      const result = [];
      for (let i = 0; i < n; i++) {
        result.push(...events);
      }
      return result;
    };
    return new TinesPattern(this.data, [...this.transforms, transform]);
  }

  /**
   * Reverse: Reverse the pattern
   */
  rev() {
    const transform = (events) => [...events].reverse();
    return new TinesPattern(this.data, [...this.transforms, transform]);
  }

  /**
   * Palindrome: Pattern forwards then backwards
   */
  palindrome() {
    const transform = (events) => {
      const reversed = [...events].reverse();
      return [...events, ...reversed];
    };
    return new TinesPattern(this.data, [...this.transforms, transform]);
  }

  /**
   * Degrade: Randomly remove events with probability
   * degrade(0.5) - 50% chance to remove each event
   */
  degrade(prob = 0.5) {
    const transform = (events) => {
      return events.map(e => Math.random() < prob ? '~' : e);
    };
    return new TinesPattern(this.data, [...this.transforms, transform]);
  }

  /**
   * Chunk: Split into chunks of size N
   */
  chunk(size) {
    const transform = (events) => {
      const chunks = [];
      for (let i = 0; i < events.length; i += size) {
        chunks.push(events.slice(i, i + size));
      }
      return chunks.flat();
    };
    return new TinesPattern(this.data, [...this.transforms, transform]);
  }

  /**
   * Stutter: Repeat each event N times
   */
  stutter(n) {
    const transform = (events) => {
      const result = [];
      for (const event of events) {
        for (let i = 0; i < n; i++) {
          result.push(event);
        }
      }
      return result;
    };
    return new TinesPattern(this.data, [...this.transforms, transform]);
  }

  /**
   * Arp: Arpeggiate (play events as chord or sequence)
   */
  arp(mode = 'up') {
    // This would transform note groups into arpeggios
    // Placeholder for now
    return this;
  }

  /**
   * Transposition: Shift all notes by semitones
   */
  transpose(semitones) {
    this.params.transpose = semitones;
    return this;
  }

  /**
   * Volume: Set volume for this pattern
   */
  volume(vol) {
    this.params.volume = vol;
    return this;
  }

  /**
   * Gain: Alias for volume
   */
  gain(vol) {
    return this.volume(vol);
  }

  /**
   * Attack: Set attack time
   */
  attack(time) {
    this.params.attack = time;
    return this;
  }

  /**
   * Release: Set release time
   */
  release(time) {
    this.params.release = time;
    return this;
  }

  /**
   * Filter: Set filter frequency
   */
  lpf(freq) {
    this.params.filterFreq = freq;
    return this;
  }

  /**
   * Detune: Set detuning amount
   */
  detune(amount) {
    this.params.detune = amount;
    return this;
  }

  /**
   * LFO: Set LFO parameters
   */
  lfo(rate, depth) {
    this.params.lfoRate = rate;
    this.params.lfoDepth = depth;
    return this;
  }

  /**
   * Waveform: Set oscillator waveform
   */
  wave(type) {
    this.params.waveform = type;
    return this;
  }

  /**
   * Get all parameters
   */
  getParams() {
    return this.params;
  }

  /**
   * Convert to string representation
   */
  toString() {
    return this.getEvents().join(' ');
  }

  /**
   * Play the pattern (requires manager)
   */
  play(manager, channel = 'drone') {
    const events = this.getEvents();
    const params = this.getParams();
    return manager.playPattern(channel, events.join(' '), params);
  }
}

/**
 * Pattern constructor function (Strudel-style)
 */
export function pattern(data) {
  return new TinesPattern(data);
}

/**
 * Shorthand aliases
 */
export const p = pattern;

/**
 * Sound/sequence function
 */
export function s(data) {
  return new TinesPattern(data);
}

/**
 * Note sequence function
 */
export function n(data) {
  return new TinesPattern(data);
}

/**
 * Stack: Layer multiple patterns
 */
export function stack(...patterns) {
  // This would need clock integration to play simultaneously
  // For now, return a container
  return {
    patterns: patterns.map(p => p instanceof TinesPattern ? p : new TinesPattern(p)),
    play(manager, channel = 'drone') {
      return this.patterns.map((pat, i) =>
        pat.play(manager, channel)
      );
    }
  };
}

/**
 * Sequence: Play patterns in sequence
 */
export function seq(...patterns) {
  const combined = patterns.flatMap(p => {
    if (p instanceof TinesPattern) {
      return p.getEvents();
    } else if (typeof p === 'string') {
      return parsePattern(p);
    } else {
      return p;
    }
  });
  return new TinesPattern(combined);
}

/**
 * Cat: Concatenate patterns
 */
export function cat(...patterns) {
  return seq(...patterns);
}

/**
 * Alt: Alternate between patterns
 */
export function alt(...patterns) {
  const events = patterns.map(p => {
    if (p instanceof TinesPattern) return p.getEvents();
    if (typeof p === 'string') return parsePattern(p);
    return [p];
  });

  // Flatten and interleave
  const maxLen = Math.max(...events.map(e => e.length));
  const result = [];

  for (let i = 0; i < maxLen; i++) {
    for (const patternEvents of events) {
      if (i < patternEvents.length) {
        result.push(patternEvents[i]);
      }
    }
  }

  return new TinesPattern(result);
}

/**
 * Create mini-notation helpers
 */
export const tines = {
  // Pattern constructors
  pattern,
  p,
  s,
  n,

  // Combinators
  stack,
  seq,
  cat,
  alt,

  // Utilities
  rest: '~',
  silence: '~'
};

// Export for use in global scope
if (typeof window !== 'undefined') {
  window.TinesPattern = TinesPattern;
  window.tinesAPI = tines;
}
