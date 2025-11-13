# ASCII Scope SNN - Quick Start Guide

## 5-Minute Start

### 1. Test Installation (30 seconds)
```bash
cd /Users/mricos/src/mricos/demos/tscale
python test_scope.py
```

Expected output: `✓ All tests passed!`

### 2. Launch Application
```bash
python -m ascii_scope_snn.main tscale.out.txt
```

### 3. Essential Keys

- `?` - Help
- `q` - Quit
- `Space` - Play/Pause
- `←/→` - Scrub
- `:` - CLI mode
- `m` - Create marker

### 4. Try Multi-Page

Press: `1` `2` `3` to enable Oscilloscope, CLI, and Statistics pages.

### 5. Try CLI Commands

Press `:` then try:
```
:help
:zoom 2.0
:mark test1
:tau_a 0.0015
```

Press `ESC` to exit CLI mode.

## Quick Reference

**Transport**: Space, ←/→, Home/End  
**Zoom**: </> or ,/.  
**Pages**: 1-5 toggle  
**CLI**: : to enter, ESC to exit  
**Help**: ?  

See `ascii_scope_snn/README.md` for full documentation.
