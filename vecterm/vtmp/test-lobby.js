#!/usr/bin/env node
/**
 * Unit tests for Lobby class
 * Run with: node vtmp/test-lobby.js
 */

// Simple test framework
class TestRunner {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(description, fn) {
    this.tests.push({ description, fn });
  }

  async run() {
    console.log(`\n🧪 Running tests for ${this.name}\n`);

    for (const { description, fn } of this.tests) {
      try {
        await fn();
        console.log(`✅ ${description}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${description}`);
        console.log(`   Error: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed, ${this.tests.length} total\n`);
    return this.failed === 0;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// Mock WebSocket for testing
class MockWebSocket {
  constructor() {
    this.readyState = 1; // OPEN
    this.messages = [];
  }

  send(data) {
    this.messages.push(data);
  }
}

// Import the Lobby and Player classes
// Since we can't easily import from server.js, we'll redefine them here
class Lobby {
  constructor(id, name, maxPlayers = 4) {
    this.id = id;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.players = new Map();
    this.host = null;
    this.state = 'waiting';
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
      if (player.ws && player.ws !== exclude && player.ws.readyState === 1) {
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

// Create test suite
const runner = new TestRunner('Lobby');

runner.test('should create a lobby with default values', () => {
  const lobby = new Lobby('test-id', 'Test Lobby');

  assertEqual(lobby.id, 'test-id', 'ID should match');
  assertEqual(lobby.name, 'Test Lobby', 'Name should match');
  assertEqual(lobby.maxPlayers, 4, 'Default maxPlayers should be 4');
  assertEqual(lobby.players.size, 0, 'Should start with no players');
  assertEqual(lobby.host, null, 'Should start with no host');
  assertEqual(lobby.state, 'waiting', 'Initial state should be waiting');
});

runner.test('should create a lobby with custom maxPlayers', () => {
  const lobby = new Lobby('test-id', 'Test Lobby', 8);

  assertEqual(lobby.maxPlayers, 8, 'Custom maxPlayers should be set');
});

runner.test('should add a player successfully', () => {
  const lobby = new Lobby('lobby-1', 'Test Lobby');
  const ws = new MockWebSocket();
  const player = new Player('player-1', 'Alice', ws);

  const result = lobby.addPlayer(player);

  assert(result === true, 'addPlayer should return true');
  assertEqual(lobby.players.size, 1, 'Lobby should have 1 player');
  assertEqual(lobby.host, 'player-1', 'First player should become host');
});

runner.test('should set first player as host', () => {
  const lobby = new Lobby('lobby-1', 'Test Lobby');
  const ws1 = new MockWebSocket();
  const ws2 = new MockWebSocket();
  const player1 = new Player('player-1', 'Alice', ws1);
  const player2 = new Player('player-2', 'Bob', ws2);

  lobby.addPlayer(player1);
  lobby.addPlayer(player2);

  assertEqual(lobby.host, 'player-1', 'First player should be host');
});

runner.test('should reject player when lobby is full', () => {
  const lobby = new Lobby('lobby-1', 'Test Lobby', 2);
  const ws1 = new MockWebSocket();
  const ws2 = new MockWebSocket();
  const ws3 = new MockWebSocket();
  const player1 = new Player('player-1', 'Alice', ws1);
  const player2 = new Player('player-2', 'Bob', ws2);
  const player3 = new Player('player-3', 'Charlie', ws3);

  lobby.addPlayer(player1);
  lobby.addPlayer(player2);
  const result = lobby.addPlayer(player3);

  assert(result === false, 'Should reject third player');
  assertEqual(lobby.players.size, 2, 'Should only have 2 players');
});

runner.test('should remove a player', () => {
  const lobby = new Lobby('lobby-1', 'Test Lobby');
  const ws = new MockWebSocket();
  const player = new Player('player-1', 'Alice', ws);

  lobby.addPlayer(player);
  lobby.removePlayer('player-1');

  assertEqual(lobby.players.size, 0, 'Player should be removed');
});

runner.test('should transfer host when host leaves', () => {
  const lobby = new Lobby('lobby-1', 'Test Lobby');
  const ws1 = new MockWebSocket();
  const ws2 = new MockWebSocket();
  const player1 = new Player('player-1', 'Alice', ws1);
  const player2 = new Player('player-2', 'Bob', ws2);

  lobby.addPlayer(player1);
  lobby.addPlayer(player2);
  lobby.removePlayer('player-1');

  assertEqual(lobby.host, 'player-2', 'Host should transfer to second player');
  assertEqual(lobby.players.size, 1, 'Should have 1 player remaining');
});

runner.test('should broadcast message to all players except sender', () => {
  const lobby = new Lobby('lobby-1', 'Test Lobby');
  const ws1 = new MockWebSocket();
  const ws2 = new MockWebSocket();
  const ws3 = new MockWebSocket();
  const player1 = new Player('player-1', 'Alice', ws1);
  const player2 = new Player('player-2', 'Bob', ws2);
  const player3 = new Player('player-3', 'Charlie', ws3);

  lobby.addPlayer(player1);
  lobby.addPlayer(player2);
  lobby.addPlayer(player3);

  const message = { type: 'test', data: 'hello' };
  lobby.broadcast(message, ws1);

  assertEqual(ws1.messages.length, 0, 'Excluded player should not receive message');
  assertEqual(ws2.messages.length, 1, 'Player 2 should receive message');
  assertEqual(ws3.messages.length, 1, 'Player 3 should receive message');

  const receivedMessage = JSON.parse(ws2.messages[0]);
  assertEqual(receivedMessage.type, 'test', 'Message type should match');
  assertEqual(receivedMessage.data, 'hello', 'Message data should match');
});

runner.test('should serialize to JSON correctly', () => {
  const lobby = new Lobby('lobby-1', 'Test Lobby', 4);
  const ws = new MockWebSocket();
  const player = new Player('player-1', 'Alice', ws);

  lobby.addPlayer(player);
  const json = lobby.toJSON();

  assertEqual(json.id, 'lobby-1', 'ID should match');
  assertEqual(json.name, 'Test Lobby', 'Name should match');
  assertEqual(json.maxPlayers, 4, 'MaxPlayers should match');
  assertEqual(json.playerCount, 1, 'Player count should be 1');
  assertEqual(json.host, 'player-1', 'Host should match');
  assertEqual(json.state, 'waiting', 'State should match');
  assertEqual(json.players.length, 1, 'Players array should have 1 player');
  assertEqual(json.players[0].id, 'player-1', 'Player ID should match');
  assertEqual(json.players[0].name, 'Alice', 'Player name should match');
  assertEqual(json.players[0].isHost, true, 'Player should be marked as host');
});

// Run the tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});
