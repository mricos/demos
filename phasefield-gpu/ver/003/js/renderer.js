/**
 * Phase Field Renderer Module
 * Handles all rendering operations including watchdog and performance monitoring
 */

window.PF = window.PF || {};

window.PF.Renderer = (function() {
    'use strict';

    const Config = window.PF.Config;
    const Wave = window.PF.Wave;
    const Palette = window.PF.Palette;
    let canvas, ctx;

    function setCanvas(canvasElement) {
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
    }

    function resizeCanvas() {
        const container = document.getElementById('canvas-container');
        canvas.width = Math.min(800, container.clientWidth - 40);
        canvas.height = Math.min(800, container.clientHeight - 40);
    }

    function renderAtResolution(imageData, resolutionValue, mode, opacity = 1, palette = null) {
        const data = imageData.data;
        const divisions = Config.getGridDivisions(resolutionValue);
        const blockSize = Math.ceil(canvas.width / divisions);

        // Use specified palette or default to main palette
        const usePalette = palette || Config.state.currentPalette;
        if (!usePalette || usePalette.length === 0) return;

        // Track wave value range for this frame
        let frameMin = Infinity;
        let frameMax = -Infinity;
        const waveValues = [];

        // First pass: collect all wave values
        for (let gridY = 0; gridY < divisions; gridY++) {
            for (let gridX = 0; gridX < divisions; gridX++) {
                const blockX = gridX * blockSize;
                const blockY = gridY * blockSize;
                const waveValue = Wave.calculateBlockValue(blockX, blockY, blockSize, mode);
                waveValues.push({x: blockX, y: blockY, value: waveValue});
                frameMin = Math.min(frameMin, waveValue);
                frameMax = Math.max(frameMax, waveValue);
            }
        }

        // Update global range (with smoothing)
        Config.range.updateCounter++;
        if (Config.range.updateCounter % 10 === 0) {
            Config.range.waveMin = Config.range.waveMin * 0.9 + frameMin * 0.1;
            Config.range.waveMax = Config.range.waveMax * 0.9 + frameMax * 0.1;
        }

        // Use actual range or fallback
        const rangeMin = Math.abs(Config.range.waveMax - Config.range.waveMin) > 0.1 ?
            Config.range.waveMin : frameMin;
        const rangeMax = Math.abs(Config.range.waveMax - Config.range.waveMin) > 0.1 ?
            Config.range.waveMax : frameMax;
        const rangeDelta = Math.max(0.1, rangeMax - rangeMin);

        // Second pass: render with normalized values
        for (const {x: blockX, y: blockY, value: waveValue} of waveValues) {
            // Normalize to 0-1 range
            const normalized = (waveValue - rangeMin) / rangeDelta;

            // Map to palette with color cycling
            const palettePos = (normalized * Config.params.colorCycle) % 1.0;
            const colorIndex = Math.floor(palettePos * (usePalette.length - 1));
            const color = usePalette[colorIndex] || {r: 0, g: 0, b: 0};

            // Fill block
            for (let dy = 0; dy < blockSize; dy++) {
                for (let dx = 0; dx < blockSize; dx++) {
                    const x = blockX + dx;
                    const y = blockY + dy;
                    if (x < canvas.width && y < canvas.height) {
                        const index = (y * canvas.width + x) * 4;
                        if (opacity < 1) {
                            // Blend with existing
                            data[index] = Math.round(data[index] * (1 - opacity) + color.r * opacity);
                            data[index + 1] = Math.round(data[index + 1] * (1 - opacity) + color.g * opacity);
                            data[index + 2] = Math.round(data[index + 2] * (1 - opacity) + color.b * opacity);
                        } else {
                            data[index] = color.r;
                            data[index + 1] = color.g;
                            data[index + 2] = color.b;
                        }
                        data[index + 3] = 255;
                    }
                }
            }
        }
    }

    function applyFinalGainStage(imageData) {
        // Apply desaturation and brightness adjustments to the final composed image
        const data = imageData.data;
        const desat = Config.params.finalDesaturation;
        const brightness = Config.params.finalBrightness;

        // Only apply if there are actual changes
        if (desat === 0 && brightness === 50) {
            return;
        }

        for (let i = 0; i < data.length; i += 4) {
            let color = {
                r: data[i],
                g: data[i + 1],
                b: data[i + 2]
            };

            // Apply desaturation
            if (desat > 0) {
                color = Palette.applyDesaturation(color, desat);
            }

            // Apply brightness
            if (brightness !== 50) {
                color = Palette.applyBrightness(color, brightness);
            }

            data[i] = color.r;
            data[i + 1] = color.g;
            data[i + 2] = color.b;
        }
    }

    function render() {
        const imageData = ctx.createImageData(canvas.width, canvas.height);

        // Render primary resolution with main palette
        renderAtResolution(imageData, Config.params.resolution, Config.params.pixelatorMode, 1, Config.state.currentPalette);

        // Render dual resolution with adjoint palette if enabled
        if (Config.params.resolution2 > 0) {
            const blendAmount = Config.params.blend / 100;
            // Use adjoint palette if it exists and has colors, otherwise use main palette
            const dualPalette = (Config.state.adjointPalette && Config.state.adjointPalette.length > 0)
                ? Config.state.adjointPalette
                : Config.state.currentPalette;
            renderAtResolution(imageData, Config.params.resolution2, Config.params.pixelatorMode, blendAmount, dualPalette);
        }

        // Apply final gain stage (desaturation and brightness)
        applyFinalGainStage(imageData);

        ctx.putImageData(imageData, 0, 0);
    }

    function updatePerformanceMetrics(frameTime) {
        const perf = Config.performance;

        // Watchdog: Monitor frame time and adjust quality
        if (frameTime > perf.MAX_FRAME_TIME) {
            perf.slowFrameCount++;
            if (perf.slowFrameCount > 3) {
                perf.adaptiveQuality = Math.max(0.2, perf.adaptiveQuality * 0.8);
                console.warn(`Frame too slow (${frameTime.toFixed(1)}ms), reducing quality to ${(perf.adaptiveQuality * 100).toFixed(0)}%`);
                perf.slowFrameCount = 0;
            }
        } else if (frameTime < perf.MAX_FRAME_TIME * 0.5 && perf.adaptiveQuality < 1.0) {
            // Gradually restore quality if frames are fast
            perf.adaptiveQuality = Math.min(1.0, perf.adaptiveQuality * 1.05);
            perf.slowFrameCount = 0;
        }

        // Update FPS display
        const now = window.performance.now();
        if (now - perf.lastTime >= 1000) {
            perf.fps = perf.frameCount;
            perf.frameCount = 0;
            perf.lastTime = now;
            document.getElementById('fps').textContent = perf.fps + (perf.adaptiveQuality < 1.0 ? ' ⚠' : '');
        }
        document.getElementById('frame').textContent = Math.floor(perf.time * 100);
    }

    return {
        setCanvas,
        resizeCanvas,
        render,
        updatePerformanceMetrics
    };
})();
