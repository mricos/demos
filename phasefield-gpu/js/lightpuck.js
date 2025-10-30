/**
 * Light Puck Module
 * Handles photon packet shooting with parabolic reflection and color dispersion
 */

window.FP = window.FP || {};

window.FP.LightPuck = (function() {
    'use strict';

    const Config = window.FP.Config;
    const Optics = window.FP.Optics;
    const Matter = window.FP.Matter;

    // Light puck state
    const pucks = [];  // Active light pucks
    let ghostPuck = null;  // Visual indicator for placed puck (before launch)

    // Puck configuration
    const PUCK_SPEED = 8;  // Pixels per frame (near speed of light in simulation)
    const PUCK_LIFETIME = 200;  // Frames before puck fades out
    const PUCK_RADIUS = 12;  // Visual size of packet
    const MAX_BOUNCES = 10;  // Maximum number of reflections
    const FLICK_DEADZONE = 0.3;  // Minimum joystick deflection to register flick
    const FLICK_TIMEOUT = 500;  // ms - how long to wait for flick release

    // Photon packet parameters
    const PHOTON_COUNT = 25;  // Number of photons in packet
    const INITIAL_SPREAD = 3;  // Initial spatial spread (px)
    const DISPERSION_RATE = 0.15;  // How fast packet spreads over time
    const WAVELENGTH_SPREAD = 0.3;  // Chromatic dispersion factor

    /**
     * Individual photon within a wave packet
     */
    class Photon {
        constructor(x, y, vx, vy, wavelength, phase) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.wavelength = wavelength;  // 380-750 nm mapped to simulation scale
            this.phase = phase;  // Wave phase
            this.energy = 1.0;  // 0 to 1
            this.dead = false;
        }

        /**
         * Get color from wavelength (visible spectrum)
         */
        getColor() {
            // Map wavelength to RGB (simplified visible spectrum)
            // 380nm (violet) -> 750nm (red)
            const w = this.wavelength;
            let r, g, b;

            if (w < 440) {
                // Violet to Blue
                r = (440 - w) / (440 - 380);
                g = 0;
                b = 1;
            } else if (w < 490) {
                // Blue to Cyan
                r = 0;
                g = (w - 440) / (490 - 440);
                b = 1;
            } else if (w < 510) {
                // Cyan to Green
                r = 0;
                g = 1;
                b = (510 - w) / (510 - 490);
            } else if (w < 580) {
                // Green to Yellow
                r = (w - 510) / (580 - 510);
                g = 1;
                b = 0;
            } else if (w < 645) {
                // Yellow to Red
                r = 1;
                g = (645 - w) / (645 - 580);
                b = 0;
            } else {
                // Red
                r = 1;
                g = 0;
                b = 0;
            }

            // Intensity falloff at ends of spectrum
            let intensity = 1.0;
            if (w < 420) intensity = 0.3 + 0.7 * (w - 380) / (420 - 380);
            if (w > 700) intensity = 0.3 + 0.7 * (750 - w) / (750 - 700);

            return {
                r: Math.round(r * intensity * 255),
                g: Math.round(g * intensity * 255),
                b: Math.round(b * intensity * 255)
            };
        }
    }

    /**
     * Light puck object - wave packet of photons
     */
    class Puck {
        constructor(x, y, vx, vy, color = null) {
            this.centerX = x;
            this.centerY = y;
            this.baseVx = vx;
            this.baseVy = vy;
            this.age = 0;
            this.bounces = 0;
            this.dead = false;

            // Create photon packet with wavelength distribution
            this.photons = [];
            const speed = Math.sqrt(vx * vx + vy * vy);
            const angle = Math.atan2(vy, vx);

            for (let i = 0; i < PHOTON_COUNT; i++) {
                // Gaussian spatial distribution (wave packet)
                const r = this.gaussianRandom() * INITIAL_SPREAD;
                const theta = Math.random() * Math.PI * 2;
                const offsetX = r * Math.cos(theta);
                const offsetY = r * Math.sin(theta);

                // Wavelength distribution (white light = all wavelengths)
                // 380-750 nm visible spectrum
                const wavelength = 380 + Math.random() * 370;

                // Velocity dispersion: different wavelengths travel slightly different speeds
                // Blue travels slightly faster than red (normal dispersion in most materials)
                const speedFactor = 1.0 + (550 - wavelength) / 5000 * WAVELENGTH_SPREAD;
                const photonSpeed = speed * speedFactor;

                // Small angular spread for packet divergence
                const angleSpread = (Math.random() - 0.5) * 0.1;
                const photonAngle = angle + angleSpread;

                const photonVx = Math.cos(photonAngle) * photonSpeed;
                const photonVy = Math.sin(photonAngle) * photonSpeed;

                // Random initial phase
                const phase = Math.random() * Math.PI * 2;

                this.photons.push(new Photon(
                    x + offsetX,
                    y + offsetY,
                    photonVx,
                    photonVy,
                    wavelength,
                    phase
                ));
            }
        }

        /**
         * Box-Muller transform for Gaussian random numbers
         */
        gaussianRandom() {
            const u1 = Math.random();
            const u2 = Math.random();
            return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        }

        /**
         * Update photon packet - each photon moves independently
         */
        update(canvas) {
            if (this.dead) return;

            // Check if lifetime expired
            this.age++;
            if (this.age > PUCK_LIFETIME) {
                this.dead = true;
                return;
            }

            // Update each photon in the packet
            let aliveCount = 0;
            let sumX = 0, sumY = 0;

            // Get elements once for all photons
            const elements = Optics.getAllElements();


            for (const photon of this.photons) {
                if (photon.dead) continue;

                // Add dispersion - packet spreads over time
                // This simulates wave packet uncertainty principle
                const dispersion = this.age * DISPERSION_RATE;
                const disperseAngle = (Math.random() - 0.5) * dispersion * 0.01;
                const angle = Math.atan2(photon.vy, photon.vx) + disperseAngle;
                const speed = Math.sqrt(photon.vx ** 2 + photon.vy ** 2);

                photon.vx = Math.cos(angle) * speed;
                photon.vy = Math.sin(angle) * speed;

                // CHECK COLLISION BEFORE MOVING
                let hitBarrier = false;
                for (const elem of elements) {
                    const hit = this.checkPhotonCollision(photon, elem);
                    if (hit) {
                        this.handlePhotonReflection(photon, hit, elem);
                        hitBarrier = true;
                        break;  // Only process first collision per frame
                    }
                }

                // Move photon ONLY if not reflected (reflection handler already moved it)
                if (!hitBarrier) {
                    photon.x += photon.vx;
                    photon.y += photon.vy;
                }

                // Update phase based on motion
                photon.phase += (speed / photon.wavelength) * 0.5;

                // Check bounds
                if (photon.x < 0 || photon.x > canvas.width ||
                    photon.y < 0 || photon.y > canvas.height) {
                    photon.dead = true;
                    continue;
                }

                aliveCount++;
                sumX += photon.x;
                sumY += photon.y;
            }

            // Update center of mass
            if (aliveCount > 0) {
                this.centerX = sumX / aliveCount;
                this.centerY = sumY / aliveCount;
            } else {
                this.dead = true;
                return;
            }
        }

        /**
         * Check collision for an individual photon with an optical element
         */
        checkPhotonCollision(photon, elem) {

            // Transform photon position to element's local space
            const dx = photon.x - elem.x;
            const dy = photon.y - elem.y;
            const cosA = Math.cos(-elem.angle);
            const sinA = Math.sin(-elem.angle);

            const localX = dx * cosA - dy * sinA;
            const localY = dx * sinA + dy * cosA;

            // Calculate next position
            const nextX = photon.x + photon.vx;
            const nextY = photon.y + photon.vy;

            const nextDx = nextX - elem.x;
            const nextDy = nextY - elem.y;
            const nextLocalX = nextDx * cosA - nextDy * sinA;
            const nextLocalY = nextDx * sinA + nextDy * cosA;

            // Check if crossing the element
            const halfLength = elem.length / 2;
            const halfThickness = elem.thickness / 2;

            // Handle curved barriers
            if (elem.curvature && Math.abs(elem.curvature) > 0.1) {
                return this.checkPhotonCurvedCollision(photon, elem, localX, localY, nextLocalX, nextLocalY);
            }

            // Flat barrier - check if approaching or at the surface
            // Check which side photon is on and if it's moving toward the barrier
            const onLeftSide = localX < -halfThickness;
            const onRightSide = localX > halfThickness;
            const movingRight = nextLocalX > localX;
            const movingLeft = nextLocalX < localX;

            // CRITICAL: Check if photon TUNNELS THROUGH in one frame (moves too fast)
            // This happens when photon jumps from one side to the other completely
            const tunnelsThroughLeftToRight = localX < -halfThickness && nextLocalX > halfThickness;
            const tunnelsThroughRightToLeft = localX > halfThickness && nextLocalX < -halfThickness;
            const tunnelsThrough = tunnelsThroughLeftToRight || tunnelsThroughRightToLeft;

            // Detect if photon will hit the barrier surface on next frame
            const willHitFromLeft = onLeftSide && movingRight && nextLocalX >= -halfThickness;
            const willHitFromRight = onRightSide && movingLeft && nextLocalX <= halfThickness;
            const alreadyInside = Math.abs(localX) <= halfThickness;

            if (willHitFromLeft || willHitFromRight || alreadyInside || tunnelsThrough) {

                // Calculate intersection point at the SURFACE (not inside)
                let intersectY;
                let surfaceLocalX;

                if (tunnelsThroughLeftToRight) {
                    // TUNNELING left to right - hit the LEFT surface first
                    const t = (-halfThickness - localX) / (nextLocalX - localX);
                    intersectY = localY + t * (nextLocalY - localY);
                    surfaceLocalX = -halfThickness;
                } else if (tunnelsThroughRightToLeft) {
                    // TUNNELING right to left - hit the RIGHT surface first
                    const t = (halfThickness - localX) / (nextLocalX - localX);
                    intersectY = localY + t * (nextLocalY - localY);
                    surfaceLocalX = halfThickness;
                } else if (willHitFromLeft) {
                    // Hit left surface at -halfThickness
                    const t = (-halfThickness - localX) / (nextLocalX - localX);
                    intersectY = localY + t * (nextLocalY - localY);
                    surfaceLocalX = -halfThickness;
                } else if (willHitFromRight) {
                    // Hit right surface at +halfThickness
                    const t = (halfThickness - localX) / (nextLocalX - localX);
                    intersectY = localY + t * (nextLocalY - localY);
                    surfaceLocalX = halfThickness;
                } else {
                    // Already inside - push out to nearest surface
                    intersectY = localY;
                    surfaceLocalX = localX < 0 ? -halfThickness : halfThickness;
                }

                // CRITICAL: If already inside or tunneling, SKIP bounds check and FORCE collision
                // These are emergency states - photon is in physically impossible location
                // We MUST push it out regardless of calculated intersection point
                const isEmergency = alreadyInside || tunnelsThrough;
                if (isEmergency) {
                    // Clamp intersectY to element bounds to ensure valid push-out point
                    intersectY = Math.max(-halfLength, Math.min(halfLength, intersectY));

                }

                // Check if within element length bounds (SKIP check for emergency states)
                if (isEmergency || Math.abs(intersectY) <= halfLength) {

                    // Check if hitting a slit (ONLY for apertures with slits)
                    if (elem.type === Matter.ElementType.APERTURE && elem.slitCount > 0) {
                        const inSlit = this.isInSlit(elem, intersectY);

                        if (inSlit) {
                            return null;  // Passes through slit - no collision
                        } else {
                            // HIT BARRIER MATERIAL - MUST BOUNCE!
                            const normalX = surfaceLocalX < 0 ? -1 : 1;
                            return {
                                distance: Math.abs(localX - surfaceLocalX),
                                localX: surfaceLocalX,
                                localY: intersectY,
                                normalX: normalX,
                                normalY: 0
                            };
                        }
                    }

                    // For walls, mirrors, and aperture barriers: MUST REFLECT
                    // These are opaque and should never let light pass through
                    if (elem.type === Matter.ElementType.WALL ||
                        elem.type === Matter.ElementType.MIRROR ||
                        (elem.type === Matter.ElementType.APERTURE && elem.slitCount === 0)) {
                        // Hit the barrier surface - normal points outward from surface
                        const normalX = surfaceLocalX < 0 ? -1 : 1;

                        return {
                            distance: Math.abs(localX - surfaceLocalX),
                            localX: surfaceLocalX,
                            localY: intersectY,
                            normalX: normalX,
                            normalY: 0
                        };
                    }

                    // For aperture barriers (with slits), check if in barrier material
                    if (elem.type === Matter.ElementType.APERTURE) {
                        // We already checked if in slit above - if we're here, we're in barrier material
                        const normalX = surfaceLocalX < 0 ? -1 : 1;

                        return {
                            distance: Math.abs(localX - surfaceLocalX),
                            localX: surfaceLocalX,
                            localY: intersectY,
                            normalX: normalX,
                            normalY: 0
                        };
                    }

                    // DEFAULT CATCH-ALL: If we're within bounds and approaching/inside ANY element,
                    // we MUST return a collision. This prevents pass-through for unhandled element types.
                    const normalX = surfaceLocalX < 0 ? -1 : 1;

                    return {
                        distance: Math.abs(localX - surfaceLocalX),
                        localX: surfaceLocalX,
                        localY: intersectY,
                        normalX: normalX,
                        normalY: 0
                    };
                }
            }

            return null;
        }

        /**
         * Check collision for photon with curved barrier
         * CRITICAL: Must check TRAJECTORY from current to next position, not just current distance
         */
        checkPhotonCurvedCollision(photon, elem, localX, localY, nextLocalX, nextLocalY) {
            const curvature = elem.curvature;
            const halfLength = elem.length / 2;
            const halfThickness = elem.thickness / 2;

            // Sample points along the photon's TRAJECTORY (not just current position)
            const trajectorySteps = 10;  // Check multiple points along the path
            let minDist = Infinity;
            let hitPoint = null;

            // Check multiple points along the photon's path from current to next position
            for (let pathStep = 0; pathStep <= trajectorySteps; pathStep++) {
                const pathT = pathStep / trajectorySteps;
                const testX = localX + (nextLocalX - localX) * pathT;
                const testY = localY + (nextLocalY - localY) * pathT;

                // Sample points along the parabola to find closest point
                const curveSamples = 20;
                for (let i = 0; i <= curveSamples; i++) {
                    const t = (i / curveSamples) * 2 - 1;  // -1 to 1
                    const y = t * halfLength;
                    const xCurve = (y * y) / (4 * curvature);

                    // Check distance from test point to curve
                    const dist = Math.sqrt((testX - xCurve) ** 2 + (testY - y) ** 2);

                    // If photon path comes within collision distance of curve
                    if (dist < halfThickness && dist < minDist) {
                        minDist = dist;

                        // Calculate normal at this point on parabola
                        // Parabola: x = y²/(4f), so dx/dy = y/(2f)
                        const dxdy = y / (2 * curvature);
                        const tangentAngle = Math.atan(dxdy);
                        const normalAngle = tangentAngle + Math.PI / 2;

                        hitPoint = {
                            distance: dist,
                            localX: xCurve,
                            localY: y,
                            normalX: Math.cos(normalAngle),
                            normalY: Math.sin(normalAngle)
                        };
                    }
                }
            }

            return hitPoint;
        }

        /**
         * Check if position is within a slit
         */
        isInSlit(elem, localY) {
            const slitWidth = elem.slitWidth || 20;
            const slitCount = elem.slitCount;

            if (slitCount === 0) return false;  // Solid barrier
            if (slitCount === 1) {
                return Math.abs(localY) <= slitWidth / 2;
            }

            // Multiple slits - middle-out placement
            if (slitCount % 2 === 1) {
                // Odd: center slit + pairs
                if (Math.abs(localY) <= slitWidth / 2) return true;

                for (let i = 1; i <= Math.floor(slitCount / 2); i++) {
                    const offset = i * slitWidth * 2;
                    if (Math.abs(localY - offset) <= slitWidth / 2) return true;
                    if (Math.abs(localY + offset) <= slitWidth / 2) return true;
                }
            } else {
                // Even: symmetric pairs
                for (let i = 0; i < slitCount / 2; i++) {
                    const offset = (i + 0.5) * slitWidth * 2;
                    if (Math.abs(localY - offset) <= slitWidth / 2) return true;
                    if (Math.abs(localY + offset) <= slitWidth / 2) return true;
                }
            }

            return false;
        }

        /**
         * Handle reflection of an individual photon off a barrier
         *
         * REFLECTION COEFFICIENT RANGE: 0.0 to 2.0
         * - 0.0: Black body (total absorption)
         * - 0.0-1.0: Partial absorption/reflection (more absorption = lower value)
         * - 1.0: Perfect Euclidean reflection (mirror)
         * - 1.0-2.0: Iridescent dispersion (wavelength-dependent scattering creates rainbow effects)
         *
         * The diffractionStrength parameter (0-100) controls how much scattering occurs,
         * making light puck behavior consistent with wave field diffraction.
         */
        handlePhotonReflection(photon, hit, elem) {
            // CRITICAL: Use explicit undefined check to allow 0 values
            // Range: 0.0-1.0 = absorption/partial reflection, 1.0 = perfect, 1.0-2.0 = fringe/spreading
            let reflCoeff = (elem.reflectionCoefficient !== undefined && elem.reflectionCoefficient !== null)
                ? elem.reflectionCoefficient
                : 0.5;

            // Clamp to 0.0-2.0 range
            reflCoeff = Math.max(0.0, Math.min(2.0, reflCoeff));

            // Get diffraction strength from config (0-100)
            // This controls how much scattering/spreading occurs
            const diffractionStrength = Config.params.diffractionStrength || 50;
            const diffractionScale = diffractionStrength / 100.0;  // Normalize to 0-1

            // Transform normal to world space
            const worldNormalX = hit.normalX * Math.cos(elem.angle) - hit.normalY * Math.sin(elem.angle);
            const worldNormalY = hit.normalX * Math.sin(elem.angle) + hit.normalY * Math.cos(elem.angle);

            // Normalize
            const normalLen = Math.sqrt(worldNormalX ** 2 + worldNormalY ** 2);
            const nx = worldNormalX / normalLen;
            const ny = worldNormalY / normalLen;

            // Calculate perfect specular reflection: v' = v - 2(v·n)n
            const dotVN = photon.vx * nx + photon.vy * ny;
            let reflectedVx = photon.vx - 2 * dotVN * nx;
            let reflectedVy = photon.vy - 2 * dotVN * ny;

            // === THREE REFLECTION MODES ===

            if (Math.abs(reflCoeff - 1.0) < 0.01) {
                // === MODE 1: PERFECT MIRROR (reflCoeff ≈ 1.0) ===
                // Perfect specular reflection - no energy loss, no scattering
                // The photon bounces like a perfect elastic collision

            } else if (reflCoeff < 1.0) {
                // === MODE 2: DIFFUSE SCATTERING (reflCoeff < 1.0) ===
                // Surface roughness causes scattering
                // Lower reflCoeff = more diffuse, more absorption
                // diffractionStrength amplifies scattering for artistic control

                const roughness = 1.0 - reflCoeff;  // 0 to 1 (0 = smooth, 1 = rough)

                // Random scattering proportional to surface roughness
                // Uses Lambertian (cosine-weighted) distribution
                // Scale scatter angle by diffractionStrength: more diffraction = wider scatter
                const baseScatterAngle = Math.PI * roughness;  // Up to ±90° for rough surfaces
                const scatterAngle = (Math.random() - 0.5) * baseScatterAngle * (0.5 + 0.5 * diffractionScale);
                const currentAngle = Math.atan2(reflectedVy, reflectedVx);
                const newAngle = currentAngle + scatterAngle;

                const speed = Math.sqrt(reflectedVx ** 2 + reflectedVy ** 2);
                reflectedVx = Math.cos(newAngle) * speed;
                reflectedVy = Math.sin(newAngle) * speed;

                // Energy absorption - photon loses energy based on surface absorption
                // Higher diffractionStrength = less absorption (more energy retained)
                const baseEnergyRetention = 0.3 + 0.7 * reflCoeff;  // 30-100% base retention
                const energyRetention = baseEnergyRetention * (0.7 + 0.3 * diffractionScale);
                photon.energy *= energyRetention;

                // If energy too low, absorb the photon
                if (photon.energy < 0.1) {
                    photon.dead = true;
                    return;
                }

            } else {
                // === MODE 3: IRIDESCENT DISPERSION (reflCoeff > 1.0) ===
                // Wavelength-dependent scattering creates rainbow effects
                // Like a diffraction grating, prism, or opal
                // diffractionStrength amplifies the spreading/rainbow effect

                const dispersionStrength = Math.min(reflCoeff - 1.0, 1.0);  // 0 to 1

                // Wavelength-dependent angular deviation
                // Shorter wavelengths (blue) scatter more than longer wavelengths (red)
                // This mimics Rayleigh scattering and prismatic dispersion
                const wavelengthFactor = (photon.wavelength - 380) / 370;  // 0 (violet) to 1 (red)

                // Blue light scattered at wider angles, red at narrower angles
                // Scale scatter by diffractionStrength: more diffraction = wider rainbow spread
                const baseMaxScatterAngle = Math.PI * 0.3 * dispersionStrength;  // Up to 54° for full dispersion
                const maxScatterAngle = baseMaxScatterAngle * (0.5 + 1.0 * diffractionScale);  // 0.5x to 1.5x range
                const scatterAngle = (Math.random() - 0.5) * maxScatterAngle * (1.0 - wavelengthFactor * 0.5);

                const currentAngle = Math.atan2(reflectedVy, reflectedVx);
                const newAngle = currentAngle + scatterAngle;

                const speed = Math.sqrt(reflectedVx ** 2 + reflectedVy ** 2);
                reflectedVx = Math.cos(newAngle) * speed;
                reflectedVy = Math.sin(newAngle) * speed;

                // Energy boost for "active" surfaces
                // Higher diffractionStrength = more energy (brighter rainbow)
                const energyBoost = 1.0 + 0.2 * diffractionScale;
                photon.energy = Math.min(1.0, photon.energy * energyBoost);
            }

            // Apply reflected velocity
            photon.vx = reflectedVx;
            photon.vy = reflectedVy;

            // Move to collision point at the SURFACE and push away to prevent re-collision
            const collisionX = hit.localX * Math.cos(elem.angle) - hit.localY * Math.sin(elem.angle) + elem.x;
            const collisionY = hit.localX * Math.sin(elem.angle) + hit.localY * Math.cos(elem.angle) + elem.y;

            // CRITICAL: Push away from surface along the normal to prevent tunneling
            // Use larger distance to ensure photon is WELL outside barrier
            const pushDistance = elem.thickness + 2;  // Push beyond thickness plus safety margin
            photon.x = collisionX + nx * pushDistance;
            photon.y = collisionY + ny * pushDistance;
        }

        /**
         * Convert HSV to RGB for color dispersion
         */
        hsvToRgb(h, s, v) {
            const c = v * s;
            const x = c * (1 - Math.abs((h / 60) % 2 - 1));
            const m = v - c;

            let r, g, b;
            if (h < 60) { r = c; g = x; b = 0; }
            else if (h < 120) { r = x; g = c; b = 0; }
            else if (h < 180) { r = 0; g = c; b = x; }
            else if (h < 240) { r = 0; g = x; b = c; }
            else if (h < 300) { r = x; g = 0; b = c; }
            else { r = c; g = 0; b = x; }

            return {
                r: Math.round((r + m) * 255),
                g: Math.round((g + m) * 255),
                b: Math.round((b + m) * 255)
            };
        }

        /**
         * Draw wave packet - shows as continuous wave field with interference patterns
         * Oblong shape stretched in direction of motion, blends with field
         */
        draw(ctx) {
            if (this.dead) return;

            // Calculate lifetime fade
            const lifetimeAlpha = Math.min(1, 1 - (this.age / PUCK_LIFETIME));

            ctx.save();

            // Enable additive blending to merge with wave field
            ctx.globalCompositeOperation = 'lighter';

            // Group photons by color for wave rendering
            const colorGroups = new Map();
            for (const photon of this.photons) {
                if (photon.dead) continue;

                const color = photon.getColor();
                const key = `${color.r},${color.g},${color.b}`;
                if (!colorGroups.has(key)) {
                    colorGroups.set(key, []);
                }
                colorGroups.get(key).push(photon);
            }

            // Draw wave field for each color group
            for (const [colorKey, photons] of colorGroups) {
                if (photons.length === 0) continue;

                const color = photons[0].getColor();
                const avgEnergy = photons.reduce((sum, p) => sum + p.energy, 0) / photons.length;
                const alpha = lifetimeAlpha * avgEnergy * 0.4;  // Reduced for blending

                // Draw wave packet as gradient circle with oscillating intensity
                const centerX = photons.reduce((sum, p) => sum + p.x, 0) / photons.length;
                const centerY = photons.reduce((sum, p) => sum + p.y, 0) / photons.length;

                // Calculate average velocity for this color group (for direction)
                const avgVx = photons.reduce((sum, p) => sum + p.vx, 0) / photons.length;
                const avgVy = photons.reduce((sum, p) => sum + p.vy, 0) / photons.length;
                const speed = Math.sqrt(avgVx ** 2 + avgVy ** 2);
                const angle = Math.atan2(avgVy, avgVx);

                // Calculate average phase for this color group
                const avgPhase = photons.reduce((sum, p) => sum + p.phase, 0) / photons.length;

                // Wave packet size (increases with age due to dispersion)
                const packetRadius = PUCK_RADIUS + this.age * 0.3;

                // Calculate oblong stretch based on speed
                const stretchFactor = 1.5 + speed * 0.15;  // 1.5x to 3x stretch at high speeds

                // Save context for rotation
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(angle);

                // Draw multiple concentric wave fronts (elliptical)
                const numWaves = 5;
                for (let i = 0; i < numWaves; i++) {
                    const waveRadius = packetRadius * (i + 1) / numWaves;
                    const phaseOffset = (i * Math.PI * 0.5);

                    // Calculate wave amplitude at this radius
                    const wavePhase = avgPhase + phaseOffset;
                    const amplitude = Math.abs(Math.sin(wavePhase));

                    // Gaussian envelope for wave packet (decays at edges)
                    const gaussianFalloff = Math.exp(-((waveRadius / packetRadius) ** 2));

                    const waveAlpha = alpha * amplitude * gaussianFalloff * 0.3;

                    // Draw elliptical gradient stretched along velocity direction
                    // Create radial gradient in stretched space
                    ctx.save();
                    ctx.scale(stretchFactor, 1);  // Stretch in direction of motion

                    const gradient = ctx.createRadialGradient(
                        0, 0, waveRadius * 0.8 / stretchFactor,
                        0, 0, waveRadius * 1.2 / stretchFactor
                    );
                    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${waveAlpha})`);
                    gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${waveAlpha * 1.5})`);
                    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, waveRadius * 1.2 / stretchFactor, waveRadius * 1.2, 0, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.restore();
                }

                // Draw bright central core (oblong)
                ctx.save();
                ctx.scale(stretchFactor, 1);

                const coreGradient = ctx.createRadialGradient(
                    0, 0, 0,
                    0, 0, PUCK_RADIUS * 0.5 / stretchFactor
                );
                coreGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`);
                coreGradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.6})`);
                coreGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

                ctx.fillStyle = coreGradient;
                ctx.beginPath();
                ctx.ellipse(0, 0, PUCK_RADIUS * 0.5 / stretchFactor, PUCK_RADIUS * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();  // Restore stretch
                ctx.restore();  // Restore rotation/translation
            }

            ctx.restore();  // Restore composite operation
        }
    }

    /**
     * Set ghost puck position (visual indicator)
     */
    function setGhostPuck(x, y) {
        ghostPuck = { x, y };
    }

    /**
     * Clear ghost puck
     */
    function clearGhostPuck() {
        ghostPuck = null;
    }

    /**
     * Launch a puck with given position and velocity
     */
    function launchPuck(x, y, vx, vy) {
        const puck = new Puck(x, y, vx, vy);
        pucks.push(puck);
    }

    /**
     * Update all active pucks
     */
    function update(canvas) {
        for (const puck of pucks) {
            puck.update(canvas);
        }

        // Remove dead pucks
        for (let i = pucks.length - 1; i >= 0; i--) {
            if (pucks[i].dead) {
                pucks.splice(i, 1);
            }
        }
    }

    /**
     * Draw all active pucks and ghost puck
     */
    function draw(ctx) {
        if (!ctx) {
            console.warn('[LightPuck] No context provided to draw()');
            return;
        }

        // Draw ghost puck (placement indicator)
        if (ghostPuck) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(ghostPuck.x, ghostPuck.y, PUCK_RADIUS * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Draw crosshair
            ctx.strokeStyle = 'rgba(255, 255, 0, 1)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ghostPuck.x - PUCK_RADIUS * 2, ghostPuck.y);
            ctx.lineTo(ghostPuck.x + PUCK_RADIUS * 2, ghostPuck.y);
            ctx.moveTo(ghostPuck.x, ghostPuck.y - PUCK_RADIUS * 2);
            ctx.lineTo(ghostPuck.x, ghostPuck.y + PUCK_RADIUS * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Draw active pucks
        for (const puck of pucks) {
            puck.draw(ctx);
        }
    }

    /**
     * Clear all pucks
     */
    function clear() {
        pucks.length = 0;
        ghostPuck = null;
    }

    /**
     * Get active puck count
     */
    function getCount() {
        return pucks.length;
    }

    return {
        setGhostPuck,
        clearGhostPuck,
        launchPuck,
        update,
        draw,
        clear,
        getCount,
        FLICK_DEADZONE
    };
})();
