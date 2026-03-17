# demos/ — Project Summary

## Framework Maturity at a Glance

| Project | Message Passing | Sidebars/Panels | Component Coupling | Maturity |
|---|---|---|---|---|
| **dunk** | Custom `NS.Bus` pub/sub | L sidebar (tabbed), R sidebar (8ch meter), floating panels, bottom toolbar | Loose — event-driven | High |
| **fftnn** | Custom `on()` event emitter | L accordion sidebar, draggable doc panel, tabbed main | Loose — event bus + shared state | High |
| **cymatica** | Event system + BroadcastChannel | SVG viewport + module UI panels | Modular — bootloader + isolated modules | High |
| **cell** | Command/event system | Custom CUI panels | Command-driven, document-oriented | High (R&D) |
| **vecterm** | Redux store + middleware | L/R sidebars, VT100 terminal, modal system | Tight — Redux actions/reducers + ECS | High (deleted from tree) |
| **pong64** | WebSocket bridge (optional) | Floating control panel | Direct mutation — game loop | Low |
| **stat-rethink** | None | None | Self-contained sections | Educational |
| **charfun** | None | None | Standalone pages | Educational |
| **bayes** | None | None | Self-contained sections | Educational |
| **speak** | HTTP/fetch to backend | None | Frontend/backend split | Utility |

## Tier 1 — Mature Frameworks

### dunk/ — Bass Synthesis Machine
Full pub/sub architecture via `NS.Bus.emit()`/`.on()`. State management with
path-based get/set (`NS.State.get('voices.0.level')`), localStorage persistence,
and preset system. Panel-heavy UI: left tabbed sidebar (Tips, Help, 808, 303, Dub),
right channel meters, floating panels (Filter Design, Envelope, LFO, Master Bus,
Voice, Nasty Range). MIDI controller integration via VMX8 virtual CC mapping to
16 parameters. Web Audio API with AudioWorkletProcessor for sample-accurate synthesis.
All modules communicate through the bus — no direct coupling.

### fftnn/ — Neural Network FFT Learning Lab
Event bus (`on()` from `js/events.js`) coordinates tab switching, training state
broadcasts, and reactive redraws via ResizeObserver. Central state object (~30
properties) tracks network weights, loss/accuracy history, epoch snapshots, and
experiment comparisons. Left accordion sidebar controls signal generation,
architecture, training, and detection. Tabbed main area (Signal, Network, Training,
Detector, Theory, Experiments). Custom lightweight NN implementation, DFT/FFT in
`js/signal.js`, canvas-based weight matrix and spectrum visualization.

### cymatica/ — Quadrascan Vector Art
Custom bootloader + module system with event-driven communication and
BroadcastChannel support. SVG rendering (not Canvas) with glow filters. Centralized
state with module subscriptions. Module architecture isolates features cleanly.

### cell/ — Document System + Command Processor
Advanced metaprogramming framework. Custom UI (CUI) layer with command-based
interaction model. Document-driven design with meta-commands. Entity-component-like
architecture under the hood.

## Tier 2 — Prototypes & Games

### pong64/ — Particle Swarm Pong
Single-file game (`pong64.js`). Boids flocking with boundary coalescence, paddle
erosion mechanics. Optional WebSocket bridge receives `{ type: 'parameter', data }`
for remote flock tuning. No pub/sub — direct state mutation in requestAnimationFrame
loop. Floating control panel for separation/alignment/cohesion/turbulence sliders.

## Tier 3 — Educational / Self-Contained

### stat-rethink/ — Statistical Rethinking Interactive
Ported R library (`rethinking.js`, ~2200 lines): PRNG, distributions, QUAP, DAGs,
KDE. Each visualization section is independent. KaTeX math rendering. No messaging,
no shared state.

### charfun/ — Characteristic Function Explorer
Linked card index to standalone interactive pages. Shared CSS/JS base. Each explorer
is self-contained HTML + Canvas.

### bayes/ — Bayesian Linear Regression
Vertical sections with sliders for regularization, noise, data generation. Canvas
plots. KaTeX math. No inter-section communication.

### speak/ — Text-to-Speech Utility
Python backend (`speak.py`, `tts_cli.py`) with minimal web frontend. Simple
form-to-backend delegation.

## Cross-Cutting Patterns

- **No external frameworks** — every project is vanilla JS with native browser APIs
- **Custom event buses** are the dominant decoupling mechanism in mature projects
- **Sidebar + floating panel** UI is the hallmark of production-ready projects
- **Canvas 2D** for data visualization; **SVG** for vector graphics (cymatica); **Web Audio** for synthesis
- **localStorage** for persistence where needed (presets, user prefs)
- **KaTeX** for math rendering in educational projects
- **WebSocket / BroadcastChannel** for optional external control, never required

## Connectivity Spectrum

```
Tightly coupled                                        Fully decoupled
     |                                                        |
  pong64          stat-rethink    fftnn       dunk       cymatica
  (direct          (isolated      (bus +      (bus +      (modules +
   mutation)        sections)      state)      panels)     broadcast)
```
