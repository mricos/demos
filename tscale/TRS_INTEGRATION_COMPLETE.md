# TRS Integration Complete!

## What's New

### 1. Project Structure (.snn + db/)

```
your-project/
├── .snn/                        # Local metadata (like .git/)
│   ├── session                  # Last session state
│   └── config                   # Local config overrides
├── db/                          # TRS timestamped records
│   ├── {timestamp}.data.raw.tsv
│   ├── {timestamp}.audio.source.wav
│   └── {timestamp}.config.kernel.toml
└── test.wav                     # Your audio files
```

### 2. Auto-Tscale Workflow

**No more pre-generation!** Just provide audio file:

```bash
# Old way (manual):
./tscale -i test.wav -ta 0.001 -tr 0.005 -o out.tsv
python -m ascii_scope_snn.main out.tsv

# New way (automatic):
python -m ascii_scope_snn.main test.wav
# Automatically runs tscale, saves to db/, loads data!
```

### 3. New CLI Commands

| Command | Description |
|---------|-------------|
| `:load test.wav` | Load audio (auto-runs tscale if needed) |
| `:reload` | Reload with updated kernel params |
| `:cwd [path]` | Get/set working directory |
| `:session` | Show current session info |
| `:project` | Show project info (DB size, records, etc.) |
| `:data list` | List all data files in db/ |
| `:data latest` | Show latest data file |

### 4. Session Persistence

Automatically saves/restores:
- Current position
- Markers
- Kernel parameters
- Display mode
- Audio file

**Exit and restart - picks up exactly where you left off!**

### 5. Project Discovery

Works anywhere in your project tree (like `git`):

```bash
cd ~/my-project/subdir/
python -m ascii_scope_snn.main
# Searches upward for .snn/, uses ~/my-project/ as root
```

## Usage Examples

### First Time Setup

```bash
# 1. Create project directory
mkdir my-snn-project
cd my-snn-project

# 2. Add audio file
cp ~/Music/test.wav .

# 3. Run ASCII Scope SNN
python -m ascii_scope_snn.main test.wav
```

This creates:
```
my-snn-project/
├── .snn/           # Created automatically
│   └── session     # Session state
├── db/             # Created automatically
│   ├── 1730760000.data.raw.tsv
│   ├── 1730760000.audio.source.wav
│   └── 1730760000.config.kernel.toml
└── test.wav
```

### Resuming Session

```bash
# Later... just run without arguments
cd my-snn-project
python -m ascii_scope_snn.main
# Automatically restores last session!
```

### Tweaking Parameters

```bash
# 1. Start app
python -m ascii_scope_snn.main test.wav

# 2. In CLI mode, adjust params:
:tau_a 0.002
:tau_r 0.010

# 3. Reload with new params:
:reload
# Runs tscale again with updated params!
```

### Exploring Data

```bash
# List all processed data files
:data list

# Show project stats
:project

# View session history
:session
```

## New Workflow

### Before (Manual):
```
1. Run tscale manually
2. Remember which params you used
3. Keep track of output files
4. Manually restore session
```

### Now (Automatic):
```
1. python -m ascii_scope_snn.main test.wav
2. Everything else is automatic!
   - Runs tscale
   - Saves params
   - Tracks session
   - Restores on restart
```

## Implementation Details

### Files Created
1. `ascii_scope_snn/trs.py` - TRS storage layer
2. `ascii_scope_snn/cwd_manager.py` - Working directory tracking
3. `ascii_scope_snn/tscale_runner.py` - Auto-tscale execution
4. `ascii_scope_snn/project.py` - Project management (.snn/)
5. Updated `main.py` - Integrated TRS system
6. Updated `command_definitions.py` - Added 6 new commands

### Database Records

| Type | Kind | Format | Purpose |
|------|------|--------|---------|
| data | raw | tsv | Tscale output |
| audio | source | wav | Source audio (copy) |
| config | kernel | toml | Kernel params used |
| session | state | json | Session snapshots |

### Command Count
- **Before**: 59 commands
- **After**: 65 commands (+ load, reload, cwd, session, project, data)

## Benefits

✓ **No pre-generation** - Audio → auto-tscale → ready
✓ **Reproducibility** - Params saved with each run
✓ **Session continuity** - Resume exactly where you left off
✓ **Queryable history** - Find any past run by timestamp
✓ **Project portability** - .snn/ local, db/ shareable
✓ **Tetra ecosystem** - Works with TRS/TAS if TETRA_DIR set

## Next Steps

Try it out:
```bash
cd /Users/mricos/src/mricos/demos/tscale
python -m ascii_scope_snn.main test.wav
```

New commands to try:
- `:project` - See project info
- `:data list` - List all processed files
- `:reload` - Reprocess with new params
