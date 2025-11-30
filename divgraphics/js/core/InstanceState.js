/**
 * DivGraphics - InstanceState
 * Per-instance state for camera, view mode, and LOD settings
 * Separate from global APP.State which holds geometry definitions
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    /**
     * LOD presets for different instance types
     */
    const LOD_PRESETS = {
        primary: {
            lod: 1.0,
            updateFrequency: 1,      // Every frame
            maxRadialSegments: null  // No limit
        },
        pip: {
            lod: 0.5,
            updateFrequency: 2,      // Every 2nd frame
            maxRadialSegments: 6     // Cap radial segments
        },
        stereo: {
            lod: 1.0,
            updateFrequency: 1,
            maxRadialSegments: null
        },
        symbolic: {
            lod: 0.25,
            updateFrequency: 4,      // Every 4th frame
            maxRadialSegments: 4
        }
    };

    /**
     * InstanceState - Manages per-instance state
     *
     * Each DivGraphics instance has its own:
     * - Camera state (rotation, pan, zoom)
     * - View mode (global, follow, overhead)
     * - LOD settings
     * - Update frequency
     */
    class InstanceState {
        /**
         * @param {string} instanceId - Unique identifier for this instance
         * @param {Object} options - Configuration options
         * @param {string} options.preset - LOD preset name ('primary', 'pip', 'stereo', 'symbolic')
         * @param {number} options.lod - Override LOD multiplier (0.0-1.0)
         * @param {string} options.viewMode - Initial view mode ('global', 'follow', 'overhead')
         * @param {number} options.eyeOffset - Stereo eye offset (for VR)
         */
        constructor(instanceId, options = {}) {
            this.id = instanceId;

            // Apply preset or use defaults
            const preset = LOD_PRESETS[options.preset] || LOD_PRESETS.primary;

            // LOD settings
            this.lod = options.lod ?? preset.lod;
            this.updateFrequency = options.updateFrequency ?? preset.updateFrequency;
            this.maxRadialSegments = options.maxRadialSegments ?? preset.maxRadialSegments;

            // Frame counter for update frequency (start at -1 so first frame always updates)
            this._frameCount = -1;

            // View mode
            this.viewMode = options.viewMode || 'global';  // 'global' | 'follow' | 'overhead'

            // Stereo offset (for VR)
            this.eyeOffset = options.eyeOffset || 0;

            // Camera state - independent per instance
            this.camera = {
                // Current smoothed values
                rotation: { x: -20, y: 0, z: 0 },
                // Target values for interpolation
                targetRotation: { x: -20, y: 0, z: 0 },
                // Pan
                pan: { x: 0, y: 0 },
                targetPan: { x: 0, y: 0 },
                // Zoom and FOV
                zoom: options.initialZoom ?? 1,
                fov: 800,
                // Roll mode
                rollMode: 'view',
                // Sensitivity
                sensitivity: 0.5,
                pitchClamp: false
            };

            // Follow camera state (used when viewMode === 'follow')
            this.follow = {
                pos: { x: 0, y: 0, z: 0 },
                yaw: 0,
                pitch: 0
            };

            // Interaction state
            this.interaction = {
                isDragging: false,
                isPanning: false,
                lastMouse: { x: 0, y: 0 }
            };

            // Subscribers for state changes
            this._subscribers = [];
        }

        /**
         * Check if this instance should update this frame
         * Based on updateFrequency setting
         */
        shouldUpdate() {
            this._frameCount++;
            return this._frameCount % this.updateFrequency === 0;
        }

        /**
         * Get effective segment count with LOD applied
         * @param {number} baseSegments - Original segment count from state
         * @returns {number} - Adjusted segment count
         */
        getEffectiveSegments(baseSegments) {
            const scaled = Math.floor(baseSegments * this.lod);
            return Math.max(2, scaled);  // Minimum 2 segments
        }

        /**
         * Get effective radial segments with LOD and cap applied
         * @param {number} baseRadialSegments - Original radial segment count
         * @returns {number} - Adjusted radial segment count
         */
        getEffectiveRadialSegments(baseRadialSegments) {
            let segments = Math.floor(baseRadialSegments * this.lod);
            segments = Math.max(3, segments);  // Minimum 3 for visible geometry

            if (this.maxRadialSegments !== null) {
                segments = Math.min(segments, this.maxRadialSegments);
            }

            return segments;
        }

        /**
         * Update camera rotation targets
         */
        setRotation(x, y, z) {
            if (x !== undefined) this.camera.targetRotation.x = x;
            if (y !== undefined) this.camera.targetRotation.y = y;
            if (z !== undefined) this.camera.targetRotation.z = z;
            this._notify('camera.rotation');
        }

        /**
         * Update camera pan targets
         */
        setPan(x, y) {
            if (x !== undefined) this.camera.targetPan.x = x;
            if (y !== undefined) this.camera.targetPan.y = y;
            this._notify('camera.pan');
        }

        /**
         * Update zoom
         */
        setZoom(zoom) {
            this.camera.zoom = zoom;
            this._notify('camera.zoom');
        }

        /**
         * Set view mode
         */
        setViewMode(mode) {
            this.viewMode = mode;
            this._notify('viewMode');
        }

        /**
         * Copy camera state from global APP.State
         * Used for syncing PIP with main view's orbit
         */
        syncFromGlobalCamera() {
            const cam = APP.State?.select('camera');
            if (cam) {
                const config = APP.State.defaults?.config || {};
                this.camera.zoom = (cam.zoom || 100) / (config.zoomScale || 100);
                this.camera.targetRotation.z = cam.rotationZ || 0;
                this.camera.rotation.z = cam.rotationZ || 0;
                this.camera.targetPan.x = cam.panX || 0;
                this.camera.targetPan.y = cam.panY || 0;
                this.camera.pan.x = cam.panX || 0;
                this.camera.pan.y = cam.panY || 0;
                this.camera.sensitivity = (cam.sensitivity || 5) / (config.sensitivityScale || 10);
                this.camera.pitchClamp = cam.pitchClamp || false;
                this.camera.rollMode = cam.rollMode || 'view';
                this.camera.fov = cam.fov || 800;
            }
        }

        /**
         * Subscribe to state changes
         */
        subscribe(callback) {
            this._subscribers.push(callback);
            return () => {
                const idx = this._subscribers.indexOf(callback);
                if (idx !== -1) this._subscribers.splice(idx, 1);
            };
        }

        /**
         * Notify subscribers of state change
         */
        _notify(path) {
            for (const cb of this._subscribers) {
                cb(path, this);
            }
        }

        /**
         * Reset to default camera position
         */
        resetCamera() {
            this.camera.targetRotation = { x: -20, y: 0, z: 0 };
            this.camera.rotation = { x: -20, y: 0, z: 0 };
            this.camera.targetPan = { x: 0, y: 0 };
            this.camera.pan = { x: 0, y: 0 };
            this.camera.zoom = 1;
            this._notify('camera.reset');
        }
    }

    // Export
    APP.InstanceState = InstanceState;
    APP.LOD_PRESETS = LOD_PRESETS;

})(window.APP);
