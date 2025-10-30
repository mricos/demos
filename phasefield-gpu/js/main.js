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
    const LightPuck = window.FP.LightPuck;

    let canvas, ctx;
    let mouseDown = false;
    let mouseDownPos = null;
    let mouseDownTime = 0;

    function init() {
        // Load saved configuration from localStorage
        const loaded = Config.loadFromLocalStorage();
        if (loaded) {
            console.log('[Main] Loaded saved configuration from localStorage');
        }

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
        const triad = Palette.computeDualTriad(startColor);
        document.getElementById('color-start').value = triad.start;
        document.getElementById('color-mid').value = triad.mid;
        document.getElementById('color-end').value = triad.end;

        // Apply moderate desaturation for toned-down look
        Config.params.finalDesaturation = 30;
        document.getElementById('final-desaturation').value = 30;
        document.getElementById('desat-val').textContent = '30%';

        // Load the custom palette with triadic colors
        Palette.loadCustomPalette();

        // Initialize virtual gamepad bridge
        if (window.Gamepad && window.Gamepad.VirtualBridge) {
            window.Gamepad.VirtualBridge.init();
            console.log('[Main] Virtual gamepad bridge initialized');
        }

        // Initialize gamepad
        Gamepad.loadGamepadConfig();
        Gamepad.setupEventListeners();
        Gamepad.updateUI();

        // Setup mouse controls for light pucks
        setupMouseControls();

        // Initialize wave sources
        Field.generateWaveSources(Config.params.sources);

        // Initialize compute engine (start with CPU mode)
        const capabilities = ComputeEngine.detectCapabilities();
        console.log('GPU capabilities:', capabilities);
        ComputeEngine.setMode(ComputeEngine.MODES.CPU, canvas);

        // FORCE CLEAR: Remove ALL optical elements on startup
        // This ensures no persistent rectangles/barriers from previous sessions
        Optics.clearElements();

        // Also clear any saved elements from localStorage
        localStorage.removeItem('phaseFieldElements');

        console.log('[Main] FORCED CLEAR: All optical elements removed on startup');
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

        // Update light pucks
        LightPuck.update(canvas);

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
                dualPalette: Config.state.dualPalette,
                resolution: Config.params.resolution,
                resolution2: Config.params.resolution2,
                blend: Config.params.blend,
                mode: Config.params.pixelatorMode,
                finalDesaturation: Config.params.finalDesaturation,
                finalBrightness: Config.params.finalBrightness
            };

            // Render using current engine (CPU or GPU)
            // Light pucks are now drawn inside engine.render() to avoid clearing issues
            engine.render(params);
        } else {
            // Fallback: use old rendering code
            Renderer.render();

            // Draw light pucks for CPU mode
            const overlayCanvas = document.getElementById('overlay-canvas');
            if (overlayCanvas) {
                const overlayCtx = overlayCanvas.getContext('2d');
                LightPuck.draw(overlayCtx);
            }
        }

        // Update time
        Config.performance.time += Config.params.speed;
        Config.performance.frameCount++;

        // Update performance metrics
        const frameTime = performance.now() - frameStartTime;
        Renderer.updatePerformanceMetrics(frameTime);

        requestAnimationFrame(animate);
    }

    /**
     * Setup mouse controls for launching light pucks
     * Click and drag to set direction and power
     */
    function setupMouseControls() {
        const overlayCanvas = document.getElementById('overlay-canvas') || canvas;

        overlayCanvas.addEventListener('mousedown', (e) => {
            const rect = overlayCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            mouseDown = true;
            mouseDownPos = { x, y };
            mouseDownTime = performance.now();

            // Show ghost puck at mouse position
            LightPuck.setGhostPuck(x, y);
        });

        overlayCanvas.addEventListener('mousemove', (e) => {
            if (!mouseDown) return;

            const rect = overlayCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Update ghost puck position to show drag direction
            LightPuck.setGhostPuck(x, y);
        });

        overlayCanvas.addEventListener('mouseup', (e) => {
            if (!mouseDown) return;

            const rect = overlayCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Calculate velocity from drag
            const dx = x - mouseDownPos.x;
            const dy = y - mouseDownPos.y;
            const holdTime = performance.now() - mouseDownTime;

            // Power based on drag distance and hold time
            const dragDist = Math.sqrt(dx * dx + dy * dy);
            const power = Math.min(1, dragDist / 100);  // 0 to 1 based on drag distance
            const speed = 2 + power * 8;  // 2 to 10 pixels per frame

            // Launch from mouse down position in drag direction
            const angle = Math.atan2(dy, dx);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            LightPuck.launchPuck(mouseDownPos.x, mouseDownPos.y, vx, vy);
            console.log(`[Main] Launched light puck from mouse: (${mouseDownPos.x.toFixed(0)}, ${mouseDownPos.y.toFixed(0)}) vel: (${vx.toFixed(2)}, ${vy.toFixed(2)})`);

            mouseDown = false;
            mouseDownPos = null;
            LightPuck.clearGhostPuck();
        });

        overlayCanvas.addEventListener('mouseleave', () => {
            if (mouseDown) {
                LightPuck.clearGhostPuck();
                mouseDown = false;
                mouseDownPos = null;
            }
        });

        console.log('[Main] Mouse controls initialized - Click and drag to launch light pucks!');
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
