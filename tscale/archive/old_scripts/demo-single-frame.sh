#!/usr/bin/env bash
# demo-single-frame.sh - Render a single frame without interactive mode
# This demonstrates the rendering system works

cd "$(dirname "$0")"

# Load modules
source ~/tetra/tetra.sh 2>/dev/null
source "$TETRA_SRC/bash/tui/tui.sh" 2>/dev/null
source lib/equation_renderer.sh
source lib/controls.sh
source lib/audio_processor.sh
source lib/layout.sh

# Initialize without TTY (just for buffer/animation)
_TCURSES_HEIGHT=40
_TCURSES_WIDTH=120
_TCURSES_BUFFER_HEIGHT=40
_TCURSES_BUFFER_WIDTH=120
tcurses_buffer_init 40 120
tcurses_animation_init 30 120

# Set some interesting parameters
SLIDERS[0]=45   # tau_a = ~1.0ms
SLIDERS[1]=55   # tau_r = ~20ms
SLIDERS[2]=50   # threshold = ~3.0σ
SLIDERS[3]=60   # refractory = ~15ms

# Get parameter values
tau_a=$(get_slider_param 0)
tau_r=$(get_slider_param 1)

echo "=========================================="
echo "tscale TUI - Single Frame Render Demo"
echo "=========================================="
echo ""
echo "Parameters:"
echo "  tau_a = $(format_param_value "$tau_a" "tau_a")"
echo "  tau_r = $(format_param_value "$tau_r" "tau_r")"
echo ""
echo "Rendering frame..."
echo ""

# Render a frame
render_frame "$tau_a" "$tau_r" 1 0 0.0 0.0 30.0 "sliders"

# Output the back buffer
echo "=========================================="
echo "RENDERED OUTPUT:"
echo "=========================================="
for ((i=0; i<40; i++)); do
    line="${_TCURSES_BACK_BUFFER[$i]:-}"
    echo "$line"
done

echo ""
echo "=========================================="
echo "Demo complete!"
echo ""
echo "To run the full interactive TUI:"
echo "  ./tscale-tui.sh"
echo ""
echo "This requires a real terminal with TTY."
echo "=========================================="
