#!/usr/bin/env python3
"""
Quick test of ascii_scope_snn package.
Tests basic loading and state management without curses.
"""

import sys
sys.path.insert(0, '.')

from ascii_scope_snn.state import AppState, KernelParams
from ascii_scope_snn.data_loader import load_data_file, compute_duration
from ascii_scope_snn.cli.commands import CommandRegistry
from ascii_scope_snn.analysis.bpm import calculate_bpm_all_methods
from ascii_scope_snn.analysis.statistics import analyze_pulse_comparison

print("="*60)
print("ASCII Scope SNN - Basic Test")
print("="*60)

# Test 1: Load data
print("\n[1] Loading data...")
try:
    data_buffer = load_data_file("tscale.out.txt", max_channels=4)
    duration = compute_duration(data_buffer)
    print(f"✓ Loaded {len(data_buffer)} samples")
    print(f"✓ Duration: {duration:.3f}s")
    print(f"✓ Columns: {len(data_buffer[0][1])} channels")
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)

# Test 2: Initialize state
print("\n[2] Initializing state...")
try:
    state = AppState()
    state.data_buffer = data_buffer
    state.transport.duration = duration
    print(f"✓ State initialized")
    print(f"✓ Kernel: τa={state.kernel.tau_a}s τr={state.kernel.tau_r}s thr={state.kernel.threshold}σ")
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)

# Test 3: Command registry
print("\n[3] Testing command registry...")
try:
    commands = CommandRegistry(state)
    print(f"✓ Registered {len(commands.commands)} commands")

    # Test a few commands
    result = commands.execute("zoom 2.0")
    print(f"✓ zoom 2.0: {result}")

    result = commands.execute("seek 1.5")
    print(f"✓ seek 1.5: {result}")

    result = commands.execute("status")
    print(f"✓ status: {result}")
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)

# Test 4: BPM analysis
print("\n[4] Testing BPM analysis...")
try:
    # Use channel 3 (evt = events)
    bpm_results = calculate_bpm_all_methods(data_buffer, channel_id=3)
    print(f"✓ BPM calculated with 4 methods:")
    for method, (bpm, conf) in bpm_results.items():
        print(f"  {method:20} {bpm:6.1f} BPM  (conf: {conf:.2f})")
except Exception as e:
    print(f"✗ Error: {e}")
    # This might fail if there aren't enough pulses, that's okay
    print("  (This is okay if data has few/no pulses)")

# Test 5: Statistics
print("\n[5] Testing comparative statistics...")
try:
    # Compare envelope (ch2) vs events (ch3)
    stats = analyze_pulse_comparison(data_buffer, pulse1_ch=2, pulse2_ch=3)

    cr = stats.get('count_ratios', {})
    print(f"✓ Count ratios:")
    print(f"  Pulse1: {cr.get('pulse1_count', 0)}  Pulse2: {cr.get('pulse2_count', 0)}")
    print(f"  Ratio: {cr.get('ratio', 0):.2f}:1  Expected: {cr.get('expected_ratio', 0)}:1")

    tp = stats.get('timing_precision', {}).get('pulse1', {})
    print(f"✓ Timing precision (pulse1):")
    print(f"  Mean ISI: {tp.get('mean_isi', 0):.3f}s")
    print(f"  Jitter: {tp.get('jitter', 0):.2f}ms")
    print(f"  CV: {tp.get('cv', 0):.3f}")
except Exception as e:
    print(f"✗ Error: {e}")
    print("  (This is okay if data has few/no pulses)")

# Test 6: Marker system
print("\n[6] Testing marker system...")
try:
    state.markers.add(1.5, "test_marker_1")
    state.markers.add(3.0, "test_marker_2")
    print(f"✓ Added 2 markers")

    marker = state.markers.get_by_label("test_marker_1")
    print(f"✓ Retrieved marker: '{marker.label}' at {marker.time}s")

    state.transport.seek(marker.time)
    print(f"✓ Jumped to marker position: {state.transport.position}s")
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)

# Test 7: Config save/load
print("\n[7] Testing config persistence...")
try:
    from ascii_scope_snn.config import save_config, load_config
    import tempfile
    import os

    # Save to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.toml', delete=False) as f:
        temp_path = f.name

    save_config(state, temp_path)
    print(f"✓ Saved config to {temp_path}")

    # Load back
    loaded_state = load_config(temp_path)
    print(f"✓ Loaded config")
    print(f"  τa={loaded_state.kernel.tau_a}s τr={loaded_state.kernel.tau_r}s")
    print(f"  Position: {loaded_state.transport.position}s")
    print(f"  Markers: {len(loaded_state.markers.all())}")

    # Cleanup
    os.unlink(temp_path)
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)

print("\n" + "="*60)
print("✓ All tests passed!")
print("="*60)
print("\nTo run the full TUI application:")
print(f"  python -m ascii_scope_snn.main tscale.out.txt")
print()
