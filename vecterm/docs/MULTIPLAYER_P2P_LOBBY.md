# Vecterm Multiplayer P2P Lobby System
## Super Simple In-Browser Multiplayer for Quadrapong + Tines

### Overview
Zero-infrastructure peer-to-peer multiplayer using WebRTC + simple signaling.
Each new player gets **2 dev credits** and **10 player credits**.

---

## Architecture

### 1. Player Identity & Credits

```javascript
// Stored in localStorage
{
  playerId: 'uuid-v4-random',
  playerName: 'Guest_1234',
  createdAt: 1699999999,
  credits: {
    dev: 2,      // For creating/hosting games
    player: 10   // For joining games
  },
  stats: {
    gamesPlayed: 0,
    gamesHosted: 0,
    totalScore: 0
  }
}
```

**Credit System:**
- **Dev Credits**: Used to host a game (costs 1 per game hosted)
- **Player Credits**: Used to join a game (costs 1 per game joined)
- New players auto-created on first visit with default credits
- Credits are LOCAL ONLY (no server tracking for MVP)
- Future: Earn credits by playing, winning, or watching ads

---

### 2. Lobby Flow (URL-Based Rooms)

```
┌─────────────────────────────────────────────────────┐
│  https://vecterm.app/                               │
│  Default landing page - no game                     │
└─────────────────────────────────────────────────────┘
                       │
                       ├── Click "Create Game" (costs 1 dev credit)
                       │   ↓
                       │   Generate room URL: /room/abc123
                       │   Become host (Player 1)
                       │   Share URL with friends
                       │
                       ├── Visit /room/abc123 (costs 1 player credit)
                       │   ↓
                       │   Join as Player 2, 3, or 4
                       │   Connect via WebRTC
                       │
                       └── View lobby list
                           ↓
                           Browse public rooms
                           Click to join
```

**URL Patterns:**
- `/` - Home page, lobby browser
- `/room/:roomId` - Join specific room
- `/room/:roomId/create` - Create new room with custom ID

---

### 3. Peer-to-Peer Architecture (WebRTC)

**Option A: PeerJS (Simplest)**
```javascript
// No server needed! PeerJS provides free signaling
import Peer from 'peerjs';

const peer = new Peer('vecterm-' + roomId, {
  host: 'peerjs-server.herokuapp.com', // Free PeerJS cloud
  port: 443,
  secure: true
});

// Host creates room
const host = new Peer('vecterm-room-abc123-host');
host.on('connection', (conn) => {
  console.log('Player joined:', conn.peer);
  conn.on('data', handlePlayerData);
});

// Players join room
const player = new Peer();
const conn = player.connect('vecterm-room-abc123-host');
conn.on('data', handleGameState);
```

**Option B: Firebase Realtime DB (Better for signaling)**
```javascript
// Firebase provides free tier (50GB/month)
// Use Firebase ONLY for signaling, NOT game state
// After WebRTC connection established, go fully P2P

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';

// Signaling channel
const db = getDatabase();
const roomRef = ref(db, `rooms/${roomId}`);

// Host posts offer
set(ref(db, `rooms/${roomId}/host/offer`), rtcOffer);

// Players post answers
set(ref(db, `rooms/${roomId}/players/${playerId}/answer`), rtcAnswer);
```

**Recommendation: Use PeerJS for MVP** (zero config, works immediately)

---

### 4. Lobby State Management

```javascript
// core/lobby-manager.js

class LobbyManager {
  constructor() {
    this.roomId = null;
    this.isHost = false;
    this.playerId = this.getOrCreatePlayerId();
    this.players = new Map(); // playerId -> { name, connected, position }
    this.topology = null;
    this.peer = null;
    this.connections = new Map(); // playerId -> PeerJS connection
  }

  // Create new room
  async createRoom(gameName = 'quadrapong') {
    // Check dev credits
    const profile = this.getPlayerProfile();
    if (profile.credits.dev < 1) {
      throw new Error('Not enough dev credits to host a game');
    }

    // Generate room ID
    this.roomId = this.generateRoomId(); // e.g., "warm-tiger-42"
    this.isHost = true;

    // Deduct dev credit
    this.spendCredit('dev');

    // Initialize PeerJS as host
    this.peer = new Peer(`vecterm-${this.roomId}-host`);

    // Listen for players joining
    this.peer.on('connection', (conn) => {
      this.handlePlayerJoin(conn);
    });

    // Define playfield topology
    this.topology = this.createTopology(gameName);

    // Update URL
    window.history.pushState({}, '', `/room/${this.roomId}`);

    return {
      roomId: this.roomId,
      shareUrl: `${window.location.origin}/room/${this.roomId}`
    };
  }

  // Join existing room
  async joinRoom(roomId) {
    // Check player credits
    const profile = this.getPlayerProfile();
    if (profile.credits.player < 1) {
      throw new Error('Not enough player credits to join a game');
    }

    this.roomId = roomId;
    this.isHost = false;

    // Deduct player credit
    this.spendCredit('player');

    // Connect to host via PeerJS
    this.peer = new Peer();
    const hostConn = this.peer.connect(`vecterm-${roomId}-host`);

    return new Promise((resolve, reject) => {
      hostConn.on('open', () => {
        // Send join request
        hostConn.send({
          type: 'join',
          playerId: this.playerId,
          playerName: this.getPlayerProfile().playerName
        });
        resolve();
      });

      hostConn.on('data', (data) => {
        this.handleHostMessage(data);
      });

      hostConn.on('error', reject);
    });
  }

  // Generate friendly room ID (like Zoom)
  generateRoomId() {
    const adjectives = ['quick', 'brave', 'calm', 'warm'];
    const animals = ['tiger', 'eagle', 'wolf', 'bear'];
    const num = Math.floor(Math.random() * 100);

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];

    return `${adj}-${animal}-${num}`;
  }

  // Create playfield topology
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
  }

  // Assign player position based on join order
  assignPlayerPosition() {
    const positions = ['player1', 'player2', 'player3', 'player4'];
    const taken = Array.from(this.players.values()).map(p => p.position);
    return positions.find(p => !taken.includes(p));
  }

  // Handle player joining (host only)
  handlePlayerJoin(conn) {
    const playerId = null; // Will be sent in join message

    conn.on('data', (data) => {
      if (data.type === 'join') {
        // Assign position
        const position = this.assignPlayerPosition();

        if (!position) {
          conn.send({ type: 'error', message: 'Room is full' });
          conn.close();
          return;
        }

        // Add player
        this.players.set(data.playerId, {
          name: data.playerName,
          connected: true,
          position: position,
          connection: conn
        });

        // Send welcome + current lobby state
        conn.send({
          type: 'welcome',
          yourPosition: position,
          lobby: this.getLobbyState()
        });

        // Broadcast to all players
        this.broadcast({
          type: 'player_joined',
          playerId: data.playerId,
          playerName: data.playerName,
          position: position
        });

        console.log(`${data.playerName} joined as ${position}`);
      }
    });

    conn.on('close', () => {
      // Handle disconnect
      const player = Array.from(this.players.entries())
        .find(([id, p]) => p.connection === conn);

      if (player) {
        const [playerId, playerData] = player;
        this.players.delete(playerId);
        this.broadcast({
          type: 'player_left',
          playerId: playerId,
          position: playerData.position
        });
      }
    });
  }

  // Broadcast message to all connected players (host only)
  broadcast(message) {
    this.players.forEach((player) => {
      if (player.connected && player.connection) {
        player.connection.send(message);
      }
    });
  }

  // Get current lobby state
  getLobbyState() {
    return {
      roomId: this.roomId,
      host: this.isHost ? this.playerId : null,
      players: Array.from(this.players.entries()).map(([id, p]) => ({
        id,
        name: p.name,
        position: p.position,
        connected: p.connected
      })),
      topology: this.topology,
      maxPlayers: this.topology?.maxPlayers || 4
    };
  }

  // Player profile management
  getPlayerProfile() {
    const stored = localStorage.getItem('vectermPlayer');
    if (stored) {
      return JSON.parse(stored);
    }

    // Create new player
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
      }
    };

    localStorage.setItem('vectermPlayer', JSON.stringify(profile));
    return profile;
  }

  // Spend a credit
  spendCredit(type) {
    const profile = this.getPlayerProfile();
    profile.credits[type]--;
    localStorage.setItem('vectermPlayer', JSON.stringify(profile));
  }

  // Generate UUID
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  getOrCreatePlayerId() {
    const profile = this.getPlayerProfile();
    return profile.playerId;
  }
}

export const lobby = new LobbyManager();
```

---

### 5. Address Resolution with Lobby

```javascript
// core/address-resolver.js

class AddressResolver {
  constructor(lobbyManager) {
    this.lobby = lobbyManager;
  }

  // Get my position in topology
  getMyPosition() {
    const lobbyState = this.lobby.getLobbyState();
    const me = lobbyState.players.find(p => p.id === this.lobby.playerId);
    return me?.position || 'player1'; // Default to player1 for solo dev
  }

  // Resolve scoped address
  resolve(address, scope = 'me') {
    // Parse address: /tines/osc1/freq
    const parts = address.split('/').filter(Boolean);
    const [module, instance, param] = parts;

    const topology = this.lobby.topology;
    const myPosition = this.getMyPosition();

    let targetPosition;

    switch (scope) {
      case 'me':
        targetPosition = myPosition;
        break;

      case 'left':
        targetPosition = topology.neighborhoods[myPosition]?.left || myPosition;
        break;

      case 'right':
        targetPosition = topology.neighborhoods[myPosition]?.right || myPosition;
        break;

      case 'all':
        // Return array of all positions
        return Object.keys(topology.neighborhoods).map(pos =>
          `/${pos}/${module}/${instance}/${param}`
        );

      default:
        // Assume scope is explicit player position (player1, player2, etc.)
        targetPosition = scope;
    }

    return `/${targetPosition}/${module}/${instance}/${param}`;
  }
}
```

---

### 6. Developer Experience

#### Single Developer (No Lobby)

```javascript
// Just load page normally
// No room URL, no lobby
// Everything defaults to local player

vecterm> tines.osc1.freq 440
// Resolves to: /player1/tines/osc1/freq
// Plays locally, no network traffic

vecterm> @left tines.osc1.freq 330
// No lobby, so @left === @me
// Plays locally
```

#### Multiplayer Developer (With Lobby)

**Step 1: Create Room**
```javascript
vecterm> lobby.create
✓ Room created: warm-tiger-42
  Share URL: https://vecterm.app/room/warm-tiger-42
  Dev credits remaining: 1
  Waiting for players (1/4)...
```

**Step 2: Players Join**
```
Player 2 opens: https://vecterm.app/room/warm-tiger-42
✓ Joined as Player 2
  Player credits remaining: 9

Player 3 joins...
Player 4 joins...
```

**Step 3: Host Starts Game**
```javascript
vecterm> lobby.start quadrapong
✓ Game started
  Players: 4/4 connected
  Topology: Square

// Now each player can control neighbors
vecterm> @left tines.osc1.freq 330
// Sends OSC command to left neighbor over WebRTC
```

**Step 4: Play!**
```javascript
// Player 1's MIDI controller
CC7 → @me tines.osc1.volume      // Control own Tines
CC8 → @left tines.osc1.freq      // Control left neighbor (Player 4)
CC9 → @right tines.osc2.detune   // Control right neighbor (Player 2)

// Paddle hit triggers sound on neighbor
onPaddleHit(() => {
  Vecterm.bus.send('@left/tines/osc1/freq', randomFreq());
  Vecterm.bus.send('@left/tines/osc1/trigger', 1);
});
```

---

### 7. UI Integration

Update existing multiplayer section in `index.html`:

```html
<!-- Multiplayer -->
<div class="subsection">
  <h4 class="subsection-title">Multiplayer ▼</h4>
  <div class="subsection-content" id="subsection-multiplayer">

    <!-- Player Profile -->
    <div class="info-group">
      <span class="info-label">Player ID:</span>
      <span class="info-value mono" id="player-id">Guest_1234</span>
    </div>

    <!-- Credits -->
    <div class="info-group">
      <span class="info-label">Dev Credits:</span>
      <span class="info-value" id="dev-credits">2</span>
      <span class="info-label" style="margin-left: 12px;">Player Credits:</span>
      <span class="info-value" id="player-credits">10</span>
    </div>

    <!-- Room Status -->
    <div class="info-group">
      <span class="info-label">Room:</span>
      <span class="info-value" id="room-id">None</span>
    </div>

    <div class="info-group">
      <span class="info-label">Players:</span>
      <span class="info-value" id="player-count">0/4</span>
    </div>

    <!-- Player List -->
    <div id="player-list" class="player-list hidden">
      <div class="player-slot" data-position="player1">
        <span class="slot-badge">P1</span>
        <span class="slot-name">Empty</span>
      </div>
      <div class="player-slot" data-position="player2">
        <span class="slot-badge">P2</span>
        <span class="slot-name">Empty</span>
      </div>
      <div class="player-slot" data-position="player3">
        <span class="slot-badge">P3</span>
        <span class="slot-name">Empty</span>
      </div>
      <div class="player-slot" data-position="player4">
        <span class="slot-badge">P4</span>
        <span class="slot-name">Empty</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="control-group">
      <button id="create-room" class="config-btn">
        Create Room (1 dev credit)
      </button>
      <button id="browse-rooms" class="config-btn">
        Browse Public Rooms
      </button>
    </div>

    <!-- Share URL (only shown when room created) -->
    <div id="share-room" class="hidden">
      <div class="info-group">
        <span class="info-label">Share URL:</span>
        <input type="text" id="room-url" readonly
               style="width: 100%; font-family: monospace; font-size: 10px;">
      </div>
      <button id="copy-room-url" class="config-btn">Copy Link</button>
      <button id="start-game" class="config-btn" disabled>
        Start Game (need 2+ players)
      </button>
    </div>

  </div>
</div>
```

---

### 8. CLI Commands

```javascript
// cli/multiplayer-commands.js

export const multiplayerCommands = {
  // Show player profile
  'player.profile': () => {
    const profile = lobby.getPlayerProfile();
    cliLog(`Player: ${profile.playerName} (${profile.playerId})`, 'info');
    cliLog(`Dev Credits: ${profile.credits.dev} | Player Credits: ${profile.credits.player}`, 'info');
    cliLog(`Games Played: ${profile.stats.gamesPlayed} | Hosted: ${profile.stats.gamesHosted}`, 'info');
  },

  // Create room
  'lobby.create': async (args) => {
    try {
      const { roomId, shareUrl } = await lobby.createRoom();
      cliLog(`✓ Room created: ${roomId}`, 'success');
      cliLog(`  Share: ${shareUrl}`, 'info');
      cliLog(`  Waiting for players...`, 'info');
    } catch (err) {
      cliLog(`Error: ${err.message}`, 'error');
    }
  },

  // Join room (via URL or room ID)
  'lobby.join': async (args) => {
    const roomId = args[0];
    if (!roomId) {
      cliLog('Usage: lobby.join <roomId>', 'error');
      return;
    }

    try {
      await lobby.joinRoom(roomId);
      cliLog(`✓ Joined room: ${roomId}`, 'success');
    } catch (err) {
      cliLog(`Error: ${err.message}`, 'error');
    }
  },

  // Show lobby status
  'lobby.status': () => {
    const state = lobby.getLobbyState();

    if (!state.roomId) {
      cliLog('Not in a lobby', 'info');
      cliLog('Use "lobby.create" to host or "lobby.join <roomId>" to join', 'info');
      return;
    }

    cliLog(`Room: ${state.roomId}`, 'info');
    cliLog(`Players (${state.players.length}/${state.maxPlayers}):`, 'info');
    state.players.forEach(p => {
      const badge = p.id === lobby.playerId ? '[YOU]' : '';
      cliLog(`  ${p.position}: ${p.name} ${badge}`, 'info');
    });
  },

  // Start game (host only)
  'lobby.start': (args) => {
    const gameName = args[0] || 'quadrapong';

    if (!lobby.isHost) {
      cliLog('Only the host can start the game', 'error');
      return;
    }

    const state = lobby.getLobbyState();
    if (state.players.length < 2) {
      cliLog('Need at least 2 players to start', 'error');
      return;
    }

    // Broadcast game start
    lobby.broadcast({
      type: 'game_start',
      game: gameName
    });

    cliLog(`✓ Game started: ${gameName}`, 'success');

    // Actually start the game
    Vecterm.game.load(gameName);
  }
};
```

---

### 9. Topology-Aware Sound Control

```javascript
// modules/tines/tines-multiplayer.js

class TinesMultiplayer {
  constructor(lobby, addressResolver) {
    this.lobby = lobby;
    this.resolver = addressResolver;
    this.oscSenders = new Map(); // position -> Tines instance
  }

  // Initialize Tines instances for all players
  initializeForTopology() {
    const topology = this.lobby.topology;

    Object.keys(topology.neighborhoods).forEach(position => {
      // Create Tines instance for this position
      const tines = new TinesEngine();
      tines.initialize();
      this.oscSenders.set(position, tines);
    });
  }

  // Send OSC command with scope resolution
  send(address, value, scope = 'me') {
    const resolved = this.resolver.resolve(address, scope);

    // Parse resolved address
    const match = resolved.match(/\/(player\d+)\/(\w+)\/(\w+)\/(\w+)/);
    if (!match) return;

    const [_, position, module, instance, param] = match;

    // Get Tines instance for this position
    const tines = this.oscSenders.get(position);
    if (!tines) return;

    // Apply parameter
    if (instance === 'osc1' || instance === 'osc2') {
      const osc = tines.oscillators[instance === 'osc1' ? 0 : 1];

      switch (param) {
        case 'freq':
          osc.frequency.value = value;
          break;
        case 'volume':
          osc.gain.value = value;
          break;
        case 'detune':
          osc.detune.value = value;
          break;
        case 'trigger':
          osc.trigger();
          break;
      }
    }

    // If not local, send over network
    if (position !== this.resolver.getMyPosition()) {
      this.sendOverNetwork(position, address, value);
    }
  }

  // Send command to remote player via WebRTC
  sendOverNetwork(targetPosition, address, value) {
    const state = this.lobby.getLobbyState();
    const targetPlayer = state.players.find(p => p.position === targetPosition);

    if (!targetPlayer) return;

    // Get connection to target player
    const conn = this.lobby.connections.get(targetPlayer.id);
    if (!conn) return;

    // Send OSC command
    conn.send({
      type: 'osc',
      address: address,
      value: value
    });
  }
}
```

---

### 10. Implementation Checklist

- [ ] Install PeerJS dependency
- [ ] Create `core/lobby-manager.js`
- [ ] Create `core/address-resolver.js`
- [ ] Update `multiplayer.js` to support P2P mode
- [ ] Add lobby UI to left sidebar (already exists!)
- [ ] Add CLI commands for lobby
- [ ] Integrate Tines with address resolver
- [ ] Add credit system to localStorage
- [ ] URL routing for `/room/:id`
- [ ] Handle player join/leave events
- [ ] Test 2-player game
- [ ] Test 4-player game
- [ ] Add public lobby browser

---

### 11. Zero-to-Playing in 30 Seconds

**Developer 1:**
```
1. Visit https://vecterm.app
2. Click "Create Room" → warm-tiger-42
3. Copy share link
4. Paste to friends
5. Wait for 3 friends to join
6. Click "Start Game"
7. Play quadrapong with Tines sound!
```

**Developer 2, 3, 4:**
```
1. Click shared link: https://vecterm.app/room/warm-tiger-42
2. Instantly join as Player 2, 3, or 4
3. Game starts
4. Play!
```

**Zero server setup. Zero configuration. Just works.**

---

## Summary

**Yes, Player1/Player2 assumes a lobby system** - the lobby:
1. **Assigns player positions** (player1, player2, etc.)
2. **Defines topology** (who is left/right neighbor)
3. **Establishes P2P connections** (WebRTC)
4. **Tracks player state** (connected, name, etc.)

**Simple lobby = Simple multiplayer:**
- URL-based rooms (no account needed)
- Credit system for fairness
- P2P = no server infrastructure
- Works in any modern browser
- Topology-aware addressing "just works"

**Next Steps:**
1. Add PeerJS to package.json
2. Implement lobby-manager.js
3. Wire up UI buttons
4. Test with 2 browsers locally
5. Deploy and play with friends!
