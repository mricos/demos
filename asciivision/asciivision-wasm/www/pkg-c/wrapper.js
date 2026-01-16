/**
 * JavaScript wrapper for C WASM AsciiProcessor
 * Provides the same API as the Rust wasm-bindgen version
 */

// AsciiProcessor class - mirrors Rust API
export class AsciiProcessor {
    constructor() {
        if (!window.AsciiModule || !window.AsciiModule._processor_new) {
            throw new Error('WASM module not loaded. Call initWasm() first.');
        }
        this._ptr = window.AsciiModule._processor_new();
        if (!this._ptr) {
            throw new Error('Failed to create AsciiProcessor');
        }
        this._heapPtr = null;
        this._heapSize = 0;
    }

    // Process RGBA frame data and return ASCII string
    process_frame(pixels, srcWidth, srcHeight, outWidth, outHeight) {
        const size = pixels.length;
        const M = window.AsciiModule;

        // Allocate or reuse heap memory for pixel data
        if (!this._heapPtr || this._heapSize < size) {
            if (this._heapPtr) {
                M._free(this._heapPtr);
            }
            this._heapPtr = M._malloc(size);
            this._heapSize = size;
        }

        // Copy pixels to WASM heap using HEAPU8 directly (handles memory growth)
        // HEAPU8 is always the current view of memory
        M.HEAPU8.set(pixels, this._heapPtr);

        // Call C function
        const resultPtr = window.AsciiModule._processor_process_frame(
            this._ptr,
            this._heapPtr,
            srcWidth,
            srcHeight,
            outWidth,
            outHeight
        );

        // Convert C string to JavaScript string
        return window.AsciiModule.UTF8ToString(resultPtr);
    }

    set_brightness(value) {
        window.AsciiModule._processor_set_brightness(this._ptr, value);
    }

    get_brightness() {
        return window.AsciiModule._processor_get_brightness(this._ptr);
    }

    set_contrast(value) {
        window.AsciiModule._processor_set_contrast(this._ptr, value);
    }

    get_contrast() {
        return window.AsciiModule._processor_get_contrast(this._ptr);
    }

    set_use_detailed_ramp(value) {
        window.AsciiModule._processor_set_use_detailed_ramp(this._ptr, value ? 1 : 0);
    }

    toggle_ramp() {
        window.AsciiModule._processor_toggle_ramp(this._ptr);
    }

    set_invert(value) {
        window.AsciiModule._processor_set_invert(this._ptr, value ? 1 : 0);
    }

    toggle_invert() {
        window.AsciiModule._processor_toggle_invert(this._ptr);
    }

    reset() {
        window.AsciiModule._processor_reset(this._ptr);
    }

    get_status(width, height) {
        const resultPtr = window.AsciiModule._processor_get_status(this._ptr, width, height);
        return window.AsciiModule.UTF8ToString(resultPtr);
    }

    // Clean up resources
    free() {
        if (this._heapPtr) {
            window.AsciiModule._free(this._heapPtr);
            this._heapPtr = null;
        }
        if (this._ptr) {
            window.AsciiModule._processor_free(this._ptr);
            this._ptr = null;
        }
    }
}

// Initialize the WASM module
// Returns a promise that resolves when Module is ready
let moduleReady = null;

function isModuleReady() {
    return typeof window.AsciiModule !== 'undefined' &&
           window.AsciiModule._processor_new &&
           window.AsciiModule._malloc &&
           (window.AsciiModule.wasmMemory || window.AsciiModule.HEAPU8) &&
           window.AsciiModule.calledRun;
}

export function initWasm() {
    if (moduleReady) return moduleReady;

    moduleReady = new Promise((resolve, reject) => {
        // Check if Module already exists and is ready
        if (isModuleReady()) {
            resolve();
            return;
        }

        // Wait for Module to be ready via onRuntimeInitialized
        if (typeof window.AsciiModule !== 'undefined') {
            const existingCallback = window.AsciiModule.onRuntimeInitialized;
            window.AsciiModule.onRuntimeInitialized = function() {
                if (existingCallback) existingCallback();
                // Small delay to ensure all exports are ready
                setTimeout(resolve, 10);
            };

            // If already initialized
            if (window.AsciiModule.calledRun && isModuleReady()) {
                resolve();
            }
        } else {
            // Module doesn't exist, wait for script to load
            const checkInterval = setInterval(() => {
                if (isModuleReady()) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 50);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('WASM module load timeout'));
            }, 10000);
        }
    });

    return moduleReady;
}

// Default export for convenience
export default { AsciiProcessor, initWasm };
