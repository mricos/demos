/**
 * Phase Field Palette Module
 * Handles color generation, interpolation, and palette management
 */

window.PF = window.PF || {};

window.PF.Palette = (function() {
    'use strict';

    const Config = window.PF.Config;

    // Color utility functions
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 0, g: 0, b: 0};
    }

    function interpolateColor(color1, color2, factor) {
        return {
            r: Math.round(color1.r + (color2.r - color1.r) * factor),
            g: Math.round(color1.g + (color2.g - color1.g) * factor),
            b: Math.round(color1.b + (color2.b - color1.b) * factor)
        };
    }

    function generatePalette(colors, steps, pivot = 0.5, balance = 0.5) {
        const palette = [];

        if (colors.length === 3) {
            // 3-color palette with pivot and balance
            const [startColor, midColor, endColor] = colors.map(hexToRgb);

            // Ensure valid inputs
            const safePivot = Math.max(0.01, Math.min(0.99, isNaN(pivot) ? 0.5 : pivot));
            const safeBalance = Math.max(0, Math.min(1, isNaN(balance) ? 0.5 : balance));

            for (let i = 0; i < steps; i++) {
                const t = i / (steps - 1);
                let color;

                // Apply balance to shift the pivot point (0.25x to 0.75x of pivot)
                const adjustedPivot = Math.max(0.01, Math.min(0.99, safePivot * (0.25 + safeBalance * 0.5)));

                if (t < adjustedPivot) {
                    const factor = adjustedPivot > 0 ? Math.min(1, t / adjustedPivot) : 0;
                    color = interpolateColor(startColor, midColor, factor);
                } else {
                    const denominator = Math.max(0.01, 1 - adjustedPivot);
                    const factor = Math.min(1, (t - adjustedPivot) / denominator);
                    color = interpolateColor(midColor, endColor, factor);
                }

                palette.push(color);
            }
        } else {
            // Legacy multi-color support
            const segmentLength = steps / (colors.length - 1);

            for (let i = 0; i < steps; i++) {
                const segment = Math.floor(i / segmentLength);
                const segmentFactor = (i % segmentLength) / segmentLength;

                const color1 = hexToRgb(colors[Math.min(segment, colors.length - 2)]);
                const color2 = hexToRgb(colors[Math.min(segment + 1, colors.length - 1)]);

                const color = interpolateColor(color1, color2, segmentFactor);
                palette.push(color);
            }
        }

        return palette;
    }

    function quantizePalette(palette, steps) {
        // Reduce palette to discrete steps
        if (steps >= palette.length) return palette;

        const quantized = [];
        const ratio = palette.length / steps;

        for (let i = 0; i < steps; i++) {
            const index = Math.floor(i * ratio);
            quantized.push(palette[index]);
        }

        return quantized;
    }

    function computeComplementaryColor(hex) {
        const rgb = hexToRgb(hex);
        const comp = {
            r: 255 - rgb.r,
            g: 255 - rgb.g,
            b: 255 - rgb.b
        };
        return `#${comp.r.toString(16).padStart(2, '0')}${comp.g.toString(16).padStart(2, '0')}${comp.b.toString(16).padStart(2, '0')}`;
    }

    function rgbToHsl(rgb) {
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;

        let h, s;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return {h, s, l};
    }

    function hslToHex(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    function computeAdjointTriad(startColor) {
        const rgb = hexToRgb(startColor);
        const {h, s, l} = rgbToHsl(rgb);
        const boostS = Math.min(1, s * 1.3);

        return {
            start: hslToHex(h, boostS, l),
            mid: hslToHex((h + 0.333) % 1, boostS, l),
            end: hslToHex((h + 0.667) % 1, boostS, l)
        };
    }

    function generateAdjointPalette(baseColors, mode, triadHue = 120) {
        // Generate adjoint colors based on mode
        const [start, mid, end] = baseColors;
        let adjointColors;

        switch (mode) {
            case 'complementary':
                adjointColors = [
                    computeComplementaryColor(start),
                    computeComplementaryColor(mid),
                    computeComplementaryColor(end)
                ];
                break;

            case 'desat':
                adjointColors = baseColors.map(color => {
                    const rgb = hexToRgb(color);
                    const {h, s, l} = rgbToHsl(rgb);
                    return hslToHex(h, s * 0.3, l);
                });
                break;

            case 'inverse':
                adjointColors = [
                    computeComplementaryColor(end),
                    computeComplementaryColor(mid),
                    computeComplementaryColor(start)
                ];
                break;

            case 'triad':
                adjointColors = baseColors.map(color => {
                    const rgb = hexToRgb(color);
                    const {h, s, l} = rgbToHsl(rgb);
                    const newH = (h + triadHue / 360) % 1;
                    return hslToHex(newH, s, l);
                });
                break;

            default:
                adjointColors = baseColors;
        }

        return adjointColors;
    }

    function applyDesaturation(color, amount) {
        // amount: 0 = no change, 100 = full grayscale
        const factor = 1 - (amount / 100);
        const gray = Math.round(color.r * 0.299 + color.g * 0.587 + color.b * 0.114);

        return {
            r: Math.round(color.r * factor + gray * (1 - factor)),
            g: Math.round(color.g * factor + gray * (1 - factor)),
            b: Math.round(color.b * factor + gray * (1 - factor))
        };
    }

    function applyBrightness(color, brightness) {
        // brightness: 0 = black, 50 = no change, 100 = white boost
        const factor = (brightness - 50) / 50;

        if (factor > 0) {
            // Brighten
            return {
                r: Math.min(255, Math.round(color.r + (255 - color.r) * factor)),
                g: Math.min(255, Math.round(color.g + (255 - color.g) * factor)),
                b: Math.min(255, Math.round(color.b + (255 - color.b) * factor))
            };
        } else {
            // Darken
            return {
                r: Math.max(0, Math.round(color.r * (1 + factor))),
                g: Math.max(0, Math.round(color.g * (1 + factor))),
                b: Math.max(0, Math.round(color.b * (1 + factor)))
            };
        }
    }

    function loadPresetPalette(index) {
        Config.state.currentPresetIndex = index;
        const preset = Config.presetPalettes[index];
        Config.state.currentPalette = generatePalette(preset.colors, Config.params.paletteSteps);
        updatePaletteUI();
    }

    function loadCustomPalette() {
        const colors = [
            document.getElementById('color-start').value,
            document.getElementById('color-mid').value,
            document.getElementById('color-end').value
        ];
        const pivotEl = document.getElementById('color-pivot');
        const balanceEl = document.getElementById('color-balance');

        const pivot = pivotEl ? (parseInt(pivotEl.value) / 100) : 0.5;
        const balance = balanceEl ? (parseInt(balanceEl.value) / 100) : 0.5;

        // Generate base palette
        let basePalette = generatePalette(colors, Config.params.paletteSteps, pivot, balance);

        // Apply dynamic range quantization
        if (Config.params.dynamicRange < Config.params.paletteSteps) {
            basePalette = quantizePalette(basePalette, Config.params.dynamicRange);
        }

        Config.state.currentPalette = basePalette;

        // Generate adjoint palette if enabled
        if (Config.params.adjointEnabled) {
            const adjointColors = generateAdjointPalette(
                colors,
                Config.params.adjointMode,
                Config.params.adjointTriadHue
            );
            let adjointPalette = generatePalette(adjointColors, Config.params.paletteSteps, pivot, balance);

            if (Config.params.dynamicRange < Config.params.paletteSteps) {
                adjointPalette = quantizePalette(adjointPalette, Config.params.dynamicRange);
            }

            Config.state.adjointPalette = adjointPalette;
        }

        Config.state.currentPresetIndex = -1;
        updatePaletteUI();
    }

    function updatePaletteUI() {
        const previews = document.querySelectorAll('.palette-preview');
        previews.forEach((preview, index) => {
            preview.classList.toggle('active', index === Config.state.currentPresetIndex);
        });
    }

    function renderPalettePreview(colors, pivot = 0.5) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 100;
        tempCanvas.height = 30;
        const tempCtx = tempCanvas.getContext('2d');

        const palette = generatePalette(colors, 100, pivot);
        for (let i = 0; i < 100; i++) {
            const c = palette[i];
            tempCtx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
            tempCtx.fillRect(i, 0, 1, 30);
        }

        return tempCanvas.toDataURL();
    }

    function initializePaletteGrid() {
        const paletteGrid = document.getElementById('palette-grid');
        Config.presetPalettes.forEach((preset, index) => {
            const preview = document.createElement('div');
            preview.className = 'palette-preview';
            preview.style.backgroundImage = `url(${renderPalettePreview(preset.colors)})`;
            preview.style.backgroundSize = 'cover';
            preview.addEventListener('click', () => loadPresetPalette(index));
            paletteGrid.appendChild(preview);
        });
    }

    return {
        hexToRgb,
        interpolateColor,
        generatePalette,
        quantizePalette,
        computeComplementaryColor,
        computeAdjointTriad,
        generateAdjointPalette,
        applyDesaturation,
        applyBrightness,
        rgbToHsl,
        hslToHex,
        loadPresetPalette,
        loadCustomPalette,
        updatePaletteUI,
        renderPalettePreview,
        initializePaletteGrid
    };
})();
