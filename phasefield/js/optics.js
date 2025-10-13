/**
 * Phase Field Optics Module
 * Physics calculations for ray tracing, blocking, refraction, and diffraction
 */

window.FP = window.FP || {};

window.FP.Optics = (function() {
    'use strict';

    const Matter = window.FP.Matter;

    // Collection of all optical elements in the scene
    let elements = [];

    /**
     * Add an optical element to the scene
     */
    function addElement(element) {
        if (element instanceof Matter.OpticalElement) {
            elements.push(element);
            return elements.length - 1;  // Return index
        }
        throw new Error('Element must be an instance of OpticalElement');
    }

    /**
     * Remove an optical element by index
     */
    function removeElement(index) {
        if (index >= 0 && index < elements.length) {
            elements.splice(index, 1);
        }
    }

    /**
     * Get element by index
     */
    function getElement(index) {
        return elements[index];
    }

    /**
     * Get all elements
     */
    function getAllElements() {
        return elements;
    }

    /**
     * Clear all elements
     */
    function clearElements() {
        elements = [];
    }

    /**
     * Replace all elements
     */
    function setElements(newElements) {
        elements = newElements.filter(e => e instanceof Matter.OpticalElement);
    }

    /**
     * Check if a ray from (x1, y1) to (x2, y2) is blocked by any optical element
     * Returns: {
     *   blocked: boolean,
     *   element: OpticalElement | null,
     *   intersection: {x, y} | null,
     *   type: 'block' | 'refract' | 'reflect' | null,
     *   phaseShift: number | null
     * }
     */
    function traceRay(x1, y1, x2, y2) {
        let closestHit = {
            blocked: false,
            element: null,
            intersection: null,
            type: null,
            phaseShift: null,
            distance: Infinity
        };

        for (const element of elements) {
            const result = element.checkRayIntersection(x1, y1, x2, y2);

            if (result.blocked || result.type === 'refract') {
                // Calculate distance to intersection
                const dx = result.intersection.x - x1;
                const dy = result.intersection.y - y1;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Keep closest intersection
                if (dist < closestHit.distance) {
                    closestHit = {
                        blocked: result.blocked,
                        element: element,
                        intersection: result.intersection,
                        type: result.type,
                        phaseShift: result.phaseShift || null,
                        distance: dist
                    };
                }
            }
        }

        return closestHit;
    }

    /**
     * Check if a point (x, y) is inside any blocking element
     * Used for optimizing calculations - points inside matter should have zero field
     */
    function isPointInMatter(x, y) {
        for (const element of elements) {
            // Only check blocking elements (not lenses)
            if (element.type === Matter.ElementType.WALL ||
                element.type === Matter.ElementType.MIRROR) {

                const bounds = element.getBounds();

                // Quick bounds check first
                if (x < bounds.minX || x > bounds.maxX ||
                    y < bounds.minY || y > bounds.maxY) {
                    continue;
                }

                // Detailed check: is point inside the element?
                // Transform point to element's local coordinates
                const cos = Math.cos(-element.angle);
                const sin = Math.sin(-element.angle);
                const dx = x - element.x;
                const dy = y - element.y;
                const localX = dx * cos - dy * sin;
                const localY = dx * sin + dy * cos;

                // Check if inside element bounds
                if (Math.abs(localX) <= element.thickness / 2 &&
                    Math.abs(localY) <= element.length / 2) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Calculate effective wave contribution from a source, considering optical elements
     * Returns: {
     *   amplitude: number,  // 0-1 based on reflection coefficient
     *   phase: number       // Modified phase if optical element present
     * }
     */
    function calculateOpticalPath(sourceX, sourceY, targetX, targetY, basePhase) {
        const hit = traceRay(sourceX, sourceY, targetX, targetY);

        if (hit.blocked && hit.type === 'block') {
            // Ray blocked by opaque element - completely blocked (amplitude = 0)
            // The reflection coefficient affects the visual appearance of the element,
            // but does NOT make blocked rays pass through
            return { amplitude: 0, phase: basePhase };
        }

        if (hit.type === 'refract' && hit.phaseShift !== null) {
            // Ray passes through refractive element (lens)
            // Phase is modified by lens, amplitude reduced by absorption
            const reflCoeff = hit.element ? hit.element.reflectionCoefficient : 0.1;
            const transmission = 1.0 - reflCoeff;
            return {
                amplitude: transmission,
                phase: basePhase + hit.phaseShift
            };
        }

        // Ray reaches target unimpeded
        return { amplitude: 1, phase: basePhase };
    }

    /**
     * Create a double-slit aperture
     */
    function createDoubleSlit(x, y, angle, slitWidth, slitSeparation, barrierLength) {
        return new Matter.Aperture(x, y, angle, barrierLength, 8, {
            slitCount: 2,
            slitWidth: slitWidth,
            slitSeparation: slitSeparation,
            particleSize: 8
        });
    }

    /**
     * Create a single-slit aperture
     */
    function createSingleSlit(x, y, angle, slitWidth, barrierLength) {
        return new Matter.Aperture(x, y, angle, barrierLength, 8, {
            slitCount: 1,
            slitWidth: slitWidth,
            slitSeparation: 0,
            particleSize: 8
        });
    }

    /**
     * Create a simple wall
     */
    function createWall(x, y, angle, length, thickness) {
        return new Matter.Wall(x, y, angle, length, thickness);
    }

    /**
     * Create a lens
     */
    function createLens(x, y, angle, diameter, focalLength) {
        return new Matter.Lens(x, y, angle, diameter, focalLength);
    }

    /**
     * Create a diffraction grating
     */
    function createGrating(x, y, angle, length, period, slitWidth) {
        return new Matter.Grating(x, y, angle, length, period, slitWidth);
    }

    /**
     * Create a mirror
     */
    function createMirror(x, y, angle, length, thickness) {
        return new Matter.Mirror(x, y, angle, length, thickness);
    }

    /**
     * Optimize element list by spatial partitioning (for future optimization)
     */
    function buildSpatialIndex() {
        // TODO: Implement spatial partitioning for large numbers of elements
        // For now, simple linear search is sufficient
    }

    return {
        // Element management
        addElement,
        removeElement,
        getElement,
        getAllElements,
        clearElements,
        setElements,

        // Physics calculations
        traceRay,
        isPointInMatter,
        calculateOpticalPath,

        // Factory functions
        createDoubleSlit,
        createSingleSlit,
        createWall,
        createLens,
        createGrating,
        createMirror,

        // Optimization
        buildSpatialIndex
    };
})();
