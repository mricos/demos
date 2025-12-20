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
