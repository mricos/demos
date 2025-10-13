/**
 * Phase Field Module
 * Handles wave field calculations with proper optical physics
 */

window.FP = window.FP || {};

window.FP.Field = (function() {
    'use strict';

    const Config = window.FP.Config;
    const Optics = window.FP.Optics;

    let canvas, ctx;
    let waveSources = [];

    /**
     * Set canvas reference
     */
    function setCanvas(canvasElement) {
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
    }

    /**
     * Generate wave sources in a circular pattern
     */
    function generateWaveSources(count) {
        waveSources = [];
        console.log(`Generating ${count} wave sources on canvas ${canvas.width}x${canvas.height}`);

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = Math.min(canvas.width, canvas.height) * 0.3;
            const source = {
                x: canvas.width / 2 + Math.cos(angle) * radius,
                y: canvas.height / 2 + Math.sin(angle) * radius,
                phase: i * Math.PI / count
            };
            console.log(`  Source ${i}: x=${source.x.toFixed(1)}, y=${source.y.toFixed(1)}, angle=${(angle * 180 / Math.PI).toFixed(1)}°`);
            waveSources.push(source);
        }

        return waveSources;
    }

    /**
     * Get wave sources
     */
    function getWaveSources() {
        return waveSources;
    }

    /**
     * Set wave sources
     */
    function setWaveSources(sources) {
        waveSources = sources;
    }

    /**
     * Add a wave source
     */
    function addSource(x, y, phase = 0) {
        waveSources.push({ x, y, phase });
        return waveSources.length - 1;
    }

    /**
     * Remove a wave source
     */
    function removeSource(index) {
        if (index >= 0 && index < waveSources.length) {
            waveSources.splice(index, 1);
        }
    }

    /**
     * Move a wave source
     */
    function moveSource(index, x, y) {
        if (waveSources[index]) {
            waveSources[index].x = x;
            waveSources[index].y = y;
        }
    }

    /**
     * Get a wave source
     */
    function getSource(index) {
        return waveSources[index];
    }

    /**
     * Get the number of wave sources
     */
    function getSourceCount() {
        return waveSources.length;
    }

    /**
     * Calculate wave field value at a point (x, y)
     * This properly handles optical elements through the Optics module
     */
    function calculateWaveValue(x, y, params) {
        // Quick check: if point is inside matter, field is zero
        if (Optics.isPointInMatter(x, y)) {
            return 0;
        }

        let sum = 0;
        const { frequency, amplitude, distortion, time } = params;

        for (const source of waveSources) {
            const dx = x - source.x;
            const dy = y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Calculate base phase
            const basePhase = distance * frequency * 0.05 - time + source.phase;

            // Check optical path - includes blocking and phase modifications from lenses
            const optical = Optics.calculateOpticalPath(
                source.x, source.y,
                x, y,
                basePhase
            );

            // If blocked, this source contributes nothing
            if (optical.amplitude === 0) {
                continue;
            }

            // Calculate wave with optical modifications
            const wave = Math.sin(optical.phase) * amplitude * optical.amplitude;

            // Apply distance falloff
            const falloff = Math.pow(distance * 0.01 + 1, distortion);
            sum += wave / falloff;
        }

        return sum;
    }

    /**
     * Calculate wave value for a block of pixels
     * Used for downsampled rendering
     */
    function calculateBlockValue(blockX, blockY, blockSize, mode, params, adaptiveQuality) {
        if (blockSize === 1) {
            // Single pixel mode - sample across entire canvas
            let sum = 0;
            const samples = Math.max(5, Math.floor(20 * adaptiveQuality));

            for (let sy = 0; sy < samples; sy++) {
                for (let sx = 0; sx < samples; sx++) {
                    const x = (sx / samples) * canvas.width;
                    const y = (sy / samples) * canvas.height;
                    sum += calculateWaveValue(x, y, params);
                }
            }
            return sum / (samples * samples);
        }

        // Multi-pixel sampling within block
        const baseSampleRate = Math.max(1, Math.floor(blockSize / 4));
        const sampleRate = Math.max(1, Math.floor(baseSampleRate / adaptiveQuality));
        const values = [];

        for (let dy = 0; dy < blockSize; dy += sampleRate) {
            for (let dx = 0; dx < blockSize; dx += sampleRate) {
                const x = blockX + dx;
                const y = blockY + dy;

                if (x < canvas.width && y < canvas.height) {
                    values.push(calculateWaveValue(x, y, params));
                }
            }
        }

        if (values.length === 0) return 0;

        // Apply aggregation mode
        switch (mode) {
            case 'min':
                return Math.min(...values);
            case 'max':
                return Math.max(...values);
            case 'avg':
            default:
                return values.reduce((a, b) => a + b, 0) / values.length;
        }
    }

    /**
     * Pre-compute field values for an entire grid
     * Returns a 2D array of wave values
     */
    function computeFieldGrid(divisions, mode, params, adaptiveQuality) {
        const blockSize = Math.ceil(canvas.width / divisions);
        const grid = [];

        for (let gridY = 0; gridY < divisions; gridY++) {
            const row = [];
            for (let gridX = 0; gridX < divisions; gridX++) {
                const blockX = gridX * blockSize;
                const blockY = gridY * blockSize;
                const value = calculateBlockValue(blockX, blockY, blockSize, mode, params, adaptiveQuality);
                row.push(value);
            }
            grid.push(row);
        }

        return grid;
    }

    /**
     * Calculate wave statistics (min/max) for normalization
     */
    function calculateFieldStatistics(divisions, mode, params, adaptiveQuality) {
        const blockSize = Math.ceil(canvas.width / divisions);
        let min = Infinity;
        let max = -Infinity;

        for (let gridY = 0; gridY < divisions; gridY++) {
            for (let gridX = 0; gridX < divisions; gridX++) {
                const blockX = gridX * blockSize;
                const blockY = gridY * blockSize;
                const value = calculateBlockValue(blockX, blockY, blockSize, mode, params, adaptiveQuality);
                min = Math.min(min, value);
                max = Math.max(max, value);
            }
        }

        return { min, max };
    }

    return {
        // Setup
        setCanvas,

        // Wave sources
        generateWaveSources,
        getWaveSources,
        setWaveSources,
        addSource,
        removeSource,
        moveSource,
        getSource,
        getSourceCount,

        // Field calculations
        calculateWaveValue,
        calculateBlockValue,
        computeFieldGrid,
        calculateFieldStatistics
    };
})();
