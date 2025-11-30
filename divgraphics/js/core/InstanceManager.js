/**
 * DivGraphics - InstanceManager
 * Factory and coordinator for DivGraphicsInstance objects
 * Owns the central animation loop
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * InstanceManager - Manages multiple DivGraphics instances
     *
     * Responsibilities:
     * - Create/destroy instances
     * - Own the animation loop (requestAnimationFrame)
     * - Coordinate updates across all instances
     * - Manage shared geometry data
     */
    class InstanceManager {
        constructor() {
            this.instances = new Map();
            this.primaryInstance = null;
            this.sharedGeometry = null;  // Lazy init when first instance created

            this._animating = false;
            this._lastTime = 0;
        }

        /**
         * Initialize the manager
         * Call after APP.State is ready
         * Note: We defer geometry subscription until first instance is created
         * to avoid unnecessary state updates when no instances exist
         */
        init() {
            // Don't subscribe to state here - do it lazily when first instance is created
        }

        /**
         * Create a new DivGraphics instance
         * @param {Object} options - Instance options (see DivGraphicsInstance)
         * @returns {DivGraphicsInstance}
         */
        createInstance(options) {
            // Ensure shared geometry is initialized and subscribed (lazy init)
            if (!this.sharedGeometry && APP.GeometryData) {
                this.sharedGeometry = new APP.GeometryData();
            }
            if (this.sharedGeometry && !this.sharedGeometry._subscribed) {
                this.sharedGeometry.subscribeToState();
                this.sharedGeometry._subscribed = true;
            }

            const instance = new APP.DivGraphicsInstance({
                ...options,
                sharedGeometry: this.sharedGeometry
            });

            this.instances.set(instance.id, instance);

            // Mark as primary if specified or if it's the first instance
            if (options.primary || this.instances.size === 1) {
                this.primaryInstance = instance;
            }

            return instance;
        }

        /**
         * Get an instance by ID
         * @param {string} id - Instance ID
         * @returns {DivGraphicsInstance|null}
         */
        getInstance(id) {
            return this.instances.get(id) || null;
        }

        /**
         * Get the primary instance
         * @returns {DivGraphicsInstance|null}
         */
        getPrimary() {
            return this.primaryInstance;
        }

        /**
         * Destroy an instance
         * @param {string} id - Instance ID to destroy
         */
        destroyInstance(id) {
            const instance = this.instances.get(id);
            if (instance) {
                instance.destroy();
                this.instances.delete(id);

                // Update primary if needed
                if (this.primaryInstance === instance) {
                    this.primaryInstance = this.instances.values().next().value || null;
                }
            }
        }

        /**
         * Destroy all instances
         */
        destroyAll() {
            for (const instance of this.instances.values()) {
                instance.destroy();
            }
            this.instances.clear();
            this.primaryInstance = null;
        }

        /**
         * Start the central animation loop for secondary instances
         * Note: Main scene uses APP.Camera's animation loop
         * This loop only updates PIP and other secondary instances
         * Auto-stops when no active instances remain
         */
        startAnimationLoop() {
            if (this._animating) return;
            if (this.instances.size === 0) return;  // Don't start if no instances

            this._animating = true;
            this._lastTime = performance.now();

            const animate = (currentTime) => {
                if (!this._animating) return;

                // Auto-stop if no active instances
                let hasActiveInstance = false;
                for (const instance of this.instances.values()) {
                    if (instance.active) {
                        hasActiveInstance = true;
                        break;
                    }
                }
                if (!hasActiveInstance) {
                    this._animating = false;
                    return;
                }

                const deltaMs = currentTime - this._lastTime;
                this._lastTime = currentTime;

                try {
                    // Only update active instances
                    for (const instance of this.instances.values()) {
                        if (instance.active) {
                            instance.update(deltaMs, APP.State?.state, APP.Timing);
                        }
                    }
                } catch (e) {
                    console.error('InstanceManager animation error:', e);
                }

                requestAnimationFrame(animate);
            };

            requestAnimationFrame(animate);
        }

        /**
         * Stop the animation loop
         */
        stopAnimationLoop() {
            this._animating = false;
        }

        /**
         * Get combined stats from all instances
         */
        getTotalStats() {
            let totalDivs = 0;
            let totalFaces = 0;

            for (const instance of this.instances.values()) {
                const stats = instance.getStats();
                totalDivs += stats.divCount;
                totalFaces += stats.faceCount;
            }

            return {
                divCount: totalDivs,
                faceCount: totalFaces,
                instanceCount: this.instances.size
            };
        }

        /**
         * Force rebuild geometry on all instances
         */
        rebuildAll() {
            // Update shared geometry data
            this.sharedGeometry?.updateFromState();

            // Rebuild each instance
            for (const instance of this.instances.values()) {
                instance.rebuildGeometry();
            }
        }
    }

    // Export singleton-like accessor (but can create multiples if needed)
    APP.InstanceManager = new InstanceManager();

})(window.APP);
