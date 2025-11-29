/**
 * DivGraphics - RingPool Module
 * DOM element pooling for track rings to reduce GC and improve performance
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * RingPool - Manages a pool of reusable DOM elements for track rings
     * Reduces garbage collection pauses in endless track mode
     */
    class RingPool {
        constructor(initialSize = 100) {
            this.pool = [];       // Available (unused) rings
            this.active = new Set(); // Currently in-use rings

            // Pre-allocate
            for (let i = 0; i < initialSize; i++) {
                this.pool.push(this._createElement());
            }
        }

        /**
         * Create a new ring element
         */
        _createElement() {
            const ring = document.createElement('div');
            ring.className = 'track-ring pooled';
            ring.style.cssText = 'position:absolute;transform-style:preserve-3d;';
            return ring;
        }

        /**
         * Get a ring from the pool (or create new if empty)
         * @returns {HTMLElement}
         */
        acquire() {
            let ring = this.pool.pop();

            if (!ring) {
                // Pool exhausted, create new element
                ring = this._createElement();
            }

            this.active.add(ring);
            return ring;
        }

        /**
         * Return a ring to the pool
         * @param {HTMLElement} ring
         */
        release(ring) {
            if (!ring || !this.active.has(ring)) {
                return;
            }

            // Clear children
            while (ring.firstChild) {
                ring.removeChild(ring.firstChild);
            }

            // Reset inline styles (preserve class-based styles)
            ring.style.transform = '';
            ring.style.opacity = '';

            // Remove from DOM if attached
            if (ring.parentNode) {
                ring.parentNode.removeChild(ring);
            }

            this.active.delete(ring);
            this.pool.push(ring);
        }

        /**
         * Release all active rings back to pool
         */
        releaseAll() {
            for (const ring of this.active) {
                // Clear children
                while (ring.firstChild) {
                    ring.removeChild(ring.firstChild);
                }

                // Reset
                ring.style.transform = '';
                ring.style.opacity = '';

                // Remove from DOM
                if (ring.parentNode) {
                    ring.parentNode.removeChild(ring);
                }

                this.pool.push(ring);
            }
            this.active.clear();
        }

        /**
         * Get pool statistics
         * @returns {Object}
         */
        getStats() {
            return {
                pooled: this.pool.length,
                active: this.active.size,
                total: this.pool.length + this.active.size
            };
        }

        /**
         * Destroy the pool and all elements
         */
        destroy() {
            // Clear all elements
            for (const ring of this.pool) {
                if (ring.parentNode) {
                    ring.parentNode.removeChild(ring);
                }
            }
            for (const ring of this.active) {
                if (ring.parentNode) {
                    ring.parentNode.removeChild(ring);
                }
            }

            this.pool = [];
            this.active.clear();
        }

        /**
         * Ensure pool has at least minSize elements available
         * @param {number} minSize
         */
        ensureCapacity(minSize) {
            const needed = minSize - this.pool.length;
            if (needed > 0) {
                for (let i = 0; i < needed; i++) {
                    this.pool.push(this._createElement());
                }
            }
        }
    }

    APP.RingPool = RingPool;

})(window.APP);
