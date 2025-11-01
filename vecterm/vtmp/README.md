# Vecterm Server - vtmp Directory

This directory contains the vecterm multiplayer server code and its unit tests.

## Contents

- `server.js` - Main WebSocket server for multiplayer functionality
- `test-lobby.js` - Unit tests for the Lobby class
- `test-player.js` - Unit tests for the Player class
- `test-utils.js` - Unit tests for utility functions (generateId)
- `run-tests.sh` - Convenience script to run all tests

## Running Tests

### Run all tests:
```bash
./vtmp/run-tests.sh
```

### Run individual test suites:
```bash
node vtmp/test-lobby.js
node vtmp/test-player.js
node vtmp/test-utils.js
```

## Test Coverage

### Lobby Tests (9 tests)
- Lobby creation with default and custom values
- Player management (add, remove)
- Host assignment and transfer
- Broadcasting messages to players
- JSON serialization
- Capacity enforcement

### Player Tests (8 tests)
- Player creation and initialization
- Property management (lobbyId, lastPing)
- JSON serialization
- WebSocket reference handling
- Name validation

### Utils Tests (8 tests)
- ID generation correctness
- Character set validation
- Uniqueness verification
- Collision rate testing
- Performance benchmarking

## Test Framework

The tests use a simple, custom test framework with:
- Async test support
- Clear pass/fail reporting
- Detailed error messages
- Exit codes for CI/CD integration

Total: **25 unit tests** covering core server functionality
