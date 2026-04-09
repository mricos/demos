/**
 * Strahl.Renderer.SVG — Renders a Strahl scene to an SVG element
 *
 * Takes a scene + camera state, produces SVG path elements.
 * The only file that touches the DOM.
 */
(function(Strahl) {
    'use strict';

    const Math3D = Strahl.Math3D;

    /**
     * Create an SVG renderer
     * @param {SVGElement} svgElement - Target SVG element
     * @param {SVGGElement} renderGroup - Group element to render into
     * @param {object} options
     * @param {number} [options.concentric=1] - Number of concentric layers per path
     * @param {number} [options.layerOffset=2] - Offset between concentric layers
     * @returns {object} Renderer API
     */
    function create(svgElement, renderGroup, options = {}) {
        const config = {
            concentric: options.concentric ?? 1,
            layerOffset: options.layerOffset ?? 2,
            strokeWidth: options.strokeWidth ?? 1.5,
            glowIntensity: options.glowIntensity ?? 60,
            colorPrimary: options.colorPrimary ?? '#00ffff',
            colorSecondary: options.colorSecondary ?? '#ff00aa'
        };

        // Reusable path pool to avoid DOM churn
        let pooledPaths = [];
        let poolIndex = 0;

        function acquirePath() {
            if (poolIndex < pooledPaths.length) {
                return pooledPaths[poolIndex++];
            }
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            pooledPaths.push(path);
            poolIndex++;
            return path;
        }

        function resetPool() {
            poolIndex = 0;
        }

        function flushPool() {
            // Remove unused paths from DOM
            while (renderGroup.children.length > poolIndex) {
                renderGroup.removeChild(renderGroup.lastChild);
            }
            // Append new paths that aren't in DOM yet
            for (let i = 0; i < poolIndex; i++) {
                if (pooledPaths[i].parentNode !== renderGroup) {
                    renderGroup.appendChild(pooledPaths[i]);
                }
            }
        }

        // Color utilities
        function hexToRgb(hex) {
            const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [0, 255, 255];
        }

        function lerpColor(c1, c2, t) {
            const a = hexToRgb(c1), b = hexToRgb(c2);
            const r = Math.round(a[0] + (b[0] - a[0]) * t);
            const g = Math.round(a[1] + (b[1] - a[1]) * t);
            const bl = Math.round(a[2] + (b[2] - a[2]) * t);
            return `rgb(${r},${g},${bl})`;
        }

        /**
         * Render a scene with given camera parameters
         * @param {object} scene - Strahl.Scene instance
         * @param {object} camera - Camera state
         * @param {object} camera.rotation - {x, y, z} in degrees
         * @param {number} camera.fov
         * @param {number} camera.cameraZ
         * @param {number} camera.zoom
         * @param {number} camera.panX
         * @param {number} camera.panY
         * @param {object} [style] - Override style
         */
        function render(scene, camera, style) {
            const rx = camera.rotation.x;
            const ry = camera.rotation.y;
            const rz = camera.rotation.z;
            const fov = camera.fov;
            const camZ = camera.cameraZ;

            const primary = style?.colorPrimary ?? config.colorPrimary;
            const secondary = style?.colorSecondary ?? config.colorSecondary;
            const concentric = style?.concentric ?? config.concentric;
            const layerOff = style?.layerOffset ?? config.layerOffset;
            const baseStroke = style?.strokeWidth ?? config.strokeWidth;
            const glowInt = style?.glowIntensity ?? config.glowIntensity;

            // Center transform
            const rect = svgElement.getBoundingClientRect();
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            renderGroup.setAttribute('transform',
                `translate(${cx + (camera.panX || 0)}, ${cy + (camera.panY || 0)}) scale(${camera.zoom || 1})`);

            // Flatten scene to world-space path nodes
            const flat = scene.flatten();

            // Build render list with depth sorting
            const renderList = [];

            for (const entry of flat) {
                const node = entry.node;
                const centerProj = Math3D.project(
                    entry.worldX, entry.worldY, entry.worldZ,
                    rx, ry, rz, fov, camZ
                );

                for (let layer = concentric - 1; layer >= 0; layer--) {
                    const layerT = layer / Math.max(concentric - 1, 1);
                    const offset = layer * layerOff;
                    const opacity = 0.15 + (1 - layerT) * 0.85;
                    const color = node.style?.color ?? lerpColor(primary, secondary, layerT);
                    const strokeW = (node.style?.strokeWidth ?? baseStroke) + layer * 0.3;

                    for (let pi = 0; pi < node.paths.length; pi++) {
                        const offsetScale = entry.worldScale + offset * 0.02;
                        const d = Math3D.transformPath(
                            node.paths[pi],
                            entry.worldX, entry.worldY, entry.worldZ + offset * 5,
                            offsetScale,
                            rx, ry, rz, fov, camZ,
                            node.pathCenter
                        );

                        renderList.push({
                            d,
                            depth: centerProj.depth + layer * 5,
                            color,
                            opacity: node.style?.opacity ?? opacity,
                            strokeWidth: strokeW,
                            layer,
                            glow: layer === 0
                        });
                    }
                }
            }

            // Sort back-to-front
            renderList.sort((a, b) => b.depth - a.depth);

            // Determine glow filter
            let filterAttr = '';
            if (glowInt > 70) filterAttr = 'url(#glow-intense)';
            else if (glowInt > 35) filterAttr = 'url(#glow-medium)';
            else if (glowInt > 0) filterAttr = 'url(#glow-soft)';

            // Render
            resetPool();

            for (const item of renderList) {
                const path = acquirePath();
                path.setAttribute('d', item.d);
                path.setAttribute('stroke', item.color);
                path.setAttribute('stroke-width', item.strokeWidth);
                path.setAttribute('opacity', item.opacity);
                if (filterAttr && item.glow) {
                    path.setAttribute('filter', filterAttr);
                } else {
                    path.removeAttribute('filter');
                }
            }

            flushPool();

            return renderList.length;
        }

        /**
         * Clear all rendered content
         */
        function clear() {
            while (renderGroup.firstChild) {
                renderGroup.removeChild(renderGroup.firstChild);
            }
            pooledPaths = [];
            poolIndex = 0;
        }

        /**
         * Update renderer config
         */
        function configure(opts) {
            Object.assign(config, opts);
        }

        /**
         * Handle viewport resize
         */
        function resize() {
            const rect = svgElement.getBoundingClientRect();
            svgElement.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
        }

        return { render, clear, configure, resize, config };
    }

    Strahl.Renderer = Strahl.Renderer || {};
    Strahl.Renderer.SVG = { create };

})(window.Strahl);
