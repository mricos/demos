/**
 * DivGraphics - Code Stats Module
 * Floating toast showing codebase size breakdown
 * Uses DraggablePopup for draggable/resizable/storable UI
 */
window.APP = window.APP || {};

(function(APP) {
    'use strict';

    APP.CodeStats = {
        popup: null,

        get visible() {
            return this.popup?.visible || false;
        },

        init() {
            this._createPopup();
        },

        toggle() {
            this.popup?.toggle();
        },

        show() {
            this.popup?.show();
        },

        hide() {
            this.popup?.hide();
        },

        _createPopup() {
            const contentHtml = `
                <div class="code-stats">
                    <div class="code-stats-group">
                        <div class="code-stats-header">Core Files</div>
                        <div class="code-stat-row">
                            <span class="code-stat-name">index.html</span>
                            <span class="code-stat-size">23 KB</span>
                            <span class="code-stat-lines">475</span>
                        </div>
                        <div class="code-stat-row">
                            <span class="code-stat-name">style.css</span>
                            <span class="code-stat-size">35 KB</span>
                            <span class="code-stat-lines">1,644</span>
                        </div>
                    </div>

                    <div class="code-stats-group">
                        <div class="code-stats-header">JavaScript (20 modules)</div>
                        <div class="code-stat-row">
                            <span class="code-stat-name">curve.js</span>
                            <span class="code-stat-size">12 KB</span>
                            <span class="code-stat-lines">323</span>
                        </div>
                        <div class="code-stat-row">
                            <span class="code-stat-name">gamepad.js</span>
                            <span class="code-stat-size">11 KB</span>
                            <span class="code-stat-lines">329</span>
                        </div>
                        <div class="code-stat-row">
                            <span class="code-stat-name">camera.js</span>
                            <span class="code-stat-size">11 KB</span>
                            <span class="code-stat-lines">281</span>
                        </div>
                        <div class="code-stat-row">
                            <span class="code-stat-name">ui.js</span>
                            <span class="code-stat-size">11 KB</span>
                            <span class="code-stat-lines">266</span>
                        </div>
                        <div class="code-stat-row">
                            <span class="code-stat-name">display.js</span>
                            <span class="code-stat-size">10 KB</span>
                            <span class="code-stat-lines">299</span>
                        </div>
                        <div class="code-stat-row">
                            <span class="code-stat-name">state.js</span>
                            <span class="code-stat-size">9 KB</span>
                            <span class="code-stat-lines">277</span>
                        </div>
                        <div class="code-stat-row">
                            <span class="code-stat-name">midi.js</span>
                            <span class="code-stat-size">9 KB</span>
                            <span class="code-stat-lines">256</span>
                        </div>
                        <div class="code-stat-row">
                            <span class="code-stat-name">camera-info.js</span>
                            <span class="code-stat-size">8 KB</span>
                            <span class="code-stat-lines">236</span>
                        </div>
                        <div class="code-stat-row">
                            <span class="code-stat-name">draggable-popup.js</span>
                            <span class="code-stat-size">8 KB</span>
                            <span class="code-stat-lines">209</span>
                        </div>
                        <div class="code-stat-row subtle">
                            <span class="code-stat-name">+ 11 more modules</span>
                            <span class="code-stat-size">50 KB</span>
                            <span class="code-stat-lines">1,394</span>
                        </div>
                    </div>

                    <div class="code-stats-total">
                        <div class="code-stat-row total">
                            <span class="code-stat-name">Total</span>
                            <span class="code-stat-size">198 KB</span>
                            <span class="code-stat-lines">5,989</span>
                        </div>
                        <div class="code-stat-note">
                            Pure vanilla JS • No frameworks • No build step
                        </div>
                    </div>
                </div>
            `;

            this.popup = APP.DraggablePopup.create({
                id: 'code-stats',
                title: 'CODE STATS',
                accentColor: '#aa88ff',
                initialPosition: { left: 20, top: 100 },
                initialSize: { width: 280, height: null },
                minSize: { width: 240, height: 150 }
            }).init(contentHtml);
        }
    };

})(window.APP);
