/**
 * Phase Field Configuration Module
 * Contains all parameters, constants, and preset data
 */

window.PF = window.PF || {};

window.PF.Config = (function() {
    'use strict';

    // Main parameters
    const params = {
        frequency: 2,
        amplitude: 40,
        speed: 0.02,
        sources: 2,
        resolution: 2,
        resolution2: 0,
        blend: 50,
        pixelatorMode: 'avg',
        distortion: 1,
        paletteSteps: 256,
        colorCycle: 1,

        // Color palette parameters
        colorBalance: 50,         // Balance between colors (0-100)
        dynamicRange: 256,        // Number of discrete color steps (starts at full resolution)

        // Adjoint palette parameters
        adjointMode: 'complementary',  // complementary, desat, inverse, triad
        adjointTriadHue: 120,     // Hue for triad mode (0-360)
        adjointEnabled: false,    // Whether to use adjoint palette

        // Final gain stage (post-processing)
        finalDesaturation: 0,     // 0-100, amount to desaturate final output
        finalBrightness: 50       // 0-100, overall brightness adjustment
    };

    // Performance tracking
    const performance = {
        time: 0,
        frameCount: 0,
        lastTime: window.performance.now(),
        fps: 0,
        adaptiveQuality: 1.0,
        slowFrameCount: 0,
        MAX_FRAME_TIME: 100
    };

    // Dynamic range tracking
    const range = {
        waveMin: 0,
        waveMax: 0,
        updateCounter: 0
    };

    // Preset palettes
    const presetPalettes = [
        {name: 'Cyber', colors: ['#0000ff', '#00ffff', '#ffff00', '#ff00ff']},
        {name: 'Fire', colors: ['#000000', '#ff0000', '#ff8800', '#ffff00']},
        {name: 'Ocean', colors: ['#001a33', '#0066cc', '#00ccff', '#00ffaa']},
        {name: 'Sunset', colors: ['#1a0033', '#cc0099', '#ff6600', '#ffcc00']},
        {name: 'Forest', colors: ['#001a00', '#004400', '#00aa00', '#88ff88']},
        {name: 'Purple', colors: ['#1a001a', '#6600cc', '#cc00ff', '#ff66ff']},
        {name: 'Neon', colors: ['#ff00ff', '#00ffff', '#ffff00', '#ff00ff']},
        {name: 'Grayscale', colors: ['#000000', '#444444', '#888888', '#ffffff']}
    ];

    // State
    const state = {
        currentPalette: [],
        adjointPalette: [],
        currentPresetIndex: 0,
        waveSources: []
    };

    return {
        params,
        performance,
        range,
        presetPalettes,
        state,

        // Helper functions
        getGridDivisions(sliderValue) {
            if (sliderValue === 0) return 1;
            return Math.pow(2, sliderValue);
        },

        formatResolution(sliderValue) {
            const divisions = this.getGridDivisions(sliderValue);
            if (divisions === 1) return '1px';
            return `${divisions}×${divisions}`;
        }
    };
})();
