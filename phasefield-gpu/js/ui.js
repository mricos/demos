/**
 * Phase Field UI Module
 * Handles UI controls, event listeners, and user interactions
 */

window.FP = window.FP || {};

window.FP.UI = (function() {
    'use strict';

    const Config = window.FP.Config;
    const Field = window.FP.Field;
    const Optics = window.FP.Optics;
    const Matter = window.FP.Matter;
    const Palette = window.FP.Palette;
    const Gamepad = window.FP.Gamepad;

    function setupCollapsible() {
        const sections = [
            {header: 'header-matter', content: 'section-matter'},
            {header: 'header-object-editor', content: 'section-object-editor'},
            {header: 'header-game', content: 'section-game'},
            {header: 'header-pixelator', content: 'section-pixelator'},
            {header: 'header-performance', content: 'section-performance'},
            {header: 'header-adjoint-field', content: 'section-adjoint-field'},
            {header: 'header-coupling', content: 'section-coupling'},
            {header: 'header-presets', content: 'section-presets'},
            {header: 'header-custom', content: 'section-custom'},
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

    function setupComputeModeControls() {
        const ComputeEngine = window.FP.ComputeEngine;
        if (!ComputeEngine) {
            console.warn('[UI] ComputeEngine not loaded');
            return;
        }

        const capabilities = ComputeEngine.detectCapabilities();

        // Show/hide GPU options based on capabilities
        if (capabilities.webgl) {
            document.getElementById('webgl-option').style.display = 'block';
        }
        if (capabilities.webgpu) {
            document.getElementById('webgpu-option').style.display = 'block';
        }

        // Update GPU status display
        updateGPUStatus(capabilities);

        // Handle mode changes
        document.querySelectorAll('input[name="compute-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const mode = e.target.value;
                let canvas = document.getElementById('canvas');

                console.log('[UI] Switching to', mode, 'mode');
                const success = ComputeEngine.setMode(mode, canvas);

                // Canvas may have been recreated, get fresh reference
                canvas = document.getElementById('canvas');

                if (success) {
                    document.getElementById('current-mode').textContent = mode.toUpperCase();
                    updateGPUStatus(capabilities);
                    console.log('[UI] Successfully switched to', mode, 'mode');
                } else {
                    // Revert radio selection
                    console.warn('[UI] Failed to switch to', mode, 'mode, reverting to CPU');
                    document.querySelector('input[name="compute-mode"][value="cpu"]').checked = true;
                    document.getElementById('current-mode').textContent = 'CPU';
                }
            });
        });

        // Update performance info periodically
        setInterval(updatePerformanceInfo, 1000);
    }

    function updateGPUStatus(capabilities) {
        const statusEl = document.getElementById('gpu-status');
        if (!statusEl) return;

        const parts = [];
        if (capabilities.webgl) parts.push('WebGL✓');
        if (capabilities.webgpu) parts.push('WebGPU✓');

        if (parts.length === 0) {
            statusEl.textContent = 'No GPU support';
            statusEl.style.color = '#ff6600';
        } else {
            statusEl.textContent = parts.join(' ');
            statusEl.style.color = '#4af';
        }
    }

    function updatePerformanceInfo() {
        const ComputeEngine = window.FP.ComputeEngine;
        if (!ComputeEngine) return;

        const mode = ComputeEngine.getMode();
        const fps = Config.performance.fps;

        // Update FPS display with mode indicator
        const fpsEl = document.getElementById('fps');
        if (fpsEl) {
            let suffix = '';
            if (mode === 'cpu') suffix = '';
            else if (mode === 'webgl') suffix = ' [GPU]';
            else if (mode === 'webgpu') suffix = ' [GPGPU]';

            fpsEl.textContent = fps + suffix + (Config.performance.adaptiveQuality < 1.0 ? ' ⚠' : '');
        }
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
                Field.generateWaveSources(Config.params.sources);
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
        // Compute mode controls
        setupComputeModeControls();

        // Matter controls
        document.getElementById('particle-size').addEventListener('input', (e) => {
            Config.particleConfig.particleSize = parseInt(e.target.value);
            document.getElementById('particle-size-val').textContent = Config.particleConfig.particleSize + 'px';

            // Update all existing aperture elements
            const elements = Optics.getAllElements();
            elements.forEach(elem => {
                if (elem.type === Matter.ElementType.APERTURE) {
                    elem.particleSize = Config.particleConfig.particleSize;
                }
            });
        });

        document.getElementById('wall-length').addEventListener('input', (e) => {
            Config.particleConfig.wallLength = parseInt(e.target.value);
            document.getElementById('wall-length-val').textContent = Config.particleConfig.wallLength + 'px';

            // Update all existing aperture elements
            const elements = Optics.getAllElements();
            elements.forEach(elem => {
                if (elem.type === Matter.ElementType.APERTURE) {
                    elem.length = Config.particleConfig.wallLength;
                }
            });
        });

        document.getElementById('aperture-gap').addEventListener('input', (e) => {
            Config.particleConfig.apertureGap = parseInt(e.target.value);
            document.getElementById('aperture-gap-val').textContent = Config.particleConfig.apertureGap + 'px';

            // Update all existing aperture elements
            const elements = Optics.getAllElements();
            elements.forEach(elem => {
                if (elem.type === Matter.ElementType.APERTURE) {
                    elem.slitWidth = Config.particleConfig.apertureGap;
                    elem.slitSeparation = Config.particleConfig.apertureGap;
                }
            });
        });

        document.getElementById('wall-thickness').addEventListener('input', (e) => {
            Config.particleConfig.wallThickness = parseInt(e.target.value);
            document.getElementById('wall-thickness-val').textContent = Config.particleConfig.wallThickness + 'px';

            // Update all existing elements
            const elements = Optics.getAllElements();
            elements.forEach(elem => {
                elem.thickness = Config.particleConfig.wallThickness;
            });
        });

        document.getElementById('lens-curvature').addEventListener('input', (e) => {
            Config.particleConfig.lensCurvature = parseInt(e.target.value);
            const val = Config.particleConfig.lensCurvature;
            let label = val === 0 ? '0 (Flat)' : (val > 0 ? `+${val} (Converging)` : `${val} (Diverging)`);
            document.getElementById('lens-curvature-val').textContent = label;

            // Update all existing lens elements
            const elements = Optics.getAllElements();
            elements.forEach(elem => {
                if (elem.type === Matter.ElementType.LENS) {
                    elem.focalLength = Config.particleConfig.lensCurvature;
                }
            });
        });

        document.getElementById('aperture-count').addEventListener('input', (e) => {
            Config.particleConfig.apertureCount = parseInt(e.target.value);
            document.getElementById('aperture-count-val').textContent = Config.particleConfig.apertureCount;

            // Update all existing aperture elements
            const elements = Optics.getAllElements();
            elements.forEach(elem => {
                if (elem.type === Matter.ElementType.APERTURE) {
                    elem.slitCount = Config.particleConfig.apertureCount;
                }
            });
        });

        document.getElementById('reflection-coeff').addEventListener('input', (e) => {
            Config.particleConfig.reflectionCoefficient = parseFloat(e.target.value);
            document.getElementById('reflection-coeff-val').textContent = Config.particleConfig.reflectionCoefficient.toFixed(2);

            // Update all existing elements
            const elements = Optics.getAllElements();
            elements.forEach(elem => {
                elem.reflectionCoefficient = Config.particleConfig.reflectionCoefficient;
            });
        });

        document.getElementById('wall-curvature').addEventListener('input', (e) => {
            Config.particleConfig.wallCurvature = parseInt(e.target.value);
            const val = Config.particleConfig.wallCurvature;
            let label = val === 0 ? '0 (Flat)' : (val > 0 ? `+${val}` : `${val}`);
            document.getElementById('wall-curvature-val').textContent = label;

            // Update all existing wall and aperture elements
            const elements = Optics.getAllElements();
            elements.forEach(elem => {
                if (elem.type === Matter.ElementType.WALL || elem.type === Matter.ElementType.APERTURE) {
                    elem.curvature = Config.particleConfig.wallCurvature;
                }
            });
        });

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
            Field.generateWaveSources(Config.params.sources);
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
                    if (!window.FP._paletteUpdateLock) {
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
            const wasListening = window.FP._paletteUpdateLock || false;
            window.FP._paletteUpdateLock = true;

            // Set all color values
            startEl.value = triad.start;
            midEl.value = triad.mid;
            endEl.value = triad.end;

            // Re-enable and trigger one palette reload
            window.FP._paletteUpdateLock = wasListening;
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

            Field.generateWaveSources(Config.params.sources);
            Palette.loadPresetPalette(Math.floor(Math.random() * Config.presetPalettes.length));
        });

        // Coupling controls
        document.querySelectorAll('input[name="blend-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                Config.params.blendMode = e.target.value;
                console.log('Blend mode:', Config.params.blendMode);
            });
        });

        // Object Editor controls
        document.getElementById('delete-object').addEventListener('click', () => {
            const selectedIndex = Config.state.editingElementIndex;
            if (selectedIndex >= 0) {
                Optics.removeElement(selectedIndex);
                Config.state.editingElementIndex = -1;
                updateObjectEditor();
                console.log('Deleted object at index', selectedIndex);
            }
        });

        // Gamepad controls
        setupGamepadUI();

        document.getElementById('save-gamepad').addEventListener('click', () => {
            Gamepad.saveGamepadConfig();
            alert('Gamepad settings saved!');
        });

        document.getElementById('reset-gamepad').addEventListener('click', () => {
            Gamepad.resetToDefaults();
            alert('Gamepad settings reset to defaults!');
        });

        document.getElementById('clear-storage').addEventListener('click', () => {
            if (confirm('This will clear ALL saved settings and reload the page. Continue?')) {
                localStorage.clear();
                location.reload();
            }
        });

        document.getElementById('reset-gamepad-state').addEventListener('click', () => {
            Gamepad.emergencyReset();
        });

        document.getElementById('dump-gamepad').addEventListener('click', () => {
            Gamepad.dumpGamepadState();
        });
    }

    function setupGamepadUI() {
        // Generate button configuration UI
        const container = document.getElementById('button-config-container');
        if (!container) return;

        const actions = [
            { value: 'none', label: 'None' },
            { value: 'speed-up', label: 'Speed Up' },
            { value: 'speed-down', label: 'Speed Down' },
            { value: 'freq-up', label: 'Frequency Up' },
            { value: 'freq-down', label: 'Frequency Down' },
            { value: 'amp-up', label: 'Amplitude Up' },
            { value: 'amp-down', label: 'Amplitude Down' }
        ];

        // Create button configs for first 8 buttons (skip A and B buttons)
        for (let i = 2; i < 10; i++) {
            const row = document.createElement('div');
            row.className = 'button-config-row';

            const label = document.createElement('label');
            label.textContent = `Btn ${i}:`;

            const actionSelect = document.createElement('select');
            actionSelect.id = `button-${i}-action`;
            actions.forEach(action => {
                const option = document.createElement('option');
                option.value = action.value;
                option.textContent = action.label;
                actionSelect.appendChild(option);
            });

            const curveSelect = document.createElement('select');
            curveSelect.id = `button-${i}-curve`;
            Object.keys(Gamepad.pressureCurves).forEach(key => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = Gamepad.pressureCurves[key].name;
                curveSelect.appendChild(option);
            });

            row.appendChild(label);
            row.appendChild(actionSelect);
            row.appendChild(curveSelect);
            container.appendChild(row);

            // Add event listeners
            actionSelect.addEventListener('change', (e) => {
                Gamepad.gamepadConfig.buttons[i].action = e.target.value;
            });

            curveSelect.addEventListener('change', (e) => {
                Gamepad.gamepadConfig.buttons[i].pressureCurve = e.target.value;
            });
        }

        // A/B button selects
        const aSelect = document.getElementById('a-button-select');
        const bSelect = document.getElementById('b-button-select');

        if (aSelect) {
            aSelect.addEventListener('change', (e) => {
                Gamepad.gamepadConfig.buttonA = parseInt(e.target.value);
            });
        }

        if (bSelect) {
            bSelect.addEventListener('change', (e) => {
                Gamepad.gamepadConfig.buttonB = parseInt(e.target.value);
            });
        }
    }

    /**
     * Update Object Editor UI with selected object parameters
     */
    function updateObjectEditor() {
        const selectedIndex = Config.state.editingElementIndex;
        const elements = Optics.getAllElements();
        const container = document.getElementById('object-params-container');
        const nameDisplay = document.getElementById('selected-object-name');

        if (selectedIndex < 0 || selectedIndex >= elements.length) {
            // No selection - show list of all objects
            nameDisplay.textContent = 'None';

            if (elements.length === 0) {
                container.innerHTML = '<div class="help-text" style="text-align: center; padding: 20px;">No objects. Press B to create one.</div>';
            } else {
                let html = '<div class="help-text" style="margin-bottom: 10px;">Available Objects (Press X to select):</div>';
                html += '<div style="max-height: 200px; overflow-y: auto;">';
                for (let i = 0; i < elements.length; i++) {
                    const elem = elements[i];
                    html += `<div style="padding: 8px; margin: 4px 0; background: rgba(255,255,255,0.1); border-radius: 4px; cursor: pointer;" onclick="window.FP.UI.selectObject(${i})">
                        #${i}: ${elem.type} at (${Math.round(elem.x)}, ${Math.round(elem.y)}) - reflCoeff: ${elem.reflectionCoefficient.toFixed(2)}
                    </div>`;
                }
                html += '</div>';
                container.innerHTML = html;
            }
            return;
        }

        const element = elements[selectedIndex];
        nameDisplay.textContent = `${element.type} #${selectedIndex}`;

        // Build parameter controls based on element type
        let html = '';

        // Common parameters
        html += `
            <div class="control-group">
                <label>Position X <span class="value-display" id="obj-x-val">${Math.round(element.x)}px</span></label>
                <input type="range" id="obj-x" min="0" max="800" step="1" value="${element.x}">
            </div>
            <div class="control-group">
                <label>Position Y <span class="value-display" id="obj-y-val">${Math.round(element.y)}px</span></label>
                <input type="range" id="obj-y" min="0" max="800" step="1" value="${element.y}">
            </div>
            <div class="control-group">
                <label>Angle <span class="value-display" id="obj-angle-val">${Math.round(element.angle * 180 / Math.PI)}°</span></label>
                <input type="range" id="obj-angle" min="0" max="360" step="1" value="${element.angle * 180 / Math.PI}">
            </div>
            <div class="control-group">
                <label>Reflection Coefficient <span class="value-display" id="obj-refl-val">${element.reflectionCoefficient.toFixed(2)}</span></label>
                <input type="range" id="obj-refl" min="0" max="2" step="0.01" value="${element.reflectionCoefficient}">
                <div class="help-text">0: Blackbody absorber | 1: Perfect reflection | >1: Color-dependent</div>
            </div>
        `;

        // Type-specific parameters
        if (element.type === Matter.ElementType.APERTURE) {
            html += `
                <div class="control-group">
                    <label>Slit Width <span class="value-display" id="obj-slitwidth-val">${element.slitWidth}px</span></label>
                    <input type="range" id="obj-slitwidth" min="5" max="200" step="5" value="${element.slitWidth}">
                </div>
                <div class="control-group">
                    <label>Slit Separation <span class="value-display" id="obj-slitsep-val">${element.slitSeparation}px</span></label>
                    <input type="range" id="obj-slitsep" min="5" max="200" step="5" value="${element.slitSeparation}">
                </div>
                <div class="control-group">
                    <label>Length <span class="value-display" id="obj-length-val">${element.length}px</span></label>
                    <input type="range" id="obj-length" min="50" max="400" step="10" value="${element.length}">
                </div>
            `;
        } else if (element.type === Matter.ElementType.LENS) {
            html += `
                <div class="control-group">
                    <label>Focal Length <span class="value-display" id="obj-focal-val">${element.focalLength}px</span></label>
                    <input type="range" id="obj-focal" min="-200" max="200" step="10" value="${element.focalLength}">
                </div>
                <div class="control-group">
                    <label>Diameter <span class="value-display" id="obj-diameter-val">${element.length}px</span></label>
                    <input type="range" id="obj-diameter" min="50" max="200" step="10" value="${element.length}">
                </div>
            `;
        }

        container.innerHTML = html;

        // Add event listeners for parameter changes
        const addParamListener = (id, prop, valId, formatter = v => v) => {
            const elem = document.getElementById(id);
            if (elem) {
                elem.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    element[prop] = formatter(val);
                    const display = document.getElementById(valId);
                    if (display) display.textContent = e.target.value + (valId.includes('angle') ? '°' : 'px');
                });
            }
        };

        addParamListener('obj-x', 'x', 'obj-x-val');
        addParamListener('obj-y', 'y', 'obj-y-val');
        addParamListener('obj-angle', 'angle', 'obj-angle-val', v => v * Math.PI / 180);
        addParamListener('obj-slitwidth', 'slitWidth', 'obj-slitwidth-val');
        addParamListener('obj-slitsep', 'slitSeparation', 'obj-slitsep-val');
        addParamListener('obj-length', 'length', 'obj-length-val');
        addParamListener('obj-focal', 'focalLength', 'obj-focal-val');
        addParamListener('obj-diameter', 'length', 'obj-diameter-val');

        // Reflection coefficient listener (special handling for display)
        const reflElem = document.getElementById('obj-refl');
        if (reflElem) {
            reflElem.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                element.reflectionCoefficient = val;
                const display = document.getElementById('obj-refl-val');
                if (display) display.textContent = val.toFixed(2);
            });
        }
    }

    function selectObject(index) {
        const elements = Optics.getAllElements();
        if (index >= 0 && index < elements.length) {
            Config.state.editingElementIndex = index;
            Config.state.controlMode = 'matter';
            updateObjectEditor();
            if (Gamepad && Gamepad.updateUI) {
                Gamepad.updateUI();
            }
        }
    }

    return {
        setupCollapsible,
        setupEventListeners,
        updateUIForParam,
        updateObjectEditor,
        selectObject
    };
})();
