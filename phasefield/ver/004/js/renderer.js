/**
 * Phase Field Renderer Module
 * Handles all rendering operations including watchdog and performance monitoring
 */

window.FP = window.FP || {};

window.FP.Renderer = (function() {
    'use strict';

    const Config = window.FP.Config;
    const Field = window.FP.Field;
    const Optics = window.FP.Optics;
    const Matter = window.FP.Matter;
    const Palette = window.FP.Palette;
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

    /**
     * Get color based on reflection coefficient
     * 0.0 = blackbody (black), 1.0 = perfect reflection (white), >1.0 = chromatic (colorful)
     */
    function getReflectionColor(reflCoeff) {
        if (reflCoeff < 1.0) {
            // 0.0 to 1.0: grayscale from black to white
            const intensity = Math.floor(reflCoeff * 255);
            return {r: intensity, g: intensity, b: intensity, a: 1.0};
        } else if (reflCoeff === 1.0) {
            // Perfect reflection: pure white
            return {r: 255, g: 255, b: 255, a: 1.0};
        } else {
            // > 1.0: chromatic - use hue based on coefficient
            const hue = ((reflCoeff - 1.0) * 360) % 360;
            const rgb = hslToRgb(hue, 80, 60);
            return {r: rgb.r, g: rgb.g, b: rgb.b, a: 0.9};
        }
    }

    /**
     * Convert HSL to RGB
     */
    function hslToRgb(h, s, l) {
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
     * Get triad harmony color based on reflection coefficient
     * Uses proper HSL color theory for harmonious selection colors
     */
    function getTriadColor(reflCoeff) {
        // Map reflection coefficient to hue (0-360)
        const baseHue = (reflCoeff * 180) % 360;
        // Triad harmony: 120 degrees apart
        const triadHue = (baseHue + 120) % 360;
        // Convert HSL to RGB with high saturation and medium lightness
        return hslToRgb(triadHue, 80, 60);
    }

    /**
     * Draw an optical element on the canvas
     */
    function drawOpticalElement(element, isGhost = false, isSelected = false) {
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
            const reflColor = getReflectionColor(element.reflectionCoefficient || 0.5);
            ctx.fillStyle = `rgba(${reflColor.r}, ${reflColor.g}, ${reflColor.b}, ${reflColor.a})`;

            // Selection highlight: sharp triad harmony color border
            if (isSelected) {
                const triadColor = getTriadColor(element.reflectionCoefficient || 0.5);
                ctx.strokeStyle = `rgb(${triadColor.r}, ${triadColor.g}, ${triadColor.b})`;
                ctx.lineWidth = 4;
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.lineWidth = 2;
            }
        }

        // Draw based on element type
        if (element.type === Matter.ElementType.WALL) {
            // Simple rectangle for wall
            ctx.fillRect(-element.thickness / 2, -element.length / 2, element.thickness, element.length);
            ctx.strokeRect(-element.thickness / 2, -element.length / 2, element.thickness, element.length);

        } else if (element.type === Matter.ElementType.APERTURE) {
            // Draw aperture particles with nice brick appearance
            const particles = element.getParticlePositions();
            const particleSize = element.particleSize || 8;

            for (const particle of particles) {
                ctx.save();
                ctx.translate(particle.localX, particle.localY);

                // Draw brick with slight 3D effect
                ctx.fillRect(-element.thickness / 2, 0, element.thickness, particleSize);

                // Add brick outline
                ctx.strokeRect(-element.thickness / 2, 0, element.thickness, particleSize);

                // Add subtle highlight on top edge for 3D effect
                if (!isGhost && !isSelected) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(-element.thickness / 2, 0);
                    ctx.lineTo(element.thickness / 2, 0);
                    ctx.stroke();
                }

                ctx.restore();
            }

            // Draw slit indicators if ghost
            if (isGhost) {
                ctx.strokeStyle = 'rgba(255, 100, 100, 0.7)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);

                if (element.slitCount === 1) {
                    // Single slit indicator
                    ctx.strokeRect(-2, -element.slitWidth / 2, 4, element.slitWidth);
                } else if (element.slitCount === 2) {
                    // Double slit indicators
                    const slit1Y = -element.slitSeparation / 2;
                    const slit2Y = element.slitSeparation / 2;
                    ctx.strokeRect(-2, slit1Y - element.slitWidth / 2, 4, element.slitWidth);
                    ctx.strokeRect(-2, slit2Y - element.slitWidth / 2, 4, element.slitWidth);
                }
                ctx.setLineDash([]);
            }

        } else if (element.type === Matter.ElementType.LENS) {
            // Draw lens as ellipse/circle
            ctx.beginPath();
            ctx.ellipse(0, 0, element.thickness / 2, element.length / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Draw focal length indicator if ghost
            if (isGhost && element.focalLength !== 0) {
                ctx.strokeStyle = 'rgba(255, 100, 100, 0.7)';
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(element.focalLength, -element.length / 2);
                ctx.lineTo(element.focalLength, element.length / 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

        } else if (element.type === Matter.ElementType.GRATING) {
            // Draw grating lines
            const lines = element.getLinePositions();
            for (const line of lines) {
                ctx.fillRect(-element.thickness / 2, line.localY, element.thickness, line.width);
            }

        } else if (element.type === Matter.ElementType.MIRROR) {
            // Draw mirror as rectangle with gradient
            if (!isGhost) {
                const gradient = ctx.createLinearGradient(-element.thickness / 2, 0, element.thickness / 2, 0);
                gradient.addColorStop(0, 'rgba(180, 180, 180, 0.8)');
                gradient.addColorStop(0.5, 'rgba(220, 220, 220, 0.9)');
                gradient.addColorStop(1, 'rgba(180, 180, 180, 0.8)');
                ctx.fillStyle = gradient;
            }
            ctx.fillRect(-element.thickness / 2, -element.length / 2, element.thickness, element.length);
            ctx.strokeRect(-element.thickness / 2, -element.length / 2, element.thickness, element.length);
        }

        ctx.restore();
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

        // Draw optical elements on top of the field
        const elements = Optics.getAllElements();
        if (elements && elements.length > 0) {
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                const isSelected = (i === Config.state.editingElementIndex);
                const isBeingEdited = (i === Config.state.editingElementIndex &&
                                      Config.state.gamepadMode === 'B' &&
                                      !Config.state.particleMode);

                // Draw element (skip if being edited, ghost will show instead)
                if (!isBeingEdited) {
                    drawOpticalElement(element, false, isSelected);
                }
            }
        }

        // Draw ghost element if in wave mode B
        if (Config.state.ghostElement && !Config.state.particleMode) {
            drawOpticalElement(Config.state.ghostElement, true);
        }

        // Draw ghost source if in particle mode B
        if (Config.state.ghostSource && Config.state.particleMode) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 100, 255, 0.6)';
            ctx.strokeStyle = 'rgba(255, 255, 0, 1)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(Config.state.ghostSource.x, Config.state.ghostSource.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // Draw mode indicator with background
        ctx.save();

        const modeText = Config.state.particleMode ? 'PARTICLE MODE' : 'WAVE MODE';
        const gapText = `Gap: ${Config.particleConfig.apertureGap.toFixed(0)}px`;
        const freqText = `Freq: ${Config.params.frequency.toFixed(2)}`;
        const elementCount = Optics.getAllElements().length;
        const elementsText = `Elements: ${elementCount}`;

        // Draw dark background box
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(5, canvas.height - 75, 240, 70);

        // Draw border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(5, canvas.height - 75, 240, 70);

        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(modeText, 10, canvas.height - 55);
        ctx.fillText(freqText, 10, canvas.height - 35);
        ctx.fillText(gapText, 10, canvas.height - 15);
        ctx.fillText(elementsText, 110, canvas.height - 15);
        ctx.restore();
    }

    function updatePerformanceMetrics(frameTime) {
        const perf = Config.performance;

        // Watchdog: Monitor frame time and adjust quality
        if (frameTime > perf.MAX_FRAME_TIME) {
            perf.slowFrameCount++;
            if (perf.slowFrameCount > 3) {
                perf.adaptiveQuality = Math.max(0.2, perf.adaptiveQuality * 0.8);
                // Console spam disabled
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
            const fpsEl = document.getElementById('fps');
            if (fpsEl) {
                fpsEl.textContent = perf.fps + (perf.adaptiveQuality < 1.0 ? ' ⚠' : '');
            }
        }
    }

    return {
        setCanvas,
        resizeCanvas,
        render,
        updatePerformanceMetrics
    };
})();
