// CYMATICA.ui - UI Control Binding
(function(CYMATICA) {
    'use strict';

    const state = CYMATICA.state._state;
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    function updatePositionInputs() {
        const letter = state.letters[state.selectedLetter];
        $('#pos-x').value = Math.round(letter.x);
        $('#pos-y').value = Math.round(letter.y);
        $('#pos-z').value = Math.round(letter.z);
        $('#letter-scale').value = letter.scale;
        $('#scale-val').textContent = letter.scale.toFixed(1);
    }

    function bindControls() {
        // Panel toggle
        $('#panel-toggle')?.addEventListener('click', () => {
            $('#side-panel').classList.toggle('hidden');
            $('#panel-toggle').textContent = $('#side-panel').classList.contains('hidden') ? '\u25B6' : '\u25C0';
        });

        // Section collapse
        $$('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
            });
        });

        // Collapse/Expand all
        $('#btn-collapse-all')?.addEventListener('click', () => {
            $$('.section-header').forEach(header => header.classList.add('collapsed'));
        });
        $('#btn-expand-all')?.addEventListener('click', () => {
            $$('.section-header').forEach(header => header.classList.remove('collapsed'));
        });

        // Play/Pause animation
        const playPauseBtn = $('#btn-play-pause');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                state.animating = !state.animating;
                playPauseBtn.innerHTML = state.animating ? '&#9724;' : '&#9654;';
                playPauseBtn.classList.toggle('active', state.animating);
                $('#toggle-animation')?.classList.toggle('active', state.animating);
            });
        }

        // Random layout
        $('#btn-random')?.addEventListener('click', () => {
            state.letters.forEach(l => {
                l.x = (Math.random() - 0.5) * 600;
                l.y = (Math.random() - 0.5) * 300;
                l.z = (Math.random() - 0.5) * 200;
                l.scale = 0.5 + Math.random() * 1.5;
            });
            updatePositionInputs();
        });

        // Save state
        $('#btn-save')?.addEventListener('click', () => {
            if (CYMATICA.Persistence?.save) {
                CYMATICA.Persistence.save();
                const btn = $('#btn-save');
                btn.classList.add('active');
                setTimeout(() => btn.classList.remove('active'), 500);
            }
        });

        // Reset/Center button
        $('#btn-reset')?.addEventListener('click', () => {
            CYMATICA.state.reset();
        });

        // Toggle switches
        const toggleHandler = (id, prop, el) => {
            const elem = $(id);
            if (!elem) return;
            elem.addEventListener('click', function() {
                this.classList.toggle('active');
                state[prop] = this.classList.contains('active');
                if (el) el.style.display = state[prop] ? '' : 'none';
                if (prop === 'drawOn' && state.drawOn) {
                    state.drawProgress = 0;
                }
            });
        };

        toggleHandler('#toggle-animation', 'animating');
        toggleHandler('#toggle-scanlines', 'scanlines', $('#scanlines'));
        toggleHandler('#toggle-vignette', 'vignette', $('#vignette'));
        toggleHandler('#toggle-drawon', 'drawOn');
        toggleHandler('#toggle-drawloop', 'drawLoop');
        toggleHandler('#toggle-oscillate', 'colorOscillate');

        // Slider binding helper
        const bindSlider = (sliderId, valId, prop, format = v => v) => {
            const slider = $(sliderId);
            const valEl = $(valId);
            if (!slider) return;
            slider.addEventListener('input', () => {
                state[prop] = parseFloat(slider.value);
                if (valEl) valEl.textContent = format(state[prop]);
            });
        };

        bindSlider('#anim-speed', '#anim-speed-val', 'animSpeed', v => v.toFixed(1) + 'x');
        bindSlider('#concentric-count', '#concentric-val', 'concentric', v => Math.round(v));
        bindSlider('#layer-offset', '#offset-val', 'layerOffset', v => v.toFixed(1));
        bindSlider('#stroke-width', '#stroke-val', 'strokeWidth', v => v.toFixed(2));
        bindSlider('#glow-intensity', '#glow-val', 'glowIntensity', v => Math.round(v));
        bindSlider('#fov', '#fov-val', 'fov', v => Math.round(v));
        bindSlider('#cam-z', '#cam-z-val', 'cameraZ', v => Math.round(v));
        bindSlider('#draw-speed', '#draw-speed-val', 'drawSpeed', v => v.toFixed(1) + 's');
        bindSlider('#oscillate-speed', '#oscillate-speed-val', 'oscillateSpeed', v => v.toFixed(1));

        // Rotation speed sliders
        $('#rot-x-speed')?.addEventListener('input', (e) => {
            state.rotSpeed.x = parseFloat(e.target.value);
            $('#rot-x-val').textContent = Math.round(state.rotSpeed.x);
        });
        $('#rot-y-speed')?.addEventListener('input', (e) => {
            state.rotSpeed.y = parseFloat(e.target.value);
            $('#rot-y-val').textContent = Math.round(state.rotSpeed.y);
        });
        $('#rot-z-speed')?.addEventListener('input', (e) => {
            state.rotSpeed.z = parseFloat(e.target.value);
            $('#rot-z-val').textContent = Math.round(state.rotSpeed.z);
        });

        // Color pickers
        $('#color-primary')?.addEventListener('input', (e) => {
            state.colorPrimary = e.target.value;
        });
        $('#color-secondary')?.addEventListener('input', (e) => {
            state.colorSecondary = e.target.value;
        });

        // Letter selection
        $$('.letter-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                $$('.letter-cell').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
                state.selectedLetter = parseInt(cell.dataset.index);
                updatePositionInputs();
            });
        });

        // Position inputs
        $('#pos-x')?.addEventListener('change', (e) => {
            state.letters[state.selectedLetter].x = parseFloat(e.target.value) || 0;
        });
        $('#pos-y')?.addEventListener('change', (e) => {
            state.letters[state.selectedLetter].y = parseFloat(e.target.value) || 0;
        });
        $('#pos-z')?.addEventListener('change', (e) => {
            state.letters[state.selectedLetter].z = parseFloat(e.target.value) || 0;
        });

        // Letter scale
        $('#letter-scale')?.addEventListener('input', (e) => {
            const scale = parseFloat(e.target.value);
            state.letters[state.selectedLetter].scale = scale;
            $('#scale-val').textContent = scale.toFixed(1);
        });

        // Presets
        const presets = {
            tempest: { colorPrimary: '#00ffff', colorSecondary: '#ffff00', concentric: 6, glowIntensity: 80 },
            battlezone: { colorPrimary: '#00ff00', colorSecondary: '#00aa00', concentric: 3, glowIntensity: 50 },
            starwars: { colorPrimary: '#ff0000', colorSecondary: '#ffff00', concentric: 5, glowIntensity: 70 },
            asteroids: { colorPrimary: '#ffffff', colorSecondary: '#888888', concentric: 2, glowIntensity: 40 },
            neon: { colorPrimary: '#ff00ff', colorSecondary: '#00ffff', concentric: 8, glowIntensity: 90 },
            arcade: { colorPrimary: '#ff6600', colorSecondary: '#00ff66', concentric: 4, glowIntensity: 60 }
        };

        $$('.preset-btn[data-preset]').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = presets[btn.dataset.preset];
                if (preset) Object.assign(state, preset);
            });
        });

        // Layout presets
        const layouts = {
            flat: () => state.letters.forEach((l, i) => { l.x = (i - 3.5) * 100; l.y = 0; l.z = 0; }),
            arc: () => {
                const radius = 400;
                state.letters.forEach((l, i) => {
                    const angle = (i - 3.5) * 0.2;
                    l.x = Math.sin(angle) * radius;
                    l.y = 0;
                    l.z = Math.cos(angle) * radius - radius;
                });
            },
            wave: () => state.letters.forEach((l, i) => {
                l.x = (i - 3.5) * 100;
                l.y = Math.sin(i * 0.8) * 50;
                l.z = Math.cos(i * 0.8) * 30;
            }),
            spiral: () => state.letters.forEach((l, i) => {
                const angle = i * 0.4;
                const radius = 100 + i * 30;
                l.x = Math.cos(angle) * radius;
                l.y = (i - 3.5) * 30;
                l.z = Math.sin(angle) * radius;
            }),
            scatter: () => state.letters.forEach(l => {
                l.x = (Math.random() - 0.5) * 600;
                l.y = (Math.random() - 0.5) * 300;
                l.z = (Math.random() - 0.5) * 200;
            }),
            cylinder: () => {
                const radius = 300;
                state.letters.forEach((l, i) => {
                    const angle = (i / 8) * Math.PI * 2;
                    l.x = Math.sin(angle) * radius;
                    l.y = 0;
                    l.z = Math.cos(angle) * radius;
                });
            }
        };

        $$('.preset-btn[data-layout]').forEach(btn => {
            btn.addEventListener('click', () => {
                const layout = layouts[btn.dataset.layout];
                if (layout) {
                    layout();
                    updatePositionInputs();
                }
            });
        });
    }

    function init() {
        bindControls();
        updatePositionInputs();
    }

    CYMATICA.ui = { init, updatePositionInputs };
})(window.CYMATICA);
