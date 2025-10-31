/**
 * Vecterm Network Client
 * WebSocket client for multiplayer lobby and relay
 */

export class NetworkClient {
  constructor(wsUrl = 'ws://localhost:2601') {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.playerId = null;
    this.playerName = null;
    this.connected = false;
    this.handlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.pingInterval = null;
  }

  // Connect to server
  connect(playerName = 'Player') {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log('Connected to multiplayer server');
          this.connected = true;
          this.reconnectAttempts = 0;

          // Send join message
          this.send('join', { name: playerName });

          // Start ping interval
          this.startPingInterval();

          // Wait for joined confirmation
          const handler = (data) => {
            if (data.type === 'joined') {
              this.playerId = data.payload.playerId;
              this.playerName = data.payload.name;
              this.off('message', handler);
              resolve({ playerId: this.playerId, name: this.playerName });
            }
          };
          this.on('message', handler);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (err) {
            console.error('Error parsing message:', err);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('Disconnected from multiplayer server');
          this.connected = false;
          this.stopPingInterval();
          this.emit('disconnected');
          this.attemptReconnect();
        };

      } catch (err) {
        reject(err);
      }
    });
  }

  // Disconnect from server
  disconnect() {
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.playerId = null;
    this.playerName = null;
  }

  // Attempt reconnect
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => {
      if (this.playerName) {
        this.connect(this.playerName).catch(err => {
          console.error('Reconnect failed:', err);
        });
      }
    }, delay);
  }

  // Send message to server
  send(type, payload = {}) {
    if (!this.connected || !this.ws) {
      console.warn('Cannot send message: not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify({ type, payload }));
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      return false;
    }
  }

  // Handle incoming message
  handleMessage(data) {
    const { type, payload } = data;

    // Emit specific event
    this.emit(type, payload);

    // Emit generic message event
    this.emit('message', data);
  }

  // Event emitter
  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(handler);
  }

  off(event, handler) {
    if (!this.handlers.has(event)) return;
    const handlers = this.handlers.get(event);
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.handlers.has(event)) return;
    this.handlers.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (err) {
        console.error(`Error in ${event} handler:`, err);
      }
    });
  }

  // Ping interval
  startPingInterval() {
    this.pingInterval = setInterval(() => {
      this.send('ping');
    }, 30000); // 30 seconds
  }

  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Lobby methods
  createLobby(name, maxPlayers = 4) {
    return this.send('create_lobby', { name, maxPlayers });
  }

  joinLobby(lobbyId) {
    return this.send('join_lobby', { lobbyId });
  }

  leaveLobby() {
    return this.send('leave_lobby');
  }

  listLobbies() {
    return this.send('list_lobbies');
  }

  startGame() {
    return this.send('start_game');
  }

  sendGameState(state) {
    return this.send('game_state', state);
  }

  sendPlayerInput(input) {
    return this.send('player_input', input);
  }
}

// Create singleton instance
export const network = new NetworkClient();

// Redux middleware for networking
export function createNetworkMiddleware(networkClient) {
  return store => next => action => {
    const result = next(action);

    // Relay certain actions to network
    if (networkClient.connected) {
      switch (action.type) {
        case 'UPDATE_ENTITY':
        case 'UPDATE_TRANSFORM':
        case 'SET_CAMERA_POSITION':
          // Send game state updates (throttled)
          if (!networkClient._throttleTimer) {
            const state = store.getState();
            networkClient.sendGameState({
              entities: state.entities,
              transforms: state.transforms,
              camera: state.camera
            });

            networkClient._throttleTimer = setTimeout(() => {
              networkClient._throttleTimer = null;
            }, 50); // 20 updates/sec max
          }
          break;

        case 'GAMEPAD_STATE':
          // Send player input
          networkClient.sendPlayerInput(action.payload);
          break;
      }
    }

    return result;
  };
}

// Handle incoming network events and dispatch to Redux
export function setupNetworkHandlers(networkClient, store) {
  // Lobby events
  networkClient.on('lobby_created', (lobby) => {
    store.dispatch({ type: 'NETWORK_LOBBY_CREATED', payload: lobby });
  });

  networkClient.on('lobby_joined', (lobby) => {
    store.dispatch({ type: 'NETWORK_LOBBY_JOINED', payload: lobby });
  });

  networkClient.on('lobby_left', () => {
    store.dispatch({ type: 'NETWORK_LOBBY_LEFT' });
  });

  networkClient.on('lobby_list', (lobbies) => {
    store.dispatch({ type: 'NETWORK_LOBBY_LIST', payload: lobbies });
  });

  networkClient.on('player_joined', (data) => {
    store.dispatch({ type: 'NETWORK_PLAYER_JOINED', payload: data });
  });

  networkClient.on('player_left', (data) => {
    store.dispatch({ type: 'NETWORK_PLAYER_LEFT', payload: data });
  });

  networkClient.on('player_disconnected', (data) => {
    store.dispatch({ type: 'NETWORK_PLAYER_DISCONNECTED', payload: data });
  });

  // Game events
  networkClient.on('game_started', (data) => {
    store.dispatch({ type: 'NETWORK_GAME_STARTED', payload: data });
  });

  networkClient.on('game_state', (data) => {
    // Update local state from remote (for non-host clients)
    if (data.playerId !== networkClient.playerId) {
      const { state } = data;
      if (state.entities) {
        Object.entries(state.entities).forEach(([id, entity]) => {
          store.dispatch({ type: 'UPDATE_ENTITY', payload: { id, ...entity } });
        });
      }
      if (state.transforms) {
        Object.entries(state.transforms).forEach(([id, transform]) => {
          store.dispatch({ type: 'UPDATE_TRANSFORM', payload: { id, ...transform } });
        });
      }
    }
  });

  networkClient.on('player_input', (data) => {
    // Handle remote player input
    store.dispatch({
      type: 'NETWORK_PLAYER_INPUT',
      payload: {
        playerId: data.playerId,
        input: data.input
      }
    });
  });

  // Connection events
  networkClient.on('disconnected', () => {
    store.dispatch({ type: 'NETWORK_DISCONNECTED' });
  });

  networkClient.on('error', (error) => {
    store.dispatch({ type: 'NETWORK_ERROR', payload: error });
    console.error('Network error:', error);
  });
}
