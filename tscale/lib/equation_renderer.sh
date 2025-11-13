#!/usr/bin/env bash
# lib/equation_renderer.sh - Biexponential kernel equation renderer

# Render the equation k(t) = exp(-t/τr) - exp(-t/τa) with ASCII/UTF-8 art
# Shows exp1, exp2, and combined kernel in different styles

# Calculate exponential kernel values
# Usage: calc_exp_kernel <t> <tau>
calc_exp_kernel() {
    local t=$1
    local tau=$2
    awk -v t="$t" -v tau="$tau" 'BEGIN {
        if (tau <= 0) tau = 0.001
        printf "%.6f", exp(-t/tau)
    }'
}

# Calculate biexponential kernel at time t
# Usage: calc_biexp_kernel <t> <tau_a> <tau_r>
calc_biexp_kernel() {
    local t=$1
    local tau_a=$2
    local tau_r=$3
    awk -v t="$t" -v ta="$tau_a" -v tr="$tau_r" 'BEGIN {
        if (ta <= 0) ta = 0.001
        if (tr <= 0) tr = 0.001
        exp_r = exp(-t/tr)
        exp_a = exp(-t/ta)
        printf "%.6f", exp_r - exp_a
    }'
}

# Find peak time and value of biexponential kernel
# Peak occurs at: t_peak = (τa * τr) / (τr - τa) * ln(τr/τa)
calc_kernel_peak() {
    local tau_a=$1
    local tau_r=$2
    awk -v ta="$tau_a" -v tr="$tau_r" 'BEGIN {
        if (ta <= 0) ta = 0.001
        if (tr <= 0) tr = 0.001
        if (tr <= ta) tr = ta + 0.001
        t_peak = (ta * tr) / (tr - ta) * log(tr/ta)
        exp_r = exp(-t_peak/tr)
        exp_a = exp(-t_peak/ta)
        k_peak = exp_r - exp_a
        printf "%.6f %.6f", t_peak, k_peak
    }'
}

# Normalize value to screen coordinates
# Usage: normalize_to_screen <value> <min> <max> <height>
normalize_to_screen() {
    local value=$1
    local min=$2
    local max=$3
    local height=$4
    awk -v v="$value" -v mn="$min" -v mx="$max" -v h="$height" 'BEGIN {
        if (mx <= mn) mx = mn + 1
        normalized = (v - mn) / (mx - mn)
        screen_y = int((1 - normalized) * (h - 1))
        if (screen_y < 0) screen_y = 0
        if (screen_y >= h) screen_y = h - 1
        printf "%d", screen_y
    }'
}

# Render equation header with current parameter values
# Usage: render_equation_header <tau_a> <tau_r> <width>
render_equation_header() {
    local tau_a=$1
    local tau_r=$2
    local width=$3

    # Convert to ms for display
    local tau_a_ms=$(awk -v t="$tau_a" 'BEGIN {printf "%.2f", t * 1000}')
    local tau_r_ms=$(awk -v t="$tau_r" 'BEGIN {printf "%.2f", t * 1000}')

    # Center the equation
    local eq="k(t) = exp(-t/τᵣ) - exp(-t/τₐ)    [τₐ=${tau_a_ms}ms, τᵣ=${tau_r_ms}ms]"
    local eq_len=${#eq}
    local padding=$(( (width - eq_len) / 2 ))

    printf "%*s%s\n" $padding "" "$eq"
}

# Render the kernel curve plot
# Usage: render_kernel_plot <tau_a> <tau_r> <width> <height> <show_components>
render_kernel_plot() {
    local tau_a=$1
    local tau_r=$2
    local width=$3
    local height=$4
    local show_components=${5:-1}  # 1=show exp1/exp2, 0=only combined

    # Calculate time domain (0 to ~5*tau_r or until kernel < 0.01)
    local t_max=$(awk -v tr="$tau_r" 'BEGIN {printf "%.6f", tr * 5}')

    # Find peak for scaling
    read -r t_peak k_peak <<< "$(calc_kernel_peak "$tau_a" "$tau_r")"

    # Scale y-axis from -k_peak*0.2 to k_peak*1.2 (give room for components)
    local y_min=$(awk -v k="$k_peak" 'BEGIN {printf "%.6f", k * -0.2}')
    local y_max=$(awk -v k="$k_peak" 'BEGIN {printf "%.6f", k * 1.2}')

    # Initialize plot buffer (2D array simulation)
    declare -A plot_buffer

    # Sample kernel at each x position
    for ((x=0; x<width; x++)); do
        local t=$(awk -v x="$x" -v w="$width" -v tmax="$t_max" 'BEGIN {
            printf "%.6f", (x / (w - 1)) * tmax
        }')

        # Calculate values
        local exp_r=$(calc_exp_kernel "$t" "$tau_r")
        local exp_a=$(calc_exp_kernel "$t" "$tau_a")
        local k=$(calc_biexp_kernel "$t" "$tau_a" "$tau_r")

        # Convert to screen coordinates
        local y_exp_r=$(normalize_to_screen "$exp_r" "$y_min" "$y_max" "$height")
        local y_exp_a=$(normalize_to_screen "$exp_a" "$y_min" "$y_max" "$height")
        local y_k=$(normalize_to_screen "$k" "$y_min" "$y_max" "$height")

        # Mark positions in buffer
        if [[ $show_components -eq 1 ]]; then
            plot_buffer[$y_exp_r,$x]="exp_r"
            plot_buffer[$y_exp_a,$x]="exp_a"
        fi
        plot_buffer[$y_k,$x]="kernel"
    done

    # Find zero line
    local zero_y=$(normalize_to_screen 0 "$y_min" "$y_max" "$height")

    # Render the plot
    for ((y=0; y<height; y++)); do
        local line=""
        for ((x=0; x<width; x++)); do
            local cell="${plot_buffer[$y,$x]}"
            if [[ "$cell" == "kernel" ]]; then
                # Combined kernel in bright color
                line+="█"
            elif [[ "$cell" == "exp_r" ]]; then
                # exp(-t/tau_r) in grey
                line+="░"
            elif [[ "$cell" == "exp_a" ]]; then
                # exp(-t/tau_a) in grey
                line+="▓"
            elif [[ $y -eq $zero_y ]]; then
                # Zero line
                line+="─"
            else
                line+=" "
            fi
        done
        echo "$line"
    done

    # Render time axis
    local axis_line=""
    for ((x=0; x<width; x++)); do
        local t=$(awk -v x="$x" -v w="$width" -v tmax="$t_max" 'BEGIN {
            printf "%.6f", (x / (w - 1)) * tmax
        }')

        # Mark at regular intervals
        if (( x % (width / 5) == 0 )); then
            local t_ms=$(awk -v t="$t" 'BEGIN {printf "%.1f", t * 1000}')
            axis_line+="┴"
        else
            axis_line+="─"
        fi
    done
    echo "└${axis_line}┘"

    # Render time labels
    local label_line=""
    local label_width=$((width / 5))
    for ((i=0; i<=5; i++)); do
        local t=$(awk -v i="$i" -v tmax="$t_max" 'BEGIN {printf "%.6f", (i / 5.0) * tmax}')
        local t_ms=$(awk -v t="$t" 'BEGIN {printf "%.1f", t * 1000}')
        label_line+=$(printf "%-${label_width}s" "${t_ms}ms")
    done
    echo "$label_line"
}

# Render legend for the plot
render_kernel_legend() {
    echo "Legend: █ k(t) combined   ░ exp(-t/τᵣ) decay   ▓ exp(-t/τₐ) attack"
}

# Main render function for equation panel
# Usage: render_equation_panel <tau_a> <tau_r> <width> <height> <show_components>
render_equation_panel() {
    local tau_a=$1
    local tau_r=$2
    local width=$3
    local height=$4
    local show_components=${5:-1}

    # Render header (2 lines)
    render_equation_header "$tau_a" "$tau_r" "$width"
    echo ""

    # Render plot (height - 5 lines for header, axis, labels, legend)
    local plot_height=$((height - 5))
    render_kernel_plot "$tau_a" "$tau_r" "$width" "$plot_height" "$show_components"

    # Render legend
    render_kernel_legend
}
