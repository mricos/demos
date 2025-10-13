/**
 * Phase Field Matter Module
 * Defines physical optical elements: walls, apertures, lenses, gratings, mirrors
 */

window.FP = window.FP || {};

window.FP.Matter = (function() {
    'use strict';

    // Element types
    const ElementType = {
        WALL: 'wall',           // Opaque barrier
        APERTURE: 'aperture',   // Double-slit or single-slit
        LENS: 'lens',           // Converging or diverging
        GRATING: 'grating',     // Diffraction grating
        MIRROR: 'mirror'        // Reflective surface
    };

    /**
     * Base class for all optical elements
     */
    class OpticalElement {
        constructor(x, y, angle = 0, reflectionCoefficient = 0.5) {
            this.x = x;
            this.y = y;
            this.angle = angle;
            this.type = null;
            // Reflection coefficient:
            // 0.0 = blackbody absorber (absorbs all light)
            // 1.0 = perfect reflection (reflects all light)
            // 1.0-2.0 = wavelength-dependent reflection (future: color spreads)
            this.reflectionCoefficient = reflectionCoefficient;
        }

        /**
         * Check if a ray from (x1,y1) to (x2,y2) is blocked by this element
         * Returns: {blocked: boolean, intersection: {x, y}, type: 'block'|'refract'|'reflect'}
         */
        checkRayIntersection(x1, y1, x2, y2) {
            throw new Error('checkRayIntersection must be implemented by subclass');
        }

        /**
         * Get bounds for optimization
         */
        getBounds() {
            return {
                minX: this.x - 100,
                maxX: this.x + 100,
                minY: this.y - 100,
                maxY: this.y + 100
            };
        }
    }

    /**
     * Wall - Opaque barrier that completely blocks waves
     */
    class Wall extends OpticalElement {
        constructor(x, y, angle, length, thickness, reflectionCoefficient = 0.5) {
            super(x, y, angle, reflectionCoefficient);
            this.type = ElementType.WALL;
            this.length = length;
            this.thickness = thickness;
            this.curvature = 0;  // Radius of curvature (0 = flat)
        }

        checkRayIntersection(x1, y1, x2, y2) {
            // Transform ray endpoints to wall's local coordinate system
            const cos = Math.cos(-this.angle);
            const sin = Math.sin(-this.angle);

            // Transform source point
            const dx1 = x1 - this.x;
            const dy1 = y1 - this.y;
            const localX1 = dx1 * cos - dy1 * sin;
            const localY1 = dx1 * sin + dy1 * cos;

            // Transform destination point
            const dx2 = x2 - this.x;
            const dy2 = y2 - this.y;
            const localX2 = dx2 * cos - dy2 * sin;
            const localY2 = dx2 * sin + dy2 * cos;

            // Wall occupies: -thickness/2 <= localX <= +thickness/2, -length/2 <= localY <= +length/2
            // Check if ray crosses this region

            // Check if both points on same side of wall
            if ((localX1 < -this.thickness/2 && localX2 < -this.thickness/2) ||
                (localX1 > this.thickness/2 && localX2 > this.thickness/2)) {
                return { blocked: false };
            }

            // Calculate intersection with wall plane (localX = 0)
            const t = -localX1 / (localX2 - localX1);
            if (t < 0 || t > 1) {
                return { blocked: false };  // Intersection not between endpoints
            }

            const intersectY = localY1 + t * (localY2 - localY1);

            // Check if intersection is within wall bounds
            if (Math.abs(intersectY) <= this.length / 2) {
                // Transform intersection back to world coordinates
                const worldX = this.x + intersectY * Math.sin(this.angle);
                const worldY = this.y - intersectY * Math.cos(this.angle);

                return {
                    blocked: true,
                    intersection: { x: worldX, y: worldY },
                    type: 'block'
                };
            }

            return { blocked: false };
        }

        getBounds() {
            const halfLen = this.length / 2;
            const halfThick = this.thickness / 2;
            const cos = Math.cos(this.angle);
            const sin = Math.sin(this.angle);

            // Calculate corner positions
            const corners = [
                [-halfThick, -halfLen],
                [halfThick, -halfLen],
                [halfThick, halfLen],
                [-halfThick, halfLen]
            ].map(([lx, ly]) => ({
                x: this.x + lx * cos - ly * sin,
                y: this.y + lx * sin + ly * cos
            }));

            return {
                minX: Math.min(...corners.map(c => c.x)),
                maxX: Math.max(...corners.map(c => c.x)),
                minY: Math.min(...corners.map(c => c.y)),
                maxY: Math.max(...corners.map(c => c.y))
            };
        }
    }

    /**
     * Aperture - Opening with multiple slits (1-9, placed middle-out)
     */
    class Aperture extends OpticalElement {
        constructor(x, y, angle, length, thickness, config, reflectionCoefficient = 0.5) {
            super(x, y, angle, reflectionCoefficient);
            this.type = ElementType.APERTURE;
            this.length = length;           // Total fixed length (endpoints don't change)
            this.thickness = thickness;     // Thickness of barrier material
            this.slitCount = config.slitCount || 2;  // 1-9 slits
            this.slitWidth = config.slitWidth || 20;
            this.slitSeparation = config.slitSeparation || 80;
            this.particleSize = config.particleSize || 8;
            this.curvature = 0;            // Radius of curvature (0 = flat)
        }

        checkRayIntersection(x1, y1, x2, y2) {
            // Transform to local coordinates
            const cos = Math.cos(-this.angle);
            const sin = Math.sin(-this.angle);

            const dx1 = x1 - this.x;
            const dy1 = y1 - this.y;
            const localX1 = dx1 * cos - dy1 * sin;
            const localY1 = dx1 * sin + dy1 * cos;

            const dx2 = x2 - this.x;
            const dy2 = y2 - this.y;
            const localX2 = dx2 * cos - dy2 * sin;
            const localY2 = dx2 * sin + dy2 * cos;

            // Check if ray crosses the aperture plane
            if ((localX1 < 0 && localX2 < 0) || (localX1 > 0 && localX2 > 0)) {
                return { blocked: false };
            }

            // Calculate intersection Y coordinate
            const t = -localX1 / (localX2 - localX1);
            if (t < 0 || t > 1) {
                return { blocked: false };
            }

            const intersectY = localY1 + t * (localY2 - localY1);

            // Calculate slit positions (same as getParticlePositions)
            const slitPositions = [];
            if (this.slitCount === 1) {
                slitPositions.push(0);
            } else if (this.slitCount % 2 === 1) {
                // Odd: center slit + symmetric pairs
                slitPositions.push(0);
                for (let i = 1; i <= Math.floor(this.slitCount / 2); i++) {
                    slitPositions.push(i * (this.slitWidth * 2));
                    slitPositions.push(-i * (this.slitWidth * 2));
                }
            } else {
                // Even: symmetric pairs on either side
                for (let i = 0; i < this.slitCount / 2; i++) {
                    const offset = (i + 0.5) * (this.slitWidth * 2);
                    slitPositions.push(offset);
                    slitPositions.push(-offset);
                }
            }

            // Check if ray passes through any slit
            for (const center of slitPositions) {
                if (intersectY >= center - this.slitWidth/2 &&
                    intersectY <= center + this.slitWidth/2) {
                    return { blocked: false };  // Passes through a slit
                }
            }

            // Check if within barrier material bounds (use fixed length)
            if (Math.abs(intersectY) <= this.length / 2) {
                return {
                    blocked: true,
                    intersection: {
                        x: this.x + intersectY * Math.sin(this.angle),
                        y: this.y - intersectY * Math.cos(this.angle)
                    },
                    type: 'block'
                };
            }

            return { blocked: false };
        }

        /**
         * Get positions of material particles for rendering
         */
        getParticlePositions() {
            const particles = [];
            const halfLen = this.length / 2;

            // Calculate slit positions (middle-out)
            const slitPositions = [];
            if (this.slitCount === 1) {
                slitPositions.push(0);
            } else if (this.slitCount % 2 === 1) {
                // Odd: center slit + symmetric pairs
                slitPositions.push(0);
                for (let i = 1; i <= Math.floor(this.slitCount / 2); i++) {
                    slitPositions.push(i * (this.slitWidth * 2));  // slit + gap
                    slitPositions.push(-i * (this.slitWidth * 2));
                }
            } else {
                // Even: symmetric pairs on either side
                for (let i = 0; i < this.slitCount / 2; i++) {
                    const offset = (i + 0.5) * (this.slitWidth * 2);
                    slitPositions.push(offset);
                    slitPositions.push(-offset);
                }
            }

            // Generate particles by scanning from -halfLen to +halfLen
            // Skip regions that are inside any slit
            for (let y = -halfLen; y < halfLen; y += this.particleSize) {
                let insideSlit = false;
                for (const center of slitPositions) {
                    if (y >= center - this.slitWidth/2 && y <= center + this.slitWidth/2) {
                        insideSlit = true;
                        break;
                    }
                }
                if (!insideSlit) {
                    particles.push({ localX: 0, localY: y });
                }
            }

            // Transform to world coordinates
            const cos = Math.cos(this.angle);
            const sin = Math.sin(this.angle);

            return particles.map(p => ({
                x: this.x + p.localX * cos - p.localY * sin,
                y: this.y + p.localX * sin + p.localY * cos,
                localX: p.localX,
                localY: p.localY
            }));
        }
    }

    /**
     * Lens - Refractive element (converging or diverging)
     */
    class Lens extends OpticalElement {
        constructor(x, y, angle, length, focalLength, reflectionCoefficient = 0.1) {
            super(x, y, angle, reflectionCoefficient);
            this.type = ElementType.LENS;
            this.length = length;
            this.focalLength = focalLength;  // +ve = converging, -ve = diverging
            this.thickness = 4;  // Thin lens approximation
        }

        checkRayIntersection(x1, y1, x2, y2) {
            // Transform to local coordinates
            const cos = Math.cos(-this.angle);
            const sin = Math.sin(-this.angle);

            const dx1 = x1 - this.x;
            const dy1 = y1 - this.y;
            const localX1 = dx1 * cos - dy1 * sin;
            const localY1 = dx1 * sin + dy1 * cos;

            const dx2 = x2 - this.x;
            const dy2 = y2 - this.y;
            const localX2 = dx2 * cos - dy2 * sin;
            const localY2 = dx2 * sin + dy2 * cos;

            // Check if ray crosses lens plane
            if ((localX1 < 0 && localX2 < 0) || (localX1 > 0 && localX2 > 0)) {
                return { blocked: false };
            }

            const t = -localX1 / (localX2 - localX1);
            if (t < 0 || t > 1) {
                return { blocked: false };
            }

            const intersectY = localY1 + t * (localY2 - localY1);

            // Check if within lens aperture
            if (Math.abs(intersectY) <= this.length / 2) {
                return {
                    blocked: false,  // Lenses don't block, they refract
                    intersection: {
                        x: this.x + intersectY * Math.sin(this.angle),
                        y: this.y - intersectY * Math.cos(this.angle)
                    },
                    type: 'refract',
                    phaseShift: this.calculatePhaseShift(intersectY)
                };
            }

            return { blocked: false };
        }

        /**
         * Calculate phase shift for a ray passing through at distance y from center
         */
        calculatePhaseShift(localY) {
            // Thin lens phase shift: phi(y) = -k * y^2 / (2f)
            // where k is wave number and f is focal length
            // For simplicity, we'll return a normalized shift
            if (this.focalLength === 0) return 0;
            return -(localY * localY) / (2 * this.focalLength);
        }
    }

    /**
     * Grating - Periodic structure for diffraction
     */
    class Grating extends OpticalElement {
        constructor(x, y, angle, length, period, slitWidth, reflectionCoefficient = 0.5) {
            super(x, y, angle, reflectionCoefficient);
            this.type = ElementType.GRATING;
            this.length = length;
            this.period = period;      // Spacing between slits
            this.slitWidth = slitWidth;  // Width of each transparent slit
            this.lineWidth = period - slitWidth;  // Width of opaque lines
        }

        checkRayIntersection(x1, y1, x2, y2) {
            // Transform to local coordinates
            const cos = Math.cos(-this.angle);
            const sin = Math.sin(-this.angle);

            const dx1 = x1 - this.x;
            const dy1 = y1 - this.y;
            const localX1 = dx1 * cos - dy1 * sin;
            const localY1 = dx1 * sin + dy1 * cos;

            const dx2 = x2 - this.x;
            const dy2 = y2 - this.y;
            const localX2 = dx2 * cos - dy2 * sin;
            const localY2 = dx2 * sin + dy2 * cos;

            // Check if ray crosses grating plane
            if ((localX1 < 0 && localX2 < 0) || (localX1 > 0 && localX2 > 0)) {
                return { blocked: false };
            }

            const t = -localX1 / (localX2 - localX1);
            if (t < 0 || t > 1) {
                return { blocked: false };
            }

            const intersectY = localY1 + t * (localY2 - localY1);

            // Check if within grating bounds
            if (Math.abs(intersectY) > this.length / 2) {
                return { blocked: false };
            }

            // Determine if ray hits a transparent slit or opaque line
            const posInPeriod = ((intersectY + this.length/2) % this.period + this.period) % this.period;

            if (posInPeriod < this.slitWidth) {
                // Passes through transparent slit
                return { blocked: false };
            } else {
                // Hits opaque line
                return {
                    blocked: true,
                    intersection: {
                        x: this.x + intersectY * Math.sin(this.angle),
                        y: this.y - intersectY * Math.cos(this.angle)
                    },
                    type: 'block'
                };
            }
        }

        /**
         * Get line positions for rendering
         */
        getLinePositions() {
            const lines = [];
            const halfLen = this.length / 2;

            for (let y = -halfLen; y < halfLen; y += this.period) {
                lines.push({
                    localY: y,
                    width: this.lineWidth
                });
            }

            return lines;
        }
    }

    /**
     * Mirror - Reflective surface
     */
    class Mirror extends OpticalElement {
        constructor(x, y, angle, length, thickness, reflectionCoefficient = 1.0) {
            super(x, y, angle, reflectionCoefficient);
            this.type = ElementType.MIRROR;
            this.length = length;
            this.thickness = thickness;
        }

        checkRayIntersection(x1, y1, x2, y2) {
            // Similar to wall but returns 'reflect' instead of 'block'
            const cos = Math.cos(-this.angle);
            const sin = Math.sin(-this.angle);

            const dx1 = x1 - this.x;
            const dy1 = y1 - this.y;
            const localX1 = dx1 * cos - dy1 * sin;
            const localY1 = dx1 * sin + dy1 * cos;

            const dx2 = x2 - this.x;
            const dy2 = y2 - this.y;
            const localX2 = dx2 * cos - dy2 * sin;
            const localY2 = dx2 * sin + dy2 * cos;

            if ((localX1 < 0 && localX2 < 0) || (localX1 > 0 && localX2 > 0)) {
                return { blocked: false };
            }

            const t = -localX1 / (localX2 - localX1);
            if (t < 0 || t > 1) {
                return { blocked: false };
            }

            const intersectY = localY1 + t * (localY2 - localY1);

            if (Math.abs(intersectY) <= this.length / 2) {
                return {
                    blocked: true,  // For now, mirrors block (reflection not yet implemented)
                    intersection: {
                        x: this.x + intersectY * Math.sin(this.angle),
                        y: this.y - intersectY * Math.cos(this.angle)
                    },
                    type: 'reflect'
                };
            }

            return { blocked: false };
        }
    }

    return {
        ElementType,
        OpticalElement,
        Wall,
        Aperture,
        Lens,
        Grating,
        Mirror
    };
})();
