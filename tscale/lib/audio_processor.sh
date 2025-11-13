#!/usr/bin/env bash
# lib/audio_processor.sh - Interface to tscale binary for audio processing

# Audio processor state
TSCALE_PID=""
TSCALE_FIFO_IN=""
TSCALE_FIFO_OUT=""
AUDIO_INPUT_FILE=""

# Event statistics
EVENT_COUNT=0
EVENT_RATE=0.0
AVG_ENVELOPE=0.0
LAST_EVENT_TIME=0

# Event buffer (last N events for display)
declare -a EVENT_BUFFER=()
MAX_EVENT_BUFFER=100

# Initialize audio processor
# Usage: audio_init [input_file]
audio_init() {
    local input_file=${1:-""}
    AUDIO_INPUT_FILE="$input_file"

    # Create FIFOs for communication
    TSCALE_FIFO_IN="/tmp/tscale_in_$$"
    TSCALE_FIFO_OUT="/tmp/tscale_out_$$"

    mkfifo "$TSCALE_FIFO_IN" 2>/dev/null || true
    mkfifo "$TSCALE_FIFO_OUT" 2>/dev/null || true

    # Note: tscale doesn't actually support live parameter updates
    # We'll need to restart the process when parameters change
}

# Start tscale process with current parameters
# Usage: audio_start <tau_a> <tau_r> <threshold> <refractory> <norm> <mode> <zerophase>
audio_start() {
    local tau_a=$1
    local tau_r=$2
    local threshold=$3
    local refractory=$4
    local norm=$5      # 0=l2, 1=area, 2=none
    local mode=$6      # 0=conv, 1=iir
    local zerophase=$7 # 0=off, 1=on

    # Stop existing process
    audio_stop

    # Convert parameters to tscale format
    local norm_str
    case $(printf "%.0f" "$norm") in
        0) norm_str="l2" ;;
        1) norm_str="area" ;;
        2) norm_str="none" ;;
        *) norm_str="l2" ;;
    esac

    local mode_str
    case $(printf "%.0f" "$mode") in
        0) mode_str="conv" ;;
        1) mode_str="iir" ;;
        *) mode_str="iir" ;;
    esac

    local sym_flag=""
    [[ $(printf "%.0f" "$zerophase") -eq 1 ]] && sym_flag="-sym"

    # Build tscale command
    local tscale_cmd="./tscale -ta $tau_a -tr $tau_r -th $threshold -ref $refractory -norm $norm_str -mode $mode_str $sym_flag"

    # Add input file if specified
    if [[ -n "$AUDIO_INPUT_FILE" && -f "$AUDIO_INPUT_FILE" ]]; then
        tscale_cmd+=" -i $AUDIO_INPUT_FILE"
    fi

    # Start tscale in background, redirect output to FIFO
    eval "$tscale_cmd" > "$TSCALE_FIFO_OUT" 2>/dev/null &
    TSCALE_PID=$!

    # Reset statistics
    EVENT_COUNT=0
    EVENT_RATE=0.0
    AVG_ENVELOPE=0.0
    LAST_EVENT_TIME=0
    EVENT_BUFFER=()
}

# Stop tscale process
audio_stop() {
    if [[ -n "$TSCALE_PID" ]]; then
        kill "$TSCALE_PID" 2>/dev/null || true
        wait "$TSCALE_PID" 2>/dev/null || true
        TSCALE_PID=""
    fi
}

# Read and process tscale output
# Usage: audio_process_output
audio_process_output() {
    # Non-blocking read from FIFO
    if [[ ! -p "$TSCALE_FIFO_OUT" ]]; then
        return
    fi

    # Read available lines (non-blocking)
    while read -t 0.001 line <"$TSCALE_FIFO_OUT" 2>/dev/null; do
        # Parse TSV: t y env evt
        read -r t y env evt <<< "$line"

        # Skip header line
        if [[ "$t" == "t" ]]; then
            continue
        fi

        # Update envelope average (exponential moving average)
        if [[ -n "$env" ]]; then
            AVG_ENVELOPE=$(awk -v curr="$AVG_ENVELOPE" -v new="$env" 'BEGIN {
                alpha = 0.01
                printf "%.6f", curr * (1 - alpha) + new * alpha
            }')
        fi

        # Process event
        if [[ "$evt" == "1" ]]; then
            ((EVENT_COUNT++))

            # Add to event buffer
            EVENT_BUFFER+=("$t")
            if [[ ${#EVENT_BUFFER[@]} -gt $MAX_EVENT_BUFFER ]]; then
                EVENT_BUFFER=("${EVENT_BUFFER[@]:1}")  # Remove oldest
            fi

            # Calculate event rate (events per second in last window)
            if [[ ${#EVENT_BUFFER[@]} -gt 1 ]]; then
                local first_t=${EVENT_BUFFER[0]}
                local last_t=${EVENT_BUFFER[-1]}
                local window=$(awk -v t1="$last_t" -v t0="$first_t" 'BEGIN {printf "%.6f", t1 - t0}')

                if (( $(awk -v w="$window" 'BEGIN {print (w > 0.1)}') )); then
                    EVENT_RATE=$(awk -v n="${#EVENT_BUFFER[@]}" -v w="$window" 'BEGIN {
                        printf "%.2f", n / w
                    }')
                fi
            fi

            LAST_EVENT_TIME=$t
        fi
    done
}

# Get event statistics
# Returns: "count|rate|avg_env|last_time"
audio_get_stats() {
    echo "$EVENT_COUNT|$EVENT_RATE|$AVG_ENVELOPE|$LAST_EVENT_TIME"
}

# Get recent events
# Returns: space-separated list of event times
audio_get_recent_events() {
    echo "${EVENT_BUFFER[@]}"
}

# Cleanup audio processor
audio_cleanup() {
    audio_stop
    rm -f "$TSCALE_FIFO_IN" "$TSCALE_FIFO_OUT" 2>/dev/null || true
}

# Check if audio processor is running
audio_is_running() {
    [[ -n "$TSCALE_PID" ]] && kill -0 "$TSCALE_PID" 2>/dev/null
}

# Restart audio processor with new parameters
# Usage: audio_restart <tau_a> <tau_r> <threshold> <refractory> <norm> <mode> <zerophase>
audio_restart() {
    audio_stop
    sleep 0.1
    audio_start "$@"
}

# Simulate audio processing (for testing without audio file)
# Generates synthetic events based on kernel parameters
audio_simulate() {
    local tau_a=$1
    local tau_r=$2
    local threshold=$3

    # Generate random event with probability based on threshold
    local rand=$((RANDOM % 1000))
    local prob=$(awk -v th="$threshold" 'BEGIN {
        # Lower threshold = higher probability
        p = 1000 * (1.0 / (1.0 + th))
        printf "%.0f", p
    }')

    if [[ $rand -lt $prob ]]; then
        # Simulate event
        local t=$(awk 'BEGIN {srand(); printf "%.6f", rand()}')
        ((EVENT_COUNT++))
        EVENT_BUFFER+=("$t")
        if [[ ${#EVENT_BUFFER[@]} -gt $MAX_EVENT_BUFFER ]]; then
            EVENT_BUFFER=("${EVENT_BUFFER[@]:1}")
        fi

        # Update rate
        if [[ ${#EVENT_BUFFER[@]} -gt 1 ]]; then
            EVENT_RATE=$(awk -v n="${#EVENT_BUFFER[@]}" 'BEGIN {printf "%.2f", n / 10.0}')
        fi
    fi

    # Simulate envelope
    AVG_ENVELOPE=$(awk 'BEGIN {srand(); printf "%.3f", rand() * 0.5}')
}
