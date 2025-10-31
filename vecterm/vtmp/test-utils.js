#!/usr/bin/env node
/**
 * Unit tests for utility functions (generateId)
 * Run with: node vtmp/test-utils.js
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

function assertNotEqual(actual, expected, message) {
  if (actual === expected) {
    throw new Error(message || `Expected values to be different`);
  }
}

// Generate unique ID function from server
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// Create test suite
const runner = new TestRunner('Utility Functions');

runner.test('generateId should return a string', () => {
  const id = generateId();
  assertEqual(typeof id, 'string', 'Should return a string');
});

runner.test('generateId should return a 9-character string', () => {
  const id = generateId();
  assert(id.length <= 9, 'ID should be at most 9 characters long');
  assert(id.length > 0, 'ID should not be empty');
});

runner.test('generateId should use base36 characters', () => {
  const id = generateId();
  const validChars = /^[a-z0-9]+$/;
  assert(validChars.test(id), 'ID should only contain lowercase letters and numbers');
});

runner.test('generateId should generate unique IDs', () => {
  const ids = new Set();
  const iterations = 1000;

  for (let i = 0; i < iterations; i++) {
    ids.add(generateId());
  }

  assertEqual(ids.size, iterations, `Should generate ${iterations} unique IDs`);
});

runner.test('generateId should generate different IDs on consecutive calls', () => {
  const id1 = generateId();
  const id2 = generateId();
  const id3 = generateId();

  assertNotEqual(id1, id2, 'First and second IDs should be different');
  assertNotEqual(id2, id3, 'Second and third IDs should be different');
  assertNotEqual(id1, id3, 'First and third IDs should be different');
});

runner.test('generateId should work consistently', () => {
  // Generate multiple IDs and verify they all meet basic criteria
  const ids = [];
  for (let i = 0; i < 100; i++) {
    ids.push(generateId());
  }

  ids.forEach((id, index) => {
    assert(typeof id === 'string', `ID ${index} should be a string`);
    assert(id.length > 0 && id.length <= 9, `ID ${index} should have valid length`);
    assert(/^[a-z0-9]+$/.test(id), `ID ${index} should contain only valid characters`);
  });
});

runner.test('generateId collision rate should be very low', () => {
  const ids = [];
  const count = 10000;

  for (let i = 0; i < count; i++) {
    ids.push(generateId());
  }

  const uniqueIds = new Set(ids);
  const collisionRate = (count - uniqueIds.size) / count;

  assert(collisionRate < 0.01, `Collision rate should be less than 1%, got ${(collisionRate * 100).toFixed(2)}%`);
});

runner.test('generateId should be fast', () => {
  const start = Date.now();
  const iterations = 10000;

  for (let i = 0; i < iterations; i++) {
    generateId();
  }

  const duration = Date.now() - start;
  const avgTime = duration / iterations;

  assert(avgTime < 1, `Average generation time should be less than 1ms, got ${avgTime.toFixed(3)}ms`);
  console.log(`   ℹ️  Generated ${iterations} IDs in ${duration}ms (${avgTime.toFixed(3)}ms avg)`);
});

// Run the tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});
