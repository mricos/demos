.PHONY: all rust c wasi serve clean release check

WASM_OUT_RUST = www/pkg
WASM_OUT_C = www/pkg-c

all: rust c

# =====================
# Rust Build (wasm-pack)
# =====================
rust:
	cd rust && wasm-pack build --target web --out-dir ../$(WASM_OUT_RUST)

rust-release:
	cd rust && wasm-pack build --target web --out-dir ../$(WASM_OUT_RUST) --release

rust-check:
	cd rust && cargo check

# =====================
# C Build (Emscripten)
# =====================
c:
	$(MAKE) -C c OUT_DIR=../$(WASM_OUT_C)

c-release:
	$(MAKE) -C c release OUT_DIR=../$(WASM_OUT_C)

wasi:
	$(MAKE) -C c wasi OUT_DIR=../$(WASM_OUT_C)

# =====================
# Development
# =====================
serve:
	@echo "Starting server at http://localhost:8080"
	@echo "Press Ctrl+C to stop"
	python3 -m http.server 8080 --directory www

# =====================
# Clean
# =====================
clean:
	cd rust && cargo clean
	rm -rf $(WASM_OUT_RUST) $(WASM_OUT_C)
	$(MAKE) -C c clean

# =====================
# Setup
# =====================
setup:
	@which wasm-pack > /dev/null || cargo install wasm-pack
	@which emcc > /dev/null || echo "Install Emscripten: https://emscripten.org/docs/getting_started"
