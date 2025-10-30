/**
 * Curve Mapper Module
 * Sophisticated curve mapping for control modulation
 * S-curves with attack/release parameters (inspired by audio mixing)
 */

window.FP = window.FP || {};

window.FP.CurveMapper = (function() {
    'use strict';

    /**
     * Curve presets
     */
    const PRESETS = {
        linear: { attack: 0.5, sustain: 0.5, release: 0.5, gain: 1.0, name: 'Linear' },
        fastAttack: { attack: 0.9, sustain: 0.5, release: 0.3, gain: 1.0, name: 'Fast Attack' },
        slowAttack: { attack: 0.1, sustain: 0.5, release: 0.5, gain: 1.0, name: 'Slow Attack' },
        fastRelease: { attack: 0.5, sustain: 0.5, release: 0.9, gain: 1.0, name: 'Fast Release' },
        slowRelease: { attack: 0.5, sustain: 0.5, release: 0.1, gain: 1.0, name: 'Slow Release' },
        sCurve: { attack: 0.7, sustain: 0.5, release: 0.7, gain: 1.0, name: 'S-Curve' },
        exponential: { attack: 0.8, sustain: 0.5, release: 0.2, gain: 1.2, name: 'Exponential' },
        logarithmic: { attack: 0.2, sustain: 0.5, release: 0.8, gain: 0.9, name: 'Logarithmic' }
    };

    // Active curves
    const curves = new Map();

    /**
     * Create a new curve
     */
    function createCurve(id, params = {}) {
        const curve = {
            id,
            attack: params.attack ?? 0.5,     // 0-1: slow to fast attack
            sustain: params.sustain ?? 0.5,   // 0-1: depth of middle section
            release: params.release ?? 0.5,   // 0-1: slow to fast release
            gain: params.gain ?? 1.0,          // Output gain multiplier
            invert: params.invert ?? false,    // Invert the curve
            enabled: params.enabled ?? true
        };

        curves.set(id, curve);
        return curve;
    }

    /**
     * Apply curve transformation to input value (0-1)
     * Uses piecewise exponential curves for attack and release
     */
    function applyCurve(curveId, input) {
        const curve = curves.get(curveId);
        if (!curve || !curve.enabled) {
            return input;
        }

        let output = input;

        // Attack phase (0 to sustain point)
        if (input < 0.5) {
            const t = input * 2; // Normalize to 0-1
            const attackPower = 0.5 + (curve.attack * 3); // 0.5 to 3.5
            output = Math.pow(t, attackPower) * 0.5;
        }
        // Release phase (sustain to 1)
        else {
            const t = (input - 0.5) * 2; // Normalize to 0-1
            const releasePower = 0.5 + (curve.release * 3); // 0.5 to 3.5
            output = 0.5 + (1 - Math.pow(1 - t, releasePower)) * 0.5;
        }

        // Apply sustain depth modulation
        output = output * (0.5 + curve.sustain * 0.5);

        // Apply gain
        output *= curve.gain;

        // Invert if needed
        if (curve.invert) {
            output = 1 - output;
        }

        // Clamp to 0-1
        return Math.max(0, Math.min(1, output));
    }

    /**
     * Generate curve points for visualization
     * Returns array of {x, y} points
     */
    function generateCurvePoints(curveId, resolution = 100) {
        const points = [];
        for (let i = 0; i <= resolution; i++) {
            const x = i / resolution;
            const y = applyCurve(curveId, x);
            points.push({ x, y });
        }
        return points;
    }

    /**
     * Draw curve to canvas
     */
    function drawCurve(canvas, curveId, options = {}) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = options.padding ?? 20;

        const drawWidth = width - padding * 2;
        const drawHeight = height - padding * 2;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw background grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // Vertical lines
        for (let i = 0; i <= 4; i++) {
            const x = padding + (drawWidth / 4) * i;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
        }

        // Horizontal lines
        for (let i = 0; i <= 4; i++) {
            const y = padding + (drawHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Draw axes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, height - padding); // X axis
        ctx.lineTo(width - padding, height - padding);
        ctx.moveTo(padding, padding); // Y axis
        ctx.lineTo(padding, height - padding);
        ctx.stroke();

        // Draw curve
        const points = generateCurvePoints(curveId, 200);
        const curve = curves.get(curveId);

        if (!curve) return;

        // Gradient stroke
        const gradient = ctx.createLinearGradient(padding, 0, width - padding, 0);
        gradient.addColorStop(0, '#00D4FF');
        gradient.addColorStop(0.5, '#6600FF');
        gradient.addColorStop(1, '#FF00FF');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        points.forEach((point, i) => {
            const x = padding + point.x * drawWidth;
            const y = height - padding - point.y * drawHeight;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw attack/sustain/release markers
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '12px "Azeret Mono", monospace';

        // Attack marker
        ctx.fillText('Attack', padding + 5, padding + 15);

        // Sustain marker (middle)
        ctx.fillText('Sustain', padding + drawWidth / 2 - 25, padding + 15);

        // Release marker
        ctx.fillText('Release', width - padding - 50, padding + 15);

        // Draw current value indicator if provided
        if (options.currentValue !== undefined) {
            const cv = options.currentValue;
            const cvOutput = applyCurve(curveId, cv);

            const indicatorX = padding + cv * drawWidth;
            const indicatorY = height - padding - cvOutput * drawHeight;

            // Vertical line from input
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(indicatorX, height - padding);
            ctx.lineTo(indicatorX, indicatorY);
            ctx.stroke();

            // Horizontal line to output
            ctx.beginPath();
            ctx.moveTo(padding, indicatorY);
            ctx.lineTo(indicatorX, indicatorY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Indicator dot
            ctx.fillStyle = '#00FF64';
            ctx.beginPath();
            ctx.arc(indicatorX, indicatorY, 5, 0, Math.PI * 2);
            ctx.fill();

            // Value labels
            ctx.fillStyle = '#00FF64';
            ctx.fillText(`In: ${cv.toFixed(2)}`, indicatorX + 8, height - padding + 15);
            ctx.fillText(`Out: ${cvOutput.toFixed(2)}`, padding - 60, indicatorY + 5);
        }
    }

    /**
     * Update curve parameters
     */
    function updateCurve(curveId, params) {
        const curve = curves.get(curveId);
        if (!curve) return false;

        Object.assign(curve, params);
        return true;
    }

    /**
     * Load preset
     */
    function loadPreset(curveId, presetName) {
        const preset = PRESETS[presetName];
        if (!preset) {
            console.warn(`[CurveMapper] Preset "${presetName}" not found`);
            return false;
        }

        return updateCurve(curveId, preset);
    }

    /**
     * Get curve
     */
    function getCurve(curveId) {
        return curves.get(curveId);
    }

    /**
     * Delete curve
     */
    function deleteCurve(curveId) {
        return curves.delete(curveId);
    }

    /**
     * Get all presets
     */
    function getPresets() {
        return { ...PRESETS };
    }

    return {
        createCurve,
        applyCurve,
        generateCurvePoints,
        drawCurve,
        updateCurve,
        loadPreset,
        getCurve,
        deleteCurve,
        getPresets,
        PRESETS
    };
})();
