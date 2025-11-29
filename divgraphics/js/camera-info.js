/**
 * DivGraphics - Camera Info Module
 * Educational popup explaining camera rotation semantics and transform order
 * Uses DraggablePopup for draggable/resizable/storable UI
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.CameraInfo = {
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
                <div class="camera-info-section">
                    <div class="camera-info-label">ROTATION AXES</div>
                    <pre class="camera-info-diagram">        Y (yaw)
        ↑
        │    ╱ Z (roll)
        │   ╱
        │  ╱
        ●───────→ X (pitch)
       ╱
      ╱ (screen depth)

Drag left/right → Y rotation (yaw)
Drag up/down   → X rotation (pitch)
Z slider       → Z rotation (roll)</pre>
                </div>

                <div class="camera-info-section">
                    <div class="camera-info-label">ROLL MODE: <span id="cameraInfoMode" class="live-value">VIEW</span></div>
                    <pre class="camera-info-diagram" id="cameraInfoModeDesc">VIEW-SPACE ROLL
───────────────
Z rotates around YOUR view axis.

Transform order: Z → X → Y
(Z applied last in local frame)

   Orient with X/Y, then roll:
   ┌─────────┐      ┌─────────┐
   │    ↑    │  Z   │   ╱     │
   │    │    │  →   │  ╱      │
   │  view   │      │ view    │
   └─────────┘      └─────────┘

The horizon tilts as you roll.</pre>
                </div>

                <div class="camera-info-section">
                    <div class="camera-info-label">CSS TRANSFORM ORDER</div>
                    <pre class="camera-info-formula" id="cameraInfoFormula">transform:
  rotateZ(z)    ← applied last (view roll)
  rotateX(x)    ← applied second
  rotateY(y)    ← applied first</pre>
                    <pre class="camera-info-diagram">CSS applies transforms right-to-left.
Leftmost = applied last (outermost).

VIEW mode:  Z → X → Y
  Y yaws, X pitches in yawed frame,
  Z rolls in pitched+yawed frame.

WORLD mode: X → Y → Z
  Z rolls in world space first,
  then X/Y orient the rolled view.</pre>
                </div>

                <div class="camera-info-section live-section">
                    <div class="camera-info-label">CURRENT VALUES</div>
                    <div class="camera-info-live">
                        <div class="live-row">
                            <span class="live-label">Pitch (X):</span>
                            <span class="live-value" id="cameraInfoPitch">-20.0°</span>
                        </div>
                        <div class="live-row">
                            <span class="live-label">Yaw (Y):</span>
                            <span class="live-value" id="cameraInfoYaw">0.0°</span>
                        </div>
                        <div class="live-row">
                            <span class="live-label">Roll (Z):</span>
                            <span class="live-value" id="cameraInfoRoll">0.0°</span>
                        </div>
                        <div class="live-row live-row-spacer"></div>
                        <div class="live-row">
                            <span class="live-label">Zoom:</span>
                            <span class="live-value" id="cameraInfoZoom">1.0×</span>
                        </div>
                        <div class="live-row">
                            <span class="live-label">FOV:</span>
                            <span class="live-value" id="cameraInfoFov">1200px</span>
                        </div>
                    </div>
                </div>
            `;

            this.popup = APP.DraggablePopup.create({
                id: 'camera-info',
                title: 'CAMERA & ROTATION',
                accentColor: '#ffaa00',
                initialPosition: { right: 330, bottom: 20 },
                initialSize: { width: 340, height: null },
                minSize: { width: 300, height: 200 }
            }).init(contentHtml);

            // Cache live value elements
            this._liveEls = {
                mode: document.getElementById('cameraInfoMode'),
                modeDesc: document.getElementById('cameraInfoModeDesc'),
                formula: document.getElementById('cameraInfoFormula'),
                pitch: document.getElementById('cameraInfoPitch'),
                yaw: document.getElementById('cameraInfoYaw'),
                roll: document.getElementById('cameraInfoRoll'),
                zoom: document.getElementById('cameraInfoZoom'),
                fov: document.getElementById('cameraInfoFov')
            };
        },

        _subscribe() {
            APP.State?.subscribe('camera.*', () => {
                if (this.visible) {
                    this._updateLiveValues();
                }
            });
        },

        _updateLiveValues() {
            const cam = APP.State?.state?.camera;
            const config = APP.State?.defaults?.config || {};
            const camera = APP.Camera;

            if (cam) {
                const mode = cam.rollMode || 'view';
                const isView = mode === 'view';

                if (this._liveEls.mode) {
                    this._liveEls.mode.textContent = mode.toUpperCase();
                    this._liveEls.mode.style.color = isView ? '#00ff88' : '#ff6666';
                }

                if (this._liveEls.modeDesc) {
                    this._liveEls.modeDesc.textContent = isView
                        ? `VIEW-SPACE ROLL
───────────────
Z rotates around YOUR view axis.

Transform order: Z → X → Y
(Z applied last in local frame)

   Orient with X/Y, then roll:
   ┌─────────┐      ┌─────────┐
   │    ↑    │  Z   │   ╱     │
   │    │    │  →   │  ╱      │
   │  view   │      │ view    │
   └─────────┘      └─────────┘

The horizon tilts as you roll.`
                        : `WORLD-SPACE ROLL
────────────────
Z rotates around the WORLD Z axis.

Transform order: X → Y → Z
(Z applied first in world frame)

   Z-roll affects X/Y axes:
   ┌─────────┐      ┌─────────┐
   │ X   Y   │  Z   │  X      │
   │ ↑   →   │  →   │   ↘  Y  │
   │ world   │      │   rotated│
   └─────────┘      └─────────┘

Drag directions rotate with Z.`;
                }

                if (this._liveEls.formula) {
                    this._liveEls.formula.textContent = isView
                        ? `transform:
  rotateZ(z)    ← applied last (view roll)
  rotateX(x)    ← applied second
  rotateY(y)    ← applied first`
                        : `transform:
  rotateX(x)    ← applied last
  rotateY(y)    ← applied second
  rotateZ(z)    ← applied first (world roll)`;
                }

                const fov = cam.fov || 1200;
                const zoom = (cam.zoom || 100) / (config.zoomScale || 100);

                if (this._liveEls.fov) {
                    this._liveEls.fov.textContent = fov + 'px';
                }
                if (this._liveEls.zoom) {
                    this._liveEls.zoom.textContent = zoom.toFixed(1) + '×';
                }
            }

            if (camera) {
                if (this._liveEls.pitch) {
                    this._liveEls.pitch.textContent = camera.rotation.x.toFixed(1) + '°';
                }
                if (this._liveEls.yaw) {
                    this._liveEls.yaw.textContent = camera.rotation.y.toFixed(1) + '°';
                }
                if (this._liveEls.roll) {
                    this._liveEls.roll.textContent = camera.rotation.z.toFixed(1) + '°';
                }
            }
        }
    };

})(window.APP);
