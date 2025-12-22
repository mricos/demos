#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica
# file: index.html
# notes:
#MULTICAT_END
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <title>cymatica - Quadrascan Vector Art</title>
    <link rel="stylesheet" href="style.css">
    <!-- Core namespace - bootloader handles the rest -->
    <script src="js/core/namespace.js"></script>
</head>
<body>
    <!-- Loading overlay -->
    <div id="loading-overlay">
        <div class="loading-text">CYMATICA</div>
    </div>

    <div id="app">
        <div id="viewport">
            <svg id="vector-canvas" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <!-- Quadrascan glow filters -->
                    <filter id="glow-soft" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="blur"/>
                        <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <filter id="glow-medium" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur"/>
                        <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <filter id="glow-intense" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="8" result="blur1"/>
                        <feGaussianBlur stdDeviation="3" result="blur2"/>
                        <feMerge>
                            <feMergeNode in="blur1"/>
                            <feMergeNode in="blur2"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <!-- Phosphor persistence effect -->
                    <filter id="phosphor" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur"/>
                        <feColorMatrix in="blur" type="matrix"
                            values="1.2 0 0 0 0
                                    0 1.2 0 0 0
                                    0 0 1.2 0 0
                                    0 0 0 1 0" result="bright"/>
                        <feMerge>
                            <feMergeNode in="bright"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                <g id="render-group"></g>
            </svg>
            <div id="scanlines"></div>
            <div id="vignette"></div>
            <div id="stats"></div>
        </div>

        <div id="side-panel">
            <button id="panel-toggle">&#9664;</button>

            <div class="panel-header">
                <h1>Quadrascan Vector</h1>
            </div>

            <div class="panel-menu">
                <button class="menu-btn" id="btn-collapse-all" title="Collapse All">&#9660;</button>
                <button class="menu-btn" id="btn-expand-all" title="Expand All">&#9650;</button>
                <button class="menu-btn" id="btn-play-pause" title="Play/Pause">&#9654;</button>
                <button class="menu-btn" id="btn-random" title="Random Layout">&#8634;</button>
                <button class="menu-btn" id="btn-save" title="Save State">&#128190;</button>
            </div>

            <div class="panel-content">
                <!-- Reset Button -->
                <div class="control-group" style="margin-bottom: var(--space-4);">
                    <button class="action-btn" id="btn-reset" style="width: 100%;">Reset View</button>
                </div>

                <!-- Animation Section -->
                <div class="control-section">
                    <div class="section-header">
                        <h3>Animation</h3>
                        <span class="section-toggle">&#9660;</span>
                    </div>
                    <div class="section-content">
                        <div class="control-group">
                            <div class="toggle-wrapper">
                                <label>Play Animation</label>
                                <div class="toggle" id="toggle-animation"></div>
                            </div>
                        </div>
                        <div class="control-group">
                            <label>Speed</label>
                            <div class="control-row">
                                <input type="range" id="anim-speed" min="0.1" max="3" step="0.1" value="1">
                                <span class="value-display" id="anim-speed-val">1.0x</span>
                            </div>
                        </div>
                        <div class="control-group">
                            <label>Rotation X</label>
                            <div class="control-row">
                                <input type="range" id="rot-x-speed" min="-50" max="50" step="1" value="5">
                                <span class="value-display" id="rot-x-val">5</span>
                            </div>
                        </div>
                        <div class="control-group">
                            <label>Rotation Y</label>
                            <div class="control-row">
                                <input type="range" id="rot-y-speed" min="-50" max="50" step="1" value="15">
                                <span class="value-display" id="rot-y-val">15</span>
                            </div>
                        </div>
                        <div class="control-group">
                            <label>Rotation Z</label>
                            <div class="control-row">
                                <input type="range" id="rot-z-speed" min="-50" max="50" step="1" value="0">
                                <span class="value-display" id="rot-z-val">0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quadrascan Rendering Section -->
                <div class="control-section">
                    <div class="section-header">
                        <h3>Quadrascan</h3>
                        <span class="section-toggle">&#9660;</span>
                    </div>
                    <div class="section-content">
                        <div class="control-group">
                            <label>Concentric Layers</label>
                            <div class="control-row">
                                <input type="range" id="concentric-count" min="1" max="12" step="1" value="5">
                                <span class="value-display" id="concentric-val">5</span>
                            </div>
                        </div>
                        <div class="control-group">
                            <label>Layer Offset</label>
                            <div class="control-row">
                                <input type="range" id="layer-offset" min="0.5" max="8" step="0.5" value="2">
                                <span class="value-display" id="offset-val">2</span>
                            </div>
                        </div>
                        <div class="control-group">
                            <label>Stroke Width</label>
                            <div class="control-row">
                                <input type="range" id="stroke-width" min="0.5" max="6" step="0.25" value="1.5">
                                <span class="value-display" id="stroke-val">1.5</span>
                            </div>
                        </div>
                        <div class="control-group">
                            <label>Glow Intensity</label>
                            <div class="control-row">
                                <input type="range" id="glow-intensity" min="0" max="100" step="5" value="60">
                                <span class="value-display" id="glow-val">60</span>
                            </div>
                        </div>
                        <div class="control-group">
                            <label>Primary Color</label>
                            <div class="control-row">
                                <input type="color" id="color-primary" value="#00ffff">
                                <input type="color" id="color-secondary" value="#ff00aa">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Letter Positioning Section -->
                <div class="control-section">
                    <div class="section-header">
                        <h3>Letter Positions</h3>
                        <span class="section-toggle">&#9660;</span>
                    </div>
                    <div class="section-content">
                        <div class="letter-grid" id="letter-grid">
                            <div class="letter-cell selected" data-index="0">c</div>
                            <div class="letter-cell" data-index="1">y</div>
                            <div class="letter-cell" data-index="2">m</div>
                            <div class="letter-cell" data-index="3">a</div>
                            <div class="letter-cell" data-index="4">t</div>
                            <div class="letter-cell" data-index="5">i</div>
                            <div class="letter-cell" data-index="6">c</div>
                            <div class="letter-cell" data-index="7">a</div>
                        </div>
                        <div class="position-controls">
                            <div class="position-control">
                                <label>X</label>
                                <input type="number" id="pos-x" value="0" step="10">
                            </div>
                            <div class="position-control">
                                <label>Y</label>
                                <input type="number" id="pos-y" value="0" step="10">
                            </div>
                            <div class="position-control">
                                <label>Z</label>
                                <input type="number" id="pos-z" value="0" step="10">
                            </div>
                        </div>
                        <div class="control-group" style="margin-top: var(--space-3)">
                            <label>Letter Scale</label>
                            <div class="control-row">
                                <input type="range" id="letter-scale" min="0.5" max="3" step="0.1" value="1">
                                <span class="value-display" id="scale-val">1.0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Perspective Section -->
                <div class="control-section">
                    <div class="section-header">
                        <h3>Perspective</h3>
                        <span class="section-toggle">&#9660;</span>
                    </div>
                    <div class="section-content">
                        <div class="control-group">
                            <label>FOV</label>
                            <div class="control-row">
                                <input type="range" id="fov" min="400" max="2000" step="50" value="1000">
                                <span class="value-display" id="fov-val">1000</span>
                            </div>
                        </div>
                        <div class="control-group">
                            <label>Camera Z</label>
                            <div class="control-row">
                                <input type="range" id="cam-z" min="200" max="1500" step="50" value="600">
                                <span class="value-display" id="cam-z-val">600</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Effects Section -->
                <div class="control-section">
                    <div class="section-header">
                        <h3>Effects</h3>
                        <span class="section-toggle">&#9660;</span>
                    </div>
                    <div class="section-content">
                        <div class="control-group">
                            <div class="toggle-wrapper">
                                <label>Scanlines</label>
                                <div class="toggle active" id="toggle-scanlines"></div>
                            </div>
                        </div>
                        <div class="control-group">
                            <div class="toggle-wrapper">
                                <label>Vignette</label>
                                <div class="toggle active" id="toggle-vignette"></div>
                            </div>
                        </div>
                        <div class="control-group">
                            <div class="toggle-wrapper">
                                <label>Draw-On Animation</label>
                                <div class="toggle" id="toggle-drawon"></div>
                            </div>
                        </div>
                        <div class="control-group">
                            <div class="toggle-wrapper">
                                <label>Loop Draw</label>
                                <div class="toggle active" id="toggle-drawloop"></div>
                            </div>
                        </div>
                        <div class="control-group">
                            <label>Draw Speed</label>
                            <div class="control-row">
                                <input type="range" id="draw-speed" min="0.5" max="5" step="0.25" value="2">
                                <span class="value-display" id="draw-speed-val">2s</span>
                            </div>
                        </div>
                        <div class="control-group">
                            <div class="toggle-wrapper">
                                <label>Color Oscillate</label>
                                <div class="toggle" id="toggle-oscillate"></div>
                            </div>
                        </div>
                        <div class="control-group">
                            <label>Oscillate Speed</label>
                            <div class="control-row">
                                <input type="range" id="oscillate-speed" min="0.2" max="5" step="0.2" value="1">
                                <span class="value-display" id="oscillate-speed-val">1.0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Presets Section -->
                <div class="control-section">
                    <div class="section-header">
                        <h3>Presets</h3>
                        <span class="section-toggle">&#9660;</span>
                    </div>
                    <div class="section-content">
                        <div class="preset-grid">
                            <button class="preset-btn" data-preset="tempest">Tempest</button>
                            <button class="preset-btn" data-preset="battlezone">Battlezone</button>
                            <button class="preset-btn" data-preset="starwars">Star Wars</button>
                            <button class="preset-btn" data-preset="asteroids">Asteroids</button>
                            <button class="preset-btn" data-preset="neon">Neon Nights</button>
                            <button class="preset-btn" data-preset="arcade">Arcade</button>
                        </div>
                    </div>
                </div>

                <!-- Layout Presets -->
                <div class="control-section">
                    <div class="section-header">
                        <h3>Layout</h3>
                        <span class="section-toggle">&#9660;</span>
                    </div>
                    <div class="section-content">
                        <div class="preset-grid">
                            <button class="preset-btn" data-layout="flat">Flat</button>
                            <button class="preset-btn" data-layout="arc">Arc</button>
                            <button class="preset-btn" data-layout="wave">Wave</button>
                            <button class="preset-btn" data-layout="spiral">Spiral</button>
                            <button class="preset-btn" data-layout="scatter">Scatter</button>
                            <button class="preset-btn" data-layout="cylinder">Cylinder</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootloader handles all module loading -->
    <script src="js/bootloader.js"></script>
</body>
</html>

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica
# file: build.sh
# notes:
#MULTICAT_END
#!/usr/bin/env bash
# cymatica/build.sh - Build system for cymatica
#
# Usage:
#   ./build.sh              # Full build (prebuild + build)
#   ./build.sh prebuild     # Only fetch dependencies
#   ./build.sh build        # Only build (assumes deps exist)
#   ./build.sh serve        # Build and serve
#   ./build.sh clean        # Clean build artifacts
#   ./build.sh status       # Show dependency status

set -euo pipefail

# Configuration
CYMATICA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TETRA_SRC="${TETRA_SRC:-$HOME/src/devops/tetra}"
TERRAIN_SRC="$TETRA_SRC/bash/terrain"
TUT_SRC="$TETRA_SRC/bash/tut"

# Output directories
LIB_DIR="$CYMATICA_DIR/lib"
DIST_DIR="$CYMATICA_DIR/dist"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[cymatica]${NC} $1"; }
success() { echo -e "${GREEN}[cymatica]${NC} $1"; }
warn() { echo -e "${YELLOW}[cymatica]${NC} $1"; }
error() { echo -e "${RED}[cymatica]${NC} $1" >&2; }

# ============================================================================
# PREBUILD - Fetch and prepare dependencies
# ============================================================================

prebuild() {
    log "Starting prebuild..."

    # Ensure lib directory exists
    mkdir -p "$LIB_DIR"

    # Check for TUT in terrain's dist
    local tut_js="$TERRAIN_SRC/dist/modules/tut.js"
    local tut_css="$TERRAIN_SRC/dist/modules/tut.css"

    if [[ -f "$tut_js" && -f "$tut_css" ]]; then
        log "Copying TUT from terrain/dist/modules/..."
        cp "$tut_js" "$LIB_DIR/tut.js"
        cp "$tut_css" "$LIB_DIR/tut.css"
        success "TUT copied: $(wc -c < "$LIB_DIR/tut.js" | tr -d ' ') bytes JS, $(wc -c < "$LIB_DIR/tut.css" | tr -d ' ') bytes CSS"
    else
        # Try building TUT from source
        if [[ -d "$TUT_SRC" ]]; then
            warn "TUT bundle not found, attempting to build from source..."
            if [[ -f "$TUT_SRC/bundler/bundle.sh" ]]; then
                (cd "$TUT_SRC" && ./bundler/bundle.sh)
                # Copy from TUT's dist
                if [[ -f "$TUT_SRC/dist/tut.js" ]]; then
                    cp "$TUT_SRC/dist/tut.js" "$LIB_DIR/tut.js"
                    cp "$TUT_SRC/dist/tut.css" "$LIB_DIR/tut.css"
                    success "TUT built and copied"
                else
                    error "TUT build failed - dist/tut.js not found"
                    return 1
                fi
            else
                error "TUT bundler not found at $TUT_SRC/bundler/bundle.sh"
                return 1
            fi
        else
            error "TUT source not found at $TUT_SRC"
            error "Set TETRA_SRC or ensure tetra is at ~/src/devops/tetra"
            return 1
        fi
    fi

    # Verify TUT has TERRAIN shim for standalone use
    if grep -q "window.TERRAIN" "$LIB_DIR/tut.js" 2>/dev/null; then
        success "TUT has TERRAIN shim for standalone use"
    else
        warn "TUT may not work standalone - TERRAIN shim not detected"
    fi

    success "Prebuild complete"
}

# ============================================================================
# BUILD - Compile/prepare application
# ============================================================================

build() {
    log "Starting build..."

    # Verify dependencies exist
    if [[ ! -f "$LIB_DIR/tut.js" ]]; then
        error "Dependencies missing. Run: ./build.sh prebuild"
        return 1
    fi

    # Create dist directory
    mkdir -p "$DIST_DIR"

    # Concatenate core modules in order (for bundled version)
    log "Bundling core modules..."
    local core_bundle="$DIST_DIR/cymatica.core.js"
    cat > "$core_bundle" << 'BANNER'
/**
 * CYMATICA Core Bundle
 * Generated: $(date -Iseconds)
 * Modules: namespace, config, utils, events, state, mode
 */
BANNER

    # Core modules in dependency order
    local core_modules=(
        "js/core/namespace.js"
        "js/core/config.js"
        "js/core/utils.js"
        "js/core/events.js"
        "js/core/state.js"
        "js/core/mode.js"
    )

    for module in "${core_modules[@]}"; do
        if [[ -f "$CYMATICA_DIR/$module" ]]; then
            echo "" >> "$core_bundle"
            echo "// === $module ===" >> "$core_bundle"
            cat "$CYMATICA_DIR/$module" >> "$core_bundle"
        fi
    done

    if [[ -s "$core_bundle" ]]; then
        success "Core bundle: $(wc -c < "$core_bundle" | tr -d ' ') bytes"
    else
        warn "Core bundle empty - core modules not yet created"
    fi

    # Copy lib to dist for serving
    cp -r "$LIB_DIR"/* "$DIST_DIR/" 2>/dev/null || true

    success "Build complete"
    log "Output: $DIST_DIR/"
}

# ============================================================================
# SERVE - Start development server
# ============================================================================

serve() {
    local port="${1:-8080}"

    log "Starting development server on http://localhost:$port"
    log "Press Ctrl+C to stop"

    if command -v python3 &>/dev/null; then
        (cd "$CYMATICA_DIR" && python3 -m http.server "$port")
    elif command -v python &>/dev/null; then
        (cd "$CYMATICA_DIR" && python -m SimpleHTTPServer "$port")
    else
        error "Python required for development server"
        return 1
    fi
}

# ============================================================================
# CLEAN - Remove build artifacts
# ============================================================================

clean() {
    log "Cleaning build artifacts..."
    rm -rf "$DIST_DIR"
    rm -f "$LIB_DIR/tut.js" "$LIB_DIR/tut.css"
    success "Clean complete"
}

# ============================================================================
# STATUS - Show dependency status
# ============================================================================

status() {
    echo ""
    log "Cymatica Build Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    echo -e "\n${BLUE}Dependencies:${NC}"

    # TUT
    if [[ -f "$LIB_DIR/tut.js" ]]; then
        local tut_size=$(wc -c < "$LIB_DIR/tut.js" | tr -d ' ')
        echo -e "  ${GREEN}✓${NC} tut.js ($tut_size bytes)"
    else
        echo -e "  ${RED}✗${NC} tut.js (missing)"
    fi

    if [[ -f "$LIB_DIR/tut.css" ]]; then
        local css_size=$(wc -c < "$LIB_DIR/tut.css" | tr -d ' ')
        echo -e "  ${GREEN}✓${NC} tut.css ($css_size bytes)"
    else
        echo -e "  ${RED}✗${NC} tut.css (missing)"
    fi

    echo -e "\n${BLUE}Source Paths:${NC}"
    echo "  TETRA_SRC: $TETRA_SRC"
    echo "  TERRAIN:   $TERRAIN_SRC"
    echo "  TUT:       $TUT_SRC"

    echo -e "\n${BLUE}Core Modules:${NC}"
    local modules=("namespace" "config" "utils" "events" "state" "mode")
    for mod in "${modules[@]}"; do
        if [[ -f "$CYMATICA_DIR/js/core/$mod.js" ]]; then
            local size=$(wc -c < "$CYMATICA_DIR/js/core/$mod.js" | tr -d ' ')
            echo -e "  ${GREEN}✓${NC} $mod.js ($size bytes)"
        else
            echo -e "  ${YELLOW}○${NC} $mod.js (not yet created)"
        fi
    done

    echo -e "\n${BLUE}Mode Files:${NC}"
    for mode in "$CYMATICA_DIR/modes/"*.mode.json; do
        if [[ -f "$mode" ]]; then
            local name=$(basename "$mode")
            echo -e "  ${GREEN}✓${NC} $name"
        fi
    done
    if [[ ! -f "$CYMATICA_DIR/modes/cymatica.mode.json" ]]; then
        echo -e "  ${YELLOW}○${NC} (no mode files yet)"
    fi

    echo ""
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    local cmd="${1:-all}"
    shift || true

    case "$cmd" in
        prebuild|pre)
            prebuild
            ;;
        build)
            build
            ;;
        serve|dev)
            build
            serve "$@"
            ;;
        clean)
            clean
            ;;
        status|st)
            status
            ;;
        all|"")
            prebuild
            build
            ;;
        help|--help|-h)
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  prebuild    Fetch dependencies (TUT from terrain)"
            echo "  build       Build application bundles"
            echo "  serve       Build and start dev server"
            echo "  clean       Remove build artifacts"
            echo "  status      Show dependency status"
            echo "  all         Full build (prebuild + build) [default]"
            echo ""
            echo "Environment:"
            echo "  TETRA_SRC   Path to tetra source (default: ~/src/devops/tetra)"
            ;;
        *)
            error "Unknown command: $cmd"
            echo "Run '$0 help' for usage"
            return 1
            ;;
    esac
}

main "$@"

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js
# file: mod-ui.js
# notes:
#MULTICAT_END
// CYMATICA.modUI - Modulation Scene Editor Panel
// Provides UI for creating and managing LFOs, ASRs, and modulation routes
(function(CYMATICA) {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    CYMATICA.modUI = {
        _panel: null,
        _visualizerInterval: null,

        /**
         * Initialize the modulation UI
         */
        init() {
            this._createPanel();
            this._bindControls();
            this._startVisualizers();
            this._render();
            console.log('cymatica.modUI: initialized');
        },

        /**
         * Create the modulation panel HTML
         * @private
         */
        _createPanel() {
            const panelContent = $('.panel-content');
            if (!panelContent) return;

            const section = document.createElement('div');
            section.className = 'control-section';
            section.id = 'mod-section';
            section.innerHTML = `
                <div class="section-header">
                    <h3>Modulation</h3>
                    <span class="section-toggle">&#9660;</span>
                </div>
                <div class="section-content">
                    <!-- Enable Toggle -->
                    <div class="control-group">
                        <div class="toggle-wrapper">
                            <label>Enable Modulation</label>
                            <div class="toggle active" id="toggle-mod-enable"></div>
                        </div>
                    </div>

                    <!-- LFO List -->
                    <div class="mod-subsection">
                        <div class="mod-subsection-header">
                            <span>LFOs</span>
                            <button class="add-btn" id="add-lfo-btn" title="Add LFO">+</button>
                        </div>
                        <div id="lfo-list" class="mod-list"></div>
                    </div>

                    <!-- ASR List -->
                    <div class="mod-subsection">
                        <div class="mod-subsection-header">
                            <span>Envelopes (ASR)</span>
                            <button class="add-btn" id="add-asr-btn" title="Add Envelope">+</button>
                        </div>
                        <div id="asr-list" class="mod-list"></div>
                    </div>

                    <!-- Routes List -->
                    <div class="mod-subsection">
                        <div class="mod-subsection-header">
                            <span>Routes</span>
                            <button class="add-btn" id="add-route-btn" title="Add Route">+</button>
                        </div>
                        <div id="route-list" class="mod-list"></div>
                    </div>

                    <!-- Broadcast Status -->
                    <div class="mod-subsection">
                        <div class="mod-subsection-header">
                            <span>External Control</span>
                        </div>
                        <div id="broadcast-status" class="broadcast-status">
                            <span class="status-dot"></span>
                            <span class="status-text">Listening...</span>
                        </div>
                    </div>

                    <!-- Demo Preset -->
                    <div class="mod-subsection">
                        <button class="action-btn" id="load-demo-preset" style="width: 100%;">Load Demo Preset</button>
                    </div>
                </div>
            `;
            panelContent.appendChild(section);
            this._panel = section;
        },

        /**
         * Bind control event handlers
         * @private
         */
        _bindControls() {
            // Enable toggle
            $('#toggle-mod-enable')?.addEventListener('click', function() {
                this.classList.toggle('active');
                const state = CYMATICA.state._state;
                state.mod = state.mod || { lfos: {}, asrs: {}, routes: [], enabled: true };
                state.mod.enabled = this.classList.contains('active');
            });

            // Add LFO button
            $('#add-lfo-btn')?.addEventListener('click', () => this._addLFO());

            // Add ASR button
            $('#add-asr-btn')?.addEventListener('click', () => this._addASR());

            // Add Route button
            $('#add-route-btn')?.addEventListener('click', () => this._addRoute());

            // Section collapse
            $('#mod-section .section-header')?.addEventListener('click', (e) => {
                e.currentTarget.classList.toggle('collapsed');
            });

            // Demo preset button
            $('#load-demo-preset')?.addEventListener('click', () => this._loadDemoPreset());
        },

        /**
         * Add a new LFO
         * @private
         */
        _addLFO() {
            const state = CYMATICA.state._state;
            state.mod = state.mod || { lfos: {}, asrs: {}, routes: [], enabled: true };

            const lfo = CYMATICA.mod.lfo.createLFO({
                waveform: 'sine',
                frequency: 0.5,
                amplitude: 1.0,
                offset: 0.5
            });
            state.mod.lfos[lfo.id] = lfo;

            this._renderLFOs();
            CYMATICA.events.publish('mod:lfo:added', lfo);
        },

        /**
         * Add a new ASR envelope
         * @private
         */
        _addASR() {
            const state = CYMATICA.state._state;
            state.mod = state.mod || { lfos: {}, asrs: {}, routes: [], enabled: true };

            const asr = CYMATICA.mod.asr.createASR({
                attack: 0.1,
                sustain: 1.0,
                release: 0.3
            });
            state.mod.asrs[asr.id] = asr;

            this._renderASRs();
            CYMATICA.events.publish('mod:asr:added', asr);
        },

        /**
         * Add a new modulation route
         * @private
         */
        _addRoute() {
            const state = CYMATICA.state._state;
            state.mod = state.mod || { lfos: {}, asrs: {}, routes: [], enabled: true };

            // Get first available source
            const lfoIds = Object.keys(state.mod.lfos);
            const asrIds = Object.keys(state.mod.asrs);
            const sourceType = lfoIds.length > 0 ? 'lfo' : (asrIds.length > 0 ? 'asr' : 'lfo');
            const sourceId = lfoIds[0] || asrIds[0] || '';

            const route = CYMATICA.mod.hub.createRoute({
                sourceType,
                sourceId,
                target: 'rotation.y',
                min: -30,
                max: 30
            });
            state.mod.routes.push(route);

            this._renderRoutes();
        },

        /**
         * Render all modulation components
         * @private
         */
        _render() {
            this._renderLFOs();
            this._renderASRs();
            this._renderRoutes();
        },

        /**
         * Render LFO list
         * @private
         */
        _renderLFOs() {
            const container = $('#lfo-list');
            if (!container) return;

            const lfos = CYMATICA.state._state.mod?.lfos || {};
            const waveforms = CYMATICA.mod.lfo.getWaveforms();

            container.innerHTML = Object.values(lfos).map(lfo => `
                <div class="mod-item lfo-item" data-id="${lfo.id}">
                    <div class="mod-item-header">
                        <input type="checkbox" class="lfo-enable" ${lfo.enabled ? 'checked' : ''} title="Enable">
                        <select class="lfo-waveform" title="Waveform">
                            ${waveforms.map(w => `<option value="${w}" ${lfo.waveform === w ? 'selected' : ''}>${w}</option>`).join('')}
                        </select>
                        <button class="delete-btn" title="Delete">&times;</button>
                    </div>
                    <div class="mod-item-controls">
                        <label>Freq</label>
                        <input type="range" class="lfo-freq" min="0.01" max="10" step="0.01" value="${lfo.frequency}">
                        <span class="value-display lfo-freq-val">${lfo.frequency.toFixed(2)}</span>
                    </div>
                    <div class="mod-item-controls">
                        <label>Amp</label>
                        <input type="range" class="lfo-amp" min="0" max="1" step="0.01" value="${lfo.amplitude}">
                        <span class="value-display lfo-amp-val">${(lfo.amplitude * 100).toFixed(0)}%</span>
                    </div>
                    <div class="mod-visualizer"><div class="mod-bar lfo-bar"></div></div>
                </div>
            `).join('');

            this._attachLFOListeners();
        },

        /**
         * Attach event listeners to LFO items
         * @private
         */
        _attachLFOListeners() {
            $$('.lfo-item').forEach(item => {
                const id = item.dataset.id;
                const state = CYMATICA.state._state;

                // Enable checkbox
                item.querySelector('.lfo-enable')?.addEventListener('change', (e) => {
                    if (state.mod?.lfos?.[id]) {
                        state.mod.lfos[id].enabled = e.target.checked;
                    }
                });

                // Waveform select
                item.querySelector('.lfo-waveform')?.addEventListener('change', (e) => {
                    if (state.mod?.lfos?.[id]) {
                        state.mod.lfos[id].waveform = e.target.value;
                    }
                });

                // Frequency slider
                const freqSlider = item.querySelector('.lfo-freq');
                const freqVal = item.querySelector('.lfo-freq-val');
                freqSlider?.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    if (state.mod?.lfos?.[id]) {
                        state.mod.lfos[id].frequency = val;
                    }
                    if (freqVal) freqVal.textContent = val.toFixed(2);
                });

                // Amplitude slider
                const ampSlider = item.querySelector('.lfo-amp');
                const ampVal = item.querySelector('.lfo-amp-val');
                ampSlider?.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    if (state.mod?.lfos?.[id]) {
                        state.mod.lfos[id].amplitude = val;
                    }
                    if (ampVal) ampVal.textContent = (val * 100).toFixed(0) + '%';
                });

                // Delete button
                item.querySelector('.delete-btn')?.addEventListener('click', () => {
                    if (state.mod?.lfos?.[id]) {
                        delete state.mod.lfos[id];
                        CYMATICA.mod.lfo.remove(id);
                        this._renderLFOs();
                        this._renderRoutes(); // Update route source options
                    }
                });
            });
        },

        /**
         * Render ASR envelope list
         * @private
         */
        _renderASRs() {
            const container = $('#asr-list');
            if (!container) return;

            const asrs = CYMATICA.state._state.mod?.asrs || {};

            container.innerHTML = Object.values(asrs).map(asr => `
                <div class="mod-item asr-item" data-id="${asr.id}">
                    <div class="mod-item-header">
                        <input type="checkbox" class="asr-enable" ${asr.enabled ? 'checked' : ''} title="Enable">
                        <span class="asr-label">ASR</span>
                        <button class="test-btn" title="Test trigger">Test</button>
                        <button class="delete-btn" title="Delete">&times;</button>
                    </div>
                    <div class="mod-item-controls">
                        <label>A</label>
                        <input type="range" class="asr-attack" min="0.01" max="2" step="0.01" value="${asr.attack}">
                        <span class="value-display">${asr.attack.toFixed(2)}s</span>
                    </div>
                    <div class="mod-item-controls">
                        <label>S</label>
                        <input type="range" class="asr-sustain" min="0" max="1" step="0.01" value="${asr.sustain}">
                        <span class="value-display">${(asr.sustain * 100).toFixed(0)}%</span>
                    </div>
                    <div class="mod-item-controls">
                        <label>R</label>
                        <input type="range" class="asr-release" min="0.01" max="3" step="0.01" value="${asr.release}">
                        <span class="value-display">${asr.release.toFixed(2)}s</span>
                    </div>
                    <div class="mod-item-controls">
                        <label>Trigger</label>
                        <input type="text" class="asr-trigger-channel" value="${asr.triggerChannel || ''}" placeholder="note:60">
                    </div>
                    <div class="mod-visualizer"><div class="mod-bar asr-bar"></div></div>
                </div>
            `).join('');

            this._attachASRListeners();
        },

        /**
         * Attach event listeners to ASR items
         * @private
         */
        _attachASRListeners() {
            $$('.asr-item').forEach(item => {
                const id = item.dataset.id;
                const state = CYMATICA.state._state;

                // Enable checkbox
                item.querySelector('.asr-enable')?.addEventListener('change', (e) => {
                    if (state.mod?.asrs?.[id]) {
                        state.mod.asrs[id].enabled = e.target.checked;
                    }
                });

                // Attack slider
                item.querySelector('.asr-attack')?.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    if (state.mod?.asrs?.[id]) state.mod.asrs[id].attack = val;
                    e.target.nextElementSibling.textContent = val.toFixed(2) + 's';
                });

                // Sustain slider
                item.querySelector('.asr-sustain')?.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    if (state.mod?.asrs?.[id]) state.mod.asrs[id].sustain = val;
                    e.target.nextElementSibling.textContent = (val * 100).toFixed(0) + '%';
                });

                // Release slider
                item.querySelector('.asr-release')?.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    if (state.mod?.asrs?.[id]) state.mod.asrs[id].release = val;
                    e.target.nextElementSibling.textContent = val.toFixed(2) + 's';
                });

                // Trigger channel input
                item.querySelector('.asr-trigger-channel')?.addEventListener('change', (e) => {
                    if (state.mod?.asrs?.[id]) {
                        state.mod.asrs[id].triggerChannel = e.target.value || null;
                    }
                });

                // Test button
                item.querySelector('.test-btn')?.addEventListener('click', () => {
                    CYMATICA.mod.asr.trigger(id, true);
                    setTimeout(() => CYMATICA.mod.asr.trigger(id, false), 300);
                });

                // Delete button
                item.querySelector('.delete-btn')?.addEventListener('click', () => {
                    if (state.mod?.asrs?.[id]) {
                        delete state.mod.asrs[id];
                        CYMATICA.mod.asr.remove(id);
                        this._renderASRs();
                        this._renderRoutes();
                    }
                });
            });
        },

        /**
         * Render modulation routes list
         * @private
         */
        _renderRoutes() {
            const container = $('#route-list');
            if (!container) return;

            const state = CYMATICA.state._state;
            const routes = state.mod?.routes || [];
            const lfos = state.mod?.lfos || {};
            const asrs = state.mod?.asrs || {};
            const targets = CYMATICA.mod.hub.getRoutableTargets();
            const curvePresets = Object.keys(CYMATICA.mod.mapper.CurvePresets);

            container.innerHTML = routes.map((route, idx) => {
                // Build source options based on type
                let sourceOptions = '';
                if (route.sourceType === 'lfo') {
                    sourceOptions = Object.keys(lfos).map(id =>
                        `<option value="${id}" ${route.sourceId === id ? 'selected' : ''}>${id.substr(0, 8)}</option>`
                    ).join('');
                } else if (route.sourceType === 'asr') {
                    sourceOptions = Object.keys(asrs).map(id =>
                        `<option value="${id}" ${route.sourceId === id ? 'selected' : ''}>${id.substr(0, 8)}</option>`
                    ).join('');
                } else {
                    sourceOptions = '<option value="">External</option>';
                }

                // Determine current curve preset
                const curvePreset = this._detectCurvePreset(route);

                return `
                    <div class="mod-item route-item" data-index="${idx}">
                        <div class="route-row">
                            <input type="checkbox" class="route-enable" ${route.enabled ? 'checked' : ''} title="Enable">
                            <select class="route-source-type" title="Source type">
                                <option value="lfo" ${route.sourceType === 'lfo' ? 'selected' : ''}>LFO</option>
                                <option value="asr" ${route.sourceType === 'asr' ? 'selected' : ''}>ASR</option>
                                <option value="external" ${route.sourceType === 'external' ? 'selected' : ''}>Ext</option>
                            </select>
                            <select class="route-source-id" title="Source">
                                ${sourceOptions}
                            </select>
                            <span class="route-arrow">→</span>
                            <select class="route-target" title="Target parameter">
                                ${targets.map(t => `<option value="${t}" ${route.target === t ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                            <button class="delete-btn" title="Delete">&times;</button>
                        </div>
                        <div class="route-row">
                            <label>Range</label>
                            <input type="number" class="route-min" value="${route.min}" step="0.1" title="Min">
                            <input type="number" class="route-max" value="${route.max}" step="0.1" title="Max">
                            <select class="route-curve" title="Curve">
                                ${curvePresets.map(c => `<option value="${c}" ${curvePreset === c ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                `;
            }).join('');

            this._attachRouteListeners();
        },

        /**
         * Detect which curve preset matches the route params
         * @private
         */
        _detectCurvePreset(route) {
            const presets = CYMATICA.mod.mapper.CurvePresets;
            for (const [name, preset] of Object.entries(presets)) {
                if (Math.abs(route.curveA - preset.a) < 0.1 &&
                    Math.abs(route.curveB - preset.b) < 0.1) {
                    return name;
                }
            }
            return 'linear';
        },

        /**
         * Attach event listeners to route items
         * @private
         */
        _attachRouteListeners() {
            $$('.route-item').forEach(item => {
                const idx = parseInt(item.dataset.index);
                const state = CYMATICA.state._state;
                const getRoute = () => state.mod?.routes?.[idx];

                // Enable checkbox
                item.querySelector('.route-enable')?.addEventListener('change', (e) => {
                    const route = getRoute();
                    if (route) route.enabled = e.target.checked;
                });

                // Source type
                item.querySelector('.route-source-type')?.addEventListener('change', (e) => {
                    const route = getRoute();
                    if (route) {
                        route.sourceType = e.target.value;
                        route.sourceId = '';
                        this._renderRoutes();
                    }
                });

                // Source ID
                item.querySelector('.route-source-id')?.addEventListener('change', (e) => {
                    const route = getRoute();
                    if (route) route.sourceId = e.target.value;
                });

                // Target
                item.querySelector('.route-target')?.addEventListener('change', (e) => {
                    const route = getRoute();
                    if (route) route.target = e.target.value;
                });

                // Min/Max
                item.querySelector('.route-min')?.addEventListener('change', (e) => {
                    const route = getRoute();
                    if (route) route.min = parseFloat(e.target.value);
                });

                item.querySelector('.route-max')?.addEventListener('change', (e) => {
                    const route = getRoute();
                    if (route) route.max = parseFloat(e.target.value);
                });

                // Curve preset
                item.querySelector('.route-curve')?.addEventListener('change', (e) => {
                    const route = getRoute();
                    if (route) {
                        const preset = CYMATICA.mod.mapper.getPreset(e.target.value);
                        route.curveA = preset.a;
                        route.curveB = preset.b;
                        route.curveMid = preset.m;
                    }
                });

                // Delete
                item.querySelector('.delete-btn')?.addEventListener('click', () => {
                    if (state.mod?.routes) {
                        state.mod.routes.splice(idx, 1);
                        this._renderRoutes();
                    }
                });
            });
        },

        /**
         * Start visualizer update interval
         * @private
         */
        _startVisualizers() {
            this._visualizerInterval = setInterval(() => {
                // Update LFO bars
                $$('.lfo-item').forEach(item => {
                    const id = item.dataset.id;
                    const val = CYMATICA.mod.lfo.getValue(id);
                    const bar = item.querySelector('.lfo-bar');
                    if (bar) bar.style.width = (val * 100) + '%';
                });

                // Update ASR bars
                $$('.asr-item').forEach(item => {
                    const id = item.dataset.id;
                    const val = CYMATICA.mod.asr.getValue(id);
                    const bar = item.querySelector('.asr-bar');
                    if (bar) bar.style.width = (val * 100) + '%';
                });

                // Update broadcast status
                const statusEl = $('#broadcast-status');
                if (statusEl && CYMATICA.mod.broadcast) {
                    const count = CYMATICA.mod.broadcast.getMessageCount();
                    const connected = CYMATICA.mod.broadcast.isConnected();
                    statusEl.querySelector('.status-dot')?.classList.toggle('active', connected);
                    statusEl.querySelector('.status-text').textContent =
                        connected ? `Messages: ${count}` : 'Not connected';
                }
            }, 50);
        },

        /**
         * Stop visualizers
         */
        stopVisualizers() {
            if (this._visualizerInterval) {
                clearInterval(this._visualizerInterval);
                this._visualizerInterval = null;
            }
        },

        /**
         * Load demo preset - creates LFO modulating rotation.y
         * @private
         */
        _loadDemoPreset() {
            const state = CYMATICA.state._state;
            state.mod = state.mod || { lfos: {}, asrs: {}, routes: [], enabled: true };

            // Clear existing
            state.mod.lfos = {};
            state.mod.asrs = {};
            state.mod.routes = [];

            // Create demo LFO - slow sine wave
            const lfo1 = CYMATICA.mod.lfo.createLFO({
                waveform: 'sine',
                frequency: 0.3,
                amplitude: 1.0,
                offset: 0.5
            });
            state.mod.lfos[lfo1.id] = lfo1;

            // Create second LFO for letter scale wobble
            const lfo2 = CYMATICA.mod.lfo.createLFO({
                waveform: 'triangle',
                frequency: 0.8,
                amplitude: 0.5,
                offset: 0.5
            });
            state.mod.lfos[lfo2.id] = lfo2;

            // Create demo ASR envelope
            const asr = CYMATICA.mod.asr.createASR({
                attack: 0.15,
                sustain: 0.8,
                release: 0.5
            });
            state.mod.asrs[asr.id] = asr;

            // Route LFO1 → rotation.y (gentle swaying)
            const route1 = CYMATICA.mod.hub.createRoute({
                sourceType: 'lfo',
                sourceId: lfo1.id,
                target: 'rotation.y',
                min: -25,
                max: 25
            });
            state.mod.routes.push(route1);

            // Route LFO2 → first letter scale (breathing effect)
            const route2 = CYMATICA.mod.hub.createRoute({
                sourceType: 'lfo',
                sourceId: lfo2.id,
                target: 'letters[0].scale',
                min: 0.9,
                max: 1.3
            });
            state.mod.routes.push(route2);

            // Route ASR → zoom (pulse on trigger)
            const route3 = CYMATICA.mod.hub.createRoute({
                sourceType: 'asr',
                sourceId: asr.id,
                target: 'zoom',
                min: 0.5,
                max: 0.7
            });
            state.mod.routes.push(route3);

            // Re-render UI
            this._render();

            console.log('cymatica.modUI: demo preset loaded');
            CYMATICA.events.publish('mod:preset:loaded', { name: 'demo' });
        }
    };

})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js/ui
# file: controls.js
# notes:
#MULTICAT_END
// CYMATICA.ui - UI Control Binding
(function(CYMATICA) {
    'use strict';

    const state = CYMATICA.state._state;
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    function updatePositionInputs() {
        const letter = state.letters[state.selectedLetter];
        $('#pos-x').value = Math.round(letter.x);
        $('#pos-y').value = Math.round(letter.y);
        $('#pos-z').value = Math.round(letter.z);
        $('#letter-scale').value = letter.scale;
        $('#scale-val').textContent = letter.scale.toFixed(1);
    }

    function bindControls() {
        // Panel toggle
        $('#panel-toggle')?.addEventListener('click', () => {
            $('#side-panel').classList.toggle('hidden');
            $('#panel-toggle').textContent = $('#side-panel').classList.contains('hidden') ? '\u25B6' : '\u25C0';
        });

        // Section collapse
        $$('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
            });
        });

        // Collapse/Expand all
        $('#btn-collapse-all')?.addEventListener('click', () => {
            $$('.section-header').forEach(header => header.classList.add('collapsed'));
        });
        $('#btn-expand-all')?.addEventListener('click', () => {
            $$('.section-header').forEach(header => header.classList.remove('collapsed'));
        });

        // Play/Pause animation
        const playPauseBtn = $('#btn-play-pause');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                state.animating = !state.animating;
                playPauseBtn.innerHTML = state.animating ? '&#9724;' : '&#9654;';
                playPauseBtn.classList.toggle('active', state.animating);
                $('#toggle-animation')?.classList.toggle('active', state.animating);
            });
        }

        // Random layout
        $('#btn-random')?.addEventListener('click', () => {
            state.letters.forEach(l => {
                l.x = (Math.random() - 0.5) * 600;
                l.y = (Math.random() - 0.5) * 300;
                l.z = (Math.random() - 0.5) * 200;
                l.scale = 0.5 + Math.random() * 1.5;
            });
            updatePositionInputs();
        });

        // Save state
        $('#btn-save')?.addEventListener('click', () => {
            if (CYMATICA.Persistence?.save) {
                CYMATICA.Persistence.save();
                const btn = $('#btn-save');
                btn.classList.add('active');
                setTimeout(() => btn.classList.remove('active'), 500);
            }
        });

        // Reset/Center button
        $('#btn-reset')?.addEventListener('click', () => {
            CYMATICA.state.reset();
        });

        // Toggle switches
        const toggleHandler = (id, prop, el) => {
            const elem = $(id);
            if (!elem) return;
            elem.addEventListener('click', function() {
                this.classList.toggle('active');
                state[prop] = this.classList.contains('active');
                if (el) el.style.display = state[prop] ? '' : 'none';
                if (prop === 'drawOn' && state.drawOn) {
                    state.drawProgress = 0;
                }
            });
        };

        toggleHandler('#toggle-animation', 'animating');
        toggleHandler('#toggle-scanlines', 'scanlines', $('#scanlines'));
        toggleHandler('#toggle-vignette', 'vignette', $('#vignette'));
        toggleHandler('#toggle-drawon', 'drawOn');
        toggleHandler('#toggle-drawloop', 'drawLoop');
        toggleHandler('#toggle-oscillate', 'colorOscillate');

        // Slider binding helper
        const bindSlider = (sliderId, valId, prop, format = v => v) => {
            const slider = $(sliderId);
            const valEl = $(valId);
            if (!slider) return;
            slider.addEventListener('input', () => {
                state[prop] = parseFloat(slider.value);
                if (valEl) valEl.textContent = format(state[prop]);
            });
        };

        bindSlider('#anim-speed', '#anim-speed-val', 'animSpeed', v => v.toFixed(1) + 'x');
        bindSlider('#concentric-count', '#concentric-val', 'concentric', v => Math.round(v));
        bindSlider('#layer-offset', '#offset-val', 'layerOffset', v => v.toFixed(1));
        bindSlider('#stroke-width', '#stroke-val', 'strokeWidth', v => v.toFixed(2));
        bindSlider('#glow-intensity', '#glow-val', 'glowIntensity', v => Math.round(v));
        bindSlider('#fov', '#fov-val', 'fov', v => Math.round(v));
        bindSlider('#cam-z', '#cam-z-val', 'cameraZ', v => Math.round(v));
        bindSlider('#draw-speed', '#draw-speed-val', 'drawSpeed', v => v.toFixed(1) + 's');
        bindSlider('#oscillate-speed', '#oscillate-speed-val', 'oscillateSpeed', v => v.toFixed(1));

        // Rotation speed sliders
        $('#rot-x-speed')?.addEventListener('input', (e) => {
            state.rotSpeed.x = parseFloat(e.target.value);
            $('#rot-x-val').textContent = Math.round(state.rotSpeed.x);
        });
        $('#rot-y-speed')?.addEventListener('input', (e) => {
            state.rotSpeed.y = parseFloat(e.target.value);
            $('#rot-y-val').textContent = Math.round(state.rotSpeed.y);
        });
        $('#rot-z-speed')?.addEventListener('input', (e) => {
            state.rotSpeed.z = parseFloat(e.target.value);
            $('#rot-z-val').textContent = Math.round(state.rotSpeed.z);
        });

        // Color pickers
        $('#color-primary')?.addEventListener('input', (e) => {
            state.colorPrimary = e.target.value;
        });
        $('#color-secondary')?.addEventListener('input', (e) => {
            state.colorSecondary = e.target.value;
        });

        // Letter selection
        $$('.letter-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                $$('.letter-cell').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
                state.selectedLetter = parseInt(cell.dataset.index);
                updatePositionInputs();
            });
        });

        // Position inputs
        $('#pos-x')?.addEventListener('change', (e) => {
            state.letters[state.selectedLetter].x = parseFloat(e.target.value) || 0;
        });
        $('#pos-y')?.addEventListener('change', (e) => {
            state.letters[state.selectedLetter].y = parseFloat(e.target.value) || 0;
        });
        $('#pos-z')?.addEventListener('change', (e) => {
            state.letters[state.selectedLetter].z = parseFloat(e.target.value) || 0;
        });

        // Letter scale
        $('#letter-scale')?.addEventListener('input', (e) => {
            const scale = parseFloat(e.target.value);
            state.letters[state.selectedLetter].scale = scale;
            $('#scale-val').textContent = scale.toFixed(1);
        });

        // Presets
        const presets = {
            tempest: { colorPrimary: '#00ffff', colorSecondary: '#ffff00', concentric: 6, glowIntensity: 80 },
            battlezone: { colorPrimary: '#00ff00', colorSecondary: '#00aa00', concentric: 3, glowIntensity: 50 },
            starwars: { colorPrimary: '#ff0000', colorSecondary: '#ffff00', concentric: 5, glowIntensity: 70 },
            asteroids: { colorPrimary: '#ffffff', colorSecondary: '#888888', concentric: 2, glowIntensity: 40 },
            neon: { colorPrimary: '#ff00ff', colorSecondary: '#00ffff', concentric: 8, glowIntensity: 90 },
            arcade: { colorPrimary: '#ff6600', colorSecondary: '#00ff66', concentric: 4, glowIntensity: 60 }
        };

        $$('.preset-btn[data-preset]').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = presets[btn.dataset.preset];
                if (preset) Object.assign(state, preset);
            });
        });

        // Layout presets
        const layouts = {
            flat: () => state.letters.forEach((l, i) => { l.x = (i - 3.5) * 100; l.y = 0; l.z = 0; }),
            arc: () => {
                const radius = 400;
                state.letters.forEach((l, i) => {
                    const angle = (i - 3.5) * 0.2;
                    l.x = Math.sin(angle) * radius;
                    l.y = 0;
                    l.z = Math.cos(angle) * radius - radius;
                });
            },
            wave: () => state.letters.forEach((l, i) => {
                l.x = (i - 3.5) * 100;
                l.y = Math.sin(i * 0.8) * 50;
                l.z = Math.cos(i * 0.8) * 30;
            }),
            spiral: () => state.letters.forEach((l, i) => {
                const angle = i * 0.4;
                const radius = 100 + i * 30;
                l.x = Math.cos(angle) * radius;
                l.y = (i - 3.5) * 30;
                l.z = Math.sin(angle) * radius;
            }),
            scatter: () => state.letters.forEach(l => {
                l.x = (Math.random() - 0.5) * 600;
                l.y = (Math.random() - 0.5) * 300;
                l.z = (Math.random() - 0.5) * 200;
            }),
            cylinder: () => {
                const radius = 300;
                state.letters.forEach((l, i) => {
                    const angle = (i / 8) * Math.PI * 2;
                    l.x = Math.sin(angle) * radius;
                    l.y = 0;
                    l.z = Math.cos(angle) * radius;
                });
            }
        };

        $$('.preset-btn[data-layout]').forEach(btn => {
            btn.addEventListener('click', () => {
                const layout = layouts[btn.dataset.layout];
                if (layout) {
                    layout();
                    updatePositionInputs();
                }
            });
        });
    }

    function init() {
        bindControls();
        updatePositionInputs();
    }

    CYMATICA.ui = { init, updatePositionInputs };
})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js/ui
# file: config-panel.js
# notes:
#MULTICAT_END
/**
 * CYMATICA Config Panel Module
 * Draggable, collapsible configuration panel
 */
(function(CYMATICA) {
    'use strict';

    const CymaticaConfigPanel = {
        panel: null,
        fab: null,
        isOpen: false,
        position: { x: null, y: null },
        collapsedSections: new Set(),

        /**
         * Initialize config panel
         */
        init: function() {
            this.panel = document.getElementById('config-panel');
            this.fab = document.getElementById('config-fab');

            if (!this.panel && !this.fab) {
                // Create FAB if not present and TUT is loaded
                if (window.TERRAIN?.TUT) {
                    // TUT handles its own FAB
                    return;
                }
            }

            this.restoreState();
            this.bindEvents();
            console.log('[CYMATICA.ConfigPanel] Initialized');
        },

        /**
         * Bind event listeners
         */
        bindEvents: function() {
            // FAB click
            if (this.fab) {
                this.fab.addEventListener('click', () => this.toggle());
            }

            // Panel header drag
            if (this.panel) {
                const header = this.panel.querySelector('.panel-header, .config-panel-header');
                if (header) {
                    this.makeDraggable(header);
                }

                // Section collapse
                this.panel.querySelectorAll('.section-header').forEach(header => {
                    header.addEventListener('click', () => this.toggleSection(header));
                });

                // Close button
                const closeBtn = this.panel.querySelector('.close-btn, [data-action="close"]');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.close());
                }
            }

            // Escape to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });
        },

        /**
         * Toggle panel visibility
         */
        toggle: function() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        },

        /**
         * Open panel
         */
        open: function() {
            if (this.panel) {
                this.panel.classList.add('active');
                this.isOpen = true;

                if (CYMATICA.events) {
                    CYMATICA.events.emit(CYMATICA.Events.PANEL_OPEN);
                }
            }
        },

        /**
         * Close panel
         */
        close: function() {
            if (this.panel) {
                this.panel.classList.remove('active');
                this.isOpen = false;

                if (CYMATICA.events) {
                    CYMATICA.events.emit(CYMATICA.Events.PANEL_CLOSE);
                }
            }
        },

        /**
         * Make element draggable
         */
        makeDraggable: function(header) {
            let isDragging = false;
            let startX, startY, initialX, initialY;

            const panel = this.panel;
            const self = this;

            header.addEventListener('mousedown', (e) => {
                if (e.target.closest('.section-toggle, button, input')) return;

                isDragging = true;
                header.style.cursor = 'grabbing';

                const rect = panel.getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;
                startX = e.clientX;
                startY = e.clientY;

                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                const newX = initialX + dx;
                const newY = initialY + dy;

                panel.style.position = 'fixed';
                panel.style.left = newX + 'px';
                panel.style.top = newY + 'px';
                panel.style.right = 'auto';
                panel.style.bottom = 'auto';

                self.position = { x: newX, y: newY };
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    header.style.cursor = 'grab';
                    self.saveState();
                }
            });

            header.style.cursor = 'grab';
        },

        /**
         * Toggle section collapse
         */
        toggleSection: function(header) {
            const content = header.nextElementSibling;
            const icon = header.querySelector('.section-toggle, .collapse-icon');

            if (content) {
                content.classList.toggle('collapsed');

                const sectionId = header.dataset.section || header.textContent.trim();

                if (content.classList.contains('collapsed')) {
                    this.collapsedSections.add(sectionId);
                } else {
                    this.collapsedSections.delete(sectionId);
                }

                if (icon) {
                    icon.classList.toggle('collapsed');
                }

                this.saveState();
            }
        },

        /**
         * Collapse all sections
         */
        collapseAll: function() {
            if (this.panel) {
                this.panel.querySelectorAll('.section-content').forEach(content => {
                    content.classList.add('collapsed');
                });
                this.panel.querySelectorAll('.section-toggle, .collapse-icon').forEach(icon => {
                    icon.classList.add('collapsed');
                });
            }
        },

        /**
         * Expand all sections
         */
        expandAll: function() {
            if (this.panel) {
                this.panel.querySelectorAll('.section-content').forEach(content => {
                    content.classList.remove('collapsed');
                });
                this.panel.querySelectorAll('.section-toggle, .collapse-icon').forEach(icon => {
                    icon.classList.remove('collapsed');
                });
            }
        },

        /**
         * Save panel state
         */
        saveState: function() {
            if (CYMATICA.Persistence?.savePanelState) {
                CYMATICA.Persistence.savePanelState({
                    position: this.position,
                    collapsedSections: Array.from(this.collapsedSections)
                });
            }
        },

        /**
         * Restore panel state
         */
        restoreState: function() {
            const saved = CYMATICA.Persistence?.loadPanelState?.();

            if (saved) {
                // Restore position
                if (saved.position && saved.position.x !== null && this.panel) {
                    this.panel.style.position = 'fixed';
                    this.panel.style.left = saved.position.x + 'px';
                    this.panel.style.top = saved.position.y + 'px';
                    this.panel.style.right = 'auto';
                    this.panel.style.bottom = 'auto';
                    this.position = saved.position;
                }

                // Restore collapsed sections
                if (saved.collapsedSections && this.panel) {
                    saved.collapsedSections.forEach(sectionId => {
                        this.collapsedSections.add(sectionId);
                        const header = this.panel.querySelector(`[data-section="${sectionId}"]`) ||
                                       Array.from(this.panel.querySelectorAll('.section-header'))
                                            .find(h => h.textContent.trim() === sectionId);
                        if (header) {
                            const content = header.nextElementSibling;
                            const icon = header.querySelector('.section-toggle, .collapse-icon');
                            if (content) content.classList.add('collapsed');
                            if (icon) icon.classList.add('collapsed');
                        }
                    });
                }
            }
        }
    };

    CYMATICA.ConfigPanel = CymaticaConfigPanel;

})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js
# file: events.js
# notes:
#MULTICAT_END
// CYMATICA.events - PubSub Event System
(function(CYMATICA) {
    'use strict';

    const subscribers = {};

    CYMATICA.events = {
        subscribe(event, callback, context) {
            if (!subscribers[event]) subscribers[event] = [];
            subscribers[event].push({ callback, context });
            return () => this.unsubscribe(event, callback);
        },

        unsubscribe(event, callback) {
            if (!subscribers[event]) return;
            subscribers[event] = subscribers[event].filter(s => s.callback !== callback);
        },

        publish(event, data) {
            if (!subscribers[event]) return;
            subscribers[event].forEach(s => {
                s.callback.call(s.context, data);
            });
        },

        clear(event) {
            if (event) {
                delete subscribers[event];
            } else {
                Object.keys(subscribers).forEach(k => delete subscribers[k]);
            }
        }
    };
})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js
# file: boot.js
# notes:
#MULTICAT_END
// CYMATICA.boot - Application Bootloader
(function(CYMATICA) {
    'use strict';

    // Boot sequence with nested module support (e.g., 'mod.lfo')
    const bootSequence = [
        'mod.lfo',
        'mod.asr',
        'mod.hub',
        'mod.broadcast',
        'render',
        'input',
        'ui',
        'modUI'
    ];

    function boot() {
        console.log('cymatica: booting...');

        bootSequence.forEach(modulePath => {
            // Support nested modules like 'mod.lfo'
            const parts = modulePath.split('.');
            let module = CYMATICA;
            for (const part of parts) {
                module = module?.[part];
            }

            if (module && typeof module.init === 'function') {
                module.init();
                console.log(`cymatica: ${modulePath} initialized`);
            }
        });

        // Start modulation engine
        CYMATICA.mod?.lfo?.start();

        // Start animation loop
        requestAnimationFrame(CYMATICA.render.animate);

        console.log('cymatica: ready');
        CYMATICA.events.publish('boot:complete');
    }

    // Auto-boot when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    CYMATICA.boot = boot;
})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js
# file: ui.js
# notes:
#MULTICAT_END
// CYMATICA.ui - UI Control Binding
(function(CYMATICA) {
    'use strict';

    const state = CYMATICA.state._state;
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    function updatePositionInputs() {
        const letter = state.letters[state.selectedLetter];
        $('#pos-x').value = Math.round(letter.x);
        $('#pos-y').value = Math.round(letter.y);
        $('#pos-z').value = Math.round(letter.z);
        $('#letter-scale').value = letter.scale;
        $('#scale-val').textContent = letter.scale.toFixed(1);
    }

    function bindControls() {
        // Panel toggle
        $('#panel-toggle')?.addEventListener('click', () => {
            $('#side-panel').classList.toggle('hidden');
            $('#panel-toggle').textContent = $('#side-panel').classList.contains('hidden') ? '\u25B6' : '\u25C0';
        });

        // Section collapse
        $$('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
            });
        });

        // Reset/Center button
        $('#btn-reset')?.addEventListener('click', () => {
            CYMATICA.state.reset();
        });

        // Toggle switches
        const toggleHandler = (id, prop, el) => {
            const elem = $(id);
            if (!elem) return;
            elem.addEventListener('click', function() {
                this.classList.toggle('active');
                state[prop] = this.classList.contains('active');
                if (el) el.style.display = state[prop] ? '' : 'none';
                if (prop === 'drawOn' && state.drawOn) {
                    state.drawProgress = 0;
                }
            });
        };

        toggleHandler('#toggle-animation', 'animating');
        toggleHandler('#toggle-scanlines', 'scanlines', $('#scanlines'));
        toggleHandler('#toggle-vignette', 'vignette', $('#vignette'));
        toggleHandler('#toggle-drawon', 'drawOn');
        toggleHandler('#toggle-drawloop', 'drawLoop');
        toggleHandler('#toggle-oscillate', 'colorOscillate');

        // Slider binding helper
        const bindSlider = (sliderId, valId, prop, format = v => v) => {
            const slider = $(sliderId);
            const valEl = $(valId);
            if (!slider) return;
            slider.addEventListener('input', () => {
                state[prop] = parseFloat(slider.value);
                if (valEl) valEl.textContent = format(state[prop]);
            });
        };

        bindSlider('#anim-speed', '#anim-speed-val', 'animSpeed', v => v.toFixed(1) + 'x');
        bindSlider('#concentric-count', '#concentric-val', 'concentric', v => Math.round(v));
        bindSlider('#layer-offset', '#offset-val', 'layerOffset', v => v.toFixed(1));
        bindSlider('#stroke-width', '#stroke-val', 'strokeWidth', v => v.toFixed(2));
        bindSlider('#glow-intensity', '#glow-val', 'glowIntensity', v => Math.round(v));
        bindSlider('#fov', '#fov-val', 'fov', v => Math.round(v));
        bindSlider('#cam-z', '#cam-z-val', 'cameraZ', v => Math.round(v));
        bindSlider('#draw-speed', '#draw-speed-val', 'drawSpeed', v => v.toFixed(1) + 's');
        bindSlider('#oscillate-speed', '#oscillate-speed-val', 'oscillateSpeed', v => v.toFixed(1));

        // Rotation speed sliders
        $('#rot-x-speed')?.addEventListener('input', (e) => {
            state.rotSpeed.x = parseFloat(e.target.value);
            $('#rot-x-val').textContent = Math.round(state.rotSpeed.x);
        });
        $('#rot-y-speed')?.addEventListener('input', (e) => {
            state.rotSpeed.y = parseFloat(e.target.value);
            $('#rot-y-val').textContent = Math.round(state.rotSpeed.y);
        });
        $('#rot-z-speed')?.addEventListener('input', (e) => {
            state.rotSpeed.z = parseFloat(e.target.value);
            $('#rot-z-val').textContent = Math.round(state.rotSpeed.z);
        });

        // Color pickers
        $('#color-primary')?.addEventListener('input', (e) => {
            state.colorPrimary = e.target.value;
        });
        $('#color-secondary')?.addEventListener('input', (e) => {
            state.colorSecondary = e.target.value;
        });

        // Letter selection
        $$('.letter-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                $$('.letter-cell').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
                state.selectedLetter = parseInt(cell.dataset.index);
                updatePositionInputs();
            });
        });

        // Position inputs
        $('#pos-x')?.addEventListener('change', (e) => {
            state.letters[state.selectedLetter].x = parseFloat(e.target.value) || 0;
        });
        $('#pos-y')?.addEventListener('change', (e) => {
            state.letters[state.selectedLetter].y = parseFloat(e.target.value) || 0;
        });
        $('#pos-z')?.addEventListener('change', (e) => {
            state.letters[state.selectedLetter].z = parseFloat(e.target.value) || 0;
        });

        // Letter scale
        $('#letter-scale')?.addEventListener('input', (e) => {
            const scale = parseFloat(e.target.value);
            state.letters[state.selectedLetter].scale = scale;
            $('#scale-val').textContent = scale.toFixed(1);
        });

        // Presets
        const presets = {
            tempest: { colorPrimary: '#00ffff', colorSecondary: '#ffff00', concentric: 6, glowIntensity: 80 },
            battlezone: { colorPrimary: '#00ff00', colorSecondary: '#00aa00', concentric: 3, glowIntensity: 50 },
            starwars: { colorPrimary: '#ff0000', colorSecondary: '#ffff00', concentric: 5, glowIntensity: 70 },
            asteroids: { colorPrimary: '#ffffff', colorSecondary: '#888888', concentric: 2, glowIntensity: 40 },
            neon: { colorPrimary: '#ff00ff', colorSecondary: '#00ffff', concentric: 8, glowIntensity: 90 },
            arcade: { colorPrimary: '#ff6600', colorSecondary: '#00ff66', concentric: 4, glowIntensity: 60 }
        };

        $$('.preset-btn[data-preset]').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = presets[btn.dataset.preset];
                if (preset) Object.assign(state, preset);
            });
        });

        // Layout presets
        const layouts = {
            flat: () => state.letters.forEach((l, i) => { l.x = (i - 3.5) * 100; l.y = 0; l.z = 0; }),
            arc: () => {
                const radius = 400;
                state.letters.forEach((l, i) => {
                    const angle = (i - 3.5) * 0.2;
                    l.x = Math.sin(angle) * radius;
                    l.y = 0;
                    l.z = Math.cos(angle) * radius - radius;
                });
            },
            wave: () => state.letters.forEach((l, i) => {
                l.x = (i - 3.5) * 100;
                l.y = Math.sin(i * 0.8) * 50;
                l.z = Math.cos(i * 0.8) * 30;
            }),
            spiral: () => state.letters.forEach((l, i) => {
                const angle = i * 0.4;
                const radius = 100 + i * 30;
                l.x = Math.cos(angle) * radius;
                l.y = (i - 3.5) * 30;
                l.z = Math.sin(angle) * radius;
            }),
            scatter: () => state.letters.forEach(l => {
                l.x = (Math.random() - 0.5) * 600;
                l.y = (Math.random() - 0.5) * 300;
                l.z = (Math.random() - 0.5) * 200;
            }),
            cylinder: () => {
                const radius = 300;
                state.letters.forEach((l, i) => {
                    const angle = (i / 8) * Math.PI * 2;
                    l.x = Math.sin(angle) * radius;
                    l.y = 0;
                    l.z = Math.cos(angle) * radius;
                });
            }
        };

        $$('.preset-btn[data-layout]').forEach(btn => {
            btn.addEventListener('click', () => {
                const layout = layouts[btn.dataset.layout];
                if (layout) {
                    layout();
                    updatePositionInputs();
                }
            });
        });
    }

    function init() {
        bindControls();
        updatePositionInputs();
    }

    CYMATICA.ui = { init, updatePositionInputs };
})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js/core
# file: events.js
# notes:
#MULTICAT_END
/**
 * CYMATICA Events Module
 * Pub/sub event bus with DOM binding support
 */
(function(CYMATICA) {
    'use strict';

    const listeners = {};

    const CymaticaEvents = {
        /**
         * Subscribe to an event (terrain-compatible)
         */
        on: function(event, callback) {
            if (!listeners[event]) {
                listeners[event] = [];
            }
            listeners[event].push(callback);

            // Return unsubscribe function
            return function() {
                const index = listeners[event].indexOf(callback);
                if (index > -1) {
                    listeners[event].splice(index, 1);
                }
            };
        },

        /**
         * Subscribe to an event (one-time)
         */
        once: function(event, callback) {
            const unsubscribe = this.on(event, function(...args) {
                unsubscribe();
                callback.apply(this, args);
            });
        },

        /**
         * Emit an event (terrain-compatible)
         */
        emit: function(event, data) {
            if (listeners[event]) {
                listeners[event].forEach(callback => {
                    try {
                        callback(data);
                    } catch (e) {
                        console.error(`[CYMATICA.Events] Error in ${event} handler:`, e);
                    }
                });
            }
        },

        /**
         * Remove all listeners for an event
         */
        off: function(event) {
            if (event) {
                delete listeners[event];
            } else {
                Object.keys(listeners).forEach(key => delete listeners[key]);
            }
        },

        // Legacy API aliases (keep backwards compatibility)
        subscribe: function(event, callback) {
            return this.on(event, callback);
        },

        publish: function(event, data) {
            this.emit(event, data);
        },

        // ================================
        // DOM Binding (data-cymatica-* attributes)
        // ================================

        _bindings: new WeakMap(),
        _observer: null,

        /**
         * Initialize DOM bindings
         */
        bindDOM: function() {
            this.scanBindings();
            this.setupMutationObserver();
            console.log('[CYMATICA.Events] DOM bindings initialized');
        },

        /**
         * Scan document for data-cymatica-bind attributes
         */
        scanBindings: function() {
            document.querySelectorAll('[data-cymatica-bind]').forEach(el => {
                this.bindElement(el);
            });

            document.querySelectorAll('[data-action]').forEach(el => {
                this.bindAction(el);
            });
        },

        /**
         * Bind an element to a state path
         */
        bindElement: function(el) {
            if (this._bindings.has(el)) return;

            const path = el.dataset.cymaticaBind;
            const format = el.dataset.cymaticaFormat || 'text';

            if (!path) return;

            const state = CYMATICA.state;
            if (!state) {
                console.warn('[CYMATICA.Events] State not available for binding');
                return;
            }

            // Set initial value
            this.updateElement(el, state.get(path), format);

            // Subscribe to state changes
            const unsubscribe = this.on(CymaticaEvents.STATE_CHANGE, (data) => {
                if (!data || !data.path || data.path === path || data.path === '*' || path.startsWith(data.path + '.')) {
                    this.updateElement(el, state.get(path), format);
                }
            });

            this._bindings.set(el, { path, format, unsubscribe });
        },

        /**
         * Update element based on format type
         */
        updateElement: function(el, value, format) {
            switch (format) {
                case 'text':
                    el.textContent = value ?? '';
                    break;
                case 'html':
                    el.innerHTML = value ?? '';
                    break;
                case 'value':
                    el.value = value ?? '';
                    break;
                case 'visible':
                    el.classList.toggle('hidden', !value);
                    break;
                case 'hidden':
                    el.classList.toggle('hidden', !!value);
                    break;
                case 'toggle':
                    el.classList.toggle('active', !!value);
                    break;
                default:
                    el.textContent = value ?? '';
            }
        },

        /**
         * Bind an action element
         */
        bindAction: function(el) {
            if (el._actionBound) return;

            const actionSpec = el.dataset.action;
            if (!actionSpec) return;

            const [eventName, ...payloadParts] = actionSpec.split(':');
            const payloadStr = payloadParts.join(':');

            el.addEventListener('click', (e) => {
                e.preventDefault();
                let payload = {};

                if (payloadStr) {
                    try {
                        payload = JSON.parse(payloadStr);
                    } catch {
                        payload = { value: payloadStr };
                    }
                }

                this.emit(eventName, payload);
            });

            el._actionBound = true;
        },

        /**
         * Setup mutation observer for dynamically added elements
         */
        setupMutationObserver: function() {
            if (this._observer) return;

            this._observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.scanNodeBindings(node);
                        }
                    });
                });
            });

            this._observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },

        /**
         * Scan a node and its children for bindings
         */
        scanNodeBindings: function(node) {
            if (node.dataset) {
                if (node.dataset.cymaticaBind) {
                    this.bindElement(node);
                }
                if (node.dataset.action) {
                    this.bindAction(node);
                }
            }

            if (node.querySelectorAll) {
                node.querySelectorAll('[data-cymatica-bind]').forEach(el => {
                    this.bindElement(el);
                });
                node.querySelectorAll('[data-action]').forEach(el => {
                    this.bindAction(el);
                });
            }
        }
    };

    // Standard event names
    // Lifecycle
    CymaticaEvents.READY = 'cymatica:ready';
    CymaticaEvents.DESTROY = 'cymatica:destroy';

    // State
    CymaticaEvents.STATE_CHANGE = 'state:change';
    CymaticaEvents.STATE_LOADED = 'state:loaded';
    CymaticaEvents.STATE_SAVED = 'state:saved';
    CymaticaEvents.STATE_RESET = 'state:reset';

    // Mode & Theme
    CymaticaEvents.MODE_APPLIED = 'mode:applied';
    CymaticaEvents.THEME_CHANGED = 'theme:changed';

    // Animation
    CymaticaEvents.ANIMATION_START = 'animation:start';
    CymaticaEvents.ANIMATION_STOP = 'animation:stop';

    // UI
    CymaticaEvents.UI_TOGGLE = 'ui:toggle';
    CymaticaEvents.CONFIG_TOGGLE = 'config:toggle';
    CymaticaEvents.PANEL_OPEN = 'panel:open';
    CymaticaEvents.PANEL_CLOSE = 'panel:close';

    // Rendering
    CymaticaEvents.RENDER_FRAME = 'render:frame';
    CymaticaEvents.PRESET_APPLIED = 'preset:applied';
    CymaticaEvents.LAYOUT_CHANGED = 'layout:changed';

    CYMATICA.events = CymaticaEvents;
    CYMATICA.Events = CymaticaEvents; // Alias for terrain compatibility

})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js/core
# file: config.js
# notes:
#MULTICAT_END
/**
 * CYMATICA Configuration Module
 * Feature flags and application defaults
 */
(function(CYMATICA) {
    'use strict';

    // Resolve design mode from URL or config
    function resolveDesignMode(configDefault) {
        const urlParam = CYMATICA.Utils?.getUrlParam?.('design');
        if (urlParam === 'true') return true;
        if (urlParam === 'false') return false;
        return configDefault;
    }

    const CymaticaConfig = {
        version: '2.0.0',

        features: {
            // Design token FAB - hidden by default, ?design=true to enable
            designMode: resolveDesignMode(false),

            // State persistence to localStorage
            persistence: true,

            // Visual effects
            effects: true
        },

        animation: {
            autoRotate: false,
            speed: 1,
            rotSpeed: { x: 5, y: 15, z: 0 }
        },

        rendering: {
            concentric: 5,
            layerOffset: 2,
            strokeWidth: 1.5,
            glowIntensity: 60,
            colorPrimary: '#00ffff',
            colorSecondary: '#ff00aa',
            fov: 1000,
            cameraZ: 600
        },

        effects: {
            scanlines: true,
            vignette: true,
            drawOn: false,
            drawSpeed: 2,
            colorOscillate: false
        },

        ui: {
            sidePanel: true,
            configPanel: false,
            fab: true
        },

        data: {
            source: 'static',
            defaultsPath: 'data/defaults.json'
        },

        /**
         * Get a config value by dot-notation path
         */
        get: function(path) {
            return CYMATICA.Utils?.getByPath?.(this, path) ||
                   path.split('.').reduce((obj, key) => obj && obj[key], this);
        },

        /**
         * Set a config value by dot-notation path
         */
        set: function(path, value) {
            if (CYMATICA.Utils?.setByPath) {
                CYMATICA.Utils.setByPath(this, path, value);
            } else {
                const keys = path.split('.');
                const lastKey = keys.pop();
                const target = keys.reduce((obj, key) => obj[key], this);
                if (target) {
                    target[lastKey] = value;
                }
            }
        },

        /**
         * Initialize from merged config (mode + app overrides)
         */
        init: function(config) {
            const merge = (target, source) => {
                for (const key in source) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        target[key] = target[key] || {};
                        merge(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            };
            merge(this, config);
            console.log('[CYMATICA.Config] Initialized');
        }
    };

    CYMATICA.Config = CymaticaConfig;

})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js/core
# file: namespace.js
# notes:
#MULTICAT_END
/**
 * CYMATICA Namespace
 * Global namespace initialization
 */
window.CYMATICA = window.CYMATICA || {
    version: '2.0.0',
    modules: {}
};

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js/core
# file: state.js
# notes:
#MULTICAT_END
/**
 * CYMATICA State Module
 * Centralized state management with dot-notation access
 */
(function(CYMATICA) {
    'use strict';

    // Letter path definitions for vector rendering
    const LETTER_PATHS = {
        'C': [
            'M 85 25 Q 85 10 65 5 Q 40 0 20 20 Q 0 45 0 55 Q 0 70 15 85 Q 35 105 65 100 Q 85 95 85 80',
            'M 75 30 Q 75 20 60 15 Q 40 10 25 25 Q 10 45 10 55 Q 10 65 20 78 Q 38 95 60 90 Q 75 85 75 75'
        ],
        'Y': [
            'M 5 5 L 50 50',
            'M 95 5 L 50 50',
            'M 50 50 L 50 100',
            'M 20 20 L 35 35',
            'M 80 20 L 65 35'
        ],
        'M': [
            'M 5 100 L 5 5 L 50 60 L 95 5 L 95 100',
            'M 15 90 L 15 20',
            'M 85 90 L 85 20',
            'M 30 40 L 50 70 L 70 40'
        ],
        'A': [
            'M 5 100 L 50 5 L 95 100',
            'M 22 70 L 78 70',
            'M 20 85 L 50 20 L 80 85',
            'M 30 80 L 70 80'
        ],
        'T': [
            'M 5 5 L 95 5',
            'M 50 5 L 50 100',
            'M 5 15 L 20 5',
            'M 95 15 L 80 5',
            'M 15 15 L 85 15'
        ],
        'I': [
            'M 25 5 L 75 5',
            'M 25 100 L 75 100',
            'M 50 5 L 50 100',
            'M 35 5 L 35 15',
            'M 65 5 L 65 15',
            'M 35 100 L 35 90',
            'M 65 100 L 65 90'
        ],
        // Lowercase letters
        'c': [
            'M 80 30 Q 80 15 55 15 Q 25 15 15 50 Q 5 85 35 95 Q 60 100 80 85',
            'M 70 35 Q 70 25 55 25 Q 35 25 28 50 Q 20 75 40 85 Q 55 90 70 80'
        ],
        'y': [
            'M 10 15 L 50 75',
            'M 90 15 L 50 75 Q 40 100 25 110',
            'M 25 30 L 40 55',
            'M 75 30 L 60 55'
        ],
        'm': [
            'M 5 100 L 5 30',
            'M 5 40 Q 5 15 30 15 Q 50 15 50 40 L 50 100',
            'M 50 40 Q 50 15 75 15 Q 95 15 95 40 L 95 100',
            'M 15 90 L 15 45',
            'M 60 90 L 60 45'
        ],
        'a': [
            'M 75 30 Q 75 15 50 15 Q 20 15 15 50 Q 10 85 50 90 Q 75 90 75 70',
            'M 75 30 L 75 100',
            'M 65 35 Q 65 25 50 25 Q 30 25 27 50 Q 24 75 50 78 Q 65 78 65 65'
        ],
        't': [
            'M 50 5 L 50 85 Q 50 100 70 100',
            'M 25 30 L 80 30',
            'M 35 40 L 70 40'
        ],
        'i': [
            'M 50 30 L 50 100',
            'M 50 5 L 50 15',
            'M 35 30 L 65 30',
            'M 35 100 L 65 100'
        ]
    };

    // Expose letter paths
    CYMATICA.LETTER_PATHS = LETTER_PATHS;

    // Default state values
    const defaultState = {
        // Letter positions
        letters: [
            { char: 'c', x: -350, y: 0, z: 0, scale: 1 },
            { char: 'y', x: -250, y: 0, z: 0, scale: 1 },
            { char: 'm', x: -150, y: 0, z: 0, scale: 1 },
            { char: 'a', x: -50, y: 0, z: 0, scale: 1 },
            { char: 't', x: 50, y: 0, z: 0, scale: 1 },
            { char: 'i', x: 150, y: 0, z: 0, scale: 1 },
            { char: 'c', x: 250, y: 0, z: 0, scale: 1 },
            { char: 'a', x: 350, y: 0, z: 0, scale: 1 }
        ],
        selectedLetter: 0,

        // Rotation
        rotation: { x: 0, y: 0, z: 0 },
        targetRotation: { x: 0, y: 0, z: 0 },
        rotSpeed: { x: 5, y: 15, z: 0 },

        // Camera/view
        zoom: 0.5,
        targetZoom: 0.5,
        minZoom: 0.2,
        maxZoom: 5,
        zoomSpeed: 0.001,
        zoomLerp: 0.15,
        // Pan
        panX: 0,
        panY: 0,
        targetPanX: 0,
        targetPanY: 0,
        panLerp: 0.15,

        // Input
        isDragging: false,
        isPanning: false,
        isPinching: false,
        lastMouse: { x: 0, y: 0 },
        lastPinchDist: 0,
        sensitivity: 0.5,
        lerpFactor: 0.12,

        // Animation
        animating: false,
        animSpeed: 1,
        beamPhase: 0,

        // Rendering
        concentric: 5,
        layerOffset: 2,
        strokeWidth: 1.5,
        glowIntensity: 60,
        colorPrimary: '#00ffff',
        colorSecondary: '#ff00aa',
        fov: 1000,
        cameraZ: 600,

        // Effects
        scanlines: true,
        vignette: true,
        drawOn: false,
        drawSpeed: 2,
        drawProgress: 1,
        drawLoop: true,
        colorOscillate: false,
        oscillateSpeed: 1,

        // Internal (computed during render)
        _oscillatedPrimary: null,
        _oscillatedSecondary: null
    };

    // Active state (mutable copy)
    const state = JSON.parse(JSON.stringify(defaultState));

    // State API
    const CymaticaState = {
        /**
         * Get state value by key or dot-notation path
         * @param {string} path - Key or dot-notation path (e.g., 'rotation.x')
         * @returns {*} Value at path, or entire state if no path
         */
        get: function(path) {
            if (!path) return state;

            // Support dot-notation
            if (path.includes('.')) {
                return CYMATICA.Utils?.getByPath?.(state, path) ||
                       path.split('.').reduce((obj, key) => obj && obj[key], state);
            }

            return state[path];
        },

        /**
         * Set state value by key or dot-notation path
         * @param {string} path - Key or dot-notation path
         * @param {*} value - Value to set
         */
        set: function(path, value) {
            let old;

            if (path.includes('.')) {
                old = this.get(path);
                if (CYMATICA.Utils?.setByPath) {
                    CYMATICA.Utils.setByPath(state, path, value);
                } else {
                    const keys = path.split('.');
                    let current = state;
                    for (let i = 0; i < keys.length - 1; i++) {
                        if (!(keys[i] in current)) current[keys[i]] = {};
                        current = current[keys[i]];
                    }
                    current[keys[keys.length - 1]] = value;
                }
            } else {
                old = state[path];
                state[path] = value;
            }

            // Emit events
            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.STATE_CHANGE, { path, value, old });
                CYMATICA.events.emit(`state:${path}`, { value, old });
            }
        },

        /**
         * Get entire state for serialization
         * @returns {Object} Deep copy of state
         */
        getAll: function() {
            // Filter out internal properties (starting with _)
            const filtered = {};
            for (const key in state) {
                if (!key.startsWith('_')) {
                    filtered[key] = state[key];
                }
            }
            return JSON.parse(JSON.stringify(filtered));
        },

        /**
         * Replace entire state (for loading saved state)
         * @param {Object} newState - State object to load
         */
        replaceAll: function(newState) {
            // Merge new state into current state
            for (const key in newState) {
                if (key in state && !key.startsWith('_')) {
                    state[key] = newState[key];
                }
            }

            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.STATE_CHANGE, { path: '*', value: state });
                CYMATICA.events.emit(CYMATICA.Events.STATE_LOADED, { state: state });
            }
        },

        /**
         * Reset state to defaults
         */
        reset: function() {
            state.rotation = { x: 0, y: 0, z: 0 };
            state.targetRotation = { x: 0, y: 0, z: 0 };
            state.zoom = 0.5;
            state.targetZoom = 0.5;
            state.panX = 0;
            state.panY = 0;
            state.targetPanX = 0;
            state.targetPanY = 0;

            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.STATE_RESET);
                CYMATICA.events.emit(CYMATICA.Events.STATE_CHANGE, { path: '*', value: state });
            }
        },

        /**
         * Reset to factory defaults
         */
        resetToDefaults: function() {
            const copy = JSON.parse(JSON.stringify(defaultState));
            for (const key in copy) {
                state[key] = copy[key];
            }

            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.STATE_RESET);
                CYMATICA.events.emit(CYMATICA.Events.STATE_CHANGE, { path: '*', value: state });
            }
        },

        // Direct access for performance-critical paths (render loop)
        _state: state,
        _defaults: defaultState
    };

    CYMATICA.state = CymaticaState;
    CYMATICA.State = CymaticaState; // Alias for terrain compatibility

})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js/core
# file: utils.js
# notes:
#MULTICAT_END
/**
 * CYMATICA Utils Module
 * Shared utility functions
 */
(function(CYMATICA) {
    'use strict';

    const CymaticaUtils = {
        /**
         * Cached URLSearchParams instance
         */
        _urlParams: null,

        /**
         * Get URLSearchParams (cached)
         */
        getUrlParams: function() {
            if (!this._urlParams) {
                this._urlParams = new URLSearchParams(window.location.search);
            }
            return this._urlParams;
        },

        /**
         * Get a URL parameter value
         */
        getUrlParam: function(name, defaultValue = null) {
            const value = this.getUrlParams().get(name);
            return value !== null ? value : defaultValue;
        },

        /**
         * Check if URL has a parameter
         */
        hasUrlParam: function(name) {
            return this.getUrlParams().has(name);
        },

        /**
         * Get URL parameter as boolean
         */
        getUrlParamBool: function(name, defaultValue = false) {
            const value = this.getUrlParams().get(name);
            if (value === null) return defaultValue;
            return value === 'true' || value === '1' || value === '';
        },

        /**
         * Debounce a function
         */
        debounce: function(fn, delay) {
            let timer = null;
            return function(...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, args), delay);
            };
        },

        /**
         * Throttle a function
         */
        throttle: function(fn, limit) {
            let inThrottle = false;
            return function(...args) {
                if (!inThrottle) {
                    fn.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Generate a unique ID
         */
        uniqueId: function(prefix) {
            return (prefix || 'id') + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        },

        /**
         * Deep clone an object
         */
        deepClone: function(obj) {
            return JSON.parse(JSON.stringify(obj));
        },

        /**
         * Get value from nested object by dot-notation path
         */
        getByPath: function(obj, path, defaultValue) {
            const keys = path.split('.');
            let result = obj;
            for (const key of keys) {
                if (result == null || typeof result !== 'object') {
                    return defaultValue;
                }
                result = result[key];
            }
            return result !== undefined ? result : defaultValue;
        },

        /**
         * Set value in nested object by dot-notation path
         */
        setByPath: function(obj, path, value) {
            const keys = path.split('.');
            let current = obj;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!(key in current) || typeof current[key] !== 'object') {
                    current[key] = {};
                }
                current = current[key];
            }
            current[keys[keys.length - 1]] = value;
        },

        // =====================================================================
        // Color Utilities (for rendering)
        // =====================================================================

        /**
         * Parse hex color to RGB
         */
        hexToRgb: function(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },

        /**
         * Convert RGB to hex
         */
        rgbToHex: function(r, g, b) {
            return '#' + [r, g, b].map(x => {
                const hex = Math.round(x).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        },

        /**
         * Interpolate between two hex colors
         */
        lerpColor: function(color1, color2, t) {
            const rgb1 = this.hexToRgb(color1);
            const rgb2 = this.hexToRgb(color2);
            if (!rgb1 || !rgb2) return color1;

            return this.rgbToHex(
                rgb1.r + (rgb2.r - rgb1.r) * t,
                rgb1.g + (rgb2.g - rgb1.g) * t,
                rgb1.b + (rgb2.b - rgb1.b) * t
            );
        },

        /**
         * HSL to RGB conversion
         */
        hslToRgb: function(h, s, l) {
            let r, g, b;
            if (s === 0) {
                r = g = b = l;
            } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }
            return { r: r * 255, g: g * 255, b: b * 255 };
        }
    };

    CYMATICA.Utils = CymaticaUtils;

})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js/core
# file: mode.js
# notes:
#MULTICAT_END
/**
 * CYMATICA Mode Module
 * Unified behavioral configuration
 *
 * Mode controls:
 * - Animation behavior
 * - Rendering settings
 * - Effects (scanlines, vignette, etc.)
 * - UI visibility
 * - Feature flags
 * - Default theme
 */
(function(CYMATICA) {
    'use strict';

    const CymaticaMode = {
        config: null,
        modeName: null,
        themeName: null,

        /**
         * Default mode (cymatica)
         */
        defaults: {
            mode: {
                name: 'Cymatica',
                version: '1.0.0',
                description: 'Quadrascan Vector Art - Default Mode'
            },
            defaultTheme: 'phosphor',
            animation: {
                autoRotate: false,
                speed: 1,
                rotSpeed: { x: 5, y: 15, z: 0 }
            },
            rendering: {
                concentric: 5,
                layerOffset: 2,
                strokeWidth: 1.5,
                glowIntensity: 60,
                colorPrimary: '#00ffff',
                colorSecondary: '#ff00aa',
                fov: 1000,
                cameraZ: 600
            },
            effects: {
                scanlines: true,
                vignette: true,
                drawOn: false,
                drawSpeed: 2,
                colorOscillate: false
            },
            ui: {
                sidePanel: true,
                configPanel: false,
                fab: true
            },
            features: {
                designMode: false,
                persistence: true,
                effects: true
            }
        },

        /**
         * Initialize mode module
         * @param {string} modePath - Path to mode JSON file
         * @param {string} themeName - Optional theme override
         */
        init: async function(modePath, themeName) {
            const path = modePath || 'modes/cymatica.mode.json';

            try {
                const response = await fetch(path);
                if (!response.ok) {
                    throw new Error('Mode not found: ' + path);
                }
                this.config = await response.json();
                this.modeName = this.config.mode?.name || 'Unknown';
                console.log('[CYMATICA.Mode] Loaded:', this.modeName);

                // Determine theme: explicit > mode default > system default
                this.themeName = themeName || this.config.defaultTheme || 'phosphor';

                return true;
            } catch (e) {
                console.log('[CYMATICA.Mode] Using defaults:', e.message);
                this.config = this.defaults;
                this.modeName = 'default';
                this.themeName = themeName || 'phosphor';
                return false;
            }
        },

        /**
         * Check if URL has a parameter
         */
        _hasUrlParam: function(name) {
            return CYMATICA.Utils?.hasUrlParam?.(name) ||
                   new URLSearchParams(window.location.search).has(name);
        },

        /**
         * Get URL parameter value
         */
        _getUrlParam: function(name) {
            return CYMATICA.Utils?.getUrlParam?.(name) ||
                   new URLSearchParams(window.location.search).get(name);
        },

        /**
         * Apply mode settings to CYMATICA.Config and state
         * URL parameters always override mode settings
         */
        apply: function() {
            if (!this.config) return;

            const Config = CYMATICA.Config;
            if (!Config) {
                console.warn('[CYMATICA.Mode] Config not available');
                return;
            }

            // Apply animation settings
            if (this.config.animation) {
                Config.animation = Config.animation || {};
                Object.assign(Config.animation, this.config.animation);
            }

            // Apply rendering settings
            if (this.config.rendering) {
                Config.rendering = Config.rendering || {};
                Object.assign(Config.rendering, this.config.rendering);
            }

            // Apply effects settings
            if (this.config.effects) {
                Config.effects = Config.effects || {};
                Object.assign(Config.effects, this.config.effects);
            }

            // Apply feature flags (but don't override URL params)
            if (this.config.features) {
                Config.features = Config.features || {};
                for (const [key, value] of Object.entries(this.config.features)) {
                    // Skip designMode if URL param is set
                    if (key === 'designMode' && this._hasUrlParam('design')) {
                        continue;
                    }
                    Config.features[key] = value;
                }
            }

            // Apply UI visibility
            if (this.config.ui) {
                Config.ui = Config.ui || {};
                Object.assign(Config.ui, this.config.ui);
            }

            // Apply to state if available
            if (CYMATICA.state && this.config.rendering) {
                const state = CYMATICA.state._state;
                if (state) {
                    // Apply rendering defaults to state
                    for (const [key, value] of Object.entries(this.config.rendering)) {
                        if (key in state) {
                            state[key] = value;
                        }
                    }
                    // Apply effects to state
                    if (this.config.effects) {
                        for (const [key, value] of Object.entries(this.config.effects)) {
                            if (key in state) {
                                state[key] = value;
                            }
                        }
                    }
                    // Apply animation to state
                    if (this.config.animation) {
                        if (this.config.animation.rotSpeed) {
                            state.rotSpeed = { ...this.config.animation.rotSpeed };
                        }
                        state.animSpeed = this.config.animation.speed || 1;
                        state.animating = this.config.animation.autoRotate || false;
                    }
                }
            }

            // Emit event
            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.MODE_APPLIED, {
                    mode: this.modeName,
                    theme: this.themeName,
                    config: this.config
                });
            }

            console.log('[CYMATICA.Mode] Applied:', this.modeName);
        },

        // =====================================================================
        // Query Methods
        // =====================================================================

        /**
         * Check if a feature is enabled
         */
        isFeatureEnabled: function(feature) {
            return this.config?.features?.[feature] !== false;
        },

        /**
         * Check if animation should auto-start
         */
        isAutoRotate: function() {
            return this.config?.animation?.autoRotate === true;
        },

        /**
         * Get UI visibility config
         */
        getUI: function() {
            return this.config?.ui || { sidePanel: true, configPanel: false, fab: true };
        },

        /**
         * Get rendering config
         */
        getRendering: function() {
            return this.config?.rendering || this.defaults.rendering;
        },

        /**
         * Get effects config
         */
        getEffects: function() {
            return this.config?.effects || this.defaults.effects;
        },

        /**
         * Get animation config
         */
        getAnimation: function() {
            return this.config?.animation || this.defaults.animation;
        },

        /**
         * Get raw config object
         */
        getConfig: function() {
            return this.config;
        },

        /**
         * Get mode name
         */
        getName: function() {
            return this.modeName;
        },

        /**
         * Get theme name
         */
        getTheme: function() {
            return this.themeName;
        },

        /**
         * Switch theme at runtime
         */
        switchTheme: function(themeName) {
            this.themeName = themeName;

            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.THEME_CHANGED, {
                    theme: themeName
                });
            }
        }
    };

    CYMATICA.Mode = CymaticaMode;

})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js
# file: render.js
# notes:
#MULTICAT_END
// CYMATICA.render - SVG Rendering Engine
(function(CYMATICA) {
    'use strict';

    const state = CYMATICA.state._state;
    const LETTER_PATHS = CYMATICA.LETTER_PATHS;
    const $ = (sel) => document.querySelector(sel);
    let canvas, renderGroup, statsEl, scanlinesEl, vignetteEl;

    // Animation loop variables
    let lastTime = 0;
    let fps = 60;
    let frameCount = 0;
    let fpsTime = 0;

    // ========================================
    // 3D PROJECTION
    // ========================================
    function project3D(x, y, z, rotX, rotY, rotZ) {
        // Apply rotations (ZYX order)
        const radX = rotX * Math.PI / 180;
        const radY = rotY * Math.PI / 180;
        const radZ = rotZ * Math.PI / 180;

        // Rotate around Z
        let x1 = x * Math.cos(radZ) - y * Math.sin(radZ);
        let y1 = x * Math.sin(radZ) + y * Math.cos(radZ);
        let z1 = z;

        // Rotate around Y
        let x2 = x1 * Math.cos(radY) + z1 * Math.sin(radY);
        let y2 = y1;
        let z2 = -x1 * Math.sin(radY) + z1 * Math.cos(radY);

        // Rotate around X
        let x3 = x2;
        let y3 = y2 * Math.cos(radX) - z2 * Math.sin(radX);
        let z3 = y2 * Math.sin(radX) + z2 * Math.cos(radX);

        // Perspective projection (zoom applied via SVG transform)
        const depth = state.cameraZ + z3;
        const scale = state.fov / Math.max(depth, 1);

        return {
            x: x3 * scale,
            y: y3 * scale,
            z: z3,
            scale: scale,
            depth: depth
        };
    }

    // ========================================
    // PATH TRANSFORMATION
    // ========================================
    function transformPath(pathStr, letterX, letterY, letterZ, letterScale) {
        const { x: rx, y: ry, z: rz } = state.rotation;
        const commands = pathStr.match(/[MLQC]|[-\d.]+/g);
        if (!commands) return '';

        let result = [];
        let i = 0;

        while (i < commands.length) {
            const cmd = commands[i];
            if (cmd.match(/[MLQC]/)) {
                result.push(cmd);
                i++;
            } else {
                // Parse coordinate pairs
                const localX = (parseFloat(cmd) - 50) * letterScale;
                const localY = (parseFloat(commands[i + 1]) - 50) * letterScale;

                // Apply 3D position
                const worldX = letterX + localX;
                const worldY = letterY + localY;
                const worldZ = letterZ;

                // Project to 2D
                const proj = project3D(worldX, worldY, worldZ, rx, ry, rz);

                result.push(proj.x.toFixed(2));
                result.push(proj.y.toFixed(2));
                i += 2;
            }
        }

        return result.join(' ');
    }

    // ========================================
    // COLOR UTILITIES
    // ========================================
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 255, b: 255 };
    }

    function lerpColor(c1, c2, t) {
        const rgb1 = hexToRgb(c1);
        const rgb2 = hexToRgb(c2);
        const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
        const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
        const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);
        return `rgb(${r},${g},${b})`;
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    function hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
    }

    function shiftHue(hexColor, degrees) {
        const rgb = hexToRgb(hexColor);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        hsl.h = (hsl.h + degrees + 360) % 360;
        return hslToRgb(hsl.h, hsl.s, hsl.l);
    }

    // ========================================
    // RENDER
    // ========================================
    function render() {
        // Clear previous render
        renderGroup.innerHTML = '';

        const viewportRect = canvas.getBoundingClientRect();
        const centerX = viewportRect.width / 2;
        const centerY = viewportRect.height / 2;

        // Apply centering, pan, and zoom via SVG transform
        renderGroup.setAttribute('transform',
            `translate(${centerX + state.panX}, ${centerY + state.panY}) scale(${state.zoom})`);

        // Collect all paths with depth for sorting
        const allPaths = [];

        // Process each letter
        state.letters.forEach((letter, letterIndex) => {
            const paths = LETTER_PATHS[letter.char] || LETTER_PATHS['C'];

            // Calculate letter center depth for sorting
            const centerProj = project3D(letter.x, letter.y, letter.z,
                state.rotation.x, state.rotation.y, state.rotation.z);

            // Generate concentric layers
            for (let layer = state.concentric - 1; layer >= 0; layer--) {
                const layerT = layer / Math.max(state.concentric - 1, 1);
                const offset = layer * state.layerOffset;
                const opacity = 0.15 + (1 - layerT) * 0.85;
                // Use oscillated colors if enabled
                const primary = state._oscillatedPrimary || state.colorPrimary;
                const secondary = state._oscillatedSecondary || state.colorSecondary;
                const color = lerpColor(primary, secondary, layerT);
                const strokeW = state.strokeWidth + layer * 0.3;

                paths.forEach((pathStr, pathIndex) => {
                    // Transform path with offset applied to scale
                    const offsetScale = letter.scale + offset * 0.02;
                    const transformedPath = transformPath(
                        pathStr,
                        letter.x,
                        letter.y,
                        letter.z + offset * 5,
                        offsetScale
                    );

                    allPaths.push({
                        d: transformedPath,
                        depth: centerProj.depth + layer * 5,
                        color: color,
                        opacity: opacity,
                        strokeWidth: strokeW,
                        layer: layer,
                        letterIndex: letterIndex,
                        pathIndex: pathIndex
                    });
                });
            }
        });

        // Sort by depth (back to front)
        allPaths.sort((a, b) => b.depth - a.depth);

        // Determine glow filter
        let filterAttr = '';
        if (state.glowIntensity > 70) {
            filterAttr = 'url(#glow-intense)';
        } else if (state.glowIntensity > 35) {
            filterAttr = 'url(#glow-medium)';
        } else if (state.glowIntensity > 0) {
            filterAttr = 'url(#glow-soft)';
        }

        // Calculate draw-on dash parameters
        const totalLength = 1000; // Approximate path length

        // Render all paths
        allPaths.forEach((pathData, index) => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathData.d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', pathData.color);
            path.setAttribute('stroke-width', pathData.strokeWidth);
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('opacity', pathData.opacity);

            if (filterAttr && pathData.layer === 0) {
                path.setAttribute('filter', filterAttr);
            }

            // Draw-on animation with beam sweep effect
            if (state.drawOn) {
                // Calculate per-path progress based on letter and path index
                const letterProgress = pathData.letterIndex / 8;
                const pathProgress = pathData.pathIndex / 5;
                const combinedProgress = letterProgress * 0.7 + pathProgress * 0.3;
                const adjustedProgress = (state.drawProgress - combinedProgress) * 3;

                if (adjustedProgress <= 0) {
                    path.setAttribute('opacity', '0');
                } else if (adjustedProgress < 1) {
                    const dashLength = totalLength * Math.min(adjustedProgress, 1);
                    path.setAttribute('stroke-dasharray', `${dashLength} ${totalLength}`);
                    // Beam head glow - brighter at drawing point
                    const beamGlow = Math.sin(adjustedProgress * Math.PI) * 0.5;
                    path.setAttribute('opacity', pathData.opacity * (0.5 + beamGlow));
                }
            }

            renderGroup.appendChild(path);
        });

        // Add beam head indicator when drawing
        if (state.drawOn && state.drawProgress < 1) {
            const beamLetterIndex = Math.floor(state.drawProgress * 8);
            const beamLetter = state.letters[Math.min(beamLetterIndex, 7)];
            const beamProj = project3D(beamLetter.x, beamLetter.y, beamLetter.z,
                state.rotation.x, state.rotation.y, state.rotation.z);

            const beamHead = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            beamHead.setAttribute('cx', beamProj.x);
            beamHead.setAttribute('cy', beamProj.y);
            beamHead.setAttribute('r', 6 + Math.sin(state.beamPhase * 10) * 2);
            beamHead.setAttribute('fill', state.colorPrimary);
            beamHead.setAttribute('filter', 'url(#glow-intense)');
            beamHead.setAttribute('opacity', '0.95');
            renderGroup.appendChild(beamHead);
        }

        // Update stats
        statsEl.textContent = `Paths: ${allPaths.length} | FPS: ${Math.round(fps)}`;
    }

    // ========================================
    // ANIMATION LOOP
    // ========================================
    function animate(time) {
        const delta = (time - lastTime) / 1000;
        lastTime = time;

        // FPS calculation
        frameCount++;
        fpsTime += delta;
        if (fpsTime >= 1) {
            fps = frameCount / fpsTime;
            frameCount = 0;
            fpsTime = 0;
        }

        // Modulation system update (LFOs, ASRs, routing)
        const deltaMs = delta * 1000;
        if (CYMATICA.mod) {
            CYMATICA.mod.lfo?.update(deltaMs);
            CYMATICA.mod.asr?.update(deltaMs);
            CYMATICA.mod.hub?.update(deltaMs);
        }

        // Auto-rotation when animating and not dragging
        if (state.animating && !state.isDragging) {
            state.targetRotation.x += state.rotSpeed.x * delta * state.animSpeed;
            state.targetRotation.y += state.rotSpeed.y * delta * state.animSpeed;
            state.targetRotation.z += state.rotSpeed.z * delta * state.animSpeed;
        }

        // Smooth lerp from rotation toward targetRotation
        const lerp = state.lerpFactor;
        state.rotation.x += (state.targetRotation.x - state.rotation.x) * lerp;
        state.rotation.y += (state.targetRotation.y - state.rotation.y) * lerp;
        state.rotation.z += (state.targetRotation.z - state.rotation.z) * lerp;

        // Smooth lerp for zoom
        state.zoom += (state.targetZoom - state.zoom) * state.zoomLerp;

        // Smooth lerp for pan
        state.panX += (state.targetPanX - state.panX) * state.panLerp;
        state.panY += (state.targetPanY - state.panY) * state.panLerp;

        // Draw-on progress and beam phase
        if (state.drawOn) {
            if (state.drawProgress < 1) {
                state.drawProgress += delta / state.drawSpeed;
                if (state.drawProgress >= 1) {
                    state.drawProgress = 1;
                    // Loop after a brief pause
                    if (state.drawLoop) {
                        setTimeout(() => {
                            if (state.drawOn && state.drawLoop) {
                                state.drawProgress = 0;
                            }
                        }, 500);
                    }
                }
            }
        }

        // Update beam phase for pulsing effect
        state.beamPhase += delta * 5;

        // Color oscillation
        if (state.colorOscillate) {
            const oscillation = Math.sin(state.beamPhase * state.oscillateSpeed * 0.5);
            // Shift hue of primary color
            state._oscillatedPrimary = shiftHue(state.colorPrimary, oscillation * 30);
            state._oscillatedSecondary = shiftHue(state.colorSecondary, -oscillation * 30);
        } else {
            state._oscillatedPrimary = state.colorPrimary;
            state._oscillatedSecondary = state.colorSecondary;
        }

        render();
        requestAnimationFrame(animate);
    }

    // Resize handler
    function handleResize() {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    }

    // Init render module
    function init() {
        canvas = $('#vector-canvas');
        renderGroup = $('#render-group');
        statsEl = $('#stats');
        scanlinesEl = $('#scanlines');
        vignetteEl = $('#vignette');

        window.addEventListener('resize', handleResize);
        handleResize();
    }

    CYMATICA.render = { init, render, animate, handleResize };
})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js
# file: namespace.js
# notes:
#MULTICAT_END
// CYMATICA - Quadrascan Vector Art Engine
// Namespace initialization - must load first
window.CYMATICA = window.CYMATICA || {};

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js
# file: state.js
# notes:
#MULTICAT_END
// CYMATICA.state - Centralized State Management
(function(CYMATICA) {
    'use strict';

    // Letter path definitions for vector rendering
    const LETTER_PATHS = {
        'C': [
            'M 85 25 Q 85 10 65 5 Q 40 0 20 20 Q 0 45 0 55 Q 0 70 15 85 Q 35 105 65 100 Q 85 95 85 80',
            'M 75 30 Q 75 20 60 15 Q 40 10 25 25 Q 10 45 10 55 Q 10 65 20 78 Q 38 95 60 90 Q 75 85 75 75'
        ],
        'Y': [
            'M 5 5 L 50 50',
            'M 95 5 L 50 50',
            'M 50 50 L 50 100',
            'M 20 20 L 35 35',
            'M 80 20 L 65 35'
        ],
        'M': [
            'M 5 100 L 5 5 L 50 60 L 95 5 L 95 100',
            'M 15 90 L 15 20',
            'M 85 90 L 85 20',
            'M 30 40 L 50 70 L 70 40'
        ],
        'A': [
            'M 5 100 L 50 5 L 95 100',
            'M 22 70 L 78 70',
            'M 20 85 L 50 20 L 80 85',
            'M 30 80 L 70 80'
        ],
        'T': [
            'M 5 5 L 95 5',
            'M 50 5 L 50 100',
            'M 5 15 L 20 5',
            'M 95 15 L 80 5',
            'M 15 15 L 85 15'
        ],
        'I': [
            'M 25 5 L 75 5',
            'M 25 100 L 75 100',
            'M 50 5 L 50 100',
            'M 35 5 L 35 15',
            'M 65 5 L 65 15',
            'M 35 100 L 35 90',
            'M 65 100 L 65 90'
        ],
        // Lowercase letters
        'c': [
            'M 80 30 Q 80 15 55 15 Q 25 15 15 50 Q 5 85 35 95 Q 60 100 80 85',
            'M 70 35 Q 70 25 55 25 Q 35 25 28 50 Q 20 75 40 85 Q 55 90 70 80'
        ],
        'y': [
            'M 10 15 L 50 75',
            'M 90 15 L 50 75 Q 40 100 25 110',
            'M 25 30 L 40 55',
            'M 75 30 L 60 55'
        ],
        'm': [
            'M 5 100 L 5 30',
            'M 5 40 Q 5 15 30 15 Q 50 15 50 40 L 50 100',
            'M 50 40 Q 50 15 75 15 Q 95 15 95 40 L 95 100',
            'M 15 90 L 15 45',
            'M 60 90 L 60 45'
        ],
        'a': [
            'M 75 30 Q 75 15 50 15 Q 20 15 15 50 Q 10 85 50 90 Q 75 90 75 70',
            'M 75 30 L 75 100',
            'M 65 35 Q 65 25 50 25 Q 30 25 27 50 Q 24 75 50 78 Q 65 78 65 65'
        ],
        't': [
            'M 50 5 L 50 85 Q 50 100 70 100',
            'M 25 30 L 80 30',
            'M 35 40 L 70 40'
        ],
        'i': [
            'M 50 30 L 50 100',
            'M 50 5 L 50 15',
            'M 35 30 L 65 30',
            'M 35 100 L 65 100'
        ]
    };

    // Expose letter paths
    CYMATICA.LETTER_PATHS = LETTER_PATHS;

    // Application state
    const state = {
        // Letter positions
        letters: [
            { char: 'c', x: -350, y: 0, z: 0, scale: 1 },
            { char: 'y', x: -250, y: 0, z: 0, scale: 1 },
            { char: 'm', x: -150, y: 0, z: 0, scale: 1 },
            { char: 'a', x: -50, y: 0, z: 0, scale: 1 },
            { char: 't', x: 50, y: 0, z: 0, scale: 1 },
            { char: 'i', x: 150, y: 0, z: 0, scale: 1 },
            { char: 'c', x: 250, y: 0, z: 0, scale: 1 },
            { char: 'a', x: 350, y: 0, z: 0, scale: 1 }
        ],
        selectedLetter: 0,

        // Rotation
        rotation: { x: 0, y: 0, z: 0 },
        targetRotation: { x: 0, y: 0, z: 0 },
        rotSpeed: { x: 5, y: 15, z: 0 },

        // Camera/view
        zoom: 0.5,
        targetZoom: 0.5,
        minZoom: 0.2,
        maxZoom: 5,
        zoomSpeed: 0.001,
        zoomLerp: 0.15,
        // Pan
        panX: 0,
        panY: 0,
        targetPanX: 0,
        targetPanY: 0,
        panLerp: 0.15,

        // Input
        isDragging: false,
        isPanning: false,
        isPinching: false,
        lastMouse: { x: 0, y: 0 },
        lastPinchDist: 0,
        sensitivity: 0.5,
        lerpFactor: 0.12,

        // Animation
        animating: false,
        animSpeed: 1,
        beamPhase: 0,

        // Rendering
        concentric: 5,
        layerOffset: 2,
        strokeWidth: 1.5,
        glowIntensity: 60,
        colorPrimary: '#00ffff',
        colorSecondary: '#ff00aa',
        fov: 1000,
        cameraZ: 600,

        // Effects
        scanlines: true,
        vignette: true,
        drawOn: false,
        drawSpeed: 2,
        drawProgress: 1,
        drawLoop: true,
        colorOscillate: false,
        oscillateSpeed: 1,

        // Internal (computed during render)
        _oscillatedPrimary: null,
        _oscillatedSecondary: null,

        // Modulation system
        mod: {
            enabled: true,
            lfos: {},       // { lfo_id: config }
            asrs: {},       // { asr_id: config }
            routes: []      // [{ sourceType, sourceId, target, ... }]
        }
    };

    // State API
    CYMATICA.state = {
        get(key) {
            return key ? state[key] : state;
        },

        set(key, value) {
            const old = state[key];
            state[key] = value;
            CYMATICA.events.publish('state:changed', { key, value, old });
            CYMATICA.events.publish(`state:${key}`, { value, old });
        },

        reset() {
            state.rotation = { x: 0, y: 0, z: 0 };
            state.targetRotation = { x: 0, y: 0, z: 0 };
            state.zoom = 0.5;
            state.targetZoom = 0.5;
            state.panX = 0;
            state.panY = 0;
            state.targetPanX = 0;
            state.targetPanY = 0;
            CYMATICA.events.publish('state:reset');
        },

        // Direct access for performance-critical paths
        _state: state
    };

})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js
# file: bootloader.js
# notes:
#MULTICAT_END
/**
 * CYMATICA Bootloader
 * Phase-based async module loading
 */
(function() {
    'use strict';

    // Ensure CYMATICA namespace exists
    window.CYMATICA = window.CYMATICA || {};

    // Mode configuration
    const MODE_CONFIG = {
        basePath: 'modes/',
        defaultPath: 'modes/cymatica.mode.json',
        extension: '.mode.json'
    };

    // Parse URL parameter for mode
    function getModePath() {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        if (mode) {
            if (mode.includes('/') || mode.includes('.json')) {
                return mode;
            }
            return MODE_CONFIG.basePath + mode + MODE_CONFIG.extension;
        }
        return MODE_CONFIG.defaultPath;
    }

    const Bootloader = {
        loaded: [],
        startTime: Date.now(),
        modePath: getModePath(),

        /**
         * Log with timestamp
         */
        log: function(msg) {
            const elapsed = Date.now() - this.startTime;
            console.log(`[CYMATICA ${elapsed}ms] ${msg}`);
        },

        /**
         * Load a script dynamically
         */
        loadScript: function(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => {
                    this.loaded.push(src);
                    resolve();
                };
                script.onerror = () => reject(new Error(`Failed to load: ${src}`));
                document.head.appendChild(script);
            });
        },

        /**
         * Load a CSS file dynamically
         */
        loadCSS: function(href) {
            return new Promise((resolve) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                link.onload = resolve;
                link.onerror = () => {
                    console.warn(`[CYMATICA] CSS not found: ${href}`);
                    resolve(); // Continue anyway
                };
                document.head.appendChild(link);
            });
        },

        /**
         * Main boot sequence
         */
        boot: async function() {
            this.log('Booting...');

            try {
                // =========================================================
                // Phase 1: Core Modules
                // =========================================================
                this.log('Phase 1: Loading core modules');

                await Promise.all([
                    this.loadScript('js/core/config.js'),
                    this.loadScript('js/core/utils.js')
                ]);

                await this.loadScript('js/core/events.js');
                await this.loadScript('js/core/state.js');

                // =========================================================
                // Phase 2: Mode System
                // =========================================================
                this.log('Phase 2: Loading mode system');

                await this.loadScript('js/core/mode.js');

                if (CYMATICA.Mode) {
                    await CYMATICA.Mode.init(this.modePath);
                    CYMATICA.Mode.apply();
                }

                // =========================================================
                // Phase 3: Feature Modules
                // =========================================================
                this.log('Phase 3: Loading feature modules');

                await Promise.all([
                    this.loadScript('js/modules/render.js'),
                    this.loadScript('js/modules/input.js')
                ]);

                // =========================================================
                // Phase 3b: Modulation System
                // =========================================================
                this.log('Phase 3b: Loading modulation system');

                // Ensure mod namespace exists
                CYMATICA.mod = CYMATICA.mod || {};

                await this.loadScript('js/mod/mapper.js');
                await this.loadScript('js/mod/lfo.js');
                await this.loadScript('js/mod/asr.js');
                await this.loadScript('js/mod/hub.js');
                await this.loadScript('js/mod/broadcast.js');
                await this.loadScript('js/mod-ui.js');

                // =========================================================
                // Phase 4: UI Modules (conditional)
                // =========================================================
                this.log('Phase 4: Loading UI modules');

                const uiConfig = CYMATICA.Mode?.getUI?.() || { sidePanel: true };

                if (uiConfig.sidePanel !== false) {
                    await this.loadScript('js/ui/controls.js');
                }

                // =========================================================
                // Phase 5: Design Mode (conditional)
                // =========================================================
                const designMode = CYMATICA.Config?.features?.designMode ||
                                   CYMATICA.Utils?.getUrlParamBool?.('design') ||
                                   new URLSearchParams(window.location.search).get('design') === 'true';

                if (designMode) {
                    this.log('Phase 5: Loading design mode');

                    // Create TERRAIN shim for TUT (TUT requires window.TERRAIN)
                    window.TERRAIN = window.TERRAIN || {
                        modules: {},
                        register: function(name, module) {
                            this.modules[name] = module;
                            this[name] = module;
                            console.log('[TERRAIN shim] Registered:', name);
                        }
                    };

                    await Promise.all([
                        this.loadCSS('lib/tut.css'),
                        this.loadScript('lib/tut.js')
                    ]);

                    // TUT auto-initializes when ?design=true is present
                    this.log('TUT loaded');

                    // Load config panel
                    await this.loadScript('js/ui/config-panel.js').catch(() => {
                        this.log('config-panel.js not found (optional)');
                    });
                }

                // =========================================================
                // Phase 6: Persistence (conditional)
                // =========================================================
                const persistenceEnabled = CYMATICA.Mode?.isFeatureEnabled?.('persistence') !== false;

                if (persistenceEnabled) {
                    this.log('Phase 6: Loading persistence');

                    try {
                        await this.loadScript('js/modules/persistence.js');
                        if (CYMATICA.Persistence?.load) {
                            CYMATICA.Persistence.load();
                        }
                    } catch (e) {
                        this.log('Persistence module not found (optional)');
                    }
                }

                // =========================================================
                // Phase 7: Initialize Modules
                // =========================================================
                this.log('Phase 7: Initializing modules');

                this.initModules();

                // =========================================================
                // Phase 8: DOM Bindings
                // =========================================================
                this.log('Phase 8: Binding DOM');

                if (CYMATICA.events?.bindDOM) {
                    CYMATICA.events.bindDOM();
                }

                // =========================================================
                // Phase 9: Start Animation Loop
                // =========================================================
                this.log('Phase 9: Starting animation');

                if (CYMATICA.render?.animate) {
                    requestAnimationFrame(CYMATICA.render.animate);
                }

                // =========================================================
                // Phase 10: Ready
                // =========================================================
                const loadTime = Date.now() - this.startTime;

                if (CYMATICA.events) {
                    CYMATICA.events.emit(CYMATICA.Events.READY, {
                        loadTime: loadTime,
                        modules: this.loaded,
                        mode: CYMATICA.Mode?.getName?.()
                    });
                }

                this.log(`Ready (${loadTime}ms)`);
                this.hideLoading();

            } catch (error) {
                console.error('[CYMATICA] Boot failed:', error);
                this.showError(error.message);
            }
        },

        /**
         * Initialize all loaded modules
         */
        initModules: function() {
            // Initialize modulation modules first (nested in CYMATICA.mod)
            const modModules = ['lfo', 'asr', 'hub', 'broadcast'];
            modModules.forEach(name => {
                const module = CYMATICA.mod?.[name];
                if (module && typeof module.init === 'function') {
                    try {
                        module.init();
                        this.log(`Initialized: mod.${name}`);
                    } catch (e) {
                        console.error(`[CYMATICA] Failed to init mod.${name}:`, e);
                    }
                }
            });

            // Start LFO engine
            if (CYMATICA.mod?.lfo?.start) {
                CYMATICA.mod.lfo.start();
                this.log('Started: mod.lfo');
            }

            // Initialize main modules
            const modules = ['render', 'input', 'ui', 'controls', 'modUI', 'Persistence', 'ConfigPanel'];

            modules.forEach(name => {
                const module = CYMATICA[name];
                if (module && typeof module.init === 'function') {
                    try {
                        module.init();
                        this.log(`Initialized: ${name}`);
                    } catch (e) {
                        console.error(`[CYMATICA] Failed to init ${name}:`, e);
                    }
                }
            });
        },

        /**
         * Hide loading overlay
         */
        hideLoading: function() {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.classList.add('fade-out');
                setTimeout(() => overlay.remove(), 400);
            }
        },

        /**
         * Show error in loading overlay
         */
        showError: function(message) {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                const text = overlay.querySelector('.loading-text');
                if (text) {
                    text.textContent = 'LOAD ERROR';
                    text.style.color = 'var(--error, #ff4444)';
                }
            }
            console.error('[CYMATICA] Error:', message);
        }
    };

    // Export bootloader
    CYMATICA.Bootloader = Bootloader;

    // Auto-boot when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Bootloader.boot());
    } else {
        Bootloader.boot();
    }

})();

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js/modules
# file: render.js
# notes:
#MULTICAT_END
// CYMATICA.render - SVG Rendering Engine
(function(CYMATICA) {
    'use strict';

    const state = CYMATICA.state._state;
    const LETTER_PATHS = CYMATICA.LETTER_PATHS;
    const $ = (sel) => document.querySelector(sel);
    let canvas, renderGroup, statsEl, scanlinesEl, vignetteEl;

    // Animation loop variables
    let lastTime = 0;
    let fps = 60;
    let frameCount = 0;
    let fpsTime = 0;

    // ========================================
    // 3D PROJECTION
    // ========================================
    function project3D(x, y, z, rotX, rotY, rotZ) {
        // Apply rotations (ZYX order)
        const radX = rotX * Math.PI / 180;
        const radY = rotY * Math.PI / 180;
        const radZ = rotZ * Math.PI / 180;

        // Rotate around Z
        let x1 = x * Math.cos(radZ) - y * Math.sin(radZ);
        let y1 = x * Math.sin(radZ) + y * Math.cos(radZ);
        let z1 = z;

        // Rotate around Y
        let x2 = x1 * Math.cos(radY) + z1 * Math.sin(radY);
        let y2 = y1;
        let z2 = -x1 * Math.sin(radY) + z1 * Math.cos(radY);

        // Rotate around X
        let x3 = x2;
        let y3 = y2 * Math.cos(radX) - z2 * Math.sin(radX);
        let z3 = y2 * Math.sin(radX) + z2 * Math.cos(radX);

        // Perspective projection (zoom applied via SVG transform)
        const depth = state.cameraZ + z3;
        const scale = state.fov / Math.max(depth, 1);

        return {
            x: x3 * scale,
            y: y3 * scale,
            z: z3,
            scale: scale,
            depth: depth
        };
    }

    // ========================================
    // PATH TRANSFORMATION
    // ========================================
    function transformPath(pathStr, letterX, letterY, letterZ, letterScale) {
        const { x: rx, y: ry, z: rz } = state.rotation;
        const commands = pathStr.match(/[MLQC]|[-\d.]+/g);
        if (!commands) return '';

        let result = [];
        let i = 0;

        while (i < commands.length) {
            const cmd = commands[i];
            if (cmd.match(/[MLQC]/)) {
                result.push(cmd);
                i++;
            } else {
                // Parse coordinate pairs
                const localX = (parseFloat(cmd) - 50) * letterScale;
                const localY = (parseFloat(commands[i + 1]) - 50) * letterScale;

                // Apply 3D position
                const worldX = letterX + localX;
                const worldY = letterY + localY;
                const worldZ = letterZ;

                // Project to 2D
                const proj = project3D(worldX, worldY, worldZ, rx, ry, rz);

                result.push(proj.x.toFixed(2));
                result.push(proj.y.toFixed(2));
                i += 2;
            }
        }

        return result.join(' ');
    }

    // ========================================
    // COLOR UTILITIES
    // ========================================
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 255, b: 255 };
    }

    function lerpColor(c1, c2, t) {
        const rgb1 = hexToRgb(c1);
        const rgb2 = hexToRgb(c2);
        const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
        const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
        const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);
        return `rgb(${r},${g},${b})`;
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    function hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
    }

    function shiftHue(hexColor, degrees) {
        const rgb = hexToRgb(hexColor);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        hsl.h = (hsl.h + degrees + 360) % 360;
        return hslToRgb(hsl.h, hsl.s, hsl.l);
    }

    // ========================================
    // RENDER
    // ========================================
    function render() {
        // Clear previous render
        renderGroup.innerHTML = '';

        const viewportRect = canvas.getBoundingClientRect();
        const centerX = viewportRect.width / 2;
        const centerY = viewportRect.height / 2;

        // Apply centering, pan, and zoom via SVG transform
        renderGroup.setAttribute('transform',
            `translate(${centerX + state.panX}, ${centerY + state.panY}) scale(${state.zoom})`);

        // Collect all paths with depth for sorting
        const allPaths = [];

        // Process each letter
        state.letters.forEach((letter, letterIndex) => {
            const paths = LETTER_PATHS[letter.char] || LETTER_PATHS['C'];

            // Calculate letter center depth for sorting
            const centerProj = project3D(letter.x, letter.y, letter.z,
                state.rotation.x, state.rotation.y, state.rotation.z);

            // Generate concentric layers
            for (let layer = state.concentric - 1; layer >= 0; layer--) {
                const layerT = layer / Math.max(state.concentric - 1, 1);
                const offset = layer * state.layerOffset;
                const opacity = 0.15 + (1 - layerT) * 0.85;
                // Use oscillated colors if enabled
                const primary = state._oscillatedPrimary || state.colorPrimary;
                const secondary = state._oscillatedSecondary || state.colorSecondary;
                const color = lerpColor(primary, secondary, layerT);
                const strokeW = state.strokeWidth + layer * 0.3;

                paths.forEach((pathStr, pathIndex) => {
                    // Transform path with offset applied to scale
                    const offsetScale = letter.scale + offset * 0.02;
                    const transformedPath = transformPath(
                        pathStr,
                        letter.x,
                        letter.y,
                        letter.z + offset * 5,
                        offsetScale
                    );

                    allPaths.push({
                        d: transformedPath,
                        depth: centerProj.depth + layer * 5,
                        color: color,
                        opacity: opacity,
                        strokeWidth: strokeW,
                        layer: layer,
                        letterIndex: letterIndex,
                        pathIndex: pathIndex
                    });
                });
            }
        });

        // Sort by depth (back to front)
        allPaths.sort((a, b) => b.depth - a.depth);

        // Determine glow filter
        let filterAttr = '';
        if (state.glowIntensity > 70) {
            filterAttr = 'url(#glow-intense)';
        } else if (state.glowIntensity > 35) {
            filterAttr = 'url(#glow-medium)';
        } else if (state.glowIntensity > 0) {
            filterAttr = 'url(#glow-soft)';
        }

        // Calculate draw-on dash parameters
        const totalLength = 1000; // Approximate path length

        // Render all paths
        allPaths.forEach((pathData, index) => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathData.d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', pathData.color);
            path.setAttribute('stroke-width', pathData.strokeWidth);
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('opacity', pathData.opacity);

            if (filterAttr && pathData.layer === 0) {
                path.setAttribute('filter', filterAttr);
            }

            // Draw-on animation with beam sweep effect
            if (state.drawOn) {
                // Calculate per-path progress based on letter and path index
                const letterProgress = pathData.letterIndex / 8;
                const pathProgress = pathData.pathIndex / 5;
                const combinedProgress = letterProgress * 0.7 + pathProgress * 0.3;
                const adjustedProgress = (state.drawProgress - combinedProgress) * 3;

                if (adjustedProgress <= 0) {
                    path.setAttribute('opacity', '0');
                } else if (adjustedProgress < 1) {
                    const dashLength = totalLength * Math.min(adjustedProgress, 1);
                    path.setAttribute('stroke-dasharray', `${dashLength} ${totalLength}`);
                    // Beam head glow - brighter at drawing point
                    const beamGlow = Math.sin(adjustedProgress * Math.PI) * 0.5;
                    path.setAttribute('opacity', pathData.opacity * (0.5 + beamGlow));
                }
            }

            renderGroup.appendChild(path);
        });

        // Add beam head indicator when drawing
        if (state.drawOn && state.drawProgress < 1) {
            const beamLetterIndex = Math.floor(state.drawProgress * 8);
            const beamLetter = state.letters[Math.min(beamLetterIndex, 7)];
            const beamProj = project3D(beamLetter.x, beamLetter.y, beamLetter.z,
                state.rotation.x, state.rotation.y, state.rotation.z);

            const beamHead = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            beamHead.setAttribute('cx', beamProj.x);
            beamHead.setAttribute('cy', beamProj.y);
            beamHead.setAttribute('r', 6 + Math.sin(state.beamPhase * 10) * 2);
            beamHead.setAttribute('fill', state.colorPrimary);
            beamHead.setAttribute('filter', 'url(#glow-intense)');
            beamHead.setAttribute('opacity', '0.95');
            renderGroup.appendChild(beamHead);
        }

        // Update stats
        statsEl.textContent = `Paths: ${allPaths.length} | FPS: ${Math.round(fps)}`;
    }

    // ========================================
    // ANIMATION LOOP
    // ========================================
    function animate(time) {
        const delta = (time - lastTime) / 1000;
        lastTime = time;

        // FPS calculation
        frameCount++;
        fpsTime += delta;
        if (fpsTime >= 1) {
            fps = frameCount / fpsTime;
            frameCount = 0;
            fpsTime = 0;
        }

        // Auto-rotation when animating and not dragging
        if (state.animating && !state.isDragging) {
            state.targetRotation.x += state.rotSpeed.x * delta * state.animSpeed;
            state.targetRotation.y += state.rotSpeed.y * delta * state.animSpeed;
            state.targetRotation.z += state.rotSpeed.z * delta * state.animSpeed;
        }

        // Smooth lerp from rotation toward targetRotation
        const lerp = state.lerpFactor;
        state.rotation.x += (state.targetRotation.x - state.rotation.x) * lerp;
        state.rotation.y += (state.targetRotation.y - state.rotation.y) * lerp;
        state.rotation.z += (state.targetRotation.z - state.rotation.z) * lerp;

        // Smooth lerp for zoom
        state.zoom += (state.targetZoom - state.zoom) * state.zoomLerp;

        // Smooth lerp for pan
        state.panX += (state.targetPanX - state.panX) * state.panLerp;
        state.panY += (state.targetPanY - state.panY) * state.panLerp;

        // Draw-on progress and beam phase
        if (state.drawOn) {
            if (state.drawProgress < 1) {
                state.drawProgress += delta / state.drawSpeed;
                if (state.drawProgress >= 1) {
                    state.drawProgress = 1;
                    // Loop after a brief pause
                    if (state.drawLoop) {
                        setTimeout(() => {
                            if (state.drawOn && state.drawLoop) {
                                state.drawProgress = 0;
                            }
                        }, 500);
                    }
                }
            }
        }

        // Update beam phase for pulsing effect
        state.beamPhase += delta * 5;

        // Color oscillation
        if (state.colorOscillate) {
            const oscillation = Math.sin(state.beamPhase * state.oscillateSpeed * 0.5);
            // Shift hue of primary color
            state._oscillatedPrimary = shiftHue(state.colorPrimary, oscillation * 30);
            state._oscillatedSecondary = shiftHue(state.colorSecondary, -oscillation * 30);
        } else {
            state._oscillatedPrimary = state.colorPrimary;
            state._oscillatedSecondary = state.colorSecondary;
        }

        render();
        requestAnimationFrame(animate);
    }

    // Resize handler
    function handleResize() {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    }

    // Init render module
    function init() {
        canvas = $('#vector-canvas');
        renderGroup = $('#render-group');
        statsEl = $('#stats');
        scanlinesEl = $('#scanlines');
        vignetteEl = $('#vignette');

        window.addEventListener('resize', handleResize);
        handleResize();
    }

    CYMATICA.render = { init, render, animate, handleResize };
})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js/modules
# file: persistence.js
# notes:
#MULTICAT_END
/**
 * CYMATICA Persistence Module
 * Save and restore state to localStorage
 */
(function(CYMATICA) {
    'use strict';

    const STORAGE_KEY = 'cymatica-state';
    const PANEL_STORAGE_KEY = 'cymatica-panel';

    // Debounce helper
    let saveTimer = null;
    function debouncedSave(delay = 500) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => CymaticaPersistence.save(), delay);
    }

    const CymaticaPersistence = {
        /**
         * Save current state to localStorage
         */
        save: function() {
            try {
                const state = CYMATICA.state?.getAll?.();
                if (state) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                    console.log('[CYMATICA.Persistence] State saved');

                    if (CYMATICA.events) {
                        CYMATICA.events.emit(CYMATICA.Events.STATE_SAVED, { state });
                    }
                }
            } catch (e) {
                console.error('[CYMATICA.Persistence] Save failed:', e);
            }
        },

        /**
         * Load saved state from localStorage
         */
        load: function() {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const state = JSON.parse(saved);
                    if (CYMATICA.state?.replaceAll) {
                        CYMATICA.state.replaceAll(state);
                        console.log('[CYMATICA.Persistence] State loaded');
                        return true;
                    }
                }
            } catch (e) {
                console.error('[CYMATICA.Persistence] Load failed:', e);
            }
            return false;
        },

        /**
         * Clear saved state
         */
        clear: function() {
            localStorage.removeItem(STORAGE_KEY);
            console.log('[CYMATICA.Persistence] State cleared');
        },

        /**
         * Save panel state (position, collapsed sections)
         */
        savePanelState: function(panelState) {
            try {
                localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(panelState));
            } catch (e) {
                console.error('[CYMATICA.Persistence] Panel state save failed:', e);
            }
        },

        /**
         * Load panel state
         */
        loadPanelState: function() {
            try {
                const saved = localStorage.getItem(PANEL_STORAGE_KEY);
                return saved ? JSON.parse(saved) : null;
            } catch (e) {
                console.error('[CYMATICA.Persistence] Panel state load failed:', e);
                return null;
            }
        },

        /**
         * Auto-save on state changes
         */
        enableAutoSave: function() {
            if (CYMATICA.events) {
                CYMATICA.events.on(CYMATICA.Events.STATE_CHANGE, (data) => {
                    // Skip internal properties
                    if (data?.path?.startsWith('_')) return;
                    debouncedSave();
                });
                console.log('[CYMATICA.Persistence] Auto-save enabled');
            }
        },

        /**
         * Initialize persistence module
         */
        init: function() {
            // Auto-save is optional, controlled by mode
            if (CYMATICA.Mode?.isFeatureEnabled?.('persistence')) {
                this.enableAutoSave();
            }
        }
    };

    CYMATICA.Persistence = CymaticaPersistence;

})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js/modules
# file: input.js
# notes:
#MULTICAT_END
// CYMATICA.input - Mouse, Touch, Keyboard Input
(function(CYMATICA) {
    'use strict';

    const state = CYMATICA.state._state;
    const $ = (sel) => document.querySelector(sel);

    function init() {
        const viewport = $('#viewport');
        if (!viewport) return;

        // Prevent context menu on right-click
        viewport.addEventListener('contextmenu', (e) => e.preventDefault());

        // Mouse drag rotation (left) / pan (right)
        viewport.addEventListener('mousedown', (e) => {
            state.lastMouse = { x: e.clientX, y: e.clientY };
            if (e.button === 0) {
                state.isDragging = true;
                viewport.style.cursor = 'grabbing';
            } else if (e.button === 2) {
                state.isPanning = true;
                viewport.style.cursor = 'move';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (state.isDragging) {
                const dx = (e.clientX - state.lastMouse.x) * state.sensitivity;
                const dy = (e.clientY - state.lastMouse.y) * state.sensitivity;
                state.targetRotation.y += dx;
                state.targetRotation.x += dy;
                state.lastMouse = { x: e.clientX, y: e.clientY };
            } else if (state.isPanning) {
                const dx = e.clientX - state.lastMouse.x;
                const dy = e.clientY - state.lastMouse.y;
                state.targetPanX += dx;
                state.targetPanY += dy;
                state.lastMouse = { x: e.clientX, y: e.clientY };
            }
        });

        window.addEventListener('mouseup', () => {
            state.isDragging = false;
            state.isPanning = false;
            $('#viewport').style.cursor = 'grab';
        });

        // Scroll wheel zoom
        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = -e.deltaY * state.zoomSpeed;
            state.targetZoom = Math.max(state.minZoom,
                Math.min(state.maxZoom, state.targetZoom + delta * state.targetZoom));
            CYMATICA.events.publish('zoom:changed', state.targetZoom);
        }, { passive: false });

        // Touch support
        let lastPinchCenter = { x: 0, y: 0 };

        viewport.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                state.isDragging = true;
                state.isPinching = false;
                state.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                state.isDragging = false;
                state.isPinching = true;
                state.lastPinchDist = getPinchDistance(e.touches);
                lastPinchCenter = getPinchCenter(e.touches);
            }
        });

        viewport.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (state.isPinching && e.touches.length === 2) {
                // Pinch zoom
                const dist = getPinchDistance(e.touches);
                const delta = (dist - state.lastPinchDist) * 0.01;
                state.targetZoom = Math.max(state.minZoom,
                    Math.min(state.maxZoom, state.targetZoom + delta));
                state.lastPinchDist = dist;

                // Two-finger pan
                const center = getPinchCenter(e.touches);
                state.targetPanX += center.x - lastPinchCenter.x;
                state.targetPanY += center.y - lastPinchCenter.y;
                lastPinchCenter = center;
            } else if (state.isDragging && e.touches.length === 1) {
                // Drag rotation
                const dx = (e.touches[0].clientX - state.lastMouse.x) * state.sensitivity;
                const dy = (e.touches[0].clientY - state.lastMouse.y) * state.sensitivity;
                state.targetRotation.y += dx;
                state.targetRotation.x += dy;
                state.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        }, { passive: false });

        viewport.addEventListener('touchend', () => {
            state.isDragging = false;
            state.isPinching = false;
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    state.animating = !state.animating;
                    $('#toggle-animation')?.classList.toggle('active', state.animating);
                    CYMATICA.events.publish('animation:toggled', state.animating);
                    break;
                case 'Escape':
                    $('#side-panel')?.classList.toggle('hidden');
                    break;
                case 'r':
                case 'R':
                    CYMATICA.state.reset();
                    break;
                case 'd':
                case 'D':
                    state.drawOn = !state.drawOn;
                    state.drawProgress = 0;
                    $('#toggle-drawon')?.classList.toggle('active', state.drawOn);
                    break;
                case '0':
                    CYMATICA.state.reset();
                    break;
            }
        });

        // Set default cursor
        viewport.style.cursor = 'grab';
    }

    function getPinchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getPinchCenter(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    }

    CYMATICA.input = { init };
})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js/mod
# file: mapper.js
# notes:
#MULTICAT_END
// CYMATICA.mod.mapper - Parametric curve mapping
// Transforms 0-1 modulation values with configurable response curves
(function(CYMATICA) {
    'use strict';

    // Curve presets for quick selection
    const CurvePresets = {
        linear:  { a: 1.0, b: 1.0, m: 0.5 },
        log:     { a: 0.25, b: 0.25, m: 0.5 },
        exp:     { a: 4.0, b: 4.0, m: 0.5 },
        scurve:  { a: 4.0, b: 0.25, m: 0.5 },
        invs:    { a: 0.25, b: 4.0, m: 0.5 }
    };

    CYMATICA.mod = CYMATICA.mod || {};

    CYMATICA.mod.mapper = {
        CurvePresets,

        /**
         * Parametric piecewise power-law curve
         * Guarantees: f(0)=0, f(m)=m, f(1)=1
         *
         * @param {number} x - Input value 0-1
         * @param {number} a - Lower half exponent (< 1 = log, > 1 = exp)
         * @param {number} b - Upper half exponent (< 1 = log, > 1 = exp)
         * @param {number} m - Midpoint (where curve passes through)
         * @returns {number} Curved value 0-1
         */
        applyParametricCurve(x, a = 1, b = 1, m = 0.5) {
            // Clamp inputs
            x = Math.max(0, Math.min(1, x));
            a = Math.max(0.1, Math.min(10, a));
            b = Math.max(0.1, Math.min(10, b));
            m = Math.max(0.1, Math.min(0.9, m));

            if (x <= m) {
                // Lower half: scale x to [0,1] within [0,m], apply power, scale back
                const t = x / m;
                return m * Math.pow(t, a);
            } else {
                // Upper half: mirror the operation
                const t = (x - m) / (1 - m);
                return 1 - (1 - m) * Math.pow(1 - t, b);
            }
        },

        /**
         * Get preset curve parameters by name
         * @param {string} name - Preset name
         * @returns {object} {a, b, m} parameters
         */
        getPreset(name) {
            return CurvePresets[name] || CurvePresets.linear;
        },

        /**
         * Transform a 0-1 modulation value to a target range with curve
         *
         * @param {number} value - Input value 0-1
         * @param {object} config - Transform configuration
         * @param {number} config.min - Output minimum
         * @param {number} config.max - Output maximum
         * @param {number} config.curveA - Lower half exponent
         * @param {number} config.curveB - Upper half exponent
         * @param {number} config.curveMid - Curve midpoint
         * @param {boolean} config.invert - Invert before mapping
         * @param {number} config.step - Quantization step (optional)
         * @returns {number} Transformed value
         */
        transform(value, config) {
            const {
                min = 0,
                max = 1,
                curveA = 1,
                curveB = 1,
                curveMid = 0.5,
                invert = false,
                step = null
            } = config;

            // Clamp input
            let v = Math.max(0, Math.min(1, value));

            // Invert if needed
            if (invert) v = 1 - v;

            // Apply parametric curve
            v = this.applyParametricCurve(v, curveA, curveB, curveMid);

            // Map to output range
            let output = min + v * (max - min);

            // Quantize if step specified
            if (step && step > 0) {
                output = Math.round(output / step) * step;
            }

            // Final clamp to output range
            return Math.max(Math.min(min, max), Math.min(Math.max(min, max), output));
        },

        /**
         * Create a reusable transform function with fixed config
         * @param {object} config - Transform configuration
         * @returns {function} Transform function (value) => transformedValue
         */
        createTransform(config) {
            return (value) => this.transform(value, config);
        },

        /**
         * Interpolate between two curve presets
         * @param {string} preset1 - First preset name
         * @param {string} preset2 - Second preset name
         * @param {number} t - Interpolation factor 0-1
         * @returns {object} Interpolated {a, b, m}
         */
        lerpPresets(preset1, preset2, t) {
            const p1 = this.getPreset(preset1);
            const p2 = this.getPreset(preset2);
            return {
                a: p1.a + (p2.a - p1.a) * t,
                b: p1.b + (p2.b - p1.b) * t,
                m: p1.m + (p2.m - p1.m) * t
            };
        }
    };

})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js/mod
# file: hub.js
# notes:
#MULTICAT_END
// CYMATICA.mod.hub - Central Modulation Router
// Routes modulation sources (LFO, ASR, external) to state parameters
(function(CYMATICA) {
    'use strict';

    // Modulation modes
    const Mode = {
        REPLACE: 'replace',     // Replace parameter value
        ADD: 'add',             // Add to base value
        MULTIPLY: 'multiply'    // Multiply base value
    };

    CYMATICA.mod = CYMATICA.mod || {};

    CYMATICA.mod.hub = {
        Mode,
        _baseValues: {},    // Cached base values for add/multiply modes

        /**
         * Create a new modulation route
         * @param {object} config - Route configuration
         * @returns {object} Route object
         */
        createRoute(config = {}) {
            return {
                id: config.id || this._generateId(),
                enabled: config.enabled ?? true,
                sourceType: config.sourceType || 'lfo',    // 'lfo', 'asr', 'external'
                sourceId: config.sourceId || '',
                target: config.target || '',               // State path like "rotation.y"
                min: config.min ?? 0,
                max: config.max ?? 1,
                curveA: config.curveA ?? 1,
                curveB: config.curveB ?? 1,
                curveMid: config.curveMid ?? 0.5,
                invert: config.invert ?? false,
                mode: config.mode || Mode.REPLACE,
                letterIndex: config.letterIndex ?? null    // For per-letter targeting
            };
        },

        /**
         * Update all modulation routes - call each frame
         * @param {number} deltaMs - Time since last frame (unused but consistent API)
         */
        update(deltaMs) {
            const state = CYMATICA.state._state;
            if (!state.mod?.enabled) return;

            const routes = state.mod?.routes || [];

            routes.forEach(route => {
                if (!route.enabled) return;

                // Get modulation value from source
                let value;
                switch (route.sourceType) {
                    case 'lfo':
                        value = CYMATICA.mod.lfo.getValue(route.sourceId);
                        break;
                    case 'asr':
                        value = CYMATICA.mod.asr.getValue(route.sourceId);
                        break;
                    case 'external':
                        value = CYMATICA.mod.broadcast?.getValue(route.sourceId) ?? 0;
                        break;
                    default:
                        return;
                }

                // Apply curve mapping
                const transformed = CYMATICA.mod.mapper.transform(value, {
                    min: route.min,
                    max: route.max,
                    curveA: route.curveA,
                    curveB: route.curveB,
                    curveMid: route.curveMid,
                    invert: route.invert
                });

                // Apply to target
                this._applyToTarget(route.target, transformed, route);
            });
        },

        /**
         * Apply modulation value to a state path
         * Supports: "rotation.x", "letters[2].scale", etc.
         * @private
         */
        _applyToTarget(targetPath, value, route) {
            const state = CYMATICA.state._state;

            // Parse path like "letters[2].scale" or "rotation.x"
            const parts = targetPath.split(/[\.\[\]]/).filter(Boolean);

            if (parts.length === 0) return;

            // Navigate to parent object
            let obj = state;
            for (let i = 0; i < parts.length - 1; i++) {
                const key = isNaN(parts[i]) ? parts[i] : parseInt(parts[i]);
                obj = obj[key];
                if (obj === undefined) return;
            }

            const finalKey = parts[parts.length - 1];
            const baseKey = route.id + ':' + targetPath;

            // Handle modulation mode
            switch (route.mode) {
                case Mode.ADD:
                    // Cache base value on first access
                    if (this._baseValues[baseKey] === undefined) {
                        this._baseValues[baseKey] = obj[finalKey];
                    }
                    obj[finalKey] = this._baseValues[baseKey] + value;
                    break;

                case Mode.MULTIPLY:
                    // Cache base value on first access
                    if (this._baseValues[baseKey] === undefined) {
                        this._baseValues[baseKey] = obj[finalKey];
                    }
                    obj[finalKey] = this._baseValues[baseKey] * value;
                    break;

                case Mode.REPLACE:
                default:
                    obj[finalKey] = value;
                    break;
            }
        },

        /**
         * Get base value for a route (for add/multiply modes)
         * @param {string} routeId - Route identifier
         * @param {string} targetPath - Target path
         * @returns {number|undefined}
         */
        getBaseValue(routeId, targetPath) {
            return this._baseValues[routeId + ':' + targetPath];
        },

        /**
         * Reset base value cache for a route
         * @param {string} routeId - Route identifier
         */
        resetBaseValues(routeId) {
            Object.keys(this._baseValues).forEach(key => {
                if (key.startsWith(routeId + ':')) {
                    delete this._baseValues[key];
                }
            });
        },

        /**
         * Clear all base value caches
         */
        clearBaseValues() {
            this._baseValues = {};
        },

        /**
         * Get list of routable target paths
         * @returns {string[]}
         */
        getRoutableTargets() {
            const state = CYMATICA.state._state;
            const targets = [
                // Rotation
                'rotation.x', 'rotation.y', 'rotation.z',
                'targetRotation.x', 'targetRotation.y', 'targetRotation.z',
                'rotSpeed.x', 'rotSpeed.y', 'rotSpeed.z',
                // Camera/view
                'zoom', 'targetZoom',
                'panX', 'panY', 'targetPanX', 'targetPanY',
                'fov', 'cameraZ',
                // Rendering
                'concentric', 'layerOffset', 'strokeWidth', 'glowIntensity',
                // Animation
                'animSpeed', 'drawSpeed', 'oscillateSpeed', 'beamPhase'
            ];

            // Add per-letter targets
            if (state.letters) {
                state.letters.forEach((_, i) => {
                    targets.push(
                        `letters[${i}].x`,
                        `letters[${i}].y`,
                        `letters[${i}].z`,
                        `letters[${i}].scale`
                    );
                });
            }

            return targets;
        },

        /**
         * Get current value of a target path
         * @param {string} targetPath - Target path
         * @returns {number|undefined}
         */
        getTargetValue(targetPath) {
            const state = CYMATICA.state._state;
            const parts = targetPath.split(/[\.\[\]]/).filter(Boolean);

            let obj = state;
            for (const part of parts) {
                const key = isNaN(part) ? part : parseInt(part);
                obj = obj[key];
                if (obj === undefined) return undefined;
            }

            return obj;
        },

        /**
         * Add a route to state
         * @param {object} route - Route configuration
         */
        addRoute(route) {
            const state = CYMATICA.state._state;
            state.mod = state.mod || { lfos: {}, asrs: {}, routes: [], enabled: true };
            state.mod.routes = state.mod.routes || [];

            const newRoute = this.createRoute(route);
            state.mod.routes.push(newRoute);

            CYMATICA.events.publish('mod:route:added', newRoute);
            return newRoute;
        },

        /**
         * Remove a route from state
         * @param {string} routeId - Route identifier
         */
        removeRoute(routeId) {
            const state = CYMATICA.state._state;
            if (!state.mod?.routes) return;

            const index = state.mod.routes.findIndex(r => r.id === routeId);
            if (index !== -1) {
                state.mod.routes.splice(index, 1);
                this.resetBaseValues(routeId);
                CYMATICA.events.publish('mod:route:removed', { id: routeId });
            }
        },

        /**
         * Initialize the hub
         */
        init() {
            this._baseValues = {};
            console.log('cymatica.mod.hub: initialized');
        },

        /**
         * Generate unique route ID
         * @private
         */
        _generateId() {
            return 'route_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
        }
    };

})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js/mod
# file: asr.js
# notes:
#MULTICAT_END
// CYMATICA.mod.asr - Attack-Sustain-Release Envelope Generator
// Provides impulse-triggered envelopes for modulation
(function(CYMATICA) {
    'use strict';

    // Envelope phases
    const Phase = {
        IDLE: 0,
        ATTACK: 1,
        SUSTAIN: 2,
        RELEASE: 3
    };

    CYMATICA.mod = CYMATICA.mod || {};

    CYMATICA.mod.asr = {
        _runtimes: {},    // Runtime state per envelope
        Phase,            // Expose phase constants

        /**
         * Create a new ASR envelope configuration
         * @param {object} options - Envelope options
         * @returns {object} ASR configuration object
         */
        createASR(options = {}) {
            const id = options.id || this._generateId();
            return {
                id,
                enabled: options.enabled ?? true,
                attack: options.attack ?? 0.1,          // Attack time in seconds
                sustain: options.sustain ?? 1.0,        // Sustain level 0-1
                release: options.release ?? 0.3,        // Release time in seconds
                holdTime: options.holdTime ?? 0,        // Auto-release after N seconds (0 = manual)
                triggerChannel: options.triggerChannel || null,  // External trigger channel
                curve: options.curve ?? 'linear'        // 'linear' or 'exponential'
            };
        },

        /**
         * Trigger an envelope (note-on or note-off)
         * @param {string} asrId - Envelope identifier
         * @param {boolean} pressed - true = note-on, false = note-off
         */
        trigger(asrId, pressed) {
            const state = CYMATICA.state._state;
            const config = state.mod?.asrs?.[asrId];
            if (!config?.enabled) return;

            // Get or create runtime
            let runtime = this._runtimes[asrId];
            if (!runtime) {
                runtime = this._runtimes[asrId] = {
                    phase: Phase.IDLE,
                    value: 0,
                    time: 0,
                    sustainStart: 0
                };
            }

            if (pressed) {
                // Note-on: start attack phase
                runtime.phase = Phase.ATTACK;
                runtime.time = 0;
                runtime.startValue = runtime.value; // For smooth retrigger
            } else {
                // Note-off: start release phase (only if in attack or sustain)
                if (runtime.phase === Phase.ATTACK || runtime.phase === Phase.SUSTAIN) {
                    runtime.phase = Phase.RELEASE;
                    runtime.time = 0;
                    runtime.releaseStart = runtime.value;
                }
            }
        },

        /**
         * Update all envelopes - call each frame
         * @param {number} deltaMs - Time since last frame in milliseconds
         */
        update(deltaMs) {
            const dt = deltaMs / 1000;
            const state = CYMATICA.state._state;
            const asrs = state.mod?.asrs || {};

            Object.values(asrs).forEach(config => {
                if (!config.enabled) return;

                // Get or create runtime
                let runtime = this._runtimes[config.id];
                if (!runtime) {
                    runtime = this._runtimes[config.id] = {
                        phase: Phase.IDLE,
                        value: 0,
                        time: 0,
                        sustainStart: 0,
                        startValue: 0,
                        releaseStart: 0
                    };
                }

                runtime.time += dt;

                switch (runtime.phase) {
                    case Phase.ATTACK:
                        if (config.attack <= 0) {
                            // Instant attack
                            runtime.value = 1;
                            runtime.phase = Phase.SUSTAIN;
                            runtime.sustainStart = performance.now();
                        } else {
                            // Linear or exponential attack
                            const t = runtime.time / config.attack;
                            if (config.curve === 'exponential') {
                                runtime.value = runtime.startValue + (1 - runtime.startValue) * (1 - Math.exp(-t * 5));
                            } else {
                                runtime.value = runtime.startValue + (1 - runtime.startValue) * Math.min(1, t);
                            }

                            if (runtime.value >= 0.999) {
                                runtime.value = 1;
                                runtime.phase = Phase.SUSTAIN;
                                runtime.sustainStart = performance.now();
                            }
                        }
                        break;

                    case Phase.SUSTAIN:
                        runtime.value = config.sustain;

                        // Auto-release after holdTime
                        if (config.holdTime > 0) {
                            const held = (performance.now() - runtime.sustainStart) / 1000;
                            if (held >= config.holdTime) {
                                runtime.phase = Phase.RELEASE;
                                runtime.time = 0;
                                runtime.releaseStart = runtime.value;
                            }
                        }
                        break;

                    case Phase.RELEASE:
                        if (config.release <= 0) {
                            // Instant release
                            runtime.value = 0;
                            runtime.phase = Phase.IDLE;
                        } else {
                            const t = runtime.time / config.release;
                            if (config.curve === 'exponential') {
                                runtime.value = runtime.releaseStart * Math.exp(-t * 5);
                            } else {
                                runtime.value = runtime.releaseStart * Math.max(0, 1 - t);
                            }

                            if (runtime.value <= 0.001) {
                                runtime.value = 0;
                                runtime.phase = Phase.IDLE;
                            }
                        }
                        break;

                    case Phase.IDLE:
                    default:
                        runtime.value = 0;
                        break;
                }
            });
        },

        /**
         * Get current value of an envelope
         * @param {string} asrId - Envelope identifier
         * @returns {number} Current value 0-1
         */
        getValue(asrId) {
            return this._runtimes[asrId]?.value ?? 0;
        },

        /**
         * Get current phase of an envelope
         * @param {string} asrId - Envelope identifier
         * @returns {number} Phase constant
         */
        getPhase(asrId) {
            return this._runtimes[asrId]?.phase ?? Phase.IDLE;
        },

        /**
         * Check if envelope is active (not idle)
         * @param {string} asrId - Envelope identifier
         * @returns {boolean}
         */
        isActive(asrId) {
            const phase = this.getPhase(asrId);
            return phase !== Phase.IDLE;
        },

        /**
         * Force stop an envelope
         * @param {string} asrId - Envelope identifier
         */
        stop(asrId) {
            const runtime = this._runtimes[asrId];
            if (runtime) {
                runtime.phase = Phase.IDLE;
                runtime.value = 0;
            }
        },

        /**
         * Remove runtime state for an envelope
         * @param {string} asrId - Envelope identifier
         */
        remove(asrId) {
            delete this._runtimes[asrId];
        },

        /**
         * Clear all runtime states
         */
        clear() {
            this._runtimes = {};
        },

        /**
         * Initialize the ASR engine
         */
        init() {
            this._runtimes = {};
            console.log('cymatica.mod.asr: initialized');
        },

        /**
         * Generate unique ASR ID
         * @private
         */
        _generateId() {
            return 'asr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
        }
    };

})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js/mod
# file: lfo.js
# notes:
#MULTICAT_END
// CYMATICA.mod.lfo - Low Frequency Oscillator Engine
// Provides multiple waveform types with configurable frequency, amplitude, offset, and phase
(function(CYMATICA) {
    'use strict';

    // Waveform generators - all output 0-1 range
    const Waveforms = {
        sine: (phase) => (Math.sin(phase * Math.PI * 2) + 1) / 2,

        triangle: (phase) => {
            const t = phase % 1;
            return t < 0.5 ? t * 2 : 2 - t * 2;
        },

        square: (phase) => (phase % 1) < 0.5 ? 1 : 0,

        saw: (phase) => phase % 1,

        sawDown: (phase) => 1 - (phase % 1),

        // Sample-and-hold random - changes once per cycle
        random: (phase, runtime) => {
            const cycle = Math.floor(phase);
            if (cycle !== runtime._lastCycle) {
                runtime._lastCycle = cycle;
                runtime._randomValue = Math.random();
            }
            return runtime._randomValue ?? 0.5;
        },

        // True noise - new value each frame
        noise: () => Math.random()
    };

    CYMATICA.mod = CYMATICA.mod || {};

    CYMATICA.mod.lfo = {
        _runtimes: {},    // Runtime state per LFO
        _running: false,

        /**
         * Create a new LFO configuration
         * @param {object} options - LFO options
         * @returns {object} LFO configuration object
         */
        createLFO(options = {}) {
            const id = options.id || this._generateId();
            return {
                id,
                enabled: options.enabled ?? true,
                waveform: options.waveform || 'sine',
                frequency: options.frequency ?? 1.0,      // Hz
                amplitude: options.amplitude ?? 1.0,      // 0-1 depth
                offset: options.offset ?? 0.5,            // Center point 0-1
                phase: options.phase ?? 0,                // Starting phase in degrees
                sync: options.sync ?? false,              // Sync to BPM
                syncDiv: options.syncDiv ?? 1             // Beat division (1=quarter, 2=8th, 4=16th)
            };
        },

        /**
         * Update all LFOs - call each frame
         * @param {number} deltaMs - Time since last frame in milliseconds
         */
        update(deltaMs) {
            if (!this._running) return;

            const dt = deltaMs / 1000;
            const state = CYMATICA.state._state;
            const lfos = state.mod?.lfos || {};

            Object.values(lfos).forEach(config => {
                if (!config.enabled) return;

                // Get or create runtime state
                let runtime = this._runtimes[config.id];
                if (!runtime) {
                    runtime = this._runtimes[config.id] = {
                        _currentPhase: (config.phase || 0) / 360,
                        _lastCycle: -1,
                        _randomValue: 0.5,
                        currentValue: 0.5
                    };
                }

                // Calculate effective frequency
                let freq = config.frequency;
                if (config.sync && state.bpm) {
                    freq = (state.bpm / 60) / config.syncDiv;
                }

                // Advance phase
                runtime._currentPhase += freq * dt;

                // Get waveform function
                const waveformFn = Waveforms[config.waveform] || Waveforms.sine;

                // Generate raw value (0-1)
                let value = waveformFn(runtime._currentPhase, runtime);

                // Apply amplitude and offset
                // offset=0.5, amplitude=1.0 gives full 0-1 range
                // offset=0.5, amplitude=0.5 gives 0.25-0.75 range
                value = config.offset + (value - 0.5) * config.amplitude;

                // Clamp to 0-1
                value = Math.max(0, Math.min(1, value));

                // Store for hub to read
                runtime.currentValue = value;
            });
        },

        /**
         * Get current value of an LFO
         * @param {string} lfoId - LFO identifier
         * @returns {number} Current value 0-1
         */
        getValue(lfoId) {
            return this._runtimes[lfoId]?.currentValue ?? 0.5;
        },

        /**
         * Get phase of an LFO (0-1)
         * @param {string} lfoId - LFO identifier
         * @returns {number} Current phase 0-1
         */
        getPhase(lfoId) {
            const runtime = this._runtimes[lfoId];
            return runtime ? (runtime._currentPhase % 1) : 0;
        },

        /**
         * Reset an LFO's phase
         * @param {string} lfoId - LFO identifier
         * @param {number} phase - New phase 0-360 degrees
         */
        resetPhase(lfoId, phase = 0) {
            const runtime = this._runtimes[lfoId];
            if (runtime) {
                runtime._currentPhase = phase / 360;
            }
        },

        /**
         * Start the LFO engine
         */
        start() {
            this._running = true;
        },

        /**
         * Stop the LFO engine
         */
        stop() {
            this._running = false;
        },

        /**
         * Check if engine is running
         * @returns {boolean}
         */
        isRunning() {
            return this._running;
        },

        /**
         * Get list of available waveform types
         * @returns {string[]}
         */
        getWaveforms() {
            return Object.keys(Waveforms);
        },

        /**
         * Remove runtime state for an LFO
         * @param {string} lfoId - LFO identifier
         */
        remove(lfoId) {
            delete this._runtimes[lfoId];
        },

        /**
         * Clear all runtime states
         */
        clear() {
            this._runtimes = {};
        },

        /**
         * Initialize the LFO engine
         */
        init() {
            this._runtimes = {};
            console.log('cymatica.mod.lfo: initialized');
        },

        /**
         * Generate unique LFO ID
         * @private
         */
        _generateId() {
            return 'lfo_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
        }
    };

})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js/mod
# file: broadcast.js
# notes:
#MULTICAT_END
// CYMATICA.mod.broadcast - External Control Receiver
// Handles BroadcastChannel and postMessage for external controller integration
(function(CYMATICA) {
    'use strict';

    CYMATICA.mod = CYMATICA.mod || {};

    CYMATICA.mod.broadcast = {
        _channel: null,
        _stateChannel: null,
        _values: {},            // External control values by key
        _connected: false,
        _messageCount: 0,

        /**
         * Initialize broadcast receiver
         * @param {string} channelName - BroadcastChannel name (default: 'cymatica-control')
         */
        init(channelName = 'cymatica-control') {
            // Listen for postMessage from parent/host
            window.addEventListener('message', (e) => this._handleMessage(e));

            // Create BroadcastChannel for ControlDeck integration
            try {
                this._channel = new BroadcastChannel(channelName);
                this._channel.onmessage = (e) => this._handleBroadcast(e);

                // Also listen on ControlDeck's default channel
                this._controldeckChannel = new BroadcastChannel('controldeck-default');
                this._controldeckChannel.onmessage = (e) => {
                    console.log('[cymatica.broadcast] RAW message:', e.data);
                    this._handleControlDeck(e);
                };

                // Optional state output channel
                this._stateChannel = new BroadcastChannel(channelName + '-state');

                this._connected = true;
                console.log(`cymatica.mod.broadcast: listening on ${channelName} + controldeck-default`);
            } catch (err) {
                console.warn('cymatica.mod.broadcast: BroadcastChannel not supported');
            }

            CYMATICA.events.publish('broadcast:init', { channelName });
        },

        /**
         * Handle postMessage events
         * @private
         */
        _handleMessage(event) {
            const data = event.data;
            if (!data) return;

            // Accept messages from known sources
            const validSources = ['cymatica', 'plenith', 'plenith-tv', 'pja-host'];
            if (data.source && !validSources.includes(data.source)) return;

            this._messageCount++;

            switch (data.type) {
                case 'game:control':
                    this._handleGameControl(data);
                    break;

                case 'note:on':
                case 'note:off':
                    this._handleNoteEvent(data);
                    break;

                case 'continuous':
                    this._handleContinuous(data);
                    break;

                case 'trigger':
                    this._handleTrigger(data);
                    break;

                case 'channel-init':
                    CYMATICA.events.publish('broadcast:channel-init', data);
                    break;

                case 'mod:lfo':
                    this._handleLFOCommand(data);
                    break;

                case 'mod:asr':
                    this._handleASRCommand(data);
                    break;

                case 'mod:route':
                    this._handleRouteCommand(data);
                    break;
            }
        },

        /**
         * Handle BroadcastChannel messages
         * @private
         */
        _handleBroadcast(event) {
            const data = event.data;
            if (!data) return;

            this._messageCount++;

            switch (data.type) {
                case 'trigger':
                    this._handleTrigger(data);
                    break;

                case 'continuous':
                    this._handleContinuous(data);
                    break;
            }
        },

        /**
         * Handle ControlDeck protocol messages
         * Maps gamepad controls to cymatica actions
         * @private
         */
        _handleControlDeck(event) {
            const data = event.data;
            console.log('[cymatica.broadcast] Received:', data?.control, data?.value);
            if (!data || data._src !== 'controldeck') return;

            this._messageCount++;
            const state = CYMATICA.state._state;

            if (data.type === 'trigger') {
                // Button mappings
                switch (data.control) {
                    case 'start':
                        if (data.pressed) {
                            state.animating = !state.animating;
                            CYMATICA.events.publish('animation:toggled', state.animating);
                        }
                        break;
                    case 'select':
                        if (data.pressed) CYMATICA.state.reset();
                        break;
                    case 'a':
                        if (data.pressed) {
                            state.drawOn = !state.drawOn;
                            state.drawProgress = 0;
                        }
                        break;
                    case 'dpad-up':
                        if (data.pressed) state.targetZoom *= 1.1;
                        break;
                    case 'dpad-down':
                        if (data.pressed) state.targetZoom *= 0.9;
                        break;
                }
                this._handleTrigger(data);
            }

            if (data.type === 'continuous') {
                // Axis mappings: sticks control rotation
                const rawValue = data.raw?.value ?? (data.value * 2 - 1);
                switch (data.control) {
                    case 'left-x':
                        state.targetRotation.y += rawValue * 2;
                        break;
                    case 'left-y':
                        state.targetRotation.x += rawValue * 2;
                        break;
                    case 'right-x':
                        state.targetPanX += rawValue * 5;
                        break;
                    case 'right-y':
                        state.targetPanY += rawValue * 5;
                        break;
                    // Hand tracking from ASCIIVision
                    case 'hand-x':
                        state.targetRotation.y = rawValue * 45;
                        break;
                    case 'hand-y':
                        state.targetRotation.x = rawValue * 45;
                        break;
                    case 'hand-theta':
                        state.targetRotation.z = rawValue * 90;
                        break;
                    case 'hand-spread':
                        state.targetZoom = 0.5 + data.value * 2;
                        break;
                }
                this._handleContinuous(data);
            }
        },

        /**
         * Handle game:control messages (paddle, start, stop, etc.)
         * @private
         */
        _handleGameControl(data) {
            switch (data.action) {
                case 'paddle':
                    // Store paddle value for external source routing
                    const key = `paddle:${data.player || 1}`;
                    this._values[key] = data.value;
                    CYMATICA.events.publish('broadcast:paddle', {
                        player: data.player || 1,
                        value: data.value
                    });
                    break;

                case 'start':
                    CYMATICA.events.publish('broadcast:start');
                    break;

                case 'stop':
                    CYMATICA.events.publish('broadcast:stop');
                    break;

                case 'reset':
                    CYMATICA.state.reset();
                    break;

                case 'pause':
                case 'resume':
                case 'toggle':
                    const state = CYMATICA.state._state;
                    if (data.action === 'toggle') {
                        state.animating = !state.animating;
                    } else {
                        state.animating = data.action === 'resume';
                    }
                    CYMATICA.events.publish('broadcast:animate', { animating: state.animating });
                    break;
            }
        },

        /**
         * Handle note:on / note:off events
         * @private
         */
        _handleNoteEvent(data) {
            const pressed = data.type === 'note:on' && (data.velocity || 127) > 0;
            const noteKey = `note:${data.channel || 0}:${data.note}`;

            // Store velocity for external routing
            this._values[noteKey] = pressed ? (data.velocity || 127) / 127 : 0;

            // Trigger any ASRs listening to this note
            const state = CYMATICA.state._state;
            const asrs = state.mod?.asrs || {};

            Object.values(asrs).forEach(asr => {
                if (asr.triggerChannel === noteKey || asr.triggerChannel === `note:${data.note}`) {
                    CYMATICA.mod.asr.trigger(asr.id, pressed);
                }
            });

            CYMATICA.events.publish('broadcast:note', {
                note: data.note,
                channel: data.channel || 0,
                velocity: data.velocity || 127,
                pressed
            });
        },

        /**
         * Handle continuous control messages
         * @private
         */
        _handleContinuous(data) {
            const key = data.control || data.key || 'unknown';
            this._values[key] = data.value;

            CYMATICA.events.publish('broadcast:continuous', {
                control: key,
                value: data.value
            });
        },

        /**
         * Handle trigger (impulse) messages
         * @private
         */
        _handleTrigger(data) {
            const pressed = data.pressed !== false;
            const control = data.control || 'trigger';

            // Trigger any ASRs listening to this control
            const state = CYMATICA.state._state;
            const asrs = state.mod?.asrs || {};

            Object.values(asrs).forEach(asr => {
                if (asr.triggerChannel === control) {
                    CYMATICA.mod.asr.trigger(asr.id, pressed);
                }
            });

            CYMATICA.events.publish('broadcast:trigger', { control, pressed });
        },

        /**
         * Handle LFO configuration commands
         * @private
         */
        _handleLFOCommand(data) {
            const state = CYMATICA.state._state;
            state.mod = state.mod || { lfos: {}, asrs: {}, routes: [], enabled: true };

            switch (data.action) {
                case 'create':
                    const lfo = CYMATICA.mod.lfo.createLFO(data.config);
                    state.mod.lfos[lfo.id] = lfo;
                    break;

                case 'update':
                    if (state.mod.lfos[data.id]) {
                        Object.assign(state.mod.lfos[data.id], data.config);
                    }
                    break;

                case 'remove':
                    delete state.mod.lfos[data.id];
                    CYMATICA.mod.lfo.remove(data.id);
                    break;
            }
        },

        /**
         * Handle ASR configuration commands
         * @private
         */
        _handleASRCommand(data) {
            const state = CYMATICA.state._state;
            state.mod = state.mod || { lfos: {}, asrs: {}, routes: [], enabled: true };

            switch (data.action) {
                case 'create':
                    const asr = CYMATICA.mod.asr.createASR(data.config);
                    state.mod.asrs[asr.id] = asr;
                    break;

                case 'update':
                    if (state.mod.asrs[data.id]) {
                        Object.assign(state.mod.asrs[data.id], data.config);
                    }
                    break;

                case 'remove':
                    delete state.mod.asrs[data.id];
                    CYMATICA.mod.asr.remove(data.id);
                    break;

                case 'trigger':
                    CYMATICA.mod.asr.trigger(data.id, data.pressed);
                    break;
            }
        },

        /**
         * Handle route configuration commands
         * @private
         */
        _handleRouteCommand(data) {
            switch (data.action) {
                case 'create':
                    CYMATICA.mod.hub.addRoute(data.config);
                    break;

                case 'update':
                    const state = CYMATICA.state._state;
                    const route = state.mod?.routes?.find(r => r.id === data.id);
                    if (route) {
                        Object.assign(route, data.config);
                    }
                    break;

                case 'remove':
                    CYMATICA.mod.hub.removeRoute(data.id);
                    break;
            }
        },

        /**
         * Get value of an external control
         * @param {string} key - Control key
         * @returns {number|undefined}
         */
        getValue(key) {
            return this._values[key];
        },

        /**
         * Get all current values
         * @returns {object}
         */
        getValues() {
            return { ...this._values };
        },

        /**
         * Check if connected
         * @returns {boolean}
         */
        isConnected() {
            return this._connected;
        },

        /**
         * Get message count (for debugging)
         * @returns {number}
         */
        getMessageCount() {
            return this._messageCount;
        },

        /**
         * Send message to host/parent
         * @param {string} type - Message type
         * @param {object} data - Message data
         */
        send(type, data = {}) {
            const msg = {
                source: 'cymatica',
                type,
                timestamp: Date.now(),
                ...data
            };

            // Send via BroadcastChannel
            if (this._stateChannel) {
                this._stateChannel.postMessage(msg);
            }

            // Send to parent window
            if (window.parent !== window) {
                window.parent.postMessage(msg, '*');
            }
        },

        /**
         * Send current state snapshot
         */
        sendState() {
            const state = CYMATICA.state._state;
            this.send('state:snapshot', {
                rotation: { ...state.rotation },
                zoom: state.zoom,
                panX: state.panX,
                panY: state.panY,
                animating: state.animating
            });
        }
    };

})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/js
# file: input.js
# notes:
#MULTICAT_END
// CYMATICA.input - Mouse, Touch, Keyboard Input
(function(CYMATICA) {
    'use strict';

    const state = CYMATICA.state._state;
    const $ = (sel) => document.querySelector(sel);

    function init() {
        const viewport = $('#viewport');
        if (!viewport) return;

        // Prevent context menu on right-click
        viewport.addEventListener('contextmenu', (e) => e.preventDefault());

        // Mouse drag rotation (left) / pan (right)
        viewport.addEventListener('mousedown', (e) => {
            state.lastMouse = { x: e.clientX, y: e.clientY };
            if (e.button === 0) {
                state.isDragging = true;
                viewport.style.cursor = 'grabbing';
            } else if (e.button === 2) {
                state.isPanning = true;
                viewport.style.cursor = 'move';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (state.isDragging) {
                const dx = (e.clientX - state.lastMouse.x) * state.sensitivity;
                const dy = (e.clientY - state.lastMouse.y) * state.sensitivity;
                state.targetRotation.y += dx;
                state.targetRotation.x += dy;
                state.lastMouse = { x: e.clientX, y: e.clientY };
            } else if (state.isPanning) {
                const dx = e.clientX - state.lastMouse.x;
                const dy = e.clientY - state.lastMouse.y;
                state.targetPanX += dx;
                state.targetPanY += dy;
                state.lastMouse = { x: e.clientX, y: e.clientY };
            }
        });

        window.addEventListener('mouseup', () => {
            state.isDragging = false;
            state.isPanning = false;
            $('#viewport').style.cursor = 'grab';
        });

        // Scroll wheel zoom
        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = -e.deltaY * state.zoomSpeed;
            state.targetZoom = Math.max(state.minZoom,
                Math.min(state.maxZoom, state.targetZoom + delta * state.targetZoom));
            CYMATICA.events.publish('zoom:changed', state.targetZoom);
        }, { passive: false });

        // Touch support
        let lastPinchCenter = { x: 0, y: 0 };

        viewport.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                state.isDragging = true;
                state.isPinching = false;
                state.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                state.isDragging = false;
                state.isPinching = true;
                state.lastPinchDist = getPinchDistance(e.touches);
                lastPinchCenter = getPinchCenter(e.touches);
            }
        });

        viewport.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (state.isPinching && e.touches.length === 2) {
                // Pinch zoom
                const dist = getPinchDistance(e.touches);
                const delta = (dist - state.lastPinchDist) * 0.01;
                state.targetZoom = Math.max(state.minZoom,
                    Math.min(state.maxZoom, state.targetZoom + delta));
                state.lastPinchDist = dist;

                // Two-finger pan
                const center = getPinchCenter(e.touches);
                state.targetPanX += center.x - lastPinchCenter.x;
                state.targetPanY += center.y - lastPinchCenter.y;
                lastPinchCenter = center;
            } else if (state.isDragging && e.touches.length === 1) {
                // Drag rotation
                const dx = (e.touches[0].clientX - state.lastMouse.x) * state.sensitivity;
                const dy = (e.touches[0].clientY - state.lastMouse.y) * state.sensitivity;
                state.targetRotation.y += dx;
                state.targetRotation.x += dy;
                state.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        }, { passive: false });

        viewport.addEventListener('touchend', () => {
            state.isDragging = false;
            state.isPinching = false;
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    state.animating = !state.animating;
                    $('#toggle-animation')?.classList.toggle('active', state.animating);
                    CYMATICA.events.publish('animation:toggled', state.animating);
                    break;
                case 'Escape':
                    $('#side-panel')?.classList.toggle('hidden');
                    break;
                case 'r':
                case 'R':
                    CYMATICA.state.reset();
                    break;
                case 'd':
                case 'D':
                    state.drawOn = !state.drawOn;
                    state.drawProgress = 0;
                    $('#toggle-drawon')?.classList.toggle('active', state.drawOn);
                    break;
                case '0':
                    CYMATICA.state.reset();
                    break;
            }
        });

        // Set default cursor
        viewport.style.cursor = 'grab';
    }

    function getPinchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getPinchCenter(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    }

    CYMATICA.input = { init };
})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/lib
# file: tut.css
# notes:
#MULTICAT_END
/* === /Users/mricos/src/devops/tetra/bash/terrain/../tut/templates/design-tokens.css === */
/* Design Token Editor - FAB and Panel Styles
   Self-contained component with its own design tokens.
   Uses --fab- prefix to avoid conflicts with host document. */

/* =============================================================================
   FAB DESIGN TOKENS - Hardcoded values for consistency across all doc types
   ============================================================================= */

.design-fab,
.design-panel,
#elementInspectorPanel {
    --fab-bg-primary: #0d1117;
    --fab-bg-secondary: #161b22;
    --fab-bg-tertiary: #21262d;
    --fab-text-primary: #c9d1d9;
    --fab-text-secondary: #8b949e;
    --fab-accent-primary: #58a6ff;
    --fab-accent-secondary: #1f6feb;
    --fab-success: #3fb950;
    --fab-warning: #d29922;
    --fab-error: #f85149;
    --fab-border: #30363d;
}

/* =============================================================================
   FLOATING ACTION BUTTON
   Desaturated, rounded square design
   ============================================================================= */

.design-fab {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--fab-bg-tertiary);
    border: 1px solid var(--fab-border);
    color: var(--fab-text-secondary);
    font-size: 1.5rem;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    z-index: 1000;
    opacity: 0.7;
}

.design-fab:hover {
    opacity: 1;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    border-color: var(--fab-accent-primary);
}

.design-fab svg {
    opacity: 0.8;
}

.design-fab:hover svg {
    opacity: 1;
}

/* =============================================================================
   DESIGN PANEL
   ============================================================================= */

.design-panel {
    position: fixed;
    bottom: 5rem;
    right: 2rem;
    width: 320px;
    max-height: 70vh;
    background: var(--fab-bg-secondary);
    border: 1px solid var(--fab-border);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    display: none;
    flex-direction: column;
    z-index: 999;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.design-panel.visible {
    display: flex;
    animation: designPanelSlideUp 0.3s ease;
}

@keyframes designPanelSlideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.design-panel-header {
    padding: 1rem;
    background: var(--fab-bg-tertiary);
    border-bottom: 1px solid var(--fab-border);
    font-weight: 600;
    color: var(--fab-text-primary);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.design-panel-close {
    cursor: pointer;
    color: var(--fab-text-secondary);
    font-size: 1.2rem;
}

.design-panel-close:hover {
    color: var(--fab-text-primary);
}

.design-panel-content {
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
    color: var(--fab-text-primary);
}

/* Styled scrollbar for design panel */
.design-panel-content::-webkit-scrollbar {
    width: 8px;
}

.design-panel-content::-webkit-scrollbar-track {
    background: var(--fab-bg-primary);
    border-radius: 4px;
}

.design-panel-content::-webkit-scrollbar-thumb {
    background: var(--fab-border);
    border-radius: 4px;
}

.design-panel-content::-webkit-scrollbar-thumb:hover {
    background: var(--fab-accent-primary);
}

/* =============================================================================
   COLLAPSIBLE SECTIONS
   ============================================================================= */

.token-section {
    margin-bottom: 0.5rem;
    border: 1px solid var(--fab-border);
    border-radius: 6px;
    overflow: hidden;
}

.token-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.75rem;
    background: var(--fab-bg-tertiary);
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--fab-text-primary);
    user-select: none;
    transition: background 0.15s ease;
}

.token-section-header:hover {
    background: var(--fab-bg-primary);
}

.section-toggle {
    font-size: 0.65rem;
    color: var(--fab-text-secondary);
    transition: transform 0.2s ease;
}

.token-section-content {
    padding: 0.75rem;
    background: var(--fab-bg-secondary);
    max-height: 1000px;
    overflow: hidden;
    transition: max-height 0.3s ease, padding 0.3s ease;
}

.token-section.collapsed .token-section-content {
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
}

/* =============================================================================
   METADATA FIELDS
   ============================================================================= */

.metadata-field {
    margin-bottom: 0.6rem;
}

.metadata-field label {
    display: block;
    font-size: 0.7rem;
    color: var(--fab-text-secondary);
    margin-bottom: 0.2rem;
}

.metadata-field .font-input,
.metadata-field .font-select {
    margin-top: 0;
    font-size: 0.8rem;
    padding: 0.4rem 0.5rem;
}

/* =============================================================================
   TOKEN GROUPS AND ITEMS
   ============================================================================= */

.token-group {
    margin-bottom: 1rem;
}

.token-group-title {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--fab-text-secondary);
    margin-bottom: 0.75rem;
    font-weight: 600;
}

.token-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
}

.token-swatch {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    border: 1px solid var(--fab-border);
    flex-shrink: 0;
}

.token-info {
    flex: 1;
    min-width: 0;
}

.token-name {
    font-size: 0.75rem;
    font-family: 'Courier New', monospace;
    color: var(--fab-text-secondary);
    margin-bottom: 0.15rem;
}

.token-value {
    font-size: 0.7rem;
    font-family: 'Courier New', monospace;
    color: var(--fab-accent-primary);
}

.token-picker {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

/* =============================================================================
   FORM CONTROLS (consolidated base styles)
   ============================================================================= */

/* Base form control - shared by select and input */
.font-select,
.font-input {
    width: 100%;
    padding: 0.5rem;
    background: var(--fab-bg-primary);
    color: var(--fab-text-primary);
    border: 1px solid var(--fab-border);
    border-radius: 4px;
    margin-top: 0.5rem;
}

.font-select:focus,
.font-input:focus {
    outline: none;
    border-color: var(--fab-accent-primary);
}

/* Select-specific */
.font-select {
    font-size: 0.85rem;
    cursor: pointer;
}

/* Input-specific */
.font-input {
    font-size: 0.8rem;
    font-family: 'Courier New', monospace;
}

.font-input::placeholder {
    color: var(--fab-text-secondary);
    opacity: 0.5;
}

/* Range slider styling */
input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    background: var(--fab-bg-primary);
    border-radius: 3px;
    outline: none;
    border: 1px solid var(--fab-border);
}

input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--fab-accent-primary);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--fab-bg-secondary);
}

input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: var(--fab-accent-primary);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--fab-bg-secondary);
}

.add-font-btn {
    width: 100%;
    padding: 0.4rem;
    background: var(--fab-bg-tertiary);
    color: var(--fab-text-primary);
    border: 1px solid var(--fab-border);
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
    margin-top: 0.5rem;
    transition: all 0.2s ease;
}

.add-font-btn:hover {
    border-color: var(--fab-accent-primary);
    color: var(--fab-accent-primary);
}

/* Font Example Toggle */
.font-example-toggle {
    font-size: 0.75rem;
    color: var(--fab-accent-primary);
    cursor: pointer;
    margin-top: 0.5rem;
    display: inline-block;
    user-select: none;
}

.font-example-toggle:hover {
    text-decoration: underline;
}

.font-example-content {
    display: none;
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: var(--fab-bg-tertiary);
    border-radius: 4px;
    font-size: 0.7rem;
    color: var(--fab-text-secondary);
    line-height: 1.6;
}

.font-example-content.expanded {
    display: block;
}

.font-example-content ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
}

.font-example-content li {
    margin-bottom: 0.5rem;
}

.font-example-content code {
    background: var(--fab-bg-primary);
    padding: 0.2rem 0.4rem;
    border-radius: 2px;
    font-size: 0.65rem;
}

.font-example-content a {
    color: var(--fab-accent-primary);
}

/* =============================================================================
   PANEL ACTION BUTTONS
   ============================================================================= */

.design-panel-buttons {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
}

.design-panel-btn {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--fab-border);
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--fab-bg-tertiary);
    color: var(--fab-text-primary);
}

/* Legacy button classes - use .design-panel-btn--primary/--secondary/--danger instead */
.copy-tokens-btn { background: var(--fab-accent-secondary); color: white; border-color: var(--fab-accent-primary); }
.copy-tokens-btn:hover { background: var(--fab-accent-primary); }
.copy-tokens-btn.copied { background: var(--fab-success); border-color: var(--fab-success); }
.load-tokens-btn { background: var(--fab-bg-tertiary); border-color: var(--fab-border); color: var(--fab-text-primary); }
.load-tokens-btn:hover { border-color: var(--fab-accent-primary); color: var(--fab-accent-primary); }
.reset-tokens-btn { background: var(--fab-bg-tertiary); color: var(--fab-text-primary); border-color: var(--fab-border); }
.reset-tokens-btn:hover { background: var(--fab-bg-primary); border-color: var(--fab-warning); color: var(--fab-warning); }

/* =============================================================================
   INLINE FEEDBACK STYLES
   ============================================================================= */

.theme-feedback {
    margin-top: 0.5rem;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    font-size: 0.75rem;
    text-align: center;
    transition: all 0.2s ease;
}

.theme-feedback.success {
    background: rgba(63, 185, 80, 0.15);
    color: var(--fab-success);
    border: 1px solid rgba(63, 185, 80, 0.3);
}

.theme-feedback.error {
    background: rgba(248, 81, 73, 0.15);
    color: var(--fab-error);
    border: 1px solid rgba(248, 81, 73, 0.3);
}

.theme-feedback.info {
    background: rgba(88, 166, 255, 0.15);
    color: var(--fab-accent-primary);
    border: 1px solid rgba(88, 166, 255, 0.3);
}

/* =============================================================================
   UTILITY CLASSES - For replacing inline styles
   ============================================================================= */

/* Display utilities */
.hidden { display: none !important; }
.visible { display: block !important; }

/* Spacing utilities */
.control-group { margin-bottom: 0.75rem; }
.mt-0 { margin-top: 0 !important; }
.mt-half { margin-top: 0.5rem; }
.mb-half { margin-bottom: 0.5rem; }

/* Form field label (replaces repeated inline label styles) */
.field-label {
    font-size: 0.75rem;
    color: var(--fab-text-secondary);
    display: block;
    margin-bottom: 0.25rem;
}

/* Help text (small muted text) */
.help-text {
    font-size: 0.7rem;
    color: var(--fab-text-secondary);
    margin-top: 0.5rem;
}

/* Card container (for embedded sections like font embed) */
.fab-card {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--fab-bg-primary);
    border-radius: 4px;
    border: 1px solid var(--fab-border);
}

/* Code sample box */
.fab-code-sample {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: var(--fab-bg-tertiary);
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.55rem;
    word-break: break-all;
}

/* Tip/hint text */
.fab-tip {
    margin-top: 0.5rem;
    font-size: 0.65rem;
    color: var(--fab-text-secondary);
}

/* =============================================================================
   BUTTON MODIFIERS - Consolidate button variants
   ============================================================================= */

/* Primary button (blue) */
.design-panel-btn--primary {
    background: var(--fab-accent-secondary);
    color: white;
    border-color: var(--fab-accent-primary);
}

.design-panel-btn--primary:hover {
    background: var(--fab-accent-primary);
}

/* Secondary button (dark/outline) */
.design-panel-btn--secondary {
    background: var(--fab-bg-tertiary);
    color: var(--fab-text-primary);
    border-color: var(--fab-border);
}

.design-panel-btn--secondary:hover {
    border-color: var(--fab-accent-primary);
    color: var(--fab-accent-primary);
}

/* Danger button (warning on hover) */
.design-panel-btn--danger {
    background: var(--fab-bg-tertiary);
    color: var(--fab-text-primary);
    border-color: var(--fab-border);
}

.design-panel-btn--danger:hover {
    background: var(--fab-bg-primary);
    border-color: var(--fab-warning);
    color: var(--fab-warning);
}

/* Success state (for any button after action) */
.design-panel-btn.copied,
.design-panel-btn--success,
.design-panel-btn.feedback-success {
    background: var(--fab-success) !important;
    border-color: var(--fab-success) !important;
    color: white !important;
}

/* Error state for buttons */
.design-panel-btn.feedback-error {
    background: var(--fab-error) !important;
    border-color: var(--fab-error) !important;
    color: white !important;
}

/* Flex utility for buttons */
.flex-1 { flex: 1; }

/* Legacy .form-control alias (use .font-select or .font-input instead) */
.form-control {
    width: 100%;
    padding: 0.5rem;
    background: var(--fab-bg-primary);
    color: var(--fab-text-primary);
    border: 1px solid var(--fab-border);
    border-radius: 4px;
    margin-top: 0.5rem;
}

.form-control:focus {
    outline: none;
    border-color: var(--fab-accent-primary);
}

/* =============================================================================
   ELEMENT INSPECTOR PANEL
   ============================================================================= */

#elementInspectorPanel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    max-width: 90vw;
    max-height: 80vh;
    background: var(--fab-bg-secondary);
    border: 2px solid var(--fab-accent-primary);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    display: none;
    flex-direction: column;
    z-index: 10001;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--fab-text-primary);
}

#elementInspectorPanel.visible {
    display: flex;
}

#elementInspectorPanel .inspector-header {
    padding: 1rem;
    background: var(--fab-bg-tertiary);
    border-bottom: 1px solid var(--fab-border);
    font-weight: 600;
    color: var(--fab-text-primary);
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: move;
    user-select: none;
}

#elementInspectorPanel .inspector-content {
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
    font-size: 0.85rem;
}

#elementInspectorPanel .inspector-content::-webkit-scrollbar {
    width: 12px;
}

#elementInspectorPanel .inspector-content::-webkit-scrollbar-track {
    background: var(--fab-bg-primary);
    border-radius: 6px;
    margin: 4px;
}

#elementInspectorPanel .inspector-content::-webkit-scrollbar-thumb {
    background: var(--fab-accent-secondary);
    border-radius: 6px;
    border: 2px solid var(--fab-bg-primary);
}

#elementInspectorPanel .inspector-content::-webkit-scrollbar-thumb:hover {
    background: var(--fab-accent-primary);
}


#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/lib
# file: tut.js
# notes:
#MULTICAT_END
(function(TERRAIN) {
    'use strict';

    // Ensure TERRAIN exists
    if (!TERRAIN) {
        console.error('[TUT] TERRAIN not found');
        return;
    }

    // Check if already registered
    if (TERRAIN.modules?.['TUT']) {
        console.warn('[TUT] Already registered');
        return;
    }

    // === BEGIN MODULE ===
// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/core.js ===
/**
 * TUT Core - Constants, defaults, and utilities
 */

// Storage keys
const TUT_STORAGE_KEY = 'tut-themes';
const TUT_ACTIVE_THEME_KEY = 'tut-active-theme';

// Token defaults - canonical values for all design tokens (TERRAIN-compatible)
const TUT_DEFAULT_TOKENS = {
    // Backgrounds
    '--bg-primary': '#0a0a0a',
    '--bg-secondary': '#1a1a1a',
    '--bg-tertiary': '#2a2a2a',
    '--bg-hover': '#3a3a3a',
    // Borders
    '--border': '#222222',
    '--border-visible': '#444444',
    '--border-active': '#4a9eff',
    // Text
    '--text-primary': '#ffffff',
    '--text-secondary': '#aaaaaa',
    '--text-muted': '#666666',
    '--text-code': '#00ffaa',
    // Accents
    '--accent-primary': '#4a9eff',
    '--accent-secondary': '#ff6b35',
    // Status
    '--success': '#00ff00',
    '--error': '#ff4444',
    '--warning': '#ffd700'
};

// Token groups for panel UI (derived from TUT_DEFAULT_TOKENS)
const TUT_TOKEN_GROUPS = {
    backgrounds: ['--bg-primary', '--bg-secondary', '--bg-tertiary', '--bg-hover'],
    borders: ['--border', '--border-visible', '--border-active'],
    text: ['--text-primary', '--text-secondary', '--text-muted', '--text-code'],
    accents: ['--accent-primary', '--accent-secondary', '--success', '--error', '--warning']
};

// Font defaults
const TUT_DEFAULT_FONTS = {
    heading: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    code: "'Courier New', Monaco, monospace"
};

// Token metadata for export/inspection
const TUT_TOKEN_METADATA = {
    '--bg-primary': { type: 'color', description: 'Page background - darkest surface' },
    '--bg-secondary': { type: 'color', description: 'Panel/card background - elevated surface' },
    '--bg-tertiary': { type: 'color', description: 'Section/header background - highest elevation' },
    '--bg-hover': { type: 'color', description: 'Hover state background' },
    '--border': { type: 'color', description: 'Default border color' },
    '--border-visible': { type: 'color', description: 'Visible/emphasized border' },
    '--border-active': { type: 'color', description: 'Active/focused element border' },
    '--text-primary': { type: 'color', description: 'Main body text - high contrast' },
    '--text-secondary': { type: 'color', description: 'Supporting text - medium contrast' },
    '--text-muted': { type: 'color', description: 'Disabled/subtle text - low contrast' },
    '--text-code': { type: 'color', description: 'Code/monospace text color' },
    '--accent-primary': { type: 'color', description: 'Primary action color - links, buttons' },
    '--accent-secondary': { type: 'color', description: 'Secondary accent - highlights' },
    '--success': { type: 'color', description: 'Success/positive feedback' },
    '--error': { type: 'color', description: 'Error/danger feedback' },
    '--warning': { type: 'color', description: 'Warning/caution feedback' }
};

// Utility: RGB to Hex conversion
function tutRgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '#000000';
    if (rgb.startsWith('#')) return rgb;
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return '#000000';
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

// Utility: Show inline feedback (replaces alerts)
function tutShowFeedback(element, message, type = 'success') {
    const originalText = element.textContent;
    const feedbackClass = `feedback-${type}`;

    element.textContent = message;
    element.classList.add(feedbackClass);

    setTimeout(() => {
        element.textContent = originalText;
        element.classList.remove(feedbackClass);
    }, 2000);
}

// Utility: Show inline error in container
function tutShowInlineError(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let errorEl = container.querySelector('.inline-error');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'inline-error theme-feedback error';
        container.appendChild(errorEl);
    }

    errorEl.textContent = message;
    errorEl.classList.remove('hidden');

    setTimeout(() => {
        errorEl.classList.add('hidden');
    }, 5000);
}


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/tokens.js ===
/**
 * TUT Tokens - Token update functions
 */

// Helper: Convert RGB/RGBA to hex (for color inputs)
function rgbToHex(color) {
    if (!color || color.startsWith('#')) return color;
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return color;
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return '#' + r + g + b;
}

const TUT_Tokens = {
    /**
     * Update a CSS custom property token
     */
    update: function(tokenName, value, options = {}) {
        document.documentElement.style.setProperty(tokenName, value);

        // Update display element
        const displayId = 'token-' + tokenName.replace('--', '').replace(/-/g, '-');
        const displayEl = document.getElementById(displayId);
        if (displayEl) {
            displayEl.textContent = value;
        }

        // Update corresponding color picker
        const picker = document.querySelector(`input[data-token="${tokenName}"]`);
        if (picker) {
            picker.value = value;
        }

        // Emit event via TERRAIN Bridge if available
        if (!options.silent && typeof TERRAIN !== 'undefined' && TERRAIN.Bridge) {
            TERRAIN.Bridge.broadcast('tut:token-change', { name: tokenName, value });
        }

        // Auto-save to active theme
        if (!options.silent && typeof TUT_Themes !== 'undefined') {
            TUT_Themes.autoSave();
        }
    },

    /**
     * Get current value of a token
     */
    get: function(tokenName) {
        const style = getComputedStyle(document.documentElement);
        return style.getPropertyValue(tokenName).trim();
    },

    /**
     * Get all current token values
     */
    getAll: function() {
        const style = getComputedStyle(document.documentElement);
        const tokens = {};
        Object.keys(TUT_DEFAULT_TOKENS).forEach(token => {
            tokens[token] = style.getPropertyValue(token).trim();
        });
        return tokens;
    },

    /**
     * Reset all tokens to defaults
     */
    reset: function() {
        Object.entries(TUT_DEFAULT_TOKENS).forEach(([token, value]) => {
            this.update(token, value, { silent: true });
        });

        // Reset fonts
        TUT_Fonts.reset();

        // Reset metadata fields
        const fields = {
            'themeName': 'my-theme',
            'themeVersion': '1.0.0',
            'themeDescription': 'Custom theme',
            'themeAuthor': 'Designer'
        };
        Object.entries(fields).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });

        const btn = document.getElementById('resetTokensBtn');
        if (btn) tutShowFeedback(btn, 'Reset', 'success');
    },

    /**
     * Update section border style
     */
    updateSectionBorder: function(style) {
        const root = document.documentElement;
        switch(style) {
            case 'left':
                root.style.setProperty('--section-border-width', '0 0 0 4px');
                root.style.setProperty('--section-border-color', 'var(--accent-primary)');
                break;
            case 'full-muted':
                root.style.setProperty('--section-border-width', '1px');
                root.style.setProperty('--section-border-color', 'var(--border)');
                break;
            case 'full-accent':
                root.style.setProperty('--section-border-width', '1px');
                root.style.setProperty('--section-border-color', 'var(--accent-primary)');
                break;
            case 'none':
                root.style.setProperty('--section-border-width', '0');
                break;
        }
    },

    /**
     * Update section border radius
     */
    updateSectionRadius: function(value) {
        document.documentElement.style.setProperty('--section-border-radius', value + 'px');
        const display = document.getElementById('sectionRadiusValue');
        if (display) display.textContent = value + 'px';
    },

    /**
     * Initialize color pickers from current CSS values
     */
    initPickers: function() {
        const style = getComputedStyle(document.documentElement);

        Object.keys(TUT_DEFAULT_TOKENS).forEach(token => {
            const value = style.getPropertyValue(token).trim();
            const hex = tutRgbToHex(value);

            const picker = document.querySelector(`input[data-token="${token}"]`);
            if (picker) picker.value = hex;

            const displayId = 'token-' + token.replace('--', '');
            const displayEl = document.getElementById(displayId);
            if (displayEl) displayEl.textContent = hex;
        });

        // Bind event listeners to all data-token inputs
        document.querySelectorAll('input[data-token]').forEach(picker => {
            const tokenName = picker.getAttribute('data-token');
            picker.addEventListener('input', () => {
                this.update(tokenName, picker.value);
            });
        });
    }
};


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/themes.js ===
/**
 * TUT Themes - LocalStorage theme management
 */

// Built-in themes (always available)
const TUT_BUILTIN_THEMES = {
    'default': {
        metadata: {
            name: 'default',
            version: '1.0.0',
            description: 'Default dark theme',
            author: 'TERRAIN',
            temperature: 'neutral',
            colorMode: 'dark'
        },
        tokens: {
            'bg-primary': { value: '#0a0a0a', cssVar: '--bg-primary' },
            'bg-secondary': { value: '#1a1a1a', cssVar: '--bg-secondary' },
            'bg-tertiary': { value: '#2a2a2a', cssVar: '--bg-tertiary' },
            'bg-hover': { value: '#3a3a3a', cssVar: '--bg-hover' },
            'border': { value: '#222222', cssVar: '--border' },
            'border-visible': { value: '#444444', cssVar: '--border-visible' },
            'border-active': { value: '#4a9eff', cssVar: '--border-active' },
            'text-primary': { value: '#ffffff', cssVar: '--text-primary' },
            'text-secondary': { value: '#aaaaaa', cssVar: '--text-secondary' },
            'text-muted': { value: '#666666', cssVar: '--text-muted' },
            'text-code': { value: '#00ffaa', cssVar: '--text-code' },
            'accent-primary': { value: '#4a9eff', cssVar: '--accent-primary' },
            'accent-secondary': { value: '#ff6b35', cssVar: '--accent-secondary' },
            'success': { value: '#00ff00', cssVar: '--success' },
            'error': { value: '#ff4444', cssVar: '--error' },
            'warning': { value: '#ffd700', cssVar: '--warning' }
        }
    },
    'electric': {
        metadata: {
            name: 'electric',
            version: '1.0.0',
            description: 'Vibrant electric neon theme',
            author: 'TERRAIN',
            temperature: 'cool',
            colorMode: 'dark'
        },
        tokens: {
            'bg-primary': { value: '#0a0014', cssVar: '--bg-primary' },
            'bg-secondary': { value: '#120024', cssVar: '--bg-secondary' },
            'bg-tertiary': { value: '#1a0030', cssVar: '--bg-tertiary' },
            'bg-hover': { value: '#2a0050', cssVar: '--bg-hover' },
            'border': { value: '#3d0066', cssVar: '--border' },
            'border-visible': { value: '#6600aa', cssVar: '--border-visible' },
            'border-active': { value: '#00ffff', cssVar: '--border-active' },
            'text-primary': { value: '#ffffff', cssVar: '--text-primary' },
            'text-secondary': { value: '#cc99ff', cssVar: '--text-secondary' },
            'text-muted': { value: '#8855bb', cssVar: '--text-muted' },
            'text-code': { value: '#00ffff', cssVar: '--text-code' },
            'accent-primary': { value: '#ff00ff', cssVar: '--accent-primary' },
            'accent-secondary': { value: '#00ffff', cssVar: '--accent-secondary' },
            'success': { value: '#00ff88', cssVar: '--success' },
            'error': { value: '#ff0066', cssVar: '--error' },
            'warning': { value: '#ffff00', cssVar: '--warning' }
        }
    }
};

const TUT_Themes = {
    _autoSaveTimeout: null,

    /**
     * Initialize theme system
     */
    init: function() {
        this.updateDropdown();

        // Load active theme if set
        const activeTheme = localStorage.getItem(TUT_ACTIVE_THEME_KEY);
        if (activeTheme) {
            const themes = this.getSaved();
            if (themes[activeTheme]) {
                this.apply(themes[activeTheme]);
                const dropdown = document.getElementById('themeSwitcher');
                if (dropdown) dropdown.value = activeTheme;
            }
        }
    },

    /**
     * Get all saved themes
     */
    getSaved: function() {
        try {
            return JSON.parse(localStorage.getItem(TUT_STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    },

    /**
     * Save theme to storage
     */
    save: function(theme) {
        const themes = this.getSaved();
        const themeName = theme.metadata.name;
        themes[themeName] = theme;
        localStorage.setItem(TUT_STORAGE_KEY, JSON.stringify(themes));
        localStorage.setItem(TUT_ACTIVE_THEME_KEY, themeName);
        this.updateDropdown();
        return themeName;
    },

    /**
     * Delete theme from storage
     */
    delete: function(themeName) {
        const themes = this.getSaved();
        delete themes[themeName];
        localStorage.setItem(TUT_STORAGE_KEY, JSON.stringify(themes));

        if (localStorage.getItem(TUT_ACTIVE_THEME_KEY) === themeName) {
            localStorage.removeItem(TUT_ACTIVE_THEME_KEY);
        }
        this.updateDropdown();
    },

    /**
     * Update theme dropdown
     */
    updateDropdown: function() {
        const dropdown = document.getElementById('themeSwitcher');
        if (!dropdown) return;

        const savedThemes = this.getSaved();
        const activeTheme = localStorage.getItem(TUT_ACTIVE_THEME_KEY);

        // Clear existing options except first
        while (dropdown.options.length > 1) {
            dropdown.remove(1);
        }

        // Add built-in themes first
        const builtinGroup = document.createElement('optgroup');
        builtinGroup.label = 'Built-in';
        Object.keys(TUT_BUILTIN_THEMES).forEach(name => {
            const option = document.createElement('option');
            option.value = `builtin:${name}`;
            option.textContent = name;
            if (activeTheme === `builtin:${name}`) option.selected = true;
            builtinGroup.appendChild(option);
        });
        dropdown.appendChild(builtinGroup);

        // Add saved themes
        const savedKeys = Object.keys(savedThemes);
        if (savedKeys.length > 0) {
            const savedGroup = document.createElement('optgroup');
            savedGroup.label = 'Saved';
            savedKeys.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                if (name === activeTheme) option.selected = true;
                savedGroup.appendChild(option);
            });
            dropdown.appendChild(savedGroup);
        }
    },

    /**
     * Switch to a theme
     */
    switch: function(themeName) {
        if (!themeName) {
            TUT_Tokens.reset();
            localStorage.removeItem(TUT_ACTIVE_THEME_KEY);
            return;
        }

        // Check for built-in theme
        if (themeName.startsWith('builtin:')) {
            const builtinName = themeName.replace('builtin:', '');
            if (TUT_BUILTIN_THEMES[builtinName]) {
                this.apply(TUT_BUILTIN_THEMES[builtinName]);
                localStorage.setItem(TUT_ACTIVE_THEME_KEY, themeName);
                return;
            }
        }

        // Check saved themes
        const themes = this.getSaved();
        if (themes[themeName]) {
            this.apply(themes[themeName]);
            localStorage.setItem(TUT_ACTIVE_THEME_KEY, themeName);
        }
    },

    /**
     * Apply a theme object
     */
    apply: function(theme) {
        // Apply metadata
        if (theme.metadata) {
            TUT_Panel.setMetadata(theme.metadata);
        }

        // Apply tokens
        if (theme.tokens) {
            Object.entries(theme.tokens).forEach(([tokenId, tokenData]) => {
                const cssVar = tokenData.cssVar || `--${tokenId}`;
                if (TUT_DEFAULT_TOKENS.hasOwnProperty(cssVar)) {
                    TUT_Tokens.update(cssVar, tokenData.value, { silent: true });
                }
            });
        }
    },

    /**
     * Auto-save current theme (debounced)
     */
    autoSave: function() {
        const activeTheme = localStorage.getItem(TUT_ACTIVE_THEME_KEY);
        if (!activeTheme) return;

        clearTimeout(this._autoSaveTimeout);
        this._autoSaveTimeout = setTimeout(() => {
            const theme = TUT_Export.buildThemeObject();
            const themes = this.getSaved();
            themes[activeTheme] = theme;
            localStorage.setItem(TUT_STORAGE_KEY, JSON.stringify(themes));
        }, 500);
    },

    /**
     * Save current theme (user action)
     */
    saveCurrent: function() {
        const theme = TUT_Export.buildThemeObject();
        const themeName = this.save(theme);

        const btn = document.getElementById('saveThemeBtn');
        if (btn) tutShowFeedback(btn, `Saved: ${themeName}`, 'success');
    },

    /**
     * Delete current theme (user action)
     */
    deleteCurrent: function() {
        const dropdown = document.getElementById('themeSwitcher');
        const themeName = dropdown?.value;

        if (!themeName) return;

        this.delete(themeName);
        dropdown.value = '';
        TUT_Tokens.reset();

        const btn = document.getElementById('deleteThemeBtn');
        if (btn) tutShowFeedback(btn, 'Deleted', 'success');
    }
};


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/panel.js ===
/**
 * TUT Panel - Dynamic panel creation and UI controls
 */

const TUT_Panel = {
    // Token definitions derived from TUT_DEFAULT_TOKENS and TUT_TOKEN_GROUPS (core.js)
    _tokens: null,  // Lazily initialized

    /**
     * Get token definitions, deriving from core.js constants
     */
    _getTokens: function() {
        if (this._tokens) return this._tokens;

        this._tokens = {};
        for (const [group, vars] of Object.entries(TUT_TOKEN_GROUPS)) {
            this._tokens[group] = vars.map(cssVar => ({
                name: cssVar.replace('--', ''),
                var: cssVar,
                default: TUT_DEFAULT_TOKENS[cssVar]
            }));
        }
        return this._tokens;
    },

    _panelElement: null,
    _fabElement: null,

    // =========================================================================
    // DYNAMIC CREATION
    // =========================================================================

    /**
     * Create the FAB button
     * Adds to .fab-container if it exists, otherwise creates standalone
     */
    createFAB: function() {
        if (document.getElementById('designFab')) {
            this._fabElement = document.getElementById('designFab');
            return this._fabElement;
        }

        const fab = document.createElement('button');
        fab.id = 'designFab';
        fab.className = 'design-fab';
        fab.innerHTML = this._getFABIcon();
        fab.title = 'Design Tokens (TUT)';
        fab.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Add to fab-container if it exists, otherwise body
        const container = document.querySelector('.fab-container');
        if (container) {
            container.appendChild(fab);
        } else {
            // Fallback: create standalone FAB
            fab.style.position = 'fixed';
            fab.style.bottom = '16px';
            fab.style.right = '16px';
            fab.style.zIndex = '1001';
            document.body.appendChild(fab);
        }

        this._fabElement = fab;
        return fab;
    },

    /**
     * Create the full design panel
     * Replaces any existing design-panel from fab.js
     */
    create: function() {
        // Check for existing panels (TUT or fab.js)
        let existingPanel = document.getElementById('designPanel') || document.getElementById('design-panel');

        if (existingPanel) {
            // Replace existing panel content with rich TUT panel
            existingPanel.id = 'designPanel';
            existingPanel.innerHTML = this._buildPanelHTML();
            this._panelElement = existingPanel;
            this._bindEvents();
            return existingPanel;
        }

        // Create new panel if none exists
        const panel = document.createElement('div');
        panel.id = 'designPanel';
        panel.className = 'design-panel';
        panel.innerHTML = this._buildPanelHTML();

        document.body.appendChild(panel);
        this._panelElement = panel;

        // Bind events after panel is in DOM
        this._bindEvents();

        return panel;
    },

    /**
     * FAB icon SVG
     */
    _getFABIcon: function() {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="28" height="28">
            <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.15"/>
            <rect x="25" y="30" width="18" height="18" rx="3" fill="var(--fab-accent-primary, #58a6ff)"/>
            <rect x="47" y="30" width="18" height="18" rx="3" fill="var(--fab-success, #3fb950)"/>
            <rect x="69" y="30" width="18" height="18" rx="3" fill="var(--fab-warning, #d29922)"/>
            <rect x="25" y="52" width="18" height="18" rx="3" fill="var(--fab-error, #f85149)"/>
            <rect x="47" y="52" width="18" height="18" rx="3" fill="var(--fab-text-primary, #c9d1d9)"/>
            <rect x="69" y="52" width="18" height="18" rx="3" fill="var(--fab-text-secondary, #8b949e)"/>
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="2" opacity="0.8"/>
        </svg>`;
    },

    /**
     * Build the complete panel HTML
     */
    _buildPanelHTML: function() {
        return `
            <div class="design-panel-header">
                <span>Design Tokens</span>
                <span class="design-panel-close" data-action="close-panel">&times;</span>
            </div>
            <div class="design-panel-content">
                ${this._buildThemeSwitcherSection()}
                ${this._buildMetadataSection()}
                ${this._buildColorsSection()}
                ${this._buildLayoutSection()}
                ${this._buildTypographySection()}
                ${this._buildAnalysisSection()}
                ${this._buildExportSection()}
            </div>
        `;
    },

    /**
     * Theme Switcher Section
     */
    _buildThemeSwitcherSection: function() {
        return `
            <div class="token-section" data-section="switcher">
                <div class="token-section-header" data-action="toggle-section" data-target="switcher">
                    <span>Theme Switcher</span>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="token-section-content">
                    <div class="metadata-field">
                        <label>Active Theme</label>
                        <select id="themeSwitcher" class="font-select mt-0" data-action="switch-theme">
                            <option value="">-- Select Theme --</option>
                        </select>
                    </div>
                    <div class="design-panel-buttons mt-half">
                        <button class="design-panel-btn design-panel-btn--primary flex-1" data-action="save-theme">
                            Save Current
                        </button>
                        <button class="design-panel-btn design-panel-btn--secondary flex-1" data-action="delete-theme">
                            Delete
                        </button>
                    </div>
                    <div id="themeFeedback" class="theme-feedback hidden"></div>
                </div>
            </div>
        `;
    },

    /**
     * Theme Metadata Section
     */
    _buildMetadataSection: function() {
        return `
            <div class="token-section collapsed" data-section="metadata">
                <div class="token-section-header" data-action="toggle-section" data-target="metadata">
                    <span>Theme Metadata</span>
                    <span class="section-toggle">▶</span>
                </div>
                <div class="token-section-content">
                    <div class="metadata-field">
                        <label>Name</label>
                        <input type="text" id="themeName" value="my-theme" class="font-input">
                    </div>
                    <div class="metadata-field">
                        <label>Version</label>
                        <input type="text" id="themeVersion" value="1.0.0" class="font-input">
                    </div>
                    <div class="metadata-field">
                        <label>Description</label>
                        <input type="text" id="themeDescription" value="Custom theme" class="font-input">
                    </div>
                    <div class="metadata-field">
                        <label>Author</label>
                        <input type="text" id="themeAuthor" value="Designer" class="font-input">
                    </div>
                    <div class="metadata-field">
                        <label>Temperature</label>
                        <select id="themeTemperature" class="font-select">
                            <option value="warm">Warm</option>
                            <option value="cool">Cool</option>
                            <option value="neutral" selected>Neutral</option>
                        </select>
                    </div>
                    <div class="metadata-field">
                        <label>Color Mode</label>
                        <select id="themeColorMode" class="font-select">
                            <option value="dark" selected>Dark</option>
                            <option value="light">Light</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Colors Section - generates all token groups
     */
    _buildColorsSection: function() {
        return `
            <div class="token-section" data-section="colors">
                <div class="token-section-header" data-action="toggle-section" data-target="colors">
                    <span>Colors</span>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="token-section-content">
                    ${this._buildTokenGroup('Background', this._getTokens().backgrounds)}
                    ${this._buildTokenGroup('Border', this._getTokens().borders)}
                    ${this._buildTokenGroup('Text', this._getTokens().text)}
                    ${this._buildTokenGroup('Accent & Status', this._getTokens().accents)}
                </div>
            </div>
        `;
    },

    /**
     * Build a token group with color pickers
     */
    _buildTokenGroup: function(title, tokens) {
        let html = `<div class="token-group"><div class="token-group-title">${title}</div>`;

        tokens.forEach(token => {
            const currentValue = this._getTokenValue(token.var) || token.default;
            html += `
                <div class="token-item">
                    <input type="color" class="token-picker" data-action="update-token" data-token="${token.var}" value="${currentValue}">
                    <div class="token-swatch" style="background: var(${token.var})"></div>
                    <div class="token-info">
                        <div class="token-name">${token.var}</div>
                        <div class="token-value" id="token-${token.name}">${currentValue}</div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    },

    /**
     * Layout Section
     */
    _buildLayoutSection: function() {
        return `
            <div class="token-section collapsed" data-section="layout">
                <div class="token-section-header" data-action="toggle-section" data-target="layout">
                    <span>Layout</span>
                    <span class="section-toggle">▶</span>
                </div>
                <div class="token-section-content">
                    <div class="token-group">
                        <div class="token-group-title">Section Style</div>
                        <div class="control-group">
                            <label class="field-label">Border Style</label>
                            <select class="font-select mt-0" data-action="update-section-border" id="sectionBorderStyle">
                                <option value="left">Left accent (default)</option>
                                <option value="full-muted">Full border (muted)</option>
                                <option value="full-accent">Full border (accent)</option>
                                <option value="none">No border</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label class="field-label">Corner Radius</label>
                            <input type="range" min="0" max="24" value="8" data-action="update-section-radius" id="sectionRadius">
                            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--fab-text-secondary);">
                                <span>Sharp</span>
                                <span id="sectionRadiusValue">8px</span>
                                <span>Round</span>
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="field-label">Sidebar Position</label>
                            <select class="font-select mt-0" data-action="update-sidebar-position" id="sidebarPosition">
                                <option value="right">Right (default)</option>
                                <option value="left">Left</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Typography Section
     */
    _buildTypographySection: function() {
        return `
            <div class="token-section collapsed" data-section="typography">
                <div class="token-section-header" data-action="toggle-section" data-target="typography">
                    <span>Typography</span>
                    <span class="section-toggle">▶</span>
                </div>
                <div class="token-section-content">
                    <div class="token-group">
                        <div class="fab-card">
                            <label class="field-label">Add Google Font</label>
                            <textarea class="font-input" id="fontEmbedCode" placeholder="Paste Google Fonts embed code here..." style="height: 60px; resize: vertical;"></textarea>
                            <button class="add-font-btn" data-action="add-font">Add Font to Page</button>
                            <div class="font-example-toggle" data-action="toggle-font-example">
                                ▶ Show example
                            </div>
                            <div class="font-example-content" id="fontExampleContent">
                                <strong>How to add Google Fonts:</strong>
                                <ol>
                                    <li>Go to <a href="https://fonts.google.com" target="_blank">fonts.google.com</a></li>
                                    <li>Select fonts and click <strong>"Get font"</strong></li>
                                    <li>Click <strong>"Get embed code"</strong></li>
                                    <li>Copy the embed code and paste above</li>
                                </ol>
                                <div class="fab-tip">
                                    <strong>Tip:</strong> Mono fonts auto-assign to Code, sans fonts to Heading/Body.
                                </div>
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="field-label">Heading Font</label>
                            <select class="font-select mt-0" data-action="update-font" data-font-type="heading" id="headingFont">
                                <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">System (Default)</option>
                                <option value="'Courier New', monospace">Courier New</option>
                                <option value="Monaco, monospace">Monaco</option>
                                <option value="Georgia, serif">Georgia</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label class="field-label">Body Font</label>
                            <select class="font-select mt-0" data-action="update-font" data-font-type="body" id="bodyFont">
                                <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">System (Default)</option>
                                <option value="'Courier New', monospace">Courier New</option>
                                <option value="Monaco, monospace">Monaco</option>
                                <option value="Georgia, serif">Georgia</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label class="field-label">Code Font</label>
                            <select class="font-select mt-0" data-action="update-font" data-font-type="code" id="codeFont">
                                <option value="'Courier New', Monaco, monospace">Courier New (Default)</option>
                                <option value="Monaco, monospace">Monaco</option>
                                <option value="'Fira Code', monospace">Fira Code</option>
                                <option value="Consolas, monospace">Consolas</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Analysis Section - Usage and Deps integration
     */
    _buildAnalysisSection: function() {
        return `
            <div class="token-section collapsed" data-section="analysis">
                <div class="token-section-header" data-action="toggle-section" data-target="analysis">
                    <span>Analysis</span>
                    <span class="section-toggle">▶</span>
                </div>
                <div class="token-section-content">
                    <div class="token-group">
                        <div class="token-group-title">Summary</div>
                        <div id="analysisSummary" class="help-text">
                            Click "Scan" to analyze token usage
                        </div>
                        <button class="design-panel-btn design-panel-btn--secondary mt-half" data-action="run-analysis">
                            Scan Tokens
                        </button>
                    </div>
                    <div class="token-group" id="analysisOrphans" style="display: none;">
                        <div class="token-group-title">Orphaned Tokens</div>
                        <div id="orphansList" class="help-text"></div>
                    </div>
                    <div class="token-group" id="analysisMissing" style="display: none;">
                        <div class="token-group-title">Missing Tokens</div>
                        <div id="missingList" class="help-text"></div>
                    </div>
                    <div class="token-group" id="analysisLayers" style="display: none;">
                        <div class="token-group-title">Dependency Layers</div>
                        <div id="layersList" class="help-text"></div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Export/Import Section
     */
    _buildExportSection: function() {
        return `
            <div class="token-section collapsed" data-section="export">
                <div class="token-section-header" data-action="toggle-section" data-target="export">
                    <span>Export / Import</span>
                    <span class="section-toggle">▶</span>
                </div>
                <div class="token-section-content">
                    <div class="token-group">
                        <div class="token-group-title">Theme (tokens.json)</div>
                        <div class="design-panel-buttons mt-half">
                            <button class="design-panel-btn design-panel-btn--primary flex-1" data-action="export-theme">
                                Download
                            </button>
                            <button class="design-panel-btn design-panel-btn--secondary flex-1" data-action="import-theme">
                                Import
                            </button>
                        </div>
                        <p class="help-text">Full theme with metadata and TDS mapping</p>
                    </div>
                    <div class="token-group">
                        <div class="token-group-title">CSS Variables</div>
                        <div class="design-panel-buttons mt-half">
                            <button class="design-panel-btn design-panel-btn--secondary flex-1" data-action="copy-css">
                                Copy CSS
                            </button>
                            <button class="design-panel-btn design-panel-btn--danger flex-1" data-action="reset-tokens">
                                Reset All
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // =========================================================================
    // ANALYSIS
    // =========================================================================

    /**
     * Run usage and dependency analysis
     */
    runAnalysis: function() {
        if (typeof TUT_Usage === 'undefined' || typeof TUT_Deps === 'undefined') {
            document.getElementById('analysisSummary').textContent = 'Analysis modules not loaded';
            return;
        }

        // Run scans
        TUT_Usage.scan();
        TUT_Deps.build();

        // Get summary
        const summary = TUT_Usage.getSummary();
        document.getElementById('analysisSummary').innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem;">
                <span>Total tokens:</span><span>${summary.total}</span>
                <span>Defined:</span><span>${summary.defined}</span>
                <span>Used:</span><span>${summary.used}</span>
                <span>Orphaned:</span><span style="color: var(--fab-warning);">${summary.orphans}</span>
                <span>Missing:</span><span style="color: var(--fab-error);">${summary.missing}</span>
            </div>
        `;

        // Show orphaned tokens
        const orphans = TUT_Usage.getOrphans();
        const orphansDiv = document.getElementById('analysisOrphans');
        const orphansList = document.getElementById('orphansList');
        if (orphans.length > 0) {
            orphansDiv.style.display = 'block';
            orphansList.innerHTML = orphans.map(t => `<code>${t.name}</code>`).join(', ');
        } else {
            orphansDiv.style.display = 'none';
        }

        // Show missing tokens
        const missing = TUT_Usage.getMissing();
        const missingDiv = document.getElementById('analysisMissing');
        const missingList = document.getElementById('missingList');
        if (missing.length > 0) {
            missingDiv.style.display = 'block';
            missingList.innerHTML = missing.map(t => `<code>${t.name}</code>`).join(', ');
        } else {
            missingDiv.style.display = 'none';
        }

        // Show dependency layers
        const layers = TUT_Deps.getLayers();
        const layersDiv = document.getElementById('analysisLayers');
        const layersList = document.getElementById('layersList');
        const layerKeys = Object.keys(layers).sort((a, b) => parseInt(a) - parseInt(b));
        if (layerKeys.length > 0) {
            layersDiv.style.display = 'block';
            layersList.innerHTML = layerKeys.map(depth =>
                `<div><strong>Layer ${depth}:</strong> ${layers[depth].length} tokens</div>`
            ).join('');
        } else {
            layersDiv.style.display = 'none';
        }
    },

    // =========================================================================
    // EVENT BINDING
    // =========================================================================

    /**
     * Bind panel events
     */
    _bindEvents: function() {
        // Event binding now handled by TUT_Actions delegation in api.js
    },

    /**
     * Update a token value
     */
    _updateToken: function(varName, value) {
        document.documentElement.style.setProperty(varName, value);

        // Update display
        const tokenName = varName.replace('--', '');
        const valueEl = document.getElementById(`token-${tokenName}`);
        if (valueEl) valueEl.textContent = value;

        // Update swatch
        const picker = document.querySelector(`[data-token="${varName}"]`);
        if (picker) {
            const swatch = picker.parentElement.querySelector('.token-swatch');
            if (swatch) swatch.style.background = value;
        }

        // Notify TUT_Tokens if available
        if (typeof TUT_Tokens !== 'undefined' && TUT_Tokens.update) {
            TUT_Tokens.update(varName.replace('--', ''), value, { silent: true });
        }

        // Record in usage history if available
        if (typeof TUT_Usage !== 'undefined' && TUT_Usage.recordChange) {
            const oldValue = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            TUT_Usage.recordChange(varName, oldValue, value);
        }
    },

    /**
     * Get current token value from DOM (converts RGB to hex for color inputs)
     */
    _getTokenValue: function(varName) {
        const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        return rgbToHex(value);
    },

    // =========================================================================
    // EXISTING METHODS (preserved)
    // =========================================================================

    /**
     * Toggle design panel visibility
     */
    toggle: function() {
        const panel = document.getElementById('designPanel') || document.getElementById('design-panel');
        if (panel) {
            panel.classList.toggle('visible');
        }
    },

    /**
     * Close the panel
     */
    close: function() {
        const panel = document.getElementById('designPanel') || document.getElementById('design-panel');
        if (panel) {
            panel.classList.remove('visible');
        }
    },

    /**
     * Toggle a collapsible section
     */
    toggleSection: function(sectionName) {
        const section = document.querySelector(`[data-section="${sectionName}"]`);
        if (!section) return;

        section.classList.toggle('collapsed');
        const toggle = section.querySelector('.section-toggle');
        if (toggle) {
            toggle.textContent = section.classList.contains('collapsed') ? '▶' : '▼';
        }
    },

    /**
     * Collapse all sections
     */
    collapseAll: function() {
        document.querySelectorAll('.token-section').forEach(section => {
            section.classList.add('collapsed');
            const toggle = section.querySelector('.section-toggle');
            if (toggle) toggle.textContent = '▶';
        });
    },

    /**
     * Get theme metadata from form fields
     */
    getMetadata: function() {
        return {
            name: document.getElementById('themeName')?.value || 'my-theme',
            version: document.getElementById('themeVersion')?.value || '1.0.0',
            description: document.getElementById('themeDescription')?.value || 'Custom theme',
            author: document.getElementById('themeAuthor')?.value || 'Designer',
            temperature: document.getElementById('themeTemperature')?.value || 'neutral',
            colorMode: document.getElementById('themeColorMode')?.value || 'dark'
        };
    },

    /**
     * Set theme metadata in form fields
     */
    setMetadata: function(metadata) {
        if (metadata.name) {
            const el = document.getElementById('themeName');
            if (el) el.value = metadata.name;
        }
        if (metadata.version) {
            const el = document.getElementById('themeVersion');
            if (el) el.value = metadata.version;
        }
        if (metadata.description) {
            const el = document.getElementById('themeDescription');
            if (el) el.value = metadata.description;
        }
        if (metadata.author) {
            const el = document.getElementById('themeAuthor');
            if (el) el.value = metadata.author;
        }
        if (metadata.temperature) {
            const el = document.getElementById('themeTemperature');
            if (el) el.value = metadata.temperature;
        }
        if (metadata.colorMode) {
            const el = document.getElementById('themeColorMode');
            if (el) el.value = metadata.colorMode;
        }
    },

    /**
     * Update sidebar position
     */
    updateSidebarPosition: function(position) {
        document.body.setAttribute('data-sidebar-position', position);
        localStorage.setItem('tut-sidebar-position', position);
    },

    /**
     * Restore sidebar position from localStorage
     */
    restoreSidebarPosition: function() {
        const saved = localStorage.getItem('tut-sidebar-position');
        const current = document.body.getAttribute('data-sidebar-position');
        const position = saved || current || 'right';

        document.body.setAttribute('data-sidebar-position', position);
        const select = document.getElementById('sidebarPosition');
        if (select) select.value = position;
    },

    /**
     * Setup click-outside to close panel
     */
    setupClickOutside: function() {
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('designPanel');
            const fab = document.getElementById('designFab');
            if (panel && panel.classList.contains('visible') &&
                !panel.contains(e.target) &&
                fab && !fab.contains(e.target)) {
                panel.classList.remove('visible');
            }
        });
    },

    /**
     * Get all token definitions
     */
    getTokenDefinitions: function() {
        return this._getTokens();
    }
};


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/fonts.js ===
/**
 * TUT Fonts - Google Fonts integration
 */

const TUT_Fonts = {
    loaded: [],

    /**
     * Update font for a type (heading, body, code)
     */
    update: function(type, font) {
        switch(type) {
            case 'heading':
                document.querySelectorAll('h1, h2, h3, .step-number').forEach(el => {
                    el.style.fontFamily = font;
                });
                break;
            case 'body':
                document.body.style.fontFamily = font;
                break;
            case 'code':
                document.querySelectorAll('code, .command-hint, .terminal-content, .token-name, .token-value').forEach(el => {
                    el.style.fontFamily = font;
                });
                break;
        }
    },

    /**
     * Reset fonts to defaults
     */
    reset: function() {
        const headingFont = document.getElementById('headingFont');
        const bodyFont = document.getElementById('bodyFont');
        const codeFont = document.getElementById('codeFont');

        if (headingFont) headingFont.value = TUT_DEFAULT_FONTS.heading;
        if (bodyFont) bodyFont.value = TUT_DEFAULT_FONTS.body;
        if (codeFont) codeFont.value = TUT_DEFAULT_FONTS.code;

        this.update('heading', TUT_DEFAULT_FONTS.heading);
        this.update('body', TUT_DEFAULT_FONTS.body);
        this.update('code', TUT_DEFAULT_FONTS.code);
    },

    /**
     * Toggle font example visibility
     */
    toggleExample: function() {
        const content = document.getElementById('fontExampleContent');
        const toggle = document.querySelector('.font-example-toggle');

        if (content.classList.contains('expanded')) {
            content.classList.remove('expanded');
            toggle.innerHTML = '> Show example';
        } else {
            content.classList.add('expanded');
            toggle.innerHTML = 'v Hide example';
        }
    },

    /**
     * Parse Google Fonts embed code
     */
    parseEmbed: function(embedCode) {
        const hrefMatch = embedCode.match(/href=["']([^"']+fonts\.googleapis\.com\/css2[^"']+)["']/);
        if (!hrefMatch) return null;

        const cdnUrl = hrefMatch[1];
        const urlParams = new URL(cdnUrl).searchParams;
        const families = urlParams.getAll('family');

        if (families.length === 0) return null;

        const fonts = families.map(familyStr => {
            const [nameWithPlus] = familyStr.split(':');
            const fontName = decodeURIComponent(nameWithPlus.replace(/\+/g, ' '));

            const nameLower = fontName.toLowerCase();
            let fallback = 'sans-serif';
            let category = 'body';

            if (nameLower.includes('mono') || nameLower.includes('code') || nameLower.includes('cascadia')) {
                fallback = 'monospace';
                category = 'code';
            } else if (nameLower.includes('serif') && !nameLower.includes('sans')) {
                fallback = 'serif';
            }

            return {
                fontName,
                fontFamily: `'${fontName}', ${fallback}`,
                fallback,
                category
            };
        });

        return { cdnUrl, fonts };
    },

    /**
     * Add Google Font from embed code
     */
    add: function() {
        const embedCode = document.getElementById('fontEmbedCode').value.trim();
        const btn = document.querySelector('.add-font-btn');

        if (!embedCode) {
            if (btn) tutShowFeedback(btn, 'Paste embed code first', 'error');
            return;
        }

        // Add preconnect links
        const preconnects = [
            { href: 'https://fonts.googleapis.com', crossorigin: false },
            { href: 'https://fonts.gstatic.com', crossorigin: true }
        ];

        preconnects.forEach(({ href, crossorigin }) => {
            if (!document.querySelector(`link[rel="preconnect"][href="${href}"]`)) {
                const link = document.createElement('link');
                link.rel = 'preconnect';
                link.href = href;
                if (crossorigin) link.crossOrigin = 'anonymous';
                document.head.appendChild(link);
            }
        });

        const parsed = this.parseEmbed(embedCode);
        if (!parsed) {
            if (btn) tutShowFeedback(btn, 'Invalid embed code', 'error');
            return;
        }

        const { cdnUrl, fonts } = parsed;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cdnUrl;
        link.id = 'custom-font-' + Date.now();
        document.head.appendChild(link);

        link.onload = () => {
            fonts.forEach(font => {
                const { fontName, fontFamily, category } = font;

                // Track loaded font
                const existing = this.loaded.find(f => f.fontFamily === fontFamily);
                if (!existing) {
                    this.loaded.push({ cdnUrl, fontFamily, fontName });
                }

                // Add to all dropdowns
                ['headingFont', 'bodyFont', 'codeFont'].forEach(id => {
                    const select = document.getElementById(id);
                    if (!select) return;

                    const existingOption = Array.from(select.options).find(opt => opt.value === fontFamily);
                    if (!existingOption) {
                        const option = document.createElement('option');
                        option.value = fontFamily;
                        option.textContent = fontName + ' (Custom)';
                        select.insertBefore(option, select.firstChild);
                    }
                });
            });

            // Auto-assign fonts by category
            const monoFont = fonts.find(f => f.category === 'code');
            const sansFont = fonts.find(f => f.category === 'body' && f.fallback === 'sans-serif');

            if (monoFont) {
                const codeSelect = document.getElementById('codeFont');
                if (codeSelect) {
                    codeSelect.value = monoFont.fontFamily;
                    this.update('code', monoFont.fontFamily);
                }
            }

            if (sansFont) {
                const headingSelect = document.getElementById('headingFont');
                const bodySelect = document.getElementById('bodyFont');
                if (headingSelect) {
                    headingSelect.value = sansFont.fontFamily;
                    this.update('heading', sansFont.fontFamily);
                }
                if (bodySelect) {
                    bodySelect.value = sansFont.fontFamily;
                    this.update('body', sansFont.fontFamily);
                }
            }

            if (btn) tutShowFeedback(btn, `${fonts.length} font${fonts.length > 1 ? 's' : ''} added`, 'success');
            document.getElementById('fontEmbedCode').value = '';
        };

        link.onerror = () => {
            link.remove();
            if (btn) tutShowFeedback(btn, 'Failed to load', 'error');
        };
    }
};


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/export.js ===
/**
 * TUT Export - Theme export/import functionality
 */

const TUT_Export = {
    /**
     * Build complete theme object from current state
     */
    buildThemeObject: function() {
        const style = getComputedStyle(document.documentElement);
        const metadata = TUT_Panel.getMetadata();

        // Build tokens object
        const tokens = {};
        Object.keys(TUT_DEFAULT_TOKENS).forEach(cssVar => {
            const value = style.getPropertyValue(cssVar).trim();
            const tokenId = cssVar.replace('--', '');
            const meta = TUT_TOKEN_METADATA[cssVar] || {};

            tokens[tokenId] = {
                value: value,
                type: meta.type || 'color',
                cssVar: cssVar,
                tdsToken: meta.tdsToken || '',
                description: meta.description || '',
                appliesTo: meta.appliesTo || [],
                ...(meta.contrastWith ? { contrastWith: meta.contrastWith } : {})
            };
        });

        return {
            "$schema": "./design-tokens.schema.json",
            metadata: metadata,
            tokens: tokens,
            groups: [
                { id: "backgrounds", name: "Background Colors", description: "Surface colors forming the visual depth hierarchy", tokens: ["bg-primary", "bg-secondary", "bg-tertiary"], order: 1 },
                { id: "text", name: "Text Colors", description: "Typography colors for content hierarchy", tokens: ["text-primary", "text-secondary"], order: 2 },
                { id: "accents", name: "Accent Colors", description: "Interactive and emphasis colors", tokens: ["accent-primary", "accent-secondary"], order: 3 },
                { id: "status", name: "Status Colors", description: "Feedback and state indication", tokens: ["success", "warning", "error"], order: 4 },
                { id: "structure", name: "Structural Colors", description: "Borders, dividers, and highlights", tokens: ["border", "highlight"], order: 5 }
            ],
            layout: {
                surfaces: {
                    page: { background: "bg-primary" },
                    panel: { background: "bg-secondary", border: "border" },
                    header: { background: "bg-tertiary", border: "border" }
                },
                typography: {
                    heading: { foreground: "text-primary", accent: "accent-primary" },
                    body: { foreground: "text-secondary" },
                    code: { background: "bg-tertiary", foreground: "accent-primary", border: "border" }
                },
                interactive: {
                    "button-primary": { background: "accent-secondary", foreground: "text-primary" },
                    link: { foreground: "accent-primary" }
                },
                feedback: {
                    "success-box": { border: "success", background: "bg-tertiary" },
                    "warning-box": { border: "warning", background: "bg-tertiary" },
                    "error-box": { border: "error", background: "bg-tertiary" }
                }
            },
            tdsMapping: {
                "--bg-primary": "structural.bg.primary",
                "--bg-secondary": "structural.bg.secondary",
                "--bg-tertiary": "structural.bg.tertiary",
                "--text-primary": "text.primary",
                "--text-secondary": "text.secondary",
                "--accent-primary": "interactive.link",
                "--accent-secondary": "structural.secondary",
                "--success": "status.success",
                "--warning": "status.warning",
                "--error": "status.error",
                "--border": "structural.separator",
                "--highlight": "interactive.hover"
            }
        };
    },

    /**
     * Export theme as JSON file download
     */
    toJSON: function() {
        const theme = this.buildThemeObject();
        const themeName = theme.metadata.name;
        const jsonOutput = JSON.stringify(theme, null, 2);

        const blob = new Blob([jsonOutput], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${themeName}.tokens.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const btn = document.getElementById('exportThemeBtn');
        if (btn) tutShowFeedback(btn, 'Downloaded', 'success');
    },

    /**
     * Copy CSS to clipboard
     */
    toCSS: function() {
        const tokens = Object.keys(TUT_DEFAULT_TOKENS);
        const style = getComputedStyle(document.documentElement);

        let cssOutput = ':root {\n';
        tokens.forEach(token => {
            const value = style.getPropertyValue(token).trim();
            cssOutput += `    ${token}: ${value};\n`;
        });
        cssOutput += '}\n';

        // Add Google Fonts CDN URLs
        if (TUT_Fonts.loaded.length > 0) {
            cssOutput += '\n/* Google Fonts */\n';
            TUT_Fonts.loaded.forEach(font => {
                cssOutput += `/* GoogleFont: ${font.fontFamily} | ${font.cdnUrl} */\n`;
            });
        }

        navigator.clipboard.writeText(cssOutput).then(() => {
            const btn = document.getElementById('copyCSSBtn');
            if (btn) tutShowFeedback(btn, 'Copied', 'success');
        }).catch(err => {
            console.error('Copy failed:', err);
            const btn = document.getElementById('copyCSSBtn');
            if (btn) tutShowFeedback(btn, 'Failed', 'error');
        });
    },

    /**
     * Import theme from JSON file
     */
    fromJSON: function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const theme = JSON.parse(event.target.result);
                    TUT_Themes.apply(theme);
                    TUT_Themes.save(theme);

                    const btn = document.getElementById('importThemeBtn');
                    if (btn) tutShowFeedback(btn, `Loaded: ${theme.metadata?.name || 'theme'}`, 'success');
                } catch (err) {
                    console.error('Failed to parse theme:', err);
                    tutShowInlineError('importExportSection', 'Invalid JSON file format');
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }
};


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/inspector.js ===
/**
 * TUT Inspector - Element inspector (Shift-Hold)
 */

const TUT_Inspector = {
    longPressTimer: null,
    progressTimer: null,
    currentElement: null,
    progressOverlay: null,
    startTime: 0,
    LONG_PRESS_DURATION: 1000,

    /**
     * Initialize inspector
     */
    init: function() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closePanel();
        });
        document.addEventListener('mousedown', this.handleShiftMouseDown.bind(this), true);
        document.addEventListener('mouseup', this.handleMouseUp.bind(this), true);
    },

    /**
     * Create progress overlay
     */
    createProgressOverlay: function() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            pointer-events: none;
            border: 3px solid var(--accent-primary);
            border-radius: 4px;
            background: radial-gradient(circle, transparent 0%, rgba(88, 166, 255, 0.1) 100%);
            z-index: 10000;
            transition: opacity 0.2s;
        `;
        overlay.innerHTML = `
            <div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%);
                        background: var(--bg-secondary); border: 2px solid var(--accent-primary);
                        border-radius: 20px; padding: 4px 12px; font-size: 11px;
                        font-family: 'Courier New', monospace; color: var(--accent-primary); white-space: nowrap;">
                <span class="progress-text">0.0s / 1.0s</span>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    },

    /**
     * Update progress overlay position and progress
     */
    updateProgressOverlay: function(element, progress) {
        if (!this.progressOverlay) return;
        const rect = element.getBoundingClientRect();
        this.progressOverlay.style.left = rect.left + 'px';
        this.progressOverlay.style.top = rect.top + 'px';
        this.progressOverlay.style.width = rect.width + 'px';
        this.progressOverlay.style.height = rect.height + 'px';

        const elapsed = (progress * this.LONG_PRESS_DURATION / 100) / 1000;
        const progressText = this.progressOverlay.querySelector('.progress-text');
        if (progressText) progressText.textContent = `${elapsed.toFixed(1)}s / 1.0s`;

        const alpha = Math.min(0.3, progress / 100 * 0.3);
        this.progressOverlay.style.background = `radial-gradient(circle, rgba(88, 166, 255, ${alpha}) 0%, rgba(88, 166, 255, ${alpha * 0.3}) 100%)`;
    },

    /**
     * Get XPath for element
     */
    getXPath: function(element) {
        if (element.id) return `//*[@id="${element.id}"]`;
        if (element === document.body) return '/html/body';

        let ix = 0;
        const siblings = element.parentNode?.childNodes || [];
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling === element) {
                const parentPath = element.parentNode ? this.getXPath(element.parentNode) : '';
                return `${parentPath}/${element.tagName.toLowerCase()}[${ix + 1}]`;
            }
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) ix++;
        }
        return '';
    },

    /**
     * Extract design tokens from element
     */
    extractTokens: function(element) {
        const computed = window.getComputedStyle(element);
        return {
            element: {
                tag: element.tagName.toLowerCase(),
                classes: Array.from(element.classList).join(', ') || 'none',
                id: element.id || 'none',
                xpath: this.getXPath(element)
            },
            colors: {
                background: computed.backgroundColor,
                color: computed.color,
                borderColor: computed.borderTopColor
            },
            typography: {
                fontFamily: computed.fontFamily,
                fontSize: computed.fontSize,
                fontWeight: computed.fontWeight,
                lineHeight: computed.lineHeight,
                letterSpacing: computed.letterSpacing
            },
            spacing: {
                padding: computed.padding,
                margin: computed.margin
            },
            border: {
                width: computed.borderWidth,
                style: computed.borderStyle,
                radius: computed.borderRadius
            },
            layout: {
                display: computed.display,
                width: computed.width,
                height: computed.height
            }
        };
    },

    /**
     * Display element tokens in inspector panel
     */
    displayTokens: function(element, tokens) {
        let panel = document.getElementById('elementInspectorPanel');
        if (!panel) panel = this.createPanel();
        this.populatePanel(panel, element, tokens);
        panel.classList.add('visible');
        panel.style.display = 'flex';
    },

    /**
     * Create inspector panel
     */
    createPanel: function() {
        const panel = document.createElement('div');
        panel.id = 'elementInspectorPanel';
        panel.innerHTML = `
            <div class="inspector-header">
                <span>Element Design Tokens
                    <span style="font-size: 0.7rem; color: var(--text-secondary); font-weight: normal;">(drag to move)</span>
                </span>
                <span class="close-inspector" style="cursor: pointer; color: var(--text-secondary); font-size: 1.5rem; padding: 0 0.5rem;">&times;</span>
            </div>
            <div class="inspector-content"></div>
        `;
        this.makeDraggable(panel);
        panel.querySelector('.close-inspector').addEventListener('click', () => this.closePanel());
        document.body.appendChild(panel);
        return panel;
    },

    /**
     * Make panel draggable
     */
    makeDraggable: function(panel) {
        const header = panel.querySelector('.inspector-header');
        let isDragging = false, initialX, initialY;

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('close-inspector')) return;
            isDragging = true;
            initialX = e.clientX - (parseInt(panel.style.left) || 0);
            initialY = e.clientY - (parseInt(panel.style.top) || 0);
            panel.style.transform = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                panel.style.left = (e.clientX - initialX) + 'px';
                panel.style.top = (e.clientY - initialY) + 'px';
            }
        });

        document.addEventListener('mouseup', () => { isDragging = false; });
    },

    /**
     * Close inspector panel
     */
    closePanel: function() {
        const panel = document.getElementById('elementInspectorPanel');
        if (panel) {
            panel.classList.remove('visible');
            panel.style.display = 'none';
        }
    },

    /**
     * Populate inspector panel with tokens
     */
    populatePanel: function(panel, element, tokens) {
        const content = panel.querySelector('.inspector-content');

        let html = `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-primary); border-radius: 4px; border: 1px solid var(--border);">
                <div style="font-weight: 600; color: var(--accent-primary); margin-bottom: 0.5rem;">Element Info</div>
                <div style="font-family: 'Courier New', monospace; color: var(--text-secondary); font-size: 0.8rem;">
                    <div style="margin-bottom: 0.5rem;"><strong>Tag:</strong> &lt;${tokens.element.tag}&gt;</div>
                    <div style="margin-bottom: 0.5rem;"><strong>ID:</strong> ${tokens.element.id}</div>
                    <div style="margin-bottom: 0.5rem;"><strong>Classes:</strong> ${tokens.element.classes}</div>
                    <div style="margin-bottom: 0.5rem;"><strong>XPath:</strong>
                        <div style="background: var(--bg-secondary); padding: 0.5rem; border-radius: 3px;
                                    margin-top: 0.25rem; word-break: break-all; color: var(--accent-primary);
                                    font-size: 0.75rem; border: 1px solid var(--border); cursor: pointer;"
                             onclick="navigator.clipboard.writeText('${tokens.element.xpath}')"
                             title="Click to copy">${tokens.element.xpath}</div>
                    </div>
                </div>
            </div>
        `;

        html += this.createTokenSection('Colors', tokens.colors);
        html += this.createTokenSection('Typography', tokens.typography);
        html += this.createTokenSection('Spacing', tokens.spacing);
        html += this.createTokenSection('Border', tokens.border);
        html += this.createTokenSection('Layout', tokens.layout);

        content.innerHTML = html;
    },

    /**
     * Create token section HTML
     */
    createTokenSection: function(title, tokens) {
        let html = `
            <div style="margin-bottom: 1.5rem;">
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;
                            font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">${title}</div>
        `;

        for (const [key, value] of Object.entries(tokens)) {
            const isColor = title === 'Colors';
            const colorSwatch = isColor && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent'
                ? `<div style="width: 24px; height: 24px; background: ${value}; border: 1px solid var(--border); border-radius: 3px; flex-shrink: 0;"></div>`
                : '';

            html += `
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;
                            padding: 0.5rem; background: var(--bg-tertiary); border-radius: 4px;">
                    ${colorSwatch}
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${key}</div>
                        <div style="font-family: 'Courier New', monospace; font-size: 0.7rem;
                                    color: var(--accent-primary); overflow: hidden; text-overflow: ellipsis;">${value}</div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    },

    /**
     * Handle shift+mousedown for long press
     */
    handleShiftMouseDown: function(e) {
        if (!e.shiftKey) return;
        if (e.target.closest('#designPanel') ||
            e.target.closest('#elementInspectorPanel') ||
            e.target.closest('.design-fab')) return;

        e.preventDefault();
        e.stopPropagation();

        this.currentElement = e.target;
        this.startTime = Date.now();
        this.progressOverlay = this.createProgressOverlay();
        this.updateProgressOverlay(this.currentElement, 0);

        let progress = 0;
        this.progressTimer = setInterval(() => {
            progress = ((Date.now() - this.startTime) / this.LONG_PRESS_DURATION) * 100;
            this.updateProgressOverlay(this.currentElement, progress);
            if (progress >= 100) clearInterval(this.progressTimer);
        }, 50);

        this.longPressTimer = setTimeout(() => {
            this.longPressTimer = null;
            const tokens = this.extractTokens(this.currentElement);
            this.displayTokens(this.currentElement, tokens);

            if (this.progressTimer) {
                clearInterval(this.progressTimer);
                this.progressTimer = null;
            }
            if (this.progressOverlay) {
                this.progressOverlay.remove();
                this.progressOverlay = null;
            }
        }, this.LONG_PRESS_DURATION);
    },

    /**
     * Handle mouseup to cancel long press
     */
    handleMouseUp: function(e) {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
        }
        if (this.progressOverlay) {
            this.progressOverlay.remove();
            this.progressOverlay = null;
        }
        this.currentElement = null;
    }
};


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/usage.js ===
/**
 * TUT Usage - Token usage tracking and analytics
 *
 * Scans DOM and stylesheets to build a map of where tokens are used,
 * tracks changes over time, and identifies orphaned/missing tokens.
 */

const TUT_Usage = {
    // Token usage registry
    _registry: {},

    // Scan configuration
    _config: {
        scanInterval: null,
        autoScan: false,
        trackHistory: true,
        maxHistory: 50
    },

    /**
     * Initialize usage tracking
     */
    init: function() {
        this._registry = {};
        this.scan();
        console.log('[TUT.Usage] Initialized');
    },

    /**
     * Full scan - analyze DOM and stylesheets for token usage
     */
    scan: function() {
        const startTime = performance.now();

        // Reset counts (keep history)
        Object.keys(this._registry).forEach(token => {
            this._registry[token].references = [];
            this._registry[token].elements = 0;
            this._registry[token].stylesheets = [];
        });

        // Scan all defined tokens
        this._scanDefinitions();

        // Scan DOM for computed style usage
        this._scanDOM();

        // Scan stylesheets for references
        this._scanStylesheets();

        // Calculate derived metrics
        this._calculateMetrics();

        const elapsed = (performance.now() - startTime).toFixed(2);
        console.log(`[TUT.Usage] Scan complete: ${Object.keys(this._registry).length} tokens in ${elapsed}ms`);

        // Emit event
        if (typeof TERRAIN !== 'undefined' && TERRAIN.Events) {
            TERRAIN.Events.emit('tut:usage:scan', {
                tokens: Object.keys(this._registry).length,
                elapsed
            });
        }

        return this._registry;
    },

    /**
     * Scan :root for token definitions
     */
    _scanDefinitions: function() {
        const root = document.documentElement;
        const rootStyles = getComputedStyle(root);

        // Get all custom properties from stylesheets
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules || []) {
                    if (rule.selectorText === ':root' && rule.style) {
                        for (let i = 0; i < rule.style.length; i++) {
                            const prop = rule.style[i];
                            if (prop.startsWith('--')) {
                                this._ensureToken(prop);
                                this._registry[prop].defined = true;
                                this._registry[prop].value = rootStyles.getPropertyValue(prop).trim();
                                this._registry[prop].source = sheet.href || 'inline';
                            }
                        }
                    }
                }
            } catch (e) {
                // Cross-origin stylesheet, skip
            }
        }
    },

    /**
     * Scan DOM elements for token usage in computed styles
     */
    _scanDOM: function() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_ELEMENT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            this._scanElement(node);
        }
    },

    /**
     * Scan a single element for token usage
     */
    _scanElement: function(el) {
        // Skip script, style, and hidden elements
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) return;

        const computed = getComputedStyle(el);
        const inline = el.style;

        // Check inline styles for var() references
        for (let i = 0; i < inline.length; i++) {
            const prop = inline[i];
            const value = inline.getPropertyValue(prop);
            this._extractTokenRefs(value, el, prop, 'inline');
        }

        // Track which tokens this element's computed style resolves to
        // by checking known token values
        Object.keys(this._registry).forEach(token => {
            const tokenValue = this._registry[token].value;
            if (!tokenValue) return;

            // Check common properties that use tokens
            const propsToCheck = [
                'background-color', 'color', 'border-color',
                'border-top-color', 'border-right-color',
                'border-bottom-color', 'border-left-color',
                'fill', 'stroke', 'box-shadow'
            ];

            propsToCheck.forEach(prop => {
                const computedValue = computed.getPropertyValue(prop);
                if (computedValue && computedValue.includes(tokenValue)) {
                    this._addReference(token, el, prop, 'computed');
                }
            });
        });
    },

    /**
     * Extract var(--token) references from a CSS value
     */
    _extractTokenRefs: function(value, el, prop, type) {
        const varRegex = /var\(\s*(--[\w-]+)/g;
        let match;
        while ((match = varRegex.exec(value)) !== null) {
            const token = match[1];
            this._ensureToken(token);
            this._addReference(token, el, prop, type);
        }
    },

    /**
     * Scan stylesheets for var() references
     */
    _scanStylesheets: function() {
        for (const sheet of document.styleSheets) {
            try {
                const href = sheet.href || 'inline';
                this._scanRules(sheet.cssRules, href);
            } catch (e) {
                // Cross-origin stylesheet
            }
        }
    },

    /**
     * Recursively scan CSS rules
     */
    _scanRules: function(rules, source) {
        if (!rules) return;

        for (const rule of rules) {
            if (rule.cssRules) {
                // @media, @supports, etc.
                this._scanRules(rule.cssRules, source);
            } else if (rule.style) {
                for (let i = 0; i < rule.style.length; i++) {
                    const prop = rule.style[i];
                    const value = rule.style.getPropertyValue(prop);

                    const varRegex = /var\(\s*(--[\w-]+)/g;
                    let match;
                    while ((match = varRegex.exec(value)) !== null) {
                        const token = match[1];
                        this._ensureToken(token);

                        if (!this._registry[token].stylesheets.includes(source)) {
                            this._registry[token].stylesheets.push(source);
                        }

                        this._registry[token].cssRules = (this._registry[token].cssRules || 0) + 1;
                    }
                }
            }
        }
    },

    /**
     * Ensure token exists in registry
     */
    _ensureToken: function(token) {
        if (!this._registry[token]) {
            this._registry[token] = {
                name: token,
                defined: false,
                value: null,
                source: null,
                references: [],
                elements: 0,
                stylesheets: [],
                cssRules: 0,
                history: [],
                firstSeen: Date.now(),
                lastChanged: null
            };
        }
    },

    /**
     * Add a reference to a token
     */
    _addReference: function(token, el, prop, type) {
        this._ensureToken(token);

        this._registry[token].references.push({
            element: el.tagName.toLowerCase(),
            id: el.id || null,
            classes: Array.from(el.classList).slice(0, 3),
            property: prop,
            type: type
        });

        this._registry[token].elements++;
    },

    /**
     * Calculate derived metrics
     */
    _calculateMetrics: function() {
        Object.values(this._registry).forEach(token => {
            // Components (unique class combinations)
            const components = new Set();
            token.references.forEach(ref => {
                if (ref.classes.length > 0) {
                    components.add(ref.classes[0]);
                }
            });
            token.components = Array.from(components);

            // Orphan detection
            token.isOrphan = token.defined && token.elements === 0 && token.cssRules === 0;

            // Missing detection (referenced but not defined)
            token.isMissing = !token.defined && (token.elements > 0 || token.cssRules > 0);
        });
    },

    /**
     * Record a value change in history
     */
    recordChange: function(token, oldValue, newValue) {
        this._ensureToken(token);

        if (this._config.trackHistory) {
            this._registry[token].history.unshift({
                from: oldValue,
                to: newValue,
                timestamp: Date.now()
            });

            // Trim history
            if (this._registry[token].history.length > this._config.maxHistory) {
                this._registry[token].history.pop();
            }
        }

        this._registry[token].lastChanged = Date.now();
        this._registry[token].value = newValue;
    },

    // =========================================================================
    // Query API
    // =========================================================================

    /**
     * Get usage data for a specific token
     */
    get: function(token) {
        return this._registry[token] || null;
    },

    /**
     * Get all tokens
     */
    getAll: function() {
        return { ...this._registry };
    },

    /**
     * Get tokens sorted by usage count
     */
    getByUsage: function() {
        return Object.values(this._registry)
            .sort((a, b) => b.elements - a.elements);
    },

    /**
     * Get orphaned tokens (defined but never used)
     */
    getOrphans: function() {
        return Object.values(this._registry)
            .filter(t => t.isOrphan);
    },

    /**
     * Get missing tokens (used but not defined)
     */
    getMissing: function() {
        return Object.values(this._registry)
            .filter(t => t.isMissing);
    },

    /**
     * Get tokens by component/class usage
     */
    getByComponent: function(component) {
        return Object.values(this._registry)
            .filter(t => t.components.includes(component));
    },

    /**
     * Get recently changed tokens
     */
    getRecentlyChanged: function(since = Date.now() - 3600000) {
        return Object.values(this._registry)
            .filter(t => t.lastChanged && t.lastChanged > since)
            .sort((a, b) => b.lastChanged - a.lastChanged);
    },

    /**
     * Get usage summary statistics
     */
    getSummary: function() {
        const tokens = Object.values(this._registry);
        return {
            total: tokens.length,
            defined: tokens.filter(t => t.defined).length,
            used: tokens.filter(t => t.elements > 0 || t.cssRules > 0).length,
            orphans: tokens.filter(t => t.isOrphan).length,
            missing: tokens.filter(t => t.isMissing).length,
            totalReferences: tokens.reduce((sum, t) => sum + t.elements, 0),
            mostUsed: tokens.sort((a, b) => b.elements - a.elements)[0]?.name || null
        };
    },

    /**
     * Find all elements using a specific token
     */
    findElements: function(token) {
        const elements = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_ELEMENT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            const inline = node.style.cssText;
            if (inline.includes(token)) {
                elements.push(node);
            }
        }

        return elements;
    },

    /**
     * Highlight elements using a token (visual debugging)
     */
    highlight: function(token, color = 'rgba(255, 0, 0, 0.3)') {
        this.clearHighlights();

        const elements = this.findElements(token);
        elements.forEach(el => {
            el.dataset.tutHighlight = 'true';
            el.style.outline = `2px solid ${color}`;
            el.style.outlineOffset = '2px';
        });

        return elements.length;
    },

    /**
     * Clear all highlights
     */
    clearHighlights: function() {
        document.querySelectorAll('[data-tut-highlight]').forEach(el => {
            delete el.dataset.tutHighlight;
            el.style.outline = '';
            el.style.outlineOffset = '';
        });
    }
};


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/deps.js ===
/**
 * TUT Deps - Token dependency graph
 *
 * Builds a graph of how tokens reference each other via var() fallbacks
 * and inheritance patterns. Enables impact analysis for token changes.
 */

const TUT_Deps = {
    // Dependency graph: token -> { dependsOn: [], dependents: [] }
    _graph: {},

    /**
     * Initialize dependency tracking
     */
    init: function() {
        this._graph = {};
        this.build();
        console.log('[TUT.Deps] Initialized');
    },

    /**
     * Build dependency graph from stylesheets
     */
    build: function() {
        this._graph = {};

        // Scan all stylesheets for var() with fallbacks
        for (const sheet of document.styleSheets) {
            try {
                this._scanRules(sheet.cssRules);
            } catch (e) {
                // Cross-origin stylesheet
            }
        }

        // Also scan inline styles
        document.querySelectorAll('[style]').forEach(el => {
            this._parseValue(el.style.cssText);
        });

        console.log(`[TUT.Deps] Built graph: ${Object.keys(this._graph).length} tokens`);
        return this._graph;
    },

    /**
     * Recursively scan CSS rules
     */
    _scanRules: function(rules) {
        if (!rules) return;

        for (const rule of rules) {
            if (rule.cssRules) {
                this._scanRules(rule.cssRules);
            } else if (rule.style) {
                for (let i = 0; i < rule.style.length; i++) {
                    const prop = rule.style[i];
                    const value = rule.style.getPropertyValue(prop);

                    // Check if this is a token definition
                    if (prop.startsWith('--')) {
                        this._ensureToken(prop);
                        // Check if the value references other tokens
                        this._parseValue(value, prop);
                    } else {
                        // Regular property using tokens
                        this._parseValue(value);
                    }
                }
            }
        }
    },

    /**
     * Parse a CSS value for var() references and build dependencies
     */
    _parseValue: function(value, definingToken = null) {
        // Match var(--token) and var(--token, fallback)
        // Handles nested: var(--a, var(--b, var(--c, default)))
        const tokens = this._extractTokens(value);

        if (definingToken && tokens.length > 0) {
            // This token depends on others
            this._ensureToken(definingToken);
            tokens.forEach(dep => {
                this._ensureToken(dep);
                this._addDependency(definingToken, dep);
            });
        }
    },

    /**
     * Extract all token names from a CSS value
     */
    _extractTokens: function(value) {
        const tokens = [];
        const regex = /var\(\s*(--[\w-]+)/g;
        let match;
        while ((match = regex.exec(value)) !== null) {
            tokens.push(match[1]);
        }
        return tokens;
    },

    /**
     * Ensure token exists in graph
     */
    _ensureToken: function(token) {
        if (!this._graph[token]) {
            this._graph[token] = {
                name: token,
                dependsOn: [],    // Tokens this one uses
                dependents: [],   // Tokens that use this one
                depth: 0          // Distance from root (no dependencies)
            };
        }
    },

    /**
     * Add a dependency relationship
     */
    _addDependency: function(token, dependsOn) {
        if (!this._graph[token].dependsOn.includes(dependsOn)) {
            this._graph[token].dependsOn.push(dependsOn);
        }
        if (!this._graph[dependsOn].dependents.includes(token)) {
            this._graph[dependsOn].dependents.push(token);
        }
    },

    // =========================================================================
    // Query API
    // =========================================================================

    /**
     * Get dependency info for a token
     */
    get: function(token) {
        return this._graph[token] || null;
    },

    /**
     * Get all tokens this one depends on (direct)
     */
    getDependencies: function(token) {
        return this._graph[token]?.dependsOn || [];
    },

    /**
     * Get all tokens that depend on this one (direct)
     */
    getDependents: function(token) {
        return this._graph[token]?.dependents || [];
    },

    /**
     * Get full dependency chain (recursive, all ancestors)
     */
    getFullDependencies: function(token, visited = new Set()) {
        if (visited.has(token)) return []; // Cycle detection
        visited.add(token);

        const direct = this.getDependencies(token);
        const all = [...direct];

        direct.forEach(dep => {
            all.push(...this.getFullDependencies(dep, visited));
        });

        return [...new Set(all)];
    },

    /**
     * Get full dependent chain (recursive, all descendants)
     */
    getFullDependents: function(token, visited = new Set()) {
        if (visited.has(token)) return [];
        visited.add(token);

        const direct = this.getDependents(token);
        const all = [...direct];

        direct.forEach(dep => {
            all.push(...this.getFullDependents(dep, visited));
        });

        return [...new Set(all)];
    },

    /**
     * Get impact analysis for changing a token
     * Returns all tokens and approximate element count affected
     */
    getImpact: function(token) {
        const affected = this.getFullDependents(token);
        affected.unshift(token); // Include self

        let totalElements = 0;
        if (typeof TUT_Usage !== 'undefined') {
            affected.forEach(t => {
                const usage = TUT_Usage.get(t);
                if (usage) totalElements += usage.elements;
            });
        }

        return {
            token,
            affectedTokens: affected,
            affectedCount: affected.length,
            estimatedElements: totalElements,
            risk: affected.length > 10 ? 'high' : affected.length > 3 ? 'medium' : 'low'
        };
    },

    /**
     * Get root tokens (no dependencies, foundation of design system)
     */
    getRoots: function() {
        return Object.values(this._graph)
            .filter(t => t.dependsOn.length === 0)
            .map(t => t.name);
    },

    /**
     * Get leaf tokens (nothing depends on them)
     */
    getLeaves: function() {
        return Object.values(this._graph)
            .filter(t => t.dependents.length === 0)
            .map(t => t.name);
    },

    /**
     * Detect circular dependencies
     */
    findCycles: function() {
        const cycles = [];
        const visited = new Set();
        const stack = new Set();

        const dfs = (token, path) => {
            if (stack.has(token)) {
                const cycleStart = path.indexOf(token);
                cycles.push(path.slice(cycleStart));
                return;
            }
            if (visited.has(token)) return;

            visited.add(token);
            stack.add(token);
            path.push(token);

            (this._graph[token]?.dependsOn || []).forEach(dep => {
                dfs(dep, [...path]);
            });

            stack.delete(token);
        };

        Object.keys(this._graph).forEach(token => {
            dfs(token, []);
        });

        return cycles;
    },

    /**
     * Get tokens grouped by depth (layers of abstraction)
     */
    getLayers: function() {
        const layers = {};

        // Calculate depth for each token
        const calculateDepth = (token, visited = new Set()) => {
            if (visited.has(token)) return 0;
            visited.add(token);

            const deps = this._graph[token]?.dependsOn || [];
            if (deps.length === 0) return 0;

            return 1 + Math.max(...deps.map(d => calculateDepth(d, visited)));
        };

        Object.keys(this._graph).forEach(token => {
            const depth = calculateDepth(token);
            this._graph[token].depth = depth;

            if (!layers[depth]) layers[depth] = [];
            layers[depth].push(token);
        });

        return layers;
    },

    /**
     * Export graph as DOT format (for visualization)
     */
    toDOT: function() {
        let dot = 'digraph TokenDeps {\n';
        dot += '  rankdir=TB;\n';
        dot += '  node [shape=box, style=rounded];\n\n';

        Object.entries(this._graph).forEach(([token, data]) => {
            const label = token.replace('--', '');
            dot += `  "${label}";\n`;

            data.dependsOn.forEach(dep => {
                const depLabel = dep.replace('--', '');
                dot += `  "${depLabel}" -> "${label}";\n`;
            });
        });

        dot += '}\n';
        return dot;
    },

    /**
     * Export as JSON for external tools
     */
    toJSON: function() {
        return JSON.stringify(this._graph, null, 2);
    }
};


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/api.js ===
/**
 * TUT API - Public interface and TERRAIN registration
 */

const TUT = {
    version: '1.0.0',
    _initialized: false,

    // Sub-modules (exposed for direct access)
    Tokens: TUT_Tokens,
    Themes: TUT_Themes,
    Panel: TUT_Panel,
    Fonts: TUT_Fonts,
    Export: TUT_Export,
    Inspector: TUT_Inspector,
    Usage: TUT_Usage,
    Deps: TUT_Deps,

    /**
     * Initialize TUT
     * @param {Object} options - Configuration options
     */
    init: function(options = {}) {
        if (this._initialized) {
            console.warn('[TUT] Already initialized');
            return this;
        }

        console.log('[TUT] Initializing v' + this.version);

        // Create FAB and Panel dynamically (if not already present)
        TUT_Panel.createFAB();
        TUT_Panel.create();

        // Initialize color pickers (for any existing pickers in DOM)
        TUT_Tokens.initPickers();

        // Initialize theme system
        TUT_Themes.init();

        // Restore sidebar position
        TUT_Panel.restoreSidebarPosition();

        // Collapse sections (except Theme Switcher and Colors)
        // Theme Switcher and Colors stay open by default

        // Setup click-outside handling
        TUT_Panel.setupClickOutside();

        // Initialize inspector
        TUT_Inspector.init();

        // Initialize usage tracking and dependency graph
        TUT_Usage.init();
        TUT_Deps.init();

        // Setup TERRAIN Bridge listeners
        this._setupBridge();

        // Setup event delegation for data-action attributes
        initTUTEventDelegation();

        this._initialized = true;

        // Emit init event
        if (typeof TERRAIN !== 'undefined' && TERRAIN.Events) {
            TERRAIN.Events.emit('tut:init');
        }

        console.log('[TUT] Initialized');
        return this;
    },

    /**
     * Destroy TUT instance
     */
    destroy: function() {
        if (!this._initialized) return;

        // Cleanup...
        this._initialized = false;

        if (typeof TERRAIN !== 'undefined' && TERRAIN.Events) {
            TERRAIN.Events.emit('tut:destroy');
        }
    },

    /**
     * Setup TERRAIN Bridge listeners for cross-iframe sync
     */
    _setupBridge: function() {
        if (typeof TERRAIN === 'undefined' || !TERRAIN.Bridge) return;

        // Listen for token changes from other frames
        TERRAIN.Bridge.on('tut:token-change', (data) => {
            if (data && data.name && data.value) {
                TUT_Tokens.update(data.name, data.value, { silent: true });
            }
        });

        // Listen for theme changes
        TERRAIN.Bridge.on('tut:theme-apply', (data) => {
            if (data && data.theme) {
                TUT_Themes.apply(data.theme);
            }
        });
    },

    // =========================================================================
    // Public API Methods
    // =========================================================================

    /**
     * Get a token value
     */
    getToken: function(name) {
        return TUT_Tokens.get(name);
    },

    /**
     * Set a token value
     */
    setToken: function(name, value, options) {
        TUT_Tokens.update(name, value, options);
    },

    /**
     * Get all token values
     */
    getAllTokens: function() {
        return TUT_Tokens.getAll();
    },

    /**
     * Reset all tokens to defaults
     */
    resetTokens: function() {
        TUT_Tokens.reset();
    },

    /**
     * Toggle design panel
     */
    togglePanel: function() {
        TUT_Panel.toggle();
    },

    /**
     * Export theme as JSON
     */
    exportJSON: function() {
        TUT_Export.toJSON();
    },

    /**
     * Export theme as CSS
     */
    exportCSS: function() {
        TUT_Export.toCSS();
    },

    /**
     * Import theme from file
     */
    importJSON: function() {
        TUT_Export.fromJSON();
    },

    /**
     * Build theme object
     */
    buildTheme: function() {
        return TUT_Export.buildThemeObject();
    },

    /**
     * Apply a theme object
     */
    applyTheme: function(theme) {
        TUT_Themes.apply(theme);
    },

    /**
     * Save current theme
     */
    saveTheme: function() {
        TUT_Themes.saveCurrent();
    },

    /**
     * Broadcast token change to other frames
     */
    broadcastToken: function(name, value) {
        if (typeof TERRAIN !== 'undefined' && TERRAIN.Bridge) {
            TERRAIN.Bridge.broadcast('tut:token-change', { name, value });
        }
    },

    /**
     * Broadcast theme to other frames
     */
    broadcastTheme: function(theme) {
        if (typeof TERRAIN !== 'undefined' && TERRAIN.Bridge) {
            TERRAIN.Bridge.broadcast('tut:theme-apply', { theme });
        }
    }
};

// =========================================================================
// Event Delegation - Single handler for all TUT actions
// Uses data-action attributes instead of individual onclick handlers
// =========================================================================

const TUT_Actions = {
    // Panel controls
    'toggle-panel': () => TUT.togglePanel(),
    'toggle-section': (el) => TUT_Panel.toggleSection(el.dataset.target),
    'close-panel': () => TUT_Panel.close(),

    // Token updates
    'update-token': (el) => TUT_Tokens.update(el.dataset.token, el.value),
    'update-section-border': (el) => TUT_Tokens.updateSectionBorder(el.value),
    'update-section-radius': (el) => TUT_Tokens.updateSectionRadius(el.value),
    'update-sidebar-position': (el) => TUT_Panel.updateSidebarPosition(el.value),
    'update-font': (el) => TUT_Fonts.update(el.dataset.fontType, el.value),
    'reset-tokens': () => TUT_Tokens.reset(),

    // Theme management
    'switch-theme': (el) => TUT_Themes.switch(el.value),
    'save-theme': () => TUT_Themes.saveCurrent(),
    'delete-theme': () => TUT_Themes.deleteCurrent(),

    // Export/Import
    'export-theme': () => TUT_Export.toJSON(),
    'copy-css': () => TUT_Export.toCSS(),
    'import-theme': () => TUT_Export.fromJSON(),

    // Fonts
    'add-font': () => TUT_Fonts.add(),
    'toggle-font-example': () => TUT_Fonts.toggleExample(),

    // Analysis
    'run-analysis': () => TUT_Panel.runAnalysis()
};

/**
 * Initialize event delegation for TUT actions
 */
function initTUTEventDelegation() {
    document.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action && TUT_Actions[action]) {
            e.preventDefault();
            TUT_Actions[action](e.target);
        }
    });

    document.addEventListener('change', (e) => {
        const action = e.target.dataset.action;
        if (action && TUT_Actions[action]) {
            TUT_Actions[action](e.target);
        }
    });

    document.addEventListener('input', (e) => {
        const action = e.target.dataset.action;
        if (action && TUT_Actions[action]) {
            TUT_Actions[action](e.target);
        }
    });
}

// =========================================================================
// Auto-initialization based on URL param
// =========================================================================

(function() {
    const params = new URLSearchParams(window.location.search);

    if (!params.has('design')) {
        // Hide FAB and panel if design mode not enabled
        const style = document.createElement('style');
        style.textContent = '.design-fab, .design-panel, #elementInspectorPanel { display: none !important; }';
        document.head.appendChild(style);
    } else {
        // Design mode enabled - auto-init on DOMContentLoaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => TUT.init());
        } else {
            TUT.init();
        }
    }
})();
    // === END MODULE ===

    // Register with TERRAIN
    TERRAIN.register('TUT', TUT);

})(window.TERRAIN);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/modes
# file: minimal.mode.json
# notes:
#MULTICAT_END
{
    "mode": {
        "name": "Minimal",
        "version": "1.0.0",
        "description": "Clean canvas without UI or effects"
    },
    "defaultTheme": "phosphor",
    "animation": {
        "autoRotate": false,
        "speed": 1,
        "rotSpeed": { "x": 0, "y": 0, "z": 0 }
    },
    "rendering": {
        "concentric": 3,
        "layerOffset": 2,
        "strokeWidth": 1,
        "glowIntensity": 40,
        "colorPrimary": "#00ffff",
        "colorSecondary": "#ff00aa",
        "fov": 1000,
        "cameraZ": 600
    },
    "effects": {
        "scanlines": false,
        "vignette": false,
        "drawOn": false,
        "drawSpeed": 2,
        "colorOscillate": false
    },
    "ui": {
        "sidePanel": false,
        "configPanel": false,
        "fab": false
    },
    "features": {
        "designMode": false,
        "persistence": false,
        "effects": false
    }
}

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/modes
# file: cymatica.mode.json
# notes:
#MULTICAT_END
{
    "mode": {
        "name": "Cymatica",
        "version": "1.0.0",
        "description": "Quadrascan Vector Art - Default Mode"
    },
    "defaultTheme": "phosphor",
    "animation": {
        "autoRotate": false,
        "speed": 1,
        "rotSpeed": { "x": 5, "y": 15, "z": 0 }
    },
    "rendering": {
        "concentric": 5,
        "layerOffset": 2,
        "strokeWidth": 1.5,
        "glowIntensity": 60,
        "colorPrimary": "#00ffff",
        "colorSecondary": "#ff00aa",
        "fov": 1000,
        "cameraZ": 600
    },
    "effects": {
        "scanlines": true,
        "vignette": true,
        "drawOn": false,
        "drawSpeed": 2,
        "colorOscillate": false
    },
    "ui": {
        "sidePanel": true,
        "configPanel": false,
        "fab": true
    },
    "features": {
        "designMode": false,
        "persistence": true,
        "effects": true
    }
}

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/modes
# file: demo.mode.json
# notes:
#MULTICAT_END
{
    "mode": {
        "name": "Demo",
        "version": "1.0.0",
        "description": "Full demo with animation and all effects"
    },
    "defaultTheme": "phosphor",
    "animation": {
        "autoRotate": true,
        "speed": 1.5,
        "rotSpeed": { "x": 8, "y": 20, "z": 2 }
    },
    "rendering": {
        "concentric": 7,
        "layerOffset": 3,
        "strokeWidth": 2,
        "glowIntensity": 80,
        "colorPrimary": "#00ffff",
        "colorSecondary": "#ff00aa",
        "fov": 1000,
        "cameraZ": 600
    },
    "effects": {
        "scanlines": true,
        "vignette": true,
        "drawOn": true,
        "drawSpeed": 3,
        "colorOscillate": true
    },
    "ui": {
        "sidePanel": true,
        "configPanel": true,
        "fab": true
    },
    "features": {
        "designMode": true,
        "persistence": true,
        "effects": true
    }
}

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica
# file: style.css
# notes:
#MULTICAT_END
/* CYMATICA - Quadrascan Vector Art */
/* Design Tokens (TUT-compatible) */
:root {
    /* Typography */
    --font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-family-mono: 'SF Mono', 'Monaco', 'Fira Code', 'Consolas', monospace;
    --font-size-xs: 0.8rem;
    --font-size-sm: 0.85rem;
    --font-size-base: 1rem;

    /* Spacing */
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --gap-sm: 8px;
    --gap-md: 12px;
    --gap-lg: 16px;

    /* Border Radius */
    --radius-sm: 0.125rem;
    --radius-base: 0.25rem;
    --radius-md: 0.375rem;
    --curve-sm: 4px;

    /* Timing */
    --duration-fast: 100ms;
    --duration-normal: 200ms;
    --duration-slow: 300ms;
    --tempo-fast: 150ms;
    --tempo-normal: 250ms;
    --ease-out: cubic-bezier(0, 0, 0.2, 1);

    /* TUT-compatible background tokens */
    --bg-primary: #0a0a12;
    --bg-secondary: #12121e;
    --bg-tertiary: #080810;
    --bg-hover: rgba(0, 212, 255, 0.05);

    /* TUT-compatible text tokens */
    --text-title: #eaeaea;
    --text-primary: #c0c0d0;
    --text-secondary: #8a8aa0;
    --text-muted: #606070;
    --text-code: #00d4ff;

    /* TUT-compatible accent tokens */
    --accent-primary: #00d4ff;
    --accent-secondary: #ff00aa;
    --accent-tertiary: #00ff88;

    /* TUT-compatible border tokens */
    --border: #1a1a2e;
    --border-subtle: #151528;
    --border-visible: #2a2a4e;
    --border-active: var(--accent-primary);

    /* Status colors */
    --success: #00ff88;
    --error: #ff4444;
    --warning: #ffaa00;

    /* Quadrascan colors - phosphor palette */
    --phosphor-cyan: #00ffff;
    --phosphor-blue: #4488ff;
    --phosphor-green: #00ff66;
    --phosphor-amber: #ffaa00;
    --phosphor-white: #ffffff;
}

*, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: var(--font-family-sans);
    font-size: var(--font-size-base);
    overflow: hidden;
    background: var(--bg-primary);
    color: var(--text-primary);
}

/* Scrollbar Styling */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--bg-secondary); border-radius: 4px; }
::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #4a4a6a; }
* { scrollbar-width: thin; scrollbar-color: #2a2a4a var(--bg-secondary); }

#app {
    width: 100vw;
    height: 100vh;
    position: relative;
    display: flex;
}

#viewport {
    flex: 1;
    position: relative;
    overflow: hidden;
    perspective: 1200px;
    background: radial-gradient(ellipse at center, #0a0a1a 0%, #000008 100%);
}

#scene {
    position: absolute;
    top: 50%;
    left: 50%;
    transform-style: preserve-3d;
    transform: translate(-50%, -50%);
}

/* SVG Canvas for vector rendering */
#vector-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
}

/* Scanline overlay for CRT effect */
#scanlines {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 20;
    background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 0, 0, 0.15) 2px,
        rgba(0, 0, 0, 0.15) 4px
    );
    opacity: 0.5;
}

/* Vignette effect */
#vignette {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 15;
    background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%);
}

/* Side Panel */
#side-panel {
    position: absolute;
    right: 0;
    top: 0;
    width: 320px;
    height: 100%;
    background: var(--bg-secondary);
    transform: translateX(0);
    transition: transform var(--duration-slow) var(--ease-out);
    z-index: 100;
    overflow-y: auto;
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
}

#side-panel.hidden {
    transform: translateX(320px);
}

#panel-toggle {
    position: absolute;
    left: -40px;
    top: var(--space-3);
    width: 40px;
    height: 40px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-right: none;
    border-radius: var(--radius-md) 0 0 var(--radius-md);
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    transition: all var(--duration-normal);
}

#panel-toggle:hover {
    background: var(--bg-hover);
    color: var(--accent-primary);
}

.panel-header {
    background: var(--bg-tertiary);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border);
}

.panel-header h1 {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--accent-primary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

.panel-menu {
    display: flex;
    gap: var(--gap-sm);
    padding: var(--space-2) var(--space-3);
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
}

.menu-btn {
    padding: var(--space-1) var(--space-2);
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--tempo-fast) ease;
}

.menu-btn:hover {
    background: var(--bg-primary);
    color: var(--accent-primary);
    border-color: var(--accent-primary);
}

.menu-btn.active {
    background: var(--accent-primary);
    color: var(--bg-primary);
    border-color: var(--accent-primary);
}

.panel-content {
    padding: var(--space-3);
    flex: 1;
}

/* Control Sections */
.control-section {
    margin-bottom: var(--space-4);
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    cursor: pointer;
    margin-bottom: var(--space-2);
    border: 1px solid var(--border-subtle);
}

.section-header:hover {
    border-color: var(--accent-primary);
}

.section-header h3 {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--text-title);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.section-toggle {
    font-size: 10px;
    color: var(--text-secondary);
    transition: transform var(--duration-fast);
}

.section-header.collapsed .section-toggle {
    transform: rotate(-90deg);
}

.section-content {
    padding: 0 var(--space-2);
}

.section-header.collapsed + .section-content {
    display: none;
}

/* Control Groups */
.control-group {
    margin-bottom: var(--space-3);
}

.control-group label {
    display: block;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin-bottom: var(--space-1);
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.control-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

input[type="range"] {
    flex: 1;
    height: 4px;
    -webkit-appearance: none;
    background: var(--border);
    border-radius: 2px;
    outline: none;
}

input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    background: var(--accent-primary);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--bg-primary);
}

.value-display {
    min-width: 40px;
    font-size: var(--font-size-xs);
    font-family: var(--font-family-mono);
    color: var(--accent-primary);
    text-align: right;
}

input[type="color"] {
    width: 32px;
    height: 24px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    background: transparent;
    padding: 0;
}

select {
    width: 100%;
    padding: var(--space-2);
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    color: var(--text-primary);
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    cursor: pointer;
}

select:hover {
    border-color: var(--accent-primary);
}

/* Letter Position Grid */
.letter-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
    margin-bottom: var(--space-3);
}

.letter-cell {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--duration-fast);
}

.letter-cell:hover,
.letter-cell.selected {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    background: var(--bg-hover);
}

/* Position Controls */
.position-controls {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
}

.position-control {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.position-control label {
    font-size: 10px;
    color: var(--text-secondary);
    text-align: center;
}

.position-control input {
    width: 100%;
    padding: var(--space-1);
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-family: var(--font-family-mono);
    text-align: center;
}

/* Preset Buttons */
.preset-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
}

.preset-btn {
    padding: var(--space-2);
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    color: var(--text-primary);
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    cursor: pointer;
    transition: all var(--duration-normal);
}

.preset-btn:hover {
    border-color: var(--accent-primary);
    background: var(--bg-hover);
}

/* Action Buttons */
.action-btn {
    padding: var(--space-2) var(--space-3);
    background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
    border: none;
    color: #000;
    font-weight: 600;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--font-size-xs);
    transition: all var(--duration-normal);
}

.action-btn:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
}

/* Toggle Switch */
.toggle-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.toggle {
    width: 40px;
    height: 20px;
    background: var(--border);
    border-radius: 10px;
    position: relative;
    cursor: pointer;
    transition: background var(--duration-normal);
}

.toggle.active {
    background: var(--accent-primary);
}

.toggle::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background: var(--text-title);
    border-radius: 50%;
    transition: transform var(--duration-normal);
}

.toggle.active::after {
    transform: translateX(20px);
}

/* Stats Display */
#stats {
    position: absolute;
    top: var(--space-3);
    left: var(--space-3);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xs);
    color: var(--accent-primary);
    opacity: 0.7;
    z-index: 50;
}

/* ============================================
   LOADING OVERLAY
   ============================================ */
#loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: var(--bg-primary);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.4s ease;
}

#loading-overlay.fade-out {
    opacity: 0;
    pointer-events: none;
}

.loading-text {
    font-family: var(--font-family-mono);
    font-size: 24px;
    font-weight: 700;
    color: var(--accent-primary);
    letter-spacing: 4px;
    text-transform: uppercase;
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.02); }
}

/* ============================================
   ENHANCED SECTION COLLAPSE (smooth animation)
   ============================================ */
.section-content {
    max-height: 1000px;
    overflow: hidden;
    transition: max-height 0.4s ease-out, opacity 0.3s ease;
    opacity: 1;
}

.section-content.collapsed {
    max-height: 0;
    opacity: 0;
    padding-top: 0;
    padding-bottom: 0;
}

.section-toggle,
.collapse-icon {
    transition: transform var(--duration-fast);
}

.section-toggle.collapsed,
.collapse-icon.collapsed {
    transform: rotate(-90deg);
}

/* ============================================
   UTILITY CLASSES
   ============================================ */
.hidden {
    display: none !important;
}

.visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
}

/* ============================================
   CONFIG PANEL (for design mode)
   ============================================ */
#config-panel {
    position: fixed;
    bottom: var(--gap-lg);
    right: var(--gap-lg);
    width: 320px;
    max-height: 70vh;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    z-index: 1000;
    overflow: hidden;
    transform: translateY(20px);
    opacity: 0;
    pointer-events: none;
    transition: transform var(--tempo-normal) ease, opacity var(--tempo-normal) ease;
}

#config-panel.active {
    transform: translateY(0);
    opacity: 1;
    pointer-events: all;
}

.config-panel-header {
    padding: var(--space-3);
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border);
    cursor: grab;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.config-panel-header:active {
    cursor: grabbing;
}

.config-panel-content {
    padding: var(--space-3);
    max-height: calc(70vh - 50px);
    overflow-y: auto;
}

/* ============================================
   MODULATION PANEL
   ============================================ */
.mod-subsection {
    margin-bottom: var(--space-3);
}

.mod-subsection-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-1) 0;
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border-subtle);
    margin-bottom: var(--space-2);
}

.add-btn {
    width: 20px;
    height: 20px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    color: var(--accent-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--duration-fast);
}

.add-btn:hover {
    background: var(--bg-hover);
    border-color: var(--accent-primary);
}

.mod-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.mod-item {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-2);
}

.mod-item-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
}

.mod-item-header input[type="checkbox"] {
    width: 14px;
    height: 14px;
    accent-color: var(--accent-primary);
}

.mod-item-header select {
    flex: 1;
    padding: var(--space-1);
    font-size: 10px;
}

.mod-item-header .asr-label {
    flex: 1;
    font-size: 10px;
    color: var(--text-secondary);
    text-transform: uppercase;
}

.mod-item-controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
}

.mod-item-controls label {
    min-width: 24px;
    font-size: 10px;
    color: var(--text-secondary);
    text-transform: uppercase;
}

.mod-item-controls input[type="range"] {
    flex: 1;
    height: 3px;
}

.mod-item-controls input[type="text"],
.mod-item-controls input[type="number"] {
    flex: 1;
    padding: var(--space-1);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    font-size: 10px;
    font-family: var(--font-family-mono);
}

.mod-item-controls .value-display {
    min-width: 36px;
    font-size: 10px;
}

.mod-visualizer {
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
    margin-top: var(--space-1);
}

.mod-bar {
    height: 100%;
    background: var(--accent-primary);
    width: 50%;
    transition: width 50ms linear;
    border-radius: 2px;
}

.asr-item .mod-bar {
    background: var(--accent-secondary);
}

.delete-btn {
    width: 18px;
    height: 18px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--duration-fast);
}

.delete-btn:hover {
    border-color: var(--error);
    color: var(--error);
}

.test-btn {
    padding: 2px 6px;
    background: var(--bg-secondary);
    border: 1px solid var(--accent-tertiary);
    color: var(--accent-tertiary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 10px;
    transition: all var(--duration-fast);
}

.test-btn:hover {
    background: var(--bg-hover);
}

/* Route Item */
.route-item {
    font-size: var(--font-size-xs);
}

.route-row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-bottom: var(--space-1);
}

.route-row select,
.route-row input[type="number"] {
    flex: 1;
    min-width: 0;
    padding: var(--space-1);
    font-size: 10px;
}

.route-row input[type="number"] {
    width: 50px;
    flex: 0 0 50px;
}

.route-row label {
    font-size: 10px;
    color: var(--text-secondary);
    min-width: 36px;
}

.route-arrow {
    color: var(--accent-primary);
    font-size: 12px;
}

.route-enable {
    width: 14px;
    height: 14px;
}

/* Broadcast Status */
.broadcast-status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: 10px;
    color: var(--text-secondary);
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-muted);
    transition: background var(--duration-normal);
}

.status-dot.active {
    background: var(--accent-tertiary);
    box-shadow: 0 0 6px var(--accent-tertiary);
}

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/dist
# file: tut.css
# notes:
#MULTICAT_END
/* === /Users/mricos/src/devops/tetra/bash/terrain/../tut/templates/design-tokens.css === */
/* Design Token Editor - FAB and Panel Styles
   Self-contained component with its own design tokens.
   Uses --fab- prefix to avoid conflicts with host document. */

/* =============================================================================
   FAB DESIGN TOKENS - Hardcoded values for consistency across all doc types
   ============================================================================= */

.design-fab,
.design-panel,
#elementInspectorPanel {
    --fab-bg-primary: #0d1117;
    --fab-bg-secondary: #161b22;
    --fab-bg-tertiary: #21262d;
    --fab-text-primary: #c9d1d9;
    --fab-text-secondary: #8b949e;
    --fab-accent-primary: #58a6ff;
    --fab-accent-secondary: #1f6feb;
    --fab-success: #3fb950;
    --fab-warning: #d29922;
    --fab-error: #f85149;
    --fab-border: #30363d;
}

/* =============================================================================
   FLOATING ACTION BUTTON
   Desaturated, rounded square design
   ============================================================================= */

.design-fab {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--fab-bg-tertiary);
    border: 1px solid var(--fab-border);
    color: var(--fab-text-secondary);
    font-size: 1.5rem;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    z-index: 1000;
    opacity: 0.7;
}

.design-fab:hover {
    opacity: 1;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    border-color: var(--fab-accent-primary);
}

.design-fab svg {
    opacity: 0.8;
}

.design-fab:hover svg {
    opacity: 1;
}

/* =============================================================================
   DESIGN PANEL
   ============================================================================= */

.design-panel {
    position: fixed;
    bottom: 5rem;
    right: 2rem;
    width: 320px;
    max-height: 70vh;
    background: var(--fab-bg-secondary);
    border: 1px solid var(--fab-border);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    display: none;
    flex-direction: column;
    z-index: 999;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.design-panel.visible {
    display: flex;
    animation: designPanelSlideUp 0.3s ease;
}

@keyframes designPanelSlideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.design-panel-header {
    padding: 1rem;
    background: var(--fab-bg-tertiary);
    border-bottom: 1px solid var(--fab-border);
    font-weight: 600;
    color: var(--fab-text-primary);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.design-panel-close {
    cursor: pointer;
    color: var(--fab-text-secondary);
    font-size: 1.2rem;
}

.design-panel-close:hover {
    color: var(--fab-text-primary);
}

.design-panel-content {
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
    color: var(--fab-text-primary);
}

/* Styled scrollbar for design panel */
.design-panel-content::-webkit-scrollbar {
    width: 8px;
}

.design-panel-content::-webkit-scrollbar-track {
    background: var(--fab-bg-primary);
    border-radius: 4px;
}

.design-panel-content::-webkit-scrollbar-thumb {
    background: var(--fab-border);
    border-radius: 4px;
}

.design-panel-content::-webkit-scrollbar-thumb:hover {
    background: var(--fab-accent-primary);
}

/* =============================================================================
   COLLAPSIBLE SECTIONS
   ============================================================================= */

.token-section {
    margin-bottom: 0.5rem;
    border: 1px solid var(--fab-border);
    border-radius: 6px;
    overflow: hidden;
}

.token-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.75rem;
    background: var(--fab-bg-tertiary);
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--fab-text-primary);
    user-select: none;
    transition: background 0.15s ease;
}

.token-section-header:hover {
    background: var(--fab-bg-primary);
}

.section-toggle {
    font-size: 0.65rem;
    color: var(--fab-text-secondary);
    transition: transform 0.2s ease;
}

.token-section-content {
    padding: 0.75rem;
    background: var(--fab-bg-secondary);
    max-height: 1000px;
    overflow: hidden;
    transition: max-height 0.3s ease, padding 0.3s ease;
}

.token-section.collapsed .token-section-content {
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
}

/* =============================================================================
   METADATA FIELDS
   ============================================================================= */

.metadata-field {
    margin-bottom: 0.6rem;
}

.metadata-field label {
    display: block;
    font-size: 0.7rem;
    color: var(--fab-text-secondary);
    margin-bottom: 0.2rem;
}

.metadata-field .font-input,
.metadata-field .font-select {
    margin-top: 0;
    font-size: 0.8rem;
    padding: 0.4rem 0.5rem;
}

/* =============================================================================
   TOKEN GROUPS AND ITEMS
   ============================================================================= */

.token-group {
    margin-bottom: 1rem;
}

.token-group-title {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--fab-text-secondary);
    margin-bottom: 0.75rem;
    font-weight: 600;
}

.token-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
}

.token-swatch {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    border: 1px solid var(--fab-border);
    flex-shrink: 0;
}

.token-info {
    flex: 1;
    min-width: 0;
}

.token-name {
    font-size: 0.75rem;
    font-family: 'Courier New', monospace;
    color: var(--fab-text-secondary);
    margin-bottom: 0.15rem;
}

.token-value {
    font-size: 0.7rem;
    font-family: 'Courier New', monospace;
    color: var(--fab-accent-primary);
}

.token-picker {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

/* =============================================================================
   FORM CONTROLS (consolidated base styles)
   ============================================================================= */

/* Base form control - shared by select and input */
.font-select,
.font-input {
    width: 100%;
    padding: 0.5rem;
    background: var(--fab-bg-primary);
    color: var(--fab-text-primary);
    border: 1px solid var(--fab-border);
    border-radius: 4px;
    margin-top: 0.5rem;
}

.font-select:focus,
.font-input:focus {
    outline: none;
    border-color: var(--fab-accent-primary);
}

/* Select-specific */
.font-select {
    font-size: 0.85rem;
    cursor: pointer;
}

/* Input-specific */
.font-input {
    font-size: 0.8rem;
    font-family: 'Courier New', monospace;
}

.font-input::placeholder {
    color: var(--fab-text-secondary);
    opacity: 0.5;
}

/* Range slider styling */
input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    background: var(--fab-bg-primary);
    border-radius: 3px;
    outline: none;
    border: 1px solid var(--fab-border);
}

input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--fab-accent-primary);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--fab-bg-secondary);
}

input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: var(--fab-accent-primary);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--fab-bg-secondary);
}

.add-font-btn {
    width: 100%;
    padding: 0.4rem;
    background: var(--fab-bg-tertiary);
    color: var(--fab-text-primary);
    border: 1px solid var(--fab-border);
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
    margin-top: 0.5rem;
    transition: all 0.2s ease;
}

.add-font-btn:hover {
    border-color: var(--fab-accent-primary);
    color: var(--fab-accent-primary);
}

/* Font Example Toggle */
.font-example-toggle {
    font-size: 0.75rem;
    color: var(--fab-accent-primary);
    cursor: pointer;
    margin-top: 0.5rem;
    display: inline-block;
    user-select: none;
}

.font-example-toggle:hover {
    text-decoration: underline;
}

.font-example-content {
    display: none;
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: var(--fab-bg-tertiary);
    border-radius: 4px;
    font-size: 0.7rem;
    color: var(--fab-text-secondary);
    line-height: 1.6;
}

.font-example-content.expanded {
    display: block;
}

.font-example-content ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
}

.font-example-content li {
    margin-bottom: 0.5rem;
}

.font-example-content code {
    background: var(--fab-bg-primary);
    padding: 0.2rem 0.4rem;
    border-radius: 2px;
    font-size: 0.65rem;
}

.font-example-content a {
    color: var(--fab-accent-primary);
}

/* =============================================================================
   PANEL ACTION BUTTONS
   ============================================================================= */

.design-panel-buttons {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
}

.design-panel-btn {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--fab-border);
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--fab-bg-tertiary);
    color: var(--fab-text-primary);
}

/* Legacy button classes - use .design-panel-btn--primary/--secondary/--danger instead */
.copy-tokens-btn { background: var(--fab-accent-secondary); color: white; border-color: var(--fab-accent-primary); }
.copy-tokens-btn:hover { background: var(--fab-accent-primary); }
.copy-tokens-btn.copied { background: var(--fab-success); border-color: var(--fab-success); }
.load-tokens-btn { background: var(--fab-bg-tertiary); border-color: var(--fab-border); color: var(--fab-text-primary); }
.load-tokens-btn:hover { border-color: var(--fab-accent-primary); color: var(--fab-accent-primary); }
.reset-tokens-btn { background: var(--fab-bg-tertiary); color: var(--fab-text-primary); border-color: var(--fab-border); }
.reset-tokens-btn:hover { background: var(--fab-bg-primary); border-color: var(--fab-warning); color: var(--fab-warning); }

/* =============================================================================
   INLINE FEEDBACK STYLES
   ============================================================================= */

.theme-feedback {
    margin-top: 0.5rem;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    font-size: 0.75rem;
    text-align: center;
    transition: all 0.2s ease;
}

.theme-feedback.success {
    background: rgba(63, 185, 80, 0.15);
    color: var(--fab-success);
    border: 1px solid rgba(63, 185, 80, 0.3);
}

.theme-feedback.error {
    background: rgba(248, 81, 73, 0.15);
    color: var(--fab-error);
    border: 1px solid rgba(248, 81, 73, 0.3);
}

.theme-feedback.info {
    background: rgba(88, 166, 255, 0.15);
    color: var(--fab-accent-primary);
    border: 1px solid rgba(88, 166, 255, 0.3);
}

/* =============================================================================
   UTILITY CLASSES - For replacing inline styles
   ============================================================================= */

/* Display utilities */
.hidden { display: none !important; }
.visible { display: block !important; }

/* Spacing utilities */
.control-group { margin-bottom: 0.75rem; }
.mt-0 { margin-top: 0 !important; }
.mt-half { margin-top: 0.5rem; }
.mb-half { margin-bottom: 0.5rem; }

/* Form field label (replaces repeated inline label styles) */
.field-label {
    font-size: 0.75rem;
    color: var(--fab-text-secondary);
    display: block;
    margin-bottom: 0.25rem;
}

/* Help text (small muted text) */
.help-text {
    font-size: 0.7rem;
    color: var(--fab-text-secondary);
    margin-top: 0.5rem;
}

/* Card container (for embedded sections like font embed) */
.fab-card {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--fab-bg-primary);
    border-radius: 4px;
    border: 1px solid var(--fab-border);
}

/* Code sample box */
.fab-code-sample {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: var(--fab-bg-tertiary);
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.55rem;
    word-break: break-all;
}

/* Tip/hint text */
.fab-tip {
    margin-top: 0.5rem;
    font-size: 0.65rem;
    color: var(--fab-text-secondary);
}

/* =============================================================================
   BUTTON MODIFIERS - Consolidate button variants
   ============================================================================= */

/* Primary button (blue) */
.design-panel-btn--primary {
    background: var(--fab-accent-secondary);
    color: white;
    border-color: var(--fab-accent-primary);
}

.design-panel-btn--primary:hover {
    background: var(--fab-accent-primary);
}

/* Secondary button (dark/outline) */
.design-panel-btn--secondary {
    background: var(--fab-bg-tertiary);
    color: var(--fab-text-primary);
    border-color: var(--fab-border);
}

.design-panel-btn--secondary:hover {
    border-color: var(--fab-accent-primary);
    color: var(--fab-accent-primary);
}

/* Danger button (warning on hover) */
.design-panel-btn--danger {
    background: var(--fab-bg-tertiary);
    color: var(--fab-text-primary);
    border-color: var(--fab-border);
}

.design-panel-btn--danger:hover {
    background: var(--fab-bg-primary);
    border-color: var(--fab-warning);
    color: var(--fab-warning);
}

/* Success state (for any button after action) */
.design-panel-btn.copied,
.design-panel-btn--success,
.design-panel-btn.feedback-success {
    background: var(--fab-success) !important;
    border-color: var(--fab-success) !important;
    color: white !important;
}

/* Error state for buttons */
.design-panel-btn.feedback-error {
    background: var(--fab-error) !important;
    border-color: var(--fab-error) !important;
    color: white !important;
}

/* Flex utility for buttons */
.flex-1 { flex: 1; }

/* Legacy .form-control alias (use .font-select or .font-input instead) */
.form-control {
    width: 100%;
    padding: 0.5rem;
    background: var(--fab-bg-primary);
    color: var(--fab-text-primary);
    border: 1px solid var(--fab-border);
    border-radius: 4px;
    margin-top: 0.5rem;
}

.form-control:focus {
    outline: none;
    border-color: var(--fab-accent-primary);
}

/* =============================================================================
   ELEMENT INSPECTOR PANEL
   ============================================================================= */

#elementInspectorPanel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    max-width: 90vw;
    max-height: 80vh;
    background: var(--fab-bg-secondary);
    border: 2px solid var(--fab-accent-primary);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    display: none;
    flex-direction: column;
    z-index: 10001;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--fab-text-primary);
}

#elementInspectorPanel.visible {
    display: flex;
}

#elementInspectorPanel .inspector-header {
    padding: 1rem;
    background: var(--fab-bg-tertiary);
    border-bottom: 1px solid var(--fab-border);
    font-weight: 600;
    color: var(--fab-text-primary);
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: move;
    user-select: none;
}

#elementInspectorPanel .inspector-content {
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
    font-size: 0.85rem;
}

#elementInspectorPanel .inspector-content::-webkit-scrollbar {
    width: 12px;
}

#elementInspectorPanel .inspector-content::-webkit-scrollbar-track {
    background: var(--fab-bg-primary);
    border-radius: 6px;
    margin: 4px;
}

#elementInspectorPanel .inspector-content::-webkit-scrollbar-thumb {
    background: var(--fab-accent-secondary);
    border-radius: 6px;
    border: 2px solid var(--fab-bg-primary);
}

#elementInspectorPanel .inspector-content::-webkit-scrollbar-thumb:hover {
    background: var(--fab-accent-primary);
}


#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/dist
# file: cymatica.core.js
# notes:
#MULTICAT_END
/**
 * CYMATICA Core Bundle
 * Generated: $(date -Iseconds)
 * Modules: namespace, config, utils, events, state, mode
 */

// === js/core/namespace.js ===
/**
 * CYMATICA Namespace
 * Global namespace initialization
 */
window.CYMATICA = window.CYMATICA || {
    version: '2.0.0',
    modules: {}
};

// === js/core/config.js ===
/**
 * CYMATICA Configuration Module
 * Feature flags and application defaults
 */
(function(CYMATICA) {
    'use strict';

    // Resolve design mode from URL or config
    function resolveDesignMode(configDefault) {
        const urlParam = CYMATICA.Utils?.getUrlParam?.('design');
        if (urlParam === 'true') return true;
        if (urlParam === 'false') return false;
        return configDefault;
    }

    const CymaticaConfig = {
        version: '2.0.0',

        features: {
            // Design token FAB - hidden by default, ?design=true to enable
            designMode: resolveDesignMode(false),

            // State persistence to localStorage
            persistence: true,

            // Visual effects
            effects: true
        },

        animation: {
            autoRotate: false,
            speed: 1,
            rotSpeed: { x: 5, y: 15, z: 0 }
        },

        rendering: {
            concentric: 5,
            layerOffset: 2,
            strokeWidth: 1.5,
            glowIntensity: 60,
            colorPrimary: '#00ffff',
            colorSecondary: '#ff00aa',
            fov: 1000,
            cameraZ: 600
        },

        effects: {
            scanlines: true,
            vignette: true,
            drawOn: false,
            drawSpeed: 2,
            colorOscillate: false
        },

        ui: {
            sidePanel: true,
            configPanel: false,
            fab: true
        },

        data: {
            source: 'static',
            defaultsPath: 'data/defaults.json'
        },

        /**
         * Get a config value by dot-notation path
         */
        get: function(path) {
            return CYMATICA.Utils?.getByPath?.(this, path) ||
                   path.split('.').reduce((obj, key) => obj && obj[key], this);
        },

        /**
         * Set a config value by dot-notation path
         */
        set: function(path, value) {
            if (CYMATICA.Utils?.setByPath) {
                CYMATICA.Utils.setByPath(this, path, value);
            } else {
                const keys = path.split('.');
                const lastKey = keys.pop();
                const target = keys.reduce((obj, key) => obj[key], this);
                if (target) {
                    target[lastKey] = value;
                }
            }
        },

        /**
         * Initialize from merged config (mode + app overrides)
         */
        init: function(config) {
            const merge = (target, source) => {
                for (const key in source) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        target[key] = target[key] || {};
                        merge(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            };
            merge(this, config);
            console.log('[CYMATICA.Config] Initialized');
        }
    };

    CYMATICA.Config = CymaticaConfig;

})(window.CYMATICA);

// === js/core/utils.js ===
/**
 * CYMATICA Utils Module
 * Shared utility functions
 */
(function(CYMATICA) {
    'use strict';

    const CymaticaUtils = {
        /**
         * Cached URLSearchParams instance
         */
        _urlParams: null,

        /**
         * Get URLSearchParams (cached)
         */
        getUrlParams: function() {
            if (!this._urlParams) {
                this._urlParams = new URLSearchParams(window.location.search);
            }
            return this._urlParams;
        },

        /**
         * Get a URL parameter value
         */
        getUrlParam: function(name, defaultValue = null) {
            const value = this.getUrlParams().get(name);
            return value !== null ? value : defaultValue;
        },

        /**
         * Check if URL has a parameter
         */
        hasUrlParam: function(name) {
            return this.getUrlParams().has(name);
        },

        /**
         * Get URL parameter as boolean
         */
        getUrlParamBool: function(name, defaultValue = false) {
            const value = this.getUrlParams().get(name);
            if (value === null) return defaultValue;
            return value === 'true' || value === '1' || value === '';
        },

        /**
         * Debounce a function
         */
        debounce: function(fn, delay) {
            let timer = null;
            return function(...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, args), delay);
            };
        },

        /**
         * Throttle a function
         */
        throttle: function(fn, limit) {
            let inThrottle = false;
            return function(...args) {
                if (!inThrottle) {
                    fn.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Generate a unique ID
         */
        uniqueId: function(prefix) {
            return (prefix || 'id') + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        },

        /**
         * Deep clone an object
         */
        deepClone: function(obj) {
            return JSON.parse(JSON.stringify(obj));
        },

        /**
         * Get value from nested object by dot-notation path
         */
        getByPath: function(obj, path, defaultValue) {
            const keys = path.split('.');
            let result = obj;
            for (const key of keys) {
                if (result == null || typeof result !== 'object') {
                    return defaultValue;
                }
                result = result[key];
            }
            return result !== undefined ? result : defaultValue;
        },

        /**
         * Set value in nested object by dot-notation path
         */
        setByPath: function(obj, path, value) {
            const keys = path.split('.');
            let current = obj;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!(key in current) || typeof current[key] !== 'object') {
                    current[key] = {};
                }
                current = current[key];
            }
            current[keys[keys.length - 1]] = value;
        },

        // =====================================================================
        // Color Utilities (for rendering)
        // =====================================================================

        /**
         * Parse hex color to RGB
         */
        hexToRgb: function(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },

        /**
         * Convert RGB to hex
         */
        rgbToHex: function(r, g, b) {
            return '#' + [r, g, b].map(x => {
                const hex = Math.round(x).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        },

        /**
         * Interpolate between two hex colors
         */
        lerpColor: function(color1, color2, t) {
            const rgb1 = this.hexToRgb(color1);
            const rgb2 = this.hexToRgb(color2);
            if (!rgb1 || !rgb2) return color1;

            return this.rgbToHex(
                rgb1.r + (rgb2.r - rgb1.r) * t,
                rgb1.g + (rgb2.g - rgb1.g) * t,
                rgb1.b + (rgb2.b - rgb1.b) * t
            );
        },

        /**
         * HSL to RGB conversion
         */
        hslToRgb: function(h, s, l) {
            let r, g, b;
            if (s === 0) {
                r = g = b = l;
            } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }
            return { r: r * 255, g: g * 255, b: b * 255 };
        }
    };

    CYMATICA.Utils = CymaticaUtils;

})(window.CYMATICA);

// === js/core/events.js ===
/**
 * CYMATICA Events Module
 * Pub/sub event bus with DOM binding support
 */
(function(CYMATICA) {
    'use strict';

    const listeners = {};

    const CymaticaEvents = {
        /**
         * Subscribe to an event (terrain-compatible)
         */
        on: function(event, callback) {
            if (!listeners[event]) {
                listeners[event] = [];
            }
            listeners[event].push(callback);

            // Return unsubscribe function
            return function() {
                const index = listeners[event].indexOf(callback);
                if (index > -1) {
                    listeners[event].splice(index, 1);
                }
            };
        },

        /**
         * Subscribe to an event (one-time)
         */
        once: function(event, callback) {
            const unsubscribe = this.on(event, function(...args) {
                unsubscribe();
                callback.apply(this, args);
            });
        },

        /**
         * Emit an event (terrain-compatible)
         */
        emit: function(event, data) {
            if (listeners[event]) {
                listeners[event].forEach(callback => {
                    try {
                        callback(data);
                    } catch (e) {
                        console.error(`[CYMATICA.Events] Error in ${event} handler:`, e);
                    }
                });
            }
        },

        /**
         * Remove all listeners for an event
         */
        off: function(event) {
            if (event) {
                delete listeners[event];
            } else {
                Object.keys(listeners).forEach(key => delete listeners[key]);
            }
        },

        // Legacy API aliases (keep backwards compatibility)
        subscribe: function(event, callback) {
            return this.on(event, callback);
        },

        publish: function(event, data) {
            this.emit(event, data);
        },

        // ================================
        // DOM Binding (data-cymatica-* attributes)
        // ================================

        _bindings: new WeakMap(),
        _observer: null,

        /**
         * Initialize DOM bindings
         */
        bindDOM: function() {
            this.scanBindings();
            this.setupMutationObserver();
            console.log('[CYMATICA.Events] DOM bindings initialized');
        },

        /**
         * Scan document for data-cymatica-bind attributes
         */
        scanBindings: function() {
            document.querySelectorAll('[data-cymatica-bind]').forEach(el => {
                this.bindElement(el);
            });

            document.querySelectorAll('[data-action]').forEach(el => {
                this.bindAction(el);
            });
        },

        /**
         * Bind an element to a state path
         */
        bindElement: function(el) {
            if (this._bindings.has(el)) return;

            const path = el.dataset.cymaticaBind;
            const format = el.dataset.cymaticaFormat || 'text';

            if (!path) return;

            const state = CYMATICA.state;
            if (!state) {
                console.warn('[CYMATICA.Events] State not available for binding');
                return;
            }

            // Set initial value
            this.updateElement(el, state.get(path), format);

            // Subscribe to state changes
            const unsubscribe = this.on(CymaticaEvents.STATE_CHANGE, (data) => {
                if (!data || !data.path || data.path === path || data.path === '*' || path.startsWith(data.path + '.')) {
                    this.updateElement(el, state.get(path), format);
                }
            });

            this._bindings.set(el, { path, format, unsubscribe });
        },

        /**
         * Update element based on format type
         */
        updateElement: function(el, value, format) {
            switch (format) {
                case 'text':
                    el.textContent = value ?? '';
                    break;
                case 'html':
                    el.innerHTML = value ?? '';
                    break;
                case 'value':
                    el.value = value ?? '';
                    break;
                case 'visible':
                    el.classList.toggle('hidden', !value);
                    break;
                case 'hidden':
                    el.classList.toggle('hidden', !!value);
                    break;
                case 'toggle':
                    el.classList.toggle('active', !!value);
                    break;
                default:
                    el.textContent = value ?? '';
            }
        },

        /**
         * Bind an action element
         */
        bindAction: function(el) {
            if (el._actionBound) return;

            const actionSpec = el.dataset.action;
            if (!actionSpec) return;

            const [eventName, ...payloadParts] = actionSpec.split(':');
            const payloadStr = payloadParts.join(':');

            el.addEventListener('click', (e) => {
                e.preventDefault();
                let payload = {};

                if (payloadStr) {
                    try {
                        payload = JSON.parse(payloadStr);
                    } catch {
                        payload = { value: payloadStr };
                    }
                }

                this.emit(eventName, payload);
            });

            el._actionBound = true;
        },

        /**
         * Setup mutation observer for dynamically added elements
         */
        setupMutationObserver: function() {
            if (this._observer) return;

            this._observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.scanNodeBindings(node);
                        }
                    });
                });
            });

            this._observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },

        /**
         * Scan a node and its children for bindings
         */
        scanNodeBindings: function(node) {
            if (node.dataset) {
                if (node.dataset.cymaticaBind) {
                    this.bindElement(node);
                }
                if (node.dataset.action) {
                    this.bindAction(node);
                }
            }

            if (node.querySelectorAll) {
                node.querySelectorAll('[data-cymatica-bind]').forEach(el => {
                    this.bindElement(el);
                });
                node.querySelectorAll('[data-action]').forEach(el => {
                    this.bindAction(el);
                });
            }
        }
    };

    // Standard event names
    // Lifecycle
    CymaticaEvents.READY = 'cymatica:ready';
    CymaticaEvents.DESTROY = 'cymatica:destroy';

    // State
    CymaticaEvents.STATE_CHANGE = 'state:change';
    CymaticaEvents.STATE_LOADED = 'state:loaded';
    CymaticaEvents.STATE_SAVED = 'state:saved';
    CymaticaEvents.STATE_RESET = 'state:reset';

    // Mode & Theme
    CymaticaEvents.MODE_APPLIED = 'mode:applied';
    CymaticaEvents.THEME_CHANGED = 'theme:changed';

    // Animation
    CymaticaEvents.ANIMATION_START = 'animation:start';
    CymaticaEvents.ANIMATION_STOP = 'animation:stop';

    // UI
    CymaticaEvents.UI_TOGGLE = 'ui:toggle';
    CymaticaEvents.CONFIG_TOGGLE = 'config:toggle';
    CymaticaEvents.PANEL_OPEN = 'panel:open';
    CymaticaEvents.PANEL_CLOSE = 'panel:close';

    // Rendering
    CymaticaEvents.RENDER_FRAME = 'render:frame';
    CymaticaEvents.PRESET_APPLIED = 'preset:applied';
    CymaticaEvents.LAYOUT_CHANGED = 'layout:changed';

    CYMATICA.events = CymaticaEvents;
    CYMATICA.Events = CymaticaEvents; // Alias for terrain compatibility

})(window.CYMATICA);

// === js/core/state.js ===
/**
 * CYMATICA State Module
 * Centralized state management with dot-notation access
 */
(function(CYMATICA) {
    'use strict';

    // Letter path definitions for vector rendering
    const LETTER_PATHS = {
        'C': [
            'M 85 25 Q 85 10 65 5 Q 40 0 20 20 Q 0 45 0 55 Q 0 70 15 85 Q 35 105 65 100 Q 85 95 85 80',
            'M 75 30 Q 75 20 60 15 Q 40 10 25 25 Q 10 45 10 55 Q 10 65 20 78 Q 38 95 60 90 Q 75 85 75 75'
        ],
        'Y': [
            'M 5 5 L 50 50',
            'M 95 5 L 50 50',
            'M 50 50 L 50 100',
            'M 20 20 L 35 35',
            'M 80 20 L 65 35'
        ],
        'M': [
            'M 5 100 L 5 5 L 50 60 L 95 5 L 95 100',
            'M 15 90 L 15 20',
            'M 85 90 L 85 20',
            'M 30 40 L 50 70 L 70 40'
        ],
        'A': [
            'M 5 100 L 50 5 L 95 100',
            'M 22 70 L 78 70',
            'M 20 85 L 50 20 L 80 85',
            'M 30 80 L 70 80'
        ],
        'T': [
            'M 5 5 L 95 5',
            'M 50 5 L 50 100',
            'M 5 15 L 20 5',
            'M 95 15 L 80 5',
            'M 15 15 L 85 15'
        ],
        'I': [
            'M 25 5 L 75 5',
            'M 25 100 L 75 100',
            'M 50 5 L 50 100',
            'M 35 5 L 35 15',
            'M 65 5 L 65 15',
            'M 35 100 L 35 90',
            'M 65 100 L 65 90'
        ],
        // Lowercase letters
        'c': [
            'M 80 30 Q 80 15 55 15 Q 25 15 15 50 Q 5 85 35 95 Q 60 100 80 85',
            'M 70 35 Q 70 25 55 25 Q 35 25 28 50 Q 20 75 40 85 Q 55 90 70 80'
        ],
        'y': [
            'M 10 15 L 50 75',
            'M 90 15 L 50 75 Q 40 100 25 110',
            'M 25 30 L 40 55',
            'M 75 30 L 60 55'
        ],
        'm': [
            'M 5 100 L 5 30',
            'M 5 40 Q 5 15 30 15 Q 50 15 50 40 L 50 100',
            'M 50 40 Q 50 15 75 15 Q 95 15 95 40 L 95 100',
            'M 15 90 L 15 45',
            'M 60 90 L 60 45'
        ],
        'a': [
            'M 75 30 Q 75 15 50 15 Q 20 15 15 50 Q 10 85 50 90 Q 75 90 75 70',
            'M 75 30 L 75 100',
            'M 65 35 Q 65 25 50 25 Q 30 25 27 50 Q 24 75 50 78 Q 65 78 65 65'
        ],
        't': [
            'M 50 5 L 50 85 Q 50 100 70 100',
            'M 25 30 L 80 30',
            'M 35 40 L 70 40'
        ],
        'i': [
            'M 50 30 L 50 100',
            'M 50 5 L 50 15',
            'M 35 30 L 65 30',
            'M 35 100 L 65 100'
        ]
    };

    // Expose letter paths
    CYMATICA.LETTER_PATHS = LETTER_PATHS;

    // Default state values
    const defaultState = {
        // Letter positions
        letters: [
            { char: 'c', x: -350, y: 0, z: 0, scale: 1 },
            { char: 'y', x: -250, y: 0, z: 0, scale: 1 },
            { char: 'm', x: -150, y: 0, z: 0, scale: 1 },
            { char: 'a', x: -50, y: 0, z: 0, scale: 1 },
            { char: 't', x: 50, y: 0, z: 0, scale: 1 },
            { char: 'i', x: 150, y: 0, z: 0, scale: 1 },
            { char: 'c', x: 250, y: 0, z: 0, scale: 1 },
            { char: 'a', x: 350, y: 0, z: 0, scale: 1 }
        ],
        selectedLetter: 0,

        // Rotation
        rotation: { x: 0, y: 0, z: 0 },
        targetRotation: { x: 0, y: 0, z: 0 },
        rotSpeed: { x: 5, y: 15, z: 0 },

        // Camera/view
        zoom: 0.5,
        targetZoom: 0.5,
        minZoom: 0.2,
        maxZoom: 5,
        zoomSpeed: 0.001,
        zoomLerp: 0.15,
        // Pan
        panX: 0,
        panY: 0,
        targetPanX: 0,
        targetPanY: 0,
        panLerp: 0.15,

        // Input
        isDragging: false,
        isPanning: false,
        isPinching: false,
        lastMouse: { x: 0, y: 0 },
        lastPinchDist: 0,
        sensitivity: 0.5,
        lerpFactor: 0.12,

        // Animation
        animating: false,
        animSpeed: 1,
        beamPhase: 0,

        // Rendering
        concentric: 5,
        layerOffset: 2,
        strokeWidth: 1.5,
        glowIntensity: 60,
        colorPrimary: '#00ffff',
        colorSecondary: '#ff00aa',
        fov: 1000,
        cameraZ: 600,

        // Effects
        scanlines: true,
        vignette: true,
        drawOn: false,
        drawSpeed: 2,
        drawProgress: 1,
        drawLoop: true,
        colorOscillate: false,
        oscillateSpeed: 1,

        // Internal (computed during render)
        _oscillatedPrimary: null,
        _oscillatedSecondary: null
    };

    // Active state (mutable copy)
    const state = JSON.parse(JSON.stringify(defaultState));

    // State API
    const CymaticaState = {
        /**
         * Get state value by key or dot-notation path
         * @param {string} path - Key or dot-notation path (e.g., 'rotation.x')
         * @returns {*} Value at path, or entire state if no path
         */
        get: function(path) {
            if (!path) return state;

            // Support dot-notation
            if (path.includes('.')) {
                return CYMATICA.Utils?.getByPath?.(state, path) ||
                       path.split('.').reduce((obj, key) => obj && obj[key], state);
            }

            return state[path];
        },

        /**
         * Set state value by key or dot-notation path
         * @param {string} path - Key or dot-notation path
         * @param {*} value - Value to set
         */
        set: function(path, value) {
            let old;

            if (path.includes('.')) {
                old = this.get(path);
                if (CYMATICA.Utils?.setByPath) {
                    CYMATICA.Utils.setByPath(state, path, value);
                } else {
                    const keys = path.split('.');
                    let current = state;
                    for (let i = 0; i < keys.length - 1; i++) {
                        if (!(keys[i] in current)) current[keys[i]] = {};
                        current = current[keys[i]];
                    }
                    current[keys[keys.length - 1]] = value;
                }
            } else {
                old = state[path];
                state[path] = value;
            }

            // Emit events
            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.STATE_CHANGE, { path, value, old });
                CYMATICA.events.emit(`state:${path}`, { value, old });
            }
        },

        /**
         * Get entire state for serialization
         * @returns {Object} Deep copy of state
         */
        getAll: function() {
            // Filter out internal properties (starting with _)
            const filtered = {};
            for (const key in state) {
                if (!key.startsWith('_')) {
                    filtered[key] = state[key];
                }
            }
            return JSON.parse(JSON.stringify(filtered));
        },

        /**
         * Replace entire state (for loading saved state)
         * @param {Object} newState - State object to load
         */
        replaceAll: function(newState) {
            // Merge new state into current state
            for (const key in newState) {
                if (key in state && !key.startsWith('_')) {
                    state[key] = newState[key];
                }
            }

            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.STATE_CHANGE, { path: '*', value: state });
                CYMATICA.events.emit(CYMATICA.Events.STATE_LOADED, { state: state });
            }
        },

        /**
         * Reset state to defaults
         */
        reset: function() {
            state.rotation = { x: 0, y: 0, z: 0 };
            state.targetRotation = { x: 0, y: 0, z: 0 };
            state.zoom = 0.5;
            state.targetZoom = 0.5;
            state.panX = 0;
            state.panY = 0;
            state.targetPanX = 0;
            state.targetPanY = 0;

            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.STATE_RESET);
                CYMATICA.events.emit(CYMATICA.Events.STATE_CHANGE, { path: '*', value: state });
            }
        },

        /**
         * Reset to factory defaults
         */
        resetToDefaults: function() {
            const copy = JSON.parse(JSON.stringify(defaultState));
            for (const key in copy) {
                state[key] = copy[key];
            }

            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.STATE_RESET);
                CYMATICA.events.emit(CYMATICA.Events.STATE_CHANGE, { path: '*', value: state });
            }
        },

        // Direct access for performance-critical paths (render loop)
        _state: state,
        _defaults: defaultState
    };

    CYMATICA.state = CymaticaState;
    CYMATICA.State = CymaticaState; // Alias for terrain compatibility

})(window.CYMATICA);

// === js/core/mode.js ===
/**
 * CYMATICA Mode Module
 * Unified behavioral configuration
 *
 * Mode controls:
 * - Animation behavior
 * - Rendering settings
 * - Effects (scanlines, vignette, etc.)
 * - UI visibility
 * - Feature flags
 * - Default theme
 */
(function(CYMATICA) {
    'use strict';

    const CymaticaMode = {
        config: null,
        modeName: null,
        themeName: null,

        /**
         * Default mode (cymatica)
         */
        defaults: {
            mode: {
                name: 'Cymatica',
                version: '1.0.0',
                description: 'Quadrascan Vector Art - Default Mode'
            },
            defaultTheme: 'phosphor',
            animation: {
                autoRotate: false,
                speed: 1,
                rotSpeed: { x: 5, y: 15, z: 0 }
            },
            rendering: {
                concentric: 5,
                layerOffset: 2,
                strokeWidth: 1.5,
                glowIntensity: 60,
                colorPrimary: '#00ffff',
                colorSecondary: '#ff00aa',
                fov: 1000,
                cameraZ: 600
            },
            effects: {
                scanlines: true,
                vignette: true,
                drawOn: false,
                drawSpeed: 2,
                colorOscillate: false
            },
            ui: {
                sidePanel: true,
                configPanel: false,
                fab: true
            },
            features: {
                designMode: false,
                persistence: true,
                effects: true
            }
        },

        /**
         * Initialize mode module
         * @param {string} modePath - Path to mode JSON file
         * @param {string} themeName - Optional theme override
         */
        init: async function(modePath, themeName) {
            const path = modePath || 'modes/cymatica.mode.json';

            try {
                const response = await fetch(path);
                if (!response.ok) {
                    throw new Error('Mode not found: ' + path);
                }
                this.config = await response.json();
                this.modeName = this.config.mode?.name || 'Unknown';
                console.log('[CYMATICA.Mode] Loaded:', this.modeName);

                // Determine theme: explicit > mode default > system default
                this.themeName = themeName || this.config.defaultTheme || 'phosphor';

                return true;
            } catch (e) {
                console.log('[CYMATICA.Mode] Using defaults:', e.message);
                this.config = this.defaults;
                this.modeName = 'default';
                this.themeName = themeName || 'phosphor';
                return false;
            }
        },

        /**
         * Check if URL has a parameter
         */
        _hasUrlParam: function(name) {
            return CYMATICA.Utils?.hasUrlParam?.(name) ||
                   new URLSearchParams(window.location.search).has(name);
        },

        /**
         * Get URL parameter value
         */
        _getUrlParam: function(name) {
            return CYMATICA.Utils?.getUrlParam?.(name) ||
                   new URLSearchParams(window.location.search).get(name);
        },

        /**
         * Apply mode settings to CYMATICA.Config and state
         * URL parameters always override mode settings
         */
        apply: function() {
            if (!this.config) return;

            const Config = CYMATICA.Config;
            if (!Config) {
                console.warn('[CYMATICA.Mode] Config not available');
                return;
            }

            // Apply animation settings
            if (this.config.animation) {
                Config.animation = Config.animation || {};
                Object.assign(Config.animation, this.config.animation);
            }

            // Apply rendering settings
            if (this.config.rendering) {
                Config.rendering = Config.rendering || {};
                Object.assign(Config.rendering, this.config.rendering);
            }

            // Apply effects settings
            if (this.config.effects) {
                Config.effects = Config.effects || {};
                Object.assign(Config.effects, this.config.effects);
            }

            // Apply feature flags (but don't override URL params)
            if (this.config.features) {
                Config.features = Config.features || {};
                for (const [key, value] of Object.entries(this.config.features)) {
                    // Skip designMode if URL param is set
                    if (key === 'designMode' && this._hasUrlParam('design')) {
                        continue;
                    }
                    Config.features[key] = value;
                }
            }

            // Apply UI visibility
            if (this.config.ui) {
                Config.ui = Config.ui || {};
                Object.assign(Config.ui, this.config.ui);
            }

            // Apply to state if available
            if (CYMATICA.state && this.config.rendering) {
                const state = CYMATICA.state._state;
                if (state) {
                    // Apply rendering defaults to state
                    for (const [key, value] of Object.entries(this.config.rendering)) {
                        if (key in state) {
                            state[key] = value;
                        }
                    }
                    // Apply effects to state
                    if (this.config.effects) {
                        for (const [key, value] of Object.entries(this.config.effects)) {
                            if (key in state) {
                                state[key] = value;
                            }
                        }
                    }
                    // Apply animation to state
                    if (this.config.animation) {
                        if (this.config.animation.rotSpeed) {
                            state.rotSpeed = { ...this.config.animation.rotSpeed };
                        }
                        state.animSpeed = this.config.animation.speed || 1;
                        state.animating = this.config.animation.autoRotate || false;
                    }
                }
            }

            // Emit event
            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.MODE_APPLIED, {
                    mode: this.modeName,
                    theme: this.themeName,
                    config: this.config
                });
            }

            console.log('[CYMATICA.Mode] Applied:', this.modeName);
        },

        // =====================================================================
        // Query Methods
        // =====================================================================

        /**
         * Check if a feature is enabled
         */
        isFeatureEnabled: function(feature) {
            return this.config?.features?.[feature] !== false;
        },

        /**
         * Check if animation should auto-start
         */
        isAutoRotate: function() {
            return this.config?.animation?.autoRotate === true;
        },

        /**
         * Get UI visibility config
         */
        getUI: function() {
            return this.config?.ui || { sidePanel: true, configPanel: false, fab: true };
        },

        /**
         * Get rendering config
         */
        getRendering: function() {
            return this.config?.rendering || this.defaults.rendering;
        },

        /**
         * Get effects config
         */
        getEffects: function() {
            return this.config?.effects || this.defaults.effects;
        },

        /**
         * Get animation config
         */
        getAnimation: function() {
            return this.config?.animation || this.defaults.animation;
        },

        /**
         * Get raw config object
         */
        getConfig: function() {
            return this.config;
        },

        /**
         * Get mode name
         */
        getName: function() {
            return this.modeName;
        },

        /**
         * Get theme name
         */
        getTheme: function() {
            return this.themeName;
        },

        /**
         * Switch theme at runtime
         */
        switchTheme: function(themeName) {
            this.themeName = themeName;

            if (CYMATICA.events) {
                CYMATICA.events.emit(CYMATICA.Events.THEME_CHANGED, {
                    theme: themeName
                });
            }
        }
    };

    CYMATICA.Mode = CymaticaMode;

})(window.CYMATICA);

#MULTICAT_START
# dir: /Users/mricos/src/mricos/demos/cymatica/dist
# file: tut.js
# notes:
#MULTICAT_END
(function(TERRAIN) {
    'use strict';

    // Ensure TERRAIN exists
    if (!TERRAIN) {
        console.error('[TUT] TERRAIN not found');
        return;
    }

    // Check if already registered
    if (TERRAIN.modules?.['TUT']) {
        console.warn('[TUT] Already registered');
        return;
    }

    // === BEGIN MODULE ===
// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/core.js ===
/**
 * TUT Core - Constants, defaults, and utilities
 */

// Storage keys
const TUT_STORAGE_KEY = 'tut-themes';
const TUT_ACTIVE_THEME_KEY = 'tut-active-theme';

// Token defaults - canonical values for all design tokens (TERRAIN-compatible)
const TUT_DEFAULT_TOKENS = {
    // Backgrounds
    '--bg-primary': '#0a0a0a',
    '--bg-secondary': '#1a1a1a',
    '--bg-tertiary': '#2a2a2a',
    '--bg-hover': '#3a3a3a',
    // Borders
    '--border': '#222222',
    '--border-visible': '#444444',
    '--border-active': '#4a9eff',
    // Text
    '--text-primary': '#ffffff',
    '--text-secondary': '#aaaaaa',
    '--text-muted': '#666666',
    '--text-code': '#00ffaa',
    // Accents
    '--accent-primary': '#4a9eff',
    '--accent-secondary': '#ff6b35',
    // Status
    '--success': '#00ff00',
    '--error': '#ff4444',
    '--warning': '#ffd700'
};

// Token groups for panel UI (derived from TUT_DEFAULT_TOKENS)
const TUT_TOKEN_GROUPS = {
    backgrounds: ['--bg-primary', '--bg-secondary', '--bg-tertiary', '--bg-hover'],
    borders: ['--border', '--border-visible', '--border-active'],
    text: ['--text-primary', '--text-secondary', '--text-muted', '--text-code'],
    accents: ['--accent-primary', '--accent-secondary', '--success', '--error', '--warning']
};

// Font defaults
const TUT_DEFAULT_FONTS = {
    heading: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    code: "'Courier New', Monaco, monospace"
};

// Token metadata for export/inspection
const TUT_TOKEN_METADATA = {
    '--bg-primary': { type: 'color', description: 'Page background - darkest surface' },
    '--bg-secondary': { type: 'color', description: 'Panel/card background - elevated surface' },
    '--bg-tertiary': { type: 'color', description: 'Section/header background - highest elevation' },
    '--bg-hover': { type: 'color', description: 'Hover state background' },
    '--border': { type: 'color', description: 'Default border color' },
    '--border-visible': { type: 'color', description: 'Visible/emphasized border' },
    '--border-active': { type: 'color', description: 'Active/focused element border' },
    '--text-primary': { type: 'color', description: 'Main body text - high contrast' },
    '--text-secondary': { type: 'color', description: 'Supporting text - medium contrast' },
    '--text-muted': { type: 'color', description: 'Disabled/subtle text - low contrast' },
    '--text-code': { type: 'color', description: 'Code/monospace text color' },
    '--accent-primary': { type: 'color', description: 'Primary action color - links, buttons' },
    '--accent-secondary': { type: 'color', description: 'Secondary accent - highlights' },
    '--success': { type: 'color', description: 'Success/positive feedback' },
    '--error': { type: 'color', description: 'Error/danger feedback' },
    '--warning': { type: 'color', description: 'Warning/caution feedback' }
};

// Utility: RGB to Hex conversion
function tutRgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '#000000';
    if (rgb.startsWith('#')) return rgb;
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return '#000000';
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

// Utility: Show inline feedback (replaces alerts)
function tutShowFeedback(element, message, type = 'success') {
    const originalText = element.textContent;
    const feedbackClass = `feedback-${type}`;

    element.textContent = message;
    element.classList.add(feedbackClass);

    setTimeout(() => {
        element.textContent = originalText;
        element.classList.remove(feedbackClass);
    }, 2000);
}

// Utility: Show inline error in container
function tutShowInlineError(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let errorEl = container.querySelector('.inline-error');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'inline-error theme-feedback error';
        container.appendChild(errorEl);
    }

    errorEl.textContent = message;
    errorEl.classList.remove('hidden');

    setTimeout(() => {
        errorEl.classList.add('hidden');
    }, 5000);
}


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/tokens.js ===
/**
 * TUT Tokens - Token update functions
 */

const TUT_Tokens = {
    /**
     * Update a CSS custom property token
     */
    update: function(tokenName, value, options = {}) {
        document.documentElement.style.setProperty(tokenName, value);

        // Update display element
        const displayId = 'token-' + tokenName.replace('--', '').replace(/-/g, '-');
        const displayEl = document.getElementById(displayId);
        if (displayEl) {
            displayEl.textContent = value;
        }

        // Update corresponding color picker
        const picker = document.querySelector(`input[data-token="${tokenName}"]`);
        if (picker) {
            picker.value = value;
        }

        // Emit event via TERRAIN Bridge if available
        if (!options.silent && typeof TERRAIN !== 'undefined' && TERRAIN.Bridge) {
            TERRAIN.Bridge.broadcast('tut:token-change', { name: tokenName, value });
        }

        // Auto-save to active theme
        if (!options.silent && typeof TUT_Themes !== 'undefined') {
            TUT_Themes.autoSave();
        }
    },

    /**
     * Get current value of a token
     */
    get: function(tokenName) {
        const style = getComputedStyle(document.documentElement);
        return style.getPropertyValue(tokenName).trim();
    },

    /**
     * Get all current token values
     */
    getAll: function() {
        const style = getComputedStyle(document.documentElement);
        const tokens = {};
        Object.keys(TUT_DEFAULT_TOKENS).forEach(token => {
            tokens[token] = style.getPropertyValue(token).trim();
        });
        return tokens;
    },

    /**
     * Reset all tokens to defaults
     */
    reset: function() {
        Object.entries(TUT_DEFAULT_TOKENS).forEach(([token, value]) => {
            this.update(token, value, { silent: true });
        });

        // Reset fonts
        TUT_Fonts.reset();

        // Reset metadata fields
        const fields = {
            'themeName': 'my-theme',
            'themeVersion': '1.0.0',
            'themeDescription': 'Custom theme',
            'themeAuthor': 'Designer'
        };
        Object.entries(fields).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });

        const btn = document.getElementById('resetTokensBtn');
        if (btn) tutShowFeedback(btn, 'Reset', 'success');
    },

    /**
     * Update section border style
     */
    updateSectionBorder: function(style) {
        const root = document.documentElement;
        switch(style) {
            case 'left':
                root.style.setProperty('--section-border-width', '0 0 0 4px');
                root.style.setProperty('--section-border-color', 'var(--accent-primary)');
                break;
            case 'full-muted':
                root.style.setProperty('--section-border-width', '1px');
                root.style.setProperty('--section-border-color', 'var(--border)');
                break;
            case 'full-accent':
                root.style.setProperty('--section-border-width', '1px');
                root.style.setProperty('--section-border-color', 'var(--accent-primary)');
                break;
            case 'none':
                root.style.setProperty('--section-border-width', '0');
                break;
        }
    },

    /**
     * Update section border radius
     */
    updateSectionRadius: function(value) {
        document.documentElement.style.setProperty('--section-border-radius', value + 'px');
        const display = document.getElementById('sectionRadiusValue');
        if (display) display.textContent = value + 'px';
    },

    /**
     * Initialize color pickers from current CSS values
     */
    initPickers: function() {
        const style = getComputedStyle(document.documentElement);

        Object.keys(TUT_DEFAULT_TOKENS).forEach(token => {
            const value = style.getPropertyValue(token).trim();
            const hex = tutRgbToHex(value);

            const picker = document.querySelector(`input[data-token="${token}"]`);
            if (picker) picker.value = hex;

            const displayId = 'token-' + token.replace('--', '');
            const displayEl = document.getElementById(displayId);
            if (displayEl) displayEl.textContent = hex;
        });

        // Bind event listeners to all data-token inputs
        document.querySelectorAll('input[data-token]').forEach(picker => {
            const tokenName = picker.getAttribute('data-token');
            picker.addEventListener('input', () => {
                this.update(tokenName, picker.value);
            });
        });
    }
};


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/themes.js ===
/**
 * TUT Themes - LocalStorage theme management
 */

// Built-in themes (always available)
const TUT_BUILTIN_THEMES = {
    'default': {
        metadata: {
            name: 'default',
            version: '1.0.0',
            description: 'Default dark theme',
            author: 'TERRAIN',
            temperature: 'neutral',
            colorMode: 'dark'
        },
        tokens: {
            'bg-primary': { value: '#0a0a0a', cssVar: '--bg-primary' },
            'bg-secondary': { value: '#1a1a1a', cssVar: '--bg-secondary' },
            'bg-tertiary': { value: '#2a2a2a', cssVar: '--bg-tertiary' },
            'bg-hover': { value: '#3a3a3a', cssVar: '--bg-hover' },
            'border': { value: '#222222', cssVar: '--border' },
            'border-visible': { value: '#444444', cssVar: '--border-visible' },
            'border-active': { value: '#4a9eff', cssVar: '--border-active' },
            'text-primary': { value: '#ffffff', cssVar: '--text-primary' },
            'text-secondary': { value: '#aaaaaa', cssVar: '--text-secondary' },
            'text-muted': { value: '#666666', cssVar: '--text-muted' },
            'text-code': { value: '#00ffaa', cssVar: '--text-code' },
            'accent-primary': { value: '#4a9eff', cssVar: '--accent-primary' },
            'accent-secondary': { value: '#ff6b35', cssVar: '--accent-secondary' },
            'success': { value: '#00ff00', cssVar: '--success' },
            'error': { value: '#ff4444', cssVar: '--error' },
            'warning': { value: '#ffd700', cssVar: '--warning' }
        }
    },
    'electric': {
        metadata: {
            name: 'electric',
            version: '1.0.0',
            description: 'Vibrant electric neon theme',
            author: 'TERRAIN',
            temperature: 'cool',
            colorMode: 'dark'
        },
        tokens: {
            'bg-primary': { value: '#0a0014', cssVar: '--bg-primary' },
            'bg-secondary': { value: '#120024', cssVar: '--bg-secondary' },
            'bg-tertiary': { value: '#1a0030', cssVar: '--bg-tertiary' },
            'bg-hover': { value: '#2a0050', cssVar: '--bg-hover' },
            'border': { value: '#3d0066', cssVar: '--border' },
            'border-visible': { value: '#6600aa', cssVar: '--border-visible' },
            'border-active': { value: '#00ffff', cssVar: '--border-active' },
            'text-primary': { value: '#ffffff', cssVar: '--text-primary' },
            'text-secondary': { value: '#cc99ff', cssVar: '--text-secondary' },
            'text-muted': { value: '#8855bb', cssVar: '--text-muted' },
            'text-code': { value: '#00ffff', cssVar: '--text-code' },
            'accent-primary': { value: '#ff00ff', cssVar: '--accent-primary' },
            'accent-secondary': { value: '#00ffff', cssVar: '--accent-secondary' },
            'success': { value: '#00ff88', cssVar: '--success' },
            'error': { value: '#ff0066', cssVar: '--error' },
            'warning': { value: '#ffff00', cssVar: '--warning' }
        }
    }
};

const TUT_Themes = {
    _autoSaveTimeout: null,

    /**
     * Initialize theme system
     */
    init: function() {
        this.updateDropdown();

        // Load active theme if set
        const activeTheme = localStorage.getItem(TUT_ACTIVE_THEME_KEY);
        if (activeTheme) {
            const themes = this.getSaved();
            if (themes[activeTheme]) {
                this.apply(themes[activeTheme]);
                const dropdown = document.getElementById('themeSwitcher');
                if (dropdown) dropdown.value = activeTheme;
            }
        }
    },

    /**
     * Get all saved themes
     */
    getSaved: function() {
        try {
            return JSON.parse(localStorage.getItem(TUT_STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    },

    /**
     * Save theme to storage
     */
    save: function(theme) {
        const themes = this.getSaved();
        const themeName = theme.metadata.name;
        themes[themeName] = theme;
        localStorage.setItem(TUT_STORAGE_KEY, JSON.stringify(themes));
        localStorage.setItem(TUT_ACTIVE_THEME_KEY, themeName);
        this.updateDropdown();
        return themeName;
    },

    /**
     * Delete theme from storage
     */
    delete: function(themeName) {
        const themes = this.getSaved();
        delete themes[themeName];
        localStorage.setItem(TUT_STORAGE_KEY, JSON.stringify(themes));

        if (localStorage.getItem(TUT_ACTIVE_THEME_KEY) === themeName) {
            localStorage.removeItem(TUT_ACTIVE_THEME_KEY);
        }
        this.updateDropdown();
    },

    /**
     * Update theme dropdown
     */
    updateDropdown: function() {
        const dropdown = document.getElementById('themeSwitcher');
        if (!dropdown) return;

        const savedThemes = this.getSaved();
        const activeTheme = localStorage.getItem(TUT_ACTIVE_THEME_KEY);

        // Clear existing options except first
        while (dropdown.options.length > 1) {
            dropdown.remove(1);
        }

        // Add built-in themes first
        const builtinGroup = document.createElement('optgroup');
        builtinGroup.label = 'Built-in';
        Object.keys(TUT_BUILTIN_THEMES).forEach(name => {
            const option = document.createElement('option');
            option.value = `builtin:${name}`;
            option.textContent = name;
            if (activeTheme === `builtin:${name}`) option.selected = true;
            builtinGroup.appendChild(option);
        });
        dropdown.appendChild(builtinGroup);

        // Add saved themes
        const savedKeys = Object.keys(savedThemes);
        if (savedKeys.length > 0) {
            const savedGroup = document.createElement('optgroup');
            savedGroup.label = 'Saved';
            savedKeys.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                if (name === activeTheme) option.selected = true;
                savedGroup.appendChild(option);
            });
            dropdown.appendChild(savedGroup);
        }
    },

    /**
     * Switch to a theme
     */
    switch: function(themeName) {
        if (!themeName) {
            TUT_Tokens.reset();
            localStorage.removeItem(TUT_ACTIVE_THEME_KEY);
            return;
        }

        // Check for built-in theme
        if (themeName.startsWith('builtin:')) {
            const builtinName = themeName.replace('builtin:', '');
            if (TUT_BUILTIN_THEMES[builtinName]) {
                this.apply(TUT_BUILTIN_THEMES[builtinName]);
                localStorage.setItem(TUT_ACTIVE_THEME_KEY, themeName);
                return;
            }
        }

        // Check saved themes
        const themes = this.getSaved();
        if (themes[themeName]) {
            this.apply(themes[themeName]);
            localStorage.setItem(TUT_ACTIVE_THEME_KEY, themeName);
        }
    },

    /**
     * Apply a theme object
     */
    apply: function(theme) {
        // Apply metadata
        if (theme.metadata) {
            TUT_Panel.setMetadata(theme.metadata);
        }

        // Apply tokens
        if (theme.tokens) {
            Object.entries(theme.tokens).forEach(([tokenId, tokenData]) => {
                const cssVar = tokenData.cssVar || `--${tokenId}`;
                if (TUT_DEFAULT_TOKENS.hasOwnProperty(cssVar)) {
                    TUT_Tokens.update(cssVar, tokenData.value, { silent: true });
                }
            });
        }
    },

    /**
     * Auto-save current theme (debounced)
     */
    autoSave: function() {
        const activeTheme = localStorage.getItem(TUT_ACTIVE_THEME_KEY);
        if (!activeTheme) return;

        clearTimeout(this._autoSaveTimeout);
        this._autoSaveTimeout = setTimeout(() => {
            const theme = TUT_Export.buildThemeObject();
            const themes = this.getSaved();
            themes[activeTheme] = theme;
            localStorage.setItem(TUT_STORAGE_KEY, JSON.stringify(themes));
        }, 500);
    },

    /**
     * Save current theme (user action)
     */
    saveCurrent: function() {
        const theme = TUT_Export.buildThemeObject();
        const themeName = this.save(theme);

        const btn = document.getElementById('saveThemeBtn');
        if (btn) tutShowFeedback(btn, `Saved: ${themeName}`, 'success');
    },

    /**
     * Delete current theme (user action)
     */
    deleteCurrent: function() {
        const dropdown = document.getElementById('themeSwitcher');
        const themeName = dropdown?.value;

        if (!themeName) return;

        this.delete(themeName);
        dropdown.value = '';
        TUT_Tokens.reset();

        const btn = document.getElementById('deleteThemeBtn');
        if (btn) tutShowFeedback(btn, 'Deleted', 'success');
    }
};


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/panel.js ===
/**
 * TUT Panel - Dynamic panel creation and UI controls
 */

const TUT_Panel = {
    // Token definitions derived from TUT_DEFAULT_TOKENS and TUT_TOKEN_GROUPS (core.js)
    _tokens: null,  // Lazily initialized

    /**
     * Get token definitions, deriving from core.js constants
     */
    _getTokens: function() {
        if (this._tokens) return this._tokens;

        this._tokens = {};
        for (const [group, vars] of Object.entries(TUT_TOKEN_GROUPS)) {
            this._tokens[group] = vars.map(cssVar => ({
                name: cssVar.replace('--', ''),
                var: cssVar,
                default: TUT_DEFAULT_TOKENS[cssVar]
            }));
        }
        return this._tokens;
    },

    _panelElement: null,
    _fabElement: null,

    // =========================================================================
    // DYNAMIC CREATION
    // =========================================================================

    /**
     * Create the FAB button
     * Adds to .fab-container if it exists, otherwise creates standalone
     */
    createFAB: function() {
        if (document.getElementById('designFab')) {
            this._fabElement = document.getElementById('designFab');
            return this._fabElement;
        }

        const fab = document.createElement('button');
        fab.id = 'designFab';
        fab.className = 'fab fab-design';
        fab.innerHTML = this._getFABIcon();
        fab.title = 'Design Tokens (TUT)';
        fab.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Add to fab-container if it exists, otherwise body
        const container = document.querySelector('.fab-container');
        if (container) {
            container.appendChild(fab);
        } else {
            // Fallback: create standalone FAB
            fab.style.position = 'fixed';
            fab.style.bottom = '16px';
            fab.style.right = '16px';
            fab.style.zIndex = '1001';
            document.body.appendChild(fab);
        }

        this._fabElement = fab;
        return fab;
    },

    /**
     * Create the full design panel
     * Replaces any existing design-panel from fab.js
     */
    create: function() {
        // Check for existing panels (TUT or fab.js)
        let existingPanel = document.getElementById('designPanel') || document.getElementById('design-panel');

        if (existingPanel) {
            // Replace existing panel content with rich TUT panel
            existingPanel.id = 'designPanel';
            existingPanel.innerHTML = this._buildPanelHTML();
            this._panelElement = existingPanel;
            this._bindEvents();
            return existingPanel;
        }

        // Create new panel if none exists
        const panel = document.createElement('div');
        panel.id = 'designPanel';
        panel.className = 'design-panel';
        panel.innerHTML = this._buildPanelHTML();

        document.body.appendChild(panel);
        this._panelElement = panel;

        // Bind events after panel is in DOM
        this._bindEvents();

        return panel;
    },

    /**
     * FAB icon SVG
     */
    _getFABIcon: function() {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="28" height="28">
            <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.15"/>
            <rect x="25" y="30" width="18" height="18" rx="3" fill="var(--fab-accent-primary, #58a6ff)"/>
            <rect x="47" y="30" width="18" height="18" rx="3" fill="var(--fab-success, #3fb950)"/>
            <rect x="69" y="30" width="18" height="18" rx="3" fill="var(--fab-warning, #d29922)"/>
            <rect x="25" y="52" width="18" height="18" rx="3" fill="var(--fab-error, #f85149)"/>
            <rect x="47" y="52" width="18" height="18" rx="3" fill="var(--fab-text-primary, #c9d1d9)"/>
            <rect x="69" y="52" width="18" height="18" rx="3" fill="var(--fab-text-secondary, #8b949e)"/>
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="2" opacity="0.8"/>
        </svg>`;
    },

    /**
     * Build the complete panel HTML
     */
    _buildPanelHTML: function() {
        return `
            <div class="design-panel-header">
                <span>Design Tokens</span>
                <span class="design-panel-close" data-action="close-panel">&times;</span>
            </div>
            <div class="design-panel-content">
                ${this._buildThemeSwitcherSection()}
                ${this._buildMetadataSection()}
                ${this._buildColorsSection()}
                ${this._buildLayoutSection()}
                ${this._buildTypographySection()}
                ${this._buildAnalysisSection()}
                ${this._buildExportSection()}
            </div>
        `;
    },

    /**
     * Theme Switcher Section
     */
    _buildThemeSwitcherSection: function() {
        return `
            <div class="token-section" data-section="switcher">
                <div class="token-section-header" data-action="toggle-section" data-target="switcher">
                    <span>Theme Switcher</span>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="token-section-content">
                    <div class="metadata-field">
                        <label>Active Theme</label>
                        <select id="themeSwitcher" class="font-select mt-0" data-action="switch-theme">
                            <option value="">-- Select Theme --</option>
                        </select>
                    </div>
                    <div class="design-panel-buttons mt-half">
                        <button class="design-panel-btn design-panel-btn--primary flex-1" data-action="save-theme">
                            Save Current
                        </button>
                        <button class="design-panel-btn design-panel-btn--secondary flex-1" data-action="delete-theme">
                            Delete
                        </button>
                    </div>
                    <div id="themeFeedback" class="theme-feedback hidden"></div>
                </div>
            </div>
        `;
    },

    /**
     * Theme Metadata Section
     */
    _buildMetadataSection: function() {
        return `
            <div class="token-section collapsed" data-section="metadata">
                <div class="token-section-header" data-action="toggle-section" data-target="metadata">
                    <span>Theme Metadata</span>
                    <span class="section-toggle">▶</span>
                </div>
                <div class="token-section-content">
                    <div class="metadata-field">
                        <label>Name</label>
                        <input type="text" id="themeName" value="my-theme" class="font-input">
                    </div>
                    <div class="metadata-field">
                        <label>Version</label>
                        <input type="text" id="themeVersion" value="1.0.0" class="font-input">
                    </div>
                    <div class="metadata-field">
                        <label>Description</label>
                        <input type="text" id="themeDescription" value="Custom theme" class="font-input">
                    </div>
                    <div class="metadata-field">
                        <label>Author</label>
                        <input type="text" id="themeAuthor" value="Designer" class="font-input">
                    </div>
                    <div class="metadata-field">
                        <label>Temperature</label>
                        <select id="themeTemperature" class="font-select">
                            <option value="warm">Warm</option>
                            <option value="cool">Cool</option>
                            <option value="neutral" selected>Neutral</option>
                        </select>
                    </div>
                    <div class="metadata-field">
                        <label>Color Mode</label>
                        <select id="themeColorMode" class="font-select">
                            <option value="dark" selected>Dark</option>
                            <option value="light">Light</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Colors Section - generates all token groups
     */
    _buildColorsSection: function() {
        return `
            <div class="token-section" data-section="colors">
                <div class="token-section-header" data-action="toggle-section" data-target="colors">
                    <span>Colors</span>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="token-section-content">
                    ${this._buildTokenGroup('Background', this._getTokens().backgrounds)}
                    ${this._buildTokenGroup('Border', this._getTokens().borders)}
                    ${this._buildTokenGroup('Text', this._getTokens().text)}
                    ${this._buildTokenGroup('Accent & Status', this._getTokens().accents)}
                </div>
            </div>
        `;
    },

    /**
     * Build a token group with color pickers
     */
    _buildTokenGroup: function(title, tokens) {
        let html = `<div class="token-group"><div class="token-group-title">${title}</div>`;

        tokens.forEach(token => {
            const currentValue = this._getTokenValue(token.var) || token.default;
            html += `
                <div class="token-item">
                    <input type="color" class="token-picker" data-action="update-token" data-token="${token.var}" value="${currentValue}">
                    <div class="token-swatch" style="background: var(${token.var})"></div>
                    <div class="token-info">
                        <div class="token-name">${token.var}</div>
                        <div class="token-value" id="token-${token.name}">${currentValue}</div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    },

    /**
     * Layout Section
     */
    _buildLayoutSection: function() {
        return `
            <div class="token-section collapsed" data-section="layout">
                <div class="token-section-header" data-action="toggle-section" data-target="layout">
                    <span>Layout</span>
                    <span class="section-toggle">▶</span>
                </div>
                <div class="token-section-content">
                    <div class="token-group">
                        <div class="token-group-title">Section Style</div>
                        <div class="control-group">
                            <label class="field-label">Border Style</label>
                            <select class="font-select mt-0" data-action="update-section-border" id="sectionBorderStyle">
                                <option value="left">Left accent (default)</option>
                                <option value="full-muted">Full border (muted)</option>
                                <option value="full-accent">Full border (accent)</option>
                                <option value="none">No border</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label class="field-label">Corner Radius</label>
                            <input type="range" min="0" max="24" value="8" data-action="update-section-radius" id="sectionRadius">
                            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--fab-text-secondary);">
                                <span>Sharp</span>
                                <span id="sectionRadiusValue">8px</span>
                                <span>Round</span>
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="field-label">Sidebar Position</label>
                            <select class="font-select mt-0" data-action="update-sidebar-position" id="sidebarPosition">
                                <option value="right">Right (default)</option>
                                <option value="left">Left</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Typography Section
     */
    _buildTypographySection: function() {
        return `
            <div class="token-section collapsed" data-section="typography">
                <div class="token-section-header" data-action="toggle-section" data-target="typography">
                    <span>Typography</span>
                    <span class="section-toggle">▶</span>
                </div>
                <div class="token-section-content">
                    <div class="token-group">
                        <div class="fab-card">
                            <label class="field-label">Add Google Font</label>
                            <textarea class="font-input" id="fontEmbedCode" placeholder="Paste Google Fonts embed code here..." style="height: 60px; resize: vertical;"></textarea>
                            <button class="add-font-btn" data-action="add-font">Add Font to Page</button>
                            <div class="font-example-toggle" data-action="toggle-font-example">
                                ▶ Show example
                            </div>
                            <div class="font-example-content" id="fontExampleContent">
                                <strong>How to add Google Fonts:</strong>
                                <ol>
                                    <li>Go to <a href="https://fonts.google.com" target="_blank">fonts.google.com</a></li>
                                    <li>Select fonts and click <strong>"Get font"</strong></li>
                                    <li>Click <strong>"Get embed code"</strong></li>
                                    <li>Copy the embed code and paste above</li>
                                </ol>
                                <div class="fab-tip">
                                    <strong>Tip:</strong> Mono fonts auto-assign to Code, sans fonts to Heading/Body.
                                </div>
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="field-label">Heading Font</label>
                            <select class="font-select mt-0" data-action="update-font" data-font-type="heading" id="headingFont">
                                <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">System (Default)</option>
                                <option value="'Courier New', monospace">Courier New</option>
                                <option value="Monaco, monospace">Monaco</option>
                                <option value="Georgia, serif">Georgia</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label class="field-label">Body Font</label>
                            <select class="font-select mt-0" data-action="update-font" data-font-type="body" id="bodyFont">
                                <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">System (Default)</option>
                                <option value="'Courier New', monospace">Courier New</option>
                                <option value="Monaco, monospace">Monaco</option>
                                <option value="Georgia, serif">Georgia</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label class="field-label">Code Font</label>
                            <select class="font-select mt-0" data-action="update-font" data-font-type="code" id="codeFont">
                                <option value="'Courier New', Monaco, monospace">Courier New (Default)</option>
                                <option value="Monaco, monospace">Monaco</option>
                                <option value="'Fira Code', monospace">Fira Code</option>
                                <option value="Consolas, monospace">Consolas</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Analysis Section - Usage and Deps integration
     */
    _buildAnalysisSection: function() {
        return `
            <div class="token-section collapsed" data-section="analysis">
                <div class="token-section-header" data-action="toggle-section" data-target="analysis">
                    <span>Analysis</span>
                    <span class="section-toggle">▶</span>
                </div>
                <div class="token-section-content">
                    <div class="token-group">
                        <div class="token-group-title">Summary</div>
                        <div id="analysisSummary" class="help-text">
                            Click "Scan" to analyze token usage
                        </div>
                        <button class="design-panel-btn design-panel-btn--secondary mt-half" data-action="run-analysis">
                            Scan Tokens
                        </button>
                    </div>
                    <div class="token-group" id="analysisOrphans" style="display: none;">
                        <div class="token-group-title">Orphaned Tokens</div>
                        <div id="orphansList" class="help-text"></div>
                    </div>
                    <div class="token-group" id="analysisMissing" style="display: none;">
                        <div class="token-group-title">Missing Tokens</div>
                        <div id="missingList" class="help-text"></div>
                    </div>
                    <div class="token-group" id="analysisLayers" style="display: none;">
                        <div class="token-group-title">Dependency Layers</div>
                        <div id="layersList" class="help-text"></div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Export/Import Section
     */
    _buildExportSection: function() {
        return `
            <div class="token-section collapsed" data-section="export">
                <div class="token-section-header" data-action="toggle-section" data-target="export">
                    <span>Export / Import</span>
                    <span class="section-toggle">▶</span>
                </div>
                <div class="token-section-content">
                    <div class="token-group">
                        <div class="token-group-title">Theme (tokens.json)</div>
                        <div class="design-panel-buttons mt-half">
                            <button class="design-panel-btn design-panel-btn--primary flex-1" data-action="export-theme">
                                Download
                            </button>
                            <button class="design-panel-btn design-panel-btn--secondary flex-1" data-action="import-theme">
                                Import
                            </button>
                        </div>
                        <p class="help-text">Full theme with metadata and TDS mapping</p>
                    </div>
                    <div class="token-group">
                        <div class="token-group-title">CSS Variables</div>
                        <div class="design-panel-buttons mt-half">
                            <button class="design-panel-btn design-panel-btn--secondary flex-1" data-action="copy-css">
                                Copy CSS
                            </button>
                            <button class="design-panel-btn design-panel-btn--danger flex-1" data-action="reset-tokens">
                                Reset All
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // =========================================================================
    // ANALYSIS
    // =========================================================================

    /**
     * Run usage and dependency analysis
     */
    runAnalysis: function() {
        if (typeof TUT_Usage === 'undefined' || typeof TUT_Deps === 'undefined') {
            document.getElementById('analysisSummary').textContent = 'Analysis modules not loaded';
            return;
        }

        // Run scans
        TUT_Usage.scan();
        TUT_Deps.build();

        // Get summary
        const summary = TUT_Usage.getSummary();
        document.getElementById('analysisSummary').innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem;">
                <span>Total tokens:</span><span>${summary.total}</span>
                <span>Defined:</span><span>${summary.defined}</span>
                <span>Used:</span><span>${summary.used}</span>
                <span>Orphaned:</span><span style="color: var(--fab-warning);">${summary.orphans}</span>
                <span>Missing:</span><span style="color: var(--fab-error);">${summary.missing}</span>
            </div>
        `;

        // Show orphaned tokens
        const orphans = TUT_Usage.getOrphans();
        const orphansDiv = document.getElementById('analysisOrphans');
        const orphansList = document.getElementById('orphansList');
        if (orphans.length > 0) {
            orphansDiv.style.display = 'block';
            orphansList.innerHTML = orphans.map(t => `<code>${t.name}</code>`).join(', ');
        } else {
            orphansDiv.style.display = 'none';
        }

        // Show missing tokens
        const missing = TUT_Usage.getMissing();
        const missingDiv = document.getElementById('analysisMissing');
        const missingList = document.getElementById('missingList');
        if (missing.length > 0) {
            missingDiv.style.display = 'block';
            missingList.innerHTML = missing.map(t => `<code>${t.name}</code>`).join(', ');
        } else {
            missingDiv.style.display = 'none';
        }

        // Show dependency layers
        const layers = TUT_Deps.getLayers();
        const layersDiv = document.getElementById('analysisLayers');
        const layersList = document.getElementById('layersList');
        const layerKeys = Object.keys(layers).sort((a, b) => parseInt(a) - parseInt(b));
        if (layerKeys.length > 0) {
            layersDiv.style.display = 'block';
            layersList.innerHTML = layerKeys.map(depth =>
                `<div><strong>Layer ${depth}:</strong> ${layers[depth].length} tokens</div>`
            ).join('');
        } else {
            layersDiv.style.display = 'none';
        }
    },

    // =========================================================================
    // EVENT BINDING
    // =========================================================================

    /**
     * Bind panel events
     */
    _bindEvents: function() {
        // Event binding now handled by TUT_Actions delegation in api.js
    },

    /**
     * Update a token value
     */
    _updateToken: function(varName, value) {
        document.documentElement.style.setProperty(varName, value);

        // Update display
        const tokenName = varName.replace('--', '');
        const valueEl = document.getElementById(`token-${tokenName}`);
        if (valueEl) valueEl.textContent = value;

        // Update swatch
        const picker = document.querySelector(`[data-token="${varName}"]`);
        if (picker) {
            const swatch = picker.parentElement.querySelector('.token-swatch');
            if (swatch) swatch.style.background = value;
        }

        // Notify TUT_Tokens if available
        if (typeof TUT_Tokens !== 'undefined' && TUT_Tokens.update) {
            TUT_Tokens.update(varName.replace('--', ''), value, { silent: true });
        }

        // Record in usage history if available
        if (typeof TUT_Usage !== 'undefined' && TUT_Usage.recordChange) {
            const oldValue = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            TUT_Usage.recordChange(varName, oldValue, value);
        }
    },

    /**
     * Get current token value from DOM
     */
    _getTokenValue: function(varName) {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    },

    // =========================================================================
    // EXISTING METHODS (preserved)
    // =========================================================================

    /**
     * Toggle design panel visibility
     */
    toggle: function() {
        const panel = document.getElementById('designPanel') || document.getElementById('design-panel');
        if (panel) {
            panel.classList.toggle('visible');
        }
    },

    /**
     * Close the panel
     */
    close: function() {
        const panel = document.getElementById('designPanel') || document.getElementById('design-panel');
        if (panel) {
            panel.classList.remove('visible');
        }
    },

    /**
     * Toggle a collapsible section
     */
    toggleSection: function(sectionName) {
        const section = document.querySelector(`[data-section="${sectionName}"]`);
        if (!section) return;

        section.classList.toggle('collapsed');
        const toggle = section.querySelector('.section-toggle');
        if (toggle) {
            toggle.textContent = section.classList.contains('collapsed') ? '▶' : '▼';
        }
    },

    /**
     * Collapse all sections
     */
    collapseAll: function() {
        document.querySelectorAll('.token-section').forEach(section => {
            section.classList.add('collapsed');
            const toggle = section.querySelector('.section-toggle');
            if (toggle) toggle.textContent = '▶';
        });
    },

    /**
     * Get theme metadata from form fields
     */
    getMetadata: function() {
        return {
            name: document.getElementById('themeName')?.value || 'my-theme',
            version: document.getElementById('themeVersion')?.value || '1.0.0',
            description: document.getElementById('themeDescription')?.value || 'Custom theme',
            author: document.getElementById('themeAuthor')?.value || 'Designer',
            temperature: document.getElementById('themeTemperature')?.value || 'neutral',
            colorMode: document.getElementById('themeColorMode')?.value || 'dark'
        };
    },

    /**
     * Set theme metadata in form fields
     */
    setMetadata: function(metadata) {
        if (metadata.name) {
            const el = document.getElementById('themeName');
            if (el) el.value = metadata.name;
        }
        if (metadata.version) {
            const el = document.getElementById('themeVersion');
            if (el) el.value = metadata.version;
        }
        if (metadata.description) {
            const el = document.getElementById('themeDescription');
            if (el) el.value = metadata.description;
        }
        if (metadata.author) {
            const el = document.getElementById('themeAuthor');
            if (el) el.value = metadata.author;
        }
        if (metadata.temperature) {
            const el = document.getElementById('themeTemperature');
            if (el) el.value = metadata.temperature;
        }
        if (metadata.colorMode) {
            const el = document.getElementById('themeColorMode');
            if (el) el.value = metadata.colorMode;
        }
    },

    /**
     * Update sidebar position
     */
    updateSidebarPosition: function(position) {
        document.body.setAttribute('data-sidebar-position', position);
        localStorage.setItem('tut-sidebar-position', position);
    },

    /**
     * Restore sidebar position from localStorage
     */
    restoreSidebarPosition: function() {
        const saved = localStorage.getItem('tut-sidebar-position');
        const current = document.body.getAttribute('data-sidebar-position');
        const position = saved || current || 'right';

        document.body.setAttribute('data-sidebar-position', position);
        const select = document.getElementById('sidebarPosition');
        if (select) select.value = position;
    },

    /**
     * Setup click-outside to close panel
     */
    setupClickOutside: function() {
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('designPanel');
            const fab = document.getElementById('designFab');
            if (panel && panel.classList.contains('visible') &&
                !panel.contains(e.target) &&
                fab && !fab.contains(e.target)) {
                panel.classList.remove('visible');
            }
        });
    },

    /**
     * Get all token definitions
     */
    getTokenDefinitions: function() {
        return this._getTokens();
    }
};


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/fonts.js ===
/**
 * TUT Fonts - Google Fonts integration
 */

const TUT_Fonts = {
    loaded: [],

    /**
     * Update font for a type (heading, body, code)
     */
    update: function(type, font) {
        switch(type) {
            case 'heading':
                document.querySelectorAll('h1, h2, h3, .step-number').forEach(el => {
                    el.style.fontFamily = font;
                });
                break;
            case 'body':
                document.body.style.fontFamily = font;
                break;
            case 'code':
                document.querySelectorAll('code, .command-hint, .terminal-content, .token-name, .token-value').forEach(el => {
                    el.style.fontFamily = font;
                });
                break;
        }
    },

    /**
     * Reset fonts to defaults
     */
    reset: function() {
        const headingFont = document.getElementById('headingFont');
        const bodyFont = document.getElementById('bodyFont');
        const codeFont = document.getElementById('codeFont');

        if (headingFont) headingFont.value = TUT_DEFAULT_FONTS.heading;
        if (bodyFont) bodyFont.value = TUT_DEFAULT_FONTS.body;
        if (codeFont) codeFont.value = TUT_DEFAULT_FONTS.code;

        this.update('heading', TUT_DEFAULT_FONTS.heading);
        this.update('body', TUT_DEFAULT_FONTS.body);
        this.update('code', TUT_DEFAULT_FONTS.code);
    },

    /**
     * Toggle font example visibility
     */
    toggleExample: function() {
        const content = document.getElementById('fontExampleContent');
        const toggle = document.querySelector('.font-example-toggle');

        if (content.classList.contains('expanded')) {
            content.classList.remove('expanded');
            toggle.innerHTML = '> Show example';
        } else {
            content.classList.add('expanded');
            toggle.innerHTML = 'v Hide example';
        }
    },

    /**
     * Parse Google Fonts embed code
     */
    parseEmbed: function(embedCode) {
        const hrefMatch = embedCode.match(/href=["']([^"']+fonts\.googleapis\.com\/css2[^"']+)["']/);
        if (!hrefMatch) return null;

        const cdnUrl = hrefMatch[1];
        const urlParams = new URL(cdnUrl).searchParams;
        const families = urlParams.getAll('family');

        if (families.length === 0) return null;

        const fonts = families.map(familyStr => {
            const [nameWithPlus] = familyStr.split(':');
            const fontName = decodeURIComponent(nameWithPlus.replace(/\+/g, ' '));

            const nameLower = fontName.toLowerCase();
            let fallback = 'sans-serif';
            let category = 'body';

            if (nameLower.includes('mono') || nameLower.includes('code') || nameLower.includes('cascadia')) {
                fallback = 'monospace';
                category = 'code';
            } else if (nameLower.includes('serif') && !nameLower.includes('sans')) {
                fallback = 'serif';
            }

            return {
                fontName,
                fontFamily: `'${fontName}', ${fallback}`,
                fallback,
                category
            };
        });

        return { cdnUrl, fonts };
    },

    /**
     * Add Google Font from embed code
     */
    add: function() {
        const embedCode = document.getElementById('fontEmbedCode').value.trim();
        const btn = document.querySelector('.add-font-btn');

        if (!embedCode) {
            if (btn) tutShowFeedback(btn, 'Paste embed code first', 'error');
            return;
        }

        // Add preconnect links
        const preconnects = [
            { href: 'https://fonts.googleapis.com', crossorigin: false },
            { href: 'https://fonts.gstatic.com', crossorigin: true }
        ];

        preconnects.forEach(({ href, crossorigin }) => {
            if (!document.querySelector(`link[rel="preconnect"][href="${href}"]`)) {
                const link = document.createElement('link');
                link.rel = 'preconnect';
                link.href = href;
                if (crossorigin) link.crossOrigin = 'anonymous';
                document.head.appendChild(link);
            }
        });

        const parsed = this.parseEmbed(embedCode);
        if (!parsed) {
            if (btn) tutShowFeedback(btn, 'Invalid embed code', 'error');
            return;
        }

        const { cdnUrl, fonts } = parsed;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cdnUrl;
        link.id = 'custom-font-' + Date.now();
        document.head.appendChild(link);

        link.onload = () => {
            fonts.forEach(font => {
                const { fontName, fontFamily, category } = font;

                // Track loaded font
                const existing = this.loaded.find(f => f.fontFamily === fontFamily);
                if (!existing) {
                    this.loaded.push({ cdnUrl, fontFamily, fontName });
                }

                // Add to all dropdowns
                ['headingFont', 'bodyFont', 'codeFont'].forEach(id => {
                    const select = document.getElementById(id);
                    if (!select) return;

                    const existingOption = Array.from(select.options).find(opt => opt.value === fontFamily);
                    if (!existingOption) {
                        const option = document.createElement('option');
                        option.value = fontFamily;
                        option.textContent = fontName + ' (Custom)';
                        select.insertBefore(option, select.firstChild);
                    }
                });
            });

            // Auto-assign fonts by category
            const monoFont = fonts.find(f => f.category === 'code');
            const sansFont = fonts.find(f => f.category === 'body' && f.fallback === 'sans-serif');

            if (monoFont) {
                const codeSelect = document.getElementById('codeFont');
                if (codeSelect) {
                    codeSelect.value = monoFont.fontFamily;
                    this.update('code', monoFont.fontFamily);
                }
            }

            if (sansFont) {
                const headingSelect = document.getElementById('headingFont');
                const bodySelect = document.getElementById('bodyFont');
                if (headingSelect) {
                    headingSelect.value = sansFont.fontFamily;
                    this.update('heading', sansFont.fontFamily);
                }
                if (bodySelect) {
                    bodySelect.value = sansFont.fontFamily;
                    this.update('body', sansFont.fontFamily);
                }
            }

            if (btn) tutShowFeedback(btn, `${fonts.length} font${fonts.length > 1 ? 's' : ''} added`, 'success');
            document.getElementById('fontEmbedCode').value = '';
        };

        link.onerror = () => {
            link.remove();
            if (btn) tutShowFeedback(btn, 'Failed to load', 'error');
        };
    }
};


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/export.js ===
/**
 * TUT Export - Theme export/import functionality
 */

const TUT_Export = {
    /**
     * Build complete theme object from current state
     */
    buildThemeObject: function() {
        const style = getComputedStyle(document.documentElement);
        const metadata = TUT_Panel.getMetadata();

        // Build tokens object
        const tokens = {};
        Object.keys(TUT_DEFAULT_TOKENS).forEach(cssVar => {
            const value = style.getPropertyValue(cssVar).trim();
            const tokenId = cssVar.replace('--', '');
            const meta = TUT_TOKEN_METADATA[cssVar] || {};

            tokens[tokenId] = {
                value: value,
                type: meta.type || 'color',
                cssVar: cssVar,
                tdsToken: meta.tdsToken || '',
                description: meta.description || '',
                appliesTo: meta.appliesTo || [],
                ...(meta.contrastWith ? { contrastWith: meta.contrastWith } : {})
            };
        });

        return {
            "$schema": "./design-tokens.schema.json",
            metadata: metadata,
            tokens: tokens,
            groups: [
                { id: "backgrounds", name: "Background Colors", description: "Surface colors forming the visual depth hierarchy", tokens: ["bg-primary", "bg-secondary", "bg-tertiary"], order: 1 },
                { id: "text", name: "Text Colors", description: "Typography colors for content hierarchy", tokens: ["text-primary", "text-secondary"], order: 2 },
                { id: "accents", name: "Accent Colors", description: "Interactive and emphasis colors", tokens: ["accent-primary", "accent-secondary"], order: 3 },
                { id: "status", name: "Status Colors", description: "Feedback and state indication", tokens: ["success", "warning", "error"], order: 4 },
                { id: "structure", name: "Structural Colors", description: "Borders, dividers, and highlights", tokens: ["border", "highlight"], order: 5 }
            ],
            layout: {
                surfaces: {
                    page: { background: "bg-primary" },
                    panel: { background: "bg-secondary", border: "border" },
                    header: { background: "bg-tertiary", border: "border" }
                },
                typography: {
                    heading: { foreground: "text-primary", accent: "accent-primary" },
                    body: { foreground: "text-secondary" },
                    code: { background: "bg-tertiary", foreground: "accent-primary", border: "border" }
                },
                interactive: {
                    "button-primary": { background: "accent-secondary", foreground: "text-primary" },
                    link: { foreground: "accent-primary" }
                },
                feedback: {
                    "success-box": { border: "success", background: "bg-tertiary" },
                    "warning-box": { border: "warning", background: "bg-tertiary" },
                    "error-box": { border: "error", background: "bg-tertiary" }
                }
            },
            tdsMapping: {
                "--bg-primary": "structural.bg.primary",
                "--bg-secondary": "structural.bg.secondary",
                "--bg-tertiary": "structural.bg.tertiary",
                "--text-primary": "text.primary",
                "--text-secondary": "text.secondary",
                "--accent-primary": "interactive.link",
                "--accent-secondary": "structural.secondary",
                "--success": "status.success",
                "--warning": "status.warning",
                "--error": "status.error",
                "--border": "structural.separator",
                "--highlight": "interactive.hover"
            }
        };
    },

    /**
     * Export theme as JSON file download
     */
    toJSON: function() {
        const theme = this.buildThemeObject();
        const themeName = theme.metadata.name;
        const jsonOutput = JSON.stringify(theme, null, 2);

        const blob = new Blob([jsonOutput], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${themeName}.tokens.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const btn = document.getElementById('exportThemeBtn');
        if (btn) tutShowFeedback(btn, 'Downloaded', 'success');
    },

    /**
     * Copy CSS to clipboard
     */
    toCSS: function() {
        const tokens = Object.keys(TUT_DEFAULT_TOKENS);
        const style = getComputedStyle(document.documentElement);

        let cssOutput = ':root {\n';
        tokens.forEach(token => {
            const value = style.getPropertyValue(token).trim();
            cssOutput += `    ${token}: ${value};\n`;
        });
        cssOutput += '}\n';

        // Add Google Fonts CDN URLs
        if (TUT_Fonts.loaded.length > 0) {
            cssOutput += '\n/* Google Fonts */\n';
            TUT_Fonts.loaded.forEach(font => {
                cssOutput += `/* GoogleFont: ${font.fontFamily} | ${font.cdnUrl} */\n`;
            });
        }

        navigator.clipboard.writeText(cssOutput).then(() => {
            const btn = document.getElementById('copyCSSBtn');
            if (btn) tutShowFeedback(btn, 'Copied', 'success');
        }).catch(err => {
            console.error('Copy failed:', err);
            const btn = document.getElementById('copyCSSBtn');
            if (btn) tutShowFeedback(btn, 'Failed', 'error');
        });
    },

    /**
     * Import theme from JSON file
     */
    fromJSON: function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const theme = JSON.parse(event.target.result);
                    TUT_Themes.apply(theme);
                    TUT_Themes.save(theme);

                    const btn = document.getElementById('importThemeBtn');
                    if (btn) tutShowFeedback(btn, `Loaded: ${theme.metadata?.name || 'theme'}`, 'success');
                } catch (err) {
                    console.error('Failed to parse theme:', err);
                    tutShowInlineError('importExportSection', 'Invalid JSON file format');
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }
};


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/inspector.js ===
/**
 * TUT Inspector - Element inspector (Shift-Hold)
 */

const TUT_Inspector = {
    longPressTimer: null,
    progressTimer: null,
    currentElement: null,
    progressOverlay: null,
    startTime: 0,
    LONG_PRESS_DURATION: 1000,

    /**
     * Initialize inspector
     */
    init: function() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closePanel();
        });
        document.addEventListener('mousedown', this.handleShiftMouseDown.bind(this), true);
        document.addEventListener('mouseup', this.handleMouseUp.bind(this), true);
    },

    /**
     * Create progress overlay
     */
    createProgressOverlay: function() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            pointer-events: none;
            border: 3px solid var(--accent-primary);
            border-radius: 4px;
            background: radial-gradient(circle, transparent 0%, rgba(88, 166, 255, 0.1) 100%);
            z-index: 10000;
            transition: opacity 0.2s;
        `;
        overlay.innerHTML = `
            <div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%);
                        background: var(--bg-secondary); border: 2px solid var(--accent-primary);
                        border-radius: 20px; padding: 4px 12px; font-size: 11px;
                        font-family: 'Courier New', monospace; color: var(--accent-primary); white-space: nowrap;">
                <span class="progress-text">0.0s / 1.0s</span>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    },

    /**
     * Update progress overlay position and progress
     */
    updateProgressOverlay: function(element, progress) {
        if (!this.progressOverlay) return;
        const rect = element.getBoundingClientRect();
        this.progressOverlay.style.left = rect.left + 'px';
        this.progressOverlay.style.top = rect.top + 'px';
        this.progressOverlay.style.width = rect.width + 'px';
        this.progressOverlay.style.height = rect.height + 'px';

        const elapsed = (progress * this.LONG_PRESS_DURATION / 100) / 1000;
        const progressText = this.progressOverlay.querySelector('.progress-text');
        if (progressText) progressText.textContent = `${elapsed.toFixed(1)}s / 1.0s`;

        const alpha = Math.min(0.3, progress / 100 * 0.3);
        this.progressOverlay.style.background = `radial-gradient(circle, rgba(88, 166, 255, ${alpha}) 0%, rgba(88, 166, 255, ${alpha * 0.3}) 100%)`;
    },

    /**
     * Get XPath for element
     */
    getXPath: function(element) {
        if (element.id) return `//*[@id="${element.id}"]`;
        if (element === document.body) return '/html/body';

        let ix = 0;
        const siblings = element.parentNode?.childNodes || [];
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling === element) {
                const parentPath = element.parentNode ? this.getXPath(element.parentNode) : '';
                return `${parentPath}/${element.tagName.toLowerCase()}[${ix + 1}]`;
            }
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) ix++;
        }
        return '';
    },

    /**
     * Extract design tokens from element
     */
    extractTokens: function(element) {
        const computed = window.getComputedStyle(element);
        return {
            element: {
                tag: element.tagName.toLowerCase(),
                classes: Array.from(element.classList).join(', ') || 'none',
                id: element.id || 'none',
                xpath: this.getXPath(element)
            },
            colors: {
                background: computed.backgroundColor,
                color: computed.color,
                borderColor: computed.borderTopColor
            },
            typography: {
                fontFamily: computed.fontFamily,
                fontSize: computed.fontSize,
                fontWeight: computed.fontWeight,
                lineHeight: computed.lineHeight,
                letterSpacing: computed.letterSpacing
            },
            spacing: {
                padding: computed.padding,
                margin: computed.margin
            },
            border: {
                width: computed.borderWidth,
                style: computed.borderStyle,
                radius: computed.borderRadius
            },
            layout: {
                display: computed.display,
                width: computed.width,
                height: computed.height
            }
        };
    },

    /**
     * Display element tokens in inspector panel
     */
    displayTokens: function(element, tokens) {
        let panel = document.getElementById('elementInspectorPanel');
        if (!panel) panel = this.createPanel();
        this.populatePanel(panel, element, tokens);
        panel.classList.add('visible');
        panel.style.display = 'flex';
    },

    /**
     * Create inspector panel
     */
    createPanel: function() {
        const panel = document.createElement('div');
        panel.id = 'elementInspectorPanel';
        panel.innerHTML = `
            <div class="inspector-header">
                <span>Element Design Tokens
                    <span style="font-size: 0.7rem; color: var(--text-secondary); font-weight: normal;">(drag to move)</span>
                </span>
                <span class="close-inspector" style="cursor: pointer; color: var(--text-secondary); font-size: 1.5rem; padding: 0 0.5rem;">&times;</span>
            </div>
            <div class="inspector-content"></div>
        `;
        this.makeDraggable(panel);
        panel.querySelector('.close-inspector').addEventListener('click', () => this.closePanel());
        document.body.appendChild(panel);
        return panel;
    },

    /**
     * Make panel draggable
     */
    makeDraggable: function(panel) {
        const header = panel.querySelector('.inspector-header');
        let isDragging = false, initialX, initialY;

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('close-inspector')) return;
            isDragging = true;
            initialX = e.clientX - (parseInt(panel.style.left) || 0);
            initialY = e.clientY - (parseInt(panel.style.top) || 0);
            panel.style.transform = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                panel.style.left = (e.clientX - initialX) + 'px';
                panel.style.top = (e.clientY - initialY) + 'px';
            }
        });

        document.addEventListener('mouseup', () => { isDragging = false; });
    },

    /**
     * Close inspector panel
     */
    closePanel: function() {
        const panel = document.getElementById('elementInspectorPanel');
        if (panel) {
            panel.classList.remove('visible');
            panel.style.display = 'none';
        }
    },

    /**
     * Populate inspector panel with tokens
     */
    populatePanel: function(panel, element, tokens) {
        const content = panel.querySelector('.inspector-content');

        let html = `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-primary); border-radius: 4px; border: 1px solid var(--border);">
                <div style="font-weight: 600; color: var(--accent-primary); margin-bottom: 0.5rem;">Element Info</div>
                <div style="font-family: 'Courier New', monospace; color: var(--text-secondary); font-size: 0.8rem;">
                    <div style="margin-bottom: 0.5rem;"><strong>Tag:</strong> &lt;${tokens.element.tag}&gt;</div>
                    <div style="margin-bottom: 0.5rem;"><strong>ID:</strong> ${tokens.element.id}</div>
                    <div style="margin-bottom: 0.5rem;"><strong>Classes:</strong> ${tokens.element.classes}</div>
                    <div style="margin-bottom: 0.5rem;"><strong>XPath:</strong>
                        <div style="background: var(--bg-secondary); padding: 0.5rem; border-radius: 3px;
                                    margin-top: 0.25rem; word-break: break-all; color: var(--accent-primary);
                                    font-size: 0.75rem; border: 1px solid var(--border); cursor: pointer;"
                             onclick="navigator.clipboard.writeText('${tokens.element.xpath}')"
                             title="Click to copy">${tokens.element.xpath}</div>
                    </div>
                </div>
            </div>
        `;

        html += this.createTokenSection('Colors', tokens.colors);
        html += this.createTokenSection('Typography', tokens.typography);
        html += this.createTokenSection('Spacing', tokens.spacing);
        html += this.createTokenSection('Border', tokens.border);
        html += this.createTokenSection('Layout', tokens.layout);

        content.innerHTML = html;
    },

    /**
     * Create token section HTML
     */
    createTokenSection: function(title, tokens) {
        let html = `
            <div style="margin-bottom: 1.5rem;">
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;
                            font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">${title}</div>
        `;

        for (const [key, value] of Object.entries(tokens)) {
            const isColor = title === 'Colors';
            const colorSwatch = isColor && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent'
                ? `<div style="width: 24px; height: 24px; background: ${value}; border: 1px solid var(--border); border-radius: 3px; flex-shrink: 0;"></div>`
                : '';

            html += `
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;
                            padding: 0.5rem; background: var(--bg-tertiary); border-radius: 4px;">
                    ${colorSwatch}
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${key}</div>
                        <div style="font-family: 'Courier New', monospace; font-size: 0.7rem;
                                    color: var(--accent-primary); overflow: hidden; text-overflow: ellipsis;">${value}</div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    },

    /**
     * Handle shift+mousedown for long press
     */
    handleShiftMouseDown: function(e) {
        if (!e.shiftKey) return;
        if (e.target.closest('#designPanel') ||
            e.target.closest('#elementInspectorPanel') ||
            e.target.closest('.design-fab')) return;

        e.preventDefault();
        e.stopPropagation();

        this.currentElement = e.target;
        this.startTime = Date.now();
        this.progressOverlay = this.createProgressOverlay();
        this.updateProgressOverlay(this.currentElement, 0);

        let progress = 0;
        this.progressTimer = setInterval(() => {
            progress = ((Date.now() - this.startTime) / this.LONG_PRESS_DURATION) * 100;
            this.updateProgressOverlay(this.currentElement, progress);
            if (progress >= 100) clearInterval(this.progressTimer);
        }, 50);

        this.longPressTimer = setTimeout(() => {
            this.longPressTimer = null;
            const tokens = this.extractTokens(this.currentElement);
            this.displayTokens(this.currentElement, tokens);

            if (this.progressTimer) {
                clearInterval(this.progressTimer);
                this.progressTimer = null;
            }
            if (this.progressOverlay) {
                this.progressOverlay.remove();
                this.progressOverlay = null;
            }
        }, this.LONG_PRESS_DURATION);
    },

    /**
     * Handle mouseup to cancel long press
     */
    handleMouseUp: function(e) {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
        }
        if (this.progressOverlay) {
            this.progressOverlay.remove();
            this.progressOverlay = null;
        }
        this.currentElement = null;
    }
};


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/usage.js ===
/**
 * TUT Usage - Token usage tracking and analytics
 *
 * Scans DOM and stylesheets to build a map of where tokens are used,
 * tracks changes over time, and identifies orphaned/missing tokens.
 */

const TUT_Usage = {
    // Token usage registry
    _registry: {},

    // Scan configuration
    _config: {
        scanInterval: null,
        autoScan: false,
        trackHistory: true,
        maxHistory: 50
    },

    /**
     * Initialize usage tracking
     */
    init: function() {
        this._registry = {};
        this.scan();
        console.log('[TUT.Usage] Initialized');
    },

    /**
     * Full scan - analyze DOM and stylesheets for token usage
     */
    scan: function() {
        const startTime = performance.now();

        // Reset counts (keep history)
        Object.keys(this._registry).forEach(token => {
            this._registry[token].references = [];
            this._registry[token].elements = 0;
            this._registry[token].stylesheets = [];
        });

        // Scan all defined tokens
        this._scanDefinitions();

        // Scan DOM for computed style usage
        this._scanDOM();

        // Scan stylesheets for references
        this._scanStylesheets();

        // Calculate derived metrics
        this._calculateMetrics();

        const elapsed = (performance.now() - startTime).toFixed(2);
        console.log(`[TUT.Usage] Scan complete: ${Object.keys(this._registry).length} tokens in ${elapsed}ms`);

        // Emit event
        if (typeof TERRAIN !== 'undefined' && TERRAIN.Events) {
            TERRAIN.Events.emit('tut:usage:scan', {
                tokens: Object.keys(this._registry).length,
                elapsed
            });
        }

        return this._registry;
    },

    /**
     * Scan :root for token definitions
     */
    _scanDefinitions: function() {
        const root = document.documentElement;
        const rootStyles = getComputedStyle(root);

        // Get all custom properties from stylesheets
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules || []) {
                    if (rule.selectorText === ':root' && rule.style) {
                        for (let i = 0; i < rule.style.length; i++) {
                            const prop = rule.style[i];
                            if (prop.startsWith('--')) {
                                this._ensureToken(prop);
                                this._registry[prop].defined = true;
                                this._registry[prop].value = rootStyles.getPropertyValue(prop).trim();
                                this._registry[prop].source = sheet.href || 'inline';
                            }
                        }
                    }
                }
            } catch (e) {
                // Cross-origin stylesheet, skip
            }
        }
    },

    /**
     * Scan DOM elements for token usage in computed styles
     */
    _scanDOM: function() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_ELEMENT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            this._scanElement(node);
        }
    },

    /**
     * Scan a single element for token usage
     */
    _scanElement: function(el) {
        // Skip script, style, and hidden elements
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) return;

        const computed = getComputedStyle(el);
        const inline = el.style;

        // Check inline styles for var() references
        for (let i = 0; i < inline.length; i++) {
            const prop = inline[i];
            const value = inline.getPropertyValue(prop);
            this._extractTokenRefs(value, el, prop, 'inline');
        }

        // Track which tokens this element's computed style resolves to
        // by checking known token values
        Object.keys(this._registry).forEach(token => {
            const tokenValue = this._registry[token].value;
            if (!tokenValue) return;

            // Check common properties that use tokens
            const propsToCheck = [
                'background-color', 'color', 'border-color',
                'border-top-color', 'border-right-color',
                'border-bottom-color', 'border-left-color',
                'fill', 'stroke', 'box-shadow'
            ];

            propsToCheck.forEach(prop => {
                const computedValue = computed.getPropertyValue(prop);
                if (computedValue && computedValue.includes(tokenValue)) {
                    this._addReference(token, el, prop, 'computed');
                }
            });
        });
    },

    /**
     * Extract var(--token) references from a CSS value
     */
    _extractTokenRefs: function(value, el, prop, type) {
        const varRegex = /var\(\s*(--[\w-]+)/g;
        let match;
        while ((match = varRegex.exec(value)) !== null) {
            const token = match[1];
            this._ensureToken(token);
            this._addReference(token, el, prop, type);
        }
    },

    /**
     * Scan stylesheets for var() references
     */
    _scanStylesheets: function() {
        for (const sheet of document.styleSheets) {
            try {
                const href = sheet.href || 'inline';
                this._scanRules(sheet.cssRules, href);
            } catch (e) {
                // Cross-origin stylesheet
            }
        }
    },

    /**
     * Recursively scan CSS rules
     */
    _scanRules: function(rules, source) {
        if (!rules) return;

        for (const rule of rules) {
            if (rule.cssRules) {
                // @media, @supports, etc.
                this._scanRules(rule.cssRules, source);
            } else if (rule.style) {
                for (let i = 0; i < rule.style.length; i++) {
                    const prop = rule.style[i];
                    const value = rule.style.getPropertyValue(prop);

                    const varRegex = /var\(\s*(--[\w-]+)/g;
                    let match;
                    while ((match = varRegex.exec(value)) !== null) {
                        const token = match[1];
                        this._ensureToken(token);

                        if (!this._registry[token].stylesheets.includes(source)) {
                            this._registry[token].stylesheets.push(source);
                        }

                        this._registry[token].cssRules = (this._registry[token].cssRules || 0) + 1;
                    }
                }
            }
        }
    },

    /**
     * Ensure token exists in registry
     */
    _ensureToken: function(token) {
        if (!this._registry[token]) {
            this._registry[token] = {
                name: token,
                defined: false,
                value: null,
                source: null,
                references: [],
                elements: 0,
                stylesheets: [],
                cssRules: 0,
                history: [],
                firstSeen: Date.now(),
                lastChanged: null
            };
        }
    },

    /**
     * Add a reference to a token
     */
    _addReference: function(token, el, prop, type) {
        this._ensureToken(token);

        this._registry[token].references.push({
            element: el.tagName.toLowerCase(),
            id: el.id || null,
            classes: Array.from(el.classList).slice(0, 3),
            property: prop,
            type: type
        });

        this._registry[token].elements++;
    },

    /**
     * Calculate derived metrics
     */
    _calculateMetrics: function() {
        Object.values(this._registry).forEach(token => {
            // Components (unique class combinations)
            const components = new Set();
            token.references.forEach(ref => {
                if (ref.classes.length > 0) {
                    components.add(ref.classes[0]);
                }
            });
            token.components = Array.from(components);

            // Orphan detection
            token.isOrphan = token.defined && token.elements === 0 && token.cssRules === 0;

            // Missing detection (referenced but not defined)
            token.isMissing = !token.defined && (token.elements > 0 || token.cssRules > 0);
        });
    },

    /**
     * Record a value change in history
     */
    recordChange: function(token, oldValue, newValue) {
        this._ensureToken(token);

        if (this._config.trackHistory) {
            this._registry[token].history.unshift({
                from: oldValue,
                to: newValue,
                timestamp: Date.now()
            });

            // Trim history
            if (this._registry[token].history.length > this._config.maxHistory) {
                this._registry[token].history.pop();
            }
        }

        this._registry[token].lastChanged = Date.now();
        this._registry[token].value = newValue;
    },

    // =========================================================================
    // Query API
    // =========================================================================

    /**
     * Get usage data for a specific token
     */
    get: function(token) {
        return this._registry[token] || null;
    },

    /**
     * Get all tokens
     */
    getAll: function() {
        return { ...this._registry };
    },

    /**
     * Get tokens sorted by usage count
     */
    getByUsage: function() {
        return Object.values(this._registry)
            .sort((a, b) => b.elements - a.elements);
    },

    /**
     * Get orphaned tokens (defined but never used)
     */
    getOrphans: function() {
        return Object.values(this._registry)
            .filter(t => t.isOrphan);
    },

    /**
     * Get missing tokens (used but not defined)
     */
    getMissing: function() {
        return Object.values(this._registry)
            .filter(t => t.isMissing);
    },

    /**
     * Get tokens by component/class usage
     */
    getByComponent: function(component) {
        return Object.values(this._registry)
            .filter(t => t.components.includes(component));
    },

    /**
     * Get recently changed tokens
     */
    getRecentlyChanged: function(since = Date.now() - 3600000) {
        return Object.values(this._registry)
            .filter(t => t.lastChanged && t.lastChanged > since)
            .sort((a, b) => b.lastChanged - a.lastChanged);
    },

    /**
     * Get usage summary statistics
     */
    getSummary: function() {
        const tokens = Object.values(this._registry);
        return {
            total: tokens.length,
            defined: tokens.filter(t => t.defined).length,
            used: tokens.filter(t => t.elements > 0 || t.cssRules > 0).length,
            orphans: tokens.filter(t => t.isOrphan).length,
            missing: tokens.filter(t => t.isMissing).length,
            totalReferences: tokens.reduce((sum, t) => sum + t.elements, 0),
            mostUsed: tokens.sort((a, b) => b.elements - a.elements)[0]?.name || null
        };
    },

    /**
     * Find all elements using a specific token
     */
    findElements: function(token) {
        const elements = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_ELEMENT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            const inline = node.style.cssText;
            if (inline.includes(token)) {
                elements.push(node);
            }
        }

        return elements;
    },

    /**
     * Highlight elements using a token (visual debugging)
     */
    highlight: function(token, color = 'rgba(255, 0, 0, 0.3)') {
        this.clearHighlights();

        const elements = this.findElements(token);
        elements.forEach(el => {
            el.dataset.tutHighlight = 'true';
            el.style.outline = `2px solid ${color}`;
            el.style.outlineOffset = '2px';
        });

        return elements.length;
    },

    /**
     * Clear all highlights
     */
    clearHighlights: function() {
        document.querySelectorAll('[data-tut-highlight]').forEach(el => {
            delete el.dataset.tutHighlight;
            el.style.outline = '';
            el.style.outlineOffset = '';
        });
    }
};


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/deps.js ===
/**
 * TUT Deps - Token dependency graph
 *
 * Builds a graph of how tokens reference each other via var() fallbacks
 * and inheritance patterns. Enables impact analysis for token changes.
 */

const TUT_Deps = {
    // Dependency graph: token -> { dependsOn: [], dependents: [] }
    _graph: {},

    /**
     * Initialize dependency tracking
     */
    init: function() {
        this._graph = {};
        this.build();
        console.log('[TUT.Deps] Initialized');
    },

    /**
     * Build dependency graph from stylesheets
     */
    build: function() {
        this._graph = {};

        // Scan all stylesheets for var() with fallbacks
        for (const sheet of document.styleSheets) {
            try {
                this._scanRules(sheet.cssRules);
            } catch (e) {
                // Cross-origin stylesheet
            }
        }

        // Also scan inline styles
        document.querySelectorAll('[style]').forEach(el => {
            this._parseValue(el.style.cssText);
        });

        console.log(`[TUT.Deps] Built graph: ${Object.keys(this._graph).length} tokens`);
        return this._graph;
    },

    /**
     * Recursively scan CSS rules
     */
    _scanRules: function(rules) {
        if (!rules) return;

        for (const rule of rules) {
            if (rule.cssRules) {
                this._scanRules(rule.cssRules);
            } else if (rule.style) {
                for (let i = 0; i < rule.style.length; i++) {
                    const prop = rule.style[i];
                    const value = rule.style.getPropertyValue(prop);

                    // Check if this is a token definition
                    if (prop.startsWith('--')) {
                        this._ensureToken(prop);
                        // Check if the value references other tokens
                        this._parseValue(value, prop);
                    } else {
                        // Regular property using tokens
                        this._parseValue(value);
                    }
                }
            }
        }
    },

    /**
     * Parse a CSS value for var() references and build dependencies
     */
    _parseValue: function(value, definingToken = null) {
        // Match var(--token) and var(--token, fallback)
        // Handles nested: var(--a, var(--b, var(--c, default)))
        const tokens = this._extractTokens(value);

        if (definingToken && tokens.length > 0) {
            // This token depends on others
            this._ensureToken(definingToken);
            tokens.forEach(dep => {
                this._ensureToken(dep);
                this._addDependency(definingToken, dep);
            });
        }
    },

    /**
     * Extract all token names from a CSS value
     */
    _extractTokens: function(value) {
        const tokens = [];
        const regex = /var\(\s*(--[\w-]+)/g;
        let match;
        while ((match = regex.exec(value)) !== null) {
            tokens.push(match[1]);
        }
        return tokens;
    },

    /**
     * Ensure token exists in graph
     */
    _ensureToken: function(token) {
        if (!this._graph[token]) {
            this._graph[token] = {
                name: token,
                dependsOn: [],    // Tokens this one uses
                dependents: [],   // Tokens that use this one
                depth: 0          // Distance from root (no dependencies)
            };
        }
    },

    /**
     * Add a dependency relationship
     */
    _addDependency: function(token, dependsOn) {
        if (!this._graph[token].dependsOn.includes(dependsOn)) {
            this._graph[token].dependsOn.push(dependsOn);
        }
        if (!this._graph[dependsOn].dependents.includes(token)) {
            this._graph[dependsOn].dependents.push(token);
        }
    },

    // =========================================================================
    // Query API
    // =========================================================================

    /**
     * Get dependency info for a token
     */
    get: function(token) {
        return this._graph[token] || null;
    },

    /**
     * Get all tokens this one depends on (direct)
     */
    getDependencies: function(token) {
        return this._graph[token]?.dependsOn || [];
    },

    /**
     * Get all tokens that depend on this one (direct)
     */
    getDependents: function(token) {
        return this._graph[token]?.dependents || [];
    },

    /**
     * Get full dependency chain (recursive, all ancestors)
     */
    getFullDependencies: function(token, visited = new Set()) {
        if (visited.has(token)) return []; // Cycle detection
        visited.add(token);

        const direct = this.getDependencies(token);
        const all = [...direct];

        direct.forEach(dep => {
            all.push(...this.getFullDependencies(dep, visited));
        });

        return [...new Set(all)];
    },

    /**
     * Get full dependent chain (recursive, all descendants)
     */
    getFullDependents: function(token, visited = new Set()) {
        if (visited.has(token)) return [];
        visited.add(token);

        const direct = this.getDependents(token);
        const all = [...direct];

        direct.forEach(dep => {
            all.push(...this.getFullDependents(dep, visited));
        });

        return [...new Set(all)];
    },

    /**
     * Get impact analysis for changing a token
     * Returns all tokens and approximate element count affected
     */
    getImpact: function(token) {
        const affected = this.getFullDependents(token);
        affected.unshift(token); // Include self

        let totalElements = 0;
        if (typeof TUT_Usage !== 'undefined') {
            affected.forEach(t => {
                const usage = TUT_Usage.get(t);
                if (usage) totalElements += usage.elements;
            });
        }

        return {
            token,
            affectedTokens: affected,
            affectedCount: affected.length,
            estimatedElements: totalElements,
            risk: affected.length > 10 ? 'high' : affected.length > 3 ? 'medium' : 'low'
        };
    },

    /**
     * Get root tokens (no dependencies, foundation of design system)
     */
    getRoots: function() {
        return Object.values(this._graph)
            .filter(t => t.dependsOn.length === 0)
            .map(t => t.name);
    },

    /**
     * Get leaf tokens (nothing depends on them)
     */
    getLeaves: function() {
        return Object.values(this._graph)
            .filter(t => t.dependents.length === 0)
            .map(t => t.name);
    },

    /**
     * Detect circular dependencies
     */
    findCycles: function() {
        const cycles = [];
        const visited = new Set();
        const stack = new Set();

        const dfs = (token, path) => {
            if (stack.has(token)) {
                const cycleStart = path.indexOf(token);
                cycles.push(path.slice(cycleStart));
                return;
            }
            if (visited.has(token)) return;

            visited.add(token);
            stack.add(token);
            path.push(token);

            (this._graph[token]?.dependsOn || []).forEach(dep => {
                dfs(dep, [...path]);
            });

            stack.delete(token);
        };

        Object.keys(this._graph).forEach(token => {
            dfs(token, []);
        });

        return cycles;
    },

    /**
     * Get tokens grouped by depth (layers of abstraction)
     */
    getLayers: function() {
        const layers = {};

        // Calculate depth for each token
        const calculateDepth = (token, visited = new Set()) => {
            if (visited.has(token)) return 0;
            visited.add(token);

            const deps = this._graph[token]?.dependsOn || [];
            if (deps.length === 0) return 0;

            return 1 + Math.max(...deps.map(d => calculateDepth(d, visited)));
        };

        Object.keys(this._graph).forEach(token => {
            const depth = calculateDepth(token);
            this._graph[token].depth = depth;

            if (!layers[depth]) layers[depth] = [];
            layers[depth].push(token);
        });

        return layers;
    },

    /**
     * Export graph as DOT format (for visualization)
     */
    toDOT: function() {
        let dot = 'digraph TokenDeps {\n';
        dot += '  rankdir=TB;\n';
        dot += '  node [shape=box, style=rounded];\n\n';

        Object.entries(this._graph).forEach(([token, data]) => {
            const label = token.replace('--', '');
            dot += `  "${label}";\n`;

            data.dependsOn.forEach(dep => {
                const depLabel = dep.replace('--', '');
                dot += `  "${depLabel}" -> "${label}";\n`;
            });
        });

        dot += '}\n';
        return dot;
    },

    /**
     * Export as JSON for external tools
     */
    toJSON: function() {
        return JSON.stringify(this._graph, null, 2);
    }
};


// === /Users/mricos/src/devops/tetra/bash/terrain/../tut/src/api.js ===
/**
 * TUT API - Public interface and TERRAIN registration
 */

const TUT = {
    version: '1.0.0',
    _initialized: false,

    // Sub-modules (exposed for direct access)
    Tokens: TUT_Tokens,
    Themes: TUT_Themes,
    Panel: TUT_Panel,
    Fonts: TUT_Fonts,
    Export: TUT_Export,
    Inspector: TUT_Inspector,
    Usage: TUT_Usage,
    Deps: TUT_Deps,

    /**
     * Initialize TUT
     * @param {Object} options - Configuration options
     */
    init: function(options = {}) {
        if (this._initialized) {
            console.warn('[TUT] Already initialized');
            return this;
        }

        console.log('[TUT] Initializing v' + this.version);

        // Create FAB and Panel dynamically (if not already present)
        TUT_Panel.createFAB();
        TUT_Panel.create();

        // Initialize color pickers (for any existing pickers in DOM)
        TUT_Tokens.initPickers();

        // Initialize theme system
        TUT_Themes.init();

        // Restore sidebar position
        TUT_Panel.restoreSidebarPosition();

        // Collapse sections (except Theme Switcher and Colors)
        // Theme Switcher and Colors stay open by default

        // Setup click-outside handling
        TUT_Panel.setupClickOutside();

        // Initialize inspector
        TUT_Inspector.init();

        // Initialize usage tracking and dependency graph
        TUT_Usage.init();
        TUT_Deps.init();

        // Setup TERRAIN Bridge listeners
        this._setupBridge();

        // Setup event delegation for data-action attributes
        initTUTEventDelegation();

        this._initialized = true;

        // Emit init event
        if (typeof TERRAIN !== 'undefined' && TERRAIN.Events) {
            TERRAIN.Events.emit('tut:init');
        }

        console.log('[TUT] Initialized');
        return this;
    },

    /**
     * Destroy TUT instance
     */
    destroy: function() {
        if (!this._initialized) return;

        // Cleanup...
        this._initialized = false;

        if (typeof TERRAIN !== 'undefined' && TERRAIN.Events) {
            TERRAIN.Events.emit('tut:destroy');
        }
    },

    /**
     * Setup TERRAIN Bridge listeners for cross-iframe sync
     */
    _setupBridge: function() {
        if (typeof TERRAIN === 'undefined' || !TERRAIN.Bridge) return;

        // Listen for token changes from other frames
        TERRAIN.Bridge.on('tut:token-change', (data) => {
            if (data && data.name && data.value) {
                TUT_Tokens.update(data.name, data.value, { silent: true });
            }
        });

        // Listen for theme changes
        TERRAIN.Bridge.on('tut:theme-apply', (data) => {
            if (data && data.theme) {
                TUT_Themes.apply(data.theme);
            }
        });
    },

    // =========================================================================
    // Public API Methods
    // =========================================================================

    /**
     * Get a token value
     */
    getToken: function(name) {
        return TUT_Tokens.get(name);
    },

    /**
     * Set a token value
     */
    setToken: function(name, value, options) {
        TUT_Tokens.update(name, value, options);
    },

    /**
     * Get all token values
     */
    getAllTokens: function() {
        return TUT_Tokens.getAll();
    },

    /**
     * Reset all tokens to defaults
     */
    resetTokens: function() {
        TUT_Tokens.reset();
    },

    /**
     * Toggle design panel
     */
    togglePanel: function() {
        TUT_Panel.toggle();
    },

    /**
     * Export theme as JSON
     */
    exportJSON: function() {
        TUT_Export.toJSON();
    },

    /**
     * Export theme as CSS
     */
    exportCSS: function() {
        TUT_Export.toCSS();
    },

    /**
     * Import theme from file
     */
    importJSON: function() {
        TUT_Export.fromJSON();
    },

    /**
     * Build theme object
     */
    buildTheme: function() {
        return TUT_Export.buildThemeObject();
    },

    /**
     * Apply a theme object
     */
    applyTheme: function(theme) {
        TUT_Themes.apply(theme);
    },

    /**
     * Save current theme
     */
    saveTheme: function() {
        TUT_Themes.saveCurrent();
    },

    /**
     * Broadcast token change to other frames
     */
    broadcastToken: function(name, value) {
        if (typeof TERRAIN !== 'undefined' && TERRAIN.Bridge) {
            TERRAIN.Bridge.broadcast('tut:token-change', { name, value });
        }
    },

    /**
     * Broadcast theme to other frames
     */
    broadcastTheme: function(theme) {
        if (typeof TERRAIN !== 'undefined' && TERRAIN.Bridge) {
            TERRAIN.Bridge.broadcast('tut:theme-apply', { theme });
        }
    }
};

// =========================================================================
// Event Delegation - Single handler for all TUT actions
// Uses data-action attributes instead of individual onclick handlers
// =========================================================================

const TUT_Actions = {
    // Panel controls
    'toggle-panel': () => TUT.togglePanel(),
    'toggle-section': (el) => TUT_Panel.toggleSection(el.dataset.target),
    'close-panel': () => TUT_Panel.close(),

    // Token updates
    'update-token': (el) => TUT_Tokens.update(el.dataset.token, el.value),
    'update-section-border': (el) => TUT_Tokens.updateSectionBorder(el.value),
    'update-section-radius': (el) => TUT_Tokens.updateSectionRadius(el.value),
    'update-sidebar-position': (el) => TUT_Panel.updateSidebarPosition(el.value),
    'update-font': (el) => TUT_Fonts.update(el.dataset.fontType, el.value),
    'reset-tokens': () => TUT_Tokens.reset(),

    // Theme management
    'switch-theme': (el) => TUT_Themes.switch(el.value),
    'save-theme': () => TUT_Themes.saveCurrent(),
    'delete-theme': () => TUT_Themes.deleteCurrent(),

    // Export/Import
    'export-theme': () => TUT_Export.toJSON(),
    'copy-css': () => TUT_Export.toCSS(),
    'import-theme': () => TUT_Export.fromJSON(),

    // Fonts
    'add-font': () => TUT_Fonts.add(),
    'toggle-font-example': () => TUT_Fonts.toggleExample(),

    // Analysis
    'run-analysis': () => TUT_Panel.runAnalysis()
};

/**
 * Initialize event delegation for TUT actions
 */
function initTUTEventDelegation() {
    document.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action && TUT_Actions[action]) {
            e.preventDefault();
            TUT_Actions[action](e.target);
        }
    });

    document.addEventListener('change', (e) => {
        const action = e.target.dataset.action;
        if (action && TUT_Actions[action]) {
            TUT_Actions[action](e.target);
        }
    });

    document.addEventListener('input', (e) => {
        const action = e.target.dataset.action;
        if (action && TUT_Actions[action]) {
            TUT_Actions[action](e.target);
        }
    });
}

// =========================================================================
// Auto-initialization based on URL param
// =========================================================================

(function() {
    const params = new URLSearchParams(window.location.search);

    if (!params.has('design')) {
        // Hide FAB and panel if design mode not enabled
        const style = document.createElement('style');
        style.textContent = '.design-fab, .design-panel, #elementInspectorPanel { display: none !important; }';
        document.head.appendChild(style);
    } else {
        // Design mode enabled - auto-init on DOMContentLoaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => TUT.init());
        } else {
            TUT.init();
        }
    }
})();
    // === END MODULE ===

    // Register with TERRAIN
    TERRAIN.register('TUT', TUT);

})(window.TERRAIN);

