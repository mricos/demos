/**
 * Phase Field Main Module
 * Entry point and animation loop
 */

window.PF = window.PF || {};

window.PF.Main = (function() {
    'use strict';

    const Config = window.PF.Config;
    const Renderer = window.PF.Renderer;
    const Wave = window.PF.Wave;
    const Gamepad = window.PF.Gamepad;
    const Palette = window.PF.Palette;
    const UI = window.PF.UI;

    let canvas, ctx;

    function init() {
        // Get canvas and context
        canvas = document.getElementById('canvas');
        ctx = canvas.getContext('2d');

        // Set canvas references in modules
        Renderer.setCanvas(canvas);
        Wave.setCanvas(canvas);

        // Initialize canvas size
        Renderer.resizeCanvas();
        window.addEventListener('resize', Renderer.resizeCanvas);

        // Initialize UI
        UI.setupCollapsible();
        UI.setupEventListeners();

        // Initialize palette
        Palette.initializePaletteGrid();
        Palette.loadPresetPalette(0);

        // Initialize gamepad
        Gamepad.loadGamepadMap();
        Gamepad.populateGamepadDropdowns();
        Gamepad.setupEventListeners();

        // Initialize wave sources
        Wave.generateWaveSources();

        // Start animation loop
        animate();
    }

    function animate() {
        const frameStartTime = performance.now();

        // Poll gamepad
        Gamepad.poll();

        // Render frame
        Renderer.render();

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
