/**
 * Compute Engine - Mode selector for CPU/GPU rendering
 * Manages switching between different compute modes and capability detection
 */
window.FP = window.FP || {};

window.FP.ComputeEngine = (function() {
    'use strict';

    const MODES = {
        CPU: 'cpu',
        WEBGL: 'webgl',
        WEBGPU: 'webgpu'
    };

    let currentMode = MODES.CPU;
    let currentEngine = null;
    let capabilities = null;

    /**
     * Recreate canvas element (needed when switching context types)
     * Canvas can only have one context type - can't switch from 2D to WebGL
     */
    function recreateCanvas(oldCanvas) {
        const parent = oldCanvas.parentNode;
        const newCanvas = document.createElement('canvas');

        // Copy attributes
        newCanvas.id = oldCanvas.id;
        newCanvas.width = oldCanvas.width;
        newCanvas.height = oldCanvas.height;
        newCanvas.className = oldCanvas.className;

        // Replace in DOM
        parent.replaceChild(newCanvas, oldCanvas);

        console.log('[ComputeEngine] Canvas recreated for context switch');
        return newCanvas;
    }

    /**
     * Detect GPU capabilities
     */
    function detectCapabilities() {
        if (capabilities) return capabilities;

        const testCanvas = document.createElement('canvas');

        capabilities = {
            cpu: true,
            webgl: !!testCanvas.getContext('webgl2'),
            webgpu: !!navigator.gpu
        };

        console.log('[ComputeEngine] Detected capabilities:', capabilities);

        // Log WebGL info if available
        if (capabilities.webgl) {
            const gl = testCanvas.getContext('webgl2');
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                console.log('[ComputeEngine] WebGL Renderer:', renderer);
            }
        }

        return capabilities;
    }

    /**
     * Set compute mode
     */
    function setMode(mode, canvas) {
        const caps = detectCapabilities();

        // Validate mode is supported
        if (mode === MODES.WEBGL && !caps.webgl) {
            console.warn('[ComputeEngine] WebGL not supported, falling back to CPU');
            mode = MODES.CPU;
        }
        if (mode === MODES.WEBGPU && !caps.webgpu) {
            console.warn('[ComputeEngine] WebGPU not supported, falling back to CPU');
            mode = MODES.CPU;
        }

        // Cleanup old engine
        if (currentEngine && currentEngine.cleanup) {
            try {
                currentEngine.cleanup();
            } catch (error) {
                console.error('[ComputeEngine] Error during cleanup:', error);
            }
        }

        // IMPORTANT: Canvas can only have ONE context type
        // If switching modes, we need a fresh canvas
        if (currentMode !== mode && currentEngine) {
            console.log('[ComputeEngine] Recreating canvas for context switch');
            const newCanvas = recreateCanvas(canvas);
            canvas = newCanvas;
        }

        // Initialize new engine
        currentMode = mode;

        try {
            switch (mode) {
                case MODES.WEBGL:
                    if (!window.FP.WebGLEngine) {
                        throw new Error('WebGLEngine not loaded');
                    }
                    currentEngine = new window.FP.WebGLEngine();
                    currentEngine.initialize(canvas);
                    break;

                case MODES.WEBGPU:
                    if (!window.FP.WebGPUEngine) {
                        throw new Error('WebGPUEngine not loaded');
                    }
                    currentEngine = new window.FP.WebGPUEngine();
                    // WebGPU init is async
                    currentEngine.initialize(canvas).catch(err => {
                        console.error('[ComputeEngine] WebGPU init failed:', err);
                        setMode(MODES.CPU, canvas);
                    });
                    break;

                default:
                    if (!window.FP.CPUEngine) {
                        throw new Error('CPUEngine not loaded');
                    }
                    currentEngine = new window.FP.CPUEngine();
                    currentEngine.initialize(canvas);
            }

            console.log(`[ComputeEngine] Switched to ${mode.toUpperCase()} mode`);
            return true;

        } catch (error) {
            console.error(`[ComputeEngine] Failed to initialize ${mode} mode:`, error);

            // Fall back to CPU
            if (mode !== MODES.CPU) {
                console.log('[ComputeEngine] Falling back to CPU mode');
                return setMode(MODES.CPU, canvas);
            }

            return false;
        }
    }

    /**
     * Get current engine
     */
    function getEngine() {
        return currentEngine;
    }

    /**
     * Get current mode
     */
    function getMode() {
        return currentMode;
    }

    /**
     * Get capabilities
     */
    function getCapabilities() {
        return detectCapabilities();
    }

    return {
        MODES,
        detectCapabilities,
        setMode,
        getEngine,
        getMode,
        getCapabilities
    };
})();
