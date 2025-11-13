# Quick Start - ASCII Scope SNN with TRS

## Installation

```bash
cd /Users/mricos/src/mricos/demos/tscale

# Install dependencies
pip install toml  # Only new dependency needed
```

## Usage

### First Run

```bash
# Just provide an audio file!
python -m ascii_scope_snn.main test.wav
```

This will:
1. Create `.snn/` and `db/` directories
2. Run tscale on `test.wav` with default params
3. Save processed data to `db/{timestamp}.data.raw.tsv`
4. Save kernel params to `db/{timestamp}.config.kernel.toml`
5. Copy source audio to `db/{timestamp}.audio.source.wav`
6. Load and display the data

### Resume Session

```bash
# Later, just run without arguments
python -m ascii_scope_snn.main

# Automatically:
# - Finds .snn/ directory (searches upward)
# - Loads last session
# - Restores position, markers, params
```

### CLI Commands

Press `:` to enter CLI mode, then:

```bash
# Load different audio file
:load another.wav

# Adjust parameters
:tau_a 0.002
:tau_r 0.010
:thr 3.5

# Reload with new params
:reload

# View project info
:project

# List all data files
:data list

# Show session info
:session

# Set working directory
:cwd /path/to/audio/files
```

### Keyboard Shortcuts

```
Space       play/pause
</>         zoom in/out
z/Z         tau_a ±1 semitone
x/X         tau_r ±1 semitone
m           create marker
`/~         next/previous marker
o           toggle envelope/points
:           enter CLI mode
?           help
q           quit
```

## Example Session

```bash
# 1. Start with audio file
cd my-project
python -m ascii_scope_snn.main audio/test.wav

# Creates:
# .snn/session
# db/1730760000.data.raw.tsv
# db/1730760000.audio.source.wav
# db/1730760000.config.kernel.toml

# 2. Tweak params in UI
# Press : for CLI
:tau_a 0.003
:tau_r 0.015

# 3. Reload with new params
:reload

# Creates new data with new timestamp:
# db/1730760100.data.raw.tsv
# db/1730760100.config.kernel.toml

# 4. Exit (q)
# Session automatically saved to .snn/session

# 5. Later, resume
python -m ascii_scope_snn.main
# Restores exact state!
```

## Directory Structure

```
my-project/
├── .snn/                        # Local metadata
│   ├── session                  # Last session
│   └── config                   # Local config
├── db/                          # TRS records
│   ├── 1730760000.data.raw.tsv
│   ├── 1730760000.audio.source.wav
│   ├── 1730760000.config.kernel.toml
│   └── 1730760100.data.raw.tsv
└── audio/                       # Your audio files
    └── test.wav
```

## Troubleshooting

### "tscale binary not found"
Make sure `./tscale` exists in current directory:
```bash
ls -la ./tscale
# Should show executable
```

### "No data found"
If you start without arguments and no session exists:
```bash
# Load an audio file
:load test.wav
```

### Check project status
```bash
# In CLI mode
:project
# Shows DB size, record counts, etc.
```

## Tips

1. **Keep .snn/ local** - Add to .gitignore for per-user sessions
2. **Share db/** - Commit to git for reproducible results
3. **Use markers** - Press `m` to mark interesting points
4. **Experiment freely** - Each `:reload` creates new timestamped data
5. **Query history** - Use `:data list` to see all past runs

## What's Different from Old System?

| Old | New |
|-----|-----|
| Manual tscale run | Automatic |
| Remember params | Saved with data |
| Track output files | Timestamped in db/ |
| Manual session restore | Automatic |
| Single .toml config | Per-run configs |
