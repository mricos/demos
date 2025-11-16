/**
 * tines.js - Manager
 * Redux-integrated audio manager following vecterm factory pattern
 */

import { TinesEngine } from './tines-engine.js';
import { TinesClock } from './tines-clock.js';
import { DroneInstrument } from './instruments/drone.js';
import { BellsInstrument } from './instruments/bells.js';
import { Pattern, parsePattern } from './pattern-parser.js';
import { createVisualPlayer } from './tines-visual-player.js';
import { TinesPattern, pattern, p, s, n, stack, seq, cat, alt } from './tines-pattern-api.js';
import { globalVariables } from './tines-variables.js';
import * as ActionTypes from '../core/actions.js';

/**
 * Create tines audio manager (factory pattern with dependency injection)
 */
export function createTinesManager(store) {
  const engine = new TinesEngine();
  let clock = null;
  let instruments = {};
  let activePatterns = new Map();
  let visualPlayer = null;

  /**
   * Initialize audio engine
   */
  async function init() {
    try {
      await engine.init();

      // Create clock
      clock = new TinesClock(engine, {
        bpm: store.getState().audio.bpm
      });

      // Initialize instruments
      instruments = {
        drone: new DroneInstrument(engine),
        bells: new BellsInstrument(engine),
        // synth, drums will be added later
      };

      // Visual player DISABLED - using Strudel-style inline sliders instead
      // Inline sliders are created via CLI commands (tines.volume, tines.bpm, etc.)
      // visualPlayer = null;
      console.log('[tines-manager] Visual player disabled - using inline CLI sliders (Strudel-style)');

      // Dispatch init action
      store.dispatch({ type: ActionTypes.AUDIO_INIT });

      console.log('[tines-manager] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[tines-manager] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Play a pattern on a channel
   */
  function playPattern(channelName, patternStr, params = {}) {
    if (!engine.initialized) {
      console.warn('[tines-manager] Engine not initialized');
      return null;
    }

    const instrument = instruments[channelName];
    if (!instrument) {
      console.warn(`[tines-manager] Instrument not found: ${channelName}`);
      return null;
    }

    // Handle TinesPattern objects
    let pattern, events, finalParams;
    if (patternStr instanceof TinesPattern) {
      events = patternStr.getEvents();
      finalParams = { ...patternStr.getParams(), ...params };
      pattern = patternStr;
    } else {
      pattern = new Pattern(patternStr, params);
      events = pattern.getEvents();
      finalParams = params;
    }

    if (!events || events.length === 0) {
      console.warn('[tines-manager] Empty pattern');
      return null;
    }

    const patternId = `${channelName}_${Date.now()}_${Math.random()}`;

    // For drones, play once and sustain (don't retrigger)
    // For other instruments, retrigger on each step
    let lastEvent = null;

    // Register pattern with clock
    clock.registerPattern(patternId, {
      events: events,
      callback: (event, time, step) => {
        if (event && event !== '~') {
          // For drones, only play if the note changes
          if (channelName === 'drone') {
            if (event !== lastEvent) {
              // Stop previous drone voices for this pattern
              instrument.stop();
              // Play new note with BPM-synced LFO rate
              const bpm = store.getState().audio.bpm;
              const lfoRate = bpm / 60 * 4; // 4x faster - audible at high BPM
              const droneParams = { ...finalParams, lfoRate };
              instrument.play(event, droneParams);
              lastEvent = event;
            }
          } else {
            // Other instruments retrigger every step
            instrument.play(event, finalParams);
          }
        } else {
          // Rest - stop drone
          if (channelName === 'drone' && lastEvent !== null) {
            instrument.stop();
            lastEvent = null;
          }
        }
      }
    });

    activePatterns.set(patternId, {
      id: patternId,
      channel: channelName,
      pattern: events,
      params: finalParams
    });

    // Add to visual player
    if (visualPlayer) {
      visualPlayer.addPattern(patternId, channelName, events, finalParams);
    }

    // Dispatch Redux action
    store.dispatch({
      type: ActionTypes.AUDIO_PLAY_PATTERN,
      payload: { channel: channelName, pattern: events.join(' '), params: finalParams }
    });

    // Start clock if not playing
    if (!clock.playing) {
      clock.start();
      store.dispatch({ type: ActionTypes.AUDIO_CLOCK_START });
    }

    console.log(`[tines-manager] Playing pattern on ${channelName}:`, patternStr);
    return patternId;
  }

  /**
   * Stop a pattern
   */
  function stopPattern(patternId) {
    if (!patternId) return;

    clock.unregisterPattern(patternId);
    const pattern = activePatterns.get(patternId);

    if (pattern) {
      // Stop instrument voices
      const instrument = instruments[pattern.channel];
      if (instrument && instrument.stop) {
        instrument.stop();
      }

      activePatterns.delete(patternId);
    }

    // Remove from visual player
    if (visualPlayer) {
      visualPlayer.removePattern(patternId);
    }

    store.dispatch({
      type: ActionTypes.AUDIO_STOP_PATTERN,
      payload: patternId
    });
  }

  /**
   * Stop all patterns
   */
  function stopAll() {
    clock.clearPatterns();
    clock.stop();

    // Stop all instruments
    Object.values(instruments).forEach(instrument => {
      if (instrument.stop) {
        instrument.stop();
      }
    });

    engine.stopAll();
    activePatterns.clear();

    // Clear visual player
    if (visualPlayer) {
      visualPlayer.clearPatterns();
    }

    store.dispatch({ type: ActionTypes.AUDIO_STOP_ALL });
    store.dispatch({ type: ActionTypes.AUDIO_CLOCK_STOP });
  }

  /**
   * Stop all patterns on a channel
   */
  function stopChannel(channelName) {
    const channelPatterns = Array.from(activePatterns.values())
      .filter(p => p.channel === channelName);

    channelPatterns.forEach(p => stopPattern(p.id));

    engine.stopChannel(channelName);

    store.dispatch({
      type: ActionTypes.AUDIO_STOP_CHANNEL,
      payload: channelName
    });
  }

  /**
   * Set BPM
   */
  function setBPM(bpm) {
    if (!clock) return;

    clock.setBPM(bpm);

    // Update drone LFO rate to sync with BPM
    // LFO rate = BPM / 60 * 4 (4x faster - becomes audible at high BPM)
    // At 60 BPM: 4 Hz, at 120 BPM: 8 Hz, at 300 BPM: 20 Hz (audible tremolo)
    const lfoRate = bpm / 60 * 4;
    if (instruments.drone) {
      instruments.drone.activeVoices.forEach(voice => {
        voice.setParam('lfoRate', lfoRate);
      });
    }

    store.dispatch({
      type: ActionTypes.AUDIO_SET_BPM,
      payload: bpm
    });

    console.log(`[tines-manager] BPM set to ${bpm}, drone LFO rate: ${lfoRate.toFixed(3)} Hz`);
  }

  /**
   * Set master volume
   */
  function setMasterVolume(volume) {
    engine.setMasterVolume(volume);
    store.dispatch({
      type: ActionTypes.AUDIO_SET_MASTER_VOLUME,
      payload: volume
    });
  }

  /**
   * Set channel volume
   */
  function setChannelVolume(channelName, volume) {
    engine.setChannelVolume(channelName, volume);
    store.dispatch({
      type: ActionTypes.AUDIO_SET_CHANNEL_VOLUME,
      payload: { channel: channelName, volume }
    });
  }

  /**
   * Mute/unmute channel
   */
  function setChannelMute(channelName, muted) {
    engine.setChannelMute(channelName, muted);
    store.dispatch({
      type: ActionTypes.AUDIO_SET_CHANNEL_MUTE,
      payload: { channel: channelName, muted }
    });
  }

  /**
   * Set channel pan (-1 to 1)
   */
  function setChannelPan(channelName, pan) {
    engine.setChannelPan(channelName, pan);
    console.log(`[tines-manager] ${channelName} pan set to ${pan}`);
  }

  /**
   * Set a global variable
   */
  function setVariable(name, value) {
    globalVariables.setGlobal(name, value);
  }

  /**
   * Get a variable
   */
  function getVariable(name) {
    return globalVariables.getGlobal(name);
  }

  /**
   * List all variables
   */
  function listVariables() {
    return globalVariables.list();
  }

  /**
   * Start clock
   */
  function start() {
    if (!clock) return;

    clock.start();
    store.dispatch({ type: ActionTypes.AUDIO_CLOCK_START });
  }

  /**
   * Stop clock
   */
  function stop() {
    if (!clock) return;

    clock.stop();
    store.dispatch({ type: ActionTypes.AUDIO_CLOCK_STOP });
  }

  /**
   * Pause clock
   */
  function pause() {
    if (!clock) return;

    clock.pause();
    store.dispatch({ type: ActionTypes.AUDIO_CLOCK_PAUSE });
  }

  /**
   * Resume clock
   */
  function resume() {
    if (!clock) return;

    clock.resume();
    store.dispatch({ type: ActionTypes.AUDIO_CLOCK_RESUME });
  }

  /**
   * Get full status
   */
  function getStatus() {
    return {
      engine: engine.getStatus(),
      clock: clock ? clock.getStatus() : null,
      patterns: Array.from(activePatterns.values()),
      instruments: Object.keys(instruments).map(name => ({
        name,
        voiceCount: instruments[name].getVoiceCount ? instruments[name].getVoiceCount() : 0
      }))
    };
  }

  /**
   * Get instrument by name (for advanced usage)
   */
  function getInstrument(name) {
    return instruments[name];
  }

  /**
   * Dispose and cleanup
   */
  async function dispose() {
    stopAll();
    await engine.dispose();
    store.dispatch({ type: ActionTypes.AUDIO_DISPOSE });
  }

  // Return public API (factory pattern)
  return {
    // Core
    init,
    dispose,

    // Pattern control
    playPattern,
    stopPattern,
    stopAll,
    stopChannel,

    // Parameters
    setBPM,
    setMasterVolume,
    setChannelVolume,
    setChannelMute,
    setChannelPan,

    // Variables
    setVariable,
    getVariable,
    listVariables,

    // Clock control
    start,
    stop,
    pause,
    resume,

    // Status
    getStatus,
    getInstrument,

    // Direct access (for advanced usage)
    engine,
    get clock() { return clock; },
    get instruments() { return instruments; }
  };
}

/**
 * Create global API (Vecterm namespace)
 */
export function createGlobalAPI(manager) {
  // Ensure Vecterm namespace exists
  window.Vecterm = window.Vecterm || {};

  // Create Tines API
  window.Vecterm.Tines = {
    // Quick play methods
    drone: (note, params) => {
      const patternId = manager.playPattern('drone', note, params);
      return {
        stop: () => manager.stopPattern(patternId),
        id: patternId
      };
    },

    bells: (note, params) => {
      const patternId = manager.playPattern('bells', note, params);
      return {
        stop: () => manager.stopPattern(patternId),
        id: patternId
      };
    },

    // Pattern method (can now accept TinesPattern or string)
    pattern: (channel, patternStr, params) => {
      const patternId = manager.playPattern(channel, patternStr, params);
      return {
        stop: () => manager.stopPattern(patternId),
        id: patternId
      };
    },

    // Functional API constructors
    p,        // pattern()
    s,        // sound/sequence()
    n,        // note()
    stack,    // layer patterns
    seq,      // sequence patterns
    cat,      // concatenate
    alt,      // alternate

    // Create pattern function (chainable)
    create: (data) => {
      const pat = pattern(data);
      // Add manager reference for .play()
      pat.manager = manager;
      return pat;
    },

    // Control methods
    stop: () => manager.stopAll(),
    stopChannel: (channel) => manager.stopChannel(channel),

    // Parameter methods
    bpm: (bpm) => manager.setBPM(bpm),
    volume: (vol) => manager.setMasterVolume(vol),
    pan: (channel, pan) => manager.setChannelPan(channel, pan),

    // Variables
    set: (name, value) => manager.setVariable(name, value),
    get: (name) => manager.getVariable(name),
    vars: () => manager.listVariables(),

    // Status
    status: () => manager.getStatus(),

    // Clock control
    start: () => manager.start(),
    pause: () => manager.pause(),
    resume: () => manager.resume(),

    // Direct manager access
    manager
  };

  console.log('[tines] Global API created at window.Vecterm.Tines');
  console.log('[tines] Instruments: .drone(), .bells()');
  console.log('[tines] Functional API: .p(), .s(), .n(), .stack(), .seq()');
  console.log('[tines] Variables: .set(name, value), .get(name), .vars()');
  console.log('[tines] Pan: .pan(channel, -1 to 1)');
}
