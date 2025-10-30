/**
 * Phase Field Configuration Module
 * Contains all parameters, constants, and preset data
 */

window.FP = window.FP || {};

window.FP.Config = (function() {
    'use strict';

    // Main parameters
    const params = {
        frequency: 2,
        amplitude: 40,
        speed: 0.02,
        sources: 2,
        resolution: 6,  // 2^6 = 64x64
        resolution2: 0,
        blend: 50,
        blendMode: 'linear',      // linear, multiply, screen, overlay
        pixelatorMode: 'avg',
        distortion: 1,
        paletteSteps: 256,
        colorCycle: 1,

        // Color palette parameters
        colorBalance: 50,         // Balance between colors (0-100)
        dynamicRange: 256,        // Number of discrete color steps (starts at full resolution)

        // Dual palette parameters
        dualMode: 'complementary',  // complementary, desat, inverse, triad
        dualTriadHue: 120,     // Hue for triad mode (0-360)
        dualEnabled: false,    // Whether to use dual palette

        // Final gain stage (post-processing)
        finalDesaturation: 0,     // 0-100, amount to desaturate final output
        finalBrightness: 50,      // 0-100, overall brightness adjustment

        // Diffraction control
        // Controls how artfully waves bend around obstacles:
        //   0 = Sharp shadows (geometric optics, minimal diffraction)
        //  50 = Balanced (moderate wave-like behavior)
        // 100 = Maximum artistic diffraction (waves spread dramatically around obstacles)
        diffractionStrength: 70   // 0-100, increased default from 50 to 70 for more visible effects
    };

    // Shared physics constants (used by both CPU and WebGL engines)
    const physics = {
        // Wave propagation
        frequencyScale: 0.05,  // Spatial frequency scaling factor (distance * freq * scale)

        // Diffraction parameters
        // IMPORTANT: diffractionLeakage is now scaled by diffractionStrength in the shader
        // This base value ensures minimal leakage even at low diffraction settings
        diffractionLeakage: 0.001,   // Base diffraction around barriers (0.1%, increased from 0.01%)
        edgeDiffractionRange: 5.0,   // Range in wavelengths for edge diffraction effects

        // Falloff and attenuation
        distanceFalloffBase: 0.01    // Base for distance falloff calculation
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

    // Barrier configuration (defaults for new barriers)
    const particleConfig = {
        wallLength: 200,        // Total length of barrier (fixed)
        particleSize: 8,        // Size of material brick segments (visual)
        apertureGap: 80,        // Width of each slit
        apertureCount: 0,       // Number of slits: 0=solid barrier, 1+=apertures middle-out
        wallThickness: 8,       // Thickness of barrier material
        lensCurvature: 0,       // DEPRECATED - keeping for compatibility
        wallCurvature: 0,       // Curvature focal length: 0=flat, +ve=concave, -ve=convex
        reflectionCoefficient: 0.5  // 0=blackbody (black), 1=mirror (white)
    };

    // State
    const state = {
        currentPalette: [],
        dualPalette: [],
        currentPresetIndex: 0,

        // Gamepad mode state
        controlMode: 'wave',  // 'wave' or 'matter'
        ghostSource: null,  // {x, y, phase} when in particle mode

        // Ghost optical element for placement
        ghostElement: null,  // Optical element being placed
        editingElementIndex: -1  // Index of element being edited, -1 if creating new
    };

    /**
     * Save all parameters to localStorage
     */
    function saveToLocalStorage() {
        try {
            const saveData = {
                params: {
                    frequency: params.frequency,
                    amplitude: params.amplitude,
                    speed: params.speed,
                    sources: params.sources,
                    resolution: params.resolution,
                    resolution2: params.resolution2,
                    blend: params.blend,
                    blendMode: params.blendMode,
                    pixelatorMode: params.pixelatorMode,
                    distortion: params.distortion,
                    paletteSteps: params.paletteSteps,
                    colorCycle: params.colorCycle,
                    colorBalance: params.colorBalance,
                    dynamicRange: params.dynamicRange,
                    dualMode: params.dualMode,
                    dualTriadHue: params.dualTriadHue,
                    dualEnabled: params.dualEnabled,
                    finalDesaturation: params.finalDesaturation,
                    finalBrightness: params.finalBrightness,
                    diffractionStrength: params.diffractionStrength
                },
                performance: {
                    adaptiveQuality: performance.adaptiveQuality,
                    MAX_FRAME_TIME: performance.MAX_FRAME_TIME
                },
                particleConfig: {
                    wallLength: particleConfig.wallLength,
                    particleSize: particleConfig.particleSize,
                    apertureGap: particleConfig.apertureGap,
                    apertureCount: particleConfig.apertureCount,
                    wallThickness: particleConfig.wallThickness,
                    wallCurvature: particleConfig.wallCurvature,
                    reflectionCoefficient: particleConfig.reflectionCoefficient
                },
                state: {
                    currentPresetIndex: state.currentPresetIndex
                }
            };
            localStorage.setItem('phasefield-config', JSON.stringify(saveData));
            console.log('[Config] Saved to localStorage');
            return true;
        } catch (e) {
            console.error('[Config] Failed to save to localStorage:', e);
            return false;
        }
    }

    /**
     * Load parameters from localStorage
     */
    function loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('phasefield-config');
            if (!saved) {
                console.log('[Config] No saved data in localStorage');
                return false;
            }

            const data = JSON.parse(saved);

            // Restore params
            if (data.params) {
                Object.assign(params, data.params);
            }

            // Restore performance settings
            if (data.performance) {
                Object.assign(performance, data.performance);
            }

            // Restore particle/barrier config
            if (data.particleConfig) {
                Object.assign(particleConfig, data.particleConfig);
            }

            // Restore state
            if (data.state) {
                state.currentPresetIndex = data.state.currentPresetIndex || 0;
            }

            console.log('[Config] Loaded from localStorage');
            return true;
        } catch (e) {
            console.error('[Config] Failed to load from localStorage:', e);
            return false;
        }
    }

    /**
     * Clear localStorage
     */
    function clearLocalStorage() {
        try {
            localStorage.removeItem('phasefield-config');
            console.log('[Config] Cleared localStorage');
            return true;
        } catch (e) {
            console.error('[Config] Failed to clear localStorage:', e);
            return false;
        }
    }

    return {
        params,
        physics,
        performance,
        range,
        presetPalettes,
        state,
        particleConfig,

        // Helper functions
        getGridDivisions(sliderValue) {
            if (sliderValue === 0) return 1;
            return Math.pow(2, sliderValue);
        },

        formatResolution(sliderValue) {
            const divisions = this.getGridDivisions(sliderValue);
            if (divisions === 1) return '1px';
            return `${divisions}×${divisions}`;
        },

        // localStorage functions
        saveToLocalStorage,
        loadFromLocalStorage,
        clearLocalStorage
    };
})();
