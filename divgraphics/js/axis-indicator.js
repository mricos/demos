/**
 * AxisIndicator - Dual display orientation system
 * 1. World Axes Gizmo (corner): Shows X/Y/Z world directions
 * 2. Camera HUD (bottom-center): Aircraft-style horizon + P/Y/R readouts
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.AxisIndicator = {
        worldGizmo: null,
        cameraHUD: null,
        hudVisible: true,
        gizmoVisible: true,

        init() {
            this._createWorldGizmo();
            this._createCameraHUD();
            this._restoreFromState();
            this._startUpdateLoop();
            this._subscribe();
        },

        _restoreFromState() {
            const ui = APP.State?.select('ui');
            if (ui) {
                this.hudVisible = ui.hud !== false;
                this.gizmoVisible = ui.gizmo !== false;
                this._updateVisibility();
            }
        },

        _createWorldGizmo() {
            const container = document.createElement('div');
            container.className = 'axis-world-gizmo';
            container.innerHTML = `
                <div class="axis-gizmo-inner">
                    <div class="axis-line axis-x"><span class="axis-label">X</span></div>
                    <div class="axis-line axis-y"><span class="axis-label">Y</span></div>
                    <div class="axis-line axis-z"><span class="axis-label">Z</span></div>
                    <div class="axis-origin"></div>
                </div>
            `;
            document.body.appendChild(container);
            this.worldGizmo = container.querySelector('.axis-gizmo-inner');
        },

        _createCameraHUD() {
            const hud = document.createElement('div');
            hud.className = 'camera-direction-hud';
            hud.innerHTML = `
                <div class="hud-horizon"></div>
                <div class="hud-crosshair"></div>
                <div class="hud-readings">
                    <span class="hud-pitch">P: 0.0</span>
                    <span class="hud-yaw">Y: 0.0</span>
                    <span class="hud-roll">R: 0.0</span>
                </div>
            `;
            document.body.appendChild(hud);
            this.cameraHUD = hud;
        },

        _startUpdateLoop() {
            const update = () => {
                const followMode = APP.State?.select('chaser.follow');
                const cam = APP.Camera;

                // In follow mode, use follow camera orientation + look offset
                let rot;
                if (followMode && cam) {
                    const lookOffset = cam._lookOffset || { yaw: 0, pitch: 0 };
                    rot = {
                        x: (cam._followPitch || 0) + lookOffset.pitch,
                        y: (cam._followYaw || 0) + lookOffset.yaw,
                        z: 0  // No roll in follow mode
                    };
                } else {
                    rot = cam?.rotation || { x: 0, y: 0, z: 0 };
                }

                // World gizmo: inverse rotation shows where world axes are
                if (this.worldGizmo && this.gizmoVisible) {
                    this.worldGizmo.style.transform =
                        `rotateX(${-rot.x}deg) rotateY(${-rot.y}deg) rotateZ(${-rot.z}deg)`;
                }

                // Camera HUD: show current orientation values
                if (this.cameraHUD && this.hudVisible) {
                    const horizon = this.cameraHUD.querySelector('.hud-horizon');
                    const pitchEl = this.cameraHUD.querySelector('.hud-pitch');
                    const yawEl = this.cameraHUD.querySelector('.hud-yaw');
                    const rollEl = this.cameraHUD.querySelector('.hud-roll');

                    // Roll tilts the horizon line
                    if (horizon) {
                        horizon.style.transform = `rotate(${rot.z}deg)`;
                    }

                    // Update numeric readouts
                    if (pitchEl) pitchEl.textContent = `P: ${rot.x.toFixed(1)}`;
                    if (yawEl) yawEl.textContent = `Y: ${(rot.y % 360).toFixed(1)}`;
                    if (rollEl) rollEl.textContent = `R: ${rot.z.toFixed(1)}`;
                }

                requestAnimationFrame(update);
            };
            requestAnimationFrame(update);
        },

        _subscribe() {
            APP.State?.subscribe('ui.hud', (v) => {
                this.hudVisible = v;
                this._updateVisibility();
            });
            APP.State?.subscribe('ui.gizmo', (v) => {
                this.gizmoVisible = v;
                this._updateVisibility();
            });
        },

        _updateVisibility() {
            if (this.worldGizmo?.parentElement) {
                this.worldGizmo.parentElement.style.display = this.gizmoVisible ? 'block' : 'none';
            }
            if (this.cameraHUD) {
                this.cameraHUD.style.display = this.hudVisible ? 'block' : 'none';
            }
        },

        toggleHUD() {
            this.hudVisible = !this.hudVisible;
            APP.State?.dispatch({ type: 'ui.hud', payload: this.hudVisible });
            this._updateVisibility();
        },

        toggleGizmo() {
            this.gizmoVisible = !this.gizmoVisible;
            APP.State?.dispatch({ type: 'ui.gizmo', payload: this.gizmoVisible });
            this._updateVisibility();
        }
    };

})(window.APP);
