#!/usr/bin/env bash
# test-equation-render.sh - Standalone test for equation renderer

# Source the equation renderer
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/lib/equation_renderer.sh"

# Test parameters
TAU_A=0.002  # 2ms
TAU_R=0.010  # 10ms
WIDTH=80
HEIGHT=15

echo "Testing biexponential kernel renderer"
echo "======================================"
echo ""
echo "Parameters:"
echo "  tau_a = ${TAU_A}s ($(awk -v t="$TAU_A" 'BEGIN {printf "%.1f", t*1000}')ms)"
echo "  tau_r = ${TAU_R}s ($(awk -v t="$TAU_R" 'BEGIN {printf "%.1f", t*1000}')ms)"
echo ""
echo "Output:"
echo ""

# Render equation panel
render_equation_panel "$TAU_A" "$TAU_R" "$WIDTH" "$HEIGHT" 1

echo ""
echo "Test complete!"
