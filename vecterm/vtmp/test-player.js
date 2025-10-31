#!/usr/bin/env node
/**
 * Unit tests for Player class
 * Run with: node vtmp/test-player.js
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

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value should not be null or undefined');
  }
}

// Mock WebSocket
class MockWebSocket {
  constructor() {
    this.readyState = 1; // OPEN
    this.messages = [];
  }

  send(data) {
    this.messages.push(data);
  }
}

// Player class from server
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
const runner = new TestRunner('Player');

runner.test('should create a player with required fields', () => {
  const ws = new MockWebSocket();
  const player = new Player('player-1', 'Alice', ws);

  assertEqual(player.id, 'player-1', 'ID should match');
  assertEqual(player.name, 'Alice', 'Name should match');
  assertEqual(player.ws, ws, 'WebSocket should match');
  assertEqual(player.lobbyId, null, 'Should start with no lobby');
  assertNotNull(player.lastPing, 'lastPing should be set');
});

runner.test('should initialize with current timestamp for lastPing', () => {
  const ws = new MockWebSocket();
  const before = Date.now();
  const player = new Player('player-1', 'Alice', ws);
  const after = Date.now();

  assert(
    player.lastPing >= before && player.lastPing <= after,
    'lastPing should be set to current time'
  );
});

runner.test('should allow setting lobbyId', () => {
  const ws = new MockWebSocket();
  const player = new Player('player-1', 'Alice', ws);

  player.lobbyId = 'lobby-123';

  assertEqual(player.lobbyId, 'lobby-123', 'lobbyId should be updated');
});

runner.test('should allow updating lastPing', () => {
  const ws = new MockWebSocket();
  const player = new Player('player-1', 'Alice', ws);
  const initialPing = player.lastPing;

  // Wait a bit
  const newTime = Date.now() + 1000;
  player.lastPing = newTime;

  assert(player.lastPing > initialPing, 'lastPing should be updated');
  assertEqual(player.lastPing, newTime, 'lastPing should match new time');
});

runner.test('should serialize to JSON correctly', () => {
  const ws = new MockWebSocket();
  const player = new Player('player-1', 'Alice', ws);

  const json = player.toJSON();

  assertEqual(json.id, 'player-1', 'ID should match');
  assertEqual(json.name, 'Alice', 'Name should match');
  assertEqual(json.lobbyId, null, 'lobbyId should be null');
  assert(!('ws' in json), 'WebSocket should not be in JSON');
  assert(!('lastPing' in json), 'lastPing should not be in JSON');
});

runner.test('should serialize to JSON with lobbyId', () => {
  const ws = new MockWebSocket();
  const player = new Player('player-1', 'Alice', ws);
  player.lobbyId = 'lobby-456';

  const json = player.toJSON();

  assertEqual(json.id, 'player-1', 'ID should match');
  assertEqual(json.name, 'Alice', 'Name should match');
  assertEqual(json.lobbyId, 'lobby-456', 'lobbyId should be included');
});

runner.test('should maintain reference to WebSocket', () => {
  const ws = new MockWebSocket();
  const player = new Player('player-1', 'Alice', ws);

  ws.send('test message');

  assertEqual(player.ws.messages.length, 1, 'WebSocket should be accessible through player');
  assertEqual(player.ws.messages[0], 'test message', 'Message should be sent through player.ws');
});

runner.test('should handle different player names', () => {
  const ws = new MockWebSocket();
  const players = [
    new Player('p1', 'Alice', ws),
    new Player('p2', 'Bob', ws),
    new Player('p3', 'Player123', ws),
    new Player('p4', '', ws)
  ];

  assertEqual(players[0].name, 'Alice');
  assertEqual(players[1].name, 'Bob');
  assertEqual(players[2].name, 'Player123');
  assertEqual(players[3].name, '', 'Empty name should be allowed');
});

// Run the tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});
