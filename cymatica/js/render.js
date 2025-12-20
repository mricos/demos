// CYMATICA.render - SVG Rendering Engine
(function(CYMATICA) {
    'use strict';

    const state = CYMATICA.state._state;
    const LETTER_PATHS = CYMATICA.LETTER_PATHS;
    const $ = (sel) => document.querySelector(sel);
    let canvas, renderGroup, statsEl, scanlinesEl, vignetteEl;

    // Animation loop variables
    let lastTime = 0;
    let fps = 60;
    let frameCount = 0;
    let fpsTime = 0;

    // ========================================
    // 3D PROJECTION
    // ========================================
    function project3D(x, y, z, rotX, rotY, rotZ) {
        // Apply rotations (ZYX order)
        const radX = rotX * Math.PI / 180;
        const radY = rotY * Math.PI / 180;
        const radZ = rotZ * Math.PI / 180;

        // Rotate around Z
        let x1 = x * Math.cos(radZ) - y * Math.sin(radZ);
        let y1 = x * Math.sin(radZ) + y * Math.cos(radZ);
        let z1 = z;

        // Rotate around Y
        let x2 = x1 * Math.cos(radY) + z1 * Math.sin(radY);
        let y2 = y1;
        let z2 = -x1 * Math.sin(radY) + z1 * Math.cos(radY);

        // Rotate around X
        let x3 = x2;
        let y3 = y2 * Math.cos(radX) - z2 * Math.sin(radX);
        let z3 = y2 * Math.sin(radX) + z2 * Math.cos(radX);

        // Perspective projection (zoom applied via SVG transform)
        const depth = state.cameraZ + z3;
        const scale = state.fov / Math.max(depth, 1);

        return {
            x: x3 * scale,
            y: y3 * scale,
            z: z3,
            scale: scale,
            depth: depth
        };
    }

    // ========================================
    // PATH TRANSFORMATION
    // ========================================
    function transformPath(pathStr, letterX, letterY, letterZ, letterScale) {
        const { x: rx, y: ry, z: rz } = state.rotation;
        const commands = pathStr.match(/[MLQC]|[-\d.]+/g);
        if (!commands) return '';

        let result = [];
        let i = 0;

        while (i < commands.length) {
            const cmd = commands[i];
            if (cmd.match(/[MLQC]/)) {
                result.push(cmd);
                i++;
            } else {
                // Parse coordinate pairs
                const localX = (parseFloat(cmd) - 50) * letterScale;
                const localY = (parseFloat(commands[i + 1]) - 50) * letterScale;

                // Apply 3D position
                const worldX = letterX + localX;
                const worldY = letterY + localY;
                const worldZ = letterZ;

                // Project to 2D
                const proj = project3D(worldX, worldY, worldZ, rx, ry, rz);

                result.push(proj.x.toFixed(2));
                result.push(proj.y.toFixed(2));
                i += 2;
            }
        }

        return result.join(' ');
    }

    // ========================================
    // COLOR UTILITIES
    // ========================================
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 255, b: 255 };
    }

    function lerpColor(c1, c2, t) {
        const rgb1 = hexToRgb(c1);
        const rgb2 = hexToRgb(c2);
        const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
        const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
        const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);
        return `rgb(${r},${g},${b})`;
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

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
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    function hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
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
        return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
    }

    function shiftHue(hexColor, degrees) {
        const rgb = hexToRgb(hexColor);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        hsl.h = (hsl.h + degrees + 360) % 360;
        return hslToRgb(hsl.h, hsl.s, hsl.l);
    }

    // ========================================
    // RENDER
    // ========================================
    function render() {
        // Clear previous render
        renderGroup.innerHTML = '';

        const viewportRect = canvas.getBoundingClientRect();
        const centerX = viewportRect.width / 2;
        const centerY = viewportRect.height / 2;

        // Apply centering, pan, and zoom via SVG transform
        renderGroup.setAttribute('transform',
            `translate(${centerX + state.panX}, ${centerY + state.panY}) scale(${state.zoom})`);

        // Collect all paths with depth for sorting
        const allPaths = [];

        // Process each letter
        state.letters.forEach((letter, letterIndex) => {
            const paths = LETTER_PATHS[letter.char] || LETTER_PATHS['C'];

            // Calculate letter center depth for sorting
            const centerProj = project3D(letter.x, letter.y, letter.z,
                state.rotation.x, state.rotation.y, state.rotation.z);

            // Generate concentric layers
            for (let layer = state.concentric - 1; layer >= 0; layer--) {
                const layerT = layer / Math.max(state.concentric - 1, 1);
                const offset = layer * state.layerOffset;
                const opacity = 0.15 + (1 - layerT) * 0.85;
                // Use oscillated colors if enabled
                const primary = state._oscillatedPrimary || state.colorPrimary;
                const secondary = state._oscillatedSecondary || state.colorSecondary;
                const color = lerpColor(primary, secondary, layerT);
                const strokeW = state.strokeWidth + layer * 0.3;

                paths.forEach((pathStr, pathIndex) => {
                    // Transform path with offset applied to scale
                    const offsetScale = letter.scale + offset * 0.02;
                    const transformedPath = transformPath(
                        pathStr,
                        letter.x,
                        letter.y,
                        letter.z + offset * 5,
                        offsetScale
                    );

                    allPaths.push({
                        d: transformedPath,
                        depth: centerProj.depth + layer * 5,
                        color: color,
                        opacity: opacity,
                        strokeWidth: strokeW,
                        layer: layer,
                        letterIndex: letterIndex,
                        pathIndex: pathIndex
                    });
                });
            }
        });

        // Sort by depth (back to front)
        allPaths.sort((a, b) => b.depth - a.depth);

        // Determine glow filter
        let filterAttr = '';
        if (state.glowIntensity > 70) {
            filterAttr = 'url(#glow-intense)';
        } else if (state.glowIntensity > 35) {
            filterAttr = 'url(#glow-medium)';
        } else if (state.glowIntensity > 0) {
            filterAttr = 'url(#glow-soft)';
        }

        // Calculate draw-on dash parameters
        const totalLength = 1000; // Approximate path length

        // Render all paths
        allPaths.forEach((pathData, index) => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathData.d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', pathData.color);
            path.setAttribute('stroke-width', pathData.strokeWidth);
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('opacity', pathData.opacity);

            if (filterAttr && pathData.layer === 0) {
                path.setAttribute('filter', filterAttr);
            }

            // Draw-on animation with beam sweep effect
            if (state.drawOn) {
                // Calculate per-path progress based on letter and path index
                const letterProgress = pathData.letterIndex / 8;
                const pathProgress = pathData.pathIndex / 5;
                const combinedProgress = letterProgress * 0.7 + pathProgress * 0.3;
                const adjustedProgress = (state.drawProgress - combinedProgress) * 3;

                if (adjustedProgress <= 0) {
                    path.setAttribute('opacity', '0');
                } else if (adjustedProgress < 1) {
                    const dashLength = totalLength * Math.min(adjustedProgress, 1);
                    path.setAttribute('stroke-dasharray', `${dashLength} ${totalLength}`);
                    // Beam head glow - brighter at drawing point
                    const beamGlow = Math.sin(adjustedProgress * Math.PI) * 0.5;
                    path.setAttribute('opacity', pathData.opacity * (0.5 + beamGlow));
                }
            }

            renderGroup.appendChild(path);
        });

        // Add beam head indicator when drawing
        if (state.drawOn && state.drawProgress < 1) {
            const beamLetterIndex = Math.floor(state.drawProgress * 8);
            const beamLetter = state.letters[Math.min(beamLetterIndex, 7)];
            const beamProj = project3D(beamLetter.x, beamLetter.y, beamLetter.z,
                state.rotation.x, state.rotation.y, state.rotation.z);

            const beamHead = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            beamHead.setAttribute('cx', beamProj.x);
            beamHead.setAttribute('cy', beamProj.y);
            beamHead.setAttribute('r', 6 + Math.sin(state.beamPhase * 10) * 2);
            beamHead.setAttribute('fill', state.colorPrimary);
            beamHead.setAttribute('filter', 'url(#glow-intense)');
            beamHead.setAttribute('opacity', '0.95');
            renderGroup.appendChild(beamHead);
        }

        // Update stats
        statsEl.textContent = `Paths: ${allPaths.length} | FPS: ${Math.round(fps)}`;
    }

    // ========================================
    // ANIMATION LOOP
    // ========================================
    function animate(time) {
        const delta = (time - lastTime) / 1000;
        lastTime = time;

        // FPS calculation
        frameCount++;
        fpsTime += delta;
        if (fpsTime >= 1) {
            fps = frameCount / fpsTime;
            frameCount = 0;
            fpsTime = 0;
        }

        // Modulation system update (LFOs, ASRs, routing)
        const deltaMs = delta * 1000;
        if (CYMATICA.mod) {
            CYMATICA.mod.lfo?.update(deltaMs);
            CYMATICA.mod.asr?.update(deltaMs);
            CYMATICA.mod.hub?.update(deltaMs);
        }

        // Auto-rotation when animating and not dragging
        if (state.animating && !state.isDragging) {
            state.targetRotation.x += state.rotSpeed.x * delta * state.animSpeed;
            state.targetRotation.y += state.rotSpeed.y * delta * state.animSpeed;
            state.targetRotation.z += state.rotSpeed.z * delta * state.animSpeed;
        }

        // Smooth lerp from rotation toward targetRotation
        const lerp = state.lerpFactor;
        state.rotation.x += (state.targetRotation.x - state.rotation.x) * lerp;
        state.rotation.y += (state.targetRotation.y - state.rotation.y) * lerp;
        state.rotation.z += (state.targetRotation.z - state.rotation.z) * lerp;

        // Smooth lerp for zoom
        state.zoom += (state.targetZoom - state.zoom) * state.zoomLerp;

        // Smooth lerp for pan
        state.panX += (state.targetPanX - state.panX) * state.panLerp;
        state.panY += (state.targetPanY - state.panY) * state.panLerp;

        // Draw-on progress and beam phase
        if (state.drawOn) {
            if (state.drawProgress < 1) {
                state.drawProgress += delta / state.drawSpeed;
                if (state.drawProgress >= 1) {
                    state.drawProgress = 1;
                    // Loop after a brief pause
                    if (state.drawLoop) {
                        setTimeout(() => {
                            if (state.drawOn && state.drawLoop) {
                                state.drawProgress = 0;
                            }
                        }, 500);
                    }
                }
            }
        }

        // Update beam phase for pulsing effect
        state.beamPhase += delta * 5;

        // Color oscillation
        if (state.colorOscillate) {
            const oscillation = Math.sin(state.beamPhase * state.oscillateSpeed * 0.5);
            // Shift hue of primary color
            state._oscillatedPrimary = shiftHue(state.colorPrimary, oscillation * 30);
            state._oscillatedSecondary = shiftHue(state.colorSecondary, -oscillation * 30);
        } else {
            state._oscillatedPrimary = state.colorPrimary;
            state._oscillatedSecondary = state.colorSecondary;
        }

        render();
        requestAnimationFrame(animate);
    }

    // Resize handler
    function handleResize() {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    }

    // Init render module
    function init() {
        canvas = $('#vector-canvas');
        renderGroup = $('#render-group');
        statsEl = $('#stats');
        scanlinesEl = $('#scanlines');
        vignetteEl = $('#vignette');

        window.addEventListener('resize', handleResize);
        handleResize();
    }

    CYMATICA.render = { init, render, animate, handleResize };
})(window.CYMATICA);
