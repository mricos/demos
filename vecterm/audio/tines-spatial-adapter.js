/**
 * Tines Spatial Adapter - Unified Interface for Owned + Phantom Tines
 *
 * Provides a unified interface for controlling:
 * - Owned Tines (your local 2 oscillators)
 * - Phantom Tines (remote players' spatially positioned audio)
 *
 * Features:
 * - Address resolution (@me, @left, @right, @all)
 * - Network message relay
 * - Collision event broadcasting
 * - OSC command routing
 */

import { TinesEngine } from './tines-engine.js';
import { spatialAudio } from './spatial-audio-engine.js';
import { phantomChannels } from './phantom-channels.js';
import { addressResolver } from '../core/address-resolver.js';
import { lobby } from '../core/lobby-manager.js';
import { createCollisionEvent, createOSCCommand, MessageType } from '../core/network-protocol.js';

export class TinesSpatialAdapter {
  constructor() {
    // Owned Tines (local)
    this.ownedTines = null;

    // Network protocol
    this.networkProtocol = null;

    // Configuration
    this.config = {
      broadcastCollisions: true,
      broadcastOSC: true,
      enablePhantoms: true
    };

    this.initialized = false;
  }

  /**
   * Initialize adapter with owned Tines
   *
   * @param {TinesEngine} tinesEngine - Your local Tines instance
   * @param {NetworkProtocol} networkProtocol - Network protocol instance (optional)
   */
  async initialize(tinesEngine, networkProtocol = null) {
    if (this.initialized) {
      console.warn('Tines spatial adapter already initialized');
      return;
    }

    this.ownedTines = tinesEngine;
    this.networkProtocol = networkProtocol;

    // Initialize spatial audio if in multiplayer
    if (lobby.roomId && addressResolver) {
      const myPosition = lobby.getMyPosition();

      // Initialize spatial audio engine
      await spatialAudio.initialize(myPosition);

      // Initialize phantom channels
      if (this.config.enablePhantoms && lobby.topology) {
        await phantomChannels.initialize(myPosition, lobby.topology);
      }

      // Register network handlers
      if (this.networkProtocol) {
        this.registerNetworkHandlers();
      }

      console.log('✓ Tines spatial adapter initialized (multiplayer mode)');
    } else {
      console.log('✓ Tines spatial adapter initialized (solo mode)');
    }

    this.initialized = true;
  }

  /**
   * Register network message handlers
   */
  registerNetworkHandlers() {
    // Handle incoming collision events
    this.networkProtocol.registerHandler(
      MessageType.COLLISION_EVENT,
      this.handleRemoteCollision.bind(this)
    );

    // Handle incoming OSC commands
    this.networkProtocol.registerHandler(
      MessageType.OSC_COMMAND,
      this.handleRemoteOSC.bind(this)
    );
  }

  /**
   * Send OSC command with scope resolution
   *
   * @param {string} address - OSC address (e.g., /tines/osc1/freq)
   * @param {*} value - Parameter value
   * @param {string} scope - Scope (@me, @left, @right, @all)
   */
  sendOSC(address, value, scope = '@me') {
    if (!addressResolver) {
      // Solo mode - apply locally
      this.applyLocalOSC(address, value);
      return;
    }

    // Resolve address to player position(s)
    const resolved = addressResolver.resolve(address, scope);
    const positions = addressResolver.resolveScope(scope);

    // Apply to each position
    positions.forEach(position => {
      if (position === lobby.getMyPosition()) {
        // Local - apply directly
        this.applyLocalOSC(address, value);
      } else {
        // Remote - route to phantom
        if (this.config.enablePhantoms) {
          phantomChannels.handleOSCCommand(position, address, value);
        }

        // Broadcast over network if enabled
        if (this.config.broadcastOSC && this.networkProtocol) {
          const message = createOSCCommand(address, value, scope);
          this.networkProtocol.send(message, '@all');
        }
      }
    });
  }

  /**
   * Apply OSC command to owned Tines
   */
  applyLocalOSC(address, value) {
    if (!this.ownedTines) return;

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
    if (oscIndex === -1) return;

    const osc = this.ownedTines.oscillators[oscIndex];

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
   * Broadcast collision event
   *
   * Called when local collision occurs
   *
   * @param {object} collision - Collision data
   */
  broadcastCollision(collision) {
    if (!this.config.broadcastCollisions) return;
    if (!this.networkProtocol) return;

    // Add player position
    collision.triggeredBy = lobby.getMyPosition();

    // Create collision event
    const event = createCollisionEvent(collision);

    // Broadcast to all players
    this.networkProtocol.send(event, '@all');

    console.log('📡 Broadcasted collision event:', event.eventId);
  }

  /**
   * Handle remote collision event
   */
  handleRemoteCollision(message, fromPlayerId) {
    if (!this.config.enablePhantoms) return;

    const collision = message;

    // Route to phantom channels
    phantomChannels.handleCollisionEvent(collision);
  }

  /**
   * Handle remote OSC command
   */
  handleRemoteOSC(message, fromPlayerId) {
    const { address, value, scope } = message;

    // Resolve scope
    const positions = addressResolver.resolveScope(scope);

    // Apply to each position
    positions.forEach(position => {
      if (position === lobby.getMyPosition()) {
        // Local
        this.applyLocalOSC(address, value);
      } else if (this.config.enablePhantoms) {
        // Phantom
        phantomChannels.handleOSCCommand(position, address, value);
      }
    });
  }

  /**
   * Trigger owned Tines oscillator
   *
   * @param {number} oscIndex - Oscillator index (0 or 1)
   * @param {object} params - Trigger parameters
   */
  triggerOwned(oscIndex, params = {}) {
    if (!this.ownedTines) return;

    const osc = this.ownedTines.oscillators[oscIndex];

    // Apply parameters if provided
    if (params.frequency) osc.setFrequency(params.frequency);
    if (params.volume !== undefined) osc.setVolume(params.volume);
    if (params.detune !== undefined) osc.setDetune(params.detune);
    if (params.decay) osc.setEnvelopeDecay(params.decay);

    // Trigger
    osc.trigger();
  }

  /**
   * Create and broadcast collision from game event
   *
   * @param {object} gameCollision - Game collision data
   */
  async handleGameCollision(gameCollision) {
    const {
      position,       // { x, y } in normalized coords
      velocity,       // { x, y }
      impactForce,    // 0-1
      paddleId        // Which paddle was hit
    } = gameCollision;

    // Calculate audio parameters from collision
    const frequency = this.calculateFrequencyFromPosition(position);
    const filterCutoff = this.calculateFilterFromVelocity(velocity);
    const decay = this.calculateDecayFromImpact(impactForce);
    const volume = Math.min(impactForce, 0.8);

    // Trigger owned Tines
    const oscIndex = Math.random() < 0.5 ? 0 : 1;
    this.triggerOwned(oscIndex, {
      frequency,
      volume,
      decay
    });

    // Broadcast collision event
    if (this.config.broadcastCollisions) {
      this.broadcastCollision({
        x: position.x,
        y: position.y,
        vx: velocity.x,
        vy: velocity.y,
        impactForce: impactForce,
        frequency: frequency,
        filterCutoff: filterCutoff,
        decay: decay,
        volume: volume
      });
    }
  }

  /**
   * Calculate frequency from collision position
   */
  calculateFrequencyFromPosition(position) {
    // Map Y position (-1 to 1) to frequency range
    const minFreq = 220;  // A3
    const maxFreq = 880;  // A5

    const normalized = (position.y + 1) / 2; // 0-1
    return minFreq + (normalized * (maxFreq - minFreq));
  }

  /**
   * Calculate filter cutoff from velocity
   */
  calculateFilterFromVelocity(velocity) {
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const minCutoff = 500;
    const maxCutoff = 5000;

    return minCutoff + (speed * (maxCutoff - minCutoff));
  }

  /**
   * Calculate envelope decay from impact force
   */
  calculateDecayFromImpact(impactForce) {
    const minDecay = 0.2;
    const maxDecay = 1.0;

    return minDecay + (impactForce * (maxDecay - minDecay));
  }

  /**
   * Get owned Tines
   */
  getOwnedTines() {
    return this.ownedTines;
  }

  /**
   * Get phantom for player
   */
  getPhantom(playerPosition) {
    return phantomChannels.getPhantom(playerPosition);
  }

  /**
   * Get all phantoms
   */
  getAllPhantoms() {
    return phantomChannels.getAllPhantoms();
  }

  /**
   * Mute/unmute phantom
   */
  mutePhantom(playerPosition, muted = true) {
    phantomChannels.mutePhantom(playerPosition, muted);
  }

  /**
   * Set phantom volume
   */
  setPhantomVolume(playerPosition, volume) {
    phantomChannels.setPhantomVolume(playerPosition, volume);
  }

  /**
   * Set global phantom volume
   */
  setGlobalPhantomVolume(volume) {
    phantomChannels.setGlobalPhantomVolume(volume);
  }

  /**
   * Enable/disable phantom channels
   */
  setPhantomEnabled(enabled) {
    this.config.enablePhantoms = enabled;
  }

  /**
   * Enable/disable collision broadcasting
   */
  setCollisionBroadcasting(enabled) {
    this.config.broadcastCollisions = enabled;
  }

  /**
   * Enable/disable OSC broadcasting
   */
  setOSCBroadcasting(enabled) {
    this.config.broadcastOSC = enabled;
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    Object.assign(this.config, config);
  }

  /**
   * Get audio status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      hasOwnedTines: !!this.ownedTines,
      spatialAudio: {
        initialized: spatialAudio.initialized,
        sources: spatialAudio.getAllSources().length
      },
      phantomChannels: {
        initialized: phantomChannels.initialized,
        count: phantomChannels.getAllPhantoms().length
      },
      networking: {
        connected: !!this.networkProtocol,
        broadcastCollisions: this.config.broadcastCollisions,
        broadcastOSC: this.config.broadcastOSC
      },
      config: this.config
    };
  }

  /**
   * Debug: Print adapter state
   */
  debug() {
    console.log('\n=== Tines Spatial Adapter ===');
    console.log(`Initialized: ${this.initialized}`);
    console.log(`Owned Tines: ${!!this.ownedTines}`);
    console.log(`Network Protocol: ${!!this.networkProtocol}`);
    console.log(`Config:`, this.config);

    if (spatialAudio.initialized) {
      spatialAudio.debug();
    }

    if (phantomChannels.initialized) {
      phantomChannels.debug();
    }

    console.log('==============================\n');
  }

  /**
   * Cleanup
   */
  dispose() {
    // Dispose phantom channels
    if (phantomChannels.initialized) {
      phantomChannels.dispose();
    }

    // Dispose spatial audio
    if (spatialAudio.initialized) {
      spatialAudio.dispose();
    }

    this.ownedTines = null;
    this.networkProtocol = null;
    this.initialized = false;

    console.log('✓ Tines spatial adapter disposed');
  }
}

// Create singleton instance
export const tinesSpatialAdapter = new TinesSpatialAdapter();

// Export convenience methods
export function sendTinesOSC(address, value, scope = '@me') {
  return tinesSpatialAdapter.sendOSC(address, value, scope);
}

export function broadcastCollision(collision) {
  return tinesSpatialAdapter.broadcastCollision(collision);
}
