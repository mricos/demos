# How to Run tscale-tui

## Important: Interactive Terminal Required

The tscale TUI application **must be run in an interactive terminal** with a proper TTY. It cannot be run through:
- Remote execution tools
- Non-interactive shells
- Pipes or redirects

## Running the Application

### Method 1: Direct Execution (Recommended)
Open your terminal and run:
```bash
cd /Users/mricos/src/mricos/demos/tscale
./tscale-tui.sh
```

### Method 2: With Audio File
```bash
./tscale-tui.sh drummer.mp4
```

### Method 3: Testing Components (No TTY Required)
You can test individual components without a TTY:
```bash
# Test equation renderer
./test-equation-render.sh

# Test controls
./test-controls.sh
```

## Why It Doesn't Work Via Remote Execution

The TUI system uses `tcurses_screen_init()` which:
1. Calls `stty -g` to save terminal state
2. Requires `/dev/tty` access
3. Needs raw terminal input mode
4. Uses alternate screen buffer

These features only work in interactive terminals with a proper TTY device.

## Expected Behavior When Running

When you run `./tscale-tui.sh` in your terminal, you should see:

1. **Screen clears** and enters alternate buffer
2. **Header** displays: "tscale: Tau-Scale Kernel Visualizer & Audio Detector"
3. **Equation panel** shows the biexponential kernel plot
4. **Controls panel** shows 8 sliders + 8 pots
5. **Stats panel** shows events, rate, envelope, FPS
6. **Footer** shows keyboard shortcuts

## Controls

Once running:
- `↑`/`↓` - Navigate controls
- `←`/`→` - Adjust values
- `Tab` - Switch between sliders and pots
- `Space` - Toggle component visualization
- `q` - Quit

## Troubleshooting

### "tcurses_screen: failed to save terminal state"
**Cause**: Not running in interactive terminal
**Solution**: Run directly in your terminal emulator, not via remote execution

### "Tetra framework not found"
**Cause**: Tetra not installed or `TETRA_SRC` not set
**Solution**:
```bash
export TETRA_SRC=~/src/devops/tetra
source ~/tetra/tetra.sh
```

### Terminal shows garbled output
**Cause**: Script crashed without cleanup
**Solution**:
```bash
reset  # Reset terminal
# or
stty sane  # Restore sane terminal settings
```

### "tscale binary not found"
**This is OK!** The app will run in simulation mode and generate fake events for testing.

To enable real audio processing:
```bash
clang -std=c11 -O3 -o tscale tscale.c -lm
```

## Verification

To verify the application is set up correctly without running it:

```bash
# Check all files exist
ls -l tscale-tui.sh lib/*.sh

# Check execute permission
test -x tscale-tui.sh && echo "Executable: OK" || chmod +x tscale-tui.sh

# Test component modules
./test-equation-render.sh
./test-controls.sh

# Check Tetra is available
source ~/tetra/tetra.sh && echo "Tetra: OK"
source "$TETRA_SRC/bash/tui/tui.sh" && echo "TUI: OK"
```

All these should complete successfully.

## Next Steps

1. Open a **real terminal** (Terminal.app, iTerm2, etc.)
2. Navigate to the tscale directory
3. Run `./tscale-tui.sh`
4. Use keyboard controls to adjust parameters
5. Watch the kernel visualization change in real-time!

---

**The application is ready to run - it just needs an interactive terminal with TTY access.**
