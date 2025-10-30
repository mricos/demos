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

            // Render dual resolution with dual palette if enabled
            if (params.resolution2 > 0) {
                const blendAmount = params.blend / 100;
                const dualPalette = (params.dualPalette && params.dualPalette.length > 0)
                    ? params.dualPalette
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

            // Draw light pucks (from LightPuck module)
            if (window.FP.LightPuck) {
                window.FP.LightPuck.draw(this.ctx);
            }
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
                // CRITICAL: Use explicit undefined check to allow 0 values
                const reflCoeff = (element.reflectionCoefficient !== undefined && element.reflectionCoefficient !== null)
                    ? element.reflectionCoefficient
                    : 0.5;
                const reflColor = this.getReflectionColor(reflCoeff);
                ctx.fillStyle = `rgba(${reflColor.r}, ${reflColor.g}, ${reflColor.b}, ${reflColor.a})`;

                // Selection highlight
                if (isSelected) {
                    const triadColor = this.getTriadColor(reflCoeff);
                    ctx.strokeStyle = `rgb(${triadColor.r}, ${triadColor.g}, ${triadColor.b})`;
                    ctx.lineWidth = 4;
                } else {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.lineWidth = 2;
                }
            }

            // Draw based on element type
            if (element.type === Matter.ElementType.WALL) {
                // Draw curved or flat wall
                if (element.curvature && Math.abs(element.curvature) > 0.1) {
                    this.drawCurvedWall(ctx, element);
                } else {
                    // Flat wall
                    ctx.fillRect(-element.thickness / 2, -element.length / 2, element.thickness, element.length);
                    ctx.strokeRect(-element.thickness / 2, -element.length / 2, element.thickness, element.length);
                }

            } else if (element.type === Matter.ElementType.APERTURE) {
                // Special case: slitCount=0 means solid barrier, render as solid shape
                if (element.slitCount === 0) {
                    if (element.curvature && Math.abs(element.curvature) > 0.1) {
                        this.drawCurvedWall(ctx, element);
                    } else {
                        ctx.fillRect(-element.thickness / 2, -element.length / 2, element.thickness, element.length);
                        ctx.strokeRect(-element.thickness / 2, -element.length / 2, element.thickness, element.length);
                    }
                }
                // Draw curved or flat aperture (with slits)
                else if (element.curvature && Math.abs(element.curvature) > 0.1) {
                    this.drawCurvedAperture(ctx, element);
                } else {
                    // Flat aperture - draw clean barrier with gaps
                    this.drawFlatAperture(ctx, element);
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
            // Draw ghost element if in wave mode B (disabled - not needed)
            // if (Config.state.ghostElement && !Config.state.particleMode) {
            //     this.drawOpticalElement(Config.state.ghostElement, true, false);
            // }

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

        /**
         * Draw a curved wall using parabolic shape
         * curvature > 0: concave (inward curve, parabolic mirror)
         * curvature < 0: convex (outward curve)
         */
        drawCurvedWall(ctx, element) {
            const halfLength = element.length / 2;
            const halfThickness = element.thickness / 2;
            const curvature = element.curvature;
            const segments = 40;  // Number of segments for smooth curve

            // Calculate parabolic curve
            // For a parabolic mirror: x = y^2 / (4f) where f is focal length (curvature)
            ctx.beginPath();

            // Draw front edge (curved)
            for (let i = 0; i <= segments; i++) {
                const t = (i / segments) * 2 - 1;  // -1 to 1
                const y = t * halfLength;
                const x = (y * y) / (4 * curvature);  // Parabolic curve

                if (i === 0) {
                    ctx.moveTo(x - halfThickness, y);
                } else {
                    ctx.lineTo(x - halfThickness, y);
                }
            }

            // Draw back edge (curved)
            for (let i = segments; i >= 0; i--) {
                const t = (i / segments) * 2 - 1;
                const y = t * halfLength;
                const x = (y * y) / (4 * curvature);
                ctx.lineTo(x + halfThickness, y);
            }

            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        /**
         * Draw flat aperture as clean solid barrier with transparent slit gaps
         */
        drawFlatAperture(ctx, element) {
            const halfLength = element.length / 2;
            const halfThickness = element.thickness / 2;
            const slitWidth = element.slitWidth || 20;
            const slitCount = element.slitCount;

            // Calculate slit positions (middle-out)
            const slitPositions = [];
            if (slitCount === 1) {
                slitPositions.push(0);
            } else if (slitCount % 2 === 1) {
                // Odd: center slit + pairs
                slitPositions.push(0);
                for (let i = 1; i <= Math.floor(slitCount / 2); i++) {
                    slitPositions.push(i * slitWidth * 2);
                    slitPositions.push(-i * slitWidth * 2);
                }
            } else {
                // Even: symmetric pairs
                for (let i = 0; i < slitCount / 2; i++) {
                    const offset = (i + 0.5) * slitWidth * 2;
                    slitPositions.push(offset);
                    slitPositions.push(-offset);
                }
            }

            // Draw the full barrier first
            ctx.fillRect(-halfThickness, -halfLength, element.thickness, element.length);

            // Cut out the slits by drawing them in destination-out mode
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 1)';

            for (const center of slitPositions) {
                ctx.fillRect(-halfThickness - 1, center - slitWidth / 2, element.thickness + 2, slitWidth);
            }

            ctx.restore();

            // Draw outline
            ctx.strokeRect(-halfThickness, -halfLength, element.thickness, element.length);

            // Draw thin lines to show slit edges
            ctx.save();
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 1;
            for (const center of slitPositions) {
                // Top edge of slit
                ctx.beginPath();
                ctx.moveTo(-halfThickness, center - slitWidth / 2);
                ctx.lineTo(halfThickness, center - slitWidth / 2);
                ctx.stroke();
                // Bottom edge of slit
                ctx.beginPath();
                ctx.moveTo(-halfThickness, center + slitWidth / 2);
                ctx.lineTo(halfThickness, center + slitWidth / 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        /**
         * Draw a curved aperture with piecewise tangent segments
         * Each brick is oriented tangent to the parabolic curve
         */
        drawCurvedAperture(ctx, element) {
            const halfThickness = element.thickness / 2;
            const curvature = element.curvature;
            const particleSize = element.particleSize || 8;
            const particles = element.getParticlePositions();

            // Draw particles along curved path with proper tangent orientation
            for (const particle of particles) {
                ctx.save();

                // Calculate curve position for this Y coordinate
                const y = particle.localY;
                const xCurve = (y * y) / (4 * curvature);

                // Calculate tangent angle at this point
                // For parabola x = y²/(4f), dx/dy = y/(2f)
                // Tangent angle = arctan(dx/dy)
                const dxdy = y / (2 * curvature);
                const tangentAngle = Math.atan(dxdy);

                // Position on curve
                ctx.translate(particle.localX + xCurve, particle.localY);

                // Rotate to be tangent to curve
                ctx.rotate(tangentAngle);

                // Draw brick oriented along the curve
                ctx.fillRect(-halfThickness, -particleSize/2, element.thickness, particleSize);
                ctx.strokeRect(-halfThickness, -particleSize/2, element.thickness, particleSize);

                ctx.restore();
            }
        }

        cleanup() {
            // Nothing to clean up for CPU mode
            console.log('[CPUEngine] Cleanup');
        }
    }

    return CPUEngine;
})();
