/**
 * Phantom Channels - Remote Player Audio Rendering
 *
 * Manages audio rendering for remote players:
 * - Creates Tines instances for each remote player
 * - Routes collision events to appropriate phantom Tines
 * - Applies spatial audio parameters
 * - Lifecycle management of phantom channels
 *
 * Terminology:
 * - Owned Channels: Your local Tines (2 oscillators)
 * - Phantom Channels: Remote players' Tines (spatially positioned)
 */

import { spatialAudio } from './spatial-audio-engine.js';
import { TinesEngine } from './tines-engine.js';

export class PhantomChannels {
  constructor() {
    // Phantom Tines instances per player
    this.phantoms = new Map(); // playerPosition -> TinesEngine instance

    // Spatial audio sources per phantom
    this.spatialSources = new Map(); // playerPosition -> { osc1Source, osc2Source }

    // Own position
    this.myPosition = null;

    // Configuration
    this.config = {
      enableSpatial: true,
      phantomVolume: 0.6,
      minTriggerInterval: 50 // ms - prevent audio spam
    };

    // Last trigger times (for throttling)
    this.lastTriggers = new Map(); // playerPosition -> timestamp

    this.initialized = false;
  }

  /**
   * Initialize phantom channels for topology
   *
   * @param {string} myPosition - Your player position (player1-4)
   * @param {object} topology - Game topology
   */
  async initialize(myPosition, topology) {
    if (this.initialized) {
      console.warn('Phantom channels already initialized');
      return;
    }

    this.myPosition = myPosition;

    // Get all player positions except own
    const allPositions = Object.keys(topology.neighborhoods);
    const remotePositions = allPositions.filter(pos => pos !== myPosition);

    console.log(`Initializing phantom channels for ${remotePositions.length} remote players...`);

    // Create phantom Tines for each remote player
    for (const position of remotePositions) {
      await this.createPhantom(position);
    }

    this.initialized = true;
    console.log(`✓ Phantom channels initialized (${this.phantoms.size} phantoms)`);
  }

  /**
   * Create phantom Tines for a player
   */
  async createPhantom(playerPosition) {
    if (this.phantoms.has(playerPosition)) {
      console.warn(`Phantom already exists for ${playerPosition}`);
      return;
    }

    // Create Tines instance
    const tines = new TinesEngine();
    await tines.initialize();

    // Set lower volume for phantoms (will be further attenuated by distance)
    tines.setMasterVolume(this.config.phantomVolume);

    // Create spatial sources for this phantom's oscillators
    if (this.config.enableSpatial && spatialAudio.initialized) {
      const osc1Source = spatialAudio.createSource(
        `${playerPosition}-osc1`,
        playerPosition
      );
      const osc2Source = spatialAudio.createSource(
        `${playerPosition}-osc2`,
        playerPosition
      );

      // Connect Tines oscillators to spatial sources
      if (osc1Source && osc2Source) {
        // Connect osc1 to spatial source
        tines.oscillators[0].gainNode.disconnect();
        tines.oscillators[0].gainNode.connect(osc1Source.input);

        // Connect osc2 to spatial source
        tines.oscillators[1].gainNode.disconnect();
        tines.oscillators[1].gainNode.connect(osc2Source.input);

        this.spatialSources.set(playerPosition, {
          osc1: osc1Source,
          osc2: osc2Source
        });

        console.log(`✓ Created spatial phantom: ${playerPosition}`);
      }
    }

    this.phantoms.set(playerPosition, tines);
    this.lastTriggers.set(playerPosition, 0);

    return tines;
  }

  /**
   * Remove phantom for a player (when they leave)
   */
  removePhantom(playerPosition) {
    if (!this.phantoms.has(playerPosition)) return;

    // Get Tines instance
    const tines = this.phantoms.get(playerPosition);

    // Disconnect and stop
    tines.dispose();

    // Remove spatial sources
    if (this.spatialSources.has(playerPosition)) {
      const sources = this.spatialSources.get(playerPosition);
      spatialAudio.removeSource(`${playerPosition}-osc1`);
      spatialAudio.removeSource(`${playerPosition}-osc2`);
      this.spatialSources.delete(playerPosition);
    }

    this.phantoms.delete(playerPosition);
    this.lastTriggers.delete(playerPosition);

    console.log(`✓ Removed phantom: ${playerPosition}`);
  }

  /**
   * Handle collision event from remote player
   *
   * @param {object} collisionEvent - Collision event from network
   */
  handleCollisionEvent(collisionEvent) {
    const playerPosition = collisionEvent.triggeredBy;

    // Ignore own collisions (handled locally)
    if (playerPosition === this.myPosition) {
      return;
    }

    // Check if phantom exists
    if (!this.phantoms.has(playerPosition)) {
      console.warn(`No phantom for ${playerPosition}, creating...`);
      this.createPhantom(playerPosition);
      return;
    }

    // Throttle triggers to prevent audio spam
    const now = Date.now();
    const lastTrigger = this.lastTriggers.get(playerPosition) || 0;
    if (now - lastTrigger < this.config.minTriggerInterval) {
      return; // Too soon, skip
    }
    this.lastTriggers.set(playerPosition, now);

    // Get phantom Tines
    const tines = this.phantoms.get(playerPosition);

    // Extract audio parameters
    const params = collisionEvent.audioParams || {};
    const frequency = params.frequency || 440;
    const filterCutoff = params.filterCutoff || 2000;
    const decay = params.decay || 0.5;
    const volume = params.volume || 0.8;
    const impactForce = collisionEvent.impactForce || 1.0;

    // Determine which oscillator to use (alternate for variety)
    const oscIndex = Math.random() < 0.5 ? 0 : 1;
    const osc = tines.oscillators[oscIndex];

    // Set parameters
    osc.setFrequency(frequency);
    osc.filter.frequency.value = filterCutoff;
    osc.setEnvelopeDecay(decay);
    osc.setVolume(volume);

    // Apply spatial attenuation if enabled
    if (this.config.enableSpatial) {
      const sourceId = `${playerPosition}-osc${oscIndex + 1}`;
      if (spatialAudio.hasSource(sourceId)) {
        const spatialParams = spatialAudio.applySpatialAttenuation(sourceId, impactForce);

        // Debug log
        if (spatialParams.distance > 0.1) {
          console.log(`Phantom trigger: ${playerPosition} (dist: ${spatialParams.distance.toFixed(2)}, vol: ${spatialParams.volumeAttenuation.toFixed(2)})`);
        }
      }
    }

    // Trigger the oscillator
    osc.trigger();
  }

  /**
   * Handle OSC command for phantom
   *
   * @param {string} playerPosition - Target player position
   * @param {string} address - OSC address (e.g., /tines/osc1/freq)
   * @param {*} value - Parameter value
   */
  handleOSCCommand(playerPosition, address, value) {
    // Ignore own commands (handled locally)
    if (playerPosition === this.myPosition) {
      return;
    }

    if (!this.phantoms.has(playerPosition)) {
      console.warn(`No phantom for ${playerPosition}`);
      return;
    }

    const tines = this.phantoms.get(playerPosition);

    // Parse address
    const parts = address.split('/').filter(Boolean);
    if (parts.length < 3) {
      console.warn('Invalid OSC address:', address);
      return;
    }

    const [module, instance, param] = parts;

    if (module !== 'tines') return;

    // Get oscillator index
    const oscIndex = instance === 'osc1' ? 0 : instance === 'osc2' ? 1 : -1;
    if (oscIndex === -1) {
      console.warn('Invalid oscillator:', instance);
      return;
    }

    const osc = tines.oscillators[oscIndex];

    // Apply parameter
    switch (param) {
      case 'freq':
      case 'frequency':
        osc.setFrequency(value);
        break;

      case 'volume':
      case 'gain':
        osc.setVolume(value);
        break;

      case 'detune':
        osc.setDetune(value);
        break;

      case 'waveform':
      case 'type':
        osc.setWaveform(value);
        break;

      case 'trigger':
        if (value > 0) {
          osc.trigger();
        }
        break;

      case 'filter':
      case 'cutoff':
        osc.filter.frequency.value = value;
        break;

      default:
        console.warn('Unknown parameter:', param);
    }
  }

  /**
   * Get phantom Tines for a player
   */
  getPhantom(playerPosition) {
    return this.phantoms.get(playerPosition);
  }

  /**
   * Check if phantom exists
   */
  hasPhantom(playerPosition) {
    return this.phantoms.has(playerPosition);
  }

  /**
   * Get all phantoms
   */
  getAllPhantoms() {
    return Array.from(this.phantoms.entries()).map(([position, tines]) => ({
      position,
      tines,
      spatialSources: this.spatialSources.get(position)
    }));
  }

  /**
   * Mute/unmute phantom
   */
  mutePhantom(playerPosition, muted = true) {
    if (!this.phantoms.has(playerPosition)) return;

    const tines = this.phantoms.get(playerPosition);
    tines.setMasterVolume(muted ? 0 : this.config.phantomVolume);
  }

  /**
   * Set phantom volume
   */
  setPhantomVolume(playerPosition, volume) {
    if (!this.phantoms.has(playerPosition)) return;

    const tines = this.phantoms.get(playerPosition);
    tines.setMasterVolume(volume);
  }

  /**
   * Set global phantom volume
   */
  setGlobalPhantomVolume(volume) {
    this.config.phantomVolume = volume;
    this.phantoms.forEach((tines) => {
      tines.setMasterVolume(volume);
    });
  }

  /**
   * Enable/disable spatial audio
   */
  setSpatialEnabled(enabled) {
    this.config.enableSpatial = enabled;
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    Object.assign(this.config, config);
  }

  /**
   * Debug: Print phantom channels state
   */
  debug() {
    console.log('\n=== Phantom Channels ===');
    console.log(`Initialized: ${this.initialized}`);
    console.log(`My Position: ${this.myPosition}`);
    console.log(`Phantoms: ${this.phantoms.size}`);
    console.log(`Spatial Enabled: ${this.config.enableSpatial}`);

    this.phantoms.forEach((tines, position) => {
      console.log(`\n  ${position}:`);
      console.log(`    Oscillators: ${tines.oscillators.length}`);
      console.log(`    Master Volume: ${tines.masterGain.gain.value.toFixed(2)}`);

      if (this.spatialSources.has(position)) {
        const sources = this.spatialSources.get(position);
        console.log(`    Spatial Sources: osc1, osc2`);
      }
    });

    console.log('========================\n');
  }

  /**
   * Cleanup
   */
  dispose() {
    // Remove all phantoms
    this.phantoms.forEach((tines, position) => {
      this.removePhantom(position);
    });

    this.phantoms.clear();
    this.spatialSources.clear();
    this.lastTriggers.clear();

    this.initialized = false;
    console.log('✓ Phantom channels disposed');
  }
}

// Create singleton instance
export const phantomChannels = new PhantomChannels();
