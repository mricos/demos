/**
 * Phase Field Gamepad Module
 * Handles gamepad input and parameter mapping
 */

window.PF = window.PF || {};

window.PF.Gamepad = (function() {
    'use strict';

    const Config = window.PF.Config;
    const Wave = window.PF.Wave;
    const Palette = window.PF.Palette;

    let gamepadConnected = false;
    let gamepadIndex = -1;

    // Mappable parameters
    const mappableParams = [
        {id: 'none', name: '-- None --', min: 0, max: 1, param: null},
        {id: 'frequency', name: 'Frequency', min: 0.5, max: 5, param: 'frequency'},
        {id: 'amplitude', name: 'Amplitude', min: 10, max: 100, param: 'amplitude'},
        {id: 'speed', name: 'Speed', min: 0.005, max: 0.1, param: 'speed'},
        {id: 'sources', name: 'Wave Sources', min: 1, max: 6, param: 'sources'},
        {id: 'resolution', name: 'Resolution', min: 0, max: 10, param: 'resolution'},
        {id: 'resolution2', name: 'Dual Resolution', min: 0, max: 10, param: 'resolution2'},
        {id: 'blend', name: 'Blend', min: 0, max: 100, param: 'blend'},
        {id: 'distortion', name: 'Distortion', min: 0.5, max: 3, param: 'distortion'},
        {id: 'colorCycle', name: 'Color Cycle', min: 0.1, max: 3, param: 'colorCycle'},
        {id: 'paletteSteps', name: 'Palette Steps', min: 64, max: 512, param: 'paletteSteps'}
    ];

    // Default gamepad mappings
    const defaultGamepadMap = {
        axis0: 'frequency',
        axis1: 'amplitude',
        axis2: 'speed',
        axis3: 'distortion',
        button0: 'none',
        button1: 'none',
        button2: 'none',
        button3: 'none',
        button4: 'resolution',
        button5: 'resolution2',
        button6: 'colorCycle',
        button7: 'blend'
    };

    let gamepadMap = {...defaultGamepadMap};

    function loadGamepadMap() {
        const saved = localStorage.getItem('phaseFieldGamepadMap');
        if (saved) {
            try {
                gamepadMap = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load gamepad map:', e);
                gamepadMap = {...defaultGamepadMap};
            }
        }
    }

    function saveGamepadMap() {
        localStorage.setItem('phaseFieldGamepadMap', JSON.stringify(gamepadMap));
    }

    function populateGamepadDropdowns() {
        const dropdowns = document.querySelectorAll('.gamepad-map');
        dropdowns.forEach(dropdown => {
            dropdown.innerHTML = '';
            mappableParams.forEach(param => {
                const option = document.createElement('option');
                option.value = param.id;
                option.textContent = param.name;
                dropdown.appendChild(option);
            });

            const controlId = dropdown.id.replace('map-', '');
            if (gamepadMap[controlId]) {
                dropdown.value = gamepadMap[controlId];
            }

            dropdown.addEventListener('change', (e) => {
                gamepadMap[controlId] = e.target.value;
            });
        });
    }

    function applyGamepadValue(paramId, inputValue, isButton = false) {
        const paramConfig = mappableParams.find(p => p.id === paramId);
        if (!paramConfig || paramConfig.param === null) return;

        const param = paramConfig.param;
        let value;

        if (isButton) {
            if (inputValue > 0.5) {
                value = paramConfig.max;
            }
        } else {
            const deadzone = 0.15;
            let normalizedValue = inputValue;
            if (Math.abs(normalizedValue) < deadzone) return;

            normalizedValue = (normalizedValue - Math.sign(normalizedValue) * deadzone) / (1 - deadzone);
            normalizedValue = Math.max(-1, Math.min(1, normalizedValue));

            value = paramConfig.min + (normalizedValue + 1) * 0.5 * (paramConfig.max - paramConfig.min);
        }

        if (value !== undefined) {
            if (['sources', 'resolution', 'resolution2', 'paletteSteps'].includes(param)) {
                Config.params[param] = Math.round(value);
            } else {
                Config.params[param] = value;
            }

            // Update UI (will be handled by PF.UI module)
            if (window.PF.UI && window.PF.UI.updateUIForParam) {
                window.PF.UI.updateUIForParam(param);
            }
        }
    }

    function poll() {
        const gamepads = navigator.getGamepads();
        if (!gamepads) return;

        let connected = false;
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                connected = true;
                gamepadIndex = i;
                break;
            }
        }

        if (connected !== gamepadConnected) {
            gamepadConnected = connected;
            document.getElementById('gamepad-status').textContent = connected ? 'Connected' : 'Not Connected';
        }

        if (!gamepadConnected) return;

        const gamepad = gamepads[gamepadIndex];
        if (!gamepad) return;

        // Process axes
        gamepad.axes.forEach((value, index) => {
            const controlId = `axis${index}`;
            const paramId = gamepadMap[controlId];
            if (paramId && paramId !== 'none') {
                applyGamepadValue(paramId, value, false);
            }
        });

        // Process buttons
        gamepad.buttons.forEach((button, index) => {
            const controlId = `button${index}`;
            const paramId = gamepadMap[controlId];
            if (paramId && paramId !== 'none') {
                applyGamepadValue(paramId, button.value, true);
            }
        });
    }

    function setupEventListeners() {
        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad.id);
            gamepadConnected = true;
            gamepadIndex = e.gamepad.index;
            document.getElementById('gamepad-status').textContent = 'Connected';
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            console.log('Gamepad disconnected:', e.gamepad.id);
            gamepadConnected = false;
            gamepadIndex = -1;
            document.getElementById('gamepad-status').textContent = 'Not Connected';
        });
    }

    function resetToDefaults() {
        gamepadMap = {...defaultGamepadMap};
        populateGamepadDropdowns();
        saveGamepadMap();
    }

    return {
        loadGamepadMap,
        saveGamepadMap,
        populateGamepadDropdowns,
        poll,
        setupEventListeners,
        resetToDefaults
    };
})();
