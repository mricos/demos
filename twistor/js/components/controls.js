/**
 * Controls Component: Handles UI controls for different scenes
 * Modular component that can be reconfigured for different parameter sets
 */
class TwistorControls {
    constructor(containerId, config = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id '${containerId}' not found`);
        }
        
        this.config = {
            showRotationToggle: true,
            showResetButton: true,
            showPauseButton: true,
            controlLayout: 'vertical', // 'vertical' or 'horizontal'
            ...config
        };
        
        this.parameters = new Map();
        this.listeners = new Map();
        this.controlElements = new Map();
        this.values = new Map();
        
        this.setupBaseControls();
    }
    
    // Setup base controls that are common across scenes
    setupBaseControls() {
        this.container.innerHTML = ''; // Clear existing controls
        
        // Create controls wrapper
        const wrapper = document.createElement('div');
        wrapper.className = `controls-wrapper ${this.config.controlLayout}`;
        this.container.appendChild(wrapper);
        
        // Add rotation toggle if enabled
        if (this.config.showRotationToggle) {
            this.addToggleControl({
                id: 'rotationToggle',
                label: 'Enable Rotation',
                defaultValue: true,
                parent: wrapper
            });
        }
        
        // Create parameters container
        this.parametersContainer = document.createElement('div');
        this.parametersContainer.className = 'parameters-container';
        wrapper.appendChild(this.parametersContainer);
        
        // Create buttons container
        this.buttonsContainer = document.createElement('div');
        this.buttonsContainer.className = 'buttons-container';
        wrapper.appendChild(this.buttonsContainer);
        
        // Add reset button if enabled
        if (this.config.showResetButton) {
            this.addButton({
                id: 'resetBtn',
                label: 'Reset',
                className: 'reset-button',
                parent: this.buttonsContainer
            });
        }
        
        // Add pause button if enabled
        if (this.config.showPauseButton) {
            this.addButton({
                id: 'pauseBtn',
                label: 'Pause',
                className: 'pause-button',
                parent: this.buttonsContainer
            });
        }
    }
    
    // Add a slider control
    addSliderControl(config) {
        const {
            id,
            label,
            min = 0,
            max = 1,
            step = 0.01,
            defaultValue = (min + max) / 2,
            unit = '',
            precision = 2,
            twistorTerm = null,
            parent = this.parametersContainer
        } = config;
        
        // Create control group
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';
        
        // Create label
        const labelElement = document.createElement('label');
        labelElement.htmlFor = id;
        labelElement.textContent = label;
        
        if (twistorTerm) {
            labelElement.className = 'twistor-term';
            labelElement.setAttribute('data-highlight', twistorTerm);
        }
        
        // Create slider
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = id;
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = defaultValue;
        
        // Create value display
        const valueSpan = document.createElement('span');
        valueSpan.id = `${id}-value`;
        valueSpan.className = 'control-value';
        valueSpan.textContent = defaultValue.toFixed(precision) + unit;
        
        // Add event listener
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            valueSpan.textContent = value.toFixed(precision) + unit;
            this.values.set(id, value);
            this.notifyListeners(id, value);
        });
        
        // Assemble control group
        controlGroup.appendChild(labelElement);
        controlGroup.appendChild(slider);
        controlGroup.appendChild(valueSpan);
        parent.appendChild(controlGroup);
        
        // Store references
        this.controlElements.set(id, { slider, valueSpan, controlGroup });
        this.values.set(id, defaultValue);
        
        // Store parameter configuration
        this.parameters.set(id, { ...config, element: slider });
        
        return slider;
    }
    
    // Add a toggle control (checkbox)
    addToggleControl(config) {
        const {
            id,
            label,
            defaultValue = false,
            twistorTerm = null,
            parent = this.parametersContainer
        } = config;
        
        // Create control group
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group checkbox-group';
        
        // Create label container
        const labelContainer = document.createElement('label');
        labelContainer.className = 'checkbox-label';
        
        if (twistorTerm) {
            labelContainer.classList.add('twistor-term');
            labelContainer.setAttribute('data-highlight', twistorTerm);
        }
        
        // Create checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.checked = defaultValue;
        
        // Create custom checkmark
        const checkmark = document.createElement('span');
        checkmark.className = 'checkmark';
        
        // Create label text
        const labelText = document.createElement('span');
        labelText.textContent = label;
        
        // Add event listener
        checkbox.addEventListener('change', (e) => {
            const value = e.target.checked;
            this.values.set(id, value);
            this.notifyListeners(id, value);
        });
        
        // Assemble control
        labelContainer.appendChild(checkbox);
        labelContainer.appendChild(checkmark);
        labelContainer.appendChild(labelText);
        controlGroup.appendChild(labelContainer);
        parent.appendChild(controlGroup);
        
        // Store references
        this.controlElements.set(id, { checkbox, controlGroup });
        this.values.set(id, defaultValue);
        this.parameters.set(id, { ...config, element: checkbox });
        
        return checkbox;
    }
    
    // Add a button control
    addButton(config) {
        const {
            id,
            label,
            className = 'control-button',
            parent = this.buttonsContainer
        } = config;
        
        const button = document.createElement('button');
        button.id = id;
        button.className = className;
        button.textContent = label;
        
        // Add click event listener for buttons
        button.addEventListener('click', () => {
            this.notifyListeners(id, true);
        });
        
        parent.appendChild(button);
        
        this.controlElements.set(id, { button });
        this.parameters.set(id, { ...config, element: button });
        
        return button;
    }
    
    // Add a dropdown/select control
    addSelectControl(config) {
        const {
            id,
            label,
            options = [],
            defaultValue = options[0]?.value || '',
            twistorTerm = null,
            parent = this.parametersContainer
        } = config;
        
        // Create control group
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';
        
        // Create label
        const labelElement = document.createElement('label');
        labelElement.htmlFor = id;
        labelElement.textContent = label;
        
        if (twistorTerm) {
            labelElement.className = 'twistor-term';
            labelElement.setAttribute('data-highlight', twistorTerm);
        }
        
        // Create select
        const select = document.createElement('select');
        select.id = id;
        
        // Add options
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label || option.value;
            optionElement.selected = option.value === defaultValue;
            select.appendChild(optionElement);
        });
        
        // Add event listener
        select.addEventListener('change', (e) => {
            const value = e.target.value;
            this.values.set(id, value);
            this.notifyListeners(id, value);
        });
        
        // Assemble control group
        controlGroup.appendChild(labelElement);
        controlGroup.appendChild(select);
        parent.appendChild(controlGroup);
        
        // Store references
        this.controlElements.set(id, { select, controlGroup });
        this.values.set(id, defaultValue);
        this.parameters.set(id, { ...config, element: select });
        
        return select;
    }
    
    // Add a custom HTML control
    addCustomControl(config) {
        const {
            id,
            html,
            parent = this.parametersContainer
        } = config;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'control-group custom-control';
        wrapper.innerHTML = html;
        
        parent.appendChild(wrapper);
        
        this.controlElements.set(id, { wrapper });
        this.parameters.set(id, { ...config, element: wrapper });
        
        return wrapper;
    }
    
    // Load a complete control configuration for a scene
    loadControlsConfig(controlsConfig) {
        // Clear existing parameters (keep base controls)
        this.clearParameters();
        
        // Add each control from configuration
        controlsConfig.forEach(config => {
            switch (config.type) {
                case 'slider':
                    this.addSliderControl(config);
                    break;
                case 'toggle':
                    this.addToggleControl(config);
                    break;
                case 'select':
                    this.addSelectControl(config);
                    break;
                case 'button':
                    this.addButton(config);
                    break;
                case 'color':
                    this.addColorControl(config);
                    break;
                case 'range':
                    this.addRangeControl(config);
                    break;
                case 'knob':
                    this.addKnobControl(config);
                    break;
                case 'multihandle':
                    this.addMultiHandleControl(config);
                    break;
                case 'stepper':
                    this.addStepperControl(config);
                    break;
                case 'custom':
                    this.addCustomControl(config);
                    break;
                default:
                    console.warn(`Unknown control type: ${config.type}`);
            }
        });
    }
    
    // Clear parameter controls (but keep base controls)
    clearParameters() {
        console.log('Clearing parameters...');
        
        if (this.parametersContainer) {
            this.parametersContainer.innerHTML = '';
        }
        
        // Keep only base controls in the maps
        const baseControls = ['rotationToggle', 'resetBtn', 'pauseBtn'];
        
        // Create arrays to avoid iterator issues
        const elementsToDelete = [];
        const parametersToDelete = [];
        const valuesToDelete = [];
        const listenersToDelete = [];
        
        for (const [id] of this.controlElements) {
            if (!baseControls.includes(id)) {
                elementsToDelete.push(id);
            }
        }
        
        for (const [id] of this.parameters) {
            if (!baseControls.includes(id)) {
                parametersToDelete.push(id);
            }
        }
        
        for (const [id] of this.values) {
            if (!baseControls.includes(id)) {
                valuesToDelete.push(id);
            }
        }
        
        for (const [id] of this.listeners) {
            if (!baseControls.includes(id)) {
                listenersToDelete.push(id);
            }
        }
        
        // Delete all non-base controls
        elementsToDelete.forEach(id => this.controlElements.delete(id));
        parametersToDelete.forEach(id => this.parameters.delete(id));
        valuesToDelete.forEach(id => this.values.delete(id));
        listenersToDelete.forEach(id => this.listeners.delete(id));
        
        console.log('Parameters cleared, remaining controls:', Array.from(this.controlElements.keys()));
    }
    
    // Add event listener for parameter changes
    addEventListener(parameterId, callback) {
        if (!this.listeners.has(parameterId)) {
            this.listeners.set(parameterId, new Set());
        }
        this.listeners.get(parameterId).add(callback);
        
        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(parameterId);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this.listeners.delete(parameterId);
                }
            }
        };
    }
    
    // Remove event listener
    removeEventListener(parameterId, callback) {
        const listeners = this.listeners.get(parameterId);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this.listeners.delete(parameterId);
            }
        }
    }
    
    // Notify listeners of parameter change
    notifyListeners(parameterId, value) {
        const listeners = this.listeners.get(parameterId);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(value, parameterId);
                } catch (error) {
                    console.error(`Error in parameter listener for ${parameterId}:`, error);
                }
            });
        }
        
        // Auto-activate related cursors for enhanced cross-referencing
        this.autoActivateRelatedCursor(parameterId, value);
    }
    
    // Auto-activate related cursors when controls are interacted with
    autoActivateRelatedCursor(parameterId, value) {
        const currentScene = window.twistorTool?.sceneManager?.getCurrentScene();
        if (currentScene && currentScene.cursorManager) {
            currentScene.cursorManager.autoActivateCursorFromControl(parameterId, value);
        }
    }
    
    // Get current value of a parameter
    getValue(parameterId) {
        return this.values.get(parameterId);
    }
    
    // Set value of a parameter programmatically
    setValue(parameterId, value) {
        const controlData = this.controlElements.get(parameterId);
        if (!controlData) return false;
        
        this.values.set(parameterId, value);
        
        // Update the UI element
        if (controlData.slider) {
            controlData.slider.value = value;
            const paramConfig = this.parameters.get(parameterId);
            const precision = paramConfig?.precision || 2;
            const unit = paramConfig?.unit || '';
            controlData.valueSpan.textContent = value.toFixed(precision) + unit;
        } else if (controlData.checkbox) {
            controlData.checkbox.checked = value;
        } else if (controlData.select) {
            controlData.select.value = value;
        }
        
        // Notify listeners
        this.notifyListeners(parameterId, value);
        return true;
    }
    
    // Get all current values
    getAllValues() {
        return Object.fromEntries(this.values);
    }
    
    // Set multiple values at once
    setValues(values) {
        Object.entries(values).forEach(([id, value]) => {
            this.setValue(id, value);
        });
    }
    
    // Reset all parameters to default values
    reset() {
        this.parameters.forEach((config, id) => {
            if (config.defaultValue !== undefined) {
                this.setValue(id, config.defaultValue);
            }
        });
    }
    
    // Enable/disable a control
    setEnabled(parameterId, enabled) {
        const controlData = this.controlElements.get(parameterId);
        if (!controlData) return false;
        
        const element = controlData.slider || controlData.checkbox || 
                       controlData.select || controlData.button;
        
        if (element) {
            element.disabled = !enabled;
            if (controlData.controlGroup) {
                controlData.controlGroup.classList.toggle('disabled', !enabled);
            }
        }
        
        return true;
    }
    
    // Show/hide a control
    setVisible(parameterId, visible) {
        const controlData = this.controlElements.get(parameterId);
        if (!controlData) return false;
        
        const container = controlData.controlGroup || controlData.wrapper;
        if (container) {
            container.style.display = visible ? '' : 'none';
        }
        
        return true;
    }
    
    // Update control label
    setLabel(parameterId, newLabel) {
        const controlData = this.controlElements.get(parameterId);
        if (!controlData) return false;
        
        const labelElement = controlData.controlGroup?.querySelector('label');
        if (labelElement) {
            labelElement.textContent = newLabel;
        }
        
        return true;
    }
    
    // Animate value change
    animateToValue(parameterId, targetValue, duration = 1000) {
        return new Promise(resolve => {
            const startValue = this.getValue(parameterId);
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function (ease-out)
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                
                const currentValue = startValue + (targetValue - startValue) * easedProgress;
                this.setValue(parameterId, currentValue);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            animate();
        });
    }
    
    // Get the DOM element for a control
    getElement(parameterId) {
        const controlData = this.controlElements.get(parameterId);
        return controlData?.slider || controlData?.checkbox || 
               controlData?.select || controlData?.button || controlData?.wrapper;
    }
    
    // Add color picker control
    addColorControl(config) {
        const group = this.createControlGroup(config);
        
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.id = config.id;
        colorInput.value = config.defaultValue || '#3498db';
        colorInput.className = 'color-input';
        
        const colorDisplay = document.createElement('div');
        colorDisplay.className = 'color-display';
        colorDisplay.style.backgroundColor = colorInput.value;
        colorDisplay.textContent = colorInput.value;
        
        colorInput.addEventListener('change', () => {
            colorDisplay.style.backgroundColor = colorInput.value;
            colorDisplay.textContent = colorInput.value;
            this.notifyListeners(config.id, colorInput.value);
        });
        
        const wrapper = document.createElement('div');
        wrapper.className = 'color-control-wrapper';
        wrapper.appendChild(colorInput);
        wrapper.appendChild(colorDisplay);
        
        group.appendChild(wrapper);
        this.addToContainer(group);
        
        this.controlElements.set(config.id, { colorInput, colorDisplay, wrapper });
        this.parameters.set(config.id, config);
        this.values.set(config.id, colorInput.value);
    }
    
    // Add range slider (dual handle)
    addRangeControl(config) {
        const group = this.createControlGroup(config);
        
        const rangeContainer = document.createElement('div');
        rangeContainer.className = 'range-control-container';
        
        const minSlider = document.createElement('input');
        minSlider.type = 'range';
        minSlider.min = config.min || 0;
        minSlider.max = config.max || 100;
        minSlider.value = config.defaultValue?.min || config.min || 0;
        minSlider.className = 'range-slider min-slider';
        
        const maxSlider = document.createElement('input');
        maxSlider.type = 'range';
        maxSlider.min = config.min || 0;
        maxSlider.max = config.max || 100;
        maxSlider.value = config.defaultValue?.max || config.max || 100;
        maxSlider.className = 'range-slider max-slider';
        
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'range-value-display';
        valueDisplay.textContent = `${minSlider.value} - ${maxSlider.value}`;
        
        const updateRange = () => {
            const minVal = parseFloat(minSlider.value);
            const maxVal = parseFloat(maxSlider.value);
            
            if (minVal > maxVal) {
                if (minSlider === document.activeElement) {
                    maxSlider.value = minVal;
                } else {
                    minSlider.value = maxVal;
                }
            }
            
            valueDisplay.textContent = `${minSlider.value} - ${maxSlider.value}`;
            this.notifyListeners(config.id, { min: parseFloat(minSlider.value), max: parseFloat(maxSlider.value) });
        };
        
        minSlider.addEventListener('input', updateRange);
        maxSlider.addEventListener('input', updateRange);
        
        rangeContainer.appendChild(minSlider);
        rangeContainer.appendChild(maxSlider);
        rangeContainer.appendChild(valueDisplay);
        
        group.appendChild(rangeContainer);
        this.addToContainer(group);
        
        this.controlElements.set(config.id, { minSlider, maxSlider, valueDisplay, wrapper: rangeContainer });
        this.parameters.set(config.id, config);
        this.values.set(config.id, { min: parseFloat(minSlider.value), max: parseFloat(maxSlider.value) });
    }
    
    // Add knob control
    addKnobControl(config) {
        const group = this.createControlGroup(config);
        
        const knobContainer = document.createElement('div');
        knobContainer.className = 'knob-container';
        
        const knob = document.createElement('div');
        knob.className = 'knob';
        
        const knobHandle = document.createElement('div');
        knobHandle.className = 'knob-handle';
        
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'knob-value';
        
        const min = config.min || 0;
        const max = config.max || 100;
        const step = config.step || 1;
        let value = config.defaultValue || min;
        
        const updateKnob = (newValue) => {
            value = Math.round(newValue / step) * step;
            value = Math.max(min, Math.min(max, value));
            
            const angle = ((value - min) / (max - min)) * 270 - 135;
            knobHandle.style.transform = `rotate(${angle}deg)`;
            valueDisplay.textContent = value.toFixed(step < 1 ? 2 : 0);
            
            this.notifyListeners(config.id, value);
        };
        
        let isDragging = false;
        
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            const rect = knob.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
            const degrees = (angle * 180 / Math.PI + 135 + 360) % 360;
            
            if (degrees <= 270) {
                const newValue = min + (degrees / 270) * (max - min);
                updateKnob(newValue);
            }
        };
        
        knob.addEventListener('mousedown', (e) => {
            isDragging = true;
            handleMouseMove(e);
        });
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', () => { isDragging = false; });
        
        knob.appendChild(knobHandle);
        knobContainer.appendChild(knob);
        knobContainer.appendChild(valueDisplay);
        
        group.appendChild(knobContainer);
        this.addToContainer(group);
        
        updateKnob(value);
        
        this.controlElements.set(config.id, { knob, knobHandle, valueDisplay, wrapper: knobContainer });
        this.parameters.set(config.id, config);
        this.values.set(config.id, value);
    }
    
    // Add multi-handle slider
    addMultiHandleControl(config) {
        const group = this.createControlGroup(config);
        
        const container = document.createElement('div');
        container.className = 'multihandle-container';
        
        const track = document.createElement('div');
        track.className = 'multihandle-track';
        
        const handles = [];
        const values = config.defaultValue || [0, 50, 100];
        
        values.forEach((val, index) => {
            const handle = document.createElement('div');
            handle.className = 'multihandle-handle';
            handle.dataset.index = index;
            
            const position = ((val - (config.min || 0)) / ((config.max || 100) - (config.min || 0))) * 100;
            handle.style.left = `${position}%`;
            
            handles.push(handle);
            track.appendChild(handle);
        });
        
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'multihandle-value';
        valueDisplay.textContent = values.join(' | ');
        
        let dragIndex = -1;
        
        const updateValues = () => {
            const newValues = handles.map(handle => {
                const position = parseFloat(handle.style.left) / 100;
                return ((config.max || 100) - (config.min || 0)) * position + (config.min || 0);
            });
            
            valueDisplay.textContent = newValues.map(v => v.toFixed(1)).join(' | ');
            this.notifyListeners(config.id, newValues);
        };
        
        handles.forEach((handle, index) => {
            handle.addEventListener('mousedown', (e) => {
                dragIndex = index;
                e.preventDefault();
            });
        });
        
        document.addEventListener('mousemove', (e) => {
            if (dragIndex === -1) return;
            
            const rect = track.getBoundingClientRect();
            const position = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            handles[dragIndex].style.left = `${position}%`;
            updateValues();
        });
        
        document.addEventListener('mouseup', () => { dragIndex = -1; });
        
        container.appendChild(track);
        container.appendChild(valueDisplay);
        
        group.appendChild(container);
        this.addToContainer(group);
        
        this.controlElements.set(config.id, { handles, track, valueDisplay, wrapper: container });
        this.parameters.set(config.id, config);
        this.values.set(config.id, values);
    }
    
    // Add stepper control
    addStepperControl(config) {
        const group = this.createControlGroup(config);
        
        const stepperContainer = document.createElement('div');
        stepperContainer.className = 'stepper-container';
        
        const decreaseBtn = document.createElement('button');
        decreaseBtn.className = 'stepper-btn decrease';
        decreaseBtn.textContent = '−';
        
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'stepper-value';
        
        const increaseBtn = document.createElement('button');
        increaseBtn.className = 'stepper-btn increase';
        increaseBtn.textContent = '+';
        
        const min = config.min || 0;
        const max = config.max || 100;
        const step = config.step || 1;
        let value = config.defaultValue || min;
        
        const updateValue = (newValue) => {
            value = Math.max(min, Math.min(max, newValue));
            valueDisplay.textContent = value.toFixed(step < 1 ? 2 : 0);
            
            decreaseBtn.disabled = value <= min;
            increaseBtn.disabled = value >= max;
            
            this.notifyListeners(config.id, value);
        };
        
        decreaseBtn.addEventListener('click', () => updateValue(value - step));
        increaseBtn.addEventListener('click', () => updateValue(value + step));
        
        stepperContainer.appendChild(decreaseBtn);
        stepperContainer.appendChild(valueDisplay);
        stepperContainer.appendChild(increaseBtn);
        
        group.appendChild(stepperContainer);
        this.addToContainer(group);
        
        updateValue(value);
        
        this.controlElements.set(config.id, { decreaseBtn, increaseBtn, valueDisplay, wrapper: stepperContainer });
        this.parameters.set(config.id, config);
        this.values.set(config.id, value);
    }
    
    // Get container element
    getContainer() {
        return this.container;
    }
    
    // Destroy controls and clean up
    destroy() {
        this.listeners.clear();
        this.controlElements.clear();
        this.parameters.clear();
        this.values.clear();
        this.container.innerHTML = '';
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TwistorControls;
}