## Updated Design with .snn Directory

Perfect! We'll use a dual-directory structure:

### Directory Structure

```
project-dir/                     # User's project (audio files, etc.)
├── .snn/                        # Local metadata (like .git/)
│   ├── config                   # Local config overrides (JSON)
│   ├── session                  # Last session state (JSON)
│   ├── cwd                      # Current working directory pointer
│   └── cache/                   # Cached data (NumPy arrays, etc.)
│       └── 1730745600.npy       # Cached processed data
├── db/                          # TRS canonical storage
│   ├── 1730745600.data.raw.tsv
│   ├── 1730745600.audio.source.wav
│   ├── 1730745600.config.kernel.toml
│   └── 1730745601.log.event.jsonl
└── audio/                       # User's audio files (not managed)
    └── test.wav
```

### `.snn/` Directory Contents

| File | Purpose | Format |
|------|---------|--------|
| `config` | Local config overrides | JSON |
| `session` | Last session state (position, markers, etc.) | JSON |
| `cwd` | Current working directory path | Plain text |
| `cache/` | Cached NumPy arrays for fast loading | Binary |

### Project Discovery

Like `.git`, searches upward from cwd:

```python
# Start in /path/to/project/subdir/
project = SNNProject()  # Searches upward for .snn/
# Finds: /path/to/project/.snn/
# Uses: /path/to/project/ as project root
```

### Benefits

1. **Clean separation**:
   - `.snn/` = mutable state (config, session, cache)
   - `db/` = immutable records (timestamped data)

2. **Project portability**:
   - `.snn/` can be gitignored (local state)
   - `db/` can be committed (reproducible data)

3. **Fast startup**:
   - Load session from `.snn/session` (no TRS query needed)
   - Cache NumPy arrays in `.snn/cache/`

4. **Multi-user**:
   - Each user has own `.snn/` state
   - Shared `db/` records

### Example Session Flow

```python
# 1. Initialize project
project = SNNProject()  # Finds or creates .snn/

# 2. Load last session
session = project.load_session_state()
if session:
    position = session['position']
    markers = session['markers']

# 3. Load or generate data
from .tscale_runner import TscaleRunner
runner = TscaleRunner(project.trs)
data_path = runner.find_or_generate("audio/test.wav", kernel_params)

# 4. On exit, save session
project.save_session_state({
    'timestamp': int(time.time()),
    'position': transport.position,
    'markers': [m.__dict__ for m in markers.all()],
    'kernel_params': kernel_params.__dict__,
})
```

### Files Created

1. `ascii_scope_snn/trs.py` - TRS storage layer ✓
2. `ascii_scope_snn/cwd_manager.py` - CWD tracking ✓
3. `ascii_scope_snn/tscale_runner.py` - Auto-tscale ✓
4. `ascii_scope_snn/project.py` - Project manager with .snn ✓

Next: Integrate into main.py!
