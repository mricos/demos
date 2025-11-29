/**
 * DivGraphics - Animation Info Module
 * Educational popup showing PPS/BPM timing system and future trigger concepts
 * Uses DraggablePopup for draggable/resizable/storable UI
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.AnimationInfo = {
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
                    <div class="curve-info-label">PPS: PULSES PER SECOND</div>
                    <pre class="curve-info-diagram">PPS = Pulses Per Second
BPM = PPS × 60

Log-scale slider:
0.5 pps =  30 BPM (slow)
1.0 pps =  60 BPM
2.0 pps = 120 BPM (typical)
4.0 pps = 240 BPM (fast)</pre>
                </div>

                <div class="curve-info-section">
                    <div class="curve-info-label">RPP: REVOLUTIONS PER PULSE</div>
                    <pre class="curve-info-diagram">Rotation synced to tempo:

0.25 RPP = 1 rev per 4 pulses
0.5  RPP = 1 rev per 2 pulses
1.0  RPP = 1 rev per pulse
2.0  RPP = 2 revs per pulse

deg/sec = RPP × 360 × PPS</pre>
                </div>

                <div class="curve-info-section">
                    <div class="curve-info-label">TRIGGERS (Future)</div>
                    <pre class="curve-info-diagram">Events fire on boundaries:
• Every N pulses
• Every N measures
• On collision detection

Trigger provides initial state:
• position: {x, y, z}
• normal:   {nx, ny, nz}</pre>
                </div>

                <div class="curve-info-section">
                    <div class="curve-info-label">SEQUENCES (Future)</div>
                    <pre class="curve-info-diagram">Parametric animations:
• Keyframe interpolation
• Spawned at trigger point
• Move along normal direction

Example: "sparks fly" effect
when ship collides with wall</pre>
                </div>

                <div class="curve-info-section live-section">
                    <div class="curve-info-label">LIVE VALUES</div>
                    <div class="curve-info-live">
                        <div class="live-row">
                            <span class="live-label">PPS:</span>
                            <span class="live-value" id="animInfoPps">2.00</span>
                        </div>
                        <div class="live-row">
                            <span class="live-label">BPM:</span>
                            <span class="live-value" id="animInfoBpm">120</span>
                        </div>
                        <div class="live-row">
                            <span class="live-label">RPP:</span>
                            <span class="live-value" id="animInfoRpb">0.25</span>
                        </div>
                        <div class="live-row">
                            <span class="live-label">deg/sec:</span>
                            <span class="live-value" id="animInfoDps">180</span>
                        </div>
                        <div class="live-row">
                            <span class="live-label">ms/pulse:</span>
                            <span class="live-value" id="animInfoMsPerPulse">500</span>
                        </div>
                        <div class="live-row">
                            <span class="live-label">Playing:</span>
                            <span class="live-value" id="animInfoPlaying">No</span>
                        </div>
                    </div>
                </div>
            `;

            this.popup = APP.DraggablePopup.create({
                id: 'animation-info',
                title: 'ANIMATION',
                accentColor: '#ff6666',
                initialPosition: { left: 20, bottom: 280 },
                initialSize: { width: 300, height: null },
                minSize: { width: 260, height: 200 }
            }).init(contentHtml);

            // Cache live value elements
            this._liveEls = {
                pps: document.getElementById('animInfoPps'),
                bpm: document.getElementById('animInfoBpm'),
                rpb: document.getElementById('animInfoRpb'),
                dps: document.getElementById('animInfoDps'),
                msPerPulse: document.getElementById('animInfoMsPerPulse'),
                playing: document.getElementById('animInfoPlaying')
            };
        },

        _subscribe() {
            APP.State?.subscribe('animation.*', () => {
                if (this.visible) {
                    this._updateLiveValues();
                }
            });
        },

        _updateLiveValues() {
            const anim = APP.State?.state?.animation;
            if (!anim) return;

            const pps = anim.pps || 2.0;
            const bpm = pps * 60;
            const rpb = anim.rpb || 0.25;
            const dps = rpb * 360 * pps;
            const msPerPulse = 1000 / pps;

            if (this._liveEls.pps) {
                this._liveEls.pps.textContent = pps.toFixed(2);
            }
            if (this._liveEls.bpm) {
                this._liveEls.bpm.textContent = Math.round(bpm);
            }
            if (this._liveEls.rpb) {
                this._liveEls.rpb.textContent = rpb.toFixed(2);
            }
            if (this._liveEls.dps) {
                this._liveEls.dps.textContent = dps.toFixed(0);
            }
            if (this._liveEls.msPerPulse) {
                this._liveEls.msPerPulse.textContent = msPerPulse.toFixed(0);
            }
            if (this._liveEls.playing) {
                this._liveEls.playing.textContent = anim.playing ? 'Yes' : 'No';
            }
        }
    };

})(window.APP);
