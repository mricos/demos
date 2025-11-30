/**
 * DivGraphics - App Module
 * Application initialization and boot sequence
 */
window.APP = window.APP || {};

// ============================================================================
// Persistence Module
// ============================================================================
(function(APP) {
    'use strict';

    APP.Persistence = {
        init() {
            // Hydrate state from localStorage before any module inits
            APP.State.hydrate();
        }
    };

})(window.APP);

// ============================================================================
// Init (Boot Sequence)
// ============================================================================
(function(APP) {
    'use strict';

    APP.init = async function() {
        // 1. Hydrate state from localStorage
        APP.Persistence.init();

        // 2. Initialize display modules (with restore)
        APP.Toast.init();
        APP.Stats.init();
        APP.Header.init();

        // 3. Initialize geometry registry
        APP.initGeometryRegistry();

        // 4. Initialize scene (with restore) - also initializes Camera
        APP.Scene.init();

        // 5. Initialize SceneManager
        APP.SceneManager.init(APP.Scene.container);

        // 6. Initialize Sidebar
        APP.Sidebar.init();

        // 7. Bind UI controls (with restore)
        APP.UI.init();

        // 7b. Initialize info popups
        APP.CurveInfo.init();
        APP.FrustumInfo.init();
        APP.CameraInfo.init();
        APP.CodeStats.init();

        // 7c. Initialize orientation display
        APP.AxisIndicator?.init();

        // 7d. Initialize timing and animation info
        APP.Timing?.init();
        APP.AnimationInfo?.init();

        // 7e. Initialize particle chaser
        APP.ParticleChaser?.init();

        // 7f. Initialize Instance Manager (multi-instance system)
        APP.InstanceManager?.init();

        // 7g. Initialize PIP (Picture-in-Picture) overlay
        APP.PIP?.init();

        // 8. Initialize input system
        APP.ParameterRegistry.init();
        APP.InputHub.init();
        APP.LFOEngine?.init();
        APP.LFOEngine?.start();
        APP.KeyboardInput?.init();
        APP.LFOUI?.init();
        APP.InputLearnUI.init();
        APP.BankSelectorUI.init();

        // 9. Initialize hardware controllers
        const midiReady = await APP.MIDI.init();
        if (midiReady) APP.MIDI.UI.init();

        APP.Gamepad.init();
        APP.Gamepad.UI.init();

        // 10. Welcome message
        APP.Toast.success('DivGraphics loaded');
    };

    document.addEventListener('DOMContentLoaded', APP.init);

})(window.APP);
