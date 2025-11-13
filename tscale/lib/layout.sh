#!/usr/bin/env bash
# lib/layout.sh - Screen layout management for tscale TUI

# Layout regions
declare -A LAYOUT=(
    [header_start]=0
    [header_height]=1
    [equation_start]=1
    [equation_height]=15
    [controls_start]=16
    [controls_height]=10
    [stats_start]=26
    [stats_height]=3
    [footer_start]=29
    [footer_height]=1
)

# Calculate layout based on terminal size
# Usage: layout_calculate
layout_calculate() {
    local height=$(tcurses_screen_height)
    local width=$(tcurses_screen_width)

    # Minimum sizes
    local min_height=30
    local min_width=80

    if [[ $height -lt $min_height || $width -lt $min_width ]]; then
        # Terminal too small, use minimum layout
        LAYOUT[header_height]=1
        LAYOUT[equation_height]=10
        LAYOUT[controls_height]=8
        LAYOUT[stats_height]=2
        LAYOUT[footer_height]=1
    else
        # Calculate proportional layout
        # Header: 1 line
        LAYOUT[header_height]=1

        # Footer: 2 lines (keybinds + status)
        LAYOUT[footer_height]=2

        # Stats: 3 lines
        LAYOUT[stats_height]=3

        # Remaining space split between equation (60%) and controls (40%)
        local remaining=$((height - LAYOUT[header_height] - LAYOUT[footer_height] - LAYOUT[stats_height]))
        LAYOUT[equation_height]=$(( remaining * 60 / 100 ))
        LAYOUT[controls_height]=$(( remaining * 40 / 100 ))
    fi

    # Calculate start positions
    LAYOUT[header_start]=0
    LAYOUT[equation_start]=$((LAYOUT[header_start] + LAYOUT[header_height]))
    LAYOUT[controls_start]=$((LAYOUT[equation_start] + LAYOUT[equation_height]))
    LAYOUT[stats_start]=$((LAYOUT[controls_start] + LAYOUT[controls_height]))
    LAYOUT[footer_start]=$((LAYOUT[stats_start] + LAYOUT[stats_height]))

    # Store dimensions for easy access
    LAYOUT[width]=$width
    LAYOUT[height]=$height
}

# Get layout value
# Usage: layout_get <key>
layout_get() {
    local key=$1
    echo "${LAYOUT[$key]}"
}

# Render horizontal divider
# Usage: render_divider <line> <char> <width>
render_divider() {
    local line=$1
    local char=${2:-"─"}
    local width=${3:-$(layout_get width)}

    local divider=$(printf "${char}%.0s" $(seq 1 $width))
    tcurses_buffer_write_line $line "$divider"
}

# Render header
# Usage: render_header
render_header() {
    local line=$(layout_get header_start)
    local width=$(layout_get width)

    local title="tscale: Tau-Scale Kernel Visualizer & Audio Detector"
    local padding=$(( (width - ${#title}) / 2 ))

    tcurses_buffer_write_line $line "$(printf "%*s%s" $padding "" "$title")"
}

# Render footer with keybindings
# Usage: render_footer <mode>
render_footer() {
    local mode=${1:-"sliders"}
    local line=$(layout_get footer_start)
    local width=$(layout_get width)

    # Keybindings line
    local keybinds="↑/↓:Select  ←/→:Adjust  Tab:Switch  Space:Toggle  /:REPL  r:Restart  q:Quit"
    tcurses_buffer_write_line $line "$keybinds"

    # Status line
    ((line++))
    local status="Mode: $mode | FPS: 30 | Press ? for help"
    tcurses_buffer_write_line $line "$status"
}

# Render statistics panel
# Usage: render_stats <event_count> <event_rate> <avg_env> <fps>
render_stats() {
    local event_count=$1
    local event_rate=$2
    local avg_env=$3
    local fps=$4

    local line=$(layout_get stats_start)
    local width=$(layout_get width)

    # Divider
    render_divider $line "═"
    ((line++))

    # Statistics
    local stats_line=$(printf "Events: %-6d | Rate: %6.2f Hz | Avg Envelope: %6.3f | FPS: %5.1f" \
        "$event_count" "$event_rate" "$avg_env" "$fps")
    tcurses_buffer_write_line $line "$stats_line"

    ((line++))
    render_divider $line "─"
}

# Render equation panel wrapper
# Usage: render_equation_panel_wrapper <tau_a> <tau_r> <show_components>
render_equation_panel_wrapper() {
    local tau_a=$1
    local tau_r=$2
    local show_components=${3:-1}

    local start=$(layout_get equation_start)
    local height=$(layout_get equation_height)
    local width=$(layout_get width)

    # Render equation content into buffer starting at the right line
    # We need to capture the equation renderer output and write line by line
    local temp_file="/tmp/tscale_eq_$$"
    render_equation_panel "$tau_a" "$tau_r" "$width" "$height" "$show_components" > "$temp_file"

    local line=$start
    while IFS= read -r output_line; do
        tcurses_buffer_write_line $line "$output_line"
        ((line++))
        if [[ $line -ge $((start + height)) ]]; then
            break
        fi
    done < "$temp_file"

    rm -f "$temp_file"
}

# Render controls panel wrapper
# Usage: render_controls_panel_wrapper
render_controls_panel_wrapper() {
    local start=$(layout_get controls_start)
    local height=$(layout_get controls_height)
    local width=$(layout_get width)

    # Divider
    render_divider $start "═"
    local line=$((start + 1))

    # Calculate column layout (sliders left, pots right)
    local col_width=$((width / 2))

    # Section headers
    local sliders_header="SLIDERS (s1-s8)"
    local pots_header="POTS (p1-p8)"

    tcurses_buffer_write_line $line "$(printf "%-${col_width}s%s" "$sliders_header" "$pots_header")"
    ((line++))

    # Render sliders and pots side-by-side
    for i in {0..7}; do
        # Get slider info
        local slider_def="${SLIDER_PARAMS[$i]}"
        IFS='|' read -r s_name s_min s_max s_scale s_label <<< "$slider_def"
        local s_cc=${SLIDERS[$i]}
        local s_value=$(get_slider_param $i)
        local s_formatted=$(format_param_value "$s_value" "$s_name")
        local s_bar=$(render_slider_bar $s_cc 10)
        local s_indicator="  "
        [[ "$SELECTED_MODE" == "sliders" && $SELECTED_INDEX -eq $i ]] && s_indicator="▶ "

        # Get pot info
        local pot_def="${POT_PARAMS[$i]}"
        IFS='|' read -r p_name p_min p_max p_scale p_label <<< "$pot_def"
        local p_cc=${POTS[$i]}
        local p_value=$(get_pot_param $i)
        local p_formatted=$(format_param_value "$p_value" "$p_name")
        local p_indicator_bar=$(render_pot_indicator $p_cc 10)
        local p_indicator="  "
        [[ "$SELECTED_MODE" == "pots" && $SELECTED_INDEX -eq $i ]] && p_indicator="▶ "

        # Format output for two columns
        local slider_col=$(printf "%ss%d %-4s %s %-10s" "$s_indicator" $((i+1)) "$s_label" "$s_bar" "$s_formatted")
        local pot_col=$(printf "%sp%d %-6s %s %-10s" "$p_indicator" $((i+1)) "$p_label" "$p_indicator_bar" "$p_formatted")

        tcurses_buffer_write_line $line "$(printf "%-${col_width}s%s" "$slider_col" "$pot_col")"
        ((line++))

        if [[ $line -ge $((start + height)) ]]; then
            break
        fi
    done
}

# Render complete frame
# Usage: render_frame <params_hash>
render_frame() {
    # Parse parameters
    local tau_a=${1:-0.002}
    local tau_r=${2:-0.010}
    local show_components=${3:-1}
    local event_count=${4:-0}
    local event_rate=${5:-0.0}
    local avg_env=${6:-0.0}
    local fps=${7:-30.0}
    local mode=${8:-"sliders"}

    # Calculate layout
    layout_calculate

    # Clear buffer
    tcurses_buffer_clear

    # Render sections
    render_header
    render_equation_panel_wrapper "$tau_a" "$tau_r" "$show_components"
    render_controls_panel_wrapper
    render_stats "$event_count" "$event_rate" "$avg_env" "$fps"
    render_footer "$mode"

    # Render to screen
    tcurses_buffer_render_diff
}

# Show help overlay
render_help() {
    local height=$(tcurses_screen_height)
    local width=$(tcurses_screen_width)

    # Calculate centered box
    local box_width=60
    local box_height=20
    local start_x=$(( (width - box_width) / 2 ))
    local start_y=$(( (height - box_height) / 2 ))

    # This would need to overlay on current screen
    # For now, just show as message in footer
    tcurses_buffer_write_line $((height - 1)) "Help: Arrow keys navigate, Space toggles components, Tab switches mode, / for REPL"
}
