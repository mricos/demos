/**
 * DivGraphics - Frustum Info Module
 * Educational toast explaining perspective, FOV, zoom, and culling
 * Uses DraggablePopup for draggable/resizable/storable UI
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.FrustumInfo = {
        popup: null,
        _liveEls: {},

        get visible() {
            return this.popup?.visible || false;
        },

        init() {
            this._createPopup();
            this._subscribe();
        },

        toggle() {
            this.popup?.toggle();
            if (this.visible) this._updateLiveValues();
        },

        show() {
            this.popup?.show();
            this._updateLiveValues();
        },

        hide() {
            this.popup?.hide();
        },

        _createPopup() {
            const contentHtml = `
                <div class="frustum-info-section">
                    <div class="frustum-info-label">FOV vs ZOOM</div>
                    <pre class="frustum-info-diagram">FOV (Field of View)       ZOOM (Scale)
─────────────────────     ─────────────

   ╲     ╱               Same perspective,
    ╲   ╱  wide FOV      just magnified:
     ╲ ╱   (small px)
      ●────── camera         ●══════ camera
     ╱ ╲                      │
    ╱   ╲  narrow FOV        │ zoom = 2x
   ╱     ╲ (large px)        │

FOV changes perspective    Zoom is uniform
distortion (fisheye vs     scaling - no
telephoto effect)          distortion change</pre>
                </div>

                <div class="frustum-info-section">
                    <div class="frustum-info-label">CSS PERSPECTIVE</div>
                    <pre class="frustum-info-formula">perspective: <span id="frustumFov">1200</span>px</pre>
                    <pre class="frustum-info-diagram">
     near plane    far plane
          │            │
    eye   │   frustum  │
     ●────┼────────────┼────
          │            │
          ↑
     perspective value
     (distance to near plane)

Smaller value = wider FOV = more distortion
Larger value = narrower FOV = flatter look</pre>
                </div>

                <div class="frustum-info-section">
                    <div class="frustum-info-label">BACKFACE CULLING</div>
                    <pre class="frustum-info-diagram">CSS: backface-visibility: hidden

    visible (front)      hidden (back)
    ┌─────────────┐      ┌─────────────┐
    │  ●  ─►      │      │      ◄─  ○  │
    │  face normal│      │  face normal│
    │  toward eye │      │  away from  │
    └─────────────┘      └─────────────┘

Normal · ViewDir < 0 → visible
Normal · ViewDir > 0 → culled

Prevents seeing "inside" of surfaces</pre>
                </div>

                <div class="frustum-info-section">
                    <div class="frustum-info-label">Z-HAZE DEPTH CUE</div>
                    <pre class="frustum-info-diagram">opacity = f(z-position)

near (bright)         far (dim)
    ████████░░░░░░░░░░░░░░░░
    │                      │
    z = +max          z = -max

    hazeAmount = 1 - (1 - zNorm) × hazeFactor
    opacity = max(0.15, hazeAmount)</pre>
                </div>

                <div class="frustum-info-section live-section">
                    <div class="frustum-info-label">LIVE VALUES</div>
                    <div class="frustum-info-live">
                        <div class="live-row">
                            <span class="live-label">FOV:</span>
                            <span class="live-value" id="frustumFovLive">1200px</span>
                        </div>
                        <div class="live-row">
                            <span class="live-label">Zoom:</span>
                            <span class="live-value" id="frustumZoom">1.0×</span>
                        </div>
                        <div class="live-row">
                            <span class="live-label">Haze:</span>
                            <span class="live-value" id="frustumHaze">Off</span>
                        </div>
                        <div class="live-row">
                            <span class="live-label">Pitch:</span>
                            <span class="live-value" id="frustumPitch">-20°</span>
                        </div>
                        <div class="live-row">
                            <span class="live-label">Yaw:</span>
                            <span class="live-value" id="frustumYaw">0°</span>
                        </div>
                    </div>
                </div>
            `;

            this.popup = APP.DraggablePopup.create({
                id: 'frustum-info',
                title: 'PERSPECTIVE & CULLING',
                accentColor: '#00d4ff',
                initialPosition: { right: 330, bottom: 20 },
                initialSize: { width: 360, height: null },
                minSize: { width: 300, height: 200 }
            }).init(contentHtml);

            // Cache live value elements
            this._liveEls = {
                fov: document.getElementById('frustumFov'),
                fovLive: document.getElementById('frustumFovLive'),
                zoom: document.getElementById('frustumZoom'),
                haze: document.getElementById('frustumHaze'),
                pitch: document.getElementById('frustumPitch'),
                yaw: document.getElementById('frustumYaw')
            };
        },

        _subscribe() {
            APP.State?.subscribe('camera.*', () => {
                if (this.visible) {
                    this._updateLiveValues();
                }
            });
            APP.State?.subscribe('display.haze', () => {
                if (this.visible) {
                    this._updateLiveValues();
                }
            });
        },

        _updateLiveValues() {
            const config = APP.State?.defaults?.config || {};
            const cam = APP.State?.state?.camera;
            const display = APP.State?.state?.display;

            if (cam) {
                const fov = cam.fov || 1200;
                const zoom = (cam.zoom || 100) / (config.zoomScale || 100);

                if (this._liveEls.fov) {
                    this._liveEls.fov.textContent = fov;
                }
                if (this._liveEls.fovLive) {
                    this._liveEls.fovLive.textContent = fov + 'px';
                }
                if (this._liveEls.zoom) {
                    this._liveEls.zoom.textContent = zoom.toFixed(1) + '×';
                }
            }

            if (display) {
                const haze = display.haze || 0;
                if (this._liveEls.haze) {
                    this._liveEls.haze.textContent = haze === 0 ? 'Off' : haze + '%';
                }
            }

            // Get camera rotation from Camera module
            const camera = APP.Camera;
            if (camera) {
                if (this._liveEls.pitch) {
                    this._liveEls.pitch.textContent = camera.rotation.x.toFixed(1) + '°';
                }
                if (this._liveEls.yaw) {
                    this._liveEls.yaw.textContent = camera.rotation.y.toFixed(1) + '°';
                }
            }
        }
    };

})(window.APP);
