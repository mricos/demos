/**
 * DivGraphics - PIP Module
 * Picture-in-Picture overlay showing global view during follow mode
 * Uses the multi-instance architecture for independent rendering
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.PIP = {
        container: null,
        instance: null,
        _unsubscribes: [],

        /**
         * Initialize PIP module
         */
        init() {
            this.container = document.getElementById('pip-container');
            if (!this.container) {
                console.warn('PIP container not found');
                return;
            }

            // Setup close button
            const closeBtn = document.getElementById('pipClose');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hide());
            }

            // Subscribe to follow mode changes
            this._subscribeToState();

            // Check if follow mode is already enabled
            const followEnabled = APP.State?.select('chaser.follow');
            const showWhenFollow = APP.State?.select('pip.showWhenFollow') ?? true;
            if (followEnabled && showWhenFollow) {
                this.show();
            }
        },

        /**
         * Subscribe to state changes
         */
        _subscribeToState() {
            // Auto-show/hide based on follow mode AND showWhenFollow setting
            const unsubFollow = APP.State?.subscribe('chaser.follow', (follow) => {
                const showWhenFollow = APP.State?.select('pip.showWhenFollow') ?? true;
                console.log('PIP: chaser.follow changed to', follow, 'showWhenFollow:', showWhenFollow);
                if (follow && showWhenFollow) {
                    this.show();
                } else if (!follow) {
                    this.hide();
                }
            });

            // When showWhenFollow checkbox changes
            const unsubShowWhenFollow = APP.State?.subscribe('pip.showWhenFollow', (showWhenFollow) => {
                const followEnabled = APP.State?.select('chaser.follow');
                console.log('PIP: showWhenFollow changed to', showWhenFollow, 'follow:', followEnabled);
                if (followEnabled && showWhenFollow) {
                    this.show();
                } else if (!showWhenFollow) {
                    this.hide();
                }
            });

            if (unsubFollow) this._unsubscribes.push(unsubFollow);
            if (unsubShowWhenFollow) this._unsubscribes.push(unsubShowWhenFollow);
        },

        /**
         * Show the PIP overlay and create instance if needed
         */
        show() {
            if (!this.container || !APP.InstanceManager) {
                console.warn('PIP: container or InstanceManager not available');
                return;
            }

            // Ensure geometry data is up to date
            if (APP.InstanceManager.sharedGeometry) {
                APP.InstanceManager.sharedGeometry.updateFromState();
            }

            // Create instance if it doesn't exist
            if (!this.instance) {
                this._createInstance();
            }

            // Re-activate instance if it was hidden
            if (this.instance) {
                this.instance.active = true;
            }

            // Show container
            this.container.classList.add('visible');

            // Start the instance animation loop if not running
            APP.InstanceManager.startAnimationLoop();

            // Force rebuild to ensure geometry is rendered
            if (this.instance) {
                // Sync camera state from global (but preserve our custom zoom)
                const savedZoom = this.instance.instanceState.camera.zoom;
                this.instance.instanceState.syncFromGlobalCamera();
                this.instance.instanceState.camera.zoom = savedZoom;

                // Apply initial camera transform
                this.instance.camera.update(0, APP.Timing);
                this.instance.camera.applyTransform();

                // Rebuild geometry
                this.instance.rebuildGeometry();
            }

            console.log('PIP: Shown with', this.instance?.renderer?.container?.children?.length || 0, 'geometry elements');
        },

        /**
         * Hide the PIP overlay
         */
        hide() {
            if (!this.container) return;

            this.container.classList.remove('visible');

            // Mark instance as inactive so animation loop can auto-stop
            if (this.instance) {
                this.instance.active = false;
            }
        },

        /**
         * Create the PIP DivGraphics instance
         */
        _createInstance() {
            if (!APP.InstanceManager) {
                console.error('PIP: InstanceManager not available');
                return;
            }
            if (this.instance) {
                console.log('PIP: Instance already exists');
                return;
            }

            console.log('PIP: Creating instance...');

            const pipState = APP.State?.select('pip') || {};
            const lod = pipState.lod ?? 0.5;

            try {
                this.instance = APP.InstanceManager.createInstance({
                    id: 'pip',
                    container: this.container,
                    preset: 'pip',
                    lod: lod,
                    viewMode: pipState.viewMode || 'global',
                    enableInteraction: false,  // No mouse interaction for PIP
                    syncWithGlobal: true,      // Sync camera rotation with main view
                    fov: 600,                  // Smaller FOV for PIP
                    initialZoom: 0.4           // Scale down to fit in smaller viewport
                });

                // Sync initial camera state
                this.instance.instanceState.syncFromGlobalCamera();

                console.log('PIP: Instance created successfully', this.instance);
            } catch (e) {
                console.error('PIP: Failed to create instance', e);
            }
        },

        /**
         * Destroy the PIP instance
         */
        _destroyInstance() {
            if (this.instance) {
                APP.InstanceManager?.destroyInstance('pip');
                this.instance = null;
            }
        },

        /**
         * Set view mode (global, overhead)
         */
        setViewMode(mode) {
            if (this.instance) {
                this.instance.setViewMode(mode);
            }
            APP.State?.dispatch({ type: 'pip.viewMode', payload: mode });
        },

        /**
         * Toggle PIP visibility
         */
        toggle() {
            if (this.container?.classList.contains('visible')) {
                this.hide();
            } else {
                this.show();
            }
        },

        /**
         * Check if PIP is visible
         */
        isVisible() {
            return this.container?.classList.contains('visible') ?? false;
        },

        /**
         * Cleanup
         */
        destroy() {
            this._unsubscribes.forEach(unsub => unsub?.());
            this._unsubscribes = [];
            this._destroyInstance();
        }
    };

})(window.APP);
