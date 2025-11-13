#!/bin/bash
# run_scope_live.sh - Launch DAW-style SNN scope with live kernel reprocessing
# Usage: ./run_scope_live.sh input.wav

if [ $# -lt 1 ]; then
    echo "Usage: $0 input.wav"
    echo "  input.wav       - Audio file to process (wav/mp3)"
    echo ""
    echo "Example:"
    echo "  $0 test.wav"
    exit 1
fi

INPUT="$1"

if [ ! -f "$INPUT" ]; then
    echo "Error: Input file '$INPUT' not found"
    exit 1
fi

if [ ! -f "./tscale" ]; then
    echo "Error: tscale binary not found. Compile with:"
    echo "  clang -std=c11 -O3 -o tscale tscale.c -lm"
    exit 1
fi

# Process initial data with default parameters
echo "Processing $INPUT with default kernel..."
./tscale -i "$INPUT" -ta 0.001 -tr 0.005 -th 3.0 -ref 0.015 -norm l2 -sym -mode iir -o tscale.out.txt

if [ $? -ne 0 ]; then
    echo "Error: tscale processing failed"
    exit 1
fi

echo "Launching DAW-style scope..."
echo "Controls:"
echo "  SPACE     - Play/Pause"
echo "  ←/→       - Scrub (1%)"
echo "  HOME/END  - Jump to start/end"
echo "  h or ?    - Show full help"
echo "  K         - Reprocess with new kernel parameters"
echo ""

# Launch scope directly with data file and audio input
python3 ascii_scope_snn.py tscale.out.txt "$INPUT"
