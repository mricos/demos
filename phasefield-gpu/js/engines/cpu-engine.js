/**
 * CPU Engine - Wraps existing field.js and renderer.js implementation
 * This engine uses the original Canvas 2D rendering path
 */
window.FP = window.FP || {};

window.FP.CPUEngine = (function() {
    'use strict';

    const Config = window.FP.Config;
    const Field = window.FP.Field;
    const Optics = window.FP.Optics;
    const Matter = window.FP.Matter;
    const Palette = window.FP.Palette;

    class CPUEngine {
        constructor() {
            this.type = 'cpu';
            this.canvas = null;
            this.ctx = null;
        }

        initialize(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d', {
                alpha: false,
                willReadFrequently: true
            });

            if (!this.ctx) {
                throw new Error('Failed to get 2D context');
            }

            console.log('[CPUEngine] Initialized with canvas', canvas.width, 'x', canvas.height);
        }

        /**
         * Main render function - uses existing renderer code
         */
        render(params) {
            const imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);

            // Render primary resolution with main palette
            this.renderAtResolution(
                imageData,
                params.resolution,
                params.mode,
                1,
                params.palette
            );

            // Render dual resolution with adjoint palette if enabled
            if (params.resolution2 > 0) {
                const blendAmount = params.blend / 100;
                const dualPalette = (params.adjointPalette && params.adjointPalette.length > 0)
                    ? params.adjointPalette
                    : params.palette;
                this.renderAtResolution(
                    imageData,
                    params.resolution2,
                    params.mode,
                    blendAmount,
                    dualPalette
                );
            }

            // Apply final gain stage (desaturation and brightness)
            this.applyFinalGainStage(imageData, params);

            this.ctx.putImageData(imageData, 0, 0);

            // Draw optical elements on top
            this.drawOpticalElements(params.elements || []);

            // Draw ghost elements
            this.drawGhostElements();

            // Draw mode indicator
            this.drawModeIndicator();
        }

        /**
         * Render at specified resolution (from renderer.js)
         */
        renderAtResolution(imageData, resolutionValue, mode, opacity, palette) {
            const data = imageData.data;
            const divisions = Config.getGridDivisions(resolutionValue);
            const blockSize = Math.ceil(this.canvas.width / divisions);

            if (!palette || palette.length === 0) return;

            // Prepare parameters for field calculations
            const params = {
                frequency: Config.params.frequency,
                amplitude: Config.params.amplitude,
                distortion: Config.params.distortion,
                time: Config.performance.time
            };

            // Track wave value range for this frame
            let frameMin = Infinity;
            let frameMax = -Infinity;
            const waveValues = [];

            // First pass: collect all wave values
            for (let gridY = 0; gridY < divisions; gridY++) {
                for (let gridX = 0; gridX < divisions; gridX++) {
                    const blockX = gridX * blockSize;
                    const blockY = gridY * blockSize;
                    const waveValue = Field.calculateBlockValue(
                        blockX, blockY, blockSize, mode,
                        params, Config.performance.adaptiveQuality
                    );
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
                const colorIndex = Math.floor(palettePos * (palette.length - 1));
                const color = palette[colorIndex] || {r: 0, g: 0, b: 0};

                // Fill block
                for (let dy = 0; dy < blockSize; dy++) {
                    for (let dx = 0; dx < blockSize; dx++) {
                        const x = blockX + dx;
                        const y = blockY + dy;
                        if (x < this.canvas.width && y < this.canvas.height) {
                            const index = (y * this.canvas.width + x) * 4;
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

        /**
         * Apply final gain stage
         */
        applyFinalGainStage(imageData, params) {
            const data = imageData.data;
            const desat = params.finalDesaturation || 0;
            const brightness = params.finalBrightness !== undefined ? params.finalBrightness : 50;

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

        /**
         * Draw optical elements
         */
        drawOpticalElements(elements) {
            if (!elements || elements.length === 0) return;

            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                const isSelected = (i === Config.state.editingElementIndex);
                const isBeingEdited = (i === Config.state.editingElementIndex &&
                                      Config.state.gamepadMode === 'B' &&
                                      !Config.state.particleMode);

                // Draw element (skip if being edited, ghost will show instead)
                if (!isBeingEdited) {
                    this.drawOpticalElement(element, false, isSelected);
                }
            }
        }

        /**
         * Draw a single optical element
         */
        drawOpticalElement(element, isGhost, isSelected) {
            const ctx = this.ctx;
            ctx.save();

            // Move to element center
            ctx.translate(element.x, element.y);
            ctx.rotate(element.angle);

            // Set style based on ghost status and element type
            if (isGhost) {
                ctx.strokeStyle = 'rgba(255, 255, 0, 1)';
                ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
                ctx.lineWidth = 2;
            } else {
                // Use reflection coefficient to determine color
                const reflColor = this.getReflectionColor(element.reflectionCoefficient || 0.5);
                ctx.fillStyle = `rgba(${reflColor.r}, ${reflColor.g}, ${reflColor.b}, ${reflColor.a})`;

                // Selection highlight
                if (isSelected) {
                    const triadColor = this.getTriadColor(element.reflectionCoefficient || 0.5);
                    ctx.strokeStyle = `rgb(${triadColor.r}, ${triadColor.g}, ${triadColor.b})`;
                    ctx.lineWidth = 4;
                } else {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.lineWidth = 2;
                }
            }

            // Draw based on element type
            if (element.type === Matter.ElementType.WALL) {
                ctx.fillRect(-element.thickness / 2, -element.length / 2, element.thickness, element.length);
                ctx.strokeRect(-element.thickness / 2, -element.length / 2, element.thickness, element.length);

            } else if (element.type === Matter.ElementType.APERTURE) {
                const particles = element.getParticlePositions();
                const particleSize = element.particleSize || 8;

                for (const particle of particles) {
                    ctx.save();
                    ctx.translate(particle.localX, particle.localY);
                    ctx.fillRect(-element.thickness / 2, 0, element.thickness, particleSize);
                    ctx.strokeRect(-element.thickness / 2, 0, element.thickness, particleSize);
                    ctx.restore();
                }

            } else if (element.type === Matter.ElementType.LENS) {
                ctx.beginPath();
                ctx.ellipse(0, 0, element.thickness / 2, element.length / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            ctx.restore();
        }

        /**
         * Draw ghost elements
         */
        drawGhostElements() {
            // Draw ghost element if in wave mode B
            if (Config.state.ghostElement && !Config.state.particleMode) {
                this.drawOpticalElement(Config.state.ghostElement, true, false);
            }

            // Draw ghost source if in particle mode B
            if (Config.state.ghostSource && Config.state.particleMode) {
                this.ctx.save();
                this.ctx.fillStyle = 'rgba(255, 100, 255, 0.6)';
                this.ctx.strokeStyle = 'rgba(255, 255, 0, 1)';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(Config.state.ghostSource.x, Config.state.ghostSource.y, 10, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.restore();
            }
        }

        /**
         * Draw mode indicator
         */
        drawModeIndicator() {
            const ctx = this.ctx;
            ctx.save();

            const modeText = Config.state.particleMode ? 'PARTICLE MODE' : 'WAVE MODE';
            const gapText = `Gap: ${Config.particleConfig.apertureGap.toFixed(0)}px`;
            const freqText = `Freq: ${Config.params.frequency.toFixed(2)}`;
            const elementCount = Optics.getAllElements().length;
            const elementsText = `Elements: ${elementCount}`;
            const computeText = `Compute: CPU`;

            // Draw dark background box
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(5, this.canvas.height - 95, 240, 90);

            // Draw border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(5, this.canvas.height - 95, 240, 90);

            // Draw text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px monospace';
            ctx.fillText(modeText, 10, this.canvas.height - 75);
            ctx.fillText(freqText, 10, this.canvas.height - 55);
            ctx.fillText(gapText, 10, this.canvas.height - 35);
            ctx.fillText(elementsText, 10, this.canvas.height - 15);

            ctx.fillStyle = '#4af';
            ctx.fillText(computeText, 150, this.canvas.height - 15);

            ctx.restore();
        }

        /**
         * Helper: Get reflection color
         */
        getReflectionColor(reflCoeff) {
            if (reflCoeff < 1.0) {
                const intensity = Math.floor(reflCoeff * 255);
                return {r: intensity, g: intensity, b: intensity, a: 1.0};
            } else if (reflCoeff === 1.0) {
                return {r: 255, g: 255, b: 255, a: 1.0};
            } else {
                const hue = ((reflCoeff - 1.0) * 360) % 360;
                const rgb = this.hslToRgb(hue, 80, 60);
                return {r: rgb.r, g: rgb.g, b: rgb.b, a: 0.9};
            }
        }

        /**
         * Helper: Get triad color
         */
        getTriadColor(reflCoeff) {
            const baseHue = (reflCoeff * 180) % 360;
            const triadHue = (baseHue + 120) % 360;
            return this.hslToRgb(triadHue, 80, 60);
        }

        /**
         * Helper: HSL to RGB conversion
         */
        hslToRgb(h, s, l) {
            h = h / 360;
            s = s / 100;
            l = l / 100;
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
            return {r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255)};
        }

        cleanup() {
            // Nothing to clean up for CPU mode
            console.log('[CPUEngine] Cleanup');
        }
    }

    return CPUEngine;
})();
