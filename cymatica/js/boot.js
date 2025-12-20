// CYMATICA.boot - Application Bootloader
(function(CYMATICA) {
    'use strict';

    // Boot sequence with nested module support (e.g., 'mod.lfo')
    const bootSequence = [
        'mod.lfo',
        'mod.asr',
        'mod.hub',
        'mod.broadcast',
        'render',
        'input',
        'ui',
        'modUI'
    ];

    function boot() {
        console.log('cymatica: booting...');

        bootSequence.forEach(modulePath => {
            // Support nested modules like 'mod.lfo'
            const parts = modulePath.split('.');
            let module = CYMATICA;
            for (const part of parts) {
                module = module?.[part];
            }

            if (module && typeof module.init === 'function') {
                module.init();
                console.log(`cymatica: ${modulePath} initialized`);
            }
        });

        // Start modulation engine
        CYMATICA.mod?.lfo?.start();

        // Start animation loop
        requestAnimationFrame(CYMATICA.render.animate);

        console.log('cymatica: ready');
        CYMATICA.events.publish('boot:complete');
    }

    // Auto-boot when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    CYMATICA.boot = boot;
})(window.CYMATICA);
