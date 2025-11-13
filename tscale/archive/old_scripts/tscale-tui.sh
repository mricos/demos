#!/usr/bin/env bash
# tscale-tui.sh - Tetra TUI for tscale kernel visualization and audio detection
#
# Usage: ./tscale-tui.sh [audio_file.wav]
#
# Controls:
#   ↑/↓     - Select slider/pot
#   ←/→     - Adjust value (fine with Shift)
#   Tab     - Switch between sliders and pots
#   Space   - Toggle component visualization (exp1/exp2)
#   r       - Restart audio processor
#   /       - REPL mode (advanced commands)
#   q       - Quit

# Bootstrap Tetra framework
if [[ -f ~/tetra/tetra.sh ]]; then
    source ~/tetra/tetra.sh
else
    echo "Error: Tetra framework not found at ~/tetra/tetra.sh" >&2
    echo "Please install Tetra or update TETRA_SRC path" >&2
    exit 1
fi

# Source TUI library
if [[ -f "$TETRA_SRC/bash/tui/tui.sh" ]]; then
    source "$TETRA_SRC/bash/tui/tui.sh"
else
    echo "Error: TUI library not found at $TETRA_SRC/bash/tui/tui.sh" >&2
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Source tscale-tui modules
source "$SCRIPT_DIR/lib/equation_renderer.sh"
source "$SCRIPT_DIR/lib/controls.sh"
source "$SCRIPT_DIR/lib/audio_processor.sh"
source "$SCRIPT_DIR/lib/layout.sh"

# Application state
RUNNING=true
SHOW_COMPONENTS=1  # 1=show exp1/exp2, 0=only combined kernel
AUDIO_FILE="${1:-}"
SIMULATION_MODE=false
FRAME_COUNT=0
FPS_ACTUAL=30.0

# Check if tscale binary exists
if [[ ! -f "$SCRIPT_DIR/tscale" ]]; then
    echo "Warning: tscale binary not found. Running in simulation mode."
    SIMULATION_MODE=true
fi

# Main update function (called each frame)
update_frame() {
    # Get current parameters from controls
    local tau_a=$(get_slider_param 0)
    local tau_r=$(get_slider_param 1)
    local threshold=$(get_slider_param 2)
    local refractory=$(get_slider_param 3)
    local norm=$(get_pot_param 4)
    local mode=$(get_pot_param 5)
    local zerophase=$(get_pot_param 6)

    # Process audio output if running
    if ! $SIMULATION_MODE && audio_is_running; then
        audio_process_output
    elif $SIMULATION_MODE; then
        # Simulation mode: generate fake events
        audio_simulate "$tau_a" "$tau_r" "$threshold"
    fi

    # No physics update needed for parameter display
}

# Main render function
render_frame() {
    # Get current parameters
    local tau_a=$(get_slider_param 0)
    local tau_r=$(get_slider_param 1)

    # Get audio statistics
    IFS='|' read -r event_count event_rate avg_env last_time <<< "$(audio_get_stats)"

    # Calculate FPS
    if tui_animation_should_tick; then
        FPS_ACTUAL=$(tui_animation_get_avg_fps)
    fi

    # Render complete frame
    render_frame "$tau_a" "$tau_r" "$SHOW_COMPONENTS" \
        "$event_count" "$event_rate" "$avg_env" "$FPS_ACTUAL" \
        "$SELECTED_MODE"
}

# Handle keyboard input
handle_input() {
    local key=$1

    case "$key" in
        # Navigation
        "$TCURSES_KEY_UP")
            move_selection -1
            ;;
        "$TCURSES_KEY_DOWN")
            move_selection 1
            ;;

        # Adjustment (coarse)
        "$TCURSES_KEY_LEFT")
            adjust_control -1
            restart_audio_if_needed
            ;;
        "$TCURSES_KEY_RIGHT")
            adjust_control 1
            restart_audio_if_needed
            ;;

        # Fine adjustment (Shift + arrows - TODO: detect shift)
        'h'|'H')
            adjust_control -1
            restart_audio_if_needed
            ;;
        'l'|'L')
            adjust_control 1
            restart_audio_if_needed
            ;;
        'j'|'J')
            move_selection 1
            ;;
        'k'|'K')
            move_selection -1
            ;;

        # Mode switching
        "$TCURSES_KEY_TAB")
            toggle_mode
            ;;

        # Visualization toggle
        ' ')  # Space
            if [[ $SHOW_COMPONENTS -eq 1 ]]; then
                SHOW_COMPONENTS=0
            else
                SHOW_COMPONENTS=1
            fi
            ;;

        # Restart audio processor
        'r'|'R')
            restart_audio_processor
            ;;

        # REPL mode (TODO: implement)
        '/')
            # enter_repl_mode
            ;;

        # Help
        '?')
            # show_help
            ;;

        # Quit
        'q'|'Q')
            RUNNING=false
            ;;

        # No key pressed (timeout)
        '')
            # No action
            ;;
    esac
}

# Restart audio processor with current parameters
restart_audio_processor() {
    if $SIMULATION_MODE; then
        return
    fi

    local tau_a=$(get_slider_param 0)
    local tau_r=$(get_slider_param 1)
    local threshold=$(get_slider_param 2)
    local refractory=$(get_slider_param 3)
    local norm=$(get_pot_param 4)
    local mode=$(get_pot_param 5)
    local zerophase=$(get_pot_param 6)

    audio_restart "$tau_a" "$tau_r" "$threshold" "$refractory" \
        "$norm" "$mode" "$zerophase"
}

# Restart audio only if core parameters changed
restart_audio_if_needed() {
    # Only restart for slider changes (s1-s4 affect audio processing)
    if [[ "$SELECTED_MODE" == "sliders" && $SELECTED_INDEX -lt 4 ]]; then
        restart_audio_processor
    fi
}

# Cleanup function
cleanup() {
    audio_cleanup
    tcurses_input_cleanup
    tcurses_screen_cleanup
}

# Main application loop
main() {
    # Initialize TUI (using actual tcurses functions)
    tcurses_screen_init || { echo "Failed to init screen" >&2; exit 1; }
    tcurses_buffer_init
    tcurses_animation_init 30 120  # 30 FPS, 120 BPM
    tcurses_input_init

    trap 'cleanup' EXIT INT TERM

    # Initialize audio processor
    audio_init "$AUDIO_FILE"

    # Start audio processing with default parameters
    if ! $SIMULATION_MODE; then
        local tau_a=$(get_slider_param 0)
        local tau_r=$(get_slider_param 1)
        local threshold=$(get_slider_param 2)
        local refractory=$(get_slider_param 3)
        local norm=$(get_pot_param 4)
        local mode=$(get_pot_param 5)
        local zerophase=$(get_pot_param 6)

        audio_start "$tau_a" "$tau_r" "$threshold" "$refractory" \
            "$norm" "$mode" "$zerophase"
    fi

    # Enable animation tracking
    tcurses_animation_enable

    # Main loop
    while $RUNNING; do
        # Update state
        update_frame
        tcurses_animation_record_frame

        # Render frame
        render_frame

        # Input handling (with frame rate timeout)
        local key=$(tcurses_input_read_key 0.033)  # ~30 FPS

        handle_input "$key"

        ((FRAME_COUNT++))
    done

    # Final cleanup
    cleanup
}

# Run main
main "$@"
