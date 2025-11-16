/**
 * Network Protocol - Message Types and Serialization
 *
 * Defines the protocol for multiplayer communication:
 * - Collision events (for spatial audio)
 * - Game state sync
 * - Player input
 * - OSC/audio commands
 */

/**
 * Message Types
 */
export const MessageType = {
  // Collision events for spatial audio
  COLLISION_EVENT: 'collision_event',

  // Game state sync
  GAME_STATE: 'game_state',
  ENTITY_UPDATE: 'entity_update',

  // Player input
  PLAYER_INPUT: 'player_input',

  // Audio commands
  AUDIO_EVENT: 'audio_event',
  OSC_COMMAND: 'osc_command',

  // Control
  PING: 'ping',
  PONG: 'pong'
};

/**
 * Create collision event message
 *
 * @param {object} collision - Collision data
 * @returns {object} - Formatted message
 */
export function createCollisionEvent(collision) {
  return {
    type: MessageType.COLLISION_EVENT,
    eventId: generateEventId(),
    timestamp: Date.now(),
    position: {
      x: collision.x || 0,
      y: collision.y || 0
    },
    velocity: {
      x: collision.vx || 0,
      y: collision.vy || 0
    },
    impactForce: collision.impactForce || 1.0,
    triggeredBy: collision.triggeredBy || 'unknown',
    audioParams: {
      frequency: collision.frequency || 440,
      filterCutoff: collision.filterCutoff || 2000,
      decay: collision.decay || 0.5,
      volume: collision.volume || 0.8
    },
    relay: true // Relay to other players
  };
}

/**
 * Create game state update message
 *
 * @param {object} state - Game state data
 * @returns {object} - Formatted message
 */
export function createGameStateUpdate(state) {
  return {
    type: MessageType.GAME_STATE,
    timestamp: Date.now(),
    state: {
      entities: state.entities || {},
      scores: state.scores || {},
      gameTime: state.gameTime || 0
    },
    relay: false // Don't relay (host authoritative)
  };
}

/**
 * Create entity update message (differential)
 *
 * @param {string} entityId - Entity ID
 * @param {object} updates - Updated properties
 * @returns {object} - Formatted message
 */
export function createEntityUpdate(entityId, updates) {
  return {
    type: MessageType.ENTITY_UPDATE,
    timestamp: Date.now(),
    entityId: entityId,
    updates: updates,
    relay: true // Relay to other players
  };
}

/**
 * Create player input message
 *
 * @param {object} input - Input data
 * @returns {object} - Formatted message
 */
export function createPlayerInput(input) {
  return {
    type: MessageType.PLAYER_INPUT,
    timestamp: Date.now(),
    input: {
      keys: input.keys || {},
      gamepad: input.gamepad || null,
      mouse: input.mouse || null
    },
    relay: false // Send to host only
  };
}

/**
 * Create OSC command message
 *
 * @param {string} address - OSC address (e.g., /tines/osc1/freq)
 * @param {*} value - Parameter value
 * @param {string} scope - Scope (@me, @left, @right, @all)
 * @returns {object} - Formatted message
 */
export function createOSCCommand(address, value, scope = '@me') {
  return {
    type: MessageType.OSC_COMMAND,
    timestamp: Date.now(),
    address: address,
    value: value,
    scope: scope,
    relay: scope === '@all' // Relay if broadcasting
  };
}

/**
 * Create audio event message (generic)
 *
 * @param {string} eventType - Event type (trigger, note, etc.)
 * @param {object} params - Event parameters
 * @returns {object} - Formatted message
 */
export function createAudioEvent(eventType, params) {
  return {
    type: MessageType.AUDIO_EVENT,
    timestamp: Date.now(),
    eventType: eventType,
    params: params,
    relay: params.broadcast || false
  };
}

/**
 * Create ping message
 *
 * @returns {object} - Ping message
 */
export function createPing() {
  return {
    type: MessageType.PING,
    timestamp: Date.now(),
    relay: false
  };
}

/**
 * Create pong response
 *
 * @param {number} pingTimestamp - Original ping timestamp
 * @returns {object} - Pong message
 */
export function createPong(pingTimestamp) {
  return {
    type: MessageType.PONG,
    timestamp: Date.now(),
    pingTimestamp: pingTimestamp,
    relay: false
  };
}

/**
 * Serialize message for network transmission
 *
 * @param {object} message - Message object
 * @returns {string} - JSON string
 */
export function serialize(message) {
  try {
    return JSON.stringify(message);
  } catch (err) {
    console.error('Failed to serialize message:', err);
    return null;
  }
}

/**
 * Deserialize message from network
 *
 * @param {string} data - JSON string
 * @returns {object} - Message object
 */
export function deserialize(data) {
  try {
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to deserialize message:', err);
    return null;
  }
}

/**
 * Validate message structure
 *
 * @param {object} message - Message to validate
 * @returns {boolean} - True if valid
 */
export function validateMessage(message) {
  if (!message || typeof message !== 'object') return false;
  if (!message.type) return false;
  if (!Object.values(MessageType).includes(message.type)) return false;

  return true;
}

/**
 * Generate unique event ID
 */
function generateEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate message priority (for future queueing/throttling)
 *
 * @param {object} message - Message object
 * @returns {number} - Priority (higher = more important)
 */
export function getMessagePriority(message) {
  switch (message.type) {
    case MessageType.COLLISION_EVENT:
      return 10; // High priority - time-sensitive audio

    case MessageType.PLAYER_INPUT:
      return 9; // High priority - gameplay

    case MessageType.ENTITY_UPDATE:
      return 8; // Medium-high priority

    case MessageType.OSC_COMMAND:
      return 7; // Medium priority

    case MessageType.AUDIO_EVENT:
      return 6; // Medium priority

    case MessageType.GAME_STATE:
      return 5; // Lower priority - full sync

    case MessageType.PING:
    case MessageType.PONG:
      return 1; // Low priority - health check

    default:
      return 5; // Default medium priority
  }
}

/**
 * Calculate spatial audio parameters from collision
 *
 * This calculates the 3D audio positioning based on:
 * - Collision position in playfield (normalized -1 to 1)
 * - Player's position in topology
 * - Distance attenuation
 *
 * @param {object} collision - Collision event
 * @param {string} listenerPosition - Listener's player position (player1-4)
 * @param {object} topology - Game topology
 * @returns {object} - Spatial audio parameters
 */
export function calculateSpatialParams(collision, listenerPosition, topology) {
  // Map playfield positions to spatial positions
  const positions = {
    player1: { x: 0, y: 1, z: 0 },   // Top
    player2: { x: 1, y: 0, z: 0 },   // Right
    player3: { x: 0, y: -1, z: 0 },  // Bottom
    player4: { x: -1, y: 0, z: 0 }   // Left
  };

  const sourcePos = positions[collision.triggeredBy] || { x: 0, y: 0, z: 0 };
  const listenerPos = positions[listenerPosition] || { x: 0, y: 0, z: 0 };

  // Calculate distance
  const dx = sourcePos.x - listenerPos.x;
  const dy = sourcePos.y - listenerPos.y;
  const dz = sourcePos.z - listenerPos.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Distance attenuation (exponential rolloff)
  const maxDistance = 2.828; // sqrt(2^2 + 2^2) for square topology
  const normalizedDistance = Math.min(distance / maxDistance, 1);
  const volumeAttenuation = Math.pow(1 - normalizedDistance, 2); // Quadratic rolloff

  // Filter attenuation (distant sounds are more muffled)
  const filterAttenuation = 1 - (normalizedDistance * 0.7);

  return {
    position: sourcePos,
    distance: distance,
    volumeAttenuation: volumeAttenuation,
    filterAttenuation: filterAttenuation,
    pan: sourcePos.x - listenerPos.x, // -1 (left) to 1 (right)
    isLocal: collision.triggeredBy === listenerPosition
  };
}

/**
 * Network Protocol Manager
 * Handles message routing and processing
 */
export class NetworkProtocol {
  constructor(lobbyManager) {
    this.lobby = lobbyManager;
    this.handlers = new Map();
    this.messageQueue = [];
    this.processing = false;

    // Register default handlers
    this.registerHandler(MessageType.PING, this.handlePing.bind(this));
    this.registerHandler(MessageType.PONG, this.handlePong.bind(this));
  }

  /**
   * Register message handler
   */
  registerHandler(messageType, handler) {
    if (!this.handlers.has(messageType)) {
      this.handlers.set(messageType, []);
    }
    this.handlers.get(messageType).push(handler);
  }

  /**
   * Unregister message handler
   */
  unregisterHandler(messageType, handler) {
    if (!this.handlers.has(messageType)) return;

    const handlers = this.handlers.get(messageType);
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Process incoming message
   */
  processMessage(message, fromPlayerId) {
    if (!validateMessage(message)) {
      console.warn('Invalid message received:', message);
      return;
    }

    // Call registered handlers
    if (this.handlers.has(message.type)) {
      const handlers = this.handlers.get(message.type);
      handlers.forEach(handler => {
        try {
          handler(message, fromPlayerId);
        } catch (err) {
          console.error(`Error in ${message.type} handler:`, err);
        }
      });
    }
  }

  /**
   * Send message to player(s)
   */
  send(message, target = '@host') {
    if (!validateMessage(message)) {
      console.warn('Attempting to send invalid message:', message);
      return false;
    }

    if (target === '@host') {
      // Send to host
      return this.lobby.sendToHost(message);
    } else if (target === '@all') {
      // Broadcast to all
      this.lobby.broadcast(message);
      return true;
    } else {
      // Send to specific player
      return this.lobby.sendTo(target, message);
    }
  }

  /**
   * Handle ping message
   */
  handlePing(message, fromPlayerId) {
    // Send pong response
    const pong = createPong(message.timestamp);
    this.lobby.sendTo(fromPlayerId, pong);
  }

  /**
   * Handle pong message
   */
  handlePong(message, fromPlayerId) {
    // Calculate latency
    const latency = Date.now() - message.pingTimestamp;

    // Update connection health
    if (this.lobby.connectionHealth) {
      this.lobby.connectionHealth.set(fromPlayerId, {
        lastPing: Date.now(),
        latency: latency
      });
    }

    console.log(`Pong from ${fromPlayerId}: ${latency}ms`);
  }

  /**
   * Send ping to all players
   */
  pingAll() {
    const ping = createPing();
    this.lobby.broadcast(ping);
  }
}

// Export factory
export function createNetworkProtocol(lobbyManager) {
  return new NetworkProtocol(lobbyManager);
}
