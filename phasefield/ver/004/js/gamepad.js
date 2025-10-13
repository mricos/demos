/**
 * Phase Field Gamepad Module
 * Handles gamepad input with A/B modes and pressure curves
 */

window.FP = window.FP || {};

window.FP.Gamepad = (function() {
    'use strict';

    const Config = window.FP.Config;
    const Field = window.FP.Field;
    const Optics = window.FP.Optics;
    const Matter = window.FP.Matter;
    const UI = window.FP.UI;

    let gamepadConnected = false;
    let gamepadIndex = -1;

    // Button press state for pressure curves
    const buttonState = {};

    // Axis calibration - store initial values as center
    let axisCenter = null;

    // Stuck axis detection (including axis 5 for Logitech controllers)
    const axisHistory = {
        0: [], 1: [], 2: [], 3: [], 5: []
    };
    const axisStuckWarned = {
        0: false, 1: false, 2: false, 3: false, 5: false
    };
    const STUCK_THRESHOLD = 30; // frames
    const STUCK_TOLERANCE = 0.05; // variance threshold

    // Pressure curve presets
    const pressureCurves = {
        'linear': { name: 'Linear', minTime: 0, maxTime: 1000, minRate: 1, maxRate: 1 },
        'slow': { name: 'Slow Ramp', minTime: 100, maxTime: 2000, minRate: 1, maxRate: 2 },
        'medium': { name: 'Medium Ramp', minTime: 100, maxTime: 1500, minRate: 1, maxRate: 4 },
        'fast': { name: 'Fast Ramp', minTime: 50, maxTime: 1000, minRate: 1, maxRate: 4 },
        'aggressive': { name: 'Aggressive', minTime: 50, maxTime: 800, minRate: 1, maxRate: 8 }
    };

    // Gamepad configuration (saved to localStorage)
    let gamepadConfig = {
        buttonA: 1,      // Button index for A mode (8BitDo: physical A button)
        buttonB: 0,      // Button index for B mode (8BitDo: physical B button)

        // Button mappings with pressure curves
        buttons: {}      // Will be populated with button configs
    };

    // Initialize button configs
    for (let i = 0; i < 16; i++) {
        gamepadConfig.buttons[i] = {
            action: 'none',
            pressureCurve: 'medium'
        };
        buttonState[i] = {
            pressed: false,
            pressStartTime: 0,
            value: 0
        };
    }

    function loadGamepadConfig() {
        // Clear old incompatible gamepad mapping system
        const oldMap = localStorage.getItem('phaseFieldGamepadMap');
        if (oldMap) {
            console.log('Clearing old gamepad mapping system...');
            localStorage.removeItem('phaseFieldGamepadMap');
        }

        const saved = localStorage.getItem('phaseFieldGamepadConfig');
        if (saved) {
            try {
                const loaded = JSON.parse(saved);
                gamepadConfig = {...gamepadConfig, ...loaded};

                console.log('Loaded gamepad config - buttonA:', gamepadConfig.buttonA, 'buttonB:', gamepadConfig.buttonB);

                // Ensure all button actions are reset to 'none' to prevent stuck states
                for (let i = 0; i < 16; i++) {
                    if (!gamepadConfig.buttons[i]) {
                        gamepadConfig.buttons[i] = {
                            action: 'none',
                            pressureCurve: 'medium'
                        };
                    } else {
                        // Force reset all actions to 'none' for this version
                        gamepadConfig.buttons[i].action = 'none';
                    }
                }
            } catch (e) {
                console.error('Failed to load gamepad config:', e);
            }
        }
    }

    function saveGamepadConfig() {
        localStorage.setItem('phaseFieldGamepadConfig', JSON.stringify(gamepadConfig));
    }

    function resetToDefaults() {
        // Reset button mappings
        for (let i = 0; i < 16; i++) {
            gamepadConfig.buttons[i] = {
                action: 'none',
                pressureCurve: 'medium'
            };
        }

        // Set default A/B buttons (8BitDo layout)
        gamepadConfig.buttonA = 1;  // Physical A button
        gamepadConfig.buttonB = 0;  // Physical B button

        saveGamepadConfig();
        updateUI();
    }

    function getPressureMultiplier(buttonIndex) {
        const state = buttonState[buttonIndex];
        const config = gamepadConfig.buttons[buttonIndex];
        const curve = pressureCurves[config.pressureCurve];

        if (!state.pressed) return 0;

        const holdTime = performance.now() - state.pressStartTime;

        // Quick tap
        if (holdTime < curve.minTime) {
            return curve.minRate;
        }

        // Ramp up over time
        const progress = Math.min(1, (holdTime - curve.minTime) / (curve.maxTime - curve.minTime));
        return curve.minRate + (curve.maxRate - curve.minRate) * progress;
    }

    let debugFrameCount = 0;

    function handleWaveMode(gamepad, canvas) {
        // Wave Mode: Control first two wave sources with left and right sticks
        const deadzone = 0.15;
        const moveSpeed = 3;

        // Right stick controls source 0
        // NOTE: Some gamepads (like Logitech) use axis 5 for right stick Y instead of axis 3
        if (Field.getSourceCount() > 0) {
            // Use axis 5 if axis 3 is stuck at extreme value (common Logitech issue)
            const axis3Stuck = Math.abs(gamepad?.axes[3] || 0) > 0.9;
            const rightYAxis = (axis3Stuck && gamepad?.axes[5] !== undefined) ? 5 : 3;

            const rightX = gamepad?.axes[2] || 0;
            const rightY = gamepad?.axes[rightYAxis] || 0;

            if (Math.abs(rightX) > deadzone || Math.abs(rightY) > deadzone) {
                const source = Field.getSource(0);
                const newX = Math.max(0, Math.min(canvas.width, source.x + rightX * moveSpeed));
                const newY = Math.max(0, Math.min(canvas.height, source.y + rightY * moveSpeed));
                Field.moveSource(0, newX, newY);
            }
        }

        // Left stick controls source 1
        if (Field.getSourceCount() > 1) {
            const leftX = gamepad?.axes[0] || 0;
            const leftY = gamepad?.axes[1] || 0;

            if (Math.abs(leftX) > deadzone || Math.abs(leftY) > deadzone) {
                const source = Field.getSource(1);
                const newX = Math.max(0, Math.min(canvas.width, source.x + leftX * moveSpeed));
                const newY = Math.max(0, Math.min(canvas.height, source.y + leftY * moveSpeed));
                Field.moveSource(1, newX, newY);
            }
        }
    }

    function handleMatterMode(gamepad, canvas) {
        // Matter Mode: Control selected optical element with sticks
        const deadzone = 0.15;
        const moveSpeed = 3;
        const rotateSpeed = 0.05;

        const elements = Optics.getAllElements();
        if (Config.state.editingElementIndex < 0 || Config.state.editingElementIndex >= elements.length) {
            return; // No element selected
        }

        const element = elements[Config.state.editingElementIndex];

        // Left stick: Position control (X/Y)
        const leftX = gamepad?.axes[0] || 0;
        const leftY = gamepad?.axes[1] || 0;

        if (Math.abs(leftX) > deadzone || Math.abs(leftY) > deadzone) {
            element.x = Math.max(0, Math.min(canvas.width, element.x + leftX * moveSpeed));
            element.y = Math.max(0, Math.min(canvas.height, element.y + leftY * moveSpeed));
        }

        // Right stick: Rotation control (horizontal axis only)
        const axis3Stuck = Math.abs(gamepad?.axes[3] || 0) > 0.9;
        const rightYAxis = (axis3Stuck && gamepad?.axes[5] !== undefined) ? 5 : 3;
        const rightX = gamepad?.axes[2] || 0;

        if (Math.abs(rightX) > deadzone) {
            element.angle += rightX * rotateSpeed;
            // Normalize angle to 0-2π
            while (element.angle < 0) element.angle += Math.PI * 2;
            while (element.angle >= Math.PI * 2) element.angle -= Math.PI * 2;
        }

        // Update UI in real-time
        if (UI && UI.updateObjectEditor) {
            UI.updateObjectEditor();
        }
    }

    function pollGamepad() {
        const gamepads = navigator.getGamepads();
        if (!gamepads) return;

        let connected = false;
        let gamepad = null;

        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                connected = true;
                gamepadIndex = i;
                gamepad = gamepads[i];
                break;
            }
        }

        if (connected !== gamepadConnected) {
            gamepadConnected = connected;
            const statusEl = document.getElementById('gamepad-status');
            if (statusEl) {
                statusEl.textContent = connected ? 'Connected' : 'Not Connected';
            }

            if (connected && gamepad) {
                // Calibrate: store current axis positions as center (including axis 5 for Logitech)
                axisCenter = [];
                for (let i = 0; i < Math.max(6, gamepad.axes.length); i++) {
                    axisCenter[i] = gamepad.axes[i] || 0;
                }
                console.log('Gamepad calibrated, axes:', axisCenter);
            }

            // Clear all button states on connection change
            if (!connected) {
                axisCenter = null;
                for (let i = 0; i < 16; i++) {
                    buttonState[i].pressed = false;
                    buttonState[i].pressStartTime = 0;
                    buttonState[i].value = 0;
                }
            }
        }

        if (!gamepadConnected || !gamepad) {
            // Reset joystick visuals when disconnected
            updateJoystickVisuals(null);
            return;
        }

        const canvas = document.getElementById('canvas');

        // Update joystick visuals
        updateJoystickVisuals(gamepad);

        // Ensure all button states are initialized
        for (let i = 0; i < gamepad.buttons.length; i++) {
            if (!buttonState[i]) {
                buttonState[i] = { pressed: false, pressStartTime: 0, value: 0 };
            }
        }

        // Handle A button - Toggle between wave mode and matter mode
        // A button is used to SELECT mode, not create elements
        const aPressed = gamepad.buttons[gamepadConfig.buttonA]?.pressed;
        if (aPressed && !buttonState[gamepadConfig.buttonA].pressed) {
            console.log('A button pressed (button index:', gamepadConfig.buttonA, ')');
            const elements = Optics.getAllElements();

            if (Config.state.controlMode === 'wave') {
                // Entering matter mode: only allow if there are elements to edit
                if (elements.length > 0) {
                    Config.state.controlMode = 'matter';
                    // Select first element if none selected
                    if (Config.state.editingElementIndex < 0) {
                        Config.state.editingElementIndex = 0;
                    }
                    console.log('Control mode: matter, editing element #' + Config.state.editingElementIndex);
                    if (UI && UI.updateObjectEditor) {
                        UI.updateObjectEditor();
                    }
                } else {
                    console.log('Cannot enter matter mode: no elements exist. Press B to create one.');
                }
            } else {
                // Exiting matter mode: always go back to wave
                Config.state.controlMode = 'wave';
                console.log('Control mode: wave');
            }
            updateModeUI();
        }
        buttonState[gamepadConfig.buttonA].pressed = aPressed;

        // Handle B button - Create NEW element
        const bPressed = gamepad.buttons[gamepadConfig.buttonB]?.pressed;
        if (bPressed && !buttonState[gamepadConfig.buttonB].pressed) {
            console.log('B button pressed (button index:', gamepadConfig.buttonB, ')');
            // Create new aperture at canvas center with current aperture count
            const newAperture = new Matter.Aperture(
                canvas.width / 2,
                canvas.height / 2,
                0,  // angle
                Config.particleConfig.wallLength,
                Config.particleConfig.wallThickness,
                {
                    slitCount: Config.particleConfig.apertureCount,
                    slitWidth: Config.particleConfig.apertureGap,
                    slitSeparation: Config.particleConfig.apertureGap,
                    particleSize: Config.particleConfig.particleSize
                },
                Config.particleConfig.reflectionCoefficient
            );
            const newElement = newAperture;
            const newIndex = Optics.addElement(newElement);
            Config.state.editingElementIndex = newIndex;
            console.log('Created new element #' + newIndex);

            // Switch to matter mode to allow immediate manipulation
            Config.state.controlMode = 'matter';

            // Update UI
            if (UI && UI.updateObjectEditor) {
                UI.updateObjectEditor();
            }
            updateModeUI();
        }
        buttonState[gamepadConfig.buttonB].pressed = bPressed;

        // Handle X button (button 2) - cycle through existing elements for selection
        const xPressed = gamepad.buttons[2]?.pressed;
        if (xPressed && !buttonState[2].pressed) {
            const elements = Optics.getAllElements();
            if (elements.length > 0) {
                Config.state.editingElementIndex = (Config.state.editingElementIndex + 1) % elements.length;
                console.log(`Selected element #${Config.state.editingElementIndex}: ${elements[Config.state.editingElementIndex].type}`);

                // Switch to matter mode when selecting
                Config.state.controlMode = 'matter';

                // Update UI to show selected object
                if (UI && UI.updateObjectEditor) {
                    UI.updateObjectEditor();
                }
                updateModeUI();
            }
        }
        buttonState[2].pressed = xPressed;

        // Handle shoulder buttons with debouncing
        // Based on 8Bitdo mapping: 6=left top, 8=left bottom, 7=right top, 9=right bottom

        // Left buttons control frequency
        // Button 6 (left top): decrease frequency
        const btn6 = gamepad.buttons[6]?.pressed;
        if (btn6 && !buttonState[6].pressed) {
            Config.params.frequency = Math.max(0.5, Config.params.frequency - 0.1);
            // Update UI slider
            const freqSlider = document.getElementById('frequency');
            const freqDisplay = document.getElementById('freq-val');
            if (freqSlider) freqSlider.value = Config.params.frequency;
            if (freqDisplay) freqDisplay.textContent = Config.params.frequency.toFixed(1);
            console.log('Frequency:', Config.params.frequency.toFixed(2));
        }
        buttonState[6].pressed = btn6;

        // Button 8 (left bottom): increase frequency
        const btn8 = gamepad.buttons[8]?.pressed;
        if (btn8 && !buttonState[8].pressed) {
            Config.params.frequency = Math.min(5, Config.params.frequency + 0.1);
            // Update UI slider
            const freqSlider = document.getElementById('frequency');
            const freqDisplay = document.getElementById('freq-val');
            if (freqSlider) freqSlider.value = Config.params.frequency;
            if (freqDisplay) freqDisplay.textContent = Config.params.frequency.toFixed(1);
            console.log('Frequency:', Config.params.frequency.toFixed(2));
        }
        buttonState[8].pressed = btn8;

        // Right buttons control aperture gap
        // Button 7 (right top): increase gap (open aperture)
        const btn7 = gamepad.buttons[7]?.pressed;
        if (btn7 && !buttonState[7].pressed) {
            Config.particleConfig.apertureGap = Math.min(Config.particleConfig.wallLength, Config.particleConfig.apertureGap + 5);
            console.log('Aperture gap:', Config.particleConfig.apertureGap.toFixed(0));

            // Update UI
            const gapSlider = document.getElementById('aperture-gap');
            const gapDisplay = document.getElementById('aperture-gap-val');
            if (gapSlider) gapSlider.value = Config.particleConfig.apertureGap;
            if (gapDisplay) gapDisplay.textContent = Config.particleConfig.apertureGap + 'px';

            // Update all existing aperture elements
            const elements = Optics.getAllElements();
            elements.forEach(elem => {
                if (elem.type === Matter.ElementType.APERTURE) {
                    elem.slitWidth = Config.particleConfig.apertureGap;
                    elem.slitSeparation = Config.particleConfig.apertureGap;
                }
            });
        }
        buttonState[7].pressed = btn7;

        // Button 9 (right bottom): decrease gap (close aperture)
        const btn9 = gamepad.buttons[9]?.pressed;
        if (btn9 && !buttonState[9].pressed) {
            Config.particleConfig.apertureGap = Math.max(0, Config.particleConfig.apertureGap - 5);
            console.log('Aperture gap:', Config.particleConfig.apertureGap.toFixed(0));

            // Update UI
            const gapSlider = document.getElementById('aperture-gap');
            const gapDisplay = document.getElementById('aperture-gap-val');
            if (gapSlider) gapSlider.value = Config.particleConfig.apertureGap;
            if (gapDisplay) gapDisplay.textContent = Config.particleConfig.apertureGap + 'px';

            // Update all existing aperture elements
            const elements = Optics.getAllElements();
            elements.forEach(elem => {
                if (elem.type === Matter.ElementType.APERTURE) {
                    elem.slitWidth = Config.particleConfig.apertureGap;
                    elem.slitSeparation = Config.particleConfig.apertureGap;
                }
            });
        }
        buttonState[9].pressed = btn9;

        // Handle current control mode
        if (Config.state.controlMode === 'wave') {
            handleWaveMode(gamepad, canvas);
        } else if (Config.state.controlMode === 'matter') {
            handleMatterMode(gamepad, canvas);
        }

        // DISABLED: All button state tracking and actions disabled
        // // Update button states for pressure curves
        // for (let i = 0; i < gamepad.buttons.length; i++) {
        //     const button = gamepad.buttons[i];
        //     const state = buttonState[i];
        //
        //     if (button.pressed && !state.pressed) {
        //         // Button just pressed
        //         state.pressed = true;
        //         state.pressStartTime = performance.now();
        //     } else if (!button.pressed && state.pressed) {
        //         // Button released
        //         state.pressed = false;
        //         state.pressStartTime = 0;
        //     }
        //
        //     state.value = button.value;
        // }
        //
        // // Process button actions with pressure curves
        // for (let i = 0; i < gamepad.buttons.length; i++) {
        //     if (i === gamepadConfig.buttonA || i === gamepadConfig.buttonB) continue;
        //
        //     const config = gamepadConfig.buttons[i];
        //     if (config.action !== 'none' && buttonState[i].pressed) {
        //         const multiplier = getPressureMultiplier(i);
        //         applyButtonAction(config.action, multiplier);
        //     }
        // }
    }

    function applyButtonAction(action, multiplier) {
        // Apply button actions with pressure multiplier
        const delta = 0.1 * multiplier;

        switch (action) {
            case 'speed-up':
                Config.params.speed = Math.min(0.1, Config.params.speed + delta * 0.01);
                break;
            case 'speed-down':
                Config.params.speed = Math.max(0.005, Config.params.speed - delta * 0.01);
                break;
            case 'freq-up':
                Config.params.frequency = Math.min(5, Config.params.frequency + delta);
                break;
            case 'freq-down':
                Config.params.frequency = Math.max(0.5, Config.params.frequency - delta);
                break;
            case 'amp-up':
                Config.params.amplitude = Math.min(100, Config.params.amplitude + delta * 10);
                break;
            case 'amp-down':
                Config.params.amplitude = Math.max(10, Config.params.amplitude - delta * 10);
                break;
        }
    }

    function updateModeUI() {
        const modeDisplayA = document.getElementById('mode-a-indicator');
        const modeDisplayB = document.getElementById('mode-b-indicator');

        if (modeDisplayA && modeDisplayB) {
            if (Config.state.controlMode === 'wave') {
                modeDisplayA.classList.add('active');
                modeDisplayB.classList.remove('active');
                modeDisplayA.textContent = 'WAVE';
                modeDisplayB.textContent = 'MATTER';
            } else {
                modeDisplayA.classList.remove('active');
                modeDisplayB.classList.add('active');
                modeDisplayA.textContent = 'WAVE';
                modeDisplayB.textContent = 'MATTER';
            }
        }
    }

    function isAxisStuck(axisIndex, value) {
        // Add current value to history
        if (!axisHistory[axisIndex]) {
            axisHistory[axisIndex] = [];
        }
        axisHistory[axisIndex].push(value);

        // Keep only recent history
        if (axisHistory[axisIndex].length > STUCK_THRESHOLD) {
            axisHistory[axisIndex].shift();
        }

        // Need enough samples
        if (axisHistory[axisIndex].length < STUCK_THRESHOLD) {
            return false;
        }

        // Check if all recent values are within tolerance
        const avg = axisHistory[axisIndex].reduce((a, b) => a + b) / axisHistory[axisIndex].length;
        const variance = axisHistory[axisIndex].reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / axisHistory[axisIndex].length;
        const isStuck = variance < STUCK_TOLERANCE && Math.abs(avg) > 0.8;

        // Track stuck state silently (no console spam)
        axisStuckWarned[axisIndex] = isStuck;

        return isStuck;
    }

    function getFilteredAxis(gamepad, axisIndex) {
        const rawValue = gamepad?.axes[axisIndex] || 0;

        if (isAxisStuck(axisIndex, rawValue)) {
            return 0; // Silently filter
        }

        return rawValue;
    }

    function updateJoystickVisuals(gamepad) {
        // Left stick (axes 0, 1) - use filtered values
        const leftX = getFilteredAxis(gamepad, 0);
        const leftY = getFilteredAxis(gamepad, 1);

        const leftStick = document.getElementById('left-stick');
        const leftValues = document.getElementById('left-values');

        if (leftStick) {
            const leftPosX = 50 + (leftX * 38);
            const leftPosY = 50 + (leftY * 38);
            leftStick.style.left = `${leftPosX}%`;
            leftStick.style.top = `${leftPosY}%`;
        }

        if (leftValues) {
            leftValues.textContent = `X: ${leftX.toFixed(2)} Y: ${leftY.toFixed(2)}`;
        }

        // Right stick - detect if using axis 5 (Logitech) or axis 3 (standard)
        const rightX = gamepad?.axes[2] || 0;
        // Use axis 5 if axis 3 is stuck at extreme value
        const axis3Stuck = Math.abs(gamepad?.axes[3] || 0) > 0.9;
        const rightYAxis = (axis3Stuck && gamepad?.axes[5] !== undefined) ? 5 : 3;
        const rightY = gamepad?.axes[rightYAxis] || 0;

        const rightStick = document.getElementById('right-stick');
        const rightValues = document.getElementById('right-values');

        if (rightStick) {
            const rightPosX = 50 + (rightX * 38);
            const rightPosY = 50 + (rightY * 38);
            rightStick.style.left = `${rightPosX}%`;
            rightStick.style.top = `${rightPosY}%`;

            // Visual warning if stuck
            const rightXStuck = isAxisStuck(2, gamepad?.axes[2] || 0);
            const rightYStuck = isAxisStuck(rightYAxis, gamepad?.axes[rightYAxis] || 0);
            if (rightXStuck || rightYStuck) {
                rightStick.style.background = '#ff0000';
                rightStick.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.8)';
            } else {
                rightStick.style.background = '';
                rightStick.style.boxShadow = '';
            }
        }

        if (rightValues) {
            const rightXStuck = isAxisStuck(2, gamepad?.axes[2] || 0);
            const rightYStuck = isAxisStuck(rightYAxis, gamepad?.axes[rightYAxis] || 0);
            const warning = (rightXStuck || rightYStuck) ? ' ⚠️STUCK' : '';
            rightValues.textContent = `X: ${rightX.toFixed(2)} Y[${rightYAxis}]: ${rightY.toFixed(2)}${warning}`;
        }

        // Debug: Log to console when sticks are moved (disabled - use Dump button instead)
        // if (gamepad && (Math.abs(leftX) > 0.2 || Math.abs(leftY) > 0.2 || Math.abs(rightX) > 0.2 || Math.abs(rightY) > 0.2)) {
        //     console.log(`L: (${leftX.toFixed(2)}, ${leftY.toFixed(2)}) | R: (${rightX.toFixed(2)}, ${rightY.toFixed(2)})`);
        // }
    }

    function updateUI() {
        // Update mode indicators
        updateModeUI();

        // Update button assignment dropdowns
        for (let i = 0; i < 16; i++) {
            const actionSelect = document.getElementById(`button-${i}-action`);
            const curveSelect = document.getElementById(`button-${i}-curve`);

            if (actionSelect) {
                actionSelect.value = gamepadConfig.buttons[i].action;
            }
            if (curveSelect) {
                curveSelect.value = gamepadConfig.buttons[i].pressureCurve;
            }
        }

        // Update A/B button selects
        const aButtonSelect = document.getElementById('a-button-select');
        const bButtonSelect = document.getElementById('b-button-select');

        if (aButtonSelect) aButtonSelect.value = gamepadConfig.buttonA;
        if (bButtonSelect) bButtonSelect.value = gamepadConfig.buttonB;
    }

    function setupEventListeners() {
        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad.id);
            gamepadConnected = true;
            gamepadIndex = e.gamepad.index;
            const statusEl = document.getElementById('gamepad-status');
            if (statusEl) statusEl.textContent = 'Connected';
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            console.log('Gamepad disconnected:', e.gamepad.id);
            gamepadConnected = false;
            gamepadIndex = -1;
            const statusEl = document.getElementById('gamepad-status');
            if (statusEl) statusEl.textContent = 'Not Connected';
        });
    }

    function dumpGamepadState() {
        console.log('=== GAMEPAD STATE DUMP ===');
        const gamepads = navigator.getGamepads();

        console.log('navigator.getGamepads():', gamepads);

        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                const gp = gamepads[i];
                console.log(`\nGamepad ${i}: ${gp.id}`);
                console.log('  Connected:', gp.connected);
                console.log('  Axes:', gp.axes);
                console.log('  Buttons:', gp.buttons.map((b, idx) => ({
                    index: idx,
                    pressed: b.pressed,
                    value: b.value
                })).filter(b => b.pressed || b.value > 0));
                console.log('  Timestamp:', gp.timestamp);

                // Check if this is a stale object
                const fresh = navigator.getGamepads()[i];
                if (fresh && fresh.timestamp !== gp.timestamp) {
                    console.warn('  ⚠️ STALE GAMEPAD OBJECT DETECTED!');
                }
            }
        }

        console.log('\nOur internal state:');
        console.log('  gamepadConnected:', gamepadConnected);
        console.log('  gamepadIndex:', gamepadIndex);
        console.log('========================');
    }

    function emergencyReset() {
        console.log('EMERGENCY RESET: Clearing all gamepad state');

        // Dump state before reset
        dumpGamepadState();

        // Force browser to re-poll gamepad
        gamepadConnected = false;
        gamepadIndex = -1;
        axisCenter = null;

        // Clear all button states
        for (let i = 0; i < 16; i++) {
            buttonState[i].pressed = false;
            buttonState[i].pressStartTime = 0;
            buttonState[i].value = 0;
        }

        axisStuckWarned[0] = false;
        axisStuckWarned[1] = false;
        axisStuckWarned[2] = false;
        axisStuckWarned[3] = false;
        axisStuckWarned[5] = false;

        // Reset mode
        Config.state.controlMode = 'wave';
        Config.state.ghostSource = null;
        updateModeUI();

        // Reset joystick visuals
        updateJoystickVisuals(null);

        // Log current gamepad state for debugging
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                console.log(`Gamepad ${i} (${gamepads[i].id}):`, {
                    axes: gamepads[i].axes,
                    buttons: gamepads[i].buttons.map((b, idx) => b.pressed ? `${idx}: PRESSED` : null).filter(x => x)
                });
            }
        }

        alert('Gamepad state reset!\n\nIf axes are still stuck:\n1. Unplug and replug your gamepad\n2. Check browser console for axis values\n3. The browser may have cached bad gamepad calibration');
    }

    return {
        loadGamepadConfig,
        saveGamepadConfig,
        resetToDefaults,
        emergencyReset,
        dumpGamepadState,
        poll: pollGamepad,
        setupEventListeners,
        updateUI,
        pressureCurves,
        gamepadConfig
    };
})();
