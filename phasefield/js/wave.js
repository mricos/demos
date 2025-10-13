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
            Config.state.waveSources.push(source);
        }
    }

    function rayIntersectsWall(sourceX, sourceY, pointX, pointY, wall) {
        // Check if ray from source to point intersects any particle in the wall
        const pc = Config.particleConfig;
        const halfLength = pc.wallLength / 2;
        const gap = pc.apertureGap;

        // Calculate how many particles per side
        const materialLength = pc.wallLength - gap;
        const particlesPerSide = Math.max(1, Math.floor(materialLength / (2 * pc.particleSize)));

        // Transform ray endpoints to wall's local coordinate system
        const cos = Math.cos(-wall.angle);
        const sin = Math.sin(-wall.angle);

        // Transform source point
        const dx1 = sourceX - wall.x;
        const dy1 = sourceY - wall.y;
        const localX1 = dx1 * cos - dy1 * sin;
        const localY1 = dx1 * sin + dy1 * cos;

        // Transform destination point
        const dx2 = pointX - wall.x;
        const dy2 = pointY - wall.y;
        const localX2 = dx2 * cos - dy2 * sin;
        const localY2 = dx2 * sin + dy2 * cos;

        // Wall is at localX = 0 (a vertical line in local coords)
        // Check if ray crosses localX = 0
        if ((localX1 < 0 && localX2 < 0) || (localX1 > 0 && localX2 > 0)) {
            // Both points on same side of wall - no intersection
            return false;
        }

        // Calculate intersection Y coordinate
        const t = -localX1 / (localX2 - localX1);
        const intersectY = localY1 + t * (localY2 - localY1);

        // Check if intersection hits any particle
        // Left side particles (from -halfLength inward)
        for (let i = 0; i < particlesPerSide; i++) {
            const particleY = -halfLength + i * pc.particleSize;
            if (intersectY >= particleY && intersectY < particleY + pc.particleSize) {
                return true;  // Hit a particle
            }
        }

        // Right side particles (from +halfLength inward)
        for (let i = 0; i < particlesPerSide; i++) {
            const particleY = halfLength - (i + 1) * pc.particleSize;
            if (intersectY >= particleY && intersectY < particleY + pc.particleSize) {
                return true;  // Hit a particle
            }
        }

        return false;  // Ray passes through aperture
    }

    function calculateWaveValue(x, y) {
        let sum = 0;
        const { waveSources, walls } = Config.state;
        const { frequency, amplitude, distortion } = Config.params;
        const { time } = Config.performance;

        for (const source of waveSources) {
            const dx = x - source.x;
            const dy = y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if ray from source to point is blocked by any wall
            let blocked = false;
            if (walls && walls.length > 0) {
                for (const wall of walls) {
                    if (rayIntersectsWall(source.x, source.y, x, y, wall)) {
                        blocked = true;
                        break;
                    }
                }
            }

            if (!blocked) {
                const wave = Math.sin(
                    distance * frequency * 0.05 -
                    time +
                    source.phase
                ) * amplitude;

                sum += wave / Math.pow(distance * 0.01 + 1, distortion);
            }
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
