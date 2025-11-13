# TScale - Dual-Tau Spike Detection with ASCII Scope Visualization

A spike detection system using dual-tau (bi-exponential) kernels for audio beat and subdivision detection, with a professional multi-page terminal oscilloscope for parameter tuning.

## Quick Start

```bash
# Test the system
python test_scope.py

# Run the oscilloscope
python -m ascii_scope_snn.main tscale.out.txt audio.wav
```

See [QUICKSTART.md](QUICKSTART.md) for a 5-minute tutorial.

## Project Structure

```
tscale/
├── tscale.c                # Core dual-tau algorithm implementation
├── tscale                  # Compiled executable
├── miniaudio.h             # Audio library
│
├── ascii_scope_snn/        # Multi-page oscilloscope (NEW - modular)
│   ├── main.py             # Entry point
│   ├── state.py            # State management
│   ├── config.py           # TOML persistence
│   ├── cli/                # CLI system (commands, parser, manager)
│   ├── pages/              # Page system (oscilloscope, CLI, statistics, markers)
│   ├── rendering/          # Rendering (envelope, points, helpers)
│   └── analysis/           # Analysis (BPM, statistics)
│
├── test_scope.py           # Comprehensive test suite
│
├── REFACTORING_COMPLETE.md # Technical summary
├── QUICKSTART.md           # Quick start guide
│
├── lib/                    # Dependencies
├── archive/                # Old implementations (preserved for reference)
│   ├── old_implementations/
│   ├── old_scripts/
│   ├── old_docs/
│   └── old_binaries/
│
└── Data files:
    ├── audio.wav           # Test audio
    ├── tscale.out.txt      # tscale output (TSV format)
    └── drummer.mp4         # Video demo
```

## The Dual-Tau Algorithm

```
k(t) = exp(-t/τr) - exp(-t/τa)    where 0 < τa < τr

τa: Attack time constant (how fast synapse responds)
τr: Recovery time constant (how long response persists)
```

**Goal**: Fine-tune τa and τr to detect:
- **pulse1**: The beat
- **pulse2**: Subdivisions (2:1, 3:1, or 4:1 ratio)

## ASCII Scope Features

### Multi-Page System
- **Page 1**: 4-channel oscilloscope
- **Page 2**: CLI interface
- **Page 3**: Real-time BPM analysis (4 methods)
- **Page 4**: Marker browser (time bookmarks)

### BPM Analysis (4 Methods)
- ISI Average
- Histogram Peak
- Windowed Analysis (tempo changes)
- Autocorrelation (FFT-based)

### Comparative Statistics
- Count ratios (pulse1:pulse2)
- Timing precision (jitter, CV, MAD)
- Cross-correlation & phase alignment

### CLI Commands
```bash
:tau_a 0.0015        # Set attack tau
:tau_r 0.005         # Set recovery tau
:thr 3.0             # Set threshold (sigma)
:reprocess           # Run tscale with new params
:mark beat_section   # Create time bookmark
:save preset.toml    # Save configuration
```

### Keyboard Shortcuts
- `?` - Help
- `Space` - Play/Pause
- `←/→` - Scrub (1%/10%)
- `</>` - Zoom in/out
- `1-5` - Toggle pages
- `F1-F4` - Toggle channels
- `m` - Create marker
- `:` - Enter CLI mode
- `z/Z`, `x/X` - Adjust tau_a, tau_r by semitone
- `K` - Reprocess

## Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute tutorial
- **[ascii_scope_snn/README.md](ascii_scope_snn/README.md)** - Complete guide
- **[ascii_scope_snn/MIGRATION.md](ascii_scope_snn/MIGRATION.md)** - Migration from old version
- **[REFACTORING_COMPLETE.md](REFACTORING_COMPLETE.md)** - Technical details
- **[archive/ARCHIVE_MANIFEST.md](archive/ARCHIVE_MANIFEST.md)** - Archived files

## Building

```bash
# Compile tscale
gcc -o tscale tscale.c -lm

# Run tscale
./tscale -i audio.wav -ta 0.001 -tr 0.005 -th 3.0 -o tscale.out.txt
```

## Dependencies

```bash
pip install numpy tomli tomli_w
```

Python 3.11+ has built-in `tomllib` (no `tomli` needed).

## Workflow Example

1. **Process audio**: `./tscale -i audio.wav -o tscale.out.txt`
2. **Launch scope**: `python -m ascii_scope_snn.main tscale.out.txt audio.wav`
3. **Enable analysis**: Press `1`, `2`, `3` (oscilloscope, CLI, statistics)
4. **Create markers**: Press `m` at interesting sections
5. **Adjust parameters**: `z/Z` for tau_a, check BPM consensus in Page 3
6. **Reprocess**: Press `K` to run tscale with new parameters
7. **Fine-tune**: Use CLI for precise values: `:tau_a 0.0015`
8. **Save preset**: `:save beat_120bpm.toml`

## Status

✅ **Production Ready**

- Modular architecture (2400+ lines, 20+ modules)
- Comprehensive testing
- Full documentation
- BPM analysis with 4 methods
- Marker system for workflow
- TOML configuration
- CLI with 38+ commands

## Archive

Old implementations preserved in `archive/`:
- Original monolithic `ascii_scope_snn.py`
- Experimental C, Lua implementations
- Old scripts and utilities

See [archive/ARCHIVE_MANIFEST.md](archive/ARCHIVE_MANIFEST.md) for details.

## License

See parent project license.
