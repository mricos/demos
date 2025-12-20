.PHONY: all build serve clean release check

WASM_OUT = www/pkg

all: build

# Build WASM module (debug)
build:
	wasm-pack build --target web --out-dir $(WASM_OUT)

# Build optimized release
release:
	wasm-pack build --target web --out-dir $(WASM_OUT) --release

# Check code without building
check:
	cargo check

# Serve locally (requires Python 3)
serve: build
	@echo "Starting server at http://localhost:8080"
	@echo "Press Ctrl+C to stop"
	python3 -m http.server 8080 --directory www

# Clean build artifacts
clean:
	cargo clean
	rm -rf $(WASM_OUT)

# Install wasm-pack if not present
setup:
	@which wasm-pack > /dev/null || cargo install wasm-pack
