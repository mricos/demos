/**
 * Phase Field Wave Module
 * Handles wave source generation and wave value calculations
 */

window.PF = window.PF || {};

window.PF.Wave = (function() {
    'use strict';

    const Config = window.PF.Config;
    let canvas, ctx;

    function setCanvas(canvasElement) {
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
    }

    function generateWaveSources() {
        Config.state.waveSources = [];
        const count = Config.params.sources;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = Math.min(canvas.width, canvas.height) * 0.3;
            Config.state.waveSources.push({
                x: canvas.width / 2 + Math.cos(angle) * radius,
                y: canvas.height / 2 + Math.sin(angle) * radius,
                phase: i * Math.PI / count
            });
        }
    }

    function calculateWaveValue(x, y) {
        let sum = 0;
        const { waveSources } = Config.state;
        const { frequency, amplitude, distortion } = Config.params;
        const { time } = Config.performance;

        for (const source of waveSources) {
            const dx = x - source.x;
            const dy = y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const wave = Math.sin(
                distance * frequency * 0.05 -
                time +
                source.phase
            ) * amplitude;

            sum += wave / Math.pow(distance * 0.01 + 1, distortion);
        }
        return sum;
    }

    function calculateBlockValue(blockX, blockY, blockSize, mode) {
        const { adaptiveQuality } = Config.performance;

        if (blockSize === 1) {
            // Single pixel mode - average the entire canvas
            let sum = 0;
            const samples = Math.max(5, Math.floor(20 * adaptiveQuality));
            for (let sy = 0; sy < samples; sy++) {
                for (let sx = 0; sx < samples; sx++) {
                    const x = (sx / samples) * canvas.width;
                    const y = (sy / samples) * canvas.height;
                    sum += calculateWaveValue(x, y);
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
                    values.push(calculateWaveValue(x, y));
                }
            }
        }

        if (values.length === 0) return 0;

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

    function moveSource(index, x, y) {
        if (Config.state.waveSources[index]) {
            Config.state.waveSources[index].x = x;
            Config.state.waveSources[index].y = y;
        }
    }

    function addSource(x, y, phase = 0) {
        Config.state.waveSources.push({ x, y, phase });
        Config.params.sources = Config.state.waveSources.length;
    }

    function removeSource(index) {
        if (index >= 0 && index < Config.state.waveSources.length) {
            Config.state.waveSources.splice(index, 1);
            Config.params.sources = Config.state.waveSources.length;
        }
    }

    function getSource(index) {
        return Config.state.waveSources[index];
    }

    function getSourceCount() {
        return Config.state.waveSources.length;
    }

    return {
        setCanvas,
        generateWaveSources,
        calculateWaveValue,
        calculateBlockValue,
        moveSource,
        addSource,
        removeSource,
        getSource,
        getSourceCount
    };
})();
