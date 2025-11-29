/**
 * DivGraphics - WaypointManager Module
 * Manages endless waypoint generation and track updates
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * WaypointManager - Handles procedural waypoint generation for endless tracks
     */
    APP.WaypointManager = {
        track: null,
        variationSource: null,

        // Generation parameters
        baseDirection: { x: 0, y: 0, z: 1 }, // Forward direction
        spacing: 100,                         // Distance between waypoints
        lookAhead: 10,                        // Generate this many ahead
        trimBuffer: 5,                        // Keep this many behind

        // Player position tracking
        playerT: 0,
        lastWaypointIndex: 0,

        /**
         * Initialize with a track
         */
        init(track) {
            this.track = track;
            this.playerT = 0;
            this.lastWaypointIndex = 0;

            // Get config from state if available
            const config = APP.State?.defaults?.config;
            if (config) {
                this.spacing = config.trackWaypointSpacing || 100;
                this.lookAhead = config.trackLookAhead || 10;
                this.trimBuffer = config.trackTrimBuffer || 5;
            }
        },

        /**
         * Set the variation source for procedural generation
         */
        setVariationSource(source) {
            this.variationSource = source;
        },

        /**
         * Generate initial waypoints for a new track
         * @param {number} count - Number of waypoints to generate
         * @returns {Array} Waypoint array
         */
        generateInitial(count = 20) {
            const waypoints = [];
            let pos = { x: 0, y: 0, z: 0 };

            for (let i = 0; i < count; i++) {
                waypoints.push({ ...pos });
                pos = this._generateNext(pos, i);
            }

            return waypoints;
        },

        /**
         * Generate next waypoint based on current position and variation
         * @private
         */
        _generateNext(prevPos, index) {
            let variation = { x: 0, y: 0, z: 0 };

            if (this.variationSource && typeof this.variationSource.getVariation === 'function') {
                variation = this.variationSource.getVariation(index, prevPos);
            }

            return {
                x: prevPos.x + this.baseDirection.x * this.spacing + variation.x,
                y: prevPos.y + this.baseDirection.y * this.spacing + variation.y,
                z: prevPos.z + this.baseDirection.z * this.spacing + variation.z
            };
        },

        /**
         * Update loop - called each frame during endless mode
         * Adds/removes waypoints based on player position
         * @param {number} playerT - Current player parameter on track
         */
        update(playerT) {
            if (!this.track) return;

            this.playerT = playerT;
            const waypointIndex = Math.floor(playerT);

            // Generate ahead if needed
            while (this.track.waypointCount - waypointIndex < this.lookAhead) {
                const lastPos = this.track.getWaypoint(this.track.waypointCount - 1);
                if (lastPos) {
                    const nextPos = this._generateNext(lastPos, this.track.waypointCount);
                    this.track.addWaypoint(nextPos);
                }
            }

            // Trim behind (keep some buffer for smooth rendering)
            if (waypointIndex > this.trimBuffer) {
                const toTrim = waypointIndex - this.trimBuffer;
                if (toTrim > 0) {
                    this.track.trimFront(toTrim);
                    // Adjust player position to account for trimmed waypoints
                    // (track's internal indexing changes)
                }
            }

            this.lastWaypointIndex = waypointIndex;
        },

        /**
         * Get current generation stats
         */
        getStats() {
            return {
                waypointCount: this.track?.waypointCount || 0,
                playerT: this.playerT,
                lastWaypointIndex: this.lastWaypointIndex,
                variationSource: this.variationSource?.constructor?.name || 'none'
            };
        },

        /**
         * Reset the manager
         */
        reset() {
            this.track = null;
            this.variationSource = null;
            this.playerT = 0;
            this.lastWaypointIndex = 0;
        }
    };

})(window.APP);
