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

        // 3. Initialize scene (with restore)
        APP.Scene.init();

        // 4. Bind UI controls (with restore)
        APP.UI.init();

        // 5. Initialize input system
        APP.ParameterRegistry.init();
        APP.InputHub.init();
        APP.InputLearnUI.init();

        // 6. Initialize hardware controllers
        const midiReady = await APP.MIDI.init();
        if (midiReady) APP.MIDI.UI.init();

        APP.Gamepad.init();
        APP.Gamepad.UI.init();

        // 7. Welcome message
        APP.Toast.success('DivGraphics loaded');
    };

    document.addEventListener('DOMContentLoaded', APP.init);

})(window.APP);
