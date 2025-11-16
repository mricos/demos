/**
 * Spatial Audio Engine - 3D Positioned Audio with Web Audio API
 *
 * Features:
 * - 3D positional audio using PannerNode
 * - Distance-based attenuation (exponential rolloff)
 * - HRTF (Head-Related Transfer Function) for realistic 3D
 * - Filter attenuation for distant sounds
 * - Per-source volume control
 *
 * Topology mapping:
 * - player1 (top):    { x: 0, y: 1, z: 0 }
 * - player2 (right):  { x: 1, y: 0, z: 0 }
 * - player3 (bottom): { x: 0, y: -1, z: 0 }
 * - player4 (left):   { x: -1, y: 0, z: 0 }
 */

export class SpatialAudioEngine {
  constructor() {
    // Audio context
    this.audioContext = null;
    this.masterGain = null;
    this.listener = null;

    // Spatial sources
    this.sources = new Map(); // sourceId -> { panner, gain, filter, position }

    // Configuration
    this.config = {
      distanceModel: 'exponential', // 'linear', 'inverse', 'exponential'
      rolloffFactor: 2.0,           // How quickly sound fades with distance
      refDistance: 0.5,             // Reference distance (no attenuation)
      maxDistance: 3.0,             // Maximum distance
      panningModel: 'HRTF',         // 'equalpower' or 'HRTF'
      coneInnerAngle: 360,
      coneOuterAngle: 360,
      coneOuterGain: 0.3
    };

    // Player positions in 3D space (topology mapping)
    this.playerPositions = {
      player1: { x: 0, y: 1, z: 0 },   // Top
      player2: { x: 1, y: 0, z: 0 },   // Right
      player3: { x: 0, y: -1, z: 0 },  // Bottom
      player4: { x: -1, y: 0, z: 0 }   // Left
    };

    // Listener position (your position)
    this.listenerPosition = null;

    this.initialized = false;
  }

  /**
   * Initialize audio context and listener
   */
  async initialize(listenerPlayerPosition = 'player1') {
    if (this.initialized) {
      console.warn('Spatial audio already initialized');
      return;
    }

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.audioContext.destination);

      // Get listener
      this.listener = this.audioContext.listener;

      // Set listener position
      this.setListenerPosition(listenerPlayerPosition);

      // Set listener orientation (facing forward, up is up)
      if (this.listener.forwardX) {
        // New API
        this.listener.forwardX.value = 0;
        this.listener.forwardY.value = 0;
        this.listener.forwardZ.value = -1;
        this.listener.upX.value = 0;
        this.listener.upY.value = 1;
        this.listener.upZ.value = 0;
      } else {
        // Deprecated API fallback
        this.listener.setOrientation(0, 0, -1, 0, 1, 0);
      }

      this.initialized = true;
      console.log('✓ Spatial audio initialized');
      console.log(`  Listener position: ${listenerPlayerPosition}`, this.playerPositions[listenerPlayerPosition]);

    } catch (err) {
      console.error('Failed to initialize spatial audio:', err);
      throw err;
    }
  }

  /**
   * Resume audio context (needed after user interaction)
   */
  async resume() {
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('✓ Audio context resumed');
    }
  }

  /**
   * Set listener position (your player position)
   */
  setListenerPosition(playerPosition) {
    this.listenerPosition = playerPosition;
    const pos = this.playerPositions[playerPosition] || { x: 0, y: 0, z: 0 };

    if (this.listener) {
      if (this.listener.positionX) {
        // New API
        this.listener.positionX.value = pos.x;
        this.listener.positionY.value = pos.y;
        this.listener.positionZ.value = pos.z;
      } else {
        // Deprecated API fallback
        this.listener.setPosition(pos.x, pos.y, pos.z);
      }
    }
  }

  /**
   * Create spatial source at player position
   *
   * @param {string} sourceId - Unique source identifier
   * @param {string} playerPosition - Player position (player1-4)
   * @returns {object} - Source nodes { panner, gain, filter, input }
   */
  createSource(sourceId, playerPosition) {
    if (this.sources.has(sourceId)) {
      console.warn(`Source ${sourceId} already exists`);
      return this.sources.get(sourceId);
    }

    if (!this.initialized) {
      console.error('Spatial audio not initialized');
      return null;
    }

    const pos = this.playerPositions[playerPosition] || { x: 0, y: 0, z: 0 };

    // Create audio nodes
    const panner = this.audioContext.createPanner();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    // Configure panner
    panner.panningModel = this.config.panningModel;
    panner.distanceModel = this.config.distanceModel;
    panner.rolloffFactor = this.config.rolloffFactor;
    panner.refDistance = this.config.refDistance;
    panner.maxDistance = this.config.maxDistance;
    panner.coneInnerAngle = this.config.coneInnerAngle;
    panner.coneOuterAngle = this.config.coneOuterAngle;
    panner.coneOuterGain = this.config.coneOuterGain;

    // Set panner position
    if (panner.positionX) {
      // New API
      panner.positionX.value = pos.x;
      panner.positionY.value = pos.y;
      panner.positionZ.value = pos.z;
    } else {
      // Deprecated API fallback
      panner.setPosition(pos.x, pos.y, pos.z);
    }

    // Configure filter (low-pass for distance attenuation)
    filter.type = 'lowpass';
    filter.frequency.value = 20000; // Default no filtering

    // Configure gain
    gain.gain.value = 1.0;

    // Connect nodes: source → filter → gain → panner → master
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain);

    const source = {
      panner,
      gain,
      filter,
      input: filter, // Input connection point
      position: { ...pos },
      playerPosition: playerPosition,
      sourceId: sourceId
    };

    this.sources.set(sourceId, source);

    console.log(`✓ Created spatial source: ${sourceId} at ${playerPosition}`, pos);

    return source;
  }

  /**
   * Remove spatial source
   */
  removeSource(sourceId) {
    if (!this.sources.has(sourceId)) return;

    const source = this.sources.get(sourceId);

    // Disconnect all nodes
    source.panner.disconnect();
    source.gain.disconnect();
    source.filter.disconnect();

    this.sources.delete(sourceId);
    console.log(`✓ Removed spatial source: ${sourceId}`);
  }

  /**
   * Update source position (if source moves)
   */
  updateSourcePosition(sourceId, x, y, z) {
    if (!this.sources.has(sourceId)) return;

    const source = this.sources.get(sourceId);
    const panner = source.panner;

    if (panner.positionX) {
      panner.positionX.value = x;
      panner.positionY.value = y;
      panner.positionZ.value = z;
    } else {
      panner.setPosition(x, y, z);
    }

    source.position = { x, y, z };
  }

  /**
   * Update source player position (snap to topology position)
   */
  updateSourcePlayerPosition(sourceId, playerPosition) {
    const pos = this.playerPositions[playerPosition];
    if (!pos) return;

    this.updateSourcePosition(sourceId, pos.x, pos.y, pos.z);

    if (this.sources.has(sourceId)) {
      this.sources.get(sourceId).playerPosition = playerPosition;
    }
  }

  /**
   * Set source volume
   */
  setSourceVolume(sourceId, volume) {
    if (!this.sources.has(sourceId)) return;

    const source = this.sources.get(sourceId);
    source.gain.gain.value = Math.max(0, Math.min(1, volume));
  }

  /**
   * Set source filter cutoff (for distance muffling)
   */
  setSourceFilter(sourceId, cutoffFrequency) {
    if (!this.sources.has(sourceId)) return;

    const source = this.sources.get(sourceId);
    source.filter.frequency.value = Math.max(20, Math.min(20000, cutoffFrequency));
  }

  /**
   * Calculate and apply spatial parameters based on distance
   */
  applySpatialAttenuation(sourceId, impactForce = 1.0) {
    if (!this.sources.has(sourceId)) return;

    const source = this.sources.get(sourceId);

    // Calculate distance from listener
    const dist = this.calculateDistance(source.position);

    // Normalize distance (0-1)
    const maxDist = 2.828; // sqrt(2^2 + 2^2) for square topology
    const normalizedDist = Math.min(dist / maxDist, 1);

    // Volume attenuation (quadratic falloff)
    const volumeAttenuation = Math.pow(1 - normalizedDist, 2);
    const finalVolume = impactForce * volumeAttenuation;
    this.setSourceVolume(sourceId, finalVolume);

    // Filter attenuation (distant sounds are more muffled)
    const filterAttenuation = 1 - (normalizedDist * 0.7);
    const cutoff = 20000 * filterAttenuation;
    this.setSourceFilter(sourceId, cutoff);

    return {
      distance: dist,
      normalizedDistance: normalizedDist,
      volumeAttenuation: volumeAttenuation,
      filterAttenuation: filterAttenuation
    };
  }

  /**
   * Calculate distance from listener position
   */
  calculateDistance(targetPosition) {
    if (!this.listenerPosition) return 0;

    const listenerPos = this.playerPositions[this.listenerPosition];
    const dx = targetPosition.x - listenerPos.x;
    const dy = targetPosition.y - listenerPos.y;
    const dz = targetPosition.z - listenerPos.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get source by ID
   */
  getSource(sourceId) {
    return this.sources.get(sourceId);
  }

  /**
   * Check if source exists
   */
  hasSource(sourceId) {
    return this.sources.has(sourceId);
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Get all sources
   */
  getAllSources() {
    return Array.from(this.sources.entries()).map(([id, source]) => ({
      sourceId: id,
      playerPosition: source.playerPosition,
      position: source.position,
      volume: source.gain.gain.value,
      filter: source.filter.frequency.value
    }));
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    Object.assign(this.config, config);

    // Update existing sources
    this.sources.forEach(source => {
      const panner = source.panner;
      panner.distanceModel = this.config.distanceModel;
      panner.rolloffFactor = this.config.rolloffFactor;
      panner.refDistance = this.config.refDistance;
      panner.maxDistance = this.config.maxDistance;
    });
  }

  /**
   * Debug: Print spatial audio state
   */
  debug() {
    console.log('\n=== Spatial Audio Engine ===');
    console.log(`Initialized: ${this.initialized}`);
    console.log(`Audio Context State: ${this.audioContext?.state}`);
    console.log(`Listener Position: ${this.listenerPosition}`);
    console.log(`Sources: ${this.sources.size}`);

    this.sources.forEach((source, id) => {
      const dist = this.calculateDistance(source.position);
      console.log(`  ${id}:`);
      console.log(`    Player: ${source.playerPosition}`);
      console.log(`    Position: (${source.position.x}, ${source.position.y}, ${source.position.z})`);
      console.log(`    Distance: ${dist.toFixed(2)}`);
      console.log(`    Volume: ${source.gain.gain.value.toFixed(2)}`);
      console.log(`    Filter: ${source.filter.frequency.value.toFixed(0)} Hz`);
    });

    console.log('============================\n');
  }

  /**
   * Cleanup
   */
  dispose() {
    // Remove all sources
    this.sources.forEach((source, id) => {
      this.removeSource(id);
    });

    // Disconnect master
    if (this.masterGain) {
      this.masterGain.disconnect();
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
    }

    this.initialized = false;
    console.log('✓ Spatial audio disposed');
  }
}

// Create singleton instance
export const spatialAudio = new SpatialAudioEngine();
