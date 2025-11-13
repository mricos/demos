# tscale-tui: Tau-Scale Kernel Visualizer

A Tetra TUI application for real-time visualization and control of biexponential kernel parameters for the tscale audio beat detector.

## Overview

This application provides an interactive terminal interface for:
- **Real-time equation visualization**: ASCII/UTF-8 rendering of k(t) = exp(-t/τᵣ) - exp(-t/τₐ)
- **Parameter control**: 8 sliders + 8 pots for comprehensive parameter adjustment
- **Live audio processing**: Integration with tscale binary for real-time event detection
- **MIDI controller support**: Virtual MIDI mapping compatible with Tetra TMC

## Features

### Equation Visualization
- Plots the biexponential kernel in ASCII art
- Shows component functions (exp decay/attack) in grey
- Combined kernel in color
- Real-time updates as parameters change
- Automatic scaling based on peak values

### Control Interface
**8 Sliders (s1-s8):**
- s1: τₐ (attack time constant, 0.1-10ms, log scale)
- s2: τᵣ (recovery time constant, 1-100ms, log scale)
- s3: Detection threshold (0.1-10.0 sigma units)
- s4: Refractory period (1-100ms, log scale)
- s5: Visualization zoom (0.5-5.0x)
- s6: Event history window (1-10 seconds)
- s7: Component blend (visualization control)
- s8: Reserved

**8 Pots (p1-p8):**
- p1-p4: Fine-tune adjustments for s1-s4
- p5: Normalization mode (L2/area/none)
- p6: Processing mode (convolution/IIR)
- p7: Zero-phase filtering (on/off)
- p8: Color theme

### Statistics Panel
- Event count
- Event rate (Hz)
- Average envelope
- FPS counter

## Installation

### Prerequisites
1. **Tetra framework** installed at `~/tetra/`
   ```bash
   # Set TETRA_SRC environment variable
   export TETRA_SRC=~/src/devops/tetra
   ```

2. **tscale binary** compiled in the same directory
   ```bash
   cd /Users/mricos/src/mricos/demos/tscale
   clang -std=c11 -O3 -o tscale tscale.c -lm
   ```

3. **Bash 5.2+** (per Tetra requirements)

### Quick Start
```bash
# Run without audio (simulation mode)
./tscale-tui.sh

# Run with audio file
./tscale-tui.sh drummer.mp4

# Run with live audio input (requires audio setup)
./tscale-tui.sh /dev/audio
```

## Controls

### Keyboard Navigation
```
↑/↓        - Select slider/pot
←/→        - Adjust value (coarse)
h/l        - Adjust value (fine)
j/k        - Navigate (vim-style)

Tab        - Switch between sliders and pots
Space      - Toggle component visualization
r          - Restart audio processor
/          - REPL mode (advanced commands)
?          - Show help
q          - Quit
```

### Virtual MIDI Bindings (bb.c style)
**Sliders (fast down/up):**
```
z/Z  - s1 (tau_a)
s/S  - s1 up
x/X  - s2 (tau_r)
d/D  - s2 up
c/C  - s3 (threshold)
f/F  - s3 up
v/V  - s4 (refractory)
g/G  - s4 up
b/B  - s5 (zoom)
n/N  - s6 (history)
m/M  - s7 (blend)
,/<  - s8 (reserved)
```

**Pots:**
```
e/E  - p1 (fine tau_a)
r/R  - p2 (fine tau_r)
t/T  - p3 (fine threshold)
y/Y  - p4 (fine refractory)
u/U  - p5 (normalization)
i/I  - p6 (mode)
o/O  - p7 (zero-phase)
p/P  - p8 (theme)
```

## Architecture

### File Structure
```
tscale-tui.sh              # Main entry point
lib/
  equation_renderer.sh     # Biexponential kernel plotting
  controls.sh              # Slider/pot visualization and state
  audio_processor.sh       # tscale binary integration
  layout.sh                # Screen layout management
tscale-midi-map.txt        # MIDI mapping configuration
README-TUI.md              # This file
```

### Integration with Tetra

The application follows Tetra TUI framework conventions:
1. **Bootstrap**: Sources `tetra.sh` and `tui.sh`
2. **Initialization**: Calls `tui_init 30 120` (30 FPS, 120 BPM)
3. **Cleanup**: Trap handler for graceful exit
4. **Double buffering**: Uses `tui_buffer_*` functions
5. **Input**: Non-blocking `tcurses_input_read_key`
6. **Animation**: Frame timing with `tui_animation_*`

### Integration with tscale

**Hybrid approach** (bash viz + C audio processing):
- **Equation visualization**: Pure bash math using `awk` for calculations
- **Audio processing**: Spawns tscale binary as background process
- **Parameter updates**: Restarts tscale when core parameters change
- **Output parsing**: Reads TSV stream (t, y, env, evt) via FIFO

## Use Cases

### 1. SNN Kernel Design
Adjust τₐ and τᵣ to create synaptic kernel shapes:
- **Fast synapses**: τₐ=0.5ms, τᵣ=5ms
- **Slow synapses**: τₐ=2ms, τᵣ=50ms
- **EPSP-like**: τₐ=1ms, τᵣ=10ms

### 2. Beat Detection Tuning
Different scales for different instruments:
- **Bass kick**: τₐ=2ms, τᵣ=50ms (slow, smooth)
- **Snare**: τₐ=1ms, τᵣ=20ms (medium attack)
- **Hi-hat**: τₐ=0.5ms, τᵣ=10ms (fast, sharp)

### 3. Understanding the Integral
- Visualize area under curve (relates to NORM_AREA mode)
- See how peak amplitude changes with τ ratio
- Observe time-to-peak: t_peak = (τₐ·τᵣ)/(τᵣ-τₐ)·ln(τᵣ/τₐ)

## Parameter Ranges

### Optimal Ranges for Different Applications

**Spiking Neural Networks:**
```
τₐ: 0.5 - 5ms    (EPSP rise time)
τᵣ: 5 - 100ms    (EPSP decay time)
threshold: 1-3σ  (spike threshold)
refractory: 1-5ms (absolute refractory period)
```

**Audio Beat Detection:**
```
Bass:     τₐ=2-5ms,   τᵣ=30-100ms
Midrange: τₐ=1-3ms,   τᵣ=10-50ms
Treble:   τₐ=0.5-2ms, τᵣ=5-20ms
```

**General Detection:**
```
τₐ: 0.1 - 10ms    (attack time)
τᵣ: 1 - 100ms     (recovery time)
threshold: 0.5-5σ (sensitivity)
refractory: 1-50ms (anti-double-trigger)
```

## Troubleshooting

### "Tetra framework not found"
```bash
# Install Tetra or set TETRA_SRC
export TETRA_SRC=~/src/devops/tetra
source ~/tetra/tetra.sh
```

### "tscale binary not found"
```bash
# Compile tscale
clang -std=c11 -O3 -o tscale tscale.c -lm

# Or run in simulation mode (no audio)
./tscale-tui.sh  # Will auto-detect and use simulation
```

### Terminal too small
- Minimum terminal size: 80x30
- Recommended: 120x40 for best experience
- Layout adapts to terminal size

### Performance issues
- Reduce FPS in `tui_init` call (line 30 FPS → 15 FPS)
- Disable component visualization (Space key)
- Use simulation mode (faster than audio processing)

## Advanced Usage

### MIDI Controller Integration

To use with hardware MIDI controller via TMC:

1. **Start TMC server** (Tetra MIDI Controller)
   ```bash
   tmc start
   ```

2. **Learn controls**
   ```bash
   tmc learn s1  # Move your hardware slider
   tmc learn s2
   # ... repeat for all 16 controls
   ```

3. **Load mapping**
   ```bash
   tmc load tscale-midi-map.txt
   ```

4. **Run tscale-tui**
   ```bash
   ./tscale-tui.sh
   ```

Now your hardware MIDI controller will control the parameters!

### REPL Mode (Future)

Press `/` to enter REPL for advanced commands:
```
> preset save bass_detect
> preset load snare_detect
> param set tau_a 0.002
> export kernel kernel.dat
> help
```

## Theory: Biexponential Kernel

### Mathematical Form
```
k(t) = exp(-t/τᵣ) - exp(-t/τₐ)    where 0 < τₐ < τᵣ
```

### Components
- **exp(-t/τᵣ)**: Slow decay (recovery phase)
- **exp(-t/τₐ)**: Fast decay (attack phase)
- **Difference**: Creates characteristic "spike" shape

### Key Properties
1. **Peak time**: t_peak = (τₐ·τᵣ)/(τᵣ-τₐ) · ln(τᵣ/τₐ)
2. **Peak amplitude**: k(t_peak) = (τᵣ/τₐ)^(-τₐ/(τᵣ-τₐ)) - (τᵣ/τₐ)^(-τᵣ/(τᵣ-τₐ))
3. **Area under curve**: ∫k(t)dt = τᵣ - τₐ (unnormalized)

### Normalization Modes
- **L2 (RMS)**: Unit root-mean-square energy
- **Area**: Unit integral (sum = 1)
- **None**: Raw kernel values

### Use in Detection
1. **Convolve** input signal with kernel: y = x ∗ k
2. **Envelope**: env = |y|
3. **Threshold**: Detect when env > μ + λ·σ
4. **Refractory**: Suppress re-triggering within window

## Future Enhancements

- [ ] REPL mode implementation
- [ ] Preset system (save/load parameter sets)
- [ ] Export kernel data to file
- [ ] Real-time waveform display
- [ ] Multi-kernel comparison mode
- [ ] Hardware MIDI learning mode integration
- [ ] Color theme system (TDS integration)
- [ ] Help overlay (? key)
- [ ] Parameter automation recording

## Credits

Built on the Tetra TUI framework by mricos.
Uses the tscale (Tau-Scale Synaptic Pulse Detector) by mricos.

## License

See main project license.
