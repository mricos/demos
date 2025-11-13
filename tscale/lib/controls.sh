#!/usr/bin/env bash
# lib/controls.sh - MIDI controller visualization (sliders and pots)

# Global control state (MIDI CC values 0-127)
declare -a SLIDERS=(64 64 64 64 64 64 64 64)  # s1-s8
declare -a POTS=(64 64 64 64 64 64 64 64)     # p1-p8

# Control selection state
SELECTED_MODE="sliders"  # or "pots"
SELECTED_INDEX=0

# Slider parameter definitions
declare -A SLIDER_PARAMS=(
    [0]="tau_a|0.0001|0.010|log|τₐ"      # s1: 0.1ms - 10ms
    [1]="tau_r|0.001|0.100|log|τᵣ"       # s2: 1ms - 100ms
    [2]="threshold|0.1|10.0|linear|thr"   # s3: 0.1 - 10.0 sigma
    [3]="refractory|0.001|0.100|log|ref"  # s4: 1ms - 100ms
    [4]="zoom|0.5|5.0|linear|zoom"        # s5: visualization zoom
    [5]="history|1.0|10.0|linear|hist"    # s6: event history seconds
    [6]="blend|0.0|1.0|linear|blend"      # s7: component blend
    [7]="reserved|0.0|1.0|linear|res"     # s8: reserved
)

# Pot parameter definitions
declare -A POT_PARAMS=(
    [0]="fine_tau_a|-0.001|0.001|linear|±τₐ"    # p1: fine-tune tau_a
    [1]="fine_tau_r|-0.010|0.010|linear|±τᵣ"    # p2: fine-tune tau_r
    [2]="fine_thr|-0.5|0.5|linear|±thr"         # p3: fine-tune threshold
    [3]="fine_ref|-0.005|0.005|linear|±ref"     # p4: fine-tune refractory
    [4]="norm|0|2|enum|norm"                     # p5: normalization (l2/area/none)
    [5]="mode|0|1|enum|mode"                     # p6: mode (conv/iir)
    [6]="zerophase|0|1|enum|zph"                 # p7: zero-phase on/off
    [7]="theme|0|3|enum|theme"                   # p8: color theme
)

# Convert MIDI CC value (0-127) to parameter range
# Usage: cc_to_param <cc_value> <min> <max> <scale_type>
cc_to_param() {
    local cc=$1
    local min=$2
    local max=$3
    local scale=$4

    awk -v cc="$cc" -v mn="$min" -v mx="$max" -v scale="$scale" 'BEGIN {
        normalized = cc / 127.0
        if (scale == "log") {
            # Logarithmic scaling
            log_min = log(mn)
            log_max = log(mx)
            value = exp(log_min + normalized * (log_max - log_min))
        } else if (scale == "enum") {
            # Discrete values
            num_values = int(mx - mn + 1)
            idx = int(normalized * num_values)
            if (idx >= num_values) idx = num_values - 1
            value = mn + idx
        } else {
            # Linear scaling
            value = mn + normalized * (mx - mn)
        }
        printf "%.6f", value
    }'
}

# Convert parameter value back to CC (for display)
# Usage: param_to_cc <param_value> <min> <max> <scale_type>
param_to_cc() {
    local value=$1
    local min=$2
    local max=$3
    local scale=$4

    awk -v v="$value" -v mn="$min" -v mx="$max" -v scale="$scale" 'BEGIN {
        if (scale == "log") {
            log_min = log(mn)
            log_max = log(mx)
            log_v = log(v)
            normalized = (log_v - log_min) / (log_max - log_min)
        } else if (scale == "enum") {
            num_values = int(mx - mn + 1)
            normalized = (v - mn) / (mx - mn)
        } else {
            normalized = (v - mn) / (mx - mn)
        }
        cc = int(normalized * 127)
        if (cc < 0) cc = 0
        if (cc > 127) cc = 127
        printf "%d", cc
    }'
}

# Get current parameter value for a slider
# Usage: get_slider_param <index>
get_slider_param() {
    local index=$1
    local param_def="${SLIDER_PARAMS[$index]}"
    IFS='|' read -r name min max scale label <<< "$param_def"

    local cc=${SLIDERS[$index]}
    cc_to_param "$cc" "$min" "$max" "$scale"
}

# Get current parameter value for a pot
get_pot_param() {
    local index=$1
    local param_def="${POT_PARAMS[$index]}"
    IFS='|' read -r name min max scale label <<< "$param_def"

    local cc=${POTS[$index]}
    cc_to_param "$cc" "$min" "$max" "$scale"
}

# Format parameter value for display
# Usage: format_param_value <value> <param_name>
format_param_value() {
    local value=$1
    local param_name=$2

    case "$param_name" in
        tau_a|tau_r|fine_tau_a|fine_tau_r|refractory|fine_ref)
            # Time values: show in ms
            awk -v v="$value" 'BEGIN {printf "%.2fms", v * 1000}'
            ;;
        threshold|fine_thr)
            # Sigma units
            awk -v v="$value" 'BEGIN {printf "%.2fσ", v}'
            ;;
        norm)
            local norm_idx=$(printf "%.0f" "$value")
            case $norm_idx in
                0) echo "L2" ;;
                1) echo "area" ;;
                2) echo "none" ;;
            esac
            ;;
        mode)
            local mode_idx=$(printf "%.0f" "$value")
            case $mode_idx in
                0) echo "conv" ;;
                1) echo "IIR" ;;
            esac
            ;;
        zerophase)
            local zph_idx=$(printf "%.0f" "$value")
            [[ $zph_idx -eq 1 ]] && echo "ON" || echo "OFF"
            ;;
        theme)
            local theme_idx=$(printf "%.0f" "$value")
            case $theme_idx in
                0) echo "default" ;;
                1) echo "neon" ;;
                2) echo "warm" ;;
                3) echo "tokyo" ;;
            esac
            ;;
        *)
            # Default: 2 decimal places
            awk -v v="$value" 'BEGIN {printf "%.2f", v}'
            ;;
    esac
}

# Render a vertical slider bar
# Usage: render_slider_bar <cc_value> <width>
render_slider_bar() {
    local cc=$1
    local width=${2:-10}

    local filled=$(( cc * width / 127 ))
    local empty=$((width - filled))

    printf "["
    printf '█%.0s' $(seq 1 $filled)
    printf '░%.0s' $(seq 1 $empty)
    printf "]"
}

# Render a pot (rotary control) indicator
# Usage: render_pot_indicator <cc_value> <width>
render_pot_indicator() {
    local cc=$1
    local width=${2:-10}

    local filled=$(( cc * width / 127 ))
    local empty=$((width - filled))

    printf "["
    printf '○%.0s' $(seq 1 $filled)
    printf '●%.0s' $(seq 1 $empty)
    printf "]"
}

# Render all sliders
# Usage: render_sliders <start_line>
render_sliders() {
    local start_line=$1
    local line=$start_line

    for i in {0..7}; do
        local param_def="${SLIDER_PARAMS[$i]}"
        IFS='|' read -r name min max scale label <<< "$param_def"

        local cc=${SLIDERS[$i]}
        local value=$(get_slider_param $i)
        local formatted=$(format_param_value "$value" "$name")
        local bar=$(render_slider_bar $cc 10)

        # Selection indicator
        local indicator="  "
        if [[ "$SELECTED_MODE" == "sliders" && $SELECTED_INDEX -eq $i ]]; then
            indicator="▶ "
        fi

        local output=$(printf "%ss%d %-4s %s %-10s CC:%3d" "$indicator" $((i+1)) "$label" "$bar" "$formatted" "$cc")
        tui_buffer_write_line $line "$output"
        ((line++))
    done
}

# Render all pots
# Usage: render_pots <start_line>
render_pots() {
    local start_line=$1
    local line=$start_line

    for i in {0..7}; do
        local param_def="${POT_PARAMS[$i]}"
        IFS='|' read -r name min max scale label <<< "$param_def"

        local cc=${POTS[$i]}
        local value=$(get_pot_param $i)
        local formatted=$(format_param_value "$value" "$name")
        local indicator=$(render_pot_indicator $cc 10)

        # Selection indicator
        local sel_indicator="  "
        if [[ "$SELECTED_MODE" == "pots" && $SELECTED_INDEX -eq $i ]]; then
            sel_indicator="▶ "
        fi

        local output=$(printf "%sp%d %-6s %s %-10s CC:%3d" "$sel_indicator" $((i+1)) "$label" "$indicator" "$formatted" "$cc")
        tui_buffer_write_line $line "$output"
        ((line++))
    done
}

# Adjust selected control
# Usage: adjust_control <delta>  # delta is +/- CC units
adjust_control() {
    local delta=$1

    if [[ "$SELECTED_MODE" == "sliders" ]]; then
        local current=${SLIDERS[$SELECTED_INDEX]}
        local new=$((current + delta))
        [[ $new -lt 0 ]] && new=0
        [[ $new -gt 127 ]] && new=127
        SLIDERS[$SELECTED_INDEX]=$new
    else
        local current=${POTS[$SELECTED_INDEX]}
        local new=$((current + delta))
        [[ $new -lt 0 ]] && new=0
        [[ $new -gt 127 ]] && new=127
        POTS[$SELECTED_INDEX]=$new
    fi
}

# Move selection up/down
move_selection() {
    local delta=$1
    SELECTED_INDEX=$((SELECTED_INDEX + delta))

    [[ $SELECTED_INDEX -lt 0 ]] && SELECTED_INDEX=0
    [[ $SELECTED_INDEX -gt 7 ]] && SELECTED_INDEX=7
}

# Toggle between sliders and pots
toggle_mode() {
    if [[ "$SELECTED_MODE" == "sliders" ]]; then
        SELECTED_MODE="pots"
    else
        SELECTED_MODE="sliders"
    fi
    SELECTED_INDEX=0
}

# Get all parameter values as associative array
# Usage: declare -A params=$(get_all_params)
get_all_params() {
    declare -A params

    # Get slider params
    for i in {0..7}; do
        local param_def="${SLIDER_PARAMS[$i]}"
        IFS='|' read -r name min max scale label <<< "$param_def"
        params[$name]=$(get_slider_param $i)
    done

    # Get pot params
    for i in {0..7}; do
        local param_def="${POT_PARAMS[$i]}"
        IFS='|' read -r name min max scale label <<< "$param_def"
        params[$name]=$(get_pot_param $i)
    done

    # Print for capture
    for key in "${!params[@]}"; do
        echo "$key=${params[$key]}"
    done
}
