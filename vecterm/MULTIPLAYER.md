# Vecterm Multiplayer

Dead simple multiplayer lobby and relay system for Vecterm.

## Features

- **In-memory lobby system** - No database required
- **WebSocket real-time relay** - Fast, low-latency communication
- **Host-authoritative model** - Host controls game state
- **Player input relay** - Broadcast inputs to all players
- **Simple CLI interface** - Control everything from the terminal

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm start
```

The server will start on:
- HTTP: `http://localhost:2600`
- WebSocket: `ws://localhost:2601`

### 3. Open Multiple Clients

Open multiple browser windows to `http://localhost:2600`

### 4. Connect and Play

In each client's CLI, type:

```bash
# Client 1 (Host)
connect Player1
lobby_create "My Game" 4
mp_status

# Client 2
connect Player2
lobby_list
lobby_join <lobbyId>

# Client 1 (Host starts game)
game_start
```

## CLI Commands

### Connection

- `connect <name>` - Connect to multiplayer server
- `disconnect` - Disconnect from server
- `mp_status` - Show connection and lobby status

### Lobby Management

- `lobby_create <name> <maxPlayers>` - Create a new lobby
  - Example: `lobby_create "Epic Battle" 4`
- `lobby_list` - List all available lobbies
- `lobby_join <lobbyId>` - Join an existing lobby
- `lobby_leave` - Leave current lobby

### Game Control

- `game_start` - Start game (host only)

## Architecture

### Server Components

**`server.js`** - Main server file
- HTTP server for static files (port 2600)
- WebSocket server for multiplayer (port 2601)
- In-memory lobby management
- Player relay and broadcast

**Data Structures:**
- `Lobby` - Manages players, state, and game instance
- `Player` - Tracks connection, name, and lobby membership
- `clients` Map - WebSocket → Player
- `lobbies` Map - LobbyId → Lobby

### Client Components

**`network.js`** - Network client
- WebSocket connection management
- Event-driven message handling
- Automatic reconnection
- Ping/pong keepalive

**`multiplayer.js`** - Integration layer
- Redux state integration
- CLI command handlers
- Event logging

**`core/reducers.js`** - State management
- Network state in Redux store
- Lobby and player tracking
- Game synchronization

### Message Protocol

All messages use JSON format:

```javascript
{
  type: 'message_type',
  payload: { /* message data */ }
}
```

**Client → Server:**
- `join` - Initial connection
- `create_lobby` - Create lobby
- `join_lobby` - Join lobby
- `leave_lobby` - Leave lobby
- `list_lobbies` - Request lobby list
- `start_game` - Start game (host)
- `game_state` - Game state update
- `player_input` - Player input
- `ping` - Keepalive

**Server → Client:**
- `joined` - Connection confirmed
- `lobby_created` - Lobby created
- `lobby_joined` - Joined lobby
- `lobby_left` - Left lobby
- `lobby_list` - Lobby list
- `player_joined` - Player joined
- `player_left` - Player left
- `player_disconnected` - Player disconnected
- `game_started` - Game started
- `game_state` - Game state update
- `player_input` - Remote player input
- `pong` - Keepalive response
- `error` - Error message

## Network Model

### Host-Authoritative

The lobby **host** is authoritative for game state:

1. Host updates local game state
2. Host sends `game_state` to server
3. Server relays to all other players
4. Clients update their local state

### Input Relay

Player inputs are **relayed** to all players:

1. Player sends `player_input` to server
2. Server broadcasts to all players (except sender)
3. Each client processes the input

This allows for both:
- **Client-side prediction** (local player)
- **Remote player updates** (from network)

## State Synchronization

The Redux store tracks network state:

```javascript
state.network = {
  connected: false,
  playerId: null,
  playerName: null,
  currentLobby: null,
  lobbies: [],
  players: {}
}
```

Network actions update this state:
- `NETWORK_CONNECTED`
- `NETWORK_DISCONNECTED`
- `NETWORK_LOBBY_CREATED`
- `NETWORK_LOBBY_JOINED`
- `NETWORK_LOBBY_LEFT`
- `NETWORK_LOBBY_LIST`
- `NETWORK_PLAYER_JOINED`
- `NETWORK_PLAYER_LEFT`
- `NETWORK_PLAYER_DISCONNECTED`
- `NETWORK_GAME_STARTED`
- `NETWORK_PLAYER_INPUT`

## Game Integration

To integrate multiplayer into a game:

1. **Send local state** (host only):
   ```javascript
   network.sendGameState({
     entities: state.entities,
     transforms: state.transforms
   });
   ```

2. **Send player input** (all players):
   ```javascript
   network.sendPlayerInput({
     keys: { w: true, a: false, s: false, d: true },
     mouse: { x: 100, y: 200 }
   });
   ```

3. **Handle remote updates** (clients):
   ```javascript
   network.on('game_state', (data) => {
     // Update local state from host
     updateEntities(data.state.entities);
   });

   network.on('player_input', (data) => {
     // Process remote player input
     handleRemoteInput(data.playerId, data.input);
   });
   ```

## Environment Variables

You can customize ports via environment variables:

```bash
PORT=3000 WS_PORT=3001 npm start
```

## Limitations

This is a **dead simple** implementation:

- **No authentication** - Trust all clients
- **No encryption** - Use TLS in production
- **No rate limiting** - Vulnerable to abuse
- **No persistence** - Lobbies lost on restart
- **No matchmaking** - Manual lobby joining
- **No spectators** - Players only
- **No chat** - Add via custom messages
- **No reconnection handling** - Players lose state

## Production Considerations

For production use, add:

1. **TLS/WSS** - Encrypt WebSocket traffic
2. **Authentication** - JWT or session tokens
3. **Rate limiting** - Prevent spam/DoS
4. **Persistence** - Database for lobbies/players
5. **Load balancing** - Multiple server instances
6. **Monitoring** - Health checks and metrics
7. **Error recovery** - Graceful disconnection handling
8. **Anti-cheat** - Server-side validation

## Files

- `server.js` - Multiplayer server
- `network.js` - Client network layer
- `multiplayer.js` - Redux integration
- `core/reducers.js` - Network state reducers
- `cli/command-processor.js` - CLI commands
- `package.json` - Dependencies

## License

MIT
