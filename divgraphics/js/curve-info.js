/**
 * DivGraphics - Curve Info Module
 * Educational toast showing curve mathematics with live values
 * Uses DraggablePopup for draggable/resizable/storable UI
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.CurveInfo = {
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
                <div class="curve-info-section">
                    <div class="curve-info-label">QUADRATIC BEZIER</div>
                    <pre class="curve-info-formula">B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂</pre>
                </div>

                <div class="curve-info-section">
                    <div class="curve-info-label">FRENET FRAME</div>
                    <pre class="curve-info-diagram">T = tangent  (dB/dt normalized)
N = normal   (⊥ to T)
B = binormal (T × N)

        Y
        ↑   N
        |  ↗
        | /
   ─────●────→ T (along curve)
       /
      ↙
     B</pre>
                </div>

                <div class="curve-info-section">
                    <div class="curve-info-label">ROTATION MATRIX → EULER</div>
                    <pre class="curve-info-diagram">R = [ N | B | T ]

┌ Nx Bx Tx ┐
│ Ny By Ty │  → YXZ order
└ Nz Bz Tz ┘

rotY = atan2(Tx, Tz)
rotX = atan2(-Ty, √(Ny² + By²))
rotZ = atan2(Ny, By)</pre>
                </div>

                <div class="curve-info-section live-section">
                    <div class="curve-info-label">LIVE VALUES @ t=0.5</div>
                    <div class="curve-info-live">
                        <div class="live-row">
                            <span class="live-label">P₀:</span>
                            <span class="live-value" id="curveInfoP0">(-100, 0, 0)</span>
                        </div>
                        <div class="live-row">
                            <span class="live-label">P₁:</span>
                            <span class="live-value" id="curveInfoP1">(0, -100, 50)</span>
                        </div>
                        <div class="live-row">
                            <span class="live-label">P₂:</span>
                            <span class="live-value" id="curveInfoP2">(100, 0, 0)</span>
                        </div>
                        <div class="live-row live-row-spacer"></div>
                        <div class="live-row">
                            <span class="live-label">pos:</span>
                            <span class="live-value" id="curveInfoPos">(0, -50, 25)</span>
                        </div>
                        <div class="live-row">
                            <span class="live-label">tan:</span>
                            <span class="live-value" id="curveInfoTan">(0.89, 0.00, -0.45)</span>
                        </div>
                        <div class="live-row">
                            <span class="live-label">eul:</span>
                            <span class="live-value" id="curveInfoEuler">Y=0° X=0° Z=0°</span>
                        </div>
                    </div>
                </div>

                <button class="fly-btn" disabled title="Coming soon">
                    Fly Into Curve (coming soon)
                </button>
            `;

            this.popup = APP.DraggablePopup.create({
                id: 'curve-info',
                title: 'CURVE MATH',
                accentColor: '#00ff88',
                initialPosition: { left: 20, bottom: 20 },
                initialSize: { width: 320, height: null },
                minSize: { width: 280, height: 200 }
            }).init(contentHtml);

            // Cache live value elements
            this._liveEls = {
                p0: document.getElementById('curveInfoP0'),
                p1: document.getElementById('curveInfoP1'),
                p2: document.getElementById('curveInfoP2'),
                pos: document.getElementById('curveInfoPos'),
                tan: document.getElementById('curveInfoTan'),
                euler: document.getElementById('curveInfoEuler')
            };
        },

        _subscribe() {
            APP.State?.subscribe('curve.*', () => {
                if (this.visible) {
                    this._updateLiveValues();
                }
            });
        },

        _updateLiveValues() {
            const state = APP.State?.state?.curve;
            if (!state) return;

            // Update control points
            if (this._liveEls.p0) {
                this._liveEls.p0.textContent = `(${state.p0x}, ${state.p0y}, ${state.p0z})`;
            }
            if (this._liveEls.p1) {
                this._liveEls.p1.textContent = `(${state.p1x}, ${state.p1y}, ${state.p1z})`;
            }
            if (this._liveEls.p2) {
                this._liveEls.p2.textContent = `(${state.p2x}, ${state.p2y}, ${state.p2z})`;
            }

            // Compute curve values at t=0.5
            const curve = APP.Scene?.curve;
            if (curve) {
                const t = 0.5;
                const pos = curve._getPoint(t);
                const frame = curve._getFrame(t);
                const euler = curve._matrixToEuler(frame.tangent, frame.normal, frame.binormal);

                if (this._liveEls.pos) {
                    this._liveEls.pos.textContent =
                        `(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`;
                }
                if (this._liveEls.tan) {
                    this._liveEls.tan.textContent =
                        `(${frame.tangent.x.toFixed(2)}, ${frame.tangent.y.toFixed(2)}, ${frame.tangent.z.toFixed(2)})`;
                }
                if (this._liveEls.euler) {
                    this._liveEls.euler.textContent =
                        `Y=${euler.y.toFixed(1)}° X=${euler.x.toFixed(1)}° Z=${euler.z.toFixed(1)}°`;
                }
            } else {
                // Curve not enabled - show placeholder
                if (this._liveEls.pos) this._liveEls.pos.textContent = '(enable curve)';
                if (this._liveEls.tan) this._liveEls.tan.textContent = '-';
                if (this._liveEls.euler) this._liveEls.euler.textContent = '-';
            }
        }
    };

})(window.APP);
