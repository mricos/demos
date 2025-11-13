#!/usr/bin/env bash
# test-controls.sh - Standalone test for controls module

# Source the controls module
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/lib/controls.sh"

echo "Testing controls module"
echo "======================="
echo ""

# Test slider rendering
echo "SLIDERS:"
for i in {0..7}; do
    param_def="${SLIDER_PARAMS[$i]}"
    IFS='|' read -r name min max scale label <<< "$param_def"

    cc=${SLIDERS[$i]}
    value=$(get_slider_param $i)
    formatted=$(format_param_value "$value" "$name")
    bar=$(render_slider_bar $cc 20)

    echo "s$((i+1)) $label: $bar  CC:$cc  Value: $formatted  ($name: $min-$max $scale)"
done

echo ""
echo "POTS:"
for i in {0..7}; do
    param_def="${POT_PARAMS[$i]}"
    IFS='|' read -r name min max scale label <<< "$param_def"

    cc=${POTS[$i]}
    value=$(get_pot_param $i)
    formatted=$(format_param_value "$value" "$name")
    indicator=$(render_pot_indicator $cc 20)

    echo "p$((i+1)) $label: $indicator  CC:$cc  Value: $formatted  ($name: $min-$max $scale)"
done

echo ""
echo "Test: Adjusting slider s1 by +10"
adjust_control 10
new_value=$(get_slider_param 0)
new_formatted=$(format_param_value "$new_value" "tau_a")
echo "New s1 value: $new_formatted (CC: ${SLIDERS[0]})"

echo ""
echo "Test complete!"
