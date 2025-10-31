#!/usr/bin/env node

/**
 * Simple test of LIF Model with pulse train
 * Run with: node test-pulse-train.js
 */

// Since we're using ES modules, we need to import
import { LIFModel } from './core/LIFModel.js';

console.log('=== Testing LIF Model with Pulse Train ===\n');

// Create model with pulse train enabled
const model = new LIFModel({
    threshold: 1.0,
    tau: 20,
    input: 0.08,
    inputMultiplier: 1.3,
    pulseTrain: true,
    pulseFrequency: 8,         // 8 Hz = one pulse every 125ms
    pulseDuration: 5,          // 5ms narrow pulse
    pulseAmplitude: 8.0,       // Higher amplitude for alpha function
    pulseShape: 'alpha',       // Alpha function shape
    dt: 0.5                    // 0.5ms timestep
});

console.log('Model configuration:');
console.log(`  Threshold: ${model.threshold}`);
console.log(`  Tau: ${model.tau} ms`);
console.log(`  Pulse frequency: ${model.pulseFrequency} Hz`);
console.log(`  Pulse duration: ${model.pulseDuration} ms`);
console.log(`  Pulse amplitude: ${model.pulseAmplitude}`);
console.log(`  Pulse shape: ${model.pulseShape}`);
console.log(`  Input multiplier: ${model.inputMultiplier}`);
console.log('');

let spikeCount = 0;
const spikeTimes = [];

// Simulate for 500ms (should see ~4 spikes at 8 Hz)
console.log('Simulating 500ms...\n');
for (let step = 0; step < 1000; step++) {
    const spiked = model.step(0.5);

    if (spiked) {
        spikeCount++;
        spikeTimes.push(model.time);
        console.log(`✓ SPIKE #${spikeCount} at t=${model.time.toFixed(1)}ms, V=${model.membrane.toFixed(3)}`);
    }

    // Log membrane potential every 25ms
    if (step % 50 === 0) {
        const period = 1000 / model.pulseFrequency;
        const timeInPeriod = model.time % period;
        const isPulseActive = timeInPeriod < model.pulseDuration;
        console.log(`  t=${model.time.toFixed(1)}ms, V=${model.membrane.toFixed(3)}, pulse=${isPulseActive ? 'ON' : 'OFF'}`);
    }
}

console.log('\n=== Summary ===');
console.log(`Total spikes: ${spikeCount}`);
console.log(`Expected spikes (at 8 Hz over 500ms): ~4`);
console.log(`Spike times: ${spikeTimes.map(t => t.toFixed(1) + 'ms').join(', ')}`);

if (spikeCount >= 3 && spikeCount <= 5) {
    console.log('\n✅ SUCCESS: Pulse train is working correctly!');
} else if (spikeCount === 0) {
    console.log('\n❌ FAILURE: No spikes detected. Pulse amplitude may be too low.');
} else {
    console.log(`\n⚠️  WARNING: Unexpected number of spikes (${spikeCount})`);
}
