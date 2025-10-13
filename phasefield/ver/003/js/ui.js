/**
 * Phase Field UI Module
 * Handles UI controls, event listeners, and user interactions
 */

window.PF = window.PF || {};

window.PF.UI = (function() {
    'use strict';

    const Config = window.PF.Config;
    const Wave = window.PF.Wave;
    const Palette = window.PF.Palette;
    const Gamepad = window.PF.Gamepad;

    function setupCollapsible() {
        const sections = [
            {header: 'header-game', content: 'section-game'},
            {header: 'header-pixelator', content: 'section-pixelator'},
            {header: 'header-presets', content: 'section-presets'},
            {header: 'header-custom', content: 'section-custom'},
            {header: 'header-adjoint', content: 'section-adjoint'},
            {header: 'header-gain', content: 'section-gain'},
            {header: 'header-gamepad', content: 'section-gamepad'}
        ];

        sections.forEach(({header, content}) => {
            const headerEl = document.getElementById(header);
            const contentEl = document.getElementById(content);

            if (!contentEl.classList.contains('collapsed')) {
                contentEl.style.maxHeight = contentEl.scrollHeight + 'px';
            }

            headerEl.addEventListener('click', () => {
                const isCollapsed = headerEl.classList.toggle('collapsed');
                contentEl.classList.toggle('collapsed');

                if (isCollapsed) {
                    contentEl.style.maxHeight = '0';
                } else {
                    contentEl.style.maxHeight = contentEl.scrollHeight + 'px';
                }
            });
        });
    }

    function updateUIForParam(param) {
        const updates = {
            'frequency': () => {
                document.getElementById('frequency').value = Config.params.frequency;
                document.getElementById('freq-val').textContent = Config.params.frequency.toFixed(1);
            },
            'amplitude': () => {
                document.getElementById('amplitude').value = Config.params.amplitude;
                document.getElementById('amp-val').textContent = Math.round(Config.params.amplitude);
            },
            'speed': () => {
                document.getElementById('speed').value = Config.params.speed;
                document.getElementById('speed-val').textContent = Config.params.speed.toFixed(3);
            },
            'sources': () => {
                document.getElementById('sources').value = Config.params.sources;
                document.getElementById('sources-val').textContent = Config.params.sources;
                Wave.generateWaveSources();
            },
            'resolution': () => {
                document.getElementById('resolution').value = Config.params.resolution;
                document.getElementById('res-val').textContent = Config.formatResolution(Config.params.resolution);
            },
            'resolution2': () => {
                document.getElementById('resolution2').value = Config.params.resolution2;
                const val = Config.params.resolution2 === 0 ? 'OFF' : Config.formatResolution(Config.params.resolution2);
                document.getElementById('res2-val').textContent = val;
            },
            'blend': () => {
                document.getElementById('blend').value = Config.params.blend;
                document.getElementById('blend-val').textContent = Config.params.blend + '%';
            },
            'distortion': () => {
                document.getElementById('distortion').value = Config.params.distortion;
                document.getElementById('dist-val').textContent = Config.params.distortion.toFixed(1);
            },
            'colorCycle': () => {
                document.getElementById('color-cycle').value = Config.params.colorCycle;
                document.getElementById('cycle-val').textContent = Config.params.colorCycle.toFixed(1);
            },
            'paletteSteps': () => {
                Config.params.paletteSteps = Math.round(Config.params.paletteSteps / 64) * 64;
                document.getElementById('palette-steps').value = Config.params.paletteSteps;
                document.getElementById('steps-val').textContent = Config.params.paletteSteps;
                if (Config.state.currentPresetIndex >= 0) {
                    Palette.loadPresetPalette(Config.state.currentPresetIndex);
                }
            }
        };

        if (updates[param]) {
            updates[param]();
        }
    }

    function setupEventListeners() {
        // Game parameters
        document.getElementById('frequency').addEventListener('input', (e) => {
            Config.params.frequency = parseFloat(e.target.value);
            document.getElementById('freq-val').textContent = Config.params.frequency.toFixed(1);
        });

        document.getElementById('amplitude').addEventListener('input', (e) => {
            Config.params.amplitude = parseFloat(e.target.value);
            document.getElementById('amp-val').textContent = Config.params.amplitude;
        });

        document.getElementById('speed').addEventListener('input', (e) => {
            Config.params.speed = parseFloat(e.target.value);
            document.getElementById('speed-val').textContent = Config.params.speed.toFixed(3);
        });

        document.getElementById('sources').addEventListener('input', (e) => {
            Config.params.sources = parseInt(e.target.value);
            document.getElementById('sources-val').textContent = Config.params.sources;
            Wave.generateWaveSources();
        });

        document.getElementById('distortion').addEventListener('input', (e) => {
            Config.params.distortion = parseFloat(e.target.value);
            document.getElementById('dist-val').textContent = Config.params.distortion.toFixed(1);
        });

        // Pixelator controls
        document.getElementById('resolution').addEventListener('input', (e) => {
            Config.params.resolution = parseInt(e.target.value);
            document.getElementById('res-val').textContent = Config.formatResolution(Config.params.resolution);
        });

        document.getElementById('resolution2').addEventListener('input', (e) => {
            Config.params.resolution2 = parseInt(e.target.value);
            const val = Config.params.resolution2 === 0 ? 'OFF' : Config.formatResolution(Config.params.resolution2);
            document.getElementById('res2-val').textContent = val;
        });

        document.getElementById('blend').addEventListener('input', (e) => {
            Config.params.blend = parseInt(e.target.value);
            document.getElementById('blend-val').textContent = Config.params.blend + '%';
        });

        // Pixelator mode radio buttons
        document.querySelectorAll('input[name="pixelator-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                Config.params.pixelatorMode = e.target.value;
                document.querySelectorAll('.radio-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                e.target.closest('.radio-option').classList.add('selected');
            });
        });

        document.querySelector('input[name="pixelator-mode"]:checked').closest('.radio-option').classList.add('selected');

        // Palette controls
        document.getElementById('palette-steps').addEventListener('input', (e) => {
            Config.params.paletteSteps = parseInt(e.target.value);
            document.getElementById('steps-val').textContent = Config.params.paletteSteps;
            if (Config.state.currentPresetIndex >= 0) {
                Palette.loadPresetPalette(Config.state.currentPresetIndex);
            } else {
                Palette.loadCustomPalette();
            }
        });

        document.getElementById('color-pivot').addEventListener('input', (e) => {
            const pivotVal = parseInt(e.target.value);
            document.getElementById('pivot-val').textContent = pivotVal + '%';
            Palette.loadCustomPalette();
        });

        document.getElementById('color-balance').addEventListener('input', (e) => {
            const balanceVal = parseInt(e.target.value);
            document.getElementById('balance-val').textContent = balanceVal + '%';
            Palette.loadCustomPalette();
        });

        document.getElementById('dynamic-range').addEventListener('input', (e) => {
            const rangeVal = parseInt(e.target.value);
            const steps = Math.pow(2, rangeVal);
            Config.params.dynamicRange = steps;
            document.getElementById('dynrange-val').textContent = steps + ' steps';
            Palette.loadCustomPalette();
        });

        // Adjoint palette controls (only affect dual resolution field)
        document.getElementById('adjoint-enabled').addEventListener('change', (e) => {
            Config.params.adjointEnabled = e.target.checked;
            // Regenerate adjoint palette when enabled/disabled
            if (e.target.checked) {
                Palette.loadCustomPalette();
            } else {
                Config.state.adjointPalette = [];
            }
        });

        document.querySelectorAll('input[name="adjoint-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                Config.params.adjointMode = e.target.value;
                document.querySelectorAll('.radio-option').forEach(opt => {
                    if (opt.querySelector('input[name="adjoint-mode"]')) {
                        opt.classList.remove('selected');
                    }
                });
                e.target.closest('.radio-option').classList.add('selected');
                // Only regenerate if adjoint is enabled
                if (Config.params.adjointEnabled) {
                    Palette.loadCustomPalette();
                }
            });
        });

        document.querySelector('input[name="adjoint-mode"]:checked').closest('.radio-option').classList.add('selected');

        document.getElementById('adjoint-triad-hue').addEventListener('input', (e) => {
            const hueVal = parseInt(e.target.value);
            Config.params.adjointTriadHue = hueVal;
            document.getElementById('triad-val').textContent = hueVal + '°';
            // Only regenerate if adjoint is enabled and using triad mode
            if (Config.params.adjointEnabled && Config.params.adjointMode === 'triad') {
                Palette.loadCustomPalette();
            }
        });

        // Final gain stage controls
        document.getElementById('final-desaturation').addEventListener('input', (e) => {
            Config.params.finalDesaturation = parseInt(e.target.value);
            document.getElementById('desat-val').textContent = Config.params.finalDesaturation + '%';
        });

        document.getElementById('final-brightness').addEventListener('input', (e) => {
            Config.params.finalBrightness = parseInt(e.target.value);
            document.getElementById('brightness-val').textContent = Config.params.finalBrightness + '%';
        });

        // Auto-palette listeners for color inputs only (others have specific handlers already)
        ['color-start', 'color-mid', 'color-end'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    // Check if palette updates are locked (e.g., during batch color changes)
                    if (!window.PF._paletteUpdateLock) {
                        Palette.loadCustomPalette();
                    }
                });
            }
        });

        document.getElementById('compute-adjoint').addEventListener('click', () => {
            const startColor = document.getElementById('color-start').value;
            const triad = Palette.computeAdjointTriad(startColor);

            const startEl = document.getElementById('color-start');
            const midEl = document.getElementById('color-mid');
            const endEl = document.getElementById('color-end');

            // Disable automatic palette loading temporarily
            const wasListening = window.PF._paletteUpdateLock || false;
            window.PF._paletteUpdateLock = true;

            // Set all color values
            startEl.value = triad.start;
            midEl.value = triad.mid;
            endEl.value = triad.end;

            // Re-enable and trigger one palette reload
            window.PF._paletteUpdateLock = wasListening;
            Palette.loadCustomPalette();
        });

        document.getElementById('color-cycle').addEventListener('input', (e) => {
            Config.params.colorCycle = parseFloat(e.target.value);
            document.getElementById('cycle-val').textContent = Config.params.colorCycle.toFixed(1);
        });

        document.getElementById('cycle-palette').addEventListener('click', () => {
            Config.state.currentPresetIndex = (Config.state.currentPresetIndex + 1) % Config.presetPalettes.length;
            Palette.loadPresetPalette(Config.state.currentPresetIndex);
        });

        // Randomize button
        document.getElementById('randomize').addEventListener('click', () => {
            Config.params.frequency = Math.random() * 4.5 + 0.5;
            Config.params.amplitude = Math.random() * 90 + 10;
            Config.params.speed = Math.random() * 0.095 + 0.005;
            Config.params.sources = Math.floor(Math.random() * 5) + 2;
            Config.params.distortion = Math.random() * 2.5 + 0.5;
            Config.params.colorCycle = Math.random() * 2.9 + 0.1;

            updateUIForParam('frequency');
            updateUIForParam('amplitude');
            updateUIForParam('speed');
            updateUIForParam('sources');
            updateUIForParam('distortion');
            updateUIForParam('colorCycle');

            Wave.generateWaveSources();
            Palette.loadPresetPalette(Math.floor(Math.random() * Config.presetPalettes.length));
        });

        // Gamepad controls
        document.getElementById('save-gamepad-map').addEventListener('click', () => {
            Gamepad.saveGamepadMap();
            alert('Gamepad mapping saved!');
        });

        document.getElementById('reset-gamepad-map').addEventListener('click', () => {
            Gamepad.resetToDefaults();
            alert('Gamepad mapping reset to defaults!');
        });
    }

    return {
        setupCollapsible,
        setupEventListeners,
        updateUIForParam
    };
})();
