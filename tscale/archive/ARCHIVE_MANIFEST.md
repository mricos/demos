# Archive Manifest

This archive contains old implementations and experiments from the tscale project,
preserved for reference before the ascii_scope_snn refactoring.

## Directory Structure

- **old_implementations/**: Old ASCII scope implementations (Python, C, Lua)
- **old_scripts/**: Shell scripts and utilities
- **old_docs/**: Old documentation and notes
- **old_binaries/**: Compiled executables

## Archived Date

November 4, 2024

## Reason for Archiving

Project refactored from monolithic ascii_scope_snn.py (800 lines) into modular
ascii_scope_snn/ package (2400+ lines, 20+ modules).

See REFACTORING_COMPLETE.md in parent directory for details.

## Files Archived

### Old Implementations
- ascii_scope_snn.py - Monolithic version (replaced by ascii_scope_snn/)
- ascii_scope.py - Earlier Python version
- ascii_scope.c - C implementation
- ascii_scope.lua - Lua implementation
- ascii_scope (executable) - Compiled C version
- bb.c / bb (executable) - Experimental implementation

### Old Scripts
- ascii_scope.sh - Shell wrapper
- colscope.sh - Column-based scope script
- run_scope_live.sh - Live scope launcher
- rate_limiter.py - Utility script
- test-*.sh - Old test scripts
- tscale-tui.sh - Old TUI script
- demo-single-frame.sh - Demo script

### Old Documentation
- README-TUI.md - Old TUI documentation
- IMPLEMENTATION_SUMMARY.md - Old implementation notes
- RUN_INSTRUCTIONS.md - Old run instructions
- FILES_CREATED.txt - File listing
- tscale-midi-map.txt - MIDI mapping notes
- fix.patch - Old patch file

## Current Active Files (NOT archived)

### Core Implementation
- tscale.c - Core dual-tau algorithm
- tscale (executable) - Compiled tscale
- miniaudio.h - Audio library header

### New Modular System
- ascii_scope_snn/ - New modular package (20+ files)
- test_scope.py - Comprehensive test suite

### Documentation
- REFACTORING_COMPLETE.md - Refactoring summary
- QUICKSTART.md - Quick start guide
- ascii_scope_snn/README.md - Full documentation
- ascii_scope_snn/MIGRATION.md - Migration guide

### Data Files
- audio.wav - Test audio
- tscale.out.txt - tscale output
- drummer.mp4 - Video file

### Other
- lib/ - Dependencies
- youtube/ - YouTube-related files
