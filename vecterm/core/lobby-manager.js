/**
 * Lobby Manager - P2P Multiplayer Lobby System
 *
 * Handles:
 * - PeerJS-based WebRTC connections (zero-setup)
 * - Room creation/joining with friendly IDs
 * - Player position assignment (player1-4)
 * - Topology definition (square for quadrapong)
 * - Connection health monitoring
 * - Message relay between peers
 */

export class LobbyManager {
  constructor() {
    this.roomId = null;
    this.isHost = false;
    this.playerId = this.getOrCreatePlayerId();
    this.playerName = this.getPlayerProfile().playerName;
    this.players = new Map(); // playerId -> { name, connected, position, connection }
    this.topology = null;
    this.peer = null;
    this.hostConnection = null; // For non-hosts: connection to host
    this.onMessageCallbacks = new Map(); // message type -> callback
    this.connectionHealth = new Map(); // playerId -> { lastPing, latency }

    // Bind methods for event handlers
    this.handlePeerOpen = this.handlePeerOpen.bind(this);
    this.handlePeerConnection = this.handlePeerConnection.bind(this);
    this.handlePeerError = this.handlePeerError.bind(this);
    this.handlePeerDisconnected = this.handlePeerDisconnected.bind(this);
  }

  /**
   * Create a new room (become host)
   */
  async createRoom(gameName = 'quadrapong') {
    // Check dev credits (soft limit - warn but allow)
    const profile = this.getPlayerProfile();
    if (profile.credits.dev < 1) {
      console.warn('⚠️  Low dev credits! Consider adding more via credits.add');
    }

    // Generate friendly room ID
    this.roomId = this.generateRoomId();
    this.isHost = true;

    // Spend dev credit (soft - just tracking)
    this.spendCredit('dev', 'Hosted room: ' + this.roomId);

    // Initialize PeerJS as host
    const peerId = `vecterm-${this.roomId}-host`;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(peerId, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer.on('open', (id) => {
          this.handlePeerOpen(id);

          // Add self as player1
          this.players.set(this.playerId, {
            name: this.playerName,
            connected: true,
            position: 'player1',
            connection: null, // Host doesn't connect to self
            isHost: true
          });

          // Define topology for game
          this.topology = this.createTopology(gameName);

          // Update URL
          if (window.history) {
            window.history.pushState({}, '', `/room/${this.roomId}`);
          }

          const shareUrl = `${window.location.origin}/room/${this.roomId}`;

          resolve({
            roomId: this.roomId,
            shareUrl: shareUrl,
            peerId: id
          });
        });

        this.peer.on('connection', this.handlePeerConnection);
        this.peer.on('error', (err) => {
          this.handlePeerError(err);
          reject(err);
        });
        this.peer.on('disconnected', this.handlePeerDisconnected);

      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Join an existing room (become player)
   */
  async joinRoom(roomId) {
    // Check player credits (soft limit - warn but allow)
    const profile = this.getPlayerProfile();
    if (profile.credits.player < 1) {
      console.warn('⚠️  Low player credits! Consider adding more via credits.add');
    }

    this.roomId = roomId;
    this.isHost = false;

    // Spend player credit (soft - just tracking)
    this.spendCredit('player', 'Joined room: ' + roomId);

    return new Promise((resolve, reject) => {
      try {
        // Create peer with random ID
        this.peer = new Peer(undefined, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer.on('open', (id) => {
          this.playerId = id;
          this.handlePeerOpen(id);

          // Connect to host
          const hostPeerId = `vecterm-${roomId}-host`;
          this.hostConnection = this.peer.connect(hostPeerId, {
            reliable: true
          });

          this.hostConnection.on('open', () => {
            console.log('✓ Connected to host');

            // Send join request
            this.hostConnection.send({
              type: 'join',
              playerId: this.playerId,
              playerName: this.playerName
            });

            resolve({
              roomId: this.roomId,
              playerId: this.playerId
            });
          });

          this.hostConnection.on('data', (data) => {
            this.handleHostMessage(data);
          });

          this.hostConnection.on('error', (err) => {
            console.error('Host connection error:', err);
            reject(err);
          });

          this.hostConnection.on('close', () => {
            console.log('Host disconnected');
            this.emit('host_disconnected');
          });
        });

        this.peer.on('connection', this.handlePeerConnection);
        this.peer.on('error', (err) => {
          this.handlePeerError(err);
          reject(err);
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Handle peer open event
   */
  handlePeerOpen(id) {
    console.log('✓ Peer connection established:', id);
    this.emit('peer_ready', { peerId: id });
  }

  /**
   * Handle incoming peer connection (host only)
   */
  handlePeerConnection(conn) {
    console.log('📡 Incoming connection from:', conn.peer);

    conn.on('data', (data) => {
      if (data.type === 'join') {
        this.handlePlayerJoin(conn, data);
      } else {
        this.handlePlayerMessage(conn.peer, data);
      }
    });

    conn.on('close', () => {
      this.handlePlayerLeave(conn.peer);
    });

    conn.on('error', (err) => {
      console.error('Connection error from', conn.peer, err);
    });
  }

  /**
   * Handle player join request (host only)
   */
  handlePlayerJoin(conn, data) {
    if (!this.isHost) return;

    const playerId = data.playerId;
    const playerName = data.playerName;

    // Assign position
    const position = this.assignPlayerPosition();

    if (!position) {
      conn.send({
        type: 'error',
        message: 'Room is full (4/4 players)'
      });
      conn.close();
      return;
    }

    // Add player to lobby
    this.players.set(playerId, {
      name: playerName,
      connected: true,
      position: position,
      connection: conn,
      isHost: false
    });

    // Send welcome message
    conn.send({
      type: 'welcome',
      yourPosition: position,
      lobby: this.getLobbyState()
    });

    // Broadcast to all players
    this.broadcast({
      type: 'player_joined',
      playerId: playerId,
      playerName: playerName,
      position: position
    }, playerId); // Exclude the joining player

    console.log(`✓ ${playerName} joined as ${position}`);
    this.emit('player_joined', { playerId, playerName, position });

    // Update connection health tracking
    this.connectionHealth.set(playerId, {
      lastPing: Date.now(),
      latency: 0
    });
  }

  /**
   * Handle player message
   */
  handlePlayerMessage(playerId, data) {
    // Relay to other players if host
    if (this.isHost && data.relay) {
      this.broadcast(data, playerId);
    }

    // Trigger registered callbacks
    if (this.onMessageCallbacks.has(data.type)) {
      const callbacks = this.onMessageCallbacks.get(data.type);
      callbacks.forEach(cb => cb(data, playerId));
    }

    this.emit('message', { data, playerId });
  }

  /**
   * Handle host message (non-host only)
   */
  handleHostMessage(data) {
    switch (data.type) {
      case 'welcome':
        // Store own position
        this.myPosition = data.yourPosition;
        // Store lobby state
        this.updateLobbyFromHost(data.lobby);
        this.emit('joined', data);
        console.log(`✓ Joined as ${data.yourPosition}`);
        break;

      case 'player_joined':
        this.addPlayerFromHost(data);
        this.emit('player_joined', data);
        break;

      case 'player_left':
        this.removePlayerFromHost(data.playerId);
        this.emit('player_left', data);
        break;

      case 'game_start':
        this.emit('game_start', data);
        break;

      case 'error':
        console.error('Host error:', data.message);
        this.emit('error', data);
        break;

      default:
        // Trigger registered callbacks
        if (this.onMessageCallbacks.has(data.type)) {
          const callbacks = this.onMessageCallbacks.get(data.type);
          callbacks.forEach(cb => cb(data, 'host'));
        }
        this.emit('message', { data, from: 'host' });
    }
  }

  /**
   * Handle player leave
   */
  handlePlayerLeave(playerId) {
    if (!this.players.has(playerId)) return;

    const player = this.players.get(playerId);
    console.log(`Player left: ${player.name} (${player.position})`);

    this.players.delete(playerId);
    this.connectionHealth.delete(playerId);

    // Broadcast to remaining players
    this.broadcast({
      type: 'player_left',
      playerId: playerId,
      position: player.position
    });

    this.emit('player_left', { playerId, position: player.position });
  }

  /**
   * Handle peer error
   */
  handlePeerError(err) {
    console.error('Peer error:', err);
    this.emit('error', err);
  }

  /**
   * Handle peer disconnected
   */
  handlePeerDisconnected() {
    console.log('Peer disconnected');
    this.emit('disconnected');
  }

  /**
   * Leave current room
   */
  leaveRoom() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    if (this.hostConnection) {
      this.hostConnection.close();
      this.hostConnection = null;
    }

    this.players.clear();
    this.connectionHealth.clear();
    this.roomId = null;
    this.isHost = false;
    this.topology = null;

    this.emit('left_room');
  }

  /**
   * Start game (host only)
   */
  startGame(gameName = 'quadrapong') {
    if (!this.isHost) {
      console.error('Only host can start the game');
      return false;
    }

    if (this.players.size < 2) {
      console.error('Need at least 2 players to start');
      return false;
    }

    // Broadcast game start
    this.broadcast({
      type: 'game_start',
      game: gameName,
      lobby: this.getLobbyState()
    });

    this.emit('game_start', { game: gameName });
    return true;
  }

  /**
   * Broadcast message to all connected players
   */
  broadcast(message, excludePlayerId = null) {
    this.players.forEach((player, playerId) => {
      if (playerId === excludePlayerId) return;
      if (!player.connected || !player.connection) return;

      try {
        player.connection.send(message);
      } catch (err) {
        console.error(`Failed to send to ${playerId}:`, err);
      }
    });
  }

  /**
   * Send message to specific player
   */
  sendTo(playerId, message) {
    const player = this.players.get(playerId);
    if (!player || !player.connection) {
      console.warn(`Cannot send to ${playerId}: not connected`);
      return false;
    }

    try {
      player.connection.send(message);
      return true;
    } catch (err) {
      console.error(`Failed to send to ${playerId}:`, err);
      return false;
    }
  }

  /**
   * Send message to host (non-host only)
   */
  sendToHost(message) {
    if (this.isHost) {
      console.warn('Host cannot send to itself');
      return false;
    }

    if (!this.hostConnection) {
      console.warn('Not connected to host');
      return false;
    }

    try {
      this.hostConnection.send(message);
      return true;
    } catch (err) {
      console.error('Failed to send to host:', err);
      return false;
    }
  }

  /**
   * Assign player position based on join order
   */
  assignPlayerPosition() {
    const positions = ['player1', 'player2', 'player3', 'player4'];
    const taken = Array.from(this.players.values()).map(p => p.position);
    return positions.find(p => !taken.includes(p)) || null;
  }

  /**
   * Create topology definition for game
   */
  createTopology(gameName) {
    if (gameName === 'quadrapong') {
      return {
        name: 'square',
        maxPlayers: 4,
        neighborhoods: {
          player1: { left: 'player4', right: 'player2' },
          player2: { left: 'player1', right: 'player3' },
          player3: { left: 'player2', right: 'player4' },
          player4: { left: 'player3', right: 'player1' }
        }
      };
    }

    // Default linear topology
    return {
      name: 'line',
      maxPlayers: 4,
      neighborhoods: {
        player1: { left: null, right: 'player2' },
        player2: { left: 'player1', right: 'player3' },
        player3: { left: 'player2', right: 'player4' },
        player4: { left: 'player3', right: null }
      }
    };
  }

  /**
   * Get current lobby state
   */
  getLobbyState() {
    return {
      roomId: this.roomId,
      host: this.isHost ? this.playerId : Array.from(this.players.values()).find(p => p.isHost)?.connection?.peer,
      players: Array.from(this.players.entries()).map(([id, p]) => ({
        id,
        name: p.name,
        position: p.position,
        connected: p.connected,
        isHost: p.isHost || false
      })),
      topology: this.topology,
      maxPlayers: this.topology?.maxPlayers || 4,
      playerCount: this.players.size
    };
  }

  /**
   * Update lobby state from host (non-host only)
   */
  updateLobbyFromHost(lobbyState) {
    if (this.isHost) return;

    this.topology = lobbyState.topology;

    // Update players map
    this.players.clear();
    lobbyState.players.forEach(p => {
      this.players.set(p.id, {
        name: p.name,
        position: p.position,
        connected: p.connected,
        isHost: p.isHost,
        connection: null // Non-host doesn't have direct connections
      });
    });
  }

  /**
   * Add player from host update (non-host only)
   */
  addPlayerFromHost(playerData) {
    this.players.set(playerData.playerId, {
      name: playerData.playerName,
      position: playerData.position,
      connected: true,
      isHost: false,
      connection: null
    });
  }

  /**
   * Remove player from host update (non-host only)
   */
  removePlayerFromHost(playerId) {
    this.players.delete(playerId);
  }

  /**
   * Register message handler
   */
  on(messageType, callback) {
    if (!this.onMessageCallbacks.has(messageType)) {
      this.onMessageCallbacks.set(messageType, []);
    }
    this.onMessageCallbacks.get(messageType).push(callback);
  }

  /**
   * Unregister message handler
   */
  off(messageType, callback) {
    if (!this.onMessageCallbacks.has(messageType)) return;

    const callbacks = this.onMessageCallbacks.get(messageType);
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event (internal event system)
   */
  emit(event, data) {
    if (this.onMessageCallbacks.has(event)) {
      const callbacks = this.onMessageCallbacks.get(event);
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in ${event} callback:`, err);
        }
      });
    }
  }

  /**
   * Generate friendly room ID (like Zoom)
   */
  generateRoomId() {
    const adjectives = ['quick', 'brave', 'calm', 'warm', 'cool', 'swift', 'bold', 'wise'];
    const animals = ['tiger', 'eagle', 'wolf', 'bear', 'fox', 'hawk', 'lion', 'owl'];
    const num = Math.floor(Math.random() * 100);

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];

    return `${adj}-${animal}-${num}`;
  }

  /**
   * Get or create player ID
   */
  getOrCreatePlayerId() {
    const profile = this.getPlayerProfile();
    return profile.playerId;
  }

  /**
   * Get player profile from localStorage
   */
  getPlayerProfile() {
    const stored = localStorage.getItem('vectermPlayer');
    if (stored) {
      return JSON.parse(stored);
    }

    // Create new player profile
    const profile = {
      playerId: this.generateUUID(),
      playerName: `Guest_${Math.floor(Math.random() * 10000)}`,
      createdAt: Date.now(),
      credits: {
        dev: 2,
        player: 10
      },
      stats: {
        gamesPlayed: 0,
        gamesHosted: 0,
        totalScore: 0
      },
      transactions: []
    };

    localStorage.setItem('vectermPlayer', JSON.stringify(profile));
    return profile;
  }

  /**
   * Spend a credit (soft limit - just tracking)
   */
  spendCredit(type, reason = '') {
    const profile = this.getPlayerProfile();
    profile.credits[type]--;

    // Add transaction
    profile.transactions.push({
      type: 'spend',
      creditType: type,
      amount: -1,
      reason: reason,
      timestamp: Date.now(),
      balance: profile.credits[type]
    });

    localStorage.setItem('vectermPlayer', JSON.stringify(profile));

    console.log(`💰 Credit spent: ${type} (balance: ${profile.credits[type]})`);
  }

  /**
   * Add credits (for development/rewards)
   */
  addCredits(type, amount, reason = '') {
    const profile = this.getPlayerProfile();
    profile.credits[type] += amount;

    // Add transaction
    profile.transactions.push({
      type: 'earn',
      creditType: type,
      amount: amount,
      reason: reason,
      timestamp: Date.now(),
      balance: profile.credits[type]
    });

    localStorage.setItem('vectermPlayer', JSON.stringify(profile));

    console.log(`✓ Credits added: ${amount} ${type} (balance: ${profile.credits[type]})`);
  }

  /**
   * Generate UUID v4
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Get my position in topology
   */
  getMyPosition() {
    if (this.isHost) {
      const me = Array.from(this.players.values()).find(p => p.isHost);
      return me?.position || 'player1';
    }
    return this.myPosition || 'player1';
  }

  /**
   * Get player by position
   */
  getPlayerByPosition(position) {
    return Array.from(this.players.entries())
      .find(([id, p]) => p.position === position);
  }

  /**
   * Check if room is full
   */
  isFull() {
    const maxPlayers = this.topology?.maxPlayers || 4;
    return this.players.size >= maxPlayers;
  }

  /**
   * Check if can start game
   */
  canStartGame() {
    return this.isHost && this.players.size >= 2;
  }
}

// Create singleton instance
export const lobby = new LobbyManager();
