#!/usr/bin/env node
/**
 * Vecterm Multiplayer Server
 * Simple in-memory lobby and relay server using WebSockets
 */

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 2600;
const WS_PORT = process.env.WS_PORT || 2601;

// In-memory state
const lobbies = new Map(); // lobbyId -> Lobby
const clients = new Map(); // ws -> Client

class Lobby {
  constructor(id, name, maxPlayers = 4) {
    this.id = id;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.players = new Map(); // playerId -> Player
    this.host = null;
    this.state = 'waiting'; // waiting, playing, finished
    this.gameState = null;
    this.createdAt = Date.now();
  }

  addPlayer(player) {
    if (this.players.size >= this.maxPlayers) {
      return false;
    }
    this.players.set(player.id, player);
    if (!this.host) {
      this.host = player.id;
    }
    return true;
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    if (this.host === playerId && this.players.size > 0) {
      this.host = this.players.keys().next().value;
    }
  }

  broadcast(message, exclude = null) {
    this.players.forEach(player => {
      if (player.ws && player.ws !== exclude && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(message));
      }
    });
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      maxPlayers: this.maxPlayers,
      playerCount: this.players.size,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.id === this.host
      })),
      host: this.host,
      state: this.state
    };
  }
}

class Player {
  constructor(id, name, ws) {
    this.id = id;
    this.name = name;
    this.ws = ws;
    this.lobbyId = null;
    this.lastPing = Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      lobbyId: this.lobbyId
    };
  }
}

// Generate unique ID
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message);
    } catch (err) {
      console.error('Error handling message:', err);
      ws.send(JSON.stringify({ type: 'error', error: err.message }));
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      handleDisconnect(client);
      clients.delete(ws);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

function handleMessage(ws, message) {
  const { type, payload } = message;
  const client = clients.get(ws);

  switch (type) {
    case 'join':
      handleJoin(ws, payload);
      break;

    case 'create_lobby':
      handleCreateLobby(ws, payload);
      break;

    case 'join_lobby':
      handleJoinLobby(ws, payload);
      break;

    case 'leave_lobby':
      handleLeaveLobby(ws);
      break;

    case 'list_lobbies':
      handleListLobbies(ws);
      break;

    case 'start_game':
      handleStartGame(ws);
      break;

    case 'game_state':
      handleGameState(ws, payload);
      break;

    case 'player_input':
      handlePlayerInput(ws, payload);
      break;

    case 'ping':
      if (client) {
        client.lastPing = Date.now();
        ws.send(JSON.stringify({ type: 'pong' }));
      }
      break;

    default:
      console.warn('Unknown message type:', type);
  }
}

function handleJoin(ws, payload) {
  const { name } = payload;
  const playerId = generateId();
  const player = new Player(playerId, name || `Player${playerId}`, ws);
  clients.set(ws, player);

  ws.send(JSON.stringify({
    type: 'joined',
    payload: {
      playerId: player.id,
      name: player.name
    }
  }));

  console.log(`Player ${player.name} (${player.id}) joined`);
}

function handleCreateLobby(ws, payload) {
  const client = clients.get(ws);
  if (!client) {
    ws.send(JSON.stringify({ type: 'error', error: 'Not authenticated' }));
    return;
  }

  const { name, maxPlayers } = payload;
  const lobbyId = generateId();
  const lobby = new Lobby(lobbyId, name || `Lobby ${lobbyId}`, maxPlayers || 4);

  lobbies.set(lobbyId, lobby);
  lobby.addPlayer(client);
  client.lobbyId = lobbyId;

  ws.send(JSON.stringify({
    type: 'lobby_created',
    payload: lobby.toJSON()
  }));

  broadcastLobbyList();
  console.log(`Lobby ${lobby.name} (${lobbyId}) created by ${client.name}`);
}

function handleJoinLobby(ws, payload) {
  const client = clients.get(ws);
  if (!client) {
    ws.send(JSON.stringify({ type: 'error', error: 'Not authenticated' }));
    return;
  }

  const { lobbyId } = payload;
  const lobby = lobbies.get(lobbyId);

  if (!lobby) {
    ws.send(JSON.stringify({ type: 'error', error: 'Lobby not found' }));
    return;
  }

  if (!lobby.addPlayer(client)) {
    ws.send(JSON.stringify({ type: 'error', error: 'Lobby is full' }));
    return;
  }

  client.lobbyId = lobbyId;

  ws.send(JSON.stringify({
    type: 'lobby_joined',
    payload: lobby.toJSON()
  }));

  lobby.broadcast({
    type: 'player_joined',
    payload: {
      player: client.toJSON(),
      lobby: lobby.toJSON()
    }
  }, ws);

  broadcastLobbyList();
  console.log(`Player ${client.name} joined lobby ${lobby.name}`);
}

function handleLeaveLobby(ws) {
  const client = clients.get(ws);
  if (!client || !client.lobbyId) return;

  const lobby = lobbies.get(client.lobbyId);
  if (!lobby) return;

  lobby.removePlayer(client.id);

  lobby.broadcast({
    type: 'player_left',
    payload: {
      playerId: client.id,
      lobby: lobby.toJSON()
    }
  });

  client.lobbyId = null;

  // Clean up empty lobbies
  if (lobby.players.size === 0) {
    lobbies.delete(lobby.id);
    console.log(`Lobby ${lobby.name} removed (empty)`);
  }

  ws.send(JSON.stringify({ type: 'lobby_left' }));
  broadcastLobbyList();
}

function handleListLobbies(ws) {
  const lobbyList = Array.from(lobbies.values()).map(l => l.toJSON());
  ws.send(JSON.stringify({
    type: 'lobby_list',
    payload: lobbyList
  }));
}

function handleStartGame(ws) {
  const client = clients.get(ws);
  if (!client || !client.lobbyId) return;

  const lobby = lobbies.get(client.lobbyId);
  if (!lobby) return;

  if (lobby.host !== client.id) {
    ws.send(JSON.stringify({ type: 'error', error: 'Only host can start game' }));
    return;
  }

  lobby.state = 'playing';
  lobby.broadcast({
    type: 'game_started',
    payload: {
      lobby: lobby.toJSON()
    }
  });

  broadcastLobbyList();
  console.log(`Game started in lobby ${lobby.name}`);
}

function handleGameState(ws, payload) {
  const client = clients.get(ws);
  if (!client || !client.lobbyId) return;

  const lobby = lobbies.get(client.lobbyId);
  if (!lobby) return;

  // Only host can update game state (host-authoritative)
  if (lobby.host === client.id) {
    lobby.gameState = payload;
  }

  // Relay state to all players except sender
  lobby.broadcast({
    type: 'game_state',
    payload: {
      playerId: client.id,
      state: payload
    }
  }, ws);
}

function handlePlayerInput(ws, payload) {
  const client = clients.get(ws);
  if (!client || !client.lobbyId) return;

  const lobby = lobbies.get(client.lobbyId);
  if (!lobby) return;

  // Relay input to all players except sender
  lobby.broadcast({
    type: 'player_input',
    payload: {
      playerId: client.id,
      input: payload
    }
  }, ws);
}

function handleDisconnect(client) {
  console.log(`Player ${client.name} disconnected`);

  if (client.lobbyId) {
    const lobby = lobbies.get(client.lobbyId);
    if (lobby) {
      lobby.removePlayer(client.id);
      lobby.broadcast({
        type: 'player_disconnected',
        payload: {
          playerId: client.id,
          lobby: lobby.toJSON()
        }
      });

      if (lobby.players.size === 0) {
        lobbies.delete(lobby.id);
      }
      broadcastLobbyList();
    }
  }
}

function broadcastLobbyList() {
  const lobbyList = Array.from(lobbies.values()).map(l => l.toJSON());
  const message = JSON.stringify({
    type: 'lobby_list',
    payload: lobbyList
  });

  clients.forEach((client, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// HTTP server for static files
const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') filePath = './index.html';

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('500 Internal Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`HTTP server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${WS_PORT}`);
  console.log(`\nVecterm Multiplayer Server Ready!`);
});

// Cleanup interval
setInterval(() => {
  const now = Date.now();
  clients.forEach((client, ws) => {
    if (now - client.lastPing > 60000) { // 60 second timeout
      console.log(`Disconnecting inactive player ${client.name}`);
      ws.close();
    }
  });
}, 30000);
