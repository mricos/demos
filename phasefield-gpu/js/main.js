/**
 * Phase Field Main Module
 * Entry point and animation loop
 */

window.FP = window.FP || {};

window.FP.Main = (function() {
    'use strict';

    const Config = window.FP.Config;
    const Renderer = window.FP.Renderer;
    const Field = window.FP.Field;
    const Optics = window.FP.Optics;
    const Matter = window.FP.Matter;
    const Gamepad = window.FP.Gamepad;
    const Palette = window.FP.Palette;
    const UI = window.FP.UI;
    const ComputeEngine = window.FP.ComputeEngine;

    let canvas, ctx;

    function init() {
        // Get canvas and context
        canvas = document.getElementById('canvas');
        ctx = canvas.getContext('2d');

        // Set canvas references in modules
        Renderer.setCanvas(canvas);
        Field.setCanvas(canvas);

        // Initialize canvas size
        Renderer.resizeCanvas();
        window.addEventListener('resize', Renderer.resizeCanvas);

        // Initialize UI
        UI.setupCollapsible();
        UI.setupEventListeners();

        // Initialize palette with triad-harmony and desaturation
        Palette.initializePaletteGrid();

        // Generate triadic color harmony
        const startColor = '#0066ff';  // Vibrant blue
        const triad = Palette.computeAdjointTriad(startColor);
        document.getElementById('color-start').value = triad.start;
        document.getElementById('color-mid').value = triad.mid;
        document.getElementById('color-end').value = triad.end;

        // Apply moderate desaturation for toned-down look
        Config.params.finalDesaturation = 30;
        document.getElementById('final-desaturation').value = 30;
        document.getElementById('desat-val').textContent = '30%';

        // Load the custom palette with triadic colors
        Palette.loadCustomPalette();

        // Initialize gamepad
        Gamepad.loadGamepadConfig();
        Gamepad.setupEventListeners();
        Gamepad.updateUI();

        // Initialize wave sources
        Field.generateWaveSources(Config.params.sources);

        // Initialize compute engine (start with CPU mode)
        const capabilities = ComputeEngine.detectCapabilities();
        console.log('GPU capabilities:', capabilities);
        ComputeEngine.setMode(ComputeEngine.MODES.CPU, canvas);

        // Start with no optical elements - user can add them with gamepad/UI
        console.log('Phase Field initialized with FP modular architecture');
        console.log('- FP.Matter: Optical elements');
        console.log('- FP.Optics: Physics calculations');
        console.log('- FP.Field: Wave field');
        console.log('- FP.Renderer: Canvas rendering');
        console.log('- FP.ComputeEngine: Dual-mode rendering');

        // Start animation loop
        animate();
    }

    function animate() {
        const frameStartTime = performance.now();

        // Poll gamepad
        Gamepad.poll();

        // Get current compute engine and render
        const engine = ComputeEngine.getEngine();
        if (engine) {
            // Prepare render parameters
            const params = {
                time: Config.performance.time,
                frequency: Config.params.frequency,
                amplitude: Config.params.amplitude,
                distortion: Config.params.distortion,
                sources: Field.getWaveSources(),
                elements: Optics.getAllElements(),
                palette: Config.state.currentPalette,
                adjointPalette: Config.state.adjointPalette,
                resolution: Config.params.resolution,
                resolution2: Config.params.resolution2,
                blend: Config.params.blend,
                mode: Config.params.pixelatorMode,
                finalDesaturation: Config.params.finalDesaturation,
                finalBrightness: Config.params.finalBrightness
            };

            // Render using current engine (CPU or GPU)
            engine.render(params);
        } else {
            // Fallback: use old rendering code
            Renderer.render();
        }

        // Update time
        Config.performance.time += Config.params.speed;
        Config.performance.frameCount++;

        // Update performance metrics
        const frameTime = performance.now() - frameStartTime;
        Renderer.updatePerformanceMetrics(frameTime);

        requestAnimationFrame(animate);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        init
    };
})();
