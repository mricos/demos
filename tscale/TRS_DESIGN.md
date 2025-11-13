# ASCII Scope SNN - TRS Integration Design

## Module Definition

**Module Name**: `asnn` (ASCII Scope SNN)
**Purpose**: Audio Neural Network Parameter Tuning Interface

## TRS Record Structure

### Canonical Location

Primary: `./db/` (local working directory)
Fallback: `$TETRA_DIR/asnn/db/` (if TETRA_DIR set)

### Record Types

| Type | Kind | Format | Description |
|------|------|--------|-------------|
| `data` | `raw` | `tsv` | Tscale output (time-series data) |
| `data` | `processed` | `npy` | NumPy cached arrays (optional) |
| `config` | `kernel` | `toml` | Kernel parameters (tau_a, tau_r, etc.) |
| `config` | `display` | `toml` | Display settings (mode, lanes, etc.) |
| `config` | `full` | `toml` | Complete application state |
| `session` | `state` | `json` | Session state (position, markers, etc.) |
| `log` | `event` | `jsonl` | Event log (commands, errors, etc.) |
| `log` | `perf` | `jsonl` | Performance metrics |
| `audio` | `source` | `wav` | Input audio file (copy) |

### Example Records

```bash
./db/
├── 1730745600.data.raw.tsv           # Tscale output
├── 1730745600.audio.source.wav       # Source audio
├── 1730745600.config.kernel.toml     # Kernel params at time of processing
├── 1730745601.session.state.json     # Session snapshot
├── 1730745601.log.event.jsonl        # Event log
└── 1730745602.config.full.toml       # Config save
```

## Directory Structure

```
asnn-project/                    # User's project directory
├── db/                          # TRS canonical location
│   ├── 1730745600.data.raw.tsv
│   ├── 1730745600.config.kernel.toml
│   └── 1730745601.log.event.jsonl
├── .asnn/                       # Local metadata
│   ├── cwd                      # Current working directory pointer
│   └── last_session             # Last session timestamp
└── audio/                       # User's audio files (not managed)
    └── test.wav
```

## CWD Concept (Current Working Directory)

Similar to Claude Code, track the "current working directory" for:
- Audio file discovery
- Relative path resolution
- Default output location

### CWD Storage

```bash
./db/1730745600.session.state.json
{
  "timestamp": 1730745600,
  "cwd": "/Users/mricos/src/mricos/demos/tscale",
  "audio_file": "audio/test.wav",
  "data_file": "db/1730745600.data.raw.tsv",
  "position": 12.345,
  "markers": [...]
}
```

## Auto-Generation Workflow

Instead of requiring pre-generated TSV:

```
User provides: audio.wav
              ↓
asnn detects: no matching .data.raw.tsv
              ↓
asnn runs: tscale -i audio.wav [kernel params] -o db/{timestamp}.data.raw.tsv
              ↓
asnn writes: db/{timestamp}.config.kernel.toml (snapshot of params used)
              ↓
asnn loads: Generated data for display
```

## CLI Integration

### New Commands

```bash
# Set working directory
:cwd /path/to/audio/files

# Load audio file (auto-runs tscale)
:load audio.wav

# Reload with current kernel params
:reload

# Show current session
:session

# List available data files
:data list

# Query TRS records
:trs query type=data
:trs query timestamp=1730745600
```

## Implementation Plan

### Phase 1: TRS Storage Layer (trs.py)
```python
class TRSStorage:
    def __init__(self, db_path="./db"):
        self.db_path = Path(db_path)

    def write(self, type, kind, format, data, timestamp=None):
        """Write TRS record."""

    def query(self, **attributes):
        """Query records by attributes."""

    def get_timestamp_records(self, timestamp):
        """Get all records for a timestamp."""
```

### Phase 2: CWD Manager (cwd.py)
```python
class CWDManager:
    def __init__(self, db_path="./db"):
        self.db_path = Path(db_path)
        self.cwd = self.load_cwd()

    def set_cwd(self, path):
        """Set current working directory."""

    def resolve_path(self, relative_path):
        """Resolve path relative to CWD."""
```

### Phase 3: Tscale Runner (tscale_runner.py)
```python
class TscaleRunner:
    def run(self, audio_file, kernel_params, output_path=None):
        """Run tscale and return data file path."""

    def auto_run(self, audio_file, kernel_params):
        """Auto-run with TRS naming."""
```

### Phase 4: Config Persistence (config_trs.py)
```python
class ConfigTRS:
    def save_kernel(self, params, timestamp=None):
        """Save kernel config to TRS."""

    def save_full(self, state, timestamp=None):
        """Save full app state to TRS."""

    def load_latest(self, type, kind):
        """Load latest config of type/kind."""
```

### Phase 5: Logging (log_trs.py)
```python
class LogTRS:
    def event(self, event_type, data):
        """Log event to TRS."""

    def perf(self, metric, value):
        """Log performance metric."""
```

## Migration Path

### Old System
```python
# Load config from ~/.ascii_scope_snn.toml
config = load_config(get_default_config_path())

# Load data from command line arg
data = load_data_file(sys.argv[1])
```

### New System (TRS)
```python
# Initialize TRS storage
trs = TRSStorage("./db")
cwd_mgr = CWDManager("./db")

# Set working directory
cwd_mgr.set_cwd(os.getcwd())

# Load or generate data
audio_file = "test.wav"
data_record = trs.query(type="data", kind="raw",
                        audio=audio_file.stem).latest()

if not data_record:
    # Auto-run tscale
    runner = TscaleRunner()
    timestamp = int(time.time())
    data_path = runner.auto_run(audio_file, kernel_params)
    # Saves to: ./db/{timestamp}.data.raw.tsv

# Load data
data = load_data_file(data_path)
```

## Benefits

1. **No pre-generation needed** - Run tscale on-demand
2. **Reproducibility** - Kernel params saved with each data generation
3. **Session continuity** - Restore exactly where you left off
4. **Queryable history** - Find all configs, sessions, data for any timestamp
5. **Portable** - Export entire project with `trs_export`
6. **Integration** - Works with tetra ecosystem if TETRA_DIR set

## Questions for User

1. Should we support both `./db/` (local) and `$TETRA_DIR/asnn/db/` (global)?
2. Do you want tscale to run automatically, or require explicit `:reload`?
3. Should we cache tscale output (NumPy arrays) for faster loading?
4. Event log verbosity - log every command, or just major events?
