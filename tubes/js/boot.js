// TUBES.boot - Application Bootloader
(function(TUBES) {
    'use strict';

    const bootSequence = [
        'events',
        'config',
        'storage',
        'registration',
        'groups',
        'input',
        'renderer',
        'camera',
        'scene',
        'stroke',
        'cylinder',
        'panels',
        'hud',
        'app'
    ];

    function boot() {
        console.log('TUBES: booting...');

        bootSequence.forEach(moduleName => {
            const module = TUBES[moduleName];
            if (module && typeof module.init === 'function') {
                module.init();
                console.log(`TUBES.${moduleName}: initialized`);
            } else {
                console.warn(`TUBES.${moduleName}: no init method`);
            }
        });

        // Bind UI controls after panels are ready
        bindControls();

        console.log('TUBES: ready');
        TUBES.events.publish('boot:complete');
    }

    function bindControls() {
        // Delete selected button
        const btnDelete = document.getElementById('btn-delete-selected');
        if (btnDelete) {
            btnDelete.addEventListener('click', () => {
                TUBES.cylinder.deleteSelected();
            });
        }

        // Clear scene button
        const btnClear = document.getElementById('btn-clear-scene');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                if (confirm('Clear all cylinders?')) {
                    TUBES.cylinder.clear();
                }
            });
        }

        // Settings sliders
        const bindSlider = (id, setting, format = v => v) => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.addEventListener('input', () => {
                    const val = parseFloat(slider.value);
                    TUBES.config.settings[setting] = val;
                    const display = slider.nextElementSibling;
                    if (display) display.textContent = format(val);
                    TUBES.storage.save();
                });
            }
        };

        bindSlider('setting-radius', 'radius', v => v.toFixed(1));
        bindSlider('setting-segments', 'segments', v => Math.round(v));
        bindSlider('setting-metalness', 'metalness', v => v.toFixed(1));

        // Color picker
        const colorPicker = document.getElementById('setting-color');
        if (colorPicker) {
            colorPicker.addEventListener('input', () => {
                TUBES.config.settings.color = colorPicker.value;
                TUBES.storage.save();
            });
        }
    }

    // Auto-boot when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    TUBES.boot = boot;
})(window.TUBES);
