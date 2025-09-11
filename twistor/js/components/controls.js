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
        if (this.parametersContainer) {
            this.parametersContainer.innerHTML = '';
        }
        
        // Keep only base controls in the maps
        const baseControls = ['rotationToggle', 'resetBtn', 'pauseBtn'];
        
        for (const [id, value] of this.controlElements) {
            if (!baseControls.includes(id)) {
                this.controlElements.delete(id);
                this.parameters.delete(id);
                this.values.delete(id);
                this.listeners.delete(id);
            }
        }
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