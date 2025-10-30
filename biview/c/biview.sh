#!/usr/bin/env bash
# biview.sh — deps + build for the C TUI "biview"
# Usage:
#   source ./biview.sh
#   biview_dependencies        # install ncursesw (macOS/Linux)
#   biview_build               # build ./biview from ./biview.c
#   biview_buid                # alias to biview_build

set -euo pipefail

# Detect OS/distribution
_biview_os() {
  uname -s
}

_biview_has() {
  command -v "$1" >/dev/null 2>&1
}

# ---- Dependencies installer ----
biview_dependencies() {
  local os; os="$(_biview_os)"

  if [[ "$os" == "Darwin" ]]; then
    if ! _biview_has brew; then
      echo "Homebrew not found. Install: https://brew.sh/"
      return 1
    fi
    # ncurses from Homebrew (keg-only provides up-to-date wide-char)
    brew list ncurses >/dev/null 2>&1 || brew install ncurses
    # optional helpers
    brew list pkg-config >/dev/null 2>&1 || brew install pkg-config
    echo "macOS: ncurses installed via Homebrew."
    return 0
  fi

  # Linux families
  if _biview_has apt-get; then
    sudo apt-get update
    sudo apt-get install -y build-essential pkg-config libncursesw5-dev
    echo "Debian/Ubuntu: libncursesw5-dev installed."
    return 0
  fi
  if _biview_has dnf; then
    sudo dnf install -y @development-tools pkgconf-pkg-config ncurses-devel
    echo "Fedora/RHEL: ncurses-devel installed."
    return 0
  fi
  if _biview_has yum; then
    sudo yum groupinstall -y "Development Tools" || true
    sudo yum install -y pkgconfig ncurses-devel
    echo "CentOS/RHEL: ncurses-devel installed."
    return 0
  fi
  if _biview_has pacman; then
    sudo pacman -Sy --noconfirm base-devel pkgconf ncurses
    echo "Arch: ncurses installed."
    return 0
  fi
  if _biview_has zypper; then
    sudo zypper install -y gcc make pkg-config ncurses-devel
    echo "openSUSE: ncurses-devel installed."
    return 0
  fi

  echo "Unsupported distro. Install wide-char ncurses dev package manually."
  return 1
}

# ---- Build ----
biview_build() {
  local os cflags ldflags cc src out
  cc="${CC:-cc}"
  src="${1:-biview.c}"
  out="${2:-biview}"

  if [[ ! -f "$src" ]]; then
    echo "Missing $src"
    return 1
  fi

  # Try pkg-config first (prefer wide-char)
  if _biview_has pkg-config && pkg-config --exists ncursesw; then
    cflags="$(pkg-config --cflags ncursesw)"
    ldflags="$(pkg-config --libs ncursesw)"
  elif _biview_has pkg-config && pkg-config --exists ncurses; then
    cflags="$(pkg-config --cflags ncurses)"
    ldflags="$(pkg-config --libs ncurses)"
  else
    # Fallbacks
    if [[ "$(_biview_os)" == "Darwin" ]] && _biview_has brew; then
      local np; np="$(brew --prefix ncurses)"
      cflags="-I${np}/include"
      ldflags="-L${np}/lib -lncursesw"
    else
      ldflags="-lncursesw"
    fi
  fi

  # Compile
  set -x
  "$cc" -Wall -Wextra -Wpedantic -O2 -std=c11 -D_XOPEN_SOURCE=700 \
    $cflags "$src" -o "$out" $ldflags
  { set +x; } 2>/dev/null

  echo "Built ./$out"
}

# Alias for the typo in the request
biview_buid() {
  biview_build "$@"
}
